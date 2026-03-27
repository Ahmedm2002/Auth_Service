import transport from "../../configs/nodemailer.js";
import verificationEmailTemplate from "../../templates/emailVerification.temp.js";
import crypto from "node:crypto";

async function sendVerificationCode(email: string, username: string) {
  const code = String(crypto.randomInt(100000, 999999));
  try {
    await transport.sendMail({
      to: email,
      subject: "Verify your email address",
      html: verificationEmailTemplate(username, code),
    });
    return code;
  } catch (error: any) {
    console.error("Failed to send verification email:", error.message);
    throw new Error("Error sending verification code to email");
  }
}

export default sendVerificationCode;
