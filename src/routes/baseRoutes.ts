import Router from "@koa/router";
import { BaseController } from "../controllers/baseController";
import { DocumentController } from "../controllers/documentController";

const router = new Router({ prefix: "/base" });
const baseController = new BaseController();
const documentController = new DocumentController();

router.get("/", baseController.getAllBases);
router.get("/:baseid", baseController.getBaseWithDocuments);
router.delete("/:baseid", baseController.deleteBase);
router.post("/", baseController.createBase);

// 向指定知识库上传资料
router.post(
  "/:baseid/books",
  documentController.uploadDocuments,
  documentController.processDocuments
);

export default router;
