# Jant 编辑器接入 Sidenotes Dashboard：计划与执行细节

状态：本地 pilot 已实现，待固定 commit canary
调研日期：2026-07-25
目标平台：Bear Blog Dashboard
首轮目标博客：Sidenotes 主站（Bear blog ID 暂定为 `colin`）

## 1. 结论

不直接加载 Jant 的 CSS、authenticated client bundle 或
`jant-compose-editor` Web Component。

采用下面的实现路线：

1. 以 Jant 的写作体验和交互细节为设计参考。
2. 使用 MIT 许可的 Tiptap 重新实现一个轻量编辑器。
3. 通过 Sidenotes 自己维护的 Bear adapter，将 Tiptap Markdown 持续同步到
   Bear 原生 `textarea#body_content`。
4. 保留 Bear 原生的属性编辑、草稿恢复、预览、保存、发布和 CSRF 机制。
5. 对无法可靠往返的 Bear Markdown 自动降级到源码模式，禁止静默改写。

核心原则：

> Tiptap 是增强层，Bear textarea 是唯一提交数据源。

## 2. 为什么不直接移植 Jant

Jant 当前的编辑器并不是可独立嵌入的通用组件。它依赖：

- Lit light-DOM component；
- Tiptap 及大量自定义 ProseMirror extensions；
- Jant 自己的 Markdown schema；
- Jant 上传、图片托管、附件和 sideload API；
- Note、Link、Quote 三种内容模型；
- Thread、Collection、Rating、attached text 等 Jant 数据结构；
- Jant authenticated client bundle 和站内事件总线。

直接加载 Jant bundle 会出现以下问题：

- 请求 Jant 专属 API，无法映射到 Bear；
- 将无关的后台、附件和配置功能一起带入；
- CSS 与 Bear Dashboard 全局样式互相污染；
- bundle 升级与 Jant pre-1.0 breaking changes 绑定；
- 无法保证 Bear Markdown 无损往返；
- Jant 使用 AGPL-3.0-or-later，直接复制实现会增加衍生代码的许可义务。

因此只复用以下产品思路，不复制实现代码：

- 无干扰的正文画布；
- 选区浮动格式工具条；
- Visual／Markdown 双模式；
- Markdown-first persistence；
- 图片粘贴、拖放与 alt text；
- 全屏写作；
- 结构化快捷键；
- 编辑失败时可退回原始文本。

Tiptap 开源编辑器本身使用 MIT License，适合作为底层依赖。

## 3. 已确认的 Bear 接入契约

调研所依据的 Bear 源码 commit：

```text
3f83a56a09f512d59b6240a4b8399d33a3b2c8ad
```

编辑页当前包含：

```html
<form method="POST" class="post-form full-width">
  <div id="header_content" contenteditable="true"></div>
  <input
    type="hidden"
    id="hidden_header_content"
    name="header_content"
  >
  <textarea
    id="body_content"
    name="body_content"
  ></textarea>
</form>
```

Bear 原生脚本当前负责：

- 将 `#header_content.innerText` 写入 hidden input；
- 在 textarea `input` 后把正文暂存到 localStorage；
- 处理最近一分钟内的未保存草稿恢复；
- `Cmd/Ctrl + S` 提交表单；
- 预览前读取 `#body_content.value`；
- 图片上传完成后把 Markdown 写入 textarea；
- 发布、存草稿、取消发布和删除。

Bear Dashboard 自定义内容的执行顺序是：

1. Bear 默认 Dashboard CSS；
2. 用户的 `dashboard_styles`；
3. 编辑页原生 `editor_functions.html`；
4. 用户的 `dashboard_footer`。

因此 Sidenotes editor 可以在 Bear 原生编辑器初始化完成后挂载，但不能假设
自己最先注册 submit、keydown、paste 或 upload listener。

### 3.1 实施前必须进行的线上确认

在登录后的实际 Bear 页面只读检查：

- [ ] Sidenotes 主站后台路径首段是否仍为 `colin`；
- [ ] 新建文章路径是否为 `/colin/dashboard/posts/new/`；
- [ ] 编辑文章路径是否为 `/colin/dashboard/posts/<uid>/`；
- [ ] `.post-form`、`#header_content`、`#body_content` 是否仍存在；
- [ ] Dashboard Footer 是否仍在 Bear 原生编辑器脚本之后运行；
- [ ] textarea 初始值是否为未经 HTML escaping 的原始 Markdown；
- [ ] CSRF input 名称是否仍为 `csrfmiddlewaretoken`；
- [ ] 图片上传端点是否仍为 `/colin/dashboard/upload-image/`；
- [ ] 上传响应是否仍为 URL 数组；
- [ ] Bear 是否已经加载其他官方或第三方 editor plugin。

任一关键 selector 不匹配时，编辑器必须 no-op，而不是猜测新的 DOM。

