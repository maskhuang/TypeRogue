---
title: 'Narrative Design Document'
project: '打字肉鸽'
date: '2026-05-02'
author: 'Yuchenghuang'
version: '4.0'
stepsCompleted: [1]
status: 'in-progress'
narrativeComplexity: 'Heavy (rule-horror density)'
narrativeMode: 'heavy'
gdd: 'docs/gdd.md'
previousVersion: 'v3.1 (2026-04-30) backed up to docs/narrative-design.v3.1.backup.md — 灵长类辅助文书部 / SCP 收容主义底色 / 三轨映射 / 共谋宇宙恐怖'
v4_0_focus: '规则怪谈结构骨架 + 规则=事故化石 + Heavy 密度 + 玩家自我怀疑钩子（β 路径）'
reference: '《动物园规则怪谈》(规则怪谈格式样板，setting 不动)'

# v4.0 锁定 / 开放矩阵
locked_from_v3_1:
  - '设定核：灵长类辅助文书部 / X 集团 / 卡夫卡式打字工厂 / SCP 收容主义底色（不命名）'
  - '美学：90 年代体制内办公室 + 向心矢量动效'
  - '伦理：共谋宇宙恐怖（你和公司都在被吃）'
open_for_rewrite:
  - '玩家身份：β 路径（雇员偶尔怀疑自己；B6 猴行协议保留 + 规则怪谈式自我怀疑混入）'
  - '三轨映射（V-1/V-2/V-3/PEP × L0-L3 × SCP/FRP/ARP/PEP）'
  - '主题（v3.1 是 A/B/D/E）'
  - 'B1-B9 真理'
  - 'Premise / Story Beats / 角色'
rule_horror_imports:  # 全部 🔴 必移植
  - '规则 = 事故的化石（forensic）：每条内训条款都是一次失踪的纪念碑'
  - '规则自相矛盾 / 互锁：Rule 5 ↔ Rule 12 不能同时遵守'
  - '规则被静默修订：回工位发现手册多了一条，没人通知'
  - '"如果 X 出现，请勿 Y" 句式：恐怖直接来自句式本身'
  - '某些规则不是为你写的：B6 猴行协议 × 规则怪谈双钩子'
delivery_modes: '多种形式混搭（A 显式编号守则 + B 公告/邮件/便签碎片 + C 入职手册集中投递 + D 从禁忌反推）'
---

# 打字肉鸽 · Narrative Design Document v4.0

**Author:** Yuchenghuang
**Game Type:** Roguelike (Deck-building + Typing)
**Narrative Complexity:** Heavy (rule-horror density)

---

## Document Status

本叙事文档通过 BMGD Narrative Workflow v4.0 重新构建。
保留 v3.1 的 **设定核 + 美学 + 伦理** 三块硬骨头；
其余（玩家身份 / 三轨映射 / 主题 / B1-B9 真理 / Premise / Beats / 角色）按 **规则怪谈结构骨架** 重写。
参考《动物园规则怪谈》的 **规则怪谈格式 / 语气 / 文体**——不是 setting pivot，setting 仍是 灵长辅助文书部。

**Steps Completed:** 1 of 11 (Initialize)

| 步 | 内容 | 状态 |
|---|---|---|
| 1 | Initialize | ✅ 完成（v4.0 启动 / v3.1 备份） |
| 2 | Foundation (Premise, Themes, Tone, Structure) | ⏳ 进行中 |
| 3 | Story (Beats, Pacing) | — |
| 4 | Characters | — |
| 5 | World & Lore | — |
| 6 | Dialogue Framework | — |
| 7 | Environmental Storytelling | — |
| 8 | Narrative Delivery | — |
| 9 | Integration with Gameplay | — |
| 10 | Production Notes | — |
| 11 | Complete (Appendices + Handoff) | — |

---

## v4.0 锁定决策（前置约束）

### 🔒 LOCKED（v3.1 继承，不重写）

| 维度 | 内容 |
|---|---|
| **设定核** | 灵长类辅助文书部 / X 集团 / 卡夫卡式打字工厂 / SCP 收容主义底色（不命名） |
| **美学** | 90 年代体制内办公室质感（日光灯白 + 米黄办公纸 + 灰咖工位隔板）+ 向心矢量动效（暗角吸光 / 中心定点脉动 / 粒子向心流） |
| **伦理** | 共谋宇宙恐怖（公司和你都在被吃 / 不向上挥拳） |

### 🟢 OPEN（本次重写）

| 维度 | 重写方向 |
|---|---|
| 玩家身份 | β 路径——雇员偶尔怀疑自己；保留 B6 猴行协议 + 注入规则怪谈式自我怀疑 |
| 三轨映射 | 待重新对齐到规则怪谈骨架 |
| 主题 | 待重新选择 |
| B1-B9 真理 | 待重新审计 |
| Premise / Beats / 角色 | 待 Step 2-4 推导 |

### ✅ SETTLED（不再讨论）

| 维度 | 决定 |
|---|---|
| 复杂度 | Heavy（rule-horror density） |
| 规则呈现 | 多种形式混搭（A 显式编号守则 + B 公告/邮件/便签 + C 入职手册 + D 禁忌反推） |
| 风格参考 | 《动物园规则怪谈》（格式 / 语气 / 文体样板） |

### 🎯 必移植招数（来自《动物园规则怪谈》）

1. **规则 = 事故的化石（forensic）**——员工手册不是世界观背景板，是死亡名册
2. **规则自相矛盾 / 互锁**——Rule 5 与 Rule 12 不能同时遵守
3. **规则被静默修订**——回工位发现手册多了一条，没人通知
4. **"如果 X 出现，请勿 Y" 句式**——恐怖直接来自句式
5. **某些规则不是为你写的**——B6 猴行协议 × 规则怪谈双钩子

---

_Content will be added as we progress through the workflow._
