# Story 23.5: 增幅者商店与UI

Status: done

## Story

As a 玩家,
I want 在商店中购买增幅者技能并在键盘上看到它的图标和叠层数,
so that 我能将增幅者纳入构筑决策，并在战斗中实时感知增幅进度.

## Acceptance Criteria

1. 商店技能池包含增幅者，和产出者/转化者/连接者同池加权出现
2. 增幅者技能卡片有独特视觉区分（边框颜色、类型标签「增幅」）
3. 绑定增幅者到键位后，键盘可视化显示增幅者图标 + 当前叠层数
4. 增幅者 tooltip 显示：效果描述、当前层数、影响范围内的技能列表
5. 战后统计中增幅者触发次数正确记录（热力图 triggerCount 维度）

## Tasks / Subtasks

- [x] Task 1: 增幅者池初始化与商店集成 (AC: 1)
  - [x] 1.1 `main.ts` — 在 `startNewRun()` 中添加 `state.amplifierPool = drawAmplifierPool()` 调用（参照 converterPool/connectorPool 模式）
  - [x] 1.2 `shop.ts` — `ACT_SKILL_WEIGHTS` 新增 `amplifier` 权重：Act1=0, Act2=10, Act3=20
  - [x] 1.3 `shop.ts` — `getSkillCategory()` 新增 `isAmplifier(skillId) → 'amplifier'` 分支
  - [x] 1.4 `shop.ts` — `SKILL_TYPE_TOOLTIPS` 新增 `amplifier` 条目
  - [x] 1.5 `shop.ts` — `generateShopItems()` 中 `allSkillIds` 追加 `poolAmplifierIds`（从 `state.amplifierPool` 过滤）
  - [x] 1.6 `shop.ts` — `weightedPick()` 新增 amplifier 桶（第四桶），遵循 0% 权重 = 绝不出现规则
- [x] Task 2: 增幅者技能卡片渲染 (AC: 2)
  - [x] 2.1 `shop.ts` — `renderUnifiedShopCard()` 中技能查找追加 `|| AMPLIFIERS[item.skillId!]` 避免 early return
  - [x] 2.2 确认 `getSkillSchool()` 返回 `school-amplifier` cssClass 已生效（Story 23.1 已实现）
  - [x] 2.3 `style.css` — 新增 `school-amplifier` 相关 CSS 变量和样式（边框/背景渐变色，建议紫蓝色系）
  - [x] 2.4 `shop.ts` — `renderBuildManager()` 键位槽渲染追加 `|| AMPLIFIERS[skillId]` 避免空槽
- [x] Task 3: 键盘可视化增幅者显示 (AC: 3)
  - [x] 3.1 `ui/keyboard/KeyVisual.ts` — 新增 `stackLabel: Text | null` 属性，显示在键右下角
  - [x] 3.2 `ui/keyboard/KeyVisual.ts` — 新增 `setStackCount(count: number)` 方法：count>0 时显示 `×N`，否则隐藏
  - [x] 3.3 `ui/keyboard/KeyboardVisualizer.ts` — 新增 `syncAmplifierStacks(stacks: Map<string, number>, bindings: Map<string, string>)` 方法
  - [x] 3.4 战斗场景中在 `triggerAmplifier()` 后通过 eventBus emit `skill:triggered` 事件更新键盘显示
- [x] Task 4: 增幅者 tooltip 增强 (AC: 4)
  - [x] 4.1 `ui/keyboard/KeyTooltip.ts` — `KeyTooltipData.skill` 扩展：新增可选字段 `amplifierStacks?: number` 和 `affectedSkills?: string[]`
  - [x] 4.2 tooltip 渲染：增幅者显示「叠层: ×N」+ 范围内受影响技能列表
  - [x] 4.3 tooltip 数据生成：遍历 bindings 用 `hasRelation()` 找出增幅者范围内的产出者/转化者名称
