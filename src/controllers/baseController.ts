import { Context } from "koa";
import { DocumentService } from "../services/documentService";
import * as fs from "fs";
import * as path from "path";

export class BaseController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  getAllBases = async (ctx: Context) => {
    ctx.body = await this.documentService.getAllBases();
  };

  getBaseById = async (ctx: Context) => {
    const { baseid } = ctx.params;
    ctx.body = await this.documentService.getBaseById(parseInt(baseid));
  };

  deleteBase = async (ctx: Context) => {
    const { baseid } = ctx.params;
    await this.documentService.deleteBase(parseInt(baseid));
    ctx.status = 204; // No Content
  };

  createBase = async (ctx: Context) => {
    const { base_name } = (ctx.request as any).body;

    if (!base_name) {
      ctx.status = 400;
      ctx.body = { error: "base_name is required" };
      return;
    }

    try {
      const base = await this.documentService.createBase(base_name);

      // 创建文件夹
      const dirPath = path.join(
        process.cwd(),
        "knowledge_base",
        base.id.toString()
      );
      fs.mkdirSync(dirPath, { recursive: true });

      ctx.status = 201;
      ctx.body = { id: base.id };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Failed to create base" };
    }
  };
}
