# 架构说明

## 核心目标

页面可以增加或删除，核心对象与用户数据不能随页面一起消失。删除一个可选页面不得修改对象事实来源、数据库名称或稳定备份格式。

## 依赖方向

```text
Calendar / Notes / Wallpapers / Editor
                ↓
        Stores and services
                ↓
Object rules / Backup boundary / Holiday adapter
                ↓
 IndexedDB and namespaced localStorage
```

依赖只允许向下。数据库和备份模块不得导入页面组件或未来搜索功能。

## 稳定 core

- `types/objects.ts`：生活对象、壁纸和转换记录契约。
- `db/`：`LifeTallyPageV0DB` schema、迁移和原子事务。
- `core/storage/`：v0 localStorage 键和旧键兼容迁移。
- `utils/objectConversion.ts`：保持 id 的类型转换规则。
- `utils/backup.ts`：备份格式、全量校验和合并导入边界。

## 稳定 features

- 日历消费 active 对象和节假日结果。
- 便利贴消费 note、转换记录和 trashed 对象。
- 壁纸库只通过 wallpaper service 访问 Blob。
- 编辑器通过 object store 修改一个对象，不直接操作数据库 schema。

## 存储规则

- `objects` 是生活对象唯一事实来源。
- `conversionRecords` 是最近转换的辅助历史；写入失败不能回滚已成功的对象转换。
- 永久删除只允许从回收站触发。
- `folders` 和 IndexedDB `settings` 是兼容遗留 store，当前页面不依赖；未经过版本迁移不得删除。
- schema 新增或变化必须同步更新 migration、诊断、备份和测试。

## 可选功能

未来搜索页必须位于独立 feature 边界，只依赖公开 core 接口。删除搜索页时只允许删除 feature 文件和 App 注册项，不允许变更数据库 core store 或其他页面数据。
