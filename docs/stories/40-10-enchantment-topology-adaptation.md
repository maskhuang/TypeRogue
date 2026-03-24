# Story 40.10: 附魔系统多格适配

Status: done

## Story

As a 使用多格技能的玩家,
I want 依赖邻居关系的附魔（如学徒·观摩）能正确感知多格技能的所有占据键位,
so that 多格技能从更大的物理范围中获得正确的空间感知收益.

## Acceptance Criteria

1. **AC1: ApprenticeNeighbor 观察者侧多格匹配** — 当拥有 ApprenticeNeighbor 附魔的技能本身是多格时，只要触发技能的任意占据键与附魔技能的任意占据键满足 posRel 关系，附魔即生效
2. **AC2: 多格附魔技能观察范围确实更大** — 测试验证 domino 附魔技能比 monomino 有更多的有效触发邻居
3. **AC3: QuestResonance 多格观察者匹配** — 多格技能的 QuestResonance 叠层判定同样扩展到所有占据键
4. **AC4: 非空间附魔不变** — Transmute/MultiplyOperator/Twin/所有自触发 Quest 类型行为不变
5. **AC5: 单格向后兼容** — 所有附魔在 occupiedKeys = [triggerKey] 时行为完全一致
6. **AC6: 单元测试** — ApprenticeNeighbor 多格观察者测试 + QuestResonance 多格测试 + 单格回归

## Tasks / Subtasks

