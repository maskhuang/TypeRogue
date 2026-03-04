---
title: "Story 19.7: 战斗 UI 改造"
epic: "Epic 19: 技能体系重构"
story_key: "19-7-battle-ui-overhaul"
status: "done"
created: "2026-03-03"
updated: "2026-03-04"
depends_on: ["19-1-resource-system-core", "19-2-producer-skills"]
---

# Story 19.7: 战斗 UI 改造

## Story

作为一个 **玩家**，
我想要 **战斗界面纯粹显示打字内容，技能反馈通过浮字和动画传达，5 种资源用颜色区分**，
以便 **打字时不分心，同时能直观感受 build 在发挥作用**。

## 背景与上下文

当前战斗界面有一个 `#battle-skills` 技能栏，显示所有绑定技能的卡片。随着新技能体系引入产出者/转化者/连接者/附魔，技能栏信息过载且分散注意力。设计意图是移除技能栏，转为纯浮字 + 动画反馈：玩家打字时通过不同颜色的浮字直观感知资源变化。

**结算面板**当前仅显示 `base × multiplier = final`，需要扩展支持 `score` 资源维度：`base × multiplier + score = final`。

## Acceptance Criteria

- [x] AC1: 移除战斗中的 `#battle-skills` 技能栏，界面只保留打字区域 + HUD
- [x] AC2: 资源浮字支持 5 种颜色：⚔️红(base), 🪙金(score), 🔥橙(multiplier), ⏳蓝(time), 🛡️银(shield)
- [x] AC3: 连接者链式触发时，浮字连续弹出形成节奏感（间隔 100-200ms）
- [x] AC4: 附魔效果触发时额外浮字标注来源（如 "🔗增幅 ×1.5"）
- [x] AC5: 伪无限模式视觉：分数区持续快速滚动 + 屏幕边缘光效
- [x] AC6: Balatro 式结算面板适配 5 资源：base × multiplier + score = finalScore
- [x] AC7: 保留已有效果：字母弹跳/粒子爆发/连击计数器/屏幕震动/里程碑弹窗
- [x] AC8: 60fps 流畅度不受浮字数量影响（浮字队列/回收池）

## Tasks / Subtasks

- [x] Task 1: 移除技能栏 (AC: 1, 7)
  - [x] 1.1 删除 `battle.ts` 中 `renderBattleSkills()` 函数及其 `startLevel()` 调用
  - [x] 1.2 删除 `highlightBoundSkill()` 函数及所有 7 个调用点（skills.ts）
  - [x] 1.3 从 `index.html` 删除 `<div id="battle-skills"></div>`
  - [x] 1.4 从 `types.ts` UIElements 接口删除 `battleSkills`；从 `elements.ts` 删除查询
  - [x] 1.5 从 `style.css` 删除 `#battle-skills`、`.bound-skill`、`@keyframes iconSpin`、`.bound-skill.evolved` CSS
  - [x] 1.6 `#bottom-hud` 仅剩 `#combo-display` + `#active-library`，两端对齐

- [x] Task 2: 浮字系统重写 (AC: 2, 3, 4)
  - [x] 2.1 重写 `showFeedback()` 为浮动弹出文字系统，绝对定位于 `#game-container`
  - [x] 2.2 浮字 CSS animation：`floatUp` keyframe 800ms（缩放+上浮+渐隐）
  - [x] 2.3 浮字队列：150ms 间隔 `drainQueue()` 处理链式触发
  - [x] 2.4 附魔浮字保持现有格式通过 `showFeedback(text, RESOURCE_COLORS[resource])`
  - [x] 2.5 所有 `showFeedback()` 调用点自动走新浮字系统（API 签名不变）
  - [x] 2.6 旧技能 `generateFeedback()` 同样走新浮字（通过 showFeedback）

- [x] Task 3: 伪无限视觉 (AC: 5)
  - [x] 3.1 新增 `setPseudoInfiniteVisual(active)` 导出函数
  - [x] 3.2 CSS `#game-container.pseudo-infinite` 金色 `box-shadow: inset` + `pseudoInfinitePulse` 脉冲
  - [x] 3.3 `clearPseudoInfinite()` 调用 `setPseudoInfiniteVisual(false)` 移除光效

