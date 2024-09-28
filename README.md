# LLM Knowledge Base System

这是一个基于大语言模型（LLM）的知识库系统，允许用户创建、管理和查询知识库。

## 功能特点

- 创建和管理知识库
- 上传文档到知识库（支持 .txt, .pdf, .doc, .docx 格式）
- 基于知识库内容进行对话查询
- 使用 RAG (Retrieval-Augmented Generation) 技术提高回答准确性

## 技术栈

### 前端
- React
- TypeScript
- Ant Design
- Axios

### 后端
- Node.js
- Koa
- TypeScript
- Sequelize (MySQL)
- LangChain
- FAISS 向量数据库

## 安装和运行

### 后端

1. 安装依赖：
   ```
   npm install
   ```

2. 配置数据库：
   - 创建 MySQL 数据库
   - 更新 `src/config/database.ts` 中的数据库配置

3. 运行服务器：
   ```
   npm start
   ```

## 项目结构
