---
title: "Story 19.4: 转化者框架与数据（40 个）"
epic: "Epic 19: 技能体系重构"
story_key: "19-4-converter-framework"
status: "done"
created: "2026-03-03"
updated: "2026-03-04"
depends_on: ["19-1-resource-system-core", "19-2-producer-skills"]
---

# Story 19.4: 转化者框架与数据（40 个）

## Story

作为一个 **玩家**，
我想要 **按键触发转化者技能，读取一种资源的当前值并转化为另一种资源**，
以便 **通过资源互转构建丰富的 build 策略，产出者+转化者的组合创造多样玩法**。

## 背景与上下文

转化者是三大技能类型之一（产出者→转化者→连接者），负责"资源搭桥"。与产出者（直接产出固定值）不同，转化者读取源资源的**当前值**，乘以 k 系数后产出到目标资源，**不消耗源资源**。这使得转化者的产出随源资源积累而增长，鼓励玩家构建"先积累、再转化"的策略链。

### 依赖关系

- **Story 19.1** (资源系统): `ResourceType`, `ResourceState`, `state.resources` 代理
- **Story 19.2** (产出者技能): `ProducerDefinition` 接口模式, `triggerProducer()` 模板, `PRODUCERS` 数据结构

### 设计文档

- `docs/brainstorming-session-2026-03-03.md` — 完整 k 系数表与公式定义

## Acceptance Criteria

- [x] AC1: `ConverterDefinition` 接口定义完成（id, name, icon, source, target, formula, k）
- [x] AC2: 40 个转化者数据定义完成，覆盖 5 源 × 4 目标 × 2 运算 = 40 个
- [x] AC3: 加法转化公式正确：`target += source_value × k`（source 为当前值，不消耗）
- [x] AC4: 乘法转化公式正确：`target *= (1 + source_value × k)`（source 为当前值，不消耗）
- [x] AC5: 转化者**不消耗**源资源，仅读取当前值
- [x] AC6: Lv 成长：k 系数随等级倍增 — Lv1 = k×1.0, Lv2 = k×1.5, Lv3 = k×2.0
- [x] AC7: 每局 run 从 40 个转化者中随机抽 20 个进入 `state.converterPool`
- [x] AC8: "分数为源"的转化者读取本关累计得分（`state.resources.score + state.resources.base × state.resources.multiplier`）
- [x] AC9: `triggerConverter()` 实现，含浮字反馈（显示源→目标转化效果）
- [x] AC10: `triggerSkill()` 分流集成 — 识别 converter ID 后调用 `triggerConverter()`
- [x] AC11: 时间/护盾 clamp 逻辑与产出者一致
- [x] AC12: 单元测试覆盖每种公式、边界值、Lv 成长、分数为源特殊逻辑
- [x] AC13: `isConverter()` 和 `getConverterDesc()` 工具函数可用

## Tasks / Subtasks

### Task 1: ConverterDefinition 类型 (AC: 1)

- [x] 1.1 在 `src/core/types.ts` 新增 `ConverterFormula = 'add' | 'multiply'` 类型
- [x] 1.2 新增 `ConverterDefinition` 接口

### Task 2: 40 个转化者数据 (AC: 2)

- [x] 2.1 创建 `src/data/converters.ts`，定义 `CONVERTERS: Record<string, ConverterDefinition>`
- [x] 2.2 基数为源（8 个）
- [x] 2.3 分数为源（8 个）
- [x] 2.4 倍率为源（8 个）
- [x] 2.5 时间为源（8 个）
- [x] 2.6 护盾为源（8 个）

### Task 3: 转化计算引擎 (AC: 3, 4, 5, 6, 8, 9, 11)

- [x] 3.1 在 `src/data/converters.ts` 实现 `getConverterK(id, level)` — 返回 k × [1.0, 1.5, 2.0][level-1]
- [x] 3.2 实现 `getSourceValue(source, resources)` — 读取源资源当前值（score 特殊处理）
- [x] 3.3 在 `src/systems/skills.ts` 实现 `triggerConverter(converterId)` — 完整转化逻辑 + clamp + 浮字

### Task 4: triggerSkill 集成 (AC: 10)

- [x] 4.1 在 `triggerSkill()` 中添加转化者分流（产出者分流之后，Modifier 管道之前）

