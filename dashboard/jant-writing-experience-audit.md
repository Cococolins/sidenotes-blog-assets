# Jant Writing Experience 审计与 Sidenotes 方向重置

状态：产品方向审计完成，等待确认新的实施边界
审计日期：2026-07-25
Jant 源码基线：`680e579ad7a161b8af8120d6238b3193aff4236e`

## 1. 方向修正

此前方案把问题理解成：

> 如何在 Bear 的 Markdown textarea 上增加一个 Visual editor。

这个理解不成立。它保住了 Markdown 往返和 Bear 提交安全，却删掉了 Jant
真正重要的部分：如何让一条想法尽快获得一种可发布的形状。

Jant 的 Writing experience 不是一套新的富文本工具栏，而是一组连续的产品
决定：

1. 入口不是「新建文章表单」，而是「What’s on your mind?」；
2. 标题默认不存在，需要时再显露；
3. Note、Link、Quote 是三种第一等的表达意图，不是文章分类；
4. `/` 菜单在光标处添加媒体与结构，不把作者赶到表单边栏；
5. 一篇短帖可以在写完后延展成 Thread；
6. Collection、Rating 和附件都在正文之后出现，不抢占最初的写作动作；
7. Publish 是一个动作，是否进入 Latest、RSS 或仅凭链接访问是另一个决定。

因此，Sidenotes 下一版不应叫「编辑器」，而应暂称
**Sidenotes Composer**：一个以发布为中心、以 Bear 为持久化适配器的写作层。

## 2. Jant 实际上怎样降低写作压力

### 2.1 最小入口

首页只给出「What’s on your mind?」。作者也可以：

- 按 `N` 写 Note；
- 按 `L` 写 Link；
- 按 `Q` 写 Quote；
- 直接进入 `/new`；
- 在 Collection 内打开 compose，并自动带入当前 Collection。

这不是快捷键装饰，而是把「我要管理一篇文章」改成「我要放下一条东西」。

### 2.2 标题是可选能力

Note 默认只有正文。点击 `Title` 才出现标题输入框，并且可以再次关闭。
没有标题的 Note 会获得随机 slug。因此，短想法不必先假装成一篇文章。

Link 与 Quote 则按内容意图要求最少必要字段：

- Link：URL 和标题必填，自己的想法可选；
- Quote：引文必填，作者、来源链接和自己的想法可选。

这三种格式可以在写作过程中切换。Jant 的转换逻辑会把目标格式无法表达的字段
折回可见正文，而不是悄悄丢弃。产品含义是：作者可以先写，再决定它是什么。

### 2.3 `/` 是光标处的内容动作

当前 slash menu 分为：

- Media：Media、Embed；
- Structure：Divider、Read More、Footnote、Table；
- Formatting：Code Block、Blockquote、Bullet List、Ordered List；
- Headings：H1、H2、H3。

`Embed` 有一个统一的 URL 入口，支持 YouTube、Vimeo、Spotify、CodePen 和
普通 HTTPS 页面，也允许降级为普通链接；需要时才进入 raw HTML 模式。

这里有一个当前源码与界面文案的差异：

- slash menu 的 `Media` 写着「Upload an image or video」；
- 但这个光标内的 picker 当前使用 `accept="image/*"`；
- compose 底部单独的 `Media` 按钮才是多文件、`*/*` 上传入口。

因此，不能把 Jant 的 `/ Media` 直接概括成「已经统一支持图片和视频」。它的
产品模型支持多类媒体，但当前两个上传入口的能力并不完全一致。

### 2.4 Thread 是写作过程的延长，不是发布前字段

只有当前 post 已经有内容时，`Add to thread` 才可用。第一次点击会：

1. 保存当前 editor 的正文、光标、标题、格式、附件与 rating；
2. 把它变成 Thread 的第一条；
3. 在下方增加第二个完整的 Note／Link／Quote editor；
4. 后续每一条都可以单独选择格式；
5. 整条 Thread 作为一组提交，并等待其中的附件上传完成。

Thread 草稿也作为一组自动保存在 localStorage，并能恢复。它不是简单地在正文
底部插入分隔线，而是多个独立 post 之间的有序关系。

### 2.5 发布与广播分离

Jant 的 visibility 包括：

- Public：出现在 Latest；
- Hidden from Latest：公开但不推入 Latest；
- Private；
- Draft。

Featured 又是独立维度；默认 RSS 只包含 Featured。这个选择对应 Jant 的核心
立场：发布不必自动等于打扰读者。

## 3. 对 Sidenotes 的含义

真正值得接入的不是 Jant 的外观，而是这条动作链：

```text
想到一件事
  → 选择 Note / Link / Quote，或直接开始写
  → 用 / 在光标处加入内容与结构
  → 需要时再加标题、媒体、来源、rating
  → 写完后决定是否延展成 Thread / 收入 Collection
  → 一次 Publish
  → 另行决定是否进入 Latest / Featured / RSS
```

视觉上也不应复制 Jant。Sidenotes Composer 应继续使用现有 Sidenotes 的字体、
纸张色、绿色、间距和文章气质；Jant 只提供信息架构与交互参照。

## 4. Bear 内能够忠实实现的部分

