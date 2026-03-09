# Story 31.4: 数字动画系统

Status: done

## Story

As a 玩家,
I want 分数数字有滚轮翻转、弹性弹出和高分慢动作效果,
so that 我能通过动态数字感受 build 的冲击力，形成视-听-触-动四通道反馈闭环。

## Acceptance Criteria

1. **滚轮计数** — 词语结算时 `#score-count` 的分数从旧值平滑滚动到新值，速率与差值成正比（差值越大滚动越快），持续 0.3-0.8s
2. **弹性弹出** — 分数 ≥ 1000 的词结算时 `#score-count` 以弹性曲线放大（overshoot 到 120-140% → settle 回 100%），弹出幅度随分数量级增大
3. **慢动作结算** — 分数 ≥ 1000 的词结算时全局游戏速度降至 0.7x，持续 0.3s 后恢复，提供 "大招命中" 时间停滞感
4. **动画帧驱动** — 所有动画使用 `requestAnimationFrame` 或游戏循环 `dt`，不依赖 `setTimeout`/`setInterval`
5. **快速连续结算** — 新词完成时立即跳到当前目标值并启动新滚动，不排队等待
6. **60fps 无卡顿** — 所有动画使用 CSS GPU 加速属性（`transform`），不引入 layout/paint
7. **单元测试** — 滚轮速率函数 + 弹出缩放函数的纯函数测试

## Tasks / Subtasks

- [x] Task 1: 实现滚轮计数动画 (AC: 1, 4, 5)
  - [x] 在 `src/effects/juice.ts` 新增 `ScoreRoller` class 管理滚动状态
  - [x] 状态：`currentDisplay: number`, `target: number`, `elapsed: number`, `duration: number`
  - [x] `setTarget(newTarget)`: 若正在滚动则 `currentDisplay` 跳到旧目标，开始新滚动
  - [x] `update(dt)`: 使用 easeOutCubic 从 currentDisplay 过渡到 target
  - [x] `getDuration(diff)`: 纯函数，`clamp(0.3, 0.3 + log10(diff) * 0.15, 0.8)` 返回动画时长
  - [x] 修改 `battle.ts updateHUD()` 中 `el.score.textContent` 赋值改为调用 `scoreRoller.setTarget(state.score)`, 在游戏循环中调 `scoreRoller.update(dt)`
  - [x] 在 `battle.ts` 中添加 `requestAnimationFrame` 循环驱动 `scoreRoller.update()`（与现有 DOM 更新流合并）
- [x] Task 2: 实现弹性弹出动画 (AC: 2, 6)
  - [x] 在 `src/effects/juice.ts` 新增 `getScoreBumpScale(score: number): number` 纯函数
  - [x] 返回 CSS scale 值：<1000 → 1.0（不弹）, 1000-4999 → 1.3, 5000-9999 → 1.5, 10000+ → 1.8
  - [x] 新增 CSS 变量 `--bump-scale` 驱动 `scoreBump` 动画幅度
  - [x] 修改 `@keyframes scoreBump` 的 40% 关键帧使用 `var(--bump-scale, 1.5)`
  - [x] 修改 `bumpScore()` 接受 `wordScore` 参数，设置 `--bump-scale` 后触发动画
  - [x] 修改 `battle.ts` 调用 `bumpScore(finalWordScore)`
- [x] Task 3: 实现慢动作结算 (AC: 3, 4)
  - [x] 在 `src/effects/juice.ts` 新增 `SlowMotion` 模块级状态管理
  - [x] `triggerSlowMotion(durationMs = 300, scale = 0.7)`: 启动减速
  - [x] `getTimeScale(): number`: 返回当前时间缩放（1.0 或 slowmo 值），帧驱动渐进恢复
  - [x] 跳过 CSS 微放大效果（简化：仅影响计时器速度，不引入视觉缩放）
  - [x] 修改 `battle.ts completeWord()`: `finalWordScore >= 1000` 时调用 `triggerSlowMotion()`
  - [x] 慢动作期间 `updateTimer()` 的时间流逝乘以 `getTimeScale()`
- [x] Task 4: 单元测试 (AC: 7)
  - [x] 在 `src/tests/unit/effects/juice.test.ts` 新增 `ScoreRoller` describe 块
  - [x] 测试 `getDuration(diff)`: 小差值→0.3s, 大差值→0.8s, 边界值
  - [x] 测试 `getScoreBumpScale(score)`: 4 档阈值边界测试
  - [x] 测试 `ScoreRoller.setTarget()` 快速连续调用时跳到旧目标

