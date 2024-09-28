import { Context } from "koa";
import { BaseService } from "../services/baseService";
import * as fs from "fs";
import * as path from "path";
import { RAGService } from "../services/ragService";

export class BaseController {
  private baseService: BaseService;
  private ragService: RAGService;

  constructor() {
    this.baseService = new BaseService();
    this.ragService = new RAGService();
  }

  getAllBases = async (ctx: Context) => {
    ctx.body = await this.baseService.getAllBases();
  };

  getBaseWithDocuments = async (ctx: Context) => {
    const { baseid } = ctx.params;
    const result = await this.baseService.getBaseWithDocuments(
      parseInt(baseid)
    );
    if (result) {
      ctx.body = result;
    } else {
      ctx.status = 404;
      ctx.body = { error: "Base not found" };
    }
  };

  deleteBase = async (ctx: Context) => {
    const { baseid } = ctx.params;
    await this.baseService.deleteBase(parseInt(baseid));
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
      // mysql创建一条base记录
      const base = await this.baseService.createBase(base_name);

      // 创建文件夹
      const dirPath = path.join(
        process.cwd(),
        "knowledge_base",
        base.id.toString()
      );
      fs.mkdirSync(dirPath, { recursive: true });

      // 初始化FAISS向量数据库
      await this.ragService.getOrCreateVectorStore(base.id);

      ctx.status = 201;
      ctx.body = { id: base.id };
    } catch (error) {
      console.log(error);
      ctx.status = 500;
      ctx.body = { error: "Failed to create base" };
    }
  };
}
