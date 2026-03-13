# Story 36.12: 结算/评分系统遗物

Status: done

## Story

As a player,
I want 5 scoring/settlement relics that protect minimum word score, reduce target requirements, reward high ratings, snowball word scores, and introduce a high-risk one-shot settlement mechanic,
so that build strategies can manipulate the scoring and settlement phases for higher rewards or dramatic risk/reward gameplay.

## Acceptance Criteria

1. **AC1 — 基数护盾 (base_shield)**: 每词结算时 `wordScore = max(20, calculatedScore)`——在 Boss 修饰器 scoreCap/diminish 之后、加入 state.score 之前应用。
2. **AC2 — 宽容评审 (lenient_judge)**: `targetScore = floor(originalTarget * 0.9)`——在 startLevel() 中 targetScore 设置后、Boss 修饰器 targetMultiplier 之前应用（最终 target 受 shield 和 reversal 叠加影响）。
3. **AC3 — S 级奖杯 (s_rank_trophy)**: 战斗结束结算评级后，S 评级 +25 金币、SS +50、SSS +100——在 showGoldReward() 和 openShop() 的金币计算中同步应用。
4. **AC4 — 雪球效应 (snowball)**: 追踪本关单词序号 N（从 1 开始），第 N 个词最终得分 ×(1 + 0.05×(N-1))——在基数护盾之后、加入 state.score 之前应用。
5. **AC5 — 分数黑洞 (score_black_hole)**: 单词完成后禁止自动结算（finalWordScore 不加入 state.score），基数和倍率累计到隐藏池；HUD 分数显示替换为"???"；监听回车键触发一次性结算（pool 全部加入 state.score）；结算后立即判定——达标通关，未达标直接失败。整关仅一次结算机会。
6. **AC6 — 分数黑洞的 HUD 隐藏/显示切换有测试**。
7. **AC7 — 分数黑洞与雪球效应联动有测试**（隐藏池中雪球递增正确应用）。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'scoring'`
  - [x] 1.2 `base_shield` (common, basePrice:50)、`lenient_judge` (common, basePrice:50)、`s_rank_trophy` (rare, basePrice:80)、`snowball` (epic, basePrice:120, behaviorType:'snowball')、`score_black_hole` (legendary, basePrice:0, behaviorType:'score_black_hole')
  - [x] 1.3 确认图标唯一性（与现有 60 个遗物不冲突）
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（60→65）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（score_black_hole basePrice=0）

- [x] Task 2: 创建 ScoringRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/ScoringRelicBehaviors.ts`
  - [x] 2.2 导出常量：`BASE_SHIELD_MIN = 20`、`LENIENT_REDUCE = 0.10`、`S_RANK_GOLD = { S: 25, SS: 50, SSS: 100 }`、`SNOWBALL_INCREMENT = 0.05`
  - [x] 2.3 模块级状态：`_snowballWordIndex: number`（本关单词序号，从 0 开始）、`_blackHolePool: number`（隐藏累计分）、`_blackHoleSettled: boolean`（是否已手动结算）、`_blackHoleActive: boolean`（当前关是否激活黑洞模式）
  - [x] 2.4 导出 `applyBaseShield(wordScore: number): number` — 有遗物 → `max(BASE_SHIELD_MIN, wordScore)`，否则原值
  - [x] 2.5 导出 `applyLenientJudge(targetScore: number): number` — 有遗物 → `floor(targetScore * (1 - LENIENT_REDUCE))`，否则原值
  - [x] 2.6 导出 `getSRankTrophyGold(rating: string): number` — 有遗物 + rating 为 S/SS/SSS → 返回对应金币，否则 0
  - [x] 2.7 导出 `applySnowball(wordScore: number): number` — 有遗物 → `floor(wordScore * (1 + SNOWBALL_INCREMENT * _snowballWordIndex))`（调用后 _snowballWordIndex++），否则原值（仍 _snowballWordIndex++ 用于计数）
  - [x] 2.8 导出 `isBlackHoleActive(): boolean` — 返回 `_blackHoleActive`
  - [x] 2.9 导出 `accumulateBlackHole(wordScore: number): void` — 将 wordScore 加入 `_blackHolePool`
  - [x] 2.10 导出 `settleBlackHole(): number` — 返回 `_blackHolePool`，设 `_blackHoleSettled = true`
  - [x] 2.11 导出 `hasBlackHoleSettled(): boolean` — 返回 `_blackHoleSettled`
  - [x] 2.12 导出 `getBlackHolePool(): number` — 返回当前 `_blackHolePool`（用于调试/测试）
  - [x] 2.13 导出 `resetScoringRelicBattleState(): void` — 重置 `_snowballWordIndex=0`、`_blackHolePool=0`、`_blackHoleSettled=false`、`_blackHoleActive = state.player.relics.has('score_black_hole')`
  - [x] 2.14 导出 `initScoringRelicBehaviors(): void` — 注册 snowball 和 score_black_hole 两个 behaviorType

