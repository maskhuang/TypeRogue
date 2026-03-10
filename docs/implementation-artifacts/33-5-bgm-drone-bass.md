# Story 33.5: BGM 骨架 — Drone 持续低音

Status: done

## Story

As a 玩家,
I want 战斗中有恒定的低频持续音作为调性锚点，
so that 打字和资源音效不会感觉"悬浮在空气中"，而是有一个温暖的低音基底承托整个音景。

## Acceptance Criteria (AC)

1. 战斗开始时启动 C2（65.41Hz）sine 持续音，音量 ~0.03，极低存在感
2. 叠加 C3（130.81Hz）泛音层，音量 ~0.015，增加温度
3. 使用 `connectToOutput()` 接入全局混响管线
4. 战斗结束/离开时 500ms fadeout 后停止所有 drone 振荡器
5. 提供 `startBGM()` / `stopBGM()` 导出接口

## Tasks / Subtasks

- [x] Task 1: Drone 振荡器创建与启动 (AC: #1, #2, #3) — 4 tests
  - [x] 1.1 新增 `startBGM()` 导出函数：创建 2 个 sine OscillatorNode（C2=65.41Hz, C3=130.81Hz）
  - [x] 1.2 各自通过 GainNode 控制音量（C2: 0.03, C3: 0.015）
  - [x] 1.3 GainNode 通过 `connectToOutput()` 接入全局混响
  - [x] 1.4 模块级保存 drone 状态：`droneOsc1`, `droneOsc2`, `droneGain1`, `droneGain2` 用于 stop
  - [x] 1.5 重复调用 `startBGM()` 不叠加（已存在时 return）
  - [x] 1.6 单元测试: startBGM 创建 2 个 sine oscillator (65.41Hz, 130.81Hz)
  - [x] 1.7 单元测试: startBGM 音量正确 (0.03, 0.015)
  - [x] 1.8 单元测试: 重复 startBGM 不创建额外 oscillator
  - [x] 1.9 单元测试: startBGM 在无 audioContext 时 return（不崩溃）
- [x] Task 2: stopBGM — 500ms fadeout 停止 (AC: #4, #5) — 3 tests
  - [x] 2.1 新增 `stopBGM()` 导出函数
  - [x] 2.2 对两个 GainNode 执行 `linearRampToValueAtTime(0, now + 0.5)`（500ms fadeout）
  - [x] 2.3 fadeout 后调用 `osc.stop(now + 0.55)` 释放资源（50ms 余量避免 click）
  - [x] 2.4 清空模块级 drone 引用（允许下次 startBGM 重新创建）
  - [x] 2.5 未启动时调用 stopBGM 不崩溃（空操作）
  - [x] 2.6 单元测试: stopBGM 执行 linearRamp→0 + 延迟 stop
  - [x] 2.7 单元测试: stopBGM 后可重新 startBGM
  - [x] 2.8 单元测试: 未启动时 stopBGM 为空操作
- [x] Task 3: battle.ts 集成 (AC: #1, #4) — 无自动化测试（集成级）
  - [x] 3.1 `battle.ts` 导入 `startBGM`, `stopBGM`
  - [x] 3.2 在 `state.phase = 'battle'` 后调用 `startBGM()`（line ~783）
  - [x] 3.3 在 `endLevel()` 开头调用 `stopBGM()`（line ~685，在 clearInterval 后）
  - [x] 3.4 在 `gameOver()` 中也调用 `stopBGM()`（确保失败路径也停止）
- [x] Task 4: _chordInternals 暴露 + 测试辅助
  - [x] 4.1 在 `_chordInternals` 中暴露 drone 状态的 getter（`droneActive` boolean）
  - [x] 4.2 暴露 `_stopBGMImmediate()` 测试辅助（跳过 fadeout 直接 stop，用于 afterEach 清理）

## Dev Notes

### 设计要点

Drone 是 BGM 系统最基础的层——一个恒定的低音嗡鸣，作为所有音效的"地面"。音量极低（0.03），不应有任何存在感，只有关掉后才会感觉"少了什么"。

C2 (65.41Hz) 是 C 大调基音，配合 C3 (130.81Hz) 八度泛音形成温暖的基底。后续 Story 33-6（节奏脉冲）和 33-7（张力层）将在此基础上叠加。

### 实现细节

```typescript
// Drone 状态（模块级）
let droneOsc1: OscillatorNode | null = null;
let droneOsc2: OscillatorNode | null = null;
let droneGain1: GainNode | null = null;
let droneGain2: GainNode | null = null;

export function startBGM(): void {
  if (!audioContext || droneOsc1) return; // 无上下文或已启动
  const ctx = audioContext;
  const now = ctx.currentTime;

  // C2 基音层
  droneOsc1 = ctx.createOscillator();
  droneGain1 = ctx.createGain();
  droneOsc1.type = 'sine';
  droneOsc1.frequency.setValueAtTime(65.41, now);
  droneGain1.gain.setValueAtTime(0.03, now);
  droneOsc1.connect(droneGain1);
  connectToOutput(droneGain1);
  droneOsc1.start(now);

  // C3 泛音层
  droneOsc2 = ctx.createOscillator();
  droneGain2 = ctx.createGain();
  droneOsc2.type = 'sine';
  droneOsc2.frequency.setValueAtTime(130.81, now);
  droneGain2.gain.setValueAtTime(0.015, now);
  droneOsc2.connect(droneGain2);
  connectToOutput(droneGain2);
  droneOsc2.start(now);
}

export function stopBGM(): void {
  if (!audioContext || !droneOsc1) return;
  const now = audioContext.currentTime;

  // 500ms fadeout
  droneGain1!.gain.linearRampToValueAtTime(0, now + 0.5);
  droneGain2!.gain.linearRampToValueAtTime(0, now + 0.5);
  droneOsc1.stop(now + 0.55);
  droneOsc2!.stop(now + 0.55);

  droneOsc1 = droneOsc2 = null;
  droneGain1 = droneGain2 = null;
}
```

### battle.ts 集成点

```typescript
// battle.ts — startLevel() 中（line ~782 之后）
state.phase = 'battle';
startBGM();  // ← 新增

// battle.ts — endLevel() 中（line ~683 之后）
function endLevel(): void {
  if (timerInterval) clearInterval(timerInterval);
  stopBGM();  // ← 新增
  stopScoreRoller();
  // ...
}
```

### 音量层级关系（33-4 确立）

| 层 | 峰值/RMS | 角色 |
|---|---|---|
| 打字音 | ~0.050 RMS | 前景主角 |
| 结算音 | ~0.03-0.04/音 | 短暂反馈 |
| 资源和弦 | ≤0.03 RMS | 背景补充 |
| **Drone C2** | **0.03** | **最底层基底** |
| **Drone C3** | **0.015** | **泛音层** |

Drone 总 RMS ≈ √(0.03² + 0.015²) ≈ 0.034，与打字音同量级但频段完全分离（65-131Hz vs 打字音 200Hz+），不会遮盖。

### 测试策略

测试文件：新建 `tests/unit/effects/sound-bgm.test.ts`，与资源和弦测试分离。

复用 `createMockAudioContext()` 模式（参考 `sound-chord.test.ts` line 43-90）：
- mock oscillator 收集 `frequency.setValueAtTime` 调用验证频率
- mock gain 收集 `gain.setValueAtTime`/`linearRampToValueAtTime` 调用验证音量和 fadeout
- `_chordInternals._setMockContext` 设置测试上下文

⚠️ **踩坑预防（33-3/33-4 已知）：**
1. `connectToOutput` 依赖模块级 `audioContext` — 必须通过 `_setMockContext` 设置
2. `softAttack(gain, vol, time)` 传 GainNode（不是 `gain.gain`）— drone 不使用 softAttack，直接设 gain.gain
3. oscillator `stop()` 后不能重新 `start()` — 必须创建新实例，所以 stopBGM 清空引用

### Project Structure Notes

- 代码位置: `src/src/effects/sound.ts`（新增 drone 部分 ~40 行，总 ~635 行）
- 测试位置: `src/tests/unit/effects/sound-bgm.test.ts`（新文件，~7 tests）
- 集成位置: `src/src/systems/battle.ts`（2-3 行集成调用）
- battle.ts 已有 `initAudio` 导入，追加 `startBGM`/`stopBGM` 即可

### References

- [Source: docs/stories/epic-23-sound-system-refactor.md#Story 23.5]
- [Source: docs/implementation-artifacts/33-4-mix-balance-extreme-cases.md] — 前置 story，音量层级
- [Source: src/src/effects/sound.ts:159-163] — connectToOutput 全局混响管线
- [Source: src/src/effects/sound.ts:166-171] — initAudio 上下文创建
- [Source: src/src/systems/battle.ts:782] — state.phase = 'battle'（startBGM 插入点）
- [Source: src/src/systems/battle.ts:683-690] — endLevel()（stopBGM 插入点）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all 7 tests passed on first run. 115/115 effects tests pass.

### Completion Notes List

- `startBGM()` creates 2 sine oscillators: C2 (65.41Hz, vol 0.03) + C3 (130.81Hz, vol 0.015), connected via `connectToOutput()`.
- `stopBGM()` performs 500ms `linearRampToValueAtTime(0)` fadeout, then `osc.stop(now + 0.55)` with 50ms buffer.
- Idempotent: repeated `startBGM()` no-ops; `stopBGM()` when not active no-ops.
- Module-level state: `droneOsc1/2`, `droneGain1/2` — cleared on stop, enabling restart.
- `_chordInternals` extended: `droneActive` (getter), `_stopBGMImmediate()` (test cleanup).
- battle.ts integration: `startBGM()` after `state.phase = 'battle'`, `stopBGM()` in `endLevel()` and `gameOver()`.
- New test file `sound-bgm.test.ts` with 7 tests covering start/stop/idempotency/no-context.

### File List

- `src/src/effects/sound.ts` — drone oscillators, startBGM/stopBGM exports, _chordInternals extended
- `src/tests/unit/effects/sound-bgm.test.ts` — new file, 7 BGM drone tests
- `src/src/systems/battle.ts` — import startBGM/stopBGM, call in startLevel/endLevel/gameOver
- `docs/implementation-artifacts/33-5-bgm-drone-bass.md` — story file
- `docs/implementation-artifacts/sprint-status.yaml` — status tracking
