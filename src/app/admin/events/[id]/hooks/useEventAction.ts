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
      const paymentByDormerId = new Map(
        payments.map((p) => [p.dormerId, p] as const),
      );

      const isSoftDeleted = (d: Dormer): boolean => {
        const raw = (d as any).isDeleted;
        if (raw === true || raw === "true" || raw === 1) return true;
        if ((d as any).deletedAt) return true;
        return false;
      };

      const perDormerAudit = dormers.map((d) => {
        const payment = paymentByDormerId.get(d.id);
        const status: "Paid" | "Partial" | "Unpaid" = payment?.status ?? "Unpaid";
        const deleted = isSoftDeleted(d);
        const hasEmail = Boolean(d.email);
        let decision: "skip-deleted" | "skip-no-email" | "skip-paid" | "send-unpaid" | "send-partial";
        if (deleted) decision = "skip-deleted";
        else if (!hasEmail) decision = "skip-no-email";
        else if (status === "Paid") decision = "skip-paid";
        else if (status === "Partial") decision = "send-partial";
        else decision = "send-unpaid";
        return {
          dormerId: d.id,
          email: d.email,
          isDeletedRaw: (d as any).isDeleted,
          deletedAtRaw: (d as any).deletedAt ?? null,
          status,
          decision,
        };
      });

      const eligible = dormers
        .filter((d) => !isSoftDeleted(d) && d.email)
        .map((dormer) => {
          const payment = paymentByDormerId.get(dormer.id);
          const status: "Paid" | "Partial" | "Unpaid" = payment?.status ?? "Unpaid";
          const amountPaid = payment?.amount ?? 0;
          const remainingBalance = Math.max(event.amountDue - amountPaid, 0);
          return { dormer, status, amountPaid, remainingBalance };
        })
        .filter((entry) => entry.status !== "Paid");

      const unpaid = eligible.filter((e) => e.status === "Unpaid");
      const partial = eligible.filter((e) => e.status === "Partial");

      // console.log("[remindPayable] Recipient audit:", {
      //   eventId: event.id,
      //   eventName: event.name,
      //   amountDue: event.amountDue,
      //   totalDormers: dormers.length,
      //   skippedDeleted: perDormerAudit.filter((a) => a.decision === "skip-deleted").length,
      //   skippedNoEmail: perDormerAudit.filter((a) => a.decision === "skip-no-email").length,
      //   skippedAlreadyPaid: perDormerAudit.filter((a) => a.decision === "skip-paid").length,
      //   unpaidCount: unpaid.length,
      //   partialCount: partial.length,
      //   unpaidRecipients: unpaid.map((r) => ({
      //     dormerId: r.dormer.id,
      //     email: r.dormer.email,
      //   })),
      //   partialRecipients: partial.map((r) => ({
      //     dormerId: r.dormer.id,
      //     email: r.dormer.email,
      //     amountPaid: r.amountPaid,
      //     remainingBalance: r.remainingBalance,
      //   })),
      //   perDormer: perDormerAudit,
      // });

      if (eligible.length === 0) {
        toast.info("All dormers have paid for this event.");
        return;
      }

      const footer = `
        <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay</strong></p>
        <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
          <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay. All rights reserved.</p>
          <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
        </div>
      `;

      let sent = 0;
      let failed = 0;

      // BCC blast for fully unpaid dormers (no personalized balance needed)
      if (unpaid.length > 0) {
        const unpaidHtml = `
        <h1>Payment Reminder</h1>
        <p>Hi dormers,</p>
        <p>This is a friendly reminder that your payment for <strong>${event.name}</strong> is still pending.</p>
        <p><strong>Amount Due: ₱${event.amountDue.toFixed(2)}</strong></p>
        <p>Please settle this amount on or before <strong>${event.dueDate}</strong> to avoid any delays.</p>
        <p>You can make your payment to the Dormitory Treasurer or Dormitory Auditor.</p>
        ${footer}
      `;
        const result = await sendEmail(
          {
            to: unpaid.map((u) => u.dormer.email).join(", "),
            subject: `Reminder: Payment for ${event.name}`,
            html: unpaidHtml,
          },
          { silent: true },
        );
        if (result.ok) sent += unpaid.length;
        else failed += unpaid.length;
      }

      // Personalized emails for partial payers (each needs their own remaining balance)
      if (partial.length > 0) {
        const renderPartialHtml = (
          firstName: string,
          amountPaid: number,
          remainingBalance: number,
        ) => `
        <h1>Payment Reminder</h1>
        <p>Hi ${firstName},</p>
        <p>This is a friendly reminder that you still have a remaining balance for <strong>${event.name}</strong>.</p>
        <p>Amount Already Paid: ₱${amountPaid.toFixed(2)}</p>
        <p>Total Amount Due: ₱${event.amountDue.toFixed(2)}</p>
        <p><strong>Remaining Balance: ₱${remainingBalance.toFixed(2)}</strong></p>
        <p>Please settle the remaining balance on or before <strong>${event.dueDate}</strong> to avoid any delays.</p>
        <p>You can make your payment to the Dormitory Treasurer or Dormitory Auditor.</p>
        ${footer}
      `;

        const EMAIL_CONCURRENCY = 5;
        let nextIndex = 0;
        const worker = async () => {
          while (true) {
            const i = nextIndex++;
            if (i >= partial.length) break;
            const { dormer, amountPaid, remainingBalance } = partial[i];
            const result = await sendEmail(
              {
                to: dormer.email,
                subject: `Reminder: Payment for ${event.name}`,
                html: renderPartialHtml(dormer.firstName, amountPaid, remainingBalance),
              },
              { silent: true },
            );
            if (result.ok) sent++;
            else failed++;
          }
        };
        const workerCount = Math.min(EMAIL_CONCURRENCY, partial.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
      }

      if (failed > 0) {
        toast.warning(`Reminders sent: ${sent} succeeded, ${failed} failed.`);
      } else {
        toast.success(`Reminder sent to ${sent} dormer(s).`);
      }
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
