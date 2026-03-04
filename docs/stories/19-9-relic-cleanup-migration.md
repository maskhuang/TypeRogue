---
title: "Story 19.9: 遗物清理与数据迁移"
epic: "Epic 19: 技能体系重构"
story_key: "19-9-relic-cleanup-migration"
status: "backlog"
created: "2026-03-03"
depends_on: ["19-1-resource-system-core"]
---

# Story 19.9: 遗物清理与数据迁移

## Story

作为一个 **开发者**，
我想要 **删除不兼容的遗物、修改冲突 emoji、更新遗物效果适配新资源类型**，
以便 **14 个保留遗物在新技能体系下正确工作，无数据残留或引用错误**。

## Acceptance Criteria

- [ ] AC1: 删除 4 个不兼容遗物：chain_amplifier, fortress, passive_mastery, gamblers_creed
- [ ] AC2: void_heart emoji 从 🕳️ 改为 🌑（避免与排斥型附魔冲突）
- [ ] AC3: 14 个保留遗物效果更新适配新资源类型：
  - rhyme_master: "底分 +5" → "基数 +5"
  - glass_cannon: "倍率 +0.5" → `resources.multiplier += 0.5`
  - time_thief / time_lord: 适配 `resources.time`
  - 其他遗物确认与新系统兼容
- [ ] AC4: 遗物触发事件正确映射到新资源管道
- [ ] AC5: 删除遗物的代码引用全部清理（RELICS 数据、shop 逻辑、UI 引用）
- [ ] AC6: 现有存档兼容性：加载旧存档时自动移除已删除遗物
- [ ] AC7: 所有遗物相关测试更新通过

## Tasks / Subtasks

- [ ] Task 1: 删除不兼容遗物 (AC: 1, 5)
  - [ ] 1.1 从 `data/relics.ts` 移除 4 个遗物定义
  - [ ] 1.2 清理 shop.ts 中的引用
  - [ ] 1.3 清理 battle.ts 中的效果触发
  - [ ] 1.4 移除相关测试用例

- [ ] Task 2: Emoji 修改 (AC: 2)
  - [ ] 2.1 void_heart icon 从 🕳️ 改为 🌑
  - [ ] 2.2 更新所有引用该 emoji 的地方

- [ ] Task 3: 遗物效果适配 (AC: 3, 4)
  - [ ] 3.1 逐个审查 14 个遗物效果，映射到新资源字段
  - [ ] 3.2 rhyme_master → resources.base += 5
  - [ ] 3.3 glass_cannon → resources.multiplier += 0.5
  - [ ] 3.4 time_thief / time_lord → resources.time 操作
  - [ ] 3.5 其他遗物确认无需修改

- [ ] Task 4: 存档兼容 (AC: 6)
  - [ ] 4.1 加载存档时过滤已删除遗物 ID
  - [ ] 4.2 迁移脚本/逻辑处理 resources 字段缺失的旧存档

- [ ] Task 5: 测试 (AC: 7)
  - [ ] 5.1 删除遗物不再出现在任何池中
  - [ ] 5.2 保留遗物效果正确触发新资源
  - [ ] 5.3 旧存档加载兼容性
  - [ ] 5.4 emoji 无冲突校验

## Dev Notes

### 删除遗物清单

| ID | 名字 | 删除原因 |
|---|---|---|
| chain_amplifier | 连锁放大器 | 引用旧 echo/ripple 机制 |
| fortress | 铁壁 | 引用旧哨兵技能 |
| passive_mastery | 被动大师 | "被动技能"概念已重构 |
| gamblers_creed | 赌徒信条 | 引用旧豪赌技能 |

### 保留遗物（14 个）

lucky_coin, time_crystal, phoenix_feather, overkill_blade, rhyme_master, void_heart(🌑), keyboard_storm, glass_cannon, time_thief, greedy_hand, silence_vow, doomsday, golden_keyboard, time_lord, perfectionist

### 设计文档参考

`docs/brainstorming-session-2026-03-03.md` — 遗物适配（新技能体系）
