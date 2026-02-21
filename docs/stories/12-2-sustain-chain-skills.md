# Story 12.2: 续航流与连锁流技能

Status: done

## Story

As a 玩家,
I want 续航流（freeze/shield/pulse/sentinel）和连锁流（echo/ripple/mirror/leech）8 个技能通过 Modifier 管道注册并在游戏中生效,
so that 我可以在商店中购买并体验续航与连锁两种流派的构筑路线，同时 echo/ripple 被重设计为基于标记的互动机制。

## Acceptance Criteria

1. freeze: base 层 +2 秒（已实现，验证匹配即可）
2. shield: before 层拦截器，打错时消耗 1 次盾保护连击（将现有硬编码保护迁移到管道）
3. pulse: 行为型，触发计数器每满 3 次 +1 秒
4. sentinel: after 层触发器，每完成一个词恢复 1 次盾
5. echo: after 层触发器，设置"下一个非 echo 技能触发两次"标记（重设计，替换现有 trigger_adjacent）
6. ripple: after 层触发器，设置"下一个非 ripple 技能效果传递给再下一个"标记（重设计，替换现有 buff_next_skill）
7. mirror: **被动**技能，after 层，同行最左技能触发时→触发最右技能
8. leech: base 层 +N 分（N = 本词已触发技能数）
9. echo/ripple 标记系统有反循环保护
10. 所有 8 个技能有 Modifier 定义、SKILLS 数据条目、generateFeedback 反馈、单元测试

## Tasks / Subtasks

