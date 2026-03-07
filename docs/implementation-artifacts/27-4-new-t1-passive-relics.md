# Story 27.4: T5 空间策略遗物（4 新遗物）

Status: done

## Story

As a 玩家,
I want 基于键盘布局获得遗物加成（主行加成、双手触发、成对加成、孤狼加成）,
so that 键位排布策略成为构筑决策的核心维度，遗物系统与键盘拓扑深度联动。

## Acceptance Criteria

1. **home_advantage** — 主行（ASDFGHJKL）键位的技能，每次触发产出 +30%，稀有度 Rare，basePrice 50
2. **ambidextrous** — 一词中左手侧和右手侧均触发过技能时，该词结算得分 +30%，稀有度 Rare，basePrice 55
3. **twin_bond** — 恰好两个相邻的技能触发时，该技能产出 +25%，稀有度 Rare，basePrice 55
4. **lone_wolf** — 孤立技能（无相邻技能）触发时，该技能产出 ×1.8，稀有度 Rare，basePrice 55
5. **新条件类型** — ConditionEvaluator 新增 4 个空间条件（`is_home_row`, `both_hands_triggered`, `is_in_pair`, `is_isolated`）
6. **PipelineContext 扩展** — 新增 `currentSkillKey`, `leftHandTriggered`, `rightHandTriggered` 字段
7. **图标唯一** — 4 个新遗物图标不与现有 170+ 图标冲突
8. **测试覆盖** — ≥20 个新测试覆盖 4 个遗物的条件触发、边界、组合

## Tasks / Subtasks

