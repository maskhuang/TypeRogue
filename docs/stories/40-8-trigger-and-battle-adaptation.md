# Story 40.8: 触发系统基础适配

Status: done

## Story

As a 玩家,
I want 多格技能在战斗中能从任何占据键位正确触发,
so that 多格技能的战斗体验自然流畅，无重复触发或异常行为.

## Acceptance Criteria

1. **AC1: 任意占据键触发** — 按下多格技能占据的任一键位，正确触发该技能（`bindings.get(key)` 返回相同 skillId）
2. **AC2: 单次按键不重复触发** — 同一按键事件（同一字母处理周期）中，同一技能不会被连锁/溅射/共鸣机制二次触发到自身占据的键位
3. **AC3: 扩展邻居计算** — `getExtendedNeighbors(occupiedKeys, posRel)` 正确返回所有占据键位的邻居并集，排除技能自身占据的键位
4. **AC4: TriggerContext.occupiedKeys 向后兼容** — 单格技能 `occupiedKeys = [triggerKey]`，与现有行为完全一致
5. **AC5: 连锁动画起点** — 连锁触发的飞行动画从实际按下的键位（`triggerKey`）发起，不从锚点发起
6. **AC6: 单元测试** — 覆盖去重逻辑、扩展邻居计算、2/3/4 格技能场景

## Tasks / Subtasks

