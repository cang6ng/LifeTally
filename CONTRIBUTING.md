# 参与 LifeTally

感谢你愿意改进 LifeTally。当前项目优先保证本地数据安全、清晰的模块边界和可回归验证。

## 开发环境

- Node.js 22.12 或更高版本。
- npm 10 或更高版本。
- Chrome、Edge 或其他现代 Chromium 浏览器。

```powershell
cd app
npm ci
npm run dev
```

## 提交改动前

1. 从 `main` 创建短期分支。
2. 一个 Pull Request 只解决一个明确问题。
3. 不提交真实备份、个人事项、上传壁纸或浏览器配置。
4. 持久化格式变化必须包含兼容迁移和测试。
5. 新页面只能通过稳定 core 接口访问对象和存储，不得把页面专属类型写入 core schema。

必须运行：

```powershell
npm run typecheck
npm test
npm run build
```

## Pull Request 内容

- 说明用户可见变化和修改原因。
- 明确是否影响 IndexedDB、localStorage 或备份格式。
- 列出自动检查和手动验收结果。
- UI 变化附带不含个人数据的截图。
- 新依赖说明用途、许可证和替代方案。

请遵守 [行为准则](./CODE_OF_CONDUCT.md)，安全问题按 [安全政策](./SECURITY.md) 私下报告。
