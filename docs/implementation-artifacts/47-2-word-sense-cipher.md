# Story 47.2: 词感型 — 密文 (Cipher)

Status: done

## Story

As a 打字肉鸽玩家,
I want 当前单词相邻字母在字母表上跳跃越大时产出越高,
so that 单词的「加密强度」成为新的策略维度.

## Acceptance Criteria

1. **AC1**: "quiz"(高跳跃) 的 bonus 明显高于 "abc"(低跳跃)
2. **AC2**: 单字母单词 → bonus=0（无相邻对）
3. **AC3**: 大小写不影响计算
4. **AC4**: 技能生成可产出 Cipher 词条
5. **AC5**: 单元测试覆盖顺序/跳跃/单字母/双字母

## Tasks / Subtasks

- [x] Task 1-4: 全部完成（数据定义 + Phase 2 + 技能生成 + 商店/UI/i18n）
- [x] Task 5: 13/13 测试通过

### File List
- `src/src/data/affixes.ts` — AffixType.Cipher + 全套
- `src/src/data/affixTrigger.ts` — resolvePhase2 case AffixType.Cipher
- `src/src/data/skillGeneration.ts` — rollAffixParams case
- `src/src/systems/shop.ts` — buildAffixParamSummary case
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS
- `src/src/demo/demo-i18n.ts` — 中英文 i18n
- `src/tests/unit/data/affixes.test.ts` — 枚举 41，word_sense=8
- `src/tests/unit/data/cipher.test.ts` — 新建 13 测试

## Dev Notes

### Phase 2 伪代码
```typescript
case AffixType.Cipher: {
  const w = ctx.currentWord?.toLowerCase() ?? ''
  if (w.length < 2) break
  let totalDist = 0
  for (let i = 0; i < w.length - 1; i++) {
    totalDist += Math.abs(w.charCodeAt(i + 1) - w.charCodeAt(i))
  }
  const avgDist = totalDist / (w.length - 1)
  bonusPercent += (affix.cipherK ?? 0) * avgDist
  break
}
```

典型值：abc avgDist=1 → 2%, type avgDist≈9 → 18%, quiz avgDist≈11 → 22%

### References
- [Source: docs/stories/epic-47-word-sense-cryptography-expansion.md#Story 47.2]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
