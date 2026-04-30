import { Router } from "express";
import { OidcController } from "./oidcAuth.controller";

export const oidcRouter = Router();
const controller = new OidcController();

oidcRouter.post("/authenticate/register", controller.register.bind(controller));
oidcRouter.post("/authenticate/login", controller.login.bind(controller));
oidcRouter.get("/userinfo", controller.userinfo.bind(controller));
oidcRouter.post("/token", controller.token.bind(controller));
oidcRouter.post("/revoke", controller.revoke.bind(controller));
