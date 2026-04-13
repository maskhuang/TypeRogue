# 图 2 — EventBus 事件清单

> 📍 **行号基线**：`file.ts:N` 基于 git commit `1b07c96`（2026-04-13）。

**意图**：列出当前 TS 端 `GameEvents` interface 所有 **51 个事件**，按命名空间分组，标记高频事件。这张表直接映射为 Godot `EventBus` autoload 的 signal 清单——**同名 = 同语义**，命名只做 `snake:colon` → `PascalCase` 的 idiom 转换。C# 端的 `EventBus.cs` 应把下表作为权威 signal 列表。

**来源**：`src/src/core/events/EventBus.ts` (`GameEvents` interface，L9-L217) + `grep -rn "eventBus.emit/on" src/src`。

**订阅方列约定**：
- 列出通过 `eventBus.on(...)` 订阅的文件
- `_无订阅方_` = grep 验证确实无人订阅（候选清理或仅作为外部观察信号保留）
- `(PixiJS 分支)` = 仅 `scenes/battle/*` 并行架构订阅，生产 DOM 战斗不走

**高频标记约定**：
- ⚠️ 键级（每次击键）— Godot 要直接走函数调用而非 signal（性能）
- 🔁 词级（每词一次）— signal 可行，但订阅者要轻量
- 其他 — 普通事件

---

## 命名空间总览（51 事件 / 20 命名空间）

| 命名空间 | 事件数 | 说明 |
|---|---|---|
| `input:*` | 3 | 键盘原始输入 |
| `word:*` | 4 | 词生命周期 |
| `skill:*` | 2 | 技能触发与升级 |
| `effect:*` | 2 | 效果队列（PixiJS 分支） |
| `battle:*` | 4 | 战斗生命周期 |
| `score:*` | 1 | 分数更新 |
| `combo:*` | 1 | 连击更新 |
| `shop:*` | 3 | 商店事件 |
| `relic:*` | 4 | 遗物事件 |
| `ritual:*` | 1 | 仪式附魔 |
| `scene:*` | 2 | 场景导航 |
| `run:*` | 3 | 整局结果 |
| `meta:*` | 8 | Meta 进度（解锁、成就、统计） |
| `audio:*` | 5 | 音频控制 |
| `tutorial:*` | 3 | 教程步骤 |
| `unlock:*` | 1 | 解锁通知 |
| `save:*` | 1 | 存档完成 |
| `achievement:*` | 1 | 成就解锁（legacy） |
| `ui:*` | 1 | UI 通知 |
| `ascension:*` | 1 | Ascension 升级 |
| **总计** | **51** | 所有事件来自 `GameEvents` interface 权威声明 |

**合计校验**：`3+4+2+2+4+1+1+3+4+1+2+3+8+5+3+1+1+1+1+1 = 51` ✓

## input:* — 键盘输入

| 事件 | payload | 发送方 | 订阅方 | 频率 |
|---|---|---|---|---|
| `input:keypress` | `{ key, timestamp }` | `systems/typing/InputHandler.ts` | `systems/battle.ts` `ui/keyboard/KeyboardVisualizer.ts` `systems/typing/WordMatcher.ts` `scenes/battle/BattleScene.ts` (PixiJS 分支) `scenes/battle/BattleFlowController.ts` (PixiJS 分支) | ⚠️ 键级 |
| `input:keyup` | `{ key, timestamp }` | `InputHandler.ts` | `systems/battle.ts`（`handleChargeRelease`）`ui/keyboard/KeyboardVisualizer.ts` | ⚠️ 键级 |
| `input:enabled` | `{ enabled }` | `InputHandler.ts`（2 处） | _无订阅方_ | 稀疏 |

**Godot 实施建议**：`input:keypress` 应**绕过 signal 走直接函数调用**。键级事件 60WPM = ~5/秒，100WPM = ~8/秒。signal 开销小但订阅者有 5 个，每次 emit 都要遍历 listener set。直接调用 `Battle.HandleKeyPress(key)` 更快。

## word:* — 词生命周期

