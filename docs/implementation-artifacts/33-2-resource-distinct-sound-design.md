# Story 33.2: 资源独立音色设计

Status: done

## Story

As a 玩家,
I want 每种资源产出（base/score/multiplier/time/gold）有独特的音色特征,
so that 多技能触发时我能通过听觉辨识不同资源的产出，获得清晰的反馈和打击感。

## Acceptance Criteria (AC)

1. 创建 `RESOURCE_SYNTH: Record<string, ResourceSynth>` 调度表，5 种资源各映射到独立合成函数
2. `synthBase()` — 低频 triangle 下扫 + bandpass 噪声冲击，模拟"砖块/筹码"质感
3. `synthScore()` — square 波频率跳跃（2-3 音琶音），模拟"硬币拾取"
4. `synthMultiplier()` — sawtooth 上扫 + bandpass 滤波，模拟"力量提升"
5. `synthTime()` — 高频 sine 双击（间隔 30ms），模拟"时钟滴答"
6. `synthGold()` — square + 高频 sine 泛音叠加，模拟"金币叮当"
7. `flushResourceChord()` 改为调用 `RESOURCE_SYNTH[resource](ctx, now, vol)` 而非统一振荡器
8. `emitResourceSound()` 守卫改为检查 `RESOURCE_SYNTH`
9. 5 种资源蒙眼可辨识（手动听感测试）
10. 3+ 种资源同时触发时听感清晰不混乱（RMS 封顶仍有效）

## Tasks / Subtasks

