# Story 54.4: A1-A2 经济修正器

Status: done

## Story

作为 A1/A2 玩家，我想要体验到经济压力，以便学会精打细算。

## Acceptance Criteria

1. **A1 (ascensionLevel >= 1):** 练习关金币转换效率 ×0.75 — 已在 54-2 实现，本 story 仅验证
2. **A2 (ascensionLevel >= 2):** 商店所有商品价格 ×1.15（技能、遗物、附魔、词包）
3. **A2:** 商店刷新费用也 ×1.15
4. 价格上涨后取整（round）
5. 价格乘数通过 `getAscensionPriceMultiplier()` 集中管理

## Tasks

- [x] Task 1: getAscensionPriceMultiplier 函数 (AC: 2, 5)
  - [x] 1.1 shop.ts 新增 getAscensionPriceMultiplier() 导出函数
  - [x] 1.2 constants.ts 新增 A2_PRICE_MULT = 1.15
- [x] Task 2: 商品价格接入 (AC: 2, 4)
  - [x] 2.1 getAdjustedPrice() 链中加入 × getAscensionPriceMultiplier()
- [x] Task 3: 刷新费用接入 (AC: 3)
  - [x] 3.1 两处 refresh cost 均乘以 getAscensionPriceMultiplier()（UI 显示 + 实际扣费）
- [x] Task 4: 验证 A1 (AC: 1)
  - [x] 4.1 practice-gold.test.ts 已覆盖 A1 ×0.75
- [x] Task 5: 单元测试 (AC: 1-5)
  - [x] 5.1 6 个测试：A0/A1/A2/A5/A10 返回值 + A2_PRICE_MULT 常量

## Dev Notes

### 核心接入点

`getAdjustedPrice()` 在 shop.ts line ~1257，是所有商品价格的中心计算函数：
```typescript
return Math.round(baseCost * getEnchantAnchorPriceMultiplier() * getDiscountMultiplier() * (1 - getBountyHunterDiscount()));
```
在此链中加入 `* getAscensionPriceMultiplier()` 即可覆盖：技能、遗物、附魔、词包。

### 刷新费用

刷新费用独立计算（不经过 getAdjustedPrice），在两处：
- 显示：shop.ts line ~1512 — `(state.shop.refreshCount + 1) * 5`
- 扣费：shop.ts line ~2603 — 同一公式

需要在两处都乘以 ascension 系数。

### A1 已完成

computePracticeGold() 已在 54-2 中实现 A1_MULT = 0.75。本 story 仅确认测试覆盖。

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-4]
- [Pattern: shop.ts getAdjustedPrice()]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- A2_PRICE_MULT = 1.15 常量 + getAscensionPriceMultiplier() 导出
- getAdjustedPrice() 链式乘法覆盖全部商品（技能/遗物/附魔/词包）
- 刷新费用两处（显示+扣费）均接入 ascension 乘数
- 6 个单元测试全部通过

### File List

- `src/core/constants.ts` — A2_PRICE_MULT = 1.15
- `src/systems/shop.ts` — getAscensionPriceMultiplier() + getAdjustedPrice 接入 + 刷新费用接入
- `tests/unit/systems/shop/ascension-price.test.ts` — 6 个测试
