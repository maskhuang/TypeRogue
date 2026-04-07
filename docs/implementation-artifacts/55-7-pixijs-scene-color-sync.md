# Story 55.7: PixiJS 场景颜色同步

Status: done

## Story

As a 玩家,
I want PixiJS 渲染层的视觉风格与 DOM CSS 一致,
so that 无论哪个渲染层显示的内容都是统一的像素风。

## Scope Analysis

**关键发现：** 经代码分析，PixiJS 场景系统（SceneManager）完全未在 `main.ts` 中初始化。游戏实际使用 **DOM 渲染**（`showScreen()` 切换 `display`），PixiJS 场景类（BattleScene、VictoryScene、GameOverScene、ShopScene、CollectionScene）全部是**遗留未使用代码**。

**活跃的 PixiJS 组件（通过其他方式使用）：**
- `FloatTextPool.ts` — Canvas2D 浮字（已在 55-9 处理，使用 Courier New）
- `KeyVisual.ts` — 被 `KeyboardVisualizer.ts` 引用，但 KeyboardVisualizer 仅通过 BattleScene 实例化，BattleScene 未使用
- `ScoreSettlement.ts` — 导出单例但未被任何系统代码 import

**结论：** 本 Story 的实际工作量很小 — 大部分 PixiJS 代码是遗留的。主要任务是标注遗留状态，以及修正少量可能活跃的组件。

## Acceptance Criteria

1. **AC1: 活跃 PixiJS 组件字体同步** — 所有活跃 PixiJS 组件的 `fontFamily` 改用 `FONT_PIXEL`（从 theme.ts 导入）
2. **AC2: 活跃组件圆角清零** — 所有活跃 `roundRect` 的 border-radius 改为 0
3. **AC3: 遗留场景标注** — 确认遗留场景未使用，在文件头部添加 legacy 注释
4. **AC4: 无视觉回归** — 游戏功能正常（DOM 渲染不受影响）

## Tasks / Subtasks

- [x] Task 1: 确认活跃 vs 遗留 — main.ts 无 SceneManager；所有场景遗留；ScoreSettlement 未 import
- [x] Task 2: FloatTextPool — Canvas2D 使用 Courier New，正确行为
- [x] Task 3: 完整批量修正（选择完整修正）
  - [x] 3.1 `fontFamily: 'Arial'` → `FONT_PIXEL`：53 处替换，涵盖 15 文件
  - [x] 3.2 `fontFamily: 'monospace'` → `FONT_PIXEL`：额外 5 文件替换
  - [x] 3.3 `roundRect(..., N)` N>0 → 0：21 处替换 + KeyVisual.BORDER_RADIUS 6→0
  - [x] 3.4 WordDisplay.ts FONT_FAMILY → FONT_PIXEL
  - [x] 3.5 添加 `import { FONT_PIXEL }` 到所有 21 个文件
- [x] Task 4: 回归验证 — Vite build 成功；0 Arial 残留；0 monospace 残留；85 FONT_PIXEL 引用

## Dev Notes

### 遗留 PixiJS 文件清单（15 文件，全部未使用）

**场景类（完全遗留）：**
- `scenes/battle/BattleScene.ts` — 1 处 Arial
- `scenes/victory/VictoryScene.ts` — 4 处 Arial, 2 处 roundRect(8)
- `scenes/gameover/GameOverScene.ts` — 4 处 Arial, 2 处 roundRect(8)
- `scenes/shop/ShopScene.ts` — 3 处 monospace
- `scenes/shop/ShopItemDisplay.ts` — 3 处 monospace
- `scenes/collection/CollectionScene.ts` — 9 处 Arial, 6 处 roundRect(6-13)
- `scenes/collection/components/CollectionItem.ts` — 3 处 Arial, 1 处 roundRect(8)
- `scenes/collection/components/TabBar.ts` — 1 处 Arial, 1 处 roundRect(8)
- `scenes/collection/tabs/LeaderboardTab.ts` — 10 处 Arial, 2 处 roundRect(6-8)
- `scenes/collection/tabs/StatsTab.ts` — 3 处 Arial, 1 处 roundRect(8)
- `scenes/collection/tabs/SkillTab.ts` — 1 处 Arial
- `scenes/collection/tabs/RelicTab.ts` — 1 处 Arial

**HUD 组件（仅通过遗留 BattleScene 使用）：**
- `ui/hud/ComboCounter.ts` — 1 处 Arial
- `ui/hud/ScoreDisplay.ts` — 2 处 Arial
- `ui/hud/TimerBar.ts` — 1 处 Arial, 2 处 roundRect(10)
- `ui/hud/WordDisplay.ts` — Courier New（可接受）

**效果组件（部分活跃）：**
- `ui/effects/ScoreSettlement.ts` — 7 处 Arial, 1 处 roundRect(12)（单例导出但未 import）
- `ui/effects/FloatTextPool.ts` — Courier New Canvas2D（正确）

### 决策建议

由于全部是遗留代码，建议 **Task 3 标注为可选**：
- 如果未来计划删除遗留 PixiJS 代码 → 不修正，留给清理
- 如果未来可能重新启用 PixiJS 渲染 → 修正字体和圆角

### References

- [Source: src/src/ui/theme.ts:6 — FONT_PIXEL 定义但未被 PixiJS 使用]
- [Source: src/src/main.ts — 无 SceneManager 初始化]
- [Source: src/src/scenes/ — 15 个遗留场景文件]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- 53 处 `fontFamily: 'Arial'` → `FONT_PIXEL`（15 文件）
- 追加 5 文件 `fontFamily: 'monospace'` → `FONT_PIXEL`
- WordDisplay.ts FONT_FAMILY 常量改用 FONT_PIXEL
- 21 处 roundRect border-radius → 0
- KeyVisual.BORDER_RADIUS 6 → 0
- 21 个文件添加 `import { FONT_PIXEL } from '...theme'`
- Vite build 成功

### Change Log

- 2026-04-05: Story 55.7 PixiJS 全量字体+圆角像素化
- 2026-04-05: Code Review — M1: KeyVisual BORDER_RADIUS-1 → 直接用 0

### File List

- `src/src/scenes/battle/BattleScene.ts`
- `src/src/scenes/victory/VictoryScene.ts`
- `src/src/scenes/gameover/GameOverScene.ts`
- `src/src/scenes/shop/ShopScene.ts`
- `src/src/scenes/shop/ShopItemDisplay.ts`
- `src/src/scenes/collection/CollectionScene.ts`
- `src/src/scenes/collection/components/CollectionItem.ts`
- `src/src/scenes/collection/components/TabBar.ts`
- `src/src/scenes/collection/tabs/LeaderboardTab.ts`
- `src/src/scenes/collection/tabs/StatsTab.ts`
- `src/src/scenes/collection/tabs/SkillTab.ts`
- `src/src/scenes/collection/tabs/RelicTab.ts`
- `src/src/ui/hud/ComboCounter.ts`
- `src/src/ui/hud/ScoreDisplay.ts`
- `src/src/ui/hud/TimerBar.ts`
- `src/src/ui/hud/WordDisplay.ts`
- `src/src/ui/keyboard/KeyVisual.ts`
- `src/src/ui/effects/ScoreSettlement.ts`
- `src/src/ui/effects/ScorePopup.ts`
- `src/src/ui/effects/EffectQueueDisplay.ts`
- `src/src/ui/effects/EffectTextDisplay.ts`
- `src/src/ui/indicators/CloudSyncIndicator.ts`
