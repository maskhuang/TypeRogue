# Story 24.6: 附魔 UI 适配

Status: done

## Story

As a 玩家,
I want 在商店和战斗界面看到成长/精通/吞噬附魔的实时状态（成长百分比、触发进度、吞噬图标数）,
so that 我能理解附魔系统的当前效果并做出更好的构筑决策.

## Acceptance Criteria

1. **AC1 — 商店键盘 Tooltip 显示附魔状态**
   - 商店键盘悬停时 tooltip 中显示附魔详情
   - 成长型附魔：显示累积成长值 `成长: +X%`
   - 精通附魔：显示触发进度 `精通: N/10`
   - 吞噬附魔：显示图标数和吞噬列表 `吞噬: 🔥⚡ (×N)`
   - 溅射/共鸣/排斥附魔：显示附魔名称和效果描述
   - 变性型附魔：显示额外产出类型
   - 无附魔技能不显示附魔行

2. **AC2 — 商店键盘成长徽章**
   - 有成长值（growthValues > 0）的技能在键盘格子上显示成长百分比
   - 格式：`+N%`，金色小字，显示在技能图标下方或右侧
   - 成长值 = 0 时不显示

3. **AC3 — 附魔选择 Modal 增强**
   - 成长型附魔选项卡上标注 `🌱 成长` 标签
   - 吞噬附魔选项卡上标注 `🦷 独立` 标签
   - 精通附魔选项卡上标注 `📈 独立` 标签
   - 所有附魔选项显示 category 标签（空间/变性/独立）

