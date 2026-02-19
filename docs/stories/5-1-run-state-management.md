---
title: "Story 5.1: Run 状态管理"
epic: "Epic 5: Roguelike 循环"
story_key: "5-1-run-state-management"
status: "review"
created: "2026-02-17"
depends_on:
  - "4-5-battle-flow-complete"
---

# Story 5.1: Run 状态管理

## 概述

实现 RunState 管理单局游戏数据，包括技能库存、金币、当前关卡、遗物列表等。RunState 作为 Run（单局游戏）的核心状态管理器，衔接战斗场景与商店场景，为 Roguelike 循环提供数据基础。

## Story

作为一个 **玩家**，
我想要 **在单局游戏中保持我的进度（技能、金币、遗物、关卡）**，
以便 **体验完整的 Roguelike 循环并感受成长**。

## 验收标准

- [x] AC1: RunState 包含技能库存（已获得技能列表及等级）
- [x] AC2: RunState 包含金币数量，支持增减操作
- [x] AC3: RunState 包含当前关卡信息（关卡编号、幕数）
- [x] AC4: RunState 包含遗物列表（已获得遗物）
- [x] AC5: RunState 包含技能绑定映射（键位 → 技能ID）
- [x] AC6: 提供 reset() 方法重置为新 Run 初始状态
- [x] AC7: RunState 与 BattleState 正确交互（战斗结果更新 Run 数据）

## 技术说明

### 文件位置

- `src/core/state/RunState.ts` - RunState 核心实现（新建）
- `src/core/state/index.ts` - 状态模块导出（扩展）
- `src/core/state/StateCoordinator.ts` - 状态协调器（新建，可选）
- `tests/unit/core/state/RunState.test.ts` - 单元测试（新建）

### 架构参考

```
game-architecture.md - State Management:

interface GameState {
  meta: MetaState      // 永久数据：解锁、图鉴、成就
  run: RunState        // 单局数据：技能、遗物、金币、关卡
  battle: BattleState  // 战斗数据：分数、倍率、连击、词语
}

// 协调多层状态更新
class StateCoordinator {
  onBattleEnd(result: BattleResult) {
    this.run.applyBattleResult(result)
    this.meta.checkUnlocks(this.run)
    this.save()
  }
}

game-architecture.md - Project Structure:

src/
├── renderer/
│   ├── core/               # 核心层（纯逻辑）
│   │   ├── state/          # 状态管理
│   │   │   ├── MetaState.ts
│   │   │   ├── RunState.ts      ← 本 Story 实现
│   │   │   ├── BattleState.ts   ← 已存在
│   │   │   └── StateCoordinator.ts
```

### 三层状态架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        三层状态架构                               │
├─────────────────────────────────────────────────────────────────┤
│  MetaState (永久层)                                              │
│  ├── 解锁的技能/遗物列表                                          │
│  ├── 成就进度                                                    │
│  └── 统计数据（总局数、最高分等）                                  │
│                                                                   │
│  RunState (单局层) ← 本 Story 实现                                │
│  ├── 已获得技能及等级 (skills: Map<SkillId, SkillInstance>)       │
│  ├── 技能绑定 (bindings: Map<string, SkillId>)                   │
│  ├── 遗物列表 (relics: RelicId[])                                │
│  ├── 金币 (gold: number)                                         │
│  ├── 当前关卡 (currentStage: number, currentAct: number)         │
│  └── Run 统计 (wordsTyped, maxCombo, totalScore 等)              │
│                                                                   │
│  BattleState (战斗层) ← 已实现                                    │
│  ├── 分数、倍率、连击                                             │
│  ├── 当前词语、已输入字符                                         │
│  └── 时间、阶段                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 依赖关系

**依赖:**
- `core/state/BattleState.ts` - BattleResult 接口
- `data/skills.ts` - 技能数据定义（Story 2.2 已实现）
- `shared/types.ts` - 共享类型定义

**被依赖:**
- Story 5.2 (关卡进度系统) - 使用 RunState 的关卡数据
- Story 5.3 (商店场景) - 读写 RunState 的金币和技能
- Story 5.5 (游戏结束流程) - 读取 Run 统计数据

## 实现任务

### Task 1: RunState 核心数据结构 (AC: #1, #2, #3, #4, #5) ✅

创建 `src/core/state/RunState.ts`:

