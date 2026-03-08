# Story 31.1: 数字颜色分级系统

Status: done

## Story

As a 玩家,
I want 看到高分数字以金色/彩虹/发光等不同档位的颜色渲染,
so that 我能直观感受到 build 的威力，获得量级区分的视觉反馈。

## Acceptance Criteria

1. **颜色分级渲染** — 单词结算分数在结算面板 `#settlement-final` 上根据量级显示不同颜色：
   - 0-99: 白色（默认）
   - 100-999: 银白 + 微光 text-shadow（CSS class `score-silver`）
   - 1000-4999: 金色 + 发光 text-shadow（CSS class `score-gold`）
   - 5000-9999: 彩虹渐变 + 流动效果（CSS class `score-rainbow`，`background-clip: text`）
   - 10000+: 发光白字 + 金色/红色 text-shadow + 脉冲动画（CSS class `score-legendary`）
2. **战斗中累计分数颜色** — `#score-count` 元素根据 `state.score` 总分应用相同颜色分级
3. **PixiJS 浮动数字颜色** — ScorePopup 组件的弹出数字使用匹配的 5 档颜色（扩展现有 4 档）
4. **60fps 无卡顿** — 所有颜色效果使用 CSS GPU 加速属性（transform/opacity/filter），不引入 layout/paint 开销
5. **单元测试** — `getScoreTier()` 阈值函数覆盖边界值测试

## Tasks / Subtasks

- [x] Task 1: 实现 `getScoreTier()` 分级函数 (AC: 1, 5)
  - [x] 在 `src/effects/juice.ts` 中定义 `getScoreTier(score): string`（与 `getShakeIntensity` 同文件）
  - [x] 返回 CSS class 名: `''` / `'score-silver'` / `'score-gold'` / `'score-rainbow'` / `'score-legendary'`
  - [x] 编写单元测试覆盖所有阈值边界（99→100, 999→1000, 4999→5000, 9999→10000）— 8 个测试
- [x] Task 2: 实现颜色分级 CSS 样式 (AC: 1, 4)
  - [x] 在 `src/style.css` 添加 4 个分级 CSS class
  - [x] `score-silver`: `color: #e0e0e0; text-shadow: 0 0 8px rgba(224,224,224,0.5)`
  - [x] `score-gold`: `color: #ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.6)`
  - [x] `score-rainbow`: `background: linear-gradient(90deg, #ff6b6b, #ffd700, #4ecdc4, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: brightness(1.3)`
  - [x] `score-legendary`: `color: #fff; text-shadow: 0 0 20px #ffd700, 0 0 40px #ff6b6b; animation: legendaryPulse 0.5s ease-in-out`
  - [x] 添加 `@keyframes legendaryPulse` 动画（brightness 1 → 1.8 → 1）
- [x] Task 3: 结算面板颜色集成 (AC: 1)
  - [x] 修改 `showSettlementComplete()` (battle.ts)：根据 `total` 调用 `getScoreTier()` 并应用 class 到 `#settlement-final`
  - [x] 每次结算前先清除之前的分级 class（`classList.remove(...SCORE_TIER_CLASSES)`）
- [x] Task 4: 战斗中累计分数颜色 (AC: 2)
  - [x] 修改 `updateHUD()` 中 score 更新逻辑：根据 `state.score` 应用分级 class 到 `#score-count`
  - [x] 分数增长时颜色自动升级（单向，不会降级）
