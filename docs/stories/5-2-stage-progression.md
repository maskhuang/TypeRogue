---
title: "Story 5.2: 关卡进度系统"
epic: "Epic 5: Roguelike 循环"
story_key: "5-2-stage-progression"
status: "done"
created: "2026-02-17"
depends_on:
  - "5-1-run-state-management"
---

# Story 5.2: 关卡进度系统

## 概述

实现 8 关 3 幕的进度结构，包括关卡配置数据、难度递增参数、关卡选择逻辑。本 Story 为 Roguelike 循环提供关卡进度的数据基础，衔接战斗场景与商店场景的流转。

## Story

作为一个 **玩家**，
我想要 **体验由易到难的 8 关 3 幕关卡结构**，
以便 **感受渐进式的挑战并在最终 Boss 战中检验我的成长**。

## 验收标准

- [x] AC1: 关卡配置数据定义 8 个关卡的基础参数
- [x] AC2: Act 1 (关卡 1-3) 难度参数正确配置
- [x] AC3: Act 2 (关卡 4-6) 难度参数正确配置
- [x] AC4: Act 3 (关卡 7-8，含 Boss) 难度参数正确配置
- [x] AC5: 难度递增参数包含：时间限制、词语难度、词语数量、金币奖励
- [x] AC6: 提供 StageManager 加载和查询关卡配置
- [x] AC7: Boss 关卡 (Stage 8) 有特殊配置标识

## 技术说明

### 文件位置

- `src/assets/data/levels.json` - 关卡配置数据（新建）
- `src/src/systems/stage/StageManager.ts` - 关卡管理器（新建）
- `src/src/systems/stage/StageConfig.ts` - 关卡配置类型定义（新建）
- `src/src/systems/stage/index.ts` - 模块导出（新建）
- `src/tests/unit/systems/stage/StageManager.test.ts` - 单元测试（新建）

### 架构参考

```
game-architecture.md - Roguelike 循环:

Roguelike 循环
├── 8 关卡 / 3 幕结构
│   ├── Act 1: Stage 1-3 (教学/简单)
│   ├── Act 2: Stage 4-6 (中等难度)
│   └── Act 3: Stage 7-8 (困难/Boss)
├── 每关卡战斗 → 商店 → 下一关
└── Boss 关卡特殊处理

game-architecture.md - Project Structure:

src/
├── renderer/
│   ├── systems/
│   │   ├── stage/              ← 本 Story 实现
│   │   │   ├── StageManager.ts
│   │   │   └── StageConfig.ts
assets/
├── data/
│   └── levels.json             ← 本 Story 实现
```

### 依赖关系

**依赖:**
- `core/state/RunState.ts` - 使用 currentStage, currentAct (Story 5.1 已实现)

**被依赖:**
- Story 5.3 (商店场景) - 根据关卡决定商品价格和选项
- Story 4.5 (战斗场景) - 使用关卡配置设置战斗参数
- Story 5.5 (游戏结束) - 判断是否完成最终 Boss

## 实现任务

### Task 1: 关卡配置类型定义 (AC: #1, #5, #7) ✅

创建 `src/systems/stage/StageConfig.ts`:

```typescript
// ============================================
// 打字肉鸽 - StageConfig 关卡配置类型
// ============================================
// Story 5.2 Task 1: 关卡配置类型定义

/**
 * 单个关卡配置
 */
export interface StageConfig {
  /** 关卡编号 (1-8) */
  id: number

  /** 关卡名称 */
  name: string

  /** 所属幕数 (1-3) */
  act: number

  /** 是否为 Boss 关卡 */
  isBoss: boolean

  /** 时间限制（秒） */
  timeLimit: number

  /** 需要完成的词语数量 */
  wordCount: number

  /** 词语难度等级 (1-5) */
  wordDifficulty: number

  /** 基础金币奖励 */
  baseGoldReward: number

  /** 分数倍率修正 */
  scoreMultiplier: number

  /** 特殊修饰符（可选） */
  modifiers?: StageModifier[]
}

/**
 * 关卡修饰符类型
 */
export type StageModifier =
  | 'no_error'      // 不允许错误
  | 'time_pressure' // 时间压力（额外减时）
  | 'bonus_combo'   // 连击加成
  | 'boss'          // Boss 战特殊规则

/**
 * 幕信息
 */
export interface ActInfo {
  /** 幕编号 (1-3) */
  id: number

  /** 幕名称 */
  name: string

  /** 包含的关卡编号范围 */
  stages: [number, number]

  /** 幕主题描述 */
  description: string
}

/**
 * 完整关卡配置数据
 */
export interface LevelsData {
  /** 所有关卡配置 */
  stages: StageConfig[]

  /** 幕信息 */
  acts: ActInfo[]

  /** 全局难度设置 */
  globalSettings: {
    /** 基础时间（秒） */
    baseTime: number
    /** 每关递增时间（秒） */
    timeIncrement: number
    /** 词语难度递增率 */
    difficultyScaling: number
  }
}
```

