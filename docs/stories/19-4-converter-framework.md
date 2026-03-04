---
title: "Story 19.4: 转化者框架与数据（40 个）"
epic: "Epic 19: 技能体系重构"
story_key: "19-4-converter-framework"
status: "backlog"
created: "2026-03-03"
depends_on: ["19-1-resource-system-core", "19-2-producer-skills"]
---

# Story 19.4: 转化者框架与数据（40 个）

## Story

作为一个 **玩家**，
我想要 **按键触发转化者技能，读取一种资源的当前值并转化为另一种资源**，
以便 **通过资源互转构建丰富的 build 策略，产出者+转化者的组合创造多样玩法**。

## Acceptance Criteria

- [ ] AC1: `ConverterSkill` 接口定义完成：source, target, formula(add/multiply), k 系数, Lv 成长
- [ ] AC2: 40 个转化者数据定义完成，覆盖 5×5 资源组合中的 20 种（×2 公式 = 40）
- [ ] AC3: 加法转化公式正确：`target += source_value × k`
- [ ] AC4: 乘法转化公式正确：`target *= (1 + source_value × k)`
- [ ] AC5: 转化者**不消耗**源资源，仅读取当前值
- [ ] AC6: Lv 成长：Lv1 = k×1.0, Lv2 = k×1.5, Lv3 = k×2.0
- [ ] AC7: 每局 run 从 40 个转化者中随机抽 20 个进入技能池
- [ ] AC8: "分数为源"的转化者读取本关累计得分（`resources.score + resources.base × resources.multiplier`）
- [ ] AC9: 转化者触发时有视觉反馈：显示源→目标资源的转化浮字
- [ ] AC10: 单元测试覆盖每种公式、边界值、资源不为负

## Tasks / Subtasks

- [ ] Task 1: 转化者接口与数据 (AC: 1, 2)
  - [ ] 1.1 定义 `ConverterSkill` 接口（id, name, emoji, source, target, formula, k, kLv2, kLv3）
  - [ ] 1.2 定义 40 个转化者数据，含 k 系数表

- [ ] Task 2: 转化计算引擎 (AC: 3, 4, 5, 8)
  - [ ] 2.1 实现 `executeConverter(skill, state)` 核心函数
  - [ ] 2.2 加法公式：读源值 × k，加到目标资源
  - [ ] 2.3 乘法公式：读源值 × k，乘到目标资源
  - [ ] 2.4 "分数为源"特殊处理：计算本关累计总分作为源值
  - [ ] 2.5 确保不消耗源资源

- [ ] Task 3: 技能等级 (AC: 6)
  - [ ] 3.1 根据 skill.level 选择对应 k 值（1.0 / 1.5 / 2.0 倍率）

- [ ] Task 4: 技能池 (AC: 7)
  - [ ] 4.1 Run 开始时随机抽 20 个转化者进入本局池
  - [ ] 4.2 商店按 Act 权重展示（Act1: 20%, Act2: 50%, Act3: 40%）

- [ ] Task 5: 触发集成 (AC: 9)
  - [ ] 5.1 按键触发时，若绑定技能为转化者，调用 executeConverter
  - [ ] 5.2 显示转化浮字（如 "⚔️→🔥 +0.3"）

- [ ] Task 6: 测试 (AC: 10)
  - [ ] 6.1 加法/乘法公式正确性
  - [ ] 6.2 不消耗源资源
  - [ ] 6.3 Lv 成长系数正确
  - [ ] 6.4 "分数为源"读值正确
  - [ ] 6.5 资源不为负边界

## Dev Notes

### k 系数设计原则

- 产出者 mid-game 单次触发产出约 15-20 资源
- 转化者 mid-game 单次触发产出约 50-70% 等价值
- 分数为源的 k 值极小（mid ~1000 分，避免 runaway）

### 40 个转化者分类

- 基数→X: 4 个（加法+乘法 × 分数/倍率/时间/护盾）
- 分数→X: 4 个
- 倍率→X: 4 个
- 时间→X: 4 个
- 护盾→X: 4 个
- 共 20 种组合 × 2 公式类型 = 40 个

### 设计文档参考

`docs/brainstorming-session-2026-03-03.md` — 转化者系数表 / 分数为源定义
