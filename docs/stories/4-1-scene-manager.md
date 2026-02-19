---
title: "Story 4.1: 场景管理器"
epic: "Epic 4: 战斗场景"
story_key: "4-1-scene-manager"
status: "done"
created: "2026-02-16"
completed: "2026-02-16"
---

# Story 4.1: 场景管理器

## 概述

实现 SceneManager 和 Scene 基类，提供场景栈管理、生命周期控制和场景切换功能。这是战斗场景 Epic 的基础设施，后续所有场景都将基于此实现。

## 验收标准

- [x] Scene 接口定义：onEnter, onExit, onPause, onResume, update, render
- [x] SceneManager 实现：push, pop, replace, current
- [x] 场景栈正确管理生命周期（栈顶活跃，非栈顶暂停）
- [x] 场景切换时正确触发生命周期钩子
- [x] 支持多层场景叠加（如暂停菜单覆盖战斗场景）

## 技术说明

### 文件位置

- `src/scenes/SceneManager.ts` - 场景管理器
- `src/scenes/Scene.ts` - 场景基类/接口

### 架构参考

```
game-architecture.md - Scene Management 章节:

interface Scene {
  onEnter(): void
  onExit(): void
  onPause?(): void   // 被新场景覆盖时
  onResume?(): void  // 恢复到栈顶时
  update(dt: number): void
  render(): void
}

class SceneManager {
  private stack: Scene[] = []

  push(scene: Scene)     // 叠加场景（暂停菜单）
  pop()                  // 返回上一场景
  replace(scene: Scene)  // 替换当前场景
  current(): Scene
}
```

### 依赖关系

- 依赖: `core/events/EventBus.ts` (发送 scene:change 事件)
- 被依赖: 所有场景类 (BattleScene, MenuScene, ShopScene 等)

## 实现任务

### Task 1: Scene 接口定义 ✅

创建 `src/scenes/Scene.ts`:

```typescript
import { Container } from 'pixi.js'

export interface Scene {
  /** 场景名称（用于日志和调试） */
  readonly name: string

  /** PixiJS 容器（场景的根显示对象） */
  readonly container: Container

  /** 场景进入栈顶时调用 */
  onEnter(): void

  /** 场景从栈中移除时调用 */
  onExit(): void

  /** 场景被新场景覆盖时调用（可选） */
  onPause?(): void

  /** 场景恢复到栈顶时调用（可选） */
  onResume?(): void

  /** 每帧更新（仅栈顶场景调用） */
  update(dt: number): void

  /** 渲染（由 PixiJS 自动处理，此方法用于自定义渲染逻辑） */
  render?(): void
}
```

### Task 2: 抽象基类 BaseScene ✅

创建便于继承的抽象基类:

```typescript
import { Container } from 'pixi.js'
import type { Scene } from './Scene'

export abstract class BaseScene implements Scene {
  abstract readonly name: string
  readonly container: Container

  constructor() {
    this.container = new Container()
  }

  onEnter(): void {
    this.container.visible = true
  }

  onExit(): void {
    this.container.visible = false
    this.container.destroy({ children: true })
  }

  onPause(): void {
    // 默认实现：隐藏但不销毁
    this.container.visible = false
  }

  onResume(): void {
    this.container.visible = true
  }

  abstract update(dt: number): void

  render(): void {
    // 默认空实现，子类可覆盖
  }
}
```

### Task 3: SceneManager 实现 ✅

创建 `src/scenes/SceneManager.ts`:

```typescript
import { Application, Container } from 'pixi.js'
import type { Scene } from './Scene'
import { eventBus } from '../core/events/EventBus'

export class SceneManager {
  private stack: Scene[] = []
  private app: Application
  private sceneContainer: Container

  constructor(app: Application) {
    this.app = app
    this.sceneContainer = new Container()
    this.app.stage.addChild(this.sceneContainer)
  }

  /** 获取当前活跃场景 */
  current(): Scene | null {
    return this.stack[this.stack.length - 1] || null
  }

  /** 叠加新场景（保留下层场景） */
  push(scene: Scene): void {
    const previous = this.current()
    if (previous) {
      previous.onPause?.()
    }

    this.stack.push(scene)
    this.sceneContainer.addChild(scene.container)
    scene.onEnter()

    eventBus.emit('scene:change', {
      from: previous?.name || null,
      to: scene.name,
      action: 'push'
    })
  }

  /** 弹出当前场景，恢复下层场景 */
  pop(): Scene | null {
    const removed = this.stack.pop()
    if (!removed) return null

    this.sceneContainer.removeChild(removed.container)
    removed.onExit()

    const next = this.current()
    if (next) {
      next.onResume?.()
    }

    eventBus.emit('scene:change', {
      from: removed.name,
      to: next?.name || null,
      action: 'pop'
    })

    return removed
  }

  /** 替换当前场景（移除当前，添加新场景） */
  replace(scene: Scene): void {
    const removed = this.stack.pop()
    if (removed) {
      this.sceneContainer.removeChild(removed.container)
      removed.onExit()
    }

    this.stack.push(scene)
    this.sceneContainer.addChild(scene.container)
    scene.onEnter()

    eventBus.emit('scene:change', {
      from: removed?.name || null,
      to: scene.name,
      action: 'replace'
    })
  }

  /** 清空所有场景 */
  clear(): void {
    while (this.stack.length > 0) {
      this.pop()
    }
  }

  /** 每帧更新（仅更新栈顶场景） */
  update(dt: number): void {
    const current = this.current()
    if (current) {
      current.update(dt)
      current.render?.()
    }
  }

  /** 场景栈深度 */
  get depth(): number {
    return this.stack.length
  }

  /** 检查场景是否在栈中 */
  has(sceneName: string): boolean {
    return this.stack.some(s => s.name === sceneName)
  }
}
```

