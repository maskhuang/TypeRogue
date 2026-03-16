---
title: "Epic 39: 新手引导与描述可读性优化"
epic_key: "epic-39"
status: "draft"
created: "2026-03-15"
stories:
  - "39-1-design-token-readability"
  - "39-2-tooltip-restructure"
  - "39-3-tutorial-manager-infra"
  - "39-4-tutorial-L0-L1"
  - "39-5-tutorial-L2-L3"
  - "39-6-tutorial-L4-help-system"
---

# Epic 39: 新手引导与描述可读性优化

## 背景

当前游戏存在两个核心体验短板：

1. **引导系统缺失**：仅 Demo 模式有 3 步浮窗教程（`demo-tutorial.ts`），完整版无任何引导。游戏系统深度极高（20 种词条、5 类附魔、6 种位置关系、Boss 修饰器、职业系统），新玩家在无引导情况下几乎无法理解核心循环。

2. **描述可读性不足**：Tooltip 基础字号 10-11px、描述文字 10px/#888 灰色、类型徽章 9px、Tooltip 最大宽度 260px。在 1080p+ 屏幕上信息密度过高且难以辨识，关键数值淹没在文本中。

### 现状分析

| 组件 | 位置 | 问题 |
|------|------|------|
| Demo 教程 | `demo/demo-tutorial.ts` | 硬编码 Demo 模式，3 步覆盖面过窄，完整版无法复用 |
| 技能 Tooltip | `ui/keyboard/KeyTooltip.ts` | 10-11px 字号，信息平铺无层级，宽度 260px 过窄 |
| 商品描述 | `style.css` L511-572 | 描述 10px/#888，徽章 9px |
| 图鉴描述 | `scenes/collection/CollectionItem.ts` | 描述 11px/#aaa |
| 文字样式 | 分散在 CSS + TS 各处 | 无统一 Design Token，修改需逐文件排查 |

### 已有可复用基础

- EventBus 事件系统完善（`skill:triggered`、`word:complete`、`shop:opened` 等）
- i18n 系统成熟（`demo-i18n.ts`，中英双语）
- MetaState 持久化机制完备（可存储引导进度）
- `AdjacencyVisualizer` 已有战斗中位置关系的视觉反馈
- `KeyboardVisualizer` 已有实时键盘高亮

## 设计原则

- **渐进披露**：按玩家接触时机分层引导，不一次灌输所有信息
- **事件驱动**：利用现有 EventBus 在自然教学时机触发引导，不打断游戏流
- **可跳过/关闭**：每个引导步骤可标记"不再显示"，尊重老玩家
- **统一视觉语言**：所有文字显示统一走 Design Token，一处修改全局生效
- **最小侵入**：尽量复用现有组件和事件，不新增重量级系统

## 核心数字

| 指标 | 当前 | 优化后 |
|------|------|--------|
| 引导步骤（完整版） | 0 | 15+（L0-L5 分层） |
| Tooltip 最小字号 | 9px | 12px |
| 描述文字字号 | 10px | 13px |
| Tooltip 最大宽度 | 260px | 340px |
| 文字样式定义点 | 10+ 文件散落 | 1 处 Design Token |
| 术语表条目 | 0 | 20+ 词条 + 6 附魔类 + 6 位置关系 |

## Stories

---

### Story 39.1: Design Token 统一与全局字号/对比度提升

**复杂度: Medium**
**依赖: 无**

建立统一的 Design Token 系统，将散落在 CSS / TS 各处的文字样式收归一处，同时全面提升字号和对比度下限。

**范围：**
- 新建 `ui/theme.ts`，定义文字层级（title / subtitle / body / caption）、颜色、间距常量
- 新建 `ui/theme.css`（或扩展 `style.css`），用 CSS 变量暴露 Token
- 迁移 `KeyTooltip.ts` 中所有硬编码字号/颜色 → Token 引用
- 迁移 `style.css` 中商品卡片（`.reward-item`）样式 → Token 引用
- 迁移 `CollectionItem.ts` 中图鉴文字样式 → Token 引用
- 迁移 `EffectTextDisplay.ts` 中浮动文字样式 → Token 引用
- 迁移各 HUD 组件（ScoreDisplay / ComboCounter / TimerBar）中的 TextStyle → Token 引用