- [x] Task 1: 键盘拓扑辅助函数 (AC: #5)
  - [x] 1.1 `src/src/data/keyboardTopology.ts` 新增 `isHomeRow(key: string): boolean` — 检查键是否在主行 ASDFGHJKL
  - [x] 1.2 `src/src/data/keyboardTopology.ts` 新增 `isIsolatedSkill(key: string, bindings: Map<string, string>): boolean` — 检查技能是否孤立（无相邻技能）
  - [x] 1.3 `src/src/data/keyboardTopology.ts` 新增 `isInPair(key: string, bindings: Map<string, string>): boolean` — 检查技能是否恰好与一个相邻技能配对（连通分量大小 === 2）
- [x] Task 2: PipelineContext 扩展 (AC: #6)
  - [x] 2.1 `src/src/systems/modifiers/ModifierTypes.ts` PipelineContext 新增 `currentSkillKey?: string`
  - [x] 2.2 PipelineContext 新增 `leftHandTriggered?: boolean`, `rightHandTriggered?: boolean`
  - [x] 2.3 `src/src/systems/skills.ts` 触发时填充 `currentSkillKey`（当前触发技能绑定的键位）
  - [x] 2.4 `src/src/systems/battle.ts` 追踪 `leftHandTriggered`/`rightHandTriggered`（词级别，每词重置）
- [x] Task 3: ConditionEvaluator 新条件 (AC: #5)
  - [x] 3.1 `ConditionEvaluator.ts` 新增 `is_home_row` — `isHomeRow(ctx.currentSkillKey)`
  - [x] 3.2 新增 `both_hands_triggered` — `ctx.leftHandTriggered && ctx.rightHandTriggered`
  - [x] 3.3 新增 `is_in_pair` — `isInPair(ctx.currentSkillKey, bindings)`（用于 twin_bond）
  - [x] 3.4 新增 `is_isolated` — `isIsolatedSkill(ctx.currentSkillKey, bindings)`
- [x] Task 4: 遗物数据定义 (AC: #1-4, #7)
  - [x] 4.1 `src/src/data/relics.ts` RELICS 添加 `home_advantage` 数据
  - [x] 4.2 RELICS 添加 `ambidextrous` 数据
  - [x] 4.3 RELICS 添加 `twin_bond` 数据
  - [x] 4.4 RELICS 添加 `lone_wolf` 数据
  - [x] 4.5 RELIC_MODIFIER_DEFS 添加 4 个工厂函数
- [x] Task 5: 触发集成 (AC: #6)
  - [x] 5.1 `src/src/systems/skills.ts` — `triggerSkill` 传入 `currentSkillKey` 到遗物管道
  - [x] 5.2 `src/src/systems/battle.ts` — 词级别追踪左/右手触发标记
  - [x] 5.3 `src/src/systems/battle.ts` — `completeWord` 时传入 `leftHandTriggered`/`rightHandTriggered` 到 `on_word_complete` 遗物管道
  - [x] 5.4 `is_in_pair` 和 `is_isolated` 条件在 ConditionEvaluator 中直接读取 `state.player.bindings`，无需关卡缓存
- [x] Task 6: 测试 (AC: #8)
  - [x] 6.1 新建 `tests/unit/systems/relics/relics.t5.test.ts` — 4 个遗物条件触发测试（43 个测试）
  - [x] 6.2 `tests/unit/data/keyboardTopology.test.ts` — 新增辅助函数测试（isHomeRow, isIsolatedSkill, isInPair）
  - [x] 6.3 更新 `tests/unit/systems/relics/relics.test.ts` — 遗物数量断言 15→19
  - [x] 6.4 更新 `tests/unit/data/iconRegistry.test.ts` — 图标总数 173→177
  - [x] 6.5 更新 `tests/unit/systems/modifiers/ConditionEvaluator.test.ts` — 4 个新条件测试

## Dev Notes

### 现有代码分析（必须了解）

**keyboardTopology.ts 已有基础设施**：
- `HAND_MAP: Record<string, 'left' | 'right'>` — 26 键的左右手分配
- `ROW_MAP: Record<string, number>` — 行号（0=top, 1=home, 2=bottom）
- `ADJACENT_KEYS` — 相邻键映射（在 `core/constants.ts`）
- `isAdjacent(keyA, keyB)` — 判断两键是否相邻
- `isSameRow(keyA, keyB)` — 判断两键是否同行
- `getKeysWithRelation(key, relation)` — 获取与 key 有指定关系的所有键

**主行定义**：ROW_MAP 中 row === 1 的键 = `a, s, d, f, g, h, j, k, l`（9 键）

**PipelineContext 当前字段**（与本 Story 相关）：
- `currentSkillCategory` — 已有（27-2 添加）
- `isChainedTrigger` — 已有（27-2 添加）
- `currentSkillId` — 已有
- 缺少：`currentSkillKey`（触发技能的键位）

**遗物管道调用点**：
- `on_skill_trigger`: `skills.ts:triggerSkill()` → `resolveRelicSkillTrigger(ctx)` — 技能触发时
- `on_word_complete`: `battle.ts:completeWord()` → `resolveRelicEffectsWithBehaviors('on_word_complete', ctx)` — 词完成时

### 4 个遗物详细设计

**home_advantage（主行优势）** — Rare, basePrice: 50
- 描述: 主行（ASDFGHJKL）键位的技能，每次触发产出 +30%
- 触发: `on_skill_trigger`
- 条件: `is_home_row`（检查 `ctx.currentSkillKey` 是否在 ASDFGHJKL，即 ROW_MAP === 1）
- 效果: `{ type: 'score', value: 1.30, stacking: 'multiplicative', layer: 'global' }`
- 设计意图: 奖励主行绑定策略，与增幅者的 SameRow 关系叠加
- 消歧义: "产出 +30%" = 该技能触发的 score 效果 ×1.30（global 层乘法），不影响其他层

**ambidextrous（双手兼备）** — Rare, basePrice: 55
- 描述: 一词中左手侧和右手侧均触发过技能时，该词结算得分 +30%
- 触发: `on_word_complete`
- 条件: `both_hands_triggered`（本词内左手区和右手区各至少触发一个技能）
- 效果: `{ type: 'multiply', value: 0.30, stacking: 'additive' }`（bonusMult += 0.30 → 最终 ×1.3）
- 追踪: 词级别 `leftHandTriggered`/`rightHandTriggered` 布尔标记，`playerCorrect` 中根据 HAND_MAP 设置
- 消歧义: "左手侧/右手侧" = HAND_MAP 中 'left'/'right' 分组；"结算得分" = bonusMult 加算，影响词结算公式 `baseChips × mult × bonusMult`
- 设计意图: 奖励均衡分布技能到双手

**twin_bond（成双成对）** — Rare, basePrice: 55
- 描述: 恰好两个相邻的技能触发时，该技能产出 +25%
- 触发: `on_skill_trigger`
- 条件: `is_in_pair`（当前技能所在连通分量大小恰好 === 2）
- 效果: `{ type: 'score', value: 1.25, stacking: 'multiplicative', layer: 'global' }`
- 计算: 从当前键位 BFS 出发，在绑定键位中找连通分量，分量大小恰好为 2 则满足
- 设计意图: 奖励"配对"布局（两技能紧挨），vs lone_wolf 奖励完全孤立
- 注意: 3 个相邻技能形成三联体时不满足（分量大小 3 ≠ 2），激励精确配对

**lone_wolf（独狼）** — Rare, basePrice: 55
- 描述: 孤立技能（无相邻技能）触发时，该技能产出 ×1.8
- 触发: `on_skill_trigger`
- 条件: `is_isolated`（当前技能键位无相邻技能键位，连通分量大小 === 1）
- 效果: `{ type: 'score', value: 1.80, stacking: 'multiplicative', layer: 'global' }`
- 计算: 检查 ADJACENT_KEYS[key] 中是否有任何键在 bindings 中
- 设计意图: 与 twin_bond 互斥策略，奖励完全分散的技能布局

### 关键实现模式

**键盘拓扑辅助函数**（`keyboardTopology.ts`）：
```typescript
import { ADJACENT_KEYS } from '../core/constants';

/** 检查键是否在主行（ASDFGHJKL） */
export function isHomeRow(key: string): boolean {
  return ROW_MAP[key.toLowerCase()] === 1;
}

/** 检查技能是否孤立（无相邻技能，连通分量 === 1） */
export function isIsolatedSkill(key: string, bindings: Map<string, string>): boolean {
  const k = key.toLowerCase();
  const adjacent = ADJACENT_KEYS[k] || [];
  return !adjacent.some(adj => bindings.has(adj));
}

/** 检查技能是否在配对中（连通分量大小恰好 === 2） */
export function isInPair(key: string, bindings: Map<string, string>): boolean {
  const k = key.toLowerCase();
  const skillKeys = new Set([...bindings.keys()].map(x => x.toLowerCase()));
  if (!skillKeys.has(k)) return false;
  // BFS 找连通分量
  const visited = new Set<string>([k]);
  const queue = [k];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const adj of (ADJACENT_KEYS[curr] || [])) {
      if (skillKeys.has(adj) && !visited.has(adj)) {
        visited.add(adj);
        queue.push(adj);
      }
    }
  }
  return visited.size === 2;
}
```

**条件评估器扩展**（`ConditionEvaluator.ts`）：
```typescript
case 'is_home_row':
  return isHomeRow(ctx.currentSkillKey ?? '');
case 'both_hands_triggered':
  return (ctx.leftHandTriggered === true) && (ctx.rightHandTriggered === true);
case 'is_in_pair':
  return isInPair(ctx.currentSkillKey ?? '', state.player.bindings);
case 'is_isolated':
  return isIsolatedSkill(ctx.currentSkillKey ?? '', state.player.bindings);
```

**左右手追踪**（`battle.ts` 的 `playerCorrect` 中）：
```typescript
// 词级别变量
let leftHandTriggered = false;
let rightHandTriggered = false;

// 在 playerCorrect 中（技能触发后）
if (skillId) {
  const hand = HAND_MAP[k];
  if (hand === 'left') leftHandTriggered = true;
  else if (hand === 'right') rightHandTriggered = true;
}

// setWord 中重置
leftHandTriggered = false;
rightHandTriggered = false;
```

### 遗物工厂模式

```typescript
// RELIC_MODIFIER_DEFS 中
home_advantage: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.30, stacking: 'multiplicative' },
    condition: { type: 'is_home_row' },
  }),
],

ambidextrous: (id) => [
  relicMod(id, 'boost', 'on_word_complete', 'calculate', {
    effect: { type: 'multiply', value: 0.30, stacking: 'additive' },
    condition: { type: 'both_hands_triggered' },
  }),
],

twin_bond: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.25, stacking: 'multiplicative' },
    condition: { type: 'is_in_pair' },
  }),
],

lone_wolf: (id) => [
  relicMod(id, 'boost', 'on_skill_trigger', 'calculate', {
    layer: 'global',
    effect: { type: 'score', value: 1.80, stacking: 'multiplicative' },
    condition: { type: 'is_isolated' },
  }),
],
```

### 27.2/27.3 经验教训

- **relicMod 默认 layer='base'**：T5 空间遗物用 `global` 层乘法，必须 override `layer: 'global'`
- **EffectPipeline 公式**：`baseSum × enhanceProduct × globalProduct` — 无 base 层 modifier 时结果为 0
- **测试数量断言**：修改遗物数量后 `relics.test.ts` 和 `iconRegistry.test.ts` 的 count 需同步更新
- **mock 模式**：遗物测试 mock `../../../../src/core/state`，参考 `relics.t1.test.ts`
- **条件 vs Flag**：新遗物全走 ConditionEvaluator，不走 queryRelicFlag
- **Set 遍历顺序**：遗物替换后位置会变，不影响功能
- **restStage 一致性**：使用 `addRelicWithCapacity()` 而非直接 `.add()`

### 图标选择指南

已用图标（避免）：🍀🪶🔪💣⏰🤑🤫☢️💯🧨⚗️🧲⚜️🎶🌈
建议候选：
- home_advantage: 🏠 或 🏡（主行=家位）
- ambidextrous: 🤲 或 ⚖️（双手平衡）
- twin_bond: 🤝 或 👯（成双成对）
- lone_wolf: 🐺 或 🏔️（孤狼）
- ⚠️ 实际选择前必须运行 `findDuplicateIcons()` 验证唯一性

### 不在此 Story 范围

- T6 经济遗物（cornucopia, interest_gem）→ 27-5
- T7 风险回报遗物（ramen, overcharge）→ 27-5
- T2 累积成长系统（需 relicStates 基础设施）→ 后续 Epic
- T3 重触发系统（需修改技能触发管道）→ 后续 Epic
- T4 规则修改遗物（需技能限制框架）→ 后续 Epic
- 遗物获取通道稀有度权重调整 → 后续 Epic 3

### 文件修改清单

| 文件 | 操作 | 预计改动 |
|------|------|----------|
| `src/src/data/keyboardTopology.ts` | 新增 isHomeRow/isIsolatedSkill/isInPair | ~30 行 |
| `src/src/data/relics.ts` | 添加 4 个 RELICS + 4 个 RELIC_MODIFIER_DEFS | ~60 行 |
| `src/src/systems/modifiers/ModifierTypes.ts` | PipelineContext 新增 4 字段 | ~5 行 |
| `src/src/systems/modifiers/ConditionEvaluator.ts` | 新增 4 个条件分支 | ~15 行 |
| `src/src/systems/skills.ts` | 触发时填充 currentSkillKey | ~5 行 |
| `src/src/systems/battle.ts` | 左右手追踪 + 集群数缓存 | ~15 行 |
| `tests/unit/systems/relics/relics.t5.test.ts` | **新建** T5 空间遗物测试 | ~150 行 |
| `tests/unit/data/keyboardTopology.test.ts` | 新增辅助函数测试 | ~40 行 |
| `tests/unit/systems/relics/relics.test.ts` | 更新数量断言 | ~5 行 |
| `tests/unit/data/iconRegistry.test.ts` | 更新图标总数 | ~2 行 |
| `tests/unit/systems/modifiers/ConditionEvaluator.test.ts` | 新增条件测试 | ~30 行 |

### 参考文件

- 设计文档: `docs/planning-artifacts/relic-system-redesign.md` §6 T5 详细设计
- 实现计划: `docs/planning-artifacts/relic-implementation-plan.md` Story 1.3
- 遗物数据: `src/src/data/relics.ts`（RELICS + RELIC_MODIFIER_DEFS）
- 键盘拓扑: `src/src/data/keyboardTopology.ts`（HAND_MAP + ROW_MAP + ADJACENT_KEYS）
- 修饰器类型: `src/src/systems/modifiers/ModifierTypes.ts`（PipelineContext）
- 条件评估: `src/src/systems/modifiers/ConditionEvaluator.ts`（evaluate + 条件分派）
- 遗物管道: `src/src/systems/relics/RelicPipeline.ts`（resolveRelicEffects + resolveRelicSkillTrigger）
- 技能系统: `src/src/systems/skills.ts`（triggerSkill + resolveRelicSkillTrigger 调用）
- 战斗系统: `src/src/systems/battle.ts`（completeWord + on_word_complete 遗物管道调用）
- T1 遗物测试: `src/tests/unit/systems/relics/relics.t1.test.ts`（mock 模式 + 条件触发测试参考）
- 图标注册: `src/src/data/iconRegistry.ts`（findDuplicateIcons）

### Project Structure Notes

- 依赖方向: `data → core → systems → scenes`
- keyboardTopology 辅助函数在 `data` 层（被 systems 层的 ConditionEvaluator 导入）
- ConditionEvaluator 可 import state（已有先例：`no_skills_equipped` 条件）
- PipelineContext 由调用者（skills.ts/battle.ts）在触发时构造并传入
- 左右手追踪为词级别模块变量，与 wordPerfect 同模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `isIsolatedSkill('')` returned true for empty key — fixed by adding early return for invalid keys
- twin_bond icon 🤝 conflicted with `conn_copy_sameHand` — changed to 👯
- Code review fix: `_currentTriggerKey` stale in pseudo-infinite mode — added assignment in `triggerProducer`/`triggerConverter`
- Code review fix: `isIsolatedSkill` didn't normalize binding Map keys — added lowercase normalization
- Code review fix: ConditionEvaluator docstring claimed "纯函数" but `is_in_pair`/`is_isolated` read global state — updated docstring

### Completion Notes List

- 4 new spatial strategy relics: home_advantage, ambidextrous, twin_bond, lone_wolf
- 3 new keyboard topology helpers: isHomeRow, isIsolatedSkill, isInPair
- 4 new ConditionEvaluator conditions: is_home_row, both_hands_triggered, is_in_pair, is_isolated
- PipelineContext extended with currentSkillKey, leftHandTriggered, rightHandTriggered
- skills.ts passes currentSkillKey via module-level _currentTriggerKey
- battle.ts tracks left/right hand triggers per word, resets in setWord
- 2684 tests passing (105 test files, post-review)
- Relic count: 15 → 19 (all 4 new are Rare)
- Icon count: 173 → 177

### File List

| File | Changes |
|------|---------|
| `src/src/data/keyboardTopology.ts` | +isHomeRow, +isIsolatedSkill, +isInPair |
| `src/src/data/relics.ts` | +4 RELICS entries, +4 RELIC_MODIFIER_DEFS factories |
| `src/src/systems/modifiers/ModifierTypes.ts` | PipelineContext +3 fields, ModifierCondition +4 types |
| `src/src/systems/modifiers/ConditionEvaluator.ts` | +4 condition branches |
| `src/src/systems/skills.ts` | +_currentTriggerKey, pass currentSkillKey to relic pipeline |
| `src/src/systems/battle.ts` | +leftHandTriggered/rightHandTriggered tracking |
| `tests/unit/systems/relics/relics.t5.test.ts` | **NEW** — 43 T5 relic tests |
| `tests/unit/data/keyboardTopology.test.ts` | +20 tests for new helpers |
| `tests/unit/systems/relics/relics.test.ts` | Count updates 15→19, rare 9→13 |
| `tests/unit/systems/relics/relics.t1.test.ts` | RELIC_MODIFIER_DEFS count 15→19 |
| `tests/unit/data/iconRegistry.test.ts` | Icon count 173→177 |
| `tests/unit/systems/modifiers/ConditionEvaluator.test.ts` | +4 spatial condition test groups |
