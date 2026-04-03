# Story 45.5: consume() 资源消耗共享基础设施

Status: done

## Story

As a 开发者,
I want 一个共享的 consume(resource, amount) 机制允许词条在 Phase 2 中声明资源消耗请求并在 Phase 4 后统一执行,
so that 数值型三个新词条（相变/吸热放热/聚变）可以安全地消耗资源而不引入私有状态。

## Acceptance Criteria

1. consumeRequests 在 Phase 4 资源路由之后统一执行
2. 多个词条的消耗请求可叠加（同一资源的多个消耗请求合并执行）
3. 资源不被扣至负值（`min(amount, currentValue)` 保护）
4. consume 后的资源变化被后续触发正确读取
5. 不影响现有词条行为（无 consume 请求时零开销）
6. 单元测试覆盖正常消耗、不足消耗、多词条叠加消耗

## Tasks / Subtasks

- [x] Task 1: Phase2Result 扩展 (AC: #1, #5)
  - [x] 1.1 Phase2Result + TriggerResult 新增 consumeRequests 字段
  - [x] 1.2 resolvePhase2: 初始化 consumeRequests = []，返回值包含
  - [x] 1.3 triggerAffixSkill: 透传 consumeRequests（空时为 undefined）
- [x] Task 2: 消耗执行逻辑 (AC: #1, #2, #3, #4)
  - [x] 2.1 orchestrator: chargeAutoComplete 之后、Phase 5 入队之前执行
  - [x] 2.2 Math.min(amount, Math.max(0, current)) 防负值
  - [x] 2.3 复用 callbacks.applyResource(resource, -amount, false)
  - [x] 2.4 consumeRequests undefined/空时跳过
- [x] Task 3: 单元测试 (AC: #1~#6)
  - [x] 8 个测试全部通过（空数组/单消耗/叠加/不足/连续消耗同资源/无请求/零资源/小数）

## Dev Notes

### 管线流程与插入点

```
Phase 2 (resolvePhase2)
  → 词条循环 → bonusPercent + consumeRequests[]
Phase 3 (resolvePhase3)
  → 暴击判定 × 乘算
Phase 4 (resolvePhase4)
  → 资源路由 → targetResource
Orchestrator:
  → applyResource(target, output)          ← 主产出写入
  → applyResource(reverse)                 ← Convert 反向产出
  → 【INSERT: consumeRequests 执行】       ← 新增
  → Phase 5 入队（Recurse/Splash 等）
```

### 关键实现细节

**为什么在 orchestrator 而非 affixTrigger.ts 中执行：**
- `affixTrigger.ts` 是纯函数（不修改状态），所有状态修改通过回调
- `affixTriggerOrchestrator.ts` 持有回调和状态引用，是执行副作用的正确位置

**consumeRequests 传递路径：**
```
resolvePhase2() → Phase2Result.consumeRequests
  → triggerAffixSkill() → TriggerResult（需要透传）
    → orchestrator 读取并执行
```

需要检查 `triggerAffixSkill()` 的返回类型（`TriggerResult`）是否需要扩展以包含 consumeRequests，或直接从 Phase2Result 透传。

### 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/src/data/affixTrigger.ts` | Phase2Result 接口 + resolvePhase2 初始化 + TriggerResult 透传 |
| `src/src/systems/affixTriggerOrchestrator.ts` | consume 执行逻辑（applyResource 后） |
| `src/tests/unit/data/affixConsume.test.ts` | **新建** consume 机制测试 |

### 不改动的文件

- `affixes.ts` — 无新词条，纯基础设施
- `skillGeneration.ts` — 无新生成逻辑
- `shop.ts` — 无新 tooltip

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.5]
- [Source: docs/brainstorming-session-2026-04-01.md#新增共享基础设施]
- [Source: src/data/affixTrigger.ts#Phase2Result — 扩展目标]
- [Source: src/systems/affixTriggerOrchestrator.ts — 执行点]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ Phase2Result.consumeRequests: 延迟消耗请求数组
- ✅ TriggerResult.consumeRequests: 透传（空时 undefined 零开销）
- ✅ resolvePhase2: consumeRequests 初始化+返回
- ✅ orchestrator: chargeAutoComplete 后、Phase 5 入队前执行，复用 applyResource 回调
- ✅ 防负值保护: Math.min(amount, Math.max(0, current))
- ✅ 8 个测试覆盖所有 AC

### File List

- `src/src/data/affixTrigger.ts` — Phase2Result + TriggerResult + resolvePhase2 返回值
- `src/src/systems/affixTriggerOrchestrator.ts` — consume 执行逻辑
- `src/tests/unit/data/affixConsume.test.ts` — **新建** 8 个测试
