import crypto from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { authCodesTable, oauthClientsTable, usersTable } from "../../db/schema";
import { Router } from "express";

export const thirdPartyRouter = Router();

// ── OAuth third-party clients ─────────────────────────────────────────────────

// this is trust form which client will fill and he will get his clientId and client secret
thirdPartyRouter.post("/register", async (req, res) => {
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
    message: "keep the clientId and clientSecret safe",
  });
});

// this is the route which will come from client application backend, then we will verify client cred if it got verified we will redirect it to the consent screen

// Get - http://localhost:3000/o/3rd-party-client/authorize?client_id=fb7450680124ba1b6835a9809b4ceae9&redirect_uri=https://x.com&response_type=code&scope=&state
thirdPartyRouter.get("/authorize", async (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;
  console.table([client_id, redirect_uri, scope, state, response_type]);

  if (response_type !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  const client = await db
    .select()
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, client_id as string))
    .limit(1)
    .then((rows) => rows[0]);

  if (!client) return res.status(400).json({ error: "invalid_client" });

  const allowedUris: string = JSON.parse(client.redirectUris);
  if (!allowedUris.includes(redirect_uri as string)) {
    return res.status(400).json({ error: "invalid_redirect_uri" });
  }

  return res.redirect(
    `http://localhost:5173/consent?app=${client.name}&client_id=${client.id}&redirect_uri=${encodeURIComponent(allowedUris)}&response_type=code`,
  );
  // instead of sendfile, i should redirect this to front end with along with the cliend id and redirec uri, scope and state
});

thirdPartyRouter.post("/authorize", async (req, res) => {
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

  const cleanRedirectUri = redirect_uri.replace(/^"+|"+$/g, "");
  // const url = new URL(cleanRedirectUri)
  const url = new URL(cleanRedirectUri as string);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state as string);

  return res.json({
    redirect_url: url.toString(),
  });
});

// param route last
thirdPartyRouter.get("/:clientId", async (req, res) => {
  console.log(req.params);
  const [client] = await db
    .select({ name: oauthClientsTable.name, scopes: oauthClientsTable.scopes })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.id, req.params.clientId));

  if (!client) return res.status(404).json({ error: "client_not_found" });

  res.json(client);
});

// ─────────────────────────────────────────────────────────────────────────────
