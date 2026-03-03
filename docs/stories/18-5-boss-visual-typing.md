---
title: "Story 18.5: Boss 实现 — 视觉类（渐隐 / 移动 / 聚光灯）"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-5-boss-visual-typing"
status: "done"
created: "2026-03-02"
depends_on: ["18-4-boss-modifier-framework"]
---

# Story 18.5: Boss 实现 — 视觉类（渐隐 / 移动 / 聚光灯）

## Story

作为一个 **玩家**，
我想要 **面对 3 种视觉类打字 Boss 修饰器（渐隐、漂移、聚光灯）**，
以便 **Boss 关和精英关通过视觉干扰增加打字难度，而不仅仅是数值惩罚**。

## Acceptance Criteria

- [x] AC1: boss_fade — 字母逐个淡出，淡出速度随时间加快（前期 1.5s/字母，后期 0.8s/字母）
- [x] AC2: boss_drift — 词语容器漂移+振荡，振幅随时间递增
- [x] AC3: boss_spotlight — 仅渲染光圈内字母（当前位置前后 2-3 个），光圈随输入推进
- [x] AC4: 三种修饰器均支持 `isElite` 减弱参数（效果约 50%）
- [x] AC5: 视觉效果流畅不卡顿（onTick 开销 <3ms，保持 60fps）
- [x] AC6: 三种修饰器正确实现 BossModifier 接口（apply/cleanup/getParams/onTick）
- [x] AC7: cleanup() 完全恢复正常词语显示（无残留 CSS/DOM 副作用）

## Tasks / Subtasks

- [x] Task 1: 扩展 BossModifierParams 参数字段 (AC: 4, 6)
  - [x] 1.1 在 `data/bossModifiers.ts` 的 `BossModifierParams` 接口新增视觉类参数字段（fadeSpeed、fadeSpeedEnd、fadeDuration、driftAmplitude、driftFrequency、spotlightRadius）
  - [x] 1.2 确保与现有数值类参数字段兼容（不影响已实现的 6 个数值修饰器）

- [x] Task 2: 实现 boss_fade 修饰器 (AC: 1, 4, 6, 7)
  - [x] 2.1 在 `data/bossModifiers.ts` 用完整实现替换 `boss_fade` 的 createStubModifier
  - [x] 2.2 `getParams(isElite)`: 满功率 fadeSpeed=1.5→0.8s 加速，精英 fadeSpeed=3.0→1.6s（速度减半）
  - [x] 2.3 `apply()`: 记录开始时间，初始化淡出状态
  - [x] 2.4 `onTick(dt)`: 遍历 `#word-display` 下所有 `.letter` span，根据已完成字母之后的 pending 字母计算 opacity（已打过的 correct 字母保持不变）
  - [x] 2.5 `cleanup()`: 恢复所有 `.letter` 的 opacity 为空

- [x] Task 3: 实现 boss_drift 修饰器 (AC: 2, 4, 6, 7)
  - [x] 3.1 在 `data/bossModifiers.ts` 用完整实现替换 `boss_drift` 的 createStubModifier
  - [x] 3.2 `getParams(isElite)`: 满功率 amplitude=15px,frequency=2Hz；精英 amplitude=8px,frequency=1.5Hz
  - [x] 3.3 `apply()`: 记录开始时间
  - [x] 3.4 `onTick(dt)`: 计算 sin/cos 偏移量，振幅随时间线性增大，应用 CSS transform translate 到 `#word-display` 元素
  - [x] 3.5 `cleanup()`: 移除 `#word-display` 的 CSS transform

