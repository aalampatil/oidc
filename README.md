# OIDC identity provider

The [server](server/README.md) implements the identity provider. The [client](client/README.md) provides its hosted UI. See the [integration guide](docs/oidc-integration.md) for local applications authenticating against a deployed provider.

## Development setup

Install [Bun](https://bun.sh), then install each package from the repository root:

```sh
bun install
bun install --cwd client
bun install --cwd server
```

The root install runs `prepare` and enables Husky Git hooks. The client and server retain their separate dependencies and lockfiles. After cloning, run the root install even if the app dependencies are already installed. Run `bun run prepare` to reinstall the hooks if needed.

## Commit checks

The Husky pre-commit hook runs:

- Client unit tests and TypeScript checks for the app and Vite configuration.
- Server unit tests and TypeScript checks.

Run the same checks manually with `bun run check`, or use `bun run check:client` and `bun run check:server` separately. Checks stop at the first failure and block the commit. TypeScript caches stay under `node_modules`, so the hook does not rewrite tracked build files or stage changes for you.

These checks do not require a database, signing keys, or a running provider. Run `bun run test:integration` from `server/` separately when changing the authentication flow; that check requires a configured local database and keys.

Git must be able to find `bun` on PATH, including when committing from an editor. Hook scripts use LF endings for compatibility with Git for Windows. In CI, set `HUSKY=0` when installing dependencies to disable local hook installation, and run `bun run check` explicitly.
