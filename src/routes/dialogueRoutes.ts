import Router from "@koa/router";
import { DialogueController } from "../controllers/dialogueController";

const router = new Router();
const dialogueController = new DialogueController();

router.post("/dialogue/:baseid", dialogueController.processDialogue);

export default router;
