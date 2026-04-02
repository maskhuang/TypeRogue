# Story 44.3: 造词台流水线 UI

## Status: done

## Story

作为造词师玩家，我需要在商店阶段的造词台看到流水线进度、碎片库存，并能选择下一个要组装的词。

## 验收标准 (AC)

### AC1: 碎片库存展示
- 显示 A-Z 碎片数量（沿用现有 renderFragmentInventory 布局）
- 数量为 0 的字母灰显
- 有碎片的字母高亮可点击

### AC2: 流水线可视化
- 当前组装中的词显示为槽位序列：`[a ██][p ██][p ░░][l ░░][e ░░]`
- 每个槽位显示字母 + 进度条（0~100%）
- 已完成槽位标记 ✓
- 当前推进槽位高亮
- 无流水线时显示"无组装中的词语"

### AC3: 开始组装交互
- "开始新词"按钮打开词语输入界面
- 玩家逐字母选择（从碎片库存中扣除）
- 实时显示拼写中的词 + 剩余碎片
- 确认后创建流水线（调用 createPipeline）
- 碎片不足时字母按钮禁用

### AC4: 可拼词自动检测
- 根据当前碎片库存，从词库候选中筛选可拼出的词
- 显示"可拼词"列表供快速选择
- 列表按词长排序（短词优先，组装快）

### AC5: 拆解功能
- 拆词剪刀遗物激活时显示"拆解"按钮
- 选择已造词 → 返还碎片 → 从 wordDeck/craftedWords 移除
- 沿用现有 deconstructWord 逻辑

## 技术说明

### 涉及文件
- `src/src/systems/classes/CraftingStation.ts` — 重写 UI（流水线可视化 + 开始组装 + 可拼词列表）
- `src/src/systems/classes/AssemblyPipeline.ts` — createPipeline 调用
- `src/src/systems/shop.ts` — 造词台 tab 集成

### 依赖
- Story 44.1（数据层 + createPipeline）
- Story 44.2（碎片来源确认）