**Design Token 规格：**

```typescript
// ui/theme.ts
export const TEXT_LEVEL = {
  title:    { size: 18, color: '#ffffff', weight: 'bold' },
  subtitle: { size: 14, color: '#e0e0e0', weight: 'bold' },
  body:     { size: 13, color: '#cccccc', weight: 'normal' },
  caption:  { size: 11, color: '#aaaaaa', weight: 'normal' },
  badge:    { size: 11, color: '#ffffff', weight: 'bold' },
} as const

export const MIN_FONT_SIZE = 11  // 全局下限，替代当前 9-10px

export const SPACING = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24
} as const

export const TOOLTIP = {
  maxWidth: 340,     // 从 260px 扩大
  padding: 12,       // 从 8px 增加
  lineHeight: 1.5,   // 改善行间距
  borderRadius: 8,
} as const
```

**验收标准：**
- AC1: `ui/theme.ts` 导出 `TEXT_LEVEL`、`MIN_FONT_SIZE`、`SPACING`、`TOOLTIP` 常量
- AC2: KeyTooltip 中所有字号/颜色引用 Token，无硬编码字号低于 `MIN_FONT_SIZE`
- AC3: `style.css` 商品卡片描述字号从 10px 提升至 `TEXT_LEVEL.body.size`(13px)，颜色从 #888 提升至 #cccccc
- AC4: `style.css` 类型徽章字号从 9px 提升至 `TEXT_LEVEL.badge.size`(11px)
- AC5: CollectionItem 描述字号从 11px 提升至 13px
- AC6: Tooltip maxWidth 从 260px 扩至 340px，padding 从 8px 增至 12px
- AC7: 所有已迁移组件视觉回归正常——无截断、无溢出、布局不崩

**估点：** 5

---

### Story 39.2: Tooltip 信息架构重构

**复杂度: High**
**依赖: 39.1**

重构 `KeyTooltip.ts`，将当前平铺的信息列表改为分区块的卡片式布局，提升信息层级和扫描效率。

**现状：** KeyTooltip 将字母信息、技能名、词条参数、附魔列表、预估产出全部以 10-11px 文字平铺在一个 260px 窄列中，无视觉分区。

**目标布局：**

```
┌──────────────────────────────────────┐
│ 🔥 强化·虚无·基数          Lv.2  黄 │  ← 标题区（subtitle 级）
├──────────────────────────────────────┤
│ ⚡ 强化   ×1.65                      │  ← 词条区（每词条一行）
│   "技能产出直接乘以倍率"             │    名称用词条专属色 + body 级
│ 🌑 虚无   相邻空位 +10%/格          │    描述用 caption 级
│   "范围内空位越多加成越高"           │
├──────────────────────────────────────┤
│ 📖 学徒·自修  +1%/触发 (累计 12%)   │  ← 附魔区（可选）
├──────────────────────────────────────┤
│ 预估产出: ~24.5                      │  ← 摘要区（高亮数值）
│   强化 ×1.65 | 虚无 +30% | 学徒 +12%│    明细用 caption 级
└──────────────────────────────────────┘
```

**范围：**
- 重构 `KeyTooltip.ts` 的 `show()` / `updateContent()` 方法
- 用 `<div>` 分区块（header / affixes / enchantments / estimate），各区用 1px 分隔线
- 词条名使用 `AFFIX_COLORS` 已有色表 + `TEXT_LEVEL.body` 字号
- 词条描述使用 `TEXT_LEVEL.caption` + 灰色
- 标题区显示技能名 + 等级 + 稀有度色条
- 摘要区数值用高亮色（#ffe66d），明细用 caption 级
- 无技能时（空键位）仅显示字母信息 + 频率，不显示空白分区

