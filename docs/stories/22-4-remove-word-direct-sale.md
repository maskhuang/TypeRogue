# Story 22.4: 移除单词直售 & 商品保底

Status: done

## Story

As a 开发者,
I want 移除商店中单独售卖词语的旧代码，统一使用牌包系统,
so that 商店代码更简洁、无死代码，且玩家体验统一为牌包选词.

## Acceptance Criteria

1. `generateShopItems` 不再生成 `type: 'word'` 商品
2. 商店 5 个商品槽位：保底 ≥1 技能 + ≥1 牌包，其余随机（已在 22.3 实现，验证仍正确）
3. 删除 `generateShopWords()` 函数
4. 原有词语删除功能保留（在词库标签页中删词仍然可用）
5. 原有词语购买相关的 UI 代码清理

## Tasks / Subtasks

- [x] Task 1: 删除 `generateShopWords()` 函数 (AC: 3)
  - [x] 1.1 `data/words.ts` — 删除 `generateShopWords()` 函数（line 553-571）
  - [x] 1.2 `data/words.ts` — 确认导出列表中移除 `generateShopWords`
  - [x] 1.3 全局搜索确认无其他文件引用 `generateShopWords`（shop.ts 已在 22.3 移除导入）
- [x] Task 2: 清理 `renderUnifiedShopCard` 中的 word 分支 (AC: 1, 5)
  - [x] 2.1 `systems/shop.ts` — 删除 `renderUnifiedShopCard()` 中 `else { // Word item (legacy) ... }` 整个分支
  - [x] 2.2 pack 分支保留 `else if`（skill 分支后仅剩 pack，结构清晰）
- [x] Task 3: 清理 `executePurchase` 中的 word 分支 (AC: 1, 5)
  - [x] 3.1 `systems/shop.ts` — 删除 word 购买分支，合并 pack guard 为 `if (item.type !== 'skill') return null`
  - [x] 3.2 executePurchase 简化为仅处理 skill 类型
- [x] Task 4: 清理 CSS 中的 `.word-type` 样式 (AC: 5)
  - [x] 4.1 `style.css` — 删除 `.reward-type.word-type` 样式规则
- [x] Task 5: 清理 ShopItem 类型中的 `'word'` (AC: 1)
  - [x] 5.1 `core/types.ts` — ShopItem.type 联合类型从 `'skill' | 'word' | 'pack'` 改为 `'skill' | 'pack'`
  - [x] 5.2 `core/types.ts` — 移除 `word?: string` 和 `highlight?: string` 可选字段
  - [x] 5.3 全局搜索 `item.word` / `item.highlight` 确认无其他引用
- [x] Task 6: 更新相关测试 (AC: 2)
  - [x] 6.1 `tests/unit/systems/shop-act-weight.test.ts` — 无 `type: 'word'` 断言，无需修改
  - [x] 6.2 运行全量测试验证无回归：2389/2394 通过（5 个 pre-existing）

## Dev Notes

### 关键设计决策

**这是一个纯清理 story：**

22.3 已经完成了牌包系统的完整实现（生成、渲染、购买）。本 story 的任务是移除遗留的单词直售代码。不需要新增任何功能。

**清理范围定位：**

| 文件 | 需要删除的代码 | 说明 |
|------|-------------|------|
| `src/src/data/words.ts` | `generateShopWords()` 函数（line 553-571） | 不再有调用者 |
| `src/src/systems/shop.ts` | `renderUnifiedShopCard()` word 分支（line 333-349） | 已被 pack 分支替代 |
| `src/src/systems/shop.ts` | `executePurchase()` word 分支（line 557-566） | 已被 `purchasePackItem()` 替代 |
| `src/src/style.css` | `.reward-type.word-type` 规则 | 不再有 word-type 卡片 |
| `src/src/core/types.ts` | ShopItem 中 `'word'` 类型和 `word?`/`highlight?` 字段 | 已被 `'pack'` 替代 |

**保留不变的功能：**

