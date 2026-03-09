# Story 32.7: 造词师 — 专属附魔 + 专属遗物

Status: done

## Story

As a 造词师玩家,
I want 专属附魔和遗物来强化我的碎片+造词构建路线,
so that 造词师职业拥有独特的 build 策略与身份感，与通用池形成差异化体验。

## Acceptance Criteria

1. 3 个专属附魔（丰收、字母亲和、满溢）定义在 `ENCHANTMENTS` 中，category 为 `'class-exclusive'`，仅造词师可获取
2. 7 个专属遗物定义在 `RELICS` 中，仅造词师 Run 可出现（`classId === 'wordsmith'` 过滤）
3. 学徒笔记作为造词师 starterRelic 在选职时自动获得，授予元音碎片各×3
4. 大师词典（legendary）获得时全字母×2 + 队列长度 +2（`getMaxQueueLength()` 扩展）
5. 永动队列在每关战斗开始时自动触发一轮完整队列采集
6. 精炼透镜使 fragment→其他资源 的转化者读数 +30%
7. 共鸣字模使造词时重复字母不收金币（override `calculateCraftCost` 金币部分）
8. 拆词剪刀在造词台已造词列表添加「拆解」按钮，返还 50% 碎片（向下取整）
9. 碎片棱镜使队列每格同时产出相邻字母碎片（A→A+B, Z→Y+Z, 其他→X-1+X+X+1）
10. 所有附魔和遗物有完整单元测试（数据完整性 + 机制正确性 + 池过滤）

## Tasks / Subtasks

