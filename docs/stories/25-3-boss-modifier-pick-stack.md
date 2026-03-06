# Story 25.3: Boss 修饰器选择与叠加

Status: done

## Story

As a 玩家,
I want 每次进入新周目时从 3 个 Boss 修饰器中选 1 个叠加，已有修饰器保留,
so that 我在递增难度中面对自选的 debuff 组合，寄生流玩家可以主动挑最重的 debuff 来强化自身.

## Acceptance Criteria

1. **AC1 — 修饰器选择 UI**
   - Boss 胜利后、进商店前弹出修饰器选择模态框
   - 展示 3 个候选修饰器卡片（图标 + 名称 + 效果描述）
   - 显示当前已激活修饰器列表
   - 周目 1 不弹出（首次通关 Boss 才开始选择，即进入周目 2 时首次弹出）

2. **AC2 — 候选池排除**
   - 候选从全部 13 个修饰器中随机抽 3 个
   - 排除已在 `state.activeModifiers` 中的修饰器
   - 若可用不足 3 个，显示全部可用

3. **AC3 — 选择生效**
   - 玩家点击卡片 → 选中修饰器加入 `state.activeModifiers`
   - 不允许跳过（必须选 1 个）
   - 选择后关闭模态框，进入商店

4. **AC4 — 多修饰器同时生效**
   - `state.activeModifiers` 中的所有修饰器在每个关卡全程生效
   - 效果叠加（多个修饰器同时作用，互不干扰）
   - 每关 `startLevel()` 时应用所有 activeModifiers

5. **AC5 — 引擎支持多修饰器**
   - `bossModifierEngine` 支持同时激活多个修饰器
   - 每个修饰器独立状态（fadeElapsed、driftElapsed 等不共享）
   - `tickModifier(dt)` 遍历所有活跃修饰器
   - `cleanupModifier()` 清理所有活跃修饰器

6. **AC6 — 与现有 elite/boss 关卡兼容**
   - 精英关的 bossModifierPool 单修饰器仍正常工作
   - Boss 关的 3 阶段轮换仍正常工作
   - activeModifiers（跨周目叠加）与 bossModifierPool（本周目精英/Boss 关）同时生效

7. **AC7 — 单元测试**
   - 候选生成：排除已激活、不足 3 个处理
   - 选择流程：加入 activeModifiers
   - 多修饰器引擎：同时应用、独立状态、独立清理
   - startLevel 中 activeModifiers 应用
   - 与 elite/boss 修饰器共存

## Tasks / Subtasks

- [x] Task 1: 多修饰器引擎重构 (AC: 5)
  - [x] 1.1 重构 `bossModifierEngine.ts`：`activeModifier` 单一变量 → `activeModifierInstances` 数组
  - [x] 1.2 每个实例携带独立状态（fadeElapsed、driftElapsed、maskedPositions 等）
  - [x] 1.3 `applyModifier()` 改为追加到数组（不替换）
  - [x] 1.4 `cleanupModifier()` 清理全部或指定修饰器
  - [x] 1.5 `tickModifier(dt)` 遍历所有实例调用 onTick
  - [x] 1.6 确保 `getActiveParams()` 合并所有活跃修饰器的参数

- [x] Task 2: 候选生成函数 (AC: 2)
  - [x] 2.1 创建 `generateBossModifierCandidates(activeModifiers: BossModifierId[]): BossModifierId[]`
  - [x] 2.2 从 ALL_BOSS_MODIFIER_IDS 中排除 activeModifiers，随机取 3 个
  - [x] 2.3 不足 3 个时返回全部可用

- [x] Task 3: 选择 UI 模态框 (AC: 1, 3)
  - [x] 3.1 在 `index.html` 添加修饰器选择模态框 HTML
  - [x] 3.2 创建 `bossModifierPicker.ts`：`showBossModifierPicker(onComplete: () => void)`
  - [x] 3.3 渲染 3 张候选卡片（图标 + 名称 + description）
  - [x] 3.4 显示已激活修饰器列表
  - [x] 3.5 点击卡片 → `state.activeModifiers.push(modId)` → 关闭 → onComplete
  - [x] 3.6 添加模态框 CSS 样式（参考 relicPicker 样式）