**验收标准：**
- AC1: Tooltip 分 4 个视觉区块（标题/词条/附魔/摘要），区块间有 1px 分隔线
- AC2: 词条名使用 `AFFIX_COLORS` 对应颜色，描述使用 caption 级灰色
- AC3: 标题区显示完整技能名、等级（Lv.1/2/3）、稀有度色条（白/蓝/黄/橙）
- AC4: 附魔区仅在有附魔时显示；显示图标+名称+效果+累计进度（如学徒累计%、任务层数）
- AC5: 摘要区数值使用 #ffe66d 高亮，明细分项以 `|` 分隔
- AC6: 空键位 Tooltip 仅显示字母 + 分数 + 频率，无多余空白区
- AC7: Tooltip 在 1920×1080 和 1366×768 分辨率下不溢出视口

**估点：** 8

---

### Story 39.3: TutorialManager 引导系统基础设施

**复杂度: High**
**依赖: 39.1**

建立通用的引导系统管理器，从 `demo-tutorial.ts` 提取核心逻辑，支持事件驱动触发、进度持久化和分层引导。

**现状：** `demo-tutorial.ts` 直接操作 DOM 创建浮窗，步骤硬编码，仅在 `IS_DEMO` 时激活，无持久化。

**范围：**
- 新建 `systems/tutorial/TutorialManager.ts` — 引导系统核心
- 新建 `systems/tutorial/TutorialOverlay.ts` — 引导浮窗 UI 组件
- 新建 `data/tutorialSteps.ts` — 引导步骤数据定义
- 迁移 `demo-tutorial.ts` 的 3 个步骤到新系统（保持 Demo 行为不变）
- 在 MetaState 中新增 `tutorialProgress: Set<string>` 字段，持久化已完成步骤
- 支持 i18n（引导文本走 `t()` 函数）

**TutorialManager 接口：**

```typescript
interface TutorialStep {
  id: string                          // 唯一标识，如 'L0_type_to_trigger'
  level: 0 | 1 | 2 | 3 | 4 | 5      // 引导层级
  trigger: {
    event: string                     // EventBus 事件名
    condition?: (state: GameState) => boolean  // 可选额外条件
    delay?: number                    // 事件后延迟 ms
  }
  content: {
    titleKey: string                  // i18n key
    bodyKey: string                   // i18n key
    anchorElement?: string            // DOM 元素 ID/选择器（浮窗定位）
    anchorPosition?: 'top' | 'bottom' | 'left' | 'right'
    highlight?: string               // 高亮区域选择器
  }
  dismissAfter?: number              // 自动消失时间 ms（默认 6000）
  prerequisite?: string              // 前置步骤 ID
}

class TutorialManager {
  register(steps: TutorialStep[]): void
  start(): void                       // 绑定所有事件监听
  stop(): void                        // 解绑所有事件
  isCompleted(stepId: string): boolean
  markCompleted(stepId: string): void  // 持久化到 MetaState
  resetAll(): void                    // 设置页重置引导
  setEnabled(enabled: boolean): void  // 全局开关
}
```

**TutorialOverlay 规格：**
- 固定定位浮窗（`position: fixed`），z-index 高于游戏 UI
- 支持锚定到指定 DOM 元素（箭头指向）
- 可选背景遮罩（半透明黑 + 高亮孔）突出教学区域
- "知道了" 按钮 + "不再提示" 复选框
- 进入/退出动画（fadeIn 300ms）

**验收标准：**
- AC1: `TutorialManager` 支持 `register`、`start`、`stop`、`isCompleted`、`markCompleted`、`resetAll`、`setEnabled` 方法
- AC2: 注册步骤后，对应 EventBus 事件触发时自动检查前置条件并显示浮窗
- AC3: 已完成步骤（MetaState 中记录）不重复显示
- AC4: `TutorialOverlay` 支持锚定定位（4 方向）+ 箭头指向
- AC5: "不再提示"标记后该步骤永久跳过（MetaState 持久化）
- AC6: Demo 模式下的原有 3 步教程迁移至新系统，行为与原来一致
- AC7: `setEnabled(false)` 后所有引导不触发（用于设置页全局开关）
- AC8: i18n 支持：所有引导文本通过 `t()` 函数获取，中英双语

