# Epic 38: 职业进阶系统（替换无尽模式）

## 背景

当前游戏有全局「无尽模式」：三职业均通关后解锁，允许 cycle 3+ 无限循环。问题：
1. 无尽模式是全局解锁，与职业系统割裂
2. 通关条件单一，缺少持续追求目标
3. cycle 内的难度曲线固定，缺少可选难度层

## 目标

1. 移除全局无尽模式，改为**每职业独立的进阶等级**
2. **保留多 cycle 结构**（3 cycle / 局），进阶等级作为 cycle 基础偏移
3. 进阶等级决定基础难度，复用无尽模式的数值成长公式
4. 通关进阶 N → 解锁进阶 N+1，为每个职业提供持续挑战

## 设计

### 进阶等级与效果

类似 StS 的 Ascension 系统：每个进阶等级添加一条固定效果，**累积生效**（进阶 N 同时拥有 1~N 的所有效果）。

| 进阶 | 效果 | 说明 |
|------|------|------|
| 1 | 目标分数 ×1.25 | 基础数值压力 |
| 2 | 时间上限 ×0.9 | 每关少 10% 时间 |
| 3 | 精英关使用完整 Boss 参数（不再减半） | elite 不再是弱化版 boss |
| 4 | 商店物价 +25% | 经济压力 |
| 5 | 起始词库 -2 个词 | 开局更弱 |
| 6 | 休息关恢复时间减半 | 续航压力 |
| 7 | 目标分数 ×1.25（再次，累计 ×1.5625） | 进一步提高分数要求 |
| 8 | Boss 修饰器旋转周期 15s → 12s | boss 节奏更紧 |
| 9 | 时间上限 ×0.9（再次，累计 ×0.81） | |
| 10 | cycle 间不再提供遗物选择 | 构建资源更少 |
| 11 | 目标分数 ×1.25（累计 ×1.953） | |
| 12 | Boss 关额外 +1 个同时生效的修饰器 | |
| 13 | 时间上限 ×0.9（累计 ×0.729） | |
| 14 | 商店物价 +25%（累计 +50%） | |
| 15 | 精英关额外 +1 个修饰器 | 终极挑战 |

效果实现方式：查询 `state.advancement >= N` 来决定是否启用对应规则。

### 进阶难度常量

```typescript
export interface AdvancementRule {
  level: number;
  id: string;         // 唯一标识，用于代码中判断
  description: string;
}

export const ADVANCEMENT_RULES: AdvancementRule[] = [
  { level: 1,  id: 'target_score_1',    description: '目标分数 ×1.25' },
  { level: 2,  id: 'time_decay_1',      description: '时间上限 ×0.9' },
  { level: 3,  id: 'elite_full_params', description: '精英关使用完整参数' },
  { level: 4,  id: 'price_up_1',        description: '商店物价 +25%' },
  { level: 5,  id: 'fewer_starter',     description: '起始词库 -2' },
  { level: 6,  id: 'rest_nerf',         description: '休息关恢复减半' },
  { level: 7,  id: 'target_score_2',    description: '目标分数 ×1.25' },
  { level: 8,  id: 'boss_rotation',     description: 'Boss 旋转加速' },
  { level: 9,  id: 'time_decay_2',      description: '时间上限 ×0.9' },
  { level: 10, id: 'no_cycle_relic',    description: 'Cycle 间无遗物' },
  { level: 11, id: 'target_score_3',    description: '目标分数 ×1.25' },
  { level: 12, id: 'boss_extra_mod',    description: 'Boss +1 修饰器' },
  { level: 13, id: 'time_decay_3',      description: '时间上限 ×0.9' },
  { level: 14, id: 'price_up_2',        description: '商店物价 +25%' },
  { level: 15, id: 'elite_extra_mod',   description: '精英 +1 修饰器' },
];
```

### 辅助查询函数

