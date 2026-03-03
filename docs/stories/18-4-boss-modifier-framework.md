---
title: "Story 18.4: Boss 战框架 — BossModifier 系统"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-4-boss-modifier-framework"
status: "done"
created: "2026-03-02"
depends_on: ["18-1-stage-type-act-structure", "18-2-elite-stage-mini-boss"]
---

# Story 18.4: Boss 战框架 — BossModifier 系统

## Story

作为一个 **玩家**，
我想要 **精英关和 Boss 关具有真正的修饰器效果（而非仅展示名称）**，
以便 **每场精英关有独特的难度修改，Boss 关在 60 秒内轮换 3 个满功率修饰器形成终极挑战**。

## Acceptance Criteria

- [x] AC1: BossModifier 接口定义完成，包含 `apply()` / `cleanup()` / `getParams()` 生命周期方法
- [x] AC2: 所有 6 个数值规则类修饰器已实现（decay, combo_punish, cap, fast_time, double_target, diminish）
- [x] AC3: 精英关（nodes 3/6/9）进入时自动应用对应的减弱版修饰器，关卡结束时清理
- [x] AC4: Boss 关（node 10）实现 20 秒轮换引擎：A(0-20s) → B(20-40s) → C(40-60s)，满功率
- [x] AC5: Boss 关轮换时有视觉提示（修饰器名称切换 + 简短动画）
- [x] AC6: `getParams(isElite)` 精英版参数约为满功率的 50%
- [x] AC7: 7 个打字难度类修饰器定义为 stub（仅 interface + 空实现），留给 Story 18.5-18.8

## Tasks / Subtasks

- [x] Task 1: BossModifier 接口与注册表 (AC: 1, 7)
  - [x]1.1 在 `data/bossModifiers.ts` 新增 `BossModifier` 接口（`id`, `apply(params)`, `cleanup()`, `getParams(isElite)`, `onTick?(dt)`）
  - [x]1.2 定义 `BossModifierParams` 接口（各修饰器的参数类型联合）
  - [x]1.3 创建 `BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier>` 注册全部 13 个修饰器
  - [x]1.4 7 个打字难度类（fade/scramble/reverse/drift/masked/spotlight/rhythm）注册为 no-op stub

- [x] Task 2: 6 个数值规则类修饰器实现 (AC: 2, 6)
  - [x]2.1 `boss_decay`：每秒扣当前总分（满功率 5%/s，精英 2.5%/s）— 通过 onTick 实现
  - [x]2.2 `boss_combo_punish`：连击中断时扣总分（满功率 20%，精英 10%）— 注入 playerWrong 逻辑
  - [x]2.3 `boss_cap`：单词得分上限（满功率 50 分，精英 75 分）— 在 completeWord 中 clamp
  - [x]2.4 `boss_fast_time`：计时器加速（满功率 1.5x，精英 1.25x）— 修改 timer interval
  - [x]2.5 `boss_double_target`：目标分翻倍（满功率 ×2，精英 ×1.5）— 在 startLevel 中应用
  - [x]2.6 `boss_diminish`：每完成一词下个词分数减少（满功率 -10%/词，精英 -5%/词）— 累积衰减倍率

- [x] Task 3: 修饰器生命周期管理 (AC: 3)
  - [x]3.1 创建 `systems/bossModifierEngine.ts`：`applyModifier(modId, isElite)` / `cleanupModifier()` / `tickModifier(dt)`
  - [x]3.2 维护 `activeModifier` 状态（当前激活的修饰器 + 参数）
  - [x]3.3 在 `battle.ts` 的 `startLevel()` 中：精英关调用 `applyModifier(modId, true)`，填充 TODO hook
  - [x]3.4 在 `battle.ts` 的 `endLevel()` 中：调用 `cleanupModifier()`
  - [x]3.5 在 timer interval 中：调用 `tickModifier(dt)` 支持 onTick 类修饰器

- [x] Task 4: Boss 关轮换引擎 (AC: 4, 5)
  - [x]4.1 在 `bossModifierEngine.ts` 实现 `startBossRotation()` — Boss 关专用，管理 20 秒切换
  - [x]4.2 切换逻辑：0-20s → modA, 20-40s → modB, 40-60s → modC（cleanup 旧 → apply 新）
  - [x]4.3 切换时更新 `#modifier-info` HUD 显示新修饰器名称/图标
  - [x]4.4 切换时触发短暂视觉提示（CSS class 闪烁 + announceModifierSwitch）
  - [x]4.5 Boss 关结束时 `cleanupModifier()` + 停止轮换计时器

