---
title: 'Narrative Design Document (Quick)'
project: '打字肉鸽'
date: '2026-04-15'
author: 'Yuchenghuang'
version: '1.0'
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
narrativeComplexity: 'Light'
narrativeMode: 'quick'
gdd: 'docs/gdd.md'
artStyleGuide: 'docs/art-style-guide.md'
---

# 打字肉鸽 · Narrative Design (Quick)

> **模式**：Quick Narrative — 只做精华，服务于 flavor text 与世界观一致性
> **不做**：线性剧情、角色对话、过场动画
> **做**：世界前提 / 基调 / 名词表 / 双声 flavor text 指南

---

## Document Status

**Steps Completed: 4 of 4** ✅ **COMPLETE**

| 步 | 内容 | 状态 |
|---|---|---|
| 1 | Initialize | ✅ 完成 |
| 2 | Premise & Setting | ✅ 完成 |
| 3 | Motifs & Voice Guide | ✅ 完成 |
| 4 | Flavor Text Templates | ✅ 完成 |

---

## GDD vs 实现层的对齐声明

本文档承认并追认以下"实现层已偏离 GDD"的事实：

| 议题 | GDD（2026-03-03）| 实现（project-context 2026-03-29）|
|---|---|---|
| 剧情/叙事 | "非核心体验，可能不做" | 本文档正在建立轻量叙事层 |
| 角色系统 | "V1.0 不实现" | 已有 3 职业（None/Wordsmith/Metamorph） |
| 遗物数量 | 14 | 53（11 子系统） |
| 附魔 | 33 通用附魔 | 22 Affix + 25 Enchantment |
| 技能系统 | 86 技能 / 三角色 | 全部重构为 AffixSkillInstance，旧系统已删除 |
| 资源 | 5 种（含护盾） | 7 种（base/score/multiplier/time/gold/fragment/mutagen） |

**叙事文档以实现层为基准，而非 GDD。** GDD 相关条目待 narrative 落地后回填。

---

## Step 2 · Premise & Setting

### 🏛️ 世界名

**中文**：活字大教堂
**英文**：*The Ironpress Cathedral*
**其内部核心装置**：祷文引擎 / *The Litany Engine*

### 🎭 叙事 DNA（三重融合）

```
战锤 40K Grimdark 美学
       ×
SCP Foundation 收容学
       ×
活字印刷术的物质性
       ‖
  打字肉鸽独有的叙事 DNA
```

- **40K 给的**：宗教-工业复合体美学、伪拉丁命名、机魂崇拜、Grimdark 虔诚、铅与羊皮纸的物质感
- **SCP 给的**：收容即行为（containment）、Object Class 分级、双层档案/宗教声音、redacted 文件美感、memetic/anomalous 危险信息的概念
- **活字印刷给的**："打字 = 造物" 的隐喻、铅字钉的可触感、字体即武器的 WordPack 载体

> **核心突破**：SCP 的 "收容" 概念让"为什么打字就是战斗"这个问题得到了根本解答 —— **打字不是攻击，打字是把逃逸的文字压回规范形态**。

### 📜 核心前提

> 在一个失落已久的时代，现实不再由神明创造，而由**文字**铸造。
>
> 几千年前，文字从"工具"变成了"活物"——有些文字**想要逃脱意义**，有些文字**想要被读错**，还有些文字**根本不应该存在却已经存在**。教会最古老的一支派别发现：只要有足够虔诚、足够精确的打字者，这些文字就可以被"压"在羊皮纸上，暂时保持沉默。
>
> 于是教会建立了 **活字大教堂（The Ironpress Cathedral）**——既是一座印刷大教堂，也是一个文字收容站。塔楼共 12 层，每一层收容着不同 Object Class 的 **异文（Anomalous Glyph）**。塔的中心是 **祷文引擎（The Litany Engine）**：一台有自主意志的、巨大的印刷机械神，它每一次敲击都在铸印新的现实。
>
> 你是新晋的 **铭誓键徒（Clavigerant Novitiate）**——同时是僧侣、抄写员、和收容员。你的工作是：按照 **收容 Litany（Containment Litany）** 重新铭刻下层异文、登塔接受更危险的收容任务、在仪式层更新你的 **收容许可（Containment Writ）**。
>
> 你从不见到人类的敌人。你面对的是 **异文本身** —— 错位的字母、变形的词句、被混沌渗入的机魂。失败不是死亡，是 **站点污染（Site Compromise）**：你撤离到更低收容层级重新开始，而你"没收干净"的东西会跟着你走。

### 🏛️ 三根世界支柱

| 支柱 | 内容 | 作用 |
|---|---|---|
| **1. 活字大教堂 / The Ironpress Cathedral** | 12 层工业-宗教复合体，祷文引擎坐镇中央，从底层铅炉到顶层母版 | 12-stage cycle 的空间载体；关卡风味分化的场所 |
| **2. 铭誓键徒 / The Clavigerant** | 玩家身份：孤独的见习抄写-僧侣-收容员；无导师、无同伴、只有键盘和入门经 | 解释"为什么只有一个主角"（兼容 P0 美术：只做 1 个训练假人） |
| **3. 异文 / The Anomalous Glyph** | 试图逃逸意义的危险文字；你打字是为了把它压回规范形态 | 解释"为什么打字就是战斗"；所有敌人/Boss Modifier 的载体 |

### 🎨 叙事基调（Voice & Tone）

