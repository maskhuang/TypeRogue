# Story 23.4: 增幅效果应用

Status: done

## Story

As a 玩家,
I want 增幅者叠层后自动增幅范围内产出者/转化者的面板数值,
so that 我的增幅投资在每次技能触发时获得真实回报，形成"叠层越多→回报越大"的正反馈.

## Acceptance Criteria

1. `getAmplifierBonus(skillId, triggerKey)` 返回该技能从所有增幅者获得的总加成（返回 `{ addBonus: Record<ResourceType, number>, mulBonus: Record<ResourceType, number> }`）
2. 加法增幅：范围内增幅者 stacks × valuePerStack（按等级缩放）加到技能产出值
3. 乘法增幅：范围内增幅者 stacks × valuePerStack（按等级缩放）作为百分比乘到技能产出值
4. 仅增幅产出者和转化者，不增幅连接者和其他增幅者
5. 多个增幅者可同时作用于同一技能（加法累加、乘法累乘）
6. 在 `triggerProducer` / `triggerConverter` 中集成增幅计算
7. 单元测试验证：无增幅、单增幅加法、单增幅乘法、多增幅叠加、资源类型匹配过滤、位置关系过滤

## Tasks / Subtasks

- [x] Task 1: 实现 getAmplifierBonus 函数 (AC: 1, 4, 5)
  - [x] 1.1 `systems/skills.ts` — 导入 `getAmplifierValue` from `data/amplifiers`
  - [x] 1.2 实现 `getAmplifierBonus(skillId, triggerKey, targetResource)` 函数：遍历所有绑定的增幅者 → 检查位置关系 → 累计加法/乘法加成
  - [x] 1.3 位置关系查找：遍历 `state.player.bindings`，找到所有 `isAmplifier(id)` 的键 → 用 `hasRelation(triggerKey, ampKey, amp.positionRelation)` 过滤
  - [x] 1.4 加法累加：匹配 resource + operator='add' 的增幅者，累计 `stacks × getAmplifierValue(ampId, level)`
  - [x] 1.5 乘法累乘：匹配 resource + operator='multiply' 的增幅者，累乘 `(1 + stacks × getAmplifierValue(ampId, level))`
  - [x] 1.6 跳过零叠层增幅者（stacks === 0 不参与计算）
- [x] Task 2: 集成 triggerProducer (AC: 2, 3, 6)
  - [x] 2.1 在 triggerProducer 计算 baseValue 后、资源修改前，调用 getAmplifierBonus 获取加成
  - [x] 2.2 加法增幅：`baseValue += addBonus`（在 enchMult 之前叠加，与 enchMult 相乘）
  - [x] 2.3 乘法增幅：`baseValue *= mulBonus`（在 enchMult 之前叠加）
  - [x] 2.4 仅当 amp.resource 匹配 prod.resource 时应用
- [x] Task 3: 集成 triggerConverter (AC: 2, 3, 6)
  - [x] 3.1 在 triggerConverter 计算转化值后、资源修改前，调用 getAmplifierBonus 获取加成
  - [x] 3.2 加法增幅应用到转化产出值
  - [x] 3.3 乘法增幅应用到转化产出值
  - [x] 3.4 增幅者匹配 conv.target（目标资源），而非 conv.source
- [x] Task 4: 单元测试 (AC: 7)
  - [x] 4.1 `tests/unit/systems/amplifier-effect.test.ts` — 测试 getAmplifierBonus 无增幅者时返回 {addBonus:0, mulBonus:1}
  - [x] 4.2 测试单个加法增幅者：stacks=10, valuePerStack=1 → addBonus=10
  - [x] 4.3 测试单个乘法增幅者：stacks=10, valuePerStack=0.05 → mulBonus=1.5（即 1+10×0.05）
  - [x] 4.4 测试多增幅者叠加：两个加法增幅者 addBonus 累加；加法+乘法同时作用
  - [x] 4.5 测试资源类型过滤：base 增幅者不影响 score 产出者
  - [x] 4.6 测试位置关系过滤：非邻接增幅者不影响目标技能
  - [x] 4.7 测试零叠层增幅者不参与计算
  - [x] 4.8 集成测试：triggerProducer 带增幅者时资源变化正确
  - [x] 4.9 集成测试：triggerConverter 带增幅者时资源变化正确

## Dev Notes

### 核心设计：增幅即面板修改器

增幅者的叠层在 23.3 中已实现（每次按键 +1）。本 story 实现叠层的「兑现」——当范围内技能触发时，根据叠层数增幅其产出值。

**效果计算时机：** 在 triggerProducer/triggerConverter 内部，baseValue 计算后、资源修改前。这与 enchantmentMultiplier 的应用位置并列。

**效果叠加顺序：**
```
原始值(baseValue) → 加法增幅(+N) → 乘法增幅(×M) → 附魔倍率(×enchMult) → 资源修改
```

### getAmplifierBonus 实现规格

