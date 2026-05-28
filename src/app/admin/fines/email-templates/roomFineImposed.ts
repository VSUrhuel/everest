export const roomFineImposedTemplate = (
  roomNumber: string,
  amount: number,
  reason: string,
  dateImposed: Date,
  residentCount: number,
) => `
  <h1>Shared Room Fine Imposed</h1>
  <p>Hi residents of Room ${roomNumber},</p>
  <p>A shared fine has been imposed on your room. All ${residentCount} resident${residentCount === 1 ? "" : "s"} are jointly responsible for this fine.</p>
  <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
    <tbody>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; width: 40%;">Room</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${roomNumber}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Reason</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${reason}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Date Imposed</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${dateImposed.toLocaleDateString()}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Amount per Resident</td>
        <td style="border: 1px solid #ddd; padding: 8px;">₱${amount.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  <p>Once any one resident fully pays this fine, the corresponding fines on the other residents will be automatically cleared. Please coordinate with your roommates to settle this with the Dorm SA.</p>
  <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay System</strong></p>
  <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
    <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay System. All rights reserved.</p>
    <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
    <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
  </div>
`;
