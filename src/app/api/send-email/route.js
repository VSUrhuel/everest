// File: src/app/api/send-email/route.js

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

export async function POST(request) {
  try {
    const { to, subject, html, attachments } = await request.json();
    const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Add this

    // Handle attachments only if provided
    let adjustedAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      adjustedAttachments = attachments.map(att => ({
        ...att,
        path: path.join(__dirname, "../../../../public", att.path), // Build full path
      }));

      // checks if files exist
      for (const att of adjustedAttachments) {
        if (!fs.existsSync(att.path)) {
          console.error("Attachment file not found:", att.path);
          return NextResponse.json(
            { message: "Attachment file not found", error: `File not found: ${att.path}` },
            { status: 400 }
          );
        }
      }
    }
    
    // Create a transporter object using the default SMTP transport
    // We use environment variables to keep credentials secure
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Set up email data
    const mailOptions = {
      from: `"DormPay System" <${process.env.GMAIL_USER}>`, // sender address
      to: `"DormPay System" <${process.env.GMAIL_USER}>`,
      bcc: to, // list of receivers
      subject: subject, // Subject line
      html: html, // html body
    };
    
    // Only add attachments if they exist
    if (adjustedAttachments.length > 0) {
      mailOptions.attachments = adjustedAttachments;
    }

    // Send mail with defined transport object
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { message: "Failed to send email", error: error.message },
      { status: 500 }
    );
  }
}
