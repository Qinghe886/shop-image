# 图铺工坊 · StorePic Works

> 专为电商商品图片打造的本地批处理工具 —— 不上传、不追踪、不改原图。

[![Build Desktop App](https://github.com/Qinghe886/shop-image/actions/workflows/build.yml/badge.svg)](https://github.com/Qinghe886/shop-image/actions/workflows/build.yml)

## 功能

- **批量处理** — 一次导入最多 100 张图片，拖拽或文件夹导入
- **格式转换** — 支持 WebP、AVIF、JPEG、PNG 互相转换
- **压缩优化** — 可调质量滑块，在体积和清晰度之间自由取舍
- **尺寸调整** — 限制最大尺寸，适配各平台要求
- **图片裁剪** — 内置裁剪编辑器，支持固定比例和自由裁剪
- **电商预设** — WooCommerce / Shopify / 亚马逊 / TikTok Shop 一键配置
- **离线运行** — 所有处理在浏览器本地完成，图片不会离开你的设备

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端框架 | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS 3 |
| 图片处理 | Canvas API + react-easy-crop |
| 文件操作 | JSZip + file-saver |
| 桌面打包 | Tauri 2.x (Rust) |
| CI/CD | GitHub Actions |

## 快速开始

### Web 开发

```bash
cd frontend
npm install
npm run dev          # 启动在 http://localhost:3006/image/
```

### Web 生产构建

```bash
npm run build
npm start            # 启动在 http://localhost:3006/image/
```

### 桌面应用（Tauri）

```bash
# 前置依赖：Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

cd frontend
npm install

# 开发模式（带热更新）
npm run tauri:dev

# 生产构建（生成 .app / .dmg / .exe）
npm run tauri:build
```

## 项目结构

```
shop-image/
├── frontend/                    # Next.js 前端应用
│   ├── src/
│   │   ├── app/                 # 页面路由
│   │   │   ├── layout.tsx       # 根布局（metadata）
│   │   │   ├── page.tsx         # 首页
│   │   │   └── globals.css      # 全局样式
│   │   ├── components/
│   │   │   ├── ImageStudio.tsx  # 核心工作区（导入/设置/处理/下载）
│   │   │   └── ImageCropEditor.tsx  # 裁剪编辑器弹窗
│   │   └── lib/
│   │       ├── image.ts         # Canvas 图片处理函数
│   │       ├── presets.ts       # 电商平台预设配置
│   │       └── types.ts         # TypeScript 类型定义
│   ├── public/icon.png          # 应用图标源文件
│   ├── next.config.js           # Next.js 配置（条件 basePath）
│   ├── package.json
│   └── src-tauri/               # Tauri 桌面应用配置
│       ├── tauri.conf.json      # 窗口/构建/打包配置
│       ├── Cargo.toml           # Rust 依赖
│       ├── src/lib.rs           # Rust 入口
│       └── icons/               # 各平台应用图标
└── .github/workflows/build.yml  # CI 自动构建桌面应用
```

## 环境变量

`TAURI` — 当设置为 `1` 时，Next.js 会：
- 移除 `basePath: '/image'`（桌面应用从根路径加载）
- 启用 `output: 'export'`（生成静态文件）

Web 开发/部署不受影响，`TAURI` 仅在 `npm run tauri:*` 脚本中通过 `cross-env` 设置。

## CI/CD

推送 `main` 分支自动触发 GitHub Actions：

- **macOS** → 构建 `.app` + `.dmg`
- **Windows** → 构建 `.exe` + `.msi`

构建产物在 Actions 页面的 Artifacts 中下载。

也可手动触发：**Actions → Build Desktop App → Run workflow**。

## License

MIT