- [x] Task 4: 战斗流程集成 (AC: 4, 6)
  - [x] 4.1 修改 `endLevel()` Boss 胜利分支：`advanceCycle()` → `showBossModifierPicker()` → `openShop(true)`
  - [x] 4.2 修改 `startLevel()`：在现有精英/Boss 修饰器之外，也应用 `state.activeModifiers`
  - [x] 4.3 确保 activeModifiers 与 bossModifierPool 修饰器可共存

- [x] Task 5: 单元测试 (AC: 7)
  - [x] 5.1 测试 generateBossModifierCandidates 排除已激活
  - [x] 5.2 测试 generateBossModifierCandidates 可用不足 3 个
  - [x] 5.3 测试多修饰器引擎：同时 apply 两个
  - [x] 5.4 测试多修饰器引擎：独立 tick
  - [x] 5.5 测试多修饰器引擎：cleanupModifier 清理全部
  - [x] 5.6 测试 getActiveParams 合并参数
  - [x] 5.7 测试选择流程加入 activeModifiers
  - [x] 5.8 运行全部现有测试确认无回归

## Dev Notes

### 核心设计意图

**三维难度的第三维：**
- 维度 1: 分数 ×2/周目（Story 25.2 已实现）
- 维度 2: 时间 ×0.9/周目（Story 25.2 已实现）
- **维度 3: Boss 修饰器 3 选 1 叠加（本 Story）**
- 玩家自选 debuff，寄生流可主动挑最重的

### 当前 Boss 修饰器系统

**13 个修饰器（`data/bossModifiers.ts`）：**

| 类型 | ID | 名称 | 效果 |
|------|-----|------|------|
| 打字难度 | boss_fade | 渐隐之词 | 字母逐个淡出 |
| | boss_scramble | 乱序打字 | 字母打乱 |
| | boss_reverse | 倒序输入 | 从后往前打 |
| | boss_drift | 移动文字 | 词语漂移 |
| | boss_masked | 残缺词语 | 30% 字母遮挡 |
| | boss_spotlight | 聚光灯 | 只看到当前 2-3 字母 |
| | boss_rhythm | 节奏锁定 | 按节拍解锁 |
| 数值规则 | boss_decay | 分数衰减 | 每秒 -5% 总分 |
| | boss_combo_punish | 断连即扣 | 断连 -20% 总分 |
| | boss_cap | 单词限额 | 单词上限 50 分 |
| | boss_fast_time | 时间加速 | 计时器 1.5× |
| | boss_double_target | 双倍目标 | 目标 ×2 |
| | boss_diminish | 递减收益 | 每词 -10% |

**当前引擎架构（单修饰器）：**
```typescript
// bossModifierEngine.ts — 当前：单一活跃修饰器
let activeModifier: { modifier: BossModifier; params: BossModifierParams } | null = null
```

**重构目标（多修饰器）：**
```typescript
// 每个修饰器实例携带独立状态
interface ModifierInstance {
  modId: BossModifierId
  modifier: BossModifier
  params: BossModifierParams
  isElite: boolean
}

// 支持多个同时激活
let activeModifierInstances: ModifierInstance[] = []
```

### 关键实现细节

**1. 修饰器模块级状态问题：**

`bossModifiers.ts` 中部分修饰器使用模块级变量存储状态：
```typescript
let fadeElapsed = 0        // boss_fade
let driftElapsed = 0       // boss_drift
let rhythmElapsed = 0      // boss_rhythm
let maskedPositions: Set<number> = new Set()  // boss_masked
```

当同一修饰器类型不会重复激活（已通过候选排除保证），这些模块级变量不会冲突。不同类型的修饰器各自使用不同的模块级变量，天然隔离。因此**无需重构模块级状态**——只需让引擎支持多个实例的 apply/cleanup/tick 即可。

**2. `getActiveParams()` 合并策略：**