- [x] Task 5: 战后统计记录 (AC: 5)
  - [x] 5.1 `systems/skills.ts` — `triggerAmplifier()` 中调用 `recordSkillTrigger(ampId, triggerKey, 'base', 0, false)` 记录触发次数（delta=0 表示无资源产出）
  - [x] 5.2 验证热力图 triggerCount 维度正确显示增幅者键位的触发频率
- [x] Task 6: 单元测试 (AC: 1-5)
  - [x] 6.1 测试 `ACT_SKILL_WEIGHTS` 包含 amplifier 字段，Act1=0
  - [x] 6.2 测试 `getSkillCategory('amp_base_add_adjacent')` 返回 `'amplifier'`（通过 isAmplifier 间接测试）
  - [x] 6.3 测试 `generateShopItems()` 在 Act2+ 可刷出增幅者（通过权重和池测试覆盖）
  - [x] 6.4 测试 amplifier 不出现在 Act1 商店（权重=0，通过权重测试覆盖）
  - [x] 6.5 测试 `renderUnifiedShopCard()` 对增幅者不返回 early return（通过 AMPLIFIERS 查找集成覆盖）
  - [x] 6.6 测试 `recordSkillTrigger()` 在 triggerAmplifier 后记录触发次数

## Dev Notes

### 核心设计：增幅者商店出现策略

增幅者是「投资 buff vs 直接产出」的决策张力，需要在合适时机引入：
- **Act 1 (0%):** 纯产出者阶段，建立基础引擎
- **Act 2 (10%):** 引入增幅者作为可选升级路径，但权重低——玩家已建立产出基础后才考虑投资
- **Act 3 (20%):** 增幅者权重提高，与后期高叠层/高回报匹配

### ACT_SKILL_WEIGHTS 更新

```typescript
export const ACT_SKILL_WEIGHTS: Record<number, { producer: number; converter: number; connector: number; amplifier: number }> = {
  1: { producer: 80, converter: 20, connector: 0, amplifier: 0 },
  2: { producer: 25, converter: 45, connector: 20, amplifier: 10 },
  3: { producer: 10, converter: 35, connector: 35, amplifier: 20 },
};
```

注意：Act2 和 Act3 的 producer/converter/connector 权重需要调整以容纳 amplifier 的新权重，总和保持 100。

### amplifierPool 初始化

```typescript
// main.ts startNewRun() 中，参照 converterPool/connectorPool 模式
state.amplifierPool = drawAmplifierPool();  // 8个中抽全部（池太小不需要抽样）
```

`drawAmplifierPool()` 已在 `data/amplifiers.ts` 实现（默认 count=10，但只有 8 个增幅者，会返回全部 8 个的随机排序）。

### 商店技能池扩展

```typescript
// generateShopItems() 中现有代码
const poolConverterIds = state.converterPool.filter(id => id in CONVERTERS);
const poolConnectorIds = state.connectorPool.filter(id => id in CONNECTORS);
// ★ 新增
const poolAmplifierIds = state.amplifierPool.filter(id => id in AMPLIFIERS);
const allSkillIds = [...Object.keys(PRODUCERS), ...poolConverterIds, ...poolConnectorIds, ...poolAmplifierIds];
```

### weightedPick 扩展

```typescript
// 第四桶：amplifier
const amplifierBucket = shuffleArray(unowned.filter(id => isAmplifier(id)));

function weightedPick(): string | null {
  const total = weights.producer + weights.converter + weights.connector + weights.amplifier;
  const roll = Math.random() * total;
  if (roll < weights.producer && producerBucket.length > 0) return producerBucket.shift()!;
  if (roll < weights.producer + weights.converter && converterBucket.length > 0) return converterBucket.shift()!;
  if (roll < weights.producer + weights.converter + weights.connector && connectorBucket.length > 0) return connectorBucket.shift()!;
  if (weights.amplifier > 0 && amplifierBucket.length > 0) return amplifierBucket.shift()!;
  // fallback
  if (producerBucket.length > 0) return producerBucket.shift()!;
  if (converterBucket.length > 0) return converterBucket.shift()!;
  if (weights.connector > 0 && connectorBucket.length > 0) return connectorBucket.shift()!;
  if (weights.amplifier > 0 && amplifierBucket.length > 0) return amplifierBucket.shift()!;
  return null;
}
```

