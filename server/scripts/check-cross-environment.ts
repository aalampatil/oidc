import "dotenv/config";
import assert from "node:assert/strict";
import { createServer } from "node:net";

// Simulate a TLS-terminated deployment using a local transport. Never contacts production.
const portProbe = createServer();
portProbe.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => portProbe.once("listening", resolve));
const address = portProbe.address();
assert(address && typeof address !== "string");
const port = address.port;
await new Promise<void>((resolve, reject) => portProbe.close((error) => error ? reject(error) : resolve()));

const base = `http://127.0.0.1:${port}`;
const fixture = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(port),
  SERVER: base,
  ISSUER_URL: "https://auth.example.test",
  CONSENT_UI_URL: "https://identity.example.test",
  CORS_ALLOWED_ORIGINS: "http://localhost:3000",
  DEMO_REDIRECT_URI: "http://localhost:3000/auth/callback",
  // Exercise delivery failure recovery without contacting an external provider.
  EMAIL_PROVIDER: "smtp",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "1",
  SMTP_USERNAME: "integration-test",
  SMTP_PASSWORD: "integration-test",
  EMAIL_FROM: "Identity <test@example.com>",
};
const server = Bun.spawn([process.execPath, "run", "start"], { env: fixture, stdout: "pipe", stderr: "pipe" });
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error("Cross-environment provider failed to start. Check the local database and keys.");
    try { ready = (await fetch(`${base}/health`)).ok; } catch { /* Wait for local startup. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Provider must be ready before verification");
  const allowed = await fetch(`${base}/o/token`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3000");
  const denied = await fetch(`${base}/o/token`, { method: "OPTIONS", headers: { Origin: "http://localhost:3001", "Access-Control-Request-Method": "POST" } });
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  console.log("PASS production configuration permits only the explicit local browser origin");

  const check = Bun.spawn([process.execPath, "run", "scripts/check-demo.ts"], { env: fixture, stdout: "pipe", stderr: "pipe" });
  const [output, errors, exitCode] = await Promise.all([
    new Response(check.stdout).text(), new Response(check.stderr).text(), check.exited,
  ]);
  process.stdout.write(output);
  if (errors) process.stderr.write(errors);
  assert.equal(exitCode, 0, "A local client must complete the flow against the production-configured issuer");
  console.log("PASS cross-environment integration (simulated public HTTPS issuer → localhost callback)");
} finally {
  server.kill();
  await server.exited;
}
