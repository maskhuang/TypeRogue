# Story 35.5: 附魔系统 — 溅射 + 学徒(12)

Status: done

## Story

As a player,
I want splash and apprentice enchantments to be fully defined and functional,
so that enchanted skills gain positional splash effects and permanent growth from diverse gameplay events.

## Acceptance Criteria

1. **AC1 — 溅射附魔数据定义**: 1 个 `Splash` 类型 × 6 个 `PositionRelation` = 6 个实例；触发后等分效率触发范围内技能
2. **AC2 — 学徒附魔 12 类定义**: 每个绑定监听事件和 `growthPerProc` 值（完整常量表）
3. **AC3 — 学徒·观摩 growthPerProc**: 按 PositionRelation 查表（Adjacent 1.5%, SameRow 1%, SameColumn 2%, SameHand 0.5%, SameFinger 2.5%, Symmetric 3%）
4. **AC4 — 学徒·丰收**: 造词师限定，监听 `wordComplete`，+8%
5. **AC5 — 学徒·适应**: 蜕变师限定，监听 `mutationApplied`，+15%
6. **AC6 — apprenticeAccumulated 生命周期**: 跨关保留、run 结束重置
7. **AC7 — 职业限定附魔抽取**: 丰收/适应仅对应职业可抽到

## Tasks / Subtasks

