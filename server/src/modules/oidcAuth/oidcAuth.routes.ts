import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import { db } from "../../db/index";
import {
  authCodesTable,
  oauthClientsTable,
  refreshTokensTable,
  usersTable,
} from "../../db/schema";
import { PUBLIC_KEY } from "../../utils/cert";
import type { JWTClaims } from "../../utils/user-token";
import {
  createRefreshToken,
  signAccessToken,
  signIdToken,
} from "../../utils/helper";

export const oidcRouter = Router();

oidcRouter.get("/authenticate", (req, res) => {
  return res.sendFile(path.resolve("public", "authenticate.html"));
});

oidcRouter.get("/authenticate/register", (req, res) => {
  return res.sendFile(path.resolve("public", "signup.html"));
});

oidcRouter.post("/authenticate/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  console.log(firstName, lastName, email, password);

  if (!email || !password || !firstName) {
    res
      .status(400)
      .json({ message: "First name, email, and password are required." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists." });
    return;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex");

  await db.insert(usersTable).values({
    firstName,
    lastName: lastName ?? null,
    email,
    password: hash,
    salt,
  });

  res.status(201).json({ ok: true });
});

oidcRouter.post("/authenticate/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !user.password || !user.salt) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const hash = crypto
    .createHash("sha256")
    .update(password + user.salt)
    .digest("hex");
  if (hash !== user.password) {
    res.status(401).json({ message: "Invalid email or password." });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const idToken = signIdToken(user, "self");
  const refreshToken = await createRefreshToken(user.id, null); // no client for direct login

  res.json({
    access_token: accessToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
  });
});

// ── /o/userinfo ──────────────────────────────────────────────────────────────

oidcRouter.get("/userinfo", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Missing or invalid Authorization header." });
    return;
  }

  const token = authHeader.slice(7);
  let claims: JWTClaims;

  try {
    claims = JWT.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as JWTClaims;
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, claims.sub));

  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    sub: user.id,
    email: user.email,
    email_verified: user.emailVerified,
    given_name: user.firstName,
    family_name: user.lastName,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    picture: user.profileImageURL,
  });
});

// ── /o/token ─────────────────────────────────────────────────────────────────

oidcRouter.post("/token", async (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;

  // Verify client for both grant types
  const [client] = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, client_id));

  const hashed_secret = crypto
    .createHash("sha256")
    .update(client_secret)
    .digest("hex");

  if (!client || hashed_secret !== client.secret) {
    return res.status(401).json({ error: "invalid_client" });
  }

  // ── authorization_code ────────────────────────────────────────────────────
  if (grant_type === "authorization_code") {
    const { code, redirect_uri } = req.body;

    const [authCode] = await db
      .select()
      .from(authCodesTable)
      .where(eq(authCodesTable.code, code));

    if (
      !authCode ||
      authCode.used ||
      new Date() > authCode.expiresAt ||
      authCode.redirectUri !== redirect_uri
    ) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    await db
      .update(authCodesTable)
      .set({ used: true })
      .where(eq(authCodesTable.code, code));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, authCode.userId));

    if (!user) return res.status(400).json({ error: "invalid_user" });

    const accessToken = signAccessToken(user.id);
    const idToken = signIdToken(user, client_id);
    const refreshToken = await createRefreshToken(user.id, client_id);

    return res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scopes,
    });
  }

  // ── refresh_token ─────────────────────────────────────────────────────────
  if (grant_type === "refresh_token") {
    const { refresh_token } = req.body;

    const [stored] = await db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refresh_token));

    if (!stored || stored.used || new Date() > stored.expiresAt) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    // Rotate — mark old token as used
    await db
      .update(refreshTokensTable)
      .set({ used: true })
      .where(eq(refreshTokensTable.token, refresh_token));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, stored.userId));

    if (!user) return res.status(400).json({ error: "invalid_user" });

    const accessToken = signAccessToken(user.id);
    const idToken = signIdToken(user, stored.clientId ?? "self");
    const newRefreshToken = await createRefreshToken(
      user.id,
      stored.clientId ?? null,
    );

    return res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefreshToken,
    });
  }

  return res.status(400).json({ error: "unsupported_grant_type" });
});

// ── /o/revoke ─────────────────────────────────────────────────────────────────

oidcRouter.post("/revoke", async (req, res) => {
  const { token, client_id, client_secret } = req.body;

  const [client] = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, client_id));

  const hashed = crypto
    .createHash("sha256")
    .update(client_secret)
    .digest("hex");

  if (!client || hashed !== client.secret) {
    return res.status(401).json({ error: "invalid_client" });
  }

  await db
    .update(refreshTokensTable)
    .set({ used: true })
    .where(eq(refreshTokensTable.token, token));

  res.json({ ok: true }); // always 200 per spec
});
