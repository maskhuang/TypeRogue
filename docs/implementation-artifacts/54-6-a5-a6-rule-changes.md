# Story 54.6: A5-A6 规则变更

Status: done

## Story

作为 A5/A6 玩家，我想要面对游戏规则层面的改变，以便构筑策略需要根本性调整。

## Acceptance Criteria

1. **A5 (ascensionLevel >= 5):** 商店刷新次数上限 3 次/关（含付费和免费刷新）
2. A5 达到上限后刷新按钮禁用，显示 "已达上限" 提示
3. **A6 (ascensionLevel >= 6):** run 开始时从 offense + defense 类 modifier 中随机选 1 个（排除 disruption），以 isElite=true 弱化参数添加到 activeModifiers，从第 2 关起生效
4. A6 的初始 modifier 在 HUD 中可见（与其他 permanent modifier 共享显示）

## Tasks

- [x] Task 1: A5 刷新上限 (AC: 1, 2)
  - [x] 1.1 A5_MAX_REFRESH = 3
  - [x] 1.2 refreshShop() guard + showFeedback
  - [x] 1.3 renderUnifiedShop() 刷新按钮禁用 + 提示文本
  - [x] 1.4 i18n: shop.refresh_limit 中英文
- [x] Task 2: A6 初始 modifier (AC: 3, 4)
  - [x] 2.1 getOffenseDefenseModifierIds() 过滤 offense+defense
  - [x] 2.2 startLevel() level===2 && A6+ 时注入 + 存入 activeModifiers
  - [x] 2.3 ascensionInitialModifier 标记 → 永久循环中以 isElite=true 弱化应用
  - [x] 2.4 GameState + createInitialState 新增 ascensionInitialModifier
- [x] Task 3: 单元测试 (AC: 1-3)
  - [x] 3.1 getOffenseDefenseModifierIds: 11 个（5 offense + 6 defense），排除 disruption
  - [x] 3.2 A5_MAX_REFRESH 常量验证

## Dev Notes

### A5: 刷新上限

shop.ts 关键流程：
- `state.shop.refreshCount` 每关开店时重置为 0（line ~1208）
- `refreshShop()` (line ~2609) 每次刷新递增 refreshCount
- 免费刷新也经过 refreshShop()（只是 cost=0）

接入点：
- refreshShop() 开头加 guard: `if (A5+ && refreshCount >= A5_MAX_REFRESH) return`
- renderUnifiedShop() 刷新按钮处：`if (A5+ && refreshCount >= limit) → disabled + 提示`

### A6: 初始 modifier

设计：run 开始时随机选 1 个 offense/defense modifier，以弱化参数永久添加。

实现方案：
- 在 battle.ts `startLevel()` 中，当 `state.level === 2`（第 2 关开始）且 A6+ 时：
  1. 从 offense+defense 类 modifier 中随机选 1 个（排除已有的 activeModifiers）
  2. `state.activeModifiers.push(modId)` — 加入永久列表
  3. 后续关卡 startLevel() 中的 permanent modifier 循环自动应用

为什么是 level===2 而非 level===1：第 1 关是校准关（练习关），不应受 modifier 干扰。

modifier 类别过滤：
```typescript
BOSS_MODIFIER_META[modId].category === 'offense' || === 'defense'
```
排除 disruption（fade/scramble/reverse/garble/decoy），保证基础可玩性。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-6]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- A5: refreshShop guard + UI disabled，i18n shop.refresh_limit
- A6: getOffenseDefenseModifierIds() + startLevel level===2 注入 + ascensionInitialModifier 跟踪弱化应用
- 5 个测试通过
- Code review: M1 RunState serialize/deserialize 补全 ascensionInitialModifier

### File List

- `src/core/constants.ts` — A5_REFRESH_COST_MULT = 2
- `src/core/types.ts` — GameState.ascensionInitialModifier
- `src/core/state.ts` — ascensionInitialModifier 初始化
- `src/data/bossModifiers.ts` — getOffenseDefenseModifierIds()
- `src/systems/battle.ts` — A6 注入 + 永久循环弱化应用
- `src/core/state/RunState.ts` — ascensionInitialModifier serialize/deserialize
- `src/systems/shop.ts` — A5 刷新费用 ×2 (getRefreshCost)
- `src/demo/demo-i18n.ts` — shop.refresh_limit
- `tests/unit/data/ascension-modifiers.test.ts` — 5 个测试
