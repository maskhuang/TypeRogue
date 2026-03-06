# Story 25.6: 每日种子系统

Status: done

## Story

As a 玩家,
I want 每天进入固定种子的挑战模式，初始条件（词库、商店序列、Boss 选项）完全一致,
so that 我能与其他玩家在公平条件下竞争，比较同一天同一起跑线的表现差距.

## Acceptance Criteria

1. **AC1 — 种子化随机数生成器**
   - 新建 `core/seededRandom.ts` 模块
   - 实现 `SeededRandom` 类：接受整数种子，输出 [0,1) 伪随机数序列
   - 提供全局 `random()` 函数：普通模式 → `Math.random()`，每日种子模式 → `SeededRandom.next()`
   - 提供 `shuffleArray(arr, rng?)` 工具函数（接受可选的随机源）
   - 算法选择：mulberry32 或同级质量 32 位 PRNG（速度优先，不需要密码学安全）

2. **AC2 — 种子值由日期生成**
   - 公式：`seed = hashCode(YYYY-MM-DD)` 产生 32 位整数
   - 同一天（UTC 日期）多次游玩，种子相同
   - 提供 `getDailySeed(): number` 和 `getDailySeedString(): string`（返回 `YYYY-MM-DD`）

3. **AC3 — 种子控制范围**
   - 种子控制以下随机过程（进入每日模式后全局切换 `random()`）：
     - 初始词库选择（`getStarterWords()`）
     - Boss 修饰器池抽取（`drawBossModifiers()`）
     - 商店刷新序列（`generateShopItems()` 中的 `shuffleArray` + `weightedPick` + 定价随机）
     - 战斗中出词顺序（`pickWord()`）
     - Boss 修饰器候选（`generateBossModifierCandidates()`）
     - 转化者/连接者/增幅者池抽取（`drawConverterPool()`, `drawConnectorPool()`, `drawAmplifierPool()`）
   - **不控制**（保持 `Math.random()`）：
     - 粒子效果（`particles.ts`, `ParticleManager.ts`）
     - 遗物概率触发（`RelicEffects.ts`）
     - 技能随机目标选择（`skills.ts`）
     - 条件概率评估（`ConditionEvaluator.ts`）
   - 理由：视觉效果和战斗中概率触发不影响公平性，且保持自然随机手感

4. **AC4 — 每日种子模式入口**
   - 在 `index.html` gameover-screen 区域添加"每日挑战"按钮，或在 main.ts `init()` 中添加模式选择
   - `state` 新增 `gameMode: 'normal' | 'daily'` 字段
   - `state` 新增 `dailySeed: number | null` 字段（每日模式时记录种子值）
   - 进入每日模式时：设置种子 → `SeededRandom.setSeed(seed)` → 切换全局 `random()` → 开始 Run
   - Run 结束后恢复到普通模式（`random()` 回退到 `Math.random()`）

5. **AC5 — 每日种子独立排行榜**
   - `LeaderboardEntry` 新增可选字段 `seed?: number`
   - `MetaState` 新增 `dailyLeaderboard: LeaderboardEntry[]`（独立于普通排行榜，最多 20 条）
   - 每日模式结束时记录到 `dailyLeaderboard`，普通模式记录到 `leaderboard`（现有逻辑不变）
   - `getLeaderboard(mode: 'normal' | 'daily')` 返回对应排行榜
   - `serialize()` 版本号不变（v2 已支持 leaderboard 数组，新增 dailyLeaderboard 字段，`deserialize()` 缺失时默认空）

6. **AC6 — 确定性验证**
   - 同一天同一种子，两次运行的初始词库完全一致
   - 同一种子同一操作序列，商店刷新出的技能/词包完全一致
   - 单元测试验证：给定固定种子，调用 `getStarterWords()` 两次返回相同结果

7. **AC7 — 单元测试**
   - SeededRandom：固定种子多次 next() 输出一致
   - SeededRandom：不同种子输出不同
   - getDailySeed：同一天返回相同种子
   - getDailySeed：不同天返回不同种子
   - shuffleArray with seeded random：固定种子洗牌结果一致
   - 全局 random() 切换：种子模式 vs 普通模式行为正确
   - 每日排行榜独立于普通排行榜
   - `LeaderboardEntry.seed` 序列化/反序列化

## Tasks / Subtasks

- [x] Task 1: SeededRandom 核心模块 (AC: 1, 2)
  - [x] 1.1 创建 `src/src/core/seededRandom.ts`
  - [x] 1.2 实现 `SeededRandom` 类：`constructor(seed: number)`, `next(): number`（返回 [0,1)）, `nextInt(min, max): number`
  - [x] 1.3 实现 `hashCode(str: string): number`（字符串 → 32 位整数哈希）
  - [x] 1.4 实现 `getDailySeed(): number` 和 `getDailySeedString(): string`（基于 UTC 日期）
  - [x] 1.5 实现全局 `random()` 函数 + `setSeededMode(seed)` / `setNormalMode()` 切换
  - [x] 1.6 实现 `seededShuffle<T>(arr: T[], rng: SeededRandom): T[]`（种子洗牌，不修改原数组）