- [x] Task 1: 补全 `APPRENTICE_GROWTH_DEFAULTS` 常量表 (AC: #2)
  - [x] 1.1 在 `affixTrigger.ts` 的 `APPRENTICE_GROWTH_DEFAULTS` 中添加 8 个缺失条目（Word +2%, LongWord +2.5%, Perfect +3%, Combo +1%, Stage +8%, Harvest +8%, Adapt +15%, Neighbor 单独查表不加入此表）
  - [x] 1.2 验证现有 4 条目不变（Self 0.5%→0.005, Crit 2%→0.02, Outcast 1.5%→0.015, Proc 1.5%→0.015）— 已更新为设计文档数值

- [x] Task 2: 溅射附魔数据常量 (AC: #1)
  - [x] 2.1 在 `affixes.ts` 中添加 `SPLASH_ENCHANTMENT_DEFS` 常量：6 个 posRel 变体映射
  - [x] 2.2 确保 `EnchantmentType.Splash` 已存在（已有，已验证）

- [x] Task 3: 补全 Phase 5 学徒自触发逻辑 (AC: #2, #4, #5)
  - [x] 3.1 在 `resolvePhase5` 的学徒处理 switch 中添加 `ApprenticeWord` case
  - [x] 3.2 添加 `ApprenticeLongWord` case（≥6 字母）
  - [x] 3.3 添加 `ApprenticePerfect` case（perfectWord === true）
  - [x] 3.4 添加 `ApprenticeCombo` case（外部事件，Phase 5 内 shouldGrow = false）
  - [x] 3.5 添加 `ApprenticeStage` case（外部事件，Phase 5 内 shouldGrow = false）
  - [x] 3.6 添加 `ApprenticeHarvest` case（同 ApprenticeWord，抽取时已过滤职业）
  - [x] 3.7 添加 `ApprenticeAdapt` case（mutationApplied === true）

- [x] Task 4: 外部事件回调函数 (AC: #2, #6)
  - [x] 4.1 导出 `applyApprenticeEvent(event, runtimeState, enchantmentIds)` 纯函数
  - [x] 4.2 支持事件: `stageCleared`（→ApprenticeStage +8%）、`comboReach`（→ApprenticeCombo +1%）
  - [x] 4.3 此函数仅做数据计算，保持 data 层纯粹

- [x] Task 5: 职业限定附魔过滤 (AC: #7)
  - [x] 5.1 在 `affixes.ts` 中添加 `CLASS_RESTRICTED_ENCHANTMENTS` 映射
  - [x] 5.2 导出 `filterEnchantmentsByClass(candidates, playerClass?)` 纯函数

- [x] Task 6: TriggerContext 扩展 (AC: #3, #4, #5)
  - [x] 6.1 在 TriggerContext 中添加可选字段：`perfectWord`、`comboCount`、`playerClass`、`mutationApplied`
  - [x] 6.2 确认 `splashPosRel` 已存在（已有）

- [x] Task 7: 单元测试 (AC: 全部)
  - [x] 7.1 溅射测试：SPLASH_ENCHANTMENT_DEFS 6 个 posRel 完整性验证
  - [x] 7.2 学徒自触发测试：10 个 case（Word/LongWord/Perfect/Combo/Stage/Harvest/Adapt 正向 + 反向）
  - [x] 7.3 外部事件回调测试：applyApprenticeEvent 5 个 case（stageCleared/comboReach/unknown/missing/incremental）
  - [x] 7.4 职业限定过滤测试：4 个 case（无职业/造词师/蜕变师/未知职业）
  - [x] 7.5 growthPerProc 数值断言：11 个值全部与设计文档校验 + Neighbor 排除验证

## Dev Notes

### 已有实现（勿重复）

**溅射 Phase 5** — `affixTrigger.ts:746-757` 已完整实现：
- 读取 `ctx.splashPosRel`，获取范围内邻居，返回 `splashTargets: { key, efficiency }[]`
- 已有 3 个测试（posRel 邻居+效率、无 posRel 返空、无邻居返空）+ 1 个集成测试

**学徒 Phase 5 自触发** — `affixTrigger.ts:680-707` 已有 4 种：
```typescript
APPRENTICE_GROWTH_DEFAULTS = {
  ApprenticeSelf: 0.02,    // 注意：设计文档说 0.5%=0.005
  ApprenticeCrit: 0.04,    // 设计文档说 2%=0.02
  ApprenticeOutcast: 0.03, // 设计文档说 1.5%=0.015
  ApprenticeProc: 0.03,    // 设计文档说 1.5%=0.015
}
```
> **⚠️ 数值冲突**: 现有代码数值（0.02~0.04）与设计文档（0.005~0.02）不一致。以设计文档为准，需要更新现有值。如果这些值是 35-3/35-4 有意调整的，请查看 35-3/35-4 的 Completion Notes 确认。

**学徒·观摩 Phase 6** — `affixTrigger.ts:813-820` 已实现：
- 读取 `skillEnchantmentParams` 中的 posRel → 查 `APPRENTICE_NEIGHBOR_GROWTH` 表 → 返回 action descriptor
- `APPRENTICE_NEIGHBOR_GROWTH` 在 `affixes.ts:342-349` 已定义，数值与设计文档一致

### 关键设计决策

1. **事件驱动学徒分两层**:
   - **自触发型**（Phase 5 内联）: Self/Crit/Outcast/Proc/Word/LongWord/Perfect/Harvest/Adapt — 在 `resolvePhase5` 中根据 ctx 字段判断
   - **外部事件型**（独立回调）: Stage/Combo — 由系统层在对应事件发生时调用 `applyApprenticeEvent()`
   - **邻居型**（Phase 6）: Neighbor — 已在 `resolvePhase6` 中实现

2. **Action Descriptor 模式**: Phase 4-6 返回数据描述符，不直接调用系统层。溅射返回 `splashTargets[]`，由调用方在系统层执行实际触发。学徒成长直接写入 `runtimeState.apprenticeAccumulated`（与 35-3/35-4 一致）。

3. **TriggerContext 扩展模式**: 通过可选字段传递事件上下文，不在 data 层主动检测事件。`currentWord`/`perfectWord`/`comboCount` 等由调用方注入。

4. **职业限定在抽取时过滤，不在触发时过滤**: 如果技能已有 ApprenticeHarvest，即使不是造词师也会生效（抽取时已保证正确性）。

### 依赖方向（CRITICAL）

```
data (affixes.ts, affixTrigger.ts)  ← 本 Story 工作区
  ↓ 被引用
core (stateCoordinator)
  ↓ 被引用
systems (skills.ts, battle.ts)      ← 调用 resolvePhase5 + applyApprenticeEvent
```

- `affixTrigger.ts` **不得**导入 core 或 systems 层模块
- `affixes.ts` 仅含类型和常量，无逻辑

### Project Structure Notes

- 附魔类型定义: `src/data/affixes.ts` — EnchantmentType 枚举、常量表
- 触发流水线: `src/data/affixTrigger.ts` — resolvePhase1~6 纯函数
- 单元测试: `tests/unit/data/affixTrigger.test.ts`
- 键盘拓扑: `src/data/keyboardTopology.ts` — `hasRelation()`, `getKeysWithRelation()`

### References

- [Source: docs/design/affix-skill-system.md#4.5 附魔系统] — 溅射/学徒完整设计
- [Source: docs/design/affix-skill-system.md#Phase 5 伪代码] — 学徒/溅射触发逻辑
- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.5] — 验收标准原文
- [Source: docs/implementation-artifacts/35-4-trigger-pipeline-phase4-6.md] — Phase 5 已有实现和 dev notes
- [Source: docs/project-context.md#Skill System Rules] — 依赖方向和架构规则

### Previous Story Intelligence (from 35-4)

- **Action Descriptor 模式已建立**: Phase 4 返回 `Phase4Result`，Phase 5 返回 `Phase5Result`，Phase 6 返回 `Phase6Result`。所有跨技能操作通过 descriptor 数组返回。
- **Side effect 模式**: `amplifyStacks`/`apprenticeAccumulated`/`questStacks`/`questCompletions` 直接写入 runtimeState（不走 descriptor）。本 Story 的学徒成长沿用此模式。
- **TriggerContext 已有可选字段**: `splashPosRel`、`transmuteResource`、`skillEnchantmentParams`。新增字段延续此模式。
- **Code Review 修复**: findWeakestNeighbor 自排除 bug、Rainbow+Link 资源传递 bug。注意类似的 self-inclusion 陷阱。
- **测试模式**: 使用 `buildTestSkill()` + `buildTriggerContext()` helper，mock `getKeysWithRelation` 和 `hasRelation`。

### 设计文档学徒 growthPerProc 完整表

| 附魔 | 事件 | growthPerProc | 触发位置 |
|------|------|--------------|---------|
| 学徒·自修 (Self) | selfTrigger | 0.005 (0.5%) | Phase 5 |
| 学徒·观摩 (Neighbor) | neighborTrigger | 按posRel表 | Phase 6 |
| 学徒·造词 (Word) | wordComplete | 0.02 (2%) | Phase 5 |
| 学徒·悟道 (Proc) | affixProc | 0.015 (1.5%) | Phase 5 |
| 学徒·暴击 (Crit) | critHit | 0.02 (2%) | Phase 5 |
| 学徒·流放 (Outcast) | outcastProc | 0.015 (1.5%) | Phase 5 |
| 学徒·长词 (LongWord) | longWord(≥6) | 0.025 (2.5%) | Phase 5 |
| 学徒·精准 (Perfect) | perfectWord | 0.03 (3%) | Phase 5 |
| 学徒·连击 (Combo) | comboReach(15) | 0.01 (1%) | 外部回调 |
| 学徒·通关 (Stage) | stageCleared | 0.08 (8%) | 外部回调 |
| 学徒·丰收 (Harvest) | wordComplete | 0.08 (8%) | Phase 5 (造词师限定) |
| 学徒·适应 (Adapt) | mutationApplied | 0.15 (15%) | Phase 5 (蜕变师限定) |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- **APPRENTICE_GROWTH_DEFAULTS 扩充**: 从 4 条 → 11 条，覆盖所有非 Neighbor 学徒类型。发现并修正旧值与设计文档不一致（Self 0.02→0.005, Crit 0.04→0.02, Outcast 0.03→0.015, Proc 0.03→0.015）
- **Phase 5 学徒自触发扩展**: 新增 7 个 case（Word/LongWord/Perfect/Harvest/Adapt/Combo/Stage），其中 Combo/Stage 标记为外部事件（shouldGrow=false），由 `applyApprenticeEvent` 处理
- **`applyApprenticeEvent` 外部回调**: 纯函数，接收事件名+runtimeState+enchantmentIds，通过 `APPRENTICE_EVENT_MAP` 映射到附魔类型后查 growthPerProc 表累加
- **TriggerContext 扩展**: 添加 `perfectWord`/`comboCount`/`playerClass`/`mutationApplied` 可选字段，延续已有的可选字段扩展模式
- **SPLASH_ENCHANTMENT_DEFS**: 6 个 posRel 变体的溅射定义数据常量（溅射触发逻辑已在 35-4 实现）
- **CLASS_RESTRICTED_ENCHANTMENTS + filterEnchantmentsByClass**: 职业限定附魔抽取过滤，Harvest→wordsmith, Adapt→metamorph
- **设计决策 — Harvest/Adapt 触发不检查职业**: 一旦附魔被抽到（已通过 filterEnchantmentsByClass 过滤），触发时不再二次检查职业。Harvest 行为等同 ApprenticeWord，Adapt 仅检查 mutationApplied
- **测试**: 26 个新测试，178 总测试通过（affixTrigger）；283 总 affix 相关测试通过

### Senior Developer Review

**Review Date**: 2026-03-11
**Review Model**: Claude Opus 4.6

**Issues Found & Fixed**:

1. **H1 — Phase 2 双重计算 apprenticeAccumulated** (FIXED): 多个学徒附魔时 `apprenticeAccumulated` 被重复加入 `bonusPercent`。修复：将循环内逐附魔检查改为循环外一次性 `.some()` 检查，确保只加一次。新增 3 个测试验证。

2. **M1 — 重复 `// ===== 内部辅助 =====` 注释** (FIXED): 第 934 行和第 967 行有两个相同的 section header。移除了多余的一个。

3. **M2 — ApprenticeWord/Harvest 始终触发** (FIXED): `currentWord` 是 TriggerContext 必填字段，`ctx.currentWord != null` 恒为 true，导致 ApprenticeWord/Harvest 在每次按键时都成长而非仅在完成单词时。修复：新增 `wordCompleted?: boolean` 可选字段，ApprenticeWord/LongWord/Harvest 改用 `ctx.wordCompleted === true` 判断。更新+新增 4 个测试。

**Post-Fix Test Results**: 182/182 affixTrigger, 287/287 affix 相关测试全部通过

### Change Log

- 2026-03-11: Story 35-5 实现完成 — 学徒附魔 12 类完整 + 溅射数据定义 + 职业过滤 + 26 新测试
- 2026-03-11: Code review 修复 — H1 Phase 2 双重计算 + M1 重复注释 + M2 wordCompleted 信号修正 + 4 新测试

### File List

- **`src/src/data/affixTrigger.ts`** — Modified: APPRENTICE_GROWTH_DEFAULTS 扩充+修正, TriggerContext 新字段(wordCompleted), Phase 2 学徒累积去重, Phase 5 学徒 switch 扩展(wordCompleted), applyApprenticeEvent 外部回调, 去重复注释
- **`src/src/data/affixes.ts`** — Modified: SPLASH_ENCHANTMENT_DEFS, CLASS_RESTRICTED_ENCHANTMENTS, filterEnchantmentsByClass
- **`src/tests/unit/data/affixTrigger.test.ts`** — Modified: 更新 4 个旧值期望, 新增 30 个测试（growth defaults, Phase 2 去重, Phase 5 新类型, 外部回调, 溅射定义, 职业过滤）
