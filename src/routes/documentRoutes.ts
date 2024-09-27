import Router from "@koa/router";
import { DocumentController } from "../controllers/documentController";

const router = new Router();
const documentController = new DocumentController();

router.post("/base/:baseid/books", documentController.createDocument);
router.delete("/books/:bookid", documentController.deleteDocument);

export default router;
