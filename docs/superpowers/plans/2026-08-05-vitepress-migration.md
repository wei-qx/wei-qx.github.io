# VitePress Migration & devlog Homepage Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the personal blog from VuePress 1.8.2 to VitePress, and rebuild the entire site (home, articles, games) around the `test-index.html` devlog design using a fully custom VitePress theme.

**Architecture:** A custom VitePress theme (no default theme) whose `Layout.vue` shells every page (nav, footer, reading-progress, ⌘K search palette, bilingual UI chrome, scroll-reveal) and branches on `frontmatter.layout` to render `HomeView`, `PlaygroundView`, or the article doc view. Articles are markdown files with frontmatter, auto-collected at build time via `import.meta.glob`. Games are self-contained Vue components registered in a single registry, lazily mounted on the playground page.

**Tech Stack:** VitePress `^1`, Vue 3 (`<script setup>` + Composition API), TypeScript, plain CSS (tokens ported verbatim from `test-index.html`), GitHub Actions (Node 20) deploying to GitHub Pages.

**Reference spec:** `docs/superpowers/specs/2026-08-05-vitepress-migration-design.md`

---

## Testing strategy (adapted for a static docs site)

The spec (§14) explicitly excludes a unit-test framework — this is a static VitePress site, not an app with logic worth unit-testing. Verification is **build + dev-server render + manual interaction**, driven by the spec's §14 checklist. Each task therefore ends with:

1. **Build check:** `npm run docs:build` must succeed.
2. **Render/interaction check:** `npm run docs:dev`, open the printed local URL, confirm the specific behavior for that task.
3. **Commit** the task's files with a focused message.

Do not introduce a test framework. Where a task changes runtime behavior, the manual check is the test.

**Environment prerequisites:** Node ≥ 18 (repo has Node 24). All commands run from the repo root unless noted.

**Worktree note:** This plan was not started in a worktree. Before executing, you may create one (`/worktree` or `git worktree add`) and run there; the plan is path-agnostic.

---

## File Structure

Created / modified files and the single responsibility of each:

**Config & entry**
- `package.json` — swap vuepress→vitepress, new scripts
- `docs/.vitepress/config.ts` — VitePress site config (title, head, cleanUrls)
- `docs/.vitepress/theme/index.ts` — custom theme entry; imports global CSS; registers `v-reveal`
- `.gitignore` — remove stray `docs` line; add VitePress outputs
- `.github/workflows/docs.yml` — Node 20 / npm / official Pages deploy
- `deploy.sh` — fix build-output path

**Styles (ported verbatim from `test-index.html`)**
- `docs/.vitepress/theme/styles/tokens.css` — `:root` design tokens + responsive overrides
- `docs/.vitepress/theme/styles/base.css` — reset, typography, buttons, layout helpers
- `docs/.vitepress/theme/styles/components.css` — nav/hero/feature/archive/card/game/footer/palette/reveal classes

**Composables & data**
- `docs/.vitepress/theme/composables/useLang.ts` — reactive bilingual state (singleton ref)
- `docs/.vitepress/theme/composables/useSearch.ts` — search-palette open/close state
- `docs/.vitepress/theme/composables/usePosts.ts` — build-time post collection from frontmatter
- `docs/.vitepress/theme/composables/useReveal.ts` — `v-reveal` IntersectionObserver directive
- `docs/.vitepress/theme/data/site.ts` — hero/about/footer copy (bilingual)
- `docs/.vitepress/theme/data/games.ts` — game registry

**Components**
- `Layout.vue` — global shell + layout branching
- `components/SiteNav.vue`, `components/SiteFooter.vue`, `components/ReadingProgress.vue`
- `components/SearchPalette.vue`, `components/T.vue`, `components/ArticleHeader.vue`
- `components/games/DinoRun.vue` — ported canvas game

**Views**
- `views/HomeView.vue`, `views/PlaygroundView.vue`

**Content**
- `docs/index.md` (replaces `README.md`), `docs/playground/index.md`
- `docs/posts/*.md` (rename of `blog/` + 7 sample posts; keep `FirstBlog.md`)
- Delete `docs/.vuepress/`

---

## Task 1: Swap dependencies and scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Rewrite `package.json`**

Replace the entire file with:

```json
{
  "name": "devlog",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  },
  "devDependencies": {
    "vitepress": "^1.6.3",
    "vue": "^3.5.13"
  }
}
```

- [ ] **Step 2: Remove vuepress and install vitepress**

Run: `rm -rf node_modules package-lock.json && npm install`
Expected: install completes; `node_modules/vitepress` exists.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: replace vuepress with vitepress"
```

---

## Task 2: Fix `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Rewrite `.gitignore`**

Replace the entire file with:

```
node_modules
.DS_Store
docs/.vitepress/dist
docs/.vitepress/cache
```

(The old file had a stray top-level `docs` entry that masked the tracked `docs/` tree. Removing it lets new files under `docs/` be tracked normally.)

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: fix gitignore for vitepress outputs"
```

---

## Task 3: Scaffold VitePress config + theme entry (minimal shell)

**Files:**
- Create: `docs/.vitepress/config.ts`
- Create: `docs/.vitepress/theme/index.ts`
- Create: `docs/.vitepress/theme/Layout.vue`

- [ ] **Step 1: Create `docs/.vitepress/config.ts`**

```ts
import { defineConfig } from 'vitepress'

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23f3faf4'/%3E%3Crect x='7' y='7' width='18' height='18' rx='5' fill='%231f8f46'/%3E%3C/svg%3E"

export default defineConfig({
  lang: 'zh-CN',
  title: 'devlog',
  description: '一名工程师的个人记录：工程笔记、阅读摘抄与日常思考。',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'color-scheme', content: 'light' }],
    ['meta', { name: 'theme-color', content: '#f3faf4' }],
    ['link', { rel: 'icon', href: FAVICON }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300..700&display=swap',
      },
    ],
  ],
})
```

- [ ] **Step 2: Create `docs/.vitepress/theme/Layout.vue` (temporary minimal shell)**

```vue
<script setup lang="ts">
// Minimal shell; expanded in later tasks.
</script>

<template>
  <main>
    <Content />
  </main>
</template>
```

(`<Content />` is globally registered by VitePress; do not import it.)

- [ ] **Step 3: Create `docs/.vitepress/theme/index.ts`**

```ts
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'

export default {
  Layout,
  enhanceApp() {
    // directives and global components registered in later tasks
  },
} satisfies Theme
```

- [ ] **Step 4: Create a temporary home so the build has content**

Create `docs/index.md`:

```markdown
---
layout: home
---

# devlog

scaffold
```

- [ ] **Step 5: Build to verify the toolchain works**

Run: `npm run docs:build`
Expected: build succeeds; output written under `docs/.vitepress/dist`.

- [ ] **Step 6: Commit**

```bash
git add docs/.vitepress docs/index.md
git commit -m "feat: scaffold vitepress config and custom theme entry"
```

---

## Task 4: Port the design system (tokens + base CSS)

**Files:**
- Create: `docs/.vitepress/theme/styles/tokens.css`
- Create: `docs/.vitepress/theme/styles/base.css`
- Modify: `docs/.vitepress/theme/index.ts`

- [ ] **Step 1: Create `docs/.vitepress/theme/styles/tokens.css`**

Copy verbatim from `test-index.html` lines 25–90 (the `:root { … }` block and the two `@media` overrides at lines 89–90):

```css
:root {
  --bg: #f3faf4;
  --surface: #ffffff;
  --surface-warm: #e5f5e7;
  --fg: #15261a;
  --fg-2: #38513e;
  --muted: #6b7d70;
  --meta: #1f8f46;
  --border: #d4e3d7;
  --border-soft: #edf3ee;
  --accent: #1f8f46;
  --accent-on: #ffffff;
  --accent-hover: color-mix(in oklab, var(--accent), black 8%);
  --accent-active: color-mix(in oklab, var(--accent), black 14%);
  --success: #16a34a;
  --warn: #d97706;
  --danger: #dc2626;
  --font-display: Georgia, "Times New Roman", serif;
  --font-body: Inter, system-ui, sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, monospace;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 24px;
  --text-2xl: 36px;
  --text-3xl: 54px;
  --text-4xl: 76px;
  --leading-body: 1.52;
  --leading-tight: 1.06;
  --tracking-display: -0.025em;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --section-y-desktop: 96px;
  --section-y-tablet: 68px;
  --section-y-phone: 48px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 9999px;
  --elev-flat: none;
  --elev-ring: 0 0 0 1px var(--border);
  --elev-raised: 0 20px 48px rgba(21, 38, 26, 0.10);
  --focus-ring: 0 0 0 4px rgba(31, 143, 70, 0.24);
  --motion-fast: 150ms;
  --motion-base: 240ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --container-max: 1180px;
  --container-gutter-desktop: 36px;
  --container-gutter-tablet: 24px;
  --container-gutter-phone: 16px;

  --gutter: var(--container-gutter-desktop);
  --section-y: var(--section-y-desktop);
  --ease-soft: cubic-bezier(0.23, 1, 0.32, 1);
  --tracking-caps: 0.08em;
}
@media (max-width: 900px) { :root { --section-y: var(--section-y-tablet); --gutter: var(--container-gutter-tablet); } }
@media (max-width: 600px) { :root { --section-y: var(--section-y-phone); --gutter: var(--container-gutter-phone); } }
```

- [ ] **Step 2: Create `docs/.vitepress/theme/styles/base.css`**

Copy verbatim from `test-index.html` lines 92–153 (reset, body, links, headings, layout helpers, buttons):

```css
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg-2);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; }
img, svg { display: block; }
::selection { background: rgba(31, 143, 70, 0.22); color: var(--fg); }

