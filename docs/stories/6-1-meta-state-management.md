---
title: "Story 6.1: Meta 状态管理"
epic: "Epic 6: Meta 系统"
story_key: "6-1-meta-state-management"
status: "done"
created: "2026-02-17"
depends_on:
  - "5-5-game-over-flow"
---

# Story 6.1: Meta 状态管理

## 概述

实现 MetaState 类管理跨 Run 的永久数据，包括解锁技能列表、成就进度和统计数据。这是 Epic 6 (Meta 系统) 的基础 Story，为后续的存档系统、解锁系统和图鉴场景提供数据支撑。

## Story

作为一个 **玩家**，
我想要 **在多次游戏之间保留永久进度数据**，
以便 **看到我的总体成就和解锁的内容，获得持续的成长感**。

## 验收标准

- [x] AC1: MetaState 类管理解锁技能列表 (unlockedSkills: Set<string>)
- [x] AC2: MetaState 类管理解锁遗物列表 (unlockedRelics: Set<string>)
- [x] AC3: MetaState 类管理成就进度 (achievements: Map<string, AchievementProgress>)
- [x] AC4: MetaState 类管理统计数据 (stats: MetaStats)
- [x] AC5: 统计数据包含: 总局数、胜利局数、最高分、总游戏时间、总击键数、总词语数
- [x] AC6: 提供 unlockSkill(skillId) 方法解锁技能
- [x] AC7: 提供 unlockRelic(relicId) 方法解锁遗物
- [x] AC8: 提供 updateStats(runResult) 方法更新统计数据
- [x] AC9: 提供 isSkillUnlocked(skillId) / isRelicUnlocked(relicId) 查询方法
- [x] AC10: 提供 serialize() / deserialize() 方法支持存档（为 Story 6.2 预留）
- [x] AC11: 初始化时包含基础技能和遗物的默认解锁状态
- [x] AC12: 响应 meta:check_unlocks 事件，检查并触发解锁（为 Story 6.3 预留接口）

## 技术说明

### 文件位置

- `src/src/core/state/MetaState.ts` - Meta 状态管理类（新建）
- `src/src/core/state/index.ts` - 模块导出（修改）
- `src/tests/unit/core/state/MetaState.test.ts` - 单元测试（新建）

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
    this.meta.checkUnlocks(this.run)  // ← Story 6.1 实现此方法
    this.save()
  }
}
```

```
game-architecture.md - Meta Progression:

- Meta 层：跨 Run 持久，存档到文件
- 解锁技能列表
- 成就进度
- 统计数据 (总局数、最高分等)
```

```
gdd.md - Meta 解锁系统:

| 解锁方式 | 内容 | 设计意图 |
|----------|------|----------|
| Build 成就 | 特定组合通关解锁相关技能 | 鼓励尝试不同玩法 |
| 里程碑 | 首次通关各 Act 解锁基础内容 | 保证进度感 |
| 挑战完成 | Ascension 等级解锁高级内容 | 硬核玩家目标 |
```

```
gdd.md - 图鉴系统:

- 技能图鉴：已解锁/未解锁（灰色剪影）
- 遗物图鉴：显示获取条件
- 成就墙：展示达成记录
```

### 依赖关系

**依赖:**
- `core/events/EventBus.ts` - 事件通信，响应 meta:check_unlocks
- Story 5.5 定义的 `meta:check_unlocks` 事件

**被依赖:**
- Story 6.2 (存档系统) - 使用 serialize/deserialize 方法
- Story 6.3 (解锁系统) - 扩展 checkUnlocks 逻辑
- Story 6.4 (图鉴场景) - 读取解锁状态显示

### 项目结构参考

根据前置 Story 经验，实际代码路径为 `src/src/` 而非 `src/renderer/`:

```
src/
├── src/
│   ├── core/
│   │   ├── state/
│   │   │   ├── MetaState.ts       ← 本 Story 新建
│   │   │   ├── RunState.ts        ← 已存在
│   │   │   ├── BattleState.ts     ← 已存在
│   │   │   └── index.ts           ← 修改
│   │   └── events/
│   │       └── EventBus.ts        ← 已有 meta:check_unlocks 事件
```

## 实现任务

### [x] Task 1: MetaStats 接口定义 (AC: #4, #5)

创建统计数据相关类型:

```typescript
// src/src/core/state/MetaState.ts

/**
 * Meta 统计数据
 */