- [x] Task 4: 结算面板适配 (AC: 6)
  - [x] 4.1 `index.html` 结算面板插入 `+ score` 列（`settlement-score`）
  - [x] 4.2 `updateSettlementLive()` 显示 `resources.score`，公式 `chips * mult + score`
  - [x] 4.3 `showSettlementComplete()` + CSS score 列样式（金色 `#f1c40f`）
  - [x] 4.4 `completeWord()` 计算 `finalWordScore = Math.floor(baseChips * finalMult + instantScore)`

- [x] Task 5: 浮字性能优化 (AC: 8)
  - [x] 5.1 对象池：`FLOAT_POOL_SIZE=20` 预创建 DOM 元素，`acquireFloat/releaseFloat` 回收
  - [x] 5.2 池耗尽时 `acquireFloat()` 返回 null 跳过（不堆积）
  - [x] 5.3 CSS `@keyframes floatUp` 驱动动画，无 JS 定时器

- [x] Task 6: 测试 (AC: 7, 8)
  - [x] 6.1 回归：确认 spawnParticles/screenShake/bumpCombo/showTriggerPopup 保留
  - [x] 6.2 浮字颜色：RESOURCE_COLORS 5 种资源验证
  - [x] 6.3 结算公式：`chips * mult + score` 验证
  - [x] 6.4 残留检查：grep battleSkills/battle-skills/renderBattleSkills/highlightBoundSkill = 0
  - [x] 6.5 27 tests pass，0 regressions

## Dev Notes

### 现有代码分析

**`showFeedback(txt, color)` (battle.ts:900-907) — 需重写：**
- 当前是单行覆盖模式：更新 `#input-feedback` textContent，900ms 后清除
- last-write-wins：多个技能同时触发时只看到最后一个
- 新系统需要：多浮字并存 + 颜色 + 位置随机 + 上浮渐隐

**`showScorePopup(score)` (battle.ts:909-917) — 参考模板：**
- 已定义但未使用的浮字代码，用 `position: absolute` + `scoreFloat` keyframe
- 可以作为新浮字系统的基础模板扩展

**`showTriggerPopup(skillId)` (skills.ts:1173-1186) — 保留：**
- 技能图标浮出弹窗，追加到 `#skill-trigger-zone`，350ms 动画
- 这个功能继续保留，与资源浮字独立

**`highlightBoundSkill(skillId)` (battle.ts:919-927) — 删除：**
- 查询 `#battle-skills` 中的卡片添加 `.triggered` 类
- 删除技能栏后此函数失去作用
- 调用点：`triggerProducer`、`triggerConverter`、`triggerConnectorCopy`、`checkResourceTriggers`、`triggerSkill` — 全部删除调用

### 资源颜色（已定义，无需新增）

`constants.ts` 已有完整定义：
```typescript
RESOURCE_COLORS = { base: '#e74c3c', score: '#f1c40f', multiplier: '#e67e22', time: '#3498db', shield: '#bdc3c7' }
RESOURCE_LABELS = { base: '基数', score: '分数', multiplier: '倍率', time: '时间', shield: '护盾' }
RESOURCE_ICONS  = { base: '⚔️', score: '🪙', multiplier: '🔥', time: '⏳', shield: '🛡️' }
```

### 结算面板现有结构

`index.html` `#score-settlement` 当前布局：
```
[ 基数 chips ] × [ 倍率 mult ] = [ final ]
```
需改为：
```
[ 基数 base ] × [ 倍率 mult ] + [ 分数 score ] = [ final ]
```

`updateSettlementLive()` (battle.ts:399-419) 当前逻辑：
- `chips = wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore + wordBonus`
- `final = chips × multiplier`
- **缺失**：`state.resources.score` 未显示（来自 prod_loot/prod_crit 等即时加分）
- 改为：`final = base × multiplier + score`

结算面板 CSS 状态机：`.settlement-hidden` → `.settlement-live` → `.settlement-complete` — 保持此模式

### `#bottom-hud` 布局调整

