# Story 41.3: 附魔重设计（二）— 第一批低风险改造附魔

Status: done

## Story

As a 玩家,
I want 8 个低风险词条获得改造型附魔（全局任务 + 质变效果）,
so that 附魔从被动数值加成变为行为质变，增加构筑深度.

## 设计概要

### 核心变更

任务附魔从**叠层数值强化**改为**一次性行为质变**模式：

- **旧模式**：每次完成任务 → `questCompletions++` → 数值累加（如 critMult + c×0.5）
- **新模式**：完成任务 → `questTransformed = true` → 行为永久质变（如暴击 100%）
- 原任务附魔的**数值强化效果全部移除**（不迁移到升级系统——词条参数已通过生成时掷骰体现等级差异）

### 本 story 范围（8 个低风险词条）

| 词条 | 附魔 | 全局任务 | 质变效果 |
|------|------|---------|---------|
| **Crit** | QuestOverload | 暴击 8 次 | 必定暴击（跳过概率 roll） |
| **Pulse** | QuestEcho | 脉冲爆发 6 次 | 爆发时所有 Pulse 技能 triggerCount +1 |
| **Splash** | QuestFission | 长词≥6 出现 5 次 | 被溅射邻居也溅射一次（额外一跳） |
| **Amplify** | QuestStack | 触发 25 次 | 每关保留 50% 增幅层数 |
| **Decay** | QuestPurify | 连击≥15 出现 3 次 | 衰减方向逆转为递增（无上限） |
| **Recurse** | QuestIterate | 递归触发 5 次 | 递归概率不减半 |
| **Taboo** | QuestSacrifice | 惩罚触发 3 次 | 惩罚转化为随机资源（不再负产出） |
| **Ligature** | QuestOverlap | 触发 15 次 | 计数改为关卡累计按键次数 |

### 不在范围内

- 改造型附魔 41-4 批次（Cascade/Outcast/Convert/Void/Gravity/Rainbow/Resonance/Link/Twin/Conduit）
- Charge 长按蓄力（41-5）、Mirror 全词条复制（41-5）
- 数值平衡调整（改造后不再有 quest 数值累加，若需补偿则另开 story）

### 前提

- Story 41-2 已完成（Multiply 删除、学徒系精简、Quest 系统基础数据清理）

## Acceptance Criteria

1. **AC1: 运行时状态扩展** — `SkillRuntimeState` 新增 `questTransformed: boolean` 字段，默认 `false`；Quest 首次完成时置 `true`
2. **AC2: 数值效果移除** — 移除 Phase 2/3/5 中所有 `getQuestCompletions() * coefficient` 模式（8 个词条：Crit/Pulse/Decay/Splash/Amplify/Recurse/Taboo/Ligature）
3. **AC3: 8 个词条改造实现** — 每个词条在对应 Phase 中检查 `questTransformed` 状态，质变后执行不同逻辑
4. **AC4: 关卡累计按键跟踪** — 新增 `ligatureStageCounts` 状态，用于 Ligature 质变后的关卡累计计数
5. **AC5: 无回归** — 现有测试零新增回归

## Tasks / Subtasks

