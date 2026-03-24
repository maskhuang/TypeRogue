# Story 40.9: 空间类词条多格适配

Status: done

## Story

As a 玩家,
I want 多格技能的空间类词条（Void/Resonance/Link/Splash/Amplify/Mirror）自动扩展到所有占据键位的邻居范围,
so that 多格技能的空间感知与其物理尺寸一致，"更大的技能看得更远".

## Acceptance Criteria

1. **AC1: Void 扩展邻居** — Void 使用 `getExtendedNeighbors(occupiedKeys, posRel)` 计算空位数，自身占据键不算空位
2. **AC2: Resonance/Link 扩展匹配** — Phase 6 中 Resonance 和 Link 的空间判定从 `hasRelation(triggerKey, neighborKey, posRel)` 扩展为 `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel))`
3. **AC3: Splash 扩展范围** — Phase 5 Splash 目标枚举从 `getKeysWithRelation(triggerKey)` 替换为 `getExtendedNeighbors(occupiedKeys)`，同时保留 occupiedKeySet 排除
4. **AC4: Amplify 扩展范围** — `sumNeighborAmplifyStacks` 统计范围扩展到所有占据键的邻居并集
5. **AC5: Mirror 扩展范围** — `resolveMirrorCopy` 关末词条复制的邻居扫描范围扩展
6. **AC6: Cascade 不变** — Cascade 仍检查 `prevKey` vs `triggerKey`（逐键检查），不受多格影响
7. **AC7: Phase 6 ApprenticeNeighbor/QuestResonance 扩展** — 附魔的空间判定同步扩展
8. **AC8: 单格向后兼容** — 所有改动对 `occupiedKeys = [triggerKey]` 的单格技能行为完全一致
9. **AC9: 连锁触发多格感知** — Orchestrator 中连锁目标的 `occupiedKeys` 从 monomino 假设升级为实际占据键
10. **AC10: 单元测试** — 每种空间词条至少 1 个多格测试 + 1 个单格回归测试

## Tasks / Subtasks

