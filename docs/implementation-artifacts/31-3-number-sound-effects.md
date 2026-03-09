# Story 31.3: 数字音效系统

Status: done

## Story

As a 玩家,
I want 词语结算时音效随分数量级变化（清脆→厚重→轰鸣）,
so that 我能通过听觉反馈直观感受 build 的爆发力，形成视-听-触三通道反馈闭环。

## Acceptance Criteria

1. **4 档分数音效** — 词语结算时根据 `finalWordScore` 播放不同音色的合成音效：
   - 0-99: 清脆短促高频（轻快 "ting"）
   - 100-999: 中频明亮扫频（确认 "ding"）
   - 1000-4999: 低频厚重 + 谐波增厚（冲击 "dong"）
   - 5000+: 低频轰鸣 + 延长衰减尾巴（爆发 "boom"）
2. **音量分级** — 音量随分数量级适度增大（0.08 → 0.12 → 0.16 → 0.22），不刺耳（硬上限 0.25）
3. **快速连续无卡顿** — 使用 Web Audio API 即时合成（现有模式），每次创建新 OscillatorNode，无需声音池
4. **延迟 < 50ms** — 合成音效从 `completeWord()` 调用到声音输出 < 50ms（Web Audio API 天然满足）
5. **与视觉同步** — 音效在 `completeWord()` 中与屏幕震动、颜色分级同步触发（同一函数内顺序调用）
6. **单元测试** — `getScoreSoundTier()` 4 档阈值边界测试（纯函数，不涉及 AudioContext）

## Tasks / Subtasks

- [x] Task 1: 实现 `getScoreSoundTier()` 分级函数 (AC: 1, 6)
  - [x] 在 `src/effects/juice.ts` 中定义 `getScoreSoundTier(score: number): number`
  - [x] 返回 0-3 档位：0=清脆(0-99), 1=明亮(100-999), 2=厚重(1000-4999), 3=轰鸣(5000+)
  - [x] 与 `getScoreTier()`/`getShakeIntensity()` 同文件，采用相同内联阈值风格
- [x] Task 2: 实现 `playScoreSound()` 4 档合成音效 (AC: 1, 2, 3, 4)
  - [x] 在 `src/effects/sound.ts` 新增 `export function playScoreSound(score: number): void`
  - [x] 调用 `getScoreSoundTier(score)` 获取档位
  - [x] 档位 0（清脆）: sine 高频 1200Hz，短衰减 0.08s，音量 0.08
  - [x] 档位 1（明亮）: sine 中频上扫 800→1100Hz，衰减 0.12s，音量 0.12，addBodyLayer
  - [x] 档位 2（厚重）: triangle 低频 400→550Hz，衰减 0.20s，音量 0.16，addBodyLayer + 增厚
  - [x] 档位 3（轰鸣）: triangle 低频 250→400Hz + 次谐波 125Hz，衰减 0.35s，音量 0.22，双层 addBodyLayer
  - [x] 所有档位使用 `randomize()` 微偏移（现有函数）
  - [x] 所有档位使用 `softAttack` 5ms 渐入（借鉴 playResourceSound 模式）
- [x] Task 3: 集成到 `battle.ts` 的 `completeWord()` (AC: 5)
  - [x] 在 `battle.ts` 添加 `import { playScoreSound } from '../effects/sound'`
  - [x] 将 `playSound('word')` 替换为 `playScoreSound(finalWordScore)`
  - [x] 确保调用位置在 screenShake 之后（保持现有顺序）
- [x] Task 4: 单元测试 (AC: 6)
  - [x] 在 `src/tests/unit/effects/juice.test.ts` 新增 `getScoreSoundTier` describe 块
  - [x] 8 个边界测试：99→0, 100→1, 999→1, 1000→2, 4999→2, 5000→3, 9999→3, 0→0
  - [x] 添加 `getScoreSoundTier` 到文件头部 import

## Dev Notes

### 架构要点

- **Web Audio API 合成**：本项目音效全部使用 Web Audio API 实时合成，**不使用** Howler.js 或预加载音频文件。Epic 中提到的 "Howler.js 声音池" 已被实际实现覆盖，以代码为准
- **现有模式复用**：`playScoreSound()` 应完全复用 `sound.ts` 中的现有模式（`randomize()`, `addBodyLayer()`, `softAttack` 辅助函数, AudioContext 管理）
- **纯函数分级**：分级函数 `getScoreSoundTier()` 放在 `juice.ts`，与 `getScoreTier()`、`getShakeIntensity()` 同文件同模式
- **替换非叠加**：`playScoreSound(score)` 替换 `playSound('word')`，不是额外叠加一个音效

### 关键文件与集成点

| 文件 | 作用 | 修改内容 |
|------|------|----------|
| `src/effects/juice.ts` | 分级函数 | 新增 `getScoreSoundTier()` |
| `src/effects/sound.ts` | 音效合成 | 新增 `playScoreSound()` |
| `src/systems/battle.ts` | 战斗逻辑 | `completeWord()` 替换音效调用 |
| `src/tests/unit/effects/juice.test.ts` | 测试 | 新增 `getScoreSoundTier` 测试 |

