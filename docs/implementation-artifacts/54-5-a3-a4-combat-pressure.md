# Story 54.5: A3-A4 战斗压力

Status: done

## Story

作为 A3/A4 玩家，我想要感受到更强的战斗压力，以便被迫优化输出效率。

## Acceptance Criteria

1. **A3 (ascensionLevel >= 3):** 精英关 modifier 不再弱化 — applyModifier 传 isElite=false
2. **A4 (ascensionLevel >= 4):** cycle 时间衰减从 0.9 降为 0.85
3. A3 下 cycle 3 精英关 modifier 与 boss 同强度
4. A4 下 cycle 3 标准关时间 = 30 × 0.85² ≈ 21.7s（对比 A0 的 24.3s）

## Tasks

- [x] Task 1: A3 精英不弱化 (AC: 1, 3)
  - [x] 1.1 battle.ts 3 处 applyModifier/addDeferredModifier: isElite = ascensionLevel < 3
- [x] Task 2: A4 时间衰减 (AC: 2, 4)
  - [x] 2.1 constants.ts A4_CYCLE_TIME_DECAY = 0.85
  - [x] 2.2 stageFlow.ts getCycleTimeLimit: ascensionLevel >= 4 时用 0.85
- [x] Task 3: 单元测试 (AC: 1-4)
  - [x] 3.1 5 个 A4 时间衰减测试（A0/A3/A4/A10 + cycle 3 验证）

## Dev Notes

### A3: 精英不弱化

battle.ts 中两处传 isElite=true：
- line ~2098: `applyModifier(eliteModId, true, false)` — 精英战应用
- line ~1805: `applyModifier(state.eliteModifier, true, false)` — Phoenix 复活

改为：`applyModifier(eliteModId, state.ascensionLevel < 3, false)`
即 A3+ 时传 false（不弱化），A0-A2 传 true（保持弱化）。

### A4: 时间衰减

stageFlow.ts line ~77-79 的 getCycleTimeLimit：
```typescript
return Math.round(base * Math.pow(BALANCE.CYCLE_TIME_DECAY, cycle - 1))
```
改为读取 ascensionLevel >= 4 时用 A4_CYCLE_TIME_DECAY。

需要引入 state 依赖到 stageFlow.ts（或通过参数传入）。
当前 stageFlow.ts 已 import state（搜索确认），直接用 state.ascensionLevel 即可。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- A3: 3 处 elite modifier 应用改为 `isElite = state.ascensionLevel < 3`
- A4: A4_CYCLE_TIME_DECAY = 0.85, getCycleTimeLimit 动态选择衰减系数
- 5 个新测试全部通过

### File List

- `src/core/constants.ts` — A4_CYCLE_TIME_DECAY = 0.85
- `src/systems/battle.ts` — 3 处 elite isElite 条件化
- `src/systems/stage/stageFlow.ts` — getCycleTimeLimit 读取 ascensionLevel
- `tests/unit/core/cycle-scaling.test.ts` — 5 个 A4 测试
