# Story 55.6: 全局 UI 元素像素风改造

Status: done

## Story

As a 玩家,
I want 跨界面的公共 UI 元素（语言按钮、解锁通知、伪无限视觉、滚动条、评级徽章等）具有统一像素风,
so that 无论在哪个界面都不会看到旧风格的 UI 残留。

## Scope Clarification

**本 Story 范围：跨界面公共 UI 组件的视觉统一。**

**不改的（留给视觉 QA 55-8 或属于战斗手感范畴）：**
- 战斗 juice 动画（juiceUp/comboBump/scoreBump 等）— 这些 `cubic-bezier` 弹跳是**游戏手感核心**，改 `steps()` 会严重破坏打击感
- 战斗 HUD 字号（score-display 36px、word-display 40px 等）— 战斗界面已有像素风，字号是经过调试的
- 粒子/震屏/闪光特效 — 这些是**瞬时反馈**，`ease-out` 比 `steps()` 更合适
- CRT 效果 — 已合规
- Taiko 节奏系统 — 专属战斗机制

## Acceptance Criteria

1. **AC1: 语言按钮** — `.lang-btn` transition 改 `steps(3)`；`font-size:11px` → CSS 变量
2. **AC2: 伪无限模式** — `.pseudo-infinite` 去 `box-shadow` 发光 → 纯色 border 闪烁 `steps()`
3. **AC3: 评级徽章/评分** — `.rating-badge`/`.rating-grade` 去 `text-shadow` 发光；字号 CSS 变量化；动画 `cubic-bezier` → `steps()`
4. **AC4: 关卡/Act 过渡** — `.level-announce`/`.act-title`/`.act-subtitle` 去 `text-shadow`；字号 CSS 变量化；transition `ease` → `steps()`
5. **AC5: Boss/精英 公告** — `.boss-intro-title`/`.elite-hint` 去 `text-shadow`；字号变量化；动画 → `steps()`
6. **AC6: 结算面板** — `.settlement-*` 字号 CSS 变量化
7. **AC7: 热力图** — `.heatmap-key`/`.heatmap-tooltip` 去 `box-shadow`/`text-shadow`/`scale`；字号变量化
8. **AC8: 形状预览** — `.shape-preview-valid/invalid` 去 `box-shadow` → border 变化；动画 → `steps()`
9. **AC9: 分数颜色系统** — `.score-silver/gold/rainbow/legendary` 去 `text-shadow`；rainbow 去 `linear-gradient`
10. **AC10: 滚动条** — 确认像素风窄条
11. **AC11: 无视觉回归** — 公共 UI 可读性和交互反馈清晰

## Tasks / Subtasks

- [x] Task 1: 语言按钮 — font-size→var, transition→steps(3)
- [x] Task 2: 伪无限+危险+达标 — box-shadow→border闪烁 + steps(4)
- [x] Task 3: 评级系统 — badge/grade 去 text-shadow、font-size→CSS变量、cubic-bezier→steps(5)、stats-summary→var
- [x] Task 4: 关卡/Act过渡 — level-announce/act-title/act-subtitle 去 text-shadow、font-size→calc(var*N)、transition→steps(4)、overflow 去 text-shadow→steps(6)
- [x] Task 5: Boss/精英 — elite/boss-hint font-size→var、boss-intro-title 去 text-shadow→steps(6)、mod-item→steps(4)、elite-announcement 去 gradient/text-shadow→steps(4)
- [x] Task 6: 结算面板 — 4个 font-size→CSS变量
- [x] Task 7: 热力图 — heatmap-key 去 scale→border变化、hm-letter 去 text-shadow、heatmap-tooltip 去 box-shadow、5个 font-size→CSS变量
- [x] Task 8: 形状预览 — valid/invalid 去 box-shadow、displaced→steps(4)、rotating/shake→steps()
- [x] Task 9: 分数颜色 — silver/gold 去 text-shadow、rainbow 改纯色、legendary 去 text-shadow→steps(4)
- [x] Task 10: 其他全局 — relic-pulse 去 box-shadow→steps(4)、flash-line 去 gradient→steps(3)、stage-info-pulse→steps(4)、morph-pulse 去 box-shadow→border+steps(4)
- [x] Task 11: 回归验证 — Vite build 成功

## Dev Notes

### 范围边界

**改（跨界面公共 UI）：** 语言按钮、伪无限视觉、评级徽章、关卡过渡、Boss/精英公告、结算面板、热力图、形状预览、分数颜色、遗物脉冲/闪光、滚动条
**不改（战斗手感核心）：** juice 弹跳动画、HUD 战斗字号、粒子/震屏/闪光、Taiko 节奏、CRT 效果

### 违规统计（本 Story 范围内）

- text-shadow: ~15 处
- box-shadow: ~8 处
- linear-gradient: ~3 处
- ease/cubic-bezier: ~15 处
- hardcoded font-size: ~20 处
- scale transform: 1 处

### References

- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-6]
- [Source: src/src/style.css — 全文散布]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无——纯 CSS 改造

### Completion Notes List

- 伪无限/危险/达标: inset box-shadow→border闪烁+steps(4)
- 分数颜色: silver/gold/legendary 去 text-shadow；rainbow gradient→纯色
- 关卡/Act: level-announce/act-title/subtitle 去 text-shadow、font-size→calc、transition→steps
- Boss/精英: boss-intro-title/mod-item 去 text-shadow→steps；elite-announcement 去 gradient/text-shadow
- 结算: 4个 font-size→CSS变量
- 评级: badge/grade text-shadow 全移除、font-size→CSS变量、cubic-bezier→steps
- 热力图: 去 scale/text-shadow/box-shadow、5个 font-size→CSS变量
- 形状预览: 去 box-shadow、3处 ease→steps
- 遗物脉冲/闪光: 去 box-shadow/gradient、ease→steps
- morph-pulse: box-shadow→border、ease→steps
- Vite build 成功

### Change Log

- 2026-04-05: Story 55.6 全局 UI 像素风改造完成

### File List

- `src/src/style.css` — 全局 UI 元素像素化（~60 处修改）
