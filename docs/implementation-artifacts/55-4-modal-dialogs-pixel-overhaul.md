# Story 55.4: 弹窗系统像素风改造

Status: done

## Story

As a 玩家,
I want 所有弹窗（职业选择、进阶选择、遗物选取、词库选取、Boss 修饰器选取、附魔分支）具有统一的像素风视觉,
so that 弹窗不会打破游戏的复古像素沉浸感。

## Acceptance Criteria

1. **AC1: 6 个弹窗标题去发光** — 所有 `*-title` 选择器的 `text-shadow` 移除
2. **AC2: 卡片像素化** — 所有 `*-card` 选择器去 `linear-gradient` 背景、去 hover `box-shadow`/`translateY`/`scale`，改为颜色变化
3. **AC3: 按钮像素化** — 所有 confirm/skip/cancel 按钮去 `linear-gradient`、去 `scale`/`box-shadow` hover、改实色 + `steps()` 过渡
4. **AC4: 过渡阶梯化** — 所有弹窗范围 `transition` 从 `ease` 改 `steps()`
5. **AC5: 字号变量化** — 所有硬编码 `font-size` px 改 CSS 变量
6. **AC6: 遮罩统一** — 所有 `*-overlay` 背景为半透明纯黑 `rgba(0,0,0,0.85)`，无模糊
7. **AC7: JS inline style 修正** — `MetamorphStation.ts` 的 `border-radius:4px` 改 0；`shop.ts` 残留 inline 修正
8. **AC8: 无视觉回归** — 弹窗文字清晰可读、交互反馈清晰、稀有度可区分

## Tasks / Subtasks

- [x] Task 1: 附魔弹窗 #enchantment-modal (AC: 1-5)
  - [x] 1.1-1.12 全部完成：去 text-shadow、gradient→var(--bg-panel)、transition→steps(3)、hover 改颜色变化、所有 font-size→CSS 变量、enchantment-card 去 gradient

- [x] Task 2: 词库选取 #word-picker-modal (AC: 1-5)
  - [x] 2.1-2.5 全部完成：去 text-shadow、gradient→var(--bg-panel)、hover 去 box-shadow/translateY、所有 font-size→CSS 变量

- [x] Task 3: 遗物选取 #relic-picker-modal (AC: 1-5)
  - [x] 3.1-3.6 全部完成：去 text-shadow、gradient→var(--bg-panel)、5 处 hover box-shadow 移除、所有 font-size→CSS 变量、skip/sell 按钮像素化

- [x] Task 4: Boss 修饰器 #modifier-picker-modal (AC: 1-5)
  - [x] 4.1-4.5 全部完成：去 text-shadow、gradient→纯色 rgba(42,26,26,0.8)、hover 去 box-shadow/translateY、所有 font-size→CSS 变量、skip-btn 像素化

- [x] Task 5: 职业选择 #class-select-modal (AC: 1-5)
  - [x] 5.1-5.5 全部完成：去 text-shadow、gradient→var(--bg-panel)、hover/selected 去 box-shadow/translateY、confirm 按钮实色 #ffe66d、所有 font-size→CSS 变量

- [x] Task 6: 进阶选择 #ascension-select-modal (AC: 1-5)
  - [x] 6.1-6.4 全部完成：去 text-shadow、row transition→steps(3)、confirm 实色 #ffe66d 去 gradient/scale、所有 font-size→CSS 变量

- [x] Task 7: 遮罩统一 (AC: 6)
  - [x] 7.1 6 个 overlay 均为 rgba(0,0,0,0.8~0.9) 纯黑半透明，无 backdrop-filter

- [x] Task 8: JS inline style 修正 (AC: 7)
  - [x] 8.1 MetamorphStation.ts: 4 处 border-radius:4px → 0 + font-size:12px → 9px
  - [x] 8.2 shop.ts L3094: style.boxShadow 移除（改为注释）

