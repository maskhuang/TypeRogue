# Story 26.1: 图标注册表 + 跨类型唯一性测试

Status: done

## Story

As a 开发者,
I want 一个图标注册表模块聚合所有数据源的 emoji 图标,
so that CI 测试能自动捕获跨类型的图标重复.

## Acceptance Criteria

1. **AC1 — IconEntry 接口**
   - `{ icon: string, id: string, type: IconType }`
   - IconType 覆盖 8 种数据源

2. **AC2 — getAllIconEntries()**
   - 聚合 176 个条目：6 资源 + 12 产出 + 50 转化 + 36 连接 + 8 增幅 + 36 附魔 + 15 遗物 + 13 Boss

3. **AC3 — isCompositeIcon()**
   - 用 `Intl.Segmenter` 判断多字素图标（如 ⚔️🔗、🌱📡）
   - 单字素返回 false，多字素返回 true

4. **AC4 — findDuplicateIcons()**
   - 排除组合图标（>1 grapheme）
   - 资源豁免：producer icon = RESOURCE_ICONS[producer.resource] 时允许重复
   - 返回 Map<icon, IconEntry[]>

5. **AC5 — 测试**
   - 跨类型唯一性测试：0 重复
   - isCompositeIcon 正确性（5 atomic + 5 composite）
   - 所有条目 icon 非空
   - 总条目数 = 176

## Technical Notes

- 新增: `src/data/iconRegistry.ts`
- 新增: `tests/unit/data/iconRegistry.test.ts`
- 仅供测试使用，运行时不改变数据文件结构
