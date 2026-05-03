import crypto from "node:crypto";
import JWT from "jsonwebtoken";

import { db } from "../db/index";
import { refreshTokensTable } from "../db/schema";
import { PRIVATE_KEY } from "../utils/cert";
import { env } from "../env";
import { hashOpaqueToken, randomToken } from "./security";

const ISSUER = `${env.ISSUER_URL}`;

// ── Token helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId: string, audience: string, scope: string) {
  return JWT.sign({
    iss: ISSUER,
    aud: audience,
    sub: userId,
    client_id: audience,
    scope,
    token_use: "access",
    jti: crypto.randomUUID(),
  }, PRIVATE_KEY, {
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
  nonce?: string | null,
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
      nonce: nonce ?? undefined,
      token_use: "id",
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    },
    PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "1h" },
  );
}

async function createRefreshToken(
  userId: string,
  clientId: string | null,
  scopes = "openid",
) {
  const token = randomToken(40);
  const tokenHash = hashOpaqueToken(token);
  await db.insert(refreshTokensTable).values({
    token: tokenHash,
    userId,
    clientId: clientId ?? null,
    scopes,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  return token;
}

export { signAccessToken, signIdToken, createRefreshToken };
