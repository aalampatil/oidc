# OIDC Identity Provider

A from-scratch implementation of an **OpenID Connect (OIDC) Identity Provider** built with Bun + Express on the backend and React on the frontend. This project lets you understand how OAuth 2.0 and OIDC work under the hood by building the actual authorization server yourself.

---

## What is this?

This is a fully functional OIDC **Authorization Server** (also called an Identity Provider or IdP). Third-party applications can integrate with it — just like "Sign in with Google" — to authenticate users without ever handling their passwords directly.

---

## Tech Stack

| Layer       | Technology                           |
| ----------- | ------------------------------------ |
| Runtime     | Bun                                  |
| Backend     | Express 5, TypeScript                |
| Frontend    | React, TypeScript, Vite, TailwindCSS |
| Database    | PostgreSQL via Drizzle ORM           |
| Auth Tokens | RS256 JWT (`jsonwebtoken`)           |
| JWKS        | `node-jose`                          |
| Validation  | Zod                                  |
| Container   | Docker + Docker Compose              |

---

## Project Structure

```
oidc/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── ConsentScreen.tsx    # OAuth consent/approval UI
│   │   └── store/
│   │       └── thirdParty.store.ts  # Zustand store for OAuth flows
│   └── .env
│
└── server/                          # Bun + Express backend
    ├── cert/                        # Local RSA key pair, ignored by Git
    │   └── .gitkeep
    ├── drizzle/                     # Drizzle migration files
    ├── src/
    │   ├── db/
    │   │   ├── index.ts             # Drizzle DB connection
    │   │   └── schema.ts            # users, oauth_clients, auth_codes, refresh_tokens
    │   ├── middlewares/
    │   ├── modules/
    │   │   ├── oauth-3rdparty/
    │   │   │   ├── 3rdparty.controller.ts   # Client registration + consent flow
    │   │   │   └── 3rdparty.routes.ts
    │   │   ├── oidcAuth/
    │   │   │   ├── oidcAuth.controller.ts   # Register, login, userinfo, token, revoke
    │   │   │   └── oidcAuth.routes.ts
    │   │   └── oidcDiscovery/
    │   │       ├── oidcDiscovery.controller.ts  # openid-configuration, jwks.json
    │   │       └── oidcDiscovery.routes.ts
    │   ├── utils/
    │   │   ├── cert.ts              # RSA key loading
    │   │   ├── helper.ts            # signAccessToken, signIdToken, createRefreshToken
    │   │   ├── user-token.ts        # JWTClaims type
    │   │   └── env.ts               # Environment variable validation
    │   └── index.ts                 # App entry point
    ├── .env                         # Local only, ignored by Git
    ├── .env.example
    ├── .env.production              # Local only, ignored by Git
    ├── docker-compose.yml
    ├── Dockerfile
    ├── drizzle.config.js
    ├── key-gen.sh                   # RSA key generation script
    └── package.json
```

---

## How the OAuth 2.0 Authorization Code Flow Works

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────────┐
│ Third-Party  │        │   This OIDC IdP   │        │      User       │
│    App       │        │   (Your Server)   │        │   (Browser)     │
└──────┬───────┘        └────────┬──────────┘        └────────┬────────┘
       │                         │                             │
       │  1. GET /o/3rd-party-   │                             │
       │  client/authorize       │                             │
       │  ?client_id=&           │                             │
       │  redirect_uri=&         │                             │
       │  response_type=code&    │                             │
       │  code_challenge=...     │                             │
       │────────────────────────>│                             │
       │                         │                             │
       │                         │  2. Validate client,        │
       │                         │  redirect to /consent       │
       │                         │────────────────────────────>│
       │                         │                             │
       │                         │  3. User fills email +      │
       │                         │  password, clicks Allow     │
       │                         │<────────────────────────────│
       │                         │                             │
       │                         │  4. POST /o/3rd-party-      │
       │                         │  client/authorize           │
       │                         │  → generates auth code      │
       │                         │  → returns { redirect_url } │
       │                         │────────────────────────────>│
       │                         │                             │
       │  5. Browser redirects   │                             │
       │  to callback ?code=xyz  │                             │
       │<────────────────────────────────────────────────────── │
       │                         │                             │
       │  6. POST /o/token       │                             │
       │  { code, client_secret, │                             │
       │    code_verifier }      │                             │
       │────────────────────────>│                             │
       │                         │                             │
       │  { access_token,        │                             │
       │    id_token,            │                             │
       │    refresh_token }      │                             │
       │<────────────────────────│                             │
       │                         │                             │
       │  7. GET /o/userinfo     │                             │
       │  Bearer access_token    │                             │
       │────────────────────────>│                             │
       │                         │                             │
       │  { sub, email, name }   │                             │
       │<────────────────────────│                             │
