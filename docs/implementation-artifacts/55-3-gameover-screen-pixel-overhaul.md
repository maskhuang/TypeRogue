# Story 55.3: 游戏结束界面像素风改造

Status: done

## Story

As a 玩家,
I want 游戏结束界面与战斗/商店界面具有一致的像素风视觉语言,
so that 整个游戏体验连贯统一，死亡屏幕也有复古像素感。

## Acceptance Criteria

1. **AC1: 背景暗红色调** — `#gameover-screen` 背景从 `rgba(0,0,0,0.95)` 改为暗红色调渐变（区别于战斗/商店的随机色），可复用 `randomizeScreenBackground()` 但限定红色系调色板，或固定暗红渐变
2. **AC2: 标题像素化** — `#gameover-title` 去 `text-shadow` 发光、字号改用 CSS 变量、阶梯入场动画（`steps()` 的 fadeIn 或 slideDown）
3. **AC3: 统计面板像素化** — `#gameover-stats` 字号改 CSS 变量、确认像素字体生效
4. **AC4: 排行榜像素化** — `.lb-title`/`.lb-table`/`.lb-detail td` 字号改 CSS 变量、确认直角+像素字体
5. **AC5: 按钮像素化** — `.restart-btn` 改实色填充（非 transparent）、hover 改颜色变化、`transition` 改 `steps()`；`.daily-btn` 同理
6. **AC6: 无视觉回归** — 排行榜数字清晰可读、按钮交互反馈清晰

## Tasks / Subtasks

- [x] Task 1: 背景改造 (AC: 1)
  - [x] 1.1 方案 A: 固定暗红双层渐变 `radial-gradient(ellipse at 50% 40%, hsl(350,20%,18%)...) + linear-gradient(180deg, hsl(340,18%,12%), hsl(355,20%,16%))`
  - [x] 1.2 CRT 效果层在 `#game-container::after`，覆盖所有屏幕

- [x] Task 2: 标题像素化 (AC: 2)
  - [x] 2.1 移除 `text-shadow: 0 0 30px rgba(255,107,107,0.5)`
  - [x] 2.2 `font-size: 48px` → `calc(var(--text-title-size) * 2)` = 24px
  - [x] 2.3 新增 `@keyframes gameoverTitleIn` — opacity+translateY 入场 `steps(6)`

- [x] Task 3: 统计面板像素化 (AC: 3)
  - [x] 3.1 `#gameover-stats` → `var(--text-body-size)`
  - [x] 3.2 像素字体从全局 `body` font-family 继承，已确认

- [x] Task 4: 排行榜像素化 (AC: 4)
  - [x] 4.1 `.lb-title` → `var(--text-subtitle-size)`
  - [x] 4.2 `.lb-table` → `var(--text-body-size)`
  - [x] 4.3 `.lb-detail td` → `var(--text-caption-size)`

- [x] Task 5: 按钮像素化 (AC: 5)
  - [x] 5.1 `.restart-btn` → `var(--bg-panel)` 实色背景
  - [x] 5.2 hover 保留实色 `#4ecdc4/#ffe66d`（符合规范）
  - [x] 5.3 `transition: all 0.2s` → `background/color 0.15s steps(3)`
  - [x] 5.4 `.daily-btn:hover` 确认实色 `#ffe66d`

- [x] Task 6: PixiJS 遗留场景清理 (可选)
  - [x] 6.1 确认 `GameOverScene.ts` 未被实例化——仅 `scenes/index.ts` 和 `scenes/gameover/index.ts` 导出，无 `new GameOverScene` 调用
  - [x] 6.2 标注为 legacy，留给后续清理

- [x] Task 7: 回归验证 (AC: 6)
  - [x] 7.1 排行榜字号 body/caption 级别，数字清晰
  - [x] 7.2 按钮 hover 实色填充 + steps(3) 过渡，交互清晰
  - [x] 7.3 标题 `calc(12px*2)=24px` + `#ff6b6b` 红色，仍醒目
  - [x] 7.4 暗红渐变 hsl(340-355) 与战斗/商店随机色有明显区分；Vite build 成功

## Dev Notes

### 设计规范（来自 Epic 55）