**估点：** 8

---

### Story 39.4: L0-L1 基础引导内容（打字基础 + 经济系统）

**复杂度: Medium**
**依赖: 39.3**

实现第一批引导内容，覆盖新玩家从开始 Run 到第一次进商店的完整流程。

**L0 打字基础引导（第一场战斗中触发）：**

| 步骤 ID | 触发事件 | 延迟 | 内容概要 | 锚定 |
|---------|---------|------|---------|------|
| `L0_welcome` | `battle:start`（首次 Run） | 1s | "输入单词来触发技能！每个字母对应一个绑定的技能" | 单词显示区 |
| `L0_skill_triggered` | `skill:triggered`（首次） | 0 | "技能触发了！它产出了资源，资源累计在单词结算时转化为分数" | 键盘可视化区 |
| `L0_word_complete` | `word:complete`（首词） | 0 | "单词完成！得分 = 基数 × 倍率。连续正确输入提升倍率" | 分数显示区 |
| `L0_combo` | combo 达到 5 | 0 | "连击 ×5！保持连击不中断，倍率越来越高" | Combo 显示区 |

**L1 经济系统引导（第一次进商店时触发）：**

| 步骤 ID | 触发事件 | 延迟 | 内容概要 | 锚定 |
|---------|---------|------|---------|------|
| `L1_shop_intro` | `shop:opened`（首次） | 0.5s | "欢迎来到商店！用金币购买新技能，拖拽到键位上装备" | 商品区 |
| `L1_skill_bind` | 首次购买技能 | 0 | "拖拽技能到键盘上绑定，或点击键位直接装备" | 键盘绑定区 |
| `L1_upgrade` | 首次看到可升级技能 | 0 | "已有技能再次出现时可升级（Lv.1→2→3），升级提升基础产出" | 可升级商品 |
| `L1_relic` | 首次获得遗物 | 0 | "遗物提供被动效果，持续整个 Run！注意稀有度不同效果差异巨大" | 遗物卡片 |

**范围：**
- 在 `data/tutorialSteps.ts` 中定义 L0（4 步）+ L1（4 步）共 8 个引导步骤
- 在 `demo-i18n.ts` 中新增所有引导文本的 i18n 条目（中英双语）
- L0 步骤的 `prerequisite` 链：welcome → skill_triggered → word_complete → combo
- L1 步骤互相独立（各自由不同事件触发）
- combo 达到 5 的触发需监听 `input:keypress` 事件并检查 combo 值

**验收标准：**
- AC1: 新 Run 首场战斗中，L0 四步按顺序触发，内容准确锚定对应 UI 元素
- AC2: 首次进商店时，L1_shop_intro 触发并锚定商品区
- AC3: 首次购买/升级/获得遗物时对应步骤各自独立触发
- AC4: 所有步骤在已完成后不再重复（MetaState 持久化验证）
- AC5: Demo 模式下原有 3 步教程由新系统正确替代，行为不变
- AC6: 中英双语文本完整，切换语言后引导文本正确更新
- AC7: 引导浮窗不遮挡关键操作区（如单词输入区、计时器）

**估点：** 5

---

### Story 39.5: L2-L3 进阶引导内容（词条系统 + 附魔系统）

**复杂度: Medium**
**依赖: 39.4**

实现进阶引导内容，在玩家首次接触词条机制和附魔系统时提供针对性说明。

**L2 词条系统引导：**

