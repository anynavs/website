# anynavs

**Language:** English · [中文](README.md)

**Live sites:**

- [GitHub Pages](https://anynavs.github.io/website/)
- [Netlify](https://anynavs.netlify.app/)
- [Cloudflare Workers](https://website.anynavs.workers.dev/)
- [GitLab Pages](https://website-a685e6.gitlab.io/)

A **static navigation site generator** built with **Node.js**. It reads `config.json` and `links.json`, fills HTML templates under `template/`, and writes output to `dist/` for any static host (GitHub Pages, Cloudflare Pages, Nginx, etc.).

## Features

- **Home**: categories / sub-category tabs, sidebar anchors, dark mode, optional “friendly links” block
- **Outbound links**: entries with `dofollow: false` use in-site `redirect.html` (interstitial) for outbound SEO control
- **Standalone pages**: `about.html` (site & category stats), `redirect.html` (redirect hop)
- **Assets**: if `favicon.ico` and `logo.png` exist at the repo root, they are copied into `dist/` on build

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)

## Commands

```bash
npm install
npm run build    # runs index.ts → writes dist/
npm run dev        # build then static server, default http://localhost:3366 , serves dist/ (re-run build after template/data changes)
```

## Configuration

### `config.json`

Site copy and SEO placeholders: `site_name`, `hero_*`, `footer_copyright`, `og_*`, `twitter_card`, etc.  
Optional `friendly_links`: footer links block; omit or use `[]` to hide it.

### `links.json`

Top level is an array of categories. Each item looks like:

```json
{
  "name": "Category name",
  "notab": false,
  "list": []
}
```

- **Flat category**: `list` is an array of link objects (`name`, `url`, `domain`, `description`, optional `dofollow`).
- **Tabbed subcategories**: omit `notab` or set `false`; `list` is an array of `{ "name": "Sub name", "list": [ /* LinkItem */ ] }`.

`domain` is used for the favicon (Google favicon service) and display; it should match the site’s primary host or resolve sensibly.

## Project layout

| Path | Role |
|------|------|
| `template/home.html` | Home shell; placeholders like `{{categories}}`, `{{sidenav}}`, `{{friendly_links}}`, `{{svg_sprite}}` |
| `template/redirect.html` | Outbound redirect page template |
| `template/icons.svg` | SVG sprite injected into pages |
| `dist/` | Build output (do not edit by hand; overwritten on build) |

## Quick deploy

One-click deploy defaults to this repo [`anynavs/website`](https://github.com/anynavs/website). If you fork it, change `user/repo` in the URLs to yours.

The repo root already includes:

- **`vercel.json`** — `npm install`, `npm run build`, output `dist`
- **`netlify.toml`** — same build; publish directory `dist`
- **`wrangler.toml`** — **Workers** `wrangler deploy`: `[assets].directory` is `dist`; **Pages** (Git): set output directory to `dist` in the dashboard (no `pages_build_output_dir` here — avoids clashing with Workers deploy)

### Vercel (vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fanynavs%2Fwebsite&install-command=npm%20install&build-command=npm%20run%20build&output-directory=dist)

- Same URL: `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fanynavs%2Fwebsite&install-command=npm%20install&build-command=npm%20run%20build&output-directory=dist`

### Netlify (netlify.app)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/anynavs/website)

- Same URL: `https://app.netlify.com/start/deploy?repository=https://github.com/anynavs/website`

### Cloudflare Pages (`*.pages.dev` / custom domain)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/)

**Note:** The official [Deploy to Cloudflare](https://developers.cloudflare.com/workers/platform/deploy-buttons/) one-click flow targets **Workers** only (docs state **Pages** apps are not supported). The badge above opens the Dashboard; sign in, then **Workers & Pages → Pages → Create project → Connect to Git**. Build settings below (enter `dist` in the dashboard for Pages; Workers uses `[assets]` in `wrangler.toml`):

- **Build command**: `npm install && npm run build`
- **Build output directory**: `dist`

- Same URL: `https://dash.cloudflare.com/`

[Docs: Deploying a static HTML site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) · [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/binding/) · [Wrangler Pages configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)

## CI

On push and pull request, GitHub Actions runs `npm ci` and `npm run build` (see `.github/workflows/build.yml`). Commit `package-lock.json` to the repo; otherwise `npm ci` will fail.
