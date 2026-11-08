import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { requireAccountSession } from "../../middleware/account-session";
import { accountService } from "./account.service";

export const accountRouter = Router();
accountRouter.use(requireAccountSession);

const detailsInput = z.object({
  firstName: z.string().trim().min(1).max(25),
  lastName: z.string().trim().max(25),
}).strict();
const deletionInput = z.object({
  password: z.string().min(1).max(256),
  confirmationEmail: z.string().trim().max(322).pipe(z.email()),
}).strict();

accountRouter.get("/", async (_req, res) => {
  return res.json(await accountService.get(res.locals.accountUserId as string));
});

accountRouter.patch("/", async (req, res) => {
  const input = detailsInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Provide a first name and names of up to 25 characters each." });
  return res.json(await accountService.update(res.locals.accountUserId as string, input.data));
});

accountRouter.delete("/", rateLimit({
  windowMs: 15 * 60_000, limit: 5,
  keyGenerator: (_req, res) => res.locals.accountUserId as string,
  standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Too many deletion attempts. Please try again in 15 minutes." },
}), async (req, res) => {
  const input = deletionInput.safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: "Enter your current password and account email to confirm deletion." });
  await accountService.delete(res.locals.accountUserId as string, input.data.password, input.data.confirmationEmail);
  return res.status(204).end();
});
