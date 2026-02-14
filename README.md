# Zen Ring Timer

一个优雅的冥想计时器应用，使用 React + Vite 开发。

## 功能特性

- 🎯 直观的计时器界面
- 🎨 渐进式圆形进度显示
- 🔊 禅意音效提示
- 🌍 多语言支持
- ⚙️ 可自定义设置

## 快速开始

### 本地运行

**前置要求：** Node.js 18+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```
   应用将在 `http://localhost:3000` 打开

3. 构建生产版本：
   ```bash
   npm run build
   ```

## 部署

### 部署到 Cloudflare Pages

1. **创建 GitHub 仓库**
   - 在 GitHub 上创建新仓库
   - 推送代码：
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/zenring-timer.git
     git branch -M main
     git push -u origin main
     ```

2. **连接 Cloudflare Pages**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Pages 部分
   - 点击 "Create a project" → "Connect to Git"
   - 授权并选择 `zenring-timer` 仓库
   - 项目名称：`zenring-timer`
   - 生产分支：`main`
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 点击 "Save and Deploy"

3. **获取访问 URL**
   - 部署完成后，你将获得一个形如 `https://zenring-timer.pages.dev` 的 URL
   - 可以在 Cloudflare 控制面板中自定义域名

### 环境变量

如果需要使用 API 密钥，在 Cloudflare Pages 部分添加：
- 进入项目设置 → 环境变量
- 添加 `GEMINI_API_KEY` 或其他需要的变量

## 项目结构

```
zenring-timer/
├── components/          # React 组件
│   ├── ProgressCircle.tsx
│   └── Settings.tsx
├── hooks/              # 自定义 hooks
│   └── useZenAudio.ts
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
├── index.html          # HTML 模板
├── vite.config.ts      # Vite 配置
└── package.json        # 依赖和脚本
```

## 技术栈

- **React 19** - UI 框架
- **Vite 6** - 构建工具
- **TypeScript** - 编程语言
- **Lucide React** - 图标库

## 开发

```bash
# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 许可证

MIT
