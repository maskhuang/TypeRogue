# Story 54.2: 练习关金币映射

Status: done

## Story

作为玩家，我想要练习关的表现决定我的初始金币和目标分基准，以便打得好有经济优势，Ascension 地板分也对高级玩家施加压力。

## Acceptance Criteria

1. 练习关（校准关）结算时，effectiveScore = max(practiceScore, ascensionLevel × 50)
2. effectiveScore 继续作为 calibratedTargetBase（已有逻辑，需增加地板）
3. 初始金币由 effectiveScore 映射得出：100g 底 + 分段递减奖励，上限 160g
4. A1+（ascensionLevel >= 1）时金币转换效率 ×0.75
5. 移除 main.ts 中固定初始金币赋值（75/50）
6. 校准关结束后的金币奖励替换为映射公式（而非标准战斗金币 100+overflow）
7. 校准关结算界面显示获得的金币数

## Tasks

- [x] Task 1: 金币映射函数 (AC: 3, 4)
  - [x] 1.1 constants.ts 新增 PRACTICE_GOLD 常量对象 + computePracticeGold() 纯函数
  - [x] 1.2 分段递减：0-200 → 0.1g/分, 200-500 → 0.06g/分, 500+ → 0.02g/分
  - [x] 1.3 12 个单元测试：A0/A1 × 各分数段 + 上限 + 负分防御
- [x] Task 2: 地板分 + effectiveScore 计算 (AC: 1, 2)
  - [x] 2.1 battle.ts 校准关结算：effectiveScore = max(score, ascensionLevel × 50)
  - [x] 2.2 calibratedTargetBase 使用 effectiveScore
- [x] Task 3: 金币赋值流程改造 (AC: 5, 6)
  - [x] 3.1 移除 main.ts 中 state.gold = 75 (demo) / 50 (full) 固定赋值
  - [x] 3.2 校准关 endLevel：跳过 showGoldReward，用 computePracticeGold 直接赋值
  - [x] 3.3 非校准关仍走标准 showGoldReward 路径（return guard）
- [x] Task 4: 结算反馈 (AC: 7)
  - [x] 4.1 校准关结算时 showFeedback 显示金币数
  - [x] 4.2 i18n: practice.gold_earned 中英文

## Dev Notes

### 当前流程（需改造）

```
main.ts: state.gold = 75 (demo) / 50 (full)  ← 移除
↓
Level 1 (calibration): _isCalibrationLevel = true
↓
endLevel():
  state.calibratedTargetBase = max(1, round(state.score))  ← 改为 effectiveScore
  battle gold = 100 + overflow  ← 替换为 computePracticeGold()
↓
Shop opens with total gold
```

### 新流程

```
main.ts: state.gold = 0
↓
Level 1 (calibration): _isCalibrationLevel = true
↓
endLevel():
  effectiveScore = max(state.score, ascensionLevel × 50)
  state.calibratedTargetBase = max(1, round(effectiveScore))
  state.gold = computePracticeGold(effectiveScore, ascensionLevel)
↓
Shop opens with mapped gold
```

### 金币映射公式

```
rawGold = 100 + bonusFromScore(effectiveScore)

bonusFromScore 分段：
  0-200:    0.1g/分    →  0-20g
  200-500:  0.06g/分   → 20-38g
  500+:     0.02g/分   → 38g+

gold = floor(rawGold × (ascensionLevel >= 1 ? 0.75 : 1.0))
hardCap = 160
```

### 关键文件位置

- `src/main.ts` line 63 (demo) / 98 (full) — state.gold 初始赋值
- `src/systems/battle.ts` line 1662-1665 — 校准关结算
- `src/systems/shop.ts` line 1173-1189 — 标准战斗金币计算
- `src/core/state.ts` line 158-168 — calculateTargetScore()
- `src/core/constants.ts` — BALANCE 对象
- 前置 Story 54-1 已完成：state.ascensionLevel 可读

### 边界情况

- cycle 2+ 的 stage 1：calibratedTargetBase 已由 Boss overkill 设定，不再是校准关，走标准金币逻辑
- effectiveScore = 0（ascensionLevel = 0 且玩家一个字没打）：gold = 100g（底金）
- 极高分（如 1000）：gold = min(rawGold, 160) = 160g

### References

- [Source: docs/planning-artifacts/ascension-system-design.md#练习关金币映射]
- [Source: docs/stories/epic-54-ascension-system.md#54-2]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- PRACTICE_GOLD 常量 + computePracticeGold() 纯函数（100g 底 + 3 段递减 + A1 ×0.75 + 160g 上限）
- 校准关 effectiveScore 含 Ascension 地板分（ascensionLevel × 50）
- 移除 main.ts 固定初始金币（demo 75g / full 50g）
- 校准关跳过标准 showGoldReward，直接用映射公式赋金币
- 12 个 computePracticeGold 单元测试全部通过
- Code review: H1 effectiveScore 重复计算 → 提取为 _calibrationEffectiveScore 复用；M1 showFeedback 时机确认正常（rating reveal 后）；L1 测试注释补充

### File List

- `src/core/constants.ts` — PRACTICE_GOLD 常量 + computePracticeGold() 函数
- `src/systems/battle.ts` — 校准关 effectiveScore 地板 + 金币映射替换 showGoldReward
- `src/main.ts` — 移除固定 state.gold = 75/50
- `src/demo/demo-i18n.ts` — practice.gold_earned 中英文
- `tests/unit/core/practice-gold.test.ts` — 12 个测试
