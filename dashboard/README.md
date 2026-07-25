# Sidenotes Dashboard

这个目录用于维护 Bear Blog 后台的 Sidenotes 专属增强功能。它与公开站点
`src/` → `dist/` 的主题资产暂时分开，避免尚未验证的编辑器代码进入现有
三站构建和发布链路。

当前状态：本地 pilot 已实现，尚未发布或写入 Bear Dashboard。

## 文档

- [Jant 编辑器接入计划](./editor-integration-plan.md)：技术决策、执行阶段、
  文件结构、兼容策略、测试矩阵、灰度和回滚方案。
- [2026-07-25 线上契约核对](./live-contract-2026-07-25.md)：实际 Bear
  编辑页的 DOM、现有插件冲突和仍待确认的上线条件。

## 已实现

- 独立的 Tiptap `3.29.0` Dashboard bundle，不进入三个公开站点 bundle；
- Visual／Markdown 模式和即时 textarea 同步；
- Bear 扩展语法静态扫描与 Markdown 结构 round-trip gate；
- `?sn-editor=1` pilot 和 `?sn-editor=0` 原生回退；
- submit、Preview、`Cmd/Ctrl + S` 和 draft restore 同步；
- iOS composition guard、`16px` 输入、触控工具条、safe-area 和
  Visual Viewport hint；
- 固定版本与 SHA-384 的 Dashboard Footer snippet；
- 本地 fixture、Markdown fixture 和自动测试。

当前暂未实现图片上传 adapter、selection bubble menu、slash command，以及线上
灰度。现有文章中的标准 Markdown 图片可以正常显示和 round-trip。

## 本地命令

```bash
npm run build:dashboard
npm run test:dashboard
npm run verify
```

生成指向完整 canary commit 的片段：

```bash
DASHBOARD_CDN_VERSION=<40-character-commit-sha> npm run build:dashboard
```

`DASHBOARD_VERSION` 控制 bundle banner；`DASHBOARD_CDN_VERSION` 只控制 snippet
引用的固定 CDN revision。二者分开是为了让第二个提交能够引用第一个、内容已
冻结的 asset commit，避免 commit hash 自引用。

浏览器 fixture：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/dashboard/fixtures/bear-post-editor.html?sn-editor=1
```

普通本地 build 生成的 `dist/snippets/sidenotes-dashboard-footer.html` 会引用
现有 package version。只有显式传入已经存在的完整 commit SHA，或者创建了
包含 Dashboard assets 的新 tag 后，才可以把 snippet 粘贴到 Bear。

## 当前边界

- 第一阶段只增强 Bear 后台的 Sidenotes 主站编辑页。
- Bear blog ID 和新建文章路径已经在 2026-07-25 的登录态后台只读确认：
  `colin` 与 `/colin/dashboard/posts/new/`。
- `sndaily`、`ct` 和同账户下的 `hom` 显式不启用。
- iPhone 和 iPad Safari 从 MVP 开始就是正式支持目标，不作为桌面版完成后的
  补充适配。
- Bear 原生 `textarea#body_content` 始终是正文的唯一提交数据源。
- 编辑器加载失败时必须保留 Bear 原生编辑体验。
- 未完成灰度前，不修改公开站点的主题源码、Bear Header/Footer Directives 或
  Customise Dashboard 中的线上内容。Dashboard 专属 `src/` 与 `dist/`
  保持独立。
