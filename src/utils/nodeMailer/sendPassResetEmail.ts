import transport from "../../configs/nodemailer.js";
import resetPasswordTemplate from "../../templates/passwordReset.temp.js";

async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl =
    process.env.RESET_PASSWORD_REDIRECT_BASE_URL + `?/t=${token}`;
  try {
    await transport.sendMail({
      to: email,
      subject: "Reset Password",
      html: resetPasswordTemplate(resetUrl),
    });
  } catch (error: any) {
    console.error("Failed to send verification email:", error.message);
    throw new Error("Error sending reset password to user: ", error.message);
  }
}

export default sendPasswordResetEmail;