export interface MetaStats {
  totalRuns: number           // 总局数
  victories: number           // 胜利局数
  highestScore: number        // 最高分
  totalPlayTime: number       // 总游戏时间（毫秒）
  totalKeystrokes: number     // 总击键数
  totalWordsCompleted: number // 总完成词语数
  longestCombo: number        // 历史最高连击
  perfectRunCount: number     // 完美通关次数（无失败关卡）
}

/**
 * 成就进度
 */
export interface AchievementProgress {
  id: string
  name: string
  progress: number      // 当前进度值
  target: number        // 目标值
  unlocked: boolean     // 是否已解锁
  unlockedAt?: number   // 解锁时间戳
}
```

### [x] Task 2: MetaState 核心实现 (AC: #1, #2, #3, #4, #11)

```typescript
// src/src/core/state/MetaState.ts

import { eventBus } from '../events/EventBus'

/**
 * 默认解锁的技能（基础技能池）
 * 参考 gdd.md: 新手期解锁基础技能池(10个)
 */
const DEFAULT_UNLOCKED_SKILLS = [
  'score_boost',      // 分数加成
  'time_extend',      // 时间延长
  'combo_shield',     // 连击护盾
  'aura_basic',       // 基础光环
  'core_basic',       // 基础核心
]

/**
 * 默认解锁的遗物
 * 参考 gdd.md: 新手期解锁基础遗物(5个)
 */
const DEFAULT_UNLOCKED_RELICS = [
  'lucky_coin',       // 幸运硬币
  'speed_ring',       // 速度戒指
]

/**
 * MetaState - 管理跨 Run 的永久数据
 *
 * 职责:
 * - 管理解锁技能/遗物列表
 * - 管理成就进度
 * - 管理全局统计数据
 * - 支持序列化/反序列化（存档）
 */
export class MetaState {
  private unlockedSkills: Set<string>
  private unlockedRelics: Set<string>
  private achievements: Map<string, AchievementProgress>
  private stats: MetaStats

  constructor() {
    // 初始化默认解锁
    this.unlockedSkills = new Set(DEFAULT_UNLOCKED_SKILLS)
    this.unlockedRelics = new Set(DEFAULT_UNLOCKED_RELICS)
    this.achievements = new Map()
    this.stats = this.createDefaultStats()

    // 监听 meta:check_unlocks 事件
    this.setupEventListeners()
  }

  private createDefaultStats(): MetaStats {
    return {
      totalRuns: 0,
      victories: 0,
      highestScore: 0,
      totalPlayTime: 0,
      totalKeystrokes: 0,
      totalWordsCompleted: 0,
      longestCombo: 0,
      perfectRunCount: 0,
    }
  }

  private setupEventListeners(): void {
    eventBus.on('meta:check_unlocks', (data) => {
      this.checkUnlocks(data)
    })
  }
}
```

### [x] Task 3: 解锁方法实现 (AC: #6, #7, #9)

```typescript
// MetaState 类继续

/**
 * 解锁技能
 * @returns true 如果是新解锁，false 如果已解锁
 */
unlockSkill(skillId: string): boolean {
  if (this.unlockedSkills.has(skillId)) {
    return false
  }
  this.unlockedSkills.add(skillId)
  eventBus.emit('meta:skill_unlocked', { skillId })
  return true
}

/**
 * 解锁遗物
 * @returns true 如果是新解锁，false 如果已解锁
 */
unlockRelic(relicId: string): boolean {
  if (this.unlockedRelics.has(relicId)) {
    return false
  }
  this.unlockedRelics.add(relicId)
  eventBus.emit('meta:relic_unlocked', { relicId })
  return true
}

/**
 * 检查技能是否已解锁
 */
isSkillUnlocked(skillId: string): boolean {
  return this.unlockedSkills.has(skillId)
}

/**
 * 检查遗物是否已解锁
 */
isRelicUnlocked(relicId: string): boolean {
  return this.unlockedRelics.has(relicId)
}

/**
 * 获取所有已解锁技能
 */
getUnlockedSkills(): string[] {
  return Array.from(this.unlockedSkills)
}

/**
 * 获取所有已解锁遗物
 */
getUnlockedRelics(): string[] {
  return Array.from(this.unlockedRelics)
}
```

### [x] Task 4: 统计更新方法 (AC: #8)

```typescript
// MetaState 类继续

/**
 * Run 结果数据（来自 meta:check_unlocks 事件）
 */
