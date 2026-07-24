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
│       ├── default-map.webp            # 地图底图
│       └── default-config.json # 默认地标数据与配置
├── functions/                 # Cloudflare Pages Functions
│   ├── _middleware.js         # 全局中间件（路由重写、鉴权）
│   └── api/                   # API 端点
│       ├── _shared.js         # 共享模块（默认数据、工具函数、地理编码）
│       ├── auth.js            # 认证 API (POST, GET)
│       ├── config.js          # 配置 API (GET, POST)
│       ├── geocode.js         # 天地图地理编码 API (GET)
│       ├── landmarks.js       # 地标列表 API (GET, POST, PUT)
│       └── landmarks/
│           └── [id].js        # 单个地标 API (GET, PUT, DELETE)
├── .dev.vars.example          # 本地开发环境变量示例
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

默认密码为 `admin`，建议修改。

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://127.0.0.1:8788` 启动。

**命令说明**:

- `--kv MAPAPP`: 创建本地 KV 模拟环境
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

### 方式一：通过 Cloudflare 控制台部署（推荐）

1. **创建 Pages 项目**
   - 登录 Cloudflare 控制台
   - 进入 **Workers & Pages** → **Pages**
   - 点击 **创建项目** → **连接到 Git**
   - 选择你的 GitHub/GitLab 仓库
   - 配置构建设置：
     - **构建命令**: 留空（无需构建）
     - **构建输出目录**: `public`
2. **创建 KV 命名空间**
   - 进入 **Workers & Pages** → **KV**
   - 点击 **创建命名空间**
   - 输入名称（例如：`community-map-kv`）
3. **配置 Pages 绑定**
   - 进入你的 Pages 项目
   - 点击 **设置** → **绑定**
   - 点击 **+ 添加绑定** → 选择 **KV 命名空间**
   - **变量名称**: `MAPAPP`（必须与代码中的绑定名一致）
   - **KV 命名空间**: 选择你创建的命名空间
4. **配置环境变量**
   - 进入你的 Pages 项目
   - 点击 **设置** → **环境变量**
   - 点击 **+ 添加变量**
   - **变量名称**: `ADMIN_PASSWORD`
   - **值**: 设置你的管理员密码
   - 勾选 **加密** 选项（推荐）
5. **触发部署**
   - 在 Pages 项目的 **部署** 页面点击 **重新部署**
   - 或推送代码到仓库自动触发部署

### 方式二：通过 Wrangler CLI 部署

此方法建议用于私有仓库部署

```bash
npm run deploy
```

**注意**: 使用 CLI 部署前需要在 `wrangler.toml` 中配置 KV 绑定。如果不使用显式环境变量存储管理员密码，则需要在Cloudflare控制台中增加机密变量 `ADMIN_PASSWORD`。复制 `wrangler.toml.example` 为 `wrangler.toml` 并修改配置。

## API 端点

### 认证

| 方法   | 端点          | 描述               | 认证 |
| ---- | ----------- | ---------------- | -- |
| POST | `/api/auth` | 密码验证，设置认证 cookie | 否  |
| GET  | `/api/auth` | 检查当前认证状态         | 否  |

### 地标列表

| 方法   | 端点               | 描述              | 认证 |
| ---- | ---------------- | --------------- | -- |
| GET  | `/api/landmarks` | 获取所有地标          | 否  |
| POST | `/api/landmarks` | 创建新地标           | 是  |
| PUT  | `/api/landmarks` | 批量导入/覆盖地标（导入功能） | 是  |

### 单个地标

| 方法     | 端点                   | 描述     | 认证 |
| ------ | -------------------- | ------ | -- |
| GET    | `/api/landmarks/:id` | 获取单个地标 | 否  |
| PUT    | `/api/landmarks/:id` | 更新地标   | 是  |
| DELETE | `/api/landmarks/:id` | 删除地标   | 是  |

### 配置

| 方法   | 端点            | 描述                              | 认证 |
| ---- | ------------- | ------------------------------- | -- |
| GET  | `/api/config` | 获取当前配置（region、boundaryBuffer 等） | 否  |
| POST | `/api/config` | 保存配置到 KV                        | 是  |

### 地理编码

| 方法  | 端点                        | 描述                           | 认证 |
| --- | ------------------------- | ---------------------------- | -- |
| GET | `/api/geocode?address=地址` | 天地图地址→坐标转换，返回 `{ lat, lng }` | 是  |

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

