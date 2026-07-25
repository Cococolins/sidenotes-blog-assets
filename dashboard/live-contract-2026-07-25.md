# Bear Dashboard 线上契约核对：2026-07-25

本记录来自登录态 Bear 新建文章页的只读检查。检查过程中没有输入正文、提交
表单、上传文件或修改 Dashboard 设置。

## 已确认

| 项目 | 线上结果 |
| --- | --- |
| Blog ID | `colin` |
| 新建文章路径 | `/colin/dashboard/posts/new/` |
| Form | 唯一的 `form.post-form`，`method="post"` |
| Form action | `/colin/dashboard/posts/new/` |
| Header | 唯一的 `#header_content[contenteditable="true"]` |
| Hidden header | `#hidden_header_content[name="header_content"]` |
| Body | 唯一的 `textarea#body_content[name="body_content"]` |
| Body placeholder | `...` |
| CSRF | form 内存在 `input[name="csrfmiddlewaretoken"]`；未读取或记录值 |
| Upload implementation | 当前 inline script 包含 `/dashboard/upload-image/` |
| Script delivery | 当前 Dashboard 自定义代码均为 inline，没有外部 script `src` |
| 同账户 blog IDs | `colin`、`ct`、`sndaily`、`hom`；pilot 只允许 `colin` |

## 与旧 Archive 的差异

线上 Dashboard 已经有一套新的 header attributes UI 和 Markdown toolbar，
不能把 `Archive/Custom Dashboard Script V0.txt` 当作当前线上内容的完整备份。

实际观察到：

- 原始 `#header_content` 使用 `editable sn-hidden` class，页面另有
  「Attributes」字段化编辑 UI；
- 当前 Markdown toolbar 是 `#sn-md-toolbar[role="toolbar"]`，共有 16 个
  按钮，包括 heading、bold、italic、link、image、code、quote、list、
  checklist、horizontal rule、undo／redo 和 snippets；
- 当前仍有 `.markdown_line_fixer`，按钮文字是「Fix new lines」；
- 当前新建文章页没有 `#restore-draft`，但实现仍保留 delegated guard，以兼容
  Bear 在有草稿时动态显示恢复控件的情况。

## 已据此调整的实现

Sidenotes pilot 挂载时会暂时隐藏：

```text
#sn-md-toolbar
.markdown-toolbar
.markdown_line_fixer
```

编辑器初始化失败、调用 `destroy()` 或使用原生回退后，会恢复这些控件原来的
`hidden` 与 `aria-hidden` 状态。Attributes UI 不隐藏，标题与 Bear header
数据流不由正文编辑器接管。

首次线上挂载还确认了一个执行时序：旧 Dashboard 脚本可能在 pilot 已挂载后
才插入 `#sn-md-toolbar` 和 `.markdown_line_fixer`；其中旧 toolbar 会跟随已经
移动的 textarea，被插入到新 editor shell 内。因此实现不能只在初始化时扫描
一次，也不能排除 shell 内的旧 selector。当前使用仅监听新增节点的
`MutationObserver`，立即挂起迟到的冲突控件，并在 rollback 时断开 observer、
恢复其原始状态。

## 仍待上线前确认

- upload endpoint 的实际完整 URL、单图与多图响应结构；
- 上传失败时的状态码和错误 payload；
- 选定一篇未发布测试 draft；
- 当前 inline toolbar 的键盘 listener 是否需要在 Visual 模式进一步隔离；
- version history 在编辑现有文章页的实际 DOM 位置与恢复行为。

在这些项目完成前，不发布图片上传 adapter。固定 commit snippet 已于
2026-07-25 作为 `?sn-editor=1` canary 追加到线上 Dashboard Footer。

## 既有未发布 draft

已只读确认一篇非空测试 draft：

- 编辑路径符合 `/colin/dashboard/posts/<20-character-id>/`；
- textarea 直接包含原始 Markdown，包括标准图片与 raw HTML；
- Version history 存在并显示可恢复版本；
- 旧 toolbar 和 line fixer 均存在；
- 没有修改、恢复、保存或发布。

由于正文包含 raw HTML，该 draft 应作为 Source fallback 与 byte stability
canary，不应用于 Visual mode 写作。具体路径与正文哈希只记录在本地忽略的
Archive 基线中，不进入公开仓库。

## 实施前备份

当前 Dashboard Styles 和 Dashboard Footer 已完整保存到：

```text
Archive/dashboard-backups/2026-07-25-pre-sidenotes-editor/
```

备份后再次读取线上字段，内容与 SHA-256 均保持一致，未触发「Save」。回退步骤、
文件长度与完整校验值见该目录的 `README.md`。
