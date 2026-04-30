import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { db } from "../../db/index";
import { authCodesTable, oauthClientsTable, usersTable } from "../../db/schema";
import { env } from "../../env";

export class ThirdPartyController {
  register = async (req: Request, res: Response) => {
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

    return res.json({
      clientId,
      clientSecret,
      message: "keep the clientId and clientSecret safe",
    });
  };

  getAuthorize = async (req: Request, res: Response) => {
    const { client_id, redirect_uri, scope, state, response_type } = req.query;

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

    const allowedUris: string[] = JSON.parse(client.redirectUris);
    if (!allowedUris.includes(redirect_uri as string)) {
      return res.status(400).json({ error: "invalid_redirect_uri" });
    }

    const redirectUri = allowedUris[0];
    if (!redirectUri) {
      return res.status(400).json({ error: "invalid_redirect_uri" });
    }

    const params = new URLSearchParams();
    params.set("app", client.name);
    params.set("client_id", client.id);
    params.set("redirect_uri", redirectUri);
    params.set("response_type", "code");
    if (scope) params.set("scope", scope as string);
    if (state) params.set("state", state as string);

    return res.redirect(`${env.CLIENT}/consent?${params.toString()}`);
  };

  postAuthorize = async (req: Request, res: Response) => {
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
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const code = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
