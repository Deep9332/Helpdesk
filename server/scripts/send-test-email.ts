import axios from "axios";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import FormData from "form-data";
import * as readline from "readline";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function run() {
  console.log("==========================================================");
  console.log("   Helpdesk Inbound Customer Email Simulator");
  console.log("==========================================================");
  console.log("Default email bhejni hai ya apni custom details enter karni hai?\n");

  const choice = await askQuestion("Custom email bhejni hai? (y/N) [Default: N]: ");

  let senderName = "Kavita Patel";
  let senderEmail = "kavita.patel@gmail.com";
  let subject = "Order received with damaged packaging";
  let body =
    "Hello Support Team,\n\nI received my order #48291 today, but the box was damaged and one item was broken. Could you please arrange a replacement or refund as soon as possible?\n\nThank you,\nKavita Patel";

  if (choice.trim().toLowerCase() === "y") {
    const inputName = await askQuestion("Aapka Naam [Default: Deep]: ");
    if (inputName.trim()) senderName = inputName.trim();

    const inputEmail = await askQuestion("Aapka Email [Default: test@gmail.com]: ");
    if (inputEmail.trim()) senderEmail = inputEmail.trim();

    const inputSubject = await askQuestion("Subject / Problem [Default: Need help with login]: ");
    if (inputSubject.trim()) subject = inputSubject.trim();

    const inputBody = await askQuestion("Message / Detail: ");
    if (inputBody.trim()) body = inputBody.trim();
  }

  const secret = process.env.WEBHOOK_SECRET || "local-dev-webhook-secret-12345";
  const url = `http://localhost:3000/api/webhooks/inbound-email?secret=${secret}`;

  const form = new FormData();
  form.append("from", `${senderName} <${senderEmail}>`);
  form.append("to", "support@helpdesk.local");
  form.append("subject", subject);
  form.append("text", body);

  console.log("\n----------------------------------------------------------");
  console.log(`Sending email to Helpdesk Webhook...`);
  console.log(`From:    ${senderName} <${senderEmail}>`);
  console.log(`Subject: ${subject}`);
  console.log("----------------------------------------------------------\n");

  try {
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
    });

    console.log("SUCCESS! Email received successfully by Helpdesk!");
    console.log(`New Ticket Created: ID #${response.data.ticket?.id}`);
    console.log(`Subject: "${response.data.ticket?.subject}"`);
    console.log(`Sender:  ${response.data.ticket?.senderName} (${response.data.ticket?.senderEmail})`);
    console.log("\nAb apne browser me http://localhost:5173/tickets refresh karein.");
    console.log("Aapko yeh naya ticket list me sabse upar dikhega!\n");
  } catch (error: any) {
    if (error.response) {
      console.error("Webhook error:", error.response.status, error.response.data);
    } else {
      console.error("Connection error:", error.message);
      console.log("\nDhyaan dein: Pehle 'start-dev.bat' chala kar backend (Port 3000) start karein!");
    }
  }
}

run();
