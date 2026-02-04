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
import { generateRandomPassword } from "../utils/generateRandomPass";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { sendEmail } from "@/app/utils/sendEmail";
import path from "path";

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
      await recordPaymentTransaction(paymentData, user, dormitoryId);

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
        await sendEmail({
          to: dormerInfo.email,
          subject: `New Bill for ${billData.billingPeriod}`,
          html: newBillTemplate(
            dormerInfo.firstName,
            billData.billingPeriod,
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

    setIsSubmitting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} dormer(s).`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} dormer(s).`);
    }

    return { successCount, errorCount };
  };

  return {
    saveDormer,
    handleSavePayment,
    saveBill,
    deleteDormer,
    isSubmitting,
    updateDormer,
    importDormers,
    errors,
  };
}
