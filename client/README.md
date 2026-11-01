# OIDC Client UI

React + Vite frontend for the custom OIDC provider.

For a locally running application using a production provider, see the [cross-environment integration guide](../docs/oidc-integration.md). This UI is the provider's hosted sign-in/consent application; third-party applications normally integrate through redirects and a backend OIDC client.

This app provides:

- User registration and login screens
- Hosted consent screen for third-party OAuth/OIDC authorization
- Trusted client registration form
- Account page showing locally saved client registrations
- Documentation page with endpoint examples

## Setup

```bash
bun install
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Run

```bash
bun run dev
```

Default Vite URL:

```txt
http://localhost:5173
```

## Build

```bash
bun run build
```

## OIDC Flow Notes

The consent page expects authorization requests to include:

- `client_id`
- `redirect_uri`
- `response_type=code`
- `scope`
- `state`
- `nonce`
- `code_challenge`
- `code_challenge_method=S256`

When the user approves access, the frontend forwards those values to the provider backend. The third-party app must later exchange the returned authorization code from its backend using the original PKCE `code_verifier`.

`VITE_API_BASE_URL` is the exact issuer, not the local application's callback URL. Set it to the production provider to use that provider from a local UI, and explicitly allow the UI origin in the provider's `CORS_ALLOWED_ORIGINS`. Rebuild for production configuration changes. Production initialization requires an explicit issuer; development alone defaults to localhost.

Production builds validate the issuer before emitting browser assets. Include the scheme, for example `https://oidc-server.aalampatil.online`. A value such as `oidc-server.aalampatil.online` is invalid. Set this in the hosting platform's production environment as well as any local production env file; local ignored files are not automatically uploaded by Git deployments. Updating the variable requires rebuilding and redeploying the frontend.

Browser authentication state, registration metadata, and demo transactions are isolated by issuer. Old unscoped browser data is not imported; sign in again after upgrading. Registration secrets are shown once and are not persisted to local storage. The browser demo temporarily holds demo credentials in session storage and is not a template for a production confidential client.

## Vercel routing

Deploy the frontend with `client/` as the Vercel project root. `client/vercel.json` rewrites SPA requests to `index.html` so direct visits, refreshes, and OAuth redirects to `/consent` and `/demo/callback` reach React Router. Existing built assets continue to be served normally. Without this fallback, local Vite navigation can work while production authorization redirects fail with Vercel 404 responses.
