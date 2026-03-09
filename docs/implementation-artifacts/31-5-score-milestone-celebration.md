# Story 31.5: 分数里程碑庆祝

Status: done

## Story

As a 玩家,
I want 战斗中累计分数达到里程碑时触发庆祝效果（文字弹出+粒子+屏震+音效），
so that 我能感受到 build 成长的成就感，每次突破都有仪式感。

## Acceptance Criteria

1. **5 级里程碑** — 战斗中累计分数 (`state.score`) 首次越过 100/500/1000/5000/10000 时各触发一次庆祝效果
2. **分级庆祝效果** — 每级里程碑有递增的视觉/音效反馈：
   - 100: 文字闪光（小弹出 + screenFlash）
   - 500: 文字弹出 + 小型粒子爆发
   - 1000: 大文字弹出 + 中型粒子 + 屏震
   - 5000: 超大文字弹出 + 大型粒子 + 强屏震 + 音效
   - 10000: 全屏庆祝 + 粒子爆发 + 猛震 + 特殊音效
3. **弹出文字** — 使用现有 `.milestone-popup` CSS 动画（已在 style.css 中定义），居中显示里程碑数字，1.2s 后自动消失
4. **不遮挡关键 UI** — 庆祝效果使用 `pointer-events: none`，不阻断打字输入和计时器
5. **与已有系统联动** — 庆祝效果组合现有的 `screenFlash()`、`screenShake()`、`spawnParticles()`、`playScoreSound()`
6. **每关重置** — `startLevel()` 时重置里程碑追踪状态，每关独立计算
7. **单元测试** — 里程碑检测纯函数的阈值边界测试

## Tasks / Subtasks

- [x] Task 1: 实现里程碑检测与效果定义 (AC: 1, 2, 5)
  - [x] 在 `src/effects/juice.ts` 新增 `MILESTONES` 常量数组 `[100, 500, 1000, 5000, 10000]`
  - [x] 新增 `MilestoneTier` 接口定义每级效果参数：`{ threshold, label, flashColor, flashOpacity, particleCount, particleColor, shakeIntensity }`
  - [x] 新增 `MILESTONE_TIERS: MilestoneTier[]` 查表数组（5 档递增效果）
  - [x] 新增 `checkMilestone(prevScore: number, newScore: number): MilestoneTier | null` 纯函数，返回最高新越过的里程碑（若无越过返回 null）
- [x] Task 2: 实现庆祝弹出 DOM 创建 (AC: 3, 4)
  - [x] 在 `src/effects/juice.ts` 新增 `showMilestoneCelebration(tier: MilestoneTier)` 函数
  - [x] 创建 `.milestone-popup` DOM 元素，填充里程碑数字文本
  - [x] 根据 tier 设置字体大小和颜色（递增：36px→48px→60px→72px→96px）
  - [x] 追加到 `el.container`，1200ms 后 `setTimeout(() => el.remove())`（匹配 CSS 动画时长）
  - [x] 在弹出时调用 `screenFlash()`、`screenShake()`、`spawnParticles()` 组合效果
- [x] Task 3: 集成到 battle.ts (AC: 1, 5, 6)
  - [x] 在 `battle.ts completeWord()` 中 `state.score += finalWordScore` 前后计算 prevScore/newScore
  - [x] 调用 `checkMilestone(prevScore, newScore)` 检测是否越过里程碑
  - [x] 若越过，调用 `showMilestoneCelebration(tier)`
  - [x] 在 `startLevel()` 中无需额外重置（检测基于 prevScore/newScore 差值，state.score 已在 startLevel 重置为 0）
- [x] Task 4: 单元测试 (AC: 7)
  - [x] 在 `src/tests/unit/effects/juice.test.ts` 新增 `checkMilestone` describe 块
  - [x] 测试：无越过返回 null
  - [x] 测试：精确越过 100 返回 100 tier
  - [x] 测试：一次越过多个（如 0→1200）返回最高越过的 1000 tier
  - [x] 测试：已在里程碑之上不重复触发（如 150→200 不触发 100）
  - [x] 测试：边界值（99→100 触发，100→101 不触发）

