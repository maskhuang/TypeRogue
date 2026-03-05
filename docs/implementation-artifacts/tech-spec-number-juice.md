# Tech-Spec: 数字 Juice 体系

**Created:** 2026-03-04
**Status:** Ready for Development
**Engine:** Vite + TypeScript (Custom DOM + Web Audio API)
**Source:** brainstorming-session-2026-03-04.md (#38, #39, #47, #36, #40, #66, #72)

## Overview

### Feature Description

为分数系统增加分级视听反馈：数字颜色随量级变化、屏幕震动随爆发强度分级、大数字播放低频音效、关卡评级（C-SSS）。让 build 的威力通过视听体验被"感受到"。

### Gameplay Impact

- **爽感核心升级** — 指数爆炸从数字变成多感官体验
- **量级可读** — 一眼区分 100 分和 10000 分
- **成就感** — 首次突破 1000/5000/10000 的里程碑庆祝
- **评级激励** — SSS 评级成为 build 完美度的勋章

### Scope

**In:**
- 分数数字颜色分级（白→金→彩虹→发光）
- 结算屏幕震动分级（按分数量级）
- 数字结算音效分级（大数字低频轰鸣）
- 分数里程碑弹幕（100/1000/5000/10000 一次性庆祝）
- 关卡评级 C-SSS（与 P0 统计面板共享）

**Out:**
- 数字滚轮动画（#36，增加复杂度但收益不大）
- 数字大小缩放（#37，与固定布局冲突）
- 实时战斗 DPS（P0 范畴）

## Context for Development

### Existing Systems Integration

| 系统 | 文件 | 集成点 |
|------|------|--------|
| Juice 效果 | `src/effects/juice.ts` | `screenShake()` L45-53, `bumpScore()` L30-35, `juiceUp()` L10 |
| 音效系统 | `src/effects/sound.ts` | `playSound()` L18-44, Web Audio API oscillator |
| 结算面板 | `src/systems/battle.ts` | `showSettlementComplete()` L404-431, `completeWord()` L282-372 |
| 金币奖励 | `src/systems/battle.ts` | `showGoldReward()` L434-488 |
| 分数显示 | `src/systems/battle.ts` | `updateSettlementLive()` L377-401 |

### Existing Juice Infrastructure

已有效果（可扩展）：
- `screenShake(intensity: 1-3)` — 已有 3 级震动
- `bumpScore()` — 分数弹跳动画
- `juiceUp(el, rotation, seed)` — 通用弹跳
- `screenFlash(color, opacity)` — 屏幕闪光
- `updateMultiplierGlow()` — 倍率发光（mid-mult / high-mult 类）

已有结算动画：
- `settlementBurst` keyframe: scale 1 → 1.08 → 1
- `settlementScoreBurst` keyframe: scale + 颜色闪烁
- 结算面板已有实时模式（打字中）和完成模式（词完成时）

### Sound System Architecture

当前使用 Web Audio API 动态生成音效：
```typescript
oscillator = audioCtx.createOscillator()
gainNode = audioCtx.createGain()
// frequency ramp + gain envelope, duration ~150ms
```

每种音效由 `SOUND_PROFILES` 中的频率参数定义。新增音效只需添加 profile。

## Implementation Plan

### Task 1: 分数颜色分级 (AC: 1)

**`src/systems/battle.ts` — `showSettlementComplete()`：**

根据 `total`（单词最终分数）为结算数字添加分级 CSS class：

```typescript
function getScoreTier(score: number): string {
  if (score >= 10000) return 'score-legendary';  // 发光+粒子
  if (score >= 5000)  return 'score-rainbow';     // 彩虹渐变
  if (score >= 1000)  return 'score-gold';        // 金色
  if (score >= 100)   return 'score-silver';      // 银白
  return '';                                       // 默认白色
}
```

应用到 `#settlement-final` 元素。

**`src/style.css`：**

```css
.score-silver  { color: #e0e0e0; text-shadow: 0 0 8px rgba(224,224,224,0.5); }
.score-gold    { color: #ffd700; text-shadow: 0 0 12px rgba(255,215,0,0.6); }
.score-rainbow { background: linear-gradient(90deg, #ff6b6b, #ffd700, #4ecdc4, #a855f7);
                 -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                 filter: brightness(1.3); }
.score-legendary { color: #fff; text-shadow: 0 0 20px #ffd700, 0 0 40px #ff6b6b;
                   animation: legendaryPulse 0.5s ease-in-out; }
@keyframes legendaryPulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.8); }
}
```

同样应用到 `#score-count`（战斗中累计分数）— 基于 `state.score` 总分。

### Task 2: 屏幕震动分级 (AC: 2)

**`src/systems/battle.ts` — `completeWord()`：**

当前 `screenShake()` 仅在特定条件调用。改为每次结算根据分数调用：

```typescript
// 在 completeWord() 中，finalWordScore 计算后：
if (finalWordScore >= 5000) screenShake(3);
else if (finalWordScore >= 1000) screenShake(2);
else if (finalWordScore >= 300) screenShake(1);
```

**`src/effects/juice.ts` — 扩展 `screenShake()`：**

当前最大 intensity=3。新增 intensity=4 用于极端爆发：
- intensity 4: x±12px, y±8px, duration 600ms（需新增 keyframe）

在 `finalWordScore >= 10000` 时：`screenShake(4)` + `screenFlash('#ffd700', 0.3)`。

### Task 3: 数字结算音效 (AC: 3)

**`src/effects/sound.ts` — 新增分级音效 profile：**

```typescript
// 在 SOUND_PROFILES 中新增：
score_low:   { startFreq: 800, endFreq: 1200, duration: 0.1, volume: 0.15 }  // 清脆短促
score_mid:   { startFreq: 400, endFreq: 600, duration: 0.15, volume: 0.2 }   // 中频饱满
score_high:  { startFreq: 200, endFreq: 350, duration: 0.2, volume: 0.25 }   // 低频厚重
score_epic:  { startFreq: 100, endFreq: 250, duration: 0.3, volume: 0.3 }    // 低频轰鸣
```

**`src/systems/battle.ts` — `showSettlementComplete()`：**

```typescript
if (total >= 10000) playSound('score_epic');
else if (total >= 1000) playSound('score_high');
else if (total >= 300) playSound('score_mid');
else playSound('score_low');
```

### Task 4: 分数弹出动画增强 (AC: 4)

**`src/effects/juice.ts` — 新增 `bumpScoreStrong()`：**

高分词完成时的强化弹跳（比现有 `bumpScore` 更夸张）：

```css
@keyframes score-bump-strong {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); filter: brightness(1.5); }
  60% { transform: scale(0.9); }
  100% { transform: scale(1); filter: brightness(1); }
}
```

在 `completeWord()` 中：
- `finalWordScore >= 1000`: `bumpScoreStrong()`
- 否则: `bumpScore()`（现有）

### Task 5: 分数里程碑弹幕 (AC: 5)

**`src/systems/battle.ts` — `completeWord()` 中新增里程碑检查：**

```typescript
const MILESTONES = [100, 500, 1000, 5000, 10000];

function checkScoreMilestone(prevScore: number, newScore: number): void {
  for (const m of MILESTONES) {
    if (prevScore < m && newScore >= m) {
      showMilestoneCelebration(m);
      break; // 一次只庆祝一个
    }
  }
}
```

**`showMilestoneCelebration(milestone)`：**
- 在屏幕中央短暂显示大字 "🎯 1,000!" / "🔥 5,000!" / "💥 10,000!"
- 持续 1s，带缩放弹入 + 淡出动画
- 配合 `screenFlash` + `playSound('score_high')`
- 使用绝对定位 div，不影响布局

### Task 6: 结算面板数字弹性动画 (AC: 6)

**`src/style.css` — 增强 `settlementBurst`：**

```css
/* 现有：scale 1 → 1.08 → 1，0.4s */
/* 增强为带 overshoot 的弹性效果 */
@keyframes settlementBurst {
  0% { transform: scale(1); }
  20% { transform: scale(1.15); }
  40% { transform: scale(0.95); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

高分时（score-gold 以上）使用更夸张的变体：

```css
@keyframes settlementBurstStrong {
  0% { transform: scale(0.8); opacity: 0.5; }
  30% { transform: scale(1.3); opacity: 1; }
  50% { transform: scale(0.9); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### Task 7: 关卡评级显示 (AC: 7)

与 P0 统计面板共享评级计算（`getScoreTier` 抽为公共函数）。

**金币奖励面板 `showGoldReward()` 中新增评级行：**

```html
<div class="gold-reward-row gold-rating-row">
  <span class="gold-reward-label">评级</span>
  <span class="rating-badge rating-{grade}">{grade}</span>
</div>
```

评级样式：
- C: 灰色
- B: 白色
- A: 蓝色
- S: 金色
- SS: 金色 + 发光
- SSS: 彩虹 + 脉冲动画

### Task 8: CSS + 音效资源 (AC: 1-7)

- 所有颜色分级 CSS class
- 里程碑弹幕样式 + keyframe
- 评级徽章样式
- 音效 profile 定义（纯代码，无外部音频文件）

### Task 9: 测试 (AC: 8)

- `getScoreTier()` 各阈值返回正确 class
- 里程碑检查：跨越边界时触发、同一里程碑不重复触发
- 评级计算正确性
- 震动 intensity 映射正确

### Performance Considerations

- **Frame budget:** 所有新增效果在 `completeWord()` 中触发（每词一次），不影响逐帧性能
- **Audio:** 复用现有 Web Audio API 架构，动态生成音效，无额外加载
- **CSS animations:** 纯 GPU 加速（transform + opacity），零 layout/paint 开销
- **里程碑 div:** 仅在触发时创建，1s 后自动移除

### Acceptance Criteria

1. 单词结算分数 100+/1000+/5000+/10000+ 时数字分别显示银/金/彩虹/发光效果
2. 结算分数 300+/1000+/5000+/10000+ 时屏幕震动逐级增强
3. 结算时播放与分数量级匹配的音效（清脆→厚重→轰鸣）
4. 高分词（1000+）结算数字使用强化弹性动画
5. 累计分数首次突破 100/500/1000/5000/10000 时显示里程碑弹幕
6. 结算面板数字增强为带 overshoot 的弹性效果
7. 金币奖励面板显示关卡评级（C-SSS），样式分级
8. 新增单元测试覆盖阈值计算和里程碑检查

## Additional Context

### Dependencies

- 依赖 P0 的评级计算函数（可先独立实现，后合并）
- 无外部依赖

### Testing Strategy

- 单元测试：`getScoreTier`、`checkScoreMilestone`、评级计算
- 手动测试：视觉效果需实际运行验证（颜色/震动/音效感受）

### Notes

- 颜色分级阈值可能需要根据实际游戏数值平衡调整——当前基于 base×mult 的典型范围预估
- 音效 profile 的频率参数需要实际试听微调，建议先实现再迭代
- 里程碑弹幕应该只在战斗中首次达到时触发，在 `state` 中记录 `lastMilestone`（已存在）
- 评级 `SSS` 的 overkill >= 2.0 是否太难需要观察数据