- [x] Task 3: 实现基数护盾 (AC: #1)
  - [x] 3.1 在 `battle.ts` 的 `completeWord()` 中，Boss 修饰器 scoreCap/diminish 之后（~L608 后），调用 `applyBaseShield(finalWordScore)`
  - [x] 3.2 注意顺序：scoreCap → diminish → base_shield → snowball → black_hole → state.score

- [x] Task 4: 实现宽容评审 (AC: #2)
  - [x] 4.1 在 `battle.ts` 的 `startLevel()` 中，`state.targetScore` 设置后（~L1153 后）、tempBuff 应用前或后，调用 `applyLenientJudge(state.targetScore)` 覆写 targetScore
  - [x] 4.2 顺序：calculateTargetScore → lenient_judge → tempBuff → boss_double_target modifier → shield 后修正 → reversal

- [x] Task 5: 实现 S 级奖杯 (AC: #3)
  - [x] 5.1 在 `battle.ts` 的 `endLevel()` 中，`calculateRating()` 之后获取评级
  - [x] 5.2 在 `showGoldReward()` 金币计算中加入 `getSRankTrophyGold(state.battleStats.rating)` 到 relicGold
  - [x] 5.3 在 `shop.ts` 的 `openShop()` 同步应用（金币双路径同步）

- [x] Task 6: 实现雪球效应 (AC: #4)
  - [x] 6.1 在 `battle.ts` 的 `completeWord()` 中，base_shield 之后调用 `applySnowball(finalWordScore)`
  - [x] 6.2 `applySnowball` 内部递增 `_snowballWordIndex`，返回乘以雪球倍率的分数

- [x] Task 7: 实现分数黑洞 (AC: #5, #6)
  - [x] 7.1 在 `battle.ts` 的 `completeWord()` 中，snowball 之后检查 `isBlackHoleActive()`：
    - 若 true：调用 `accumulateBlackHole(finalWordScore)`，跳过 `state.score += finalWordScore` 和后续结算动画/胜利检查
    - 若 false：正常流程
  - [x] 7.2 HUD 修改：`startLevel()` 中若黑洞激活，将分数显示元素文本设为 `"???"`；监听分数更新时保持 `"???"`
  - [x] 7.3 Enter 键监听：在 `initInput()` 或 `startLevel()` 中添加回车键监听器
    - 仅在 `isBlackHoleActive() && !hasBlackHoleSettled() && state.phase === 'battle'` 时生效
    - 调用 `settleBlackHole()` 获取池分 → `state.score += pool`
    - 恢复 HUD 分数显示
    - 立即判定：`state.score >= state.targetScore` → 正常胜利流程；否则 → `gameOver()`
  - [x] 7.4 黑洞模式下仍然正常触发技能、combo、资源产出（只跳过分数结算和胜利检查）
  - [x] 7.5 结算动画：黑洞结算时播放特殊反馈 `showFeedback('🕳️ 黑洞结算！', '#8800ff')`

- [x] Task 8: 注册模块初始化 + 生命周期 (AC: #1-#5)
  - [x] 8.1 `battle.ts` 的 `initInput()` 中调用 `initScoringRelicBehaviors()`
  - [x] 8.2 `battle.ts` 的 `startLevel()` reset 区中调用 `resetScoringRelicBattleState()`

- [x] Task 9: 单元测试 (AC: #1-#7)
  - [x] 9.1 创建 `relics.scoring.test.ts`
  - [x] 9.2 常量值测试（4 个常量）
  - [x] 9.3 基数护盾：无遗物→原值、有遗物→max(20, score)、score=0→20、score=50→50
  - [x] 9.4 宽容评审：无遗物→原值、有遗物→floor(target*0.9)
  - [x] 9.5 S 级奖杯：无遗物→0、有遗物+S→25、SS→50、SSS→100、A/B/C→0
  - [x] 9.6 雪球效应：无遗物→原值（但 wordIndex 仍递增）、有遗物→第1词×1.0、第2词×1.05、第5词×1.20
  - [x] 9.7 分数黑洞：accumulate 累加正确、settleBlackHole 返回池总额、settled 后不可重复结算
  - [x] 9.8 黑洞+雪球联动 (AC7)：雪球递增正确应用到累加池
  - [x] 9.9 HUD 隐藏/显示 (AC6)：isBlackHoleActive 正确反映状态
  - [x] 9.10 生命周期：reset 重置所有状态
  - [x] 9.11 注册：initScoringRelicBehaviors 注册 ≥2 个行为

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.11）：**
- `RelicSubsystem` 类型已包含 `'scoring'`（relics.ts:95）
- `RelicBehaviorType` 已包含 `'snowball'`、`'score_black_hole'`（relics.ts:135-136）
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 60 个遗物已实现（10 职业 + 5×10 通用）

**结算/评分系统完整流程（battle.ts completeWord ~L546-761）：**
```
baseChips = wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore + wordBonus
  → resolveRelicEffectsWithBehaviors('on_word_complete', ...) → bonusMult
  → jazz bonus + rhythm adapt bonus
  → finalMult = mult * bonusMult
  → finalWordScore = floor(baseChips * finalMult)
  → Boss: scoreCap → diminish
  → 【新插入点：base_shield → snowball → black_hole 拦截】
  → showSettlementComplete(baseChips, finalMult, finalWordScore)
  → state.score += finalWordScore
  → Glass Cannon ×2
  → score tier animation + milestone check
  → 胜利检查：state.score >= state.targetScore → endLevel()
```

**评级系统（effects/juice.ts L328-372）：**
```
calculateRating({ score, targetScore, perfectWords, wordsCompleted, timeRemaining, timeMax })
  → accuracyScore = (perfectWords / wordsCompleted) * 5    (0-5)
  → speedScore = min(5, log2(1 + timeRatio * 3) * 2)       (0-5)
  → overkillScore = min(5, log2(1 + overkillRatio) * 1.8)  (0-5)
  → avg = (accuracy + speed + overkill) / 3
  → SSS: ≥4.2, SS: ≥3.4, S: ≥2.6, A: ≥1.8, B: <1.8, C: 未达标
```

**targetScore 设置流程（battle.ts startLevel ~L1150-1165）：**
```
state.targetScore = calculateTargetScore(battleNum, stageType, cycle)
  → demo override (if demo mode)
  → tempBuff application (targetScore buff type)
  → 【新插入点：lenient_judge 在此处应用】
  → boss_double_target modifier (在 applyModifier 内 state.targetScore *= mult)
  → modifier_shield 后修正 (Story 36.11)
  → modifier_reversal (Story 36.11)
```

**金币计算架构（双路径同步）：**
```
showGoldReward() [显示]:
  baseGold=100 + skillGold + relicGold(on_battle_end)
  → furnace override → eliteMultiplier → bountyBonus
  → 【新插入点：s_rank_trophy 金币加到 relicGold 或独立行】
  → totalGold = floor((base + skill + relic) * elite * (1+bounty))

openShop() [实际金币]:
  同步计算 → state.gold += battleGold
```

**endLevel() 中评级计算位置（~L1007-1016）：**
```
calculateRating({...}) → state.battleStats.rating
  → 【s_rank_trophy 在此之后读取 rating】
```

**Enter 键处理：**
当前系统无 Enter 键监听。Tab 键监听在 `initInput()` 中通过 `document.addEventListener('keydown', handleTabKey)` 实现。分数黑洞可参照此模式添加 Enter 键监听。

**HUD 分数显示元素：**
- `el.score` — 分数文本元素（battle.ts 中通过 `el.score.textContent = String(state.score)` 更新）
- `el.targetScore` — 目标分数文本
- `#score-settlement` — 结算面板（chips × mult = final）
- 更新时机：`updateHUD()` 函数每帧调用

### 关键设计决策

**1. 分数黑洞的实现方案：**
- completeWord() 中 `isBlackHoleActive()` 检查后分叉：
  - **true 路径**：`accumulateBlackHole(finalWordScore)` → 跳过 state.score 赋值、showSettlement、胜利检查 → 但保留所有其他效果（技能触发、combo、资源产出、动画）
  - **false 路径**：正常流程
- Enter 键监听器：`handleEnterKey(e: KeyboardEvent)` — 条件：黑洞激活 + 未结算 + battle 阶段
- 结算时：`state.score += settleBlackHole()` → 恢复 HUD → 判定
- HUD "???" 模式：在 `updateHUD()` 中条件覆写，或直接在 startLevel 时替换元素文本并阻止后续更新

**2. 雪球效应的计数基准：**
- `_snowballWordIndex` 从 0 开始，每词调用 `applySnowball` 时先用当前值计算倍率再递增
- 第 1 词：index=0 → mult=1.0（+0%），第 2 词：index=1 → mult=1.05（+5%），第 N 词：index=N-1 → mult=1+0.05*(N-1)
- 无遗物时仍递增 index（保持计数一致性，用于调试）

**3. 基数护盾应用位置：**
- 必须在 scoreCap/diminish 之后——否则 cap=50 时 base_shield 的 max(20, x) 没有意义
- 必须在 snowball 之前——base_shield 保底 20 后再 snowball 递增

**4. 宽容评审应用位置：**
- 在 calculateTargetScore 之后、tempBuff 之前（或之后均可，因为 tempBuff 是乘法）
- 关键：宽容评审与 boss_double_target 叠加——先 -10% 再 ×2 = 最终目标 = original × 0.9 × 2

**5. S 级奖杯金币归属：**
- 作为独立加算项加到 totalGold 中（不受 eliteMultiplier 和 bountyBonus 乘法影响）
- 或作为 relicGold 加算项（受乘法影响）—— 建议前者更直观

**6. 分数黑洞与其他遗物联动：**
- 玻璃大炮(glass_cannon)：黑洞模式下 Glass Cannon 的 ×2 应该作用于 accumulateBlackHole 的输入（即 finalWordScore 已含 ×2）
- 雪球效应(snowball)：每词的 snowball 倍率正常应用到 finalWordScore，然后进入黑洞池
- 分数磁铁(score_magnet)：每词 +1 分也应进入黑洞池（或绕过？建议进入池，保持一致性）
- Boss scoreCap/diminish：正常生效后再进入黑洞池

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType |
|---|---|---|---|---|---|---|
| `base_shield` | 基数护盾 | 需确认 | common | 50 | scoring | — |
| `lenient_judge` | 宽容评审 | 需确认 | common | 50 | scoring | — |
| `s_rank_trophy` | S 级奖杯 | 需确认 | rare | 80 | scoring | — |
| `snowball` | 雪球效应 | 需确认 | epic | 120 | scoring | snowball |
| `score_black_hole` | 分数黑洞 | 需确认 | legendary | 0 | scoring | score_black_hole |

注：
- base_shield、lenient_judge、s_rank_trophy 不需 behaviorType（纯数值计算，纯函数直接调用）
- snowball、score_black_hole 需要 behaviorType（涉及模块级状态和复杂行为）
- score_black_hole basePrice=0（传说级，与 universal_furnace、timed_auction、phoenix、modifier_reversal 同）
- 图标需 5 个不同 emoji，且与现有 60 个遗物+7 资源+12 Boss 不冲突

### 从 Story 36.2 — 36.11 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji，查 iconRegistry 避免冲突。
7. **遗物总数断言**: `relics.test.ts` 中总数（60→65）、各稀有度计数需更新。
8. **zeroPriceRelics**: score_black_hole basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **金币双路径**: showGoldReward（显示）+ openShop（实际）必须同步——Story 36.10/36.11 Review 反复教训。
11. **state.player.relics.has()**: 每个导出函数首行检查遗物是否持有。
12. **code review 常见发现**: 缺少 showFeedback、magic number 硬编码、读取已修改值。

### 性能约束

- base_shield: 单次 max 比较，<0.01ms
- lenient_judge: 一次性乘法，<0.01ms
- s_rank_trophy: 一次性查表，<0.01ms
- snowball: 每词一次乘法 + 递增，<0.01ms
- score_black_hole: 每词一次加法（累加池），Enter 时一次加法，<0.01ms

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData
- `src/src/systems/battle.ts` — completeWord 插入 3 个处理点 + startLevel 插入 lenient_judge + Enter 键监听 + HUD 修改 + initInput/reset
- `src/src/systems/shop.ts` — openShop 中 s_rank_trophy 金币同步
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 60→65 和各稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 score_black_hole

**需新建的文件：**
- `src/src/systems/relics/ScoringRelicBehaviors.ts` — 结算/评分子系统行为模块
- `src/tests/unit/systems/relics/relics.scoring.test.ts` — 结算/评分遗物测试

### References

- [Source: docs/design/relic-system.md#结算/评分系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.12] — 验收标准和遗物清单
- [Source: docs/implementation-artifacts/36-11-boss-modifier-relics.md] — 前序 Story 开发记录与经验（含 Code Review 教训）
- [Source: src/src/systems/battle.ts#L546-761] — completeWord 完整评分流程
- [Source: src/src/systems/battle.ts#L847-911] — showGoldReward 金币计算
- [Source: src/src/systems/battle.ts#L994-1093] — endLevel 评级计算与胜利/失败分支
- [Source: src/src/systems/battle.ts#L1150-1165] — startLevel targetScore 设置流程
- [Source: src/src/effects/juice.ts#L328-372] — calculateRating 评级公式（SSS≥4.2, SS≥3.4, S≥2.6）
- [Source: src/src/systems/shop.ts#L456-465] — openShop 金币同步计算
- [Source: src/src/systems/relics/BossModifierRelicBehaviors.ts] — 行为模块参考模式
- [Source: docs/project-context.md] — 项目编码规范与架构约束

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- 5 个结算/评分遗物全部实现：base_shield, lenient_judge, s_rank_trophy, snowball, score_black_hole
- 图标：🔰⚖️🏆❄️🌀（与现有 60 遗物无冲突）
- 分数黑洞 Enter 键手动结算：参照 Tab 键模式添加独立监听
- 黑洞模式下 Glass Cannon ×2 作用于池输入（finalWordScore * 2）
- S 级奖杯金币独立加算（不受 eliteMultiplier/bountyBonus 乘法影响）
- 金币双路径同步（showGoldReward + openShop）
- 29 个单元测试全部通过
- 全量 483 遗物测试通过，无新增回归

**Code Review 修复（6 issues: 1H/2M/3L）：**
- H1: score_magnet 每击键 +1 绕过黑洞池 → playerCorrect() 加 isBlackHoleActive() 判断重定向到池
- M1: showFeedback emoji 不符 spec → 🌀 改为 🕳️
- M2: updateHUD 黑洞 "???" 仍被着色/tier class → 黑洞隐藏时跳过 progress 着色和 tier 更新
- L1: 缺少负分边缘测试 → 添加 applyBaseShield(-5) 测试
- L2: 雪球无遗物 index 递增测试不充分 → 添加 index 验证
- +1 黑洞磁铁交互测试 → 31 个测试全部通过

### File List

- `src/src/data/relics.ts` — 添加 5 个 RelicData 条目（scoring 子系统）
- `src/src/systems/relics/ScoringRelicBehaviors.ts` — 新建行为模块（4 常量 + 10 导出函数）
- `src/src/systems/battle.ts` — completeWord 插入 base_shield/snowball/black_hole + startLevel 插入 lenient_judge + Enter 键监听 + HUD "???" + 初始化/重置
- `src/src/systems/shop.ts` — openShop 同步 s_rank_trophy 金币
- `src/tests/unit/systems/relics/relics.scoring.test.ts` — 新建 29 个测试
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 60→65 + 稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 score_black_hole
