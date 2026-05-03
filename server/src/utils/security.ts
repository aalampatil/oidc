import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const PASSWORD_PREFIX = "scrypt";
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return {
    hash: `${PASSWORD_PREFIX}$${salt}$${derived.toString("hex")}`,
    salt,
  };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  legacySalt?: string | null,
) {
  if (storedHash.startsWith(`${PASSWORD_PREFIX}$`)) {
    const [, salt, hash] = storedHash.split("$");
    if (!salt || !hash) return false;

    const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
    return timingSafeEqualHex(hash, derived.toString("hex"));
  }

  if (!legacySalt) return false;

  const legacyHash = crypto
    .createHash("sha256")
    .update(password + legacySalt)
    .digest("hex");

  return timingSafeEqualHex(storedHash, legacyHash);
}

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 40) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function safeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