- [x] Task 4: 实现 boss_spotlight 修饰器 (AC: 3, 4, 6, 7)
  - [x] 4.1 在 `data/bossModifiers.ts` 用完整实现替换 `boss_spotlight` 的 createStubModifier
  - [x] 4.2 `getParams(isElite)`: 满功率 radius=2（可见前后各 1 个字母），精英 radius=3（可见前后各 1.5 个）
  - [x] 4.3 `apply()`: 空操作（onTick 持续管理）
  - [x] 4.4 `onTick(dt)`: 读取 `state.player.index`，将距离当前位置超出 radius 的 `.letter` span 设 opacity:0.05，范围内的正常显示，边缘渐变
  - [x] 4.5 `cleanup()`: 恢复所有 `.letter` 的 opacity 为空

- [x] Task 5: CSS 样式支持 (AC: 5)
  - [x] 5.1 在 `style.css` 添加 `.letter` 的 transition 属性支持平滑 opacity 变化（boss_fade 用）
  - [x] 5.2 添加 `#word-display` 的 transition 属性支持平滑 transform 变化（boss_drift 用）

- [x] Task 6: 测试 (AC: 1-7)
  - [x] 6.1 boss_fade 测试：getParams 返回正确参数、精英参数减弱、onTick 后 opacity 变化
  - [x] 6.2 boss_drift 测试：getParams 返回正确参数、精英参数减弱、onTick 设置 transform
  - [x] 6.3 boss_spotlight 测试：getParams 返回正确参数、精英参数减弱、onTick 根据 index 隐藏/显示字母
  - [x] 6.4 cleanup 测试：三种修饰器 cleanup 后 DOM 状态恢复
  - [x] 6.5 集成测试：apply → onTick → cleanup 完整生命周期

## Dev Notes

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + bossModifiers.ts），不涉及 Pixi 系统
2. **依赖方向**：`data → core → systems → scenes` — 修饰器实现放 `data/bossModifiers.ts`，引擎不变
3. **纯视觉效果**：3 个视觉修饰器只影响 DOM 显示，不改变输入验证逻辑（`handleKeyPress` 中 `expect = state.player.word[state.player.index]` 保持不变）
4. **性能约束**：onTick 每 100ms 调用一次（0.1s dt），DOM 操作要高效

### 已由 18.4 完成的基础设施（不要重复实现）

- `BossModifier` 接口（id, getParams, apply, cleanup, onTick?）[Source: `data/bossModifiers.ts`]
- `BossModifierParams` 接口 [Source: `data/bossModifiers.ts`]
- `BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier>` [Source: `data/bossModifiers.ts`]
- `createStubModifier()` 函数 — 当前 7 个打字类修饰器的 no-op 实现 [Source: `data/bossModifiers.ts`]
- `applyModifier()` / `cleanupModifier()` / `tickModifier(dt)` 生命周期管理 [Source: `systems/bossModifierEngine.ts`]
- `startBossRotation()` / `stopBossRotation()` Boss 轮换引擎 [Source: `systems/bossModifierEngine.ts`]
- `setActiveParams()` / `getActiveParams()` 活跃参数查询 [Source: `data/bossModifiers.ts`]
- battle.ts 中所有 hook 已就位（startLevel、endLevel、timer tick、playerWrong、completeWord、victory、gameOver）[Source: `systems/battle.ts`]
- `#modifier-info` HUD 元素 + CSS [Source: `index.html` + `style.css`]
- Boss 修饰器切换动画 `.modifier-switch` [Source: `style.css`]

### 词语渲染系统（CRITICAL — 修饰器操作的目标 DOM）

```typescript
// battle.ts:renderWord() — 每次新词时调用
function renderWord(): void {
  const el = getElements();
  const s = state.player;
  el.word.innerHTML = '';

  for (let i = 0; i < s.word.length; i++) {
    const span = document.createElement('span');
    span.className = 'letter letter-enter';
    span.textContent = s.word[i];
    span.style.animationDelay = `${i * 0.03}s`;

    if (i < s.index) span.classList.add('correct');
    else if (i === s.index) span.classList.add('current');
    else span.classList.add('pending');

    if (s.bindings.has(s.word[i].toLowerCase())) span.classList.add('has-skill');
    el.word.appendChild(span);
  }
}
```

