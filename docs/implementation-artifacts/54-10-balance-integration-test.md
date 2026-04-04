# Story 54.10: 平衡调整与集成测试

Status: done

## Story

作为开发者，我想要验证 10 级 Ascension 的系统集成和存档兼容性，以便确保体验符合设计意图。

## Acceptance Criteria

1. 各级 Ascension 效果正确累积（A5 = A1+A2+A3+A4+A5 全部生效）
2. 练习关金币映射边界值验证（0分/极高分/各 Ascension 级��）
3. A6 初始 modifier 与后续 boss modifier 正确共存
4. A8 词库压缩不导致空词库崩溃
5. A9 双 modifier 不重复
6. A10 增长率在长局（20+ 关）下不导致数值溢出
7. 存档兼容性：旧存档加载后 ascension 默认 0
8. 全部 54 个 Ascension 单元测试通过

## Tasks

- [x] Task 1: 累积效果集成测试 (AC: 1)
  - [x] 1.1 A5 累积测试：A1 金币 + A2 价格 + A4 时间 + A5 刷新 + A7 不生效
  - [x] 1.2 A10 全级测试：所有 10 级同时生效验证
- [x] Task 2: 边界值测试 (AC: 2, 4, 6)
  - [x] 2.1 金币映射：0分/10000分 × A0/A10（含 HARD_CAP 行为确认）
  - [x] 2.2 A8 空词库/1词/10词压缩保护
  - [x] 2.3 A10 stage 20/50 数值范围（有限 + 正数）
- [x] Task 3: 存档兼容性验证 (AC: 7)
  - [x] 3.1 MetaState v6 旧存档 → ascension 全 0
  - [x] 3.2 MAX_ASCENSION_LEVEL = 10 确认
- [x] Task 4: 运行全套测试 (AC: 8)
  - [x] 4.1 7 个 ascension 测试文件，71 个测试全部通过

## Dev Notes

### 已有测试文件（6 个，54 个测试）

| 文件 | 测试数 | 覆盖 |
|------|--------|------|
| ascension.test.ts | 20 | MetaState 字段 + advanceAscension + 序列化 + checkUnlocks |
| practice-gold.test.ts | 12 | computePracticeGold 各分数段 + A1 系数 |
| ascension-price.test.ts | 6 | getAscensionPriceMultiplier A0-A10 |
| cycle-scaling.test.ts | 5 (新增) | getCycleTimeLimit A4 衰减 |
| ascension-modifiers.test.ts | 5 | getOffenseDefenseModifierIds + A5 常量 |
| ascension-resources.test.ts | 5 | getMaxRelicSlots + A8 常量 |
| ascension-ultimate.test.ts | 6 | calculateTargetScore A10 增长率 |

### 需要补充的集成测试

- 累积效果：设置 ascensionLevel=5，验证 A1(金币)+A2(价格)+A3(���英)+A4(时间)+A5(刷新) 全部生效
- 空词库保护：极端情况下 wordDeck 为空时不崩溃
- 数值溢出：stage 50 @ A10 增长率下的 targetScore 是否在安全范围内

### References

- [Source: docs/planning-artifacts/ascension-system-design.md]
- [Source: docs/stories/epic-54-ascension-system.md#54-10]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- 17 个集成测试：累积效果、金币边界、modifier 池、词库压缩、数值溢出、存档兼容
- 全部 7 个 ascension 测试文件 71 个测试 ALL PASS
- Epic 54 全部 10 个 story 完成

### File List

- `tests/unit/core/ascension-integration.test.ts` — 17 个集成测试
