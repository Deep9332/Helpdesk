import "dotenv/config";
import prisma from "../src/db";
import { hashPassword } from "better-auth/crypto";
import { Role } from "../src/generated/prisma/client";

async function main() {
  const email = "agent@example.com";
  const password = "AgentPassword123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name: "Support Agent",
        email,
        emailVerified: false,
        role: Role.agent,
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

  console.log(`SUCCESS: Agent user created!`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error("Error creating agent:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
