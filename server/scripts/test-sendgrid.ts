import path from "path";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

if (!apiKey || !fromEmail) {
  throw new Error("SENDGRID_API_KEY and SENDGRID_FROM_EMAIL must be set in server/.env");
}

sgMail.setApiKey(apiKey);

async function testSend() {
  console.log(`Testing SendGrid with FROM: ${fromEmail}...`);
  try {
    const res = await sgMail.send({
      to: fromEmail,
      from: fromEmail,
      subject: "Helpdesk - SendGrid Setup Successful!",
      text: "Congratulations! Your SendGrid API Key and Sender Identity are working perfectly with your Helpdesk application.",
    });
    console.log("SUCCESS! SendGrid responded with status:", res[0].statusCode);
  } catch (error: any) {
    if (error.response) {
      console.error("SendGrid API Error:", JSON.stringify(error.response.body, null, 2));
    } else {
      console.error("Error:", error.message);
    }
  }
}

testSend();