export interface RunResultData {
  runResult: 'victory' | 'gameover'
  runStats: {
    totalScore: number
    totalTime?: number
    stagesCleared: number
    maxCombo: number
    perfectWords?: number
    keystrokes?: number
    wordsCompleted?: number
    skills: string[]
    relics: string[]
  }
}

/**
 * 更新统计数据
 */
updateStats(data: RunResultData): void {
  const { runResult, runStats } = data

  // 更新 Run 计数
  this.stats.totalRuns++
  if (runResult === 'victory') {
    this.stats.victories++
    // 检查是否完美通关（全部 8 关）
    if (runStats.stagesCleared === 8) {
      this.stats.perfectRunCount++
    }
  }

  // 更新最高分
  if (runStats.totalScore > this.stats.highestScore) {
    this.stats.highestScore = runStats.totalScore
  }

  // 更新游戏时间
  if (runStats.totalTime) {
    this.stats.totalPlayTime += runStats.totalTime
  }

  // 更新击键数
  if (runStats.keystrokes) {
    this.stats.totalKeystrokes += runStats.keystrokes
  }

  // 更新词语数
  if (runStats.wordsCompleted) {
    this.stats.totalWordsCompleted += runStats.wordsCompleted
  }

  // 更新最高连击
  if (runStats.maxCombo > this.stats.longestCombo) {
    this.stats.longestCombo = runStats.maxCombo
  }
}

/**
 * 获取统计数据副本
 */
getStats(): MetaStats {
  return { ...this.stats }
}
```

### [x] Task 5: 解锁检查方法 (AC: #12)

```typescript
// MetaState 类继续

/**
 * 检查并触发解锁
 * 此方法在 Run 结束时调用，检查是否满足解锁条件
 *
 * 注意：具体解锁规则将在 Story 6.3 中实现
 * 此处只提供接口和基础框架
 */
checkUnlocks(data: RunResultData): void {
  // 1. 更新统计数据
  this.updateStats(data)

  // 2. 检查解锁条件（Story 6.3 实现具体逻辑）
  // 此处只是预留接口，暂时为空实现

  // 3. 发送统计更新事件
  eventBus.emit('meta:stats_updated', { stats: this.getStats() })
}
```

### [x] Task 6: 序列化方法 (AC: #10)

```typescript
// MetaState 类继续

/**
 * 序列化为可存储格式
 */
serialize(): string {
  const data = {
    version: 1,  // 存档版本号，便于后续迁移
    unlockedSkills: Array.from(this.unlockedSkills),
    unlockedRelics: Array.from(this.unlockedRelics),
    achievements: Array.from(this.achievements.entries()),
    stats: this.stats,
  }
  return JSON.stringify(data)
}

/**
 * 从存档数据反序列化
 */
deserialize(json: string): void {
  try {
    const data = JSON.parse(json)

    // 版本检查（预留迁移逻辑）
    if (data.version !== 1) {
      console.warn(`MetaState: Unknown save version ${data.version}, attempting to load anyway`)
    }

    this.unlockedSkills = new Set(data.unlockedSkills || DEFAULT_UNLOCKED_SKILLS)
    this.unlockedRelics = new Set(data.unlockedRelics || DEFAULT_UNLOCKED_RELICS)
    this.achievements = new Map(data.achievements || [])
    this.stats = { ...this.createDefaultStats(), ...data.stats }
  } catch (error) {
    console.error('MetaState: Failed to deserialize save data', error)
    // 保持当前状态不变
  }
}

/**
 * 重置为默认状态（用于开发/测试）
 */
reset(): void {
  this.unlockedSkills = new Set(DEFAULT_UNLOCKED_SKILLS)
  this.unlockedRelics = new Set(DEFAULT_UNLOCKED_RELICS)
  this.achievements = new Map()
  this.stats = this.createDefaultStats()
}
```

### [x] Task 7: 成就相关方法 (AC: #3)

```typescript
// MetaState 类继续

/**
 * 获取成就进度
 */
getAchievement(achievementId: string): AchievementProgress | undefined {
  return this.achievements.get(achievementId)
}

/**
 * 获取所有成就
 */
getAllAchievements(): AchievementProgress[] {
  return Array.from(this.achievements.values())
}

/**
 * 更新成就进度
 * @returns true 如果成就刚刚解锁
 */
