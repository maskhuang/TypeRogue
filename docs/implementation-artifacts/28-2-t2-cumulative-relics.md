# Story 28.2: T2 累积成长遗物（4 个新遗物）

Status: done

## Story

As a 玩家,
I want 获得会随行为累积变化的成长型遗物（篝火余烬、星图罗盘、熵增、薛定谔骰子）,
so that Run 中的购买技能、获取附魔、推进关卡等决策都与遗物策略深度关联，创造动态变化的构筑体验。

## Acceptance Criteria

1. **campfire_ember（篝火余烬）** — Rare, 每购买 1 个技能全体效果 +5%（同幕内累积），幕结束重置为 0
2. **star_chart（星图罗盘）** — Rare, 每获得 1 个附魔全体效果永久 +8%（Run 内不重置）
3. **entropy（熵增）** — Rare, 全体效果 +30% 初始，每过 1 关 -5%，降至 ≤0% 时自动消失
4. **schrodinger_dice（薛定谔骰子）** — Rare, 分数 ×1.5，每关结束 25% 概率消失
5. **relicStates 初始化** — 4 个遗物均在获取时写入 `relicStates` 初始值，移除时清理
6. **图标唯一** — 4 个新遗物图标不与现有 181 图标冲突
7. **测试覆盖** — ≥25 个新测试覆盖 4 个遗物的累积、衰减、重置、自毁逻辑

## Tasks / Subtasks

