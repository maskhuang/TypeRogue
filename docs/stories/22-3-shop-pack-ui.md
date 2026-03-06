# Story 22.3: 商店牌包 UI

Status: done

## Story

As a 玩家,
I want 商店中的词语以牌包卡片形式展示，点击可展开查看3个词并勾选要购买的词,
so that 我能在购买前预览每包的内容，并只选择对构筑有帮助的词加入词库.

## Acceptance Criteria

1. 商店商品卡片新增 `type: 'pack'` 类型，替换原有 `type: 'word'`
2. 牌包卡片展示：条件图标、条件名称（如「E开头」「短词精选」）、价格、3 个词预览
3. 点击牌包展开详情：显示 3 个词，每个词旁有勾选框，默认全选
4. 词语高亮已绑定技能的字母（复用现有 `bound-letter` 样式）
5. 每个词旁显示词长和涉及的键位频率变化预览
6. 确认购买按钮：将勾选的词加入 `wordDeck`，至少选 1 个才能购买
7. 购买后牌包从商店移除
8. 牌包支持锁定/解锁（刷新时保留）

## Tasks / Subtasks

- [x] Task 1: 扩展 ShopItem 类型支持牌包 (AC: 1)
  - [x] 1.1 `core/types.ts` — ShopItem.type 联合类型从 `'skill' | 'word'` 改为 `'skill' | 'word' | 'pack'`
  - [x] 1.2 `core/types.ts` — ShopItem 新增可选字段 `pack?: WordPack`（牌包数据）
  - [x] 1.3 `core/types.ts` — ShopItem 新增可选字段 `selectedWords?: boolean[]`（3 个词的勾选状态，默认全 true）
- [x] Task 2: 商店生成逻辑集成牌包 (AC: 1)
  - [x] 2.1 `systems/shop.ts` — 在 `generateShopItems()` 中用 `generateWordPacks()` 替代 `generateShopWords()`
  - [x] 2.2 构建 packPool 替代 wordPool：每个 WordPack 转为 ShopItem `{ type: 'pack', pack, cost: getAdjustedPrice(pack.cost), selectedWords: [true, true, true] }`
  - [x] 2.3 保底逻辑改为：≥1 技能 + ≥1 牌包（替代原有 ≥1 词语）
  - [x] 2.4 导入 `generateWordPacks` 和 `calculateLetterFrequency`，获取 boundKeys/playerFreqs 传入
- [x] Task 3: 牌包卡片渲染 — 折叠态 (AC: 2)
  - [x] 3.1 `systems/shop.ts` — `renderUnifiedShopCard()` 新增 `else if (item.type === 'pack')` 分支
  - [x] 3.2 折叠态卡片 HTML：图标 `pack.condition` 的 icon + 名称 + 描述 + 3 词预览（逗号分隔）+ 价格 + 锁定按钮
  - [x] 3.3 复用 `reward-card` 基础样式，新增 `pack-type` CSS 类标记
- [x] Task 4: 牌包卡片渲染 — 展开态 (AC: 3, 4, 5, 6)
  - [x] 4.1 点击牌包卡片时切换展开/折叠，而非直接购买
  - [x] 4.2 展开态 HTML：每个词一行，包含勾选框 + 高亮词文本 + 词长 + 频率变化预览
  - [x] 4.3 词语高亮：复用 `bound-letter` 样式，遍历词中每个字母检查 `state.player.bindings.keys()`
  - [x] 4.4 频率变化预览：显示该词包含的绑定键字母出现次数（如 `+2 E频率`）
  - [x] 4.5 勾选框：默认全选（`selectedWords` 初始 `[true, true, true]`），点击切换
  - [x] 4.6 确认购买按钮：显示在展开区域底部，至少选 1 个词时可用
  - [x] 4.7 取消按钮或再次点击标题折叠
- [x] Task 5: 牌包购买逻辑 (AC: 6, 7)
  - [x] 5.1 `systems/shop.ts` — 独立 `purchasePackItem()` 函数处理牌包购买
  - [x] 5.2 扣除金币，将 `selectedWords` 中勾选为 true 的词加入 `state.player.wordDeck`
  - [x] 5.3 显示反馈：`+N词` 绿色反馈
  - [x] 5.4 购买后从 `state.shop.items` 移除
- [x] Task 6: 牌包锁定/解锁 (AC: 8)
  - [x] 6.1 牌包卡片复用现有 `.lock-toggle` 按钮和 `item.locked` 字段
  - [x] 6.2 验证 `refreshShop()` 中锁定的牌包不被替换（已有逻辑 `filter(item => item.locked)` 适用）
