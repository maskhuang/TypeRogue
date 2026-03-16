# Story 39.2: Tooltip 信息架构重构

Status: review

## Story

As a 玩家,
I want Tooltip 中的技能信息按功能分区块显示、层级清晰、数值突出,
so that 我能快速扫描理解每个技能的词条组合和预估产出，不需要逐行阅读平铺文本。

## Acceptance Criteria

1. **AC1**: Tooltip 分 4 个视觉区块（标题/词条/附魔/摘要），区块间有 1px `#333` 分隔线
2. **AC2**: 词条名使用 `AFFIX_COLORS` 对应颜色 + `var(--text-caption-size)` 字号，描述使用 `var(--text-caption-color)` 灰色
3. **AC3**: 标题区显示完整技能名、等级（Lv.1/2/3）、学派色标签（使用已有 `.tooltip-skill-school` 样式）
4. **AC4**: 附魔区仅在有附魔时显示；显示图标+名称+效果+累计进度（学徒累计 %、任务层数）
5. **AC5**: 摘要区数值使用 `#ffe66d` 高亮，明细分项以 `|` 分隔
6. **AC6**: 空键位 Tooltip 仅显示字母 + 分数 + 频率，无多余空白区块或分隔线
7. **AC7**: Tooltip 在 1920×1080 和 1366×768 分辨率下不溢出视口

## Tasks / Subtasks

- [x] Task 1: 新增 CSS 类定义 — Tooltip 区块样式 (AC: 1, 2, 5)
  - [x] 1.1 在 `style.css` 新增 `.tooltip-section` 通用区块样式（margin-top + border-top + padding-top）
  - [x] 1.2 新增 `.tooltip-header` 标题区样式（技能名 subtitle 级 + 等级标签 + 学派色条）
  - [x] 1.3 新增 `.tooltip-affix-list` 词条列表区样式（affix 名 + 描述间距）
  - [x] 1.4 新增 `.tooltip-enchant-list` 附魔列表区样式
  - [x] 1.5 新增 `.tooltip-summary` 摘要区样式（数值高亮 #ffe66d + 明细 caption 级）
  - [x] 1.6 新增 `.tooltip-summary-detail` 明细行样式（`|` 分隔 inline 布局）
- [x] Task 2: 重构 `KeyTooltip.ts` — 拆分 `show()` 为区块构建函数 (AC: 1, 3, 6)
  - [x] 2.1 提取 `buildLetterSection(data)` — 字母 + 分数 + 频率
  - [x] 2.2 提取 `buildHeaderSection(skill)` — 技能名 + 等级 + 学派标签
  - [x] 2.3 提取 `buildAffixSection(skill)` — 词条列表区
  - [x] 2.4 提取 `buildEnchantSection(skill)` — 附魔列表区（含任务进度/学徒成长）
  - [x] 2.5 提取 `buildSummarySection(skill)` — 预估产出摘要区
  - [x] 2.6 重写 `show()` — 组合各区块，空区块不渲染（不留空白分隔线）
- [x] Task 3: 实现标题区 — header 区块 (AC: 3)
  - [x] 3.1 标题行：`icon + name + Lv.X` 使用 subtitle 级（14px bold #e0e0e0）
  - [x] 3.2 学派色标签：复用已有 `.tooltip-skill-school.school-*` CSS 类
  - [x] 3.3 商店模式：如有 upgradeInfo 则显示升级信息（Lv.X→Lv.Y），不显示当前等级
  - [x] 3.4 基础值行：如有 baseValuesText 则在标题下方用 caption 级显示
  - [x] 3.5 技能描述行：保持 `.tooltip-skill-desc` 现有样式
- [x] Task 4: 实现词条区 — affix 区块 (AC: 2)
  - [x] 4.1 每个词条一行：`<类型名> 参数摘要`，类型名颜色取 `AFFIX_COLORS[typeKey]`
  - [x] 4.2 词条描述：缩进 caption 级灰色，可选（有 description 时才渲染）
  - [x] 4.3 区块标题不需要（词条名本身带颜色已足够区分）
  - [x] 4.4 增幅者信息：amplifierStacks + affectedSkills 放在词条区最后
  - [x] 4.5 机制信息：mechanicInfo（蓄力/衰减等）放在词条区
- [x] Task 5: 实现附魔区 — enchantment 区块 (AC: 4)
  - [x] 5.1 条件渲染：仅当 `skill.enchantments?.length > 0` 时显示整个区块
  - [x] 5.2 附魔项：`icon + name`（附魔专属色）+ 描述（caption 灰色）
  - [x] 5.3 任务进度：questProgress 用 #f1c40f（任务金色）
  - [x] 5.4 学徒成长：apprenticeGrowth 用 #2ecc71（成长绿色）