当前已确认的 Bear Dashboard 契约仍然有价值：

- `#header_content` / `header_content`；
- `textarea#body_content` / `body_content`；
- Bear 原生 draft、preview、publish 和版本记录；
- 当前图片上传脚本与 CSRF；
- Dashboard Styles 与 Footer Script Injection。

在不更换 Bear 后端的前提下，可以实现：

1. 一个占据主要视野的 Sidenotes Composer，而不是 Visual／Markdown tab；
2. Note 默认无标题，按需展开 Bear header 的 `title`；
3. Link／Quote 的轻量 compose 状态，提交前序列化为约定的 Bear header 和
   Markdown；
4. 光标处的 `/` command menu；
5. 图片上传、粘贴和拖放，继续调用 Bear 当前的图片 endpoint；
6. YouTube、Vimeo、Spotify 等以 URL／embed Markdown 或 HTML 写入；
7. 自动保存到本地，同时始终把可提交正文同步回 Bear textarea；
8. iPhone／iPad 的全屏 compose、safe-area、Visual Viewport 与中文输入法保护；
9. 原生 textarea 作为失败回退，不作为日常主界面。

这大约能覆盖 Jant 「开始写」和「在正文中生长」的部分。

## 5. 单靠 Dashboard CSS / JS 不能忠实实现的部分

### 5.1 真正的 Thread

Bear 当前只有一次表单提交对应一篇 post 的契约。Jant Thread 是多个独立 post
及其顺序、回复和根节点关系。仅在 textarea 中插分隔线只能做出 Thread 的视觉
近似，不能得到 Jant 的内容模型。

可选的 Bear 兼容降级是：

- 将 Thread 序列化为一篇文章内的多个 section；或
- 分多次创建 Bear draft，再用自定义 metadata 维护关系。

后者需要验证 Bear 是否存在稳定、可授权调用的建帖接口；也不能保证原子发布。

### 5.2 视频、音频与通用附件

目前线上核对只确认了 Bear Dashboard 的图片上传实现
`/dashboard/upload-image/`，尚无证据证明它可接收视频、音频或文档。

因此：

- 外部视频可以先做 URL embed；
- 本地 MP4／音频／PDF 上传需要独立媒体存储或新的后端服务；
- 在存储方案确定前，界面不能虚假承诺「上传视频」。

### 5.3 Publish / Latest / Featured / RSS 分离

Dashboard JS 可以写入自定义 metadata，公开主题 JS 也可以在页面上隐藏或重排
post；但 Bear 的原生 RSS 由服务端生成。只靠 Dashboard 和公开站点脚本，不能
保证复制 Jant 的「只有 Featured 进入默认 RSS」。

如果这部分是硬需求，需要：

- 自己生成并托管 RSS；或
- 迁移到能控制内容查询与 feed 的后端。

### 5.4 Collection 与一等内容格式

用 Bear tags 模拟 Collection、用 Markdown 模板模拟 Link／Quote 可以工作，
但它们仍然只是约定，不是 Bear 的一等数据结构。公开站点必须同步加入对应的
renderer，才能让这些格式不仅存在于 Dashboard，也真正改变 Sidenotes 的阅读
体验。

## 6. 建议的重构边界

### Stage A：先重做写作入口

- 撤下当前 Visual editor pilot；（已完成）
- 以现有 Sidenotes 视觉系统画出 Composer；
- 实现 Note／Link／Quote、可选标题和单动作 Publish；
- 实现 `/` 菜单的 Link、Image、Embed、Divider、Read More、Footnote、
  Code、Quote、List、Heading；
- 保留 Bear draft / preview / publish 和原生回退。

### Stage B：建立 Sidenotes 内容约定

- 为 Note／Link／Quote 定义稳定的 Bear header metadata；
- 在公开主题中加入三种对应 renderer；
- 定义外部链接、引文来源、rating 与 Collection 的语义；
- 给既有 Markdown 文章提供无迁移 fallback。

### Stage C：再决定是否跨过 Bear 的边界

- Thread 是一篇内序列，还是多个 Bear posts；
- 视频是否只 embed，还是接入对象存储；
- 是否需要自己生成 Featured-only RSS；
- 当 Bear 的限制开始主导产品时，是否把 Composer 与内容后端一起独立出来。

## 7. 现有 pilot 的处置

Tiptap pilot 已于 2026-07-25 从 Bear Dashboard Footer 撤下，相关源码、生成
资源、依赖和测试已经删除。完整原因与保留的工程经验见
`dashboard/visual-editor-pilot-retrospective.md`。

不保留旧实现作为下一阶段产品基础。Bear textarea 回退、真实页面契约、iOS
输入法、Visual Viewport 和固定 commit canary 等经验已转写进新计划，不再通过
保留错误代码来保存经验。

## 8. 研究依据

- Jant Introduction：<https://jant.me/docs>
- Writing and organizing：<https://jant.me/docs/writing-and-organizing>
- Why blog today?：<https://jant.me/docs/why-blog>
- Jant 产品页：<https://jant.me/>
- Jant 源码：<https://github.com/jant-me/jant/tree/680e579ad7a161b8af8120d6238b3193aff4236e>
- Bear 线上契约：`dashboard/live-contract-2026-07-25.md`
