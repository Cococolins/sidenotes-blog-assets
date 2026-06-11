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

## 常用命令

```bash
npm run build
npm run verify
npm run diff:archive -- css 20 34
npm run diff:archive -- footer 17 20
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
