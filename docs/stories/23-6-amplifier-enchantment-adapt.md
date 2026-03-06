# Story 23.6: 增幅者附魔适配

Status: done

## Story

As a 玩家,
I want 增幅者达到 Lv3 时能选择附魔，并且各类附魔对增幅者产生有意义的效果,
so that 我能通过附魔进一步强化增幅者构筑，获得更深层的策略选择空间.

## Acceptance Criteria

1. 增幅者达到 Lv3 时，触发附魔选择（复用现有 `checkAutoEnchantment` 流程）
2. 空间·增幅（amplify）附魔作用于增幅者：范围内有绑定技能越多，增幅者每层效果越强
3. 空间·排斥（repulsion）附魔作用于增幅者：范围内空位越多，增幅者每层效果越强
4. 空间·溅射（splash）附魔作用于增幅者：按下增幅者键时，减效触发范围内产出者/转化者
5. 空间·共鸣（resonance）附魔作用于增幅者：范围内技能触发时，自动叠层（无需按键）
6. 变性（transmutation）附魔作用于增幅者：额外增幅产出变性资源类型的技能（双资源增幅）
7. 独立（independent）附魔作用于增幅者：修饰叠层增量（pioneer/finale/decay/thirst）
8. 附魔效果测试覆盖各类型

## Tasks / Subtasks

- [x] Task 1: 附魔门控开放 (AC: 1)
  - [x] 1.1 `shop.ts` — `checkAutoEnchantment()` 条件新增 `|| isAmplifier(skillId)`
  - [x] 1.2 `shop.ts` — `checkPendingEnchantments()` 条件新增 `|| isAmplifier(skillId)`
  - [x] 1.3 验证增幅者 Lv3 时弹出附魔选择 modal，且 modal 标题正确显示增幅者名称

- [x] Task 2: amplify/repulsion 附魔 — 增幅效果倍率 (AC: 2, 3)
  - [x] 2.1 `skills.ts` — `triggerAmplifier()` 中调用 `getEnchantmentMultiplier(ampId, triggerKey)` 获取附魔倍率
  - [x] 2.2 将倍率应用于叠层值：`effectiveStackGain = Math.ceil(1 * enchMult)`，即 amplify/repulsion 使每次按键叠加更多层
  - [x] 2.3 更新弹窗和浮字反馈显示附魔加成效果

- [x] Task 3: splash 附魔 — 增幅者按键触发范围技能 (AC: 4)
  - [x] 3.1 `skills.ts` — `triggerAmplifier()` 末尾添加 `applySplashEnchantment(ampId, triggerKey)` 调用
  - [x] 3.2 验证溅射仅触发范围内产出者/转化者（跳过连接者和其他增幅者）
  - [x] 3.3 验证 `_splashActive` 防递归标志正常工作

- [x] Task 4: resonance 附魔 — 自动叠层 (AC: 5)
  - [x] 4.1 `skills.ts` — `checkResonanceTriggers()` 中增加增幅者处理分支：`if (isAmplifier(sid))` → 调用 `triggerAmplifierResonance(sid, enchKey)` 自动叠层
  - [x] 4.2 新增 `triggerAmplifierResonance(ampId, key)` 函数：叠层 +1（应用 resonance reduction），无音效/弹窗，仅更新 stacks + eventBus
  - [x] 4.3 验证共鸣自动叠层与手动按键叠层正确累积

- [x] Task 5: transmutation 附魔 — 双资源增幅 (AC: 6)
  - [x] 5.1 `skills.ts` — `getAmplifierBonus()` 中扩展资源匹配：除了 `amp.resource === targetResource`，还检查变性附魔的 `extraResource === targetResource`
  - [x] 5.2 变性增幅使用 `ench.effectValue` 作为效率系数：`valuePerStack * effectValue`（如 30% 效率）
  - [x] 5.3 验证变性增幅者同时出现在两种资源的 bonus 计算中

- [x] Task 6: independent 附魔 — 叠层增量修饰 (AC: 7)
  - [x] 6.1 在 Task 2 的 `effectiveStackGain` 计算中，independent 附魔倍率已包含（`getEnchantmentMultiplier` 统一处理）
  - [x] 6.2 验证各 independent 附魔效果：
    - `ench_pioneer`: 本词首次叠层 ×2（`synergy.wordSkillCount === 0` 时）
    - `ench_finale`: 本词最后一个绑定键叠层 ×3
    - `ench_decay`: 首次 ×2.5，后续衰减（×0.7^n）
    - `ench_thirst`: 对应资源越低叠层越多
  - [x] 6.3 `getIndependentMultiplier` 中 `ench_thirst` 需处理增幅者的资源类型（从 AMPLIFIERS[skillId].resource 取）