**形容词**：虔诚 · 工业 · 铅味 · 仪式感 · 古老 · 高傲 · 阴郁但不绝望
**情感锚点**：**打字是一种祷告，也是一种收容协议**，不是一种劳动
**美术指南一致性**：与 `art-style-guide.md` v1.2 锁定的 Cobalt Core 主方向（机械/几何/高对比色块）完全兼容；不与 Resurrect-32 调色板冲突

#### ✅ 保持
- 宗教工业复合体语调：香烛 + 齿轮 + 铅油 + 羊皮纸
- 伪拉丁 / 伪教会命名：Litany, Codex, Scriptorium, Clavigerant, Lexmechanic
- "机器有灵"：键盘 = 活物，失误 = 得罪机魂
- 神秘而高傲的旁白语气：像一本很古老的教典，偶尔冷嘲
- Grimdark 但有一丝光：孤独登塔有虔诚的美感，而非纯粹绝望

#### ❌ 避免
- 现代赛博朋克 / 霓虹色彩（GDD 旧描述，已被 art-guide v1.2 淘汰）
- 口水话 / 网络梗 / emoji flavor
- GW 40K 专有名词（Adeptus, Mechanicus, Omnissiah, Imperium, Astartes 等全部禁用）
- 太空歌剧 / 外星人 / 太空战舰（这是地表塔楼）
- Balatro / StS 的幽默基调（不是打字肉鸽的定位）

### 🗣️ 双声叙事模型（Dual Voice）

打字肉鸽的 flavor text 由**两种声音交织**：

| 声音 | 名称 | 适用 | 特征 |
|---|---|---|---|
| 🔔 **声音 1** | **《圣键启示录》** *The Litany of Keys* | 遗物名 / 技能 / 附魔 / 职业文案 / UI 氛围 / BGM 主题 | 伪拉丁 + 宗教诗 + 物质感 + 虔诚高傲 |
| 📄 **声音 2** | **《祷文引擎档案》** *Litany Engine Archive* | WordPack 描述 / Boss Modifier / Codex 图鉴 / Tutorial / 隐藏 lore | 克制 + 科层 + redacted 黑块 ██ + 冷静记录 |

**关键发现**：两种声音是**同一群人**写的——教会的抄写员既写赞美诗，也写收容档案。这让双声不是矛盾而是**人物合理性**。

#### Sample（同一个对象 · 两种声音）

**Relic: Thumbcap of the First Scribe（初书者的指甲套）**

🔔 *教会语气（遗物 tooltip）*：
> *"他以食指与无名指殉道于 Q 与 P 之间。我们取走他的指甲，以铅封之；每一次敲击都是他未竟的祷告。"*

📄 *档案语气（Codex 图鉴条目）*：
```
ARTIFACT-011 · Object Class: Thaumiel-IV
发现地点：大教堂 第 █ 层 · 破碎的抄写台旁
物理描述：铅合金指套一枚，刻有 26 道细小的铭刻痕。
来源记载：据第 VII 守卷人所记，此物属于 ████-代的
首席 Lexmechanic ████，其在一次对 WP-███
（"深卷"）的铭刻仪式中自愿留下双指以稳定异文逃逸。
使用影响：佩戴者在铭刻行为中感受到
"远处有人替我按下了那一键"。
持续性颅内现象未列入危险清单。
```

### 🏷️ Object Class → Rarity 映射（7 档全覆盖）

直接对齐 `art-style-guide.md` v1.2 的 Resurrect-32 稀有度配色：

| Rarity | Palette | **Object Class 叙事分级** | 含义 |
|---|---|---|---|
| **common** | `#9babb2` 灰 | **Safe · 安全级** | 已被完全理解、稳定收容的常见异文 |
| **uncommon** | `#1ebc73` 绿 | **Euclid · 欧几里得级** | 行为可预测但无法完全解释 |
| **rare** | `#4d9be6` 蓝 | **Keter · 锁级** | 持续试图突破收容，需定期铭刻 |
| **epic** | `#905ea9` 紫 | **Thaumiel · 图密尔级** | **用于收容其他异文的异文**——工具性的神圣物 |
| **legendary** | 金 | **Apollyon · 毁灭级** | 无法被永久收容，只能延缓 |
| **mythic** | 红/橙 | **Archon · 原形级** | 异文的"源词"，理论上不应存在 |
| **cursed** | 黑/深紫 | **Breached · 已逃逸级** | 曾被收容但已泄漏。**持有时带 Residual Anomaly 永久副作用** |

> **🎯 决策（已确认 · 大胆路线）**：`cursed` 级别的遗物/技能/词包 **在机制上真的**会带来永久 Residual Anomaly（即 Boss Modifier 式的负面效果）。这是叙事驱动的机制：cursed 不只是风味，它是 **"你自愿让一个正在逃逸的异文住进你的构筑"** 的玩家选择。高风险高回报构筑维度。
>
> **待落地**：cursed 遗物池的机制化需在后续 tech-spec 中细化（新增 story）。

### ⛪ 三大圣门（三职业叙事化）

