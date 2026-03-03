---
title: "Story 18.7: Boss 实现 — 节奏锁定（BPM 解锁打字）"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-7-boss-rhythm-lock"
status: "done"
created: "2026-03-02"
depends_on: ["18-4-boss-modifier-framework"]
---

# Story 18.7: Boss 实现 — 节奏锁定（BPM 解锁打字）

## Story

作为一个 **玩家**，
我想要 **面对节奏锁定 Boss 修饰器（boss_rhythm），字母按 BPM 节拍逐个解锁**，
以便 **Boss 关和精英关通过限制打字速度增加难度，玩家必须跟随节奏而非自由打字**。

## Acceptance Criteria

- [x] AC1: boss_rhythm — 字母按节拍逐个解锁，每个节拍解锁下一个字母，锁定字母视觉变暗（opacity 0.3）
- [x] AC2: 锁定状态下所有按键输入被静默忽略（不触发 playerWrong）
- [x] AC3: BPM 随时间递增（满功率 90→140，精英 70→110），节拍间隔越来越短
- [x] AC4: 当前可打字母有脉冲动画（rhythm-pulse CSS class）
- [x] AC5: 支持 `isElite` 减弱参数（更低起始/终止 BPM）
- [x] AC6: 新词出现时立即解锁第 1 个字母（不等待首拍），后续字母按节拍解锁
- [x] AC7: cleanup() 完全恢复正常打字（移除所有 opacity 和 CSS class，重置状态）
- [x] AC8: 正确实现 BossModifier 接口（getParams/apply/cleanup/onTick）

## Tasks / Subtasks

- [x] Task 1: 扩展 BossModifierParams 参数字段 (AC: 5, 8)
  - [x]1.1 在 `data/bossModifiers.ts` 的 `BossModifierParams` 接口新增节奏类参数字段（rhythmBpmStart、rhythmBpmEnd、rhythmDuration）
  - [x]1.2 确保与现有 15 个参数字段兼容

- [x] Task 2: 实现 boss_rhythm 修饰器 (AC: 1, 3, 4, 5, 6, 7, 8)
  - [x]2.1 替换 `createStubModifier('boss_rhythm')` 为完整实现
  - [x]2.2 `getParams(isElite)`: 满功率 bpmStart=90/bpmEnd=140/duration=60，精英 70/110/45
  - [x]2.3 模块级状态变量：rhythmElapsed、rhythmWordStart、rhythmWord、rhythmUnlockedCount
  - [x]2.4 `apply()`: 重置所有节奏状态
  - [x]2.5 `onTick(dt)`: 累计时间 → 计算当前 BPM → 计算节拍间隔 → 确定已解锁字母数 → 更新 DOM（锁定字母 opacity=0.3，当前字母添加 rhythm-pulse class）
  - [x]2.6 `cleanup()`: 恢复所有字母 opacity 和 class，重置状态

- [x] Task 3: 导出 isRhythmLocked() 函数 (AC: 2)
  - [x]3.1 在 `data/bossModifiers.ts` 导出 `isRhythmLocked(): boolean`
  - [x]3.2 检查条件：rhythmBpmStart 参数存在 且 state.player.index >= rhythmUnlockedCount

- [x] Task 4: battle.ts 集成 — handleKeyPress 锁定钩子 (AC: 2)
  - [x]4.1 在 `battle.ts` 顶部添加 `isRhythmLocked` import
  - [x]4.2 在 `handleKeyPress()` 中，`initAudio()` 之后、输入比较之前，添加 `if (isRhythmLocked()) return;`

- [x] Task 5: CSS 脉冲动画 (AC: 4)
  - [x]5.1 在 `style.css` 添加 `.letter.rhythm-pulse` 动画（scale + opacity 脉冲）
  - [x]5.2 添加 `@keyframes rhythmPulse` 关键帧

- [x] Task 6: 测试 (AC: 1-8)
  - [x]6.1 boss_rhythm getParams 测试：满功率参数、精英参数
  - [x]6.2 onTick 测试：解锁计数随时间递增、锁定字母 opacity 设置
  - [x]6.3 isRhythmLocked 测试：锁定/解锁状态判断
  - [x]6.4 BPM 递增测试：验证 BPM 从 start 线性插值到 end
  - [x]6.5 换词测试：新词出现时 unlocked count 重置
  - [x]6.6 cleanup 测试：所有状态和 DOM 恢复
  - [x]6.7 生命周期测试：apply → onTick → cleanup 不报错

## Dev Notes

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + bossModifiers.ts），不涉及 Pixi 系统
2. **依赖方向**：`data → core → systems → scenes` — 修饰器实现放 `data/bossModifiers.ts`，引擎不变
3. **唯一修改输入逻辑的修饰器**：boss_rhythm 是唯一需要阻断 handleKeyPress 的修饰器（其他修饰器仅改变词语或视觉效果）
4. **性能约束**：onTick 每 100ms 调用一次（dt=0.1），beat 计算和 DOM 操作要高效

