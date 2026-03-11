# Story 34.6: UI 更新 — 附魔与新机制展示

Status: done

## Story

As a 玩家,
I want 商店键盘格中能看到技能的机制类型和乘算化标识，战斗中触发弹窗能看到实时机制状态,
so that 构建 Build 时能识别不同机制，战斗中能掌握蓄力/衰减/脉冲/暴击的实时状态.

## Acceptance Criteria

1. **AC1 — 商店 bound-grid 乘算化边框:** 商店键盘格中，被 `ench_multiply` 附魔的 key-slot 显示金色边框（#ffe66d），区分加算/乘算技能
2. **AC2 — 商店技能卡片机制标签:** 商店技能卡片（`.reward-card`）中，非 standard 产出者显示机制类型 badge（如 "🔌蓄力"）
3. **AC3 — 商店 tooltip 机制信息:** 商店键盘格的 hover tooltip（`KeyTooltip`）显示机制类型描述
4. **AC4 — 战斗触发弹窗机制状态:** 战斗中 `showTriggerPopup()` 增强 — 蓄力显示蓄力%、衰减显示当前倍率、脉冲显示 N/interval、虚无显示空位数
5. **AC5 — 暴击触发特殊反馈:** 暴击命中时触发弹窗有放大/金色闪光效果 + "CRIT!" 文字
6. **AC6 — 商店 bound-grid 机制图标:** 商店键盘格的 key-slot 上，非 standard 产出者显示小机制图标角标
7. **AC7 — 商店虚无范围高亮:** 商店键盘格中 hover 虚无产出者 key-slot 时，高亮其 PositionRelation 范围内的空位键（辅助 Build 规划）

## Tasks / Subtasks

- [x] **Task 1: 商店 bound-grid 乘算化边框** (AC: 1)
  - [x] 1.1 在 `shop.ts` 的 `renderBuildManager()` 中，渲染 key-slot 时检测 `state.player.enchantedSkills.get(skillId) === 'ench_multiply'`
  - [x] 1.2 有 ench_multiply 时为 key-slot 添加 CSS 类 `.multiply-enchanted`（金色边框 #ffe66d, 2px solid）
  - [x] 1.3 在 `style.css` 中新增 `.key-slot.multiply-enchanted` 样式（金色边框 + 可选 box-shadow 发光）

- [x] **Task 2: 商店技能卡片机制 Badge** (AC: 2)
  - [x] 2.1 在 `shop.ts` 的 `renderUnifiedShopCard()` 中，产出者技能卡片增加机制类型 badge（位于 school badge 旁）
  - [x] 2.2 badge 内容 = MECHANIC_ICONS[mechanic] + MECHANIC_LABELS[mechanic]（如 "🔌蓄力"），standard 不显示
  - [x] 2.3 在 `style.css` 新增 `.mechanic-badge` 及 `.mechanic-charge` / `.mechanic-decay` / `.mechanic-pulse` / `.mechanic-crit` / `.mechanic-void` 样式
  - [x] 2.4 导出 `MECHANIC_LABELS` 和 `MECHANIC_ICONS` 供 shop.ts 引用（当前是 producers.ts 私有常量）

- [x] **Task 3: 商店 Tooltip 机制信息** (AC: 3)
  - [x] 3.1 在 `KeyTooltipData.skill` 中新增 `mechanicInfo?: string` 字段
  - [x] 3.2 在 `shop.ts` 构建 tooltip 数据时，为产出者填充 mechanicInfo（如 "🔌蓄力 · 每秒+8%，上限200%"）
  - [x] 3.3 在 `KeyTooltip.show()` 中渲染 mechanicInfo（位于 enchantmentInfo 之前，青色 #4ecdc4，10px 字号）

- [x] **Task 4: 战斗触发弹窗机制状态** (AC: 4)
  - [x] 4.1 修改 `showTriggerPopup()` 函数签名，接受可选 `mechanicText?: string` 参数
  - [x] 4.2 在 `skills.ts` 的 `triggerProducer()` 中，根据机制类型构建 mechanicText：
    - charge: `"+${Math.round(chargePercent * 100)}%⬆"` (当前蓄力百分比)
    - decay: `"×${decayMult.toFixed(1)}"` (当前衰减倍率)
    - pulse: `"${count}/${interval}"` (脉冲计数)
    - void: `"+${emptyCount}空位"` (范围内空位数)
    - crit (命中): 由 Task 5 处理
    - standard/crit (未命中): 不显示额外文字
  - [x] 4.3 在弹窗 HTML 中，mechanicText 作为小字体标签显示在图标下方（8px, 半透明白色）
  - [x] 4.4 弹窗结构从 `<span class="trigger-icon">` 扩展为包含图标+状态文字的容器

