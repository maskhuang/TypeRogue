# Story 19.1: 5 资源核心系统

Status: done

## Story

作为一个 **开发者**，
我想要 **定义 5 种核心资源类型（基数/分数/倍率/时间/护盾）并重构分数管道**，
以便 **后续产出者/转化者/连接者都在统一的资源框架上运作，替代现有的隐式分数系统**。

## Acceptance Criteria

1. 定义 `ResourceType` 枚举：`base`(基数)、`score`(分数)、`multiplier`(倍率)、`time`(时间)、`shield`(护盾)
2. `GameState` 新增 `resources: Record<ResourceType, number>` 字段，初始值：base=0, score=0, multiplier=1.0, time=关卡秒数, shield=0
3. 最终得分公式 `finalScore = base × multiplier + score` 正确集成到 `completeWord()` 结算流程
4. 护盾系统：每层护盾抵消一次错误输入的连击中断和扣分，触发时 `resources.shield -= 1`
5. 时间资源：技能产出的时间值直接增减倒计时，上限 `timeMax × 2`
6. `resetResources()` 在 `startLevel()` 中正确初始化所有资源
7. Balatro 式结算面板继续工作：显示 `base × multiplier` + `score` = `finalScore`
8. 现有 Modifier 管道（三阶段三层）的 `score`/`multiply`/`time`/`shield` 效果类型映射到新资源字段
9. 所有现有测试通过或适配更新，零回归

## Tasks / Subtasks

- [x] Task 1: 资源类型定义 (AC: 1, 2)
  - [x]1.1 在 `src/core/types.ts` 定义 `ResourceType` 枚举和 `ResourceState` 类型
  - [x]1.2 在 `GameState` 中新增 `resources: ResourceState` 字段
  - [x]1.3 更新 `resetState()` 初始化 resources

- [x] Task 2: 分数管道重构 — completeWord (AC: 3, 8)
  - [x]2.1 `completeWord()` 中 baseChips 读取 `resources.base`（替代 wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore）
  - [x]2.2 multiplier 读取 `resources.multiplier`（替代 state.multiplier）
  - [x]2.3 score 读取 `resources.score`（即时得分部分）
  - [x]2.4 最终公式：`finalWordScore = floor(resources.base × resources.multiplier) + resources.score + player.wordBonus`
  - [x]2.5 Boss modifier（scoreCap / diminishRate）在公式之后应用
  - [x]2.6 确保 state.score（累计关卡总分）仍然正确累加

- [x] Task 3: 每击键资源更新 — playerCorrect (AC: 3, 8)
  - [x]3.1 击键时将 letterBase(=1) 加到 `resources.base`
  - [x]3.2 重构 multiplier 计算：baseMultiplier + comboBonus + passiveBonus + skillMultBonus → 写入 `resources.multiplier`
  - [x]3.3 Modifier 管道的 score/multiply/time/shield 效果写入对应 resources 字段
  - [x]3.4 synergy.skillBaseScore / synergy.skillMultBonus / synergy.letterBaseScore 的贡献也写入 resources

- [x] Task 4: 护盾系统 (AC: 4)
  - [x]4.1 `playerWrong()` 中检查 `resources.shield > 0`（替代 synergy.shieldCount）
  - [x]4.2 触发时 `resources.shield -= 1`，播放音效 + 浮字反馈
  - [x]4.3 保持现有 Modifier 的 shield 效果类型，写入 `resources.shield`

- [x] Task 5: 时间资源 (AC: 5)
  - [x]5.1 `startLevel()` 中 `resources.time = timeMax + player.timeBonus`
  - [x]5.2 timer tick 减 `resources.time`（替代 state.time）
  - [x]5.3 技能/遗物的 time 效果写入 `resources.time`，clamp 到 `[0, timeMax × 2]`

- [x] Task 6: 结算面板适配 (AC: 7)
  - [x]6.1 `updateSettlementLive()`：chips = `resources.base`，mult = `resources.multiplier`
  - [x]6.2 增加 score 显示行：`base × mult + score = final`
  - [x]6.3 `showSettlementComplete()` 使用新公式

- [x] Task 7: startLevel / resetResources (AC: 6)
  - [x]7.1 新增 `resetResources()` 函数：base=0, score=0, mult=1.0, time=timeMax, shield=0
  - [x]7.2 在 `startLevel()` 中调用，替代分散的变量初始化
  - [x]7.3 保持 tempBuff / sealedKeys 清理逻辑不变

- [x] Task 8: 测试 (AC: 9)
  - [x]8.1 资源初始化测试（resetResources 各字段正确）
  - [x]8.2 分数公式正确性测试（base × mult + score）
  - [x]8.3 护盾抵消测试（shield > 0 阻断 playerWrong）
  - [x]8.4 时间 clamp 测试（不超 timeMax × 2）
  - [x]8.5 结算面板显示正确性
  - [x]8.6 所有现有测试回归通过

## Dev Notes

