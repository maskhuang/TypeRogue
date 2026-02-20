# Story 11.5: 现有技能迁移

Status: done

## Story

As a 开发者,
I want 将现有 10 个技能从 skills.ts 的 switch/case 硬编码迁移到 Modifier 工厂 + EffectPipeline + BehaviorExecutor 的统一管道,
so that 技能效果通过三层管道计算，为 Epic 12 技能扩充和 Epic 13 遗物重做提供标准化的效果处理基础。

## Acceptance Criteria

1. 新增 `SKILL_MODIFIER_DEFS` 映射表 in `data/skills.ts` — 为所有 10 个技能定义 Modifier 工厂函数 `(skillId, level, context?) => Modifier[]`
2. `triggerSkill()` 不再使用 switch/case — 改为 scoped ModifierRegistry + `EffectPipeline.resolve()` + `BehaviorExecutor.execute()`
3. 简单技能（burst, amp, freeze, shield）通过 base 层 calculate 阶段效果实现，数值 = `base + grow * (lvl - 1)`
4. 联动技能数值正确：core 使用 `context.adjacentSkillCount` 动态计算相邻加成; aura 使用 enhance 层 `1.5` 乘法; lone 使用条件 `skills_triggered_this_word === 1`; void 使用 `context.skillsTriggeredThisWord` 动态扣减
5. 行为技能：echo 使用 after 阶段 `trigger_adjacent` 行为 + BehaviorExecutor 回调; ripple 使用 after 阶段 `buff_next_skill` 行为 + 回调
6. 光环加成通过 enhance 层 Modifier 实现（替代 pre-switch `auraBonus` 硬编码）
7. 涟漪加成通过 global 层临时 Modifier 实现（替代 pre-switch `synergy.rippleBonus` 硬编码）
8. `applyEffects()` 将 `PipelineResult.effects` 映射到游戏状态：`score → wordScore (×state.multiplier)`, `multiply → state.multiplier`, `time → state.time (capped)`, `shield → synergy.shieldCount`
9. 每个技能的 feedback 文本和颜色保持与当前完全一致
10. echo 被动触发（相邻 echo 随机触发）行为保持不变
11. echo 主动触发使用 `setTimeout(100ms)` 保持当前触发时序
12. 删除 triggerSkill 中的 switch/case 代码块 + pre-switch 的硬编码 aura/ripple 逻辑
13. 单元测试覆盖：10 个技能 Modifier 工厂 + pipeline 解析 + 效果应用 + 行为回调 + 交叉效果（aura+burst, ripple+burst）
14. 所有现有测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 定义 SKILL_MODIFIER_DEFS 工厂映射 (AC: #1, #3, #4, #5)
  - [x] 1.1 在 `data/skills.ts` 添加工厂类型 `SkillModifierFactory = (skillId: string, level: number, context?: PipelineContext) => Modifier[]`
  - [x] 1.2 实现 burst 工厂: base 层, score, value = `base + grow*(lvl-1)`, stacking: 'additive'
  - [x] 1.3 实现 amp 工厂: base 层, multiply, value = `(base + grow*(lvl-1)) / 100`
  - [x] 1.4 实现 freeze 工厂: base 层, time, value = `base + grow*(lvl-1)`
  - [x] 1.5 实现 shield 工厂: base 层, shield, value = `base + grow*(lvl-1)`
  - [x] 1.6 实现 core 工厂: base 层, score, value = `val + (context?.adjacentSkillCount ?? 0) * 2`
  - [x] 1.7 实现 aura 工厂: 返回 2 个 Modifier —
    - base 层 score (自身触发时 `val / 3`)
    - enhance 层 score multiplicative `1.5` (相邻 score 技能加成)
  - [x] 1.8 实现 lone 工厂: base 层, score, condition: `{ type: 'skills_triggered_this_word', value: 1 }`
  - [x] 1.9 实现 echo 工厂: after 阶段, behavior: `{ type: 'trigger_adjacent' }` (无条件，isEcho 由调用方处理)
  - [x] 1.10 实现 void 工厂: base 层, score, value = `Math.max(0, val - ((context?.skillsTriggeredThisWord ?? 0) - 1))`
  - [x] 1.11 实现 ripple 工厂: 返回 2 个 Modifier —
    - base 层 score (value = val)
    - after 阶段 behavior: `{ type: 'buff_next_skill', multiplier: 1.5 }`

- [x] Task 2: 定义技能反馈配置 (AC: #9)
  - [x] 2.1 在 `systems/skills.ts` 的 `generateFeedback()` 函数中实现（switch 替代独立映射表，更简洁）
  - [x] 2.2 burst: `+${score}分` #4ecdc4
  - [x] 2.3 amp: `倍率+${multiply.toFixed(1)}` #ffe66d
  - [x] 2.4 freeze: `+${time}秒` #87ceeb
  - [x] 2.5 shield: `护盾+${shield}` #87ceeb
  - [x] 2.6 core: `核心+${score}` #9b59b6
  - [x] 2.7 aura: 无反馈（静默加分）
  - [x] 2.8 lone (active): `孤狼! +${score}` #e74c3c; lone (inactive): `孤狼失效...` #666
  - [x] 2.9 echo: `共鸣!` #e056fd
  - [x] 2.10 void (penalty>0): `虚空+${score} (-${penalty})` #2c3e50; void (no penalty): `虚空+${score}` #2c3e50
  - [x] 2.11 ripple: `涟漪→${adjacentCount}` #3498db

- [x] Task 3: 实现管道集成基础函数 (AC: #2, #6, #7, #8)
  - [x] 3.1 新函数 `buildTriggerContext(triggerKey, adjacent): PipelineContext` — 从 state/synergy 构建上下文
  - [x] 3.2 新函数 `createScopedRegistry(skillId, level, triggerKey, context, isEcho): ModifierRegistry` —
    - 注册触发技能自身的 Modifier（从 SKILL_MODIFIER_DEFS 工厂生成）
    - 如果 isEcho 则过滤掉 `trigger_adjacent` 行为 Modifier
    - 注册相邻技能的 enhance/global 层 Modifier（aura 加成）
    - 如果 `synergy.rippleBonus.has(triggerKey)` 则注册 global 层 score×1.5 临时 Modifier 并删除 bonus
  - [x] 3.3 新函数 `applyEffects(effects: EffectAccumulator): void` —
    - `score > 0`: `state.wordScore += effects.score * state.multiplier`
    - `multiply > 0`: `state.multiplier += effects.multiply`
    - `time > 0`: `state.time = Math.min(state.time + effects.time, state.timeMax + 10)`
    - `shield > 0`: `synergy.shieldCount += effects.shield`
  - [x] 3.4 新函数 `generateFeedback(skillId, effects, context): { text: string, color: string } | null`

- [x] Task 4: BehaviorExecutor 回调实现 (AC: #5, #11)
  - [x] 4.1 `onTriggerAdjacent(depth)` 回调: 对相邻技能调用 `setTimeout(() => triggerSkill(..., true), 100)` 返回空 PipelineResult[]（保持异步时序）
  - [x] 4.2 `onBuffNextSkill(multiplier)` 回调: 对相邻键设置 `synergy.rippleBonus.set(adj.key, multiplier)`

- [x] Task 5: 重写 triggerSkill (AC: #2, #10, #12)
  - [x] 5.1 保持 showTriggerPopup, highlightBoundSkill, playSound 调用
  - [x] 5.2 保持 `synergy.wordSkillCount++`
  - [x] 5.3 调用 `buildTriggerContext()` 构建上下文
  - [x] 5.4 调用 `createScopedRegistry()` 构建作用域注册表
  - [x] 5.5 调用 `EffectPipeline.resolve(scopedRegistry, 'on_skill_trigger', context)`
  - [x] 5.6 调用 `applyEffects()` 应用数值效果
  - [x] 5.7 调用 `generateFeedback()` 显示技能反馈
  - [x] 5.8 调用 `BehaviorExecutor.execute()` 处理行为
  - [x] 5.9 保持 echo 被动触发逻辑（相邻 echo 随机触发）
  - [x] 5.10 删除整个 switch/case 代码块
  - [x] 5.11 删除 pre-switch 的 aura/ripple 硬编码逻辑

- [x] Task 6: 单元测试 (AC: #13, #14)
  - [x] 6.1 创建 `src/tests/unit/data/skills.modifiers.test.ts` — SKILL_MODIFIER_DEFS 工厂测试
  - [x] 6.2 测试 burst 工厂: level 1 → score value=5; level 3 → score value=9
  - [x] 6.3 测试 amp 工厂: level 1 → multiply value=0.2
  - [x] 6.4 测试 freeze 工厂: level 1 → time value=2
  - [x] 6.5 测试 shield 工厂: level 1 → shield value=1
  - [x] 6.6 测试 core 工厂: adjacentSkillCount=3 → score value=5+6=11
  - [x] 6.7 测试 aura 工厂: 返回 2 个 Modifier — base score + enhance score×1.5
  - [x] 6.8 测试 lone 工厂: 有 condition skills_triggered_this_word=1
  - [x] 6.9 测试 echo 工厂: after 阶段 trigger_adjacent 行为
  - [x] 6.10 测试 void 工厂: skillsTriggeredThisWord=3 → score value=max(0, 12-2)=10
  - [x] 6.11 测试 ripple 工厂: 2 个 Modifier — base score + after buff_next_skill
  - [x] 6.12 创建 `src/tests/unit/systems/skills.pipeline.test.ts` — pipeline 集成测试
  - [x] 6.13 测试 createScopedRegistry: burst 单独 → 1 个 base modifier
  - [x] 6.14 测试 createScopedRegistry: burst + 相邻 aura → base + enhance modifier
  - [x] 6.15 测试 createScopedRegistry: burst + ripple bonus → base + global modifier
  - [x] 6.16 测试 applyEffects: score=10, multiplier=2.0 → wordScore += 20
  - [x] 6.17 测试 applyEffects: multiply=0.2 → state.multiplier += 0.2
  - [x] 6.18 测试 applyEffects: time=2 → state.time += 2 (capped)
  - [x] 6.19 测试 applyEffects: shield=1 → synergy.shieldCount += 1
  - [x] 6.20 测试 pipeline 解析: burst Lv1 → effects.score = 5
  - [x] 6.21 测试 pipeline 解析: burst + aura enhance → effects.score = 5 * 1.5 = 7.5
  - [x] 6.22 测试 pipeline 解析: burst + ripple global → effects.score = 5 * 1.5 = 7.5
  - [x] 6.23 测试 pipeline 解析: burst + aura + ripple → effects.score = 5 * 1.5 * 1.5 = 11.25
  - [x] 6.24 测试 pipeline 解析: lone 条件满足 (skillsTriggeredThisWord=1) → effects.score = 8
  - [x] 6.25 测试 pipeline 解析: lone 条件不满足 (skillsTriggeredThisWord=2) → effects.score = 0
  - [x] 6.26 测试 pipeline 解析: echo → pendingBehaviors 含 trigger_adjacent
  - [x] 6.27 测试 pipeline 解析: echo isEcho=true → pendingBehaviors 为空
  - [x] 6.28 测试 pipeline 解析: ripple → effects.score + pendingBehaviors 含 buff_next_skill
  - [x] 6.29 测试 BehaviorExecutor 回调: onBuffNextSkill 设置 synergy.rippleBonus
  - [x] 6.30 测试 generateFeedback: 各技能反馈文本和颜色匹配
  - [x] 6.31 全部 1563 个测试通过（+63 新增），零回归

## Dev Notes

### 核心架构：Scoped Registry + Factory

**为什么用 Scoped Registry 而不是 Global Registry 直接 resolve：**
- 技能触发是"单技能触发" — 只有被按键命中的技能的 base 效果应该生效
- 交叉效果（aura enhance, ripple global）只在相邻时才加入
- Global Registry 的 `getByTrigger('on_skill_trigger')` 会返回 ALL 技能的 modifiers，导致所有技能同时生效

**Scoped Registry 构建流程：**
```
triggerSkill(skillId='burst', triggerKey='f')
  → buildTriggerContext('f', adjacent)
  → createScopedRegistry('burst', 1, 'f', context, false)
    ├─ SKILL_MODIFIER_DEFS['burst']('burst', 1, context)  → [base score +5]
    ├─ adjacent 'aura' enhance modifier                    → [enhance score ×1.5]
    └─ rippleBonus active?                                  → [global score ×1.5]
  → EffectPipeline.resolve(scopedRegistry, 'on_skill_trigger', context)
    Phase 1 (before): 无拦截
    Phase 2 (calculate): 5 × 1.5 × 1.5 = 11.25
    Phase 3 (after): 无行为
  → applyEffects({ score: 11.25, ... })
    state.wordScore += 11.25 * state.multiplier
  → generateFeedback('burst', effects, context)
    showFeedback('+17分', '#4ecdc4')  // 假设 multiplier=1.5
```

### 10 技能 Modifier 映射

| 技能 | 层级 | 阶段 | 效果类型 | 值计算 | 条件 | 行为 |
|------|------|------|---------|--------|------|------|
| burst | base | calculate | score | val | - | - |
| amp | base | calculate | multiply | val/100 | - | - |
| freeze | base | calculate | time | val | - | - |
| shield | base | calculate | shield | val | - | - |
| core | base | calculate | score | val + adjCount*2 | - | - |
| aura (self) | base | calculate | score | val/3 | - | - |
| aura (enhance) | enhance | calculate | score | 1.5 | - | - |
| lone | base | calculate | score | val | skills_triggered=1 | - |
| echo | base | after | - | - | - | trigger_adjacent |
| void | base | calculate | score | max(0, val - (triggered-1)) | - | - |
| ripple (score) | base | calculate | score | val | - | - |
| ripple (buff) | base | after | - | - | - | buff_next_skill(1.5) |

**val = base + grow × (level - 1)**

### SKILL_MODIFIER_DEFS 工厂签名

```typescript
export type SkillModifierFactory = (
  skillId: string,
  level: number,
  context?: PipelineContext,
) => Modifier[]

export const SKILL_MODIFIER_DEFS: Record<string, SkillModifierFactory> = {
  burst: (id, lvl) => [/* base score */],
  amp: (id, lvl) => [/* base multiply */],
  freeze: (id, lvl) => [/* base time */],
  shield: (id, lvl) => [/* base shield */],
  core: (id, lvl, ctx) => [/* base score + adjacent bonus */],
  aura: (id, lvl) => [/* base score/3, enhance score×1.5 */],
  lone: (id, lvl) => [/* conditional base score */],
  echo: (id, lvl) => [/* after trigger_adjacent */],
  void: (id, lvl, ctx) => [/* dynamic base score */],
  ripple: (id, lvl) => [/* base score + after buff */],
}
```

### applyEffects 映射规则

```typescript
function applyEffects(effects: EffectAccumulator, skillId: string): void {
  // score: 乘以当前倍率加入 wordScore
  if (effects.score > 0) state.wordScore += effects.score * state.multiplier
  // multiply: 直接加入 multiplier（不乘以 multiplier）
  if (effects.multiply > 0) state.multiplier += effects.multiply
  // time: 加入 time，上限 timeMax + 10
  if (effects.time > 0) state.time = Math.min(state.time + effects.time, state.timeMax + 10)
  // shield: 加入 shieldCount
  if (effects.shield > 0) synergy.shieldCount += effects.shield
}
```

### 行为回调设计

```typescript
const behaviorCallbacks: BehaviorCallbacks = {
  // echo 主动触发：异步调度相邻技能
  onTriggerAdjacent: (depth: number) => {
    const results: PipelineResult[] = []
    for (const adj of adjacent) {
      setTimeout(() => {
        if (state.phase === 'battle') {
          triggerSkill(adj.skillId, adj.key, true)
        }
      }, 100)
      results.push(emptyPipelineResult())
    }
    return results
  },
  // ripple 涟漪：设置相邻键的临时加成
  onBuffNextSkill: (multiplier: number) => {
    for (const adj of adjacent) {
      synergy.rippleBonus.set(adj.key, multiplier)
    }
  },
}
```

**为什么 onTriggerAdjacent 返回空结果：**
- 当前 echo 触发是异步的（setTimeout 100ms），不是同步链式
- BehaviorExecutor 的链式递归是为未来同步链式行为设计的
- 保持 setTimeout 确保与当前行为完全一致
- 异步触发的 triggerSkill 会独立走完整流程（包括自己的 pipeline resolve）

### echo 被动触发保留

echo 被动触发逻辑（相邻 echo 随机触发）保留在 triggerSkill 末尾，不迁移到 Modifier：
- 涉及 `synergy.echoTrigger` 去重状态
- 概率基于 echo 的 level
- Epic 12 会重新设计为 "下一个非 echo 技能触发两次" 标记系统
- 保持现有代码最小化迁移风险

### lone 条件匹配语义

当前代码：`synergy.wordSkillCount - 1 === 0`（wordSkillCount 已含自身）
Modifier 条件：`skills_triggered_this_word: 1`
→ 上下文中 `skillsTriggeredThisWord = synergy.wordSkillCount`（已含自身）
→ `ConditionEvaluator` 比较 `skillsTriggeredThisWord === 1` → 等价

### lone 失效反馈特殊处理

lone 在条件不满足时需要显示"孤狼失效..."反馈。pipeline 不会产生 score 效果（条件不满足 → modifier 被跳过），但仍需反馈。
解决方案：`generateFeedback` 对 lone 特殊处理 — 如果 effects.score === 0 且 skillsTriggeredThisWord > 1，显示失效反馈。

### 文件影响范围

```
修改:
  src/src/data/skills.ts            — 添加 SKILL_MODIFIER_DEFS, SKILL_FEEDBACK, SkillModifierFactory
  src/src/systems/skills.ts         — 重写 triggerSkill, 添加 pipeline 集成函数

新增:
  src/tests/unit/data/skills.modifiers.test.ts     — SKILL_MODIFIER_DEFS 工厂测试
  src/tests/unit/systems/skills.pipeline.test.ts   — pipeline 集成测试

不修改:
  src/src/systems/modifiers/*       — 管道模块不变
  src/src/systems/battle.ts         — 调用方不变（仍调用 triggerSkill）
  src/src/systems/shop.ts           — 绑定逻辑不变（Modifier 在触发时从工厂动态生成）
  src/src/core/types.ts             — 不变
```

### Project Structure Notes

- SKILL_MODIFIER_DEFS 放在 data/skills.ts（数据层）而非 systems/skills.ts — 遵循数据与逻辑分离
- 不修改 shop.ts 的 bind/unbind — 因为使用 scoped registry 而非 global registry，modifiers 在触发时动态生成
- 如果 11.6 遗物迁移需要 global registry（遗物是持久性修饰器），可在 11.6 引入
- pipeline 集成函数（buildTriggerContext, createScopedRegistry, applyEffects）作为 skills.ts 的内部函数，不导出（除非测试需要）

### References

- [Source: docs/epics.md#Epic 11, Story 11.5 — 现有技能迁移]
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 A — Interceptor/Reactor]
- [Source: docs/stories/11-1-modifier-interface-registry.md — Modifier 接口]
- [Source: docs/stories/11-2-three-layer-pipeline.md — 三层计算管道]
- [Source: docs/stories/11-3-condition-system.md — 条件评估: skills_triggered_this_word]
- [Source: docs/stories/11-4-behavior-modifiers.md — BehaviorExecutor + 回调]
- [Source: src/src/systems/skills.ts — 当前 triggerSkill switch/case (迁移目标)]
- [Source: src/src/data/skills.ts — 当前 SKILLS 数据定义]
- [Source: src/src/systems/battle.ts:109-167 — playerCorrect 调用 triggerSkill]
- [Source: src/src/core/state.ts — GameState, SynergyState]
- [Source: src/src/systems/modifiers/EffectPipeline.ts — 三层管道实现]
- [Source: src/src/systems/modifiers/BehaviorExecutor.ts — 行为执行器]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — Modifier, PipelineContext, BehaviorCallbacks]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 在 data/skills.ts 添加 SKILL_MODIFIER_DEFS：10 个技能的 Modifier 工厂函数，使用 SkillModifierFactory 类型
- 工厂辅助函数 `skillVal()` 和 `baseModifier()` 减少重复代码
- 简单技能（burst, amp, freeze, shield）：单个 base 层 Modifier，stacking: additive
- core：动态值 = val + adjacentSkillCount * 2（从 PipelineContext 获取）
- aura：返回 2 个 Modifier — base score(val/3) + enhance score(×1.5)
- lone：base score + condition skills_triggered_this_word=1
- echo：after 阶段 trigger_adjacent 行为 Modifier
- void：动态值 = max(0, val - (skillsTriggeredThisWord - 1))
- ripple：2 个 Modifier — base score + after buff_next_skill(1.5)
- generateFeedback() 在 skills.ts 中实现（switch 按 skillId 分派），覆盖所有 10 个技能反馈
- lone 特殊处理：effects.score=0 时显示 "孤狼失效..."
- void 特殊处理：根据 skillsTriggeredThisWord 计算扣减显示
- buildTriggerContext() 从 state/synergy 构建 PipelineContext
- createScopedRegistry() 构建 per-trigger 作用域注册表：自身 base + 相邻 enhance/global + ripple bonus
- applyEffects() 映射效果到状态：score×multiplier→wordScore, multiply→multiplier, time→time(capped), shield→shieldCount
- BehaviorExecutor 回调：onTriggerAdjacent 使用 setTimeout(100ms) 保持异步时序，onBuffNextSkill 设置 rippleBonus
- echo 被动触发逻辑保留在 triggerSkill 末尾（未迁移到 Modifier）
- 完全删除了 switch/case 代码块和 pre-switch aura/ripple 硬编码逻辑
- Task 2 实现变更：SKILL_FEEDBACK 独立映射表 → generateFeedback() 内联 switch（更简洁，避免额外数据结构）
- 28 个工厂测试 + 35 个管道集成测试 = 63 个新增测试
- 全部 1563 个测试通过，零回归

#### Code Review 修复 (2026-02-20)

- [H1] 修复 aura 自我增强 bug：createScopedRegistry 触发技能只注册 base 层 Modifier，enhance/global 仅来自相邻技能
- [M1] 替换 BehaviorExecutor 占位符测试为真实集成测试（ripple→onBuffNextSkill, echo→onTriggerAdjacent, echo isEcho 无行为）
- [M2] 新增管道链路集成测试（burst 完整链路, burst+aura 链路, ripple+行为回调链路）
- [M3] createScopedRegistry 新增 adjacentOverride 参数，triggerSkill 传入已计算的 adjacent，消除冗余 getAdjacentSkills 调用
- 28 个工厂测试 + 42 个管道集成测试 = 70 个新增测试
- 全部 1570 个测试通过，零回归

### File List

- `src/src/data/skills.ts` — 添加 SKILL_MODIFIER_DEFS, SkillModifierFactory, skillVal(), baseModifier()（修改）
- `src/src/systems/skills.ts` — 重写 triggerSkill 使用管道，添加 buildTriggerContext, createScopedRegistry, applyEffects, generateFeedback；review 修复 aura 自增强 + adjacentOverride 参数（修改）
- `src/tests/unit/data/skills.modifiers.test.ts` — SKILL_MODIFIER_DEFS 工厂测试 28 个（新增）
- `src/tests/unit/systems/skills.pipeline.test.ts` — pipeline 集成测试 42 个（新增，含 review 新增 7 个）
