# Story 32.5: 造词师 — 碎片产出者与转化者技能定义

Status: done

## Story

As a 造词师玩家,
I want 战斗中通过碎片产出者技能产出字母碎片、通过碎片转化者在碎片与其他资源间互相转化,
so that 我可以构建完整的碎片经济循环，平衡得分需求和造词素材积累。

## Acceptance Criteria

1. 碎片产出者（`resource='fragment'`）：至少 2 个技能（加法 + 乘法），遵循现有产出者管道（附魔、增幅、重触发全兼容）
2. 碎片产出者同时提供微量基础分（`base_score` 附带值），不是纯死权重
3. 碎片→其他资源转化者：至少 4 个（覆盖 score/multiplier/time/gold 目标），源读取 `classResourceProduced.fragment`（本关累计产出），不读库存
4. 其他资源→碎片转化者：至少 4 个（base/score/multiplier/time 作为源），输出通过 `routeFragmentsToInventory` 路由到采集队列
5. 转化者系数平衡：碎片转化不能压倒通用路线（碎片→score 的 k 值低于 base→score 的 k 值）
6. ClassResourceFilter 自动过滤：碎片技能只在造词师商店出现，其他职业不可见
7. 单元测试：产出者数据完整性 + 转化者数据完整性 + ClassResourceFilter 过滤验证

## Tasks / Subtasks

