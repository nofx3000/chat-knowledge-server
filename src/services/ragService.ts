import { OllamaEmbeddings } from "@langchain/ollama";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Document as LangchainDocument } from "langchain/document";
import { EMBED_URL, EMBED_MODEL } from "../config/ollama";
import * as fs from "fs/promises";
import * as path from "path";

export class RAGService {
  private embeddings: OllamaEmbeddings;
  private vectorStores: Map<number, HNSWLib> = new Map();

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: EMBED_MODEL,
      baseUrl: EMBED_URL,
    });
  }

  async getOrCreateVectorStore(baseId: number): Promise<HNSWLib> {
    if (this.vectorStores.has(baseId)) {
      console.log(`vectorStore---${baseId}---exists`);
      return this.vectorStores.get(baseId)!;
    }
    console.log(`creating new vectorStore....`);
    const dirPath = path.join(
      process.cwd(),
      "knowledge_base",
      baseId.toString()
    );
    const indexPath = path.join(dirPath, `db_index_${baseId}`);

    let store: HNSWLib;
    if (await this.directoryExists(indexPath)) {
      store = await HNSWLib.load(indexPath, this.embeddings);
    } else {
      store = await HNSWLib.fromDocuments(
        [new LangchainDocument({ pageContent: "", metadata: { id: 0 } })],
        this.embeddings
      );
    }

    this.vectorStores.set(baseId, store);
    return store;
  }

  async addDocuments(
    baseId: number,
    documents: LangchainDocument[]
  ): Promise<void> {
    const store = await this.getOrCreateVectorStore(baseId);
    console.log("store in ragService", store);
    console.log("document in ragService", documents);
    await store.addDocuments(documents);
    const dirPath = path.join(
      process.cwd(),
      "knowledge_base",
      baseId.toString()
    );
    const indexPath = path.join(dirPath, `db_index_${baseId}`);
    await store.save(indexPath);
  }

  async searchSimilarDocuments(
    baseId: number,
    query: string,
    k: number = 5
  ): Promise<LangchainDocument[]> {
    const store = await this.getOrCreateVectorStore(baseId);
    return await store.similaritySearch(query, k);
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      return true;
    } catch {
      return false;
    }
  }
}
