# Story 56.3b: 教程提示 UI 系统

Status: done

## Story

As a 教程中的新手玩家,
I want 看到清晰的底部提示框引导我下一步操作,
so that 我知道该做什么而不会迷失。

## Context: 已有系统

已有 `TutorialOverlay`（Story 39.3）是**锚定浮窗**风格的引导 UI，用于正式游戏中的上下文提示。功能完整（箭头+遮罩+定位+按键关闭）。

教程模式需要**底部固定提示框** — 不锚定任何元素，固定在屏幕下方 20%，配合打字机效果逐字显示文案。这与现有浮窗互补。

**方案：** 新建 `TutorialPrompt` 组件（底部固定提示），复用 `TutorialOverlay` 做指向性引导。

## Acceptance Criteria

1. **AC1: 底部提示框** — 屏幕底部固定区域，半透明黑底、像素字体、直角
2. **AC2: 打字机效果** — 文字逐字出现（JS setInterval，每 30ms 一字符）
3. **AC3: 继续操作** — 文字显示完后，提示"按任意键继续"或"点击继续"
4. **AC4: 指示箭头** — 可选参数指定目标元素，显示像素风闪烁箭头
5. **AC5: 高亮遮罩** — 可选参数指定高亮区域（clip-path 镂空）
6. **AC6: Promise API** — `showPrompt(text, options)` 返回 Promise，resolve 时提示已关闭
7. **AC7: 像素风** — 延续 Epic 55 规范

## Tasks / Subtasks

- [x] Task 1: TutorialPrompt — showPrompt(key, opts) Promise API + 打字机 30ms/字 + 按键/点击关闭 + dismissPrompt()
- [x] Task 2: 指示箭头 — options.arrow 定位到目标元素 + steps(2) 闪烁
- [x] Task 3: 高亮遮罩 — clip-path polygon 镂空
- [x] Task 4: CSS — .tutorial-prompt 底部固定 + cursor blink + arrow bounce + mask
- [x] Task 5: Vite build 成功

## Dev Notes

### API 设计

```typescript
// 简单用法
await showPrompt('tutorial.phase1.intro')

// 带箭头
await showPrompt('tutorial.phase4.hint', {
  arrow: { target: 'key-slot-f', position: 'top' }
})

// 带高亮
await showPrompt('tutorial.phase5.intro', {
  highlight: 'reward-cards'
})

// 强制关闭
dismissPrompt()
```

### 已有可复用

- `.tutorial-overlay-arrow` CSS（箭头三角）
- `.tutorial-overlay-mask` CSS（遮罩层）
- `tutorial-hint-pulse` 动画（闪烁）
- `tutorial-fade-in` 动画（入场）

### 新建文件

| 文件 | 作用 |
|------|------|
| `src/src/ui/tutorial/TutorialPrompt.ts` | 底部提示框组件 |

### CSS 新增（在 style.css 末尾）

```css
.tutorial-prompt { position: fixed; bottom: 0; left: 0; right: 0; ... }
.tutorial-prompt-text { ... }
.tutorial-prompt-continue { animation: tutorial-hint-pulse ... }
```

### References

- [Source: src/src/systems/tutorial/TutorialOverlay.ts — 已有浮窗]
- [Source: src/src/style.css:4432-4540 — 已有 CSS]
- [Source: docs/implementation-artifacts/56-2-tutorial-stage-design.md — UI 规范]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- 新建 TutorialPrompt.ts: showPrompt/dismissPrompt Promise API
- 打字机效果: setInterval 30ms/字 + ▌光标闪烁
- 箭头: 4 方向定位 + steps(2) 闪烁
- 遮罩: clip-path polygon 镂空
- CSS: .tutorial-prompt 底部固定 + cursor/continue/arrow/mask 样式

### Change Log

- 2026-04-07: Story 56-3b 教程提示 UI 完成

### File List

- `src/src/ui/tutorial/TutorialPrompt.ts` (新建)
- `src/src/style.css`
