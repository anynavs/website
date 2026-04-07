# anynavs

**语言：** [English](README.en.md) · 中文

**在线站点（GitHub Pages）：** [https://anynavs.github.io/website/](https://anynavs.github.io/website/)

用 [Bun](https://bun.sh) 写的**静态导航站生成器**：读 `config.json` 与 `links.json`，套 `template/` 里的 HTML，输出到 `dist/`，可直接丢到任意静态托管（GitHub Pages、Cloudflare Pages、Nginx 等）。

## 功能概览

- 首页：分类 / 子分类 Tab、侧栏锚点、暗色主题切换、友情链接区块（可选）
- 外链：`dofollow: false` 的链接走站内 `redirect.html`（中间页），便于控制出站 SEO
- 独立页：`about.html`（站点与分类统计）、`redirect.html`（跳转中转）
- 构建时若存在根目录 `favicon.ico`、`logo.png` 会复制进 `dist/`

## 前置条件

- [Bun](https://bun.sh)（建议最新稳定版）

## 常用命令

```bash
bun install
bun run build    # 执行 index.ts，生成 dist/
bun run dev      # 本地起静态服务，默认 http://localhost:3366 ，读 dist/（改模板/数据后需先 build）
```

## 配置

### `config.json`

站点文案与 SEO 占位：`site_name`、`hero_*`、`footer_copyright`、`og_*`、`twitter_card` 等。  
可选 `friendly_links`：底部友情链接；无或 `[]` 则不渲染该区块。

### `links.json`

顶层为分类数组，每项大致为：

```json
{
  "name": "分类名",
  "notab": false,
  "list": []
}
```

- **扁平分类**：`list` 为链接对象数组（每项含 `name`、`url`、`domain`、`description`，可选 `dofollow`）。
- **带子 Tab**：`notab` 省略或 `false`，`list` 为 `{ "name": "子类名", "list": [ /* LinkItem */ ] }` 数组。

`domain` 用于 favicon（Google favicon 服务）与展示，需与站点主域一致或可解析。

## 目录约定

| 路径 | 说明 |
|------|------|
| `template/home.html` | 首页骨架，`{{categories}}`、`{{sidenav}}`、`{{friendly_links}}`、`{{svg_sprite}}` 等占位符 |
| `template/redirect.html` | 外链中转页模板 |
| `template/icons.svg` | SVG sprite，注入页面 |
| `dist/` | 构建产物（勿手改，由构建覆盖） |

## 快速部署

一键部署默认指向本仓库 [`anynavs/website`](https://github.com/anynavs/website)；若 fork 到自己的账号，把 URL 里的 `用户名/仓库名` 改成你的即可。

仓库根目录已含：

- **`vercel.json`** — 安装 `bun install`、构建 `bun run build`、输出 `dist`
- **`netlify.toml`** — 同上，发布目录 `dist`

### Vercel（vercel.app）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fanynavs%2Fwebsite&install-command=bun%20install&build-command=bun%20run%20build&output-directory=dist)

- 链接（同上）：`https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fanynavs%2Fwebsite&install-command=bun%20install&build-command=bun%20run%20build&output-directory=dist`

### Netlify（netlify.app）

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/anynavs/website)

- 链接（同上）：`https://app.netlify.com/start/deploy?repository=https://github.com/anynavs/website`

### Cloudflare Pages（`*.pages.dev` / 自定义域）

Cloudflare 没有「在 URL 里填好 GitHub 仓库」的一键入口，需登录后在控制台里连 Git：

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Pages** → **创建项目** → **连接到 Git**
2. 选仓库后，构建设置：
   - **构建命令**：`bun install && bun run build`
   - **构建输出目录**：`dist`

[文档：Deploying a static HTML site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## CI

推送或 PR 时 GitHub Actions 会执行 `bun install --frozen-lockfile` 与 `bun run build`（见 `.github/workflows/build.yml`）。请把 `bun.lock` 纳入版本库，否则 frozen 安装会失败。