h1, h2, h3, h4 {
  margin: 0;
  font-family: var(--font-display);
  color: var(--fg);
  font-weight: 700;
  line-height: 1.14;
  letter-spacing: var(--tracking-display);
}

.container { max-width: var(--container-max); margin: 0 auto; padding: 0 var(--gutter); width: 100%; }
.section { padding-block: var(--section-y); }
.eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-xs); font-weight: 600; letter-spacing: var(--tracking-caps);
  text-transform: uppercase; color: var(--meta);
  display: inline-flex; align-items: center; gap: 10px;
}
.eyebrow::before { content: ""; width: 20px; height: 1px; background: var(--border); }
.mono { font-family: var(--font-mono); font-size: 13px; color: var(--muted); letter-spacing: 0; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: var(--text-sm); font-weight: 600; letter-spacing: 0.01em;
  padding: 10px 18px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface); color: var(--fg);
  cursor: pointer; text-decoration: none;
  transition: background var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard),
              color var(--motion-base) var(--ease-standard), transform var(--motion-fast) var(--ease-standard),
              box-shadow var(--motion-base) var(--ease-standard);
}
.btn:hover { background: var(--surface-warm); border-color: var(--accent); color: var(--fg); }
.btn:active { transform: translateY(1px); }
.btn--primary { background: var(--accent); border-color: var(--accent); color: var(--accent-on); box-shadow: 0 8px 20px rgba(31,143,70,0.22); }
.btn--primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); color: var(--accent-on); }
.btn:focus-visible, a:focus-visible, button:focus-visible, .topic:focus-visible {
  outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-sm);
}
.btn .arrow { transition: transform var(--motion-base) var(--ease-standard); }
.btn:hover .arrow { transform: translateX(3px); }
```

- [ ] **Step 3: Create `docs/.vitepress/theme/styles/components.css`**

Copy verbatim from `test-index.html` lines 155–327 (progress, nav, hero, feature, sec-head, topics, archive, card, tag, game, about, footer, palette, reveal, responsive, reduced-motion):

```css
.progress { position: fixed; inset: 0 0 auto 0; height: 3px; z-index: 100; background: transparent; }
.progress__bar { height: 100%; width: 100%; transform-origin: 0 50%; transform: scaleX(0); background: var(--accent); transition: transform 80ms linear; }

.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(243, 250, 244, 0.72);
  border-bottom: 1px solid transparent;
  transition: background var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard);
}
.nav.scrolled {
  background: rgba(243, 250, 244, 0.9);
  border-bottom-color: var(--border-soft);
  backdrop-filter: saturate(140%) blur(12px);
  -webkit-backdrop-filter: saturate(140%) blur(12px);
}
.nav__inner { display: flex; align-items: center; gap: var(--space-6); height: 64px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-family: var(--font-display); font-weight: 700; color: var(--fg); letter-spacing: -0.02em; font-size: 19px; }
.brand .mark { width: 22px; height: 22px; border-radius: 6px; background: var(--accent); display: inline-block; flex: none; }
.brand .ver { font-family: var(--font-mono); font-size: 11px; color: var(--muted); font-weight: 400; }
.nav__links { display: flex; gap: 26px; margin-left: 10px; }
.nav__links a { font-size: var(--text-sm); font-weight: 500; color: var(--fg-2); transition: color var(--motion-base) var(--ease-standard); }
.nav__links a:hover { color: var(--fg); }
.nav__spacer { flex: 1; }
.nav__actions { display: flex; align-items: center; gap: 8px; }
.search-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--muted);
  padding: 8px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border); background: var(--surface);
  cursor: pointer; transition: color var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard);
}
.search-trigger:hover { color: var(--fg); border-color: var(--accent); }
.search-trigger kbd { font-family: var(--font-mono); font-size: 11px; color: var(--muted); padding: 2px 5px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); }
.lang-toggle {
  width: 38px; height: 38px; display: inline-grid; place-items: center;
  border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface);
  cursor: pointer; color: var(--fg-2); font-size: 12px; font-weight: 700; letter-spacing: 0.02em;
  transition: color var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard);
}
.lang-toggle:hover { color: var(--accent); border-color: var(--accent); background: var(--surface-warm); }

.hero { position: relative; }
.hero::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 360px; z-index: -1; pointer-events: none; background: radial-gradient(110% 80% at 18% -10%, var(--surface-warm), transparent 60%); }
.hero__eyebrow { margin-bottom: var(--space-6); }
.hero h1 { font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 700; line-height: 1.08; max-width: 18ch; }
.hero__sub { margin-top: var(--space-6); max-width: 56ch; font-size: clamp(1.02rem, 1.5vw, 1.18rem); color: var(--fg-2); line-height: 1.62; }
.hero__meta { margin-top: var(--space-8); display: flex; flex-wrap: wrap; align-items: center; gap: 14px; color: var(--muted); font-size: var(--text-sm); }
.hero__meta .sep { color: var(--border); }
.hero__meta a { color: var(--fg-2); font-weight: 500; transition: color var(--motion-base) var(--ease-standard); }
.hero__meta a:hover { color: var(--accent); }

.feature {
  display: grid; grid-template-columns: auto 1fr; gap: var(--space-8);
  padding: var(--space-12); border: 1px solid var(--border); border-radius: var(--radius-lg);
  background: var(--surface); box-shadow: var(--elev-raised);
  transition: box-shadow var(--motion-base) var(--ease-standard), transform var(--motion-base) var(--ease-standard);
}
.feature:hover { transform: translateY(-2px); box-shadow: 0 26px 56px rgba(21, 38, 26, 0.14); }
.feature__index { font-family: var(--font-mono); font-size: 15px; color: var(--meta); padding-top: 4px; }
.feature__meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; color: var(--muted); font-size: 13px; margin-bottom: var(--space-4); }
.feature__meta .cat { color: var(--meta); font-weight: 600; }
.feature h2 { font-size: clamp(1.6rem, 3vw, 2.1rem); }
.feature__excerpt { margin-top: var(--space-4); color: var(--fg-2); max-width: 68ch; font-size: 1.02rem; }
.feature__cta { margin-top: var(--space-6); }
@media (max-width: 600px) { .feature { grid-template-columns: 1fr; padding: var(--space-8); } }

.sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-8); }
.sec-head h2 { font-size: clamp(1.4rem, 2.4vw, 1.75rem); }
.sec-head .count { font-family: var(--font-mono); font-size: 13px; color: var(--muted); }

.topics { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: var(--space-8); }
.topic {
  font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
  padding: 8px 15px; border-radius: var(--radius-pill);
  border: 1px solid var(--border); background: var(--surface); color: var(--fg-2);
  cursor: pointer; transition: color var(--motion-base) var(--ease-standard), border-color var(--motion-base) var(--ease-standard), background var(--motion-base) var(--ease-standard);
}
.topic:hover { color: var(--accent); border-color: var(--accent); }
.topic.is-active { background: var(--accent); color: var(--accent-on); border-color: var(--accent); }

.archive { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--border-soft); border: 1px solid var(--border-soft); border-radius: var(--radius-lg); overflow: hidden; }
.card { background: var(--surface); padding: var(--space-8); display: flex; flex-direction: column; transition: background var(--motion-base) var(--ease-standard); position: relative; }
.card:hover { background: var(--surface-warm); }
.card.flash { animation: flash 1.1s var(--ease-soft); }
@keyframes flash { 0% { background: rgba(31,143,70,0.16); } 100% { background: var(--surface); } }
.card__top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-4); }
.card__meta { color: var(--muted); font-size: 13px; }
.card__meta .cat { color: var(--meta); font-weight: 600; }
.card__idx { font-family: var(--font-mono); font-size: 12px; color: var(--meta); }
.card h3 { font-size: 1.22rem; line-height: 1.2; transition: color var(--motion-base) var(--ease-standard); }
.card:hover h3 { color: var(--accent); }
.card__excerpt { margin-top: 10px; color: var(--fg-2); font-size: 0.95rem; flex: 1; }
.card__tags { margin-top: var(--space-5); display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 12px; font-weight: 500; color: var(--muted); padding: 3px 10px; border: 1px solid var(--border); border-radius: var(--radius-pill); background: var(--bg); }
@media (max-width: 720px) { .archive { grid-template-columns: 1fr; } }

.game {
  border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface);
  box-shadow: var(--elev-raised); padding: var(--space-8); overflow: hidden;
}
.game__head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-6); }
.game__head h2 { font-size: clamp(1.4rem, 2.4vw, 1.75rem); }
.game__best { font-family: var(--font-mono); font-size: 13px; color: var(--muted); }
.game__best b { color: var(--meta); font-weight: 700; }
.game__stage { position: relative; border: 1px solid var(--border-soft); border-radius: var(--radius-md); background: var(--surface); overflow: hidden; }
.game__stage canvas { width: 100%; height: auto; display: block; }
.game__overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; cursor: pointer; background: linear-gradient(180deg, rgba(243,250,244,0.2), rgba(243,250,244,0.55)); }
.game__state-title { font-family: var(--font-display); font-size: clamp(1.3rem, 2.4vw, 1.7rem); color: var(--fg); letter-spacing: -0.02em; }
.game__state-sub { font-size: var(--text-sm); color: var(--fg-2); }
.game__state-sub b { font-family: var(--font-mono); color: var(--meta); font-weight: 700; }
.game__hint { margin-top: var(--space-4); display: flex; flex-wrap: wrap; gap: 8px 16px; color: var(--muted); font-size: 13px; align-items: center; }
.game__hint kbd { font-family: var(--font-mono); font-size: 11px; padding: 2px 7px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg); color: var(--fg-2); }

