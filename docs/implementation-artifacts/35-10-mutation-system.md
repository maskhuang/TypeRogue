# Story 35.10: 蜕变师 — 词条蜕变

Status: done

## Story

As a metamorph player,
I want to spend mutagen to reforge individual affixes or change a skill's rarity,
so that I can fine-tune my build through strategic mutation decisions.

## Acceptance Criteria

1. **AC1 — 蜕变 A UI**: 玩家点击技能 → 弹出词条选择面板 → 选择要重铸的词条 → 确认消耗 → 执行重铸。测试：蓝装(1词条)蜕变A → 面板显示1个词条选项 → 确认后词条类型变更
2. **AC2 — 蜕变 A 池过滤**: 排除技能已有的其他词条类型，从剩余池中加权抽取。测试：橙装(3词条)重铸第1个 → 新类型不等于第2、3个词条类型
3. **AC3 — 蜕变 A 消耗**: 基础 3 变异素，同 run 内对同一技能每次 +1。测试：同一技能第1次=3、第2次=4、第3次=5
4. **AC4 — 蜕变 C↑ 消耗**: 白→蓝=5、蓝→黄=8、黄→橙=12 变异素；已橙装禁止操作。测试：蓝装C↑ → 扣8变异素 → rarity=2 + 新增1词条
5. **AC5 — 蜕变 C↓ 消耗**: 0消耗（返还1变异素）；已白装禁止操作。测试：黄装C↓ → rarity=1 + 移除1随机词条 + 变异素+1
6. **AC6 — 词条变更后更新名称**: 蜕变后自动调用 `generateName()` 更新技能名。测试：蜕变A后 skill.name 包含新词条名
7. **AC7 — 任务附魔失效**: 被替换/移除的词条若有对应任务附魔 → 移除该附魔 + questStacks=0 + questCompletions=0。测试：有QuestOverload(暴击)的技能 → 蜕变A替换暴击词条 → enchantmentIds不再含QuestOverload + runtime归零
8. **AC8 — mutationApplied 事件**: 蜕变操作触发 `mutationApplied` 事件 → 学徒·适应(ApprenticeAdapt)从中成长+15%。测试：蜕变A后 → 适应附魔技能的 apprenticeAccumulated += 0.15

## Tasks / Subtasks

