# Story 55.2: 商店界面像素风改造

Status: done

## Story

As a 玩家,
I want 商店界面与战斗界面具有一致的像素风视觉语言,
so that 整个游戏体验连贯统一，不会因界面切换而产生视觉割裂。

## Acceptance Criteria

1. **AC1: 商店背景像素化** — `#shop-screen` 背景改为随机双色渐变（复用战斗背景逻辑），去掉固定 `linear-gradient(180deg, #12121a, #1a1a2e)`
2. **AC2: 商品卡片像素化** — `.reward-card` 去渐变背景（改纯色 `#1a1a2e` 或 `var(--bg-panel)`）、去 3D hover 效果（`rotateX/rotateY/perspective`）、hover 改为颜色变化而非 scale+shadow、去所有 `box-shadow` 发光
3. **AC3: 稀有度边框去发光** — `.relic-card-rare/epic/legendary`、`.risk-reward-card`、`.library-card.active` 的 `box-shadow` 发光全部移除，仅保留 `border-color` 区分稀有度
4. **AC4: 键盘可视化直角化** — `.key-slot` 确保直角、去残留圆角（55-1 已做全局 border-radius 清零，验证即可）
5. **AC5: 面板统一** — 技能库存面板、词库面板、统计面板、蜕变站/工坊面板 → 直角、像素字体（确认 55-1 全局字体已生效）、去渐变背景
6. **AC6: 按钮像素化** — `#start-battle-btn` 去渐变背景（改实色 `#4ecdc4`）、去 hover `box-shadow`、hover 改颜色变化；`.shop-refresh-btn` hover 去 `scale`；`.lock-toggle.locked` 去 `drop-shadow` 发光
7. **AC7: 动画阶梯化** — 所有商店范围内的 `transition` 从 `ease`/`cubic-bezier` 改为 `steps()` 阶梯缓动；`@keyframes` 动画同理
8. **AC8: 字号适配** — 商店内硬编码的 `font-size` px 值（`#shop-title: 24px`、`.gold-display: 16px`、`.reward-name: 13px`、`.reward-cost: 13px`、`#shop-stats: 13px`、`.shop-empty: 14px` 等）全部改用 CSS 变量或缩放至 Press Start 2P 适配值
9. **AC9: 无视觉回归** — 商品信息完整可读、稀有度可区分、交互反馈清晰

## Tasks / Subtasks

- [x] Task 1: 商店背景改造 (AC: 1)
  - [x] 1.1 在 `shop.ts` 的 `openShop()` 中调用 `randomizeScreenBackground(shopEl)` 复用战斗背景逻辑
  - [x] 1.2 CSS `#shop-screen` 的 `background` 改为纯色 `#1a1a2e`（JS 动态覆盖）
  - [x] 1.3 CRT 效果层在 `#game-container::after` 上，覆盖所有屏幕

- [x] Task 2: 商品卡片像素化 (AC: 2, 3)
  - [x] 2.1 `.reward-card` — `background` 改为 `var(--bg-panel)`
  - [x] 2.2 `.reward-card` — 移除 `transform-style: preserve-3d` 和 `perspective: 500px`
  - [x] 2.3 `.reward-card:hover` — 改为 `border-color` + `var(--bg-panel-hover)`
  - [x] 2.4 `.reward-card:active` — 改为 `background: rgba(0,0,0,0.4)`
  - [x] 2.5 `.reward-card.risk-reward-card` — 移除 `box-shadow`
  - [x] 2.6 `.reward-card.library-card.active` — 移除 `box-shadow`
  - [x] 2.7 `.reward-card.relic-card-rare/epic/legendary` — 移除所有 `box-shadow`

- [x] Task 3: 词库/牌组卡片像素化 (AC: 5)
  - [x] 3.1 `.word-card` — 改为 `var(--bg-panel)`
  - [x] 3.2 `.word-card:hover` — 改为 `var(--bg-panel-hover)` + border 变化
  - [x] 3.3 `.word-card.buyable:hover` — 移除 `box-shadow`
  - [x] 3.4 `.word-card.recommended` — 改为纯色 `rgba(42,37,32,0.8)`

