# Story 48.3: 数值型 — 对冲 (Hedge)

Status: done

## Acceptance Criteria

1. **AC1**: 双资源完全均衡时 bonus = hedgeK
2. **AC2**: 一方为 0 时 bonus = 0
3. **AC3**: 双方都为 0 时安全跳过（不除零）
4. **AC4**: 归一化正确（不同资源 BASE_VALUES 量级差异被消除）
5. **AC5**: sourceA ≠ sourceB 且 ≠ skill.resource
6. **AC6**: 单元测试覆盖均衡/失衡/单方零/双方零

## Tasks / Subtasks

- [ ] Task 1: 数据定义 — AffixType.Hedge + hedgeK + hedgeSourceA/hedgeSourceB
- [ ] Task 2: Phase 2 — 读双资源 getStageProducedValue, min/max ratio
- [ ] Task 3: 技能生成 — hedgeK 0.20~0.40, sourceA/B 随机（≠ resource, ≠ 彼此）
- [ ] Task 4: 商店 + UI + i18n
- [ ] Task 5: 测试 — affixes.test.ts 枚举 45, numeric=9 + hedge.test.ts

## Dev Notes

### Phase 2 伪代码
```typescript
case AffixType.Hedge: {
  if (affix.hedgeSourceA == null || affix.hedgeSourceB == null) break
  const lvl = Math.max(0, Math.min(skill.level - 1, 2))
  const valA = getStageProducedValue(affix.hedgeSourceA, ctx) / (BASE_VALUES[affix.hedgeSourceA]?.[lvl] ?? 1)
  const valB = getStageProducedValue(affix.hedgeSourceB, ctx) / (BASE_VALUES[affix.hedgeSourceB]?.[lvl] ?? 1)
  const maxVal = Math.max(valA, valB)
  if (maxVal <= 0) break
  const ratio = Math.min(valA, valB) / maxVal  // 0~1
  bonusPercent += (affix.hedgeK ?? 0) * ratio
  break
}
```

**注意：** Hedge 用新字段 hedgeSourceA/hedgeSourceB（不复用 source/fusionSourceA），避免与 Leverage/Option 的 source 冲突。

## Dev Agent Record

### File List
