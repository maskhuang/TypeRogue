# Story 49.3: 暴击型 — 神射 (Sharpshooter)

Status: ready-for-dev

## Acceptance Criteria

1. **AC1**: critChance=10% 暴击时 critMult 加成远大于 critChance=80% 时
2. **AC2**: critChance=100% 时加成为 0
3. **AC3**: 未暴击时无效果
4. **AC4**: 期望收益曲线在 critChance=50% 附近峰值
5. **AC5**: 技能生成可产出 Sharpshooter 词条
6. **AC6**: 单元测试覆盖低/中/高 critChance + 未暴击

## Tasks / Subtasks

- [ ] Task 1: 数据定义 — AffixType.Sharpshooter + sharpK
- [ ] Task 2: Phase 3 逻辑 — 暴击时 output *= 1 + sharpK × (1 - effectiveCritChance)
- [ ] Task 3: 技能生成 — sharpK 1.00~2.00
- [ ] Task 4: 商店 + UI + i18n
- [ ] Task 5: 测试 — affixes.test.ts 枚举 48, crit=9 + sharpshooter.test.ts

## Dev Notes

### 实现位置
与 Burst/ZeroIn 相同的 isCrit 分支内，但需要读 effectiveCritChance。
effectiveCritChance 在 line ~1132 声明。Sharpshooter 在 isCrit 分支内：
```typescript
if (a.type === AffixType.Sharpshooter && (a.sharpK ?? 0) > 0) {
  const sharpMult = 1 + (a.sharpK ?? 0) * (1 - effectiveCritChance)
  output *= sharpMult
  multipliers.push(sharpMult)
}
```
**注意：** 用 effectiveCritChance（命运硬币修正后），不是 rawCritChance。

## Dev Agent Record

### File List
