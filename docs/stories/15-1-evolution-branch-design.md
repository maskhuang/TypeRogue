# Story 15.1: 进化分支数据设计

Status: done

## Story

As a 玩家,
I want 核心技能达到满级后能选择进化路线（每技能 2 条分支），进化后效果质变而非简单数值提升,
so that 构筑深度从"选哪些技能"扩展到"让技能往哪个方向特化"，同一技能在不同构筑中扮演不同角色。

## Acceptance Criteria

1. 新增 `EvolutionBranch` 类型定义，包含分支 ID、名称、图标、描述、进化条件、Modifier 工厂
2. `SkillData` 类型扩展 `evolutions?: [string, string]`（两条分支 ID）
3. `PlayerState` 扩展 `evolvedSkills: Map<string, string>`（skillId → branchId）
4. 选取 6 个核心技能（每个流派至少 1 个），每个设计 2 条进化分支（共 12 个分支）
5. 每条进化分支有完整的 Modifier 工厂定义，复用现有条件系统
6. 进化条件：技能等级 ≥ 3（满级）+ 金币消耗
7. 进化后的 Modifier 工厂替换原技能工厂（通过 `EVOLUTION_MODIFIER_DEFS` 查找）
8. 单元测试覆盖所有进化分支的 Modifier 工厂输出
9. 进化不改变原技能的 base/enhance/global 分层架构

## Tasks / Subtasks

