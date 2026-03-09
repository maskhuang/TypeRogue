# Story 31.6: 关卡评级系统

Status: done

## Story

As a 玩家,
I want 关卡结束时以戏剧性动画揭示我的评级（C→SSS），每个等级有独特颜色、音效和特效,
so that 我能感受到 build 实力的量化反馈，追求更高评级成为驱动力。

## Acceptance Criteria

1. **6 级评级** — 根据 `score / targetScore` 比值计算评级：C（100-110%）、B（110-130%）、A（130-160%）、S（160-200%）、SS（200-300%）、SSS（300%+）
2. **评级揭示动画** — 关卡胜利后、进入商店前，全屏显示评级揭示：从 C 逐级滚动到最终评级，每级停顿 0.3s，配合颜色变化和递增音效
3. **6 级颜色体系** — C（灰色）、B（蓝色）、A（金色）、S（紫色+光效）、SS（彩虹+粒子）、SSS（全特效+脉冲）
4. **音效分级** — 每级评级揭示时播放递增音效（音高/音色递增），S 级以上有特殊和弦音
5. **SS/SSS 粒子特效** — SS 评级有金色粒子爆发，SSS 评级有彩虹粒子爆发 + 屏震
6. **评级存入 BattleStats** — 评级结果存入 `state.battleStats.rating`，商店统计面板可查看（已有）
7. **单元测试** — 评级计算纯函数的阈值边界测试 + 评级揭示配置数据测试

## Tasks / Subtasks

- [x] Task 1: 修订评级计算函数与评级配置数据 (AC: 1, 3, 6)
  - [x] 修改 `battle.ts` 中现有的 `calculateRating()` 阈值，匹配 Epic 设计的 6 档百分比
  - [x] 在 `src/effects/juice.ts` 新增 `RatingTier` 接口：`{ grade, color, glowColor, cssClass, particleCount, particleColor, shakeIntensity }`
  - [x] 新增 `RATING_TIERS: readonly RatingTier[]` 查表数组（6 档递增效果）
  - [x] 新增 `getRatingTier(grade: string): RatingTier` 查表函数
- [x] Task 2: 实现评级揭示覆盖层 DOM + CSS (AC: 2, 3)
  - [x] 在 `src/effects/juice.ts` 新增 `showRatingReveal(finalGrade: string, onComplete: () => void)` 函数
  - [x] 创建全屏覆盖层 `.rating-reveal`（`position: absolute; z-index: 400; pointer-events: none`）
  - [x] 中央显示评级字母，使用 `RATING_TIERS` 中的颜色/CSS
  - [x] 从 C 逐级滚动到最终评级：每 300ms 更新文字+颜色+CSS，到达最终评级后停留 800ms 然后淡出
  - [x] 在 `src/style.css` 新增 `.rating-reveal` + `.rating-grade-X` 系列 CSS（6 种颜色+动画）
  - [x] SSS 评级使用彩虹渐变 CSS（参照现有 `.score-rainbow`）
- [x] Task 3: 评级揭示音效 (AC: 4)
  - [x] 在 `src/effects/sound.ts` 新增 `playRatingSound(grade: string)` 函数
  - [x] 使用 Web Audio API 合成递增音高的评级音效（C→B→A 为单音上行，S/SS/SSS 为和弦）
  - [x] 滚动过程中每级播放对应音效，最终评级播放加强版
- [x] Task 4: SS/SSS 粒子与屏震 (AC: 5)
  - [x] 最终评级为 SS 时：`spawnParticles(gradeEl, 30, '#ffd700')` + `screenFlash('#ffd700', 0.3)`
  - [x] 最终评级为 SSS 时：`spawnParticles(gradeEl, 50, '#ff6b6b')` + `screenShake(4)` + `screenFlash('#ff6b6b', 0.4)`
- [x] Task 5: 集成到 battle.ts (AC: 2, 6)
  - [x] 在 `endLevel()` 胜利路径中，`calculateRating()` 之后、`openShop()`/`showRelicPicker()`/`showBossModifierPicker()` 之前插入 `showRatingReveal(rating, () => { ... })`
  - [x] 所有胜利路径（standard→shop、elite→relicPicker、boss→bossModifierPicker）统一包裹在 `showRatingReveal` 回调中
