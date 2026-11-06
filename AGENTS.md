# Notification Hub Web 项目约定

- 修改前阅读 [HANDOFF.MD](HANDOFF.MD)，核对 `main` 与当前 Pages 源码。应用入口是 `docs/index.html`，`docs/android/` 和客户端 ZIP 有独立用途。
- 普通通知列表使用 `GET /v1/events?limit=8&order=attention`。排序必须先于后端截断。筛选或展开时使用原有 500 条上限，回收站使用 `/v1/trash`。
- 使用 `loadHistory()` 更新列表。手动刷新只更新当前视图，复用已有错误处理。保留筛选、展开状态、回收站和实时连接。批准或确认成功后沿用回到列表顶部的行为。
- 使用隔离数据验证审批交互。检查窄屏工具栏、重复点击和请求失败后的恢复。发布确认以 Pages 完成构建并返回预期源码为准。
