---
title: "Epic 23: 音效系统重构"
epic_key: "epic-23"
status: "backlog"
created: "2026-03-08"
stories: []
---

# Epic 23: 音效系统重构

## 背景

当前音效系统基于 Web Audio API 合成，已实现：
- 三层打字音（click/thock/tone，combo 驱动）
- 词语结算 4 档分数音效（清脆/明亮/厚重/轰鸣）
- 关卡评级音效（C-SSS 逐级复杂）
- 全局短混响（双延迟反馈）
- `randomize()` 防重复、`softAttack()` 渐入

**痛点：** 资源产出类音效（base/score/multiplier/time/gold）在多技能同时触发时听感混乱，已临时移除（调用点保留 `// TODO: Epic 23`）。需要重新设计资源音效的整体方案。

## 采用方案：音乐化合并

### 核心思路

不是每个技能单独发声，而是将同一次按键触发的所有资源产出**收集后合并为一个和弦**播放。技能越多 → 和弦越丰满（而非越吵）。

### 技术可行性

经代码分析，一次按键的整个触发链（`triggerSkill` → 连锁 `triggerProducer`/`triggerConverter` → 溅射/附魔）是**同步调用链**，在同一个 JS 微任务中完成。因此可以：
1. 产出时只往缓冲区写入 `{ resource, intensity }`
2. 用 `queueMicrotask()` 在本轮微任务结束后统一合成播放
3. 无需 setTimeout/定时器，零额外延迟

### 资源→音高映射

采用 C 大调五声音阶（C-E-G-A-C'），任意组合都和谐：

| 资源 | 音名 | 频率 | 设计意图 |
|------|------|------|---------|
| base | C4 | 262 Hz | 根音，稳定基底 |
| score | E4 | 330 Hz | 大三度，明亮积极 |
| multiplier | G4 | 392 Hz | 纯五度，力量感 |
| time | A4 | 440 Hz | 大六度，轻盈流动 |
| gold | C5 | 523 Hz | 八度，高亮点缀 |

### 强度（intensity）调制

每种资源的 intensity（已有的 `getFloatScale` 返回值，≥1.0 的 log 比例值）影响该音在和弦中的表现：

| 参数 | 低 intensity (1.0) | 高 intensity (3.0+) |
|------|-------------------|-------------------|
| 音量 | 基础音量 | 最高 ×2 封顶 |
| 波形 | 纯 sine | sine + triangle 泛音层 |
| 衰减 | 80ms 短促 | 200ms+ 余韵 |
| detune | 0 | ±5 cent chorus 效果 |

### 和弦合成细节

一次按键可能产出的资源组合举例：

| 场景 | 和弦 | 听感 |
|------|------|------|
| 单个 base 产出者 | C4 单音 | 轻柔"叮" |
| base + score | C4 + E4 | 温暖大三度 |
| base + score + mult | C4 + E4 + G4 | 大三和弦，饱满 |
| 全资源爆发 | C4+E4+G4+A4+C5 | 五声和弦，辉煌但和谐 |
| 只有 gold | C5 单音 | 清脆高音点缀 |

### 整体音量控制

- 和弦总音量 = 各音分量的 **RMS 混合**（非简单相加），防止多音叠加爆音
- 总音量上限固定（如 0.15），无论多少资源同时产出
- 各音分量按 intensity 比例分配音量份额

### 冷却机制

- 伪无限循环（250ms 间隔自动触发）：每 tick 一个和弦，自然间隔足够
- 普通按键触发：`queueMicrotask` 保证同一按键只发一次
- 额外硬冷却 80ms：防止极快打字时和弦过密

## Stories

### Story 23.1: 和弦缓冲与合成器

**目标：** 实现「收集 → 合并 → 播放」的核心管线

**验收标准：**
- AC1: `emitResourceSound(resource, intensity)` 接口，调用点只写缓冲不发声
- AC2: `queueMicrotask` 触发 `flushResourceChord()`，将缓冲区合成为一个和弦
- AC3: 同种资源多次产出取 max intensity
- AC4: 和弦使用五声音阶映射（C4/E4/G4/A4/C5）
- AC5: 单音 sine 波形，softAttack 渐入，80ms 基础衰减
- AC6: 硬冷却 80ms，冷却中丢弃
- AC7: 总音量 RMS 混合，封顶 0.15
- AC8: `randomize()` 应用于频率（±3%）和音量（±8%）