- [x] **Task 5: 暴击触发特殊反馈** (AC: 5)
  - [x] 5.1 在 `skills.ts` 的 triggerProducer 暴击路径中，调用 `showTriggerPopup` 时传入 `isCrit: true`
  - [x] 5.2 暴击弹窗使用特殊 CSS 类 `.crit-trigger`：金色背景（rgba(255,230,109,0.3)）、更大字号、额外 "CRIT!" 文字
  - [x] 5.3 暴击弹窗动画增强：scale 从 0.5→1.4→1.0（vs 普通 0.5→1.1→1.0），持续 500ms（vs 普通 350ms）

- [x] **Task 6: 商店 bound-grid 机制角标** (AC: 6)
  - [x] 6.1 在 `renderBuildManager()` 的 key-slot 渲染中，非 standard 产出者在右下角显示小机制图标
  - [x] 6.2 图标使用 MECHANIC_ICONS（🔌📉💗🎲⬛），8px 字号，半透明
  - [x] 6.3 在 `style.css` 新增 `.mechanic-icon-badge` 样式（absolute 定位右下角）

- [x] **Task 7: 商店虚无范围高亮** (AC: 7)
  - [x] 7.1 在 `renderBuildManager()` 中，虚无产出者 key-slot 添加 `mouseenter` / `mouseleave` 事件
  - [x] 7.2 `mouseenter` 时用 `getKeysWithRelation(key, posRel)` 获取范围内键位
  - [x] 7.3 范围内无绑定技能的空位键添加 `.void-range-empty` CSS 类（紫黑色背景闪烁）
  - [x] 7.4 `mouseleave` 时移除所有 `.void-range-empty` 类
  - [x] 7.5 可复用现有 `.range-highlight` 样式或新增

- [x] **Task 8: 测试** (AC: 1-7)
  - [x] 8.1 测试 `MECHANIC_LABELS` 和 `MECHANIC_ICONS` 导出可用性
  - [x] 8.2 测试 `KeyTooltipData` 新增 mechanicInfo 字段定义
  - [x] 8.3 验证 `shop.ts renderUnifiedShopCard` 源码包含 mechanic-badge 渲染逻辑
  - [x] 8.4 验证 `shop.ts renderBuildManager` 源码包含 multiply-enchanted 和 mechanic-icon-badge
  - [x] 8.5 验证 `skills.ts showTriggerPopup` 支持 mechanicText 参数
  - [x] 8.6 验证暴击弹窗使用 `.crit-trigger` CSS 类

## Dev Notes

### 核心架构约束：战斗中无键盘

**战斗场景**只显示：词语、分数/目标分、计时器、连击数、技能触发弹窗（`#skill-trigger-zone` 中的 emoji 浮出动画）。**没有键盘可视化**。

**商店场景**的 `#shop-build` 区域包含 bound-grid（QWERTY 键盘布局的 `.key-slot` 格子），玩家在此查看/管理技能绑定。

因此：
- 机制类型标识（badge/边框/角标）→ 放在**商店** bound-grid 和技能卡片上
- 实时机制状态（蓄力%/衰减倍率/脉冲计数）→ 放在**战斗**触发弹窗中
- 虚无范围高亮 → 放在**商店** bound-grid 的 hover 交互中

### 战斗触发弹窗现有结构

```html
<!-- #skill-trigger-zone (position: absolute; bottom: 20px; display: flex;) -->
<div class="skill-trigger-popup">
  <span class="trigger-icon">⚔️</span>
</div>
```

CSS 动画 `triggerPop`：0→0.35s，scale 0.5→1.1→1.0，translateY 15→-5→-30，opacity 0→1→0。自动 350ms 后移除。

增强后结构：
```html
<div class="skill-trigger-popup">
  <span class="trigger-icon">🔌⚔️</span>
  <span class="trigger-mechanic">+45%⬆</span>  <!-- 新增：机制状态 -->
</div>
```

### 商店 bound-grid key-slot 现有结构

```html
<div class="key-slot has-skill" data-key="E">
  <span class="key-letter">E</span>
  <span class="key-skill-icon">⚔️</span>
  <span class="key-score">4</span>
  <!-- 可能有 devour-icons, growth-badge 等 -->
</div>
```

增强后：
```html
<div class="key-slot has-skill multiply-enchanted" data-key="E">
  <span class="key-letter">E</span>
  <span class="key-skill-icon">⚔️</span>
  <span class="key-score">4</span>
  <span class="mechanic-icon-badge">🔌</span>  <!-- 新增：机制角标 -->
</div>
```

### 机制状态文字构建

