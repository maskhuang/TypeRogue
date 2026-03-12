# Story 35.7: 附魔系统 — 衍生 + 被动 + 乘算化

Status: done

## Story

As a player,
I want derivation enchantments to produce extra resources at per-resource ratios, passive enchantments to conditionally boost output by class, and the Multiply Operator enchantment to convert additive bonuses to multiplicative stacking,
so that enchantment diversity creates meaningful build variety with proper numerical calibration.

## Acceptance Criteria

1. **AC1 — 7 衍生附魔 ratio 校准**: `TRANSMUTE_RATIO_TABLE` 定义 7 种资源的衍生比率（base 30%, score 30%, multiplier 10%, time 20%, gold 20%, fragment 15%, mutagen 15%），Phase 5 衍生逻辑使用此表替代 flat 10% 默认值
2. **AC2 — 4 被动附魔已就位**: LetterAffinity(+25%), Overflow(+20%), Unstable(+30%), MutationHunger(5%) — 已在 35-3/35-4 实现，验证无误即可
3. **AC3 — 乘算化运算符**: MultiplyOperator 附魔在 Phase 3 将 Phase 2 的加算 `bonusPercent` 拆分为各项独立相乘（`Π(1+bonus_i)` 替代 `1+Σbonuses`），按资源独立校准系数
4. **AC4 — 被动职业限定**: filterEnchantmentsByClass 正确过滤 Wordsmith(Affinity/Overflow) 和 Metamorph(Unstable/Hunger) — 已在 35-5 实现，验证即可
5. **AC5 — 衍生同资源优化**: 当 `transmuteResource === skill.resource` 时，直接增强主产出为 `output × (1 + ratio)`，无需产生独立 `transmuteOutput`

## Tasks / Subtasks