### 当前代码 → 新资源的映射关系

| 当前变量 | 位置 | → 新资源字段 |
|----------|------|-------------|
| `wordBaseScore`（每击键 +1 累加）| battle.ts:playerCorrect | `resources.base` |
| `synergy.skillBaseScore` | battle.ts:completeWord | `resources.base`（技能贡献合入）|
| `synergy.letterBaseScore` | battle.ts:completeWord | `resources.base`（字母升级合入）|
| `state.multiplier`（每击键重算）| battle.ts:playerCorrect | `resources.multiplier` |
| `synergy.skillMultBonus` | battle.ts:playerCorrect | 合入 `resources.multiplier` 计算 |
| `state.wordScore`（即时显示）| battle.ts:playerCorrect | `resources.score`（即时加分通道）|
| `synergy.shieldCount` | battle.ts:playerWrong | `resources.shield` |
| `state.time` | battle.ts:startTimer | `resources.time` |

### 关键文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/core/types.ts` | 新增 ResourceType, ResourceState；GameState 加 resources 字段 |
| `src/core/state.ts` | resetState() 初始化 resources |
| `src/systems/battle.ts` | completeWord, playerCorrect, playerWrong, startLevel, timer — 全部用 resources |
| `src/systems/battle.ts` | updateSettlementLive, showSettlementComplete — 面板适配 |
| `src/systems/modifiers/EffectPipeline.ts` | score/multiply/time/shield 效果写入 resources |
| `tests/unit/systems/battle.test.ts` | 适配新字段 |
| `tests/unit/systems/modifiers/*.test.ts` | 适配新字段 |

### 现有分数公式（BEFORE）

```typescript
// playerCorrect — 每击键
let mult = state.player.baseMultiplier        // 1.0
  + lonePassiveBonus                          // layout-only: up to +0.2
  + state.combo * state.player.comboBonus     // combo × 0.1
  + perfectStreak * 0.01                      // perfectionist relic
  + synergy.skillMultBonus                    // skill triggers
state.multiplier = mult
letterScore = 1 * mult
state.wordScore += letterScore

// completeWord
baseChips = wordBaseScore + synergy.skillBaseScore + synergy.letterBaseScore
finalMult = state.multiplier * (1 + wordRelicResult.effects.multiply)
finalWordScore = floor(baseChips * finalMult + player.wordBonus)
```

### 新分数公式（AFTER）

```typescript
// playerCorrect — 每击键
resources.base += 1  // 基础击键贡献
resources.multiplier = player.baseMultiplier + lonePassiveBonus
  + combo * player.comboBonus + perfectStreak * 0.01 + synergy.skillMultBonus

// Modifier 管道的 score/multiply 效果直接修改 resources
// skill base → resources.base += skillBaseScore
// skill mult → resources.multiplier += skillMultBonus

// completeWord
baseChips = resources.base
finalMult = resources.multiplier * (1 + wordRelicResult.effects.multiply)
finalWordScore = floor(baseChips * finalMult) + resources.score + player.wordBonus
// Boss modifiers 后置
state.score += finalWordScore
```

### 护盾系统（BEFORE → AFTER）

```typescript
// BEFORE: synergy.shieldCount (per-word reset in SynergyState)
if (shieldResult.intercepted && synergy.shieldCount > 0) {
  synergy.shieldCount--
  return
}

// AFTER: resources.shield (per-level, cross-word persistence)
if (shieldResult.intercepted && resources.shield > 0) {
  resources.shield -= 1
  showFeedback('护盾保护!', RESOURCE_COLORS.shield)
  return
}
```

**关键变化**: 护盾从 per-word (synergy) 改为 per-level (resources)，跨词持续。这使得护盾成为可积累的资源。

### 时间系统（BEFORE → AFTER）

```typescript
// BEFORE: state.time, state.timeMax
state.time = state.timeMax + state.player.timeBonus
state.time -= 0.1 * timeSpeed

// AFTER: resources.time
resources.time = timeMax + player.timeBonus
resources.time -= 0.1 * timeSpeed
// clamp: resources.time = clamp(resources.time, 0, timeMax * 2)
```

### Modifier 管道集成

现有 `ModifierEffectType` = `'score' | 'multiply' | 'time' | 'gold' | 'shield'`。

映射规则：
- `score` → `resources.base`（加法：base 层累加到基数）
- `multiply` → `resources.multiplier`（乘法：enhance 层相乘）
- `time` → `resources.time`（直接加减）
- `shield` → `resources.shield`（直接加减）
- `gold` → `state.gold`（不变，不属于 5 资源）

**注意**: Modifier 管道的 `score` 效果类型在新体系中映射到 `resources.base`（公式结算部分），而非 `resources.score`（即时加分）。这保持了现有技能的行为一致性。

### 结算面板 HTML 结构

