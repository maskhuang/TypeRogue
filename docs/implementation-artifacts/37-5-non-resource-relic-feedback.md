# Story 37.5: 非资源遗物触发反馈（标签+图标脉冲）

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 玩家,
I want 有明确触发时刻的非资源遗物（打字蜡封/余韵护盾/爵士乐/节奏适应/雪球效应）在触发时遗物图标产生脉冲动画，并在效果位置弹出带遗物图标的标签,
so that 我能清晰感知每个遗物何时触发、效果影响了哪里，形成完整的遗物反馈体验.

## Background

Stories 37-1~37-4 + 37-6 已建立完整的遗物飞行反馈基础设施：
- **37-1**: `flashRelicLine()` 闪光连线系统（CSS 动画 + 绝对定位）
- **37-2**: `getRelicIndex()` 遗物 HUD 索引辅助函数
- **37-3**: `relicAnchor` 资源遗物飞行动画（从图标飞向资源 UI）
- **37-4**: `resolveChainAnchor` 链式触发覆盖锚点
- **37-6**: `TriggerResult.triggerKey` 词条链式飞行独立定位

本 Story 处理**非资源遗物**——它们不产出 time/gold/score 资源，而是修改倍率、免除错误、保留 combo 等。需要统一的视觉反馈模式：**遗物图标脉冲 + 效果位置标签弹出**。

## Acceptance Criteria

1. **遗物图标脉冲** — 非资源遗物触发时，HUD 中对应的遗物图标执行 `scale(1.3)` + 主题色 `box-shadow` 脉冲动画，300ms 回弹
2. **打字蜡封标签** — `typing_wax_seal` 首次错误免除时，出错字母位置弹出 `🕯️` 标签 + 遗物图标脉冲
3. **余韵护盾标签** — `combo_buffer` combo 中断保留时，出错字母位置弹出 `🛡️+{buffered}` 标签 + 遗物图标脉冲
4. **爵士乐标签** — `jazz` 词条多样性加成时，结算面板位置弹出 `+{N}% 🎷` 标签 + 遗物图标脉冲
5. **节奏适应标签** — `rhythm_adapt` 快速打字加分时，结算面板位置弹出 `+30% 🎵` 标签 + 遗物图标脉冲
6. **雪球效应标签** — `snowball` 每词递增加分时，结算面板位置弹出 `+{N}% ⛄` 标签 + 遗物图标脉冲
7. **多遗物同时触发** — 同一时刻多个非资源遗物触发时，各自独立动画不冲突
8. **编译通过** — `npx vite build` 无新增错误
9. **测试通过** — `npx vitest run` 无新增失败

## Tasks / Subtasks

