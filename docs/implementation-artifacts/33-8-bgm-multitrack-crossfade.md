# Story 33.8: BGM 多轨系统 — 按游戏阶段切换曲目 + 交叉淡化

Status: done

## Story

As a 玩家,
I want 在战斗/商店/休息/结算等不同阶段听到风格匹配的 BGM,
so that 音乐与游戏节奏同步变化，非战斗界面不再静音，整体氛围更连贯。

## Acceptance Criteria (AC)

1. 定义 `BgmTrack` 类型（`'battle' | 'chill'`）和曲目注册表 `BGM_TRACKS`，每条含 `url / baseVol / baseLPF`
2. 内部状态从单 buffer 改为 `Map<BgmTrack, AudioBuffer>`，新增 `currentTrack` 跟踪当前曲目
3. `loadBGM()` → `loadAllBGM()`：`Promise.all` 并行 fetch + decode 所有曲目
4. `startBGM(track)` 同曲幂等；异曲交叉淡化（旧曲 500ms 淡出 → 新曲 500ms 淡入，从随机位置开始）
5. `stopBGM()` 增加 `currentTrack = null` 重置
6. `updateBGMTension` / `releaseBGMTension` 增加 `currentTrack === 'battle'` 守卫，chill 曲时为空操作
7. battle.ts：战斗开始 `startBGM('battle')`；评分揭示回调后 `startBGM('chill')`；gameOver 直接 `startBGM('chill')`
8. 所有现有 BGM 测试 + 新增交叉淡化 / 幂等 / 张力守卫测试全部通过

## Tasks / Subtasks

