import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { startGmailSync, stopGmailSync } from "../src/lib/gmail-sync";

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error("Error: GMAIL_USER or GMAIL_APP_PASSWORD is missing in server/.env");
  process.exit(1);
}

console.log(`Starting Helpdesk Live Gmail Sync for ${process.env.GMAIL_USER}...`);

const shutdown = async () => {
  await stopGmailSync();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await startGmailSync();