- [x] Task 1: CSS 遗物脉冲动画 (AC: #1)
  - [x] 1.1 `style.css` 新增 `.relic-pulse` 类：`scale(1.3)` + `box-shadow` + `transition 300ms ease-out`
  - [x] 1.2 动画结束后自动移除 `.relic-pulse` 类（`transitionend` 事件）

- [x] Task 2: 图标脉冲辅助函数 (AC: #1, #7)
  - [x] 2.1 `battle.ts` 新增 `pulseRelicIcon(relicId: string, color?: string): void` — 获取遗物 HUD 图标元素，添加 `.relic-pulse` 类 + 自定义 box-shadow 颜色
  - [x] 2.2 使用 `transitionend` 监听自动移除 `.relic-pulse`，确保多次触发互不干扰

- [x] Task 3: 打字蜡封反馈接入 (AC: #2)
  - [x] 3.1 `battle.ts` `playerWrong()` L624: `checkWaxSealForgive()` 成功后，追加 `pulseRelicIcon('typing_wax_seal', '#ff9500')`
  - [x] 3.2 现有 `showFeedback('🕯️', '#ff9500')` 已在正确位置，保留不变（已在出错字母上方显示）

- [x] Task 4: 余韵护盾反馈接入 (AC: #3)
  - [x] 4.1 `battle.ts` `endCombo()` L685-686: `buffered > 0` 时追加 `pulseRelicIcon('combo_buffer', '#4ecdc4')`
  - [x] 4.2 现有 `showFeedback(t('battle.combo_buffer', ...), '#4ecdc4')` 保留

- [x] Task 5: 爵士乐反馈接入 (AC: #4)
  - [x] 5.1 `battle.ts` `completeWord()` L750-753: `jazzBonus > 0` 时追加 `pulseRelicIcon('jazz', '#ffaa00')`
  - [x] 5.2 现有 `showFeedback` 保留

- [x] Task 6: 节奏适应反馈接入 (AC: #5)
  - [x] 6.1 `battle.ts` `completeWord()` L766-768: `rhythmResult.scoreMult > 1` 时追加 `pulseRelicIcon('rhythm_adapt', '#ffe66d')`
  - [x] 6.2 现有 `showFeedback` 保留

- [x] Task 7: 雪球效应反馈接入 (AC: #6)
  - [x] 7.1 `battle.ts` `completeWord()` L796-800: `finalWordScore > preSnowball` 时追加 `pulseRelicIcon('snowball', '#88ccff')`
  - [x] 7.2 现有 `showFeedback` 保留

- [x] Task 8: 测试验证 (AC: #8, #9)
  - [x] 8.1 编译通过 (759ms)
  - [x] 8.2 现有测试无回归（144 failures 全为既存，stash 验证 212 failures before）

## Dev Notes

### 核心设计：遗物图标脉冲

**CSS 实现（style.css）：**
```css
.relic-pulse {
  transform: scale(1.3);
  box-shadow: 0 0 8px var(--pulse-color, #ffffff);
  transition: transform 300ms ease-out, box-shadow 300ms ease-out;
}
```

**JS 辅助函数（battle.ts）：**
```typescript
function pulseRelicIcon(relicId: string, color?: string): void {
  const idx = getRelicIndex(relicId);
  if (idx < 0) return;
  const el = getElements().playerRelics.children[idx] as HTMLElement | undefined;
  if (!el) return;
  if (color) el.style.setProperty('--pulse-color', color);
  el.classList.remove('relic-pulse');      // 重置（允许连续触发）
  void el.offsetWidth;                     // 强制 reflow
  el.classList.add('relic-pulse');
  el.addEventListener('transitionend', () => {
    el.classList.remove('relic-pulse');
    el.style.removeProperty('--pulse-color');
  }, { once: true });
}
```

**注意事项：**
- `void el.offsetWidth` 强制 reflow 确保 CSS transition 重新触发
- `{ once: true }` 避免事件监听器泄漏
- 使用 CSS custom property `--pulse-color` 而非 inline style，保持 CSS 管理颜色

### 现有反馈代码位置

| 遗物 | 遗物 ID | 触发位置 | 代码行号 | 现有反馈 |
|------|---------|---------|---------|---------|
| 打字蜡封 | `typing_wax_seal` | `playerWrong()` | L624-628 | `showFeedback('🕯️', '#ff9500')` |
| 余韵护盾 | `combo_buffer` | `endCombo()` | L685-686 | `showFeedback(t('battle.combo_buffer', ...), '#4ecdc4')` |
| 爵士乐 | `jazz` | `completeWord()` | L750-753 | `showFeedback(t('battle.jazz', ...), '#ffaa00')` |
| 节奏适应 | `rhythm_adapt` | `completeWord()` | L766-768 | `showFeedback(t('battle.rhythm_fast', ...), '#ffe66d')` |
| 雪球效应 | `snowball` | `completeWord()` | L796-800 | `showFeedback(t('battle.snowball', ...), '#88ccff')` |

### 不需要修改的

- **showFeedback 签名** — 无需扩展，非资源遗物的标签用现有 `showFeedback(text, color)` 即可
- **飞行动画** — 非资源遗物没有资源飞行，只有就地标签 + 图标脉冲
- **遗物效果逻辑** — 本 Story 仅改视觉反馈，不改遗物实际效果
- **闪光连线** — 非资源遗物不使用闪光连线（没有"从→到"的因果关系需要表达）

### 边界情况

- **玩家没有该遗物** — `getRelicIndex` 返回 -1 → `pulseRelicIcon` 提前 return，无影响
- **同一帧多遗物触发** — 每个遗物独立的 DOM 元素，CSS transition 互不干扰
- **快速连续触发** — `classList.remove` + `offsetWidth` + `classList.add` 模式确保每次都重新触发动画
- **节奏适应慢速** — `rhythmResult.timeBonus > 0` 走 setTimeout 延迟加时间，不是分数倍率，不需要脉冲（Epic spec 只列了快速打字加分的情况）

### Project Structure Notes

- 所有修改集中在 `src/src/systems/battle.ts` 和 `src/src/style.css`
- 遵循现有遗物反馈模式：在各个触发点（playerWrong/endCombo/completeWord）的 showFeedback 调用旁追加 pulseRelicIcon
- `getRelicIndex` 已在 battle.ts 中定义（L2261），直接复用

### References

- [Source: src/docs/epic-relic-feedback-flight.md — Story 5 规格]
- [Source: docs/implementation-artifacts/37-1-flash-line-system.md — 闪光连线基础设施]
- [Source: docs/implementation-artifacts/37-3-resource-relic-flight.md — relicAnchor 模式参考]
- [Source: src/src/systems/battle.ts L619-628 — playerWrong 蜡封触发]
- [Source: src/src/systems/battle.ts L680-690 — endCombo 余韵护盾]
- [Source: src/src/systems/battle.ts L750-800 — completeWord 结算遗物]
- [Source: src/src/style.css L593-606 — 现有 relic-icon + relic-flash-line 样式]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- CSS `.relic-pulse` 类：`scale(1.3)` + `box-shadow` + CSS custom property `--pulse-color`
- `.relic-icon` 基类追加 `transition: transform 300ms ease-out, box-shadow 300ms ease-out`
- `pulseRelicIcon(relicId, color?)` 辅助函数：remove→reflow→add 模式确保连续触发
- `transitionend` + `{ once: true }` 自动清理，无事件泄漏
- 5 个非资源遗物触发点均追加 `pulseRelicIcon` 调用
- 编译 759ms 通过，测试无新增回归
- **Code Review 修复**:
  - M1: 改用 CSS `animation`（`@keyframes relicPulse`）替代 `transition`，消除 `void el.offsetWidth` 强制 reflow
  - M2: 新增 4 个测试（relic-pulse.test.ts）
  - L1: 移除 `.relic-icon` 基类上的 transition，不影响未来交互
  - L2: `animationend` 替代 `transitionend`，无监听器累积

### Change Log

- 2026-03-14: Implemented non-resource relic feedback (Story 37-5)
- 2026-03-14: Code review fixes — CSS animation + tests + cleanup

### File List

- `src/src/style.css` — 新增 `.relic-pulse` 类 + `@keyframes relicPulse` 动画
- `src/src/systems/battle.ts` — 新增 `pulseRelicIcon` 函数 + 5 个触发点接入
- `src/tests/unit/systems/relic-pulse.test.ts` — 新增 4 个测试