## 4. 目标与非目标

### 4.1 MVP 目标

- 保持 Bear 原有发布工作流；
- 提供接近 Jant 的轻量可视化写作体验；
- 提供随时可见的 Markdown 源码模式；
- 支持常用 Markdown 格式；
- 提供全屏模式；
- 支持中文输入法；
- 支持桌面、iPhone 和 iPad；
- iOS 虚拟键盘打开时正文、工具条和当前选区仍可见；
- 未修改正文时保持原始 Markdown 字节不变；
- 不支持的语法自动使用源码模式；
- 编辑器失败时恢复原始 textarea；
- 不影响公开 Sidenotes 页面性能；
- 不影响 `sndaily` 和 `ct`。

### 4.2 MVP 不做

- 不移植 Jant Note／Link／Quote 模型；
- 不移植 Thread 和 Collection；
- 不移植 Rating；
- 不移植 attached text；
- 不接入 Jant 后端；
- 不创建独立发布 API；
- 不替换 Bear 的 header attributes 数据结构；
- 不修改 Bear 的 publish／draft 语义；
- 不在第一版支持任意 HTML 的可视化编辑；
- 不在第一版支持 MP3、MP4、PDF 附件面板；
- 不在第一版加入 AI 功能；
- 不把 Dashboard bundle 加入公开站点资产。

## 5. 预期目录结构

实施阶段建议使用：

```text
dashboard/
  README.md
  editor-integration-plan.md
  fixtures/
    bear-post-editor.html
    markdown/
      safe-basic.md
      safe-image.md
      unsupported-bear-directive.md
      unsupported-html.md
      unsupported-latex.md

src/
  dashboard/
    sidenotes-editor/
      index.ts
      config.ts
      bear-adapter.ts
      create-editor.ts
      markdown-compatibility.ts
      markdown-state.ts
      source-mode.ts
      toolbar.ts
      upload.ts
      lifecycle.ts
      editor.css

dist/
  dashboard/
    sidenotes-editor.js
    sidenotes-editor.css
  snippets/
    sidenotes-dashboard-footer.html
```

`src/` 是实现源文件，`dist/` 仍然只存生成文件。`dashboard/` 保存计划、测试
fixture、上线记录和以后需要保留的 Dashboard 专属维护说明。

## 6. Runtime 架构

```text
Dashboard Footer snippet
        │
        ▼
路径和 DOM guard
        │
        ├── 不匹配 ──► no-op
        │
        ▼
加载 Dashboard CSS
        │
        ▼
Markdown compatibility scan
        │
        ├── 不安全 ──► Source mode
        │
        ▼
创建 Tiptap Editor
        │
        ▼
Bear adapter 持续同步
        │
        ▼
textarea#body_content
        │
        ├── Bear draft recovery
        ├── Bear preview
        ├── Bear save draft
        └── Bear publish
```

### 6.1 路径 guard

建议配置：

```ts
const dashboardEditorConfig = {
  enabledBlogIds: ["colin"],
  disabledBlogIds: ["sndaily", "ct", "hom"],
  postPathPattern:
    /^\/([^/]+)\/dashboard\/posts\/(?:new|[^/]+)\/$/,
};
```

初始化必须同时满足：

```text
pathname 匹配 postPathPattern
blog ID 在 enabledBlogIds
form.post-form 唯一存在
#body_content 唯一存在
#header_content 唯一存在
页面尚未设置 data-sn-editor-mounted
```

不能只检查 `.post-form`，因为 Dashboard 其他设置页也可能使用相同 class。

### 6.2 Progressive enhancement

初始化顺序：

1. 读取 textarea 原始值；
2. 保存原始 DOM 状态；
3. 创建 editor shell；
4. 确认 Tiptap 成功创建；
5. 最后才切换 textarea 的显示状态；
6. 设置 `data-sn-editor-mounted="true"`。

初始化失败时：

- 销毁已创建的 editor；
- 移除 shell 和注入的临时节点；
- 恢复 textarea；
- 不阻止 Bear 原生 listener；
- 在 console 输出一次有前缀的错误；
- 页面上显示非阻塞提示，但不得遮挡原生保存按钮。

## 7. textarea 同步协议

### 7.1 单一真源

Bear 实际提交的仍然是：

```js
document.querySelector("#body_content").value
```

Tiptap 的 JSON 只是运行时状态，不能成为另一份永久数据源。

### 7.2 初始载入

- 保存 `initialMarkdown = textarea.value`；
- parse 时不改写 textarea；
- Tiptap 初始化事件不得把规范化后的 Markdown 写回；
- 设置 `editorDirty = false`；
- 用户没有真实编辑时，发布和预览仍使用 `initialMarkdown`。

验收条件：

> 打开一篇文章，不修改正文，直接 Preview 或 Save，正文必须保持字节不变。

