import { expect, test } from "bun:test";
import express from "express";
import { createProviderCors } from "./http-cors";

test("CORS permits only explicit API origins, keeps discovery public, and excludes authorization navigation", async () => {
  const app = express();
  app.use(createProviderCors(["https://identity.example.com", "http://localhost:3000"]));
  app.use((_req, res) => res.json({ ok: true }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const preflight = await fetch(`${base}/o/token`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
    for (const origin of ["http://localhost:3001", "https://evil.example", "null"]) {
      const denied = await fetch(`${base}/o/token`, { headers: { Origin: origin } });
      expect(denied.headers.get("access-control-allow-origin")).toBeNull();
      expect(denied.headers.get("vary")).toContain("Origin");
    }
    for (const path of ["/.well-known/openid-configuration", "/.well-known/jwks.json"]) {
      const metadata = await fetch(`${base}${path}`, { headers: { Origin: "http://localhost:9000" } });
      expect(metadata.headers.get("access-control-allow-origin")).toBe("*");
    }
    const navigation = await fetch(`${base}/o/3rd-party-client/authorize`, { headers: { Origin: "http://localhost:3000" } });
    expect(navigation.headers.get("access-control-allow-origin")).toBeNull();
    expect((await fetch(`${base}/o/token`)).status).toBe(200); // Backends need no Origin header.
  } finally { server.close(); }
});
