# Contributing

Contributions to the OIDC identity provider are welcome, including bug reports, documentation, tests, accessibility improvements, and code. All participation follows our [code of conduct](CODE_OF_CONDUCT.md).

## Before you start

Search [existing issues](https://github.com/aalampatil/oidc/issues) and [pull requests](https://github.com/aalampatil/oidc/pulls) before opening a new one. Use the issue templates for bugs, feature requests, and questions. Discuss substantial changes in an issue first so maintainers can help confirm the approach.

For a vulnerability or suspected authentication bypass, follow [SECURITY.md](SECURITY.md) and report privately. Do not include exploit details in public issues or pull requests.

## Local development

1. Fork the repository, clone your fork, and create a descriptive branch from `main`, such as `fix/token-validation`.
2. From the repository root, install the development tools and each application's dependencies:

   ```sh
   bun install
   bun install --cwd client
   bun install --cwd server
   ```

3. Follow the [README](README.md#development-setup), [server setup](server/README.md#setup--installation), and [client setup](client/README.md#setup) to configure local environment files, signing keys, PostgreSQL, and migrations.
4. Start the API and UI in separate terminals from the repository root:

   ```sh
   bun run --cwd server dev
   ```

   ```sh
   bun run --cwd client dev
   ```

Unit tests and type checks can run without starting the applications or configuring a database or signing keys. Email verification database tests run only when `TEST_DATABASE_URL` is explicitly set.

## Making changes

- Keep each pull request focused on one problem and follow the surrounding TypeScript and React conventions.
- Add regression tests for behavior changes, including rejection cases for authentication or authorization changes. Documentation-only changes do not need application tests.
- Update the relevant README or `docs/` guide when changing setup, environment variables, public endpoints, or behavior.
- For database schema changes, run `bun run --cwd server db:generate`, review the generated migration, and include the SQL and Drizzle metadata. Describe migration and compatibility effects in the pull request.
- Keep real credentials, tokens, private signing keys, personal data, local `.env` files, and generated build output out of commits. Redact sensitive values in screenshots and logs.
- Use descriptive commit messages that explain the change. The local Husky hook runs the shared checks before a commit.

## Verification

Run the shared unit tests and TypeScript checks from the repository root:

```sh
bun run check
```

You can run either package separately with `bun run check:client` or `bun run check:server`.

For authentication flow changes, also run the provider integration check against your configured local development database and signing keys:

```sh
bun run --cwd server test:integration
```

See the [integration guide](docs/oidc-integration.md#verification) for the check's configuration and scope. For email verification changes, follow the [database test instructions](docs/email-verification.md#migration-and-checks) using a migrated test database. These checks write test records; use a database intended for development or testing.

For UI changes, run `bun run --cwd client build` and check the affected screens in a browser, including keyboard navigation and narrow layouts. Include screenshots when they help reviewers understand a visible change.

## Opening a pull request

Target `main` and fill out the [pull request template](.github/pull_request_template.md). Explain the problem, the resulting behavior, any related issue, and the checks you ran. Note any checks you could not run and why. Include configuration, migration, or compatibility notes when relevant.

Maintainers may request changes before merging. Respond to review feedback respectfully and update the documentation and tests when the implementation changes.

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
