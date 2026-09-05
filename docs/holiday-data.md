# 节假日数据

## 目标

中国大陆放假与补班由年度官方安排决定，不能只靠日期算法生成。LifeTally 使用“用户覆盖 → 远程缓存 → 内置已验证数据 → 固定节日本日兜底”的优先级。

## 数据类型

- `festival`：节日本日。
- `holiday`：放假日。
- `workday`：调休补班日。

统一记录包含 `date / name / type / source`，年度数据包含年份、来源、校验时间和 `verified | pending | fallback` 状态。

## 数据流

```text
日历查询日期
→ 合并本地兜底、内置年度数据、缓存和用户覆盖
→ 返回统一 HolidayInfo
→ 日历与 Overview 渲染
```

启动时只在当前年或下一年缺少可用数据时尝试远程更新。远程请求失败会静默回退，不阻塞日历。

## 网络和隐私

自动更新调用 `https://timor.tech/api/holiday/year/{year}`。服务只作为年度数据补充，不属于 LifeTally。用户可在数据设置中检查来源、导入 JSON 或覆盖某一天。

## 维护内置数据

1. 等待国务院办公厅发布年度安排。
2. 从官方通知提取放假和补班事实。
3. 更新 `app/src/providers/holiday/data/china-{year}.json`。
4. 填写 `_meta.source`、`verifiedAt` 并将状态设为 `verified`。
5. 运行 typecheck、test、build，并人工核对日历显示。

官方发布前，未来年度数据集保持 `pending`，不得录入预测调休。
