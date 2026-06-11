# Sidenotes Blog Assets

这个仓库用于管理 Bear Blog 三个站点的自定义 CSS、Header Injection 和 Footer Script。

- `sidenotes.cc`
- `daily.sidenotes.cc`
- `tt.sidenotes.cc`

## 工作方式

- `src/` 是可维护源码。
- `dist/` 是生成后贴回 Bear Blog 的产物。
- `snapshots/` 保存线上抓取快照，用来确认迁移前后的行为没有漂移。
- `Archive/` 保存历史手动版本，可用脚本生成 diff。
- `Archive/Current/` 保存迁移前根目录里的当前手动版文件，仅用于对照和校验。
- `docs/` 保存项目说明和协作背景。

## 日常改哪里

主站 `sidenotes.cc` 的 CSS 已拆成模块：

```text
src/css/01-tokens.css                    # 字体、颜色、宽度等设计变量
src/css/02-base.css                      # 基础排版、正文、链接、斜体定制
src/css/03-layout.css                    # header / footer / 页面骨架
src/css/04-navigation.css                # 导航栏和移动端菜单样式
src/css/05-post-list.css                 # 普通文章列表
src/css/06-media.css                     # 图片、图注、脚注
src/css/07-image-grid.css                # 多图网格
src/css/07b-consecutive-photo-paragraphs.css
src/css/08-notes-feed.css                # notes 信息流
src/css/09-gallery-feed.css              # gallery 信息流
src/css/10-plugins.css                   # PhotoSwipe / 网易云等插件样式
src/css/11-details.css                   # details / summary
src/css/12-responsive.css                # 移动端
src/css/13-enhancements.css              # 小体验增强
```

脚本改这里：

```text
src/js/sidenotes.js
src/js/daily.js
src/js/tt.js
```

`daily` 和 `tt` 的 CSS 目前还没有拆模块，先保留为：

```text
src/sites/daily/legacy.css
src/sites/tt/legacy.css
```

不要手动改 `dist/`。改完 `src/` 后运行 `npm run build`，确认没问题再发布。

## 发布产物

每个站点会生成两套调用方式：

```text
dist/<site>.css                  # 外链 CSS
dist/<site>.js                   # 外链 ES module 脚本
dist/snippets/<site>-header.html # Bear Blog Header Injection 外链片段
dist/snippets/<site>-footer.html # Bear Blog Footer Script 外链片段

dist/<site>.header.html          # 旧方式：整段 header injection
dist/<site>.footer.html          # 旧方式：整段 module footer injection
```

其中 `<site>` 是：

```text
sidenotes
daily
tt
```

推荐 Bear Blog 使用外链片段：

```html
<!-- Header Injection -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="https://cdn.jsdelivr.net/fontsource/fonts/noto-serif:vf@latest/latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="https://cdn.jsdelivr.net/fontsource/fonts/noto-serif:vf@latest/latin-wght-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@latest/dist/sidenotes.css">
```

```html
<!-- Footer Script Injection -->
<script type="module" src="https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@latest/dist/sidenotes.js"></script>
```

切换到外链后，Bear Blog 的 Custom CSS 字段不需要再粘贴同一份 CSS；否则只是重复加载同样规则，维护上容易混乱。

`@latest` 会跟随最新 tag，但 jsDelivr 和浏览器缓存可能让更新延迟一段时间。如果某次改动需要完全可控，可以把 `latest` 换成固定 tag，例如 `v0.2.1`。

## 常用命令

```bash
npm run build
npm run verify
npm run release:patch -- "Release note"
npm run diff:archive -- css 20 34
npm run diff:archive -- footer 17 20
```

`release:patch` 会自动更新版本号、构建、校验、提交、打 tag 并 push。需要较大的版本跳跃时，可以用：

```bash
npm run release:minor -- "Release note"
npm run release:major -- "Release note"
```

## 当前策略

主站 `sidenotes` 的 CSS 已按现有章节拆进 `src/css/`，并由 `src/sites/sidenotes/manifest.json` 组合生成。

`daily` 和 `tt` 目前先以线上快照作为 legacy source 接入构建，避免在第一次入库时误改行为。后续可以逐步把它们改成：

```text
共享基础模块 + 站点专属覆盖
```

每次发布前先跑：

```bash
npm run build
npm run verify
```
