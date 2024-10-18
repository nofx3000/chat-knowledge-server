import { Context, Next } from "koa";
import { DocumentService } from "../services/documentService";
import { RAGService } from "../services/ragService";
import path from "path";
import fs from "fs";
// import { IncomingForm } from "formidable";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document as LangchainDocument } from "langchain/document";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "langchain/document_loaders/fs/text";

const formidable = require("formidable");

export class DocumentController {
  private documentService: DocumentService;
  private ragService: RAGService;

  constructor() {
    this.documentService = new DocumentService();
    this.ragService = new RAGService();
  }

  uploadDocuments = async (ctx: Context, next: Next) => {
    const { baseid } = ctx.params;
    const uploadPath = path.join(process.cwd(), "knowledge_base", baseid);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const form = new formidable.IncomingForm({
      uploadDir: uploadPath,
      keepExtensions: true,
      multiples: true,
    });

    try {
      const { files } = await new Promise<{ fields: any; files: any }>(
        (resolve, reject) => {
          // @ts-ignore
          form.parse(ctx.req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
          });
        }
      );

      const uploadedFiles = Array.isArray(files.files)
        ? files.files
        : [files.files];
      ctx.state.uploadedFiles = uploadedFiles; // 将上传的文件信息存储在 ctx.state 中

      await next(); // 调用下一个中间件
    } catch (error) {
      ctx.status = 400;
      ctx.body = { error: "File upload failed" };
    }
  };

  processDocuments = async (ctx: Context) => {
    const { baseid } = ctx.params;
    const uploadedFiles = ctx.state.uploadedFiles; // 从 ctx.state 中获取上传的文件信息

    if (!uploadedFiles || uploadedFiles.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "No files uploaded" };
      return;
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 20,
      chunkOverlap: 4,
    });

    try {
      for (const file of uploadedFiles) {
        let loader;
        const ext = path.extname(file.originalFilename || "").toLowerCase();
        switch (ext) {
          case ".pdf":
            loader = new PDFLoader(file.filepath);
            break;
          case ".docx":
          case ".doc":
            loader = new DocxLoader(file.filepath);
            break;
          case ".txt":
            loader = new TextLoader(file.filepath);
            break;
          default:
            throw new Error(`Unsupported file type: ${ext}`);
        }

        const docs = await loader.load();
        const chunks = await textSplitter.splitDocuments(docs);

        const documents = chunks.map(
          (chunk) =>
            new LangchainDocument({
              pageContent: chunk.pageContent,
              metadata: {
                ...chunk.metadata,
                source: file.originalFilename,
                baseid: parseInt(baseid),
              },
            })
        );

        await this.ragService.addDocuments(parseInt(baseid), documents);

        await this.documentService.createDocument(
          parseInt(baseid),
          file.originalFilename || "",
          file.filepath
        );
      }

      ctx.body = { message: "Documents uploaded and processed successfully" };
    } catch (error) {
      ctx.status = 400;
      ctx.body = { error: "File processing failed" };
    }
  };

  deleteDocument = async (ctx: Context) => {
    const { bookid } = ctx.params;
    await this.documentService.deleteDocument(parseInt(bookid));
    ctx.status = 204; // No Content
  };
}
