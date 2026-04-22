import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import jose from "node-jose";
import { db } from "./db";
import {
  authCodesTable,
  oauthClientsTable,
  refreshTokensTable,
  usersTable,
} from "./db/schema";
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert";
import type { JWTClaims } from "./utils/user-token";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ?? 8080;
const ISSUER = process.env.ISSUER_URL ?? `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));

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

// ── Basic routes ─────────────────────────────────────────────────────────────

app.get("/", (req, res) => res.json({ message: "Hello from Auth Server" }));

app.get("/health", (req, res) =>
  res.json({ message: "Server is healthy", healthy: true }),
);

// ── OIDC Discovery ───────────────────────────────────────────────────────────

app.get("/.well-known/openid-configuration", (req, res) => {
  return res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/o/3rd-party-client/authorize`,
    token_endpoint: `${ISSUER}/o/token`,
    userinfo_endpoint: `${ISSUER}/o/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    revocation_endpoint: `${ISSUER}/o/revoke`,
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    claims_supported: [
      "sub",
      "email",
      "email_verified",
      "given_name",
      "family_name",
      "name",
      "picture",
      "iss",
      "exp",
      "iat",
    ],
    grant_types_supported: ["authorization_code", "refresh_token"],
  });
});

app.get("/.well-known/jwks.json", async (_, res) => {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
  return res.json({ keys: [key.toJSON()] });
});

// ── Direct auth (your own app) ───────────────────────────────────────────────

app.get("/o/authenticate", (req, res) => {
  return res.sendFile(path.resolve("public", "authenticate.html"));
});

app.get("/o/authenticate/register", (req, res) => {
  return res.sendFile(path.resolve("public", "signup.html"));
});

app.post("/o/authenticate/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

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

app.post("/o/authenticate/login", async (req, res) => {
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

app.get("/o/userinfo", async (req, res) => {
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

app.post("/o/token", async (req, res) => {
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

app.post("/o/revoke", async (req, res) => {
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

// ── OAuth third-party clients ─────────────────────────────────────────────────

app.post("/o/3rd-party-client/register", async (req, res) => {
  const { name, redirectUris, scopes } = req.body;

  const clientId = crypto.randomBytes(16).toString("hex");
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const hashed_secret = crypto
    .createHash("sha256")
    .update(clientSecret)
    .digest("hex");

  await db.insert(oauthClientsTable).values({
    id: clientId,
    name,
    secret: hashed_secret,
    redirectUris: JSON.stringify(redirectUris),
    scopes: scopes ?? "openid email profile",
  });

  res.json({
    clientId,
    clientSecret,
    message: "keep the clientId and clientSecret safe",
  });
});

// specific routes before /:clientId param route
app.get("/o/3rd-party-client/authorize", async (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;

  if (response_type !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  const [client] = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, client_id as string));

  if (!client) return res.status(400).json({ error: "invalid_client" });

  const allowedUris: string[] = JSON.parse(client.redirectUris);
  if (!allowedUris.includes(redirect_uri as string)) {
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }

  return res.sendFile(path.resolve("public", "consent.html"));
});

app.post("/o/3rd-party-client/authorize", async (req, res) => {
  const { email, password, client_id, redirect_uri, scope, state } = req.body;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !user.salt) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const hash = crypto
    .createHash("sha256")
    .update(password + user.salt)
    .digest("hex");

  if (hash !== user.password) {
    return res.redirect(
      `/o/3rd-party-client/authorize?error=access_denied${state ? `&state=${state}` : ""}`,
    );
  }

  const code = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await db.insert(authCodesTable).values({
    code,
    clientId: client_id,
    userId: user.id,
    redirectUri: redirect_uri,
    scopes: scope ?? "openid",
    expiresAt,
  });

  const url = new URL(redirect_uri as string);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state as string);

  return res.redirect(url.toString());
});

// param route last
app.get("/o/3rd-party-client/:clientId", async (req, res) => {
  const [client] = await db
    .select({ name: oauthClientsTable.name, scopes: oauthClientsTable.scopes })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, req.params.clientId));

  if (!client) return res.status(404).json({ error: "client_not_found" });

  res.json(client);
});

// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`server is listening on http://localhost:${PORT}`);
});