| 机制 | 触发弹窗 mechanicText | 数据源 |
|------|----------------------|--------|
| charge | `"+45%⬆"` | `state.chargeAccumulated.get(skillId)` (0~maxBonus) |
| decay | `"×1.7"` | `state.decayMultipliers.get(skillId)` (initialMult~floor) |
| pulse | `"3/4"` | `state.pulseCounts.get(skillId)` % interval |
| crit (命中) | `"CRIT!"` | 暴击判定结果 |
| void | `"+3空位"` | 实时计算空位数 |
| standard | 无 | — |

### MECHANIC_LABELS / MECHANIC_ICONS 导出

当前 `MECHANIC_LABELS` 和 `MECHANIC_ICONS` 是 `producers.ts` 的模块内私有常量。需要导出供 `shop.ts` 引用。

```typescript
// producers.ts — 改为 export
export const MECHANIC_LABELS: Record<string, string> = { ... };
export const MECHANIC_ICONS: Record<string, string> = { ... };
```

### 商店机制 Badge CSS

```css
.mechanic-badge {
  display: inline-block;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  margin-left: 4px;
}
.mechanic-charge  { background: rgba(78,205,196,0.2); color: #4ecdc4; }
.mechanic-decay   { background: rgba(255,107,107,0.2); color: #ff6b6b; }
.mechanic-pulse   { background: rgba(255,230,109,0.2); color: #ffe66d; }
.mechanic-crit    { background: rgba(224,86,253,0.2); color: #e056fd; }
.mechanic-void    { background: rgba(100,100,120,0.2); color: #888; }
```

### 性能注意

- 触发弹窗增强：仅增加 1 个 `<span>` 元素，DOM 操作可忽略
- 商店 hover 高亮：使用 CSS 类切换（`.void-range-empty`），无重绘
- 暴击动画延长 350ms→500ms：单次 DOM 元素存活时间增加 150ms，可忽略

### 关键代码位置

| 组件 | 文件 | 函数/位置 |
|------|------|----------|
| 触发弹窗 | `src/src/systems/skills.ts` | `showTriggerPopup()` (~L1274) |
| 产出者触发 | `src/src/systems/skills.ts` | `triggerProducer()` — 暴击/蓄力/衰减/脉冲分支 |
| 商店卡片 | `src/src/systems/shop.ts` | `renderUnifiedShopCard()` (~L495) |
| 商店键盘格 | `src/src/systems/shop.ts` | `renderBuildManager()` (~L1169) |
| 键盘 Tooltip | `src/src/ui/keyboard/KeyTooltip.ts` | `show()` — HTML 构建 |
| Tooltip 数据 | `src/src/ui/keyboard/KeyTooltip.ts` | `KeyTooltipData` 接口 |
| 机制常量 | `src/src/data/producers.ts` | `MECHANIC_LABELS`, `MECHANIC_ICONS`（需导出） |
| 机制查询 | `src/src/data/producers.ts` | `getProducerMechanic()` |
| 键盘拓扑 | `src/src/data/keyboardTopology.ts` | `getKeysWithRelation()` |
| 样式 | `src/style.css` | 商店样式(~L452)、弹窗样式(~L1300) |

### 不在本 Story 范围内

- ❌ 机制数值调整（34.7 负责）
- ❌ 战斗中显示键盘可视化（不改变战斗 HUD 布局）
- ❌ 新增附魔类型
- ❌ 音效变更

### 前置 Story 的关键成果

**34.1:** 70 个新机制产出者，ProducerDefinition 有 `mechanic` + `mechanicParams` 字段，GameState 有 `chargeAccumulated`/`decayMultipliers`/`pulseCounts` Map
**34.2:** `ench_multiply` 附魔（category='operator'），`enchantedSkills` Map 可查询
**34.5:** `getProducerMechanic()` 工具函数已导出

### Project Structure Notes

- 改动集中在 `systems/shop.ts`（商店卡片 + bound-grid）、`systems/skills.ts`（触发弹窗）、`ui/keyboard/KeyTooltip.ts`（tooltip）、`data/producers.ts`（导出常量）、`style.css`（样式）
- 依赖方向：`systems/ → data/`（shop/skills 引用 producers 常量），符合 `data → core → systems → scenes` 规则
- 测试以源码验证为主（DOM 渲染难以纯单元测试）

### References

