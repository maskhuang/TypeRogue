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
previousVersion: 'v3.1 (2026-04-30) backed up to docs/narrative-design.v3.1.backup.md'
v4_0_init_backup: 'docs/narrative-design.v4.0-init.backup.md（含 v3.1 继承的 LOCKED 三件套，已作废待重审）'
v4_0_methodology: '从收容物本体反推：先钉 anomaly，再反推 玩家身份 / 三轨映射 / 主题 / B1-B9 / Premise / Beats / Characters / Setting 壳 / 美学 / 伦理。不允许逆向硬塞。'
reference: '《动物园规则怪谈》（规则怪谈格式 / 语气 / 文体样板）'

# v4.0 B 级合约 — Start Fresh: 推倒重建合约级
contract_kept:
  - '复杂度：Heavy（rule-horror density）'
  - '风格参考：《动物园规则怪谈》——规则怪谈格式 / 语气 / 文体样板'
  - 'delivery_modes：多种形式混搭（A 显式编号守则 + B 公告/邮件/便签碎片 + C 入职手册集中投递 + D 从禁忌反推）'
  - '方法论：从收容物本体反推（v4.0 methodology），不允许逆向硬塞'
contract_reopened:  # v3.1 继承的 LOCKED 三件套，全部回到讨论桌
  - '设定核：灵长类辅助文书部 / X 集团 / 卡夫卡式打字工厂 / SCP 收容主义底色——是否仍做壳，待 anomaly 钉死后回头评估'
  - '美学：90 年代体制内办公室 + 向心矢量动效——锚定 anomaly 后重审'
  - '伦理：共谋宇宙恐怖（你和公司都在被吃）——锚定 anomaly 后重审'
contract_blank:  # 待 Step 2-4 推导
  - '玩家身份'
  - '三轨映射（V-1/V-2/V-3/PEP × L0-L3）'
  - '主题'
  - 'B1-B9 真理'
  - 'Premise'
  - 'Story Beats'
  - 'Characters'
rule_horror_imports:  # 风格层导入（不绑 setting）
  - '规则 = 事故的化石（forensic）：每条条款都是一次失踪/事故的纪念碑'
  - '规则自相矛盾 / 互锁：不能同时遵守'
  - '规则被静默修订：回工位发现手册多了一条，没人通知'
  - '"如果 X 出现，请勿 Y" 句式：恐怖直接来自句式本身'
  - '某些规则不是为你写的'
---

# 打字肉鸽 · Narrative Design Document v4.0

**Author:** Yuchenghuang
**Game Type:** Roguelike (Deck-building + Typing)
**Narrative Complexity:** Heavy (rule-horror density)

---

## Document Status

本叙事文档通过 BMGD Narrative Workflow v4.0（B 级合约 / Start Fresh）重建。

**v4.0 方法论锁定（不可动摇）:**
> 从收容物本体反推。先钉 anomaly，再反推 玩家身份 / 三轨映射 / 主题 / B1-B9 / Premise / Beats / Characters / Setting 壳 / 美学 / 伦理。不允许逆向硬塞。

**v3.1 继承全部解封**——包括"灵长类辅助文书部 / 卡夫卡打字工厂 / 共谋宇宙恐怖"——回到 Step 2 重审。

| 步 | 内容 | 状态 |
|---|---|---|
| 1 | Initialize | ✅ 完成（v4.0 B 合约启动 / v3.1 + v4.0-init 双备份） |
| 2 | Foundation（先钉 anomaly → 再推 Premise / Themes / Tone / Structure） | ⏳ 下一步 |
| 3 | Story Beats / Pacing | — |
| 4 | Characters | — |
| 5 | World & Lore | — |
| 6 | Dialogue Framework | — |
| 7 | Environmental Storytelling | — |
| 8 | Narrative Delivery | — |
| 9 | Integration with Gameplay | — |
| 10 | Production Notes | — |
| 11 | Complete (Appendices + Handoff) | — |

---

## v4.0 B 合约（前置约束）

### ✅ KEPT（不再讨论）

| 维度 | 决定 |
|---|---|
| 复杂度 | Heavy（rule-horror density） |
| 风格参考 | 《动物园规则怪谈》——格式 / 语气 / 文体样板 |
| Delivery 形式 | 多种混搭（A 显式编号守则 + B 公告/邮件/便签 + C 入职手册 + D 禁忌反推） |
| 方法论 | 从收容物本体反推（不允许逆向硬塞） |

### 🔄 REOPENED（v3.1 继承的 LOCKED 三件套，全部回到讨论桌）

| 维度 | 待重审项 |
|---|---|
| 设定壳 | 灵长辅助文书部 / 卡夫卡打字工厂 / SCP 底色——是否还做壳？ |
| 美学 | 90 年代体制内办公室 + 向心矢量——锚定 anomaly 后回头评估 |
| 伦理 | 共谋宇宙恐怖（你和公司都在被吃）——锚定 anomaly 后回头评估 |

### ⬛ BLANK（待 Step 2-4 推导）

玩家身份 · 三轨映射 · 主题 · B1-B9 真理 · Premise · Beats · Characters

### 🎯 风格层导入（来自《动物园规则怪谈》，不绑 setting）

1. **规则 = 事故的化石（forensic）**——条款是死亡名册
2. **规则自相矛盾 / 互锁**——不能同时遵守
3. **规则被静默修订**——回工位发现多了一条，没人通知
4. **"如果 X 出现，请勿 Y" 句式**——恐怖直接来自句式
5. **某些规则不是为你写的**

---

## Step 2: Foundation — 从 Anomaly 反推

**进度（2026-05-02）：** ✅ Anomaly 钉死 / ✅ 主叙事方法定 / ✅ 玩家身份骨架定（5 段阶梯 = 5 职业）/ ✅ 三轨形态确认 / ✅ Voice 矩阵骨架 / ⏳ Premise / ⏳ Themes / ⏳ B1-B9

---

### 2.1 收容物本体 · Anomaly Anchor 🔒 LOCKED

**核心命题：**

> 只要一段文本在规定时间内被准确打出，它就会从"随机可能性"变成"有效文本"。
> 但文本是否会伤害打字员，取决于打字员有没有承担"作者责任"。

**人类的问题**：会理解、选择、修正、判断、解释——这些行为让文本认为"你不是复制者，你参与了我"。**于是污染发生**。

**污染的本质 = 身份变化（不是精神感染）**：

```
录入员  →  校对者  →  修改者  →  作者  →  文本的一部分
```

**猴子的意义**：随机敲击，不理解、不选择、不负责。"扮演猴子"减少污染——让员工在神秘学意义上更接近"无意图的随机源"。

**猴子悖论**（自带防腐机制）：
- 有意识地"扮演猴子" = 仍在选择
- 知道为什么扮演猴子 = 仍在理解
- 真正安全的猴子状态 = **逐渐放弃理解**（不是表演，是真实退化）

> 此本体论自带 self-paradox 防腐机制：任何后续机制/叙事衍生不能轻易绕过它，会自我筛选掉松垮的设计。

---

### 2.2 主叙事方法 · Narrative Method 🔒 LOCKED

**规则怪谈作为主叙事手法**（不是辅助叙事）。

参考《动物园规则怪谈》九段文档结构：以多个张贴/留言主体的口吻，向多个告知对象告知若干诡异且互相矛盾的"守则"，逐渐透露真正的生存法则与"它"的秘密。

**五条核心写作手法**（全部移植）：

