import Router from "@koa/router";
import { DialogueController } from "../controllers/dialogueController";

const router = new Router({ prefix: "/dialogue" });
const dialogueController = new DialogueController();

router.post(
  "/generateContent/:baseid",
  dialogueController.getOutlineObject,
  dialogueController.postDialogue
);
router.get("/getOutlineList", dialogueController.getOutlineObject);
router.post("/generateOutline", dialogueController.generateOutline);
router.get("/stop", dialogueController.stopGeneration);

export default router;
