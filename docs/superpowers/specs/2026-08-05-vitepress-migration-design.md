# VuePress → VitePress 迁移与 devlog 首页重构

- **日期**: 2026-08-05
- **状态**: 待评审
- **主题**: 将个人博客由 VuePress 1.x 升级为 VitePress，并基于 `test-index.html`（devlog 设计稿）重构整个项目与首页

## 1. 目标

1. 构建工具由 VuePress 1.8.2 迁移到 VitePress（Vite + Vue 3）。
2. 以 `test-index.html` 为唯一视觉与交互来源，用**全自定义 VitePress 主题**重构整个站点，使首页、文章页、游戏页风格统一。
3. 首页保留核心交互：分类筛选、阅读进度条、滚动渐显；并实现**小恐龙跑酷游戏**，同时留下扩展其他游戏的能力。
4. 实现**真实的本地 ⌘K 搜索面板**。
5. 保留**中/英双语切换**（仅 UI 文案；文章正文单语言）。
6. 文章由 markdown + frontmatter 自动生成列表与详情页。
7. 更新部署链路（CI Node 版本、构建产物路径）以适配 VitePress。

## 2. 非目标（YAGNI）

- 不做暗色模式（test-index 仅 light）。
- 不做 VitePress 原生 i18n 多路由树（正文不双语）。
- 不做默认主题的侧边栏 / 大纲导航（博客不需要）。
- 不做评论、统计、CMS、RSS 生成器（footer 的 RSS 为外链占位即可）。
- 暂不为每个游戏单独生成路由（用同页内嵌懒加载）。

## 3. 现状

- `package.json`：`vuepress ^1.8.2`，脚本 `docs:dev` / `docs:build`。
- `docs/.vuepress/config.js`：base `/`、lang `zh-CN`、title `pray-wind`、nav + sidebar。
- `docs/README.md`：VuePress 默认首页（heroImage miku.png、3 个 features、Hello VuePress）。
- `docs/blog/FirstBlog.md`：占位内容。
- `docs/.vuepress/public/miku.png`。
- `.github/workflows/docs.yml`：Node **14** + **yarn**，产物 `docs/.vuepress/dist`，`crazy-max/ghaction-github-pages` 推送到 `gh-pages`。
- `deploy.sh`：本地构建后 SSH 推送到 `gh-pages`，产物路径同上。
- `.gitignore`：含一行 `docs`（异常——`docs/` 实际被跟踪，新文件会被忽略）。
- `test-index.html`：完整的单页 devlog 设计稿（设计系统、nav、hero、featured、archive 网格 + 专题筛选、小恐龙游戏、about、footer、搜索面板、中英双语、滚动渐显、阅读进度条），原生 JS 实现。

## 4. 目标架构

### 4.1 目录结构

```
wei-qx.github.io/
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.ts                  # 替换 .vuepress/config.js
│  │  ├─ theme/
│  │  │  ├─ index.ts                # 自定义主题入口
│  │  │  ├─ Layout.vue              # 全局外壳：nav + 视图槽 + footer + progress + palette
│  │  │  ├─ styles/
│  │  │  │  ├─ tokens.css           # :root 设计令牌（复制自 test-index）
│  │  │  │  ├─ base.css             # reset / 排版 / 按钮 / 容器
│  │  │  │  └─ components.css       # 跨组件复用样式（或各组件 scoped）
│  │  │  ├─ components/
│  │  │  │  ├─ SiteNav.vue
│  │  │  │  ├─ SiteFooter.vue
│  │  │  │  ├─ ReadingProgress.vue
│  │  │  │  ├─ SearchPalette.vue
│  │  │  │  ├─ T.vue                # 双语文案 <T :zh :en />
│  │  │  │  └─ ArticleHeader.vue
│  │  │  ├─ components/games/
│  │  │  │  └─ DinoRun.vue
│  │  │  ├─ views/
│  │  │  │  ├─ HomeView.vue
│  │  │  │  └─ PlaygroundView.vue
│  │  │  ├─ composables/
│  │  │  │  ├─ useLang.ts
│  │  │  │  ├─ usePosts.ts
│  │  │  │  └─ useReveal.ts         # v-reveal 指令实现
│  │  │  └─ data/
│  │  │     ├─ site.ts              # hero/about/footer 文案（双语）
│  │  │     └─ games.ts             # 游戏注册表
│  │  └─ public/                    # 静态资源（含 miku.png）
│  ├─ index.md                      # 首页（frontmatter: layout: home）
│  ├─ posts/                        # blog/ 改名 posts/
│  │  ├─ FirstBlog.md
│  │  └─ *.md                       # 7 篇示例文章
│  └─ playground/
│     └─ index.md                   # 游戏页（frontmatter: layout: playground）
├─ package.json                     # 去 vuepress，加 vitepress，新脚本
├─ .github/workflows/docs.yml       # Node 20 / npm / 产物 docs/.vitepress/dist
├─ deploy.sh                        # 更新产物路径
└─ test-index.html                  # 保留作设计参考
```

