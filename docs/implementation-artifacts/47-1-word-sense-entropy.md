# Story 47.1: 词感型 — 熵 (Entropy)

Status: done

## Story

As a 打字肉鸽玩家,
I want 当前单词字母分布越均匀时产出越高,
so that 单词的信息量成为新的策略维度，与 Coverage（字母种类数）形成精细/粗糙的区分.

## Acceptance Criteria

1. **AC1**: "typing"(全不同字母) 的 bonus 明显高于 "banana"(重复多)
2. **AC2**: 单字母单词 H=0 → bonus=0
3. **AC3**: 与 Coverage 效果方向一致但数值不同（验证区分度）
4. **AC4**: 技能生成可产出 Entropy 词条
5. **AC5**: 单元测试覆盖纯重复/部分重复/全不同/单字母

## Tasks / Subtasks

- [x] Task 1: 数据定义 — 全部完成
- [x] Task 2: Phase 2 + shannonEntropy — 导出工具函数 + resolvePhase2 case
- [x] Task 3: 技能生成 — entropyK: 0.06~0.12
- [x] Task 4: 商店 + UI + i18n — 全部完成
- [x] Task 5: 测试 — 16/16 通过（shannonEntropy 正确性 + Phase 2 模拟 + 边界）

## Dev Notes

### shannonEntropy 实现

```typescript
export function shannonEntropy(word: string): number {
  if (!word || word.length === 0) return 0
  const freq = new Map<string, number>()
  const lower = word.toLowerCase()
  for (const ch of lower) {
    if (ch >= 'a' && ch <= 'z') freq.set(ch, (freq.get(ch) ?? 0) + 1)
  }
  const total = Array.from(freq.values()).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  let h = 0
  for (const count of freq.values()) {
    const p = count / total
    h -= p * Math.log2(p)
  }
  return h
}
```

典型值：
- "aaa" → H=0.00
- "banana" → H≈1.46
- "typing" → H≈2.58
- "atmosphere" → H≈2.92

### 参数：entropyK 0.06~0.12，典型 bonus +15~26%

### References

- [Source: docs/stories/epic-47-word-sense-cryptography-expansion.md#Story 47.1]
- [Source: src/src/data/affixTrigger.ts — Cluster case line 742 (word_sense Phase 2 模式)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- 16/16 测试通过，shannonEntropy 数值精度验证（banana≈1.46, typing≈2.58）
- 大小写不敏感，忽略非字母字符

### File List

- `src/src/data/affixes.ts` — AffixType.Entropy + 全套数据
- `src/src/data/affixTrigger.ts` — shannonEntropy() + resolvePhase2 case
- `src/src/data/skillGeneration.ts` — rollAffixParams case
- `src/src/systems/shop.ts` — buildAffixParamSummary case
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS
- `src/src/demo/demo-i18n.ts` — 中英文 i18n
- `src/tests/unit/data/affixes.test.ts` — 枚举 40，word_sense=7
- `src/tests/unit/data/entropy.test.ts` — 新建 16 测试