### 现有代码模式（必须遵循）

**当前 `completeWord()` 中音效触发位置（需替换 L389）：**
```typescript
// battle.ts — completeWord() 尾部
const shakeIntensity = getShakeIntensity(finalWordScore);
if (shakeIntensity > 0) screenShake(shakeIntensity);
playSound('word');  // ← 替换为 playScoreSound(finalWordScore)
```

**现有 `playSound('word')` 实现（将被 playScoreSound 替代）：**
```typescript
// sound.ts L125-134 — combo 驱动的词语结算音
if (type === 'word') {
  const w = getWordProfile();
  oscillator.frequency.setValueAtTime(w.startFreq, time);
  oscillator.frequency.exponentialRampToValueAtTime(w.endFreq, time + w.decay * 0.6);
  gainNode.gain.setValueAtTime(w.vol, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + w.decay);
  oscillator.start(time);
  oscillator.stop(time + w.decay);
  addBodyLayer(w.startFreq, w.endFreq, w.vol, w.decay);
  return;
}
```

**`addBodyLayer()` 模式（必须复用，不要重写）：**
```typescript
// sound.ts L56-89 — triangle谐波 + 滤波噪声脉冲
function addBodyLayer(freq: number, endFreq: number, vol: number, decay: number): void
```

**`randomize()` 和 `softAttack` 模式（必须复用）：**
```typescript
// sound.ts L38-40
function randomize(value: number, range = 0.05): number
// sound.ts L162-165 — playResourceSound 内的 softAttack helper
const softAttack = (gain: GainNode, vol: number, time: number) => {
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.005);
};
```

**分级函数模式（juice.ts，必须对齐）：**
```typescript
// juice.ts — 所有分级函数采用相同的降序 if-else 链
export function getShakeIntensity(score: number): number {
  if (score >= 10000) return 5;
  if (score >= 5000) return 4;
  if (score >= 1000) return 3;
  if (score >= 500) return 2;
  if (score >= 100) return 1;
  return 0;
}
```

### 4 档音效参数设计

```typescript
// Tier 0 (0-99): 清脆 — 高频 sine 短促
{ waveform: 'sine', freq: 1200, endFreq: 1000, vol: 0.08, decay: 0.08, body: false }

// Tier 1 (100-999): 明亮 — 中频上扫 + body层
{ waveform: 'sine', freq: 800, endFreq: 1100, vol: 0.12, decay: 0.12, body: true }

// Tier 2 (1000-4999): 厚重 — 低频 triangle + 双body层
{ waveform: 'triangle', freq: 400, endFreq: 550, vol: 0.16, decay: 0.20, body: true, extraBody: true }

// Tier 3 (5000+): 轰鸣 — 极低频 + 次谐波 + 长尾 + 双body层
{ waveform: 'triangle', freq: 250, endFreq: 400, vol: 0.22, decay: 0.35, body: true, subHarmonic: 125Hz }
```

### 避免的陷阱

- **不要** 引入 Howler.js 或任何外部音频库 — 使用现有 Web Audio API 合成模式
- **不要** 创建 SoundPool 或音效预加载系统 — 每次直接创建 OscillatorNode（现有模式）
- **不要** 保留 `playSound('word')` 的 combo 驱动逻辑 — `playScoreSound` 取代它，combo 影响通过分数间接体现
- **不要** 修改 `playSound()` 函数签名 — 新增独立的 `playScoreSound()`
- **不要** 在 `playScoreSound()` 内部调用 `playSound('word')` — 完全独立的合成逻辑
- **不要** 在其他调用 `playSound('word')` 的地方做修改 — 只修改 `battle.ts` 的 `completeWord()`
- **不要** 创建新的测试文件 — 扩展现有 `juice.test.ts`
- **不要** 为 AudioContext 写单元测试 — 只测纯函数 `getScoreSoundTier()`

### `softAttack` 提取说明

当前 `softAttack` 是 `playResourceSound` 内部的局部 helper。`playScoreSound` 需要同样的 5ms 渐入逻辑。两个选择：
1. **复制** `softAttack` 逻辑到 `playScoreSound` 内部（最简单，避免重构）
2. **提取** 为模块级函数（更 DRY，但修改范围扩大）

**推荐选择 1（复制）**，因为 Story 范围应最小化。如果 Code Review 要求提取，再做。

### 性能约束

- Web Audio API `createOscillator()` + `start()`/`stop()` 即时执行，延迟 < 5ms
- 每词触发一次（~1-3 秒间隔），无帧预算压力
- `getScoreSoundTier()` 纯函数，O(1) 3 次比较
- AudioNode 自动垃圾回收（`stop()` 后引擎释放）

### 前序 Story 经验

**来自 Story 31-1（颜色分级）：**
- 分级函数放 `juice.ts`，导出 + 单元测试
- CSS class 清除模式：`classList.remove(...TIER_CLASSES)` + `classList.add(tier)`
- Code Review 发现 `updateHUD()` 每帧重启动画 → 引入缓存避免

