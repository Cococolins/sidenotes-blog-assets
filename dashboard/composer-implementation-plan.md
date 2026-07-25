# Sidenotes Composer：70% Jant 写作体验实施计划

状态：产品范围已确认，准备进入交互原型
目标平台：Bear Blog Dashboard，首轮只启用 `colin`
移动平台：iPhone 与 iPad 从第一阶段起纳入验收

## 1. 目标

在不替换 Bear 后端的前提下，实现 Jant Writing experience 中最重要、且能够
忠实落地的部分：

```text
写下一条东西
  → Note / Link / Quote
  → 用 / 加入内容和结构
  → 需要时再加标题与来源
  → 一次 Publish
```

Bear 继续负责：

- post 持久化；
- draft、preview、publish 和版本历史；
- Header attributes；
- 图片上传；
- 原生 Markdown textarea 回退。

## 2. 第一阶段产品范围

### 2.1 写作入口

- 在 Bear 新建／编辑 post 页面创建全屏 Composer；
- 默认显示正文和一句低压力 placeholder；
- Note／Link／Quote 是顶层 mode；
- 默认 mode 为 Note；
- Title 默认隐藏，需要时再展开；
- 原有 Attributes 收入次级设置，不占据首屏。

### 2.2 三种格式

#### Note

- 正文必需；
- Title 可选；
- 无标题时保留 Bear 所需的最小 header 约定；
- 公开页面按 Note 样式渲染。

#### Link

- URL 和标题必需；
- Thoughts 可选；
- 提交时写入明确的 Bear header metadata；
- 公开页面以外链卡片／标题加评论的形式渲染。

#### Quote

- Quote text 必需；
- Author、source name、source URL 与 thoughts 可选；
- 提交时生成可回退的 Markdown blockquote，同时保留结构化 metadata；
- 公开页面按 Quote 样式渲染。

格式切换不得静默丢字段。目标格式无法表达的内容必须折回正文或阻止切换并明确
说明。

### 2.3 `/` command menu

首版包括：

- Link；
- Image；
- Embed；
- Divider；
- Read More；
- Footnote；
- Code Block；
- Blockquote；
- Bullet List；
- Ordered List；
- H1／H2／H3。

命令必须在当前光标处执行，并支持键盘筛选、方向键、Enter 与 Escape。

### 2.4 媒体

第一阶段：

- 复用 Bear 图片上传 endpoint；
- 支持图片选择、粘贴、拖放、进度、错误与 alt text；
- 支持 YouTube、Vimeo、Spotify 等外部 URL Embed；
- 不承诺本地视频／音频上传。

第二阶段单独接入 R2，见 `jant-media-storage-audit.md`。

### 2.5 发布

- 主操作只有 Publish；
- Save draft 与 Preview 保持可访问但弱化；
- 写作过程中自动保存本地草稿；
- 提交前同步 Bear header 和 `textarea#body_content`；
- Bear 拒绝提交时保留用户内容与 Composer 状态；
- 不在第一阶段伪造 Latest／Featured／RSS 分离。

## 3. 明确降级

第一阶段不做：

- 多 post 原子 Thread；
- 本地视频、音频或 PDF 上传；
- Featured-only RSS；
- 完整 Collection 数据模型；
- Rating；
- 任意 HTML 的 Visual round-trip；
- 将旧文章批量迁移成新格式。

Thread 的 UI 可以进入原型，但在后端方案确定前不进入可发布实现。

## 4. 视觉原则

- 只使用现有 Sidenotes 的亮色设计语言；
- 复用公开站点的纸张色、绿色、正文字体、标题字体和空间比例；
- 不出现通用 SaaS editor 的边框卡片与大工具栏；
- controls 在没有使用时退到背景；
- 移动端优先保证正文、当前选区和主操作不被键盘遮挡。

## 5. 技术边界

- `#body_content` 始终存在，且包含最终可提交 Markdown；
- `#header_content` 与 hidden header 的 Bear 契约不改变；
- Composer 初始化失败时恢复原生界面；
- 只在 `colin` 的 post 编辑路径挂载；
- `ct`、`sndaily`、`hom` 显式 no-op；
- 不把 Dashboard 依赖打入公开三站 bundle；
- 源码与生成文件分离，`dist/` 只由 build 产生。

## 6. iOS 验收

- 输入字号至少 16px，避免 Safari 自动缩放；
- 使用 `100dvh` 与 `visualViewport` 处理软键盘；
- 支持 safe-area；
- composition 期间不重建正文；
- 图片选择与粘贴失败后正文不丢失；
- 页面切后台、锁屏和 Safari reload 后可恢复本地草稿；
- iPhone 竖屏、横屏与 iPad 分屏分别验证；
- 触控目标至少 44×44 CSS px。

## 7. 分阶段执行

### Phase 0：交互原型

- 画出 Note、Link、Quote 三个 compose 状态；
- 画出 `/` menu；
- 画出 Publish、Save draft 与 Preview 的层级；
- 用 Sidenotes 真实字体与色彩；
- 在桌面和 iPhone 尺寸各验证一次。

完成标准：不看说明也能理解它是「快速发布」，而不是新的 Markdown editor。

### Phase 1：Bear adapter 与无标题 Note

- 路径和 DOM guard；
- header parser／serializer；
- textarea 同步；
- 本地草稿；
- native fallback；
- Note compose；
- 可选 Title；
- Bear draft／preview／publish。

### Phase 2：Link／Quote 与公开 renderer

- 两种 compose mode；
- 无损格式切换；
- metadata 约定；
- 公开站点三种格式 renderer；
- 旧文章 fallback。

### Phase 3：slash menu 与图片

- slash command controller；
- Link／结构命令；
- Bear 图片 adapter；
- paste／drop／progress／retry／alt；
- 外部 Embed。

### Phase 4：iOS 与 canary

- IME、Visual Viewport、safe area、draft restore；
- 未发布测试 draft；
- 固定 commit CDN 与 SRI；
- `?sn-composer=1`／`?sn-composer=0`；
- 桌面、iPhone、iPad 实机验证；
- 一周 canary 后再决定默认开启。

## 8. 总体验收

只有同时满足以下条件才进入默认启用：

1. 新建 Note 不需要先填标题；
2. Link／Quote 的字段与公开呈现一致；
3. `/` 可以完成首版所有内容动作；
4. 图片上传、草稿、Preview 和 Publish 通过；
5. iPhone 中文输入与恢复通过；
6. 原生 Bear 回退始终可用；
7. 旧文章没有静默改写；
8. `ct`、`sndaily`、`hom` 与公开三站性能不受影响。
