import { ChatOllama } from "@langchain/ollama";
import { QWEN_URL, QWEN_MODEL, DEEPSEEK_MODEL, DEEPSEEK_URL, DEEPSEEK_API_KEY, DEEPSEEK_API_URL, EMBED_MODEL, EMBED_URL } from "../config/ollama";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Context } from "koa";
import { BaseLLM, BaseLLMCallOptions } from "@langchain/core/language_models/llms";
import { CallbackManagerForLLMRun, Callbacks } from "@langchain/core/callbacks/manager";
import { GenerationChunk, LLMResult } from "@langchain/core/outputs";
// import fetch from "node-fetch";

class CustomLLM extends BaseLLM<BaseLLMCallOptions> {
    // 类属性
    apiKey: string;
    apiUrl: string;
    model: string;
    temperature: number;
    streaming: boolean; // 是否启用流式模式
    callbacks?: Callbacks; // 使用 Callbacks 类型

    // 必需字段
    static lc_name() {
        return "CustomLLM";
    }

    get lc_secrets() {
        return { apiKey: "DEEPSEEK_API_KEY" }; // 用于安全存储密钥
    }

    // 初始化配置
    constructor({
        apiKey,
        apiUrl,
        model = "deepseek-chat",
        temperature = 0.7,
        streaming = false, // 默认关闭流式模式
        callbacks, // 回调函数
    }: {
        apiKey: string;
        apiUrl: string;
        model?: string;
        temperature?: number;
        streaming?: boolean;
        callbacks?: Callbacks; // 使用 Callbacks 类型
    }) {
        super({ callbacks }); // 将 callbacks 传递给父类
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.model = model;
        this.temperature = temperature;
        this.streaming = streaming;
        this.callbacks = callbacks;
    }

    // 实现 _generate 方法
    async _generate(
        prompts: string[],
        options: this["ParsedCallOptions"],
        runManager?: CallbackManagerForLLMRun
    ): Promise<LLMResult> {
        const generations = [];

        for (const prompt of prompts) {
            if (this.streaming) {
                // 流式模式
                const stream = this._streamResponse(prompt, runManager, options.signal);
                let finalText = "";
                for await (const chunk of stream) {
                    finalText += chunk.text;
                }
                generations.push([{ text: finalText }]);
            } else {
                // 非流式模式
                const text = await this._makeApiRequest(prompt, runManager);
                generations.push([{ text }]);
            }
        }

        return { generations };
    }

    // 发起 API 请求
    private async _makeApiRequest(
        prompt: string,
        runManager?: CallbackManagerForLLMRun
    ): Promise<string> {
        const url = this.apiUrl;
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
        };
        const body = {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: this.temperature,
            stream: false, // 非流式模式
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices[0].message.content;

            // 触发回调函数
            await runManager?.handleLLMNewToken(text);

            return text;
        } catch (error) {
            console.error("API请求失败:", error);
            throw error;
        }
    }

    // 流式响应
    private async *_streamResponse(
        prompt: string,
        runManager?: CallbackManagerForLLMRun,
        signal?: AbortSignal
    ): AsyncGenerator<GenerationChunk> {
        const url = this.apiUrl;
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
        };
        const body = {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: this.temperature,
            stream: true, // 启用流式模式
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body),
                signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 确保 response.body 是 ReadableStream
            if (!response.body) {
                throw new Error("无法读取流式响应");
            }

            const reader = response.body.getReader(); // 使用 getReader
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                // 检查 signal.aborted
                if (signal?.aborted) {
                    throw new Error("Generation aborted in CustomLLM _streamResponse while loop");
                }

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // 保留未完成的行供下次处理

                for (const line of lines) {
                    if (line.trim() === "") continue;
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6); // 去掉 "data: " 前缀
                        if (data === "[DONE]") break;
                        
                        const parsedData = JSON.parse(data);
                        // const text = parsedData.choices[0].delta["content"] || parsedData.choices[0].delta["reasoning_content"];
                        const text = parsedData.choices[0].delta["content"] || "";

                        // 生成流式块
                        const chunk = new GenerationChunk({ text });
                        yield chunk;

                        // 触发回调函数
                        await runManager?.handleLLMNewToken(text);
                    }
                }
            }
        } catch (error) {
            if (signal?.aborted) {
                throw new Error("Generation aborted in CustomLLM _streamResponse error catch");
            }
            console.error("流式请求失败:", error);
            throw error;
        }
    }

    // 标识模型类型
    _llmType() {
        return "deepseek";
    }
}

export class ModelService {
    private static instance: ModelService;
    private abortController: AbortController | null = null;

    private constructor() { }

    public static getInstance(): ModelService {
        if (!ModelService.instance) {
            ModelService.instance = new ModelService();
        }
        return ModelService.instance;
    }

    public createOutlineModel(ctx: Context) {
        return new ChatOllama({
            baseUrl: QWEN_URL,
            model: QWEN_MODEL,
            streaming: true,
            callbacks: [
                {
                    async handleLLMNewToken(token) {
                        ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    },
                },
            ],
        });
    }

    public createJsonModel() {
        return new ChatOllama({
            baseUrl: QWEN_URL,
            model: QWEN_MODEL,
            temperature: 0,
        });
    }

    public createContentModel(ctx: Context, signal: AbortSignal) {
        return new ChatOllama({
            baseUrl: DEEPSEEK_URL,
            model: DEEPSEEK_MODEL,
            streaming: true,
            callbacks: [
                {
                    async handleLLMNewToken(token) {
                        if (signal.aborted) {
                            throw new Error("Generation aborted in createContentModel");
                        }
                        ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    },
                },
            ],
        });
    }

    public async createContentModel_silliconFlow(ctx: Context, signal: AbortSignal) {
        return new CustomLLM({
            apiKey: DEEPSEEK_API_KEY,
            apiUrl: DEEPSEEK_API_URL,
            model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B",
            streaming: true,
            callbacks: [
                {
                    async handleLLMNewToken(token) {
                        if (signal.aborted) {
                            throw new Error("Generation aborted in createContentModel_silliconFlow");
                        }
                        ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
                        await new Promise((resolve) => setTimeout(resolve, 0));
                    },
                },
            ],
        });
    }


    public createEmbedModel() {
        return new OllamaEmbeddings({
            baseUrl: EMBED_URL,
            model: EMBED_MODEL,
        });
    }

    public setAbortController(controller: AbortController) {
        this.abortController = controller;
    }

    public getAbortController() {
        return this.abortController;
    }

    public clearAbortController() {
        this.abortController = null;
    }
}

export default ModelService.getInstance(); 