# anynavs

**Language:** English · [中文](README.md)

A **static navigation site generator** built with [Bun](https://bun.sh). It reads `config.json` and `links.json`, fills HTML templates under `template/`, and writes output to `dist/` for any static host (GitHub Pages, Cloudflare Pages, Nginx, etc.).

## Features

- **Home**: categories / sub-category tabs, sidebar anchors, dark mode, optional “friendly links” block
- **Outbound links**: entries with `dofollow: false` use in-site `redirect.html` (interstitial) for outbound SEO control
- **Standalone pages**: `about.html` (site & category stats), `redirect.html` (redirect hop)
- **Assets**: if `favicon.ico` and `logo.png` exist at the repo root, they are copied into `dist/` on build

## Prerequisites

- [Bun](https://bun.sh) (latest stable recommended)

## Commands

```bash
bun install
bun run build    # runs index.ts → writes dist/
bun run dev      # static server, default http://localhost:3366 , serves dist/ (re-run build after template/data changes)
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

Replace `OWNER` in the URLs below with your GitHub user or org (the repo must be on GitHub).

The repo root already includes:

- **`vercel.json`** — `bun install`, `bun run build`, output `dist`
- **`netlify.toml`** — same build; publish directory `dist`

### Vercel (vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOWNER%2Fanynavs&install-command=bun%20install&build-command=bun%20run%20build&output-directory=dist)

- Same URL: `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FOWNER%2Fanynavs&install-command=bun%20install&build-command=bun%20run%20build&output-directory=dist`

### Netlify (netlify.app)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/OWNER/anynavs)

- Same URL: `https://app.netlify.com/start/deploy?repository=https://github.com/OWNER/anynavs`

### Cloudflare Pages (`*.pages.dev` / custom domain)

Cloudflare does not expose a one-click “prefill GitHub repo” URL. After you sign in, connect Git from the dashboard:

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Pages** → **Create project** → **Connect to Git**
2. Pick the repo, then set:
   - **Build command**: `bun install && bun run build`
   - **Build output directory**: `dist`

[Docs: Deploying a static HTML site](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## CI

On push and pull request, GitHub Actions runs `bun install --frozen-lockfile` and `bun run build` (see `.github/workflows/build.yml`). Commit `bun.lock` to the repo; otherwise the frozen install step will fail.
