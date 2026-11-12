# Security policy

## Supported versions

Security fixes target the latest code on the default branch, `main`. Older commits, forks, and historical snapshots do not receive separate security backports. Update to the latest `main` when applying a fix and review any required database migrations or configuration changes.

## Reporting a vulnerability

Report suspected vulnerabilities privately, including authentication or consent bypasses, token validation flaws, redirect URI or CORS weaknesses, credential exposure, and dependency vulnerabilities that affect this project.

Use [GitHub's private vulnerability reporting form](https://github.com/aalampatil/oidc/security/advisories/new). If that form is unavailable, email the maintainer, Aalam Patil, at [aalam.workacc@gmail.com](mailto:aalam.workacc@gmail.com) with the subject `OIDC security report`.

Do not publish vulnerability details in issues, discussions, pull requests, screenshots, or logs before coordinating disclosure with the maintainer. Never send live credentials, private signing keys, access or refresh tokens, or other users' personal data.

Include the following when possible:

- The affected commit, component, and relevant configuration with secrets removed.
- A description of the vulnerability, prerequisites, and likely impact.
- Minimal reproduction steps or a proof of concept using test accounts and dummy data.
- Whether you have reproduced the issue against the latest `main`.
- A suggested mitigation or fix, if you have one.
- How to contact you and whether you would like credit when the issue is disclosed.

Test only systems and accounts you own or have permission to assess. Use a local development instance for reproduction.

## What happens next

The maintainer will review the report, ask for clarification when needed, and coordinate validation, a fix, and disclosure with the reporter. Response and remediation times depend on severity and maintainer availability; no fixed response time is guaranteed.

Confirmed fixes will be applied to `main`. When appropriate, a GitHub security advisory will describe the impact, affected code, and upgrade or mitigation instructions. Please coordinate public disclosure until users can apply a fix.

For ordinary bugs and support questions, use the [issue templates](https://github.com/aalampatil/oidc/issues/new/choose).
