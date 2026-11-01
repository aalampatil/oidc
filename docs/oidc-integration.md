# Integrating local and production applications

An application running at `http://localhost:3000` can authenticate against a provider at `https://auth.example.com`. The application and provider do not need to run in the same environment.

The application must use that provider's issuer, registration, authorization endpoint, token endpoint, and signing keys throughout the flow. Credentials registered with a production provider do not automatically exist in a separate local provider's database. Do not copy production databases or signing keys to a developer machine to bypass that isolation.

## Provider configuration

Configure the deployed provider with its externally visible URLs:

```env
NODE_ENV=production
PORT=3000
ISSUER_URL=https://auth.example.com
CONSENT_UI_URL=https://identity.example.com
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/oidc_auth
PRIVATE_KEY=YOUR_PRIVATE_KEY
PUBLIC_KEY=YOUR_PUBLIC_KEY
# Optional: additional exact browser origins, comma-separated.
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

`CONSENT_UI_URL` is the provider's own hosted sign-in and consent application. It is not the integrating application's callback. The provider redirects users to `${CONSENT_UI_URL}/consent`; after approval, the browser navigates to the client's registered callback.

The legacy `CLIENT` variable remains an alias for `CONSENT_UI_URL`. `SERVER` is retained for compatibility with local scripts; it does not select an issuer or override discovery. New deployments should set the explicit variables above.

The issuer in discovery and signed tokens is exactly `ISSUER_URL`. Endpoint paths are appended without introducing duplicate slashes. Clients must configure the same exact issuer, including any trailing slash. If the public issuer includes a path prefix, the reverse proxy must route that prefix to the provider's root routes. Configure the public HTTPS URL even when TLS terminates at a reverse proxy and the internal server listens on HTTP. Request `Host` and forwarded headers never select the issuer or consent destination.

Production issuer and consent URLs must use HTTPS. For a locally hosted provider, development mode permits HTTP on `localhost`, `127.0.0.1`, and `[::1]`. This provider-side restriction does not prevent a production provider from accepting explicitly registered HTTP loopback callbacks.

The hosted UI uses:

```env
VITE_API_BASE_URL=https://auth.example.com
```

Vite variables are applied at build time; rebuild the hosted UI when changing the issuer. Restart the API after changing runtime configuration.

## Register the local application with the production provider

Register through the production provider's trust form or registration API. Use a separate registration for local development so its credentials and permissions can be managed independently from your live application:

```http
POST https://auth.example.com/o/3rd-party-client/register
Content-Type: application/json

{
  "name": "My application — local development",
  "redirectUris": ["http://localhost:3000/auth/callback"],
  "scopes": "openid email profile"
}
```

The response includes `clientId`, `clientSecret`, `issuer`, and `tokenEndpointAuthMethod: "client_secret_post"`. Keep the secret on the integrating application's backend. The trust form displays it at creation time; the UI saves only registration metadata, not client secrets, to persistent browser storage.

You may explicitly register both local and HTTPS callbacks under one client, but separate registrations are recommended. Register every exact port and path. `http://localhost:3000/auth/callback`, `http://127.0.0.1:3000/auth/callback`, and `http://localhost:3001/auth/callback` are different callbacks. This implementation supports web clients with fixed registered callback ports; it does not implement the variable-port exception for native applications.

HTTP callbacks are limited to loopback hosts. Non-loopback HTTP URLs, URL credentials, fragments, control characters, and wildcard hosts are rejected. Matching remains exact at authorization and token exchange; no wildcard or environment-based bypass is introduced.

## Configure the integrating application

Use server-side environment variables in the local application:

```env
OIDC_ISSUER_URL=https://auth.example.com
OIDC_CLIENT_ID=CLIENT_ID_FROM_THIS_PROVIDER
OIDC_CLIENT_SECRET=CLIENT_SECRET_FROM_THIS_PROVIDER
OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
```

For the live version of that application, change only its configuration:

```env
OIDC_ISSUER_URL=https://auth.example.com
OIDC_CLIENT_ID=SEPARATE_LIVE_CLIENT_ID
OIDC_CLIENT_SECRET=SEPARATE_LIVE_CLIENT_SECRET
OIDC_REDIRECT_URI=https://app.example.com/auth/callback
```

These `OIDC_*` names are example settings for the integrating application, not additional provider settings. Never place the secret in a `VITE_*`, `NEXT_PUBLIC_*`, or other browser-exposed variable.

Use an OIDC client library on the application's backend and configure it from these settings. Discover metadata at `https://auth.example.com/.well-known/openid-configuration`; verify its `issuer` equals the configured issuer exactly. Do not build production token URLs from the local application's origin.

