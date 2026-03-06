# Story 24.5: 独立·吞噬附魔逻辑

Status: review

## Story

As a 玩家,
I want 吞噬附魔在战斗中每触发 5 次自动检查并吞噬相邻弱技能，获取其图标并获得每图标 +20% 增幅,
so that 吞噬附魔提供独特的"食物链"成长路径，玩家可以策略性地放置廉价技能作为饲料，养大捕食者.

## Acceptance Criteria

1. 图标计数规则：`getIconCount(skillId)` 返回 `1 (技能本身) + (有附魔 ? 1 : 0) + devourIcons[skillId].length`
2. 吞噬条件：每 `DEVOUR_TRIGGER_THRESHOLD`(=5) 次战斗内触发 → 自动检查相邻技能图标数是否少于自己
3. 吞噬执行：被吞技能从 `bindings`/`skills`/`enchantedSkills` 移除，其图标加入吞噬者的 `devourIcons` 列表
4. 增幅计算：`getEnchantmentMultiplier()` 返回 `1 + getIconCount(skillId) × 0.20`
5. 键盘可视化显示吞噬图标（技能图标前显示吞噬来的图标）
6. 不可反悔，被吞技能本局永久消失（从 skills Map 移除，不可重新绑定）
7. 吞噬反馈：`showFeedback` + `playSound`
8. `devourCounters` 每关重置（per-battle），`devourIcons` 跨关保持（per-run）
9. 溅射/共鸣子触发也计入吞噬触发次数
10. 单元测试覆盖：图标计数、条件判断、吞噬执行、增幅计算、边界情况

## Tasks / Subtasks

- [x] Task 1: 新增 `devourCounters` per-battle 状态 (AC: 2, 8)
  - [x] 1.1 `core/types.ts` — `GameState` 新增 `devourCounters: Map<string, number>`，注释：吞噬附魔战斗内触发计数，每关重置
  - [x] 1.2 `core/state.ts` — 初始值 `devourCounters: new Map()`
  - [x] 1.3 `systems/battle.ts` — 在 `amplifierStacks.clear()` (line 674) 旁添加 `state.devourCounters.clear()`
  - [x] 1.4 注意：devourCounters 不需要 RunState 序列化（per-battle，非跨关持久）

- [x] Task 2: 新增 `getIconCount()` + `getEnchantmentMultiplier` 吞噬分支 (AC: 1, 4)
  - [x] 2.1 `systems/skills.ts` — 新增 `export function getIconCount(skillId: string): number`
  - [x] 2.2 实现公式：`1 + (state.player.enchantedSkills.has(skillId) ? 1 : 0) + (state.devourIcons.get(skillId)?.length || 0)`
  - [x] 2.3 `getEnchantmentMultiplier()` — 在 growth/mastery 分支后添加 devour 分支
  - [x] 2.4 `if (ench.id === 'ench_devour')` → `return 1 + getIconCount(skillId) * ench.effectValue`

- [x] Task 3: 新增 `checkDevourAccumulation()` + `executeDevour()` 函数 (AC: 2, 3, 6, 7, 8)
  - [x] 3.1 `systems/skills.ts` — 新增常量 `const DEVOUR_TRIGGER_THRESHOLD = 5`
  - [x] 3.2 新增 `export function checkDevourAccumulation(skillId: string, triggerKey?: string): void`
  - [x] 3.3 检查 `state.player.enchantedSkills.get(skillId) === 'ench_devour'`，否则 return
  - [x] 3.4 自增 `state.devourCounters.set(skillId, newCount)`
  - [x] 3.5 里程碑检查：`if (newCount % DEVOUR_TRIGGER_THRESHOLD !== 0) return`
  - [x] 3.6 反查吞噬者绑定键位：遍历 `state.player.bindings` 找到 `boundKey` where `boundSkillId === skillId`
  - [x] 3.7 用 `getKeysWithRelation(boundKey, ench.positionRelation)` 获取相邻键位
  - [x] 3.8 遍历相邻键位，找图标数最少且 < 自身图标数的技能
  - [x] 3.9 找到目标 → 调用 `executeDevour(skillId, targetSkillId, targetKey)`
  - [x] 3.10 新增 `function executeDevour(devourSkillId, targetSkillId, targetKey): void`
  - [x] 3.11 获取目标图标：`getSkillDisplayInfo(targetSkillId)` 取 icon 字段（使用原始技能图标，非附魔图标）
  - [x] 3.12 添加图标：`state.devourIcons.get(devourSkillId)` push targetIcon（不存在则创建数组）
  - [x] 3.13 移除目标：`state.player.bindings.delete(targetKey)` + `state.player.skills.delete(targetSkillId)` + `state.player.enchantedSkills.delete(targetSkillId)`
  - [x] 3.14 反馈：`showFeedback('🦷 吞噬! ${targetIcon}', '#e74c3c')` + `playSound('skill')`

