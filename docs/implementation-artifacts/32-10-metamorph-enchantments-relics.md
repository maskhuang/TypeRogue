# Story 32.10: 蜕变师 — 附魔随机化 + 专属附魔 + 专属遗物

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 蜕变师玩家,
I want 专属附魔和遗物来强化我的变异素+蜕变构建路线,
so that 蜕变师职业拥有独特的进化赌徒 build 策略与身份感，与通用池及造词师形成差异化体验.

## Acceptance Criteria

1. **附魔随机化**（依赖 FeatureGate，已在 shop.ts 实现）
   - 蜕变师技能 Lv3 时直接随机赋予 1 个附魔（不给二选一）
   - UI 显示「🎲 随机附魔!」反馈而非选择界面
   - 验证 `applyRandomEnchantment()` 已正确工作

2. **3 个专属附魔定义在 `ENCHANTMENTS` 中**，`category: 'class-exclusive'`
   - **适应** (`ench_adapt`)：每被蜕变一次 +15%（RunState 跨关保留，无论变成什么都保留）
   - **不稳定** (`ench_unstable`)：每关开始随机一种资源 +30%，关末消失
   - **嗜变** (`ench_mutation_hunger`)：触发时 5% 概率产 1 变异素（不占产出者槽位）

3. **`drawEnchantmentPair()` 扩展**
   - 蜕变师时将蜕变师 class-exclusive 附魔加入抽取池
   - 非蜕变师、非造词师时排除所有 class-exclusive 附魔
   - 造词师仍只看到造词师专属附魔

4. **6 个新专属遗物定义在 `RELICS` 中**（`primal_mutant` 已存在，共 7 个）
   - **终极突变株** (`ultimate_mutant_strain`)：legendary/Boss 池 — 每关前两次蜕变免费 + 高稀有度结果返 1 变异素
   - **基因稳定器** (`gene_stabilizer`)：rare — 本关再次蜕变同一技能消耗减半（向上取整）
   - **催化注射器** (`catalyst_injector`)：rare — 变异素→其他转化者读数 +30%
   - **混沌种子** (`chaos_seed`)：rare — 每关结束随机一个未附魔技能获随机附魔
   - **深渊之眼** (`abyss_eye`)：legendary — 商店预览 2 个隐藏池技能（仅展示）
   - **适者生存** (`fittest_survivors`)：legendary — 蜕变后技能本关 +20%

5. **`METAMORPH_EXCLUSIVE_RELICS`** 集合更新为全部 7 个蜕变师遗物 ID

6. **所有附魔和遗物有完整单元测试**（数据完整性 + 机制正确性 + 池过滤）

## Tasks / Subtasks