updateAchievementProgress(achievementId: string, progress: number): boolean {
  const achievement = this.achievements.get(achievementId)
  if (!achievement) {
    return false
  }

  const wasUnlocked = achievement.unlocked
  achievement.progress = Math.min(progress, achievement.target)

  // 检查是否达成
  if (!wasUnlocked && achievement.progress >= achievement.target) {
    achievement.unlocked = true
    achievement.unlockedAt = Date.now()
    eventBus.emit('meta:achievement_unlocked', { achievement })
    return true
  }

  return false
}

/**
 * 注册成就（供外部模块调用）
 */
registerAchievement(achievement: Omit<AchievementProgress, 'unlocked' | 'progress'>): void {
  if (!this.achievements.has(achievement.id)) {
    this.achievements.set(achievement.id, {
      ...achievement,
      progress: 0,
      unlocked: false,
    })
  }
}
```

### [x] Task 8: 事件类型扩展

更新 `src/src/core/events/EventBus.ts` 添加新事件类型:

```typescript
// 添加到 GameEvents 接口:

// Meta 解锁通知
'meta:skill_unlocked': {
  skillId: string
}

'meta:relic_unlocked': {
  relicId: string
}

'meta:achievement_unlocked': {
  achievement: AchievementProgress
}

'meta:stats_updated': {
  stats: MetaStats
}
```

### [x] Task 9: 模块导出

更新 `src/src/core/state/index.ts`:

```typescript
export { MetaState } from './MetaState'
export type { MetaStats, AchievementProgress, RunResultData } from './MetaState'
```

### [x] Task 10: 单元测试 (AC: 全部)

创建 `tests/unit/core/state/MetaState.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MetaState } from '../../../../src/src/core/state/MetaState'
import { eventBus } from '../../../../src/src/core/events/EventBus'

describe('MetaState', () => {
  let metaState: MetaState

  beforeEach(() => {
    metaState = new MetaState()
  })

  describe('初始化', () => {
    it('应包含默认解锁的技能', () => {
      expect(metaState.isSkillUnlocked('score_boost')).toBe(true)
    })

    it('应包含默认解锁的遗物', () => {
      expect(metaState.isRelicUnlocked('lucky_coin')).toBe(true)
    })

    it('应有初始统计数据全为零', () => {
      const stats = metaState.getStats()
      expect(stats.totalRuns).toBe(0)
      expect(stats.victories).toBe(0)
      expect(stats.highestScore).toBe(0)
    })
  })

  describe('解锁技能', () => {
    it('应能解锁新技能', () => {
      const result = metaState.unlockSkill('new_skill')
      expect(result).toBe(true)
      expect(metaState.isSkillUnlocked('new_skill')).toBe(true)
    })

    it('重复解锁应返回 false', () => {
      metaState.unlockSkill('new_skill')
      const result = metaState.unlockSkill('new_skill')
      expect(result).toBe(false)
    })

    it('解锁时应发送事件', () => {
      const handler = vi.fn()
      eventBus.on('meta:skill_unlocked', handler)
      metaState.unlockSkill('new_skill')
      expect(handler).toHaveBeenCalledWith({ skillId: 'new_skill' })
    })
  })

  describe('统计更新', () => {
    it('应更新 Run 计数', () => {
      metaState.updateStats({
        runResult: 'victory',
        runStats: {
          totalScore: 1000,
          stagesCleared: 8,
          maxCombo: 50,
          skills: [],
          relics: []
        }
      })
      expect(metaState.getStats().totalRuns).toBe(1)
      expect(metaState.getStats().victories).toBe(1)
    })

    it('应更新最高分', () => {
      metaState.updateStats({
        runResult: 'gameover',
        runStats: {
          totalScore: 5000,
          stagesCleared: 3,
          maxCombo: 30,
          skills: [],
          relics: []
        }
      })
      expect(metaState.getStats().highestScore).toBe(5000)
    })
  })

  describe('序列化', () => {
    it('应能序列化和反序列化', () => {
      metaState.unlockSkill('test_skill')
      const json = metaState.serialize()

      const newState = new MetaState()
      newState.deserialize(json)

      expect(newState.isSkillUnlocked('test_skill')).toBe(true)
    })
  })
})
```

## 测试计划

### 单元测试 (vitest)

- `MetaState.test.ts`: MetaState 类测试 (~40 tests)
  - 初始化测试 (5 tests)
  - 技能解锁测试 (8 tests)
  - 遗物解锁测试 (8 tests)
  - 统计更新测试 (10 tests)
  - 序列化测试 (5 tests)
  - 成就测试 (4 tests)

### 集成测试

手动验证:
1. meta:check_unlocks 事件触发后正确更新统计
2. 解锁事件正确发送
3. 序列化数据格式正确
4. 重置功能正常工作

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 5.5 (游戏结束流程):**
- 已定义 meta:check_unlocks 事件，本 Story 需要响应此事件
- 事件数据包含 runResult 和 runStats
- 代码路径为 `src/src/` 不是 `src/renderer/`
- 测试文件放在 `src/tests/unit/` 下（注意：应该是 `tests/unit/`）

**从 Story 5.4 (遗物系统):**
- 使用 Set 管理唯一 ID 集合
- 返回数据时使用浅拷贝防止外部修改
- 事件发送需要完整类型定义

**从 Story 5.1 (Run 状态管理):**
- 状态类应支持 reset() 方法便于测试
- 提供 getXxx() 方法返回数据副本

### 技术要点

1. **默认解锁**: 新玩家需要有基础内容可用，参考 GDD 新手期定义
2. **事件监听**: 在构造函数中设置 eventBus 监听，需要考虑清理
3. **序列化版本**: 添加版本号便于后续存档迁移
4. **成就注册**: 成就定义在外部，通过 registerAchievement 注入

### 关键接口

```typescript
// MetaState 公开方法摘要
interface MetaState {
  // 解锁管理
  unlockSkill(skillId: string): boolean
  unlockRelic(relicId: string): boolean
  isSkillUnlocked(skillId: string): boolean
  isRelicUnlocked(relicId: string): boolean
  getUnlockedSkills(): string[]
  getUnlockedRelics(): string[]

