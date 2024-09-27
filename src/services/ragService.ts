import { OllamaEmbeddings } from "@langchain/ollama";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document } from "../models/Document";
import * as fs from "fs/promises";

export class RAGService {
  private embeddings: OllamaEmbeddings;
  private vectorStore: FaissStore | null = null;

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      //   baseUrl: "http://localhost:11434", // 确保这是您的Ollama服务器地址
      model: "bge-large-embed", // 使用您想要的模型
    });
  }

  async initializeVectorStore(documents: Document[]): Promise<void> {
    const texts = await Promise.all(
      documents.map((doc) => fs.readFile(doc.filePath, "utf-8"))
    );
    const metadatas = documents.map((doc) => ({
      title: doc.title,
      id: doc.id,
    }));

    this.vectorStore = await FaissStore.fromTexts(
      texts,
      metadatas,
      this.embeddings
    );
  }

  async addDocument(document: Document): Promise<void> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    const content = await fs.readFile(document.filePath, "utf-8");
    await this.vectorStore.addDocuments([
      {
        pageContent: content,
        metadata: { title: document.title, id: document.id },
      },
    ]);
  }

  async searchSimilarDocuments(
    baseId: number,
    query: string,
    k: number = 5
  ): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error("Vector store not initialized");
    }

    const results = await this.vectorStore.similaritySearch(query, k);

    const documentIds = results.map((result) => result.metadata.id);

    return await Document.findAll({ where: { id: documentIds, baseId } });
  }
}
