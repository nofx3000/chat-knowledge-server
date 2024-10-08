import { Context } from "koa";
import { RAGService } from "../services/ragService";
import path from "path";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ConversationalRetrievalQAChain } from "langchain/chains";
export class DialogueController {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  postDialogue = async (ctx: Context) => {
    console.log("Received request for dialogue:", ctx.params.baseid);
    console.log("Request body:", ctx.request.body);

    try {
      const { baseid } = ctx.params;
      const { chat_history, question } = ctx.request.body as {
        chat_history: [string, string][];
        question: string;
      };

      // 获取向量数据库路径
      const vectorDbPath = path.join(
        process.cwd(),
        "knowledge_base",
        baseid,
        `db_index_${baseid}`
      );

      // 初始化 OllamaEmbeddings
      const embeddings = new OllamaEmbeddings({
        baseUrl: "http://127.0.0.1:11434",
        model: "bge-large-embed",
      });

      // 加载 FAISS 向量数据库
      const vectorStore = await FaissStore.load(vectorDbPath, embeddings);

      // 创建检索器
      const retriever = vectorStore.asRetriever();
      // 初始化 ChatOllama 模型
      const model = new ChatOllama({
        baseUrl: "http://127.0.0.1:11434",
        model: "qwen2-7b", // 或者您使用的其他模型名称
        streaming: true,
        callbacks: [
          {
            async handleLLMNewToken(token) {
              console.log("???????????????????????????", token);
              ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
              await new Promise((resolve) => setTimeout(resolve, 0));
              // streamedResponse += token;
            },
          },
        ],
      });

      // 创建对话检索链
      const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
        // returnSourceDocuments: true,
      });

      ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      ctx.status = 200;

      const stream = await chain.stream({
        question: question,
        chat_history: chat_history,
      });

      // for await (const chunk of stream) {
      //   if (chunk) {
      //     console.log("------------", chunk);
      //     ctx.res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      //     await new Promise((resolve) => setTimeout(resolve, 0));
      //   }
      // }

      ctx.res.write("data: [DONE]\n\n");
      ctx.res.end();
    } catch (error) {
      console.error("Error in postDialogue:", error);
      ctx.status = 500;
      ctx.body = { error: "Internal server error" };
    }
  };
}
