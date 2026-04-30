import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import JWT from "jsonwebtoken";
import type { Request, Response } from "express";
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

export class OidcController {
  register = async (req: Request, res: Response) => {
    const { firstName, lastName, email, password } = req.body;

    if (!email || !password || !firstName) {
      return res
        .status(400)
        .json({ message: "First name, email, and password are required." });
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
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

    return res.status(201).json({ ok: true });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.password || !user.salt) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const hash = crypto
      .createHash("sha256")
      .update(password + user.salt)
      .digest("hex");

    if (hash !== user.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const accessToken = signAccessToken(user.id);
    const idToken = signIdToken(user, "self");
    const refreshToken = await createRefreshToken(user.id, null);

    return res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    });
  };

  userinfo = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header." });
    }

    const token = authHeader.slice(7);
    let claims: JWTClaims;

    try {
      claims = JWT.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"],
      }) as JWTClaims;
    } catch {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, claims.sub));

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      given_name: user.firstName,
      family_name: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      picture: user.profileImageURL,
    });
  };

  token = async (req: Request, res: Response) => {
    const { grant_type, client_id, client_secret } = req.body;

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

    if (grant_type === "authorization_code") {
      return this.handleAuthorizationCode(req, res, client_id);
    }

    if (grant_type === "refresh_token") {
      return this.handleRefreshToken(req, res, client_id);
    }

    return res.status(400).json({ error: "unsupported_grant_type" });
  };

  private handleAuthorizationCode = async (
    req: Request,
    res: Response,
    client_id: string,
  ) => {
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
  };

  private handleRefreshToken = async (
    req: Request,
    res: Response,
    client_id: string,
  ) => {
    const { refresh_token } = req.body;

    const [stored] = await db
      .select()
      .from(refreshTokensTable)
      .where(eq(refreshTokensTable.token, refresh_token));

    if (!stored || stored.used || new Date() > stored.expiresAt) {
      return res.status(400).json({ error: "invalid_grant" });
    }

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
  };

  revoke = async (req: Request, res: Response) => {
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

    return res.json({ ok: true });
  };
}
