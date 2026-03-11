# Story 34.5: 商店/技能池再平衡

Status: done

## Story

As a 玩家,
I want 商店刷出的技能按机制类型加权分布、虚无产出者不淹没其他机制、附魔池包含乘算化选项,
so that 每次商店刷新都能看到多样化的技能选择，Build 构建更有深度.

## Acceptance Criteria

1. **AC1 — 产出者机制分组加权:** 商店产出者桶内部按机制类型分组加权抽取（standard/charge/decay/pulse/crit/void 各组权重可配）
2. **AC2 — 虚无产出者独立权重:** 42 个虚无产出者（7 资源 × 6 PositionRelation）使用独立调低的组权重，不淹没其他机制
3. **AC3 — 商店刷新品类多样:** 单次商店刷新展示的技能不全是同一机制（至少 2 种不同机制，如果产出者 ≥2 个）
4. **AC4 — 转化者池数量调整:** `drawConverterPool()` 的默认抽取数量从 20 调整为适合 45 个 add 转化者的数量（建议 22~25）
5. **AC5 — 附魔池包含 ench_multiply:** `drawEnchantmentPair()` 已能抽到 ench_multiply（34.2 已加入 ENCHANTMENTS），验证权重与空间型附魔持平（当前均匀分布，无需改动，仅需测试确认）
6. **AC6 — 职业资源产出者门控:** fragment/mutagen 产出者仅对应职业可见（现有 `isResourceActiveForClass` 逻辑已覆盖，需验证新机制产出者也被正确过滤）

## Tasks / Subtasks

- [x] **Task 1: 定义产出者机制分组权重常量** (AC: 1, 2)
  - [x] 1.1 在 `systems/shop.ts` 新增 `PRODUCER_MECHANIC_WEIGHTS` 常量，按机制分组定义权重
  - [x] 1.2 权重建议值：standard 10、charge 8、decay 8、pulse 8、crit 8、void 4（虚无调低，因为 42 个变体远多于其他组的 7 个）
  - [x] 1.3 导出常量供测试使用

- [x] **Task 2: 实现产出者机制分桶加权抽取** (AC: 1, 2, 3)
  - [x] 2.1 在 `generateShopItems()` 中，将 producerBucket 按机制类型分为 6 个子桶
  - [x] 2.2 实现子桶加权抽取：roll 命中某机制组 → 从该组 shuffle 后的子桶取出 1 个
  - [x] 2.3 抽取时如果命中的子桶为空，fallback 到下一个非空子桶
  - [x] 2.4 确保 fragment/mutagen 产出者的职业过滤在子桶构建前已执行（复用现有 `isResourceActiveForClass` 过滤）

- [x] **Task 3: 商店品类多样性保证** (AC: 3)
  - [x] 3.1 在预抽 `count * SKILL_POOL_MULTIPLIER` 个技能后，检查 producer 商品的机制分布
  - [x] 3.2 如果所有 producer 商品都是同一机制，替换最后一个为不同机制的产出者
  - [x] 3.3 仅对 producer 类型商品做此检查（converter/connector 等本身就是不同类型）

- [x] **Task 4: 调整转化者池抽取数量** (AC: 4)
  - [x] 4.1 修改 `drawConverterPool()` 默认参数从 20 → 23（45 个中抽 ~51%，与旧比例 31/74≈42% 相近但略高以补偿加权稀释）
  - [x] 4.2 更新 `core/types.ts` 注释：converterPool 从 "45 抽 20" 更新为 "45 抽 23"
  - [x] 4.3 测试 drawConverterPool 在新默认值下仍能正常运行且不超出总数

- [x] **Task 5: 验证附魔池 ench_multiply** (AC: 5)
  - [x] 5.1 确认 `drawEnchantmentPair()` 的过滤逻辑不会排除 ench_multiply（当前 category='operator' 不是 'spatial' 也不是 'class-exclusive'，应通过所有 filter）
  - [x] 5.2 新增测试：验证 ench_multiply 存在于 ENCHANTMENTS 且 category='operator' 不被排除
  - [x] 5.3 确认 ench_multiply 在无 skillRelation 参数时和有参数时都能被抽到（源码验证 filter 无 'operator' 排除逻辑）

- [x] **Task 6: 验证职业资源产出者门控** (AC: 6)
  - [x] 6.1 确认新机制产出者（charge/decay/pulse/crit/void 的 fragment/mutagen 变体）被 `isResourceActiveForClass` 正确过滤
  - [x] 6.2 新增测试：wordsmith 职业不会看到 mutagen 产出者、metamorph 职业不会看到 fragment 产出者（覆盖各机制类型）

