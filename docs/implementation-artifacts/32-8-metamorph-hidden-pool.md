# Story 32.8: 蜕变师 — 隐藏池系统 + 变异素资源

Status: done

## Story

As a 蜕变师玩家,
I want 技能池在 Run 开始时随机分为可见/隐藏两半，并能通过变异素产出者积累变异素资源,
so that 蜕变师有独特的"盲盒进化"核心循环，为后续蜕变机制（Story 32.9）奠定数据基础。

## Acceptance Criteria

1. **隐藏池分配**：Run 开始时（蜕变师激活），转化者/连接者/增幅者总池各随机 50/50 分为可见池和隐藏池
2. **产出者不分池**：产出者全部可见
3. **分池确定性**：分池受 Run 种子影响（`random()`），整个 Run 内不变
4. **商店仅刷可见池**：商店刷新时仅从可见池候选
5. **非蜕变师无分池**：classId !== 'metamorph' 时跳过分池，全部技能可见
6. **变异素产出者**：至少 2 个 `resource: 'mutagen'` 产出者（add + multiply），走现有产出者公式
7. **变异素转化者**：至少 4 个 mutagen↔其他资源 转化者，读数使用本关累计产出量（`classResourceProduced`），非库存
8. **变异素增幅者**：至少 2 个增幅者，走现有增幅者框架
9. **HUD 变异素显示**：战斗中 HUD 显示当前变异素持有量（仅蜕变师可见）
10. **单元测试**：覆盖分池逻辑、产出者/转化者/增幅者数据完整性、HUD 显示条件

## Tasks / Subtasks