- [x] Task 5: ScorePopup 浮动数字颜色扩展 (AC: 3)
  - [x] 修改 `ScorePopup.ts` 的 `calculateColor()` 方法，扩展为 5 档
  - [x] 颜色映射：白(#eaeaea) / 银(#e0e0e0) / 金(#ffd700) / 彩虹(#a855f7) / 传奇(#ffffff)
  - [x] 字号同步扩展：24/26/30/34/38（5 档）

## Dev Notes

### 架构要点

- **双渲染系统**：本项目同时使用 DOM/CSS（结算面板、HUD）和 PixiJS（浮动数字、粒子），需两路都处理颜色分级
- **DOM 侧**：结算面板 `#settlement-final` 和 `#score-count` 使用 CSS class 切换
- **PixiJS 侧**：`ScorePopup.ts` 使用 `PIXI.Text` 的 `style.fill` 属性

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/systems/battle.ts` | 结算逻辑 | `showSettlementComplete()` L404-431 添加颜色 class |
| `src/systems/battle.ts` | 实时分数 | `updateSettlementLive()` L377-401 添加颜色 class |
| `src/style.css` | 样式 | 新增 4 个分级 CSS class + keyframe |
| `src/ui/effects/ScorePopup.ts` | 浮动数字 | 扩展 `calculateColor()` 为 5 档 |

### 现有代码模式（必须遵循）

**ScorePopup 现有颜色逻辑**（需扩展，非替换）：
```typescript
// 当前实现 — 4 档
if (score >= 1000) return '#ffe66d'   // Gold
if (score >= 500) return '#9b59b6'    // Purple
if (score >= 100) return '#4ecdc4'    // Cyan
return '#eaeaea'                      // Light gray
```

**CSS class 清除模式**（参考现有 multiplier glow 实现）：
```typescript
// juice.ts L~45: updateMultiplierGlow() 的 class 切换方式
el.classList.remove('score-silver', 'score-gold', 'score-rainbow', 'score-legendary');
const tier = getScoreTier(score);
if (tier) el.classList.add(tier);
```

**CSS 动画最佳实践**（现有项目模式）：
- 使用 `transform` + `opacity` + `filter` 做动画（GPU 加速）
- 避免 `width`/`height`/`top`/`left` 动画（触发 layout）
- `animation-fill-mode: forwards` 保持结束状态

### 避免的陷阱

- **不要** 在 `score-rainbow` 中使用 PixiJS shader — DOM 侧使用 CSS `background-clip: text`，PixiJS 侧使用近似纯色即可
- **不要** 创建新的 NumberRenderer 组件 — 直接扩展现有 `ScorePopup` 和 DOM 元素的逻辑
- **不要** 引入新依赖 — 所有效果用纯 CSS + 现有 PixiJS Text API 实现
- **不要** 修改 ScorePopup 的对象池逻辑 — 只修改颜色/字号计算方法
- **不要** 在逐帧 update 中做颜色计算 — 仅在 score 变化事件时计算一次

### 性能约束

- CSS 动画使用 `will-change: transform, filter` 提示
- `legendaryPulse` 动画持续 0.5s，非循环（`animation-iteration-count: 1`）
- ScorePopup 对象池上限 20 个（现有设置，不需修改）
- `getScoreTier()` 是纯函数，O(1) 4 次比较，无性能顾虑

### Tech Spec 参考

完整 tech spec 在 `docs/implementation-artifacts/tech-spec-number-juice.md`。本 Story 对应 Task 1 + Task 8（CSS 部分）+ Task 9（测试部分）。

### 阈值说明

Tech spec 的阈值（100/1000/5000/10000）与 Epic 文档略有差异：
- Epic: 0-99/100-999/1000-4999/5000-9999/10000+
- Tech spec: 默认/silver(100+)/gold(1000+)/rainbow(5000+)/legendary(10000+)

**以 Tech spec 为准**（4 个 CSS class，默认无 class），因为它更贴合现有结算面板的分数范围。

### Project Structure Notes

- 所有 UI 效果代码在 `src/ui/effects/` 目录
- 系统逻辑在 `src/systems/`
- CSS 样式集中在 `src/style.css`（单文件）
- 测试在 `src/__tests__/` 目录
- 命名规范：camelCase 函数名，kebab-case CSS class

### References

- [Source: docs/implementation-artifacts/tech-spec-number-juice.md#Task1] — 颜色分级实现方案
- [Source: docs/implementation-artifacts/tech-spec-number-juice.md#Task8] — CSS 资源定义
- [Source: docs/stories/epic-21-number-juice.md#Story31.1] — 验收标准来源
- [Source: docs/game-architecture.md] — 60fps 性能约束、项目结构
- [Source: src/ui/effects/ScorePopup.ts] — 现有颜色分级实现（4档）
- [Source: src/effects/juice.ts] — 现有 juice 效果基础设施
- [Source: src/systems/battle.ts#L404-431] — showSettlementComplete() 集成点
- [Source: src/systems/battle.ts#L377-401] — updateSettlementLive() 集成点
- [Source: src/style.css] — CSS 样式文件

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无

### Completion Notes List

- `getScoreTier()` 放在 `src/effects/juice.ts` 而非 `battle.ts`，与同文件 `getShakeIntensity()` 模式一致
- 导出 `SCORE_TIER_CLASSES` 常量数组用于批量清除 class，避免硬编码字符串
- CSS 使用 `!important` 确保分级 class 覆盖内联 style（`updateHUD()` 中的 progress-based 颜色）
- `score-rainbow` 使用 `background-clip: text` + `-webkit-text-fill-color: transparent` 实现渐变文字
- ScorePopup 侧彩虹档使用 `#a855f7`（紫色）近似，因 PixiJS Text 不支持渐变 fill
- 全部 2884 个测试通过，零回归

### Code Review Fixes (Opus 4.6)

- **H1**: `updateSettlementLive()` 漏应用颜色分级 — 补充 `classList.remove/add` 逻辑
- **H2**: ScorePopup 传奇档 `#ffffff` 与默认 `#eaeaea` 难以区分 — 添加金色粗 stroke (`width: 4`)
- **M1**: `updateHUD()` 每帧重启 CSS 动画 — 引入 `lastScoreTier` 缓存 + 战斗开始时重置
- **M2**: `.score-rainbow` 缺少 `color: transparent !important` — Firefox/非 Webkit 兼容
- **L1**: 所有分级 CSS class 添加 `will-change: transform, filter` GPU 加速提示
- **L2**: `legendaryPulse` 添加 `animation-fill-mode: forwards` 保持结束状态

### File List

- `src/src/effects/juice.ts` — 新增 `getScoreTier()` 函数 + `SCORE_TIER_CLASSES` 常量
- `src/src/style.css` — 新增 4 个分级 CSS class + `legendaryPulse` keyframe
- `src/src/systems/battle.ts` — `showSettlementComplete()` 和 `updateHUD()` 集成颜色分级
- `src/src/ui/effects/ScorePopup.ts` — `calculateColor()` 和 `calculateFontSize()` 扩展为 5 档
- `src/tests/unit/effects/juice.test.ts` — 新增 8 个 `getScoreTier` 单元测试
- `src/tests/unit/ui/effects/ScorePopup.test.ts` — 新增 2 个 5 档颜色分级测试