- [x] Task 1: TriggerContext 扩展 occupiedKeys 字段 (AC: #4)
  - [x] 1.1 在 `affixTrigger.ts` 的 `TriggerContext` 接口新增 `occupiedKeys: string[]` 字段（非 optional，必填）
  - [x] 1.2 在 `skills.ts` 的 `triggerAffixSkillWithFeedback()` 中，调用 `getSkillKeys(getBindingState(state), skillId)` 获取所有占据键位
  - [x] 1.3 将 `occupiedKeys` 注入 `TriggerContext` 构造对象中
  - [x] 1.4 单格技能自然降级：`getSkillKeys` 返回 `[triggerKey]`（monomino 兼容）
- [x] Task 2: 连锁去重 — 排除自身占据键 (AC: #2)
  - [x] 2.1 在 `affixTrigger.ts` 的 `resolvePhase6`（邻居通知）中，构建 `occupiedKeySet = new Set(ctx.occupiedKeys)`
  - [x] 2.2 邻居遍历时跳过 `occupiedKeySet.has(neighborKey)` 的键位（当前技能自身占据的键不参与邻居通知）
  - [x] 2.3 在 `resolvePhase5`（Splash 溅射）中，同样跳过 `occupiedKeySet` 中的键位
  - [x] 2.4 cascade 连锁（Phase 3）保持不变：cascade 检查 `prevKey` vs `triggerKey` 关系，不涉及 `occupiedKeys`
- [x] Task 3: getExtendedNeighbors 纯函数 (AC: #3)
  - [x] 3.1 在 `affixTrigger.ts` 中导出 `getExtendedNeighbors(occupiedKeys: string[], posRel: PositionRelation): string[]`
  - [x] 3.2 实现：遍历所有 `occupiedKeys`，对每个调用 `getKeysWithRelation(key, posRel)`，合并结果并排除 `occupiedKeys` 自身
  - [x] 3.3 结果去重（Set → Array）
  - [x] 3.4 本 story 仅导出函数，Phase 5/6 中的实际替换在 Story 40.9 完成
- [x] Task 4: AC5 验证 — 连锁动画起点 (AC: #5)
  - [x] 4.1 确认 `skill:triggered` 事件的 `key` 字段使用 `triggerKey`（实际按键），非锚点键
  - [x] 4.2 确认 `orchestrateAffixTrigger` 的 `TriggerWorkItem.triggerKey` 传递链路正确
  - [x] 4.3 如果发现使用锚点键则修正（预期无需修改，仅验证）
- [x] Task 5: 单元测试 (AC: #6)
  - [x] 5.1 测试 `getExtendedNeighbors`：domino [f,g] + posRel='adjacent' → 返回 f 和 g 的邻居并集，不含 f、g 自身
  - [x] 5.2 测试 `getExtendedNeighbors`：triomino [e,r,d] → 邻居并集正确
  - [x] 5.3 测试 `getExtendedNeighbors`：monomino [f] → 等价于 `getKeysWithRelation(f, posRel)`
  - [x] 5.4 测试 Phase 6 去重：模拟 domino [f,g]，f 触发后 Phase 6 邻居通知不会再触发 g 上的同一技能
  - [x] 5.5 测试 Phase 5 去重：Splash 溅射不溅射到自身占据键
  - [x] 5.6 测试 TriggerContext.occupiedKeys：单格 = [triggerKey]，多格 = getSkillKeys 返回值
  - [x] 5.7 测试向后兼容：monomino 技能的 Phase 5/6 行为与现有完全一致

## Dev Notes

### 关键设计决策

**AC1 已天然满足**：当前 `bindings: Map<key, skillId>` 中多格技能的每个键都映射到相同 skillId。`battle.ts` 中 `bindings.get(key)` 查找已正确返回技能，无需额外修改触发入口。

**去重策略 — Phase 级排除而非全局 Set**：不采用全局 `triggeredSkillsThisKeystroke` Set（因为同一技能在不同字母处理中被触发是合法的），而是在 Phase 5（Splash）和 Phase 6（邻居通知）中排除自身占据键。这样：
- 正常按键触发：每个字母独立触发一次 → 合法
- 连锁到自身键：Phase 6 邻居遍历跳过自身占据键 → 去重
- Splash 溅射到自身键：Phase 5 过滤掉自身占据键 → 去重

**`getExtendedNeighbors` 仅导出不替换**：本 story 定义并导出该函数，但 Phase 5/6 中的实际调用替换（`getKeysWithRelation(triggerKey)` → `getExtendedNeighbors(occupiedKeys)`）留给 Story 40.9。本 story 的去重仅需 `occupiedKeySet` 过滤。

**连锁动画起点（AC5）**：当前 `skill:triggered` 事件已使用 `triggerKey`（实际按下的键），非锚点键。无需修改，仅需验证确认。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/data/affixTrigger.ts:24-71` | `TriggerContext` 接口 | 触发上下文定义 | 是：新增 `occupiedKeys` |
| `src/src/data/affixTrigger.ts:671-688` | `resolvePhase5` Splash | 溅射逻辑 `getKeysWithRelation` | 是：添加 occupiedKeys 过滤 |
| `src/src/data/affixTrigger.ts:797-864` | `resolvePhase6` 邻居通知 | 邻居遍历 + hasRelation | 是：添加 occupiedKeys 过滤 |
| `src/src/systems/skills.ts:182-206` | `triggerAffixSkillWithFeedback` | 构造 TriggerContext | 是：注入 occupiedKeys |
| `src/src/systems/skills.ts:171-179` | `triggerSkill` | 触发入口 | 不改 |
| `src/src/systems/affixTriggerOrchestrator.ts:86-230` | `orchestrateAffixTrigger` | 连锁调度 | 不改（去重在 Phase 级处理） |
| `src/src/systems/battle.ts:490-520` | `playerCorrect` | 按键处理 + triggerSkill 调用 | 不改（binding lookup 已正确） |
| `src/src/systems/bindingManager.ts:113-121` | `getSkillKeys()` | 获取技能所有占据键 | 不改（调用） |
| `src/src/systems/bindingManager.ts:126-133` | `getSkillAnchorKey()` | 获取锚点键 | 不改（参考） |
| `src/src/systems/bindingManager.ts:6-29` | `getBindingState()` | 构建 BindingState | 不改（调用） |
| `src/src/systems/keywords/KeyboardTopology.ts` | `getKeysWithRelation()` | 空间关系键位查询 | 不改（调用） |
| `src/src/systems/keywords/KeyboardTopology.ts` | `hasRelation()` | 两键关系判定 | 不改（调用） |

### 约束

- **仅修改** `affixTrigger.ts`（TriggerContext + Phase 5/6 过滤）和 `skills.ts`（注入 occupiedKeys）
- **可选新增** `triggerHelpers.ts`（`getExtendedNeighbors` 纯函数）— 或直接放在 `affixTrigger.ts`
- **不修改** `bindingManager.ts`、`shop.ts`、`KeyboardVisualizer.ts`
- `battle.ts`：仅补充 `occupiedKeys` 到 `resolveMirrorCopy` 调用（接口兼容修复）
- `affixTriggerOrchestrator.ts`：链式触发上下文注入 `occupiedKeys: [item.triggerKey]`（monomino 假设，40.9 扩展）
- `TriggerContext.occupiedKeys` 为必填 `string[]`，不用 optional（所有调用处都应提供）
- `getExtendedNeighbors` 仅定义和导出，不在 Phase 5/6 中调用（留给 40.9）
- 向后兼容：单格技能 `occupiedKeys = [triggerKey]`，Phase 5/6 过滤无效果（occupiedKeySet 仅含 triggerKey，现有逻辑已排除 triggerKey）

### Previous Story Intelligence

**Story 40.7（键盘可视化多格适配）实现笔记：**
- `computeEdgeMasks()` / `distributeAffixDots()` 纯函数设计模式 — 可测试、可复用
- `skillKeyGroups: Map<skillId, string[]>` 分组模式 — 40.8 中 `occupiedKeys` 同理
- `onSkillTriggered()` 中 `data.key` 使用实际按键（非锚点）— 确认 AC5 已满足
- 16 个纯逻辑测试全部通过

**Story 40.3（绑定系统）实现笔记：**
- `getSkillKeys(bs, skillId)` 返回所有绑定键列表 — 40.8 直接调用
- `getBindingState(state)` 从全局 state 构建 BindingState — 40.8 在 skills.ts 中调用
- 所有键位统一小写

**Story 40.6（右键旋转）实现笔记：**
- 旋转后 `unbindSkill → rebind` 模式
- 战斗中不旋转，绑定在战斗开始时固定

**Story 40.1（形状数据模型）实现笔记：**
- `mapShapeToKeys(anchorKey, shapeId, rotation)` → `string[] | null`
- monomino 只有 1 个旋转态
- 所有 SHAPE_TEMPLATES 11 种形状

### Phase 5/6 去重伪代码

```typescript
// Phase 5: Splash 溅射 — 排除自身占据键
function resolvePhase5(ctx: TriggerContext, ...): void {
  const occupiedKeySet = new Set(ctx.occupiedKeys)  // NEW
  // ...existing logic...
  const allKeys = getKeysWithRelation(ctx.triggerKey, affix.posRel)
    .filter(k => ctx.bindings.has(k) && !occupiedKeySet.has(k))  // 改: k !== ctx.triggerKey → !occupiedKeySet.has(k)
  // ...rest unchanged...
}

// Phase 6: 邻居通知 — 排除自身占据键
function resolvePhase6(ctx: TriggerContext, ...): void {
  const occupiedKeySet = new Set(ctx.occupiedKeys)  // NEW
  for (const [neighborKey, neighborSkillId] of ctx.bindings) {
    if (occupiedKeySet.has(neighborKey)) continue  // 改: neighborKey === ctx.triggerKey → occupiedKeySet.has(neighborKey)
    // ...rest unchanged...
  }
}
```

### getExtendedNeighbors 伪代码

```typescript
export function getExtendedNeighbors(
  occupiedKeys: string[],
  posRel: PositionRelation
): string[] {
  const occupied = new Set(occupiedKeys)
  const neighbors = new Set<string>()
  for (const key of occupiedKeys) {
    for (const n of getKeysWithRelation(key, posRel)) {
      if (!occupied.has(n)) neighbors.add(n)
    }
  }
  return Array.from(neighbors)
}
```

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 新增纯函数导出：`getExtendedNeighbors()` → 可单元测试
- 测试文件：`src/tests/unit/systems/trigger-multi-cell.test.ts`
- `occupiedKeys` 类型为 `string[]`（必填，非 optional）
- Phase 5/6 中 `new Set(ctx.occupiedKeys)` 每次构建（性能无忧，键数 ≤ 4）

### Project Structure Notes

- 修改文件：`src/src/data/affixTrigger.ts`（TriggerContext 接口扩展 + Phase 5/6 occupiedKeys 过滤 + getExtendedNeighbors 函数）
- 修改文件：`src/src/systems/skills.ts`（triggerAffixSkillWithFeedback 注入 occupiedKeys）
- 新增测试：`src/tests/unit/systems/trigger-multi-cell.test.ts`
- 不新增源码文件（getExtendedNeighbors 放在 affixTrigger.ts 中导出）
- 不修改：`battle.ts`、`affixTriggerOrchestrator.ts`、`bindingManager.ts`、`shop.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.8]
- [Source: src/src/data/affixTrigger.ts#TriggerContext, resolvePhase5, resolvePhase6]
- [Source: src/src/systems/skills.ts#triggerAffixSkillWithFeedback]
- [Source: src/src/systems/affixTriggerOrchestrator.ts#orchestrateAffixTrigger]
- [Source: src/src/systems/bindingManager.ts#getSkillKeys, getBindingState]
- [Source: src/src/systems/keywords/KeyboardTopology.ts#getKeysWithRelation, hasRelation]
- [Source: docs/stories/40-7-keyboard-visualizer-multi-cell.md#Dev Agent Record]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- Task 1: Added `occupiedKeys: string[]` to `TriggerContext` interface; injected in `skills.ts` via `getSkillKeys(getBindingState(state), skillId)` with defensive fallback `[triggerKey]`
- Task 2: Phase 5 Splash filter: `k !== ctx.triggerKey` → `!occupiedKeySet.has(k)`; Phase 6 neighbor filter: `neighborKey === triggerKey` → `occupiedKeySet.has(neighborKey)`
- Task 3: `getExtendedNeighbors()` exported from `affixTrigger.ts` — pure function, union of neighbors minus self keys
- Task 4: Verified `skill:triggered` event uses `triggerKey` (actual pressed key), not anchor key — no changes needed
- Task 5: 9 new tests in `trigger-multi-cell.test.ts` (all pass); updated 3 existing test files' `makeContext` to include `occupiedKeys: [triggerKey]`
- **Deviation from story spec**: Also modified `affixTriggerOrchestrator.ts` (line 145) — added `occupiedKeys: [item.triggerKey]` to chained trigger context. Without this, the original ctx's `occupiedKeys` (from the first skill) leaked into chained skills, breaking Phase 5/6 filtering for cascaded triggers (e.g., A Splash→B, B's occupiedKeys incorrectly contained A's keys). This is a monomino assumption; 40.9 will extend for multi-cell chained awareness.
- 17 pre-existing failures in `affixTrigger.test.ts` (passive enchantment regression tests) — unrelated to this story

### File List

- `src/src/data/affixTrigger.ts` — TriggerContext.occupiedKeys + Phase 5/6 occupiedKeySet filtering + getExtendedNeighbors()
- `src/src/systems/skills.ts` — occupiedKeys injection in triggerAffixSkillWithFeedback()
- `src/src/systems/affixTriggerOrchestrator.ts` — occupiedKeys override for chained triggers
- `src/src/systems/battle.ts` — occupiedKeys 补充到 resolveMirrorCopy 调用（接口兼容修复）
- `src/tests/unit/systems/trigger-multi-cell.test.ts` — NEW: 11 tests for multi-cell trigger adaptation
- `src/tests/unit/data/affixTrigger.test.ts` — makeContext updated with occupiedKeys
- `src/tests/unit/data/affixBalance.test.ts` — makeContext updated with occupiedKeys
- `src/tests/unit/systems/affixTriggerOrchestrator.test.ts` — makeContext updated with occupiedKeys