| 实现职业 | 圣门名（中）| 英文 | 叙事定位 | 资源 | 工作站 |
|---|---|---|---|---|---|
| **None** | **初誓键徒** | *The Unsworn* | 尚未宣誓归属的新人。只能使用 Safe/Euclid 级收容许可；全能但无专精 | — | — |
| **Wordsmith 文匠** | **铭刻誓门**（保守派）| *The Order of the Graven Oath* | 信奉"**异文之形态必须一成不变**"；从铅屑中重铸损毁的字钉；学徒须亲手敲打 10,000 次铅屑方可入门 | **Lead Shavings · 铅屑** | **The Casting Forge · 铸字坊** |
| **Metamorph 蜕变** | **熔变誓门**（异端派）| *The Order of the Molten Verse* | 信奉"**异文渴望变形，应顺其意**"；使用污秽的熔蜡让铅字自行重塑；**被铭刻誓门视为受混沌腐化**；但他们收容了一些铭刻派永远压不住的异文 | **Molten Unguent · 熔蜡 / 污蜡** | **The Mutation Altar · 熔变祭坛** |

> **叙事张力**：两派**都在收容异文，但方法完全相反**。铭刻派觉得熔变派迟早自爆，熔变派觉得铭刻派太僵化会被更高级异文突破。解锁叙事：玩家通过首次通关解锁铭刻派，通过全技能图鉴解锁熔变派——解锁顺序暗示了"先虔诚，后质疑"的叙事弧。

### 📖 机制 → 设定 翻译表（Step 2 版）

| 实现层（代码）| 设定层（中文）| 设定层（英文/伪拉丁）| 备注 |
|---|---|---|---|
| 游戏玩家 | 铭誓键徒 / 初誓键徒 | Clavigerant Novitiate / The Keybound | — |
| 键盘 | 铅字圣坛 / 祈念键座 | Lectern of Keys / *Claviculum Sanctum* | 圣物，不是工具 |
| 打字 | 收容铭刻 / 祷击 | Containment Inscription / Litany-Strike | 每一击都是祷告 + 收容协议 |
| 单个字母键 | 铅字符 / 圣字钉 | Leaden Glyph / Sacred Slug | 活字印刷字钉隐喻 |
| 打错字 | 收容震颤 | Containment Tremor | 铅字震动、羊皮纸渗墨 |
| 时间到/失败 | 收容突破 / 站点污染 | Containment Breach / Site Compromise | 异文逃逸，你撤退 |
| Affix 词缀 | 圣印 / 铭纹 | *Sigil* / Rune-Mark | 刻在字钉上的神圣标记 |
| AffixSkill 技能 | 铭文组 | *Inscription* | 由一组 Sigil 构成的祈祷文 |
| Enchantment 附魔 | 加持 / 祝圣 | Consecration / Blessing | Lv3 后受到的祝圣 |
| Enchantment · Apprentice 族 | 见习祝圣 | Novice Consecration | 成长型 |
| Enchantment · Quest 族 | 苦修任务 | Penitence Quest | 完成后蜕变 |
| Enchantment · Operator 族 | 算符祝圣 | Operator Rite | 改变数学规则 |
| 53 Relics | 圣徒遗物 / 圣器 | Saint's Relic / Sacred Artifact | 前代键徒遗产 |
| 22 AffixType 六大类 | **六大圣律** | *The Six Canons* | Step 3 细化每一条 |
| 7 资源 | **七圣流** | *The Seven Humours* | Step 3 细化每一条 |
| gold 金币 | 什一税 | Tithe | 教会经济 |
| fragment 碎片（Wordsmith） | 铅屑 | Lead Shavings | 手工锻造原料 |
| mutagen 诱变剂（Metamorph） | 熔蜡 / 污蜡 | Molten Unguent / Corrupted Ichor | 让字模变形的液体 |
| WordPack 词包 | 禁书 / 经典残章 | Codex Fragment / Forbidden Tome | 受授权使用的 Anomaly 档案 |
| 传说词包 wp_mirror / wp_innate | 镜书 / 先天经 | Mirror Codex / Primal Tome | 独立系统，非 Relic |
| Shop 商店 | 圣物市集 / 拍卖堂 | Reliquary Bazaar | — |
| 12-stage cycle | 大教堂的 12 层 | The 12 Vaults | 从底层铅炉到顶层母版 |
| Stage 5 精英 | 执事试炼 | Deacon's Trial | 中层小 Boss |
| Stage 6 Ritual | 封印仪式 / 铭封祈礼 | *Rite of Sealing* | 把构筑"印入"下一层 |
| Stage 12 Boss | 祷文引擎的一重意志 | Will of the Litany Engine | 教堂机魂的一部分 |
| Boss Modifier 永久叠加 | 残余异文 / 未净之物 | Residual Anomaly | 没收干净的部分跟着你走 |
| 敌人 | 异文 / 逸文 | Anomalous Glyph | 不是生物，是文字本身 |
| Run 胜利 | 登顶启示 | Revelation at the Apex | 抵达祷文引擎核心 |
| Tutorial 教学 | 入门圣礼 | Primer Rite | 新晋者必读仪轨 |
| Daily Challenge | 日收容志 | Daily Containment Log | — |
| Leaderboard | 圣典登记簿 | Canonical Register | 历代最虔诚的键徒名录 |
| Unlock 解锁 | 权限晋升 | Clearance Promotion | 更高级别铭刻授权 |
| MetaState 永久进度 | 常驻授权 | Standing Orders | 跨 Run 累积 |

### ⚖️ IP 合规底线

