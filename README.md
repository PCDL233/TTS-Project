# MiMo TTS 语音合成

基于小米 MiMo TTS API 的 Web 语音合成前端应用，支持预置音色合成、文本描述音色设计、以及音频样本音色复刻三种模式。

![Tech Stack](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs)
![Tech Stack](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Tech Stack](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![Tech Stack](https://img.shields.io/badge/Element_Plus-2.13-409EFF?logo=element)
![Tech Stack](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?logo=tailwindcss)

## 功能特性

### 三种合成模式

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

### 历史记录

- 自动保存最近 10 条生成记录到 `localStorage`
- 支持单条播放、删除、全部清空
- 清空历史时自动释放当前音频资源

### API 配置

- 支持多集群 Base URL 切换（普通 API / Token Plan 中国/新加坡/欧洲）
- 支持自定义 Base URL
- API Key 本地存储（浏览器 localStorage）

## 技术栈

### 前端
- **框架**：Vue 3.5（Composition API）
- **语言**：TypeScript 6.0
- **构建工具**：Vite 8.0
- **UI 组件库**：Element Plus 2.13
- **样式方案**：Tailwind CSS 4.2
- **状态管理**：Pinia 3.0
- **HTTP 客户端**：Axios 1.15

### 后端
- **框架**：NestJS 11
- **ORM**：TypeORM 0.3
- **数据库**：SQLite（better-sqlite3）

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

### 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# 后端服务地址
VITE_BACKEND_URL=http://localhost:3001
```

后端 `.env`（位于 `server/.env`）：

```env
PORT=3001
```

> MiMo API Key 请在后端启动后，通过前端「API 设置」弹窗保存到后端数据库。

### 开发调试

需要同时启动后端和前端：

```bash
# 终端 1：启动后端
cd server
npm run start:dev

# 终端 2：启动前端（在项目根目录）
npm run dev
```

- 后端默认地址：`http://localhost:3001`
- 前端默认地址：`http://localhost:3000`

### 生产构建

```bash
# 构建前端
npm run build

# 构建后端
cd server
npm run build
```

前端构建产物输出到 `dist/` 目录。

### 预览构建产物

```bash
npm run preview
```

## 项目结构

```
TTS-Project/
├── server/                    # NestJS 后端服务
│   ├── src/
│   │   ├── config/            # 配置模块（TypeORM Entity + CRUD）
│   │   ├── history/           # 历史记录模块（TypeORM Entity + CRUD）
│   │   ├── tts/               # TTS 代理模块（MiMo API 封装 + SSE 流式）
│   │   ├── app.module.ts      # 根模块（TypeORM + SQLite 配置）
│   │   └── main.ts            # 入口（CORS / 全局管道 / 前缀）
│   ├── package.json
│   └── tsconfig.json
├── public/                    # 静态资源
├── src/
│   ├── api/
│   │   └── tts.ts            # 后端 API 客户端（非流式 & 流式）
│   ├── components/
│   │   ├── ApiKeyDialog.vue   # API 设置弹窗
│   │   ├── AudioPlayer.vue    # 音频播放器（纯 JS Audio）
│   │   ├── AudioUploader.vue  # 音频文件上传组件
│   │   ├── HistoryPanel.vue   # 历史记录面板
│   │   ├── TextInputArea.vue  # 文本输入区域
│   │   └── VoiceConfigPanel.vue  # 左侧音色配置面板
│   ├── composables/
│   │   └── useTTS.ts         # TTS 生成逻辑组合式函数
│   ├── stores/
│   │   ├── config.ts         # 全局配置 Store（后端 API 持久化）
│   │   └── history.ts        # 历史记录 Store（后端 API 持久化）
│   ├── types/
│   │   └── tts.ts            # TypeScript 类型定义与常量
│   ├── utils/
│   │   └── audio.ts          # 音频工具函数（Base64/Blob/ArrayBuffer/WAV）
│   ├── App.vue               # 根组件
│   ├── main.ts               # 入口文件
│   └── style.css             # 全局样式
├── .env.example              # 环境变量示例
├── index.html                # HTML 模板
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 核心实现说明

### 音频播放优化

为避免浏览器将 `<audio>` 标签对 blob URL 的预加载误判为下载行为，项目完全移除了 DOM `<audio>` 元素，改用 `new Audio()` 纯 JS 对象：`preload = 'none'`，仅在用户点击播放时加载音频。

### 风格标签解析

`styleText` 按空白字符分割解析，因此标签本身不含空格。`usedTags` computed 集合实时追踪已选状态，实现标签的点击切换交互。

### 历史记录响应性

`HistoryPanel` 使用 `storeToRefs(historyStore)` 解构 `history`，确保 Pinia setup store 中的数组响应性不丢失。

### 代码分割

构建时通过 `manualChunks` 将第三方依赖拆分为独立 chunk：
- `element-plus.js` — Element Plus 框架
- `vendor.js` — Vue、Pinia、Axios 等
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

## 许可证

MIT License
