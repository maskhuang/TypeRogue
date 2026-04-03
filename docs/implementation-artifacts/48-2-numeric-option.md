# Story 48.2: 数值型 — 期权 (Option)

Status: done

## Acceptance Criteria

1. **AC1**: 累积产出超行权价时 bonus 线性增长
2. **AC2**: 未达行权价时每次触发扣除固定 premium
3. **AC3**: 行权价处 bonus 恰好为 0
4. **AC4**: 技能生成 source ≠ skill.resource
5. **AC5**: 单元测试覆盖未行权/临界/行权/undefined

## Tasks / Subtasks

- [ ] Task 1: 数据定义 — AffixType.Option + optionK/strikePrice/premium + source(复用)
- [ ] Task 2: Phase 2 — 读 getStageProducedValue, hockey stick 逻辑
- [ ] Task 3: 技能生成 — optionK 0.04~0.08, strike 3~6×BASE, premium 0.05~0.10
- [ ] Task 4: 商店 + UI + i18n
- [ ] Task 5: 测试 — affixes.test.ts 枚举 44, numeric=8 + option.test.ts

## Dev Notes

### Phase 2 伪代码
```typescript
case AffixType.Option: {
  if (affix.source == null) break
  const val = getStageProducedValue(affix.source, ctx)
  const lvl = Math.max(0, Math.min(skill.level - 1, 2))
  const norm = (BASE_VALUES[skill.resource]?.[lvl] ?? 1) / (BASE_VALUES[affix.source]?.[lvl] ?? 1)
  if (val >= (affix.strikePrice ?? 0)) {
    bonusPercent += (affix.optionK ?? 0) * (val - (affix.strikePrice ?? 0)) * norm
  } else {
    bonusPercent -= affix.premium ?? 0
  }
  break
}
```

**注意：** Option 读 `getStageProducedValue`（本关累积产出），Leverage 读 `getAffixSourceValue`（资源池值）。

## Dev Agent Record

### File List