- [x] Task 6: 实现摘要区 — summary 区块 (AC: 5)
  - [x] 6.1 条件渲染：仅当 `skill.smartEstimate` 存在时显示
  - [x] 6.2 总产出行：`预估产出: +XX.X` 用 body 级 bold + `#ffe66d` 高亮色
  - [x] 6.3 明细行：各分项用 `|` 分隔的 inline 布局（不再竖排），每项用 AFFIX_COLORS 对应色
  - [x] 6.4 明细详情（detail）：用 caption 灰色显示计算细节
- [x] Task 7: 空键位 Tooltip 优化 (AC: 6)
  - [x] 7.1 当 `data.skill` 不存在时只渲染 letterSection，无分隔线
  - [x] 7.2 当 `data.score === 0` 时显示低频提示（已有逻辑保持不变）
- [x] Task 8: 清理内联样式 → CSS 类引用 (AC: 1, 2)
  - [x] 8.1 将所有 `style="color:...;font-size:...;margin-top:..."` 替换为语义化 CSS 类
  - [x] 8.2 确保所有字号/颜色来自 CSS 变量（`var(--text-*)`, `var(--tooltip-*)`）
  - [x] 8.3 功能色（AFFIX_COLORS 动态色、enchantment.color 动态色）保持内联 style（因为值运行时确定）
- [ ] Task 9: 视觉回归与分辨率验证 (AC: 7)
  - [ ] 9.1 战斗界面键盘悬停 Tooltip — 满词条技能（3 词条 + 附魔 + 预估）
  - [ ] 9.2 商店界面商品卡悬停 — 升级模式和新技能模式
  - [ ] 9.3 已拥有技能背包悬停 — 含 SmartEstimate 的完整 Tooltip
  - [ ] 9.4 空键位悬停 — 只显示字母/频率，无多余区块
  - [ ] 9.5 1366×768 分辨率下定位验证 — 不溢出、avoidRect 模式正常

## Dev Notes

### 核心修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/src/ui/keyboard/KeyTooltip.ts` | **重构** | 拆分 show() 为 6 个区块构建函数，清理所有内联样式 |
| `src/src/style.css` | 修改 | 新增 `.tooltip-section` / `.tooltip-header` / `.tooltip-affix-list` / `.tooltip-enchant-list` / `.tooltip-summary` 等 CSS 类 |

### 不修改的文件

- `shop.ts` — 4 个 `keyTooltip.show()` 调用点不需要改（数据接口 `KeyTooltipData` 不变）
- `KeyVisual.ts` — tooltip 显示/隐藏调用不变
- `KeyboardVisualizer.ts` — `syncTooltips()` 接口不变
- `ui/theme.ts` — Token 已经定义好，本 Story 不需要修改

### 重要：KeyTooltipData 接口不变

本 Story 仅重构 **渲染层**（HTML 模板 + CSS），不改变数据接口。所有 4 个 call site（shop.ts ×3, KeyVisual.ts ×1）传入的 `KeyTooltipData` 保持不变，无需修改调用方。

### 当前 show() 方法结构 → 目标结构映射

```
当前（KeyTooltip.ts show() 内 ~70 行 HTML 拼接）:
├── letter + score + freq（无分区）
├── skill.upgradeInfo 或 skill.name + Lv.X
├── skill.description
├── skill.baseValuesText
├── skill.amplifierStacks
├── skill.affectedSkills
├── skill.mechanicInfo
├── skill.enchantmentInfo
├── smartEstimate（border-top 分隔）
│   ├── 预估总值
│   └── breakdown 逐行
├── affixInfo（border-top 分隔）
│   └── 逐 affix: 类型名 + 描述
├── enchantments（border-top 分隔）
│   └── 逐 ench: icon + name + desc
├── questProgress
└── apprenticeGrowth

目标（重构后）:
├── [letterSection]  字母 + 分数 + 频率
├── [headerSection]  ← .tooltip-section.tooltip-header
│   ├── icon + name + Lv.X（subtitle 级）
│   ├── .tooltip-skill-school 色标签
│   ├── upgradeInfo（升级模式替代 Lv.X）
│   ├── baseValuesText（caption 级）
│   └── description（caption 级）
├── [affixSection]   ← .tooltip-section.tooltip-affix-list
│   ├── 逐 affix: <类型名>（AFFIX_COLORS 色）+ 参数
│   │   └── 描述（caption 灰色，缩进）
│   ├── amplifierStacks + affectedSkills
│   ├── mechanicInfo
│   └── enchantmentInfo（旧式，非词条制技能的附魔描述文本）
├── [enchantSection] ← .tooltip-section.tooltip-enchant-list
│   ├── 逐 enchantment: icon + name（专属色）+ desc（caption）
│   ├── questProgress（#f1c40f 任务金）
│   └── apprenticeGrowth（#2ecc71 成长绿）
└── [summarySection] ← .tooltip-section.tooltip-summary
    ├── 预估产出: +XX.X（#ffe66d bold）
    └── 明细: 强化 ×1.65 | 虚无 +30% | 学徒 +12%（caption, | 分隔）
```

