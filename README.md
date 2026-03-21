# Bookmark Collection

Bookmark Collection 是一个没有后台登录的个人网址收藏夹：你在浏览器里看到好网站，点击一次 Bookmarklet，Cloudflare Worker 会自动调用 Geekflare 获取标题、描述、截图并智能分类，然后写入 Cloudflare KV，前端页面会立即展示最新结果。

## 技术栈

- 前端：Vite + React + TypeScript + TanStack Query + Tailwind CSS
- 后端：Hono on Cloudflare Workers
- 存储：Cloudflare KV（绑定名 `SITES_KV`）
- 页面元数据和截图：Geekflare API
- 工具链：TypeScript strict mode、ESLint、Prettier

## 项目结构

```text
my-bookmarks/
├── frontend/
│   ├── src/
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SiteCard.tsx
│   │   │   └── CategoryFilter.tsx
│   │   ├── hooks/
│   │   │   ├── useSites.ts
│   │   │   └── useAddSite.ts
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── worker/
│   ├── src/index.ts
│   ├── wrangler.toml
│   └── package.json
├── package.json
└── README.md
```

> 当前仓库根目录就是上面结构里的 `my-bookmarks/`。

## 数据模型

```ts
export interface Site {
  id: string;
  url: string;
  title: string;
  description: string;
  category: '设计' | '工具' | '博客' | '资讯' | '其他';
  screenshot: string;
  ogImage?: string;
  addedAt: string;
}
```

Cloudflare KV 里只保存一个 key：`sites`，内容为 `Site[]` JSON 数组。

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Worker

编辑 [worker/wrangler.toml](./worker/wrangler.toml)：

- `SECRET_KEY`：保护 `/api/add`
- `GEEKFLARE_API_KEY`：Geekflare 控制台申请的 API Key
- `PAGES_ORIGIN`：你的 Pages 域名，比如 `https://bookmark-collection.pages.dev`
- `[[kv_namespaces]]`：填入真实 KV namespace id

### 3. 配置前端环境变量

在 [frontend](./frontend) 下创建 `.env.local`：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
VITE_ADD_KEY=replace-with-your-secret-key
```

`VITE_ADD_KEY` 只建议本地开发使用，生产环境不要在 Pages 里配置它。

### 4. 启动开发服务

```bash
npm run dev:worker
npm run dev:frontend
```

默认前端会通过 Vite 代理或 `VITE_API_BASE_URL` 访问 Worker。

## API 说明

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

成功返回：

```json
{
  "success": true,
  "site": {
    "...": "..."
  }
}
```

## Bookmarklet

把下面这段代码保存成浏览器书签地址，然后把 `YOUR_WORKER_URL` 和 `YOUR_SECRET_KEY` 替换成真实值：

```javascript
javascript:(async()=>{const url=location.href;const endpoint='https://YOUR_WORKER_URL.workers.dev/api/add?key=YOUR_SECRET_KEY';try{const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Add failed');alert(`收藏成功：${data.site.title}`);}catch(error){alert(`收藏失败：${error instanceof Error?error.message:'Unknown error'}`);}})();
```

## Cloudflare 部署

### Frontend on Pages

- Framework preset：`Vite`
- Root directory：`frontend`
- Build command：`npm run build`
- Build output directory：`dist`
- 环境变量：
  - `VITE_API_BASE_URL=https://your-worker.workers.dev`

### Worker on Cloudflare Workers

```bash
cd worker
wrangler deploy
```

先确保 `wrangler.toml` 和 Dashboard 中都已经填好：

- `SECRET_KEY`
- `GEEKFLARE_API_KEY`
- `PAGES_ORIGIN`
- `SITES_KV`

## 说明

- `POST /api/add` 不依赖后台管理界面，直接由 Bookmarklet 触发
- 前端使用 TanStack Query 管理列表拉取和本地开发时的添加动作
- CORS 默认只允许 `PAGES_ORIGIN`，本地开发额外允许 `localhost`
- Worker 内部用串行写队列减少并发写入丢失风险，适合个人收藏夹场景
