# 第三方与资产声明

## 代码依赖

主要直接依赖及其许可证如下；各依赖仍适用其自身许可证，完整版本、版权声明和传递依赖见 `app/package-lock.json` 及对应上游项目。

| 依赖 | 用途 | 许可证 |
| --- | --- | --- |
| React / React DOM | 用户界面运行时 | MIT |
| Ant Design / Ant Design Icons | 组件与图标 | MIT |
| Zustand | 客户端状态管理 | MIT |
| idb | IndexedDB Promise 封装 | ISC |
| date-fns / dayjs | 日期处理 | MIT |
| Vite | 开发与构建工具 | MIT |
| TypeScript | 类型检查与编译 | Apache-2.0 |
| `@types/*` | TypeScript 类型声明 | MIT |

## 节假日数据

- 内置中国大陆节假日数据根据国务院办公厅公开的年度放假安排整理，只记录日期、名称和调休事实。
- 自动更新适配器调用 [timor.tech 节假日 API](https://timor.tech/)。该服务不属于 LifeTally，稳定性和使用条款由其提供者负责。

## 项目资产

- `app/public/assets/default-wallpaper.png` 由仓库内 `app/scripts/generate-default-wallpaper.ps1` 确定性生成，不包含第三方图片、标志或文字，随项目按 MIT 许可证提供。
- `docs/assets/` 中的界面截图来自 LifeTally 本身，使用空白或虚构数据，随项目按 MIT 许可证提供。

旧版本曾使用的第三方壁纸和搜索参考图不属于公开首发内容，也不会出现在公开 Git 历史中。
