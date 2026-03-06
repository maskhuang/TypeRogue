# Story 22.1: 牌包条件定义与数据结构

Status: done

## Story

As a 玩家,
I want 商店中的词语以「牌包」形式出售，每包由一个筛选条件定义，包含3个满足条件的词,
so that 选词成为有意义的构筑决策（买首字母E的包提升E键频率？还是买短词包提高打字速度？）.

## Acceptance Criteria

1. `PackCondition` 类型定义，支持以下条件：
   - `starts_with(letter)` — 首字母为指定字母
   - `ends_with(letter)` — 尾字母为指定字母
   - `contains(letter)` — 包含指定字母
   - `contains_owned` — 包含玩家已有高频字母（频率≥5）
   - `contains_unowned` — 包含玩家低频字母（频率<5）
   - `short` — 短词（2-3字母），复用 WORD_POOL.short
   - `long` — 长词（7+字母），复用 WORD_POOL.long
   - `special` — 特殊主题词，复用 WORD_POOL.special
   - `high_freq(letter)` — 复用 WORD_POOL 中 highlight 为该字母的词池
2. `WordPack` 接口：`{ condition: PackCondition, name: string, desc: string, words: string[], cost: number }`
3. `filterWordsByCondition(condition, allPools, ownedWords, playerFreqs)` 返回满足条件且未拥有的候选词列表
4. 单元测试覆盖每种条件类型

## Tasks / Subtasks

- [x] Task 1: 定义 PackCondition 类型和 WordPack 接口 (AC: 1, 2)
  - [x] 1.1 `core/types.ts` — 新增 `PackConditionType` 联合类型（9种条件）
  - [x] 1.2 `core/types.ts` — 新增 `PackCondition` 接口：`{ type: PackConditionType, letter?: string }`
  - [x] 1.3 `core/types.ts` — 新增 `WordPack` 接口：`{ condition: PackCondition, name: string, desc: string, words: string[], cost: number }`
- [x] Task 2: 实现 filterWordsByCondition 核心筛选函数 (AC: 3)
  - [x] 2.1 新建 `data/wordPacks.ts` — 实现 `filterWordsByCondition(condition, ownedWords, playerFreqs): string[]`
  - [x] 2.2 `starts_with` / `ends_with` / `contains` — 从所有 WORD_POOL 词中按字母筛选
  - [x] 2.3 `contains_owned` — 用 playerFreqs 找频率≥5的字母，筛选包含这些字母的词
  - [x] 2.4 `contains_unowned` — 用 playerFreqs 找频率<5的字母，筛选包含这些字母的词
  - [x] 2.5 `short` — 直接返回 WORD_POOL.short.words
  - [x] 2.6 `long` — 直接返回 WORD_POOL.long.words
  - [x] 2.7 `special` — 直接返回 WORD_POOL.special.words
  - [x] 2.8 `high_freq(letter)` — 返回 WORD_POOL[`${letter}_words`].words（若存在）
  - [x] 2.9 所有条件均排除 ownedWords 中已拥有的词
- [x] Task 3: 牌包条件元数据（名称、描述、图标） (AC: 2)
  - [x] 3.1 `data/wordPacks.ts` — 导出 `getConditionMeta(condition): { name: string, desc: string, icon: string }`
  - [x] 3.2 名称方案：starts_with('e') → "E开头"，short → "短词精选"，contains_owned → "强化词包" 等
- [x] Task 4: 单元测试 (AC: 4)
  - [x] 4.1 新建 `tests/unit/data/wordPacks.test.ts`
  - [x] 4.2 测试每种 PackConditionType 的筛选结果正确
  - [x] 4.3 测试 ownedWords 排除逻辑
  - [x] 4.4 测试 contains_owned / contains_unowned 的频率阈值边界
  - [x] 4.5 测试 high_freq 对不存在的字母（如 'x'）返回空数组
  - [x] 4.6 测试 getConditionMeta 返回正确元数据

## Dev Notes

### 关键设计决策

**PackCondition 类型设计：**

```typescript
// 9 种条件类型
type PackConditionType =
  | 'starts_with'    // 首字母
  | 'ends_with'      // 尾字母
  | 'contains'       // 包含字母
  | 'contains_owned' // 包含高频字母（≥5）
  | 'contains_unowned' // 包含低频字母（<5）
  | 'short'          // 短词（2-4字母）
  | 'long'           // 长词（7+字母）
  | 'special'        // 特殊主题词
  | 'high_freq';     // 高频字母词池（复用 highlight）

interface PackCondition {
  type: PackConditionType;
  letter?: string;  // starts_with/ends_with/contains/high_freq 需要
}

interface WordPack {
  condition: PackCondition;
  name: string;     // 显示名称（如"E开头"、"短词精选"）
  desc: string;     // 描述（如"3个以E开头的词"）
  words: string[];  // 候选词（3个）
  cost: number;     // 购买价格
}
```

