# Story 11.4: 行为修饰器框架

Status: done

## Story

As a 开发者,
I want 一个 BehaviorExecutor，处理 EffectPipeline 收集的 pendingBehaviors 队列，支持链式触发和深度限制,
so that 非数值行为（echo 双触发、ripple 接力、shield 拦截等）可以在统一管道中执行，并防止无限循环。

## Acceptance Criteria

1. `BehaviorExecutor.execute(behaviors, context, callbacks)` 处理 `pendingBehaviors` 队列，返回 `BehaviorExecutionResult`
2. 链式触发深度限制：`depth >= MAX_DEPTH(3)` 时跳过所有触发类行为（trigger_adjacent, trigger_skill），记入 skippedByDepth
3. `trigger_adjacent`: 调用 `callbacks.onTriggerAdjacent()`，对返回的每个 `PipelineResult` 递归执行其 `pendingBehaviors`（depth+1）
4. `trigger_skill`: 调用 `callbacks.onTriggerSkill(targetSkillId)`，对返回的 `PipelineResult` 递归执行其 `pendingBehaviors`（depth+1）
5. `buff_next_skill`: 调用 `callbacks.onBuffNextSkill(multiplier)` 通知调用方设置临时增益（不直接操作 registry）
6. `intercept`: 在 pendingBehaviors 中出现时跳过（已在 EffectPipeline Phase 1 处理）
7. 扩展 `ModifierTypes.ts` 添加 `BehaviorCallbacks` 和 `BehaviorExecutionResult` 接口
8. 单元测试覆盖所有 4 种行为类型 + 深度限制 + 链式递归 + 空队列 + 混合队列
9. 不修改任何现有技能或遗物代码（纯新增 + 修改 modifiers 模块内部）
10. 所有现有测试通过，零回归

## Tasks / Subtasks