- [x] Task 7: 单元测试 (AC: 8)
  - [x] 7.1 测试增幅者 Lv3 触发附魔选择
  - [x] 7.2 测试 amplify 附魔增加叠层增量
  - [x] 7.3 测试 repulsion 附魔增加叠层增量
  - [x] 7.4 测试 splash 附魔触发范围内技能
  - [x] 7.5 测试 resonance 附魔自动叠层
  - [x] 7.6 测试 transmutation 附魔额外资源产出
  - [x] 7.7 测试 independent 附魔（pioneer/decay）修饰叠层
  - [x] 7.8 测试无附魔增幅者行为不变（回归）

## Dev Notes

### 核心设计：增幅者附魔语义映射

增幅者与产出者/转化者的根本区别：**增幅者不产出资源，仅叠层**。所有附魔效果需要重新定义在增幅者语境下的含义：

| 附魔类型 | 产出者/转化者效果 | 增幅者效果 |
|----------|-------------------|-----------|
| amplify | 增加产出倍率 | 增加每次按键叠层数 |
| repulsion | 增加产出倍率 | 增加每次按键叠层数 |
| splash | 触发范围内技能（减效） | **相同** — 触发范围内产出者/转化者 |
| resonance | 被范围内技能触发时自身触发 | 被范围内技能触发时**自动叠层** |
| transmutation | 额外产出另一种资源 | **额外增幅** `extraResource` 类型的技能（双资源增幅） |
| independent | 修饰产出倍率 | 修饰叠层增量 |

### 实现方案：enchMult → 叠层增量

**关键决策：** amplify/repulsion/independent 附魔的倍率不修改 `valuePerStack`（那是等级缩放），而是修改**每次按键的叠层增量**。

```typescript
// triggerAmplifier() 改造
export function triggerAmplifier(ampId: string, triggerKey: string): void {
  const amp = AMPLIFIERS[ampId];
  if (!amp) return;

  // 附魔倍率 → 叠层增量
  const enchMult = getEnchantmentMultiplier(ampId, triggerKey);
  const stackGain = Math.max(1, Math.ceil(1 * enchMult));  // 至少+1层

  const current = state.amplifierStacks.get(ampId) || 0;
  const newStacks = current + stackGain;
  state.amplifierStacks.set(ampId, newStacks);

  // ench_decay counter
  advanceDecayCounter(ampId);

  // 统计
  synergy.wordSkillCount++;

  // 反馈弹窗
  const display = getSkillDisplayInfo(ampId, undefined, state.player.enchantedSkills);
  // ... 弹窗逻辑（如果 stackGain > 1，显示 "+N层" 而非 "+1层"）

  // 战后统计
  recordSkillTrigger(ampId, triggerKey, 'base', 0, false);

  playSound('skill');
  showFeedback(`${display.icon} ×${newStacks}${stackGain > 1 ? ` (+${stackGain})` : ''}`, '#a29bfe');
  if (enchMult > 1) {
    const enchId = state.player.enchantedSkills?.get(ampId) || '';
    showFeedback(`${ENCHANTMENTS[enchId]?.icon || ''} ×${enchMult.toFixed(1)}`, '#f9ca24');
  }
  updateHUD();

  // 溅射：触发范围内技能（新增）
  applySplashEnchantment(ampId, triggerKey);

  // 通知键盘可视化
  eventBus.emit('skill:triggered', { key: triggerKey, skillId: ampId, type: 'active', amplifierStacks: newStacks });
}
```

### 共鸣（resonance）特殊处理

共鸣附魔使增幅者在**不需要按键**的情况下自动叠层。当范围内产出者/转化者被触发时，`checkResonanceTriggers()` 需要识别增幅者目标并自动叠层。

```typescript
// checkResonanceTriggers() 扩展
for (const [enchKey, sid] of state.player.bindings) {
  if (enchKey === sourceKey) continue;
  const enchId = state.player.enchantedSkills?.get(sid);
  if (!enchId) continue;
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.spatialType !== 'resonance' || !ench.positionRelation) continue;
  if (!hasRelation(sourceKey, enchKey, ench.positionRelation)) continue;

  if (isProducer(sid)) {
    triggerProducerWithReduction(sid, enchKey, ench.effectValue);
  } else if (isConverter(sid)) {
    triggerConverterWithReduction(sid, enchKey, ench.effectValue);
  } else if (isAmplifier(sid)) {
    // ★ 新增：共鸣自动叠层
    triggerAmplifierResonance(sid, enchKey);
  }
}
```

