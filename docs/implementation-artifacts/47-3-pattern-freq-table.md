# Story 47.3: 模式频率表基础设施

Status: done

## Story

As a 打字肉鸽开发者,
I want 一个模式签名频率表供 Pattern 词条使用,
so that 可以查询任意单词的模式稀有度.

## Acceptance Criteria

1. **AC1**: toPattern 正确映射各类单词（全不同、有重复、回文、单字母）
2. **AC2**: getPatternRarity 对常见模式返回低稀有度，稀有模式返回高稀有度
3. **AC3**: 未知模式有合理 fallback（最大稀有度）
4. **AC4**: 单元测试覆盖 toPattern + 稀有度查询

## Tasks / Subtasks

- [x] Task 1: patternFrequency.ts — toPattern + 惰性频率表 + getPatternRarity + _resetPatternCache
- [x] Task 2: 15/15 测试通过（toPattern 映射 + rarity 查询 + 未知模式 fallback）

### File List
- `src/src/data/patternFrequency.ts` — 新建（toPattern, getPatternRarity, _resetPatternCache）
- `src/tests/unit/data/patternFrequency.test.ts` — 新建 15 测试

## Dev Notes

### toPattern 实现
```typescript
export function toPattern(word: string): string {
  const lower = word.toLowerCase()
  const map = new Map<string, string>()
  let nextChar = 65 // 'A'
  let pattern = ''
  for (const ch of lower) {
    if (!map.has(ch)) {
      map.set(ch, String.fromCharCode(nextChar++))
    }
    pattern += map.get(ch)!
  }
  return pattern
}
```

### 惰性频率表
类似 bigramFrequency.ts 的静态数据不适合 Pattern——词库可能随牌包变化。改用惰性生成：
```typescript
let cachedFreqs: Map<string, number> | null = null

function buildPatternFreqs(): Map<string, number> {
  if (cachedFreqs) return cachedFreqs
  const counts = new Map<string, number>()
  let total = 0
  for (const pool of Object.values(WORD_POOL)) {
    for (const word of pool.words) {
      const p = toPattern(word)
      counts.set(p, (counts.get(p) ?? 0) + 1)
      total++
    }
  }
  cachedFreqs = new Map()
  for (const [p, c] of counts) {
    cachedFreqs.set(p, c / total)  // 归一化到 0~1
  }
  return cachedFreqs
}
```

### getPatternRarity
```typescript
const MAX_RARITY = 10  // -log₂(1/1024) ≈ 10

export function getPatternRarity(word: string): number {
  const pattern = toPattern(word)
  const freqs = buildPatternFreqs()
  const freq = freqs.get(pattern)
  if (!freq || freq <= 0) return MAX_RARITY
  return -Math.log2(freq)
}
```

### References
- [Source: docs/stories/epic-47-word-sense-cryptography-expansion.md#Story 47.3]
- [Source: src/src/data/bigramFrequency.ts — 静态频率表模式参考]
- [Source: src/src/data/words.ts — WORD_POOL]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
