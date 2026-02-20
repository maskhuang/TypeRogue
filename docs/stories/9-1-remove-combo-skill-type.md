# Story 9.1: 移除 combo 技能类型，统一为 multiply

Status: done

## Story

As a 玩家,
I want 倍率提升技能直接增加倍率而非连击数,
so that 技能效果直观明确——"增幅"就是加倍率，连击是打字能力的体现而非技能注水。

## Acceptance Criteria

1. `SkillType` 和 `ActiveSkillType` 中不再包含 `'combo'`
2. `chain`（连锁）技能改为 `multiply` 类型，触发时直接增加倍率（+0.1/次）
3. `systems/skills.ts` 中删除 `case 'combo'` 分支
4. `ActiveSkillSystem.ts` 中删除 `case 'combo'` 分支
5. `SkillCoordinator.ts` 中移除 `skill.type === 'combo'` 条件
6. 连击计数器（combo counter）保持不变，仍作为纯打字指标
7. 所有现有测试通过
8. `EffectQueue` 中的 `'chain'` 效果类型保持不变（独立概念）

## Tasks / Subtasks

- [x] Task 1: 移除 combo 类型定义 (AC: #1)
  - [x] 1.1 `src/src/core/types.ts` L61: 从 `SkillType` 中移除 `'combo'`
  - [x] 1.2 `src/src/core/types.ts` L65: 从 `ActiveSkillType` 中移除 `'combo'`

- [x] Task 2: 重设计 chain 技能为 multiply 类型 (AC: #2)
  - [x] 2.1 `src/src/data/skills.ts`: chain 技能 `type` 改为 `'multiply'`
  - [x] 2.2 更新 chain 技能数值: base=10, grow=3, desc='触发时倍率+0.1'
  - [x] 2.3 保留"连锁"名称和🔗图标，更新描述

- [x] Task 3: 删除 combo case 分支 (AC: #3, #4, #5)
  - [x] 3.1 `src/src/systems/skills.ts`: 删除 `case 'combo'` 整个 block
  - [x] 3.2 `src/src/systems/skills/active/ActiveSkillSystem.ts`: 删除 `case 'combo'` block
  - [x] 3.3 `src/src/systems/skills/SkillCoordinator.ts`: 从条件中移除 `|| skill.type === 'combo'`

- [x] Task 4: 验证不影响连击系统 (AC: #6, #8)
  - [x] 4.1 确认 ComboCounter、combo:update 事件、combo 相关 UI 不受影响
  - [x] 4.2 确认 EffectQueue 的 'chain' 效果类型保持不变

- [x] Task 5: 更新文档 (AC: #1)
  - [x] 5.1 `docs/epics.md` L110: 从技能类型枚举中移除 `combo`

- [x] Task 6: 测试验证 (AC: #7)
  - [x] 6.1 运行全部单元测试，1401/1401 通过，0 失败
  - [x] 6.2 grep 验证无残留 combo 技能类型引用

## Dev Notes

### 设计决策

- **为什么移除 combo 技能类型：** combo 类型通过加连击间接增加倍率（`baseMultiplier + combo × comboBonus`），与 multiply 类型（直接加倍率）本质重复。统一为 multiply 让技能效果更直观。
- **连击计数器保留：** combo counter 是打字能力的度量（连续正确击键），不应被技能"注水"。倍率来源变为：自然连击（打字） + multiply 技能（主动触发）。
- **chain 技能转型：** 从"连击+5"改为"倍率+0.1"，作为低成本倍率技能与 amp(+0.2) / surge(+0.3) 形成梯度。

### multiply 技能梯度

| 技能 | 倍率增量 | base | grow | 定位 |
|------|---------|------|------|------|
| chain 连锁 | +0.1 | 10 | 3 | 入门倍率技能 |
| amp 增幅 | +0.2 | 20 | 5 | 中端倍率技能 |
| surge 激涌 | +0.3 | 30 | 8 | 高端倍率技能 |

### 关键区分：combo 计数器 vs combo 技能类型

- **combo 计数器** (`state.combo`, ComboCounter UI, `combo:update` 事件) → 保留不变
- **combo 技能类型** (`type: 'combo'` in SkillType) → 移除
- **chain 效果类型** (`EffectType = 'chain'` in EffectQueue) → 保留不变（独立概念）

### Project Structure Notes

- 所有技能数据: `src/src/data/skills.ts`
- 技能触发逻辑: `src/src/systems/skills.ts`（主战斗循环中的简化版）
- 技能系统完整版: `src/src/systems/skills/active/ActiveSkillSystem.ts`, `SkillCoordinator.ts`
- 类型定义: `src/src/core/types.ts`
- EffectQueue（不修改）: `src/src/systems/skills/active/EffectQueue.ts`

### References

- [Source: docs/epics.md#Epic 9, Story 9.1]
- [Source: docs/game-architecture.md#技能系统]
- [Source: src/src/core/types.ts#SkillType]
- [Source: src/src/systems/skills.ts#triggerSkill]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- ✅ 从 SkillType 和 ActiveSkillType 中移除 'combo'
- ✅ chain 技能从 combo 改为 multiply (base=10, grow=3, +0.1 倍率)
- ✅ 删除 skills.ts、ActiveSkillSystem.ts 中的 case 'combo' 分支
- ✅ SkillCoordinator.ts 条件中移除 combo 引用
- ✅ epics.md 文档更新
- ✅ 全部 1401 个测试通过，无回归
- ✅ grep 确认无残留 combo 技能类型引用，连击系统完整

### Change Log

- 2026-02-20: Story 9.1 实现完成 - 移除 combo 技能类型，chain 改为 multiply

### File List

- `src/src/core/types.ts` (modified) - 移除 combo 从 SkillType/ActiveSkillType
- `src/src/data/skills.ts` (modified) - chain 技能改为 multiply 类型
- `src/src/systems/skills.ts` (modified) - 删除 case 'combo' 分支
- `src/src/systems/skills/active/ActiveSkillSystem.ts` (modified) - 删除 case 'combo' 分支
- `src/src/systems/skills/SkillCoordinator.ts` (modified) - 移除 combo 条件
- `docs/epics.md` (modified) - 更新技能类型枚举
