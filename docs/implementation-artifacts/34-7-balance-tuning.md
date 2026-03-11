# Story 34.7: 数值平衡与调优

Status: done

## Story

As a 玩家,
I want 新机制产出者和乘算化附魔的数值平衡合理，各关卡阶段通关难度适中,
so that 每种机制都有使用价值，Build 多样性高，不会因数值失衡导致某些路线碾压或无法通关.

## Acceptance Criteria

1. **AC1 — 标准关无乘算可达:** 标准关（30s）无乘算附魔时，前 3 关目标分数可通过合理打字达成（60 WPM 基准）
2. **AC2 — 精英/Boss 可通关:** 精英关（45s）和 Boss 关（60s）在合理技能配置（3-5 个产出者 + 2-3 个转化者）下可通关
3. **AC3 — 乘算附魔数量控制:** 平均一局获得 2-3 个 `ench_multiply` 附魔，不超过 5 个（验证抽取概率）
4. **AC4 — 同源转化者累积上限:** 同源转化者在 Boss 关（60s，高频键 50-60 次触发）的累积产出不超过基础值 ×10
5. **AC5 — 新机制产出者中期产出:** 新机制产出者在中期（4-6 关）的平均产出与 standard 加算产出者差距在 ±50% 以内
6. **AC6 — 蓄力低频键表现:** 蓄力产出者在低频键位（Z/Q/X）上的表现合理 — 长时间蓄力→高爆发，单次 ≤ base×(1+maxBonus)
7. **AC7 — 衰减高频键表现:** 衰减产出者在高频键位（E/T/A）上的表现合理 — 快速衰减到 floor，首词输出高、后续稳定
8. **AC8 — 参数调优落地:** 根据测试结果调整各机制数值参数，所有改动有测试验证

## Tasks / Subtasks

- [x] **Task 1: 数值模拟测试框架** (AC: 1,2,5)
  - [x] 1.1 在 `tests/unit/systems/balance-tuning.test.ts` 中创建模拟框架：给定绑定技能列表 + 打字速率 + 关卡时长，模拟单关产出
  - [x] 1.2 模拟器需要：调用 `triggerProducer()` 的核心计算逻辑（不依赖 DOM），累积资源产出
  - [x] 1.3 辅助函数 `simulateStage(config)` 返回 `{ totalScore, totalBase, totalMult, resourceBreakdown }`

- [x] **Task 2: AC1 — 标准关无乘算达标验证** (AC: 1)
  - [x] 2.1 测试前 3 关（level 1/2/3 standard，30s），使用 3 个 standard 产出者（base/score/multiplier），60 WPM ≈ 每秒 5 字，每词 4-5 次触发
  - [x] 2.2 计算目标分数 `80 + level×40 + level²×5`（level 1=125, 2=190, 3=275）
  - [x] 2.3 验证模拟产出 ≥ 目标分数，若不足则调整 `baseValues` 或目标分公式
  - [x] 2.4 同时验证 charge/decay/pulse/crit 产出者各自能否达标（void 跳过 — 依赖键盘拓扑布局）

- [x] **Task 3: AC2 — 精英/Boss 通关验证** (AC: 2)
  - [x] 3.1 测试 elite 关（45s, 目标×1.3）和 boss 关（60s, 目标×1.5），使用 5 个产出者 + 3 个转化者配置
  - [x] 3.2 验证合理配置（含 1 个乘算化附魔）能达标
  - [x] 3.3 若不达标，调整 elite/boss 目标分倍率或时间

- [x] **Task 4: AC3 — 乘算附魔频率验证** (AC: 3)
  - [x] 4.1 验证 `ench_multiply` 存在于 ENCHANTMENTS 且为 operator 类型
  - [x] 4.2 验证附魔池中 ench_multiply 占比合理（1/总数 → 每次抽取概率 ~2-5%）
  - [x] 4.3 附魔频率由概率控制，无需调整权重