| 步骤 ID | 触发事件 | 内容概要 | 特殊行为 |
|---------|---------|---------|---------|
| `L2_affix_intro` | 首次获得蓝色（1 词条）技能 | "这个技能带有词条！词条赋予技能额外能力，稀有度越高词条越多" | 高亮技能卡片的词条区域 |
| `L2_affix_positional` | 首次获得拓扑型词条（虚无/共鸣/连接/复制/增幅/流放/引力） | "这个词条的效果取决于键盘上的位置关系！留意技能在键盘上的排列" | 高亮键盘区 + 指向 Tooltip |
| `L2_affix_variety` | 首次获得黄色（2 词条）技能 | "多词条技能效果叠加！尝试搭配不同词条类型，寻找强力组合" | 无 |
| `L2_rarity_explain` | 首次在商店看到橙色（3 词条）技能 | "传说技能！三词条组合，C(20,3)=1140 种可能——构筑的核心选择" | 高亮橙色技能卡片 |

**L3 附魔系统引导：**

| 步骤 ID | 触发事件 | 内容概要 | 特殊行为 |
|---------|---------|---------|---------|
| `L3_enchant_unlock` | 首次技能达到附魔资格（Lv.3） | "技能满级了！可以在商店为它选择附魔，附魔效果跨关卡持续成长" | 指向附魔入口 |
| `L3_enchant_choose` | 首次进入附魔选择界面 | "选择一个附魔：学徒型随使用成长，任务型完成目标获得永久加成" | 高亮附魔选项 |
| `L3_enchant_growth` | 首次附魔产生成长效果 | "附魔在成长！每次触发都在积累，这个加成会跨关卡保留" | 指向 Tooltip 附魔进度 |

**范围：**
- 在 `data/tutorialSteps.ts` 中新增 L2（4 步）+ L3（3 步）共 7 个引导步骤
- 在 `demo-i18n.ts` 中新增 i18n 条目
- L2_affix_intro 的触发需检查购买/获得的技能稀有度 ≥ 蓝色
- L2_affix_positional 的触发需检查词条类型是否属于拓扑型词条集合
- L3_enchant_unlock 的触发需监听技能升级事件并检查是否达到 Lv.3
- L3_enchant_growth 的触发需监听附魔成长事件（可挂载 `skill:triggered` 后检查）

**验收标准：**
- AC1: 首次获得带词条技能时 L2_affix_intro 触发，正确高亮技能卡片
- AC2: 拓扑型词条首次出现时 L2_affix_positional 触发，提示注意键盘位置
- AC3: 首次技能达到附魔资格时 L3_enchant_unlock 触发
- AC4: 首次附魔成长效果生效时 L3_enchant_growth 触发，指向 Tooltip 中的进度显示
- AC5: 所有 7 个步骤有 i18n 中英双语文本
- AC6: 各步骤独立触发互不干扰，不会因同一事件同时弹出多个引导
- AC7: 引导出现时不影响商店操作（购买、拖拽等交互仍可响应）

**估点：** 5

---

### Story 39.6: L4-L5 高阶引导 + 帮助系统

**复杂度: High**
**依赖: 39.4**

实现高阶引导（精英/Boss 关、职业系统）和常驻帮助系统（术语表 + 帮助按钮）。

**L4 精英/Boss 引导：**

| 步骤 ID | 触发事件 | 内容概要 |
|---------|---------|---------|
| `L4_elite_intro` | 首次进入精英关 | "精英关！时间更长，但有修饰器改变规则。注意屏幕上方的修饰器图标" |
| `L4_boss_intro` | 首次进入 Boss 关 | "Boss 战！多个修饰器同时生效，这是本周目的最终考验" |
| `L4_modifier_explain` | 首次遭遇修饰器效果 | "修饰器正在影响你！{modifier_name}：{modifier_desc}。休息关可以提前查看下一关的修饰器" |

**L5 职业系统引导：**

| 步骤 ID | 触发事件 | 内容概要 |
|---------|---------|---------|
| `L5_class_unlock` | 解锁职业系统 | "职业解锁了！每个职业有独特资源和专属机制，但也会失去一种通用能力" |
| `L5_class_resource` | 首次职业 Run 产出职业资源 | "职业专属资源！{class_name}的{resource_name}可以用在特殊机制中" |

**帮助系统：**

