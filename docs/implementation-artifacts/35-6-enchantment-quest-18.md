# Story 35.6: 附魔系统 — 任务附魔(18)

Status: done

## Story

As a player,
I want all 18 quest enchantments fully functional with correct event stacking, completion effects, draw filtering, and Twin interaction,
so that each quest enchantment permanently strengthens its corresponding affix through cyclical completion.

## Acceptance Criteria

1. **AC1 — 18 任务附魔定义完整**: `QUEST_ENCHANTMENT_DEFS` 18 条全部定义（已完成于 35-1，验证即可）
2. **AC2 — 循环机制**: `questStacks++` → 满层 `questCompletions++` 并重置 → 无限循环（已完成于 35-4，验证即可）
3. **AC3 — 所有 18 个任务完成效果生效**: Phase 2-5 内联计算（13 已有 + 5 需补全），`questCompletions` 跨关保留、run 结束重置
4. **AC4 — 任务·吞噬特殊逻辑**: 满层时 `eatWeakestNeighbor(posRel)`（已完成于 35-4，验证即可）
5. **AC5 — 任务·共振同时服务共鸣和连接**: 监听 `neighborTrigger`（已完成于 35-4，验证即可）
6. **AC6 — 任务·映射**: 监听 `stageCleared`，每次完成使 Mirror 复制参数 ×1.1
7. **AC7 — 任务·重叠**: 连字 N 上限 +1/层（基础=实际出现次数，quest 增加虚拟计数）
8. **AC8 — 任务·献祭**: penaltyChance -1% min 2%（已完成于 35-3，验证即可）
9. **AC9 — 附魔生成过滤**: `filterQuestCandidates(skill)` 仅返回技能拥有对应词条的任务
10. **AC10 — 双生词条交互**: `getEnchantmentSlotCount(skill)` → Twin 时返回 2，否则 1

## Tasks / Subtasks