```typescript
// ============================================
// 打字肉鸽 - RunState 单局状态管理
// ============================================
// Story 5.1 Task 1: RunState 核心数据结构

/**
 * 技能实例（已获得的技能）
 */
export interface SkillInstance {
  id: string         // 技能ID
  level: number      // 当前等级 (1-3)
}

/**
 * Run 状态数据
 * 管理单局游戏的所有持久数据
 */
export interface RunStateData {
  /** 已获得技能列表 */
  skills: SkillInstance[]

  /** 技能绑定 (键位 → 技能ID) */
  bindings: Map<string, string>

  /** 遗物列表 */
  relics: string[]

  /** 金币数量 */
  gold: number

  /** 当前关卡编号 (1-8) */
  currentStage: number

  /** 当前幕数 (1-3) */
  currentAct: number

  /** Run 是否进行中 */
  isActive: boolean

  /** Run 统计 */
  stats: RunStats
}

/**
 * Run 统计数据
 */
export interface RunStats {
  /** 总分数 */
  totalScore: number

  /** 最高连击 */
  maxCombo: number

  /** 完成词语数 */
  wordsCompleted: number

  /** 战斗次数 */
  battlesWon: number

  /** Run 开始时间 */
  startTime: number
}

/**
 * 单局状态管理类
 *
 * 职责:
 * - 管理单局游戏的所有持久数据
 * - 提供技能绑定和查询方法
 * - 处理金币增减
 * - 跟踪关卡进度
 */
export class RunState {
  private data: RunStateData

  constructor() {
    this.data = this.createInitialState()
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): RunStateData {
    return {
      skills: [],
      bindings: new Map(),
      relics: [],
      gold: 0,
      currentStage: 1,
      currentAct: 1,
      isActive: false,
      stats: {
        totalScore: 0,
        maxCombo: 0,
        wordsCompleted: 0,
        battlesWon: 0,
        startTime: 0
      }
    }
  }

  // 方法实现见 Task 2-5
}
```

### Task 2: 技能管理方法 (AC: #1, #5) ✅

添加技能相关方法到 RunState:

```typescript
// ==================== 技能管理 ====================

/**
 * 添加技能
 * @param skillId 技能ID
 * @param level 初始等级（默认 1）
 */
addSkill(skillId: string, level: number = 1): void {
  const existing = this.data.skills.find(s => s.id === skillId)
  if (existing) {
    // 已有技能则升级
    existing.level = Math.min(3, existing.level + 1)
  } else {
    this.data.skills.push({ id: skillId, level })
  }
}

/**
 * 获取技能等级
 * @returns 技能等级，未拥有返回 0
 */
getSkillLevel(skillId: string): number {
  const skill = this.data.skills.find(s => s.id === skillId)
  return skill?.level || 0
}

/**
 * 获取所有技能
 */
getSkills(): readonly SkillInstance[] {
  return this.data.skills
}

/**
 * 绑定技能到键位
 * @param key 键位 (A-Z)
 * @param skillId 技能ID
 */
bindSkill(key: string, skillId: string): void {
  const upperKey = key.toUpperCase()
  // 验证键位有效性
  if (!/^[A-Z]$/.test(upperKey)) {
    throw new Error(`Invalid key: ${key}`)
  }
  // 验证技能已拥有
  if (!this.data.skills.some(s => s.id === skillId)) {
    throw new Error(`Skill not owned: ${skillId}`)
  }
  this.data.bindings.set(upperKey, skillId)
}

/**
 * 解绑键位技能
 */
unbindSkill(key: string): void {
  this.data.bindings.delete(key.toUpperCase())
}

/**
 * 获取键位绑定的技能
 * @returns 技能ID，未绑定返回 undefined
 */
getSkillAtKey(key: string): string | undefined {
  return this.data.bindings.get(key.toUpperCase())
}

/**
 * 获取所有绑定
 */
getBindings(): ReadonlyMap<string, string> {
  return this.data.bindings
}
```

### Task 3: 金币和遗物管理 (AC: #2, #4) ✅

添加金币和遗物方法:

```typescript
// ==================== 金币管理 ====================

/**
 * 获取当前金币
 */
getGold(): number {
  return this.data.gold
}

/**
 * 添加金币
 * @param amount 添加数量（可为负数）
 */
addGold(amount: number): void {
  this.data.gold = Math.max(0, this.data.gold + amount)
}

/**
 * 消费金币
 * @returns 是否消费成功
 */
spendGold(amount: number): boolean {
  if (this.data.gold >= amount) {
    this.data.gold -= amount
    return true
  }
  return false
}

// ==================== 遗物管理 ====================

/**
 * 添加遗物
 */
addRelic(relicId: string): void {
  if (!this.data.relics.includes(relicId)) {
    this.data.relics.push(relicId)
  }
}

/**
 * 检查是否拥有遗物
 */
hasRelic(relicId: string): boolean {
  return this.data.relics.includes(relicId)
}

/**
 * 获取所有遗物
 */
getRelics(): readonly string[] {
  return this.data.relics
}
```

### Task 4: 关卡进度和状态查询 (AC: #3, #6) ✅

添加关卡和重置方法:

```typescript
// ==================== 关卡进度 ====================

/**
 * 获取当前关卡
 */
getCurrentStage(): number {
  return this.data.currentStage
}

/**
 * 获取当前幕数
 */
getCurrentAct(): number {
  return this.data.currentAct
}

/**
 * 推进到下一关
 */
advanceStage(): void {
  this.data.currentStage++
  // 更新幕数 (Act 1: 1-3, Act 2: 4-6, Act 3: 7-8)
  if (this.data.currentStage <= 3) {
    this.data.currentAct = 1
  } else if (this.data.currentStage <= 6) {
    this.data.currentAct = 2
  } else {
    this.data.currentAct = 3
  }
}

/**
 * 检查是否为 Boss 关卡
 */
isBossStage(): boolean {
  return this.data.currentStage === 8
}

// ==================== Run 生命周期 ====================

/**
 * 开始新 Run
 */
startRun(): void {
  this.reset()
  this.data.isActive = true
  this.data.stats.startTime = Date.now()
}

/**
 * 检查 Run 是否进行中
 */
isActive(): boolean {
  return this.data.isActive
}

/**
 * 结束 Run
 */
endRun(): void {
  this.data.isActive = false
}

/**
 * 重置为新 Run 初始状态 (AC6)
 */
reset(): void {
  this.data = this.createInitialState()
}

/**
 * 获取只读状态
 */
getState(): Readonly<RunStateData> {
  return this.data
}
```

### Task 5: 战斗结果集成 (AC: #7) ✅

添加与 BattleState 交互的方法:

```typescript
import { BattleResult } from '../../scenes/battle/BattleFlowController'

// ==================== 战斗集成 ====================

/**
 * 应用战斗结果到 Run 状态
 * 在每场战斗结束后调用
 */
applyBattleResult(result: BattleResult): void {
  // 更新统计
  this.data.stats.totalScore += result.score
  this.data.stats.maxCombo = Math.max(this.data.stats.maxCombo, result.maxCombo)
  this.data.stats.wordsCompleted += result.wordsCompleted

  if (result.result === 'win') {
    this.data.stats.battlesWon++
    // 战斗胜利奖励金币（基于分数）
    const goldReward = Math.floor(result.score / 100)
    this.addGold(goldReward)
  }
}

/**
 * 获取 Run 统计
 */
getStats(): Readonly<RunStats> {
  return this.data.stats
}

/**
 * 计算 Run 持续时间（毫秒）
 */
getRunDuration(): number {
  if (!this.data.isActive) return 0
  return Date.now() - this.data.stats.startTime
}
```

### Task 6: 更新状态模块导出 ✅

更新 `src/core/state/index.ts`:

```typescript
// ============================================
// 打字肉鸽 - 状态模块导出
// ============================================

export { BattleState } from './BattleState'
export type { BattleStateData, BattlePhase } from './BattleState'

export { RunState } from './RunState'
export type { RunStateData, RunStats, SkillInstance } from './RunState'
```

### Task 7: 单元测试 ✅

创建 `tests/unit/core/state/RunState.test.ts`:

**测试用例:**

- **初始化测试**
  - 新建 RunState 应有正确的初始值
  - reset() 应重置所有数据

- **技能管理测试**
  - addSkill() 应添加新技能
  - addSkill() 重复添加应升级技能
  - 技能等级不应超过 3
  - getSkillLevel() 未拥有技能返回 0
  - bindSkill() 应正确绑定键位
  - bindSkill() 无效键位应抛出错误
  - bindSkill() 未拥有技能应抛出错误
  - unbindSkill() 应移除绑定
  - getSkillAtKey() 未绑定返回 undefined

- **金币测试**
  - addGold() 应增加金币
  - addGold() 负数应减少金币
  - 金币不应低于 0
  - spendGold() 成功返回 true
  - spendGold() 余额不足返回 false

- **遗物测试**
  - addRelic() 应添加遗物
  - addRelic() 重复添加不应重复
  - hasRelic() 应正确返回

- **关卡进度测试**
  - 初始关卡为 1
  - advanceStage() 应推进关卡
  - 幕数应随关卡正确更新
  - isBossStage() 在第 8 关返回 true

- **Run 生命周期测试**
  - startRun() 应重置并激活
  - endRun() 应结束 Run
  - isActive() 应正确反映状态

- **战斗集成测试**
  - applyBattleResult() 应更新统计
  - 胜利战斗应增加金币奖励
  - maxCombo 应取最大值

预计新增测试: ~30 个

## 测试计划

### 单元测试 (vitest)

- `RunState.test.ts`: Run 状态管理逻辑 (~30 tests)

### 集成测试

手动验证:
1. 创建新 Run 并验证初始状态
2. 添加技能并绑定到键位
3. 进入战斗并完成，验证结果反映到 RunState
4. 推进关卡验证 Act 变化
5. 购买商品验证金币扣除

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 4.5 (战斗流程完整循环):**
- BattleResult 接口已定义，包含 result, score, maxCombo, accuracy, wordsCompleted, timeUsed
- 使用事件驱动架构，通过 EventBus 解耦组件
- destroyed 状态检查防止销毁后错误
- 使用 Readonly<T> 保护状态数据

