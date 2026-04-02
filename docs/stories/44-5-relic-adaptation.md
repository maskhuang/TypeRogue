# Story 44.5: 遗物适配 + 存档迁移

## Status: done

## Story

作为造词师玩家，我的现有遗物应适配新流水线机制，旧存档应能平滑迁移到新系统。

## 验收标准 (AC)

### AC1: 大师词典适配
- 旧效果："全碎片+2，采集队列+2格"
- 新效果："全碎片+2，流水线能量需求-20%"
- 实现：`ENERGY_PER_SLOT` 读取时检查遗物，应用 0.8 倍修正
- 更新 relics.ts 描述文案

### AC2: 永动队列适配
- 旧效果："每关自动采集一轮"
- 新效果："每关开始时流水线自动推进 N 个槽位"
- 实现：startLevel 时调用 `advancePipeline(autoEnergy)`
- N = ENERGY_PER_SLOT × 2（推进 2 个槽位的能量）
- 更新 relics.ts 描述文案

### AC3: 共鸣字模适配
- 旧效果："造词重复字母免金币"
- 新效果："流水线中重复字母槽位能量需求-50%"
- 实现：advancePipeline 内检查当前槽位字母是否在词中重复出现，若是则 energyPerSlot × 0.5
- 更新 relics.ts 描述文案

### AC4: 不变遗物确认
- 学徒笔记（开局元音碎片×3）：不变，碎片系统保留
- 拆词剪刀（拆解返还碎片）：不变，deconstructWord 逻辑保留
- 词库丰收（词库每5词词包-1金）：不变

### AC5: 存档兼容
- 旧存档无 `assemblyPipeline` 字段 → 初始化为 null
- 旧存档的 `fragmentQueue` / `fragmentQueuePosition` → 保留（碎片库存不受影响）
- 旧存档的 `fragment` 资源类型 → 自动映射为 `energy`（已在 Epic 43 完成）

### AC6: 遗物描述更新
- 更新 relics.ts 中大师词典、永动队列、共鸣字模的 description 字段
- 更新 demo-i18n.ts 中对应英文描述

## 技术说明

### 涉及文件
- `src/src/data/relics.ts` — 描述更新
- `src/src/systems/classes/AssemblyPipeline.ts` — 遗物修正逻辑（getEffectiveEnergyPerSlot）
- `src/src/systems/battle.ts` — 永动队列：startLevel 自动推进
- `src/src/data/affixTrigger.ts` — 存档反序列化兼容
- `src/src/demo/demo-i18n.ts` — 英文描述

### 依赖
- Story 44.1 ~ 44.4 全部完成