| # | 手法 | 兑现方式 |
|---|---|---|
| 1 | 罗生门式多声部 | 同一事件在不同主体口中呈现完全不同的应对规则 |
| 2 | 矛盾即陷阱 | 规则的相互证伪本身即恐怖发生器（"遵守规则的行动都无济于事"） |
| 3 | 否定式存在强化 | 越警告"不要 X"，X 在文本世界的存在感越被强化 |
| 4 | 信息留白 + 单一指代物 | 未命名的"它" / 被■■遮蔽的代号；玩家拼图永远缺最后一块 |
| 5 | 体裁伪装（拟真公文） | 守则/告示/便签/文件，不写故事/人物心理/场景描写 |

> 收容物的"形态"必然是这种 — 不是"我们选了规则怪谈"，而是收容物只能以规则怪谈形态溢出。

---

### 2.3 反推骨架 · Cascading Derivations 🔒 LOCKED

11 条已锁定决定（D1-D11）：

| # | 决定 |
|---|---|
| D1 | 收容物本体：文本通过准确录入获得有效性；污染 = 身份阶梯下滑（5 段）|
| D2 | 安全态：放弃理解（非表演），自带猴子悖论 |
| D3 | 主叙事方法：规则怪谈（多声部矛盾公文）|
| D4 | 5 段阶梯 = 5 职业 |
| D5 | 游戏拒绝给答案；结局 = 玩家成为/留下的文档，加入下一周目语料 |
| D6 | Meta-progression 反用：**进步即堕落**，解锁 = 诱降 |
| D7 | 玩家被记账，但污染状态不可见 |
| D8 | 多声部反身闭合：玩家职业 = 文档矩阵中的一个 voice |
| D9 | none = 录入员（重命名）, metamorph = 修改者, wordsmith = 作者 |
| D10 | 解锁顺序反转：录入员（默认）→ 校对者 → 修改者 → 作者 → 文本的一部分 |
| D11 | Ascension A0-Amax 保持，与阶梯 orthogonal（同一职业内的难度梯度） |

---

### 2.4 三轨映射形态 🔒 LOCKED

三轨 ≠ typing 维度，≠ 世界观派系，**= 叙事主体三分**：

| 三轨 | 在游戏里的载体 | 规则怪谈对位 |
|---|---|---|
| **公司 voice** | 工作台规则文件 / UI / 系统消息 / 值班表 | 园方告示 / 守则 / 园长文件层 |
| **员工 voice** | 工作台便条 / 同事留言 | 保安便签 / 捡到的纸条层 |
| **异常 voice** | 词包里的叙事词 | 残页 / 不明遗留物层 |

> **关键发现**："异常 voice = 词包叙事词"这条已有设计是 D1 收容物本体的天然兑现：玩家敲下词的瞬间，词从随机可能性变为有效文本——异常不是 NPC，**异常是玩家自己 type 的产物**。词包是诅咒载体。**保留并强化，不重写。**

---

### 2.5 Voice 矩阵 · 规则怪谈语料骨架

5 职业（行）× 三轨（列）矩阵——规则怪谈语料产出的骨架。每 cell 是一类文档 slot；对角线密度高，远离对角 cell 可空。

|  | 公司 voice | 员工 voice | 异常 voice |
|---|---|---|---|
| **录入员** | 被分配的守则（如实抄）| 同事便签（如实记）| 处理过的词包（轻微异常痕迹）|
| **校对者** | 改过的守则（红字）| 标注的便签 | 标记风险的词包 |
| **修改者** | 重写的守则 | 诱导他人写的便签 | 改造过的词包 |
| **作者** | 新创"看似官方"的异端守则 | （稀少）| 亲手写的异常词条 |
| **文本一部分** | endless 玩家"创作"的伪官方 modifier 描述 | endless 触发的伪员工便签 | **endless 字符级缓变本身** |

> **多声部反身闭合（D8）兑现**：规则怪谈的多声部矛盾不是因为信息差/谎言，而是**每份文档的写者处在身份阶梯的不同位置**——读者（玩家）比对矛盾的过程，本质上是在测量每个写者距离深渊有多远。**且玩家自己就是其中一个写者。**

---

### 2.6 现有系统对位 · 不需要从零设计

#### 职业系统对位（v4.0 反推方法论的成功案例）

前任设计在没明确本体论的情况下，已经把 5 段阶梯里的 4 段载体盖好了：

| 阶梯段 | 本体论动作 | 现有载体 | 改造工作 |
|---|---|---|---|
| 1. 录入员 | 不参与，如实接受 | `none`（无职业）| 重命名 display name；ID 保留 `none`（避免向后兼容风险）|
| 2. 校对者 | 看见瑕疵，标注 | ❌ 无 | 新增职业，机制 ⏳ **暂定** |
| 3. 修改者 | 改写已有文本 | `metamorph`（蜕变师）| 重命名 + 重写 flavor |
| 4. 作者 | 创造新文本 | `wordsmith`（造词师）| 重命名 + 重写 flavor |
| 5. 文本的一部分 | 被吃掉，反向控制 | **endless 模式** | 本体论再框定，**无需开发新模式** |

#### 第 5 职业 = endless 模式（关键级联）

- 通关 → endless 解锁 = 玩家"被升格为文本的一部分"，UI 上感觉是"挑战极限"
- endless 中玩家选 boss modifier = 玩家在**创作异常 voice**
- Cycle 6+ 字符级缓变 = 文本一部分（玩家自己）在用呓语腐蚀文档——之前已有的"endless 启用字符级缓变作为污染症候"现在有了主体
- endless 玩家写的 modifier 进入下一周目其他职业的语料（D8 反身闭合的硬兑现）
- endless 没有"通关" = D5 极致兑现
- **唯一逃脱机制 = 不玩 endless**（保住猴子状态，但游戏不奖励 → D7+D5 的最高潮）

#### 解锁顺序须反转

当前 metamorph / wordsmith 的解锁方向与本体论相反，**需反转**为：
```
录入员（默认可用）→ 校对者 → 修改者 → 作者 → 文本的一部分（endless）
```
每一次"解锁"在本体论上 = 一次诱降；游戏在 grooming 玩家。

#### 已有"校勘 / Proofread" affix 的位置

游戏里**已经存在**叫"校勘"（Proofread, AffixType.Reecho 旁的另一个 affix）的词条，目前挂在 wordsmith 下——这是又一次 v4.0 反推方法论的成功证据：前任设计已经播种了"校对者"概念。后续校对者职业落地时应考虑把 Proofread 转移到校对者 starter pool。

---

### 2.7 触发的设计约束（必须做的）

| # | 约束 | 出处 |
|---|---|---|
| C1 | Endless 入口必须有"升格仪式"瞬间——不能无声切换。事后才意识到"我刚才被吃了" | D5 + 第 5 职业级联 |
| C2 | Boss modifier 选择 UI 不能感觉像 buff 选择——用词/视觉/反馈框定为"撰写异常报告" | D5 + D8 |
| C3 | 每个 modifier 旁应显示"上一任作者：Subject XX"——反身闭合的可见证据 | D8 |
| C4 | Endless 玩家写的 modifier 进入本地存档 → 下一周目其他职业 run 有概率遇到带签名的异常 boss | D8 反身闭合硬兑现 |
| C5 | 污染状态**不可见**（D7）——只通过侧信道泄露：NPC 称呼漂移 / 文本字符级缓变 / 过场代词变化 / 终局时回顾"每个有意识的选择" | D7 + 猴子悖论 |
| C6 | 每个职业必须至少与三轨之一发生强 typing 交互（voice 矩阵的 in-game 凭证）| Voice 矩阵 |
| C7 | "解锁=诱降"的可感知化：解锁动画/文案/同事议论应让玩家事后回想时意识到"游戏在引诱我往下走" | D6 |

