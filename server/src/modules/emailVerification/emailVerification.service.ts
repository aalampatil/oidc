import { randomInt } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { emailVerificationsTable, usersTable } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../utils/security";
import { sendEmail, type SendEmail } from "../../services/email/email.service";
import { verificationEmail } from "../../services/email/verification-email";

import { VerificationError } from "./emailVerification.errors";

export const OTP_TTL_MS = 10 * 60_000;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS_PER_HOUR = 5;

export class EmailVerificationService {
  constructor(
    private database: Pick<typeof db, "transaction"> = db,
    private deliver: SendEmail = sendEmail,
    private now: () => number = Date.now,
  ) {}

  async send(email: string) {
    await this.database.transaction(async (tx) => {
      // The account lock serializes sends and verification, including the first
      // challenge, across processes. Delivery failure rolls back to the old code.
      const [user] = await tx.select().from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${email}`).for("update");
      if (!user || user.emailVerified) return;
      const [previous] = await tx.select().from(emailVerificationsTable)
        .where(eq(emailVerificationsTable.userId, user.id));
      const now = this.now();
      const retryAfter = previous ? Math.ceil((previous.sentAt.getTime() + 60_000 - now) / 1000) : 0;
      if (retryAfter > 0) {
        throw new VerificationError(429, "resend_cooldown", "Please wait before requesting another code.", retryAfter);
      }
      const sameWindow = previous && now - previous.windowStartedAt.getTime() < 3_600_000;
      if (sameWindow && previous.sendCount >= MAX_SENDS_PER_HOUR) {
        throw new VerificationError(429, "email_rate_limited", "Too many codes requested. Please try again later.",
          Math.ceil((previous.windowStartedAt.getTime() + 3_600_000 - now) / 1000));
      }
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const { hash } = await hashPassword(code);
      const challenge = {
        userId: user.id, codeHash: hash, attempts: 0,
        expiresAt: new Date(now + OTP_TTL_MS), sentAt: new Date(now),
        windowStartedAt: sameWindow ? previous.windowStartedAt : new Date(now),
        sendCount: sameWindow ? previous.sendCount + 1 : 1,
      };
      await tx.insert(emailVerificationsTable).values(challenge)
        .onConflictDoUpdate({ target: emailVerificationsTable.userId, set: challenge });
      await this.deliver(verificationEmail(user.email, code));
    });
    return { ok: true, message: "If this email needs verification, a code has been sent.", retryAfter: RESEND_COOLDOWN_SECONDS };
  }

  async verify(email: string, code: string) {
    // Return invalid results from the transaction so failed-attempt increments
    // commit. Throwing inside it would roll those increments back.
    const valid = await this.database.transaction(async (tx) => {
      const [user] = await tx.select().from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${email}`).for("update");
      if (!user || user.emailVerified) return false;
      const [challenge] = await tx.select().from(emailVerificationsTable)
        .where(eq(emailVerificationsTable.userId, user.id));
      if (!challenge || challenge.expiresAt.getTime() <= this.now() || challenge.attempts >= MAX_ATTEMPTS) return false;
      if (!(await verifyPassword(code, challenge.codeHash))) {
        await tx.update(emailVerificationsTable).set({ attempts: challenge.attempts + 1 })
          .where(eq(emailVerificationsTable.userId, user.id));
        return false;
      }
      await tx.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, user.id));
      await tx.delete(emailVerificationsTable).where(eq(emailVerificationsTable.userId, user.id));
      return true;
    });
    if (!valid) throw new VerificationError(400, "invalid_verification_code", "The code is invalid, expired, or has too many failed attempts. Request a new code if needed.");
    return { ok: true, message: "Email verified. You can now sign in." };
  }
}

export const emailVerificationService = new EmailVerificationService();