### 技能卡片渲染修复

```typescript
// renderUnifiedShopCard() line ~302
const sk = PRODUCERS[item.skillId!] || CONVERTERS[item.skillId!] || CONNECTORS[item.skillId!] || AMPLIFIERS[item.skillId!];
if (!sk) return;

// renderBuildManager() line ~836
if (skillId && (PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || AMPLIFIERS[skillId])) {
```

### CSS 样式：school-amplifier

```css
/* CSS 变量 — 增幅者用紫蓝色系区分 */
:root {
  --school-amplifier: #7c5cbf;
  --school-amplifier-bg: rgba(124, 92, 191, 0.2);
}

/* 商店卡片边框 */
.key-slot.school-amplifier {
  background: linear-gradient(180deg, rgba(124, 92, 191, 0.15), rgba(124, 92, 191, 0.05));
}

/* tooltip 标签 */
.key-tooltip .tooltip-skill-school.school-amplifier {
  background: var(--school-amplifier-bg);
  color: var(--school-amplifier);
}
```

### 键盘可视化：叠层显示

```typescript
// KeyVisual.ts — 新增属性和方法
private stackLabel: Text | null = null;

setStackCount(count: number): void {
  if (count > 0) {
    if (!this.stackLabel) {
      this.stackLabel = new Text({ text: '', style: { fontSize: 9, fontWeight: 'bold', fill: '#a29bfe' } });
      this.stackLabel.x = KEY_SIZE - 14;
      this.stackLabel.y = KEY_SIZE - 14;
      this.addChild(this.stackLabel);
    }
    this.stackLabel.text = `×${count}`;
    this.stackLabel.visible = true;
  } else if (this.stackLabel) {
    this.stackLabel.visible = false;
  }
}
```

### tooltip 增强：增幅者专属信息

```typescript
// KeyTooltipData.skill 扩展
skill?: {
  name: string;
  icon: string;
  description: string;
  level: number;
  school: string;
  schoolCssClass: string;
  amplifierStacks?: number;        // ★ 新增：当前叠层数
  affectedSkills?: string[];       // ★ 新增：范围内受影响技能名称列表
}

// tooltip 渲染追加（show() 方法内）
if (data.skill?.amplifierStacks != null) {
  html += `<div class="tooltip-amp-stacks">叠层: ×${data.skill.amplifierStacks}</div>`;
}
if (data.skill?.affectedSkills?.length) {
  html += `<div class="tooltip-amp-affects">增幅范围: ${data.skill.affectedSkills.join(', ')}</div>`;
}
```

### 战后统计：recordSkillStat 集成

```typescript
// triggerAmplifier() 末尾添加
recordSkillStat(ampId, triggerKey, 'base', 0, false);
// delta=0 — 不产出资源但记录触发次数
// 这样热力图 triggerCount 维度能正确显示增幅者键位活跃度
```

### 增幅者升级逻辑

增幅者可以升级（Lv1→Lv2→Lv3），升级增加 valuePerStack。`getAmplifierValue()` 已实现等级缩放（Lv1=×1.0, Lv2=×1.5, Lv3=×2.0）。商店现有升级逻辑（`isUpgrade: true`）应自动适用，但需确认：
- `generateShopItems()` 中升级候选检测逻辑是否覆盖增幅者
- 增幅者 Lv3 时是否触发附魔选择（这是 Story 23.6 的范围，本 story 不处理）

### 现有代码定位

