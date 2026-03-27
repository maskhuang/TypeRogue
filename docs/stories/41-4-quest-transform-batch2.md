# Story 41.4: 附魔重设计（三）— 第二批中风险改造附魔

Status: done

## Story

As a 玩家,
I want 剩余中风险词条获得改造型附魔,
so that 每个词条都有独特的质变路径，形成多样化构筑策略.

## 设计概要

### 核心变更

延续 Story 41-3 的**质变模型**：移除 `getQuestCompletions() * coefficient` 数值累加 → 改为 `questTransformed` 布尔行为质变。

本 story 覆盖 10 个中风险词条。其中 8 个已有 quest 附魔需改造，2 个（Twin/Conduit）需新建 quest 附魔。

### 10 个词条改造表

| 词条 | Quest 附魔 | 全局任务 | 旧效果（移除） | 质变效果（新增） | 风险点 |
|------|-----------|---------|---------------|----------------|--------|
| **Cascade** | QuestChain | 触发 6 次连锁 | `cascadeMult + c×0.2` | 双向连锁：反向键也触发级联 | 循环风险→chainDepth 限深 |
| **Outcast** | QuestCharge | 触发 10 次流放 | `bonusPercent + c×0.15` | 首尾呼应：额外触发对端技能 | 互触发循环→单次限制 |
| **Convert** | QuestRefine | 触发 15 次 | `k × 1.1^c` | 双向转化：source↔target 互换 | 资源路由规则 |
| **Void** | QuestDevour | 范围内被技能填满 | `bonusPerSlot + c×0.05` | 每关吞噬一次最弱邻居 | 解绑技能影响 bindings |
| **Gravity** | QuestPolarize | 完成 8 个包含/不包含绑定字母的词 | `probMult ± c×0.15` | 双向锁定：吸引→必含，排斥→必不含 | 词库过滤空集风险 |
| **Rainbow** | QuestSpectrum | 一个单词内产出 5 种资源 3 次 | 最低资源偏向 `+15%/c` | 同时产出所有资源（按比例分摊） | 多资源同时写入 |
| **Resonance** | QuestResonance (共享) | 被邻居触发 20 次 | `+10%/c` 产出 | 共鸣增强：Phase 2 额外加成而非仅触发 | orchestrator 伪无限模式 |
| **Link** | QuestResonance (共享) | 被邻居触发 20 次 | `+10%/c` 产出 | 同上（与 Resonance 共享质变） | 同上 |
| **Twin** | **新建 QuestTwin** | 通关 3 次 | 无 | 词条复制：等效双倍（排除 Twin 自身） | 复制后词条数超限 |
| **Conduit** | **新建 QuestConduit** | 累计导能 N 次 | 无 | 额外触发 +1→+2 | — |

### 前提

- Story 41-3 已完成（questTransformed 框架 + 8 个低风险词条改造）

### 不在范围内

- Charge 长按蓄力（41-5，已 @deprecated）
- Mirror 全词条复制（41-5）
- 数值平衡调整

## Acceptance Criteria

1. **AC1: 数值效果移除** — 移除 8 个已有 quest 附魔的 `getQuestCompletions() * coefficient` 模式
2. **AC2: 10 个词条质变实现** — 每个词条在对应 Phase 中检查 `questTransformed`，质变后执行不同逻辑
3. **AC3: Twin/Conduit 新建 quest 附魔** — 新增 `QuestTwin`、`QuestConduit` 到 EnchantmentType enum、QUEST_ENCHANTMENT_DEFS、ENCHANTMENT_META、i18n
4. **AC4: 循环防护** — Cascade 反向触发、Outcast 对端触发有 chainDepth 限制或单次标记；Resonance/Link 重入走 pseudo-infinite 模式
5. **AC5: 无回归** — 现有测试零新增回归

## Tasks / Subtasks

### 数值移除 + 基础设施

