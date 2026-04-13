# 图 4 — 存档字段表

> 📍 **行号基线**：`file.ts:N` 基于 git commit `1b07c96`（2026-04-13）。

**意图**：枚举当前 TS 端所有需要持久化或跨关保留的字段，按**持久化范围**（跨局 meta / 单局 run / 单场 battle / 设置）分类。这张表直接映射为 Godot 端 `SaveData.cs` Resource 类的字段清单。C# 端实现时把每个 Run 写成一个自定义 `Resource`，用 `ResourceSaver.Save("user://save.tres", saveData)` 持久化。

**来源**：`core/state.ts` 单例 + `core/state/{Battle,Run,Meta}State.ts` + `core/UserSettings.ts` + 各 `relics/*Behaviors.ts` 分散的持久化字段。

---

## 持久化范围对照

| 范围 | 持有者（TS） | 持久化方式 | 生命周期 | Godot 映射 |
|---|---|---|---|---|
| **设置** | `UserSettings.ts` (`current: UserSettingsData`) | `localStorage` (key: `typing_roguelike_settings`) | 永久 | `user://settings.cfg` (`ConfigFile`) |
| **Meta 进度（跨局）** | `MetaState` 类 | 通过 `SaveManager` + IPC → `main/save.ts` atomic write (Electron) / `localStorage` (Web) | 永久 | `user://meta.tres` (Resource) |
| **Run 状态（单局、跨关）** | `RunState` 类 + `state` 单例部分字段 | 同上（中断续存） | 单局游戏（开始 → victory/gameover） | `user://run.tres` (Resource) |
| **Battle 状态（单场）** | `BattleState` 类 + `state` 单例部分字段 | **纯内存** | 单场战斗（stage 开始 → 结束） | 不持久化，内存结构 |
| **Boss 修饰器临时状态** | `bossModifiers.ts` 模块级变量 | 纯内存 | 单场或持续到关卡结束 | 内存结构 |
| **遗物行为临时状态** | `relics/*Behaviors.ts` 模块级变量 + `state.player.relicStates` | 部分进 RunState.serialize | 混合 | 需逐个考察 |

---

## 设置字段（localStorage）

**文件**：`src/src/core/UserSettings.ts:8`

```typescript
export interface UserSettingsData {
  masterVolume: number   // 0-1, 默认 0.7
  crtEnabled: boolean    // 默认 true
  locale: string         // 'zh' | 'en'，默认 'zh'
}
```

**加载**：`loadSettings()` — 从 `localStorage` 读，缺失字段用 `DEFAULTS` 填充
**保存**：`saveSettings()` — 全量 JSON 写回

**Godot 映射**：`user://settings.cfg`
```csharp
// godot/scripts/core/SettingsManager.cs
public partial class SettingsManager : Node {
    public float MasterVolume { get; set; } = 0.7f;
    public bool CrtEnabled { get; set; } = true;
    public string Locale { get; set; } = "zh";
    // 用 ConfigFile 读写 user://settings.cfg
}
```

---

## Meta 字段（跨局，`MetaState`）

**文件**：`src/src/core/state/MetaState.ts` (737 行)

