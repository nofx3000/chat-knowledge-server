import { Document } from "../models/Document";
import { Base } from "../models/Base";

export class DocumentService {
  async createDocument(
    baseId: number,
    title: string,
    filePath: string
  ): Promise<Document> {
    return await Document.create({ baseId, title, filePath });
  }

  async getDocumentById(id: number): Promise<Document | null> {
    return await Document.findByPk(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return await Document.findAll();
  }

  async updateDocument(
    id: number,
    title: string,
    filePath: string
  ): Promise<[number, Document[]]> {
    const [affectedCount, affectedRows] = await Document.update(
      { title, filePath },
      { where: { id }, returning: true }
    );
    return [affectedCount, affectedRows];
  }

  async deleteDocument(id: number): Promise<number> {
    return await Document.destroy({ where: { id } });
  }

  async getAllBases(): Promise<Base[]> {
    return await Base.findAll();
  }

  async getBaseById(id: number): Promise<Base | null> {
    return await Base.findByPk(id);
  }

  async deleteBase(id: number): Promise<number> {
    return await Base.destroy({ where: { id } });
  }

  async createBase(name: string): Promise<Base> {
    return await Base.create({ name });
  }
}
