import {
  collection,
  doc,
  runTransaction,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { Payment } from "@/app/admin/payments/types";
import { Bill } from "../../app/admin/dormers/types";

interface PaymentWithBill extends Payment, Bill {}
import { getBuiltinModule } from "process";
import { getBill } from "./bill";

export const recordPayment = async (paymentData: any, user: User) => {
  await runTransaction(db, async (transaction) => {
    const billRef = doc(db, "bills", paymentData.billId);
    const billDoc = await transaction.get(billRef);
    if (!billDoc.exists()) {
      throw new Error("Bill document does not exist!");
    }

    const currentBillData = billDoc.data();
    const currentAmountPaid = currentBillData.amountPaid || 0;
    const totalAmountDue = currentBillData.totalAmountDue;

    const newPaymentAmount = paymentData.amount;
    const newAmountPaid = Math.min(
      totalAmountDue,
      currentAmountPaid + newPaymentAmount
    );

    let newStatus: "Paid" | "Partially Paid" = "Partially Paid";
    if (newAmountPaid >= totalAmountDue) {
      newStatus = "Paid";
    }

    await addDoc(collection(db, "payments"), {
      ...paymentData,
      dormerId: currentBillData.dormerId,
      recordedBy: user.uid,
      createdAt: serverTimestamp(),
    });

    transaction.update(billRef, {
      amountPaid: newAmountPaid,
      status: newStatus,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
  });
};

export const totalPayments = async (dormitoryId: string) => {
  const paymentsSnapshot = await getDocs(collection(db, "payments"));
  let total = 0;
  paymentsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.dormitoryId === dormitoryId) {
      total += Number(data.amount) || 0;
    }
  });
  return total;
};

export const getUserPayments = async (dormerId: string) => {
  const paymentsSnapshot = await getDocs(collection(db, "payments"));
  const payments: PaymentWithBill[] = [];
  for (const docSnap of paymentsSnapshot.docs) {
    const data = docSnap.data();
    if (data.dormerId === dormerId) {
      const bill = await getBill(data.billId);
      payments.push({ id: docSnap.id, ...data, ...bill } as PaymentWithBill);
    }
  }
  return payments;
};

export const getUserPaymentWithBilll = async (
  dormerId: string,
  billId: string
) => {
  const paymentsSnapshot = await getDocs(collection(db, "payments"));
  const payments: Payment[] = [];
  paymentsSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.dormerId === dormerId && data.billId === billId) {
      payments.push({ id: doc.id, ...data } as Payment);
    }
  });
  return payments;
};