```typescript
/** 进阶 N 的目标分数乘数 */
function getAdvTargetMult(adv: number): number {
  let m = 1;
  if (adv >= 1)  m *= 1.25;
  if (adv >= 7)  m *= 1.25;
  if (adv >= 11) m *= 1.25;
  return m;
}

/** 进阶 N 的时间衰减乘数 */
function getAdvTimeMult(adv: number): number {
  let m = 1;
  if (adv >= 2)  m *= 0.9;
  if (adv >= 9)  m *= 0.9;
  if (adv >= 13) m *= 0.9;
  return m;
}

/** 进阶 N 的物价乘数 */
function getAdvPriceMult(adv: number): number {
  let m = 1;
  if (adv >= 4)  m *= 1.25;
  if (adv >= 14) m *= 1.25;
  return m;
}
```

### 一局流程变更

**旧流程：**
```
cycle 1 → cycle 2 → cycle 3 → victory / (endless → cycle 4+)
```

**新流程：**
```
选择职业 → 选择进阶等级 → cycle 1 → cycle 2 → cycle 3 → victory
```

- 保留 3 cycle 结构，每 cycle 10 节点，cycle 3 boss 胜利 = `victory()`
- 保留 `advanceCycle()`、`state.cycle`
- 移除 `state.endlessUnlocked`，cycle 3 后始终 victory（不再有 cycle 4+）
- 新增 `state.advancement`（本局选择的进阶等级）
- 难度公式中 cycle 改为 `advancement + cycle`

### MetaState 变更

```typescript
// 移除
unlockedModes: Set<string>      // 'endless' 不再需要

// 新增
classAdvancement: Record<ClassId, number>
// 记录每职业已通关的最高进阶等级
// 通关进阶 N → classAdvancement[classId] = max(current, N)
// 可选的进阶等级 = 0 ~ classAdvancement[classId] + 1
```

### UI 变更

**职业选择界面：**
- 选择职业后，显示进阶等级选择
- 每个等级显示：本级新增效果 + 已累积效果摘要
- 已通关等级标记 ✓，未解锁等级显示锁

**战斗 HUD：**
- 保留 `🔄 Cycle N` 前缀
- 进阶 1+ 时额外显示 `⚔️ 进阶 N`

**胜利界面：**
- 移除「解锁无尽模式」提示
- 显示「进阶 N 通关！解锁进阶 N+1」

**排行榜：**
- `cycle` 字段改为 `advancement`
- 排序：advancement (desc) → score (desc) → date (desc)

## Story 清单

### Story 1: MetaState 进阶追踪

**MetaState 新增 classAdvancement 字段，移除 unlockedModes。**

修改文件：`core/state/MetaState.ts`, `core/types.ts`

- 新增 `classAdvancement: Record<ClassId, number>`，默认 `{ none: 0, wordsmith: 0, metamorph: 0 }`
- `addClassAdvancement(classId, level)`: 记录通关的进阶等级
- `getMaxAdvancement(classId)`: 返回该职业最高已通关进阶
- `getSelectableAdvancements(classId)`: 返回 `0 ~ maxAdvancement + 1`
- 移除 `unlockMode('endless')`、`isModeUnlocked('endless')` 相关逻辑
- `checkProgressionUnlocks()` 中移除无尽模式解锁条件
- 序列化版本升级（version 6），迁移旧数据：
  - `victoriedClasses` 中的职业 → `classAdvancement[classId] = 0`（已通关进阶 0）
  - `unlockedModes` 丢弃

### Story 2: GameState 新增 advancement + 进阶规则数据

**新增 state.advancement，定义 ADVANCEMENT_RULES，实现查询函数。**

修改文件：`core/state.ts`, `core/types.ts`, 新建 `data/advancement.ts`

- `GameState` 新增 `advancement: number`（默认 0）
- 保留 `state.cycle`（运行时 1→2→3）
- 移除 `state.endlessUnlocked`
- 新建 `data/advancement.ts`：
  - `ADVANCEMENT_RULES` 常量数组（15 条规则）
  - `getAdvTargetMult(adv)` → 目标分数乘数
  - `getAdvTimeMult(adv)` → 时间衰减乘数
  - `getAdvPriceMult(adv)` → 物价乘数
  - `isAdvActive(adv, ruleId)` → 某规则是否生效