> **机制警告**：Roguelike 玩家习惯"每次跑完=永久变强"的 reward loop。本本体论里"变强=变危险"。设计上必须让"获得即失去"成为玩家可感知的张力，否则会出现"玩家追求最快解锁作者"的反向 grind，把整个本体论玩穿。这是后面 progression design 的硬约束。

---

### 2.8 PARKING LOT · 暂定 / 待决

| 类别 | 项 | 状态 / 备注 |
|---|---|---|
| 机制 | **校对者** typing 机制设计 | ⏳ **暂定**（曾尝试 "签字键 + Reecho 池倾斜 + Proofread 转移" 方向，感觉不对，回炉重审）|
| 机制 | **文本的一部分**（endless）的"升格仪式"具体形态 | ⏳ 暂定（C1）|
| 系统 | endless modifier 写入本地存档 → 下一周目读取实现路径 | ⏳ 暂定（C4）|
| 叙事 | Premise 正式 derivation | ⏳ Step 2 后续 |
| 叙事 | Themes（v3.1 是 A/B/D/E）| ⏳ Step 2 后续 |
| 叙事 | B1-B9 真理 | ⏳ Step 2 后续 |
| 设定壳 | 灵长辅助文书部 / 卡夫卡 / SCP 底色—anomaly 锚定后是否仍做壳 | ⏳ 待重审（contract_reopened）|
| 设定壳 | 美学（90 年代办公室 + 向心矢量）| ⏳ 待重审 |
| 设定壳 | 伦理（共谋宇宙恐怖）| ⏳ 待重审 |

---

_Step 2 后续：基于上述骨架推 Premise / Themes / B1-B9，回头评估 contract_reopened 三件套；机制层（校对者 typing / endless 升格仪式）回炉重审。_

---

# Step 2 续（2026-05-03 → 2026-05-04 v4.1 整合）— Premise / Themes / Tone / Structure / Acts / Chapter Drafts

**进度更新**：✅ Premise / ✅ Setting / ✅ Themes / ✅ Tone / ✅ Structure / ✅ Act Breakdown framework / ✅ D27-D32 整合（v4.1）/ ✅ 术语词表 / ✅ Ch.3 重写 (DRAFT v2) / ✅ Ch.5 启动 (DRAFT v1) / ⏳ Ch.4 完整章节任务 / ⏳ Ch.2 回炉（D31 套用）/ ⏳ B1-B9

**v4.1 整合（2026-05-04）**：吸收外部流程文档《X Company 第七打字室完整流程》。机构占位名已与 D12 统一；新增 D27-D32 锁张力裁决与新概念；Ch.3 用 D26 v2 + D30/D31 重写；Ch.5 用 D32 双 voice 同事件框架启动；MOKO → **灵长接口（PI）** 已 LOCK。

---

## 2.9 Premise 🔒 LOCKED

> 一个临时录入员在 DPCA 的文牍科工作，必须在限时内准确打出任务文本；但他逐渐发现，打字不是危险，理解才是危险，而"扮演猴子"既是防护手段，也是公司处理深度污染者的最终程序。

**装进的本体论 cells**：
- D1（anomaly 本体）— 第二句"打字不是危险，理解才是危险"
- D2（猴子悖论）— 第三句"扮演猴子既是防护，也是最终程序"
- D6（进步即堕落）— 隐含
- 任意工号 + 班次配额（任一录入员路线）
- DPCA / 文牍科 / X 集团子部门（D12）

---

## 2.10 Setting 🔒 LOCKED

| 维度 | 决定 |
|---|---|
| 机构全名 | **DPCA** = Department of Primate Clerical Affairs |
| 部门 | **文牍科** |
| 上级 | **X 集团子部门** |
| 美学 | **文牍科旧气**（民国/1940-50 官署）+ **90s 体制内办公室** 两层共存 |
| 美学核心机关 | **时间错乱本身是 horror 元素**（不是 bug） |

---

## 2.11 Themes 🔒 LOCKED

### Thematic Question（伞）
> 当文字需要作者承担后果时，不理解也许是一种安全；
> 但如果安全的代价是放弃理解，那么活下来的还是人吗？

**这一句同时做了三件事**：承认 D1+D2 逻辑 → 掀桌（代价不可接受）→ 拒绝给答案（疑问句）。**与 D5 拒绝给答案完美同构**。

### 2 主题支柱

| 支柱 | 组件 |
|---|---|
| **P1 · 克苏鲁神话式恐怖** | 宇宙 × 不可名状 × 理解的代价 |
| **P2 · 作者责任** | 签下名字 = 签下命运 |

两支柱不互斥；理解的代价 / 进步即堕落 横跨二者。

---

## 2.12 Tone & Atmosphere 🔒 LOCKED

| 维度 | 决定 |
|---|---|
| 基调 | 阴翳 / 低气压 / 不疾不徐（cosmic dread, never panic）|
| 情感谱 | 困惑 → 不安 → 怀疑 → 恍然 → 麻木 → 拒绝 |
| 温度 | 冷（荧光灯 + 文档静默）|
| 湿度 | 干（废纸 / 旧文档 / 没有水汽）|
| 空气 | 凝滞（D13 时间错乱）|
| 节奏 | 沉静中断断续续打字声（typewriter clack + 荧光灯嗡鸣 + 无 jump scare）|
| 色调 | 暖黄（旧灯光）+ 灰绿（90s 办公）+ 红章（签字暴击）|
| 音乐 | 极简 / 静电噪音 / 偶发钢琴 / 远处广播；非 horror score |

---

## 2.13 Story Structure 🔒 LOCKED

**复合结构 — Mosaic + Cyclical + Branching**

```
META   ·  Mosaic / 规则怪谈式涌现 — Voice 矩阵 5×3 = 文档拼图
  ↓
MACRO  ·  Cyclical / 阶梯螺旋 — 5 职业 = 玩家身份的环行降落
  ↓
MICRO  ·  Episodic / 班次 — 每个 run = 一集 = 一份签到表归档
```

Branching 不在 META 而在 MACRO 终点：升（endless）/ 降（完全猴子化）/ 不入局（D17）。

---

## 2.14 Act Breakdown Framework 🔒 LOCKED

### META 层 · 5 章 = 5 职业

| Ch | 职业 | 阶梯位 | 核心 horror（高度概括）|
|---|---|---|---|
| 1 | 录入员 | 第 1 段 | "我消失了也没人会注意到"（被遗忘的可能性）|
| 2 | 校对者 | 第 2 段 | "看似有人在 process 我，但没人在那里"（被 process / 无主体）|
| 3 | 修改者 | 第 3 段 | "我玩着新玩具，但玩具是订单是别人的命运" — **NEEDS PASS-2 W/ D26 v2** |
| 4 | 作者 | 第 4 段 | "最有 agency 感的我，最 lack agency" — 三轨已修订到 D26 v2，narrative task 未 derive |
| 5 | 文本一部分 | 第 5 段 = endless | NOT STARTED |

### MACRO 层 · 3 phase

| Phase | 覆盖 | 玩家意识 | 色调 |
|---|---|---|---|
| **A · 升序段** | Ch.1-3 | "我在进步、在被认可" | 工作压力 + 偶有异常 |
| **B · 临界段** | Ch.4 + endless 解锁前后 | "升=下降，公司知情，我是同谋" | 恍然 / 不安 / 怀疑 |
| **C · 终结段** | 3 endings | "已签字 / 已猴子化 / 未入局" | 麻木 / 寂静 / 拒绝 |

