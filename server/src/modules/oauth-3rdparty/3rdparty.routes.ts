import { Router } from "express";
import { ThirdPartyController } from "./3rdparty.controller";

export const thirdPartyRouter = Router();
const controller = new ThirdPartyController();

thirdPartyRouter.post("/register", controller.register.bind(controller));
thirdPartyRouter.get("/authorize", controller.getAuthorize.bind(controller));
thirdPartyRouter.post("/authorize", controller.postAuthorize.bind(controller));
thirdPartyRouter.get("/:clientId", controller.getClient.bind(controller));
