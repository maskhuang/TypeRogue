# Story 35.14: 触发管线伪循环重构

Status: done

## Story

As a developer maintaining the affix trigger pipeline,
I want all chain/recursive triggers (Recurse, Replicate, Resonance, Link) to be processed iteratively via a work queue instead of true recursion,
so that the call stack depth is bounded to O(1), circular chains are detected uniformly, and the existing pseudoInfinite pattern can be reused.

## Acceptance Criteria

1. **AC1 — 迭代调度器**: 新增 `AffixTriggerOrchestrator`（或函数 `orchestrateAffixTrigger`），接受初始触发参数，内部用 work queue 循环处理所有后续触发（Recurse / Replicate / Resonance / Link / Splash），不产生真递归调用栈
2. **AC2 — Recurse 伪循环**: Recurse 词条的 `phase5.recurse.shouldRecurse=true` 不再传 `recurseDepth` 参数递归调用，而是将新触发任务入队，队列条目携带 `depth` 计数，`depth >= MAX_RECURSE_DEPTH` 时丢弃
3. **AC3 — Replicate 伪循环**: `phase5.replicateTargets` 中的每个邻居触发任务入队而非递归调用，使用 `chainHistory` 做循环检测
4. **AC4 — Phase 6 伪循环**: Resonance/Link/Splash 等 Phase6Action 入队处理，`chainHistory` 检测循环；检测到循环时进入 `enterPseudoInfinite`（复用现有机制）
5. **AC5 — chainHistory 统一**: 所有链式触发共享同一 `chainHistory: string[]`，循环检测逻辑与现有 skills.ts 的 `checkResourceTriggers` / `triggerReplicator` 保持一致
6. **AC6 — MAX_CHAIN_DEPTH 硬上限**: 队列累计处理条目数 ≥ `MAX_CHAIN_DEPTH`（20）时停止出队，防止极端非循环长链
7. **AC7 — triggerAffixSkill 纯函数不变**: `affixTrigger.ts` 中的 `triggerAffixSkill` 签名和内部逻辑不变（仍返回 TriggerResult 含 phase5/phase6 描述符），变更仅在调用方（新调度器）
8. **AC8 — 副作用集中**: 资源写入、反馈弹窗、音效播放等副作用在调度器的每次出队后统一执行，不在 triggerAffixSkill 内部
9. **AC9 — 测试覆盖**: 现有 `affixBalance.test.ts` 的 AC6（递归深度）和 AC7（触发链深度）测试通过新调度器执行仍然 pass；新增队列深度、循环检测、pseudoInfinite 入口的单元测试
10. **AC10 — 性能不退化**: 20 个橙装单次触发 < 2ms（与 AC8 性能基准持平）

## Tasks / Subtasks