**需 letter 参数的条件：** `starts_with`, `ends_with`, `contains`, `high_freq`
**不需 letter 的条件：** `contains_owned`, `contains_unowned`, `short`, `long`, `special`

**filterWordsByCondition 实现要点：**

- 从所有 `WORD_POOL` 池中收集全量词汇（使用 `Object.values(WORD_POOL).flatMap(p => p.words)`）
- `short`/`long`/`special` 直接从对应池取词，不遍历全量
- `high_freq(letter)` 查找 `WORD_POOL[letter + '_words']`，不存在时返回空数组
- `contains_owned`/`contains_unowned` 需要 playerFreqs 参数（`Map<string, number>`），调用 `calculateLetterFrequency` 获取
- 所有结果都过滤掉 `ownedWords` 集合（大小写不敏感比较）

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/data/words.ts` | line 7-493 | WORD_POOL 数据：18个词池，common(T1) + 15×字母(T2) + short(T2) + long(T3) + special(T3) |
| `src/src/data/words.ts` | line 554-571 | `generateShopWords()` — 当前词语商店生成逻辑（本 Story 不修改，22.4 移除） |
| `src/src/data/words.ts` | line 496-508 | `getStarterWords()` — 初始词库 10 词 |
| `src/src/core/types.ts` | line 166-175 | `ShopItem` 接口（当前 type: 'skill' \| 'word'，22.3 新增 'pack'） |
| `src/src/core/types.ts` | line 202-208 | `WordPool` 接口：`{ words, cost, tier, highlight? }` |
| `src/src/systems/letters/LetterFrequencySystem.ts` | line 16-25 | `calculateLetterFrequency(words)` → `Map<string, number>` |

### WORD_POOL 结构速查

| 池名 | Tier | 词数 | 成本 | highlight | 描述 |
|------|------|------|------|-----------|------|
| common | 1 | ~200 | 5 | — | 通用词 |
| a_words ~ w_words | 2 | ~50ea | 8 | 对应字母 | 15个字母各一池 |
| short | 2 | ~180 | 10 | — | 2-3字母 |
| long | 3 | ~500 | 12 | — | 7-9字母 |
| special | 3 | ~100 | 15 | — | 奇幻主题 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/words.ts` | WORD_POOL 数据只读，不修改 |
| `systems/shop.ts` | 商店 UI/购买流程在 22.3 修改 |
| `systems/battle.ts` | 战斗系统无关 |

### Project Structure Notes

- 新建 `src/src/data/wordPacks.ts` — 纯数据+筛选逻辑，无 UI 依赖
- 遵循 `data → core → systems` 依赖方向：wordPacks.ts 只导入 words.ts 和 types
- 类型定义放在 `core/types.ts`，与 ShopItem / WordPool 同文件
- 测试放在 `src/tests/unit/data/wordPacks.test.ts`

### References

- [Source: docs/epics.md#Epic 22 Story 22.1]
- [Source: src/src/data/words.ts — WORD_POOL 数据定义]
- [Source: src/src/core/types.ts#ShopItem, WordPool — 类型定义]
- [Source: src/src/systems/letters/LetterFrequencySystem.ts#calculateLetterFrequency — 字频计算]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 新增 PackConditionType（9种）、PackCondition、WordPack 类型定义到 core/types.ts
- 新建 data/wordPacks.ts：filterWordsByCondition（9种条件筛选 + ownedWords 排除）+ getConditionMeta（名称/描述/图标）
- 全量词汇缓存（惰性初始化 + Set 去重），short/long/special/high_freq 直接从对应池取词
- 33 个单元测试全部通过，覆盖所有条件类型 + 排除逻辑 + 频率阈值边界 + 元数据

### Code Review Fixes Applied
- [H1] 修复：starts_with/ends_with/contains/high_freq 在 letter 为空时返回空数组（原先匹配所有词）
- [M1] 修复：contains_unowned 无 playerFreqs 时返回空数组（与 contains_owned 行为对齐）
- [M2] 修复：新增 5 个缺失 letter 边界测试（starts_with/ends_with/contains/high_freq + contains_unowned 无 freqs）
- [M3] 修复：AC 描述 short 从「2-4字母」改为「2-3字母」以匹配实际词池
- [L1] 优化：contains_owned/contains_unowned 改用 `[...letterSet].some(l => w.includes(l))` 避免每词创建临时数组

### File List
- `src/src/core/types.ts` — 新增 PackConditionType、PackCondition、WordPack 类型
- `src/src/data/wordPacks.ts` — 新建：filterWordsByCondition + getConditionMeta
- `src/tests/unit/data/wordPacks.test.ts` — 新建：28 个单元测试
