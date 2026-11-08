import "dotenv/config";
import { env } from "./env.js";
import express from "express";
import path from "node:path";
import { createProviderCors } from "./utils/http-cors";
import { oidcRouter } from "./modules/oidcAuth/oidcAuth.routes";
import { thirdPartyRouter } from "./modules/oauth-3rdparty/3rdparty.routes";
import { oidcDiscoveryRouter } from "./modules/oidcDiscovery/oidcDiscovery.routes";
import { db } from "./db/index";
import { authCodesTable, emailVerificationsTable, oauthClientsTable, refreshTokensTable, usersTable } from "./db/schema";
import { apiErrorHandler, getDatabaseErrorCode } from "./utils/api-error";

async function main() {
  // Check connectivity and migrated columns before accepting authentication requests.
  await Promise.all([
    db.select().from(usersTable).limit(0),
    db.select().from(oauthClientsTable).limit(0),
    db.select().from(authCodesTable).limit(0),
    db.select().from(refreshTokensTable).limit(0),
    db.select().from(emailVerificationsTable).limit(0),
  ]);
  const app = express();
  if (env.TRUST_PROXY_HOPS > 0) app.set("trust proxy", env.TRUST_PROXY_HOPS);
  const PORT = env.PORT;

  app.use(createProviderCors(env.allowedOrigins));
  app.use(express.json());
  app.use(express.static(path.resolve("public")));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (req, res) => res.json({ message: "Hello from Auth Server" }));

  app.get("/health", (req, res) =>
    res.json({ message: "Server is healthy", healthy: true }),
  );

  app.use("/.well-known", oidcDiscoveryRouter);
  app.use("/o", oidcRouter);
  app.use("/o/3rd-party-client", thirdPartyRouter);
  app.use(apiErrorHandler);

  app.listen(PORT, () => {
    console.log(`Authentication server listening on port ${PORT}; issuer ${env.ISSUER_URL}`);
  });
}

main().catch((error: unknown) => {
  console.error("Authentication server could not start.", {
    code: getDatabaseErrorCode(error) ?? "startup_error",
    message: "Check DATABASE_URL, start PostgreSQL, and run bun run db:migrate from server/.",
  });
  process.exit(1);
});
