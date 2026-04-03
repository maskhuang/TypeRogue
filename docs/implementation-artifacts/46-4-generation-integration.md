# Story 46.4: 技能生成集成

Status: done

## Story

As a 打字肉鸽开发者,
I want 确认 Parity/Prime/Match 三个新词条在技能生成和商店系统中完全集成,
so that 新词条可以正常出现在游戏中，商店展示正确，存档兼容.

## 前置说明

大部分集成工作已在 Story 46.1-46.3 中完成：
- ✅ `rollAffixParams` — 三个词条的参数生成
- ✅ `buildAffixParamSummary` — 商店参数摘要
- ✅ `AFFIX_WEIGHT_TIERS` — 权重分档（全部 'high'）
- ✅ `AFFIX_COLORS` — tooltip 颜色
- ✅ `demo-i18n.ts` — 中英文名称和描述

本 Story 聚焦于**验证和补全**剩余集成点。

## Acceptance Criteria

1. **AC1**: `generateSkill()` 可随机生成含 Parity/Prime/Match 的技能（验证性测试）
2. **AC2**: 新词条权重合理，不过于稀有或常见（AFFIX_WEIGHT_TIERS 已设 'high'，需验证 rollAffixWeights 包含新词条）
3. **AC3**: 商店 tooltip 正确展示参数和描述
4. **AC4**: 存档兼容：旧存档不含新词条不崩溃（新字段 oddK/evenK/primeK/matchK 有 `?? 0` 默认值）
5. **AC5**: exhaustive switch 编译通过（无 TS 错误）

## Tasks / Subtasks

- [x] Task 1: 验证 rollAffixWeights 包含新词条 (AC: 2)
  - [x] 1.1 AFFIX_WEIGHT_TIERS 包含 Parity/Prime/Match（全部 'high'）✅
  - [x] 1.2 rollAffixWeights() 后 AFFIX_WEIGHTS 包含新词条（6-10 范围）✅
- [x] Task 2: 验证 exhaustive switch 编译 (AC: 5)
  - [x] 2.1 tsc --noEmit 无相关错误 ✅
- [x] Task 3: 集成测试 (AC: 1,3,4)
  - [x] 3.1 epic46-integration.test.ts 7 个测试全部通过

## Dev Notes

### 已完成的集成点（前三个 Story）

| 集成点 | 文件 | 完成于 |
|--------|------|--------|
| rollAffixParams | skillGeneration.ts | 46.1/46.2/46.3 |
| buildAffixParamSummary | shop.ts | 46.1/46.2/46.3 |
| AFFIX_WEIGHT_TIERS | affixes.ts | 46.1/46.2/46.3 |
| AFFIX_COLORS | KeyTooltip.ts | 46.1/46.2/46.3 |
| i18n | demo-i18n.ts | 46.1/46.2/46.3 |

### 需要验证的点

- `rollAffixWeights()` 使用 `Object.entries(AFFIX_WEIGHT_TIERS)` 遍历，新条目自动包含 ✅
- `AFFIX_WEIGHTS` 初始值也用同样的遍历，新条目自动包含 ✅
- exhaustive switch：Parity/Prime/Match 已在 resolvePhase2 和 rollAffixParams 中有 case ✅

### References

- [Source: docs/stories/epic-46-stack-combinatorics-expansion.md#Story 46.4]
- [Source: src/src/data/affixes.ts — AFFIX_WEIGHT_TIERS, rollAffixWeights line 440-453]
- [Source: src/src/data/skillGeneration.ts — rollAffixParams line 218-228]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- 3 个任务全部完成，7/7 集成测试通过
- 大部分集成已在 46.1-46.3 完成，本 story 验证 + 补充集成测试
- rollAffixWeights/rollAffixParams/存档兼容全部验证通过

### File List

- `src/tests/unit/data/epic46-integration.test.ts` — 新建 7 个集成测试
