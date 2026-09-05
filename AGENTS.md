# LifeTally 协作规则

## 当前产品基线

LifeTally 是本地优先的个人生活管理网页，稳定主页面只有日历、便利贴和壁纸库，默认进入日历。对象编辑器是内部工作流，不算第四个主页面。

事实来源按优先级为：

1. `docs/product.md`
2. `docs/architecture.md`
3. `docs/data-and-backup.md`
4. `docs/roadmap.md`

## 架构边界

- `objects` 是生活对象唯一事实来源。
- 搜索等未来可选页面不得成为 core、数据库或备份的反向依赖。
- `LifeTallyPageV0DB` 的 schema 变化必须升级版本、提供非破坏性迁移、诊断和测试。
- localStorage 只能使用 `lifetally:v0:*` 命名空间。
- 页面不得直接创建或删除 IndexedDB store。
- 回收站只允许恢复或永久删除，不允许编辑业务状态。

## 必须先确认

- 新增正式依赖或外部服务。
- 新增浏览器权限、账号、服务器、同步、遥测或 AI 服务。
- 修改持久化格式、清空数据、永久删除 store 或改变备份语义。
- 创建提交、推送远程、发布版本或改变仓库可见性。

## 文件与数据安全

- 使用 `apply_patch` 修改文本文件。
- 不提交 `dist/`、测试产物、备份、用户壁纸、密钥或真实事项。
- 不使用破坏性 Git 命令覆盖用户修改。
- 删除或迁移持久化能力前必须先证明备份和兼容路径有效。
- UI 截图只允许使用空白或虚构数据。

## 验证

程序变化后，在 `app` 目录运行：

```text
npm run typecheck
npm test
npm run build
```

依赖变化还要运行 `npm audit --audit-level=moderate`。数据变化必须补迁移、重复导入和失败路径测试。行为、权限、数据或安装方式变化时同步更新 README、相关 docs 和 CHANGELOG。

## 交付

最终说明应包含完成结果、重要文件、自动检查、人工验收、依赖/权限/数据影响和遗留问题。