### 7.3 Visual → textarea

仅在用户产生 Tiptap transaction 后：

1. serialize Tiptap document；
2. 写入 `textarea.value`；
3. 设置内部同步锁；
4. 派发 bubbling `input` event；
5. 清除同步锁；
6. 设置 `editorDirty = true`。

需要 debounce 的只有昂贵的 compatibility 检查；textarea 写入应保持即时或接近
即时，避免 Bear 先执行快捷键提交。

### 7.4 textarea → Visual

监听 textarea `input`：

- 内部同步锁开启时忽略；
- 外部插件或版本恢复触发时重新 parse；
- parse 不安全时切到 Source mode；
- source mode 手动编辑时可以 debounce 后更新只读 preview，但不强制载入
  Visual mode。

特别处理：

- Bear 原生 `#restore-draft` 当前只赋值，不派发 `input`；
- 需要 delegated click listener，在 Bear handler 完成后的 microtask 中读取
  textarea 并重载编辑器；
- 现有版本历史脚本已经派发 `input`，可走标准同步路径。

### 7.5 提交、预览与快捷键

由于 Bear 原生 submit listener 比 Dashboard Footer 更早注册，而且内部调用
`form.submit()`，不能依赖晚注册的 bubble listener。

需要：

- capture-phase `submit` listener：同步当前 Visual Markdown；
- capture-phase `click` listener：覆盖 Publish、Save、Unpublish 和 Preview；
- capture-phase `keydown` listener：处理 `Cmd/Ctrl + S`；
- Visual 模式内按快捷键时，不阻止 Bear 原生保存，除非同步发生错误；
- 同步错误时阻止提交，并自动打开 Source mode，避免保存残缺正文。

## 8. Markdown 兼容策略

### 8.1 MVP 可安全编辑

第一版 Visual mode 支持：

- paragraph；
- heading level 1–3；
- bold；
- italic；
- strike；
- inline code；
- blockquote；
- ordered list；
- bullet list；
- code block 和 language；
- horizontal rule；
- hard break；
- 普通链接；
- 标准 Markdown 图片；
- undo／redo。

### 8.2 第一版自动降级

检测到以下内容时默认进入 Source mode：

- 原始 HTML block 或 inline HTML；
- `{{ ... }}` Bear template directive；
- `tab:` link；
- `[^label]` footnote；
- `$$...$$` 或其他 LaTeX；
- `==highlight==`；
- `H~2~O` 下标；
- `6^th^` 上标；
- HTML comment；
- 未被当前 schema 支持的 table；
- 自定义 admonition；
- iframe、video、audio、details；
- 无法识别的 fenced block；
- parser／serializer round-trip 差异超出允许的格式规范化。

降级提示需要说明具体原因，例如：

```text
本文包含 Bear template directive，Visual 模式暂时关闭。
Markdown 源码不会被改写。
```

### 8.3 Round-trip gate

Visual mode 启用前：

1. 静态扫描已知不兼容语法；
2. 在内存中 parse；
3. serialize clone；
4. 对换行符和尾部空行做有限规范化；
5. 比较语义标记；
6. 失败则 Source mode。

不能把「Tiptap 成功 parse」当作兼容证据，因为 schema 可能静默丢弃未知节点。

### 8.4 后续扩展顺序

1. GFM table；
2. footnotes；
3. `tab:` link；
4. highlight；
5. subscript／superscript；
6. raw Markdown block；
7. Bear template directive atom node；
8. LaTeX atom node；
9. HTML／embed 专用源码块。

每新增一种 syntax，必须同时增加：

- parser fixture；
- serializer fixture；
- no-edit byte-stability test；
- edit round-trip test；
- Bear preview manual test。

## 9. UI 与 CSS

### 9.1 设计方向

- 只设计 light/day mode；
- 保留 Sidenotes 的纸张感和绿色强调色；
- 正文区优先，工具条降低存在感；
- 桌面端正文阅读宽度约 `42rem–48rem`；
- 移动端使用 viewport 宽度，不产生双层滚动；
- 格式按钮使用 SVG，不引入图标字体；
- 浮动菜单必须支持 keyboard focus；
- 所有按钮有可读 label、title 和 active state；
- `prefers-reduced-motion` 下停用非必要动画。

### 9.2 CSS 隔离

所有 selector 使用统一前缀：

```text
body.sn-dashboard-editor
.sn-editor
.sn-editor__toolbar
.sn-editor__canvas
.sn-editor__source
.sn-editor__status
.sn-editor__bubble-menu
```

不要覆盖无作用域的：

```css
button {}
textarea {}
main {}
header {}
form {}
```

Bear Dashboard CSS 是账户级配置，任何全局 selector 都可能影响其他博客和设置页。

### 9.3 原 textarea 的处理