- [x] Task 4: 在触发函数中插入吞噬累积调用 (AC: 2, 9)
  - [x] 4.1 `triggerProducer()` — 在 `checkMasteryAccumulation` 后添加 `checkDevourAccumulation(producerId, triggerKey)`
  - [x] 4.2 `triggerConverter()` — 同上 `checkDevourAccumulation(converterId, triggerKey)`
  - [x] 4.3 `triggerAmplifier()` — 同上 `checkDevourAccumulation(ampId, triggerKey)`
  - [x] 4.4 `triggerProducerWithReduction()` — 同上 `checkDevourAccumulation(producerId, triggerKey)`
  - [x] 4.5 `triggerConverterWithReduction()` — 同上 `checkDevourAccumulation(converterId, triggerKey)`
  - [x] 4.6 `triggerAmplifierResonance()` — 同上 `checkDevourAccumulation(ampId, key)`

- [x] Task 5: 键盘可视化吞噬图标显示 (AC: 5)
  - [x] 5.1 找到键盘可视化中技能图标的渲染位置（shop.ts:854 HTML 键盘）
  - [x] 5.2 在技能图标前插入 `state.devourIcons.get(skillId)` 的图标列表（devour-icons span）
  - [x] 5.3 添加 CSS 样式 `.devour-icons { font-size: 8px; opacity: 0.8; }`

- [x] Task 6: 编写单元测试 (AC: 10)
  - [x] 6.1 `tests/unit/systems/enchantment-effects.test.ts` — 新增吞噬附魔 describe 块
  - [x] 6.2 测试：getIconCount — 无附魔无吞噬 → 1
  - [x] 6.3 测试：getIconCount — 有附魔 → 2
  - [x] 6.4 测试：getIconCount — 有附魔 + 吞噬 2 个 → 4
  - [x] 6.5 测试：checkDevourAccumulation — 触发 4 次 → 不吞噬（未达阈值）
  - [x] 6.6 测试：checkDevourAccumulation — 触发 5 次 + 相邻弱技能 → 吞噬执行
  - [x] 6.7 测试：checkDevourAccumulation — 触发 5 次 + 无弱邻居 → 不吞噬
  - [x] 6.8 测试：executeDevour — 目标从 bindings/skills/enchantedSkills 移除
  - [x] 6.9 测试：executeDevour — 目标图标加入 devourIcons
  - [x] 6.10 测试：getEnchantmentMultiplier — devour 2 图标 → 1.4, 4 图标 → 1.8
  - [x] 6.11 测试：无吞噬附魔 → devourCounters 不变

## Dev Notes

### 当前系统状态（Story 24.4 完成后）

| 组件 | 状态 |
|------|------|
| `ench_devour` 数据 | 已在 `enchantments.ts:52` 定义，`category: 'independent'`, `positionRelation: Adjacent`, `effectValue: 0.20` |
| `devourIcons` 状态 | `Map<string, string[]>` 已在 GameState 和 RunState 中（Story 24.1），跨关保持 |
| `devourCounters` 状态 | **不存在，需新增**（per-battle，仅 GameState） |
| `getEnchantmentMultiplier()` | 处理 `growth`/`mastery`（合并分支）和 `repulsion`，对 devour 尚无处理 |
| `getIconCount()` | **不存在，需新增** |
| `checkDevourAccumulation()` | **不存在，需新增** |
| 键盘可视化 | 尚无 devourIcons 显示逻辑 |

### 关键函数位置

| 函数 | 文件:行 | 用途 |
|------|---------|------|
| `getEnchantmentMultiplier()` | `skills.ts:~78` | 附魔倍率计算，需添加 devour 分支 |
| `checkMasteryAccumulation()` | `skills.ts:~132` | 精通累积（参考模式） |
| `triggerProducer()` | `skills.ts:~189` | 产出者触发，需插入 devour 调用 |
| `triggerConverter()` | `skills.ts:~280` | 转化者触发，需插入 devour 调用 |
| `triggerAmplifier()` | `skills.ts:~726` | 增幅者触发，需插入 devour 调用 |
| `triggerProducerWithReduction()` | `skills.ts:~394` | 溅射/共鸣子触发产出者 |
| `triggerConverterWithReduction()` | `skills.ts:~450` | 溅射/共鸣子触发转化者 |
| `triggerAmplifierResonance()` | `skills.ts:~559` | 共鸣子触发增幅者 |
| `amplifierStacks.clear()` | `battle.ts:674` | per-battle 重置位置（devourCounters 同理） |
| `getSkillDisplayInfo()` | `data/skills.ts:59` | 技能图标获取（devour 取目标原始图标用） |

