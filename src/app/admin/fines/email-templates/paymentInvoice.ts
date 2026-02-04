export const paymentInvoiceTemplate = (
  dormerName: string,
  paymentData: {
    finesRemarks: string;
    totalAmountDue: number;
    amountPaid: number;
    remainingBalance: number;
    paymentDate: Date | string;
    paymentMethod?: string;
    notes?: string;
  } | {
    finesRemarks: string;
    totalAmountDue: number;
    amountPaid: number;
    remainingBalance: number;
    paymentDate: Date | string;
    paymentMethod?: string;
    notes?: string;
  }[],
  recordedByName: string,
  overallSummary?: {
    totalFines: number;
    totalAmountDue: number;
    totalPaid: number;
    totalRemaining: number;
  }
) => {
  const isMultipleFines = Array.isArray(paymentData);
  const finesArray = isMultipleFines ? paymentData : [paymentData];
  const isBulkPayment = isMultipleFines && paymentData.length > 1;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Fine Payment Invoice</title>
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
        .highlight.warning { border-left-color: #dc3545; }
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
            <p>Thank you for your payment. This is your official payment invoice for your recent fine payment transaction.</p>

            <h3>${isBulkPayment ? 'Fines Paid (Bulk Payment)' : 'Payment Transaction Details'}</h3>
            <table class="payment-table">
                <thead>
                    <tr>
                        <th>Fine Type</th>
                        <th>Amount Due</th>
                        <th>Amount Paid</th>
                        <th>Remaining Balance</th>
                        <th>Payment Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${finesArray.map(fine => `
                        <tr>
                            <td>${fine.finesRemarks}</td>
                            <td>₱${fine.totalAmountDue.toFixed(2)}</td>
                            <td>₱${fine.amountPaid.toFixed(2)}</td>
                            <td>₱${fine.remainingBalance.toFixed(2)}</td>
                            <td>${typeof fine.paymentDate === 'string' ? fine.paymentDate : new Date(fine.paymentDate).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <table class="payment-table">
                <tbody>
                    ${!isMultipleFines && paymentData.paymentMethod ? `
                    <tr>
                        <th style="width: 30%;">Payment Method</th>
                        <td>${paymentData.paymentMethod}</td>
                    </tr>
                    ` : ''}
                    ${!isMultipleFines && paymentData.notes ? `
                    <tr>
                        <th style="width: 30%;">Notes</th>
                        <td>${paymentData.notes}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <th style="width: 30%;">Recorded By</th>
                        <td>${recordedByName}</td>
                    </tr>
                    ${isBulkPayment ? `
                    <tr>
                        <th style="width: 30%;">Payment Type</th>
                        <td>Bulk Payment - Pay All</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>

            ${overallSummary ? `
            <h3 style="margin-top: 30px;">Your Overall Fines Summary</h3>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Total Fines</th>
                        <th>Total Amount Due</th>
                        <th>Total Paid</th>
                        <th>Total Remaining</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">${overallSummary.totalFines}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalAmountDue.toFixed(2)}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalPaid.toFixed(2)}</td>
                        <td style="text-align: center; font-weight: bold; font-size: 18px;">₱${overallSummary.totalRemaining.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            ` : ''}

            ${!isMultipleFines && paymentData.remainingBalance > 0 ? `
            <div class="highlight warning">
                Outstanding Balance for This Fine: ₱${paymentData.remainingBalance.toFixed(2)}<br>
                <span style="font-weight: normal; font-size: 14px;">Please settle the remaining balance at your earliest convenience.</span>
            </div>
            ` : (overallSummary && overallSummary.totalRemaining === 0) || (!isMultipleFines && paymentData.remainingBalance === 0) ? `
            <div class="highlight success">
                ✓ Payment Complete - ${isBulkPayment ? 'All fines have' : 'This fine has'} been fully paid. Thank you!
            </div>
            ` : ''}

            <p>Please keep this invoice for your records. If you have any questions regarding this payment, please contact your respective dormitory management.</p>
            <p>Thank you for your attention to this matter.</p>
        </div>
        <div class="footer">
            <p style="margin: 0;">Best regards,<br><strong>DormPay System</strong></p>
            <div style="border-top: 1px solid #dee2e6; margin-top: 15px; padding-top: 15px;">
                <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay System. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
                <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
};