当前 children: `#combo-display | #battle-skills | #active-library`
删除 `#battle-skills` 后: `#combo-display | #active-library`
CSS: `justify-content: space-between` 仍适用，两端对齐

### 浮字系统设计

```typescript
// 浮字对象池
const FLOAT_POOL_SIZE = 20;
let pool: HTMLDivElement[] = [];

function createFloatText(text: string, color: string, delay: number = 0): void {
  // 从 pool 取出空闲元素，设置 textContent/color/position
  // CSS class 触发 animation（参考 scoreFloat keyframe）
  // animationend 事件回收到 pool
}

// 浮字队列（处理链式触发）
let floatQueue: Array<{text: string, color: string}> = [];
let queueTimer: number | null = null;

function enqueueFloat(text: string, color: string): void {
  floatQueue.push({text, color});
  if (!queueTimer) drainQueue();
}

function drainQueue(): void {
  if (floatQueue.length === 0) { queueTimer = null; return; }
  const item = floatQueue.shift()!;
  createFloatText(item.text, item.color);
  queueTimer = window.setTimeout(drainQueue, 150); // 150ms 间隔
}
```

### 文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/systems/battle.ts` | 修改 | 删除 renderBattleSkills + highlightBoundSkill；重写 showFeedback → 浮字系统；扩展 updateSettlementLive 支持 score；新增伪无限视觉 |
| `src/src/systems/skills.ts` | 修改 | 删除所有 highlightBoundSkill 调用；showFeedback 调用改为新浮字 API |
| `src/index.html` | 修改 | 删除 #battle-skills；结算面板加 score 列 |
| `src/src/core/types.ts` | 修改 | UIElements 删除 battleSkills |
| `src/src/core/elements.ts` | 修改 | 删除 battleSkills querySelector |
| `src/style.css` | 修改 | 删除 .bound-skill 系列 CSS；新增浮字 CSS；新增伪无限光效 CSS；结算面板 +score 列样式 |
| `src/tests/unit/systems/battle-ui.test.ts` | 新建 | 浮字颜色 + 结算公式 + 残留引用检查 |

### Anti-patterns — 不要做的事

1. **不要保留 `highlightBoundSkill` 函数** — 技能栏删除后无用，删除函数和所有调用点
2. **不要用 JS 驱动浮字位移** — 用 CSS `@keyframes` animation，性能更好
3. **不要在 showFeedback 中用 innerHTML** — 用 textContent 防止 XSS
4. **不要为浮字创建新的 container 元素** — 复用 `#game-container`（已有 `position: relative`）作为浮字容器
5. **不要修改 `showTriggerPopup`** — 技能图标弹窗独立于资源浮字系统，保持不变
6. **不要动粒子系统** — `effects/particles.ts` 完全独立，不在此 story 范围内
7. **不要修改 `generateFeedback` 的返回结构** — 只修改它的 `showFeedback` 调用方式
8. **不要给旧技能（burst/amp 等）改颜色体系** — 旧技能保留原有颜色，新技能（产出者/转化者）用 RESOURCE_COLORS

### Previous Story Intelligence（19.6 附魔系统）

- **Code review 修复**: triggerProducerWithReduction 乘法型 reduction 公式为 `1 + (baseValue-1)*reduction`，溅射反馈乘法型显示 `×N` 而非 `+N`
- **副作用分离**: getIndependentMultiplier 是纯函数，副作用在 advanceDecayCounter 中
- **反馈文本模式**: `showFeedback(text, RESOURCE_COLORS[resource])` — 新旧技能都用此模式
- **附魔浮字**: 当前溅射/共鸣已通过 showFeedback 显示（如 "+3.5基数 (溅射)"），新系统保持此格式
- **防递归标志**: `_splashActive`/`_resonanceActive` 模块级 boolean — 不要在 UI 重构中改变

### 设计文档参考

