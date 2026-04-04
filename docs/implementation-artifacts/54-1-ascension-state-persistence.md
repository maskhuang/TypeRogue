# Story 54.1: Ascension 状态持久化

Status: done

## Story

作为玩家，我想要我的 Ascension 进度跨 run 持久化保存，以便下次游戏可以继续挑战更高级别。

## Acceptance Criteria

1. MetaState 新增 `ascension` 字段：`{ none: number, wordsmith: number, metamorph: number }`，默认均为 0
2. RunState 新增 `ascensionLevel: number` 记录本局选择的 Ascension 级别，默认 0
3. MetaState 序列化/反序列化正确处理 ascension 字段（旧存档缺失时默认 `{ none: 0, wordsmith: 0, metamorph: 0 }`）
4. RunState 序列化/反序列化正确处理 ascensionLevel 字段（旧存档缺失时默认 0）
5. 通关时若 `ascensionLevel === 当前职业已解锁最高级` → 该职业 ascension + 1（上限 10）
6. `state` singleton 中可通过 `state.ascensionLevel` 读取当前局 Ascension 级别
7. MetaState 序列化版本号递增
8. 提供 `getMaxAscension(classId)` 和 `getAscensionLevel()` 工具函数

## Tasks

- [x] Task 1: MetaState 新增 ascension 字段 + 序列化/反序列化 (AC: 1, 3, 7)
  - [x] 1.1 MetaState 类新增 `ascension: Record<ClassId, number>` 字段
  - [x] 1.2 serialize() 导出 ascension
  - [x] 1.3 deserialize() 兼容旧存档（缺失时默认 0）
  - [x] 1.4 MetaSaveData 类型扩展（RunResultData 新增 ascensionLevel）
  - [x] 1.5 序列化版本号递增（v6 → v7）
- [x] Task 2: RunState 新增 ascensionLevel 字段 + 序列化/反序列化 (AC: 2, 4)
  - [x] 2.1 RunState 类新增 `ascensionLevel: number` 字段（RunStateData 接口 + createInitialState）
  - [x] 2.2 serialize()/deserialize() 处理（含旧存档默认 0）
  - [x] 2.3 RunSaveData 类型扩展
- [x] Task 3: state singleton 集成 (AC: 6)
  - [x] 3.1 GameState 接口 + createInitialState() 中初始化 ascensionLevel = 0
  - [x] 3.2 getAscensionLevel() 工具函数从 state 读取
- [x] Task 4: 通关升级逻辑 (AC: 5, 8)
  - [x] 4.1 MetaState.getAscension(classId) 读取已解锁最高级
  - [x] 4.2 getAscensionLevel() 导出自 state.ts
  - [x] 4.3 checkUnlocks() 中通关时调用 advanceAscension（上限 10）
  - [x] 4.4 MAX_ASCENSION_LEVEL = 10 常量导出
- [x] Task 5: 单元测试 (AC: 1-8)
  - [x] 5.1 MetaState 序列化/反序列化测试（含旧存档兼容）
  - [x] 5.2 advanceAscension 逻辑测试（正常升级、上限、非最高级不升级、职业独立）
  - [x] 5.3 checkUnlocks 集成测试（victory/gameover/低级不升级/无 ascensionLevel）

## Dev Notes

- MetaState 序列化版本当前为 6，升到 7
- ClassId 类型定义在 `src/data/classes.ts`：`'none' | 'wordsmith' | 'metamorph'`
- 通关逻辑在 `src/systems/battle.ts` 的 endLevel / victory 流程中
- state singleton 在 `src/core/state.ts`
- 参考 Epic 54 设计文档：`docs/planning-artifacts/ascension-system-design.md`

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- MetaState v6 → v7: 新增 `ascension` 字段（Record<string, number>），默认 `{ none: 0, wordsmith: 0, metamorph: 0 }`
- RunStateData 新增 `ascensionLevel: number`，序列化/反序列化含旧存档兼容
- GameState 接口新增 `ascensionLevel`，createInitialState() 默认 0
- MetaState.advanceAscension() 仅当 ascensionLevel === 当前最高级时递增，上限 MAX_ASCENSION_LEVEL=10
- checkUnlocks() 中 victory + classId + ascensionLevel 三者齐全时触发升级
- battle.ts victory emit 新增 ascensionLevel 字段
- EventBus meta:check_unlocks 事件类型新增 ascensionLevel 可选字段
- 20 个单元测试全部通过
- Code review: H1 VictoryScene 缺少 classId/ascensionLevel 已修复；M1 constructor 一致性已修复；M2/L1 RunState + getAscensionLevel 测试已补充

### File List

- `src/core/state/MetaState.ts` — ascension 字段、getAscension()、advanceAscension()、序列化 v7、RunResultData 扩展
- `src/core/state/RunState.ts` — RunStateData.ascensionLevel、serialize/deserialize
- `src/core/state.ts` — GameState.ascensionLevel 初始化、getAscensionLevel() 工具函数
- `src/core/types.ts` — GameState 接口新增 ascensionLevel
- `src/core/events/EventBus.ts` — meta:check_unlocks 事件类型新增 ascensionLevel
- `src/systems/battle.ts` — victory emit 新增 ascensionLevel
- `src/scenes/victory/VictoryScene.ts` — VictoryData 接口 + emit 新增 classId/ascensionLevel
- `tests/unit/core/state/ascension.test.ts` — 20 个测试（MetaState + RunState + getAscensionLevel）
