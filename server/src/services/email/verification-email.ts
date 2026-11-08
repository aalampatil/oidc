import type { EmailMessage } from "./email.service";

export function verificationEmail(to: string, code: string): EmailMessage {
  return {
    to,
    subject: "Verify your Identity Account email",
    text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<h1>Verify your email</h1><p>Enter this code to verify your Identity Account:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  };
}
