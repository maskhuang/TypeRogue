# Story 48.1: 数值型 — 杠杆 (Leverage)

Status: done

## Story

As a 打字肉鸽玩家,
I want 资源充裕时获得放大收益、资源不足时承受亏损,
so that 「高风险高回报」成为有意义的策略选择.

## Acceptance Criteria

1. **AC1**: 资源高于阈值时 bonus 为正，低于阈值时 bonus 为负
2. **AC2**: 阈值处 bonus 恰好为 0
3. **AC3**: 负 bonusPercent 正确传播到最终产出
4. **AC4**: 与 Counter 组合时负产出被正确取消
5. **AC5**: 技能生成可产出 Leverage 词条，source ≠ skill.resource
6. **AC6**: 单元测试覆盖正值/负值/零点/极端资源值

## Tasks / Subtasks

- [ ] Task 1: 数据定义 (AC: 5)
  - [ ] 1.1 `data/affixes.ts` — `AffixType.Leverage = 'leverage'` + 全套（numeric / '杠杆' / high / leverageK + marginThreshold + source 复用现有 source 字段）
- [ ] Task 2: Phase 2 触发逻辑 (AC: 1,2,3)
  - [ ] 2.1 `data/affixTrigger.ts` — resolvePhase2 新增 `case AffixType.Leverage`
  - [ ] 2.2 逻辑：excess = getAffixSourceValue(source) - marginThreshold; bonusPercent += leverageK × excess × norm（可为负）
- [ ] Task 3: 技能生成 (AC: 5)
  - [ ] 3.1 rollAffixParams: leverageK 0.06~0.12, marginThreshold 归一化为 2~4 × BASE_VALUES[source][0], source ≠ skill.resource
- [ ] Task 4: 商店 + UI + i18n (AC: 5)
- [ ] Task 5: 测试 (AC: 6)
  - [ ] 5.1 affixes.test.ts 枚举 43，numeric=7
  - [ ] 5.2 新建 leverage.test.ts

## Dev Notes

### Phase 2 伪代码
```typescript
case AffixType.Leverage: {
  if (affix.source == null) break
  const val = getAffixSourceValue(affix.source, ctx)
  const lvlIdx = Math.max(0, Math.min(skill.level - 1, 2))
  const norm = (BASE_VALUES[skill.resource]?.[lvlIdx] ?? 1) / (BASE_VALUES[affix.source]?.[lvlIdx] ?? 1)
  const excess = val - (affix.marginThreshold ?? 0)
  bonusPercent += (affix.leverageK ?? 0) * excess * norm
  break
}
```

### 参数：leverageK 0.06~0.12, marginThreshold = randInt(2,4) × BASE_VALUES[source][0]

### References
- [Source: docs/stories/epic-48-numeric-finance-expansion.md#Story 48.1]
- [Source: src/src/data/affixTrigger.ts — Convert case line 596 (读资源值+归一化模式)]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