- [x] **Task 7: 更新测试** (AC: 1-6)
  - [x] 7.1 shop 测试：`PRODUCER_MECHANIC_WEIGHTS` 常量导出验证
  - [x] 7.2 shop 测试：产出者机制分桶正确性（每个子桶只包含对应机制的产出者）
  - [x] 7.3 shop 测试：加权抽取后，虚无产出者权重密度远低于其他机制（密度比 >10×）
  - [x] 7.4 shop 测试：品类多样性保证（源码验证 mechanics.size === 1 检查 + altProducer 替换）
  - [x] 7.5 converters 测试：drawConverterPool 默认数量更新（20→23）
  - [x] 7.6 enchantments 测试：drawEnchantmentPair 可抽到 ench_multiply（源码验证无 'operator' 排除）
  - [x] 7.7 shop 测试：职业资源过滤覆盖新机制产出者（charge/decay/pulse/crit 的 fragment/mutagen + 虚无的 6 个变体）

## Dev Notes

### 核心问题

重构前 14 个产出者，商店 flat shuffle 足够。重构后 77 个产出者（42 个虚无），flat shuffle 会导致虚无产出者占据 ~55% 的出现率，其他 5 种机制总计只占 ~45%。需要按机制分组加权。

### 产出者机制分组（CRITICAL）

| 机制 | 数量 | 权重建议 | 有效权重密度 |
|------|------|---------|------------|
| standard | 7 | 10 | 10/7 ≈ 1.43/个 |
| charge | 7 | 8 | 8/7 ≈ 1.14/个 |
| decay | 7 | 8 | 8/7 ≈ 1.14/个 |
| pulse | 7 | 8 | 8/7 ≈ 1.14/个 |
| crit | 7 | 8 | 8/7 ≈ 1.14/个 |
| void | 42 | 4 | 4/42 ≈ 0.10/个 |

权重含义：组级权重决定 roll 到该组的概率。组内均匀 shuffle。虚无组权重 4 → 组出现概率 4/(10+8×4+4) ≈ 8.5%，但组内 42 个变体 → 每个虚无产出者的个体出现概率极低，保证不淹没。

### 产出者机制判定方法

产出者 ID 包含机制前缀，可通过 ID 模式匹配：
```
prod_charge_*  → charge
prod_decay_*   → decay
prod_pulse_*   → pulse
prod_crit_*    → crit（注意：暴击产出者是 prod_crit_*，非旧 prod_crit）
prod_void_*    → void
其余（prod_burst/prod_loot/prod_boost/prod_freeze/prod_mint/prod_harvest/prod_mutagen_drip） → standard
```

或者在 `data/producers.ts` 的 `ProducerDefinition` 中已有 `mechanic` 字段可直接读取。需确认：检查 ProducerDefinition 是否有 `mechanic` 字段，如果没有则需新增或使用 ID 前缀判断。

### 实现方案：产出者子桶加权

```typescript
// shop.ts 新增常量
export const PRODUCER_MECHANIC_WEIGHTS: Record<string, number> = {
  standard: 10, charge: 8, decay: 8, pulse: 8, crit: 8, void: 4,
};

// generateShopItems() 内部替换 producerBucket 逻辑
function mechanicWeightedProducerPick(
  producers: string[],
  weights: Record<string, number>
): string | null {
  // 1. 按机制分桶
  const buckets: Record<string, string[]> = {};
  for (const id of producers) {
    const mech = getProducerMechanic(id); // 'standard'|'charge'|'decay'|'pulse'|'crit'|'void'
    if (!buckets[mech]) buckets[mech] = [];
    buckets[mech].push(id);
  }
  // 2. 过滤非空桶并计算权重
  const entries = Object.entries(buckets).filter(([, arr]) => arr.length > 0);
  const totalW = entries.reduce((s, [m]) => s + (weights[m] || 1), 0);
  // 3. Roll
  const roll = random() * totalW;
  let acc = 0;
  for (const [mech, arr] of entries) {
    acc += weights[mech] || 1;
    if (roll < acc) {
      const idx = Math.floor(random() * arr.length);
      return arr.splice(idx, 1)[0];
    }
  }
  // fallback
  if (entries.length > 0) {
    const [, arr] = entries[0];
    return arr.splice(0, 1)[0];
  }
  return null;
}
```

### 商店中 weightedPick() 改动范围

当前 `weightedPick()` 在 shop.ts L259-278 从 `producerBucket`（flat shuffle 后的数组）中 `.shift()` 取出。改动方案：

