# Auth Server

A custom **OpenID Connect (OIDC) + OAuth 2.0 Authorization Server** built with Express, Drizzle ORM, and PostgreSQL. Supports direct login for your own apps and a full OAuth 2.0 Authorization Code Flow for third-party clients — just like "Sign in with Google".

---

## Tech Stack

| Package              | Purpose                          |
| -------------------- | -------------------------------- |
| `express`            | HTTP server                      |
| `drizzle-orm` + `pg` | Database ORM + PostgreSQL driver |
| `jsonwebtoken`       | JWT signing and verification     |
| `node-jose`          | JWKS / public key exposure       |
| `cors`               | Cross-origin request handling    |
| `dotenv`             | Environment variable management  |
| `bun`                | Runtime + dev server             |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL database running

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/authdb
```

You also need RSA key files for JWT signing. Generate them:

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

### Database Setup

```bash
# Generate migrations from schema
bun db:generate

# Run migrations
bun db:migrate

# Optional: open Drizzle Studio to inspect DB
bun db:studio
```

### Run Dev Server

```bash
bun dev
```

Server starts at `http://localhost:8080`.

---

## OIDC Discovery

The server exposes a standard OpenID Connect discovery document:

```
GET /.well-known/openid-configuration
```

```json
{
  "issuer": "http://localhost:8080",
  "authorization_endpoint": "http://localhost:8080/o/authorize",
  "token_endpoint": "http://localhost:8080/o/token",
  "userinfo_endpoint": "http://localhost:8080/o/userinfo",
  "jwks_uri": "http://localhost:8080/.well-known/jwks.json"
}
```

---

## API Reference

### Direct Auth (Your Own App)

#### `POST /o/authenticate/register`

Register a new user.

```json
// Request body
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}

// Response 201
{ "ok": true }
```

#### `POST /o/authenticate/login`

Log in and receive a JWT directly.

```json
// Request body
{ "email": "jane@example.com", "password": "securepassword" }

// Response 200
{ "token": "<signed JWT>" }
```

#### `GET /o/userinfo`

Get the authenticated user's profile. Requires a Bearer token.

```
Authorization: Bearer <token>
```

```json
// Response 200
{
  "sub": "uuid",
  "email": "jane@example.com",
  "email_verified": false,
  "given_name": "Jane",
  "family_name": "Doe",
  "name": "Jane Doe",
  "picture": null
}
```

---

### OAuth 2.0 Flow (Third-Party Clients)

Use this flow when external apps want to authenticate users via your server.

#### Step 1 — Register a Client

```http
POST /o/clients/register
Content-Type: application/json

{
  "name": "My Third-Party App",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": "openid email profile"
}
```

```json
// Response — save these, secret is shown only once
{
  "clientId": "abc123",
  "clientSecret": "supersecret"
}
```

#### Step 2 — Redirect User to Consent Screen

Your client app redirects the user to:

```
GET /o/authorize
  ?client_id=abc123
  &redirect_uri=https://myapp.com/callback
  &response_type=code
  &scope=openid email profile
  &state=random_csrf_token
```

The user sees a login + consent screen and clicks **Allow**.

#### Step 3 — Receive Auth Code

Your server redirects back to the client:

```
https://myapp.com/callback?code=xyz789&state=random_csrf_token
```

> The client **must verify** the `state` matches what it originally sent.

#### Step 4 — Exchange Code for Token

From your client's **backend**:

```http
POST /o/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "xyz789",
  "client_id": "abc123",
  "client_secret": "supersecret",
  "redirect_uri": "https://myapp.com/callback"
}
```

```json
// Response
{
  "access_token": "<signed JWT>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid email profile"
}
```

#### Step 5 — Fetch User Info

```http
GET /o/userinfo
Authorization: Bearer <access_token>
```

---

## Database Schema

```
users           — registered user accounts
oauth_clients   — registered third-party apps (client_id + hashed secret)
auth_codes      — short-lived one-time codes issued during OAuth flow
```

---

## Security Notes

- Passwords are hashed with `SHA-256` + random salt
- Client secrets are stored hashed, never in plaintext
- Auth codes are **single-use** and expire in 10 minutes
- JWTs are signed with `RS256` using a 2048-bit RSA private key
- `redirect_uri` is validated against a whitelist on every request
- `state` parameter should always be validated by the client to prevent CSRF

---

## Project Structure

```
src/
├── index.ts          # Express app + all routes
├── db/
│   ├── index.ts      # Drizzle DB client
│   └── schema.ts     # Table definitions
└── utils/
    ├── cert.ts       # RSA key loading
    └── user-token.ts # JWT claims type
public/
├── authenticate.html # Direct login page
└── consent.html      # OAuth consent screen
```

---

## Scripts

| Script            | Description                         |
| ----------------- | ----------------------------------- |
| `bun dev`         | Start dev server with hot reload    |
| `bun db:generate` | Generate SQL migrations from schema |
| `bun db:migrate`  | Run pending migrations              |
| `bun db:studio`   | Open Drizzle Studio UI              |