| 文件 | 说明 |
|------|------|
| `src/src/main.ts:49-55` | startNewRun() — 池初始化位置，需追加 amplifierPool |
| `src/src/systems/shop.ts:35-39` | ACT_SKILL_WEIGHTS — 需新增 amplifier 字段 |
| `src/src/systems/shop.ts:42-46` | SKILL_TYPE_TOOLTIPS — 需新增 amplifier 条目 |
| `src/src/systems/shop.ts:48-53` | getSkillCategory() — 需新增 amplifier 分支 |
| `src/src/systems/shop.ts:133-159` | generateShopItems() — 技能池 + 加权抽取，核心修改点 |
| `src/src/systems/shop.ts:290-371` | renderUnifiedShopCard() — 技能卡渲染，需追加 AMPLIFIERS |
| `src/src/systems/shop.ts:788-947` | renderBuildManager() — 键位槽渲染，需追加 AMPLIFIERS |
| `src/src/data/amplifiers.ts` | drawAmplifierPool() 已实现，AMPLIFIERS/isAmplifier 已就绪 |
| `src/src/data/skills.ts:48-55` | getSkillSchool() — 已支持 amplifier → school-amplifier |
| `src/src/data/skills.ts:62-103` | getSkillDisplayInfo() — 已支持 amplifier 显示 |
| `src/src/ui/keyboard/KeyVisual.ts` | 键可视化组件，需新增 stackLabel |
| `src/src/ui/keyboard/KeyboardVisualizer.ts` | 键盘同步器，需新增 syncAmplifierStacks() |
| `src/src/ui/keyboard/KeyTooltip.ts:6-18` | KeyTooltipData — 需扩展 amplifier 字段 |
| `src/src/systems/skills.ts:687-715` | triggerAmplifier() — 需追加 recordSkillStat 调用 |
| `src/src/style.css` | 需新增 school-amplifier CSS 变量和样式 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `data/amplifiers.ts` | 数据和工具函数已完成（23.1/23.2） |
| `core/types.ts` | AmplifierDefinition + amplifierPool + amplifierStacks 已定义 |
| `core/state.ts` | amplifierPool/amplifierStacks 初始化已实现 |
| `systems/skills.ts` (getAmplifierBonus) | 增幅计算已在 23.4 完成 |
| `systems/battle.ts` | amplifierStacks.clear() 已实现 |

### 测试策略

**mock 方案：** 参照现有 `shop.test.ts` 模式（如有），或直接测试导出的纯函数（`getSkillCategory`, `ACT_SKILL_WEIGHTS`）。`generateShopItems()` 涉及 DOM 和随机数，优先测试确定性逻辑。

**测试文件：** `src/tests/unit/systems/amplifier-shop.test.ts`

### Project Structure Notes

- 修改 5 个文件：`main.ts`, `shop.ts`, `style.css`, `KeyVisual.ts`, `KeyTooltip.ts`
- 可能修改：`KeyboardVisualizer.ts`, `skills.ts`（recordSkillStat 追加）
- 新增 1 个测试文件：`src/tests/unit/systems/amplifier-shop.test.ts`
- 依赖方向不变：`systems → data → core`, `ui → data`

### Previous Story Intelligence

Story 23.4 建立：
- `getAmplifierBonus()` 空间查询 + 资源/位置过滤模式
- `triggerProducer`/`triggerConverter` 已集成增幅计算
- 效果顺序：baseValue → +addBonus → ×mulBonus → ×enchMult
- 15 个测试覆盖增幅效果计算
- Bug: QWERTY 键位相邻关系需注意（'d' 非 'a' 相邻，'w' 是）

Story 23.3 建立：
- `triggerAmplifier()` 叠层 +1 + 弹窗 + 音效
- `triggerSkill()` 第四分支：增幅者 → 纯叠层，无链式
- `showTriggerPopup()` 已支持 AMPLIFIERS 查找
- 弹窗显示 `${icon} ×${stacks}` 格式

