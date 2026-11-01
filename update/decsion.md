# OIDC cross-environment integration — decision log

Date: 2026-11-01

## Reported issue

Local applications worked with a local OIDC provider, and deployed applications worked with the deployed provider. Using production credentials against the local provider failed. The desired integration is a localhost application authenticating against the production provider with explicitly registered localhost callbacks, without weakening production security.

## Findings

1. Client IDs and hashed secrets are looked up in the selected provider's PostgreSQL database. Independent local and production providers do not share registrations. Rejecting an unknown production client at a local provider is correct isolation, not a redirect or CORS bug.
2. The correct flow is local application → production issuer → hosted consent UI → registered localhost callback → production token endpoint. The browser follows the callback to localhost; the production server does not connect to the developer machine.
3. `ISSUER_URL`, `CLIENT`, and `SERVER` were unvalidated strings with unclear responsibilities. `CLIENT` selected the hosted consent UI but could be mistaken for the integrating application's URL. Discovery and signed tokens already used `ISSUER_URL`; that authoritative source is retained.
4. CORS trusted fixed localhost ports 5173 and 5174. It did not support other intentional browser origins through configuration, and it applied globally to authorization navigation as well as APIs.
5. HTTP localhost callbacks were already supported, but IPv6 loopback used `::1` while URL parsing returns `[::1]`. URL validation also accepted credentials and did not explicitly reject wildcard hosts, control characters, or empty fragments.
6. Authorization codes already used exact redirect matching, client binding, single-use consumption, expiry, and PKCE verification. These checks did not need an environment bypass.
7. Frontend auth, registration, and demo storage used the same keys regardless of provider. Switching API configuration could therefore reuse tokens, metadata, or demo credentials belonging to another issuer. Production UI configuration could also silently fall back to localhost.
8. Registration secrets were persisted and redisplayed from browser local storage, despite the UI describing them as visible once. The built-in browser demo is educational and is not a secure production confidential-client integration pattern.
9. The provider uses submitted credentials and bearer tokens, not cross-site session cookies. Weakening SameSite or enabling credentialed wildcard CORS would not solve this issue.

## Decisions

| Decision | Reason |
| --- | --- |
| Keep one explicit public issuer per provider | Discovery, token signing, and token verification must identify the same issuer. Request host headers and local callback URLs must not change it. |
| Add `CONSENT_UI_URL`, with `CLIENT` retained as an alias | Distinguishes the provider's hosted UI from a third-party callback without immediately breaking existing configuration. |
| Require HTTPS provider URLs in production | Supports TLS termination using the public URL without trusting arbitrary forwarded hosts. |
| Keep credentials scoped to the provider database | Production credentials must not be silently accepted by an independent development provider. |
| Allow explicitly registered HTTP loopback callbacks | Enables local clients using a production issuer while retaining HTTPS for other hosts. |
| Preserve exact redirect matching and fixed ports | Avoids introducing open redirects, wildcard callbacks, or a native-app variable-port exception into the web-client implementation. |
| Replace hardcoded CORS origins with an exact allowlist | Direct browser API access is intentional; registering a callback does not automatically grant browser API access. |
| Expose public discovery/JWKS with non-credentialed CORS | Allows metadata and signing-key discovery without exposing private state. Authorization remains a navigation. |
| Include `iss` in authorization responses | Clients can bind callbacks to the expected issuer and detect provider mix-ups before sending secrets. |
| Isolate browser storage by exact issuer | Prevents accidental reuse of tokens or registration metadata when changing provider configuration. |
| Stop persisting registration secrets | Persistent browser storage should contain registration metadata, not confidential-client secrets. |
| Recommend backend OIDC integration and separate development registrations | Keeps secrets and token verification server-side and limits credential sharing between development and live applications. |

## Changes made

### Provider

