# Story 49.1: 暴击型 — 连射 (Burst)

Status: done

## Acceptance Criteria

1. **AC1**: 连续暴击时 critMult 递增（通过额外乘数）
2. **AC2**: miss 后下次暴击 critStreak=0，Burst 无额外加成
3. **AC3**: 与 Decay 共存时两者效果同时生效
4. **AC4**: 技能生成可产出 Burst 词条
5. **AC5**: 单元测试覆盖连击/断裂/重新连击

## Tasks / Subtasks

- [ ] Task 1: 数据定义 — AffixType.Burst + burstK
- [ ] Task 2: Phase 3 逻辑 — 暴击判定后，isCrit 时追加 output × (burstK × critStreak)
- [ ] Task 3: 技能生成 — burstK 0.20~0.40
- [ ] Task 4: 商店 + UI + i18n
- [ ] Task 5: 测试 — affixes.test.ts 枚举 46, crit=7 + burst.test.ts

## Dev Notes

### 实现位置
在 resolvePhase3 的暴击判定后（line ~1143 `flags.isCrit = true` 之后），插入：
```typescript
// Burst: 连续暴击加成
for (const a of skill.affixes) {
  if (a.type === AffixType.Burst && (a.burstK ?? 0) > 0) {
    const streak = runtimeState.critStreak ?? 0  // 读上一次更新的值
    if (streak > 0) {
      const burstMult = 1 + (a.burstK ?? 0) * streak
      output *= burstMult
      multipliers.push(burstMult)
    }
  }
}
```
**注意：** critStreak 在本次暴击判定后才 +1（line ~1180），所以 Burst 读到的是**之前的**连击数。第一次暴击 streak=0（无加成），第二次连续暴击 streak=1（有加成）。这是正确的——第一次暴击不算"连射"。

## Dev Agent Record

### File List