- [x] Task 4: 按钮像素化 (AC: 6)
  - [x] 4.1 `#start-battle-btn` — 实色 `#4ecdc4` + `2px solid` 边框
  - [x] 4.2 `#start-battle-btn:hover` — `background: #5fd8d0`
  - [x] 4.3 `.shop-refresh-btn:hover` — 去 `scale`，保留背景变化
  - [x] 4.4 `.lock-toggle.locked` — 去 `drop-shadow`
  - [x] 4.5 `.lock-toggle:hover` — 去 `scale(1.2)`，改为 opacity 过渡

- [x] Task 5: 动画/过渡阶梯化 (AC: 7)
  - [x] 5.1 `.reward-card` → `border-color 0.15s steps(3), background 0.15s steps(3)`
  - [x] 5.2 `.shop-tab` → `border-color/color/background 0.15s steps(3)`
  - [x] 5.3 `.shop-refresh-btn` → `background 0.15s steps(3)`
  - [x] 5.4 `.lock-toggle` → `opacity 0.15s steps(3)`
  - [x] 5.5 `.word-card` → `border-color/background 0.15s steps(3)`
  - [x] 5.6 `#start-battle-btn` → `background 0.15s steps(3)`
  - [x] 5.7 `cardFloat` → `steps(6)`; `purchasePop` → `steps(5)`; `enchantPulse/selectedPulse/skillSlotFloat/voidPulse/freqDropPulse` → `steps(4)`

- [x] Task 6: 字号适配 (AC: 8)
  - [x] 6.1 `#shop-title` → `var(--text-title-size)`
  - [x] 6.2 `.gold-display` → `var(--text-subtitle-size)`
  - [x] 6.3 `.reward-name` → `var(--text-subtitle-size)`
  - [x] 6.4 `.reward-cost` → `var(--text-body-size)`
  - [x] 6.5 `#shop-result` → `var(--text-body-size)`
  - [x] 6.6 `.shop-empty` → `var(--text-body-size)`
  - [x] 6.7 `#shop-stats` → `var(--text-body-size)`
  - [x] 6.8 `.deck-stats-header` → `var(--text-subtitle-size)`
  - [x] 6.9 `.deck-stats-info` → `var(--text-caption-size)`
  - [x] 6.10 shop.ts: 牌包名 16px→CSS class; 遗物tooltip 14px→10px, 9px→8px; comparison panel 11px→9px + border-radius:0

- [x] Task 7: 键盘可视化验证 (AC: 4)
  - [x] 7.1 `.key-slot` border-radius: 0 已确认 + 去 linear-gradient/3D/box-shadow
  - [x] 7.2 school 背景改为纯色半透明 `rgba(..., 0.12)`

- [x] Task 8: shop.ts 内联样式清理 (AC: 2, 3, 8)
  - [x] 8.1 确认无 inline `box-shadow`/`text-shadow`
  - [x] 8.2 稀有度 `style="color:${rarityColor}"` 为颜色值，保留
  - [x] 8.3 关键 inline font-size 已修正（遗物 tooltip、comparison panel、牌包名）

- [x] Task 9: 回归验证 (AC: 9)
  - [x] 9.1 商品信息可读（名称用 subtitle 10px，描述用 body 9px，价格用 body 9px）
  - [x] 9.2 稀有度通过 border-color 区分（白/蓝/紫/橙），去发光不影响区分
  - [x] 9.3 `.cannot-afford` opacity 0.5 + 红色边框，视觉明确
  - [x] 9.4 锁定通过 opacity 1 区分，解锁为 opacity 0.4
  - [x] 9.5 `.shape-preview` 未修改，使用 CSS grid + 纯色填充
  - [x] 9.6 牌包展开/折叠逻辑未修改，CSS 改动不影响功能
  - [x] 9.7 拖放逻辑在 shop.ts JS 中，CSS 改动不影响功能；Vite build 成功

## Dev Notes

### 设计规范（来自 Epic 55 + 已完成的战斗界面改造）

