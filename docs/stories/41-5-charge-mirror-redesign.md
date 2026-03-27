# Story 41.5: 附魔重设计（四）— Charge 长按蓄力 + Mirror 全词条复制

Status: done

## Story

As a 玩家,
I want Charge 词条提供长按蓄力的独特操作体验，Mirror 质变后复制所有邻居词条,
so that 最复杂的两个词条改造提供最高上限的构筑策略.

## 设计概要

### Charge 完全重设计

- 原机制（时间累加 `chargeAccumulated`）为 @deprecated 空实现，需完全重建
- 新机制：**长按蓄力**，松手或蓄满释放
  - 正常打字 = 快速按键 → Charge 不充能
  - 有意长按 → `chargeAccumulated += gainPerSec * dt`，上限 `maxBonus`
  - 松手或蓄满 → 技能触发，Phase 2 叠加 `chargeAccumulated` 到 `bonusPercent`
- 质变（QuestEnergize）：满蓄力释放时自动打完当前单词所有剩余字母
  - 复用 `performAutocomplete()` 逻辑（battle.ts Tab 小助手）
  - 质变后无需小助手遗物、无需重复词即可触发

### Mirror 改造

- 原机制：每关结束随机复制**一个**邻居词条（`mirrorCopiedAffix: AffixInstance | null`）
- 质变（QuestMirror）：复制范围内**所有**邻居的不同类型词条
  - `mirrorCopiedAffixes: AffixInstance[]`（新字段）
  - `buildEffectiveSkill()` 替换 Mirror → 多个复制词条（数组膨胀）
  - 按 AffixType 去重（同类型只取一个）
  - 排除 Mirror/Twin 不可复制

### QuestEnergize / QuestMirror 附魔改造

- 删除旧 `getQuestCompletions * coefficient` 数值叠加
- 改为 `questTransformed = true` 布尔行为变化（与 41-3/41-4 同框架）
- 更新 effectDesc/transformDesc 和 i18n

### 前提

- 依赖 Story 41-3 完成（questTransformed 框架）✅
- 依赖 Story 41-4 完成（getQuestCompletions 清理模式）✅

## Acceptance Criteria

1. **AC1: Charge 长按蓄力机制**
   - InputHandler 新增 keyup 监听 + KeyHoldState 追踪
   - 浏览器 key repeat 过滤（`e.repeat` 检查）
   - focus 丢失（blur）时清空所有 hold 状态
   - `updateChargeProducers(dt)` 实现充能逻辑：遍历 held keys → 找对应 Charge 技能 → 累加 `chargeAccumulated`
   - Phase 2 Charge 移除 @deprecated 标记和 `getQuestCompletions` 叠加
   - 蓄力 UI：键位显示充能进度条，蓄满视觉提示

2. **AC2: Charge 质变 — 满蓄力自动打字**
   - `questTransformed = true` 且 `chargeAccumulated >= maxBonus` 时释放触发自动打完剩余字母
   - 复用 battle.ts `performAutocomplete()` 的 `playerCorrect` 循环逻辑
   - 无需小助手遗物、无需重复词限制
   - QuestEnergize effectDesc/transformDesc 更新

3. **AC3: Mirror 质变 — 全词条复制**
   - `questTransformed = true` 时 `resolveMirrorCopy` 返回所有邻居不同类型词条的数组
   - 新字段 `mirrorCopiedAffixes: AffixInstance[]` 存储质变模式复制结果
   - `buildEffectiveSkill()` 质变模式：Mirror 词条替换为所有复制词条（数组膨胀）
   - 按 AffixType 去重，排除 Mirror/Twin
   - 序列化/反序列化支持新字段
   - QuestMirror effectDesc/transformDesc 更新

4. **AC4: 无回归** — 现有测试零新增回归（基线 ≤157 失败 / ≥3794 通过）

## Tasks / Subtasks

