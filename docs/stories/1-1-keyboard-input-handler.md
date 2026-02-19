# Story 1.1: 键盘输入处理器

Status: done

## Story

As a **玩家**,
I want **按下键盘字母键时游戏立即响应**,
so that **我能获得丝滑的打字体验，感受不到任何延迟**.

## Acceptance Criteria

1. **AC1:** 监听 keydown 事件，仅处理 A-Z 字母键
2. **AC2:** 输入延迟 < 16ms（使用 performance.now() 测量验证）
3. **AC3:** 大小写不敏感匹配（按 'a' 或 'A' 视为相同）
4. **AC4:** 通过 EventBus 发出 `input:keypress` 事件，携带按键信息
5. **AC5:** 支持在战斗状态下启用/禁用输入监听

## Tasks / Subtasks

- [x] **Task 1: 创建 EventBus 基础设施** (AC: 4)
  - [x] 1.1 创建 `src/core/events/EventBus.ts`
  - [x] 1.2 实现 TypedEventBus 类 (on, emit, off, once)
  - [x] 1.3 定义 GameEvents 接口，包含 `input:keypress` 及更多事件类型
  - [x] 1.4 导出单例 eventBus 实例

- [x] **Task 2: 创建 InputHandler 类** (AC: 1, 3, 5)
  - [x] 2.1 创建 `src/systems/typing/InputHandler.ts`
  - [x] 2.2 实现 keydown 事件监听器
  - [x] 2.3 过滤非字母键（只处理 A-Z）
  - [x] 2.4 统一转换为大写处理
  - [x] 2.5 实现 enable()/disable() 方法控制监听状态

- [x] **Task 3: 实现低延迟验证** (AC: 2)
  - [x] 3.1 在 keydown 回调开始处记录 performance.now()
  - [x] 3.2 在事件发出后记录结束时间
  - [x] 3.3 开发模式下输出延迟到控制台
  - [x] 3.4 添加延迟警告（超过 16ms 时 console.warn）

- [x] **Task 4: 集成测试** (AC: 1-5)
  - [x] 4.1 集成到现有 battle.ts
  - [x] 4.2 验证事件正确发出 (word:correct, word:error, word:complete, score:update)
  - [x] 4.3 TypeScript 编译通过，热重载正常

## Dev Notes

### 架构约束

- **位置:** `renderer/systems/typing/InputHandler.ts`
- **依赖:** `core/events/EventBus.ts`
- **模式:** 直接事件监听（非轮询），符合 <16ms 延迟要求

### 关键实现细节

```typescript
// EventBus 事件类型定义
interface GameEvents {
  'input:keypress': { key: string; timestamp: number }
  // ... 其他事件
}

// InputHandler 核心逻辑
class InputHandler {
  private enabled = false

  enable(): void {
    if (this.enabled) return
    this.enabled = true
    document.addEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const start = performance.now()

    // 只处理单个字母键
    if (e.key.length !== 1 || !/[a-zA-Z]/.test(e.key)) return

    const key = e.key.toUpperCase()
    eventBus.emit('input:keypress', { key, timestamp: start })

    // 开发模式延迟检查
    if (import.meta.env.DEV) {
      const latency = performance.now() - start
      if (latency > 16) console.warn(`Input latency: ${latency.toFixed(2)}ms`)
    }
  }
}
```

### 性能要求

- **必须:** 使用直接 addEventListener，不使用轮询
- **必须:** 不在热路径上分配新对象
- **建议:** 使用箭头函数绑定 this，避免 bind() 开销

### Project Structure Notes

- 需先创建 `renderer/core/events/` 目录
- 需先创建 `renderer/systems/typing/` 目录
- 遵循 PascalCase 文件命名

### References

- [Source: docs/game-architecture.md#Performance Rules] - 输入延迟 <16ms
- [Source: docs/game-architecture.md#Event System] - TypedEventBus 模式
- [Source: docs/project-context.md#Input Latency] - 直接事件监听要求
- [Source: docs/epics.md#Story 1.1] - 验收标准定义

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TypeScript 编译: 无错误
- Vite 热重载: 正常
- 开发服务器: http://localhost:5173/

### Completion Notes List

1. 创建了 TypedEventBus，支持类型安全的事件发送/接收
2. 创建了 InputHandler，实现低延迟键盘输入处理
3. 重构了 battle.ts 使用新的 EventBus 架构
4. 添加了 word:correct, word:error, word:complete, score:update 事件
5. 保持了与现有代码的向后兼容性

### File List

**Created:**
- `src/core/events/EventBus.ts` - 类型化事件总线
- `src/core/events/index.ts` - 事件模块导出
- `src/systems/typing/InputHandler.ts` - 键盘输入处理器
- `src/systems/typing/index.ts` - 打字模块导出

**Modified:**
- `src/systems/battle.ts` - 集成 EventBus 和 InputHandler