**从 Story 2.3 (技能绑定系统):**
- 已有技能绑定概念：`RunState.bindings: Map<string, SkillId>`
- bindSkill(key, skillId) 和 unbindSkill(key) 方法定义
- getSkillAtKey(key) 查询接口

**从 Story 4.2 (战斗场景框架):**
- BattleState 使用 createInitialState() 模式
- 状态转换方法 (start, pause, resume)
- 私有 data 配合公共 getState() 返回 Readonly

### 技术要点

1. **状态不可变性**: 使用 Readonly<T> 保护外部访问
2. **Map 序列化**: 如需存档，需要 Map ↔ Object 转换
3. **技能等级上限**: 最高 3 级，升级时使用 Math.min
4. **金币保护**: 使用 Math.max(0, ...) 防止负数
5. **关卡映射**:
   - Act 1: Stage 1-3
   - Act 2: Stage 4-6
   - Act 3: Stage 7-8 (含 Boss)

### 与后续 Story 的接口

```typescript
// Story 5.2 (关卡进度) 将使用:
runState.getCurrentStage()
runState.getCurrentAct()
runState.advanceStage()
runState.isBossStage()

// Story 5.3 (商店场景) 将使用:
runState.getGold()
runState.spendGold(amount)
runState.addSkill(skillId)
runState.getSkills()

// Story 5.5 (游戏结束) 将使用:
runState.getStats()
runState.getRunDuration()
runState.endRun()
```

### 项目结构对齐

```
src/
├── core/
│   ├── state/
│   │   ├── BattleState.ts          # 已存在
│   │   ├── RunState.ts             # 新建
│   │   └── index.ts                # 扩展
tests/
├── unit/
│   └── core/
│       └── state/
│           ├── BattleState.test.ts # 已存在
│           └── RunState.test.ts    # 新建
```

### BattleResult 接口 (已在 Story 4.5 实现)

```typescript
// src/scenes/battle/BattleFlowController.ts
export interface BattleResult {
  result: 'win' | 'lose'
  score: number
  maxCombo: number
  accuracy: number        // 0-1
  wordsCompleted: number
  timeUsed: number        // 秒
}
```

### References

- [game-architecture.md - State Management](../game-architecture.md#state-management)
- [game-architecture.md - Project Structure](../game-architecture.md#project-structure)
- [epics.md - Story 5.1](../epics.md#story-51-run-状态管理)
- [Story 4.5 - 战斗流程完整循环](./4-5-battle-flow-complete.md)
- [Story 2.3 - 技能绑定系统](./2-3-skill-binding-system.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Task 1-5 (RunState 核心实现)**: 创建 `src/core/state/RunState.ts`，实现完整的单局状态管理，包括：
   - SkillInstance 和 RunStats 接口定义
   - RunStateData 数据结构
   - 技能管理：addSkill(), getSkillLevel(), getSkills(), bindSkill(), unbindSkill(), getSkillAtKey(), getBindings()
   - 金币管理：getGold(), addGold(), spendGold() 带保护防止负数
   - 遗物管理：addRelic(), hasRelic(), getRelics() 带重复检测
   - 关卡进度：getCurrentStage(), getCurrentAct(), advanceStage(), isBossStage() 实现 8 关 3 幕结构
   - Run 生命周期：startRun(), endRun(), isActive(), reset(), getState()
   - 战斗集成：applyBattleResult() 从 BattleFlowController 导入 BattleResult 类型

2. **Task 6 (模块导出)**: 更新 `src/core/state/index.ts` 添加 RunState 及其类型导出

3. **Task 7 (单元测试)**: 创建 `tests/unit/core/state/RunState.test.ts`，包含 53 个测试用例：
   - 初始化测试 (2 tests)
   - 技能管理测试 (7 tests)
   - 技能绑定测试 (8 tests)
   - 金币管理测试 (8 tests)
   - 遗物管理测试 (4 tests)
   - 关卡进度测试 (7 tests)
   - Run 生命周期测试 (4 tests)
   - 战斗集成测试 (8 tests)
   - 持续时间测试 (3 tests)
   - 状态只读保护测试 (2 tests)

4. **测试结果**: 436 个测试全部通过（新增 53 个）

### File List

**New Files:**
- `src/core/state/RunState.ts`
- `tests/unit/core/state/RunState.test.ts`

**Modified Files:**
- `src/core/state/index.ts`

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-17 | 创建 Story 5.1 Run 状态管理文档 |
| 2026-02-17 | 完成所有任务实现，436 测试通过，状态更新为 review |