- [x] Task 1: 隐藏池分配系统 (AC: #1, #2, #3, #5)
  - [x] 1.1-1.5 **无需新增代码**：现有 `drawConverterPool(31)`/`drawConnectorPool(18)`/`drawAmplifierPool(15)` 天然实现 ~50% 分池，未抽中 ID 即为隐藏池。商店读 `state.xxxPool` 自动仅刷可见池。产出者不参与分池。非蜕变师无特殊处理。

- [x] Task 2: 商店仅刷可见池 (AC: #4)
  - [x] 2.1-2.2 **无需改动**：商店刷新读 `state.converterPool` / `connectorPool` / `amplifierPool`，分池后这些已是可见子集。

- [x] Task 3: 变异素产出者数据 (AC: #6)
  - [x] 3.1 添加 `prod_mutagen_drip`（add, 💉）和 `prod_mutagen_surge`（multiply, 🦠）
  - [x] 3.2 `resource: 'mutagen'`，复用现有 `triggerProducer` 中的 mutagen 路由分支
  - [x] 3.3 `synergy.skillBaseScore += 1`（与碎片产出者同模式）

- [x] Task 4: 变异素转化者数据 (AC: #7)
  - [x] 4.1 添加 8 个 mutagen 转化者（4 mutagen→other + 4 other→mutagen）
  - [x] 4.2 `getSourceValue` 已支持 mutagen（读 `classResourceProduced['mutagen']`），无需改动
  - [x] 4.3 转化者读累计产出量，非库存，蜕变消耗不影响读数

- [x] Task 5: 变异素增幅者数据 (AC: #8)
  - [x] 5.1 填充 `AMP_NAMES['mutagen']` / `AMP_VALUES['mutagen']` 并加入 `ALL_RESOURCES`，生成 6 个 mutagen 增幅者
  - [x] 5.2 复用现有增幅者框架

- [x] Task 6: HUD 变异素显示 (AC: #9)
  - [x] 6.1 `index.html` 添加 `#mutagen-hud` 元素（`#top-bar` 内）
  - [x] 6.2 `startLevel` 中根据 `state.classId === 'metamorph'` 控制显隐
  - [x] 6.3 `updateHUD` 中更新变异素计数
  - [x] 6.4 使用 #2ecc71 绿色 + 🧬 图标

- [x] Task 7: 单元测试 (AC: #10)
  - [x] 7.1 隐藏池由现有抽池机制覆盖，无需新增测试
  - [x] 7.2 更新 producers(14), converters(60), amplifiers(36) 数据完整性测试
  - [x] 7.3 `getSourceValue` 已有测试覆盖 mutagen 路径
  - [x] 7.4 iconRegistry 总数更新 226→242，图标唯一性测试通过

## Dev Notes

### 关键参考：造词师实现模式（Story 32.4-32.7）

造词师的碎片资源实现确立了以下模式，蜕变师应严格遵循：

1. **产出者模式**：`resource: 'mutagen'`，走 `triggerProducer` → `routeMutagenToInventory`（类比 `routeFragmentsToInventory`），但变异素是单一数值（`state.mutagenInventory += amount`），远比碎片 26 池简单
2. **转化者读数**：`getSourceValue` 已在 `converters.ts` 中对 `'mutagen'` 走 `classResourceProduced` 路径，**无需改动**
3. **增幅者模式**：直接在 `amplifiers.ts` 的 `AMPLIFIERS` 中添加 `resource: 'mutagen'` 条目，现有 `triggerAmplifier` 自动处理
4. **池过滤**：`ClassResourceFilter.filterSkillIdsByClass` 已在 `main.ts` 中过滤非当前职业技能，蜕变师的 mutagen 技能对非蜕变师自动不可见

### 隐藏池设计要点

- 分池时机：`main.ts` → `startAfterClassSelect` → 职业池过滤之后、`startLevel` 之前
- 分池结果存入 `state`（可见池覆盖原 pool 字段，隐藏池存新字段）
- 使用 `random()`（受种子控制），确保每日挑战模式下分池可重现
- 商店已经读 `state.xxxPool` 刷新候选，分池后自然只刷可见部分

### 变异素 vs 碎片的差异

| | 碎片 (fragment) | 变异素 (mutagen) |
|---|---|---|
| 库存结构 | 26 个独立计数器 (a-z) | 单一数值 |
| 产出路由 | 采集队列 → 按字母分发 | 直接 += |
| 消耗场景 | 造词台（商店） | 蜕变（关卡结算，Story 32.9） |
| 转化者读数 | classResourceProduced['fragment'] | classResourceProduced['mutagen'] |

### 已存在的基础设施（无需重建）

- `ResourceType` 含 `'mutagen'` ✓
- `GameState.mutagenInventory: number` ✓
- `GameState.classResourceProduced` 含 mutagen 累计 ✓
- `RESOURCE_LABELS/ICONS/COLORS` 含 mutagen ✓
- `CLASS_RESOURCE_MAP['mutagen'] = 'metamorph'` ✓
- `getSourceValue` 对 mutagen 已走 classResourceProduced ✓
- `AMPLIFIERS` 中有 `mutagen: {}` 占位 ✓

### 变异素产出路由

碎片走 `routeFragmentsToInventory`（采集队列 → 26 池），变异素简单得多：
```typescript
// 在 skills.ts triggerProducer 或专用函数中
state.mutagenInventory += amount;
state.classResourceProduced['mutagen'] = (state.classResourceProduced['mutagen'] || 0) + amount;
```

需确认 `triggerProducer` 中对 `resource === 'mutagen'` 的路由逻辑。当前 fragment 在 `triggerProducer` 中有特殊分支 `routeFragmentsToInventory`，mutagen 需要类似但更简单的分支。

### Project Structure Notes

- `src/src/data/producers.ts` — 添加 2 个 mutagen 产出者
- `src/src/data/converters.ts` — 添加 8 个 mutagen 转化者
- `src/src/data/amplifiers.ts` — 填充 mutagen 增幅者（6 个，via ALL_RESOURCES）
- `src/src/data/skills.ts` — SKILL_SCHOOL 映射新增 2 个 mutagen 产出者
- `src/src/systems/skills.ts` — mutagen 产出/转化路由 + 溅射路由修复
- `src/src/systems/battle.ts` — HUD 变异素显示（startLevel + updateHUD）
- `src/src/style.css` — 变异素 HUD 样式
- `src/index.html` — 变异素 HUD DOM 元素

注：隐藏池由现有 drawXxxPool 机制天然实现，无需新文件。state.ts 无需修改。

### References

- [Source: docs/class-design-metamorph.md] — 蜕变师完整设计文档
- [Source: docs/stories/epic-22-class-system.md#Story 32.8] — Epic AC 定义
- [Source: src/src/data/converters.ts#getSourceValue] — mutagen 转化者读数已支持
- [Source: src/src/systems/classes/ClassResourceFilter.ts] — 职业资源过滤
- [Source: src/src/data/amplifiers.ts#RESOURCE_BASE_ICONS] — mutagen 增幅者占位
- [Source: docs/implementation-artifacts/32-7-wordsmith-enchantments-relics.md] — 造词师实现模式参考

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Icon collision fix: 4 duplicates resolved (💉🩻🦎🗜️)
- SKILL_SCHOOL mapping fix: 2 new mutagen producers added

### Completion Notes List
- Task 1-2: 隐藏池由现有 drawXxxPool 天然实现，无需新代码
- Task 3: 2 mutagen producers (add + multiply)
- Task 4: 8 mutagen converters (4 mutagen→other + 4 other→mutagen)
- Task 5: 6 mutagen amplifiers via ALL_RESOURCES generation
- Task 6: HUD #mutagen-hud in top-bar, visibility gated on classId
- Task 7: Tests updated (producers 14, converters 60, amplifiers 36, icons 242)
- Code review fix: triggerProducerWithReduction 补充 fragment/mutagen 路由

### File List
- `src/src/data/producers.ts` — +2 mutagen producers (prod_mutagen_drip, prod_mutagen_surge)
- `src/src/data/converters.ts` — +8 mutagen converters
- `src/src/data/amplifiers.ts` — mutagen added to ALL_RESOURCES, AMP_NAMES, AMP_VALUES
- `src/src/data/skills.ts` — SKILL_SCHOOL entries for 2 new producers
- `src/src/systems/skills.ts` — mutagen routing in triggerProducer/triggerConverter/triggerProducerWithReduction/triggerConverterWithReduction
- `src/src/systems/battle.ts` — mutagen HUD visibility (startLevel) + count update (updateHUD)
- `src/index.html` — #mutagen-hud DOM element
- `src/src/style.css` — .class-resource-hud + #mutagen-count styles
- `src/tests/unit/data/producers.test.ts` — count 12→14, +mutagen resource
- `src/tests/unit/data/converters.test.ts` — count 52→60, +mutagen source tests
- `src/tests/unit/data/amplifiers.test.ts` — count 30→36, resources 5→6
- `src/tests/unit/data/iconRegistry.test.ts` — total 226→242
- `src/tests/unit/systems/producer-shop.test.ts` — count 12→14
