# 📚 Zen Ring Timer 完整部署指南

## 第一步：创建 GitHub 仓库

### 1.1 在 GitHub 上创建新仓库

1. 访问 [github.com](https://github.com)，登录账户
2. 点击右上角 **+** → **New repository**
3. 设置仓库信息：
   - **Repository name**: `zenring-timer`
   - **Description**: `A serene meditation timer with React + Vite`
   - **Public** (公开)
   - ✅ Initialize with README (不需要，我们已有)
4. 点击 **Create repository**

### 1.2 推送代码到 GitHub

获取仓库 URL 后，在本地执行：

```bash
cd /Users/Ruoling/Dev/zenring-timer

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/zenring-timer.git

# 重命名分支为 main（可选，但推荐）
git branch -M main

# 推送代码
git push -u origin main
```

**替换 `YOUR_USERNAME` 为你的 GitHub 用户名**

---

## 第二步：部署到 Cloudflare Pages

### 2.1 连接 Cloudflare Pages

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入左侧菜单 **Pages**
3. 点击 **Create a project** → **Connect to Git**

### 2.2 授权 GitHub

- 选择 **GitHub** 作为 Git 提供商
- 点击 **Authorize Cloudflare** 授予权限
- 选择你的账户和 `zenring-timer` 仓库

### 2.3 配置构建设置

在项目配置页面设置：

| 字段 | 值 |
|------|-----|
| **Project name** | `zenring-timer` |
| **Production branch** | `main` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |

**环境变量**（如需要）：
- 如果你的应用需要 API 密钥，可以在这里添加
- 例如：`VITE_GEMINI_API_KEY` = `your_api_key`

### 2.4 完成部署

点击 **Save and Deploy** 按钮

部署完成后（通常 2-5 分钟），你会看到：
- ✅ 部署成功的信息
- 🔗 项目 URL: `https://zenring-timer.pages.dev`

---

## 第三步：访问你的应用

### 默认 URL
```
https://zenring-timer.pages.dev
```

### 自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中
2. 进入 **Custom domains**
3. 点击 **Add custom domain**
4. 输入你的域名（例如 `timer.yourdomain.com`）
5. 按照指示配置 DNS 记录

---

## 第四步：后续更新

推送新代码后，Cloudflare Pages 会**自动构建并部署**：

```bash
# 本地开发
npm run dev

# 完成修改后提交并推送
git add .
git commit -m "Add feature: xyz"
git push origin main

# Cloudflare Pages 会自动部署！
```

---

## 🔧 故障排查

### 构建失败

检查 Cloudflare Pages 日志：
1. 进入项目 → **Deployments**
2. 点击失败的部署
3. 查看 **Build log** 了解错误信息

常见问题：
- ❌ `npm install` 失败：检查 `package.json` 依赖
- ❌ `npm run build` 失败：本地运行 `npm run build` 测试

### 访问被拒绝

- 清除浏览器缓存
- 在隐身模式下访问
- 检查 Cloudflare 防火墙规则

---

## 📋 清单

- [ ] GitHub 仓库已创建
- [ ] 代码已推送到 GitHub
- [ ] Cloudflare 账户已创建
- [ ] Pages 项目已连接
- [ ] 部署成功 ✅
- [ ] 可以访问 URL ✅

---

## 📞 需要帮助？

- **Cloudflare Pages 文档**: https://developers.cloudflare.com/pages/
- **Vite 部署指南**: https://vitejs.dev/guide/static-deploy.html
- **GitHub 推送帮助**: https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository
