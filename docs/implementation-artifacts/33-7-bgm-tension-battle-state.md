# Story 33.7: BGM 张力层 — 战局状态驱动

Status: done

## Story

As a 玩家,
I want 通过不协和音的引入/释放传达战局压力，
so that 无需看 UI 也能感知危险，通关瞬间张力释放回归纯净 drone 形成"呼吸感"。

## Acceptance Criteria (AC)

1. 提供 `updateBGMTension(level: number)` 接口，level 0-4
2. level 0（安全）：纯 drone，无张力音
3. level 1（正常）：drone 不变，由节奏脉冲层提供活力
4. level 2（时间紧迫，<30%）：叠入 Bb2（116.54Hz）持续音，形成小七度不安感
5. level 3（Boss 阶段）：drone 升至 C3，叠入 F#2（92.50Hz）增四度/三全音
6. level 4（濒死，<10%）：drone 加入 tremolo（音量 8Hz 颤抖），所有张力音音量 ×1.5
7. 通关瞬间：张力音 200ms 快速 fadeout，回归纯净 C drone → 评级音效接管
8. 各 level 之间切换使用 500ms crossfade，避免突兀跳变

## Tasks / Subtasks

- [x] Task 1: 张力层数据结构与状态管理 (AC: #1) — 2 tests
  - [x] 1.1 模块级状态：`tensionLevel: number = 0`、`tensionOsc: OscillatorNode | null`、`tensionGain: GainNode | null`、`tremoloOsc: OscillatorNode | null`、`tremoloGain: GainNode | null`
  - [x] 1.2 新增 `updateBGMTension(level: number)` 导出函数
  - [x] 1.3 如果 level 等于当前 `tensionLevel`，return（幂等）
  - [x] 1.4 如果 drone 未启动（`!droneOsc1`），记录 tensionLevel 但不创建振荡器
  - [x] 1.5 单元测试: 同 level 重复调用为空操作
  - [x] 1.6 单元测试: drone 未启动时不创建 oscillator
- [x] Task 2: Level 0-1 — 基础状态 (AC: #2, #3) — 2 tests
  - [x] 2.1 level 0/1: 清除所有张力振荡器（500ms fadeout 后 stop）
  - [x] 2.2 level 0/1 → 已在 level 0/1 时无操作
  - [x] 2.3 单元测试: updateBGMTension(0) 清除张力音
  - [x] 2.4 单元测试: level 1 不创建额外 oscillator
- [x] Task 3: Level 2 — 小七度不安感 (AC: #4) — 2 tests
  - [x] 3.1 创建 Bb2 sine oscillator（116.54Hz），音量 0.02
  - [x] 3.2 通过 `connectToOutput()` 接入混响
  - [x] 3.3 从 level 0/1 切换时 500ms `linearRampToValueAtTime` 渐入
  - [x] 3.4 单元测试: level 2 创建 116.54Hz sine oscillator
  - [x] 3.5 单元测试: level 2 音量 500ms 渐入至 0.02
- [x] Task 4: Level 3 — 增四度/三全音 (AC: #5) — 2 tests
  - [x] 4.1 停掉 level 2 的 Bb2（500ms fadeout）
  - [x] 4.2 创建 F#2 sine oscillator（92.50Hz），音量 0.025
  - [x] 4.3 drone 基音频率从 C2(65.41Hz) 渐变至 C3(130.81Hz)（500ms `exponentialRampToValueAtTime`）
  - [x] 4.4 单元测试: level 3 创建 92.50Hz sine oscillator
  - [x] 4.5 单元测试: level 3 drone 基音频率升至 130.81Hz
- [x] Task 5: Level 4 — tremolo 颤抖 (AC: #6) — 2 tests
  - [x] 5.1 保持 level 3 的 F#2 张力音
  - [x] 5.2 创建 tremolo LFO: sine 8Hz oscillator → GainNode（连接到 droneGain1.gain）
  - [x] 5.3 tremolo 深度: gain 在 0.5~1.5 范围振动（中心 1.0，幅度 0.5）
  - [x] 5.4 所有张力音（F#2）音量 ×1.5（从 0.025 升至 0.0375）
  - [x] 5.5 单元测试: level 4 创建 8Hz tremolo oscillator
  - [x] 5.6 单元测试: level 4 张力音音量 ×1.5
- [x] Task 6: 通关释放 — 快速 fadeout (AC: #7) — 2 tests
  - [x] 6.1 新增 `releaseBGMTension()` 导出函数（或 `updateBGMTension(0)` 时使用 200ms 而非 500ms fadeout）
  - [x] 6.2 张力音 200ms fadeout → stop(now + 0.25)
  - [x] 6.3 恢复 drone 基音至 C2(65.41Hz)（500ms 渐变回）
  - [x] 6.4 清除 tremolo（如有）
  - [x] 6.5 tensionLevel 重置为 0
  - [x] 6.6 单元测试: releaseBGMTension 执行 200ms fadeout
  - [x] 6.7 单元测试: release 后 drone 基音恢复 C2
- [x] Task 7: battle.ts 集成 — tick 循环张力计算 (AC: #1, #4, #5, #6) — 无自动化测试
  - [x] 7.1 导入 `updateBGMTension`（和可选 `releaseBGMTension`）
  - [x] 7.2 在 timer tick (`setInterval` 100ms) 中计算 tension level
  - [x] 7.3 在 `endLevel()` 中调用 `releaseBGMTension()`（在 `stopBGM()` 之前）
  - [x] 7.4 在 `gameOver()` 中同样调用
- [x] Task 8: 暴露测试接口 + _chordInternals 扩展
  - [x] 8.1 通过 `_chordInternals` 暴露 `tensionLevel` getter
  - [x] 8.2 暴露 `_updateBGMTension` 引用供测试直接调用
  - [x] 8.3 暴露 `_releaseBGMTension` 引用供测试直接调用

## Dev Notes

### 设计要点

张力层是 BGM 系统的第三层——通过不协和音程传达战局压力。当时间充裕时只有温暖的 C drone；时间紧迫时 Bb2 的小七度带来隐隐不安；Boss 战的 F#2 增四度（"魔鬼音程"）制造紧张感；濒死时 tremolo 颤抖传达危急。通关瞬间张力瞬间释放，回归纯净 drone，与评级音效交接。

### 实现细节

```typescript
// 张力层状态（模块级）
let tensionLevel = 0;
let tensionOsc: OscillatorNode | null = null;
let tensionGain: GainNode | null = null;
let tremoloOsc: OscillatorNode | null = null;
let tremoloGain: GainNode | null = null;

// 张力音频率表
const TENSION_FREQS: Record<number, number> = {
  2: 116.54,  // Bb2 — 小七度
  3: 92.50,   // F#2 — 增四度/三全音
};

export function updateBGMTension(level: number): void {
  if (level === tensionLevel) return; // 幂等
  if (!audioContext || !droneOsc1) {
    tensionLevel = level;
    return; // drone 未启动，仅记录
  }

  const ctx = audioContext;
  const now = ctx.currentTime;
  const prevLevel = tensionLevel;
  tensionLevel = level;

  // 清除旧张力音（500ms fadeout）
  if (tensionOsc && (level <= 1 || TENSION_FREQS[level] !== TENSION_FREQS[prevLevel])) {
    tensionGain!.gain.linearRampToValueAtTime(0, now + 0.5);
    tensionOsc.stop(now + 0.55);
    tensionOsc = tensionGain = null;
  }

  // 清除 tremolo（从 level 4 退出时）
  if (tremoloOsc && level < 4) {
    tremoloOsc.stop(now + 0.5);
    tremoloOsc = tremoloGain = null;
  }

  // Level 2/3: 创建张力音
  if (level >= 2 && level <= 3 && !tensionOsc) {
    const freq = TENSION_FREQS[level] ?? 116.54;
    const vol = level === 3 ? 0.025 : 0.02;
    tensionOsc = ctx.createOscillator();
    tensionGain = ctx.createGain();
    tensionOsc.type = 'sine';
    tensionOsc.frequency.setValueAtTime(freq, now);
    tensionGain.gain.setValueAtTime(0, now);
    tensionGain.gain.linearRampToValueAtTime(vol, now + 0.5); // 500ms 渐入
    tensionOsc.connect(tensionGain);
    connectToOutput(tensionGain);
    tensionOsc.start(now);
  }

  // Level 3: drone 基音升至 C3
  if (level === 3) {
    droneOsc1!.frequency.exponentialRampToValueAtTime(130.81, now + 0.5);
  } else if (prevLevel === 3 && level < 3) {
    droneOsc1!.frequency.exponentialRampToValueAtTime(65.41, now + 0.5);
  }

  // Level 4: 叠加 tremolo + 张力音 ×1.5
  if (level === 4) {
    // 先确保 level 3 的张力音存在
    if (!tensionOsc) {
      const freq = TENSION_FREQS[3]; // F#2
      tensionOsc = ctx.createOscillator();
      tensionGain = ctx.createGain();
      tensionOsc.type = 'sine';
      tensionOsc.frequency.setValueAtTime(freq, now);
      tensionGain.gain.setValueAtTime(0, now);
      tensionGain.gain.linearRampToValueAtTime(0.0375, now + 0.5); // 0.025 × 1.5
      tensionOsc.connect(tensionGain);
      connectToOutput(tensionGain);
      tensionOsc.start(now);
    } else {
      tensionGain!.gain.linearRampToValueAtTime(0.0375, now + 0.5);
    }

    // Tremolo LFO
    if (!tremoloOsc) {
      tremoloOsc = ctx.createOscillator();
      tremoloGain = ctx.createGain();
      tremoloOsc.type = 'sine';
      tremoloOsc.frequency.setValueAtTime(8, now); // 8Hz
      tremoloGain.gain.setValueAtTime(0.5, now); // 振幅 0.5（0.5~1.5 范围）
      tremoloOsc.connect(tremoloGain);
      tremoloGain.connect(droneGain1!.gain); // 调制 drone 音量
      tremoloOsc.start(now);
    }
  }
}

export function releaseBGMTension(): void {
  if (!audioContext) return;
  const now = audioContext.currentTime;

  // 张力音 200ms 快速 fadeout
  if (tensionOsc) {
    tensionGain!.gain.linearRampToValueAtTime(0, now + 0.2);
    tensionOsc.stop(now + 0.25);
    tensionOsc = tensionGain = null;
  }

  // 清除 tremolo
  if (tremoloOsc) {
    tremoloOsc.stop(now + 0.2);
    tremoloOsc = tremoloGain = null;
  }

  // 恢复 drone 基音至 C2
  if (droneOsc1) {
    droneOsc1.frequency.exponentialRampToValueAtTime(65.41, now + 0.5);
  }

  tensionLevel = 0;
}
```

### battle.ts 集成点

```typescript
// battle.ts — timer tick 中（setInterval 100ms 回调内，updateTimerDisplay() 之后）
const ratio = state.time / (state.timeMax + state.player.timeBonus);
const stageType = getStageType(state.level);
let tension = 0;
if (stageType === 'boss') tension = Math.max(tension, 3);
if (ratio < 0.1) tension = 4;
else if (ratio < 0.3) tension = Math.max(tension, 2);
else if (ratio > 0.3) tension = Math.max(tension, 1);
updateBGMTension(tension);

// battle.ts — endLevel() 中（stopBGM() 之前）
releaseBGMTension();
stopBGM();

// battle.ts — gameOver() 中
releaseBGMTension();
stopBGM();
```

### 音量层级关系（完整 BGM 系统）

| 层 | 峰值/RMS | 频段 | 角色 |
|---|---|---|---|
| 打字 Click | 0.035 | 800Hz+ noise | 前景触底 |
| 打字 Thock | 0.025 | 280Hz triangle | 前景共鸣 |
| 打字 Tone | 0.025 | 300-700Hz sine | 前景 combo 积累 |
| 资源和弦 | ≤0.03 RMS | 120-2000Hz | 背景补充 |
| Kick 脉冲 | 0-0.02 | 40-80Hz | BGM 节奏层 |
| Drone C2 | 0.03 | 65Hz | BGM 基底 |
| Drone C3 | 0.015 | 131Hz | BGM 泛音 |
| **张力 Bb2** | **0.02** | **117Hz** | **BGM 时间紧迫** |
| **张力 F#2** | **0.025** | **93Hz** | **BGM Boss 紧张** |
| **张力 F#2 ×1.5** | **0.0375** | **93Hz** | **BGM 濒死** |

张力音频段（93-117Hz）位于 drone C2(65Hz) 和 C3(131Hz) 之间，与打字音（280Hz+）和资源音（120Hz+）分离。

### Crossfade 策略

Level 切换使用 500ms `linearRampToValueAtTime` 实现平滑过渡：
- 旧张力音 500ms 渐出 → stop(now + 0.55)
- 新张力音 gain 从 0 开始 500ms 渐入
- drone 频率变化使用 500ms `exponentialRampToValueAtTime`

通关释放使用 200ms 快速 fadeout（`releaseBGMTension`），让评级音效在张力消失后立即接管。

### 踩坑预防（33-5/33-6 已知）

1. `connectToOutput` 依赖模块级 `audioContext` — 必须通过 `_setMockContext` 设置
2. `OscillatorNode.stop()` 只能调用一次 — 张力音 fadeout 后 stop 不需要额外防护（每个振荡器只创建一次 stop 一次）
3. `vi.hoisted()` 包裹 `mockState` — 33-6 已修复此模式，直接复用
4. Tremolo LFO 连接到 `droneGain1.gain`（AudioParam）而非 `droneGain1`（AudioNode）— 需要在 mock 中支持 `gain.gain` 上的 `connect` 被调用（当前 mock 的 `gain` 属性是普通对象，需确认 `connect` 可用性）
5. `exponentialRampToValueAtTime` 不能 ramp 到 0 — 用 `linearRampToValueAtTime` 做 fadeout，`exponentialRampToValueAtTime` 只用于频率变化

### 测试策略

扩展现有 `tests/unit/effects/sound-bgm.test.ts`，新增 "BGM 张力层 (Story 33.7)" describe block。

测试需要：
- Mock state 的 `combo` 和时间相关字段
- 通过 `_chordInternals._updateBGMTension` / `_releaseBGMTension` 直接调用
- 先调用 `startBGM()` 启动 drone 后再测试张力层（张力音依赖 drone 存在）
- Tremolo LFO 测试需验证 8Hz oscillator 创建和 `connect` 到 gain 参数

约 12 个测试，覆盖 8 个 AC。

### Project Structure Notes

- 代码位置: `src/src/effects/sound.ts`（新增张力层 ~80 行，总 ~775 行）
- 测试位置: `src/tests/unit/effects/sound-bgm.test.ts`（追加 ~12 tests）
- 集成位置: `src/src/systems/battle.ts`（timer tick 张力计算 ~8 行 + endLevel/gameOver 各 1 行）

### References

- [Source: docs/stories/epic-23-sound-system-refactor.md#Story 23.7]
- [Source: docs/implementation-artifacts/33-6-bgm-rhythm-pulse-typing.md] — 前置 story，kick 脉冲
- [Source: docs/implementation-artifacts/33-5-bgm-drone-bass.md] — drone 基础
- [Source: src/src/effects/sound.ts:614-660] — drone 振荡器管理（droneOsc1/2, droneGain1/2）
- [Source: src/src/effects/sound.ts:662-682] — _chordInternals 测试辅助
- [Source: src/src/systems/battle.ts:639-660] — timer tick setInterval 100ms
- [Source: src/src/systems/battle.ts:683-685] — endLevel() → stopBGM()
- [Source: src/src/systems/battle.ts:1044-1047] — gameOver() → stopBGM()
- [Source: src/src/systems/battle.ts:23] — getStageType import

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all 12 new tests passed on first run. 135/135 effects tests pass.

### Completion Notes List

- `updateBGMTension(level)`: 5-level tension system (0=safe, 1=normal, 2=Bb2 minor 7th, 3=F#2 tritone + drone↑C3, 4=tremolo + ×1.5 vol).
- `releaseBGMTension()`: 200ms fast fadeout for victory moment, restores drone to C2.
- Tension frequencies: Bb2=116.54Hz (level 2), F#2=92.50Hz (level 3/4). All in 93-117Hz range, separated from typing (280Hz+) and resources (120Hz+).
- Crossfade: 500ms `linearRampToValueAtTime` for level transitions, `exponentialRampToValueAtTime` for drone freq changes.
- Tremolo LFO: 8Hz sine → GainNode connected to droneGain1.gain AudioParam, amplitude ±0.5.
- `_chordInternals` extended: `tensionLevel` getter, `_updateBGMTension`, `_releaseBGMTension`. `_stopBGMImmediate` updated to clean up tension/tremolo state.
- battle.ts integration: tension calculated in timer tick from `time/timeMax` ratio + stageType. `releaseBGMTension()` called in endLevel() and gameOver() before stopBGM().
- 12 new tests in "BGM 张力层 (Story 33.7)" describe block. Total BGM tests: 27. Total effects tests: 135.

### File List

- `src/src/effects/sound.ts` — tension layer (~80 lines), updateBGMTension/releaseBGMTension exports, _chordInternals extended
- `src/tests/unit/effects/sound-bgm.test.ts` — 12 new tension tests, mock gain.gain.connect added
- `src/src/systems/battle.ts` — import tension functions, timer tick tension calculation, endLevel/gameOver integration
- `docs/implementation-artifacts/33-7-bgm-tension-battle-state.md` — story file