**DOM 结构：**
```html
<div id="word">
  <span class="letter correct">F</span>
  <span class="letter current">I</span>
  <span class="letter pending">R</span>
  <span class="letter pending">E</span>
</div>
```

**关键点：**
- `el.word` = `#word` 元素（通过 `getElements()` 获取）
- 每个字母是独立 `<span class="letter">`，可单独设 opacity/visibility
- `correct` = 已打正确，`current` = 当前等待输入，`pending` = 未到达
- 每次 `setWord()` → `renderWord()` 重新生成所有 span
- `playerCorrect()` 时手动修改 class（不重新 render）

### 三种视觉修饰器实现设计（CRITICAL）

#### boss_fade（👻 渐隐之词）

**效果：** pending 字母随时间淡出（opacity 1→0），已打正确的字母保持不变。

**参数：**
- 满功率：初始 fadeSpeed=1.5s/字母，随经过时间线性加速到 0.8s/字母（60 秒内）
- 精英：初始 fadeSpeed=3.0s/字母，加速到 1.6s/字母（45 秒内）

**实现：**
```typescript
let fadeElapsed = 0

const bossFade: BossModifier = {
  id: 'boss_fade',
  getParams: (isElite) => ({
    fadeSpeed: isElite ? 3.0 : 1.5,        // 初始淡出速度（秒/字母）
    fadeSpeedEnd: isElite ? 1.6 : 0.8,     // 最终淡出速度
    fadeDuration: isElite ? 45 : 60,        // 加速持续时间（秒）
  }),
  apply: () => { fadeElapsed = 0 },
  cleanup: () => {
    fadeElapsed = 0
    // 恢复所有 letter 的 opacity
    document.querySelectorAll('#word .letter').forEach(el => {
      (el as HTMLElement).style.opacity = ''
    })
  },
  onTick(dt) {
    fadeElapsed += dt
    const params = getActiveParams()
    if (!params?.fadeSpeed) return

    // 线性插值当前淡出速度
    const t = Math.min(fadeElapsed / (params.fadeDuration ?? 60), 1)
    const currentSpeed = params.fadeSpeed + (params.fadeSpeedEnd! - params.fadeSpeed) * t

    const letters = document.querySelectorAll('#word .letter')
    letters.forEach((el) => {
      if (el.classList.contains('correct')) return // 已打正确的不淡
      // 基于词内位置和时间计算 opacity
      const opacity = Math.max(0, 1 - fadeElapsed / currentSpeed * 0.3)
      ;(el as HTMLElement).style.opacity = String(Math.max(0.05, opacity))
    })
  },
}
```

**注意：** 每次 `setWord()` 生成新的 span，老的淡出状态自然重置。onTick 持续对当前 pending 字母施加淡出效果。

#### boss_drift（🌊 移动文字）

**效果：** `#word` 容器整体漂移振荡（X/Y 方向 sin/cos 波），振幅随时间递增。

**参数：**
- 满功率：amplitude=15px, frequency=2Hz（每秒 2 次振荡）
- 精英：amplitude=8px, frequency=1.5Hz
- 振幅线性增长：Boss 关 60 秒内从初始振幅增长到 ×2

**实现：**
```typescript
let driftElapsed = 0

const bossDrift: BossModifier = {
  id: 'boss_drift',
  getParams: (isElite) => ({
    driftAmplitude: isElite ? 8 : 15,      // 基础振幅（px）
    driftFrequency: isElite ? 1.5 : 2.0,   // 频率（Hz）
  }),
  apply: () => { driftElapsed = 0 },
  cleanup: () => {
    driftElapsed = 0
    const wordEl = document.getElementById('word')
    if (wordEl) wordEl.style.transform = ''
  },
  onTick(dt) {
    driftElapsed += dt
    const params = getActiveParams()
    if (!params?.driftAmplitude) return

    // 振幅随时间递增（60 秒内翻倍）
    const ampScale = 1 + driftElapsed / 60
    const amp = params.driftAmplitude * ampScale
    const freq = params.driftFrequency ?? 2

    const x = Math.sin(driftElapsed * freq * Math.PI * 2) * amp
    const y = Math.cos(driftElapsed * freq * Math.PI * 2 * 0.7) * amp * 0.5

    const wordEl = document.getElementById('word')
    if (wordEl) wordEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
  },
}
```

