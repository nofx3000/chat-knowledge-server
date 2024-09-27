import { Context } from "koa";
import { RAGService } from "../services/ragService";

export class DialogueController {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  processDialogue = async (ctx: Context) => {
    const { baseid } = ctx.params;
    const { query } = (ctx.request as any).body as { query: string };
    const response = await this.ragService.searchSimilarDocuments(
      parseInt(baseid),
      query
    );
    ctx.body = response;
  };
}
