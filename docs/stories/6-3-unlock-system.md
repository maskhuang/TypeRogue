---
title: "Story 6.3: 解锁系统"
epic: "Epic 6: Meta 系统"
story_key: "6-3-unlock-system"
status: "review"
created: "2026-02-17"
depends_on:
  - "6-1-meta-state-management"
  - "6-2-save-system"
---

# Story 6.3: 解锁系统

## 概述

实现技能和遗物的解锁机制，扩展 MetaState.checkUnlocks() 方法实现具体解锁规则，并在解锁时显示通知。这是 Epic 6 (Meta 系统) 的核心 Story，为玩家提供长期目标和成长反馈。

## Story

作为一个 **玩家**，
我想要 **通过完成特定成就来解锁新技能和遗物**，
以便 **获得持续的进度感和探索新玩法的动力**。

## 验收标准

- [x] AC1: 定义 UnlockCondition 接口，支持多种解锁条件类型
- [x] AC2: 实现里程碑解锁（首次通关各 Act 解锁基础内容）
- [x] AC3: 实现 Build 成就解锁（特定技能组合通关解锁相关技能）
- [x] AC4: 实现统计解锁（总局数、胜利次数、最高分等达到阈值）
- [x] AC5: 扩展 MetaState.checkUnlocks() 检查所有解锁条件
- [x] AC6: 解锁触发时发送 meta:skill_unlocked / meta:relic_unlocked 事件
- [x] AC7: 实现 UnlockNotification 组件显示解锁通知
- [x] AC8: 解锁数据定义在 unlock-definitions.ts 配置文件中
- [x] AC9: 单元测试覆盖所有解锁条件类型
- [x] AC10: 解锁后自动保存 MetaState

## 技术说明

### 文件位置

- `src/src/core/unlock/UnlockSystem.ts` - 解锁系统核心类（新建）
- `src/src/core/unlock/unlock-definitions.ts` - 解锁条件定义数据（新建）
- `src/src/core/unlock/index.ts` - 模块导出（新建）
- `src/src/core/state/MetaState.ts` - 扩展 checkUnlocks 方法（修改）
- `src/src/ui/notifications/UnlockNotification.ts` - 解锁通知 UI（新建）
- `src/tests/unit/core/unlock/UnlockSystem.test.ts` - 单元测试（新建）

### 架构参考

```
game-architecture.md - State Management:

// 协调多层状态更新
class StateCoordinator {
  onBattleEnd(result: BattleResult) {
    this.run.applyBattleResult(result)
    this.meta.checkUnlocks(this.run)  // ← Story 6.3 实现此方法
    this.save()
  }
}
```

```
gdd.md - Meta 解锁系统:

| 解锁方式 | 内容 | 设计意图 |
|----------|------|----------|
| **Build 成就** | 特定组合通关解锁相关技能 | 鼓励尝试不同玩法 |
| **里程碑** | 首次通关各 Act 解锁基础内容 | 保证进度感 |
| **挑战完成** | Ascension 等级解锁高级内容 | 硬核玩家目标 |
```

### 依赖关系

**依赖:**
- Story 6.1 (MetaState) - 使用 unlockSkill/unlockRelic 方法、checkUnlocks 接口
- Story 6.2 (SaveSystem) - 解锁后自动保存
- `core/events/EventBus.ts` - 事件通信

**被依赖:**
- Story 6.4 (图鉴场景) - 读取解锁状态显示

### 项目结构参考

```
src/
├── src/
│   ├── core/
│   │   ├── unlock/           ← 本 Story 新建目录
│   │   │   ├── UnlockSystem.ts
│   │   │   ├── unlock-definitions.ts
│   │   │   └── index.ts
│   │   ├── state/
│   │   │   └── MetaState.ts  ← 修改
│   │   └── events/
│   │       └── EventBus.ts   ← 已有解锁事件
│   └── ui/
│       └── notifications/    ← 本 Story 新建目录
│           └── UnlockNotification.ts
└── tests/
    └── unit/
        ├── core/
        │   └── unlock/
        │       └── UnlockSystem.test.ts
        └── ui/
            └── notifications/
                └── UnlockNotification.test.ts
```

## 实现任务

### [x] Task 1: UnlockCondition 接口定义 (AC: #1)

创建解锁条件类型系统，支持四种条件类型: milestone, build, stats, challenge。

### [x] Task 2: 解锁定义数据 (AC: #8)

创建 unlock-definitions.ts，定义 11 个解锁条件：
- 4 个里程碑解锁 (Act 1/2/3 通关)
- 2 个 Build 成就解锁 (光环大师、孤狼之道)
- 4 个统计解锁 (老兵、常胜将军、高分猎手、连击传说)
- 1 个挑战解锁 (Ascension 1)

### [x] Task 3: UnlockSystem 核心实现 (AC: #2, #3, #4, #5)

