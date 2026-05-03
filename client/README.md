# OIDC Client UI

React + Vite frontend for the custom OIDC provider.

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