- [x] Task 1: 曲目注册表与状态变更 (AC: #1, #2) — 0 tests
  - [x] 1.1 新增 `BgmTrack` 类型导出 + `BGM_TRACKS` 常量（battle: baseVol 0.15 / baseLPF 800, chill: baseVol 0.18 / baseLPF 20000）
  - [x] 1.2 `bgmBuffer: AudioBuffer | null` → `bgmBuffers: Map<BgmTrack, AudioBuffer>`
  - [x] 1.3 新增模块级 `currentTrack: BgmTrack | null = null`
- [x] Task 2: loadAllBGM 并行加载 (AC: #3) — 0 tests
  - [x] 2.1 `loadBGM()` → `loadAllBGM()`：遍历 `BGM_TRACKS`，filter 已加载，`Promise.all` 并行 fetch + decode
  - [x] 2.2 `initAudio()` 中 fire-and-forget 调用改为 `loadAllBGM()`
- [x] Task 3: startBGM(track) 交叉淡化 (AC: #4) — 3 tests
  - [x] 3.1 同曲 + bgmSource 存在 → 直接 return（幂等）
  - [x] 3.2 旧曲存在时：`bgmGain.linearRamp(0, now+0.5)` + `bgmSource.stop(now+0.55)` + 清空引用
  - [x] 3.3 `await loadAllBGM()` 确保 buffer 就绪
  - [x] 3.4 新建 source(loop) → LPF(baseLPF) → gain(0→baseVol, 500ms 淡入)
  - [x] 3.5 `bgmSource.start(now, Math.random() * buffer.duration)` 从随机位置开始
  - [x] 3.6 `currentTrack = track; tensionLevel = 0`
  - [x] 3.7 单元测试: battle→chill 旧曲淡出 + 新曲淡入
  - [x] 3.8 单元测试: 同曲重复调用跳过
  - [x] 3.9 单元测试: 交叉淡化重置 tensionLevel
- [x] Task 4: stopBGM 重置 currentTrack (AC: #5) — 1 test
  - [x] 4.1 `stopBGM()` 末尾追加 `currentTrack = null`
  - [x] 4.2 单元测试: stopBGM 后 currentTrack 为 null
- [x] Task 5: 张力守卫 (AC: #6) — 2 tests
  - [x] 5.1 `updateBGMTension`: 首行增加 `if (currentTrack !== 'battle') return`
  - [x] 5.2 `releaseBGMTension`: 首行增加 `if (currentTrack !== 'battle') return`
  - [x] 5.3 单元测试: chill 曲时 updateBGMTension 为空操作
  - [x] 5.4 单元测试: chill 曲时 releaseBGMTension 为空操作
- [x] Task 6: battle.ts 集成 (AC: #7) — 无自动化测试
  - [x] 6.1 L796 `startBGM()` → `startBGM('battle')`
  - [x] 6.2 `endLevel()`: `stopBGM()` → `stopBGM()`（战斗结束立即静音），评分揭示回调内 `startBGM('chill')`
  - [x] 6.3 `gameOver()`: `stopBGM()` → `startBGM('chill')`（直接切换）
  - [x] 6.4 导入列表同步更新（保留 stopBGM）
- [x] Task 7: 测试辅助接口更新 (AC: #8) — 0 tests
  - [x] 7.1 `_chordInternals._setBgmBuffer(buf)` → `_setBgmBuffers(map: Map<string, AudioBuffer>)`
  - [x] 7.2 新增 `currentTrack` getter
  - [x] 7.3 `_stopBGMImmediate()` 增加 `currentTrack = null`
- [x] Task 8: 测试全面更新 (AC: #8) — 27 tests total
  - [x] 8.1 mock 改用 `_setBgmBuffers` 设置多 buffer（battle + chill）
  - [x] 8.2 所有 `startBGM()` 调用加 track 参数
  - [x] 8.3 新增 startBGM('chill') 验证 chill buffer + LPF 20kHz + 淡入 0.18
  - [x] 8.4 更新张力测试 beforeEach 为 `startBGM('battle')`

## Dev Notes

### 设计要点

BGM 系统从单曲升级为多轨。战斗用高张力曲（LPF 800Hz + 张力驱动），商店/休息/结算用轻松曲（LPF 20kHz 无滤波）。新增曲目只需在 `BGM_TRACKS` 注册表加一行。

交叉淡化采用串行策略：旧曲 500ms 淡出 → 新曲 500ms 淡入（共享同一组 bgmSource/bgmLPF/bgmGain 节点引用）。新曲从随机位置开始播放，避免每次都从头开始的重复感。

评分期间保持静音：战斗结束时 `stopBGM()` 淡出战斗曲，评分动画 + 评级音效独占声场，评分回调完成后才 `startBGM('chill')` 淡入休闲曲。

### 曲目注册表

```typescript
type BgmTrack = 'battle' | 'chill';

const BGM_TRACKS: Record<BgmTrack, { url: string; baseVol: number; baseLPF: number }> = {
  battle: { url: '/audio/bgm.mp3',       baseVol: 0.15, baseLPF: 800 },
  chill:  { url: '/audio/bgm-chill.mp3', baseVol: 0.18, baseLPF: 20000 },
};
```

### 交叉淡化流程

```
startBGM(track):
  1. if (currentTrack === track && bgmSource) return   // 幂等
  2. if (bgmSource) {                                   // 旧曲淡出
       bgmGain.linearRamp(0, now + 0.5)
       bgmSource.stop(now + 0.55)
       bgmSource = bgmLPF = bgmGain = null
     }
  3. await loadAllBGM()                                 // 确保 buffer 就绪
  4. 创建 source(loop) → LPF(baseLPF) → gain(0)
  5. gain.linearRamp(baseVol, now + 0.5)                // 500ms 淡入
  6. source.start(now, random * duration)               // 随机位置开始
  7. currentTrack = track; tensionLevel = 0
```

### battle.ts 集成点

```typescript
// 战斗开始
startBGM('battle');

// endLevel() — 战斗结束
releaseBGMTension();
stopBGM();                    // 立即淡出，评分期间静音
// ...评分计算...
showRatingReveal(rating, () => {
  startBGM('chill');          // 评分揭示完成后淡入休闲曲
  // ...进入商店/Boss奖励...
}, playRatingSound);

// gameOver()
releaseBGMTension();
startBGM('chill');            // 直接切换
```

### 张力守卫

`updateBGMTension` 和 `releaseBGMTension` 首行增加 `if (currentTrack !== 'battle') return`，确保张力系统仅在战斗曲播放时生效，chill 曲不受 LPF/音量调制影响。

### 文件资产

- `src/public/audio/bgm.mp3` — 战斗曲（Sunset Over Soft Tiles, 4.7MB）
- `src/public/audio/bgm-chill.mp3` — 休闲曲（2.9MB）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all 27 BGM tests passed on first run. No new tsc errors in sound.ts.

### Completion Notes List

- `BgmTrack` type + `BGM_TRACKS` registry: extensible multi-track system, new tracks need only a registry entry.
- `bgmBuffer` → `bgmBuffers: Map`: parallel preload via `loadAllBGM()` with `Promise.all`.
- `startBGM(track)`: idempotent same-track, 500ms crossfade for track switches, random start position.
- `stopBGM()`: now resets `currentTrack = null`.
- Tension guards: `updateBGMTension` / `releaseBGMTension` early-return when `currentTrack !== 'battle'`.
- battle.ts: battle start → `startBGM('battle')`, rating callback → `startBGM('chill')`, gameOver → `startBGM('chill')`.
- Rating period is silent: `stopBGM()` fades out battle music, chill music starts only after rating reveal completes.
- Test internals: `_setBgmBuffer` → `_setBgmBuffers(map)`, `currentTrack` getter, `_stopBGMImmediate` resets currentTrack.
- 27 BGM tests pass (existing updated + 6 new: chill track, crossfade, same-track skip, tension reset, tension guards ×2).

### File List

- `src/src/effects/sound.ts` — BgmTrack type, BGM_TRACKS, bgmBuffers Map, loadAllBGM, startBGM(track) with crossfade + random offset, stopBGM currentTrack reset, tension guards
- `src/tests/unit/effects/sound-bgm.test.ts` — multi-buffer mock, all startBGM calls with track param, 6 new tests
- `src/src/systems/battle.ts` — startBGM('battle'), stopBGM + rating callback startBGM('chill'), gameOver startBGM('chill')
- `src/public/audio/bgm.mp3` — battle track (4.7MB)
- `src/public/audio/bgm-chill.mp3` — chill track (2.9MB)
- `docs/implementation-artifacts/33-8-bgm-multitrack-crossfade.md` — this story file