- [x] Task 5: battle.ts 集成点 (AC: 3, 4)
  - [x]5.1 导出修饰器 hook 接口供 battle.ts 使用（避免循环依赖）
  - [x]5.2 `playerWrong()` 中检查 `boss_combo_punish` 效果
  - [x]5.3 `completeWord()` 中检查 `boss_cap` 和 `boss_diminish` 效果
  - [x]5.4 `startTimer()` 中检查 `boss_fast_time` 加速效果
  - [x]5.5 Boss 关的 `startLevel()` 调用 `startBossRotation()` 而非单个 `applyModifier()`

- [x] Task 6: 测试 (AC: 1-7)
  - [x]6.1 `bossModifierEngine.test.ts`：apply/cleanup 生命周期、精英参数减半
  - [x]6.2 数值修饰器测试：decay 扣分、combo_punish 扣分、cap 上限、fast_time 加速、double_target 翻倍、diminish 递减
  - [x]6.3 Boss 轮换测试：20 秒切换、正确清理旧修饰器

## Dev Notes

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + state.ts），不涉及 Pixi 系统（BattleScene.ts 等未使用）
2. **依赖方向**：`data → core → systems → scenes` — 修饰器定义放 `data/bossModifiers.ts`，引擎逻辑放 `systems/bossModifierEngine.ts`
3. **不修改技能系统**：BossModifier 不直接改变技能系统，仅影响分数计算、时间、目标分等全局状态

### 已由 18.1-18.2 完成的基础设施（不要重复实现）

- `BossModifierId` 类型（13 个字符串联合）[Source: `data/bossModifiers.ts`]
- `BossModifierMeta` 接口 + `BOSS_MODIFIER_META` 常量（名称/图标/描述/精英提示）[Source: `data/bossModifiers.ts`]
- `getBossModifierMeta(id)` 查询函数 [Source: `data/bossModifiers.ts`]
- `drawBossModifiers(count)` 抽取函数 [Source: `data/bossModifiers.ts`]
- `state.bossModifierPool: BossModifierId[]` — Run 开始时抽 3 个 [Source: `core/types.ts` + `main.ts`]
- `getCurrentEliteModifierMeta()` — 获取当前精英关修饰器元数据 [Source: `battle.ts:28-33`]
- `getEliteModifierIndex(nodeId)` — 精英关节点 → 修饰器池索引 [Source: `stageFlow.ts:113-115`]
- `#modifier-info` HUD 元素 + CSS [Source: `index.html` + `style.css`]
- 精英关 CSS 样式（`.elite-stage` 金色边框）[Source: `style.css`]

### BossModifier 接口设计（CRITICAL）

```typescript
// data/bossModifiers.ts 新增

export interface BossModifierParams {
  // 数值类共用参数
  decayRate?: number;       // boss_decay: 每秒扣分百分比 (0.05 = 5%)
  comboPunishRate?: number; // boss_combo_punish: 断连扣分百分比
  scoreCap?: number;        // boss_cap: 单词得分上限
  timeSpeed?: number;       // boss_fast_time: 计时器速度倍率
  targetMultiplier?: number;// boss_double_target: 目标分倍率
  diminishRate?: number;    // boss_diminish: 每词递减百分比
  // 打字类预留参数（18.5-18.8 实现时补充）
  [key: string]: number | undefined;
}

export interface BossModifier {
  id: BossModifierId;
  /** 返回该修饰器的参数（isElite=true 时参数减弱） */
  getParams(isElite: boolean): BossModifierParams;
  /** 应用修饰器效果到游戏状态（关卡开始时调用） */
  apply(params: BossModifierParams): void;
  /** 清理修饰器效果（关卡结束或切换时调用） */
  cleanup(): void;
  /** 每帧更新（可选，boss_decay 等需要） */
  onTick?(dt: number): void;
}
```

### 修饰器引擎设计（CRITICAL）

```typescript
// systems/bossModifierEngine.ts

let activeModifier: { modifier: BossModifier; params: BossModifierParams } | null = null;
let bossRotationTimer: ReturnType<typeof setInterval> | null = null;
let bossRotationPhase: number = 0; // 0=A, 1=B, 2=C

export function applyModifier(modId: BossModifierId, isElite: boolean): void {
  cleanupModifier(); // 先清理旧的
  const mod = BOSS_MODIFIER_REGISTRY[modId];
  if (!mod) return;
  const params = mod.getParams(isElite);
  mod.apply(params);
  activeModifier = { modifier: mod, params };
}

export function cleanupModifier(): void {
  if (activeModifier) {
    activeModifier.modifier.cleanup();
    activeModifier = null;
  }
}

export function tickModifier(dt: number): void {
  if (activeModifier?.modifier.onTick) {
    activeModifier.modifier.onTick(dt);
  }
}

export function startBossRotation(): void { ... } // Boss 关专用
export function stopBossRotation(): void { ... }
```

