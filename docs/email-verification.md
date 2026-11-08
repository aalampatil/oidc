# Email verification

Signup creates an unverified account and sends a six-digit code. The client opens
`/verify-email`; successful verification returns to login or to the original OIDC
consent request. Existing unverified users reach the same screen after entering
their password at login. Request a code there before verifying.

## Email providers

All credentials belong in `server/.env` or the deployment environment. Restart the
server after changing them. Never put mail credentials in a `VITE_` variable.

For Resend, configure `RESEND_API_KEY` and `EMAIL_FROM` with a sender on your
verified domain. With no `EMAIL_PROVIDER` override, the service automatically uses
Resend when a key exists. You can explicitly select it with
`EMAIL_PROVIDER=resend`. See [Resend's send API](https://resend.com/docs/api-reference/emails/send-email).

For Mailtrap Sandbox, set `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM` using your sandbox credentials.
The existing misspelling `SMPT_PASSWORD` is accepted as a fallback.
SMTP uses TLS on port 465 and requires STARTTLS on other ports. The same adapter
supports other SMTP services. See [Nodemailer's SMTP options](https://nodemailer.com/smtp).

There is no automatic fallback from a failing Resend request to SMTP. This keeps
test and production delivery predictable. A failed signup delivery leaves the
account available for another send; a failed resend preserves the previous code.

## Services and endpoints

- `server/src/services/email/email.service.ts`: reusable `SendEmail` interface,
  SMTP and Resend adapters, provider selection, and safe delivery errors.
- `server/src/services/email/verification-email.ts`: text and HTML template.
- `server/src/modules/emailVerification/`: database-backed OTP service and routes.
- `client/src/services/emailVerification.ts`: typed API methods.
- `client/src/hooks/useEmailVerification.ts`: send/verify actions, loading and
  error state, duplicate-submit protection, and resend countdown.

| Method | Endpoint | Body |
| --- | --- | --- |
| POST | `/o/authenticate/email-verification/send` | `{ "email": "you@example.com" }` |
| POST | `/o/authenticate/email-verification/verify` | `{ "email": "you@example.com", "code": "012345" }` |

Codes expire after 10 minutes and allow five incorrect attempts. Resends have a
60-second cooldown and a five-send hourly limit per account. A resend replaces the
old challenge. Successful verification marks the email verified and deletes the
challenge. Codes are generated with cryptographic randomness and stored as scrypt
hashes; they are never returned by APIs or written to logs.

Account locks serialize sends and verification across server processes. Failed
attempts commit even when the API rejects the code. Public send responses for
unknown or already verified addresses use the same success message. In addition
to database-backed account limits, process-local IP limits allow 20 signup/send
requests and 60 verification requests per 15 minutes. Configure `TRUST_PROXY_HOPS`
to the exact trusted proxy count when deployed behind a reverse proxy; it defaults
to zero for direct local connections.

Unverified accounts cannot log in, authorize OIDC clients, exchange authorization
codes, or refresh tokens. New account passwords must contain 8–256 characters.
Email matching is case-insensitive, with a database unique index to prevent
duplicate accounts from concurrent registrations.

## Migration and checks

`bun start` from `server/` applies pending database migrations before launching
the authentication server. If migration fails, startup stops. `bun run dev`
starts the development watcher directly; run `bun run db:migrate` first. The
`0004_email_verification` migration adds the challenge table and case-insensitive
email uniqueness. Existing duplicate emails must be resolved before that unique
index can be created. Existing accounts remain unverified until they complete the
code flow.

For Render's native Bun runtime, use root directory `server`, build command
`bun install && bun run build`, and start command `bun start`. Set `DATABASE_URL`,
`RESEND_API_KEY`, `EMAIL_FROM`, and the existing OIDC settings in Render's
environment. The start script uses those environment variables; it does not
require uploading `.env.production`. A `42P01` startup error after the OTP change
means a required table is missing, commonly `email_verifications` before migration
`0004` has run. Redeploy the version with the migration-aware start script.

Render also supports a separate pre-deploy migration command on eligible paid
services. See [Render's deploy lifecycle](https://render.com/docs/deploys#pre-deploy-command).

`bun run check` runs unit tests and both type checks. PostgreSQL OTP integration
tests require an explicit `TEST_DATABASE_URL` pointing at a migrated test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://USER:PASSWORD@localhost:5434/oidc_auth'
bun test --timeout 10000 src/modules/emailVerification/emailVerification.integration.test.ts
```

These tests inject an email collector and clock; they send no real email. They
cover hashing, expiry, replay prevention, attempts, resend limits, delivery rollback,
and concurrent requests. Fixtures roll back; the concurrency test removes its own
temporary account afterward.
