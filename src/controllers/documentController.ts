import { Context } from "koa";
import { DocumentService } from "../services/documentService";
import { RAGService } from "../services/ragService";

export class DocumentController {
  private documentService: DocumentService;
  private ragService: RAGService;

  constructor() {
    this.documentService = new DocumentService();
    this.ragService = new RAGService();
  }

  createDocument = async (ctx: Context) => {
    const { baseid } = ctx.params;
    const { title, filePath } = (ctx.request as any).body as {
      title: string;
      filePath: string;
    };
    const document = await this.documentService.createDocument(
      parseInt(baseid),
      title,
      filePath
    );
    await this.ragService.addDocument(document);
    ctx.body = document;
  };

  deleteDocument = async (ctx: Context) => {
    const { bookid } = ctx.params;
    await this.documentService.deleteDocument(parseInt(bookid));
    ctx.status = 204; // No Content
  };
}
