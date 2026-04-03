# Story 45.3: 词感型 — 双字组

Status: done

## Story

As a 玩家,
I want 装备「双字组」词条的技能在打含罕见字母组合的单词时获得更高产出,
so that 我对单词的字母对构成有意识，增加打字过程中的策略感知。

## Acceptance Criteria

1. "fjord"(FJ/JO 罕见) 的双字组加成明显高于 "the"(TH/HE 常见)
2. `BIGRAM_FREQ_TABLE` 覆盖所有 676 个字母对（AA~ZZ），归一化到 0~1
3. 单字母单词（不存在 bigram）时双字组无加成（graceful fallback）
4. 技能生成可产出双字组词条
5. 单元测试覆盖频率表正确性和边界情况

## Tasks / Subtasks

- [x] Task 1: Bigram 频率表数据 (AC: #2)
  - [x] 1.1 新建 `data/bigramFrequency.ts`：676 条 bigram 频率表
  - [x] 1.2 基于 Norvig/Mayzner 语料库归一化（TH=1.0, QZ=0, 7 条零频）
  - [x] 1.3 测试验证 676 条全覆盖
- [x] Task 2: 数据定义 (AC: #4)
  - [x] 2.1-2.5 AffixType.Bigram + 分类 + 名称 + 描述 + 权重 + bigramK 参数
- [x] Task 3: 触发逻辑 — Phase 2 (AC: #1, #3)
  - [x] 3.1-3.4 import + case + 非字母过滤 + 单字母/空串保护
- [x] Task 4: 技能生成 + Tooltip (AC: #4)
  - [x] 4.1 bigramK: 30~60
  - [x] 4.2 paramSummary: `+X%×罕见度`
- [x] Task 5: 单元测试 (AC: #1~#5)
  - [x] 5.1 频率表 6 个测试（676条/范围/TH/HE/零频/全覆盖）
  - [x] 5.2-5.3 Bigram 5 个测试（fjord>the/单字母/空串/非字母/zz）
  - [x] 5.4 affixes.test.ts: 25 values, 6 word_sense

## Dev Notes

### 频率表数据来源

使用 Peter Norvig 基于 Google Corpus 的英语 bigram 频率数据。归一化方式：所有 676 个 bigram 的频率除以最高频 bigram（TH）的频率，使 TH=1.0。

**Top 5:** TH(1.0), HE(0.86), IN(0.68), ER(0.58), AN(0.56)
**Zero/near-zero:** JQ, QG, QK, QY, QZ, WQ, WZ 等含 Q/J/X/Z 的组合

### Phase 2 实现模式

参考 45.2 的 Cluster/Coverage 模式：

```typescript
case AffixType.Bigram: {
  const word = ctx.currentWord?.toLowerCase() ?? ''
  if (word.length < 2) break  // 单字母/空串无 bigram
  let totalRarity = 0
  let pairCount = 0
  for (let i = 0; i < word.length - 1; i++) {
    const a = word[i], b = word[i + 1]
    if (a >= 'a' && a <= 'z' && b >= 'a' && b <= 'z') {
      const freq = BIGRAM_FREQ_TABLE[a + b] ?? 0
      totalRarity += (1 - freq)
      pairCount++
    }
  }
  if (pairCount > 0) {
    bonusPercent += (affix.bigramK ?? 0) * (totalRarity / pairCount)
  }
  break
}
```

### 参数建议

| 参数 | 建议范围 | 说明 |
|------|---------|------|
| bigramK | 30~60 | 平均 rarity × bigramK = bonusPercent。"the"(avgRarity≈0.07) → 2~4%。"fjord"(avgRarity≈0.85) → 25~51% |

bigramK 比 clusterK/coverageK 高很多，因为 avgRarity 是 0~1 的分数，需要乘以较大 K 值才有感知。

### 文件变更清单

| 文件 | 变更 |
|------|------|
| `src/src/data/bigramFrequency.ts` | **新建** — 676 条 bigram 频率表 |
| `src/src/data/affixes.ts` | 修改 — 枚举+分类+名称+描述+权重+参数 |
| `src/src/data/affixTrigger.ts` | 修改 — Phase 2 switch + import |
| `src/src/data/skillGeneration.ts` | 修改 — generateAffix() 分支 |
| `src/src/systems/shop.ts` | 修改 — paramSummary |
| `src/tests/unit/data/affixes.test.ts` | 修改 — 数量更新 |
| `src/tests/unit/data/affixBigram.test.ts` | **新建** — bigram 专项测试 |

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.3]
- [Source: docs/brainstorming-session-2026-04-01.md#双字组 (Bigram)]
- [Source: Peter Norvig - English Letter Frequency Counts: Mayzner Revisited](https://norvig.com/mayzner.html)
- [Source: docs/implementation-artifacts/45-2-word-sense-cluster-coverage.md — 模式参考]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ BIGRAM_FREQ_TABLE: 676 条，TH=1.0, 7 条零频，FJ=0.001（极罕见但非零）
- ✅ Phase 2: 遍历相邻字母对，非字母过滤，平均 rarity × bigramK
- ✅ 11 个新测试全部通过
- ✅ 词感型从 5 增长到 6（目标达成！）

### File List

- `src/src/data/bigramFrequency.ts` — **新建** 676 条 bigram 频率表
- `src/src/data/affixes.ts` — AffixType.Bigram + 分类 + 名称 + 描述 + 权重 + 参数
- `src/src/data/affixTrigger.ts` — import + Phase 2 Bigram case
- `src/src/data/skillGeneration.ts` — Bigram 生成分支
- `src/src/systems/shop.ts` — paramSummary Bigram case
- `src/tests/unit/data/affixes.test.ts` — 枚举 25, word_sense 6
- `src/tests/unit/data/affixBigram.test.ts` — **新建** 11 个测试
