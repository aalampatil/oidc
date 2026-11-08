import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import JWT from "jsonwebtoken";
import { loadSigningKeys } from "../src/utils/signing-keys";
import { hashPassword } from "../src/utils/security";

// Run against a local server: bun run scripts/check-demo.ts
const base = process.env.SERVER ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "This check is for a local server only.");
const callback = process.env.DEMO_REDIRECT_URI ?? `${process.env.CLIENT ?? "http://localhost:5173"}/demo/callback`;
const issuer = process.env.ISSUER_URL!;
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
  const discovery = await fetch(`${base}/.well-known/openid-configuration`, { headers: { Origin: new URL(callback).origin } });
  assert.equal(discovery.status, 200);
  assert.equal(discovery.headers.get("access-control-allow-origin"), "*");
  const metadata = await discovery.json() as Record<string, unknown>;
  assert.equal(metadata.issuer, issuer);
  for (const endpoint of ["authorization_endpoint", "token_endpoint", "userinfo_endpoint", "jwks_uri"]) {
    assert.equal(new URL(String(metadata[endpoint])).origin, new URL(issuer).origin);
  }
  assert.equal(metadata.authorization_response_iss_parameter_supported, true);
  console.log("PASS discovery uses the configured public issuer, independently of the local transport");

  const registration = await post<{ clientId: string; clientSecret: string; issuer: string }>("/o/3rd-party-client/register", {
    name: "OIDC Demo Verification", redirectUris: [callback], scopes: "openid email profile",
  });
  assert.equal(registration.response.status, 200, "Client registration");
  clientId = registration.data.clientId;
  assert(clientId && registration.data.clientSecret);
  assert.equal(registration.data.issuer, issuer);
  console.log("PASS client registration");

  const account = await post("/o/authenticate/register", { firstName: "Demo", email, password });
  assert.equal(account.response.status, 201, "Test account registration");
  const unverifiedLogin = await post<{ error: string }>("/o/authenticate/login", { email, password });
  assert.equal(unverifiedLogin.response.status, 403);
  assert.equal(unverifiedLogin.data.error, "email_not_verified");

  // Seed a known challenge only for this generated test account. The HTTP flow
  // then verifies the persisted scrypt hash without sending a real email.
  const otp = "012345";
  const { hash } = await hashPassword(otp);
  const fixtureDb = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await fixtureDb.connect();
  try {
    const seeded = await fixtureDb.query(
      `INSERT INTO email_verifications (user_id, code_hash, expires_at, sent_at, window_started_at)
       SELECT id, $2, NOW() + INTERVAL '10 minutes', NOW(), NOW() FROM users WHERE email = $1
       ON CONFLICT (user_id) DO UPDATE SET code_hash = EXCLUDED.code_hash,
         expires_at = EXCLUDED.expires_at, attempts = 0`, [email, hash],
    );
    assert.equal(seeded.rowCount, 1);
  } finally { await fixtureDb.end(); }
  assert.equal((await post("/o/authenticate/email-verification/verify", { email, code: "999999" })).response.status, 400);
  assert.equal((await post("/o/authenticate/email-verification/verify", { email, code: otp })).response.status, 200);
  assert.equal((await post("/o/authenticate/email-verification/verify", { email, code: otp })).response.status, 400);
  assert.equal((await post("/o/authenticate/login", { email, password })).response.status, 200);
  console.log("PASS unverified login is blocked; OTP verification enables login and rejects replay");
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");
  const request = {
    client_id: clientId, redirect_uri: callback, response_type: "code",
    scope: "openid email profile", state, nonce,
    code_challenge: challenge, code_challenge_method: "S256",
  };
  const unregisteredCallback = new URL(callback);
  unregisteredCallback.port = unregisteredCallback.port === "3000" ? "3001" : "3000";
  const wrongRedirect = await fetch(`${base}/o/3rd-party-client/authorize?${new URLSearchParams({ ...request, redirect_uri: unregisteredCallback.toString() })}`, { redirect: "manual" });
  assert.equal(wrongRedirect.status, 400);
  assert.equal(wrongRedirect.headers.get("location"), null);
  const wrongClient = await fetch(`${base}/o/3rd-party-client/authorize?${new URLSearchParams({ ...request, client_id: crypto.randomUUID() })}`, { redirect: "manual" });
  assert.equal(wrongClient.status, 400);
  console.log("PASS unregistered localhost ports and unknown credentials are rejected");
  const authorization = await fetch(`${base}/o/3rd-party-client/authorize?${new URLSearchParams(request)}`, { redirect: "manual" });
  assert.equal(authorization.status, 302);
  const consentUrl = new URL(authorization.headers.get("location")!);
  assert.equal(consentUrl.pathname, "/consent");
  assert.equal(consentUrl.origin, new URL(process.env.CONSENT_UI_URL ?? process.env.CLIENT!).origin);
  assert.equal(consentUrl.searchParams.get("state"), state);
  console.log("PASS authorization redirect and state");

  const consent = await post<{ redirect_url: string }>("/o/3rd-party-client/authorize", { ...request, email, password });
  assert.equal(consent.response.status, 200);
  const result = new URL(consent.data.redirect_url);
  assert.equal(result.searchParams.get("state"), state);
  assert.equal(result.searchParams.get("iss"), issuer);
  assert.equal(`${result.origin}${result.pathname}`, callback);
  assert(result.searchParams.get("code"));
  console.log("PASS consent and callback");

  const tokenRequest = {
    grant_type: "authorization_code", client_id: clientId,
    client_secret: registration.data.clientSecret, code: result.searchParams.get("code"),
    redirect_uri: callback, code_verifier: verifier,
  };
  const invalidVerifier = await post("/o/token", { ...tokenRequest, code_verifier: crypto.randomBytes(48).toString("base64url") });
  assert.equal(invalidVerifier.response.status, 400);
  const invalidSecret = await post("/o/token", { ...tokenRequest, client_secret: crypto.randomBytes(32).toString("hex") });
  assert.equal(invalidSecret.response.status, 401);
  const invalidRedirect = await post("/o/token", { ...tokenRequest, redirect_uri: unregisteredCallback.toString() });
  assert.equal(invalidRedirect.response.status, 400);
  console.log("PASS token exchange is bound to the secret, exact callback, and PKCE verifier");
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
    await database.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [email]);
    await database.query("DELETE FROM users WHERE email = $1", [email]);
    await database.query("COMMIT");
    console.log("Removed verification data.");
  } catch (error) {
    await database.query("ROLLBACK");
    throw error;
  } finally { await database.end(); }
}
