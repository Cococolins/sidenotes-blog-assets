# Sidenotes Composer

这个目录保存 Sidenotes 在 Bear Blog Dashboard 内重做发布体验的研究、产品计划
和线上契约。

当前方向不是给 Bear 换一个 Visual Markdown editor，而是实现一套受 Jant 启发
的 Composer：

- Note／Link／Quote 三种轻量写作入口；
- 标题按需出现；
- `/` 在光标处加入链接、图片、Embed 和正文结构；
- 写作完成后再处理组织和发布选项；
- 继续使用 Bear 的 draft、preview、publish、版本记录和 textarea 作为持久化
  与失败回退；
- 保留 Sidenotes 自己的视觉语言，不复制 Jant 的外观。

## 当前文档

- [Writing experience 审计](./jant-writing-experience-audit.md)：Jant 的产品
  判断，以及 Bear 内可忠实实现与不可实现的边界。
- [Composer 实施计划](./composer-implementation-plan.md)：约 70% Jant 写作体验
  的分阶段实现范围与验收标准。
- [Jant 媒体存储审计](./jant-media-storage-audit.md)：R2、上传会话、浏览器端
  转码、媒体 metadata、备份与 iOS 限制。
- [Visual editor pilot 复盘](./visual-editor-pilot-retrospective.md)：被撤回方案的
  原因、保留下来的工程经验和线上处置记录。
- [Bear 线上契约](./live-contract-2026-07-25.md)：登录态 Dashboard DOM、
  当前自定义增强及 Bear 图片上传接口。

## 当前线上状态

2026-07-25，Visual Markdown editor canary 已从 Bear 账户级 Dashboard Footer
撤下。撤回后重新载入设置页确认：

- pilot 注释、固定 commit 与 CDN CSS／JS 均不存在；
- 原有 Dashboard Header 表单、Markdown toolbar、版本历史和移动端增强仍在；
- 没有修改、发布或删除任何文章。

实施前的完整线上备份继续保存在本地忽略的：

```text
Archive/dashboard-backups/2026-07-25-pre-sidenotes-editor/
```
