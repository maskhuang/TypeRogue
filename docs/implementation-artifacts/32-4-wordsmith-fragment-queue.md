# Story 32.4: 造词师 — 字母碎片资源 + 采集队列

Status: done

## Story

As a 造词师玩家,
I want 战斗中碎片产出通过采集队列自动分配到 26 种字母碎片池中,
so that 我可以通过设定队列精确控制字母碎片比例，为造词台积累所需字母。

## Acceptance Criteria

1. 字母碎片库存：26 个独立计数器（A-Z），跨关保留，Run 结束清零
2. 采集队列（Collection Queue）：
   - 长度 6-8 格（基础 6，遗物可扩展）
   - 玩家设定队列字母序列，如 `['e', 'e', 'a', 't', 's', '_']`
   - 空格 `'_'` 不产碎片（跳过该格）
   - 碎片产出时按队列顺序循环推进
   - 设一次 → 整个 Run 内有效，直到玩家修改
3. 概率溢出机制：
   - `floor(base × multiplier)` = 保底碎片数
   - `frac(base × multiplier)` = 额外碎片概率（使用 seeded random）
   - 产多碎片时队列前进对应格数
4. 采集队列同时服务产出者和转化者的碎片输出端
5. 单元测试覆盖概率溢出边界情况
6. 队列位置每关重置（`resetResources()` 中归零）

## Tasks / Subtasks