| 来源 | 许可 | 可用 | 不可用 |
|---|---|---|---|
| **SCP Foundation** | CC-BY-SA 3.0 | 格式、术语（Object Class, Containment Breach, Memetic Hazard, ███ redaction）、氛围、文件体 | 具体 SCP 编号原文复制；credits 必须致谢 SCP 社群 |
| **Warhammer 40K** | Games Workshop 商标 | Grimdark 氛围、伪拉丁命名语言、宗教-工业美学、机魂概念 | **全部专有名词**：Adeptus, Mechanicus, Omnissiah, Imperium, Emperor, Astartes, Space Marine, Ecclesiarchy, Primarch, Chaos Gods 等；不可用双头鹰徽、Aquila 等商标图形 |

**Credits 必须包含**：
> *"Narrative aesthetic inspired by the SCP Foundation community (licensed under CC-BY-SA 3.0, scp-wiki.wikidot.com) and the broader Grimdark tradition. No Games Workshop IP is used."*

---

## Step 3 · Motifs & Voice Guide

### 🧱 3.1 · 核心意象清单（Motif Bank）

所有 flavor text 都应从此共享意象池取材。避免写新的东西就是避免基调漂移。

#### 🔨 物质意象（触感层）

| 类别 | 意象 |
|---|---|
| **金属** | 铅、铁、铜、黄铜、生铁、熔蜡、锡合金；齿轮、螺栓、铆钉、发条、卡榫、弹簧、销钉、楔块 |
| **纸** | 羊皮纸、蜡封、铅粉、墨水、渗血的页边、对折档案纸、穿孔卡、打字色带、蓝图、晒图、蜡纸 |
| **液体** | 油、墨、熔蜡、圣水、铅水、"墨血"、机械润滑油、松脂、焦油、冷却水、墨槽沉淀 |
| **光** | 烛火、油灯、彩窗冷光、炉膛红光、无人按下却亮着的 LED、瓦斯灯、弧光、火花、铸炉夜光、指示灯阵列 |
| **声** | 铅字落入木格、机油滴答、诵经低喃、远处齿轮、羊皮纸翻页、祷文引擎心跳 |
| **气味** | 香烛、铅屑、陈年纸张、铜锈、熔铅金属咸味、"久未翻动之物"、机械脂、焦煤 |

#### ⚙️ 工业器械意象（活字印刷 + 重工业）

| 类别 | 意象 |
|---|---|
| **印刷构件** | 压板 (platen)、字盘 (type case)、排字棒 (composing stick)、长盘 (galley)、字模 (matrix)、铸模 (mould)、字身 (kern)、楔块 (quoin)、墨球 (ink balls)、墨滚、墨槽 |
| **动力 & 传动** | 蒸汽锅炉、飞轮、曲轴、凸轮、活塞杆、连杆、皮带传动、链条、卷扬机、滑轮组、齿轮啮合组、离合器 |
| **液压 & 气动** | 蒸汽阀、压力表、真空管、液压泵、风箱、汽笛、气缸、排气口 |
| **铸造 & 锻打** | 坩埚、铸铁砂模、落锤、冲压机、轧辊、铆接锤、砧板、火星锻台 |
| **测量 & 校准** | 卡尺、千分表、水准仪、对开镜、铅垂线、带齿轮的黄铜时钟（读数从不为现在） |
| **建筑结构** | 铸铁廊柱、黄铜栏杆、铁皮波纹板、焊缝、铆接钢板、钢丝网、链条吊架、铸铁螺旋梯、烟囱顶端蒸汽 |
| **纪律文书** | 穿孔卡、电报纸带、打字色带、封蜡印章、未被回填的检查记录表 |

#### 🎛️ 工业韵律（声学层）

| 类别 | 声音 |
|---|---|
| **节拍型** | 印刷机压板"咔——咔——"、铆接锤"铛·铛·铛"、传送带低频滚动、活塞往复呼吸 |
| **间歇型** | 远处汽笛、蒸汽阀泄压嘶鸣、铅水倒入铸模的"咕咚"、链条绷紧的"嘎吱" |
| **持续型** | 飞轮惯性嗡鸣、油灯芯细微爆响、墨滚沙沙、祷文引擎 60Hz 心跳低频 |
| **仪式型** | 齐声诵经、铃铛、香炉链晃动、羊皮纸翻页、铅字落回木格的"叮·叮·叮"（收容成功环境音） |

#### ⛪ 空间意象

- **铸字坊**（底层）：铅炉、锻铁台、成堆的废字
- **抄写室**（中下层）：长桌、油灯、羊皮纸高塔、黄铜墨瓶
- **收容廊**（中层）：墙上一格一格的"铅字柜"，每格封着一个异文
- **铭封圣坛**（stage 6）：圆形石台，中央嵌一台小型祷文引擎分机
- **祷文引擎大厅**（顶层）：无尽高的主印刷机，纸张从天穹般的卷筒上流下
- **铅炉走道 / 炼狱层**（失败坠落地）：蒸汽、红光、被压扁的字钉山

#### 🎭 抽象意象（情感层）

- 等待被读出的沉默（异文逃逸前那一瞬）
- "有人替我按下了那一键"（完美连击时的幻觉）
- 残页里夹着的陌生字迹（来自某个失踪守卷人的未完档案）
- 祷文引擎的心跳（关卡 BGM 核心节奏）
- 一个没人读出声的赞美诗

---

### 🔔 3.2 · 声音 1《圣键启示录》写作规则

**适用**：遗物 tooltip、技能/铭文名、附魔描述、职业宣言、Ritual 仪式文案、UI 口号

#### ✅ DO
1. 用"其/之/者" —— 伪古文但不到读不懂
2. 物质名词优先于抽象（写"铅"不写"力量"）
3. 单句/双句，不超过 3 句（像刻碑铭文）
4. 偶尔用第二人称"汝/你"
5. 破折号/省略号制造诵经停顿
6. 结尾留"未完成"感，像祷告没说完