- [x] Task 1: 扩展运行时状态与任务完成逻辑 (AC: #1)
  - [x] 1.1 `SkillRuntimeState` 新增 `questTransformed: boolean`（affixes.ts）
  - [x] 1.2 `createSkillRuntimeState()` 初始化 `questTransformed: false`
  - [x] 1.3 `resolvePhase5()` 任务完成逻辑：首次完成时 `runtimeState.questTransformed = true`（仅首次，后续完成仍 `questCompletions++` 但不改变 transformed）
  - [x] 1.4 `deserializeAffixSkill()` 兼容旧存档：`questTransformed: data.runtime.questTransformed ?? (data.runtime.questCompletions > 0)`
  - [x] 1.5 更新 affixes.test.ts 中 `createSkillRuntimeState` 测试
  - [x] 1.6 更新 `resetRunState()`：`questTransformed` **重置为 false**（run 结束时清零）

- [x] Task 2: 移除 8 个词条的 Quest 数值累加 (AC: #2)
  - [x] 2.1 Phase 3 Crit：移除 `c * 0.5` → 直接使用 `affix.critMult`
  - [x] 2.2 Phase 3 Pulse：移除 `c * 0.3` → 直接使用 `affix.burstMult`
  - [x] 2.3 Phase 3 Decay：移除 `c * 0.05` → 直接使用 `affix.floor`
  - [x] 2.4 Phase 5 Splash：移除 `c` → targetCount 固定为 1
  - [x] 2.5 Phase 2 Taboo：移除 `cSacrifice * 0.30` → 保留基础 `1.0`
  - [x] 2.6 Phase 5 Recurse：移除 `cRec * 0.03` → 直接使用 `affix.recurseChance`
  - [x] 2.7 Phase 3 Ligature：移除 `cLig` → `nEff = n`（质变前）
  - [x] 2.8 Phase 2 Amplify：移除 `c * 0.005` → 直接使用 `affix.valuePerStack`
  - [x] 2.9 更新 affixTrigger.test.ts 中相关 quest 数值测试

- [x] Task 3: Crit 改造 — 必定暴击 (AC: #3)
  - [x] 3.1 Phase 3 `AffixType.Crit`：添加 `if (questTransformed) { isCrit = true; output *= critMult; skip roll }`
  - [x] 3.2 新增测试：questTransformed=true 时无论 roll 值均暴击

- [x] Task 4: Pulse 改造 — 跨技能脉冲同步 (AC: #3)
  - [x] 4.1 Phase 5 新增逻辑：当 `isPulse && questTransformed` 时，遍历 `ctx.allSkills` 找所有其他 Pulse 技能，对其 `runtimeState.triggerCount += 1`（通过 `ctx.skillStates`）
  - [x] 4.2 新增测试：质变后脉冲爆发时其他 Pulse 技能 triggerCount 递增

- [x] Task 5: Splash 改造 — 额外一跳溅射 (AC: #3)
  - [x] 5.1 Phase5Result 新增 `chainSplash: boolean` 字段
  - [x] 5.2 Phase 5 `AffixType.Splash`：`questTransformed` 时 `result.chainSplash = true`
  - [x] 5.3 affixTriggerOrchestrator.ts：splash 项默认 chainAffixesDisabled=true，chainSplash=true 时允许一跳
  - [x] 5.4 TriggerWorkItem 新增 `chainSplash?: boolean` 字段
  - [x] 5.5 更新测试：splash 项不再形成循环（chainAffixesDisabled）

- [x] Task 6: Amplify 改造 — 跨关保留层数 (AC: #3)
  - [x] 6.1 `resetStageState()`：检查 `questTransformed`，若为 true 则 `amplifyStacks = Math.floor(amplifyStacks * 0.5)` 而非 0
  - [x] 6.2 需要在 `resetStageState()` 中访问 `SkillRuntimeState.questTransformed`（已有）
  - [x] 6.3 新增测试：质变后关卡重置保留 50% 增幅层数（向下取整）

- [x] Task 7: Decay 改造 — 衰减逆转为递增 (AC: #3)
  - [x] 7.1 Phase 3 `AffixType.Decay`：`questTransformed` 时 `newDecay = currentDecayMult + decayPerTrigger`（无上限，不应用 floor）
  - [x] 7.2 resetStageState 中 Decay 重置行为不变（每关仍重置为 initialMult）
  - [x] 7.3 新增测试：质变后每次触发乘数递增

- [x] Task 8: Recurse 改造 — 概率不减半 (AC: #3)
  - [x] 8.1 Phase 5 `AffixType.Recurse`：`questTransformed` 时 `newChance = chanceEff`（不除以 2）
  - [x] 8.2 新增测试：质变后递归概率保持不变

- [x] Task 9: Taboo 改造 — 惩罚转化为随机资源 (AC: #3)
  - [x] 9.1 Phase3Result / TriggerFlags 新增 `tabooConvertResource: ResourceType | null`
  - [x] 9.2 Phase 3 `AffixType.Taboo`：`questTransformed` 时不 `output *= -1`，改为设置 `flags.tabooConvertResource = randomResource`（随机资源 ≠ skill.resource）
  - [x] 9.3 Phase 4：若 `tabooConvertResource != null`，目标资源改为该值
  - [x] 9.4 新增测试：质变后惩罚不产生负值，而是产出到随机资源

- [x] Task 10: Ligature 改造 — 关卡累计计数 (AC: #3, #4)
  - [x] 10.1 TriggerContext 新增 `ligatureStageCounts?: Map<string, number>`
  - [x] 10.2 skills.ts：维护 `ligatureStageCounts` Map，每次触发递增对应键位计数
  - [x] 10.3 battle.ts startLevel()：关卡开始时清空 `ligatureStageCounts`
  - [x] 10.4 Phase 3 `AffixType.Ligature`：`questTransformed` 时使用 `ctx.ligatureStageCounts.get(triggerKey) ?? 0` 替代 `countOccurrences(triggerKey, currentWord)`
  - [x] 10.5 新增测试：质变后使用关卡累计次数而非当前单词次数

- [x] Task 11: QUEST_ENCHANTMENT_DEFS 更新与 i18n (AC: #1)
  - [x] 11.1 更新 QUEST_ENCHANTMENT_DEFS 中 8 个词条的 `effectDesc` 为质变效果描述
  - [x] 11.2 QuestEnchantmentDef 可选新增 `transformDesc` 字段区分"任务进度描述"和"质变后描述"
  - [x] 11.3 更新 demo-i18n.ts 中相关 quest 附魔的中英文描述

- [x] Task 12: 回归测试 (AC: #5)
  - [x] 12.1 运行全量测试，确认零新增回归（基线 158 个预存失败，25 test files）
  - [x] 12.2 自动验证：无 quest 附魔时行为不变（现有测试覆盖）
  - [x] 12.3 自动验证：有 quest 附魔但未 transform 时行为不变（现有测试覆盖）

## Dev Notes

### 关键实现细节

**1. questTransformed 状态管理**
- `questTransformed` 是 run 内永久状态，不随关卡重置
- 首次 `questStacks >= targetStacks` 时设置为 true
- 后续完成仍然 `questCompletions++`（用于 UI 显示"完成 N 次"），但行为不再变化
- 旧存档兼容：`questTransformed ?? (questCompletions > 0)` — 已完成过的旧存档自动视为已质变

**2. Phase 执行顺序对改造的影响**
- Phase 2（加算）→ Phase 3（乘算）→ Phase 4（资源选择）→ Phase 5（后触发）
- Crit/Pulse/Decay/Ligature/Taboo 改造在 **Phase 3**
- Splash/Recurse 改造在 **Phase 5**
- Amplify 改造在 **resetStageState**
- Taboo 转化资源影响 **Phase 4**

**3. Splash 额外一跳的循环风险**
- 仅允许 1 次额外跳：被溅射技能的 Splash 可以触发，但该次触发的 chainSplash 固定为 false
- 利用现有 `chainHistory` 循环检测作为安全网
- 实现路径：`TriggerWorkItem.chainSplash?: boolean` → orchestrator 检查

**4. Pulse 跨技能通知的作用域**
- 仅增加 `triggerCount`，不直接触发其他技能
- 其他 Pulse 技能会在自己下次被触发时自然检查 `triggerCount % interval`
- 不需要 orchestrator 入队，直接在 Phase 5 修改 ctx.skillStates

**5. Ligature 关卡累计的状态位置**
- `ligatureStageCounts` 由 battle 系统维护（在 `state.battleState` 或 orchestrator 层面）
- 每次按键（不论是否匹配正确）都递增
- resetStageState 清空
- 通过 TriggerContext 传递给 Phase 3

**6. Taboo 惩罚转化的实现**
- 质变后惩罚 roll 仍然成立（penaltyChance 不变）
- 但不再 `output *= -1`，而是将产出重定向到随机资源
- Phase 3 设置 `tabooConvertResource`，Phase 4 检查并覆盖 targetResource
- 产出值保持正数，flags.isTabooPenalty 仍为 true（学徒·悟道可监听）

### 不涉及的 Quest 附魔（保持原样）

以下 quest 附魔在本 story 中**不修改**（41-4/41-5 范围）：
- QuestDevour（Void）— 41-4
- QuestChain（Cascade）— 41-4
- QuestResonance（Resonance/Link）— 41-4
- QuestCharge（Outcast）— 41-4
- QuestRefine（Convert）— 41-4
- QuestEnergize（Charge）— 41-5（已 @deprecated）
- QuestPolarize（Gravity）— 41-4
- QuestSpectrum（Rainbow）— 41-4
- QuestMirror（Mirror）— 41-5

**这些附魔暂时保留旧的数值累加模式**（`getQuestCompletions() * coefficient`），在各自 story 中改造。

### Project Structure Notes

- 源码根目录：`/Volumes/work/project/game/src/`（package.json 所在）
- 源文件：`src/src/`
- 测试文件：`src/tests/unit/`
- 测试命令：`cd /Volumes/work/project/game/src && npx vitest run`
- 测试基线：258 个预存失败（sound/tutorial/CLASS_RESTRICTED/restEvents 等）

### 41-2 关键经验

- 删除 enum 值后，旧存档兼容用 `(x as string) === 'oldValue'` 绕过 TS2367
- `state.player.bindings` 是 `Map<string, string>` 方向为 key→skillId
- `state.affixSkillStates`（非 `state.skillStates`）是运行时状态 Map
- affixes.test.ts 中有 enum 计数断言，修改 enum 后需同步更新
- 代码修改后务必运行 `npx vitest run` 检查新增失败

### References

- [Source: docs/stories/41-2-enchantment-redesign.md — 前置修复 + 数据清理]
- [Source: src/src/data/affixes.ts#SkillRuntimeState — 运行时状态定义]
- [Source: src/src/data/affixes.ts#QUEST_ENCHANTMENT_DEFS — 任务附魔定义]
- [Source: src/src/data/affixTrigger.ts#resolvePhase3 — 乘算层（Crit/Pulse/Decay/Ligature/Taboo）]
- [Source: src/src/data/affixTrigger.ts#resolvePhase5 — 后触发（Splash/Recurse/Amplify/Quest 叠层）]
- [Source: src/src/data/affixTrigger.ts#resetStageState — 关卡重置（Amplify 层数）]
- [Source: src/src/systems/affixTriggerOrchestrator.ts — 工作队列（Splash 链式触发）]
- [Source: src/src/data/affixTrigger.ts#checkQuestEventCondition — 任务事件判定]

## Dev Agent Record

### Agent Model Used
- Claude Opus 4.6

### Debug Log References
- 测试基线：25 failed files / 158 failed tests（全部预存）
- 回归测试结果：零新增失败

### Completion Notes List
- Task 1: SkillRuntimeState 新增 questTransformed，createSkillRuntimeState 初始化 false，deserialize 兼容旧存档
- Task 2-10: 移除 8 个词条的数值累加 + 添加 8 种质变行为
- Task 5: 改变 splash 链式行为——splash 项默认 chainAffixesDisabled=true，chainSplash 允许一跳
- Task 10: ligatureStageCounts 存储在 GameState，skills.ts 触发时递增，battle.ts startLevel() 清空
- Task 11: effectDesc + transformDesc + i18n 中英文均已更新
- Task 12: 全量回归零新增失败
- Code Review: H1(Taboo 职业资源过滤) + H2(4 质变测试) + H3(chainSplash 正向测试) + M1(Decay 描述) + M4(生命周期测试) + makeFlags/makeRuntimeState 补全 = 7 项修复, 13 新测试

### File List
- src/src/data/affixes.ts — SkillRuntimeState.questTransformed, QuestEnchantmentDef.transformDesc, effectDesc 更新
- src/src/data/affixTrigger.ts — Phase 2/3/5 质变逻辑, TriggerFlags.tabooConvertResource, Phase5Result.chainSplash, TriggerContext.ligatureStageCounts, Taboo 职业资源过滤(CR fix)
- src/src/systems/affixTriggerOrchestrator.ts — TriggerWorkItem.chainSplash, splash 项 chainAffixesDisabled, chainSplash 传播
- src/src/core/types.ts — GameState.ligatureStageCounts
- src/src/core/state.ts — createInitialState: ligatureStageCounts 初始化
- src/src/systems/skills.ts — 传递 ligatureStageCounts 到 ctx, 按键计数递增
- src/src/systems/battle.ts — startLevel: ligatureStageCounts.clear()
- src/src/demo/demo-i18n.ts — quest 附魔中英文描述更新（8 个）
- tests/unit/data/affixes.test.ts — questTransformed 初始化断言
- tests/unit/data/affixTrigger.test.ts — 更新 10 个 quest 相关测试 + 新增 11 个质变测试 + makeFlags 补全(CR fix)
- tests/unit/systems/affixTriggerOrchestrator.test.ts — 更新 2 个 splash 循环测试 + 新增 2 个 chainSplash 正向测试 + makeRuntimeState 补全(CR fix)
- docs/stories/41-3-quest-transform-batch1.md — story 文件
- docs/stories/sprint-status.yaml — 状态更新
