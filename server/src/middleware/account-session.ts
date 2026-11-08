import type { RequestHandler } from "express";
import JWT from "jsonwebtoken";
import { z } from "zod";
import { PUBLIC_KEY } from "../utils/cert";
import { env } from "../env";

// Account management is available only to first-party sign-in sessions.
// An OIDC client's access token or an ID token cannot manage the account.
export const requireAccountSession: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Sign in to manage your account." });
  }
  try {
    const claims = JWT.verify(header.slice(7), PUBLIC_KEY, {
      algorithms: ["RS256"], issuer: env.ISSUER_URL, audience: "self",
    });
    if (typeof claims === "string" || claims.token_use !== "access" ||
        claims.client_id !== "self" || !z.uuid().safeParse(claims.sub).success) {
      return res.status(401).json({ message: "Invalid account session. Please sign in again." });
    }
    res.locals.accountUserId = claims.sub;
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired or is invalid. Please sign in again." });
  }
};
