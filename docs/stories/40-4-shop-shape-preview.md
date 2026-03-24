# Story 40.4: 商店形状预览

Status: done

## Story

As a 玩家,
I want 商店卡片上显示技能占据键盘格数的形状预览图,
so that 我在购买前能直观判断技能的空间占用，做出更好的键盘布局规划决策.

## Acceptance Criteria

1. **AC1: 蓝/紫/橙卡片显示形状预览** — rarity ≥ 1 的词条技能商品卡片渲染对应形状的小型网格预览
2. **AC2: 预览与实际形状一致** — 预览显示技能当前 `shapeId` + `rotation` 对应的形状（含旋转态），与 `getShapeCells()` 返回值一致
3. **AC3: 白色技能无预览** — rarity 0（monomino）技能商品卡片 UI 不变，不显示形状预览
4. **AC4: 卡片布局可读性** — 形状预览不影响卡片整体布局和信息可读性（文字/价格/词条信息不被遮挡）
5. **AC5: Tooltip 形状信息** — 悬停 tooltip 中增加形状描述文字（如"占据 3 格 L 形区域"）
6. **AC6: 颜色匹配** — 预览网格的填充色与技能稀有度颜色一致（蓝 `#4488ff` / 紫 `#a855f7` / 橙 `#ff8800`）

## Tasks / Subtasks