### MICRO 层 · 班次节奏（in-run）

| 段 | 内容 | 时长占比 |
|---|---|---|
| 开班 | 签到 / 打卡 / 收今日守则 / 检查工位 | 短 |
| 任务推进 | 标准打字战斗循环 / 配额累积 | 主体 |
| 加班 / 异常事件 | Boss 战 / 同事便条出现 / 守则被静默修订 | 中段插入 |
| 下班 / 未下班 / 转入特殊勤务 | 三种结束方式 | 短 |

---

## 2.15 决定盘点 D12-D32（含修订）

| # | 决定 | 状态 |
|---|---|---|
| D12 | DPCA = Department of Primate Clerical Affairs / 文牍科 / X 集团子部门 | LOCKED |
| D13 | 美学 = 文牍科旧气 + 90s 办公室共存；**时间错乱本身是 horror 元素** | LOCKED |
| D14 | endless = containment failure（异常直接吃员工）；完全猴子化 = containment success；**公司动机=自我保全/系统延续，不是 service to anomaly** | revised after D26 retraction |
| D15 | 公司是 knowing containment system（知道异常存在，bureaucratic 程序管理），**NOT actively serving anomaly** | revised |
| D16 | 阶梯双向化——两端都失人性，中间是"人"的窄道 | LOCKED |
| D17 | 隐藏结局：不打字 → 不入局（orthogonal escape；**不应被攻略告知**）| LOCKED |
| D18 | 遗物 = DPCA 前身灵长类研究项目的历史档案 + 前一代实验对象的遗存（含真 chimp 个体 + 被处置员工）| LOCKED |
| D19 | D8 反身闭合在遗物上：玩家完成 run 后 relics 多一行"Subject [玩家工号] 经手 / 重新评估意见 [玩家行为字符串]" | LOCKED |
| D20 (v3) | L1-L5 是同一份文档的不同 reading；文档一直完整，**公司不投放/不修改**；玩家根据自身污染等级看到不同 layers；**文本是诚实的镜子** | LOCKED |
| D21 | 公司的"恶"是 Kafka × Arendt banal systemic evil；**没有具体决策者，但系统结构必然害人**；任何"为什么"的回答都是表层（合规/教育/传承），深层功能连高层自己都不能描述 | LOCKED |
| D22 | 历史档案 = 员工自我检查的认知锚点；**最毒的不是公司知道你的污染，是你只能用公司的尺度知道自己的污染** | LOCKED |
| D23 (v2) | "晋升"是玩家某次重读时发现"这行字之前没有"；但那行字一直在；变的是玩家。**双员工同读同一文档会读到不同内容**——你和同事永远无法验证彼此看到了什么 | LOCKED |
| D24 | 5 职业 = 公司 emergent 5 道污染容纳防线（administrative tier 体系），用于在异常感染发生后稳定地 keep employees working；**防线不分发新能力**——只是 administrative response | revised after D26 retraction |
| D25 | 技能 = **异常的 expression channels**（异常借灵长类 species protocol 表达自己），**不是公司的 disposal toolkit**；修改技能 = 直接 tamper anomaly's expression | revised |
| D26 (v2) | 异常通过两条 vectors 主动传播：(1) **peer-to-peer contamination**；(2) **异常本身的直接引导**。**公司不是 vector** — 公司只是 bureaucratic firewall（观察/记录/administratively reclassify/调度），**但不分发新机制**。新机制通过 contamination 传播，不是公司分发 | **REPLACEMENT for retracted D26 v1** |
| D27 | **受理窗口（textual acceptance interval）**：候选文本只在特定时间段获得受理机会（e.g. 17:06-17:13 / 午休结束前 30 秒 / 计时钟无秒针时）；给 D13"时间错乱即 horror"配机制锚点——时间错乱不是 bug，是窗口在打开/关闭 | LOCKED (v4.1, derived from D1+D13) |
| D28 | **机械见证效应（击键认证 / 格式通道）**：机械打字机是录入唯一稳定通道——它介于"无意图机器"与"有意图人类"之间，提供 anomaly 受理所需的"见证者"状态；不可逆物理压痕 + 色带格式 + 击键节拍共同构成认证。电脑 / 手写 / 打印机均无效 | LOCKED (v4.1, derived from D1+现有打字机系统) |
| D29 | **状态确认流程（Keep-as-human Check）**：任务结束员工被要求摘面具 / 报姓名 / 报日期 / 解释普通句子 / 区分"打字"和"写作"——表面 boilerplate 下班程序，实质 keep-as-human 检测；通过=离场（但不得复述），失败=转入猴子规则。**员工本人不应知此为污染检测**——给 D7 污染不可见配可见仪式容器 | LOCKED (v4.1, derived from D2+D7) |
| D30 | **公司 = defensive curator, NOT anomaly vector**：捕获/去语境化/词包化/编号化/筛选 = 防御性观测的副产品；公司**不创造、不引导、不分发、不 weaponize** anomaly。异常已在野外（公共字幕/OCR/会议转写/梦/儿童涂鸦/动物键盘/AI 乱码）时，公司 contain 一次。**任何叙事/UI 文本不得让公司看起来像 anomaly 的加工厂或代理人** | LOCKED (v4.1, 强化 D14 v2 + D15 + D26 v2) |
| D31 | **§15 规则来源矩阵 = D20 v3 layers 的具象化**：6 类规则（官方守则 / 安全部门便签 / 前员工批注 / 红领结文本 / 猴子规则 / 灵长接口）**不是不同文档**，是同一份《文牍科作业手册》在不同污染等级读者眼里呈现的 6 个 layers；**你看到哪一层 = 你已污染到哪一层**——D22 brutal positive feedback loop 的实现细节 | LOCKED (v4.1, 强化 D20 v3 + D22) |
| D32 | **Ch.5 = 双 voice 同事件**：玩家进入 endless 这一事件，在 anomaly voice 里被框定为"升格为新文本源"；在公司 voice 里被框定为"深度作者化案例进入猴子规则 / 转入特殊勤务"。**两边目的不同，但行为方向重合**——D14 v2 最暴力兑现（公司不 service anomaly，但公司的处置正是 anomaly 想要的状态）。入口仪式必须并列呈现两 voice，C1+C2+C3+C4 一次性兑现 | LOCKED (v4.1, derived from D14 v2 + D26 v2 + Ch.5 双框架张力) |

---

## 2.15.1 v4.1 术语词表 🔒 LOCKED

> 来源：v4.1 流程文档（《X Company 第七打字室完整流程》整合稿）。占位名已与 v4.0 LOCKED 项统一。

### A. 异常文本

| 术语 | 定义 | 出处 |
|---|---|---|
| **未受理文本（Unfiled Textual Event / Stray Sentence）** | 现实中自然产生的、来源不稳定 / 作者不明确 / 含义看似偶然的文本——但部分会扭曲现实使之向文本自洽。**异常的官方称呼，替换 v3.x"诅咒载体"** | D1 + 流程 §0 |
| **游离句 / 候选句 / 无主文本** | 未受理文本的同义异写（不同文牍科子部门的称呼习惯差异）| 流程 §1 |
| **受理窗口（textual acceptance interval）** | 候选文本获得受理机会的时间段 | D27 |
| **现实自洽（reality coherence）** | 文本成立后现实补出"它本来就合理存在"的证据链 | 流程 §7 |