```typescript
// 新增函数：共鸣触发的增幅者叠层（静默版，无弹窗/音效）
function triggerAmplifierResonance(ampId: string, key: string): void {
  const current = state.amplifierStacks.get(ampId) || 0;
  const newStacks = current + 1;  // 共鸣固定 +1，不受 enchMult 影响
  state.amplifierStacks.set(ampId, newStacks);
  recordSkillTrigger(ampId, key, 'base', 0, false);
  showFeedback(`${AMPLIFIERS[ampId]?.icon || ''} ×${newStacks} (共鸣)`, '#a29bfe');
  eventBus.emit('skill:triggered', { key, skillId: ampId, type: 'active', amplifierStacks: newStacks });
}
```

### 变性（transmutation）特殊处理 — 双资源增幅

变性附魔让增幅者变成**双资源增幅者**。例如：`amp_base_add_adjacent`（增幅 base）+ `ench_trans_score` → 同时增幅 base 和 score 产出技能。

**核心修改点在 `getAmplifierBonus()`：**

```typescript
export function getAmplifierBonus(
  skillId: string,
  triggerKey: string | undefined,
  targetResource: ResourceType,
): { addBonus: number; mulBonus: number } {
  let addBonus = 0;
  let mulBonus = 1;
  if (!triggerKey) return { addBonus, mulBonus };

  for (const [ampKey, boundId] of state.player.bindings) {
    if (!isAmplifier(boundId)) continue;
    const amp = AMPLIFIERS[boundId];
    if (!amp) continue;
    if (!hasRelation(triggerKey, ampKey, amp.positionRelation)) continue;
    const stacks = state.amplifierStacks.get(boundId) || 0;
    if (stacks === 0) continue;
    const level = state.player.skills.get(boundId)?.level || 1;
    const valuePerStack = getAmplifierValue(boundId, level);

    // ★ 资源匹配：主资源 OR 变性附魔的 extraResource
    let efficiency = 0;
    if (amp.resource === targetResource) {
      efficiency = 1;  // 主资源：100% 效率
    } else {
      // 变性附魔：extraResource 匹配时，以 effectValue 为效率系数
      const enchId = state.player.enchantedSkills?.get(boundId);
      if (enchId) {
        const ench = ENCHANTMENTS[enchId];
        if (ench?.category === 'transmutation' && ench.extraResource === targetResource) {
          efficiency = ench.effectValue;  // 如 0.3 = 30% 效率
        }
      }
    }
    if (efficiency === 0) continue;

    if (amp.operator === 'add') {
      addBonus += stacks * valuePerStack * efficiency;
    } else {
      mulBonus *= (1 + stacks * valuePerStack * efficiency);
    }
  }
  return { addBonus, mulBonus };
}
```

**设计要点：**
- 主资源增幅效率 = 100%，变性资源增幅效率 = `ench.effectValue`（如 30%）
- 不需要新函数，只改 `getAmplifierBonus()` 中的资源匹配逻辑
- 对 `triggerAmplifier()` 无影响（变性不改叠层行为，改增幅行为）

### ench_thirst 对增幅者的处理

`getIndependentMultiplier` 中 `ench_thirst` 从 `PRODUCERS[skillId]?.resource` 或 `CONVERTERS[skillId]?.target` 获取资源类型。需要增加增幅者分支：

```typescript
case 'ench_thirst': {
  const prod = PRODUCERS[skillId];
  const conv = CONVERTERS[skillId];
  const amp = AMPLIFIERS[skillId];
  const resType = prod?.resource || conv?.target || amp?.resource;
  if (!resType) return 1;
  // ... 后续 ratio 计算不变
}
```

### 门控修改（最简改动）

```typescript
// checkAutoEnchantment — 扩展条件
function checkAutoEnchantment(skillId: string): void {
  const data = state.player.skills.get(skillId);
  if (!data || data.level < 3) return;
  if (isProducer(skillId) || isConverter(skillId) || isAmplifier(skillId)) {
    if (state.player.enchantedSkills.has(skillId)) return;
    renderEnchantmentModal(skillId);
  }
}

// checkPendingEnchantments — 同样扩展
function checkPendingEnchantments(): void {
  const pending: string[] = [];
  for (const [skillId, data] of state.player.skills) {
    if (data.level >= 3 && (isProducer(skillId) || isConverter(skillId) || isAmplifier(skillId)) && !state.player.enchantedSkills.has(skillId)) {
      pending.push(skillId);
    }
  }
  // ...
}
```

### 不需要修改的部分

