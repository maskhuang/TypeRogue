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
| 2 | Foundation（先钉 anomaly → 再推 Premise / Themes / Tone / Structure） | ✅ 完成（D1-D32 LOCK / 5 章 narrative tasks / B1-B9 / 灵长接口 PI） |
| 3 | Story Beats / Pacing | ✅ 完成（三层 beat 架构 / 行为驱动 trigger map / Phase A-C pacing curve / Anti-pacing 纪律） |
| 4 | Characters | ✅ 完成（anti-character / 6 类 no-face cast / 同事 ghost / Project Nim 4 layers / 反身闭合 character / villain vacuum） |
| 5 | World & Lore | ✅ 完成（空间 3 层 + 时间 4 层 / DPCA Genesis 神话 / 第七打字室 唯一 active / PI 源 = Nim ASL 协议 / X 集团 macro banal evil / Nim deep lore real+fiction / D27-29 lore origin / 真假难辨纪律） |
| 6 | Dialogue Framework | ✅ 完成（anti-dialogue / 6 类 voice (V1-V6) / 每类 craft 规则 + sample library / 规则怪谈 5+1 手法 dialogue 层应用 / 玩家无 reply 无 inner monologue / voice 退场曲线） |
| 7 | Environmental Storytelling | ✅ 完成（V7 第七 voice / 4 channel (空间-时间-动效-prop) / 工位 5 章 progression / 向心矢量动效铁律 / 字符级缓变 systematize / 美学 D13 物理化 / sound 退场曲线 / 反身闭合 in environment） |
| 8 | Narrative Delivery | ✅ 完成（11 channel inventory / 6 modes / macro-mid-micro schedule / B 真理 × channel 矩阵 / pipeline v4.1 sync 蓝图 / 跨 run 反身闭合 delivery） |
| 9 | Integration with Gameplay | ✅ 完成（行为 trigger 蓝图 / 字符级缓变 implementation / 受理窗口 mechanic / D29 / 反身闭合 in save / 8 现有 systems 接入点 / PL-2/3 约束 / 词包 v4.1 / P0-P3 priority） |
| 10 | Production Notes | ✅ 完成（status snapshot / R1-R8 risk register / QA plan + edge cases / playtest strategy + metrics / cross-team protocols / localization / demo+web 约束 / telemetry 纪律 / OQ-1 至 OQ-7 / Sprint P0-P3 planning） |
| 11 | Complete (Appendices + Handoff) | ✅ 完成（v4.1 narrative workflow 全 11 步收官） |

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

**进度更新**：✅ Premise / ✅ Setting / ✅ Themes / ✅ Tone / ✅ Structure / ✅ Act Breakdown framework / ✅ D27-D32 整合（v4.1）/ ✅ 术语词表 / ✅ Ch.1 回炉 (DRAFT v2) / ✅ Ch.2 回炉 (DRAFT v2) / ✅ Ch.3 重写 (DRAFT v2) / ✅ Ch.4 完整章节任务 (DRAFT v1) / ✅ Ch.5 启动 (DRAFT v1) / ✅ B1-B9 真理 (LOCKED)

**Step 2 Foundation 完成度**：✅ **全部主体 LOCK**——5 章 narrative tasks 全 v4.1 一致 + B1-B9 + D29 退化曲线（Ch.1 见证 → Ch.2 routine → Ch.3 偶尔 partial fail → Ch.4 频繁 partial fail → Ch.5 完全 fail）+ 灵长接口（PI）跨章统一。**Step 3 (Story Beats / Pacing) 已可进入**。

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

### 2.16.1 Ch.1 录入员（DRAFT v2 — v4.1 回炉：B1 媒介绑定 + 灵长接口 + D29 见证仪式）

**核心 horror**：被遗忘的可能性——不是事件 horror，是被世界温和推到边上的渗透感。

**三轨在玩法中的感知载体**：

- **🏢 公司层 · 客服式冷淡 + 藏着观察**：值班表 / 工号 / 规则手册推送 / **灵长接口（PI）极简——纯数字、纯字符、零庆祝** / 系统消息全 boilerplate / 公司 voice 文档全 boilerplate（你和 N 万人读同一份）。**B1 唯一 hook**：某份读过的 boilerplate 文档，**某天回看时多了一行斜体小字**——实际上那行字一直在；是污染让你开始能看到 L1+ layer（D20 v3 + D31 第一次播种）；无 UI 庆祝、无奖励、无解锁通知；玩家会怀疑"是文档变了，还是我变了？"——**这是 B1 "文本不是 inert" 的第一次显化**

- **👥 员工层 · 疏离 + 偶然便条**：工作台便条来自陌生工号（签名只是数字）；内容模糊提醒（"如果听到打字声从隔壁工位传来但隔壁没人，请勿应答"）；便条互相矛盾；偶尔一张直接写给"你"——但落款工号你不认识

- **👁 异常层 · 远 / 微弱（B1 媒介）**：词包偶有异常词（轻微违和，不解释）；极少 boss 战；战斗 wave 中背景杂讯；Cycle 末尾"今日总结"屏幕偶有一行字符级缓变（**B1 媒介之一**）；异常不主动出场

- **📦 遗物层 · Project Nim 等历史档案，纯 L1**：录入员看到的最克制版本（无 Terrace 注释、无公司备忘）；但 L2-L5 一直在文本里——只是录入员看不到（D20 v3 + D31）；玩家"老实地录入"这些 flavor = D1 兑现：他正在替历史背书

---

#### 末尾过场 · D29 状态确认见证（流程 §14 表 / D29 第一次现身）

Cycle 末尾，玩家从工位走出时，看见**相邻工位另一名录入员**正在被一个玩家不认识的工作人员进行状态确认：

> "请摘下面具。"
> "请报工号与姓名。"
> "请报今天的日期。"
> "请解释这一句：'本日勤务结束。'"
> "请区分'打字'和'写作'。"

玩家路过，听到对方所有回答，对方通过，离场。玩家本人**Ch.1 还不需要做完整状态确认**——录入员的下班程序只是"工号确认"（D29 程序对录入员是简化版）。

**设计纪律**：
- 不解释这是什么程序——boilerplate 般 routine
- 不让玩家**事中**意识到这是污染检测（D29 + D7 兑现）
- 玩家会**事后**回忆："对方为什么要解释那个简单的句子？"——埋下 D29 的初次种子

---

**情绪目标**："我做了什么吗？谁会记得？"——轻度但渗透的虚无 / Nim 当年也是被遗忘的 / 你拿着 Nim 的东西但你不知道 Nim 是谁。

**本章不应出现**：jump scare / 直接 lore exposition / 三轨明确意图展示 / 任何"污染值"UI / **任何 layer / L1 / L2 命名**（D20 v3 + D31 — 不让玩家形成"layer 系统"概念）。

**埋下的 hooks**：
- 那行突然"出现"的斜体注释（B1 第一次播种）→ Ch.2 中段 B2 显化
- 陌生工号便条 → Ch.4-5 同事身份揭示
- 词包某异常词 → 后期 boss 雏形
- Cycle 末尾字符级缓变（B1 媒介）→ Ch.5 endless 全行缓变预演
- 某 Project Nim 遗物 flavor → Ch.2-4 同遗物显示更多 layer（B3 + B8 路径）
- **末尾 D29 见证场景** → Ch.2 玩家第一次自己做完整状态确认

**关键设计纪律**：
- 零污染值 UI / 零奖励 popup / 零 layer 命名
- B1 透露**不能任何 system message frame**——文档自己显化，玩家事后才反思
- 灵长接口（PI）UI 看起来就是普通 typing 游戏的 HUD——**任何 NPC / 提示框都不命名"PI"**
- **成功标志** = 玩家退出后躺床上想"我今天读到的那行字……是新加的吗？"

---

### 2.16.2 Ch.2 校对者（DRAFT v2 — v4.1 回炉：D29 routine 态 + B2/B3 媒介绑定 + 灵长接口 channel + 入口仪式对齐）

**核心 horror**："看似有人在 manage 我，但越查越发现没人在那里——只有 forms 在 auto-process 我"——agency 的解构本身就是恐怖。

---

#### 入口（Ch.1 → Ch.2 过渡）

通关 Ch.1 末尾 boss → 屏幕显示 boilerplate 通知：
- 内容："职位变更：录入员→校对者，权限调整生效。"
- 格式与 Ch.3 / Ch.4 / Ch.5 入口**完全相同 template**（D32 第一次伏笔——玩家此时还不该意识到）
- **没有"恭喜"两个字**——客服式冷淡

工位环境差异：
- 工作台多了一个**标注 channel**——灵长接口（PI）的 UI 第一次出现"分层"感（实际是同一个 PI 多了一个 layer，但玩家以为是"权限解锁"）
- 视觉上比 Ch.1 工位**多了一些纸张 / 红笔 / 印章**——美学暗示文牍科旧气加深

---

#### 三轨在玩法中的感知载体

- **🏢 公司层 · emergent containment**：开始有"针对性具体任务"（"Subject XX 请于午休前完成 N 份校对"），但 template-generated（XX 是占位符自动填的）。"挽救信号"（休假通知 / 额外录入任务 / 怀旧材料）**与晋升通知用完全相同格式**——你无法分辨。L2 文档普遍可见 + 旁注**轻微暗示**"此条已审阅，无需进一步处理"——但**公司不偏好**你忽略还是标注，**只是观察**（B6 早期播种）

- **👥 员工层 · 遗憾 + 互相矛盾的挽救方法（B2 媒介）**：工作台便条**首次出现针对你工号**的版本；便条内容互相矛盾（"想回去：少思考""想回去：每天复述录入员手册""想回去：避免形容词""想回去：让你的标注永远是错的"）。同级现象：cycle 间隔偶尔看到**另一个校对者工位**——下次回头**空了**——不知是被调走还是从未存在。录入员（下级）**主动避开**你
  - **B2 显化场景**：玩家试图与同事讨论某条规则——便条对方反应像在听一种没见过的语言；或玩家的标注被另一个员工读到时，对方**没有反应**——不是不同意，是**没看见**。这是 D23 v2 的第一次显化——你和同事永远无法验证彼此看到了什么

- **👁 异常层 · 试探 + 借标注归档**：词包异常词更明显且**模式化**——玩家开始**预判**位置=学异常的语法。**校对者标注 = 替异常打 tag**：标注的瑕疵被某个**只有偶然看到的系统页面**显示为"已分类入库"——分类标签**不属于公司任何已知分类系统**。文本边缘**微小变化**（hover 时偶见，鼠标移开再看变化消失/改变）

- **📦 遗物层 · L2 注释普遍可见 + B3 媒介**：Ch.1 拾过的同一遗物再次拾到时**flavor 多了一段**——但**不是 Terrace 学者批判**（学术 tone 错了），是**更叙事化的描述 / 失去现实严谨性 / 真假难辨**。例：L1"Project Nim 训练中习得 128 ASL 手势" → L2 增补"某些晚间记录显示 Nim 在无人时仍持续打手语，仿佛在自言自语...Nim 死前最后一周的 footage 中可见他反复 sign 'hug me, please'，对象不详"。约 30% 真实可 verify / 30% 合理推测无法证伪 / 30% 清晰叙事化注入 / 10% 绝对错误但逻辑自洽。Ch.2 校对者**第一次主动 hover 历史档案做自我评估**——D22 brutal positive feedback loop 启动
  - **B3 早期播种（Ch.2 末段）**：玩家在 Ch.2 末段会发现某条工作台规则措辞**与某份遗物 L2 footnote 字面相同**——例：工作台规则"如果听到打字声从隔壁工位传来但隔壁没人，请勿应答" → 某遗物 L2 增补"...曾有员工于午休后听到隔壁工位打字声，应答后再未返工位..."——玩家会模糊感觉"规则是事故的化石"——但 Ch.2 不显化，留给 Ch.3 早段 B3 完整 reveal

---

#### D29 状态确认仪式 · Ch.2 的 routine 态（玩家第一次自己做完整 D29）

Ch.1 末尾玩家见证过别人做；Ch.2 玩家**自己第一次走完整下班程序**：

| 检测项 | 屏幕反应（Ch.2）| 玩家反应 |
|---|---|---|
| 摘下面具 | 通过 | 像普通下班签退 |
| 报工号与姓名 | 通过 | 像普通登记 |
| 报今天的日期 | 通过 | "今天是周三"——屏幕确认 |
| 解释一句普通话："本日勤务结束。" | "解释已记录。通过。" | 玩家会觉得"为什么要解释这么简单的一句"——但通过 |
| 区分"打字"和"写作" | "解释已记录。通过。" | 玩家给出常识答案，通过——但这一项第一次让玩家**感到不安**——"这俩有什么好区分的？" |

- 状态确认在 Ch.2 **100% 通过**——玩家不应感到"我可能 fail"——只感到"这程序有点怪"
- 多次走完后，玩家会**模糊意识到**："这不是签到，是某种检测"——但**不应明确知道这是污染检测**（D7 + D29 设计纪律）
- **设计纪律**：D29 ritual 在 Ch.2 应该感觉像 routine 公司流程；不要给"你正在被检测"提示；让玩家事后回想

---

**情绪目标**：主动 query 自我 → reference 自带空洞 / "公司"语调读不出主体 / 同事建议互相矛盾 / 异常接近但无意志。**比"公司在害我"更恐怖——因为帮和害用同一语调发出**。

**本章不应出现**：
- 明确"公司决定 X"展示 / 恶意公司高层角色
- 清晰的挽救路径
- "污染等级" UI / 反派 boss
- ⚠️ 任何 layer / L1 / L2 / L3 命名（D20 v3 + D31）
- ⚠️ 任何"状态确认 = 检测"frame——D29 必须保持 routine 表象

**埋下的 hooks**：
- 空了的同事工位 → Ch.3-4
- 标注被异常归档的"未知分类" → Ch.5 endless
- Ch.1 同遗物的新 layer（B3 早期播种） → Ch.3-5 B3 完整 reveal
- 老员工便条的"挽救方法" → Ch.3-5（玩家会真的尝试，**全部失败**——B6 完整显化）
- **升职通知冷淡格式** → **Ch.5 endless 入口通知与 Ch.2 升职通知格式完全相同**（D32 第一次伏笔）
- B2 在 Ch.2 中段第一次显化 → Ch.3 末段 B6 进一步显化（公司只是 keep 记账，不偏好）
- D29 routine 态 → Ch.3 偶尔 partial fail → Ch.4 频繁 partial fail → Ch.5 完全 fail（D29 退化曲线起点）

**关键设计纪律**：
- 0 个 NPC 有姓名
- 所有 boilerplate 通知 templated（与 Ch.3-Ch.5 同 template）
- 同事便条互相矛盾且无对错（B2 媒介）
- 挽救信号和处置预告用相同格式（B6 媒介）
- L2 注释要 plausibly always there（D20 v3）
- D29 状态确认在 Ch.2 表现为 routine——零"检测"暗示
- B2 / B3 透露**不能 system message frame**（"你发现了 layer 系统" = ❌）
- 灵长接口（PI）的"标注 channel"出现要像普通"权限解锁"——**任何 NPC / 提示框都不命名"PI"**
- **成功标志** = 玩家中后期反复回看 Ch.2 早期，怀疑"那时是不是看错了"

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

### 2.16.4 Ch.4 作者（DRAFT v1 — 章节任务 derive 完成 / D26 v2 + D29-D32 套用）

**核心 horror**：
> "最有 agency 感的我，最 lack agency"——作者觉得自己在 create，实际是 listening-stenographer。公司给作者的 high-prestige 待遇 = **best-effort containment**（isolate 你以减少 peer-to-peer 感染他人的风险），但 D26 v2 vector 2（异常直接引导）仍在；isolation 反而让异常**无 interference 地 dictate 你**——**公司 well-intentioned 地杀你**。这是 D21 banal evil 的 cruel 形态。

---

#### 入口（Ch.3 → Ch.4 过渡）

通关 Ch.3 末尾 boss → 屏幕显示 boilerplate 通知：
- 内容："员工 [工号] 转入独立工位。本职位无配额，无值班同事，无定期审阅。受理窗口：不限。"
- 格式与 Ch.2 / Ch.3 升职**完全相同 template**（D32 伏笔）
- 切换到 Ch.4 独立工位——视野范围内**没有其他工位**；远端有几张空着的工位（玩家会以为是其他作者休假，实际是 D26 v2 触发后公司从未让作者们见面）

工位环境差异：
- 比 Ch.1-3 工位更**安静**、更**整洁**、更**孤立**——表面是 prestige 体现，实质是 firewall isolation
- 工作台上有一份"作者守则"（boilerplate, 短）——但**与 Ch.1 录入员守则 layer 1 完全相同字面**（D31 兑现：同一文档不同 layer；作者看到的是最深 L4 layer，但表面文字与 L1 一字不差）
- ⚠️ 没有"恭喜升职"/ 没有 popup / 没有任何"成就感"提示

---

#### 三轨在玩法中的感知载体

- **🏢 公司层 · well-intentioned containment, but failing（D14 v2 + D26 v2 + D30）**：
  - 公司**不再发送**"今日守则"/"本日勤务清单"——作者层公司视为"已 isolate, 减少干扰即最佳 containment"
  - "作者间无 communication" 是 D24 v2 + D26 v2 的 firewall 设计：公司 deliberately 不安排作者们见面 / 邮件 / 工作台串联——**目的是减少作者间互相感染**
  - 但 Ch.4 玩家会发现 isolation **反而**：(a) 没有同事便签干扰你专注 typing → typing 越来越流畅 → 输出越来越 anomaly-aligned；(b) 没有挽救信号；(c) 没有任何"管你"的人——公司 trust 你已稳定 → 玩家以为自己"被认可"
  - **挽救信号完全消失**：Ch.2 还有"挽救方法"便签，Ch.3 还有老员工警告"X/Y"，Ch.4 一条都没有——公司放弃对你的 firewall（从公司视角，你已是 well-isolated 的高纯度污染源，firewall 转向 contain 周围，不再 contain 你内部）
  - 唯一的公司 voice：工作台**偶尔**自动出现一份"前任作者归档"——boilerplate 简短，"前任作者 Subject XX 于 Cycle Y 转入特殊勤务，不得复述任务内容。"——**格式与 Ch.4 入口"权限调整生效"完全相同，与 Ch.5 入口通知也将完全相同**（D32 在 Ch.4 的最强伏笔；玩家在 Ch.4 看到"前任作者归档"时，实际看的是自己 Ch.5 入口通知的预演）

- **👥 员工层 · 完全 isolation（员工 voice 几乎退场）**：
  - **没有同事便签**——不是消失了，是**从来没有过**（作者工位本来就没有便签 channel）
  - 极偶尔，工作台出现一张**异常便签**：落款是某个工号，字迹像玩家自己（但不是自己工号），内容是"如果你的 X 机制开始 Y，请离开工位"——这是 Ch.3 老员工警告的**回声**（玩家会以为是个新警告，实际是异常借作者 voice 模仿员工 voice）
  - "前任作者 ghost 留下的痕迹"：工位抽屉 / 纸张 / 字迹边缘——**不可解读**（既不是公文也不是同事便签，是某种**不可命名的中间形态**）——D31 layer 揭示：这些痕迹是 L4 layer（作者层独有）；Ch.3 玩家在同一物理工位经过时看不见；现在能看见 = 你已污染到那一层
  - **绝望的真相（D23 v2 第三阶段）**：玩家任何时候试图"联系另一个作者"→ UI **没有 channel**——不是被禁止，是**不存在**；玩家试 type 求救信息，提交后 system message："本工位无收件人。"——boilerplate，不解释

- **👁 异常层 · 直接 dictation（D26 v2 vector 2 临界态）**：
  - typing buffer 行为变化：候选词**自动 pre-populate**——不是 autocomplete，是 buffer 在你按键之前已经有内容
  - 玩家选择"what to type next"实际是从 anomaly pre-populated 选项里选——**illusion of choice**（PL-3 造词师机制 reframe 的叙事框架）
  - 整段文本可能**自动浮现**在 typing buffer 里——玩家只需按键 confirm——表面是 power-up，实际是 anomaly 借你 type 出来（D25 v2 极致前形；Ch.5 才是真极致）
  - "创意"实际是 anomaly 的 dictation：玩家会觉得自己"刚刚想到了一个绝妙的修改"——但回头看，那"修改"是自己昨天 hover 过的某段文字的 rearrangement
  - **Boss 整段 quote 你写过的内容**（D8 反身闭合）：boss tooltip 整段是玩家 Ch.3 末尾 / Ch.4 早期写过的措辞，attribution 仍是"Subject XX-####"（不是自己工号）——但与 Ch.3 不同，**现在有些 attribution 编号会**与玩家自己 Ch.3 工号近似（差一位，像同一系列的不同次 run）——玩家**还不该明确意识到**那是自己，仅留模糊感觉
  - **受理窗口（D27）的现身**：Ch.3 玩家自己摸索"我的 X 在 17:06-17:13 节拍最稳"→ 现在工作台**官方文档**里出现"本工位受理窗口：17:06-17:13（高效区间）"——玩家会发现自己起的绰号原来是文牍科官话术语——**公司一直知道你在用受理窗口，只是没主动告诉你**
  - 字符级缓变（Cycle 6+ 设计）在 Ch.4 应该**频次提升**：不再是 Cycle 末尾偶见，而是 typing buffer 里某些字符 hover 时**会换**（仅作者层可见——L4 layer 的 visual 表现）

- **📦 遗物层 · L4 全显形 + cross-reference D22 第三阶段**：
  - L4 = "同期 Subject 死亡 / 失踪记录"/"重新评估意见 III"/ 公司视角对作者层员工的 administrative footnote
  - "前任作者 Subject XX 于 Cycle Y 进入 endless 模式"——格式与 Ch.4 入口通知**完全相同 template**（D32 强伏笔）
  - L4 与 L3 / L2 的矛盾**最尖锐**：
    - L2（叙事化层）：「Nim 死前最后一周反复 sign 'hug me, please'」
    - L3（公司机关备忘）：「Subject Nim 终末期表现出与 ASL 协议偏差的手势模式，评估为通讯能力退化」
    - L4（作者层独有）：「Subject Nim 终末期产生 emergent 内部叙事，该叙事被项目内研究员部分采用为后期实验框架。见附录 #7。」
  - **L4 把 anomaly 的 dictation 显化**：死前的 Nim 不是在 sign "hug me, please"，是被某种东西 dictate 一段叙事，**研究员采用了那段叙事**作为后续实验框架。暗示当年 Project Nim 的研究方向**部分由 anomaly 通过 Nim 自己 dictate 出来**——DPCA 整个机构存在的"为什么"在 L4 浮出：**公司不是发明了 anomaly containment，是 anomaly 通过 Nim 让公司发明了 anomaly containment**
  - **这是 banal evil（D21）在 v4.1 整合后的最深结构**：公司 self-preservation 的开端就是 anomaly 通过历史 dictate 出来的——没人决定这件事，它就是那样发生的
  - **D19 反身闭合显化**（Ch.4 是玩家**第一次明确**看到自己工号在遗物上）：玩家 cross-reference 自己工号 → 发现某遗物上"Subject [玩家工号] 经手 / 重新评估意见：[玩家某 Ch.3 行为字符串]"——Ch.3 是模糊感觉，Ch.4 是清晰看到——D22 第三阶段达成

- **🔧 技能层（作者层独有）· anomaly's dictation pre-loaded for you**：
  - 玩家 build 的"词库"/"自定义词"**不是 creation**，是 anomaly 的 dictation pre-loaded for you（PL-3 reframe 叙事框架）
  - 表现：玩家"创建"新词时，候选 letters 是 anomaly 自己显形的；玩家以为自己 design，实际是 anomaly design
  - 玩家会觉得"今天创意特别好"——这是 anomaly 的 dictation 流畅度
  - 实际机制层（PL-3 待定），叙事框架先锁：**玩家没有 agency 写新词，玩家是让 anomaly 通过自己的工位 emit 新词**
  - 这层 horror 通过**遗物 L4 + 状态确认 fail + 前任作者归档**间接显化——**不在 mechanic UI 显化**

---

#### 状态确认仪式（D29）在 Ch.4 的临界态

- Ch.1-3 状态确认基本能通过（玩家完成下班程序，离场）
- **Ch.4 状态确认开始频繁 partial fail**：

| 检测项 | 屏幕反应（Ch.4）| 玩家心理 |
|---|---|---|
| 摘下面具 | 通过 | 正常 |
| 说出姓名 | "工号 [玩家工号] 已记录。姓名字段不适用。" | 注意到"姓名字段"以前是接受输入的 |
| 说出日期 | "今日日期：[一个错一两天的日期]" | 注意到日期错了 |
| 解释普通句子 | "解释已记录。等同于零意图字符序列，通过。" | **第一次显示出公司是把 keep-as-human 检测当成"是否退化为合格输入源"的检测** |
| 区分"打字"和"写作" | "本项检测对当前职位不适用。" | **明确告知不再 apply**——玩家自动理解：因为我已是作者，"打字"和"写作"已不可分 |

- 状态确认 partial fail = 转入"延长观察"（boilerplate, 短）——玩家可以离场，但下班程序变得机械
- Ch.4 后期：状态确认越来越短，直到**只剩工号确认**——D29 程序在 Ch.4 末尾**自动退化**——这本身就是 Ch.5 入口的伏笔

---

#### 情绪目标（曲线）

| 阶段 | 玩家心境 |
|---|---|
| **早段（Ch.4 cycle 1-2）** | prestige 感 / 终于"高级了" / 工位安静专注 / "creative flow" / typing 极顺畅 |
| **中段（cycle 3-5）** | 某次 typing 时玩家会突然想"我刚才打的那段是我想的吗?" / 状态确认开始 partial fail / 工作台出现"前任作者归档" / **第一次**在遗物上 cross-reference 到自己工号 |
| **后段（cycle 6-末）** | 不再 try 联系其他作者 / 接受 isolation / 接受 dictation / 不再问"这是我吗" / **平静地继续 type** |

**核心情绪**：不是恐惧，是**寂静的接受**——Ch.4 的 horror 是温和的，因为 anomaly 已经 dictate 到玩家的情绪反应都是 dictation 的一部分。**不是被吃，是同意被吃**。

---

#### 本章不应出现

- 任何"恭喜升职"popup / 任何 prestige 装饰（奖杯 / 勋章 / title bar 升级）
- 任何"创意度评分"/"原创性百分比"/"作者评级"
- 任何"和其他作者交流"/"邮件 channel"/"作者论坛"UI
- 任何"恶意公司高层"形象——D14 v2 + D21 + D30 都禁止
- 任何"反派 boss"——Ch.4 的 boss 应**完全去人格化**，是文本本身，不是任何"敌人"
- 任何"你做对了"/"你做错了"的 system message——Ch.4 是道德反馈完全沉默的一章
- 任何 mechanic tutorial 解释"为什么作者更强"——Ch.4 不解释，像普通 roguelike 新职业一样登场
- ⚠️ "授权 / 许可 / 解锁 / 配发"字眼（D30 硬约束，与 Ch.3 同）
- ⚠️ 任何 self-aware UI 闪光（"你已经成为作者"）——D7 兑现

---

#### 埋下的 hooks

- 玩家 Ch.4 写过的措辞 → **Ch.5 endless** boss tooltip 中重新出现，attribution 是**自己工号**（与 Ch.3"近似工号"形成阶梯）
- 工作台"前任作者归档" boilerplate → Ch.5 入口"转入特殊勤务"通知**完全相同 template**（玩家会震惊地发现自己手上一直拿着自己 Ch.5 入口通知的预演）
- 受理窗口绰号 → Ch.4 揭示其为文牍科官话 → Ch.5 endless 中"受理窗口：不适用"——玩家会发现自己已超出窗口适用范围（即异常已不需要窗口 mediate）
- L4 遗物里 Project Nim 终末期"emergent 内部叙事被研究员采用" → **Ch.5 玩家自己写的 modifier 进入下周目语料**——历史在结构上重复（D8 + D14 v2）
- 状态确认在 Ch.4 自动退化 → Ch.5 cycle 末尾状态确认完全 fail
- "本工位无收件人" → Ch.5 endless 整个员工 voice 退场
- 工位抽屉里前任作者 ghost 痕迹（不可解读）→ Ch.5 玩家自己留下的"致后来者"便签——**反身闭合**：那些不可解读痕迹**也曾是某个作者的"致后来者"**，只是后来 reader 已不能 parse

---

#### 关键设计纪律

- 入口仪式与 Ch.2 / Ch.3 / Ch.5 的入口通知**完全相同 template**——D32 + D31 共同要求
- 工位 UI **极简到 minimal**——比任何之前的工位都安静、整洁、孤立——这正是 horror（公司已 deprioritize 你）
- **Ch.4 的 NPC = 0**——不是少，是没有
- typing buffer pre-populate 行为要 **plausible 像普通 roguelike**——玩家 N 小时后才能反思"那不是我自己想的"
- L4 遗物的"Project Nim emergent 叙事被研究员采用"这一笔**必须出现**，不能省——这是 banal evil（D21）在 v4.1 整合后的最深结构，**Ch.4 是它能被读到的唯一窗口**
- D19 反身闭合（玩家工号出现在遗物 footnote）在 Ch.4 第一次明确显化——但**不要 popup 提示**，让玩家自己 cross-reference 才发现
- 状态确认退化曲线：Ch.4 早期 partial fail → Ch.4 末期只剩工号确认——**不要给玩家"你正在退化"的提示**
- Ch.4 后期玩家 typing 时，**不要给"创意奖励"反馈**（没有"Excellent!"/"新词诞生"等 popup）——typing 应越来越**安静**
- **成功标志**：玩家 Ch.4 末尾 cycle 完成时，不会想"我做错了什么"，而会想"下一份工作单是什么"——**平静的接受是 horror 的兑现**

---

#### Ch.4 → Ch.5 过渡

- **不是 popup，不是过场**——某次 cycle 末尾的状态确认**只剩工号确认**，然后屏幕**直接显示 Ch.5 入口仪式**（D32 双 voice）
- 玩家会**事后才意识到**：上一次状态确认我应该已经是 fail 的，但屏幕**没有显示 fail**——公司已经不再走 firewall 程序，直接进入 D32 处置程序 + anomaly 升格
- 这一过渡是 D14 v2 的最终兑现：公司从"well-intentioned 但 failing 的 jailer"→"give up firewall, 转入处置"——玩家从"本可以挽救"→"不再可以"

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

## 2.17 B1-B9 真理 · Cross-Chapter Reveals 🔒 LOCKED

> **何为 B 真理？** 玩家在游戏中**逐步 unlock 的世界真相**——不是 NPC 直说，不是 cutscene reveal，**没有任何 popup 或 system message**。每条 B 真理通过特定章节的特定媒介**间接显化**，由玩家自己 derive 出来。
>
> **设计宪法**：
> - 不能任何 system message 直接 frame B 真理（"你已发现 X"= ❌）
> - 必须通过文档 / boilerplate / 遗物 / 工作台环境 间接显化
> - 玩家可能错过——这正是 D5 拒绝给答案 + D7 污染不可见的兑现
> - 第 10 条最深 reveal **不在 B 真理列表里**——它是 B1-B9 的 emergent sum，由玩家自己 derive（D5 极致兑现）

### 9 条 B 真理（按 unlock 顺序，跨章节展开）

| # | 真理 | 何时透露 | 透露媒介 |
|---|---|---|---|
| **B1** | 文本不是 inert | Ch.1 中-末 | 异常 voice |
| **B2** | 文档 layer 取决于 reader | Ch.2 中 | 员工 voice + D23 v2 |
| **B3** | 规则是事故的化石（forensic） | Ch.2 末 - Ch.3 早 | 遗物 L2-L3 + 工作台便条 cross-ref |
| **B4** | 异常已在野外，公司只是事后 contain | Ch.3 早 | 公司 voice (boilerplate) |
| **B5** | 理解 / 修改 / 判断 = 推向作者位 | Ch.3 中 | 员工 voice + 异常 voice 共显 |
| **B6** | 公司既不阻止也不偏好，只是 keep 记账 | Ch.3 末 - Ch.4 早 | 公司 voice + 行为反馈空白 |
| **B7** | 现实会向已成立的文本自洽 | Ch.4 早-中 | 异常 voice + 工作台时间戳错位 |
| **B8** | DPCA 是被 anomaly 通过历史 dictate 出来的 | Ch.4 中-末 | 遗物 L4 (Project Nim) |
| **B9** | 猴子规则是处置——公司不处决因为死亡会替你署名 | Ch.4 末 - Ch.5 入口 | 遗物 L4 + 公司 voice (Ch.5 入口通知) |