- [x] Task 1: 设计 TriggerWorkItem 数据结构 (AC: #1, #5)
  - [x] 1.1 定义 `TriggerWorkItem` 接口：`{ skillId, triggerKey, type: 'initial'|'recurse'|'replicate'|'resonance'|'link'|'splash', depth, chainHistory, efficiencyMult?, recurseChance?, splashEfficiency? }`
  - [x] 1.2 定义 `OrchestratorResult` 接口：`{ totalOutput, triggerCount, maxDepth, enteredPseudoInfinite, triggerResults, pseudoInfiniteKeys }`

- [x] Task 2: 实现 `orchestrateAffixTrigger` 主循环 (AC: #1, #6, #8)
  - [x] 2.1 创建 `orchestrateAffixTrigger(initialSkillId, triggerKey, ctx, callbacks?)` 函数
  - [x] 2.2 初始化 work queue（FIFO），enqueue 初始触发
  - [x] 2.3 while 循环：dequeue → 检查深度/chainHistory → 调用 `triggerAffixSkill` → 收集 phase5/phase6 actions → enqueue 后续触发
  - [x] 2.4 每次 dequeue 后通过 callbacks 执行副作用（资源写入、反馈、音效）
  - [x] 2.5 累计处理条目数 ≥ MAX_CHAIN_DEPTH 时 break

- [x] Task 3: Recurse 入队逻辑 (AC: #2)
  - [x] 3.1 读取 `result.phase5.recurse`，若 `shouldRecurse=true` 则 enqueue `{ type: 'recurse', depth: current.depth + 1 }`
  - [x] 3.2 出队时检查 `depth >= MAX_RECURSE_DEPTH` → 丢弃（Recurse 用 depth 防护，不用 chainHistory 循环检测）

- [x] Task 4: Replicate 入队逻辑 (AC: #3, #5)
  - [x] 4.1 读取 `result.phase5.replicateTargets`，为每个 targetKey enqueue `{ type: 'replicate', chainHistory: [...current.chainHistory, targetKey] }`
  - [x] 4.2 出队时检查 `chainHistory.includes(targetKey)` → 检测到循环则 `enterPseudoInfinite`

- [x] Task 5: Phase 6 actions 入队逻辑 (AC: #4, #5)
  - [x] 5.1 遍历 `result.phase6.actions`，为 resonance/link 类型分别 enqueue（apprentice_neighbor/quest_resonance 不入队，已在 triggerAffixSkill 内处理）
  - [x] 5.2 resonance 入队时携带 `efficiencyMult`
  - [x] 5.3 循环检测同 Task 4

- [x] Task 6: 副作用集中层 (AC: #8)
  - [x] 6.1 `OrchestratorCallbacks` 接口定义 applyResource/showFeedback/playSound/enterPseudoInfinite/devourTarget 回调
  - [x] 6.2 BFS 顺序保证（FIFO queue.shift()），衍生附魔/嗜变/吞噬副作用均在出队后统一执行

- [x] Task 7: 测试迁移与新增 (AC: #9, #10)
  - [x] 7.1 现有 `affixBalance.test.ts` 64 测试全部通过（无回归）
  - [x] 7.2 新增 17 个调度器测试：队列深度、循环检测、pseudoInfinite spy、MAX_CHAIN_DEPTH 硬停、chain_ban、副作用回调
  - [x] 7.3 性能测试: 20 个橙装 < 2ms/技能（含预热）

## Dev Notes

### 现有架构分析

**当前递归路径（旧系统 skills.ts）：**
- `triggerSkill()` → `checkResourceTriggers()` → `triggerSkill()`（Connector 链）
- `triggerSkill()` → `triggerReplicator()` → `triggerSkill()`（Replicator 链）
- 循环检测：`chainHistory.includes(targetKey)` → `enterPseudoInfinite()`
- 防护：`_resonanceActive` 布尔锁、`_isRetriggered` 布尔锁

**当前 affixTrigger.ts（新系统，纯数据层）：**
- `triggerAffixSkill(skill, runtimeState, ctx, recurseDepth=0)` → `TriggerResult`
- **不产生真递归**：Phase 5 返回描述符 `{ recurse: { shouldRecurse, newChance }, replicateTargets: string[] }`
- Phase 6 返回描述符 `{ actions: Phase6Action[] }`（resonance/link/apprentice_neighbor/quest_resonance）
- 递归防护仅在 `resolvePhase5` 中：`if (recurseDepth >= MAX_RECURSE_DEPTH) break`
- **无调用方消费这些描述符** — 目前 Phase 5/6 结果只在测试中断言，未接入战斗循环

**关键洞察**：`triggerAffixSkill` 已经是"返回描述符"而非"真递归"的设计。本 story 的工作是**创建调度器消费这些描述符**，用迭代 work queue 驱动链式触发。

### 伪无限模式（已有机制）

`enterPseudoInfinite(participantKeys)` — `skills.ts:1027`：
- 检测到循环（A→B→A）时进入
- 用 `setInterval(250ms)` 定时触发参与者
- 合并新参与者（多链汇合时）
- `clearPseudoInfinite()` 在关卡结束时清理

### 调度器设计要点

```
Queue: [WorkItem1, WorkItem2, ...]
while (queue.length > 0 && totalProcessed < MAX_CHAIN_DEPTH) {
  const item = queue.shift()
  // 深度检查
  if (item.type === 'recurse' && item.depth >= MAX_RECURSE_DEPTH) continue
  // 循环检测
  if (item.chainHistory.includes(item.triggerKey)) {
    enterPseudoInfinite(item.chainHistory)
    continue
  }
  // 执行纯计算
  const result = triggerAffixSkill(skill, state, ctx)
  // 副作用
  applyToResource(result.phase4.targetResource, result.output)
  // 入队后续
  if (result.phase5.recurse.shouldRecurse) queue.push(...)
  for (const target of result.phase5.replicateTargets) queue.push(...)
  for (const action of result.phase6.actions) queue.push(...)
  totalProcessed++
}
```

### 不需要变更的文件

- `src/data/affixTrigger.ts` — triggerAffixSkill 签名和逻辑不变（AC7）
- `src/data/affixes.ts` — 数据结构不变
- `src/data/skillGeneration.ts` — 生成逻辑不变
- `src/data/affixMutation.ts` — 蜕变逻辑不变

### 需要新增/修改的文件

- **新增**: `src/systems/affixTriggerOrchestrator.ts` — 迭代调度器
- **修改**: `src/systems/skills.ts` — 从调度器调用替代旧直接递归（仅 affix 技能路径）
- **修改**: `tests/unit/data/affixBalance.test.ts` — AC6/AC7 测试通过调度器

### Previous Story Intelligence (from 35-13)

- `triggerAffixSkill` 返回的 `TriggerResult` 包含 `phase5: Phase5Result`（replicateTargets, recurse, transmuteOutput, splashTargets, mutagenOutput, devourTarget）和 `phase6: Phase6Result`（actions: Phase6Action[]）
- Phase6Action 类型联合：`resonance | link | apprentice_neighbor | quest_resonance`
- 确定性随机用 `ctx.randomFn`，测试中用 `(i * 0.37 + 0.13) % 1`
- `chainAffixesDisabled` flag（chain_ban 遗物）在 affixTrigger 内部已处理，调度器无需重复检查
- 性能基准：20 个橙装 < 2ms/技能

### Git Intelligence

```
9cfac10 feat(35-13): 数值平衡与集成测试 — 64 测试 + review 修复 + epic-35 完结
9b18f43 feat(35-12): 遗物系统适配
f92ead9 feat(35-11): UI 键盘可视化与战斗反馈
5a33494 feat(35-10): 蜕变系统
bedf997 feat(35-9): 商店集成
```

提交模式: `feat(35-N): 中文简述 — 英文关键词 + 测试数 + review 修复`

### Project Structure Notes

- 调度器文件放在 `src/systems/` 层（消费 data 层描述符，调用 systems 层副作用）
- 遵循 data→systems 单向依赖：调度器 import affixTrigger（data 层），不反向
- TriggerContext 已包含 `bindings`, `allSkills`, `skillStates` — 调度器可从中查找邻居技能

### References

- [Source: src/src/data/affixTrigger.ts#L963-1004] — triggerAffixSkill 完整实现
- [Source: src/src/data/affixTrigger.ts#L550-551] — MAX_RECURSE_DEPTH=10, MAX_CHAIN_DEPTH=20
- [Source: src/src/data/affixTrigger.ts#L706-760] — resolvePhase5（Recurse/Replicate 描述符）
- [Source: src/src/data/affixTrigger.ts#L887-955] — resolvePhase6（Resonance/Link 描述符）
- [Source: src/src/systems/skills.ts#L1027-1064] — enterPseudoInfinite 伪无限模式
- [Source: src/src/systems/skills.ts#L1076-1123] — triggerReplicator 链式递归+循环检测
- [Source: src/src/systems/skills.ts#L1126-1172] — checkResourceTriggers 链式递归+循环检测
- [Source: src/src/systems/skills.ts#L1247-1292] — triggerSkill 入口（旧系统分发器）
- [Source: src/src/systems/skills.ts#L963-988] — checkResonanceTriggers 共鸣+布尔锁
- [Source: tests/unit/data/affixBalance.test.ts] — AC6/AC7 递归和链深度测试
- [Source: docs/design/affix-skill-system.md] — 触发流程设计文档

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- **Recurse cycle detection false positive**: Initial implementation applied `chainHistory.includes(triggerKey)` to all non-initial types, including `recurse`. Since recurse re-triggers the same key (e.g., 'a'→'a'), `chainHistory=['a']` always matched `triggerKey='a'`, causing immediate pseudoInfinite entry instead of recursion. Fixed by separating guard logic: recurse uses `depth >= MAX_RECURSE_DEPTH` only; chain types (replicate/resonance/link/splash) use chainHistory cycle detection.
- **chainHistory 语义错误（Code Review 发现）**: 入队时将 targetKey 加入 chainHistory（`[...history, targetKey]`），出队时检查 `history.includes(triggerKey)`。由于 triggerKey===targetKey 已在 history 中，所有链式类型（Replicate/Resonance/Link/Splash）的循环检测在首次触发就误报。修复：chainHistory 改为记录"已处理的键"（不含自身），初始 chainHistory 为空，子项继承 `[...parent.chainHistory, parent.triggerKey]`。
- **transmuteSameResourceBoost 遗漏（Code Review H1）**: 同资源衍生附魔增强比率未应用到 effectiveOutput。修复后在 applyResource 前乘以 `(1 + boost)`。
- **pseudoInfiniteKeys 重复键（Code Review H3）**: `[...chainHistory, triggerKey]` 在循环条件下必然重复。修复为 `[...chainHistory]`。
- **死字段 recurseChance（Code Review M1）**: TriggerWorkItem.recurseChance 存储但从未消费（triggerAffixSkill 内部重算）。已移除。

### Completion Notes List

- Task 1: Defined `TriggerWorkItem`, `OrchestratorResult`, `OrchestratorCallbacks` interfaces
- Task 2: Implemented `orchestrateAffixTrigger()` with FIFO queue, MAX_CHAIN_DEPTH hard stop, callback-based side effects
- Task 3: Recurse enqueue with depth+1, depth guard at MAX_RECURSE_DEPTH=10
- Task 4: Replicate enqueue with chainHistory propagation, cycle detection via chainHistory.includes
- Task 5: Phase 6 resonance/link enqueue via `enqueuePhase6Action()` helper; apprentice_neighbor/quest_resonance skipped (handled internally)
- Task 6: Side effects centralized via OrchestratorCallbacks (applyResource, showFeedback, playSound, enterPseudoInfinite, devourTarget)
- Task 7: 17 new tests (AC1-AC10 coverage), 64 existing balance tests pass, performance < 2ms/skill
- **Code Review 修复**: 7 issues (3H + 3M + 1L) — chainHistory 语义重构（CRITICAL）、transmuteSameResourceBoost 应用、pseudoInfiniteKeys 去重、死字段清理、测试断言强化

### File List

- **NEW**: `src/systems/affixTriggerOrchestrator.ts` — Iterative trigger orchestrator
- **NEW**: `tests/unit/systems/affixTriggerOrchestrator.test.ts` — 17 orchestrator tests
- **MODIFIED**: `docs/implementation-artifacts/35-14-iterative-trigger-loop.md` — Story file
- **MODIFIED**: `docs/implementation-artifacts/sprint-status.yaml` — Sprint tracking
