"use client";
import { firestore as db } from "@/lib/firebase";
import { toast } from "sonner";
import { User } from "firebase/auth";
import { Dormer } from "../../dormers/types";
import { recordPayment } from "@/lib/admin/payment";
import { paymentConfirmationEmailTemplate } from "../utils/email";
import { getBill } from "@/lib/admin/bill";

export function usePaymentActions(dormers: Dormer[], dormitoryId: string) {
  const sendEmail = async (emailData: {
    to: string;
    subject: string;
    html: string;
  }) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      await response.json();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send payment confirmation email.");
    }
  };

  const handleRecordPayment = async (paymentData: any, user: User | null) => {
    if (!user || !paymentData.billId) {
      console.error(
        "Authentication or data error: User or Bill ID is missing."
      );
      return;
    }

    try {
      // resolve recorder's display name from the dormers list (matched by email or uid)
      const recorderDormer =
        dormers.find((d) => d.id === user.uid) ||
        dormers.find((d) => d.email === user.email);
      const recordedByName = recorderDormer
        ? `${recorderDormer.firstName} ${recorderDormer.lastName}`
        : user.displayName || user.email || user.uid;

      await recordPayment({ ...paymentData, recordedByName }, user, dormitoryId);
      toast.success("Payment recorded successfully!");

      const dormerInfo = dormers.find((d) => d.id === paymentData.dormerId);
      if (dormerInfo?.email) {
        const billData = await getBill(paymentData.billId);
        await sendEmail({
          to: dormerInfo.email,
          subject: `Payment Confirmation - ${paymentData.billId}`,
          html: paymentConfirmationEmailTemplate(
            dormerInfo.firstName,
            paymentData,
            billData
          ),
        });
      }
    } catch (error) {
      console.error("Error saving payment in transaction: ", error);
      toast.error(`Payment recording failed!`);
    }
  };

  return { handleRecordPayment };
}
