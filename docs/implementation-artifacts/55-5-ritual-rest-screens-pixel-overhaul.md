# Story 55.5: 仪式/休息界面像素风改造

Status: done

## Story

As a 玩家,
I want 仪式附魔界面、休息事件界面和金币奖励面板具有统一的像素风视觉,
so that 全游戏流程（战斗→金币奖励→商店→仪式→休息）视觉连贯。

## Acceptance Criteria

1. **AC1: 仪式屏背景** — `#ritual-screen` 背景改为紫色调固定渐变（保留粒子点缀但改 `steps()` 动画）
2. **AC2: 休息屏背景** — `#rest-screen` 背景改为暖绿/蓝色调固定渐变（同上）
3. **AC3: 标题去发光** — `.ritual-title` 和 `.rest-title` 去 `text-shadow`，字号改 CSS 变量
4. **AC4: 卡片/按钮像素化** — `.ritual-choice-btn`、`.ritual-skill-btn`、`.rest-option-btn` 去 `linear-gradient`/`box-shadow`/`translateY`，改颜色变化 + `steps()` 过渡
5. **AC5: 继续按钮像素化** — `.ritual-continue-btn`、`.rest-continue-btn` 去 `linear-gradient`，改实色 + `steps()`
6. **AC6: 金币奖励面板像素化** — `.gold-reward-panel` 去 `linear-gradient`/`box-shadow`；标题/值去 `text-shadow`；动画改 `steps()`
7. **AC7: 字号变量化** — 所有硬编码 `font-size` px 改 CSS 变量
8. **AC8: 入场动画阶梯化** — `ritualFadeIn`/`restFadeIn`/`goldPanelIn`/`goldRowIn`/`goldTotalIn` 改 `steps()`
9. **AC9: 无视觉回归** — 仪式/休息/金币奖励文字清晰可读、交互反馈清晰

## Tasks / Subtasks

- [x] Task 1: 仪式屏 #ritual-screen — 全部完成
  - [x] 1.1-1.25: 粒子→steps(4)、6处 fadeIn ease→steps(6)、title 去 text-shadow+font-size 变量、3处 linear-gradient→var(--bg-panel)、3处 hover box-shadow/translateY 移除、15+ font-size→CSS 变量、continue-btn 实色#ffe66d、enchantment-panel 去 gradient/box-shadow

- [x] Task 2: 休息屏 #rest-screen — 全部完成
  - [x] 2.1-2.15: 粒子→steps(4)、5处 fadeIn ease→steps(6)、title 去 text-shadow+font-size 变量、2处 linear-gradient→var(--bg-panel)、2处 hover box-shadow/translateY 移除、10+ font-size→CSS 变量、continue-btn 实色#ffe66d

- [x] Task 3: 金币奖励面板 — 全部完成
  - [x] 3.1-3.9: panel gradient→纯色#1a1a2e+去 box-shadow、title/treasure/total-value 去 text-shadow、8 font-size→CSS 变量、show cubic-bezier→steps(5)、4行 ease-out→steps(4)、total cubic-bezier→steps(5)、hide ease-out→steps(3)

- [x] Task 4: 回归验证
  - [x] 4.1-4.4: Vite build 成功；仪式紫/休息蓝背景保留主题色渐变；按钮/卡片颜色变化交互

## Dev Notes

### 设计规范

| 规则 | 值 |
|------|---|
| 字体 | `var(--font-pixel)` |
| 发光 | 禁止 `text-shadow` / `box-shadow` 发光 |
| 动画缓动 | `steps(N)` |
| 按钮 | 实色填充、hover 颜色变化 |
| 背景 | 主题色渐变可保留（仪式=紫、休息=蓝），区分不同界面 |

### CSS 位置

| 区域 | 行范围 |
|------|--------|
| 金币奖励 `#gold-reward` | L2237-2391 |
| 仪式 `#ritual-screen` | L2548-2815 |
| 休息 `#rest-screen` | L2820-2990 |

### 违规统计

**仪式屏:** 1 text-shadow、3 linear-gradient、3 box-shadow、6 ease/ease-in-out、15+ hardcoded font-size、3 translateY
**休息屏:** 1 text-shadow、2 linear-gradient、2 box-shadow、6 ease/ease-in-out、10+ hardcoded font-size、2 translateY
**金币奖励:** 3 text-shadow、1 linear-gradient、1 box-shadow、6 ease-out/cubic-bezier、8 hardcoded font-size

### 背景色调策略

Epic 55 规定不同界面有不同背景色调：
- 战斗：随机 8 色 HSL
- 商店：随机 8 色 HSL
- Gameover：暗红 hsl(340-355)
- **仪式：紫色调 — 保留现有 `#0f0f23`→`#1a1a2e` 渐变**
- **休息：暖蓝调 — 保留现有 `#0a1628`→`#0f2037` 渐变**

### References

- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-5 改造清单]
- [Source: src/src/style.css:2237-2391 — 金币奖励面板]
- [Source: src/src/style.css:2548-2815 — 仪式屏]
- [Source: src/src/style.css:2820-2990 — 休息屏]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无——纯 CSS 改造

### Completion Notes List

- 仪式屏: 去 text-shadow、3 gradient→var(--bg-panel)、3 box-shadow 移除、6 ease→steps()、15+ font-size 变量化、continue-btn 实色、enchantment-panel 去 gradient/box-shadow
- 休息屏: 去 text-shadow、2 gradient→var(--bg-panel)、2 box-shadow 移除、5 ease→steps()、10+ font-size 变量化、continue-btn 实色
- 金币奖励: gradient→纯色、3 text-shadow 移除、6 cubic-bezier/ease→steps()、8 font-size 变量化
- 仪式/休息主题色渐变背景保留（紫/蓝为界面区分功能）
- Vite build 成功

### Change Log

- 2026-04-05: Story 55.5 仪式/休息界面+金币奖励像素风改造完成

### File List

- `src/src/style.css` — 仪式/休息/金币奖励 CSS 像素化
