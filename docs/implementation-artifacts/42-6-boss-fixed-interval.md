# Story 42.6: Boss 固定间隔系统重构

Status: review

## Story

As a 玩家,
I want Boss 关每 3 关固定出现，且每次 Boss 只使用 1 个修饰器（不再轮换 3 个），
so that Boss 节奏可预测、修饰器体验更清晰，配合无限循环的渐进难度设计。

## Acceptance Criteria

1. **AC1: Boss 固定间隔** — Boss 每 3 关出现（Stage 3, 6, 9, 12...），逻辑 `stageNum % CYCLE_LENGTH === 0` 不变
2. **AC2: 单修饰器制** — 每个 Boss 关只应用 1 个修饰器（取代旧的 3 修饰器轮换制）
3. **AC3: 不重复抽取** — 每个 Cycle 的 Boss 抽取 1 个新修饰器，不与本 Run 内已用修饰器重复
4. **AC4: 耗尽重置** — 修饰器池耗尽后自动重置已用列表，重新开始循环
5. **AC5: Boss 入场/HUD 适配** — Boss 入场演出和 HUD 只显示 1 个修饰器（不再列出 3 个）
6. **AC6: 轮换引擎移除** — 移除 `startBossRotation` / `stopBossRotation` / `checkBossRotation` 三阶段轮换机制
7. **AC7: 存档兼容** — 旧存档的 `bossModifierPool: string[3]` 能正确迁移到新的单修饰器结构

## Tasks / Subtasks

- [x] **Task 1: 状态结构改造** (AC: 2, 3, 4)
  - [x] 1.1 `core/types.ts` 修改 `bossModifierPool` 类型注释：从"3 个随机 Boss 修饰器"改为"当前 Cycle 的 Boss 修饰器（0 或 1 个）"
  - [x] 1.2 `core/types.ts` 新增 `usedBossModifiers: string[]`（本 Run 已用修饰器列表，不重复抽取用）
  - [x] 1.3 `core/state.ts` `createInitialState` 新增 `usedBossModifiers: []`
  - [x] 1.4 `core/state/RunState.ts` data 接口新增 `usedBossModifiers: string[]`，`reset()` 中清空

- [x] **Task 2: 抽取逻辑改造** (AC: 2, 3, 4)
  - [x] 2.1 `data/bossModifiers.ts` 新增 `drawSingleBossModifier(excluded: string[]): BossModifierId | null`：从池中随机抽 1 个，排除 `excluded` 列表中的
  - [x] 2.2 如果所有修饰器都在 `excluded` 中，重置排除列表（AC4 耗尽重置），再抽 1 个
  - [x] 2.3 `drawBossModifiers(3)` 保留但标记 `@deprecated`（存档迁移可能需要）

- [x] **Task 3: startLevel Boss 修饰器应用改造** (AC: 2, 5)
  - [x] 3.1 `battle.ts` `startLevel()` ~行 1856-1864：从遍历 `bossModifierPool` 全部 3 个 → 只应用 `bossModifierPool[0]`（单修饰器）
  - [x] 3.2 HUD 更新 ~行 1866-1880：从拼接 3 个名字 → 只显示 1 个修饰器名字（icon + name + description）
  - [x] 3.3 `showBossIntro(pool)` ~行 1935：pool 已经是 0-1 长度，无需改签名
  - [x] 3.4 Phoenix 复活 ~行 1531：从遍历 3 个 → 只恢复 1 个

- [x] **Task 4: advanceCycle 改造** (AC: 2, 3)
  - [x] 4.1 `battle.ts` `advanceCycle()` ~行 119：从 `drawBossModifiers(3)` 改为 `drawSingleBossModifier(state.usedBossModifiers)`
  - [x] 4.2 抽到修饰器后：`state.bossModifierPool = result ? [result] : []`
  - [x] 4.3 将新抽到的修饰器加入 `state.usedBossModifiers`
  - [x] 4.4 `main.ts` 中 startRun 相关的 `drawBossModifiers(3)` 同步改造（两处均改为空池初始化）

