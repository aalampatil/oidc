import cors from "cors";
import type { RequestHandler } from "express";

export function createProviderCors(allowedOrigins: readonly string[]): RequestHandler {
  const origins = new Set(allowedOrigins);
  const publicMetadata = cors({ origin: "*", methods: ["GET", "OPTIONS"], credentials: false });
  const browserApi = cors({
    origin: (origin, done) => done(null, origin !== undefined && origins.has(origin)),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 600,
  });
  return (req, res, next) => {
    // Authorization is a top-level navigation, not a cross-origin fetch.
    if (req.path === "/o/3rd-party-client/authorize" && req.method !== "POST") return next();
    if (["/.well-known/openid-configuration", "/.well-known/jwks.json"].includes(req.path)) return publicMetadata(req, res, next);
    res.vary("Origin");
    return browserApi(req, res, next);
  };
}
