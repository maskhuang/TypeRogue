# Story 24.1: 成长值状态存储

Status: done

## Story

As a 玩家,
I want 成长附魔的成长值能在同一局游戏（Run）内跨关保持，新 Run 自动重置,
so that 成长附魔带来的永久数值增长是有意义的跨关构筑策略，而非一次性关内效果.

## Acceptance Criteria

1. `GameState` 新增 `growthValues: Map<string, number>`（skillId → 累积成长百分比），跨关保持、新 Run 重置
2. `GameState` 新增 `devourIcons: Map<string, string[]>`（skillId → 吞噬获得的图标列表），跨关保持、新 Run 重置
3. `RunStateData` 新增同名字段，`createInitialState()` 初始化为空 Map
4. `RunState.serialize()` 将两个 Map 序列化为 JSON 兼容格式（`Object.fromEntries`）
5. `RunState.deserialize()` 从序列化数据恢复两个 Map，兼容旧存档（字段缺失时默认空 Map）
6. 新 Run 开始时（`resetState()` / `RunState.reset()`）两个 Map 清零
7. 类型定义和序列化往返测试通过

## Tasks / Subtasks

- [x] Task 1: GameState 类型扩展 (AC: 1, 2)
  - [x] 1.1 `core/types.ts` — `GameState` 新增 `growthValues: Map<string, number>`
  - [x] 1.2 `core/types.ts` — `GameState` 新增 `devourIcons: Map<string, string[]>`

- [x] Task 2: GameState 初始化 (AC: 3, 6)
  - [x] 2.1 `core/state.ts` — `createInitialState()` 中初始化 `growthValues: new Map()` 和 `devourIcons: new Map()`

- [x] Task 3: RunStateData 类型扩展 (AC: 3)
  - [x] 3.1 `core/state/RunState.ts` — `RunStateData` 接口新增 `growthValues: Map<string, number>` 和 `devourIcons: Map<string, string[]>`
  - [x] 3.2 `RunState.createInitialState()` 中初始化两个 Map 为空

- [x] Task 4: RunState 序列化 (AC: 4)
  - [x] 4.1 `RunState.serialize()` — 新增 `growthValues: Object.fromEntries(this.data.growthValues)` 和 `devourIcons: Object.fromEntries(this.data.devourIcons)`

- [x] Task 5: RunState 反序列化 (AC: 5)
  - [x] 5.1 `RunState.deserialize()` — 从 `parsed.growthValues`（`Record<string, number>`）恢复为 `Map<string, number>`
  - [x] 5.2 `RunState.deserialize()` — 从 `parsed.devourIcons`（`Record<string, string[]>`）恢复为 `Map<string, string[]>`
  - [x] 5.3 兼容旧存档：字段缺失时 `(parsed as any).growthValues || {}` 默认空对象

- [x] Task 6: 单元测试 (AC: 7)
  - [x] 6.1 测试 `createInitialState()` 返回空 `growthValues` 和 `devourIcons`
  - [x] 6.2 测试 `resetState()` 后 growthValues 和 devourIcons 为空 Map
  - [x] 6.3 测试 `RunState.serialize()` 正确将 Map 序列化为普通对象
  - [x] 6.4 测试 `RunState.deserialize()` 正确恢复 Map
  - [x] 6.5 测试序列化往返（serialize → JSON.stringify → JSON.parse → deserialize）数据一致
  - [x] 6.6 测试旧存档兼容（缺失 growthValues/devourIcons 字段时不报错，返回空 Map）

## Dev Notes

### 状态生命周期分层

项目中存在三个不同生命周期的状态作用域：

| 作用域 | 示例 | 清零时机 |
|--------|------|----------|
| per-word | `synergy.decayCounters` | 每词重置 |
| per-level | `state.amplifierStacks` | 每关结算清零 |
| **per-run** | `state.player.evolvedSkills`, `state.player.enchantedSkills` | 新 Run 重置 |

`growthValues` 和 `devourIcons` 属于 **per-run** 作用域 — 跨关保持，新 Run 重置。

### 双状态系统说明

项目有两个并行的状态系统：

1. **`GameState`**（`core/types.ts` + `core/state.ts`）— 运行时状态，技能系统直接读写
2. **`RunState`**（`core/state/RunState.ts`）— 高层 Run 管理，提供 `serialize()`/`deserialize()` 用于存档

