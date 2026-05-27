import { toast } from "sonner";
import { ExpenseData } from "../types";
import { Dormer } from "../../dormers/types";
import { sendEmail } from "@/app/utils/sendEmail";

// Note: We need a way to convert data to CSV here as well for the attachment.
// We'll define a local version or import from csvUtils if structure allows.
const convertToCSV = (data: ExpenseData[]): string => {
  if (!data || data.length === 0) return "";
  const header = [
    "ID",
    "Title",
    "Description",
    "Amount",
    "Category",
    "Receipt URL",
    "Expense Date",
    "Recorded By",
  ];
  const rows = data.map((expense) =>
    [
      expense.id,
      `"${expense.title.replace(/"/g, '""')}"`,
      `"${expense.description.replace(/"/g, '""')}"`,
      expense.amount,
      expense.category,
      expense.receiptImageUrl || "N/A",
      expense.expenseDate,
      `"${expense.recordedBy?.firstName || "N/A"} ${
        expense.recordedBy?.lastName || ""
      }"`,
    ].join(",")
  );
  const total = data.reduce((sum, expense) => sum + expense.amount, 0);
  const summaryRow = ["Total Expenses", "", "", total, "", "", "", ""].join(
    ","
  );
  rows.push(summaryRow);
  return [header.join(","), ...rows].join("\n");
};

export const handleSendExpenseReport = async (
  filteredExpenses: ExpenseData[],
  dormers: Dormer[],
  setIsSendingEmail: (isSending: boolean) => void
) => {
  if (!dormers || dormers.length === 0) {
    toast.error("No dormer emails available to send the report to.");
    return;
  }
  if (filteredExpenses.length === 0) {
    toast.info("No expense data to send.");
    return;
  }

  setIsSendingEmail(true);
  toast.info("Sending expense report...");

  try {
    const recipientEmails = dormers
      .map((dormer) => dormer.email)
      .filter(Boolean);
    const csvData = convertToCSV(filteredExpenses);

    const emailHtml = `
            <h1>Dormitory Expense Report</h1>
            <p>Hello everyone,</p>
            <p>Please find the latest expense report attached to this email.</p>
            <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay</strong></p>
            <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
                <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
                <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
            </div>
        `;

    const result = await sendEmail(
      {
        to: recipientEmails.join(", "),
        subject: "Dormitory Expense Report",
        html: emailHtml,
        attachments: [
          {
            filename: `expenses-report-${
              new Date().toISOString().split("T")[0]
            }.csv`,
            content: csvData,
            contentType: "text/csv",
          },
        ],
      },
      { silent: true },
    );

    if (!result.ok) {
      console.error("Failed to email report:", result.error);
      toast.error("There was a problem sending the email report.");
    } else {
      toast.success("Expense report has been emailed to all dormers!");
    }
  } catch (error) {
    console.error("Failed to email report:", error);
    toast.error("There was a problem sending the email report.");
  } finally {
    setIsSendingEmail(false);
  }
};
