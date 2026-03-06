# Story 22.5: 牌包条件与构筑联动

Status: done

## Story

As a 玩家,
I want 商店中的牌包条件能感知我的构筑状态（技能绑定、键位频率、当前 Act）,
so that 牌包推荐更有针对性，短期强化已有键位、中期探索新键位、后期获取特殊词.

## Acceptance Criteria

1. `contains_owned` 条件已实现：筛选包含玩家频率≥5 字母的词（22.1 已完成，验证仍正确）
2. `contains_unowned` 条件已实现：筛选包含玩家频率<5 字母的词（22.1 已完成，验证仍正确）
3. 商店中若玩家有绑定技能但对应键位频率偏低（5-8），更可能出现该键位的 `high_freq` 牌包
4. 牌包描述中提示频率变化（如「+3 E频率」）
5. Act 1 优先出现 `short` 和 `contains_owned` 包（新手友好），Act 3 出现更多 `long` 和 `special` 包

## Tasks / Subtasks

- [x] Task 1: 低频绑定键 → high_freq 权重提升 (AC: 3)
  - [x] 1.1 `data/wordPacks.ts` — `buildConditionPool()` 新增参数 `playerFreqs?: Map<string, number>`
  - [x] 1.2 `buildConditionPool()` — 对 `high_freq` 条件：若字母是绑定键 **且** 频率在 5-8 之间，weight 从 3 提升至 6（双倍偏好）
  - [x] 1.3 `generateWordPacks()` — 将已有的 `playerFreqs` 传入 `buildConditionPool(boundKeys, playerFreqs)`
- [x] Task 2: Act 感知权重调整 (AC: 5)
  - [x] 2.1 `data/wordPacks.ts` — `buildConditionPool()` 新增参数 `act?: number`（默认 1）
  - [x] 2.2 Act 1 权重倍增：`short` ×3, `contains_owned` ×3；Act 3 权重倍增：`long` ×3, `special` ×3
  - [x] 2.3 `generateWordPacks()` — 新增参数 `act: number`，传入 `buildConditionPool`
  - [x] 2.4 `systems/shop.ts` — `generateShopItems()` 中调用 `generateWordPacks` 时传入 `getActForNode(state.level)` 作为 act 参数
- [x] Task 3: 牌包描述提示频率变化 (AC: 4)
  - [x] 3.1 `data/wordPacks.ts` — 新增 `getFreqDelta(words: string[]): [string, number][]` 函数，计算牌包中每个字母的新增频率
  - [x] 3.2 `generateWordPacks()` — 生成牌包后，计算 freq delta，取增幅最大的 1-2 个字母追加到 `desc`（如 `+3 E · +2 R`）
- [x] Task 4: 验证 contains_owned / contains_unowned 仍正确 (AC: 1, 2)
  - [x] 4.1 单元测试：`contains_owned` 用 freq≥5 的字母验证筛选正确
  - [x] 4.2 单元测试：`contains_unowned` 用 freq<5 的字母验证筛选正确
- [x] Task 5: 集成测试 — Act 权重验证 (AC: 5)
  - [x] 5.1 测试 `buildConditionPool` 在 act=1 时 `short` 和 `contains_owned` 权重 > 默认
  - [x] 5.2 测试 `buildConditionPool` 在 act=3 时 `long` 和 `special` 权重 > 默认

## Dev Notes

### 关键设计决策

**权重策略叠加（非替换）：**

现有 `buildConditionPool` 已按绑定键位给 ×3 权重。本 story 在此基础上叠加：

| 条件 | 基础权重 | 绑定键 ×3 | 低频绑定键(freq 5-8) | Act 1 倍增 | Act 3 倍增 |
|------|---------|-----------|---------------------|-----------|-----------|
| `starts_with` | 1 | 3 | — | — | — |
| `contains_owned` | 2 | — | — | ×3 → 6 | — |
| `contains_unowned` | 2 | — | — | — | — |
| `short` | 1 | — | — | ×3 → 3 | — |
| `long` | 1 | — | — | — | ×3 → 3 |
| `special` | 1 | — | — | — | ×3 → 3 |
| `high_freq` | 1 | 3 | ×2 → 6 | — | — |

**频率提示格式：**

在 `desc` 末尾追加频率变化信息，如：
- 原始：`以E开头的词`
- 新增：`以E开头的词 · +3 E`