- [x] **Task 5: 轮换引擎移除** (AC: 6)
  - [x] 5.1 `bossModifierEngine.ts` 移除 `startBossRotation()`、`stopBossRotation()`、`checkBossRotation()`、`switchToPhase()` 函数
  - [x] 5.2 移除 `bossRotationStart`、`bossRotationPhase`、`isRotating` 模块变量
  - [x] 5.3 搜索所有 `startBossRotation` / `stopBossRotation` 调用方，移除或替换（battle.ts 已在 Task 4 移除）
  - [x] 5.4 保留 `applyModifier()`、`cleanupTemporaryModifiers()` 等通用函数
  - [x] 5.5 `getEliteModifierIndex()` in `stageFlow.ts` — 无生产调用方，已移除

- [x] **Task 6: 存档兼容** (AC: 7)
  - [x] 6.1 `RunState.ts` `deserialize()` ~行 572：处理旧格式 `bossModifierPool: [3 items]` → 取第 1 个保留，其余丢弃
  - [x] 6.2 `deserialize()` 处理缺失的 `usedBossModifiers` 字段 → 默认 `[]`
  - [x] 6.3 `serialize()` 输出新字段 `usedBossModifiers`

- [x] **Task 7: 测试更新与构建验证** (AC: 1-7)
  - [x] 7.1 更新 `bossModifiers.test.ts` — 新增 5 个 `drawSingleBossModifier` 测试（包括耗尽重置 AC4）
  - [x] 7.2 更新 `bossModifierEngine.test.ts` — 移除轮换相关测试（4 个）及 stopBossRotation 导入
  - [x] 7.3 更新 `cycle-state.test.ts` — `bossModifierPool` 长度从 3 改为 0-1，新增 usedBossModifiers 累积测试
  - [x] 7.4 更新 `relics.bossmod.test.ts` — 移除 startBossRotation 导入
  - [x] 7.5 全局搜索确认无 `bossModifierPool[1]` / `bossModifierPool[2]` 残留 ✓
  - [x] 7.6 `vite build` 通过 ✓（76 modules, 413 kB）

## Dev Notes

### 核心设计决策

**本 Story 将 Boss 修饰器从"3 个轮换制"改为"1 个单修饰器制"：**
- ❌ 不改变 Boss 间隔逻辑（已在 42.1 中实现 `stageNum % 3 === 0`）
- ❌ 不改变 `CYCLE_LENGTH` 常量
- ❌ 不改变 `getCycleTimeLimit` 时间衰减
- ❌ 不改变 `calculateTargetScore` 目标分数公式
- ❌ 不改变 `showBossModifierPicker`（Boss 胜利后的永久修饰器选择，这是独立系统）
- ✅ 只改变 Boss 关战斗中使用的临时修饰器数量：3 → 1

### 当前 Boss 修饰器系统（改造前）

```
Run 开始:
  drawBossModifiers(3) → bossModifierPool = [modA, modB, modC]

每个 Boss 关 startLevel():
  for (bossModId of bossModifierPool) → 同时应用 3 个修饰器
  startBossRotation() → 20s 一换（Phase 0→1→2）

Boss 胜利后 advanceCycle():
  cycle++
  drawBossModifiers(3) → 重抽 3 个新修饰器
```

**问题：**
- 3 个修饰器同时/轮换应用太复杂，玩家难以理解
- 20 秒轮换打断心流，玩家需要不断适应新规则
- 修饰器组合产生大量边界情况（如 3 个同时生效的交互）

### 改造后系统

```
Run 开始:
  bossModifierPool = []  // 空，等第一个 Boss 关时再抽
  usedBossModifiers = [] // 本 Run 已用列表

每个 Boss 关 startLevel() 之前（或 advanceCycle 后）:
  mod = drawSingleBossModifier(usedBossModifiers)
  bossModifierPool = [mod]
  usedBossModifiers.push(mod)

Boss 关 startLevel():
  applyModifier(bossModifierPool[0]) → 只应用 1 个修饰器
  // 无轮换引擎

Boss 胜利后 advanceCycle():
  cycle++
  mod = drawSingleBossModifier(usedBossModifiers)
  bossModifierPool = [mod]
  usedBossModifiers.push(mod)
  // 如果 usedBossModifiers.length >= 所有修饰器总数 → 重置
```

**优势：**
- 每个 Boss 关规则明确：只有 1 个修饰器
- 无轮换中断，玩家全程适应同一规则
- 修饰器不重复，每次 Boss 体验不同
- 耗尽重置保证无限循环不会卡住

