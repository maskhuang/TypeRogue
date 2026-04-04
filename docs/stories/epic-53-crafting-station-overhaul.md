---
title: "Epic 53: 造词台流水线重做 — 队列机制 + UI 优化 + i18n"
epic_key: "epic-53"
status: "draft"
created: "2026-04-03"
stories:
  - "53-1-assembly-queue-data"
  - "53-2-queue-ui"
  - "53-3-crafting-i18n"
  - "53-4-balance-polish"
---

# Epic 53: 造词台流水线重做 — 队列机制 + UI 优化 + i18n

## 背景

当前造词台一次只能组装一个词，完成后需要手动选择下一个。造词师购买牌包也获得碎片（Epic 52 改动），碎片来源更多，产能需要匹配。

### 问题

1. **无队列**：生产完一个词后流水线停止，碎片和能量闲置
2. **中文硬编码**：造词台 UI 全部中文字符串，无英文支持
3. **UI 体验**：无法预览排队中的词，不知道生产顺序

### 目标

- 支持多词排队（queue），当前词完成后自动开始下一个
- 全部文本走 i18n（中英文）
- UI 显示当前生产 + 队列列表 + 队列管理（取消/调序）

## Stories

---

### Story 53.1: 组装队列数据层

**复杂度: Medium**
**依赖: 无**

将 `state.assemblyPipeline` 从单个对象改为队列。

**范围：**
- `core/types.ts` — `assemblyPipeline: AssemblyPipeline | null` 改为 `assemblyQueue: AssemblyPipeline[]`
- `AssemblyPipeline.ts` — `routeEnergyToPipeline` 改为处理队列：
  - 当前 pipeline 完成 → 自动 shift 下一个开始生产
  - 剩余能量溢出到下一个 pipeline
- `CraftingStation.ts` — 「开始组装」改为 push 到队列末尾
- 取消组装改为从队列中移除指定项
- 存档兼容：旧存档 `assemblyPipeline` 迁移为 `assemblyQueue[0]`

**验收标准：**
- AC1: 可连续排队多个词
- AC2: 当前词完成后自动开始下一个
- AC3: 能量溢出到下一个词（不浪费）
- AC4: 旧存档兼容

**估点：** 5

---

### Story 53.2: 队列 UI

**复杂度: Medium**
**依赖: 53.1**

造词台 UI 展示队列状态 + 管理操作。

**范围：**
- 流水线区域显示：当前生产中的词（进度条）+ 队列列表
- 队列项可取消（返还碎片）
- 无流水线时显示组装输入（现有 word builder）
- 有流水线时也可继续排队新词（不再隐藏 word builder）
- 队列满（如最多 5 个）时禁止继续排队

**验收标准：**
- AC1: 当前生产和队列同时可见
- AC2: 队列中的词可单独取消
- AC3: 生产中也可排队新词
- AC4: 队列有上限提示

**估点：** 5

---

### Story 53.3: 造词台 i18n

**复杂度: Small**
**依赖: 53.2**

所有造词台硬编码中文改为 `t()` 调用，补英文。

**当前硬编码字符串：**

| 位置 | 当前中文 | i18n key |
|------|---------|---------|
| 标题 | ⚡ 造词台 | craft.title |
| 流水线标题 | ⚡ 组装流水线 | craft.pipeline |
| 空流水线 | 无组装中的词语 — 在下方选择碎片开始组装 | craft.pipeline_empty |
| 取消组装 | 取消组装（返还碎片）| craft.cancel |
| 碎片库存 | 碎片库存 | craft.inventory |
| 组装新词 | 📝 组装新词 | craft.build |
| 占位提示 | 点击碎片添加字母，或从下方可拼词选择 | craft.placeholder |
| 开始组装 | 开始组装 | craft.start |
| 字母上限 | 最多 N 个字母 | craft.max_letters |
| 可拼词 | 💡 可拼词 (N) | craft.suggestions |
| 已造词 | 已造词 (N) | craft.crafted |
| 各种反馈 | 组装已取消/碎片不足/开始组装/拆解 | craft.feedback_* |
| 队列相关 | 排队中/队列已满/自动开始 | craft.queue_* |

**估点：** 3

---

### Story 53.4: 平衡与打磨

**复杂度: Small**
**依赖: 53.3**

- 队列上限调优（3? 5?）
- 能量溢出到下一个词的效率
- 造词台打开时自动刷新进度
- 完成词时的反馈（音效 + 动画）

**估点：** 3

---

## 依赖图

```
53.1 数据层 → 53.2 UI → 53.3 i18n → 53.4 打磨
```

## 总估点

| Story | 估点 |
|-------|------|
| 53.1 组装队列数据层 | 5 |
| 53.2 队列 UI | 5 |
| 53.3 造词台 i18n | 3 |
| 53.4 平衡打磨 | 3 |
| **合计** | **16** |
