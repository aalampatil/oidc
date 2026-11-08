import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { emailVerificationsTable, usersTable } from "../../db/schema";
import { EmailVerificationService, OTP_TTL_MS } from "./emailVerification.service";
import type { EmailMessage } from "../../services/email/email.service";

// Explicit opt-in: never infer a test database from production credentials.
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 3000 });
const database = drizzle(pool);
afterAll(() => pool.end());

describe.skipIf(!process.env.TEST_DATABASE_URL)("email OTP with PostgreSQL", () => {
  async function fixture(check: (context: {
    service: EmailVerificationService; email: string; userId: string;
    messages: EmailMessage[]; advance: (ms: number) => void; failDelivery: () => void;
    challenge: () => Promise<typeof emailVerificationsTable.$inferSelect | undefined>;
  }) => Promise<void>) {
    const rollback = new Error("rollback test fixture");
    try {
      await database.transaction(async (tx) => {
        const email = `otp-${randomUUID()}@example.com`;
        const [user] = await tx.insert(usersTable).values({ email }).returning();
        const messages: EmailMessage[] = [];
        let now = Date.now();
        let fail = false;
        const service = new EmailVerificationService(tx, async (message) => {
          if (fail) throw new Error("delivery failed");
          messages.push(message);
        }, () => now);
        await check({ service, email, userId: user!.id, messages,
          advance: (ms) => { now += ms; }, failDelivery: () => { fail = true; },
          challenge: async () => (await tx.select().from(emailVerificationsTable)
            .where(eq(emailVerificationsTable.userId, user!.id)))[0],
        });
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
  }

  const code = (message: EmailMessage) => message.text.match(/\b\d{6}\b/)![0];
  // Await database work before passing errors to matchers. Bun's promise
  // rejection matchers can stall pg callbacks on Windows.
  async function rejected(operation: Promise<unknown>) {
    try { await operation; } catch (error) { return error; }
    throw new Error("Expected operation to reject");
  }

  test("stores a hash, verifies once, and deletes the challenge", () => fixture(async ({ service, email, messages, challenge }) => {
    await service.send(email);
    const otp = code(messages[0]!);
    expect((await challenge())!.codeHash).not.toContain(otp);
    expect(await service.verify(email, otp)).toMatchObject({ ok: true });
    expect(await challenge()).toBeUndefined();
    expect(await rejected(service.verify(email, otp))).toMatchObject({ code: "invalid_verification_code" });
  }));

  test("expired codes are rejected", () => fixture(async ({ service, email, messages, advance }) => {
    await service.send(email);
    advance(OTP_TTL_MS);
    expect(await rejected(service.verify(email, code(messages[0]!)))).toMatchObject({ status: 400 });
  }));

  test("failed attempts persist and lock out the correct code after five failures", () => fixture(async ({ service, email, messages, challenge }) => {
    await service.send(email);
    const otp = code(messages[0]!);
    const wrong = otp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(await rejected(service.verify(email, wrong))).toMatchObject({ status: 400 });
    expect((await challenge())!.attempts).toBe(5);
    expect(await rejected(service.verify(email, otp))).toMatchObject({ status: 400 });
  }));

  test("enforces cooldown and hourly sends, then allows the next window", () => fixture(async ({ service, email, messages, advance }) => {
    await service.send(email);
    expect(await rejected(service.send(email))).toMatchObject({ code: "resend_cooldown", retryAfter: 60 });
    for (let i = 0; i < 4; i++) { advance(60_000); await service.send(email); }
    advance(60_000);
    expect(await rejected(service.send(email))).toMatchObject({ code: "email_rate_limited" });
    expect(messages.length).toBe(5);
    advance(3_600_000);
    expect(await service.send(email)).toMatchObject({ ok: true });
  }));

  test("resending invalidates the previous code and resets attempts", () => fixture(async ({ service, email, messages, advance, challenge }) => {
    await service.send(email);
    const previousHash = (await challenge())!.codeHash;
    advance(60_000);
    await service.send(email);
    expect((await challenge())!.codeHash).not.toBe(previousHash);
    expect((await challenge())!.attempts).toBe(0);
    const oldCode = code(messages[0]!);
    const newCode = code(messages[1]!);
    if (oldCode !== newCode) expect(await rejected(service.verify(email, oldCode))).toMatchObject({ status: 400 });
    expect(await service.verify(email, newCode)).toMatchObject({ ok: true });
  }));

  test("delivery failure preserves the previous challenge", () => fixture(async ({ service, email, messages, advance, failDelivery, challenge }) => {
    await service.send(email);
    const previous = await challenge();
    advance(60_000);
    failDelivery();
    expect(await rejected(service.send(email))).toMatchObject({ message: "delivery failed" });
    expect(await challenge()).toEqual(previous);
    expect(await service.verify(email, code(messages[0]!))).toMatchObject({ ok: true });
  }));

  test("unknown and verified email sends return the same public result", () => fixture(async ({ service, email, messages }) => {
    const unknown = await service.send(`unknown-${randomUUID()}@example.com`);
    const known = await service.send(email);
    await service.verify(email, code(messages[0]!));
    expect(await service.send(email)).toEqual(unknown);
    expect(known).toEqual(unknown);
    expect(messages.length).toBe(1);
  }));

  test("concurrent sends and verification are serialized across database connections", async () => {
    const email = `otp-concurrent-${randomUUID()}@example.com`;
    const [user] = await database.insert(usersTable).values({ email }).returning();
    const messages: EmailMessage[] = [];
    const service = new EmailVerificationService(database, async (message) => { messages.push(message); });
    try {
      const sends = await Promise.allSettled([service.send(email), service.send(email)]);
      expect(sends.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(messages).toHaveLength(1);
      const verifications = await Promise.allSettled([service.verify(email, code(messages[0]!)), service.verify(email, code(messages[0]!))]);
      expect(verifications.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const [verified] = await database.select().from(usersTable).where(eq(usersTable.id, user!.id));
      expect(verified!.emailVerified).toBe(true);
    } finally { await database.delete(usersTable).where(eq(usersTable.id, user!.id)); }
  });
});