## Dev Notes

### 架构要点

- **检测模式**：使用 `prevScore < threshold && newScore >= threshold` 越过检测，与 `KeystrokeSoundController` 中 combo 里程碑检测模式一致
- **效果组合**：不新建效果系统，完全组合现有的 `screenFlash()`、`screenShake()`、`spawnParticles()`
- **CSS 已就绪**：`.milestone-popup` + `milestonePop` 动画已在 `style.css` L929-982 定义，直接使用
- **不修改 `state.lastMilestone`**：该字段当前仅在 `playerWrong()` 中重置，但本 Story 使用 `prevScore/newScore` 差值检测，无需依赖该字段。如果需要可以用它，但差值检测更简洁且无状态

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/effects/juice.ts` | 动画工具 | 新增 `MILESTONE_TIERS`, `checkMilestone()`, `showMilestoneCelebration()` |
| `src/systems/battle.ts` | 战斗逻辑 | 在 `completeWord()` 中添加里程碑检测调用 |
| `src/tests/unit/effects/juice.test.ts` | 测试 | 新增 `checkMilestone` 测试 |

### 现有代码模式（必须遵循）

**庆祝弹出 DOM 模式（参照 `announceLevel()`）：**
```typescript
// battle.ts L908-929
function announceLevel(): void {
  const el = getElements();
  const ann = document.createElement('div');
  ann.className = 'level-announce';
  ann.innerHTML = `...`;
  el.container.appendChild(ann);
  playSound('levelup');
  setTimeout(() => ann.remove(), 1500);
}
```

**现有 CSS `.milestone-popup` 动画（style.css L929-982）：**
```css
.milestone-popup {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 300;
    animation: milestonePop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    pointer-events: none;
}
.milestone-text {
    font-size: 72px;
    font-weight: bold;
    text-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
    animation: milestoneTextPulse 0.3s ease-out 2;
}
```

**粒子系统 API：**
```typescript
// particles.ts
export function spawnParticles(origin: HTMLElement, count: number, color: string): void
// 使用 score 元素作为 origin：el.score
```

**里程碑效果组合 completeWord() 中的位置（L391-425）：**
```typescript
state.score += finalWordScore;
bumpScore(finalWordScore);
// ← 里程碑检测插入点（在 bumpScore 之后，shakeIntensity 之前）

// 已有效果链（不修改）：
const shakeIntensity = getShakeIntensity(finalWordScore);
if (shakeIntensity > 0) screenShake(shakeIntensity);
playScoreSound(finalWordScore);
```

### 5 档庆祝效果参数设计

| Milestone | Label | Flash Color | Flash Opacity | Particles | Particle Color | Shake |
|-----------|-------|-------------|---------------|-----------|----------------|-------|
| 100 | "100!" | #ffffff | 0.15 | 0 | - | 0 |
| 500 | "500!" | #ffd700 | 0.2 | 15 | #ffd700 | 0 |
| 1000 | "1000!" | #ffd700 | 0.3 | 25 | #ff6b6b | 2 |
| 5000 | "5000!" | #ff6b6b | 0.4 | 40 | #ff6b6b | 4 |
| 10000 | "10000!" | #ffd700 | 0.5 | 60 | #ffd700 | 5 |

**弹出文字大小递增：** 36px → 44px → 56px → 72px → 96px
**弹出文字颜色：** #ffffff → #ffd700 → #ffd700 → #ff6b6b → #ffd700

### checkMilestone 设计

```typescript
export interface MilestoneTier {
  threshold: number;
  label: string;
  fontSize: number;
  color: string;
  flashColor: string;
  flashOpacity: number;
  particleCount: number;
  particleColor: string;
  shakeIntensity: number; // 0 = 不震
}

