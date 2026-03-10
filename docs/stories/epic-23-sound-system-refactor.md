---
title: "Epic 23: 音效系统重构"
epic_key: "epic-23"
status: "backlog"
created: "2026-03-08"
updated: "2026-03-09"
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

**已完成：** Story 23.1 实现了资源音效的缓冲合并管线（`emitResourceSound` → buffer → `flushResourceChord`），但听感反馈不佳——所有资源用同类波形不同音高，缺乏辨识度和打击感。

**参考：** Balatro（小丑牌）的音效设计提供了关键启发：
- 每种资源使用**完全不同音色特征**的短促音效（筹码碰撞声、硬币声、打击声）
- 同类音效有 **2-7 个变体**随机播放，避免机械重复
- **蓄力→释放**两段式设计用于大分数爆发
- 音效来源可混合：合成 + 采样（Balatro 使用 Freesound CC0 采样）

## 采用方案：独立音色 + 多变体 + 缓冲防叠加

### 核心思路

每种资源拥有**独特的合成音色**（不同波形、频率走向、衰减特征），而非同波形不同音高。保留 Story 23.1 的缓冲合并管线用于防叠加和冷却控制，但合成逻辑从"统一振荡器"改为"per-resource 独立合成函数"。

### 技术架构

```
emitResourceSound(resource, intensity)
  → chordBuffer 收集（同资源取 max intensity）
  → queueMicrotask → flushResourceChord()
    → 遍历 buffer，对每个 resource 调用 RESOURCE_SYNTH[resource](intensity)
    → 每个合成函数独立创建振荡器/噪声/滤波器组合
    → RMS 总音量封顶
```

### 资源音色设计方向

| 资源 | 音色特征 | 合成思路 | 参考 |
|------|---------|---------|------|
| base | 低沉冲击 | triangle 下扫 + 噪声脉冲 | Balatro chips |
| score | 明亮跳跃 | square 频率跳跃（琶音） | Balatro coin |
| multiplier | 力量上扫 | sawtooth 上扫 + bandpass | Balatro multhit |
| time | 轻盈点击 | 高频 sine 双击 | 时钟滴答 |
| gold | 金属质感 | square + 高频泛音 | 硬币叮当 |

### 多变体系统

每种资源合成函数内通过参数随机化产生变体：
- 基础频率 ±5%
- 频率走向（上扫/下扫幅度）±10%
- 衰减时长 ±15%
- 音量 ±8%
- 可选：随机选择不同波形组合

目标：同一资源连续触发 5 次，每次听起来有微妙不同，但整体音色特征一致。

### 强度（intensity）调制

intensity（`getFloatScale` 返回值）影响音效的"份量感"：

| 参数 | 低 intensity (1.0) | 高 intensity (3.0+) |
|------|-------------------|-------------------|
| 音量 | 基础音量 | ×2 封顶 |
| 衰减 | 基础衰减 | ×1.5 更长余韵 |
| 泛音层 | 无 | 叠加 triangle/噪声增厚 |

### 整体音量控制

- 和弦总音量 = 各音分量的 **RMS 混合**，防止多音叠加爆音
- 总音量上限固定（0.25），无论多少资源同时产出
- 硬冷却 80ms，冷却期丢弃缓冲

## Stories

### Story 23.1: 和弦缓冲与合成器 ✅ DONE

**目标：** 实现「收集 → 合并 → 播放」的核心管线

**验收标准：**
- AC1: `emitResourceSound(resource, intensity)` 接口，调用点只写缓冲不发声
- AC2: `queueMicrotask` 触发 `flushResourceChord()`，将缓冲区合成
- AC3: 同种资源多次产出取 max intensity
- AC4: 硬冷却 80ms，冷却中丢弃
- AC5: 总音量 RMS 混合封顶
- AC6: `randomize()` 应用于频率和音量
- AC7: 非映射资源（fragment/mutagen）静默跳过
- AC8: `skills.ts` 4 处 TODO 替换为 `emitResourceSound` 调用

**状态：** Done — 缓冲管线 + 20 个测试通过。当前合成用统一 triangle 振荡器，将在 23.2 替换为独立音色。

**估点：** 3

---

### Story 23.2: 资源独立音色设计

**目标：** 每种资源拥有独特的合成音色特征，替换当前统一振荡器

**前置：** Story 23.1

**验收标准：**
- AC1: 创建 `RESOURCE_SYNTH` 调度表，每种资源映射到独立合成函数
- AC2: `synthBase()` — 低频 triangle 下扫 + bandpass 噪声冲击，模拟"筹码/砖块"质感
- AC3: `synthScore()` — square 波频率跳跃（2-3 音琶音），模拟"硬币拾取"
- AC4: `synthMultiplier()` — sawtooth 上扫 + bandpass 滤波，模拟"力量提升"
- AC5: `synthTime()` — 高频 sine 双击（间隔 30ms），模拟"时钟滴答"
- AC6: `synthGold()` — square + 高频 sine 泛音叠加，模拟"金币叮当"
- AC7: `flushResourceChord` 改为调用 `RESOURCE_SYNTH[resource]` 而非统一振荡器
- AC8: 5 种资源蒙眼可辨识（辨识度测试）
- AC9: 3+ 种资源同时触发时听感清晰不混乱

