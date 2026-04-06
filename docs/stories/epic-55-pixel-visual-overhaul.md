---
title: "Epic 55: 像素风视觉统一改造"
epic_key: "epic-55"
status: "draft"
created: "2026-04-05"
stories:
  - "55-1-design-tokens-pixel-foundation"
  - "55-2-shop-screen-pixel-overhaul"
  - "55-3-gameover-screen-pixel-overhaul"
  - "55-4-modal-dialogs-pixel-overhaul"
  - "55-5-ritual-rest-screens-pixel-overhaul"
  - "55-6-global-ui-pixel-overhaul"
  - "55-7-pixijs-scene-color-sync"
  - "55-8-visual-qa-consistency-pass"
  - "55-9-pixijs-bitmap-float-text"
---

# Epic 55: 像素风视觉统一改造

## 背景

战斗界面已完成像素风改造（Press Start 2P 字体、CRT 扫描线/暗角/微闪烁、steps() 阶梯动画、每关随机双色渐变背景），但其余界面仍为旧设计语言（圆角、渐变边框、text-shadow 发光、平滑缓动）。视觉割裂严重，需要将像素风统一到全部 5 个主界面 + 6 个弹窗 + 全局 UI 元素。

## 设计目标

- **风格统一**：全游戏像素字体 + 直角 + 阶梯动画 + 无发光，消除新旧视觉混搭
- **Balatro 参考**：中亮度暖色调背景（非纯黑）、高饱和 UI 色块、像素字体但信息清晰
- **去 AI 味**：避免对称模板感，保留有意的设计"偏执"细节
- **性能不退化**：CSS-only 改造为主，不引入额外 JS 渲染开销

## 已完成的战斗界面改造（作为后续 Story 的设计规范）

### 设计规范

| 规则 | 值 |
|------|---|
| 字体 | `var(--font-pixel)` = `'Press Start 2P', 'Courier New', monospace` |
| 圆角 | 一律 `border-radius: 0` |
| 发光 | 禁止 `text-shadow` 和 `box-shadow` 发光（纯色或 none） |
| 动画缓动 | `steps(N)` 替代 `ease` / `cubic-bezier` |
| 边框 | 实线 2px，不用渐变边框 |
| 背景 | 不透明色块或 `rgba(0,0,0,0.2~0.3)` 半透明，不用 `linear-gradient` 装饰 |
| 颜色饱和度 | 高饱和 accent 色（chips 蓝 `#4ea8db`、mult 红 `#e85555`、金 `#ffe66d`、青 `#4ecdc4`） |
| 字号缩放 | Press Start 2P 视觉上比普通字体大 ~1.5x，所有字号需缩至原来的 60-70% |
| 按钮 | 直角、实色填充、hover 颜色变化（不用 scale/shadow 过渡） |

### CRT 效果层（已实现，全局生效）

- 扫描线：`repeating-linear-gradient` 4px 间距、12% 透明度
- 暗角：`radial-gradient` 从 60% 开始、25% 黑度
- 微闪烁：8s 周期、93% 处亮度跳动

### 战斗背景（已实现）

- 8 色调色板（HSL），每关随机选色
- 双层：径向高光 + 线性渐变（随机角度、色相偏移 20°）

---

## Story 拆分

### Story 55-1: 设计基础 — token 统一 + 全局字体切换

**范围：**
- 更新 `:root` CSS 变量，新增像素风 token（`--border-pixel`、`--bg-panel`、`--bg-panel-hover` 等）
- 更新 `ui/theme.ts` 的 `TEXT_LEVEL`、`SPACING`、`TOOLTIP` 常量，统一字号/圆角/间距
- 全局 `body` / `#game-container` 应用 `font-family: var(--font-pixel)`
- 所有 `border-radius` 变量归零
- tooltip 样式统一（直角、无发光、像素字体）

**验收标准：**
- [ ] 所有界面文字使用 Press Start 2P
- [ ] `theme.ts` 常量与 CSS 变量一致
- [ ] tooltip 全局像素风
- [ ] 无视觉回归（字号适配完成）

---

### Story 55-2: 商店界面像素风改造

**范围：** `#shop-screen` 及所有子组件

**改造清单：**
- [ ] 商店标题、金币、Tab 栏 → 像素字体 + 直角
- [ ] 商品卡片（`.shop-item`）→ 去圆角、去渐变背景、实线边框、hover 用颜色变化
- [ ] 稀有度边框颜色保留但去发光 `box-shadow`
- [ ] 键盘可视化（`.key-slot`）→ 直角、去圆角
- [ ] 技能库存面板 → 直角、像素字体
- [ ] 词库面板、统计面板 → 同上
- [ ] 蜕变站/工坊面板 → 同上
- [ ] 「开始下一关」按钮 → 直角实色、像素字体
- [ ] 商店背景 → 随机双色渐变（复用战斗背景逻辑）
- [ ] 所有动画改为 `steps()` 缓动

**验收标准：**
- [ ] 商店界面与战斗界面视觉一致
- [ ] 所有交互反馈（hover/click）使用阶梯过渡
- [ ] 键盘可视化清晰可读

---

### Story 55-3: 游戏结束界面像素风改造

**范围：** `#gameover-screen`

**改造清单：**
- [ ] 标题（GAME OVER）→ 像素字体大号、阶梯入场动画
- [ ] 统计数据列表 → 像素字体、直角面板
- [ ] 排行榜表格 → 直角、交替行色、像素字体
- [ ] 「重新开始」/「每日挑战」按钮 → 直角实色
- [ ] 背景 → 暗红色调（区别于战斗的随机色）