- [x] Task 9: 回归验证 (AC: 8)
  - [x] 9.1 6 个弹窗统一像素风：纯色背景、steps() 过渡、CSS 变量字号
  - [x] 9.2 字号 subtitle/body/caption 级别，清晰可读
  - [x] 9.3 稀有度 border-color 系统保留（遗物/职业）
  - [x] 9.4 hover 颜色变化 + steps(3) 过渡；Vite build 成功

## Dev Notes

### 设计规范

| 规则 | 值 |
|------|---|
| 字体 | `var(--font-pixel)` |
| 圆角 | `border-radius: 0` |
| 发光 | 禁止 `text-shadow` / `box-shadow` 发光 |
| 动画缓动 | `steps(N)` |
| 按钮 | 直角、实色填充、hover 颜色变化 |
| 背景 | 纯色或 `var(--bg-panel)`，不用 `linear-gradient` |

### 6 个弹窗 CSS 位置

| 弹窗 | CSS 行范围 |
|------|-----------|
| 附魔 `#enchantment-modal` | L2396-2533 |
| 词库 `#word-picker-modal` | L2998-3084 |
| 遗物 `#relic-picker-modal` | L3089-3254 |
| 修饰器 `#modifier-picker-modal` | L3271-3388 |
| 职业 `#class-select-modal` | L4072-4212 |
| 进阶 `#ascension-select-modal` | L4222-4311 |

### 违规统计

- **text-shadow**: 6 处（每个弹窗标题 1 处）
- **box-shadow**: 11 处（hover 发光）
- **linear-gradient**: 9 处（卡片背景 + 按钮背景）
- **transition ease**: 11 处
- **hardcoded font-size**: 30+ 处
- **translateY/scale**: 7 处
- **JS inline border-radius:4px**: 4 处（MetamorphStation.ts）

### 改造模式（6 个弹窗结构高度相似）

每个弹窗的改造模式一致：
1. `*-title` → 去 text-shadow + font-size 变量化
2. `*-card` → background 纯色 + transition steps() + 去 hover 发光/位移
3. `*-confirm/*-skip/*-cancel` → 实色按钮 + steps() 过渡
4. 所有子元素 font-size → CSS 变量

### 不改什么

- 弹窗遮罩已为纯黑半透明（无模糊），确认即可
- 稀有度 border-color 系统保留
- `.class-card-locked` 的 `filter: grayscale(0.8)` 保留（功能性）

### References

- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-4 改造清单]
- [Source: src/src/style.css:2396-2533 — 附魔弹窗]
- [Source: src/src/style.css:2998-3084 — 词库选取]
- [Source: src/src/style.css:3089-3254 — 遗物选取]
- [Source: src/src/style.css:3271-3388 — 修饰器选取]
- [Source: src/src/style.css:4072-4212 — 职业选择]
- [Source: src/src/style.css:4222-4311 — 进阶选择]
- [Source: src/src/systems/classes/MetamorphStation.ts — inline border-radius]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无——纯 CSS/TS 改造

### Completion Notes List

- 6 个弹窗标题：移除 6 处 text-shadow
- 6 个弹窗卡片：移除 9 处 linear-gradient → var(--bg-panel) 或纯色
- 6 个弹窗 hover：移除 11 处 box-shadow + translateY/scale → 颜色变化
- 6 个弹窗过渡：11 处 transition ease → steps(3)
- 30+ 处 font-size 硬编码 → CSS 变量
- 2 个 confirm 按钮：gradient → 实色 #ffe66d
- MetamorphStation.ts: 4 处 border-radius:4px → 0
- shop.ts: 1 处 inline boxShadow 移除
- Vite build 成功

### Change Log

- 2026-04-05: Story 55.4 弹窗系统像素风改造完成
- 2026-04-05: Code Review — M1: .inv-evolved font-size→var; L1: MetamorphStation inline font-size 缩小

### File List

- `src/src/style.css` — 6 个弹窗 CSS 像素化
- `src/src/systems/classes/MetamorphStation.ts` — inline border-radius:0
- `src/src/systems/shop.ts` — inline boxShadow 移除