- [Source: docs/stories/epic-34-skill-affix-refactor.md#Story 34.6 — 验收标准]
- [Source: src/src/systems/skills.ts#showTriggerPopup — 战斗触发弹窗]
- [Source: src/src/systems/shop.ts#renderUnifiedShopCard — 商店技能卡片]
- [Source: src/src/systems/shop.ts#renderBuildManager — 商店键盘格]
- [Source: src/src/ui/keyboard/KeyTooltip.ts — 键盘 tooltip]
- [Source: src/src/data/producers.ts — MECHANIC_LABELS, MECHANIC_ICONS, getProducerMechanic()]
- [Source: src/src/data/keyboardTopology.ts — getKeysWithRelation()]
- [Source: src/style.css — 商店/弹窗样式]
- [Source: docs/project-context.md — 性能预算, 代码组织规则]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- AC1: 在 `renderBuildManager()` 中检测 `ench_multiply` 附魔，为 key-slot 添加 `.multiply-enchanted` CSS 类（金色边框 #ffe66d + box-shadow 发光）
- AC2: 在 `renderUnifiedShopCard()` 中为非 standard 产出者添加 mechanic badge（`MECHANIC_ICONS` + `MECHANIC_LABELS`），位于 school badge 旁。导出 `MECHANIC_LABELS` 和 `MECHANIC_ICONS` 从 producers.ts
- AC3: 新增 `mechanicInfo?: string` 字段到 `KeyTooltipData`；新增 `buildMechanicInfo()` 工具函数为各机制生成描述文字（蓄力：每秒+X%上限Y%，衰减：初始×X每次-Y下限×Z，脉冲：每N次×M，暴击：X%概率×M，虚无：范围每空位+X%）；KeyTooltip 渲染 mechanicInfo（青色 #4ecdc4）
- AC4: `showTriggerPopup()` 增加 `mechanicText` 参数；`triggerProducer()` 在各机制路径中构建状态文字（charge: +X%⬆, decay: ×X.X, pulse: N/interval, void: +N空位）；弹窗 HTML 新增 `<span class="trigger-mechanic">`
- AC5: `showTriggerPopup()` 增加 `isCrit` 参数；暴击弹窗使用 `.crit-trigger` CSS 类（金色背景、CRIT! 文字、`critTriggerPop` 动画 scale 0.5→1.4→1.0，持续 500ms）
- AC6: 在 `renderBuildManager()` 中为非 standard 产出者添加 `<span class="mechanic-icon-badge">` 右下角角标（8px 字号，半透明）
- AC7: 虚无产出者 key-slot 的 mouseenter 事件中，通过 `getKeysWithRelation()` 获取范围内键位，空位键添加 `.void-range-empty` CSS 类（紫色脉冲动画）；mouseleave 清除
- 测试：27 个行为测试覆盖所有 AC（代码审查后从 31 个源码字符串匹配测试重构为纯行为测试）

### Code Review Fixes

- **H1 (decay mechanicText floor 边界)**: 修复 `skills.ts` 中 decay mechanicText 在倍率衰减到 floor 时显示错误值的 bug。改为直接显示 post-decay 倍率值
- **M1 (重复 RELATION_LABELS)**: 导出 `producers.ts` 的 `RELATION_LABELS`，`shop.ts` 改为引用导出，删除 `RELATION_LABELS_LOOKUP` 重复定义
- **M2 (as any 类型)**: `buildMechanicInfo()` 中 10+ 处 `as any` 替换为 `ChargeParams`/`DecayParams`/`PulseParams`/`CritParams`/`VoidParams` 类型断言
- **M3 (源码字符串匹配测试)**: 全部 18 个 `fs.readFileSync` + `toContain` 测试替换为行为测试（验证数据结构、参数范围、函数输出）。测试数 31→27
- **L1 (critTriggerPop 动画)**: 50% keyframe 补充 `opacity: 1` 防止隐式继承导致提前淡出
- **L2 (未使用导入)**: 删除测试文件中未使用的 `PRODUCER_MECHANIC_WEIGHTS` 导入

### Change Log

- 2026-03-11: Story 34.6 implementation complete — all 7 ACs and 8 tasks implemented
- 2026-03-11: Code review fixes — H1×1, M×3, L×2 全部修复

### File List

- src/src/data/producers.ts (modified — exported MECHANIC_LABELS, MECHANIC_ICONS, RELATION_LABELS)
- src/src/systems/shop.ts (modified — mechanic badge in cards, multiply-enchanted border, mechanic icon badge, void range highlight, buildMechanicInfo function with typed params, mechanicInfo in tooltips)
- src/src/systems/skills.ts (modified — enhanced showTriggerPopup with mechanicText/isCrit, fixed decay mechanicText floor bug)
- src/src/ui/keyboard/KeyTooltip.ts (modified — added mechanicInfo field and rendering)
- src/src/style.css (modified — multiply-enchanted, mechanic-badge, mechanic-icon-badge, void-range-empty, trigger-mechanic, crit-trigger styles, fixed critTriggerPop opacity)
- src/tests/unit/systems/shop-ui-enchantment.test.ts (new — 27 behavioral tests for AC1-AC7)
