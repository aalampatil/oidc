import { expect, test } from "bun:test";
import { createEmailService, EmailDeliveryError, type EmailRequest } from "./email.service";
import { verificationEmail } from "./verification-email";

test("Resend sends the verification template with server-side authorization", async () => {
  let captured: { url: string; options: RequestInit } | undefined;
  const request: EmailRequest = async (url, options) => {
    captured = { url, options };
    return new Response('{"id":"test-message"}', { status: 200 });
  };
  const send = createEmailService({ EMAIL_FROM: "Identity <test@example.com>", RESEND_API_KEY: "test-key" }, request);
  await send(verificationEmail("recipient@example.com", "012345"));
  expect(captured!.url).toBe("https://api.resend.com/emails");
  expect(captured!.options.headers).toMatchObject({ Authorization: "Bearer test-key" });
  expect(JSON.parse(captured!.options.body as string)).toMatchObject({ from: "Identity <test@example.com>", to: ["recipient@example.com"] });
  expect(JSON.parse(captured!.options.body as string).text).toContain("012345");
});

test("provider failures return a safe error without exposing provider responses or credentials", async () => {
  const send = createEmailService({ EMAIL_PROVIDER: "resend", EMAIL_FROM: "test@example.com", RESEND_API_KEY: "secret" },
    async () => new Response("secret provider details", { status: 401 }));
  await expect(send(verificationEmail("recipient@example.com", "012345"))).rejects.toBeInstanceOf(EmailDeliveryError);
});

test("missing configuration and unknown providers fail closed", async () => {
  const message = verificationEmail("recipient@example.com", "012345");
  await expect(createEmailService({})(message)).rejects.toBeInstanceOf(EmailDeliveryError);
  await expect(createEmailService({ EMAIL_PROVIDER: "unknown", EMAIL_FROM: "test@example.com" })(message)).rejects.toBeInstanceOf(EmailDeliveryError);
});
