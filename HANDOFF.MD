# 通知中枢网页交接

## 2026-11-04 列表排序和页内刷新

- `needsAttention()` 把 `event.status === 'open'` 或 `bugFix.status === 'pending_approval'` 的记录归为待处理。各组按 `createdAt` 倒序。来源分类把待处理卡片放在时间折叠组之前，回收站独立读取。
- 首页请求 `GET /v1/events?limit=8&order=attention`。后端在 `LIMIT` 前排序，较早的待处理项才不会被 8 条上限挡掉。展开和筛选仍读取至多 500 条，再由页面筛选。
- `#refreshHistory` 调用 `loadHistory()`。请求期间禁用按钮并显示「刷新中…」，成功或失败后恢复。手动刷新保留当前视图，审批或确认成功才滚动到列表顶部。

## 发布与复核

- [README](README.md) 有页面入口和回归命令。[后端 API 说明](https://github.com/liangzai4322/notification-hub/blob/main/docs/api.md) 记录 `order=attention` 的调用约定。调整排序契约时先验证 API，再发布页面。
- 2026-11-04 的排序提交为 `deeaf2ae8e4a68b8b0123b2022975bd83a7c7e21`，刷新提交为 `dc75265b56df19f28d5101ea5b4a7de8d8c6e82b`。回归覆盖桌面、390px 移动端、请求失败后重试及视图保留。
- GitHub 提交完成后，Pages 构建期间仍可能返回旧页面。等目标构建完成，再比对线上页面与预期 `docs/index.html`。刷新已打开的旧页面一次，即可载入新版按钮。
