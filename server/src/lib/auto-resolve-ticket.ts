import fs from "fs";
import path from "path";
import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import Sentry from "./sentry";
import prisma from "../db";
import { sendEmailJob } from "./send-email";

const QUEUE_NAME = "auto-resolve-ticket";

const knowledgeBase = fs.readFileSync(
  path.join(import.meta.dirname, "../../knowledge-base.md"),
  "utf-8"
);

interface AutoResolveJobData {
  ticketId: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}

function generateFallbackReply(firstName: string, subject: string, body: string): string {
  const text = `${subject} ${body}`.toLowerCase();

  if (/(forgot\s*password|reset\s*password|password\s*reset|cannot\s*login|login\s*issue)/.test(text)) {
    return (
      `Hi ${firstName},\n\n` +
      `Thank you for reaching out regarding "${subject}". Here is how you can reset your password:\n\n` +
      `1. Go to the login page and click **Forgot Password**.\n` +
      `2. Enter your registered email address.\n` +
      `3. Follow the instructions in the password reset email.\n\n` +
      `If you do not see the email within 10 minutes, please check your spam or promotions folder.\n\n` +
      `If you have any other questions, feel free to reach out.\n\n` +
      `Best regards,\nHelpdesk Support`
    );
  }

  if (/(refund|money\s*back|charged\s*twice|double\s*charge|return)/.test(text)) {
    return (
      `Hi ${firstName},\n\n` +
      `Thank you for contacting us about "${subject}". Here are the details regarding our refund policy:\n\n` +
      `- We offer a 30-day money-back guarantee on purchases.\n` +
      `- Refunds are processed within 5–10 business days once approved.\n` +
      `- Please reply with your order receipt or transaction ID so we can process this right away.\n\n` +
      `If you have any other questions, feel free to reach out.\n\n` +
      `Best regards,\nHelpdesk Support`
    );
  }

  if (/(certificate|certificates)/.test(text)) {
    return (
      `Hi ${firstName},\n\n` +
      `Thank you for reaching out! Yes, we provide certificates upon course completion.\n\n` +
      `- Once you finish all lessons, your certificate is automatically available inside your dashboard.\n` +
      `- Please note that certificates are completion certificates and not accredited degrees.\n\n` +
      `If you have any other questions, feel free to reach out.\n\n` +
      `Best regards,\nHelpdesk Support`
    );
  }

  if (/(download|offline|video)/.test(text)) {
    return (
      `Hi ${firstName},\n\n` +
      `Thank you for your question regarding "${subject}".\n\n` +
      `- Course videos are streamed online and offline video downloads are not supported.\n` +
      `- Source code and downloadable resources can be downloaded directly from the lesson page.\n\n` +
      `If you have any other questions, feel free to reach out.\n\n` +
      `Best regards,\nHelpdesk Support`
    );
  }

  if (/(purchase|course\s*access|cannot\s*see|payment|order)/.test(text)) {
    return (
      `Hi ${firstName},\n\n` +
      `Thank you for contacting us regarding "${subject}". We're happy to help!\n\n` +
      `Possible reasons & quick checks:\n` +
      `- Make sure you are logged in with the same email address used during checkout.\n` +
      `- Check your email inbox for the payment confirmation receipt.\n` +
      `- If the payment is still processing, it usually completes within a few minutes.\n\n` +
      `If the issue persists, simply reply with your order ID or screenshot and we will resolve it immediately.\n\n` +
      `If you have any other questions, feel free to reach out.\n\n` +
      `Best regards,\nHelpdesk Support`
    );
  }

  return (
    `Hi ${firstName},\n\n` +
    `Thank you for reaching out to Helpdesk Support regarding "${subject}".\n\n` +
    `We have received your message and logged it for immediate attention. While our team reviews the details, please try these quick steps if applicable:\n` +
    `1. Restart the application or device and check if the issue persists.\n` +
    `2. Share any error messages, screenshots, or order details by replying to this email.\n\n` +
    `If you have any other questions, feel free to reach out.\n\n` +
    `Best regards,\nHelpdesk Support`
  );
}

export async function registerAutoResolveWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<AutoResolveJobData>(QUEUE_NAME, async (jobs) => {
    const { ticketId, subject, body, senderName, senderEmail } = jobs[0]!.data;
    const firstName = senderName.split(" ")[0] || "Customer";

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "processing" },
    });

    let response = "";
    if (process.env.OPENAI_API_KEY) {
      try {
        const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
        const { text } = await generateText({
          model: openai(modelName),
          system:
            "You are a friendly and professional support agent for Helpdesk. " +
            "Use ONLY the following knowledge base to answer the customer's question.\n\n" +
            knowledgeBase +
            "\n\n" +
            "Guidelines for your response:\n" +
            `- Address the customer by their first name: ${firstName}\n` +
            "- Use a warm, professional, and customer-friendly tone\n" +
            "- Format the response clearly with line breaks between paragraphs\n" +
            "- Use bullet points or numbered lists when listing steps or multiple items\n" +
            "- End with an offer to help further, e.g. 'If you have any other questions, feel free to reach out.'\n" +
            "- Sign off with:\n\nBest regards,\nHelpdesk Support\n\n" +
            "If the knowledge base does NOT contain enough information to fully resolve the question, " +
            'respond with exactly "ESCALATE" and nothing else.',
          prompt: `Subject: ${subject}\n\nBody: ${body}`,
        });
        response = text.trim();
      } catch (error) {
        console.warn(`OpenAI auto-resolve failed for ticket ${ticketId}, using fallback:`, error);
      }
    }

    if (!response || response === "ESCALATE") {
      response = generateFallbackReply(firstName, subject, body);
    }

    try {
      await prisma.$transaction([
        prisma.reply.create({
          data: {
            body: response,
            senderType: "agent",
            ticketId,
            userId: null,
          },
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: "resolved" },
        }),
      ]);

      await sendEmailJob({
        to: senderEmail,
        subject: `Re: ${subject}`,
        body: response,
      });

      console.log(`🤖 AI auto-replied to ticket #${ticketId} and queued email to ${senderEmail}`);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId },
      });
      throw error;
    }
  });
}

export async function sendAutoResolveJob(ticket: {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
}): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, {
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    senderName: ticket.senderName,
    senderEmail: ticket.senderEmail,
  });
}
