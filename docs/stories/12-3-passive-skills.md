# Story 12.3: 被动流技能

Status: done

## Story

As a 玩家,
I want 被动流 3 个技能（core/aura/anchor）通过 Modifier 管道以 enhance 层注入并在游戏中生效,
so that 我可以通过键盘空间布局构筑被动增强路线，让相邻/同行的主动技能获得倍率或分数加成。

## Acceptance Criteria

1. core: enhance 层，相邻技能每触发 3 次 → 当前词倍率 +0.1（重设计，替换现有 base score 实现）
2. aura: enhance 层，相邻 score 类技能效果 ×1.5（已实现，验证匹配即可）
3. anchor: enhance 层，同行所有技能 ×1.15（新增）
4. 被动技能不计入 "本词已触发技能数"（不影响 lone/void/leech 计算）
5. 所有 3 个技能有 Modifier 定义、SKILLS 数据条目、generateFeedback 反馈、单元测试

## Tasks / Subtasks

- [x] Task 1: 类型扩展 (AC: #3)
  - [x] 1.1 `core/types.ts` `SkillType` 添加 `'anchor'`
  - [x] 1.2 `core/types.ts` `PassiveSkillType` 添加 `'anchor'`
  - [x] 1.3 `data/skills.ts` `PASSIVE_SKILL_TYPES` 添加 `'anchor'`

- [x] Task 2: SKILLS 数据 + SKILL_MODIFIER_DEFS 工厂 (AC: #1, #2, #3)
  - [x] 2.1 SKILLS 添加 anchor
  - [x] 2.2 core SKILL_MODIFIER_DEFS 重设计：enhance score 层，每3次触发 ×(1+bonusPerStack)
  - [x] 2.3 aura SKILL_MODIFIER_DEFS 验证：enhance score ×1.5 已正确实现 ✓
  - [x] 2.4 anchor SKILL_MODIFIER_DEFS 新增：enhance score ×1.15
  - [x] 2.5 更新 core SKILLS 数据（base: 10, grow: 5）

- [x] Task 3: anchor 同行注入机制 (AC: #3)
  - [x] 3.1 `systems/skills.ts` `createScopedRegistry()` 扩展：同行被动技能 enhance/global 注入
  - [x] 3.2 新增辅助函数 `getSameRowPassiveSkills(key, selfSkillId): AdjacentSkill[]`

- [x] Task 4: 被动技能不计入 wordSkillCount (AC: #4)
  - [x] 4.1 检查 `triggerSkill()` 中 `synergy.wordSkillCount++` 的位置
  - [x] 4.2 被动技能不通过 `triggerSkill()` 触发，默认已满足 AC #4
  - [x] 4.3 验证：测试确认 createScopedRegistry 不修改 synergy.wordSkillCount

- [x] Task 5: generateFeedback 更新 (AC: #5)
  - [x] 5.1 core: 返回 null（被动，静默增强）
  - [x] 5.2 aura: 保持现有 null ✓
  - [x] 5.3 anchor: 返回 null（被动，静默增强）

- [x] Task 6: 测试 (AC: #5)
  - [x] 6.1 `skills.modifiers.test.ts`: core 工厂重设计测试（enhance score ×1.1 + 升级验证）
  - [x] 6.2 `skills.modifiers.test.ts`: aura 验证测试（已有，确认通过）
  - [x] 6.3 `skills.modifiers.test.ts`: anchor 工厂测试（enhance score ×1.15）
  - [x] 6.4 `skills.pipeline.test.ts`: core enhance score 集成测试
  - [x] 6.5 `skills.pipeline.test.ts`: anchor 同行注入测试（burst 在 F，anchor 在 J → 同行 → burst 获得 ×1.15）
  - [x] 6.6 `skills.pipeline.test.ts`: anchor + aura 叠加测试
  - [x] 6.7 工厂覆盖测试更新（17 → 18 技能）
  - [x] 6.8 回归测试：全量 1682 测试通过

## Dev Notes

### core 重设计说明

**旧设计（已替换）:**
- `category: 'passive'`, 但工厂返回 base 层 score modifier
- `base: 5, grow: 2` → `skillVal + adjacentSkillCount * 2`
- 问题：base 层 modifier 只在自身触发时生效，不符合被动设计

**新设计（AC #1）:**
- core 作为相邻技能的 enhance 层 score modifier 注入
- 使用 `skillsTriggeredThisWord` 上下文计算叠加层数
- 每 3 次触发 = `Math.floor(skillsTriggeredThisWord / 3)` × bonusPerStack
- enhance score type（非 multiply），因为 pipeline 公式 `baseSum × enhanceProduct × globalProduct` 要求对应 effectType 有 base 贡献
- 升级提高 bonusPerStack（Lv1: 0.1, Lv2: 0.15, Lv3: 0.2）

### anchor 同行注入机制

`createScopedRegistry()` 扩展：遍历相邻技能后，额外遍历同行被动技能。用 Set 防止重复注入（如果被动技能同时是相邻的）。

### 被动技能触发机制确认

被动技能 **不** 通过 `triggerSkill()` 触发。AC #4 天然满足。

### 技能数值表

| 技能 | base | grow | 公式 | Lv1 效果 | Lv2 效果 | Lv3 效果 |
|------|------|------|------|----------|----------|----------|
| core | 10 | 5 | stacks × skillVal/100 | 每3触发 score×1.1 | 每3触发 score×1.15 | 每3触发 score×1.2 |
| aura | 3 | 1 | base score + enhance ×1.5 | 1分+×1.5 | 1.33分+×1.5 | 1.67分+×1.5 |
| anchor | 15 | 0 | enhance ×(1+base/100) | ×1.15 | ×1.15 | ×1.15 |

### Project Structure Notes

- 技能定义: `src/src/data/skills.ts`
- 技能系统: `src/src/systems/skills.ts`
- Modifier 类型: `src/src/systems/modifiers/ModifierTypes.ts`
- 管道: `src/src/systems/modifiers/EffectPipeline.ts`
- 类型定义: `src/src/core/types.ts`
- 常量: `src/src/core/constants.ts`（KEYBOARD_ROWS 用于 anchor）
- 测试: `src/tests/unit/` 下对应目录

### References

- [Source: docs/epics.md#Story 12.3] 原始需求定义
- [Source: docs/stories/12-1-burst-multiplier-skills.md] Story 12.1 模式参考
- [Source: docs/stories/12-2-sustain-chain-skills.md] Story 12.2 模式参考

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- core 工厂最初使用 `effect.type: 'multiply'` in enhance 层，但 pipeline 公式 `baseSum × enhanceProduct` 需要对应 type 有 base 贡献才有效果。改为 `effect.type: 'score'` 解决。

### Completion Notes List

- Task 1: 添加 'anchor' 到 SkillType, PassiveSkillType, PASSIVE_SKILL_TYPES
- Task 2: anchor SKILLS 数据 (base:15, grow:0); core 重设计为 enhance score ×(1+stacks×bonusPerStack); anchor 工厂 enhance score ×1.15; aura 验证通过
- Task 3: getSameRowPassiveSkills() 辅助函数 + createScopedRegistry() 同行被动注入（Set 防重复）
- Task 4: 验证被动技能不计入 wordSkillCount（天然满足 — 不走 triggerSkill）
- Task 5: core/anchor generateFeedback 返回 null（被动静默增强），aura 已是 null
- Task 6: 18 个新/更新测试全部通过，1682 总测试 0 回归

### Change Log

- 2026-02-20: Story 12.3 实现完成 — core 重设计, anchor 新增, 同行注入机制
- 2026-02-20: Code review 修复 — H1: 同行注入类型过滤（只限 anchor）, M1: core desc 更新, M2: 泄漏防护测试

### File List

- src/src/core/types.ts (M) — SkillType + PassiveSkillType 添加 'anchor'
- src/src/data/skills.ts (M) — anchor SKILLS 条目, core 数据更新, core/anchor SKILL_MODIFIER_DEFS 工厂
- src/src/systems/skills.ts (M) — getSameRowPassiveSkills(), createScopedRegistry() 同行注入, generateFeedback core→null + anchor→null
- src/tests/unit/data/skills.modifiers.test.ts (M) — core 重写测试, anchor 新增测试, 覆盖 17→18
- src/tests/unit/systems/skills.pipeline.test.ts (M) — core 集成测试, anchor 同行注入/叠加/防重复测试, anchor feedback 测试