### Task 2: 关卡配置数据 (AC: #1, #2, #3, #4, #5, #7) ✅

创建 `assets/data/levels.json`:

```json
{
  "globalSettings": {
    "baseTime": 60,
    "timeIncrement": 5,
    "difficultyScaling": 0.15
  },
  "acts": [
    {
      "id": 1,
      "name": "初试锋芒",
      "stages": [1, 3],
      "description": "学习基础，熟悉技能系统"
    },
    {
      "id": 2,
      "name": "深入迷宫",
      "stages": [4, 6],
      "description": "挑战升级，策略构筑"
    },
    {
      "id": 3,
      "name": "最终决战",
      "stages": [7, 8],
      "description": "终极考验，击败 Boss"
    }
  ],
  "stages": [
    {
      "id": 1,
      "name": "起点",
      "act": 1,
      "isBoss": false,
      "timeLimit": 60,
      "wordCount": 15,
      "wordDifficulty": 1,
      "baseGoldReward": 50,
      "scoreMultiplier": 1.0,
      "modifiers": []
    },
    {
      "id": 2,
      "name": "初探",
      "act": 1,
      "isBoss": false,
      "timeLimit": 65,
      "wordCount": 18,
      "wordDifficulty": 1,
      "baseGoldReward": 60,
      "scoreMultiplier": 1.0,
      "modifiers": []
    },
    {
      "id": 3,
      "name": "热身",
      "act": 1,
      "isBoss": false,
      "timeLimit": 70,
      "wordCount": 20,
      "wordDifficulty": 2,
      "baseGoldReward": 75,
      "scoreMultiplier": 1.1,
      "modifiers": []
    },
    {
      "id": 4,
      "name": "跃进",
      "act": 2,
      "isBoss": false,
      "timeLimit": 75,
      "wordCount": 22,
      "wordDifficulty": 2,
      "baseGoldReward": 90,
      "scoreMultiplier": 1.2,
      "modifiers": []
    },
    {
      "id": 5,
      "name": "挑战",
      "act": 2,
      "isBoss": false,
      "timeLimit": 80,
      "wordCount": 25,
      "wordDifficulty": 3,
      "baseGoldReward": 110,
      "scoreMultiplier": 1.3,
      "modifiers": ["time_pressure"]
    },
    {
      "id": 6,
      "name": "险境",
      "act": 2,
      "isBoss": false,
      "timeLimit": 85,
      "wordCount": 28,
      "wordDifficulty": 3,
      "baseGoldReward": 130,
      "scoreMultiplier": 1.4,
      "modifiers": ["time_pressure"]
    },
    {
      "id": 7,
      "name": "巅峰",
      "act": 3,
      "isBoss": false,
      "timeLimit": 90,
      "wordCount": 30,
      "wordDifficulty": 4,
      "baseGoldReward": 150,
      "scoreMultiplier": 1.5,
      "modifiers": ["time_pressure", "bonus_combo"]
    },
    {
      "id": 8,
      "name": "终极审判",
      "act": 3,
      "isBoss": true,
      "timeLimit": 120,
      "wordCount": 40,
      "wordDifficulty": 5,
      "baseGoldReward": 300,
      "scoreMultiplier": 2.0,
      "modifiers": ["boss", "no_error"]
    }
  ]
}
```

### Task 3: StageManager 实现 (AC: #6) ✅

创建 `src/systems/stage/StageManager.ts`:

```typescript
// ============================================
// 打字肉鸽 - StageManager 关卡管理器
// ============================================
// Story 5.2 Task 3: 关卡管理器实现

import { StageConfig, ActInfo, LevelsData } from './StageConfig'

/**
 * 关卡管理器
 *
 * 职责:
 * - 加载和缓存关卡配置数据
 * - 提供关卡查询接口
 * - 计算难度参数
 */
export class StageManager {
  private data: LevelsData | null = null
  private stageMap: Map<number, StageConfig> = new Map()
  private actMap: Map<number, ActInfo> = new Map()

  /**
   * 加载关卡配置数据
   * @param levelsData 关卡配置 JSON 数据
   */
  load(levelsData: LevelsData): void {
    this.data = levelsData

    // 建立索引
    this.stageMap.clear()
    for (const stage of levelsData.stages) {
      this.stageMap.set(stage.id, stage)
    }

    this.actMap.clear()
    for (const act of levelsData.acts) {
      this.actMap.set(act.id, act)
    }
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.data !== null
  }

  /**
   * 获取关卡配置
   * @param stageId 关卡编号 (1-8)
   * @returns 关卡配置，不存在返回 undefined
   */
  getStage(stageId: number): StageConfig | undefined {
    return this.stageMap.get(stageId)
  }

  /**
   * 获取所有关卡配置
   */
  getAllStages(): readonly StageConfig[] {
    return this.data?.stages || []
  }

  /**
   * 获取幕信息
   * @param actId 幕编号 (1-3)
   */
  getAct(actId: number): ActInfo | undefined {
    return this.actMap.get(actId)
  }

  /**
   * 获取指定幕的所有关卡
   * @param actId 幕编号 (1-3)
   */
  getStagesInAct(actId: number): StageConfig[] {
    const act = this.actMap.get(actId)
    if (!act) return []

    const [start, end] = act.stages
    return this.data?.stages.filter(s => s.id >= start && s.id <= end) || []
  }

  /**
   * 获取总关卡数
   */
  getTotalStages(): number {
    return this.data?.stages.length || 0
  }

  /**
   * 获取总幕数
   */
  getTotalActs(): number {
    return this.data?.acts.length || 0
  }

  /**
   * 检查是否为 Boss 关卡
   */
  isBossStage(stageId: number): boolean {
    return this.stageMap.get(stageId)?.isBoss || false
  }

  /**
   * 检查是否为最终关卡
   */
  isFinalStage(stageId: number): boolean {
    return stageId === this.getTotalStages()
  }

  /**
   * 获取关卡所属幕
   */
  getActForStage(stageId: number): number {
    return this.stageMap.get(stageId)?.act || 1
  }

  /**
   * 计算关卡实际时间限制（考虑全局设置）
   */
  getEffectiveTimeLimit(stageId: number): number {
    const stage = this.stageMap.get(stageId)
    if (!stage) return 60

    // 如果关卡有自定义时间，使用自定义值
    if (stage.timeLimit > 0) {
      return stage.timeLimit
    }

    // 否则使用全局计算
    const settings = this.data?.globalSettings
    if (!settings) return 60

    return settings.baseTime + (stageId - 1) * settings.timeIncrement
  }

  /**
   * 计算关卡词语难度（1-5 映射到实际参数）
   */
  getWordDifficultyParams(stageId: number): {
    minLength: number
    maxLength: number
    complexity: number
  } {
    const stage = this.stageMap.get(stageId)
    const difficulty = stage?.wordDifficulty || 1

    // 难度等级映射
    const params = {
      1: { minLength: 3, maxLength: 5, complexity: 0.2 },
      2: { minLength: 4, maxLength: 6, complexity: 0.4 },
      3: { minLength: 5, maxLength: 7, complexity: 0.6 },
      4: { minLength: 5, maxLength: 8, complexity: 0.8 },
      5: { minLength: 6, maxLength: 10, complexity: 1.0 }
    }

    return params[difficulty as keyof typeof params] || params[1]
  }

  /**
   * 检查关卡是否有特定修饰符
   */
  hasModifier(stageId: number, modifier: string): boolean {
    const stage = this.stageMap.get(stageId)
    return stage?.modifiers?.includes(modifier as any) || false
  }

  /**
   * 获取全局设置
   */
  getGlobalSettings() {
    return this.data?.globalSettings || {
      baseTime: 60,
      timeIncrement: 5,
      difficultyScaling: 0.15
    }
  }
}

// 单例导出
export const stageManager = new StageManager()
```

### Task 4: 模块导出 ✅

创建 `src/systems/stage/index.ts`:

```typescript
// ============================================
// 打字肉鸽 - Stage 模块导出
// ============================================
// Story 5.2 Task 4: 模块导出

export { StageManager, stageManager } from './StageManager'
export type {
  StageConfig,
  ActInfo,
  LevelsData,
  StageModifier
} from './StageConfig'
```