| 规则 | 值 |
|------|---|
| 字体 | `var(--font-pixel)` = `'Press Start 2P', 'Courier New', monospace` |
| 圆角 | 一律 `border-radius: 0` |
| 发光 | 禁止 `text-shadow` 和 `box-shadow` 发光 |
| 动画缓动 | `steps(N)` 替代 `ease` / `cubic-bezier` |
| 边框 | 实线 2px |
| 按钮 | 直角、实色填充、hover 颜色变化 |

### 55-2 前序经验

- `randomizeScreenBackground(el)` 已从 `battle.ts` 导出，可复用
- 但 Epic 55 规定 gameover 背景为**暗红色调**，需区别于随机色
- 建议固定暗红渐变而非随机，强化"死亡感"

### 游戏结束界面架构

- **活跃渲染层**: DOM（`#gameover-screen` 在 `index.html:178-186`）
- **遗留 PixiJS 场景**: `scenes/gameover/GameOverScene.ts` — 仅导出未实例化，实际不使用
- **显示方式**: `showScreen('gameover')` 切换 `display: flex/none`
- **排行榜渲染**: `ui/leaderboardDisplay.ts` 动态生成 HTML（`.lb-table`、`.lb-victory`/`.lb-defeat`、`.lb-latest`）

### CSS 违规汇总

| 选择器 | 行号 | 违规 | 修复 |
|--------|------|------|------|
| `#gameover-title` | L1134 | `text-shadow: 0 0 30px ...` + `font-size: 48px` | 去发光 + CSS 变量 |
| `#gameover-stats` | L1135 | `font-size: 14px` | → `var(--text-body-size)` |
| `.restart-btn` | L1136 | `background: transparent` + `transition: all 0.2s` + `font-size: 14px` | 实色 + steps() + CSS 变量 |
| `.lb-title` | L1143 | `font-size: 16px` | → `var(--text-subtitle-size)` |
| `.lb-table` | L1144 | `font-size: 13px` | → `var(--text-body-size)` |
| `.lb-detail td` | L1152 | `font-size: 11px` | → `var(--text-caption-size)` |

### 不改什么

- PixiJS GameOverScene.ts（遗留，不活跃，留给后续清理）
- 弹窗样式（留给 55-4）
- 排行榜交替行色（`rgba(255,255,255,0.02)` 是功能性的，保留）
- `.lb-latest` 高亮样式（`rgba(78,205,196,0.1)` 是功能性的，保留）

### Project Structure Notes

- CSS: `src/src/style.css` L1132-1154（gameover 区段）
- HTML: `src/index.html` L178-186（DOM 结构）
- 排行榜 JS: `src/src/ui/leaderboardDisplay.ts`
- PixiJS 遗留: `src/src/scenes/gameover/GameOverScene.ts`（未使用）

### References

- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-3 改造清单]
- [Source: docs/implementation-artifacts/55-2-shop-screen-pixel-overhaul.md — 前序 Story 经验]
- [Source: src/src/style.css:1132-1154 — gameover CSS]
- [Source: src/index.html:178-186 — gameover HTML]
- [Source: src/src/scenes/gameover/GameOverScene.ts — PixiJS 遗留场景]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无——纯 CSS 改造

### Completion Notes List

- `#gameover-screen` 背景: `rgba(0,0,0,0.95)` → 暗红双层渐变（径向高光 hsl(350) + 线性 hsl(340→355)）
- `#gameover-title`: 去 text-shadow、48px → calc(var(--text-title-size)*2)、新增 gameoverTitleIn 阶梯入场动画
- `#gameover-stats`/`.restart-btn` font-size → CSS 变量
- `.lb-title`/`.lb-table`/`.lb-detail td` font-size → CSS 变量
- `.restart-btn` background transparent → var(--bg-panel)、transition → steps(3)
- PixiJS GameOverScene.ts 确认未使用，标注 legacy
- Vite build 成功

### Change Log

- 2026-04-05: Story 55.3 游戏结束界面像素风改造完成
- 2026-04-05: Code Review 修复 — H1: battle.ts inline font-size 移除; M1: 按钮字号 body→subtitle

### File List

- `src/src/style.css` — gameover 区段 CSS 像素化
- `src/src/systems/battle.ts` — 胜利提示 inline font-size 移除
