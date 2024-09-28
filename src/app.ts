import Koa from "koa";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import baseRoutes from "./routes/baseRoutes";
import documentRoutes from "./routes/documentRoutes";
import dialogueRoutes from "./routes/dialogueRoutes";
import sequelize from "./config/database";

const app = new Koa();

// 启用跨域，允许所有来源
app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
    ],
    credentials: true,
  })
);

app.use(bodyParser());

// 初始化数据库连接
(async () => {
  await sequelize.sync();
})();

// 使用路由
app.use(baseRoutes.routes()).use(baseRoutes.allowedMethods());
app.use(documentRoutes.routes()).use(documentRoutes.allowedMethods());
app.use(dialogueRoutes.routes()).use(dialogueRoutes.allowedMethods());

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