- **术语表面板**（`ui/HelpPanel.ts`）：
  - 商店/战斗界面右上角"?"按钮触发
  - 内容分类：词条（20）、附魔类别（5）、位置关系（6）、资源（7）、修饰器、稀有度
  - 每条包含：名称 + 图标 + 简短描述（复用 i18n 系统 `affix_desc.*`、`ench_meta.*`、`rel.*` 已有条目）
  - 支持搜索过滤
  - 可从 Tooltip 中的术语跳转打开（点击词条名 → 打开帮助面板并定位）

- **设置页引导控制**：
  - 在设置中新增"引导提示"开关（调用 `TutorialManager.setEnabled()`）
  - 新增"重置所有引导"按钮（调用 `TutorialManager.resetAll()`）

**范围：**
- 在 `data/tutorialSteps.ts` 中新增 L4（3 步）+ L5（2 步）共 5 个引导步骤
- 新建 `ui/HelpPanel.ts` — 术语表面板组件
- 在 `demo-i18n.ts` 中新增 L4/L5 引导文本 + 帮助面板 UI 文本
- 商店界面和战斗界面各添加一个"?"按钮入口
- 设置页面新增引导控制区域（开关 + 重置按钮）
- L4_modifier_explain 需要动态插入修饰器名称和描述（使用 i18n 模板参数）

**术语表数据结构：**

```typescript
interface GlossaryEntry {
  category: 'affix' | 'enchantment' | 'position' | 'resource' | 'modifier' | 'rarity'
  id: string           // 对应 i18n key
  icon: string
  nameKey: string      // i18n key for name
  descKey: string      // i18n key for description
}
```

**验收标准：**
- AC1: 首次精英关/Boss 关各触发对应引导，内容准确
- AC2: L4_modifier_explain 动态插入当前修饰器名称和描述
- AC3: 职业解锁和首次职业资源产出各触发对应引导
- AC4: 商店和战斗界面右上角显示"?"按钮，点击打开术语表面板
- AC5: 术语表按类别分组显示，支持搜索过滤，内容来源于已有 i18n 条目
- AC6: 设置页"引导提示"开关可控制全局引导显隐
- AC7: 设置页"重置所有引导"按钮可清除所有已完成标记
- AC8: 术语表面板在 1366×768 分辨率下不超出屏幕

**估点：** 8

---

## 总估点

| Story | 名称 | 估点 |
|-------|------|------|
| 39.1 | Design Token 统一与全局字号/对比度提升 | 5 |
| 39.2 | Tooltip 信息架构重构 | 8 |
| 39.3 | TutorialManager 引导系统基础设施 | 8 |
| 39.4 | L0-L1 基础引导内容 | 5 |
| 39.5 | L2-L3 进阶引导内容 | 5 |
| 39.6 | L4-L5 高阶引导 + 帮助系统 | 8 |
| **合计** | | **39** |

## 依赖图

```
Story 39.1 (Design Token)
    ↓
┌───────────┬───────────┐
39.2        39.3        │
(Tooltip)   (TutorialMgr)│
            ↓            │
        ┌───┴───┐        │
       39.4    39.5       │
       (L0-L1) (L2-L3)   │
        │       │         │
        └───┬───┘         │
            ↓             │
          39.6 ←──────────┘
       (L4-L5 + Help)
```

## 实现建议

1. **39.1 先行**：Design Token 是所有视觉改动的基础，且改动风险低、见效快
2. **39.2 和 39.3 可并行**：Tooltip 重构和 TutorialManager 互不依赖，都只依赖 39.1
3. **39.4 优先于 39.5**：L0-L1 覆盖首次体验，比进阶引导更紧迫
4. **39.6 最后**：帮助系统是锦上添花，依赖前面所有 Story 的 i18n 积累
5. **复用 demo-tutorial.ts 逻辑**：39.3 实现后，demo-tutorial 应改为调用 TutorialManager 而非独立实现，旧文件可标记 deprecated
6. **渐进上线**：每个 Story 独立可交付，39.1 上线后立即改善可读性体验