#### boss_spotlight（🔦 聚光灯）

**效果：** 只显示当前打字位置附近 radius 个字母，其余字母隐藏。光圈随 `state.player.index` 推进。

**参数：**
- 满功率：radius=2（当前位置 ±1 个字母可见，共 3 个字母）
- 精英：radius=3（当前位置 ±1.5 个字母可见，共 4 个字母）

**实现：**
```typescript
const bossSpotlight: BossModifier = {
  id: 'boss_spotlight',
  getParams: (isElite) => ({
    spotlightRadius: isElite ? 3 : 2,
  }),
  apply: () => {},
  cleanup: () => {
    document.querySelectorAll('#word .letter').forEach(el => {
      (el as HTMLElement).style.opacity = ''
    })
  },
  onTick() {
    const params = getActiveParams()
    if (!params?.spotlightRadius) return

    const idx = state.player.index
    const radius = params.spotlightRadius

    document.querySelectorAll('#word .letter').forEach((el, i) => {
      const distance = Math.abs(i - idx)
      if (distance <= radius / 2) {
        ;(el as HTMLElement).style.opacity = '1'
      } else if (distance <= radius) {
        // 边缘渐变
        const fade = 1 - (distance - radius / 2) / (radius / 2)
        ;(el as HTMLElement).style.opacity = String(Math.max(0.05, fade))
      } else {
        ;(el as HTMLElement).style.opacity = '0.05'
      }
    })
  },
}
```

### BossModifierParams 扩展（CRITICAL）

在现有接口基础上新增视觉类参数：

```typescript
export interface BossModifierParams {
  // 数值类（已有）
  decayRate?: number
  comboPunishRate?: number
  scoreCap?: number
  timeSpeed?: number
  targetMultiplier?: number
  diminishRate?: number
  // 视觉类（新增 — Story 18.5）
  fadeSpeed?: number         // boss_fade: 初始淡出速度（秒/字母）
  fadeSpeedEnd?: number      // boss_fade: 最终淡出速度
  fadeDuration?: number      // boss_fade: 加速持续时间（秒）
  driftAmplitude?: number    // boss_drift: 振幅（px）
  driftFrequency?: number    // boss_drift: 频率（Hz）
  spotlightRadius?: number   // boss_spotlight: 可见半径（字母数）
}
```

### 注册表替换方式

直接将 `createStubModifier('boss_fade')` 替换为完整实现对象：

```typescript
// 替换前
boss_fade: createStubModifier('boss_fade'),
boss_drift: createStubModifier('boss_drift'),
boss_spotlight: createStubModifier('boss_spotlight'),

// 替换后
boss_fade: bossFade,
boss_drift: bossDrift,
boss_spotlight: bossSpotlight,
```

### DOM 操作注意事项

1. **renderWord 后 onTick 生效**：每次 `setWord()` → `renderWord()` 生成新 span，之后 onTick 自动对新 DOM 生效
2. **playerCorrect 修改 class**：打正确字母时 class 变为 `correct`，boss_fade 的 onTick 跳过 `correct` 字母
3. **不需要修改 battle.ts**：所有视觉效果通过 `onTick()` 直接操作 DOM 完成，不需要改 renderWord 或 handleKeyPress
4. **cleanup 必须彻底**：Boss 轮换时 cleanup → apply 连续调用，必须确保 opacity/transform 完全恢复

### 性能优化

- `querySelectorAll('#word .letter')` 在 onTick 中每 100ms 调用一次（5-10 个元素），开销极小
- 避免使用 `requestAnimationFrame`（已有 100ms interval 足够）
- CSS transition 让 opacity/transform 变化平滑，无需逐帧微调
- 不要在 onTick 中创建新 DOM 元素或修改 innerHTML