### B. 机制 / 流程

| 术语 | 定义 | 出处 |
|---|---|---|
| **机械见证效应** | 打字机作为录入唯一稳定通道的神秘学职能（击键认证 + 格式通道 + 不可逆压痕） | D28 |
| **去语境化 / 词包化 / 编号化** | 候选文本进入第七打字室前的三步预处理，降低录入员一次性理解整句的概率 | 流程 §2 |
| **状态确认流程** | 任务结束的 keep-as-human 检测 | D29 |
| **猴子规则** | 状态确认失败后的无害化处理程序——身份剥离 / 不摘面具 / 不报姓名 / 继续敲 | 流程 §12 + D2 |
| **作者化（authorship contamination）** | 录入员从机械复制者被文本识别为参与创作的过程；**5 段阶梯下滑**（录入员→校对者→修改者→作者→文本一部分） | D1 + 流程 §9 |

### C. 设施 / 部门

| v4.1 占位 | v4.0 LOCKED 名 | 备注 |
|---|---|---|
| ~~X Company~~ | **X 集团** | D12 |
| ~~第七打字室~~ | **文牍科 · 第七打字室** | 文牍科下属作业室；in-game 工位称呼仍可用"第七打字室" |
| ~~未受理文本研究室 / 外部文本回收科~~ | **DPCA · 外部文本回收科** / **DPCA · 风险控制科** | 挂在 DPCA 下，新增不冲突 D12 |
| ~~MOKO 游戏化界面~~ | **灵长接口（Primate Interface, PI）** | **新 LOCK**：双关——既指人，也指 D26 v2 的"灵长类 species protocol"；玩家以为在玩 typing 游戏，实际是 DPCA 的灵长接口在 process 自己 |

### D. 处置去向（深度作者化）

| 术语 | 定义 | 出处 |
|---|---|---|
| **自由打字区 / 猴群坐席 / 无署名录入区 / 非人类输入源管理室** | 状态确认失败者被转入的去处；endless 模式 in-narrative 称呼 | 流程 §12 |
| **移动文本源 / 人员文本化 / rule-generating subject** | 深度作者化员工的官方分类；不再被视为 readable subject，被视为 emergent 输出源 | 流程 §10 |
| **责任归属变更** | 作者化事件的 administrative 表达——风险类别从"文本"升级为"人员" | 流程 §10 |

### E. 风险等级

| 等级 | 定义 | 处置 |
|---|---|---|
| 噪声文本 | 普通错误 / 乱码 / 偶然重复 | 废弃 / 冷储存 |
| 候选文本 | 异常重复 / 来源缺失 / 未来指向 / 命令格式 | 送入第七打字室测试 |
| 高危文本 | 已影响读者 / 档案 / 记录 / 记忆 / 现实局部结构 | 隔离录入 + 强制灵长接口 + 必要时强制猴面具 + 不允许普通员工阅读完整句 |

---

## 2.16 Chapter Narrative Task DRAFTS（标记 DRAFT，需 pass-2）

> ⚠️ **以下章节叙事任务全部 DRAFT 状态**——pass-2 需要：
> 1. 用 D26 v2 重写所有公司层的 horror（公司一致 firewall stance，不与异常同谋）
> 2. 显化异常的两条 vectors（peer + direct guidance）
> 3. 校对者机制 / 蜕变者机制 / 造词师机制重做后回炉对应章节

### 2.16.1 Ch.1 录入员（DRAFT v1 — D26 v2 影响较小，可保留）

**核心 horror**：被遗忘的可能性 — 不是事件 horror，是被世界温和推到边上的渗透感。

**三轨在玩法中的感知载体**：
- **🏢 公司层 · 客服式冷淡 + 藏着观察**：值班表 / 工号 / 规则手册推送 / 战斗 UI 极简纯数字 / 系统消息全 boilerplate / 公司 voice 文档全 boilerplate（你和 N 万人读同一份）。**唯一 hook**：某份读过的 boilerplate 文档，**某天回看时多了一行斜体小字**——实际上那行字一直在；是污染让你开始能看到 L2 layer；无 UI 庆祝、无奖励、无解锁通知；玩家会怀疑"是文档变了，还是我变了？"
- **👥 员工层 · 疏离 + 偶然便条**：工作台便条来自陌生工号（签名只是数字）；内容模糊提醒（"如果听到打字声从隔壁工位传来但隔壁没人，请勿应答"）；便条互相矛盾；偶尔一张直接写给"你"——但落款工号你不认识
- **👁 异常层 · 远 / 微弱**：词包偶有异常词（轻微违和，不解释）；极少 boss 战；战斗 wave 中背景杂讯；Cycle 末尾"今日总结"屏幕偶有一行字符级缓变；异常不主动出场
- **📦 遗物层 · Project Nim 等历史档案，纯 L1**：录入员看到的最克制版本（无 Terrace 注释、无公司备忘）；但 L2-L5 一直在文本里——只是录入员看不到；玩家"老实地录入"这些 flavor = D1 兑现：他正在替历史背书

**情绪目标**："我做了什么吗？谁会记得？"——轻度但渗透的虚无 / Nim 当年也是被遗忘的 / 你拿着 Nim 的东西但你不知道 Nim 是谁。

**本章不应出现**：jump scare / 直接 lore exposition / 三轨明确意图展示 / 任何"污染值"UI。

**埋下的 hooks**：那行突然"出现"的斜体注释 → Ch.2；陌生工号便条 → Ch.4-5 同事身份揭示；词包某异常词 → 后期 boss 雏形；Cycle 末尾字符级缓变 → Ch.5 endless 全行缓变预演；某 Project Nim 遗物 flavor → Ch.2-4 同遗物显示更多 layer。

**关键设计纪律**：零污染值 UI / 零奖励 popup / 成功标志 = 玩家退出后躺床上想"我今天读到的那行字……是新加的吗？"

---

### 2.16.2 Ch.2 校对者（DRAFT v1 — D26 v2 影响中等，需校对者机制定后回炉）

**核心 horror**："看似有人在 manage 我，但越查越发现没人在那里——只有 forms 在 auto-process 我"——agency 的解构本身就是恐怖。

**三轨在玩法中的感知载体**：
- **🏢 公司层 · emergent containment**：入 Ch.2 第一刻收到"升职通知"——格式仍是 boilerplate，**没有"恭喜"两个字**，只有"职位变更：录入员→校对者，权限调整生效"。开始有"针对性具体任务"（"Subject XX 请于午休前完成 N 份校对"），但 template-generated（XX 是占位符自动填的）。"挽救信号"（休假通知 / 额外录入任务 / 怀旧材料）**与晋升通知用完全相同格式**——你无法分辨。L2 文档普遍可见 + 旁注**轻微暗示**"此条已审阅，无需进一步处理"——但**公司不偏好**你忽略还是标注，**只是观察**
- **👥 员工层 · 遗憾 + 互相矛盾的挽救方法**：工作台便条**首次出现针对你工号**的版本；便条内容互相矛盾（"想回去：少思考""想回去：每天复述录入员手册""想回去：避免形容词""想回去：让你的标注永远是错的"）。同级现象：cycle 间隔偶尔看到**另一个校对者工位**——下次回头**空了**——不知是被调走还是从未存在。录入员（下级）**主动避开**你
- **👁 异常层 · 试探 + 借标注归档**：词包异常词更明显且**模式化**——玩家开始**预判**位置=学异常的语法。**校对者标注 = 替异常打 tag**：标注的瑕疵被某个**只有偶然看到的系统页面**显示为"已分类入库"——分类标签**不属于公司任何已知分类系统**。文本边缘**微小变化**（hover 时偶见，鼠标移开再看变化消失/改变）
- **📦 遗物层 · L2 注释普遍可见**：Ch.1 拾过的同一遗物再次拾到时**flavor 多了一段**——但**不是 Terrace 学者批判**（学术 tone 错了），是**更叙事化的描述 / 失去现实严谨性 / 真假难辨**。例：L1"Project Nim 训练中习得 128 ASL 手势" → L2 增补"某些晚间记录显示 Nim 在无人时仍持续打手语，仿佛在自言自语...Nim 死前最后一周的 footage 中可见他反复 sign 'hug me, please'，对象不详"。约 30% 真实可 verify / 30% 合理推测无法证伪 / 30% 清晰叙事化注入 / 10% 绝对错误但逻辑自洽。Ch.2 校对者**第一次主动 hover 历史档案做自我评估**——D22 brutal positive feedback loop 启动

