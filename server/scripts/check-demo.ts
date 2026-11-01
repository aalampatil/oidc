import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import JWT from "jsonwebtoken";
import { loadSigningKeys } from "../src/utils/signing-keys";

// Run against a local server: bun run scripts/check-demo.ts
const base = process.env.SERVER ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "This check is for a local server only.");
const callback = `${process.env.CLIENT ?? "http://localhost:5173"}/demo/callback`;
const email = `demo-check-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomBytes(24).toString("hex");
let clientId: string | undefined;

async function post<T = unknown>(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  assert(response.headers.get("content-type")?.includes("application/json"), `${path} must return JSON`);
  return { response, data: await response.json() as T };
}

try {
  const registration = await post<{ clientId: string; clientSecret: string }>("/o/3rd-party-client/register", {
    name: "OIDC Demo Verification", redirectUris: [callback], scopes: "openid email profile",
  });
  assert.equal(registration.response.status, 200, "Client registration");
  clientId = registration.data.clientId;
  assert(clientId && registration.data.clientSecret);
  console.log("PASS client registration");

  const account = await post("/o/authenticate/register", { firstName: "Demo", email, password });
  assert.equal(account.response.status, 201, "Test account registration");
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");
  const request = {
    client_id: clientId, redirect_uri: callback, response_type: "code",
    scope: "openid email profile", state, nonce,
    code_challenge: challenge, code_challenge_method: "S256",
  };
  const authorization = await fetch(`${base}/o/3rd-party-client/authorize?${new URLSearchParams(request)}`, { redirect: "manual" });
  assert.equal(authorization.status, 302);
  const consentUrl = new URL(authorization.headers.get("location")!);
  assert.equal(consentUrl.pathname, "/consent");
  assert.equal(consentUrl.searchParams.get("state"), state);
  console.log("PASS authorization redirect and state");

  const consent = await post<{ redirect_url: string }>("/o/3rd-party-client/authorize", { ...request, email, password });
  assert.equal(consent.response.status, 200);
  const result = new URL(consent.data.redirect_url);
  assert.equal(result.searchParams.get("state"), state);
  assert.equal(`${result.origin}${result.pathname}`, callback);
  assert(result.searchParams.get("code"));
  console.log("PASS consent and callback");

  const tokenRequest = {
    grant_type: "authorization_code", client_id: clientId,
    client_secret: registration.data.clientSecret, code: result.searchParams.get("code"),
    redirect_uri: callback, code_verifier: verifier,
  };
  const tokens = await post<{ access_token: string; id_token: string; refresh_token: string }>("/o/token", tokenRequest);
  assert.equal(tokens.response.status, 200, "PKCE token exchange");
  assert(tokens.data.access_token && tokens.data.id_token && tokens.data.refresh_token);
  const { publicKey } = loadSigningKeys(process.env.PRIVATE_KEY!, process.env.PUBLIC_KEY!);
  const claims = JWT.verify(tokens.data.id_token, publicKey, {
    algorithms: ["RS256"], audience: clientId, issuer: process.env.ISSUER_URL,
  });
  assert(typeof claims === "object" && claims.nonce === nonce);
  console.log("PASS PKCE exchange, token signature, audience, issuer, and nonce");

  const userinfo = await fetch(`${base}/o/userinfo`, { headers: { Authorization: `Bearer ${tokens.data.access_token}` } });
  assert.equal(userinfo.status, 200);
  assert.equal((await userinfo.json() as { email: string }).email, email);
  console.log("PASS authenticated UserInfo");
  assert.equal((await post("/o/token", tokenRequest)).response.status, 400);
  console.log("PASS authorization code cannot be exchanged twice");
} finally {
  const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await database.connect();
  try {
    await database.query("BEGIN");
    if (clientId) {
      await database.query("DELETE FROM refresh_tokens WHERE client_id = $1", [clientId]);
      await database.query("DELETE FROM auth_codes WHERE client_id = $1", [clientId]);
      await database.query("DELETE FROM oauth_clients WHERE id = $1", [clientId]);
    }
    await database.query("DELETE FROM users WHERE email = $1", [email]);
    await database.query("COMMIT");
    console.log("Removed verification data.");
  } catch (error) {
    await database.query("ROLLBACK");
    throw error;
  } finally { await database.end(); }
}