export const MILESTONE_TIERS: MilestoneTier[] = [
  { threshold: 100,   label: '100!',   fontSize: 36, color: '#ffffff', flashColor: '#ffffff', flashOpacity: 0.15, particleCount: 0,  particleColor: '',        shakeIntensity: 0 },
  { threshold: 500,   label: '500!',   fontSize: 44, color: '#ffd700', flashColor: '#ffd700', flashOpacity: 0.2,  particleCount: 15, particleColor: '#ffd700', shakeIntensity: 0 },
  { threshold: 1000,  label: '1000!',  fontSize: 56, color: '#ffd700', flashColor: '#ffd700', flashOpacity: 0.3,  particleCount: 25, particleColor: '#ff6b6b', shakeIntensity: 2 },
  { threshold: 5000,  label: '5000!',  fontSize: 72, color: '#ff6b6b', flashColor: '#ff6b6b', flashOpacity: 0.4,  particleCount: 40, particleColor: '#ff6b6b', shakeIntensity: 4 },
  { threshold: 10000, label: '10000!', fontSize: 96, color: '#ffd700', flashColor: '#ffd700', flashOpacity: 0.5,  particleCount: 60, particleColor: '#ffd700', shakeIntensity: 5 },
];

/** 检测分数是否越过里程碑，返回最高新越过的 tier（无越过返回 null） */
export function checkMilestone(prevScore: number, newScore: number): MilestoneTier | null {
  // 从高到低遍历，返回最高越过的里程碑
  for (let i = MILESTONE_TIERS.length - 1; i >= 0; i--) {
    const tier = MILESTONE_TIERS[i];
    if (newScore >= tier.threshold && prevScore < tier.threshold) {
      return tier;
    }
  }
  return null;
}
```

### showMilestoneCelebration 设计

```typescript
export function showMilestoneCelebration(tier: MilestoneTier): void {
  const el = getElements();

  // 1. 文字弹出
  const popup = document.createElement('div');
  popup.className = 'milestone-popup';
  const text = document.createElement('div');
  text.className = 'milestone-text';
  text.textContent = tier.label;
  text.style.fontSize = `${tier.fontSize}px`;
  text.style.color = tier.color;
  popup.appendChild(text);
  el.container.appendChild(popup);
  setTimeout(() => popup.remove(), 1200);

  // 2. 屏幕闪光
  screenFlash(tier.flashColor, tier.flashOpacity);

  // 3. 粒子爆发（以 score 元素为原点）
  if (tier.particleCount > 0) {
    spawnParticles(el.score, tier.particleCount, tier.particleColor);
  }

  // 4. 屏幕震动
  if (tier.shakeIntensity > 0) {
    screenShake(tier.shakeIntensity);
  }
}
```

### 避免的陷阱

- **不要** 创建新的粒子系统 — 使用现有 `spawnParticles()`
- **不要** 修改 `state.lastMilestone` 字段 — 使用 prevScore/newScore 差值检测更简洁，无需额外状态
- **不要** 在 `updateHUD()` 中检测里程碑 — 应在 `completeWord()` 中检测（updateHUD 每帧/每键调用，会重复触发）
- **不要** 创建新的 CSS 动画 — `.milestone-popup` + `milestonePop` 已在 style.css 中就绪
- **不要** 创建新的测试文件 — 扩展现有 `juice.test.ts`
- **不要** 阻断打字输入 — 所有庆祝元素必须 `pointer-events: none`
- **不要** 让庆祝效果与 per-word 效果冲突 — 里程碑触发在 bumpScore 之后，per-word screenShake/playScoreSound 之前，效果自然叠加

### 前序 Story 经验

**来自 Story 31-1（颜色分级）：**
- `updateHUD()` 中缓存 `lastScoreTier` 避免重启 CSS 动画
- 纯函数分级放 juice.ts

**来自 Story 31-2（屏幕震动）：**
- `as const` 查表 + 纯函数检测
- 无障碍开关 `shakeEnabled`

**来自 Story 31-3（音效）：**
- Web Audio API 即时合成，无需预加载
- `softAttack` 防爆音

**来自 Story 31-4（动画）：**
- Code review 发现：bumpScale 默认值回归 → 需保持原有行为
- Code review 发现：ScoreRoller 需 reset() → 关卡切换时重置状态
- 帧循环生命周期管理（start/stop 对称）

**对本 Story 的启示：**
- `checkMilestone()` 纯函数放 `juice.ts`，可测试
- `showMilestoneCelebration()` 组合现有效果，不引入新依赖
- DOM 元素创建后必须 setTimeout 清理（参照 `announceLevel()`、`screenFlash()`）
- 效果参数用查表数组，不用 if-else 链

### 性能约束

- `checkMilestone()` 是 O(5) 遍历，每次 `completeWord()` 调用一次，开销可忽略
- `spawnParticles()` 最大 60 个粒子，每个 350ms 后自动销毁，无内存泄漏
- `.milestone-popup` 使用 CSS `transform` 动画（GPU 加速），不触发 layout/paint
- `screenFlash()` DOM 元素 200ms 后销毁

### Project Structure Notes

- 源码在 `src/src/`，测试在 `src/tests/unit/`
- 动画工具在 `src/src/effects/juice.ts`
- 粒子系统在 `src/src/effects/particles.ts`
- 战斗逻辑在 `src/src/systems/battle.ts`
- 样式在 `src/src/style.css`（已有 `.milestone-popup` CSS）
- 测试在 `src/tests/unit/effects/juice.test.ts`
- 命名规范：camelCase 函数名，PascalCase 类名/接口名，UPPER_SNAKE 常量

### References

- [Source: docs/stories/epic-21-number-juice.md#Story31.5] — 验收标准与里程碑效果表
- [Source: src/src/effects/juice.ts#L92-122] — screenShake() 实现
- [Source: src/src/effects/juice.ts#L125-133] — screenFlash() 实现
- [Source: src/src/effects/particles.ts] — spawnParticles() API
- [Source: src/src/effects/sound.ts#L248-347] — playScoreSound() 4档合成
- [Source: src/src/systems/battle.ts#L391-425] — completeWord() 分数更新流
- [Source: src/src/style.css#L929-982] — .milestone-popup CSS 动画（已就绪）
- [Source: src/src/core/types.ts#L135] — state.lastMilestone 字段
- [Source: src/src/systems/audio/KeystrokeSoundController.ts#L145] — combo 里程碑检测模式参考
- [Source: docs/implementation-artifacts/31-4-number-animation-system.md] — 前序 Story 动画系统

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — 实现顺利，无需调试

### Completion Notes List

- `checkMilestone()` 纯函数从高到低遍历 MILESTONE_TIERS，返回最高新越过的里程碑
- `showMilestoneCelebration()` 组合 screenFlash + spawnParticles + screenShake + DOM popup
- battle.ts 集成点：`completeWord()` 中 `state.score += finalWordScore` 前捕获 prevScore，后检测里程碑
- **[Code Review Fix H1]** 里程碑触发时以 `milestone.threshold` 播放音效，避免低分词跨高里程碑时音效不匹配
- **[Code Review Fix M1]** `MILESTONE_TIERS` 改为 `readonly MilestoneTier[]`，去掉冗余 `as const`
- **[Code Review Fix M2]** 测试 AC 引用修正 (AC: 1, 4) → (AC: 1, 7)
- 无需 `startLevel()` 重置，因为检测基于 prevScore/newScore 差值，state.score 已在 startLevel 重置为 0
- 8 个新单元测试（checkMilestone ×5 + MILESTONE_TIERS ×3），全部通过，总计 48 个测试

### File List

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/effects/juice.ts` | Modified | 新增 MilestoneTier 接口、MILESTONE_TIERS 数组、checkMilestone()、showMilestoneCelebration() |
| `src/src/systems/battle.ts` | Modified | completeWord() 中集成里程碑检测 |
| `src/tests/unit/effects/juice.test.ts` | Modified | 新增 checkMilestone + MILESTONE_TIERS 测试 |
| `docs/implementation-artifacts/31-5-score-milestone-celebration.md` | Modified | Story 状态更新 |
| `docs/implementation-artifacts/sprint-status.yaml` | Modified | 31-5 状态更新 |
