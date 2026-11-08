import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { emailVerificationService } from "./emailVerification.service";

export const normalizedEmail = z.email().max(322).transform((value) => value.trim().toLowerCase());
const emailInput = z.object({ email: z.string().trim().pipe(normalizedEmail) });
const verifyInput = emailInput.extend({ code: z.string().regex(/^\d{6}$/) });
export const emailVerificationRouter = Router();
export const verificationSendLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many email requests. Please try again later." },
});

emailVerificationRouter.post("/send", verificationSendLimiter, async (req, res) => {
  const input = emailInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "A valid email address is required." });
  return res.json(await emailVerificationService.send(input.data.email));
});

emailVerificationRouter.post("/verify", rateLimit({
  windowMs: 15 * 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "rate_limited", message: "Too many verification requests. Please try again later." },
}), async (req, res) => {
  const input = verifyInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Enter a valid email address and six-digit code." });
  return res.json(await emailVerificationService.verify(input.data.email, input.data.code));
});
