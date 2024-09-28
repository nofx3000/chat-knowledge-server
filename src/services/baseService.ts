import { Base } from "../models/Base";
import { Document } from "../models/Document";

export class BaseService {
  async getAllBases(): Promise<Base[]> {
    return await Base.findAll();
  }

  async getBaseWithDocuments(id: number): Promise<Base | null> {
    const result = await Base.findByPk(id, {
      include: [Document],
    });
    console.log("Base with documents:", JSON.stringify(result, null, 2));
    return result;
  }

  async deleteBase(id: number): Promise<number> {
    return await Base.destroy({ where: { id } });
  }

  async createBase(name: string): Promise<Base> {
    return await Base.create({ name });
  }
}