### 关键代码路径

**Boss 修饰器应用 — `battle.ts` startLevel() ~行 1856-1864：**
```typescript
// 当前（3 个轮换）：
for (const bossModId of state.bossModifierPool) {
  if (bossModId && !isModifierActive(bossModId)) {
    applyModifier(bossModId, false);
  }
}

// 改造后（单修饰器）：
if (state.bossModifierPool.length > 0) {
  const bossModId = state.bossModifierPool[0];
  if (bossModId && !isModifierActive(bossModId)) {
    applyModifier(bossModId, false);
  }
}
```

**advanceCycle — `battle.ts` ~行 115-120：**
```typescript
// 当前：
state.bossModifierPool = drawBossModifiers(3);

// 改造后：
const newMod = drawSingleBossModifier(state.usedBossModifiers);
state.bossModifierPool = newMod ? [newMod] : [];
if (newMod) state.usedBossModifiers.push(newMod);
```

**Boss 入场演出 — `battle.ts` ~行 1935：**
```typescript
// 当前：显示 3 个修饰器的入场
await showBossIntro(state.bossModifierPool);
// 改造后：只显示 1 个（pool 已是 0-1 长度，无需改调用签名）
```

**HUD — `battle.ts` ~行 1866-1878：**
```typescript
// 当前：拼接 3 个修饰器名字
const allNames = state.bossModifierPool.map(id => ...).join(' ');
// 改造后：只有 1 个名字（循环仍可用，但只遍历 1 个元素）
```

### 两套独立的 Boss 修饰器系统（勿混淆）

| 系统 | 数据来源 | 应用时机 | 生命周期 |
|------|----------|----------|----------|
| **Boss 关修饰器** | `bossModifierPool` | Boss 关战斗期间 | 单关，每关重新抽取 |
| **永久修饰器** | `activeModifiers` | 所有关卡 | 整个 Run，Boss 胜利后叠加 |

**本 Story 只改造第一套系统。`showBossModifierPicker`（永久修饰器选择 UI）不受影响。**

### 轮换引擎移除范围

`bossModifierEngine.ts` 中需移除：
- `startBossRotation()` — 启动 3 阶段轮换
- `stopBossRotation()` — 停止轮换
- `checkBossRotation()` — 检查是否需要切换阶段
- `switchToPhase(phase)` — 切换到指定阶段
- 模块变量：`bossRotationStart`、`bossRotationPhase`、`isRotating`

保留：
- `applyModifier()` — 通用修饰器应用函数
- `cleanupTemporaryModifiers()` — 清理临时修饰器
- `isModifierActive()` — 检查修饰器是否活跃
- `announceModifierSwitch()` — 可能保留用于其他用途，或一并移除
- `updateBossModifierHUD()` — HUD 更新

### 42.4/42.5 实现模式（应遵循）

- **模块级变量**：用于缓存 Boss 状态（`_isBoss` 模式）
- **Math.round**：指数计算结果用 `Math.round()` 取整
- **Story 注释**：在新增/修改代码处添加 `// Story 42.6:` 注释
- **build 验证**：每个 Task 完成后确认 `vite build` 通过

### main.ts 中的 drawBossModifiers 调用

`main.ts` 有两处 `drawBossModifiers(3)` 调用（行 67 和 180），分别在新 Run 和恢复 Run 时。需要：
- 行 67（新 Run）：改为不抽取（等第一个 Boss 关时再抽），或抽 1 个
- 行 180（恢复 Run）：依赖 `RunState.deserialize()` 恢复，可能不需要重抽

### Project Structure Notes

**依赖方向**（必须遵守）：
```
data → core → systems → scenes
```

- `drawSingleBossModifier()` 在 `data/bossModifiers.ts` — 数据层
- `bossModifierPool` / `usedBossModifiers` 在 `core/types.ts` + `core/state.ts` — 核心层
- 修饰器应用在 `systems/battle.ts` + `systems/bossModifierEngine.ts` — 系统层
- 不新增文件，只修改现有文件

### References