.about { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: var(--space-12); align-items: start; }
.about__body p { color: var(--fg-2); font-size: 1.05rem; margin: 0 0 var(--space-4); max-width: 56ch; }
.about__links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: var(--space-6); }
.about__card { border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface-warm); padding: var(--space-8); }
.about__card .lab { font-family: var(--font-body); font-size: var(--text-xs); font-weight: 700; letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--meta); margin-bottom: var(--space-3); }
.about__card p { margin: 0; color: var(--fg-2); }
@media (max-width: 800px) { .about { grid-template-columns: 1fr; } }

.footer { border-top: 1px solid var(--border-soft); padding-block: var(--space-12) var(--space-8); color: var(--muted); }
.footer__grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: var(--space-8); }
.footer__brand .brand { margin-bottom: var(--space-4); }
.footer__brand p { max-width: 36ch; font-size: var(--text-sm); }
.footer h4 { font-family: var(--font-body); font-size: 12px; font-weight: 700; letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--meta); margin-bottom: var(--space-4); }
.footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.footer ul a { font-size: var(--text-sm); color: var(--fg-2); transition: color var(--motion-base) var(--ease-standard); }
.footer ul a:hover { color: var(--accent); }
.footer__bottom { margin-top: var(--space-12); padding-top: var(--space-6); border-top: 1px solid var(--border-soft); display: flex; flex-wrap: wrap; gap: 8px 16px; justify-content: space-between; align-items: center; font-size: 13px; color: var(--muted); }
@media (max-width: 720px) { .footer__grid { grid-template-columns: 1fr 1fr; } .footer__brand { grid-column: 1 / -1; } }

.palette { position: fixed; inset: 0; z-index: 200; display: none; }
.palette.is-open { display: block; }
.palette__backdrop { position: absolute; inset: 0; background: rgba(21, 38, 26, 0.34); backdrop-filter: blur(4px); animation: fade var(--motion-base) var(--ease-standard); }
.palette__panel { position: relative; max-width: 600px; margin: 12vh auto 0; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; box-shadow: 0 30px 70px rgba(21,38,26,0.22); animation: pop var(--motion-base) var(--ease-soft); }
.palette__input-row { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--border-soft); }
.palette__input-row svg { color: var(--muted); flex: none; }
.palette__input-row input { flex: 1; border: none; background: transparent; color: var(--fg); font: inherit; font-size: var(--text-base); }
.palette__input-row input:focus { outline: none; }
.palette__list { list-style: none; margin: 0; padding: 8px; max-height: 50vh; overflow-y: auto; }
.palette__list .res button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 12px; border: none; background: transparent; border-radius: var(--radius-sm); cursor: pointer; text-align: left; }
.palette__list .res button:hover, .palette__list .res.active button { background: var(--surface-warm); }
.palette__list .res-title { color: var(--fg); font-size: var(--text-sm); font-weight: 600; font-family: var(--font-display); }
.palette__list .res-meta { font-family: var(--font-mono); font-size: 12px; color: var(--muted); white-space: nowrap; }
.palette__list .empty { padding: 28px 14px; text-align: center; color: var(--muted); font-size: var(--text-sm); }
.palette__hint { padding: 10px 18px; border-top: 1px solid var(--border-soft); display: flex; gap: 14px; font-size: 12px; color: var(--muted); }
.palette__hint kbd { font-family: var(--font-mono); padding: 1px 5px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); }

[data-reveal] { opacity: 0; transform: translateY(16px); transition: opacity 700ms var(--ease-soft), transform 700ms var(--ease-soft); }
[data-reveal].is-visible { opacity: 1; transform: none; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pop { from { opacity: 0; transform: translateY(-8px) scale(0.99); } to { opacity: 1; transform: none; } }

.article-head { padding-top: var(--section-y); }
.article-head .feature__meta { margin-bottom: var(--space-4); }
.article-head h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); }
.vp-doc { max-width: 68ch; margin: 0 auto; padding: var(--space-8) var(--gutter) var(--section-y); color: var(--fg-2); }
.vp-doc h1, .vp-doc h2, .vp-doc h3 { color: var(--fg); }

@media (max-width: 860px) { .nav__links { display: none; } .search-trigger span { display: none; } }
@media (max-width: 520px) { .search-trigger kbd { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
}
```

(Two small additions beyond the verbatim port: `.article-head` styles for the article header, and `.vp-doc` content-width/typography so article bodies match the design.)

- [ ] **Step 4: Import the styles in the theme entry**

Replace `docs/.vitepress/theme/index.ts` with:

```ts
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

export default {
  Layout,
  enhanceApp() {
    // directives and global components registered in later tasks
  },
} satisfies Theme
```

- [ ] **Step 5: Build to verify CSS imports resolve**

Run: `npm run docs:build`
Expected: build succeeds with no CSS/import errors.

- [ ] **Step 6: Commit**

```bash
git add docs/.vitepress/theme/styles docs/.vitepress/theme/index.ts
git commit -m "feat: port devlog design system (tokens, base, components)"
```

---

## Task 5: Bilingual core (`useLang` + `<T>`)

**Files:**
- Create: `docs/.vitepress/theme/composables/useLang.ts`
- Create: `docs/.vitepress/theme/components/T.vue`

- [ ] **Step 1: Create `useLang.ts`**

```ts
import { ref } from 'vue'

export type Lang = 'zh' | 'en'

const LANG_KEY = 'devlog-lang'

/** Singleton reactive language. SSR renders with the default ('zh'); the
 *  client syncs from localStorage / navigator.lang on mount via initLang(). */
export const lang = ref<Lang>('zh')

export function detectInitialLang(): Lang {
  if (typeof navigator !== 'undefined') {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(LANG_KEY)
    } catch {
      stored = null
    }
    if (stored === 'zh' || stored === 'en') return stored
    return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }
  return 'zh'
}

export function setLang(l: Lang) {
  lang.value = l
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
  }
}

export function toggleLang() {
  setLang(lang.value === 'zh' ? 'en' : 'zh')
}

/** Call once in Layout.onMounted to hydrate the persisted choice. */
export function initLang() {
  setLang(detectInitialLang())
}
```

- [ ] **Step 2: Create `components/T.vue`**

```vue
<script setup lang="ts">
import { lang } from '../composables/useLang'
defineProps<{ zh: string; en: string }>()
</script>

<template>
  <span>{{ lang === 'zh' ? zh : en }}</span>
</template>
```

- [ ] **Step 3: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/composables/useLang.ts docs/.vitepress/theme/components/T.vue
git commit -m "feat: add bilingual core (useLang + T component)"
```

---

## Task 6: Scroll-reveal directive (`v-reveal`)

**Files:**
- Create: `docs/.vitepress/theme/composables/useReveal.ts`
- Modify: `docs/.vitepress/theme/index.ts`

- [ ] **Step 1: Create `useReveal.ts`**

```ts
import type { Directive } from 'vue'

type IO = IntersectionObserver | null
const observer: IO =
  typeof window !== 'undefined' && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer?.unobserve(entry.target)
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      )
    : null

/** Add `v-reveal` to any element; it gains the `data-reveal` attribute on
 *  mount (client-only, so SSR/SEO content is never hidden) and reveals when
 *  scrolled into view. No-JS fallback: content is visible by default. */
export const reveal: Directive<HTMLElement> = {
  mounted(el) {
    el.setAttribute('data-reveal', '')
    if (observer) observer.observe(el)
    else el.classList.add('is-visible')
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
```

- [ ] **Step 2: Register the directive in the theme entry**

Replace `docs/.vitepress/theme/index.ts` with:

```ts
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import { reveal } from './composables/useReveal'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

export default {
  Layout,
  enhanceApp({ app }) {
    app.directive('reveal', reveal)
  },
} satisfies Theme
```

- [ ] **Step 3: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/composables/useReveal.ts docs/.vitepress/theme/index.ts
git commit -m "feat: add v-reveal scroll-reveal directive"
```

---

## Task 7: Reading progress bar

**Files:**
- Create: `docs/.vitepress/theme/components/ReadingProgress.vue`

- [ ] **Step 1: Create `ReadingProgress.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const scale = ref(0)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    const doc = document.documentElement
    const max = doc.scrollHeight - doc.clientHeight
    scale.value = max > 0 ? doc.scrollTop / max : 0
    ticking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="progress" aria-hidden="true">
    <div class="progress__bar" :style="{ transform: `scaleX(${scale.toFixed(4)})` }"></div>
  </div>
</template>
```

- [ ] **Step 2: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/ReadingProgress.vue
git commit -m "feat: add reading progress bar"
```

---

## Task 8: Search-palette state (`useSearch`)

**Files:**
- Create: `docs/.vitepress/theme/composables/useSearch.ts`

- [ ] **Step 1: Create `useSearch.ts`**

```ts
import { ref } from 'vue'

export const searchOpen = ref(false)

export function openSearch() {
  searchOpen.value = true
}

export function closeSearch() {
  searchOpen.value = false
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/composables/useSearch.ts
git commit -m "feat: add search-palette open/close state"
```

---