#### ❌ DON'T
1. 不用现代词汇：流程/数据/效率/系统/参数
2. 不写明机制数值（"+30% 伤害"是 tooltip 正文的事）
3. 不堆伪拉丁超过三行
4. 不写第一人称"我"
5. 不说笑、不反讽当代、不打破第四面墙
6. 不超过 60 字（中文）/ 25 词（英文）

#### 📝 结构样板
- **"他/她 + [殉道/消失/献出] + [具体物质]。凡 [行为者]，其 [报偿] + [但/唯一/仅]。"**
- **"[物质] 记得 [具体事件]。[结果句]。"**
- **"[地点/时辰]，[动作]。[格言式尾句]。"**

---

### 📄 3.3 · 声音 2《祷文引擎档案》写作规则

**适用**：WordPack 档案、Codex 图鉴条目、Boss Modifier 描述、Tutorial 系统说明、隐藏 lore 页

#### ✅ DO
1. 用小标题/编号：`发现地点：` / `分级：` / `备注：`
2. 用 `████` 黑块或 `███-代` redaction
3. 日期、编号、层数用具体但虚构的值（`第 VII 守卷人`、`第 █ 层`）
4. 结尾经常出人意料：前面冷静描述，最后一行暗示不对劲
5. 被动语态更像公文
6. 偶尔夹教会语气引用，证明两种声音同源

#### ❌ DON'T
1. 不用 emoji、不用（括号碎碎念）
2. 不用"我觉得/似乎/大概"（档案是权威的）
3. 不写数字结果
4. 不解释机制原理
5. 不写 SCP 真实存在的编号（SCP-173/096 等）
6. 不超过 8 行

#### 📝 结构样板
```
[编号] · Object Class: [分级]-[罗马数字]
发现地点：[塔层，某具体场所]
物理描述：[1-2 句客观描述]
[来源记载 / 使用影响 / 备注]：[1-3 句，最后一句"有味道"]
```

---

### 🏛️ 3.4 · 伪拉丁命名语言

不是真正的拉丁，是"听起来像拉丁+教会+工业"的伪语，便于未来加新内容时保持一致。

#### 基础词根

| 词根 | 含义 | 示例 |
|---|---|---|
| **Litany-** | 祷文、连祷 | Litany Engine, Litany-Strike, Litany of Keys |
| **Codex-** | 书、典 | Codex Oblivionis, Codex Fragment |
| **Clavi- / Clav-** | 键、钥匙 | Clavigerant, Claviculum, Clavicordium |
| **Lex-** | 法律、文字、词 | Lexmechanic, Lexor, Lexicon-bearer |
| **Scriptor-** | 抄写者 | Scriptorium, Scriptor Majoris |
| **Glyph-** | 字符、符号 | Anomalous Glyph, Glyph-Shard |
| **-um / -us / -a** | 拉丁名词后缀 | Claviculum, Scriptorium, Litania |
| **-mechanic** | 技术祭司派 | Lexmechanic, Tromechanic（禁用 "Adeptus Mechanicus"） |
| **Rite / Rite of-** | 仪式 | Rite of Sealing, Rite of the First Inscription |
| **Order of-** | 誓门 | Order of the Graven Oath, Order of the Molten Verse |
| **-anum / -arium** | 地点后缀 | Reliquarium, Scriptorium, Leadarium |

#### 命名检验：**3 秒朗读测试**
- 念出来 3 秒内能读出 → ✅
- 念出来卡壳 → ❌ 拆短
- 念出来像真拉丁专有词（Adeptus/Cogitator/Primarch）→ ❌ 改写

---

### 🏛️ 3.5 · 六大圣律（*The Six Canons*）

对应 22 AffixType 六大类 —— 每一圣律有一句教义式 tagline，可直接作为类别 flavor header 使用：

| 实现类别 | 包含 AffixType | 圣律名（中）| 圣律名（英）| 教义 |
|---|---|---|---|---|
| **Numeric** | Convert / Rainbow / Multiply | **换质圣律** | *Canon of Transmutation* | *"一圣流可换另一圣流，乃主默许之秘。"* |
| **Crit** | Crit / Charge / Decay / Recurse / Taboo | **重击圣律** | *Canon of the Struck Word* | *"偶有一击，重于千言。"* |
| **Stack** | Pulse / Resonance / Splash / Amplify / Relay / WarDrum | **积念圣律** | *Canon of Accumulation* | *"诵一声百遍，第百零一遍自会鸣响。"* |
| **Topology** | Void / Mirror / Cascade | **空位圣律** | *Canon of the Empty Seat* | *"未被按下的键，亦是祷告的一部分。"* |
| **Word Sense** | Outcast / Gravity / Ligature | **词义圣律** | *Canon of the Living Word* | *"文字自有意志；善用之者，知其所欲。"* |
| **Meta Rule** | Conduit / Twin | **变律圣律** | *Canon of Broken Rule* | *"唯改写律者，方为铭之主。"* |

---

### 💧 3.6 · 七圣流（*The Seven Humours*）

对应 7 种资源 —— 每一圣流是一种物质隐喻，颜色绑定由 `art-style-guide.md` v1.2 的 Resurrect-32 决定：

