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
  private abortController: AbortController | null = null;

  constructor() {
    this.ragService = new RAGService();
  }

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
           以下面模版进行输出
           模版如下
           ###
{"1.十四五规划背景与目标":{"1.1前期经济形势分析":["(一)国内经济增长趋势","(二)国际环境变化影响","(三)民生需求现状调研"],"1.2规划核心目标设定":["(一)经济发展目标解析","(二)社会发展指标梳理","(三)生态环境保护策略"]},"2.十四五规划主要任务实施情况":{"2.1科技创新推进状况":["(一)国家重大科技项目进展","(二)创新平台建设成效","(三)产学研合作模式探索"],"2.2民生福祉提升举措":["(一)医疗卫生体系改革成果","(二)教育公平推进措施","(三)就业创业支持政策落实"]},"3.十四五规划重点领域进展评估":{"3.1农业农村现代化建设":["(一)耕地保护与土地流转机制","(二)现代农业产业体系构建","(三)农村人居环境改善措施"],"3.2基础设施建设情况":["(一)交通网络优化进展","(二)水利设施更新改造","(三)能源供应安全保障"]},"4.十四五规划政策支持与保障措施":{"4.1资金投入与资源配置":["(一)中央财政预算安排","(二)地方政府配套资金落实","(三)多元化融资渠道建设"],"4.2法律法规及政策环境":["(一)相关法律法规制定实施","(二)政策协调机制建立运行","(三)社会公众参与度分析"]},"5.十四五规划执行效果与问题反思":{"5.1效果评估方法选取":["(一)经济增长贡献度测量","(二)环境保护成效评价","(三)民生改善满意度调查"],"5.2存在的主要问题及原因分析":["(一)科技创新不足的原因探讨","(二)民生需求未完全满足的成因分析","(三)基础设施短板识别与对策建议"]}}
           ###
           提纲如下：
           ###
           ${payload.outline}
           ###
           `;

    try {
      const outlineString = await model.invoke(prompt);
      // 解析JSON字符串为对象
      const outlineObject = await parser.parse(outlineString.content as string);
      console.log("#####outlineObject#######", JSON.stringify(outlineString));

      // 将结果存储在 ctx.state 中
      ctx.state.outlineObject = outlineObject;
      await next();
    } catch (error) {
      console.error("Error in getOutlineObject:", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to process outline" };
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
      const dfsTraverse = async (obj: any, level: number = 1) => {
        for (const [key, value] of Object.entries(obj)) {
          // 输出当前节点的标题
          console.log(`Level ${level}: ${key}`);
          console.log(`value : ${value}`);
          ctx.res.write(
            `data: ${JSON.stringify({ token: key.trim() + "\n\n" })}\n\n`
          );
          if (Array.isArray(value)) {
            // 处理三级标题（数组）
            for (const title of value) {
              console.log(`Level 3: ${title}`);
              ctx.res.write(
                `data: ${JSON.stringify({ token: title.trim() + "\n\n" })}\n\n`
              );
              // 只对三级标题生成内容
              await this.generateContent({
                ctx,
                baseid,
                outline: title,
              });
              ctx.res.write(`data: ${JSON.stringify({ token: "\n\n" })}\n\n`);
            }
          } else if (typeof value === "object" && value !== null) {
            // 处理二级标题（对象）
            await dfsTraverse(value, level + 1);
          }
        }
      };

      // 开始遍历
      await dfsTraverse(outlineObject);

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
    try {
      // 创建新的中止控制器
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

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

      // 初始化 ChatOllama 模型时添加 signal
      const model = new ChatOllama({
        baseUrl: OLLAMA_BASE_URL,
        model: TEXT_MODEL,
        streaming: true,
        callbacks: [
          {
            async handleLLMNewToken(token) {
              if (signal.aborted) {
                throw new Error("Generation aborted");
              }
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
                2.直接输出内容，不要重复标题。
                3.不要擅自修改或添加标题，不要擅自添加小标题或划分段落。
                4.只给出实质性内容，不需要过渡性语言。
                5.不要写结论，不做总结、写结语，不要使用"综上所述"、"总之"等词汇。
                6.内容不要有列表。
                7.请适当从资料中筛选具体示例添加到文内。
           `,
        chat_history: chat_history,
        signal,
      });

      // 注意：这部分码被注释掉了，如果您想使用流式响应，可以取消注释
      // for await (const chunk of stream) {
      //   if (chunk) {
      //     console.log("Chunk received:", chunk);
      //     ctx.res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      //     await new Promise((resolve) => setTimeout(resolve, 0));
      //   }
      // }
    } catch (error) {
      if ((error as any).message === "Generation aborted") {
        console.log("Generation was aborted");
        ctx.res.write(
          `data: ${JSON.stringify({ token: "\n\n[已停止生成]" })}\n\n`
        );
      } else {
        console.error("Error in generateContent:", error);
        throw error;
      }
    } finally {
      this.abortController = null;
    }
  };

  // 添加停止生成的方法
  stopGeneration = async (ctx: Context) => {
    try {
      if (this.abortController) {
        this.abortController.abort();
        ctx.status = 200;
        ctx.body = { message: "Generation stopped" };
      } else {
        ctx.status = 400;
        ctx.body = { error: "No active generation to stop" };
      }
    } catch (error) {
      console.error("Error stopping generation:", error);
      ctx.status = 500;
      ctx.body = { error: "Failed to stop generation" };
    }
  };
}
