import { Context } from "koa";
import { RAGService } from "../services/ragService";
import path from "path";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { ChatOllama } from "@langchain/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { CommaSeparatedListOutputParser } from "@langchain/core/output_parsers";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { OLLAMA_BASE_URL } from "../config/ollama";

console.log("OLLAMA_BASE_URL:", OLLAMA_BASE_URL);

export class DialogueController {
  private ragService: RAGService;

  constructor() {
    this.ragService = new RAGService();
  }

  getOutlineList = async (ctx: Context, next: () => Promise<void>) => {
    const model = new ChatOllama({
      baseUrl: OLLAMA_BASE_URL,
      model: "qwen2-7b",
    });
    const output_parser = new CommaSeparatedListOutputParser();
    const { question: outline } = ctx.request.body as {
      question: string;
    };
    console.log("Request body:", ctx.request.body);
    const prompt = `我将给你一个研究报告的提纲，请你帮我提取出所有一级标题的提纲内容。
           提纲如下：
           ###
           ${outline}
           ###
           请按照以下格式回复：
          "1.<一级标题1>: 1.1<二级标题1>; 1.2<二级标题2>; ...", "2.<一级标题2>: 2.1<二级标题1>; 2.2<二级标题2>; ...", ...",
           `;
    try {
      const outlineArrayString = await model.invoke(prompt);
      const outlineArray = await output_parser.invoke(outlineArrayString);
      console.log(outlineArray);
      // 将结果存储在 ctx.state 中，供后续中间件使用
      ctx.state.outlineArray = outlineArray;
      // 调用下一个中间件
      await next();
    } catch (error) {
      console.error("Error in getOutlineList:", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to process outline" };
    }
  };

  postDialogue = async (ctx: Context) => {
    try {
      console.log("Ctx.outlineArray:", ctx.state.outlineArray);
      const outlineArray = ctx.state.outlineArray;
      console.log("Received request for dialogue:", ctx.params.baseid);
      const { baseid } = ctx.params;

      ctx.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      ctx.status = 200;

      for (const outline of outlineArray) {
        await this.generateContent({
          ctx,
          baseid,
          outline,
        });
        ctx.res.write(`data: ${JSON.stringify({ token: "\n" })}\n\n`);
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
      baseUrl: OLLAMA_BASE_URL,
      model: "bge-large-embed",
    });

    // 加载 HNSWLib 向量数据库
    const vectorStore = await HNSWLib.load(vectorDbPath, embeddings);

    // 创建检索器
    const retriever = vectorStore.asRetriever();

    // 初始化 ChatOllama 模型
    const model = new ChatOllama({
      baseUrl: OLLAMA_BASE_URL,
      model: "qwen2-7b", // 或者您使用的其他模型名称
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
      // returnSourceDocuments: true,
    });

    const stream = await chain.stream({
      question: `你是一位中国的军事地理研究专家，下面给你一段军事地理研究报告某一段落的提纲，请你对其内容进行扩写。
           提纲如下：
           ###
           ${outline}
           ###

           请按照以下格式进行撰写:
           ###
           1.一级标题
             内容......
           1.1 二级标题
             内容......
           1.2 二级标题
             内容......
           1.3 二级标题
             内容....
           ###

           要求：1.这部分内容字数为2000个左右中文简体汉字。
                2.严格按照提纲，不要擅自修改或添加标题，不要擅自添加小标题或划分段落。
                3.只给出实质性内容，不需要过渡性语言。
                4.不要写结论，不要做总结、写结语，不要使用"综上所述"、"总之"等词汇。
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

  generateOutline = async (ctx: Context) => {
    try {
      const { question: title } = ctx.request.body as { question: string };
      console.log("title:", title);

      // 初始化 ChatOllama 模型
      const model = new ChatOllama({
        baseUrl: OLLAMA_BASE_URL,
        model: "qwen2-7b",
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
      你是一位专业的军事地理研究专家，请你仿照下面给出的提纲示例的写作风格，帮我生成一份关于"${title}"的研究报告提纲。
      提纲示例1:
      ###
      1.萨赫勒地区地缘环境分析
          1.1 地理环境
          1.2 人文环境
      2.萨赫勒地区恐怖主义发展现状
          2.1 恐怖势力构成复杂，内部对抗激烈
          2.2 恐怖组织本土融合，控制能力增强
          2.3 恐怖组织跨国犯罪，活动区域延伸
      3.萨赫勒地区恐怖组织肆虐的原因分析
          3.1 地理位置独特，成为恐怖组织繁衍温床
          3.2 经济严重贫困，恐怖主义持续扩散影响
          3.3 政治治理脆弱，恐怖组织难以彻底遏制
      4.萨赫勒地区恐怖主义发展对我影响
          4.1 动荡局势威胁我国在非的海外利益
          4.2 积极推进反恐提高我国国际影响力
      ###
      要求：
      1. 提纲应包含5个主要章节（一级标题），每个章节下设2-3个二级标题
      2. 一级标题使用数字编号（1、2、3...），二级标题使用小数点编号（1.1、1.2、1.3...）
      3. 不设立结论或展望相关的章节
      4. 提纲结构要清晰，逻辑性强，涵盖主题的各个重要方面
      5. 提纲内容要专业、严谨，符合学术研究报告的标准
      6. 每个标题都应简洁明了，不超过20个字
      7. 确保提纲的深度和广度足以支撑一份8000-10000字的研究报告
      8. 输出不使用markdown格式

      请按照以下格式输出：
      1. 一级标题1
        1.1 二级标题1
        1.2 二级标题2
        ...
      2. 一级标题2
        2.1 二级标题1
        2.2 二级标题2
        ...`;

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
}