- [x] **Task 5: AC4 — 同源转化者累积验证** (AC: 4)
  - [x] 5.1 测试 Boss 关（60s），单个同源转化者（如 conv_base_base_add, k=0.03）在高频键（60 次触发）下的累积产出
  - [x] 5.2 验证累积不超过 initialSourceVal×10
  - [x] 5.3 测试 base/score/mult/gold 四种同源转化者（time 已禁用，fragment/mutagen 需 classResourceProduced 前置）
  - [x] **调优: conv_mult_mult_add k 值从 0.15 降至 0.03** — 原值导致指数爆炸（60 次触发累积 6574，远超上限 15）

- [x] **Task 6: AC5 — 新机制中期产出对比** (AC: 5)
  - [x] 6.1 测试中期（level 5, standard 30s），分别使用 standard/charge/decay/pulse/crit 产出者（base resource），对比单关总产出
  - [x] 6.2 验证各机制产出与 standard 差距在 ±50% 以内
  - [x] 6.3 所有机制产出均在合理范围内，无需调整

- [x] **Task 7: AC6+AC7 — 蓄力/衰减键频特性验证** (AC: 6,7)
  - [x] 7.1 测试蓄力产出者在低频键（每 10s 触发 1 次）和高频键（每 1s 触发 1 次）的表现
  - [x] 7.2 低频键蓄力：`gainPerSec×10s = 80%` 加成，值 ≤ base×(1+maxBonus)；高频键蓄力：接近无加成
  - [x] 7.3 测试衰减产出者在高频键（12 次触发）和低频键（2 次触发）的表现
  - [x] 7.4 高频键衰减：首次 ×2.0 快速衰减到 ×0.5；低频键衰减：维持高倍率

- [x] **Task 8: AC8 — 参数调优与回归** (AC: 8)
  - [x] 8.1 汇总 Task 2-7 的测试结果，确定需要调整的参数
  - [x] 8.2 在 `converters.ts` 中修改 conv_mult_mult_add k 值（0.15→0.03）
  - [x] 8.3 重跑所有平衡测试，33/33 通过
  - [x] 8.4 运行现有测试套件，无新增回归（pre-existing failures 与本 Story 无关）

## Dev Notes

### ⚠️ 时间资源已禁用

当前时间（time）资源相关内容已通过 3 个 blacklist 临时禁用（commit aad6788）：
- **技能**: `ClassResourceFilter.ts` 中 `DISABLED_RESOURCES = new Set(['time'])`，所有 time 资源产出者/转化者被过滤
- **遗物**: `relicPicker.ts` 中 `DISABLED_RELICS = new Set(['time_thief', 'doomsday', 'perfect_rhythm'])`
- **附魔**: `enchantments.ts` 中 `DISABLED_ENCHANTMENTS = new Set(['ench_trans_time'])`

**本 Story 范围决策：** 不涉及时间资源的重新启用。平衡测试跳过 time 资源产出者/转化者。时间资源的重新平衡留给后续 Epic。

### 当前数值基线

**产出者基础值 (Lv1/2/3):**

| 资源 | Lv1 | Lv2 | Lv3 |
|------|-----|-----|-----|
| base | 5 | 8 | 12 |
| score | 15 | 24 | 36 |
| multiplier | 0.2 | 0.32 | 0.48 |
| gold | 3 | 5 | 8 |
| fragment | 1 | 1.6 | 2.4 |
| mutagen | 1 | 1.6 | 2.4 |

**机制参数:**

| 机制 | 参数 | 当前值 |
|------|------|--------|
| charge | gainPerSec / maxBonus | 0.08 / 2.0 |
| decay | initialMult / decayPerTrigger / floor | 2.0 / 0.15 / 0.5 |
| pulse | interval / burstMult | 4 / 3.0 |
| crit | chance / critMult | 0.5 / 2.0 |
| void | bonusPerSlot | 0.05~0.50（按 PositionRelation） |

**同源转化者 k 值:**