不能永久 `display: none`：

- Source mode 需要原 textarea；
- editor 故障时需要立即恢复；
- textarea 仍承担提交和 Bear 草稿逻辑。

Visual mode 下可用 wrapper 控制可见性；Source mode 下 textarea 恢复完整尺寸。
screen reader 不能同时读到两套正文编辑器，需要正确切换 `aria-hidden` 和
focus target。

### 9.4 iOS 是 MVP 支持目标

iOS 不能只作为一个窄屏 CSS breakpoint 处理。Safari 的 layout viewport、
visual viewport、地址栏和虚拟键盘会共同改变实际可见区域；编辑器还会受到
`contenteditable` selection、composition 和系统文本菜单的影响。

首版支持范围：

- iPhone Safari 的 Visual／Source 编辑；
- iPad Safari 的触摸和实体键盘编辑；
- 中文拼音输入法；
- 原生照片选择器；
- Preview、Save as draft 和 Publish；
- 横竖屏切换；
- Safari 页面被系统回收或重新载入后的 Bear 草稿恢复。

首版不要求：

- iPhone 上与桌面完全相同的浮动工具条；
- 依赖 drag and drop 才能完成的操作；
- 强制相机拍摄；
- 在屏幕键盘上方永久固定一整排复杂按钮。

### 9.5 虚拟键盘与 viewport

实现要求：

- 不使用 `height: 100vh` 作为编辑器唯一高度；
- 优先使用正常 document scroll；
- 可使用 `min-height: 100svh` 和 `100dvh`，但必须有普通 block layout
  fallback；
- 不通过 `body { overflow: hidden }` 模拟原生 App；
- 工具条不得只依赖 `position: fixed; bottom: 0`；
- 监听 `window.visualViewport` 的 `resize` 和 `scroll`，只将其作为当前可见
  区域的提示，不假设 `offsetTop` 在键盘关闭后一定立即归零；
- viewport 数据异常时，把工具条退回 editor shell 内的 sticky／static
  位置；
- 使用 `env(safe-area-inset-bottom)` 为底部交互保留安全区；
- 旋转屏幕后重新计算工具条和 selection menu 位置；
- 任何重新定位都不能调用 `editor.commands.setContent()`，避免选区跳动。

iOS 26 已有 virtual viewport 在键盘关闭后位置未恢复的公开报告，因此
「固定底栏 + 锁死 body」不能作为唯一布局方案。

### 9.6 触摸工具条

桌面端可以使用 Jant 式 selection bubble menu；iPhone 上改用更保守的常驻
工具条：

```css
@media (hover: none) and (pointer: coarse) {
  .sn-editor__bubble-menu {
    display: none;
  }

  .sn-editor__mobile-toolbar {
    display: flex;
  }
}
```

原因：

- bubble menu 容易遮挡 iOS 原生选区手柄和 copy／paste 菜单；
- 虚拟键盘打开后可见空间不足；
- hover 状态在触摸屏上没有可靠对应；
- selection coordinates 在滚动和缩放期间可能短暂过期。

移动端工具条要求：

- 常用按钮优先：Bold、Italic、Link、Heading、Quote、Undo、Redo；
- 次要按钮放入展开菜单；
- tap target 最小约 `44px × 44px`；
- 不使用 hover 才能发现的操作；
- 不在 `touchstart` 中默认阻止事件，避免破坏原生 selection；
- 点击 toolbar 后恢复 editor selection，但不得关闭中文输入 composition。

### 9.7 中文输入法与 composition

Visual 和 Source mode 都必须处理：

```text
compositionstart
compositionupdate
compositionend
```

规则：

- composition 期间不进行 Markdown serialize；
- composition 期间不从 textarea 反向 `setContent`；
- composition 期间不执行 compatibility scan；
- `compositionend` 后只执行一次同步；
- toolbar command 不得在未完成 composition 时强制 focus 或重建 selection；
- 外部草稿恢复与正在进行的 composition 冲突时，先提示，不直接覆盖。

这部分不仅影响中文，也影响日文、韩文以及 iOS 的联想和听写输入。

### 9.8 iOS 字体、缩放与滚动

- editor、textarea、input 的正文尺寸不低于 `16px`，避免聚焦时自动放大；
- 不设置 `user-scalable=no`；
- 长文只保留一个主要纵向滚动区域；
- Source mode textarea 不使用固定 `500px` 高度和内部长滚动条；
- 当前段落必须能滚动到虚拟键盘上方；
- `scrollIntoView` 使用保守的 block alignment，避免每次输入都跳动；
- toolbar 展开不得导致正文横向滚动；
- code block 和 table 可以局部横向滚动，但不能撑宽整个页面。

### 9.9 iOS 图片选择

