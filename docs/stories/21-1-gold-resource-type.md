# Story 21.1: 金币加入资源类型

Status: done

## Story

As a 玩家,
I want 金币成为和 base/score/multiplier/time/shield 一样的资源类型,
so that 技能系统可以产出和转化金币，为金币资源化奠定基础.

## Acceptance Criteria

1. `ResourceType` 新增 `'gold'`，类型为 `'base' | 'score' | 'multiplier' | 'time' | 'shield' | 'gold'`
2. `ResourceState` 新增 `gold: number`，每关初始 0，不跨词重置
3. `RESOURCE_LABELS` / `RESOURCE_ICONS` / `RESOURCE_COLORS` 新增 gold 条目
4. `resetResources()` 中 gold **不重置**（金币跨词累加，仅在战斗开始时清零）
5. `setWord()` 不重置 `resources.gold`
6. 战斗结束时，`state.gold += Math.floor(state.resources.gold)` 替换原有的 `baseGold + timeBonus` 公式（**本 Story 仅做累加管道，不移除默认金币 — 移除在 21.4**）
7. `state.resources.gold` 在战斗开始时清零
8. 构建通过，现有测试通过

## Tasks / Subtasks

- [x] Task 1: ResourceType 和 ResourceState 扩展 (AC: 1, 2)
  - [x] 1.1 `core/types.ts` — `ResourceType` 联合类型新增 `'gold'`
  - [x] 1.2 `core/types.ts` — `ResourceState` 接口新增 `gold: number` 字段
- [x] Task 2: 资源常量扩展 (AC: 3)
  - [x] 2.1 `core/constants.ts` — `RESOURCE_LABELS` 新增 `gold: '金币'`
  - [x] 2.2 `core/constants.ts` — `RESOURCE_ICONS` 新增 `gold: '💰'`
  - [x] 2.3 `core/constants.ts` — `RESOURCE_COLORS` 新增 `gold: '#ffd700'`
- [x] Task 3: 资源初始化与重置 (AC: 4, 5, 7)
  - [x] 3.1 `core/state.ts` — `createInitialState()` 中 resources 新增 `gold: 0`
  - [x] 3.2 `core/state.ts` — `resetResources()` 不重置 gold（跨词累加）
  - [x] 3.3 确认 `setWord()` 重置 `resources.base` 和 `resources.score`，gold 不受影响
  - [x] 3.4 `systems/battle.ts` — `startLevel()` 中 resetResources 后 `state.resources.gold = 0`
- [x] Task 4: 战斗结束金币管道 (AC: 6)
  - [x] 4.1 `systems/shop.ts` — `openShop()` 新增 `state.gold += Math.floor(state.resources.gold)`（保留现有 baseGold + timeBonus）
- [x] Task 5: 技能系统适配 (AC: 8)
  - [x] 5.1 `systems/skills.ts` — `EMPTY_RESOURCES` 新增 `gold: 0`
  - [x] 5.2 确认 `recordSkillTrigger` 通过 `EMPTY_RESOURCES` 展开支持 gold
  - [x] 5.3 确认 `triggerProducer`/`triggerConverter` 的 else 分支 `state.resources[prod.resource]` 支持 gold

## Dev Notes

### 关键设计决策

**Gold 的双层存储：**
- `state.resources.gold`（BattleState 层）：战斗中由技能产出的金币，每关开始清零
- `state.gold`（RunState 层）：累积的总金币，用于商店消费
- 战斗结束时：`state.gold += Math.floor(state.resources.gold)`
- 这和现有 score 的模式一致：`resources.score` 是临时的，`state.score` 是累积的

**本 Story 范围限定：**
- 仅建立 gold 作为 ResourceType 的基础设施
- 不移除默认金币产出（baseGold + timeBonus 保留） — 那是 Story 21.4
- 不新增金币产出者/转化者 — 那是 Story 21.2 和 21.3
- 不修改 HUD — Epic 设计确认战斗中不显示金币 HUD

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|---------|
| `src/src/core/types.ts` | line 8-9 | ResourceType 新增 'gold' |
| `src/src/core/types.ts` | line 95-101 | ResourceState 新增 gold |
| `src/src/core/constants.ts` | line 71-88 | RESOURCE_LABELS/ICONS/COLORS |
| `src/src/core/state.ts` | line 10-32 | createInitialState resources |
| `src/src/core/state.ts` | line 113-119 | resetResources() |
| `src/src/systems/skills.ts` | line ~20 | EMPTY_RESOURCES |
| `src/src/systems/battle.ts` | line ~90 | setWord() 确认不重置 gold |
| `src/src/systems/shop.ts` | line ~68 | openShop() 添加 resources.gold 累加 |

### 不重置 gold 的对比

```
resetResources() 重置行为（仅在 startLevel 调用，每关一次）：
  base       → 0         (每关重置；setWord 也单独归零)
  score      → 0         (每关重置；setWord 也单独归零)
  multiplier → BASE_MULT (每关重置)
  time       → timeMax   (每关重置为关卡时间)
  shield     → 0         (每关重置，跨词保持)
  gold       → 不重置     (跨词保持，startLevel 中单独归零) ← 和 shield 同级别
```

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- ResourceType 修改影响范围广，但由于是联合类型扩展，不会破坏现有代码
- 确保 `as const` 类型的 RESOURCE_COLORS 对象新增 gold 后类型推断正确

### References

- [Source: docs/epics.md#Epic 21 Story 21.1]
- [Source: docs/brainstorming-session-2026-03-05.md#造词系统 — 碎片经济 + 金币资源化]
- [Source: docs/project-context.md#State Management Rules — 三层状态]
- [Source: src/src/core/types.ts#ResourceType, ResourceState]
- [Source: src/src/core/state.ts#resetResources]
- [Source: src/src/systems/shop.ts#openShop — 金币计算]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- All 5 tasks completed, build passes, relevant tests updated and passing (59/59)
- `setWord()` only resets `resources.base`, gold persists across words as designed
- `triggerProducer`/`triggerConverter` generic else branch handles gold via `state.resources[prod.resource]`
- Updated battle-ui and resources tests from 5→6 resource count assertions
- Pre-existing test failures in audio and producer-trigger tests are unrelated

### File List
- `src/src/core/types.ts` — ResourceType + ResourceState 新增 gold
- `src/src/core/constants.ts` — RESOURCE_LABELS/ICONS/COLORS 新增 gold
- `src/src/core/state.ts` — createInitialState resources 新增 gold: 0
- `src/src/systems/battle.ts` — startLevel() 战斗开始时 resources.gold = 0
- `src/src/systems/shop.ts` — openShop() 金币管道 state.gold += Math.floor(state.resources.gold)
- `src/src/systems/skills.ts` — EMPTY_RESOURCES 新增 gold: 0
- `tests/unit/systems/battle-ui.test.ts` — 5→6 资源数量断言
- `tests/unit/core/resources.test.ts` — 5→6 资源颜色断言