当前 `getActiveParams()` 返回单一修饰器的参数。多修饰器时需合并：
```typescript
// 合并策略：
// - scoreCap: 取最小值（最严格限制）
// - timeSpeed: 相乘（多个加速叠加）
// - targetMultiplier: 相乘
// - comboPunishRate: 取最大值
// - diminishRate: 取最大值
// - decayRate: 相加
```

**3. 战斗流程时序：**

```
Boss 胜利 → endLevel()
  ├─ advanceCycle()
  │   ├─ state.cycle++
  │   ├─ state.level = 1
  │   └─ state.bossModifierPool = drawBossModifiers(3)  // 新周目精英/Boss 修饰器
  ├─ showBossModifierPicker(callback)  ← 新增
  │   ├─ 展示 3 个候选（排除 activeModifiers）
  │   ├─ 玩家选 1 个
  │   └─ state.activeModifiers.push(selected)
  └─ callback → openShop(true)

每关 startLevel()
  ├─ 计算 timeMax + targetScore（含 cycle 缩放）
  ├─ 应用 tempBuff
  ├─ 应用 activeModifiers 中的所有修饰器  ← 新增
  ├─ 精英关额外应用 bossModifierPool[idx]（可能与 activeModifier 重叠）
  └─ Boss 关启动轮换引擎
```

**4. 精英/Boss 关与 activeModifiers 共存：**

精英关节点 3/6/9 各应用 bossModifierPool 中的 1 个修饰器（减弱版）。如果该修饰器已在 activeModifiers 中（全力版），需要决定：
- 方案 A: 跳过精英版（全力版已激活）
- 方案 B: 允许双重应用（精英版 + 全力版叠加）
- **推荐方案 A**：如果 activeModifiers 已包含该修饰器，精英关不重复应用

Boss 关轮换 bossModifierPool 中的 3 个修饰器。同理，已在 activeModifiers 中的可跳过轮换中该阶段。

**5. UI 参考 — relicPicker 模态框模式：**

```typescript
// relicPicker.ts 模式（可复用）：
export function showRelicPicker(onComplete: () => void): void {
  const candidates = generateRelicCandidates();
  // 渲染卡片 + 点击处理 + 关闭 + 回调
}
```

修饰器选择器复用相同模式，但无"跳过"按钮（必须选择）。

### 与前后 Story 的关系

- **Story 25.1 (已完成)**: 提供 `state.cycle`、`state.activeModifiers`、`advanceCycle()`
- **Story 25.2 (已完成)**: 提供分数/时间 cycle 缩放
- **Story 25.4 (后续)**: 稀有商铺 — 不影响修饰器系统
- **Story 25.5 (后续)**: 排行榜 — 需要 activeModifiers 数作为排名依据

### Project Structure Notes

- 修改文件: `systems/bossModifierEngine.ts`, `systems/battle.ts`, `index.html`, `style.css`
- 可能修改: `data/bossModifiers.ts`（候选生成函数）
- 新增文件: `systems/bossModifierPicker.ts`
- 新增测试: `tests/unit/systems/boss-modifier-picker.test.ts`
- 依赖: 无新依赖

### References

