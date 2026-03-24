# Story 40.5: 拖拽放置与形状预览

Status: review

## Story

As a 玩家,
I want 拖拽多格技能到键盘时看到形状轮廓预览并正确放置,
so that 我在构筑阶段能直观预判技能的空间占用并精确操作.

## Acceptance Criteria

1. **AC1: 拖拽悬停形状高亮** — 拖拽技能悬停键位时，高亮该技能形状将覆盖的所有键位（以悬停键为锚点，调用 `mapShapeToKeys`）
2. **AC2: 可放置/不可放置视觉反馈** — 可放置时绿色高亮所有目标键位；不可放置（超出边界/形状映射失败）时红色高亮悬停键位
3. **AC3: 被覆盖技能警告** — 目标键位已有其他技能时，被覆盖键位黄色闪烁警告
4. **AC4: 放置成功绑定** — 拖拽释放到可放置键位时，调用 `bindShapeToKeys()` 完成多格绑定，被覆盖技能自动回收到库存
5. **AC5: 单格技能兼容** — monomino（rarity 0）技能拖拽行为与当前完全一致（单键高亮，单键绑定）
6. **AC6: 从键盘拖走多格技能** — 拖出多格技能时，所有占用键位正确释放（整体解绑）

## Tasks / Subtasks

- [x] Task 1: DragPayload 扩展 (AC: #1, #5)
  - [x] 1.1 在 `DragPayload` 接口新增 optional 字段 `shapeId?: string` 和 `rotation?: number`
  - [x] 1.2 修改 `buildPayload()` 中 `shop-item` 分支：从 DOM dataset 读取 `shapeId` / `rotation`
  - [x] 1.3 修改 `buildPayload()` 中 `skill-inventory` 分支：从 DOM dataset 读取 `shapeId` / `rotation`
  - [x] 1.4 修改 `buildPayload()` 中 `skill-key` 分支：从 DOM dataset 读取 `shapeId` / `rotation`
  - [x] 1.5 monomino 技能：`shapeId` 为 `undefined`，行为不变
- [x] Task 2: 形状悬停高亮系统 (AC: #1, #2, #3, #5)
  - [x] 2.1 在 `shop.ts` 新增 `highlightShapePlacement(anchorKey: string, payload: DragPayload): void`
    - 调用 `mapShapeToKeys(anchorKey, shapeId, rotation)` 获取目标键位列表
    - 成功：所有目标键位添加 `.shape-preview-valid` class（绿色高亮）
    - 失败（返回 null）：仅 anchorKey 添加 `.shape-preview-invalid` class（红色高亮）
  - [x] 2.2 在 `highlightShapePlacement` 中检测被覆盖技能：目标键位已有其他技能时添加 `.shape-preview-displaced` class（黄色闪烁）
  - [x] 2.3 新增 `clearShapePlacement(): void` — 清除所有 `.shape-preview-valid`、`.shape-preview-invalid`、`.shape-preview-displaced` class
  - [x] 2.4 monomino 回退：`shapeId` 为 `'monomino'` 或无 `shapeId` 时，不触发形状高亮（沿用现有 `drop-zone-highlight` 逻辑）
- [x] Task 3: DropZone 回调集成 (AC: #1, #2, #3)
  - [x] 3.1 修改 key-slot `onDragEnter` 回调：调用 `highlightShapePlacement(key, payload)`
  - [x] 3.2 修改 key-slot `onDragLeave` 回调：调用 `clearShapePlacement()`
  - [x] 3.3 key-slot `accepts()` 逻辑不变（仅检查 freq-locked + 商品类型，不做形状可达性检查）
  - [x] 3.4 通过 `dragManager.onDragEnd` 回调调用 `clearShapePlacement()` 确保拖拽结束时清理
- [x] Task 4: handleDropOnKey 多格适配 (AC: #4, #5, #6)
  - [x] 4.1 `shop-item` 分支：bindShapeToKeys 失败时显示 shape_no_fit 提示
  - [x] 4.2 `skill-inventory` / `skill-key` 分支：使用 `getSkillAnchorKey` 获取双方锚点键，支持多格交换
  - [x] 4.3 交换失败回退：r1/r2 任一失败时恢复双方原始绑定
  - [x] 4.4 从键盘拖到 skill-inventory：`unbindSkill()` 已处理整体解绑（验证多格技能）
- [x] Task 5: 拖拽幽灵形状缩略图 (AC: #1)
  - [x] 5.1 `createGhost()` 检查 `payload.shapePreviewHtml`，非空时追加形状 HTML
  - [x] 5.2 shop.ts 渲染卡片/键位/库存时将 `renderShapePreview` 结果写入 `data-shape-preview`
  - [x] 5.3 幽灵元素使用 `.drag-ghost-shape` class 包裹形状缩略图
- [x] Task 6: CSS 样式 (AC: #1, #2, #3)
  - [x] 6.1 新增 `.shape-preview-valid` 样式：绿色高亮键位
  - [x] 6.2 新增 `.shape-preview-invalid` 样式：红色高亮键位
  - [x] 6.3 新增 `.shape-preview-displaced` 样式：黄色闪烁
  - [x] 6.4 新增 `@keyframes displaced-blink` 动画
  - [x] 6.5 `.drag-ghost-shape` 样式：幽灵内形状缩略图布局
- [x] Task 7: 单元测试 (AC: #1~#6)
  - [x] 7.1 测试 `highlightShapePlacement` 对 monomino 不触发高亮（2 tests）
  - [x] 7.2 测试 `highlightShapePlacement` 对 domino 高亮两个键位（valid class）
  - [x] 7.3 测试 `highlightShapePlacement` 对超出边界形状标记 invalid
  - [x] 7.4 测试 `highlightShapePlacement` 对 triomino 高亮三个键位
  - [x] 7.5 测试 `clearShapePlacement` 清除所有形状高亮 class（2 tests）
  - [x] 7.6 测试 `bindShapeToKeys` 多格技能绑定多个键位
  - [x] 7.7 测试多格交换逻辑：双方都重新绑定
  - [x] 7.8 测试交换失败时回退到原始状态
  - [x] 7.9 测试 DragPayload 包含 shapeId/rotation（2 tests）

## Dev Notes

### 关键设计决策

**accepts vs onDragEnter 分工**：`accepts()` 不做形状可达性检查（只检查 freq-locked），让所有非锁定键位都可以悬停。形状是否放得下由 `onDragEnter` 的视觉反馈（绿/红高亮）告知玩家，`onDrop` 时再做最终验证。这样避免拖拽时"找不到可放置键"的困惑体验。

**交换逻辑**：当前 `handleDropOnKey` 的交换已使用 `unbindSkill + bindShapeToKeys`（Story 40.3 改造）。多格 → 多格交换的难点是：解绑 A 后，A 原来占的键位空出，此时绑定 B 到 A 的 anchorKey 可能因为形状不同而失败。需要保存双方的 anchorKey 以供恢复。

**幽灵形状缩略图**：复用 Story 40.4 的 `renderShapePreview()` 函数在拖拽幽灵中显示形状。但 `createGhost` 在 `dragManager.ts` 中，而 `renderShapePreview` 在 `shop.ts` 中。方案：在 DragPayload 中新增 `shapePreviewHtml?: string` 字段，由 `buildPayload` 时生成。

**形状高亮调用链**：
1. 鼠标进入键位 → `onDragEnter(payload)` → `highlightShapePlacement(key, payload)`
2. `highlightShapePlacement` 调用 `mapShapeToKeys(key, shapeId, rotation)`
3. 结果非 null → 所有目标键位加 `.shape-preview-valid`，被覆盖键位加 `.shape-preview-displaced`
4. 结果为 null → 仅当前键位加 `.shape-preview-invalid`
5. 鼠标离开 → `onDragLeave(payload)` → `clearShapePlacement()`

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/systems/dragManager.ts:7-18` | `DragPayload` 接口 | 拖拽载荷类型定义 | 是：新增 shapeId, rotation, shapePreviewHtml |
| `src/src/systems/dragManager.ts:20-28` | `DropZone` 接口 | 放置区回调 | 不改 |
| `src/src/systems/dragManager.ts:231-268` | `buildPayload()` | 构建拖拽载荷 | 是：读取形状信息 |
| `src/src/systems/dragManager.ts:270-289` | `createGhost()` | 创建拖拽幽灵 | 是：追加形状缩略图 |
| `src/src/systems/dragManager.ts:291-330` | `updateDropTarget()` | 放置区检测 + 高亮 | 不改（高亮逻辑在 onDragEnter/onDragLeave） |
| `src/src/systems/shop.ts:2476-2499` | `registerShopDropZones()` key-slot | 键位放置区注册 | 是：新增 onDragEnter/onDragLeave |
| `src/src/systems/shop.ts:2545-2590` | `handleDropOnKey()` | 拖拽到键位处理 | 是：交换失败回退 |
| `src/src/systems/bindingManager.ts:36-78` | `bindShapeToKeys()` | 多格绑定核心 | 不改（调用） |
| `src/src/systems/bindingManager.ts:85-96` | `unbindSkill()` | 解绑技能 | 不改（调用） |
| `src/src/data/skillShapes.ts:220-260` | `mapShapeToKeys()` | 形状到键位映射 | 不改（调用） |
| `src/src/systems/shop.ts:renderShapePreview` | `renderShapePreview()` | 形状预览 HTML | 不改（复用） |
| `src/src/style.css:716-741` | `.key-slot` 基础样式 | 键位槽样式 | 是：新增形状高亮样式 |
| `src/src/style.css:2902-2910` | `.drop-zone-highlight` | 现有放置高亮 | 不改（保留为兜底） |

### 约束

- **不修改** `bindingManager.ts`（仅调用 `bindShapeToKeys`、`unbindSkill`、`getSkillKeys`、`getSkillAnchorKey`）
- **不修改** `skillShapes.ts`（仅调用 `mapShapeToKeys`）
- **不修改** `DropZone` 接口（`onDragEnter` / `onDragLeave` 已有 optional 回调）
- `highlightShapePlacement` / `clearShapePlacement` 为纯 DOM 操作函数（读取 payload + 查询 `.key-slot[data-key]`）
- `DragPayload` 的 `shapeId` / `rotation` 为 optional（向下兼容无形状的拖拽类型）
- 形状高亮仅用于**商店构筑界面**，不影响战斗键盘或热力图
- 所有新 CSS class 使用 kebab-case 命名
- `buildPayload` 访问 `state` 需要通过闭包（dragManager.ts 内的 `buildPayload` 不直接 import state）

### buildPayload 状态访问方案

`buildPayload` 在 `dragManager.ts` 内部，不 import `state`。当前从 DOM dataset 读取数据。有两种方案为多格技能传递形状信息：

**方案 A（推荐）：DOM dataset 扩展**
- 在 `renderUnifiedShopCard()` 渲染商品卡片时，写入 `data-shape-id` / `data-rotation` 到 card element
- 在 `renderBuildManager()` 渲染键位/库存时，写入 `data-shape-id` / `data-rotation` 到 slot/inventory element
- `buildPayload` 从 `el.dataset.shapeId` / `el.dataset.rotation` 读取

**方案 B：回调注入**
- `buildPayload` 返回基础 payload，由 shop.ts 的 `onDragStart` 回调补充 shapeId/rotation

采用方案 A，与现有 `data-shop-index` / `data-skill-id` / `data-sell-price` 模式一致。

### 幽灵形状方案

`createGhost` 在 dragManager.ts，不能直接调用 `renderShapePreview`（在 shop.ts）。方案：
- 在 `DragPayload` 新增 `shapePreviewHtml?: string` 字段
- `buildPayload` 时从 DOM dataset `data-shape-preview` 读取预生成的 HTML（由 shop.ts 渲染时写入）
- 或者将 `renderShapePreview` 提取到独立工具模块（不推荐，过度设计）

最简方案：`createGhost` 检查 `payload.shapePreviewHtml`，有则插入 ghost 中。

### Previous Story Intelligence

Story 40.4 实现笔记：
- `renderShapePreview(shapeId, rotation, rarity)` 纯函数生成 CSS Grid HTML
- `getShapeDescription(shapeId, cellCount)` 使用 `t()` i18n
- 商品卡片 `renderUnifiedShopCard()` 已在 `.reward-icon` 内追加 shape preview
- CSS `.shape-preview` / `.shape-cell` / `.shape-cell.filled` 已就绪

Story 40.3 实现笔记：
- `bindShapeToKeys(bs, skillId, anchorKey)` 返回 `{ success, displacedSkillIds }`
- `unbindSkill(bs, skillId)` 返回释放的键位列表
- `getSkillKeys(bs, skillId)` 返回技能占据的所有键位
- `getSkillAnchorKey(bs, skillId)` 返回锚点键
- `handleDropOnKey` 已使用 `bindShapeToKeys` 进行交换逻辑
- 所有键位统一小写

Story 40.1 实现笔记：
- `mapShapeToKeys(anchorKey, shapeId, rotation)` 返回 `string[] | null`
- 返回 null 表示形状放不下（超出边界/连通性验证失败）
- 锚点为 cells[0]（排序后最左上 cell）

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 测试文件：`src/tests/unit/systems/shop/shop-drag-shape.test.ts`
- CSS class 命名遵循 kebab-case：`shape-preview-valid`, `shape-preview-invalid`, `shape-preview-displaced`
- DOM dataset 命名遵循 camelCase：`data-shape-id` → `el.dataset.shapeId`
- 纯 DOM 操作函数（querySelector + classList）模式与现有 `highlightSkillRange` / `clearRangeHighlight` 一致

### Project Structure Notes

- 修改文件：`src/src/systems/dragManager.ts`（DragPayload 扩展 + createGhost 形状缩略图）
- 修改文件：`src/src/systems/shop.ts`（highlightShapePlacement + clearShapePlacement + onDragEnter/onDragLeave + DOM dataset + handleDropOnKey 交换回退）
- 修改文件：`src/src/style.css`（形状放置高亮样式 + 幽灵形状样式）
- 新增测试：`src/tests/unit/systems/shop/shop-drag-shape.test.ts`
- 不新增源码文件
- 不修改：`bindingManager.ts`、`skillShapes.ts`、`keyboardTopology.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.5]
- [Source: src/src/systems/dragManager.ts#DragPayload, DropZone, buildPayload, createGhost]
- [Source: src/src/systems/shop.ts#registerShopDropZones, handleDropOnKey, renderBuildManager]
- [Source: src/src/systems/bindingManager.ts#bindShapeToKeys, unbindSkill, getSkillKeys]
- [Source: src/src/data/skillShapes.ts#mapShapeToKeys]
- [Source: docs/stories/40-4-shop-shape-preview.md#Dev Agent Record]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]
- [Source: docs/stories/40-1-shape-data-model.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 无 debug 问题，一次通过

### Completion Notes List

- `DragPayload` 接口扩展 `shapeId?`, `rotation?`, `shapePreviewHtml?` 三个 optional 字段（向下兼容）
- `buildPayload()` 三个技能分支（shop-item / skill-inventory / skill-key）均从 DOM dataset 读取形状数据
- 方案 A（DOM dataset）：shop.ts 渲染卡片/键位/库存时写入 `data-shape-id`, `data-rotation`, `data-shape-preview`，dragManager.ts 的 `buildPayload` 从 dataset 读取
- `highlightShapePlacement(anchorKey, payload)` 导出函数：调用 `mapShapeToKeys` → 成功加 `shape-preview-valid`，失败加 `shape-preview-invalid`，被覆盖键加 `shape-preview-displaced`；monomino 不触发（沿用原有 drop-zone-highlight）
- `clearShapePlacement()` 导出函数：querySelectorAll 移除三种高亮 class
- key-slot DropZone 新增 `onDragEnter` / `onDragLeave` 回调 + `dragManager.onDragEnd` 全局清理
- `handleDropOnKey` 交换逻辑改用 `getSkillAnchorKey` 获取双方锚点键，支持多格 → 多格交换，r1/r2 任一失败时完整回退
- `createGhost()` 检查 `payload.shapePreviewHtml`，追加 `.drag-ghost-shape` 容器
- CSS 新增 `.shape-preview-valid`（绿色）/ `.shape-preview-invalid`（红色）/ `.shape-preview-displaced`（黄色闪烁）+ `@keyframes displaced-blink` + `.drag-ghost-shape`
- i18n 新增 `shop.shape_no_fit`（ZH: 形状放不下！/ EN: Shape doesn't fit!）
- 14 个新测试全部通过：highlight (5) + clear (2) + binding swap (5) + payload (2)

### File List

- `src/src/systems/dragManager.ts` (修改) — DragPayload 扩展 shapeId/rotation/shapePreviewHtml；buildPayload 从 dataset 读取；createGhost 追加形状缩略图
- `src/src/systems/shop.ts` (修改) — 新增 highlightShapePlacement/clearShapePlacement；renderUnifiedShopCard/renderBuildManager 写入 data-shape-*；registerShopDropZones 新增 onDragEnter/onDragLeave + onDragEnd；handleDropOnKey 交换回退逻辑；新增 mapShapeToKeys/getSkillAnchorKey import
- `src/src/style.css` (修改) — 新增 shape-preview-valid/invalid/displaced 样式 + displaced-blink 动画 + drag-ghost-shape 样式
- `src/src/demo/demo-i18n.ts` (修改) — 新增 shop.shape_no_fit i18n 键（ZH + EN）
- `src/tests/unit/systems/shop/shop-drag-shape.test.ts` (新增) — 14 个单元测试
- `docs/stories/sprint-status.yaml` (修改) — 40-5 状态更新
