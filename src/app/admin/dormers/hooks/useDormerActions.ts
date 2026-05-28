import { Key, useState } from "react";
import { firestore as db, auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Dormer, Bill, DormerData } from "../types";
import { welcomeAdminTemplate } from "../email-templates/welcomeAdmin";
import { welcomeUserTemplate } from "../email-templates/welcomeUser";
import { newBillTemplate } from "../email-templates/newBill";
import {
  createAdminDormer,
  createUserDormer,
  migrateDormerAccounts,
  recordPaymentTransaction,
  softDeleteDormer,
  updateDormerDetails,
} from "@/lib/admin/dormer";
import { User } from "firebase/auth";
import { createBill, getBill, updateBill } from "@/lib/admin/bill";
import { paymentConfirmationEmailTemplate } from "../../payments/utils/email";
import { billPaymentInvoiceTemplate } from "../email-templates/billPaymentInvoice";
import { generateRandomPassword } from "../utils/generateRandomPass";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { sendEmail } from "@/app/utils/sendEmail";
import { getBillingPeriodLabel } from "../utils/generateBillUtils";
import path from "path";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";

export function useDormerActions(dormers: Dormer[], bills: Bill[]) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dormitoryId, loading: dormitoryIdLoading } = useCurrentDormitoryId();
  const [errors, setErrors] = useState<string[]>([]);

  const saveDormer = async (dormerData: DormerData, user: User | null) => {
    if (!user) {
      toast.error("Authentication error. Please log in again.");
      return;
    }

    const currentAdmin = auth.currentUser;
    if (!currentAdmin) {
      toast.error("Could not verify current admin session.");
      return;
    }
    const adminEmail = currentAdmin.email;
    const temporaryPassword = generateRandomPassword();
    try {
      const existingDormer = dormers.find((d) => d.email === dormerData.email);
      if (existingDormer) {
        toast.error("A dormer with this email already exists.");
        return;
      }

      if (dormerData.role === "Admin") {
        const adminPassword = prompt(
          "To add security, please enter your password:",
        );

        if (!adminPassword) {
          toast.info("Admin creation canceled.");
          return;
        }
        await createAdminDormer(
          dormerData,
          currentAdmin,
          adminEmail,
          adminPassword,
          temporaryPassword,
          dormitoryId,
        );

        toast.success("Admin dormer added successfully!");
        await sendEmail({
          to: dormerData.email,
          subject: "Welcome to DormPay System",
          html: welcomeAdminTemplate(
            dormerData.firstName,
            dormerData.email,
            temporaryPassword,
          ),
          attachments: [
            {
              filename: "DormPay Admin User Guide v1.2.pdf",
              path: "DormPay Admin User Guide v1.2.pdf",
            },
          ],
        });
      } else {
        await createUserDormer(
          dormerData,
          user,
          temporaryPassword,
          dormitoryId,
        );

        toast.success("Dormer added successfully!");
        await sendEmail({
          to: dormerData.email,
          subject: "Welcome to DormPay System",
          html: welcomeUserTemplate(
            dormerData.firstName,
            dormerData.email,
            temporaryPassword,
          ),
          attachments: [
            {
              filename: "DormPay Dormer User Guide v1.2.pdf",
              path: "DormPay Dormer User Guide v1.2.pdf",
            },
          ],
        });
      }
    } catch (error: any) {
      console.error("Error adding dormer: ", error);
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        toast.error("Re-authentication failed. Please log in again.");
      } else {
        toast.error(`Failed to add dormer: ${error.message}`);
      }
    }
  };

  const updateDormer = async (dormerData: DormerData, user: User | null) => {
    if (!user) {
      toast.error("Authentication error or missing dormer data.");
      return;
    }

    try {
      await updateDormerDetails(dormerData.id as any, dormerData, user);
      toast.success("Dormer updated successfully!");
    } catch (error) {
      toast.error("Error updating dormer!");
    }
  };

  const handleSavePayment = async (paymentData: any, user: User | null) => {
    if (!user || !paymentData.billId) {
      toast.error("Authentication or data error.");
      return;
    }

    try {
      const recorderDormer =
        dormers.find((d) => d.id === user.uid) ||
        dormers.find((d) => d.email === user.email);
      const recordedByName = recorderDormer
        ? `${recorderDormer.firstName} ${recorderDormer.lastName}`
        : user.displayName || user.email || user.uid;

      await recordPaymentTransaction({ ...paymentData, recordedByName }, user, dormitoryId);

      toast.success("Payment recorded successfully!");

      const dormerInfo = dormers.find((d) => d.id === paymentData.dormerId);
      if (dormerInfo) {
        const billData = await getBill(paymentData.billId);
        await sendEmail({
          to: dormerInfo.email,
          subject: `Payment Confirmation - ${paymentData.billId}`,
          html: paymentConfirmationEmailTemplate(
            dormerInfo.firstName,
            paymentData,
            billData,
          ),
        });
      }
    } catch (error) {
      toast.error("Failed to save payment.");
    }
  };

  const saveBill = async (billData: Bill, user: User | null) => {
    if (!user || !billData) {
      toast.error("Authentication error or missing bill data.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, ...dataToSave } = billData;

      if (id) {
        await updateBill(billData, user);
        toast.success("Bill overwritten successfully!");
      } else {
        await createBill(billData, user, dormitoryId);
        toast.success("New bill generated successfully!");
      }

      const dormerInfo = dormers.find((d) => d.id === billData.dormerId);
      if (dormerInfo) {
        const periodLabel = getBillingPeriodLabel(billData.billingPeriod);
        const payableName = billData.description || "Bill";
        await sendEmail({
          to: dormerInfo.email,
          subject: `New ${payableName} Bill for ${periodLabel}`,
          html: newBillTemplate(
            dormerInfo.firstName,
            payableName,
            periodLabel,
            billData.totalAmountDue,
          ),
        });
      }
    } catch (error) {
      toast.error("Error saving bill!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteDormer = async (dormerId: string) => {
    if (!dormerId) {
      toast.error("Dormer ID is required for deletion.");
      return;
    }

    try {
      await softDeleteDormer(dormerId);
      toast.success("Dormer deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete dormer.");
    }
  };

  const importDormers = async (
    dormersList: DormerData[],
    user: User | null,
  ) => {
    if (!user) {
      toast.error("Authentication error. Please log in again.");
      return { successCount: 0, errorCount: 0 };
    }

    setIsSubmitting(true);
    setErrors([]);
    let successCount = 0;
    let errorCount = 0;

    // Process dormers and collect email tasks
    const emailTasks: Promise<unknown>[] = [];

    for (const dormerData of dormersList) {
      try {
        const existingDormer = dormers.find(
          (d) => d.email === dormerData.email,
        );
        if (existingDormer) {
          const errorMsg = `Dormer with email ${dormerData.email} already exists. Skipping.`;
          console.warn(errorMsg);
          setErrors((prev) => [...prev, errorMsg]);
          errorCount++;
          continue;
        }

        const temporaryPassword = generateRandomPassword();
        await createUserDormer(
          dormerData,
          user,
          temporaryPassword,
          dormitoryId,
        );

        // Queue email sending (don't await yet)
        const emailTask = sendEmail({
          to: dormerData.email,
          subject: "Welcome to DormPay System",
          html: welcomeUserTemplate(
            dormerData.firstName,
            dormerData.email,
            temporaryPassword,
          ),
          attachments: [
            {
              filename: "DormPay Dormer User Guide v1.2.pdf",
              path: "DormPay Dormer User Guide v1.2.pdf",
            },
          ],
        }).catch((error) => {
          console.error(`Failed to send email to ${dormerData.email}:`, error);
          // Don't fail the import if email fails
        });

        emailTasks.push(emailTask);
        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || String(error);
        setErrors((prevErrors) => [
          ...prevErrors,
          `${dormerData.email}: ${errorMsg}`,
        ]);
      }
    }

    // Send all emails in parallel (don't wait for them to finish)
    Promise.all(emailTasks).catch((error) => {
      console.error("Some emails failed to send:", error);
    });

    setIsSubmitting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} dormer(s). Welcome emails are being sent.`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} dormer(s).`);
    }

    return { successCount, errorCount };
  };

  const payAllBills = async (unpaidBills: Bill[], user: User | null, dormer: Dormer | null) => {
    if (!user) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    if (!unpaidBills.length) {
      toast.info("No unpaid bills to process.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);

      for (const bill of unpaidBills) {
        if (!bill.id) continue;
        const billRef = doc(db, "bills", bill.id);
        const remaining = bill.totalAmountDue - (bill.amountPaid || 0);
        batch.update(billRef, {
          amountPaid: bill.totalAmountDue,
          status: "Paid",
          updatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });

        // Record a payment entry for each bill
        const paymentData = {
          billId: bill.id,
          dormerId: bill.dormerId,
          dormitoryId: dormitoryId,
          amount: remaining,
          paymentMethod: "Pay All",
          notes: "Bulk payment - Pay All",
          recordedBy: user.uid,
          createdAt: serverTimestamp(),
        };
        const paymentRef = doc(collection(db, "payments"));
        batch.set(paymentRef, paymentData);
      }

      await batch.commit();
      toast.success("All bills marked as paid successfully!");

      // Send breakdown invoice email
      if (dormer?.email) {
        const paymentDate = new Date();
        const paidBillsData = unpaidBills.map((b) => ({
          billingPeriod: b.billingPeriod,
          description: b.description || "",
          totalAmountDue: b.totalAmountDue,
          amountPaid: b.totalAmountDue, // fully paid
          remainingBalance: 0,
          paymentDate,
        }));

        // Overall summary from Firestore for accuracy
        let overallSummary: { totalBills: number; totalAmountDue: number; totalPaid: number; totalRemaining: number } | undefined;
        try {
          const billsSnapshot = await getDocs(
            query(
              collection(db, "bills"),
              where("dormerId", "==", dormer.id),
              where("dormitoryId", "==", dormitoryId)
            )
          );
          if (!billsSnapshot.empty) {
            const allBills = billsSnapshot.docs.map((d) => d.data());
            const activeBills = allBills.filter((b) => !b.isDeleted);
            const totalAmountDue = activeBills.reduce((s, b) => s + (b.totalAmountDue || 0), 0);
            const totalPaid = activeBills.reduce((s, b) => s + (b.amountPaid || 0), 0);
            overallSummary = {
              totalBills: activeBills.length,
              totalAmountDue,
              totalPaid,
              totalRemaining: totalAmountDue - totalPaid,
            };
          }
        } catch (summaryError) {
          console.error("Error calculating overall bills summary:", summaryError);
        }

        const recordedByDormer = dormers.find((d) => d.id === user.uid || d.email === user.email);
        const recordedByName = recordedByDormer
          ? `${recordedByDormer.firstName} ${recordedByDormer.lastName}`
          : user.email || "Admin";

        await sendEmail({
          to: dormer.email,
          subject: "DormPay System - Bill Payment Invoice",
          html: billPaymentInvoiceTemplate(
            `${dormer.firstName} ${dormer.lastName}`,
            paidBillsData,
            recordedByName,
            overallSummary
          ),
        });
      }
    } catch (error) {
      console.error("Error paying all bills:", error);
      toast.error("Failed to mark all bills as paid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    saveDormer,
    handleSavePayment,
    payAllBills,
    saveBill,
    deleteDormer,
    isSubmitting,
    updateDormer,
    importDormers,
    errors,
  };
}
