# Story 22.2: 牌包生成策略

Status: done

## Story

As a 玩家,
I want 商店中的牌包由智能随机条件生成，每包含3个满足条件的词,
so that 每次进商店都能看到与我的构筑相关且不重复的牌包选项.

## Acceptance Criteria

1. `generateWordPacks(ownedWords, playerFreqs, boundKeys, count)` 生成指定数量的牌包
2. 每包从候选条件池中随机选取一个条件
3. 条件池权重：与玩家当前绑定技能键位相关的条件权重更高（如玩家绑了 E 键技能，`high_freq('e')` / `starts_with('e')` 权重更高）
4. 每包从满足条件的候选词中随机抽 3 个（不含已拥有词）
5. 若某条件候选词不足 3 个，跳过该条件选其他
6. 同一商店中不重复相同条件的牌包
7. 牌包定价：基于条件类型和词的平均长度（short 包便宜，long/special 包贵）
8. 单元测试覆盖：生成数量、条件不重复、候选不足跳过、权重倾向性、定价逻辑

## Tasks / Subtasks

- [x] Task 1: 定义条件候选池与权重系统 (AC: 2, 3)
  - [x] 1.1 `data/wordPacks.ts` — 新增 `buildConditionPool(boundKeys): { condition: PackCondition, weight: number }[]`
  - [x] 1.2 基础条件池：9种条件类型全部纳入，每种生成所有可能的变体（如 starts_with 产生 a-z 共 26 个变体）
  - [x] 1.3 权重计算：基础权重 1；若条件的 letter 在 boundKeys 中则 ×3；`contains_owned`/`contains_unowned` 固定权重 2；`short`/`long`/`special` 固定权重 1
  - [x] 1.4 `high_freq(letter)` 仅对存在 WORD_POOL[`${letter}_words`] 的字母生成（共 15 个：a,c,d,e,f,g,h,j,k,l,n,r,s,t,w）
- [x] Task 2: 实现 generateWordPacks 核心函数 (AC: 1, 4, 5, 6)
  - [x] 2.1 `data/wordPacks.ts` — 新增 `generateWordPacks(ownedWords, playerFreqs, boundKeys, count): WordPack[]`
  - [x] 2.2 按权重随机选取条件（加权随机采样），已选条件从池中移除（AC: 6 不重复）
  - [x] 2.3 对每个选中条件调用 `filterWordsByCondition(condition, ownedWords, playerFreqs)` 获取候选词
  - [x] 2.4 若候选词 < 3 则跳过该条件，继续选下一个（AC: 5）
  - [x] 2.5 从候选词中 Fisher-Yates 随机抽 3 个
  - [x] 2.6 用 `getConditionMeta(condition)` 填充 name/desc
  - [x] 2.7 计算牌包价格（Task 3）
  - [x] 2.8 若条件池耗尽仍不足 count 个包，返回已生成的（不补充）
- [x] Task 3: 牌包定价逻辑 (AC: 7)
  - [x] 3.1 `data/wordPacks.ts` — 新增 `calculatePackCost(condition, words): number`
  - [x] 3.2 基础价格表：`short` → 15, `long` → 25, `special` → 30, `high_freq` → 20, 其余 → 18
  - [x] 3.3 词长调整：`+Math.floor(avgWordLength / 2)` 加到基础价上
  - [x] 3.4 最终价格 = 基础价 + 词长调整（不含遗物折扣，遗物折扣在 shop.ts 的 getAdjustedPrice 中统一处理）
- [x] Task 4: 单元测试 (AC: 8)
  - [x] 4.1 `tests/unit/data/wordPacks.test.ts` — 新增 `generateWordPacks` 测试 describe
  - [x] 4.2 测试生成指定数量的牌包（count=1/2/3）
  - [x] 4.3 测试每包恰好包含 3 个词
  - [x] 4.4 测试同一批牌包条件不重复
  - [x] 4.5 测试候选不足 3 个的条件被跳过
  - [x] 4.6 测试绑定键位的权重倾向性（多次生成统计分布）
  - [x] 4.7 测试定价逻辑（short 便宜、long/special 贵）
  - [x] 4.8 测试条件池耗尽时优雅返回（不崩溃）
  - [x] 4.9 测试 buildConditionPool 生成正确数量的条件变体

## Dev Notes

### 关键设计决策

**条件候选池构建：**

条件池包含所有可能的条件实例（不是类型，是具体实例），每个带权重：

```typescript
// 示例条件池内容（约 80+ 条件实例）
// starts_with('a') w:1, starts_with('b') w:1, ... starts_with('e') w:3 (因为 e 是绑定键)
// ends_with('a') w:1, ...
// contains('a') w:1, ...
// contains_owned w:2
// contains_unowned w:2
// short w:1, long w:1, special w:1
// high_freq('a') w:1, ... high_freq('e') w:3 (绑定键加权)
```

**加权随机采样算法：**

```typescript
function weightedRandomPick(pool: { condition: PackCondition, weight: number }[]): number {
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= pool[i].weight;
    if (roll <= 0) return i;
  }
  return pool.length - 1;
}
```

