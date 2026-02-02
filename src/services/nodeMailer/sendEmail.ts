import transport from "../../configs/nodemailer.js";

async function sendVerificationLink(email: string, username: string) {
  try {
    await transport.sendMail({
      to: email,
      subject: "Verify your email address",
      html: verificationEmailTemplate(username, "/"),
    });
  } catch (error: any) {
    console.error("Failed to send verification email:", error.message);
  }
}

export default sendVerificationLink;

function verificationEmailTemplate(username: string, verifyUrl: string) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Email Verification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 0;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
              
              <tr>
                <td style="padding:24px 32px;">
                  <h2 style="margin:0 0 16px 0; color:#333;">
                    Welcome, ${username}
                  </h2>

                  <p style="margin:0 0 16px 0; color:#555; font-size:14px; line-height:1.6;">
                    Thank you for creating an account with us. To complete your registration and
                    secure your account, please verify your email address.
                  </p>

                  <p style="margin:0 0 24px 0; color:#555; font-size:14px; line-height:1.6;">
                    Click the button below to verify your email. This link will expire for security reasons.
                  </p>

                  <div style="text-align:center; margin:32px 0;">
                    <a
                      href="${verifyUrl}"
                      style="
                        background-color:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        padding:12px 24px;
                        border-radius:6px;
                        font-size:14px;
                        font-weight:bold;
                        display:inline-block;
                      "
                    >
                      Verify Email
                    </a>
                  </div>

                  <p style="margin:24px 0 0 0; color:#777; font-size:12px; line-height:1.6;">
                    If you did not create this account, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f4f6f8; padding:16px; text-align:center; font-size:12px; color:#888;">
                  © ${new Date().getFullYear()} Your Company. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}
