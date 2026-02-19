# Story 1.2: 词语匹配器

Status: done

## Story

As a **玩家**,
I want **系统能准确检测我输入的每个字符是否正确**,
so that **我能获得即时反馈，知道打字是否正确**.

## Acceptance Criteria

1. **AC1:** 逐字符匹配当前词语，跟踪输入进度
2. **AC2:** 正确输入时发出 `word:correct` 事件
3. **AC3:** 错误输入时发出 `word:error` 事件
4. **AC4:** 词语完成时发出 `word:complete` 事件，包含完成统计
5. **AC5:** 支持重置当前词语状态
6. **AC6:** 与 InputHandler 通过 EventBus 解耦

## Tasks / Subtasks

- [x] **Task 1: 创建 WordMatcher 类** (AC: 1, 5)
  - [x] 1.1 创建 `src/systems/typing/WordMatcher.ts`
  - [x] 1.2 实现 setWord(word) 设置当前词语
  - [x] 1.3 实现 getCurrentIndex() 获取当前进度
  - [x] 1.4 实现 reset() 重置状态

- [x] **Task 2: 实现字符匹配逻辑** (AC: 2, 3)
  - [x] 2.1 实现 matchChar(char) 方法
  - [x] 2.2 正确时推进索引并发出 word:correct
  - [x] 2.3 错误时发出 word:error（不推进索引）
  - [x] 2.4 跟踪错误计数

- [x] **Task 3: 实现词语完成检测** (AC: 4)
  - [x] 3.1 检测最后一个字符完成
  - [x] 3.2 发出 word:complete 事件，包含统计数据
  - [x] 3.3 计算完成时间和准确率 (getCompleteStats)

- [x] **Task 4: EventBus 集成** (AC: 6)
  - [x] 4.1 订阅 input:keypress 事件 (handleKeyPress)
  - [x] 4.2 自动调用 matchChar
  - [x] 4.3 支持启用/禁用匹配 (enable/disable)

- [x] **Task 5: 集成验证** (AC: 1-6)
  - [x] 5.1 WordMatcher 作为独立模块可用
  - [x] 5.2 现有 battle.ts 逻辑保持兼容
  - [x] 5.3 TypeScript 编译通过

## Dev Notes

### 架构约束

- **位置:** `src/systems/typing/WordMatcher.ts`
- **依赖:** `core/events/EventBus.ts`
- **模式:** 事件驱动，与 InputHandler 解耦

### 关键实现细节

```typescript
interface WordMatchState {
  word: string
  index: number
  errors: number
  startTime: number
  perfect: boolean
}

class WordMatcher {
  private state: WordMatchState | null = null

  setWord(word: string): void {
    this.state = {
      word: word.toUpperCase(),
      index: 0,
      errors: 0,
      startTime: performance.now(),
      perfect: true
    }
  }

  matchChar(char: string): 'correct' | 'error' | 'complete' {
    if (!this.state) return 'error'

    const expected = this.state.word[this.state.index]
    if (char.toUpperCase() === expected) {
      this.state.index++
      if (this.state.index >= this.state.word.length) {
        return 'complete'
      }
      return 'correct'
    } else {
      this.state.errors++
      this.state.perfect = false
      return 'error'
    }
  }
}
```

### Project Structure Notes

- 扩展 `src/systems/typing/` 模块
- 更新 index.ts 导出

### References

- [Source: docs/game-architecture.md#Event System] - 事件驱动架构
- [Source: docs/project-context.md#Typing System] - 打字系统要求
- [Source: docs/epics.md#Story 1.2] - 验收标准定义
- [Source: src/systems/battle.ts#L74-92] - 现有匹配逻辑参考

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript 编译: 无错误

### Completion Notes List

1. 创建了 WordMatcher 类，实现逐字符匹配
2. 支持 setWord, matchChar, reset 等核心方法
3. 实现 getCompleteStats 计算完成统计（时间、错误、准确率）
4. 支持 enable/disable 自动订阅 EventBus
5. 与现有 battle.ts 保持兼容，可逐步迁移

### File List

**Created:**
- `src/systems/typing/WordMatcher.ts` - 词语匹配器

**Modified:**
- `src/systems/typing/index.ts` - 添加 WordMatcher 导出
