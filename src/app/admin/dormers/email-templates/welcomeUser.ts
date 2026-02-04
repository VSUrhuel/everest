export const welcomeUserTemplate = (
  firstName: string,
  email: string,
  temporaryPassword: string
) => `
  <h1>Welcome, ${firstName}!</h1>
  <p>Your dormer account has been created successfully.</p>
  <p>Email: <strong>${email}</strong></p>
  <p>Password: <strong>${temporaryPassword}</strong></p>
  <p style="margin-top: 25px;">Please <a href="https://dorm-payment-system.vercel.app/" style="color: #007bff; text-decoration: none;">log in</a> and change your password as soon as possible for security reasons.</p>
  <p>This is where you will receive your bills and payment confirmations!</p>
  <p>Please refer to the user guide attached below for detailed instructions on how to use the system.</p>
  
  <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 25px 0;">
    <p style="margin: 0 0 12px 0; font-weight: 600; color: #212529; font-size: 15px;">Need Help or Found an Issue?</p>
    <p style="margin: 0 0 12px 0; color: #495057; font-size: 14px; line-height: 1.6;">We value your feedback. If you encounter any issues or have suggestions for improvement, please report them via email using the following format:</p>
    <div style="margin: 0 0 12px 0; padding: 12px; background-color: #ffffff; border-left: 3px solid #007bff; font-size: 13px; color: #495057;">
      <p style="margin: 0 0 6px 0;"><strong>Subject:</strong> Bug Report - [Brief Description]</p>
      <p style="margin: 0;"><strong>Details to Include:</strong> What happened, what you expected, steps to reproduce, and screenshots if available</p>
    </div>
    <p style="margin: 0; color: #6c757d; font-size: 12px;">Your reports help us improve the system for everyone. Thank you for your cooperation.</p>
  </div>
  
  <p style="margin-top: 25px;">Best regards,<br><strong>VSU DormPay System</strong></p>
  <div style="border-top: 1px solid #eeeeee; margin-top: 30px; padding-top: 20px; color: #888888; text-align: center; font-size: 12px; line-height: 1.5;">
      <p style="margin: 0;">© ${new Date().getFullYear()} VSU DormPay System. All rights reserved.</p>
      <p style="margin: 5px 0 0 0;">Visca, Baybay City, Leyte</p>
      <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply.</p>
  </div>
`;
