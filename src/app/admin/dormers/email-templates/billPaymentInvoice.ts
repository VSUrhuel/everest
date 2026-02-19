import { getBillingPeriodLabel } from "../utils/generateBillUtils";

export const billPaymentInvoiceTemplate = (
  dormerName: string,
  bills: {
    billingPeriod: string;
    description: string;
    totalAmountDue: number;
    amountPaid: number;
    remainingBalance: number;
    paymentDate: Date;
  }[],
  recordedByName: string,
  overallSummary?: {
    totalBills: number;
    totalAmountDue: number;
    totalPaid: number;
    totalRemaining: number;
  }
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bill Payment Invoice</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .payment-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .payment-table th, .payment-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .payment-table th { background-color: #f8f9fa; font-weight: bold; }
        .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd; }
        .summary-table th, .summary-table td { padding: 12px; text-align: left; border: 1px solid #ddd; }
        .summary-table th { background-color: #f8f9fa; font-weight: bold; }
        .highlight { font-weight: bold; font-size: 16px; margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #6c757d; border-radius: 5px; }
        .highlight.success { border-left-color: #28a745; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin-top: 20px; font-size: 12px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DormPay System - Payment Invoice</h1>
        </div>
        <div class="content">
            <p>Dear ${dormerName},</p>
            <p>Thank you for your payment. This is your official payment invoice for your recent bill payment transaction.</p>

            <h3>Bills Paid (Bulk Payment)</h3>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>Billing Period</th>
                        <th>Description</th>
                        <th>Amount Due</th>
                        <th>Amount Paid</th>
                        <th>Remaining Balance</th>
                        <th>Payment Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${bills.map(bill => `
                        <tr>
                            <td>${getBillingPeriodLabel(bill.billingPeriod)}</td>
                            <td>${bill.description || "—"}</td>
                            <td>₱${bill.totalAmountDue.toFixed(2)}</td>
                            <td>₱${bill.amountPaid.toFixed(2)}</td>
                            <td>₱${bill.remainingBalance.toFixed(2)}</td>
                            <td>${new Date(bill.paymentDate).toLocaleDateString()}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <table class="payment-table">
                <tbody>
                    <tr>
                        <th style="width: 30%;">Recorded By</th>
                        <td>${recordedByName}</td>
                    </tr>
                    <tr>
                        <th style="width: 30%;">Payment Type</th>
                        <td>Bulk Payment - Pay All</td>
                    </tr>
                </tbody>
            </table>

            ${overallSummary ? `
            <h3 style="margin-top: 30px;">Your Overall Bills Summary</h3>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Total Bills</th>
                        <th>Total Amount Due</th>
                        <th>Total Paid</th>
                        <th>Total Remaining</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">${overallSummary.totalBills}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalAmountDue.toFixed(2)}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalPaid.toFixed(2)}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalRemaining.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            ` : ""}

            ${overallSummary && overallSummary.totalRemaining === 0 ? `
            <div class="highlight success">
                ✓ Payment Complete - All bills have been fully paid. Thank you!
            </div>
            ` : ""}

            <p>Please keep this invoice for your records. If you have any questions regarding this payment, please contact your respective dormitory management.</p>
            <p>Thank you for your attention to this matter.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} VSU DormPay. All rights reserved.</p>
            <p>Visca, Baybay City, Leyte</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>`;
};