| 规则 | 值 |
|------|---|
| 字体 | `var(--font-pixel)` = `'Press Start 2P', 'Courier New', monospace` |
| 圆角 | 一律 `border-radius: 0` |
| 发光 | 禁止 `text-shadow` 和 `box-shadow` 发光（纯色或 none） |
| 动画缓动 | `steps(N)` 替代 `ease` / `cubic-bezier` |
| 边框 | 实线 2px，不用渐变边框 |
| 背景 | 不透明色块或 `rgba(0,0,0,0.2~0.3)` 半透明，不用 `linear-gradient` 装饰 |
| 颜色饱和度 | 高饱和 accent 色（chips 蓝 `#4ea8db`、mult 红 `#e85555`、金 `#ffe66d`、青 `#4ecdc4`） |
| 字号缩放 | Press Start 2P 视觉比普通字体大 ~1.5x，字号需缩至原来 60-70% |
| 按钮 | 直角、实色填充、hover 颜色变化（不用 scale/shadow 过渡） |

### 55-1 已完成的基础（前置依赖）

55-1（review 状态）已完成：
- `:root` CSS 变量更新：字号缩放（12/10/9/8/8/8px）、`--border-pixel`、`--bg-panel`、`--bg-panel-hover`、accent 颜色
- `theme.ts`：`TEXT_LEVEL` 同步、`TOOLTIP.borderRadius=0`、`FONT_PIXEL` 常量
- 全局 `body` `font-family: var(--font-pixel)`
- 80+ 处 `border-radius` 批量清零
- tooltip 像素风统一

本 Story 建立在 55-1 基础上，聚焦商店特有的样式违规。

### 商店架构要点

- **主渲染函数**：`shop.ts` 的 `renderUnifiedShop()`（~line 1541）— DOM 渲染，非 PixiJS
- **卡片渲染**：`renderUnifiedShopCard()`（~line 1597）— 动态 HTML + inline style
- **Legacy PixiJS 场景**：`scenes/shop/ShopScene.ts` 存在但已被 DOM 方案取代
- **商品类型**：词条技能卡（`.affix-skill-card`）、牌包卡（`.pack-card`）、遗物卡（`.relic-card`）、词库卡（`.library-card`）
- **CSS 位置**：商店样式分散在 `style.css` 的多个区段：
  - L585-735: 主商店结构 + 商品卡片
  - L1120-1136: 统计面板 + 开始按钮
  - L1708-1800: 牌组管理面板 + 词库卡片
  - L3390-3450: 统一商店样式（刷新按钮、锁定、牌包）
  - L3852-3860: Build/Stats tab
  - L4001-4009: 遗物卡片稀有度

### 需要修改的 CSS 违规汇总

**`linear-gradient` 背景（需改纯色）：**
- `#shop-screen` L585: `linear-gradient(180deg, #12121a, #1a1a2e)`
- `.reward-card` L657: `linear-gradient(145deg, #1a1a2e, #252535)`
- `.word-card` L1769: `linear-gradient(145deg, #1a1a2e, #252535)`
- `.word-card.recommended` L1789: `linear-gradient(145deg, #2a2520, #302a20)`
- `#start-battle-btn` L1126: `linear-gradient(145deg, #4ecdc4, #3dbdb5)`

**`box-shadow` 发光（需移除）：**
- `.reward-card:hover` L669: `box-shadow: 5px 5px 15px ..., 0 0 10px ...`
- `.risk-reward-card` L712: `box-shadow: 0 0 8px ...`
- `.library-card.active` L731: `box-shadow: 0 0 10px ...`
- `.relic-card-rare/epic/legendary` L4004-4006: `box-shadow` 发光
- `#start-battle-btn:hover` L1135: `box-shadow: 0 5px 20px ...`
- `.word-card.buyable:hover` L1784: `box-shadow: 0 3px 10px ...`

**`cubic-bezier`/`ease` 过渡（需改 `steps()`）：**
- `.reward-card` L661: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- `.shop-tab` L625: `all 0.2s`（隐式 ease）
- `.shop-refresh-btn` L3402: `all 0.2s`
- `.lock-toggle` L3422: `all 0.15s`
- `.word-card` L1773: `all 0.15s`
- `#start-battle-btn` L1132: `all 0.2s`

**3D 变换效果（需移除）：**
- `.reward-card` L662-663: `transform-style: preserve-3d; perspective: 500px`
- `.reward-card:hover` L668: `scale(1.03) rotateX(2deg) rotateY(-2deg)`