- [x] Task 1: 定义 ResourceSynth 类型 + RESOURCE_SYNTH 调度表 (AC: #1) — 2 tests
  - [x] 1.1 定义 `type ResourceSynth = (ctx: AudioContext, now: number, vol: number) => void`
  - [x] 1.2 创建 `RESOURCE_SYNTH` 常量，映射 5 种资源到对应合成函数
  - [x] 1.3 移除 `RESOURCE_FREQ` 常量（不再需要）
  - [x] 1.4 单元测试: RESOURCE_SYNTH 包含全部 5 种资源; 每个值为 function
- [x] Task 2: 实现 5 个独立合成函数 (AC: #2-#6) — 5 tests
  - [x] 2.1 `synthBase(ctx, now, vol)`: triangle 频率 120→60Hz 下扫 (40ms) + bandpass(150Hz, Q=3) 噪声脉冲 (20ms)，vol 按 0.6/0.4 分配
  - [x] 2.2 `synthScore(ctx, now, vol)`: square 琶音 880→1320→1760Hz，3 音间隔 25ms，各 vol×0.5/0.35/0.3 递减，衰减 60ms
  - [x] 2.3 `synthMultiplier(ctx, now, vol)`: sawtooth 200→800Hz 上扫 (100ms)，bandpass(400Hz, Q=2) 过滤，vol×0.7，衰减 120ms
  - [x] 2.4 `synthTime(ctx, now, vol)`: sine 双击 2000Hz，间隔 30ms，各 vol×0.3，衰减 30ms，极短极轻
  - [x] 2.5 `synthGold(ctx, now, vol)`: square 1200Hz (vol×0.4, 80ms) + sine 2400Hz 泛音 (vol×0.25, 120ms)
  - [x] 2.6 所有函数使用 `randomize()` 对频率 ±5% / 音量 ±8%
  - [x] 2.7 所有函数使用 `connectToOutput()` 接入全局混响
  - [x] 2.8 单元测试: mock AudioContext 验证每个 synth 函数创建正确类型的节点（振荡器类型、噪声源等）
- [x] Task 3: 重构 flushResourceChord (AC: #7, #10) — 3 tests
  - [x] 3.1 音量计算回归：每资源 1 个音量值（不再是 per-note 多值）
  - [x] 3.2 遍历 entries 时调用 `RESOURCE_SYNTH[resource](ctx, now, volumes[i])`
  - [x] 3.3 移除统一振荡器创建逻辑（旧 triangle 循环）
  - [x] 3.4 保留 RMS 缩放、冷却检查、buffer.clear 逻辑不变
  - [x] 3.5 单元测试: mock AudioContext 验证 flush 调用正确的 synth 函数
- [x] Task 4: 更新守卫与导出 (AC: #8) — 1 test
  - [x] 4.1 `emitResourceSound()` 守卫改为 `if (!(resource in RESOURCE_SYNTH)) return`
  - [x] 4.2 导出 `RESOURCE_SYNTH`（替代 `RESOURCE_FREQ`）
  - [x] 4.3 单元测试: 非映射资源仍跳过
- [x] Task 5: 更新现有测试 (AC: #1-#10) — 更新 20 existing tests
  - [x] 5.1 `sound-chord.test.ts`: RESOURCE_FREQ 映射表测试 → RESOURCE_SYNTH 调度表测试
  - [x] 5.2 缓冲区逻辑测试：import 改为 RESOURCE_SYNTH
  - [x] 5.3 flush 行为测试：mock AudioContext 需新增 `createBufferSource` 和 `createBiquadFilter`
  - [x] 5.4 RMS 计算测试：不变（纯函数，不依赖合成方式）
  - [x] 5.5 确保 16 个已有测试文件的 sound mock 不受影响（已有 `emitResourceSound: vi.fn()`）
- [ ] Task 6: 听感验证与参数调优 (AC: #9, #10) — 需手动验证
  - [ ] 6.1 单资源触发：5 种各自辨识度检查
  - [ ] 6.2 多资源同时触发：2/3/5 种组合听感清晰度
  - [ ] 6.3 高速打字场景：冷却机制防过密
  - [ ] 6.4 根据听感微调各 synth 函数的频率/音量/衰减参数

## Dev Notes

### ⚠️ 未提交实验性改动

当前 `sound.ts` 有**未提交的实验性改动**（和弦音阶/音色切换尝试）：
- `RESOURCE_FREQ` 从 `Record<string, number>` 改为 `Record<string, number[]>`
- `flushResourceChord` 创建双振荡器 + NOTE_WEIGHTS
- CHORD 常量已调大：BASE_VOL=0.16, DECAY=0.22, MAX_RMS=0.25

**开工前必须**：`git checkout -- src/src/effects/sound.ts` 回滚到 commit `70b75b9` 状态，再开始实现。

### 核心架构变更

**Before（33-1 统一振荡器）：**
```
RESOURCE_FREQ = { base: 262, score: 330, ... }  // 单频率
flushResourceChord() → 每资源创建 1 个 triangle 振荡器，不同音高
```

**After（33-2 独立合成）：**
```
RESOURCE_SYNTH = { base: synthBase, score: synthScore, ... }  // 函数调度
flushResourceChord() → 每资源调用独立 synth 函数，不同波形/噪声/滤波组合
```

### 可复用工具函数（`sound.ts` 内已有）

| 函数 | 位置 | 用途 |
|------|------|------|
| `randomize(value, range)` | L65-67 | ±range 随机化频率/音量 |
| `softAttack(gain, vol, time)` | L70-73 | 5ms 渐入，**传 GainNode 不是 AudioParam** |
| `connectToOutput(node)` | L159-163 | 接入 dry+reverb 双路输出 |
| `getNoiseBuffer()` | L77-86 | 1 秒白噪声缓存，用于噪声脉冲 |

### Web Audio API 节点模式

**振荡器模式（已有）：**
```typescript
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = 'sine'; // 或 'triangle'/'square'/'sawtooth'
osc.connect(gain);
connectToOutput(gain);
osc.frequency.setValueAtTime(freq, now);
softAttack(gain, vol, now);  // ← GainNode，不是 AudioParam
gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
osc.start(now);
osc.stop(now + decay + 0.01);
```

**噪声脉冲模式（已有，见 `playTypeSound` click 层 + `addBodyLayer`）：**
```typescript
const noiseSrc = ctx.createBufferSource();
noiseSrc.buffer = getNoiseBuffer();
const filter = ctx.createBiquadFilter();
filter.type = 'bandpass'; // 或 'highpass'/'lowpass'
filter.frequency.value = freq;
filter.Q.value = qFactor;
const noiseGain = ctx.createGain();
noiseSrc.connect(filter);
filter.connect(noiseGain);
connectToOutput(noiseGain);
noiseGain.gain.setValueAtTime(vol, now);
noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decay);
noiseSrc.start(now);
noiseSrc.stop(now + decay);
```

**频率扫动模式（已有，见 `playTypeSound` thock 层 + `addBodyLayer`）：**
```typescript
osc.frequency.setValueAtTime(startFreq, now);
osc.frequency.exponentialRampToValueAtTime(endFreq, now + sweepTime);
```

### flushResourceChord 重构要点

音量计算回归为**每资源 1 个值**（33-1 原始设计），不再 per-note：
```typescript
const rawVolumes = entries.map(([, intensity]) =>
  CHORD_BASE_VOL * Math.min(intensity, 2) * randomize(1, 0.08)
);
const volumes = calculateRMSVolumes(rawVolumes);
entries.forEach(([resource], i) => {
  const synth = RESOURCE_SYNTH[resource];
  if (synth) synth(ctx, now, volumes[i]);
});
```

各 synth 函数内部负责将 `vol` 分配到自己的多个节点。

### 测试策略

**mock AudioContext 模式（33-1 已建立）：**
```typescript
const mockGainParam = {
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
};
const mockGain = { gain: mockGainParam, connect: vi.fn() };
const mockOsc = {
  type: 'sine',
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
};
```

**33-2 新增需要的 mock：**
```typescript
const mockBufferSrc = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
const mockFilter = {
  type: 'bandpass',
  frequency: { value: 0, setValueAtTime: vi.fn() },
  Q: { value: 0, setValueAtTime: vi.fn() },
  connect: vi.fn(),
};
const mockCtx = {
  currentTime: 0.1,
  sampleRate: 44100,
  createOscillator: vi.fn(() => ({ ...mockOsc })),
  createGain: vi.fn(() => ({ gain: { ...mockGainParam }, connect: vi.fn() })),
  createBufferSource: vi.fn(() => ({ ...mockBufferSrc })),
  createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
  createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(44100) })),
  destination: {},
};
```

**测试验证思路：**
- 每个 synth 函数的测试：检查创建了正确类型/数量的节点
  - synthBase: 1 oscillator(triangle) + 1 bufferSource + 1 biquadFilter
  - synthScore: 3 oscillators(square)
  - synthMultiplier: 1 oscillator(sawtooth) + 1 biquadFilter
  - synthTime: 2 oscillators(sine)
  - synthGold: 2 oscillators(square + sine)
- flush 测试：验证调用了正确的 synth 函数

### CHORD 常量调整

33-1 commit 值 vs 建议值：

| 常量 | 33-1 值 | 33-2 建议值 | 原因 |
|------|---------|------------|------|
| CHORD_BASE_VOL | 0.08 → 0.10* | 0.12 | 独立音色更丰富，需略高基础音量 |
| CHORD_DECAY | 0.08 → 0.14* | — | 各 synth 函数自行控制衰减 |
| CHORD_MAX_RMS | 0.15 | 0.20 | 独立音色频段分离更好，可放宽上限 |
| CHORD_COOLDOWN | 0.08 | 0.08 | 不变 |

*标注为 33-1 后微调的 commit 值

注意：`CHORD_DECAY` 不再用于全局衰减，各 synth 函数有自己的衰减参数。可保留作为默认衰减或移除。

### 33-1 踩坑记录（必须避免）

1. **`softAttack(gain, vol, time)` 传 GainNode 不是 AudioParam** — 传 `gain.gain` 会崩
2. **esbuild 不做类型检查** — TypeScript 类型错误不会在构建时被捕获，必须靠测试覆盖
3. **16 个已有测试文件的 sound mock** — 已包含 `emitResourceSound: vi.fn()`，本 story 新增的导出需在 mock 中补充（如改名 RESOURCE_FREQ → RESOURCE_SYNTH）

### Project Structure Notes

- 代码位置: `src/src/effects/sound.ts`（修改已有文件，~440 行）
- 测试位置: `src/tests/unit/effects/sound-chord.test.ts`（修改已有文件，20 tests）
- 触发点: `src/src/systems/skills.ts`（**不需要改动**，`emitResourceSound` 接口不变）
- 16 个已有测试文件: sound mock 可能需要更新 export 名称

### References

- [Source: docs/stories/epic-23-sound-system-refactor.md#Story 23.2]
- [Source: docs/implementation-artifacts/33-1-chord-buffer-synthesizer.md] — 前置 story 完整记录
- [Source: src/src/effects/sound.ts] — 当前实现（含未提交实验改动）
- [Source: src/tests/unit/effects/sound-chord.test.ts] — 20 个现有测试
- Balatro 音效设计参考: 每种资源独特音色 + 多变体 + 短促打击感

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- synth 函数测试初次失败: `connectToOutput()` 在 `dryNode`/`reverbSend` 为 null 时回退到 `audioContext!.destination`，但测试直接调用 synth 函数未设置 audioContext → 修复：添加 `_chordInternals._setMockContext(mockCtx)` 在 beforeEach

### Completion Notes List

- Tasks 1-5 全部完成，24/24 测试通过
- Task 6（听感验证）需手动在浏览器中测试，标记为待完成
- connector-chain.test.ts 4 个失败为 HEAD 预有，零回归
- 常量调整：CHORD_BASE_VOL 0.10→0.12, CHORD_MAX_RMS 0.15→0.20, CHORD_DECAY 不再用于全局衰减（各 synth 自控）
- 已验证 16 个现有测试文件的 sound mock（`emitResourceSound: vi.fn()`）不受影响
- **代码审查修复 (3 MEDIUM)**: mock 收集 osc/filter 实例 → 验证波形类型(triangle/square/sawtooth/sine) + 频率范围 + 琶音间隔 + 泛音比例; 新增 flush 调度分发测试 (25/25 pass)

### File List

- `src/src/effects/sound.ts` — 新增 5 个 synth 函数 + RESOURCE_SYNTH 调度表，移除 RESOURCE_FREQ，重构 flushResourceChord
- `src/tests/unit/effects/sound-chord.test.ts` — 重写测试（20→25 tests），新增 createMockAudioContext helper（含 oscillators/filters 实例收集）
- `docs/stories/epic-23-sound-system-refactor.md` — Story 23.2 更新为独立音色设计方案
- `docs/implementation-artifacts/sprint-status.yaml` — story 重命名 + 状态更新