**安全注意**: 如果为公共仓库，KV 命名空间 ID **不应硬编码**在 `wrangler.toml` 中。线上部署时通过 Cloudflare 控制台配置绑定，本地开发使用 `--kv` 参数创建模拟环境。

如私有仓库需通过 CLI 部署，复制 `wrangler.toml.example` 为 `wrangler.toml` 并按注释修改配置。

### 环境变量

| 变量名             | 说明                    | 默认值     |
| --------------- | --------------------- | ------- |
| ADMIN\_PASSWORD | 控制台管理员密码              | 无（必须设置） |
| TIANDITU\_KEY   | 天地图 API 密钥（用于地址→坐标转换） | 无       |
| BAIDU\_AK       | 百度地图 API AK（用于导航功能）   | 无       |

### 地标数据模型

每个地标包含以下字段：

| 字段            | 类型      |  必填 | 说明                                     |
| ------------- | ------- | :-: | -------------------------------------- |
| `id`          | string  |  ✅  | 唯一标识符（如 `zhou-gongguan`）               |
| `name`        | string  |  ✅  | 地标名称（API 校验非空）                         |
| `x`           | number  |  ✅  | 地图 X 坐标（百分比，0-100）                     |
| `y`           | number  |  ✅  | 地图 Y 坐标（百分比，0-100）                     |
| `address`     | string  |  —  | 地址文本，创建/更新有地址时自动触发地理编码                 |
| `lat`         | number  |  —  | 纬度（GCJ-02 坐标系），为空时高德导航按钮禁用             |
| `lng`         | number  |  —  | 经度（GCJ-02 坐标系）                         |
| `description` | string  |  —  | 详细介绍，支持朗读功能                            |
| `imageUrl`    | string  |  —  | 图片链接                                   |
| `icon`        | string  |  —  | Font Awesome 图标类名（如 `fa-location-dot`） |
| `color`       | string  |  —  | 图标颜色（如 `#4285f4`）                      |
| `enabled`     | boolean |  —  | 是否在地图上显示                               |
| `createdAt`   | number  |  —  | 创建时间戳                                  |
| `updatedAt`   | number  |  —  | 更新时间戳                                  |

### 更改底图

底图支持通过控制台在线管理，无需手动替换文件：

1. **通过控制台上传**
   - 登录管理控制台（`/console`）
   - 点击顶部导航栏的"底图"按钮
   - 在弹窗中可以预览当前底图、上传新底图或恢复默认底图
   - 支持格式：webp / png / jpeg，最大 10MB
2. **手动替换默认底图**
   - 将新底图文件命名为 `default-map.webp`
   - 图片格式建议为 WebP
   - 推荐分辨率：根据实际地图区域大小调整，建议使用高分辨率图片以支持缩放
   - 将 `default-map.webp` 复制到 `public/assets/` 目录，覆盖原有文件
3. **验证修改**
   - 本地开发：重启开发服务器后刷新页面
   - 线上部署：推送代码到仓库或重新部署

**注意**：默认底图文件名必须为 `default-map.webp`，位置必须在 `/assets/` 目录下。自定义底图通过 API 上传后存储在 Cloudflare KV 中，优先级高于默认底图。代码中引用底图的位置：

- API 端点：`/api/map-image`（由 `functions/api/map-image.js` 处理）
- `public/index.html` 第 440 行
- `public/console-edit.html` 第 848 行

## 导航功能

### 坐标系说明

| 坐标系    | 使用场景           | 说明                            |
| ------ | -------------- | ----------------------------- |
| WGS84  | 浏览器定位          | 浏览器 `geolocation` API 返回的原始坐标 |
| GCJ-02 | 高德地图、腾讯地图、地标存储 | 中国国测局加密坐标，天地图地理编码返回此坐标系       |
| BD-09  | 百度地图           | 百度在 GCJ-02 基础上二次加密            |