### Task 4: 事件类型定义 ✅

在 `src/core/events/EventBus.ts` 中添加场景事件类型:

```typescript
interface GameEvents {
  // ... 现有事件

  // 场景事件
  'scene:change': {
    from: string | null
    to: string | null
    action: 'push' | 'pop' | 'replace'
  }
}
```

### Task 5: 导出与集成 ✅

创建 `src/scenes/index.ts`:

```typescript
export type { Scene } from './Scene'
export { BaseScene } from './BaseScene'
export { SceneManager } from './SceneManager'
```

## 测试计划

### 单元测试 (vitest) ✅

创建 `tests/unit/scenes/SceneManager.test.ts`:

1. **push 测试** ✅
   - push 空栈时正确调用 onEnter
   - push 非空栈时调用前场景的 onPause 和新场景的 onEnter
   - 场景容器正确添加到 stage

2. **pop 测试** ✅
   - pop 调用当前场景的 onExit
   - pop 后恢复下层场景的 onResume
   - 空栈 pop 返回 null

3. **replace 测试** ✅
   - replace 调用旧场景 onExit 和新场景 onEnter
   - 栈深度不变

4. **update 测试** ✅
   - 仅栈顶场景的 update 被调用

5. **事件测试** ✅
   - push/pop/replace 正确触发 scene:change 事件

### 集成测试

手动验证:
- 场景切换流畅无闪烁
- PixiJS Container 正确显示/隐藏
- 内存泄漏检查（场景销毁后 Container 被正确清理）

## 注意事项

1. **生命周期顺序**: push 时先 onPause 再 onEnter；pop 时先 onExit 再 onResume
2. **Container 管理**: onExit 时销毁 Container 子对象防止内存泄漏
3. **事件解绑**: 场景退出时需清理事件监听，建议在 onExit 中处理
4. **Ticker 集成**: SceneManager.update 应由主 Ticker 驱动

## 相关文档

- [game-architecture.md - Scene Management](../game-architecture.md#scene-management)
- [epics.md - Story 4.1](../epics.md#story-41-场景管理器)

---

## Dev Agent Record

### Implementation Plan
- Task 1: 创建 Scene 接口，定义生命周期钩子
- Task 2: 创建 BaseScene 抽象基类，提供默认实现
- Task 3: 实现 SceneManager，管理场景栈和生命周期
- Task 4: 更新 EventBus 的 scene:change 事件类型
- Task 5: 创建模块导出文件

### Debug Log
- 安装 pixi.js@^8.16.0 依赖以支持 Container 类型

### Completion Notes
✅ 所有 5 个任务已完成
✅ 102 个单元测试全部通过（含代码审查后新增测试）
✅ 所有验收标准已满足
✅ 生命周期顺序测试验证（push 先 onPause 再 onEnter，pop 先 onExit 再 onResume）

### Senior Developer Review (AI)

**Review Date:** 2026-02-16
**Outcome:** Approved (after fixes)

**Issues Found & Fixed:**
- [x] [HIGH] H1: BaseScene 缺少单元测试 → 添加 BaseScene.test.ts (11 tests)
- [x] [HIGH] H2: scene:change 事件测试缺失 → 添加 6 个事件测试
- [x] [MEDIUM] M1: app 属性未使用 → 移除未使用的 app 引用
- [x] [MEDIUM] M2: 缺少 destroy 方法 → 添加 SceneManager.destroy()
- [x] [MEDIUM] M3: 重复 push 保护缺失 → 添加重复 push 检测
- [x] [MEDIUM] M4: BaseScene.onExit 后不可恢复 → 添加 isDestroyed 标志

## File List

**新增文件:**
- `src/src/scenes/Scene.ts` - Scene 接口定义
- `src/src/scenes/BaseScene.ts` - 抽象基类（含 isDestroyed 标志）
- `src/src/scenes/SceneManager.ts` - 场景管理器（含 destroy 方法和重复 push 保护）
- `src/src/scenes/index.ts` - 模块导出
- `src/tests/unit/scenes/SceneManager.test.ts` - 单元测试 (32 tests)
- `src/tests/unit/scenes/BaseScene.test.ts` - BaseScene 单元测试 (11 tests)

**修改文件:**
- `src/src/core/events/EventBus.ts` - 更新 scene:change 事件类型

**依赖更新:**
- `package.json` - 添加 pixi.js@^8.16.0

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-16 | 完成 Story 4.1 场景管理器实现，包含 Scene 接口、BaseScene 基类、SceneManager、事件类型更新和模块导出 |
| 2026-02-16 | 代码审查修复：添加 BaseScene 测试、事件测试、isDestroyed 标志、destroy 方法、重复 push 保护 |