**`filter: drop-shadow`（需移除）：**
- `.lock-toggle.locked` L3433: `drop-shadow(0 0 4px rgba(255,230,109,0.5))`

### 不改什么

- PixiJS 场景颜色（留给 55-7）
- 弹窗样式（留给 55-4）
- 游戏结束界面（留给 55-3）
- 战斗界面现有像素风效果
- 稀有度 border-color 系统（保留，仅去发光）
- 学派颜色系统（`--school-*` 变量和对应背景色）

### 商店背景随机双色渐变参考

战斗背景实现（可复用逻辑）：
- 8 色 HSL 调色板，每关随机选色
- 双层：径向高光 + 线性渐变
- 随机角度 + 色相偏移 20deg
- 实现位置需查看 `main.ts` 或战斗场景初始化代码

### Project Structure Notes

- CSS 变量在 `src/src/style.css` 的 `:root` 块（L3-57）
- TS 设计常量在 `src/src/ui/theme.ts`（~28 行）
- 商店主逻辑在 `src/src/systems/shop.ts`（4232 行）
- 字体引入在 `src/index.html`（`<link>` 标签）
- 依赖方向：`shop.ts` → DOM 渲染，引用 `theme.ts` 常量 + CSS 变量

### References

- [Source: docs/stories/epic-55-pixel-visual-overhaul.md — Story 55-2 改造清单 + 设计规范表]
- [Source: docs/implementation-artifacts/55-1-design-tokens-pixel-foundation.md — 前置 Story 完成内容]
- [Source: src/src/style.css:585-735 — 商店主样式区段]
- [Source: src/src/style.css:1120-1136 — 统计面板 + 开始按钮]
- [Source: src/src/style.css:1708-1800 — 牌组管理 + 词库卡片]
- [Source: src/src/style.css:3390-3450 — 统一商店刷新/锁定/牌包样式]
- [Source: src/src/style.css:4001-4009 — 遗物卡片稀有度样式]
- [Source: src/src/systems/shop.ts:~1541 — renderUnifiedShop() 主渲染]
- [Source: src/src/systems/shop.ts:~1597 — renderUnifiedShopCard() 卡片渲染]
- [Source: docs/game-architecture.md — 场景/UI 架构]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无——纯 CSS/TS 改造 + build 验证

### Completion Notes List

- 提取 `randomizeScreenBackground()` 为可复用函数（从 `battle.ts` 导出），`openShop()` 调用生成商店随机背景
- `.reward-card`: 去 linear-gradient → `var(--bg-panel)`，去 3D perspective/transforms，hover 改为颜色变化
- 6 处 `box-shadow` 发光移除（risk-reward、library-active、relic-rare/epic/legendary、start-battle-btn:hover、word-card.buyable:hover）
- `.key-slot`: 去 linear-gradient/preserve-3d/box-shadow，改纯色 + steps() 过渡；school 背景改纯色半透明
- 附魔/虚无/选中/技能浮动等动画全部改为 `steps(N)` 阶梯缓动
- 按钮统一: start-battle 实色 + 无 scale/shadow；refresh-btn 去 scale；lock-toggle 去 drop-shadow/scale
- 10 个字号从硬编码 px 改为 CSS 变量引用
- shop.ts inline styles: 牌包名去 font-size:16px、遗物 tooltip 字号缩小 + border-radius:0、comparison panel 像素化
- `pack-word-row .word-text` 15px → var(--text-subtitle-size)
- Vite build 成功，无新增 TypeScript 错误

### Change Log

- 2026-04-05: Story 55.2 商店界面像素风改造完成
- 2026-04-05: Code Review 修复 — 7 个问题（4H+3M）：牌包 gradient/box-shadow、附魔面板 border-radius、card-3d/elastic-scale 像素化、openShop 缓存引用、25+ font-size 变量化、pack-word-row 重复定义

### File List

- `src/src/style.css` — 商店/键盘/卡片/按钮/动画 CSS 像素化
- `src/src/systems/battle.ts` — 提取 `randomizeScreenBackground()` + `SCREEN_BG_PALETTE` 为导出函数
- `src/src/systems/shop.ts` — 导入并调用随机背景 + 修正 inline styles
