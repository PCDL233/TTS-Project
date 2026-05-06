# MiMo TTS 语音合成

基于小米 MiMo TTS API 的全栈 Web 语音合成应用，集成 AI 智能助手聊天与后台管理系统。支持预置音色合成、文本描述音色设计、音频样本音色复刻三种模式。

![Tech Stack](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs)
![Tech Stack](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Tech Stack](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![Tech Stack](https://img.shields.io/badge/Element_Plus-2.13-409EFF?logo=element)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss)
![Tech Stack](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![Tech Stack](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

## 功能特性

### 三种 TTS 合成模式

| 模式 | 说明 | 模型 |
|---|---|---|
| **预置音色** | 从 9 种精品音色中选择，支持中英文 | `mimo-v2.5-tts` |
| **自定义音色** | 通过自然语言文本描述，从零设计全新音色 | `mimo-v2.5-tts-voicedesign` |
| **复刻音色** | 上传音频样本，高保真复刻任意音色 | `mimo-v2.5-tts-voiceclone` |

### 预置音色列表

| 音色 | 语言 | 性别 |
|---|---|---|
| MiMo-默认 | 自动 | - |
| 冰糖 | 中文 | 女性 |
| 茉莉 | 中文 | 女性 |
| 苏打 | 中文 | 男性 |
| 白桦 | 中文 | 男性 |
| Mia | 英文 | 女性 |
| Chloe | 英文 | 女性 |
| Milo | 英文 | 男性 |
| Dean | 英文 | 男性 |

### 风格控制

- **自然语言描述**：用自由文本描述期望的说话风格（如"温柔且带一点悲伤的女声"）
- **音频标签**：从 60+ 预设标签中选择，包括基础情绪、复合情绪、整体语调、音色定位、人设腔调、方言、角色扮演、音频效果等八大类
- 标签支持点击切换（选中/取消），支持输入框手动输入

### 音频输出格式

支持 `wav`、`pcm16`、`mp3` 三种格式。

### AI 智能助手

- 基于 MiMo API 的流式对话，支持多轮会话
- 支持 5 种聊天模型切换：MiMo-V2.5-Pro、MiMo-V2.5、MiMo-V2-Pro、MiMo-V2-Omni、MiMo-V2-Flash
- **Token Plan 兼容性**：自动过滤 Token Plan 不支持的模型（如 `mimo-v2-flash`）
- 历史会话记录持久化到 SQLite

### 历史记录

- 自动保存 TTS 生成记录到后端 **SQLite** 数据库
- 支持单条播放、删除、全部清空
- 清空历史时自动释放当前音频资源

### API 配置

- 支持多集群 Base URL 切换（普通 API / Token Plan 中国/新加坡/欧洲）
- 支持自定义 Base URL
- API Key 后端持久化存储（SQLite），绝不暴露给浏览器
- API Key 空值校验与中文友好错误提示
- 模型兼容性校验：Token Plan 端点自动禁用不支持的模型

### 后台管理（Admin）

- **用户管理**：用户列表、角色分配
- **角色管理**：RBAC 权限控制（`admin` / `user`）
- **日志审计**：登录日志、操作日志
- **系统配置**：全局参数管理
- **音频标签管理**：60+ 预设标签的增删改查
- **统计图表**：基于 ECharts 的数据可视化

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|---|---|---|
| Vue | ^3.5.32 | Composition API + `<script setup>` |
| TypeScript | ~6.0.2 | 类型安全 |
| Vite | ^8.0.10 | 构建工具 |
| Element Plus | ^2.13.7 | UI 组件库 |
| Tailwind CSS | ^4.2.4 | 原子化样式 |
| Pinia | ^3.0.4 | 状态管理 |
| Vue Router | ^4.6.4 | 路由管理 |
| Axios | ^1.15.2 | HTTP 客户端 |
| ECharts | ^6.0.0 | 图表库 |
| marked | ^18.0.3 | Markdown 渲染 |
| highlight.js | ^11.11.1 | 代码高亮 |
| crypto-js | ^4.2.0 | AES-256-CBC 加密 |

### 后端

| 技术 | 版本 | 说明 |
|---|---|---|
| NestJS | ^11.0.1 | 框架 |
| TypeScript | ^5.7.3 | 类型安全 |
| TypeORM | ^0.3.28 | ORM |
| SQLite | ^12.9.0 | better-sqlite3 驱动 |
| Passport JWT | ^11.0.2 | 认证 |
| bcryptjs | ^3.0.3 | 密码哈希 |
| class-validator | ^0.15.1 | DTO 校验 |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 前端依赖（项目根目录）
npm install

# 后端依赖
cd server && npm install
```

### 配置环境变量

在项目根目录创建 `.env`：

```env
# 后端服务地址
VITE_BACKEND_URL=http://localhost:3001
# AES 加密密钥（必须与后端一致）
VITE_AES_SECRET_KEY=MiMo-TTS-AES-256-Secret-Key!!
```

在 `server/` 目录创建 `.env`：

```env
PORT=3001
# AES 加密密钥（必须与前端一致）
AES_SECRET_KEY=MiMo-TTS-AES-256-Secret-Key!!
# JWT 签名密钥（生产环境请修改为强随机字符串）
JWT_SECRET=MiMo-TTS-JWT-Secret-Change-Me-Please
```

> **注意**：
> - MiMo API Key 不在环境变量中配置，后端启动后通过前端「API 设置」弹窗保存到数据库。
> - 前后端 `AES_SECRET_KEY` 必须保持一致，否则登录/注册等敏感接口会解密失败。

### 开发调试

#### 方式一：一键启动前后端（推荐）

```bash
npm run dev:all
```

前端（绿色 `FE` 前缀）与后端（蓝色 `BE` 前缀）将在同一终端并行运行。

#### 方式二：分别启动

```bash
# 终端 1：启动后端（watch 模式）
cd server && npm run start:dev

# 终端 2：启动前端（项目根目录）
npm run dev
```

- 后端默认地址：`http://localhost:3001`
- 前端默认地址：`http://localhost:3000`

### 生产构建

```bash
# 构建前端（输出到 dist/）
npm run build

# 构建后端（输出到 server/dist/）
cd server && npm run build
```

### 预览构建产物

```bash
npm run preview
```

### 后端工具命令

```bash
cd server
npm run format        # Prettier 格式化
npm run lint          # ESLint 检查
npm run test          # Jest 单元测试
npm run test:cov      # 测试覆盖率报告
npm run test:e2e      # 端到端测试
```

## 项目结构

```
TTS-Project/
├── server/                    # NestJS 后端服务
│   ├── src/
│   │   ├── auth/              # JWT 认证（登录/注册/改密）
│   │   ├── user/              # 用户 CRUD
│   │   ├── role/              # RBAC 角色管理
│   │   ├── config/            # 用户级 TTS 配置持久化
│   │   ├── history/           # TTS 生成历史记录
│   │   ├── tts/               # TTS 代理模块（MiMo API 封装 + SSE 流式）
│   │   ├── chat/              # AI 聊天代理（SSE 流式对话 + 会话历史）
│   │   ├── admin/             # 后台管理聚合 API（统计、图表数据）
│   │   ├── log/               # 登录日志 + 操作日志
│   │   ├── system-config/     # 系统级配置管理
│   │   ├── audio-tag/         # 音频标签管理（60+ 预设标签）
│   │   ├── common/            # 通用模块（加密、上传、角色守卫、日志拦截器）
│   │   ├── app.module.ts      # 根模块（TypeORM + SQLite 配置）
│   │   └── main.ts            # 入口（CORS / 50MB Body Parser / 全局管道 / 请求日志 / /api 前缀）
│   ├── data.sqlite            # SQLite 数据库文件
│   ├── package.json
│   └── tsconfig.json
├── public/                    # 静态资源
├── src/                       # Vue 3 前端
│   ├── api/                   # Axios 客户端 + API 模块
│   ├── components/            # Vue 组件（TTS + Chat）
│   ├── composables/           # 组合式函数（useTTS、useChat）
│   ├── router/                # Vue Router 配置（含路由守卫）
│   ├── stores/                # Pinia setup store
│   ├── types/                 # TypeScript 类型定义
│   ├── utils/                 # 工具函数（audio、crypto）
│   ├── views/                 # 页面级组件
│   ├── App.vue                # 根组件
│   ├── main.ts                # 入口文件
│   └── style.css              # 全局样式
├── dist/                      # 前端构建产物
├── .env                       # 前端环境变量
├── index.html                 # HTML 模板
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 核心实现说明

### 后端代理 MiMo API

API Key 存储在后端 SQLite 中，前端通过后端代理调用 MiMo API，**API Key 绝不暴露给浏览器**。

### 通信加密（AES-256-CBC）

前后端之间的登录、注册、个人资料修改等敏感接口，请求体使用 AES-256-CBC 加密，格式为 `iv_base64:ciphertext_base64`，字段名为 `data`。

- 前端实现：`src/utils/crypto.ts`（基于 `crypto-js`）
- 后端实现：`server/src/common/crypto.service.ts`（基于 Node.js `crypto`）

### RBAC 权限控制

- 两个角色：`admin`、`user`
- 第一个注册的用户自动获得 `admin` 角色
- 后台管理路由和 API 使用 `@Roles('admin')` 装饰器 + `RolesGuard` 保护
- 非 admin 用户访问 `/admin/*` 会被重定向到首页并提示无权访问

### 大体积请求体支持（413 修复）

保存历史记录时需传输 Base64 音频数据（约 1MB+），超出 NestJS/Express 默认 body limit（~100KB）。后端使用 `NestExpressApplication` 泛型 + `app.useBodyParser('json', { limit: '50mb' })` 解决。

### 音频播放优化

为避免浏览器将 `<audio>` 标签对 blob URL 的预加载误判为下载行为，项目完全移除了 DOM `<audio>` 元素，改用 `new Audio()` 纯 JS 对象：`preload = 'none'`，仅在用户点击播放时加载音频。

### 风格标签解析

`styleText` 按空白字符分割解析，因此标签本身不含空格。`usedTags` computed 集合实时追踪已选状态，实现标签的点击切换交互。

### 历史记录响应性

`HistoryPanel` 使用 `storeToRefs(historyStore)` 解构 `history`，确保 Pinia setup store 中的数组响应性不丢失。

### Token Plan 模型兼容性

Token Plan API 端点仅支持部分模型，不支持 `mimo-v2-flash`。项目在前后端都做了兼容处理：

- **后端**：调用 MiMo API 前校验模型兼容性，返回清晰的中文错误提示
- **前端**：模型下拉框根据当前 API 配置动态过滤，Token Plan 下自动隐藏不支持的模型；若当前选中模型不可用，自动回退到首个可用模型

### 日志体系

后端采用分层日志：
- **HTTP 请求中间件**（`main.ts`）：记录 IP、方法、路径、状态码、耗时
- **控制器层**：记录接口调用参数与结果
- **服务层**：记录 MiMo API 调用、SSE chunk 数量、数据库操作

### 代码分割

构建时通过 `manualChunks` 将第三方依赖拆分为独立 chunk：
- `element-plus.js` — Element Plus 框架
- `icons.js` — @element-plus/icons-vue
- `vue.js` — Vue + Pinia
- `markdown.js` — marked + highlight.js
- `charts.js` — ECharts
- `vendor.js` — 其余 node_modules
- `index.js` — 业务代码

## API 参考

本项目对接的是小米 MiMo TTS API，接口兼容 OpenAI Chat Completions 格式。

**请求地址**：`POST /chat/completions`

**认证方式**：Header `api-key: {your_api_key}`

**核心参数**：

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

完整 API 文档请参考：[MiMo 官方文档](https://platform.xiaomimimo.com)

## 浏览器兼容性

- Chrome >= 90
- Edge >= 90
- Firefox >= 88
- Safari >= 14

## 常见问题

### 413 Payload Too Large

如果保存历史记录时出现 413 错误，检查后端 `main.ts` 的 `useBodyParser('json', { limit: '50mb' })` 是否生效。

### 音频无法播放

检查是否使用了 `<audio>` DOM 元素。项目统一使用 `new Audio()` 纯 JS 对象。历史记录中的 blob URL 在页面刷新后会失效，需要从 `audioBase64` 重新创建 blob。

### 登录/注册提示"请求数据解密失败"

检查前后端的 `.env` 中 `AES_SECRET_KEY` / `VITE_AES_SECRET_KEY` 是否一致。

### Token Plan 提示"不支持 xxx 模型"

Token Plan API 端点仅支持 MiMo-V2.5-Pro、MiMo-V2.5、MiMo-V2-Pro、MiMo-V2-Omni 及 TTS 系列模型。如需使用 `mimo-v2-flash`，请切换到普通 API 端点（`sk-` 开头的 API Key）。

## 许可证

MIT License