### 4.2 VitePress 配置（`config.ts`）要点

- `title`、`description`、`lang: 'zh-CN'`、`lastUpdated`。
- `cleanUrls: true`。
- 不启用默认主题（自定义主题 `theme/index.ts` 导出 `Layout`）。
- `head`：favicon（沿用 test-index 的 SVG data-uri）、Google Fonts（Inter）preconnect + 加载。
- 不配置 i18n 路由；双语由前端 composable 处理。

### 4.3 自定义主题入口（`theme/index.ts`）

导出 `Layout`（`Layout.vue`）。`Layout.vue` 读取当前页 `frontmatter.layout`：
- `home` → 渲染 `HomeView`
- `playground` → 渲染 `PlaygroundView`
- 否则 → 文档视图：`ArticleHeader` + `<Content />`

外层始终包含 `ReadingProgress`、`SiteNav`、`SiteFooter`、`SearchPalette`（teleport 到 body）。

## 5. 设计系统（视觉来源 = test-index）

- `tokens.css`：**逐字复制** test-index 的 `:root` 块——绿系配色（`--accent #1f8f46`、`--bg #f3faf4`）、Georgia/Inter/SF Mono 字体族、spacing / radius / motion / container 令牌，以及 900px / 600px 两档响应式 `--section-y` / `--gutter` 覆盖。
- `base.css`：reset、`body`、`a`、`::selection`、标题（衬线）、`.container`、`.section`、`.eyebrow`、`.mono`、`.btn` / `.btn--primary`（含 focus-ring 与 hover 箭头位移）。
- 组件样式：与 test-index 类名一一对应（`.feature`、`.archive`、`.card`、`.tag`、`.game`、`.footer`、`.palette` 等），放在 `components.css` 或各组件 scoped 样式中。

## 6. 主题外壳（每页存在）

- **SiteNav**：sticky；`scrollY>8` 切换 `.scrolled`（backdrop-blur）。品牌 `devlog v0`、导航链接（Latest/Archive/Play/About）、⌘K 搜索触发器、语言切换按钮。
- **ReadingProgress**：顶部 3px 固定条，按滚动比例设置 `transform: scaleX(...)`。
- **SiteFooter**：品牌 + Navigate/Elsewhere 两列 + 底部版权，文案取自 `site.ts`（双语）。
- **SearchPalette**：见 §9。
- **双语**：见 §10。
- **滚动渐显 `v-reveal`**：IntersectionObserver 命中即加 `.is-visible`；`prefers-reduced-motion` 时直接可见、关闭过渡。

## 7. 首页（HomeView）

逐节对应 test-index：

1. **Hero**：eyebrow（Field notes / №01）、大号衬线标题、副标题、meta（作者 · 日期 · 关于链接）。文案取自 `site.ts`，双语。
2. **Latest（featured）**：取 `featured: true` 中按 `date` 最新的一篇（无 `featured` 则取全局最新一篇）→ 大号 `.feature` 卡片，“Read on” 指向 `/posts/<slug>`。
3. **Archive**：专题筛选（All / Systems / Frontend / Performance / Craft / Tooling）+ 2 列 `.card` 网格。筛选为客户端响应式（切换 category 即过滤）；每张卡片指向其文章。
4. **Play（featured game）**：内嵌注册表中标记为 featured 的游戏（小恐龙），章节头显示历史最高分。
5. **About**：简介段落 + “How I write” 卡片 + GitHub/RSS/Email 链接（取自 `site.ts`）。