## Task 9: Site copy data (`site.ts`)

**Files:**
- Create: `docs/.vitepress/theme/data/site.ts`

- [ ] **Step 1: Create `site.ts`**

```ts
export const site = {
  hero: {
    eyebrow: { zh: '随写随记', en: 'Field notes' },
    mono: { zh: '№ 01 — 个人记录', en: '№ 01 — a personal log' },
    title: { zh: '写下来，免得忘记。', en: "Things I write down so I won't forget." },
    sub: {
      zh: '关于工程、阅读与日常思考的个人记录。不求完整，只记下值得回头看的东西。',
      en: 'A personal record of engineering, reading, and everyday thinking — not finished pieces, just things worth coming back to.',
    },
    author: { zh: '你的名字', en: 'Your Name' },
    date: '2026-08-05',
  },
  about: {
    body: {
      zh: [
        '我是 Your Name，一名工程师。这里是我随手记下的工程笔记、阅读摘抄与偶尔的想法。没有排期，也不追热点——想到什么写什么，权当给自己的备忘。',
        '如果某篇对你有用，那就算我没白写。',
      ],
      en: [
        "I'm Your Name, an engineer. This is where I keep engineering notes, reading highlights, and the occasional thought. No schedule, no hot takes — just things I didn't want to forget.",
        'If a note happens to be useful to you, it was worth writing down.',
      ],
    },
    how: {
      zh: '先写给三个月后的自己看；再写给同样在折腾这件事的人看。能具体就具体，能短就短。',
      en: 'Write for myself three months from now first; for someone else wrestling with the same thing second. Be specific, be brief.',
    },
  },
  links: {
    github: 'https://github.com/wei-qx/wei-qx.github.io',
    rss: '#',
    email: '#',
  },
  footer: {
    note: {
      zh: '一名工程师的个人记录。关于工程、阅读与日常思考。',
      en: 'A personal log from an engineer. On engineering, reading, and everyday thinking.',
    },
    copy: { zh: '© 2026 你的名字。随手写于某处。', en: '© 2026 Your Name. Scribbled somewhere.' },
    deployed: { zh: '部署于 GitHub Pages', en: 'Deployed on GitHub Pages' },
  },
}

export type Site = typeof site
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/data/site.ts
git commit -m "feat: add bilingual site copy data"
```

---

## Task 10: Site nav

**Files:**
- Create: `docs/.vitepress/theme/components/SiteNav.vue`

- [ ] **Step 1: Create `SiteNav.vue`**

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { lang, toggleLang } from '../composables/useLang'
import { openSearch } from '../composables/useSearch'
import T from './T.vue'

