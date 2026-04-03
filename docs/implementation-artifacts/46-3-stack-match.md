# Story 46.3: 叠层型 — 配对 (Match)

Status: done

## Story

As a 打字肉鸽玩家,
I want 邻居间叠层值相等的配对越多、产出越高,
so that 我在布局技能时需要考虑如何让邻居叠层同步，创造「分配策略」的体验.

## Acceptance Criteria

1. **AC1**: 无邻居或邻居叠层全为 0 时 bonus = 0
2. **AC2**: 1 对匹配时 bonus = matchK
3. **AC3**: 三同值（3 对 = C(3,2)）和四同值（6 对 = C(4,2)）计算正确
4. **AC4**: 只统计叠层 > 0 的邻居（叠层 0 不参与配对）
5. **AC5**: null triggerKey 时安全跳过
6. **AC6**: 与 Void（空邻居加成）形成策略对立：Match 要满邻居，Void 要空邻居
7. **AC7**: 技能生成可产出 Match 词条
8. **AC8**: 单元测试覆盖 0 对/1 对/多对/全同/null key

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: 7)
  - [x] 1.1~1.6 全部完成
- [x] Task 2: Phase 2 触发逻辑 (AC: 1,2,3,4,5)
  - [x] 2.1~2.2 resolvePhase2 case AffixType.Match（邻居扫描 + 频率统计 + C(n,2) 配对）
- [x] Task 3: 技能生成 (AC: 7)
  - [x] 3.1~3.2 matchK: 0.08~0.15 + posRel 随机
- [x] Task 4: 商店展示 (AC: 7)
  - [x] 4.1 buildAffixParamSummary case 'match'
- [x] Task 5: UI (AC: 7)
  - [x] 5.1~5.3 AFFIX_COLORS + 中英文 i18n
- [x] Task 6: 测试 (AC: 8)
  - [x] 6.1 枚举数量 39，stack=9
  - [x] 6.2 match.test.ts 18 个测试全部通过

## Dev Notes

### 关键实现模式

**邻居扫描（复用 Flow/Confluence/Turbulence 模式）：**
```typescript
case AffixType.Match: {
  if (affix.posRel == null) break
  const neighbors = getNeighborSkills(ctx.occupiedKeys, affix.posRel, ctx)
  // 收集邻居 stacks（只取 > 0）
  const stackValues: number[] = []
  for (const ns of neighbors) {
    const nState = ctx.skillStates.get(ns.id)
    const stacks = nState?.stacks ?? 0
    if (stacks > 0) stackValues.push(stacks)
  }
  // 频率统计 → C(count, 2) 配对数
  const freq = new Map<number, number>()
  for (const s of stackValues) {
    freq.set(s, (freq.get(s) ?? 0) + 1)
  }
  let pairs = 0
  for (const count of freq.values()) {
    if (count >= 2) pairs += count * (count - 1) / 2
  }
  bonusPercent += (affix.matchK ?? 0) * pairs
  break
}
```

**`getNeighborSkills` 返回值：** `AffixSkillInstance[]`（已去重），通过 `ns.id` 查 `ctx.skillStates` 获取运行时状态。

**注意：** `getNeighborSkills` 返回的是**不在 occupiedKeys 中的**邻居（即不包含自身）。`occupiedKeys` 是当前触发技能占据的键位。

**posRel 参数：** Match 带 posRel 参数（同 Void/Flow/Confluence/Turbulence），在 rollAffixParams 中随机生成。

### 参数校准

| 参数 | 范围 | 基准 |
|------|------|------|
| matchK | 0.08~0.15 | 1 对 ≈ Void 单空位收益(0.08~0.25) |

数值验证（matchK=0.12）：
- 0 对：0%
- 1 对([3,3,5,7])：+12%
- 2 对([3,3,5,5])：+24%
- 3 对([3,3,3,5] 三同)：+36%
- 6 对([3,3,3,3] 四同)：+72%

### 8 文件变更清单

| # | 文件路径 | 改动类型 |
|---|---------|---------|
| 1 | `src/src/data/affixes.ts` | 枚举+分类+名称+描述+权重+接口(matchK) |
| 2 | `src/src/data/affixTrigger.ts` | resolvePhase2 新 case（邻居扫描+配对计算）|
| 3 | `src/src/data/skillGeneration.ts` | rollAffixParams 新 case（matchK + posRel）|
| 4 | `src/src/systems/shop.ts` | buildAffixParamSummary 新 case |
| 5 | `src/src/ui/keyboard/KeyTooltip.ts` | AFFIX_COLORS 新条目 |
| 6 | `src/src/demo/demo-i18n.ts` | 中英文 affix.match + affix_desc.match |
| 7 | `src/tests/unit/data/affixes.test.ts` | 枚举数量 39，stack=9 |
| 8 | `src/tests/unit/data/match.test.ts` | 新测试文件 |

### References

- [Source: docs/stories/epic-46-stack-combinatorics-expansion.md#Story 46.3]
- [Source: src/src/data/affixTrigger.ts — getNeighborSkills line 349-367]
- [Source: src/src/data/affixTrigger.ts — Flow case line 666-681 (邻居扫描模式参考)]
- [Source: src/src/data/affixTrigger.ts — ctx.skillStates 获取邻居 stacks line 1506-1513]
- [Source: src/src/data/affixTrigger.ts — getExtendedNeighbors line 44-56]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- 所有 6 个任务完成，18/18 Match 测试通过
- 复用 getNeighborSkills + ctx.skillStates 邻居扫描模式（同 Flow/Confluence）
- 频率统计 + C(n,2) 配对数计算
- 带 posRel 参数（同其他拓扑/邻居型词条）
- 无新增 TS 编译错误

### File List

- `src/src/data/affixes.ts` — AffixType.Match + 全套数据定义 + matchK
- `src/src/data/affixTrigger.ts` — resolvePhase2 case AffixType.Match
- `src/src/data/skillGeneration.ts` — rollAffixParams case AffixType.Match
- `src/src/systems/shop.ts` — buildAffixParamSummary case 'match'
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS match
- `src/src/demo/demo-i18n.ts` — 中英文 affix.match + affix_desc.match
- `src/tests/unit/data/affixes.test.ts` — 枚举数量 39，stack 分类 9
- `src/tests/unit/data/match.test.ts` — 新建 18 个测试
