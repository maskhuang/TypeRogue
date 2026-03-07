# Story 28.1: T2 事件钩子基础设施

Status: done

## Story

As a 开发者,
I want 在 ModifierTrigger 中添加 `on_skill_purchase`、`on_enchantment_acquire`、`on_act_end` 三个新事件类型，并在对应的业务代码中触发它们,
so that T2 累积成长遗物（campfire_ember、star_chart、entropy 等）可以在技能购买、附魔获取、幕切换时响应并更新自身状态。

## Acceptance Criteria

1. **`on_skill_purchase` 触发** — 商店中成功购买技能后（`executePurchase` 返回前），调用 `resolveRelicEffectsWithBehaviors('on_skill_purchase', ctx)`，ctx 中包含 `purchasedSkillId` 和 `isUpgrade`
2. **`on_enchantment_acquire` 触发** — 附魔成功应用后（`applyEnchantment` 完成赋值后），调用 `resolveRelicEffectsWithBehaviors('on_enchantment_acquire', ctx)`，ctx 中包含 `enchantedSkillId` 和 `enchantmentId`
3. **`on_act_end` 触发** — 当 `startLevel()` 检测到 act 切换时（`currentAct !== lastAct`），在过渡动画前调用 `resolveRelicEffectsWithBehaviors('on_act_end', ctx)`，ctx 中包含 `endedAct` 编号
4. **ModifierTrigger 类型扩展** — 三个新触发类型在 TypeScript 编译中可用，现有 `EffectPipeline.resolve()` 无需修改（trigger 已是 string 过滤）
5. **PipelineContext 扩展** — 新增 `purchasedSkillId?: string`、`isUpgrade?: boolean`、`enchantedSkillId?: string`、`enchantmentId?: string`、`endedAct?: number` 五个可选字段
6. **测试覆盖** — ≥12 个新测试验证三个钩子的触发时机、上下文传递、和无遗物时的空操作

## Tasks / Subtasks

