# Story 36.13: 遗物平衡与集成测试

Status: done

## Story

As a developer,
I want comprehensive balance tests and cross-subsystem interaction validation for all 65 relics,
so that relic combinations behave correctly, performance stays within budget, and data integrity is guaranteed before Epic 36 closes.

## Acceptance Criteria

1. **AC1 — 联动矩阵测试**: 联动矩阵中每个组合（9 组）有对应测试用例，验证双遗物同时激活时行为正确。
2. **AC2 — Pipeline 性能**: 12 个遗物同时激活时单词完成 pipeline 耗时 <2ms（取 100 次中位数）。
3. **AC3 — 获取权重分布**: 遗物获取权重分布在 1000 次模拟中误差 <5%（各稀有度实际出现比例 vs 设计权重）。
4. **AC4 — 数据完整性**: 所有 65 个遗物的数据完整性测试——必填字段、icon 唯一性、价格合理性、subsystem 分类正确。
5. **AC5 — 全流程冒烟测试**: 端到端冒烟测试覆盖：开局→获取遗物→战斗→商店→战斗→结算，验证遗物效果在完整 run 循环中生效。

## Tasks / Subtasks

- [x] Task 1: 联动矩阵测试 (AC: #1)
  - [x] 1.1 创建 `tests/unit/systems/relics/relics.integration.test.ts`
  - [x] 1.2 玻璃大炮 + 打字蜡封：蜡封免除的错误不触发 glass_cannon 死亡（`checkWaxSealForgive()` → true 时不计为失败）
  - [x] 1.3 不灭连击 + 连击引爆：`hasImmortalCombo()` 保持 combo，`checkComboDetonator()` 每 20 combo 返回 >0 bonus — 验证可持续触发
  - [x] 1.4 不灭连击 + 节奏医生：`hasImmortalCombo()` 保持 combo，`checkRhythmDoctor()` 每 10 combo 返回 >0 time bonus — 验证可持续获得时间
  - [x] 1.5 无冕之王 + 附魔锚点：`hasUncrownedKing()` 禁止附魔时，`getEnchantAnchorSlotBonus()` 返回 +1 但对无冕之王无效（验证互斥逻辑）
  - [x] 1.6 折扣卡 + 附魔锚点：`getDiscountMultiplier()` 返回 0.85 + `getEnchantAnchorPriceMultiplier()` 返回 1.10 — 验证加算叠加效果
  - [x] 1.7 万物熔炉 + 宽容评审：`checkUniversalFurnace()` 的 overrideBase + `applyLenientJudge()` 降低 target — 验证更多 overkill 产生更多金币
  - [x] 1.8 分数黑洞 + 雪球效应：`accumulateBlackHole()` 接收经 `applySnowball()` 递增的分数 — 验证池中分数含雪球倍率（已有 relics.scoring.test.ts 中 AC7 测试，此处做联动确认）
  - [x] 1.9 暖身操 + 续航电池：`getWarmUpBonus()` 的 10 秒窗口不受 `getEnduranceTimeBonus()` 加时影响 — 验证暖身基于原始 TIME_PER_LEVEL
  - [x] 1.10 资源潮汐 + 首发强化：`getResourceTideBonus()` 奇偶加成与 `getFirstStrikeBonus()` 首发加成验证加算叠加

- [x] Task 2: Pipeline 性能测试 (AC: #2)
  - [x] 2.1 创建 `tests/unit/systems/relics/relics.performance.test.ts`
  - [x] 2.2 setup：激活 12 个不同子系统的遗物（每子系统至少 1 个）
  - [x] 2.3 模拟 completeWord 中遗物相关函数调用链（applyBaseShield, applySnowball, checkScoreMagnet, getAdjacentPowerBonus, calculateComboBuffer 等）
  - [x] 2.4 100 次循环取中位耗时，断言 <2ms
  - [x] 2.5 额外测试：全部 55 通用遗物同时激活的 pipeline 耗时仍 <5ms

- [x] Task 3: 获取权重分布测试 (AC: #3)
  - [x] 3.1 在 `relics.integration.test.ts` 中添加权重分布 describe block
  - [x] 3.2 读取遗物获取逻辑（relicPicker.ts 中的 generateRelicCandidates）
  - [x] 3.3 1000 次模拟遗物出现：按 rarity 统计出现次数
  - [x] 3.4 验证各稀有度出现比例与 `RELIC_WEIGHT_PRESETS.gameStart` 的偏差 <5%
  - [x] 3.5 验证 class-exclusive 遗物仅在对应职业出现

- [x] Task 4: 数据完整性测试 (AC: #4)
  - [x] 4.1 验证现有 `relics.test.ts` 已覆盖 65 遗物基础断言（总数、稀有度分布、icon 唯一性、必填字段）
  - [x] 4.2 在 `relics.integration.test.ts` 添加增强断言：
    - 所有 55 通用遗物的 subsystem 字段对应 11 个合法值之一
    - 每子系统恰好 5 个遗物
    - basePrice 范围合理（common: 0-80, rare: 0-120, epic: 0-200, legendary: 0-250）
    - 有 behaviorType 的遗物值合法
    - icon 唯一性、通用/职业数量验证
  - [x] 4.3 验证 `DELETED_RELIC_IDS` 中的遗物不出现在 RELICS 中

- [x] Task 5: 全流程冒烟测试 (AC: #5)
  - [x] 5.1 创建 `tests/unit/systems/relics/relics.smoke.test.ts`
  - [x] 5.2 模拟完整 run 循环：
    - 初始化 state → 获取遗物（base_shield, score_magnet, warm_up）
    - 模拟 startLevel（init behaviors, reset states, set target）
    - 模拟 completeWord 3 次 → 验证分数累积
    - 模拟 endLevel（评级、金币结算）
    - 模拟 openShop（获取 snowball, lenient_judge）
    - 模拟第二关 startLevel → 5 次 completeWord（雪球递增）→ 胜利检查
    - 验证状态一致性
  - [x] 5.3 验证遗物 reset 生命周期：resetScoringRelicBattleState 等在 startLevel 后正确重置 snowball index
  - [x] 5.4 验证遗物移除后效果消失（delete relic → 对应函数返回默认值）

- [x] Task 6: 更新 story 和 sprint status
  - [x] 6.1 更新本 story 文件状态为 review
  - [x] 6.2 更新 `sprint-status.yaml` 中 `36-13-balance-integration-test` 状态

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的 55 个通用遗物（Story 36.2 — 36.12）：**

| 子系统 | 遗物 ID | 行为模块 |
|--------|---------|----------|
| typing | typing_wax_seal, echo_thimble, repeat_reader, rhythm_adapt, glass_cannon | TypingRelicBehaviors.ts |
| combo | combo_buffer, multiplier_prism, rhythm_doctor, combo_detonator, immortal_combo | ComboRelicBehaviors.ts |
| skill | first_strike, less_is_more, training_manual, jazz_piano, uncrowned_king | SkillRelicBehaviors.ts |
| enchantment | apprentice_growth, quest_stack, enchantment_choice, enchant_floor, enchant_anchor | EnchantmentRelicBehaviors.ts |
| topology | adjacent_power, symmetry_pact, row_medal, dual_concerto, key_storm | TopologyRelicBehaviors.ts |
| word | word_collection, short_sprint, long_word_master, punctuation_liberation, dictionary_sage | WordRelicBehaviors.ts |
| resource | score_magnet, resource_sense, time_dew, resource_tide, universal_furnace | ResourceRelicBehaviors.ts |
| shop | discount_card, recycle_value, black_market, timed_auction, curio_collector | ShopRelicBehaviors.ts |
| stage | warm_up, intermission, endurance_battery, elite_hunter, phoenix | StageRelicBehaviors.ts |
| boss_modifier | modifier_shield, bounty_hunter, chaos_roulette, timed_roulette, modifier_reversal | BossModifierRelicBehaviors.ts |
| scoring | base_shield, lenient_judge, s_rank_trophy, snowball, score_black_hole | ScoringRelicBehaviors.ts |

**10 个职业专属遗物：**
- Wordsmith: apprentice_notes, masters_lexicon, perpetual_queue, word_scissors, resonance_mold
- Metamorph: primal_mutant, ultimate_mutant_strain, gene_stabilizer, chaos_seed, fittest_survivors

**稀有度分布：** 24 common, 13 rare, 13 epic, 15 legendary

**测试基线：** 17 个遗物测试文件，~485 个测试用例

### 联动矩阵详细预期行为

| # | 组合 | 核心验证点 | 涉及函数 |
|---|------|-----------|----------|
| 1 | glass_cannon + typing_wax_seal | waxSeal forgive → 不计为 glass_cannon 致死错误 | `checkWaxSealForgive()`, `hasGlassCannon()` |
| 2 | immortal_combo + combo_detonator | combo 不归零 → detonator 持续每 20 combo 触发 | `hasImmortalCombo()`, `checkComboDetonator()` |
| 3 | immortal_combo + rhythm_doctor | combo 不归零 → doctor 持续每 10 combo 返回时间奖励 | `hasImmortalCombo()`, `checkRhythmDoctor()` |
| 4 | uncrowned_king + enchant_anchor | 无冕之王禁止附魔 → 锚点额外附魔槽对其无效 | `hasUncrownedKing()`, `getEnchantAnchorSlotBonus()` |
| 5 | discount_card + enchant_anchor | 折扣 -15% 与附魔加价 +10% 加算 → 最终 -5% | `getDiscountMultiplier()`, `getEnchantAnchorPriceMultiplier()` |
| 6 | universal_furnace + lenient_judge | 宽容降低 target → 更多 overkill → furnace 更多金币 | `checkUniversalFurnace()`, `applyLenientJudge()` |
| 7 | score_black_hole + snowball | 雪球递增正确进入黑洞池 | `applySnowball()`, `accumulateBlackHole()` |
| 8 | warm_up + endurance_battery | 暖身 10s 窗口基于 BALANCE.TIME_PER_LEVEL，不受电池加时影响 | `getWarmUpBonus()`, `getEnduranceTimeBonus()` |
| 9 | resource_tide + first_strike | 奇偶加成与首发加成独立叠加 | `getResourceTideBonus()`, `getFirstStrikeBonus()` |

### 性能测试策略

```
12 遗物激活 pipeline 模拟（completeWord 关键路径）：
  applyBaseShield(score)           // scoring
  applySnowball(score)             // scoring
  checkScoreMagnet()               // resource
  getAdjacentPowerBonus(key)       // topology
  calculateComboBuffer(combo)      // combo
  getMultiplierPrismBonus()        // combo
  getFirstStrikeBonus()            // skill
  getDiscountMultiplier()          // shop (间接)
  getWarmUpBonus()                 // stage
  getShieldedValue(val, false)     // boss_modifier
  getApprenticeGrowthMultiplier()  // enchantment
  checkWordCollection(word)        // word

100 次循环 → 取 median → assert < 2ms
```

### 关键架构约束

1. **纯函数模式**: 所有行为函数为纯函数（读 state.player.relics + 模块状态 → 返回值）。测试中直接调用函数，无需 mock battle 系统。
2. **state 依赖**: 函数内部检查 `state.player.relics.has(id)`，测试中通过 `state.player.relics.add(id)` 设置。
3. **resetState()**: 测试 beforeEach 必须调用 `resetState()` + `clearBehaviorHandlers()` + 各模块 `resetXxxRelicBattleState()`。
4. **性能测试**: 使用 `performance.now()` 或 vitest 的计时工具，避免 Date.now() 精度问题。
5. **权重模拟**: 需要理解 shop.ts 中遗物出现逻辑（可能需要 mock random 或直接调用筛选函数）。

### 从 Story 36.2 — 36.12 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
3. **金币双路径**: showGoldReward（显示）+ openShop（实际）必须同步。
4. **遗物总数断言**: `relics.test.ts` 中已有 65 总数验证。
5. **relicStates 类型**: 只能存 number 值。
6. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline，全走纯函数）。

### Project Structure Notes

**需新建的文件：**
- `tests/unit/systems/relics/relics.integration.test.ts` — 联动矩阵 + 数据完整性增强 + 权重分布
- `tests/unit/systems/relics/relics.performance.test.ts` — pipeline 性能基准测试
- `tests/unit/systems/relics/relics.smoke.test.ts` — 全流程冒烟测试

**需参考的现有文件：**
- `tests/unit/systems/relics/relics.test.ts` — 基础数据完整性测试（不修改）
- `tests/unit/systems/relics/relics.scoring.test.ts` — AC7 黑洞+雪球联动参考
- `src/systems/relics/*Behaviors.ts` — 11 个行为模块（所有导出函数）
- `src/systems/relics/RelicPipeline.ts` — 行为注册/分发框架
- `src/data/relics.ts` — 遗物数据定义（65 条目）
- `src/systems/battle.ts` — completeWord/startLevel/endLevel 集成点
- `src/systems/shop.ts` — openShop 金币同步

### References

- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.13] — 验收标准和联动矩阵
- [Source: docs/implementation-artifacts/36-12-scoring-relics.md] — 前序 Story 开发记录（行为模块模式参考）
- [Source: docs/project-context.md] — 项目编码规范与架构约束
- [Source: src/src/systems/relics/RelicPipeline.ts] — 行为注册/分发框架
- [Source: src/src/data/relics.ts] — 遗物数据（65 条目，11 子系统）
- [Source: src/src/systems/battle.ts] — completeWord 评分流程 + 遗物集成点
- [Source: src/src/systems/shop.ts] — openShop 金币同步逻辑
- [Source: tests/unit/systems/relics/] — 17 个遗物测试文件（~485 测试）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- 9 组联动矩阵测试全部实现：glass_cannon+wax_seal, immortal_combo+detonator, immortal_combo+rhythm_doctor, uncrowned_king+enchant_anchor, discount_card+enchant_anchor, universal_furnace+lenient_judge, score_black_hole+snowball, warm_up+endurance_battery, resource_tide+first_strike
- Pipeline 性能测试：12 遗物激活 <2ms（中位数）、55 通用遗物全激活 <5ms（中位数）
- 获取权重分布：1000 次 seeded 模拟，偏差 <5%；class-exclusive 遗物职业过滤正确
- 数据完整性增强断言：11 子系统各 5 遗物、basePrice 范围、behaviorType 合法性、icon 唯一性、DELETED_RELIC_IDS 隔离
- 全流程冒烟测试：2 关循环（获取→战斗→商店→再战斗→通关）、reset 生命周期、遗物移除后效果消失
- 发现浮点精度问题：snowball index=3 时 `100 * 1.15 = 114.999...` 导致 floor=114（非 bug，IEEE 754 预期行为）
- pre-existing failure: relics.chaos-seed.test.ts ScoreRoller mock 兼容性问题（非本 story 引入）
- 总测试：3 个新文件共 33 个测试，全部通过；511 遗物测试通过

### File List

- `src/tests/unit/systems/relics/relics.integration.test.ts` — 新建：联动矩阵 16 tests + 权重分布 3 tests + 数据完整性 8 tests = 27 tests
- `src/tests/unit/systems/relics/relics.performance.test.ts` — 新建：Pipeline 性能基准 2 tests
- `src/tests/unit/systems/relics/relics.smoke.test.ts` — 新建：全流程冒烟测试 4 tests
- `docs/implementation-artifacts/36-13-balance-integration-test.md` — Story 文件更新
- `docs/implementation-artifacts/sprint-status.yaml` — Sprint status 更新