- [x] Task 6: 单元测试 (AC: 7)
  - [x] 在 `src/tests/unit/effects/juice.test.ts` 新增 `calculateRating` describe 块（6 档阈值边界）
  - [x] 新增 `RATING_TIERS` describe 块（6 档、递增效果值）
  - [x] 新增 `getRatingTier` describe 块（每个 grade 返回正确 tier）

## Dev Notes

### 架构要点

- **calculateRating() 已存在**：`battle.ts:679-688` 已实现 `calculateRating(score, targetScore)` 函数，但阈值与 Epic 设计不完全匹配，需修订
- **BattleStats.rating 已存在**：`types.ts:101` 已有 `rating: string` 字段，`endLevel():702` 已调用赋值
- **Shop 统计面板已显示评级**：`shop.ts:1461-1470` 已渲染 `.rating-badge`，CSS 已有 `.rating-gold`/`.rating-silver`/`.rating-bronze`
- **揭示层 ≠ 新场景**：评级揭示是全屏 DOM overlay（类似 `screenFlash`/`.milestone-popup`），不是新的 Scene。在 `endLevel()` 胜利路径中以回调形式阻塞 shop 打开
- **音效用 Web Audio 合成**：与 Story 31-3 `playScoreSound()` 模式一致，不引入新音频文件

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/systems/battle.ts` | 战斗逻辑 | 修订 `calculateRating()` 阈值；`endLevel()` 胜利路径包裹 `showRatingReveal()` 回调 |
| `src/effects/juice.ts` | 动画工具 | 新增 `RatingTier`, `RATING_TIERS`, `getRatingTier()`, `showRatingReveal()` |
| `src/effects/sound.ts` | 音效系统 | 新增 `playRatingSound(grade)` |
| `src/style.css` | 样式 | 新增 `.rating-reveal` + `.rating-grade-X` 系列 CSS |
| `src/tests/unit/effects/juice.test.ts` | 测试 | 新增 calculateRating + RATING_TIERS + getRatingTier 测试 |

### 现有代码模式（必须遵循）

**现有 `calculateRating()` 实现（需修订阈值）：**
```typescript
// battle.ts L679-688
export function calculateRating(score: number, targetScore: number): string {
  if (score < targetScore) return 'C';
  const overkillRatio = (score - targetScore) / targetScore;
  if (overkillRatio >= 2.0) return 'SSS';  // 300%+ → 保持
  if (overkillRatio >= 1.0) return 'SS';   // 200-300% → 保持
  if (overkillRatio >= 0.5) return 'S';    // 150-200% → 改为 0.6 (160%)
  if (overkillRatio >= 0.2) return 'A';    // 120-150% → 改为 0.3 (130%)
  return 'B';                               // 100-120% → 改为 0.1 (110%)
}
```

修订后阈值（overkill ratio = (score - target) / target）：
| 评级 | score/target | overkillRatio 阈值 |
|------|-------------|-------------------|
| C | < 100% (失败) | score < target |
| B | 100-110% | < 0.1 |
| A | 110-130% | 0.1 ≤ r < 0.3 |
| S | 130-160% | 0.3 ≤ r < 0.6 |
| SS | 160-200% | 0.6 ≤ r < 1.0 → 改为 200% (overkill ≥ 1.0) |
| SSS | 200%+ → 改为 300%+ (overkill ≥ 2.0) | ≥ 2.0 |

注意：Epic 原始设计 SS=200-300%、SSS=300%+。换算为 overkillRatio：SS=1.0-2.0、SSS=2.0+。S=160-200%→overkillRatio=0.6-1.0。A=130-160%→0.3-0.6。B=110-130%→0.1-0.3。

**现有 `endLevel()` 胜利路径（需包裹回调）：**
```typescript
// battle.ts L700-720
function endLevel(): void {
  // ... cleanup ...
  if (state.battleStats) {
    state.battleStats.rating = calculateRating(state.score, state.targetScore);
  }

  if (state.score >= state.targetScore) {
    const currentType = getStageType(state.level);
    if (currentType === 'boss') {
      advanceCycle();
      showBossModifierPicker(() => { ... openShop(true) });
      return;
    }
    if (currentType === 'elite' && hasUnownedRelics()) {
      showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.eliteDrop);
      return;
    }
    openShop(true);
  } else {
    gameOver();
  }
}
```

修改为：
```typescript
if (state.score >= state.targetScore) {
  const rating = state.battleStats?.rating || 'B';
  showRatingReveal(rating, () => {
    const currentType = getStageType(state.level);
    if (currentType === 'boss') {
      advanceCycle();
      showBossModifierPicker(() => { ... openShop(true) });
      return;
    }
    if (currentType === 'elite' && hasUnownedRelics()) {
      showRelicPicker(() => openShop(true), RELIC_WEIGHT_PRESETS.eliteDrop);
      return;
    }
    openShop(true);
  });
} else {
  gameOver();
}
```

**现有 shop 评级显示 CSS（已有，不修改）：**
```css
/* style.css L2829-2852 */
.rating-badge { font-size: 28px; font-weight: bold; color: #aaa; ... }
.rating-badge.rating-gold { color: #ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.6); }
.rating-badge.rating-silver { color: #c0c0c0; text-shadow: 0 0 8px rgba(192,192,192,0.5); }
.rating-badge.rating-bronze { color: #cd7f32; }
```

**现有 Web Audio 合成模式（sound.ts playScoreSound）：**
```typescript
// 参照 sound.ts L248-347 的 4 档合成模式
// 每档使用 OscillatorNode + GainNode + softAttack
const o = ctx.createOscillator();
const g = ctx.createGain();
o.type = 'sine'; // 或 'triangle', 'sawtooth'
o.frequency.setValueAtTime(freq, t);
g.gain.setValueAtTime(0, t);
g.gain.linearRampToValueAtTime(vol, t + 0.01); // softAttack
g.gain.exponentialRampToValueAtTime(0.001, t + decay);
o.connect(g).connect(ctx.destination);
o.start(t); o.stop(t + decay);
```

### 评级揭示动画设计

```
Timeline:
0ms     → 显示覆盖层，C 灰色
300ms   → B 蓝色 (如果最终 >= B)
600ms   → A 金色 (如果最终 >= A)
900ms   → S 紫色+光效 (如果最终 >= S)
1200ms  → SS 彩虹+粒子 (如果最终 >= SS)
1500ms  → SSS 全特效 (如果最终 >= SSS)
+800ms  → 停留在最终评级
+300ms  → 淡出
→ onComplete() 回调
```

每步：更新 `.rating-grade` 元素的 textContent + className + 播放 `playRatingSound(grade)`

最终评级到达时：
- 弹性放大动画（参照 `.milestone-popup` 的 `milestonePop`）
- SS/SSS: 额外粒子 + 屏震 + screenFlash

### RatingTier 配置数据

```typescript
export interface RatingTier {
  grade: string;
  color: string;
  glowColor: string;
  cssClass: string;
  particleCount: number;
  particleColor: string;
  shakeIntensity: number;
}

export const RATING_TIERS: readonly RatingTier[] = [
  { grade: 'C',   color: '#888888', glowColor: '',        cssClass: 'rating-c',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'B',   color: '#4a90d9', glowColor: '',        cssClass: 'rating-b',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'A',   color: '#ffd700', glowColor: '#ffd700', cssClass: 'rating-a',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'S',   color: '#a855f7', glowColor: '#a855f7', cssClass: 'rating-s',   particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { grade: 'SS',  color: '#ffd700', glowColor: '#ffd700', cssClass: 'rating-ss',  particleCount: 30, particleColor: '#ffd700', shakeIntensity: 0 },
  { grade: 'SSS', color: '#ff6b6b', glowColor: '#ff6b6b', cssClass: 'rating-sss', particleCount: 50, particleColor: '#ff6b6b', shakeIntensity: 4 },
];

const GRADE_ORDER = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
```

### showRatingReveal 设计

```typescript
export function showRatingReveal(finalGrade: string, onComplete: () => void): void {
  const el = getElements();
  const finalIdx = GRADE_ORDER.indexOf(finalGrade);
  if (finalIdx < 0) { onComplete(); return; } // 无效评级，跳过

  // 创建覆盖层
  const overlay = document.createElement('div');
  overlay.className = 'rating-reveal';
  const gradeEl = document.createElement('div');
  gradeEl.className = 'rating-grade';
  overlay.appendChild(gradeEl);
  el.container.appendChild(overlay);

  let step = 0;
  const interval = setInterval(() => {
    if (step > finalIdx) {
      clearInterval(interval);
      // 最终评级停留 + 特效
      const tier = getRatingTier(finalGrade);
      if (tier.particleCount > 0) spawnParticles(gradeEl, tier.particleCount, tier.particleColor);
      if (tier.shakeIntensity > 0) screenShake(tier.shakeIntensity);
      if (tier.glowColor) screenFlash(tier.glowColor, 0.3);
      // 停留 800ms 后淡出
      setTimeout(() => {
        overlay.classList.add('rating-reveal-fade');
        setTimeout(() => {
          overlay.remove();
          onComplete();
        }, 300);
      }, 800);
      return;
    }
    const grade = GRADE_ORDER[step];
    const tier = getRatingTier(grade);
    gradeEl.textContent = grade;
    gradeEl.className = `rating-grade ${tier.cssClass}`;
    gradeEl.style.color = tier.color;
    playRatingSound(grade);
    if (step === finalIdx) {
      // 最终评级弹性放大
      gradeEl.classList.add('rating-final');
    }
    step++;
  }, 300);
}
```

### 评级音效设计

```typescript
// sound.ts
export function playRatingSound(grade: string): void {
  // C: 低沉短促 (200Hz sine, 0.15s)
  // B: 中低 (330Hz sine, 0.2s)
  // A: 明亮 (440Hz triangle, 0.25s)
  // S: 和弦 (440+554+659 Hz, 0.3s) — A大三和弦
  // SS: 厚和弦 (523+659+784 Hz, 0.4s) — C大三和弦高八度
  // SSS: 满和弦+低频 (261+523+659+784+1046 Hz, 0.5s) — 双八度大和弦
}
```

### 避免的陷阱

- **不要** 创建新的 Scene 类 — 评级揭示是 DOM overlay，不是 PixiJS Scene
- **不要** 修改 `VictoryScene.ts` — 那是 legacy/unused PixiJS 场景
- **不要** 用 `setInterval` 实际计时 — 300ms 步进用 `setInterval` 可接受（非帧精确动画）
- **不要** 阻断 `endLevel()` 清理逻辑 — 评级揭示在清理之后、shop 打开之前
- **不要** 修改 shop 统计面板的评级显示 — 已有 `.rating-badge` 正常工作
- **不要** 忘记 `pointer-events: none` — 覆盖层不能阻断键盘输入
- **不要** 创建新的测试文件 — 扩展现有 `juice.test.ts`
- **不要** 在 `calculateRating()` 中改变 C 的含义 — C 仍表示 score < targetScore（失败），评级揭示仅在胜利路径触发，所以 C 永远不会在揭示动画中作为最终评级出现。但滚动动画从 C 开始（视觉起点）

### 前序 Story 经验

**来自 Story 31-1（颜色分级）：**
- 纯函数分级 + CSS class 切换模式
- `SCORE_TIER_CLASSES` 便于清除旧 class

**来自 Story 31-2（屏幕震动）：**
- `as const` 查表 + 无障碍开关
- 震动 max-value overlay 避免冲突

**来自 Story 31-3（音效）：**
- Web Audio API 合成：OscillatorNode + GainNode + softAttack
- 多音同时播放用多个 Oscillator

**来自 Story 31-4（动画）：**
- ScoreRoller 帧驱动 + easeOutCubic
- code review: 状态 reset 防关卡间泄漏
- bumpScale 默认值不能回归

**来自 Story 31-5（里程碑庆祝）：**
- DOM overlay + setTimeout 清理
- `readonly MilestoneTier[]` 防意外修改
- 里程碑音效应匹配里程碑级别而非单词分数
- 组合 screenFlash + spawnParticles + screenShake 效果

**对本 Story 的启示：**
- `RatingTier` 用 `readonly` 数组 + 纯函数查表
- DOM overlay 创建后必须 setTimeout 清理
- 音效用 Web Audio 合成（参照 playScoreSound 模式）
- 覆盖层必须 `pointer-events: none`
- 评级揭示用回调 pattern 阻塞 shop 打开（不用 Promise，保持与现有代码风格一致）

### 性能约束

- 评级揭示 DOM overlay：1 个 `<div>` + 1 个文字元素，CSS transform 动画（GPU 加速）
- setInterval 300ms 步进：最多 6 步 = 1.8s，总 DOM 操作 6 次
- 粒子：SSS 最大 50 个，350ms 自动销毁
- Web Audio 评级音效：每步 1 个 OscillatorNode（S/SS/SSS 3-5 个），自动 stop

### Project Structure Notes

- 源码在 `src/src/`，测试在 `src/tests/unit/`
- 动画工具在 `src/src/effects/juice.ts`
- 音效系统在 `src/src/effects/sound.ts`
- 战斗逻辑在 `src/src/systems/battle.ts`
- 样式在 `src/src/style.css`
- 测试在 `src/tests/unit/effects/juice.test.ts`
- 命名规范：camelCase 函数名，PascalCase 类名/接口名，UPPER_SNAKE 常量

### References

- [Source: docs/stories/epic-21-number-juice.md#Story31.6] — 验收标准与评级效果表
- [Source: src/src/systems/battle.ts#L679-688] — 现有 calculateRating() 实现
- [Source: src/src/systems/battle.ts#L700-720] — endLevel() 胜利路径（揭示层插入点）
- [Source: src/src/systems/battle.ts#L434-454] — completeWord() 胜利检测
- [Source: src/src/core/types.ts#L84-103] — BattleStats 接口（rating: string 字段）
- [Source: src/src/core/state.ts#L94-104] — createBattleStats() 初始化
- [Source: src/src/core/state.ts#L136-143] — calculateTargetScore() 目标分计算
- [Source: src/src/systems/shop.ts#L1461-1470] — 商店统计面板评级显示
- [Source: src/src/style.css#L2829-2852] — 现有 .rating-badge CSS
- [Source: src/src/style.css#L1697-1724] — score-tier CSS（颜色参考）
- [Source: src/src/effects/juice.ts#L240-300] — 里程碑庆祝系统（DOM overlay 模式参考）
- [Source: src/src/effects/sound.ts#L248-347] — playScoreSound() Web Audio 合成模式
- [Source: src/src/effects/particles.ts] — spawnParticles() API
- [Source: docs/implementation-artifacts/31-5-score-milestone-celebration.md] — 前序 Story 里程碑庆祝

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Circular dependency: juice.ts → sound.ts → state.ts → RelicPipeline.ts → battle.ts → juice.ts. Fixed by passing `playRatingSound` as callback parameter to `showRatingReveal` instead of direct import.
- Moved `calculateRating()` from battle.ts to juice.ts to co-locate with rating config data and enable unit testing without triggering battle.ts module-level side effects.

### Completion Notes List

- All 6 tasks completed, all 7 AC covered
- 64 unit tests passing (48 existing + 16 new: 9 calculateRating + 4 RATING_TIERS + 2 getRatingTier + 1 GRADE_ORDER)
- `calculateRating` moved from battle.ts to juice.ts; shop.ts import updated accordingly
- `showRatingReveal` uses `soundFn` callback parameter to avoid circular dependency

### File List

- `src/src/effects/juice.ts` — Added `RatingTier`, `RATING_TIERS`, `GRADE_ORDER`, `getRatingTier()`, `calculateRating()`, `showRatingReveal()`
- `src/src/effects/sound.ts` — Added `RATING_SOUND_CONFIG`, `playRatingSound()`
- `src/src/systems/battle.ts` — Updated import, removed old `calculateRating()`, wrapped endLevel() victory paths in `showRatingReveal` callback
- `src/src/systems/shop.ts` — Updated `calculateRating` import from battle.ts → juice.ts, merged duplicate juice imports
- `src/src/style.css` — Added `.rating-reveal`, `.rating-grade`, `.rating-c` through `.rating-sss` CSS classes
- `tests/unit/effects/juice.test.ts` — Added `calculateRating`, `RATING_TIERS`, `getRatingTier`, `GRADE_ORDER` test blocks (16 tests)
