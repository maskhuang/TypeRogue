# Story 35.9: 商店集成

Status: done

## Story

As a player,
I want the shop to offer randomly-generated affix skills with visible rarity, affixes, and pricing,
so that each run's shop provides a unique build-crafting experience driven by the new affix skill system.

## Acceptance Criteria

1. **AC1 — 商店生成**: 商店刷新时调用 `generateSkill()` 生成随机技能（替代旧的从固定池抽取）。测试：刷新商店 → 返回的 ShopItem 包含完整 `AffixSkillInstance`，ID 格式为 `skill_*`
2. **AC2 — 定价公式**: `basePrice × (1 + rarity × 0.5) × (1 + (level-1) × 0.3)`，稀有度越高越贵。测试：rarity=3 level=1 → basePrice×2.5；rarity=0 level=3 → basePrice×1.6
3. **AC3 — 卡片显示**: 商店技能卡片显示：资源图标、稀有度边框颜色（白/蓝/黄/橙）、词条名列表、等级。测试：rarity=2 技能 → 黄色边框 + 2 个词条名
4. **AC4 — 替换丢弃状态**: 技能替换时旧技能的运行时状态（apprenticeAccumulated, questCompletions 等）全部丢失。测试：替换已有 binding 的技能 → 旧 SkillRuntimeState 被删除
5. **AC5 — 品类多样性**: 商店每次刷新保证品类多样性：不全出同一稀有度，至少包含 1 个蓝装以上。测试：生成 5 件 → 至少 1 件 rarity≥1
6. **AC6 — 职业过滤**: 职业资源（fragment/mutagen）的技能仅对应职业可见。测试：无职业玩家 → 不出 fragment/mutagen 技能

## Tasks / Subtasks