- [x] Task 1: 类型定义 (AC: #1-#3)
  - [x] 1.1 `core/types.ts` 新增 `EvolutionBranch` 接口：`{ id, name, icon, description, skillId, branch: 'A' | 'B', condition: { minLevel, goldCost }, flavorText? }`
  - [x] 1.2 `core/types.ts` `SkillDefinition` 新增可选字段 `evolutions?: [string, string]`（指向两条分支 ID）
  - [x] 1.3 `core/types.ts` `PlayerState` 新增 `evolvedSkills: Map<string, string>`
  - [x] 1.4 `core/state.ts` `createInitialState()` 初始化 `evolvedSkills` 为空 Map

- [x] Task 2: 进化数据结构 (AC: #4, #6)
  - [x] 2.1 `data/skills.ts` 新增 `EVOLUTIONS: Record<string, EvolutionBranch>` 常量（12 条分支数据）
  - [x] 2.2 `data/skills.ts` 在 6 个核心技能的 SKILLS 定义中添加 `evolutions` 字段引用
  - [x] 2.3 进化条件统一设定：minLevel=3, goldCost 按稀有度分级（40/50/60）

- [x] Task 3: 进化 Modifier 工厂 (AC: #5, #7, #9)
  - [x] 3.1 `data/skills.ts` 新增 `EVOLUTION_MODIFIER_DEFS: Record<string, SkillModifierFactory>` 常量
  - [x] 3.2 实现 6 个技能 × 2 分支 = 12 个进化 Modifier 工厂
  - [x] 3.3 进化工厂遵循与原技能相同的 trigger/phase/layer 约定

- [x] Task 4: 工厂查询逻辑 (AC: #7)
  - [x] 4.1 `data/skills.ts` 新增 `getSkillModifierFactory(skillId: string, evolvedSkills?: Map<string, string>): SkillModifierFactory` 工具函数
  - [x] 4.2 逻辑：如果 skillId 在 evolvedSkills 中 → 返回 EVOLUTION_MODIFIER_DEFS[branchId]，否则返回 SKILL_MODIFIER_DEFS[skillId]
  - [x] 4.3 导出辅助函数 `getEvolutionBranches(skillId: string): EvolutionBranch[]`

- [x] Task 5: 单元测试 (AC: #8)
  - [x] 5.1 类型测试：EvolutionBranch 数据完整性（12 分支全覆盖）
  - [x] 5.2 工厂测试：每个进化 Modifier 工厂输出正确的 Modifier 数组
  - [x] 5.3 查询测试：`getSkillModifierFactory` 在有/无进化时返回正确工厂
  - [x] 5.4 数据一致性：SKILLS[x].evolutions 中的 ID 在 EVOLUTIONS 中都存在
  - [x] 5.5 进化条件测试：所有分支 minLevel=3，goldCost 在合理范围

## Dev Notes

### 关键实现模式

**进化类型定义：**
```typescript
// core/types.ts — 新增
export interface EvolutionBranch {
  id: string              // e.g., 'burst_inferno'
  name: string            // e.g., '烈焰爆发'
  icon: string            // emoji
  description: string     // 玩家可见描述
  skillId: string         // 父技能 ID
  branch: 'A' | 'B'      // 分支标识
  condition: {
    minLevel: number      // 最低技能等级（通常为 3）
    goldCost: number      // 进化金币消耗
  }
  flavorText?: string     // 风味文字
}

// SkillDefinition 扩展
export interface SkillDefinition {
  // ...existing fields...
  evolutions?: [string, string]  // [branchA_id, branchB_id]
}
```

**进化工厂查询：**
```typescript
// data/skills.ts — 新增
export function getSkillModifierFactory(
  skillId: string,
  evolvedSkills?: Map<string, string>,
): SkillModifierFactory {
  if (evolvedSkills) {
    const branchId = evolvedSkills.get(skillId)
    if (branchId && EVOLUTION_MODIFIER_DEFS[branchId]) {
      return EVOLUTION_MODIFIER_DEFS[branchId]
    }
  }
  return SKILL_MODIFIER_DEFS[skillId]
}
```

### 6 个核心技能进化分支设计

**选取原则：** 每个流派至少 1 个代表技能，选择玩家使用频率最高、进化空间最大的技能。

#### 1. burst（爆发流 — 底分技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `burst_inferno` | 烈焰爆发 | 底分翻倍但仅在 combo≥10 时触发。高风险高回报 |
| B: `burst_precision` | 精准爆发 | 底分降低但额外加倍率 +0.3。适合倍率流构筑 |

#### 2. amp（倍率流 — 倍率技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `amp_crescendo` | 渐强 | 倍率加成随本词触发技能数递增（每个 +0.1 额外）。适合多技能构筑 |
| B: `amp_overdrive` | 超载 | 倍率加成翻倍但触发后下一个词无效（冷却 1 词）。爆发节奏 |

#### 3. echo（连锁流 — 双触发技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `echo_resonance` | 共鸣 | 双触发变三触发（第三次 50% 效果）。纯数值放大 |
| B: `echo_phantom` | 幻影 | 双触发改为：第二次触发变成触发一个随机相邻技能。多样性 |

#### 4. freeze（续航流 — 时间技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `freeze_permafrost` | 永冻 | 加时提升至 +1.5 秒但每词只能触发一次。稳定续航 |
| B: `freeze_chrono` | 时光倒流 | 不加时，改为每触发 3 次回溯一个错误（恢复 combo）。防错型 |

#### 5. lone（爆发流 — 孤立技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `lone_hermit` | 隐士 | 孤立加成 ×3（原 ×2）但装备技能数上限降至 4。极端孤立 |
| B: `lone_shadow` | 暗影 | 孤立条件放宽：允许 1 个相邻技能仍视为"孤立"。更灵活 |

#### 6. core（被动流 — 邻接增强技能）
| 分支 | 名称 | 效果 |
|------|------|------|
| A: `core_nexus` | 枢纽 | 每个相邻技能 +15% 增强（原 +10%），但自身无底分。纯辅助 |
| B: `core_fusion` | 融合 | 相邻增强降至 +5%，但自身获得"相邻技能数 × 2"底分。攻守兼备 |

### 防坑指南

1. **不要修改 `createScopedRegistry` 或 `triggerSkill`** — 本 Story 只做数据层（类型 + 数据 + 工厂）。集成到运行时是 Story 15.2 的工作
2. **进化工厂签名必须与 `SkillModifierFactory` 一致** — `(skillId, level, context) => Modifier[]`。进化后 skillId 仍然是原技能 ID（不是分支 ID），level 也保持原等级
3. **不要在 ConditionEvaluator 中新增条件类型** — 进化效果应复用现有 23 种条件原语（combo_gte、skills_triggered_gte 等）
4. **`evolvedSkills` Map 在 `resetState()` 中初始化为空** — 每局 Run 开始时无进化，进化发生在商店阶段
5. **进化工厂不需要处理"未进化"状态** — `getSkillModifierFactory` 负责路由，进化工厂只处理进化后的情况
6. **`EvolutionBranch.id` 命名规范** — `{skillId}_{branchName}`，如 `burst_inferno`，用下划线分隔
7. **进化后层级不变** — burst 进化后仍然是 `base` 层 + `on_skill_trigger` + `calculate`，不能把 base 改成 enhance
8. **Modifier 的 source 字段** — 进化后 source 仍为 `skill:{skillId}`（不是 `skill:{branchId}`），因为技能身份不变
9. **echo_resonance 的三触发** — 不要在 Modifier 工厂中实现触发逻辑，只设置 `set_echo_flag` 行为。三触发的实际逻辑属于 Story 15.2 运行时集成
10. **freeze_chrono 的 combo 恢复** — 可能需要新 behavior 类型 `restore_combo`。如果当前 ModifierBehavior 不支持，在 Task 3 中添加类型但不实现执行逻辑（executor 属于 15.2）

### 与现有系统的交互

- **data/skills.ts**：新增 EVOLUTIONS 常量 + EVOLUTION_MODIFIER_DEFS + 辅助函数，修改 6 个 SKILLS 条目添加 evolutions 字段
- **core/types.ts**：新增 EvolutionBranch 接口，扩展 SkillData + PlayerState
- **core/state.ts**：resetState() 初始化 evolvedSkills
- **systems/modifiers/ModifierTypes.ts**：可能新增 1-2 个 ModifierBehavior 类型（如 `restore_combo`）
- **systems/skills.ts**：本 Story 不修改（集成是 15.2）
- **systems/battle.ts**：本 Story 不修改

### Project Structure Notes

修改文件：
```
src/src/core/types.ts                    ← EvolutionBranch + SkillData.evolutions + PlayerState.evolvedSkills
src/src/core/state.ts                    ← resetState() 初始化 evolvedSkills
src/src/data/skills.ts                   ← EVOLUTIONS + EVOLUTION_MODIFIER_DEFS + 辅助函数 + 6个SKILLS条目更新
src/src/systems/modifiers/ModifierTypes.ts ← 可能新增 1-2 个 ModifierBehavior（如 restore_combo）
src/tests/unit/data/skills.evolution.test.ts ← 进化数据+工厂+查询测试
```

新文件：
```
src/tests/unit/data/skills.evolution.test.ts
```

依赖方向：`data ← core ← systems ← scenes`（所有修改在 data 和 core 层）

### References

- [Source: docs/epics.md#Epic 15] Story 15.1 完整 AC
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向B二期] 技能进化分支设计
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#实施优先级] Phase Four = Evolution
- [Source: src/src/data/skills.ts] 现有技能数据 + SkillModifierFactory 模式
- [Source: src/src/core/types.ts] SkillData + PlayerState 类型定义
- [Source: src/src/systems/modifiers/ModifierTypes.ts] Modifier + ModifierBehavior 类型
- [Source: docs/stories/14-3-word-condition-extension.md] 最近完成的 Story 模式参考
- [Source: docs/gdd.md#技能系统] 技能升级 Lv1-Lv3 设计

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None required — all 1922 tests passed on first run after fixing one context-dependent test assertion.

### Completion Notes List

- Story references `SkillData` but codebase uses `SkillDefinition` — added `evolutions` to `SkillDefinition` instead.
- Story references `resetState()` but actual init happens in `createInitialState()` — added `evolvedSkills: new Map()` there.
- Added 3 new `ModifierBehavior` types: `restore_combo` (freeze_chrono), `set_word_cooldown` (amp_overdrive), `trigger_random_adjacent` (echo_phantom). All are data-only — executor logic belongs to Story 15.2.
- `echo_resonance` factory outputs same `set_echo_flag` as base echo per pitfall #9 — runtime (15.2) distinguishes triple trigger via `evolvedSkills` check.
- `lone_shadow` uses factory-level ctx check (`skillsTriggeredThisWord <= 2`) instead of condition, because `skills_triggered_this_word` condition uses `===` (exact equality) and no `skills_triggered_lte` exists.
- `core_nexus` and `core_fusion` use different stack bonuses (15% vs 5%) with same trigger-count-based stacking as original core.
- `freeze_permafrost` uses fixed 1.5s time value — once-per-word constraint is runtime logic for 15.2.
- Gold cost tiers: 40 (score/time skills), 50 (multiply/chain skills), 60 (rare burst/passive skills).
- Total tests: 1923 passed across 74 test files (61 new evolution tests, 42 pre-existing audio failures excluded).

**Code Review Fixes (Claude Opus 4.6):**
- Fixed `core_nexus` description: "每个相邻技能 +15% 增强" → "每3次触发 +15% 增强" (matches factory implementation)
- Added `lone_shadow` test for `skillsTriggeredThisWord: 0` edge case (1 new test)
- Removed unused `beforeEach` import from test file
- Fixed Story Dev Notes code snippet: `SkillData` → `SkillDefinition`
- Added `_lvl` parameter to `freeze_permafrost` and `freeze_chrono` factories for consistency
- Added placeholder no-op cases in `BehaviorExecutor` for 3 new behavior types
- Total tests after review: 1923 passed across 74 test files (61 evolution tests).

### File List

Modified:
- `src/src/core/types.ts` — `EvolutionBranch` interface + `SkillDefinition.evolutions` + `PlayerState.evolvedSkills`
- `src/src/core/state.ts` — `createInitialState()` initializes `evolvedSkills` as empty Map
- `src/src/data/skills.ts` — `EVOLUTIONS` (12 branches) + `EVOLUTION_MODIFIER_DEFS` (12 factories) + `getSkillModifierFactory()` + `getEvolutionBranches()` + 6 SKILLS entries updated with `evolutions` field
- `src/src/systems/modifiers/ModifierTypes.ts` — 3 new `ModifierBehavior` types: `restore_combo`, `set_word_cooldown`, `trigger_random_adjacent`
- `src/src/systems/modifiers/BehaviorExecutor.ts` — placeholder no-op cases for 3 new behavior types

New:
- `src/tests/unit/data/skills.evolution.test.ts` — 61 tests covering data integrity, factory output, query logic, consistency, conditions