**方案 A：保留 weightedPick() 的 type-level 分桶，在 producerBucket 构建阶段按机制加权排序**
- 在 producerBucket 构建时，不用 flat shuffle，而是用加权 interleave
- 优点：weightedPick() 无需改动
- 缺点：加权排序逻辑复杂

**方案 B：将 producerBucket 替换为函数式抽取**
- producerBucket 不再是数组，而是一个 `() => string | null` 的抽取函数
- weightedPick() 内调用该函数代替 `.shift()`
- 优点：关注点分离清晰
- 缺点：需改 weightedPick() 签名

**推荐方案 A：** 在 L252 处用机制加权预排序替换 `shuffleArray(unowned.filter(id => isProducer(id)))`：

```typescript
// 替换 L252:
// const producerBucket = shuffleArray(unowned.filter(id => isProducer(id)));
const producerBucket = buildMechanicWeightedBucket(
  unowned.filter(id => isProducer(id)),
  PRODUCER_MECHANIC_WEIGHTS
);
```

`buildMechanicWeightedBucket()` 返回按加权 interleave 排列的数组，weightedPick() 的 `.shift()` 自然获得加权效果。

### 转化者池数量调整

当前：45 个转化者，drawConverterPool 默认抽 20 个。
旧系统：74 个转化者，drawConverterPool 抽 31 个（31/74 ≈ 42%）。

如果维持 ~42% 抽取比例：45 × 0.42 ≈ 19（偏少）。
考虑到加权抽取（同源权重 3 vs 异源权重 10）会稀释池容量，建议提高到 23 个（45 × 0.51），给玩家足够的转化者选择。

### 附魔池验证

`drawEnchantmentPair()` 的过滤逻辑（enchantments.ts L136-155）：
1. 过滤 class-exclusive → ench_multiply 的 category 是 'operator'，不被过滤
2. 过滤 spatial 类的 positionRelation → ench_multiply 不是 spatial，不被过滤
3. 所有非 spatial、非 class-exclusive 的附魔均可被抽到

结论：ench_multiply 已在池中，均匀分布（无权重），与其他非空间型附魔持平。只需测试确认即可。

### 不改动现有 ACT_SKILL_WEIGHTS

ACT_SKILL_WEIGHTS 控制的是 producer/converter/connector/replicator/amplifier 五大类的权重，本 Story 不调整这些值。机制加权仅在 producer 类内部细分。

### 关键代码位置

| 组件 | 文件 | 行号/函数 |
|------|------|----------|
| ACT_SKILL_WEIGHTS | `src/src/systems/shop.ts` | L48-52 |
| generateShopItems() | `src/src/systems/shop.ts` | L213-387 |
| weightedPick() | `src/src/systems/shop.ts` | L259-278 |
| producerBucket 构建 | `src/src/systems/shop.ts` | L252（改动点） |
| PRODUCERS | `src/src/data/producers.ts` | 全文（77 个定义） |
| drawConverterPool() | `src/src/data/converters.ts` | L75-83（改默认参数） |
| drawEnchantmentPair() | `src/src/data/enchantments.ts` | L136-155（验证） |
| isResourceActiveForClass | `src/src/systems/classes/ClassResourceFilter.ts` | L22-26 |
| converterPool 类型注释 | `src/src/core/types.ts` | L189 |
| 商店测试 | `src/tests/unit/systems/shop-act-weight.test.ts` | 现有测试 |

### 不在本 Story 范围内

- ❌ ACT_SKILL_WEIGHTS 五大类权重调整（如果需要另开 Story）
- ❌ 附魔抽取加权系统（当前均匀分布够用，ench_multiply 已在池中）
- ❌ UI 变更（Story 34.6 负责）
- ❌ 数值平衡调优（Story 34.7 负责）
- ❌ 新增附魔类型

### 前置 Story 的关键成果

**34.1:** 新增 70 个机制产出者（charge/decay/pulse/crit/void），ProducerDefinition 可能已包含 mechanic 字段
**34.2:** ench_multiply 附魔加入 ENCHANTMENTS，drawEnchantmentPair 可以抽到
**34.3:** 移除 37 个乘算转化者，converterPool 改为 37 → 34.4 进一步扩充到 45
**34.4:** 7 个同源转化者 + 加权 drawConverterPool（同源 3 vs 异源 10），默认抽 20

### Project Structure Notes