## 8. 文章

### 8.1 内容模型与 frontmatter

每篇文章 = `docs/posts/<slug>.md`，frontmatter：

```yaml
title: 设计能随时间从容演进的系统
date: 2026-08-05
category: systems        # systems | frontend | performance | craft | tooling
excerpt: 大多数系统不是突然崩塌的……
tags: [boundary, reversibility]
readingMinutes: 12
featured: true           # 是否作为首页 Latest
order: 01                # 编号（用于显示与排序辅助）
draft: false             # true 时仅 dev 可见
```

### 8.2 自动生成（usePosts.ts）

```ts
// 文件位于 docs/.vitepress/theme/composables/usePosts.ts，故相对路径为 ../../../
const modules = import.meta.glob('../../../posts/*.md', { eager: true })
// 每个 module 含 frontmatter 与 __pageData（含 url）
// → 组装为 { url, title, date, category, excerpt, tags, readingMinutes, featured, order, draft }
// → 按 date 降序；draft 仅 dev 保留
```

首页 Archive 与 SearchPalette 共用 `usePosts()`。

### 8.3 示例文章

将 test-index 的 7 篇占位文章写成真实 markdown（中英标题 + 简短中文正文）。`FirstBlog.md` 保留（可归入某分类或作为示例）。

### 8.4 详情页

文档视图渲染 `ArticleHeader`（日期 · 阅读时长 · 分类 · 标签）于 `<Content/>` 之上，正文使用 devlog 排版（max-width ~68ch、衬线标题）。进度条、nav、footer、palette、双语均生效。

## 9. 搜索（本地、真实）

`SearchPalette.vue` 消费 `usePosts()`，按 `title / excerpt / tags` 大小写不敏感过滤；结果展示本地化标题 + meta。键盘：`↑↓` 导航、`Enter` 经 VitePress router 跳转到文章、`⌘K` 或 `/` 打开、`Esc` 关闭；空态文案本地化。UI 与 test-index 的 `.palette` 一致。

## 10. 双语

- `useLang.ts`：响应式 `lang` ref（`'zh' | 'en'`），持久化到 `localStorage['devlog-lang']`；默认 `zh`（正文为中文），但尊重已存值或 `navigator.language`；切换时设置 `document.documentElement.lang`。
- `<T :zh="..." :en="..." />` 组件按 `lang` 响应式渲染文案。
- 覆盖范围：nav、按钮、章节标题、eyebrow、footer、搜索占位与空态等 **UI 文案**。文章正文单语言（中文）。

## 11. 游戏（可扩展）

### 11.1 注册表（`data/games.ts`）