- [x] Task 1: 遗物数据定义 (AC: #1-4, #6)
  - [x] 1.1 `src/src/data/relics.ts` — RELICS 添加 `campfire_ember` 数据（稀有, 🏕️, basePrice 50）
  - [x] 1.2 RELICS 添加 `star_chart` 数据（稀有, 🧭, basePrice 55）
  - [x] 1.3 RELICS 添加 `entropy` 数据（稀有, 🌑, basePrice 45, category: 'risk-reward'）
  - [x] 1.4 RELICS 添加 `schrodinger_dice` 数据（稀有, 🎭, basePrice 50, category: 'risk-reward'）
  - [x] 1.5 验证 4 个图标不与现有 181 个冲突（跨技能/附魔/增幅者/遗物/Boss）

- [x] Task 2: Modifier 工厂函数 (AC: #1-4)
  - [x] 2.1 `src/src/data/relics.ts` — RELIC_MODIFIER_DEFS 添加 `campfire_ember` 工厂：
    - trigger: `on_word_complete`，layer: `base`，effect: `multiply`（additive stacking → bonusMult）
    - 值 = `(ctx?.relicStates?.['campfire_ember'] ?? 0) * 0.05`
    - 累积值为 0 时返回空数组（无效果）
  - [x] 2.2 RELIC_MODIFIER_DEFS 添加 `star_chart` 工厂：
    - trigger: `on_word_complete`，layer: `base`，effect: `multiply`
    - 值 = `(ctx?.relicStates?.['star_chart'] ?? 0) * 0.08`
    - 累积值为 0 时返回空数组
  - [x] 2.3 RELIC_MODIFIER_DEFS 添加 `entropy` 工厂：
    - trigger: `on_word_complete`，layer: `base`，effect: `multiply`
    - 值 = `(ctx?.relicStates?.['entropy'] ?? 30) / 100`
    - ≤0 时返回空数组
  - [x] 2.4 RELIC_MODIFIER_DEFS 添加 `schrodinger_dice` 工厂：
    - trigger: `on_word_complete`，layer: `base`，effect: `multiply`
    - 固定值 = `0.5`（即 ×1.5）

- [x] Task 3: relicStates 初始化 (AC: #5)
  - [x] 3.1 `src/src/systems/relics/RelicPipeline.ts` — `initRelicState` 的 `INITIAL_VALUES` 添加：
    - `campfire_ember: 0`（购买计数，从 0 开始）
    - `star_chart: 0`（附魔计数，从 0 开始）
    - `entropy: 30`（初始 30% 加成）
    - `schrodinger_dice: 1`（存在标记）

- [x] Task 4: 状态更新逻辑 (AC: #1-4)
  - [x] 4.1 `src/src/systems/battle.ts` — `showGoldReward()` on_battle_end 后添加：
    - entropy 衰减：`relicStates['entropy'] -= 5`，≤0 时移除遗物 + 删除 relicStates + showFeedback
    - schrodinger_dice 判定：25% 概率（`random() < 0.25` 使用 seededRandom）移除遗物 + 删除 relicStates + showFeedback
  - [x] 4.2 `src/src/systems/shop.ts` — on_skill_purchase 钩子后添加：
    - campfire_ember：`relicStates['campfire_ember'] = (relicStates['campfire_ember'] ?? 0) + 1`
  - [x] 4.3 `src/src/systems/shop.ts` — on_enchantment_acquire 钩子后添加：
    - star_chart：`relicStates['star_chart'] = (relicStates['star_chart'] ?? 0) + 1`
  - [x] 4.4 `src/src/systems/battle.ts` — on_act_end 钩子后添加：
    - campfire_ember：`relicStates['campfire_ember'] = 0`

- [x] Task 5: 测试 (AC: #7)
  - [x] 5.1 新建 `tests/unit/systems/relics/relics.t2.test.ts` — 39 个测试覆盖全部 4 个遗物
  - [x] 5.2 更新 `tests/unit/systems/relics/relics.test.ts` — 遗物数量 23→27，稀有度 4c+16r→4c+20r，getAllRelicIds/getAllRelics 23→27
  - [x] 5.3 更新 `tests/unit/systems/relics/relics.t1.test.ts` + `relics.t5.test.ts` — RELIC_MODIFIER_DEFS 23→27
  - [x] 5.4 更新 `tests/unit/data/iconRegistry.test.ts` — 图标总数 181→185

## Dev Notes

### 现有代码分析（必须了解）

**当前遗物数量**：23 个（4 common + 16 rare + 3 legendary）
**当前图标总数**：181 个（含所有技能/附魔/增幅者/遗物图标）
**当前 RELIC_MODIFIER_DEFS 数量**：23 个

**relicStates 基础设施已就绪**（Story 27.5 完成）：
- `state.player.relicStates: Record<string, number>` — 运行时状态
- `RunStateData.relicStates` — 序列化/反序列化支持
- `initRelicState()` — 在遗物获取时调用，写入 `INITIAL_VALUES`
- `getRelicState()` / `setRelicState()` — 读写辅助函数
- `resolveRelicEffects()` 自动注入 `relicStates` 到工厂 context

**事件钩子已就绪**（Story 28.1 完成）：
- `on_skill_purchase`：shop.ts:559, context: `{ purchasedSkillId, isUpgrade }`
- `on_enchantment_acquire`：shop.ts:765, context: `{ enchantedSkillId, enchantmentId }`
- `on_act_end`：battle.ts:672, context: `{ endedAct }`，带 `lastAct > 0` 首次进入守卫

**已有 on_battle_end 钩子**（用于 entropy 和 schrodinger_dice）：
- battle.ts 已有 `resolveRelicEffects('on_battle_end', ...)` 和行为执行
- `remove_relic` behavior 已实现（perfectionist 遗物使用）

### 4 个遗物详细设计

**campfire_ember（篝火余烬）** — Rare, basePrice: 50
- 触发：`on_word_complete`（效果应用），`on_skill_purchase`（递增计数），`on_act_end`（重置计数）
- 状态：`relicStates['campfire_ember']` = 购买技能计数（幕内累积）
- 效果：`multiply = count * 0.05`（购买 1 个 +5%，2 个 +10%...）
- 重置：幕切换时归零
- 设计意图：创造"本幕内尽量多买技能"的策略压力（Balatro 篝火映射）

**star_chart（星图罗盘）** — Rare, basePrice: 55
- 触发：`on_word_complete`（效果应用），`on_enchantment_acquire`（递增计数）
- 状态：`relicStates['star_chart']` = 附魔获取计数（永久累积）
- 效果：`multiply = count * 0.08`（附魔 1 个 +8%，2 个 +16%...）
- 不重置：Run 内永久生效
- 设计意图：奖励把技能升到 Lv3 获取附魔，长线投资回报

**entropy（熵增）** — Rare, basePrice: 45, category: 'risk-reward'
- 触发：`on_word_complete`（效果应用），`on_battle_end`（衰减）
- 状态：`relicStates['entropy']` = 当前加成百分比（初始 30）
- 效果：`multiply = current / 100`（30% → 0.30，25% → 0.25...）
- 衰减：每关结束 -5，≤0 时自动消失（删除遗物 + relicStates）
- 设计意图：前期极强后期消退，创造"趁强势期推进"的紧迫感（Balatro 爆米花映射）
- 寿命：最多 6 关（30/5=6），第 7 关前消失

**schrodinger_dice（薛定谔骰子）** — Rare, basePrice: 50, category: 'risk-reward'
- 触发：`on_word_complete`（效果应用），`on_battle_end`（自毁判定）
- 状态：`relicStates['schrodinger_dice']` = 存在标记（1=存在）
- 效果：固定 `multiply = 0.5`（×1.5 分数）
- 自毁：每关结束 25% 概率消失
- 设计意图：高方差刺激感，每关结算时的紧张时刻（Balatro 香蕉映射）

### 状态更新实现要点

**关键决策：状态更新放在哪里？**

方案 A（推荐）：在业务代码中直接更新 relicStates
- shop.ts `executePurchase()` 末尾：`campfire_ember` 计数递增
- shop.ts `applyEnchantment()` 末尾：`star_chart` 计数递增
- battle.ts `on_battle_end` 处理后：entropy 衰减 + schrodinger_dice 判定
- battle.ts `on_act_end` 处理后：campfire_ember 重置

**为什么不用 Modifier behavior？**
- 状态更新是副作用，不是数值计算
- `setRelicState` 调用必须在 factory 调用之后（否则下次 factory 用旧值）
- 直接在钩子调用后操作 `state.player.relicStates` 更直接、更可测试
- 参考 ramen 衰减模式（battle.ts 中直接操作 relicStates）

### 浮点精度注意

- entropy 使用整数百分比（30, 25, 20...）避免浮点问题
- campfire_ember 和 star_chart 使用整数计数器，乘法在工厂内完成
- 参考 ramen 的 `Math.round((curr - 0.1) * 10) / 10` 模式

### 随机性注意

- schrodinger_dice 的 25% 判定使用 `Math.random() < 0.25`
- 如果项目有 seededRandom 系统，考虑使用 `random()` 替代（检查 `src/src/core/seededRandom.ts`）

### Project Structure Notes

- 遗物数据在 `src/src/data/relics.ts`（RELICS + RELIC_MODIFIER_DEFS）
- 状态初始化在 `src/src/systems/relics/RelicPipeline.ts`（INITIAL_VALUES）
- 状态更新在 `src/src/systems/battle.ts` 和 `src/src/systems/shop.ts`
- 测试新建 `src/tests/unit/systems/relics/relics.t2.test.ts`

### References

- [Source: docs/planning-artifacts/relic-implementation-plan.md#Epic 4 - Story 4.2]
- [Source: docs/planning-artifacts/relic-system-redesign.md#T2 累积成长型]
- [Source: docs/implementation-artifacts/27-5-new-t5-t6-t7-relics.md — relicStates 模式参考]
- [Source: docs/implementation-artifacts/28-1-t2-event-hooks.md — 事件钩子集成完成]
- [Source: src/src/data/relics.ts — 23 个遗物, relicMod 工厂辅助函数]
- [Source: src/src/systems/relics/RelicPipeline.ts — initRelicState INITIAL_VALUES]
- [Source: src/src/systems/battle.ts — on_battle_end 遗物处理, on_act_end 钩子]
- [Source: src/src/systems/shop.ts — on_skill_purchase 钩子, on_enchantment_acquire 钩子]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: RELICS 添加 4 个 T2 遗物。图标 🏕️🧭🌑🎭 跨类型验证无冲突（185 总图标）。
- Task 2: RELIC_MODIFIER_DEFS 添加 4 个工厂。遵循 ramen/resource_flood 模式：base 层 multiply 加算 → effects.multiply → battle.ts bonusMult。
- Task 3: initRelicState INITIAL_VALUES 添加 4 项。
- Task 4: 状态更新逻辑 — battle.ts 添加 entropy 衰减 + schrodinger_dice 25% 自毁（使用 seededRandom），shop.ts 添加 campfire_ember/star_chart 递增，battle.ts 添加 campfire_ember 幕重置。
- Task 5: 39 个新测试 + 更新 5 个现有测试文件的计数断言。
- 注意：Story spec 中 layer 描述为 `global`，实际实现使用 `base` 层（遵循 ramen/resource_flood 等已有遗物模式）。multiply 类型 base 层加算 → effects.multiply 被 battle.ts `bonusMult += effects.multiply` 消费。
- 全量回归：2772 pass / 0 fail
- Code Review: 修复 3 MEDIUM（测试描述矛盾、schrodinger_dice 硬编码 id、状态变化模拟测试）+ 2 LOW（死代码清理、L2 跳过）。测试 39→43。

### Change Log

- 2026-03-07: Story 28.2 实现完成 — 4 个 T2 遗物 + 39 个测试
- 2026-03-07: Code Review 修复 — 测试描述修正、schrodinger_dice 工厂参数化、死代码清理、+4 状态模拟测试 (39→43)

### File List

- `src/src/data/relics.ts` — 修改：+4 RELICS 条目, +4 RELIC_MODIFIER_DEFS 工厂, schrodinger_dice 工厂参数化
- `src/src/systems/relics/RelicPipeline.ts` — 修改：+4 INITIAL_VALUES 条目
- `src/src/systems/battle.ts` — 修改：+entropy 衰减, +schrodinger_dice 判定, +campfire_ember 幕重置
- `src/src/systems/shop.ts` — 修改：+campfire_ember 递增, +star_chart 递增
- `src/tests/unit/systems/relics/relics.t2.test.ts` — 新建：43 个测试（含 4 个状态模拟）
- `src/tests/unit/systems/relics/relics.test.ts` — 修改：计数 23→27, 16r→20r
- `src/tests/unit/systems/relics/relics.t1.test.ts` — 修改：DEFS 计数 23→27
- `src/tests/unit/systems/relics/relics.t5.test.ts` — 修改：DEFS 计数 23→27
- `src/tests/unit/data/iconRegistry.test.ts` — 修改：图标总数 181→185
