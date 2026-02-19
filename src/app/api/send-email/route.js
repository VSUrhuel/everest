// File: src/app/api/send-email/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

export async function POST(request) {
  try {
    const { to, subject, html, attachments } = await request.json();

    let adjustedAttachments = [];
    
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.content) {
          adjustedAttachments.push(att);
          continue; 
        }

        if (att.path) {
          const fullPath = path.join(process.cwd(), "public", att.path);
          
          if (!fs.existsSync(fullPath)) {
            console.error("Attachment file not found:", fullPath);
            return NextResponse.json(
              { message: "Attachment file not found", error: `File not found: ${att.path}` },
              { status: 400 }
            );
          }

          adjustedAttachments.push({
            ...att,
            path: fullPath,
          });
        }
      }
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"DormPay System" <${process.env.GMAIL_USER}>`, 
      to: `"DormPay System" <${process.env.GMAIL_USER}>`,
      bcc: to, 
      subject: subject, 
      html: html, 
    };
    
    // Only add attachments if we successfully processed them
    if (adjustedAttachments.length > 0) {
      mailOptions.attachments = adjustedAttachments;
    }

    // Send mail
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