- [x] Task 1: 添加 `TRANSMUTE_RATIO_TABLE` 并更新 Phase 5 衍生逻辑 (AC: #1, #5)
  - [x] 1.1 在 `affixes.ts` 中导出 `TRANSMUTE_RATIO_TABLE: Record<ResourceType, number>`（7 个资源 → 比率）
  - [x] 1.2 在 `affixTrigger.ts` Phase 5 衍生块中，替换 `ctx.transmuteRatio ?? TRANSMUTE_DEFAULT_RATIO` 为 `TRANSMUTE_RATIO_TABLE[extraResource]`
  - [x] 1.3 同资源优化：当 `extraResource === skill.resource` 时，将 `output * ratio` 加入主产出（设置 `result.transmuteSameResourceBoost`），而非生成独立 `transmuteOutput`
  - [x] 1.4 标记 `ctx.transmuteRatio` 为 `@deprecated`，保留 `ctx.transmuteResource`

- [x] Task 2: 实现 MultiplyOperator Phase 3 逻辑 (AC: #3)
  - [x] 2.1 修改 `resolvePhase2` 使其在 MultiplyOperator 存在时，返回独立的 `bonusBreakdown: number[]` 数组（每个 affix/enchantment 加算项单独记录）
  - [x] 2.2 修改 `resolvePhase3` 签名：接收可选的 `bonusBreakdown` 参数
  - [x] 2.3 在 Phase 3 末尾（替换占位注释），如果 `bonusBreakdown` 存在，将每项转为独立乘数 `output *= (1 + bonus_i * calibration)`
  - [x] 2.4 添加 `MULTIPLY_OPERATOR_CALIBRATION: Record<ResourceType, number>` 校准表（初始全 1.0）
  - [x] 2.5 Phase 2 返回 `baseOutput` 在 MultiplyOperator 模式下（不应用 `1 + bonusPercent`），由 Phase 3 乘算

- [x] Task 3: 验证已有被动附魔和职业限定 (AC: #2, #4)
  - [x] 3.1 确认 Phase 2 中 Overflow/LetterAffinity/Unstable 三个被动附魔逻辑正确
  - [x] 3.2 确认 Phase 5 中 MutationHunger 逻辑正确
  - [x] 3.3 修复 `CLASS_RESTRICTED_ENCHANTMENTS`：添加 LetterAffinity/Overflow→wordsmith, Unstable/MutationHunger→metamorph
  - [x] 3.4 确认 `filterEnchantmentsByClass` 映射完整（含学徒+被动共 6 个限定附魔）

- [x] Task 4: 编写测试 (AC: #1-#5)
  - [x] 4.1 TRANSMUTE_RATIO_TABLE 测试：验证 7 个资源的比率值 + ALL_RESOURCES 覆盖
  - [x] 4.2 Phase 5 衍生测试：multiplier(10%), fragment(15%), time(20%) 各验证一个
  - [x] 4.3 同资源衍生测试：同资源→boost, 异资源→transmuteOutput, 无附魔→0
  - [x] 4.4 MultiplyOperator Phase 2 测试：bonusBreakdown 拆分, 无附魔→空, 无 MultiplyOperator→undefined
  - [x] 4.5 MultiplyOperator Phase 3 测试：独立相乘, 加算vs乘算对比, 空breakdown, undefined
  - [x] 4.6 MultiplyOperator 校准测试：calibration=1.0 验证
  - [x] 4.7 被动附魔回归测试：Overflow/LetterAffinity/Unstable/MutationHunger 各2个正负用例
  - [x] 4.8 MultiplyOperator + 被动附魔组合测试：Overflow bonus 出现在 breakdown

## Dev Notes

### 已有实现（勿重复）

**衍生附魔 Phase 5** — `affixTrigger.ts:791-798` 已实现基础框架：
- 检查 `EnchantmentType.Transmute` → 读 `ctx.transmuteResource` + `ctx.transmuteRatio ?? TRANSMUTE_DEFAULT_RATIO`
- 产出 `result.transmuteOutput = { resource, amount: output * ratio }`
- **问题**: 使用 flat `TRANSMUTE_DEFAULT_RATIO = 0.10`，设计要求 per-resource ratio

**4 被动附魔 Phase 2** — `affixTrigger.ts:344-362` 已实现：
- Overflow (L345-348): `countSaturatedFragments() × 0.20`
- LetterAffinity (L351-354): `queueContainsLetter → +0.25`
- Unstable (L358-362): `resource === randomBonusResource → +0.30`
- MutationHunger Phase 5 (L814-819): `5% chance → mutagenOutput = 1`

**职业限定** — `affixes.ts` 的 `CLASS_RESTRICTED_ENCHANTMENTS` + `filterEnchantmentsByClass` 已在 35-5 实现

**MultiplyOperator 占位** — `affixTrigger.ts:490-491`:
```typescript
// 乘算化附魔（MultiplyOperator）— 暂为占位，具体逻辑在 Story 35.7 实现
// 此处不做处理，保留接口
```

### MultiplyOperator 设计要点

**核心概念**: 将 Phase 2 加算层的 `(1 + Σbonuses)` 改为 `Π(1 + bonus_i)`

**不带 MultiplyOperator（默认加算）:**
```
Phase 2: output = base × (1 + 0.30 + 0.20 + 0.25) = base × 1.75
Phase 3: output ×= multiply × crit × ...
```

**带 MultiplyOperator（转乘算）:**
```
Phase 2: output = base  （不应用 bonusPercent）
Phase 3: output ×= multiply × crit × ... × (1+0.30) × (1+0.20) × (1+0.25)
         = base × ... × 1.30 × 1.20 × 1.25 = base × ... × 1.95
```

乘算优势：同样的 bonus 值，乘算结果 (1.95) > 加算结果 (1.75)

**资源校准**: `MULTIPLY_OPERATOR_CALIBRATION[resource]` 缩放每项 bonus。初始可设为 1.0（无缩放），后续平衡调优。

**实现策略**:
1. Phase 2 新增返回字段 `bonusBreakdown?: number[]` — 仅 MultiplyOperator 时填充
2. Phase 2 在 MultiplyOperator 模式下 **不** 应用 `(1 + bonusPercent)`，返回 `baseOutput`
3. Phase 3 接收 `bonusBreakdown`，在末尾逐项 `output *= (1 + bonus * calibration)`
4. 若 `bonusBreakdown` 为空/undefined，Phase 3 行为不变

### 衍生 ratio 校准表（设计文档值）

| 额外资源 | ratio |
|---------|-------|
| base | 30% |
| score | 30% |
| multiplier | 10% |
| time | 20% |
| gold | 20% |
| fragment | 15% |
| mutagen | 15% |

### 同资源衍生优化

当 `extraResource === skill.resource` 时：
- 原逻辑: 产出 `transmuteOutput = { resource, amount: output * ratio }` → 系统层再加到同资源
- 优化后: 直接修改主产出，`output *= (1 + ratio)` — 省去一次额外的资源写入
- 在 result 中设标记 `transmuteSameResource: true`，不产生独立 `transmuteOutput`
- 或者直接在 Phase 5 修改 `output`（注意此时 output 已过 Phase 3，在 Phase 5 内修改需谨慎）

**推荐方案**: Phase 5 中判断同资源后，将 ratio 加到 result 中的某个字段（如 `result.transmuteBoost = ratio`），由 `triggerAffixSkill` 在最终写入时处理。或最简方案：直接在 Phase 5 将 transmuteOutput 的 resource 设为 skill.resource，系统层自然合并。

### 依赖方向（CRITICAL）

```
data (affixes.ts, affixTrigger.ts)  ← 本 Story 工作区
  ↓ 被引用
core (stateCoordinator)
  ↓ 被引用
systems (skills.ts, battle.ts)      ← 调用 transmute 和 operator 相关函数
```

- `affixTrigger.ts` **不得**导入 core 或 systems 层模块
- `affixes.ts` 仅含类型和常量，无逻辑
- Phase 2 / Phase 3 签名可扩展，但需保持向后兼容

### Project Structure Notes

- 附魔类型定义: `src/data/affixes.ts` — EnchantmentType 枚举（已含 Transmute, LetterAffinity, Overflow, Unstable, MutationHunger, MultiplyOperator）
- 触发流水线: `src/data/affixTrigger.ts` — resolvePhase1~6、TRANSMUTE_DEFAULT_RATIO、TriggerContext
- 单元测试: `tests/unit/data/affixTrigger.test.ts`（当前 216 测试通过）
- 被动附魔常量: `affixes.ts` — CLASS_RESTRICTED_ENCHANTMENTS, filterEnchantmentsByClass

### References

- [Source: docs/design/affix-skill-system.md#衍生附魔（7 个）] — 衍生比率设计表
- [Source: docs/design/affix-skill-system.md#被动附魔（职业限定，4 个）] — 被动参数表
- [Source: docs/design/affix-skill-system.md#运算符附魔（1 个）] — 乘算化描述
- [Source: docs/design/affix-skill-system.md#Phase 3: 乘算层] — 乘算化在流水线中的位置
- [Source: docs/design/affix-skill-system.md#十三、加算 vs 乘算分界线] — 加算/乘算分类表
- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.7] — 验收标准原文
- [Source: docs/implementation-artifacts/35-5-enchantment-splash-apprentice.md] — 学徒附魔模式参考
- [Source: docs/implementation-artifacts/35-6-enchantment-quest-18.md] — 任务附魔模式参考
- [Source: docs/project-context.md#Skill System Rules] — 依赖方向和架构规则

### Previous Story Intelligence (from 35-5 / 35-6)

- **Phase 2 去重经验**: 35-5 修复了多附魔重复计算 bonusPercent 问题（H1）。MultiplyOperator 的 bonusBreakdown 需要精确追踪每个 bonus 来源，避免类似重复
- **wordCompleted 信号**: `ctx.wordCompleted === true` 必须显式设置，不要依赖 `ctx.currentWord != null`
- **Action Descriptor Pattern**: Phase 4-6 返回数据描述符，由系统层执行。transmute 的 `transmuteOutput` 遵循此模式
- **Pure Function Boundary**: affixTrigger 所有函数必须是纯函数（仅修改 runtimeState 参数），不可引入系统层副作用
- **数值校验**: 务必与设计文档交叉验证所有硬编码数值（35-5 发现 growth 值不匹配设计文档）
- **Test Helpers**: 使用 `makeSkill()` + `makeContext()` + `makeRuntimeState()` + `makeFlags()`
- **resolveMirrorCopy 参数完整性教训**: 35-6 review 发现 8 个数值参数遗漏。任何遍历 AffixInstance 字段的逻辑都要检查完整性

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- **TRANSMUTE_RATIO_TABLE**: 7 资源 per-resource ratio（30%/30%/10%/20%/20%/15%/15%），替换 flat 10% 默认值
- **同资源衍生优化**: `transmuteSameResourceBoost` 字段避免产生独立 `transmuteOutput`
- **MultiplyOperator**: Phase 2 `track()` 追踪各加算项 delta → `bonusBreakdown[]`，Phase 3 逐项 `output *= (1 + bonus * calibration)`
- **Phase 2 模式切换**: `hasMultOp` → output 返回 `baseOutput`（不乘 bonusPercent），breakdown 传入 Phase 3
- **职业限定修复**: `CLASS_RESTRICTED_ENCHANTMENTS` 新增 LetterAffinity/Overflow→wordsmith, Unstable/MutationHunger→metamorph
- **测试**: 28 个新测试（9 describe 块），245 总通过

### Senior Developer Review

**Reviewer**: Claude Opus 4.6 (adversarial review)

**Findings (6 total: 1H, 3M, 2L) — all HIGH/MEDIUM fixed:**

1. **H1 — TRANSMUTE_DEFAULT_RATIO 死代码** (FIXED): 移除不再使用的 `TRANSMUTE_DEFAULT_RATIO` 导出
2. **M1 — track() 调用结构脆弱** (FIXED): 将被动附魔 track() 调用移入对应 enchantment 类型判断块内，消除条件与追踪的分离
3. **M2 — 缺少非 1.0 calibration 测试** (FIXED): 新增测试用临时 patch calibration=0.8 验证缩放逻辑
4. **M3 — bonusPercent 语义歧义** (FIXED): 添加注释说明 MultiplyOperator 模式下 bonusPercent 仅作信息参考
5. **L1 — transmuteSameResourceBoost 缺少消费说明** (FIXED): 添加 JSDoc `由 35-9 shop-integration 消费`
6. **L2 — CLASS_RESTRICTED_ENCHANTMENTS 集成测试不足** (ACCEPTED): 现有测试覆盖数据正确性，跨类过滤集成测试优先级低

### Change Log

- 2026-03-11: Story 35-7 实现完成 — TRANSMUTE_RATIO_TABLE + 同资源优化 + MultiplyOperator + 被动职业限定修复 + 27 新测试
- 2026-03-11: Code review 修复 — 移除 TRANSMUTE_DEFAULT_RATIO 死代码; 重构 track() 调用结构; 添加非 1.0 calibration 测试; 添加 bonusPercent 语义注释; 添加 transmuteSameResourceBoost TODO 注释

### File List

- **`src/src/data/affixes.ts`** — Modified: 添加 TRANSMUTE_RATIO_TABLE(7资源), MULTIPLY_OPERATOR_CALIBRATION(7资源, 全1.0), CLASS_RESTRICTED_ENCHANTMENTS 扩充(+4 被动附魔)
- **`src/src/data/affixTrigger.ts`** — Modified: Phase 5 衍生 per-resource ratio + 同资源 transmuteSameResourceBoost; Phase 2 bonusBreakdown 追踪(track helper); Phase 3 MultiplyOperator 逐项乘算; Phase5Result 新增字段; ctx.transmuteRatio @deprecated
- **`src/tests/unit/data/affixTrigger.test.ts`** — Modified: 更新 3 旧衍生测试 + 新增 27 测试(ratio table/per-resource/same-resource/MultiplyOperator P2+P3/passive regression/class restriction)
