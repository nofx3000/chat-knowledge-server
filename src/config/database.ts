import { Sequelize } from "sequelize-typescript";
import { Document } from "../models/Document";
import { Base } from "../models/Base";
import mysql2 from "mysql2";

const sequelize = new Sequelize({
  database: "rag_knowledge_base",
  dialect: "mysql",
  username: "root",
  password: "root",
  port: 3306,
  host: "127.0.0.1",
  dialectModule: mysql2,
  models: [Document, Base], // 添加所有的模型
});

export default sequelize;