**技术方案：**
```
// sound.ts 新增
const chordBuffer: Map<string, number> = new Map(); // resource → max intensity
let chordScheduled = false;

export function emitResourceSound(resource: string, intensity: number): void {
  const prev = chordBuffer.get(resource) || 0;
  chordBuffer.set(resource, Math.max(prev, intensity));
  if (!chordScheduled) {
    chordScheduled = true;
    queueMicrotask(flushResourceChord);
  }
}

function flushResourceChord(): void {
  chordScheduled = false;
  if (冷却中) { chordBuffer.clear(); return; }
  // 遍历 chordBuffer，为每个 resource 创建对应音高的振荡器
  // RMS 混合总音量
  chordBuffer.clear();
}
```

**改动文件：**
- `effects/sound.ts`: 新增 `emitResourceSound`, `flushResourceChord`, 音高映射表
- `systems/skills.ts`: 4 处 `// TODO: Epic 23` 替换为 `emitResourceSound(resource, scale)`

**估点：** 3

---

### Story 23.2: 强度调制与音色丰富度

**目标：** intensity 驱动音色从清淡到丰满的渐变

**前置：** Story 23.1

**验收标准：**
- AC1: intensity ≥ 2.0 时自动叠加 triangle 泛音层（音量 ×0.3）
- AC2: intensity 影响衰减时长：80ms × (1 + log₂(intensity) × 0.4)
- AC3: intensity ≥ 2.5 时加入 ±5 cent detune 产生 chorus 效果
- AC4: 音量调制：baseVol × min(intensity, 2)，封顶防爆
- AC5: 极端测试：5 种资源全部 intensity=4 时听感仍和谐

**改动文件：**
- `effects/sound.ts`: `flushResourceChord` 内按 intensity 分支合成逻辑

**估点：** 2

---

### Story 23.3: 连锁深度音高偏移

**目标：** 连锁触发时和弦整体升调，体现连锁深度的递进感

**前置：** Story 23.1

**验收标准：**
- AC1: `emitResourceSound` 增加可选参数 `chainDepth`（默认 0）
- AC2: chainDepth > 0 时，整个和弦上移 chainDepth 个半音（×2^(n/12)）
- AC3: 最大偏移 6 半音（增四度），避免音高过高刺耳
- AC4: 连锁断裂时（三层保护截断）不特殊处理音效（视觉已有反馈）

**改动文件：**
- `effects/sound.ts`: 音高偏移逻辑
- `systems/skills.ts`: `triggerSkill` 传入 `chain.length - 1` 作为 chainDepth

**估点：** 1

---

### Story 23.4: 混音平衡与极端场景

**目标：** 确保资源和弦与打字音、结算音和谐共存

**前置：** Story 23.1, 23.2

**验收标准：**
- AC1: 资源和弦总音量 ≤ 打字音峰值的 60%（背景层定位）
- AC2: 词语结算 `playScoreSound` 触发时，当帧资源和弦自动降 6dB（侧链回避）
- AC3: 20+ 技能 + 高速打字场景，无爆音、无可感知延迟
- AC4: 伪无限循环（250ms 自动触发）场景下和弦节奏自然
- AC5: Boss 战（高压力、高密度产出）听感紧张但不烦躁

**改动文件：**
- `effects/sound.ts`: 侧链逻辑、音量封顶调优

**估点：** 2

---

### Story 23.5: BGM 骨架 — Drone 持续低音

**目标：** 提供恒定的调性锚点，让资源和弦"有根"，填充低频空白

**前置：** 无（可与 23.1 并行）

**验收标准：**
- AC1: 战斗开始时启动 C2（65Hz）sine 持续音，音量 ~0.03，极低存在感
- AC2: 叠加 C3（131Hz）泛音层，音量 ~0.015，增加温度
- AC3: 使用 `connectToOutput()` 接入全局混响
- AC4: 战斗结束/离开时 500ms fadeout 后停止
- AC5: 提供 `startBGM()` / `stopBGM()` 接口

