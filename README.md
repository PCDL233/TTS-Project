# MiMo 智能平台

基于小米 MiMo API 的全栈 Web 应用，集成 TTS 语音合成、AI 智能助手、MCP工具调用、RAG 知识库与后台管理系统。

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-4.2-06B6D4?logo=tailwindcss)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

## 功能特性

| 模块 | 核心能力 |
|---|---|
| **TTS 合成** | 预置音色（9 种）、文本描述音色设计、音频样本复刻三种模式 |
| **AI 助手** | 基于 MiMo API 的流式对话，5 种模型切换，多轮会话持久化 |
| **知识库** | 上传 PDF/Word/TXT，自动切分与向量化，会话级 RAG 检索增强 |
| **后台管理** | 用户/角色/日志/系统配置/音频标签/统计图表 |

### TTS 合成模式

| 模式 | 说明 | 模型 |
|---|---|---|
| **预置音色** | 9 种精品音色，支持中英文 | `mimo-v2.5-tts` |
| **自定义音色** | 自然语言文本描述设计全新音色 | `mimo-v2.5-tts-voicedesign` |
| **复刻音色** | 上传音频样本高保真复刻 | `mimo-v2.5-tts-voiceclone` |

### 预置音色列表

MiMo-默认、冰糖、茉莉、苏打、白桦、Mia、Chloe、Milo、Dean

### 风格控制

- **自然语言描述**：自由文本描述说话风格（如"温柔且带一点悲伤的女声"）
- **音频标签**：60+ 预设标签，涵盖情绪、语调、人设、方言、角色扮演、音频效果等

### 其他亮点

- **API 配置**：支持多集群 Base URL 切换（普通 API / Token Plan 中国/新加坡/欧洲），API Key 后端持久化存储，绝不暴露给浏览器
- **Token Plan 兼容**：前后端联合校验，自动过滤不支持的模型
- **功能开关**：深度思考、联网搜索、函数调用、知识库检索均可由管理员在后台控制

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|---|---|---|
| Vue | ^3.5.32 | Composition API + `<script setup>` |
| TypeScript | ~6.0.2 | 严格模式 |
| Vite | ^8.0.10 | 构建工具 |
| Element Plus | ^2.13.7 | UI 组件库 |
| Tailwind CSS | ^4.2.4 | 原子化样式 |
| Pinia | ^3.0.4 | 状态管理 |
| Vue Router | ^4.6.4 | 路由管理 |
| Axios | ^1.15.2 | HTTP 客户端 |
| ECharts | ^6.0.0 | 图表库 |
| marked + highlight.js | ^18.0.3 / ^11.11.1 | Markdown 渲染与代码高亮 |
| crypto-js | ^4.2.0 | AES-256-CBC 加密 |

### 后端

| 技术 | 版本 | 说明 |
|---|---|---|
| NestJS | ^11.0.1 | 框架，全局前缀 `/api` |
| TypeScript | ^5.7.3 | 严格模式 |
| TypeORM | ^0.3.28 | ORM |
| SQLite | better-sqlite3 ^12.9.0 | 数据库驱动 |
| sqlite-vec | ^0.1.9 | SQLite 向量扩展（RAG） |
| @xenova/transformers | ^2.17.2 | 本地 Embedding 模型（384 维） |
| onnxruntime-node | ^1.26.0 | ONNX 运行时 |
| @langchain/textsplitters | ^1.0.1 | 文档切分 |
| Passport JWT | ^11.0.2 | 认证 |
| bcryptjs | ^3.0.3 | 密码哈希 |
| class-validator | ^0.15.1 | DTO 校验 |
| mammoth | ^1.12.0 | Word 文档解析 |
| pdf-parse | ^2.4.5 | PDF 解析 |
| xlsx | ^0.18.5 | Excel 解析 |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10（推荐通过 Corepack 启用）

### 安装依赖

```bash
# 项目根目录（pnpm workspace 会同时安装前端与 server/ 后端依赖）
pnpm install
```

### 配置环境变量

项目根目录 `.env`：

```env
VITE_BACKEND_URL=http://localhost:3001
VITE_AES_SECRET_KEY=MiMo-TTS-AES-256-Secret-Key!!
```

`server/.env`：

```env
PORT=3001
AES_SECRET_KEY=MiMo-TTS-AES-256-Secret-Key!!
JWT_SECRET=MiMo-TTS-JWT-Secret-Change-Me-Please
```

> **注意**：前后端 `AES_SECRET_KEY` 必须保持一致。MiMo API Key 通过前端「API 设置」弹窗保存到数据库，不在环境变量中配置。

### 开发调试

```bash
# 一键启动前后端（推荐）
pnpm dev:all

# 分别启动
pnpm dev                 # 前端（端口 3000）
pnpm -C server start:dev  # 后端（端口 3001）
```

### 生产构建

```bash
pnpm build       # 前端（输出到 dist/）
pnpm -C server build  # 后端（输出到 server/dist/）
```

### 后端工具命令

```bash
pnpm -C server format        # Prettier 格式化
pnpm -C server test          # Jest 单元测试
pnpm -C server test:cov      # 测试覆盖率
pnpm -C server test:e2e      # 端到端测试
```

## 项目结构