- [x] Task 1: 形状预览 HTML 生成函数 (AC: #1, #2, #6)
  - [x] 1.1 在 `shop.ts` 新增 `renderShapePreview(shapeId: string, rotation: number, rarity: number): string` 纯函数
    - 调用 `getShapeCells(shapeId, rotation)` 获取 cells
    - 生成 CSS Grid 形式的小型网格 HTML（最大 4 行 × 4 列）
    - 每个 cell 渲染为实心方块，颜色为 `RARITY_COLORS[rarity]`
    - 空 cell 渲染为透明
    - 返回完整 `<div class="shape-preview shape-preview-r{rarity}">...</div>` HTML 字符串
  - [x] 1.2 计算网格尺寸：取 cells 的 max(row)+1 × max(col)+1 作为 grid-template
  - [x] 1.3 monomino（rarity 0）返回空字符串（不渲染）
- [x] Task 2: 集成到商品卡片渲染 (AC: #1, #3, #4)
  - [x] 2.1 修改 `renderUnifiedShopCard()` 中 `item.type === 'skill' && item.affixSkill` 分支
  - [x] 2.2 在卡片 `reward-icon` 内部插入形状预览 HTML（icon 下方）
  - [x] 2.3 仅当 `affix.rarity >= 1` 时插入预览（白色技能跳过，renderShapePreview 返回空字符串）
  - [x] 2.4 调整 `.reward-icon` 区域为 flex column 布局以容纳形状预览
- [x] Task 3: CSS 样式 (AC: #4, #6)
  - [x] 3.1 在 `style.css` 新增 `.shape-preview` 容器样式：CSS Grid，gap 1px
  - [x] 3.2 新增 `.shape-cell` 样式：5px 方块，border-radius 1px
  - [x] 3.3 新增 `.shape-cell.filled` 按稀有度着色：`.shape-preview-r1` 蓝色、`.shape-preview-r2` 紫色、`.shape-preview-r3` 橙色
  - [x] 3.4 空 cell 无额外样式（默认透明，无需 `.shape-cell.empty` class）
  - [x] 3.5 `.reward-icon` 改为 flex column + center 布局，预览在 emoji 下方协调显示
- [x] Task 4: Tooltip 形状描述 (AC: #5)
  - [x] 4.1 新增 `getShapeDescription(shapeId: string, cellCount: number): string` 函数
    - 返回人类可读的描述，如"占据 2 格条形区域"、"占据 3 格 L 形区域"、"占据 4 格 T 形区域"
    - monomino 返回空字符串
  - [x] 4.2 在 tooltip 构建中使用已有 `mechanicInfo` 字段传入形状描述（无需修改 KeyTooltipData 接口）
  - [x] 4.3 `mechanicInfo` 已在 `buildAffixSection()` 中渲染，无需修改 tooltip 渲染逻辑
- [x] Task 5: 单元测试 (AC: #1~#6)
  - [x] 5.1 测试 `renderShapePreview` 输出 HTML 正确：monomino 返回空字符串
  - [x] 5.2 测试 domino/triomino/tetromino 输出正确的 grid 尺寸和 filled cell 数量
  - [x] 5.3 测试不同 rotation 产生不同的 grid 布局
  - [x] 5.4 测试 `getShapeDescription` 返回正确的中文描述
  - [x] 5.5 测试 renderShapePreview 一致性：所有形状所有旋转态 filled cell 数 === getShapeCells 长度
  - [x] 5.6 测试所有 tetromino 形状均正确渲染 4 个 filled cell

## Dev Notes

### 关键设计决策

**形状预览位置**：放在 `reward-icon`（emoji 图标）右侧或下方。当前卡片布局为横向 flex：`[icon] [info(name+desc)] [cost] [type-badge] [lock]`。形状预览作为 icon 区域的补充，不应打破横向流。推荐方案：将 `reward-icon` 区域改为纵向 flex，上方 emoji 图标，下方形状网格。或者在 icon 右侧新增一个小区域。

**CSS Grid 实现**：使用 CSS Grid 渲染形状最直观。Grid 尺寸动态计算：
- Domino (rarity 1): 最大 1×2 或 2×1
- Triomino (rarity 2): 最大 2×3 或 3×2
- Tetromino (rarity 3): 最大 2×4 或 4×2

每个 cell 约 5px × 5px，gap 1px，总宽度不超过 30px，高度不超过 25px。

**不改 Tooltip 渲染基础设施**：如果 `keyTooltip` 组件的 `KeyTooltipData` 接口已经很固定，可以将形状描述放入 `skill.description` 的末尾，或使用已有的 `school` / 其他字段。最简方案：在 tooltip 的 `description` 字段追加形状文字（如 `⬡3格L形`）。

**纯函数设计**：`renderShapePreview()` 和 `getShapeDescription()` 都是纯函数，不依赖 DOM 状态，便于测试。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/systems/shop.ts:944-1111` | `renderUnifiedShopCard()` | 商品卡片渲染主函数 | 是：插入形状预览 |
| `src/src/systems/shop.ts:957-982` | 词条技能卡片 innerHTML | icon + info + cost + type 布局 | 是：icon 区域扩展 |
| `src/src/systems/shop.ts:1054-1107` | 词条技能 tooltip | mouseenter 构建 KeyTooltipData | 是：追加 shapeInfo |
| `src/src/systems/shop.ts:324-329` | `buildAffixTooltipFields()` | tooltip 词条/附魔详情 | 可能修改 |
| `src/src/data/skillShapes.ts:265-273` | `getShapeCells()` | 获取形状 cells | 不改（调用） |
| `src/src/data/skillShapes.ts:105-117` | `SHAPE_TEMPLATES` | 11 种形状定义 | 不改（读取） |
| `src/src/data/affixes.ts:206-211` | `RARITY_COLORS` | 稀有度颜色表 | 不改（引用） |
| `src/src/core/types.ts:241-251` | `ShopItem` 接口 | 商品数据结构 | 不改 |
| `src/src/style.css:538-587` | `.reward-card` 样式 | 卡片 flex 布局 | 是：新增预览样式 |

### 约束

- **不修改** `skillShapes.ts`（仅调用 `getShapeCells` 和读取 `SHAPE_TEMPLATES`）
- **不修改** `ShopItem` 接口（形状信息已在 `item.affixSkill.shapeId` / `rotation` 中）
- **不修改** 卡片的 click 事件、锁定逻辑、3D 效果、拖拽逻辑
- `renderShapePreview` 为纯函数（接收参数返回 HTML 字符串，不读取 `state`）
- 形状预览仅用于**商店卡片**，不影响键盘可视化或构筑界面（那些是 Story 40.7 的范围）
- 所有新 CSS class 使用 kebab-case 命名

### Previous Story Intelligence

Story 40.3 实现笔记：
- `bindingManager.ts` 新增 `bindShapeToKeys` / `unbindSkill` / `autoBindSkill` 等核心函数
- `BindingState` 接口：`{ bindings: Map<string, string>, affixSkills: Map<string, { shapeId?, rotation? }> }`
- 所有键位均为小写字母（`KEY_COORDS` 使用小写）
- 38 个 bindingManager 测试 + 74 个 RunState 测试全部通过
- 已封印策略采用方案 A（封印整个形状）

Story 40.2 实现笔记：
- `generateSkill()` 已正确分配 `shapeId` 和 `rotation`
- `serializeSkill/deserializeSkill` 已支持形状字段持久化，旧存档默认 monomino
- `AffixSkillInstance.shapeId` 和 `rotation` 为 optional 字段（向下兼容）

Story 40.1 实现笔记：
- `getShapeCells(shapeId, rotation)` 返回 `[number, number][] | null`
- `SHAPE_TEMPLATES` 含 11 种形状的所有旋转态
- cells 已标准化：min(row)=0, min(col)=0，按 row,col 排序

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 测试文件：`src/tests/unit/systems/shop/shop-shape-preview.test.ts`
- CSS class 命名遵循 kebab-case：`shape-preview`, `shape-cell`, `shape-cell-filled`
- 纯函数 + HTML 字符串返回（与现有 `renderUnifiedShopCard` 的 innerHTML 模式一致）

### Project Structure Notes

- 修改文件：`src/src/systems/shop.ts`（新增 renderShapePreview / getShapeDescription，修改 renderUnifiedShopCard）
- 修改文件：`src/src/style.css`（新增形状预览 CSS 样式）
- 新增测试：`src/tests/unit/systems/shop/shop-shape-preview.test.ts`
- 不新增源码文件（逻辑放在 shop.ts 内，与卡片渲染就近）
- 不修改：`skillShapes.ts`、`affixes.ts`、`types.ts`、`bindingManager.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.4]
- [Source: src/src/systems/shop.ts#renderUnifiedShopCard]
- [Source: src/src/data/skillShapes.ts#getShapeCells, SHAPE_TEMPLATES]
- [Source: src/src/data/affixes.ts#RARITY_COLORS]
- [Source: src/src/style.css#.reward-card]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]
- [Source: docs/stories/40-2-shape-generation.md#Dev Agent Record]
- [Source: docs/stories/40-1-shape-data-model.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 无 debug 问题，一次通过

### Completion Notes List

- `renderShapePreview(shapeId, rotation, rarity)` 纯函数：调用 `getShapeCells` 获取 cells，生成 CSS Grid HTML。rarity 0 / monomino 返回空字符串。使用 `shape-preview-r{rarity}` CSS class 控制颜色。
- `getShapeDescription(shapeId, cellCount)` 纯函数：返回中文描述如 "占据 3 格 L 形区域"。内部 `SHAPE_NAMES` 表映射 shapeId → 中文形状名。
- `renderUnifiedShopCard()` 修改：在 `reward-icon` div 内部追加 `shapePreviewHtml`（icon emoji 下方）。`.affix-skill-card .reward-icon` CSS 改为 `flex-direction: column` 布局。
- Tooltip 形状描述通过已有 `mechanicInfo` 字段注入，无需修改 `KeyTooltipData` 接口或 tooltip 渲染逻辑。
- CSS 新增 `.shape-preview` (inline-grid, gap 1px) + `.shape-cell` (5px 方块) + `.shape-cell.filled` 按稀有度着色（r1 蓝 / r2 紫 / r3 橙）。
- 21 个测试全部通过：renderShapePreview (10) + getShapeDescription (8) + 一致性验证 (1) + 边界条件 (2)

### Code Review Fixes (2026-03-24)

- **[M1]** 移除未使用的 `SHAPE_TEMPLATES` import（仅 `getShapeCells` 实际使用）
- **[M2]** `.reward-icon` flex column 布局限定为 `.affix-skill-card .reward-icon`，避免影响 pack/relic 卡片
- **[M3]** `getShapeDescription` 在 `格` 和形状名之间加空格：`占据 3 格 L 形区域`（中英文排版规范）

### File List

- `src/src/systems/shop.ts` (修改) — 新增 `renderShapePreview`, `getShapeDescription`, `SHAPE_NAMES`；修改 `renderUnifiedShopCard` 插入形状预览 + tooltip 形状描述
- `src/src/style.css` (修改) — 新增 `.shape-preview`, `.shape-cell`, `.shape-cell.filled` 样式；修改 `.reward-icon` 为 flex column 布局
- `src/tests/unit/systems/shop/shop-shape-preview.test.ts` (新增) — 21 个单元测试
