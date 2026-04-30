import { Router } from "express";
import { OidcDiscoveryController } from "./oidcDiscovery.controller";

export const oidcDiscoveryRouter = Router();
const ctrl = new OidcDiscoveryController();

oidcDiscoveryRouter.get("/openid-configuration", ctrl.openidConfiguration);
oidcDiscoveryRouter.get("/jwks.json", ctrl.jwks);