| 资源 | k (Lv1) | 说明 |
|------|---------|------|
| base→base | 0.03 | 读 synergy.skillBaseScore |
| score→score | 0.0008 | 读 resources.score（关卡累积） |
| mult→mult | 0.15 | 读当前 multiplier |
| gold→gold | 0.005 | 读当前 gold |
| fragment→fragment | 0.03 | 读 classResourceProduced |
| mutagen→mutagen | 0.03 | 读 classResourceProduced |

**目标分公式:** `base = 80 + level×40 + level²×5`, elite ×1.3, boss ×1.5

**商店产出者机制权重:** standard=10, charge/decay/pulse/crit=8, void=4

### 关键代码位置

| 组件 | 文件 | 位置 |
|------|------|------|
| 产出者数据 & baseValues | `src/data/producers.ts` | BASE_VALUES, PRODUCERS |
| 产出者触发计算 | `src/systems/skills.ts` | `triggerProducer()` |
| 蓄力 tick 更新 | `src/systems/skills.ts` | `updateChargeProducers()` |
| 转化者数据 & k 值 | `src/data/converters.ts` | CONVERTERS |
| 转化者触发 | `src/systems/skills.ts` | `triggerConverter()` |
| 目标分计算 | `src/systems/stage/stageFlow.ts` | target score formula |
| 关卡时长 | `src/systems/stage/stageFlow.ts` | STAGE_TIMES / node定义 |
| 附魔抽取 | `src/data/enchantments.ts` | `drawEnchantmentPair()` |
| 商店机制权重 | `src/systems/shop.ts` | `PRODUCER_MECHANIC_WEIGHTS` |
| 时间禁用 | `src/systems/classes/ClassResourceFilter.ts` | DISABLED_RESOURCES |

### 前置 Story 关键成果

**34.1:** 70 个新机制产出者 + ChargeParams/DecayParams/PulseParams/CritParams/VoidParams 类型
**34.2:** ench_multiply 附魔 + 乘算化映射表（multiplyValues）
**34.3:** 移除 37 个乘算转化者，仅保留 37+7=44 个 add 转化者
**34.4:** 7 个同源转化者 + k 值校准表 + 同源权重独立调低（×3 vs 异源 ×10）
**34.5:** 产出者机制分桶加权 (PRODUCER_MECHANIC_WEIGHTS) + 转化者池扩容
**34.6:** 商店 UI 机制 badge/角标/边框 + 战斗弹窗 mechanicText + buildMechanicInfo()

### 34.6 代码审查经验

- **行为测试优先**: 不用 `fs.readFileSync` 做源码字符串匹配，用函数调用验证输出
- **类型安全**: 使用 `ChargeParams`/`DecayParams` 等具体类型，不用 `as any`
- **导出复用**: 不重复定义常量（如 RELATION_LABELS），从源头导出

### 模拟器设计思路

平衡测试不需要 DOM 或完整游戏循环。核心逻辑在 `triggerProducer()` 和 `triggerConverter()` 中，可提取纯计算路径：

```typescript
// 模拟一次产出者触发（不含 DOM 操作）
function simulateProducerTrigger(
  producerId: string,
  level: number,
  state: SimState  // 精简的状态对象
): { resource: string; value: number; isCrit?: boolean }

// 模拟一关的总产出
function simulateStage(config: {
  bindings: Map<string, string>;  // key → skillId
  typingWpm: number;
  durationSec: number;
  level: number;
}): SimResult
```

注意 `triggerProducer()` 耦合了 DOM 操作（`showTriggerPopup`、`emitResourceSound`），模拟器需要绕过这些副作用。两种方案：
1. **提取纯计算函数**: 将数值计算与副作用分离，直接测试纯函数
2. **Mock DOM**: 使用 vitest mock 屏蔽 DOM 调用

推荐方案 1 —— 更干净，但如果改动太大可用方案 2。

### 不在本 Story 范围内

- ❌ 时间资源重新启用/平衡（后续 Epic）
- ❌ 新增技能/附魔/遗物
- ❌ UI 改动（34.6 已完成）
- ❌ 音效改动
- ❌ 无尽模式/循环 2+ 的平衡（仅验证循环 1）

