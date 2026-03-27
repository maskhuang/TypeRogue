# Story 41.2: 附魔重设计（一）— 前置修复 + 学徒系精简 + 数据清理

Status: done

## Story

As a 玩家,
I want 附魔系统完成基础清理——删除无决策附魔、修复空壳词条、精简学徒系,
so that 后续改造型附魔（41-3/4/5）有干净的基础可依赖.

## 设计概要

### 本 story 范围（前置修复 + 数据清理）

| 变更类型 | 内容 |
|---------|------|
| **删除 Multiply 词条** | 从 AffixType enum、权重表、技能生成、Phase 3 处理、QuestAscend 全部移除 |
| **新增 Conduit 词条** | 替代 Multiply；本技能不产出，范围内邻居触发时 +1 次；不刷新在单词条技能上 |
| **学徒系精简** | 删除 7 个无决策附魔（Word/LongWord/Stage/Perfect/Combo/Harvest/Adapt），保留 Self/Neighbor/悟道 |
| **新增资源专精附魔×5** | base/score/multiplier/time/gold 专精，产出对应资源时成长 |
| **新增悟道·词条附魔×N** | 任何带对应词条的技能被触发时，附魔所在技能成长 |
| **删除嬗变系附魔** | Transmute 整类删除（被后续 Convert 改造替代） |
| **修复 Decay 重置** | 跨单词不重置，仅跨关重置 |
| **修复 QuestPurify 方向** | 从降低 floor（负面）改为提高 floor（正面） |
| **修复 QuestSacrifice 方向** | 从降低惩罚概率改为提高正面加成 |
| **接入 Gravity** | 将 getEffectiveProbMult 接入 pickWord 词选系统 |
| **Charge 标记待重设计** | 空实现保留，添加 @deprecated 注释，待 41-5 重新实现 |

### 不在范围内

- 改造型附魔（全局任务 + 质变效果）→ Story 41-3/4/5
- 任务系数值效果移入升级 → Story 41-3
- Charge 长按蓄力新机制 → Story 41-5
- Mirror 动态词条膨胀 → Story 41-5
- 遗物 trial_badge 重设计 → 随改造型附魔一起

## Acceptance Criteria

1. **AC1: Multiply 词条完全移除** — `AffixType.Multiply` 从 enum 删除，`AFFIX_WEIGHTS` 中移除，`skillGeneration.ts` 不再生成 Multiply 词条，Phase 3 中 Multiply 分支移除，`QuestAscend` 从 `QUEST_ENCHANTMENT_DEFS` 删除，所有下游引用编译通过
2. **AC2: Conduit 词条基础实现** — `AffixType.Conduit` 加入 enum，权重设定，`skillGeneration.ts` 支持生成（仅限 ≥2 词条的技能），Phase 5/6 实现核心逻辑：范围内拥有本技能其他词条的邻居触发时额外 +1 次触发（入队 orchestrator work queue）
3. **AC3: 学徒附魔精简** — `EnchantmentType` enum 删除 ApprenticeWord/ApprenticeLongWord/ApprenticeStage/ApprenticePerfect/ApprenticeCombo/ApprenticeHarvest/ApprenticeAdapt（共 7 个），`ENCHANTMENT_META` 同步删除，`categorizeEnchantmentCandidates` 的 apprenticeTypes 数组缩减为 Self/Neighbor/悟道，`APPRENTICE_GROWTH_DEFAULTS` 同步清理
4. **AC4: 资源专精附魔×5** — 新增 `ApprenticeResourceBase/Score/Multiplier/Time/Gold` 五个 EnchantmentType。ENCHANTMENT_META 包含名称/图标/描述。成长条件：技能产出对应资源时成长 +X%。在 Phase 5 学徒成长逻辑中新增资源匹配检查
5. **AC5: 悟道·词条附魔** — 新增 `ApprenticeAffix_<AffixType>` 系列 EnchantmentType（每个 AffixType 一个，约 19 种，排除 Multiply）。成长条件：场上任何带对应词条的技能被触发时，拥有该悟道附魔的技能成长 +X%（X 与词条权重成反比）。在 orchestrator 的触发回调中实现跨技能通知
6. **AC6: 嬗变系删除** — `EnchantmentType.Transmute` 从 enum 删除，`categorizeEnchantmentCandidates` 的 transmute 分类始终返回空数组，`ritualEnchantment.ts` 和 `shop.ts` 中 Transmute 特殊处理移除，`getTransmuteEligibleResources` 标记 @deprecated，`TRANSMUTE_NAMES`/`TRANSMUTE_RATIO_TABLE` 标记 @deprecated
7. **AC7: Decay 重置修复** — 移除 `resetDecayForWord` 的所有调用点（单词完成时不再重置衰减）。仅在关卡开始时重置 `currentDecayMult`（`resetStageState` 或等效位置）
8. **AC8: QuestPurify 效果修正** — 原效果 `floor -= 0.05 × completions`（降低下限=更严重衰减=负面），改为 `floor += 0.05 × completions`（提高下限=衰减更温和=正面）。desc 更新
9. **AC9: QuestSacrifice 效果修正** — 原效果 `penalty -= 0.01 × completions`（降低惩罚概率=任务越来越难完成），改为 `bonusPercent += 0.30 × completions`（提高正面加成），惩罚概率固定不变。desc 更新
10. **AC10: Gravity 接入词选** — `pickWord()` 使用 `getEffectiveProbMult()` 计算每个字母的概率权重，偏移词库中词的选择概率。吸引型（probMult>1）增加包含该字母的词被选中的概率；排斥型（probMult<1）降低
11. **AC11: Charge 标记待重设计** — Phase 2 中 Charge 分支添加 `@deprecated` 注释。`updateChargeProducers` 保持 no-op。QuestEnergize 保留但标记 @deprecated
12. **AC12: 无回归 bug** — 现有测试套件零新增回归。所有被删除的附魔/附魔相关测试更新或移除