### Task 5: 单元测试 ✅

创建 `tests/unit/systems/stage/StageManager.test.ts`:

**测试用例:**

- **加载测试**
  - load() 应正确解析关卡数据
  - isLoaded() 未加载时返回 false
  - isLoaded() 加载后返回 true

- **关卡查询测试**
  - getStage() 返回正确的关卡配置
  - getStage() 不存在的关卡返回 undefined
  - getAllStages() 返回所有 8 个关卡
  - getTotalStages() 返回 8

- **幕查询测试**
  - getAct() 返回正确的幕信息
  - getStagesInAct(1) 返回关卡 1-3
  - getStagesInAct(2) 返回关卡 4-6
  - getStagesInAct(3) 返回关卡 7-8
  - getTotalActs() 返回 3
  - getActForStage() 返回正确的幕编号

- **Boss 关卡测试**
  - isBossStage(8) 返回 true
  - isBossStage(1-7) 返回 false
  - isFinalStage(8) 返回 true
  - isFinalStage(7) 返回 false

- **难度参数测试**
  - getEffectiveTimeLimit() 返回正确的时间
  - getWordDifficultyParams() 返回正确的难度映射
  - 难度 1 的词语长度 3-5
  - 难度 5 的词语长度 6-10

- **修饰符测试**
  - hasModifier() 正确检测修饰符
  - Stage 8 有 'boss' 和 'no_error' 修饰符
  - Stage 5 有 'time_pressure' 修饰符

预计新增测试: ~25 个

## 测试计划

### 单元测试 (vitest)

- `StageManager.test.ts`: 关卡管理逻辑 (~25 tests)

### 集成测试

手动验证:
1. 加载 levels.json 并验证解析正确
2. 遍历所有关卡验证配置完整性
3. 验证 Act 边界正确 (1-3, 4-6, 7-8)
4. 验证 Boss 关卡特殊配置

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 5.1 (Run 状态管理):**
- RunState 已实现 currentStage, currentAct, advanceStage(), isBossStage()
- 幕数判断逻辑: Stage 1-3 → Act 1, Stage 4-6 → Act 2, Stage 7-8 → Act 3
- 使用 Readonly<T> 保护状态数据
- 单例模式 (stageManager) 便于全局访问

**从 Story 4.5 (战斗流程):**
- BattleFlowController 需要关卡配置设置战斗参数
- 时间限制、词语数量、难度等级从 StageConfig 获取

### 技术要点

1. **数据驱动**: 所有关卡参数在 JSON 配置，便于调整平衡
2. **单例模式**: stageManager 全局单例，启动时加载一次
3. **索引优化**: 使用 Map 加速关卡/幕查询
4. **难度映射**: wordDifficulty (1-5) 映射到具体词语参数
5. **修饰符系统**: 为特殊关卡（如 Boss）添加规则修饰

### 与 RunState 的集成

```typescript
// 战斗场景初始化时
const currentStage = runState.getCurrentStage()
const stageConfig = stageManager.getStage(currentStage)

// 设置战斗参数
battleState.setTimeLimit(stageConfig.timeLimit)
battleState.setWordCount(stageConfig.wordCount)

// 战斗结束后
if (runState.isBossStage() && result === 'win') {
  // 显示胜利画面
} else {
  runState.advanceStage()
  // 进入商店
}
```

### 与后续 Story 的接口

```typescript
// Story 5.3 (商店场景) 将使用:
const currentStage = runState.getCurrentStage()
const stageConfig = stageManager.getStage(currentStage)
const shopPriceMultiplier = 1 + (currentStage - 1) * 0.1

// Story 4.5 (战斗场景) 将使用:
const config = stageManager.getStage(runState.getCurrentStage())
const timeLimit = config.timeLimit
const wordDifficulty = stageManager.getWordDifficultyParams(config.id)

// Story 5.5 (游戏结束) 将使用:
if (stageManager.isFinalStage(runState.getCurrentStage())) {
  // 显示通关画面
}
```

### 项目结构对齐

```
src/
├── systems/
│   ├── stage/                    # 新建目录
│   │   ├── StageManager.ts       # 新建
│   │   ├── StageConfig.ts        # 新建
│   │   └── index.ts              # 新建
assets/
├── data/
│   └── levels.json               # 新建

tests/
├── unit/
│   └── systems/
│       └── stage/
│           └── StageManager.test.ts  # 新建
```