### getIconCount() 实现要点

```typescript
export function getIconCount(skillId: string): number {
  let count = 1; // 技能本身 = 1 图标
  if (state.player.enchantedSkills.has(skillId)) count += 1; // 附魔 = +1
  const devoured = state.devourIcons.get(skillId);
  if (devoured) count += devoured.length; // 每吞噬 = +1
  return count;
}
```

### checkDevourAccumulation() 实现要点

```typescript
const DEVOUR_TRIGGER_THRESHOLD = 5;

export function checkDevourAccumulation(skillId: string, triggerKey?: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (enchId !== 'ench_devour') return;

  const ench = ENCHANTMENTS[enchId];
  if (!ench || !ench.positionRelation) return;

  // 自增 per-battle 计数
  const current = state.devourCounters.get(skillId) || 0;
  const newCount = current + 1;
  state.devourCounters.set(skillId, newCount);

  // 每 5 次触发 → 检查吞噬
  if (newCount % DEVOUR_TRIGGER_THRESHOLD !== 0) return;

  // 反查吞噬者的绑定键位（不依赖 triggerKey，因为溅射/共鸣时 triggerKey 是源键）
  let devourerKey: string | undefined;
  for (const [bk, bId] of state.player.bindings) {
    if (bId === skillId) { devourerKey = bk; break; }
  }
  if (!devourerKey) return;

  const myIconCount = getIconCount(skillId);
  const adjacentKeys = getKeysWithRelation(devourerKey, ench.positionRelation);

  // 找图标数最少且 < 自身的相邻技能
  let weakestId: string | null = null;
  let weakestKey: string | null = null;
  let weakestCount = Infinity;

  for (const adjKey of adjacentKeys) {
    const adjSkillId = state.player.bindings.get(adjKey);
    if (!adjSkillId || adjSkillId === skillId) continue;
    const adjCount = getIconCount(adjSkillId);
    if (adjCount < myIconCount && adjCount < weakestCount) {
      weakestId = adjSkillId;
      weakestKey = adjKey;
      weakestCount = adjCount;
    }
  }

  if (weakestId && weakestKey) {
    executeDevour(skillId, weakestId, weakestKey);
  }
}
```

### executeDevour() 实现要点

```typescript
function executeDevour(devourSkillId: string, targetSkillId: string, targetKey: string): void {
  // 获取目标技能的原始图标（不含附魔覆盖）
  const targetInfo = getSkillDisplayInfo(targetSkillId);
  const targetIcon = targetInfo.icon;

  // 添加图标到吞噬者
  const icons = state.devourIcons.get(devourSkillId) || [];
  icons.push(targetIcon);
  state.devourIcons.set(devourSkillId, icons);

  // 永久移除目标（本局内）
  state.player.bindings.delete(targetKey);
  state.player.skills.delete(targetSkillId);
  state.player.enchantedSkills.delete(targetSkillId);

  // 反馈
  showFeedback(`🦷 吞噬! ${targetIcon}`, '#e74c3c');
  playSound('skill');
}
```

### getEnchantmentMultiplier() devour 分支

```typescript
// 在 growth/mastery 合并分支后添加：
if (ench.id === 'ench_devour') {
  return 1 + getIconCount(skillId) * ench.effectValue;
}
```

### 吞噬 vs 成长 vs 精通 — 设计对比

| 维度 | 空间·成长 | 独立·精通 | 独立·吞噬 |
|------|----------|----------|----------|
| 触发条件 | 邻居技能触发 | 自身触发 | 自身触发 (每5次) |
| 依赖位置 | 是 | 否 | 是（吞噬目标） |
| 累积方式 | 每次 += effectValue | 每10次 += 0.05 | 吞噬邻居图标 |
| 倍率计算 | 1 + growthValues | 1 + growthValues | 1 + iconCount × 0.20 |
| 计数器 | 无（直接累积） | masteryCounters (per-run) | devourCounters (per-battle) |
| 存储路径 | growthValues | masteryCounters + growthValues | devourCounters + devourIcons |
| 副作用 | 无 | 无 | **移除相邻技能** |
| 防递归 | _growthActive | 不需要 | 不需要（不触发技能） |

### 状态管理模式

```typescript
// core/types.ts — GameState 新增
devourCounters: Map<string, number>;  // 吞噬附魔战斗内触发计数（per-battle，每关重置）

// core/state.ts — 初始化
devourCounters: new Map(),

// systems/battle.ts — per-battle 重置（在 amplifierStacks.clear() 旁）
state.devourCounters.clear();

// 注意：devourCounters 不需要 RunState 序列化（per-battle 状态）
// devourIcons 已有 RunState 序列化（Story 24.1）
```

### 目标图标获取注意事项

