# Story 35.8: 状态生命周期与序列化

Status: done

## Story

As a player,
I want my affix skill runtime states to correctly reset at word/stage/run boundaries and persist through save/load cycles,
so that gameplay state is always consistent and old saves gracefully migrate to the new affix system.

## Acceptance Criteria

1. **AC1 — 每词初始化**: 每个新单词开始时，所有装备技能的 Decay 词条 `currentDecayMult` 重置为该词条的 `initialMult` 值。测试：Decay(initialMult=2.0) 触发 3 次衰减后→新单词→重新为 2.0
2. **AC2 — 每关初始化**: 关卡开始时（首次击键前）：(a) 所有技能 `triggerCount = 0`；(b) 所有技能 `amplifyStacks = 0`；(c) Mirror 词条调用 `resolveMirrorCopy()` 刷新 `mirrorCopiedAffix`。测试：Stage1 积累 triggerCount=50 → Stage2 开始→triggerCount=0
3. **AC3 — Run 结束重置**: Run 结束时：`apprenticeAccumulated = 0`、`questCompletions = 0`、`questStacks = 0`（所有技能）。测试：5 关积累 apprenticeAccumulated=30% → run 结束 → 新 run 为 0
4. **AC4 — SkillSaveData 序列化往返**: `AffixSkillSaveData` 通过 `JSON.stringify → JSON.parse` 无损往返（所有字段含 runtime 8 个状态 + affixes 数组 + enchantmentIds）
5. **AC5 — 旧技能兼容删除**: `DELETED_SKILL_IDS` 常量列出所有 Epic 34 旧系统技能 ID；RunState 加载时过滤掉这些 ID 的技能，同时清除对应 bindings
6. **AC6 — 无 affixes 字段迁移**: 旧存档缺少 `affixes` 字段时，转为白色品质（rarity=0, affixes=[]），游戏正常继续

## Tasks / Subtasks