```ts
export interface Game {
  id: string
  title: { zh: string; en: string }
  desc: { zh: string; en: string }
  featured?: boolean
  component: () => Promise<any>   // 懒加载
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

**加游戏 = 写一个组件 + 在注册表加一行。**

### 11.2 PlaygroundView（`/playground`）

游戏卡片网格；点击卡片设置响应式 `selected`，**同页内嵌懒加载**该游戏组件（不为每个游戏单独建路由）。

### 11.3 DinoRun.vue

逐字移植 test-index 的 canvas 游戏：固定步长主循环、重力 / 跳跃、仙人掌 / 云朵、得分 + `localStorage['devlog-dino-hi']` 最高分、颜色读自 CSS 变量、Space/↑/触屏控制、IntersectionObserver 离屏暂停。视觉与原型一致。

## 12. 部署与工具

- **`package.json`**：移除 `vuepress`，新增 `vitepress`（latest）。脚本：
  - `docs:dev` → `vitepress dev docs`
  - `docs:build` → `vitepress build docs`
  - `docs:preview` → `vitepress preview docs`
- **`.github/workflows/docs.yml`**（默认方案）：
  - `actions/checkout@v4`、`actions/setup-node@v4`（node-version **20**，VitePress 需 Node ≥18）。
  - `npm ci` → `npm run docs:build`。
  - 用官方 `actions/upload-pages-artifact`（path `docs/.vitepress/dist`）+ `actions/deploy-pages`，并配置 `permissions: pages: write, id-token: write` 与 `environment: github-pages`。
  - 备选：保留 `crazy-max/ghaction-github-pages`，仅把 node 升到 20、改用 npm、产物路径改为 `docs/.vitepress/dist`。
- **`deploy.sh`**：`cd docs/.vuepress/dist` → `cd docs/.vitepress/dist`；SSH 推送逻辑不变。
- **`.gitignore`**：删除独立的 `docs` 行；保留 `node_modules`；新增 `.vitepress/dist`、`.vitepress/cache`；移除 vuepress 专用的 `.temp` / `.cache`（可选）。
- **清理**：删除 `docs/.vuepress/`；`docs/README.md` → `docs/index.md`（首页）；`docs/blog/` → `docs/posts/`；保留 `test-index.html` 作参考。

## 13. 迁移步骤（高层、有序）

1. 删除 `.gitignore` 中的 `docs` 行（确保后续文件可跟踪）。
2. 安装 VitePress、更新 `package.json` 脚本；删除 vuepress 依赖。
3. 建 `docs/.vitepress/`：`config.ts` + `theme/`（tokens/base 样式 → Layout → 各组件）。
4. 移植设计系统（tokens / base / 组件样式）。
5. 实现主题外壳：SiteNav、SiteFooter、ReadingProgress、`v-reveal`、`useLang` + `<T>`、SearchPalette。
6. 实现 `usePosts` + frontmatter 约定；迁移 `blog/ → posts/`，写 7 篇示例。
7. 实现 HomeView（含分类筛选、featured 文章、featured 游戏、about）。
8. 实现 PlaygroundView + 游戏注册表 + DinoRun.vue。
9. 更新 `index.md` / `playground/index.md` 的 frontmatter；删除 `docs/.vuepress/`。
10. 更新 CI（Node 20 / npm / 产物路径 / 官方 Pages 部署）与 `deploy.sh`。
11. 验证（见 §14）。

## 14. 验证

静态文档站，不引入单测框架。验收清单：

- `npm run docs:build` 成功，产物在 `docs/.vitepress/dist`。
- 首页渲染 Hero / Latest / Archive / Play / About 全部区块，视觉与 test-index 一致。
- 专题筛选可正确过滤 Archive 卡片。
- ⌘K 搜索面板：输入过滤、`↑↓` 导航、`Enter` 跳转、`/` 与 `Esc` 行为正确。
- 小恐龙可玩、最高分持久化、离屏暂停。
- 中/英切换可切换全部 UI 文案并刷新 `<html lang>`；刷新后保持选择。
- 文章详情页带 ArticleHeader 与完整外壳，正文排版正确。
- 断点 600 / 720 / 860 / 900 响应式正常。
- `prefers-reduced-motion` 下渐显与游戏过渡被禁用。
- CI 在 Node 20 下构建并通过官方 Pages 部署。

## 15. 决策记录

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 主题方案 | 全自定义主题（A） | 设计稿为完整 bespoke，需整站统一；避免与默认主题样式冲突 |
| 迁移范围 | 视觉 + 核心交互 + 小恐龙（可扩展） | 用户明确要求 |
| 搜索 | 真实本地搜索面板 | 用户选择 |
| 双语范围 | 仅 UI 文案 | 文章正文单语言，避免维护两套内容 |
| 文章数据 | markdown frontmatter 自动生成 | 用户选择，便于增量写作 |
| 游戏架构 | 注册表 + 同页内嵌懒加载 | 加游戏一行注册，无需单独路由 |
| CI | Node 20 + npm + 官方 Pages 部署 | 现代化、VitePress 要求 Node ≥18 |

## 16. 待确认

无。所有关键 fork 已在头脑风暴中确定。