| 事件 | payload | 发送方 | 订阅方 | 频率 |
|---|---|---|---|---|
| `word:new` | `{ word, length }` | `scenes/battle/BattleScene.ts` | `scenes/battle/BattleScene.ts` (PixiJS 分支自订阅) | 🔁 词级 |
| `word:correct` | `{ key, index }` | (多处) | `systems/audio/KeystrokeSoundController.ts` `systems/scoring/ScoreCalculator.ts` | ⚠️ 键级 |
| `word:error` | `{ key, expected }` | (多处) | `systems/audio/KeystrokeSoundController.ts` `systems/scoring/ScoreCalculator.ts` `scenes/battle/BattleFlowController.ts` (PixiJS) `scenes/battle/BattleScene.ts` (PixiJS) | 🔁 词级 |
| `word:complete` | `{ word, score, perfect }` | `systems/battle.ts:1189`（生产） + 2 处（PixiJS） | `systems/audio/KeystrokeSoundController.ts` `systems/scoring/ScoreCalculator.ts` `systems/tutorial/TutorialMode.ts` `ui/effects/ParticleController.ts` `scenes/battle/BattleFlowController.ts` (PixiJS) | 🔁 词级 |

**注意**：`word:correct` 与 `input:keypress` 在 TS 端功能重叠。`word:correct` 是"输入了正确字符"（已经过 WordMatcher），`input:keypress` 是"键盘原始按键"。Godot 端可以只保留一个级别。

## skill:* — 技能

| 事件 | payload | 发送方 | 订阅方 | 频率 |
|---|---|---|---|---|
| `skill:triggered` | `{ key, skillId, type, amplifierStacks?, growthValue?, critTriggered?, pulseTriggered?, questCompleted?, tabooNegative? }` | `systems/skills.ts` 等 | `systems/tutorial/tutorialInit.ts`（2 处监听） `systems/tutorial/TutorialMode.ts` `ui/effects/ParticleController.ts` `ui/effects/SkillFeedbackManager.ts` `ui/keyboard/KeyboardVisualizer.ts` | ⚠️ 键级 |
| `skill:upgraded` | `{ skillId, newLevel }` | (多处) | `systems/tutorial/tutorialInit.ts` | 稀疏 |

**Godot 实施建议**：`skill:triggered` 每次击键都可能触发（键位绑定了技能时 100% 触发），payload 字段多达 9 个。C# signal 建议用**结构体参数**或自定义 Variant。

## effect:* — 效果队列（PixiJS 分支）

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `effect:queued` | `{ effect, queueSize }` | `systems/skills/active/EffectQueue.ts` | `ui/effects/SkillFeedbackManager.ts` |
| `effect:dequeued` | `{ effect }` | `EffectQueue.ts`（7 处） | `ui/effects/SkillFeedbackManager.ts` |

**注意**：属于 PixiJS 并行架构，**生产不使用**。Godot 迁移时可忽略。

## battle:* — 战斗生命周期

| 事件 | payload | 发送方 | 订阅方 | 频率 |
|---|---|---|---|---|
| `battle:start` | `{ stageId }` | `systems/battle.ts:2398` `scenes/battle/BattleScene.ts` | `systems/tutorial/tutorialInit.ts` | 关级 |
| `battle:end` | `{ result, score }` | `scenes/battle/BattleScene.ts` | _无订阅方_（仅 PixiJS 分支发射） | 关级 |
| `battle:pause` | `{}` | `BattleScene.ts` `tutorial/TutorialManager.ts` | `systems/battle.ts` | 稀疏 |
| `battle:resume` | `{}` | `BattleScene.ts` `TutorialManager.ts` | `systems/battle.ts` | 稀疏 |

## score:* / combo:*

| 事件 | payload | 发送方 | 订阅方 | 频率 |
|---|---|---|---|---|
| `score:update` | `{ score, multiplier, combo }` | (多处，3 个 emit 点) | _无订阅方_（候选清理） | 🔁 词级 |
| `combo:update` | `{ combo }` | `systems/battle.ts:657` | `systems/audio/KeystrokeSoundController.ts` `ui/effects/ParticleController.ts` | ⚠️ 键级 |

## shop:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `shop:opened` | `{}` | `systems/shop.ts` | _无订阅方_ |
| `shop:purchase` | `{ itemId, type, price }` | `shop.ts`（3 处） | `systems/tutorial/tutorialInit.ts` `systems/tutorial/TutorialMode.ts` |
| `shop:skip` | `{}` | `shop.ts` | _无订阅方_ |

