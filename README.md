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
│   ├── index.html             # 主页面（地图）
│   ├── console.html           # 管理控制台
│   ├── console-login.html     # 控制台登录页
│   ├── console-edit.html      # 地标编辑页面
│   ├── css/                   # 样式文件
│   ├── js/                    # 前端脚本
│   └── assets/                # 静态资源
├── functions/                 # Cloudflare Pages Functions
│   ├── _middleware.js         # 全局中间件（路由重写、鉴权）
│   └── api/                   # API 端点
│       ├── _shared.js         # 共享模块（默认数据、工具函数）
│       ├── auth.js            # 认证 API (POST, GET)
│       ├── landmarks.js       # 地标列表 API (GET, POST, PUT)
│       └── landmarks/
│           └── [id].js        # 单个地标 API (GET, PUT, DELETE)
├── wrangler.toml              # Cloudflare Wrangler 配置
├── .dev.vars                  # 本地开发环境变量（已在 .gitignore 中）
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

### 配置管理员密码

编辑 `.dev.vars` 文件，设置管理员密码：

```bash
ADMIN_PASSWORD=your-password-here
```

默认密码为 `admin123`，建议修改。

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://127.0.0.1:8788` 启动。

**命令说明**:
- `--kv LANDMARKS`: 创建本地 KV 模拟环境
- `--persist-to .wrangler/state`: 将本地 KV 数据持久化到磁盘

### 访问控制台

1. 打开浏览器访问 `http://localhost:8788/console`
2. 系统会自动重定向到登录页 `http://localhost:8788/console-login`
3. 输入管理员密码登录

### 本地数据持久化

开发模式下，KV 数据会保存在 `.wrangler/state` 目录，重启服务器后数据不会丢失。

如果要重置数据，删除 `.wrangler/state` 目录即可：

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .wrangler/state

# Linux/macOS
rm -rf .wrangler/state
```

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

### 3. 配置环境变量

在 Cloudflare Pages 项目中配置管理员密码：

1. 进入你的 Pages 项目
2. 点击 **设置** → **环境变量**
3. 点击 **+ 添加变量**
4. **变量名称**: `ADMIN_PASSWORD`
5. **值**: 设置你的管理员密码

### 4. 部署

```bash
npm run deploy
```

## API 端点

### 认证

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth` | 密码验证，设置认证 cookie | 否 |
| GET | `/api/auth` | 检查当前认证状态 | 否 |

### 地标列表

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/landmarks` | 获取所有地标 | 否 |
| POST | `/api/landmarks` | 创建新地标 | 是 |
| PUT | `/api/landmarks` | 批量导入/覆盖地标（导入功能） | 是 |

### 单个地标

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/landmarks/:id` | 获取单个地标 | 否 |
| PUT | `/api/landmarks/:id` | 更新地标 | 是 |
| DELETE | `/api/landmarks/:id` | 删除地标 | 是 |

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

**批量导入地标 (PUT)**

```json
[
  {
    "name": "地标1",
    "address": "地址1",
    "x": 30,
    "y": 40,
    "icon": "fa-location-dot",
    "color": "#4285f4"
  },
  {
    "name": "地标2",
    "address": "地址2",
    "x": 60,
    "y": 50,
    "icon": "fa-hospital",
    "color": "#34a853"
  }
]
```

## 功能说明

### 控制台登录

访问 `/console` 或 `/console-edit` 时，系统会检查认证状态。未认证用户会被重定向到 `/console-login` 登录页面。

- 密码验证通过后，设置 HttpOnly cookie（有效期 24 小时）
- 登录成功后自动跳转回控制台
- 支持按 Enter 键快速登录

### 数据导入导出

在控制台顶部导航栏提供导入/导出按钮：

**导出功能**:
- 将当前所有地标数据导出为 JSON 文件
- 文件名格式：`landmarks-backup-YYYY-MM-DD.json`
- 纯前端实现，无需后端处理

**导入功能**:
- 选择本地 JSON 文件进行导入
- 支持格式验证（必须是数组）
- 导入后自动覆盖所有现有数据
- 显示导入成功数量

## 配置说明

### wrangler.toml

```toml
name = "community-map-app"
compatibility_date = "2026-07-19"
pages_build_output_dir = "public"
```

**安全注意**: KV 命名空间 ID **不应硬编码**在 `wrangler.toml` 中。线上部署时通过 Cloudflare 控制台配置绑定，本地开发使用 `--kv` 参数创建模拟环境。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| ADMIN_PASSWORD | 控制台管理员密码 | 无（必须设置） |

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

### Q: 如何修改管理员密码？

A: 本地开发修改 `.dev.vars` 文件中的 `ADMIN_PASSWORD`；线上部署在 Cloudflare 控制台的 **设置 → 环境变量** 中修改。

## 许可证

MIT License