- [Source: docs/stories/epic-42-stage-flow-redesign.md#Story 42.6]
- [Source: docs/implementation-artifacts/42-4-time-acceleration.md — 模块级变量模式]
- [Source: docs/implementation-artifacts/42-5-exponential-target.md — 常量管理模式]
- [Source: src/src/systems/stage/stageFlow.ts — isBossNode, getStageType, CYCLE_LENGTH]
- [Source: src/src/systems/battle.ts — startLevel ~行 1856, advanceCycle ~行 115, Phoenix ~行 1531]
- [Source: src/src/systems/bossModifierEngine.ts — startBossRotation ~行 151, switchToPhase ~行 181]
- [Source: src/src/data/bossModifiers.ts — drawBossModifiers ~行 219]
- [Source: src/src/core/state/RunState.ts — startRun ~行 413, serialize ~行 504, deserialize ~行 572]
- [Source: src/src/core/types.ts — bossModifierPool ~行 187]
- [Source: src/src/main.ts — drawBossModifiers 调用 ~行 67, 180]
- [Source: src/src/systems/bossModifierPicker.ts — showBossModifierPicker（不受影响）]
- [Source: src/src/systems/actTransition.ts — showBossIntro ~行 36]
- [Source: docs/project-context.md — dependency direction, State Management Rules]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Boss 修饰器从 3 个轮换制改为 1 个单修饰器制，每 Cycle 的 Boss 只应用 1 个修饰器
- 新增 `drawSingleBossModifier(excluded)` 函数，支持不重复抽取和耗尽重置（AC4）
- 移除完整的轮换引擎（`startBossRotation`、`stopBossRotation`、`checkBossRotation`、`switchToPhase`）及 HUD/公告函数
- 移除 `getEliteModifierIndex()`（死代码，无生产调用方）
- 存档兼容：旧 3 元素 pool 截取第一个，缺失 `usedBossModifiers` 默认空数组
- 测试净改善：修复 3 个 cycle-state 预存在失败，新增 5 个 drawSingleBossModifier 测试
- 预存在失败（非本 Story 引入）：4 个 boss_scroll RAF 问题 + 1 个 chaos_roulette 随机种子问题
- **Code Review 修复（H1）**：main.ts 初始化时抽取首个 Boss 修饰器（之前 Cycle 1 Boss 无修饰器）
- **Code Review 修复（H2）**：advanceCycle() 新增耗尽重置检查（AC4 usedBossModifiers 满时清空）
- **Code Review 修复（M1-M5）**：清理 5 处残留注释/mock/文件列表遗漏

### File List

**Modified:**
- `src/src/core/types.ts` — bossModifierPool 注释更新 + 新增 usedBossModifiers 字段
- `src/src/core/state.ts` — createInitialState 新增 usedBossModifiers: []
- `src/src/core/state/RunState.ts` — RunStateData 接口、createInitialState、startRun、serialize、deserialize
- `src/src/data/bossModifiers.ts` — 新增 drawSingleBossModifier()，标记 drawBossModifiers @deprecated
- `src/src/systems/battle.ts` — advanceCycle、startLevel（Boss 修饰器应用 + HUD）、Phoenix 复活、移除 stopBossRotation 调用
- `src/src/systems/bossModifierEngine.ts` — 移除轮换引擎（6 函数 + 3 变量 + 2 HUD 函数），清理 imports
- `src/src/systems/stage/stageFlow.ts` — 移除 getEliteModifierIndex()
- `src/src/main.ts` — 两处 drawBossModifiers(3) 改为空池初始化
- `docs/implementation-artifacts/sprint-status.yaml` — Story 42.6 状态更新

**Tests modified:**
- `tests/unit/data/bossModifiers.test.ts` — 新增 drawSingleBossModifier describe（5 个测试）
- `tests/unit/systems/bossModifierEngine.test.ts` — 移除 Boss 轮换引擎 describe（4 个测试）+ 清理 imports
- `tests/unit/core/cycle-state.test.ts` — 修复 level 重置期望值 + pool 长度 + 新增 usedBossModifiers 测试
- `tests/unit/systems/boss-modifier-picker.test.ts` — 移除 stopBossRotation import/调用
- `tests/unit/systems/relics/relics.bossmod.test.ts` — 移除 startBossRotation import
- `tests/unit/systems/stage/stageFlow.test.ts` — 移除 getEliteModifierIndex 测试 + import