- [x] Task 7: 牌包 CSS 样式 (AC: 2, 3)
  - [x] 7.1 `style.css` — `.reward-type.pack-type` 样式（紫色调区别于 skill-type 和 word-type）
  - [x] 7.2 `style.css` — `.pack-expanded` 展开态容器样式 + slide-in 动画
  - [x] 7.3 `style.css` — `.pack-word-row` 每行词的布局（checkbox + word + length + freq hint）
  - [x] 7.4 `style.css` — `.pack-buy-btn` 确认购买按钮样式（紫色渐变）
  - [x] 7.5 `style.css` — `.pack-word-checkbox` 勾选框样式（accent-color 紫色）
  - [x] 7.6 展开/折叠过渡动画（pack-slide-in keyframes）

## Dev Notes

### 关键设计决策

**ShopItem 扩展方案：**

```typescript
export interface ShopItem {
  id: string;
  type: 'skill' | 'word' | 'pack';  // 新增 'pack'
  skillId?: string;
  word?: string;
  pack?: WordPack;           // 牌包数据（type='pack' 时使用）
  selectedWords?: boolean[]; // 3个词的勾选状态（type='pack' 时使用）
  cost: number;
  isUpgrade: boolean;
  locked: boolean;
  highlight?: string;
}
```

**折叠态卡片 HTML 结构（参考现有 reward-card）：**

```html
<div class="reward-card pack-card">
  <div class="reward-icon">🔤</div>
  <div class="reward-info">
    <div class="reward-name">E开头</div>
    <div class="reward-desc">energy, engine, event</div>
  </div>
  <div class="reward-cost">💰20</div>
  <div class="reward-type pack-type">词包</div>
  <span class="lock-toggle">🔓</span>
</div>
```

**展开态 HTML 结构：**

```html
<div class="pack-expanded">
  <div class="pack-word-row">
    <input type="checkbox" class="pack-word-checkbox" checked />
    <span class="word-text"><span class="bound-letter">e</span>nergy</span>
    <span class="pack-word-len">6字母</span>
    <span class="pack-freq-hint">+1 E频率</span>
  </div>
  <!-- 重复3行 -->
  <button class="pack-buy-btn">确认购买 (3词) 💰20</button>
</div>
```

**点击行为变更：**

- 技能卡片：点击 → 直接购买（不变）
- 牌包卡片：点击 → 展开/折叠（不直接购买）
- 展开态中的「确认购买」按钮 → 执行购买

**频率变化预览计算：**

```typescript
// 对每个词，统计绑定键字母出现次数
function getFreqHints(word: string, boundKeys: string[]): string[] {
  const hints: string[] = [];
  const bound = new Set(boundKeys);
  const counts = new Map<string, number>();
  for (const c of word.toLowerCase()) {
    if (bound.has(c)) counts.set(c, (counts.get(c) || 0) + 1);
  }
  counts.forEach((n, k) => hints.push(`+${n} ${k.toUpperCase()}频率`));
  return hints;
}
```

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/core/types.ts` | line 166-175 | ShopItem 接口 — 需新增 pack/selectedWords 字段 |
| `src/src/core/types.ts` | line 227-233 | WordPack 接口 — 已有，直接引用 |
| `src/src/systems/shop.ts` | line 114-240 | generateShopItems() — 词语池替换为牌包池 |
| `src/src/systems/shop.ts` | line 208-221 | 当前词语池构建 — 替换为 generateWordPacks 调用 |
| `src/src/systems/shop.ts` | line 280-353 | renderUnifiedShopCard() — 新增 pack 渲染分支 |
| `src/src/systems/shop.ts` | line 314-331 | 当前词语卡片渲染 — 参考 bound-letter 高亮模式 |
| `src/src/systems/shop.ts` | line 347-350 | 卡片点击事件 — pack 需改为展开而非直接购买 |
| `src/src/systems/shop.ts` | line 357-407 | executePurchase() — 新增 pack 购买分支 |
| `src/src/systems/shop.ts` | line 462-480 | refreshShop() — 锁定逻辑已适用于 pack |
| `src/src/data/wordPacks.ts` | line 245-290 | generateWordPacks() — 22.2 已实现，直接调用 |
| `src/src/data/wordPacks.ts` | line 131-156 | getConditionMeta() — 获取图标/名称/描述 |
| `src/src/systems/letters/LetterFrequencySystem.ts` | line 16-26 | calculateLetterFrequency() — 获取 playerFreqs |
| `src/src/style.css` | line 407-439 | .reward-card 基础样式 — 牌包卡片复用 |
| `src/src/style.css` | line 1402-1411 | .word-text / .bound-letter — 复用 |
| `src/src/style.css` | line 2175-2192 | .lock-toggle — 复用 |
| `src/src/style.css` | line 2194-2197 | .reward-type.word-type — 参考新建 pack-type |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/wordPacks.ts` | 22.1/22.2 已完成，只读调用 |
| `data/words.ts` | WORD_POOL 只读（22.4 才移除 generateShopWords） |
| `systems/battle.ts` | 战斗系统无关 |