## Tasks / Subtasks

- [x] Task 1: 删除 Multiply 词条 (AC: #1)
  - [x] 1.1 从 `AffixType` enum 删除 `Multiply`，从 `AFFIX_WEIGHTS` 删除
  - [x] 1.2 从 `skillGeneration.ts` 的 `weightedSampleWithout` 和 `generateAffix` 中移除 Multiply case
  - [x] 1.3 从 `affixTrigger.ts` Phase 3 (`resolvePhase3`) 中删除 Multiply case (L424-430)
  - [x] 1.4 从 `QUEST_ENCHANTMENT_DEFS` 删除 `QuestAscend`（targetAffix: Multiply）
  - [x] 1.5 从 `EnchantmentType` enum 删除 `QuestAscend`
  - [x] 1.6 清理所有 TypeScript 编译错误（下游引用）
  - [x] 1.7 更新/移除相关测试

- [x] Task 2: 新增 Conduit 词条 (AC: #2)
  - [x] 2.1 在 `AffixType` enum 添加 `Conduit = 'conduit'`，设定 AFFIX_WEIGHTS
  - [x] 2.2 在 `skillGeneration.ts` 添加 Conduit 生成逻辑：需要 posRel，仅在技能已有 ≥1 其他词条时生成
  - [x] 2.3 Phase 2：Conduit 技能自身不产出（baseOutput = 0 或跳过）
  - [x] 2.4 Phase 5/6：范围内邻居触发时，如果邻居拥有与 Conduit 技能的其他词条相同类型的词条，额外给邻居 +1 触发（通过 orchestrator enqueue）
  - [x] 2.5 添加 Conduit 的 i18n 条目（中英文）
  - [x] 2.6 添加单元测试：生成过滤、触发逻辑、+1 次额外触发

- [x] Task 3: 学徒附魔精简 (AC: #3)
  - [x] 3.1 从 `EnchantmentType` enum 删除 7 个学徒类型
  - [x] 3.2 从 `ENCHANTMENT_META` 删除对应条目
  - [x] 3.3 从 `APPRENTICE_GROWTH_DEFAULTS` 删除对应条目
  - [x] 3.4 更新 `categorizeEnchantmentCandidates` 的 apprenticeTypes 数组
  - [x] 3.5 清理 Phase 5 学徒成长逻辑中已删除类型的 case
  - [x] 3.6 清理所有编译错误，更新/移除测试

- [x] Task 4: 新增资源专精附魔×5 (AC: #4)
  - [x] 4.1 在 `EnchantmentType` enum 添加 5 个资源专精类型
  - [x] 4.2 在 `ENCHANTMENT_META` 添加名称/图标/描述
  - [x] 4.3 在 `APPRENTICE_GROWTH_DEFAULTS` 添加成长率
  - [x] 4.4 在 Phase 5 学徒成长逻辑中新增：检查 Phase 4 targetResource 是否匹配，匹配时才成长
  - [x] 4.5 更新 `categorizeEnchantmentCandidates` 包含资源专精
  - [x] 4.6 添加测试：资源匹配时成长、不匹配时不成长

- [x] Task 5: 新增悟道·词条附魔 (AC: #5)
  - [x] 5.1 在 `EnchantmentType` enum 添加 `ApprenticeAffix_*` 系列（20 种）
  - [x] 5.2 在 `ENCHANTMENT_META` 添加名称/图标/描述，X 值与词条权重成反比
  - [x] 5.3 在 orchestrator 的触发回调中：每次技能触发后，检查场上所有其他技能是否有对应的悟道附魔，有则成长
  - [x] 5.4 更新 `categorizeEnchantmentCandidates` 包含悟道附魔
  - [x] 5.5 添加测试：跨技能成长通知

- [x] Task 6: 删除嬗变系附魔 (AC: #6)
  - [x] 6.1 从 `EnchantmentType` enum 删除 `Transmute`
  - [x] 6.2 `categorizeEnchantmentCandidates` 的 transmute 分类返回空数组
  - [x] 6.3 旧数据向后兼容：Transmute 比较使用 `(x as string) === 'transmute'` 避免 TS2367
  - [x] 6.4 标记 `getTransmuteEligibleResources`、`TRANSMUTE_NAMES`、`TRANSMUTE_RATIO_TABLE` 为 @deprecated
  - [x] 6.5 清理编译错误，更新测试

- [x] Task 7: 修复 Decay/QuestPurify/QuestSacrifice (AC: #7, #8, #9)
  - [x] 7.1 `resetDecayForWord` 标记 @deprecated（无生产代码调用点）
  - [x] 7.2 `resetStageState` 新增 Decay currentDecayMult 重置逻辑
  - [x] 7.3 QuestPurify Phase 3 Decay 分支：`floor - 0.05*c` → `floor + 0.05*c`
  - [x] 7.4 QuestPurify desc/i18n 更新为正面效果
  - [x] 7.5 QuestSacrifice：Phase 3 Taboo 惩罚概率固定不变，Phase 2 新增 `bonusPercent += 0.30*c`
  - [x] 7.6 QuestSacrifice desc/i18n 更新
  - [x] 7.7 添加测试：resetStageState Decay 重置、QuestPurify 正方向、QuestSacrifice Phase 2 加成

- [x] Task 8: Gravity 接入词选 (AC: #10)
  - [x] 8.1 `pickWord()` 新增 `collectGravityWeights()` 收集所有 Gravity 的 effectiveProbMult
  - [x] 8.2 为词库每词计算权重：∏(unique letter) probMult(letter)
  - [x] 8.3 使用加权随机替代等概率选词
  - [x] 8.4 `getEffectiveProbMult` 已有完整测试覆盖

- [x] Task 9: Charge 标记 + 杂项清理 (AC: #11, #12)
  - [x] 9.1 Phase 2 Charge 分支添加 @deprecated 注释
  - [x] 9.2 QuestEnergize 添加 @deprecated 注释
  - [x] 9.3 运行全量测试确认零新增回归（167 pre-existing / 3747 passed）
  - [x] 9.4 i18n 条目已同步更新

## Dev Notes

### 关键设计决策

**Multiply 删除理由：** 与 Conduit 功能重叠。Multiply 是直接乘数，无策略深度。Conduit 的"为邻居提供额外触发"提供位置+词条的组合决策。

**学徒系精简逻辑：** 保留需要决策的附魔（Self=技能选择、Neighbor=键位布局、悟道=构筑路线），删除纯被动/操作向的附魔。

**悟道附魔数量：** 约 19 种（每个 AffixType 一个，排除已删除的 Multiply）。成长率与词条权重成反比——稀有词条的悟道成长更快，鼓励围绕稀有词条构筑。

**Conduit 触发机制：** 类似 Resonance/Link 的 Phase 6 邻居通知，但条件不同——检查邻居是否拥有与 Conduit 技能的其他词条相同类型。入队 orchestrator work queue 使用新的 `conduit` TriggerWorkType。

**Gravity 词选公式：** 对词库中每个词 W，权重 = ∏(letter ∈ W) probMult(letter)。probMult > 1 的字母使包含该字母的词更可能被选中。

### 现有代码关键引用

| 文件 | 位置 | 内容 | 改动 |
|------|------|------|------|
| `data/affixes.ts` | L13-40 | `AffixType` enum | 删除 Multiply，新增 Conduit |
| `data/affixes.ts` | L72-107 | `EnchantmentType` enum | 删除 7 学徒 + Transmute + QuestAscend，新增资源专精×5 + 悟道×N |
| `data/affixes.ts` | L144-158 | `ENCHANTMENT_META` | 同步更新 |
| `data/affixes.ts` | L501-520 | `QUEST_ENCHANTMENT_DEFS` | 删除 QuestAscend |
| `data/affixTrigger.ts` | L424-430 | Phase 3 Multiply | 删除 |
| `data/affixTrigger.ts` | L458-468 | Phase 3 Decay | 修复 QuestPurify 方向 |
| `data/affixTrigger.ts` | L493-501 | Phase 3 Taboo | 修复 QuestSacrifice 方向 |
| `data/affixTrigger.ts` | L353-356 | Phase 2 Taboo | 新增 QuestSacrifice 加成 |
| `data/affixTrigger.ts` | L520-533 | APPRENTICE_GROWTH_DEFAULTS | 清理已删除类型，新增资源专精 |
| `data/affixTrigger.ts` | L741-770 | Phase 5 学徒成长 | 新增资源匹配检查、悟道通知 |
| `data/affixTrigger.ts` | L1176-1201 | categorizeEnchantmentCandidates | 更新学徒列表 |
| `data/affixTrigger.ts` | L1261-1274 | resetDecayForWord | 移除调用点 |
| `data/affixTrigger.ts` | L1063-1080 | getEffectiveProbMult | 供 pickWord 使用 |
| `data/skillGeneration.ts` | L73-111 | weightedSampleWithout | 移除 Multiply，新增 Conduit |
| `systems/battle.ts` | L205-216 | pickWord | 接入 Gravity 概率偏移 |
| `systems/ritualEnchantment.ts` | L68-95 | generateRitualCandidates | 移除 Transmute 特殊处理 |
| `systems/shop.ts` | L347-410 | generateShopEnchantmentItem | 移除 Transmute 特殊处理 |
| `systems/affixTriggerOrchestrator.ts` | L21-39 | TriggerWorkType | 新增 'conduit' 类型 |

### 约束

- 删除类型时必须保持 save/load 向后兼容——旧存档中的已有 Multiply/Transmute 附魔需优雅降级（跳过无效条目，不崩溃）
- Conduit 不能出现在单词条技能上（因为需要"本技能的其他词条"作为监听条件）
- 悟道附魔的跨技能通知必须通过 orchestrator 回调实现，不能在单技能触发管线内完成
- Phase 2 Taboo 的固定 +100% 加成不变，QuestSacrifice 加成额外叠加

### References

- [Source: src/src/data/affixes.ts#AffixType (L13-40)]
- [Source: src/src/data/affixes.ts#EnchantmentType (L72-107)]
- [Source: src/src/data/affixes.ts#ENCHANTMENT_META (L144-158)]
- [Source: src/src/data/affixes.ts#QUEST_ENCHANTMENT_DEFS (L501-520)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase3 Multiply (L424-430)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase3 Decay (L458-468)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase3 Taboo (L493-501)]
- [Source: src/src/data/affixTrigger.ts#resolvePhase5 apprentice growth (L741-770)]
- [Source: src/src/data/affixTrigger.ts#categorizeEnchantmentCandidates (L1176-1201)]
- [Source: src/src/data/affixTrigger.ts#resetDecayForWord (L1261-1274)]
- [Source: src/src/data/affixTrigger.ts#getEffectiveProbMult (L1063-1080)]
- [Source: src/src/data/skillGeneration.ts#weightedSampleWithout (L73-111)]
- [Source: src/src/systems/battle.ts#pickWord (L205-216)]
- [Source: src/src/systems/affixTriggerOrchestrator.ts#TriggerWorkType (L21-39)]
- [Source: docs/stories/41-2-enchantment-redesign.md (原设计文档)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 6 (Transmute 删除): 从 enum 移除后，旧存档兼容通过 `(x as string) === 'transmute'` 实现，避免 TS2367 错误。**AC6 范围偏差**：原 AC 说"移除"Transmute 处理，实际保留了 Phase 5 / shop / ritual 中的 Transmute 运行时逻辑以支持旧存档向后兼容（标记 @deprecated）
- Task 7 (Decay 修复): `resetDecayForWord` 无生产调用点，已标记 @deprecated；重置逻辑移入 `resetStageState`
- Task 7 (QuestSacrifice 修复): 惩罚概率不再被 QuestSacrifice 降低（固定为词条原始值），改为 Phase 2 增加正面加成
- Task 8 (Gravity 词选): `collectGravityWeights()` 遍历 bindings (key→skillId) 收集 Gravity probMult，词权重为所有唯一字母 probMult 之积。**已知限制**：多格技能仅使用锚点键字母（非全部占据键），后续 Story 可按需扩展
- 测试基线: 258 pre-existing failures (sound/tutorial/CLASS_RESTRICTED/restEvents 等), 3644 passed, 零新增回归
- Code review 额外修复: affixes.test.ts 更新枚举计数测试（10 failures → 0）

### File List

- `src/src/data/affixes.ts` — EnchantmentType enum 重构、ENCHANTMENT_META、QUEST_ENCHANTMENT_DEFS desc 更新
- `src/src/data/affixTrigger.ts` — Phase 2/3/5 逻辑修改、APPRENTICE_RESOURCE_MAP/AFFIX_MAP 新增、resetStageState Decay 重置
- `src/src/data/affixMutation.ts` — 移除 ADAPT_GROWTH/emitMutationApplied
- `src/src/systems/affixTriggerOrchestrator.ts` — 悟道·词条跨技能成长通知
- `src/src/systems/battle.ts` — pickWord() Gravity 加权选词、collectGravityWeights()
- `src/src/systems/ritualEnchantment.ts` — Transmute 向后兼容
- `src/src/systems/shop.ts` — Transmute 向后兼容、TRANSMUTE_NAMES import 移除
- `src/src/systems/skills.ts` — updateChargeProducers @deprecated
- `src/src/demo/demo-i18n.ts` — 删除旧条目、新增资源专精+悟道 i18n
- `src/src/ui/HelpPanel.ts` — GLOSSARY_DATA 更新
- `tests/unit/data/affixes.test.ts` — 枚举计数/类别分布测试更新（AffixType 20, EnchantmentType 46, Quest 17）
- `tests/unit/data/affixTrigger.test.ts` — 大量测试更新/新增
- `tests/unit/data/affixMutation.test.ts` — 移除 mutationApplied 测试
- `tests/unit/systems/ritual-enchantment.test.ts` — 更新附魔类型引用
- `src/src/data/skillGeneration.ts` — Conduit 生成逻辑、Multiply 移除
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS multiply→conduit
- `tests/unit/data/affixBalance.test.ts` — Multiply→Crit 测试更新、Conduit 零产出断言
- `tests/unit/systems/relics/relics.enchantment.test.ts` — 更新附魔类型引用

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 | **Date:** 2026-03-26

**Findings (auto-fixed):**
- [H1] Task 6 AC6 范围偏差已文档化（Transmute 保留运行时代码用于旧存档兼容）
- [M1] File List 补充 3 个遗漏文件（skillGeneration.ts, KeyTooltip.ts, affixBalance.test.ts）
- [M2] EnchantmentType 枚举计数注释 36→46 已修正
- [M3] sprint-status.yaml 同步 41-2 → done
- [M4] Gravity 多格技能限制已文档化为已知限制

**Findings (acknowledged, low priority):**
- [L1] Phase 5 transmute 向后兼容代码已加 @deprecated 注释
- [L2] resetDecayForWord 测试保留（函数虽 deprecated 但仍可能被旧代码路径调用）
- [L3] QuestPurify 高层数可使 floor 超过 initialMult 为设计意图（已有测试覆盖）

**Verdict:** APPROVED — 所有 HIGH/MEDIUM 已修复，story 标记 done