### CSS 建议

```css
/* boss_fade: 平滑淡出效果 */
#word .letter {
    transition: opacity 0.15s ease;
}

/* boss_drift: 平滑移动效果 */
#word {
    transition: transform 0.1s ease-out;
}
```

**注意：** transition 属性对所有关卡生效（非 Boss 关时 opacity/transform 不变，transition 无效果）。如需隔离，可在 apply 时添加 class，cleanup 时移除。

### Project Structure Notes

**修改文件：**
- `src/src/data/bossModifiers.ts` — 扩展 BossModifierParams + 替换 3 个 stub 为完整实现
- `src/src/style.css` — 添加 letter transition 支持

**不修改文件（已完成）：**
- `systems/bossModifierEngine.ts` — 引擎不变，onTick 自动调用新实现
- `systems/battle.ts` — hook 已就位，不需要新增 hook
- `core/types.ts` — 不需要新类型
- `core/state.ts` — 不需要新状态字段

**测试文件：**
- `src/tests/unit/systems/bossModifierEngine.test.ts` — 扩展测试覆盖 3 个视觉修饰器

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.5 验收标准（lines 227-238）]
- [Source: docs/stories/18-4-boss-modifier-framework.md — BossModifier 接口设计 + 生命周期管理]
- [Source: src/src/data/bossModifiers.ts — 当前 stub 实现 + BossModifierParams]
- [Source: src/src/systems/bossModifierEngine.ts — 引擎生命周期管理]
- [Source: src/src/systems/battle.ts:92-110 — renderWord() DOM 结构]
- [Source: src/src/systems/battle.ts:489-515 — timer interval + tickModifier(0.1)]
- [Source: docs/project-context.md — 性能预算、依赖方向]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- All 23 new tests passing (added to bossModifierEngine.test.ts, total 60)
- All 21 existing tests in bossModifiers.test.ts still passing
- Full suite: 2135 passing, 21 pre-existing failures unchanged
- No new TypeScript errors introduced

### Completion Notes List

- BossModifierParams extended with 6 visual params (fadeSpeed, fadeSpeedEnd, fadeDuration, driftAmplitude, driftFrequency, spotlightRadius)
- boss_fade: opacity fades on pending letters via onTick, fadeElapsed tracks time, speed accelerates linearly from fadeSpeed to fadeSpeedEnd over fadeDuration seconds
- boss_drift: sin/cos transform on #word-display, amplitude grows linearly (×2 over 60s), driftElapsed tracks time
- boss_spotlight: opacity masking based on distance from state.player.index, radius/2 core visibility + edge gradient, correct letters always visible
- All 3 use querySelectorAll('#word-display .letter') in onTick (5-10 elements, negligible DOM cost at 100ms interval)
- cleanup() clears inline opacity/transform styles completely
- CSS transitions added: opacity 0.15s on .letter, transform 0.1s on #word-display
- Registry updated: 3 stubs replaced with full implementations, 4 stubs remain (scramble/reverse/masked/rhythm for 18.6-18.8)
- Test DOM mock enhanced with createMockLetterEl() helper and mockWordDisplayStyle for verifying visual effects

### File List

**Modified:**
- `src/src/data/bossModifiers.ts` — Extended BossModifierParams + 3 visual modifier implementations replacing stubs
- `src/src/style.css` — Added opacity transition to .letter, transform transition to #word-display
- `src/tests/unit/systems/bossModifierEngine.test.ts` — 23 new tests (boss_fade, boss_drift, boss_spotlight params/onTick/cleanup/lifecycle), updated stub count from 7→4, enhanced DOM mock
- `docs/stories/sprint-status.yaml` — 18-5: in-progress → done
- `docs/stories/18-5-boss-visual-typing.md` — Status → done, all ACs/tasks checked
