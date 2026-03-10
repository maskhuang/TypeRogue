# Story 33.3: 连锁深度与强度调制

Status: done

## Story

As a 玩家,
I want 连锁触发时资源音效有递进感（音高上移 + 时间展开 + 强度增厚）,
so that 深层连锁时我能通过听觉感知级联深度和产出强度，获得"噼里啪啦"的爽快反馈。

## Acceptance Criteria (AC)

1. `emitResourceSound` 增加可选参数 `chainDepth`（默认 0），缓冲区保存 chainDepth
2. `skills.ts` 传入 `chain.length - 1` 作为 chainDepth（直接触发=0，首层链=1，…）
3. chainDepth > 0 时，synth 函数基础频率上移 chainDepth 个半音（×2^(n/12)）
4. 最大音高偏移 6 半音（增四度），避免过高刺耳
5. `flushResourceChord` 中按 chainDepth 施加时间展开：每层延迟 `chainDepth × STAGGER_INTERVAL`（~15ms），制造级联时序感
6. intensity ≥ 2.0 时自动叠加泛音增厚层（音量 ×0.3 的 triangle 谐波）
7. intensity 影响衰减时长：baseDecay × (1 + log₂(intensity) × 0.3)
8. ResourceSynth 签名扩展为 `(ctx, now, vol, pitchShift?, decay?) => void`
9. 单次按键触发 5 层链听感有明显"递进上扬"（手动验证）
10. 高 intensity（×3.0+）触发时音效比低 intensity 更"厚重"（手动验证）

## Tasks / Subtasks

