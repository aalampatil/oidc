import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import jose from "node-jose";
import { db } from "../db/index";
import {
  authCodesTable,
  oauthClientsTable,
  refreshTokensTable,
  usersTable,
} from "../db/schema";
import { PRIVATE_KEY, PUBLIC_KEY } from "../utils/cert";
import type { JWTClaims } from "../utils/user-token";
import cors from "cors";

const ISSUER = process.env.ISSUER_URL ?? `http://localhost:${process.env.PORT}`;

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
