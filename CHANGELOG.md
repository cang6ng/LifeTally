# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；版本号采用语义化版本。

## [0.1.0] - 2026-08-04

### Added

- 日历、便利贴、壁纸库和统一对象编辑器。
- 纪念日、事件、Deadline、To Do、Daily To Do 与便利贴统一对象模型。
- 便利贴全类型转换、最近转换记录和回收站。
- IndexedDB 本地壁纸上传、切换、重命名和删除。
- 中国大陆节假日本地数据、自动更新、缓存和用户覆盖。
- 数据诊断、版本化备份和校验后合并导入。
- GitHub CI、Issue/PR 模板、贡献、安全、隐私和第三方声明。

### Changed

- 默认入口固定为日历，删除不稳定的搜索页主线。
- v0 IndexedDB 独立为 `LifeTallyPageV0DB`。
- localStorage 切换到 `lifetally:v0:*` 命名空间，并以白名单方式兼容读取一次旧键。
- 备份 V1 增加转换记录，导入统一为按 id 合并。
- 默认壁纸替换为仓库脚本生成的原创资产。

### Security

- 备份和环境文件默认被 Git 忽略。
- 更新 Vite 与 PostCSS，消除首发前已知依赖审计问题。
- 公开历史不包含旧第三方图片和个人 Git 邮箱。

### Data impact

- 不清空、不重建 `LifeTallyPageV0DB`。
- 不删除旧 localStorage 键，避免影响其他 LifeTally 版本。
- 旧版 `version: 5.0.0` 备份保持可导入。