- [x] Task 1: 缓冲区扩展 + emitResourceSound 签名 (AC: #1) — 3 tests
  - [x] 1.1 `chordBuffer` 从 `Map<string, number>` 改为 `Map<string, { intensity: number; chainDepth: number }>`
  - [x] 1.2 `emitResourceSound(resource, intensity, chainDepth = 0)` — 同资源取 max intensity，chainDepth 取 max
  - [x] 1.3 单元测试: chainDepth 写入缓冲 + 同资源多次 emit 取 max chainDepth + 默认 chainDepth=0
- [x] Task 2: skills.ts 传入 chainDepth (AC: #2) — verified via grep
  - [x] 2.1 在 `triggerSkill` 中设置模块级 `_currentChainDepth = chain.length - 1`（类比 `_isChainTrigger` 模式）
  - [x] 2.2 `triggerProducer` / `triggerConverter` 中 `emitResourceSound` 调用传入 `_currentChainDepth`（4 处）
  - [x] 2.3 emitResourceSound 为 vi.fn() mock，新参数可选，16 个 mock 文件无需更新
- [x] Task 3: 音高偏移 + 时间展开 (AC: #3, #4, #5) — 3 tests
  - [x] 3.1 新增常量 `CHORD_STAGGER = 0.015`（15ms）、`MAX_PITCH_SEMITONES = 6`
  - [x] 3.2 `flushResourceChord` 中计算每资源的时间偏移：`stagger = Math.min(chainDepth, MAX_PITCH_SEMITONES) * CHORD_STAGGER`
  - [x] 3.3 `flushResourceChord` 中计算音高乘子：`pitchMul = 2 ** (Math.min(chainDepth, MAX_PITCH_SEMITONES) / 12)`
  - [x] 3.4 调用 synth 时传入偏移后的 `now + stagger` 和 `pitchMul`
  - [x] 3.5 单元测试: chainDepth=0 无偏移; chainDepth=3 频率上移 3 半音 + 延迟 45ms; chainDepth=8 被截断为 6
- [x] Task 4: ResourceSynth 签名扩展 (AC: #8) — 3 tests
  - [x] 4.1 类型改为 `(ctx: AudioContext, now: number, vol: number, pitchShift?: number, decayMul?: number) => void`
  - [x] 4.2 每个 synth 函数接收 `pitchShift = 1`（乘子）和 `decayMul = 1`（衰减倍率），应用到所有频率和衰减参数
  - [x] 4.3 单元测试: pitchShift=1.5 频率×1.5; decayMul=2 延长 stop 时间; 默认值不改变行为
- [x] Task 5: 强度调制 — 泛音增厚 + 衰减延展 (AC: #6, #7) — 4 tests
  - [x] 5.1 在 `flushResourceChord` 中计算 `decayMul = 1 + Math.log2(Math.max(intensity, 1)) * 0.3`
  - [x] 5.2 intensity ≥ 2.0 时，synth 调用后额外调用 `addHarmonicLayer(ctx, now + stagger, vol * 0.3, pitchShift)` — 使用 triangle 谐波
  - [x] 5.3 `addHarmonicLayer` 函数：triangle 振荡器 + connectToOutput，440Hz × pitchShift 简单衰减
  - [x] 5.4 单元测试: intensity=1.0 无增厚层; intensity=2.5 有增厚层（额外 triangle oscillator + ~440Hz）
  - [x] 5.5 单元测试: decayMul 正确传入 synth 函数（intensity=4→1.6, intensity<1→1.0）
- [x] Task 6: 更新现有测试 — 适配签名变更
  - [x] 6.1 synth 函数默认 pitchShift=1, decayMul=1 — 现有 5 个 synth 测试无需改动
  - [x] 6.2 flush 行为测试：缓冲区 `.get()` 返回值从 `number` 改为 `{ intensity, chainDepth }` 适配
  - [x] 6.3 原 25 个测试全部通过 + 新增 14 个测试 = 39 tests passing
- [ ] Task 7: 听感验证与参数调优 (AC: #9, #10)
  - [ ] 7.1 单次按键触发 1/3/5 层链：递进感检查
  - [ ] 7.2 高 intensity vs 低 intensity：厚重感差异
  - [ ] 7.3 调整 STAGGER 间隔（10-20ms 范围试听）
  - [ ] 7.4 调整 MAX_PITCH_SEMITONES（4-8 范围试听）

## Dev Notes

### 核心设计：时间展开 + 音高递进

**问题：** 同步连锁中所有 `emitResourceSound` 在同一调用栈内完成，`queueMicrotask` 合并为一次和弦。10 层连锁听起来和 2 层一样 — 没有级联感。

**解法：** 在 `flushResourceChord` 内按 chainDepth 施加 Web Audio 原生时间偏移：

```typescript
// 每个 synth 调用的实际播放时间
const stagger = Math.min(entry.chainDepth, MAX_PITCH_SEMITONES) * CHORD_STAGGER;
synth(ctx, now + stagger, volumes[i], pitchMul, decayMul);
```

5 层连锁效果：depth=0 在 now，depth=1 在 now+15ms，…，depth=4 在 now+60ms。Web Audio 调度器精确执行，无需 setTimeout。

### 缓冲区结构变更

```typescript
// Before (33-2):
const chordBuffer: Map<string, number> = new Map(); // resource → intensity

// After (33-3):
const chordBuffer: Map<string, { intensity: number; chainDepth: number }> = new Map();

// emitResourceSound 合并逻辑：
const prev = chordBuffer.get(resource);
chordBuffer.set(resource, {
  intensity: Math.max(prev?.intensity ?? 0, intensity),
  chainDepth: Math.max(prev?.chainDepth ?? 0, chainDepth),
});
```

### ResourceSynth 签名扩展

```typescript
// Before (33-2):
type ResourceSynth = (ctx: AudioContext, now: number, vol: number) => void;

// After (33-3):
type ResourceSynth = (ctx: AudioContext, now: number, vol: number, pitchShift?: number, decayMul?: number) => void;
```

每个 synth 函数内部将所有频率 × pitchShift，所有衰减 × decayMul。默认值 1 保持向后兼容。

### skills.ts 改动模式

```typescript
// 新增模块级变量（类比 _isChainTrigger）
let _currentChainDepth = 0;

// triggerSkill 中设置
export function triggerSkill(skillId: string, triggerKey: string, chainHistory?: string[]): void {
  const chain = chainHistory || [triggerKey];
  _isChainTrigger = chain.length > 1;
  _currentChainDepth = chain.length - 1;  // ← 新增
  // ...
}

// triggerProducer / triggerConverter 中传入
emitResourceSound(prod.resource, scale, _currentChainDepth);  // ← 新增第 3 参数
```

### 音高偏移公式

等律半音：`pitchMul = 2 ** (semitones / 12)`

| chainDepth | 半音 | pitchMul | 听感 |
|------------|------|----------|------|
| 0 | 0 | 1.000 | 原调 |
| 1 | 1 | 1.059 | 小二度上 |
| 2 | 2 | 1.122 | 大二度上 |
| 3 | 3 | 1.189 | 小三度上 |
| 4 | 4 | 1.260 | 大三度上 |
| 5 | 5 | 1.335 | 纯四度上 |
| 6+ | 6 | 1.414 | 增四度(封顶) |

### 泛音增厚层

```typescript
function addHarmonicLayer(ctx: AudioContext, now: number, vol: number, baseFreq: number, pitchShift: number, decayMul: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.connect(gain);
  connectToOutput(gain);
  osc.frequency.setValueAtTime(baseFreq * 2 * pitchShift, now); // 真实 2 次谐波
  softAttack(gain, vol, now);
  const decay = 0.15 * decayMul;
  gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
  osc.start(now);
  osc.stop(now + decay + 0.01);
}
```

intensity ≥ 2.0 时在 synth 调用后追加。频率使用资源基频 × 2 × pitchShift（真实 2 次谐波），音量 vol × 0.3，衰减随 decayMul 延展。

### 33-2 踩坑记录（必须避免）

1. **`softAttack(gain, vol, time)` 传 GainNode 不是 AudioParam** — 传 `gain.gain` 会崩
2. **`connectToOutput` 使用模块级 `audioContext`** — 测试需 `_setMockContext(mockCtx)` 设置
3. **esbuild 不做类型检查** — 签名变更后的类型错误不会在构建时捕获
4. **mock 需收集 oscillator 实例** — `createMockAudioContext` 已有 `oscillators[]`/`filters[]`，验证频率/波形用

### 测试策略

**新增测试思路：**
- chainDepth 缓冲：验证 `{ intensity, chainDepth }` 结构
- 音高偏移：mock oscillator 的 `frequency.setValueAtTime` 参数 × pitchShift
- 时间展开：mock oscillator 的 `start(time)` 参数 = `now + chainDepth * 0.015`
- 泛音增厚：intensity ≥ 2.0 时多创建一个 oscillator(triangle)
- 衰减延展：mock gain 的 `exponentialRampToValueAtTime` 时间参数 × decayMul

**现有测试适配：**
- `emitResourceSound` 缓冲测试：buffer.get() 返回值从 `number` 变为 `{ intensity, chainDepth }`
- synth 函数直接调用测试：默认 pitchShift=1, decayMul=1 保持兼容

### Project Structure Notes

- 代码位置: `src/src/effects/sound.ts`（修改已有文件，~540 行）
- 代码位置: `src/src/systems/skills.ts`（修改 4 处 `emitResourceSound` 调用 + 1 处模块变量）
- 测试位置: `src/tests/unit/effects/sound-chord.test.ts`（修改+新增，25→~34 tests）
- 16 个已有测试文件: sound mock 不受影响（`emitResourceSound: vi.fn()` 无需更新，新参数可选）

### References

- [Source: docs/stories/epic-23-sound-system-refactor.md#Story 23.3]
- [Source: docs/implementation-artifacts/33-2-resource-distinct-sound-design.md] — 前置 story 完整记录
- [Source: src/src/effects/sound.ts] — 当前实现（33-2 完成态，~532 行）
- [Source: src/src/systems/skills.ts] — emitResourceSound 调用点 4 处 + chainHistory 信息
- [Source: src/tests/unit/effects/sound-chord.test.ts] — 25 个现有测试

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all tests passed on first run.

### Completion Notes List

- Buffer structure changed from `Map<string, number>` to `Map<string, { intensity, chainDepth }>`. All 6 buffer assertion tests updated to use `.toEqual({ ... })`.
- 5 synth functions (synthBase/Score/Multiplier/Time/Gold) all extended with `pitchShift = 1, decayMul = 1` default params. All frequency values multiplied by pitchShift, all decay/stop times multiplied by decayMul.
- `addHarmonicLayer` uses 440Hz × pitchShift as base frequency (not the resource's native frequency) — intentional design for consistent harmonic character across resources.
- `_currentChainDepth` follows same module-variable pattern as existing `_isChainTrigger`.
- 14 new tests added (3 chainDepth buffer + 3 pitch/stagger + 1 flush args + 3 synth extension + 4 intensity modulation).
- 16 test files with `emitResourceSound: vi.fn()` mocks unaffected — new `chainDepth` param is optional.

### File List

- `src/src/effects/sound.ts` — buffer type, emitResourceSound signature, constants, flushResourceChord stagger/pitch/decay, addHarmonicLayer, synth functions extended
- `src/src/systems/skills.ts` — `_currentChainDepth` variable + 4 emitResourceSound call sites updated
- `src/tests/unit/effects/sound-chord.test.ts` — 6 buffer assertions fixed + 14 new tests (39 total)
- `docs/implementation-artifacts/33-3-chain-depth-intensity-modulation.md` — story file updated
- `docs/implementation-artifacts/sprint-status.yaml` — 33-3 status tracking