**验收标准：**
- [ ] 游戏结束界面与战斗/商店视觉一致
- [ ] 排行榜数字清晰可读

---

### Story 55-4: 弹窗系统像素风改造

**范围：** 6 个弹窗

**改造清单：**
- [ ] `#class-select-modal` — 职业卡片直角、像素字体、实色按钮
- [ ] `#ascension-select-modal` — 等级列表直角、选中态用颜色高亮
- [ ] `#relic-picker-modal` — 遗物卡片直角、稀有度用颜色条而非发光
- [ ] `#word-picker-modal` — 词库卡片直角
- [ ] `#modifier-picker-modal` — Boss 修饰器卡片直角、危险感用红色实边框
- [ ] `#enchantment-modal` — 附魔分支面板直角、选择按钮实色
- [ ] 所有弹窗背景遮罩改为半透明纯黑（不用模糊）
- [ ] 弹窗入场动画 → `steps()` 阶梯弹入

**验收标准：**
- [ ] 6 个弹窗视觉统一
- [ ] 弹窗内文字清晰可读（字号适配 Press Start 2P）

---

### Story 55-5: 仪式/休息界面像素风改造

**范围：** `#ritual-screen`、`#rest-screen`

**改造清单：**
- [ ] 仪式标题/副标题 → 像素字体
- [ ] 附魔选择卡片 → 直角、实色背景
- [ ] 休息事件面板 → 直角、图标保留 emoji
- [ ] 选项按钮 → 直角实色、hover 颜色变化
- [ ] 结果文字 → 像素字体 + 阶梯淡入
- [ ] 背景 → 特殊色调（仪式=紫、休息=暖绿），区分战斗/商店

**验收标准：**
- [ ] 仪式/休息界面与全局视觉一致
- [ ] 不同界面背景色调可区分

---

### Story 55-6: 全局 UI 元素像素风改造

**范围：** 跨界面的公共组件

**改造清单：**
- [ ] 语言切换按钮（`#lang-toggle`）→ 直角、像素字体 8px
- [ ] 金币奖励动画（`#gold-reward`）→ 像素字体 + `steps()` 动画
- [ ] 解锁通知（`UnlockNotification`）→ 直角、阶梯滑入
- [ ] KeyTooltip → 直角、去发光边框、像素字体（注意字号需特别小）
- [ ] HelpPanel → 直角、像素字体
- [ ] 伪无限模式视觉（`.pseudo-infinite`）→ 去 `box-shadow` 发光、改用纯色边框闪烁
- [ ] 滚动条样式 → 像素风窄条

**验收标准：**
- [ ] 所有非界面特定的 UI 元素统一像素风
- [ ] tooltip 信息密度不因字体变化而降低可读性

---

### Story 55-7: PixiJS 场景颜色同步

**范围：** `scenes/` 下所有 PixiJS 场景的硬编码颜色

**改造清单：**
- [ ] `BattleScene.ts` 背景色 `0x1a1a2e` → 与 CSS 随机背景同步（或透明，让 DOM 背景透出）
- [ ] `ShopScene.ts` / `VictoryScene.ts` / `GameOverScene.ts` 背景色同步
- [ ] `BattleHUD.ts` 文字样式统一（字体、颜色、字号）
- [ ] `ScoreSettlement.ts`（PixiJS 版）样式同步（若仍在使用）
- [ ] `WordDisplay.ts`（PixiJS 版）颜色同步（`TYPED_STYLE`/`REMAINING_STYLE`）
- [ ] `KeyboardVisualizer.ts` / `KeyVisual.ts` 颜色+圆角同步

**验收标准：**
- [ ] PixiJS 渲染的颜色与 DOM CSS 一致
- [ ] 无 PixiJS/DOM 双渲染的颜色冲突

---

### Story 55-8: 视觉 QA — 全界面一致性检查

**范围：** 全游戏走查

**检查清单：**
- [ ] 逐界面截图对比：战斗→商店→仪式→休息→Boss→游戏结束
- [ ] 检查残留的 `border-radius > 0`
- [ ] 检查残留的 `text-shadow` 发光
- [ ] 检查残留的 `ease` / `cubic-bezier` 动画
- [ ] 检查字体回退（Press Start 2P 未加载时的表现）
- [ ] 检查小字号可读性（尤其 tooltip、技能描述）
- [ ] 检查 CRT 扫描线对各界面的视觉影响
- [ ] 性能检查：动画帧率不低于 60fps

**验收标准：**
- [ ] 全游戏视觉风格统一
- [ ] 无残留旧样式
- [ ] 无可读性问题
- [ ] 性能无退化

---

## 依赖与风险

| 风险 | 缓解 |
|------|------|
| Press Start 2P 不支持中文 | 中文文字回退到系统字体，保持像素英文+清晰中文的混搭（Balatro 也是如此） |
| 像素字体小字号可读性差 | tooltip/描述文字最小 8px，必要时局部回退 Courier New |
| CSS 改动量大（5000+ 行） | 按 Story 顺序逐步改造，每个 Story 独立可测试 |
| PixiJS 与 DOM 颜色冲突 | Story 55-7 专门处理，优先让 PixiJS 层透明 |

## 工作量估计

- Story 55-1: S（设计 token，影响面广但改动集中）
- Story 55-2: L（商店是最复杂的界面，CSS 量最大）
- Story 55-3: S（游戏结束界面简单）
- Story 55-4: M（6 个弹窗，结构相似可批量处理）
- Story 55-5: S（仪式/休息界面简单）
- Story 55-6: M（全局元素分散，需逐个排查）
- Story 55-7: M（PixiJS 硬编码颜色需逐文件修改）
- Story 55-8: S（QA 走查，修复为主）
