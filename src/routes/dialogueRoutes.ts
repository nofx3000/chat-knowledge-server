import Router from "@koa/router";
import { DialogueController } from "../controllers/dialogueController";

const router = new Router({ prefix: "/dialogue" });
const dialogueController = new DialogueController();

router.post(
  "/generateContent/:baseid",
  dialogueController.getOutlineList,
  dialogueController.postDialogue
);
router.get("/getOutlineList", dialogueController.getOutlineList);
router.post("/generateOutline", dialogueController.generateOutline);

export default router;