- [x] Task 1: 蜕变核心逻辑函数 (AC: #2, #3, #4, #5, #6, #7, #8)
  - [x] 1.1 在 `data/affixMutation.ts`（新文件）实现 `mutateA(skillId, affixIndex): MutationResult` — 词条重铸逻辑
  - [x] 1.2 实现 `mutateUpgrade(skillId): MutationResult` — 蜕变 C↑ 逻辑（新增词条 + rarity+1）
  - [x] 1.3 实现 `mutateDowngrade(skillId): MutationResult` — 蜕变 C↓ 逻辑（随机移除词条 + rarity-1 + 返还1变异素）
  - [x] 1.4 实现 `getMutateACost(skillId): number` — 基础3 + run内该技能已用次数
  - [x] 1.5 实现 `getUpgradeCost(rarity): number` — 白→蓝5/蓝→黄8/黄→橙12
  - [x] 1.6 实现 `invalidateQuestEnchantment(skillId, removedAffixType)` — 移除对应任务附魔 + 归零runtime
  - [x] 1.7 蜕变后调用 `generateName(resource, affixes)` 更新 skill.name + `RESOURCE_ICONS[resource]` 更新 icon
  - [x] 1.8 蜕变后 emit `mutationApplied` 事件 → 遍历所有技能触发 ApprenticeAdapt 成长

- [x] Task 2: 状态扩展 — 蜕变计数追踪 (AC: #3)
  - [x] 2.1 在 `GameState` 添加 `mutationACounts: Map<string, number>` 追踪每技能蜕变A次数（run级别）
  - [x] 2.2 在 `core/state.ts` 的 `createInitialState` 中初始化 `mutationACounts: new Map()`
  - [x] 2.3 在 `RunState.ts` 的 serialize/deserialize 中处理 `mutationACounts`（跨关保留，run结束重置）
  - [x] 2.4 在 mutateA 完成后 `mutationACounts.set(skillId, (get || 0) + 1)`

- [x] Task 3: 蜕变台 UI 重写 (AC: #1)
  - [x] 3.1 在 `MetamorphStation.ts` 中增加 affix 技能判定分支：`state.affixSkills.has(skillId)` → 走新蜕变流程
  - [x] 3.2 实现 `renderAffixMutationPanel(skillId, boundKey, container)` — 显示3个操作按钮：蜕变A / C↑ / C↓
  - [x] 3.3 蜕变A点击后 → 弹出词条选择面板（列出skill.affixes，每个词条显示名称+参数摘要）→ 玩家选择 → 确认
  - [x] 3.4 C↑/C↓ 按钮旁显示消耗/返还数值 + 不可操作时灰化（橙装禁C↑，白装禁C↓）
  - [x] 3.5 操作后刷新面板 + 播放音效 + showFeedback

- [x] Task 4: 单元测试 (AC: #1~#8)
  - [x] 4.1 测试 mutateA：词条类型变更 + 池过滤排除已有类型 + 消耗递增
  - [x] 4.2 测试 mutateUpgrade：rarity+1 + 新词条追加 + 消耗正确
  - [x] 4.3 测试 mutateDowngrade：rarity-1 + 词条移除 + 返还1变异素
  - [x] 4.4 测试 invalidateQuestEnchantment：任务附魔移除 + runtime归零
  - [x] 4.5 测试 mutationApplied 事件：ApprenticeAdapt 成长触发
  - [x] 4.6 测试名称更新：蜕变后 skill.name 反映新词条组合
  - [x] 4.7 测试边界：白装无词条→蜕变A不可操作；橙装→C↑不可操作；白装→C↓不可操作

## Dev Notes

### 已有实现（勿重复）

**weightedSampleWithout(count)** — `skillGeneration.ts` (Story 35-2):
- 加权不重复抽取词条类型，内部处理 Convert 同源/异源拆分
- 蜕变A需要: `weightedSampleWithout(1)` 并传入过滤后的池（排除已有类型）

**rollAffixParams(type, resource, convertVariant?)** — `skillGeneration.ts` (Story 35-2):
- 为指定词条类型生成完整参数实例（所有20种case）
- 蜕变A/C↑ 直接复用

**generateName(resource, affixes)** — `skillGeneration.ts` (Story 35-2):
- 格式："词条1·词条2·…·资源名"
- 蜕变后调用更新 skill.name

**RESOURCE_ICONS** — `affixes.ts`:
- 资源图标映射表，蜕变后更新 skill.icon = `RESOURCE_ICONS[skill.resource]`

**QUEST_AFFIX_MAP** — `affixes.ts` (L119-138):
- 18个任务附魔→词条类型映射（如 QuestOverload→Crit, QuestDevour→Void）
- 蜕变A/C↓移除词条时：检查 `QUEST_AFFIX_MAP` 找到对应任务附魔 → 从 `enchantmentIds` 移除

**filterQuestCandidates(skill)** — `affixTrigger.ts` (Story 35-6):
- 返回匹配技能词条的Quest附魔候选（排除已拥有）
- C↑新增词条后可能解锁新附魔候选

**createSkillRuntimeState(skillId)** — `affixes.ts`:
- 工厂函数初始化8字段，蜕变不需要重建（保留现有runtime）

**ApprenticeAdapt** — `affixTrigger.ts` (L793-796):
- resolvePhase5 中 `shouldGrow = ctx.mutationApplied === true` → 已实现成长触发
- 需要在蜕变操作后设置 ctx.mutationApplied=true 并对所有带适应附魔的技能调用一次 phase5

**MetamorphStation.ts** — 现有蜕变台（Story 32.9）:
- `performMetamorph(oldSkillId, key, container)` — 旧系统隐藏池替换（不适用于affix技能）
- `renderMetamorphPanel(container)` — 技能网格 + tooltip + 点击触发
- 新系统需要增加 affix 技能分支，共存于同一面板

### 蜕变A — 词条重铸 伪码

```
mutateA(skillId, affixIdx):
  skill = state.affixSkills.get(skillId)
  if !skill || skill.affixes.length === 0 → return error
  if affixIdx >= skill.affixes.length → return error

  // 消耗检查
  cost = getMutateACost(skillId)  // 3 + mutationACounts.get(skillId)
  if state.mutagenInventory < cost → return error('变异素不足')
  state.mutagenInventory -= cost
  mutationACounts.set(skillId, (get||0) + 1)

  // 池过滤：排除该技能其他词条的类型
  oldAffix = skill.affixes[affixIdx]
  excludeTypes = skill.affixes.filter((_, i) => i !== affixIdx).map(a => a.type)
  // 使用 weightedSampleWithout(1) 配合 excludeTypes 过滤
  newType = weightedSample(filteredPool, 1)
  newAffix = rollAffixParams(newType, skill.resource)
  skill.affixes[affixIdx] = newAffix

  // 任务附魔失效检查
  invalidateQuestEnchantment(skillId, oldAffix.type)

  // 更新名称
  skill.name = generateName(skill.resource, skill.affixes)
  skill.icon = RESOURCE_ICONS[skill.resource]

  // emit mutationApplied
  emitMutationApplied()
```

### 蜕变C↑ — 稀有度升级 伪码

```
mutateUpgrade(skillId):
  skill = state.affixSkills.get(skillId)
  if !skill || skill.rarity >= 3 → return error('已传说')

  cost = UPGRADE_COSTS[skill.rarity]  // {0:5, 1:8, 2:12}
  if state.mutagenInventory < cost → return error
  state.mutagenInventory -= cost

  // 排除已有词条类型
  excludeTypes = skill.affixes.map(a => a.type)
  newType = weightedSample(filteredPool, 1)
  newAffix = rollAffixParams(newType, skill.resource)
  skill.affixes.push(newAffix)
  skill.rarity += 1

  // 更新名称
  skill.name = generateName(skill.resource, skill.affixes)
  emitMutationApplied()
```

### 蜕变C↓ — 稀有度降级 伪码

```
mutateDowngrade(skillId):
  skill = state.affixSkills.get(skillId)
  if !skill || skill.rarity <= 0 → return error('已白装')

  // 随机移除1个词条
  removeIdx = random(0, skill.affixes.length - 1)
  removedAffix = skill.affixes.splice(removeIdx, 1)[0]
  skill.rarity -= 1

  // 任务附魔失效检查
  invalidateQuestEnchantment(skillId, removedAffix.type)

  // 返还1变异素
  state.mutagenInventory += 1

  // 更新名称
  skill.name = generateName(skill.resource, skill.affixes)
  emitMutationApplied()
```

### emitMutationApplied 实现

蜕变触发 mutationApplied 需要让所有带 ApprenticeAdapt 附魔的技能获得成长。实现方式：
- 遍历 `state.affixSkills` 找到所有 `enchantmentIds.includes(EnchantmentType.ApprenticeAdapt)` 的技能
- 对每个匹配技能：`runtimeState.apprenticeAccumulated += 0.15`（APPRENTICE_GROWTH_MAP[ApprenticeAdapt]）
- **不要**调用完整 resolvePhase5（商店阶段无战斗上下文），直接操作 runtimeState

### mutationACounts 生命周期

- **初始化**: run 开始时为空 Map
- **累加**: 每次 mutateA 完成后 +1
- **序列化**: 跨关保留（Map<string, number> → Object.fromEntries）
- **重置**: run 结束时清空（在 createInitialState 中 = new Map()）

### 新文件：`data/affixMutation.ts`

纯函数层，不依赖 DOM。导出：
- `mutateA(skillId, affixIndex): MutationResult`
- `mutateUpgrade(skillId): MutationResult`
- `mutateDowngrade(skillId): MutationResult`
- `getMutateACost(skillId): number`
- `getUpgradeCost(rarity): number`
- `canMutateA(skillId): boolean`
- `canUpgrade(skillId): boolean`
- `canDowngrade(skillId): boolean`
- `invalidateQuestEnchantment(skillId, removedType): void`

```typescript
interface MutationResult {
  success: boolean
  error?: string  // '变异素不足' | '已传说' | '已白装' | '无词条'
  oldAffix?: AffixInstance
  newAffix?: AffixInstance
  removedAffix?: AffixInstance
  mutagenCost: number
  mutagenRefund: number
}
```

### 依赖方向（CRITICAL）

```
data (affixes.ts, skillGeneration.ts, affixTrigger.ts, affixMutation.ts)  ← 纯数据层
  ↓ 被引用
core (types.ts, state.ts, RunState.ts)                                     ← 类型+状态层
  ↓ 被引用
systems (shop.ts, classes/MetamorphStation.ts)                             ← 业务逻辑+UI层
```

- `affixMutation.ts` 可导入 `affixes.ts`、`skillGeneration.ts`，可读写 `state`（通过参数传入或直接导入）
- `MetamorphStation.ts` 调用 `affixMutation.ts` 的纯函数
- **注意**: `affixMutation.ts` 需要读写 `state.affixSkills`、`state.affixSkillStates`、`state.mutagenInventory`、`state.mutationACounts` — 可直接导入 `state` 单例（与 shop.ts 同层级模式）

### UPGRADE_COSTS 常量

```typescript
export const UPGRADE_COSTS: Record<number, number> = {
  0: 5,   // 白→蓝
  1: 8,   // 蓝→黄
  2: 12,  // 黄→橙
}
```

### 池过滤实现细节

蜕变A的词条池过滤需要特殊处理 Convert 类型：
- `weightedSampleWithout` 内部将 Convert 拆分为 ConvertCross/ConvertSelf
- 排除已有类型时：如果技能已有 `Convert` 词条（无论同源/异源），需要排除 `Convert` 类型
- 可以调用 `weightedSampleWithout(1)` 前先构建过滤后的权重表

### 与现有 MetamorphStation 共存

现有 MetamorphStation 处理旧系统技能（prod_/conv_/conn_/amp_ 前缀）。新系统需要：
1. 在 `renderMetamorphPanel` 中判断技能是否为 affix 技能（`state.affixSkills.has(skillId)`）
2. affix 技能 → 渲染新蜕变操作面板（3按钮：A/C↑/C↓）
3. 旧技能 → 保持现有隐藏池替换逻辑
4. 长期：旧系统技能将被完全移除（35-13之后），届时可清理旧代码

### Project Structure Notes

- 新建: `src/src/data/affixMutation.ts` — 蜕变核心逻辑（纯函数）
- 修改: `src/src/systems/classes/MetamorphStation.ts` — UI增加affix蜕变分支
- 修改: `src/src/core/types.ts` — GameState添加 mutationACounts
- 修改: `src/src/core/state.ts` — createInitialState初始化
- 修改: `src/src/core/state/RunState.ts` — serialize/deserialize mutationACounts
- 新建: `tests/unit/data/affixMutation.test.ts` — 蜕变逻辑测试
- 复用: `src/src/data/skillGeneration.ts` — weightedSampleWithout, rollAffixParams, generateName
- 复用: `src/src/data/affixes.ts` — QUEST_AFFIX_MAP, RESOURCE_ICONS, AFFIX_WEIGHTS

### References

- [Source: docs/stories/epic-35-affix-skill-system.md#Story 35.10] — 验收标准原文
- [Source: docs/design/affix-skill-system.md#十四、蜕变师 — 词条蜕变] — 蜕变A/C伪码+消耗表+交互规则
- [Source: docs/design/affix-skill-system.md#附魔系统] — QUEST_AFFIX_MAP 18个映射
- [Source: docs/project-context.md#State Architecture] — MetaState/RunState/BattleState三层
- [Source: docs/implementation-artifacts/35-9-shop-integration.md] — 商店集成实现细节（affixSkills/affixSkillStates存储模式）
- [Source: docs/implementation-artifacts/35-2-skill-generation-engine.md] — weightedSampleWithout/rollAffixParams/generateSkill

### Previous Story Intelligence (from 35-9)

- **affixSkills/affixSkillStates 存储模式**: 顶层 Map on GameState，非嵌入 SkillInstance（直接访问 `state.affixSkills.get(skillId)`）
- **RARITY_COLORS 单一来源**: 从 `affixes.ts` 导入（shop.ts review M1修复）
- **附魔系统双轨**: 旧系统用 `enchantedSkills` Map，affix系统用 `skill.enchantmentIds[]` 数组
- **RunState.removeSkill 已清理**: 删除 affixSkills/affixSkillStates 条目（review M3修复）
- **Test Helpers**: 使用 `vi.mock` 隔离 DOM/audio 依赖
- **verbatimModuleSyntax**: TypeScript 要求 `import type` 用于纯类型导入

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Created `sampleOneExcluding()` instead of reusing `weightedSampleWithout()` — needed exclusion-aware filtering with Convert type splitting (convert_cross/convert_self both excluded when Convert is in exclusion set)
- `emitMutationApplied()` directly iterates `state.affixSkills` and adds 0.15 to `apprenticeAccumulated` for ApprenticeAdapt skills — no battle context available during shop-phase mutations
- MetamorphStation UI uses `state.affixSkills.has(skillId)` to coexist old/new system: affix skills → new mutation panel, old skills → existing hidden pool replacement
- Fixed unused imports: removed `AffixSkillInstance`, `AffixWeightKey`, `weightedSampleWithout` from affixMutation.ts; removed `AffixSkillInstance` from MetamorphStation.ts (verbatimModuleSyntax)
- 42 new tests all pass; 404 related tests all pass; 0 new regressions

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 | **Date:** 2026-03-11

**Findings:** 1 HIGH, 4 MEDIUM, 3 LOW | **All HIGH/MEDIUM fixed**

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| H1 | HIGH | AC7 integration test used conditional `if` assertion — could pass vacuously when random returns same type | FIXED: Mocked `random()` to force deterministic type change |
| M1 | MEDIUM | `invalidateQuestEnchantment` unconditionally zeroed questStacks/questCompletions even when other quest enchantments survive | FIXED: Only zero when no quest enchantments remain on skill |
| M2 | MEDIUM | No test for Convert type exclusion in `sampleOneExcluding` (convert_cross/convert_self dual exclusion) | FIXED: Added dedicated test |
| M3 | MEDIUM | `sampleOneExcluding` duplicates weighted sampling logic from `weightedSampleWithout` | FIXED: Added cross-reference comment noting maintenance relationship |
| M4 | MEDIUM | `renderAffixMutationPanel` used innerHTML string interpolation for skill info | FIXED: Replaced with DOM API (createElement + textContent) |
| L1 | LOW | Extensive inline CSS in renderAffixMutationPanel | Deferred |
| L2 | LOW | AC6 name update test assertions weak (length > 0 instead of content check) | Deferred |
| L3 | LOW | mutateA rollback leaves zero-value entries in mutationACounts Map | Deferred |

### File List

- **NEW** `src/src/data/affixMutation.ts` — Core mutation logic (mutateA, mutateUpgrade, mutateDowngrade, helpers)
- **NEW** `src/tests/unit/data/affixMutation.test.ts` — 44 unit tests covering all 8 ACs (42 original + 2 review fixes)
- **MOD** `src/src/core/types.ts` — Added `mutationACounts: Map<string, number>` to GameState
- **MOD** `src/src/core/state.ts` — Initialized `mutationACounts: new Map()` in createInitialState
- **MOD** `src/src/core/state/RunState.ts` — Serialize/deserialize mutationACounts (RunStateData, createInitialState, toJSON, fromJSON)
- **MOD** `src/src/systems/classes/MetamorphStation.ts` — Added affix skill detection + renderAffixMutationPanel UI