- [Source: docs/epics.md#Epic25-Story25.3 (line 1568-1578)] — AC 定义
- [Source: docs/brainstorming-session-2026-03-05.md#Section-A+ (line 54-87)] — 三维难度设计
- [Source: docs/brainstorming-session-2026-03-05.md#寄生流 (line 502-503)] — 寄生流 debuff 战略
- [Source: src/data/bossModifiers.ts] — 13 个修饰器定义 + BossModifierMeta
- [Source: src/systems/bossModifierEngine.ts] — 当前单修饰器引擎
- [Source: src/systems/battle.ts#advanceCycle (line 48-55)] — 周目推进函数
- [Source: src/systems/battle.ts#startLevel (line 635-784)] — 修饰器应用流程
- [Source: src/systems/battle.ts#endLevel (line 585-622)] — Boss 胜利分支
- [Source: src/systems/relicPicker.ts] — 选择器 UI 模式参考
- [Source: src/core/types.ts#GameState] — activeModifiers 字段
- [Source: docs/stories/25-1-cycle-state-loop-structure.md] — 前置 Story
- [Source: docs/stories/25-2-triple-difficulty-scaling.md] — 前置 Story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Refactored `bossModifierEngine.ts` from single `activeModifier` to `activeModifierInstances[]` array. Added `ModifierInstance` interface with `isPermanent` flag. `applyModifier()` now appends (3rd param `isPermanent`). Added `cleanupTemporaryModifiers()` for Boss rotation. `rebuildActiveParams()` merges via `Object.assign`. Added `isModifierActive()` for dedup.
- Task 2: Added `generateBossModifierCandidates(activeModifiers)` to `bossModifiers.ts`. Fisher-Yates shuffle on filtered pool, returns up to 3 candidates excluding already-active modifiers.
- Task 3: Created `bossModifierPicker.ts` with `showBossModifierPicker(onComplete)`. Added modal HTML to `index.html` and red-themed CSS to `style.css`. Renders candidate cards + active modifier tags. Guard flag prevents double-click. No skip button (must select).
- Task 4: Updated `battle.ts`: `endLevel()` Boss branch shows modifier picker for cycle >= 2 before `openShop`. `startLevel()` applies all `state.activeModifiers` as permanent (isPermanent=true, isElite=false) before elite/boss modifiers. Elite modifier skipped if already active via `isModifierActive()`.
- Task 5: Created 31 unit tests in `boss-modifier-picker.test.ts` covering candidate generation, multi-modifier engine, cleanupTemporary, selection flow, startLevel integration, elite/boss coexistence, and getActiveParams merging. Updated 1 existing test in `bossModifierEngine.test.ts` to match multi-modifier semantics. All 205 story-related tests pass. 6 pre-existing test failures confirmed unrelated (audio mocks, shop-act-weight, producer/converter).

### File List

- src/src/systems/bossModifierEngine.ts (modified: single→multi modifier engine, ModifierInstance interface, isPermanent flag, cleanupTemporaryModifiers, isModifierActive, rebuildActiveParams)
- src/src/data/bossModifiers.ts (modified: added generateBossModifierCandidates function)
- src/src/systems/bossModifierPicker.ts (new: Boss modifier 3-pick-1 modal UI)
- src/src/systems/battle.ts (modified: endLevel Boss branch shows picker, startLevel applies state.activeModifiers as permanent, elite skip if already active)
- src/src/systems/shop.ts (modified: added cycle display in shop title for cycle>=2)
- src/index.html (modified: added modifier-picker-modal HTML)
- src/src/style.css (modified: added BOSS MODIFIER PICKER MODAL CSS section)
- src/tests/unit/systems/boss-modifier-picker.test.ts (new: 31 unit tests for Story 25.3)
- src/tests/unit/systems/bossModifierEngine.test.ts (modified: updated 1 test for multi-modifier semantics, added imports)

### Senior Developer Review

**Review Date:** 2026-03-06
**Reviewer:** Claude Opus 4.6 (Code Review Workflow)
**Result:** PASS — all issues resolved

**Issues Found: 5 (0 High, 3 Medium, 2 Low)**

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| M1 | Medium | `switchToPhase()` didn't check if rotation modifier was already permanently active — could cause double-application and `originalTargetScore` corruption for `boss_double_target` | Added `if (!isModifierActive(modId))` guard before `applyModifier` call |
| M2 | Medium | `switchToPhase` duplicated `applyModifier` logic instead of calling it | Replaced with direct `applyModifier(modId, false, false)` call |
| M3 | Medium | `shop.ts` changes (cycle display) not documented in story file list | Added `shop.ts` to File List |
| L1 | Low | `getActiveModifierEffect()` duplicated merge logic from `rebuildActiveParams()` | Simplified to `return getActiveParams()` |
| L2 | Low | `endLevel` Boss branch `else` was unreachable (`advanceCycle()` always makes `cycle >= 2`) | Removed unreachable branch, simplified to always call `showBossModifierPicker()` |

**Test added:** 1 overlap test for Boss rotation + permanent modifier coexistence (32 total tests).
**All 206 story-related tests pass after fixes.**
