# Story 32.6: 造词师 — 造词台 UI + 造词逻辑

Status: done

## Story

As a 造词师玩家,
I want 在商店的造词台标签页中编辑采集队列、查看碎片库存、逐字母拼词并消耗碎片和金币造词,
so that 我可以利用战斗中积累的字母碎片自由构建专属词库，体验"精密工程师"般的词语设计乐趣。

## Acceptance Criteria

1. 商店新增「造词台」tab，替换牌包 tab（依赖 32.3 FeatureGate：`isFeatureEnabled('pack-system') === false` 时显示造词台 tab，隐藏词包 tab）
2. 造词台界面包含 5 个组件区域：
   - 采集队列编辑区（点击格子 → 字母选择器弹窗 → 选字母设置）
   - 当前碎片库存展示（26 字母网格 + 每字母数量）
   - 造词输入区（逐字母点击添加/移除，实时拼词）
   - 消耗预览（碎片消耗 + 金币消耗，金币按重复字母递增公式计算）
   - 已造词列表（本 Run 已造的词展示）
3. 造词金币消耗规则：碎片 1:1 线性消耗 + 重复字母金币递增（无重复=0g, 第2次出现=5g, 第3次=15g, 第4次=30g）
4. 造出的词通过 `state.player.wordDeck.push(word)` 进入当前 Run 词库，与普通词无差异
5. 造词操作不可撤销（确认后碎片和金币立即扣除）
6. 碎片不足 / 金币不足时确认按钮灰色 + 提示文字说明缺什么

## Tasks / Subtasks