- [x] Task 1: 类型扩展 (AC: #4, #5)
  - [x] 1.1 `src/src/systems/modifiers/ModifierTypes.ts` — `ModifierTrigger` 联合类型添加 `'on_skill_purchase' | 'on_enchantment_acquire' | 'on_act_end'`
  - [x] 1.2 `src/src/systems/modifiers/ModifierTypes.ts` — `PipelineContext` 添加 5 个新可选字段：`purchasedSkillId`、`isUpgrade`、`enchantedSkillId`、`enchantmentId`、`endedAct`

- [x] Task 2: 商店钩子集成 (AC: #1, #2)
  - [x] 2.1 `src/src/systems/shop.ts` — 在 `executePurchase()` 函数末尾（`return { skillId, isNew }` 前），添加 `resolveRelicEffectsWithBehaviors('on_skill_purchase', { purchasedSkillId: skillId, isUpgrade: !isNew })` 调用
  - [x] 2.2 `src/src/systems/shop.ts` — 在 `applyEnchantment()` 函数中 `state.player.enchantedSkills.set()` 后，添加 `resolveRelicEffectsWithBehaviors('on_enchantment_acquire', { enchantedSkillId: skillId, enchantmentId })` 调用
  - [x] 2.3 `src/src/systems/shop.ts` — 添加 `import { resolveRelicEffectsWithBehaviors } from '../systems/relics/RelicPipeline'`

- [x] Task 3: 战斗钩子集成 (AC: #3)
  - [x] 3.1 `src/src/systems/battle.ts` — 在 `startLevel()` 的 `if (currentAct !== lastAct)` 块中，`await showActTransition(currentAct)` 前，添加 `resolveRelicEffectsWithBehaviors('on_act_end', { endedAct: lastAct })` 调用
  - [x] 3.2 确保 `lastAct` 初始值时（首次调用）不触发 on_act_end（`lastAct` 初始值为 0，`if (lastAct > 0)` 守卫）

- [x] Task 4: 测试 (AC: #6)
  - [x] 4.1 新建 `tests/unit/systems/relics/relics.event-hooks.test.ts` — 14 个测试：
    - ModifierTrigger 新类型编译验证（3 个）
    - PipelineContext 新字段赋值验证（3 个）
    - EffectPipeline 对新 trigger 正确 resolve（4 个）
    - resolveRelicEffectsWithBehaviors 无遗物安全空操作（3 个）
    - 多遗物同时监听同一新 trigger 时均生效（1 个）

## Dev Notes

### 现有代码分析

**relicStates 基础设施已就绪**（Story 27.5 完成）：
- `state.player.relicStates: Record<string, number>` — 运行时状态
- `RunStateData.relicStates` — 序列化支持
- `initRelicState()` / `getRelicState()` / `setRelicState()` — 辅助函数
- `resolveRelicEffects()` 和 `resolveRelicSkillTrigger()` 自动注入 `relicStates` 到 context

**现有 ModifierTrigger 值**（7 个）：
`on_skill_trigger`, `on_correct_keystroke`, `on_error`, `on_word_complete`, `on_combo_break`, `on_battle_start`, `on_battle_end`

**商店钩子点**：
- `executePurchase()` (shop.ts:520-558) — 扣金币、更新技能数据、返回 `{ skillId, isNew }`
- `applyEnchantment()` (shop.ts:750-760) — `enchantedSkills.set()` 后立即可触发

**战斗钩子点**：
- `startLevel()` (battle.ts:661-685) — `currentAct !== lastAct` 判断在 line 669，`lastAct` 是模块级变量

**T2 遗物需要的事件**（Story 28.2 将实现）：
- `campfire_ember`：`on_skill_purchase` 递增计数，`on_act_end` 重置计数
- `star_chart`：`on_enchantment_acquire` 递增计数
- `entropy`：`on_battle_start`/`on_battle_end`（已有 trigger，无需本 Story）
- `schrodinger_dice`：`on_battle_end`（已有 trigger，无需本 Story）

### 架构模式

**遵循已有 trigger 注入模式**：
- 不修改 `EffectPipeline` 或 `ModifierRegistry` — trigger 是纯字符串过滤
- 在业务代码（shop.ts/battle.ts）中调用 `resolveRelicEffectsWithBehaviors(trigger, context)`
- 参考 battle.ts 中已有的 `on_battle_start`/`on_battle_end` 调用方式

**on_act_end 时序注意**：
- 必须在 `lastAct` 更新前触发（否则 context 丢失旧 act 编号）
- `lastAct` 在 line 671 更新（`lastAct = currentAct`），钩子应在 line 669-670 之间

### Project Structure Notes

- 类型扩展在 `src/src/systems/modifiers/ModifierTypes.ts`（现有文件，纯追加）
- 商店集成在 `src/src/systems/shop.ts`（import + 2 行调用）
- 战斗集成在 `src/src/systems/battle.ts`（1 行调用，已 import RelicPipeline）
- 测试新建 `src/tests/unit/systems/relics/relics.event-hooks.test.ts`

### References

- [Source: docs/planning-artifacts/relic-implementation-plan.md#Epic 4 - Story 4.1/4.2]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — ModifierTrigger 联合类型 line 15-22]
- [Source: src/src/systems/shop.ts — executePurchase line 520-558, applyEnchantment line 750-760]
- [Source: src/src/systems/battle.ts — startLevel line 661-685, act transition line 669-671]
- [Source: src/src/systems/relics/RelicPipeline.ts — resolveRelicEffectsWithBehaviors line 48-58]
- [Source: docs/implementation-artifacts/27-5-new-t5-t6-t7-relics.md — relicStates 基础设施已完成]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: ModifierTypes.ts 扩展 — 添加 3 个新 ModifierTrigger 值 + 5 个 PipelineContext 字段。纯追加，零破坏性。
- Task 2: shop.ts 钩子集成 — executePurchase() 末尾添加 on_skill_purchase 调用，applyEnchantment() 中添加 on_enchantment_acquire 调用。import 更新为包含 resolveRelicEffectsWithBehaviors。
- Task 3: battle.ts 钩子集成 — startLevel() act 切换块中添加 on_act_end 调用，带 `lastAct > 0` 守卫防止首次进入误触发。
- Task 4: 16 个新测试覆盖类型编译、管道 resolve、无遗物安全空操作、多遗物并发。
- 全量回归：248 relic tests pass / 全部非 audio 测试通过
- Code Review: 修复 3 MEDIUM（死代码清理、as 断言移除、补充正向测试）+ 3 LOW（合并 import、提取 testMod 工厂）

### Change Log

- 2026-03-07: Story 28.1 实现完成 — 3 个新事件钩子 + 14 个测试
- 2026-03-07: Code Review 修复 — 清理死代码、移除 as 断言、补充 2 个正向 modifier 测试 (14→16)

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — 修改：+3 ModifierTrigger, +5 PipelineContext 字段
- `src/src/systems/shop.ts` — 修改：+1 import, +2 钩子调用
- `src/src/systems/battle.ts` — 修改：+1 钩子调用（含 lastAct>0 守卫）
- `src/tests/unit/systems/relics/relics.event-hooks.test.ts` — 新建：16 个测试
