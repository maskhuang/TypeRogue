# Story 45.4: 拓扑型 — 落差 + 汇流 + 湍流

Status: done

## Story

As a 玩家,
I want 装备「落差」「汇流」「湍流」词条的技能根据邻居技能的属性产生差异化加成,
so that 键盘布局规划成为有深度的策略维度，而非只关注空位数量。

## Acceptance Criteria

1. 落差：低 baseValue 技能旁有高 baseValue 邻居时产出增加；反之无加成
2. 汇流：3 种不同资源邻居的加成明显高于 1 种
3. 湍流：邻居 baseValue 差异大时加成高；全部相同时无加成；少于 2 个邻居时无加成
4. 三个词条可共存于同一技能，效果叠加合理
5. 无邻居时三个词条均 graceful 返回 0
6. 单元测试覆盖各种邻居组合

## Tasks / Subtasks

- [x] Task 1: 邻居扫描工具函数 (AC: #5)
  - [x] 1.1-1.3 `getNeighborSkills()`: 复用 getExtendedNeighbors + bindings/allSkills 反查 + skillId 去重 + 排除自身
- [x] Task 2: 数据定义 — AffixType + 元数据 (AC: #4)
  - [x] 2.1-2.6 枚举+分类+名称+描述+权重+参数（flowK/confluenceK/turbulenceK + posRel）
- [x] Task 3: 触发逻辑 — Phase 2 (AC: #1, #2, #3, #5)
  - [x] 3.1 Flow: delta>0 时 bonusPercent += flowK × delta × (selfBase/nBase)
  - [x] 3.2 Confluence: resTypes.size → confluenceK × (1-1/(n+1))
  - [x] 3.3 Turbulence: ≥2 邻居时 spread × neighborCount × turbulenceK
- [x] Task 4: 技能生成 + Tooltip (AC: #4)
  - [x] 4.1 flowK 3~8, confluenceK 15~30, turbulenceK 5~12（全含 posRel）
  - [x] 4.2 paramSummary: 中文+posRel 前缀
- [x] Task 5: 单元测试 (AC: #1~#6)
  - [x] 5.2 Flow: 5 测试（弱旁强/强旁弱/等强/无邻居/多强邻居）
  - [x] 5.3 Confluence: 5 测试（3种>1种/1种/2种/无邻居/边际递减）
  - [x] 5.4 Turbulence: 4 测试（高spread/零spread/<2邻居/更多邻居）
  - [x] 5.5 affixes.test.ts: 28 values, 6 topology

## Dev Notes

### 核心工具函数

所有三个词条共享一个邻居扫描函数，类似 `countEmptySlots` 但返回技能实例而非计数：

```typescript
function getNeighborSkills(
  occupiedKeys: string[],
  posRel: PositionRelation,
  ctx: TriggerContext,
): AffixSkillInstance[] {
  const neighbors = getExtendedNeighbors(occupiedKeys, posRel)
  const occupiedSet = new Set(occupiedKeys)
  const counted = new Set<string>()
  const result: AffixSkillInstance[] = []
  for (const nk of neighbors) {
    if (occupiedSet.has(nk)) continue
    const nSkillId = ctx.bindings.get(nk)
    if (!nSkillId || counted.has(nSkillId)) continue
    counted.add(nSkillId)
    const nSkill = ctx.allSkills?.get(nSkillId)
    if (nSkill) result.push(nSkill)
  }
  return result
}
```

### Base Value 获取与归一化

从邻居技能获取 base value：`BASE_VALUES[nSkill.resource][Math.min(nSkill.level - 1, 3)]`

跨资源归一化：`norm = BASE_VALUES[skill.resource][lvlIdx] / BASE_VALUES[nSkill.resource][lvlIdx]`

### 参数建议

| 参数 | 建议范围 | 说明 |
|------|---------|------|
| flowK | 3~8 | 每单位 delta × norm 的 bonus%。弱技能(base=5)旁强技能(base=50) → delta≈45 → +135~360% |
| confluenceK | 15~30 | 最大 bonus = k×(1-1/(n+1))。3种 → 0.75k = 11~22%。5种 → 0.83k = 12~25% |
| turbulenceK | 5~12 | spread(0~1) × neighborCount × k。spread=0.8, 3邻居 → 12~29% |

注意 flowK 需要谨慎——base value 差值可能很大（level 1 base=5 vs level 3 score=36），归一化后仍然可能有较大 delta。

### 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/src/data/affixes.ts` | 枚举+分类+名称+描述+权重+参数 |
| `src/src/data/affixTrigger.ts` | getNeighborSkills() + Phase 2 三个 case |
| `src/src/data/skillGeneration.ts` | 三个生成分支（含 posRel） |
| `src/src/systems/shop.ts` | paramSummary 三个 case |
| `src/tests/unit/data/affixes.test.ts` | 数量更新 |
| `src/tests/unit/data/affixTopology.test.ts` | **新建** 拓扑三件套测试 |

### 关键实现细节

- 三个词条都需要 `posRel` 参数（和 Void/Cascade 一样），在 `AffixInstance` 中复用现有 `posRel` 字段
- `getNeighborSkills` 应该 export 供测试
- Flow 的归一化至关重要——不同资源的 base value 量级差异大（base=5 vs score=15 vs multiplier=0.2），不归一化会让某些资源组合极端过强
- Turbulence 要求 ≥ 2 个邻居，1 个邻居时无极差概念

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.4]
- [Source: docs/brainstorming-session-2026-04-01.md#拓扑型词条创意（最终版）]
- [Source: src/data/affixTrigger.ts#countEmptySlots — 邻居扫描模式]
- [Source: src/data/affixTrigger.ts#Void case — Phase 2 拓扑参考]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ `getNeighborSkills()` 工具函数: 复用 getExtendedNeighbors + bindings/allSkills，export 供测试
- ✅ Flow: 归一化 norm = selfBase/nBase 确保跨资源公平
- ✅ Confluence: (1-1/(n+1)) 公式实现边际递减
- ✅ Turbulence: spread = (max-min)/max × neighborCount，≥2 邻居门槛
- ✅ 14 个新测试全部通过
- ✅ 拓扑型从 3 增长到 6（目标达成！）

### File List

- `src/src/data/affixes.ts` — AffixType ×3 + 分类 + 名称 + 描述 + 权重 + 参数
- `src/src/data/affixTrigger.ts` — getNeighborSkills() + Phase 2 Flow/Confluence/Turbulence
- `src/src/data/skillGeneration.ts` — 三个生成分支（含 posRel）
- `src/src/systems/shop.ts` — paramSummary 三个 case
- `src/tests/unit/data/affixes.test.ts` — 28 values, 6 topology
- `src/tests/unit/data/affixTopology.test.ts` — **新建** 14 个测试
- `docs/stories/sprint-status.yaml` — Story 状态追踪