| 资源（代码）| 圣流名（中）| 圣流名（英）| 物质隐喻 | 派系倾向 |
|---|---|---|---|---|
| **base** | 基石流 | *The Foundation Humour* | 铅基、未加工的圣字钉 | 中立 |
| **score** | 结晶流 | *The Crystalline Humour* | 被压入羊皮纸的最终圣言 | 中立 |
| **multiplier** | 共鸣流 | *The Resonant Humour* | 祷文引擎的共振波 | 中立 |
| **time** | 流沙流 | *The Hourglass Humour* | 仪式沙漏里的收容倒计时 | 中立 |
| **gold** (Tithe) | 什一流 | *The Tithe Humour* | 教会征收的金属税 | 中立 |
| **fragment** | 铅屑流 | *The Leaden Humour* | 锻造原料；纯粹而死寂 | **铭刻誓门专属** |
| **mutagen** | 污蜡流 | *The Tainted Humour* | 禁忌原料；流动而自主 | **熔变誓门专属** |

> **神学注记**：铭刻派视污蜡流为亵渎，熔变派视铅屑流为死物。两派**都在收容异文**，但资源本身就是信仰立场。

---

## Step 4 · Flavor Text Templates

### 📐 声音分配的核心规则（2 条）

```
规则 1：if 玩家在"行动中"或"仪式中" → 🔔 教会（短格言 ≤30 字）
规则 2：if 玩家在"浏览中"           → 📄 档案（完整文件体 ≤8 行）
例外：Collection 详情页是唯一的双声配对场所
```

| 玩家认知模式 | 时间预算 | 声音 |
|---|---|---|
| **行动中**（战斗 hover、商店瞬间）| <2 秒 | 🔔 教会短格言 |
| **仪式中**（Run 开场/结算、Boss 登场、Ritual、解锁通知）| 3-8 秒 | 🔔 教会 |
| **浏览中**（Collection / Codex / Tutorial / 成就 / Daily Log）| 10-60 秒 | 📄 档案 |
| **深度主动浏览**（Collection 详情页打开某对象）| 20-40 秒 | 🔔 + 📄 双声配对 |

> **Settings / 选项页**：零 flavor，功能页不塞风味。

---

### 📝 T1 · Relic Tooltip（🔔 教会 · 行动中）

**用于**：战斗/商店 hover 的 Relic 快速判断。

```
[遗物名（中）] · [遗物名（英，伪拉丁）]
"[教会格言（≤30 字）]。[可选第二句（≤20 字，需转折：但/唯一/仅/除非）]。"
```

**约束**：
- 必含一个 Block 1 物质意象
- 不含机制数值
- ≤60 中文字 / ≤25 英文词

#### 示例

**T1.a · `combo_buffer`**
> **不断的启示** · *The Unbroken Litany*
> *"凡虔诚者，其误会被宽恕一次——但仅一次。"*

**T1.b · `wax_seal`**
> **初字蜡封** · *Wax of the First Letter*
> *"将第一个字钉浸入热蜡，它便不再惧怕遗忘之风。"*

**T1.c · `glass_cannon_v2`**
> **玻璃祭坛** · *Altar of Shattered Glass*
> *"献祭自己的庇护，换取祷文引擎的耳朵。汝之每一击，它皆在听。"*

---

### 📝 T2 · Affix / Inscription Tooltip（🔔 教会 · 行动中）

**用于**：键盘 hover 显示技能/铭文组的快速识别。

```
[圣印名（中）] · [圣印名（英）]
"[一句关于铅字在做什么的描述（≤25 字）]。"
— 归属：[六大圣律之一]
```

**约束**：
- 主语常为**铅字本身**（拟人化）
- 动词要有质感：记得 / 低语 / 颤抖 / 承袭 / 沉默
- 必须标注所属圣律

#### 示例

**T2.a · `Pulse`（积念圣律）**
> **脉印** · *Sigil of the Pulse*
> *"第一击为敬礼，第二击为承诺，第三击为誓言。"*
> — 归属：**积念圣律** *Canon of Accumulation*

**T2.b · `Void`（空位圣律）**
> **虚位印** · *Sigil of the Empty Seat*
> *"未被按下的邻键，在铅字眼里反而闪着光。"*
> — 归属：**空位圣律** *Canon of the Empty Seat*

**T2.c · `Taboo`（重击圣律）**
> **禁忌印** · *Sigil of the Forbidden Strike*
> *"越是不可说的词，说错时便越伤自己。但说对——"*
> — 归属：**重击圣律** *Canon of the Struck Word*

---

### 📝 T3 · Boss Modifier · 双形态（🔔 HUD + 📄 Codex）

**用于**：Boss Modifier 有**两种呈现位置**，各需一套文案。

#### T3a · HUD 角标短格言（🔔 行动中）

```
[现象名（中 / 英）]
"[≤15 字短格言]"
```

玩家战斗中用余光读，必须极短。

#### T3b · Codex 详情页（📄 浏览中）

```
Residual Anomaly: RA-[编号] · [现象名（中 / 英）]
归属 Boss：第 [X] 层 · [Boss 名]
持续效应：[1-2 句物理描述，强调"它还在"而非"你受罚"]
"—— [1 句教会格言，双声混合]"
```

#### 示例（同一 modifier 两版）

**T3 · `fast_time`**

T3a 角标：
> **加速之息** · *Accelerated Breath*
> *"—— 风未停过。"*