- [x] Task 1: GameState 新增队列字段 (AC: #1, #2)
  - [x] 1.1 `types.ts`: GameState 新增 `fragmentQueue: string[]` 和 `fragmentQueuePosition: number`
  - [x] 1.2 `state.ts`: `createInitialState()` 初始化 `fragmentQueue: ['_','_','_','_','_','_']`（基础 6 格，全空），`fragmentQueuePosition: 0`
  - [x] 1.3 `state.ts`: `resetResources()` 中重置 `fragmentQueuePosition = 0`（队列内容不重置，跨关保留）

- [x] Task 2: 碎片队列分配核心函数 (AC: #2, #3, #4)
  - [x] 2.1 创建 `src/src/systems/classes/FragmentQueue.ts`
  - [x] 2.2 实现 `distributeFragments(amount: number): Record<string, number>` — 按当前队列位置分配 amount 个碎片到各字母，返回分配结果（如 `{e: 2, a: 1}`），跳过 `'_'` 格，推进队列位置
  - [x] 2.3 实现概率溢出：`resolveFragmentAmount(rawAmount: number): number` — `floor(rawAmount)` 保底 + `frac(rawAmount)` 概率额外 +1（使用 `random()`）
  - [x] 2.4 实现 `setFragmentQueue(letters: string[]): void` — 设定队列内容（验证长度 ≤ 最大值，字母小写化）
  - [x] 2.5 实现 `getMaxQueueLength(): number` — 返回当前最大队列长度（基础 6 + 遗物扩展）

- [x] Task 3: 替换 _total 占位符 — 产出者碎片路由 (AC: #4)
  - [x] 3.1 `skills.ts` `triggerProducer`: 当 `prod.resource === 'fragment'` 时，调用 `resolveFragmentAmount(absDelta)` 计算实际碎片数，然后调用 `distributeFragments()` 分配到各字母
  - [x] 3.2 移除 `state.fragmentInventory._total` 写入，改为按 `distributeFragments()` 返回值写入各字母池
  - [x] 3.3 `state.classResourceProduced.fragment` 仍然累加原始 absDelta（未经概率溢出，因为转化者读数应基于稳定值）

- [x] Task 4: 替换 _total 占位符 — 转化者碎片路由 (AC: #4)
  - [x] 4.1 `skills.ts` `triggerConverter`: 当 `conv.target === 'fragment'` 时，同样调用 `resolveFragmentAmount` + `distributeFragments` 路由到字母池
  - [x] 4.2 `skills.ts` `triggerConverterWithReduction`: 同上适配

- [x] Task 5: 单元测试 (AC: #5, #6)
  - [x] 5.1 FragmentQueue.test.ts: distributeFragments 基本分配（单碎片、多碎片）
  - [x] 5.2 FragmentQueue.test.ts: 空格 `'_'` 跳过（全空队列不分配任何碎片）
  - [x] 5.3 FragmentQueue.test.ts: 队列循环（position 到末尾后回到头部）
  - [x] 5.4 FragmentQueue.test.ts: resolveFragmentAmount 概率溢出边界（×1.0=1、×2.0=2、×1.5=概率）
  - [x] 5.5 FragmentQueue.test.ts: 多碎片分配到多字母（amount=3 时推进 3 格）
  - [x] 5.6 resources.test.ts: resetResources 重置 fragmentQueuePosition 但不重置 fragmentQueue
  - [x] 5.7 resources.test.ts: createInitialState 包含 fragmentQueue 和 fragmentQueuePosition

## Dev Notes

### 关键架构约束

- **本 Story 不实现 UI**：队列编辑 UI 在 Story 32.6（造词台 UI）中实现。本 Story 只提供数据结构和核心分配函数。
- **本 Story 不定义具体碎片技能**：碎片产出者/转化者在 Story 32.5 中定义。本 Story 只修改碎片写入路径。
- **概率溢出使用 seeded random**：`random()`（`core/seededRandom.ts`），保证种子一致性。
- **classResourceProduced 累加原始值**：转化者读数基于 `classResourceProduced.fragment`。概率溢出影响的是实际写入库存的碎片数，不影响转化者读数。因此 `classResourceProduced` 应累加 `absDelta`（未经概率溢出的值），确保转化者读数稳定。
- **_total 键废弃**：Story 32.2 用 `_total` 作为占位。本 Story 替换为按字母分配后，`_total` 不再使用。但 fragmentInventory 仍是 `Record<string, number>`，`_total` 不需要显式删除——测试中可能需要更新。

### 现有代码模式（必须遵循）

**碎片产出写入点（`skills.ts` 3 处，均需修改）：**

1. `triggerProducer`（~line 411-415）：
```typescript
if (prod.resource === 'fragment') {
  const absDelta = Math.abs(delta);
  state.classResourceProduced.fragment = (state.classResourceProduced.fragment ?? 0) + absDelta;
  // 旧: state.fragmentInventory._total = ... ← 替换为队列分配
}
```

2. `triggerConverter`（~line 516-519）：
```typescript
if (conv.target === 'fragment') {
  const absDelta = Math.abs(delta);
  state.classResourceProduced.fragment = ... + absDelta;
  // 旧: state.fragmentInventory._total = ... ← 替换
}
```

3. `triggerConverterWithReduction`（~line 688-691）：
```typescript
if (conv.target === 'fragment') {
  const absDelta = Math.abs(delta);
  state.classResourceProduced.fragment = ... + absDelta;
  // 旧: state.fragmentInventory._total = ... ← 替换
}
```

**替换模式：**
```typescript
if (prod.resource === 'fragment') {
  const absDelta = Math.abs(delta);
  state.classResourceProduced.fragment = (state.classResourceProduced.fragment ?? 0) + absDelta;
  const actualAmount = resolveFragmentAmount(absDelta);
  const distributed = distributeFragments(actualAmount);
  for (const [letter, count] of Object.entries(distributed)) {
    state.fragmentInventory[letter] = (state.fragmentInventory[letter] ?? 0) + count;
  }
}
```

**fragmentInventory 初始化（`state.ts:30-32`）：**
```typescript
fragmentInventory: {
  a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0, k: 0, l: 0, m: 0,
  n: 0, o: 0, p: 0, q: 0, r: 0, s: 0, t: 0, u: 0, v: 0, w: 0, x: 0, y: 0, z: 0,
},
```
26 个字母键已初始化为 0。`_total` 是 Story 32.2 临时写入的额外键。

**resetResources()（`state.ts`）：**
```typescript
export function resetResources(): void {
  // ... 现有重置 ...
  state.resources.fragment = 0;
  state.resources.mutagen = 0;
  state.classResourceProduced = {};
  // +state.fragmentQueuePosition = 0;  ← 新增
}
```
注意：`fragmentQueue` 内容不在 `resetResources` 中重置（跨关保留）。Run 结束时 `resetState()` 会重置整个 state。

**seeded random（`core/seededRandom.ts`）：**
```typescript
import { random } from '../../core/seededRandom';
// random() 返回 [0, 1) 范围，使用种子生成
```

### FragmentQueue.ts 设计

```typescript
// src/src/systems/classes/FragmentQueue.ts
import { state } from '../../core/state';
import { random } from '../../core/seededRandom';

const BASE_QUEUE_LENGTH = 6;

export function getMaxQueueLength(): number {
  // 基础 6，遗物扩展在 Story 32.7 中实现（queryRelicFlag）
  return BASE_QUEUE_LENGTH;
}

export function resolveFragmentAmount(rawAmount: number): number {
  const base = Math.floor(rawAmount);
  const frac = rawAmount - base;
  return frac > 0 && random() < frac ? base + 1 : base;
}

export function distributeFragments(amount: number): Record<string, number> {
  const result: Record<string, number> = {};
  const queue = state.fragmentQueue;
  if (queue.length === 0) return result;

  let distributed = 0;
  let safetyLimit = queue.length; // 防止全 '_' 死循环
  while (distributed < amount && safetyLimit > 0) {
    const letter = queue[state.fragmentQueuePosition % queue.length];
    state.fragmentQueuePosition = (state.fragmentQueuePosition + 1) % queue.length;
    if (letter === '_') {
      safetyLimit--;
      continue;
    }
    safetyLimit = queue.length; // 遇到有效字母重置安全计数
    result[letter] = (result[letter] ?? 0) + 1;
    distributed++;
  }
  return result;
}

export function setFragmentQueue(letters: string[]): void {
  const maxLen = getMaxQueueLength();
  const capped = letters.slice(0, maxLen).map(l => l.toLowerCase());
  state.fragmentQueue = capped;
  // 位置可能越界，取模归位
  if (state.fragmentQueuePosition >= capped.length) {
    state.fragmentQueuePosition = 0;
  }
}
```

### 全 '_' 队列处理

当队列全部为 `'_'` 时，`distributeFragments` 不分配任何碎片（safetyLimit 耗尽后退出，`distributed < amount`）。碎片"丢失"。这是预期行为——玩家设了空队列就是不想收碎片。但 `classResourceProduced` 仍然累加（转化者读数不受影响）。

### 概率溢出与 classResourceProduced 的关系

```
triggerProducer 流程（fragment 路径）：
  delta = 基础值 × 附魔 × 增幅 × ...
  absDelta = |delta|                           // 原始浮点值
  classResourceProduced.fragment += absDelta   // 累加原始值（转化者读数）
  actualAmount = resolveFragmentAmount(absDelta) // 概率溢出 → 整数
  distributed = distributeFragments(actualAmount) // 按队列分配
  for letter in distributed: fragmentInventory[letter] += count // 写入库存
```
设计要点：`classResourceProduced` 累加浮点 `absDelta`（精确），`fragmentInventory` 累加离散整数（经概率溢出）。

### 测试中 _total 键的处理

Story 32.2 的 `resources.test.ts` 有测试使用 `fragmentInventory._total`：
```typescript
it('fragmentInventory._total 可正确累加', () => {
  state.fragmentInventory._total = (state.fragmentInventory._total ?? 0) + 4;
  ...
```
本 Story 替换后，这些测试应更新为使用具体字母键（如 `state.fragmentInventory.e`）。或者保留 `_total` 测试但标注为 legacy。

### Project Structure Notes

新增文件：
```
src/src/systems/classes/
└── FragmentQueue.ts      # distributeFragments(), resolveFragmentAmount(), setFragmentQueue()
tests/unit/systems/classes/
└── FragmentQueue.test.ts  # 队列分配 + 概率溢出测试
```

修改文件：
```
src/src/core/types.ts     # GameState +fragmentQueue, +fragmentQueuePosition
src/src/core/state.ts     # createInitialState() +队列初始化, resetResources() +位置重置
src/src/systems/skills.ts # triggerProducer/triggerConverter/triggerConverterWithReduction 碎片路由
tests/unit/core/resources.test.ts  # +队列字段测试, 更新 _total 相关测试
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.4] — 验收标准
- [Source: docs/class-design-wordsmith.md] — 采集队列机制、概率溢出、字母比例控制
- [Source: src/src/core/types.ts:162] — fragmentInventory 类型定义
- [Source: src/src/core/state.ts:30-32] — fragmentInventory 26 键初始化
- [Source: src/src/systems/skills.ts:411-415] — triggerProducer fragment 写入点
- [Source: src/src/systems/skills.ts:516-519] — triggerConverter fragment 写入点
- [Source: src/src/systems/skills.ts:688-691] — triggerConverterWithReduction fragment 写入点
- [Source: src/src/core/seededRandom.ts] — seeded random() 函数
- [Source: docs/implementation-artifacts/32-2-class-resource-pipeline.md] — _total 占位符设计说明
- [Source: docs/implementation-artifacts/32-3-class-loss-mechanism.md] — 前序 Story 实现记录

### Git Intelligence

最近提交：
```
ef012f9 feat: Story 32-2 职业专属资源管道（fragment/mutagen ResourceType扩展+池过滤+库存追踪）+ code review修复
39a3d56 feat: Story 32-1 职业定义框架 + 选择界面
```
模式：`feat/fix + Story 编号 + 中文描述 + 括号内关键实现细节`

### Previous Story Intelligence

Story 32-3（职业失去机制）关键教训：
- **数据驱动**：code review 强调避免硬编码 classId 检查，应通过数据结构（CLASS_DEFINITIONS）查询
- **applyRandomEnchantment 双重反馈**：code review 发现调用链中重复 showFeedback。本 Story 的 fragment 分配函数应是纯计算函数，不包含 UI 副作用
- **seeded random**：概率溢出必须使用 `random()` 而非 `Math.random()`

Story 32-2（职业资源管道）关键教训：
- **_total 占位符**：明确标注为 Story 32.4 替换目标
- **classResourceProduced vs inventory 分离**：转化者读 classResourceProduced（累计产出），消费读 fragmentInventory。本 Story 的概率溢出只影响 inventory 写入，不影响 classResourceProduced
- **3 处碎片写入点**：triggerProducer + triggerConverter + triggerConverterWithReduction，code review 发现遗漏时造成过数据不一致。本 Story 必须确保 3 处全部替换

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- 全部 63 测试通过（FragmentQueue 25 + resources 38）
- 全套 3038 测试通过，10 个预存在失败（battle-stats calculateRating 签名、actTransition ScoreRoller）与本 Story 无关

### Completion Notes List
- Task 1: GameState 新增 fragmentQueue/fragmentQueuePosition，state 初始化与 resetResources 重置位置
- Task 2: FragmentQueue.ts 实现 5 个核心函数（distributeFragments, resolveFragmentAmount, setFragmentQueue, getMaxQueueLength, routeFragmentsToInventory）
- Task 3: triggerProducer fragment 路径替换 _total → routeFragmentsToInventory 单行调用
- Task 4: triggerConverter + triggerConverterWithReduction 同样替换
- Task 5: 25 个 FragmentQueue 单元测试 + 2 个 resources 队列字段测试 + 更新 _total 遗留测试为字母分配测试
- classResourceProduced 仍累加原始 absDelta（浮点），fragmentInventory 累加经概率溢出的离散整数
- Code review 修复：提取 routeFragmentsToInventory 消除 3 处重复、setFragmentQueue 非法字符过滤、routeFragmentsToInventory 集成测试、全'_'队列 position 状态验证

### File List
- `src/src/systems/classes/FragmentQueue.ts` — NEW（采集队列核心函数）
- `src/src/core/types.ts` — MODIFIED（GameState +fragmentQueue, +fragmentQueuePosition）
- `src/src/core/state.ts` — MODIFIED（初始化 + resetResources 重置位置）
- `src/src/systems/skills.ts` — MODIFIED（3 处 _total 替换为队列分配）
- `src/tests/unit/systems/classes/FragmentQueue.test.ts` — NEW（21 tests）
- `src/tests/unit/core/resources.test.ts` — MODIFIED（更新 _total 测试 + 队列字段测试）
