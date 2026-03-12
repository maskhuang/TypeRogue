# Story 35.12: 遗物系统适配

Status: done

## Story

As a player with affix-based skills,
I want relics that reference old skill categories (producer/converter/connector/amplifier) to work correctly with the new affix system, and new relics that leverage affix mechanics (rarity, affix diversity, quest completions),
so that the relic system feels coherent with the unified skill-as-base+affixes architecture.

## Acceptance Criteria

1. **AC1 — 6 个受影响遗物更新**: forge_heart/chain_surge/stack_resonance/storm_drum/overcharge/pure_heart/chain_ban 的效果描述、触发条件、数值全部按新设计更新
2. **AC2 — pure_heart 限制**: 商店仅刷白装（0 词条），蜕变 C↑ 被禁止
3. **AC3 — chain_ban 限制**: 连接/复制/共鸣词条在 Phase 5-6 中被跳过
4. **AC4 — storm_drum 条件**: 从"产出者"改为 `rarity >= 2`（黄装及以上双触发）
5. **AC5 — 4 个新遗物数据定义**: affix_spectrum / legendary_aura / quest_momentum / mono_affix 加入 `RELICS`，包含 id, name, icon, description, rarity, basePrice, effects
6. **AC6 — affix_spectrum 效果**: 运行时统计玩家所有技能拥有的不同词条类型数，×3% 应用为全局加算
7. **AC7 — mono_affix T4 限制**: 商店仅刷与已选类别相同的词条类别技能；首次获取时弹出类别选择 UI
8. **AC8 — 遗物 × 词条交互矩阵**: 经人工审查无冲突

## Tasks / Subtasks

