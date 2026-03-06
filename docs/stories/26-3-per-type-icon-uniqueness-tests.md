# Story 26.3: 各数据文件增加类内唯一性测试

Status: done

## Story

As a 开发者,
I want 每个数据类型测试文件都有图标唯一性守卫,
so that 新增技能/遗物/修饰器时如果图标重复会立刻被 CI 捕获.

## Acceptance Criteria

1. **AC1 — 6 个测试文件增加 '每个图标唯一' 测试**
   - producers.test.ts ✓
   - converters.test.ts ✓
   - connectors.test.ts ✓
   - enchantments.test.ts ✓
   - bossModifiers.test.ts ✓
   - relics.test.ts ✓

2. **AC2 — amplifiers.test.ts 已有此测试，跳过**

3. **AC3 — 全量测试无回归**
   - `npx vitest run tests/unit/data/` — 350 测试全部通过
   - `npx vitest run tests/unit/systems/relics/relics.test.ts` — 34 测试通过

## Technical Notes

- 测试模式：`new Set(icons).size === icons.length`
- 修改: 6 个测试文件