- [x] Task 1: 扩展类型定义 + RunState 存储 (AC: #1, #4)
  - [x] 1.1 在 `core/types.ts` 的 `ShopItem` 接口添加 `affixSkill?: AffixSkillInstance` 可选字段
  - [x] 1.2 在 `core/types.ts` 的 `GameState` 添加 `affixSkills: Map` + `affixSkillStates: Map` 字段
  - [x] 1.3 在 `core/state/RunState.ts` 添加 `affixSkillStates: Map<string, SkillRuntimeState>` 字段，与 skills Map 平行管理
  - [x] 1.4 在 `core/state.ts` 的 createInitialState 中初始化两个新 Map
  - [x] 1.5 在 sellSkill 中：删除对应的 affixSkills + affixSkillStates 条目（AC4 — 旧状态丢弃）
  - [x] 1.6 在 RunState 的 serialize/deserialize 中：序列化/反序列化 affixSkillStates Map + 调用 migrateLoadedSkills 兼容旧存档
  - [x] 1.7 编写测试：购买/卖出 affix 技能 → 状态条目增删正确

- [x] Task 2: 商店技能生成 + 定价 + 多样性 (AC: #1, #2, #5, #6)
  - [x] 2.1 在 `systems/shop.ts` 新增 `generateAffixShopItem(itemId, options?)` 函数：调用 `generateSkill()` → 计算定价 → 返回 ShopItem
  - [x] 2.2 实现定价公式：`basePrice × (1 + rarity × 0.5) × (1 + (level-1) × 0.3)`，AFFIX_SKILL_BASE_PRICE=50
  - [x] 2.3 实现 `generateAffixShopItems(count)` 函数：生成 count 件技能商品，保证多样性（至少 1 件 rarity≥1）
  - [x] 2.4 多样性保证策略：先尝试随机 10 次保底蓝装，失败则强制 rarity=1
  - [x] 2.5 职业过滤：`getAvailableResources(classId)` 排除非对应职业的 fragment/mutagen
  - [x] 2.6 修改 `generateShopItems(count)` 主函数：替换旧技能池逻辑，改为调用 `generateAffixShopItems`
  - [x] 2.7 编写测试：generateAffixShopItem → 返回含 affixSkill 的 ShopItem + 正确定价
  - [x] 2.8 编写测试：多样性保证 — 5 件中至少 1 件 rarity≥1
  - [x] 2.9 编写测试：职业过滤 — 无职业时不出 fragment/mutagen

- [x] Task 3: 购买流程 + 替换逻辑 (AC: #1, #4)
  - [x] 3.1 修改 `executePurchase(index)` ：识别 affix 技能商品，存入 state.affixSkills + state.affixSkillStates
  - [x] 3.2 购买时设置 `affixSkill.purchasePrice` 和 `SkillInstance.purchasePrice`
  - [x] 3.3 卖出/替换时删除 affixSkills + affixSkillStates（AC4 — 运行时状态丢弃）
  - [x] 3.4 保留现有自动绑定逻辑：购买后 auto-bind 到 freq≥5 的空闲键位
  - [x] 3.5 编写测试：购买 + 卖出 + 替换 affix 技能 → 状态正确

- [x] Task 4: 商店卡片 UI (AC: #3)
  - [x] 4.1 在 `systems/shop.ts` 的 `renderUnifiedShopCard` 中添加 affix 技能卡片渲染分支
  - [x] 4.2 稀有度边框颜色映射：`RARITY_COLORS = {0:'#ffffff', 1:'#4488ff', 2:'#ffcc00', 3:'#ff8800'}`（白/蓝/黄/橙）
  - [x] 4.3 卡片内容：资源图标 + 技能名（含词条前缀）+ 等级标记 + 词条名列表 + 价格
  - [x] 4.4 编写测试：RARITY_COLORS 映射正确

- [x] Task 5: 附魔分配入口 (AC: #1)
  - [x] 5.1 修改 `checkAutoEnchantment(skillId)` ：affix 技能使用 `getEnchantmentSlotCount()` 判断附魔槽数
  - [x] 5.2 附魔分配流程：Lv3 升级时弹出附魔选择（复用现有 modal 逻辑），或蜕变师随机附魔
  - [x] 5.3 附魔候选/过滤函数已导入但未在 checkAutoEnchantment 直接调用（由 renderEnchantmentModal 内部调用）

## Dev Notes

### 已有实现（勿重复）

**generateSkill()** — `skillGeneration.ts` (Story 35-2):
- 完整生成流程：rollRarity → weightedSampleWithout → rollAffixParams → generateName → unique ID
- 返回 `AffixSkillInstance`（id, name, icon, resource, baseValues, level=1, rarity, affixes[], enchantmentIds: []）
- ID 格式：`skill_${Date.now()}_${random().toString(36).slice(2, 6)}`
- 支持 options 参数：`{ resource?, rarity?, level? }`

**serializeSkill/deserializeSkill** — `affixTrigger.ts` (Story 35-8):
- `serializeSkill(skill, runtimeState) → AffixSkillSaveData`
- `deserializeSkill(data) → { skill, runtimeState }`
- deserializeSkill 中 name/icon 为占位（TODO(35-9) 待恢复）

**migrateLoadedSkills** — `affixTrigger.ts` (Story 35-8):
- 过滤 `isOldSystemSkill(id)` 前缀匹配（prod_/conv_/conn_/amp_）
- 补全缺失 affixes/rarity/runtime 字段

**createSkillRuntimeState(skillId)** — `affixes.ts`:
- 工厂函数：初始化 8 字段（chargeAccumulated=0, currentDecayMult=1, mirrorCopiedAffix=null, triggerCount=0, amplifyStacks=0, apprenticeAccumulated=0, questStacks=0, questCompletions=0）

**getEnchantmentSlotCount(skill)** — `affixTrigger.ts` (Story 35-6):
- Twin 词条 → 2 槽，否则 1 槽

**filterQuestCandidates(skill)** — `affixTrigger.ts` (Story 35-6):
- 返回匹配技能词条的 Quest 附魔候选列表（排除已拥有）

**filterEnchantmentsByClass(candidates, playerClass?)** — `affixes.ts` (Story 35-5):
- 过滤职业限定附魔（ApprenticeHarvest→wordsmith, ApprenticeAdapt→metamorph, etc.）

**generateName(resource, affixes)** — `skillGeneration.ts` (Story 35-2):
- 格式："词条1·词条2·…·资源名"（如 "暴击·蓄力·基数"）

### 现有商店系统结构（需修改）

**`systems/shop.ts`** (~1400 行):
- `generateShopItems(count)` (L291-493)：旧系统——从 producer/converter/connector/amplifier 池抽取
- `renderUnifiedShopCard(item, index)` (L533-628)：HTML 渲染单个商品卡片
- `executePurchase(index)` (L750-801)：购买逻辑（扣金 + addSkill + 设 purchasePrice）
- `purchaseShopItem(index)` (L804-828)：购买后回调（auto-bind + checkAutoEnchantment）
- `checkAutoEnchantment(skillId)` (L881-903)：Lv3 附魔检测

**`core/types.ts`**:
- `ShopItem` (L250-259)：`{ id, type, skillId?, cost, isUpgrade, locked }`
- `SkillInstance` (L269-272)：`{ level, purchasePrice? }`

**`core/state/RunState.ts`**:
- `addSkill(skillId, level=1)` (L205-213)：添加/升级技能
- `bindSkill(key, skillId)` (L259-270)：绑定到键位
- `serialize()` (L505-535)：Map → Object.fromEntries
- `deserialize()` (L541-637)：过滤 DELETED_SKILL_IDS + Object.entries → Map

### 定价公式

```
price = BASE_PRICE × (1 + rarity × 0.5) × (1 + (level - 1) × 0.3)
```

| rarity | level | 倍率 | 示例 (BASE=50) |
|--------|-------|------|---------------|
| 0 白 | 1 | 1.0 | 50 |
| 1 蓝 | 1 | 1.5 | 75 |
| 2 黄 | 1 | 2.0 | 100 |
| 3 橙 | 1 | 2.5 | 125 |
| 0 白 | 2 | 1.3 | 65 |
| 1 蓝 | 3 | 2.4 | 120 |

### 稀有度边框颜色

| rarity | 颜色 | CSS |
|--------|------|-----|
| 0 | 白 | `#ffffff` |
| 1 | 蓝 | `#4488ff` |
| 2 | 黄 | `#ffcc00` |
| 3 | 橙 | `#ff8800` |

### 多样性保证策略

生成 N 件时：
1. 第 1 件：强制 rarity≥1（调用 `generateSkill({ rarity: rollRarity() })` 但若结果=0 则重 roll 直到≥1）
2. 第 2~N 件：正常随机
3. 职业过滤：生成前根据 playerClass 构建可用资源列表，传入 `generateSkill({ resource })` 限定资源

### 依赖方向（CRITICAL）

```
data (affixes.ts, skillGeneration.ts, affixTrigger.ts)  ← 纯数据层
  ↓ 被引用
core (types.ts, RunState.ts)                             ← 类型 + 状态层
  ↓ 被引用
systems (shop.ts)                                        ← 业务逻辑层
  ↓ 被引用
scenes (ShopScene.ts)                                    ← UI 层
```

- `shop.ts` 可以导入 `data/` 和 `core/` 层
- `core/types.ts` 可以引用 `data/affixes.ts` 的类型（仅类型导入）
- `data/` 层不得导入 `core/` 或 `systems/`

### TODO(35-9) 待处理

- `affixTrigger.ts:deserializeSkill` 中 `name: data.id, icon: ''` 需要在反序列化后恢复正确的 name/icon
- 方案：反序列化后调用 `generateName(skill.resource, skill.affixes)` 恢复 name，`RESOURCE_ICONS[skill.resource]` 恢复 icon
- 需要从 `skillGeneration.ts` 导入 `generateName` 或在 `affixes.ts` 中提供 `RESOURCE_ICONS` 常量

### Project Structure Notes

- 商店生成逻辑: `src/src/systems/shop.ts`
- 技能生成引擎: `src/src/data/skillGeneration.ts`
- 词条数据定义: `src/src/data/affixes.ts`
- 触发+生命周期: `src/src/data/affixTrigger.ts`
- 类型定义: `src/src/core/types.ts`
- 运行状态: `src/src/core/state/RunState.ts`
- 商店 UI 场景: `src/src/scenes/shop/ShopScene.ts`
- 单元测试: `tests/unit/systems/shop.test.ts`（旧测试需适配）
- 新测试: `tests/unit/data/shopIntegration.test.ts`（或扩展 shop.test.ts）

### References

- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.9] — 验收标准原文
- [Source: docs/design/affix-skill-system.md#商店集成] — 生成流程 + 定价 + 稀有度分布
- [Source: docs/design/affix-skill-system.md#转化词条 k 值校准表] — Convert k 值范围
- [Source: docs/project-context.md#State Architecture] — MetaState/RunState/BattleState 三层
- [Source: docs/project-context.md#Skill State Storage Rules] — bindings/skills/enchantedSkills 存储规则
- [Source: docs/implementation-artifacts/35-2-skill-generation-engine.md] — generateSkill 实现细节
- [Source: docs/implementation-artifacts/35-8-state-lifecycle-serialization.md] — serialize/deserialize + migrateLoadedSkills

### Previous Story Intelligence (from 35-7 / 35-8)

- **纯函数边界**: affixTrigger.ts 所有函数是纯函数，shop.ts 作为 systems 层负责调用这些钩子
- **序列化往返**: serializeSkill → JSON → deserializeSkill 无损，但 name/icon 需要恢复（本 Story 负责）
- **旧技能迁移**: migrateLoadedSkills 已处理前缀匹配过滤 + runtime/affixes/rarity 补全
- **Review H1 教训**: migrateLoadedSkills 漏补 runtime 字段导致 crash → 已在 35-8 review 修复
- **Track 模式**: 在条件块内调用 track()，避免分离的状态追踪
- **Test Helpers**: 使用 `makeSkill()` + `makeContext()` + `makeRuntimeState()` + `makeFlags()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- TypeScript compilation errors fixed: unused imports, verbatimModuleSyntax, duplicate RARITY_COLORS
- Code review (1H, 3M, 2L): All HIGH and MEDIUM issues fixed automatically

### Completion Notes List

1. **Architecture decision**: Stored `affixSkills` and `affixSkillStates` as top-level Maps on GameState (not inside SkillInstance) for direct trigger pipeline access
2. **Old/new coexistence**: executePurchase gated by `item.affixSkill` presence — old system skills (prod_/conv_/conn_/amp_) still work
3. **Pricing**: `calculateAffixSkillPrice()` uses `getAdjustedPrice()` wrapper to respect relic price modifiers
4. **Diversity guarantee**: Retry loop (10 attempts) + forced rarity=1 fallback ensures at least 1 blue+ item
5. **Class filtering**: `getAvailableResources(classId)` builds resource pool; passed to `generateSkill({ resource })` to restrict generation
6. **RARITY_COLORS conflict**: Old relic tooltip used same const name — renamed to `RELIC_RARITY_COLORS`
7. **RunState serialization**: Added but note RunState save/load (`saveManager.saveRun/loadRun`) is not actively called in current codebase
8. **Test coverage**: 33 tests covering pricing, colors, generation, diversity, class filtering, state lifecycle, AC3 card data

### Review Fixes Applied

- **H1 fixed**: Added `applyAffixRandomEnchantment()` + `renderAffixEnchantmentModal()` — affix skills now use `filterQuestCandidates` + `filterEnchantmentsByClass` for candidates and write to `enchantmentIds` (not `enchantedSkills`)
- **M1 fixed**: Removed duplicate `RARITY_COLORS` from shop.ts — now imported from affixes.ts (single source of truth)
- **M2 fixed**: Added rarity=2 card content test verifying 2 named affixes + correct border color
- **M3 fixed**: `RunState.removeSkill` now deletes `affixSkills`/`affixSkillStates` entries

### File List

- `src/core/types.ts` — Added `affixSkill?` to ShopItem, `affixSkills`/`affixSkillStates` Maps to GameState
- `src/core/state.ts` — Initialized new Maps in `createInitialState()`
- `src/core/state/RunState.ts` — Added affixSkills/affixSkillStates to RunStateData + serialize/deserialize + removeSkill cleanup
- `src/systems/shop.ts` — Added affix skill generation/pricing/purchase/sell/rendering/enchantment (Quest-based for affix skills)
- `tests/unit/data/shopIntegration.test.ts` — 33 tests for Story 35-9