- 主路径是 `<input type="file" accept="image/*">`；
- 不默认添加 `capture`，让用户自行选择照片图库、文件或相机；
- 如需要快速拍摄，单独提供明确标注的「拍照」入口；
- clipboard paste 只是补充能力，不能是 iOS 唯一图片入口；
- 上传前保留当前 editor selection bookmark；
- 系统 picker 返回后恢复 selection，再插入 placeholder；
- picker 被取消时不产生空节点；
- 多张 HEIC／大图需要验证 Bear 服务端返回和移动网络失败体验；
- 页面进入后台时不能把未完成上传误判为已完成正文。

## 10. 图片上传

### 10.1 Bear endpoint

根据当前 Bear source：

```text
POST /<blog-id>/dashboard/upload-image/
```

请求：

```text
multipart/form-data
file=<File>
X-CSRFToken=<form input value>
```

当前响应预期为：

```json
[
  "https://bear-images.../file.webp"
]
```

上线前必须在实际 Dashboard 重新确认。

### 10.2 MVP 图片能力

- toolbar 选择文件；
- drag and drop；
- clipboard paste；
- 多文件顺序上传；
- 本地 placeholder；
- 进度状态；
- 失败后保留可重试节点；
- 成功后插入标准 image node；
- alt text 编辑；
- serialize 为 Bear 支持的 Markdown。

### 10.3 不能复用 Bear textarea upload listener 的原因

Bear 原生 upload 逻辑：

- 读取 textarea `selectionStart`；
- 在 textarea 中插入 uploading placeholder；
- XHR 完成后直接赋值 `textarea.value`；
- 不保证派发 `input`。

Visual editor focus 不在 textarea 中，因此不能可靠复用 selectionStart，也无法
保证 Tiptap 自动获知异步赋值。MVP 应使用同一个 Bear endpoint，但由 Sidenotes
editor 自己维护选区和节点状态。

### 10.4 第二阶段媒体

以下功能延后：

- MP4 输出 `<video>`；
- MP3；
- PDF；
- 多附件 strip；
- 图片排序；
- caption；
- Sidenotes `hero-portrait` class；
- 站内现有 figure／caption 规则的结构化编辑。

## 11. 现有 Dashboard 脚本迁移

本地参考文件：

```text
Archive/Custom Dashboard Script V0.txt
```

### 11.1 Markdown Power-Editor

当前：

```html
<script src="https://flschr.github.io/bearblog-plugins/markdown-toolbar.js"></script>
```

首轮灰度时移除或条件禁用。它和 Tiptap 都会控制同一个 textarea、toolbar、
preview 和 fullscreen，不能同时作为主编辑器。

可借鉴但不直接并存的功能：

- Markdown button 集；
- 字数统计；
- fullscreen；
- custom snippet；
- mobile toolbar。

### 11.2 自动换行修复

当前 `fix_new_lines()` 会在每一行末尾自动补两个空格。

Visual mode 下禁止自动执行，原因：

- 会改变 Tiptap serializer 输出；
- 会把语义换行变成 hard break；
- 修改 textarea 后没有同步回 Visual document；
- 用户无法预知保存前的全文改写。

以后可以作为 Source mode 的显式命令保留，执行前显示 diff 或确认。

### 11.3 Version history

第一版保留。

需要验证：

- Visual 编辑派发 `input` 后能够存入版本；
- restore 后的 `input` 能重新载入 Visual editor；
- version record 保存的是 textarea Markdown，不保存 Tiptap JSON；
- 恢复不支持的版本时自动进入 Source mode。

### 11.4 Dashboard post counter

与正文编辑无关，可继续保留。

## 12. 构建与产物

### 12.1 依赖

建议固定到实施时验证过的版本，不使用 floating semver：

```text
@tiptap/core
@tiptap/starter-kit
@tiptap/markdown
@tiptap/extension-placeholder
@tiptap/extension-link
@tiptap/extension-image
esbuild
```

Table、footnote 等在对应功能实现时再加入，避免 MVP schema 过大。

提交 package lock，确保 CI 和未来维护者得到同一 bundle。

### 12.2 build

扩展 `scripts/build.mjs` 或新增它调用的 dashboard builder：

```text
src/dashboard/sidenotes-editor/index.ts
        ↓ esbuild
dist/dashboard/sidenotes-editor.js

src/dashboard/sidenotes-editor/editor.css
        ↓ normalize/minify
dist/dashboard/sidenotes-editor.css
```

公开站点现有三个 bundle 不导入 Dashboard 代码。

### 12.3 snippet

生成：

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@vX.Y.Z/dist/dashboard/sidenotes-editor.css"
  integrity="sha384-..."
  crossorigin="anonymous"
>
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/Cococolins/sidenotes-blog-assets@vX.Y.Z/dist/dashboard/sidenotes-editor.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

要求：

