# OIDC identity provider

A custom OpenID Connect identity provider built with Bun, Express, TypeScript, React, and PostgreSQL. Applications can use it to authenticate users through OAuth 2.0 authorization code flows with PKCE.

The [server](server/README.md) implements the identity provider. The [client](client/README.md) provides its hosted sign-in and consent UI.

## Features

- User registration, login, email verification, and account management.
- OAuth client registration and hosted user consent.
- Authorization code exchange with S256 PKCE, refresh tokens, and token revocation.
- OIDC discovery, JWKS, RS256-signed tokens, and UserInfo.
- Explicit issuer, redirect URI, and browser origin configuration for local and deployed applications.

## Documentation

- [Server setup and API reference](server/README.md)
- [Client setup and configuration](client/README.md)
- [OIDC integration guide](docs/oidc-integration.md)
- [Email verification](docs/email-verification.md)
- [Account management](docs/account-management.md)

## Project structure

```text
client/     React + Vite hosted UI
server/     Bun + Express API, Drizzle schema and migrations
docs/       Integration and feature guides
.github/    Issue and pull request templates
```

## Development setup

Prerequisites: [Bun](https://bun.sh), PostgreSQL (or Docker Compose), and OpenSSL for generating local signing keys. On Windows, use Git Bash for `server/key-gen.sh`.

Clone the repository, then install each package from the repository root:

```sh
git clone https://github.com/aalampatil/oidc.git
cd oidc
```

```sh
bun install
bun install --cwd client
bun install --cwd server
```

The root install runs `prepare` and enables Husky Git hooks. The client and server retain their separate dependencies and lockfiles. After cloning, run the root install even if the app dependencies are already installed. Run `bun run prepare` to reinstall the hooks if needed.

Before starting the applications:

1. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
2. Follow the [server setup guide](server/README.md#setup--installation) to generate a signing key pair, set `PRIVATE_KEY` and `PUBLIC_KEY`, start PostgreSQL, and apply migrations.
3. Configure email delivery using the [email verification guide](docs/email-verification.md) to complete registration and verification flows.

Start the applications in separate terminals from the repository root:

```sh
bun run --cwd server dev
```

```sh
bun run --cwd client dev
```

The default API URL is `http://localhost:3000` and the UI URL is `http://localhost:5173`. See the [integration guide](docs/oidc-integration.md) for applications authenticating against a deployed provider. Keep local environment files and private signing keys out of commits.

## Commit checks

The Husky pre-commit hook runs:

- Client unit tests and TypeScript checks for the app and Vite configuration.
- Server unit tests and TypeScript checks.

Run the same checks manually with `bun run check`, or use `bun run check:client` and `bun run check:server` separately. Checks stop at the first failure and block the commit. TypeScript caches stay under `node_modules`, so the hook does not rewrite tracked build files or stage changes for you.

These checks do not require a database, signing keys, or a running provider. Run `bun run test:integration` from `server/` separately when changing the authentication flow; that check requires a configured local database and keys.

Git must be able to find `bun` on PATH, including when committing from an editor. Hook scripts use LF endings for compatibility with Git for Windows. In CI, set `HUSKY=0` when installing dependencies to disable local hook installation, and run `bun run check` explicitly.

## Community and support

Bug reports, feature ideas, documentation improvements, and code contributions are welcome. Read the [contribution guide](CONTRIBUTING.md) before opening an [issue](https://github.com/aalampatil/oidc/issues/new/choose) or pull request, and follow the [code of conduct](CODE_OF_CONDUCT.md).

Report vulnerabilities privately using the [security policy](SECURITY.md). For general questions, open an issue with the question template. The project is maintained by [Aalam Patil](https://github.com/aalampatil).

## License

This project is licensed under the [MIT License](LICENSE).