两处都需要添加 `growthValues` 和 `devourIcons`：
- `GameState` — 供 `skills.ts` 在战斗中读写成长值
- `RunState` — 供存档系统持久化

### Map 序列化模式

RunState 已有的 Map 序列化模式（bindings）：

```typescript
// serialize
serialize(): object {
  return {
    bindings: Object.fromEntries(this.data.bindings),
    // ...
  }
}

// deserialize
Object.entries(parsed.bindings).forEach(([key, skillId]) => {
  runState.data.bindings.set(key, skillId)
})
```

新增字段遵循相同模式：

```typescript
// serialize
growthValues: Object.fromEntries(this.data.growthValues),
devourIcons: Object.fromEntries(this.data.devourIcons),

// deserialize（兼容旧存档）
const growthEntries = (parsed as any).growthValues || {};
Object.entries(growthEntries).forEach(([skillId, value]) => {
  runState.data.growthValues.set(skillId, value as number);
});

const devourEntries = (parsed as any).devourIcons || {};
Object.entries(devourEntries).forEach(([skillId, icons]) => {
  runState.data.devourIcons.set(skillId, icons as string[]);
});
```

### 新 Run 重置

`resetState()`（`core/state.ts`）调用 `createInitialState()` 重建整个 `GameState`，两个新 Map 自然被初始化为空。`RunState.reset()` 同理。

### 关卡结算不清零

`amplifierStacks` 在关卡结算时通过 `state.amplifierStacks.clear()` 清零。成长值**不**在关卡结算时清零 — 需确保关卡结算逻辑不触及 `growthValues` 和 `devourIcons`。

### 不需要修改的部分

- `systems/skills.ts` — 本 Story 只做状态存储，触发逻辑在 Story 24.3
- `data/enchantments.ts` — 附魔数据在 Story 24.2
- `systems/shop.ts` — UI 在 Story 24.6
- `SaveManager.ts` — 已通过 `RunState.serialize()` 间接支持，无需修改

### Project Structure Notes

- 修改 3 个文件：`core/types.ts`（类型）, `core/state.ts`（初始化）, `core/state/RunState.ts`（序列化）
- 新增 1 个测试文件：`src/tests/unit/core/growth-state.test.ts`
- 依赖方向不变：`core/state → core/types`
- 无新增外部依赖

### References

- [Source: docs/epics.md#Story 24.1 — 成长值状态存储]
- [Source: docs/brainstorming-session-2026-03-05.md#Section F+ — 成长附魔详细设计]
- [Source: src/src/core/types.ts — GameState/PlayerState 类型定义]
- [Source: src/src/core/state.ts — createInitialState/resetState]
- [Source: src/src/core/state/RunState.ts:432-496 — serialize/deserialize 现有模式]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Task 1: `GameState` 新增 `growthValues: Map<string, number>` 和 `devourIcons: Map<string, string[]>`，放在 `amplifierStacks` 后面
- Task 2: `createInitialState()` 初始化两个新 Map 为空
- Task 3: `RunStateData` 接口和 `createInitialState()` 同步新增
- Task 4: `serialize()` 使用 `Object.fromEntries()` 将 Map 转为普通对象
- Task 5: `deserialize()` 使用 `Object.entries()` 恢复 Map，`(parsed as any).growthValues || {}` 兼容旧存档
- Task 6: 12 个测试全部通过 — 覆盖初始化、重置、序列化、反序列化、往返一致性、旧存档兼容

### File List
- `src/src/core/types.ts` (modified) — GameState 新增 growthValues + devourIcons 字段
- `src/src/core/state.ts` (modified) — createInitialState() 初始化两个新 Map
- `src/src/core/state/RunState.ts` (modified) — RunStateData 类型 + createInitialState + serialize + deserialize
- `src/tests/unit/core/growth-state.test.ts` (new) — 13 个测试覆盖全部 AC
- `src/tests/unit/core/state/RunState.test.ts` (modified) — 补充 growthValues/devourIcons 回归断言

### Change Log
- 2026-03-06: Story 24.1 实现 — 成长值状态存储（GameState + RunState 双系统 + 序列化 + 12 个测试）
- 2026-03-06: Code Review — 修复 3M+1L 共 4 个问题（resetState 测试重构 + startRun 清零测试 + RunState.test.ts 回归断言补充）