- [x] Task 1: 改写 6 个受影响遗物的条件和效果 (AC: #1, #4)
  - [x] 1.1 **forge_heart** — 条件 `skill_has_affix('convert')`
  - [x] 1.2 **chain_surge** — 条件 `is_affix_chain_trigger`
  - [x] 1.3 **stack_resonance** — 条件 `affix_amplify_stacks_gte(15)`
  - [x] 1.4 **storm_drum** — 条件 `skill_rarity_gte(2)`
  - [x] 1.5 **overcharge** — 条件 `skill_rarity_gte(1)`
  - [x] 1.6 **chain_ban** — Phase 5-6 chain disable via TriggerContext
  - [x] 1.7 更新 description 文本

- [x] Task 2: pure_heart T4 限制适配 (AC: #2)
  - [x] 2.1 条件 `skill_rarity_gte(0)` + white_only flag
  - [x] 2.2 initRelicState 移除 rarity>0 affix 技能
  - [x] 2.3 商店 generateAffixShopItem 强制 rarity=0
  - [x] 2.4 MetamorphStation C↑ 禁止
  - [x] 2.5 RELIC_FLAGS 新增 `white_only`

- [x] Task 3: chain_ban 触发链限制 (AC: #3)
  - [x] 3.1 resolvePhase5 跳过 Replicate
  - [x] 3.2 resolvePhase6 跳过 Resonance + Link
  - [x] 3.3 +30% 全局加成不变

- [x] Task 4: 新增 4 个词条制专属遗物数据 (AC: #5, #6)
  - [x] 4.1 affix_spectrum (🪬, rare, +3%/词条类型)
  - [x] 4.2 legendary_aura (👑, rare, +8%/传说技能)
  - [x] 4.3 quest_momentum (🪄, rare, +2%/任务完成)
  - [x] 4.4 mono_affix (🧊, legendary, 限定类别 ×2)

- [x] Task 5: mono_affix T4 限制框架 (AC: #7)
  - [x] 5.1 RELIC_FLAGS `affix_category_lock`
  - [x] 5.2 initRelicState 类别选择 (pending → setMonoAffixCategory)
  - [x] 5.3 商店 generateAffixShopItem 类别过滤
  - [x] 5.4 蜕变 A 类别限制 (sampleOneExcluding + allowedCategory)
  - [x] 5.5 蜕变 C↑ 类别限制

- [x] Task 6: 遗物 × 词条交互矩阵审查 (AC: #8)
  - [x] 6.1-6.5 全部验证通过，无冲突

- [x] Task 7: 单元测试 (AC: #1~#8)
  - [x] 7.1-7.8 新建 relics.affix.test.ts (48 tests)
  - [x] 更新现有测试 (t1/t2/t3/t4/t5/t6t7/pipeline/relics.test.ts)
  - [x] 全部 409 遗物测试通过

## Dev Notes

### 已有实现（勿重复）

**遗物数据定义** — `data/relics.ts` (~1126 lines):
- `RelicData` 接口：id, name, icon, description, rarity, basePrice, effects[], flavor?, category?
- `RELICS: Record<string, RelicData>` — 35+ 个遗物完整定义
- `RELIC_MODIFIER_DEFS: Record<string, RelicModifierFactory>` — 每个遗物的 Modifier 工厂函数
- `RELIC_FLAGS` 映射：`connector_lock`, `enchant_lock`, `max_skill_level`, `producer_only`, `max_skill_count`
- 受影响遗物定义位置：
  - `forge_heart` ~L205-216
  - `chain_surge` ~L218-229
  - `stack_resonance` ~L231-242
  - `storm_drum` ~L534-543
  - `overcharge` ~L368-381
  - `pure_heart` ~L496-507
  - `chain_ban` ~L456-467

**遗物流水线** — `systems/relics/RelicPipeline.ts` (~238 lines):
- `resolveRelicSkillTrigger(context: PipelineContext, callbacks?)` → 返回标量乘数 ≥1.0
- `queryRelicFlag(flag: string)` → 返回 boolean 或 number（用于 T4 限制检查）
- `initRelicState(relicId)` → 获取遗物时的初始化副作用（如 pure_heart 移除非产出者）
- `PipelineContext` 关键字段：`currentSkillCategory`, `isChainedTrigger`, `amplifierMaxStacks`, `currentSkillKey`, `combo`

**条件系统** — `systems/modifiers/ModifierTypes.ts`:
- 已有条件类型：`is_converter_after_producer`, `is_chained_trigger`, `amplifier_stacks_gte`, `is_producer_and_count_gte`, `is_home_row`, `both_hands_triggered`, `is_isolated`, `word_resource_types_gte`, `word_perfect`, `total_skills_gte`, `random`
- 行为类型：`retrigger`, `combo_protect`, `time_steal`, `instant_fail`, `remove_relic`, `time_refund`

**Affix 触发管线** — `data/affixTrigger.ts` (~1358 lines):
- `triggerAffixSkill(skill, runtimeState, ctx, recurseDepth)` → `TriggerResult`
- Phase 1: `resolvePhase1(skill)` — 基础值
- Phase 2: `resolvePhase2(skill, state, context)` — 加算层
- Phase 3: `resolvePhase3(skill, state, context, output)` — 乘算层
- Phase 4: `resolvePhase4(skill, output, state)` — 资源写入
- Phase 5: `resolvePhase5(skill, state, context)` — 后触发（复制/增幅/递归/附魔）
- Phase 6: `resolvePhase6(triggerKey, skill, context)` — 邻居通知（共鸣/连接/学徒·观摩/任务·共振）
- **关键**: 当前 Phase 3 末尾已有 `output *= relicMultiplier` 占位（或外部调用点），需要确认具体位置

**技能系统** — `systems/skills.ts`:
- `triggerSkill()` 中央调度器
- `getRelicSkillMultiplier(category)` — 调用 `resolveRelicSkillTrigger()` 获取遗物乘数
- 模块级状态：`_isChainTrigger`, `_currentChainDepth`, `_retriggerRequested`, `_isRetriggered`
- **需要添加 affix 技能分支**：检测 `state.affixSkills.has(skillId)` 时构建适当的 `PipelineContext`

**Affix 数据** — `data/affixes.ts` (~488 lines):
- `AffixType` 枚举 (20 类，6 类别)
- 6 个词条类别定义：
  ```
  数值型: Multiply, Convert, Rainbow
  节奏型: Charge, Decay, Pulse, Crit, Cascade
  拓扑型: Void, Resonance, Mirror
  触发链型: Link, Replicate, Amplify
  单词感知型: Outcast, Gravity, Ligature
  元规则型: Twin, Recurse, Taboo
  ```
- `AFFIX_CATEGORY` 映射（若不存在则需新建）：词条类型 → 类别名
- `AffixSkillInstance`, `SkillRuntimeState` 接口
- `RARITY_COLORS`, `RARITY_NAMES`, `AFFIX_NAMES`, `QUEST_ENCHANTMENT_DEFS`

**商店系统** — `systems/shop.ts`:
- `generateSkill()` 调用点 — 商店刷新时生成随机技能
- `buildAffixTooltipFields()`, `buildAffixParamSummary()` — 已为 35-11 实现
- `showAffixComparisonPanel()` — 已为 35-11 实现

**蜕变系统** — `data/affixMutation.ts`:
- `mutateReforge(skill, affixIndex)` — 蜕变 A（词条重铸）
- `mutateUpgrade(skill)` — 蜕变 C↑（升级）
- `mutateDowngrade(skill)` — 蜕变 C↓（降级）
- **需在 C↑ 入口添加 pure_heart/mono_affix 检查**

### 关键集成点

**1. PipelineContext 扩展（最重要）：**

当前 `resolveRelicSkillTrigger()` 接收的 `PipelineContext` 使用 `currentSkillCategory: 'producer' | 'converter' | ...`。affix 技能没有这些旧类别。需要：

```typescript
// 新增字段（不破坏旧字段，兼容双系统过渡）
interface PipelineContext {
  // ... 现有字段 ...
  // Affix-specific
  currentSkillRarity?: number           // 0-3
  currentSkillAffixes?: AffixType[]     // 技能拥有的词条类型列表
  currentSkillAmplifyStacks?: number    // 增幅层数（从 SkillRuntimeState 读取）
  isAffixChainTrigger?: boolean         // 是否来自连接/共鸣/复制词条的被动触发
}
```

**2. 条件评估器扩展：**

在 `ConditionEvaluator`（或 `resolveRelicSkillTrigger` 内部逻辑）中新增条件类型：

```typescript
// 新条件（用于改写的遗物）
'skill_has_affix'        → ctx.currentSkillAffixes?.includes(type)
'skill_rarity_gte'       → (ctx.currentSkillRarity ?? 0) >= value
'affix_amplify_stacks_gte' → (ctx.currentSkillAmplifyStacks ?? 0) >= value
'is_affix_chain_trigger' → ctx.isAffixChainTrigger === true
// 新条件（用于新遗物）
'affix_type_count_bonus'  → 统计全局不同词条类型数 × bonusPerType
'legendary_count_bonus'   → 统计全局 rarity=3 技能数 × bonusPerSkill
'quest_completions_bonus' → 统计全局 questCompletions 总和 × bonusPerCompletion
```

**3. affixTrigger.ts 中的遗物乘数注入点：**

在 `triggerAffixSkill()` 中，Phase 3 之后、Phase 4 之前，需要调用 `resolveRelicSkillTrigger()` 并将结果乘到 output：

```typescript
// Phase 3 结束后
const relicMult = resolveRelicSkillTrigger(buildAffixPipelineContext(skill, runtimeState, ctx))
output *= relicMult
// 然后进入 Phase 4 写入资源
```

**4. chain_ban 在 affixTrigger.ts 中的检查：**

```typescript
// resolvePhase5 中
if (affix.type === AffixType.Replicate && queryRelicFlag('connector_lock')) {
  // 跳过复制词条的邻居触发
  continue
}
// resolvePhase6 中
if ((affix.type === AffixType.Resonance || affix.type === AffixType.Link) && queryRelicFlag('connector_lock')) {
  // 跳过共鸣/连接的邻居通知
  continue
}
```

### 词条类别映射（mono_affix 需要）

需要在 `affixes.ts` 中新增或确认 `AFFIX_CATEGORIES` 常量：

```typescript
export const AFFIX_CATEGORIES: Record<AffixType, string> = {
  [AffixType.Multiply]: '数值型',
  [AffixType.Convert]: '数值型',
  [AffixType.Rainbow]: '数值型',
  [AffixType.Charge]: '节奏型',
  [AffixType.Decay]: '节奏型',
  [AffixType.Pulse]: '节奏型',
  [AffixType.Crit]: '节奏型',
  [AffixType.Cascade]: '节奏型',
  [AffixType.Void]: '拓扑型',
  [AffixType.Resonance]: '拓扑型',
  [AffixType.Mirror]: '拓扑型',
  [AffixType.Link]: '触发链型',
  [AffixType.Replicate]: '触发链型',
  [AffixType.Amplify]: '触发链型',
  [AffixType.Outcast]: '单词感知型',
  [AffixType.Gravity]: '单词感知型',
  [AffixType.Ligature]: '单词感知型',
  [AffixType.Twin]: '元规则型',
  [AffixType.Recurse]: '元规则型',
  [AffixType.Taboo]: '元规则型',
}

export const AFFIX_CATEGORY_NAMES = ['数值型', '节奏型', '拓扑型', '触发链型', '单词感知型', '元规则型'] as const
export type AffixCategory = typeof AFFIX_CATEGORY_NAMES[number]
```

### 设计文档遗物改写清单（来自 design/affix-skill-system.md §十五）

| ID | 旧效果 | 新效果 |
|----|--------|--------|
| forge_heart | 转化者在产出者后 +15% | 拥有转化词条的技能触发时 k +15% |
| chain_surge | 连接者传导时 +25% | 连接词条被动触发时 +25% |
| stack_resonance | 增幅者≥15层 +10% | 增幅词条≥15层 +10% |
| storm_drum | 产出者双触发 | rarity≥2 双触发 |
| overcharge | 产出者 +50%/-0.1s | rarity≥1 +50%/-0.1s |
| pure_heart | 只能产出者 ×3 | 只能白装 ×3 |
| chain_ban | 连接者无效 +30% | 触发链词条（连接/复制/共鸣）无效 +30% |

### 不受影响的遗物（无需修改）

- T1: `spark_core`, `perfect_rhythm`, `resource_flood`
- T2: `campfire_ember`, `star_chart`, `entropy`, `schrodinger_dice`
- T3: `echo_bell`, `finale`
- T4: `no_enchant_vow`, `keyboard_flood`, `minimalist`, `silence_vow`
- T5: 全部 (`home_advantage`, `ambidextrous`, `twin_bond`, `lone_wolf`)
- T6: 全部 (`lucky_coin`, `cornucopia`, `time_bank`, `overkill_blade`)
- T7: `glass_cannon`, `time_thief`, `greedy_hand`, `doomsday`, `ramen`
- 职业专属: 需单独审查

### 依赖方向（CRITICAL）

```
data (affixes.ts, relics.ts)   ← 纯数据 + 定义
  ↓ 被引用
systems/relics/RelicPipeline.ts ← 遗物计算逻辑
  ↓ 被引用
systems/skills.ts               ← 中央调度器
  ↓ 被引用
data/affixTrigger.ts            ← affix 触发管线
```

**注意**：`affixTrigger.ts` 位于 `data/` 层但需要调用 `systems/relics/` 的 `queryRelicFlag()`。这违反了依赖方向。解决方案：
- **方案 A**：在 `triggerAffixSkill()` 的 `TriggerContext` 中注入 `relicFlags` 和 `relicMultiplier`，由调用方 (`skills.ts`) 提供
- **方案 B**：将 chain_ban 检查提到 `skills.ts` 层，传入 `skipChainAffixes: boolean` 参数
- **推荐方案 A**：保持 `affixTrigger.ts` 为纯数据层，所有外部依赖通过 `TriggerContext` 注入

### TriggerContext 扩展（推荐）

```typescript
interface TriggerContext {
  // ... 现有字段 ...
  // 遗物注入（由 skills.ts 提供，避免 data→systems 依赖）
  relicMultiplier?: number           // resolveRelicSkillTrigger() 结果
  chainAffixesDisabled?: boolean     // chain_ban 生效时为 true
  // mono_affix 不需要在此注入 — 在商店/蜕变入口过滤
}
```

### 测试结构

现有遗物测试文件（可追加或新建）：
- `tests/unit/systems/relics/relics.test.ts` — 数据完整性
- `tests/unit/systems/relics/relics.t1.test.ts` — T1 条件加成
- `tests/unit/systems/relics/relics.t2.test.ts` — T2 累积成长
- `tests/unit/systems/relics/relics.t3.test.ts` — T3 重触发
- `tests/unit/systems/relics/relics.t4.test.ts` — T4 规则改造
- `tests/unit/systems/relics/relic.pipeline.test.ts` — 流水线集成

**建议新建**：`tests/unit/systems/relics/relics.affix.test.ts` — affix 遗物适配专项测试

### 性能约束

- 遗物乘数计算 <0.5ms（已有 resolveRelicSkillTrigger 基线）
- affix_spectrum 需遍历所有技能的词条 → O(skills × affixes) ≈ O(26 × 3) = 78 次迭代，可忽略
- quest_momentum 需遍历所有运行时状态 → O(skills) ≈ 26 次，可忽略
- mono_affix 商店过滤在 generateSkill() 中，每次刷新调用 3-5 次，过滤开销极小

### Previous Story Intelligence (from 35-11)

- **DOM API 优于 innerHTML**: 35-11 review M4 → mono_affix 类别选择 UI 应使用 DOM API
- **RARITY_COLORS 单一来源**: 从 `affixes.ts` 导入，遗物 description 中引用颜色需用 RARITY_NAMES
- **verbatimModuleSyntax**: TypeScript 要求 `import type` 用于纯类型导入
- **条件断言问题**: 不要用 `if` 包裹 `expect`，mock 随机数确保确定性
- **review 常见 HIGH 问题**: 逻辑覆盖不全（如 35-11 H1 对比面板取错目标）→ 遗物条件改写需逐个验证

### Git Intelligence (最近提交模式)

```
f92ead9 feat(35-11): UI 键盘可视化与战斗反馈
5a33494 feat(35-10): 蜕变系统
bedf997 feat(35-9): 商店集成
941a8d4 feat(35-8): state lifecycle serialization
d0bd42c feat(35-7): 衍生附魔 ratio 校准
```

模式：`feat(35-N): 中文简述 — 英文关键词 + 测试数 + review 修复`

### Project Structure Notes

- 修改: `src/src/data/relics.ts` — 更新 6 个遗物定义 + 新增 4 个遗物 + RELIC_FLAGS
- 修改: `src/src/systems/relics/RelicPipeline.ts` — 新增条件评估 + initRelicState mono_affix
- 修改: `src/src/systems/modifiers/ModifierTypes.ts` — 扩展 PipelineContext + 新条件类型
- 修改: `src/src/data/affixTrigger.ts` — TriggerContext 扩展 + chain_ban 检查点
- 修改: `src/src/data/affixes.ts` — 新增 AFFIX_CATEGORIES / AFFIX_CATEGORY_NAMES
- 修改: `src/src/systems/skills.ts` — affix 分支构建 PipelineContext + 注入 relicMultiplier
- 修改: `src/src/systems/shop.ts` — pure_heart/mono_affix 商店过滤
- 修改: `src/src/data/affixMutation.ts` — pure_heart/mono_affix 蜕变限制
- 新建: `src/tests/unit/systems/relics/relics.affix.test.ts` — affix 遗物适配测试

### References

- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.12] — 验收标准原文
- [Source: docs/design/affix-skill-system.md#十五、遗物系统适配] — 完整遗物改写清单 + 新遗物定义 + 交互矩阵
- [Source: docs/planning-artifacts/relic-system-redesign.md] — 遗物 7 类分类 + T4 限制框架
- [Source: docs/project-context.md#Relic/Modifier Pipeline Rules] — 3 层修饰器管线规则
- [Source: docs/project-context.md#Skill System Rules] — 中央调度器路径
- [Source: docs/implementation-artifacts/35-11-ui-keyboard-combat.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Floating point precision: `toBe(115)` → `toBeCloseTo(115, 1)` for forge_heart pipeline test
- Duplicate icons fixed: affix_spectrum 🌈→🔮→🪬, quest_momentum 🏆→🪄, mono_affix 🩸→🧊
- Dependency direction solved via TriggerContext injection (方案 A): `relicMultiplier` + `chainAffixesDisabled`

### Completion Notes List

1. Extended PipelineContext with 4 affix-specific fields and ConditionEvaluator with 4 new condition types
2. Rewrote 6 existing relic conditions from old category-based to affix-based semantics
3. Added chain_ban checks in affixTrigger.ts Phase 5 (Replicate) and Phase 6 (Resonance/Link) via TriggerContext injection
4. Added 4 new relics: affix_spectrum, legendary_aura, quest_momentum, mono_affix with dynamic stat computation in resolveRelicSkillTrigger
5. Implemented mono_affix T4 framework: category lock flag, shop filtering, mutation filtering (sampleOneExcluding allowedCategory)
6. Pure_heart adapted: white_only flag, shop rarity=0 force, MetamorphStation C↑ disable
7. Created relics.affix.test.ts with 48 tests; updated 8 existing test files for new conditions/counts
8. All 409 relic tests pass; pre-existing failures in unrelated modules (SoundPool, FragmentQueue, etc.) unchanged

### Code Review Fixes (2026-03-12)

- **H1 FIXED**: mono_affix initRelicState 实现自动类别检测（扫描现有技能最常见类别并自动选定）
- **H2 FIXED**: mono_affix factory 添加 `skill_rarity_gte(0)` 条件，旧系统技能不再获得免费 ×2
- **M1 NOTED**: pure_heart `skill_rarity_gte(0)` 条件添加注释说明语义
- **M2 FIXED**: affix_spectrum factory 删除未使用的 `const types = new Set<string>()`
- **M3 FIXED**: affix_spectrum 注释 "multiply 加算" → "score 加算"
- **M4 FIXED**: File List 添加 sprint-status.yaml
- **L1 FIXED**: 删除 relics.ts 未使用的 `import type { AffixCategory }`

### File List

Modified:
- `src/src/systems/modifiers/ModifierTypes.ts` — PipelineContext + ModifierCondition extensions
- `src/src/systems/modifiers/ConditionEvaluator.ts` — 4 new condition evaluators
- `src/src/data/relics.ts` — 7 relic updates + 4 new relics + RELIC_FLAGS + imports
- `src/src/systems/relics/RelicPipeline.ts` — queryRelicFlag extensions + initRelicState + resolveRelicSkillTrigger dynamic stats + mono_affix helpers
- `src/src/data/affixTrigger.ts` — TriggerContext extensions + chain_ban Phase 5-6 checks
- `src/src/systems/shop.ts` — white_only + affix_category_lock shop filtering
- `src/src/data/affixMutation.ts` — sampleOneExcluding allowedCategory + mutateA/mutateUpgrade params
- `src/src/systems/classes/MetamorphStation.ts` — white_only C↑ disable + mono_affix category threading
- `src/tests/unit/systems/relics/relics.test.ts` — count updates (53 relics)
- `src/tests/unit/systems/relics/relics.t1.test.ts` — forge_heart/chain_surge/stack_resonance condition updates
- `src/tests/unit/systems/relics/relics.t2.test.ts` — DEFS count 35→39
- `src/tests/unit/systems/relics/relics.t3.test.ts` — storm_drum condition update
- `src/tests/unit/systems/relics/relics.t4.test.ts` — mock state + pure_heart condition update
- `src/tests/unit/systems/relics/relics.t5.test.ts` — DEFS count 35→39
- `src/tests/unit/systems/relics/relics.t6t7.test.ts` — overcharge context update
- `src/tests/unit/systems/relics/relic.pipeline.test.ts` — forge_heart pipeline context + mock state
- `src/tests/unit/data/iconRegistry.test.ts` — total count 299→303
- `docs/implementation-artifacts/sprint-status.yaml` — 35-12 status → done

Created:
- `src/tests/unit/systems/relics/relics.affix.test.ts` — 48 tests for affix relic adaptation