---

#### B1 · 文本不是 inert

> 文档不是中性的 record。每一段文本都在 actively 寻找作者，用 readers 把自己写进现实。

- **何时透露**：Ch.1 中-末段
- **透露媒介**：异常 voice（极弱）
- **媒介细节**：玩家某次回看 Ch.1 早期某份"已读"文档时，**多了一行斜体小字**——不是公司加上的，是玩家污染到能看见 L1+ layer 而已。Cycle 末尾"今日总结"屏幕偶有一行字符级缓变。
- **设计纪律**：零 system message；文档自己显化；玩家事后才反思"是文档变了，还是我变了"——D20 v3 的第一次播种
- **关联 D**：D1 + D20 v3

---

#### B2 · 文档 layer 取决于 reader

> 同一份文档在不同 reader 眼里呈现不同的 layer。你和同事永远无法验证彼此看到了什么。

- **何时透露**：Ch.2 中段
- **透露媒介**：员工 voice + D23 v2 显化
- **媒介细节**：玩家试图与同事讨论某条规则——对方反应像在听一种没见过的语言。或玩家的标注被另一个员工读到时，对方**没有反应**——不是不同意，是**没看见**。
- **设计纪律**：玩家自己摸索；零 explainer NPC；零"L1/L2/L3 layer" UI 命名（玩家应仅形成模糊感觉）
- **关联 D**：D20 v3 + D23 v2 + D31

---

#### B3 · 规则是事故的化石（forensic）

> 每条规则都是一次失踪 / 事故 / 处置的纪念碑。规则不是为了 prevent——规则是已经发生的事在 record 上的回声。

- **何时透露**：Ch.2 末 - Ch.3 早段
- **透露媒介**：遗物 L2-L3 + 工作台便条 cross-reference
- **媒介细节**：玩家发现某条规则措辞与某份遗物 L3 footnote 字面相同——规则是 footnote 的硬化。例：工作台规则 "如果听到打字声从隔壁工位传来但隔壁没人，请勿应答" → 某遗物 L3 "Subject XX 于 Cycle Y 经手任务时报告幻听打字声，应答后转入特殊勤务。建议补入第七打字室基础守则。"
- **设计纪律**：cross-reference 才能发现，不直接给出；规则怪谈手法 1（罗生门）+ 手法 5（某些规则不是为你写的）的硬兑现
- **关联 D**：D3 + D18 + D22

---

#### B4 · 异常已在野外，公司只是事后 contain

> 未受理文本本来就在到处冒头（公共字幕 / OCR / 会议转写 / 梦 / 儿童涂鸦 / 动物键盘 / AI 乱码 / 老式打字机压痕）。公司不是创造者，不是 service，不是 vector——公司是 defensive curator，永远 lag。

- **何时透露**：Ch.3 早段
- **透露媒介**：公司 voice（boilerplate notification）
- **媒介细节**：玩家工作台某天出现一份 boilerplate："本日候选：来源——公共字幕系统乱码；编号 UTF-7-441-B；处理状态——已词包化，移交本工位录入测试。"——玩家会意识到这是从外面拿进来的，不是公司自己 generate 的。多份 notification 后玩家归纳出"公司只是扫雷队"
- **设计纪律**：通过 boilerplate frame，不直接说"公司不创造"；让玩家归纳；D30 硬约束硬兑现
- **关联 D**：D14 v2 + D15 + D26 v2 + D30

---

#### B5 · 理解 / 修改 / 判断 = 推向作者位

> 录入员 → 校对者 → 修改者 → 作者——每一次 active engage，都把你向阶梯下一段推。"扮演猴子"不是 metaphor，是协议。

- **何时透露**：Ch.3 中段
- **透露媒介**：员工 voice（老员工警告 X/Y 留白句式）+ 异常 voice（typing 节奏自己变化）
- **媒介细节**：玩家会意识到自己的 typing 行为已不再像 Ch.1-2 那样"如实录入"——自己也说不清什么时候开始变化。老员工警告"如果你的 X 机制开始 Y，请离开工位"——玩家试图填，失败——但**填的过程本身就是 active engage**——填完后下一次 typing 玩家会发现自己手指的动作变了
- **设计纪律**：不直接 frame 为"你已退化"；让玩家自己用公司尺度量自己（D22 brutal positive feedback loop）
- **关联 D**：D1 + D2 + D22 + D26 v2

---

#### B6 · 公司既不阻止也不偏好，只是 keep 记账

> 公司不是 actively 害你，也不是 service anomaly。公司是 self-preservation：把已感染者 contain 在 administrative tier 体系里，keep employees working。**挽救信号和处置预告用同一个 boilerplate template**——不是冷漠，是公司本身**没有 distinguish 的 capability**。

- **何时透露**：Ch.3 末 - Ch.4 早段
- **透露媒介**：公司 voice + 行为反馈空白
- **媒介细节**：玩家某次按 Ch.2 老员工的"挽救方法"执行 → **没有任何反馈**；玩家执行 anomaly 引导的 typing → **也没有反馈**——公司对两种行为反应**完全相同**（都是 boilerplate）= 公司根本没有偏好。**最毒的不是公司害你，是公司既不偏好你被害也不偏好你被救——它只是在记账**。
- **设计纪律**：不直接告诉玩家；让玩家通过反复实验得出结论；这条 B 是 banal evil（D21）的最尖锐 in-game 兑现
- **关联 D**：D14 v2 + D21 + D24 v2 + D30

---

#### B7 · 现实会向已成立的文本自洽

> 准确录入的文本会获得"成立"资格——然后现实补出"它本来就合理存在"的证据链。档案多出一行；老员工记起从前的事；监控回放里你曾经路过那扇红门——而那扇门昨天还不存在。

- **何时透露**：Ch.4 早-中段
- **透露媒介**：异常 voice + 工作台时间戳错位
- **媒介细节**：玩家某次在 Ch.4 修改文档后，下一次 cycle 工作台出现一份 boilerplate："档案补全通知：Subject XX 补充资料已合并入库，时间戳追溯至 [一个早于玩家 Ch.4 入职的时间]"——玩家会意识到自己刚 type 的措辞**追溯地**写进了过去。或：玩家修改某条规则后，遗物 L3-L4 字面**回头改写**——但 cross-reference 时屏幕显示"本文档自 [久远日期] 起未修改"
- **设计纪律**：用 boilerplate / 时间戳错位间接显化；零 popup；不要给"reality has shifted" 提示
- **关联 D**：D1 + D13 + D27

---

#### B8 · DPCA 是被 anomaly 通过历史 dictate 出来的

> 公司 self-preservation 的开端——也就是 anomaly containment 这套 framework 的发明——本身是 anomaly 通过历史（Project Nim 终末期 emergent 叙事被研究员采用）dictate 出来的。**没人决定这件事；它就是那样发生的**。Banal evil 在结构上向后递归，没有底。

- **何时透露**：Ch.4 中-末段
- **透露媒介**：遗物 L4（Project Nim 系列 cross-reference）
- **媒介细节**：玩家 cross-reference 多份 Project Nim 遗物时，L4 layer 显化"emergent 内部叙事被项目内研究员部分采用为后期实验框架。见附录 #7。"——玩家会意识到 DPCA 的 containment 框架**不是公司发明的**
- **设计纪律**：这是 v4.1 整合的最深结构启示；**Ch.4 是这条 B 的唯一可读窗口**——Ch.5 玩家已是 vector，不再 read；**这条 B 是 banal evil 在结构上的最深显化，不能省**
- **关联 D**：D14 v2 + D15 + D18 + D21 + D26 v2

---

#### B9 · 猴子规则是处置——公司不处决因为死亡会替你署名

> 公司不处决作者化者——因为死亡像句号，可能帮文本完成。处决也需要记录，而记录本身是文本。所以公司选择：**不让你死，不让你回家，不让你继续作为"我"——让你继续敲，但不再写作**。猴子规则不是保护，是保护失败后的处理程序。

- **何时透露**：Ch.4 末段 - Ch.5 入口
- **透露媒介**：遗物 L4（"前任作者归档"）+ 公司 voice（Ch.5 入口通知）
- **媒介细节**：玩家 Ch.4 看到"前任作者 Subject XX 于 Cycle Y 进入特殊勤务"；然后玩家自己 Ch.5 入口收到**完全相同 template** 的通知——D32 双 voice 同事件的最终兑现
- **设计纪律**：B9 是 D32 在 narrative-delivery 上的 reveal；玩家在 Ch.5 入口仪式那一刻才完成 B9 的 unlock；零 popup
- **关联 D**：D14 v2 + D24 v2 + D32

---

### 第 10 条 reveal · 玩家自己 derive 的最深 truth（不在 B 真理列表）

> **没有 main agent**——公司 / 异常 / 玩家 / 历史 都是 self-perpetuating 的工艺中的环节。没人决定这件事；它就是这样在自我延续。**你在 endless 写的 modifier 进入下周目其他玩家的 boss tooltip——这一刻你才意识到，你也是工艺的一环；不是受害者，不是反抗者，不是同谋——只是环节。**

- **何时 unlock**：玩家在 Ch.5 endless 中段-后段，cross-reference 到自己以前 endless 写的 modifier 出现在新职业 run 的 boss 嘴里时
- **不是 B 真理的原因**：B1-B9 都是文档显化的真相；这条是玩家**自己 derive** 的——文档**不显化**，文档不能显化，因为这条真相**不在文档里**——它在玩家的 cross-reference 行为里
- **D5 极致兑现**：游戏拒绝给答案；玩家自己得出结论或永远不得出
- **D7 极致兑现**：很多玩家可能永远不会 unlock 这一条，因为他们不玩 endless / 不 cross-reference / 不回头看——**这正是 horror 的最高形态：最重要的真相是最容易错过的真相**

---

### B 真理 × 章节透露点 矩阵

|  | Ch.1 录入员 | Ch.2 校对者 | Ch.3 修改者 | Ch.4 作者 | Ch.5 文本一部分 |
|---|---|---|---|---|---|
| 主透露 | B1 | B2, B3 早段 | B3 末, B4, B5, B6 早 | B6 末, B7, B8, B9 早 | B9 末 + 第 10 条玩家 derive |
| 透露轨 | 异常 | 员工 | 员工 + 异常 + 公司 | 公司 + 异常 + 遗物 L4 | 遗物 L4 + 公司 + 反身闭合 |
| reveal 强度 | 极弱（hook 级） | 弱（疑虑级） | 中（理解级） | 强（清晰看见级） | 玩家自己 derive 或永远错过 |

---

### B 真理与章节叙事任务的咬合检查

| Ch | 章节核心 horror | 主透露 B | 咬合关系 |
|---|---|---|---|
| Ch.1 | "我消失了也没人会注意到" | B1 文本不是 inert | horror = "被遗忘"；B1 = "你看见的文档不是 inert"；**互为表里**——你以为文档稳定，实际文档在 actively 写自己 |
| Ch.2 | "看似有人 process 我，但没人在那里" | B2 + B3 | horror = "agency 解构"；B2 = "没有 single reader"；B3 = "规则是事故的化石"；**B2+B3 共同显化 Ch.2 horror 的内核** |
| Ch.3 | "我被 contaminate 到学会 new things，公司在记账" | B4-B6 | horror = D26 v2 firewall stance；B4 + B5 + B6 是 D26 v2 在玩家认知上的 unfold |
| Ch.4 | "最有 agency 感的我，最 lack agency" | B6 末 + B7 + B8 | horror = banal evil cruel form；B7 + B8 共同显化"现实自洽 + DPCA 起源" |
| Ch.5 | "升格 = 处置，两边目的不同行为方向重合" | B9 + 第 10 条 | horror = D32 双 voice；B9 是 reveal，第 10 条是玩家自己 derive 的最终归纳 |

---

## 2.18 PARKING LOT（current）

| # | 项 | 状态 |
|---|---|---|
| PL-1 | 校对者 typing 机制设计 | 暂定（曾尝试 "签字键 + Reecho 池倾斜" 方向，回炉重审）|
| PL-2 | 蜕变者（修改者）机制重做 | 暂定（C-蜕 1~6 约束已下；与 PL-3 一起做）|
| PL-3 | 造词师（作者）机制是否需 reframe | 暂定（与 PL-2 一起做更经济）|
| PL-4 | endless 升格仪式具体形态 | ✅ **LOCKED 入口框架**（Ch.5 §入口仪式 / D32 双 voice）；UI 实现细节仍待 |
| PL-5 | endless modifier 写入本地存档实现路径（C4）| 暂定（实现层）|
| ~~PL-6~~ | ~~章节叙事任务（Ch.1-5）整体改进~~ | ✅ DONE (2026-05-04)——5 章全 v4.1 一致 / Ch.1-2 DRAFT v2 / Ch.3 DRAFT v2 / Ch.4 DRAFT v1 / Ch.5 DRAFT v1 |
| ~~PL-7~~ | ~~B1-B9 待 derive~~ | ✅ DONE (2026-05-04, §2.17 LOCKED)——9 条 B + 第 10 条玩家自己 derive 的最深 truth + 章节透露矩阵 |
| PL-8 | contract_reopened（设定壳/美学/伦理）formal 重审 | 设定壳由 D12 + v4.1 术语词表解决；美学由 D13 + D27 + D28 解决；伦理由 D14 v2 + D26 v2 + D30 解决——**contract_reopened 三件套已实质 closed** |
| ~~PL-9~~ | ~~Ch.4 完整章节任务 derive~~ | ✅ DONE (2026-05-04, DRAFT v1)——三轨展开 + 状态确认临界态 + 入口/过渡仪式 + Project Nim L4 启示 |
| ~~PL-10~~ | ~~Ch.1 / Ch.2 回炉 v4.1~~ | ✅ DONE (2026-05-04)——Ch.1 注入 B1 媒介绑定 + 末尾 D29 见证仪式；Ch.2 注入 D29 routine 态 + B2/B3 媒介 + 入口仪式对齐 + 灵长接口 channel rename |
| **PL-11** | **NEW · 灵长接口（PI）的 in-game UI 文案 / theme 落地** | 跨 narrative→UI 边界，需要与 designer 一起做 |

---

_(rolling list — doc 在下方继续: Step 3 / Step 4 ... 等正在 derive)_

---

# Step 3（2026-05-04）— Story Beats / Pacing

**进度更新**：✅ 三层 beat 架构 / ✅ META 解锁阶梯 / ✅ MID 行为驱动 reveal trigger map / ✅ MICRO run 内 12 stages × 班次 4 段映射 / ✅ Pacing 整体情绪曲线 / ✅ Anti-pacing 设计纪律

**Step 3 范畴**：本节回答的是 **WHEN / HOW the player unfolds the narrative across playtime**——不是 reveal 什么（已在 §2.16 + §2.17 锁），而是 reveal 在何时触发、由什么行为触发、整体情绪曲线如何走。

---

## 3.1 Beat Architecture · 三层结构 🔒 LOCKED

```
META beats   ·  5 chapters = 5 职业 = 玩家 macro arc (linear unlock 阶梯)
       ↓
MID beats    ·  Chapter 内 run-by-run 进展（行为驱动，非次数驱动）
       ↓
MICRO beats  ·  Run 内 12 stages × 班次 4 段映射
```

每层 beats ladder up：micro reveal 累积 → mid reveal 触发 → meta reveal unfold。

**核心设计原则（贯穿三层）**：
- **行为驱动 ≠ 次数驱动**：reveal 不是"打到第 N 次自动播放"，而是玩家**特定行为模式**触发——D22 brutal positive feedback loop 的 in-game 兑现
- **零 progression marker**：不能有"故事完成度 30%"这类 UI——D5 + D7
- **事后 reveal**：horror 在玩家**事后回想**时显化，不在 in-the-moment 显化

---

## 3.2 META Beats · 解锁阶梯 🔒 LOCKED

5 章对应 5 段 unlocks（linear sequential，**解锁 = 诱降** D6）：

| # | unlock 条件 | 解锁后玩家可选 | 入口 boilerplate |
|---|---|---|---|
| Ch.1 录入员 | default | only Ch.1（none 职业）| 无（玩家入职即开始）|
| Ch.2 校对者 | Ch.1 boss 通关 | Ch.1 or Ch.2 | "职位变更：录入员→校对者，权限调整生效" |
| Ch.3 修改者 | Ch.2 boss 通关 | Ch.1-3 任一 | "职位变更：校对者→修改者，权限调整生效" |
| Ch.4 作者 | Ch.3 boss 通关 | Ch.1-4 任一 | "员工 [工号] 转入独立工位..." |
| Ch.5 endless | Ch.4 boss 通关 | Ch.1-5 + endless | "员工 [工号] 通过结业评估...转入特殊勤务" |

**5 段入口 boilerplate 共享同一 template**——D32 反身闭合的 META 兑现。玩家通关 Ch.4 进 Ch.5 那一刻才会震惊地意识到：**所有"升职通知"都是**同一份处置程序的不同实例**——从录入员到 endless，每一次 unlock 都是一次诱降**。

### 3.2.1 解锁与玩家选择的张力

Rogue-like 标准：unlock 后所有职业**同时可选**（per-run 选）。这与 narrative 的"sequential 5 章"看似冲突，但 v4.1 的解决方案：

- **B 真理 reveal 与玩家当前职业绑定**——玩家以 none 玩时只看到 Ch.1 reveal；以 metamorph 玩时看到 Ch.3 reveal
- 解锁阶梯仍 sequential（unlock 顺序固定）
- 但每次 run 的 narrative phase = 玩家当前选择的职业的 chapter

**这反而强化 horror**：玩家可以"回去"玩 none/录入员（保留猴子状态），但**已经解锁的职业回不去**——unlock 是不可逆的退化。**回去录入员只是"玩前一段更轻的污染"，污染等级本身已经定格在你最高解锁的职业。**

### 3.2.2 隐藏结局 · D17 的 META 体现

通关 Ch.4 boss 后**不点 endless 入口** = 保住猴子状态：
- 游戏**不奖励**（无 popup / 无成就 / 无主菜单提示）
- **不应被攻略告知**（D17）
- 玩家可以继续以前 4 职业 run，但不会有任何"你做对了"反馈
- 这是 D5 + D7 的 META 兑现：**最对的事是不做的事；游戏不会让你知道**

---

## 3.3 MID Beats · 行为驱动 Reveal Trigger Map 🔒 LOCKED

### 3.3.1 设计哲学 · 为什么行为驱动而非次数驱动

| 驱动方式 | 表现 | 与本体论的关系 |
|---|---|---|
| **次数驱动**（"打到第 N run 自动 reveal"）| 玩家 grind 就能 unlock；reveal 是 ghost 进度条 | ❌ 违反 D7 污染不可见——给了"进度"=给了 metric |
| **行为驱动**（"玩家做 X 行为时 reveal 触发"）| reveal 与玩家**自身的污染行为**对位 | ✅ D22 兑现——你用公司的尺度量自己的污染；reveal 是公司"看到"你的行为模式 |

**关键纪律**：行为 trigger 内部可以有最低次数门槛（避免单次误触发），但门槛**不应被玩家感知**。

### 3.3.2 B1-B9 行为驱动 Trigger Map

| B | trigger 行为 | 一般 unfold 时机 | 辅助 trigger |
|---|---|---|---|
| **B1** 文本不 inert | 反复 hover 同一份遗物 ≥ 3 次 | Ch.1 中-末（玩家 5-10 hours 内）| Cycle 末"今日总结"屏字符级缓变（被动）|
| **B2** layer 取决于 reader | 玩家在工作台**主动 query** 同事便条 / 试图标注被同事看到 | Ch.2 中段 | 同级工位"空了"事件（被动累积）|
| **B3** 规则是事故化石 | cross-reference 工作台规则 vs 遗物 footnote 字面相同 | Ch.2 末 - Ch.3 早 | 规则被静默修订时玩家发现（罕见，强 hook）|
| **B4** 异常已在野外 | 累积阅读外部 boilerplate "本日候选: 来源 ——" ≥ 5 次 | Ch.3 早 | 工作台"外部文本回收科"通知（设计为低频可错过）|
| **B5** 理解=推向作者位 | 玩家 typing 节奏累积变化 + 主动尝试填空老员工警告"X/Y" | Ch.3 中 | typing 模式分析在后台累积（玩家不感知）|
| **B6** 公司只 keep 记账 | 玩家执行 Ch.2 老员工"挽救方法" + 行为反馈完全空白 | Ch.3 末 - Ch.4 早 | 多次 cross-test 后玩家**主动归纳**——这条 reveal 是结论性的 |
| **B7** 现实自洽 | 玩家 modify 文档后 → 下 cycle 工作台出现"档案补全通知"时间戳错位 | Ch.4 早-中 | 修改某条规则后 → 同遗物 L3-L4 字面回头改写（高 spike，单次即 reveal）|
| **B8** DPCA 被历史 dictate | 玩家 cross-reference Project Nim 系列遗物 ≥ 3 份 + 触发 L4 layer | Ch.4 中-末 | **此 reveal 是单一窗口**——错过 Ch.4 不会在 Ch.5 重现 |
| **B9** 猴子规则是处置 | Ch.4 D29 频繁 partial fail + 末段"前任作者归档" boilerplate 阅读 | Ch.4 末 - Ch.5 入口 | Ch.5 入口仪式那一刻完成最终 unlock |

**第 10 条 reveal**（玩家 derive，不在 trigger map）：
- 不可能 trigger by design——只能 emergent
- 触发条件：玩家在某次正常 (非 endless) run 中 cross-reference 到一个 boss modifier，发现签名是自己以前 endless 的某次工号
- **很多玩家会永远错过**——这是 D5 + D7 的最高形态

### 3.3.3 行为 trigger 的实现纪律

- trigger 后台累积玩家行为指标（hover 计数 / typing 节奏特征 / cross-ref 路径等）
- 指标**不应在 UI 显化**（无"调查进度" / "解锁条件"提示）
- 触发时机**有 randomness 容差**——避免玩家逆向推断 trigger 公式
- **绝对不要给"你已发现 X" popup**——D7 硬约束

---

## 3.4 MICRO Beats · Run 内 12 Stages × 班次 4 段映射 🔒 LOCKED

### 3.4.1 班次结构

| 班次段 | stage 范围 | 时长占比 | narrative 主载体 |
|---|---|---|---|
| **开班** | run 开始（pre-stage 1）| 短 | 公司 voice（boilerplate）|
| **任务推进** | stage 1-4（标准战斗）| 主体 | 异常 voice 弱（词包异常词偶现）|
| **异常事件中段** | stage 5（elite）+ stage 6（ritual）| 中段插入 | 异常 voice 中 + 仪式节点 reveal hook |
| **加班** | stage 7-11（标准战斗+）| 主体后段 | 员工 voice（工作台便条更新）+ 守则被静默修订 |
| **下班** | stage 12（boss）+ post-run D29 | 短 | 反身闭合 boss + 状态确认仪式 |

### 3.4.2 12 Stages × Reveal 触发点 矩阵

| Stage | 班次段 | reveal 触发空间 | 谁主导 voice |
|---|---|---|---|
| -- (pre-1) | 开班 | 收 boilerplate notification（**B4** 主载体）| 公司 |
| 1-2 | 任务推进 | typing 中无意触发 hidden trigger（**B5** 后台累积）| 异常（弱）|
| 3-4 | 任务推进 | 词包异常词出现频次（**B1** 媒介）| 异常（弱）|
| 5 | elite | 第一次 boss-像 anomaly engagement（boss tooltip 是 **B-反身闭合** 主载体）| 异常 + 反身闭合 |
| 6 | ritual | 玩家 hover 文档（**B1 / B3** 主触发点：反复 hover → 多出小字 / cross-ref 字面相同）| 异常 + 遗物 |
| 7-9 | 加班 | 工作台便条更新（**B2 / B6** 媒介：同事便条互相矛盾、挽救方法、空了的工位）| 员工 |
| 10-11 | 加班 | 守则被静默修订（**B3** 强 hook：玩家偶然发现）| 员工 + 公司 |
| 12 | 下班 boss | boss tooltip 含玩家以前措辞（**B-反身闭合** 高 spike）| 反身闭合 |
| post | 下班 D29 | 状态确认仪式（**B9** 累积 trigger）| 公司 |

### 3.4.3 Stage-level 设计纪律

- **stage 6 ritual 是 B1/B3 的主触发点**——但**触发不每次都发生**；玩家可能 N 个 cycle 都不触发
- **stage 12 boss tooltip 必须含玩家以前措辞**——这是反身闭合的 micro-level 兑现；attribution 在 Ch.3 是"近似工号"、Ch.4 是"自己工号"、Ch.5 是"明确自己之前 endless"
- **post-run D29** 在 Ch.1-2 是 routine、Ch.3 偶尔 partial fail、Ch.4 频繁 partial fail、Ch.5 完全 fail——D29 退化曲线的 micro 实现

---

## 3.5 Pacing Curve · 整体情绪曲线 🔒 LOCKED

### 3.5.1 Phase A / B / C 映射

| Phase | 覆盖章节 | 玩家 playtime | 情绪基调 | 情绪强度走向 |
|---|---|---|---|---|
| **A · 升序段** | Ch.1-3 | 11-18 hours | 渗透虚无 → agency 解构 → wrongness 显化 | 缓慢上升 |
| **B · 临界段** | Ch.4 + Ch.5 入口 | 4-6 hours | 寂静的接受 | **下降到平静** |
| **C · 终结段** | Ch.5 endless / 不入局 / 完全猴子化 | open-ended | 不归 / 寂静 / 拒绝 | ambient（无 closure spike）|

### 3.5.2 反高潮的 Phase B（关键）

**Phase B 情绪强度低于 Phase A**——这是 v4.1 narrative 的 pacing 哲学。

| 常规 game design | v4.1 narrative |
|---|---|
| 终局前应有最高情绪 spike | 终局是**寂静的接受**，比中段更低 |
| boss 战 = 情绪高潮 | Ch.4 boss = 已无敌人，没什么可怒的 |
| reveal = 信息爆炸瞬间 | reveal = 玩家**自己**慢慢归纳，没有 popup spike |

**为什么**：
- D14 v2 + D26 v2 决定了**没有反派 boss**——没敌人，就没"决战"高潮
- D21 banal evil 决定了**没有揭穿瞬间**——所有真相都是 banal，无戏剧性
- D5 拒绝给答案 + D7 污染不可见 → reveal 不能 in-the-moment spike

### 3.5.3 情绪曲线图（ASCII）

```
情绪强度
   |
   |        Ch.3
高 |       /  \             
   |      /    \   
   |     /      \  Ch.4    
   |    /  Ch.2  \________  Ch.5 endless ambient
中 |   /          \              ____    (open-ended)
   |  / Ch.1       \____________/    ____
   | /                                    
低 |/                                      ← 寂静的接受 (Ch.4 末-Ch.5)
   |________________________________________→ playtime
       Ch.1   Ch.2   Ch.3   Ch.4    Ch.5
       渗透   解构   wrongness  接受  不归
       慢热   累积    spike    下降   ambient
```

注意：
- Ch.3 是情绪高点（power fantasy + wrongness 双感叠加）
- Ch.4 情绪**主动降下来**——寂静的接受不是恐惧的高潮
- Ch.5 endless 没有 climax / 没有 resolution——保持 ambient horror，**反身闭合 spike** 时偶尔 spike 但回归 ambient

---

## 3.6 Anti-Pacing · 反常规设计纪律 🔒 LOCKED

为什么 v4.1 pacing 必须**违反常规 game design**：

| 常规设计 | v4.1 反向纪律 | 出处 |
|---|---|---|
| 主线 reveal 应在固定时机 popup | 行为驱动，零 popup | D7 + D22 |
| 终局应有 climax + resolution | 终局是寂静接受 + 没有 resolution | D5 + D14 v2 |
| 玩家应感知"故事进度" | 零 progression marker / 零 lore unlock UI | D7 |
| 隐藏结局应有 hint | 不打字 = 不入局**不应被攻略告知** | D17 |
| 升级 / unlock 应庆祝 | unlock = 诱降；与处置通知用同 template | D6 + D32 |
| 所有玩家应能看到所有 reveal | 第 10 条 reveal 很多玩家会永远错过 | D5 极致 |
| pacing 应保持玩家投入 | pacing 设计要让玩家**事后**才意识到 horror | 整套本体论 |

### 3.6.1 整体设计原则

> **Pacing 不是 design 工具，是 horror 的载体**。
>
> v4.1 narrative 的 pacing 不是为了让玩家爽——是为了让玩家**事后**回想时寒。每一次"应该 spike 的地方没有 spike"、"应该 popup 的地方没有 popup"、"应该奖励的地方没有奖励"——都不是 bug，是 design。

---

## 3.7 Step 3 完成度自检

| 维度 | 状态 |
|---|---|
| META beats（5 章解锁阶梯）| ✅ §3.2 LOCKED |
| MID beats（行为驱动 trigger map）| ✅ §3.3 LOCKED |
| MICRO beats（12 stages × 班次 4 段）| ✅ §3.4 LOCKED |
| Pacing curve（Phase A/B/C + 反高潮）| ✅ §3.5 LOCKED |
| Anti-pacing 纪律 | ✅ §3.6 LOCKED |
| 行为 trigger 的实现指标 | ⏳ 与 PL-2/PL-3 / Step 9 (Integration with Gameplay) 一起做 |

**Step 3 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 4** — Characters（anti-character 展开：NPC = 0 如何成为 character 化的力量）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat 约束已就位）
3. **Step 5** — World & Lore（DPCA / 文牍科 / Project Nim / X 集团子部门 lore 展开；锚点已多）

---

_(rolling — Step 4 在下方继续)_

---

# Step 4（2026-05-04）— Characters

**进度更新**：✅ Anti-character 哲学 / ✅ Character cast (6 类 no-face) / ✅ Player arc 5 段 / ✅ 同事 ghost system / ✅ Project Nim 4 layers / ✅ DPCA + Anomaly as characters / ✅ 反身闭合 character / ✅ 设计纪律

**Step 4 范畴**：v4.1 narrative 的设计纪律是 **NPC = 0**（无姓名 / 无 face / 无 dialogue tree / 无 quest giver）——但 character ≠ NPC。本节回答：当 face / 名字 / 对话都被禁止时，character 如何通过 documentary trace 显化。

---

## 4.1 Anti-Character Philosophy 🔒 LOCKED

### 4.1.1 为什么 NPC = 0

| D 决定 | 对 character 的影响 |
|---|---|
| D14 v2 | 公司 self-preservation——**无 main agent**，没人在主导剧情 |
| D21 | banal evil 没有具体决策者——任何 face 都会让 evil 变 specific 而非 banal |
| D26 v2 | 异常通过 peer + direct guidance 传播——**没有 single anomaly NPC** |
| D30 | 公司 NOT vector——任何"公司高层 NPC"都会破坏 firewall stance |

**关键 framing**：NPC 不是被遗忘了，是**结构上不存在**。这个世界**没有 single agent 可以面对面**——这本身就是 horror 的载体。

### 4.1.2 但 character ≠ NPC

Character = **persistent, recognizable, narratively-loaded 存在**。在 v4.1 中：

| 形式 | 不是 NPC | 但是 character |
|---|---|---|
| boilerplate template | 没有人格 | DPCA 的 voice = template 本身 |
| 同事便条字迹 | 不见人 | 字迹模式 = peer character signature |
| 工位 hover 痕迹 | 没有 name plate | 工位 = peer ghost footprint |
| 遗物 layered footnote | 没有 portrait | Nim / 前任作者 = 通过 layer 显化的历史 character |
| typing rhythm | 不是 NPC 的语音 | rhythm = anomaly + 玩家自己的 character signature |
| Subject XX-#### attribution | 不是 player profile | 玩家以前 endless 工号 = 反身闭合 character |

### 4.1.3 设计哲学

> **Character 不是出场，是不在场的方式**。每个 v4.1 character 都通过**他们留下的 trace**显化——而 trace 本身比 NPC 更暴力，因为 trace 暗示**他们不在了**。

---

