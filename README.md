# Bookmark Collection

Bookmark Collection 是一个没有后台登录的个人网址收藏夹：你在浏览器里看到好网站，可以打开站内隐藏入口手动提交链接，Cloudflare Worker 会自动调用 Geekflare 获取标题、描述、截图并智能分类，然后写入 Cloudflare KV，前端页面会立即展示最新结果。

## 当前部署方式

这个项目已经切到 Cloudflare 现在主推的统一模式：

- `worker/` 负责 API
- `frontend/dist` 作为静态资源由同一个 Worker 发布
- 部署时不再依赖单独的 Pages 项目或 `pages.dev` 回源

Cloudflare 官方文档当前建议：

- 新项目优先使用 Workers Static Assets 部署静态站点、SPA 和全栈应用
- Pages 仍然可用，但新特性和优化重点放在 Workers

## 技术栈

- 前端：Vite + React + TypeScript + TanStack Query + Tailwind CSS
- 后端：Hono on Cloudflare Workers
- 存储：Cloudflare KV（绑定名 `SITES_KV`）
- 页面元数据和截图：Geekflare API
- 工具链：TypeScript strict mode、ESLint、Prettier

## 项目结构

```text
site-collections/
├── frontend/
│   ├── src/
│   ├── vite.config.ts
│   └── package.json
├── worker/
│   ├── src/index.ts
│   ├── wrangler.toml
│   ├── .dev.vars
│   └── package.json
├── package.json
└── README.md
```

Cloudflare KV 里只保存一个 key：`sites`，内容为 `Site[]` JSON 数组。

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Worker

编辑 [worker/wrangler.toml](./worker/wrangler.toml)：

- `name`：你的 Worker 名称
- `[[kv_namespaces]]`：填入真实 KV namespace id
- `ALLOWED_ORIGINS`：可选。只有当前端和 API 不在同一个域名时才需要配置额外来源

在 [worker/.dev.vars](./worker/.dev.vars) 中配置本地敏感变量：

```bash
SECRET_KEY="replace-with-your-secret-key"
GEEKFLARE_API_KEY="replace-with-your-geekflare-api-key"
```

### 3. 前端环境变量

默认不需要配置 `VITE_API_BASE_URL`，因为：

- 生产环境下，前端和 API 由同一个 Worker 域名提供
- 本地 `npm run dev` 时，Vite 会把 `/api` 代理到本地 Worker

如果你要绕过 Vite 代理直连 API，再在 `frontend/.env.development.local` 里配置：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_ADD_KEY=replace-with-your-secret-key
```

这里特意使用 `development` 专属环境文件，避免把本地 `127.0.0.1` 地址打进生产构建。

### 4. 启动开发服务

推荐两种模式：

```bash
npm run dev
```

- 启动 Vite HMR 开发服务器
- 同时启动本地 Worker
- 前端通过 `/api` 代理访问 Worker

```bash
npm run dev:cloudflare
```

- 先持续构建 `frontend/dist`
- 再由 `wrangler dev` 直接托管静态资源和 API
- 更接近线上 Cloudflare 的实际行为

## API

### `GET /api/sites`

- 无需鉴权
- 返回 KV 中所有 `Site[]`

### `POST /api/add`

- 支持 `?key=xxx` 或请求头 `x-secret-key: xxx`
- body:

```json
{
  "url": "https://example.com"
}
```

处理顺序：

1. 调用 Geekflare `/metascraping`
2. 调用 Geekflare `/screenshot`
3. 提取 `title`、`description`、`ogImage`
4. 执行 `categorize()`
5. 生成 `newSite`
6. 将 `newSite` 插入数组头部并写回 KV

## 隐藏添加入口

项目内置了一个不出现在导航里的隐藏页面：

- 路径：`/collection-gate`
- 用途：手动输入网址和 `secret key`，直接调用同域的 `POST /api/add`

例如，你的站点部署在 `https://your-site.com`，那么隐藏入口就是：

```text
https://your-site.com/collection-gate
```

这个方案不再依赖 Bookmarklet，也不会从任意第三方网站上下文发起跨站请求，因此不会再遇到之前那种浏览器 CORS 预检失败的问题。

## Cloudflare 部署

### 一体化部署

在仓库根目录执行：

```bash
npm run deploy
```

这个命令会：

1. 构建 `frontend/dist`
2. 校验 Worker TypeScript
3. 通过 `wrangler deploy` 一次性发布 API 和静态资源

### 线上需要配置的内容

- `SECRET_KEY`
- `GEEKFLARE_API_KEY`
- `SITES_KV`

可选：

- `ALLOWED_ORIGINS`

只有当你需要从其它域名直接调用 `/api/*` 时，才需要配置它。正常同域部署不需要。

## 说明

- `POST /api/add` 适合前端页面或其它受控调用方使用
- 隐藏添加页位于 `/collection-gate`，不会出现在站点导航中
- 前端使用 TanStack Query 管理列表拉取和本地开发时的添加动作
- Worker 内部用串行写队列减少并发写入丢失风险，适合个人收藏夹场景
- `worker/wrangler.toml` 里已经启用了 SPA 静态资源回退，刷新前端路由时会自动回到 `index.html`