- `renderEnchantmentModal()` — 已在 Code Review M2 中补全 `|| AMPLIFIERS[skillId]`
- `applyEnchantment()` — 通用 Map 存储，不区分技能类型
- `drawEnchantmentPair()` — 随机抽取附魔对，不需要类型过滤
- `getAmplifierBonus()` — 计算其他增幅者对技能的加成，与自身附魔无关
- `highlightSkillRange()` — 已在 Code Review H1 中支持增幅者范围预览

### 边界情况与注意事项

1. **enchMult 最低保底 1 层**：`Math.max(1, Math.ceil(enchMult))`，防止 decay 衰减到 0 层
2. **共鸣 + 溅射循环**：共鸣自动叠层不触发溅射（`triggerAmplifierResonance` 是静默版，不调用 `applySplashEnchantment`）
3. **增幅者不参与链式反应**：`triggerSkill()` 中增幅者分支无 `checkResourceTriggers`/`checkResonanceTriggers`，维持不变
4. **变性产出触发连接者**：增幅者变性产出的资源可以触发资源型连接者（AC6 设计意图一致）
5. **advanceDecayCounter 时机**：在计算 enchMult 之后调用（先读倍率，再推进计数器）

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/systems/shop.ts:546-555` | `checkAutoEnchantment()` | 门控条件 — 需加 `isAmplifier` |
| `src/src/systems/shop.ts:558-568` | `checkPendingEnchantments()` | 补偿门控 — 需加 `isAmplifier` |
| `src/src/systems/shop.ts:663` | `renderEnchantmentModal()` | sk 查找 — ✅ 已含 AMPLIFIERS |
| `src/src/systems/skills.ts:688-719` | `triggerAmplifier()` | 核心改造点 — 接入 enchMult + splash + transmutation |
| `src/src/systems/skills.ts:137-157` | `getEnchantmentMultiplier()` | 通用倍率计算 — 无需修改 |
| `src/src/systems/skills.ts:78-124` | `getIndependentMultiplier()` | ench_thirst 需加增幅者资源获取 |
| `src/src/systems/skills.ts:127-134` | `advanceDecayCounter()` | 无需修改，通用 |
| `src/src/systems/skills.ts:516-537` | `checkResonanceTriggers()` | 需加增幅者分支 |
| `src/src/systems/skills.ts:364-386` | `applySplashEnchantment()` | 从 triggerAmplifier 调用即可 |
| `src/src/systems/skills.ts:484-511` | `applyTransmutationEnchantment()` | 增幅者需独立版本（delta=1） |
| `src/src/data/enchantments.ts` | 33 个附魔定义 | 无需修改数据 |

### 测试策略

**测试文件：** `src/tests/unit/systems/amplifier-enchantment.test.ts`

**Mock 方案：** 参照现有 `amplifier-shop.test.ts` 和 `amplifier-effect.test.ts` 模式：
- Mock DOM 和音效
- 使用真实 state/synergy + resetState
- 设置 `state.player.enchantedSkills.set(ampId, enchId)` 模拟附魔状态
- 调用 `triggerAmplifier()` 验证叠层增量
- 调用 `checkResonanceTriggers()` 验证自动叠层

**测试矩阵：**

| 场景 | 配置 | 期望 |
|------|------|------|
| 无附魔 | 增幅者 Lv1 | 叠层 +1，无附魔效果 |
| amplify·adjacent | 2 个相邻技能 | `enchMult = 1 + 2*0.2 = 1.4` → 叠层 +2（ceil(1.4)） |
| repulsion·adjacent | 3 个空位 | `enchMult = 1 + 3*0.25 = 1.75` → 叠层 +2 |
| splash·adjacent | 相邻有产出者 | 产出者被减效触发 |
| resonance·adjacent | 相邻产出者触发 | 增幅者自动叠层 +1 |
| transmutation·score | base 增幅者 + ench_trans_score | 双资源增幅：score bonus = 10×1×0.3=3 |
| pioneer | 本词首次叠层 | 叠层 ×2 → +2 |
| decay | 连续叠层 3 次 | 第1次 ×2.5→+3, 第2次 ×1.75→+2, 第3次 ×1.225→+2 |
| thirst | 低资源时 | 叠层增量提高 |

### Project Structure Notes

- 修改 2 个文件：`systems/skills.ts`（核心）, `systems/shop.ts`（门控）
- 新增 1 个测试文件：`src/tests/unit/systems/amplifier-enchantment.test.ts`
- 依赖方向不变：`systems → data → core`
- 无新增 import（所需函数均已在 skills.ts 内部）

### Previous Story Intelligence

Story 23.5 建立：
- `highlightSkillRange()` 已支持增幅者范围预览（Code Review H1 fix）
- `renderEnchantmentModal()` sk 查找已含 `|| AMPLIFIERS[skillId]`（Code Review M2 fix）
- `triggerAmplifier()` 已包含 eventBus emit + recordSkillTrigger 调用
- 已拥有技能面板 tooltip 包含增幅者 stacks + affectedSkills

Story 23.4 建立：
- `getAmplifierBonus()` 空间查询 + 资源/位置过滤模式
- 效果顺序：baseValue → +addBonus → ×mulBonus → ×enchMult
- `triggerProducer`/`triggerConverter` 已集成增幅计算
- Bug: QWERTY 键位相邻关系需注意（'d' 非 'a' 相邻，'w' 是）

Story 23.3 建立：
- `triggerAmplifier()` 叠层 +1 + 弹窗 + 音效
- `triggerSkill()` 第四分支：增幅者 → 纯叠层，无链式
- 弹窗显示 `${icon} ×${stacks}` 格式

Code Review 经验：
- 所有定义查找需追加 `|| AMPLIFIERS[id]`（多处遗漏是常见问题）
- 测试中 QWERTY 键位相邻关系要用真实布局验证

### 与 Epic 24 的关系

Epic 24（成长附魔与附魔重构）将引入新附魔类型：
- **成长（growth）**：替换现有 amplify 类型，基于触发次数永久增长
- **吞噬（devour）**：消耗相邻技能获得永久加成

Story 23.6 使用**现有 33 个附魔**适配增幅者。Epic 24 的新附魔类型将在各自 story 中处理增幅者兼容性。

### References

- [Source: docs/epics.md#Story 23.6 — 增幅者附魔适配]
- [Source: src/src/systems/skills.ts:688-719 — triggerAmplifier 核心函数]
- [Source: src/src/systems/skills.ts:137-157 — getEnchantmentMultiplier 倍率计算]
- [Source: src/src/systems/skills.ts:516-537 — checkResonanceTriggers 共鸣检查]
- [Source: src/src/systems/skills.ts:364-386 — applySplashEnchantment 溅射执行]
- [Source: src/src/systems/shop.ts:546-568 — checkAutoEnchantment/checkPendingEnchantments 门控]
- [Source: src/src/data/enchantments.ts — 33 个附魔定义数据]
- [Source: docs/stories/23-5-amplifier-shop-ui.md — 前置 story 完成记录]
- [Source: docs/stories/23-4-amplifier-effect-application.md — 增幅效果应用 story]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- splash 测试初版误用 `synergy.skillBaseScore`（溅射减效走 `triggerProducerWithReduction`，直接加到 `state.resources.base`），修正后通过

### Completion Notes List
- Task 1: `checkAutoEnchantment` 和 `checkPendingEnchantments` 各加一个 `|| isAmplifier(skillId)` 条件
- Task 2: `triggerAmplifier()` 改造 — 接入 `getEnchantmentMultiplier()` 获取 enchMult，`stackGain = Math.max(1, Math.ceil(enchMult))`，浮字显示附魔倍率
- Task 3: `triggerAmplifier()` 末尾调用 `applySplashEnchantment(ampId, triggerKey)`，现有溅射逻辑已隐式跳过增幅者
- Task 4: `checkResonanceTriggers()` 增加 `isAmplifier(sid)` 分支 → `triggerAmplifierResonance()`，静默叠层 +1（无音效/弹窗）
- Task 5: `getAmplifierBonus()` 资源匹配扩展 — 主资源 100% 效率，变性 extraResource 以 `ench.effectValue` 为效率系数
- Task 6: `getIndependentMultiplier` ench_thirst 增加 `AMPLIFIERS[skillId]?.resource` 分支
- Task 7: 16 个测试全部通过，覆盖所有附魔类型 + 回归测试

### File List
- `src/src/systems/skills.ts` (modified) — triggerAmplifier 附魔集成 + triggerAmplifierResonance 新函数 + getAmplifierBonus 双资源 + ench_thirst 增幅者支持
- `src/src/systems/shop.ts` (modified) — checkAutoEnchantment + checkPendingEnchantments 门控开放
- `src/tests/unit/systems/amplifier-enchantment.test.ts` (new) — 16 个测试覆盖全部 6 类附魔效果

### Change Log
- 2026-03-06: Story 23.6 实现 — 增幅者附魔适配（6 类附魔语义映射 + 16 个测试）
- 2026-03-06: Code Review — 修复 4M+3L 共 7 个问题（splash 显式跳过增幅者 + finale 测试 + repulsion 精确断言 + Dev Notes 修正 + updateHUD 一致性）
