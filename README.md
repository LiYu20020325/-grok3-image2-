# 昼夜交互科技 · 并发创作工作站

一个面向文本、图片、视频的并发创作前端工作站，支持 OpenAI / Gemini 模型接入与本地素材管理。

## 功能概览
- 多路并发对话与网格/分栏视图
- OpenAI / Gemini 兼容接口与中转站支持
- 本地素材库与简易时间线
- 角色卡与提示词库
- 工具箱：图片分割、视频首尾帧、灵感实验室（XHS / 抖音 / 拼多多）

## 快速开始

```bash
git clone <your-repo-url>
cd Concurrent-Picture-AND-Video
npm install
npm run dev
```

本地预览：

```bash
npm run build
npm run preview
```

开发默认地址：

```
http://localhost:3001
```

可通过环境变量覆盖端口（示例：Windows PowerShell）：

```powershell
$env:PORT=3002
npm run dev
```

构建预览默认地址：

```
http://localhost:5015
```

## 环境变量（可选）

在项目根目录创建 `.env`：

```bash
VITE_API_KEY=your_api_key
VITE_API_BASE_URL=https://your-openai-compatible-base
VITE_GEMINI_TIMEOUT_MS=120000
```

## 说明
- 本项目仅提供前端工作站能力，不提供任何模型本体。
- 请确保你的 API Key 与使用行为符合服务提供方的条款。

## License

MIT