### CSS 新增类推荐方案

```css
/* Tooltip 区块通用分隔 */
.key-tooltip .tooltip-section {
  margin-top: var(--spacing-xs);
  padding-top: var(--spacing-xs);
  border-top: 1px solid #333;
}

/* 标题区 */
.key-tooltip .tooltip-header .tooltip-title {
  font-size: var(--text-subtitle-size);
  font-weight: bold;
  color: var(--text-secondary);
}
.key-tooltip .tooltip-header .tooltip-level {
  font-size: var(--text-caption-size);
  color: var(--text-caption-color);
  margin-left: var(--spacing-xs);
}

/* 词条区 */
.key-tooltip .tooltip-affix-list .tooltip-affix-name {
  font-size: var(--text-caption-size);
  /* color 由内联 style 设置（AFFIX_COLORS 动态值） */
}
.key-tooltip .tooltip-affix-list .tooltip-affix-desc {
  font-size: var(--text-caption-size);
  color: var(--text-caption-color);
  margin-left: var(--spacing-xs);
  margin-bottom: 2px;
}

/* 附魔区 */
.key-tooltip .tooltip-enchant-list .tooltip-ench-name {
  font-size: var(--text-caption-size);
  /* color 由内联 style 设置（enchantment.color 动态值） */
}
.key-tooltip .tooltip-enchant-list .tooltip-ench-desc {
  font-size: var(--text-caption-size);
  color: var(--text-caption-color);
  margin-left: var(--spacing-xs);
  margin-bottom: 2px;
}

/* 摘要区 */
.key-tooltip .tooltip-summary .tooltip-est-value {
  font-size: var(--text-body-size);
  font-weight: bold;
  color: #ffe66d;
}
.key-tooltip .tooltip-summary .tooltip-est-details {
  font-size: var(--text-caption-size);
  color: var(--text-caption-color);
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--spacing-sm);
}
.key-tooltip .tooltip-summary .tooltip-est-item {
  white-space: nowrap;
  /* color 由内联 style 设置（AFFIX_COLORS 动态值） */
}
/* "|" 分隔符 — 用 CSS ::before 或用 flex + gap 自然间隔 */
```

### 关键约束

1. **不改 KeyTooltipData 接口**：所有调用方（shop.ts ×3, KeyVisual.ts ×1）不需要改动
2. **不改 AFFIX_COLORS 映射**：颜色表保持不变，仍在 KeyTooltip.ts 中导出
3. **不改定位逻辑**：`position()` 和 `positionAvoidingRect()` 方法保持不变
4. **不改 esc() 函数**：HTML 转义函数保持不变
5. **动态色保持内联**：AFFIX_COLORS[typeKey]、enchantment.color 等运行时确定的颜色仍用 `style="color:${color}"` 内联
6. **静态样式走 CSS 类**：font-size、margin、padding、border 等固定样式全部用 CSS 类
7. **空区块不渲染**：如果某个 section 的 builder 返回空字符串，则不输出该 section 的 div（包括分隔线），避免 AC6 违规
8. **摘要区明细用 `|` 分隔**：从竖排改为横排 inline 布局，使用 flex + gap 或手动插 `|` 字符

### 39.1 Code Review 经验教训

1. **必须使用 CSS 变量**：不要在内联样式中写 `font-size:11px`，要写 `font-size:var(--text-caption-size)`。39.1 Code Review 发现硬编码值被标为 MEDIUM issue
2. **theme.ts 常量必须被引用**：如果定义了 Token 就要实际 import 使用。本 Story 中 KeyTooltip 是 DOM 组件，应使用 CSS 变量而非 JS 常量
3. **TOOLTIP.paddingY/paddingX**：theme.ts 中 padding 已拆分为 Y=12 / X=16，与 CSS `--tooltip-padding: 12px 16px` 同步

### 4 个 call site 详情（均不需修改）

| # | 文件:行 | 触发场景 | 特殊数据 |
|---|---------|---------|---------|
| 1 | `shop.ts:1066` | 商店卡片悬停 | upgradeInfo, baseValuesText, affixInfo（无 smartEstimate） |
| 2 | `shop.ts:2197` | 键盘绑定格悬停 | smartEstimate, affixInfo, enchantments, avoidRect |
| 3 | `shop.ts:2280` | 已拥有技能悬停 | smartEstimate, affixInfo, enchantments |
| 4 | `KeyVisual.ts:559` | PixiJS 键位悬停 | 由 KeyboardVisualizer.syncTooltips 设置 |

### AFFIX_COLORS 完整映射（20 种词条色）