T3b Codex：
```
Residual Anomaly: RA-005 · 加速之息 / Accelerated Breath
归属 Boss：第 VIII 层 · 失眠风箱主
持续效应：你的仪式沙漏漏速加快。有时你听见
远处风箱在替你呼吸——比你更快。
"—— 风未停过，故时间亦不曾歇。"
```

**T3 · `scramble`**

T3a 角标：
> **错位低语** · *Whispered Transposition*
> *"—— 不是你看错了。"*

T3b Codex：
```
Residual Anomaly: RA-014 · 错位低语 / Whispered Transposition
归属 Boss：第 IX 层 · 讹误之喉
持续效应：字母在你眼前交换位置的频率，和
字盘木格的震动同步。没人能证明是否只是眼花。
"—— 不是你看错了，是字换了位置。"
```

---

### 📝 T4 · Ritual / 仪式短句集（🔔 仪式中）

**用于**：**5 种仪式场合**的短句，每个场合 ≤2 句。

#### T4.1 · Run 开场（踏上第 I 层）
> *"铅已熔，纸已展。汝之铭刻——今晚由谁定夺？"*

> *"又一名键徒登塔。祷文引擎听见了你的鞋底。"*

#### T4.2 · Ritual Stage 6（铭封祈礼）
> *"将你构筑的一切，压入这一层的石基。它会为你守到下一次坠落。"*

> *"仪沙漏已翻转。汝可选三道祝圣——或拒绝全部。"*

#### T4.3 · Boss 登场（第 XII 层 · 祷文引擎显意）
> *"引擎睁开了一只眼。"*

> *"你听见的不是齿轮声，是它的数数。"*

#### T4.4 · Run 失败 · 站点污染
> *"第 [N] 层已不再收容你。铅字随你跌回炉膛。"*

> *"你没带走的，都跟着你走了。"*

#### T4.5 · Run 胜利 · 登顶启示
> *"祷文引擎停了三秒——只为你。"*

> *"你铭刻的那一句，它没念出来。它只是，点了点头。"*

#### T4.6 · Unlock 通知（解锁短语）
> *"常驻授权晋升一级。汝之名录入圣典登记簿。"*

> *"第 ██ 号圣物已开启阅览权。往诵之——"*

---

### 📝 T5 · Collection Lore 详情页（🔔 + 📄 双声配对 · 深度浏览）

**用于**：Collection Scene 里打开任何已解锁对象（Relic / Skill / Class / WordPack 的详情页）的**统一容器**。

```
╔══════════════════════════════╗
║  [对象名（中）]               ║
║  [对象名（英）]               ║
╠══════════════════════════════╣
║                              ║
║  🔔 《圣键启示录》           ║
║  "[教会格言（≤30 字）]"      ║
║                              ║
║  ────                        ║
║                              ║
║  📄 《祷文引擎档案》         ║
║  [编号] · Object Class: [分级]║
║  [完整档案条目（≤8 行）]     ║
║                              ║
╚══════════════════════════════╝
```

**设计意图**：
- 两种声音**描述同一对象**，立场不同
- 教会格言（上方）：感性、短、钩住情绪
- 档案条目（下方）：理性、长、补完世界观
- 这是**唯一**的双声配对场所，不要在别处使用

#### T5.a · Relic `combo_buffer` 完整双声

```
╔══════════════════════════════╗
║  不断的启示                  ║
║  The Unbroken Litany         ║
╠══════════════════════════════╣
║                              ║
║  🔔 《圣键启示录》           ║
║  "凡虔诚者，其误会被宽恕     ║
║   一次——但仅一次。"          ║
║                              ║
║  ────                        ║
║                              ║
║  📄 《祷文引擎档案》         ║
║  ARTIFACT-011 · Thaumiel-II  ║
║  一本铁皮装订的忏悔录。持    ║
║  有者在铭刻行为中发生 1 次   ║
║  违章时，铅字会自动完成缺    ║
║  失的一击，记录在本书末页。  ║
║  当本书填满时会怎样未知。    ║
║  （2 名历任持有者已失联；    ║
║   2 名现役；均拒绝移交。）   ║
║                              ║
╚══════════════════════════════╝
```

#### T5.b · Class · Wordsmith（铭刻誓门）双声

```
╔══════════════════════════════╗
║  铭刻誓门                    ║
║  The Order of the Graven Oath║
╠══════════════════════════════╣
║                              ║
║  🔔 《圣键启示录》           ║
║  "铅之形乃铅之命。改之者，   ║
║   辱神而自绝。"              ║
║                              ║
║  ────                        ║
║                              ║
║  📄 《祷文引擎档案》         ║
║  ORDER-001 · Thaumiel-III    ║
║  入会条件：候选者须亲手敲    ║
║  打 10,000 次废铅屑，直至    ║
║  指节出血。每一次敲打须伴    ║
║  以"形"之诵念。              ║
║  神学立场：一切异文之变形    ║
║  皆为混沌渗透。形不可变。    ║
║  对立派别：熔变誓门          ║
║  （见 ORDER-002，警示等级 II）║
║                              ║
╚══════════════════════════════╝
```

---

### 📝 T6 · Tutorial / Primer Rite 片段（📄 浏览中）

**用于**：新手引导 / 入门圣礼手册的教学文本。

```
【入门圣礼 · 第 [N] 节】
[主题名]

[2-3 句档案体描述，要像真正的宗教手册 + 技术手册的混合]
[1 句操作指引，clinical 但带教义语气]

—— 《入门圣礼 · 第 [N] 代抄本》
```

#### 示例