- [Source: docs/brainstorming-session-2026-03-03.md#战斗反馈] — "战斗界面不显示键盘，不显示技能栏，纯靠浮字和动画反馈"
- [Source: docs/gdd.md#战斗UI] — "战斗 UI 改造（移除技能栏，纯浮字反馈，5 资源颜色）"
- [Source: docs/stories/epic-19-skill-system-redesign.md#19.7] — "移除技能栏，改为纯浮字反馈，5 种资源颜色区分，结算面板适配多资源"
- [Source: src/src/data/constants.ts#RESOURCE_COLORS] — 5 种资源颜色已定义
- [Source: src/src/systems/battle.ts#showScorePopup] — 浮字模板（position absolute + scoreFloat keyframe）

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
N/A — no debug issues encountered

### Completion Notes List
- Removed `renderBattleSkills()`, `highlightBoundSkill()`, and dead `showScorePopup()` from battle.ts
- Removed `getSkillDisplayInfo` unused import from battle.ts
- Rewrote `showFeedback()` as floating text system with object pool (20 elements) and queue (150ms drain)
- Added `setPseudoInfiniteVisual()` export to battle.ts, called from skills.ts enter/clear pseudo-infinite
- Extended settlement panel with score column: `base × mult + score = final`
- Updated `completeWord()` formula to include `instantScore`
- Updated 5 test files to remove `highlightBoundSkill`/`battleSkills` mocks, add `setPseudoInfiniteVisual` mock
- 28 new tests covering AC1, AC2, AC5, AC6, AC7, AC8 — all pass
- Pre-existing 21 test failures (lone/void/school related) unaffected — verified via `git stash` isolation

**Code Review Fixes (3H/3M/2L):**
- H1: Added `clearFloatQueue()` to endLevel/gameOver/victory — prevents orphaned drain timers
- H2: Removed dead `#input-feedback` div, `feedback` UIElements property, and CSS
- H3: Fixed settlement formula mismatch — `showSettlementComplete` now receives explicit score parameter
- M1: Added clearFloatQueue test (28th test)
- M2: Replaced `setTimeout(800)` with `onanimationend` for float recycling
- M3: Moved `initFloatPool()` to `startLevel()`, removed per-call init check in createFloatText

### Change Log
- battle.ts: -renderBattleSkills, -highlightBoundSkill, -showScorePopup, +floatPool/floatQueue/acquireFloat/releaseFloat/createFloatText/drainQueue, rewrote showFeedback, +setPseudoInfiniteVisual, updated settlement for score
- skills.ts: -highlightBoundSkill calls (7 sites), +setPseudoInfiniteVisual import and calls
- index.html: -#battle-skills div, +settlement-score column
- types.ts: -battleSkills from UIElements
- elements.ts: -battleSkills querySelector
- style.css: -#battle-skills/.bound-skill/iconSpin CSS, +.float-text/.float-text-active/@keyframes floatUp, +.pseudo-infinite/pseudoInfinitePulse/infiniteScoreScroll, +.settlement-score-box CSS

### File List
| File | Action | Description |
|------|--------|-------------|
| `src/src/systems/battle.ts` | Modified | Removed skill bar functions; rewrote showFeedback as float system; added pseudo-infinite visual; updated settlement for score |
| `src/src/systems/skills.ts` | Modified | Removed highlightBoundSkill calls; added setPseudoInfiniteVisual calls |
| `src/index.html` | Modified | Removed #battle-skills; added settlement-score column |
| `src/src/core/types.ts` | Modified | Removed battleSkills from UIElements |
| `src/src/ui/elements.ts` | Modified | Removed battleSkills querySelector |
| `src/src/style.css` | Modified | Removed bound-skill CSS; added float-text, pseudo-infinite, settlement-score CSS |
| `src/tests/unit/systems/battle-ui.test.ts` | Created | 27 tests: AC1/AC2/AC5/AC6/AC7/AC8 |
| `src/tests/unit/systems/enchantment-effects.test.ts` | Modified | Updated battle mock |
| `src/tests/unit/systems/producer-trigger.test.ts` | Modified | Updated battle mock |
| `src/tests/unit/systems/converter-trigger.test.ts` | Modified | Updated battle mock |
| `src/tests/unit/systems/connector-chain.test.ts` | Modified | Updated battle mock |
| `src/tests/unit/systems/producer-shop.test.ts` | Modified | Updated battle mock |
