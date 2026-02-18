import {
  collection,
  addDoc,
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
  Transaction,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { Bill } from "../../app/admin/dormers/types";
import { User } from "firebase/auth";
import { getUserPaymentWithBilll } from "./payment";

export const createBill = async (billData: Omit<Bill, "id">, user: User, dormitoryId: string) => {
  const docRef = await addDoc(collection(db, "bills"), {
    ...billData,
    dormitoryId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateBill = async (billData: Bill, user: User) => {
  const { id, ...dataToSave } = billData;
  if (!id) throw new Error("Bill ID is required for update.");

  const billRef = doc(db, "bills", id);
  await setDoc(billRef, {
    ...dataToSave,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
  return id;
};
export const getBill = async (billId: string) => {
  const billRef = doc(db, "bills", billId);
  const billSnap = await getDoc(billRef);
  if (!billSnap.exists()) {
    throw new Error("Bill document does not exist!");
  }
  // check if bill is deleted
  if (billSnap.data()?.isDeleted) {
    throw new Error("Bill document is deleted!");
  }
  return billSnap.data() as Bill;
};

export const totalBills = async (dormitoryId: string) => {
  const billsSnapshot = await getDocs(collection(db, "bills"));
  let total = 0;
  billsSnapshot.forEach((doc) => {
    const data = doc.data();
    // check if bill is deleted
    if (data.isDeleted) return;
    if (data.dormitoryId !== dormitoryId) return;
    total += Number(data.totalAmountDue) || 0;
  });
  return total;
};

export const getBills = async (userId: string, dormitoryId: string): Promise<any[]> => {
  try {
    const billsQuery = query(
      collection(db, "bills"),
      where("dormerId", "==", userId),
      where("dormitoryId", "==", dormitoryId),
    );

    const billsSnapshot = await getDocs(billsQuery);
    const billsPromises = billsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      const paymentList = await getUserPaymentWithBilll(userId, doc.id);

      return {
        id: doc.id,
        ...data,
        ...paymentList,
      } as any;
    });

    // Wait for all promises to resolve, then sort the resolved bill objects by billingPeriod descending
    const bills = await Promise.all(billsPromises);
    bills.sort((a, b) => {
      const aPeriod = a?.billingPeriod ?? "";
      const bPeriod = b?.billingPeriod ?? "";
      if (aPeriod < bPeriod) return 1;
      if (aPeriod > bPeriod) return -1;
      return 0;
    });

    return bills;
  } catch (error) {
    console.error("Error fetching bills:", error);
    throw new Error("Failed to load bills");
  }
};


// effectively checks duplicate bills for non-monthly billing periods as well by normalizing the billing period before comparison
export const normalizeBillingPeriod = (billingPeriod: string): string => {
  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(billingPeriod)) {
    return billingPeriod;
  }

  // Already a semester key (e.g. "2nd-semester (Jan - May 2026)")
  if (billingPeriod.includes("semester")) {
    return billingPeriod;
  }

  // Human-readable "Month YYYY" (e.g. "August 2025") → "2025-08"
  const monthYearMatch = billingPeriod.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i
  );
  if (monthYearMatch) {
    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ];
    const monthIndex = monthNames.indexOf(monthYearMatch[1].toLowerCase()) + 1;
    const year = monthYearMatch[2];
    return `${year}-${monthIndex.toString().padStart(2, "0")}`;
  }

  // Fallback: return unchanged
  return billingPeriod;
};

/**
 * Find an existing bill for a specific dormer, billing period, and payable
 * Returns the bill ID if found, null otherwise
 * Excludes soft-deleted bills from the search
 * Normalizes billing period to handle both old and new formats
 */
export const findExistingBill = async (
  dormerId: string,
  billingPeriod: string,
  payableId: string
): Promise<string | null> => {
  try {
    // Normalize the billing period to handle both old and new formats
    const normalizedPeriod = normalizeBillingPeriod(billingPeriod);
    
    const existingBillsQuery = query(
      collection(db, "bills"),
      where("dormerId", "==", dormerId),
      where("billingPeriod", "==", normalizedPeriod),
      where("payableId", "==", payableId)
    );

    const existingBillsSnapshot = await getDocs(existingBillsQuery);
    
    // Find the first non-deleted bill
    for (const doc of existingBillsSnapshot.docs) {
      const billData = doc.data();
      if (!billData.isDeleted) {
        return doc.id;
      }
    }
    
    // If no exact match found with normalized period, try searching with the original format
    // This helps catch bills stored with the old format
    if (normalizedPeriod !== billingPeriod) {
      const fallbackQuery = query(
        collection(db, "bills"),
        where("dormerId", "==", dormerId),
        where("billingPeriod", "==", billingPeriod),
        where("payableId", "==", payableId)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      for (const doc of fallbackSnapshot.docs) {
        const billData = doc.data();
        if (!billData.isDeleted) {
          return doc.id;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error finding existing bill:", error);
    return null;
  }
};

/**
 * Check if a bill with the given criteria has been paid or partially paid
 * Returns true if a paid/partially paid bill exists
 * Excludes soft-deleted bills from the check
 * Normalizes billing period to handle both old and new formats
 */


export const isPaidBill = async (
  dormerId: string,
  billingPeriod: string,
  payableId: string
): Promise<boolean> => {
  try {
    // Normalize the billing period to handle both old and new formats
    const normalizedPeriod = normalizeBillingPeriod(billingPeriod);
    
    const existingBillsQuery = query(
      collection(db, "bills"),
      where("dormerId", "==", dormerId),
      where("billingPeriod", "==", normalizedPeriod),
      where("payableId", "==", payableId)
    );

    const existingBillsSnapshot = await getDocs(existingBillsQuery);
    
    // Check if any non-deleted bill is paid or partially paid
    for (const doc of existingBillsSnapshot.docs) {
      const billData = doc.data();
      if (
        !billData.isDeleted &&
        (billData.status === "Paid" || billData.status === "Partially Paid")
      ) {
        return true;
      }
    }
    
    // If no exact match found with normalized period, try searching with the original format
    // This helps catch bills stored with the old format
    if (normalizedPeriod !== billingPeriod) {
      const fallbackQuery = query(
        collection(db, "bills"),
        where("dormerId", "==", dormerId),
        where("billingPeriod", "==", billingPeriod),
        where("payableId", "==", payableId)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      for (const doc of fallbackSnapshot.docs) {
        const billData = doc.data();
        if (
          !billData.isDeleted &&
          (billData.status === "Paid" || billData.status === "Partially Paid")
        ) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking for paid bills:", error);
    return false;
  }
};