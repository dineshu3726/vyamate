import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendTempPasswordEmail(to: string, name: string, tempPassword: string): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@vyamate.com';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7FAFA;font-family:Inter,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,156,157,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#009C9D,#007A7B);padding:32px 32px 24px;text-align:center;">
      <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">Vya<span style="color:#B2EFEF;">Mate</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">Your neighborhood workout crew</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h2 style="font-size:20px;font-weight:800;color:#1A2E2E;margin:0 0 8px;">Hey ${name} 👋</h2>
      <p style="font-size:14px;color:#4A6B6B;line-height:1.6;margin:0 0 24px;">
        We received a request to reset your VyaMate password. Here's your temporary password — use it to sign in, and you'll be prompted to create a new one right away.
      </p>

      <!-- Password box -->
      <div style="background:#F0FAFA;border:2px dashed #009C9D;border-radius:14px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;color:#7A9A9A;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">Temporary Password</div>
        <div style="font-size:22px;font-weight:900;color:#009C9D;letter-spacing:2px;font-family:monospace;">${tempPassword}</div>
      </div>

      <div style="background:#FFF8E7;border-radius:10px;padding:14px 16px;margin-bottom:24px;display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:16px;">⚠️</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:#92601A;margin-bottom:2px;">This password expires in 1 hour</div>
          <div style="font-size:12px;color:#92601A;line-height:1.5;">If you didn't request this, you can safely ignore this email. Your original password remains unchanged.</div>
        </div>
      </div>

      <a href="${process.env.FRONTEND_URL || 'https://vyamate.vercel.app'}/login"
         style="display:block;background:#009C9D;color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;">
        Sign In to VyaMate →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #E2EDED;">
      <p style="font-size:11px;color:#7A9A9A;margin:0;">© 2026 VyaMate · Built for fitness enthusiasts</p>
    </div>
  </div>
</body>
</html>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"VyaMate" <${from}>`,
    to,
    subject: '🔐 Your VyaMate Temporary Password',
    html,
    text: `Hi ${name},\n\nYour temporary VyaMate password is: ${tempPassword}\n\nThis expires in 1 hour. Sign in at ${process.env.FRONTEND_URL || 'https://vyamate.vercel.app'}/login and you'll be asked to set a new password.\n\nIf you didn't request this, ignore this email.\n\n— The VyaMate Team`,
  });
}
