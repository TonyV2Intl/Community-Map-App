# Community Map App

社区地图应用 - 基于 Cloudflare Pages + Functions 构建的交互式地图应用。

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript (原生)
- **后端**: Cloudflare Pages Functions (Serverless)
- **数据库**: Cloudflare KV (键值存储)
- **图标**: Font Awesome
- **部署**: Cloudflare Pages

## 项目结构

```
Community-Map-App/
├── public/                    # 前端静态资源
│   ├── index.html             # 主页面
│   ├── css/                   # 样式文件
│   ├── js/                    # 前端脚本
│   └── assets/                # 静态资源
├── functions/                 # Cloudflare Pages Functions
│   └── api/                   # API 端点
│       ├── landmarks.js       # 地标列表 API (GET, POST)
│       └── landmarks/
│           └── [id].js        # 单个地标 API (GET, PUT, DELETE)
├── wrangler.toml              # Cloudflare Wrangler 配置
└── package.json               # 项目依赖和脚本
```

## 环境要求

- Node.js >= 18.x
- Wrangler CLI (`npm install -g wrangler`)

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://127.0.0.1:8788` 启动。

**命令说明**:
- `--kv LANDMARKS`: 创建本地 KV 模拟环境
- `--persist-to .wrangler/state`: 将本地 KV 数据持久化到磁盘

### 本地数据持久化

开发模式下，KV 数据会保存在 `.wrangler/state` 目录，重启服务器后数据不会丢失。

## 部署到 Cloudflare Pages

### 1. 创建 KV 命名空间

在 Cloudflare 控制台创建 KV 命名空间：

1. 登录 Cloudflare 控制台
2. 进入 **Workers & Pages** → **KV**
3. 点击 **创建命名空间**
4. 输入名称（例如：`community-map-kv`）

### 2. 配置 Pages 绑定

在 Cloudflare Pages 项目中配置 KV 绑定：

1. 进入你的 Pages 项目
2. 点击 **设置** → **绑定**
3. 点击 **+ 添加绑定** → 选择 **KV 命名空间**
4. **变量名称**: `LANDMARKS`（必须与代码中的绑定名一致）
5. **KV 命名空间**: 选择你创建的命名空间

### 3. 部署

```bash
npm run deploy
```

## API 端点

### 地标列表

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/landmarks` | 获取所有地标 |
| POST | `/api/landmarks` | 创建新地标 |

### 单个地标

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/landmarks/:id` | 获取单个地标 |
| PUT | `/api/landmarks/:id` | 更新地标 |
| DELETE | `/api/landmarks/:id` | 删除地标 |

### 请求示例

**创建地标 (POST)**

```json
{
  "name": "新地标名称",
  "address": "地址信息",
  "x": 50,
  "y": 50,
  "icon": "fa-location-dot",
  "color": "#4285f4",
  "description": "地标描述"
}
```

## 配置说明

### wrangler.toml

```toml
name = "community-map-app"
compatibility_date = "2026-07-19"
pages_build_output_dir = "public"
```

**安全注意**: KV 命名空间 ID **不应硬编码**在 `wrangler.toml` 中。线上部署时通过 Cloudflare 控制台配置绑定，本地开发使用 `--kv` 参数创建模拟环境。

### 环境变量

项目不使用 `.env` 文件。敏感配置（如 KV ID）通过以下方式管理：

- **本地开发**: 使用 CLI 参数 `--kv LANDMARKS`
- **线上部署**: 在 Cloudflare 控制台配置绑定

## CORS 支持

API 已配置 CORS 头部，支持跨域请求：

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## 默认数据

首次访问 API 时，如果 KV 中没有数据，会自动初始化默认地标数据（包含 8 个上海黄浦区地标）。

## 常见问题

### Q: 本地开发时如何模拟 KV？

A: 使用 `npm run dev` 命令，wrangler 会自动创建本地 KV 模拟环境，数据持久化到 `.wrangler/state` 目录。

### Q: 为什么 wrangler.toml 中没有 KV 配置？

A: Cloudflare wrangler **不支持** `${VAR_NAME}` 环境变量语法。为了防止敏感信息泄露，KV 配置仅在部署时通过控制台设置。

### Q: preview_id 是否必需？

A: 对于只有一个 main 分支的项目，可以不使用 preview_id。本地开发使用相同的 KV 模拟环境即可。

## 许可证

MIT License