- 新增/改动代码在 `systems/shop.ts`（产出者分桶逻辑）和 `data/converters.ts`（默认参数）
- 可能需要在 `data/producers.ts` 新增 `getProducerMechanic()` 工具函数（如果 mechanic 字段不存在）
- 测试文件：`tests/unit/systems/shop-act-weight.test.ts`（扩展）+ 可能新建 `tests/unit/systems/shop-producer-weight.test.ts`
- 依赖方向：`data → core → systems → scenes`，shop.ts 在 systems 层可引用 data 层的 producers

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.5 — 验收标准]
- [Source: docs/design/affix-skill-system.md#权重表 — 虚无权重 10、蓄力/衰减/脉冲权重 6、暴击权重 8]
- [Source: src/src/systems/shop.ts L48-52 — ACT_SKILL_WEIGHTS]
- [Source: src/src/systems/shop.ts L213-387 — generateShopItems() 完整逻辑]
- [Source: src/src/systems/shop.ts L252 — producerBucket flat shuffle（改动点）]
- [Source: src/src/systems/shop.ts L259-278 — weightedPick() 累积权重 roll]
- [Source: src/src/data/producers.ts — 77 个产出者定义（7+7+7+7+7+42）]
- [Source: src/src/data/converters.ts L75-83 — drawConverterPool 加权抽取]
- [Source: src/src/data/enchantments.ts L136-155 — drawEnchantmentPair 均匀抽取]
- [Source: src/src/systems/classes/ClassResourceFilter.ts — fragment/mutagen 职业门控]
- [Source: docs/implementation-artifacts/34-4-self-resource-convert-transmute.md — 前置 Story 完成记录]
- [Source: docs/project-context.md#Skill System Rules — 技能分类与数量]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Added `PRODUCER_MECHANIC_WEIGHTS` constant to shop.ts with weights: standard 10, charge 8, decay 8, pulse 8, crit 8, void 4. Exported for test access.
- Task 2: Implemented `buildMechanicWeightedBucket()` in shop.ts — groups producers by mechanic (via `getProducerMechanic()` from producers.ts), shuffles each sub-bucket, then weighted-interleaves using PRODUCER_MECHANIC_WEIGHTS. Replaced flat `shuffleArray` producerBucket construction. weightedPick() unchanged (still uses `.shift()`).
- Task 3: Added variety check after skill pool generation — if all producer items share the same mechanic, replaces the last producer item with one from a different mechanic group using `findLastIndex` + `producerBucket.findIndex`+`splice` (review fix: properly removes replaced item from bucket).
- Task 4: Changed `drawConverterPool()` default from 20 → 23 (45 × 51%). Updated types.ts comment. Tests verify default=23, custom counts, and upper bound.
- Task 5: Verified ench_multiply (category='operator') passes all filters in drawEnchantmentPair(). No code changes needed — only test verification via source code analysis.
- Task 6: Verified isResourceActiveForClass correctly gates fragment/mutagen producers across all mechanic types. Tests confirm charge/decay/pulse/crit fragment/mutagen producers exist and that filtering works bidirectionally.
- Task 7: Created `shop-producer-mechanic.test.ts` with 32 tests covering: constant export/validation, mechanic identification (getProducerMechanic for all types), buildMechanicWeightedBucket behavioral tests (output length, bijection, void suppression, edge cases), variety check logic, converter pool default, ench_multiply availability, class resource filtering for all mechanic variants, and weight density analysis. Updated `converters.test.ts` default expectation 20→23. All 88 tests pass (32 new + 56 converter).
- Code Review Fixes: (1) Exported buildMechanicWeightedBucket and replaced source-code-string-matching tests with behavioral tests (H1). (2) Fixed AC6 test loops to use producer resource from loop variable (M1). (3) Removed unused imports ACT_SKILL_WEIGHTS/drawEnchantmentPair (M2). (4) Changed variety check from find() to findIndex()+splice() for proper bucket cleanup (M3). (5) Added statistical distribution test for weighted bucket output (M4).

### File List

- `src/src/data/producers.ts` — Added `getProducerMechanic()` utility function
- `src/src/systems/shop.ts` — Added `PRODUCER_MECHANIC_WEIGHTS` constant, `buildMechanicWeightedBucket()` function, mechanic-weighted producerBucket construction, variety check after skill pool generation
- `src/src/data/converters.ts` — Changed `drawConverterPool()` default parameter from 20 → 23
- `src/src/core/types.ts` — Updated converterPool comment (45 抽 20 → 45 抽 23)
- `src/tests/unit/systems/shop-producer-mechanic.test.ts` — New test file: 32 behavioral tests for AC1-AC6
- `src/tests/unit/data/converters.test.ts` — Updated drawConverterPool default expectation (20→23)
- `docs/implementation-artifacts/sprint-status.yaml` — Updated 34-5 status
