import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db/index";
import { authCodesTable, oauthClientsTable, usersTable } from "../../db/schema";
import { env } from "../../env";
import { verifyPassword } from "../../utils/security";
import {
  normalizeScopes,
  validateClientName,
  validateCodeChallenge,
  validateRedirectUri,
  validateScopes,
} from "../../utils/oidc";

export class ThirdPartyController {
  register = async (req: Request, res: Response) => {
    const { name, redirectUris, scopes } = req.body;

    if (!validateClientName(name) || !Array.isArray(redirectUris)) {
      return res.status(400).json({ error: "invalid_client_metadata" });
    }

    const uniqueRedirectUris = Array.from(new Set(redirectUris));
    if (
      uniqueRedirectUris.length === 0 ||
      uniqueRedirectUris.length > 10 ||
      !uniqueRedirectUris.every(validateRedirectUri)
    ) {
      return res.status(400).json({ error: "invalid_redirect_uris" });
    }

    const normalizedScopes = normalizeScopes(scopes);
    const scopeResult = validateScopes(normalizedScopes, "openid email profile");
    if (!scopeResult.ok) {
      return res.status(400).json({ error: scopeResult.error });
    }

    const clientId = crypto.randomBytes(16).toString("hex");
    const clientSecret = crypto.randomBytes(32).toString("hex");
    const hashed_secret = crypto
      .createHash("sha256")
      .update(clientSecret)
      .digest("hex");

    await db.insert(oauthClientsTable).values({
      id: clientId,
      name: name.trim(),
      secret: hashed_secret,
      redirectUris: JSON.stringify(uniqueRedirectUris),
      scopes: scopeResult.scope,
    });

    return res.json({
      clientId,
      clientSecret,
      message: "keep the clientId and clientSecret safe",
    });
  };

  getAuthorize = async (req: Request, res: Response) => {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      response_type,
      code_challenge,
      code_challenge_method,
      nonce,
    } = req.query;

    if (response_type !== "code") {
      return res.status(400).json({ error: "unsupported_response_type" });
    }

    if (
      typeof client_id !== "string" ||
      typeof redirect_uri !== "string" ||
      !validateRedirectUri(redirect_uri) ||
      !validateCodeChallenge(code_challenge, code_challenge_method)
    ) {
      return res.status(400).json({ error: "invalid_request" });
    }

    const client = await db
      .select()
      .from(oauthClientsTable)
      .where(eq(oauthClientsTable.id, client_id))
      .limit(1)
      .then((rows) => rows[0]);

    if (!client) return res.status(400).json({ error: "invalid_client" });

    const allowedUris: string[] = JSON.parse(client.redirectUris);
    if (!allowedUris.includes(redirect_uri)) {
      return res.status(400).json({ error: "invalid_redirect_uri" });
    }

    const scopeResult = validateScopes(scope as string | undefined, client.scopes);
    if (!scopeResult.ok) {
      return res.status(400).json({ error: scopeResult.error });
    }

    const params = new URLSearchParams();
    params.set("app", client.name);
    params.set("client_id", client.id);
    params.set("redirect_uri", redirect_uri);
    params.set("response_type", "code");
    params.set("scope", scopeResult.scope);
    params.set("code_challenge", code_challenge as string);
    params.set("code_challenge_method", "S256");
    if (typeof nonce === "string") params.set("nonce", nonce);
    if (typeof state === "string") params.set("state", state);

    return res.redirect(`${env.CLIENT}/consent?${params.toString()}`);
  };

  postAuthorize = async (req: Request, res: Response) => {
    const {
      email,
      password,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
    } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof client_id !== "string" ||
      typeof redirect_uri !== "string" ||
      !validateRedirectUri(redirect_uri) ||
      !validateCodeChallenge(code_challenge, code_challenge_method)
    ) {
      return res.status(400).json({ error: "invalid_request" });
    }

    const [client] = await db
      .select()
      .from(oauthClientsTable)
      .where(eq(oauthClientsTable.id, client_id))
      .limit(1);

    if (!client) return res.status(400).json({ error: "invalid_client" });

    const allowedUris: string[] = JSON.parse(client.redirectUris);
    if (!allowedUris.includes(redirect_uri)) {
      return res.status(400).json({ error: "invalid_redirect_uri" });
    }

    const scopeResult = validateScopes(scope, client.scopes);
    if (!scopeResult.ok) {
      return res.status(400).json({ error: scopeResult.error });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.salt) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!user.password || !(await verifyPassword(password, user.password, user.salt))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const code = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(authCodesTable).values({
      code,
      clientId: client_id,
      userId: user.id,
      redirectUri: redirect_uri,
      scopes: scopeResult.scope,
      codeChallenge: code_challenge,
      codeChallengeMethod: "S256",
      nonce: typeof nonce === "string" ? nonce : null,
      expiresAt,
    });

    const url = new URL(redirect_uri as string);
    url.searchParams.set("code", code);
    if (typeof state === "string") url.searchParams.set("state", state);

    return res.json({ redirect_url: url.toString() });
  };

  getClient = async (req: Request, res: Response) => {
    const [client] = await db
      .select({
        name: oauthClientsTable.name,
        scopes: oauthClientsTable.scopes,
      })
      .from(oauthClientsTable)
      .where(eq(oauthClientsTable.id, req.params.clientId as string));

    if (!client) return res.status(404).json({ error: "client_not_found" });

    return res.json(client);
  };
}