- [x] Task 2: 替换关键随机调用 (AC: 3)
  - [x] 2.1 `data/words.ts` — `getStarterWords()` 使用全局 `random()`
  - [x] 2.2 `data/bossModifiers.ts` — `drawBossModifiers()` 和 `generateBossModifierCandidates()` 使用全局 `random()`
  - [x] 2.3 `systems/shop.ts` — `shuffleArray()`, `weightedPick()`, 定价随机使用全局 `random()`
  - [x] 2.4 `systems/battle.ts` — `pickWord()` 使用全局 `random()`
  - [x] 2.5 `data/converters.ts`, `data/connectors.ts`, `data/amplifiers.ts` — 池抽取使用全局 `random()`
  - [x] 2.6 `data/wordPacks.ts` — 牌包随机使用全局 `random()`

- [x] Task 3: 游戏模式状态 (AC: 4)
  - [x] 3.1 `core/types.ts` + `core/state.ts` — 添加 `gameMode: 'normal' | 'daily'` 和 `dailySeed: number | null`
  - [x] 3.2 `main.ts` — 添加每日模式入口 UI（按钮 "每日挑战"，显示当日日期）
  - [x] 3.3 `main.ts` — 进入每日模式时调用 `setSeededMode(getDailySeed())`，设置 state.gameMode / state.dailySeed
  - [x] 3.4 `systems/battle.ts` — `gameOver()` 和 `victory()` 调用 `setNormalMode()` 恢复普通随机
  - [x] 3.5 `index.html` — 添加每日挑战按钮 HTML + CSS 样式

- [x] Task 4: 每日排行榜 (AC: 5)
  - [x] 4.1 `LeaderboardEntry` 新增 `seed?: number` 字段
  - [x] 4.2 `MetaState` 新增 `dailyLeaderboard: LeaderboardEntry[]` 字段 + `addDailyLeaderboardEntry()` + `getDailyLeaderboard()`
  - [x] 4.3 `MetaState.recordLeaderboardEntry()` — 根据 `data.seed` 分流到普通/每日排行榜
  - [x] 4.4 `MetaState.serialize()` / `deserialize()` — 包含 dailyLeaderboard（v3，缺失默认空数组）
  - [x] 4.5 `leaderboardDisplay.ts` — 双栏渲染（普通 + 每日挑战榜）

- [x] Task 5: 单元测试 (AC: 6, 7)
  - [x] 5.1 SeededRandom 确定性：固定种子 → 相同序列
  - [x] 5.2 SeededRandom 差异性：不同种子 → 不同序列
  - [x] 5.3 getDailySeed 日期一致性
  - [x] 5.4 seededShuffle 确定性
  - [x] 5.5 全局 random() 模式切换
  - [x] 5.6 getStarterWords + seeded mode → 确定性验证
  - [x] 5.7 每日排行榜独立性 + 序列化
  - [x] 5.8 运行全部现有测试确认无回归（100/104 pass，4 failures pre-existing）

## Dev Notes

### 核心设计意图

每日种子是无尽模式的社交竞技层。所有玩家每天面对相同的初始条件（词库、商店序列、Boss 选项），排行榜按最高周目数排名。这创造了公平竞争的基础，也为社交分享提供话题（"今天的种子你打到第几周目？"）。

### SeededRandom 算法选择

推荐 **mulberry32**：

```typescript
// mulberry32 — 高质量 32 位 PRNG，单个整数状态
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

优势：无外部依赖、速度快、分布均匀、代码极短。

### 全局 random() 切换策略

```typescript
// seededRandom.ts
let _rng: (() => number) = Math.random;

export function random(): number { return _rng(); }

export function setSeededMode(seed: number): void {
  const sr = new SeededRandom(seed);
  _rng = () => sr.next();
}

export function setNormalMode(): void {
  _rng = Math.random;
}
```

替换策略：只替换影响公平性的调用点（AC3 列表），粒子/概率触发保持 `Math.random()`。
在需要替换的文件中：`import { random } from '../core/seededRandom'`，将 `Math.random()` → `random()`。

### 数据流

```
主菜单 → [每日挑战] 按钮
  ├─ getDailySeed() → seed (基于 UTC 日期)
  ├─ setSeededMode(seed) → 全局 random() 切换到 SeededRandom
  ├─ state.gameMode = 'daily', state.dailySeed = seed
  └─ init() → getStarterWords() [种子控制] → drawBossModifiers() [种子控制] → startLevel()
       └─ 商店/出词/Boss 候选 全部使用全局 random()

Run 结束 → gameOver()
  ├─ recordLeaderboardEntry() → dailyLeaderboard (if gameMode === 'daily')
  ├─ setNormalMode() → 恢复 Math.random()
  └─ state.gameMode = 'normal'