### Project Structure Notes

- 测试文件位于 `tests/unit/systems/balance-tuning.test.ts`
- 数据修改集中在 `src/data/producers.ts`（mechanicParams）和 `src/data/converters.ts`（k 值）
- 依赖方向：`tests/ → data/ + systems/`，符合项目规则
- 所有参数改动都应有对应测试断言锁定

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.7 — 验收标准]
- [Source: src/src/data/producers.ts — BASE_VALUES, PRODUCERS, mechanicParams]
- [Source: src/src/data/converters.ts — CONVERTERS, k values]
- [Source: src/src/systems/skills.ts — triggerProducer(), triggerConverter()]
- [Source: src/src/systems/stage/stageFlow.ts — target score formula]
- [Source: src/src/data/enchantments.ts — drawEnchantmentPair(), ench_multiply]
- [Source: src/src/systems/shop.ts — PRODUCER_MECHANIC_WEIGHTS]
- [Source: docs/project-context.md — 性能预算, 代码组织规则]
- [Source: docs/implementation-artifacts/34-6-ui-enchantment-display.md — 代码审查经验]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

1. **模拟框架**: 纯计算模拟器（SimState + simulateProducerTrigger + simulateConverterTrigger + simulateChargeTick + simulateStage），不依赖 DOM，直接提取 triggerProducer/triggerConverter 的核心数值逻辑
2. **暴击期望值**: 平衡测试用 `chance * critMult + (1-chance)` 替代随机，确保测试确定性
3. **conv_mult_mult_add 调优**: k 值从 0.15 降至 0.03。原值在 Boss 关 60 次触发下产生指数爆炸（累积 6574，远超上限 15）。新值 0.03 与 conv_base_base_add 一致，60 次触发累积约 7.3，安全在上限以下
4. **衰减测试迭代数**: 从 10 增至 12，因为 (2.0-0.5)/0.15=10 次衰减后第 11 次触发才输出 floor 值
5. **void 产出者跳过单独达标测试**: 因依赖键盘拓扑布局和绑定状态，在 simulateStage 集成测试中覆盖
6. **时间资源跳过**: 所有 time 资源相关产出者/转化者已禁用，平衡测试不涉及

### File List

- `src/tests/unit/systems/balance-tuning.test.ts` — 新建：33 个平衡测试（模拟框架 + AC1-AC8）
- `src/src/data/converters.ts` — 修改：conv_mult_mult_add k 值 0.15→0.03
- `docs/implementation-artifacts/sprint-status.yaml` — 修改：34-7 状态更新

### Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2026-03-11 | 创建 balance-tuning.test.ts 模拟框架 + 33 个测试 | Task 1-8 实现 |
| 2026-03-11 | conv_mult_mult_add k 从 0.15 降至 0.03 | AC4: 同源转化者指数爆炸修复 |
| 2026-03-11 | Code Review 修复 — H1: prod_focus/prod_tempo→prod_boost; H2: score 源值公式修正; M1: AC3 测试描述诚实化; M2: 得分公式简化说明; M3: File List 路径修正; L1: 删除死代码块; L2: 删除误导注释 | 代码审查自动修复 |

### Senior Developer Review (AI)

**Reviewer:** Yuchenghuang on 2026-03-11
**Outcome:** Approved (after fixes)
**Issues Found:** 2 HIGH, 3 MEDIUM, 3 LOW — all fixed automatically

**Fixed:**
- H1: 不存在的产出者 ID（prod_focus/prod_tempo）→ 替换为 prod_boost
- H2: score 源值双重计算 → 修正为 `resources.score + base * multiplier`
- M1: AC3 测试名称诚实描述（概率分析而非完整模拟）
- M2: calculateFinalScore 添加简化说明注释
- M3: File List 路径修正 + 补充 sprint-status.yaml
- L1: 删除空的 decay 每词重置代码块
- L2: 删除 prod_focus 误导性注释
