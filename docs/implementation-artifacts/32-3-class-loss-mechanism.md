# Story 32.3: 职业「失去」机制框架

Status: done

## Story

As a 玩家,
I want 选择职业后自动失去对应能力（造词师失去牌包、蜕变师失去附魔选择权），
so that 职业选择有代价感，而非纯加法式强化。

## Acceptance Criteria

1. FeatureGate 系统：根据当前职业 `state.classId` 决定功能是否可用
   ```typescript
   isFeatureEnabled('pack-system')    // 造词师 → false，其他 → true
   isFeatureEnabled('enchant-choice') // 蜕变师 → false，其他 → true
   ```
2. 商店系统读取 FeatureGate 决定是否显示牌包 tab（`words-tab`）
3. 附魔系统读取 FeatureGate 决定 Lv3 附魔是二选一还是随机
4. 无职业（`classId === 'none'`）时所有 feature 默认 enabled
5. 失去的能力有 UI 提示（灰色 + tooltip 说明原因）

## Tasks / Subtasks

- [x] Task 1: FeatureGate 模块 (AC: #1, #4)
  - [x] 1.1 创建 `src/src/systems/classes/ClassFeatureGate.ts`
  - [x] 1.2 实现 `isFeatureEnabled(feature: FeatureId): boolean` — 读取 `state.classId`，查 `CLASS_DEFINITIONS[classId].loseFeature`，若匹配则返回 false
  - [x] 1.3 实现 `getFeatureLostReason(feature: FeatureId): string | null` — 返回 `loseDescription` 供 UI tooltip 使用
  - [x] 1.4 导出常量 `FEATURE_LABELS: Record<FeatureId, string>` 用于 UI 展示

- [x] Task 2: 商店牌包 tab 门控 (AC: #2, #5)
  - [x] 2.1 `shop.ts` `initStatsTabs()`: 调用 `isFeatureEnabled('pack-system')`，若 false 则隐藏 `words-tab`（`display: none`）+ tooltip
  - [x] 2.2 `shop.ts` `generateShopItems()`: 当 `isFeatureEnabled('pack-system')` 为 false 时跳过牌包池生成（`packPool` 保持空数组）
  - [x] 2.3 确保 `switchTab` 不会切换到被禁用的 tab（onclick 门控检查）

- [x] Task 3: 附魔随机化门控 (AC: #3, #5)
  - [x] 3.1 `shop.ts` `checkAutoEnchantment()`: 当 `isFeatureEnabled('enchant-choice')` 为 false 时，调用 `applyRandomEnchantment()` 替代 `renderEnchantmentModal()`
  - [x] 3.2 `applyRandomEnchantment()`: 使用 `drawEnchantmentPair()` + `random()` 选择，显示「🎲 随机附魔!」反馈
  - [x] 3.3 `showEnchantmentQueue()`: 蜕变师时逐个调用 `applyRandomEnchantment()` 并递归推进队列

- [x] Task 4: UI 提示 (AC: #5)
  - [x] 4.1 造词师模式下 `words-tab` 隐藏（`display: none`）+ `title` 设为 `loseDescription`
  - [x] 4.2 蜕变师模式下附魔获取时显示「🎲 随机附魔!」+ 附魔名称（替代二选一模态框）

- [x] Task 5: 单元测试 (AC: 全部)
  - [x] 5.1 ClassFeatureGate.test.ts：isFeatureEnabled 6 种 classId × featureId 组合（13 tests total）
  - [x] 5.2 ClassFeatureGate.test.ts：getFeatureLostReason 5 种组合（返回描述/null）
  - [x] 5.3 回归测试：classId === 'none' 时 pack-system 和 enchant-choice 均返回 true

## Dev Notes

### 关键架构约束

- **低复杂度 Story**：核心是一个简单的条件查询函数 + 两处消费端（shop tab、enchantment modal）。不涉及新的数据结构或资源流。
- **零侵入原则**：`classId === 'none'` 时行为完全不变。FeatureGate 应是纯查询函数，不存储额外状态。
- **数据驱动**：不要 hardcode `'wordsmith'` 或 `'metamorph'`。用 `CLASS_DEFINITIONS[state.classId].loseFeature` 判断，未来新增职业时自动生效。
- **文件位置**：`ClassFeatureGate.ts` 放在 `src/src/systems/classes/` 下，与 `ClassResourceFilter.ts` 平级。该目录已存在 ClassManager.ts、ClassPicker.ts、ClassResourceFilter.ts。
- **依赖方向**：`ClassFeatureGate.ts` 仅依赖 `types.ts`（FeatureId）和 `data/classes.ts`（CLASS_DEFINITIONS）+ `core/state.ts`（state.classId）。shop.ts 消费 ClassFeatureGate。禁止反向依赖。

### 现有代码模式（必须遵循）

**FeatureId 类型定义（`types.ts:10`）：**
```typescript
export type FeatureId = 'pack-system' | 'enchant-choice';
```
已定义，无需新增。

**ClassDefinition 已有字段（`data/classes.ts`）：**
```typescript
interface ClassDefinition {
  loseFeature: FeatureId | null;      // 'pack-system' | 'enchant-choice' | null
  loseDescription: string | null;      // 中文描述
}
// wordsmith.loseFeature = 'pack-system'
// metamorph.loseFeature = 'enchant-choice'
// none.loseFeature = null
```
数据已在 Story 32.1 定义完毕，本 Story 只需读取。

**商店 Tab 系统（`shop.ts:1619-1644`）：**
```typescript
function initStatsTabs(): void {
  const wordsTab = document.getElementById('words-tab');
  // ...
  function switchTab(active: 'build' | 'stats' | 'words') {
    wordsTab!.classList.toggle('active', active === 'words');
    wordPanel!.style.display = active === 'words' ? '' : 'none';
    if (active === 'words') renderWordInventory();
  }
  wordsTab.onclick = () => switchTab('words');
}
```
HTML 中 `<span id="words-tab" class="build-tab">📚 词库</span>`（`index.html:89`）。
隐藏方案：`wordsTab.style.display = 'none'` 即可阻止用户看到和点击。

**附魔触发流程（`shop.ts:734-776`）：**
```typescript
// 升级到 Lv3 触发附魔
function checkAutoEnchantment(skillId: string): void {
  if (data.level < 3) return;
  if (queryRelicFlag('enchant_lock') === true) { ... return; }
  if (state.player.enchantedSkills.has(skillId)) return;
  renderEnchantmentModal(skillId);  // ← 弹二选一 UI
}

// 补偿性批量附魔（商店外升级导致的）
function checkPendingEnchantments(): void {
  if (queryRelicFlag('enchant_lock') === true) return;
  // 收集所有 Lv3+ 未附魔技能
  showEnchantmentQueue(pending, 0);  // ← 逐个弹二选一 UI
}

function showEnchantmentQueue(queue, index): void {
  renderEnchantmentModal(skillId, () => showEnchantmentQueue(queue, index + 1));
}
```

**附魔二选一 UI（`shop.ts:852-913`）：**
```typescript
function renderEnchantmentModal(skillId: string, onClose?: () => void): void {
  const [enchA, enchB] = drawEnchantmentPair(skillRelation);
  // 渲染两张卡让用户点选
  card.onclick = () => applyEnchantment(skillId, ench.id);
}
```

**随机附魔实现方案：**
当 `isFeatureEnabled('enchant-choice')` 为 false 时，在 `checkAutoEnchantment` 和 `showEnchantmentQueue` 中：
```typescript
// 替代渲染模态框，直接随机
const skillRelation = isAmplifier(skillId) ? AMPLIFIERS[skillId].positionRelation : undefined;
const [enchA, enchB] = drawEnchantmentPair(skillRelation);
const chosen = random() < 0.5 ? enchA : enchB;
applyEnchantment(skillId, chosen);
```
注意：用 `random()`（seeded random，`core/seededRandom.ts`）而非 `Math.random()`，保证种子一致性。

**applyEnchantment 函数（`shop.ts:915-936`）：**
已封装好附魔应用逻辑（写入 state、触发遗物钩子、播放音效）。随机附魔直接调用即可。

**ClassResourceFilter.ts 模式参考：**
```typescript
// 现有模式：简单查询函数 + state 读取
import { state } from '../../core/state';
import { CLASS_DEFINITIONS } from '../../data/classes';
export function isResourceActiveForClass(resource: ResourceType, classId: ClassId): boolean { ... }
```
ClassFeatureGate.ts 应遵循相同的函数签名风格和导入模式。

### 商店牌包池过滤

`generateShopItems()` 中牌包池生成代码（`shop.ts:311-320`）：
```typescript
const packs = generateWordPacks(state.player.wordDeck, playerFreqs, boundKeys, 8, act);
for (const pack of packs) {
  packPool.push({ ... type: 'pack', pack, cost: getAdjustedPrice(pack.cost), ... });
}
```
当 pack-system 被禁用时，跳过这段代码（`packPool` 保持为空 `[]`），后续混合逻辑自然不会生成牌包商品。

### drawEnchantmentPair 使用 Math.random

注意：`drawEnchantmentPair()` 内部使用 `Math.random()`（`enchantments.ts:88-90`）。这是现有行为，随机附魔也复用此函数。若需种子一致性，未来可单独改，本 Story 不需要处理。选择 enchA 还是 enchB 时用 `random()`。

### 不需要修改的文件

- `types.ts` — FeatureId 已定义
- `data/classes.ts` — loseFeature/loseDescription 已填充
- `index.html` — DOM 结构不变，通过 JS 动态隐藏
- `state.ts` — 无新状态字段
- `core/constants.ts` — 无新常量

### Project Structure Notes

新增文件：
```
src/src/systems/classes/
└── ClassFeatureGate.ts   # isFeatureEnabled(), getFeatureLostReason()
tests/unit/systems/classes/
└── ClassFeatureGate.test.ts
```

修改文件：
```
src/src/systems/shop.ts   # initStatsTabs() + generateShopItems() + checkAutoEnchantment() 门控
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.3] — 验收标准
- [Source: src/src/core/types.ts:10] — `FeatureId` 类型定义
- [Source: src/src/data/classes.ts:19,46,56] — `loseFeature` 字段定义和数据
- [Source: src/src/systems/shop.ts:1619-1644] — `initStatsTabs()` tab 切换系统
- [Source: src/src/systems/shop.ts:734-776] — `checkAutoEnchantment()` / `checkPendingEnchantments()` / `showEnchantmentQueue()`
- [Source: src/src/systems/shop.ts:852-913] — `renderEnchantmentModal()` 附魔二选一 UI
- [Source: src/src/systems/shop.ts:915-936] — `applyEnchantment()` 附魔应用逻辑
- [Source: src/src/systems/shop.ts:311-320] — 牌包池生成代码
- [Source: src/src/data/enchantments.ts:79-92] — `drawEnchantmentPair()`
- [Source: src/src/systems/classes/ClassResourceFilter.ts] — 同目录模式参考
- [Source: src/index.html:87-89] — 商店 tab DOM 结构
- [Source: docs/implementation-artifacts/32-2-class-resource-pipeline.md] — 前序 Story 实现记录

### Git Intelligence

最近提交：
```
ef012f9 feat: Story 32-2 职业专属资源管道（fragment/mutagen ResourceType扩展+池过滤+库存追踪）+ code review修复
6156b92 refactor: 音效系统重构准备
39a3d56 feat: Story 32-1 职业定义框架 + 选择界面
```
模式：`feat/fix + Story 编号 + 中文描述 + 括号内关键实现细节`

### Previous Story Intelligence

Story 32-2（职业专属资源管道）关键教训：
- **ClassResourceFilter.ts 模式**：简单查询函数放在 `systems/classes/` 目录，只依赖 types + data 层，不引入循环依赖
- **数据驱动替代硬编码**：code review 发现 shop.ts 中硬编码 `state.classId === 'wordsmith'` 的检查，改为 `CLASS_DEFINITIONS[classId].uniqueResource`。同理，本 Story 应用 `CLASS_DEFINITIONS[classId].loseFeature` 而非硬编码
- **测试计数断言**：新增文件/条目可能影响 iconRegistry.test.ts 等计数测试。本 Story 不新增图标/资源，影响应最小
- **seeded random**：用 `random()`（`core/seededRandom.ts`）而非 `Math.random()`，保证确定性
- **DOM 环境**：Vitest + node 环境（无 jsdom），DOM 操作需 mock。但本 Story 的测试主要测纯函数（isFeatureEnabled），不需要 DOM mock

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — no blocking issues encountered.

### Completion Notes List

- ClassFeatureGate.ts 纯查询模式：不存储状态，每次调用读取 CLASS_DEFINITIONS[state.classId].loseFeature
- 数据驱动：无任何 'wordsmith'/'metamorph' 硬编码，通过 loseFeature 字段自动匹配
- applyRandomEnchantment() 复用 drawEnchantmentPair() + random() 选择，使用 seeded random 保证确定性
- words-tab 隐藏而非灰色禁用，因为造词师未来会用造词台 tab 替换（Story 32.6）
- 2 个预存在的测试失败（battle-stats.test.ts calculateRating 签名变更 + actTransition.test.ts ScoreRoller），与本 Story 无关

### Code Review Fixes (2026-03-08)

- **[H1]** applyRandomEnchantment 双重 showFeedback：改为内联核心逻辑（状态写入+遗物钩子+单次feedback），不再调用 applyEnchantment
- **[M1]** 随机路径不再调用 closeEnchantmentModal（无模态框）和 _enchantmentOnClose（无残留回调风险）
- **[M2]** 批量随机附魔：applyRandomEnchantment 不做 re-render，checkPendingEnchantments 批量结束后统一 renderUnifiedShop + renderBuildManager
- **[L1]** FEATURE_LABELS 测试改为断言实际值（'牌包系统'/'附魔选择权'）

### File List

**新增文件：**
- `src/src/systems/classes/ClassFeatureGate.ts` — isFeatureEnabled(), getFeatureLostReason(), FEATURE_LABELS
- `tests/unit/systems/classes/ClassFeatureGate.test.ts` — 13 个用例

**修改文件：**
- `src/src/systems/shop.ts` — import ClassFeatureGate + generateShopItems 牌包门控 + initStatsTabs 隐藏 words-tab + checkAutoEnchantment/showEnchantmentQueue 随机附魔 + applyRandomEnchantment 新函数
