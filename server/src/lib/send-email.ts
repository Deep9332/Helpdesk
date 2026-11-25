import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import type { PgBoss } from "pg-boss";
import Sentry from "./sentry";

const QUEUE_NAME = "send-email";

interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

export async function registerSendEmailWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<SendEmailJobData>(QUEUE_NAME, async (jobs) => {
    const { to, subject, body, bodyHtml } = jobs[0]!.data;

    // 1. Try SendGrid first
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject,
          text: body,
          ...(bodyHtml && { html: bodyHtml }),
          headers: {
            "X-Helpdesk-Auto-Reply": "true",
          },
        });
        console.log(`Email sent via SendGrid to ${to} — subject: "${subject}"`);
        return;
      } catch (sgError: any) {
        console.warn("SendGrid sending failed, falling back to Gmail SMTP:", sgError.message);
      }
    }

    // 2. Reliable Fallback: Gmail SMTP using user's App Password
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
          },
        });

        await transporter.sendMail({
          from: `"Helpdesk Support" <${process.env.GMAIL_USER}>`,
          to,
          subject,
          text: body,
          html: bodyHtml,
          headers: {
            "X-Helpdesk-Auto-Reply": "true",
          },
        });

        console.log(`Email sent via Gmail to ${to} — subject: "${subject}"`);
        return;
      } catch (gmailError: any) {
        console.error("Gmail SMTP fallback failed:", gmailError.message);
        Sentry.captureException(gmailError, {
          tags: { queue: QUEUE_NAME },
        });
        throw gmailError;
      }
    }
  });
}

export async function sendEmailJob(data: SendEmailJobData): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, data);
}