实现 UnlockSystem 类，包含：
- checkUnlocks() 检查所有解锁条件
- checkMilestone() 里程碑检查
- checkBuild() Build 成就检查
- checkStats() 统计阈值检查
- checkChallenge() 挑战检查

### [x] Task 4: 扩展 MetaState.checkUnlocks (AC: #5, #10)

修改 MetaState 集成 UnlockSystem：
- 添加 setUnlockSystem() 方法
- 扩展 checkUnlocks() 调用 UnlockSystem
- 发送 meta:unlocks_checked 事件
- 发送 meta:request_save 事件触发自动保存

### [x] Task 5: 事件类型扩展

更新 EventBus.ts 添加新事件类型：
- unlock:new - 解锁通知事件
- meta:unlocks_checked - 解锁检查完成事件
- meta:request_save - 请求保存事件
- ui:show_notification - UI 通知事件

### [x] Task 6: UnlockNotification 组件 (AC: #7)

创建 UnlockNotificationManager 类：
- 监听 unlock:new 事件
- 维护通知队列
- 发送 ui:show_notification 事件给 UI 层

### [x] Task 7: 模块导出

创建 index.ts 导出模块公开接口。

### [x] Task 8: 单元测试 (AC: #9)

创建 UnlockSystem.test.ts (34 tests) 和 UnlockNotification.test.ts (10 tests)，覆盖：
- 类型定义测试 (7 tests)
- 里程碑解锁测试 (6 tests)
- Build 成就解锁测试 (5 tests)
- 统计解锁测试 (5 tests)
- 挑战解锁测试 (3 tests)
- 事件发送测试 (3 tests)
- 重复解锁防护测试 (2 tests)
- 边界情况测试 (3 tests)
- 通知队列管理测试 (5 tests)
- dispose 清理测试 (3 tests)

### [x] Task 9: 集成 SaveManager 自动保存 (AC: #10)

MetaState.checkUnlocks() 发送 meta:request_save 事件，游戏初始化代码可监听此事件触发保存。

## 测试计划

### 单元测试 (vitest)

- `UnlockSystem.test.ts`: 34 tests - 全部通过
- `UnlockNotification.test.ts`: 10 tests - 全部通过
- 总测试数: 935 (全套件)，全部通过

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 6.1 (MetaState):**
- checkUnlocks 已预留接口，本 Story 实现具体逻辑
- 使用 eventBus 发送解锁事件
- 事件监听需要 dispose 清理

**从 Story 6.2 (SaveSystem):**
- 解锁后需要触发保存
- 使用 meta:request_save 事件触发自动保存

### 技术要点

1. **解锁条件类型系统**: 使用联合类型确保类型安全
2. **配置驱动**: 解锁定义放在单独文件，便于调整
3. **事件解耦**: 解锁通知通过事件触发，UI 层监听处理
4. **幂等性**: 重复检查不会重复解锁

### 扩展考虑

1. **新增解锁类型**: 只需在 unlock-definitions.ts 添加定义
2. **Ascension 集成**: 需要扩展 RunResultData 添加 ascensionLevel
3. **隐藏解锁**: 可以添加 hidden 字段，图鉴中显示为 "???"

### References

- [game-architecture.md - 状态管理](../game-architecture.md#state-management)
- [gdd.md - Meta 解锁系统](../gdd.md#permadeath-and-progression)
- [epics.md - Story 6.3](../epics.md#story-63-解锁系统)
- [Story 6.1 - Meta 状态管理](./6-1-meta-state-management.md)
- [Story 6.2 - 存档系统](./6-2-save-system.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **Implementation complete**: All 10 acceptance criteria fulfilled
2. **Test coverage**: 44 unit tests (34 for UnlockSystem + 10 for UnlockNotification)
3. **Full test suite passes**: 935 total tests with no regressions
4. **Event system extended**: 4 new events added (unlock:new, meta:unlocks_checked, meta:request_save, ui:show_notification)
5. **11 unlock definitions**: 4 milestones + 2 builds + 4 stats + 1 challenge
6. **MetaState integration**: setUnlockSystem() method and enhanced checkUnlocks()

### File List

**New Files:**
- `src/src/core/unlock/UnlockSystem.ts` - UnlockSystem class (220 lines)
- `src/src/core/unlock/unlock-definitions.ts` - Unlock definitions (140 lines)
- `src/src/core/unlock/index.ts` - Module exports (12 lines)
- `src/src/ui/notifications/UnlockNotification.ts` - Notification manager (80 lines)
- `src/tests/unit/core/unlock/UnlockSystem.test.ts` - UnlockSystem tests (580 lines)
- `src/tests/unit/ui/notifications/UnlockNotification.test.ts` - Notification tests (130 lines)

**Modified Files:**
- `src/src/core/state/MetaState.ts` - Added setUnlockSystem(), enhanced checkUnlocks() (lines 6, 89, 255-285)
- `src/src/core/events/EventBus.ts` - Added 4 new event types (lines 148-172)