**改动文件：**
- `effects/sound.ts`: drone 振荡器管理、start/stop 接口
- `systems/battle.ts`: 战斗开始调用 `startBGM()`，结束调用 `stopBGM()`

**估点：** 1

---

### Story 23.6: BGM 节奏脉冲层 — 打字驱动

**目标：** 将打字节奏转化为隐性节拍，让打字产生"groove"感

**前置：** Story 23.5

**验收标准：**
- AC1: 每次按键后放一个极轻 kick 脉冲（sine 80→40Hz 快速下滑，20ms 衰减）
- AC2: 脉冲音量跟随 combo：combo 0 时无脉冲，combo 10+ 时音量 ~0.02
- AC3: combo 断裂时脉冲消失，只剩 drone 的寂静（对比感）
- AC4: 脉冲不随打字加密而叠加爆音（同一时刻最多一个脉冲在响）
- AC5: 脉冲频段（40-80Hz）不与资源和弦（262-523Hz）/ 打字音（280-800Hz）冲突

**改动文件：**
- `effects/sound.ts`: 脉冲合成，集成到 `playTypeSound()` 流程

**估点：** 2

---

### Story 23.7: BGM 张力层 — 战局状态驱动

**目标：** 通过不协和音的引入/释放传达战局压力，无需看 UI 也能感知危险

**前置：** Story 23.5

**验收标准：**
- AC1: 提供 `updateBGMTension(level: number)` 接口，level 0-4
- AC2: level 0（安全）：纯 drone，无张力音
- AC3: level 1（正常）：drone 不变，由节奏脉冲层提供活力
- AC4: level 2（时间紧迫，<30%）：叠入 Bb2（117Hz）持续音，形成小七度不安感
- AC5: level 3（Boss 阶段）：drone 升至 C3，叠入 F#2（93Hz）增四度/三全音
- AC6: level 4（濒死，<10%）：drone 加入 tremolo（音量 8Hz 颤抖），所有张力音音量 ×1.5
- AC7: 通关瞬间：张力音 200ms 快速 fadeout，回归纯净 C drone → 评级音效接管
- AC8: 各 level 之间切换使用 500ms crossfade，避免突兀跳变

**改动文件：**
- `effects/sound.ts`: 张力层振荡器管理、crossfade 逻辑
- `systems/battle.ts`: tick 循环中根据 timeRemaining/timeMax 计算 tension level 并调用

**估点：** 3

---

## 核心原则

1. **耳朵是信息通道**：眼睛忙于打字时，音效承担资源产出反馈的核心职责
2. **不干扰打字节奏**：资源音效是背景层，不应抢占打字音的前景地位
3. **密集不成噪**：10+ 技能同时产出时仍然悦耳，而非叠加成噪音
4. **资源可辨识**：不同资源类型有辨识度，但不追求每次都听清

## 技术约束

- 纯 Web Audio API 合成（无音频文件）
- 零额外延迟（`queueMicrotask` 在同一帧内完成）
- 保持现有架构：`effects/sound.ts` 单文件
- 保持 `connectToOutput()` 全局混响管线
- 保持 `randomize()` / `softAttack()` 工具函数

## 实施顺序

```
资源和弦线：                    BGM 线：
23.1 和弦缓冲与合成器 (3pt)     23.5 Drone 持续低音 (1pt)
 ├── 23.2 强度调制 (2pt)         ├── 23.6 节奏脉冲层 (2pt)
 ├── 23.3 连锁深度偏移 (1pt)     ├── 23.7 张力层 (3pt)
 └───┴── 23.4 混音平衡 (2pt) ←──┘  （全局调优）
```

两条线可并行开发。23.4 混音平衡作为最终调优，依赖两条线全部完成。
总计 14 点。

## 相关

- Epic 候选 A「连锁视听反馈」（brainstorm #21/#30/#51-58/#64/#95）
- Epic 7「音效与视觉」（旧规划，已由当前实现部分覆盖）
- Epic 21 Story 31.3「数字音效系统」（已完成）
- 调用点：`skills.ts` 4 处 `// TODO: Epic 23 — 资源产出音效`