**情绪目标**：主动 query 自我 → reference 自带空洞 / "公司"语调读不出主体 / 同事建议互相矛盾 / 异常接近但无意志。**比"公司在害我"更恐怖——因为帮和害用同一语调发出**。

**本章不应出现**：明确"公司决定 X"展示 / 恶意公司高层角色 / 清晰的挽救路径 / "污染等级"UI / 反派 boss。

**埋下的 hooks**：空了的同事工位 → Ch.3-4；标注被异常归档的"未知分类" → Ch.5 endless；Ch.1 同遗物的新 layer → Ch.3-5；老员工便条的"挽救方法" → Ch.3-5（玩家会真的尝试，全部失败）；升职通知冷淡格式 → **Ch.5 endless 入口通知与 Ch.2 升职通知格式完全相同**。

**关键设计纪律**：0 个 NPC 有姓名 / 所有 boilerplate 通知 templated / 同事便条互相矛盾且无对错 / 挽救信号和处置预告用相同格式 / L2 注释要 plausibly always there / 成功标志 = 玩家中后期反复回看 Ch.2 早期，怀疑"那时是不是看错了"。

---

### 2.16.3 Ch.3 修改者（DRAFT v2 — D26 v2 + D30/D31 已套用 / 吸收流程 §10 弹药）

**核心 horror**：
> "我被同事和异常 contaminate 到学会了 new things，公司 sees 然后 reclassifies 我，但**公司根本没批准过任何东西**——它在打输 firewall 战，我是它救不了的'已感染'案例之一。最虚无的不是公司害我，是公司**既不偏好我用新机制，也不偏好我不用**——它只是 keep 记账。"

**三轨在玩法中的感知载体**：

- **🏢 公司层 · firewall lag（D26 v2 + D30）**：
  - 公司**不分发**新机制；公司**不"授权"**任何东西
  - 升职通知"权限调整生效" = **administrative reaction**——公司 sees 你 use 新机制 → 走 reclassification 程序 → reclassify 你 → monitor better。**升职通知格式与 Ch.2 升职完全相同 template**（boilerplate 不变；这是 Ch.5 入口的伏笔）
  - 公司 always lag——你已经会用新机制几个 cycle 后，公司才追认
  - 工作台开始出现"安全部门便签 layer"旁注："Subject [你工号] 当前观测分类：候选修改者 / 持续监测中 / 暂无 reclassification 动作"——**这条注是文档一直在的**（D20 v3 + D31）；是你污染到能看见 L2-L3 layer 才显现
  - 任何挽救尝试（按 Ch.2 老员工建议执行）→ 全部失败 → 反向证据：**公司不是在帮你也不是在害你，公司只是在记账**

- **👥 员工层 · peer-to-peer contamination = vector 1**：
  - 你的"修改能力"来源**不可名状**：
    - 看到隔壁工位老修改者的 typing 节奏，之后自己手指"自己"开始模仿
    - 读到同事便签建议——"标 affix 时如果手停在某键超过 0.5 秒，让它停"——执行后你的 affix preference 不可逆改变
    - 拣到前任修改者的工位遗留（半填的标注卡 / hover 不消失的注释），下一次 type 时不知不觉用上了那种格式
  - 老员工**消失**：cycle 间回头看，昨天还在的同事工位空了；工号查不到，像从来没存在过。但你工作台多了一份"前任标注转移"通知（boilerplate，没解释）
  - 老员工警告："如果你的 X 机制开始 Y，请离开工位"——X/Y **永远空白**。你试图填——失败。**这警告不是给现在的你看的**（规则怪谈手法 5：某些规则不是为你写的）
  - 你和同事**没法验证彼此看到了什么**（D23 v2）：试图交流"安全部门便签 layer"——对方反应像在听你讲一种没见过的语言

- **👁 异常层 · 异常直接引导 = vector 2**：
  - 你 hover 文档时**突然"懂了"**新的 typing 方式——这是异常的 whisper，不是公司教程
  - type 时**手指自己**做没意图的动作（微 drift / 修改建议被自动 accept）——意志混合
  - 文档边缘 micro-changes 开始**直接指向你**：不再是 Ch.2 那种 hover 时偶见的细微变化，而是**有意图的 sentence fragment** 出现在你常 hover 的位置
  - 词包异常词**主动出现**在修改建议候选里（玩家会以为是 affix system buff，实际是异常借灵长类协议表达自己——D25 v2）
  - **Boss 包含你以前修改过的措辞**（D8 反身闭合）：boss tooltip 里出现自己 Ch.2 标注过的句子，但 attribution 是 "Subject XX-1138"——**不是自己工号**。你看到自己的笔被署在别人名下

- **📦 遗物层 · L3 显形 + cross-reference 矛盾（D31 + D22 第二阶段）**：
  - L3 = 公司视角的"重新评估意见" / 内部备忘 / "对前任 Subject 的 administrative footnote"
  - 不再是 Ch.2 的"叙事化注入"层，而是**机关备忘录的口吻**：干的、没人格、没共情。例：L2 (Ch.2 已可见) "Subject Nim 死前最后一周反复 sign 'hug me, please'" → L3 (Ch.3 可见) "Subject Nim 终末期表现出与 ASL 协议偏差的手势模式，评估为通讯能力退化"
  - **L3 与 L2 在同一份遗物上互相矛盾**——这不是错误，是不同污染等级 reader 看到的不同 layer（D31）
  - 玩家**主动 cross-reference 多个遗物** → 发现描述互相矛盾 → 用公司的尺度量自己的污染（D22 第二阶段）
  - **新增 hook**：玩家如果 cross-reference 到自己工号——会发现遗物上**已有自己的 L3 footnote**（D19 反身闭合，但此处玩家应仅留模糊感觉，不该明确意识到）

- **🔧 技能层（Ch.3 新增载体，D25 v2）· 你在 tamper anomaly 的 expression channel**：
  - 玩家通过修改者机制编辑 by 灵长类命名的技能（具体机制 PL-2/PL-3 待定，叙事框架先锁）
  - 表面：普通 roguelike 修改者 power fantasy
  - 实际：你在直接 tamper anomaly 的 expression——公司只是观察并 categorize，**不是 design / order**
  - 玩家完全感觉不到这一层——所有此层 horror 通过**遗物 L3 + 文档 + 同事消失**间接显化
  - **受理窗口暗示（D27）**：修改者新机制只在某些时段"工作"得最顺手——玩家会自己摸索"我的 X 在 17:06-17:13 节拍最稳"——这是受理窗口，**但游戏不命名**，让玩家自己给它起绰号（这绰号到 Ch.4 会被发现是文牍科官话术语）

