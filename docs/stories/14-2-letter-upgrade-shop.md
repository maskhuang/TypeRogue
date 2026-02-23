# Story 14.2: 字母升级商店与来源

Status: done

## Story

As a 玩家,
I want 在商店中购买字母升级，并在过关时获得免费升级选择,
so that 我能在 Run 中持续投资字母底分，形成"升级字母→选词库→最大化收益"的策略闭环。

## Acceptance Criteria

1. 商店新增"字母升级"标签页，显示 26 键 QWERTY 布局，每个字母卡片展示当前等级和升级价格
2. 升级价格递增：Lv0→1=10, Lv1→2=20, Lv2→3=35 金币（遗物折扣生效）
3. 过关奖励：胜利后商店字母标签页顶部显示 3 个免费升级选项（随机未满级字母）
4. 字母升级遗物接口预留：`upgradeLetters(keys[])` 批量升级 + `VOWELS` 常量
5. 单元测试覆盖所有 AC

## Tasks / Subtasks

- [x] Task 1: 扩展商店标签系统 (AC: #1)
  - [x] 1.1 `core/types.ts` ShopState.tab 类型添加 `| 'letters'`
  - [x] 1.2 `shop.ts` `renderShopTabs()` 添加第 4 个标签 `🔤 字母`
  - [x] 1.3 `shop.ts` `renderShopContent()` 添加 `case 'letters': renderLetterShop()` 分支
  - [x] 1.4 `index.html` 无需修改（标签由 JS 动态生成）

- [x] Task 2: 字母升级商店 UI (AC: #1, #2)
  - [x] 2.1 `shop.ts` 新增 `renderLetterShop()` 函数
  - [x] 2.2 渲染 3 行 QWERTY 键盘布局（复用 `KEYBOARD_ROWS` 常量），每个字母显示为可点击卡片
  - [x] 2.3 字母卡片内容：字母名、当前等级（Lv.0~3）、升级价格或"MAX"
  - [x] 2.4 等级颜色区分：Lv0=默认灰(#444), Lv1=淡蓝(#88bbdd), Lv2=蓝(#4488cc), Lv3=金(#ffd700)
  - [x] 2.5 `style.css` 新增 `.letter-grid`, `.letter-card`, `.letter-card.lv1/.lv2/.lv3/.max` 样式

- [x] Task 3: 购买逻辑 (AC: #2)
  - [x] 3.1 `systems/letters/LetterUpgradeSystem.ts` 新增 `getUpgradeCost(key): number | null` — 返回下一级价格，已满级返回 null
  - [x] 3.2 价格常量 `LETTER_UPGRADE_COSTS = [10, 20, 35]`（Lv0→1, Lv1→2, Lv2→3）
  - [x] 3.3 `shop.ts` 字母卡片点击 → `getAdjustedPrice(cost)` → `buyItem()` → `upgradeLetter(key)` → 刷新 UI
  - [x] 3.4 购买成功播放音效 + 反馈文字（如"E → Lv.2!"）

- [x] Task 4: 过关免费升级奖励 (AC: #3)
  - [x] 4.1 `ShopState` 新增 `freeLetterUpgrade: boolean`（默认 true，使用后设 false）
  - [x] 4.2 `openShop()` 初始化 `state.shop.freeLetterUpgrade = true`
  - [x] 4.3 `renderLetterShop()` 顶部条件渲染"免费升级"区域：3 个随机未满级字母卡片（标注 FREE）
  - [x] 4.4 点击免费卡片 → `upgradeLetter(key)` → 设 `freeLetterUpgrade = false` → 刷新 UI
  - [x] 4.5 若所有字母已满级，显示"所有字母已满级！"提示

- [x] Task 5: 遗物接口预留 (AC: #4)
  - [x] 5.1 `LetterUpgradeSystem.ts` 新增 `upgradeLetters(keys: string[]): number` — 批量升级，返回成功数
  - [x] 5.2 `LetterUpgradeSystem.ts` 导出 `VOWELS = ['a', 'e', 'i', 'o', 'u']` 常量
  - [x] 5.3 不实现具体遗物，仅确保接口可被未来遗物调用

- [x] Task 6: 单元测试 (AC: #5)
  - [x] 6.1 `tests/unit/systems/letters/LetterUpgradeSystem.test.ts` 新增价格查询测试（4 个：Lv0/1/2/3 价格）
  - [x] 6.2 `tests/unit/systems/letters/LetterUpgradeSystem.test.ts` 新增批量升级测试（3 个：全成功/部分满级/全满级）
  - [x] 6.3 新建 `tests/unit/systems/shop/letterShop.test.ts` — 商店字母 UI 测试（6 个：渲染/购买/价格折扣/免费奖励/满级处理/标签切换）

## Dev Notes

### 关键实现模式

**商店标签扩展（与现有 skills/relics/deck 一致）：**
```typescript
// core/types.ts — ShopState.tab 扩展
tab: 'skills' | 'relics' | 'deck' | 'letters';

// shop.ts — renderShopTabs() 新增按钮
<button class="shop-tab ${state.shop.tab === 'letters' ? 'active' : ''}" data-tab="letters">🔤 字母</button>

// shop.ts — renderShopContent() 新增分支
case 'letters':
  renderLetterShop();
  break;
```

**字母卡片 HTML 结构：**
```html
<div class="letter-grid">
  <!-- 每行对应 KEYBOARD_ROWS -->
  <div class="letter-row">
    <div class="letter-card lv1" data-key="q">
      <span class="letter-name">Q</span>
      <span class="letter-level">Lv.1</span>
      <span class="letter-cost">💰10</span>  <!-- 或 "MAX" -->
    </div>
    <!-- ... -->
  </div>
</div>
```

**价格查询（添加到 LetterUpgradeSystem.ts）：**
```typescript
export const LETTER_UPGRADE_COSTS = [10, 20, 35] // Lv0→1, Lv1→2, Lv2→3

export function getUpgradeCost(key: string): number | null {
  const level = getLetterLevel(key)
  if (level >= 3) return null
  return LETTER_UPGRADE_COSTS[level]
}
```

**免费升级奖励流程：**
```
过关 → openShop() → freeLetterUpgrade=true
→ 切到字母标签 → 顶部显示 3 个随机未满级字母（FREE 标记）
→ 玩家选一个 → upgradeLetter() → freeLetterUpgrade=false → 刷新
```

### 防坑指南

1. **复用 `KEYBOARD_ROWS` 常量** — `core/constants.ts` 已有 `KEYBOARD_ROWS: string[][]`，不要重新定义键盘行布局
2. **复用 `getAdjustedPrice()`** — 字母升级也应受 lucky_coin 折扣和 greedy_hand 加价影响，直接调用现有函数
3. **不要在 shop.ts 中操作 `state.player.letterLevels`** — 只通过 `upgradeLetter(key)` / `getLetterLevel(key)` 调用 LetterUpgradeSystem
4. **`upgradeLetter()` 已有输入验证** — 只接受单个 a-z 字母（Story 14.1 代码审查修复），无需再次验证
5. **`upgradeLetter()` 会自动发射 `letter:upgraded` 事件** — KeyboardVisualizer 会自动更新边框颜色，无需手动同步
6. **免费升级的 3 个字母应随机** — 用 `sort(() => Math.random() - 0.5)` 打乱未满级字母后取前 3
7. **`freeLetterUpgrade` 标志每次进商店重置为 true** — 在 `openShop()` 中设置
8. **等级颜色值必须与 KeyVisual.ts 一致** — Lv1=#88bbdd, Lv2=#4488cc, Lv3=#ffd700（Story 14.1 定义）
9. **沉默誓约不影响字母升级** — `silence_vow` 只禁止技能购买和绑定，字母升级不受限

### 与现有系统的交互

- **shop.ts**：在现有标签系统中添加第 4 个标签，遵循相同的 renderShopCard / buyItem 模式
- **LetterUpgradeSystem.ts**：新增 `getUpgradeCost()`, `upgradeLetters()`, `VOWELS` — 只增不改已有函数
- **battle.ts**：无修改 — 字母底分逻辑已在 Story 14.1 中完成
- **KeyboardVisualizer.ts**：无修改 — 已监听 `letter:upgraded` 事件自动更新
- **core/types.ts**：ShopState.tab 类型扩展 + freeLetterUpgrade 字段
- **style.css**：新增字母商店卡片样式类

### Project Structure Notes

修改文件：
```
src/src/core/types.ts                               ← ShopState.tab + freeLetterUpgrade
src/src/systems/letters/LetterUpgradeSystem.ts       ← getUpgradeCost + upgradeLetters + VOWELS
src/src/systems/shop.ts                              ← renderLetterShop + 标签扩展
src/src/style.css                                    ← 字母卡片样式
src/tests/unit/systems/letters/LetterUpgradeSystem.test.ts  ← 价格+批量升级测试
```

新文件：
```
src/tests/unit/systems/shop/letterShop.test.ts       ← 商店字母 UI 测试
```

依赖方向：`data ← core ← systems ← scenes`（LetterUpgradeSystem 在 systems 层，shop.ts 在 systems 层）

### References

- [Source: docs/epics.md#Epic 14] Story 14.2 完整 AC
- [Source: docs/brainstorming-skills-relics-refactor-2026-02-20.md#方向D] 字母升级设计理念
- [Source: docs/stories/14-1-letter-upgrade-system.md] Story 14.1 实现记录（前置依赖）
- [Source: src/src/systems/shop.ts] 现有商店系统模式参考
- [Source: src/src/systems/letters/LetterUpgradeSystem.ts] 字母升级核心系统
- [Source: src/src/core/constants.ts#KEYBOARD_ROWS] 键盘行布局常量
- [Source: src/src/ui/keyboard/KeyVisual.ts#L50-52] 等级颜色常量定义

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

### Completion Notes List
- Task 1: Extended ShopState.tab type to include 'letters', added freeLetterUpgrade boolean field, added 4th tab button in renderShopTabs(), added 'letters' case in renderShopContent()
- Task 2: Implemented renderLetterShop() with QWERTY keyboard layout (3 rows), letter cards showing level/price/MAX, level-based color classes (lv1=#88bbdd, lv2=#4488cc, lv3=#ffd700), CSS styles for .letter-grid, .letter-card, .letter-free-section
- Task 3: Added getUpgradeCost() and LETTER_UPGRADE_COSTS=[10,20,35] to LetterUpgradeSystem.ts, purchase flow uses getAdjustedPrice() for relic discounts, buyItem() for gold deduction
- Task 4: freeLetterUpgrade flag initialized true in openShop(), 3 random non-maxed letters shown as FREE cards, single-use per shop visit, all-maxed shows congratulations message
- Task 5: Added upgradeLetters(keys[]) batch upgrade returning success count, exported VOWELS=['a','e','i','o','u'] constant
- Task 6: 28 new tests — 12 in LetterUpgradeSystem.test.ts (getUpgradeCost/upgradeLetters/VOWELS/LETTER_UPGRADE_COSTS), 16 in letterShop.test.ts (tab/price/purchase/free upgrade logic)
- Tests: 1764 passing (70 files, excluding 2 pre-existing audio test failures)

### Code Review Fixes
- **H1 (UX)**: Free upgrade options re-randomized on every re-render — added `freeLetterOptions: string[]` to ShopState, generated once in `openShop()` via `generateFreeLetterOptions()`, cached per shop visit
- **M1 (Dead code)**: Removed unused `LETTER_UPGRADE_COSTS` import from shop.ts
- **M2 (Immutability)**: Added `as const` to `LETTER_UPGRADE_COSTS` and `VOWELS`; changed `upgradeLetters` parameter to `readonly string[]`
- **M3 (Test quality)**: Rewrote letterShop.test.ts to focus on shop-specific logic (state field validation, free option caching, purchase flow integration) instead of duplicating LetterUpgradeSystem tests
- **L1 (UX)**: Added `user-select: none` to `.letter-card` CSS
- **L2 (Visual)**: Added QWERTY row stagger offsets (nth-child margin-left) to `.letter-row`

### File List
- `src/src/core/types.ts` — ShopState.tab + freeLetterUpgrade + freeLetterOptions
- `src/src/core/state.ts` — freeLetterUpgrade: true, freeLetterOptions: [] in initial state
- `src/src/systems/letters/LetterUpgradeSystem.ts` — getUpgradeCost, upgradeLetters(readonly), LETTER_UPGRADE_COSTS as const, VOWELS as const
- `src/src/systems/shop.ts` — renderLetterShop() + generateFreeLetterOptions() + 4th tab
- `src/src/style.css` — letter-grid, letter-card (user-select), letter-row stagger, letter-free-section
- `src/tests/unit/systems/letters/LetterUpgradeSystem.test.ts` — +12 new tests
- `src/tests/unit/systems/shop/letterShop.test.ts` (NEW) — 10 tests
