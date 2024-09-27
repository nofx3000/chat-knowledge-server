import Router from "@koa/router";
import { BaseController } from "../controllers/baseController";

const router = new Router({ prefix: "/base" });
const baseController = new BaseController();

router.get("/", baseController.getAllBases);
router.get("/:baseid", baseController.getBaseById);
router.delete("/:baseid", baseController.deleteBase);
router.post("/", baseController.createBase); // 添加这行

export default router;
