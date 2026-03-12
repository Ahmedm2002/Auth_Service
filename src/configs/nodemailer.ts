import nodemailer from "nodemailer";
import logger from "../utils/logger/logger.js";

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

async function testNodemailer() {
  try {
    await transport.verify();
    logger.info("Email transport verified — SMTP connection OK");
  } catch (err) {
    console.error("Verification failed", err);
  }
}

// testNodemailer();

export default transport;
