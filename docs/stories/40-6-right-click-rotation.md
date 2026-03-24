# Story 40.6: 右键旋转

Status: done

## Story

As a 玩家,
I want 右键点击已装备的多格技能来旋转形状,
so that 我能灵活调整技能形状适配不同的键盘区域.

## Acceptance Criteria

1. **AC1: 右键旋转已装备技能** — 右键点击已装备的多格技能键位，技能顺时针旋转 90°，bindings 正确更新（旧键位释放、新键位绑定）
2. **AC2: 旋转可行性检查** — 旋转前检查新形状在当前锚点是否可放置（边界 + 冲突）；不可旋转时播放失败音效 + 短暂抖动动画
3. **AC3: 锚点不变** — 旋转以锚点键位为圆心，旋转前后锚点键不变
4. **AC4: 单格技能忽略** — 1 格技能（monomino）右键不触发旋转逻辑
5. **AC5: 商店卡片预览旋转** — 商店中右键技能卡片，预览下一个旋转形态（更新形状预览 UI），不修改技能数据
6. **AC6: 旋转动画** — 旋转成功时格子短暂缩小 → 新位置展开（约 200ms 过渡）

## Tasks / Subtasks

- [x] Task 1: 键盘键位右键旋转核心逻辑 (AC: #1, #2, #3, #4)
  - [x] 1.1 在 `renderBuildManager()` 的 key-slot 渲染中，为有多格技能的键位添加 `contextmenu` 事件监听
  - [x] 1.2 事件处理函数 `handleKeySlotRotation(key: string)`：
    - 查找 `state.player.bindings.get(key)` 获取 skillId
    - 读取 `state.affixSkills.get(skillId)` 获取 shapeId / rotation
    - 如果 shapeId 为 monomino 或无 shapeId → return（AC4）
    - 计算 `nextRotation = (rotation + 1) % 4`
    - 调用 `mapShapeToKeys(anchorKey, shapeId, nextRotation)` 检查可行性
    - 成功：unbindSkill → 更新 affixSkill.rotation → bindShapeToKeys → renderBuildManager
    - 失败：playSound('wrong') + 抖动动画
  - [x] 1.3 `e.preventDefault()` 阻止浏览器默认右键菜单
  - [x] 1.4 锚点键获取：使用 `getSkillAnchorKey(bs, skillId)` 确保旋转围绕锚点
- [x] Task 2: 旋转动画 (AC: #6)
  - [x] 2.1 新增 CSS `.key-slot.shape-rotating` 动画：scale(0.8) → scale(1)，约 200ms
  - [x] 2.2 旋转成功后，对所有新绑定的键位添加 `.shape-rotating` class
  - [x] 2.3 动画结束后自动移除 class（`animationend` 监听）
- [x] Task 3: 旋转失败抖动动画 (AC: #2)
  - [x] 3.1 新增 CSS `.key-slot.shape-shake` 动画：左右抖动 + 红色闪烁，约 300ms
  - [x] 3.2 旋转失败时，对当前技能占据的所有键位添加 `.shape-shake` class
  - [x] 3.3 动画结束后自动移除 class
- [x] Task 4: 商店卡片右键预览旋转 (AC: #5)
  - [x] 4.1 在 `renderUnifiedShopCard()` 中，为多格技能卡片添加 `contextmenu` 监听
  - [x] 4.2 事件处理：使用闭包 `previewRotation` 变量追踪旋转态
    - 计算 `nextRotation = (previewRotation + 1) % 4`
    - 更新卡片内 `.shape-preview` 的 HTML（调用 `renderShapePreview` 重新生成）
    - 更新卡片的 `data-rotation` dataset
    - **不修改** `item.affixSkill.rotation`（仅视觉预览）
  - [x] 4.3 `e.preventDefault()` 阻止浏览器默认右键菜单
  - [x] 4.4 预览旋转用闭包变量 `previewRotation` 跟踪，不写回 state
- [x] Task 5: i18n 键 (AC: #2)
  - [x] 5.1 新增 `shop.rotate_fail` i18n 键（ZH: "无法旋转！" / EN: "Cannot rotate!"）
- [x] Task 6: 单元测试 (AC: #1~#6)
  - [x] 6.1 测试旋转核心：domino 从 rotation=0 旋转到 rotation=1，bindings 正确更新
  - [x] 6.2 测试旋转失败：边界位置的 triomino 旋转后放不下，绑定不变
  - [x] 6.3 测试锚点不变：旋转前后 getSkillAnchorKey 返回相同键
  - [x] 6.4 测试 monomino 不触发旋转（mapShapeToKeys 返回同一单键）
  - [x] 6.5 测试旋转覆盖冲突：旋转后的新形状覆盖其他技能，被覆盖技能自动解绑
  - [x] 6.6 测试连续旋转：rotation 0→1→2→3→0 循环

## Dev Notes

### 关键设计决策

**右键事件拦截**：使用 `contextmenu` 事件（`addEventListener('contextmenu', handler)`），`e.preventDefault()` 阻止浏览器右键菜单。这是标准做法，游戏类 Web 应用普遍使用。

**旋转锚点**：旋转以 `getSkillAnchorKey` 返回的键位为圆心。旋转后 `mapShapeToKeys(anchorKey, shapeId, nextRotation)` 检查新形状是否适配。如果锚点不变但新形状键位不同，需要 unbind → rebind。

**商店预览 vs 实际旋转**：
- 键盘上的旋转：**修改** `affixSkill.rotation` + 重新绑定
- 商店卡片的旋转：**仅更新 UI**，不修改 state。使用 `card` 上的 `data-preview-rotation` 临时追踪预览态。玩家购买时使用原始 rotation（或当前预览 rotation？需确定——建议使用当前预览 rotation 以尊重玩家意图）

**旋转后被覆盖技能处理**：旋转后新形状可能覆盖其他技能的键位。`bindShapeToKeys` 内部已处理冲突（`displacedSkillIds`），被覆盖技能自动解绑到库存。这与拖拽放置行为一致。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/systems/shop.ts:2196-2235` | `renderBuildManager()` key-slot | 键位渲染 + 事件注册 | 是：新增 contextmenu |
| `src/src/systems/shop.ts:1014-1036` | `renderUnifiedShopCard()` | 商品卡片渲染 | 是：新增 contextmenu |
| `src/src/systems/bindingManager.ts:36-78` | `bindShapeToKeys()` | 多格绑定核心 | 不改（调用） |
| `src/src/systems/bindingManager.ts:85-96` | `unbindSkill()` | 解绑技能 | 不改（调用） |
| `src/src/systems/bindingManager.ts:126-133` | `getSkillAnchorKey()` | 获取锚点键 | 不改（调用） |
| `src/src/data/skillShapes.ts:218-260` | `mapShapeToKeys()` | 形状到键位映射 | 不改（调用） |
| `src/src/data/skillShapes.ts:265-273` | `getShapeCells()` | 获取形状 cells | 不改（调用） |
| `src/src/systems/shop.ts:96-123` | `renderShapePreview()` | 形状预览 HTML | 不改（复用） |
| `src/src/effects/sound.ts:216` | `playSound()` | 音效播放 | 不改（调用 'wrong'） |
| `src/src/style.css:2915-2940` | Story 40.5 CSS | 形状高亮样式 | 是：新增旋转/抖动动画 |
| `src/src/core/constants.ts:114` | `SOUND_PROFILES` | 音效配置 | 不改（用 'wrong'） |

### 约束

- **不修改** `bindingManager.ts`、`skillShapes.ts`、`dragManager.ts`
- 旋转修改 `affixSkill.rotation` 字段（`state.affixSkills` 中的实例）
- `contextmenu` 事件需要在 key-slot 和 shop-card 两处注册
- 失败音效复用现有 `'wrong'` 声音配置
- 所有动画使用纯 CSS（`@keyframes` + `animationend` 自清理）
- 商店预览旋转不修改 `state`，仅操作 DOM

### Previous Story Intelligence

Story 40.5 实现笔记：
- `highlightShapePlacement` / `clearShapePlacement` 使用 querySelector + classList 模式
- `handleDropOnKey` 使用 `getSkillAnchorKey(bs, skillId)` 获取锚点
- swap 逻辑：`unbindSkill` → `bindShapeToKeys` → 失败回退
- `renderBuildManager()` 末尾调用 `registerShopDropZones()`（重新注册拖拽区）
- Code review 修复：`onDragEnd` 回调合并到 `openShop()`；购买前预检形状适配性

Story 40.3 实现笔记：
- `bindShapeToKeys(bs, skillId, anchorKey)` 返回 `{ success, displacedSkillIds }`
- `unbindSkill(bs, skillId)` 释放所有键位
- `getSkillAnchorKey(bs, skillId)` 返回 Map 迭代中第一个匹配键位
- 所有键位统一小写

Story 40.1 实现笔记：
- `mapShapeToKeys(anchorKey, shapeId, rotation)` → `string[] | null`
- `SHAPE_TEMPLATES[shapeId].rotations` 数组存储去重旋转态
- 旋转索引 `(rotation % 4 + 4) % 4`，超出 `rotations.length` 时用 `rotateShape` 动态计算
- monomino 只有 1 个旋转态（rotation 无效果）

### 旋转逻辑伪代码

```typescript
function handleKeySlotRotation(key: string): void {
  const bs = getBindingState(state);
  const skillId = state.player.bindings.get(key);
  if (!skillId) return;

  const affixSkill = state.affixSkills.get(skillId);
  if (!affixSkill) return;

  const shapeId = affixSkill.shapeId ?? 'monomino';
  if (shapeId === 'monomino') return; // AC4

  const anchorKey = getSkillAnchorKey(bs, skillId);
  if (!anchorKey) return;

  const nextRotation = ((affixSkill.rotation ?? 0) + 1) % 4;
  const targetKeys = mapShapeToKeys(anchorKey, shapeId, nextRotation);

  if (!targetKeys) {
    // 旋转不可行
    playSound('wrong');
    // 抖动动画
    return;
  }

  // 执行旋转
  unbindSkill(bs, skillId);
  affixSkill.rotation = nextRotation;
  const result = bindShapeToKeys(bs, skillId, anchorKey);
  // result.success 应为 true（已预检），displacedSkillIds 可能非空

  renderBuildManager();
  // 旋转动画
}
```

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 测试文件：`src/tests/unit/systems/shop/shop-rotation.test.ts`
- CSS class 命名：`shape-rotating`, `shape-shake`
- `contextmenu` 事件处理函数在 `shop.ts` 模块内，不导出（仅通过 DOM 事件触发）

### Project Structure Notes

- 修改文件：`src/src/systems/shop.ts`（contextmenu 事件注册 + handleKeySlotRotation + handleShopCardPreviewRotation）
- 修改文件：`src/src/style.css`（旋转动画 + 抖动动画）
- 修改文件：`src/src/demo/demo-i18n.ts`（shop.rotate_fail i18n 键）
- 新增测试：`src/tests/unit/systems/shop/shop-rotation.test.ts`
- 不新增源码文件
- 不修改：`bindingManager.ts`、`skillShapes.ts`、`dragManager.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.6]
- [Source: src/src/systems/shop.ts#renderBuildManager, renderUnifiedShopCard]
- [Source: src/src/systems/bindingManager.ts#bindShapeToKeys, unbindSkill, getSkillAnchorKey]
- [Source: src/src/data/skillShapes.ts#mapShapeToKeys, SHAPE_TEMPLATES]
- [Source: docs/stories/40-5-drag-drop-shape-placement.md#Dev Agent Record]
- [Source: docs/stories/40-3-keyboard-multi-cell-binding.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 无 debug 问题，一次通过

### Completion Notes List

- `handleKeySlotRotation(key)` 函数：获取锚点 → mapShapeToKeys 预检 → unbind → 修改 rotation → rebind → renderBuildManager → 动画
- 旋转失败：`playSound('wrong')` + `showFeedback` + `.shape-shake` 抖动动画（300ms，animationend 自清理）
- 旋转成功：`.shape-rotating` 缩放动画（200ms，scale 0.8→1.08→1，animationend 自清理）
- `contextmenu` 事件在 `renderBuildManager()` 中注册，仅对有多格技能的键位生效
- 商店卡片右键预览旋转：闭包 `previewRotation` 追踪，更新 `.shape-preview` HTML + `data-rotation` dataset，不修改 state
- i18n 新增 `shop.rotate_fail`（ZH: 无法旋转！/ EN: Cannot rotate!）
- 6 个纯绑定层单元测试全部通过

### Code Review Fixes (Claude Opus 4.6)

- **Fix #1 (HIGH)**: 捕获 `bindShapeToKeys` 返回值，旋转覆盖其他技能时显示 `shop.rotate_displaced` 警告反馈
- **Fix #2 (MEDIUM)**: 防御性回退 — `bindShapeToKeys` 失败时恢复旧 rotation 并重新绑定
- **Fix #3 (MEDIUM)**: 商店卡片预览旋转中 `renderShapePreview` 去重，复用已有 `newPreview` 变量
- **Fix #4 (MEDIUM)**: `handleKeySlotRotation` 中 querySelector 前添加 `KEYS.includes()` 验证，与 40.5 修复模式一致

### File List

- `src/src/systems/shop.ts` (修改) — handleKeySlotRotation 函数 + key-slot contextmenu 注册 + 商店卡片 contextmenu 预览旋转 + code review fixes
- `src/src/style.css` (修改) — shape-rotating 缩放动画 + shape-shake 抖动动画
- `src/src/demo/demo-i18n.ts` (修改) — shop.rotate_fail + shop.rotate_displaced i18n 键（ZH + EN）
- `src/tests/unit/systems/shop/shop-rotation.test.ts` (新增) — 6 个旋转核心逻辑单元测试
- `docs/stories/sprint-status.yaml` (修改) — 40-6 状态更新
