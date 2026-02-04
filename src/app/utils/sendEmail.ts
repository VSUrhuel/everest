import { toast } from "sonner";

export const sendEmail = async (emailData: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
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
      toast.error("Failed to send notification email.");
    }
  };
