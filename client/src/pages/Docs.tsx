import React from 'react'

const endpointCards = [
  {
    title: 'Discovery',
    endpoint: 'GET /.well-known/openid-configuration',
    purpose: 'Returns issuer metadata so third-party apps can auto-configure endpoints.',
  },
  {
    title: 'JWKS',
    endpoint: 'GET /.well-known/jwks.json',
    purpose: 'Returns public key set for JWT signature verification.',
  },
  {
    title: 'Client Register',
    endpoint: 'POST /o/3rd-party-client/register',
    purpose: 'Creates a client_id/client_secret pair and stores redirect URIs + scopes.',
  },
  {
    title: 'Authorize Start',
    endpoint: 'GET /o/3rd-party-client/authorize',
    purpose: 'Validates client + redirect URI, then redirects user to hosted consent screen.',
  },
  {
    title: 'Authorize Submit',
    endpoint: 'POST /o/3rd-party-client/authorize',
    purpose: 'Validates user credentials, issues auth code, returns redirect URL with code.',
  },
  {
    title: 'Token',
    endpoint: 'POST /o/token',
    purpose: 'Exchanges auth code for tokens, and refreshes tokens via refresh grant.',
  },
  {
    title: 'UserInfo',
    endpoint: 'GET /o/userinfo',
    purpose: 'Returns claims for the authenticated user from bearer access token.',
  },
  {
    title: 'Revoke',
    endpoint: 'POST /o/revoke',
    purpose: 'Marks a refresh token as used/revoked for a valid client.',
  },
]

const edgeCases = [
  'Duplicate user signup email returns 409 conflict.',
  'Missing register/login fields return 400 validation errors.',
  'Invalid login or consent credentials return 401.',
  'Authorization code is single-use and expires in 10 minutes.',
  'Refresh token is single-use and expires in 30 days.',
  'Authorize GET rejects unknown client_id and unregistered redirect_uri.',
  'Token endpoint rejects invalid client_id/client_secret.',
  'Unsupported grant_type and response_type are rejected.',
  'Token exchange binds code to client_id, redirect_uri, and PKCE verifier.',
  'Refresh token rotation verifies ownership against requesting client_id.',
  'Hosted consent re-checks client, redirect URI, scope, and PKCE challenge.',
]

const knownGaps = [
  'Deny button currently returns to home, not redirect_uri with access_denied + state.',
  'Email verification and account recovery flows are still placeholders.',
  'Refresh token reuse detection currently rejects reused tokens but does not revoke the whole token family.',
]