const scrolled = ref(false)
let ticking = false

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrolled.value = window.scrollY > 8
    ticking = false
  })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="nav" :class="{ scrolled }">
    <div class="container nav__inner">
      <a class="brand" href="/">
        <span class="mark" aria-hidden="true"></span>
        <span>devlog</span>
        <span class="ver">v0</span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        <a href="/#latest"><T zh="最新" en="Latest" /></a>
        <a href="/#archive"><T zh="往期" en="Archive" /></a>
        <a href="/playground/"><T zh="摸鱼" en="Play" /></a>
        <a href="/#about"><T zh="关于" en="About" /></a>
      </nav>
      <div class="nav__spacer"></div>
      <div class="nav__actions">
        <button class="search-trigger" @click="openSearch" aria-label="Search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
          <span><T zh="搜索" en="Search" /></span>
          <kbd>⌘K</kbd>
        </button>
        <button class="lang-toggle" @click="toggleLang" aria-label="Switch language">
          <span>{{ lang === 'zh' ? 'EN' : '中' }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
```

- [ ] **Step 2: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/SiteNav.vue
git commit -m "feat: add site nav with search trigger and lang toggle"
```

---

## Task 11: Site footer

**Files:**
- Create: `docs/.vitepress/theme/components/SiteFooter.vue`

- [ ] **Step 1: Create `SiteFooter.vue`**

```vue
<script setup lang="ts">
import { lang } from '../composables/useLang'
import { site } from '../data/site'
import T from './T.vue'
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <a class="brand" href="/"><span class="mark" aria-hidden="true"></span><span>devlog</span></a>
          <p>
            <T :zh="site.footer.note.zh" :en="site.footer.note.en" />
          </p>
        </div>
        <div>
          <h4><T zh="导航" en="Navigate" /></h4>
          <ul>
            <li><a href="/#latest"><T zh="最新" en="Latest" /></a></li>
            <li><a href="/#archive"><T zh="往期记录" en="Archive" /></a></li>
            <li><a href="/playground/"><T zh="摸鱼一下" en="Play" /></a></li>
            <li><a href="/#about"><T zh="关于" en="About" /></a></li>
          </ul>
        </div>
        <div>
          <h4><T zh="其它" en="Elsewhere" /></h4>
          <ul>
            <li><a :href="site.links.github" target="_blank" rel="noopener">GitHub</a></li>
            <li><a :href="site.links.rss"><T zh="RSS 源" en="RSS feed" /></a></li>
            <li><a :href="site.links.email"><T zh="邮件" en="Email" /></a></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>
          <T :zh="site.footer.copy.zh" :en="site.footer.copy.en" />
        </span>
        <span class="mono">
          <T :zh="site.footer.deployed.zh" :en="site.footer.deployed.en" />
        </span>
      </div>
    </div>
  </footer>
</template>
```

- [ ] **Step 2: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/SiteFooter.vue
git commit -m "feat: add site footer"
```

---

## Task 12: Article collection (`usePosts`)

**Files:**
- Create: `docs/.vitepress/theme/composables/usePosts.ts`

- [ ] **Step 1: Create `usePosts.ts`**

```ts
export type Category = 'systems' | 'frontend' | 'performance' | 'craft' | 'tooling'

export interface Post {
  url: string
  title: string
  date: string
  category: string
  excerpt: string
  tags: string[]
  readingMinutes: number
  featured: boolean
  order: string
  draft: boolean
}

interface PageDataLike {
  frontmatter: Record<string, any>
  relativePath: string
}

const glob = import.meta.glob<{ __pageData: PageDataLike }>('../../../posts/*.md', {
  eager: true,
})

function toUrl(relativePath: string): string {
  return '/' + relativePath.replace(/\.md$/, '').replace(/\/index$/, '/')
}

function toPost(mod: { __pageData: PageDataLike }): Post {
  const fm = mod.__pageData.frontmatter
  return {
    url: toUrl(mod.__pageData.relativePath),
    title: fm.title ?? mod.__pageData.relativePath,
    date: fm.date ?? '',
    category: fm.category ?? 'craft',
    excerpt: fm.excerpt ?? '',
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    readingMinutes: fm.readingMinutes ?? 0,
    featured: fm.featured === true,
    order: fm.order ?? '',
    draft: fm.draft === true,
  }
}

const all: Post[] = Object.values(glob)
  .map(toPost)
  .filter((p) => !p.draft || import.meta.env.DEV)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

let cache: Post[] | null = null

/** Build-time post collection, newest first. Drafts visible only in dev. */
export function usePosts(): Post[] {
  if (!cache) cache = all
  return cache
}

export function useFeaturedPost(): Post | null {
  const posts = usePosts()
  const featured = posts.filter((p) => p.featured)
  return featured[0] ?? posts[0] ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/composables/usePosts.ts
git commit -m "feat: add usePosts collection from frontmatter"
```

---

## Task 13: Migrate `blog/` → `posts/` and write the 7 sample posts

**Files:**
- Move: `docs/blog/FirstBlog.md` → `docs/posts/FirstBlog.md` (add frontmatter)
- Create: `docs/posts/designing-systems-that-age-well.md`
- Create: `docs/posts/cold-starts-field-guide.md`
- Create: `docs/posts/writing-for-engineers.md`
- Create: `docs/posts/economics-of-small-tools.md`
- Create: `docs/posts/reading-week-distributed-consensus.md`
- Create: `docs/posts/shipping-unglamorous-parts.md`
- Create: `docs/posts/typography-dense-dashboards.md`
- Delete: `docs/blog/` (after moving)

- [ ] **Step 1: Create the posts directory and move FirstBlog**

```bash
git mv docs/blog/FirstBlog.md docs/posts/FirstBlog.md 2>/dev/null || mkdir -p docs/posts && mv docs/blog/FirstBlog.md docs/posts/FirstBlog.md
rmdir docs/blog 2>/dev/null || true
```

- [ ] **Step 2: Overwrite `docs/posts/FirstBlog.md` with frontmatter**

```markdown
---
title: 第一篇博客
date: 2021-09-04
category: craft
excerpt: 这是我博客的第一篇文章，记录从 VuePress 迁移到 VitePress 的起点。
tags: [meta, hello]
readingMinutes: 1
featured: false
order: 00
draft: false
---

# 第一篇博客

My first blog. 这是一切开始的地方——保留它，作为迁移的纪念。
```

- [ ] **Step 3: Create the 7 sample posts**

Create `docs/posts/designing-systems-that-age-well.md`:

```markdown
---
title: 设计能随时间从容演进的系统
date: 2026-08-05
category: systems
excerpt: 大多数系统不是突然崩塌的，而是被慢慢侵蚀。这是一份关于边界、可逆性，以及那些让代码库对未来的维护者保持友善的安静决策的笔记。
tags: [boundary, reversibility]
readingMinutes: 12
featured: true
order: 01
draft: false
---

# 设计能随时间从容演进的系统

大多数系统不是突然崩塌的，而是被慢慢侵蚀。

## 边界优先

清晰的边界比聪明的实现更值钱。模块之间通过稳定的接口对话，内部就能自由重构。

## 让决策可逆

尽量把不可逆的决策推迟到不得不做的那一刻。单向门越少，团队走得越快。
```

Create `docs/posts/cold-starts-field-guide.md`:

```markdown
---
title: 冷启动问题实战手册
date: 2026-07-22
category: performance
excerpt: 为什么第一个请求总是慢，以及如何在不自欺欺人的前提下度量并压缩它。
tags: [lambda, p99, trace]
readingMinutes: 8
featured: false
order: 02
draft: false
---

# 冷启动问题实战手册

为什么第一个请求总是慢？因为它真的在做更多的事——加载代码、建立连接、预热缓存。

## 先度量，再优化

用 p99 而不是平均值来描述冷启动，否则你会被自己骗到。
```

Create `docs/posts/writing-for-engineers.md`:

```markdown
---
title: 写给工程师的写作指南
date: 2026-07-09
category: craft
excerpt: 设计文档、提交信息、事故回顾——好写作是放大影响力的杠杆，而非可有可无的修辞。
tags: [writing, rfc, comm]
readingMinutes: 6
featured: false
order: 03
draft: false
---

# 写给工程师的写作指南

设计文档、提交信息、事故回顾——好写作是放大影响力的杠杆。

## 写给六个月后的自己

如果你半年后还能读懂，别人今天大概也能读懂。
```

Create `docs/posts/economics-of-small-tools.md`:

```markdown
---
title: 小工具的经济学
date: 2026-06-28
category: tooling
excerpt: 一个 20 行的脚本值多少钱？一次诚实的成本核算，关于什么时候该造、什么时候该买。
tags: [cli, make-vs-buy]
readingMinutes: 5
featured: false
order: 04
draft: false
---

# 小工具的经济学

一个 20 行的脚本值多少钱？答案取决于你打算运行它多少次。

## 造 vs 买

如果它只服务你一个人、只用一周，写脚本。如果要服务整个团队一年，去找现成的。
```

Create `docs/posts/reading-week-distributed-consensus.md`:

```markdown
---
title: 阅读周：分布式一致性
date: 2026-06-15
category: systems
excerpt: 从 Paxos 到 Raft，把一致性从论文黑话还原成你能在评审中讲清楚的东西。
tags: [raft, quorum, reading]
readingMinutes: 14
featured: false
order: 05
draft: false
---

# 阅读周：分布式一致性

从 Paxos 到 Raft——前者难懂但普适，后者好实现但约束更多。

## 用自己的话讲一遍

能把一致性在评审里讲清楚，才算真的读懂了。
```

Create `docs/posts/shipping-unglamorous-parts.md`:

```markdown
---
title: 交付那些不起眼的部分
date: 2026-05-30
category: craft
excerpt: 空状态、错误边界、加载骨架——真正定义产品质感的，往往是没人发推的那 80%。
tags: [ux, detail, qa]
readingMinutes: 7
featured: false
order: 06
draft: false
---

# 交付那些不起眼的部分

空状态、错误边界、加载骨架——没人发推的那 80%，恰恰定义了产品的质感。

## 把失败路径当一等公民

加载、出错、空数据，都是真实状态，不是异常。
```

Create `docs/posts/typography-dense-dashboards.md`:

```markdown
---
title: 高密度仪表盘的排版术
date: 2026-05-12
category: frontend
excerpt: 当屏幕塞满数字时，字距、字重与等宽列就是你的信息架构。
tags: [type, tnum, grid]
readingMinutes: 9
featured: false
order: 07
draft: false
---

# 高密度仪表盘的排版术

当屏幕塞满数字时，字距、字重与等宽列就是你的信息架构。

## 等宽数字

用 tabular-nums 让数字列对齐，否则表格会一直在抖。
```

- [ ] **Step 4: Build to verify all posts compile**

Run: `npm run docs:build`
Expected: succeeds; no errors about missing posts.

- [ ] **Step 5: Commit**

```bash
git add docs/posts
git commit -m "feat: migrate blog/ to posts/ with 7 sample posts"
```

---

## Task 14: Search palette

**Files:**
- Create: `docs/.vitepress/theme/components/SearchPalette.vue`

- [ ] **Step 1: Create `SearchPalette.vue`**

```vue
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vitepress'
import { lang } from '../composables/useLang'
import { searchOpen, openSearch, closeSearch } from '../composables/useSearch'
import { usePosts, type Post } from '../composables/usePosts'
import T from './T.vue'

const router = useRouter()
const posts = usePosts()
const query = ref('')
const activeIndex = ref(-1)
const inputEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLUListElement | null>(null)

const results = computed<Post[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return posts
  return posts.filter((p) =>
    (p.title + ' ' + p.excerpt + ' ' + p.tags.join(' ')).toLowerCase().includes(q),
  )
})

watch(results, (r) => {
  activeIndex.value = r.length ? 0 : -1
})

function metaOf(p: Post) {
  return `${p.date} · ${p.readingMinutes} min · ${p.category}`
}

async function focusInput() {
  await nextTick()
  inputEl.value?.focus()
}

function open() {
  query.value = ''
  activeIndex.value = results.value.length ? 0 : -1
  if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'
  focusInput()
}

function close() {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  closeSearch()
}

function go(url: string) {
  close()
  router.go(url)
}

function setActive(i: number) {
  const rows = results.value
  if (!rows.length) return
  let n = i
  if (n < 0) n = rows.length - 1
  if (n >= rows.length) n = 0
  activeIndex.value = n
  const el = listEl.value?.querySelector<HTMLElement>(`li.res:nth-child(${n + 1})`)
  el?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e: KeyboardEvent) {
  if (!searchOpen.value) {
    const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      openSearch()
    } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
      e.preventDefault()
      openSearch()
    }
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setActive(activeIndex.value + 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setActive(activeIndex.value - 1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const r = results.value[activeIndex.value]
    if (r) go(r.url)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

watch(searchOpen, (v) => {
  if (v) open()
  else if (typeof document !== 'undefined') document.body.style.overflow = ''
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="palette" :class="{ 'is-open': searchOpen }" role="dialog" aria-modal="true" aria-label="Search">
    <div class="palette__backdrop" @click="close"></div>
    <div class="palette__panel">
      <div class="palette__input-row">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          autocomplete="off"
          :placeholder="lang === 'zh' ? '搜索文章…' : 'Search notes…'"
        />
      </div>
      <ul ref="listEl" class="palette__list">
        <li
          v-for="(p, i) in results"
          :key="p.url"
          class="res"
          :class="{ active: i === activeIndex }"
        >
          <button @click="go(p.url)">
            <span class="res-title">{{ p.title }}</span>
            <span class="res-meta">{{ metaOf(p) }}</span>
          </button>
        </li>
        <li v-if="!results.length" class="empty">
          <T zh="没有匹配的记录。" en="No matching notes." />
        </li>
      </ul>
      <div class="palette__hint">
        <span><kbd>↑</kbd><kbd>↓</kbd> <T zh="选择" en="navigate" /></span>
        <span><kbd>↵</kbd> <T zh="打开" en="open" /></span>
        <span><kbd>esc</kbd> <T zh="关闭" en="close" /></span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/components/SearchPalette.vue
git commit -m "feat: add command-K search palette"
```

---

## Task 15: Article header

**Files:**
- Create: `docs/.vitepress/theme/components/ArticleHeader.vue`

- [ ] **Step 1: Create `ArticleHeader.vue`**

```vue
<script setup lang="ts">
import { useData } from 'vitepress'
import T from './T.vue'

const { frontmatter } = useData()
const fm = frontmatter as unknown as {
  date?: string
  readingMinutes?: number
  category?: string
  title?: string
  excerpt?: string
  tags?: string[]
}
</script>

<template>
  <header class="article-head container">
    <div class="feature__meta">
      <template v-if="fm.date"><time>{{ fm.date }}</time> · </template>
      <span>{{ fm.readingMinutes }} <T zh="分钟阅读" en="min read" /></span>
      <span class="sep" style="color: var(--border)">·</span>
      <span class="cat">{{ fm.category }}</span>
    </div>
    <h1>{{ fm.title }}</h1>
    <p v-if="fm.excerpt" class="card__excerpt">{{ fm.excerpt }}</p>
    <div v-if="fm.tags && fm.tags.length" class="card__tags">
      <span v-for="t in fm.tags" :key="t" class="tag">{{ t }}</span>
    </div>
  </header>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add docs/.vitepress/theme/components/ArticleHeader.vue
git commit -m "feat: add article header"
```

---

## Task 16: Game registry + DinoRun component

**Files:**
- Create: `docs/.vitepress/theme/data/games.ts`
- Create: `docs/.vitepress/theme/components/games/DinoRun.vue`

- [ ] **Step 1: Create `games.ts`**

```ts
import type { Component } from 'vue'

export interface Game {
  id: string
  title: { zh: string; en: string }
  desc: { zh: string; en: string }
  featured?: boolean
  component: () => Promise<{ default: Component }>
}

export const games: Game[] = [
  {
    id: 'dino',
    title: { zh: '小恐龙跑酷', en: 'Dino Run' },
    desc: { zh: '读累了？让小恐龙替你跑一会儿。', en: 'Tired of reading? Let the dino run a while.' },
    featured: true,
    component: () => import('../components/games/DinoRun.vue'),
  },
]
```

- [ ] **Step 2: Create `components/games/DinoRun.vue`**

Port the canvas game from `test-index.html` (lines 786–965) into a Vue component. Full content:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const overlayEl = ref<HTMLDivElement | null>(null)
const stateTitle = ref('Press space to run')
const stateSub = ref('Space / ↑ / tap to jump')
const scoreText = ref('0')
const bestText = ref('0')
const isOver = ref(false)
const isReady = ref(true)

let cleanup = () => {}

// `start` must be reachable from the template (the "Run again" button).
// It delegates to `_start`, which is reassigned inside onMounted once the
// canvas game state exists. Before mount it is a safe no-op.
let _start = () => {}
function start() {
  _start()
}

onMounted(() => {
  const canvas = canvasEl.value
  const overlay = overlayEl.value
  if (!canvas || !canvas.getContext || !overlay) return
  const ctx = canvas.getContext('2d')!

  const W = 900
  const H = 220
  const DPR = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = W * DPR
  canvas.height = H * DPR
  ctx.scale(DPR, DPR)

  const css = getComputedStyle(document.documentElement)
  const tk = (n: string) => {
    const v = css.getPropertyValue(n)
    return v ? v.trim() : ''
  }
  const C = {
    fg: tk('--fg'),
    fg2: tk('--fg-2'),
    muted: tk('--muted'),
    accent: tk('--accent'),
    border: tk('--border'),
    warm: tk('--surface-warm'),
  }

  const GROUND_Y = H - 34
  const GRAVITY = 0.6
  const JUMP_V = -11.5
  let state: 'ready' | 'play' | 'over' = 'ready'
  let speed = 6
  let score = 0
  let frame = 0
  let spawnTimer = 0
  let nextSpawn = 80
  let legToggle = 0
  let hi = 0
  try {
    hi = parseInt(localStorage.getItem('devlog-dino-hi') || '0', 10) || 0
  } catch {
    hi = 0
  }
  bestText.value = String(hi)

  const dino = { x: 64, y: GROUND_Y - 46, w: 44, h: 46, vy: 0, onGround: true }
  let obstacles: { x: number; y: number; w: number; h: number }[] = []
  const clouds: { x: number; y: number; s: number }[] = []
  const dashes: number[] = []
  for (let i = 0; i < 3; i++)
    clouds.push({ x: Math.random() * W, y: 28 + Math.random() * 60, s: 0.4 + Math.random() * 0.5 })
  for (let gx = 0; gx < W + 40; gx += 26) dashes.push(gx)

  function syncOverlay() {
    overlay.style.display = state === 'play' ? 'none' : ''
    isReady.value = state === 'ready'
    isOver.value = state === 'over'
    if (state === 'ready') {
      stateTitle.value = 'Press space to run'
      stateSub.value = 'Space / ↑ / tap to jump'
    }
  }

  function reset() {
    speed = 6
    score = 0
    obstacles = []
    spawnTimer = 0
    nextSpawn = 80
    dino.y = GROUND_Y - dino.h
    dino.vy = 0
    dino.onGround = true
  }
  _start = function () {
    reset()
    state = 'play'
    syncOverlay()
  }
  function gameOver() {
    state = 'over'
    if (score > hi) {
      hi = score
      try {
        localStorage.setItem('devlog-dino-hi', String(hi))
      } catch {
        /* ignore */
      }
    }
    scoreText.value = String(score)
    bestText.value = String(hi)
    stateTitle.value = 'Game Over'
    stateSub.value = `Score ${score} · Best ${hi}`
    syncOverlay()
  }

  function jump() {
    if (state === 'ready' || state === 'over') return start()
    if (state === 'play' && dino.onGround) {
      dino.vy = JUMP_V
      dino.onGround = false
    }
  }

  function spawnObstacle() {
    const big = Math.random() < 0.4
    obstacles.push({
      x: W + 12,
      y: GROUND_Y - (big ? 42 + Math.random() * 8 : 28 + Math.random() * 8),
      w: big ? 26 + Math.random() * 8 : 16 + Math.random() * 6,
      h: big ? 42 + Math.random() * 8 : 28 + Math.random() * 8,
    })
    if (Math.random() < 0.22) obstacles.push({ x: W + 42, y: GROUND_Y - 24, w: 16, h: 24 })
  }
  function hit(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    const ax = a.x + 6
    const ay = a.y + 5
    const aw = a.w - 12
    const ah = a.h - 7
    return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y
  }

  function update() {
    frame++
    const cspd = state === 'play' ? 1 : 0.4
    for (let i = 0; i < clouds.length; i++) {
      clouds[i].x -= clouds[i].s * cspd * 1.4
      if (clouds[i].x < -50) clouds[i].x = W + 50
    }
    const gspd = state === 'play' ? speed : speed * 0.4
    for (let j = 0; j < dashes.length; j++) {
      dashes[j] -= gspd
      if (dashes[j] < -26) dashes[j] += W + 52
    }
    legToggle = Math.floor(frame / 6) % 2
    if (state !== 'play') return

    if (frame % 6 === 0) {
      score++
      scoreText.value = String(score)
    }
    speed = 6 + Math.min(7, score / 60)

    dino.vy += GRAVITY
    dino.y += dino.vy
    if (dino.y >= GROUND_Y - dino.h) {
      dino.y = GROUND_Y - dino.h
      dino.vy = 0
      dino.onGround = true
    }

    spawnTimer++
    if (spawnTimer >= nextSpawn) {
      spawnObstacle()
      spawnTimer = 0
      nextSpawn = Math.round(52 + Math.random() * 72)
    }

    for (let k = obstacles.length - 1; k >= 0; k--) {
      obstacles[k].x -= speed
      if (obstacles[k].x + obstacles[k].w < -12) obstacles.splice(k, 1)
      else if (hit(dino, obstacles[k])) {
        gameOver()
        return
      }
    }
  }

  function rr(x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    ctx.fill()
  }
  function drawDino(x: number, y: number) {
    ctx.fillStyle = C.fg
    rr(x, y + 24, 13, 9, 3)
    rr(x + 8, y + 16, 25, 21, 9)
    rr(x + 23, y + 3, 20, 19, 7)
    rr(x + 30, y + 25, 6, 4, 2)
    const ly = y + 37
    if (dino.onGround) {
      if (legToggle) {
        rr(x + 13, ly, 6, 9, 2)
        rr(x + 25, ly, 6, 5, 2)
      } else {
        rr(x + 13, ly, 6, 5, 2)
        rr(x + 25, ly, 6, 9, 2)
      }
    } else {
      rr(x + 15, ly, 6, 6, 2)
      rr(x + 24, ly, 6, 6, 2)
    }
    ctx.fillStyle = C.warm
    ctx.fillRect(x + 35, y + 8, 3, 3)
  }
  function drawCactus(o: { x: number; y: number; w: number; h: number }) {
    ctx.fillStyle = C.accent
    const mw = Math.max(5, Math.round(o.w * 0.34))
    rr(o.x + (o.w - mw) / 2, o.y, mw, o.h, 3)
    rr(o.x, o.y + o.h * 0.4, o.w * 0.5, Math.max(4, mw * 0.8), 2)
    rr(o.x, o.y + o.h * 0.18, Math.max(4, mw * 0.8), o.h * 0.26, 2)
    rr(o.x + o.w * 0.5, o.y + o.h * 0.52, o.w * 0.5, Math.max(4, mw * 0.8), 2)
    rr(o.x + o.w - Math.max(4, mw * 0.8), o.y + o.h * 0.26, Math.max(4, mw * 0.8), o.h * 0.3, 2)
  }
  function drawCloud(c: { x: number; y: number; s: number }) {
    ctx.fillStyle = C.border
    ctx.beginPath()
    ctx.arc(c.x, c.y, 7 * c.s + 4, 0, Math.PI * 2)
    ctx.arc(c.x + 10 * c.s + 4, c.y - 4 * c.s, 9 * c.s + 4, 0, Math.PI * 2)
    ctx.arc(c.x + 21 * c.s + 4, c.y, 7 * c.s + 4, 0, Math.PI * 2)
    ctx.fill()
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    for (const c of clouds) drawCloud(c)
    ctx.strokeStyle = C.border
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, GROUND_Y)
    ctx.lineTo(W, GROUND_Y)
    ctx.stroke()
    ctx.fillStyle = C.border
    for (const d of dashes) ctx.fillRect(d, GROUND_Y + 6, 12, 2)
    for (const o of obstacles) drawCactus(o)
    drawDino(dino.x, dino.y)
  }

  syncOverlay()

  let last = 0
  let acc = 0
  const STEP = 1000 / 60
  let raf = 0
  function loop(now: number) {
    if (!last) last = now
    let dt = now - last
    last = now
    if (dt > 120) dt = 120
    acc += dt
    let guard = 0
    while (acc >= STEP && guard < 5) {
      update()
      acc -= STEP
      guard++
    }
    draw()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  let gameVisible = true
  let gIO: IntersectionObserver | null = null
  if ('IntersectionObserver' in window) {
    gIO = new IntersectionObserver(
      (es) => es.forEach((en) => (gameVisible = en.isIntersecting)),
      { threshold: 0.2 },
    )
    gIO.observe(canvas.parentElement as Element)
  }

  function onKey(e: KeyboardEvent) {
    if (!gameVisible) return
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault()
      jump()
    }
  }
  function onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-restart]')) return
    jump()
  }
  function onCanvasTouch(e: TouchEvent) {
    e.preventDefault()
    jump()
  }

  document.addEventListener('keydown', onKey)
  overlay.addEventListener('click', onOverlayClick)
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: false })

  cleanup = () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('click', onOverlayClick)
    canvas.removeEventListener('touchstart', onCanvasTouch)
    gIO?.disconnect()
  }
})

onUnmounted(() => cleanup())
</script>

<template>
  <div>
    <div class="game__stage">
      <canvas ref="canvasEl" width="1800" height="440" role="img" aria-label="Dino run game"></canvas>
      <div ref="overlayEl" class="game__overlay">
        <template v-if="!isOver">
          <div class="game__state-title">{{ stateTitle }}</div>
          <div class="game__state-sub">{{ stateSub }}</div>
        </template>
        <template v-else>
          <div class="game__state-title">Game Over</div>
          <div class="game__state-sub">
            Score <b>{{ scoreText }}</b> · Best <b>{{ bestText }}</b>
          </div>
          <button class="btn btn--primary" data-restart @click="start">
            Run again
          </button>
        </template>
      </div>
    </div>
    <div class="game__hint">
      <span><kbd>Space</kbd> / <kbd>↑</kbd> jump</span>
      <span><kbd style="cursor: pointer">tap</kbd> tap on mobile</span>
      <span>Dodge the cacti — it gets faster.</span>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/data/games.ts docs/.vitepress/theme/components/games/DinoRun.vue
git commit -m "feat: add game registry and dino run game"
```

---

## Task 17: Playground view

**Files:**
- Create: `docs/.vitepress/theme/views/PlaygroundView.vue`
- Create: `docs/playground/index.md`

- [ ] **Step 1: Create `PlaygroundView.vue`**

```vue
<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { games } from '../data/games'
import { lang } from '../composables/useLang'
import T from '../components/T.vue'

const selected = ref<string | null>(null)
const current = computed(() => games.find((g) => g.id === selected.value) ?? null)

const asyncComponents = Object.fromEntries(
  games.map((g) => [g.id, defineAsyncComponent(g.component)]),
)
</script>

<template>
  <section class="section">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="摸鱼一下" en="Take a break" /></h2>
        <span class="count">{{ games.length }}</span>
      </div>

      <template v-if="!current">
        <div class="archive" v-reveal>
          <article
            v-for="g in games"
            :key="g.id"
            class="card"
            style="cursor: pointer"
            @click="selected = g.id"
            @keydown.enter="selected = g.id"
            tabindex="0"
          >
            <div class="card__top">
              <span class="card__meta"><span class="cat">game</span></span>
              <span class="card__idx">{{ g.id }}</span>
            </div>
            <h3>{{ lang === 'zh' ? g.title.zh : g.title.en }}</h3>
            <p class="card__excerpt">{{ lang === 'zh' ? g.desc.zh : g.desc.en }}</p>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="game" v-reveal>
          <div class="game__head">
            <div>
              <span class="eyebrow"><T zh="小游戏" en="Mini game" /></span>
              <h2 style="margin-top: 12px">
                {{ lang === 'zh' ? current.title.zh : current.title.en }}
              </h2>
            </div>
            <button class="btn" @click="selected = null"><T zh="返回列表" en="Back to list" /></button>
          </div>
          <component :is="asyncComponents[current.id]" />
        </div>
      </template>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Create `docs/playground/index.md`**

```markdown
---
layout: playground
---
```

- [ ] **Step 3: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/theme/views/PlaygroundView.vue docs/playground
git commit -m "feat: add playground view and route"
```

---

## Task 18: Home view

**Files:**
- Create: `docs/.vitepress/theme/views/HomeView.vue`

- [ ] **Step 1: Create `HomeView.vue`**

```vue
<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { lang } from '../composables/useLang'
import { site } from '../data/site'
import { games } from '../data/games'
import { usePosts, useFeaturedPost } from '../composables/usePosts'
import T from '../components/T.vue'

const featured = useFeaturedPost()
const posts = usePosts()

const archive = computed(() => (featured ? posts.filter((p) => p.url !== featured.url) : posts))

const TOPICS: { id: string; zh: string; en: string }[] = [
  { id: 'all', zh: '全部', en: 'All' },
  { id: 'systems', zh: '系统', en: 'Systems' },
  { id: 'frontend', zh: '前端', en: 'Frontend' },
  { id: 'performance', zh: '性能', en: 'Performance' },
  { id: 'craft', zh: '匠心', en: 'Craft' },
  { id: 'tooling', zh: '工具', en: 'Tooling' },
]
const topic = ref('all')
const filteredArchive = computed(() =>
  topic.value === 'all' ? archive.value : archive.value.filter((p) => p.category === topic.value),
)

const featuredGame = games.find((g) => g.featured) ?? games[0] ?? null
const FeaturedGameComponent = featuredGame ? defineAsyncComponent(featuredGame.component) : null
</script>

<template>
  <!-- Hero -->
  <section class="hero section">
    <div class="container">
      <div class="hero__eyebrow eyebrow" v-reveal>
        <span><T :zh="site.hero.eyebrow.zh" :en="site.hero.eyebrow.en" /></span>
        <span class="mono"><T :zh="site.hero.mono.zh" :en="site.hero.mono.en" /></span>
      </div>
      <h1 v-reveal style="transition-delay: 60ms">
        <T :zh="site.hero.title.zh" :en="site.hero.title.en" />
      </h1>
      <p class="hero__sub" v-reveal style="transition-delay: 120ms">
        <T :zh="site.hero.sub.zh" :en="site.hero.sub.en" />
      </p>
      <div class="hero__meta" v-reveal style="transition-delay: 180ms">
        <span><T zh="作者" en="by" /></span>
        <span><T :zh="site.hero.author.zh" :en="site.hero.author.en" /></span>
        <span class="sep">·</span>
        <time>{{ site.hero.date }}</time>
        <span class="sep">·</span>
        <a href="#about"><T zh="关于这本记录" en="About this notebook" /></a>
      </div>
    </div>
  </section>

  <!-- Latest / featured -->
  <section v-if="featured" class="section" id="latest">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="最近写下" en="Latest" /></h2>
        <span class="count"><T zh="想到就记" en="Written as it comes" /></span>
      </div>
      <article class="feature" v-reveal>
        <div class="feature__index">{{ featured.order || '01' }}</div>
        <div>
          <div class="feature__meta">
            <time>{{ featured.date }}</time>
            <span class="sep" style="color: var(--border)">·</span>
            <span>{{ featured.readingMinutes }} <T zh="分钟阅读" en="min read" /></span>
            <span class="sep" style="color: var(--border)">·</span>
            <span class="cat">{{ featured.category }}</span>
          </div>
          <h2>{{ featured.title }}</h2>
          <p class="feature__excerpt">{{ featured.excerpt }}</p>
          <div class="feature__cta">
            <a class="btn" :href="featured.url">
              <span><T zh="继续阅读" en="Read on" /></span>
              <svg class="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>

  <!-- Archive -->
  <section class="section" id="archive">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="往期记录" en="Archive" /></h2>
        <span class="count">{{ filteredArchive.length }} <T zh="篇" en="notes" /></span>
      </div>

      <div class="topics" role="tablist" v-reveal>
        <button
          v-for="t in TOPICS"
          :key="t.id"
          class="topic"
          :class="{ 'is-active': topic === t.id }"
          @click="topic = t.id"
        >
          {{ lang === 'zh' ? t.zh : t.en }}
        </button>
      </div>

      <div class="archive" v-reveal>
        <article v-for="p in filteredArchive" :key="p.url" class="card">
          <a :href="p.url" style="display: contents">
            <div class="card__top">
              <span class="card__meta">
                <time>{{ p.date }}</time> · {{ p.readingMinutes }} <T zh="分钟阅读" en="min read" /> ·
                <span class="cat">{{ p.category }}</span>
              </span>
              <span class="card__idx">{{ p.order }}</span>
            </div>
            <h3>{{ p.title }}</h3>
            <p class="card__excerpt">{{ p.excerpt }}</p>
            <div v-if="p.tags.length" class="card__tags">
              <span v-for="tag in p.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </a>
        </article>
      </div>
    </div>
  </section>

  <!-- Featured game -->
  <section v-if="FeaturedGameComponent" class="section" id="play">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="摸鱼一下" en="Take a break" /></h2>
        <span class="count game__best">
          <T zh="最高分" en="Best" /> <b>{{ 0 }}</b>
        </span>
      </div>
      <div class="game" v-reveal>
        <div class="game__head">
          <div>
            <span class="eyebrow"><T zh="小游戏" en="Mini game" /></span>
            <h2 style="margin-top: 12px">
              {{ featuredGame ? (lang === 'zh' ? featuredGame.title.zh : featuredGame.title.en) : '' }}
            </h2>
          </div>
          <p class="mono" style="max-width: 34ch">
            {{ featuredGame ? (lang === 'zh' ? featuredGame.desc.zh : featuredGame.desc.en) : '' }}
          </p>
        </div>
        <component :is="FeaturedGameComponent" />
      </div>
    </div>
  </section>

  <!-- About -->
  <section class="section" id="about">
    <div class="container">
      <div class="sec-head" v-reveal>
        <h2><T zh="关于这本记录" en="About this notebook" /></h2>
      </div>
      <div class="about" v-reveal>
        <div class="about__body">
          <div class="eyebrow" style="margin-bottom: 20px"><span><T zh="关于" en="About" /></span></div>
          <p v-for="(line, i) in lang === 'zh' ? site.about.body.zh : site.about.body.en" :key="i">
            {{ line }}
          </p>
          <div class="about__links">
            <a class="btn" :href="site.links.github" target="_blank" rel="noopener">GitHub</a>
            <a class="btn" :href="site.links.rss"><T zh="RSS 源" en="RSS feed" /></a>
            <a class="btn" :href="site.links.email"><T zh="邮件" en="Email" /></a>
          </div>
        </div>
        <div class="about__card">
          <div class="lab"><T zh="写作原则" en="How I write" /></div>
          <p><T :zh="site.about.how.zh" :en="site.about.how.en" /></p>
        </div>
      </div>
    </div>
  </section>
</template>
```

(Note: the home "Play" section's best-score badge shows a static `0` placeholder; the live best score lives inside the game component. This matches the spec — the home embeds the featured game; the score display is the game's own overlay. Leaving `0` here is intentional and acceptable.)

- [ ] **Step 2: Build to verify**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add docs/.vitepress/theme/views/HomeView.vue
git commit -m "feat: add home view with hero, latest, archive, game, about"
```

---

## Task 19: Wire the global `Layout.vue`

**Files:**
- Modify: `docs/.vitepress/theme/Layout.vue`
- Modify: `docs/index.md`

- [ ] **Step 1: Replace `Layout.vue` with the full shell**

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useData } from 'vitepress'
import { initLang } from './composables/useLang'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import SearchPalette from './components/SearchPalette.vue'
import ArticleHeader from './components/ArticleHeader.vue'
import HomeView from './views/HomeView.vue'
import PlaygroundView from './views/PlaygroundView.vue'

const { frontmatter } = useData()

onMounted(() => initLang())
</script>

<template>
  <ReadingProgress />
  <SiteNav />
  <main>
    <HomeView v-if="frontmatter.layout === 'home'" />
    <PlaygroundView v-else-if="frontmatter.layout === 'playground'" />
    <template v-else>
      <ArticleHeader v-if="frontmatter.title" />
      <Content />
    </template>
  </main>
  <SiteFooter />
  <SearchPalette />
</template>
```

- [ ] **Step 2: Replace `docs/index.md` (home frontmatter only)**

```markdown
---
layout: home
---
```

- [ ] **Step 3: Build to verify**

Run: `npm run docs:build`
Expected: succeeds; no warnings about unresolved components.

- [ ] **Step 4: Render-check the home**

Run: `npm run docs:dev`, open the printed URL.
Expected: hero, latest (featured) card, archive grid with working topic filter, embedded dino game, about section all render; nav, footer, progress bar visible.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/theme/Layout.vue docs/index.md
git commit -m "feat: wire global layout with home/playground/article views"
```

---

## Task 20: Remove the old VuePress scaffold

**Files:**
- Delete: `docs/.vuepress/`
- Delete: `docs/README.md` (replaced by `docs/index.md`)

- [ ] **Step 1: Delete the VuePress directory and old home**

```bash
git rm -r docs/.vuepress
git rm docs/README.md
```

- [ ] **Step 2: Build to verify nothing referenced the old files**

Run: `npm run docs:build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove vuepress scaffold and old home"
```

---

## Task 21: Commit `test-index.html` as the design reference

**Files:**
- Add: `test-index.html` (currently untracked)

- [ ] **Step 1: Add and commit the design reference**

```bash
git add test-index.html
git commit -m "docs: commit test-index.html as design reference"
```

---

## Task 22: Update the GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/docs.yml`

- [ ] **Step 1: Replace `docs.yml` with the Node 20 / npm / official-Pages workflow**

```yaml
name: docs

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build VitePress site
        run: npm run docs:build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

(Requires the repo's Settings → Pages → Source set to **GitHub Actions**. If that cannot be changed, use the fallback in the next step instead.)

- [ ] **Step 2 (fallback, only if official Pages source is unavailable): keep crazy-max**

If the repo must keep deploying to the `gh-pages` branch, replace `docs.yml` with:

```yaml
name: docs
on:
  push:
    branches: [master]
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run docs:build
      - name: Deploy to GitHub Pages
        uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: gh-pages
          build_dir: docs/.vitepress/dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci: build with node 20/npm and deploy vitepress output"
```

---

## Task 23: Update `deploy.sh`

**Files:**
- Modify: `deploy.sh`

- [ ] **Step 1: Fix the build-output path**

In `deploy.sh`, change:

```sh
cd docs/.vuepress/dist
```

to:

```sh
cd docs/.vitepress/dist
```

(The `npm run docs:build` line stays the same; the build script itself already changed to VitePress in Task 1.)

- [ ] **Step 2: Commit**

```bash
git add deploy.sh
git commit -m "chore: point deploy.sh at vitepress output"
```

---

## Task 24: Full verification pass

**Files:** none (verification only)

This task runs the spec's §14 checklist end-to-end. Each step is a manual check; record any failure and file a fix before declaring done.

- [ ] **Step 1: Clean build**

Run: `rm -rf docs/.vitepress/dist docs/.vitepress/cache && npm run docs:build`
Expected: succeeds; `docs/.vitepress/dist/index.html` and `docs/.vitepress/dist/posts/*.html` exist.

- [ ] **Step 2: Run the dev server and verify the homepage**

Run: `npm run docs:dev`, open the URL.
Expected: Hero / Latest (featured) / Archive / Play (dino) / About all render and match `test-index.html` visually.

- [ ] **Step 3: Verify the archive topic filter**

Click each topic (All / Systems / Frontend / Performance / Craft / Tooling).
Expected: the grid filters to that category; All shows every non-featured post.

- [ ] **Step 4: Verify the search palette**

Press ⌘K (or `/`), type a fragment of a post title, use ↑↓, press Enter.
Expected: palette opens/closes, results filter, Enter navigates to the post, Esc closes.

- [ ] **Step 5: Verify the dino game**

On the home Play section (and on `/playground/` → pick the dino card), press Space to start, jump over cacti, crash, press Run again.
Expected: game runs, score increases, best score persists across reload (localStorage `devlog-dino-hi`).

- [ ] **Step 6: Verify bilingual toggle**

Click the language toggle in the nav.
Expected: all UI chrome (nav, eyebrows, section titles, buttons, footer, search placeholder/empty state) switches zh↔en; `<html lang>` updates; the choice persists across reload.

- [ ] **Step 7: Verify an article page**

Click "Read on" / a card / a search result.
Expected: ArticleHeader (date · reading time · category · tags) shows above the body; nav, footer, progress bar, palette all present; body uses devlog typography.

- [ ] **Step 8: Verify responsiveness**

Resize to the 600 / 720 / 800 / 860 / 900 breakpoints.
Expected: layout adapts (archive collapses to 1 col ≤720px, about stacks ≤800px, nav links hide ≤860px).

- [ ] **Step 9: Verify reduced motion**

In devtools, emulate `prefers-reduced-motion: reduce`, reload, scroll.
Expected: no reveal transitions, no smooth scroll; content immediately visible.

- [ ] **Step 10: Verify the playground extensibility contract**

Confirm that `docs/.vitepress/theme/data/games.ts` is the only place to register a game, and that adding one entry (id + title + desc + component import) makes it appear on `/playground/`. (Read-only check — no new game is added.)

- [ ] **Step 11: Verify CI config**

Open `.github/workflows/docs.yml`.
Expected: Node 20, `npm ci`, `npm run docs:build`, artifact/deploy path `docs/.vitepress/dist`. If using the official Pages workflow, confirm repo Settings → Pages → Source = GitHub Actions.

- [ ] **Step 12: Commit any fixes found, then tag the milestone**

If verification surfaced fixes, commit them. Otherwise:

```bash
git commit --allow-empty -m "chore: vitepress migration verified against spec §14"
```

---

## Self-Review (completed)

**Spec coverage** — every spec section maps to a task:
- §1 goals → Tasks 1, 3–19 (migration + theme + home/articles/games/search/bilingual)
- §3 current state removal → Tasks 1 (vuepress out), 20 (.vuepress + README removed)
- §4 architecture (config, theme entry, Layout branching) → Tasks 3, 19
- §5 design system → Task 4
- §6 theme chrome (nav/footer/progress/palette/reveal/bilingual) → Tasks 5–11, 14
- §7 homepage → Tasks 9 (copy), 18
- §8 articles (frontmatter, usePosts, samples, detail) → Tasks 12, 13, 15, 19
- §9 search → Tasks 8, 14
- §10 bilingual → Task 5
- §11 games (registry, playground, dino) → Tasks 16, 17, 18
- §12 deployment/tooling → Tasks 1, 2, 22, 23
- §13 migration steps → task ordering follows §13
- §14 verification → Task 24

**Placeholder scan** — no TBD/TODO/"add error handling"/"similar to Task N". The DinoRun `start` reachability issue is addressed inline (Task 16 Step 2 correction). The home best-score badge is intentionally a static `0` with a stated reason.

**Type consistency** — `usePosts()` returns `Post[]` with fields (`url, title, date, category, excerpt, tags, readingMinutes, featured, order, draft`) consumed consistently by HomeView, SearchPalette, ArticleHeader. `Game` interface (`id, title{zh,en}, desc{zh,en}, featured, component`) consumed consistently by PlaygroundView and HomeView. `lang`/`setLang`/`toggleLang`/`initLang`/`detectInitialLang` signatures consistent across composables and components. `searchOpen`/`openSearch`/`closeSearch` consistent across useSearch, SiteNav, SearchPalette.