- [x] Task 1: 定义碎片产出者数据 (AC: #1, #2)
  - [x] 1.1 `producers.ts`: 新增 `prod_harvest`（加法 `+fragment`，values: [1, 1.6, 2.4]，描述含微量 base 提示）
  - [x] 1.2 `producers.ts`: 新增 `prod_refine`（乘法 `×fragment`，values: [1.8, 2.1, 2.4]）
  - [x] 1.3 验证产出者 icon 不与现有产出者冲突（查 IconRegistry 或手动检查）

- [x] Task 2: 定义碎片转化者数据 — 碎片→其他 (AC: #3, #5)
  - [x] 2.1 `converters.ts`: 新增 `conv_fragment_score_add`（fragment→score, add, k=0.8）
  - [x] 2.2 `converters.ts`: 新增 `conv_fragment_score_mul`（fragment→score, mul, k=0.004）
  - [x] 2.3 `converters.ts`: 新增 `conv_fragment_mult_add`（fragment→multiplier, add, k=0.015）
  - [x] 2.4 `converters.ts`: 新增 `conv_fragment_mult_mul`（fragment→multiplier, mul, k=0.006）
  - [x] 2.5 `converters.ts`: 新增 `conv_fragment_time_add`（fragment→time, add, k=0.12）
  - [x] 2.6 `converters.ts`: 新增 `conv_fragment_time_mul`（fragment→time, mul, k=0.004）
  - [x] 2.7 `converters.ts`: 新增 `conv_fragment_gold_add`（fragment→gold, add, k=0.3）
  - [x] 2.8 `converters.ts`: 新增 `conv_fragment_gold_mul`（fragment→gold, mul, k=0.003）

- [x] Task 3: 定义碎片转化者数据 — 其他→碎片 (AC: #4)
  - [x] 3.1 `converters.ts`: 新增 `conv_base_fragment_add`（base→fragment, add, k=0.08）
  - [x] 3.2 `converters.ts`: 新增 `conv_base_fragment_mul`（base→fragment, mul, k=0.003）
  - [x] 3.3 `converters.ts`: 新增 `conv_score_fragment_add`（score→fragment, add, k=0.005）
  - [x] 3.4 `converters.ts`: 新增 `conv_score_fragment_mul`（score→fragment, mul, k=0.0003）
  - [x] 3.5 `converters.ts`: 新增 `conv_mult_fragment_add`（multiplier→fragment, add, k=2.0）
  - [x] 3.6 `converters.ts`: 新增 `conv_mult_fragment_mul`（multiplier→fragment, mul, k=0.2）
  - [x] 3.7 `converters.ts`: 新增 `conv_time_fragment_add`（time→fragment, add, k=0.1）
  - [x] 3.8 `converters.ts`: 新增 `conv_time_fragment_mul`（time→fragment, mul, k=0.01）
  - [x] 3.9 `converters.ts`: 新增 `conv_gold_fragment_add`（gold→fragment, add, k=0.3）
  - [x] 3.10 `converters.ts`: 新增 `conv_gold_fragment_mul`（gold→fragment, mul, k=0.03）

- [x] Task 4: 产出者附带 base_score 微量产出 (AC: #2)
  - [x] 4.1 检查 triggerProducer 是否已支持同时产出 fragment + base（如果不支持，需在 triggerProducer 中为 fragment 产出者添加微量 base 加成）
  - [x] 4.2 如果需要修改 skills.ts：在 fragment 产出者触发时额外 `synergy.skillBaseScore += 1`（固定 +1 base，不随等级缩放）

- [x] Task 5: 验证 ClassResourceFilter 过滤 (AC: #6)
  - [x] 5.1 确认 `isResourceActiveForClass('fragment', 'wordsmith')` 返回 true
  - [x] 5.2 确认 `isResourceActiveForClass('fragment', 'metamorph')` 返回 false
  - [x] 5.3 确认 `isResourceActiveForClass('fragment', 'none')` 返回 false
  - [x] 5.4 确认商店 `generateShopItems` 中产出者和转化者池自动过滤碎片技能

- [x] Task 6: 转化者池容量更新 (AC: #3, #4)
  - [x] 6.1 `converters.ts`: 更新 `drawConverterPool` 默认 count — 新增 18 个碎片转化者后，总池约 52 个，抽 26（维持 ~50% 抽取率）
  - [x] 6.2 验证 `filterSkillIdsByClass` 在非造词师时正确过滤掉碎片转化者

- [x] Task 7: 单元测试 (AC: #7)
  - [x] 7.1 `producers.test.ts`: 碎片产出者数据完整性（id/name/icon/resource/operator/values/desc 全字段非空）
  - [x] 7.2 `producers.test.ts`: 碎片产出者 values 为 3 元素数组，数值递增
  - [x] 7.3 `converters.test.ts`（或新增 fragment-converters.test.ts）：碎片转化者 source/target 字段正确
  - [x] 7.4 `converters.test.ts`: 碎片→score 的 k 值 ≤ base→score 的 k 值（平衡约束）
  - [x] 7.5 `ClassResourceFilter.test.ts`: 新增碎片技能过滤测试（filterSkillPoolByClass 正确排除/包含碎片技能）
  - [x] 7.6 `converters.test.ts`: getSourceValue 对 fragment source 读取 classResourceProduced（非 resources.fragment）

## Dev Notes

### 关键架构约束

- **本 Story 只定义数据层**：产出者/转化者的 `ProducerDefinition` / `ConverterDefinition` 条目。触发管道（triggerProducer / triggerConverter）已在 Story 32.4 适配完毕（`routeFragmentsToInventory` 调用）。
- **不需要修改 skills.ts 触发逻辑**（除非 Task 4 的 base_score 附带需要额外代码路径）。
- **碎片产出者 icon 选择**：避免与现有 10 个产出者重复。当前已用图标：⚔️🎯🪙💎🔥⚡⏳♾💰🏦。建议碎片用 🔤📝 或类似字母/文字图标。
- **转化者命名规范**：`conv_[source]_[target]_[operator]`，如 `conv_fragment_score_add`。
- **k 值平衡原则**：碎片是"间接"资源（需要先积累再造词），所以碎片→通用资源的转化效率应低于通用→通用转化。碎片产出者的直接得分贡献也应低于 base 产出者。

### 现有代码模式（必须遵循）

**产出者定义模式（producers.ts）：**
```typescript
prod_harvest: {
  id: 'prod_harvest',
  name: '采集',
  icon: '🔤',
  resource: 'fragment',
  operator: 'add',
  values: [1, 1.6, 2.4],
  desc: '产出 {value} 碎片',
},
```

**转化者定义模式（converters.ts）：**
```typescript
conv_fragment_score_add: {
  id: 'conv_fragment_score_add',
  name: '字面价值',
  icon: '🔤🪙',
  source: 'fragment',
  target: 'score',
  formula: 'add',
  k: 0.8,
  desc: '碎片产出 → 加分',
},
```

**getSourceValue 已支持 fragment/mutagen（converters.ts）：**
```typescript
export function getSourceValue(
  source: ResourceType,
  resources: ResourceState,
  classResourceProduced?: Record<string, number>
): number {
  if (source === 'fragment' || source === 'mutagen') {
    return classResourceProduced?.[source] ?? 0;  // 读累计产出，不读库存
  }
  // ...
}
```

**routeFragmentsToInventory 已在 skills.ts 连接（Story 32.4）：**
```typescript
// triggerConverter 中 conv.target === 'fragment' 时
if (conv.target === 'fragment') {
  routeFragmentsToInventory(Math.abs(delta));
}
```

**ClassResourceFilter 已连接（Story 32.2）：**
```typescript
// shop.ts generateShopItems:
const producerIds = Object.keys(PRODUCERS).filter(id => {
  const prod = PRODUCERS[id];
  return isResourceActiveForClass(prod.resource, state.classId);
});
// converterPool 在 Run 初始化时已经过 filterSkillIdsByClass
```

### Task 4 分析：base_score 附带

碎片产出者的设计目标是"不是纯死权重"——绑定碎片技能时仍有微量得分贡献。方案：

**方案 A（推荐）**：在 `triggerProducer` 中，当 `prod.resource === 'fragment'` 时，额外 `synergy.skillBaseScore += 1`。这是最小改动，固定 +1 base 不随等级缩放，保持碎片产出者的核心定位是碎片而非分数。

**方案 B**：创建"双资源"产出者类型。复杂度高，本 Story 不推荐。

如果选方案 A，修改位于 `skills.ts` triggerProducer 的 fragment 分支（约 line 412）：
```typescript
if (prod.resource === 'fragment') {
  routeFragmentsToInventory(Math.abs(delta));
  synergy.skillBaseScore += 1;  // 微量 base 附带
}
```

### 转化者 k 值设计参考

碎片是间接资源，转化效率应 **低于** 同类通用转化：

| 转化路径 | 通用 k (参考) | 碎片 k (建议) | 比率 |
|----------|-------------|-------------|------|
| X→score (add) | base→score: 1.0 | fragment→score: 0.8 | 80% |
| X→mult (add) | base→mult: 0.02 | fragment→mult: 0.015 | 75% |
| X→time (add) | base→time: 0.15 | fragment→time: 0.12 | 80% |
| X→gold (add) | base→gold: N/A | fragment→gold: 0.3 | — |
| X→fragment (add) | — | base→fragment: 0.08 | — |

乘法 k 值同比例缩放。

### 转化者池容量

当前转化者总数 34 个，`drawConverterPool(20)` 抽取 ~59%。新增 18 个碎片转化者后总数 52 个。建议调整为 `drawConverterPool(26)` 维持 ~50% 抽取率。非造词师玩家经过 `filterSkillIdsByClass` 后碎片转化者被过滤，实际可用池仍为 34 个中的 ~26 个（略有膨胀但可接受）。

### Project Structure Notes

修改文件：
```
src/src/data/producers.ts           # +2 碎片产出者
src/src/data/converters.ts          # +18 碎片转化者 + drawConverterPool count
src/src/systems/skills.ts           # +1 行 base_score 附带（if 方案 A）
tests/unit/data/producers.test.ts   # +碎片产出者完整性测试
tests/unit/data/converters.test.ts  # +碎片转化者完整性测试（或新文件）
tests/unit/systems/classes/ClassResourceFilter.test.ts  # +碎片过滤测试
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.5] — 验收标准
- [Source: docs/class-design-wordsmith.md] — 碎片经济设计、k 值原则、base_score 附带
- [Source: src/src/data/producers.ts] — 10 个现有产出者模式
- [Source: src/src/data/converters.ts] — 34 个现有转化者模式 + getSourceValue fragment 分支
- [Source: src/src/systems/classes/ClassResourceFilter.ts] — 职业资源过滤逻辑
- [Source: src/src/systems/classes/FragmentQueue.ts] — routeFragmentsToInventory 入口
- [Source: src/src/systems/skills.ts:412-418] — triggerProducer fragment 触发路径
- [Source: src/src/systems/shop.ts:205-215] — 商店产出者/转化者池过滤
- [Source: docs/implementation-artifacts/32-4-wordsmith-fragment-queue.md] — 前序 Story 实现记录

### Git Intelligence

最近提交：
```
8f44652 feat: Story 32-3 职业失去机制 + Story 32-4 造词师采集队列 + code review修复
ef012f9 feat: Story 32-2 职业专属资源管道（fragment/mutagen ResourceType扩展+池过滤+库存追踪）+ code review修复
```
模式：`feat/fix + Story 编号 + 中文描述 + 括号内关键实现细节`

### Previous Story Intelligence

Story 32-4（采集队列）关键教训：
- **DRY 原则**：code review 发现 3 处重复碎片分配块，提取为 `routeFragmentsToInventory` 辅助函数。本 Story 新增的碎片技能自动经过此统一入口。
- **输入验证**：`setFragmentQueue` 添加了非法字符过滤。数据层定义应确保所有字段值合法。
- **classResourceProduced vs inventory**：转化者源读 classResourceProduced（稳定），库存受概率溢出影响（离散）。本 Story 的碎片转化者必须遵循此设计。

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Icon duplicate fix: 📜→🏷️ (conv_fragment_mult_add), 🔤→🔡 (conv_base_fragment_add), 📓→📒 (conv_score_fragment_mul), 🪶→🏷️ (conv_fragment_mult_add vs phoenix_feather)

### Completion Notes List
- Task 1: Added prod_harvest (add, 📝) + prod_refine (multiply, 🔍) to producers.ts
- Task 2: Added 8 fragment→other converters (score/mult/time/gold × add/mul)
- Task 3: Added 10 other→fragment converters (base/score/mult/time/gold × add/mul)
- Task 4: Added synergy.skillBaseScore += 1 in triggerProducer fragment branch (skills.ts)
- Task 5: ClassResourceFilter already handles fragment correctly — verified via tests with real PRODUCERS/CONVERTERS data
- Task 6: Updated drawConverterPool default 20→31 (non-wordsmith filter-after-draw keeps ~20), comments 34→52
- Task 7: Updated producers.test.ts (10→12, +fragment resource), converters.test.ts (34→52, +18 k-value tests, +4 balance constraints), ClassResourceFilter.test.ts (+3 real-data fragment tests), iconRegistry.test.ts (197→217), producer-shop.test.ts (10→12), skills.ts SKILL_SCHOOL (+prod_harvest/prod_refine)
- Fixed 3 cross-type icon duplicates and 1 intra-converter icon duplicate
- Code review fixes: H1 drawConverterPool 26→31, M1 +3 fragment base_score tests, M2 stale comments, L1 main.ts comment

### File List
- src/src/data/producers.ts — +2 fragment producers, updated header comment
- src/src/data/converters.ts — +18 fragment converters, drawConverterPool 20→31
- src/src/data/skills.ts — +2 SKILL_SCHOOL entries
- src/src/main.ts — updated converter pool comment
- src/src/systems/skills.ts — +1 line synergy.skillBaseScore for fragment producers
- tests/unit/data/producers.test.ts — updated counts, +fragment resource, +2 value tests
- tests/unit/data/converters.test.ts — updated counts, +18 k-value tests, +4 balance tests
- tests/unit/data/iconRegistry.test.ts — updated total count 197→217
- tests/unit/systems/classes/ClassResourceFilter.test.ts — +3 real-data fragment tests
- tests/unit/systems/producer-shop.test.ts — updated count 10→12
- tests/unit/systems/producer-trigger.test.ts — +3 fragment base_score attachment tests
- docs/implementation-artifacts/sprint-status.yaml — 32-5 status tracking