- [x] Task 1: 重构 Phase 6 邻居遍历为"按技能分组"模式 (AC: #1, #3)
  - [x] 1.1 在 `resolvePhase6` 中，用 `neighborSkillKeys: Map<string, string[]>` 预构建邻居技能→键位反查索引（排除 self occupiedKeys）
  - [x] 1.2 将主循环从 `for (const [neighborKey, neighborSkillId] of ctx.bindings)` 重构为 `for (const [neighborSkillId, neighborKeys] of neighborSkillKeys)`
  - [x] 1.3 删除 `processedNeighborSkills` Set（分组遍历本身就是去重的）
  - [x] 1.4 保持 `occupiedKeySet` 排除自身逻辑（已在索引构建时完成）
- [x] Task 2: 更新空间判定为双侧 any-match (AC: #1, #3)
  - [x] 2.1 Resonance 判定：`occupiedKeys.some(ok => neighborKeys.some(nk => hasRelation(ok, nk, posRel)))` — 触发技能任意键 × 邻居技能任意键
  - [x] 2.2 Link 判定：同上双侧 any-match 模式
  - [x] 2.3 ApprenticeNeighbor 判定：同上双侧 any-match
  - [x] 2.4 QuestResonance 判定：同上双侧 any-match
  - [x] 2.5 actions 中的 `neighborKey` 使用 `neighborKeys[0]`（orchestrator 通过 bindings 反查回 skillId，具体键位不影响）
- [x] Task 3: 验证非空间附魔不变 (AC: #4)
  - [x] 3.1 确认 Transmute/MultiplyOperator/Twin 无空间逻辑，无需改动
  - [x] 3.2 确认所有自触发 Quest 类型无空间逻辑
- [x] Task 4: 单元测试 (AC: #2, #5, #6)
  - [x] 4.1 ApprenticeNeighbor 观察者侧多格测试：domino 附魔技能通过第二键位的邻接关系被触发
  - [x] 4.2 ApprenticeNeighbor 双侧多格测试：触发技能多格 × 附魔技能多格
  - [x] 4.3 QuestResonance 多格观察者测试
  - [x] 4.4 单格回归：所有附魔在 occupiedKeys = [triggerKey] 时行为不变
  - [x] 4.5 Phase 6 去重验证：多格邻居技能仍然只产生 1 个 action（不重复）
  - [x] 4.6 确认现有 affixTrigger / orchestrator 测试零回归

## Dev Notes

### 关键设计决策

**Phase 6 从"逐键遍历+skillId去重"重构为"按技能分组遍历"**：

当前实现（40.9 + code review）：
```typescript
const processedNeighborSkills = new Set<string>()
for (const [neighborKey, neighborSkillId] of ctx.bindings) {
    if (occupiedKeySet.has(neighborKey)) continue
    if (processedNeighborSkills.has(neighborSkillId)) continue  // ← 跳过多格技能的后续键
    processedNeighborSkills.add(neighborSkillId)
    // 空间判定只用 neighborKey（单个键）
    if (occupiedKeys.some(k => hasRelation(k, neighborKey, posRel))) { ... }
}
```

**问题**：`processedNeighborSkills` 跳过多格邻居技能的第2+键。如果触发技能与邻居技能的第一个键不满足 posRel，但与第二个键满足，则会错误地跳过。这是"观察者侧"（enchanted skill 自身是多格）的 bug。

**40.10 修复方案**：
```typescript
// 预构建邻居技能→键位映射
const neighborSkillKeys = new Map<string, string[]>()
for (const [nk, nsid] of ctx.bindings) {
    if (occupiedKeySet.has(nk)) continue
    if (!neighborSkillKeys.has(nsid)) neighborSkillKeys.set(nsid, [])
    neighborSkillKeys.get(nsid)!.push(nk)
}

// 按技能分组遍历（天然去重）
for (const [neighborSkillId, neighborKeys] of neighborSkillKeys) {
    // 空间判定：触发技能任意键 × 邻居技能任意键
    const spatialMatch = occupiedKeys.some(ok =>
        neighborKeys.some(nk => hasRelation(ok, nk, posRel))
    )
    // actions 使用 neighborKeys[0] 作为代表键位
}
```

**Cascade 不变**：Cascade 检查 `prevKey` vs `triggerKey`，是逐键击判定，与技能形状无关。40.9 已有回归测试（7.6a/7.6b）。

**Outcast/Ligature 不变**：这些词条检查实际按下的键（`triggerKey`）是否满足条件，属于"击键字母"语义而非"空间范围"语义，多格不影响。

**shop.ts / battle.ts 不改**：商店高亮范围和 battle.ts Mirror 刷新的多格适配延迟到 40.11。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/data/affixTrigger.ts:830-893` | `resolvePhase6` | Phase 6 邻居遍历主循环 + processedNeighborSkills 去重 | 是：重构为按技能分组 |
| `src/src/data/affixTrigger.ts:851` | Resonance 判定 | `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel))` | 是：改为双侧 any-match |
| `src/src/data/affixTrigger.ts:859` | Link 判定 | 同上 | 是：同上 |
| `src/src/data/affixTrigger.ts:867` | ApprenticeNeighbor | 同上 | 是：同上 |
| `src/src/data/affixTrigger.ts:881` | QuestResonance | 同上 | 是：同上 |
| `src/src/data/affixTrigger.ts:471` | Cascade | `hasRelation(prevKey, triggerKey, posRel)` | 不改（逐键判定） |
| `src/src/data/affixTrigger.ts:331` | Outcast | `isFirstOrLastLetter(ctx.triggerKey, ...)` | 不改（字母语义） |
| `src/tests/unit/systems/trigger-multi-cell.test.ts` | 多格测试集 | 31 tests (40.8+40.9) | 扩展：添加观察者侧测试 |

### 约束

- **仅修改** `affixTrigger.ts`（resolvePhase6 重构）
- **不修改** `keyboardTopology.ts`、`battle.ts`、`skills.ts`、`shop.ts`、`bindingManager.ts`、`affixTriggerOrchestrator.ts`
- **不修改** Phase 2/3/5 逻辑（已在 40.9 完成）
- `resolvePhase6` 的函数签名不变（输入输出类型不变）
- 所有改动对单格技能必须行为等价

### Previous Story Intelligence

**Story 40.9（空间词条多格适配）关键实现笔记：**
- Phase 6 已使用 `occupiedKeys.some(k => hasRelation(k, neighborKey, posRel!))` 扩展了**触发者侧**的空间匹配（40.9 AC7）
- `processedNeighborSkills: Set<string>` 去重在 40.9 code review H1 fix 中添加 — 防止多格邻居产出重复 actions
- **观察者侧 bug**：去重导致多格邻居技能只检查第一个键的空间关系，遗漏后续键位
- 40.9 测试已覆盖：触发者侧多格 Resonance/Link/Splash/ApprenticeNeighbor/QuestResonance + Cascade 回归
- 17 个 passive enchantment 回归测试预存在失败 — 与多格无关
- 304 passed / 17 pre-existing failed（零新回归）

**Story 40.8（触发系统基础适配）关键 API：**
- `getExtendedNeighbors(occupiedKeys, posRel)` — 已导出
- `TriggerContext.occupiedKeys: string[]` — 已为必填字段
- `getSkillKeys(bs, skillId): string[]` — 返回技能所有占据键

**编码惯例（从 40.8/40.9 提取）：**
- 纯函数导出 + 单元测试
- 测试文件：`src/tests/unit/systems/trigger-multi-cell.test.ts`
- Agent Model: Claude Opus 4.6
- Commit 格式：`feat: Story X.Y — 中文标题`

### Project Structure Notes

- 修改文件：`src/src/data/affixTrigger.ts`（resolvePhase6 重构为按技能分组遍历 + 双侧 any-match 空间判定）
- 扩展测试：`src/tests/unit/systems/trigger-multi-cell.test.ts`（观察者侧多格附魔测试）
- 不新增源码文件
- 不修改：`keyboardTopology.ts`、`battle.ts`、`skills.ts`、`shop.ts`、`affixTriggerOrchestrator.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.10]
- [Source: docs/stories/40-9-spatial-affix-adaptation.md#Dev Agent Record — H1 fix: processedNeighborSkills]
- [Source: src/src/data/affixTrigger.ts#resolvePhase6 (lines 823-893)]
- [Source: src/src/data/affixTrigger.ts#EnchantmentType.ApprenticeNeighbor, QuestResonance]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Phase 6 `resolvePhase6` 重构为"按技能分组遍历"：用 `neighborSkillKeys: Map<string, string[]>` 替代 `processedNeighborSkills: Set<string>` + 逐键遍历
- 所有 4 处空间判定（Resonance/Link/ApprenticeNeighbor/QuestResonance）改为双侧 any-match：`occupiedKeys.some(ok => neighborKeys.some(nk => hasRelation(ok, nk, posRel)))`
- actions 中 `neighborKey` 使用 `neighborKeys[0]` 作为代表键位
- 非空间附魔（Transmute/MultiplyOperator/Twin/自触发 Quest）确认无空间逻辑，无需改动
- 新增 8 个单元测试：观察者侧多格匹配 (3) + QuestResonance 多格 (1) + 单格回归 (3) + 去重验证 (1)
- 测试结果：39 passed (trigger-multi-cell) / 312 passed + 17 pre-existing failed (全套件) / 零新回归
- Code Review 修复：
  - M1: neighborKey 改为使用 `find()` 获取实际匹配键，替代任意 `neighborKeys[0]`
  - M5: 修正 test 8.1a 注释，消除旧 bug 顺序依赖的误导说法
  - H1: 添加负面测试 8.5a（多格观察者所有键位均不满足空间关系 → 0 actions）
  - M2: 添加 Link 观察者侧多格测试 8.6a
  - M3: 添加 Resonance 观察者侧多格测试 8.7a
  - M4: 添加 chainAffixesDisabled 交互测试 8.8a
  - 修复后测试：43 passed / 316 passed + 17 pre-existing / 零新回归

### File List

- `src/src/data/affixTrigger.ts` — resolvePhase6 重构（按技能分组 + 双侧 any-match）
- `src/tests/unit/systems/trigger-multi-cell.test.ts` — 新增 8 个 40.10 测试
- `docs/stories/40-10-enchantment-topology-adaptation.md` — story 状态更新
- `docs/stories/sprint-status.yaml` — 状态跟踪更新
