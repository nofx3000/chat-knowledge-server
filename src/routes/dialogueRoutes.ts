import Router from "@koa/router";
import { DialogueController } from "../controllers/dialogueController";

const router = new Router({ prefix: "/dialogue" });
const dialogueController = new DialogueController();

router.post("/:baseid", dialogueController.postDialogue);

export default router;