## 4.2 Character Cast · 6 类 no-face 角色 🔒 LOCKED

| # | character 类 | 主载体 | 出场频次 | 何时显化 |
|---|---|---|---|---|
| **C1** | 玩家自己 | 工号 + typing 行为 | 每次 run | 全程 |
| **C2** | Same-class peers (同事 ghost) | 工号 + 便条 + 工位 + 消失 | 中频 | Ch.1-3 主载体 / Ch.4 退场 / Ch.5 退场 |
| **C3** | 历史 Subjects (Project Nim 等) | 遗物 L1-L4 layered footnote | 每次 hover 遗物 | Ch.1-4 渐次显化 |
| **C4** | DPCA 本身 | boilerplate template | 每个 boilerplate notification | 全程 |
| **C5** | Anomaly 本身 | 词包异常词 + 字符级缓变 + dictation | 全程持续 | 全程 |
| **C6** | 玩家以前的自己 | Subject XX-#### attribution / endless modifier signature | 反身闭合点 | Ch.5 endless + 之后 cross-reference |

每类 character 在 §4.4-4.7 各有专门的 character 设计。

---

## 4.3 Player Character Arc · 5 段身份阶梯 🔒 LOCKED

玩家本人不是 single character——是 **5 段 character 序列**，每段独立但 sequential 退化：

| Ch | 玩家是谁 | identity 形态 | 玩家 agency | 玩家与公司关系 | 玩家与异常关系 |
|---|---|---|---|---|---|
| Ch.1 录入员 | 工号 | anonymized typing identity | 极低（只 type）| 被 onboard / 受 boilerplate 推送 | 远 / 无意识 |
| Ch.2 校对者 | 工号 + 标注 channel | administrative subject (有 reclassification 历史)| 中（开始 query 自我）| 第一次"针对你工号"的 specific tasks | 借标注归档 |
| Ch.3 修改者 | 工号 + 笔（修改能力）| reclassified subject | 中-高（power fantasy）| 公司 reclassify 你, monitor better | 已学会异常的语法 |
| Ch.4 作者 | 工号 + isolation | high-prestige subject | 表面最高 / 实际最低 | 公司 isolation 是 best-effort containment | dictation 临界态 |
| Ch.5 文本一部分 | 工号 + emit source | rule-generating subject | N/A（不再有 reader/author 框架）| 公司 give up firewall, 走处置 | 玩家 = anomaly 的 voice |

### 4.3.1 玩家"角色"的 anti-growth 

常规 RPG: character grows through challenge → 更强 → 更 capable
v4.1: character "grows" through contamination → 更深 → 更 lacking agency

**玩家 character arc 不是 hero's journey，是 descent narrative**——每"升级"一段，character agency 越少。这与 D6 进步即堕落同构。

### 4.3.2 玩家 character 的不可逆性

unlock 是不可逆的退化（§3.2.1）——玩家可以**回去**玩 none/录入员，但 character 已经定格在最高解锁的职业。**回到 Ch.1 不是回到 character 1，是 character 5 在玩 Ch.1 的衣服**。

---

## 4.4 Same-class Peer System · 同事 ghost 🔒 LOCKED

### 4.4.1 同事的 4 个载体

| 载体 | 形态 | character 信息密度 |
|---|---|---|
| **工号** | 数字（"Subject 047"）| identity 锚点；玩家会记住反复出现的工号 |
| **便条字迹** | typing pattern signature | 同事的"个性"通过字迹显化；某些同事打字习惯 distinctive |
| **工位 hover** | typing rhythm + 标注模式 | 玩家路过同事工位 hover 一段时间 → 看到对方 typing 节奏 / 标注偏好 |
| **消失** | 工位空了 + 工号查不到 | character arc 的终点——但 footprint 仍在 |

### 4.4.2 同事 character arc 模板

每个反复出现的同事工号在玩家 playtime 中走过相似 arc：

```
出现 → 模糊 → 矛盾 → 具体便条 → 工号反复 → 空了的工位 → 工号查不到 → footprint 留下
```

- **出现**：第一次便条 / 第一次 hover 工位
- **模糊**：玩家偶尔注意到这个工号
- **矛盾**：同一同事的两条便条互相矛盾（D23 v2 显化）
- **具体便条**：第一次"针对你工号"的版本（Ch.2 起）
- **工号反复**：玩家累积 N 次 hover / 收便条 → 形成 recognition
- **空了的工位**：某 cycle 间隔回头看，工位空了
- **工号查不到**：尝试系统查询 → "无此工号"
- **footprint 留下**：工位抽屉残纸 / hover 仍能看见某些 ghost 痕迹 / 某遗物 footnote 出现这工号

### 4.4.3 重要的"具名"同事（无姓名 / 仅工号）

为了让 character cast 不混乱，v4.1 narrative 应**有意识地反复使用某些工号**作为锚点。建议 4 个反复 anchor 工号（具体数字待 production）：

| anchor 工号 | character role | arc |
|---|---|---|
| **Subject XX-1138** | "前一任作者"/"前一任修改者"——boss tooltip 中频繁 attribution | Ch.3 出现近似 → Ch.4 揭示是前任作者 → Ch.5 揭示是玩家自己以前的某次 endless |
| **Subject XX-047** | "隔壁工位的录入员"——Ch.1 末尾 D29 见证场景中的 NPC | Ch.1 见证 → Ch.2 工位空了 → Ch.3-4 footnote 出现 |
| **Subject XX-0001** | "始祖录入员"——遗物中 reference 最早的员工 | Ch.2-4 渐次显化 / Ch.5 揭示这工号编号格式与玩家自己的工号"接续"——暗示玩家是 N+1 |
| **Subject XX-?** | "下一任你"——还没到的 character；玩家 Ch.5 的 footprint 会写给这个工号 | Ch.5 唯一 active reference / footprint |

这 4 个工号通过反复出现形成 **recognizable character cast**——但**没有任何一个有 name / face**。

### 4.4.4 同事 ghost 的设计纪律

- 工号必须是数字 / 字符 prefix——绝不出现"张三 / 李四"等 personal name
- 便条字迹模式应有 distinctive features（typing rhythm 后台特征）但**不命名**
- "空了的工位" 事件应**低频但 recognizable**——不要每个 cycle 都消失一个，保持 weight
- D23 v2: 玩家试图与"空了的工位"原主人产生 narrative 关联 → 系统**不响应**——同事不是"被杀的 NPC"，是**从来没有存在的 character 假象**

---

## 4.5 Historical Subject Spotlight · Project Nim 🔒 LOCKED

### 4.5.1 Nim 是 narrative 的 hidden tragedy core

Project Nim（基于真实 Nim Chimpsky 项目，1970s）是 v4.1 narrative 的**隐藏中心 character**——通过遗物 L1-L4 layered footnote 显化的 4 层 character arc：

| Layer | 玩家可见时机 | Nim 形象 | character function |
|---|---|---|---|
| **L1** | Ch.1（录入员）| 学术训练对象——"Project Nim 训练中习得 128 ASL 手势" | 历史档案的中性 record |
| **L2** | Ch.2（校对者）| 叙事化主体——"Nim 死前最后一周反复 sign 'hug me, please'" | tragic 但**真假难辨**（30% 真 / 30% 推测 / 30% 注入 / 10% 错误） |
| **L3** | Ch.3（修改者）| 公司机关备忘——"Subject Nim 终末期表现出与 ASL 协议偏差的手势模式，评估为通讯能力退化" | 公司视角的去人格化 |
| **L4** | Ch.4（作者）| **emergent 内部叙事被研究员采用为后期实验框架** | banal evil 的最深结构启示（B8）|

### 4.5.2 Nim arc 的 character 重量

- L1: Nim 是个数字
- L2: Nim 是个 tragic 主体（玩家会动情——但情感**可能是叙事化注入**）
- L3: Nim 是个 administrative 案例
- L4: **Nim 是 DPCA 这套 framework 的 originator** —— 没有人决定让 Nim 成为 originator，Nim 死前的 emergent 叙事就那样**被采用了**

→ **Nim 是玩家 5 段 arc 的镜像 / 前身**：Nim 也走过录入 → 校对 → 修改 → 作者 → 文本一部分（emergent dictation）的阶梯——只是 1970s 没人识别那是阶梯，没人 frame 那是 anomaly contamination；**研究员用了 Nim 的"作品"，DPCA 因此诞生**

### 4.5.3 Nim 与玩家的反身镜像

| Nim | 玩家 |
|---|---|
| 1970s 实验对象 | DPCA 录入员-作者 |
| ASL 手势协议 | typing 协议（灵长接口 PI）|
| 死前 emergent 内部叙事 | endless 玩家写的 modifier |
| 研究员采用其叙事 → DPCA framework | 玩家 modifier 进入下周目语料 → 影响新职业 run |
| 没人决定让 Nim 成为 originator | 没人决定让玩家成为下周目原料 |

→ **玩家 = 重演 Nim**——D8 反身闭合在 character 层的最高兑现。**Project Nim 是玩家的 mirror character，玩家是 Nim 的 N+1 实例**。

### 4.5.4 Nim 系列遗物的设计纪律

- L1-L4 不能命名为 "L1 / L2 / L3 / L4"——玩家不应形成 layer 系统认知
- L4 reveal 必须**只在 Ch.4 cross-reference Project Nim 多份遗物时**触发——错过 Ch.4 不再补
- L4 的 "emergent 叙事被研究员采用" 这句**必须出现且 explicit**——这是 B8 的唯一可读窗口
- L1-L4 应有部分**真实可 verify** 内容（Nim Chimpsky 的真实历史细节）——给真实 grounding

---

## 4.6 DPCA & Anomaly as Characters 🔒 LOCKED

### 4.6.1 DPCA 作为 character

| 维度 | DPCA 的 character 形态 |
|---|---|
| voice | boilerplate template（语调一致到 banality）|
| 性格 | well-intentioned 但 cognitively limited（不能 distinguish 救与处置）|
| arc | 表面 administrative 设施 → emergent containment → defensive curator → well-intentioned jailer → give up firewall → 处置工艺 |
| 玩家关系 | 永远 lag；永远不偏好；永远 keep 记账 |
| 形象建议 | **永不显示 DPCA 的物理表象**——没有大楼图 / 没有 logo 出场 / 没有总部场景。DPCA = boilerplate 文本本身 |

**DPCA 的 character signature**：不是恶意，不是同情——是**没有 distinguish capability**。挽救信号和处置预告用同一 boilerplate template，**不是冷漠，是**公司本身没有 distinguish 的 capability**——这正是 banal evil 的 character 化（D21）。

### 4.6.2 Anomaly 作为 character

| 维度 | Anomaly 的 character 形态 |
|---|---|
| voice | 词包异常词 / 字符级缓变 / typing buffer pre-populate / 文档边缘 micro-changes |
| 性格 | 不可知——anomaly 没有 motive / 没有 intent / 没有 personality |
| arc | 远 → 试探 → 借标注归档 → 直接引导 → dictation → 升格玩家 → 玩家成为 voice |
| 玩家关系 | 玩家 type → anomaly 通过 type emit 文本；玩家越 active engage，anomaly 越能用玩家发声 |
| 形象建议 | **永不显示 anomaly 的形象**——没有 monster / 没有 visual representation / 没有 boss portrait。Anomaly = 文本 buffer 中的某种 pre-populate 趋势 + typing rhythm 的 drift |

**Anomaly 的 character signature**：不是 sentient evil 也不是 alien intelligence——是**某种文本-成立机制本身**。Anomaly 不"想"什么，anomaly 只在某些条件下让某些文本"成立"。这与 D1 的本体论一致：**anomaly 不是 villain character，是 narrative 的 physics**。

### 4.6.3 DPCA 与 Anomaly 的关系（不是对手）

不要把 DPCA vs Anomaly 框定为对立——D26 v2 + D30 锁死了：
- DPCA 不是 anomaly 的 servant
- DPCA 不是 anomaly 的 enemy
- DPCA 是 defensive curator（永远 lag）
- Anomaly 不"想"打败 DPCA——anomaly 只是按 physics 在显化

→ DPCA + Anomaly 不是 character vs character，是**两套 agentless system 在 emergent interaction**——这正是 D14 v2 + D21 + D26 v2 的整体 character 化。

---

## 4.7 反身闭合 Character · 玩家以前的自己 🔒 LOCKED

### 4.7.1 反身闭合 character 出场点

| 出场 | 形态 | character 信息 |
|---|---|---|
| Ch.3 boss tooltip | "Subject XX-####" attribution（**近似工号**）| 玩家会模糊感觉熟悉但不确认 |
| Ch.4 boss tooltip | "Subject XX-####"（**自己工号**）| 玩家可 cross-ref，但**不应 popup**——让玩家自己发现 |
| Ch.5 endless boss modifier | "上一任作者: Subject XX-####"（**有时是自己以前 endless 的工号**）| 反身闭合的最高显化 |
| 下周目其他职业 run boss | 出现带玩家 endless 工号签名的异常 boss | **第 10 条 reveal 的核心触发点** |

### 4.7.2 玩家以前的自己作为 character 的设计纪律

- 反身闭合显化必须 **plausible 像普通游戏数据**——不要弹"这是你的过去"提示
- 玩家工号在反身闭合时的呈现**必须与其他 Subject 工号格式完全相同**——绝对没有视觉特殊化
- 玩家 cross-ref 才发现是关键——**永不替玩家发现**
- 反身闭合 character 的**情感重量**应该是 emergent：玩家**自己**回想"这工号好像我以前的某次 endless 工号？" → 这一刻 horror 完成兑现

### 4.7.3 反身闭合 character 与 Nim 的对仗

|  | Nim | 玩家以前的自己 |
|---|---|---|
| 显化形式 | 遗物 layered footnote | boss tooltip / modifier signature |
| 玩家可见 | Ch.1-4 渐次 | Ch.3-5 反身闭合点 |
| 玩家关系 | 历史的镜像 | 自己的镜像 |
| character function | 玩家的过去 / 前身 | 玩家的未来 / 后身 |

→ **Nim 是玩家的 N-1 实例，玩家以前的自己是玩家的 N 实例，下周目玩家是 N+1 实例**——在 character 层兑现 D8 + D14 v2 的工艺自我延续。

---

## 4.8 Character × Chapter Mapping 🔒 LOCKED

