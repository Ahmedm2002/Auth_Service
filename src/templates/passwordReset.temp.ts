function resetPasswordTemplate(email: string, resetToken: string): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Password Reset</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f6f8; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 0;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px;">
              
              <tr>
                <td style="padding:24px 32px;">
                  <h2 style="margin:0 0 16px 0; color:#333;">
                    Password Reset Request
                  </h2>

                  <p style="margin:0 0 16px 0; color:#555; font-size:14px; line-height:1.6;">
                    We received a request to reset the password associated with <strong>${email}</strong>.
                  </p>

                  <p style="margin:0 0 8px 0; color:#555; font-size:14px;">
                    Your password reset token:
                  </p>

                  <div style="
                    margin:24px 0;
                    padding:16px;
                    background:#f4f6f8;
                    text-align:center;
                    font-size:20px;
                    letter-spacing:2px;
                    font-weight:bold;
                    color:#111;
                    border-radius:6px;
                    word-break:break-all;
                  ">
                    ${resetToken}
                  </div>

                  <p style="margin:0 0 16px 0; color:#555; font-size:13px; line-height:1.6;">
                    This token will expire in <strong>10 minutes</strong> for security reasons.
                  </p>

                  <p style="margin:0; color:#777; font-size:12px;">
                    If you did not request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background:#f4f6f8; padding:16px; text-align:center; font-size:12px; color:#888;">
                  © ${new Date().getFullYear()} Your Company
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

export default resetPasswordTemplate;