- Dashboard 生产 snippet 使用固定 tag 或 commit；
- 不使用 `@latest`；
- JS bundle 不再从第三方 CDN 动态 import 依赖；
- build 自动计算 JS 和 CSS 的 SHA-384；
- README 写清楚粘贴位置是 Account → Customise dashboard →
  Dashboard Footer content，不是公开站点 Footer Script Injection。

### 12.4 release

release 时：

1. 更新 `[Unreleased]`；
2. package version 先变更；
3. build 使用即将创建的 `vX.Y.Z` 生成 Dashboard snippet；
4. `npm run verify`；
5. JS syntax check；
6. commit；
7. tag；
8. push；
9. 等待固定 tag 的 jsDelivr asset 可访问；
10. 核对 integrity；
11. 最后才更新 Bear Dashboard Footer。

## 13. 验证与测试

### 13.1 静态 verify

新增检查：

- [ ] Dashboard JS 和 CSS 产物存在；
- [ ] snippet 使用固定版本；
- [ ] snippet 包含 integrity；
- [ ] bundle 不包含 unresolved config placeholder；
- [ ] bundle 只启用 `colin`；
- [ ] bundle 明确排除 `sndaily` 和 `ct`；
- [ ] bundle 检查 `#body_content`；
- [ ] bundle 具有初始化失败回滚路径；
- [ ] 公开 `dist/sidenotes.js` 不包含 Tiptap；
- [ ] 公开 `dist/daily.js` 不包含 Tiptap；
- [ ] 公开 `dist/tt.js` 不包含 Tiptap。

### 13.2 DOM fixture 测试

- [ ] 非文章编辑页 no-op；
- [ ] 非目标 blog ID no-op；
- [ ] 缺 selector no-op；
- [ ] 重复初始化只 mount 一次；
- [ ] 初始化成功后才隐藏 textarea；
- [ ] 初始化失败恢复 textarea；
- [ ] Source／Visual focus 正确切换；
- [ ] editor destroy 后清理 listener 和 floating UI。

### 13.3 Markdown 测试

- [ ] safe basic Markdown parse／serialize；
- [ ] 中文标点和中英混排；
- [ ] nested list；
- [ ] code fence 和 language；
- [ ] image alt text；
- [ ] 未编辑 byte-stability；
- [ ] HTML 自动降级；
- [ ] Bear directive 自动降级；
- [ ] footnote 自动降级；
- [ ] LaTeX 自动降级；
- [ ] `tab:` link 自动降级；
- [ ] unknown fence 自动降级；
- [ ] parse exception 不修改 textarea。

### 13.4 Bear workflow 测试

- [ ] Visual 编辑更新 textarea；
- [ ] Source 编辑更新 Visual 或维持安全降级；
- [ ] Bear autosave 接收到 `input`；
- [ ] Bear restore 更新 editor；
- [ ] version history restore 更新 editor；
- [ ] Preview 使用最新正文；
- [ ] Save as draft 使用最新正文；
- [ ] Publish 使用最新正文；
- [ ] Unpublish 使用最新正文；
- [ ] `Cmd/Ctrl + S` 使用最新正文；
- [ ] back button 和 beforeunload 行为不被破坏。

### 13.5 输入和可访问性

- [ ] macOS 中文拼音输入法；
- [ ] iPhone 中文拼音九宫格／全键盘输入；
- [ ] iPad 中文拼音和实体键盘输入；
- [ ] composition 尚未结束时不错误同步；
- [ ] emoji；
- [ ] 长按和移动端选区；
- [ ] iOS copy／paste 系统菜单；
- [ ] 虚拟键盘打开、关闭和重复打开；
- [ ] Safari 地址栏展开／收起；
- [ ] iPhone portrait／landscape 旋转；
- [ ] iPad Split View；
- [ ] 工具条不会盖住当前段落；
- [ ] `16px` 字号下聚焦不触发页面自动缩放；
- [ ] Photo Library 选择单图和多图；
- [ ] 取消文件选择不会插入空图片；
- [ ] Safari 页面重新载入后的草稿恢复；
- [ ] keyboard-only toolbar；
- [ ] screen reader label；
- [ ] reduced motion；
- [ ] 20000 字长文；
- [ ] 100 张图片的既有文章至少可以安全进入 Source mode。

## 14. 灰度方案

### 14.1 开发开关

支持：

```text
?sn-editor=1
?sn-editor=0
```

行为：

- `?sn-editor=1` 写入本地 pilot flag，并在当前页启用；
- `?sn-editor=0` 清除 flag，恢复 Bear 原生编辑器；
- pilot 期间无 flag 默认 no-op；
- 正式发布后可改为 `colin` 默认启用，但仍保留 `?sn-editor=0`。

### 14.2 Canary 顺序

