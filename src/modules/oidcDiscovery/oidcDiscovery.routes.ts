import { Router } from "express";
import express from "express";
import jose from "node-jose";
import { PUBLIC_KEY } from "../../utils/cert";

const app = express();
const PORT = process.env.PORT ?? 8080;
const ISSUER = process.env.ISSUER_URL ?? `http://localhost:${PORT}`;

export const oidcDiscoveryRouter = Router();

oidcDiscoveryRouter.get("/openid-configuration", (req, res) => {
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

oidcDiscoveryRouter.get("/jwks.json", async (_, res) => {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
  return res.json({ keys: [key.toJSON()] });
});