- [x] Task 1: 附魔数据定义 + 类型扩展 + 池过滤 (AC: #1)
  - [x] 1.1 `types.ts` — `EnchantmentCategory` 联合类型添加 `'class-exclusive'`
  - [x] 1.2 `enchantments.ts` — 添加 3 个附魔定义：`ench_harvest`（丰收）、`ench_letter_affinity`（字母亲和）、`ench_overflow`（满溢），category 均为 `'class-exclusive'`
  - [x] 1.3 `enchantments.ts` — `drawEnchantmentPair()` 过滤：非造词师时排除 `category === 'class-exclusive'` 附魔；造词师时将 class-exclusive 附魔加入抽取池
  - [x] 1.4 为 3 个附魔选取唯一 icon（必须通过 iconRegistry 跨类型查重测试）

- [x] Task 2: 附魔触发逻辑 (AC: #1)
  - [x] 2.1 丰收 — `skills.ts` 新增 `checkHarvestAccumulation()`：检测技能是否有 `ench_harvest` 附魔，如有则读取 `state.growthValues[skillId]` 作为累计倍率。在 `craftWord()` 成功后遍历所有 enchanted skills，对 harvest 附魔的技能 `growthValues += 0.08`
  - [x] 2.2 `CraftingStation.ts` — `craftWord()` 成功后调用 harvest 累计钩子（import 并调用 `onWordCrafted()` 或直接内联）
  - [x] 2.3 字母亲和 — `skills.ts` `getEnchantmentMultiplier()` 扩展：当附魔为 `ench_letter_affinity` 时，检查 `state.fragmentQueue` 是否包含该技能绑定的键位字母，如包含则返回 `1 + 0.25`
  - [x] 2.4 满溢 — `skills.ts` `getEnchantmentMultiplier()` 扩展：当附魔为 `ench_overflow` 时，计算 `state.fragmentInventory` 中 ≥15 的字母数量 N，返回 `1 + 0.20 + max(0, N-1) * 0.05`

- [x] Task 3: 遗物数据定义 + 池过滤 (AC: #2)
  - [x] 3.1 `relics.ts` — 更新现有 `apprentice_notes` 占位符为完整定义（common, basePrice=0），添加 6 个新遗物定义
  - [x] 3.2 `relics.ts` — 为每个遗物选取唯一 icon（必须通过 iconRegistry 查重）
  - [x] 3.3 `relicPicker.ts` — `generateRelicCandidates()` 过滤：添加 `WORDSMITH_EXCLUSIVE_RELICS` 集合，非造词师排除这些 ID；造词师时加入候选池
  - [x] 3.4 大师词典限定 boss 奖励池（rarity=legendary, 仅在 boss 节点胜利后出现）

- [x] Task 4: 学徒笔记 + 大师词典 (AC: #3, #4)
  - [x] 4.1 `RelicPipeline.ts` — `initRelicState('apprentice_notes')`：获得时立即向 `state.fragmentInventory` 写入 a/e/i/o/u 各 +3
  - [x] 4.2 验证 `ClassManager.selectClass('wordsmith')` 已通过 `starterRelic: 'apprentice_notes'` 自动添加（Story 32.1 已实现）
  - [x] 4.3 `RelicPipeline.ts` — `initRelicState('masters_lexicon')`：获得时向 `state.fragmentInventory` 全26字母各 +2
  - [x] 4.4 `FragmentQueue.ts` — `getMaxQueueLength()` 扩展：检查 `state.player.relics.includes('masters_lexicon')`，如有则 +2
  - [x] 4.5 `setFragmentQueue()` 无需改动（已自动受 `getMaxQueueLength()` 约束）

- [x] Task 5: 永动队列 + 精炼透镜 (AC: #5, #6)
  - [x] 5.1 永动队列 — `RELIC_MODIFIER_DEFS['perpetual_queue']`：在 `battle_start` trigger 时调用 `distributeFragments(1)` 执行一轮完整队列采集，使用当前队列状态
  - [x] 5.2 精炼透镜 — `RELIC_MODIFIER_DEFS['refining_lens']`：在 `on_skill_trigger` 时检测是否为 converter 且 input=fragment，如是则对 converter 读数 ×1.3
  - [x] 5.3 替代方案：精炼透镜可在 `skills.ts` `getSourceValue()` 中检查遗物并修改读数，选择最简洁的集成点

- [x] Task 6: 共鸣字模 + 拆词剪刀 (AC: #7, #8)
  - [x] 6.1 共鸣字模 — `CraftingStation.ts` `calculateCraftCost()` 扩展：检查 `state.player.relics.includes('resonance_mold')`，如有则 gold 强制为 0
  - [x] 6.2 拆词剪刀 — `CraftingStation.ts` `renderCraftedWordList()` 扩展：当持有 `word_scissors` 遗物时，每个已造词旁显示「拆解」按钮
  - [x] 6.3 拆词剪刀 — 新增 `deconstructWord(word: string, onGoldUpdate: () => void)` 函数：计算 `calculateCraftCost(word.split(''))` 获取碎片需求，返还 `Math.floor(count * 0.5)` 到 `fragmentInventory`，从 `craftedWords` 和 `wordDeck` 移除该词
  - [x] 6.4 拆解后重新渲染造词台面板

- [x] Task 7: 碎片棱镜 (AC: #9)
  - [x] 7.1 `FragmentQueue.ts` — `distributeFragments()` 扩展：检查 `state.player.relics.includes('fragment_prism')`，如有则每个队列格产出字母时同时产出相邻字母（字母表顺序：A→B, Z→Y, 其他→前后各一）
  - [x] 7.2 边界处理：A 只产 A+B，Z 只产 Y+Z，其他字母产 (letter-1)+(letter)+(letter+1)
  - [x] 7.3 跳过格 (`_`) 不受棱镜影响
  - [x] 7.4 每个相邻字母产出量与原字母相同（共享同一 amount）

- [x] Task 8: 单元测试 (AC: #10)
  - [x] 8.1 附魔数据完整性测试（id/name/icon/category/effectValue/desc 齐全）
  - [x] 8.2 附魔 icon 跨类型唯一性（iconRegistry.test.ts 自动覆盖）
  - [x] 8.3 丰收触发测试：craftWord 后 growthValues 增加 0.08
  - [x] 8.4 字母亲和测试：队列含绑定键字母时 multiplier=1.25，不含时=1.0
  - [x] 8.5 满溢测试：0个字母≥15→1.0，1个→1.20，2个→1.25，3个→1.30
  - [x] 8.6 遗物数据完整性测试（id/name/icon/description/rarity/basePrice/effects）
  - [x] 8.7 学徒笔记测试：initRelicState 后 a/e/i/o/u 各+3
  - [x] 8.8 大师词典测试：initRelicState 后全字母+2，getMaxQueueLength() 返回 8
  - [x] 8.9 共鸣字模测试：calculateCraftCost 金币为 0（有遗物时）
  - [x] 8.10 拆词剪刀测试：deconstructWord 返还 50% 碎片（向下取整），词从 craftedWords 移除
  - [x] 8.11 碎片棱镜测试：distributeFragments 产出包含相邻字母
  - [x] 8.12 池过滤测试：非造词师不出现 class-exclusive 附魔/遗物

## Dev Notes

### 附魔系统集成

**现有附魔类型（35个）**：
- spatial（30个）：growth/splash/resonance/repulsion/devour × 6 positionRelation
- transmutation（4个）：base/score/multiplier/time
- independent（1个）：mastery

**新增 `'class-exclusive'` 类别**：3 个造词师专属附魔不进入通用池，需在 `drawEnchantmentPair()` 中按 `state.classId` 过滤。

**附魔触发集成点**（`skills.ts`）：
- `getEnchantmentMultiplier(skillId, triggerKey)` — 字母亲和 + 满溢在此计算倍率
- Growth 机制（丰收）复用 `state.growthValues[skillId]` 存储，与现有 growth 附魔共享基础设施
- 丰收的累计触发点在 `craftWord()` 而非技能触发时

**关键函数签名**：
```typescript
// enchantments.ts — 现有接口
export function drawEnchantmentPair(skillRelation?: PositionRelation): [string, string]

// skills.ts — 需扩展
export function getEnchantmentMultiplier(skillId: string, triggerKey?: string): number
// 已有 growth/mastery/devour/repulsion 分支，新增 letter_affinity + overflow 分支

// CraftingStation.ts — craftWord() 成功后需触发 harvest 钩子
```

### 遗物系统集成

**遗物定义模式**（`relics.ts`）：
```typescript
{ id: 'relic_id', name: '名称', icon: '🔮', description: '效果描述',
  rarity: 'common'|'rare'|'legendary', basePrice: N, effects: [...] }
```

**遗物效果管道**（`RelicPipeline.ts`）：
- `RELIC_MODIFIER_DEFS[relicId]` — 返回 `Modifier[]` 的工厂函数
- `initRelicState(relicId)` — 获得时初始化状态（`INITIAL_VALUES` 表）
- `queryRelicFlag(flag)` — 非 modifier 类遗物的行为查询

**relicStates 存储**：`state.player.relicStates[relicId] = number`，跨关保持。

**池过滤集成点**：
- `relicPicker.ts` — `generateRelicCandidates()` 中添加 `WORDSMITH_EXCLUSIVE_RELICS` 集合过滤
- 大师词典限定 boss 奖励池（检查 `isBossNode` 条件 或 rarity=legendary 自然限定）

### 碎片队列扩展

**`FragmentQueue.ts` 现状**：
```typescript
const BASE_QUEUE_LENGTH = 6;
export function getMaxQueueLength(): number {
  // TODO Story 32.7: relic extension
  return BASE_QUEUE_LENGTH;
}
```

扩展方式：检查 `state.player.relics.includes('masters_lexicon')`，如有则 +2。`setFragmentQueue()` 和 `renderQueueEditor()` 已通过 `getMaxQueueLength()` 动态获取长度，无需改动。

### 碎片棱镜 — 相邻字母产出

**字母表相邻定义**（非键盘拓扑，是字母表顺序）：
```
A → [A, B]       (左边界)
B → [A, B, C]    (正常)
...
Y → [X, Y, Z]    (正常)
Z → [Y, Z]       (右边界)
```

集成点在 `FragmentQueue.ts` — `distributeFragments()` 中，当分配到字母 X 时，如果持有棱镜遗物，同时写入 X-1 和 X+1 到 `fragmentInventory`。

### 拆词剪刀 — UI 集成

在 `CraftingStation.ts` `renderCraftedWordList()` 中，当 `state.player.relics.includes('word_scissors')` 时：
- 每个已造词 tag 旁添加「✂ 拆解」按钮
- 点击后调用 `deconstructWord(word, cachedGoldUpdate)`
- 返还碎片计算：对每个字母 `Math.floor(originalCount * 0.5)`
- 从 `state.craftedWords` 和 `state.player.wordDeck` 移除该词

### 学徒笔记 — starterRelic 自动授予

`CLASS_DEFINITIONS['wordsmith']` 已有 `starterRelic: 'apprentice_notes'`（Story 32.1 实现）。`ClassManager.selectClass()` 调用 `addRelicWithCapacity(def.starterRelic)` → 触发 `initRelicState('apprentice_notes')` → 此处实现碎片授予。

### 精炼透镜 — 转化者读数增强

集成点选择：
- **方案 A**：在 `skills.ts` `triggerConverter()` 的 `getSourceValue()` 调用后，检查遗物并 ×1.3
- **方案 B**：在 `RELIC_MODIFIER_DEFS` 中作为 `on_skill_trigger` modifier
- **推荐方案 A**：更直接，避免 modifier 管道的复杂性。只需在 converter input=fragment 时 `sourceValue *= 1.3`

### 关键反模式防范

1. **Icon 重复**：Story 32-5 发现 3 个图标跨类型冲突。所有新 icon 必须通过 `iconRegistry.test.ts` 测试
2. **classResourceProduced vs fragmentInventory**：转化者读 `classResourceProduced.fragment`（累计产出），NOT `fragmentInventory`（实际库存）。精炼透镜增强的是前者的读数
3. **队列长度同步**：`getMaxQueueLength()` 改动后，`state.fragmentQueue` 初始长度仍为 6。大师词典获得后需 `setFragmentQueue([...state.fragmentQueue, '_', '_'])` 追加空格
4. **Growth 值跨关保持**：`state.growthValues` 在 `resetResources()` 中不重置（跨关保持），丰收累计值自然保留

### Project Structure Notes

- 附魔数据：`src/src/data/enchantments.ts`（现有 35 个，新增 3 个）
- 遗物数据：`src/src/data/relics.ts`（现有 ~50 个，新增/更新 7 个）
- 附魔触发：`src/src/systems/skills.ts`（`getEnchantmentMultiplier` 扩展）
- 遗物管道：`src/src/systems/relics/RelicPipeline.ts`（`initRelicState` + `RELIC_MODIFIER_DEFS`）
- 遗物选取：`src/src/systems/relicPicker.ts`（池过滤）
- 队列系统：`src/src/systems/classes/FragmentQueue.ts`（大师词典+碎片棱镜）
- 造词台：`src/src/systems/classes/CraftingStation.ts`（共鸣字模+拆词剪刀+丰收钩子）
- 职业数据：`src/src/data/classes.ts`（starterRelic 已定义）

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.7] — AC 与依赖
- [Source: docs/class-design-wordsmith.md#专属附魔/遗物] — 完整设计规格
- [Source: src/src/data/enchantments.ts] — 现有附魔定义模式（35 个）
- [Source: src/src/data/relics.ts] — 现有遗物定义模式 + apprentice_notes 占位符
- [Source: src/src/systems/skills.ts:getEnchantmentMultiplier] — 附魔倍率计算
- [Source: src/src/systems/relics/RelicPipeline.ts:initRelicState] — 遗物状态初始化
- [Source: src/src/systems/classes/FragmentQueue.ts:getMaxQueueLength] — 队列长度扩展点
- [Source: src/src/systems/classes/CraftingStation.ts:calculateCraftCost] — 金币计算覆盖点
- [Source: src/src/systems/classes/CraftingStation.ts:craftWord] — 丰收触发点
- [Source: docs/implementation-artifacts/32-6-wordsmith-crafting-ui.md] — 造词台实现记录
- [Source: docs/implementation-artifacts/32-5-wordsmith-producers-converters.md] — 产出/转化者模式
- [Source: docs/implementation-artifacts/32-4-wordsmith-fragment-queue.md] — 队列系统实现
- [Source: docs/project-context.md] — 编码规范

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes List
- 3 class-exclusive enchantments added (harvest/letter_affinity/overflow) with pool filtering in drawEnchantmentPair
- 7 wordsmith-exclusive relics added (apprentice_notes updated + 6 new) with pool filtering in generateRelicCandidates
- Icon collisions resolved: 💌 (letter_affinity), 📙 (masters_lexicon), 🔬 (refining_lens), 🧩 (resonance_mold)
- refining_lens implemented via direct sourceVal ×1.3 in triggerConverter/triggerConverterWithReduction (not modifier pipeline)
- perpetual_queue implemented as direct relic check in battle.ts after on_battle_start
- deconstructWord exported from CraftingStation for testing
- 38 new unit tests + updated existing count tests (enchantments 35→38, relics 37→43, icons 217→226)
- Pre-existing test failures (battle-stats 9, actTransition 1) unrelated to this story

### Code Review Fixes (Review 1)
- C1: ench_harvest 成长值未在 getEnchantmentMultiplier 中生效 → 添加 `|| ench.id === 'ench_harvest'` 分支
- C2: perpetual_queue 只采集1碎片 → 改为 `routeFragmentsToInventory(getMaxQueueLength())`
- H1: 添加 perpetual_queue routeFragmentsToInventory 测试
- H2: 添加 refining_lens triggerConverter sourceVal ×1.3 测试
- H3: deconstructWord 退化测试改为 'aaab'（floor(3*0.5)=1 有意义断言）
- M1: getResourceLabel 添加 'fragment'/'mutagen' 分支，移除无效 'shield'
- M2: 共鸣字模激活时 UI 文本改为"0g (共鸣字模)"
- M3: perpetual_queue dummy effects 改为 effects: []
- 新增 harvest getEnchantmentMultiplier 回归测试

### File List
- src/src/core/types.ts — EnchantmentCategory 'class-exclusive'
- src/src/data/enchantments.ts — 3 new enchantments + drawEnchantmentPair filter
- src/src/data/relics.ts — 6 new relics (masters_lexicon/perpetual_queue/refining_lens/word_scissors/resonance_mold/fragment_prism)
- src/src/systems/skills.ts — getEnchantmentMultiplier (letter_affinity/overflow) + onWordCrafted + refining_lens in triggerConverter/triggerConverterWithReduction
- src/src/systems/classes/CraftingStation.ts — resonance_mold in calculateCraftCost + deconstructWord + word_scissors UI
- src/src/systems/classes/FragmentQueue.ts — masters_lexicon in getMaxQueueLength + fragment_prism in distributeFragments
- src/src/systems/relics/RelicPipeline.ts — initRelicState for apprentice_notes + masters_lexicon
- src/src/systems/relicPicker.ts — WORDSMITH_EXCLUSIVE_RELICS + METAMORPH_EXCLUSIVE_RELICS
- src/src/systems/battle.ts — perpetual_queue on battle_start
- tests/unit/systems/classes/wordsmith-enchantments-relics.test.ts — 34 new tests
- tests/unit/data/enchantments.test.ts — count 35→38 + class-exclusive section
- tests/unit/data/iconRegistry.test.ts — count 217→226
- tests/unit/systems/relics/relics.test.ts — counts + price range updates
- tests/unit/systems/relics/relics.slots.test.ts — zero-price relics set update
