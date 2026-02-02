import { useState } from "react";
import { BillFines, Fine, PaymentFines } from "../types";
import { addFine as addFineLib, updateFine as updateFineLib, deleteFine as deleteFineLib } from "@/lib/admin/fines";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { toast } from "sonner";
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { User } from "firebase/auth";

export const useFinesActions = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const { dormitoryId } = useCurrentDormitoryId();
    
    const addFine = async (fine: Fine) => {
        if (!dormitoryId) {
            toast.error("Dormitory ID not found");
            return;
        }
        try {
            setIsSubmitting(true);
            await addFineLib(fine, "", dormitoryId);
            setIsSubmitting(false);
            toast.success("Fine added successfully");
        } catch (error) {
            setError(error as Error);
            setIsSubmitting(false);
            toast.error("Failed to add fine");
        }
    };

    const updateFine = async (fine: Fine) => {
        try {
            setIsSubmitting(true);
            await updateFineLib(fine);
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            setIsSubmitting(false);
        }
    };
    
    const deleteFine = async (fine: Fine) => {
        try {
            setIsSubmitting(true);
            await deleteFineLib(fine);
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            setIsSubmitting(false);
        }
    };

    const saveFine = async (fineData: BillFines, user: User | null) => {
        if (!dormitoryId) return;
        try {
            setIsSubmitting(true);
            await addDoc(collection(db, "finesPayment"), {
                ...fineData,
                status: "Unpaid",
                remainingBalance: fineData.totalAmountDue,
                amountPaid: 0,
                createdAt: serverTimestamp(),
                paymentDate: null,
                dateImposed: fineData.dateImposed || serverTimestamp(),
            });
            toast.success("Fine generated successfully");
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            setIsSubmitting(false);
            toast.error("Failed to generate fine");
        }
    };

    const handleSavePayment = async (paymentData: any, user: User | null) => {
        try {
            setIsSubmitting(true);
            if(!paymentData.id) {
                toast.error("Invalid payment!")
                return;
            }
            await updateDoc(doc(db, "finesPayment", paymentData.id), {
                amountPaid: paymentData.amountPaid,
                paymentDate: paymentData.paymentDate,
                paymentMethod: paymentData.paymentMethod,
                remainingBalance: paymentData.remainingBalance,
                notes: paymentData.notes,
                status: paymentData.remainingBalance <= 0 ? "Paid" : paymentData.remainingBalance > 0 ? "Partially Paid" : "Unpaid",
                recordedBy: user?.uid || "",
                updatedAt: serverTimestamp(),
                updatedBy: user?.uid
            });
            await addDoc(collection(db, "finesPaymentHistory"), {
                ...paymentData,
                createdAt: serverTimestamp(),
                createdBy: user?.uid
            });
            toast.success("Payment recorded successfully");
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            console.error(error);
            setIsSubmitting(false);
            toast.error("Failed to record payment");
        }
    };
    
    const payAllFines = async (fines: PaymentFines[], user: User | null) => {
        try {
            setIsSubmitting(true);
            const batch = writeBatch(db);
            for (const fine of fines) {
                if (fine.status !== "Paid") {
                    const fineRef = doc(db, "finesPayment", fine.id);
                    batch.update(fineRef, {
                        amountPaid: fine.amountPaid + fine.remainingBalance,
                        paymentDate: serverTimestamp(),
                        remainingBalance: 0,
                        status: "Paid",
                        updatedAt: serverTimestamp(),
                        updatedBy: user?.uid,
                        recordedBy: user?.uid || "",
                    });
                   
                    const historyRef = collection(db, "finesPaymentHistory");
                    batch.set(doc(historyRef), {
                        ...fine,
                        amountPaid: fine.amountPaid + fine.remainingBalance,
                        paymentDate: serverTimestamp(),
                        remainingBalance: 0,
                        notes: "Bulk payment - Pay All",
                        createdAt: serverTimestamp(),
                        createdBy: user?.uid,
                        recordedBy: user?.uid || "",
                        updatedAt: serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            toast.success("All fines paid successfully");
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            console.error("Pay all fines error:", error);
            setIsSubmitting(false);
            toast.error("Failed to pay all fines");
        }
    };
    
    return { addFine, updateFine, deleteFine, saveFine, handleSavePayment, payAllFines, isSubmitting, error };
}
