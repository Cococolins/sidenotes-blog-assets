# Visual Markdown Editor Pilot 复盘

状态：已撤回并删除实现
发生日期：2026-07-25

## 1. 撤回原因

pilot 把 Jant 理解成「更好看的 Markdown 编辑器」，围绕 Tiptap、Visual／Source
切换、Markdown round-trip 和工具栏重新实现了一套编辑界面。

技术上它能够安全接管 Bear 的正文 textarea，但产品上回答了错误的问题：

- 它仍然要求作者先面对一篇传统文章；
- Title、Link、Quote、Thread、Collection 与发布层级都不在体验里；
- 图片、视频和音频仍是编辑器功能，不是表达单位；
- Visual／Markdown 切换增加了一个新的管理概念；
- 视觉上形成了一个与 Sidenotes 气质分离的通用编辑器壳。

用户实际需要的是 Jant 的发布体验：降低一条想法进入公开状态的门槛，而不是换
一个 Markdown 输入控件。

因此，继续补 slash menu、图片 adapter 或更多 Tiptap extension 只会让错误
方向变得更完整，不能把它修成正确产品。

## 2. 线上处置

撤回前，pilot 只通过下面的 account-level Dashboard Footer 资源运行：

```text
Sidenotes Dashboard Editor v0.2.37
CDN revision de184b64d2ef2e8eee569034166643459f1cc633
```

它由 `?sn-editor=1` 开启，`?sn-editor=0` 关闭，没有默认覆盖所有 Bear 用户路径。

2026-07-25 已用实施前备份完整替换线上 Dashboard Footer。保存后重新载入并
确认：

- 上述 pilot 标记、commit 和 CDN 资源均已消失；
- 旧的 Sidenotes Dashboard Enhancements 仍然存在；
- Dashboard Styles 没有修改；
- 没有操作任何 post。

备份文件与 SHA-256 记录位于本地：

```text
Archive/dashboard-backups/2026-07-25-pre-sidenotes-editor/
```

## 3. 删除范围

已删除只服务于旧方向的：

- Tiptap 与 esbuild 依赖、lockfile；
- `src/dashboard/sidenotes-editor/`；
- `dist/dashboard/` 生成资源；
- Dashboard Footer CDN snippet；
- pilot build、test 与 verify 集成；
- Bear 编辑页 fixture 与 Markdown compatibility fixtures；
- 超过 1,000 行、围绕 Visual editor 展开的旧计划。

仓库的公开站点源码、三站构建、线上备份与 Bear DOM 契约不在删除范围内。

## 4. 可以保留的工程经验

代码不保留，但以下结论继续约束新的 Composer：

1. Bear 原生 `textarea#body_content` 应继续作为最终提交数据源和失败回退；
2. Dashboard Footer 可能晚于或早于其他自定义 callback 插入控件，挂载逻辑
   不能只扫描一次；
3. submit、Preview、`Cmd/Ctrl + S`、draft restore 与版本历史都需要在真实
   Bear 页面验证；
4. 现有 Dashboard Header 表单、Markdown toolbar 和 line fixer 是共享账户级
   自定义内容，不能误伤 `ct`、`sndaily` 或 `hom`；
5. iOS 不是事后适配：`visualViewport`、safe area、16px 输入、中文 IME 与
   大文件内存上限必须从架构开始考虑；
6. 固定 commit CDN 和 SRI 的两提交发布法有效，可以继续用于未来 canary；
7. 实施前的字节级备份与只在未发布 draft 上验证仍然是正确的发布纪律。

## 5. 对下一版的约束

新的实现必须先证明：

- 首页式写作入口比现有 Bear 表单更快；
- Note 默认无标题；
- Link 和 Quote 改变的是内容形状，不是工具栏格式；
- `/` 负责在光标处加入内容；
- Publish 是唯一主要动作；
- Sidenotes 的视觉系统从第一张原型开始就成立。

在这些产品条件验证前，不重新引入 Tiptap，也不先搭建新的大型编辑器框架。
