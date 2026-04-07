# Story 55.8: 视觉 QA — 全界面一致性检查

Status: done

## Story

As a 玩家,
I want 全游戏没有视觉风格残留,
so that 像素风改造彻底统一。

## Scope Categorization

QA 扫描发现 72 处残留违规，分类如下：

**不改（战斗手感核心 — 55-6 已决定保留）：**
- juice 弹跳动画（juiceUp/comboBump/scoreBump 等 10 处 cubic-bezier）— 打击感核心
- 粒子/震屏/闪光（particle/shake/flash 3 处 ease-out）— 瞬时反馈
- 浮字动画（floatDown 2 处 ease-out）— 战斗反馈
- Taiko 节奏系统（3 处 ease-out）— 专属战斗机制
- CRT 扫描线 repeating-linear-gradient — 全局效果层
- gameover 暗红渐变 — 55-3 已决定的主题色

**不改（战斗 HUD 字号 — 经过调试的数值）：**
- 战斗 HUD：score 40px、combo 26px、word 40px、multiplier 24px 等 — 这些是游戏核心数字，需要大字号保证可读性

**要改（QA 范围内的残留）：**
- 非战斗 UI 的 linear-gradient（craft 按钮、demo 按钮）
- 非战斗 UI 的 ease transition（settlement-live、tab-hint、rating-reveal、demo）
- 结算/造词面板硬编码 font-size
- `.letter.charging` 进度条渐变

## Acceptance Criteria

1. **AC1: 非战斗 gradient 清理** — craft-confirm-btn、demo 按钮去 linear-gradient
2. **AC2: 非战斗 ease 清理** — settlement-live、tab-hint、cancel-hint、rating-reveal、modifier-flash、demo/tutorial 动画改 steps()
3. **AC3: 造词/结算 font-size** — craft-title、craft-header、settlement 子元素字号变量化
4. **AC4: 充电进度条** — `.letter.charging::before` 去 linear-gradient
5. **AC5: 无功能回归** — 游戏正常运行

## Tasks / Subtasks

- [x] Task 1: 非战斗 gradient 清理
  - [x] 1.1 craft-confirm-btn → 实色 #4ecdc4
  - [x] 1.2 demo-start-btn → 实色 #4ecdc4; demo-steam-btn → 实色 #1b2838
  - [x] 1.3 demo h1 gradient → 纯色 #ffe66d
  - [x] 1.4 .letter.charging::before → 纯色 #3498db + 去 box-shadow

- [x] Task 2: 非战斗 ease 清理
  - [x] 2.1 settlement-live → steps(3)
  - [x] 2.2 tab-hint → steps(4)
  - [x] 2.3 cancel-hint → steps(3)
  - [x] 2.4 rating-reveal → steps(3)
  - [x] 2.5 modifier-flash → steps(4)
  - [x] 2.6 demo-tip/tutorial-fade-in → steps(3); tutorial-hint-pulse → steps(4)
  - [x] 2.7 accel-pulse → steps(3)

- [x] Task 3: font-size 变量化
  - [x] 3.1 craft-confirm-btn → var(--text-body-size)
  - [x] 3.2 demo-lang-btn 13px → var(--text-body-size) + font-family: inherit
  - [x] 3.3 demo-start-content h1 → calc(var(--text-title-size)*2)
  - [x] 3.4 demo-start-btn → var(--text-subtitle-size)

- [x] Task 4: 回归验证 — Vite build 成功

## Dev Notes

### 残留分类（最终决策）

| 类别 | 数量 | 决策 | 理由 |
|------|------|------|------|
| Juice cubic-bezier | 10 | **保留** | 打击感核心 |
| 粒子/震屏/闪光 | 3 | **保留** | 瞬时反馈 |
| 浮字动画 | 2 | **保留** | 战斗反馈 |
| Taiko 节奏 | 3 | **保留** | 战斗机制 |
| 战斗 HUD 字号 | ~20 | **保留** | 经过调试 |
| 非战斗 gradient | 5 | **修复** | UI 残留 |
| 非战斗 ease | 8 | **修复** | UI 残留 |
| 造词/demo 字号 | 5 | **修复** | UI 残留 |
| CRT/gameover 渐变 | 2 | **保留** | 功能性 |

### References

- [Source: src/src/style.css — 全文扫描]
- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-8]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- 5 处 linear-gradient → 纯色（craft-btn、demo-start-btn、demo-steam-btn、demo-h1、charging）
- 1 处 box-shadow 移除（charging::before）
- 10 处 ease/ease-out/ease-in-out → steps()
- 4 处 font-size/font-family 变量化
- Vite build 成功
- 战斗 juice/粒子/震屏/HUD 字号 intentionally 保留

### Change Log

- 2026-04-05: Story 55.8 视觉 QA 收尾完成 — Epic 55 全部 done

### File List

- `src/src/style.css`