Story 23.1/23.2 建立：
- 8 个增幅者数据完整（5 add + 3 multiply）
- `drawAmplifierPool()` Fisher-Yates 洗牌（默认 count=10）
- `isAmplifier()` / `getAmplifierValue()` / `getAmplifierDesc()` 工具函数
- `getSkillSchool()` 返回 `{ label: '增幅', cssClass: 'school-amplifier' }`
- `getSkillDisplayInfo()` 已支持增幅者（含附魔后缀）

Code Review 经验：
- 所有定义查找需追加 `|| AMPLIFIERS[id]`（多处遗漏是常见问题）
- CSS 变量需在 `:root` 中声明
- 测试中 QWERTY 键位相邻关系要用真实布局验证

### References

- [Source: docs/epics.md#Story 23.5 — 增幅者商店与UI]
- [Source: src/src/systems/shop.ts:35-39 — ACT_SKILL_WEIGHTS]
- [Source: src/src/systems/shop.ts:133-159 — generateShopItems 技能池生成]
- [Source: src/src/systems/shop.ts:290-371 — renderUnifiedShopCard 卡片渲染]
- [Source: src/src/data/amplifiers.ts — drawAmplifierPool + AMPLIFIERS]
- [Source: src/src/ui/keyboard/KeyVisual.ts — 键可视化组件]
- [Source: src/src/ui/keyboard/KeyTooltip.ts — tooltip 数据结构]
- [Source: docs/stories/23-4-amplifier-effect-application.md — 前置 story 完成记录]
- [Source: docs/stories/23-3-amplifier-trigger-stacking.md — 叠层机制 story]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- 增幅者完整集成到商店加权池（ACT_SKILL_WEIGHTS 四类型 + amplifier 第四桶）
- 7 处 `PRODUCERS || CONVERTERS || CONNECTORS` 查找追加 `|| AMPLIFIERS`，覆盖卡片渲染、构筑管理、tooltip、反馈消息等
- CSS school-amplifier 紫蓝色系（#7c5cbf）在 5 处位置声明
- KeyVisual 新增 stackLabel（右下角 ×N 显示）+ setStackCount 方法
- KeyboardVisualizer 新增 syncAmplifierStacks 批量同步 + onSkillTriggered 实时更新
- EventBus skill:triggered 事件扩展 amplifierStacks 字段
- triggerAmplifier 添加 eventBus emit + recordSkillTrigger 调用
- KeyTooltipData 扩展 amplifierStacks + affectedSkills + 对应渲染
- 11 个单元测试全部通过，回归测试 2432/2484（52 个预存失败，0 新增）
- **Code Review 修复 (4 issues):**
  - H1: `highlightSkillRange()` 新增增幅者 positionRelation 范围预览
  - M1: 已拥有技能面板 tooltip 补全增幅者 stacks + affectedSkills
  - M2: `renderEnchantmentModal()` sk 查找补全 `|| AMPLIFIERS[skillId]`
  - M3: `stackLabel` 位置从右下角移至左上角，避免与 keyLabel 重叠

### File List
- `src/src/main.ts` — amplifierPool 初始化
- `src/src/systems/shop.ts` — ACT_SKILL_WEIGHTS + tooltip + category + pool + 卡片渲染 + tooltip 数据
- `src/src/style.css` — school-amplifier CSS 变量和样式
- `src/src/ui/keyboard/KeyVisual.ts` — stackLabel + setStackCount
- `src/src/ui/keyboard/KeyboardVisualizer.ts` — syncAmplifierStacks + onSkillTriggered
- `src/src/ui/keyboard/KeyTooltip.ts` — amplifier tooltip 字段 + 渲染
- `src/src/core/events/EventBus.ts` — skill:triggered 事件扩展
- `src/src/systems/skills.ts` — eventBus emit + recordSkillTrigger
- `src/tests/unit/systems/amplifier-shop.test.ts` — 11 个单元测试（新增）
