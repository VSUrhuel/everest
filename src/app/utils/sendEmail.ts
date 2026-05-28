import { toast } from "sonner";
import { auth } from "@/lib/firebase";

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export interface SendEmailOptions {
  silent?: boolean;
}

export const sendEmail = async (
  emailData: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
  },
  options: SendEmailOptions = {},
): Promise<SendEmailResult> => {
  const { silent = false } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      // fall through; the API will return 401 and we'll surface that below.
    }
  }

  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers,
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const message = `Email request failed with status ${response.status}`;
      if (!silent) toast.error("Failed to send notification email.");
      return { ok: false, error: message };
    }

    await response.json();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!silent) toast.error("Failed to send notification email.");
    return { ok: false, error: message };
  }
};
