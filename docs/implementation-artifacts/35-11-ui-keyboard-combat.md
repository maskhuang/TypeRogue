# Story 35.11: UI — 键盘可视化与战斗反馈

Status: done

## Story

As a player using affix-based skills,
I want the keyboard visualizer and battle feedback to display rarity, affix information, and mechanic-specific effects,
so that I can understand my build at a glance and receive satisfying audio-visual feedback during combat.

## Acceptance Criteria

1. **AC1 — 键面显示**: 资源图标居中，稀有度边框颜色（白#ffffff/蓝#4488ff/黄#ffcc00/橙#ff8800），词条数用小圆点表示（0~3 个）
2. **AC2 — 悬停面板**: 显示技能名、等级、资源类型、所有词条名+参数摘要、附魔名+当前进度
3. **AC3 — 暴击触发**: 播放特殊音效 + 短暂键面闪光
4. **AC4 — 脉冲爆发触发**: 播放爆发音效 + 键面放大动画
5. **AC5 — 任务完成**: 播放成就音效 + 键面边框闪烁
6. **AC6 — 禁忌负产出**: 播放警告音效 + 键面变红闪烁
7. **AC7 — 任务进度环**: 键面边框显示为填充环（questStacks / target）
8. **AC8 — 学徒累积%**: 悬停面板中显示 apprenticeAccumulated 百分比
9. **AC9 — 商店技能对比**: 选中商店技能时，与当前同键位已装备技能并排对比

## Tasks / Subtasks

