import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  ticketCategories,
  type TicketCategory,
} from "core/constants/ticket-category.ts";
import Sentry from "./sentry";
import prisma from "../db";

const QUEUE_NAME = "classify-ticket";

interface ClassifyJobData {
  ticketId: number;
  subject: string;
  body: string;
}

function classifyFallback(subject: string, body: string): TicketCategory {
  const text = `${subject} ${body}`.toLowerCase();
  if (/(refund|money\s*back|charged\s*twice|double\s*charge|billing|cancel|invoice|receipt)/.test(text)) {
    return "refund_request";
  }
  if (/(error|crash|bug|not\s*working|cannot\s*login|password|reset|2fa|sms|display|broken|damaged|failed|500|404|429|issue|problem)/.test(text)) {
    return "technical_question";
  }
  return "general_question";
}

export async function registerClassifyWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<ClassifyJobData>(QUEUE_NAME, async (jobs) => {
    const { ticketId, subject, body } = jobs[0]!.data;

    let category: TicketCategory | null = null;

    if (process.env.OPENAI_API_KEY) {
      try {
        const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
        const { text } = await generateText({
          model: openai(modelName),
          system:
            "You are a support ticket classifier. " +
            "Classify the ticket into exactly one of these categories: " +
            `${ticketCategories.join(", ")}. ` +
            "Return only the category value with no extra text.",
          prompt: `Subject: ${subject}\n\nBody: ${body}`,
        });

        const parsed = text.trim() as TicketCategory;
        if (ticketCategories.includes(parsed)) {
          category = parsed;
        } else {
          console.warn(`Invalid category "${text.trim()}" returned for ticket ${ticketId}`);
        }
      } catch (error) {
        console.warn(`OpenAI classify failed for ticket ${ticketId}, using fallback:`, error);
      }
    }

    if (!category) {
      category = classifyFallback(subject, body);
    }

    try {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { category },
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId },
      });
      throw error;
    }
  });
}

export async function sendClassifyJob(ticket: {
  id: number;
  subject: string;
  body: string;
}): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, {
    ticketId: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
  });
}
