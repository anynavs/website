/**
 * anynavs — 静态导航站生成器
 * 从 config.json + links.json 读取数据，替换模板占位符，生成静态 HTML 到 dist/
 */

import { existsSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";

// ── 类型定义 ──────────────────────────────────────────────

interface LinkItem {
  name: string;
  url: string;
  domain: string;
  dofollow?: boolean; // 是否为dofollow
  description: string;
}

interface SubCategory {
  name: string;
  list: LinkItem[];
}

interface Category {
  name: string;
  notab?: boolean;
  list: LinkItem[] | SubCategory[];
}

interface Config {
  site_name: string;
  site_description: string;
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  footer_copyright: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_url: string;
  twitter_card: string;
  /** 可省略或 []；无条目时不渲染友情链接区块 */
  friendly_links?: { name: string; url: string; nofollow?: boolean; description?: string }[];
}

// ── 工具函数 ──────────────────────────────────────────────

function isLinkItem(item: LinkItem | SubCategory): item is LinkItem {
  return "url" in item && "domain" in item;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}

function faviconUrl(domain: string): string {
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=64`;
}

function redirectUrl(url: string): string {
  return `/redirect.html?url=${encodeURIComponent(url)}`;
}

// ── HTML 生成器 ───────────────────────────────────────────

/** 生成单个链接卡片 */
function linkCard(item: LinkItem): string {
  const escapedName = escapeHtml(item.name);
  const escapedDesc = escapeHtml(item.description);
  const href = item.dofollow ? item.url : redirectUrl(item.url);
  const escapedHref = escapeAttr(href);
  const favicon = faviconUrl(item.domain);

  return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" class="link-card-wrap group bg-surface-container rounded-xl p-4 transition-all hover:bg-surface-container-high hover:translate-y-[-2px] border border-outline-variant/5">
                <div class="link-card" data-name="${escapeAttr(item.name)}" data-desc="${escapeAttr(item.description)}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden group-hover:shadow-[0_0_15px_rgba(106,178,255,0.2)] transition-shadow shrink-0">
                            <img src="${favicon}" alt="" class="w-5 h-5" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-base font-bold text-on-surface truncate">${escapedName}</h3>
                            <p class="text-xs text-on-surface-variant truncate">${escapedDesc}</p>
                        </div>
                        <svg class="icon w-4 h-4 text-outline-variant group-hover:text-on-surface transition-colors"><use href="#i-open-new"/></svg>
                    </div>
                </div>
            </a>`;
}

/** 生成扁平分类 */
function flatCategory(cat: Category): string {
  const items = cat.list as LinkItem[];
  const cards = items.map(linkCard).join("\n                ");
  const escapedName = escapeHtml(cat.name);

  return `
        <section class="category-section mb-14" id="cat-${encodeURIComponent(cat.name)}">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                    <span class="w-1.5 h-6 bg-primary rounded-full"></span>
                    ${escapedName}
                </h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${cards}
            </div>
        </section>`;
}

/** 生成带 tab 切换的嵌套分类 */
function tabCategory(cat: Category): string {
  const subs = cat.list as SubCategory[];
  const escapedCatName = escapeHtml(cat.name);

  const tabButtons = subs
    .map(
      (sub, i) =>
        `<button class="tab-btn px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${i === 0 ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-highest"}" data-tab="${i}">${escapeHtml(sub.name)}</button>`
    )
    .join("\n                ");

  const tabPanels = subs
    .map(
      (sub, i) => `
                <div class="tab-panel grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${i === 0 ? "active" : ""}" data-panel="${i}">
                    ${sub.list.map(linkCard).join("\n                    ")}
                </div>`
    )
    .join("\n");

  return `
        <section class="category-section mb-14 tab-group" id="cat-${encodeURIComponent(cat.name)}">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
                    <span class="w-1.5 h-6 bg-tertiary rounded-full"></span>
                    ${escapedCatName}
                </h2>
            </div>
            <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
                ${tabButtons}
            </div>
            ${tabPanels}
        </section>`;
}

/** 生成侧边栏导航 */
function sideNavHtml(categories: Category[]): string {
  return categories
    .map(
      (cat, i) =>
        `<a class="${i === 0 ? "text-blue-400 border-l-4 border-blue-400 bg-blue-400/5" : "text-slate-500 hover:bg-slate-800/50"} flex flex-col items-center py-2 transition-all hover:translate-x-1 duration-300" href="#cat-${encodeURIComponent(cat.name)}">
            <span class="text-xs font-medium uppercase tracking-widest mt-1 truncate max-w-[70px] text-center">${escapeHtml(cat.name.length > 4 ? cat.name.slice(0, 4) : cat.name)}</span>
        </a>`
    )
    .join("\n        ");
}

/** 生成友情链接（无配置或空数组时不输出） */
function friendlyLinksHtml(links: Config["friendly_links"]): string {
  if (!links?.length) return "";

  const items = links
    .map((l) => {
      const href = escapeAttr(l.url);
      const name = escapeHtml(l.name);
      const rel = l.nofollow ? ' rel="nofollow"' : "";
      const desc = l.description?.trim();
      const title = desc ? ` title="${escapeAttr(desc)}"` : "";
      return `<a class="text-sm text-slate-500 hover:text-blue-400 transition-colors"${rel}${title} href="${href}">${name}</a>`;
    })
    .join("\n        ");

  return `
        <section class="mt-16 pt-12 border-t border-outline-variant/10">
            <h2 class="text-sm font-bold tracking-widest uppercase text-on-surface-variant mb-6 text-center">友情链接</h2>
            <div class="flex flex-wrap justify-center gap-x-8 gap-y-4">
                ${items}
            </div>
        </section>`;
}

/** tailwind 配置块（所有页面共用） */
const TW_COLORS = `"colors": {
                        "primary-container": "#44a5ff",
                        "outline-variant": "#46484d",
                        "surface-tint": "#6ab2ff",
                        "on-primary": "#003055",
                        "tertiary-fixed-dim": "#c989f0",
                        "outline": "#74757a",
                        "on-background": "#f6f6fc",
                        "on-primary-container": "#002442",
                        "secondary": "#dbe0ea",
                        "tertiary-dim": "#c384eb",
                        "surface-container": "#171a1f",
                        "tertiary-container": "#ce8ef6",
                        "on-tertiary-container": "#45006b",
                        "secondary-dim": "#cdd2db",
                        "on-tertiary": "#511177",
                        "primary-fixed": "#44a5ff",
                        "primary-dim": "#3aa2ff",
                        "primary-fixed-dim": "#2498f5",
                        "tertiary": "#da9eff",
                        "on-surface-variant": "#aaabb0",
                        "inverse-surface": "#f9f9ff",
                        "inverse-on-surface": "#53555a",
                        "surface-container-lowest": "#000000",
                        "error": "#ff716c",
                        "on-surface": "#f6f6fc",
                        "error-container": "#9f0519",
                        "on-primary-fixed": "#000000",
                        "inverse-primary": "#0062a5",
                        "surface-container-low": "#111318",
                        "on-secondary-fixed-variant": "#555a62",
                        "surface-container-high": "#1d2025",
                        "surface": "#0c0e12",
                        "primary": "#6ab2ff",
                        "background": "#0c0e12",
                        "secondary-fixed-dim": "#cdd2db",
                        "on-secondary-container": "#ccd0da",
                        "on-secondary": "#4b5058",
                        "on-error": "#490006",
                        "on-primary-fixed-variant": "#002e51",
                        "tertiary-fixed": "#d797ff",
                        "on-tertiary-fixed-variant": "#56187d",
                        "surface-variant": "#23262c",
                        "secondary-fixed": "#dbe0ea",
                        "on-secondary-fixed": "#393e46",
                        "surface-bright": "#292c33",
                        "surface-container-highest": "#23262c",
                        "surface-dim": "#0c0e12",
                        "error-dim": "#d7383b",
                        "on-tertiary-fixed": "#2a0044",
                        "on-error-container": "#ffa8a3",
                        "secondary-container": "#42474f"
                    }`;

/** 生成 About 页面 */
function aboutPageHtml(config: Config, categories: Category[], svgSprite: string): string {
  const totalLinks = categories.reduce((a, c) => {
    if (c.notab || (c.list.length > 0 && isLinkItem(c.list[0]!))) {
      return a + c.list.length;
    }
    return a + (c.list as SubCategory[]).reduce((b, s) => b + s.list.length, 0);
  }, 0);

  return `<!DOCTYPE html>
<html class="dark" lang="zh-CN">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>关于 — ${escapeHtml(config.og_title)}</title>
    <meta name="description" content="${escapeHtml(config.og_description)}"/>
    <meta property="og:title" content="关于 — ${escapeHtml(config.og_title)}"/>
    <meta property="og:description" content="${escapeHtml(config.og_description)}"/>
    <meta property="og:type" content="website"/>
    <meta name="twitter:card" content="${config.twitter_card}"/>
    <link rel="icon" href="/favicon.ico" type="image/x-icon"/>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    ${svgSprite}
    <script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: { extend: { ${TW_COLORS},
                    "borderRadius": { "DEFAULT": "0.125rem", "lg": "0.25rem", "xl": "0.5rem", "full": "0.75rem" },
                    "fontFamily": { "headline": ["Inter"], "body": ["Inter"], "label": ["Inter"] }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .icon { width: 1em; height: 1em; display: inline-block; vertical-align: middle; flex-shrink: 0; }
        html:not(.dark) body { background-color: #f5f5f9; color: #1a1c20; }
        html:not(.dark) .sidebar-bg { background-color: #e8e9ed; }
        html:not(.dark) .header-bg { background-color: rgba(245, 245, 249, 0.8); }
        html:not(.dark) .surface-low-bg { background-color: #e2e3e8; }
        html:not(.dark) .text-main { color: #1a1c20; }
        html:not(.dark) .text-sub { color: #53555a; }
        html:not(.dark) .text-muted { color: #74757a; }
        html:not(.dark) .text-accent { color: #0062a5; }
        html:not(.dark) .border-subtle { border-color: #d0d1d6; }
        html:not(.dark) .footer-bg { background-color: #e8e9ed; border-color: #d0d1d6; }
    </style>
</head>
<body class="bg-background text-on-surface selection:bg-primary/30 min-h-screen flex">
<aside class="sidebar-bg fixed left-0 top-0 h-full w-20 bg-[#111318] flex flex-col items-center py-8 z-40">
    <a href="/" class="mb-10 group cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all overflow-hidden p-1">
            <img src="/logo.png" alt="${escapeAttr(config.site_name)}" width="40" height="40" class="w-full h-full object-contain" decoding="async"/>
        </div>
        <p class="text-xs font-medium uppercase tracking-widest text-blue-400 mt-2 text-center">导航</p>
    </a>
    <nav class="flex flex-col w-full gap-2">
        <a class="text-slate-500 flex flex-col items-center py-4 hover:bg-slate-800/50 transition-all hover:translate-x-1 duration-300" href="/">
            <svg class="icon w-6 h-6"><use href="#i-home"/></svg>
            <span class="text-xs font-medium uppercase tracking-widest mt-1">首页</span>
        </a>
    </nav>
    <div class="mt-auto">
        <a class="text-blue-400 border-l-4 border-blue-400 bg-blue-400/5 flex flex-col items-center py-4 transition-all hover:translate-x-1 duration-300" href="/about.html">
            <svg class="icon w-6 h-6 fill-current"><use href="#i-info"/></svg>
            <span class="text-xs font-medium uppercase tracking-widest mt-1">关于</span>
        </a>
    </div>
</aside>
<div class="flex-1 ml-20 flex flex-col min-h-screen">
    <header class="header-bg fixed top-0 left-20 right-0 h-16 bg-[#0c0e12]/60 backdrop-blur-xl z-50 flex justify-between items-center px-8 shadow-2xl shadow-black/50">
        <div class="flex items-center gap-10">
            <span class="text-xl font-bold tracking-tighter text-main text-slate-100">${escapeHtml(config.site_name)}</span>
            <nav class="hidden md:flex items-center gap-6 font-sans text-base tracking-wider uppercase">
                <a class="text-sub text-slate-400 hover:text-blue-300 transition-colors" href="/">首页</a>
                <a class="text-accent text-blue-400 font-bold border-b-2 border-blue-400 pb-1 hover:text-blue-300 transition-colors" href="/about.html">关于</a>
            </nav>
        </div>
        <div class="flex items-center gap-5">
            <svg id="theme-toggle" class="icon w-5 h-5 text-sub text-slate-400 hover:text-primary transition-colors cursor-pointer"><use href="#i-dark-mode"/></svg>
        </div>
    </header>
    <main class="pt-24 px-8 pb-12 max-w-3xl mx-auto w-full flex-grow">
        <div class="surface-low-bg bg-surface-container-low rounded-2xl p-8 border border-subtle border-outline-variant/10 mb-8">
            <div class="flex items-center gap-4 mb-6">
                <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden p-1.5 shrink-0">
                    <img src="/logo.png" alt="${escapeAttr(config.site_name)}" width="64" height="64" class="w-full h-full object-contain" decoding="async"/>
                </div>
                <div>
                    <h1 class="text-2xl font-bold text-main text-on-surface">${escapeHtml(config.site_name)}</h1>
                    <p class="text-sub text-on-surface-variant text-sm mt-1">${escapeHtml(config.site_description)}</p>
                </div>
            </div>
            <p class="text-sub text-on-surface-variant text-sm leading-relaxed">
                ${escapeHtml(config.site_name)} 是一个精心策划的网站导航站，致力于收集和整理互联网上优质的资源与工具。
                我们关注媒体创作、开发工具、知识管理等领域，帮助用户快速找到所需的优质网站。
            </p>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-8">
            <div class="surface-low-bg bg-surface-container-low rounded-xl p-6 border border-subtle border-outline-variant/10 text-center">
                <span class="text-primary text-3xl font-bold">${categories.length}</span>
                <p class="text-sub text-on-surface-variant text-sm mt-1">个分类</p>
            </div>
            <div class="surface-low-bg bg-surface-container-low rounded-xl p-6 border border-subtle border-outline-variant/10 text-center">
                <span class="text-primary text-3xl font-bold">${totalLinks}</span>
                <p class="text-sub text-on-surface-variant text-sm mt-1">个链接</p>
            </div>
        </div>
        <div class="surface-low-bg bg-surface-container-low rounded-2xl p-8 border border-subtle border-outline-variant/10 mb-8">
            <h2 class="text-main text-lg font-bold text-on-surface mb-4">分类目录</h2>
            <div class="space-y-3">
                ${categories.map((cat, i) => {
                  const count = cat.notab || (cat.list.length > 0 && isLinkItem(cat.list[0]!))
                    ? cat.list.length
                    : (cat.list as SubCategory[]).reduce((b, s) => b + s.list.length, 0);
                  const subs = !cat.notab && cat.list.length > 0 && !isLinkItem(cat.list[0]!)
                    ? (cat.list as SubCategory[]).map(s => escapeHtml(s.name)).join("、")
                    : "";
                  return `<div class="flex items-center justify-between py-2">
                        <a href="/#cat-${encodeURIComponent(cat.name)}" class="flex items-center gap-3 hover:text-primary transition-colors">
                            <svg class="icon w-5 h-5 text-primary${i === 0 ? " fill-current" : ""}"><use href="#${i === 0 ? "i-star" : "i-folder"}"/></svg>
                            <span class="text-main text-base font-medium text-on-surface">${escapeHtml(cat.name)}</span>
                            ${subs ? `<span class="text-muted text-on-surface-variant text-sm">${subs}</span>` : ""}
                        </a>
                        <span class="text-muted text-on-surface-variant text-xs">${count} 个链接</span>
                    </div>`;
                }).join("\n                ")}
            </div>
        </div>
        <div class="surface-low-bg bg-surface-container-low rounded-2xl p-8 border border-subtle border-outline-variant/10">
            <h2 class="text-main text-lg font-bold text-on-surface mb-4">技术栈</h2>
            <ul class="space-y-2 text-sub text-on-surface-variant text-sm">
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-code"/></svg> 使用 Bun 构建，纯静态 HTML 生成</li>
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-palette"/></svg> Tailwind CSS + SVG 图标</li>
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-shield"/></svg> 安全跳转中间页，保护用户隐私</li>
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-search"/></svg> 前端实时搜索，支持按名称和描述过滤</li>
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-dark-mode"/></svg> 深色/浅色主题切换，自动记忆偏好</li>
                <li class="flex items-center gap-2"><svg class="icon w-4 h-4 text-primary"><use href="#i-share"/></svg> 支持 GitHub Pages / Vercel / Cloudflare Pages 部署</li>
            </ul>
        </div>
    </main>
    <footer class="footer-bg w-full py-12 bg-[#0c0e12] flex flex-col items-center gap-4 border-t border-subtle border-slate-800/30 mt-auto">
        <p class="text-xs text-sub text-slate-500 font-light">${escapeHtml(config.footer_copyright)}</p>
    </footer>
</div>
<script>
(function() {
    var themeToggle = document.getElementById('theme-toggle');
    var html = document.documentElement;
    var saved = localStorage.getItem('theme');
    if (saved === 'light') {
        html.classList.remove('dark');
        if (themeToggle) themeToggle.innerHTML = '<use href="#i-light-mode"/>';
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                this.innerHTML = '<use href="#i-light-mode"/>';
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                this.innerHTML = '<use href="#i-dark-mode"/>';
                localStorage.setItem('theme', 'dark');
            }
        });
    }
})();
</script>
</body>
</html>`;
}

// ── 模板替换 ──────────────────────────────────────────────

function replacePlaceholders(
  template: string,
  config: Config,
  extra: Record<string, string> = {}
): string {
  const placeholders: Record<string, string> = {
    "{{site_name}}": config.site_name,
    "{{site_name_attr}}": escapeAttr(config.site_name),
    "{{site_description}}": config.site_description,
    "{{hero_badge}}": config.hero_badge,
    "{{hero_title}}": config.hero_title,
    "{{hero_subtitle}}": config.hero_subtitle,
    "{{footer_copyright}}": config.footer_copyright,
    "{{og_title}}": config.og_title,
    "{{og_description}}": config.og_description,
    "{{og_image}}": config.og_image || "",
    "{{og_url}}": config.og_url || "",
    "{{twitter_card}}": config.twitter_card,
    ...extra,
  };

  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ── 主函数 ────────────────────────────────────────────────

async function main() {
  const root = import.meta.dir;

  // 读取数据
  const config = (await Bun.file(join(root, "config.json")).json()) as Config;
  const categories = (await Bun.file(join(root, "links.json")).json()) as Category[];

  // 读取 SVG sprite
  const svgSprite = await Bun.file(join(root, "template", "icons.svg")).text();

  // 读取模板
  const homeTemplate = await Bun.file(join(root, "template", "home.html")).text();
  const redirectTemplate = await Bun.file(
    join(root, "template", "redirect.html")
  ).text();

  // 生成分类 HTML
  const categoriesHtml = categories
    .map((cat) => {
      if (cat.notab || (cat.list.length > 0 && isLinkItem(cat.list[0]!))) {
        return flatCategory(cat);
      }
      return tabCategory(cat);
    })
    .join("\n");

  const sidenavHtml = sideNavHtml(categories);
  const friendlyLinksHtml_ = friendlyLinksHtml(config.friendly_links ?? []);

  // 替换 home.html
  const homeHtml = replacePlaceholders(homeTemplate, config, {
    "{{svg_sprite}}": svgSprite,
    "{{categories}}": categoriesHtml,
    "{{sidenav}}": sidenavHtml,
    "{{friendly_links}}": friendlyLinksHtml_,
  });

  // 替换 redirect.html
  const redirectHtml = replacePlaceholders(redirectTemplate, config, {
    "{{svg_sprite}}": svgSprite,
  });

  // 生成 About
  const aboutHtml = aboutPageHtml(config, categories, svgSprite);

  // 输出
  const distDir = join(root, "dist");
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  await Bun.write(join(distDir, "index.html"), homeHtml);
  await Bun.write(join(distDir, "redirect.html"), redirectHtml);
  await Bun.write(join(distDir, "about.html"), aboutHtml);

  const faviconSrc = join(root, "favicon.ico");
  if (existsSync(faviconSrc)) {
    cpSync(faviconSrc, join(distDir, "favicon.ico"));
  }
  const logoSrc = join(root, "logo.png");
  if (existsSync(logoSrc)) {
    cpSync(logoSrc, join(distDir, "logo.png"));
  }

  console.log("✅ 生成完成！");
  console.log(`   → ${join(distDir, "index.html")}`);
  console.log(`   → ${join(distDir, "redirect.html")}`);
  console.log(`   → ${join(distDir, "about.html")}`);
  console.log(`   共 ${categories.length} 个分类，${categories.reduce((a, c) => {
    if (c.notab || (c.list.length > 0 && isLinkItem(c.list[0]!))) {
      return a + c.list.length;
    }
    return a + (c.list as SubCategory[]).reduce((b, s) => b + s.list.length, 0);
  }, 0)} 个链接`);
}

main();