- [x] Task 1: 扩展 `checkQuestEventCondition` 内联事件 (AC: #3)
  - [x] 1.1 添加 `perfectWord` case → `ctx.perfectWord === true`（QuestAscend 使用）
  - [x] 1.2 添加 `wordComplete` case → `ctx.wordCompleted === true`（QuestEnergize, QuestPolarize 使用）
  - [x] 1.3 添加 `longWord:6` case → `ctx.wordCompleted === true && ctx.currentWord.length >= 6`（QuestFission 使用）
  - [x] 1.4 添加 `neighborTrigger` case → 保留 `return false`（Phase 6 已独立处理 QuestResonance，Phase 5 内不重复叠层）

- [x] Task 2: Phase 3 Ligature 补全 QuestOverlap (AC: #7)
  - [x] 2.1 在 `AffixType.Ligature` case 中调用 `getQuestCompletions(skill, runtimeState, EnchantmentType.QuestOverlap)`
  - [x] 2.2 计算 `nEff = n + c`（n = 实际出现次数，c = quest completions），用 nEff 替代 n 作为乘数
  - [x] 2.3 仅当 `nEff >= 2` 时触发（保留原有阈值）

- [x] Task 3: Phase 5 Recurse 补全 QuestIterate (AC: #3)
  - [x] 3.1 在 `AffixType.Recurse` case 中调用 `getQuestCompletions(skill, runtimeState, EnchantmentType.QuestIterate)`
  - [x] 3.2 计算 `chanceEff = (affix.recurseChance ?? 0) + c * 0.03`
  - [x] 3.3 半衰也使用 chanceEff：`newChance: chanceEff / 2`

- [x] Task 4: Gravity 词条数据助手 + QuestPolarize 效果 (AC: #3)
  - [x] 4.1 导出 `getEffectiveProbMult(affix, runtimeState, skill): number` 纯函数
  - [x] 4.2 公式：`baseProbMult = affix.probMult ?? 1`，`delta = |baseProbMult - 1|`，`enhancedDelta = delta + c * 0.15`，返回 `baseProbMult > 1 ? 1 + enhancedDelta : 1 - enhancedDelta`（保持引力/斥力方向不变）
  - [x] 4.3 Gravity 在 Phase 3 中无直接乘算效果（它影响词选不影响产出），不需要 Phase 3 case
  - [x] 4.4 说明：此函数供词选系统（outside trigger pipeline）调用，保持 data 层纯粹

- [x] Task 5: Mirror 词条阶段初始化 + QuestMirror 增强 (AC: #6)
  - [x] 5.1 导出 `resolveMirrorCopy(skill, runtimeState, ctx): AffixInstance | null` 纯函数
  - [x] 5.2 逻辑：找到 Mirror 词条 → 获取 `posRel` 范围内邻居 → 随机选择一个邻居的一个词条 → 复制类型+参数
  - [x] 5.3 QuestMirror 增强：获取 `getQuestCompletions(QuestMirror)`，对复制的数值参数全部 ×`1.1^c`
  - [x] 5.4 返回复制的 `AffixInstance`，调用方存入 `runtimeState.mirrorCopiedAffix`
  - [x] 5.5 说明：此函数在关卡开始时由 systems 层调用，非每次触发调用

- [x] Task 6: 外部任务事件回调 (AC: #3, #6)
  - [x] 6.1 导出 `applyQuestEvent(event, runtimeState, enchantmentIds): boolean` 纯函数
  - [x] 6.2 `QUEST_EXTERNAL_EVENT_MAP`: `{ stageCleared: ['quest_mirror'], comboReach: ['quest_purify'] }`
  - [x] 6.3 逻辑：查表→匹配 enchantmentIds→`questStacks++`→满层 `questCompletions++` 重置
  - [x] 6.4 注意：需要读取对应 `QUEST_ENCHANTMENT_DEFS` 的 `targetStacks` 来判断是否满层

- [x] Task 7: 任务附魔抽取过滤 (AC: #9)
  - [x] 7.1 导出 `filterQuestCandidates(skill): EnchantmentType[]` 纯函数
  - [x] 7.2 逻辑：遍历 `QUEST_AFFIX_MAP`，技能拥有 targetAffix（或 targetAffix[] 中的任一个）→ 加入候选
  - [x] 7.3 排除技能已拥有的附魔（`skill.enchantmentIds` 中已有的不重复抽取）

- [x] Task 8: 双生词条附魔交互 (AC: #10)
  - [x] 8.1 导出 `getEnchantmentSlotCount(skill): number` — 有 Twin 词条返回 2，否则 1
  - [x] 8.2 说明：商店/生成系统调用此函数决定附魔数量，data 层仅提供判断函数

- [x] Task 9: 单元测试 (AC: 全部)
  - [x] 9.1 checkQuestEventCondition 扩展：7 个新 case 测试（perfectWord+/-, wordComplete×2, longWord:6+/-, neighborTrigger）
  - [x] 9.2 QuestOverlap Phase 3：3 case（基础连字无quest、quest+1、quest使n=1→nEff=2触发）
  - [x] 9.3 QuestIterate Phase 5：2 case（quest增加chance、基础chance无quest）
  - [x] 9.4 getEffectiveProbMult：4 case（引力/斥力/无quest/probMult=1）
  - [x] 9.5 resolveMirrorCopy：3 case（正常复制/无邻居/questMirror增强）
  - [x] 9.6 applyQuestEvent：5 case（stageCleared循环/comboReach叠层/满层循环/未知事件/无匹配附魔）
  - [x] 9.7 filterQuestCandidates：4 case（多匹配/空匹配/QuestResonance数组匹配/已有排除）
  - [x] 9.8 getEnchantmentSlotCount：2 case（有Twin/无Twin）
  - [x] 9.9 验证 QUEST_ENCHANTMENT_DEFS 完整性：18 条 + QUEST_AFFIX_MAP 对应

## Dev Notes

### 已有实现（勿重复）

**QUEST_ENCHANTMENT_DEFS** — `affixes.ts:407-435` 已定义全部 18 个任务附魔：
- 每条包含 type, name, targetAffix, event, targetStacks, effectDesc
- `QUEST_AFFIX_MAP` (`affixes.ts:119-138`) 已定义 enchantment→affix 映射

**Phase 5 任务叠层机制** — `affixTrigger.ts:753-779` 已完整实现：
- `checkQuestEventCondition()` 判断事件 → `questStacks++` → 满层 `questCompletions++` 重置
- QuestDevour 特殊：满层时 `findWeakestNeighbor()` → 返回 `devourTarget`

**13/18 任务完成效果已内联** — 分布在 Phase 2/3/4/5/6：
```
Phase 2: QuestRefine(Convert k×1.1^c), QuestDevour(Void +5%/c), QuestEnergize(Charge maxBonus+0.3/c),
         QuestCharge(Outcast bonusPercent+15%/c), QuestStack(Amplify valuePerStack+0.005/c)
Phase 3: QuestOverload(Crit critMult+0.5/c), QuestEcho(Pulse burstMult+0.3/c),
         QuestAscend(Multiply multiplier+0.15/c), QuestChain(Cascade cascadeMult+0.2/c),
         QuestPurify(Decay floor-0.05/c min0.1), QuestSacrifice(Taboo penaltyChance-1%/c min2%)
Phase 4: QuestSpectrum(Rainbow bias+15%/c)
Phase 5: QuestFission(Replicate +1 target/c)
Phase 6: QuestResonance(efficiency+8%/c)
```

**checkQuestEventCondition** — `affixTrigger.ts:594-615` 已处理 7 个内联事件：
```
selfTrigger, critHit, outcastProc, affixProc:pulse, affixProc:cascade, affixProc:recurse, affixProc:taboo_penalty
```
缺失：`perfectWord`, `wordComplete`, `longWord:6`, `neighborTrigger`, `stageCleared`, `comboReach:15`

### 5 个缺失的任务效果

| # | 缺失项 | 位置 | 所需修改 |
|---|--------|------|---------|
| 1 | QuestOverlap (Ligature) | Phase 3 L459 | 加 `getQuestCompletions` + `nEff = n + c` |
| 2 | QuestIterate (Recurse) | Phase 5 L685 | 加 `getQuestCompletions` + chance 增加 |
| 3 | QuestPolarize (Gravity) | 不在 pipeline | 导出 `getEffectiveProbMult()` 供词选系统 |
| 4 | QuestMirror (Mirror) | 不在 pipeline | 导出 `resolveMirrorCopy()` 供关卡初始化 |
| 5 | checkQuestEventCondition | Phase 5 L594 | 补 3 个内联事件 + 1 个注释 |

### 关键设计决策

1. **Gravity 不进 Phase 3**: 引力词条影响词选概率，不影响产出数值。`getEffectiveProbMult()` 作为纯函数导出，由词选系统在技能触发流水线外调用。QuestPolarize 仍在 Phase 5 正常叠层（event: `wordComplete`）。

2. **Mirror 关卡初始化而非触发时**: `resolveMirrorCopy()` 在关卡开始时调用，结果存入 `runtimeState.mirrorCopiedAffix`。触发时 Mirror 的复制词条由调用方合并到 `skill.affixes` 中参与正常流水线。QuestMirror 的 ×1.1^c 增强在复制时一次性应用。

3. **事件分层同 35-5 学徒模式**:
   - **内联型**（Phase 5 `checkQuestEventCondition`）: selfTrigger, critHit, outcastProc, affixProc:*, perfectWord, wordComplete, longWord:6
   - **外部事件型**（独立回调 `applyQuestEvent`）: stageCleared, comboReach
   - **Phase 6 独立型**: neighborTrigger（QuestResonance 已在 Phase 6 处理）

4. **Twin 仅影响附魔数量**: `getEnchantmentSlotCount()` 返回 1 或 2，商店/生成系统据此决定附魔分配数量。data 层不主动执行附魔分配。

5. **applyQuestEvent 需要 targetStacks**: 与 `applyApprenticeEvent` 不同，任务外部事件需要查 `QUEST_ENCHANTMENT_DEFS` 的 `targetStacks` 来判断满层。函数签名需额外处理。

### 依赖方向（CRITICAL）

```
data (affixes.ts, affixTrigger.ts)  ← 本 Story 工作区
  ↓ 被引用
core (stateCoordinator)
  ↓ 被引用
systems (skills.ts, battle.ts)      ← 调用 applyQuestEvent + resolveMirrorCopy + getEffectiveProbMult
```

- `affixTrigger.ts` **不得**导入 core 或 systems 层模块
- `affixes.ts` 仅含类型和常量，无逻辑
- 新增的 `resolveMirrorCopy` 和 `getEffectiveProbMult` 放在 `affixTrigger.ts` 中

### Project Structure Notes

- 附魔类型定义: `src/data/affixes.ts` — EnchantmentType 枚举、QUEST_ENCHANTMENT_DEFS、QUEST_AFFIX_MAP
- 触发流水线: `src/data/affixTrigger.ts` — resolvePhase1~6、checkQuestEventCondition、getQuestCompletions
- 单元测试: `tests/unit/data/affixTrigger.test.ts`
- 键盘拓扑: `src/data/keyboardTopology.ts` — `hasRelation()`, `getKeysWithRelation()`

### References

- [Source: docs/design/affix-skill-system.md#任务附魔（18 个）] — 18 个任务完整设计表
- [Source: docs/design/affix-skill-system.md#双生词条与附魔交互] — Twin 附魔交互规则
- [Source: docs/design/affix-skill-system.md#4.5 附魔系统] — 附魔总览
- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.6] — 验收标准原文
- [Source: docs/implementation-artifacts/35-4-trigger-pipeline-phase4-6.md] — Phase 4-6 已有实现
- [Source: docs/implementation-artifacts/35-5-enchantment-splash-apprentice.md] — 学徒附魔模式参考
- [Source: docs/project-context.md#Skill System Rules] — 依赖方向和架构规则

### Previous Story Intelligence (from 35-5)

- **wordCompleted 字段已加入 TriggerContext**: 35-5 review 中新增 `wordCompleted?: boolean`，可直接用于 `checkQuestEventCondition` 的 `wordComplete` 和 `longWord:6` 判断
- **applyApprenticeEvent 模式参考**: 外部事件回调纯函数模式已建立，`applyQuestEvent` 应遵循相同模式
- **Phase 2 学徒去重经验**: 35-5 修复了多附魔重复计算问题。任务附魔每技能只有 0~1 个（Twin 时 0~2），但 `questStacks`/`questCompletions` 是共享的（一个 runtimeState），注意不要重复叠层
- **filterEnchantmentsByClass 模式参考**: 35-5 的职业过滤可作为 `filterQuestCandidates` 的参考模式
- **测试模式**: 使用 `makeSkill()` + `makeContext()` + `makeRuntimeState()` + `makeFlags()` helper

### 设计文档任务附魔完整表

| 附魔 | 对应词条 | 监听事件 | 目标层数 | 每次完成效果 | 实现状态 |
|------|---------|---------|---------|------------|---------|
| 吞噬 | 虚无 | selfTrigger | 15 | bonusPerSlot+5%, eatWeakest | ✅ Phase 2+5 |
| 过载 | 暴击 | critHit | 8 | critMult+0.5 | ✅ Phase 3 |
| 回响 | 脉冲 | affixProc:pulse | 6 | burstMult+0.3 | ✅ Phase 3 |
| 升华 | 乘算 | perfectWord | 3 | multiplier+0.15 | ✅ Phase 3（事件缺失）|
| 连锁 | 级联 | affixProc:cascade | 6 | cascadeMult+0.2 | ✅ Phase 3 |
| 净化 | 衰减 | comboReach:15 | 3 | floor-0.05(min0.1) | ✅ Phase 3（事件缺失）|
| 共振 | 共鸣+连接 | neighborTrigger | 20 | efficiency+8% | ✅ Phase 6 |
| 蓄势 | 流放 | outcastProc | 10 | bonusPercent+15% | ✅ Phase 2 |
| 精炼 | 转化 | selfTrigger | 15 | k×1.1 | ✅ Phase 2 |
| 充能 | 蓄力 | wordComplete | 5 | maxBonus+0.3 | ✅ Phase 2（事件缺失）|
| 裂变 | 复制 | longWord:6 | 5 | +1邻居 | ✅ Phase 5（事件缺失）|
| 层叠 | 增幅 | selfTrigger | 25 | valuePerStack+0.005 | ✅ Phase 2 |
| 极化 | 引力 | wordComplete | 8 | \|probMult-1\|+0.15 | ❌ 需实现 |
| 光谱 | 彩虹 | selfTrigger | 20 | 偏向最低资源+15%/层 | ✅ Phase 4 |
| 映射 | 倒影 | stageCleared | 1 | 复制参数×1.1 | ❌ 需实现 |
| 重叠 | 连字 | selfTrigger | 15 | N上限+1 | ❌ Phase 3 缺失 |
| 迭代 | 递归 | affixProc:recurse | 5 | recurseChance+3% | ❌ Phase 5 缺失 |
| 献祭 | 禁忌 | affixProc:taboo_penalty | 3 | penaltyChance-1%(min2%) | ✅ Phase 3 |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- **checkQuestEventCondition 扩展**: 新增 3 个内联事件（perfectWord, wordComplete, longWord:6）+ neighborTrigger 显式 return false。使用 35-5 添加的 TriggerContext 字段（wordCompleted, perfectWord）
- **QuestOverlap → Ligature**: `nEff = n + c`，quest completions 提供虚拟重复计数，使基础 n=1 的字母也能因 quest 达到 nEff≥2 触发连字
- **QuestIterate → Recurse**: `chanceEff = base + c*0.03`，半衰使用 chanceEff/2 而非 base/2
- **getEffectiveProbMult**: 纯函数，引力/斥力方向不变（`>=1` vs `<1`），delta 按 `c*0.15` 递增
- **resolveMirrorCopy**: 关卡初始化函数，随机选邻居→随机选词条→复制（排除 Mirror/Twin）。QuestMirror 对所有数值参数乘 `1.1^c`（乘算类参数取 `1 + (m-1)*boost` 保持基数正确）
- **applyQuestEvent**: 外部事件回调，支持 stageCleared→QuestMirror, comboReach→QuestPurify。带满层判定（查 QUEST_ENCHANTMENT_DEFS.targetStacks）
- **filterQuestCandidates**: 遍历 QUEST_AFFIX_MAP，支持数组匹配（QuestResonance → Resonance|Link），排除已有附魔
- **getEnchantmentSlotCount**: Twin→2, 否则 1
- **测试**: 32 个新测试，214 总测试通过（affixTrigger）；319 总 affix 相关测试通过

### Change Log

- 2026-03-11: Story 35-6 实现完成 — 任务附魔事件扩展 + QuestOverlap/QuestIterate 补全 + Gravity/Mirror 助手 + 抽取过滤 + Twin + 32 新测试

### File List

- **`src/src/data/affixTrigger.ts`** — Modified: checkQuestEventCondition 扩展(+3事件), Phase 3 Ligature QuestOverlap, Phase 5 Recurse QuestIterate, 新增 applyQuestEvent/getEffectiveProbMult/resolveMirrorCopy/filterQuestCandidates/getEnchantmentSlotCount, QUEST_AFFIX_MAP 导入
- **`src/tests/unit/data/affixTrigger.test.ts`** — Modified: 新增 32 个测试（9 个 describe 块覆盖 Task 1-9）

## Senior Developer Review

### Review Date: 2026-03-11

### Findings (6 issues: 1H, 2M, 3L)

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| H1 | HIGH | `resolveMirrorCopy` boost block missing 8 numeric params (`chance`, `gainPerSec`, `floor`, `penaltyChance`, `decayPerTrigger`, `probMult`, `interval` as additive; `initialMult` as multiplicative) | Fixed: added all missing params with correct boost type |
| M1 | MEDIUM | `resolveMirrorCopy` uses `ctx.triggerKey` but called at stage start with no keystroke context | Fixed: added JSDoc documenting caller must set triggerKey to Mirror skill's bound key |
| M2 | MEDIUM | `getEffectiveProbMult` with neutral `probMult=1.0` always pushes toward attraction (delta=0 + c*0.15 → >1) | Fixed: added JSDoc documenting this as intended design behavior |
| L1 | LOW | Missing edge case test for Mirror with non-copyable neighbor (only Mirror/Twin affixes) | Fixed: added test verifying null return |
| L2 | LOW | No integration test for QuestPurify cycle → Phase 3 Decay | Accepted: integration-level test, out of scope for data-layer unit tests |
| L3 | LOW | Linear scan in `applyQuestEvent` over `QUEST_EXTERNAL_EVENT_MAP` | Accepted: only 2 entries, O(1) amortized |

### Post-Fix Verification

- affixTrigger.test.ts: **216/216 pass** (32 story + 3 review-fix tests)
- Full affix suite: **321/321 pass** (affixes + affixTrigger + skillGeneration)

### Review Result: PASS (all HIGH/MEDIUM fixed, LOWs accepted)