1. 新建空白 draft；
2. 纯文本中文文章；
3. headings／links／lists；
4. code block；
5. 单张图片；
6. 多张图片；
7. 既有长文但不修改，验证 byte-stability；
8. 含 footnote／HTML／LaTeX 的既有文，验证 Source mode；
9. iPhone／iPad；
10. 正常日常使用至少一周后再默认开启。

首轮禁止直接用公开文章做 Publish 测试，只使用未发布 draft。

## 15. 回滚方案

按速度排序：

1. 当前 URL 加 `?sn-editor=0`；
2. 从 Dashboard Footer 删除 Sidenotes editor snippet；
3. 恢复备份的 `Archive/Custom Dashboard Script V0.txt`；
4. 将 snippet 固定回上一个可用 tag；
5. textarea 始终保留，因此不需要迁移内容格式。

Dashboard Footer 更新前必须把当前线上内容完整备份到本地 Archive，并记录日期。

不要删除历史 Archive 版本。

## 16. 分阶段执行清单

### Phase 0：线上契约确认

- [x] 登录 Bear；
- [ ] 完成第 3.1 节 DOM 检查；
- [x] 备份 Dashboard styles 和 footer；
- [x] 列出现有第三方插件；
- [x] 选定测试 draft；
- [x] 记录实际 blog IDs；
- [ ] 将确认结果补充到本文。

完成标准：所有 selector、路径、upload endpoint 和响应结构都有实际证据。

### Phase 1：构建骨架与原生回退

- [x] 添加 Tiptap 和 esbuild；
- [x] 创建 Dashboard build target；
- [x] 创建路径和 DOM guard；
- [x] 注入 scoped CSS；
- [x] 创建 editor shell；
- [x] 初始化失败恢复；
- [x] 创建 Visual／Source 切换；
- [x] 生成固定版本 snippet；
- [x] 添加 verify。

完成标准：可以在 fixture 上挂载和关闭编辑器，任何失败都能恢复 textarea。

### Phase 2：基础 Markdown 与同步

- [x] 配置 MVP schema；
- [x] parse 初始 Markdown；
- [x] 实现 dirty state；
- [x] 实现 Visual → textarea；
- [x] 实现 textarea → Visual；
- [x] 接入 submit capture；
- [x] 接入 preview capture；
- [x] 接入 `Cmd/Ctrl + S`；
- [x] 接入 Bear restore；
- [ ] 验证 version history。

完成标准：基础 Markdown 可以安全编辑，未修改正文保持字节不变。

### Phase 3：兼容 gate

- [x] 静态 syntax scan；
- [x] clone round-trip；
- [x] 明确降级原因；
- [x] Source mode warning；
- [x] 为所有不支持 syntax 添加 fixture；
- [x] 防止 unsafe document 切回 Visual。

完成标准：已知 Bear 扩展语法不会被静默丢失。

### Phase 4：Jant 式交互

- [ ] selection bubble menu；
- [ ] link popover；
- [x] keyboard shortcuts；
- [ ] slash command 的最小集合；
- [x] full-screen；
- [x] mobile toolbar；
- [x] Visual Viewport 监听和异常 fallback；
- [x] iOS composition guard；
- [x] iPhone 使用常驻工具条而非 selection bubble menu；
- [x] safe-area spacing；
- [x] status／word count；
- [x] reduced motion。

完成标准：交互达到可日常写作水平，但不改变 persistence contract。

### Phase 5：图片上传

- [ ] Bear upload adapter；
- [ ] CSRF；
- [ ] paste；
- [ ] drag and drop；
- [ ] placeholder；
- [ ] error retry；
- [ ] alt text；
- [ ] Markdown serialization；
- [ ] preview／draft／publish 验证。

完成标准：图片上传不依赖 textarea selectionStart，且输出 Bear 可渲染 Markdown。

### Phase 6：灰度与发布

- [x] `?sn-editor=1` pilot；
- [ ] 固定 commit CDN；
- [ ] SRI；
- [ ] 测试 draft；
- [ ] 桌面端；
- [ ] 移动端；
- [ ] 一周试用；
- [ ] 更新 changelog；
- [ ] `npm run verify`；
- [ ] 正式 tag；
- [ ] Dashboard Footer 切换至固定 tag。

完成标准：主站稳定使用，其他 Bear blogs 和公开网站未受到影响。

## 17. 总体验收标准

只有同时满足以下条件，才算完成：

1. Sidenotes 新文章可以使用 Visual mode 完成写作、预览、存草稿和发布。
2. 原 textarea 中始终存在最终提交的完整 Markdown。
3. 打开但不修改文章不会改写正文。
4. 不支持的 Bear syntax 不会丢失。
5. 编辑器失败不阻塞 Bear 原生编辑。
6. 图片上传正常。
7. 中文输入法正常。
8. `sndaily` 和 `ct` 无变化。
9. 公开站点 bundle 无 Tiptap。
10. Dashboard 生产资源使用固定版本和 integrity。
11. 有一键停用和可验证的回滚路径。
12. `CHANGELOG.md`、build、verify 和维护文档同步更新。
13. iPhone Safari 可以完成写作、预览、存草稿、选图和发布。
14. iPad Safari 的触摸与实体键盘工作流都可用。
15. 中文 composition、虚拟键盘和屏幕旋转不会造成内容丢失或选区跳跃。