### MetaStats（总览统计）

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalRuns` | number | 总局数 |
| `victories` | number | 胜利局数 |
| `highestScore` | number | 最高分 |
| `totalPlayTime` | number | 总游戏时间（毫秒） |
| `totalKeystrokes` | number | 总击键数 |
| `totalWordsCompleted` | number | 总完成词语数 |
| `longestCombo` | number | 历史最高连击 |
| `perfectRunCount` | number | 完美通关次数（无失败关卡） |

### Achievement（成就）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 成就 ID |
| `name` | string | 展示名称 |
| `progress` | number | 当前进度值 |
| `target` | number | 目标值 |
| `unlocked` | boolean | 是否已解锁 |
| `unlockedAt?` | number | 解锁时间戳（毫秒） |

### BuildSummary（构筑摘要）

| 字段 | 类型 | 说明 |
|---|---|---|
| `skills[]` | `{ id, level, name? }[]` | 技能列表 |
| `enchantments[]` | `{ skillId, enchantmentId }[]` | 附魔列表 |
| `relics[]` | string[] | 遗物 ID 列表 |
| `activeModifiers[]` | string[] | 活跃 boss 修饰器 |

### LeaderboardEntry（排行榜）

| 字段 | 类型 | 说明 |
|---|---|---|
| `cycle` | number | 最终周目数 |
| `score` | number | Run 总分数 |
| `date` | string | ISO 日期字符串 |
| `result` | `'victory' \| 'gameover'` | 结果类型 |
| `buildSummary` | BuildSummary | 构筑摘要 |
| `seed?` | number | 每日挑战种子（仅 daily 模式） |

### 其他 Meta 字段

- **解锁表**：`unlockedSkills`, `unlockedRelics`, `unlockedClasses`, `unlockedEnchantments`
- **Ascension 进度**：每职业的 ascension 等级
- **教程进度**：已完成的教程步骤 ID 列表
- **版本号**：`MetaState` serialization version **= 6**（反序列化时用于版本迁移）

---

## Run 字段（单局，`RunState`）

**文件**：`src/src/core/state/RunState.ts` (674 行)

### RunStats（本局战斗统计）

| 字段 | 类型 | 说明 |
|---|---|---|
| `totalScore` | number | 本局累计得分 |
| `maxCombo` | number | 本局最大连击 |
| `wordsCompleted` | number | 本局完成词数 |
| `battlesWon` | number | 本局已胜利的战斗数 |
| `startTime` | number | 本局开始时间戳 |

### BossModifierAssignment（修饰器分配）

| 字段 | 类型 | 说明 |
|---|---|---|
| `stageId` | number | 关卡号 |
| `modifierId` | string | 修饰器 ID |

### RunStateData（核心 Run 字段）

| 字段 | 类型 | 说明 | 跨关 |
|---|---|---|---|
| `skills` | `SkillInstance[]` | 当前持有技能 | ✓ |
| `bindings` | `Map<string, string>` | 键位绑定 (key → skillId) | ✓ |
| `relics` | `string[]` | 遗物 ID 列表 | ✓ |
| `gold` | number | 金币 | ✓ |
| `currentStage` | number | 当前关卡号 | ✓ |
| `isActive` | boolean | 本局是否进行中 | ✓ |
| `stats` | RunStats | 本局统计 | ✓ |
| `bossModifierPool` | string[] | 本局 boss 修饰器备选池 | ✓ |
| `usedBossModifiers` | string[] | 本 Run 已用修饰器（Story 42.6） | ✓ |
| `bossModifierAssignment` | BossModifierAssignment[] | 修饰器分配表 | ✓ |
| `cycle` | number | 当前周目 | ✓ |
| `activeModifiers` | string[] | 活跃修饰器 ID | ✓ |
| `relicStates` | `Record<string, number>` | 遗物行为状态（数值） | ✓ |
| `classId` | ClassId | 当前职业 | ✓ |
| `fragmentInventory` | `Record<string, number>` | 字母碎片库存 | ✓（造词师） |
| `fragmentQueue` | string[] | 碎片采集队列 | ✓（造词师） |
| `fragmentQueuePosition` | number | 队列位置 | ✓（造词师） |
| `craftedWords` | string[] | 已合成词 | ✓（造词师） |
| `assemblyQueue` | AssemblyPipeline[] | 组装流水线 | ✓（造词师） |
| `mutagenInventory` | number | 变异素库存 | ✓（蜕变师） |
| `evolvedSkills` | `Map<string, string>` | 进化技能映射 | ✓（蜕变师） |
| `seenSkillTypes` | `Set<string>` | 本 Run 已见技能类型 | ✓ |
| `wordDeck` | string[] | 当前词库 | ✓ |
| `affixSkills` | `Map<string, AffixSkillInstance>` | 词条制技能实例 | ✓ |
| `affixSkillStates` | `Map<string, SkillRuntimeState>` | 技能运行时状态（叠层/蓄力/质变计数等） | ✓ |
| `mutationACounts` | `Map<string, number>` | 变异 A 计数 | ✓ |
| `collectedWords` | `Set<string>` | 已收集词（词集词典遗物） | ✓ |
| `wordEffects` | `Map<string, WordEffect>` | 传说词包效果 | ✓ |
| `overflowScore` | number | 溢出分数 | ✓ |
| `calibratedTargetBase` | number | 校准目标基数 | ✓ |
| `eliteModifier` | string \| null | 精英修饰器 | ✓ |

### 序列化注意点

**文件**：`RunState.serialize()` / `RunState.deserialize()`

- `Map` / `Set` → 序列化时转 `plain object` / `string[]`
- `affixSkills` 通过 `serializeSkill()` 处理（定义在 `data/affixes.ts`）
- **反序列化时过滤**：
  - `DELETED_SKILL_IDS`（Story 57.1 已抽到 `skills.json`）— 丢弃已删除技能 ID
  - `DELETED_RELIC_IDS`（Story 57.1 已抽到 `relics.json`）— 丢弃已删除遗物 ID
- MetaState serialization version **= 6**；遇到低版本触发迁移钩子

---

## Battle 字段（单场，`BattleState` + `state` 单例）

**内存结构，不持久化**。但 Godot 端要实现相同字段以保证行为等价。

### `state` 单例（`core/state.ts:createInitialState()`）

**顶层字段（GameState）**：

| 字段 | 类型 | 说明 | 初始值 |
|---|---|---|---|
| `classId` | ClassId | 当前职业 | `'none'` |
| `level` | number | 当前关卡号 | 1 |
| `phase` | GamePhase | 场景 phase（图 1a） | `'battle'` |
| `time` | number | 剩余时间（秒） | `BALANCE.TIME_PER_LEVEL` |
| `timeMax` | number | 本关总时间 | `BALANCE.TIME_PER_LEVEL` |
| `score` | number | 当前关累计分 | 0 |
| `targetScore` | number | 目标分 | 100 |
| `combo` | number | 连击数 | 0 |
| `maxCombo` | number | 本关最大连击 | 0 |
| `multiplier` | number | 当前倍率 | `BALANCE.BASE_MULTIPLIER` |
| `wordScore` | number | 当前词累计分 | 0 |
| `gold` | number | 金币 | 0 |
| `wordPerfect` | boolean | 当前词是否无错 | true |
| `lastMilestone` | number | 最近里程碑 | 0 |
| `overkill` | number | 过杀量 | 0 |
| `overflowScore` | number | 溢出分 | 0 |
| `lastOverflowRatio` | number | 上次溢出比率 | 0 |
| `calibratedTargetBase` | number | 校准基数 | 0 |
| `ascensionLevel` | number | Ascension 等级 | 0 |
| `ascensionInitialModifier` | string \| null | 起始修饰器 | null |
| `classResourceProduced` | `Record<string, number>` | 职业资源产出统计 | `{}` |
| `fragmentInventory` | `Record<'a'-'z', number>` | 字母碎片 | 全 0 |
| `fragmentQueue` | string[] | 碎片队列 | `['_','_','_','_','_','_']` |
| `fragmentQueuePosition` | number | 队列位置 | 0 |
| `craftedWords` | string[] | 已合成词 | `[]` |
| `assemblyQueue` | AssemblyPipeline[] | 组装流水线 | `[]` |
| `mutagenInventory` | number | 变异素 | 0 |
| `affixSkills` | `Map<string, AffixSkillInstance>` | 技能实例 | 空 Map |
| `affixSkillStates` | `Map<string, SkillRuntimeState>` | 技能运行时状态 | 空 Map |
| `ligatureStageCounts` | `Map<string, number>` | Ligature 本关按键计数 | 空 Map |
| `mutationACounts` | `Map<string, number>` | 变异 A 计数 | 空 Map |
| `wordEffects` | `Map<string, WordEffect>` | 词语效果 | 空 Map |
| `isTutorial` | boolean | 教程模式 | false |
| `endlessUnlocked` | boolean | 无尽模式解锁 | false |
| `resources` | `{ base, score, multiplier, time, gold, energy, mutagen }` | 资源池 | `{ 0, 0, 1.0, time, 0, 0, 0 }` |
| `cycle` | number | 当前周目 | 1 |
| `activeModifiers` | string[] | 活跃修饰器 | `[]` |
| `bossModifierPool` | string[] | 修饰器池 | `[]` |
| `usedBossModifiers` | string[] | 已用修饰器 | `[]` |
| `eliteModifier` | string \| null | 精英修饰器 | null |
| `usedRestEvents` | string[] | 已用休息事件 | `[]` |
| `tempBuffs` | `TempBuff[]` | 临时 buff | `[]` |
| `sealedKeys` | string[] | 封印键位 | `[]` |
| `pseudoInfiniteState` | `{...} \| null` | 伪无限状态 | null |
| `seenSkillTypes` | `Set<string>` | 已见技能类型 | 空 Set |
| `gameMode` | `'normal' \| 'daily'` | 游戏模式 | `'normal'` |
| `dailySeed` | number \| null | 每日种子 | null |
| `battleStats` | BattleStats \| null | 战后统计 | null |

**嵌套 `state.player` 字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `word` | string | 当前词 |
| `index` | number | 当前输入位置 |
| `bindings` | `Map<string, string>` | 键位→技能 ID |
| `skills` | `Map<string, SkillData>` | 技能数据 Map |
| `relics` | `Set<string>` | 遗物 ID 集合 |
| `relicStates` | `Record<string, number>` | 遗物数值状态 |
| `wordDeck` | string[] | 词库 |
| `baseMultiplier` | number | 基础倍率 |
| `comboBonus` | number | 连击加成 |
| `wordBonus` | number | 词加成 |
| `timeBonus` | number | 时间加成 |
| `evolvedSkills` | `Map<string, string>` | 进化映射 |
| `collectedWords` | `Set<string>` | 已收集词 |

**嵌套 `state.shop` 字段**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `items` | `ShopItem[]` | 商店物品 |
| `refreshCount` | number | 刷新次数 |

**重要 Proxy**：`state.resources.multiplier` 和 `state.resources.time` 通过 `Object.defineProperty` 映射到 `state.multiplier` 和 `state.time`。Godot 端用属性 getter/setter 或直接维护单一字段。

### `synergy` 全局（`core/state.ts:createSynergyState()`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `wordSkillCount` | number | 本词触发技能数 |
| `lastTriggeredSkillId` | string \| null | 最后触发的技能 ID |
| `skillBaseScore` | number | 技能产出的基础分累积 |
| `skillMultBonus` | number | 技能产出的倍率加成 |
| `letterBaseScore` | number | 字母效果产出的基础分累积 |

**重要**：这些字段每词结算时被读取（见图 3 Phase 1），每词完成后需要清零（`resetResources()`）。

### `BattleState`（OOP 类，PixiJS 分支使用）

**生产战斗不使用** — 这是并行 PixiJS 架构的状态类。Godot 端只需参考字段定义，不需要实现双层状态。

| 字段 | 类型 |
|---|---|
| `phase` | `BattlePhase` |
| `currentWord` | string |
| `typedChars` | string |
| `wordIndex` | number |
| `score` | number |
| `multiplier` | number |
| `combo` | number |
| `maxCombo` | number |
| `timeRemaining` | number |
| `totalTime` | number |
| `wordsCompleted` | number |
| `errorCount` | number |

---

## Boss 修饰器模块内部状态

**文件**：`src/src/data/bossModifiers.ts`

这些是模块级 `let` 变量，不在 `state` 里，**但每关结束必须 reset**：

| 变量 | 类型 | 作用修饰器 | 说明 |
|---|---|---|---|
| `_diminishCount` | number | boss_diminish | 递减收益计数 |
| `_escalateStacks` | number | boss_escalation | 失控加速层数 |
| `_frostRemaining` | number | boss_frostbite | 寒霜冻结剩余 |
| `_frostErrorCount` | number | boss_frostbite | 本关错误次数 |
| `_mirrorPhase` | `'first_run'\|'mirror_run'\|'done'` | boss_mirror | 镜像阶段 |
| `_mirrorFirstRunTime` | number | boss_mirror | 首次通关时间 |
| `_mirrorCountdown` | number | boss_mirror | 倒计时 |
| `_isDecoyWord` | boolean | boss_decoy | 当前词是否伪词 |
| `_decoyOriginals` | `Map<number, string>` | boss_decoy | 伪词字符原形 |
| `_decoyRecognized` | boolean | boss_decoy | 是否已识破 |
| `_activeParams` | BossModifierParams \| null | (所有) | 当前活跃参数合并 |
| `_relicGarbleActive` | boolean | relic_garble | 遗物触发乱码 |

**Godot 映射**：全部进 `BossModifierEngine.cs` 的私有字段，`Reset()` 方法在 stage 切换时调用。

---

## Relic Behaviors 模块内部状态

**文件**：`src/src/systems/relics/*Behaviors.ts` (11 个子系统)

每个 Behavior 文件可能有自己的模块级 `let` 变量。部分会序列化到 `state.player.relicStates: Record<string, number>`，部分不序列化（纯内存、单场战斗）。

**示例**（从 project-context.md 和代码勘察）：
- `ComboRelicBehaviors.ts`：combo buffer 计数器、multiplier prism 激活状态
- `TypingRelicBehaviors.ts`：wax seal 状态、glass cannon 延迟定时器
- `ScoringRelicBehaviors.ts`：base shield 触发计数、snowball wordIndex、black hole 累积池
- `StageRelicBehaviors.ts`：bounty active state、phoenix consumed flag
- `BossModifierRelicBehaviors.ts`：chaos roulette 状态、shield 延迟队列

**Godot 映射策略**：
1. 逐文件遍历找模块级 `let` 变量
2. 每类 Behavior 在 Godot 端实现为 `static class` 或 autoload 单例
3. 战斗相关的内部状态在 `battle:start` signal 时 reset
4. 跨关持久化的状态（如 `bounty active`）进 RunState

**详细清单建议**：57.7-d (Relics 迁移) 子 Story 实施时逐文件补充本表。本 Story 不做穷举。

---

## Godot `SaveData.cs` 实施建议

```csharp
// godot/scripts/core/SaveData.cs
using Godot;

// 1. Meta 存档（跨局）
[GlobalClass]
public partial class MetaSaveData : Resource {
    [Export] public int Version { get; set; } = 6;  // 保持 TS 端版本号
    [Export] public MetaStats Stats { get; set; } = new();
    [Export] public Godot.Collections.Array<Achievement> Achievements { get; set; } = new();
    [Export] public Godot.Collections.Array<LeaderboardEntry> Leaderboard { get; set; } = new();
    [Export] public Godot.Collections.Array<string> UnlockedSkills { get; set; } = new();
    [Export] public Godot.Collections.Array<string> UnlockedRelics { get; set; } = new();
    // ... (参考 Meta 字段段)
}

// 2. Run 存档（单局，中断续存）
[GlobalClass]
public partial class RunSaveData : Resource {
    [Export] public string ClassId { get; set; } = "none";
    [Export] public int CurrentStage { get; set; } = 1;
    [Export] public int Cycle { get; set; } = 1;
    [Export] public int Gold { get; set; } = 0;
    [Export] public Godot.Collections.Array<string> Relics { get; set; } = new();
    [Export] public Godot.Collections.Dictionary AffixSkills { get; set; } = new();
    // ... (参考 Run 字段段)
}

// 3. 加载 / 保存
public static class SaveSystem {
    public static void SaveMeta(MetaSaveData data) {
        ResourceSaver.Save(data, "user://meta.tres");
    }
    public static MetaSaveData LoadMeta() {
        return ResourceLoader.Load<MetaSaveData>("user://meta.tres") ?? new MetaSaveData();
    }
    // 同理 Run
}
```

**迁移钩子**：若 `Version < 6` 则跑迁移函数；若 `Version > 6` 则警告版本过高。

---

## Notes（发现但不修）

- **双层状态架构遗留**：TS 端有 `state` 单例（操作源）和 `BattleState` OOP 类（PixiJS 序列化），但生产 DOM 战斗**只用 `state` 单例**。Godot 端只需要实现**单一**状态层（等价于 `state` 单例的字段集）。`BattleState` 可完全忽略。
- **`fragmentQueue` 的 `'_'` 占位符**：造词师字母采集队列用字符串 `'_'` 表示空槽位，Godot 端可用 `null` 或常量字符串，语义相同。
- **`resources.multiplier/time` 的 Proxy**：TS 端用 `Object.defineProperty` 同步 `state.multiplier` ↔ `resources.multiplier`。Godot 端统一字段即可，无需实现 Proxy。
- **Boss 修饰器模块级变量未文档化**：在 `bossModifiers.ts` 散落 10+ 个 `let _xxx`，没有统一 reset 入口。迁移时要统一走 `BossModifierEngine.Reset()`。

## 相关文档

- [README.md](README.md) — 索引
- [01-battle-state-machine.md](01-battle-state-machine.md) — 每个逻辑状态读写的字段交叉表
- [02-event-bus.md](02-event-bus.md) — `meta:*` / `save:*` / `scene:*` 相关事件
- [03-resolution-pipeline.md](03-resolution-pipeline.md) — 结算管线读取/写入的字段（Phase 1 读 `synergy`，Phase 10 写 `state.score` 等）
- [data-sync.md](data-sync.md) — Story 57.1 静态数据规则（存档反序列化依赖 `DELETED_*_IDS`）