  // 统计管理
  updateStats(data: RunResultData): void
  getStats(): MetaStats

  // 成就管理
  registerAchievement(achievement: ...): void
  updateAchievementProgress(id: string, progress: number): boolean
  getAchievement(id: string): AchievementProgress | undefined
  getAllAchievements(): AchievementProgress[]

  // 解锁检查
  checkUnlocks(data: RunResultData): void

  // 持久化
  serialize(): string
  deserialize(json: string): void
  reset(): void
}
```

### 与其他 Story 的关系

| Story | 关系 |
|-------|------|
| 5.5 | 提供 meta:check_unlocks 事件定义 |
| 6.2 | 使用 serialize/deserialize 实现存档 |
| 6.3 | 扩展 checkUnlocks 实现具体解锁规则 |
| 6.4 | 读取解锁状态显示图鉴 |

### References

- [game-architecture.md - 状态管理](../game-architecture.md#state-management)
- [gdd.md - Meta 解锁系统](../gdd.md#permadeath-and-progression)
- [gdd.md - 图鉴系统](../gdd.md#permadeath-and-progression)
- [epics.md - Story 6.1](../epics.md#story-61-meta-状态管理)
- [Story 5.5 - 游戏结束流程](./5-5-game-over-flow.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Implementation complete**: All 12 acceptance criteria fulfilled
2. **Test coverage**: 61 unit tests covering initialization, skill/relic unlocking, stats updates, serialization, achievements, and event bus integration
3. **Full test suite passes**: 824 total tests with no regressions
4. **Path corrections**: Test file placed in `src/tests/unit/` (not `tests/unit/`) per project structure
5. **Event types added**: 4 new meta events (skill_unlocked, relic_unlocked, achievement_unlocked, stats_updated)
6. **dispose() method**: Added for proper cleanup of event listeners in tests
7. **Version support in serialize**: Added version field for future save migration

### File List

**New Files:**
- `src/src/core/state/MetaState.ts` - MetaState class implementation (382 lines)
- `src/tests/unit/core/state/MetaState.test.ts` - Unit tests (70 tests, 696 lines)

**Modified Files:**
- `src/src/core/events/EventBus.ts` - Added 4 meta event types (lines 115-146)
- `src/src/core/state/index.ts` - Added MetaState exports (lines 14-15)

### Code Review Fixes Applied

**Review Date:** 2026-02-17

**HIGH Severity Fixed:**
- H1: `getAchievement()` 改为返回对象副本，防止外部修改
- H2: `getAllAchievements()` 改为返回深拷贝数组
- H3: 添加 `dispose()` 方法测试（幂等性和事件清理）

**MEDIUM Severity Fixed:**
- M1: File List 行数已更新
- M2: 添加成就序列化往返测试
- M3: `unlockSkill/unlockRelic` 添加空字符串/null 参数验证
- M4: `perfectRunCount` 逻辑添加详细注释说明业务规则

**Tests Added:** 9 new tests (61 → 70 total)