```html
<!-- 现有 -->
<div id="settlement-chips">0</div> × <div id="settlement-mult">1.0</div>
= <div id="settlement-final">0</div>

<!-- 新增 score 行（仅当 resources.score > 0 时显示） -->
<div id="settlement-chips">0</div> × <div id="settlement-mult">1.0</div>
+ <div id="settlement-score">0</div>
= <div id="settlement-final">0</div>
```

### 资源颜色常量（供后续 UI Story 使用）

```typescript
export const RESOURCE_COLORS = {
  base: '#e74c3c',       // 红
  score: '#f1c40f',      // 金
  multiplier: '#e67e22',  // 橙
  time: '#3498db',       // 蓝
  shield: '#bdc3c7',     // 银
} as const
```

### 兼容性注意事项

1. **state.score 保留**: 作为累计关卡总分（用于判断是否过关），不要删除
2. **state.multiplier 保留**: 很多地方读取它做 condition 检查（multiplier_gte），可作为 resources.multiplier 的 alias
3. **state.time 保留**: 作为 resources.time 的 alias，渐进迁移
4. **synergy.shieldCount**: 标记 deprecated 但保留，防止回归
5. **wordBaseScore 局部变量**: 仍可用于单词级别追踪，但最终写入 resources.base

### 不要修改的部分

- `gold` 系统（不属于 5 资源，保持独立）
- `combo` 系统（仍为 multiplier 的输入，不是独立资源）
- Boss modifier 框架（仅适配输入/输出字段）
- 遗物系统（Story 19.9 处理）
- 现有技能数据定义（Story 19.2+ 处理）

### Git 历史上下文

最近 10 个 commit 全部为 Epic 18 (Boss 战与 Act 结构)，技术栈稳定：
- `battle.ts` 是最频繁修改的文件（Boss modifier 集成、精英关、休息关）
- 测试模式：vitest，mock DOM 和 sound
- 代码风格：中文注释，TypeScript strict

### Project Structure Notes

- 资源类型定义放在 `src/core/types.ts`（纯类型，零依赖）
- 颜色常量放在 `src/core/constants.ts`（纯数据）
- resetResources 放在 `src/core/state.ts`（状态管理层）
- 分数管道修改在 `src/systems/battle.ts`（系统层）
- 依赖方向：`data ← core ← systems ← scenes`（不违反）

### References

- [Source: docs/brainstorming-session-2026-03-03.md#核心数字] — 5 资源定义
- [Source: docs/brainstorming-session-2026-03-03.md#关键设计决策] — 分数公式
- [Source: docs/game-architecture.md#State Management] — 三层状态
- [Source: docs/game-architecture.md#Implementation Patterns] — Modifier 管道
- [Source: docs/project-context.md#Skill System Rules] — 处理顺序
- [Source: docs/stories/epic-19-skill-system-redesign.md] — Epic 概览

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- ResourceType enum + ResourceState interface added to types.ts
- GameState.resources field added with 5 resource types (base, score, multiplier, time, shield)
- resetResources() function created in state.ts (resets per-level)
- RESOURCE_COLORS constant added to constants.ts
- playerCorrect: resources.base += letterBase, resources.multiplier synced each keystroke
- completeWord: new formula `floor(base × mult) + resources.score + wordBonus`, resources.base includes synergy contributions
- playerWrong: shield check now uses resources.shield (synergy.shieldCount kept as alias)
- startLevel: calls resetResources(), syncs multiplier/time to resources after all buff/relic calculations
- startTimer: syncs resources.time on each tick
- updateSettlementLive/showSettlementComplete: reads resources.score, shows score row when > 0
- skills.ts applyEffects: shield/multiply/time effects now also write to resources fields
- Time cap changed from timeMax+10 to timeMax×2 (per story spec)
- Compatibility: state.time, state.multiplier, synergy.shieldCount all preserved as aliases
- 63 pre-existing test failures (21 lone/void/school + 42 audio), zero new regressions

#### Code Review Fixes (2026-03-04)
- [H1] resetResources() 移到 startLevel() 中 timeMax + tempBuff 设置之后
- [H2] index.html 添加 settlement-score-row + settlement-score 元素；style.css 添加对应样式
- [M1] types.ts 中 resources.score 注释标注"预留给 Story 19.2+"
- [M2] 新增 5 个集成测试：resetResources/timeMax 联动 + applyEffects 资源同步（shield/multiply/time）
- [M3] updateSettlementLive() 计算 chips 后同步到 resources.base

### File List
- src/core/types.ts — ResourceType, ResourceState, GameState.resources
- src/core/state.ts — resetResources(), resources field in createInitialState()
- src/core/constants.ts — RESOURCE_COLORS
- src/systems/battle.ts — playerCorrect, playerWrong, completeWord, startLevel, startTimer, settlement panel
- src/systems/skills.ts — applyEffects syncs to resources
- index.html — settlement-score-row HTML 元素
- src/style.css — settlement-score-box 样式
- tests/unit/core/resources.test.ts — 26 tests (all pass)
- tests/unit/systems/skills.pipeline.test.ts — adapted time cap + shield + multi-effect tests