坐标转换使用 [gcoord](https://github.com/hujiulong/gcoord) 库：

- 浏览器定位 (WGS84) → 百度地图 (BD-09)：`gcoord.transform([lng, lat], gcoord.WGS84, gcoord.BD09)`
- 浏览器定位 (WGS84) → 高德/腾讯 (GCJ-02)：`gcoord.transform([lng, lat], gcoord.WGS84, gcoord.GCJ02)`

### 导航链接构造

点击地标详情中的"步行导航"按钮 → 弹出二级窗口选择地图平台 → 点击"导航"打开地图 App 或跳转网页。

| 参数    | 数据来源                        | 百度地图                                    | 高德地图                           | 腾讯地图                       |
| ----- | --------------------------- | --------------------------------------- | ------------------------------ | -------------------------- |
| 目的地名称 | `landmark.name`             | `destination=周公馆`                       | `to=周公馆` *(无坐标时)*              | `to=周公馆`                   |
| 目的地坐标 | `landmark.lat/lng` (GCJ-02) | *不使用*                                   | `to=lng,lat,endpoint` (GCJ-02) | `tocoord=lat,lng` (GCJ-02) |
| 起点坐标  | 浏览器定位 (WGS84)               | `origin=latlng:bd_lat,bd_lng` (转 BD-09) | *不传，地图自行获取*                    | *不传，地图自行获取*                |
| 区域    | `mapConfig.region`          | `destination_region=上海`                 | —                              | —                          |
| 出行方式  | 硬编码                         | `mode=walking`                          | `mode=walk`                    | `type=walk`                |
| 输出格式  | 硬编码                         | `output=html`                           | —                              | —                          |
| 来源标识  | 动态域名                        | `src=当前域名`                              | `src=当前域名`                     | —                           |

**URL 示例**：

```
# 百度地图（有定位 + 有坐标时）
https://api.map.baidu.com/direction?destination=周公馆&mode=walking&region=上海&output=html&src=localhost&origin=latlng:31.214,121.468|name:我的位置

# 百度地图（定位失效时，无起点坐标）
https://api.map.baidu.com/direction?destination=周公馆&mode=walking&region=上海&output=html&src=localhost

# 高德地图（有坐标时）
https://uri.amap.com/navigation?to=121.468,31.214,周公馆&mode=walk&src=localhost

# 高德地图（无坐标时，按钮禁用）

# 腾讯地图（有坐标时，GCJ-02→WGS84 转换 + coord_type=1）
https://apis.map.qq.com/uri/v1/routeplan?type=walk&to=周公馆&tocoord=31.212,121.466&coord_type=1

# 腾讯地图（无坐标时，仅传目的地名称）
https://apis.map.qq.com/uri/v1/routeplan?type=walk&to=周公馆
```

**注意**：高德地图必须提供目的地坐标，否则导航链接无效。当前端检测到地标缺少 `lat/lng` 时，高德地图的导航按钮会自动禁用。

### 地理编码

创建或更新地标时，如果提供了 `address` 但缺少 `lat/lng`，后端会自动调用天地图 API 将地址转换为坐标。

- 需要在环境变量中配置 `TIANDITU_KEY`
- 手动触发：编辑页中点击"获取坐标"按钮调用 `/api/geocode`
- 申请地址：<http://lbs.tianditu.gov.cn>

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

A: 为了防止敏感信息泄露，KV 配置默认不在 `wrangler.toml` 中。推荐通过 Cloudflare 控制台配置绑定。如需通过 CLI 部署，复制 `wrangler.toml.example` 为 `wrangler.toml` 并修改配置。

### Q: 为什么 Cloudflare 控制台显示"绑定/环境变量通过 wrangler.toml 管理"？

A: 当 Cloudflare 检测到项目中存在 `wrangler.toml` 文件时，会将其视为配置的"单一真实来源"。如果 `wrangler.toml` 中缺少配置，需要在控制台重新配置绑定和环境变量，或更新 `wrangler.toml`。

### Q: preview\_id 是否必需？

A: 对于只有一个 main 分支的项目，可以不使用 preview\_id。本地开发使用相同的 KV 模拟环境即可。

### Q: 如何修改管理员密码？

A: 本地开发修改 `.dev.vars` 文件中的 `ADMIN_PASSWORD`；线上部署在 Cloudflare 控制台的 **设置 → 环境变量** 中修改。

### Q: 如何更换地图底图？

A: 推荐通过控制台（`/console` → "底图"按钮）在线上传，支持 webp/png/jpeg 格式，最大 10MB。也可手动替换 `public/assets/default-map.webp` 文件。详细步骤请参考"更改底图"章节。

## 许可证

MIT License
