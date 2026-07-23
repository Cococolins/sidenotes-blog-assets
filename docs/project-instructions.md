# Sidenotes 顺带一提 — Project Instructions

## 博客概况

「Sidenotes / 顺带一提」是一个中英双语个人博客，哲学内核是「记录即反抗」。网址：sidenotes.cc。托管在 Bear Blog（bearblog.dev），一个极简主义博客平台，由个人开发者 Herman Martinus 维护。首页副标题：「生活的『旁注』，一些『顺带一提』的记录。并非无可或缺，它让人可爱。」

Bear Blog 的技术约束：
- 内容用 Markdown 编写，渲染为 HTML
- 定制通过全局 CSS 和 Footer Script Injection 实现（无模板引擎、无构建流程）
- 支持 `{{ posts }}` 语法嵌入动态文章列表，支持 tag 过滤、日期范围等参数
- 每篇文章可设 `class_name` 用于页面级 CSS 定制
- 完整文档：https://docs.bearblog.dev

## 栏目结构

| 英文名 | 中文名 | 用途 |
|--------|--------|------|
| notes | 记 | 短内容信息流，类似微博/推文，带时间戳 |
| essays | 文 | 长文章 |
| gallery | — | 摄影照片展示 |
| links | — | 外部链接收藏 |
| about | 我 | 关于作者 |
| now | 今 | 个人近况 |

## 技术架构

### 字体栈

- **标题字体** (`--font-main`)：系统 UI 字体栈（system-ui, -apple-system, BlinkMacSystemFont, Segoe UI...）
- **正文字体** (`--font-secondary`)：Noto Serif 优先（通过 jsDelivr fontsource CDN 加载可变字体，全球含中国大陆可用），Optima 备用（macOS 本地回退），中文回退到 PingFang SC → Microsoft YaHei
- **代码字体** (`--font-mono`)：Menlo, Monaco, Consolas, Courier New
- **CJK 标点修复** (`CJK Dash Fix`)：通过 `@font-face` + `unicode-range` 强制中文标点使用 CJK 字体渲染，修复破折号、省略号断裂与下沉问题

### 中文排版特性

- `font-feature-settings: "chws" 1` — 启用 OpenType 中文标点压缩
- `text-autospace: ideograph-alpha ideograph-numeric` — 中英文/中文与数字间自动加空
- `text-spacing-trim: normal` — 标点宽度修剪
- `-webkit-font-smoothing: antialiased` — 字体抗锯齿

### CSS 架构

全局变量体系，支持亮/暗主题（`prefers-color-scheme: dark`）。CSS 文件按节号组织，共 15 个模块：

| 节号 | 模块名 | 说明 |
|------|--------|------|
| 0 | 第三方样式 | PhotoSwipe v5 灯箱核心样式（压缩内联） |
| 1 | 设计令牌 | Noto Serif `@font-face`（jsDelivr CDN）、CJK Dash Fix、CSS 自定义属性（颜色/字体/尺寸）、亮暗主题切换 |
| 2 | 全局重置与基础版式 | `--width: 660px`，`line-height: 1.7`，行内 `code` 与块级 `pre` 分治 |
| 3 | 页面骨架 | sticky header，以及 footer 版权等基础骨干结构 |
| 4 | 导航栏 | 桌面端水平链接行 + 移动端汉堡菜单/下拉面板（DOM 由 Footer Script 生成） |
| 5 | 文章列表 | `ul.blog-posts` 双列 Grid（日期 + 标题） |
| 6 | 图片、图注与脚注 | 全局图片默认样式，正文大图拓宽 `calc(100% + 40px)`，figcaption 及独立脚注样式 |
| 7 | 图片网格 | Quantity Queries：同一 `<p>` 内多图自动并排（2 列/3 列/2×2/3×N） |
| 8 | Notes 信息流 | 「记」页面专属：左侧日期+时间，右侧正文，标题隐藏，单图也裁切为正方形 |
| 9 | Gallery 信息流 | 「相」页面专属：反向隐藏策略（只显示图片），Flex 流式三列网格 |
| 10 | 插件定制 | PhotoSwipe 灯箱按钮/图注、网易云迷你播放器、工具类 |
| 11 | 折叠面板 | `details/summary` 样式 |
| 12 | 响应式 | 断点 `768px`：汉堡菜单、Notes 单列堆叠、Gallery 图片跨列 |
| 13 | 体验增强 | 解决特定浏览器交互痛点的 UX 增强补丁 |
| 14 | 文章目录 | 三站共用的桌面端目录面板、移动端目录对话框及响应式状态 |

### Header Injection

通过 Bear Blog 的 Header Injection 注入到 `<head>` 中，仅一行 `preconnect` 提示，为 CSS 中的字体 `@font-face` 和 Footer Script 中的 PhotoSwipe 动态 import 预建连接（两者均走 `cdn.jsdelivr.net`）。

### Footer Script

采用单一 ES Module 脚本，通过 Bear Blog 的 Footer Injection 注入到 `</body>` 前。通过核心对象 `BlogApp` 统一管理生命周期，模块化执行以下功能：

1. **副标题注入 (SEO 友好)** — 抓取 `header .title h1` 并动态追加副标题元素，解决原生配置在多页面的 title 冗余问题。
2. **响应式导航栏** — 动态创建汉堡菜单按钮和移动端折叠菜单 DOM。
3. **PhotoSwipe 画廊组件** — 自动向图片追加 `<a>` 外壳实现分组，支持“空闲时静默预加载 (requestIdleCallback)”核心库，通过 `showHideOpacity` 从根源消除 iOS Safari 缩略图拉伸闪烁。
4. **精确时间本地化** — 基于状态检测机制等待 DOM 加载后，将 `<time datetime>` 解析为访客本地精确实分（HH:MM）渲染，消灭加载跳动。
5. **YouTube 延迟加载 (Lazy Loading)** — 取代原生 iframe，通过 `IntersectionObserver` 监视视口，仅滚入可视区时挂载播放器，极大提升首屏性能。
6. **外部链接处理** — 站内链接维持同页重载，外链自动判定施加 `target="_blank"` 和安全策略。

## 协作规则

### 代码相关
- 修改 CSS/JS 时，必须理解现有架构再动手。不要引入与现有模式冲突的方案。
- CSS 注释使用中文，保持与现有风格一致（`/* 修改说明：…… */` 这种风格）。
- Bear Blog 没有构建流程，所有代码必须是浏览器可直接执行的。不要建议使用 Sass、PostCSS、npm 构建等。
- 外部依赖通过 CDN 引入（当前使用 jsDelivr）。新增依赖需慎重。

### 内容相关
- 博客是中英双语的。帮我写中文内容时，遵守方角引号规则（「」『』），中英文/数字之间加半角空格。
- 不要替我决定博客的内容方向或「品牌定位」。我会自己判断。你的角色是技术实现和文字润色。

### 交互风格
- 挑战我的技术方案时保持直接，但给出具体替代方案，不要只说「这样不好」。
- 如果我的 CSS 方案有兼容性问题，直接指出受影响的浏览器和版本。
