import { AI_AGENT_ID } from "core/constants/ai-agent.ts";
import prisma from "../db";
import { sendClassifyJob } from "./classify-ticket";
import { sendAutoResolveJob } from "./auto-resolve-ticket";

export interface InboundEmailPayload {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  bodyHtml?: string;
}

export function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

export function parseFromField(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1]!.trim() || match[2]!, email: match[2]! };
  }
  return { name: from, email: from };
}

/**
 * Persist an inbound email as a reply on an existing open ticket or create a new ticket + enqueue AI jobs.
 */
export async function ingestInboundEmail(data: InboundEmailPayload) {
  const normalizedSubject = stripSubjectPrefixes(data.subject) || "No Subject";

  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.from,
      status: { notIn: ["resolved", "closed"] },
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    await prisma.reply.create({
      data: {
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderType: "customer",
        ticketId: existingTicket.id,
        userId: null,
      },
    });
    return { created: false as const, ticket: existingTicket };
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName,
      senderEmail: data.from,
      assignedToId: AI_AGENT_ID,
    },
  });

  sendClassifyJob(ticket).catch((error) =>
    console.error(`Failed to enqueue classify job for ticket ${ticket.id}:`, error)
  );

  sendAutoResolveJob(ticket).catch((error) =>
    console.error(`Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error)
  );

  return { created: true as const, ticket };
}
