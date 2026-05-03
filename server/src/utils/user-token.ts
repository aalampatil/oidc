export interface JWTClaims {
  iss: string;
  aud: string;
  sub: string;
  client_id?: string;
  scope?: string;
  token_use?: "access" | "id";
  jti?: string;
  email?: string;
  email_verified?: string;
  exp: number;
  family_name?: string;
  given_name?: string;
  name?: string;
  picture?: string;
  nonce?: string;
}