### battle.ts 集成点详细说明（CRITICAL）

**startLevel() — 填充 TODO hook（约 line 620-630）：**
```typescript
if (currentStageType === 'elite') {
  const meta = getCurrentEliteModifierMeta();
  // ... 现有 HUD 显示代码 ...
  // 新增：应用减弱版修饰器
  const modIdx = getEliteModifierIndex(state.level);
  const modId = state.bossModifierPool[modIdx];
  if (modId) applyModifier(modId, true);
} else if (currentStageType === 'boss') {
  // Boss 关：启动轮换引擎
  startBossRotation();
} else {
  modInfo.classList.remove('visible');
}
```

**endLevel()（约 line 508-535）：**
```typescript
function endLevel(): void {
  cleanupModifier();      // 新增
  stopBossRotation();     // 新增
  if (timerInterval) clearInterval(timerInterval);
  // ... 现有代码 ...
}
```

**timer interval（约 line 472-486）：**
```typescript
timerInterval = setInterval(() => {
  // ... 现有代码 ...
  state.time -= 0.1;
  tickModifier(0.1);  // 新增：每 100ms tick
  // ...
}, 100);
```

**playerWrong()（约 line 208-268）：**
```typescript
// 在现有连击中断逻辑后，检查 combo_punish
if (activeModifier 有 comboPunishRate) {
  const penalty = Math.floor(state.score * comboPunishRate);
  state.score = Math.max(0, state.score - penalty);
  showFeedback(`-${penalty}分!`, '#ff4444');
}
```

**completeWord()（约 line 271-356）：**
```typescript
// 在计算 finalWordScore 后，应用 cap 和 diminish
let cappedScore = finalWordScore;
if (activeModifier 有 scoreCap) cappedScore = Math.min(cappedScore, scoreCap);
if (activeModifier 有 diminishRate) cappedScore *= (1 - diminishRate * wordCount);
```

### 数值修饰器参数表

| ID | 满功率参数 | 精英参数 (×0.5) | 实现方式 |
|----|-----------|----------------|---------|
| boss_decay | decayRate: 0.05 | 0.025 | onTick: `state.score -= state.score * rate * dt` |
| boss_combo_punish | comboPunishRate: 0.20 | 0.10 | playerWrong hook |
| boss_cap | scoreCap: 50 | 75 | completeWord clamp |
| boss_fast_time | timeSpeed: 1.5 | 1.25 | timer `state.time -= 0.1 * speed` |
| boss_double_target | targetMultiplier: 2.0 | 1.5 | startLevel `targetScore *= mult` |
| boss_diminish | diminishRate: 0.10 | 0.05 | completeWord 累积衰减 |

### Boss 轮换引擎时序

```
Boss 关（Node 10, 60 秒）：
  T=0s:  apply(modA, false) + HUD 显示 + 入场公告
  T=20s: cleanup(modA) → apply(modB, false) + HUD 切换 + 闪烁动画
  T=40s: cleanup(modB) → apply(modC, false) + HUD 切换 + 闪烁动画
  T=60s: endLevel() → cleanup(modC) + stopBossRotation()
```

**轮换计时器实现：**
```typescript
let bossRotationStart: number;
// 在 startTimer 的 interval 中检查：
const elapsed = (Date.now() - bossRotationStart) / 1000;
const newPhase = Math.min(Math.floor(elapsed / 20), 2);
if (newPhase !== bossRotationPhase) switchToPhase(newPhase);
```

### 打字难度类 Stub 实现

7 个打字难度修饰器（18.5-18.8 实现）在本 Story 注册为空操作：

```typescript
function createStubModifier(id: BossModifierId): BossModifier {
  return {
    id,
    getParams: () => ({}),
    apply: () => {},
    cleanup: () => {},
  };
}
```

### 循环依赖避免策略

`bossModifierEngine.ts` 需要读写 `state` 和调用 battle.ts 的 `showFeedback`。

**解决方案：** bossModifierEngine 导出 hook 函数，battle.ts 在适当位置调用：

