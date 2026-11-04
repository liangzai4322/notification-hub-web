# Notification Hub Web

## 2026-11-04 待处理排序

- 正式页面为 `https://liangzai4322.github.io/notification-hub-web/`，源文件为 `docs/index.html`，API 为 `https://liangzai666.com/notify/api`。
- 普通列表、展开列表和分类列表统一将 `bugFix.status=pending_approval` 或 `event.status=open` 的通知置顶，同组按 `createdAt` 从新到旧。已同意、已确认和无需确认的通知排在后面。
- 首页默认只请求 8 条，必须请求 `GET /v1/events?limit=8&order=attention`，让服务端先排序再截断。仅对最新 8 条做前端排序会遗漏更早的待处理通知；不要改成每次刷新全量加载 500 条。
- 来源分类中待处理卡片先显示，其他记录仍按时间折叠，避免时间分组把待处理项压到已处理项下面。
- 点同意或确认成功后重新加载并滚动到列表开头；实时刷新本身不强制滚动。回收站不使用待处理优先。
- 后端代码位于 `/opt/notification-hub`，其全局调用默认仍按时间倒序；只有显式 `order=attention` 的列表请求使用新排序，不更改审批或发送状态。
- 所有交互验证使用隔离假数据，不点击或同意真实生产工单。
