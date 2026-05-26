// File: src/app/api/send-email/route.js
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const ALLOWED_ROLES = new Set(["Admin", "Adviser"]);

async function authorize(request) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return { ok: false, status: 401, message: "Missing bearer token" };
  }
  const idToken = match[1].trim();

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }

  try {
    const snap = await adminDb.collection("dormers").doc(decoded.uid).get();
    const role = snap.exists ? snap.data()?.role : null;
    if (!role || !ALLOWED_ROLES.has(role)) {
      return { ok: false, status: 403, message: "Forbidden: admin role required" };
    }
  } catch (err) {
    return { ok: false, status: 500, message: "Role lookup failed" };
  }

  return { ok: true };
}

export async function POST(request) {
  try {
    const auth = await authorize(request);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

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