### Task 5: 技能池管理 (AC: 7)

- [x] 5.1 在 `src/core/types.ts` 的 GameState 中添加 `converterPool: string[]`
- [x] 5.2 在 `src/core/state.ts` 初始化 `converterPool: []`
- [x] 5.3 在 `main.ts` init 中调用 `drawConverterPool()` 填充 `state.converterPool`
- [x] 5.4 商店生成 `generateShopItems()` 中将 converterPool 技能加入技能池

### Task 6: 工具函数 (AC: 13)

- [x] 6.1 `isConverter(id)` — 检查 ID 是否在 CONVERTERS 中
- [x] 6.2 `getConverterDesc(id, level)` — 生成等级相关描述

### Task 7: 单元测试 (AC: 12)

- [x] 7.1 `tests/unit/data/converters.test.ts` — 36 测试（数据完整性 + 工具函数 + 池抽取）
- [x] 7.2 `tests/unit/systems/converter-trigger.test.ts` — 23 测试（公式 + 不消耗 + Lv成长 + 分数为源 + clamp + 分流 + 边界）

## File List

- `src/src/core/types.ts` — 新增 ConverterFormula, ConverterDefinition, converterPool 字段
- `src/src/core/state.ts` — 初始化 converterPool: []
- `src/src/data/converters.ts` — **新文件** — 40 个转化者数据 + 工具函数
- `src/src/systems/skills.ts` — 新增 triggerConverter(), triggerSkill 分流, import CONVERTERS
- `src/src/systems/shop.ts` — import CONVERTERS, 技能池包含 converterPool
- `src/src/systems/battle.ts` — import CONVERTERS, renderBoundSkills 识别转化者
- `src/src/data/skills.ts` — getSkillDisplayInfo 支持转化者, getSkillSchool 转化者流派
- `src/src/main.ts` — import drawConverterPool, 初始化 converterPool
- `src/tests/unit/data/converters.test.ts` — **新文件** — 36 个测试
- `src/tests/unit/systems/converter-trigger.test.ts` — **新文件** — 23 个测试

## Change Log

- 2026-03-04: 实现转化者框架 — 40 个转化者数据 + triggerConverter + 商店/显示集成 + 59 测试

## Dev Agent Record

### Implementation Plan

遵循产出者 (Story 19.2) 的实现模式：
1. types.ts 新增接口 → 2. converters.ts 数据+工具函数 → 3. skills.ts triggerConverter + 分流 → 4. 商店/UI 集成 → 5. 测试

### Completion Notes

- ConverterDefinition 接口: id/name/icon/source/target/formula/k/desc
- 40 个转化者完整定义，k 系数严格对齐 brainstorming 文档
- triggerConverter 实现与 triggerProducer 同级，bypass Modifier pipeline
- 加法: target += sourceVal × k; 乘法: target *= (1 + sourceVal × k)
- 分数为源特殊: sourceVal = score + base × multiplier
- 时间 clamp (timeMax×2) + 护盾 floor 与产出者一致
- drawConverterPool Fisher-Yates shuffle 抽 20/40
- 商店集成: converterPool 中的技能进入 allSkillIds
- getSkillDisplayInfo + getSkillSchool 支持转化者显示
- 59 新测试全部通过，21 个预存失败（lone/void/evolution）无关

## Dev Notes

### k 系数设计原则

- 产出者 mid-game 单次触发产出约 15-20 等价分数
- 转化者 mid-game 单次触发产出约 50-70% 等价值（转化者略弱于产出者，但随资源增长而增强）
- **分数为源的 k 值极小**：mid ~1000 分 × 小 k，避免 runaway

### 参考中期值

| 资源 | mid-game 典型值 |
|---|---|
| 基数 (base) | ~15 |
| 分数 (score) | ~1000 |
| 倍率 (multiplier) | ~2.0 |
| 时间 (time) | ~40s |
| 护盾 (shield) | ~3 |

### 注意事项

- 转化者 Lv 成长与产出者不同：产出者有 3 个预设值 `values[0..2]`，转化者只有一个基础 k，乘以 [1.0, 1.5, 2.0]
- score 的 clamp：score 无上限，但 add 时需要同步 `state.score += delta`
- 预期有 21 个预存失败测试（lone/void/evolution 相关），与本 story 无关