**定价参考（当前词语定价 vs 牌包定价）：**

当前 `generateShopWords` 定价：`pool.cost + Math.floor(word.length / 2)`
- common(T1): 5 + ~3 = 8
- letter(T2): 8 + ~3 = 11
- short(T2): 10 + ~1 = 11
- long(T3): 12 + ~4 = 16
- special(T3): 15 + ~3 = 18

牌包定价（3词，应比3个单词略贵以体现打包价值）：
- short 包: 15 + ~1 = 16（vs 3×11 = 33 单独买）
- long 包: 25 + ~4 = 29（vs 3×16 = 48 单独买）
- special 包: 30 + ~3 = 33（vs 3×18 = 54 单独买）
- 其余: 18 + ~3 = 21（vs 3×11 = 33 单独买）

**generateWordPacks 不修改 shop.ts：**

本 Story 仅在 `data/wordPacks.ts` 中实现生成逻辑。商店集成（调用 generateWordPacks 替换 generateShopWords）在 Story 22.3/22.4 中进行。

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/data/wordPacks.ts` | line 1-158 | 22.1 实现：filterWordsByCondition + getConditionMeta |
| `src/src/data/wordPacks.ts` | line 11-26 | getAllWords() 惰性缓存 — 可在 generateWordPacks 中复用 |
| `src/src/data/words.ts` | line 7-493 | WORD_POOL 数据，18 个池 |
| `src/src/data/words.ts` | line 554-571 | generateShopWords() — 当前词语生成（22.4 移除） |
| `src/src/core/types.ts` | line 210-233 | PackConditionType / PackCondition / WordPack 类型 |
| `src/src/systems/shop.ts` | line 114-240 | generateShopItems() — 当前商品生成（22.3 修改） |
| `src/src/systems/shop.ts` | line 208-221 | 构建词语池（22.3 替换为牌包池） |
| `src/src/systems/shop.ts` | line 98-102 | getAdjustedPrice() — 遗物折扣（牌包价格不含折扣，由 shop.ts 统一处理） |
| `src/src/systems/letters/LetterFrequencySystem.ts` | line 16-26 | calculateLetterFrequency — 可传入 generateWordPacks 的 playerFreqs |

### WORD_POOL 中有 `_words` 后缀的字母池（high_freq 条件可用）

a, c, d, e, f, g, h, j, k, l, n, r, s, t, w（共 15 个）

缺少的字母：b, i, m, o, p, q, u, v, x, y, z（11 个）— `high_freq` 这些字母返回空数组

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `core/types.ts` | WordPack 接口已定义，无需修改 |
| `systems/shop.ts` | 商店集成在 22.3 |
| `data/words.ts` | WORD_POOL 只读 |
| `systems/battle.ts` | 战斗系统无关 |
| `style.css` | UI 在 22.3 |

### Project Structure Notes

- 所有新代码添加到 `src/src/data/wordPacks.ts`，不新建文件
- 测试添加到现有 `src/tests/unit/data/wordPacks.test.ts`
- 遵循 `data → core → systems` 依赖方向：wordPacks.ts 只导入 words.ts 和 types

### References

- [Source: docs/epics.md#Epic 22 Story 22.2]
- [Source: src/src/data/wordPacks.ts — Story 22.1 实现]
- [Source: src/src/data/words.ts#WORD_POOL — 词池数据]
- [Source: src/src/data/words.ts#generateShopWords — 当前词语定价逻辑]
- [Source: src/src/systems/shop.ts#generateShopItems — 当前商品生成]
- [Source: src/src/systems/letters/LetterFrequencySystem.ts#calculateLetterFrequency — 字频计算]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 新增 buildConditionPool：98 个条件实例（26×3 letter变体 + 2 owned/unowned + 3 short/long/special + 15 high_freq），绑定键位权重 ×3
- 新增 calculatePackCost：基于条件类型基础价 + 平均词长调整
- 新增 generateWordPacks：加权随机采样 + 候选<3跳过 + 条件不重复 + Fisher-Yates 抽词
- 新增 shuffleArray 工具函数（不可变版本，返回新数组）
- 53 个单元测试全部通过（原 33 + 新增 20），覆盖条件池构建、定价、生成数量、不重复、权重倾向性、池耗尽
- 全套 2344/2391 通过（47 个 pre-existing 失败）

### Code Review Fixes Applied
- [M1] 修复：HIGH_FREQ_LETTERS 从硬编码改为动态派生 `Object.keys(WORD_POOL).filter(k => k.endsWith('_words')).map(k => k[0])`
- [M2] 修复：新增牌包内容正确性测试（验证词满足条件）
- [L1] 修复：导出 WeightedCondition 接口
- [L2] 修复：新增 count=0 边界测试
- [L3] 修复：新增 playerFreqs 传入时 contains_owned 可被选中的集成测试

### File List
- `src/src/data/wordPacks.ts` — 新增 buildConditionPool + calculatePackCost + generateWordPacks + shuffleArray
- `src/tests/unit/data/wordPacks.test.ts` — 新增 23 个单元测试（buildConditionPool 5 + calculatePackCost 5 + generateWordPacks 13）