- `calculateTargetScore` 调用处乘以 `getAdvTargetMult(state.advancement)`
- `getCycleTimeLimit` 调用处乘以 `getAdvTimeMult(state.advancement)`
- `createInitialState()` 中新增 `advancement: 0`

### Story 3: Boss 胜利流程简化

**cycle 3 boss 胜利后始终 victory()，移除 endless 分支。**

修改文件：`systems/battle.ts`

- 原逻辑：
  ```typescript
  if (state.cycle < 3 || state.endlessUnlocked) {
    advanceCycle(); // cycle 1-2 继续 / endless 继续
  } else {
    victory(); // cycle 3 且无 endless
  }
  ```
- 新逻辑：
  ```typescript
  if (state.cycle < 3) {
    advanceCycle(); // cycle 1-2 照常推进
    showBossModifierPicker(...); // 玩家选择永久修饰器
  } else {
    victory(); // cycle 3 boss 胜利 = 通关
  }
  ```
- 移除 `state.endlessUnlocked` 判断
- 保留 `advanceCycle()`，保留 cycle 1-2 后的 boss 修饰器选择
- cycle 3 boss 后直接 victory，不再有 cycle 4+

### Story 4: 进阶规则接入各系统

**将进阶规则效果接入目标分数、时间、商店、精英、Boss、休息关、词库等系统。**

修改文件：`systems/battle.ts`, `systems/shop.ts`, `systems/stage/stageFlow.ts`, `data/bossModifiers.ts`

接入点：

| 规则 ID | 接入位置 | 实现方式 |
|---------|---------|---------|
| `target_score_*` | `startLevel()` 中 `calculateTargetScore` 后 | `×= getAdvTargetMult(adv)` |
| `time_decay_*` | `startLevel()` 中 `getCycleTimeLimit` 后 | `×= getAdvTimeMult(adv)` |
| `elite_full_params` | `bossModifiers.ts` 精英参数选择 | `adv >= 3 ? bossParams : eliteParams` |
| `price_up_*` | `shop.ts` 价格计算 | `×= getAdvPriceMult(adv)` |
| `fewer_starter` | `main.ts` 起始词库 | `adv >= 5 ? starterWords.slice(2) : starterWords` |
| `rest_nerf` | 休息关恢复逻辑 | `adv >= 6 ? bonus / 2 : bonus` |
| `boss_rotation` | `bossModifierEngine.ts` 旋转周期 | `adv >= 8 ? 12000 : 20000` |
| `no_cycle_relic` | `battle.ts` cycle 推进后 | `adv >= 10 ? skip : showRelicPicker` |
| `boss_extra_mod` | Boss 关修饰器加载 | `adv >= 12 ? 同时 2 个 : 旋转` |
| `elite_extra_mod` | 精英关修饰器加载 | `adv >= 15 ? 2 个 : 1 个` |

### Story 5: 进阶选择 UI

**职业选择后显示进阶等级选择界面。**

修改文件：`systems/classes/ClassPicker.ts`（或新建 `AdvancementPicker.ts`）

- 选择职业确认后 → 弹出进阶选择面板
- 显示可选等级列表（0 ~ maxAdvancement + 1）
- 每项显示：
  - 等级编号 + 本级新增效果描述（如「进阶 3：精英关使用完整参数」）
  - 已通关标记 ✓
  - 未解锁等级灰显 + 锁图标
- 选中后右侧/下方显示累积效果摘要（所有 ≤ 选中等级的效果列表）
- 选择后设置 `state.advancement = selectedLevel`
- 仅有进阶 0 可选时跳过选择面板

### Story 6: 胜利/结算更新

**胜利时记录进阶通关，更新排行榜。**

