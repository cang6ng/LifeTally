# 数据与备份

## IndexedDB

```text
名称：LifeTallyPageV0DB
版本：3
稳定 stores：objects / folders / settings / wallpapers / conversionRecords
```

数据库升级采用 `ensureCoreStores` 补齐缺失 store 和关键索引。升级不得清空或重建已有 store。

## localStorage

v0 只写以下命名空间：

```text
lifetally:v0:ui
lifetally:v0:settings
lifetally:v0:holiday-cache:v1
lifetally:v0:holiday-overrides:v1
lifetally:v0:storage-migrated:v1
```

首次运行会在新键缺失时尝试读取旧共享键，并只复制当前 v0 支持的设置字段。旧搜索页、外链背景和天气密钥等字段会被丢弃。复制成功后写入迁移标记；旧键不会被删除，防止影响其他 LifeTally 版本。

## 备份 V1

V1 使用 `format: lifetally-backup` 和 `schemaVersion: 1`。内容包括：

- 所有 active、archived 和 trashed 对象。
- 用户壁纸（Blob 转 data URL）。
- 转换记录。
- 经过白名单规范化的非敏感页面设置。
- 用户节假日覆盖。

备份不包含默认壁纸，因为它随应用发布；也不应包含密钥。

## 导入语义

导入固定为“校验后合并”：

1. 在写入前完整验证根结构、对象类型、壁纸 MIME/data URL 和转换记录。
2. 对备份内重复 id 取最后一项。
3. objects、wallpapers 和 conversionRecords 在同一个 IndexedDB 事务中按 id `put`。
4. 当前数据库中未出现在备份里的数据保持不变。
5. 页面设置写入失败只产生警告，不删除已成功合并的核心数据。
6. 旧 `version: 5.0.0` 备份会映射到 V1 内部结构后导入。

因此重复导入同一备份是幂等操作，但它不是“把当前状态完全覆盖成备份状态”。

## 用户安全建议

- 清除浏览器站点数据、重装浏览器或更换 profile 前先导出备份。
- 不要把真实备份提交到 Git、Issue 或 Pull Request。
- 导入来源不明的备份前先保留当前备份。
- 页面内容看似缺失时先看数据诊断数量，再判断是数据问题还是 UI 过滤问题。