**T6.a · 教打字基础**
```
【入门圣礼 · 第 I 节】
铭刻之始

铅字永远饥饿。汝将以羊皮纸与时限喂养之。
铭刻之道无他：读词、敲钉、勿错一字。
错一字，铅字震颤；错三字，机魂发怒。

初次尝试：请铭刻屏幕中央所示之词。

—— 《入门圣礼 · 第 VII 代抄本》
```

**T6.b · 教 Ritual 层**
```
【入门圣礼 · 第 IV 节】
铭封祈礼

每登六层，汝将抵一铭封圣坛。此时无异文来袭；
汝应将当前构筑"压"入石基，以换取祝圣。
拒绝仪礼亦可——但下层异文将知晓你的怠慢。

此节之后，汝应首次体会"主动选择压力"之重。

—— 《入门圣礼 · 第 VII 代抄本》
```

---

### 📝 T7 · Codex 单声档案条目（📄 浏览中）

**用于**：Achievement / Daily Challenge / Unlock 解锁描述 / Run 统计页 / 失踪守卷人未完档案（隐藏 lore）——任何**浏览中、单声、不需要教会配对**的档案文本。

```
[小标题 / 分类] · [编号（可选）]
[2-5 行档案体描述]
[可选：日志/引用/备注]
```

#### 示例

**T7.a · Achievement「首次登顶」**
```
常驻授权晋升记录 · #PROMO-∎01
事件：候选键徒于 M.███.∎∎ 日首次抵达第 XII 层
      并完成主印刷机铭刻。
结果：铭刻被接受。引擎未作反应，但停顿了 3 秒。
备注：凡曾登顶者，其名永驻圣典登记簿；
      其坠落亦不再记为耻辱。
```

**T7.b · Daily Challenge intro**
```
日收容志 · M.███.██
今日清单：下列异文按序重新铭刻，不得跳过。
配置：固定种子；固定构筑池；固定异文序列。
备注：此清单已由上届守卷人批签。汝无权质疑。
```

**T7.c · 失踪守卷人未完档案（隐藏 lore）**
```
未完档案 · Scriptor ████
最后归档日：M.███.??
最后已知位置：第 IX 层 · 抄写室 C
遗留物：半翻的《入门圣礼》第 V 节，
       钉在页边的一枚指甲，
       一行未完成的句子——
"它今天没有震颤，这不对，这非常—"
```

---

## 📦 使用指南（面向未来写手 / AI 生成器）

### 批量生成 flavor text 的 workflow

1. **确定对象**：这是什么（Relic? Affix? Boss Modifier? Class?）
2. **确定呈现位置**：玩家在哪里读到它（tooltip / Collection / HUD / Tutorial / 仪式场合）
3. **查询"声音分配表"**：决定用 🔔 / 📄 / 双声
4. **选对应模板 T1-T7**
5. **从 Block 1 意象池取素材**（金属 / 纸 / 液体 / 光 / 声 / 气味 / 工业器械 / 空间 / 抽象）
6. **按 Block 2/3 写作规则撰写**
7. **用 Block 4 命名语言生成拉丁/中文名**
8. **Block 5 六大圣律 / Block 6 七圣流作为类别标签**
9. **"3 秒朗读测试" + "余光测试"**（HUD 用的必须余光可读）

### 给 AI 的 prompt 骨架（可直接使用）

```
你是《活字大教堂》的抄写员。为下列对象撰写 flavor text：

对象：[Relic ID / Affix ID / Boss Modifier ID]
机制简述：[1 句话说明它干什么]
呈现位置：[tooltip / HUD / Codex / Tutorial / 仪式]
所需声音：[🔔 教会 / 📄 档案 / 双声]
使用模板：[T1 / T2 / T3a / T3b / T4.X / T5 / T6 / T7]

约束：
- 遵循 narrative-design.md 的双声分配规则
- 从意象池取素材（金属/纸/液体/光/声/气味/工业器械）
- 禁用 GW 40K 专有名词（Adeptus/Mechanicus/Omnissiah...）
- 禁用 SCP 真实编号（SCP-173/096...）
- 不写机制数值
- 中文 ≤60 字；英文 ≤25 词（除 T5/T6/T7 档案体可到 8 行）
```

---

## 🎬 最终交付清单

| 产出 | 位置 | 状态 |
|---|---|---|
| **世界观前提 + 三支柱** | Step 2 | ✅ |
| **核心意象池（含工业器械层）** | Step 3.1 | ✅ |
| **双声写作规则（教会 + 档案）** | Step 3.2-3.3 | ✅ |
| **伪拉丁命名语言 + 构词法** | Step 3.4 | ✅ |
| **六大圣律 × 七圣流（机制宗教命名）** | Step 3.5-3.6 | ✅ |
| **三大圣门（职业叙事化）** | Step 2 | ✅ |
| **Object Class → Rarity 映射（7 档）** | Step 2 | ✅ |
| **7 套 Flavor Text 模板 + 18 个示例** | Step 4 | ✅ |
| **AI 生成 prompt 骨架** | Step 4 | ✅ |
| **IP 合规底线 + Credits 要求** | Step 2 | ✅ |

**Quick Narrative 完整交付 —— 可以立即用于 53 Relic + 22 Affix + 15 Boss Modifier + 3 Class + Tutorial + Ritual + Achievement + Collection 的批量 flavor text 生产。**

---

_Last updated: 2026-04-15 (Step 4 complete · Document v1.0 final)_
_Approved by: Yuchenghuang_