- [x] Task 1: 附魔数据定义 + 池过滤扩展 (AC: #2, #3)
  - [x] 1.1 `enchantments.ts` — 添加 3 个蜕变师附魔定义（`ench_adapt` / `ench_unstable` / `ench_mutation_hunger`），`category: 'class-exclusive'`，选取唯一 icon（通过 iconRegistry 查重）
  - [x] 1.2 `enchantments.ts` — `drawEnchantmentPair()` 过滤扩展：`if (e.category === 'class-exclusive') return isWordsmith || state.classId === 'metamorph';`，让蜕变师能抽取蜕变师专属附魔
  - [x] 1.3 验证造词师仍只看造词师专属、蜕变师只看蜕变师专属（池过滤互斥性需依赖 classId 判断哪些 class-exclusive 属于哪个职业）

- [x] Task 2: 附魔触发逻辑 (AC: #2)
  - [x] 2.1 **适应** — `skills.ts` `getEnchantmentMultiplier()` 扩展：当附魔为 `ench_adapt` 时，读取 `state.growthValues[skillId]` 返回 `1 + growthValue`
  - [x] 2.2 **适应** — `MetamorphStation.ts` `performMetamorph()` 扩展：蜕变时如果被蜕变技能有 `ench_adapt` 附魔，迁移附魔到新技能后 `growthValues[newSkillId] += 0.15`
  - [x] 2.3 **不稳定** — `battle.ts` `startLevel()` 扩展：检查所有拥有 `ench_unstable` 附魔的技能，为每个技能随机选一种资源类型存入 `state.unstableResources` Map（skillId→ResourceType）
  - [x] 2.4 **不稳定** — `skills.ts` 扩展：在技能产出计算时，如有 `ench_unstable` 且产出资源匹配 `unstableResources[skillId]`，则产出 +30%
  - [x] 2.5 **不稳定** — 关末清理：确认 `state.unstableResources` 在关卡结束或 `resetResources()` 时清空
  - [x] 2.6 **嗜变** — `skills.ts` 技能触发后扩展：如有 `ench_mutation_hunger` 附魔，`random() < 0.05` 时 `state.mutagenInventory += 1`、`state.classResourceProduced['mutagen'] += 1`，播放反馈

- [x] Task 3: 遗物数据定义 + 池过滤 (AC: #4, #5)
  - [x] 3.1 `relics.ts` — 添加 6 个新蜕变师遗物定义（终极突变株/基因稳定器/催化注射器/混沌种子/深渊之眼/适者生存），选取唯一 icon
  - [x] 3.2 `relicPicker.ts` — `METAMORPH_EXCLUSIVE_RELICS` 集合更新为 7 个 ID

- [x] Task 4: 终极突变株 + 基因稳定器 (AC: #4)
  - [x] 4.1 **终极突变株** — `MetamorphStation.ts` `performMetamorph()` 扩展：如持有 `ultimate_mutant_strain`，`relicStates['ultimate_mutant_strain']` 追踪本关蜕变次数，前 2 次免费；蜕变结果稀有度更高时额外 +1 变异素
  - [x] 4.2 **终极突变株** — `battle.ts` `startLevel()` 中重置 `relicStates['ultimate_mutant_strain'] = 0`
  - [x] 4.3 **基因稳定器** — `MetamorphStation.ts` `performMetamorph()` 扩展：追踪本关已蜕变的 skillId 集合（`relicStates['gene_stabilizer_used']`），同一技能第二次蜕变消耗减半（`Math.ceil(1 * 0.5)` = 1，实际等价于标记后 0.5 取整）

- [x] Task 5: 催化注射器 + 混沌种子 (AC: #4)
  - [x] 5.1 **催化注射器** — 复用精炼透镜模式：`skills.ts` 中 `triggerConverter()` / `triggerConverterWithReduction()` 检查遗物 + source=mutagen 时 `sourceVal *= 1.3`
  - [x] 5.2 **混沌种子** — `battle.ts` 关卡结束时（进入商店前）：检查持有 `chaos_seed` → 找所有未附魔非连接者/非复制者技能 → 随机一个 → `applyRandomEnchantment()` 赋予随机附魔

- [x] Task 6: 深渊之眼 + 适者生存 (AC: #4)
  - [x] 6.1 **深渊之眼** — `MetamorphStation.ts` `renderMetamorphPanel()` 扩展：如持有 `abyss_eye`，在面板底部展示 2 个来自隐藏池的随机技能预览（仅展示 icon + name，不可蜕变到）
  - [x] 6.2 **适者生存** — `MetamorphStation.ts` `performMetamorph()` 扩展：蜕变后将 newSkillId 加入 `relicStates['fittest_survivors_boosted']` 集合
  - [x] 6.3 **适者生存** — `skills.ts` `getEnchantmentMultiplier()` 或产出计算扩展：如 skillId 在 `fittest_survivors_boosted` 中，本关产出 +20%
  - [x] 6.4 **适者生存** — 每关重置 `relicStates['fittest_survivors_boosted']`

- [x] Task 7: 附魔随机化验证 (AC: #1)
  - [x] 7.1 验证 `applyRandomEnchantment()` 对蜕变师已正确工作
  - [x] 7.2 验证蜕变师专属附魔能被 `drawEnchantmentPair()` 抽到
  - [x] 7.3 验证造词师专属附魔不会被蜕变师抽到（反之亦然）

- [x] Task 8: 单元测试 (AC: #6)
  - [x] 8.1 附魔数据完整性测试（id/name/icon/category/effectValue/desc 齐全）
  - [x] 8.2 附魔 icon 跨类型唯一性（iconRegistry.test.ts 自动覆盖）
  - [x] 8.3 适应触发测试：performMetamorph 后 growthValues 增加 0.15，getEnchantmentMultiplier 返回正确倍率
  - [x] 8.4 不稳定测试：startLevel 后 unstableResources 非空，匹配资源产出 +30%，关末清空
  - [x] 8.5 嗜变测试：mock random < 0.05 时 mutagenInventory +1
  - [x] 8.6 遗物数据完整性测试
  - [x] 8.7 终极突变株测试：前2次免费，第3次扣费；高稀有度返变异素
  - [x] 8.8 催化注射器测试：mutagen→other sourceVal ×1.3
  - [x] 8.9 混沌种子测试：关卡结束后随机技能获附魔
  - [x] 8.10 池过滤测试：非蜕变师不出现蜕变师专属附魔/遗物

## Dev Notes

### 核心参照：Story 32-7（造词师附魔+遗物）

> Story 32-7 是本 story 的**直接模板**。蜕变师附魔/遗物的架构模式、文件位置、池过滤方式完全复用造词师已建立的模式。

### 附魔系统集成

**现有附魔类型（38 个）**：
- spatial（30 个）：growth/splash/resonance/repulsion/devour × 6 positionRelation
- transmutation（4 个）：base/score/multiplier/time
- independent（1 个）：mastery
- class-exclusive（3 个）：造词师专属 harvest/letter_affinity/overflow

**新增 3 个蜕变师 class-exclusive 附魔**（共 41 个）

**`drawEnchantmentPair()` 过滤逻辑关键点**：
```typescript
// 当前实现（line 90）：
if (e.category === 'class-exclusive') return isWordsmith;
// 需改为：
if (e.category === 'class-exclusive') {
  // 需要区分哪些 class-exclusive 属于哪个职业
  // 方案 A：给 EnchantmentDefinition 添加 classId 字段
  // 方案 B：通过 enchantment ID 前缀或 Set 判断
  // 推荐方案 B（最小改动）：
  const WORDSMITH_ENCHS = new Set(['ench_harvest', 'ench_letter_affinity', 'ench_overflow']);
  const METAMORPH_ENCHS = new Set(['ench_adapt', 'ench_unstable', 'ench_mutation_hunger']);
  if (state.classId === 'wordsmith') return WORDSMITH_ENCHS.has(e.id);
  if (state.classId === 'metamorph') return METAMORPH_ENCHS.has(e.id);
  return false;
}
```

> **注意**：简单的 `return isWordsmith || isMetamorph` 会让蜕变师抽到造词师附魔，必须分职业判断。

### 附魔触发集成点

**适应（ench_adapt）**：
- 存储：`state.growthValues[skillId]` — 复用现有 growth 附魔基础设施
- 触发点：`MetamorphStation.ts` `performMetamorph()` 中附魔迁移后（line ~127）
- 读取点：`skills.ts` `getEnchantmentMultiplier()` — 新增 `ench_adapt` 分支，返回 `1 + (growthValues.get(skillId) ?? 0)`
- 特殊性：growth 附魔在空间关系触发时累加，适应在蜕变事件触发时累加 — 不同触发源但共享 growthValues 存储

**不稳定（ench_unstable）**：
- 存储：`state.unstableResources: Map<string, ResourceType>`（新字段，skillId→随机资源）
- 触发点：`battle.ts` `startLevel()` — 遍历 `state.player.enchantedSkills`，找到 `ench_unstable` 的技能，为每个随机选资源
- 读取点：`skills.ts` 产出计算中，检查是否有不稳定加成
- 清理：`resetResources()` 或关末清空 Map
- 可用资源类型：`['score', 'gold', 'multiplier', 'time', 'base']`（不含 fragment/mutagen 职业资源）

**嗜变（ench_mutation_hunger）**：
- 无存储需求
- 触发点：`skills.ts` 技能触发后，检查 `state.player.enchantedSkills.get(skillId) === 'ench_mutation_hunger'`
- 5% 概率：`random() < 0.05`（使用种子化随机）
- 产出：`state.mutagenInventory += 1`、`state.classResourceProduced['mutagen'] += 1`
- 反馈：`showFeedback('🧬 嗜变! +1 变异素', '#2ecc71')`

### 遗物系统集成

**遗物定义模式**（同 32-7）：
```typescript
{ id: 'relic_id', name: '名称', icon: '🔮', description: '效果描述',
  rarity: 'common'|'rare'|'legendary', basePrice: N, effects: [], flavor: '...' }
```

**终极突变株（ultimate_mutant_strain）实现要点**：
- relicStates 追踪本关蜕变次数：`state.player.relicStates['ultimate_mutant_strain']`（初始 0）
- `performMetamorph()` 中：检查 relicStates < 2 → 免费，否则正常扣费
- "高稀有度返变异素" — 需定义稀有度概念，可简化为：如果新技能不在可见池中（即来自隐藏池更深处）则返 1 变异素，或通过 allIds 索引位置判断
- 与 primal_mutant 关系：ultimate_mutant_strain 是完全升级版，如同时持有以 ultimate 为准
- 每关重置：`battle.ts` startLevel 中 `relicStates['ultimate_mutant_strain'] = 0`

**基因稳定器（gene_stabilizer）实现要点**：
- 追踪本关已蜕变的技能 ID 集合
- relicStates 存 JSON 字符串或使用独立 Set（建议用 relicStates 存 comma-separated string）
- 再次蜕变同一技能时 `Math.ceil(1 * 0.5)` = 1（最小消耗仍为 1），实际效果可能需要调整
- 考虑：蜕变后技能 ID 已变，"同一技能" 指同一键位还是同一 skillId？→ 应指同一键位（key）
- 实现方式：`relicStates['gene_stabilizer_keys']` 存已蜕变键位集合

**催化注射器（catalyst_injector）实现要点**：
- 完全复用精炼透镜模式（32-7 已建立）
- 集成点：`skills.ts` `triggerConverter()` / `triggerConverterWithReduction()` 中
- 条件：converter 的 source === 'mutagen' 且持有 `catalyst_injector`
- 效果：`sourceVal *= 1.3`

**混沌种子（chaos_seed）实现要点**：
- 触发时机：关卡结束进入商店前（`battle.ts` 中 `goToShop()` 调用前）
- 逻辑：找所有未附魔且非连接者/非复制者的技能 → 随机一个 → 调用 `applyRandomEnchantment(skillId)`
- 注意：需从 shop.ts import `applyRandomEnchantment` 或将其移到独立模块
- 如果所有技能都已有附魔则不触发

**深渊之眼（abyss_eye）实现要点**：
- 纯 UI 功能，在蜕变台面板底部添加预览区
- 从各类型隐藏池各取 1 个技能展示（总共展示 2 个，从所有类型隐藏池合并后随机 2 个）
- 展示内容：icon + name + 类型标签
- 不可点击、不可蜕变到
- 每次渲染面板时重新随机（或缓存到 relicStates）

**适者生存（fittest_survivors）实现要点**：
- 蜕变后将 newSkillId 存入 `relicStates['fittest_survivors_boosted']`（逗号分隔或 JSON 数组）
- 产出计算时检查：如 skillId 在 boosted 集合中，产出 ×1.2
- 集成点：`skills.ts` `getEnchantmentMultiplier()` 或单独的遗物乘法层
- 每关重置 boosted 集合

### 关键反模式防范

1. **Icon 重复**：Story 32-5/26 发现多次图标冲突。所有新 icon 必须通过 `iconRegistry.test.ts` 测试
2. **class-exclusive 池互斥**：蜕变师不能抽到造词师附魔，必须按 ID 集合分离过滤
3. **relicStates 序列化**：relicStates 只支持 number 类型值，复杂集合需用其他存储方式或编码为 number
4. **Growth 值跨关保持**：`state.growthValues` 在 `resetResources()` 中不重置，适应累计值自然保留
5. **unstableResources 关末清理**：新增的 Map 字段必须在 `resetState()` 或 `resetResources()` 中初始化
6. **applyRandomEnchantment 可见性**：当前是 shop.ts 的私有函数，混沌种子需要在 battle.ts 调用 → 需 export 或提取到公共模块

### Project Structure Notes

- 附魔数据：`src/src/data/enchantments.ts`（现有 38 个，新增 3 个 → 41 个）
- 遗物数据：`src/src/data/relics.ts`（新增 6 个蜕变师遗物）
- 附魔触发：`src/src/systems/skills.ts`（`getEnchantmentMultiplier` 扩展 + 嗜变触发）
- 蜕变台：`src/src/systems/classes/MetamorphStation.ts`（适应累加 + 遗物逻辑 + 深渊之眼 UI）
- 遗物选取：`src/src/systems/relicPicker.ts`（`METAMORPH_EXCLUSIVE_RELICS` 更新）
- 战斗系统：`src/src/systems/battle.ts`（不稳定初始化 + 混沌种子触发 + relicStates 重置）
- 商店系统：`src/src/systems/shop.ts`（`applyRandomEnchantment` 可能需 export）
- 类型定义：`src/src/core/types.ts`（可能需添加 `unstableResources` 字段）
- 状态初始化：`src/src/core/state.ts`（新增 `unstableResources` Map 初始化）
- 测试文件：`src/tests/unit/systems/classes/metamorph-enchantments-relics.test.ts`（新建）

### 技术栈要点

- **引擎**: PixiJS v8.16.0（渲染），DOM（UI）
- **语言**: TypeScript
- **RNG**: 使用 `random()` 函数（种子化，日挑战可复现）
- **状态管理**: 三层（MetaState/RunState/BattleState），通过 StateCoordinator 协调
- **事件总线**: TypedEventBus，事件格式 `domain:action`
- **测试**: Vitest 3.x，node 环境，vi.mock/vi.stubGlobal

### 前置 Story 关键产出

- **32-1**: ClassId 枚举含 'metamorph'，ClassManager 运行时管理，starterRelic: 'primal_mutant'
- **32-3**: FeatureGate 系统，蜕变师 loseFeature: 'enchant-choice'，`isFeatureEnabled('enchant-choice')` 返回 false
- **32-7**: 造词师 3 附魔 + 7 遗物完整实现（直接模板），`EnchantmentCategory` 已含 'class-exclusive'
- **32-8**: 隐藏池分割、变异素资源系统、HUD 显示
- **32-9**: 蜕变核心机制（performMetamorph + computeHiddenPool），25 个测试

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.10] — AC 与依赖
- [Source: docs/class-design-metamorph.md#专属附魔/遗物] — 完整设计规格
- [Source: docs/implementation-artifacts/32-7-wordsmith-enchantments-relics.md] — 造词师模板（直接参照）
- [Source: src/src/data/enchantments.ts] — 现有附魔定义 + drawEnchantmentPair 过滤
- [Source: src/src/data/relics.ts] — 现有遗物定义 + primal_mutant 已定义
- [Source: src/src/systems/relicPicker.ts:METAMORPH_EXCLUSIVE_RELICS] — 蜕变师遗物池过滤
- [Source: src/src/systems/shop.ts:applyRandomEnchantment] — 随机附魔已实现
- [Source: src/src/systems/skills.ts:getEnchantmentMultiplier] — 附魔倍率计算扩展点
- [Source: src/src/systems/classes/MetamorphStation.ts:performMetamorph] — 蜕变核心逻辑扩展点
- [Source: src/src/systems/battle.ts:startLevel] — 不稳定初始化 + relicStates 重置点
- [Source: docs/implementation-artifacts/32-9-metamorph-mutation-core.md] — 蜕变核心实现记录

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Icon conflicts found (💉, 🧪) and resolved (→ 🩺, ⚛️) via iconRegistry.test.ts

### Completion Notes List

- Task 1: 3 metamorph enchantments added, drawEnchantmentPair filter uses per-class ID Sets
- Task 2: adapt → growthValues +0.15 per metamorph; unstable → random resource map + match check; mutation_hunger → 5% proc on all skill triggers
- Task 3: 6 new relics defined, METAMORPH_EXCLUSIVE_RELICS updated to 7
- Task 4: ultimate_mutant_strain (2 free/level), gene_stabilizer (per-key tracking via relicStates), fittest_survivors (per-skill relicStates boost)
- Task 5: catalyst_injector (+30% mutagen source converters), chaos_seed (random enchantment on level end)
- Task 6: abyss_eye (hidden pool preview UI), fittest_survivors (+20% production via totalMult)
- Task 7: applyRandomEnchantment verified — already works with updated drawEnchantmentPair
- Task 8: 24 unit tests, all passing
- **Code Review Fixes (adversarial review)**:
  - H1: checkMutationHunger Math.random() → seeded random() for daily challenge reproducibility
  - H2: ultimate_mutant_strain now returns 1 mutagen per metamorph (description updated)
  - H3: Added 5 missing test cases (嗜变×2, 终极突变株返变异素, 混沌种子过滤, 基因稳定器免费)
  - M1: fittest_survivors +20% now applied in triggerAmplifier via relicStates check
  - M2: unstableResources.clear() added to resetResources()
  - M3: gene_stabilizer changed from no-op halving to free re-morph (description updated)
  - Test fix: relics.slots.test.ts zeroPriceRelics updated for 3 new boss-drop legendaries
- Task 8 (post-review): 29 unit tests, all passing

### Change Log

- `src/src/data/enchantments.ts` — Added 3 metamorph class-exclusive enchantments + per-class drawEnchantmentPair filter
- `src/src/data/relics.ts` — Added 6 new metamorph relics
- `src/src/core/types.ts` — Added `unstableResources: Map<string, ResourceType>` to GameState
- `src/src/core/state.ts` — Initialized unstableResources in createInitialState
- `src/src/systems/skills.ts` — getEnchantmentMultiplier (adapt/unstable), getSkillOutputResource helper, checkMutationHunger, catalyst_injector in triggerConverter, fittest_survivors in totalMult
- `src/src/systems/classes/MetamorphStation.ts` — Reworked performMetamorph cost (ultimate/primal/stabilizer), adapt growth, fittest_survivors marking, abyss_eye UI, updated info display
- `src/src/systems/battle.ts` — unstable init at startLevel, relic state resets, chaos_seed at endLevel, imported applyRandomEnchantment
- `src/src/systems/shop.ts` — Exported applyRandomEnchantment
- `src/src/systems/relicPicker.ts` — Updated METAMORPH_EXCLUSIVE_RELICS to 7 IDs
- `src/tests/unit/data/iconRegistry.test.ts` — Updated total count 256→265
- `src/tests/unit/data/enchantments.test.ts` — Updated counts 38→41, 3→6
- `src/tests/unit/systems/classes/wordsmith-enchantments-relics.test.ts` — Updated class-exclusive count 3→6
- `src/tests/unit/systems/relics/relics.test.ts` — Updated counts 43→49, rare 25→28, legendary 12→15

### File List

- src/src/data/enchantments.ts
- src/src/data/relics.ts
- src/src/core/types.ts
- src/src/core/state.ts
- src/src/systems/skills.ts
- src/src/systems/classes/MetamorphStation.ts
- src/src/systems/battle.ts
- src/src/systems/shop.ts
- src/src/systems/relicPicker.ts
- src/tests/unit/systems/classes/metamorph-enchantments-relics.test.ts (NEW)
- src/tests/unit/data/iconRegistry.test.ts
- src/tests/unit/data/enchantments.test.ts
- src/tests/unit/systems/classes/wordsmith-enchantments-relics.test.ts
- src/tests/unit/systems/relics/relics.test.ts
- src/tests/unit/systems/relics/relics.slots.test.ts
