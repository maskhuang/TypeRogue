# Story 2.1: 键盘相邻映射

Status: done

## Story

As a **玩家**,
I want **技能能根据键盘物理位置产生联动效果**,
so that **我能通过策略性地安排技能位置来获得加成**.

## Acceptance Criteria

1. **AC1:** 完整定义 QWERTY 26 键的相邻关系
2. **AC2:** AdjacencyMap.getAdjacent(key) 返回相邻键列表
3. **AC3:** 支持获取相邻技能列表
4. **AC4:** 支持获取相邻空位数量
5. **AC5:** 单元测试覆盖所有键位

## Tasks / Subtasks

- [ ] **Task 1: 创建 AdjacencyMap 类** (AC: 1, 2)
  - [ ] 1.1 创建 `src/systems/skills/passive/AdjacencyMap.ts`
  - [ ] 1.2 使用现有 ADJACENT_KEYS 常量
  - [ ] 1.3 实现 getAdjacent(key) 方法

- [ ] **Task 2: 实现技能查询方法** (AC: 3, 4)
  - [ ] 2.1 实现 getAdjacentSkills(key, bindings)
  - [ ] 2.2 实现 getAdjacentEmptyCount(key, bindings)
  - [ ] 2.3 实现 hasAdjacentSkill(key, bindings)

- [ ] **Task 3: 添加辅助方法** (AC: 2)
  - [ ] 3.1 实现 isAdjacent(key1, key2)
  - [ ] 3.2 实现 getAllKeys()
  - [ ] 3.3 实现 getAdjacentCount(key)

- [ ] **Task 4: 集成验证** (AC: 1-5)
  - [ ] 4.1 TypeScript 编译通过
  - [ ] 4.2 验证所有键位相邻关系正确

## Dev Notes

### 架构约束

- **位置:** `src/systems/skills/passive/AdjacencyMap.ts`
- **依赖:** `core/constants.ts` (ADJACENT_KEYS)
- **模式:** 纯函数查询，无副作用

### QWERTY 布局参考

```
  Q W E R T Y U I O P
   A S D F G H J K L
    Z X C V B N M
```

### 相邻关系示例

- F: [D, G, R, T, C, V] (6个相邻)
- Q: [W, A] (2个相邻，角落)
- S: [A, W, E, D, Z, X] (6个相邻)

### References

- [Source: docs/game-architecture.md#Novel Pattern 1] - 键盘相邻联动模式
- [Source: src/core/constants.ts#ADJACENT_KEYS] - 现有相邻关系定义
- [Source: docs/epics.md#Story 2.1] - 验收标准

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
