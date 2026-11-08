# Account management

The header's **My account** link opens `/account`. The page displays the verified
email, editable first/last names, account ID, and join date, with a sign-out action
and a separate permanent-deletion form. `/profile` redirects to `/account`.
Registered OAuth clients remain available at `/account/apps`; the list represents
clients registered in this browser rather than server-side account ownership.

`client/src/services/account.ts` provides typed API methods, and
`client/src/hooks/useAccount.ts` handles loading, saving, deletion, request
cancellation, duplicate submissions, and expired sessions. Profile saves update
the cached user. Deletion requires typing the account email and current password;
canceling clears the confirmation fields. After the server confirms deletion,
the page clears cached credentials and redirects to sign-in with a success notice.

Account management uses the first-party access token returned by
`POST /o/authenticate/login`. Every account route verifies the RS256 signature,
issuer, `aud=self`, `client_id=self`, `token_use=access`, and UUID subject. OIDC
client tokens and ID tokens cannot manage an account. Routes always use the
authenticated subject; callers cannot supply another account ID.

| Method | Endpoint | Body | Result |
| --- | --- | --- | --- |
| GET | `/o/account` | — | Profile, email verification status, creation/update dates |
| PATCH | `/o/account` | `{ "firstName": "Ada", "lastName": "Lovelace" }` | Updated profile |
| DELETE | `/o/account` | `{ "password": "current-password", "confirmationEmail": "you@example.com" }` | `204 No Content` |

Names are trimmed, first name is required, and each name has a 25-character limit.
Profile edits accept only the two name fields. Email and verification status
cannot be changed through profile editing. Password hashes and salts are excluded
from profile responses.

Account deletion requires the current password and matching email confirmation.
It is limited to five attempts per account per 15 minutes. The service locks the
account and deletes authorization codes, refresh tokens, pending verification
codes, and the user in one transaction. Any failure rolls back the entire
operation. Existing provider requests for a deleted user fail, and refresh tokens
cannot be exchanged again.

Previously issued JWTs remain cryptographically valid until their expiry (up to
one hour for access tokens). Applications validating JWTs offline may therefore
continue an existing session until it expires. Account deletion does not erase
copies of data held by third-party applications. OAuth client registrations are
separate records with no account ownership relation in the current schema, so
deleting an account does not delete client registrations or other users' data.

No database migration is required for these endpoints. The local cross-environment
integration check verifies access restrictions, private-field exclusion, profile
updates, failed deletion confirmation, successful deletion, and rejection of the
deleted account's login, profile access, and refresh token. It uses a temporary
account and does not delete an existing user's account.