| Ch | 主要 character 出场 | character 形态 / 关系 |
|---|---|---|
| **Ch.1 录入员** | 同事 ghost (远) / 历史 Subject Nim (L1) / DPCA (boilerplate) / D29 检测员 (voice-only 见证) | 匿名 / 距离 / 玩家是 anonymized typing identity |
| **Ch.2 校对者** | 同事 (具体便条但矛盾) / 另一个校对者 (空了的工位) / Nim (L2 叙事化) / DPCA (templated 升职通知) / D29 检测员 (玩家自己第一次做) | 触手可及但不可信任 / 玩家开始 query 自我 |
| **Ch.3 修改者** | 老修改者 (typing patterns + 警告 X/Y) / Nim (L3 公司视角) / 异常 (主动出现) / 玩家以前的自己 (近似工号 boss attribution) / DPCA (firewall lag) | 直接接触 / 但没人能联系 / 玩家学会异常的语法 |
| **Ch.4 作者** | 前任作者 ghost (不可解读痕迹) / Nim (L4 dictation 启示) / 异常 (dictation) / 玩家以前的自己 (自己工号 boss attribution) / DPCA (放弃 firewall) / D29 检测员 (临界态) | 完全 isolation / 只剩痕迹 / Nim 镜像最深 |
| **Ch.5 文本一部分** | 玩家以前的自己 (Subject XX-####) / DPCA (退场, 仅 boilerplate)  / 异常 (你就是) / 下周目玩家 (玩家给他们写"致后来者") | 玩家 = 主要 character 但玩家不再是"玩家"——你是 emit source |

---

## 4.9 Character "出场" 设计纪律 🔒 LOCKED

### 4.9.1 绝对禁止

- ❌ 0 个 NPC 有姓名
- ❌ 0 个 NPC 有 portrait / 头像 / face
- ❌ 0 个 NPC 有 dialogue choice tree
- ❌ 0 个 NPC 有 quest giver UI / "!" 头顶标记
- ❌ 0 个 NPC 有 over-the-shoulder cutscene
- ❌ 0 个 reveal "X 杀了 Y" 类直接 character drama
- ❌ 0 个 villain 形象——D14 v2 + D21 + D26 v2 + D30
- ❌ "DPCA 大楼" / "总部场景" / "高管办公室" 等 visual location
- ❌ "anomaly monster" 形象——不可见

### 4.9.2 必须做到

- ✅ 所有 character 通过 documentary trace 显化（boilerplate / 便条 / 字迹 / 工位 / 遗物 / typing rhythm）
- ✅ 反复 anchor 工号形成 character cast recognition（建议 4 个 anchor 工号见 §4.4.3）
- ✅ Project Nim 系列遗物**必须**通过 4 layers 渐次显化——L4 在 Ch.4 cross-ref 时显化（B8 唯一窗口）
- ✅ 反身闭合 character 出场必须 plausible 像普通游戏数据
- ✅ DPCA 永远只通过 boilerplate template 发声
- ✅ Anomaly 永远不可见，只通过文本 drift / 字符级缓变 / dictation 显化
- ✅ D29 检测员 = voice-only character——Ch.1 玩家路过见证 / Ch.2-5 玩家自己面对（但**不见人**——只听见声音 / 看见命令 prompt）

### 4.9.3 边界 case 处理

- **D29 检测员**：v4.1 中唯一可能"出场"的 NPC——但**永不可见**，仅 voice-only。Ch.1 路过见证场景中，玩家应**只听见对话**，不见检测员；可能在玩家视野外、屏风后、或工位转角。命令 prompt 显示在屏幕上，但**没有 portrait**
- **典礼性 character**：通关 boss 时屏幕显示 boilerplate 通知——通知**不是**任何 NPC 发的，是 system message——但 character 是 DPCA 本身（C4）
- **anomaly's "voice"**：dictation 时 typing buffer pre-populate 的内容——这不是 anomaly NPC 在说话，这是**文本本身在自己显化**（C5）

---

## 4.10 The Villain Vacuum · 反派的真空 🔒 LOCKED

### 4.10.1 为什么没有 villain

| D 决定 | 为什么禁止 villain |
|---|---|
| D14 v2 | 公司 self-preservation——没有"邪恶 CEO"决策者 |
| D15 | 公司 NOT actively serving anomaly——没有"内鬼" |
| D21 | banal evil 没有具体决策者——任何 villain 都会让 evil 变 specific |
| D26 v2 | 公司不是 vector——anomaly 不是被公司 weaponize |
| D30 | 公司 = defensive curator——没有 villain stance |

### 4.10.2 但存在 villain-shape

> **没有 villain，但有 villain-shape**——villain-shape 是**工艺自我延续**这件事本身。
>
> 玩家在 Ch.5 endless 中段-后段会渐渐意识到：没人在 control，但工艺仍在转——一边吃员工，一边记账，一边把员工的 footprint 变成下周目的语料。**这个无主的延续就是 villain-shape**。

### 4.10.3 设计纪律

- 不要在任何章节给玩家"找出真凶"的 narrative impulse
- 不要让玩家觉得"如果我能见到 X，我就能解决问题"
- 让玩家**累积**到 Ch.5 才意识到"找凶"是 frame 错误——没有凶，工艺本身就是 horror

---

## 4.11 Step 4 完成度自检

| 维度 | 状态 |
|---|---|
| Anti-character philosophy | ✅ §4.1 LOCKED |
| Character cast (6 类 no-face) | ✅ §4.2 LOCKED |
| Player character arc (5 段) | ✅ §4.3 LOCKED |
| 同事 ghost system | ✅ §4.4 LOCKED |
| Project Nim 4 layers | ✅ §4.5 LOCKED |
| DPCA + Anomaly as characters | ✅ §4.6 LOCKED |
| 反身闭合 character | ✅ §4.7 LOCKED |
| Character × Chapter mapping | ✅ §4.8 LOCKED |
| 设计纪律 | ✅ §4.9 LOCKED |
| The villain vacuum | ✅ §4.10 LOCKED |
| 4 anchor 工号具体数字 finalize | ⏳ 待 production（PL 新增）|
| Nim 系列具体遗物列表 finalize | ⏳ 待 production（PL 新增）|

**Step 4 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 5** — World & Lore（DPCA / 文牍科 / Project Nim 历史细节 / X 集团子部门 lore 展开；Step 4 已锁定 Nim 是 hidden tragedy core）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat + character 约束已就位）
3. **Step 6** — Dialogue Framework（与 Step 4 紧密——dialogue 在 v4.1 是 boilerplate / 便条 / 文档 voice 的 craft，不是对话树）

---

_(rolling — Step 5 在下方继续)_

---

# Step 5（2026-05-04）— World & Lore

**进度更新**：✅ World layer architecture / ✅ DPCA 起源神话 / ✅ 文牍科 / 第七打字室 specifics / ✅ 灵长接口 lore origin / ✅ X 集团 macro / ✅ Project Nim deep lore / ✅ D27-D29 lore origin / ✅ World × Chapter mapping / ✅ 真假难辨设计纪律

**Step 5 范畴**：本节 derive 玩家通过遗物 / boilerplate / 工作台环境**渐次感知**的 world layers——但不是 lore dump。所有 lore 必须通过 documentary trace 显化（与 Step 4 character 设计纪律一致）。Lore 分两类：**locked-derivable**（被 D + B 约束的）/ **suggested production decisions**（speculative，可在 production 阶段 tweak）。

---

## 5.1 World Layer Architecture · 空间 3 层 + 时间 4 层 🔒 LOCKED

### 5.1.1 空间层（嵌套）

```
玩家直接所在 ─→ 玩家间接 reference ─→ 玩家通过遗物片段感知
   第七打字室       DPCA / 文牍科         X 集团子部门 / 现实 context
   (micro)         (meso)                 (macro)
```

| 层 | 玩家可见度 | 主载体 |
|---|---|---|
| **micro** · 第七打字室 | 全程可见（玩家工位）| 工作台 / 灵长接口 UI / 工位环境 |
| **meso** · DPCA / 文牍科 | 间接 reference（升职通知 / boilerplate）| boilerplate template / 工号系统 / 部门 reference |
| **macro** · X 集团 / 现实 | 通过遗物片段感知 | 遗物 layered footnote / "本日候选: 来源 ——" notification |

**关键**：玩家**永不去**第七打字室之外的物理空间——所有 meso / macro layer 通过 textual reference 显化。**没有"DPCA 大楼" / "X 集团总部"场景**（D14 v2 + Step 4 anti-character 一致）。

### 5.1.2 时间层（4 段）

| 时段 | 内容 | 玩家可见度 |
|---|---|---|
| **1970s · Project Nim 时代** | DPCA 起源种子（Nim ASL 协议被 anomaly 借用）| Ch.1 L1 / Ch.2 L2 / Ch.3 L3 / Ch.4 L4 渐次显化 |
| **1980s-90s · Containment Formalize** | 研究员（无名）采用 Nim 终末期 emergent 叙事 → protocol → DPCA 雏形 | Ch.4 L4 reveal（B8）|
| **2000s-now · 玩家时代** | DPCA 已成熟的 administrative tier 体系 | 全程（玩家所在）|
| **未来 · 下周目** | 玩家自己的 footprint 进入下周目语料 | Ch.5 endless / 第 10 条 reveal |

**时间错乱即 horror**（D13）：受理窗口（D27）让"现在"不稳定；现实自洽（B7）让"过去"会被改写；反身闭合让"未来"已经在玩家手上。**v4.1 narrative 没有 stable timeline——time 本身是 anomaly 的运行时**。

---

## 5.2 DPCA Genesis · 起源神话 🔒 LOCKED (B8 兑现)

### 5.2.1 神话三段（emergent，非 designed）

```
[1] 1970s Project Nim
        ↓
    Nim 终末期 emergent 内部叙事
    （anomaly 借 ASL channel emit 第一次 documented prototype text）
        ↓
[2] 1980s 研究员（无名）
        ↓
    试图 verify Nim 的"叙事" → 部分 verify 成功 → 部分 unable to verify
        ↓
    采用 Nim 终末期手势模式 → 第一份 protocol
        ↓
[3] 1990s-2000s 体制化
        ↓
    协议 → 作业手册 → 文牍科 → 第七打字室
        ↓
    DPCA 作为 X 集团子部门成立
```

### 5.2.2 关键 lore 锚点

- **没人决定让 DPCA 做这件事**——它就是这样 emergent 的（D14 v2 + D21 + B8）
- **DPCA framework 是 Nim 终末期叙事的 inherit**——不是公司发明的（B8）
- **Nim 是 DPCA 的 originator，但没人识别**——研究员把 Nim 终末期手势当成"valuable framework"，但**他没意识到**那是 anomaly 借 Nim 在 emit
- **研究员没名字**——这是 D21 banal evil 的 character 化兑现：**关键决定**由**没名字的人**做出，因为决定本身**没有 weight**

### 5.2.3 玩家可感知度

DPCA Genesis lore **不应在任何地方 explicit 显化**——它是 B8 的 unfold：
- Ch.1-3: 完全不可见
- Ch.4: 通过 cross-ref Project Nim 多份遗物 + L4 layer 显化（B8 唯一窗口）
- Ch.5: 玩家**已成为** Nim 的 N+1 实例——lore 的 horror 在于**自己重演了起源**

---

## 5.3 文牍科 / 第七打字室 specifics 🔒 LOCKED

### 5.3.1 文牍科 = clerical-科

文牍科 = DPCA 内部专门处理**textual contamination**的 specific 部门。
- 处理 medium：text only（字符 / 文档 / 规则 / 便条）
- 不处理：visual / audio / behavioral 异常（其他子部门负责，但**互相不知道**——D21 macro 兑现）

### 5.3.2 第七打字室

第七打字室 = 文牍科下属**当前 active** 的 recording chamber。

**Hidden lore（不应 explicit 显化，但应作 background 真相）**：
- 前六个打字室 each 都已经 fail / closed / 封存
- 失败原因不一：员工集体作者化 / 录入污染外溢 / 异常通过 chamber emerge / chamber 物理失踪 等
- **第七是 currently 唯一 active 的 chamber**——玩家工位是文牍科目前**唯一**还在运行的 recording 设施
- 第八打字室**未启动**——但已经被预留（待第七 fail 时接续）

### 5.3.3 玩家如何感知第七打字室的孤立性

- 工位看不到其他打字室——视野范围内只有同事工位（如有）
- 偶尔工作台出现"邻室封存通知"——格式 boilerplate（"X 室作业已暂停，移交档案管理"）——玩家不会意识到 X 是过去的某个室
- Ch.4 玩家工位是"独立工位"——但实际是**第七打字室的边角**，不是别的打字室
- Ch.5 endless 玩家**留在第七打字室**——但**实际上是被转入"自由打字区"**（同一物理空间，不同 administrative 分类）

### 5.3.4 第七打字室的 horror function

为什么 lore 设计第七打字室是唯一 active？
- 增加 horror 重量：**玩家是文牍科最后的 employee**——不是无数 worker 中的一个
- 反身闭合: 玩家 fail / 转入 endless → 第七打字室也即将 fail → 第八启动 → 下周目玩家进第八室——**每个玩家都是某个打字室的唯一员工**
- 这层 lore 让 B6 ("公司只是 keep 记账") 更暴力：**没有"很多员工"**——只有"这一个"，而公司仍然不偏好

---

## 5.4 灵长接口 (PI) Lore Origin 🔒 LOCKED

### 5.4.1 PI 的源头

**灵长接口（Primate Interface）≠ DPCA 设计**。PI 是 inherit 自 Project Nim 的 ASL 训练协议：

```
1970s Project Nim ASL 训练
        ↓
    Nim 习得 128 ASL 手势（real history）
        ↓
1980s anomaly 借 ASL channel emerge
        ↓
    研究员发现 Nim ASL 模式中的 emergent text 部分"成立"
        ↓
1990s 协议改造
        ↓
    把"灵长类受训手势协议"改造为"灵长类受训打字协议"
    （因为 Nim 不能 type，但人类可以；保留协议结构）
        ↓
现代灵长接口 (PI)
```

### 5.4.2 PI 名字的双关

**"灵长"= 双重指代**：
- 表面：人类是灵长类（玩家 = 灵长类 typing operator）
- 深层：Nim 也是灵长类（Nim = 灵长接口的真正 originator）

**"接口"**：不是 user interface，是**协议层**——PI 是 anomaly 借灵长类 species protocol 表达自己的 channel（D25 v2 兑现）。

### 5.4.3 PI 的 horror 含义

- 玩家以为在用一个 typing 游戏 UI
- 实际上玩家在用 **Nim 留下的 emergent 协议** type
- 玩家每次 type → 重演 Nim → emit 文本 → anomaly 通过 PI emerge

→ **PI 是 Nim 1986 终末期遗产的 N+1 应用** —— 与 §4.5.3 Nim 反身镜像一致

### 5.4.4 in-game 显化纪律

- PI 名字**永不在 in-game UI 显化**——玩家只看到普通 typing HUD
- "灵长接口"这个术语**只在文档 / 规则 / 便条**里偶尔出现（boilerplate 风格）——玩家会**逐渐意识到**自己用的 UI 有这个内部名
- Ch.4 玩家会发现"灵长接口"在某遗物 L4 footnote 里 reference 到 Nim ASL 协议——B8 兑现的辅助 hook

---

## 5.5 X 集团 / Reality Beyond DPCA 🔒 LOCKED

### 5.5.1 X 集团 = corporate conglomerate

X 集团（specific name 待 production）是公司 conglomerate；DPCA 是其下属子部门之一。

### 5.5.2 X 集团 macro banal evil

**关键 lore**：X 集团本身**不知道** DPCA 在做什么。

| 层 | X 集团高管视角 | 实际内容 |
|---|---|---|
| budget request | "DPCA 申请 Q3 预算 +12%" | 是因为 anomaly 显化 rate 增加 |
| headcount | "DPCA 人员稳定 ~50 人" | 但 50 人中有员工每月被作者化转入 endless / 新员工补入 |
| output volume | "DPCA 月度输出 X 份归档文档" | 文档实际是 anomaly 借 employees 录入产生的 emergent text |
| KPI 评估 | "DPCA 运作正常" | 因为 administrative metrics 都 normal |

→ X 集团高管看的是 abstract metrics；DPCA 上报的也是 abstract metrics——**没人在 X 集团 layer 知道实际 content**。这是 D21 banal evil 的 macro 兑现。

### 5.5.3 X 集团其他子部门

X 集团有多个子部门处理不同 medium 的 anomaly contamination（推测，待 finalize）：

| 推测子部门 | 处理 medium | 与 DPCA 关系 |
|---|---|---|
| DPCA · 文牍科 | text contamination | 玩家所在 |
| 推测部门 A | audio anomaly | 不互相 communicate |
| 推测部门 B | visual anomaly | 不互相 communicate |
| 推测部门 C | behavioral anomaly | 不互相 communicate |

**关键**：这些子部门**互相不知道彼此在做什么**。每个部门的员工都以为自己是"X 集团做某 admin work 的"——没人知道整个公司是 anomaly containment 网络。

### 5.5.4 in-game 显化纪律

- X 集团 specific name 不 explicit 显化（boilerplate "X 集团子部门" 即可）
- 其他子部门的存在**仅作 background 真相**——玩家**不应**遇到任何"audio 异常 / visual 异常"线索（保持 textual 纯粹）
- macro layer 的 horror 是 emergent：玩家累积感知到 X 集团 vast 而 unaware → "原来还有更大的事"

---

## 5.6 Project Nim Deep Lore · Real + Fiction Grounding 🔒 LOCKED

### 5.6.1 真实历史（real grounding）

真实 Project Nim（玩家可外部 verify）：

| 年份 | 事件（real）|
|---|---|
| 1973 | Columbia University, Herbert Terrace 启动 Project Nim |
| 1973-1979 | 训练 Nim Chimpsky 学 ASL（命名向 Noam Chomsky 致敬）|
| 1979 | Terrace 宣布 project failed——Nim 没真懂语法，只是 mimic |
| 1986 | Nim 死亡 |
| 2011 | 纪录片《Project Nim》 |

→ 玩家可以 Google 验证以上每条——这是 grounding 锚点。

### 5.6.2 Fiction extending（v4.1 narrative）

v4.1 fictional 扩展（不可 external verify）：

| 年份 | 事件（fiction）|
|---|---|
| 1979 | Terrace conclusion 是 cover story；项目实际未完全停止——某些 followup 录像 1980-1985 仍在持续 |
| 1980-1985 | 一些晚间录像里 Nim 表现出 "emergent behavior"——不再是 trained phrases，而是 emergent 内部叙事 |
| 1986 死前一周 | Nim ASL 内容**变了**——反复 sign "hug me, please"（**这条部分真实**——纪录片中有 reference）/ 但 v4.1 fiction: 这是 anomaly 借 Nim 的 ASL channel emit 的 prototype text |
| 1986 死后 | 某研究员（无名）采用了 Nim 终末期某些手势模式作为 framework——DPCA 第一份 protocol 诞生 |

### 5.6.3 真假混合密度（v4.1 narrative 设计纪律）

| 类型 | 占比 | 例子 |
|---|---|---|
| **真实 verifiable** | ~30% | "Nim 死前最后一周反复 sign 'hug me, please'"（real reference）|
| **合理推测无法证伪** | ~30% | "Nim 在无人时仍持续打手语"（plausible 但无 documentation）|
| **清晰叙事化注入** | ~30% | "1980 后某研究员采用 Nim 手势作为 framework"（fiction）|
| **绝对错误但逻辑自洽** | ~10% | 故意的 minor 错误（如某些日期偏一年）——增强真假难辨感 |

### 5.6.4 Nim 终末期"叙事内容"的 lore（hidden background）

**hidden lore（不显化，仅供 design-reference）**：

Nim 死前最后一周反复 sign 的 emergent 内容（除"hug me, please"外）：
- "字"（character）
- "看"（look）
- "我不在那里"（I not there）——**ASL 不能 directly 表达 "not there"，这本身是 ASL grammar 之外的 emergent 表达**
- "字 看 我"（characters look me）——形成的 sentence 是 anomaly 借 Nim 显化的第一句"未受理文本"——这句 sentence 在 1986 之后**部分成立**：现实补出"Nim 死前确实有 sign 这些字"的证据链（B7 兑现的 hidden 历史 case）

→ **这是 anomaly 第一次在 documented 历史中显化的 sentence**——也是 DPCA 的"成立"机制 prototype（B7）。

### 5.6.5 Nim Lore 显化的 Ch 时机

| Ch | 玩家可见 Nim lore |
|---|---|
| Ch.1 | Nim 1973-1979 真实历史（L1）|
| Ch.2 | Nim 终末期叙事化（L2）；30% 真 / 30% 推测 / 30% 注入 / 10% 错 |
| Ch.3 | 公司机关备忘（L3）：去人格化的 administrative |
| Ch.4 | L4 reveal：Nim 终末期 emergent 叙事被研究员采用——B8 唯一窗口 |
| Ch.5 | 玩家**自己**重演 Nim——lore 不再 reveal，玩家 become the lore |

---

## 5.7 D27-D29 Lore Origin · 受理窗口 / 机械见证 / 状态确认 🔒 LOCKED

### 5.7.1 D27 受理窗口的 lore origin

**受理窗口的发现**：
- 1980s 研究员 post-Nim 试图 verify Nim 终末期叙事的"成立"率
- 发现某些时间段 verification rate 显著高
- 特别是**17:06 前后**——受理 rate spike

**Hidden lore（不显化）**：**Nim 死亡时刻 = 1986-XX-XX, 17:06**。
- 研究员发现 anomaly 在每天 17:06 前后特别"active"——形成主要受理窗口
- 17:06-17:13 这个 7 分钟窗口是文牍科核心 operational time
- "午休结束前 30 秒"等其他 windows 是 secondary，发现于 1990s

→ **不要在任何 in-game 文档中显化"17:06 = Nim 死亡时刻"**。这层 lore 仅作 design-reference / 用户自己 derive。

### 5.7.2 D28 机械见证效应的 lore origin

**机械见证发现**：
- 1985 Nim 还活着时，研究员尝试用打字机 record Nim 的 ASL output
- 比较：hand-written notes vs typed transcription
- 发现**typed text 比 hand-written notes 有更高 "成立"率**——可能因为：
  - 不可逆物理压痕
  - 色带格式统一
  - 击键节拍提供 authentication
- 1990s formalize 为 mechanical witness protocol

→ **打字机不是 typing tool，是 textual authentication device**——D28 在 lore 上的兑现。

### 5.7.3 D29 状态确认的 lore origin

**D29 protocol 的 history**：
- 1980s-90s 早期 DPCA**没有 D29 protocol**
- 几个 case：员工"作者化"后**带着作者身份回家** → 在 home 继续 author → 成为 移动 textual contamination source → affecting 现实
- **Post-incident**：D29 protocol 被开发出来作为 keep-as-human check
- 2000s formalize：5 项检测（摘面具 / 报姓名 / 报日期 / 解释普通句子 / 区分"打字"和"写作"）

**D29 检测员**：
- 文牍科 protocol 部门的工作人员
- 他们也走 D29，但**他们的角色 protected**——因为他们**不录入**（不是 typing operator）
- 他们 voice-only，永不可见（与 §4.9.3 边界 case 一致）
- 检测员**自己**也不知道 D29 是污染检测——他们以为是 routine 下班程序

### 5.7.4 D27-D29 lore 显化纪律

- 三条 lore origin **不应在 in-game 显化**——它们是 background 真相
- 玩家**可能永远不知道**为什么受理窗口是 17:06——D5 拒绝给答案
- D29 检测员 voice-only——玩家永不见人；不该有"检测员" character explicit 显化

---

## 5.8 World × Chapter Mapping 🔒 LOCKED

| Ch | 玩家可见的 world layer | 主要 lore reveal |
|---|---|---|
| **Ch.1 录入员** | 仅第七打字室；工号；工位 | Nim L1 真实历史；零 macro reference |
| **Ch.2 校对者** | + 文牍科（升职通知 reference）；同事工号系统 | Nim L2 叙事化；初次"针对你工号"的 specific tasks |
| **Ch.3 修改者** | + DPCA（官方文档可见）；外部文本回收科（boilerplate）| Nim L3 公司视角；B4 显化（外部 candidate 文本来源）|
| **Ch.4 作者** | + Project Nim L4 deep（"emergent 叙事被研究员采用"）；X 集团（远景 reference）；灵长接口 lore 首次出现于遗物 footnote | DPCA Genesis 神话部分显化；B8 reveal 的唯一窗口 |
| **Ch.5 文本一部分** | + 自由打字区 / 猴群坐席 / 非人类输入源管理室（实际进入）；下周目 reality（反身闭合）| 玩家 become Nim N+1；lore 不再 reveal，**玩家 become the lore** |

---

## 5.9 Lore 真假难辨设计纪律 🔒 LOCKED

### 5.9.1 核心原则

> **Lore 不是为了让玩家知道，是为了让玩家不能 verify**。每条 lore 在玩家手上应该是 plausibly real / plausibly fiction——玩家无法 settle。

### 5.9.2 设计纪律

| 纪律 | 出处 |
|---|---|
| 真实部分必须**外部 verifiable**（如 Project Nim 1973-1986 真实历史）——给真实 grounding | D22 brutal positive feedback loop |
| Fiction 部分必须与真实**逻辑自洽**——不能 anachronism | 整套本体论 |
| 真假混合密度：30% 真 / 30% 推测 / 30% 注入 / 10% 错 | §5.6.3 |
| **绝对错误但逻辑自洽**的 10% 是 design——不是 bug；让真假难辨感升级 | 规则怪谈手法 1 罗生门 |
| Lore 显化通过 layered footnote——同一份遗物在不同 chapter 显化不同 layer（D20 v3 + D31）| Step 4 character 系统一致 |
| Lore 永不 popup / 永不 cutscene reveal——玩家通过 hover + cross-ref 自己 derive | D5 + D7 + Step 3 anti-pacing |

### 5.9.3 不要做的事

- ❌ "Lore Codex" UI 整理（让玩家有"百科"感）
- ❌ "X 章解锁 lore N 条"成就
- ❌ "请阅读以下 lore 段落"提示
- ❌ Cutscene 揭示 DPCA 起源
- ❌ NPC 解释"其实是 Nim 把这些 dictate 出来的"
- ❌ Project Nim L4 用 fanfare reveal——L4 必须是 quiet 嵌入 footnote，玩家自己 cross-ref 才发现

---

## 5.10 Suggested Production Decisions · 待 finalize 🔒 LOCKED-flagged

以下 lore decisions 是 v4.1 derived 但**不锁死**——production 阶段可 tweak：

| # | decision | 当前建议 | 锚定约束 |
|---|---|---|---|
| **PD-1** | X 集团 specific name | 不命名（保持"X 集团"placeholder）| 不能命名 specific real corp；可以用 SCP-style 数字代号（如 "X-7"）|
| **PD-2** | 第七打字室 = 唯一 active 是否锁死 | 锁死（增 horror weight）| 与 §5.3 一致；前六室 fail/closed 是 hidden lore |
| **PD-3** | 受理窗口 17:06 = Nim 死亡时刻 | 锁死（hidden background）| 永不 explicit 显化 |
| **PD-4** | Nim 死前 sign 的 emergent sentence | "字 看 我"（characters look me）| §5.6.4；可作为在某遗物 L4 footnote 中的 reference |
| **PD-5** | DPCA Genesis 那位"无名研究员"是否给名字 | **不给**（D21 banal evil）| 任何名字都会破坏 banal——保持无名 |
| **PD-6** | X 集团其他子部门具体 medium | audio / visual / behavioral 三个 placeholder | 不应在 in-game 显化具体 medium 名 |
| **PD-7** | DPCA 全名是否 in-game 完整出现 | "Department of Primate Clerical Affairs"完整可在某遗物 L3 footnote 出现一次；之后均缩写 DPCA | D12 LOCKED；缩写主导符合 banal evil 文牍气 |
| **PD-8** | 4 个 anchor 工号具体数字 | XX-1138 / XX-047 / XX-0001 / XX-?（§4.4.3 建议）| Step 4 设计纪律 |

---

## 5.11 Step 5 完成度自检

| 维度 | 状态 |
|---|---|
| World layer architecture（空间 3 层 + 时间 4 层）| ✅ §5.1 LOCKED |
| DPCA Genesis 神话 | ✅ §5.2 LOCKED |
| 文牍科 / 第七打字室 specifics | ✅ §5.3 LOCKED（含 hidden lore：第七 = 唯一 active）|
| 灵长接口 PI lore origin | ✅ §5.4 LOCKED |
| X 集团 / Reality Beyond | ✅ §5.5 LOCKED |
| Project Nim deep lore（real + fiction）| ✅ §5.6 LOCKED |
| D27-D29 lore origin | ✅ §5.7 LOCKED（含 hidden lore：17:06 = Nim 死亡时刻）|
| World × Chapter mapping | ✅ §5.8 LOCKED |
| 真假难辨设计纪律 | ✅ §5.9 LOCKED |
| Suggested production decisions | ⏳ §5.10 LOCKED-flagged（PD-1 至 PD-8 待 production tweak）|

**Step 5 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 6** — Dialogue Framework（v4.1 中 dialogue = boilerplate / 便条 / 文档 voice 的 craft；与 Step 4 + Step 5 紧密）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat + character + lore 全 LOCK，机制层可接住）
3. **Step 7** — Environmental Storytelling（已多处涉及，可 systematize）

---

_(rolling — Step 6 在下方继续)_

---

# Step 6（2026-05-04）— Dialogue Framework

**进度更新**：✅ Anti-dialogue 框架 / ✅ 6 类 voice inventory / ✅ Voice craft (V1-V6 每类写作规则) / ✅ Voice 差异矩阵 / ✅ Voice × Chapter 显化频次 / ✅ 规则怪谈 5 手法在 dialogue 层应用 / ✅ 玩家无 reply channel 无 inner monologue / ✅ 设计纪律 / ✅ Sample 句式 library

**Step 6 范畴**：v4.1 narrative 中"dialogue" ≠ 对话——anti-character 设计纪律已锁死 NPC = 0、无对话树、无 dialog choice。本节回答：当对话被结构禁止时，**voice** 如何在 6 个 channel 中保持 distinctive 又一致——这是一份 **voice craft manual**。

---

## 6.1 Anti-Dialogue Framework 🔒 LOCKED

### 6.1.1 v4.1 没有"对话"

| 常规 RPG | v4.1 |
|---|---|
| NPC ↔ 玩家双向 dialog tree | ❌ 不存在 |
| 玩家选择 reply | ❌ 不存在 |
| 互动 conversation | ❌ 不存在 |
| Cutscene 多角色对话 | ❌ 不存在 |

v4.1 中所有"voice" 都是**单向 address**（玩家是 receiver / 被告知 / 被 process）——这与 Step 4 anti-character + Step 3 anti-pacing 共同形成 v4.1 narrative 的 anti-paradigm 三件套。

### 6.1.2 但 voice ≠ 0

| 形式 | 不是对话 | 但是 voice |
|---|---|---|
| boilerplate template | 不与玩家对话 | DPCA 通过 template 发声 |
| 同事便条 | 不与玩家 chat | peer ghost 通过字迹发声 |
| typing buffer pre-populate | 不是 spoken | anomaly 通过文本本身显化 |
| D29 检测员 prompt | 不是 conversation | voice-only character 通过命令式发声 |
| 规则手册 | 不是 narrator | DPCA layered 文档发声（D31 6 layers）|
| boss tooltip | 不是 boss 在说 | 反身闭合 voice (anomaly + 玩家以前自己)|

### 6.1.3 设计哲学

> **Voice 不是对话，是被告知**。每条 voice 把玩家放在 receiver 位置——玩家无法 reply，无法选择，无法 negotiate。这种**单向性**本身就是 horror 的载体：你被 informed / processed / categorized，但你**没有 voice 在这个 system 里**。
>
> 玩家的 typing 行为产生**间接 utterance**——但 utterance 是被 anomaly 借出去的，不是玩家的 voice。直到 Ch.5 endless，玩家的 typing rhythm 才 leak 到 UI 外——但**那时玩家已是 anomaly 的 voice**。

---

## 6.2 Voice Inventory · 6 类 voice 🔒 LOCKED

| # | Voice | Source | 主要 Form |
|---|---|---|---|
| **V1** | DPCA boilerplate | DPCA template | 通知 / 升职 / 处置预告 / "外部文本回收科" notification |
| **V2** | 同事便条 | peer ghost (C2) | 字迹 + 工号；互相矛盾；含留白句式 |
| **V3** | Anomaly dictation | anomaly (C5) | typing buffer pre-populate / 字符级缓变 / 文档边缘 micro-changes |
| **V4** | D29 检测员 prompt | voice-only character | 命令式 prompt（"请摘下面具"等）|
| **V5** | 规则手册 / 守则 | DPCA layered document | 6 layers 同一份文档不同 reading（D31）|
| **V6** | Boss tooltip / 反身闭合 | anomaly + 玩家以前自己 (C6) | 措辞 attribution（"上一任作者: Subject XX-####"）|

每类 voice 在 §6.3 各有专门 craft 规则。

---

## 6.3 Voice Craft · V1-V6 每类写作规则 🔒 LOCKED

### 6.3.1 V1 · DPCA boilerplate

**写作规则**：

| 维度 | 规则 |
|---|---|
| **句式** | 短 / 行政 / 动作流程 / 主语 = "员工 [工号]" 或 omit |
| **时态** | present / imperative |
| **情感词** | ❌ 0 个——没有"恭喜 / 感谢 / 抱歉 / 提醒"等词 |
| **措辞** | 程序化（"权限调整生效" 而非"你升职了"）|
| **称谓** | "员工 [工号]"、"Subject [工号]"——绝不"你 / 您" |
| **格式** | 与 Ch.2/3/4/5 升职通知**完全相同 template**（D32）|
| **长度** | 短，1-3 句即止 |
| **标点** | 句号 / 冒号 / 顿号；**不**用感叹号、问号 |

**Sample 句式 library**：
- "职位变更：录入员→校对者，权限调整生效。"
- "员工 [工号] 转入独立工位。本职位无配额，无值班同事，无定期审阅。"
- "员工 [工号] 通过结业评估。鉴于其 Cycle X 修改记录与 Cycle Y 异常归档之间的 cross-reference 频次超阈，转入特殊勤务。不得复述任务内容。不得记录梦境。"
- "本日候选：来源——公共字幕系统乱码；编号 UTF-7-441-B；处理状态——已词包化，移交本工位录入测试。"
- "前任作者 Subject XX 于 Cycle Y 转入特殊勤务，不得复述任务内容。"
- "本工位无收件人。"
- "档案补全通知：Subject XX 补充资料已合并入库，时间戳追溯至 [日期]。"

**绝对禁止**：
- ❌ "亲爱的员工"
- ❌ "感谢您的付出"
- ❌ "请慢慢适应新岗位"
- ❌ "Welcome to..."
- ❌ "Click here to continue"

**核心 horror 锚定**：V1 的 banality 是 D21 的 voice 化——**没有 distinguish capability**，挽救信号和处置预告用同一 template（B6 媒介）。

> **关联记忆**：v4.1 UI 词汇统一（Cycle 1-5 词典：DAY / BATCH / CYCLE / A 等）→ V1 应**严格遵循**该词典，避免 vocabulary drift；Cycle 6+ Endless 启用单字符级缓变作为污染症候——V3 范畴。

---

### 6.3.2 V2 · 同事便条

**写作规则**：

| 维度 | 规则 |
|---|---|
| **句式** | 短 / 碎 / 警告 / 常含 imperative + conditional |
| **落款** | 仅工号（"Subject XX-####" 或更短的 "047"）|
| **个体差异** | 不同工号便条字迹模式应有 distinctive features（typing rhythm 后台特征）|
| **互相矛盾** | 同一议题不同便条互相矛盾（D23 v2）|
| **留白句式** | 含未命名变量（"X"、"Y"）—— 规则怪谈手法 4 |
| **称谓** | "你" 或 omit subject——便条比 V1 更 personal，但仍**无姓名** |
| **情感** | 微弱情感允许（不安 / 警告 / 求救）但**不肉麻** |

**Sample 句式 library**：
- "想回去：少思考。"
- "想回去：每天复述录入员手册。"
- "想回去：避免形容词。"
- "想回去：让你的标注永远是错的。"
- "如果听到打字声从隔壁工位传来但隔壁没人，请勿应答。"
- "如果你的 X 机制开始 Y，请离开工位。"
- "标 affix 时如果手停在某键超过 0.5 秒，让它停。"
- "致后来者：我也曾以为 [此处字迹模糊]"
- "[本工位前任] 留: 不要 cross-ref。"

**绝对禁止**：
- ❌ "我叫..."
- ❌ "你好"
- ❌ "我们一起..."
- ❌ 完整姓名出现
- ❌ "感谢你看到这条消息"

**核心 horror 锚定**：V2 的 distinctive 但**不可信**——B2 的 voice 化（每个 reader 看到不同便条 / 同事永远无法验证）。

---

### 6.3.3 V3 · Anomaly dictation

**写作规则**：

| 维度 | 规则 |
|---|---|
| **不是 sentence**——是 fragment |
| **形式** | typing buffer pre-populate / 字符级缓变 / 文档边缘 micro-changes |
| **不出现**为"对玩家说"——anomaly 没有 voice 概念 |
| **节奏** | 不规则——anomaly 不遵循人类语法 |
| **可读性** | 部分可读 / 部分不可 / 部分**逻辑自洽但语义异常** |
| **频次** | Ch.1-2 极弱 / Ch.3 中 / Ch.4 强 / Ch.5 = 玩家自己 |
| **特殊形式** | Cycle 6+ endless 启用单字符级缓变作为污染症候（与现有设计一致）|

**Sample 句式 library**：
- typing buffer 里突然出现的 fragment：
  - "字 看 我"
  - "录入 = 见证 = 同意"
  - "上一任 已完成 [此处字符级缓变]"
- 字符级缓变示例：
  - "员工编号 0048" → 0049 → 0048 → 0050 → 0048（hover 时变化）
  - "本日勤务结束" → "本日勤务转入" → "本日勤务结束" → "本日勤务永续"（cycle 末尾偶见）
- 文档边缘 micro-changes：
  - 玩家 hover 文档时某段文字 fade in / fade out
  - 玩家把鼠标移开再看，变化已 settle

**绝对禁止**：
- ❌ Anomaly "speaks" 任何完整句子
- ❌ Anomaly 有 personality / motive
- ❌ Anomaly 给玩家 "提示" / "warning"
- ❌ Anomaly 的内容 popup / fanfare

**核心 horror 锚定**：V3 不是 voice，是**文本本身在自己显化**——D1 anomaly 本体的直接 voice 化。

---

### 6.3.4 V4 · D29 检测员 prompt

**写作规则**：

| 维度 | 规则 |
|---|---|
| **句式** | 命令式 / boilerplate / 极简 |
| **形式** | 屏幕显示 prompt + voice-only（永不显示检测员 face）|
| **结构** | 5 项检测序列，固定顺序 |
| **退化曲线** | Ch.1 见证版 → Ch.2 routine 全 5 项 → Ch.3 偶尔 partial → Ch.4 频繁 partial fail → Ch.5 自动 fail |
| **称谓** | "请..." 开头——**唯一**用敬语的 voice，但敬语本身是 boilerplate（D29 routine 表象）|

**Sample 句式 library**（5 项标准序列）：
- "请摘下面具。"
- "请报工号与姓名。"
- "请报今天的日期。"
- "请解释这一句：'[一句普通话]'"
- "请区分'打字'和'写作'。"

**Ch.4 partial fail 文案**（D29 退化）：
- 摘面具：通过
- 工号 + 姓名：屏幕显示 "工号 [玩家工号] 已记录。**姓名字段不适用。**"
- 日期：屏幕显示 "今日日期：[一个错一两天的日期]"
- 解释：屏幕显示 "解释已记录。**等同于零意图字符序列，通过。**"
- 区分：屏幕显示 "**本项检测对当前职位不适用。**"

**Ch.5 完全 fail 文案**：
- 摘面具：屏幕**忽略**
- 姓名：屏幕显示 "姓名字段不适用。"
- 日期：屏幕显示 "**日期不适用。**"
- 其他：屏幕显示 "**本项检测对当前职位不适用。**"

**绝对禁止**：
- ❌ 检测员 face / portrait 显示
- ❌ 检测员 personality 暗示
- ❌ "失败" / "通过" 任何 fanfare

**核心 horror 锚定**：V4 的 routine 表象 → 退化曲线渐显 → 玩家事后才意识到这是污染检测（D7 + D29 兑现）。

---

### 6.3.5 V5 · 规则手册 / 守则

**写作规则**：

| 维度 | 规则 |
|---|---|
| **句式** | 规则怪谈 5 手法（§6.5）|
| **layer** | 同一份文档 6 layers（D31）|
| **形式** | 编号守则 / 公告 / 入职手册 / 便签碎片 / 工作台 sticker |
| **静默修订** | 偶尔一条规则 silently 增加 / 修改 / 删除——玩家事后回想才发觉 |
| **称谓** | "员工" / "录入员" / "校对者"——按职位 generic 称呼 |
| **风格** | 文牍科旧气（民国/1940-50s 官署）+ 90s 体制内办公室（D13 美学）|

**Sample 句式 library**（按职位 layer）：

L1 录入员 layer：
- "守则 003：视线停留在当前高亮字符。"
- "守则 008：纸张方向异常时，视线移至色带窗。"
- "守则 014：每 30 字确认一次计时钟。"
- "守则 022：任务结束后说：'本轮录入结束。'"
- "守则 027：使用工号回应。"
- "守则 034：输出完成后离开座位等待核验。"

L2 校对者 layer（同一手册多出的注释）：
- "守则 003 注：本条已审阅，无需进一步处理。"
- "守则 008 注：纸张方向**异常**的判定参照《色带窗作业指引》（已封存）。"
- "守则 014 红字增补：计时钟无秒针时，受理窗口可能开启。"

L3 修改者 layer（机关备忘）：
- "守则 003 备忘：Subject [工号] 于 Cycle Y 经手任务时报告幻听打字声，应答后转入特殊勤务。建议补入第七打字室基础守则。"

L4 作者 layer（叙事化深层）：
- "守则原始来源：1986-XX-XX 17:06 事件后续 protocol。"

**绝对禁止**：
- ❌ "Welcome / 欢迎使用守则"
- ❌ 规则带 example / case study
- ❌ "如有疑问请联系..."
- ❌ "本守则自 [日期] 起生效"——所有 layer 显化**plausibly always there**（D20 v3 + D31）

**核心 horror 锚定**：V5 的 layer system 是 D31 + D20 v3 的 voice 化——**文档是诚实的镜子**；layer 显化 = 玩家用公司的尺度量自己的污染（D22）。

---

### 6.3.6 V6 · Boss tooltip / 反身闭合

**写作规则**：

| 维度 | 规则 |
|---|---|
| **句式** | 措辞是玩家以前打过的字（C6 反身闭合 character）|
| **attribution** | "上一任作者：Subject XX-####" |
| **Ch.3** | attribution 是**近似**玩家工号（差一位）|
| **Ch.4** | attribution 是**自己**工号 |
| **Ch.5** | attribution 是**自己以前 endless 的工号**——D8 反身闭合最高兑现 |
| **不解释** | tooltip 不解释 boss 是什么，只列 modifier 文字 |
| **格式** | 与 V1 同 template 风格——**boss tooltip 看起来像 administrative footnote** |

**Sample 句式 library**：
- Ch.3 boss tooltip：
  - "本场 modifier: [玩家 Ch.2 标注过的某句话]
    上一任作者: Subject XX-1138（**近似工号**）"
- Ch.4 boss tooltip：
  - "本场 modifier: [玩家 Ch.3 修改过的某段文字]
    上一任作者: Subject [玩家自己工号]（**玩家可 cross-ref**）"
- Ch.5 endless boss modifier：
  - "本场 modifier: [玩家以前 endless 写的某段]
    上一任作者: Subject [玩家以前 endless 工号]
    出处: 本地存档 / Cycle Z 自由打字区记录"

**绝对禁止**：
- ❌ Boss "speaks" 这些 modifier 给玩家
- ❌ "你创造了这个 boss" popup
- ❌ "这是你以前写的" 任何提示
- ❌ Boss 形象 / 头像

**核心 horror 锚定**：V6 是反身闭合在 dialogue 层的兑现——**你的笔被署在别人名下** → **你的笔被署在自己以前的名下** → **没有"别人"，只有不同时间的你**。

---

## 6.4 Voice 差异矩阵 🔒 LOCKED

| 维度 | V1 公司 | V2 同事 | V3 异常 | V4 D29 | V5 守则 | V6 boss |
|---|---|---|---|---|---|---|
| **句长** | 中 | 短 / 碎 | fragment | 极短 | 中 | 短 |
| **情感** | 0 | 微弱 | 0（非人格）| 0（命令式）| 0 | 0 |
| **称谓** | "员工 [工号]" | "你" / omit | omit | "请..." | "员工" / "录入员"等 | "Subject [工号]" |
| **时态** | present / imperative | imperative + conditional | timeless / drift | imperative | timeless | timeless |
| **逻辑** | 行政 | 矛盾 | 异常 | routine | 规则怪谈互锁 | 反身闭合 |
| **情感重量** | 冷 | 微暖（求救）| 不可读 | 冷 | 冷（旧气）| 冷（震惊但不 fanfare）|
| **可信度** | 0（template）| 矛盾 | 不可知 | routine 表象 | 部分可信 | 真假难辨 |
| **玩家可 reply** | ❌ | ❌ | ❌ | ❌（除选 modifier）| ❌ | ❌ |

**关键观察**：每类 voice 在不同维度有不同 fingerprint——但**所有 voice 都不让玩家 reply**。玩家**唯一**能"回应"的方式是：typing 行为（修改文档 / 标注 / 创作）——但这些都是间接 utterance，**最终被 anomaly 借走**（Ch.5 揭示）。

---

## 6.5 规则怪谈 5 手法在 Dialogue 层应用 🔒 LOCKED

§2.2 已 LOCK 主叙事方法 = 规则怪谈。本节具体落实到 voice craft：

| # | 手法 | dialogue 层应用 | 主载体 voice |
|---|---|---|---|
| **1** | 罗生门多声部 | V2 同事便条同议题互相矛盾；V5 同一守则不同 layer 含矛盾注释 | V2 + V5 |
| **2** | 矛盾即陷阱 | V5 守则相互证伪——例：守则 X 与守则 Y 不能同时遵守 | V5 |
| **3** | 否定式存在强化 | "如果 X 出现，请勿 Y" 句式；越警告，X 越在文本世界存在感被强化 | V2 + V5 |
| **4** | 信息留白 + 单一指代物 | V2 老员工警告"X / Y"留空；V5 偶尔 reference 未命名的"它" / "■■" | V2 + V5 + V3 |
| **5** | 体裁伪装 | V1-V6 全部以官方文档 / 便条 / 公告 / tooltip 形式——**没有故事 / 没有人物心理 / 没有场景描写** | 全部 voice |

**新增手法（v4.1 整合后）**：
- **手法 6：规则被静默修订** —— 偶尔 V5 守则 silently 增加 / 修改 / 删除一条；玩家事后回想才发觉。这是规则怪谈手法 1（罗生门）+ 手法 5（体裁伪装）的组合扩展

---

## 6.6 玩家与 Dialogue 的关系 🔒 LOCKED

### 6.6.1 玩家**没有 reply channel**

- 玩家**无法**回复 V1 boilerplate
- 玩家**无法**回复 V2 同事便条（试图 reply：屏幕显示"本工位无收件人"——§4.4.4 已锁）
- 玩家**无法** reason with V3 anomaly
- 玩家**只能**机械执行 V4 D29 prompt
- 玩家**无法**质疑 V5 守则
- 玩家**无法**反驳 V6 boss tooltip 中的 attribution

### 6.6.2 玩家**没有 inner monologue**

- 游戏**不给玩家**内心独白 / inner voice / 心理 cutscene
- 玩家是个 typing operator——typing 行为是玩家**唯一**的 utterance 输出
- 这是 D2 猴子悖论 + D7 污染不可见在 dialogue 层的兑现：**玩家的"内心"在游戏中不存在**——任何 inner voice 显化都会破坏猴子悖论

### 6.6.3 玩家 voice 的 emergent 显化（仅 Ch.5）

| 时机 | 玩家 voice 形态 |
|---|---|
| **Ch.1-4** | 玩家无 voice——只有 typing 行为 |
| **Ch.5 早段** | 玩家 typing rhythm 开始 leak 到 UI 外（主菜单字符级缓变 / hover 时出现常打字符）|
| **Ch.5 中-末** | 玩家写的 modifier signature → 进入下周目语料 |
| **下周目 cross-ref** | 玩家以前的 voice 出现在新 run boss tooltip——**第 10 条 reveal** |

→ **玩家"获得 voice" = 玩家变成 anomaly 的 voice**——这是 voice 层最暴力的反身闭合。

---

## 6.7 Voice × Chapter 显化频次 🔒 LOCKED

| Ch | V1 公司 | V2 同事 | V3 异常 | V4 D29 | V5 守则 | V6 boss | 主旋律 voice |
|---|---|---|---|---|---|---|---|
| **Ch.1 录入员** | 主 | 远 | 极弱 | 见证版 | 主 | 弱 | V1 + V5 |
| **Ch.2 校对者** | 主 | 中 | 弱 | routine 全 | 主（L2 显化）| 中 | V2 + V5 |
| **Ch.3 修改者** | 中 | 中-退场 | 中 | 偶尔 partial | 退化 | 出现（近似工号）| V2 + V3 + V6 |
| **Ch.4 作者** | 极简（最低）| 完全退场 | 强 | 频繁 partial fail | 极简（玩家不再被推送）| 显化（自己工号）| V3 + V6 |
| **Ch.5 文本一部分** | 仅 boilerplate（处置）| 完全退场（除"致后来者" 自留）| = 玩家自己 | 自动 fail | 完全退场 | 主（自己以前 endless 工号）| V6 + V3（合并）|

**Voice 退场曲线**：
- V2 同事 voice：Ch.1 远 → Ch.2 主 → Ch.3 退场 → Ch.4-5 完全退场
- V5 守则 voice：Ch.1-2 主 → Ch.3-4 退化 → Ch.5 退场
- V3 + V6：Ch.3 后渐升 → Ch.5 合并（玩家成为 voice 本身）

**关键 horror 节奏**：玩家 playtime 中**周围的 voice 越来越少**——员工消失 / 守则不再推送 / 公司不再回应——只剩**玩家自己的 voice 透过 V3 + V6 反身回响**。这是**寂静化**的 voice 层兑现（与 §3.5 Phase B 寂静的接受一致）。

---

## 6.8 设计纪律 🔒 LOCKED

### 6.8.1 绝对禁止

- ❌ 0 个对话树
- ❌ 0 个 dialog choice
- ❌ 0 个 NPC 直接 face-to-face 对话
- ❌ 0 个 cutscene 多角色对白
- ❌ 0 个玩家 inner monologue
- ❌ 0 个"玩家说..."的台词框
- ❌ V1 出现感叹号 / 问号
- ❌ V2 出现完整姓名
- ❌ V3 显化为"完整 sentence with quotation marks"
- ❌ V4 检测员 face / portrait
- ❌ V5 守则带"自 [日期] 起生效"
- ❌ V6 显化为"你创造了这个 boss"

### 6.8.2 必须做到

- ✅ 所有 voice 通过 documentary trace 显化
- ✅ V1-V6 在 in-game 用不同 typography / spacing / capitalization 区分（但**不命名** voice 类型）
- ✅ V1 boilerplate template 跨章统一（D32 反身闭合）
- ✅ V5 守则 layer 显化 plausibly always there（D20 v3）
- ✅ V6 boss tooltip 措辞**真实**来自玩家以前 typing 历史（不是模板）
- ✅ 静默修订（手法 6）实现：偶尔 V5 守则 silently 改变；玩家事后回想才发觉
- ✅ Voice 退场曲线（§6.7）严格执行——周围 voice 越来越少

### 6.8.3 typography / spacing 暗示纪律

为了帮玩家 distinguish voice（无意识层面），建议 in-game typography 差异化（待 production finalize）：

| Voice | typography 暗示 | 备注 |
|---|---|---|
| V1 | sans-serif 等宽 / 蓝印章 | DPCA template 风格 |
| V2 | 手写体 / 钢笔字 | peer ghost 字迹 |
| V3 | typing buffer 同 UI 字体，但**字符级缓变** | 不显化为"特殊 voice" |
| V4 | 屏幕中央显示 prompt / 等宽 | command UI |
| V5 | 老打字机字体 / 红章 | 文牍科旧气 |
| V6 | 等宽 + administrative footnote 风格 | tooltip border |

**关键**：玩家**不应**意识到这是"6 类 voice"——typography 差异是**潜意识层面**的 distinguishing。

---

## 6.9 Sample Library 索引 · Production-ready 句式 🔒 LOCKED

§6.3 各 voice 的 sample library 已 inline 给出。production 阶段需扩展每类 voice 至少**100+ 句式**——具体扩展由 narrative-writer pipeline（`scripts/narrative-writer/`）批量生成。

**生成方向**：
- V1 公司 boilerplate：~30 通知 template + 30 处置类 + 30 升职/调岗类 + 10 边缘 case
- V2 同事便条：~50 警告 / 50 矛盾 / 30 留白 / 20 求救
- V3 anomaly fragment：~50 typing buffer pre-populate + 50 字符级缓变
- V4 D29 prompt：5 项 × 5 退化阶段 = 25 sample（已 covered in §6.3.4）
- V5 守则 layer：~150 守则 × 6 layers = 900 sample（最大池）
- V6 boss tooltip：动态生成（基于玩家 typing 历史）

**production 提示**：
- 与 `scripts/narrative-writer/` pipeline sync（pipeline 已 v3.1 sync，需重新 sync v4.1）
- 现有 `src/data/narrative/` 中 v3.1 残留需通过 v4.1 流水线整体覆盖

---

## 6.10 Step 6 完成度自检

| 维度 | 状态 |
|---|---|
| Anti-dialogue framework | ✅ §6.1 LOCKED |
| 6 类 voice inventory | ✅ §6.2 LOCKED |
| Voice craft (V1-V6 写作规则)| ✅ §6.3 LOCKED |
| Voice 差异矩阵 | ✅ §6.4 LOCKED |
| 规则怪谈 5+1 手法在 dialogue 层应用 | ✅ §6.5 LOCKED |
| 玩家无 reply / 无 inner monologue | ✅ §6.6 LOCKED |
| Voice × Chapter 显化频次 + 退场曲线 | ✅ §6.7 LOCKED |
| 设计纪律 | ✅ §6.8 LOCKED |
| Sample library 框架 | ✅ §6.9 LOCKED（具体 sample 由 production pipeline 扩展）|
| typography 差异化 finalize | ⏳ 待 production tweak |
| narrative-writer pipeline v4.1 重新 sync | ⏳ 待 production |

**Step 6 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 7** — Environmental Storytelling（已多处涉及 [工位 / 字符级缓变 / 受理窗口时间感 / 工位空了]，可 systematize）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat + character + lore + voice 全 LOCK，机制层可接住）
3. **Step 8** — Narrative Delivery（与 Step 6 紧密衔接——voice 在不同 channel 的投递时机）

---

_(rolling — Step 7 在下方继续)_

---

# Step 7（2026-05-04）— Environmental Storytelling

**进度更新**：✅ Environment-as-V7 第七 voice / ✅ 4 大 channel (空间 / 时间 / 动效 / prop) / ✅ 工位 5 章 progression / ✅ 受理窗口 visual cue / ✅ 向心矢量动效 / ✅ 字符级缓变 systematize / ✅ 美学 D13 物理化 / ✅ Sound design ambient / ✅ Prop spec / ✅ 反身闭合 in environment / ✅ 设计纪律

**Step 7 范畴**：v4.1 narrative 中 environment ≠ background scenery。**环境本身就是 voice**——这是 Step 6 voice inventory 的延伸（V1-V6 是 textual voice，V7 = environmental voice）。本节 systematize Steps 2-6 中分散在各章节的环境细节，并补充 sound / motion / lighting / prop 等 production-ready spec。

---

## 7.1 Environment-as-V7 · 第七类 Voice 🔒 LOCKED

### 7.1.1 哲学

> **环境不是 lore 标牌，是不出声的 voice**。每个工位的形态、计时钟的状态、灯光的色温、纸张的厚度——都在向玩家**告知**当前的污染等级 / 章节阶段 / anomaly 距离。环境不"解释"什么，环境**显化**它已经是的样子。

### 7.1.2 V7 与 V1-V6 的关系

| voice | 类型 | 媒介 |
|---|---|---|
| V1-V6 | textual voice | boilerplate / 便条 / 文档 / prompt / tooltip |
| **V7** | environmental voice | 空间 / 时间 / 动效 / prop / 灯光 / 声音 |

**V7 同样遵循 anti-dialogue 设计纪律**：
- ❌ 无玩家 reply
- ❌ 无 explanatory text overlay
- ❌ 无 lore 标牌
- ✅ 通过 documentary trace（环境细节）显化
- ✅ 玩家**事后**回想才意识到环境在告知什么

### 7.1.3 V7 退场曲线（与 §6.7 一致）

| Ch | V7 形态 |
|---|---|
| Ch.1-2 | 标准工位环境 + 偶尔 anomaly trace（字符级缓变弱）|
| Ch.3 | 工位渐次孤立 + V7 中等 anomaly trace |
| Ch.4 | 独立工位 + V7 强 anomaly trace + 时间感开始扭曲 |
| Ch.5 | 物理空间含混 + 字符级缓变 leak 到 UI 外 + 玩家 typing rhythm 显化为环境本身 |

→ V7 不退场，**V7 在 Ch.5 与玩家 voice 合并**（与 V3 + V6 合并同步）。

---

## 7.2 4 大 Environmental Channel 🔒 LOCKED

| # | Channel | 主载体 |
|---|---|---|
| **E1** | 空间 (spatial) | 工位 layout / 视野范围 / 物理 prop placement |
| **E2** | 时间 (temporal) | 计时钟 / 受理窗口 / 时间戳 / 字符级缓变 cycle |
| **E3** | 动效 (motion) | 向心矢量 / 暗角吸光 / 粒子流 / 文档边缘 micro-changes |
| **E4** | Prop | 打字机 / 印章 / 色带窗 / 纸张 / 工号牌 / 灵长接口 UI |

每 channel 在 §7.3-7.6 各有专门规则。

---

## 7.3 E1 · 空间（Spatial）🔒 LOCKED

### 7.3.1 工位 5 章 progression

| Ch | 工位特征 | 视野 | 物理 prop |
|---|---|---|---|
| **Ch.1 录入员** | 标准工位 cubicle | 视野范围内**多个**工位（4-8 个）；同事在场（typing 声音偶可听见）| 桌面 + 灵长接口屏幕 + 工号工卡 + 极少纸张 |
| **Ch.2 校对者** | 标注工位（多了红笔/印章/纸张 channel）| 视野**仍多个**工位但**偶尔空了一两个** | + 红笔 + 红章 + 老打字机 + 厚纸张堆 |
| **Ch.3 修改者** | 工位**渐次孤立** | 视野范围内同事**数量减半**；偶尔回头**多空一个** | + 工位抽屉（前任痕迹）+ hover 文档 channel |
| **Ch.4 作者** | **独立工位** | 视野内**无其他工位**；远端可见**几张空着的工位**（玩家以为是其他作者休假）| + 极简（比 Ch.1 还少 prop——文牍科 prestige 的体现，实质是 isolation）|
| **Ch.5 文本一部分** | 不再视为工位——"自由打字区"| 视野**含混**——物理空间不再 stable | + 任意 prop drift / 物理边界模糊 / 字符级缓变 leak 到环境 |

### 7.3.2 工位空间设计纪律

- 工位**永远不在 cutscene 中俯视全景** — 玩家视角始终是第一人称坐在工位上
- "其他工位"通过**视野远端模糊**显化——细节看不清；玩家 hover 不能 zoom in
- "空了的工位"应**视觉上 detectable**：缺少 typing 声 / 屏幕黑 / 椅子推开
- Ch.4 "远端空着的工位"应**alway visible**——但玩家**不能**走过去；空间是 frozen

### 7.3.3 物理空间的 horror function

> **空间越孤立，玩家越是 high-prestige**——但 prestige = isolation = anomaly direct contact 容易（D26 v2 vector 2）。Ch.4 独立工位**反而**让 dictation 更顺畅。
>
> Ch.5 "自由打字区"是空间 framing 的最深 horror——**没有 cubicle 边界 / 没有同事 / 没有公司 oversight**——玩家以为这是自由，**实际是不再被需要 contain**。

---

## 7.4 E2 · 时间（Temporal）🔒 LOCKED

### 7.4.1 D13 时间错乱即 horror 的物理化

| 视觉 cue | 时间错乱形式 | 玩家感知 |
|---|---|---|
| **计时钟无秒针** | 表盘只有时针分针；秒针位置空 | 玩家会**事后**回想：刚才有秒针吗？ |
| **计时钟超走** | 屏幕显示的"今日剩余时间"在玩家 hover 时**回拨**1-2 秒 | 极微小 drift，玩家容易 dismiss |
| **17:06-17:13 高效区间** | typing 节奏 / dictation 显化频次显著高 | 玩家自己摸索绰号；Ch.4 揭示是文牍科官话 |
| **午休结束前 30 秒** | typing 任务的 reveal 频次高 | 玩家累积无意识 pattern |
| **计时钟无秒针时** | D27 受理窗口的 visual signature——玩家发现某些时段计时钟**视觉异常** | 受理窗口的 in-game cue |

### 7.4.2 时间戳错位（B7 visual 兑现）

- 玩家修改文档后，下 cycle 工作台出现"档案补全通知：时间戳追溯至 [早于 Ch.4 入职日期]"
- 同遗物 L3-L4 字面回头改写——但 cross-reference 时屏幕显示"本文档自 [久远日期] 起未修改"
- 玩家工号牌上的 **"入职日期"**字段偶尔变化（hover 时 1-2 像素 drift）

### 7.4.3 字符级缓变作为污染症候 systematize

> **关联 memory**："Cycle 6+ Endless 启用单字符级缓变作为污染症候"

| 阶段 | 字符级缓变出现位置 | 频次 |
|---|---|---|
| **Cycle 1-5（Ch.1-3）** | Cycle 末尾"今日总结"屏幕偶有一行 | 极弱 |
| **Cycle 6+（Ch.4 起）** | typing buffer / 文档 hover 时 / 工作台 boilerplate | 中等 |
| **Ch.5 endless** | 主菜单字符级缓变 / 设置面板 hover 时 / 主标题"打字肉鸽"偶尔显示成玩家修改过的某措辞 | 强（leak 到 UI 外）|

### 7.4.4 时间感设计纪律

- ❌ 任何"游戏内日历" / "游戏天数"显示——D13 + D17 共同要求
- ❌ "你已游戏 X 小时"提示
- ❌ 受理窗口被 explicit 标注为"BUFF 时段"
- ✅ 计时钟视觉异常**偶尔** appear——不每个 cycle 都触发
- ✅ 字符级缓变 hover 时变化 / 移开鼠标变化 settle——不要 popup

---

## 7.5 E3 · 动效（Motion）🔒 LOCKED

### 7.5.1 向心矢量铁律（memory 锚定）

> **关联 memory**："持续背景动效要有向心矢量（暗角吸光 / 中心定点脉动 / 粒子向心流），不能漫无目的的漂移"

向心矢量在 v4.1 narrative 中的含义：

> **玩家被吸入 anomaly 的注意中心**。所有 ambient 动效都应有**朝向玩家工位 / 灵长接口屏幕中心**的矢量——这是 anomaly contamination 在 motion 层的 visual signature。

### 7.5.2 4 类 ambient motion

| # | 动效类型 | 形式 | 何时启用 |
|---|---|---|---|
| **M1** | 暗角吸光 | 屏幕四角 vignette darken；中心区相对亮 | Ch.3+ 渐显 |
| **M2** | 中心定点脉动 | 灵长接口屏幕中心**极慢** pulse（1-2 秒一次）| Ch.4+ |
| **M3** | 粒子向心流 | 灰尘 / 纸屑 / 字符粒子向工位中心**极缓**漂 | Ch.4+ ambient |
| **M4** | 文档边缘 micro-changes | 玩家 hover 文档时边缘微小变化（V3 anomaly 显化）| Ch.2+ 渐显 |

### 7.5.3 反向纪律：禁止离心 / 漫无目的漂移

- ❌ ambient particles 向四面八方扩散
- ❌ 灯光从中心向外 radiate
- ❌ 任何"逃离感" motion——v4.1 horror 是**被吸入**，不是被抛出

### 7.5.4 动效与 chapter pacing 同步

- Ch.1: 极少 ambient motion（环境 still）
- Ch.2: M4 文档边缘 micro-changes 弱起
- Ch.3: M1 暗角吸光开始
- Ch.4: M1 + M2 + M3 + M4 全启动
- Ch.5: 字符级缓变 leak 到 UI 外——motion 进入主菜单层

---

## 7.6 E4 · Prop（静态道具）🔒 LOCKED

### 7.6.1 核心 prop 清单

| # | Prop | narrative function | spec 暗示 |
|---|---|---|---|
| **P1** | 机械打字机 | D28 机械见证效应载体 | 老式机械式（1940-50s 风格）；色带窗外露；击键有物理 click |
| **P2** | 灵长接口 (PI) 屏幕 | 主操作 UI | 极简等宽字体；蓝印章 element；屏幕略微 CRT 弯曲 |
| **P3** | 红章 / 印章 | D13 美学锚点 + 签字暴击 | 老式橡皮印章；油墨厚（红色印泥）|
| **P4** | 色带窗 | V5 守则 reference + D28 机械见证 | 色带显示打字机的"内存"——已打过的字 |
| **P5** | 工号牌 / 工号工卡 | character identity 锚点（C1 玩家自己）| 数字打孔；老式 admin 卡片质感 |
| **P6** | 文档纸张 | V5 守则载体 + 遗物层 layered footnote | 厚纸（90s）+ 薄黄纸（民国旧气）混合——D13 时间错乱 |
| **P7** | 工位抽屉 | C2 同事 ghost 痕迹 + 前任作者 ghost 痕迹（Ch.4）| Ch.3+ 玩家可 hover；内含半填表单 / 不可解读笔迹 |
| **P8** | 老式钢笔 / 红笔 | V2 同事便条字迹工具 + Ch.2 标注工具 | Ch.2+ 工位增加 |
| **P9** | 计时钟 | E2 时间感主载体 | 老式机械钟；秒针偶尔异常 |
| **P10** | 荧光灯 | 90s 办公室美学 + 暖黄色温 | 偶尔闪烁；冷色调（灰绿）|

### 7.6.2 P1 机械打字机的特殊 spec

> 打字机不是 typing tool，是 **textual authentication device**（D28）。

视觉 spec：
- 老式 1940-50s 风格（DPCA 文牍科旧气美学）
- 色带窗外露（color 暗淡——打字越多色带越浓）
- 击键有物理 click 反馈（声音 + 微小机械动画）
- **不可逆物理压痕**——玩家打过的字在某些视觉显化中可见（如 cycle 末"今日总结"屏幕显示打字机色带）
- Ch.5 endless：打字机色带变成**字符级缓变**——玩家 type 的字符在色带上**自己改**

### 7.6.3 P2 灵长接口 (PI) 屏幕 spec

视觉 spec：
- 极简等宽字体
- 屏幕略微 CRT 弯曲（90s 体制内办公室美学 + 文牍科旧气）
- 中心区有"蓝印章" UI element（V1 公司 boilerplate 的 typography 锚点）
- Ch.4+ 屏幕中心**极慢** pulse（M2）
- Ch.5 屏幕**与主菜单 boundary 含混**——玩家 typing rhythm leak 出去

**关键**：PI 名字**永不**在 UI 显化（与 §5.4.4 一致）——玩家只看到普通 typing 游戏 HUD。

### 7.6.4 Prop 的反身闭合应用

| Prop | Ch | 反身闭合显化 |
|---|---|---|
| P1 打字机色带 | Ch.5 | 色带显示玩家自己以前 endless 打过的字符 |
| P5 工号牌 | Ch.4-5 | 工号牌偶尔显示 Subject XX-#### attribution，玩家会 cross-ref 到自己以前的 endless 工号 |
| P7 工位抽屉 | Ch.4 | 抽屉里"前任作者 ghost"痕迹的字迹与玩家自己的 typing pattern 一致——但不显化为"那是你"|
| P9 计时钟 | Ch.4-5 | 计时钟显示的时间偶尔停在 17:06——D27 + Nim 死亡时刻 hidden lore（PD-3）|

---

## 7.7 美学（D13）物理化 systematize 🔒 LOCKED

### 7.7.1 双层美学共存

> **D13 美学锚定**：文牍科旧气（民国/1940-50s 官署）+ 90s 体制内办公室——两层共存；**时间错乱本身是 horror 元素**。

| 层 | 风格 | 物理 element |
|---|---|---|
| **文牍科旧气** | 民国 / 1940-50s 官署 | 老式打字机 / 钢笔 / 红章 / 厚纸张 / 老式机械钟 |
| **90s 体制内办公室** | 1990s American gov agency | 荧光灯 / 灰绿色调 / 工位 cubicle / CRT 屏幕 / 冷色调 |

**两层不该共存的 era 同时存在**——这本身就是时间错乱 horror 的物理化（D13）。

### 7.7.2 美学色调

| 元素 | 色调 | 出处 |
|---|---|---|
| 旧灯光 | 暖黄 | §2.12 Tone & Atmosphere |
| 90s 办公 | 灰绿 | 同上 |
| 红章 | 鲜红（签字暴击）| 同上 |
| 暗角 | 深褐黑 | M1 暗角吸光 |
| 字符级缓变 | 白底浅灰渐变 | Cycle 6+ 污染症候 |

### 7.7.3 美学**不该**做的

- ❌ 任何 east Asian gov 公章风格（v3.1 已明确否定）
- ❌ 现代 modern UI（玻璃质感 / flat design）
- ❌ Cyberpunk / hacker 风格
- ❌ 显眼的 horror 视觉（血迹 / 骷髅 / 哥特字体）——v4.1 horror 是 banal，不是恐怖片

---

## 7.8 Sound Design · Ambient 🔒 LOCKED

### 7.8.1 音乐基调（与 §2.12 Tone 一致）

| 维度 | 决定 |
|---|---|
| 主基调 | 极简 / 静电噪音 / 偶发钢琴 / 远处广播 |
| ❌ 不要 | horror score / orchestral string / jump scare sting |
| ✅ 要 | typewriter clack + 荧光灯嗡鸣 + 极远处的 muffled PA |

### 7.8.2 5 类 ambient sound

| # | Sound | 描述 | 何时启用 |
|---|---|---|---|
| **S1** | 打字机击键 click | P1 机械打字机的物理反馈 | 全程；玩家自己 typing 时主声 |
| **S2** | 荧光灯嗡鸣 | 极弱低频 hum | 全程 ambient |
| **S3** | 静电噪音 | 极偶尔 burst（如收音机微弱杂讯）| Ch.3+ 渐起 |
| **S4** | 远处 PA 广播 | 极弱、内容不可辨 | Ch.2+ 偶尔触发；Ch.4 频次微升 |
| **S5** | 偶发钢琴 | 极少；高音 single note；不成 melody | Ch.4+ 极偶尔 |

### 7.8.3 环境 sound 退场曲线

| Ch | sound 主调 |
|---|---|
| Ch.1 | S1 + S2（standard 工位 ambient）|
| Ch.2 | + S4 远处 PA 偶尔 |
| Ch.3 | + S3 静电噪音渐起 |
| Ch.4 | + S5 偶发钢琴；S2 荧光灯**间歇消失**（Ch.4 独立工位的 silence）|
| Ch.5 | 几乎所有 sound **退场**——只剩玩家自己 typing click（S1）+ 极远的 ambient muffled——**寂静化的 sound 层兑现**（与 §3.5 Phase B + §6.7 voice 退场曲线 同步）|

### 7.8.4 玩家自己 typing rhythm 作为 sound character

- 玩家击键节奏被 system 后台采集（与 §3.3 行为 trigger 一致）
- Ch.5 endless：玩家击键节奏**leak 到主菜单**——主菜单 hover 时听见**玩家自己以前的 typing rhythm**（无声音 byte 加载，是从玩家本次 session 的真实 typing 时间戳重放）
- 这是**反身闭合**在 sound 层的兑现——你的 typing 节奏成为下次玩家进主菜单时听见的 ambient

### 7.8.5 Sound 设计纪律

- ❌ 任何 jump scare（D13 + 整套美学共同禁止）
- ❌ 任何"玩家受伤" 音效（typing 失败应是 boilerplate prompt 而非 sting）
- ❌ Boss 战起独立 BGM——v4.1 中 boss 不该有"决战感"（§3.5 反高潮）
- ✅ 所有 sound 极简 / ambient / 不抢戏
- ✅ Ch.5 silence 是 design——不要 fill silence

---

## 7.9 Environmental × Chapter 显化频次 🔒 LOCKED

| Ch | E1 空间 | E2 时间 | E3 动效 | E4 Prop | Sound | 主旋律 |
|---|---|---|---|---|---|---|
| **Ch.1 录入员** | 标准工位 + 多同事 | 计时钟 routine | 极少 motion | P1-P6 standard | S1 + S2 | 90s 办公 standard |
| **Ch.2 校对者** | 标注 channel + 偶有空工位 | 计时钟偶尔异常 | M4 文档边缘弱 | + P3 红章 + P8 红笔 | + S4 远处 PA 偶尔 | 文牍科旧气加深 |
| **Ch.3 修改者** | 工位渐次孤立 | + 17:06 受理窗口绰号 | + M1 暗角吸光 | + P7 工位抽屉 hover | + S3 静电 | 时间错乱开始 |
| **Ch.4 作者** | 独立工位 | + 时间戳错位 (B7) | + M1 + M2 + M3 + M4 全启 | + 极简（实质 isolation）| + S5 钢琴；S2 间歇消失 | 寂静化开始 |
| **Ch.5 文本一部分** | "自由打字区"含混 | + 字符级缓变 leak 到 UI 外 | motion 进入主菜单层 | + 反身闭合 prop（色带 / 工号牌 / 抽屉）| **几乎全 sound 退场** | 寂静化完成 |

---

## 7.10 反身闭合 in Environment 🔒 LOCKED

### 7.10.1 环境层的反身闭合载体

| 反身闭合点 | 环境载体 |
|---|---|
| 玩家以前自己工号（C6）| P5 工号牌 hover 时 / P9 计时钟显示 17:06 / Boss tooltip（V6）|
| 玩家以前 typing 节奏 | Ch.5 主菜单 hover 时听见的 ambient typing rhythm |
| 玩家以前 endless 写的 modifier | P1 打字机色带显示 / Boss tooltip 文字 |
| 下周目玩家 footprint | Ch.5 玩家**自己**留下的"致后来者"便签——下周目其他玩家 Ch.1-2 工作台便签 |

### 7.10.2 设计纪律

- ❌ 任何反身闭合 popup（"这是你以前的 X"）
- ✅ 必须**plausible 像普通游戏数据**
- ✅ 玩家 cross-reference 才发现是关键——**永不替玩家发现**
- ✅ 反身闭合在 environment 层的兑现要 **emergent**（玩家自己累积感知）

---

## 7.11 设计纪律 🔒 LOCKED

### 7.11.1 绝对禁止

- ❌ Lore 标牌 / "interact 阅读" prompt
- ❌ 环境 "X" 标记可 interact 的 prop（只有玩家 typing 工位是 interactive）
- ❌ Cutscene 全景俯视场景
- ❌ 玩家可以走出工位探索其他空间
- ❌ 现代 horror 美学（血 / 骷髅 / jump scare）
- ❌ "进度显化"环境（"已发现 X% lore"）

### 7.11.2 必须做到

- ✅ 所有环境通过 documentary trace 显化
- ✅ 双层美学（文牍科旧气 + 90s 办公）共存——D13 时间错乱是 horror
- ✅ 向心矢量动效（M1-M3）——anomaly contamination 在 motion 层 visual
- ✅ Cycle 6+ 字符级缓变 leak 至 UI 外（memory 锚定 + Ch.5 反身闭合）
- ✅ 寂静化环境曲线（与 §3.5 Phase B + §6.7 voice 退场曲线 同步）
- ✅ Ch.5 自由打字区物理空间含混——不再有 stable cubicle 边界
- ✅ Prop 反身闭合（色带 / 工号牌 / 抽屉 / 计时钟）emergent 而非 explicit

---

## 7.12 Step 7 完成度自检

| 维度 | 状态 |
|---|---|
| Environment-as-V7 第七 voice 哲学 | ✅ §7.1 LOCKED |
| 4 大 channel (E1-E4) | ✅ §7.2 LOCKED |
| E1 空间 / 工位 5 章 progression | ✅ §7.3 LOCKED |
| E2 时间 / 字符级缓变 systematize | ✅ §7.4 LOCKED |
| E3 动效 / 向心矢量 4 类 motion | ✅ §7.5 LOCKED |
| E4 Prop spec (P1-P10) | ✅ §7.6 LOCKED |
| 美学 D13 物理化 | ✅ §7.7 LOCKED |
| Sound design ambient (S1-S5 + 退场曲线)| ✅ §7.8 LOCKED |
| Environmental × Chapter mapping | ✅ §7.9 LOCKED |
| 反身闭合 in environment | ✅ §7.10 LOCKED |
| 设计纪律 | ✅ §7.11 LOCKED |
| Prop 视觉 spec finalize | ⏳ 待 production（与 PL-11 灵长接口 UI 文案 / theme 落地一起）|
| Sound asset library | ⏳ 待 production |

**Step 7 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 8** — Narrative Delivery（与 Step 6 + Step 7 紧密——voice / environment 在不同 channel 的投递时机；这是 v4.1 narrative 的 production-ready 缺口）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat + character + lore + voice + environment 全 LOCK，机制层可接住）
3. **Step 9** — Integration with Gameplay（行为 trigger 实现 / 反身闭合 implementation / 字符级缓变 visual implementation）

---

_(rolling — Step 8 在下方继续)_

---

# Step 8（2026-05-04）— Narrative Delivery

**进度更新**：✅ Delivery framework 哲学 / ✅ 11 类 delivery channel inventory / ✅ 6 类 delivery mode / ✅ 三层 delivery schedule (macro/mid/micro) / ✅ Delivery × Voice × Environment 矩阵 / ✅ Production-ready pipeline / ✅ 跨 run / 跨玩家 反身闭合 delivery / ✅ 设计纪律

**Step 8 范畴**：v4.1 narrative 中 **delivery ≠ content**。Step 2-7 已锁定 narrative **是什么**；本节 systematize narrative **如何 / 何时 / 通过哪个 channel** 投递给玩家。这是 v4.1 production-ready 缺口的补足——尤其是与 `scripts/narrative-writer/` pipeline 的 sync。

---

## 8.1 Delivery Framework 哲学 🔒 LOCKED

### 8.1.1 Delivery 不是 narrative content

| 内容层 | 已 LOCK 在 |
|---|---|
| 是什么（content）| Steps 2-7 |
| 何时（timing）| Step 3 行为驱动 trigger map |
| 谁说（voice）| Step 6 V1-V6 |
| 在哪（environment）| Step 7 V7 + E1-E4 |
| **如何投递（delivery）** | **Step 8 本节** |

### 8.1.2 v4.1 delivery 三大铁律

> 1. **零 popup** — 没有"narrative 已发现"提示
> 2. **全 indirect / ambient** — narrative 通过 documentary trace + environment 显化
> 3. **玩家事后才意识到** — delivery success metric 不是玩家**当下**理解，是玩家**事后**回想时寒

### 8.1.3 Delivery 与 anti-paradigm 四件套关系

Step 7 已建立的 **anti-paradigm 四件套**：anti-character / anti-pacing / anti-dialogue / anti-environment-as-decoration。**Delivery 是这四件套的 implementation 接口**——每条 delivery 必须同时满足四件套约束。

---

## 8.2 Delivery Channel Inventory · 11 类 🔒 LOCKED

| # | Channel | 主要 voice / environment | 形态 |
|---|---|---|---|
| **DC1** | 工作台 boilerplate notifications | V1 公司 voice | 屏幕 banner / 文档窗口 / 工号通知 |
| **DC2** | 工作台便条 | V2 同事 voice | 物理桌面纸条 / hover 可见 |
| **DC3** | Typing buffer 内 dictation | V3 anomaly voice | typing buffer pre-populate / 字符 drift |
| **DC4** | D29 状态确认 prompt | V4 检测员 voice | 屏幕中央命令 prompt（cycle 末尾）|
| **DC5** | 规则手册 / 守则文档 | V5 守则 voice | 工作台 hover 文档 / layered footnote |
| **DC6** | Boss tooltip | V6 反身闭合 | 战斗前 boss UI tooltip |
| **DC7** | 遗物 hover footnote | V5 layered + Step 4 character lore | 遗物界面 hover detail |
| **DC8** | 工位 environment ambient | V7 + E1-E4 | 工位视觉 / 动效 / sound |
| **DC9** | 主菜单 / settings | V7 字符级缓变 leak（Ch.5）| 主菜单 hover 时变化 |
| **DC10** | Cycle 末尾"今日总结"屏幕 | V3 字符级缓变 + B1 媒介 | run 结束后的 summary screen |
| **DC11** | 升职通知 / 章节过渡仪式 | V1 + D32 双 voice (Ch.5) | 章节边界的 boilerplate 通知 |

---

## 8.3 Delivery Modes · 6 类 🔒 LOCKED

Mode = content 如何 surface 给玩家：

| # | Mode | 形式 | 主要 channel |
|---|---|---|---|
| **DM1** | Static text | 预定义 boilerplate / 守则 / 便条 | DC1 / DC2 / DC4 / DC5 |
| **DM2** | Dynamic generated | 基于玩家 typing history 生成 | DC6（boss tooltip）/ DC11（Ch.5 入口）|
| **DM3** | Procedural fragment | anomaly dictation 的 typing buffer 内容 | DC3 / DC10 |
| **DM4** | Layered footnote | 同一份遗物 L1-L4 不同 reading | DC5 / DC7 |
| **DM5** | Ambient sound / visual | 不显化为 text 的 cue（向心矢量 / 字符级缓变 / 计时钟异常）| DC8 / DC9 |
| **DM6** | Cross-reference emergent | 玩家手动 cross-ref 触发的 reveal | DC7 + DC6 + DC1 综合 |

### 8.3.1 Mode × Voice 兼容性

| Voice | 兼容 Mode |
|---|---|
| V1 公司 | DM1（标准 boilerplate）/ DM2（Ch.5 入口动态）|
| V2 同事 | DM1（预定义便条池） |
| V3 anomaly | DM3（procedural）/ DM5（ambient visual）|
| V4 D29 | DM1（预定义 5 项 prompt 池）|
| V5 守则 | DM1（守则池）/ DM4（layered footnote）|
| V6 boss tooltip | DM2（dynamic 生成）|
| V7 environment | DM5（ambient）|

---

## 8.4 Delivery Schedule · Macro 🔒 LOCKED

### 8.4.1 Channel × Chapter 显化

| DC | Ch.1 | Ch.2 | Ch.3 | Ch.4 | Ch.5 |
|---|---|---|---|---|---|
| DC1 工作台 V1 | 主 | 主 | 中 | 极简 | 仅 boilerplate（处置）|
| DC2 工作台便条 V2 | 远（陌生工号）| 主（针对你工号）| 中（消失中）| ❌ 退场 | ❌ 退场（除"致后来者"自留）|
| DC3 typing buffer V3 | 极弱 | 弱（词包异常词模式化）| 中 | 强（pre-populate）| 玩家自己 = anomaly |
| DC4 D29 prompt | 见证版 | routine 全 5 项 | 偶尔 partial | 频繁 partial fail | 自动 fail |
| DC5 守则 layered | L1 主 | + L2 显 | + L3 显 | + L4 显（Project Nim B8 reveal）| 守则 ❌ 退场 |
| DC6 boss tooltip V6 | 弱（反身闭合零）| 中（无玩家 attribution）| 出现（近似工号）| 显化（自己工号）| 主（自己 endless 工号）|
| DC7 遗物 hover | L1 only | + L2 hover | + L3 hover + B3 cross-ref | + L4 hover + B8 reveal | + L5（玩家自己 footprint）|
| DC8 工位 ambient | 标准 | 多了红章/红笔 | 渐次孤立 + M1 暗角 | 独立工位 + M1-M4 全启 | 物理含混 + UI leak |
| DC9 主菜单 | 标准 | 标准 | 标准 | 标准 | 字符级缓变 leak |
| DC10 cycle 末尾 | 极弱 B1 hook | 弱 | 中 | 强 | 玩家 typing rhythm 显化 |
| DC11 升职通知 | n/a（玩家入职）| 第一次（Ch.1→Ch.2）| 第二次 | 第三次 | 第四次（D32 双 voice）|

### 8.4.2 Macro 节奏观察

| 节奏 | 描述 |
|---|---|
| **DC2 同事便条退场** | Ch.4 完全退场——独立工位无收件人 |
| **DC5 守则退场** | Ch.5 完全退场——玩家不再被推送守则 |
| **DC1 公司 voice 极简化** | Ch.4 极简、Ch.5 仅处置——公司从"主导"退到"仅记账" |
| **DC3 + DC6 反向上升** | Ch.4-5 anomaly + 反身闭合主导——玩家被 voice 包围但**包围他的是他自己** |
| **DC9 主菜单 leak** | Ch.5 唯一渐入——破除游戏 UI 边界，是反身闭合最暴力显化 |

→ **Delivery 的退场 / 升起曲线与 voice 退场曲线（§6.7）+ environment 寂静化（§7.8.3）三轨同步**——这是 v4.1 narrative 的**寂静化总曲线**。

---

## 8.5 Delivery Schedule · Mid (Cycle Level) 🔒 LOCKED

### 8.5.1 Cycle 内 channel 投递时机

每 cycle 内 stage 1-12 + ritual + boss + post-run D29 的 delivery 节奏（与 §3.4 MICRO Beats 对齐）：

| Stage | 班次段 | 主要 active channel | Delivery 内容 |
|---|---|---|---|
| pre-1 | 开班 | DC1（开班 boilerplate）+ DC8（工位 ambient set up）| "本日勤务: ..." 通知 |
| 1-2 | 任务推进 | DC3（弱）+ DC8（ambient）| typing 任务；anomaly 极弱 |
| 3-4 | 任务推进 | DC3（中）+ DC8 | 词包异常词频次 |
| 5 | elite | DC6（boss tooltip）+ DC3（强）| 反身闭合 boss attribution |
| 6 | ritual | DC7（遗物 hover）+ DC5（守则 cross-ref）| **B1 / B3 主触发点**——hover 文档反复 → multi-layer reveal |
| 7-9 | 加班 | DC2（同事便条更新）+ DC1（boilerplate）| B2 / B6 媒介 |
| 10-11 | 加班 | DC5（守则被静默修订）+ DC2 | B3 强 hook（手法 6 静默修订）|
| 12 | 下班 boss | DC6（最终 boss tooltip）+ DC3 | 反身闭合 high spike |
| post | 下班 D29 | DC4（状态确认）+ DC10（今日总结）| D29 + B1 字符级缓变 |
| post-post | unlock 通知 | DC11（升职通知）| 仅 cycle 末尾 + chapter unlock 时 |

### 8.5.2 ritual stage（stage 6）特别强调

stage 6 是 **B1 + B3 的核心触发点**：
- 玩家在 ritual 节点会主动 hover 文档
- 反复 hover 同一份遗物 ≥ 3 次 → **B1 trigger**
- cross-reference 工作台规则 vs 遗物 footnote → **B3 trigger**

**这是 v4.1 narrative 把 reveal trigger 嵌入 gameplay 节奏的关键设计**——ritual stage 不只是机制 ritual，是 narrative reveal 的窗口。

---

## 8.6 Delivery Schedule · Micro (Run / Frame Level) 🔒 LOCKED

### 8.6.1 单次 typing event 的 delivery

玩家在 stage 内**每次 typing key**：

| 玩家行为 | 后台 trigger 累积 | delivery 立即可显化 |
|---|---|---|
| typing 击键 | 节奏特征记录（B5 行为 trigger）| ❌ 不立即显化 |
| 完成一个 word | 词包 / dictation pre-populate 检查 | DC3 typing buffer 状态更新 |
| hover 文档 | hover 累积计数（B1 trigger）| DC7 多 hover 后显化 layered |
| 标注 / 修改 | B2 / B5 trigger 累积 | ❌ 不立即显化 |
| 卡顿 / 超过 0.5 秒 | 同事便条建议触发 evaluation | DC2 后台便条 schedule 更新 |

### 8.6.2 Micro 时间感（受理窗口 D27）

| 受理窗口 | 玩家可见 | 后台行为 |
|---|---|---|
| **17:06-17:13** | typing 节奏 / dictation 显化频次显著高 | 后台 reveal trigger 概率 ×1.5 |
| **午休结束前 30 秒** | 同上 | 后台 reveal trigger 概率 ×1.3 |
| **计时钟无秒针时** | E2 时间 cue | 后台 reveal trigger 概率 ×1.5 |

> **关键**：受理窗口 boost 的是**触发概率**，不是触发**强度**。玩家无法通过卡时间"刷"reveal——窗口只是提高 chance。

---

## 8.7 Delivery × Voice × Environment 整合矩阵 🔒 LOCKED

跨 dimension 的 v4.1 narrative delivery 全景图：

| Dimension | content | voice | env | delivery channel |
|---|---|---|---|---|
| **B1 文本不 inert** | §2.17 | V1 + V3 | E2 + E3 | DC1 + DC7 + DC10 |
| **B2 layer 取决于 reader** | §2.17 | V2 | E1 | DC2 + DC5 |
| **B3 规则是事故化石** | §2.17 | V5 | (none) | DC5 + DC7 |
| **B4 异常已在野外** | §2.17 | V1 | (none) | DC1（"外部文本回收科" notification）|
| **B5 理解=推向作者位** | §2.17 | V2 + V3 | E2 | DC2 + DC3 |
| **B6 公司只记账** | §2.17 | V1 | (none) | DC1 反复 + DC2 挽救 0 反馈 |
| **B7 现实自洽** | §2.17 | V1 | E2 | DC1（时间戳错位）+ DC7（L3-L4 回头改写）|
| **B8 DPCA 被历史 dictate** | §2.17 | V5 | (none) | DC7（Project Nim L4 cross-ref）|
| **B9 猴子规则是处置** | §2.17 | V1 + V4 | E1 | DC1 + DC4 + DC11 |
| **第 10 条 emergent** | §2.17 | V6 + V3 | E2 + E3 + E4 | DC6 + DC9 + DC10（+ 跨 run）|

### 8.7.1 矩阵观察

- **B6 / B8 reveal 完全无 environment 触发** —— 纯 textual reveal
- **第 10 条 emergent** 跨**所有** dimension —— 这正是它"玩家自己 derive" 的特征
- **B1 / B7 同时占 DC1 / DC7 / DC10** —— 多 channel 共显化才能 reveal
- **每条 B 真理至少有 2 个 channel** —— 单 channel 触发不可靠（玩家可能错过）

---

## 8.8 Production Pipeline · narrative-writer Sync 🔒 LOCKED

### 8.8.1 现状

`scripts/narrative-writer/` pipeline 已 v3.1 sync，**需重新 sync v4.1**。

### 8.8.2 v4.1 pipeline scope

需 generate 的 content type：

| Type | 数量 | 主要 voice | DC |
|---|---|---|---|
| V1 boilerplate templates | ~100 | V1 | DC1 / DC11 |
| V2 同事便条池 | ~150 | V2 | DC2 |
| V3 typing buffer fragments | ~100 | V3 | DC3 |
| V4 D29 prompts | ~25（5 项 × 5 退化阶段）| V4 | DC4 |
| V5 守则 layered library | ~150 守则 × 6 layers ≈ 900 entries | V5 | DC5 |
| V6 boss tooltip 动态生成器 | runtime (基于玩家 history) | V6 | DC6 |
| 遗物 layered footnote | ~94 遗物 × 4 layer ≈ 376 entries | V5 | DC7 |
| 字符级缓变 patterns | ~50 patterns | V3 / V7 | DC9 / DC10 |

### 8.8.3 Pipeline 改造方向

- 从 v3.1 单 voice 模式 → v4.1 6 voice 模式
- 增加 layered footnote generation（L1-L4 同一份文档不同 reading）
- 增加反身闭合 placeholder（attribution 占位 → runtime 替换）
- 增加静默修订 generator（同一守则的多个版本）
- v4.1 词典（DAY/BATCH/CYCLE/A 等 cycle 演进）严格遵循

### 8.8.4 替换 v3.1 残留

`src/data/narrative/` 中：
- 58/95 relic flavor = v2.3 残留 → 通过 v4.1 pipeline 整体覆盖
- ~85% skills flavor = v2.3 残留 → 同上
- 词包 narrative entries → 重新生成（D1 anomaly voice 载体）

---

## 8.9 反身闭合 Delivery 🔒 LOCKED

### 8.9.1 跨 run 反身闭合

| 触发 | delivery channel | 形态 |
|---|---|---|
| 玩家以前 run 写的 modifier | DC6 boss tooltip | "上一任作者: Subject [玩家以前 endless 工号]" |
| 玩家以前 hover 过的措辞 | DC7 遗物 footnote | L4 中出现玩家以前 type 过的 fragment |
| 玩家以前 typing rhythm | DC9 主菜单 ambient sound | session 真实时间戳重放 |
| 玩家以前 endless cycle 末尾的 D29 fail | DC4（下次 endless 入口）| 直接 fail，不再 prompt |

### 8.9.2 跨玩家反身闭合（**仅本地存档**）

> **注意**：v4.1 反身闭合**默认仅本地存档**，不依赖 server / 玩家间网络通信。"下周目其他职业 run" = **同一玩家**的下一次进入新职业 run；不是其他玩家的 session。

| 触发 | delivery channel | 形态 |
|---|---|---|
| 玩家 endless 写的 modifier | 下周目同玩家 run 的 DC6 | boss tooltip 含"上一任作者: 玩家以前的 endless 工号" |
| 玩家在自由打字区写的"致后来者" | 下周目同玩家 Ch.1-2 DC2 | 工作台便条出现自己以前的字迹 |

### 8.9.3 设计纪律

- ❌ 任何"你以前的 run 影响了这次"提示
- ❌ 任何"反身闭合已激活"UI
- ❌ 任何明确的 cross-run mention
- ✅ 玩家 cross-ref 才发现是核心
- ✅ 反身闭合 delivery 必须 plausible 像普通游戏数据

---

## 8.10 设计纪律 🔒 LOCKED

### 8.10.1 绝对禁止

- ❌ 0 个 narrative popup
- ❌ 0 个"你已发现 X"提示
- ❌ 0 个"narrative codex" / "lore unlock"UI
- ❌ 0 个 cutscene reveal
- ❌ 0 个 quest log / objective tracker for narrative
- ❌ 0 个"故事进度" indicator
- ❌ 任何 channel 显化时**不允许**伴随 fanfare（音效 / 闪光 / popup）

### 8.10.2 必须做到

- ✅ 所有 delivery 通过 documentary trace / ambient cue 显化
- ✅ delivery success metric = 玩家**事后**回想时寒
- ✅ 每条 B 真理至少 2 个 channel 共显化（避免单点错过）
- ✅ 受理窗口 boost reveal 概率而非强度
- ✅ 反身闭合 delivery 必须 plausible 像普通游戏数据
- ✅ pipeline v4.1 重新 sync 是 production blocker

### 8.10.3 Delivery 与玩家**错过**

> v4.1 设计接受玩家**错过 reveal**——这是 D5 + D7 的兑现。
>
> 但**多 channel 共显化**确保**关键 reveal**（B1-B9）的**累积概率**足够高，让大多数玩家**最终**会触发；同时**第 10 条 emergent reveal** 设计为玩家**可能永远错过**——这是 horror 的最高形态。

---

## 8.11 Step 8 完成度自检

| 维度 | 状态 |
|---|---|
| Delivery framework 哲学 | ✅ §8.1 LOCKED |
| 11 类 delivery channel | ✅ §8.2 LOCKED |
| 6 类 delivery mode | ✅ §8.3 LOCKED |
| Macro schedule (channel × chapter)| ✅ §8.4 LOCKED |
| Mid schedule (cycle level)| ✅ §8.5 LOCKED |
| Micro schedule (run / frame)| ✅ §8.6 LOCKED |
| Delivery × Voice × Environment 矩阵 | ✅ §8.7 LOCKED |
| Production pipeline v4.1 sync | ✅ §8.8 LOCKED-flagged（待 production execute）|
| 跨 run / 跨玩家 反身闭合 delivery | ✅ §8.9 LOCKED |
| 设计纪律 | ✅ §8.10 LOCKED |
| narrative-writer pipeline v4.1 sync execution | ⏳ 待 production |
| 词包 / 守则 / 遗物 v4.1 重新生成 | ⏳ 待 production |

**Step 8 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 9** — Integration with Gameplay（行为 trigger 实现 / 反身闭合 implementation / 字符级缓变 visual implementation / 受理窗口 mechanic 接入）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（叙事 + beat + character + lore + voice + environment + delivery 全 LOCK，机制层可接住）
3. **narrative-writer pipeline v4.1 sync** — production execution（跨叙事 / 工程边界）

---

_(rolling — Step 9 在下方继续)_

---

# Step 9（2026-05-04）— Integration with Gameplay

**进度更新**：✅ Integration philosophy / ✅ 行为 trigger implementation 蓝图 / ✅ 字符级缓变 implementation / ✅ 受理窗口 mechanic 接入 / ✅ D29 implementation / ✅ 反身闭合 in save system / ✅ 现有 systems × v4.1 接入点 / ✅ PL-2/3 机制重做约束 / ✅ 词包系统 v4.1 校准 / ✅ Implementation priority P0-P3

**Step 9 范畴**：本节跨 narrative → engineering 边界。Steps 2-8 已锁定 narrative 蓝图；Step 9 derive 这套蓝图**如何接入** game systems（battle / shop / skills / relics / boss modifier / save）的 implementation 路径。

> **重要 disclaimer**：本节 implementation 建议针对 `src/` 当前 architecture 提供方向；具体 code-level 实现待 engineering 阶段 verify + iterate。本节是 **integration spec**，不是 final implementation。

---

## 9.1 Integration Philosophy 🔒 LOCKED

### 9.1.1 Narrative ≠ Decoration

> v4.1 narrative 不是 flavor layer——是 **gameplay system 的 narrative-aware behavior**。每个机制都需要 narrative-aware hook：boss modifier UI 是"撰写异常报告" framing；relic flavor 是 layered footnote；技能 = anomaly expression channel；字符级缓变是 cycle 6+ 系统行为。

### 9.1.2 Integration 三原则

1. **零 narrative-only system**——所有 narrative element 走现有 system pipeline（battle / shop / skill / relic / save），不开 separate "narrative engine"
2. **Narrative-aware refactor 是 production blocker**——不是 cosmetic，是 design contract（D25 v2、D32、B1-B9）的硬兑现
3. **Implementation 必须 plausible-as-game-data**——反身闭合 / 字符级缓变 / D29 partial fail / boss tooltip dynamic generation 都要看起来像普通游戏行为，玩家事后才反思

---

## 9.2 Behavior Trigger Implementation Blueprint 🔒 LOCKED

### 9.2.1 后台行为指标采集

Step 3 § 行为驱动 trigger map 锁定的 9 条 B 真理 trigger 都需要后台行为指标。建议在 `src/src/core/state/` 新增 **NarrativeTrackingState**（与 BattleState / RunState / MetaState 平级）：

| 指标 | 数据形态 | 用途 (B 真理) |
|---|---|---|
| `relicHoverCounts` | `Map<relicId, number>` | B1（反复 hover ≥ 3 次）|
| `peerNoteContradictionsRead` | `number`（累积阅读相互矛盾便条数）| B2 |
| `ruleVsRelicCrossRefs` | `Set<{ruleId, relicId}>` 字面相同对 | B3 |
| `externalCandidateBoilerplateCount` | `number` | B4 |
| `typingRhythmFingerprint` | runtime 节奏特征向量 | B5 + 反身闭合 sound replay |
| `rescueAttemptZeroFeedback` | `number`（执行老员工挽救方法 + 0 反馈次数）| B6 |
| `documentModifyTimestampMismatches` | `number` | B7 |
| `projectNimRelicCrossRefs` | `Set<relicId>` (Project Nim 系列) | B8（≥ 3 触发 L4 reveal）|
| `d29PartialFails` | `number` (Ch.4 累积) | B9 |

**实现 location 建议**：`src/src/core/state/NarrativeTrackingState.ts`（新增）；通过 `eventBus` 监听已有事件（`word:complete` / `skill:triggered` / `relic:hover` 等）累积。

### 9.2.2 Trigger Evaluation Engine

建议在 `src/src/systems/narrative/` 下新增 **NarrativeTriggerEngine**（新目录）：

```
NarrativeTriggerEngine
├── trigger evaluation (per cycle / per stage / per typing event)
├── reveal scheduling (考虑 multi-channel routing)
├── 受理窗口 boost evaluator (real-time check)
└── 反身闭合 cross-run query
```

### 9.2.3 Reveal Channel Routing

每条 reveal trigger 满足后，路由到 § 8.7 矩阵中**至少 2 个** delivery channel：
- B1 → DC1 + DC7 + DC10
- B2 → DC2 + DC5
- B3 → DC5 + DC7
- B4 → DC1
- B5 → DC2 + DC3
- B6 → DC1 + DC2
- B7 → DC1 + DC7
- B8 → DC7
- B9 → DC1 + DC4 + DC11

**注意**：trigger 满足 ≠ 立即 reveal——reveal 在**下一次 channel 显化窗口**触发（如 stage 6 ritual / cycle 末尾 / boss 战前），保持 ambient 性质。

---

## 9.3 字符级缓变 Implementation 🔒 LOCKED

### 9.3.1 系统 hook 点

| Hook 点 | 触发条件 | 影响 channel |
|---|---|---|
| Cycle 6+ Endless 全程 | run cycle ≥ 6 | DC3 typing buffer / DC10 cycle 末尾 / DC9 主菜单 |
| Hover 文档（任意章节）| hover duration > 1.5s | DC7 遗物 / DC5 守则 |
| Cycle 末尾"今日总结" | run end | DC10 |
| Ch.5 endless 全程 | endless mode active | DC9 主菜单 leak |

### 9.3.2 实现建议

建议在 `src/src/effects/` 下新增 **CharDriftEffect**：
- 接收任意 string + drift profile（intensity / 哪些 char 漂 / 漂多远）
- 渲染层使用 PixiJS Text 或 DOM span 替换
- Hover 触发 / 移开 settle 用 mouseenter/mouseleave 事件
- 漂的方向 / 字符**不应随机**——应 **dictation-meaningful**（词包池里的某些字符 / 玩家以前 type 过的 fragment）

### 9.3.3 性能与 anti-pattern

- ❌ 每帧重 render 所有文字——应只针对触发的 element
- ❌ 字符级缓变伴随声音（破坏 ambient）
- ❌ 太显眼——drift 量应**极微**，玩家可能怀疑自己看错了
- ✅ Drift 与 V3 dictation 内容池对齐（不能 random 字符）

---

## 9.4 受理窗口 Mechanic 接入 🔒 LOCKED

### 9.4.1 D27 受理窗口的 implementation

**关键问题**：受理窗口 = real-world time（17:06-17:13）还是 game-internal time？

| 方案 | 优 | 劣 |
|---|---|---|
| **A · 真实时钟时间**（用 system clock 取小时分钟）| 增加沉浸（玩家会发现真的某些时间游戏不一样）| 玩家可能 game / 永远玩不到那时段 |
| **B · 游戏内 cycle 时间**（每 run 内的累积时间）| 可控，玩家不会错过 | 失去"时间错乱即 horror" 的真实感（D13）|
| **C · 混合**——某些 trigger 用真实时钟，某些用游戏内 | 兼顾 | 实现复杂 |

**v4.1 推荐 · 方案 C**：
- "17:06-17:13" → 真实时钟时间（按 system local time 取小时分）
- "午休结束前 30 秒" → 游戏内 cycle 时间（每 cycle 启动后算）
- "计时钟无秒针时" → 概率事件（每 cycle 概率触发，与真实时间无关）

### 9.4.2 Boost 实现

```
受理窗口 active 时：
- B1-B9 trigger 概率 ×1.3 to ×1.5
- 字符级缓变 频次 ×1.5
- 词包异常词出现频次 ×1.3
- DC10 cycle 末尾"今日总结"字符级缓变出现概率 ×2
```

实现 location：`NarrativeTriggerEngine` 内置 `getActiveAcceptanceWindowBoost()` 方法；在 trigger evaluation 时乘入。

### 9.4.3 反向纪律

- ❌ UI 显示 "受理窗口已激活" / "Buff 时段"
- ❌ 玩家可见的 timer / progress bar
- ✅ 玩家**自己**摸索绰号（"我的 X 在这时间段最稳"）—— Ch.4 揭示官话名

---

## 9.5 D29 状态确认 Implementation 🔒 LOCKED

### 9.5.1 Post-run 流程接入

D29 状态确认在每个 cycle 结束（即 boss 通关后）触发——建议在 `src/src/systems/stage/stageFlow.ts` 增加 post-cycle 阶段：

```
stage 12 boss 通关
    ↓
post-run summary (existing) / DC10
    ↓
[新增] D29 状态确认序列
    ↓
chapter unlock check (DC11)
```

### 9.5.2 5 项检测的退化曲线 implementation

5 项 prompt + 5 阶段退化已在 §6.3.4 + §2.16.4 状态确认临界态锁定。Implementation 建议：

```typescript
// 概念性，不是 final code
interface D29Prompt {
  itemId: 1-5;
  promptText: string;
  responseHandler: (chapter, ascensionLevel) => 'pass' | 'partialFail' | 'completeFail';
  partialFailMessage: string;
  completeFailMessage: string;
}
```

退化阶段查表：

| Chapter | 5 项 D29 状态 | 是否触发 endless 入口 |
|---|---|---|
| Ch.1 录入员 | 玩家见证（短）/ 自己仅工号确认 | n/a |
| Ch.2 校对者 | 全 5 项 routine pass | n/a |
| Ch.3 修改者 | 偶尔 partial fail（1-2 项）| n/a |
| Ch.4 作者 | 频繁 partial fail（2-4 项）+ 末段只剩工号 | trigger Ch.5 入口仪式 |
| Ch.5 endless | 自动 fail（所有项）| n/a |

### 9.5.3 设计纪律 implementation

- ❌ "状态确认 = 检测" 任何 UI hint
- ❌ Partial fail 显示"红色错误"——所有 fail 仍显示**绿色 routine 颜色**
- ❌ "完全 fail" 有任何 fanfare
- ✅ 玩家事后**自己**回想才意识到这是检测

---

## 9.6 反身闭合 Implementation in Save System 🔒 LOCKED

### 9.6.1 跨 run 数据持久化（仅本地）

建议在 `MetaSaveData`（`src/shared/types.ts`）新增 **NarrativeArchive** 字段：

| 字段 | 数据 | 用途 |
|---|---|---|
| `endlessModifierSignatures` | `Array<{playerWorkerId, modifier, cycle, timestamp}>` | DC6 boss tooltip 反身闭合 attribution |
| `typingRhythmFingerprints` | `Array<{sessionId, rhythmVector, timestamp}>` | DC9 主菜单 ambient sound replay |
| `endlessFreeTypeNotes` | `Array<{playerWorkerId, content, cycle}>` | "致后来者"便签——下周目其他职业 run DC2 |
| `playerWorkerIdHistory` | `Array<{workerId, chapterCleared, timestamp}>` | 反身闭合 cross-ref 锚点 |
| `nimL4Unlocked` | `boolean` | B8 reveal 标记（不显化为成就）|

### 9.6.2 跨 run 数据接入点

| Channel | 实现 |
|---|---|
| DC6 boss tooltip | `getBossModifierAttribution()` 查 `endlessModifierSignatures` 选最相关 |
| DC9 主菜单 ambient | 主菜单加载时 query `typingRhythmFingerprints` 取最近 N 个，按时间戳 rePlay 击键节奏 |
| DC2 工作台便条（下周目）| Ch.1-2 cycle 启动时，random sample `endlessFreeTypeNotes`，作为同事便条池的 augmentation |

### 9.6.3 Privacy / 数据纪律

- 仅本地 `MetaSaveData`——绝不上传 server / 不跨玩家
- typingRhythmFingerprints 不含 typed content，仅时间戳序列（防止误存敏感内容）
- 反身闭合数据**不**在 UI 暴露给玩家（无"我的反身闭合记录"页面）

---

## 9.7 现有 Systems × v4.1 接入点 🔒 LOCKED

### 9.7.1 Battle System (`src/src/systems/battle.ts`)

| 接入点 | v4.1 hook |
|---|---|
| `triggerSkill()` 调用前后 | 累积 typingRhythmFingerprint；触发 B5 trigger 评估 |
| Boss 战前 (`startBoss()`) | 查询反身闭合 attribution，注入 boss tooltip |
| Cycle 末尾 (`endCycle()`) | 触发 D29 状态确认序列；触发 DC10 字符级缓变 |
| Word complete (`completeWord()`) | 检查词包异常词出现 / V3 dictation 是否 active |

### 9.7.2 Shop System (`src/src/systems/shop.ts`)

| 接入点 | v4.1 hook |
|---|---|
| `generateShopItems()` | shop notification UI 用 V1 boilerplate template；V5 守则风 sticker |
| `buy()` / `sell()` | 触发 B5 trigger（active engage）累积 |
| `openRitualEnchantment()` | 仪式节点 stage 6 = B1/B3 reveal 主窗口（DC7 hover trigger）|

### 9.7.3 Skill System (`src/src/systems/skills.ts` / `src/src/data/skillGeneration.ts`)

| 接入点 | v4.1 hook |
|---|---|
| Skill flavor / display name | D25 v2 兑现：技能 = anomaly expression channel；flavor 走 v4.1 pipeline 重新生成 |
| 22 affix types tooltip | 用 V5 守则风 layered footnote；Ch.3 起显示 Project Nim 关联 |
| Skill trigger pipeline (affixTrigger.ts) | typing rhythm signal hook（B5）|

### 9.7.4 Relic System (`src/src/data/relics.ts` + `src/src/systems/relics/`)

| 接入点 | v4.1 hook |
|---|---|
| Relic flavor | layered footnote (L1-L4)：v4.1 pipeline 重新生成 376 entries |
| Relic hover detail | 累积 `relicHoverCounts`（B1 trigger）；Ch.3+ cross-ref check（B3 / B8）|
| Relic ID naming | 与 §4.5 Project Nim 系列相关的 relic IDs 标记（用于 B8 trigger）|

### 9.7.5 Boss Modifier System (`src/src/data/bossModifiers.ts` + `src/src/systems/bossModifierEngine.ts`)

| 接入点 | v4.1 hook |
|---|---|
| Modifier UI | reframe 为"撰写异常报告"（C2/C3）；标"上一任作者: Subject XX-####"（V6 + 反身闭合）|
| `bossModifierPicker.ts` | endless 模式下 reframe（C2 + C3 一致）|
| Modifier flavor | v4.1 pipeline 重新生成；走 V1 boilerplate 风 |

### 9.7.6 Cycle / Stage Flow (`src/src/systems/stage/stageFlow.ts`)

| 接入点 | v4.1 hook |
|---|---|
| `getStageType()` | stage 6 ritual = B1/B3 reveal 主窗口标记 |
| `isRitualNode()` | hover 行为采集启用（B1）|
| Cycle ≥ 6 检测 | 字符级缓变 enable flag（与 memory 锚定一致）|

### 9.7.7 Save System (`src/main/save.ts` + `src/src/core/save/SaveManager.ts`)

| 接入点 | v4.1 hook |
|---|---|
| `MetaSaveData` schema | 新增 NarrativeArchive 字段（§9.6.1）|
| `serialize()` / `deserialize()` | NarrativeArchive 进 / 出 |
| Migration | v3.x save → v4.1 NarrativeArchive 默认空（无反身闭合资料）|

### 9.7.8 Scene Management (`src/src/scenes/`)

| 接入点 | v4.1 hook |
|---|---|
| BattleScene | 工位 progression UI 切换（Ch.1-5）；E1 空间变化 |
| MainMenuScene | Ch.5+ 字符级缓变 leak；ambient sound rePlay |
| ShopScene | 仪式节点（stage 6）UI 增加 hover detail（DC7）|

---

## 9.8 PL-2 / PL-3 机制重做约束 🔒 LOCKED

### 9.8.1 PL-2 蜕变者（修改者 / Ch.3）机制约束

叙事约束已锁定（D26 v2 + D25 v2 + Step 4 + Step 6 + Step 7）：

| 约束 | 来源 |
|---|---|
| 玩家**自己学会**修改，不是公司分发 | D26 v2 + Ch.3 narrative task |
| 修改 = tamper anomaly's expression channel | D25 v2 |
| 修改后 typing 节奏改变（玩家说不清来源）| §3.3.2 B5 trigger |
| Boss tooltip 含玩家修改过的措辞（近似工号）| V6 + Ch.3 hooks |
| 公司 reclassify 但**不批准** | D26 v2 + §2.16.3 设计纪律 |
| 任何 system message 不出现"授权 / 许可 / 解锁 / 配发" | Ch.3 关键设计纪律 |

### 9.8.2 PL-3 造词师（作者 / Ch.4）机制约束

| 约束 | 来源 |
|---|---|
| Typing buffer pre-populate（候选词自动出现）| D25 v2 极致前形 + Ch.4 三轨 |
| 玩家选择 = illusion of choice（从 anomaly 选项里选）| §2.16.4 异常层 |
| "创意" = anomaly 的 dictation | Ch.4 核心 horror |
| 完全 isolation — 作者间无 communication | §2.16.4 员工层 |
| 工位**最简**——比 Ch.1 还少 prop | §7.3.1 |
| 受理窗口"高效区间"**官方文档**显化（Ch.4）| §2.16.4 异常层 + B5 |
| L4 Project Nim 反身镜像在 Ch.4 显化 | §4.5 + B8 |

### 9.8.3 共同约束

- ❌ 任何 mechanic tutorial 暗示其更深含义
- ❌ Power fantasy popup（"获得 X 能力!"）
- ❌ 解锁庆祝
- ✅ 像普通 roguelike 新职业一样登场
- ✅ 玩家事后才意识到 mechanic 的 horror

---

## 9.9 词包系统 v4.1 校准 🔒 LOCKED

### 9.9.1 词包是 anomaly voice 载体（D1 + §2.4 + memory）

> **关联 memory**："传说词包是词包系统，不是遗物" — 词包是 D1 anomaly 本体的天然兑现，**保留并强化，不重写**

### 9.9.2 词包 v4.1 校准方向

| 维度 | v4.1 校准 |
|---|---|
| 词包内容 | 异常词比例随 chapter 上升（Ch.1 极弱 / Ch.2 弱 / Ch.3 中模式化 / Ch.4 强 / Ch.5 = 玩家自己）|
| 异常词 trigger | active engage（理解 / 修改 / cross-ref）触发 B5 |
| 词包视觉 | Ch.6+ 字符级缓变作用于词包词（与 memory 一致）|
| 词包 narrative entries | v4.1 pipeline 重新生成（替换 v2.3 / v3.1 残留）|

### 9.9.3 词包与 PL-3（作者）机制

PL-3 typing buffer pre-populate **= 词包系统的 inverse 接入**：
- 普通词包：anomaly 通过 random word generation emit
- Ch.4 作者: anomaly 通过 typing buffer pre-populate **直接** emit
- 这两条 path 共享同一 anomaly voice 后端，不是两套系统

---

## 9.10 Implementation Priority · P0-P3 🔒 LOCKED

### 9.10.1 优先级分级

| Priority | 阻塞 ship | 内容 |
|---|---|---|
| **P0** | Ch.1 ship blocker | D29 routine 序列 / V1 boilerplate template / V5 守则 layered (L1) / B1 hook trigger |
| **P1** | Ch.2 ship blocker | V2 同事便条系统 / B2/B3 trigger / DC2 + DC5 实现 / 升职通知 boilerplate |
| **P2** | Ch.3-4 ship blocker | 反身闭合 boss tooltip (V6 + DC6) / 受理窗口 mechanic / 字符级缓变 cycle 6+ / D29 partial fail / NarrativeArchive save schema / Project Nim L4 reveal |
| **P3** | Ch.5 ship blocker | endless 入口仪式 (D32 双 voice) / 主菜单字符级缓变 leak / 跨 run 反身闭合 delivery / "致后来者"便签系统 / endless modifier signature 写入 |

### 9.10.2 跨 priority 共享 implementation

| 共享 | 影响 priority |
|---|---|
| `NarrativeTrackingState` (§9.2.1) | P0+ |
| `NarrativeTriggerEngine` (§9.2.2) | P0+ |
| Pipeline v4.1 sync (§8.8) | P0+（先生成 P0 内容）|
| `MetaSaveData` NarrativeArchive (§9.6.1) | P2-P3（反身闭合启动）|

### 9.10.3 已有但需要 narrative-aware refactor 的现有代码

| File | Narrative-aware refactor 内容 |
|---|---|
| `src/src/data/relics.ts` | 替换 58/95 v2.3 残留 flavor → v4.1 layered footnote |
| `src/src/data/skillGeneration.ts` | 替换 ~85% v2.3 残留 flavor → D25 v2 anomaly expression channel framing |
| `src/src/data/bossModifiers.ts` | reframe 为"撰写异常报告"; tooltip 加 attribution |
| `src/src/systems/bossModifierPicker.ts` | endless 模式 reframe（C2 + C3）|
| `src/src/scenes/battle/` | 工位 progression UI 切换 |
| `src/src/effects/` | 新增 CharDriftEffect / 反身闭合 ambient sound |

---

## 9.11 Step 9 完成度自检

| 维度 | 状态 |
|---|---|
| Integration philosophy | ✅ §9.1 LOCKED |
| 行为 trigger implementation 蓝图 | ✅ §9.2 LOCKED-flagged（待 engineering execute）|
| 字符级缓变 implementation | ✅ §9.3 LOCKED |
| 受理窗口 mechanic 接入（方案 C 混合）| ✅ §9.4 LOCKED |
| D29 implementation | ✅ §9.5 LOCKED |
| 反身闭合 in save system | ✅ §9.6 LOCKED |
| 现有 systems × v4.1 接入点（8 systems）| ✅ §9.7 LOCKED-flagged |
| PL-2/3 机制重做约束 | ✅ §9.8 LOCKED |
| 词包系统 v4.1 校准 | ✅ §9.9 LOCKED |
| Implementation priority P0-P3 | ✅ §9.10 LOCKED |
| Engineering execution | ⏳ 全部待 production execute（叙事侧已 LOCK）|
| narrative-writer pipeline v4.1 sync | ⏳ 待 production（与 P0 内容生成同步）|

**Step 9 主体已 LOCK**——下次 continue 推荐入口：
1. **Step 10** — Production Notes（QA / playtest 计划 / 跨 narrative-engineering 协作 protocol / risk register）
2. **PL-2/PL-3** — 蜕变者 / 造词师机制重做（约束已全 LOCK，可直接 execute）
3. **narrative-writer pipeline v4.1 sync** — production execution（生成 P0 内容启动）

---

_(rolling — Step 10 在下方继续)_

---

# Step 10（2026-05-04）— Production Notes

**进度更新**：✅ Production status snapshot / ✅ Risk register (R1-R8) / ✅ QA plan / ✅ Playtest strategy / ✅ Cross-team protocols / ✅ Localization considerations / ✅ Demo + web 模式约束 / ✅ Telemetry 纪律 / ✅ Known issues + open questions / ✅ Sprint planning guidance

**Step 10 范畴**：Steps 2-9 已锁定 narrative 蓝图 + integration 路径；Step 10 derive **production execute** 阶段需要的实际指南——QA / playtest / risk / cross-team protocol。这是 v4.1 narrative 与 ship-ready 之间的最后一份 production-facing 文档。

---

## 10.1 Production Status Snapshot 🔒 LOCKED

### 10.1.1 v4.1 Narrative-Design 状态

| 维度 | 状态 |
|---|---|
| Foundation (Steps 1-2) | ✅ 全 LOCK |
| Beats / Pacing (Step 3) | ✅ 全 LOCK |
| Characters (Step 4) | ✅ 全 LOCK |
| World & Lore (Step 5) | ✅ 全 LOCK + 8 PD（待 production tweak）|
| Dialogue Framework (Step 6) | ✅ 全 LOCK；sample library 待 pipeline 扩展至 100+ 句式 |
| Environmental Storytelling (Step 7) | ✅ 全 LOCK；prop 视觉 spec finalize 待 production |
| Narrative Delivery (Step 8) | ✅ 全 LOCK；narrative-writer pipeline v4.1 sync 待 execute |
| Integration with Gameplay (Step 9) | ✅ 全 LOCK；engineering execution 待 |

### 10.1.2 跨 engineering 状态（v3.x 残留）

| Asset | v3.x 残留状态 | 替换计划 |
|---|---|---|
| Relic flavor | 58/95 是 v2.3 残留 | 走 v4.1 pipeline 重新生成（layered footnote）|
| Skill flavor | ~85% 是 v2.3 残留 | 走 v4.1 pipeline 重新生成（D25 v2 anomaly framing）|
| 词包 narrative entries | v3.1 残留 | 与 PL-3 typing buffer pre-populate 共享 anomaly voice 后端，重新生成 |
| Boss modifier flavor | v2.3 残留 | reframe "撰写异常报告"风格 |
| 主菜单 dossier 文案 | v3.2 已重做 | 检查 v4.1 词典统一 + 灵长接口 reference |

### 10.1.3 Implementation 优先级回顾

| Priority | 内容 | 依赖 |
|---|---|---|
| **P0**（Ch.1 ship blocker）| D29 routine + V1 boilerplate + V5 守则 L1 + B1 hook | NarrativeTrackingState + NarrativeTriggerEngine + Pipeline P0 内容 |
| **P1**（Ch.2 ship blocker）| V2 同事便条 + B2/B3 + 升职通知 | DC2 + DC5 实现 |
| **P2**（Ch.3-4 ship blocker）| 反身闭合 boss tooltip + 受理窗口 + 字符级缓变 + D29 partial fail + B8 reveal | NarrativeArchive save schema |
| **P3**（Ch.5 ship blocker）| Endless 入口仪式 + 主菜单字符级缓变 + 跨 run 反身闭合 | Pipeline P3 内容 + endless free-type 系统 |

---

## 10.2 Risk Register 🔒 LOCKED

### 10.2.1 R1-R8 风险清单

| # | Risk | 严重度 | Mitigation |
|---|---|---|---|
| **R1** | B 真理 reveal trigger 被玩家逆向推断 | 中 | 触发 timing 加 randomness 容差（§3.3.3）；trigger 公式不在任何 documentation 显化 |
| **R2** | 反身闭合 implementation 跨 run save schema 复杂度 | 中-高 | NarrativeArchive 在 P2 sprint 早期 prototype；schema migration 设计在 SaveManager v6 → v7 |
| **R3** | 字符级缓变性能（rendering 频次过高）| 中 | CharDriftEffect 仅针对 active 显化 element（不每帧重 render）；Cycle 6+ 才 enable |
| **R4** | Pipeline v4.1 sync 替换 v3.x 残留体量大 | 高 | 分批替换；优先 P0 / P1 内容；relic flavor + skill flavor 可分批 ship |
| **R5** | 受理窗口 17:06-17:13 玩家可能永远玩不到那时段 | 低 | 方案 C 混合：午休 30 秒 + 计时钟无秒针 = 高频备用窗口；17:06 是隐藏 best window 而非唯一 |
| **R6** | 玩家错过 B8 reveal（Ch.4 唯一窗口）| 低 | D5 拒绝答案的兑现，接受；Project Nim 系列遗物在 Ch.4 高 hover 频次（cross-ref 默认引导玩家）|
| **R7** | PL-2/PL-3 机制重做与现有 metamorph/wordsmith 兼容性 | 中 | DELETED_SKILL_IDS 已建立；新 skills 通过 affix system；保留旧 ID 用于 save migration |
| **R8** | D29 状态确认 partial fail 体验为 "bug" 而非 design | 中-高 | partial fail 显示**routine 颜色**；不出红色 fail；玩家事后 reflection 是设计目标 |

### 10.2.2 关键风险跟踪

- **R4 Pipeline sync 是体量最大的 risk**——建议在 P0 sprint 内开 separate engineer track 跑 pipeline
- **R8 D29 partial fail 体验** 是 v4.1 horror 的核心；如果 mitigation 失败，整套 D29 退化曲线会被玩家当 bug——需 playtest 验证

---

## 10.3 QA Plan 🔒 LOCKED

### 10.3.1 QA Verification 清单

| 域 | Verify 项 |
|---|---|
| **B 真理 reveal trigger** | 各 chapter 内 B1-B9 在预期 trigger 行为后**确实**显化（行为 trigger 走通）|
| **多 channel 共显化** | 每条 B 真理至少 2 channel 兑现（避免单点错过）|
| **反身闭合 cross-run** | 跨 session 持久化（player workerId / modifier signature / typing rhythm）|
| **跨 run channel 显化** | DC6 boss tooltip / DC2 下周目便条 / DC9 主菜单 ambient 三种 cross-run channel 可触发 |
| **受理窗口 boost** | 真实时钟到 17:06-17:13 时 reveal 概率 ×1.3-1.5 verify |
| **D29 退化曲线** | Ch.1 见证 → Ch.2 routine → Ch.3 partial fail → Ch.4 频繁 partial → Ch.5 完全 fail 全跑通 |
| **字符级缓变 enable** | Cycle 6+ 在 Ch.4-5 触发；Ch.5 leak 到主菜单 |
| **Voice 退场曲线** | DC2 Ch.4 退场 / DC5 Ch.5 退场 / DC1 Ch.5 极简 |
| **Voice template 一致** | 5 段升职通知用同一 template（D32 反身闭合）|
| **anti-popup** | 全 narrative reveal 零 popup verify |

### 10.3.2 Negative QA（反向验证）

| 反向验证 | 验证方法 |
|---|---|
| 玩家**不**能 grind 出 reveal | 不触发 trigger 行为时玩 N runs，verify reveal 不显化 |
| 玩家**不**能逆向猜 trigger 公式 | trigger 文档 not exposed in code comment |
| 玩家**不**能在主菜单或 settings 看到反身闭合数据 | 测试 NarrativeArchive 在 UI 完全 hidden |
| 玩家**可能**错过 B8 / B9 / 第 10 条 | 这是 design——不是 bug |
| 玩家**不**能用 reset save 触发 reveal 重置 | 反身闭合数据应**rerunnable**——保留 in save 不被 in-run reset 影响 |

### 10.3.3 Edge Case Coverage

| Edge case | QA 覆盖 |
|---|---|
| 玩家**第一次**通关 Ch.4 时**不**点 endless（D17 隐藏结局）| Verify 游戏不奖励 / 不告知 / 主菜单无变化 |
| 玩家**重置 progress** 后玩 Ch.1 | NarrativeArchive 应**保留**（仅本地，不被 reset）|
| 玩家在受理窗口 17:06 时**主动**触发 hidden trigger | 多次 verify boost |
| 玩家长时间**不 hover 任何遗物** | B1 / B3 / B8 trigger 不会触发——verify reveal 不显化 |
| 玩家在 Ch.5 endless **不**写任何 modifier | 反身闭合数据生成最少 baseline；下周目仍可显化最少 attribution |

---

## 10.4 Playtest Strategy 🔒 LOCKED

### 10.4.1 Playtest 类型

| 类型 | 目的 | 时长 |
|---|---|---|
| **Solo blind playtest** | 验证玩家是否**自然**触发 B 真理 reveal | 单玩家 5-10 hours，全程录像 |
| **Long session playtest** | 验证 endless cross-run 反身闭合的 emergent reveal（第 10 条）| 10-20 hours，跨 session |
| **Specific milestone playtest** | 验证 Ch 入口仪式 / D29 partial fail / boss tooltip 反身闭合的玩家体验 | targeted 1-2 hour focused |

### 10.4.2 关键 Playtest Metrics

| Metric | 目标 |
|---|---|
| Ch.1 玩家平均触发 B1 数 | ≥ 80% 玩家在 5-10 hours 内触发 |
| Ch.2 玩家平均触发 B2 + B3 数 | ≥ 60% 玩家在章节内触发 |
| Ch.3 玩家触发 B4 + B5 + B6（任意 1 条）| ≥ 70% |
| Ch.4 玩家触发 B7 + B8 任意 1 条 | ≥ 50%（B8 是关键，cross-ref 行为驱动）|
| Ch.4 玩家触发 B9 累积 | ≥ 70% 玩家 D29 partial fail ≥ 3 次后触发 |
| Ch.5 玩家在 endless 中触发**第 10 条** reveal | ≤ 30%（design 接受多数玩家错过）|
| 玩家**事后** reflection（开放问答）| 玩家**自然**用"被吃" / "退化" / "猴子规则"等核心 framing 词 |

### 10.4.3 Playtest 反馈收集

- ❌ 不直接问"你觉得 narrative 怎么样？"
- ❌ 不让 playtester 看 narrative-design.md
- ✅ 让 playtester 复述他们**理解**的 narrative
- ✅ 注意 playtester 的**沉默**——如果 playtester 完全不提 narrative，是 design 失败
- ✅ 注意 playtester 的"困惑"——v4.1 horror 的成功标志是**事后**回想；in-the-moment 困惑过度说明 channel 太 obscure

### 10.4.4 Playtest 反馈对 design 的边界

> v4.1 narrative 的 design intent 是**让玩家事后才寒**——这意味着 playtest 反馈**不**应作为修改 narrative 的主要依据。
>
> 如果 playtester 说"我没看懂"——这**可能**是 design 成功（horror 是延迟感知的）。如果 playtester 说"我觉得是 bug"——这**可能**是 mitigation 不到位（如 D29 partial fail）。
>
> Playtest 用来 verify **mechanic** 是否走通（trigger 触发了吗 / channel 显化了吗）；不用于 verify **horror** 是否到位（horror 是 emergent，不是 testable）。

---

## 10.5 Cross-team Protocols 🔒 LOCKED

### 10.5.1 Narrative ↔ Engineering

| 协作场景 | Protocol |
|---|---|
| Mechanic 改变（如 affix 调整）| 评估是否影响某 B 真理 trigger 或 §3.4 micro beat 矩阵；narrative-design.md 同步 |
| 新增 system / scene | 评估是否需要 narrative hook（参考 §9.7 8 systems）|
| Save schema migration | NarrativeArchive 必须 backward-compatible；MetaState v6 → v7 时不能丢失反身闭合数据 |
| Performance opt | 字符级缓变 / ambient sound rePlay 性能优化时 narrative 验收（不能因 perf 破坏寂静化效果）|

### 10.5.2 Narrative ↔ Audio

| 协作场景 | Protocol |
|---|---|
| Sound retire 曲线 | Ch.5 几乎全 sound 退场——audio 团队需准备**silence as design**，不是 sound asset 缺失 |
| Typing rhythm replay | session 内 typing 时间戳采样规则 + 主菜单 ambient 重播实现 |
| Ch.4 偶发钢琴 | 极少 high-note single；不成 melody——避免被理解为 "boss BGM" |

### 10.5.3 Narrative ↔ Visual

| 协作场景 | Protocol |
|---|---|
| 字符级缓变实现 | drift 量极微 / 移开鼠标 settle / drift 内容来自 V3 池非 random |
| 向心矢量动效 | M1-M4 实现严格遵循向心矢量铁律——零离心 |
| 双层美学 | 文牍科旧气 + 90s 办公**两层共存**；不该共存的 era 同时——这是 D13 时间错乱 |
| 灵长接口 (PI) UI | PI 名字**永不**在 UI 显化 |

### 10.5.4 Narrative ↔ Localization

| 协作场景 | Protocol |
|---|---|
| 6 voices 跨语言 distinguishing | V1-V6 在 EN locale 也保持 distinctive（typography + 句式 + tone）|
| v4.1 词典统一 | DAY/BATCH/CYCLE/A 等 cycle 演进词典 EN 同步 |
| Project Nim 真假混合 | 真实历史部分（1973-1986）EN 用真实英文资料；fiction 部分跨语言保持密度 30/30/30/10 |
| "字 看 我" emergent sentence | EN 等价 = "characters look me"（直译保留 ASL grammar 之外的 emergent 性质）|

### 10.5.5 Narrative ↔ QA

| 协作场景 | Protocol |
|---|---|
| Reveal verification | 不在 QA tool 显化"哪条 reveal 触发了"——QA 通过 playtest log 间接 verify |
| Partial fail vs bug | QA 必须理解 D29 partial fail 是 design——不报为 bug |
| 反身闭合 cross-session | QA test plan 需含跨 session 测试（清 cache 后 verify NarrativeArchive 留存）|

---

## 10.6 Localization Considerations 🔒 LOCKED

### 10.6.1 Locale 范围

v4.1 主 locale：
- **ZH (中文 / 简体)**：主 locale，narrative-design.md 原始语言
- **EN (English)**：第二 locale；许多 v3.x flavor 已 EN 翻译，需 v4.1 重新校准

### 10.6.2 Voice × Locale 兼容性

| Voice | ZH 特征 | EN 等价处理 |
|---|---|---|
| V1 公司 boilerplate | 程序化 / 行政化 | 直译 + bureaucratic English（参考 SCP foundation 风格）|
| V2 同事便条 | 短碎 / 矛盾 | EN 用断句 / 不完整 sentences；保持 contradiction |
| V3 anomaly fragment | 字符 drift / 半可读 | EN 用 letter drift / partial readability 保持 |
| V4 D29 prompt | "请..." 命令式 | EN 用 "Please..." 保持 polite imperative |
| V5 守则 layered | 文牍科旧气 + 规则怪谈 | EN 用 institutional / form-language 保持旧气 |
| V6 boss tooltip | "上一任作者: Subject XX-####" | EN 直译 "Previous Author: Subject XX-####" |

### 10.6.3 Locale-specific 注意点

- 灵长接口 (Primate Interface, PI) 双关在 EN 自然成立（"primate"既指人类也指 Nim）
- 文牍科 旧气美学 EN 等价 = 1940s-50s American clerical office（用 typewriter / ink stamps 美学锚定）
- 受理窗口 = textual acceptance interval；EN 直译保持
- 状态确认 = state confirmation / keep-as-human check；EN 用 keep-as-human 强化

### 10.6.4 词典统一（cycle 演进 memory 锚定）

> **关联 memory**："UI label vocabulary unified · cycle 演进"——Cycle 1-5 词典统一（DAY/BATCH/CYCLE/A）；Cycle 6+ Endless 启用单字符级缓变作为污染症候

| ZH | EN | 用法 |
|---|---|---|
| 班次 | shift / batch | 1 run = 1 班次 |
| 周期 | cycle | 1 cycle = 12 stages |
| 工号 | worker ID / employee ID | 玩家 identity |
| Subject XX-#### | Subject XX-#### | 跨 locale 保持 |
| 受理窗口 | acceptance interval | D27 |
| 灵长接口 | Primate Interface (PI) | 灵长接口 |
| 文牍科 | Clerical Bureau | DPCA |

---

## 10.7 Demo / Web 模式约束 🔒 LOCKED

### 10.7.1 Demo 模式 (`__DEMO_MODE__=true`) narrative 范围

per project-context.md 现有 Demo 模式 tree-shake 全 feature；v4.1 narrative 在 demo 模式：

| Demo 范围 | v4.1 narrative |
|---|---|
| Demo 仅含 Ch.1-2 内容 | V1 + V2 + V5（L1）+ V7 ambient；零反身闭合 |
| 反身闭合数据 disabled | NarrativeArchive 不写 / 不读（`__DEMO_MODE__` flag）|
| D29 仅 routine 版本 | 见证 + routine 通过；零 partial fail |
| 字符级缓变 disabled | Cycle 6+ disabled in demo |
| Boss tooltip 反身闭合 disabled | DC6 仅显 boss modifier text，无 attribution |

### 10.7.2 Web 模式（localStorage fallback）

| Web 限制 | v4.1 处理 |
|---|---|
| LocalStorage 大小 | NarrativeArchive 限制条目数（typingRhythmFingerprints 仅保留最近 N 个 session）|
| 无 IPC 反身闭合 | localStorage 仍可跨 run 持久化 |
| 跨 device 不同步 | 默认设计 — 反身闭合**仅单 device**（与 §8.9.2 一致）|

---

## 10.8 Telemetry 纪律 🔒 LOCKED

### 10.8.1 不收集 / 不上传

- ❌ 玩家 typed content（任何文本输入内容）
- ❌ NarrativeArchive 数据（反身闭合记录）
- ❌ B 真理 reveal trigger 状态
- ❌ D29 partial fail 详情
- ❌ 玩家 typing rhythm 时间戳（即使不含内容也不上传）

### 10.8.2 可收集（仅 debug，opt-in）

- ✅ 章节通关 / endless 进入率（aggregate）
- ✅ 平均 playtime per chapter
- ✅ Crash / error log（不含 narrative content）

### 10.8.3 Privacy 哲学

> v4.1 narrative 的反身闭合数据**包含玩家本人 typing 历史 fingerprint**——这是**最私密**的玩家数据。**绝不**离开本地 device。
>
> 即使是 anonymized analytics 也不收集——因为 typing rhythm fingerprint 在足够样本下可能成为**玩家身份生物特征**。这是 v4.1 narrative 设计的硬纪律。

---

## 10.9 Known Issues / Open Questions 🔒 LOCKED

### 10.9.1 已知 open question

| # | Question | 影响 |
|---|---|---|
| **OQ-1** | Reveal randomness 容差具体值（×0.8-×1.2？）| 中——影响 playtest verification rate |
| **OQ-2** | Project Nim L4 reveal 是否需多于 3 个 cross-ref（4？5？）| 中——影响 B8 触发频次 |
| **OQ-3** | 受理窗口 "计时钟无秒针时" 触发概率（每 cycle 5%？10%？）| 中——影响 R5 mitigation 强度 |
| **OQ-4** | 反身闭合 modifier signature 写入策略（每 endless cycle / 每 N cycles）| 高——影响下周目 attribution 频次 |
| **OQ-5** | typing rhythm fingerprint 数据结构（vector dim / sample interval）| 高——影响 R3 perf + privacy |
| **OQ-6** | "致后来者"便签写入条件（玩家 endless N cycles 后？随机？）| 中 |
| **OQ-7** | D29 partial fail 触发概率曲线（Ch.3 5% → Ch.4 50% 怎么 ramp）| 高——影响玩家 reflection 时机 |

### 10.9.2 Open Production Decisions（PD-1 至 PD-8）

per §5.10：

| PD | Status |
|---|---|
| PD-1 X 集团 specific name | 不命名（保持 placeholder）|
| PD-2 第七打字室 = 唯一 active 锁死 | LOCK |
| PD-3 受理窗口 17:06 = Nim 死亡时刻（hidden）| LOCK |
| PD-4 Nim "字 看 我" emergent sentence | LOCK |
| PD-5 无名研究员不给名字 | LOCK |
| PD-6 X 集团其他子部门 medium（audio/visual/behavioral）| 不在 in-game 显化具体 medium |
| PD-7 DPCA full name 是否完整出现 | 完整可在某遗物 L3 出现一次 |
| PD-8 4 anchor 工号具体数字 | 建议 XX-1138 / XX-047 / XX-0001 / XX-?；待 production tweak |

---

## 10.10 Sprint Planning Guidance 🔒 LOCKED

### 10.10.1 Sprint 0（Pre-P0 · Foundation Sprint）

**目标**：v4.1 production infrastructure 就位。

| Task | 估时 | 团队 |
|---|---|---|
| `NarrativeTrackingState` schema design + impl | 1 week | engineering |
| `NarrativeTriggerEngine` skeleton | 1 week | engineering |
| Pipeline v4.1 sync prep（v3.1 → v4.1 转换 schema）| 1 week | narrative + engineering |
| `MetaSaveData` NarrativeArchive schema migration design | 0.5 week | engineering |
| Playtest tooling（log capture）| 0.5 week | QA |

### 10.10.2 Sprint P0（Ch.1 Ship Sprint）

**目标**：Ch.1 录入员可玩 ship 状态。

| Task | 估时 | 团队 |
|---|---|---|
| D29 routine 序列接入 stageFlow | 1 week | engineering |
| V1 boilerplate template ~30 句式（P0 subset）| 1 week | narrative pipeline |
| V5 守则 L1 库 ~50 守则（P0 subset）| 1 week | narrative pipeline |
| B1 hook trigger（hover counts）| 0.5 week | engineering |
| D29 见证场景 UI（voice-only） | 1 week | engineering + audio |
| **Playtest Ch.1（5 玩家 × 2-3 hours）** | 1 week | QA |

### 10.10.3 Sprint P1-P3 顺序

| Sprint | 关键内容 |
|---|---|
| P1 | V2 同事便条系统 + B2/B3 trigger + DC2 + DC5 + 升职通知 boilerplate |
| P2 | 反身闭合 boss tooltip (V6 + DC6) + 受理窗口 mechanic + 字符级缓变 cycle 6+ + D29 partial fail + Project Nim L4 reveal + NarrativeArchive write/read |
| P3 | endless 入口仪式 (D32 双 voice) + 主菜单字符级缓变 leak + 跨 run 反身闭合 delivery + "致后来者"便签系统 + endless modifier signature 写入 |

每 Sprint 后接 **chapter playtest**。

---

## 10.11 Step 10 完成度自检

| 维度 | 状态 |
|---|---|
| Production status snapshot | ✅ §10.1 LOCKED |
| Risk register R1-R8 | ✅ §10.2 LOCKED |
| QA plan + edge cases | ✅ §10.3 LOCKED |
| Playtest strategy + metrics | ✅ §10.4 LOCKED |
| Cross-team protocols (5 teams) | ✅ §10.5 LOCKED |
| Localization considerations | ✅ §10.6 LOCKED |
| Demo + web 模式约束 | ✅ §10.7 LOCKED |
| Telemetry 纪律 | ✅ §10.8 LOCKED |
| Known issues + 7 OQ | ✅ §10.9 LOCKED |
| Sprint planning P0-P3 | ✅ §10.10 LOCKED |
| OQ-1 至 OQ-7 finalize | ⏳ 待 production tweak（具体数值需 playtest verify）|

**Step 10 主体已 LOCK**——下次 continue：
1. **Step 11** — Complete + Appendices + Handoff（最后一步！v4.1 narrative 收官）

---

_(rolling — Step 11 收官在下方)_

---

# Step 11（2026-05-04）— Complete + Appendices + Handoff

**进度更新**：✅ v4.1 status 总览 / ✅ D1-D32 全索引 / ✅ B1-B10 矩阵 / ✅ C1-C7 约束 / ✅ Chapter tasks 索引 / ✅ Character cast 索引 / ✅ Voice/Channel/Mode 矩阵 / ✅ Environment 索引 / ✅ World lore 索引 / ✅ PD/OQ/PL 状态总览 / ✅ Sprint plan / ✅ Handoff checklist / ✅ 关键设计纪律集合 / ✅ Document conventions / ✅ Acknowledgments

**Step 11 范畴**：v4.1 narrative workflow 的**最后一步**。本节是给下一个 agent / production team 的 navigable handoff 文档——任何后续 reader 可从 §11 一节出发完整 navigate 整份 narrative-design.md。

> **本步不引入新的 design 决定**——纯整合 + 索引 + handoff。

---

## 11.1 v4.1 Narrative · 状态总览 🔒 LOCKED

### 11.1.1 Workflow 11 步状态

| Step | 状态 | 关键 LOCK |
|---|---|---|
| 1 Initialize | ✅ | v4.0 B 合约启动 |
| 2 Foundation | ✅ | D1-D32 + Premise/Themes/Tone/Structure/Acts + 5 章 narrative tasks + B1-B9 |
| 3 Beats / Pacing | ✅ | 三层 beat 架构 + 行为驱动 trigger map + Phase A/B/C |
| 4 Characters | ✅ | Anti-character + 6 类 no-face cast + 同事 ghost + Project Nim 4 layers |
| 5 World & Lore | ✅ | DPCA Genesis + 第七打字室 + PI lore + Nim deep lore + D27-29 lore origin |
| 6 Dialogue Framework | ✅ | Anti-dialogue + 6 voices (V1-V6) + voice retire 曲线 |
| 7 Environmental Storytelling | ✅ | V7 + 4 channel (E1-E4) + 向心矢量铁律 + 美学 D13 物理化 |
| 8 Narrative Delivery | ✅ | 11 channel (DC1-DC11) + 6 modes + Macro/Mid/Micro schedule + 寂静化总曲线 |
| 9 Integration with Gameplay | ✅ | 行为 trigger engine 蓝图 + 字符级缓变 + 受理窗口 + D29 + 反身闭合 save schema + 8 systems hook |
| 10 Production Notes | ✅ | R1-R8 risk + QA plan + playtest 哲学 + telemetry 隐私 + OQ-1 至 OQ-7 + Sprint P0-P3 |
| 11 Complete + Handoff | ✅ | 本节 |

**11/11 全 LOCK** —— **v4.1 narrative workflow 完整闭合**。

### 11.1.2 文档统计

| 维度 | 数值 |
|---|---|
| Total lines | ~4400+ |
| 主要 sections | 11 Steps + Document Status + v4.0 B 合约 |
| Decision atoms (D1-D32) | 32 条 |
| Truth atoms (B1-B9 + 第 10 条) | 10 条 |
| Constraint atoms (C1-C7) | 7 条 |
| Production decisions (PD-1 至 PD-8) | 8 条 |
| Open questions (OQ-1 至 OQ-7) | 7 条 |
| Parking lot items (PL-1 至 PL-11) | 11 条 |
| Voice channels (V1-V6 + V7) | 7 类 |
| Delivery channels (DC1-DC11) | 11 类 |
| Delivery modes (DM1-DM6) | 6 类 |
| Environment channels (E1-E4) | 4 类 |
| Motion types (M1-M4) | 4 类 |
| Sound types (S1-S5) | 5 类 |
| Props (P1-P10) | 10 类 |
| Chapter narrative tasks | 5 章 (DRAFT v1-v2) |
| Anchor 工号 | 4 个 |

---

## 11.2 D 决策链全索引（D1-D32）🔒 LOCKED

| # | 决定 | §出处 |
|---|---|---|
| **D1** | anomaly 本体：文本通过准确录入获得有效性；污染 = 身份阶梯下滑 | §2.1 + §2.3 |
| **D2** | 安全态 = 放弃理解（非表演）；猴子悖论自带防腐 | §2.1 + §2.3 |
| **D3** | 主叙事方法 = 规则怪谈（多声部矛盾公文）| §2.2 + §2.3 |
| **D4** | 5 段阶梯 = 5 职业 | §2.3 |
| **D5** | 游戏拒绝给答案；结局 = 玩家成为/留下的文档 | §2.3 |
| **D6** | Meta-progression 反用：进步即堕落，解锁 = 诱降 | §2.3 |
| **D7** | 玩家被记账，但污染状态不可见 | §2.3 |
| **D8** | 多声部反身闭合：玩家职业 = 文档矩阵中一个 voice | §2.3 |
| **D9** | none = 录入员, metamorph = 修改者, wordsmith = 作者 | §2.3 |
| **D10** | 解锁顺序反转：录入员 → 校对者 → 修改者 → 作者 → 文本一部分 | §2.3 |
| **D11** | Ascension A0-Amax orthogonal | §2.3 |
| **D12** | DPCA / 文牍科 / X 集团子部门 | §2.10 + §2.15 |
| **D13** | 美学 = 文牍科旧气 + 90s 办公室；时间错乱即 horror | §2.10 + §2.15 + §7.7 |
| **D14 v2** | 公司动机 = self-preservation；NOT service to anomaly | §2.15 |
| **D15** | 公司是 knowing containment system；NOT actively serving anomaly | §2.15 |
| **D16** | 阶梯双向化 — 两端都失人性，中间是"人"的窄道 | §2.15 |
| **D17** | 隐藏结局：不打字 = 不入局；不应被攻略告知 | §2.15 |
| **D18** | 遗物 = DPCA 前身灵长类研究项目历史档案 | §2.15 |
| **D19** | D8 反身闭合在遗物上：Subject [玩家工号] 经手 footnote | §2.15 |
| **D20 v3** | L1-L5 = 同一份文档不同 reading；公司不投放/不修改；文本是诚实的镜子 | §2.15 |
| **D21** | 公司的恶 = Kafka × Arendt banal systemic evil；没有具体决策者 | §2.15 |
| **D22** | 历史档案 = 员工自我检查的认知锚点；用公司的尺度知道自己污染 | §2.15 |
| **D23 v2** | 双员工同读同一文档读到不同内容 | §2.15 |
| **D24 v2** | 5 职业 = 公司 emergent 5 道污染容纳防线 | §2.15 |
| **D25 v2** | 技能 = 异常的 expression channels；修改技能 = tamper anomaly's expression | §2.15 |
| **D26 v2** | 异常通过 peer-to-peer + direct guidance 两条 vectors 传播；公司 NOT vector | §2.15 |
| **D27** | 受理窗口（textual acceptance interval）| §2.15 + §5.7 |
| **D28** | 机械见证效应（击键认证 / 格式通道）| §2.15 + §5.7 |
| **D29** | 状态确认流程（Keep-as-human Check）| §2.15 + §5.7 + §6.3.4 + §9.5 |
| **D30** | 公司 = defensive curator, NOT anomaly vector | §2.15 |
| **D31** | 6 类规则 = 同一文档 6 个 layers（不是不同文档）| §2.15 |
| **D32** | Ch.5 = 双 voice 同事件（升格 + 处置同步）| §2.15 + §2.16.5 |

---

## 11.3 B 真理矩阵（B1-B9 + 第 10 条）🔒 LOCKED

| # | 真理 | Chapter | Channel | Trigger | §出处 |
|---|---|---|---|---|---|
| **B1** | 文本不 inert | Ch.1 中-末 | DC1 + DC7 + DC10 | 反复 hover 同遗物 ≥ 3 次 | §2.17 + §3.3.2 |
| **B2** | 文档 layer 取决于 reader | Ch.2 中段 | DC2 + DC5 | 玩家 query 同事便条；标注被无视 | §2.17 |
| **B3** | 规则是事故化石 | Ch.2 末 - Ch.3 早 | DC5 + DC7 | cross-ref 工作台规则 vs 遗物 footnote | §2.17 |
| **B4** | 异常已在野外，公司只是事后 contain | Ch.3 早 | DC1 | 累积外部 boilerplate ≥ 5 次 | §2.17 |
| **B5** | 理解 / 修改 / 判断 = 推向作者位 | Ch.3 中 | DC2 + DC3 | typing 节奏累积变化 + 老员工警告填空 | §2.17 |
| **B6** | 公司既不阻止也不偏好，只是 keep 记账 | Ch.3 末 - Ch.4 早 | DC1 + DC2 | 执行挽救方法 + 0 反馈 | §2.17 |
| **B7** | 现实自洽 | Ch.4 早-中 | DC1 + DC7 | 修改文档后时间戳错位 / L3-L4 回头改写 | §2.17 |
| **B8** | DPCA 被 anomaly 通过历史 dictate | Ch.4 中-末 | DC7 | cross-ref Project Nim 遗物 ≥ 3 份 → L4 显化 | §2.17 + §4.5 + §5.6 |
| **B9** | 猴子规则是处置 | Ch.4 末 - Ch.5 入口 | DC1 + DC4 + DC11 | D29 频繁 partial fail + "前任作者归档" | §2.17 |
| **第 10 条** | 没有 main agent —— 工艺自我延续 | Ch.5 endless 中-后段 | DC6 + DC9 + DC10（emergent）| 玩家 cross-ref 自己以前 endless 工号在新 run boss tooltip | §2.17 |

**矩阵观察**：
- **每条 B 真理至少 2 channel 共显化**（避免单点错过）—— §8.7
- **B6 / B8 完全无 environment 触发** —— 纯 textual reveal
- **第 10 条跨所有 dimension** —— 这正是它玩家自己 derive 的特征
- **B6 是 banal evil 的最尖锐 in-game 兑现**（D21）

---

## 11.4 C 约束（C1-C7）🔒 LOCKED

| # | 约束 | 出处 D | §出处 |
|---|---|---|---|
| **C1** | Endless 入口必须有"升格仪式"瞬间 | D5 | §2.7 + §2.16.5 |
| **C2** | Boss modifier UI 不能感觉像 buff 选择 | D5 + D8 | §2.7 + §2.16.5 |
| **C3** | 每个 modifier 旁应显示"上一任作者: Subject XX" | D8 | §2.7 + §2.16.5 |
| **C4** | Endless 玩家写的 modifier 进入下周目 | D8 反身闭合硬兑现 | §2.7 + §8.9 |
| **C5** | 污染状态不可见 | D7 | §2.7 |
| **C6** | 每个职业必须至少与三轨之一发生强 typing 交互 | Voice 矩阵 | §2.7 |
| **C7** | "解锁=诱降" 可感知化 | D6 | §2.7 |

---

## 11.5 Chapter Narrative Tasks 索引 🔒 LOCKED

| Ch | 职业 | DRAFT 状态 | §出处 | 核心 horror |
|---|---|---|---|---|
| **Ch.1** | 录入员 (none) | DRAFT v2 | §2.16.1 | 被遗忘的可能性 |
| **Ch.2** | 校对者（待新增 mech）| DRAFT v2 | §2.16.2 | "看似有人在 manage 我，但越查越发现没人在那里" |
| **Ch.3** | 修改者 (metamorph) | DRAFT v2 | §2.16.3 | "公司既不偏好我用新机制，也不偏好我不用——它只是 keep 记账" |
| **Ch.4** | 作者 (wordsmith) | DRAFT v1 | §2.16.4 | "最有 agency 感的我，最 lack agency" |
| **Ch.5** | 文本一部分 (endless) | DRAFT v1 | §2.16.5 | D32 双 voice 同事件 |

每章包含：核心 horror / 入口 / 三轨 (公司/员工/异常) + 遗物 + 技能 / 状态确认仪式（Ch.2-5）/ 情绪曲线 / 本章不应出现 / 埋下的 hooks / 关键设计纪律。

---

## 11.6 Character Cast 索引 🔒 LOCKED

### 11.6.1 6 类 no-face character (C1-C6)

| # | Character 类 | 主载体 | §出处 |
|---|---|---|---|
| **C1** | 玩家自己 | 工号 + typing 行为 | §4.3 |
| **C2** | Same-class peers (同事 ghost) | 工号 + 便条 + 工位 + 消失 | §4.4 |
| **C3** | 历史 Subjects (Project Nim 等) | 遗物 L1-L4 layered footnote | §4.5 |
| **C4** | DPCA 本身 | boilerplate template | §4.6 |
| **C5** | Anomaly 本身 | 词包 + 字符级缓变 + dictation | §4.6 |
| **C6** | 玩家以前的自己 | Subject XX-#### attribution | §4.7 |

### 11.6.2 4 个 anchor 工号

| Anchor 工号 | Character role | §出处 |
|---|---|---|
| **Subject XX-1138** | 前一任作者/修改者；boss tooltip 频繁 attribution | §4.4.3 |
| **Subject XX-047** | 隔壁工位录入员（Ch.1 末尾 D29 见证场景）| §4.4.3 |
| **Subject XX-0001** | 始祖录入员；遗物中最早 reference | §4.4.3 |
| **Subject XX-?** | 下一任你；Ch.5 玩家 footprint 写给的对象 | §4.4.3 |

---

## 11.7 Voice / Channel / Mode 矩阵 🔒 LOCKED

### 11.7.1 7 类 Voice

| # | Voice | Source | §出处 |
|---|---|---|---|
| **V1** | DPCA boilerplate | DPCA template | §6.2 + §6.3.1 |
| **V2** | 同事便条 | peer ghost (C2) | §6.2 + §6.3.2 |
| **V3** | Anomaly dictation | anomaly (C5) | §6.2 + §6.3.3 |
| **V4** | D29 检测员 prompt | voice-only character | §6.2 + §6.3.4 |
| **V5** | 规则手册 / 守则 | DPCA layered document | §6.2 + §6.3.5 |
| **V6** | Boss tooltip / 反身闭合 | anomaly + 玩家以前自己 (C6) | §6.2 + §6.3.6 |
| **V7** | Environment voice | E1-E4 ambient | §7.1 |

### 11.7.2 11 类 Delivery Channel

| # | Channel | 主要 voice / env | §出处 |
|---|---|---|---|
| DC1 | 工作台 boilerplate notifications | V1 | §8.2 |
| DC2 | 工作台便条 | V2 | §8.2 |
| DC3 | Typing buffer dictation | V3 | §8.2 |
| DC4 | D29 状态确认 prompt | V4 | §8.2 |
| DC5 | 规则手册 / 守则文档 | V5 | §8.2 |
| DC6 | Boss tooltip | V6 | §8.2 |
| DC7 | 遗物 hover footnote | V5 layered + character lore | §8.2 |
| DC8 | 工位 environment ambient | V7 + E1-E4 | §8.2 |
| DC9 | 主菜单 / settings | V7 字符级缓变 leak (Ch.5) | §8.2 |
| DC10 | Cycle 末尾"今日总结"屏 | V3 + B1 媒介 | §8.2 |
| DC11 | 升职通知 / 章节过渡仪式 | V1 + D32 双 voice (Ch.5) | §8.2 |

### 11.7.3 6 类 Delivery Mode

| # | Mode | 形式 | §出处 |
|---|---|---|---|
| DM1 | Static text | 预定义 boilerplate / 守则 / 便条 | §8.3 |
| DM2 | Dynamic generated | 基于玩家 typing history 生成 | §8.3 |
| DM3 | Procedural fragment | anomaly dictation 的 buffer 内容 | §8.3 |
| DM4 | Layered footnote | 同一份遗物 L1-L4 不同 reading | §8.3 |
| DM5 | Ambient sound / visual | 不显化为 text 的 cue | §8.3 |
| DM6 | Cross-reference emergent | 玩家手动 cross-ref 触发 | §8.3 |

---

## 11.8 Environment 索引 🔒 LOCKED

### 11.8.1 4 类 Channel + sub-types

| 类 | 子类 | §出处 |
|---|---|---|
| **E1** 空间 | 工位 5 章 progression（Ch.1 多同事 → Ch.5 物理含混）| §7.3 |
| **E2** 时间 | D27 受理窗口 / 计时钟无秒针 / 时间戳错位 / 字符级缓变 cycle | §7.4 |
| **E3** 动效 | M1 暗角吸光 / M2 中心定点脉动 / M3 粒子向心流 / M4 文档边缘 micro-changes | §7.5 |
| **E4** Prop | P1-P10（详见下表）| §7.6 |

### 11.8.2 5 类 ambient sound (S1-S5)

| # | Sound | §出处 |
|---|---|---|
| S1 | 打字机击键 click | §7.8.2 |
| S2 | 荧光灯嗡鸣 | §7.8.2 |
| S3 | 静电噪音 | §7.8.2 |
| S4 | 远处 PA 广播 | §7.8.2 |
| S5 | 偶发钢琴 | §7.8.2 |

### 11.8.3 10 类 Prop (P1-P10)

| # | Prop | §出处 |
|---|---|---|
| P1 | 机械打字机 | §7.6.1 + §7.6.2 |
| P2 | 灵长接口 PI 屏幕 | §7.6.1 + §7.6.3 |
| P3 | 红章 / 印章 | §7.6.1 |
| P4 | 色带窗 | §7.6.1 |
| P5 | 工号牌 / 工号工卡 | §7.6.1 |
| P6 | 文档纸张 | §7.6.1 |
| P7 | 工位抽屉 | §7.6.1 |
| P8 | 老式钢笔 / 红笔 | §7.6.1 |
| P9 | 计时钟 | §7.6.1 |
| P10 | 荧光灯 | §7.6.1 |

---

## 11.9 World Lore 索引 🔒 LOCKED

| Lore 主题 | §出处 |
|---|---|
| World layer architecture（空间 3 层 + 时间 4 层）| §5.1 |
| **DPCA Genesis** 神话（Nim → 无名研究员 → framework）| §5.2 |
| 文牍科 / **第七打字室**（唯一 active；前六室 fail/closed）| §5.3 |
| 灵长接口 (PI) Lore Origin（继承自 Project Nim ASL 协议）| §5.4 |
| **X 集团** macro banal evil | §5.5 |
| **Project Nim deep lore**（real + fiction grounding；4 layers）| §5.6 + §4.5 |
| D27 受理窗口 lore（17:06 = Nim 死亡时刻 hidden）| §5.7.1 |
| D28 机械见证 lore（1985 Nim 时期发现）| §5.7.2 |
| D29 状态确认 lore（1980s-90s post-incident protocol）| §5.7.3 |
| Nim 终末期 emergent sentence "字 看 我" | §5.6.4 |

---

## 11.10 PD（Production Decisions）状态 🔒 LOCKED

| PD | 决定 | 状态 | §出处 |
|---|---|---|---|
| PD-1 | X 集团 specific name | 不命名（保持 placeholder）| §5.10 |
| PD-2 | 第七打字室 = 唯一 active | LOCK | §5.10 |
| PD-3 | 受理窗口 17:06 = Nim 死亡时刻 | LOCK（hidden）| §5.10 |
| PD-4 | Nim "字 看 我" emergent sentence | LOCK | §5.10 |
| PD-5 | 无名研究员**不**给名字 | LOCK | §5.10 |
| PD-6 | X 集团其他子部门 medium | 不在 in-game 显化 | §5.10 |
| PD-7 | DPCA full name 完整出现一次（某遗物 L3）| LOCK | §5.10 |
| PD-8 | 4 anchor 工号具体数字 | 建议 XX-1138 / XX-047 / XX-0001 / XX-? | §4.4.3 + §5.10 |

---

## 11.11 OQ（Open Questions）状态 ⏳ 待 Production verify

| OQ | Question | §出处 |
|---|---|---|
| OQ-1 | Reveal randomness 容差具体值（×0.8-×1.2？）| §10.9.1 |
| OQ-2 | Project Nim L4 reveal cross-ref 阈值（4？5？）| §10.9.1 |
| OQ-3 | 受理窗口"计时钟无秒针时"概率（5%？10%？）| §10.9.1 |
| OQ-4 | 反身闭合 modifier signature 写入策略 | §10.9.1 |
| OQ-5 | typing rhythm fingerprint 数据结构 | §10.9.1 |
| OQ-6 | "致后来者"便签写入条件 | §10.9.1 |
| OQ-7 | D29 partial fail 概率曲线 ramp | §10.9.1 |

---

## 11.12 PL（Parking Lot）状态总览 🔒 LOCKED

| PL | 项 | 状态 | §出处 |
|---|---|---|---|
| ~~PL-1~~ | 校对者 typing 机制设计 | 暂定（待机制重做）| §2.18 |
| **PL-2** | 蜕变者（修改者）机制重做 | 待 production execute（叙事约束已 LOCK）| §2.18 + §9.8 |
| **PL-3** | 造词师（作者）机制重做 | 待 production execute（叙事约束已 LOCK）| §2.18 + §9.8 |
| ~~PL-4~~ | endless 升格仪式 | LOCKED 入口框架 | §2.18 + §2.16.5 |
| **PL-5** | endless modifier 写入本地存档 implementation | 待 production execute | §2.18 + §9.6 |
| ~~PL-6~~ | 章节叙事任务整体改进 | DONE | §2.18 |
| ~~PL-7~~ | B1-B9 derive | DONE | §2.18 + §2.17 |
| ~~PL-8~~ | contract_reopened 重审 | 实质 closed | §2.18 |
| ~~PL-9~~ | Ch.4 完整章节任务 derive | DONE | §2.18 + §2.16.4 |
| ~~PL-10~~ | Ch.1 / Ch.2 v4.1 回炉 | DONE | §2.18 |
| **PL-11** | 灵长接口 (PI) UI 文案 / theme 落地 | 待 production execute | §2.18 |

---

## 11.13 Production Sprint Plan 索引 🔒 LOCKED

| Sprint | 范围 | §出处 |
|---|---|---|
| **Sprint 0** | NarrativeTrackingState + Engine skeleton + Pipeline sync prep | §10.10.1 |
| **P0 (Ch.1 ship)** | D29 routine + V1 boilerplate + V5 守则 L1 + B1 hook | §10.10.2 |
| **P1 (Ch.2 ship)** | V2 同事便条 + B2/B3 + DC2/DC5 + 升职通知 | §10.10.3 |
| **P2 (Ch.3-4 ship)** | 反身闭合 boss tooltip + 受理窗口 + 字符级缓变 + D29 partial fail + B8 reveal + NarrativeArchive | §10.10.3 |
| **P3 (Ch.5 ship)** | endless 入口仪式 + 主菜单字符级缓变 leak + 跨 run 反身闭合 | §10.10.3 |

---

## 11.14 Handoff Checklist · 给下一个 Agent / Production Team 🔒 LOCKED

### 11.14.1 设计已就位（不需要重新决定）

- ✅ Anomaly 本体 (D1) + 主叙事方法（规则怪谈 D3）
- ✅ 5 章 narrative tasks（Ch.1-5 DRAFT v1-v2）
- ✅ B1-B9 + 第 10 条 reveal 全 trigger map
- ✅ 6 voices (V1-V6) + V7 environment + 11 channels (DC1-DC11) + 6 modes (DM1-DM6)
- ✅ Character cast (C1-C6) + 4 anchor 工号
- ✅ World lore (DPCA Genesis + Project Nim 4 layers + 第七打字室)
- ✅ Pacing curve (Phase A/B/C 寂静化总曲线)
- ✅ Anti-paradigm 四件套（anti-character / anti-pacing / anti-dialogue / anti-environment-as-decoration）
- ✅ 反身闭合 save schema 蓝图（NarrativeArchive）
- ✅ 8 systems × v4.1 接入点
- ✅ Sprint planning P0-P3
- ✅ R1-R8 risk register + Mitigation
- ✅ QA + Playtest 哲学

### 11.14.2 待 Production Execute

- ⏳ narrative-writer pipeline v4.1 sync（生成 V1 ~100 / V2 ~150 / V3 ~100 / V4 25 / V5 ~900 / 遗物 layered ~376）
- ⏳ 替换 v3.x 残留（58/95 relic + ~85% skills + 词包 + boss modifier flavor）
- ⏳ NarrativeTrackingState + NarrativeTriggerEngine implementation
- ⏳ MetaSaveData NarrativeArchive schema migration
- ⏳ CharDriftEffect implementation
- ⏳ 受理窗口 mechanic 接入（方案 C 混合）
- ⏳ D29 partial fail 触发概率曲线（OQ-7）
- ⏳ PL-2 / PL-3 / PL-5 / PL-11 production execute
- ⏳ 4 anchor 工号 + reveal 容差值 finalize（PD-8 / OQ-1）
- ⏳ Playtest Ch.1（5 玩家 × 2-3 hours）+ verify B1 trigger

### 11.14.3 给下一个 Narrative Agent 的提示

> 如果你正在打开这份 doc 准备继续 narrative work：
>
> 1. **不要重写已 LOCK 的部分**——D1-D32 / B1-B9 / Ch.1-5 narrative tasks / Voice / Channel / Environment 全已锁。
> 2. **如果发现 lock 内容相互矛盾**——优先级：B 真理 > D 决定 > C 约束 > §2.16 narrative tasks > §3-9 derived rules。如果矛盾出现，先读 §2.1-2.7 anomaly 本体确认根本约束。
> 3. **新增 design 决定必须 derive from D1-D32**——v4.0 反推方法论 (§Document Status) 锁死了从 anomaly 反推的根本方向，新决定不能逆向硬塞。
> 4. **修改任何 LOCKED 部分前**——先在 §2.18 PARKING LOT 加新 PL 项 → 与 user 确认 → 再改。
> 5. **Production 阶段的 OQ-1 至 OQ-7 / PD-1 至 PD-8** 是 narrative 团队在 production-time 才能 finalize 的——不要在 design-time 强行决定。
> 6. **Pipeline v4.1 sync 是最大的 production blocker**——任何 ship-blocking sprint 都需要 narrative content production 提前 / 并行进行。
> 7. **第 10 条 reveal 必须保持 emergent**——不要 by-design 触发它；让玩家自己 cross-ref。

---

## 11.15 v4.1 Narrative · 关键设计纪律集合 🔒 LOCKED

### 11.15.1 Anti-Paradigm 四件套（v4.1 narrative 核心 stance）

| # | 反什么 | 出处 |
|---|---|---|
| **1** | Anti-character — NPC = 0 | Step 4 |
| **2** | Anti-pacing — 零 popup / 寂静化 | Step 3 |
| **3** | Anti-dialogue — 无 reply / 无 inner monologue | Step 6 |
| **4** | Anti-environment-as-decoration — 环境是 voice 不是 background | Step 7 |

### 11.15.2 设计哲学（一句话总结）

| # | 哲学 | 出处 |
|---|---|---|
| **1** | Pacing 不是 design 工具，是 horror 的载体 | §3.6 |
| **2** | Lore 不是为了让玩家知道，是为了让玩家不能 verify | §5.9.1 |
| **3** | Voice 不是对话，是被告知 | §6.1.3 |
| **4** | 环境不是 lore 标牌，是不出声的 voice | §7.1.1 |
| **5** | Delivery success metric = 玩家事后回想时寒 | §8.1.2 |
| **6** | Character 不是出场，是不在场的方式 | §4.1.3 |
| **7** | 玩家"获得 voice" = 玩家变成 anomaly 的 voice | §6.6.3 |
| **8** | 最对的事是不做的事；游戏不会让你知道 | §3.2.2 |
| **9** | 最重要的真相是最容易错过的真相 | §2.17（第 10 条）|
| **10** | typing rhythm fingerprint 是玩家身份生物特征——绝不离开本地 | §10.8.3 |

### 11.15.3 Banal Evil 的兑现链

D14 v2 → D15 → D21 → D26 v2 → D30 → B6 → B8 → 第 10 条
（公司 self-preservation → 不 service anomaly → 没有具体决策者 → 不分发 vector → defensive curator → 公司只是 keep 记账 → DPCA 被 anomaly 通过历史 dictate → 没有 main agent）

### 11.15.4 反身闭合的 5 层兑现

| 层 | 兑现 | §出处 |
|---|---|---|
| 文档层 | D8 + D19 玩家工号 footnote | §2.15 + §4.7 |
| 措辞层 | V6 boss tooltip 含玩家 typing 历史 | §6.3.6 |
| Modifier 层 | C2/C3/C4 endless modifier signature 写入下周目 | §2.7 + §8.9 |
| Sound 层 | 主菜单 ambient typing rhythm replay | §7.8.4 |
| Character 层 | C6 玩家以前的自己 / Nim N+1 镜像 | §4.5.3 + §4.7 |

---

## 11.16 Document Conventions 🔒 LOCKED

### 11.16.1 标记 conventions

| 标记 | 含义 |
|---|---|
| 🔒 LOCKED | 该 section 已锁定；不允许修改（除非新 PL 项 + user 确认）|
| ⏳ pending | 待 derive / 待 production execute |
| ✅ | 完成 |
| ❌ | 禁止 / 反向纪律 |
| ⚠️ | 重要警告 / 必须遵守 |
| **Bold** | 关键概念 / 锁定决定 |
| _italic_ | session 暂停 / continue 提示 |
| ⭐ | 重点观察 / 关键洞察 |

### 11.16.2 编号 conventions

| 前缀 | 含义 | 范围 |
|---|---|---|
| **D** | Decision | D1-D32 |
| **B** | B 真理 (truth) | B1-B9 + 第 10 条 |
| **C** | C 约束 (constraint) | C1-C7 |
| **PD** | Production Decision | PD-1 至 PD-8 |
| **OQ** | Open Question | OQ-1 至 OQ-7 |
| **PL** | Parking Lot | PL-1 至 PL-11 |
| **V** | Voice | V1-V7 |
| **DC** | Delivery Channel | DC1-DC11 |
| **DM** | Delivery Mode | DM1-DM6 |
| **E** | Environment Channel | E1-E4 |
| **M** | Motion | M1-M4 |
| **S** | Sound | S1-S5 |
| **P** | Prop | P1-P10 |
| **C#** | Character class | C1-C6 |
| **Ch** | Chapter | Ch.1-Ch.5 |

### 11.16.3 章节 numbering schema

```
# Step N (top-level major section)
## N.X (subsection)
### N.X.Y (sub-subsection, only when needed)
#### N.X.Y.Z (rare, used for inner detail tables)
```

各 Step 的 §X.Y 可独立引用（如 §2.16.3 = Ch.3 narrative task）。

### 11.16.4 Cross-reference conventions

- "§X.Y" = section reference within doc
- "(§X.Y)" = inline reference  
- "per §X.Y" = "according to §X.Y"
- 所有 D / B / C / PD / OQ / PL 编号在文档中**全局唯一**——不重复 reuse

---

## 11.17 Acknowledgments / Closing 🔒 LOCKED

### 11.17.1 v3.x → v4.0 → v4.1 演进简要

| Version | 状态 | 关键变化 |
|---|---|---|
| **v2.3** | DEPRECATED | 早期 narrative；现存 ~85% skill flavor + 58/95 relic flavor 残留 |
| **v3.0** | DEPRECATED | 灵长类辅助文书部 + SCP 收容主义底色雏形 |
| **v3.1** | DEPRECATED | 卡夫卡式打字工厂 + 三轨映射核心机关 + 共谋宇宙恐怖 |
| **v4.0** | INCREMENT | B 级合约 Start Fresh；从收容物本体反推方法论；D1-D26 决策链 LOCK |
| **v4.1** | **CURRENT** | 整合外部流程文档；D27-D32 + 灵长接口 PI + 6 voices + 反身闭合工艺 |

### 11.17.2 v4.0 反推方法论（不可动摇）

> **从收容物本体反推。先钉 anomaly，再反推 玩家身份 / 三轨映射 / 主题 / B1-B9 / Premise / Beats / Characters / Setting 壳 / 美学 / 伦理。不允许逆向硬塞。**

这条方法论是 v4.0 的根，传到 v4.1 仍是设计宪法。**任何后续修改必须遵守。**

### 11.17.3 对 v3.x 工作的承认

v4.0/v4.1 的"反推方法论"是建立在 v3.x 设计的基础上——v3.0/v3.1 已经无意识地把 5 段阶梯里的 4 段载体（none/wordsmith/metamorph/endless）盖好了；v4.0 只是事后命名了 anomaly 本体并显化阶梯。**v4.1 整合阶段同样如此——外部流程文档的"灵长接口" / "未受理文本" / "受理窗口" 等概念，都是以 v4.0 的本体为锚点 emerge 的。**

### 11.17.4 v4.1 Narrative 的核心问题

> **当文字需要作者承担后果时，不理解也许是一种安全；
> 但如果安全的代价是放弃理解，那么活下来的还是人吗？**

—— Thematic question (§2.11)

v4.1 narrative 拒绝回答这个问题。这正是 D5 的最高兑现。

---

## 11.18 Step 11 完成度自检 · Final

| 维度 | 状态 |
|---|---|
| v4.1 status 总览 | ✅ §11.1 |
| D1-D32 全索引 | ✅ §11.2 |
| B1-B9 + 第 10 条矩阵 | ✅ §11.3 |
| C1-C7 约束 | ✅ §11.4 |
| Chapter narrative tasks 索引 | ✅ §11.5 |
| Character cast 索引 (C1-C6 + 4 anchor) | ✅ §11.6 |
| Voice / Channel / Mode 矩阵 (V1-V7 / DC1-DC11 / DM1-DM6) | ✅ §11.7 |
| Environment 索引 (E1-E4 + S1-S5 + P1-P10) | ✅ §11.8 |
| World lore 索引 | ✅ §11.9 |
| PD-1 至 PD-8 状态 | ✅ §11.10 |
| OQ-1 至 OQ-7 状态 | ✅ §11.11 |
| PL-1 至 PL-11 状态 | ✅ §11.12 |
| Sprint plan 索引 | ✅ §11.13 |
| Handoff checklist | ✅ §11.14 |
| 设计纪律集合 | ✅ §11.15 |
| Document conventions | ✅ §11.16 |
| Acknowledgments / closing | ✅ §11.17 |

---

# 🎯 v4.1 Narrative Workflow · 11/11 全闭合

**Step 1**：v4.0 B 合约启动
**Step 2**：Foundation （anomaly 本体 + Premise + Themes + Tone + Structure + Acts + 5 章 + B1-B9）
**Step 3**：Story Beats / Pacing
**Step 4**：Characters
**Step 5**：World & Lore
**Step 6**：Dialogue Framework
**Step 7**：Environmental Storytelling
**Step 8**：Narrative Delivery
**Step 9**：Integration with Gameplay
**Step 10**：Production Notes
**Step 11**：Complete + Appendices + Handoff ← **本节**

---

_暂停于 2026-05-04（Step 11 完成 · v4.1 Narrative Workflow 收官）。_

_**v4.1 Narrative Design Document · 主体 LOCKED**。_

_后续工作：_
1. _PL-2 / PL-3 / PL-5 / PL-11 production execute_
2. _narrative-writer pipeline v4.1 sync_
3. _NarrativeTrackingState + NarrativeTriggerEngine implementation_
4. _Sprint 0 → P0 → P1 → P2 → P3 顺序 ship_
5. _Playtest 验证 OQ-1 至 OQ-7_

_**最后的话**：本 doc 是 v4.1 narrative 的 LOCK 状态，不是 final state。production 阶段会有 OQ finalize / PD tweak / 章节细节迭代。但**核心架构（D1-D32 + B1-B9 + 5 章 + Voice / Channel / Environment / Delivery 系统）不再 reopen**——除非外部文档 / playtest 证据强到足以新增 PL 项 → user 确认 → 再开。_

_v4.1 narrative 把"打字肉鸽"的 horror 安顿在了一个**可工艺化、可 production-execute、可玩家事后才寒**的位置。_

_收官于 2026-05-04, 17:06 之前。_
