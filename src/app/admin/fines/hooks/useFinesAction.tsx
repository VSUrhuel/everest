import { useState } from "react";
import { BillFines, Fine, PaymentFines } from "../types";
import { addFine as addFineLib, updateFine as updateFineLib, deleteFine as deleteFineLib } from "@/lib/admin/fines";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { toast } from "sonner";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { paymentInvoiceTemplate } from "../email-templates/paymentInvoice";
import { Dormer } from "../../dormers/types";
import { sendEmail } from "@/app/utils/sendEmail";

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
            // console.log('=== IMPOSING FINE ===');
            // console.log('User UID:', user?.uid);
            // console.log('User email:', user?.email);
            // console.log('Storing as imposedBy:', user?.email); // Store email for consistent lookup
            await addDoc(collection(db, "finesPayment"), {
                ...fineData,
                status: "Unpaid",
                remainingBalance: fineData.totalAmountDue,
                amountPaid: 0,
                createdAt: serverTimestamp(),
                paymentDate: null,
                imposedBy: user?.email || user?.uid, // Prefer email for consistency with legacy data
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

    const handleSavePayment = async (paymentData: any, user: User | null, dormer?: Dormer, recordedByDormer?: Dormer) => {
        try {
            setIsSubmitting(true);
            if(!paymentData.id) {
                toast.error("Invalid payment!")
                return;
            }
            
            // Check if this is a room fine - if so, we need to clear all related fines
            const isRoomFine = paymentData.roomFineId && paymentData.roomNumber;
            
            if (isRoomFine && paymentData.remainingBalance <= 0) {
                // This room fine is being fully paid - clear all other fines with the same roomFineId
                const roomFinesQuery = query(
                    collection(db, "finesPayment"),
                    where("roomFineId", "==", paymentData.roomFineId),
                    where("dormitoryId", "==", paymentData.dormitoryId)
                );
                
                const roomFinesSnapshot = await getDocs(roomFinesQuery);
                const batch = writeBatch(db);
                
                roomFinesSnapshot.docs.forEach((doc) => {
                    if (doc.id === paymentData.id) {
                        // Update the fine being paid
                        batch.update(doc.ref, {
                            amountPaid: paymentData.amountPaid,
                            paymentDate: paymentData.paymentDate,
                            paymentMethod: paymentData.paymentMethod,
                            remainingBalance: 0,
                            notes: paymentData.notes,
                            status: "Paid",
                            recordedBy: user?.email || user?.uid || "",
                            updatedAt: serverTimestamp(),
                            updatedBy: user?.uid
                        });
                    } else if (doc.data().status !== "Paid") {
                        // Clear all other unpaid fines in the room
                        batch.update(doc.ref, {
                            amountPaid: doc.data().totalAmountDue,
                            paymentDate: paymentData.paymentDate,
                            remainingBalance: 0,
                            status: "Paid",
                            notes: `Cleared: Room fine paid by ${dormer?.firstName || 'another resident'}`,
                            recordedBy: user?.email || user?.uid || "",
                            updatedAt: serverTimestamp(),
                            updatedBy: user?.uid
                        });
                    }
                });
                
                await batch.commit();
                toast.success(`Room ${paymentData.roomNumber} fine cleared for all residents!`);
            } else {
                // Regular fine payment (not a room fine or partial payment)
                await updateDoc(doc(db, "finesPayment", paymentData.id), {
                    amountPaid: paymentData.amountPaid,
                    paymentDate: paymentData.paymentDate,
                    paymentMethod: paymentData.paymentMethod,
                    remainingBalance: paymentData.remainingBalance,
                    notes: paymentData.notes,
                    status: paymentData.remainingBalance <= 0 ? "Paid" : paymentData.remainingBalance > 0 ? "Partially Paid" : "Unpaid",
                    recordedBy: user?.email || user?.uid || "",
                    updatedAt: serverTimestamp(),
                    updatedBy: user?.uid
                });
            }
            
            // Prepare history data, excluding undefined fields
            const historyData: any = {
                createdAt: serverTimestamp(),
                recordedBy: user?.email || user?.uid || "",
            };
            // Only include fields if they have values
            if (user?.uid) historyData.createdBy = user.uid;
            if (paymentData.totalAmountDue !== undefined) historyData.totalAmountDue = paymentData.totalAmountDue;
            if (paymentData.dormerId) historyData.dormerId = paymentData.dormerId;
            if (paymentData.dormitoryId) historyData.dormitoryId = paymentData.dormitoryId;
            if (paymentData.finesRemarks) historyData.finesRemarks = paymentData.finesRemarks;
            if (paymentData.amountPaid !== undefined) historyData.amountPaid = paymentData.amountPaid;
            if (paymentData.paymentDate) historyData.paymentDate = paymentData.paymentDate;
            if (paymentData.remainingBalance !== undefined) historyData.remainingBalance = paymentData.remainingBalance;
            if (paymentData.billedFineId) historyData.billedFineId = paymentData.billedFineId;
            if (paymentData.fineId) historyData.fineId = paymentData.fineId;
            if (paymentData.paymentMethod) historyData.paymentMethod = paymentData.paymentMethod;
            if (paymentData.notes) historyData.notes = paymentData.notes;
            if (paymentData.imposedBy) historyData.imposedBy = paymentData.imposedBy;
            if (paymentData.dateImposed) historyData.dateImposed = paymentData.dateImposed;
            if (paymentData.roomFineId) historyData.roomFineId = paymentData.roomFineId;
            if (paymentData.roomNumber) historyData.roomNumber = paymentData.roomNumber;
            
            await addDoc(collection(db, "finesPaymentHistory"), historyData);
            
            // Send payment invoice email to dormer
            console.log('=== EMAIL CHECK ===');
            console.log('Dormer email:', dormer?.email);
            console.log('Fines remarks:', paymentData.finesRemarks);
            console.log('Total amount due:', paymentData.totalAmountDue);
            console.log('Payment data:', paymentData);
            
            if (dormer?.email && paymentData.finesRemarks && paymentData.totalAmountDue !== undefined) {
                console.log('Sending payment invoice email to:', dormer.email);
                const recordedByName = recordedByDormer 
                    ? `${recordedByDormer.firstName} ${recordedByDormer.lastName}` 
                    : user?.email || "Administration";
                
                try {
                    // Calculate overall summary by querying finesPayment collection directly
                    // This ensures consistency with the fines table summary calculations
                    let overallSummary = undefined;
                    try {
                        const finesSnapshot = await getDocs(
                            query(
                                collection(db, "finesPayment"),
                                where("dormerId", "==", dormer.id),
                                where("dormitoryId", "==", dormer.dormitoryId)
                            )
                        );
                        
                        if (!finesSnapshot.empty) {
                            const allFines = finesSnapshot.docs.map(doc => doc.data());
                            const totalFines = allFines.length;
                            const totalAmountDue = allFines.reduce((sum, f: any) => sum + (f.totalAmountDue || 0), 0);
                            const totalPaid = allFines.reduce((sum, f: any) => sum + (f.amountPaid || 0), 0);
                            const totalRemaining = allFines.reduce((sum, f: any) => sum + (f.remainingBalance || 0), 0);
                            
                            // verify calculation accuracy: totalRemaining should equal totalAmountDue - totalPaid
                            const calculatedRemaining = totalAmountDue - totalPaid;
                            if (Math.abs(totalRemaining - calculatedRemaining) > 0.01) {
                                console.warn('Inconsistent remaining balance calculation:', {
                                    fromFields: totalRemaining,
                                    calculated: calculatedRemaining,
                                    difference: totalRemaining - calculatedRemaining
                                });
                            }
                            
                            overallSummary = {
                                totalFines,
                                totalAmountDue,
                                totalPaid,
                                totalRemaining: calculatedRemaining // use calculated value for consistency
                            };
                        }
                    } catch (summaryError) {
                        console.error('Error calculating overall summary:', summaryError);
                        // Continue without summary if there's an error
                    }
                    
                    const emailHtml = paymentInvoiceTemplate(
                        `${dormer.firstName} ${dormer.lastName}`,
                        {
                            finesRemarks: paymentData.finesRemarks,
                            totalAmountDue: paymentData.totalAmountDue,
                            amountPaid: paymentData.amountPaid || 0,
                            remainingBalance: paymentData.remainingBalance || 0,
                            paymentDate: paymentData.paymentDate?.toDate ? paymentData.paymentDate.toDate() : new Date(),
                            paymentMethod: paymentData.paymentMethod,
                            notes: paymentData.notes,
                        },
                        recordedByName,
                        overallSummary
                    );
                    
                    await sendEmail(
                        {
                            to: dormer.email,
                            subject: "DormPay System - Fine Payment Invoice",
                            html: emailHtml,
                        },
                        { silent: true },
                    );
                    console.log('Email sent successfully');
                    toast.success("Payment recorded and invoice sent successfully");
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);
                    toast.success("Payment recorded (email notification failed)");
                }
            } else {
                console.log('Email not sent - missing required data');
                toast.success("Payment recorded successfully");
            }
            
            setIsSubmitting(false);
        } catch (error) {
            setError(error as Error);
            console.error(error);
            setIsSubmitting(false);
            toast.error("Failed to record payment");
        }
    };
    
    const payAllFines = async (fines: PaymentFines[], user: User | null, dormersMap?: Map<string, Dormer>, recordedByDormer?: Dormer) => {
        try {
            setIsSubmitting(true);
            const batch = writeBatch(db);
            const emailPromises: Promise<unknown>[] = [];
            
            // Group fines by dormer for email sending
            const finesByDormer = new Map<string, PaymentFines[]>();
            
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
                        recordedBy: user?.email || user?.uid || "", // Prefer email for consistency
                    });
                   
                    const historyRef = collection(db, "finesPaymentHistory");
                    const historyData: any = {
                        totalAmountDue: fine.totalAmountDue,
                        dormerId: fine.dormerId,
                        dormitoryId: fine.dormitoryId,
                        finesRemarks: fine.finesRemarks,
                        amountPaid: fine.amountPaid + fine.remainingBalance,
                        paymentDate: serverTimestamp(),
                        remainingBalance: 0,
                        notes: "Bulk payment - Pay All",
                        createdAt: serverTimestamp(),
                        recordedBy: user?.email || user?.uid || "",
                        updatedAt: serverTimestamp(),
                    };
                    // Only include optional fields if they have values
                    if (user?.uid) historyData.createdBy = user.uid;
                    if (fine.billedFineId) historyData.billedFineId = fine.billedFineId;
                    if (fine.fineId) historyData.fineId = fine.fineId;
                    if (fine.imposedBy) historyData.imposedBy = fine.imposedBy;
                    if (fine.dateImposed) historyData.dateImposed = fine.dateImposed;
                    
                    batch.set(doc(historyRef), historyData);
                    
                    // Group fines by dormer for consolidated email
                    if (fine.dormerId) {
                        if (!finesByDormer.has(fine.dormerId)) {
                            finesByDormer.set(fine.dormerId, []);
                        }
                        finesByDormer.get(fine.dormerId)!.push({
                            ...fine,
                            amountPaid: fine.amountPaid + fine.remainingBalance,
                            remainingBalance: 0,
                            paymentDate: new Date(),
                        });
                    }
                }
            }
            await batch.commit();
            
            // Send consolidated emails per dormer
            if (dormersMap && finesByDormer.size > 0) {
                const recordedByName = recordedByDormer 
                    ? `${recordedByDormer.firstName} ${recordedByDormer.lastName}` 
                    : user?.email || "Admin";
                
                for (const [dormerId, dormerFines] of finesByDormer.entries()) {
                    const dormer = dormersMap.get(dormerId);
                    if (dormer?.email) {
                        // calculate overall summary by querying finesPayment collection directly
                        // tihs ensures consistency with the fines table summary calculations
                        let overallSummary = undefined;
                        try {
                            const finesSnapshot = await getDocs(
                                query(
                                    collection(db, "finesPayment"),
                                    where("dormerId", "==", dormerId),
                                    where("dormitoryId", "==", dormer.dormitoryId)
                                )
                            );
                            
                            if (!finesSnapshot.empty) {
                                const allFines = finesSnapshot.docs.map(doc => doc.data());
                                const totalFines = allFines.length;
                                const totalAmountDue = allFines.reduce((sum, f: any) => sum + (f.totalAmountDue || 0), 0);
                                const totalPaid = allFines.reduce((sum, f: any) => sum + (f.amountPaid || 0), 0);
                                const totalRemaining = allFines.reduce((sum, f: any) => sum + (f.remainingBalance || 0), 0);
                                
                                // erify calculation accuracy: totalRemaining should equal totalAmountDue - totalPaid
                                const calculatedRemaining = totalAmountDue - totalPaid;
                                if (Math.abs(totalRemaining - calculatedRemaining) > 0.01) {
                                    console.warn('Inconsistent remaining balance in bulk payment:', {
                                        fromFields: totalRemaining,
                                        calculated: calculatedRemaining,
                                        difference: totalRemaining - calculatedRemaining
                                    });
                                }
                                
                                overallSummary = {
                                    totalFines,
                                    totalAmountDue,
                                    totalPaid,
                                    totalRemaining: calculatedRemaining // use calculated value for consistency
                                };
                            }
                        } catch (summaryError) {
                            console.error('Error calculating overall summary for bulk payment:', summaryError);
                        }
                        
                        const emailHtml = paymentInvoiceTemplate(
                            `${dormer.firstName} ${dormer.lastName}`,
                            dormerFines.map(f => ({
                                finesRemarks: f.finesRemarks,
                                totalAmountDue: f.totalAmountDue,
                                amountPaid: f.amountPaid,
                                remainingBalance: f.remainingBalance,
                                paymentDate: new Date(),
                                notes: "Bulk payment - Pay All",
                            })),
                            recordedByName,
                            overallSummary
                        );
                        
                        emailPromises.push(
                            sendEmail(
                                {
                                    to: dormer.email,
                                    subject: "DormPay System - Fine Payment Invoice",
                                    html: emailHtml,
                                },
                                { silent: true },
                            )
                        );
                    }
                }
            }
            
            // Send all emails in parallel
            if (emailPromises.length > 0) {
                await Promise.all(emailPromises);
            }
            
            toast.success("All fines paid and invoices sent successfully");
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
