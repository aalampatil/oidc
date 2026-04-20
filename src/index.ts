import crypto from "node:crypto";
import express from "express";
import path from "node:path";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import jose from "node-jose";
import { db } from "./db";
import { authCodesTable, oauthClientsTable, usersTable } from "./db/schema";
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert";
import type { JWTClaims } from "./utils/user-token";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ?? 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.json({ message: "Hello from Auth Server" }));

app.get("/health", (req, res) =>
  res.json({ message: "Server is healthy", healthy: true }),
);

//#region
// OIDC Endpoints
app.get("/.well-known/openid-configuration", (req, res) => {
  const ISSUER = `http://localhost:${PORT}`;
  return res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/o/authenticate`,
    userinfo_endpoint: `${ISSUER}/o/userinfo`,
    token_endpoint: `${ISSUER}/o/token`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  });
});

app.get("/.well-known/jwks.json", async (_, res) => {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
  console.log(key);
  return res.json({ keys: [key.toJSON()] });
});

app.get("/o/authenticate", (req, res) => {
  return res.sendFile(path.resolve("public", "authenticate.html"));
});

app.get("/o/authenticate/register", (req, res) => {
  return res.sendFile(path.resolve("public", "signup.html"));
});

app.post("/o/token", async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }

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

  const token = JWT.sign(
    {
      sub: user.id,
      email: user.email,
      email_verified: String(user.emailVerified),
      given_name: user.firstName ?? "",
      family_name: user.lastName ?? undefined,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      picture: user.profileImageURL ?? undefined,
    },
    PRIVATE_KEY,
    { algorithm: "RS256", expiresIn: "1h" },
  );
  // console.log(token);

  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: 3600,
    scope: authCode.scopes,
  });
});

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
  } catch (error) {
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
  // console.log("i", email, password);

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

  const ISSUER = `http://localhost:${PORT}`;
  const now = Math.floor(Date.now() / 1000);

  const claims: JWTClaims = {
    iss: ISSUER,
    sub: user.id,
    email: user.email,
    email_verified: String(user.emailVerified),
    exp: now + 3600, // 1 minute
    given_name: user.firstName ?? "",
    family_name: user.lastName ?? undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
    picture: user.profileImageURL ?? undefined,
  };

  const token = JWT.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
  // console.log(token);

  res.json({ token });
});
//#endregion

//#region
// oAuth registeration

app.post("/o/3rd-party-client/register", async (req, res) => {
  const { name, redirectUris, scopes } = req.body;
  console.log(name, redirectUris, scopes);

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
    message: "keep the clientid and clientSecret safe",
  });
});

// ye vo vali route hai jaise sign-in with google ka button hota hai, jaise hi click krte hai ek page pe redirect ho jaate hai, toh ye route vahi page pe le jaati hai user ko, ab isme queries aayngi,un query ke basis pe client ko verify krke, consent screen pe redirect kr denge
app.get("/o/3rd-party-client/authorize", async (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;
  if (response_type !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  const [client] = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, client_id as string));

  if (!client) return res.status(400).json({ error: "invalid client" });

  const allowedUris = JSON.parse(client?.redirectUris);

  if (!allowedUris.includes(redirect_uri)) {
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
    .update(password + user?.salt)
    .digest("hex");

  if (hash !== user.password) {
    return res.redirect(
      `/o/3rd-party-client/authorize?error=access_denied${state ? `&state=${state}` : ""}`,
    ); //todo:  handle error
  }

  const code = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

  await db.insert(authCodesTable).values({
    code,
    clientId: client_id,
    userId: user.id,
    redirectUri: redirect_uri,
    scopes: scope ?? "open id",
    expiresAt,
  });

  const url = new URL(redirect_uri as string);
  url.searchParams.set("code", code);

  if (state) url.searchParams.set("state", state as string);

  return res.redirect(url.toString());
});

app.get("/o/3rd-party-client/:clientId", async (req, res) => {
  const [client] = await db
    .select({ name: oauthClientsTable.name, scopes: oauthClientsTable.scopes })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, req.params.clientId));

  if (!client) return res.status(404).json({ error: "client_not_found" });

  res.json(client);
});

//#endregion

app.listen(PORT, () => {
  console.log(`server is listening on http://localhost:${PORT}`);
});