## relic:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `relic:effect` | `{ trigger, modifiers: { timeBonus, scoreMultiplier, goldMultiplier, comboProtectionChance, skillEffectBonus, priceDiscount, wordScoreBonus, multiplierPerCombo, goldFlat } }` | (通过 RelicPipeline) | _无订阅方_（候选清理 — relic 效果走函数返回而非事件） |
| `relic:combo_protected` | `{}` | _无发射方_（接口声明但未 emit） | _无订阅方_ |
| `relic:acquired` | `{ relicId }` | `shop.ts` 等（2 处） | `relics/ComboRelicBehaviors.ts` `relics/SkillRelicBehaviors.ts` `relics/TypingRelicBehaviors.ts` |
| `relic:removed` | `{ relicId }` | _无发射方_ | _无订阅方_ |

**Notes**：`relic:effect/combo_protected/removed` 三个事件是 Epic 5.4 时代的遗留接口声明，实际**未被使用**。Godot 端可直接省略。

## ritual:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `ritual:enchantment_applied` | `{ skillId, enchantmentType, icon, name }` | `systems/ritualEnchantment.ts` | _无订阅方_（外部观察用） |

## scene:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `scene:change` | `{ from, to, action }` | `SceneManager.ts`（4 处） | _无订阅方_（外部观察用） |
| `scene:goto_menu` | `{}` | (2 处) | _无订阅方_（等效直接调用 `SceneManager.gotoMenu()`） |

## run:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `run:start` | `{}` | (2 处) | _无订阅方_ |
| `run:victory` | `{ totalScore, totalTime, stagesCleared, maxCombo, perfectWords, skills[], relics[] }` | (Epic 5.5) | _无订阅方_（已被 `meta:check_unlocks` 取代） |
| `run:gameover` | `{ finalScore, currentStage, targetScore, skills[], relics[] }` | (Epic 5.5) | _无订阅方_（已被 `meta:check_unlocks` 取代） |

## meta:* — Meta 进度（8 事件）

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `meta:check_unlocks` | `{ runResult, runStats, cycle?, skillLevels?, enchantments?, activeModifiers?, classId?, ascensionLevel? }` | `battle.ts:2543/2589` `GameOverScene.ts` `VictoryScene.ts` | `core/state/MetaState.ts` |
| `meta:unlocks_checked` | `{ newUnlocks[], totalNewUnlocks }` | `MetaState.ts` | _无订阅方_ |
| `meta:skill_unlocked` | `{ skillId }` | `MetaState.ts` | _无订阅方_ |
| `meta:relic_unlocked` | `{ relicId }` | `MetaState.ts` | _无订阅方_ |
| `meta:class_unlocked` | `{ classId }` | `MetaState.ts` | _无订阅方_ |
| `meta:achievement_unlocked` | `{ achievement: {...} }` | `MetaState.ts` | _无订阅方_ |
| `meta:stats_updated` | `{ stats: {...} }` | `MetaState.ts` | `main.ts` |
| `meta:request_save` | `{}` | `MetaState.ts` `tutorial/TutorialManager.ts` | `main.ts` |

**Notes**：上述 6 个 `meta:*_unlocked` / `meta:unlocks_checked` 事件无订阅方，实际解锁通知走 `unlock:new`。Godot 端可能合并为单一 `MetaUnlock(targetType, targetId)` signal。

## audio:* (5 事件)

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `audio:play` | `{ sound }` | `GameOverScene.ts` `VictoryScene.ts` | _无订阅方_ |
| `audio:sfx_play` | `{ type }` | (2 处) | _无订阅方_（注：`AudioManager.ts` 不通过 `eventBus.on` 订阅，直接函数调用） |
| `audio:bgm_change` | `{ trackId }` | _无发射方_ | _无订阅方_ |
| `audio:volume_change` | `{ volumes }` | (3 处) | _无订阅方_ |
| `audio:mute_change` | `{ muted }` | _无发射方_ | _无订阅方_ |

**Notes**：`audio:*` 命名空间几乎**全部无订阅方**。`AudioManager.ts` 不走 EventBus 而是直接函数 API。Godot 端应直接实现 `AudioManager` autoload，省略这 5 个 signal。

## tutorial:*

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `tutorial:step_shown` | `{ stepId }` | `systems/tutorial/*` | _无订阅方_ |
| `tutorial:step_completed` | `{ stepId }` | `systems/tutorial/*` | `systems/tutorial/tutorialInit.ts` |
| `tutorial:time_up` | `{}` | `systems/tutorial/TutorialMode.ts` | `systems/tutorial/TutorialMode.ts`（自订阅） |

## 其他（单条命名空间）

