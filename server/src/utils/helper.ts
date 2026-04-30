import crypto from "node:crypto";
import JWT from "jsonwebtoken";

import { db } from "../db/index";
import { refreshTokensTable } from "../db/schema";
import { PRIVATE_KEY } from "../utils/cert";
import { env } from "../env";

const ISSUER = `${env.ISSUER_URL}`;

// ── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId: string) {
  return JWT.sign({ sub: userId }, PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: "1h",
  });
}

function signIdToken(
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    firstName?: string | null;
    lastName?: string | null;
    profileImageURL?: string | null;
  },
  audience: string,
) {
  return JWT.sign(
    {
      iss: ISSUER,
      aud: audience,
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      given_name: user.firstName ?? "",
      family_name: user.lastName ?? undefined,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      picture: user.profileImageURL ?? undefined,
      iat: Math.floor(Date.now() / 1000),
    },
    PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "1h" },
  );
}

async function createRefreshToken(userId: string, clientId: string | null) {
  const token = crypto.randomBytes(40).toString("hex");
  await db.insert(refreshTokensTable).values({
    token,
    userId,
    clientId: clientId ?? null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  return token;
}

export { signAccessToken, signIdToken, createRefreshToken };