## Dev Notes

### 架构要点

- **DOM 分数显示**：本项目的战斗 HUD 分数使用 DOM 元素 `#score-count`，不是 PixiJS 组件。`updateHUD()` 直接设置 `el.score.textContent`。PixiJS 的 `ScoreDisplay` 组件存在但为辅助显示，主 HUD 是 DOM
- **滚轮 ≠ 老虎机**：Epic 描述 "像老虎机逐位翻滚"，但 DOM 单个 `textContent` 元素实现逐位动画成本极高（需拆分为独立 digit 容器 + 滚动条）。**推荐简化为平滑数字计数**（从旧值匀速递增到新值），视觉效果类似且实现成本低
- **弹性弹出用 CSS**：现有 `scoreBump` 动画已有 overshoot 效果（scale 1→1.5→1），扩展为可变幅度即可
- **慢动作影响范围**：仅影响计时器倒计时速度，**不影响**打字输入响应和音效播放（保持手感）
- **帧驱动方案**：battle.ts 无现有 `requestAnimationFrame` 循环，需新增。PixiJS BattleScene 有 `update(dt)` 但 DOM HUD 更新在 battle.ts 的事件回调中，不在帧循环中

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/effects/juice.ts` | 动画工具 | 新增 `ScoreRoller`, `getScoreBumpScale()`, `SlowMotion` |
| `src/systems/battle.ts` | 战斗逻辑 | 改造 `updateHUD()` 分数更新、`bumpScore()` 参数、慢动作触发、帧循环 |
| `src/style.css` | 样式 | `scoreBump` 动画改用 CSS 变量 |
| `src/tests/unit/effects/juice.test.ts` | 测试 | 新增滚轮/弹出/慢动作测试 |

### 现有代码模式（必须遵循）

**当前 `updateHUD()` 分数赋值（需改造 L981）：**
```typescript
// battle.ts L978-1002
export function updateHUD(): void {
  const el = getElements();
  el.combo.textContent = String(state.combo);
  el.score.textContent = String(Math.floor(state.score)); // ← 改为 scoreRoller 驱动
  // ...
  // 分数颜色分级 — 高分时覆盖进度颜色 (Story 31.1)
  const scoreTier = getScoreTier(state.score);
  if (scoreTier !== lastScoreTier) {
    el.score.classList.remove(...SCORE_TIER_CLASSES);
    if (scoreTier) el.score.classList.add(scoreTier);
    lastScoreTier = scoreTier;
  }
}
```

**当前 `bumpScore()` 实现（需扩展）：**
```typescript
// juice.ts L50-55
export function bumpScore(): void {
  const el = getElements();
  el.score.classList.remove('score-bump');
  void el.score.offsetWidth;
  el.score.classList.add('score-bump');
}
```

**当前 CSS `scoreBump` 动画（需参数化）：**
```css
/* style.css L817-825 */
.score-bump {
    animation: scoreBump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes scoreBump {
    0% { transform: scale(1); }
    40% { transform: scale(1.5); color: #4ecdc4; }
    100% { transform: scale(1); }
}
```

**`completeWord()` 中分数更新流程（L362-389）：**
```typescript
showSettlementComplete(baseChips, finalMult, finalWordScore); // 结算面板
state.score += finalWordScore;  // 状态更新
bumpScore();                     // CSS 弹跳 ← 改为 bumpScore(finalWordScore)
// ... 事件、字母弹跳 ...
const shakeIntensity = getShakeIntensity(finalWordScore);
if (shakeIntensity > 0) screenShake(shakeIntensity);
playScoreSound(finalWordScore);
```

### ScoreRoller 设计

```typescript
// juice.ts — 滚轮计数器
export class ScoreRoller {
  private currentDisplay = 0;
  private target = 0;
  private elapsed = 0;
  private duration = 0;
  private startValue = 0;

  /** 设置新目标分数 */
  setTarget(newTarget: number): void {
    if (newTarget === this.target) return;
    // 正在滚动时跳到旧目标，开始新滚动
    this.currentDisplay = this.target;
    this.startValue = this.currentDisplay;
    this.target = newTarget;
    this.elapsed = 0;
    this.duration = ScoreRoller.getDuration(Math.abs(newTarget - this.startValue));
  }

  /** 帧更新，返回当前显示值 */
  update(dt: number): number {
    if (this.currentDisplay === this.target) return this.currentDisplay;
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const eased = easeOutCubic(t);
    this.currentDisplay = Math.floor(this.startValue + (this.target - this.startValue) * eased);
    if (t >= 1) this.currentDisplay = this.target;
    return this.currentDisplay;
  }

  /** 纯函数：根据差值计算动画时长 */
  static getDuration(diff: number): number {
    if (diff <= 0) return 0.3;
    return Math.min(0.8, 0.3 + Math.log10(diff) * 0.15);
  }

  getValue(): number { return this.currentDisplay; }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

### 弹性弹出参数

```typescript
// juice.ts
export function getScoreBumpScale(score: number): number {
  if (score >= 10000) return 1.8;  // 传奇
  if (score >= 5000) return 1.5;   // 彩虹
  if (score >= 1000) return 1.3;   // 金色
  return 1.0;                      // 默认（不弹出，但仍有基础 scoreBump）
}
```

CSS 变量驱动：
```css
.score-bump {
    animation: scoreBump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes scoreBump {
    0% { transform: scale(1); }
    40% { transform: scale(var(--bump-scale, 1.5)); color: #4ecdc4; }
    100% { transform: scale(1); }
}
```

### 慢动作设计

```typescript
// juice.ts — 慢动作模块
let slowMotionEndTime = 0;
let slowMotionScale = 1.0;

export function triggerSlowMotion(durationMs = 300, scale = 0.7): void {
  slowMotionEndTime = performance.now() + durationMs;
  slowMotionScale = scale;
}

export function getTimeScale(): number {
  if (performance.now() < slowMotionEndTime) return slowMotionScale;
  return 1.0;
}
```

**影响范围：** 仅 `battle.ts` 计时器倒计时速度乘以 `getTimeScale()`。打字输入、音效、UI 动画不受影响。

### 帧循环集成方案

battle.ts 目前没有 `requestAnimationFrame` 循环。需要新增：

```typescript
// battle.ts — 新增帧循环
let lastFrameTime = 0;
let animFrameId = 0;

function battleAnimLoop(now: number): void {
  const dt = (now - lastFrameTime) / 1000; // 秒
  lastFrameTime = now;

  // 滚轮更新
  const displayed = scoreRoller.update(dt);
  el.score.textContent = String(displayed);

  animFrameId = requestAnimationFrame(battleAnimLoop);
}

// 在 startBattle() 中启动，endBattle() 中 cancelAnimationFrame
```

### 避免的陷阱

- **不要** 实现真正的逐位老虎机效果（拆分 DOM 为独立 digit 容器 + 滚动条），成本极高且与现有 `#score-count` 单元素架构不兼容
- **不要** 用 `setInterval` 或 `setTimeout` 驱动动画 — 必须用 `requestAnimationFrame`
- **不要** 让慢动作影响打字输入延迟 — 仅影响计时器
- **不要** 在 `updateHUD()` 每次调用时重置滚轮状态 — `updateHUD()` 会频繁调用（每次按键），滚轮应持续平滑滚动
- **不要** 修改 PixiJS `ScoreDisplay.ts` — 本 Story 只改 DOM HUD 分数显示
- **不要** 在 `updateHUD()` 中直接赋值 `el.score.textContent` — 改为由帧循环中的 `scoreRoller` 驱动
- **不要** 创建新的测试文件 — 扩展现有 `juice.test.ts`

### 分数进度颜色兼容

当前 `updateHUD()` 基于 `progress = state.score / state.targetScore` 设置颜色。滚轮化后 `state.score` 仍实时更新（立即 `+=`），颜色分级仍基于 `state.score`（实际值），不基于 `scoreRoller` 的显示值。这意味着颜色会先变化，数字后滚到位，**这是期望行为**（视觉上先闪色再数字追上）。

### 性能约束

- `requestAnimationFrame` 回调仅更新 1 个 DOM 元素的 `textContent`，帧预算 < 0.1ms
- `easeOutCubic` 是纯数学运算，O(1)
- CSS `scoreBump` 动画使用 `transform`（GPU 加速），不触发 layout/paint
- 慢动作检查 `performance.now()` 对比单个数值，O(1)

### 前序 Story 经验

**来自 Story 31-1（颜色分级）：**
- `updateHUD()` 中使用 `lastScoreTier` 缓存避免每帧重启 CSS 动画
- 颜色分级基于 `state.score` 实际值，不基于显示值

**来自 Story 31-2（屏幕震动）：**
- 模块级状态管理：`currentShakeIntensity`, `shakeTimer`
- `as const` 查表 + setter 模式

**来自 Story 31-3（数字音效）：**
- 纯函数分级放 `juice.ts`，与现有函数同模式
- Code review 发现 `softAttack` 重复 → 提取为模块级
- dead code 清理（`getWordProfile`, `playSound('word')` 分支）

**对本 Story 的启示：**
- `ScoreRoller` 用 class 封装状态（比散落的模块变量更清晰）
- `SlowMotion` 用模块级函数（简单状态，不需要 class）
- `getScoreBumpScale()` 纯函数放 `juice.ts`，可测试
- 帧循环需在战斗开始时启动、结束时清理（避免内存泄漏）

### Project Structure Notes

- 源码在 `src/src/`，测试在 `src/tests/unit/`
- 动画工具在 `src/src/effects/juice.ts`
- 战斗逻辑在 `src/src/systems/battle.ts`
- 样式在 `src/src/style.css`
- 测试在 `src/tests/unit/effects/juice.test.ts`
- 命名规范：camelCase 函数名，PascalCase 类名

### References

- [Source: docs/stories/epic-21-number-juice.md#Story31.4] — 验收标准与动画特征表
- [Source: src/src/systems/battle.ts#L978-1002] — updateHUD() 分数赋值
- [Source: src/src/systems/battle.ts#L362-389] — completeWord() 结算流程
- [Source: src/src/effects/juice.ts#L50-55] — bumpScore() 现有实现
- [Source: src/src/style.css#L817-825] — @keyframes scoreBump 现有动画
- [Source: src/src/style.css#L123-128] — #score-count 样式
- [Source: src/src/ui/hud/ScoreDisplay.ts] — PixiJS 分数显示组件（不修改）
- [Source: src/src/ui/elements.ts#L16] — DOM score 元素引用
- [Source: docs/implementation-artifacts/31-1-number-color-grading.md] — 前序 Story 颜色分级
- [Source: docs/implementation-artifacts/31-2-screen-shake-grading.md] — 前序 Story 屏幕震动
- [Source: docs/implementation-artifacts/31-3-number-sound-effects.md] — 前序 Story 音效分级
- [Source: docs/game-architecture.md#L79-86] — 性能约束（60fps, <16ms 输入延迟）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- Task 3 简化：跳过 CSS `transform: scale(1.005)` 微放大效果，仅实现计时器减速。视觉减速效果已由弹性弹出（Task 2）覆盖
- Task 3 跳过 CSS 微放大：不需要额外 `#game-container` transition，避免影响战斗画面的其他 transform 动画
- 滚轮计数使用独立 rAF 循环（`scoreRollerTick`），与 battle.ts 事件驱动的 HUD 更新分离
- 40 个单元测试全部通过（25 existing + 15 new）
- TypeScript 编译无新增错误

**Code Review 修复 (2026-03-08):**
- H1: 添加 ScoreRoller.reset() 方法，startLevel() 中调用 reset(0) 防止关卡间分数回滚
- H2: getScoreBumpScale 默认值从 1.0 改为 1.5（保持原有弹跳反馈），序列调整为 1.5→1.6→1.8→2.0
- M1: updateHUD() 增加 textContent fallback，解决 rAF 未启动时显示间隙
- M2: File List 补充 sprint-status.yaml
- 新增 reset() 测试 + 单调递增测试（38→40 tests）

### File List

- `src/src/effects/juice.ts` — 新增 ScoreRoller class, getScoreBumpScale(), triggerSlowMotion()/getTimeScale(), easeOutCubic(); 修改 bumpScore() 接受 wordScore 参数
- `src/src/systems/battle.ts` — 新增 scoreRoller 实例/rAF 循环; 修改 updateHUD() 用 scoreRoller; 修改 completeWord() 传 finalWordScore + 慢动作; 修改 timer 乘 getTimeScale()
- `src/src/style.css` — @keyframes scoreBump 40% 改用 var(--bump-scale, 1.5)
- `src/tests/unit/effects/juice.test.ts` — 新增 ScoreRoller (7 tests) + getScoreBumpScale (6 tests)
- `docs/implementation-artifacts/sprint-status.yaml` — 31-4 状态更新