```

---

## API Reference

### OIDC Discovery

| Method | Endpoint                            | Description                      |
| ------ | ----------------------------------- | -------------------------------- |
| GET    | `/.well-known/openid-configuration` | OIDC discovery document          |
| GET    | `/.well-known/jwks.json`            | Public keys for JWT verification |

### Authentication

| Method | Endpoint                   | Description                                              |
| ------ | -------------------------- | -------------------------------------------------------- |
| POST   | `/o/authenticate/register` | Register a new user account                              |
| POST   | `/o/authenticate/login`    | Login, returns access + id + refresh tokens              |
| GET    | `/o/userinfo`              | Get authenticated user's profile (Bearer token required) |

### Token Management

| Method | Endpoint    | Description                                    |
| ------ | ----------- | ---------------------------------------------- |
| POST   | `/o/token`  | Exchange auth code or refresh token for tokens |
| POST   | `/o/revoke` | Revoke a refresh token                         |

### Third-Party OAuth Client

| Method | Endpoint                        | Description                            |
| ------ | ------------------------------- | -------------------------------------- |
| POST   | `/o/3rd-party-client/register`  | Register a third-party OAuth client    |
| GET    | `/o/3rd-party-client/authorize` | Start the authorization flow           |
| POST   | `/o/3rd-party-client/authorize` | Submit user consent (email + password) |
| GET    | `/o/3rd-party-client/:clientId` | Get client metadata                    |

---

## Setup & Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Docker + Docker Compose (for PostgreSQL)

### 1. Clone the repo

```bash
git clone https://github.com/aalampatil/oidc.git
cd oidc
```

### 2. Generate RSA Keys

A script is provided. Run it from the `server/` directory:

```bash
cd server
chmod +x key-gen.sh
./key-gen.sh
```

This creates `cert/private-key.pem` and `cert/public-key.pub` used for signing JWTs.

These files are intentionally ignored by Git. Do not commit private signing keys.

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

`server/.env`:

```env
PORT=3000
DATABASE_URL=postgresql://ADMIN:ADMIN@localhost:5433/oidc_auth
ISSUER_URL=http://localhost:3000
CLIENT=http://localhost:5173
SERVER=http://localhost:3000
```

`client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

> Make sure `VITE_API_BASE_URL` includes the `http://` or `https://` scheme — missing it causes the URL to be appended as a path instead of used as the base origin.

### 4. Start PostgreSQL

```bash
cd server
docker compose up -d
```

This starts PostgreSQL on port `5433` (mapped from the container's `5432`).

### 5. Run Database Migrations

```bash
bun run db:migrate
```

### 6. Start the Server

```bash
bun run dev
```

### 7. Start the Client

```bash
cd client
bun install
bun run dev
```

---

## Using Docker for Everything

```bash
docker compose up --build
```

---

## Registering a Third-Party Client

Before starting an OAuth flow your app must register with this IdP:

```bash
POST http://localhost:3000/o/3rd-party-client/register
Content-Type: application/json

{
  "name": "My App",
  "redirectUris": ["http://localhost:5500/callback.html"],
  "scopes": "openid email profile"
}
```

Response:

```json
{
  "clientId": "abc123...",
  "clientSecret": "xyz789...",
  "message": "keep the clientId and clientSecret safe"
}
```

> Store `clientSecret` only on your backend — never expose it in browser code.

---

## Starting the Authorization Flow

Redirect your users to the authorization endpoint:

```js
function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const codeVerifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode(codeVerifier),
);
const codeChallenge = base64UrlEncode(digest);

// Store codeVerifier in the user's session. You need it during token exchange.

const params = new URLSearchParams({
  client_id: "YOUR_CLIENT_ID",
  redirect_uri: "http://localhost:5500/callback.html",
  response_type: "code",
  scope: "openid email profile",
  state: crypto.randomUUID(), // CSRF protection
  nonce: crypto.randomUUID(), // ID token replay protection
  code_challenge: codeChallenge,
  code_challenge_method: "S256",
});

window.location.href = `http://localhost:3000/o/3rd-party-client/authorize?${params}`;
```

---

## Exchanging the Code for Tokens

After the user approves, your callback receives `?code=...`. Exchange it **from your backend**:

```bash
POST http://localhost:3000/o/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "received_code_here",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "http://localhost:5500/callback.html",
  "code_verifier": "original_pkce_code_verifier"
}
```

Response:

```json
{
  "access_token": "eyJ...",
  "id_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid email profile"
}
```

---

## Refreshing Tokens

```bash
POST http://localhost:3000/o/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
```

Refresh tokens are **rotated on every use** — the old token is invalidated and a new one is returned.

---

## Security Notes

- Passwords are hashed with **scrypt + random salt** — plain passwords are never stored
- Legacy SHA-256 password hashes are still accepted so existing users can log in
- JWTs are signed with **RS256** (asymmetric keys) — consumers verify tokens via the JWKS endpoint without contacting this server
- Authorization code flow requires **PKCE S256**
- ID tokens include the authorization request `nonce` when provided
- Auth codes are **single-use** and expire in **10 minutes**
- Refresh tokens are stored hashed, client-bound, single-use, and **rotated** on every use
- Redirect URIs must exactly match a registered URI; HTTPS is required except localhost HTTP
- Requested scopes must be allowed by the registered client
- `client_secret` is stored as a SHA-256 hash — the plain secret is shown only once at registration

## Production Notes

- Keep `.env`, `.env.production`, `cert/private-key.pem`, and `cert/public-key.pub` out of Git.
- Rotate signing keys if a private key was ever committed or exposed.
- Use `ISSUER_URL` as the public HTTPS issuer URL in production.
- Run production migrations with:

```bash
bun run db:migrate:prod
```

- Existing refresh tokens created before hashed-token storage are invalid after the production hardening migration.

---

## Supported Grant Types

| Grant Type           | Description                                      |
| -------------------- | ------------------------------------------------ |
| `authorization_code` | Standard OAuth 2.0 flow with user consent screen |
| `refresh_token`      | Obtain a new access token using a refresh token  |

---

## Supported Scopes

| Scope     | Claims Returned                                |
| --------- | ---------------------------------------------- |
| `openid`  | `sub`, `iss`, `exp`, `iat`                     |
| `email`   | `email`, `email_verified`                      |
| `profile` | `given_name`, `family_name`, `name`, `picture` |

---

## Database Scripts

```bash
bun run db:generate       # Generate migration files from schema changes
bun run db:migrate        # Apply migrations to local DB
bun run db:migrate:prod   # Apply migrations to production DB
bun run db:studio         # Open Drizzle Studio (DB GUI)
```
