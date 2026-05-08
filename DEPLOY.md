# ContractAI 部署文档

## 1. 环境要求

| 依赖 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | 推荐 LTS 版本 |
| npm | >= 9.0.0 | 随 Node.js 安装 |
| Git | >= 2.30 | 版本管理 |

## 2. 本地开发

### 2.1 克隆项目

```bash
git clone <仓库地址>
cd contract-ai
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置环境变量

复制环境变量模板并填写：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# AI 模型配置（可选，不配置则使用模拟审核）
AI_API_KEY=你的API密钥
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
AI_PROVIDER=openai
```

各提供商配置示例：

| 提供商 | AI_API_BASE_URL | AI_MODEL | AI_PROVIDER |
|--------|----------------|----------|-------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` | `openai` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | `deepseek` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | `qwen` |
| 智谱GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` | `zhipu` |

### 2.4 启动开发服务器

```bash
npm run dev
```

启动后访问：
- 前端：http://localhost:5173/
- 后端 API：http://localhost:3001/api/health

## 3. 生产部署

### 3.1 构建项目

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 3.2 方式一：Vercel 部署（推荐）

项目已内置 Vercel 配置（`vercel.json`），支持一键部署：

1. 将代码推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 配置环境变量：
   - `AI_API_KEY`
   - `AI_API_BASE_URL`
   - `AI_MODEL`
   - `AI_PROVIDER`
4. 点击部署

**注意**：Vercel 使用 Serverless 模式，SQLite 数据库不持久化。生产环境建议使用 PostgreSQL 或 MySQL 替换 SQLite。

### 3.3 方式二：VPS / 云服务器部署

#### 3.3.1 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

#### 3.3.2 部署应用

```bash
# 克隆代码
git clone <仓库地址>
cd contract-ai

# 安装依赖
npm install

# 构建
npm run build

# 配置环境变量
cp .env.example .env
vim .env  # 填写实际配置
```

#### 3.3.3 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
pm2 start api/server.ts --name contract-ai-api --interpreter tsx

# 使用 serve 托管前端静态文件
npm install -g serve
pm2 start serve --name contract-ai-web -- -s dist -l 5173

# 设置开机自启
pm2 startup
pm2 save
```

#### 3.3.4 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;  # AI 审核可能耗时较长
    }
}
```

配置 SSL（推荐）：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3.4 方式三：Docker 部署

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

COPY . .
RUN npm run build

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "--import", "tsx", "api/server.ts"]
```

#### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
    restart: unless-stopped
    environment:
      - NODE_ENV=production

  web:
    image: node:20-alpine
    working_dir: /app
    command: npx serve -s dist -l 5173
    ports:
      - "5173:5173"
    volumes:
      - ./dist:/app/dist
    restart: unless-stopped
```

#### 启动

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

## 4. 数据库说明

项目默认使用 SQLite，数据文件位于 `data/contract_review.db`。

- 首次启动自动创建表和预设模板数据
- 数据持久化需确保 `data/` 目录不被删除
- Vercel 等 Serverless 环境中 SQLite 不持久化，需替换为外部数据库

## 5. AI 配置说明

### 5.1 通过环境变量配置

在 `.env` 文件或服务器环境变量中设置 `AI_API_KEY` 等参数。

### 5.2 通过界面配置

启动应用后，访问 **AI 设置** 页面（`/settings`），可在线配置：
- 选择 AI 提供商
- 输入 API Key
- 设置 API Base URL
- 选择模型

界面配置保存在运行时内存中，服务重启后需重新配置。**生产环境建议使用环境变量。**

### 5.3 降级机制

- AI API Key 已配置 → 调用真实 AI 审核
- AI API Key 未配置 → 自动降级到模拟审核
- AI 调用失败 → 降级到模拟审核，并在摘要中标注

## 6. 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（前端+后端） |
| `npm run build` | 构建生产版本 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览构建结果 |

## 7. 项目结构

```
├── api/                    # 后端代码
│   ├── routes/             # API 路由
│   │   ├── review.ts       # 合同审核 API
│   │   ├── templates.ts    # 模板管理 API
│   │   └── dimensions.ts   # 关注维度 API
│   ├── services/
│   │   └── aiReview.ts     # AI 审核服务
│   ├── db.ts               # 数据库初始化
│   ├── app.ts              # Express 应用
│   ├── server.ts           # 服务器入口
│   └── index.ts            # Vercel 入口
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── store/              # Zustand 状态管理
│   ├── hooks/              # 自定义 Hooks
│   └── lib/                # 工具函数
├── shared/                 # 前后端共享类型
├── data/                   # SQLite 数据库（运行时生成）
├── .env                    # 环境变量
└── vercel.json             # Vercel 部署配置
```

## 8. 故障排查

| 问题 | 解决方案 |
|------|---------|
| `concurrently: not found` | 运行 `npm install` 安装依赖 |
| 端口 5173/3001 被占用 | 修改 `vite.config.ts` 和 `.env` 中的端口 |
| AI 审核返回模拟结果 | 检查 `AI_API_KEY` 是否正确配置 |
| AI 审核超时 | 增加 Nginx 的 `proxy_read_timeout`，或检查网络连通性 |
| 数据库文件丢失 | 确保 `data/` 目录存在且有写权限 |
