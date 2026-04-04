# Story 52.5: 跨系统桥接质变（3 个）

Status: ready-for-dev

## 说明

Hedge·调控已在 52.4 修复中实现（convertReverseOutputs 到较少资源）。剩余 3 个。

## 质变列表

| 词条 | 质变名 | 效果 | 桥接方向 |
|------|--------|------|---------|
| Zero-In | 蓄能 | 暴击时 missStreak 转为等量 stacks | crit → stack |
| Cipher | 破译 | 最大字母距离额外转为暴击率 | word_sense → crit |
| Pattern | 编码 | 模式签名决定产出资源类型 | word_sense → resource |

## Tasks

- [ ] Task 1: Zero-In·蓄能 — Phase 3 暴击后 missStreak → stacks
- [ ] Task 2: Cipher·破译 — Phase 2 计算最大距离 → Phase 3 critChance 加成
- [ ] Task 3: Pattern·编码 — Phase 4 资源路由修改

## Dev Notes

### Zero-In·蓄能
在 Phase 3 暴击判定后（critStreak/missStreak 更新之前），如果质变且 isCrit：
```typescript
runtimeState.stacks += runtimeState.missStreak ?? 0
// missStreak 正常清零（由 critStreak 基础设施处理）
```

### Cipher·破译
Phase 2 中已计算了 cipherLetters。质变时需要把最大距离传到 Phase 3 的 critChance。
方案：在 Phase 2 中把最大距离存到 runtimeState 的临时字段，Phase 3 读取加入 totalCritChance。
或更简单：在 Phase 3 的 affix loop 中重新计算最大距离（word 从 ctx.currentWord 读取）。

### Pattern·编码
Phase 4 resolvePhase4 中，如果 Pattern 质变，用 toPattern 的首字母映射到资源。
模式首字母 A→base, B→score, C→multiplier, D→time, E→gold（循环取模）。

## Dev Agent Record

### File List