### 已由 18.4-18.6 完成的基础设施（不要重复实现）

- `BossModifier` 接口（id, getParams, apply, cleanup, onTick?）[Source: `data/bossModifiers.ts:192-202`]
- `BossModifierParams` 接口（含 6 数值 + 6 视觉 + 3 认知参数 = 15 字段）[Source: `data/bossModifiers.ts:168-187`]
- `BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier>` [Source: `data/bossModifiers.ts:509-527`]
- `createStubModifier('boss_rhythm')` — 当前唯一 stub [Source: `data/bossModifiers.ts:526`]
- `applyModifier()` / `cleanupModifier()` / `tickModifier(dt)` 生命周期管理 [Source: `systems/bossModifierEngine.ts`]
- `startBossRotation()` / `stopBossRotation()` Boss 轮换引擎（20 秒切换） [Source: `systems/bossModifierEngine.ts`]
- `setActiveParams()` / `getActiveParams()` 活跃参数查询 [Source: `data/bossModifiers.ts:531-541`]
- `transformWordForModifier()` / `isRhythmLocked()` 分离的 battle.ts 钩子模式
- battle.ts 中所有 hook 已就位（startLevel、endLevel、timer tick 含 tickModifier(0.1)、playerWrong、completeWord、victory、gameOver）
- CSS transition: `.letter { transition: opacity 0.15s ease }` [Source: `style.css`]
- 测试 DOM mock：`createMockLetterEl(cls, text)` + `mockLetters[]` + `mockWordDisplayStyle` [Source: `tests/unit/systems/bossModifierEngine.test.ts:29-45`]

### boss_rhythm 与其他修饰器的关键区别

| 特性 | 视觉类 (18.5) | 认知类 (18.6) | boss_rhythm (18.7) |
|------|---------------|---------------|---------------------|
| 修改词语 | 否 | scramble/reverse 是 | 否 |
| 修改输入逻辑 | 否 | 否 | **是（阻断 handleKeyPress）** |
| 操作 DOM | opacity/transform | textContent | **opacity + CSS class** |
| 需要 battle.ts 新钩子 | 否 | setWord() 1行 | **handleKeyPress() 1行** |
| 时间递增难度 | boss_fade 加速 | 否 | **BPM 线性递增** |

### 节奏锁定实现设计（CRITICAL）

#### 参数设计

```typescript
// BossModifierParams 新增
rhythmBpmStart?: number   // boss_rhythm: 起始 BPM (90 满功率, 70 精英)
rhythmBpmEnd?: number     // boss_rhythm: 最终 BPM (140 满功率, 110 精英)
rhythmDuration?: number   // boss_rhythm: BPM 递增持续时间（秒）(60 满功率, 45 精英)
```

#### 模块级状态

```typescript
let rhythmElapsed = 0       // 总经过时间（用于 BPM 插值）
let rhythmWordStart = 0     // 当前词开始时间（用于节拍计数）
let rhythmWord = ''         // 当前词（检测换词）
let rhythmUnlockedCount = 0 // 已解锁字母数量
```

#### boss_rhythm 完整实现

```typescript
const bossRhythm: BossModifier = {
  id: 'boss_rhythm',
  getParams: (isElite) => ({
    rhythmBpmStart: isElite ? 70 : 90,
    rhythmBpmEnd: isElite ? 110 : 140,
    rhythmDuration: isElite ? 45 : 60,
  }),
  apply: () => {
    rhythmElapsed = 0
    rhythmWordStart = 0
    rhythmWord = ''
    rhythmUnlockedCount = 0
  },
  cleanup: () => {
    rhythmElapsed = 0
    rhythmWordStart = 0
    rhythmWord = ''
    rhythmUnlockedCount = 0
    document.querySelectorAll('#word-display .letter').forEach(el => {
      const htmlEl = el as HTMLElement
      htmlEl.style.opacity = ''
      htmlEl.classList.remove('rhythm-pulse')
    })
  },
  onTick(dt: number) {
    rhythmElapsed += dt
    const params = getActiveParams()
    if (!params?.rhythmBpmStart) return

    const currentWord = state.player.word
    // 新词重置节拍计数
    if (currentWord !== rhythmWord) {
      rhythmWord = currentWord
      rhythmWordStart = rhythmElapsed
    }

    // 计算当前 BPM（随时间线性递增）
    const t = Math.min(rhythmElapsed / (params.rhythmDuration ?? 60), 1)
    const bpm = params.rhythmBpmStart + ((params.rhythmBpmEnd ?? params.rhythmBpmStart) - params.rhythmBpmStart) * t
    const beatInterval = 60 / bpm  // 每拍秒数

    // 计算当前词已解锁字母数（首字母立即解锁 +1）
    const wordTime = rhythmElapsed - rhythmWordStart
    rhythmUnlockedCount = Math.min(
      Math.floor(wordTime / beatInterval) + 1,
      currentWord.length
    )

    // 更新 DOM 视觉
    const playerIdx = state.player.index
    document.querySelectorAll('#word-display .letter').forEach((el, i) => {
      const htmlEl = el as HTMLElement
      if (el.classList.contains('correct')) {
        htmlEl.style.opacity = ''
        htmlEl.classList.remove('rhythm-pulse')
        return
      }
      if (i < rhythmUnlockedCount) {
        // 已解锁
        htmlEl.style.opacity = '1'
        if (i === playerIdx) {
          htmlEl.classList.add('rhythm-pulse')
        } else {
          htmlEl.classList.remove('rhythm-pulse')
        }
      } else {
        // 锁定
        htmlEl.style.opacity = '0.3'
        htmlEl.classList.remove('rhythm-pulse')
      }
    })
  },
}
```

