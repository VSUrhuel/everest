export const newFineImposedTemplate = (
  firstName: string,
  fines: Array<{
    finesRemarks: string;
    totalAmountDue: number;
    dateImposed: Date;
  }>,
) => {
  const total = fines.reduce((sum, f) => sum + f.totalAmountDue, 0);
  const rows = fines
    .map(
      (f) => `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${f.finesRemarks}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${f.dateImposed.toLocaleDateString()}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">₱${f.totalAmountDue.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
    <h1>New Fine${fines.length > 1 ? "s" : ""} Imposed</h1>
    <p>Hi ${firstName},</p>
    <p>The following fine${fines.length > 1 ? "s have" : " has"} been added to your account:</p>
    <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Reason</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Total: ₱${total.toFixed(2)}</strong></p>
    <p>Please settle this with the Dorm SA.</p>
    <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay System</strong></p>
    <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
      <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay System. All rights reserved.</p>
      <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
      <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
    </div>
  `;
};
