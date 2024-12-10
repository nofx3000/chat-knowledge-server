# 使用Node.js官方镜像作为基础镜像
FROM node:18.19.1-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json（如果存在）
COPY package*.json ./

# 在npm install之前安装python和构建工具
RUN apk add --no-cache python3 make g++

RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000

# 安装项目依赖
RUN npm install

# 复制项目文件到容器中
COPY . .

# 暴露端口（根据您的应用需要修改）
EXPOSE 3000

# 启动应用
CMD ["npm", "run", "dev"] 