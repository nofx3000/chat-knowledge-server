import { Context, Next } from "koa";
import { DocumentService } from "../services/documentService";
import { RAGService } from "../services/ragService";
import multer from "@koa/multer";
import path from "path";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document as LangchainDocument } from "langchain/document";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { TextLoader } from "langchain/document_loaders/fs/text";

export class DocumentController {
  private documentService: DocumentService;
  private ragService: RAGService;

  constructor() {
    this.documentService = new DocumentService();
    this.ragService = new RAGService();
  }

  uploadDocuments = async (ctx: Context, next: Next) => {
    const { baseid } = ctx.params;
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), "knowledge_base", baseid);
        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        cb(null, Buffer.from(file.originalname, "latin1").toString("utf8"));
      },
    });
    const upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (
          ext !== ".txt" &&
          ext !== ".pdf" &&
          ext !== ".doc" &&
          ext !== ".docx"
        ) {
          return cb(
            new Error("Only txt, pdf, doc, docx files are allowed"),
            false
          );
        }
        cb(null, true);
      },
    });
    try {
      await upload.array("files")(ctx, next);
    } catch (error) {
      ctx.status = 400;
      ctx.body = { error };
    }
  };

  processDocuments = async (ctx: Context) => {
    const { baseid } = ctx.params;
    const files = ctx.request.files as any;
    console.log("------------------in uploadfiles", files);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 20,
      chunkOverlap: 4,
    });
    for (const file of files) {
      console.log("___++++++_____", file.path);
      let loader;
      const ext = path.extname(file.originalname).toLowerCase();
      switch (ext) {
        case ".pdf":
          loader = new PDFLoader(file.path);
          break;
        case ".docx":
        case ".doc":
          loader = new DocxLoader(file.path);
          break;
        case ".txt":
          loader = new TextLoader(file.path);
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
              source: Buffer.from(file.originalname, "latin1").toString("utf8"),
              baseid: parseInt(baseid),
            },
          })
      );
      // 资料内容添加到向量数据库
      await this.ragService.addDocuments(parseInt(baseid), documents);

      // 资料信息添加到mysql数据库
      await this.documentService.createDocument(
        parseInt(baseid),
        Buffer.from(file.originalname, "latin1").toString("utf8"),
        file.path
      );
    }

    ctx.body = { message: "Documents uploaded and processed successfully" };
  };

  deleteDocument = async (ctx: Context) => {
    const { bookid } = ctx.params;
    await this.documentService.deleteDocument(parseInt(bookid));
    ctx.status = 204; // No Content
  };
}