**来自 Story 31-2（屏幕震动）：**
- 分级函数 `getShakeIntensity()` 内联阈值（不用 BALANCE 常量）
- `screenShake()` 使用 `as const` 查表 + 模块级状态管理
- Code Review 发现 `export let` 不可从外部写入 → 需提供 setter
- Boss 入场震动需补偿（`screenShake(3)` → `screenShake(4)`）

**对本 Story 的启示：**
- `getScoreSoundTier()` 使用内联阈值，不引入新常量
- 导出函数供 battle.ts 使用 + 供测试导入
- 音效参数不需要 `as const` 查表（直接 switch-case 合成，不像 SHAKE_TIERS 那样被外部引用）

### Project Structure Notes

- 源码在 `src/src/`，测试在 `src/tests/unit/`
- 音效在 `src/src/effects/sound.ts`
- 分级函数在 `src/src/effects/juice.ts`
- 战斗逻辑在 `src/src/systems/battle.ts`
- 测试在 `src/tests/unit/effects/juice.test.ts`
- 命名规范：camelCase 函数名

### 其他 `playSound('word')` 调用点

搜索确认只有 `battle.ts` 的 `completeWord()` 调用 `playSound('word')`。`sound.ts` 中的 `sound.word` 便捷函数虽然存在，但无人调用，保留不动。

### References

- [Source: docs/stories/epic-21-number-juice.md#Story31.3] — 验收标准与音效特征表
- [Source: src/src/effects/sound.ts] — 现有音效合成系统全貌
- [Source: src/src/effects/sound.ts#L125-134] — 现有 playSound('word') 实现
- [Source: src/src/effects/sound.ts#L56-89] — addBodyLayer() 增厚层实现
- [Source: src/src/effects/sound.ts#L38-40] — randomize() 随机化工具
- [Source: src/src/effects/sound.ts#L151-272] — playResourceSound() 资源音效模式
- [Source: src/src/effects/juice.ts#L133-140] — getShakeIntensity() 分级模式
- [Source: src/src/systems/battle.ts#L389] — completeWord() 音效触发点
- [Source: src/src/core/constants.ts#L96-104] — SOUND_PROFILES 配置
- [Source: docs/game-architecture.md#L77] — 音效延迟 < 50ms 约束
- [Source: docs/implementation-artifacts/31-2-screen-shake-grading.md] — 前序 Story 实现记录
- [Source: docs/implementation-artifacts/31-1-number-color-grading.md] — 前序 Story 实现记录

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无

### Completion Notes List

- `getScoreSoundTier()` 在 juice.ts 定义，4 档（0/1/2/3），阈值 100/1000/5000，与 getScoreTier/getShakeIntensity 同模式
- `playScoreSound(score)` 在 sound.ts 新增，4 档 Web Audio API 合成：
  - Tier 0（清脆）: sine 1200Hz 下扫，0.08s 衰减，音量 0.08，无 body 层
  - Tier 1（明亮）: sine 800→1100Hz 上扫，0.12s 衰减，音量 0.12，addBodyLayer
  - Tier 2（厚重）: triangle 400→550Hz，0.20s 衰减，音量 0.16，双层 addBodyLayer（含半频增厚）
  - Tier 3（轰鸣）: triangle 250→400Hz + sine 次谐波 125Hz，0.35s 衰减，音量 0.22，双层 addBodyLayer
- 所有档位使用 `randomize()` 微偏移 + `softAttack` 5ms 渐入（复制自 playResourceSound 模式）
- battle.ts `completeWord()` 中 `playSound('word')` 替换为 `playScoreSound(finalWordScore)`
- sound.ts 新增 `import { getScoreSoundTier } from './juice'` 跨模块依赖
- 新增 6 个测试（4 个分级测试 + 1 个边界测试 + 1 个负值/零值测试），全部 25 个 juice 测试通过
- 预存测试失败（95 个，8 个文件）与本 Story 无关
- **Code Review 修复**：M1 清理死代码（`getWordProfile`, `playSound('word')` 分支, `sound.word`）; M2 decay 值添加 `randomize()` 微偏移; M3 提取 `softAttack` 为模块级函数; L1 补充 File List; L2 随 M1 修复

### File List

- `src/src/effects/juice.ts` — 新增 `getScoreSoundTier()` 分级函数
- `src/src/effects/sound.ts` — 新增 `playScoreSound()` 4 档合成音效 + import getScoreSoundTier; 提取 `softAttack` 为模块级函数; 清理死代码 (`getWordProfile`, `playSound('word')` 分支, `sound.word`)
- `src/src/systems/battle.ts` — `completeWord()` 替换 `playSound('word')` → `playScoreSound(finalWordScore)` + import
- `src/tests/unit/effects/juice.test.ts` — 新增 6 个 `getScoreSoundTier` 边界测试
- `docs/implementation-artifacts/sprint-status.yaml` — 状态同步