- [x] Task 1: 实现词条级生命周期钩子 (AC: #1)
  - [x] 1.1 在 `affixTrigger.ts` 中导出 `resetDecayForWord(skills, skillStates)` 纯函数：遍历所有技能的 Decay 词条，将对应 `runtimeState.currentDecayMult` 重置为 `affix.initialMult`
  - [x] 1.2 编写测试：Decay 词条触发 3 次衰减后调用 resetDecayForWord → 恢复 initialMult
  - [x] 1.3 编写测试：无 Decay 词条的技能调用 resetDecayForWord → 无变化

- [x] Task 2: 实现关卡级生命周期钩子 (AC: #2)
  - [x] 2.1 在 `affixTrigger.ts` 中导出 `resetStageState(skills, skillStates)` 纯函数：遍历所有技能，重置 `triggerCount = 0`、`amplifyStacks = 0`
  - [x] 2.2 在同函数内，对含 Mirror 词条的技能调用 `resolveMirrorCopy()` 更新 `mirrorCopiedAffix`（需传入邻居技能 + 随机函数）
  - [x] 2.3 编写测试：Stage 后 triggerCount=50, amplifyStacks=30 → resetStageState → 全部归零
  - [x] 2.4 编写测试：Mirror 词条在 resetStageState 后获得新的 copiedAffix（mock randomFn 控制结果）

- [x] Task 3: 实现 Run 级重置钩子 (AC: #3)
  - [x] 3.1 在 `affixTrigger.ts` 中导出 `resetRunState(skillStates)` 纯函数：遍历所有 runtimeState，重置 `apprenticeAccumulated = 0`、`questCompletions = 0`、`questStacks = 0`
  - [x] 3.2 编写测试：跨关累积的 apprenticeAccumulated/questCompletions → resetRunState → 全部归零
  - [x] 3.3 编写测试：chargeAccumulated、triggerCount 等非 run 级字段不受影响

- [x] Task 4: 实现序列化往返 (AC: #4)
  - [x] 4.1 在 `affixTrigger.ts` 中导出 `serializeSkill(skill, runtimeState): AffixSkillSaveData` 纯函数
  - [x] 4.2 在 `affixTrigger.ts` 中导出 `deserializeSkill(data: AffixSkillSaveData): { skill: AffixSkillInstance, runtimeState: SkillRuntimeState }` 纯函数
  - [x] 4.3 编写测试：生成技能 → serialize → JSON.stringify → JSON.parse → deserialize → 逐字段对比一致
  - [x] 4.4 编写测试：含 mirrorCopiedAffix (非 null) 的技能序列化往返无损
  - [x] 4.5 编写测试：含多个附魔和 3 个词条的满配技能序列化往返

- [x] Task 5: 实现旧存档兼容 (AC: #5, #6)
  - [x] 5.1 在 `affixes.ts` 中导出 `OLD_SKILL_PREFIXES` + `isOldSystemSkill()` 函数：前缀匹配 prod_/conv_/conn_/amp_ 识别所有 Epic 19/34 旧系统技能（共 ~244 个，比逐一列举更可维护）
  - [x] 5.2 在 `affixTrigger.ts` 中导出 `migrateLoadedSkills(loadedSkills: any[]): AffixSkillSaveData[]`：(a) 过滤 isOldSystemSkill；(b) 缺少 affixes 字段的技能设置 `affixes = [], rarity = 0`
  - [x] 5.3 编写测试：混合旧+新技能 → migrateLoadedSkills → 仅保留新技能
  - [x] 5.4 编写测试：缺少 affixes 字段的旧技能 → 迁移为 rarity=0 白色技能
  - [x] 5.5 编写测试：已有 affixes 字段的新技能 → 不被修改

## Dev Notes

### 已有实现（勿重复）

**SkillRuntimeState 接口** — `affixes.ts:204-216` 已定义完整 8 字段：
- chargeAccumulated, currentDecayMult, mirrorCopiedAffix, triggerCount, amplifyStacks
- apprenticeAccumulated, questStacks, questCompletions

**AffixSkillSaveData 接口** — `affixes.ts:220-228` 已定义序列化结构：
- id, resource, level, rarity, affixes, enchantmentIds, runtime

**createSkillRuntimeState(skillId)** — `affixes.ts` 工厂函数已存在：
- 初始化所有 8 字段为零值（currentDecayMult = 1 中性乘数）

**resolveMirrorCopy()** — `affixTrigger.ts` 已实现（35-6）：
- 需要 skillId、allSkills、bindings、triggerKey、randomFn
- 返回 AffixInstance | null
- 包含 QuestMirror 增幅逻辑（×1.1^c）

**Decay 词条 Phase 3** — `affixTrigger.ts:471-481`：
- 读取 `runtimeState.currentDecayMult`，应用后写回衰减值
- `currentDecayMult = Math.max(floor, currentDecayMult - decayPerTrigger)`

**旧系统 resetResources()** — `core/state.ts:140-152`：
- 已重置 chargeAccumulated Map、pulseCounts Map、unstableResources Map
- 这是非 affix 系统的重置；affix 系统需要独立的生命周期钩子

### 序列化参考模式

**RunState.serialize()** — `core/state/RunState.ts:505-535`：
- Map → Object.fromEntries 模式
- 数组直接展开 [...data]
- 无版本字段

**RunState.deserialize()** — `core/state/RunState.ts:541-637`：
- 过滤 DELETED_SKILL_IDS / DELETED_EVOLUTION_IDS / DELETED_RELIC_IDS
- 通过 || defaults 兼容旧存档
- Object.entries → Map 重建

**MetaState** — 有版本字段 (v1-5)，Set/Map ↔ Array 互转

### 依赖方向（CRITICAL）

```
data (affixes.ts, affixTrigger.ts)  ← 本 Story 工作区
  ↓ 被引用
core (stateCoordinator, RunState)
  ↓ 被引用
systems (skills.ts, battle.ts)      ← 调用生命周期钩子
```

- `affixTrigger.ts` **不得**导入 core 或 systems 层模块
- 所有生命周期函数必须是**纯函数**（接收 state 参数，直接修改后返回）
- 系统层负责在正确时机调用这些钩子（本 Story 不实现系统层调用）

### 8 个状态字段生命周期表

| 状态字段 | 作用域 | 重置时机 | 初始值 |
|---------|--------|---------|-------|
| chargeAccumulated | 实时/每触发 | Phase 2 触发时清零 | 0 |
| currentDecayMult | 每词 | 新单词开始时 → initialMult | 1 (中性) |
| mirrorCopiedAffix | 每关 | 关卡开始时刷新 | null |
| triggerCount | 每关 | 关卡开始时清零 | 0 |
| amplifyStacks | 每关 | 关卡开始时清零 | 0 |
| apprenticeAccumulated | 跨关/Run | Run 结束时清零 | 0 |
| questStacks | 跨关/循环 | 完成时归零（cyclic），Run 结束清零 | 0 |
| questCompletions | 跨关/Run | Run 结束时清零 | 0 |

### 旧技能 ID 收集策略

需要在 `affixes.ts` 中定义 `DELETED_SKILL_IDS`。查找方式：
- 搜索 `src/data/skills.ts`（或旧技能定义文件）中所有 Producer/Converter/Connector/Replicator/Amplifier 技能的 ID
- 搜索 RunState.deserialize 中已有的 `DELETED_SKILL_IDS` / `DELETED_EVOLUTION_IDS` 用于参考
- 如果旧系统 ID 已在 RunState 中被过滤，则本 Story 的 DELETED_SKILL_IDS 可能需要包含 affix 系统替换的旧 ID

### Mirror 序列化注意事项

- `mirrorCopiedAffix` 是完整 `AffixInstance` 或 null
- AffixInstance 所有字段都是原始类型（number/string/enum），可直接 JSON 序列化
- deepCopy 在 stage 初始化时执行（resolveMirrorCopy 内部），序列化时无需再次深拷贝
- 反序列化时直接还原即可

### Quest 循环重置语义

- `questStacks >= target` 时：`questStacks = 0, questCompletions++`（已在 Phase 5 实现）
- Run 结束重置：`questStacks = 0, questCompletions = 0`
- 注意：questStacks 的循环重置由触发流水线处理，resetRunState 只做 run 级清零

### Project Structure Notes

- 词条类型定义: `src/data/affixes.ts` — SkillRuntimeState, AffixSkillSaveData, createSkillRuntimeState
- 触发流水线: `src/data/affixTrigger.ts` — resolvePhase1~6, resolveMirrorCopy, lifecycle 钩子（新增）
- 单元测试: `tests/unit/data/affixTrigger.test.ts`（当前 245 测试通过）
- 旧 RunState: `src/core/state/RunState.ts` — serialize/deserialize 参考
- 旧重置函数: `src/core/state.ts:resetResources()`, `src/systems/skills.ts:resetDecayMultipliers()`

### References

- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.8] — 验收标准原文 + 生命周期表
- [Source: docs/design/affix-skill-system.md#状态生命周期] — 8 状态字段设计
- [Source: docs/design/affix-skill-system.md#序列化] — SkillSaveData 格式
- [Source: docs/project-context.md#Save System Rules] — 原子写入 + IPC 模式
- [Source: docs/project-context.md#State Architecture] — MetaState/RunState/BattleState 三层
- [Source: docs/implementation-artifacts/35-6-enchantment-quest-18.md] — Mirror/Quest 状态模式参考
- [Source: docs/implementation-artifacts/35-7-enchantment-transmute-passive-operator.md] — 纯函数边界 + track 模式

### Previous Story Intelligence (from 35-6 / 35-7)

- **Mirror 参数完整性**: 35-6 review 发现 resolveMirrorCopy 遗漏 8 个数值参数。序列化/反序列化时也要确保 AffixInstance 所有字段完整
- **纯函数边界**: affixTrigger.ts 所有函数必须是纯函数（仅修改传入的 runtimeState 参数），不可引入系统层副作用
- **Action Descriptor Pattern**: Phase 4-6 返回数据描述符，由系统层执行。lifecycle 钩子也应遵循此模式（直接修改传入 state）
- **Test Helpers**: 使用 `makeSkill()` + `makeContext()` + `makeRuntimeState()` + `makeFlags()`
- **数值校验**: 务必与设计文档交叉验证所有硬编码数值
- **track() 模式**: 35-7 review 将 track() 调用移入条件块内，避免分离的状态追踪。lifecycle 函数也应在修改点就地操作

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- **resetDecayForWord**: 纯函数遍历所有技能 Decay 词条，重置 currentDecayMult 为 initialMult
- **resetStageState**: 清零 triggerCount/amplifyStacks/chargeAccumulated + 构造最小 TriggerContext 调用 resolveMirrorCopy 刷新 Mirror
- **resetRunState**: 清零 apprenticeAccumulated/questCompletions/questStacks，不影响 per-stage 字段
- **serializeSkill/deserializeSkill**: 深拷贝所有字段（含 mirrorCopiedAffix），deserialize 使用 ?? defaults 兼容缺失字段
- **旧技能识别**: 使用 OLD_SKILL_PREFIXES 前缀匹配（prod_/conv_/conn_/amp_）替代逐一列举 244 个 ID
- **migrateLoadedSkills**: 过滤旧系统技能 + 补全缺失 affixes/rarity/runtime 字段
- **测试**: 24 个新测试（6 describe 块），269 总通过

### Change Log

- 2026-03-11: Story 35-8 实现完成 — 3 层生命周期钩子 + serialize/deserialize + 旧存档迁移 + 22 新测试
- 2026-03-11: Senior Developer Review 修复 — 5 findings (1H+3M+1L) 全部修复，新增 2 测试，269 总通过

### File List

- **`src/src/data/affixes.ts`** — Modified: 添加 OLD_SKILL_PREFIXES + isOldSystemSkill() 旧技能前缀匹配
- **`src/src/data/affixTrigger.ts`** — Modified: 添加 resetDecayForWord/resetStageState/resetRunState 生命周期钩子 + serializeSkill/deserializeSkill 序列化 + migrateLoadedSkills 迁移函数
- **`src/tests/unit/data/affixTrigger.test.ts`** — Modified: 新增 24 测试 (resetDecayForWord 3 + resetStageState 4 + resetRunState 2 + serialize/deserialize 4 + isOldSystemSkill 5 + migrateLoadedSkills 6)

## Senior Developer Review

### Reviewer Model
Claude Opus 4.6

### Review Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| H1 | HIGH | `migrateLoadedSkills` 不补全缺失 `runtime` 字段 → `deserializeSkill` 访问 `data.runtime.chargeAccumulated` 时 crash | 添加 `runtime` 缺失检测，补全默认 8 字段 |
| M1 | MEDIUM | Mirror 测试未验证 `mirrorCopiedAffix` 是否被设置 | 添加 `expect(mirrorCopiedAffix).not.toBeNull()` + type 断言 |
| M2 | MEDIUM | `resetStageState` 遗漏 `chargeAccumulated` 重置（旧系统 `resetResources()` 会清零） | 添加 `state.chargeAccumulated = 0` + 新增独立测试 |
| M3 | MEDIUM | 测试文件导入未使用的 `createSkillRuntimeState` | 移除未使用导入 |
| L1 | LOW | `deserializeSkill` 中 name/icon 硬编码缺少消费方标注 | 添加 `TODO(35-9)` 注释说明由 shop-integration 恢复 |

All 5 findings fixed. Tests: 269/269 pass.
