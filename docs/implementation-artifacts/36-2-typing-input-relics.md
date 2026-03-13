# Story 36.2: 打字/输入系统遗物

Status: done

## Story

As a player,
I want 5 typing/input-related relics that modify keystroke behavior, error handling, and word completion,
so that I have meaningful strategic choices around my core typing gameplay.

## Acceptance Criteria

1. **AC1 — 打字蜡封 (typing_wax_seal)**: 每词首次打错免除惩罚（不触发 `word:error` 链、不断 combo、不触发其他惩罚机制）。第二次错误起正常处理。每个新词重置。

2. **AC2 — 回声指套 (echo_thimble)**: 正确击键时 8% 概率触发"双重击键"效果：combo 额外 +1，对应按键绑定的技能额外触发一次。不影响字母输入进度（index 不多进一位）。

3. **AC3 — 小助手 (little_helper)**: 追踪本关已出现的单词。对于重复单词，打完第一个字母后显示 Tab 提示。按 Tab 自动补全：按原字母顺序依次触发所有剩余字母的技能和 combo 逻辑，等同于瞬间打完该词。

4. **AC4 — 节奏适应 (rhythm_adapt)**: 记录单词开始时间。完成词语时：若用时 >3s → `state.time += 1`；若用时 <3s → 该词最终得分 ×1.3。

5. **AC5 — 玻璃大炮 (glass_cannon_v2)**: 全局分数倍率 ×2（通过 pipeline modifier base 层），任何打字错误 → 立即关卡失败。与蜡封交互：被蜡封免除的错误不触发死亡。

6. **AC6 — 单元测试**: 每个遗物有独立行为测试覆盖正常触发和边界情况。

7. **AC7 — 交互测试**: 玻璃大炮 + 打字蜡封交互有专门测试（蜡封免除的首次错误不触发死亡，第二次错误触发死亡）。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个遗物 RelicData 条目，含 subsystem: 'typing'
  - [x] 1.2 为行为型遗物设置 `behaviorType` 字段（error_forgive_first, double_keystroke, autocomplete, rhythm_adapt, glass_cannon）
  - [x] 1.3 为 glass_cannon_v2 在 `RELIC_MODIFIER_DEFS` 中注册 score ×2 modifier factory
  - [x] 1.4 确认 glass_cannon_v2 ID 不与 DELETED_RELIC_IDS 中的 'glass_cannon' 冲突