- [x] Task 1: 扩展类型定义 (AC: #3, #4, #5, #6, #7, #8)
  - [x] 1.1 `core/types.ts` `SkillType` 添加 `'pulse' | 'sentinel' | 'mirror' | 'leech'`
  - [x] 1.2 `core/types.ts` `ActiveSkillType` 添加 `'pulse' | 'sentinel' | 'leech'`
  - [x] 1.3 `core/types.ts` `PassiveSkillType` 添加 `'mirror'`
  - [x] 1.4 `core/types.ts` `SynergyState` 添加：`echoPending: boolean`、`ripplePending: boolean`、`ripplePassthrough: EffectAccumulator | null`、`pulseCount: number`
  - [x] 1.5 `core/state.ts` `createSynergyState()` 初始化新字段：`echoPending: false, ripplePending: false, ripplePassthrough: null, pulseCount: 0`
  - [x] 1.6 `systems/modifiers/ModifierTypes.ts` `ModifierBehavior` 添加新行为类型：
    ```typescript
    | { type: 'set_echo_flag' }
    | { type: 'set_ripple_flag' }
    | { type: 'pulse_counter'; timeBonus: number }
    | { type: 'restore_shield'; amount: number }
    | { type: 'trigger_row_mirror' }
    ```
  - [x] 1.7 `systems/modifiers/ModifierTypes.ts` `BehaviorCallbacks` 添加新回调：
    ```typescript
    onSetEchoFlag?: () => void
    onSetRippleFlag?: () => void
    onPulseCounter?: (timeBonus: number) => void
    onRestoreShield?: (amount: number) => void
    onTriggerRowMirror?: (depth: number) => PipelineResult | null
    ```

- [x] Task 2: BehaviorExecutor 扩展 (AC: #3, #4, #5, #6, #7)
  - [x] 2.1 `BehaviorExecutor.ts` switch 添加 5 个新 case：
    - `set_echo_flag`: 调用 `callbacks?.onSetEchoFlag?.()`
    - `set_ripple_flag`: 调用 `callbacks?.onSetRippleFlag?.()`
    - `pulse_counter`: 调用 `callbacks?.onPulseCounter?.(behavior.timeBonus)`
    - `restore_shield`: 调用 `callbacks?.onRestoreShield?.(behavior.amount)`
    - `trigger_row_mirror`: 深度检查 + 调用 `callbacks?.onTriggerRowMirror?.(depth)`，递归处理子行为
  - [x] 2.2 `trigger_row_mirror` 必须有 `depth >= MAX_DEPTH` 保护（与 trigger_adjacent 同级）

- [x] Task 3: 技能事件解析函数 (AC: #2, #4)
  - [x] 3.1 `systems/skills.ts` 新增 `resolveSkillEventModifiers(trigger: ModifierTrigger, context: PipelineContext): PipelineResult`
    - 遍历 `state.player.skills` 所有已拥有技能
    - 对每个技能调用 SKILL_MODIFIER_DEFS 工厂
    - 注册匹配 trigger 的 Modifier 到临时 registry
    - 调用 `EffectPipeline.resolve(registry, trigger, context)` 返回结果
    - **用途**: shield on_error 拦截、sentinel on_word_complete 恢复
  - [x] 3.2 确保该函数注入遗物 global 层 Modifier（调用 `injectRelicModifiers`）

- [x] Task 4: SKILLS 数据 + SKILL_MODIFIER_DEFS 工厂 (AC: #1-#8)
  - [x] 4.1 SKILLS 添加 4 个新技能：
    ```
    pulse:    { name: '脉冲', icon: '💓', type: 'pulse',    category: 'active',  base: 1,  grow: 0.5, desc: '每3次触发+1秒' }
    sentinel: { name: '哨兵', icon: '🏰', type: 'sentinel', category: 'active',  base: 1,  grow: 1,   desc: '每完成一词恢复1次盾' }
    mirror:   { name: '镜像', icon: '🪞', type: 'mirror',   category: 'passive', base: 1,  grow: 0,   desc: '[被动] 同行最左触发→触发最右' }
    leech:    { name: '汲取', icon: '🧛', type: 'leech',    category: 'active',  base: 2,  grow: 1,   desc: '本词每个已触发技能+2分' }
    ```
  - [x] 4.2 SKILLS 更新 echo/ripple 描述：
    ```
    echo:   desc → '触发后，下一个非echo技能触发两次'
    ripple: desc → '触发时+3分，下一个非ripple技能效果传递给再下一个'
    ```
  - [x] 4.3 `PASSIVE_SKILL_TYPES` 添加 `'mirror'`
  - [x] 4.4 SKILL_MODIFIER_DEFS 工厂（8 个技能）：
    - **freeze**: 验证已有 `baseModifier(id, 'time', 'time', skillVal(id, lvl))` ✓
    - **shield**: 保留现有 on_skill_trigger base shield 效果 + **新增** on_error before 拦截器
      ```typescript
      shield: (id, lvl) => [
        baseModifier(id, 'shield', 'shield', skillVal(id, lvl)),
        {
          id: `skill:${id}:protect`,
          source: `skill:${id}`,
          sourceType: 'skill',
          layer: 'base',
          trigger: 'on_error',
          phase: 'before',
          behavior: { type: 'intercept' },
          priority: 50, // 优先于遗物 combo_protect
        },
      ]
      ```
    - **pulse**: after 行为，计数器触发时间
      ```typescript
      pulse: (id, lvl) => [{
        id: `skill:${id}:counter`,
        source: `skill:${id}`,
        sourceType: 'skill',
        layer: 'base',
        trigger: 'on_skill_trigger',
        phase: 'after',
        behavior: { type: 'pulse_counter', timeBonus: skillVal(id, lvl) },
        priority: 100,
      }]
      ```
    - **sentinel**: on_word_complete 恢复护盾
      ```typescript
      sentinel: (id, lvl) => [{
        id: `skill:${id}:restore`,
        source: `skill:${id}`,
        sourceType: 'skill',
        layer: 'base',
        trigger: 'on_word_complete',
        phase: 'after',
        behavior: { type: 'restore_shield', amount: skillVal(id, lvl) },
        priority: 100,
      }]
      ```
    - **echo**: 重设计 → base score + after set_echo_flag
      ```typescript
      echo: (id, lvl) => [
        baseModifier(id, 'score', 'score', skillVal(id, lvl)),
        {
          id: `skill:${id}:flag`,
          source: `skill:${id}`,
          sourceType: 'skill',
          layer: 'base',
          trigger: 'on_skill_trigger',
          phase: 'after',
          behavior: { type: 'set_echo_flag' },
          priority: 100,
        },
      ]
      ```
    - **ripple**: 保留 base score + 重设计 after → set_ripple_flag
      ```typescript
      ripple: (id, lvl) => [
        baseModifier(id, 'score', 'score', skillVal(id, lvl)),
        {
          id: `skill:${id}:flag`,
          source: `skill:${id}`,
          sourceType: 'skill',
          layer: 'base',
          trigger: 'on_skill_trigger',
          phase: 'after',
          behavior: { type: 'set_ripple_flag' },
          priority: 100,
        },
      ]
      ```
    - **mirror**: 被动，after 行为
      ```typescript
      mirror: (id, _lvl) => [{
        id: `skill:${id}:trigger`,
        source: `skill:${id}`,
        sourceType: 'skill',
        layer: 'enhance', // 被动注入到相邻技能
        trigger: 'on_skill_trigger',
        phase: 'after',
        behavior: { type: 'trigger_row_mirror' },
        priority: 100,
      }]
      ```
    - **leech**: base score 动态值
      ```typescript
      leech: (id, lvl, ctx) => [
        baseModifier(id, 'score', 'score', (ctx?.skillsTriggeredThisWord ?? 0) * skillVal(id, lvl)),
      ]
      ```

- [x] Task 5: Echo/Ripple 标记系统 + Pulse 计数器集成 (AC: #5, #6, #9, #3)
  - [x] 5.1 `triggerSkill()` 中 BehaviorCallbacks 添加 echo/ripple/pulse 回调：
    ```typescript
    onSetEchoFlag: () => { synergy.echoPending = true; },
    onSetRippleFlag: () => { synergy.ripplePending = true; },
    onPulseCounter: (timeBonus) => {
      synergy.pulseCount++;
      if (synergy.pulseCount % 3 === 0) {
        applyEffects({ score: 0, multiply: 0, time: timeBonus, gold: 0, shield: 0 });
        showFeedback(`脉冲! +${timeBonus}秒`, '#2ecc71');
      }
    },
    ```
  - [x] 5.2 `triggerSkill()` 在管道解析前检查 echoPending：
    - 条件: `synergy.echoPending && !isEcho && skillId !== 'echo'`（非 echo 技能 + 非 echo 触发）
    - 消费: `synergy.echoPending = false`
    - 执行: 正常 resolve 后，再调用一次 `triggerSkill(skillId, triggerKey, true)` 模拟二次触发
    - 反循环: isEcho=true 参数阻止后续 echo flag 设置（isEcho 时过滤 set_echo_flag 行为）
  - [x] 5.3 `triggerSkill()` 在 applyEffects 后检查 ripplePending：
    - 条件: `synergy.ripplePending && skillId !== 'ripple'`
    - 消费: `synergy.ripplePending = false`
    - 存储: `synergy.ripplePassthrough = { ...result.effects }`（深拷贝当前效果）
  - [x] 5.4 `triggerSkill()` 在管道解析后检查 ripplePassthrough：
    - 条件: `synergy.ripplePassthrough !== null`
    - 应用: `applyEffects(synergy.ripplePassthrough)`（追加传递的效果）
    - 消费: `synergy.ripplePassthrough = null`
  - [x] 5.5 `createScopedRegistry()` 中 isEcho 过滤扩展：同时过滤 `set_echo_flag` 和 `set_ripple_flag` 行为
  - [x] 5.6 删除旧 echo 被动概率触发逻辑（`triggerSkill()` 末尾的 `adjacentEchoes` 循环）
  - [x] 5.7 删除旧 ripple 涟漪加成逻辑（`createScopedRegistry()` 中 `synergy.rippleBonus` 注入 + `onBuffNextSkill` 回调）

- [x] Task 6: Shield 拦截器 + Sentinel 完词恢复集成 (AC: #2, #4)
  - [x] 6.1 `battle.ts` `playerWrong()` 重构：
    - 删除硬编码 `if (synergy.shieldCount > 0)` 块
    - 调用 `resolveSkillEventModifiers('on_error', { hasError: true })`
    - 如果 `result.intercepted && synergy.shieldCount > 0`：消耗 `synergy.shieldCount--`，显示 '护盾保护!'，return
    - 如果 `result.intercepted` 但 shieldCount=0：不拦截，继续正常流程
    - 凤凰羽毛遗物保持现有管道逻辑（在 shield 之后检查）
  - [x] 6.2 `battle.ts` `completeWord()` 添加 sentinel 恢复：
    - 在词语完成分数计算后调用 `resolveSkillEventModifiers('on_word_complete', context)`
    - BehaviorCallbacks 的 `onRestoreShield` 回调: `synergy.shieldCount += amount`，显示 `哨兵: +${amount}盾`
    - 需要在 `resolveSkillEventModifiers` 支持行为回调参数
  - [x] 6.3 `battle.ts` `setWord()` 添加新字段重置：
    ```typescript
    synergy.echoPending = false;
    synergy.ripplePending = false;
    synergy.ripplePassthrough = null;
    synergy.pulseCount = 0;
    ```
  - [x] 6.4 `battle.ts` `startBattle()` / 重置函数中初始化新字段

- [x] Task 7: Mirror 行为回调 + generateFeedback (AC: #7, #10)
  - [x] 7.1 `triggerSkill()` BehaviorCallbacks 添加 `onTriggerRowMirror`:
    - 获取触发键所在 row（`KEYBOARD_ROWS.findIndex(row => row.includes(triggerKey))`）
    - 找到该 row 中所有有绑定技能的键
    - 如果触发键是最左有技能键 → 找最右有技能键 → `triggerSkill(rightSkillId, rightKey, true)`
    - 如果触发键是最右有技能键 → 找最左有技能键 → `triggerSkill(leftSkillId, leftKey, true)`
    - 返回 PipelineResult（或 emptyPipelineResult）
  - [x] 7.2 `generateFeedback()` 添加/更新 8 个 case：
    - freeze: 保留 `+${effects.time}秒` #87ceeb
    - shield: 保留 `护盾+${effects.shield}` #87ceeb
    - pulse: `null`（反馈在 pulseCounter 回调中直接显示）
    - sentinel: `null`（反馈在 restoreShield 回调中直接显示）
    - echo: `回响→双触发` #e056fd
    - ripple: `涟漪→传递` #3498db（score > 0 时追加分数）
    - mirror: `镜像!` #9b59b6
    - leech: `汲取+${Math.floor(effects.score * state.multiplier)}` #27ae60

- [x] Task 8: 测试 (AC: #10)
  - [x] 8.1 `BehaviorExecutor.test.ts`: 5 个新 case（set_echo_flag、set_ripple_flag、pulse_counter、restore_shield、trigger_row_mirror + 深度限制）
  - [x] 8.2 `skills.modifiers.test.ts`: 8 个技能工厂测试（新增 pulse/sentinel/mirror/leech 结构+升级 + 更新 echo/ripple 验证新行为 + freeze/shield 验证）
  - [x] 8.3 `skills.pipeline.test.ts`: 管道集成测试
    - echo: 标记设置 → 下次触发双触发 → 反循环保护
    - ripple: 标记设置 → 效果传递 → 消费
    - pulse: 计数器 1/2/3 → 第 3 次触发时间
    - leech: 0/1/3 个已触发技能 → 对应分数
    - shield: on_error 拦截 + shieldCount=0 时不拦截
    - sentinel: on_word_complete → 恢复盾
    - mirror: 最左→最右触发
  - [x] 8.4 反馈测试: echo/ripple/mirror/leech/pulse/sentinel 各场景
  - [x] 8.5 回归测试: 全量测试通过，零回归

## Dev Notes

### Echo/Ripple 重设计说明

**旧设计（将被替换）:**
- echo: `trigger_adjacent` 行为触发所有相邻技能 + 被动概率触发
- ripple: `buff_next_skill` 行为设置 `synergy.rippleBonus` 相邻加成

**新设计（基于标记的互动）:**
- echo: `set_echo_flag` → `synergy.echoPending = true` → 下一个非 echo 技能触发两次
- ripple: `set_ripple_flag` → `synergy.ripplePending = true` → 下一个非 ripple 技能效果存储 → 再下一个技能获得传递效果

**反循环保护:**
- echo: 二次触发使用 `isEcho=true`，`createScopedRegistry` 过滤 `set_echo_flag` 行为
- ripple: `ripplePending` 仅在非 ripple 技能触发时消费，ripple 自身不会消费标记
- `isEcho` 参数同时过滤 `set_echo_flag` 和 `set_ripple_flag`，防止 echo 双触发中的链式行为重复设置标记

### 需要删除的旧代码

1. `triggerSkill()` 末尾的 echo 被动概率触发循环 (`adjacentEchoes` for loop, skills.ts ~L250-264)
2. `triggerSkill()` 中的 `onBuffNextSkill` 回调 (skills.ts ~L242-245)
3. `createScopedRegistry()` 中的 `synergy.rippleBonus` 检查和注入 (skills.ts ~L92-104)
4. `battle.ts` `playerWrong()` 中硬编码的 `synergy.shieldCount` 检查 (battle.ts ~L183-188)

### 技能事件解析函数设计

```typescript
// 新增函数：解析非触发事件的技能 Modifier
function resolveSkillEventModifiers(
  trigger: ModifierTrigger,
  context: PipelineContext,
  behaviorCallbacks?: BehaviorCallbacks,
): PipelineResult {
  const registry = new ModifierRegistry();
  state.player.skills.forEach((data, skillId) => {
    const factory = SKILL_MODIFIER_DEFS[skillId];
    if (!factory) return;
    const mods = factory(skillId, data.level, context);
    // 只注册匹配 trigger 的 Modifier
    registry.registerMany(mods.filter(m => m.trigger === trigger));
  });
  injectRelicModifiers(registry, context);
  const result = EffectPipeline.resolve(registry, trigger, context);
  if (behaviorCallbacks && result.pendingBehaviors.length > 0) {
    BehaviorExecutor.execute(result.pendingBehaviors, 0, behaviorCallbacks);
  }
  return result;
}
```

### Shield 拦截流程

```
playerWrong()
  ↓
  resolveSkillEventModifiers('on_error', { hasError: true })
  ↓ intercepted?
  YES + shieldCount > 0 → synergy.shieldCount--, return (保护)
  YES + shieldCount = 0 → 继续（无盾可消耗）
  NO → resolveRelicEffectsWithBehaviors('on_error') → 凤凰羽毛检查
  ↓
  combo 中断
```

### Sentinel on_word_complete 流程

```
completeWord()
  ↓ 现有逻辑: 分数计算 + resolveRelicEffects('on_word_complete')
  ↓ 新增:
  resolveSkillEventModifiers('on_word_complete', context, {
    onRestoreShield: (amount) => {
      synergy.shieldCount += amount;
      showFeedback(`哨兵: +${amount}盾`, '#27ae60');
    }
  })
```

### Mirror 行为详解

Mirror 是被动技能，通过 `createScopedRegistry` 的相邻技能注入机制注册到触发技能的 registry 中。当触发技能执行 after 阶段时，mirror 的 `trigger_row_mirror` 行为执行。

```
KEYBOARD_ROWS: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

mirror 在 F 键上，同行 = 'asdfghjkl'
D(burst) 触发 → mirror(F) 是相邻 → 注入 trigger_row_mirror 行为
检查: D 是同行有技能的最左键吗？
  - 找该行所有有绑定技能的键，按位置排序
  - D 是最左 → 触发最右技能（比如 L 上的 amp）
```

### 技能数值表

| 技能 | base | grow | 公式 | Lv1 效果 | Lv2 效果 | Lv3 效果 |
|------|------|------|------|----------|----------|----------|
| freeze | 2 | 0.5 | skillVal = time | +2s | +2.5s | +3s |
| shield | 1 | 1 | skillVal = charges | +1 盾 | +2 盾 | +3 盾 |
| pulse | 1 | 0.5 | timeBonus per proc | +1s/3触发 | +1.5s/3触发 | +2s/3触发 |
| sentinel | 1 | 1 | shield restore | +1盾/词 | +2盾/词 | +3盾/词 |
| echo | 2 | 1 | base score + flag | +2分+双触发 | +3分+双触发 | +4分+双触发 |
| ripple | 3 | 1 | base score + flag | +3分+传递 | +4分+传递 | +5分+传递 |
| mirror | 1 | 0 | passive trigger | 镜像触发 | 镜像触发 | 镜像触发 |
| leech | 2 | 1 | N × skillVal | 2/trigger | 3/trigger | 4/trigger |

### echo 数值变更

旧 echo: `base: 30, grow: 10`（用于被动概率计算 30%/40%/50%）
新 echo: `base: 2, grow: 1`（小分数 + 双触发标记，核心价值在标记而非分数）

### 回归风险

- echo/ripple 重设计会影响现有 SKILL_MODIFIER_DEFS 工厂测试（`skills.modifiers.test.ts` 中 echo/ripple 测试需更新）
- echo/ripple 重设计会影响管道集成测试（`skills.pipeline.test.ts` 中相关测试需更新）
- `trigger_adjacent` 和 `buff_next_skill` 行为类型保留（其他技能/遗物可能使用），但 echo/ripple 不再使用
- shield 拦截迁移：battle.ts 中 `playerWrong()` 流程变更
- CHAIN_SKILL_TYPES（echo/ripple）仍保留在列表中但语义变化

### Project Structure Notes

- 技能定义: `src/src/data/skills.ts`
- 技能系统: `src/src/systems/skills.ts`
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts`
- 行为执行器: `src/src/systems/modifiers/BehaviorExecutor.ts`
- 条件评估器: `src/src/systems/modifiers/ConditionEvaluator.ts`（本 story 无新增条件）
- 管道: `src/src/systems/modifiers/EffectPipeline.ts`
- 类型定义: `src/src/core/types.ts`
- 状态: `src/src/core/state.ts`
- 常量: `src/src/core/constants.ts`（KEYBOARD_ROWS 用于 mirror）
- 战斗系统: `src/src/systems/battle.ts`
- 测试: `src/tests/unit/` 下对应目录

### References

- [Source: docs/epics.md#Story 12.2] 原始需求定义
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 B] 技能流派设计
- [Source: docs/stories/12-1-burst-multiplier-skills.md] Story 12.1 模式参考（SKILL_MODIFIER_DEFS 工厂 + 条件 + 反馈）
- [Source: src/src/data/skills.ts] 现有技能数据 + SKILL_MODIFIER_DEFS
- [Source: src/src/systems/skills.ts] triggerSkill + createScopedRegistry + generateFeedback
- [Source: src/src/systems/modifiers/BehaviorExecutor.ts] 行为执行器（trigger_adjacent/buff_next_skill/combo_protect 模式）
- [Source: src/src/systems/modifiers/ModifierTypes.ts] Modifier 接口 + 15 种条件原语 + 行为类型
- [Source: src/src/systems/battle.ts] playerWrong() + completeWord() + setWord() 集成点
- [Source: src/src/core/constants.ts] KEYBOARD_ROWS 键盘行布局

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- All 8 skills implemented: freeze(verified), shield(redesigned), pulse(new), sentinel(new), echo(redesigned), ripple(redesigned), mirror(new), leech(new)
- Echo/Ripple redesigned from behavior-based (trigger_adjacent/buff_next_skill) to flag-based (echoPending/ripplePending)
- Shield migrated from hardcoded synergy.shieldCount check to pipeline on_error interceptor
- resolveSkillEventModifiers function added for non-trigger event handling
- 24 new tests added, all 1667 tests pass, zero regressions

### Change Log

- Task 1: Extended types (SkillType, ActiveSkillType, PassiveSkillType, SynergyState) + state initialization
- Task 2: BehaviorExecutor 5 new cases (set_echo_flag, set_ripple_flag, pulse_counter, restore_shield, trigger_row_mirror)
- Task 3: resolveSkillEventModifiers function for on_error / on_word_complete events
- Task 4: SKILLS data (4 new + echo/ripple updated) + SKILL_MODIFIER_DEFS factories (8 skills)
- Task 5: Echo/Ripple flag system + pulse counter + anti-loop protection in triggerSkill()
- Task 6: Shield pipeline interceptor in playerWrong() + sentinel on_word_complete in completeWord() + synergy resets
- Task 7: Mirror onTriggerRowMirror callback + generateFeedback for 8 skills
- Task 8: Updated existing tests + 24 new tests, 1667 total passing

### File List

- src/src/core/types.ts — SkillType, ActiveSkillType, PassiveSkillType, SynergyState extensions
- src/src/core/state.ts — createSynergyState() new field initialization
- src/src/systems/modifiers/ModifierTypes.ts — 5 new ModifierBehavior + BehaviorCallbacks types
- src/src/systems/modifiers/BehaviorExecutor.ts — 5 new switch cases
- src/src/data/skills.ts — 4 new SKILLS + echo/ripple data update + 8 SKILL_MODIFIER_DEFS factories
- src/src/systems/skills.ts — resolveSkillEventModifiers, echo/ripple flag system, mirror callback, generateFeedback
- src/src/systems/battle.ts — Shield interceptor, sentinel on_word_complete, synergy resets
- tests/unit/data/skills.modifiers.test.ts — Updated echo/ripple/shield tests + new pulse/sentinel/mirror/leech tests
- tests/unit/systems/skills.pipeline.test.ts — Updated echo/ripple tests + new 12.2 integration tests
