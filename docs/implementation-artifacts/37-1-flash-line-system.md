# Story 37.1: 闪光连线系统（RelicFlash）

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 遗物触发效果时看到从遗物图标射向目标 UI 的闪光连线,
so that 我能清晰理解每个遗物在何时对哪个目标产生了效果，建立视觉因果关系.

## Acceptance Criteria

1. **闪光连线函数实现** — `flashRelicLine(relicIndex, targetId, color)` 函数在 `battle.ts` 中可用，能从 `#player-relics .relic-icon[relicIndex]` 图标到任意目标元素发射一条短暂闪光连线
2. **CSS 动画效果** — `.relic-flash-line` 使用 `clip-path` 实现从遗物端「射出」到目标端，再从遗物端「收回」消散的扫过效果，总时长 ~300ms
3. **线条样式** — 2px 高度，使用 `linear-gradient` 实现两端渐隐中间实心效果，绝对定位 + `pointer-events: none` + `z-index: 150`
4. **自动清除** — 动画结束后 DOM 元素自动移除（`animationend` 事件）
5. **多线并存** — 多个遗物同时触发时，每条闪光连线为独立 `<div>`，互不干扰
6. **坐标计算正确** — 通过 `getBoundingClientRect()` 计算两点中心坐标，用 `width`（两点距离）+ `transform: rotate(角度)` + `transform-origin: left center` 画线
7. **颜色参数** — 接受 `color` 参数，通过 CSS `color` 属性 + `currentColor` 实现颜色传递
8. **战斗结束清理** — 提供 `clearFlashLines()` 函数，在 `clearFloatQueue` 同处调用，移除所有残留闪光线 DOM
9. **编译通过** — `npm run build` 无错误

## Tasks / Subtasks