- [x] Task 1: InputHandler 长按检测基础设施 (AC: #1)
  - [x] 1.1: `InputHandler` 新增 `keyup` 事件监听
  - [x] 1.2: 新增 `_heldKeys` Map 追踪（key → startTime）
  - [x] 1.3: `handleKeyDown` 中检查 `e.repeat` 过滤浏览器重复事件
  - [x] 1.4: `handleKeyUp` emit `input:keyup` 事件 + 清除 held 状态
  - [x] 1.5: window `blur` 监听器 → 清空所有 hold 状态
  - [x] 1.6: `disable()` 时清空 hold 状态并移除 keyup/blur 监听

- [x] Task 2: Charge 蓄力状态机实现 (AC: #1)
  - [x] 2.1: `skills.ts` `updateChargeProducers(dt)` 实现
  - [x] 2.2: `affixTrigger.ts` Phase 2 Charge 分支移除 @deprecated 和 `getQuestCompletions` 叠加
  - [x] 2.3: 蓄满释放逻辑 — chargeAccumulated 在 Phase 2 触发时消耗清零
  - [x] 2.4: `resetStageState` 已正确重置 `chargeAccumulated = 0`
  - [x] 2.5: 序列化/反序列化 `chargeAccumulated` 无需改动（已有）

- [x] Task 3: Charge 蓄力 UI (AC: #1)
  - [x] 3.1: `KeyVisual` 新增 `chargeProgressGraphics` 底部水平进度条
  - [x] 3.2: 蓝色 (0x3498db) 填充，宽度随 chargeAccumulated / maxBonus 变化
  - [x] 3.3: 蓄满金色 (0xffd700) 脉冲效果（sin 波 alpha 动画）
  - [x] 3.4: `KeyboardVisualizer.syncChargeProgress()` 每帧同步所有 Charge 键位

- [x] Task 4: QuestEnergize 质变 — 满蓄力自动打字 (AC: #2)
  - [x] 4.1: Phase 2 Charge → `chargeAutoComplete` flag via Phase2Result → TriggerResult
  - [x] 4.2: `affixTriggerOrchestrator.ts` → `chargeAutoComplete` 回调 → `performAutocomplete()`
  - [x] 4.3: `affixes.ts` QuestEnergize effectDesc/transformDesc 更新
  - [x] 4.4: `demo-i18n.ts` ZH/EN 更新

- [x] Task 5: Mirror 质变 — 全词条复制 (AC: #3)
  - [x] 5.1: `SkillRuntimeState` 新增 `mirrorCopiedAffixes: AffixInstance[]`
  - [x] 5.2: `resolveMirrorCopy` 拆分质变/非质变路径
  - [x] 5.3: 删除 QuestMirror 旧 `×1.1^c` 叠加
  - [x] 5.4: `buildEffectiveSkill` 质变模式 Mirror → 数组膨胀
  - [x] 5.5: `battle.ts` `endLevel()` 质变模式存入 `mirrorCopiedAffixes`
  - [x] 5.6: 序列化/反序列化/迁移支持 `mirrorCopiedAffixes`
  - [x] 5.7: QuestMirror effectDesc/transformDesc 更新
  - [x] 5.8: `demo-i18n.ts` ZH/EN 更新

- [x] Task 6: 单元测试 (AC: #4)
  - [x] 6.1: Charge Phase 2 新逻辑测试（已在前序修复中覆盖）
  - [x] 6.2: Charge questTransformed 测试（chargeAutoComplete flag，5 tests）
  - [x] 6.3: Mirror questTransformed 测试（5 tests: 全词条复制 + 去重 + 排除）
  - [x] 6.4: buildEffectiveSkill 质变模式测试（4 tests: 膨胀 + 优先级 + fallback + 管线）
  - [x] 6.5: 边界测试：无邻居、邻居全是 Mirror/Twin

- [x] Task 7: 回归测试 (AC: #4)
  - [x] 7.1: 157 failed / 3808 passed（基线 ≤157 ✅）
  - [x] 7.2: 修复 affixBalance 测试 quest 计数 17→19

## Dev Notes

### 关键架构约束

1. **InputHandler 改动最小化**：只加 keyup 监听和 hold state 追踪。`handleKeyDown` 保持现有 `input:keypress` emit，新增 `e.repeat` 过滤。不要改变现有打字流程。

2. **Phase 2 Charge 简化**：移除 `getQuestCompletions` 调用和 `c * 0.3` 叠加系数。直接用 `affix.maxBonus` 作为 cap。与 41-3/41-4 统一模式。

3. **questTransformed 框架复用**：Charge 和 Mirror 的质变都使用 `runtimeState.questTransformed` 布尔值判断，不再增加新的 state 字段用于质变逻辑判定。

4. **Mirror 双字段共存**：质变模式用 `mirrorCopiedAffixes: AffixInstance[]`，非质变模式继续用 `mirrorCopiedAffix: AffixInstance | null`。`buildEffectiveSkill` 优先检查质变字段。

5. **Charge 自动打字回调路径**：Phase 2 只能设置 flag（纯计算），实际自动打字必须在系统层（battle.ts 触发回调或 orchestrator 回调中执行）。不要在 affixTrigger.ts 中直接调用 DOM 或 game state。

6. **updateChargeProducers 已有调用点**：`battle.ts:1295` 已调用 `updateChargeProducers(0.1)`，只需填充 `skills.ts:107` 的空实现。需传入必要上下文（held keys、bindings、skills、skillStates）。

### 代码位置速查

| 组件 | 文件 | 行号 |
|------|------|------|
| AffixType.Charge 定义 | `src/src/data/affixes.ts` | L19 |
| AffixType.Mirror 定义 | `src/src/data/affixes.ts` | L27 |
| SkillRuntimeState | `src/src/data/affixes.ts` | L274-287 |
| QuestEnergize 定义 | `src/src/data/affixes.ts` | L552 |
| QuestMirror 定义 | `src/src/data/affixes.ts` | L557 |
| createSkillRuntimeState | `src/src/data/affixes.ts` | L575+ |
| Phase 2 Charge (@deprecated) | `src/src/data/affixTrigger.ts` | L344-351 |
| buildEffectiveSkill | `src/src/data/affixTrigger.ts` | L1061-1081 |
| resolveMirrorCopy | `src/src/data/affixTrigger.ts` | L1247-1309 |
| resetStageState | `src/src/data/affixTrigger.ts` | L1451-1475 |
| serializeSkill | `src/src/data/affixTrigger.ts` | L1497+ |
| deserializeSkill | `src/src/data/affixTrigger.ts` | L1530+ |
| Charge 默认参数 | `src/src/data/skillGeneration.ts` | L152-153 |
| updateChargeProducers (空实现) | `src/src/systems/skills.ts` | L106-109 |
| InputHandler | `src/src/systems/typing/InputHandler.ts` | 全文件 |
| performAutocomplete (Tab) | `src/src/systems/battle.ts` | L398-496 |
| endLevel() Mirror 调用 | `src/src/systems/battle.ts` | L1376-1431 |
| updateChargeProducers 调用点 | `src/src/systems/battle.ts` | L1295 |
| Charge 测试 | `tests/unit/data/affixTrigger.test.ts` | L399-442 |
| Mirror 测试 | `tests/unit/data/affixTrigger.test.ts` | L2819-2926 |
| Mirror 多格测试 | `tests/unit/systems/trigger-multi-cell.test.ts` | L704-799 |

### 浏览器长按注意事项

- `KeyboardEvent.repeat` = true 表示浏览器 key repeat（自动重复），必须过滤
- keydown 只在首次按下时处理打字 + 开始 hold 追踪
- keyup 时计算按住时长并 emit 释放事件
- window blur 事件必须清空所有 hold 状态（用户 Alt+Tab 等场景）
- 多键同时按住应独立追踪各自时长

### 前序 Story 教训

- **41-3**: questTransformed 框架稳定，可直接复用。注意 `questTransformed ?? (questCompletions > 0)` 向下兼容。
- **41-4**: `getQuestCompletions` 调用点删除模式成熟。shop.ts 预览公式也需同步更新（如有 Charge/Mirror 相关）。
- **41-4 code review**: shop.ts 曾有旧叠加公式残留（H1）。确认 Charge/Mirror 在 shop.ts 中的预览计算是否需要更新。
- **测试模式**: 手动设置 affix 参数避免 rollAffixParams 随机性。用 `makeRuntimeState({ questTransformed: true })` 测试质变路径。

### Project Structure Notes

- 源码根目录：`/Volumes/work/project/game/src/`（含 package.json）
- 源代码：`src/src/`
- 测试：`src/tests/unit/`
- 测试命令：`cd /Volumes/work/project/game/src && npx vitest run`
- i18n：`src/src/demo/demo-i18n.ts`（ZH/EN 双语）
- 故事文件：`docs/stories/`

### References

- [Source: docs/stories/41-2-enchantment-redesign.md — Charge 长按蓄力原始设计]
- [Source: docs/stories/41-3-quest-transform-batch1.md — questTransformed 框架实现]
- [Source: docs/stories/41-4-quest-transform-batch2.md — getQuestCompletions 清理模式]
- [Source: src/src/data/affixTrigger.ts#Phase2 — Charge @deprecated 实现]
- [Source: src/src/data/affixTrigger.ts#resolveMirrorCopy — Mirror 复制算法]
- [Source: src/src/data/affixTrigger.ts#buildEffectiveSkill — Mirror 运行时替换]
- [Source: src/src/systems/typing/InputHandler.ts — 现有键盘事件处理]
- [Source: src/src/systems/battle.ts#performAutocomplete — 小助手自动打字逻辑]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- affixBalance quest count fix: 17→19 (QuestTwin + QuestConduit added in 41-3/41-4)
- chargeAutoComplete flag路径: Phase2Result → TriggerResult → OrchestratorCallbacks
- resolveMirrorCopyAll dedup 使用 Set<string> 按 AffixType 去重

### Completion Notes List
- AC1 ✅: InputHandler hold detection + Phase 2 Charge 简化 + Charge UI 进度条
- AC2 ✅: chargeAutoComplete flag → orchestrator callback → performAutocomplete()
- AC3 ✅: Mirror 质变全词条复制 + buildEffectiveSkill 数组膨胀 + 序列化
- AC4 ✅: 14 new tests, 157/3808 regression baseline maintained

### File List
- `docs/stories/sprint-status.yaml` — story status sync
- `src/src/systems/typing/InputHandler.ts` — keyup/blur/repeat 长按检测
- `src/src/systems/skills.ts` — updateChargeProducers + chargeAutoComplete callback
- `src/src/data/affixTrigger.ts` — Phase 2 Charge, resolveMirrorCopy, buildEffectiveSkill, serialization
- `src/src/data/affixes.ts` — SkillRuntimeState.mirrorCopiedAffixes, QuestEnergize/QuestMirror defs
- `src/src/systems/affixTriggerOrchestrator.ts` — chargeAutoComplete callback
- `src/src/systems/battle.ts` — performAutocomplete export, Mirror endLevel adaptation
- `src/src/systems/shop.ts` — Mirror tooltip for transformed mode
- `src/src/demo/demo-i18n.ts` — ZH/EN i18n for QuestEnergize/QuestMirror
- `src/src/ui/keyboard/KeyVisual.ts` — Charge progress bar (chargeProgressGraphics)
- `src/src/ui/keyboard/KeyboardVisualizer.ts` — syncChargeProgress() per-frame update
- `tests/unit/data/affixTrigger.test.ts` — 14 new tests + import + makeRuntimeState fix
- `tests/unit/data/affixBalance.test.ts` — quest count 17→19 + makeRuntimeState fix
- `tests/unit/systems/trigger-multi-cell.test.ts` — makeRuntimeState fix
- `tests/unit/systems/affixTriggerOrchestrator.test.ts` — makeRuntimeState fix
- `tests/unit/systems/shopComparison.test.ts` — makeRuntimeState fix