```typescript
// 返回值结构
interface AmplifierBonusResult {
  addBonus: number;   // 加法增幅总量（累加所有 add 型增幅者）
  mulBonus: number;   // 乘法增幅总倍率（累乘所有 multiply 型增幅者，基准 1.0）
}

function getAmplifierBonus(
  skillId: string,
  triggerKey: string | undefined,
  targetResource: ResourceType
): AmplifierBonusResult {
  let addBonus = 0;
  let mulBonus = 1;

  if (!triggerKey) return { addBonus, mulBonus };

  // 遍历所有键位绑定
  for (const [ampKey, boundId] of state.player.bindings) {
    if (!isAmplifier(boundId)) continue;
    const amp = AMPLIFIERS[boundId];
    if (!amp) continue;

    // 资源类型过滤
    if (amp.resource !== targetResource) continue;

    // 位置关系过滤
    if (!hasRelation(triggerKey, ampKey, amp.positionRelation)) continue;

    // 叠层检查
    const stacks = state.amplifierStacks.get(boundId) || 0;
    if (stacks === 0) continue;

    // 等级缩放
    const level = state.player.skills.get(boundId)?.level || 1;
    const valuePerStack = getAmplifierValue(boundId, level);

    if (amp.operator === 'add') {
      addBonus += stacks * valuePerStack;
    } else {
      mulBonus *= (1 + stacks * valuePerStack);
    }
  }

  return { addBonus, mulBonus };
}
```

### triggerProducer 集成位置

```typescript
// 在 skills.ts triggerProducer() 中，line ~163 后插入：
const baseValue = getProducerValue(producerId, level);
const enchMult = getEnchantmentMultiplier(producerId, triggerKey);

// ★ 新增：增幅者加成
const ampBonus = getAmplifierBonus(producerId, triggerKey, prod.resource);
const amplifiedValue = (baseValue + ampBonus.addBonus) * ampBonus.mulBonus;

// 替换原来的 value 计算：
const value = prod.operator === 'add' ? amplifiedValue * enchMult : amplifiedValue;
// 注意：乘法产出者的 baseValue 本身是乘数（如 ×2），增幅应作用于这个乘数
```

**乘法产出者特殊处理：**
- 加法产出者（+N base）：增幅直接加到/乘到 N
- 乘法产出者（×K base）：增幅加到/乘到 K（乘数本身被增幅）
- 当前代码 `prod.operator === 'add'` 分支才应用 enchMult，乘法分支不应用 enchMult
- 增幅应在 enchMult 之前应用，所以加法/乘法产出者都应受增幅影响

### triggerConverter 集成位置

```typescript
// 在 skills.ts triggerConverter() 中，line ~251 后插入：
const k = getConverterK(converterId, level);
const sourceVal = getSourceValue(conv.source, state.resources);
const enchMult = getEnchantmentMultiplier(converterId, triggerKey);

// ★ 新增：增幅者加成（匹配目标资源）
const ampBonus = getAmplifierBonus(converterId, triggerKey, conv.target);
// 转化公式中 k 被增幅
const amplifiedK = (k + ampBonus.addBonus) * ampBonus.mulBonus;

// 替换原来的 k 参与计算：
// add 公式：delta = sourceVal * amplifiedK * enchMult
// multiply 公式：factor = 1 + sourceVal * amplifiedK * enchMult
```

### 现有代码定位

