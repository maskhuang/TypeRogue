# Story 55.9: 浮字系统迁移至 PixiJS BitmapText

Status: ready-for-dev

## Story

As a 玩家,
I want 浮字反馈（错误提示、购买提示、遗物效果、资源产出等）流畅无卡顿,
so that 高速打字和商店操作时不会因浮字渲染而掉帧。

## 背景

当前浮字系统使用 DOM `<div>` 元素 + CSS 动画/JS rAF 驱动。每次 `textContent` 变化触发浏览器文本 shaping，webfont (Press Start 2P) 加剧延迟。经多轮 DOM 优化（对象池、rAF 替代 offsetWidth、contain、visibility 替代 display）仍有明显卡顿。

像素游戏标准做法：用 **bitmap font 纹理**预渲染字体，运行时只做 GPU sprite UV 查找，零文本 shaping。PixiJS 已加载，可直接使用 `BitmapFont` + `BitmapText`。

## Acceptance Criteria

1. **AC1: BitmapFont 初始化** — 游戏启动时用 `BitmapFont.from()` 预渲染 Press Start 2P 为纹理图集，包含 ASCII 可打印字符 + 常用中文数字符号（+、-、×、！）
2. **AC2: BitmapText 对象池** — 创建固定容量（32-64）的 `BitmapText` 实例池，spawn/recycle 无 DOM 操作、无 GC 压力
3. **AC3: 非飞行浮字迁移** — 错误提示、购买反馈、遗物效果等浮字改用 BitmapText 池渲染，阶梯动画（8 步）保持像素风
4. **AC4: 飞行浮字迁移** — 资源产出飞行动画（贝塞尔曲线轨迹）改用 BitmapText，保持阶梯插值（10 步）
5. **AC5: 性能达标** — 浮字渲染每帧 <0.5ms（对比当前 DOM 方案），快速打字（100+ WPM）时无掉帧
6. **AC6: 视觉一致** — 浮字外观（颜色、大小、轨迹、像素阶梯感）与迁移前一致
7. **AC7: 清理旧代码** — 移除 DOM 浮字池（`floatPool`、`initFloatPool`、`acquireFloat`、`releaseFloat`）及相关 CSS（`.float-text`、`.float-text-active`、`@keyframes floatDown`）

## Tasks / Subtasks

- [x] Task 1: Canvas2D glyph atlas 初始化 (AC: 1) — 方案调整：游戏主体为 DOM 渲染，无活跃 PixiJS 循环，改用 Canvas2D + 离屏 glyph atlas
  - [x] 1.1 `buildGlyphAtlas()` 用 OffscreenCanvas 预渲染 Press Start 2P 所有 ASCII + 常用符号
  - [x] 1.2 字符集：ASCII 32-126 + `×！＋`
  - [x] 1.3 字号 16px，逐字符测量宽度，生成 glyph UV 查找表
  - [x] 1.4 atlas 构建在首次 `initFloatTextCanvas()` 时一次性完成

- [x] Task 2: Canvas2D 浮字对象池 (AC: 2)
  - [x] 2.1 新建 `src/src/ui/effects/FloatTextPool.ts`
  - [x] 2.2 创建 canvas 覆盖层（z-index:150），纯数据对象池（32 个 FloatInstance）
  - [x] 2.3 `spawnFloatText(text, color, scale)` — 从池获取、设置属性、标记活跃
  - [x] 2.4 池满时回收最老活跃实例
  - [x] 2.5 `updateAndDraw()` — rAF 驱动，仅在有活跃实例时运行

- [x] Task 3: 非飞行浮字动画 (AC: 3, 6)
  - [x] 3.1 8 阶阶梯下落 + 淡出
  - [x] 3.2 颜色通过离屏 tint canvas + source-atop 混合实现
  - [x] 3.3 spawn 时前 10% 生命周期 1.2x scale pop

- [x] Task 4: 飞行浮字动画 (AC: 4, 6)
  - [x] 4.1 贝塞尔曲线飞行，10 阶阶梯插值
  - [x] 4.2 停顿期 250ms → 4 阶弹出 → 飞行 → 到达回调
  - [x] 4.3 `onArrive` 回调触发 `RESOURCE_BUMP_FNS` 弹跳

