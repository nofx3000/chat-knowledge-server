import { OllamaEmbeddings } from "@langchain/ollama";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { Document as LangchainDocument } from "langchain/document";
import * as fs from "fs/promises";
import * as path from "path";

export class RAGService {
  private embeddings: OllamaEmbeddings;
  private vectorStores: Map<number, FaissStore> = new Map();

  constructor() {
    this.embeddings = new OllamaEmbeddings({
      model: "bge-large-embed",
    });
  }

  async getOrCreateVectorStore(baseId: number): Promise<FaissStore> {
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

    let store: FaissStore = await FaissStore.fromDocuments(
      [new LangchainDocument({ pageContent: "", metadata: { id: 0 } })],
      this.embeddings
    );
    store.save(indexPath);

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
    store.save(indexPath);
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