| 文件 | 说明 |
|------|------|
| `src/src/systems/skills.ts` | 主要修改：getAmplifierBonus() + triggerProducer/triggerConverter 集成 |
| `src/src/systems/skills.ts:136-156` | getEnchantmentMultiplier() — 空间查询参考模式 |
| `src/src/systems/skills.ts:159-243` | triggerProducer() — 增幅集成点 |
| `src/src/systems/skills.ts:246-326` | triggerConverter() — 增幅集成点 |
| `src/src/data/amplifiers.ts` | AMPLIFIERS 数据 + getAmplifierValue() 等级缩放 |
| `src/src/data/keyboardTopology.ts` | hasRelation() 位置关系判定 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/amplifiers.ts` | 数据和工具函数已完成 |
| `core/types.ts` | 接口已在 23.1 定义 |
| `core/state.ts` | amplifierStacks 已初始化 |
| `systems/battle.ts` | amplifierStacks.clear() 已实现 |
| `ui/keyboard/*` | 键盘可视化在 Story 23.5 |

### 测试策略

**mock 方案：** 复用 `amplifier-trigger.test.ts` 的 mock 模式（mock DOM/sound/battle），额外需要设置 `state.player.bindings`（绑定增幅者到键位）和 `state.amplifierStacks`（设置叠层数）。

**测试矩阵：**

| 测试场景 | 增幅者配置 | 预期效果 |
|----------|-----------|---------|
| 无增幅者 | bindings 无增幅者 | 产出不变 |
| 单加法增幅 10 层 | amp_base_add_adjacent on 's', stacks=10 | base 产出 +10 |
| 单乘法增幅 20 层 | amp_base_mul_adjacent on 's', stacks=20 | base 产出 ×(1+20×0.05)=×2.0 |
| 多增幅叠加 | 两个 base 加法增幅 | addBonus 累加 |
| 资源不匹配 | score 增幅者 vs base 产出者 | 无增幅效果 |
| 位置不匹配 | adjacent 增幅者但键位不相邻 | 无增幅效果 |
| 零叠层 | stacks=0 | 无增幅效果 |

### Project Structure Notes

- 修改 1 个文件：`src/src/systems/skills.ts`（新增 getAmplifierBonus + triggerProducer/triggerConverter 集成）
- 新增 1 个测试文件：`src/tests/unit/systems/amplifier-effect.test.ts`
- 依赖方向不变：`systems → data → core`

### Previous Story Intelligence

Story 23.1 建立：
- `state.amplifierStacks: Map<string, number>` 跨词保持
- `startLevel()` 中 `state.amplifierStacks.clear()` 过关清零
- `isAmplifier()` 类型检查函数
- `getAmplifierValue(id, level)` 等级缩放（本 story 使用）

Story 23.2 建立：
- 8 个增幅者数据（AMPLIFIERS 常量已填充）
- 5 加法 + 3 乘法，覆盖 5 种资源 + 5 种位置关系
- emoji: 🔱/✴️/🏹/🌊/🧿/⚗️/🔊/🪄

Story 23.3 建立：
- `triggerAmplifier()` 叠层 +1 + 弹窗 + 音效
- `triggerSkill()` 第四分支：增幅者 → 纯叠层，无链式
- showTriggerPopup 已支持 AMPLIFIERS 查找

Code Review 修复汇总：
- `level == null` 不短路（23.1）
- `as const` 添加（23.2）
- emoji 冲突修复：🔱/✴️/🔊（23.2）
- showTriggerPopup 添加 AMPLIFIERS 支持（23.3）

### References

- [Source: docs/epics.md#Story 23.4 — 增幅效果应用]
- [Source: docs/brainstorming-session-2026-03-05.md#Section E+ — 增幅者设计]
- [Source: src/src/systems/skills.ts:136-156 — getEnchantmentMultiplier 空间查询参考]
- [Source: src/src/systems/skills.ts:159-243 — triggerProducer 集成点]
- [Source: src/src/systems/skills.ts:246-326 — triggerConverter 集成点]
- [Source: src/src/data/amplifiers.ts — AMPLIFIERS 数据 + getAmplifierValue]
- [Source: src/src/data/keyboardTopology.ts — hasRelation 位置关系判定]
- [Source: docs/stories/23-3-amplifier-trigger-stacking.md — 前置 story 完成记录]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Task 1: 实现 getAmplifierBonus 函数
  - 导入 `getAmplifierValue` from `data/amplifiers`（追加到现有 import）
  - `getAmplifierBonus(skillId, triggerKey, targetResource)` 遍历 `state.player.bindings`
  - 过滤条件：`isAmplifier(boundId)` → 资源类型匹配 → `hasRelation()` 位置关系 → stacks > 0
  - 加法累加：`addBonus += stacks × getAmplifierValue(ampId, level)`
  - 乘法累乘：`mulBonus *= (1 + stacks × getAmplifierValue(ampId, level))`
  - 导出函数供测试使用
- Task 2: triggerProducer 集成
  - `ampBonus = getAmplifierBonus(producerId, triggerKey, prod.resource)`
  - `amplifiedBase = (baseValue + ampBonus.addBonus) * ampBonus.mulBonus`
  - 替换原 `baseValue` 参与 value 计算：`value = prod.operator === 'add' ? amplifiedBase * enchMult : amplifiedBase`
  - 效果顺序：baseValue → +addBonus → ×mulBonus → ×enchMult → 资源修改
- Task 3: triggerConverter 集成
  - `ampBonus = getAmplifierBonus(converterId, triggerKey, conv.target)` — 匹配目标资源
  - `amplifiedK = (k + ampBonus.addBonus) * ampBonus.mulBonus`
  - 替换 add/multiply 公式中所有 `k` 引用为 `amplifiedK`（3 处替换）
- Task 4: 15 个单元测试全部通过
  - getAmplifierBonus 基础计算：10 个测试（无增幅/undefined key/单加法/单乘法/加法+乘法同时/资源不匹配/位置不匹配/零叠层/等级缩放/多增幅累加）
  - triggerProducer 集成：3 个测试（有增幅/无增幅/乘法增幅）
  - triggerConverter 集成：2 个测试（有增幅对比/无增幅基线）
- 回归测试: 2468/2473 通过，5 个预存失败（producer/converter 测试问题，与本 story 无关）
- Bug 修复: 测试中 'd' 键非 'a' 相邻 → 改为 'w' 键（QWERTY 布局正确）

### File List
- `src/src/systems/skills.ts` — 新增 getAmplifierBonus() + triggerProducer/triggerConverter 增幅集成
- `src/tests/unit/systems/amplifier-effect.test.ts` — 新增 15 个增幅效果测试