1. Create an unpredictable `state`, `nonce`, and PKCE verifier. Keep them in a short-lived server-side login transaction associated with the initiating browser.
2. Redirect the browser to the discovered authorization endpoint with `response_type=code`, `client_id`, the exact `redirect_uri`, scopes including `openid`, `state`, `nonce`, and an S256 `code_challenge`.
3. The user authenticates on the hosted provider UI. Approval navigates the browser back to the local callback. The browser, rather than the production server, connects to localhost.
4. At the callback, validate the login transaction and `state`. This provider returns `iss` as well; verify it against the expected issuer. Reject mismatches before exchanging the code.
5. From the local backend, POST a form-encoded or JSON request to the discovered token endpoint using `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, the same `redirect_uri`, and the original `code_verifier`.
6. Verify the ID token's RS256 signature against the discovered JWKS, exact issuer, audience/client ID, expiry, and nonce. Establish the application's own session only after validation. Use the access token for UserInfo, not the ID token.

All authentication requests stay with the production provider. Do not exchange a production authorization code at a local provider or verify its ID token using a local provider's keys.

## CORS and cookies

Top-level authorization redirects and server-to-server token requests do not require CORS. The usual confidential web-client integration above works without adding the local application to `CORS_ALLOWED_ORIGINS`.

If a browser directly calls the provider's API, its exact origin must be listed in `CORS_ALLOWED_ORIGINS`; the provider UI origin is included automatically. This is an explicit administrator-controlled allowlist, independent of redirect registration. Registering a callback does not automatically authorize its browser origin. No localhost origin or port is automatically trusted in production.

Discovery and JWKS are public and use wildcard CORS without credentials. The authorization GET endpoint has no CORS headers because clients must navigate there. Browser API preflights permit `GET`, `POST`, `OPTIONS`, `Content-Type`, and `Authorization` only for the configured origins. Cookie credentials are not enabled. CORS controls browser access to responses; it is not client authentication and does not stop non-browser requests.

The provider currently authenticates hosted consent using submitted credentials and bearer tokens; it does not use a cross-site login cookie. No `SameSite=None` or insecure-cookie change is needed for this flow. The integrating application should use its own HttpOnly, SameSite=Lax login/session cookie so a top-level GET callback can recover the login transaction. Use Secure cookies on HTTPS deployments and a loopback-only development configuration for HTTP localhost. State and PKCE checks remain required.

The built-in browser demo exercises endpoints and temporarily keeps its demo flow in session storage. It is illustrative, not a production confidential-client template. Production applications must exchange and validate tokens on their own backend.

## Switching the provider UI between issuers

Set `VITE_API_BASE_URL` and restart the Vite dev server, or rebuild the deployed UI. A local issuer is the default only in development. Vite validates the issuer before building production assets, so a missing or malformed value cannot silently become a successful blank-page deployment. Configure it in the hosting platform's production environment too; ignored local env files are not part of Git-based deployments.

Auth state, saved registration metadata, and demo transactions now use issuer-specific storage keys. Old unscoped browser state is intentionally not imported because its issuer cannot be established safely. Sign in again and register or securely record clients against the intended provider. Existing provider database rows, credentials, and signing keys are unchanged; no database migration is needed for this refactor.

## Troubleshooting

| Failure | Check |
| --- | --- |
| `invalid_client` | Were these credentials registered in the database of the issuer being called? Is the original secret sent from the backend? |
| `invalid_redirect_uri` | Is the full callback, including scheme, hostname, port, path, and query, registered exactly? |
| `invalid_grant` | Is the code fresh and unused, with the same callback and PKCE verifier? |
| Issuer or signature mismatch | Do discovery, authorization, token exchange, JWKS, and ID-token verification all use the same provider? |
| Browser CORS failure | Is this an API fetch rather than navigation? Add the exact browser origin only if direct browser API access is intended. |
| Consent opens localhost in production | Set the provider's `CONSENT_UI_URL` to its hosted UI and rebuild that UI with the production API URL. |
| Local callback never opens | Ensure the local app is listening on the registered port and the authorization flow uses a browser redirect. |

## Verification

From `server/`:

```bash
bun test src
bun run build
bun run test:integration
```

The integration check starts a separate local provider process with production configuration (`https://auth.example.test` issuer and `https://identity.example.test` consent UI), while the client callback remains `http://localhost:3000/auth/callback`. It uses the configured local database and keys, creates its own unique verification records, and removes those records afterward. It verifies discovery, CORS, registration, authorization, callback state/issuer, PKCE, token signature/audience/issuer/nonce, UserInfo, and rejection cases. It simulates TLS termination through a local transport; it does not test public DNS, certificates, reverse-proxy routing, a browser, or the live deployment.

From `client/`, run `bun test tests` and `npm run build`.

## References

- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [OAuth Security Best Current Practice, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
- [Authorization Server Issuer Identification, RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html)
