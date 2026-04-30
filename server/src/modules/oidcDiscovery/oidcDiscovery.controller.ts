import type { Request, Response } from "express";
import jose from "node-jose";
import { PUBLIC_KEY } from "../../utils/cert";
import { env } from "../../env";

const ISSUER = env.ISSUER_URL ?? env.SERVER;

export class OidcDiscoveryController {
  openidConfiguration = (_req: Request, res: Response) => {
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
  };

  jwks = async (_req: Request, res: Response) => {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
    return res.json({ keys: [key.toJSON()] });
  };
}