4. **AC4 — 战斗键盘可视化增强**
   - 战斗中 KeyVisual 上显示成长百分比（如有）
   - 格式：小字标签 `+N%`，金色(#ffe66d)
   - 位置：键位右下角（类似 amplifier stack 显示位置）

5. **AC5 — 单元测试**
   - tooltip 数据生成函数测试（各类附魔状态正确输出）
   - 成长徽章显示逻辑测试（>0 显示、=0 不显示）
   - 无回归：现有 enchantment-effects 测试全部通过

## Tasks / Subtasks

- [x] Task 1: 商店 Tooltip 附魔状态数据 (AC: 1)
  - [x] 1.1 在 shop.ts 的 tooltip 数据生成逻辑中，检查 `state.player.enchantedSkills.get(skillId)`
  - [x] 1.2 根据附魔 category/id，构建附魔状态行：
    - growth: `成长: +${(growthValues.get(skillId) * 100).toFixed(0)}%`
    - mastery: `精通: ${masteryCounters.get(skillId) % 10}/10`
    - devour: `吞噬: ${devourIcons.get(skillId)?.join('')} (图标×${getIconCount(skillId)})`
    - splash/resonance/repulsion: `${ench.name}: ${ench.desc}`
    - transmutation: `${ench.name}: ${ench.desc}`
  - [x] 1.3 将附魔状态行追加到 tooltipData 中
  - [x] 1.4 在 tooltip HTML 渲染中显示附魔状态行（紫色(#9b59b6)文字）

- [x] Task 2: 商店键盘成长徽章 (AC: 2)
  - [x] 2.1 在 shop.ts 键盘格渲染（约 line 854）中读取 `state.growthValues.get(skillId)`
  - [x] 2.2 当 growthValue > 0 时，追加 `<span class="growth-badge">+${Math.round(val*100)}%</span>`
  - [x] 2.3 在 style.css 中添加 `.growth-badge` 样式：金色(#ffe66d)、font-size: 8px

- [x] Task 3: 附魔选择 Modal category 标签 (AC: 3)
  - [x] 3.1 在 renderEnchantmentModal() 中为每个 enchantment-branch 添加 category 标签
  - [x] 3.2 标签文本映射：spatial→`🌐 空间`, transmutation→`⚗️ 变性`, independent→`⭐ 独立`
  - [x] 3.3 在 style.css 中添加 `.enchantment-category-tag` 样式

- [x] Task 4: 战斗 KeyVisual 成长显示 (AC: 4)
  - [x] 4.1 在 KeyVisual.ts 中添加 `setGrowthLabel(value: number)` 方法
  - [x] 4.2 创建 PixiJS Text 对象，金色小字，位于键位右下角
  - [x] 4.3 在 KeyboardVisualizer.ts 添加 syncGrowthValues() + onSkillTriggered 中处理 growthValue
  - [x] 4.4 在 skills.ts 的 checkGrowthAccumulation/checkMasteryAccumulation 中 emit growthValue

- [x] Task 5: 单元测试 (AC: 5)
  - [x] 5.1 测试 tooltip 数据：成长型附魔→包含成长百分比
  - [x] 5.2 测试 tooltip 数据：精通附魔→包含 N/10 进度
  - [x] 5.3 测试 tooltip 数据：吞噬附魔→包含图标列表
  - [x] 5.4 测试成长徽章：growthValue > 0 → 有 badge
  - [x] 5.5 测试成长徽章：growthValue = 0 → 无 badge
  - [x] 5.6 运行全部现有 enchantment-effects 测试确认无回归（51 pass）

## Dev Notes

### 现有 Tooltip 架构

商店键盘 tooltip 已有增幅者(amplifier)详情显示的先例：
- `shop.ts:882-895`：检测 `isAmplifier(skillId)` 后构建 amplifierStacks 和 affectedSkills 数据
- 新增附魔状态只需在此逻辑后追加 enchantment 检测分支
- Tooltip HTML 渲染在 `shop.ts:862-895`

### 键盘格 HTML 结构

当前 shop.ts:854-856 的 key-slot innerHTML:
```html
<span class="key-letter">F</span>
<span class="key-skill">
  <span class="devour-icons">🔥⚡</span>  <!-- 吞噬图标前缀 -->
  🦷                                       <!-- 技能图标 -->
</span>
<span class="key-score">3</span>           <!-- 字频底分 -->
```

新增成长徽章后：
```html
<span class="key-letter">F</span>
<span class="key-skill">
  <span class="devour-icons">🔥⚡</span>
  🦷
</span>
<span class="growth-badge">+45%</span>     <!-- 新增：成长百分比 -->
<span class="key-score">3</span>
```

### 战斗 KeyVisual (PixiJS)

- `KeyVisual.ts:261-282`：已有 `setStackCount(count)` 方法显示增幅层数
- 成长标签可复用相同模式：创建 Text 对象在右下角
- 位置建议：右下角(width-2, height-2, anchor right-bottom)，避免与左上角 stack 标签冲突
- 颜色：#ffe66d（金色，与 multiplier 一致）

### 附魔 category 标签颜色

| Category | 标签 | 颜色 |
|----------|------|------|
| spatial | 🌐 空间 | #4ecdc4 (cyan) |
| transmutation | ⚗️ 变性 | #ffe66d (gold) |
| independent | ⭐ 独立 | #ff6b6b (red) |

### 状态数据来源

```typescript
// 成长值（跨关累积）
const growth = state.growthValues.get(skillId) || 0;

// 精通计数（跨关累积）
const masteryCount = state.masteryCounters.get(skillId) || 0;
const masteryProgress = masteryCount % 10; // 当前进度
const masteryMilestones = Math.floor(masteryCount / 10); // 已达里程碑数

// 吞噬图标（跨关累积）
const devoured = state.devourIcons.get(skillId) || [];
const iconCount = getIconCount(skillId); // 1 + enchant + devoured.length

// 增幅层数（每关重置）
const stacks = state.amplifierStacks.get(skillId) || 0;
```

### Project Structure Notes

- 修改文件：`systems/shop.ts`, `ui/keyboard/KeyVisual.ts`, `ui/keyboard/KeyboardVisualizer.ts`, `style.css`
- 新增测试：`tests/unit/systems/enchantment-effects.test.ts`（追加 tooltip 测试）
- 不新建文件
- 依赖：无新依赖

### References

- [Source: src/systems/shop.ts#renderEnchantmentModal (line 652-720)]
- [Source: src/systems/shop.ts#keyboard-tooltip (line 860-895)]
- [Source: src/systems/shop.ts#key-slot-render (line 854-856)]
- [Source: src/ui/keyboard/KeyVisual.ts#setStackCount (line 261-282)]
- [Source: src/ui/keyboard/KeyboardVisualizer.ts#skill:triggered handler (line 202-214)]
- [Source: src/data/enchantments.ts#ENCHANTMENTS (全31个附魔)]
- [Source: src/core/types.ts#GameState (line 148-189)]
- [Source: src/systems/skills.ts#getIconCount (line 152-158)]
- [Source: src/systems/skills.ts#getEnchantmentMultiplier (line 78-101)]
- [Source: docs/stories/24-5-devour-enchantment-logic.md — 前置 story 完成]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: `buildEnchantmentInfo()` 函数在 shop.ts 中为每类附魔构建状态文本；`enchantmentInfo` 字段添加到 KeyTooltipData；tooltip HTML 中紫色渲染
- Task 2: 键盘格 key-slot 中追加 `.growth-badge` span，金色 8px 小字显示成长百分比
- Task 3: 附魔选择 Modal 每张卡片顶部增加 `.enchantment-category-tag`（空间/变性/独立），带颜色
- Task 4: KeyVisual.ts 新增 `setGrowthLabel()` 方法（PixiJS Text 右下角金色），通过 `skill:triggered` 事件的 `growthValue` 字段更新
- Task 5: 11 个新测试（6 buildEnchantmentInfo + 2 growth badge HTML + 3 edge cases），全部通过
- 同步修复: enchantments.test.ts 中 ench_devour positionRelation 断言更新（配合吞噬范围改为左侧一格）
- Code Review 修复:
  - M1: 精通 tooltip 拆分为独立分支，显示 N/10 进度 + 成长百分比
  - M2: 移除 KeyboardVisualizer.syncGrowthValues() 死代码
  - M3: 新增 3 个边界测试（精通 counters=0、吞噬空图标、精通 N/10 格式）
  - L1: .growth-badge CSS 增加 margin-top: 1px
- 回归: 0 新增失败，10 预存失败

### File List

- src/systems/shop.ts — 新增 `buildEnchantmentInfo()`、tooltip 附魔信息、键盘成长徽章、Modal category 标签
- src/ui/keyboard/KeyTooltip.ts — `enchantmentInfo` 字段 + 渲染
- src/ui/keyboard/KeyVisual.ts — `setGrowthLabel()` 方法
- src/ui/keyboard/KeyboardVisualizer.ts — onSkillTriggered growthValue 处理
- src/systems/skills.ts — checkGrowthAccumulation/checkMasteryAccumulation emit growthValue
- src/core/events/EventBus.ts — skill:triggered 事件增加 growthValue 字段
- src/style.css — `.growth-badge`（含 margin-top）+ `.enchantment-category-tag` 样式
- tests/unit/systems/enchantment-effects.test.ts — 11 个新测试
- tests/unit/data/enchantments.test.ts — ench_devour positionRelation 断言修复
