import Koa from "koa";
import bodyParser from "koa-bodyparser";
import baseRoutes from "./routes/baseRoutes";
import documentRoutes from "./routes/documentRoutes";
import dialogueRoutes from "./routes/dialogueRoutes";
import sequelize from "./config/database";
import { RAGService } from "./services/ragService";
import { DocumentService } from "./services/documentService";

const app = new Koa();
const ragService = new RAGService();
const documentService = new DocumentService();

app.use(bodyParser());

// 初始化数据库连接和向量存储
(async () => {
  await sequelize.sync();
  const allDocuments = await documentService.getAllDocuments();
  await ragService.initializeVectorStore(allDocuments);
})();

// 使用路由
app.use(baseRoutes.routes()).use(baseRoutes.allowedMethods());
app.use(documentRoutes.routes()).use(documentRoutes.allowedMethods());
app.use(dialogueRoutes.routes()).use(dialogueRoutes.allowedMethods());

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
