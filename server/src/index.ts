import express from "express";
import path from "node:path";
import cors from "cors";
import { oidcRouter } from "./modules/oidcAuth/oidcAuth.routes";
import { thirdPartyRouter } from "./modules/oauth-3rdparty/3rdparty.routes";
import { oidcDiscoveryRouter } from "./modules/oidcDiscovery/oidcDiscovery.routes";

async function main() {
  const app = express();
  const PORT = process.env.PORT ?? 8080;

  app.use(cors());
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

  app.listen(PORT, () => {
    console.log(`server is listening on http://localhost:${PORT}`);
  });
}

main();