- Added `server/src/provider-config.ts` for validated issuer, consent UI, port, production HTTPS policy, and CORS origin configuration.
- Added `server/src/utils/url-policy.ts` and strengthened redirect validation, including IPv6 loopback support.
- Added `server/src/utils/http-cors.ts`; the hosted UI origin is trusted automatically, extra browser origins require `CORS_ALLOWED_ORIGINS`, and no local ports are implicitly trusted.
- Kept discovery metadata tied to the configured public issuer and avoided duplicate slashes when constructing endpoints.
- Added issuer and token endpoint authentication metadata to registration responses.
- Redirected hosted consent using `CONSENT_UI_URL`; included `iss` in successful authorization callbacks and advertised issuer-response support in discovery.
- Restricted S256 challenges to the actual SHA-256 base64url length and character set.
- Added `test` and `test:integration` commands, configuration/URL/CORS regressions, and an isolated production-style integration fixture.

### Provider UI

- Added `client/src/lib/providerConfig.ts` to validate provider configuration and generate issuer-specific storage keys.
- Removed the production fallback to localhost; existing explicit `VITE_API_BASE_URL` remains supported.
- Bound demo sessions and callback checks to the selected issuer before token exchange.
- Scoped persisted authentication and registration metadata by issuer; intentionally did not import old unscoped data whose issuer cannot be established.
- Removed persistent registration secrets and token logging; account cards now show the registration's issuer.
- Made registration accept callbacks separated by commas or newlines and explained exact localhost callback rules.
- Added a cross-environment section to the UI documentation page.

### Documentation

- Added `docs/oidc-integration.md` with provider and integrating-client examples, the full backend flow, CORS/cookie guidance, security boundaries, troubleshooting, and rollout notes.
- Updated both example environment files and READMEs.
- Added this log at the requested path, `update/decsion.md`.

## Verification

- Provider unit/regression tests: 37 passed, covering configuration, HTTPS policy, localhost/IPv4/IPv6 callbacks, unsafe URLs, PKCE challenges, CORS, API errors, and signing keys.
- UI tests: 10 passed, covering API errors, provider selection, issuer-scoped storage, and mismatched or missing callback issuers.
- Provider TypeScript build passed.
- UI TypeScript/Vite production build passed with the updated registration and documentation pages.
- Cross-environment integration passed with a production-style `https://auth.example.test` issuer, a separate `https://identity.example.test` consent UI, and `http://localhost:3000/auth/callback`.
- Restarted the local API and verified the existing localhost demo API flow with the legacy `CLIENT` configuration; it passed with the new issuer response and exact matching checks.
- The integration verified discovery, explicit browser origin allowance, client registration, consent, callback state/issuer, token signatures, audience, issuer, nonce, UserInfo, and rejection of unknown clients, unregistered callback ports, wrong secrets, wrong verifiers, mismatched token callbacks, and reused authorization codes.
- Verification data was removed after the check. The fixture process was stopped. No live production endpoint, production database, DNS, TLS certificate, reverse proxy, or real browser was tested or changed.

## Rollout and compatibility

1. Deploy the provider changes and configure its public HTTPS `ISSUER_URL` and hosted `CONSENT_UI_URL`. The legacy `CLIENT` name still works. Restart the API after environment changes.
2. Rebuild the hosted UI with `VITE_API_BASE_URL` equal to that exact issuer.
3. Register a development client against the production provider, explicitly including the local application's callback. Save its secret on the local application's backend.
4. Configure the local application with that production issuer, the credentials issued there, and the registered localhost callback. Use discovery and standard callback/token validation.
5. Add `CORS_ALLOWED_ORIGINS` entries only for direct browser API access. Backend token exchange and top-level redirects do not require them. Existing reliance on automatic 5173/5174 CORS origins must be replaced by explicit configuration where needed.
6. Sign in again in the provider UI because issuer-specific storage does not import the old unscoped cache. Registration secrets are no longer restored after a page reload.

No database migration, production credential copying, or signing-key rotation is required by this refactor. Production changes have been prepared locally, not deployed.

## Commit log

- `08d8747` — Provider configuration, strict CORS/redirect policy, issuer responses, and cross-environment verification.
- `bfcc37f` — Client issuer isolation, required callback issuer checks, safer registration storage, and UI integration guidance.
- The integration guide, environment examples, README updates, and this decision log are committed together as a separate documentation change; see Git history for that commit's hash.
