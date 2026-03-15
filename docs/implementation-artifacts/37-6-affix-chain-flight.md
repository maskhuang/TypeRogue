# Story 37.6: 词条链式触发的飞行定位

Status: done

## Story

As a 玩家,
I want 词条内部链式触发（溅射/共鸣/连接）的浮字从被触发技能绑定的字母位置飞出，而非全部从原始触发字母飞出,
so that 我能看到溅射/共鸣/连接的资源从对应的邻居字母各自飞向目标 UI，形成清晰的链式因果关系.

## Background

Story 37.4 解决了遗物触发（echo_thimble/combo_detonator/key_storm）的飞行定位，每个遗物调用独立的 `triggerSkill(sid, key, overrideAnchor)`，因此每个链式技能可以有自己的锚点。

但词条内部的链式触发（resonance/link/splash）走不同路径：它们在 `orchestrateAffixTrigger` 的 FIFO 队列中处理，所有结果作为 `TriggerResult[]` 返回给 `triggerAffixSkillWithFeedback`。反馈循环对所有结果使用同一个 `overrideAnchor`（或 `state.player.index`），导致链式触发的浮字全部从原始字母飞出。

例：玩家按 'a' → 技能 A(溅射) → 溅射到 'b','c' → 技能 B,C 触发
- 当前：A/B/C 的浮字全从 'a' 飞出
- 期望：A 从 'a'，B 从 'b'，C 从 'c'

## Acceptance Criteria

1. **TriggerResult 携带 triggerKey** — `TriggerResult` 新增 `triggerKey: string` 字段，调度器在 push result 前赋值 `item.triggerKey`
2. **反馈循环按结果定位** — `triggerAffixSkillWithFeedback` 的浮字反馈循环中，对链式结果（`triggerKey !== triggerKey`）使用 `resolveChainAnchor(tr.triggerKey)` 计算独立锚点
3. **本词有绑定字母** — 链式结果的 `triggerKey` 出现在当前词中时，浮字从匹配字母位置飞出
4. **本词无绑定字母** — 链式结果的 `triggerKey` 不在当前词中时，浮字从 `#active-library` 飞出
5. **初始触发不受影响** — 非链式结果（`tr.triggerKey === triggerKey`）仍使用原有锚点逻辑（`overrideAnchor` 或 `state.player.index`）
6. **衍生附魔反馈同步** — transmute 反馈也使用对应链式结果的锚点
7. **编译通过** — `npx vite build` 无新增错误
8. **测试通过** — `npx vitest run` 无新增失败

## Tasks / Subtasks