- [x] Task 1: 造词台 tab 集成到商店 (AC: #1)
  - [x] 1.1 `shop.ts` — `initStatsTabs()` 中新增 `craft-tab` 按钮（造词台 tab），当 `!isFeatureEnabled('pack-system')` 时显示造词台 tab 并隐藏 words tab（已有逻辑）
  - [x] 1.2 `shop.ts` — `switchTab()` 扩展支持 `'craft'` 选项，控制 `craft-panel` 的显示/隐藏
  - [x] 1.3 `index.html`（或 shop 模板）— 在 shop 区域新增 `<div id="craft-tab">` 按钮 + `<div id="craft-panel">` 面板容器
  - [x] 1.4 `shop.ts` — `openShop()` 中默认 build tab（造词师通过 craft tab 手动切换）

- [x] Task 2: 采集队列编辑区 UI (AC: #2)
  - [x] 2.1 新建 `src/systems/classes/CraftingStation.ts` — `renderQueueEditor()` 函数
  - [x] 2.2 渲染当前队列格子（读 `state.fragmentQueue`，长度 `getMaxQueueLength()`），每格显示字母或 `·`（跳过）
  - [x] 2.3 点击格子 → 弹出字母选择器（26 字母 + `_` 跳过选项）
  - [x] 2.4 选择字母后调用 `setFragmentQueue(newQueue)` 更新队列并重新渲染
  - [x] 2.5 队列编辑区添加 CSS 样式（格子高亮、当前位置指示器）

- [x] Task 3: 碎片库存展示 (AC: #2)
  - [x] 3.1 `renderFragmentInventory()` — 渲染 26 字母网格，每格显示字母 + `state.fragmentInventory[letter]` 数量
  - [x] 3.2 数量为 0 的字母灰色显示，有库存的正常高亮
  - [x] 3.3 库存变化时（造词后）自动刷新（整个面板重渲染）

- [x] Task 4: 造词输入区 + 消耗预览 (AC: #2, #3, #6)
  - [x] 4.1 `renderWordBuilder()` — 渲染造词输入区：当前拼词显示 + 字母选择按钮
  - [x] 4.2 点击碎片库存中的字母 → 添加到当前拼词（需库存充足）
  - [x] 4.3 点击拼词中的字母 → 移除该字母（退回碎片预览）
  - [x] 4.4 `calculateCraftCost(word)` — 计算造词消耗：碎片 1:1 + 金币递增公式
  - [x] 4.5 消耗预览实时显示：碎片消耗列表 + 金币总消耗
  - [x] 4.6 碎片不足标红 + 金币不足标红 + 确认按钮灰色禁用 + 提示文字

- [x] Task 5: 造词确认逻辑 (AC: #3, #4, #5)
  - [x] 5.1 `craftWord(word)` — 核心造词函数：验证碎片 + 金币充足 → 扣碎片 → 扣金币 → 推入 wordDeck → 记录已造词
  - [x] 5.2 碎片扣除：`state.fragmentInventory[letter] -= count`，逐字母扣减
  - [x] 5.3 金币扣除：`state.gold -= goldCost; updateGoldDisplay()`，通过回调遵循现有模式
  - [x] 5.4 词推入词库：`state.player.wordDeck.push(word.toLowerCase())`
  - [x] 5.5 造词成功后播放音效 `playSound('buy')` + 刷新造词台全部区域
  - [x] 5.6 造词失败（碎片/金币不足）→ `showFeedback('碎片不足!' / '金币不足!', '#ff6b6b')`

- [x] Task 6: 已造词列表 (AC: #2)
  - [x] 6.1 `state` 新增 `craftedWords: string[]` 字段（types.ts + state.ts）
  - [x] 6.2 `renderCraftedWordList()` — 渲染已造词列表，显示每个词
  - [x] 6.3 列表在造词成功后自动更新（面板重渲染）

- [x] Task 7: CSS 样式 (AC: #2)
  - [x] 7.1 造词台面板整体布局（队列区 + 库存区 + 输入区 + 已造词区）
  - [x] 7.2 碎片库存网格样式（字母格子、数量显示、灰色/高亮）
  - [x] 7.3 造词输入区样式（当前拼词、字母选择器、消耗预览）
  - [x] 7.4 字母选择器弹窗样式
  - [x] 7.5 确认按钮正常/禁用状态样式

- [x] Task 8: 单元测试 (AC: #1-#6)
  - [x] 8.1 `calculateCraftCost` 测试：无重复字母=0g、单字母重复=5g、三重复=20g、四重复=50g、超过4次重复=80g、大写转小写
  - [x] 8.2 `craftWord` 测试：碎片正确扣减、金币正确扣减、词进入 wordDeck、craftedWords 累积
  - [x] 8.3 `craftWord` 失败测试：碎片不足拒绝、金币不足拒绝、空字母拒绝、state 无变化
  - [x] 8.4 造词台 tab 可见性测试：造词师/非造词师/蜕变师 isFeatureEnabled 正确
  - [x] 8.5 队列编辑通过 setFragmentQueue API 验证（已有 FragmentQueue 测试覆盖）

## Dev Notes

### 关键架构约束

- **造词台是商店的第 4 个 tab**：现有 3 个 tab（build/stats/words），造词台 tab 在造词师时替换 words tab 位置。`initStatsTabs()` 已有 `isFeatureEnabled('pack-system')` 隐藏 words tab 的逻辑，需新增造词台 tab 的对应显示逻辑。
- **不修改战斗系统**：本 Story 纯 UI 层 + 造词逻辑，不涉及战斗触发管道。
- **遵循现有 DOM 模式**：所有 UI 用 `document.createElement` 动态创建，不依赖框架。样式通过 `style.css` 或内联 style。
- **金币消费模式**：`state.gold -= cost` → `updateGoldDisplay()` → `playSound('buy')`，与商店购买技能/牌包完全一致。

### 现有代码模式（必须遵循）

**商店 tab 切换模式（shop.ts:1669）：**
```typescript
function initStatsTabs(): void {
  const buildTab = document.getElementById('build-tab');
  const statsTab = document.getElementById('stats-tab');
  const wordsTab = document.getElementById('words-tab');
  // ...
  function switchTab(active: 'build' | 'stats' | 'words') {
    buildTab!.classList.toggle('active', active === 'build');
    // ... toggle display for each panel
  }
  // FeatureGate: wordsmith hides words tab
  if (!isFeatureEnabled('pack-system')) {
    wordsTab.style.display = 'none';
  }
}
```

**金币消费模式（shop.ts:591-594）：**
```typescript
if (state.gold < item.cost) {
  showFeedback('金币不足!', '#ff6b6b');
  return;
}
state.gold -= item.cost;
updateGoldDisplay();
playSound('buy');
```

**词推入词库模式（shop.ts:596）：**
```typescript
state.player.wordDeck.push(word);
```

**Fragment Queue API（FragmentQueue.ts）：**
```typescript
export function getMaxQueueLength(): number          // 返回 6
export function setFragmentQueue(letters: string[]): void  // 验证 + 设置队列
// state.fragmentQueue: string[]         — 队列字母序列 ['e','a','t','_','_','_']
// state.fragmentInventory: Record<string,number>  — 26 字母库存 {a:0, b:3, ...}
```

**updateGoldDisplay 函数位于 shop.ts 内部（line 169）：**
```typescript
function updateGoldDisplay(): void {
  const el = getElements();
  el.shopGold.textContent = String(state.gold);
}
```
注意：此函数不是 exported。如果 CraftingStation.ts 需要更新金币显示，需要通过导出或重渲染商店实现。

### 金币递增公式详解

造词中每个**不同字母**的第 1 次出现免费，同一字母重复出现时按次数递增：

| 字母出现次数 | 该次金币成本 |
|-------------|------------|
| 第 1 次 | 0g |
| 第 2 次 | 5g |
| 第 3 次 | 15g |
| 第 4 次 | 30g |

示例：
- `eat`（无重复）→ 0g
- `see`（e×2）→ 5g
- `eee`（e×3）→ 5 + 15 = 20g
- `teen`（e×2）→ 5g
- `teeth`（e×2, t×2）→ 5 + 5 = 10g
- `eeee`（e×4）→ 5 + 15 + 30 = 50g

### 造词台 UI 布局参考

```
┌─────────────────────────────────────────┐
│  🔤 造词台                               │
├─────────────────────────────────────────┤
│  采集队列 [E][E][A][T][ ][ ]  ✏️编辑    │
│  当前库存: E×12  A×8  T×5  S×3  ...     │
├─────────────────────────────────────────┤
│  📝 造词                                │
│  输入: [E][A][T]                        │
│  消耗: E×1 A×1 T×1                     │
│  金币: 0g (无重复字母)                   │
│  [确认造词]                              │
├─────────────────────────────────────────┤
│  已造词: eat, see, test                 │
└─────────────────────────────────────────┘
```

### 新建文件 vs 扩展现有文件

推荐新建 `src/systems/classes/CraftingStation.ts` 存放造词台渲染和造词逻辑，原因：
1. `shop.ts` 已超 1700 行，不宜继续膨胀
2. 造词台是造词师专属功能，放在 `classes/` 目录下符合职业系统的文件组织
3. `shop.ts` 仅需在 `initStatsTabs` 中调用 `renderCraftPanel()` 入口函数

需要从 shop.ts 导出或共享的函数：
- `updateGoldDisplay()`：造词扣金币后需更新显示（或通过 `renderUnifiedShop()` 间接刷新）
- `showFeedback()`：来自 `battle.ts`，已全局可用
- `playSound()`：来自 `effects/sound.ts`，已全局可用

### craftedWords 状态追踪

两种方案：
- **方案 A（推荐）**：`state` 新增 `craftedWords: string[]` 字段，Run 结束清零。简单直接。
- **方案 B**：通过比对 `wordDeck` 和 `getStarterWords()` + pack 购买记录推算。复杂且不可靠。

### Project Structure Notes

新建文件：
```
src/src/systems/classes/CraftingStation.ts  # 造词台 UI 渲染 + 造词逻辑
tests/unit/systems/classes/CraftingStation.test.ts  # 造词逻辑单元测试
```

修改文件：
```
src/src/systems/shop.ts           # initStatsTabs 扩展 craft tab + switchTab
src/index.html                    # 新增 craft-tab 按钮 + craft-panel 容器
src/src/style.css                 # 造词台样式
src/src/core/state.ts             # +craftedWords 字段（如方案 A）
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.6] — 验收标准
- [Source: docs/class-design-wordsmith.md#造词台 UI] — 界面结构、消耗公式、ASCII mockup
- [Source: src/src/systems/shop.ts:1669-1700] — initStatsTabs / switchTab 模式
- [Source: src/src/systems/shop.ts:358-395] — renderUnifiedShop / renderUnifiedShopCard 模式
- [Source: src/src/systems/shop.ts:169] — updateGoldDisplay
- [Source: src/src/systems/shop.ts:591-597] — 金币消费 + 词推入词库模式
- [Source: src/src/systems/classes/FragmentQueue.ts] — setFragmentQueue / getMaxQueueLength API
- [Source: src/src/systems/classes/ClassFeatureGate.ts] — isFeatureEnabled / getFeatureLostReason
- [Source: src/src/core/state.ts] — fragmentInventory / fragmentQueue 字段
- [Source: src/src/data/words.ts:520] — calculateDeckStats
- [Source: docs/implementation-artifacts/32-5-wordsmith-producers-converters.md] — 前序 Story 实现记录

### Git Intelligence

最近提交：
```
b09b89d fix: 打字音效重构为三层键盘音（click+thock+tone）+ 全局短混响
c956cd5 fix: 评级系统改为三维平均（失误率+速度+超杀）+ 统计面板6档颜色对齐 + 打字音效柔化
8074e7c feat: Story 31-6 关卡评级系统（6档揭示动画+分级音效）+ code review修复
```
模式：`feat/fix + Story 编号 + 中文描述 + 括号内关键实现细节`

### Previous Story Intelligence

Story 32-5（碎片产出者/转化者）关键教训：
- **draw-then-filter 模式**：`drawConverterPool()` 先抽取再由 `filterSkillIdsByClass` 过滤。在扩充池大小时必须考虑过滤后的实际数量。
- **cross-type icon uniqueness**：新增 icon 必须检查 `iconRegistry.test.ts` 的跨类型唯一性。本 Story 为 UI 故事，不新增技能 icon，无此风险。
- **SKILL_SCHOOL 映射**：新增产出者/转化者需同步更新 `SKILL_SCHOOL` map。本 Story 不新增技能数据，无需关注。
- **updateGoldDisplay 可见性**：此函数在 shop.ts 内部未导出，CraftingStation.ts 需要通过回调或导出来使用。

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Code review H1 fix: inventory grid now shows `available = total - used` instead of raw total
- Code review M1 fix: added MIN_WORD_LENGTH=2 guard in craftWord + UI hint
- Code review M2 fix: replaced 3 inline goldUpdater functions with single cachedGoldUpdate module-level ref

### Completion Notes List

- Task 1: Extended `initStatsTabs()` in shop.ts to support 4th `craft` tab type, conditionally shown when `!isFeatureEnabled('pack-system')`. Added `craft-tab` button and `craft-panel` container to index.html. Imported `renderCraftPanel`/`resetCraftInput` from CraftingStation.ts.
- Task 2: Created `renderQueueEditor()` — renders queue slots from `state.fragmentQueue`, click → letter picker modal (26 letters + skip), updates via `setFragmentQueue()`, active position highlighted with teal border.
- Task 3: Created `renderFragmentInventory()` — 26-letter grid (13×2), shows letter + count, empty cells grayed out (opacity 0.35), click to add letter to word builder.
- Task 4: Created `renderWordBuilder()` + `calculateCraftCost()` — letter chips show current word (click to remove), cost preview shows fragment usage + gold (insufficient items red), confirm button disabled when resources insufficient.
- Task 5: Created `craftWord()` — validates fragments + gold → deducts fragments → deducts gold → pushes lowercase word to wordDeck + craftedWords → plays buy sound → re-renders panel. Failure shows appropriate feedback.
- Task 6: Added `craftedWords: string[]` to GameState (types.ts + state.ts). `renderCraftedWordList()` shows crafted words as yellow tag chips.
- Task 7: Added ~250 lines CSS covering queue slots, inventory grid, word chips, cost preview, confirm button states, letter picker modal, crafted word tags.
- Task 8: 16 unit tests — 7 calculateCraftCost tests (0g/5g/20g/50g/80g/multi-letter/uppercase), 6 craftWord tests (success/deduction/failure/empty/accumulate), 3 tab visibility tests (wordsmith/none/metamorph).

### File List

- src/src/systems/classes/CraftingStation.ts — NEW: 造词台 UI 渲染 + 造词逻辑（~290 lines）
- src/src/systems/shop.ts — Extended initStatsTabs() for craft tab, added import
- src/index.html — Added craft-tab button + craft-panel container
- src/src/style.css — Added ~250 lines craft UI styles
- src/src/core/types.ts — Added craftedWords field to GameState
- src/src/core/state.ts — Added craftedWords: [] to createInitialState()
- tests/unit/systems/classes/CraftingStation.test.ts — NEW: 16 unit tests
- docs/implementation-artifacts/sprint-status.yaml — Status tracking