**情绪目标**：
- power fantasy + 隐隐 wrongness 并存
- 同事开始消失 / 你的笔在抹他们 / 你的能力变化你说不清来源
- "我在玩游戏吗？还是游戏在玩我？"
- 中后期：**"公司既不偏好我用新机制、也不偏好我不用——它只是 keep 记账"** 的虚无感超过"公司害我"的恐惧

**本章不应出现**：
- 任何 order / mission / objective UI ⚠️ **最重要**
- 任何"恶意公司高层"
- 任何 mechanic tutorial 暗示其更深含义
- "污染等级"UI / 反派 boss / "道德选择"提示
- ⚠️ **新增（D26 v2 + D30 防火）**：任何"授权 / 许可 / 解锁 / 配发"性质的 system message——公司不分发任何东西

**埋下的 hooks**：
- 你 erase 的前人便条 → Ch.4-5（你看到自己工号被另一个修改者 erase）
- 你修改的技能 protocol → **Ch.5 endless**（你看到这些 protocol 被用 against you）
- 不同 run 不同机制 flavor → Ch.4-5
- 老员工不可命名警告（X/Y）→ Ch.4-5
- 你修改的措辞出现在 boss 嘴里（attribution 是别人工号）→ **Ch.5 endless**："原来 XX-1138 是过去某次 endless 的我"
- 受理窗口的"绰号" → Ch.4 作者会发现绰号其实是文牍科官话术语
- 工号已出现在 L3 footnote 的模糊感 → Ch.4 显化
- 升职通知 boilerplate 与 Ch.2 完全相同 → **Ch.5 endless 入口通知格式仍相同**（D32 双 voice 兑现）

**关键设计纪律**：
- 零 order / mission UI（**最重要**）
- 升职通知最简形式（与 Ch.2 同 template）
- 新机制像普通 roguelike 新职业那样登场——**不要让玩家事中察觉异常**
- 同事不讨论"机制"或"订单"
- 物理工位渐次孤立
- 任何 system message **不出现**"授权 / 许可 / 解锁 / 配发"字眼 ⚠️ **D30 硬约束**
- L3 文档要 plausibly always there（D20 v3）
- 成功标志：玩家完成 Ch.3 N 小时后**仍感觉只是在玩新职业**——但回头看 Ch.2 早期会觉得"那时同事还活着"

---

### 2.16.4 Ch.4 作者（DRAFT v0.5 — 三轨已修订到 D26 v2，narrative task 未 derive）

**预定核心 horror**："最有 agency 感的我，最 lack agency"——作者 thinks they're creative，实际是 listening-stenographer。

**三轨 base（已修订到 D26 v2，待展开成完整章节任务）**：
- **🏢 公司**：仍 containment + observation + 不与异常同谋。给作者 isolation 是**为了 firewall**——隔离=减少感染他人风险。但 isolation 反而让异常 direct contact 更容易——**公司 firewall 措施反向加速 contamination**——D21 banal evil 的 cruel 形态：**公司 well-intentioned 地杀你**。"高 prestige 的 author 待遇" = **公司 best-effort 的 containment**，反过来助长 endless
- **👥 员工**：完全 isolation / 老员工断绝 / 作者间无 communication（公司 deliberately 不让作者们 communicate） / 唯一 contact = 前任作者 ghost 留下的不可解读痕迹便条
- **👁 异常**：直接 dictation——通过 isolation 创造的"安静空间"。整段文本可能自动浮现在 typing buffer 里，玩家只需按键 confirm。"创意"实际是 anomaly 的 dictation。Boss 整段 quote 你写过的内容
- **📦 遗物**：L4 = 同期 Subject 死亡 / 失踪记录开始可见。"前任作者 Subject XX 于 Cycle Y 进入 endless 模式" — 格式与公司 boilerplate 完全相同。D22 第三阶段
- **🔧 技能**：你 build 的词库不是你的 creation，是 anomaly 的 dictation pre-loaded for you（造词师机制 reframe 待 PARKING LOT）

**Ch.4 horror 修订**：公司 isolate 我是为了 firewall——但 isolation 反而让异常无 interference 地 dictate 我——公司是 well-intentioned 但 failing 的 jailer。

**未 derive 部分**：完整章节任务（情绪目标 / 本章不应出现 / 埋下的 hooks / 关键设计纪律）。

---

### 2.16.5 Ch.5 文本一部分 / endless（DRAFT v1 — D32 双 voice 同事件框架）

**核心 horror**：
> 同一个事件在两个 voice 里被框定为相反方向——你被吃掉的过程，在 anomaly voice 里是"升格"，在公司 voice 里是"无害化处置"。**两边目的不同，但行为方向重合**——这正是 D14 v2 的最暴力兑现：公司**不是 service to anomaly**，但公司的处置**正是 anomaly 想要的状态**。猴子规则不是保护，是保护失败后的处理程序。

---

#### 入口仪式（C1 + D32 兑现）

通关瞬间，屏幕**并列**两份文档（不是 popup，不是过场——直接显形为 "下一份工作单"）：

| 公司 voice | 异常 voice |
|---|---|
| boilerplate："员工 [工号] 通过结业评估。鉴于其 Cycle X 修改记录与 Cycle Y 异常归档之间的 cross-reference 频次超阈，转入特殊勤务。不得复述任务内容。不得记录梦境。" | 玩家**第一份 boss modifier** 自动显形——签名是玩家自己工号——**玩家本人没有点过任何"创作"按钮** |

- **公司通知与 Ch.2 / Ch.3 升职通知完全相同 template**——D32 + 反身闭合
- **没有"恭喜进入 endless 模式"popup / 没有新音乐 / 没有调色板变化 / 没有 boss 化背景**
- 点击任何键 → 进入 endless。**升格仪式自身就是 endless 的第一个回合**——玩家事后才会意识到"我刚才被吃了"

---

#### 三轨在玩法中的感知载体

- **🏢 公司层 · 处置程序（公司 voice）**：
  - "特殊勤务"boilerplate 持续推送："本日勤务：自由打字 / 配额：不限 / 受理窗口：不适用 / 输出存档：无署名输入区"
  - 不再有"今日守则"——你已不被视为 readable subject（D24 v2：5 职业 = 公司 emergent 5 道污染容纳防线，你已过完所有防线）
  - 公司**不再 reclassify 你**——你不再产生新分类
  - **状态确认流程（D29）在每个 cycle 末尾自动 fail**：你"摘下面具"的请求被忽略 / 你说出姓名屏幕没反应 / 你说出日期屏幕显示"日期不适用"
  - 工作台不再有"挽救信号"——公司视你已离开 firewall 范围

- **👥 员工层 · 员工 voice 退场**：
  - 工作台便签**完全消失**——你不在 peer-to-peer contamination 网络里了（你已是 vector 终点；没有"下一阶梯"需要被你感染）
  - **唯一例外**：偶尔工作台出现一份"致后来者"的便签——**落款是你自己当下工号**。你不记得写过。但字迹是你的 typing pattern。**你正在为下周目其他职业的玩家写"前员工批注"**（D8 反身闭合 / C4 硬兑现）