| 事件 | payload | 发送方 | 订阅方 |
|---|---|---|---|
| `unlock:new` | `{ definition, type, targetId, name, description }` | `core/unlock/*` | `ui/notifications/UnlockNotification.ts` |
| `save:complete` | `{ success }` | (2 处) | _无订阅方_ |
| `achievement:unlock` | `{ achievementId }` | _无发射方_ | _无订阅方_（legacy，已被 `meta:achievement_unlocked` 取代） |
| `ui:show_notification` | `{ category, title, message, icon, duration }` | _无发射方_ | _无订阅方_（接口预留，未使用） |
| `ascension:advanced` | `{ classId, newLevel }` | `core/state/MetaState.ts` | `systems/battle.ts` |

---

## 订阅方清单总结

**有实际订阅方的事件（22 个）**：
- `input:keypress` `input:keyup` `word:correct` `word:error` `word:new` `word:complete` `skill:triggered` `skill:upgraded` `effect:queued` `effect:dequeued` `battle:start` `battle:pause` `battle:resume` `combo:update` `shop:purchase` `relic:acquired` `meta:check_unlocks` `meta:stats_updated` `meta:request_save` `tutorial:step_completed` `tutorial:time_up` `unlock:new` `ascension:advanced`

**无订阅方的事件（28 个候选清理）**：
- `input:enabled` `battle:end` `score:update` `scene:change` `scene:goto_menu` `shop:opened` `shop:skip` `relic:effect` `relic:combo_protected` `relic:removed` `ritual:enchantment_applied` `run:start` `run:victory` `run:gameover` `meta:unlocks_checked` `meta:skill_unlocked` `meta:relic_unlocked` `meta:class_unlocked` `meta:achievement_unlocked` `audio:play` `audio:sfx_play` `audio:bgm_change` `audio:volume_change` `audio:mute_change` `tutorial:step_shown` `save:complete` `achievement:unlock` `ui:show_notification`

**Godot 迁移建议**：无订阅方的 28 个事件在 Godot 端**无需**声明为 signal，除非（1）有外部调试工具/埋点需要观察，或（2）为后续解耦预留。推荐直接走函数调用（`MetaState.CheckUnlocks(...)`、`SaveSystem.Save(...)` 等）。

---

## Godot 端映射规则

### 命名转换
- 冒号分隔的 TS 事件名 → PascalCase signal 名
- 例：`word:complete` → `WordCompleted`
- 例：`meta:check_unlocks` → `MetaCheckUnlocks`
- 例：`skill:triggered` → `SkillTriggered`

### 实施模板（示意）

```csharp
// godot/scripts/core/EventBus.cs
using Godot;

public partial class EventBus : Node
{
    // input:* — ⚠️ 键级，通常不走 signal（见下面 Notes）
    [Signal] public delegate void InputKeypressEventHandler(string key, long timestamp);

    // word:*
    [Signal] public delegate void WordNewEventHandler(string word, int length);
    [Signal] public delegate void WordCompletedEventHandler(string word, int score, bool perfect);
    [Signal] public delegate void WordErrorEventHandler(string key, string expected);

    // skill:*
    [Signal] public delegate void SkillTriggeredEventHandler(SkillTriggerArgs args);
    // SkillTriggerArgs 为 RefCounted 封装 9 个 payload 字段

    // battle:*
    [Signal] public delegate void BattleStartEventHandler(int stageId);
    [Signal] public delegate void BattlePauseEventHandler();
    [Signal] public delegate void BattleResumeEventHandler();
    // battle:end 省略（无订阅方）

    // ... 其余按「有订阅方的 22 个事件」逐个声明
}
```

### 性能注意点
- ⚠️ 键级事件 `input:keypress` / `word:correct` / `combo:update` / `skill:triggered` 在高速打字下可能 8-10 次/秒。Godot C# signal 开销可接受但订阅者要避免闭包分配；优先**直接函数调用**。
- 🔁 词级事件绑定的订阅者较多（尤其 `word:complete`），可以走 signal 但每个订阅者要避免重分配。
- 其他事件低频，signal 开销可忽略。

## 相关文档

- [README.md](README.md) — 索引
- [01-battle-state-machine.md](01-battle-state-machine.md) — 事件触发的状态转移
- [03-resolution-pipeline.md](03-resolution-pipeline.md) — `word:complete` 的内部 12 阶段
- [04-save-schema.md](04-save-schema.md) — `meta:*` / `save:*` 相关的持久化字段
