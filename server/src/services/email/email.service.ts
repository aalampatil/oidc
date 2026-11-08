import nodemailer from "nodemailer";
import { z } from "zod";

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export type SendEmail = (message: EmailMessage) => Promise<void>;
export type EmailRequest = (url: string, options: RequestInit) => Promise<Response>;

export class EmailDeliveryError extends Error {
  constructor() { super("The verification email could not be sent. Please try again."); }
}

// Lazy configuration keeps credentials on the server and allows unrelated routes
// to run before an email provider is configured.
export function createEmailService(source: NodeJS.ProcessEnv = process.env, request: EmailRequest = fetch): SendEmail {
  let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
  return async (message) => {
    try {
      const provider = source.EMAIL_PROVIDER || (source.RESEND_API_KEY ? "resend" : "smtp");
      const from = z.string().min(1).parse(source.EMAIL_FROM || source.SMTP_FROM);
      if (provider === "resend") {
        const apiKey = z.string().min(1).parse(source.RESEND_API_KEY);
        const response = await request("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, ...message, to: [message.to] }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new EmailDeliveryError();
        return;
      }
      if (provider !== "smtp") throw new EmailDeliveryError();
      if (!transport) {
        const port = z.coerce.number().int().min(1).max(65535).parse(source.SMTP_PORT || "587");
        transport = nodemailer.createTransport({
          host: z.string().min(1).parse(source.SMTP_HOST),
          port,
          secure: port === 465,
          requireTLS: true,
          auth: {
            user: z.string().min(1).parse(source.SMTP_USERNAME),
            // Backward compatibility with the existing local configuration.
            pass: z.string().min(1).parse(source.SMTP_PASSWORD || source.SMPT_PASSWORD),
          },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        });
      }
      const result = await transport.sendMail({ from, ...message });
      if (!result.accepted?.length) throw new EmailDeliveryError();
    } catch {
      // Provider responses can contain secrets and message content, including OTPs.
      throw new EmailDeliveryError();
    }
  };
}

export const sendEmail = createEmailService();
