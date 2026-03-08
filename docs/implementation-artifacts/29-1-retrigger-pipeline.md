# Story 29.1: 重触发管道支持

Status: done

## Story

As a 玩家,
I want 遗物能让已触发的技能再次执行,
so that T3 遗物类型（重触发）有管道基础设施支持。

## Acceptance Criteria

1. `ModifierBehavior` 支持 `{ type: 'retrigger' }` 行为类型
2. `BehaviorExecutor` 能正确处理 retrigger 行为（触发回调）
3. `BehaviorCallbacks` 包含 `onRetrigger?(): void` 回调
4. `PipelineContext` 包含 `isRetriggered?: boolean` 字段
5. `skills.ts` 中 `triggerSkill` 在技能执行后检查 retrigger 行为，若命中则再次执行同一技能
6. 防循环：重触发的技能（`isRetriggered = true`）不可被再次重触发
7. 所有现有测试通过（2790+），新增 retrigger 管道测试全绿

## Tasks / Subtasks

- [x] Task 1: ModifierTypes.ts — 类型扩展 (AC: #1, #3, #4)
  - [x] 1.1 `ModifierBehavior` 联合类型添加 `| { type: 'retrigger' }`
  - [x] 1.2 `BehaviorCallbacks` 添加 `onRetrigger?(): void`
  - [x] 1.3 `PipelineContext` 添加 `isRetriggered?: boolean`
- [x] Task 2: BehaviorExecutor.ts — retrigger 处理 (AC: #2)
  - [x] 2.1 `execute()` switch 添加 `case 'retrigger'`，调用 `callbacks?.onRetrigger?.()`，递增 `executedCount`
  - [x] 2.2 注意：retrigger 不是链式触发行为，**不需要** depth 检查
- [x] Task 3: skills.ts — 重触发集成 (AC: #5, #6)
  - [x] 3.1 添加模块级标志 `_retriggerRequested: boolean = false`
  - [x] 3.2 在 `getRelicSkillMultiplier` 的 callbacks 中添加 `onRetrigger: () => { _retriggerRequested = true }`
  - [x] 3.3 在 `triggerAmplifier` 末尾添加 retrigger 检查（因为 amplifier 不调用 `getRelicSkillMultiplier`）
  - [x] 3.4 重构 `triggerSkill` 控制流：移除 producer/converter/amplifier 分支的 `return`，改为 `if/else if`，在最后添加 retrigger 检查
  - [x] 3.5 传递 `isRetriggered: _isRetriggered` 到 `getRelicSkillMultiplier` 的上下文
  - [x] 3.6 retrigger 触发时显示浮字反馈 `showFeedback('重触发!', '#ff6b00')`
- [x] Task 4: 测试 (AC: #7)
  - [x] 4.1 BehaviorExecutor 单元测试：retrigger 行为触发回调
  - [x] 4.2 集成测试：注册 retrigger 行为的遗物 → 技能执行两次
  - [x] 4.3 防循环测试：已 retrigger 的技能不再 retrigger

## Dev Notes

### 核心机制

重触发管道通过 **行为回调模式** 实现（与 `time_steal`、`remove_relic` 等行为一致），而非修改 `PipelineResult` 返回值。流程：

```
玩家击键 → triggerSkill(id, key)
  → triggerProducer/Converter/Amplifier
    → getRelicSkillMultiplier(category)
      → resolveRelicSkillTrigger(ctx, { onRetrigger })
        → EffectPipeline.resolve → pendingBehaviors 包含 retrigger
        → BehaviorExecutor.execute → onRetrigger() → _retriggerRequested = true
  → 技能执行完毕
  → 检查 _retriggerRequested && !_isRetriggered
    → true → _isRetriggered = true → triggerSkill(id, key) [再次执行]
              → 第二次执行中 isRetriggered=true → 不会再次触发 retrigger
```

### triggerSkill 控制流重构

当前 `triggerSkill` 用 `if + return` 分支，需改为 `if/else if` 无 return（除 connector 外），在末尾统一执行 retrigger 检查：

```typescript
export function triggerSkill(skillId, triggerKey, chainHistory?) {
  // ...设置 _isChainTrigger, _currentTriggerKey...
  _retriggerRequested = false

  if (isProducer(skillId)) {
    triggerProducer(skillId, triggerKey)
    checkResourceTriggers(...)
    checkResonanceTriggers(triggerKey)
  } else if (isConverter(skillId)) {
    triggerConverter(skillId, triggerKey)
    checkResourceTriggers(...)
    checkResonanceTriggers(triggerKey)
  } else if (isConnector(skillId)) {
    // 连接者不可重触发（会导致链式触发混乱）
    const conn = CONNECTORS[skillId]
    if (conn.triggerType === 'copy') triggerConnectorCopy(...)
    return
  } else if (isAmplifier(skillId)) {
    triggerAmplifier(skillId, triggerKey)
  } else {
    return
  }

  // 重触发检查（仅限非 retrigger 上下文）
  if (_retriggerRequested && !_isRetriggered) {
    _retriggerRequested = false
    _isRetriggered = true
    showFeedback('重触发!', '#ff6b00')
    triggerSkill(skillId, triggerKey, chainHistory)
    _isRetriggered = false
  }
}
```

### Amplifier 的 retrigger 支持

`triggerAmplifier` 不调用 `getRelicSkillMultiplier`，因此 retrigger 回调不会被自动收集。需在 `triggerAmplifier` 末尾添加：

```typescript
// 在 triggerAmplifier 末尾（eventBus.emit 之后）：
resolveRelicSkillTrigger({
  currentSkillCategory: 'amplifier',
  isRetriggered: _isRetriggered,
}, {
  onRetrigger: () => { _retriggerRequested = true },
})
```

返回的 score 值无需使用（amplifier 纯叠层），仅利用其行为回调。

### getRelicSkillMultiplier 修改

在现有 callbacks 对象中添加 `onRetrigger`：

```typescript
function getRelicSkillMultiplier(category: string): number {
  return resolveRelicSkillTrigger({
    currentSkillCategory: category,
    isChainedTrigger: _isChainTrigger,
    isRetriggered: _isRetriggered,       // 新增
    amplifierMaxStacks: getMaxAmplifierStacks(),
    equippedProducerCount: getEquippedProducerCount(),
    wordHasProducerTriggered: _wordHasProducerTriggered,
    currentSkillKey: _currentTriggerKey,
  }, {
    onTimeSteal: (bonus) => { state.time += bonus },
    onRetrigger: () => { _retriggerRequested = true },  // 新增
  })
}
```

### ConditionEvaluator 无需修改

Story 29-1 不添加新条件类型。遗物条件（如 `isFirstSkillInWord`）是 Story 29-2 的范围。

### 关键文件清单

| 文件 | 操作 |
|------|------|
| `src/src/systems/modifiers/ModifierTypes.ts` | 修改：+1 行为, +1 回调, +1 上下文字段 |
| `src/src/systems/modifiers/BehaviorExecutor.ts` | 修改：+1 case 分支 |
| `src/src/systems/skills.ts` | 修改：控制流重构 + retrigger 集成 |
| `src/tests/unit/systems/modifiers/BehaviorExecutor.test.ts` | 修改：retrigger 单元测试 |
| `src/tests/unit/systems/relics/relics.t3.test.ts` | 新建：retrigger 管道集成测试 |

### Project Structure Notes

- 遵循现有行为模式：`ModifierBehavior` → `BehaviorExecutor case` → `BehaviorCallbacks` 回调
- 遵循现有遗物测试命名：`relics.t3.test.ts`（按 Tier 分文件）
- `_retriggerRequested` / `_isRetriggered` 遵循现有模块级标志模式（`_isChainTrigger`, `_splashActive`, `_resonanceActive` 等）

### References

- [Source: docs/planning-artifacts/relic-implementation-plan.md §Epic 5 Story 5.1]
- [Source: src/src/systems/modifiers/ModifierTypes.ts — ModifierBehavior L41-60, BehaviorCallbacks L207-241, PipelineContext L135-202]
- [Source: src/src/systems/modifiers/BehaviorExecutor.ts — execute() L23-202]
- [Source: src/src/systems/skills.ts — triggerSkill L923-959, getRelicSkillMultiplier L101-114]
- [Source: src/src/systems/relics/RelicPipeline.ts — resolveRelicSkillTrigger L101-125]

### 前序 Story 模式

Story 28.2/28.3 建立的模式：
- 行为型遗物通过 `BehaviorCallbacks` 回调执行，不修改 `PipelineResult` 结构
- `resolveRelicSkillTrigger` 已支持 `onTimeSteal` 等行为回调
- 模块级标志（`_isChainTrigger`, `_splashActive`）用于防递归，retrigger 遵循相同模式
- `skills.ts` 是技能触发的唯一入口，所有 retrigger 逻辑集中在此

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: ModifierTypes.ts 扩展 — 添加 `retrigger` 行为类型、`onRetrigger` 回调、`isRetriggered` 上下文字段
- Task 2: BehaviorExecutor.ts — 添加 `case 'retrigger'` 处理，不受深度限制，简单回调触发
- Task 3: skills.ts 重触发集成 — 添加 `_retriggerRequested`/`_isRetriggered` 模块级标志；`getRelicSkillMultiplier` 添加 `onRetrigger` 回调和 `isRetriggered` 上下文；`triggerAmplifier` 末尾添加 retrigger 行为检查；`triggerSkill` 控制流从 `if+return` 重构为 `if/else if`，末尾统一执行 retrigger 检查（连接者除外）
- Task 4: 测试 — 9 个新测试（4 个 BehaviorExecutor 单元测试 + 5 个管道集成测试），全部通过
- 全量回归：109 文件 / 2799 测试 / 0 失败

### Code Review Fixes (AI)

- **[HIGH] `_retriggerRequested` 嵌套调用覆写** — `triggerSkill` 中 `checkResourceTriggers` 嵌套调用 `triggerSkill` 会重置模块级标志。修复：在技能 dispatch 后立即用局部变量 `shouldRetrigger` 捕获标志，链式触发后使用局部变量判断。
- **[MEDIUM] `triggerAmplifier` 上下文不完整** — 末尾 `resolveRelicSkillTrigger` 调用缺少 `isChainedTrigger`、`amplifierMaxStacks` 等字段。修复：与 `getRelicSkillMultiplier` 保持一致传递完整上下文。
- **[MEDIUM] `triggerSkill` retrigger 流无集成测试** — 新增 5 个集成测试覆盖：retrigger 产出者/增幅者翻倍、防循环、浮字反馈、未启用时正常。

### Change Log

- 2026-03-07: Story 29-1 实现完成 — T3 重触发管道基础设施
- 2026-03-07: Code review — 修复 3 个问题（1 HIGH + 2 MEDIUM），新增 5 个集成测试

### File List

- `src/src/systems/modifiers/ModifierTypes.ts` (修改)
- `src/src/systems/modifiers/BehaviorExecutor.ts` (修改)
- `src/src/systems/skills.ts` (修改)
- `src/tests/unit/systems/relics/relics.t3.test.ts` (新建)
- `src/tests/unit/systems/retrigger-integration.test.ts` (新建 — review fix)