- [x] Task 1: 实现 `flashRelicLine` 函数 (AC: #1, #6, #7)
  - [x] 1.1 在 `battle.ts` 浮字系统区块后添加 `flashRelicLine(relicIndex: number, targetId: string, color: string): void`
  - [x] 1.2 通过 `document.querySelectorAll('#player-relics .relic-icon')[relicIndex]` 获取遗物图标元素
  - [x] 1.3 通过 `document.getElementById(targetId)` 获取目标元素
  - [x] 1.4 使用 `getBoundingClientRect()` 计算两个元素中心坐标（相对于 `#game-container`）
  - [x] 1.5 计算两点距离 `Math.hypot(dx, dy)` 和角度 `Math.atan2(dy, dx)`
  - [x] 1.6 创建 `<div class="relic-flash-line">`，设置 `width`、`transform: rotate()`、`left/top`、`color`
  - [x] 1.7 追加到 `getElements().container`（`#game-container`，它有 `position: relative` 作为绝对定位参考系）
  - [x] 1.8 守护：若 `iconEl` 或 `targetEl` 不存在则静默返回

- [x] Task 2: 添加 CSS 样式和动画 (AC: #2, #3)
  - [x] 2.1 在 `style.css` 遗物显示区块后添加 `.relic-flash-line` 类
  - [x] 2.2 添加 `@keyframes relicFlash` 动画（clip-path 扫过 + 透明度渐变）

- [x] Task 3: 自动清除机制 (AC: #4, #5)
  - [x] 3.1 监听 `animationend` 事件，回调中移除 DOM 元素
  - [x] 3.2 确保每次调用创建新的独立 `<div>`（非池化复用，因频率低 ~300ms 生命周期短）

- [x] Task 4: 战斗结束清理 (AC: #8)
  - [x] 4.1 实现 `clearFlashLines()`：`container.querySelectorAll('.relic-flash-line').forEach(el => el.remove())`
  - [x] 4.2 在 `clearFloatQueue()` 函数末尾调用 `clearFlashLines()`

- [x] Task 5: 编译验证 (AC: #9)
  - [x] 5.1 `flashRelicLine` 声明为模块内私有函数（不加 export，同文件内直接调用）
  - [x] 5.2 运行 `npm run build` 确认编译通过（Vite build 579ms, 0 new errors）

## Dev Notes

### 函数签名（最终 API，后续 Story 37-2~37-5 依赖此签名不会变更）

```typescript
function flashRelicLine(relicIndex: number, targetId: string, color: string): void
```

### 实现骨架

```typescript
function flashRelicLine(relicIndex: number, targetId: string, color: string): void {
  const iconEl = document.querySelectorAll('#player-relics .relic-icon')[relicIndex] as HTMLElement | undefined;
  const targetEl = document.getElementById(targetId);
  if (!iconEl || !targetEl) return;

  const container = getElements().container;
  const containerRect = container.getBoundingClientRect();
  const iconRect = iconEl.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const x1 = iconRect.left + iconRect.width / 2 - containerRect.left;
  const y1 = iconRect.top + iconRect.height / 2 - containerRect.top;
  const x2 = targetRect.left + targetRect.width / 2 - containerRect.left;
  const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;

  const dist = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  const line = document.createElement('div');
  line.className = 'relic-flash-line';
  line.style.width = dist + 'px';
  line.style.left = x1 + 'px';
  line.style.top = y1 + 'px';
  line.style.color = color;
  line.style.transform = `rotate(${angle}deg)`;
  line.onanimationend = () => line.remove();

  container.appendChild(line);
}

function clearFlashLines(): void {
  getElements().container.querySelectorAll('.relic-flash-line').forEach(el => el.remove());
}
```

### CSS 样式

```css
.relic-flash-line {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor 30%, currentColor 70%, transparent);
  transform-origin: left center;
  pointer-events: none;
  z-index: 150;  /* 浮字(100) < 闪光线(150) < UI面板(200+) */
  animation: relicFlash 0.3s ease-out forwards;
  opacity: 0.8;
}

@keyframes relicFlash {
  0%   { clip-path: inset(0 100% 0 0); opacity: 0.9; }
  40%  { clip-path: inset(0 0 0 0); opacity: 0.8; }
  100% { clip-path: inset(0 0 0 100%); opacity: 0; }
}
```

### 关键文件位置与行号

| 文件 | 行号 | 内容 |
|------|------|------|
| `src/src/systems/battle.ts` | L1987-2012 | `renderRelicDisplay()` — 渲染 `#player-relics .relic-icon` 元素 |
| `src/src/systems/battle.ts` | L2020-2214 | 浮字系统 — `createFloatText`, `showFeedback`, `RESOURCE_TARGET_IDS` |
| `src/src/systems/battle.ts` | L2059-2065 | `RESOURCE_TARGET_IDS` 映射 |
| `src/src/systems/battle.ts` | L2083-2182 | `createFloatText` — 贝塞尔曲线飞行动画（坐标计算模式参考） |
| `src/src/systems/battle.ts` | L2196-2208 | `clearFloatQueue()` — 在此处同步调用 `clearFlashLines()` |
| `src/src/style.css` | L52-56 | `#game-container { position: relative }` — 绝对定位参考系 |
| `src/src/style.css` | L586-596 | `#player-relics` + `.relic-icon` 样式 |
| `src/index.html` | L25 | `<div id="player-relics"></div>` |

### 插入位置

- **`flashRelicLine` + `clearFlashLines`**：`battle.ts` 的 `showFeedback` 函数之后（~L2214 后）
- **CSS 样式**：`style.css` 的 `.relic-icon` 样式之后（~L596 后）

### 定位上下文

`getElements().container` = `#game-container`，CSS 中设有 `position: relative`（style.css L52），是所有绝对定位子元素的坐标参考系。`createFloatText` 使用相同模式：`getBoundingClientRect()` 减去 `containerRect` 得到容器内坐标。闪光连线必须遵循完全相同的坐标计算模式。

### 边界

- 仅实现视觉闪光连线，不改遗物效果逻辑、不添加音效
- 不做对象池（频率低、300ms 生命周期短）
- 不实现 `getRelicIndex`（Story 37-6）、不集成到遗物触发点（Story 37-2~37-5）
- 后续 Story 37-3 将接入分数磁铁（每次击键触发），高频场景下需在**调用侧**做节流，本函数不内置节流

### Project Structure Notes

- `flashRelicLine` 放在 `battle.ts` 内部，模块私有（不 export），与 `createFloatText` 共享 `getElements()` 和容器引用
- 后续 Story 37-3/4/5 在同文件内直接调用
- CSS 类名 `.relic-flash-line` 与现有 `.float-text` 命名风格一致

### References

- [Source: src/docs/epic-relic-feedback-flight.md#Story 1: 闪光连线系统（RelicFlash）]
- [Source: src/docs/epic-relic-feedback-flight.md#闪光连线 CSS]
- [Source: src/src/systems/battle.ts#L2083-2182 createFloatText 飞行动画]
- [Source: src/src/systems/battle.ts#L2196-2208 clearFloatQueue 清理]
- [Source: src/src/systems/battle.ts#L1987-2012 renderRelicDisplay]
- [Source: src/src/style.css#L52-56 game-container position:relative]
- [Source: src/src/style.css#L586-596 relic-icon 样式]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TS6133 warning for `flashRelicLine` is expected — function is unused until Stories 37-2~37-5 integrate it (consistent with existing unused imports pattern in battle.ts L6, L31)

### Completion Notes List

- Implemented `flashRelicLine(relicIndex, targetId, color)` in battle.ts before `clearFloatQueue`
- Implemented `clearFlashLines()` cleanup function, integrated into `clearFloatQueue()`
- Added `.relic-flash-line` CSS class + `@keyframes relicFlash` animation in style.css after `.relic-icon`
- Coordinates calculated relative to `#game-container` (position: relative), matching `createFloatText` pattern
- Null guards for missing icon/target elements (silent return)
- Each flash line is an independent `<div>`, auto-removed via `onanimationend`
- Vite build passes (545ms, 0 new errors)
- All 3372 passing tests remain passing (143 pre-existing failures unchanged)

### Senior Developer Review (AI)

**Review Date:** 2026-03-14
**Outcome:** Approve (after fixes)
**Issues Found:** 3 Medium, 2 Low — All resolved

**Action Items:**
- [x] [M1] Fixed 1px vertical offset bug — `top: (y1-1)+'px'` centers 2px line on icon
- [x] [M2] Moved flash line functions before `clearFloatQueue` — eliminated forward reference
- [x] [M3] Replaced `querySelectorAll` with cached `getElements().playerRelics.children[relicIndex]`
- [x] [L1] Removed redundant `opacity: 0.8` from CSS class — keyframe controls opacity entirely
- [x] [L2] Updated File List to include `sprint-status.yaml`

### Change Log

- 2026-03-14: Implemented flashRelicLine system — visual infrastructure for relic feedback (Story 37-1)
- 2026-03-14: Code review fixes — 1px offset, forward ref, DOM query efficiency, CSS opacity

### File List

- `src/src/systems/battle.ts` — Added `flashRelicLine()` + `clearFlashLines()` functions, integrated cleanup into `clearFloatQueue()`
- `src/src/style.css` — Added `.relic-flash-line` class + `@keyframes relicFlash` animation
- `docs/implementation-artifacts/sprint-status.yaml` — Status tracking updates