#### isRhythmLocked 导出函数

```typescript
/** 节奏锁定检查：handleKeyPress 调用 */
export function isRhythmLocked(): boolean {
  const params = getActiveParams()
  if (!params?.rhythmBpmStart) return false
  return state.player.index >= rhythmUnlockedCount
}
```

#### 节拍时序示例（BPM=90, 5 字母词 "HELLO"）

```
beatInterval = 60/90 = 0.667s

t=0.000s: unlocked=1 (H)      → H亮 E暗 L暗 L暗 O暗  | 可打 H
t=0.667s: unlocked=2 (H,E)    → H✓  E亮 L暗 L暗 O暗  | 可打 E
t=1.333s: unlocked=3 (H,E,L)  → H✓  E✓  L亮 L暗 O暗  | 可打 L
t=2.000s: unlocked=4 (H,E,L,L)→ H✓  E✓  L✓  L亮 O暗  | 可打 L
t=2.667s: unlocked=5 (全部)    → H✓  E✓  L✓  L✓  O亮  | 可打 O
```

**注意：玩家打字可能快于节拍。如果 index=1 但 unlocked=1（仅 H 解锁），则 E 被锁定，按键被忽略。**

### battle.ts 集成点（CRITICAL — 唯一修改）

**handleKeyPress() — 仅需 2 行改动：**

```typescript
// battle.ts:handleKeyPress
import { ..., isRhythmLocked } from '../data/bossModifiers'

function handleKeyPress(data: { key: string; timestamp: number }): void {
  if (state.phase !== 'battle') return;
  initAudio();

  if (isRhythmLocked()) return;  // ← 新增：锁定时静默忽略所有按键

  const k = data.key.toLowerCase();
  const expect = state.player.word[state.player.index]?.toLowerCase();
  // ... 其余不变
}
```

**不需要修改的部分：**
- `setWord()` — boss_rhythm 不变换词语
- `playerCorrect()` — index 递增逻辑不变
- `renderWord()` — 初始渲染不变，onTick 负责视觉更新
- `startTimer()` / `endLevel()` — modifier 生命周期已集成

### CSS 脉冲动画

```css
/* style.css 新增 */
.letter.rhythm-pulse {
  animation: rhythmPulse 0.4s ease-in-out infinite;
}

@keyframes rhythmPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.85; }
}
```

### BossModifierParams 扩展（CRITICAL）

```typescript
export interface BossModifierParams {
  // 数值规则类（已有 6 字段）
  decayRate?: number
  comboPunishRate?: number
  scoreCap?: number
  timeSpeed?: number
  targetMultiplier?: number
  diminishRate?: number
  // 视觉类（Story 18.5 已有 6 字段）
  fadeSpeed?: number
  fadeSpeedEnd?: number
  fadeDuration?: number
  driftAmplitude?: number
  driftFrequency?: number
  spotlightRadius?: number
  // 认知类（Story 18.6 已有 3 字段）
  scrambleMode?: number
  reverseActive?: number
  maskRate?: number
  // 节奏类（Story 18.7 新增 3 字段）
  rhythmBpmStart?: number   // boss_rhythm: 起始 BPM
  rhythmBpmEnd?: number     // boss_rhythm: 最终 BPM
  rhythmDuration?: number   // boss_rhythm: BPM 递增持续时间（秒）
}
```

### 注册表替换方式

```typescript
// 替换前
boss_rhythm: createStubModifier('boss_rhythm'),

// 替换后
boss_rhythm: bossRhythm,
```

替换后 `createStubModifier` 函数将无调用者，可删除。

### 测试 DOM mock 注意事项