```

### Math.random() 调用点分析

**必须替换（影响公平性）— 共 ~20 处：**

| 文件 | 函数 | 调用次数 | 说明 |
|------|------|----------|------|
| `data/words.ts` | `getStarterWords()` | 1 | 初始词库洗牌 |
| `data/bossModifiers.ts` | `drawBossModifiers()` | 1 | Boss 修饰器池 |
| `data/bossModifiers.ts` | `generateBossModifierCandidates()` | 1 | Boss 候选洗牌 |
| `systems/shop.ts` | `shuffleArray()` | 1 | 商店通用洗牌 |
| `systems/shop.ts` | `weightedPick()` | 1 | 加权抽取 |
| `systems/shop.ts` | 定价随机 | 2 | 技能价格浮动 |
| `systems/shop.ts` | 金币技能随机 | 2 | 金币技能选取 |
| `systems/battle.ts` | `pickWord()` | 5 | 出词随机选择 |
| `data/converters.ts` | `drawConverterPool()` | 1 | 转化者洗牌 |
| `data/connectors.ts` | `drawConnectorPool()` | 1 | 连接者洗牌 |
| `data/amplifiers.ts` | `drawAmplifierPool()` | 1 | 增幅者洗牌 |
| `data/wordPacks.ts` | 牌包随机 | 2 | 词包生成 |

**不替换（视觉/概率，不影响公平性）— 保持 Math.random()：**
- `effects/particles.ts` (2) — 粒子方向
- `ui/effects/ParticleManager.ts` (4) — 粒子视觉
- `systems/skills.ts` (4) — 技能随机目标
- `systems/relics/RelicEffects.ts` (1) — 遗物概率
- `systems/modifiers/ConditionEvaluator.ts` (1) — 条件概率
- `systems/restStage.ts` (8) — 休息事件（每日模式可能无休息关）
- `systems/relicPicker.ts` (1) — 遗物选择（可考虑后续加入种子控制）
- `data/enchantments.ts` (2) — 附魔随机
- `data/restEvents.ts` (1) — 休息事件

### MetaState 序列化扩展

```typescript
// serialize() — v2 不变，新增 dailyLeaderboard
{
  version: 2,
  // ...existing fields...
  leaderboard: [...],
  dailyLeaderboard: [...],  // 新增
}

// deserialize() — 兼容：缺失则空数组
this.dailyLeaderboard = data.dailyLeaderboard || []
```

`LeaderboardEntry` 新增 `seed?: number` 字段。普通排行榜条目无 seed，每日排行榜条目有 seed。

### 与前后 Story 的关系

- **Story 25.1 (已完成)**: 提供 `state.cycle`、周目循环结构
- **Story 25.2 (已完成)**: 分数/时间 cycle 缩放（每日模式同样适用）
- **Story 25.3 (已完成)**: Boss 修饰器选择（每日模式种子控制候选）
- **Story 25.5 (已完成)**: 排行榜基础设施（本 story 扩展为双排行榜）
- **Story 25.4 (暂定)**: 稀有商店货架（如实现，其随机也应受种子控制）

### Project Structure Notes

- 新增文件: `core/seededRandom.ts`（种子随机核心模块）
- 修改文件: `core/state.ts`（gameMode + dailySeed 字段）
- 修改文件: `core/state/MetaState.ts`（dailyLeaderboard + LeaderboardEntry.seed）
- 修改文件: `data/words.ts`, `data/bossModifiers.ts`, `data/converters.ts`, `data/connectors.ts`, `data/amplifiers.ts`, `data/wordPacks.ts`（Math.random → random()）
- 修改文件: `systems/shop.ts`, `systems/battle.ts`（Math.random → random()）
- 修改文件: `main.ts`（每日模式入口 + 模式切换）
- 修改文件: `index.html`（每日挑战按钮）
- 修改文件: `ui/leaderboardDisplay.ts`（双排行榜渲染）
- 新增测试: `tests/unit/core/seededRandom.test.ts`
- 依赖: 无新依赖

### References

- [Source: docs/epics.md#Epic25-Story25.6 (line 1614-1638)] — AC 定义 + 技术说明
- [Source: docs/brainstorming-session-2026-03-05.md#每日种子 (line 43, 82, 519)] — 设计原意
- [Source: docs/gdd.md#每日挑战 (line 446-450)] — GDD 规格
- [Source: src/core/seededRandom.ts] — 新建文件（mulberry32 算法）
- [Source: src/core/state/MetaState.ts] — 排行榜基础设施
- [Source: src/systems/battle.ts] — pickWord()、gameOver() 随机 + 排行榜触发
- [Source: src/systems/shop.ts] — 商店刷新随机
- [Source: src/data/words.ts] — getStarterWords() 初始词库
- [Source: src/data/bossModifiers.ts] — drawBossModifiers() 修饰器抽取

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