## 18. 调研来源

### Jant

- Repository：
  <https://github.com/jant-me/jant>
- Compose editor：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/components/jant-compose-editor.ts>
- Tiptap factory：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/tiptap/create-editor.ts>
- Extensions：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/tiptap/extensions.ts>
- Markdown manager：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/lib/markdown-manager.ts>
- Authenticated client：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client-auth.ts>
- License：
  <https://github.com/jant-me/jant/blob/main/LICENSE>

### Bear Blog

- Repository：
  <https://github.com/HermanMartinus/bearblog>
- Post editor template：
  <https://github.com/HermanMartinus/bearblog/blob/3f83a56a09f512d59b6240a4b8399d33a3b2c8ad/templates/studio/post_edit.html>
- Native editor functions：
  <https://github.com/HermanMartinus/bearblog/blob/3f83a56a09f512d59b6240a4b8399d33a3b2c8ad/templates/snippets/editor_functions.html>
- Dashboard customisation：
  <https://github.com/HermanMartinus/bearblog/blob/3f83a56a09f512d59b6240a4b8399d33a3b2c8ad/templates/dashboard/dashboard_customisation.html>
- URL routes：
  <https://github.com/HermanMartinus/bearblog/blob/3f83a56a09f512d59b6240a4b8399d33a3b2c8ad/blogs/urls.py>
- Dashboard styling docs：
  <https://docs.bearblog.dev/neat-bear-features/#dashboard-styling>
- Markdown cheatsheet：
  <https://herman.bearblog.dev/markdown-cheatsheet/>

### iOS／WebKit

- WebKit Visual Viewport API：
  <https://webkit.org/blog/9674/new-webkit-features-in-safari-13/>
- WebKit Input Events：
  <https://webkit.org/blog/7358/enhanced-editing-with-input-events/>
- Apple Safari viewport documentation：
  <https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html>
- iOS 26 virtual viewport keyboard report：
  <https://developer.apple.com/forums/thread/800125>

### Dependencies and related Bear editors

- Tiptap MIT License：
  <https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md>
- Markdown Power-Editor for Bear Blog：
  <https://fischr.org/markdown-power-editor-for-bear-blog/>
- Plugin repository：
  <https://github.com/flschr/bearblog-plugins>

## 19. 实施记录

后续每个实施批次在这里追加：

```text
日期：
阶段：
改动：
验证：
未解决问题：
下一步：
```

不要重写已经完成的记录；如需推翻决策，在新记录中解释原因。

### 2026-07-25：本地 pilot 骨架

阶段：Phase 0 部分确认，Phase 1 完成，Phase 2／3／4 核心能力完成。

改动：

- 固定 Tiptap `3.29.0` 和 esbuild `0.28.1`，提交 package lock；
- 新增独立 Dashboard build target、固定版本 SRI snippet 和 verify；
- 实现 `colin` 路径 guard、`?sn-editor=1/0`、Visual／Markdown、
  textarea 双向同步、提交 capture、Source fallback；
- 实现桌面和触控工具条、全屏、composition guard、Visual Viewport hint、
  safe-area、`16px` iOS 输入字号和 reduced motion；
- 新增浏览器 DOM fixture 和 Markdown fixtures；
- 根据登录态 Bear 新建文章页的只读检查，挂载时暂停
  `#sn-md-toolbar` 与 `.markdown_line_fixer`。

验证：

- Node Dashboard tests：5／5 通过；
- 浏览器 fixture：Visual 挂载、Visual → textarea、Markdown 模式、
  Bear directive 自动降级、`?sn-editor=0` 原生回退均通过；
- 同一 fixture 在原生与挂载状态均为 146 字符且内容逐字相等；
- `390 × 844` 视口无页面横向溢出，正文为 `16px`，toolbar 横向滚动；
- 线上 Bear 只读确认 `colin`、新建路径、核心 DOM、CSRF input 和现有插件。

未解决问题：

- 尚未验证现有文章、version history 和非空初始 Markdown；
- 图片 upload response 未做线上请求验证，因此 adapter 未实现；
- selection bubble menu、link popover 和 slash command 未实现；
- 尚未 release、push 或修改 Bear Dashboard。

下一步：

1. 补全现有文章和 version history 的只读契约；
2. 为其余不支持语法添加 fixtures；
3. 实现图片 upload adapter；
4. 只对未发布 draft 进行固定 commit CDN canary。