```typescript
// bossModifierEngine.ts 导出查询函数（不导入 battle.ts）
export function getActiveModifierEffect(): { comboPunishRate?: number; scoreCap?: number; ... } | null;

// battle.ts 导入并在 playerWrong/completeWord 中使用
import { getActiveModifierEffect } from './bossModifierEngine';
```

这样 `bossModifierEngine.ts` 只依赖 `data/` 和 `core/`，不依赖 `systems/battle.ts`。

### 视觉提示设计

Boss 关修饰器切换时的视觉反馈：

```css
/* 修饰器切换闪烁 */
.modifier-switch {
  animation: modifierFlash 0.5s ease;
}
@keyframes modifierFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; background: rgba(255,215,0,0.3); }
}
```

Boss 入场公告（复用 `announceLevel` 模式）：显示 3 个修饰器名称 + "每 20 秒轮换"提示。

### Project Structure Notes

**新建文件：**
- `src/src/systems/bossModifierEngine.ts` — 修饰器引擎（apply/cleanup/tick/rotation）

**修改文件：**
- `src/src/data/bossModifiers.ts` — 新增 BossModifier 接口 + BossModifierParams + BOSS_MODIFIER_REGISTRY + 13 个实现
- `src/src/systems/battle.ts` — 填充 TODO hook、endLevel cleanup、timer tick、playerWrong/completeWord hooks
- `src/src/style.css` — Boss 切换动画 CSS
- `src/tests/unit/data/bossModifiers.test.ts` — 扩展测试

**不修改文件（已完成）：**
- `core/types.ts` — bossModifierPool 已定义
- `core/state.ts` — bossModifierPool 已初始化
- `main.ts` — drawBossModifiers(3) 已调用
- `stageFlow.ts` — getEliteModifierIndex 已实现

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.4 验收标准和完整 Boss 池定义]
- [Source: docs/stories/18-2-elite-stage-mini-boss.md — 精英关 UI + TODO hook + bossModifierPool 基础]
- [Source: docs/stories/18-3-rest-stage-random-events.md — TempBuff 系统模式参考]
- [Source: docs/project-context.md — 依赖方向、state 规则、性能要求]
- [Source: docs/game-architecture.md — 三层状态、事件系统、性能预算]
- [Source: src/src/data/bossModifiers.ts — 现有 BossModifierId + Meta + drawBossModifiers]
- [Source: src/src/systems/battle.ts:28-33 — getCurrentEliteModifierMeta helper]
- [Source: src/src/systems/battle.ts:620-630 — TODO hook 位置]
- [Source: src/src/systems/stage/stageFlow.ts:113-115 — getEliteModifierIndex]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- All 37 new tests passing (bossModifierEngine.test.ts)
- 3 new tests added to existing bossModifiers.test.ts (total 21)
- All 2112 passing tests remain green, 21 pre-existing failures unchanged
- No new TypeScript errors introduced

### Completion Notes List

- BossModifier interface and BossModifierParams defined in data/bossModifiers.ts alongside existing meta
- 6 numerical modifiers implemented inline in bossModifiers.ts (avoiding separate files)
- 7 typing difficulty modifiers registered as no-op stubs via createStubModifier()
- Circular dependency avoided: bossModifierEngine.ts imports from data/ and core/ only; battle.ts imports getActiveParams() query function from data/bossModifiers.ts
- boss_double_target apply/cleanup manages originalTargetScore state for proper restoration
- boss_diminish uses exported incrementDiminishCount()/getDiminishMultiplier() called from battle.ts completeWord()
- Boss rotation uses Date.now() elapsed time check inside tickModifier() rather than separate setInterval
- endLevel(), victory(), gameOver() all call cleanupModifier() + stopBossRotation() for safety

### File List

**Created:**
- `src/src/systems/bossModifierEngine.ts` — Modifier lifecycle engine (apply/cleanup/tick/rotation)
- `src/tests/unit/systems/bossModifierEngine.test.ts` — 37 tests

**Modified:**
- `src/src/data/bossModifiers.ts` — BossModifier interface, BossModifierParams, BOSS_MODIFIER_REGISTRY (13 entries), active params query functions
- `src/src/systems/battle.ts` — Import engine + hooks in startLevel (elite/boss), endLevel, playerWrong (combo_punish), completeWord (cap/diminish), startTimer (fast_time/tick), victory, gameOver
- `src/src/style.css` — Boss modifier switch animation CSS (.modifier-switch, @keyframes modifierFlash)
- `src/tests/unit/data/bossModifiers.test.ts` — Added 3 registry tests
- `docs/stories/sprint-status.yaml` — 18-4: in-progress → done