boss_rhythm 的 onTick 调用 `htmlEl.classList.remove('rhythm-pulse')` 和 `htmlEl.classList.add('rhythm-pulse')`。当前 mock 的 `classList.remove` 是 `vi.fn()`（不实际移除），但 `classList.add` 会追加到 `_cls`。

对于测试：
- 验证 `classList.add` 被调用了 `'rhythm-pulse'` 参数
- 验证 `classList.remove` 被调用了 `'rhythm-pulse'` 参数
- 验证锁定字母的 `style.opacity` 为 `'0.3'`
- 验证解锁字母的 `style.opacity` 为 `'1'`

### 边界情况

| 场景 | 预期行为 |
|------|----------|
| 1 字母词 | 首字母立即解锁，beatInterval 无影响 |
| 空词 | rhythmUnlockedCount=0，所有输入被锁 |
| BPM 递增到上限 | t=1 后 BPM 保持 bpmEnd 不变 |
| 玩家打字快于节拍 | 超前的按键被静默忽略 |
| 换词（completeWord） | 检测到 word 变化，重置 wordStart 和 unlocked |
| 修饰器轮换（20s 切换） | cleanup 恢复所有 DOM，新修饰器 apply |

### Project Structure Notes

**修改文件：**
- `src/src/data/bossModifiers.ts` — 扩展 BossModifierParams + boss_rhythm 实现 + isRhythmLocked 导出 + 删除 createStubModifier（无调用者）
- `src/src/systems/battle.ts` — handleKeyPress() 中 1 行 import + 1 行锁定检查
- `src/src/style.css` — rhythm-pulse 动画 + @keyframes
- `src/tests/unit/systems/bossModifierEngine.test.ts` — boss_rhythm 测试用例

**不修改文件（已完成）：**
- `systems/bossModifierEngine.ts` — 引擎不变，onTick 自动调用新实现
- `core/types.ts` — 不需要新类型
- `core/state.ts` — 不需要新状态字段

### References

- [Source: docs/epic-18-boss-act-structure.md — Story 18.7 验收标准 + Boss 池定义]
- [Source: docs/stories/18-6-boss-cognitive-typing.md — 认知修饰器实现模式参考]
- [Source: docs/stories/18-5-boss-visual-typing.md — 视觉修饰器 onTick 模式参考]
- [Source: docs/stories/18-4-boss-modifier-framework.md — BossModifier 接口 + 生命周期]
- [Source: src/src/data/bossModifiers.ts:526 — 当前 stub 实现]
- [Source: src/src/data/bossModifiers.ts:192-202 — BossModifier 接口]
- [Source: src/src/data/bossModifiers.ts:168-187 — BossModifierParams 接口]
- [Source: src/src/systems/bossModifierEngine.ts:51-59 — tickModifier 调用 onTick]
- [Source: src/src/systems/battle.ts:122-136 — handleKeyPress() 输入验证（锁定钩子插入点）]
- [Source: src/src/systems/battle.ts:92-110 — renderWord() DOM 结构]
- [Source: src/src/systems/battle.ts:489-515 — startTimer() 每 100ms tickModifier(0.1)]
- [Source: docs/project-context.md — 依赖方向、性能预算]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无调试问题

### Completion Notes List

- 完整实现 boss_rhythm 修饰器：BPM 线性递增（满功率 90→140，精英 70→110），字母按节拍逐个解锁
- 导出 isRhythmLocked() 函数，battle.ts handleKeyPress 中 1 行锁定检查
- 首字母立即解锁（+1 规则：`Math.floor(wordTime / beatInterval) + 1`）
- CSS rhythm-pulse 脉冲动画（scale 1→1.12, opacity 1→0.85）
- 删除 createStubModifier（boss_rhythm 是最后一个 stub，全部 13 修饰器完整实现）
- 测试覆盖：105 pass（引擎测试），新增 boss_rhythm 20+ 测试用例
- 3 个测试需修复时序问题（首次 tick 注册词语导致 wordTime=0），已修正
- Code Review 修复 3 个 MEDIUM：单字母词边界测试、isRhythmLocked 首 tick 前状态测试、BPM 递增验证测试（换词后解锁速度证明 BPM 升高）

### File List

- `src/src/data/bossModifiers.ts` — BossModifierParams 扩展 + boss_rhythm 完整实现 + isRhythmLocked 导出 + 删除 createStubModifier
- `src/src/systems/battle.ts` — import isRhythmLocked + handleKeyPress 锁定检查
- `src/src/style.css` — .letter.rhythm-pulse 动画 + @keyframes rhythmPulse
- `src/tests/unit/systems/bossModifierEngine.test.ts` — boss_rhythm 测试 + isRhythmLocked 测试 + 生命周期测试 + 更新 stub 计数
- `docs/stories/sprint-status.yaml` — 18-7 → done
