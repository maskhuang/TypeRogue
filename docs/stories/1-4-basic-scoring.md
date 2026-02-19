# Story 1.4: 基础计分逻辑

Status: done

## Story

As a **玩家**,
I want **每次正确输入和完成词语时获得分数**,
so that **我能看到自己的打字表现并追求更高分数**.

## Acceptance Criteria

1. **AC1:** 基础分 = 词语长度 × baseScore 常量
2. **AC2:** 应用当前倍率 (multiplier) 到分数计算
3. **AC3:** 连击增加倍率 (combo × comboBonus)
4. **AC4:** 更新 BattleState 中的分数状态
5. **AC5:** 通过 EventBus 发出 `score:update` 事件
6. **AC6:** 提供独立的 ScoreCalculator 模块

## Tasks / Subtasks

- [x] **Task 1: 创建 ScoreCalculator 类** (AC: 1, 2, 6)
  - [x] 1.1 创建 `src/systems/scoring/ScoreCalculator.ts`
  - [x] 1.2 实现 calculateLetterScore() 方法
  - [x] 1.3 实现 calculateWordScore() 方法
  - [x] 1.4 支持自定义计分参数 (ScoreConfig)

- [x] **Task 2: 实现倍率计算** (AC: 2, 3)
  - [x] 2.1 实现 calculateMultiplier(combo, extraBonus)
  - [x] 2.2 支持额外倍率加成 (addMultiplier)

- [x] **Task 3: EventBus 集成** (AC: 5)
  - [x] 3.1 订阅 word:correct 事件
  - [x] 3.2 订阅 word:complete 事件
  - [x] 3.3 发出 score:update 事件

- [x] **Task 4: 状态更新** (AC: 4)
  - [x] 4.1 实现 onCorrectInput, onErrorInput, onWordComplete
  - [x] 4.2 实现 addScore, setCombo 辅助方法

- [x] **Task 5: 集成验证** (AC: 1-6)
  - [x] 5.1 TypeScript 编译通过
  - [x] 5.2 与现有计分逻辑兼容

## Dev Notes

### 架构约束

- **位置:** `src/systems/scoring/ScoreCalculator.ts`
- **依赖:** `core/events/EventBus.ts`, `core/constants.ts`
- **模式:** 纯函数计算 + 事件驱动

### 计分公式

```
字母分 = (1 + letterBonus) × multiplier
词语分 = Σ字母分 + wordBonus
倍率 = baseMultiplier + combo × comboBonus
```

### 关键实现细节

```typescript
interface ScoreConfig {
  baseScore: number      // 基础分
  baseMultiplier: number // 基础倍率
  comboBonus: number     // 连击加成
  letterBonus: number    // 字母加成
  wordBonus: number      // 词语加成
}

class ScoreCalculator {
  calculateLetterScore(multiplier: number, letterBonus: number): number {
    return (1 + letterBonus) * multiplier
  }

  calculateWordScore(wordLength: number, multiplier: number, config: ScoreConfig): number {
    let score = 0
    for (let i = 0; i < wordLength; i++) {
      score += this.calculateLetterScore(multiplier, config.letterBonus)
    }
    return Math.floor(score + config.wordBonus)
  }

  calculateMultiplier(combo: number, baseMultiplier: number, comboBonus: number): number {
    return baseMultiplier + combo * comboBonus
  }
}
```

### References

- [Source: docs/game-architecture.md#State Management] - BattleState
- [Source: docs/epics.md#Story 1.4] - 验收标准
- [Source: src/systems/battle.ts#L94-147] - 现有计分逻辑
- [Source: src/core/constants.ts] - BALANCE 常量

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript 编译: 无错误

### Completion Notes List

1. 创建了 ScoreCalculator 类，实现完整计分逻辑
2. 支持字母分、词语分、倍率计算
3. 实现状态管理 (ScoreState) 和配置 (ScoreConfig)
4. EventBus 集成，支持自动事件处理
5. 提供 addScore, addMultiplier, setCombo 等辅助方法

### File List

**Created:**
- `src/systems/scoring/ScoreCalculator.ts` - 计分器
- `src/systems/scoring/index.ts` - 模块导出