- [x] Task 1: TriggerResult 增加 triggerKey (AC: #1)
  - [x] 1.1 `affixTrigger.ts` 的 `TriggerResult` 接口新增 `triggerKey: string` 字段
  - [x] 1.2 `triggerAffixSkill` 返回时填充 `triggerKey`（从 `ctx.triggerKey` 获取）

- [x] Task 2: 调度器附加 triggerKey (AC: #1)
  - [x] 2.1 调度器构建 `triggerCtx.triggerKey = item.triggerKey`，`triggerAffixSkill` 返回时已携带正确 triggerKey，无需额外赋值

- [x] Task 3: 反馈循环按结果独立定位 (AC: #2, #3, #4, #5)
  - [x] 3.1 `skills.ts` 导入 `resolveChainAnchor` from `battle.ts`
  - [x] 3.2 主资源反馈循环：链式结果（`tr.triggerKey !== triggerKey`）调用 `resolveChainAnchor(tr.triggerKey)` 获取独立锚点
  - [x] 3.3 衍生附魔反馈循环同理

- [x] Task 4: 测试验证 (AC: #7, #8)
  - [x] 4.1 新增 `affix-chain-anchor.test.ts`：3 个测试 — 链式锚点独立、recurse 共享锚点、衍生附魔链式锚点
  - [x] 4.2 编译通过 (495ms) + 11 测试全过

## Dev Notes

### 核心修改点

`TriggerResult` 新增字段（affixTrigger.ts）：
```typescript
export interface TriggerResult {
  // ... existing fields
  /** 本次触发的键位（链式定位用） */
  triggerKey: string
}
```

调度器赋值（affixTriggerOrchestrator.ts L160）：
```typescript
result.triggerKey = item.triggerKey  // item 已有 triggerKey
results.push(result)
```

反馈循环修改（skills.ts L293-330）：
```typescript
for (const tr of result.triggerResults) {
  // ...
  let anchor;
  if (tr.triggerKey !== triggerKey) {
    // 链式结果：按触发键独立定位
    const chainPos = resolveChainAnchor(tr.triggerKey);
    anchor = chainPos.fromElementId
      ? { fromElementId: chainPos.fromElementId, resource, amount }
      : { letterIndex: chainPos.letterIndex!, resource, amount };
  } else {
    // 初始触发：原有逻辑
    const letterIdx = overrideAnchor?.letterIndex ?? state.player.index;
    anchor = overrideAnchor?.fromElementId
      ? { fromElementId: overrideAnchor.fromElementId, resource, amount }
      : { letterIndex: letterIdx, resource, amount };
  }
  showFeedback(..., anchor);
}
```

### 链式触发类型与 triggerKey 来源

| 类型 | 来源 | triggerKey |
|------|------|-----------|
| initial | 玩家按键 | 原始按键 |
| recurse | Phase 5 自触发 | 同原始按键 |
| splash | Phase 5 溅射 | 邻居键位 |
| resonance | Phase 6 共鸣 | 邻居键位 |
| link | Phase 6 连接 | 邻居键位 |

### resolveChainAnchor 复用

37-4 已导出 `resolveChainAnchor(boundKey): { letterIndex?: number; fromElementId?: string }`，直接复用。

### 关键位置

| 位置 | 行号 | 内容 |
|------|------|------|
| `affixTrigger.ts` L125-152 | TriggerResult 接口 |
| `affixTriggerOrchestrator.ts` L160 | results.push 点 |
| `skills.ts` L293-330 | 主资源反馈循环 |
| `skills.ts` L333-344 | 衍生附魔反馈循环 |

### 边界情况

- **recurse**：自触发使用同一 triggerKey，`tr.triggerKey === triggerKey` 为 true → 走初始触发逻辑 → 锚点不变（正确）
- **splash 到无绑定技能的键位**：调度器跳过（L201 `if (!targetSkillId) continue`），不产生 TriggerResult
- **triggerAffixSkill 已有 triggerKey**：调度器构建 triggerCtx 时用 item.triggerKey，triggerAffixSkill 返回时天然携带正确值

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- `TriggerResult` 新增 `triggerKey: string`，`triggerAffixSkill` 返回时从 `ctx.triggerKey` 填充
- 调度器无需额外赋值 — `triggerCtx.triggerKey = item.triggerKey` 已确保一致
- `skills.ts` 导入 `resolveChainAnchor`，反馈循环对 `tr.triggerKey !== triggerKey` 的链式结果独立定位
- 衍生附魔反馈同理处理
- 3 个新测试通过（mock orchestrator 控制 triggerKey 分布）
- **Code Review 修复**:
  - M1: `resolveChainAnchor` 缓存 — 同一 triggerKey 只调一次，避免 `random()` 导致主资源和衍生附魔浮字位置不一致
  - M2: 提取 `buildAnchor` 辅助函数，消除主循环与衍生附魔循环的重复锚点构建逻辑
  - L1: 测试新增 orchestrator 调用参数验证

### Change Log

- 2026-03-14: Implemented affix chain flight positioning (Story 37-6)
- 2026-03-14: Code review fixes — anchor cache + buildAnchor helper + test verification

### File List

- `src/src/data/affixTrigger.ts` — TriggerResult 新增 triggerKey 字段 + triggerAffixSkill 填充
- `src/src/systems/skills.ts` — 导入 resolveChainAnchor，反馈循环按链式结果独立定位锚点
- `src/tests/unit/systems/affix-chain-anchor.test.ts` — 新增 3 个测试
