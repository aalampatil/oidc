import { Router } from "express";
import { OidcController } from "./oidcAuth.controller";
import { emailVerificationRouter, verificationSendLimiter } from "../emailVerification/emailVerification.routes";
import { accountRouter } from "../account/account.routes";

export const oidcRouter = Router();
const controller = new OidcController();
oidcRouter.use("/account", accountRouter);

oidcRouter.use("/authenticate/email-verification", emailVerificationRouter);
oidcRouter.post("/authenticate/register", verificationSendLimiter, controller.register.bind(controller));
oidcRouter.post("/authenticate/login", controller.login.bind(controller));
oidcRouter.get("/userinfo", controller.userinfo.bind(controller));
oidcRouter.post("/token", controller.token.bind(controller));
oidcRouter.post("/revoke", controller.revoke.bind(controller));