仅展示增幅最大的 1-2 个字母，避免信息过载。

**函数签名变更：**

```typescript
// buildConditionPool — 新增 playerFreqs 和 act 参数
export function buildConditionPool(
  boundKeys: string[],
  playerFreqs?: Map<string, number>,
  act?: number,
): WeightedCondition[]

// generateWordPacks — 新增 act 参数
export function generateWordPacks(
  ownedWords: string[],
  playerFreqs: Map<string, number> | undefined,
  boundKeys: string[],
  count: number,
  act?: number,
): WordPack[]
```

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/data/wordPacks.ts` | line 174-202 | `buildConditionPool()` — 需增加 playerFreqs + act 参数 |
| `src/src/data/wordPacks.ts` | line 247-292 | `generateWordPacks()` — 需传 act 到 buildConditionPool |
| `src/src/data/wordPacks.ts` | line 131-156 | `getConditionMeta()` — desc 格式参考 |
| `src/src/systems/shop.ts` | line 209-224 | 调用 `generateWordPacks` — 需传入 act |
| `src/src/systems/shop.ts` | line 132 | `getActForNode(state.level)` — 已有 act 获取 |
| `src/src/systems/stage/stageFlow.ts` | line 72-74 | `getActForNode()` 定义 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `core/types.ts` | PackCondition / WordPack 类型不变 |
| `systems/battle.ts` | 战斗系统无关 |
| `style.css` | 无新 UI 元素 |
| `data/words.ts` | 词库数据不变 |

### Project Structure Notes

- 修改 2 个文件：`data/wordPacks.ts`（权重 + 频率提示）、`systems/shop.ts`（传 act 参数）
- 新增 2 个测试文件（或添加到现有测试）
- 依赖方向不变：`data → core → systems`

### References

- [Source: docs/epics.md#Epic 22 Story 22.5]
- [Source: src/src/data/wordPacks.ts#buildConditionPool — 权重策略]
- [Source: src/src/data/wordPacks.ts#generateWordPacks — 牌包生成]
- [Source: src/src/systems/shop.ts#generateShopItems — 商店生成]
- [Source: src/src/systems/stage/stageFlow.ts#getActForNode — Act 获取]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- Task 1: `buildConditionPool` 新增 `playerFreqs` 参数，low-freq 绑定键(freq 5-8) high_freq 权重从 3 提升至 6
- Task 2: `buildConditionPool` 新增 `act` 参数，Act 1: short ×3 + contains_owned ×3, Act 3: long ×3 + special ×3；shop.ts 中 `act` 变量提升至函数级共享
- Task 3: 新增 `getFreqDelta()` + `formatFreqHint()` 函数，牌包 desc 末尾追加 `+N X` 格式的频率提示
- Task 4: 已有 contains_owned/contains_unowned 测试覆盖 freq≥5/freq<5 边界（原 22.1 测试）
- Task 5: 新增 Act 1/2/3 权重测试 + 低频绑定键 high_freq 提权边界测试（freq=5/6/8/9/4）
- 全量测试 2366/2413 通过（47 个 pre-existing AudioManager/SoundPool）

### Code Review Fixes Applied
- [M1] 修复：story Task 3.1 签名描述已在实现时同步更新（无需额外修改）
- [M2] 修复：`formatFreqHint` 添加注释说明与 shop.ts `getFreqHints` 的作用域差异（词库层面 vs 绑定键层面）
- [M3] 修复：测试文件移除未使用的 `beforeEach` 导入
- [L1] 修复：`formatFreqHint` 增加 `n >= 2` 过滤，排除单次出现字母的噪音提示
- [L2] 保留：`getFreqDelta` 导出供直接单元测试，纯函数导出是合理实践

### File List
- `src/src/data/wordPacks.ts` — buildConditionPool 增加 playerFreqs+act 参数, 新增 getFreqDelta/formatFreqHint, generateWordPacks 传参+desc 追加频率提示
- `src/src/systems/shop.ts` — act 变量提升至函数级, generateWordPacks 调用传入 act
- `src/tests/unit/data/wordPacks.test.ts` — 新增 low-freq 绑定键提权测试 + Act 感知权重测试 + getFreqDelta 测试
- `docs/stories/sprint-status.yaml` — story 状态更新