- [x] Task 1: 扩展 ModifierTypes.ts (AC: #7)
  - [x] 1.1 添加 `BehaviorCallbacks` 接口：`onTriggerAdjacent?(depth: number) => PipelineResult[]`，`onTriggerSkill?(targetSkillId: string, depth: number) => PipelineResult | null`，`onBuffNextSkill?(multiplier: number) => void`
  - [x] 1.2 添加 `BehaviorExecutionResult` 接口：`executedCount: number`，`skippedByDepth: number`，`chainDepthReached: number`（实际达到的最大深度）

- [x] Task 2: 实现 BehaviorExecutor (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 创建 `src/src/systems/modifiers/BehaviorExecutor.ts`
  - [x] 2.2 定义 `static readonly MAX_DEPTH = 3`
  - [x] 2.3 实现 `static execute(behaviors, depth, callbacks?)` 主方法
  - [x] 2.4 实现 `intercept` 处理：跳过，不计入 executedCount
  - [x] 2.5 实现 `trigger_adjacent` 处理：检查深度 → 调用 `callbacks.onTriggerAdjacent(depth)` → 对每个返回结果的 `pendingBehaviors` 递归调用 execute(depth+1) → 累加子结果
  - [x] 2.6 实现 `trigger_skill` 处理：检查深度 → 调用 `callbacks.onTriggerSkill(targetSkillId, depth)` → 递归执行返回的 pendingBehaviors(depth+1) → 累加子结果
  - [x] 2.7 实现 `buff_next_skill` 处理：调用 `callbacks.onBuffNextSkill(multiplier)` → executedCount++
  - [x] 2.8 深度限制：触发类行为在 `depth >= MAX_DEPTH` 时跳过并记入 skippedByDepth；非触发类行为（buff_next_skill）不受深度限制
  - [x] 2.9 缺失回调时的默认行为：无回调 = 跳过对应行为，不报错

- [x] Task 3: 模块导出 (AC: #9)
  - [x] 3.1 更新 `src/src/systems/modifiers/index.ts` 导出 BehaviorExecutor 和新类型

- [x] Task 4: 单元测试 (AC: #8, #10)
  - [x] 4.1 创建 `src/tests/unit/systems/modifiers/BehaviorExecutor.test.ts`
  - [x] 4.2 测试空队列 → executedCount=0, skippedByDepth=0
  - [x] 4.3 测试 intercept 行为 → 被跳过, executedCount=0
  - [x] 4.4 测试 buff_next_skill → onBuffNextSkill 被调用, executedCount=1
  - [x] 4.5 测试 buff_next_skill 无回调 → 跳过, executedCount=0
  - [x] 4.6 测试 trigger_adjacent 深度 0 → 调用 onTriggerAdjacent(0), 递归处理子行为
  - [x] 4.7 测试 trigger_adjacent 深度 >= MAX_DEPTH → skippedByDepth=1
  - [x] 4.8 测试 trigger_skill 深度 0 → 调用 onTriggerSkill(targetId, 0), 递归处理子行为
  - [x] 4.9 测试 trigger_skill 返回 null → 跳过（技能不存在）
  - [x] 4.10 测试链式递归：trigger_adjacent 返回含 trigger_skill 的 pendingBehaviors → 深度递增
  - [x] 4.11 测试三层链式递归在 depth=3 截断：depth=0 → depth=1 → depth=2 → depth=3 时被截断
  - [x] 4.12 测试混合队列：[buff_next_skill, trigger_adjacent, intercept] → buff 执行, trigger 执行, intercept 跳过
  - [x] 4.13 测试 chainDepthReached 正确追踪最大深度
  - [x] 4.14 全部 1498 个测试通过（+20 新增），零回归

## Dev Notes

### 核心设计

**BehaviorExecutor 是"回调驱动"的行为处理器：**
- 不直接操作游戏状态（state, synergy），保持纯框架
- 触发类行为通过回调委托给调用方（11.5/11.6 会接入实际技能系统）
- 深度限制防止 echo→trigger_adjacent→echo→... 的无限递归
- buff_next_skill 通过回调通知调用方设置临时增益

**与 EffectPipeline 的关系：**
```
EffectPipeline.resolve(registry, trigger, context)
  → PipelineResult { intercepted, effects, pendingBehaviors }
    → BehaviorExecutor.execute(pendingBehaviors, depth, callbacks)
      → 对 trigger 行为递归: EffectPipeline.resolve() → BehaviorExecutor.execute(depth+1)
      → 对 buff 行为通知: callbacks.onBuffNextSkill()
```

### BehaviorCallbacks 接口

```typescript
export interface BehaviorCallbacks {
  /** trigger_adjacent: 返回相邻技能的 pipeline 结果列表 */
  onTriggerAdjacent?(depth: number): PipelineResult[]
  /** trigger_skill: 返回指定技能的 pipeline 结果（null = 技能不存在） */
  onTriggerSkill?(targetSkillId: string, depth: number): PipelineResult | null
  /** buff_next_skill: 通知调用方设置临时增益 */
  onBuffNextSkill?(multiplier: number): void
}
```

### BehaviorExecutionResult 接口

```typescript
export interface BehaviorExecutionResult {
  /** 成功执行的行为数量（不含 intercept 跳过和深度截断） */
  executedCount: number
  /** 因深度限制被跳过的触发类行为数量 */
  skippedByDepth: number
  /** 实际达到的最大链式深度（0 = 无链式触发） */
  chainDepthReached: number
}
```

### BehaviorExecutor API

```typescript
export class BehaviorExecutor {
  static readonly MAX_DEPTH = 3

  static execute(
    behaviors: ModifierBehavior[],
    depth: number,
    callbacks?: BehaviorCallbacks,
  ): BehaviorExecutionResult {
    const result: BehaviorExecutionResult = {
      executedCount: 0,
      skippedByDepth: 0,
      chainDepthReached: depth,
    }

    for (const behavior of behaviors) {
      switch (behavior.type) {
        case 'intercept':
          // 已在 EffectPipeline Phase 1 处理，此处跳过
          break

        case 'trigger_adjacent': {
          if (depth >= BehaviorExecutor.MAX_DEPTH) {
            result.skippedByDepth++
            break
          }
          const adjacentResults = callbacks?.onTriggerAdjacent?.(depth) ?? []
          result.executedCount++
          for (const pr of adjacentResults) {
            const sub = BehaviorExecutor.execute(pr.pendingBehaviors, depth + 1, callbacks)
            // 累加子结果...
          }
          break
        }

        case 'trigger_skill': {
          if (depth >= BehaviorExecutor.MAX_DEPTH) {
            result.skippedByDepth++
            break
          }
          const skillResult = callbacks?.onTriggerSkill?.(behavior.targetSkillId, depth) ?? null
          if (skillResult) {
            result.executedCount++
            const sub = BehaviorExecutor.execute(skillResult.pendingBehaviors, depth + 1, callbacks)
            // 累加子结果...
          }
          break
        }

        case 'buff_next_skill':
          if (callbacks?.onBuffNextSkill) {
            callbacks.onBuffNextSkill(behavior.multiplier)
            result.executedCount++
          }
          break
      }
    }

    return result
  }
}
```

### 深度限制行为

| 行为类型 | 受深度限制 | 原因 |
|---------|-----------|------|
| intercept | 不适用 | 在 pendingBehaviors 中被忽略 |
| trigger_adjacent | 是 | 可产生链式触发 |
| trigger_skill | 是 | 可产生链式触发 |
| buff_next_skill | 否 | 不产生新触发，只设置临时状态 |

### 子结果累加规则

```typescript
// 递归调用后合并结果
result.executedCount += sub.executedCount
result.skippedByDepth += sub.skippedByDepth
result.chainDepthReached = Math.max(result.chainDepthReached, sub.chainDepthReached)
```

### 与现有系统的关系

**本 Story 只修改 modifiers 模块内部，不改外部文件：**
- 修改 `ModifierTypes.ts` — 添加 BehaviorCallbacks, BehaviorExecutionResult
- 新增 `BehaviorExecutor.ts` — 行为处理器实现
- 修改 `index.ts` — 新增导出
- 新增 `BehaviorExecutor.test.ts` — 单元测试

**11.5 (技能迁移) 将接入实际回调：**
- `onTriggerAdjacent` → 调用 `getAdjacentSkills()` + `EffectPipeline.resolve()` per adjacent
- `onTriggerSkill` → 调用 `EffectPipeline.resolve()` for specific skill
- `onBuffNextSkill` → 注册临时 enhance modifier via registry

**参考现有行为模式（11.5 迁移目标）：**
- `skills.ts:114-124` — echo: 对相邻技能 setTimeout 触发 → 将变为 `trigger_adjacent` 行为
- `skills.ts:140-146` — ripple: 设置 synergy.rippleBonus → 将变为 `buff_next_skill` 行为
- `skills.ts:149-164` — echo 被动触发: 相邻 echo 概率触发 → 将变为条件 `random` + `trigger_skill`
- `skills.ts:82-84` — protect: 设置 shieldCount → Phase 2 calculate 效果 (shield type)

### Project Structure Notes

```
src/src/systems/modifiers/
├── ModifierTypes.ts          # 添加 BehaviorCallbacks, BehaviorExecutionResult（修改）
├── ModifierRegistry.ts       # 不修改
├── EffectPipeline.ts         # 不修改
├── ConditionEvaluator.ts     # 不修改
├── BehaviorExecutor.ts       # 行为处理器（新增）
└── index.ts                  # 更新导出（修改）

src/tests/unit/systems/modifiers/
├── ModifierRegistry.test.ts  # 不修改
├── EffectPipeline.test.ts    # 不修改
├── ConditionEvaluator.test.ts # 不修改
└── BehaviorExecutor.test.ts  # 单元测试（新增）
```

### References

- [Source: docs/epics.md#Epic 11, Story 11.4 — 行为修饰器框架]
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向 A — Interceptor/Reactor]
- [Source: docs/stories/11-1-modifier-interface-registry.md — ModifierBehavior 4 种类型]
- [Source: docs/stories/11-2-three-layer-pipeline.md — pendingBehaviors 收集机制]
- [Source: docs/stories/11-3-condition-system.md — 条件评估集成模式]
- [Source: src/src/systems/modifiers/EffectPipeline.ts — Phase 3 pendingBehaviors]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — ModifierBehavior, PipelineResult]
- [Source: src/src/systems/skills.ts:114-164 — echo/ripple 行为参考（11.5 迁移目标）]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 扩展 ModifierTypes.ts：添加 BehaviorCallbacks（3 个可选回调）和 BehaviorExecutionResult（3 个字段）
- 实现 BehaviorExecutor.execute() 静态方法，回调驱动的行为处理器：
  - intercept: 跳过（已在 EffectPipeline Phase 1 处理）
  - trigger_adjacent: 通过回调触发，递归处理子行为，深度限制
  - trigger_skill: 通过回调触发，递归处理子行为，深度限制
  - buff_next_skill: 通过回调通知，不受深度限制
- MAX_DEPTH=3 链式深度限制，防止无限递归
- chainDepthReached 追踪：触发行为成功后设为 depth+1，递归取 max
- 跳过空 pendingBehaviors 的递归调用（优化）
- 缺失回调时安全跳过，不报错
- 更新 index.ts 导出 BehaviorExecutor 和新类型
- 20 个新增单元测试，全部 1498 个测试通过，零回归
- 纯模块内修改，未改动任何技能或遗物文件
- [Code Review] 新增 2 个测试：trigger_adjacent 多 PipelineResults + trigger_skill 非触发类子行为
- [Code Review] 移除测试文件中未使用的 BehaviorExecutionResult 类型导入
- 全部 1500 个测试通过（+2 review 新增），零回归

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` — 添加 BehaviorCallbacks, BehaviorExecutionResult（修改）
- `src/src/systems/modifiers/BehaviorExecutor.ts` — 行为处理器实现（新增）
- `src/src/systems/modifiers/index.ts` — 更新导出（修改）
- `src/tests/unit/systems/modifiers/BehaviorExecutor.test.ts` — 单元测试（新增）
