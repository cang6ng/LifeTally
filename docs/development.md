# 开发与发布

## 本地开发

```powershell
git clone https://github.com/cang6ng/LifeTally.git
cd LifeTally/app
npm ci
npm run dev
```

支持 Node.js 22.12 及以上版本。依赖版本以 `package-lock.json` 为准。

## 验证命令

```powershell
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

CI 在 Node 22 和 Node 24 上运行前三项。完整依赖审计作为发布门禁执行。

## 变更规则

- UI 变化使用虚构数据截图。
- 数据结构变化必须先定义兼容迁移和失败语义。
- 新持久化能力必须同时更新 schema、迁移、诊断、备份和测试。
- 新外部请求必须更新隐私与第三方声明。
- 不直接编辑 `dist/` 或测试构建目录。

## v0.1.0 发布清单

1. 所有自动检查通过且工作区无意外文件。
2. README、许可证、截图、内部链接和 CHANGELOG 已核对。
3. 完整 Git 历史敏感信息扫描通过。
4. 从清理后的树建立只有一个首次提交的 `main`。
5. 先推送到空私有 GitHub 仓库并等待 Actions 通过。
6. 启用 Issues、Dependabot、secret scanning、push protection 和私密漏洞报告。
7. 设置 main ruleset：禁止 force push/删除，PR 需要 CI。
8. 切换 Public 后创建 `v0.1.0` pre-release。

首发只发布源码，不提交 `dist/`，不启用 GitHub Pages，也不包装浏览器扩展。