**改动文件：**
- `effects/sound.ts`: 5 个 synth 函数 + RESOURCE_SYNTH 调度表 + flushResourceChord 重构

**估点：** 3

---

### Story 23.3: 连锁深度与强度调制

**目标：** 连锁触发时音效递进，intensity 驱动音色从轻到重

**前置：** Story 23.2

**验收标准：**
- AC1: `emitResourceSound` 增加可选参数 `chainDepth`（默认 0）
- AC2: chainDepth > 0 时，合成函数的基础频率上移 chainDepth 个半音（×2^(n/12)）
- AC3: 最大偏移 6 半音（增四度），避免音高过高刺耳
- AC4: intensity ≥ 2.0 时自动叠加泛音增厚层（音量 ×0.3）
- AC5: intensity 影响衰减时长：baseDecay × (1 + log₂(intensity) × 0.3)

**改动文件：**
- `effects/sound.ts`: 各 synth 函数内 intensity/chainDepth 参数处理
- `systems/skills.ts`: `triggerSkill` 传入 `chain.length - 1` 作为 chainDepth

**估点：** 2

---

### Story 23.4: 混音平衡与极端场景

**目标：** 确保资源音效与打字音、结算音和谐共存

**前置：** Story 23.2

**验收标准：**
- AC1: 资源音效总音量 ≤ 打字音峰值的 60%（背景层定位）
- AC2: 词语结算 `playScoreSound` 触发时，当帧资源音效自动降 6dB（侧链回避）
- AC3: 20+ 技能 + 高速打字场景，无爆音、无可感知延迟
- AC4: 伪无限循环（250ms 自动触发）场景下音效节奏自然
- AC5: Boss 战（高压力、高密度产出）听感紧张但不烦躁

**改动文件：**
- `effects/sound.ts`: 侧链逻辑、音量封顶调优

**估点：** 2

---

### Story 23.5: BGM 骨架 — Drone 持续低音

**目标：** 提供恒定的调性锚点，填充低频空白

**前置：** 无（可与 23.2 并行）

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
- AC5: 脉冲频段（40-80Hz）不与资源音效 / 打字音冲突

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

1. **辨识度优先**：每种资源有独特音色特征，蒙眼可辨识（参考 Balatro 的 chips/coin/multhit）
2. **耳朵是信息通道**：眼睛忙于打字时，音效承担资源产出反馈的核心职责
3. **不干扰打字节奏**：资源音效是背景层，不应抢占打字音的前景地位
4. **密集不成噪**：10+ 技能同时产出时仍然清晰，而非叠加成噪音
5. **变体防重复**：同类音效通过参数随机化产生微妙变化，避免机械感

## 技术约束

- 优先 Web Audio API 合成，可选采样辅助（放置于 `public/assets/audio/`）
- 零额外延迟（`queueMicrotask` 在同一帧内完成）
- 保持现有架构：`effects/sound.ts` 单文件
- 保持 `connectToOutput()` 全局混响管线
- 保持 `randomize()` / `softAttack()` 工具函数

## 实施顺序

```
资源音效线：                    BGM 线：
23.1 缓冲管线 ✅ DONE (3pt)    23.5 Drone 持续低音 (1pt)
 ├── 23.2 独立音色设计 (3pt)     ├── 23.6 节奏脉冲层 (2pt)
 ├── 23.3 连锁/强度调制 (2pt)    ├── 23.7 张力层 (3pt)
 └───┴── 23.4 混音平衡 (2pt) ←──┘  （全局调优）
```

两条线可并行开发。23.4 混音平衡作为最终调优，依赖两条线全部完成。
总计 16 点（23.1 已完成 3 点，剩余 13 点）。

## 参考

- **Balatro 音效设计**：75 个音效文件，chips(2)/coin(7)/multhit(2)/glass(6) 等多变体设计
  - 音源来自 [Freesound.org](https://freesound.org)（CC0），含 toy piano 采样
  - 蓄力→释放两段式（`explosion_buildup` → `explosion_release`）
  - 8-bit 合成风格 + CRT 视觉 = 复古赌场氛围
- Epic 候选 A「连锁视听反馈」（brainstorm #21/#30/#51-58/#64/#95）
- Epic 7「音效与视觉」（旧规划，已由当前实现部分覆盖）
- Story 31.3「数字音效系统」（已完成）