`executeDevour` 中获取目标图标时，应使用**原始技能图标**而非附魔覆盖的图标：
- `getSkillDisplayInfo(targetSkillId)` 不传 `enchantedSkills` 参数 → 返回原始技能图标
- 或直接从 `PRODUCERS[id]?.icon || CONVERTERS[id]?.icon || AMPLIFIERS[id]?.icon` 获取

### 键盘可视化集成要点

- 找到键盘键位上显示技能图标的渲染代码
- 当 `state.devourIcons.get(skillId)?.length > 0` 时，在主图标前拼接吞噬来的图标
- 例：`🔥⚡🦷` 表示吞噬了 🔥 和 ⚡，自身附魔为 🦷
- 被吞键位清空显示（bindings 已删除，自然不渲染）

### 与其他附魔的交互

| 附魔类型 | 交互方式 |
|---------|---------|
| 空间·成长 growth | 无冲突（一个技能只有一个附魔） |
| 独立·精通 mastery | 无冲突（一个技能只有一个附魔） |
| 溅射 splash | 溅射触发该技能 → 吞噬计数 +1 |
| 共鸣 resonance | 共鸣触发该技能 → 吞噬计数 +1 |
| 排斥 repulsion | 无交互 |
| 变性 transmutation | 无交互 |
| 被吞技能的附魔 | 被吞时一并移除（enchantedSkills.delete） |

### Project Structure Notes

- 修改 3 个源文件：`core/types.ts`, `core/state.ts`（状态）+ `systems/battle.ts`（重置）+ `systems/skills.ts`（逻辑）
- 修改键盘可视化渲染文件（具体文件需探索）
- 修改 1 个测试文件：`enchantment-effects.test.ts`
- 无新增文件，无新增外部依赖

### References

- [Source: docs/epics.md#Epic 24, Story 24.5 — 独立·吞噬附魔逻辑]
- [Source: docs/brainstorming-session-2026-03-05.md#Section F+ — 吞噬附魔设计（line 339-345）]
- [Source: docs/stories/24-4-mastery-enchantment-logic.md — checkMasteryAccumulation 参考模式]
- [Source: docs/stories/24-3-spatial-growth-trigger-logic.md — checkGrowthAccumulation 参考模式]
- [Source: docs/stories/24-1-growth-value-state.md — devourIcons 状态就绪]
- [Source: src/src/data/enchantments.ts:52 — ench_devour 定义（effectValue=0.20, positionRelation=Adjacent）]
- [Source: src/src/core/types.ts:151 — devourIcons: Map<string, string[]>]
- [Source: src/src/systems/battle.ts:674 — amplifierStacks.clear() per-battle 重置位置]
- [Source: src/src/data/skills.ts:59-103 — getSkillDisplayInfo() 图标显示模式]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

N/A

### Completion Notes List

- `devourCounters: Map<string, number>` 添加到 GameState（per-battle），battle.ts 每关重置
- `getIconCount(skillId)` 实现：1 (skill) + 1 (enchant) + devourIcons.length
- `checkDevourAccumulation(skillId, triggerKey)` 实现：每 5 次触发检查相邻弱技能 → executeDevour
- `executeDevour()` 实现：移除目标 (bindings/skills/enchantedSkills) + 收集图标到 devourIcons + 反馈
- `getEnchantmentMultiplier()` 吞噬分支：`1 + getIconCount(skillId) * 0.20`
- 6 个调用点：triggerProducer, triggerConverter, triggerAmplifier + triggerProducerWithReduction, triggerConverterWithReduction, triggerAmplifierResonance
- 商店键盘渲染：devour-icons span 前缀 + CSS 样式
- 11 个新测试（3 getIconCount + 5 checkDevourAccumulation + 2 getEnchantmentMultiplier devour + 1 集成测试）
- 41 个 enchantment-effects 测试全部通过，77 个附魔相关测试全部通过
- 全局 2524 测试通过，10 个 pre-existing 失败，0 新回归

### File List

- `src/src/core/types.ts` — GameState 新增 `devourCounters: Map<string, number>`
- `src/src/core/state.ts` — 初始化 `devourCounters: new Map()`
- `src/src/systems/battle.ts` — 新增 `state.devourCounters.clear()` per-battle 重置
- `src/src/systems/skills.ts` — 新增 `getIconCount()`, `checkDevourAccumulation()`, `executeDevour()` 函数；`getEnchantmentMultiplier()` 添加 devour 分支；6 个触发函数插入吞噬累积调用
- `src/src/systems/shop.ts` — 键盘渲染添加 devourIcons 前缀显示
- `src/src/style.css` — 新增 `.devour-icons` 样式
- `src/tests/unit/systems/enchantment-effects.test.ts` — 新增 11 个吞噬附魔测试
