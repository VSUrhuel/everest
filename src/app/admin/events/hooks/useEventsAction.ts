"use client";

import { useState } from "react";
import { User } from "firebase/auth";
import { toast } from "sonner";
import { Event } from "../types";
import { Dormer } from "../../dormers/types";
import { addEvent, updateEvent } from "@/lib/admin/event";
import { newEventEmailTemplate } from "../utils/email";
import { useCurrentDormitoryId } from "@/hooks/useCurrentDormitoryId";
import { sendEmail } from "@/app/utils/sendEmail";

export function useEventActions() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {dormitoryId, loading} = useCurrentDormitoryId();

  const handleSaveEvent = async (
    eventData: Omit<Event, "id" | "createdAt">,
    user: User | null,
    dormers: Dormer[]
  ) => {
    if (!dormitoryId) {
      toast.error("Dormitory ID not found. Please log in again.");
      return;
    }
    if (!user) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { id, ...dataToSave } = eventData as any; // Using 'as any' to handle potential 'id'

      if (id) {
        await updateEvent(dataToSave, id);
        toast.success("Event updated successfully!");
      } else {
        await addEvent(dataToSave, user.uid, dormitoryId);
        toast.success("New event created successfully!");
      }
      // Ensure deleted dormers don't receive emails by checking multiple possible indicators of deletion
      const recipientEmails = dormers
        .filter((d) => {
          const raw = (d as any).isDeleted;
          const deleted = raw === true || raw === "true" || raw === 1 || Boolean((d as any).deletedAt);
          return !deleted;
        })
        .map((d) => d.email)
        .filter(Boolean);
      if (recipientEmails.length > 0) {
        await sendEmail({
          to: recipientEmails.join(", "),
          subject: `New Event: ${eventData.name}`,
          html: newEventEmailTemplate(
            eventData.name,
            eventData.amountDue,
            eventData.dueDate
          ),
        });
      }
    } catch (error: any) {
      toast.error(`Error saving event: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSaveEvent };
}