const Docs = () => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-16 md:gap-10 md:px-10 md:py-20">
      <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
        <span className="h-2 w-2 bg-chart-5" />
        OIDC Documentation
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <h1 className="text-4xl leading-tight md:text-6xl">
            Complete <span className="bg-main px-2 text-main-foreground">OIDC Guide</span>
            <br />
            For Provider + Third-Party Clients
          </h1>
          <p className="max-w-2xl text-base md:text-lg">
            This page documents how this repo serves as an OpenID Connect provider, what each frontend/backend module does,
            and exactly how a third-party client should integrate authorization code flow end-to-end.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-2" />
          <div className="relative space-y-3 border-2 border-border bg-secondary-background p-5 shadow-shadow md:p-6">
            <p className="text-xs font-heading uppercase">At A Glance</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border-2 border-border bg-background p-3">
                <p className="text-2xl font-heading">8</p>
                <p className="text-xs uppercase">Core Endpoints</p>
              </div>
              <div className="border-2 border-border bg-background p-3">
                <p className="text-2xl font-heading">3</p>
                <p className="text-xs uppercase">Main Flows</p>
              </div>
              <div className="border-2 border-border bg-background p-3">
                <p className="text-2xl font-heading">7+</p>
                <p className="text-xs uppercase">Known Edge Cases</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
        <h2 className="text-2xl font-heading">System Responsibilities</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 border-2 border-border bg-background p-4">
            <p className="text-xs font-heading uppercase">Backend / Server</p>
            <ul className="space-y-1 text-sm">
              <li>- Serves discovery metadata + JWKS (`/.well-known/*`).</li>
              <li>- Registers OAuth clients and stores hashed client secrets.</li>
              <li>- Validates authorize requests and issues authorization codes.</li>
              <li>- Exchanges codes for access/id/refresh tokens and rotates refresh tokens.</li>
              <li>- Exposes `userinfo` and token revocation endpoints.</li>
            </ul>
          </div>
          <div className="space-y-2 border-2 border-border bg-background p-4">
            <p className="text-xs font-heading uppercase">Frontend / Client App</p>
            <ul className="space-y-1 text-sm">
              <li>- Provides hosted user flows: login, register, consent, trust form, account view.</li>
              <li>- Collects user credentials and submits consent authorization requests.</li>
              <li>- Registers third-party clients from UI and persists trusted app metadata.</li>
              <li>- Renders operator docs and flow guidance for integrators.</li>
              <li>- Routes all pages through shared neo-themed layout with header/footer.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
        <h2 className="text-2xl font-heading">OIDC Flow: Third-Party Client Integration</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">1. Discover provider metadata</p>
            <p>Call `/.well-known/openid-configuration` and cache auth/token/userinfo/JWKS endpoints.</p>
          </div>
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">2. Register a client (one-time)</p>
            <p>Call `POST /o/3rd-party-client/register` with app name + redirect URIs, then securely store `client_secret` server-side only.</p>
          </div>
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">3. Redirect user to authorize endpoint</p>
            <p>Use `GET /o/3rd-party-client/authorize` with `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `nonce`, and PKCE S256 parameters.</p>
          </div>
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">4. User authenticates + consents</p>
            <p>Provider consent page submits to `POST /o/3rd-party-client/authorize` and receives a `redirect_url` containing auth code.</p>
          </div>
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">5. Exchange code on your backend</p>
            <p>Call `POST /o/token` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`, and `code_verifier`.</p>
          </div>
          <div className="border-2 border-border bg-background p-4">
            <p className="font-heading uppercase">6. Call userinfo and maintain session</p>
            <p>Use bearer `access_token` for `/o/userinfo`. Refresh via `grant_type=refresh_token`, revoke via `/o/revoke` when needed.</p>
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
        <h2 className="text-2xl font-heading">Endpoint Contract Reference</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {endpointCards.map((item) => (
            <article key={item.endpoint} className="space-y-2 border-2 border-border bg-background p-4">
              <p className="text-xs font-heading uppercase">{item.title}</p>
              <p className="text-sm font-heading">{item.endpoint}</p>
              <p className="text-sm">{item.purpose}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
          <h2 className="text-2xl font-heading">Current Edge Cases Covered</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {edgeCases.map((item) => (
              <li key={item} className="border-2 border-border bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
          <h2 className="text-2xl font-heading">Known Gaps / Hardening Needed</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {knownGaps.map((item) => (
              <li key={item} className="border-2 border-border bg-background px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
        <h2 className="text-2xl font-heading">Sample Authorize + Token Requests</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 border-2 border-border bg-background p-4">
            <p className="text-xs font-heading uppercase">Authorization Redirect</p>
            <pre className="overflow-x-auto border-2 border-border bg-secondary-background p-3 text-xs">
{`GET /o/3rd-party-client/authorize?
  client_id=CLIENT_ID
  &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
  &response_type=code
  &scope=openid%20email%20profile
  &state=RANDOM_CSRF_TOKEN
  &nonce=RANDOM_NONCE
  &code_challenge=BASE64URL_SHA256_VERIFIER
  &code_challenge_method=S256`}
            </pre>
          </div>
          <div className="space-y-2 border-2 border-border bg-background p-4">
            <p className="text-xs font-heading uppercase">Token Exchange</p>
            <pre className="overflow-x-auto border-2 border-border bg-secondary-background p-3 text-xs">
{`POST /o/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET",
  "code": "AUTH_CODE",
  "redirect_uri": "https://app.example.com/callback",
  "code_verifier": "ORIGINAL_PKCE_VERIFIER"
}`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Docs
