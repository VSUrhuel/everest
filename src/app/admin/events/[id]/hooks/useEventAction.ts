"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firestore as db } from "../../../../../lib/firebase";
import { User } from "firebase/auth";
import { toast } from "sonner";
import { Event, EventPayment } from "../../types";
import { Dormer } from "../../../dormers/types";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { sendEmail } from "@/app/utils/sendEmail";

export function useEventActions(
  event: Event | null,
  payments: EventPayment[],
  dormers: Dormer[]
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const {dormitoryId, loading} = useCurrentDormitoryId();

  const handlePaymentSubmit = async (paymentData: any, user: User | null) => {
    if (!event || !user) {
      toast.error("Missing event or user information.");
      return;
    }
    setIsSubmitting(true);
    try {
      const existingPaymentQuery = query(
        collection(db, "eventPayments"),
        where("dormerId", "==", paymentData.dormerId),
        where("eventId", "==", event.id),
      );

      const querySnapshot = await getDocs(existingPaymentQuery);
      let existingPaymentId: string | null = null;
      let amountAlreadyPaid = 0;

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        existingPaymentId = existingDoc.id;
        amountAlreadyPaid = existingDoc.data().amount || 0;
      }

      const newTotalPaid = amountAlreadyPaid + paymentData.amount;
      const finalAmountPaid = Math.min(newTotalPaid, event.amountDue);
      const status = finalAmountPaid >= event.amountDue ? "Paid" : "Partial";

      const paymentRecord = {
        ...paymentData,
        dormitoryId,
        status,
        eventId: event.id,
        amount: finalAmountPaid,
        recordedBy: {
          name: user.displayName || "Admin",
          email: user.email,
        },
        updatedAt: serverTimestamp(),
      };

      if (existingPaymentId) {
        await updateDoc(
          doc(db, "eventPayments", existingPaymentId),
          paymentRecord
        );
        toast.success("Payment updated successfully");
      } else {
        await addDoc(collection(db, "eventPayments"), {
          ...paymentRecord,
          dormitoryId,
          createdAt: serverTimestamp(),
        });
        toast.success("Payment recorded successfully");
      }

      const dormerInfo = dormers.find((d) => d.id === paymentData.dormerId);

      if (dormerInfo?.email) {
        await sendEmail({
          to: dormerInfo.email,
          subject: `${event.name} Event Payment ${
            existingPaymentId ? "Updated" : "Recorded"
          }`,
          html: `
        <h1>Event Payment ${existingPaymentId ? "Updated" : "Recorded"}</h1>
        <p>Hi ${dormerInfo.firstName},</p>
        <p>Your payment for the event <strong>${event.name}</strong> has been ${
            existingPaymentId ? "updated" : "recorded"
          }.</p>
        <p>Amount ${
          existingPaymentId ? "Added" : "Paid"
        }: <strong>₱${event.amountDue.toFixed(2)}</strong></p>
        <p>Total Amount Paid: <strong>₱${paymentData.amount.toFixed(
          2
        )}</strong></p>
        <p>Remaining Balance: <strong>₱${(
          event.amountDue - paymentData.amount
        ).toFixed(2)}</strong></p>
        <p>Status: <strong>${status}</strong></p>

        <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay</strong></p>
        <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
          <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      `,
        });
      }
    } catch (error: any) {
      toast.error(`Failed to process payment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remindPayable = async () => {
    if (!event) return;
    setIsSendingEmail(true);
    try {
      const unpaidDormerEmails = dormers
        .filter(
          (dormer) =>
            !payments.some(
              (p : any) => p.dormerId === dormer.id && p.status === "Paid" && p.dormitoryId === dormitoryId
            )
        )
        .map((d) => d.email)
        .filter(Boolean);

      if (unpaidDormerEmails.length === 0) {
        toast.info("All dormers have paid for this event.");
        return;
      }

      const emailHtml = `
        <h1>Payment Reminder</h1>
        <p>Hi dormers,</p>
        <p>This is a friendly reminder that your payment for <strong>${
          event.name
        }</strong> is still pending.</p>
        <p><strong>Amount Due: ₱${event.amountDue}</strong></p>
        <p>Please settle this amount on or before <strong>${
          event.dueDate
        }</strong> to avoid any delays.</p>
        <p>You can make your payment to the Dormitory Treasurer or Dormitory Auditor.</p>
        
        <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay</strong></p>
        <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
          <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      `;
      await sendEmail({
        to: unpaidDormerEmails.join(", "),
        subject: `Reminder: Payment for ${event.name}`,
        html: emailHtml,
      });

      toast.success(`Reminder sent to ${unpaidDormerEmails.length} dormer(s).`);
    } catch (error: any) {
      toast.error(`Failed to send reminders: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return {
    isSubmitting,
    isSendingEmail,
    handlePaymentSubmit,
    remindPayable,
  };
}