- [x] Task 2: 实现打字蜡封行为 (AC: #1)
  - [x] 2.1 创建 `systems/relics/TypingRelicBehaviors.ts`，注册 `error_forgive_first` 行为
  - [x] 2.2 在 `playerWrong()` 中增加蜡封检查：在现有 on_error 管道之前，检查蜡封遗物是否已使用
  - [x] 2.3 使用 `relicStates[relicId]` 记录本词是否已使用（0=未用, 1=已用）
  - [x] 2.4 在 `setWord()` 中调用 `resetWaxSeal()` 重置蜡封状态

- [x] Task 3: 实现回声指套行为 (AC: #2)
  - [x] 3.1 注册 `double_keystroke` 行为
  - [x] 3.2 在 `playerCorrect()` 的技能触发后，检查回声指套：8% 概率触发二次击键
  - [x] 3.3 二次击键效果：combo++ 和再次调用 `triggerSkill(skillId, k)`
  - [x] 3.4 不改变 `state.player.index`（字母进度不变）

- [x] Task 4: 实现小助手行为 (AC: #3)
  - [x] 4.1 注册 `autocomplete` 行为
  - [x] 4.2 模块级 `Set<string>` 追踪本关已出现单词，在 `setWord()` 时调用 `trackWord()`
  - [x] 4.3 在 `handleKeyPress()` 中检测 Tab 键：若当前词是重复词且已打完第一个字母，触发 `performAutocomplete()`
  - [x] 4.4 自动补全逻辑：循环剩余字母，对每个字母执行 playerCorrect() 逻辑（combo++, 触发技能）
  - [x] 4.5 UI 提示：showFeedback('Tab ✓') 反馈（更复杂的 UI 提示留待后续迭代）

- [x] Task 5: 实现节奏适应行为 (AC: #4)
  - [x] 5.1 注册 `rhythm_adapt` 行为
  - [x] 5.2 在 `completeWord()` 中计算 wordElapsed（复用已有 `wordStartTime` 变量）
  - [x] 5.3 若 wordElapsed > 3 → state.time += 1
  - [x] 5.4 若 wordElapsed < 3 → bonusMult *= 1.3（在结算 mult 中乘算）

- [x] Task 6: 实现玻璃大炮 (AC: #5)
  - [x] 6.1 `RELIC_MODIFIER_DEFS` 中已注册 `glass_cannon_v2` 工厂（Task 1.3）
  - [x] 6.2 在 `playerWrong()` 中直接检查 `hasGlassCannon()` → `gameOver()`
  - [x] 6.3 蜡封在 glass_cannon 检查之前执行：`checkWaxSealForgive()` → return → glass_cannon 无机会触发
  - [x] 6.4 执行顺序：蜡封检查 → 若未免除 → 玻璃大炮检查 → on_error 管道

- [x] Task 7: 注册模块初始化 (AC: #1-#5)
  - [x] 7.1 在 `TypingRelicBehaviors.ts` 导出 `initTypingRelicBehaviors()` 注册所有 5 个行为
  - [x] 7.2 在 `initInput()` 中调用 `initTypingRelicBehaviors()`
  - [x] 7.3 在 `startLevel()` 中调用 `resetTypingRelicState()` 重置关级别状态

- [x] Task 8: 单元测试 (AC: #6, #7)
  - [x] 8.1 创建 `tests/unit/systems/relics/relics.typing.test.ts`（33 个测试）
  - [x] 8.2 打字蜡封测试：首次错误免除、第二次错误正常、新词重置、未持有时不免除、relicStates 记录
  - [x] 8.3 回声指套测试：概率触发边界值（<0.08, =0.08, =0）、未持有时不触发
  - [x] 8.4 小助手测试：重复词检测、Tab 补全条件、首次出现词不触发、大小写无关、关重置
  - [x] 8.5 节奏适应测试：>3s 加时、<3s 加分、边界值 3s、极快 0s、未持有无效果
  - [x] 8.6 玻璃大炮测试：hasGlassCannon 检查、遗物数据验证
  - [x] 8.7 交互测试：蜡封 + 玻璃大炮组合（首次免除不死、第二次死亡、新词重置后再免除）

## Dev Notes

### 当前系统状态（CRITICAL）

**Story 36.1 已完成的基础设施：**
- `RelicEffectType` 包含 `on_keystroke`, `on_error`, `on_word_complete` 等 13 个触发类型
- `RelicModifierType` 包含 `error_forgive`, `score_multiplier` 等 26 个修改器类型
- `RelicBehaviorType` 包含 `error_forgive_first`, `double_keystroke`, `autocomplete`, `rhythm_adapt`, `glass_cannon` 共 24 个行为类型
- `ModifierTrigger` 已同步扩展 7 个新值（on_keystroke, on_settle 等）
- `evaluateRelicCondition()` 条件评估器就绪
- `registerRelicBehavior()` / `dispatchRelicBehavior()` / `clearBehaviorHandlers()` 行为分发框架就绪
- `RELIC_MODIFIER_DEFS` 为空 — 本 Story 首次写入 modifier factory
- `RelicData` 接口支持 `subsystem?: RelicSubsystem` 和 `behaviorType?: RelicBehaviorType`

**当前 battle.ts 击键流程（关键代码位置）：**
```
handleKeyPress()  (line 233)
  ├── k === expect → playerCorrect(k)  (line 255)
  │   ├── combo++, multiplier 计算  (line 269-276)
  │   ├── 字母升级 on_correct_keystroke  (line 286-293)
  │   ├── triggerSkill(skillId, k)  (line 307)
  │   ├── state.player.index++  (line 315)
  │   └── completeWord()  (line 322) — 若词完成
  └── k !== expect → playerWrong()  (line 336)
      ├── 遗物 on_error 管道  (line 348-362)
      │   ├── onComboProtect → phoenixProtected
      │   └── onInstantFail → instantFailed (glass_cannon)
      ├── 若 phoenixProtected → return  (line 363-365)
      ├── 若 instantFailed → gameOver()  (line 368-372)
      ├── state.wordPerfect = false  (line 376)
      ├── on_combo_break 管道  (line 381-386)
      └── state.combo = 0  (line 388)
```

**completeWord() 关键行（line 405+）：**
- `wordElapsed = Math.max(0, wordStartTime - state.time)` (line 416)
- `resolveRelicEffectsWithBehaviors('on_word_complete', {...})` (line 417)
- 最终分数计算 `baseChips * finalMult` 在下方

### 关键设计决策

**1. glass_cannon ID 冲突处理：**
旧 `glass_cannon` 在 `DELETED_RELIC_IDS` 中。新版使用 `glass_cannon_v2` 作为 ID，避免存档迁移冲突。`RelicBehaviorType` 中的 `'glass_cannon'` 是行为类型名而非遗物 ID，不冲突。

**2. 蜡封与玻璃大炮执行顺序：**
蜡封检查必须在 on_error 管道之前执行。实现方式：
- 在 `playerWrong()` 最前面检查蜡封状态
- 若蜡封免除 → 直接 return（不进入 on_error 管道，glass_cannon 无机会触发）
- 若蜡封未免除/已用完 → 正常走 on_error 管道

**3. 回声指套不改 index：**
双重击键只额外 combo+1 和 triggerSkill，不推进 `state.player.index`。这保持字母输入流程不被打乱。

**4. 小助手 Tab 自动补全：**
需要在 `handleKeyPress()` 中特殊处理 Tab 键（目前 Tab 未被监听）。自动补全等同于快速执行剩余字母的 playerCorrect() 逻辑。

**5. 节奏适应 wordElapsed：**
`completeWord()` 已有 `wordElapsed` 计算（line 416）。但注意 `wordStartTime - state.time` 是因为 time 在倒数（time 越小说明过了越久），所以 wordElapsed 实际是「已用时间」。

**6. 行为文件组织：**
新建 `src/src/systems/relics/TypingRelicBehaviors.ts` 作为打字子系统行为模块。后续 Story (36.3-36.12) 各建自己的子系统行为文件。

**7. 小助手单词追踪状态：**
本关已出现单词用 `Set<string>` 追踪。存放在 battle-level state 中（关结束清空）。可以用模块级变量或 `state.player.relicStates` 的特殊 key。推荐模块级变量，因为不需要持久化。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | effects |
|---|---|---|---|---|---|---|---|
| `typing_wax_seal` | 打字蜡封 | 🕯️ | common | 50 | typing | error_forgive_first | [] |
| `echo_thimble` | 回声指套 | 🧤 | common | 50 | typing | double_keystroke | [] |
| `little_helper` | 小助手 | 🤖 | rare | 80 | typing | autocomplete | [] |
| `rhythm_adapt` | 节奏适应 | 🎵 | epic | 120 | typing | rhythm_adapt | [] |
| `glass_cannon_v2` | 玻璃大炮 | 💥 | legendary | 0 | typing | glass_cannon | [] |

注：glass_cannon_v2 的 score ×2 效果通过 `RELIC_MODIFIER_DEFS` factory 实现（不在 effects 数组中），行为型 instant_fail 通过行为分发实现。

### 依赖方向（CRITICAL）

```
data/relics.ts (遗物数据定义)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/TypingRelicBehaviors.ts (NEW — 打字子系统行为)
  ↓ 被调用
systems/battle.ts (击键处理 — 调用行为分发)
```

- `TypingRelicBehaviors.ts` 只能引用 `data/` 和 `systems/relics/` 中的模块
- 不能直接引用 `battle.ts`（battle 调用行为，行为不调用 battle）
- 行为函数通过 `PipelineContext` 和 `relicStates` 获取/设置运行时数据

### 从 Story 36.1 继承的关键经验

1. **TriggerContext 注入**: 遗物需要的运行时数据通过 PipelineContext 注入
2. **import type**: 纯类型导入必须用 `import type`
3. **浮点精度**: 测试中使用 `toBeCloseTo(expected, 1)`
4. **clearBehaviorHandlers()**: 测试 beforeEach 中调用，确保隔离
5. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji（已在数据规格中分配）
6. **JSDoc 格式**: 避免 `*/` 在注释中出现

### 性能约束

- 蜡封检查 <0.1ms（简单 relicStates 读取）
- 回声指套概率检查 <0.1ms（单次 random）
- 自动补全循环 <1ms（最长单词约 15 字母）
- 节奏适应计算 <0.1ms（简单加减）
- glass_cannon modifier 通过 pipeline 缓存计算

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData + 1 个 RELIC_MODIFIER_DEFS factory
- `src/src/systems/battle.ts` — playerWrong() 中增加蜡封检查、playerCorrect() 中增加回声检查、handleKeyPress() 中增加 Tab 处理

**需新建的文件：**
- `src/src/systems/relics/TypingRelicBehaviors.ts` — 行为注册模块
- `src/tests/unit/systems/relics/relics.typing.test.ts` — 打字遗物测试

**不需修改的文件：**
- `RelicPipeline.ts` — 已有完整的行为分发框架
- `ModifierTypes.ts` — 已有所有需要的 trigger 类型
- `relicPicker.ts` — 通用遗物自动可用

### References

- [Source: docs/design/relic-system.md#打字/输入系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.2] — 验收标准
- [Source: docs/implementation-artifacts/36-1-relic-infrastructure.md] — 前序 Story 开发记录
- [Source: src/src/systems/battle.ts#L233-L403] — 击键处理流程
- [Source: src/src/data/relics.ts] — 当前遗物数据定义
- [Source: src/src/systems/relics/RelicPipeline.ts] — 行为分发框架

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Test fix: `relics.test.ts` counts 10→15, rarity distributions updated
- Test fix: `relic.pipeline.test.ts` RELIC_MODIFIER_DEFS 0→1 entry
- Test fix: `relics.slots.test.ts` glass_cannon_v2 added to zeroPriceRelics set
- Test fix: `shopRelicSlot.test.ts` slot-full test uses placeholder IDs instead of getAllRelicIds

### Completion Notes List

1. **设计决策**: 打字蜡封/回声指套/小助手/节奏适应的核心逻辑放在 `TypingRelicBehaviors.ts` 的纯函数中，由 `battle.ts` 在合适位置调用。行为注册仅用于框架完整性。
2. **玻璃大炮执行顺序**: `playerWrong()` 中先检查蜡封 → 免除则 return → 然后检查玻璃大炮 → 最后走 on_error 管道。玻璃大炮从 on_error 管道中独立出来，确保蜡封交互正确。
3. **回声指套随机数**: 由 battle.ts 传入 `random()` (seeded random)，测试中直接传入确定值，避免 mock。
4. **Tab 键处理**: InputHandler 只接受单字符键（A-Z），Tab（length=3）被过滤。Review 修复：在 `initInput()` 中添加独立 `document.addEventListener('keydown', handleTabKey)` 监听器，含 `preventDefault()` 防止焦点切换。
5. **节奏适应 bonusMult**: 使用乘算 `bonusMult *= 1.3` 而非加算，确保与其他倍率正确组合。
6. **Task 4.5 UI 简化**: Tab 提示使用 `showFeedback('Tab ✓')` 而非在词语显示区添加复杂 UI 元素，后续可迭代增强。
7. **测试**: 33 个单元测试覆盖所有 5 个遗物的正常、边界和未持有场景，加蜡封+玻璃大炮交互测试。

### Senior Developer Review (AI)

**审查日期**: 2026-03-13
**发现**: 2 HIGH, 3 MEDIUM, 2 LOW（共 7 个）
**修复**: 所有 HIGH 和 MEDIUM 已修复

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| H1 | HIGH | InputHandler 过滤 Tab 键（e.key.length !== 1），小助手永远无法触发 | 添加独立 `handleTabKey` keydown 监听器，从 handleKeyPress 中移除死代码 Tab 检查 |
| H2 | HIGH | glass_cannon_v2 modifier 走 pipeline 只能作用于公式分，无法覆盖技能直接加分 | 移除 RELIC_MODIFIER_DEFS，改为 completeWord() 中记录 wordStartScore，结算后 `wordGain * 2` 整词翻倍 |
| M1 | MEDIUM | Tab 未 preventDefault，焦点可能切走 | handleTabKey 中添加 `e.preventDefault()` |
| M2 | MEDIUM | echo thimble combo++ 后未重算 multiplier | 添加 multiplier 重算（baseMultiplier + combo * comboBonus + skillMultBonus） |
| M3 | MEDIUM | 5 个行为注册全是 no-op | 保留：实际逻辑由 battle.ts 直接调用，注册仅为框架完整性（已有注释说明） |
| L1 | LOW | relics.test.ts 通用遗物测试位于 Class-exclusive describe 块中 | 移至新 `Universal relics` describe 块 |
| L2 | LOW | rhythm_adapt bonusMult 乘算与其他遗物加算混用 | 保留：设计决策，乘算确保与 base multiplier 正确复合 |

### File List

| File | Change | Lines |
|---|---|---|
| `src/src/data/relics.ts` | Modified — 添加 5 个 RelicData + 1 个 RELIC_MODIFIER_DEFS factory | ~80 新增 |
| `src/src/systems/relics/TypingRelicBehaviors.ts` | **New** — 打字子系统遗物行为模块 | 146 行 |
| `src/src/systems/battle.ts` | Modified — 蜡封/回声/Tab/节奏适应集成 | ~40 新增 |
| `src/tests/unit/systems/relics/relics.typing.test.ts` | **New** — 33 个打字遗物行为测试 | 255 行 |
| `src/tests/unit/systems/relics/relics.test.ts` | Modified — 更新 relic count 和 rarity 断言 | 15→5 counts |
| `src/tests/unit/systems/relics/relic.pipeline.test.ts` | Modified — RELIC_MODIFIER_DEFS 测试更新 | 工厂验证 |
| `src/tests/unit/systems/relics/relics.slots.test.ts` | Modified — zeroPriceRelics 添加 glass_cannon_v2 | 1 行 |
| `src/tests/unit/systems/shopRelicSlot.test.ts` | Modified — 槽位满测试改用占位 ID | 修复逻辑 |