```
TTS-Project/
├── server/                     # NestJS 后端
│   ├── src/
│   │   ├── auth/               # JWT 认证
│   │   ├── user/               # 用户 CRUD
│   │   ├── role/               # RBAC 角色管理
│   │   ├── config/             # 用户级配置持久化
│   │   ├── history/            # TTS 生成历史
│   │   ├── tts/                # TTS 代理（MiMo API 封装 + SSE）
│   │   ├── chat/               # AI 聊天代理（SSE 流式对话）
│   │   ├── chat-config/        # 聊天功能开关配置
│   │   ├── knowledge-base/     # 知识库（文档上传、RAG、向量化）
│   │   ├── admin/              # 后台管理聚合 API
│   │   ├── log/                # 登录日志 + 操作日志
│   │   ├── system-config/      # 系统级配置
│   │   ├── audio-tag/          # 音频标签管理
│   │   ├── common/             # 通用模块
│   │   │   ├── crypto.service.ts
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── upload/
│   │   │   └── utils/
│   │   ├── app.module.ts       # 根模块（TypeORM + SQLite）
│   │   └── main.ts             # 入口（CORS / 50MB Body / 全局管道 / 请求日志）
│   ├── data.sqlite             # SQLite 数据库文件
│   └── package.json
├── src/                        # Vue 3 前端
│   ├── api/                    # Axios 客户端 + API 模块
│   ├── components/             # Vue 组件（TTS + Chat）
│   ├── composables/            # 组合式函数
│   ├── router/                 # 路由配置（含守卫）
│   ├── stores/                 # Pinia setup store
│   ├── types/                  # TypeScript 类型
│   ├── utils/                  # 工具函数
│   ├── views/                  # 页面级组件
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── dist/                       # 前端构建产物
├── public/                     # 静态资源
├── .github/workflows/          # CI/CD
└── package.json
```

## 核心设计

### 后端代理 MiMo API

API Key 存储在后端 SQLite 中，前端通过后端代理调用 MiMo API，**API Key 绝不暴露给浏览器**。

### AES-256-CBC 通信加密

登录、注册、个人资料修改等敏感接口，请求体使用 AES-256-CBC 加密，格式为 `iv_base64:ciphertext_base64`，字段名为 `data`。

### RBAC 权限控制

- 两个角色：`admin`、`user`，第一个注册用户自动获得 `admin`
- 后台路由和 API 通过 `@Roles('admin')` + `RolesGuard` 保护

### RAG 知识库

1. **文档解析**：`pdf-parse`、`mammoth`、`xlsx` 处理 PDF/Word/Excel/TXT
2. **文本切分**：`@langchain/textsplitters` 按 chunk 切分
3. **Embedding**：`@xenova/transformers` 本地生成 384 维向量
4. **向量存储**：`sqlite-vec` 在 SQLite 中创建虚拟表，使用 `MATCH` 做最近邻搜索
5. **检索注入**：聊天时若开启知识库关联，自动检索 topK 片段注入 system prompt

### 音频播放

为避免浏览器将 `<audio>` 标签对 blob URL 的预加载误判为下载行为，统一使用 `new Audio()` 纯 JS 对象，`preload = 'none'`，仅在用户点击播放时加载。

### 大体积请求体（413 修复）

保存历史记录需传输 Base64 音频数据（~1MB+），超出 NestJS 默认 body limit。后端使用 `NestExpressApplication` + `app.useBodyParser('json', { limit: '50mb' })` 解决。

### 代码分割

`vite.config.ts` 通过 `manualChunks` 拆分第三方依赖：
`element-plus.js`、`icons.js`、`vue.js`、`markdown.js`、`charts.js`、`vendor.js`、`index.js`

## API 参考

本项目对接小米 MiMo API，接口兼容 OpenAI Chat Completions 格式。

**请求地址**：`POST /chat/completions`

**认证方式**：Header `api-key: {your_api_key}`

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    { "role": "user", "content": "风格描述（可选）" },
    { "role": "assistant", "content": "要合成的文本" }
  ],
  "audio": {
    "format": "wav",
    "voice": "mimo_default"
  }
}
```

完整文档：[MiMo 官方文档](https://platform.xiaomimimo.com)

## 浏览器兼容性

- Chrome >= 90
- Edge >= 90
- Firefox >= 88
- Safari >= 14

## 常见问题

| 问题 | 排查方向 |
|---|---|
| **413 Payload Too Large** | 检查 `server/src/main.ts` 的 `useBodyParser('json', { limit: '50mb' })` |
| **音频无法播放** | 应使用 `new Audio()` 而非 `<audio>` DOM 元素；历史 blob URL 刷新后失效，需从 `audioBase64` 重建 |
| **请求数据解密失败** | 检查前后端 `.env` 中 `AES_SECRET_KEY` / `VITE_AES_SECRET_KEY` 是否一致 |
| **不支持 xxx 模型** | Token Plan 端点不支持 `mimo-v2-flash`，请切换到普通 API 端点（`sk-` 开头的 Key） |
| **CI 中 onnxruntime-node 安装超时** | 已配置 `node_modules` 缓存，首次成功后缓存即生效，后续构建不再重复下载 |

## CI/CD

- **CI**（`.github/workflows/ci.yml`）：`push` / `pull_request` 到 `main`/`master` 时触发，构建前后端并运行测试
- **Release**（`.github/workflows/release.yml`）：推送 `v*` 标签时触发，自动打包构建产物并创建 GitHub Release

## 许可证

MIT License