- **👁 异常层 · 你就是异常的 voice**：
  - 词包异常词**变成普通词**——因为你的输入本身就是异常源，不再需要"异常痕迹"标记
  - **Boss modifier 选择 UI 重新框定**：不再是"选择本场 modifier"，而是 "**撰写本场异常报告。上一任作者：Subject XX-####**"（C2/C3 硬兑现）——Subject 编号有时是你以前 run 的工号，有时是别的玩家
  - 你写的 modifier **进入本地存档** → 下周目其他职业 run 有概率遇到带你工号签名的异常 boss（C4 硬兑现）
  - 你的 typing rhythm 开始 **leak 到 UI 外**：主菜单字符级缓变 / 设置面板 hover 时出现你常打的字符 / 主标题"打字肉鸽"偶尔显示成你修改过的某个措辞（与现有"Cycle 6+ 字符级缓变作为污染症候"设计一致——现在有了主体）

- **📦 遗物层 · L4-L5 显形，没有 L6**：
  - L4 = "同期 Subject 死亡 / 失踪记录"完全可见。"前任作者 Subject XX 于 Cycle Y 进入特殊勤务"——**格式与刚才你收到的 boilerplate 完全相同**（D32 兑现）
  - L5 = 文档**最深一层**——你能读到 anomaly 本体直接写的注。但 L5 **不在你以前拣过的遗物里**——L5 在 endless 模式新生成的"自由打字区记录"里。这些记录的笔迹是你自己的，但你不记得写过（D8 反身闭合最深一层）
  - **没有 L6**——再下一层就超出"可被任何 reader 读到的文档"范围。你不再是 reader。你是 **rule-generating subject**

- **🔧 技能层 · 技能从你身上 emit**（D25 v2 极致）：
  - 你不再选 affix——affix 自己显形在你的工位
  - 你不再 build skill——skill 是你 type 出 word 的副产品
  - 技能彻底变成 anomaly 的 expression，而你已是 anomaly 的 voice，所以**技能就是你的 voice**

---

#### 情绪目标（曲线）

| 阶段 | 玩家心境 |
|---|---|
| **早段（endless cycle 1-3）** | 以为是新挑战 / power fantasy 巅峰 / 终于"通关"了 |
| **中段（cycle 4-10）** | 渐渐意识到没有清算 / 没有 milestone / 没有 ending / 同事消失但没人通知 / 公司不再回应 |
| **后段（cycle 10+ / 几小时后）** | 玩家会从屏幕上挪开视线，想"我现在是在玩，还是在被玩？" |
| **极致** | 玩家**第一次**意识到自己以前 endless 写的 modifier 出现在新职业 run 的 boss 嘴里——**D8 反身闭合的最暴力兑现** |

---

#### 唯一逃脱机制 = 不玩 endless（D17 + 第 5 职业级联）

- 通关 4 职业后**不点 endless 入口** = 保住猴子状态
- 但游戏**不奖励、不告知、不庆祝、不在主菜单留任何"你做了正确的事"的提示**
- 这是 D7 + D5 的最高潮：**最对的事是不做的事；但游戏不会让你知道你做对了**

---

#### 本章不应出现

- 任何"endless 进度" UI / "完成度 / 完成率"
- 任何"endless 通关"概念（D5 极致兑现）
- 任何 NPC / 同事 / 公司主动联系（员工层退场）
- 任何"清算 / 终局 / 真相"提示
- 任何"恭喜达成 X" popup
- 任何让玩家觉得"游戏知道你在玩 endless"的 self-aware UI 闪光
- 任何 endless-exclusive 的"新音乐 / 新调色板 / boss 化背景"——视觉上 endless 与正常 run **不应有显著区别**（这正是 horror）

---

#### 埋下的 hooks（向下周目）

- 玩家工号 → 下周目其他职业 run 的 L3 footnote 出现这个工号
- 玩家写的 modifier → 下周目其他职业 boss tooltip
- 玩家在自由打字区写的"致后来者"→ 下周目其他职业 Ch.1-2 工作台便签
- 玩家最后一次 cycle 的 typing rhythm → 下周目主菜单字符级缓变
- ⇒ **反身闭合的最终形式：每个 endless 玩家都是下周目所有玩家的"前员工"**

---

#### 关键设计纪律

- **入口仪式 = 升格仪式 + 处置程序 同步发生**（C1 + D32）
- 公司 boilerplate 与 Ch.2/Ch.3 升职**完全相同 template**（D32 + 反身闭合）
- 字符级缓变只在 endless cycle 6+ 启用（与现有设计一致）
- D8 反身闭合的兑现要 plausible，**不要 popup**：
  - ❌ "你的签名出现在了 [某玩家] 的 run 中"
  - ✅ 让玩家自己 cross-reference 才发现
- **成功标志**：玩家在某次正常（非 endless）run 里 cross-reference 到一个 boss modifier，发现签名是自己以前 endless 的某次工号——**这一刻 horror 才完成兑现**

---

## 2.17 PARKING LOT（current）

| # | 项 | 状态 |
|---|---|---|
| PL-1 | 校对者 typing 机制设计 | 暂定（曾尝试 "签字键 + Reecho 池倾斜" 方向，回炉重审）|
| PL-2 | 蜕变者（修改者）机制重做 | 暂定（C-蜕 1~6 约束已下；与 PL-3 一起做）|
| PL-3 | 造词师（作者）机制是否需 reframe | 暂定（与 PL-2 一起做更经济）|
| PL-4 | endless 升格仪式具体形态 | ✅ **LOCKED 入口框架**（Ch.5 §入口仪式 / D32 双 voice）；UI 实现细节仍待 |
| PL-5 | endless modifier 写入本地存档实现路径（C4）| 暂定（实现层）|
| PL-6 | 章节叙事任务（Ch.1-5）整体改进 | ✅ Ch.3 重写完成（DRAFT v2）/ ✅ Ch.5 启动（DRAFT v1）/ ⏳ Ch.4 完整章节任务待展开 / ⏳ Ch.2 回炉（D31 套用 / D29 状态确认仪式可注入）|
| PL-7 | **B1-B9** 待 derive | Step 2 后续；v4.1 整合后 B 真理候选已浮现（流程 §0/§9/§10/§13/§16），可直接 derive |
| PL-8 | contract_reopened（设定壳/美学/伦理）formal 重审 | 设定壳由 D12 + v4.1 术语词表解决；美学由 D13 + D27 + D28 解决；伦理由 D14 v2 + D26 v2 + D30 解决——**contract_reopened 三件套已实质 closed** |
| **PL-9** | **NEW · Ch.4 完整章节任务 derive**（三轨 base 已锁，需展开成情绪目标 / 本章不应出现 / 埋下的 hooks / 关键设计纪律 4 段）| Ch.5 已启动后 Ch.4 是结构最薄的一章，应优先补全 |
| **PL-10** | **NEW · Ch.1 / Ch.2 回炉 v4.1**：Ch.2 应注入 D29 状态确认仪式（"主角第一次见同事被状态确认"——流程 §14 表）；Ch.1-2 中 MOKO 提及全部统一为"灵长接口" | 改动局部，不重写整章 |
| **PL-11** | **NEW · 灵长接口（PI）的 in-game UI 文案 / theme 落地** | 跨 narrative→UI 边界，需要与 designer 一起做 |

---

_暂停于 2026-05-04 (v4.1 整合)。下次 continue 推荐入口：_
1. **PL-9** — Ch.4 完整章节任务 derive（最经济，结构空洞最大处）
2. **PL-7** — B1-B9 derivation（v4.1 整合后浮现的 9 条候选见对话记录）
3. **PL-10** — Ch.1/Ch.2 回炉（最小改动，最大一致性收益）_
