function resetPasswordTemplate(resetUrl: string): string {
  return `
    <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f6f6f6; padding:40px;">
      <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:8px;">
        
        <h2>Password Reset Request</h2>

        <p>You requested a password reset. Click the button below to set a new password.</p>

        <div style="text-align:center; margin:30px 0;">
          <a href="${resetUrl}"
            style="
              background:#2563eb;
              color:white;
              padding:12px 20px;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold;
              display:inline-block;
            ">
            Reset Password
          </a>
        </div>

        <p>If the button doesn't work, copy and paste this link:</p>
        <p style="word-break:break-all">${resetUrl}</p>

        <p>This link will expire in 10 minutes.</p>

        <p>If you did not request this reset, you can safely ignore this email.</p>

      </div>
    </body>
  </html>`;
}

export default resetPasswordTemplate;