### Project Structure Notes

- 修改 3 个文件：`core/types.ts`（类型扩展）、`systems/shop.ts`（生成/渲染/购买）、`style.css`（样式）
- 牌包生成逻辑已在 `data/wordPacks.ts` 完成，shop.ts 仅调用 `generateWordPacks()`
- 遵循现有 reward-card / lock-toggle 模式，不引入新 UI 框架

### References

- [Source: docs/epics.md#Epic 22 Story 22.3]
- [Source: src/src/systems/shop.ts#renderUnifiedShopCard — 现有卡片渲染]
- [Source: src/src/systems/shop.ts#executePurchase — 购买流程]
- [Source: src/src/systems/shop.ts#generateShopItems — 商品生成]
- [Source: src/src/data/wordPacks.ts#generateWordPacks — 牌包生成（22.2）]
- [Source: src/src/core/types.ts#ShopItem — 当前类型定义]
- [Source: src/src/style.css — 现有卡片/按钮样式]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- Task 1: ShopItem 类型扩展 — 新增 `'pack'` 类型、`pack?: WordPack`、`selectedWords?: boolean[]`
- Task 2: generateShopItems() 替换词语池为牌包池 — 调用 generateWordPacks(8)，构建 packPool，保底 ≥1 技能 + ≥1 牌包
- Task 3: 折叠态卡片渲染 — pack-card 类，getPackIcon 获取条件图标，3 词逗号分隔预览
- Task 4: 展开态渲染 — togglePackExpand 切换，每词一行（checkbox + bound-letter 高亮 + 词长 + 频率提示），updatePackBuyBtn 动态更新按钮
- Task 5: purchasePackItem 独立购买函数 — 扣金币、勾选词加入 wordDeck、反馈 `+N词`、移除商品、刷新 UI
- Task 6: 锁定/解锁 — 复用现有 lock-toggle 按钮和 refreshShop 的 item.locked 过滤逻辑
- Task 7: CSS 样式 — pack-type 紫色标签、pack-expanded 容器、pack-word-row 布局、pack-buy-btn 紫色渐变按钮、pack-slide-in 动画
- 移除了未使用的 generateShopWords 导入
- 修复了保底注释变更导致的 shop-act-weight 测试失败
- 全套 2389/2394 通过（5 个 pre-existing 失败）

### Code Review Fixes Applied
- [H1] 修复：`executePurchase()` 新增 `if (item.type === 'pack') return null;` guard，防止 pack 误入 word 分支导致 `item.word!` 崩溃
- [M1] 修复：`highlightWord()` 改为接收 `boundKeySet: Set<string>` 参数，避免每词重建数组+O(n)查找
- [M2] 修复：`pack-slide-in` 动画从 broken `max-height` 改为 `opacity + translateY` 过渡
- [M3] 修复：折叠态卡片增加 `pack.desc` 条件描述（如"以E开头的词 · energy, engine, event"）
- [L1] 修复：File List 补充 sprint-status.yaml
- [L2] 修复：`getPackIcon` 参数类型从 `string` + `as any` 改为 `PackConditionType`

### File List
- `src/src/core/types.ts` — ShopItem 类型扩展（pack/selectedWords 字段）
- `src/src/systems/shop.ts` — 牌包生成集成 + 折叠/展开渲染 + 购买逻辑 + 辅助函数
- `src/src/style.css` — 牌包卡片 CSS 样式（pack-type/pack-expanded/pack-word-row/pack-buy-btn）
- `src/tests/unit/systems/shop-act-weight.test.ts` — 保底注释断言更新（词语→牌包）
- `docs/stories/sprint-status.yaml` — story 状态更新
