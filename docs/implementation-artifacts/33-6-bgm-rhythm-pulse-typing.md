# Story 33.6: BGM 节奏脉冲层 — 打字驱动

Status: done

## Story

As a 玩家,
I want 每次按键时有极轻的低频 kick 脉冲跟随 combo 渐强，
so that 打字节奏转化为隐性节拍，产生"groove"感，combo 断裂时回归 drone 的寂静形成对比。

## Acceptance Criteria (AC)

1. 每次按键后放一个极轻 kick 脉冲（sine 80→40Hz 快速下滑，20ms 衰减）
2. 脉冲音量跟随 combo：combo 0 时无脉冲，combo 10+ 时音量 ~0.02
3. combo 断裂时脉冲消失，只剩 drone 的寂静（对比感）
4. 脉冲不随打字加密而叠加爆音（同一时刻最多一个脉冲在响）
5. 脉冲频段（40-80Hz）不与资源音效 / 打字音冲突

## Tasks / Subtasks

- [x] Task 1: kick 脉冲合成函数 (AC: #1, #5) — 3 tests
  - [x] 1.1 新增 `playKickPulse()` 内部函数（不导出，由 `playTypeSound` 调用）
  - [x] 1.2 创建 sine oscillator，频率从 80Hz → 40Hz 快速下滑（`exponentialRampToValueAtTime`）
  - [x] 1.3 GainNode 设音量，20ms 衰减（`exponentialRampToValueAtTime(0.001, t + 0.02)`）
  - [x] 1.4 通过 `connectToOutput()` 接入全局混响
  - [x] 1.5 osc.stop(t + 0.025) 释放资源（5ms 余量）
  - [x] 1.6 单元测试: kick 创建 sine oscillator 频率 80→40Hz 下滑
  - [x] 1.7 单元测试: kick 衰减 20ms
  - [x] 1.8 单元测试: 频段验证 — 起始 80Hz，终止 40Hz（不超出 40-80Hz 范围）
- [x] Task 2: combo 音量映射 (AC: #2, #3) — 3 tests
  - [x] 2.1 音量公式：`vol = Math.min(0.02, combo * 0.002)`（combo 0→0, combo 10→0.02 封顶）
  - [x] 2.2 combo = 0 时 `playKickPulse` 不执行（无脉冲）
  - [x] 2.3 单元测试: combo=0 不创建 oscillator
  - [x] 2.4 单元测试: combo=5 时音量 = 0.01
  - [x] 2.5 单元测试: combo=15 时音量封顶 0.02
- [x] Task 3: 防叠加机制 (AC: #4) — 2 tests
  - [x] 3.1 模块级 `kickOsc: OscillatorNode | null` 跟踪当前脉冲
  - [x] 3.2 新 kick 触发前，若 `kickOsc` 存在则先 `stop()` 再创建新的
  - [x] 3.3 kick 的 `onended` 回调清空 `kickOsc` 引用（或 setTimeout 25ms 清空）
  - [x] 3.4 单元测试: 连续 3 次 playKickPulse，只有 1 个 oscillator 在播放
  - [x] 3.5 单元测试: 快速连续触发不崩溃
- [x] Task 4: 集成到 playTypeSound (AC: #1) — 无自动化测试
  - [x] 4.1 在 `playTypeSound()` 末尾调用 `playKickPulse()`
  - [x] 4.2 确保 kick 与三层打字音共存（不替换原有逻辑）
- [x] Task 5: 暴露测试接口 + _chordInternals 扩展
  - [x] 5.1 通过 `_chordInternals` 暴露 `_playKickPulse` 供测试直接调用
  - [x] 5.2 暴露 `kickActive` getter（boolean）

## Dev Notes

### 设计要点

Kick 脉冲是 BGM 系统的第二层——将打字节奏转化为低频"心跳"。combo 高时每次按键有微妙的 kick 伴奏，combo 断裂时瞬间消失，只剩 drone 的孤寂嗡鸣，形成听觉上的"跌落感"。

频段选择 40-80Hz 刻意低于打字音（280Hz+ thock，300Hz+ tone）和资源音效（base 120Hz 最低），避免遮蔽。

### 实现细节

```typescript
let kickOsc: OscillatorNode | null = null;

function playKickPulse(): void {
  if (!audioContext) return;
  const combo = state.combo;
  if (combo === 0) return; // AC #3: combo 0 无脉冲

  const ctx = audioContext;
  const t = ctx.currentTime;
  const vol = Math.min(0.02, combo * 0.002); // combo 10+ → 0.02 封顶

  // 防叠加：停掉上一个 kick（AC #4）
  if (kickOsc) {
    kickOsc.stop();
    kickOsc = null;
  }

  // 合成 kick：sine 80→40Hz 下滑 + 20ms 衰减
  kickOsc = ctx.createOscillator();
  const gain = ctx.createGain();
  kickOsc.type = 'sine';
  kickOsc.frequency.setValueAtTime(80, t);
  kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.02);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  kickOsc.connect(gain);
  connectToOutput(gain);
  kickOsc.start(t);
  kickOsc.stop(t + 0.025);

  // 播放完毕后清空引用
  const osc = kickOsc;
  setTimeout(() => { if (kickOsc === osc) kickOsc = null; }, 30);
}
```

### 集成到 playTypeSound

```typescript
function playTypeSound(): void {
  if (!audioContext) return;
  // ...existing 3-layer typing sound (click/thock/tone)...

  // BGM 节奏脉冲层
  playKickPulse();
}
```

### 音量层级关系

| 层 | 峰值/RMS | 频段 | 角色 |
|---|---|---|---|
| 打字 Click | 0.035 | 800Hz+ noise | 前景触底 |
| 打字 Thock | 0.025 | 280Hz triangle | 前景共鸣 |
| 打字 Tone | 0.025 | 300-700Hz sine | 前景 combo 积累 |
| 资源和弦 | ≤0.03 RMS | 120-2000Hz | 背景补充 |
| **Kick 脉冲** | **0-0.02** | **40-80Hz** | **BGM 节奏层** |
| Drone C2 | 0.03 | 65Hz | BGM 基底 |
| Drone C3 | 0.015 | 131Hz | BGM 泛音 |

Kick 最大音量 0.02 仅在高 combo 时达到，且 40-80Hz 频段与所有其他音效频段分离。

### 测试策略

测试位置：扩展现有 `tests/unit/effects/sound-bgm.test.ts`（追加 kick 脉冲测试 describe block）。

需通过 `_chordInternals._playKickPulse` 直接调用测试（因为 `playKickPulse` 是内部函数）。测试前通过 mock state 设置 `state.combo` 值。

⚠️ **踩坑预防（33-5 已知）：**
1. `connectToOutput` 依赖模块级 `audioContext` — 必须通过 `_setMockContext` 设置
2. mock state 需可修改 combo 值 — 当前 mock `state: { combo: 0, ... }` 直接修改 `.combo` 即可
3. `oscillator.stop()` 传非法时间会抛异常 — mock 中 stop 是 vi.fn() 无需担心

### Project Structure Notes

- 代码位置: `src/src/effects/sound.ts`（新增 kick 脉冲 ~25 行，总 ~665 行）
- 测试位置: `src/tests/unit/effects/sound-bgm.test.ts`（追加 ~8 tests）
- 无需修改 battle.ts（kick 通过 playTypeSound 自动触发）

### References

- [Source: docs/stories/epic-23-sound-system-refactor.md#Story 23.6]
- [Source: docs/implementation-artifacts/33-5-bgm-drone-bass.md] — 前置 story，drone 基础
- [Source: src/src/effects/sound.ts:12-62] — playTypeSound 三层打字音实现
- [Source: src/src/effects/sound.ts:16] — `state.combo` 访问模式
- [Source: src/src/effects/sound.ts:64-67] — randomize 工具函数
- [Source: src/src/effects/sound.ts:69-73] — softAttack 工具函数

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run failed: `vi.mock` hoisted above `const mockState` → `ReferenceError: Cannot access 'mockState' before initialization`. Fixed by wrapping with `vi.hoisted()`.

### Completion Notes List

- `playKickPulse()` internal function: sine 80→40Hz exponential sweep, 20ms decay to 0.001, stop at 25ms. Connected via `connectToOutput()`.
- Combo volume: `Math.min(0.02, combo * 0.002)` — combo 0 = no pulse, combo 5 = 0.01, combo 10+ = 0.02 cap.
- Anti-overlap: module-level `kickOsc` reference; new kick stops previous. `setTimeout(30ms)` clears reference after playback.
- Integrated at end of `playTypeSound()` — coexists with existing 3-layer typing sound.
- `_chordInternals` extended: `kickActive` (getter), `_playKickPulse` (direct test access).
- 8 new tests in "BGM Kick 脉冲 (Story 33.6)" describe block. Total BGM tests: 15. Total effects tests: 123.

### File List

- `src/src/effects/sound.ts` — kick pulse function, playTypeSound integration, _chordInternals extended
- `src/tests/unit/effects/sound-bgm.test.ts` — 8 new kick pulse tests, mockState hoisted with vi.hoisted()
- `docs/implementation-artifacts/33-6-bgm-rhythm-pulse-typing.md` — story file