已有导出在 `KeyTooltip.ts:27-50`：base/#ccc, apprentice/#2ecc71, multiply/#e74c3c, convert/#f39c12, rainbow/#ff6bcb, charge/#3498db, decay/#95a5a6, pulse/#e67e22, crit/#f1c40f, cascade/#1abc9c, void/#9b59b6, resonance/#2ecc71, mirror/#a29bfe, link/#00cec9, splash/#6c5ce7, amplify/#fd79a8, outcast/#d35400, gravity/#8e44ad, ligature/#27ae60, twin/#fdcb6e, recurse/#00b894, taboo/#ff4757

### Project Structure Notes

- `KeyTooltip.ts` 位于 `src/src/ui/keyboard/`，是单例 DOM 浮层，不是 PixiJS 组件
- 依赖方向：`KeyTooltip` ← `KeyVisual`（PixiJS）、`shop`（DOM 系统）
- CSS 变量在 `style.css` `:root` 定义，KeyTooltip 的 DOM 元素可直接使用 `var()` 引用
- 本 Story 不需要 import `theme.ts`（纯 DOM 组件用 CSS 变量即可）

### 风险与注意事项

1. **摘要区明细 `|` 分隔的换行问题**：当 breakdown 项过多（4+），inline 布局可能溢出 340px 宽度。使用 `flex-wrap: wrap` 允许自动换行
2. **avoidRect 模式下内容增多**：重构后区块更清晰但总高度可能增加，需确保 `positionAvoidingRect()` 的 fallback 逻辑仍有效
3. **旧式 `enchantmentInfo` 字段**：部分非词条制技能仍使用单字符串 `skill.enchantmentInfo`（而非 `skill.enchantments[]`），需在 affixSection 中兼容
4. **商店模式 vs 战斗模式**：商店 Tooltip 无 smartEstimate，战斗 Tooltip 有。区块条件渲染需正确处理两种场景

### References

- [Source: docs/stories/epic-39-tutorial-readability.md#Story 39.2]
- [Source: docs/stories/39-1-design-token-readability.md — 39.1 Code Review 修复记录]
- [Source: src/src/ui/keyboard/KeyTooltip.ts — show() 方法 L114-202, AFFIX_COLORS L27-50]
- [Source: src/src/style.css — .key-tooltip L1739-1803, CSS 变量 :root L3-28]
- [Source: src/src/systems/shop.ts — call sites L1066, L2197, L2280]
- [Source: src/src/ui/keyboard/KeyVisual.ts — call site L559]
- [Source: docs/project-context.md — Code Organization Rules, Performance Budget]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: style.css 新增 ~80 行 CSS 类：`.tooltip-section`（通用区块分隔）、`.tooltip-header`（标题 subtitle 级）、`.tooltip-affix-list`（词条区含 affix-name/desc/amp/mechanic）、`.tooltip-enchant-list`（附魔区含 quest/apprentice）、`.tooltip-summary`（摘要区含 est-value/#ffe66d、est-details flex 布局、est-sep 分隔符）
- Task 2-8: KeyTooltip.ts 完全重构 — `show()` 从 ~70 行 HTML 拼接拆分为 5 个独立构建函数（buildLetterSection/buildHeaderSection/buildAffixSection/buildEnchantSection/buildSummarySection），show() 仅做组合。所有静态内联样式（font-size/color/margin/border）替换为 CSS 类引用，仅 AFFIX_COLORS 和 enchantment.color 动态色保持内联 style。空区块不渲染（无 data.skill 时无分隔线；无 affixInfo 时无词条区；无 enchantments 时无附魔区；无 smartEstimate 时无摘要区）
- Task 9: 需要手动视觉回归验证（启动游戏检查）
- 测试: 新增 7 个单元测试覆盖区块渲染/条件渲染/空键位/升级模式/摘要区分隔符
- Code Review 修复:
  - M1: buildHeaderSection 添加学派色标签（`tooltip-skill-school school-*`），修复 AC3 缺失
  - M2: 删除孤立 CSS 规则（`.tooltip-skill`、`.tooltip-skill-name`）
  - L1: 新增 6 个分支覆盖测试（schoolCssClass/baseValuesText/amplifierStacks/mechanicInfo/enchantmentInfo/questProgress），总计 23 测试全部通过
  - L2: 新增 `safeColor()` 函数，sanitize `ench.color` 内联 style 注入

### File List

- `src/src/ui/keyboard/KeyTooltip.ts` (重构) — 拆分为 5 个区块构建函数 + show() 组合器，清理所有内联样式
- `src/src/style.css` (修改) — 新增 tooltip-section/header/affix-list/enchant-list/summary CSS 类
- `src/tests/unit/ui/keyboard/KeyTooltip.test.ts` (修改) — 新增 7 个区块重构测试