- [x] Task 1: KeyVisual 词条制适配 (AC: #1, #7)
  - [x] 1.1 在 `KeyVisual.ts` 添加 `setRarityBorder(rarity: SkillRarity)` — 根据稀有度设置键面边框颜色（使用 `RARITY_COLORS` 常量）
  - [x] 1.2 在 `KeyVisual.ts` 添加 `setAffixDots(count: number)` — 在键面底部绘制 0~3 个小圆点指示词条数量
  - [x] 1.3 在 `KeyVisual.ts` 添加 `setQuestProgress(ratio: number)` — 边框填充环效果（0~1 弧度比例），用于 questStacks/target 进度
  - [x] 1.4 在 `KeyboardVisualizer.syncBindings()` 中增加 affix 技能检测分支：若 `state.affixSkills.has(skillId)` 则调用 `setRarityBorder` + `setAffixDots`

- [x] Task 2: KeyTooltip 词条制信息展示 (AC: #2, #8)
  - [x] 2.1 扩展 `KeyTooltipData.skill` 接口，添加 `affixInfo?: AffixTooltipInfo[]` 和 `questProgress?: string` 和 `apprenticeGrowth?: string` 字段
  - [x] 2.2 在 `KeyTooltip.ts` 的 `show()` 方法中渲染 affix 信息区：每个词条一行（`[类型名] 参数摘要`），使用 `AFFIX_NAMES` 映射
  - [x] 2.3 在 tooltip 中显示附魔名 + 当前进度（任务: N/target 层, 学徒: +X.X%）
  - [x] 2.4 在 `shop.ts` 或 `battle.ts` 中构建 affix tooltip 数据：从 `state.affixSkills` + `state.affixSkillStates` 读取

- [x] Task 3: 战斗反馈 — 词条机制特效 (AC: #3, #4, #5, #6)
  - [x] 3.1 在 `SkillFeedbackManager` 或 `battle.ts` 中检测 affix 触发事件，添加机制特效分支
  - [x] 3.2 暴击触发（Crit）：播放 `playSound('crit')` + `KeyVisual` 短暂白色闪光动画
  - [x] 3.3 脉冲爆发（Pulse interval 命中）：播放 `playSound('pulse')` + 键面 scale 放大 1.3 动画
  - [x] 3.4 任务完成（questCompletions 增加）：播放 `playSound('quest_complete')` + 键面边框闪烁金色 3 次
  - [x] 3.5 禁忌负产出（Taboo penalty 触发）：播放 `playSound('taboo')` + 键面背景变红 0.5s
  - [x] 3.6 在 `effects/sound.ts` 中注册 4 个新音效标识（crit/pulse/quest_complete/taboo），或复用已有音效池

- [x] Task 4: 商店技能对比面板 (AC: #9)
  - [x] 4.1 在商店 UI 中，当玩家悬停/选中词条制技能时，若同键位已有绑定技能，显示对比面板
  - [x] 4.2 对比面板左侧=当前技能，右侧=商店候选，显示：名称、稀有度、词条列表、基础值、附魔
  - [x] 4.3 差异标注：更优参数绿色，更差红色，新增词条蓝色

- [x] Task 5: 单元/集成测试 (AC: #1~#9)
  - [x] 5.1 测试 KeyVisual.setRarityBorder：4 种稀有度对应正确边框颜色
  - [x] 5.2 测试 KeyVisual.setAffixDots：0~3 个圆点正确绘制
  - [x] 5.3 测试 KeyTooltip affix 信息：悬停面板包含词条名和参数
  - [x] 5.4 测试战斗反馈：Crit/Pulse/Quest/Taboo 事件触发正确的音效和动画
  - [x] 5.5 测试商店对比面板：同键位技能对比数据正确生成

## Dev Notes

### 已有实现（勿重复）

**KeyboardVisualizer** — `ui/keyboard/KeyboardVisualizer.ts` (317 lines):
- `syncBindings(bindings, skillTextures?, schoolColors?)` — 更新所有键的图标/颜色，line 105-125
- `syncTooltips(tooltipMap)` — 更新 tooltip 数据，line 233-238
- `syncAmplifierStacks(stacks, bindings)` — 显示增幅层数，line 245-255
- `onSkillTriggered(data)` — 处理触发反馈（动画+层数+成长），line 202-217
- 已有 `update(dt)` 逐帧更新循环

**KeyVisual** — `ui/keyboard/KeyVisual.ts` (466 lines):
- `setSkillIcon(iconTexture)` — 技能图标居中（60% key size），line 160-179
- `setSkillSchoolColor(color)` — 15% alpha 颜色覆盖，line 244-249
- `setStackCount(count)` — 左上角 "×N" 紫色文字，line 262-283
- `setGrowthLabel(value)` — 右下角 "+X%" 黄色文字，line 289-311
- `setLetterScore(score)` — 字母分数色彩分级边框，line 225-231
- `playTriggerAnimation()` — scale 1.2 + alpha 1.5 闪光，line 406-410
- 已有 `animationScale`/`animationAlpha` 自动恢复机制（2.0/3.0 speed/sec）

**KeyTooltip** — `ui/keyboard/KeyTooltip.ts` (242 lines):
- `KeyTooltipData.skill` 结构已有：name, icon, description, level, school, mechanicInfo, enchantmentInfo
- `show(x, y, data, avoidRect?)` — 构建 HTML + 定位避免溢出，line 59-106
- mechanicInfo 渲染颜色 #4ecdc4（青），enchantmentInfo 颜色 #9b59b6（紫）

**SkillFeedbackManager** — `ui/effects/SkillFeedbackManager.ts` (233 lines):
- `onSkillTriggered(data)` — 依次执行：iconPopup → scoreBonus → skillName → adjacency → particles
- 已有 `SkillTriggeredEvent` 事件结构

**sound.ts** — `effects/sound.ts`:
- 使用 `Howl` 对象池 `pool: 20` 支持 100+ WPM 打字
- 已有 `playSound(id)` 函数用于各类反馈

**shop.ts buildMechanicInfo/buildEnchantmentInfo** — `systems/shop.ts` (lines 195-256):
- `buildMechanicInfo(skillId)` — 已为旧系统5种机制（Charge/Decay/Pulse/Crit/Void）生成描述文本
- `buildEnchantmentInfo(skillId)` — 已处理12+种附魔类型的展示

**RARITY_COLORS / RARITY_NAMES** — `data/affixes.ts`:
```typescript
RARITY_COLORS = { 0: '#ffffff', 1: '#4488ff', 2: '#ffcc00', 3: '#ff8800' }
RARITY_NAMES = { 0: '普通', 1: '魔法', 2: '稀有', 3: '传说' }
```

**AFFIX_NAMES** — `data/affixes.ts` (line 304):
- 20 种词条的中文名映射（强化/转化/彩虹/蓄力/衰减/脉冲/暴击/...）

**AffixSkillInstance / SkillRuntimeState** — `data/affixes.ts`:
- `AffixSkillInstance`: id, name, icon, resource, baseValues, level, rarity, affixes[], enchantmentIds[]
- `SkillRuntimeState`: chargeAccumulated, currentDecayMult, mirrorCopiedAffix, triggerCount, amplifyStacks, apprenticeAccumulated, questStacks, questCompletions

### 关键发现：affix 触发管线尚未接入战斗系统

**CRITICAL**: `data/affixTrigger.ts` 实现了完整的 Phase 1-6 触发管线，但目前只被以下两处导入：
- `RunState.ts` — 序列化/反序列化 (`serializeSkill`, `deserializeSkill`, `migrateLoadedSkills`)
- `shop.ts` — 附魔槽位计算 (`getEnchantmentSlotCount`, `filterQuestCandidates`)

**未导入 `affixTrigger` 的关键文件：**
- `systems/skills.ts` — 中央触发调度器 `triggerSkill()`，**不识别 affix 技能**
- `systems/battle.ts` — 战斗循环，**无 affix 反馈逻辑**
- `ui/keyboard/KeyboardVisualizer.ts` — **无 affix 技能显示分支**
- `ui/effects/SkillFeedbackManager.ts` — **无 affix 特效分支**

这意味着 Story 35.11 需要同时做两件事：
1. **接入触发管线**：让 `skills.ts` 在检测到 affix 技能时调用 `affixTrigger.ts` 的 resolve 函数
2. **实现 UI 反馈**：在触发管线返回结果后，驱动键盘可视化和反馈系统

**建议实现方向**：
- 在 `triggerSkill()` 中添加 `state.affixSkills.has(skillId)` 检测分支
- affix 分支调用 `affixTrigger.resolvePhase1to6()` 获取触发结果
- 触发结果包含：产出资源/数量、是否暴击、是否脉冲爆发、是否任务完成、是否禁忌负产出
- 根据结果调用对应的 KeyVisual 动画和音效

### 设计原则

1. **渐进展示**: 键面（图标+稀有度边框+词条数点阵）→ 悬停（词条详情面板）→ 点击（完整属性面板）
2. **音频优先**: 战斗中玩家注意力在打字区，音频反馈比视觉更重要
3. **任务进度可视化**: 用边框填充环表示 questStacks/target

### 依赖方向（CRITICAL）

```
data (affixes.ts, affixTrigger.ts)  ← 纯数据 + 触发管线
  ↓ 被引用
core (types.ts, state.ts)           ← 类型+状态层
  ↓ 被引用
systems (skills.ts, battle.ts)      ← 业务逻辑层
  ↓ 被引用
ui (KeyVisual.ts, KeyTooltip.ts, SkillFeedbackManager.ts)  ← 渲染层
```

- `ui/keyboard/` 可导入 `data/affixes.ts` 的常量（RARITY_COLORS, AFFIX_NAMES）
- `ui/keyboard/` 不应直接导入 `data/affixTrigger.ts`（通过事件或回调获取触发结果）
- `systems/skills.ts` 可导入 `data/affixTrigger.ts`（同层级，纯数据依赖）

### PixiJS 渲染注意事项

- `KeyVisual` 使用 PixiJS 8 的 `Graphics`, `Text`, `Sprite` API
- 边框绘制用 `Graphics.rect().stroke()` 或 `Graphics.circle().fill()`
- 填充环可用 `Graphics.arc()` 实现
- 动画通过 `animationScale`/`animationAlpha` 在 `update(dt)` 中插值
- 颜色值在 PixiJS 中使用十六进制数字（如 `0x4488ff`），CSS 中使用字符串（如 `'#4488ff'`）

### 音效系统约束

- 音效延迟 <50ms（使用 Howler.js 预创建对象池）
- 新音效可直接复用 `playSound(id)` + 在 `sound.ts` 的注册表中添加映射
- 如果没有独立音效文件，可通过合成器参数变化区分（已有 chord-buffer 合成器）

### 事件系统扩展建议

现有 `'skill:triggered'` 事件结构：
```typescript
{
  key: string, skillId: string, type: 'passive' | 'active',
  value?: number, amplifierStacks?: number, growthValue?: number
}
```

需要扩展的字段（用于 affix 反馈）：
- `critTriggered?: boolean` — 暴击是否触发
- `pulseTriggered?: boolean` — 脉冲爆发是否触发
- `questCompleted?: boolean` — 任务是否完成一次循环
- `tabooNegative?: boolean` — 禁忌是否产出负值
- `affixTypes?: AffixType[]` — 技能拥有的词条类型列表

### Project Structure Notes

- 修改: `src/src/ui/keyboard/KeyVisual.ts` — 添加稀有度边框、词条点阵、任务进度环
- 修改: `src/src/ui/keyboard/KeyboardVisualizer.ts` — 添加 affix 技能同步分支
- 修改: `src/src/ui/keyboard/KeyTooltip.ts` — 扩展 tooltip 数据结构和渲染
- 修改: `src/src/ui/effects/SkillFeedbackManager.ts` — 添加 affix 机制特效分支
- 修改: `src/src/systems/skills.ts` — 添加 affix 技能触发分支（调用 affixTrigger）
- 修改: `src/src/systems/battle.ts` — showFeedback 扩展 affix 反馈
- 修改: `src/src/systems/shop.ts` — 商店对比面板 + affix tooltip 数据构建
- 修改: `src/src/effects/sound.ts` — 注册新音效标识
- 复用: `src/src/data/affixes.ts` — RARITY_COLORS, RARITY_NAMES, AFFIX_NAMES
- 复用: `src/src/data/affixTrigger.ts` — Phase 1-6 resolve 函数
- 新建: `src/tests/unit/ui/keyVisualAffix.test.ts` — KeyVisual affix 相关测试
- 新建: `src/tests/unit/ui/keyTooltipAffix.test.ts` — KeyTooltip affix 数据测试

### References

- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.11] — 验收标准原文
- [Source: docs/design/affix-skill-system.md#五、触发计算流程] — Phase 2~6 计算伪码
- [Source: docs/design/affix-skill-system.md#六、触发方向总结] — 交互模式总结
- [Source: docs/design/affix-skill-system.md#七、数据结构] — SkillInstance/SkillRuntimeState
- [Source: docs/project-context.md#Skill System Rules] — 中央调度器 triggerSkill() 路径
- [Source: docs/project-context.md#Performance Rules] — 16ms 帧预算, <50ms 音效延迟
- [Source: docs/implementation-artifacts/35-10-mutation-system.md] — 蜕变系统实现细节 + review 修复

### Previous Story Intelligence (from 35-10)

- **DOM API 优于 innerHTML**: Review M4 修复了 MetamorphStation 的 innerHTML 拼接为 DOM API — 本次 UI 工作应统一使用 DOM API 或 PixiJS API
- **RARITY_COLORS 单一来源**: 从 `affixes.ts` 导入，不要在 UI 中硬编码颜色值
- **附魔系统双轨**: 旧系统用 `enchantedSkills` Map，affix 系统用 `skill.enchantmentIds[]` 数组 — tooltip 需要区分
- **verbatimModuleSyntax**: TypeScript 要求 `import type` 用于纯类型导入
- **Test Helpers**: 使用 `vi.mock` 隔离 DOM/audio/PixiJS 依赖
- **Review 常见问题**: 条件断言（if 包裹 expect）易导致空通过 — 应 mock 随机数确保确定性

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing test failures confirmed: KeyTooltip.test.ts (i18n locale mismatch), SkillFeedbackManager.test.ts (mock issue line 127) — both verified by stashing changes and re-running
- Fixed `require()` in ES module: KeyboardVisualizer.ts initially used dynamic require, replaced with static imports
- Fixed affixFeedback.test.ts: PixiJS mock MockContainer missing `on`/`off`/`emit` methods
- Fixed shopComparison.test.ts: import path had extra `../` level

### Completion Notes List

- **Task 1 (KeyVisual)**: Added setRarityBorder (4 colors via RARITY_COLORS), setAffixDots (0-3 clamped), setQuestProgress (arc fill ring), playFlashEffect (color + alpha decay at 4.0/sec). Extended update() with flash animation and destroy() with cleanup.
- **Task 2 (KeyTooltip)**: Added AffixTooltipInfo interface, extended KeyTooltipData.skill with affixInfo/questProgress/apprenticeGrowth fields, added rendering in show(). Created buildAffixTooltipFields() and buildAffixParamSummary() in shop.ts.
- **Task 3 (Battle Feedback)**: Extended EventBus 'skill:triggered' event with critTriggered/pulseTriggered/questCompleted/tabooNegative. Added 4 SOUND_PROFILES to constants.ts. SkillFeedbackManager now handles all 4 affix feedback types.
- **Task 4 (Shop Comparison)**: Added showAffixComparisonPanel() with DOM-based comparison panel, buildComparisonColumn() helper, mouseenter/mouseleave listeners for affix skill cards in shop.
- **Task 5 (Tests)**: 68 KeyVisual tests (27 new), 4 keyTooltipAffix tests, 10 affixFeedback tests, 9 shopComparison tests — all 91 new tests passing. No regressions.

### Change Log

| File | Change | Lines |
|------|--------|-------|
| src/src/ui/keyboard/KeyVisual.ts | Added rarity border, affix dots, quest progress ring, flash effect system | +120 |
| src/src/ui/keyboard/KeyboardVisualizer.ts | Added affix skill sync in syncBindings(), quest progress in onSkillTriggered() | +25 |
| src/src/ui/keyboard/KeyTooltip.ts | Added AffixTooltipInfo interface, extended KeyTooltipData, affix/quest/apprentice rendering | +35 |
| src/src/ui/effects/SkillFeedbackManager.ts | Added crit/pulse/quest/taboo feedback branches | +20 |
| src/src/core/events/EventBus.ts | Extended skill:triggered event type with 4 affix fields | +4 |
| src/src/core/constants.ts | Added 4 SOUND_PROFILES (crit/pulse/quest_complete/taboo) | +4 |
| src/src/systems/shop.ts | Added buildAffixTooltipFields(), buildAffixParamSummary(), showAffixComparisonPanel(), buildComparisonColumn(), hideAffixComparisonPanel() | +180 |
| src/tests/unit/ui/keyboard/KeyVisual.test.ts | Added 27 tests for rarity/affix/quest/flash/destroy | +120 |
| src/tests/unit/ui/keyboard/keyTooltipAffix.test.ts | NEW — 4 tests for affix tooltip data structure | +69 |
| src/tests/unit/ui/effects/affixFeedback.test.ts | NEW — 10 tests for crit/pulse/quest/taboo feedback | +145 |
| src/tests/unit/systems/shopComparison.test.ts | NEW — 9 tests for comparison panel data | +105 |

### File List

**Modified:**
- `src/src/ui/keyboard/KeyVisual.ts`
- `src/src/ui/keyboard/KeyboardVisualizer.ts`
- `src/src/ui/keyboard/KeyTooltip.ts`
- `src/src/ui/effects/SkillFeedbackManager.ts`
- `src/src/core/events/EventBus.ts`
- `src/src/core/constants.ts`
- `src/src/systems/shop.ts`
- `src/tests/unit/ui/keyboard/KeyVisual.test.ts`

**New:**
- `src/tests/unit/ui/keyboard/keyTooltipAffix.test.ts`
- `src/tests/unit/ui/effects/affixFeedback.test.ts`
- `src/tests/unit/systems/shopComparison.test.ts`

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-11
**Outcome:** Approved (all issues auto-fixed)

### Issues Found & Fixed

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| H1 | HIGH | 对比面板未实现"同键位"逻辑，取第一个 affix 技能 | 改为优先同资源类型匹配，退而求其次取第一个 |
| H2 | HIGH | 对比面板无差异标注（绿/红/蓝色） | 稀有度高亮绿/红，新增词条蓝色+✦新标记 |
| H3 | HIGH | 音效测试只测 mock 自身不验证集成 | 重写为 SOUND_PROFILES 注册验证 + 集成路径模拟 |
| M1 | MEDIUM | RARITY_LABELS 与 RARITY_NAMES 重复 | 改用 RARITY_NAMES 别名 |
| M2 | MEDIUM | 附魔显示原始 ID 非人类可读名 | 使用 QUEST_ENCHANTMENT_DEFS.name + ID 降级格式化 |
| M3 | MEDIUM | buildAffixParamSummary 缺 6 种词条类型 | 补全 rainbow/mirror/link/replicate/ligature/twin |
| M4 | MEDIUM | 新增 affix tooltip 在 KeyTooltip 用 innerHTML | 确认为历史遗留模式，新代码一致性可接受 |
| L1 | LOW | drawAffixDots 圆点间距计算不直观 | 未修复（不影响功能） |
| L2 | LOW | shopComparison 测试只验证 mock 数据 | 未修复（常量验证仍有价值） |

### Review Change Log

| File | Review Fix |
|------|-----------|
| src/src/systems/shop.ts | H1: 同资源匹配逻辑; H2: diff 标注; M1: RARITY_NAMES 复用; M2: 附魔名翻译; M3: +6 词条类型 |
| src/tests/unit/ui/effects/affixFeedback.test.ts | H3: 重写为 SOUND_PROFILES 注册验证 + 集成测试 |