- [x] Task 1: 新建 Twin/Conduit quest 附魔 (AC: #3) ✅
  - [x] 1.1 `EnchantmentType` enum 新增 `QuestTwin = 'quest_twin'`、`QuestConduit = 'quest_conduit'`
  - [x] 1.2 `QUEST_AFFIX_MAP` 添加映射
  - [x] 1.3 `QUEST_ENCHANTMENT_DEFS` 新增两条
  - [x] 1.4 `demo-i18n.ts` 新增 quest_twin / quest_conduit 中英文条目
  - [x] 1.5 更新 `affixes.test.ts` 枚举计数断言（EnchantmentType 46→48, Quest 17→19, DEFS 17→19）
  - [x] 1.6 `categorizeEnchantmentCandidates` 自动包含（通过 QUEST_AFFIX_MAP）

- [x] Task 2: 移除 8 个词条的 Quest 数值累加 (AC: #1) ✅
  - [x] 2.1 Phase 3 Cascade: 移除 `c * 0.2` → 直接使用 `affix.cascadeMult`
  - [x] 2.2 Phase 2 Outcast: 移除 `c * 0.15` → 直接使用 `affix.bonusPercent`
  - [x] 2.3 Phase 2 Convert: 移除 `Math.pow(1.1, c)` → 直接使用 `affix.k`
  - [x] 2.4 Phase 2 Void: 移除 `c * 0.05` → 直接使用 `affix.bonusPerSlot`
  - [x] 2.5 `getEffectiveProbMult` Gravity: 移除 `c * 0.15` → 直接使用 `affix.probMult`
  - [x] 2.6 Phase 4 Rainbow: 移除 `spectrumCompletions` 参数 → `weightedRandomResource` 简化为等概率
  - [x] 2.7 Resonance/Link: 确认无 `+10%/c` 加成（不存在）
  - [x] 2.8 更新 affixTrigger.test.ts 中对应 quest 数值测试 + 修复2个预存bug

### 低风险词条质变（无循环风险）

- [x] Task 3: Convert 改造 — 双向转化 (AC: #2) ✅
  - [x] 3.1 Phase 2: questTransformed 时产生 convertReverseOutputs（反向产出到 source 资源）
  - [x] 3.2 Phase2Result + TriggerResult 新增 convertReverseOutputs 字段
  - [x] 3.3 测试：质变后双向转化 + 非质变时无反向输出

- [x] Task 4: Void 改造 — 吞噬最弱邻居 (AC: #2) ✅
  - [x] 4.1 Phase 5: questTransformed 时每次触发都产出 devourTarget（系统层限制执行次数）
  - [x] 4.3 测试：质变后 + 非质变时行为

- [x] Task 5: Gravity 改造 — 双向锁定 (AC: #2) ✅
  - [x] 5.1 getEffectiveProbMult: questTransformed → 吸引Infinity / 排斥0 / 中性1
  - [x] 5.2 pickWord: Infinity权重过滤 + 空集fallback到均匀随机
  - [x] 5.3 测试：4个质变场景

- [x] Task 6: Rainbow 改造 — 同时产出所有资源 (AC: #2) ✅
  - [x] 6.1 Phase4Result.allResources 标记
  - [x] 6.2 orchestrator: allResources时等比分摊到所有可用资源
  - [x] 6.3 测试：3个场景

- [x] Task 7: Conduit 改造 — 导能 +2 (AC: #2) ✅
  - [x] 7.1 Phase 6: 邻居questTransformed时推2个conduit action
  - [x] 7.2 测试：+2 vs +1

- [x] Task 8: Twin 改造 — 词条复制 (AC: #2) ✅
  - [x] 8.1 triggerAffixSkill: Phase3后Twin质变×2
  - [x] 8.2 测试：质变 vs 非质变

### 高风险词条质变（有循环风险）

- [x] Task 9: Cascade 改造 — 双向连锁 (AC: #2, #4) ✅
  - [x] 9.1 Phase 3: questTransformed时双向 hasRelation 检查
  - [x] 9.2 chainDepth限制由现有MAX_CHAIN_DEPTH保证
  - [x] 9.3 测试：3个场景

- [x] Task 10: Outcast 改造 — 首尾呼应 (AC: #2, #4) ✅
  - [x] 10.1 Phase 5: outcastEchoTarget 字段
  - [x] 10.2 TriggerWorkType += 'outcast_echo'
  - [x] 10.3 chainAffixesDisabled=true 防循环
  - [x] 10.4 测试：4个场景（含循环安全）

- [x] Task 11: Resonance/Link 改造 — 共鸣/链接增强 (AC: #2, #4) ✅
  - [x] 11.1 Phase6Action.transformedBoost → orchestrator output×(1+boost)
  - [x] 11.2 QuestResonance 共享，统一质变行为
  - [x] 11.3 pseudo-infinite 机制不受影响（质变不改变循环检测）
  - [x] 11.4 测试：2个场景

### 收尾

- [x] Task 12: QUEST_ENCHANTMENT_DEFS effectDesc/transformDesc 更新 + i18n (AC: #2) ✅
  - [x] 12.1 更新 7 个 quest 附魔的 effectDesc 为 `'质变：...'` 格式 + transformDesc
  - [x] 12.2 更新 demo-i18n.ts 中英文描述（QuestEnergize/QuestMirror 属 41-5 范围，不修改）

- [x] Task 13: 回归测试 (AC: #5) ✅
  - [x] 13.1 运行全量测试，确认零新增回归（基线 157 failed / 26 files，3794 passed）
  - [x] 13.2 验证：无 quest 附魔时行为不变（30 个新测试中含非质变场景）
  - [x] 13.3 验证：有 quest 附魔但未 transform 时行为不变（每个质变测试均有对照）

## Dev Notes

### 关键实现细节

**1. 已有 questTransformed 框架（41-3 提供）**
- `SkillRuntimeState.questTransformed: boolean`（首次完成时 true）
- `resetRunState()` 重置为 false
- `deserializeAffixSkill()` 兼容旧存档
- 各 Phase 通过 `runtimeState.questTransformed` 判断质变状态

**2. Twin/Conduit 无 quest 附魔——需新建**
- 当前 QUEST_ENCHANTMENT_DEFS 无 Twin/Conduit 条目
- Twin 的质变任务：`event: 'stageCleared'`（通关时通过 QUEST_EXTERNAL_EVENT_MAP 叠层），`targetStacks: 3`
- Conduit 的质变任务：`event: 'selfTrigger'`，`targetStacks: 15`（实际是邻居触发的回调）
- 需同步更新 `QUEST_AFFIX_MAP`、`ENCHANTMENT_META`、枚举测试

**3. QuestResonance 共享问题**
- `QuestResonance.targetAffix = [AffixType.Resonance, AffixType.Link]`
- 两者共用同一个 quest 附魔和 `neighborTrigger` 事件
- 质变行为统一：共鸣/链接触发时额外 Phase 2 加成
- 不需要拆分 quest 附魔（共享合理）

**4. Cascade 双向连锁的简化实现**
- 当前检查：`hasRelation(ctx.prevKey, ctx.triggerKey, posRel)`
- 质变后：`hasRelation(prevKey, triggerKey, posRel) || hasRelation(triggerKey, prevKey, posRel)`
- 对 Adjacent 等对称关系无额外效果（已双向），但对 SameRow 等非对称关系有意义
- **注意**：大部分 PositionRelation 天然双向对称（Adjacent/SameRow/SameColumn/SameHand），仅 Symmetric 有方向性。需确认哪些关系需要双向扩展。

**5. Outcast 首尾呼应的循环防护**
- 场景：A 在词首、B 在词尾。A 触发→呼应 B→B 触发→呼应 A→无限循环
- 解法：`outcast_echo` 类型标记 `chainAffixesDisabled: true`（与 splash 一致），或在 TriggerWorkItem 中增加标记
- 确保被呼应的技能不会再次呼应（一次限制）

**6. Void 吞噬的实现路径**
- 当前 Phase 5 在任务完成时调用 `findWeakestNeighbor` → `result.devourTarget`
- 质变后改为：每关首次触发时执行吞噬（非任务完成时）
- 需要状态追踪："本关是否已吞噬"→可复用 `triggerCount` 或新增 flag
- `devourTarget` callback 需实际执行解绑：`ctx.bindings.delete(key)`, `ctx.allSkills.delete(skillId)`, `ctx.skillStates.delete(skillId)`

**7. Gravity 双向锁定的空集防护**
- 质变后排斥字母的 probMult=0 意味着包含该字母的词被完全排除
- 若所有词都被排除→空集→fallback：忽略所有排斥约束，选任意词
- 实现：在 `pickWord` 中检测加权总和 ≤ 0 时回退到均匀随机

**8. Rainbow 同时产出所有资源**
- 需要改变 Phase 4 返回值或增加新字段
- 方案 A：`Phase4Result.allResources: boolean`，上游逐资源写入 `output / resourceCount`
- 方案 B：`Phase4Result.multiTarget: ResourceType[]`，上游逐目标写入
- skills.ts 中 `triggerSkill` 需要处理多资源写入逻辑

**9. Resonance/Link 质变增强 vs 伪无限**
- 质变效果：被共鸣/链接触发时产出增强（Phase 2 加成或乘数）
- 伪无限检测已有：`chainHistory.includes(triggerKey)` → `enteredPseudoInfinite`
- 质变不改变循环检测逻辑，仅改变被触发时的产出计算

### 现有代码关键引用

| 文件 | 行号(约) | 内容 | 改动 |
|------|---------|------|------|
| `data/affixes.ts` | L105-122 | EnchantmentType enum (Quest 系列) | 新增 QuestTwin, QuestConduit |
| `data/affixes.ts` | L539-557 | QUEST_ENCHANTMENT_DEFS | 新增 2 条 + 更新 8 条 effectDesc |
| `data/affixTrigger.ts` | L311-325 | Phase 2: Convert, Void | 移除 `c * coeff` + 添加质变逻辑 |
| `data/affixTrigger.ts` | L338-344 | Phase 2: Outcast | 移除 `c * 0.15` + 首尾呼应入队 |
| `data/affixTrigger.ts` | L472-481 | Phase 3: Cascade | 移除 `c * 0.2` + 双向连锁判定 |
| `data/affixTrigger.ts` | L654-684 | weightedRandomResource | 移除 spectrumCompletions 参数 |
| `data/affixTrigger.ts` | L758-773 | Phase 4: resolvePhase4 (Rainbow) | 质变后返回 allResources |
| `data/affixTrigger.ts` | L899-923 | Phase 5: quest completion | Void 吞噬逻辑修改 |
| `data/affixTrigger.ts` | L987-1035 | Phase 6: Link, Conduit, Resonance | 质变增强 + Conduit +2 |
| `data/affixTrigger.ts` | L1208-1220 | getEffectiveProbMult (Gravity) | 移除 `c * 0.15` + 双向锁定 |
| `data/affixTrigger.ts` | L1395-1397 | getEnchantmentSlotCount (Twin) | Twin 质变逻辑入口 |
| `systems/affixTriggerOrchestrator.ts` | L22-28 | TriggerWorkType | 可能新增 outcast_echo |
| `systems/affixTriggerOrchestrator.ts` | L201-204 | devourTarget callback | 实际解绑逻辑 |
| `systems/battle.ts` | L205-216 | pickWord / collectGravityWeights | Gravity 极端权重处理 |
| `systems/skills.ts` | triggerSkill | 资源写入 | Rainbow 多资源写入 |

### Project Structure Notes

- 源码根目录：`/Volumes/work/project/game/src/`（package.json 所在）
- 源文件：`src/src/`
- 测试文件：`src/tests/unit/`
- 测试命令：`cd /Volumes/work/project/game/src && npx vitest run`
- 测试基线：157 个预存失败（25 test files），3770 passed

### 41-3 关键经验

- `questTransformed` 是 run 内永久状态，不随关卡重置；`resetRunState()` 重置为 false
- Phase 执行顺序：Phase 2（加算）→ Phase 3（乘算）→ Phase 4（资源选择）→ Phase 5（后触发）→ Phase 6（邻居通知）
- splash 链式行为用 `chainAffixesDisabled: true` 控制——可复用于 outcast_echo
- `chainSplash` 传播模式：首跳 true → 后续 false（仅一跳）——可参考实现 outcast 单次呼应
- `makeFlags()` 和 `makeRuntimeState()` 测试辅助函数需同步更新新字段
- Code review 发现 Taboo 资源过滤需按 playerClass 限制——同理 Rainbow 多资源产出需考虑 playerClass 可用资源
- 测试中 `rollAffixParams` 非确定性——手动设置关键属性（posRel, resource 等）
- `state.player.bindings` 是 `Map<string, string>` 方向为 key→skillId
- `state.affixSkillStates`（非 `state.skillStates`）是运行时状态 Map
- 旧存档兼容：`questTransformed ?? (questCompletions > 0)`

### References

- [Source: docs/stories/41-3-quest-transform-batch1.md — 前批改造 + questTransformed 框架]
- [Source: docs/stories/41-2-enchantment-redesign.md — 前置修复 + 数据清理]
- [Source: src/src/data/affixes.ts#QUEST_ENCHANTMENT_DEFS — 任务附魔定义 (L539-557)]
- [Source: src/src/data/affixes.ts#EnchantmentType — 枚举定义 (L105-122)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase2 — 加算层 (Convert/Void/Outcast)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase3 — 乘算层 (Cascade)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase4 — 资源选择 (Rainbow)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase5 — 后触发 (Quest/Devour/Outcast echo)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase6 — 邻居通知 (Resonance/Link/Conduit)]
- [Source: src/src/data/affixTrigger.ts#getEffectiveProbMult — Gravity 概率偏移 (L1208-1220)]
- [Source: src/src/data/affixTrigger.ts#weightedRandomResource — Rainbow 加权选资源 (L654-684)]
- [Source: src/src/data/affixTrigger.ts#getEnchantmentSlotCount — Twin 双槽 (L1395-1397)]
- [Source: src/src/systems/affixTriggerOrchestrator.ts — 调度器 + TriggerWorkType]
- [Source: src/src/systems/battle.ts#pickWord — Gravity 词选 (L205-216)]
- [Source: src/src/systems/skills.ts#triggerSkill — 资源写入 (Rainbow 改动入口)]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Convert reverse output: `getAffixSourceValue('score')` returns `score + base*multiplier` (70), not just score (50)
- Cascade test: 'a' and 'k' both row 1 → use 'q' (row 0) and 'a' (row 1) for SameRow=false
- Pre-existing bug: `weightedRandomResource` pool size 5 not 7, fixed test expectations
- Pre-existing bug: QUEST_ENCHANTMENT_DEFS count 17→19 after QuestTwin/QuestConduit added
- Hidden quest stacking: QuestDevour `c * 0.10` in enchantment bonus loop (L378-384)

### Completion Notes List
- 30 new transformation tests all passing
- Zero new test regressions (baseline 157 failed / 26 files, 3794 passed)
- All 10 affix transformations implemented with cycle protection
- 7 effectDesc/transformDesc updated to 质变 format; QuestEnergize/QuestMirror deferred to 41-5
- i18n updated for both ZH and EN

### File List
- `src/src/data/affixes.ts` — QuestTwin/QuestConduit enums + QUEST_ENCHANTMENT_DEFS effectDesc/transformDesc
- `src/src/data/affixTrigger.ts` — Phase 2-6 transformation logic (Convert/Void/Outcast/Cascade/Gravity/Rainbow/Twin/Conduit/Resonance/Link)
- `src/src/systems/affixTriggerOrchestrator.ts` — outcast_echo + transformedBoost + allResources + convertReverseOutputs + devourConsumed限一次
- `src/src/systems/battle.ts` — pickWord Infinity weight handling for Gravity + NaN约束冲突处理
- `src/src/systems/shop.ts` — [code-review] 移除 QuestDevour/QuestSacrifice 旧 stacking 预估 + 死代码清理
- `src/src/demo/demo-i18n.ts` — ZH/EN quest enchantment descriptions (19 entries)
- `tests/unit/data/affixTrigger.test.ts` — 30 new transformation tests + 8 updated stacking tests
- `tests/unit/data/affixes.test.ts` — enum count updates (46→48, 17→19)
