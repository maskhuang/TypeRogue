# Story 28.3: T2 遗物机制差异化重设计（ramen / entropy / schrodinger_dice）

Status: done

## Story

As a 玩家,
I want ramen、entropy、schrodinger_dice 三个遗物拥有各自独特的机制定位,
so that 风险回报遗物不再同质化（全是"无条件得分倍率 + 被动消耗"），构筑选择更有深度。

## Acceptance Criteria

1. **ramen（拉面）** — 速度奖励型：快速完词（<2s）得分 +30%，慢速（>4s）得分 -20%；移除打错衰减机制和 relicStates
2. **entropy（熵增）** — 资源产出型：资源产出 +30%，每过 1 关 -5%，归零时消失；从 on_word_complete 改为 on_skill_trigger
3. **schrodinger_dice（薛定谔骰子）** — 动态倍率型：初始得分 ×1.25，每关结束 50% 翻倍 / 50% 消失；relicStates 存储当前倍率
4. **描述更新** — 三个遗物的 description 与新机制一致
5. **测试覆盖** — 更新 relics.t2.test.ts 中对应的测试用例

## Tasks / Subtasks

- [x] Task 1: ramen 重设计 — 速度条件型 (AC: #1, #4)
  - [x] 1.1 `ModifierTypes.ts` — `PipelineContext` 添加 `wordElapsed?: number`（词语用时，秒）
  - [x] 1.2 `ModifierTypes.ts` — `ModifierCondition` 添加两个条件类型：
    - `{ type: 'word_time_lt'; value: number }` — 完词用时小于 N 秒
    - `{ type: 'word_time_gt'; value: number }` — 完词用时大于 N 秒
  - [x] 1.3 `ConditionEvaluator.ts` — 添加 `word_time_lt` 和 `word_time_gt` 评估逻辑：
    - `word_time_lt`: `(ctx.wordElapsed ?? 0) < condition.value`
    - `word_time_gt`: `(ctx.wordElapsed ?? Infinity) > condition.value`
  - [x] 1.4 `battle.ts` — on_word_complete 上下文传入 `wordElapsed`：
    - 当前代码 `wordElapsed = Math.max(0, wordStartTime - state.time)` 已在 line 342 计算
    - 在 `resolveRelicEffectsWithBehaviors('on_word_complete', { ... })` 的 context 中添加 `wordElapsed`
  - [x] 1.5 `data/relics.ts` — RELICS.ramen 更新：
    - description: `'快速完词(<2s) 得分 +30%，慢速(>4s) 得分 -20%'`
    - effects: 改为两条条件效果（展示用）
  - [x] 1.6 `data/relics.ts` — RELIC_MODIFIER_DEFS.ramen 重写工厂：
    - 不再读取 `ctx.relicStates`
    - 返回两个条件修饰器：
      ```
      relicMod(id, 'fast', 'on_word_complete', 'calculate', {
        effect: { type: 'multiply', value: 0.3, stacking: 'additive' },
        condition: { type: 'word_time_lt', value: 2 },
      })
      relicMod(id, 'slow', 'on_word_complete', 'calculate', {
        effect: { type: 'multiply', value: -0.2, stacking: 'additive' },
        condition: { type: 'word_time_gt', value: 4 },
      })
      ```
  - [x] 1.7 `battle.ts` — 删除 ramen on_error 衰减逻辑（lines 288-299）
  - [x] 1.8 `RelicPipeline.ts` — INITIAL_VALUES 删除 `ramen: 1.5`

- [x] Task 2: entropy 重设计 — 资源产出型 (AC: #2, #4)
  - [x] 2.1 `data/relics.ts` — RELICS.entropy 更新：
    - description: `'资源产出 +30%，每过 1 关 -5%，归零时消失'`
    - effects: 改为 `on_skill_trigger` 展示
  - [x] 2.2 `data/relics.ts` — RELIC_MODIFIER_DEFS.entropy 重写工厂：
    - trigger 从 `on_word_complete` 改为 `on_skill_trigger`
    - layer 从 `base` 改为 `global`（作为 skill 倍率乘算）
    - effect type 从 `multiply` 改为 `score`（`resolveRelicSkillTrigger` 消费 `effects.score`）
    - 值：`1 + (pct / 100)`（如 30% → 1.30）作为 multiplicative stacking
    - 注意：`resolveRelicSkillTrigger` 返回 `result.effects.score || 1`，最终乘入 `relicMult` → `totalMult = enchMult * relicMult`
    ```
    entropy: (id, ctx) => {
      const pct = ctx?.relicStates?.['entropy'] ?? 30
      if (pct <= 0) return []
      return [
        relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
          layer: 'global',
          effect: { type: 'score', value: 1 + pct / 100, stacking: 'multiplicative' },
        }),
      ]
    }
    ```
  - [x] 2.3 battle.ts entropy 衰减逻辑 — 无需修改（已在 on_battle_end 后 -5 / 归零消失）

- [x] Task 3: schrodinger_dice 重设计 — 动态倍率型 (AC: #3, #4)
  - [x] 3.1 `data/relics.ts` — RELICS.schrodinger_dice 更新：
    - description: `'得分 ×1.25，每关结束 50% 翻倍 / 50% 消失'`
    - effects: 更新展示值
  - [x] 3.2 `data/relics.ts` — RELIC_MODIFIER_DEFS.schrodinger_dice 重写工厂：
    - 读取 `ctx.relicStates['schrodinger_dice']` 作为当前倍率（初始 1.25）
    - `multiply = state - 1.0`（1.25 → 0.25, 2.50 → 1.50 ...）
    ```
    schrodinger_dice: (id, ctx) => {
      const mult = ctx?.relicStates?.['schrodinger_dice'] ?? 1.25
      if (mult <= 1.0) return []
      return [
        relicMod(id, 'boost', 'on_word_complete', 'calculate', {
          effect: { type: 'multiply', value: mult - 1.0, stacking: 'additive' },
        }),
      ]
    }
    ```
  - [x] 3.3 `RelicPipeline.ts` — INITIAL_VALUES 更新 `schrodinger_dice: 1.25`（原 1）
  - [x] 3.4 `battle.ts` — schrodinger_dice 判定逻辑重写（on_battle_end 后）：
    - 概率从 25% 改为 50%：`random() < 0.5`
    - 50% 翻倍：`relicStates['schrodinger_dice'] *= 2` + showFeedback('骰子翻倍！×' + newMult, '#ffdd00')
    - 50% 消失：移除遗物 + 删除 relicStates + showFeedback('骰子消失了...', '#999')

- [x] Task 4: 测试更新 (AC: #5)
  - [x] 4.1 `relics.t6t7.test.ts` — ramen 测试改写（原 T7 测试文件）：
    - 测试 word_time_lt 条件（wordElapsed < 2 → multiply +0.3）
    - 测试 word_time_gt 条件（wordElapsed > 4 → multiply -0.2）
    - 测试中间区间（2 ≤ wordElapsed ≤ 4 → 无效果）
    - 测试边界值（=2 不触发快速，=4 不触发慢速）
    - initRelicState 测试更新（ramen 无状态）
  - [x] 4.2 `relics.t2.test.ts` — entropy 测试改写：
    - 测试 trigger 为 on_skill_trigger
    - 测试 layer 为 global、effect type 为 score、stacking 为 multiplicative
    - 测试 pct=30 → score=1.30
    - 管道 resolve 使用 dummy base=1 + on_skill_trigger
  - [x] 4.3 `relics.t2.test.ts` — schrodinger_dice 测试改写：
    - 测试 relicStates=1.25 → multiply=0.25
    - 测试 relicStates=2.50 → multiply=1.50（翻倍后）
    - 测试 relicStates=undefined → 默认 1.25
    - 翻倍链模拟：1.25 → 2.50 → 5.00
  - [x] 4.4 `ConditionEvaluator.test.ts` — 添加 word_time_lt / word_time_gt 条件测试（8 个新测试）

## Dev Notes

### ramen 重设计要点

**从状态型 → 条件型**：ramen 从 T7（relicStates 衰减）变为 T1 风格（条件判断，无状态）。

当前 `wordElapsed` 已在 battle.ts:342 计算：`Math.max(0, wordStartTime - state.time)`（倒计时制：开始时间 - 当前时间 = 用时秒数）。但未传入 PipelineContext。

需删除的旧代码：
- battle.ts:288-299：on_error 中的 ramen 衰减逻辑
- RelicPipeline.ts INITIAL_VALUES 中的 `ramen: 1.5`

### entropy 重设计要点

**从得分型 → 资源产出型**：entropy 从 on_word_complete multiply（影响 bonusMult → 词语分数）改为 on_skill_trigger score（影响 relicMult → 技能产出倍率）。

关键管道：
- `resolveRelicSkillTrigger()` (RelicPipeline.ts:101-125) 返回 `result.effects.score || 1`
- `getRelicSkillMultiplier()` (skills.ts:101-106) 调用上述函数
- 用于 `triggerProducer` (skills.ts:351) 和 `triggerConverter` (skills.ts:438)：`totalMult = enchMult * relicMult`

现有 overcharge 遗物已使用 on_skill_trigger + global 层 + score 类型 + multiplicative stacking 的模式（relics.ts:717-726），entropy 遵循同一模式。

衰减逻辑（battle.ts on_battle_end 后 -5 / 归零消失）无需修改。

### schrodinger_dice 重设计要点

**从固定倍率 → 动态状态倍率**：relicStates 从存在标记（1）改为存储当前倍率值（初始 1.25）。

battle.ts 判定逻辑变化：
- 旧：25% 消失（`random() < 0.25` → remove）
- 新：50% 翻倍 / 50% 消失（`random() < 0.5` → `state *= 2` / remove）

### Project Structure Notes

- 条件类型定义：`src/src/systems/modifiers/ModifierTypes.ts` (ModifierCondition union)
- 条件评估器：`src/src/systems/modifiers/ConditionEvaluator.ts`
- 管道上下文：`src/src/systems/modifiers/ModifierTypes.ts` (PipelineContext interface)
- 遗物数据+工厂：`src/src/data/relics.ts`
- 遗物状态初始化：`src/src/systems/relics/RelicPipeline.ts` (INITIAL_VALUES)
- 战斗系统：`src/src/systems/battle.ts`
- 技能触发倍率：`src/src/systems/skills.ts` (getRelicSkillMultiplier)

### References

- [Source: docs/implementation-artifacts/28-2-t2-cumulative-relics.md — 原始 T2 遗物实现]
- [Source: src/src/systems/modifiers/ModifierTypes.ts:62-110 — ModifierCondition 类型定义]
- [Source: src/src/systems/modifiers/ModifierTypes.ts:132-181 — PipelineContext 接口]
- [Source: src/src/systems/modifiers/ConditionEvaluator.ts — 34 种条件评估]
- [Source: src/src/data/relics.ts:352-435 — ramen/entropy/schrodinger_dice 当前数据]
- [Source: src/src/data/relics.ts:660-714 — ramen/entropy/schrodinger_dice 当前工厂]
- [Source: src/src/systems/relics/RelicPipeline.ts:101-125 — resolveRelicSkillTrigger]
- [Source: src/src/systems/relics/RelicPipeline.ts:131-142 — INITIAL_VALUES]
- [Source: src/src/systems/battle.ts:288-299 — ramen on_error 衰减]
- [Source: src/src/systems/battle.ts:342-358 — wordElapsed 计算 + on_word_complete context]
- [Source: src/src/systems/battle.ts:511-529 — entropy/schrodinger_dice battle_end 逻辑]
- [Source: src/src/systems/skills.ts:101-106,351,438 — getRelicSkillMultiplier 使用点]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: ramen 从 T7 状态衰减型重设计为 T1 速度条件型。新增 `wordElapsed` 到 PipelineContext，新增 `word_time_lt`/`word_time_gt` 条件类型到 ModifierCondition + ConditionEvaluator。工厂返回 2 个条件修饰器（快 +30%/慢 -20%）。删除 battle.ts on_error 衰减逻辑 + INITIAL_VALUES 中的 ramen 条目。
- Task 2: entropy 从得分倍率型改为资源产出型。trigger 从 on_word_complete → on_skill_trigger，layer 从 base → global，effect type 从 multiply → score，stacking 从 additive → multiplicative。通过 resolveRelicSkillTrigger → getRelicSkillMultiplier 管道影响所有技能产出倍率。衰减逻辑不变。
- Task 3: schrodinger_dice 从固定倍率改为动态状态倍率。INITIAL_VALUES 从 1 → 1.25。工厂读取 relicStates 计算 multiply。battle.ts 判定从 25% 消失改为 50% 翻倍 / 50% 消失。
- Task 4: 更新 3 个测试文件共 22 个测试改写/新增。relics.t6t7.test.ts ramen 从 7 测试改写为 7 测试（速度条件型）+ initRelicState 更新。relics.t2.test.ts entropy 从 8 测试改写为 11 测试（on_skill_trigger + global + score）、schrodinger_dice 从 5 测试改写为 8 测试（动态倍率）、叠加测试拆分为 on_word_complete + on_skill_trigger 两管道、状态模拟更新。ConditionEvaluator.test.ts +8 新测试。
- 全量回归：2790 pass / 0 fail
- Code Review: 修复 1 HIGH（word_time_lt/gt 默认值矛盾 bug）+ 2 MEDIUM（battle.ts/RunState.ts 过时注释）+ 1 LOW（条件计数 34→36）。L2 跳过（effects 展示字段不影响游戏逻辑）。

### Change Log

- 2026-03-07: Story 28.3 实现完成 — 3 个遗物机制差异化重设计 + 条件系统扩展 + 测试全面更新
- 2026-03-07: Code Review 修复 — word_time_lt/gt 默认值 bug（H1）、注释更新（M1+M2+L1）

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — 修改：PipelineContext +wordElapsed, ModifierCondition +word_time_lt/word_time_gt
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 修改：+word_time_lt/word_time_gt 评估逻辑, 默认值修复, 条件计数 34→36
- `src/src/data/relics.ts` — 修改：ramen/entropy/schrodinger_dice RELICS 数据 + RELIC_MODIFIER_DEFS 工厂重写
- `src/src/systems/relics/RelicPipeline.ts` — 修改：INITIAL_VALUES 删除 ramen, schrodinger_dice 1→1.25
- `src/src/systems/battle.ts` — 修改：on_word_complete context +wordElapsed, 删除 ramen on_error 衰减, schrodinger_dice 判定 25%→50% 翻倍/消失, 注释更新
- `src/src/core/state/RunState.ts` — 修改：relicStates 注释更新
- `src/tests/unit/systems/relics/relics.t2.test.ts` — 修改：entropy/schrodinger_dice 测试重写 + 叠加测试拆分
- `src/tests/unit/systems/relics/relics.t6t7.test.ts` — 修改：ramen 测试重写为速度条件型 + initRelicState 更新
- `src/tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 修改：+8 word_time_lt/word_time_gt 测试, 默认值测试修正
