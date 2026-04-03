# Story 47.4: 词感型 — 模式 (Pattern)

Status: done

## Story

As a 打字肉鸽玩家,
I want 当前单词的重复结构越独特时产出越高,
so that 单词的「模式稀有度」成为新的策略维度，与 Ligature（重复次数）形成结构/数量的区分.

## Acceptance Criteria

1. **AC1**: "banana"(复杂交替模式 ABCBCB) bonus 明显高于 "the"(全不同常见模式 ABC)
2. **AC2**: 两个不同单词但相同模式（如 "dog"/"cat" 都是 ABC）→ 相同 bonus
3. **AC3**: Ligature 相同但 Pattern 不同的单词（如 "aabb"/"abab"）bonus 不同
4. **AC4**: 技能生成可产出 Pattern 词条
5. **AC5**: 单元测试覆盖常见/稀有/未知模式

## Tasks / Subtasks

- [x] Task 1-4: 全部完成（数据定义 + Phase 2 + 技能生成 + 商店/UI/i18n）
- [x] Task 5: 8/8 测试通过 + affixes.test.ts 枚举 42, word_sense=9

### File List
- `src/src/data/affixes.ts` — AffixType.Pattern + 全套
- `src/src/data/affixTrigger.ts` — import getPatternRarity + resolvePhase2 case
- `src/src/data/skillGeneration.ts` — rollAffixParams case
- `src/src/systems/shop.ts` — buildAffixParamSummary case
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS
- `src/src/demo/demo-i18n.ts` — 中英文 i18n
- `src/tests/unit/data/affixes.test.ts` — 枚举 42，word_sense=9
- `src/tests/unit/data/pattern.test.ts` — 新建 8 测试

## Dev Notes

### Phase 2 伪代码
```typescript
case AffixType.Pattern: {
  const w = ctx.currentWord ?? ''
  if (w.length > 0) {
    bonusPercent += (affix.patternK ?? 0) * getPatternRarity(w)
  }
  break
}
```
需要 import `getPatternRarity` from `./patternFrequency`。

### 参数：patternK 0.03~0.06

### References
- [Source: docs/stories/epic-47-word-sense-cryptography-expansion.md#Story 47.4]
- [Source: src/src/data/patternFrequency.ts — getPatternRarity]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