修改文件：`systems/battle.ts`, `core/state/MetaState.ts`

- `victory()` 中 `meta:check_unlocks` 事件：
  - `cycle` 字段改为 `advancement: state.advancement`
  - MetaState 处理：`addClassAdvancement(classId, advancement)`
- 胜利界面文案：
  - 进阶 0：「通关！解锁进阶 1」
  - 进阶 N：「进阶 N 通关！解锁进阶 N+1」
- 排行榜 `LeaderboardEntry`：`cycle` → `advancement`
- 排序逻辑不变（advancement desc → score desc → date desc）
- 移除胜利界面的「解锁无尽模式」提示

### Story 7: 清理无尽模式遗留

**移除所有 endless 相关代码。**

修改文件：多文件

- 移除 `state.endlessUnlocked`
- 移除 `MetaState.unlockMode('endless')` / `isModeUnlocked('endless')`
- 移除 `unlockedModes` 序列化字段（向后兼容：反序列化时忽略）
- 战斗 HUD：保留 `🔄 Cycle N` 前缀（多 cycle 仍存在），新增进阶显示 `⚔️ 进阶 N`（仅进阶 1+ 显示）
- 移除 `checkProgressionUnlocks()` 中无尽模式解锁条件
- 移除胜利界面的「解锁无尽模式」提示
- 更新 i18n 翻译键

## 技术要点

### 进阶效果应用模式

进阶规则通过查询 `state.advancement >= N` 判断是否生效，不修改原有公式签名：

```typescript
// 目标分数：原公式 × 进阶乘数
state.targetScore = calculateTargetScore(level, stageType);
state.targetScore = Math.floor(state.targetScore * getAdvTargetMult(state.advancement));

// 时间上限：原公式 × 进阶乘数
const baseTime = getCycleTimeLimit(nodeId, state.cycle);
const timeLimit = Math.round(baseTime * getAdvTimeMult(state.advancement));

// 商店物价
const price = basePrice * getAdvPriceMult(state.advancement);
```

### 序列化迁移 (v5 → v6)

```typescript
if (data.version <= 5) {
  data.classAdvancement = {};
  for (const cls of data.victoriedClasses ?? []) {
    data.classAdvancement[cls] = 0; // 已通关 = 进阶 0 完成
  }
  delete data.unlockedModes;
}
```

### 精英完整参数（进阶 3+）

当前 Boss 修饰器对 elite 关使用弱化参数（如 `boss_fast_time` elite 1.25× vs boss 1.5×）。进阶 3+ 时 elite 关使用完整 boss 参数：

```typescript
function getModifierParams(modId: string, stageType: StageType, advancement: number): BossModifierParams {
  const mod = BOSS_MODIFIERS[modId];
  if (stageType === 'elite' && advancement >= 3) return mod.bossParams; // 不再弱化
  return stageType === 'elite' ? mod.eliteParams : mod.bossParams;
}
```

## 不做的事

- 不设计职业专属进阶效果（本 epic 仅做通用进阶，职业专属可后续扩展）
- 不改 10 节点结构（standard/elite/rest/boss 节点分布不变）
- 不改 3 cycle / 局的基本结构
- 不改 boss 修饰器本身的效果逻辑
- 不改每日种子系统（种子局可选进阶等级）
- 不引入 cycle 4+（进阶等级替代了无限循环的需求）

## 验证

- `npm run build` 编译通过
- 进阶 0 正常走完 3 cycle 通关 → 解锁进阶 1
- 进阶 1 的 cycle 1 难度等同于进阶 0 的 cycle 2（分数 ×2，时间 ×0.9）
- 进阶规则正确累积（如进阶 7 同时有 1~7 的所有效果）
- 不同职业的进阶等级独立追踪
- cycle 间推进（advanceCycle）正常工作
- 旧存档（v5）正确迁移到 v6
- 排行榜显示 advancement 而非 cycle
- cycle 3 boss 胜利即通关（不再有 cycle 4+）