### 难度曲线设计

| Stage | Act | 时间 | 词数 | 难度 | 金币 | 特殊 |
|-------|-----|------|------|------|------|------|
| 1 | 1 | 60s | 15 | 1 | 50 | - |
| 2 | 1 | 65s | 18 | 1 | 60 | - |
| 3 | 1 | 70s | 20 | 2 | 75 | - |
| 4 | 2 | 75s | 22 | 2 | 90 | - |
| 5 | 2 | 80s | 25 | 3 | 110 | time_pressure |
| 6 | 2 | 85s | 28 | 3 | 130 | time_pressure |
| 7 | 3 | 90s | 30 | 4 | 150 | time_pressure, bonus_combo |
| 8 | 3 | 120s | 40 | 5 | 300 | boss, no_error |

### References

- [game-architecture.md - Roguelike 循环](../game-architecture.md#roguelike-循环)
- [game-architecture.md - Project Structure](../game-architecture.md#project-structure)
- [epics.md - Story 5.2](../epics.md#story-52-关卡进度系统)
- [Story 5.1 - Run 状态管理](./5-1-run-state-management.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Task 1 (类型定义)**: 创建 `src/systems/stage/StageConfig.ts`，定义:
   - `StageConfig` 接口 - 单个关卡配置（id, name, act, isBoss, timeLimit, wordCount, wordDifficulty, baseGoldReward, scoreMultiplier, modifiers）
   - `StageModifier` 类型 - 关卡修饰符（no_error, time_pressure, bonus_combo, boss）
   - `ActInfo` 接口 - 幕信息
   - `LevelsData` 接口 - 完整配置数据
   - `GlobalSettings` 接口 - 全局难度设置
   - `WordDifficultyParams` 接口 - 词语难度参数

2. **Task 2 (配置数据)**: 创建 `assets/data/levels.json`，定义:
   - 8 个关卡配置（Stage 1-8）
   - 3 个幕信息（Act 1-3）
   - 全局设置（baseTime: 60, timeIncrement: 5, difficultyScaling: 0.15）
   - 难度递增曲线：时间 60-120s，词数 15-40，难度 1-5
   - Boss 关卡特殊配置：isBoss: true, modifiers: ["boss", "no_error"]

3. **Task 3 (StageManager)**: 创建 `src/systems/stage/StageManager.ts`，实现:
   - load()/isLoaded()/reset() - 数据加载和状态管理
   - getStage()/getAllStages()/getTotalStages() - 关卡查询
   - getAct()/getAllActs()/getTotalActs()/getStagesInAct()/getActForStage() - 幕查询
   - isBossStage()/isFinalStage() - Boss 和最终关卡检测
   - getEffectiveTimeLimit()/getWordDifficultyParams() - 难度参数计算
   - hasModifier()/getModifiers() - 修饰符检测
   - getGlobalSettings() - 全局设置
   - 单例导出 `stageManager`

4. **Task 4 (模块导出)**: 创建 `src/systems/stage/index.ts`，导出所有公共 API 和类型

5. **Task 5 (单元测试)**: 创建 `src/tests/unit/systems/stage/StageManager.test.ts`，包含 44 个测试:
   - 加载测试 (3 tests)
   - 关卡查询测试 (5 tests)
   - 幕查询测试 (10 tests)
   - Boss 关卡测试 (6 tests)
   - 难度参数测试 (7 tests)
   - 修饰符测试 (5 tests)
   - 全局设置测试 (2 tests)
   - 关卡配置完整性测试 (4 tests)

6. **测试结果**: 493 个测试全部通过（新增 44 个）

7. **Code Review 修复**:
   - 修复 getStagesInAct() 返回结果按 id 升序排列
   - 添加 getAllActs() 测试覆盖
   - 更新 Story 文件路径与实际目录结构一致

### File List

**New Files:**
- `src/src/systems/stage/StageConfig.ts`
- `src/src/systems/stage/StageManager.ts`
- `src/src/systems/stage/index.ts`
- `src/assets/data/levels.json`
- `src/tests/unit/systems/stage/StageManager.test.ts`

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-17 | 创建 Story 5.2 关卡进度系统文档 |
| 2026-02-17 | 完成所有任务实现，491 测试通过，状态更新为 review |
