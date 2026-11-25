import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env"
    );
  }

  const now = new Date();

  // Seed or update admin user so changing SEED_ADMIN_* updates the database cleanly
  const hashedPassword = await hashPassword(password);
  const existingAdmin =
    (await prisma.user.findUnique({ where: { email } })) ??
    (email !== "admin@example.com"
      ? await prisma.user.findUnique({ where: { email: "admin@example.com" } })
      : null);
  const isInitialSeed = !existingAdmin;

  if (existingAdmin) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existingAdmin.id },
        data: {
          email,
          role: Role.admin,
          deletedAt: null,
          updatedAt: now,
        },
      });
      const updated = await tx.account.updateMany({
        where: { userId: existingAdmin.id, providerId: "credential" },
        data: {
          password: hashedPassword,
          updatedAt: now,
        },
      });
      if (updated.count === 0) {
        await tx.account.create({
          data: {
            id: crypto.randomUUID(),
            accountId: existingAdmin.id,
            providerId: "credential",
            userId: existingAdmin.id,
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    });
    console.log(`Admin user ${email} updated successfully.`);
  } else {
    const userId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name: "Admin",
          email,
          emailVerified: false,
          role: Role.admin,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ]);
    console.log(`Admin user ${email} created successfully.`);
  }

  // Seed AI agent user
  const existingAI = await prisma.user.findUnique({
    where: { id: AI_AGENT_ID },
  });
  if (existingAI) {
    console.log("AI agent user already exists — skipping.");
  } else {
    await prisma.user.create({
      data: {
        id: AI_AGENT_ID,
        name: "AI",
        email: "ai@helpdesk.local",
        emailVerified: false,
        role: Role.agent,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log("AI agent user created successfully.");
  }

  // Seed human Agent user
  const agentEmail = process.env.SEED_AGENT_EMAIL || "agent@example.com";
  const agentPassword = process.env.SEED_AGENT_PASSWORD || "password123";
  const existingAgent = await prisma.user.findUnique({ where: { email: agentEmail } });
  if (existingAgent) {
    console.log(`Agent user ${agentEmail} already exists — skipping.`);
  } else {
    const hashedAgentPassword = await hashPassword(agentPassword);
    const agentUserId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: agentUserId,
          name: "Agent",
          email: agentEmail,
          emailVerified: false,
          role: Role.agent,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: agentUserId,
          providerId: "credential",
          userId: agentUserId,
          password: hashedAgentPassword,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ]);
    console.log(`Agent user ${agentEmail} created successfully.`);
  }

  // Seed sample tickets only on initial seed when table is empty
  const ticketCount = await prisma.ticket.count();
  if (isInitialSeed && ticketCount === 0) {
    const adminUser = await prisma.user.findUnique({ where: { email } });
    
    await prisma.ticket.createMany({
      data: [
        {
          subject: "Cannot login to account after password reset",
          body: "I reset my password 15 minutes ago, but the login form continues to say invalid credentials. Please assist.",
          status: "open",
          category: "technical_question",
          senderName: "Rahul Sharma",
          senderEmail: "rahul.s@example.com",
          assignedToId: adminUser?.id,
          createdAt: new Date(Date.now() - 3600000 * 3),
          updatedAt: new Date(Date.now() - 3600000 * 3),
        },
        {
          subject: "Double charge on monthly Pro subscription",
          body: "My credit card statement shows two debits of $49 on November 15. Please refund the duplicate transaction.",
          status: "open",
          category: "refund_request",
          senderName: "Priya Patel",
          senderEmail: "priya.p@techcorp.io",
          createdAt: new Date(Date.now() - 3600000 * 6),
          updatedAt: new Date(Date.now() - 3600000 * 6),
        },
        {
          subject: "How do I invite teammates to my organization?",
          body: "Where is the invite team member button located in the new dashboard settings?",
          status: "resolved",
          category: "general_question",
          senderName: "David Miller",
          senderEmail: "david@cloudworks.com",
          assignedToId: AI_AGENT_ID,
          createdAt: new Date(Date.now() - 3600000 * 24),
          updatedAt: new Date(Date.now() - 3600000 * 22),
        },
        {
          subject: "API webhook returning 502 Bad Gateway error",
          body: "Our webhook endpoint started returning 502 Bad Gateway during high traffic spikes.",
          status: "resolved",
          category: "technical_question",
          senderName: "Sarah Jenkins",
          senderEmail: "sarah.j@enterprise.net",
          assignedToId: AI_AGENT_ID,
          createdAt: new Date(Date.now() - 3600000 * 48),
          updatedAt: new Date(Date.now() - 3600000 * 40),
        },
      ],
    });
    console.log("Sample tickets created successfully.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
