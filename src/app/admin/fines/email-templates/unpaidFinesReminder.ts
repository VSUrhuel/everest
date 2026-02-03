export const unpaidFinesReminderTemplate = (
  dormerName: {
    firstName: string;
    lastName: string;
  },
  unpaidFines: Array<{
    finesRemarks: string;
    totalAmountDue: number;
    amountPaid: number;
    remainingBalance: number;
    dateImposed?: { seconds: number } | Date;
  }>
) => {
  const totalOutstanding = unpaidFines.reduce((sum, fine) => sum + fine.remainingBalance, 0);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Unpaid Fines Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .fines-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .fines-table th, .fines-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .fines-table th { background-color: #f8f9fa; }
        .total { font-weight: bold; font-size: 18px; color: #dc3545; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DormPay System - Unpaid Fines Reminder</h1>
        </div>
        <div class="content">
            <p>Dear ${dormerName.firstName} ${dormerName.lastName},</p>
            <p>This is a reminder that you have outstanding fines that need to be paid. Please review the details below and settle your payments at your earliest convenience.</p>

            <table class="fines-table">
                <thead>
                    <tr>
                        <th>Fine Type</th>
                        <th>Amount Due</th>
                        <th>Amount Paid</th>
                        <th>Remaining Balance</th>
                        <th>Date Imposed</th>
                    </tr>
                </thead>
                <tbody>
                    ${unpaidFines.map(fine => {
                      const dateImposed = fine.dateImposed 
                        ? (typeof fine.dateImposed === 'object' && 'seconds' in fine.dateImposed
                          ? new Date(fine.dateImposed.seconds * 1000).toLocaleDateString()
                          : new Date(fine.dateImposed).toLocaleDateString())
                        : 'N/A';
                      
                      return `
                        <tr>
                            <td>${fine.finesRemarks}</td>
                            <td>₱${fine.totalAmountDue.toFixed(2)}</td>
                            <td>₱${fine.amountPaid.toFixed(2)}</td>
                            <td>₱${fine.remainingBalance.toFixed(2)}</td>
                            <td>${dateImposed}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>

            <p class="total">Total Outstanding: ₱${totalOutstanding.toFixed(2)}</p>

            <p>Please contact your dormitory management if you have any questions or need assistance with payment arrangements.</p>
            <p>Thank you for your attention to this matter.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>DormPay System</p>
        </div>
    </div>
</body>
</html>
  `;
};
