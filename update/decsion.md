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

## Follow-up: production website renders a blank page

Date: 2026-11-01

### Issue and evidence

- The frontend at `https://oidc-ap.aalampatil.online` returned HTTP 200 from Vercel and referenced `/assets/index-XG0u3Ijx.js`; this was a browser startup failure rather than a missing HTML page.
- Read-only inspection of the deployed public JavaScript confirmed that issuer validation was called with `oidc-server.aalampatil.online`, without `https://`.
- The previous refactor added strict issuer validation to a module imported before React mounts. A schemeless production value therefore threw an exception before the application could render.
- The existing production build did not execute that browser module and incorrectly succeeded. The earlier successful build checks did not cover runtime initialization with the actual production issuer configuration.
- The local ignored `client/.env.production` contained the same malformed value. It was corrected locally to `VITE_API_BASE_URL=https://oidc-server.aalampatil.online`.

### Change and decision

- Keep strict issuer validation; do not guess an insecure scheme or fall back to localhost in production.
- Load Vite's selected-mode environment in `client/vite.config.ts` and validate the issuer before emitting a production bundle.
- Add `client/tests/productionBuild.test.ts` to reproduce the exact schemeless-host failure at build configuration time and verify that the HTTPS form is accepted.
- Document that the production hosting environment must contain the complete HTTPS URL, and that a rebuild/redeployment is required when it changes.

### Validation and deployment status

- Confirmed the actual production build rejects the original malformed value before bundle generation.
- Corrected the local production value and reran all 11 UI tests and the TypeScript/Vite production build successfully.
- The application-side fix and decision log are committed as a separate major change. The local `.env.production` remains ignored and is not included in that commit.
- Initially, Vercel identified the `oidc` project but denied team access with HTTP 403. The local change alone did not repair production. The user subsequently approved team access, enabling the recovery recorded below.

### Production recovery after team authorization

- Updated the existing Vercel `VITE_API_BASE_URL` variable to `https://oidc-server.aalampatil.online`. Retained its existing sensitive storage type and its shared production/preview targets.
- Rebuilt the existing production source revision, `78df38c3d2fd3d723c07eb8d940e97e07d90b9ff`, with the corrected environment. This repaired configuration without introducing a different source revision into the release.
- Deployment `dpl_7XUN37kDKtJ5DdPTBNbEtg4zgiuy` reached `READY`, with no alias error, and was assigned to `oidc-ap.aalampatil.online`.
- Read-only verification of `https://oidc-ap.aalampatil.online` returned HTTP 200 and referenced the new `/assets/index-Bp9Q0FHE.js` asset.
- That JavaScript asset returned HTTP 200. Its startup configuration contains the complete HTTPS issuer and no longer contains the schemeless issuer invocation that caused the crash.
- The preventive build-validation change remains committed locally as `398dabe`; it was not part of this configuration-only redeployment and must be included in a subsequent source release to enforce validation there.
- Verification covered deployment status, domain assignment, HTML delivery, and actual public bundle configuration. A real browser render and production authentication flow were not exercised by these checks.

## Repository Git hooks

Date: 2026-11-01

- Added Husky 9.1.7 as a root development dependency with a root Bun lockfile and `prepare` script. The client and server retain independent package installations.
- Added `.husky/pre-commit` to run the shared `bun run check` command: client/server unit tests and their TypeScript checks.
- Used the client's active `tsconfig.json` for application checks and `tsconfig.node.json` for Vite configuration checks. TypeScript caches are written under `node_modules` rather than to tracked files.
- Added LF attributes for hook scripts, ignored generated hook internals, and documented installation and manual checks in the root README.
- Verified Git uses `.husky/_` as its hooks path. An initial invalid TypeScript check blocked the hook as expected; after correcting the command to use the active project configuration, `git hook run pre-commit` passed all 48 tests and both packages' type checks.
- The hook does not run database integration tests, contact production, rewrite source files, or stage files automatically.

## Follow-up: production demo cannot open consent or callback

Date: 2026-11-01

### Issue and cause

- The supplied production authorization URL reached `/consent`, but Vercel returned HTTP 404 before React Router could handle the page.
- Independent read-only checks also returned HTTP 404 for `/demo/callback` and `/docs`. Local Vite navigation hid the missing production SPA fallback.
- This failure occurs at frontend routing, before login or token exchange. Changing client secrets, redirect matching, PKCE, or CORS would not repair it.

### Changes

- Added `client/vercel.json` with Vercel's documented SPA rewrite to `/index.html`, making the fallback reproducible in future frontend deployments.
- Documented that `client/` is the frontend deployment root and explained why consent and callback redirects need the SPA fallback.
- Prepared an equivalent Vercel project route for the existing application page paths only. This lets the current production deployment serve consent and callback without changing its source revision, API routing, or static asset paths.
- The Husky setup was completed and committed separately as `ef1b37d` before this routing change.

### Validation

- The production build passed with the tracked routing configuration.
- Published Vercel route version `e6bd9980-676c-4199-a760-8930f5fa69db` containing the page rewrite rule. The project previously had no configured routing rules.
- Verified the exact supplied consent URL now returns HTTP 200 with the React application HTML. `/demo/callback` and `/docs` also return HTTP 200 with the same application shell.
- Verified `/assets/index-Bp9Q0FHE.js` still returns HTTP 200 with `application/javascript`, rather than being rewritten to HTML.
- This repairs the observed production routing failure. A real browser login and token exchange were not performed; the user should start a fresh demo from the landing page so its state, nonce, and PKCE session are present.
- The immediate live fix uses Vercel project routing. The committed `client/vercel.json` provides the same SPA fallback for future source deployments; it has not yet been included in a new source deployment.
