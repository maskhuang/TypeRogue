# Story 40.7: 键盘可视化多格适配

Status: review

## Story

As a 玩家,
I want 战斗中的键盘可视化将多格技能显示为统一的视觉区域,
so that 我能直观地看到每个技能的形状、位置和边界，做出更好的空间决策.

## Acceptance Criteria

1. **AC1: 多格技能视觉统一** — 同一技能占据的多个键位显示为视觉上连通的区域，同行相邻格子之间的分隔线移除
2. **AC2: 稀有度边框包围整个形状** — 稀有度颜色边框仅出现在形状外围边缘，内部相邻边不绘制
3. **AC3: 技能图标仅显示在锚点键** — 锚点键显示技能图标，非锚点键显示稀有度色调的淡色背景
4. **AC4: 词条圆点分布在所有格子** — 词条数圆点均匀分布到技能占据的所有键位（锚点键分配余数）
5. **AC5: 按键高亮覆盖整个形状** — 按下多格技能的任一键位时，所有格子同步高亮 + 触发动画同步播放
6. **AC6: 单格技能不变** — Monomino（0 词条白色技能）渲染行为与现有完全一致

## Tasks / Subtasks

- [x] Task 1: syncBindings() 多格分组逻辑 (AC: #1, #3, #4, #6)
  - [x] 1.1 在 `syncBindings()` 中构建 `skillKeyMap: Map<skillId, string[]>`，收集每个技能占据的所有键位
  - [x] 1.2 对每个键位计算 `EdgeMask { top: boolean, right: boolean, bottom: boolean, left: boolean }`，标记哪些边是「外部边」（需要绘制边框）、哪些是「内部边」（相邻同技能格子，不绘制）
  - [x] 1.3 使用键位坐标 + 行偏移量计算相邻关系：同行左右直接相邻；跨行需检查 x 坐标重叠范围 ≥ 半格（26px）
  - [x] 1.4 对每个键位确定 `isAnchor`：第一个绑定键（`getSkillAnchorKey` 语义）
  - [x] 1.5 对每个键位计算 `dotsForThisCell`：`Math.floor(totalAffixes / cellCount)` + 锚点键额外分配余数
  - [x] 1.6 调用新方法：`keyVisual.setShapeInfo({ edgeMask, isAnchor, affixDotsOverride })`
  - [x] 1.7 单格技能（monomino）：edgeMask 四边全 true、isAnchor=true、affixDots 不变 → 渲染完全一致（AC6）
- [x] Task 2: KeyVisual 边框分段绘制 (AC: #1, #2)
  - [x] 2.1 新增 `private edgeMask: EdgeMask = { top: true, right: true, bottom: true, left: true }` 状态
  - [x] 2.2 新增 `setShapeInfo(info: { edgeMask: EdgeMask, isAnchor: boolean, affixDotsOverride?: number })` 方法
  - [x] 2.3 重构 `drawBackground()`：替换 `roundRect()` 为分段路径绘制
    - 外部边：绘制直线 + 圆角（仅两条相邻外部边的交角处使用 `BORDER_RADIUS`）
    - 内部边：不绘制边框，填充颜色延伸到边缘（视觉上与相邻格子连通）
  - [x] 2.4 跨行相邻格子处理：由于 QWERTY 行偏移 0.5 格（26px），跨行不共享完整边 → 保留各自边框但使用相同稀有度颜色
  - [x] 2.5 边框颜色优先级保持不变：pressed > adjacent > rarity > score > default
- [x] Task 3: 锚点键图标 + 非锚点淡色背景 (AC: #3)
  - [x] 3.1 新增 `private isAnchorCell: boolean = true` 状态
  - [x] 3.2 `setShapeInfo()` 中更新 `isAnchorCell`
  - [x] 3.3 `setSkillIcon()` 条件：仅 `isAnchorCell=true` 时创建 Sprite 显示图标
  - [x] 3.4 非锚点键：`drawBackground()` 中在背景颜色上叠加稀有度色 12% 不透明度的 tint
  - [x] 3.5 非锚点键隐藏 `keyLabel`（键名文字），仅保留稀有度背景色
- [x] Task 4: 词条圆点分布 (AC: #4)
  - [x] 4.1 `setShapeInfo()` 传入 `affixDotsOverride` 时，覆盖默认 `setAffixDots(count)` 行为
  - [x] 4.2 锚点键：显示 `floor(total/cells) + remainder` 个圆点
  - [x] 4.3 非锚点键：显示 `floor(total/cells)` 个圆点
  - [x] 4.4 如果 `floor(total/cells) == 0` 且非锚点 → 不显示圆点
- [x] Task 5: 按键高亮覆盖整个形状 (AC: #5)
  - [x] 5.1 在 `KeyboardVisualizer` 中新增 `private skillKeyGroups: Map<skillId, string[]>`，在 `syncBindings()` 中填充
  - [x] 5.2 重构 `onKeyPress()`：
    - 查找 `bindings.get(keyLower)` → skillId
    - 如果 skillId 存在且 `skillKeyGroups.get(skillId).length > 1`：对所有技能键位调用 `setPressed(true)`
    - 否则：仅高亮单键（现有逻辑）
    - 相邻键高亮：取形状所有键位的邻居并集，排除形状自身键位
  - [x] 5.3 `clearHighlights()` 已有逻辑遍历所有键清除 pressed/adjacent → 无需修改
- [x] Task 6: 触发动画同步 (AC: #5)
  - [x] 6.1 重构 `onSkillTriggered()`：
    - 获取 `data.skillId` → `skillKeyGroups.get(skillId)` → 所有键位
    - 对所有键位调用 `playTriggerAnimation()`
    - `setStackCount` 和 `setGrowthLabel` 仅在锚点键显示
  - [x] 6.2 `setQuestProgress` 仅在锚点键显示进度环
- [x] Task 7: 纯逻辑单元测试 (AC: #1~#6)
  - [x] 7.1 测试边缘掩码计算：domino 水平（f+g）→ f.right=false, g.left=false，其余 true
  - [x] 7.2 测试边缘掩码计算：domino 垂直（f+v 跨行）→ 全部四边 true（跨行不共享边）
  - [x] 7.3 测试 L 形 triomino 边缘掩码：3 个格子的内外边正确
  - [x] 7.4 测试词条圆点分布：3 词条 / 3 格子 → 每格 1 点
  - [x] 7.5 测试词条圆点分布：3 词条 / 2 格子 → 锚点 2 点，非锚点 1 点
  - [x] 7.6 测试锚点识别：`getSkillAnchorKey` 结果与 `isAnchor` 一致
  - [x] 7.7 测试 monomino：edgeMask 全 true、isAnchor=true（向后兼容）
  - [x] 7.8 测试形状按键分组：skillKeyGroups 正确收集多键技能

## Dev Notes

### 关键设计决策

**PixiJS 渲染 vs HTML/CSS**：战斗键盘使用 PixiJS（`KeyboardVisualizer` + `KeyVisual`），完全独立于商店键盘（HTML `.key-slot`）。本 story 仅修改 PixiJS 组件，不影响 `shop.ts` 的 HTML 键盘。

**边框分段绘制方案**：当前 `drawBackground()` 使用 `roundRect()` 一次性绘制完整圆角矩形。多格适配需要替换为分段路径：
- 使用 `moveTo` / `lineTo` / `arcTo` 逐边绘制
- 每条边根据 `edgeMask` 决定是否绘制边框线
- 圆角仅在两条相邻外部边的交角处应用（`arcTo` 半径 = `BORDER_RADIUS`）
- 内部边：背景填充延伸到边缘，不绘制 stroke

**跨行相邻格子的视觉处理**：QWERTY 行偏移 0.5 格（26px），跨行键位不共享完整视觉边：
- 同行相邻：KEY_GAP=4px 间隙可移除，边框合并
- 跨行相邻：保留各自独立边框 + 使用相同稀有度颜色标识同属
- 可选增强：在 4px 垂直间隙中绘制连接条（稀有度颜色，仅在重叠 x 区间内）

**EdgeMask 计算算法**：
```typescript
interface EdgeMask {
  top: boolean;    // 是否绘制顶部边框
  right: boolean;  // 是否绘制右侧边框
  bottom: boolean; // 是否绘制底部边框
  left: boolean;   // 是否绘制左侧边框
}

// 同行相邻判定：两个键在同一行且列号差 = 1
// 跨行相邻判定：行号差 = 1 且 x 坐标重叠 ≥ KEY_SIZE/2 (24px)
// 对于同行相邻：
//   左键.right = false, 右键.left = false
// 跨行相邻：不修改 edgeMask（保留各自边框）
```

**词条圆点分布**：
```typescript
const totalAffixes = skill.affixes.length;  // 0~3
const cellCount = skillKeys.length;          // 1~4
const base = Math.floor(totalAffixes / cellCount);
const remainder = totalAffixes % cellCount;
// 锚点键: base + (remainder > 0 ? 1 : 0) 实际用 remainder
// 其他键: base
```

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/ui/keyboard/KeyboardVisualizer.ts:123-152` | `syncBindings()` | 遍历键位设置图标/颜色/稀有度/圆点 | 是：新增多格分组 |
| `src/src/ui/keyboard/KeyboardVisualizer.ts:193-216` | `onKeyPress()` | 高亮按下键 + 相邻键 | 是：整形状高亮 |
| `src/src/ui/keyboard/KeyboardVisualizer.ts:229-257` | `onSkillTriggered()` | 触发动画 + quest 进度 | 是：多键同步 |
| `src/src/ui/keyboard/KeyVisual.ts:114-152` | `drawBackground()` | `roundRect()` 完整圆角矩形 | 是：分段路径 |
| `src/src/ui/keyboard/KeyVisual.ts:177-196` | `setSkillIcon()` | 创建/销毁 Sprite 图标 | 是：锚点条件 |
| `src/src/ui/keyboard/KeyVisual.ts:423-467` | `setAffixDots()` + `drawAffixDots()` | 圆点绘制（clamp 0-3） | 是：接受 override |
| `src/src/ui/keyboard/KeyVisual.ts:61-64` | 尺寸常量 | KEY_SIZE=48, KEY_GAP=4, BORDER_RADIUS=6, BORDER_WIDTH=2 | 不改 |
| `src/src/ui/keyboard/KeyVisual.ts:66-75` | 颜色常量 | 背景/边框颜色 | 不改 |
| `src/src/systems/bindingManager.ts:126-133` | `getSkillAnchorKey()` | 获取锚点键 | 不改（调用） |
| `src/src/systems/bindingManager.ts:113-121` | `getSkillKeys()` | 获取所有占据键 | 不改（调用） |
| `src/src/data/skillShapes.ts:218-260` | `mapShapeToKeys()` | 形状到键位映射 | 不改（参考） |
| `src/src/scenes/battle/BattleScene.ts:106-111` | 键盘实例化 | 创建 + 定位 + bindEvents | 不改 |

### 约束

- **仅修改** `KeyboardVisualizer.ts` 和 `KeyVisual.ts`
- **不修改** `bindingManager.ts`、`skillShapes.ts`、`battle.ts`、`BattleScene.ts`、`shop.ts`、`dragManager.ts`
- 所有渲染使用 PixiJS Graphics API（`moveTo`、`lineTo`、`arcTo`、`fill`、`stroke`）
- 单格技能渲染必须与现有完全一致（AC6 回归保护）
- `syncBindings()` 签名不变，内部逻辑增强
- 测试使用纯逻辑测试（提取 edge mask 计算和圆点分布为可测试的纯函数）

### Previous Story Intelligence

**Story 40.3（bindingManager）实现笔记：**
- `getSkillKeys(bs, skillId)` 返回所有绑定键的列表
- `getSkillAnchorKey(bs, skillId)` 返回第一个匹配键位
- `BindingState = { bindings: Map<string, string>, affixSkills: Map<string, {...}> }`
- 所有键位统一小写

**Story 40.5（拖拽放置）实现笔记：**
- `renderBuildManager()` 中的 key-slot 渲染模式（HTML 版 — 本 story 不涉及）
- `highlightShapePlacement` / `clearShapePlacement` 的 querySelector + classList 模式
- 购买前 `mapShapeToKeys` 预检 → 失败提示 → 不扣金币

**Story 40.6（右键旋转）实现笔记：**
- 旋转后调用 `renderBuildManager()` 刷新（HTML 版）
- 战斗中旋转不适用（战斗中键盘不可编辑）
- PixiJS 键盘可视化器在战斗开始时通过 `syncBindings()` 一次性同步，战斗中不会改变绑定

**KeyboardVisualizer 布局关键数据：**
- ROWS: `[Q..P]`, `[A..L]`, `[Z..M]` (10/9/7 = 26 keys)
- ROW_OFFSETS: `[0, 0.5, 1.0]` × `(KEY_SIZE + KEY_GAP)` = `[0, 26, 52]` px
- 同行相邻键间距：KEY_GAP = 4px
- 跨行偏移：26px（半格）

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 新增纯函数导出：`computeEdgeMasks(keyPositions, bindings)` → 可单元测试
- 新增纯函数导出：`distributeAffixDots(totalAffixes, cellCount)` → 可单元测试
- 测试文件：`src/tests/unit/ui/keyboard/keyboard-multi-cell.test.ts`
- PixiJS Graphics API：使用 `graphics.moveTo()` / `graphics.lineTo()` / `graphics.arcTo()` 绘制路径

### Project Structure Notes

- 修改文件：`src/src/ui/keyboard/KeyboardVisualizer.ts`（syncBindings 多格分组 + onKeyPress 整形状高亮 + onSkillTriggered 同步触发）
- 修改文件：`src/src/ui/keyboard/KeyVisual.ts`（drawBackground 分段边框 + setShapeInfo 新方法 + 锚点/非锚点图标逻辑 + 圆点分布）
- 新增测试：`src/tests/unit/ui/keyboard/keyboard-multi-cell.test.ts`
- 不新增源码文件
- 不修改：`bindingManager.ts`、`skillShapes.ts`、`battle.ts`、`BattleScene.ts`、`shop.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.7]
- [Source: src/src/ui/keyboard/KeyboardVisualizer.ts#syncBindings, onKeyPress, onSkillTriggered]
- [Source: src/src/ui/keyboard/KeyVisual.ts#drawBackground, setSkillIcon, setAffixDots]
- [Source: src/src/systems/bindingManager.ts#getSkillKeys, getSkillAnchorKey]
- [Source: docs/stories/40-6-right-click-rotation.md#Dev Agent Record]
- [Source: docs/stories/40-5-drag-drop-shape-placement.md#Dev Agent Record]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 无 debug 问题，一次通过

### Completion Notes List

- `computeEdgeMasks()` 纯函数：同行相邻键位（col 差=1）移除共享边，跨行键位保留所有边（QWERTY 0.5 格偏移导致不共享完整边）
- `distributeAffixDots()` 纯函数：`floor(total/cells)` base + 余数分配给前 N 个格子
- `syncBindings()` 增强：构建 `skillKeyGroups` 分组 → 计算 `edgeMasks` → 调用 `setShapeInfo()` 分发形状信息到每个 KeyVisual
- `KeyVisual.setShapeInfo()` 新方法：接收 `EdgeMask` + `isAnchor` + `affixDotsOverride`，驱动 `drawBackground()` 重绘和键名标签可见性
- `drawBackground()` 重构：`isAllExternal` 分支保持原始 `roundRect` 渲染（monomino 向后兼容 AC6）；非全外部边使用 `rect` 填充 + 选择性边框矩形
- 非锚点键：隐藏键名标签、跳过技能图标创建、叠加 12% 不透明度稀有度色调
- `onKeyPress()` 重构：多格技能按下任一键 → 所有形状键位 `setPressed(true)` + 相邻键 = 形状所有键邻居并集减去形状自身
- `onSkillTriggered()` 重构：多格技能触发 → 所有键位播放 `playTriggerAnimation()`，叠层/成长/任务进度仅显示在锚点键
- `highlightKey()` 同步重构：与 `onKeyPress()` 保持一致的多格高亮逻辑
- 16 个纯逻辑单元测试全部通过，139 个键盘相关测试零回归

### File List

- `src/src/ui/keyboard/KeyboardVisualizer.ts` (修改) — computeEdgeMasks + distributeAffixDots 纯函数 + syncBindings 多格分组 + onKeyPress/onSkillTriggered/highlightKey 多格协调
- `src/src/ui/keyboard/KeyVisual.ts` (修改) — EdgeMask/ShapeInfo 接口 + setShapeInfo + drawBackground 分段边框 + setSkillIcon 锚点条件 + 非锚点色调
- `src/tests/unit/ui/keyboard/keyboard-multi-cell.test.ts` (新增) — 16 个纯逻辑单元测试
- `docs/stories/40-7-keyboard-visualizer-multi-cell.md` (修改) — 任务完成标记 + Dev Agent Record
