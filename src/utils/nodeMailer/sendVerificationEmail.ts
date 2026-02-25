import transport from "../../configs/nodemailer.js";
import verificationEmailTemplate from "../../templates/emailVerification.temp.js";

async function sendVerificationCode(email: string, username: string) {
  const code = getRandomNum();
  // try {
  //   await transport.sendMail({
  //     to: email,
  //     subject: "Verify your email address",
  //     html: verificationEmailTemplate(username, code),
  //   });
  //   return code;
  // } catch (error: any) {
  //   console.error("Failed to send verification email:", error.message);
  //   return "";
  // }
  return code;
}

export default sendVerificationCode;

function getRandomNum(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += Math.floor(Math.random() * 9);
  }
  return code;
}
