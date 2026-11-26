import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Sentry from "./sentry";
import { ingestInboundEmail } from "./inbound-email";

const MAX_TRACKED_UIDS = 500;
const POLL_INTERVAL_MS = 5000;
const RECONNECT_DELAY_MS = 10000;

let stopped = false;
let activeClient: ImapFlow | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let syncLoopPromise: Promise<void> | null = null;

/**
 * Listen to Gmail INBOX via IMAP and turn incoming customer emails into helpdesk tickets.
 */
export function startGmailSync(): Promise<void> | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!user || !pass) {
    console.warn("Live Gmail Sync disabled: GMAIL_USER or GMAIL_APP_PASSWORD is not set.");
    return null;
  }

  if (syncLoopPromise) {
    return syncLoopPromise;
  }

  stopped = false;
  syncLoopPromise = runSyncLoop(user, pass).finally(() => {
    syncLoopPromise = null;
  });

  return syncLoopPromise;
}

export async function stopGmailSync(): Promise<void> {
  stopped = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (activeClient) {
    try {
      await activeClient.logout();
    } catch {
      activeClient.close();
    }
    activeClient = null;
  }
}

async function runSyncLoop(user: string, pass: string): Promise<void> {
  const processedUids = new Set<number>();
  let highestKnownUid = 0;

  while (!stopped) {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });
    activeClient = client;

    let checking = false;

    const checkNewEmails = async () => {
      if (stopped || checking) return;
      checking = true;
      try {
        const uids = await client.search({ seen: false }, { uid: true });
        if (!Array.isArray(uids) || uids.length === 0) return;

        for (const uid of uids) {
          if (stopped) break;
          if (uid <= highestKnownUid || processedUids.has(uid)) continue;

          highestKnownUid = Math.max(highestKnownUid, uid);
          processedUids.add(uid);
          if (processedUids.size > MAX_TRACKED_UIDS) {
            const oldest = processedUids.values().next().value;
            if (oldest !== undefined) processedUids.delete(oldest);
          }

          await processMessage(client, user, uid);
        }
      } catch (err: any) {
        if (!stopped) {
          console.error("Gmail sync check error:", err?.message || err);
        }
      } finally {
        checking = false;
      }
    };

    try {
      await client.connect();
      console.log(`Live Gmail Sync connected for ${user}`);

      const lock = await client.getMailboxLock("INBOX");
      try {
        if (highestKnownUid === 0) {
          const allUids = await client.search({ all: true }, { uid: true });
          if (Array.isArray(allUids) && allUids.length > 0) {
            let maxUid = 0;
            for (const uid of allUids) {
              if (uid > maxUid) maxUid = uid;
            }
            highestKnownUid = Math.max(0, maxUid - 1);
          }
        }

        await checkNewEmails();

        client.on("exists", () => {
          void checkNewEmails();
        });

        pollTimer = setInterval(() => {
          void checkNewEmails();
        }, POLL_INTERVAL_MS);

        while (!stopped && client.usable) {
          await client.idle();
        }
      } finally {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        lock.release();
      }
    } catch (err: any) {
      if (!stopped) {
        Sentry.captureException(err, { tags: { service: "gmail-sync" } });
        console.error("Gmail sync connection error:", err?.message || err);
      }
    } finally {
      activeClient = null;
      try {
        client.close();
      } catch {
        // ignore close errors
      }
    }

    if (!stopped) {
      await Bun.sleep(RECONNECT_DELAY_MS);
    }
  }
}

async function processMessage(client: ImapFlow, mailboxUser: string, uid: number): Promise<void> {
  try {
    const download = await client.download(String(uid), undefined, { uid: true });
    if (!download?.content) return;

    const parsed = await simpleParser(download.content);
    const senderObj = parsed.from?.value?.[0];
    const senderEmail = senderObj?.address || "customer@example.com";
    const senderName = senderObj?.name || senderEmail;
    const subject = parsed.subject || "No Subject";
    const text = parsed.text || "No message body";
    const html = parsed.html || undefined;

    if (
      parsed.headers.has("x-helpdesk-auto-reply") ||
      senderName === "Helpdesk Support" ||
      (senderEmail.toLowerCase() === mailboxUser.toLowerCase() &&
        subject.startsWith("Re:") &&
        text.includes("Best regards,\nHelpdesk Support"))
    ) {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      return;
    }

    const result = await ingestInboundEmail({
      from: senderEmail,
      fromName: senderName,
      subject,
      body: text,
      bodyHtml: html,
    });

    console.log(
      `Gmail inbound email ingested -> Ticket #${result.ticket.id} (${result.created ? "new" : "reply"}) from ${senderEmail}`
    );

    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
  } catch (err: any) {
    Sentry.captureException(err, { tags: { service: "gmail-sync", uid } });
    console.error(`Failed to process Gmail UID ${uid}:`, err?.message || err);
  }
}
