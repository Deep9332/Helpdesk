import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const user = process.env.GMAIL_USER || "deepgamer933@gmail.com";
const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

if (!user || !pass) {
  console.error("❌ Error: GMAIL_USER or GMAIL_APP_PASSWORD is missing in server/.env");
  process.exit(1);
}

const client = new ImapFlow({
  host: "imap.gmail.com",
  port: 993,
  secure: true,
  auth: { user, pass },
  logger: false,
});

let highestKnownUid = 0;
const processedUids = new Set<number>();

async function processMessage(uid: number) {
  if (processedUids.has(uid)) return;
  processedUids.add(uid);

  try {
    const download = await client.download(String(uid), undefined, { uid: true });
    if (!download || !download.content) return;

    const parsed = await simpleParser(download.content);
    const senderObj = parsed.from?.value?.[0];
    const senderEmail = senderObj?.address || "customer@example.com";
    const senderName = senderObj?.name || senderEmail;
    const from = `${senderName} <${senderEmail}>`;

    const subject = parsed.subject || "No Subject";
    const text = parsed.text || "No message body";
    const html = parsed.html || undefined;

    // Prevent infinite loop when replying to our own Gmail address
    if (
      parsed.headers.has("x-helpdesk-auto-reply") ||
      senderName === "Helpdesk Support" ||
      (senderEmail.toLowerCase() === user.toLowerCase() &&
        subject.startsWith("Re:") &&
        text.includes("Best regards,\nHelpdesk Support"))
    ) {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      return;
    }

    console.log("----------------------------------------------------------");
    console.log(`📩 New Customer Email Received!`);
    console.log(`From:    ${from}`);
    console.log(`Subject: ${subject}`);
    console.log("Creating Ticket in Helpdesk...");

    const secret = process.env.WEBHOOK_SECRET || "local-dev-webhook-secret-12345";
    const url = `http://127.0.0.1:3000/api/webhooks/inbound-email?secret=${secret}`;

    const form = new FormData();
    form.append("from", from);
    form.append("to", user);
    form.append("subject", subject);
    form.append("text", text);
    if (html) form.append("html", html);

    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
    });

    console.log("🎉 SUCCESS! Ticket created on Helpdesk!");
    console.log(`Ticket ID: #${response.data.ticket?.id}`);
    console.log(`Subject:   "${response.data.ticket?.subject}"`);
    console.log(`Sender:    ${response.data.ticket?.senderName}`);
    console.log("👉 Refresh browser (http://localhost:5173/tickets) to see it!\n");

    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
  } catch (error: any) {
    if (error.response) {
      console.error("❌ Webhook API error:", error.response.status, error.response.data);
    } else {
      console.error("❌ Failed to process message:", error.message);
    }
  }
}

async function checkNewEmails() {
  try {
    const uids = await client.search({ seen: false }, { uid: true });
    if (Array.isArray(uids) && uids.length > 0) {
      for (const uid of uids) {
        if (uid > highestKnownUid) {
          highestKnownUid = Math.max(highestKnownUid, uid);
          await processMessage(uid);
        }
      }
    }
  } catch (err: any) {
    console.error("Check error:", err.message);
  }
}

async function start() {
  console.log("==========================================================");
  console.log("   Helpdesk Live Gmail Sync (Real-Time Inbound Email)");
  console.log("==========================================================");
  console.log(`Connecting to Gmail for ${user}...`);

  try {
    await client.connect();
    console.log("✅ Connected to Gmail successfully!");

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Find the current highest UID so we only listen for brand new emails
      const allUids = await client.search({ all: true }, { uid: true });
      if (Array.isArray(allUids) && allUids.length > 0) {
        highestKnownUid = (allUids[allUids.length - 1] ?? 1) - 1; // Catch the most recent one if just sent
      }
      console.log(`Current Mailbox initialized (Tracking emails after UID: ${highestKnownUid}).`);
      console.log(`🎧 LIVE! Send an email from your phone to ${user} right now...\n`);

      // Check if there is an unread email right now
      await checkNewEmails();

      client.on("exists", async () => {
        try {
          await checkNewEmails();
        } catch (e: any) {
          console.error("Exists error:", e.message);
        }
      });

      // Poll every 3 seconds for instant pickup
      setInterval(async () => {
        try {
          await checkNewEmails();
        } catch (e) {}
      }, 3000);

      while (true) {
        await client.idle();
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error("❌ Gmail connection error:", err.message);
  }
}

start();
