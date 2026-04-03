# Story 49.2: 暴击型 — 校准 (Zero-In)

Status: done

## Acceptance Criteria

1. **AC1**: 连续 miss 后首次暴击 critMult 显著增加
2. **AC2**: 连续暴击中（missStreak=0）Zero-In 无加成
3. **AC3**: 与 Fallacy 共存时概率和倍率分别累积
4. **AC4**: 技能生成可产出 Zero-In 词条
5. **AC5**: 单元测试覆盖 miss 累积/暴击释放/连续暴击无效

## Tasks / Subtasks

- [ ] Task 1: 数据定义 — AffixType.ZeroIn + zeroInK
- [ ] Task 2: Phase 3 逻辑 — 暴击时追加 output × (1 + zeroInK × missStreak)
- [ ] Task 3: 技能生成 — zeroInK 0.15~0.30
- [ ] Task 4: 商店 + UI + i18n
- [ ] Task 5: 测试 — affixes.test.ts 枚举 47, crit=8 + zeroIn.test.ts

## Dev Notes

### 实现位置
与 Burst 相同位置（暴击判定后 isCrit 分支内），但读 missStreak：
```typescript
if (a.type === AffixType.ZeroIn && (a.zeroInK ?? 0) > 0) {
  const misses = runtimeState.missStreak ?? 0
  if (misses > 0) {
    const zeroMult = 1 + (a.zeroInK ?? 0) * misses
    output *= zeroMult
    multipliers.push(zeroMult)
  }
}
```
missStreak 在暴击后会被清零（critStreak 基础设施），所以 Zero-In 需要在清零**之前**读值。当前代码顺序：Phase 3 暴击判定 → Burst/ZeroIn 读 streak → Fallacy 更新 → critStreak/missStreak 更新。顺序正确。

## Dev Agent Record

### File List
