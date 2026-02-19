import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore"
import { firestore as db } from "../firebase"
import { Fine, FineSummary, PaymentFines } from "@/app/admin/fines/types";

export const getFines = (dormitoryId: string, onNext: (fines: Fine[]) => void) => {
    const q = query(
        collection(db, "fines"), 
        where("dormitoryId", "==", dormitoryId),
        where("isDeleted", "==", false)
    );
    
    return onSnapshot(q, (snapshot) => {
        const fines = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Fine[];
        onNext(fines);
    });
}

export const addFine = async (fine: Fine, recordedBy: string = "", dormitoryId: string) => {
    try {
        await addDoc(collection(db, "fines"), {
            ...fine, 
            dormitoryId, 
            isDeleted: false,
            recordedBy,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        throw error
    }
}

export const updateFine = async (fine: Fine) => {
    try {
        await updateDoc(doc(db, "fines", fine.id!), {
            ...fine, 
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        throw error
    }
}

export const deleteFine = async (fine: Fine) => {
    try {
        await updateDoc(doc(db, "fines", fine.id!), { 
            isDeleted: true,
            deletedAt: serverTimestamp()
        });
    } catch (error) {
        throw error
    }
}

/**
 * Permanently deletes a fine from the database (hard delete)
 * @param fineId - The ID of the fine to delete
 * @throws Error if the deletion fails
 */
export const deleteFineHard = async (fineId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "fines", fineId));
    } catch (error) {
        console.error("Error deleting fine:", error);
        throw error;
    }
}

/**
 * Permanently deletes a fine payment from the database (hard delete)
 * @param paymentId - The ID of the fine payment to delete
 * @throws Error if the deletion fails
 */
export const deleteFinePayment = async (paymentId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "finesPayment", paymentId));
    } catch (error) {
        console.error("Error deleting fine payment:", error);
        throw error;
    }
}

/**
 * Updates the status of a fine payment
 * @param paymentId - The ID of the fine payment to update
 * @param status - The new status
 * @param recordedBy - The user who recorded this action
 * @throws Error if the update fails
 */
export const updateFinePaymentStatus = async (paymentId: string, status: "Paid" | "Unpaid" | "Partially Paid" | "Excused", recordedBy?: string): Promise<void> => {
    try {
        const updateData: any = {
            status,
            updatedAt: serverTimestamp()
        };
        if (recordedBy) {
            updateData.recordedBy = recordedBy;
        }
        await updateDoc(doc(db, "finesPayment", paymentId), updateData);
    } catch (error) {
        console.error("Error updating fine payment status:", error);
        throw error;
    }
}

export const getFinesSummary = async (dormitoryId: string) => {
    try {
        const finesSummary = await getDocs(query(collection(db, "finesPayment"), where("dormitoryId", "==", dormitoryId)));
        const totalFines = finesSummary.docs.reduce((total, fine) => total + fine.data().totalAmountDue, 0);
        const collectedFines = finesSummary.docs.reduce((total, fine) => total + fine.data().amountPaid, 0);
        return {
            totalFines,
            collectedFines,
            collectibleFines: totalFines - collectedFines
        } as FineSummary 
    } catch (error) {
        throw error
    }
}

export const getFinesPayment = async (userId: string, dormitoryId: string) => {
    try {
        const finesPayment = await getDocs(query(collection(db, "finesPayment"), where("dormerId", "==", userId), where("dormitoryId", "==", dormitoryId)));
        return finesPayment.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as PaymentFines[];
    } catch (error) {
        throw error
    }
}