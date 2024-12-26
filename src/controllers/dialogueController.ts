import { Context } from "koa";
import { RAGService } from "../services/ragService";
import path from "path";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { CommaSeparatedListOutputParser } from "@langchain/core/output_parsers";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OLLAMA_BASE_URL, TEXT_MODEL, EMBED_MODEL } from "../config/ollama";
import { JsonOutputParser } from "@langchain/core/output_parsers";

console.log("OLLAMA_BASE_URL:", OLLAMA_BASE_URL);

export class DialogueController {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  getOutlineObject = async (ctx: Context, next: () => Promise<void>) => {
    const model = new ChatOllama({
      baseUrl: OLLAMA_BASE_URL,
      model: TEXT_MODEL,
      temperature: 0,
    });

    const parser = new JsonOutputParser();

    const { payload } = ctx.request.body as {
      payload: Record<string, any>;
    };

    console.log("======================", payload.outline);

    const prompt = `我将给你一个研究报告的提纲，请你提取出所有标题的内容并转换为JSON格式。
           提纲如下：
           ###
           ${payload.outline}
           ###
           
           请按照以下JSON格式回复（注意：直接输出JSON字符串，不要有其他内容）：
           {
             "chapters": [
               {
                 "level": 1,
                 "title": "一级标题内容",
                 "number": "1",
                 "subChapters": [
                   {
                     "level": 2,
                     "title": "二级标题内容",
                     "number": "1.1",
                     "subChapters": [
                       {
                         "level": 3,
                         "title": "三级标题内容",
                         "number": "(一)"
                       }
                     ]
                   }
                 ]
               },
               {
                  .....
               },
               {
                  .....
               }
               .....
             ]
           }

           严格要求：
           1. 严格按照提供的JSON格式输出
           2. 一级标题编号使用1、2、3...
           3. 二级标题编号使用1.1、1.2、1.3...
           4. 三级标题编号使用(一)、(二)、(三)...
           5. 保持原提纲中的标题层级关系
           6. 必须完整输出所有章节，严禁使用"其他章节"进行省略
           7. 不要添加额外的说明文字，只输出JSON
           8. 确保输出的JSON包含提纲中的所有标题，不得遗漏或简化
           `;

    try {
      const outlineString = await model.invoke(prompt);
      console.log("#####outlineString#######", outlineString);
      // 解析JSON字符串为对象
      const outlineObject = await parser.parse(outlineString.content as string);

      // 将结果存储在 ctx.state 中
      ctx.state.outlineObject = outlineObject;
      await next();
    } catch (error) {
      console.error("Error in getOutlineObject:", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to process outline" };
    }
  };

  generateOutline = async (ctx: Context) => {
    try {
      const { payload } = ctx.request.body as { payload: Record<string, any> };
      console.log("payload:", payload);

      // 初始化 ChatOllama 模型
      const model = new ChatOllama({
        baseUrl: OLLAMA_BASE_URL,
        model: TEXT_MODEL,
        streaming: true,
        callbacks: [
          {
            async handleLLMNewToken(token) {
              // console.log("Token received:", token);
              ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
              await new Promise((resolve) => setTimeout(resolve, 0));
            },
          },
        ],
      });

      const prompt = `
      你是一位${payload.contentType}领域专家，请你帮我生成一份关于"${payload.title}"的文章提纲
      要求：
      ###
      ${payload.requirements}
      ###

      请按照以下格式输出：
      ###
      1. 一级标题1
        1.1 二级标题1
          (一) 三级标题1
          (二) 三级标题2
          (三) 三级标题3
          ...
        1.2 二级标题2
          (一) 三级标题1
          (二) 三级标题2
          (三) 三级标题3
          ...
      2. 一级标题2
        2.1 二级标题1
          (一) 三级标题1
          (二) 三级标题2
          (三) 三级标题3
          ...
        2.2 二级标题2
          (一) 三级标题1
          (二) 三级标题2
          (三) 三级标题3
          ...
      ###  
          `;

      ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      ctx.status = 200;

      const response = await model.invoke(prompt);
      console.log(response);
      ctx.res.write("data: [DONE]\n\n");
      ctx.res.end();
    } catch (error) {
      console.error("Error in generateOutline:", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to generate outline" };
    }
  };

  postDialogue = async (ctx: Context) => {
    try {
      console.log("Ctx.outlineObject:", ctx.state.outlineObject);
      const outlineObject = ctx.state.outlineObject;
      console.log("Received request for dialogue:", ctx.params.baseid);
      const { baseid } = ctx.params;

      ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      ctx.status = 200;

      // 定义深度优先遍历函数
      const dfsTraverse = async (node: any) => {
        // 输出当前节点的标题
        console.log(`Level ${node.level}: ${node.title}`);

        // 只撰写3级标题内容
        if (node.level === 3) {
          await this.generateContent({
            ctx,
            baseid,
            outline: node.title,
          });
          ctx.res.write(`data: ${JSON.stringify({ token: "\n" })}\n\n`);
        }

        // 如果有子章节，递归处理
        if (node.subChapters && node.subChapters.length > 0) {
          for (const subChapter of node.subChapters) {
            await dfsTraverse(subChapter);
          }
        }
      };

      // 遍历所有章节
      for (const chapter of outlineObject.chapters) {
        await dfsTraverse(chapter);
      }

      ctx.res.write("data: [DONE]\n\n");
      ctx.res.end();
    } catch (error) {
      console.error("Error in postDialogue:", error);
      ctx.status = 500;
      ctx.body = { error: "Internal server error" };
    }
  };

  private generateContent = async ({
    ctx,
    baseid,
    outline,
  }: {
    ctx: Context;
    baseid: string;
    outline: string;
  }) => {
    console.log("开始生成提纲内容：", outline);

    const { chat_history, payload } = ctx.request.body as {
      chat_history: [string, string][];
      payload: Record<string, any>;
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
      baseUrl: OLLAMA_BASE_URL,
      model: EMBED_MODEL,
    });

    // 加载 HNSWLib 向量数据库
    const vectorStore = await HNSWLib.load(vectorDbPath, embeddings);

    // 创建检索器
    const retriever = vectorStore.asRetriever();

    // 初始化 ChatOllama 模型
    const model = new ChatOllama({
      baseUrl: OLLAMA_BASE_URL,
      model: TEXT_MODEL, // 或者您使用的其他模型名称
      streaming: true,
      callbacks: [
        {
          async handleLLMNewToken(token) {
            // console.log("Token received:", token);
            ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
            await new Promise((resolve) => setTimeout(resolve, 0));
          },
        },
      ],
    });

    // 创建对话检索链
    const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
      returnSourceDocuments: true,
    });

    await chain.stream({
      question: `你是一位${payload.contentType}专家，请你帮我撰写一段${payload.contentType}文章的段落，标题为${outline}。
           要求：1.这部分内容字数为500个左右中文简体汉字。
                2.不要擅自修改或添加标题，不要擅自添加小标题或划分段落。
                3.只给出实质性内容，不需要过渡性语言。
                4.不要写结论，不做总结、写结语，不要使用"综上所述"、"总之"等词汇。
                5.内容不要有列表。
                6.请适当从资料中筛选具体示例添加到文内。
                8.生成的内容不要使用markdown格式。
                9.不添加参考文献。
           `,
      chat_history: chat_history,
    });

    // 注意：这部分代码被注释掉了，如果您想使用流式响应，可以取消注释
    // for await (const chunk of stream) {
    //   if (chunk) {
    //     console.log("Chunk received:", chunk);
    //     ctx.res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    //     await new Promise((resolve) => setTimeout(resolve, 0));
    //   }
    // }
  };
}