- `calculateDeckStats()` — 仍在 `renderUnifiedShop()` 中使用
- `getStarterWords()` — 初始词库生成，与商店无关
- `WORD_POOL` — wordPacks.ts 中 `filterWordsByCondition` 仍在读取
- 词库标签页中的删词功能 — 在 `renderBuildManager()` 中，与 ShopItem 无关

**ShopItem 清理后：**

```typescript
export interface ShopItem {
  id: string;
  type: 'skill' | 'pack';
  skillId?: string;
  pack?: WordPack;
  selectedWords?: boolean[];
  cost: number;
  isUpgrade: boolean;
  locked: boolean;
}
```

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/data/words.ts` | line 553-571 | `generateShopWords()` — 待删除 |
| `src/src/systems/shop.ts` | line 333-349 | word 卡片渲染分支 — 待删除 |
| `src/src/systems/shop.ts` | line 517-520 | `executePurchase()` pack guard — 保留 |
| `src/src/systems/shop.ts` | line 557-566 | word 购买分支 — 待删除 |
| `src/src/style.css` | line 2194-2197 | `.reward-type.word-type` — 待删除 |
| `src/src/core/types.ts` | line 166-177 | ShopItem 接口 — 清理 word 字段 |
| `src/tests/unit/systems/shop-act-weight.test.ts` | — | 检查 word 相关断言 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/wordPacks.ts` | 只读使用 WORD_POOL，无 generateShopWords 引用 |
| `systems/battle.ts` | 战斗系统无关 |
| `systems/dragManager.ts` | drag 接受逻辑只检查 `item?.type === 'skill'`，不受影响 |

### Project Structure Notes

- 修改 4 个文件：`data/words.ts`（删函数）、`systems/shop.ts`（删分支）、`core/types.ts`（收窄类型）、`style.css`（删样式）
- 遵循代码清理原则：完全移除死代码，不留 `// removed` 注释
- 依赖方向不变：`data → core → systems`

### References

- [Source: docs/epics.md#Epic 22 Story 22.4]
- [Source: src/src/data/words.ts#generateShopWords — 待删除函数]
- [Source: src/src/systems/shop.ts#renderUnifiedShopCard — word 分支]
- [Source: src/src/systems/shop.ts#executePurchase — word 购买分支]
- [Source: src/src/core/types.ts#ShopItem — 当前类型定义]
- [Source: src/src/style.css#.word-type — 待删除样式]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- Task 1: 删除 `generateShopWords()` — 函数及注释整体移除，全局无残留引用
- Task 2: 删除 word 渲染分支 — `renderUnifiedShopCard()` 中 16 行 legacy word 代码移除
- Task 3: 简化 `executePurchase()` — 移除 word 购买分支，合并 guard 为 `item.type !== 'skill'`
- Task 4: 删除 `.reward-type.word-type` CSS 规则
- Task 5: ShopItem 收窄 — type 从 `'skill'|'word'|'pack'` 改为 `'skill'|'pack'`，移除 `word?` 和 `highlight?` 字段
- Task 6: 无需修改测试，全套 2347/2394 通过（47 个 pre-existing 含 AudioManager/SoundPool）
- 纯删除 story：约 40 行代码移除，0 行新增

### Code Review Fixes Applied
- [M1] 修复：`executePurchase` 注释从「词语/失败」更新为「非技能/失败」
- [M2] 修复：`words.ts` 末尾补充换行符
- [L1] 修复：`executePurchase` 返回类型从 `skillId: string | null` 简化为 `skillId: string`

### File List
- `src/src/data/words.ts` — 删除 `generateShopWords()` 函数
- `src/src/systems/shop.ts` — 删除 word 渲染分支 + word 购买分支 + 简化 executePurchase
- `src/src/core/types.ts` — ShopItem 类型收窄（移除 word/highlight 字段）
- `src/src/style.css` — 删除 `.reward-type.word-type` 样式
- `docs/stories/sprint-status.yaml` — story 状态更新