- [x] Task 5: 集成 battle.ts (AC: 3, 4)
  - [x] 5.1 `createFloatText()` 重写为调用 `spawnFloatText()` / `spawnFlightText()`
  - [x] 5.2 `initFloatPool()` 替换为 `initFloatTextCanvas(container)`
  - [x] 5.3 动画由 FloatTextPool 内部 rAF 循环驱动，无需外部 update 调用
  - [x] 5.4 `clearFloatQueue()` 调用 `clearFloatTexts()`

- [x] Task 6: 清理旧 DOM 浮字代码 (AC: 7)
  - [x] 6.1 移除 `initFloatPool`、`acquireFloat`、`releaseFloat`、`quadBezier`、DOM 浮字创建逻辑
  - [x] 6.2 CSS `.float-text` 相关样式保留但不再被使用（后续 QA pass 清理）
  - [x] 6.3 构建通过（vite build 成功）

- [ ] Task 7: 性能验证 (AC: 5)
  - [ ] 7.1 快速打字场景（100+ WPM）无掉帧
  - [ ] 7.2 商店连续购买无卡顿
  - [ ] 7.3 多遗物同时触发时浮字流畅

## Dev Notes

### PixiJS BitmapFont API (v8)

```typescript
import { BitmapFont, BitmapText } from 'pixi.js';

// 初始化（一次性）
BitmapFont.from('PixelFloat', {
  fontFamily: 'Press Start 2P',
  fontSize: 16,
  fill: '#ffffff',
}, {
  chars: BitmapFont.ASCII,
  resolution: 1,
  padding: 1,
});

// 使用
const text = new BitmapText({ text: '+42', style: { fontFamily: 'PixelFloat', fontSize: 16 } });
text.tint = 0x4ecdc4;  // 颜色通过 tint，不重建纹理
```

注意：PixiJS v8 的 BitmapFont API 可能与 v7 有差异，实现时需查阅 v8.16.0 文档确认。

### 浮字层位置

当前 PixiJS 场景层级（见 `BattleScene.ts`）：
```
backgroundLayer → gameLayer → uiLayer → effectLayer
```
浮字应添加到 `effectLayer` 或新建专用 `floatTextLayer` 在 effectLayer 之上。

但注意：DOM 战斗系统（`battle.ts`）和 PixiJS 场景（`BattleScene.ts`）是**并行架构**。DOM 浮字的坐标系是 `#game-container` 的 CSS 像素，PixiJS 的坐标系是 canvas 内部坐标。需要确认两者对齐或做坐标转换。

### 坐标转换策略

- 非飞行浮字：位置用容器百分比计算（如 62% 高度），转换为 PixiJS canvas 坐标
- 飞行浮字：当前用 `getBoundingClientRect()` 获取 DOM 元素位置，需转换为 PixiJS 坐标
- 可能需要一个 `domToPixi(domX, domY)` 工具函数

### 性能对比预期

| 操作 | DOM (当前) | BitmapText (目标) |
|------|-----------|------------------|
| textContent 变化 | 0.3-1.5ms | 0.005ms |
| 位置更新 | 0.02ms | 0.002ms |
| 20 个同时浮字 | 6-30ms | 0.1ms |

### 不改什么

- 飞行轨迹逻辑（贝塞尔曲线参数、DWELL_TIME 等）不变
- `showFeedback` 的外部接口不变
- `drainQueue` 排队逻辑不变
- 资源飞行到达后的 bump 回调不变

### Project Structure Notes

| 文件 | 改动类型 |
|------|---------|
| `src/src/ui/effects/FloatTextPool.ts` | 新建 |
| `src/src/systems/battle.ts` | 修改 — showFeedback/createFloatText 改为调用池 |
| `src/src/style.css` | 删除 — .float-text 相关样式 |
| `src/src/main.ts` 或 `BattleScene.ts` | 修改 — BitmapFont 初始化 + 浮字层挂载 |

### References

- [Source: docs/project-context.md — PixiJS v8.16.0, 场景层级]
- [Source: src/src/scenes/battle/BattleScene.ts — effectLayer]
- [Source: src/src/systems/battle.ts — floatPool/createFloatText/showFeedback]
- [Source: src/src/style.css — .float-text CSS]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
