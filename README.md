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

CSS 按「共享范围」拆分。

改这里会影响三个站：

```text
src/shared/css/all/00-vendor-photoswipe.css
src/shared/css/all/03-layout.css
src/shared/css/all/04-navigation.css
src/shared/css/all/06-media.css
src/shared/css/all/07-image-grid.css
src/shared/css/all/07b-consecutive-photo-paragraphs.css
src/shared/css/all/10-plugins.css
src/shared/css/all/11-details.css
src/shared/css/all/13-enhancements.css
```

改这里会影响 `sidenotes.cc` 和 `tt.sidenotes.cc`：

```text
src/shared/css/sidenotes-tt/05-post-list.css
src/shared/css/sidenotes-tt/08-notes-feed.css
src/shared/css/sidenotes-tt/09-gallery-feed.css
src/shared/css/sidenotes-tt/12-responsive.css
```

改这里会影响 `daily.sidenotes.cc` 和 `tt.sidenotes.cc`：

```text
src/shared/css/daily-tt/01-tokens.css
src/shared/css/daily-tt/02-base.css
```

只改单个站时，到对应站点目录：

```text
src/sites/sidenotes/css/
src/sites/daily/css/
src/sites/tt/css/
```

脚本改这里：

```text
src/shared/js/blog-app.js          # 共享脚本逻辑
src/sites/sidenotes/config.json    # 主站副标题、精确时间 selector
src/sites/daily/config.json
src/sites/tt/config.json
```

`daily` 额外启用了首页摘要水合：文章正文里可以放 `<!-- more -->`，脚本会在首页读取单篇文章，并用该标记之前的段落替换 embedded list 里的 description；没有标记时默认取前 2 段。配置在 `src/sites/daily/config.json` 的 `excerptHydrator`。

不要手动改 `dist/`。改完 `src/` 后运行 `npm run build`，确认没问题再发布。

## 发布产物

每个站点会生成这些调用片段：

```text
dist/<site>.css                       # 外链 CSS
dist/<site>.js                        # 外链 ES module 脚本
dist/snippets/<site>-custom-css.css   # Bear Blog Custom CSS 片段
dist/snippets/<site>-header.html      # Bear Blog Header Injection 片段
dist/snippets/<site>-footer.html      # Bear Blog Footer Script 片段

dist/<site>.header.html               # 旧方式：整段 header injection
dist/<site>.footer.html               # 旧方式：整段 module footer injection
```

其中 `<site>` 是：

```text
sidenotes
daily
tt
```

推荐 Bear Blog 使用这三段：

```html
<!-- Header Injection -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="https://cdn.jsdelivr.net/fontsource/fonts/noto-serif:vf@latest/latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="https://cdn.jsdelivr.net/fontsource/fonts/noto-serif:vf@latest/latin-wght-italic.woff2" as="font" type="font/woff2" crossorigin>
```

```css
/* Custom CSS */
@import url("https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@latest/dist/sidenotes.css");
```

```html
<!-- Footer Script Injection -->
<script type="module" src="https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@latest/dist/sidenotes.js"></script>
```

不要把 Bear Blog 的 Custom CSS 清空。清空后 Bear 会重新注入默认主题 CSS，而 Header Injection 又排在默认 CSS 前面，会导致默认 Verdana 字体和蓝色链接覆盖当前主题。Custom CSS 里只保留上面这一行 `@import` 即可，不需要再粘贴整份 CSS。

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

三个站点都由 `src/sites/<site>/manifest.json` 组合生成。shared 模块优先从当前线上 CSS 完全一致的 section 提取；确认属于漏同步的通用 bugfix 时，也会提升到 shared。

每次发布前先跑：

```bash
npm run build
npm run verify
```