- [x] Task 1: 空间辅助函数扩展 (AC: #1, #4, #5)
  - [x] 1.1 修改 `countEmptySlots(key, posRel, bindings)` → `countEmptySlots(keyOrKeys: string | string[], posRel, bindings)`，使用 `getExtendedNeighbors` 计算范围（union type 保持 shop.ts 向后兼容）
  - [x] 1.2 修改 `sumNeighborAmplifyStacks(key, posRel, ...)` → `sumNeighborAmplifyStacks(occupiedKeys: string[], posRel, ...)`，统计扩展邻居的增幅层数（`counted: Set<string>` 去重 skillId）
  - [x] 1.3 修改 `findWeakestNeighbor(triggerKey, posRel, ctx)` → `findWeakestNeighbor(occupiedKeys: string[], posRel, ctx)`，在扩展范围内搜索
  - [x] 1.4 更新所有调用方传入 `ctx.occupiedKeys` 替代 `ctx.triggerKey`
- [x] Task 2: Phase 2 空间词条适配 (AC: #1, #4)
  - [x] 2.1 Void 词条：`countEmptySlots(ctx.triggerKey, ...)` → `countEmptySlots(ctx.occupiedKeys, ...)`
  - [x] 2.2 Amplify 词条：`sumNeighborAmplifyStacks(ctx.triggerKey, ...)` → `sumNeighborAmplifyStacks(ctx.occupiedKeys, ...)`
- [x] Task 3: Phase 5 空间词条适配 (AC: #3)
  - [x] 3.1 Splash 溅射：`getKeysWithRelation(ctx.triggerKey, affix.posRel)` → `getExtendedNeighbors(ctx.occupiedKeys, affix.posRel)`，移除冗余 occupiedKeySet 过滤（getExtendedNeighbors 已排除自身）
  - [x] 3.2 QuestDevour 吞噬：`findWeakestNeighbor(ctx.triggerKey, ...)` → `findWeakestNeighbor(ctx.occupiedKeys, ...)`
- [x] Task 4: Phase 6 邻居通知空间判定扩展 (AC: #2, #7)
  - [x] 4.1 在 `resolvePhase6` 中提取 `occupiedKeys = ctx.occupiedKeys`
  - [x] 4.2 Resonance 判定：`hasRelation(triggerKey, neighborKey, affix.posRel)` → `occupiedKeys.some(k => hasRelation(k, neighborKey, affix.posRel!))`
  - [x] 4.3 Link 判定：同上模式
  - [x] 4.4 ApprenticeNeighbor 判定：同上模式
  - [x] 4.5 QuestResonance 判定：同上模式
- [x] Task 5: Mirror 关末复制适配 (AC: #5)
  - [x] 5.1 `resolveMirrorCopy`：`getKeysWithRelation(ctx.triggerKey, ...)` → `getExtendedNeighbors(ctx.occupiedKeys, ...)`
  - [x] 5.2 排除过滤：旧 `k !== ctx.triggerKey` 已被 getExtendedNeighbors 的 occupied 排除机制替代
- [x] Task 6: Orchestrator 连锁触发多格感知 (AC: #9)
  - [x] 6.1 无需 import getSkillKeys — 直接从 ctx.bindings 反查
  - [x] 6.2 将 `occupiedKeys: [item.triggerKey]` 替换为 `[...ctx.bindings].filter(([_, sid]) => sid === item.skillId).map(([k]) => k)` + fallback `[item.triggerKey]`
  - [x] 6.3 辅助逻辑内联在 orchestrateAffixTrigger 主循环中
- [x] Task 7: 单元测试 (AC: #10, #8, #6)
  - [x] 7.1 Void 多格空位计算测试（3 tests: domino 空位、string 向后兼容、triomino 扩展范围）
  - [x] 7.2 Amplify 多格邻居增幅层数统计测试（3 tests: domino 统计、skillId 去重、资源不匹配过滤）
  - [x] 7.3 Splash 多格扩展范围目标枚举测试（1 test: domino 溅射到 g 的邻居 h）
  - [x] 7.4 Phase 6 Resonance/Link 多格匹配测试（3 tests: Resonance 多格、单格回归、Link 多格）
  - [x] 7.5 Mirror 多格邻居复制范围测试（2 tests: domino 扩展源、单格回归）
  - [x] 7.6 findWeakestNeighbor 多格扩展测试（2 tests: domino 选最弱、单格回归）— Cascade 不变由 AC6 设计保证（prevKey vs triggerKey 无代码变更）
  - [x] 7.7 单格回归测试（3 tests: countEmptySlots/sumNeighborAmplifyStacks/findWeakestNeighbor 单格行为不变）
  - [x] 7.8 确认现有 affixBalance / orchestrator 测试零回归（300 passed，17 pre-existing failures）

## Dev Notes

### 关键设计决策

**内联 `occupiedKeys.some()` 而非修改 `hasRelation` 签名**：Phase 6 中的空间判定使用内联模式 `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel))` 而非修改 `hasRelation` 函数签名。原因：
- `hasRelation` 是基础拓扑 API，应保持纯粹的两键关系语义
- 多格判定是触发上下文特有逻辑，不属于拓扑层
- 避免破坏 `keyboardTopology.ts` 的其他调用方

**辅助函数签名改为 `occupiedKeys: string[]`**：`countEmptySlots`、`sumNeighborAmplifyStacks`、`findWeakestNeighbor` 都将第一参数从 `key: string` 改为 `occupiedKeys: string[]`。对单格技能传入 `[triggerKey]` 即可，行为等价。这是 **签名破坏性变更**，需同步更新所有调用方和测试。

**Cascade 不变的理由**：Epic 明确规定 Cascade 仍逐键检查 `prevKey` vs `triggerKey`。这是因为 Cascade 关注的是 **连续击键的空间关系**，而非技能的物理范围。多格技能的不同键位被按下时，各自与 `prevKey` 独立检查。

**Orchestrator 多格感知方案**：从 `ctx.bindings` 反查 `item.skillId` 的所有键位，无需额外依赖 `bindingManager`。具体：`Array.from(ctx.bindings.entries()).filter(([_, sid]) => sid === item.skillId).map(([k]) => k)` 或 `[...ctx.bindings].filter(([_, sid]) => sid === item.skillId).map(([k]) => k)`，配 fallback `[item.triggerKey]`。

**Splash 双重改动叠加**：40.8 已实现 occupiedKeySet 排除（不溅射到自身键），40.9 在此基础上将范围查询从 `getKeysWithRelation(triggerKey)` 替换为 `getExtendedNeighbors(occupiedKeys)`。两者叠加后 Splash 行为：扩展范围 + 排除自身 = 正确。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/data/affixTrigger.ts:20-39` | `getExtendedNeighbors()` | 40.8 导出的扩展邻居纯函数 | 不改（调用） |
| `src/src/data/affixTrigger.ts:197-205` | `countEmptySlots()` | 单键空位计算 | 是：改为 occupiedKeys[] |
| `src/src/data/affixTrigger.ts:226-245` | `sumNeighborAmplifyStacks()` | 单键邻居增幅统计 | 是：改为 occupiedKeys[] |
| `src/src/data/affixTrigger.ts:576-601` | `findWeakestNeighbor()` | 单键范围内找最弱邻居 | 是：改为 occupiedKeys[] |
| `src/src/data/affixTrigger.ts:309-316` | Phase 2 Void | `countEmptySlots(ctx.triggerKey, ...)` | 是：传 ctx.occupiedKeys |
| `src/src/data/affixTrigger.ts:335-348` | Phase 2 Amplify | `sumNeighborAmplifyStacks(ctx.triggerKey, ...)` | 是：传 ctx.occupiedKeys |
| `src/src/data/affixTrigger.ts:694-714` | Phase 5 Splash | `getKeysWithRelation(ctx.triggerKey, ...)` | 是：替换为 getExtendedNeighbors |
| `src/src/data/affixTrigger.ts:788-795` | Phase 5 QuestDevour | `findWeakestNeighbor(ctx.triggerKey, ...)` | 是：传 ctx.occupiedKeys |
| `src/src/data/affixTrigger.ts:849` | Phase 6 Resonance | `hasRelation(triggerKey, neighborKey, ...)` | 是：occupiedKeys.some() |
| `src/src/data/affixTrigger.ts:857` | Phase 6 Link | `hasRelation(triggerKey, neighborKey, ...)` | 是：occupiedKeys.some() |
| `src/src/data/affixTrigger.ts:866` | Phase 6 ApprenticeNeighbor | `hasRelation(triggerKey, neighborKey, ...)` | 是：occupiedKeys.some() |
| `src/src/data/affixTrigger.ts:880` | Phase 6 QuestResonance | `hasRelation(triggerKey, neighborKey, ...)` | 是：occupiedKeys.some() |
| `src/src/data/affixTrigger.ts:1077-1106` | `resolveMirrorCopy()` | `getKeysWithRelation(ctx.triggerKey, ...)` | 是：替换 + occupiedKeySet |
| `src/src/systems/affixTriggerOrchestrator.ts:147` | 连锁 triggerCtx | `occupiedKeys: [item.triggerKey]` | 是：反查实际占据键 |
| `src/src/data/keyboardTopology.ts:136-138` | `hasRelation()` | 两键关系判定 | 不改（保持纯粹） |
| `src/src/data/keyboardTopology.ts:188-194` | `getKeysWithRelation()` | 单键范围查询 | 不改（由 getExtendedNeighbors 调用） |
| `src/src/systems/skills.ts:193-199` | occupiedKeys 注入 | 已在 40.8 完成 | 不改 |

### 约束

- **仅修改** `affixTrigger.ts`（辅助函数签名 + Phase 2/3/5/6 调用处 + resolveMirrorCopy）和 `affixTriggerOrchestrator.ts`（连锁 occupiedKeys）
- **不修改** `keyboardTopology.ts`、`battle.ts`、`skills.ts`、`shop.ts`、`bindingManager.ts`、任何 UI 文件
- **shop.ts 高亮范围**：延迟到 40.11 处理（当前只影响视觉预览，不影响逻辑正确性）
- 辅助函数签名变更会破坏现有测试中的调用 — 需同步更新测试工厂函数
- `Cascade` 词条 **不改**（AC6）
- 所有改动对 `occupiedKeys = [triggerKey]` 的单格技能必须行为等价

### Previous Story Intelligence

**Story 40.8（触发系统基础适配）关键实现笔记：**
- `getExtendedNeighbors()` 已在 `affixTrigger.ts:20-39` 导出 — 40.9 直接调用
- `TriggerContext.occupiedKeys: string[]` 已为必填字段 — 40.9 直接使用
- Phase 5 Splash: `occupiedKeySet` 过滤已实现（`!occupiedKeySet.has(k)`）— 40.9 替换范围查询
- Phase 6: `occupiedKeySet` 过滤已实现 — 40.9 替换关系判定
- Orchestrator: `occupiedKeys: [item.triggerKey]` 是 monomino 假设 — 40.9 升级
- Code review 发现并修复: battle.ts resolveMirrorCopy 缺少 occupiedKeys（已修复）
- 17 个 passive enchantment 回归测试预存在失败 — 与多格无关

**Story 40.3（绑定系统）关键 API：**
- `getSkillKeys(bs, skillId): string[]` — 返回技能所有占据键
- `getBindingState(state): BindingState` — 从 GameState 构建
- 所有键位统一小写
- `bindings: Map<string, string>` — 多格技能每个键指向同一 skillId

**编码惯例（从 40.7/40.8 提取）：**
- 纯函数导出 + 单元测试（computeEdgeMasks、getExtendedNeighbors 模式）
- 测试文件：`src/tests/unit/` 对应子目录
- Agent Model: Claude Opus 4.6
- Commit 格式：`feat: Story X.Y — 中文标题`

### Project Structure Notes

- 修改文件：`src/src/data/affixTrigger.ts`（辅助函数签名改造 + 全部 Phase 空间逻辑替换 + resolveMirrorCopy）
- 修改文件：`src/src/systems/affixTriggerOrchestrator.ts`（连锁 occupiedKeys 动态获取）
- 扩展测试：`src/tests/unit/systems/trigger-multi-cell.test.ts`（新增空间词条多格测试）
- 更新测试：`src/tests/unit/data/affixTrigger.test.ts`（辅助函数调用签名更新）
- 更新测试：`src/tests/unit/data/affixBalance.test.ts`（可能需要更新辅助函数调用）
- 不新增源码文件
- 不修改：`keyboardTopology.ts`、`battle.ts`、`skills.ts`、`shop.ts`、`bindingManager.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.9]
- [Source: docs/stories/40-8-trigger-and-battle-adaptation.md#Dev Agent Record]
- [Source: src/src/data/affixTrigger.ts#getExtendedNeighbors, countEmptySlots, sumNeighborAmplifyStacks, findWeakestNeighbor, resolvePhase5, resolvePhase6, resolveMirrorCopy]
- [Source: src/src/data/keyboardTopology.ts#hasRelation, getKeysWithRelation]
- [Source: src/src/systems/affixTriggerOrchestrator.ts#orchestrateAffixTrigger]
- [Source: src/src/systems/bindingManager.ts#getSkillKeys, getBindingState]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 17 pre-existing failures in `affixTrigger.test.ts` (passive enchantment regressions) — confirmed pre-existing, unrelated to multi-cell work
- `countEmptySlots` uses union type `string | string[]` to maintain `shop.ts` backward compatibility without modifying shop.ts
- `sumNeighborAmplifyStacks` adds `counted: Set<string>` for skillId dedup — prevents same multi-cell neighbor skill being counted multiple times
- Phase 5 Splash: removed redundant `occupiedKeySet` filter after replacing `getKeysWithRelation` with `getExtendedNeighbors` (already excludes self keys)
- Phase 6: used inline `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel!))` pattern for all 4 spatial judgment callsites
- Orchestrator: dynamic occupiedKeys lookup via `[...ctx.bindings].filter(([_, sid]) => sid === item.skillId).map(([k]) => k)` with fallback

### Completion Notes List

- All 10 ACs satisfied: Void, Resonance/Link, Splash, Amplify, Mirror, Cascade-unchanged, ApprenticeNeighbor/QuestResonance, single-cell backward compat, orchestrator multi-cell, unit tests
- 31 tests in trigger-multi-cell.test.ts (11 from 40.8 + 20 new from 40.9 including code review fixes)
- 304 passed / 17 pre-existing failed across related test files (zero new regressions)

**Code Review Fixes:**
- H1: Phase 6 `resolvePhase6` 添加 `processedNeighborSkills: Set<string>` 去重，防止多格邻居技能产生重复 actions
- M1: 删除 `affixTrigger.ts:842` 未使用变量 `neighborState`
- M2: 删除 `trigger-multi-cell.test.ts` 死导入 `resolvePhase2`
- M3: 添加 orchestrator 级别多格集成测试（`affixTriggerOrchestrator.test.ts`）
- M4: 添加 Cascade 回归测试（2 tests: prevKey adjacent 生效 + prevKey 非 adjacent 不生效）
- L2: Test 5.4 添加正向断言 `expect(neighborKeysInActions).toContain('h')`
- H1-fix test: Phase 6 多格邻居去重验证测试

### File List

- `src/src/data/affixTrigger.ts` — Helper function signatures, Phase 2/5/6 callers, resolveMirrorCopy, Phase 6 neighbor dedup
- `src/src/systems/affixTriggerOrchestrator.ts` — Dynamic occupiedKeys lookup for chained triggers
- `src/tests/unit/systems/trigger-multi-cell.test.ts` — 20 new multi-cell spatial affix tests + code review fixes
- `src/tests/unit/systems/affixTriggerOrchestrator.test.ts` — Multi-cell orchestrator integration test
- `src/tests/unit/data/affixTrigger.test.ts` — Updated helper function call signatures (string → string[])
- `docs/stories/40-9-spatial-affix-adaptation.md` — This story file
