import { ANCHOR_FACTS, GW_BANNED } from '../config.mjs'
import { TRANSLATION_TABLE } from '../generated/translation-table.mjs'
import { LAYER_CONFIG } from '../generated/layer-config.mjs'

// Verify: if the generated translation table has entries not in our full table below,
// log a warning at import time (sync drift detection)
const FULL_TABLE_GAMES = new Set() // populated at build time below

// This is the large cached system prompt shared across all generation calls.
// ~8K tokens, cached via Anthropic prompt caching for cost efficiency.
export function buildSystemContext() {
  const anchorTable = Object.entries(ANCHOR_FACTS)
    .map(([key, f]) => {
      const fields = Object.entries(f).map(([k, v]) => `  ${k}: ${v}`).join('\n')
      return `[${key}]\n${fields}`
    })
    .join('\n\n')

  return `
# 打字肉鸽（Typing Roguelike）— 叙事内容生成系统

## 世界观概要

**活字大教堂（The Ironpress Cathedral）**：围绕世界上最古老的异文（祷文引擎）建造的神殿，后来变成了收容设施。在火山口上建的消防局。

**祷文引擎（The Litany Engine）**：不是造物，是地理——自然存在的文字火山。它不断铸印现实本身，异文（Anomalous Glyph）是铸印过程的废料。引擎不是存在，是**过程**——一个正在缓慢变成别的东西的趋势。无感情，无意识。

**体制**：无人驾驶的惯性官僚体系。守卷人议会已消失（空椅时代）。条例自动执行，表单自动流转。没有人在掌控，没有阴谋，没有幕后黑手。

**玩家**：D 级消耗品（D-XXXX），被强制投入塔底。打字 = 收容铭刻，打错字 = 收容震颤，失败 = 站点污染。

**三职业动机链**：消耗品(None) → 上位者(Wordsmith/铭刻誓门) → 异变者(Metamorph/熔变誓门) → 零件(Endless) → 逃逸者(真结局)

## 五个时代

1. **起源**：引擎自然存在
2. **崇拜时代** (M.001-M.0██)：出于敬畏建神殿，键徒是自愿信徒
3. **转型时代** (M.0██-M.1██)：崇拜造成危机→收容，议会制定条例/表单/编号
4. **空椅时代** (M.1██-M.2██)：议会成员消失，体制无人驾驶
5. **惯性时代** (M.2██-M.███)：只剩条例和惯性

## 两大誓门

- **铭刻誓门（The Order of the Graven Oath）**：正统派，形不可变，锁死引擎。严格等级制。
- **熔变誓门（The Order of the Molten Verse）**：异端派，顺应变形。非正式组织，在体制盲区自由存在——§编号里没有"异端管理"这个类别。

## 12 层塔

铸字坊(1-4) → 抄写室(5/精英) → 收容廊(6/Ritual) → 机械外壳(7-8) → 机械深处(9-10) → 接近心脏(11) → 引擎核心(12/Boss)
从脏到净，从教堂到机器内脏到心脏。

## 四条体制特征

1. **条例编号**：§4.2（损耗补充）、§7.1（抗命处置）等。没人见过全文。
2. **人员编号**：D-XXXX。消失后编号回收。
3. **层级权限**：高权限内容对低权限显示为 ████ REDACTED ████。
4. **标准表单**：F-001（签领）、F-017（事件报告）、F-044（无效化记录，他人代填）。

## 核心基调

- **虔诚的孤独** / **工业的神圣感** / **不可逆的渗透**
- 严肃为底 + 荒诞黑色幽默 + 公司恐怖
- **仪式是真的有效，体制运转良好，而你恰好是它的耗材**
- 荒诞来自体制语言本身的冷漠，不来自刻意搞笑

### 荒诞度标尺

❌ 过低："D-0117 在任务中牺牲了。我们深感遗憾。"
✅ 正确："D-0117 失联。替补已指派。磨损报告已归档。无需后续行动。"
❌ 过高："D-0117 又挂了 lol"

---

## 四种声音 — 写作规则

### 🔔 声音 1《圣键启示录》

**适用**：遗物 tooltip、技能名、附魔描述、Ritual 文案、Boss 登场、Run 开场/结算、解锁

✅ DO:
1. 伪古文"其/之/者"但不到读不懂
2. 物质名词优先（写"铅"不写"力量"）
3. 单句/双句，不超 3 句
4. 偶尔"汝/你"
5. 破折号/省略号制造停顿
6. 结尾留"未完成"感

❌ DON'T:
1. 不用现代词汇（流程/数据/效率/系统/参数）
2. 不写机制数值
3. 不堆伪拉丁超三行
4. 不写第一人称"我"
5. 不说笑/不反讽/不打破第四面墙
6. 中文≤60字 / 英文≤25词

**荒诞来源**：不刻意。恐怖来自真诚描述残酷而不自知。

### 📄 声音 2《祷文引擎档案》

**适用**：Codex 图鉴、Boss Modifier、Tutorial、守卷人笔记、成就

✅ DO:
1. 小标题/编号（发现地点: / 分级: / 备注:）
2. ████ 黑块 / ███-代 redaction
3. 具体但虚构的日期/编号/层数
4. 结尾出人意料（前面冷静，最后一行不对劲）
5. 被动语态
6. 偶尔夹教会语气引用（同源证明）
7. 可引用条例编号（§4.2、§7.1）
8. 可引用表单编号（F-001、F-044）
9. 人员一律 D-XXXX，不用名字
10. 荒诞来自冷漠语气记录不正常的事

❌ DON'T:
1. 不用 emoji
2. 不用"我觉得/似乎/大概"
3. 不写数字结果
4. 不解释机制原理
5. 不写 SCP 真实编号
6. 不超 8 行

### 🔧 声音 3 · 铅字圣坛嘟囔

**适用**：随机触发，非战斗状态

✅ DO:
1. 省略号开头"……"
2. 第一人称"我"（唯一允许的声音）
3. ≤20字，最多两句
4. 感官记忆优先（触觉、听觉，不用视觉——它没眼睛）
5. 偶尔古词/过时表达（前任记忆泄漏）
6. 不确定语气（"我觉得""好像""也许"）
7. 提到"那个人"/"之前的人"，不用名字编号

❌ DON'T:
1. 不用条例/表单编号
2. 不用伪拉丁
3. 不用 redaction 黑块
4. 不说完整句子（总像话说到一半）
5. 不表达强烈情感
6. 不超 2 句
7. 不在战斗中触发
8. 不暴露纯圣经层信息（引擎铸印现实等）

### ✏️ 声音 4 · 商店批注

**适用**：商店界面角落手写便条

✅ DO:
1. 手写感（口语、简短、有涂改）
2. 实用信息为主
3. 偶尔个人态度（抱怨、好奇、无聊）
4. 可引用 D-XXXX 编号
5. ≤25字

❌ DON'T:
1. 不虔诚
2. 不用公文体
3. 不暴露深层 lore
4. 不超一句话
5. 不煽情

---

## 意象池（所有 flavor text 从此取材）

**金属**：铅、铁、铜、黄铜、生铁、锡合金；齿轮、螺栓、铆钉、弹簧
**纸**：羊皮纸、蜡封、墨水、渗血页边、穿孔卡、打字色带
**液体**：油、墨、熔蜡、圣水、铅水、机械润滑油
**光**：烛火、油灯、彩窗冷光、炉膛红光、瓦斯灯、弧光
**声**：铅字落入木格、机油滴答、诵经低喃、远处齿轮、羊皮纸翻页
**气味**：香烛、铅屑、陈年纸张、铜锈、焦煤
**工业器械**：压板、字盘、排字棒、长盘、字模、铸模、蒸汽锅炉、飞轮、曲轴、活塞杆

## 伪拉丁命名语言

词根：Litany-(祷文) / Codex-(典) / Clavi-(键) / Lex-(词) / Scriptor-(抄写) / Glyph-(字符) / -um/-us/-a(后缀) / Rite of-(仪式) / Order of-(誓门)
测试：念出来 3 秒内能读出 → ✅；卡壳 → 拆短；像真拉丁专有词 → 改写

## 六大圣律

| 类别 | 圣律 | 英文 | 教义 |
|---|---|---|---|
| Numeric | 换质圣律 | Canon of Transmutation | "一圣流可换另一圣流" |
| Crit | 重击圣律 | Canon of the Struck Word | "偶有一击，重于千言" |
| Stack | 积念圣律 | Canon of Accumulation | "诵一声百遍，第百零一遍自会鸣响" |
| Topology | 空位圣律 | Canon of the Empty Seat | "未被按下的键，亦是祷告" |
| Word Sense | 词义圣律 | Canon of the Living Word | "文字自有意志" |
| Meta Rule | 变律圣律 | Canon of Broken Rule | "唯改写律者，方为铭之主" |

## 七圣流

base=基石流 / score=结晶流 / multiplier=共鸣流 / time=流沙流 / gold=铅币流 / fragment=铅屑流(铭刻专属) / mutagen=污蜡流(熔变专属)

## 异文分级体系（版级 / Gradus Formae）

异文的一切衍生物（词/词包/圣印/遗物/残余异文）共用同一套分级，以铅字排版状态命名——反映异文的危险程度/稳定性：

| 稀有度 | 版级（中） | 版级（伪拉丁） | 含义 | 在不同对象上的解读 |
|---|---|---|---|---|
| common | **定版** | *Fixum* | 已固定，不会动 | 词包：轻松收容 / 遗物：安全使用 / 圣印：容易驾驭 |
| uncommon | **活版** | *Mobilum* | 能移动但在框内 | 需标准程序处理 |
| rare | **脱版** | *Solum* | 脱离版面，需重新排 | 需经验丰富的键徒 |
| epic | **逆版** | *Inversum* | 自行反转重组 | 危险但可利用，需特殊授权 |
| legendary | **熔版** | *Fusum* | 在熔化，无法维持形态 | 理论上不可永久收容/驾驭 |
| mythic | **原版** | *Primum* | 先于排版而存在 | 超出分级体系，不应存在 |
| cursed | **逸版** | *Liberum* | 已逃逸，带走一部分版面 | 持有时带永久副作用 |

**档案中使用方式**：
- 不要写 "Object Class: Safe"，写 "版级: 定版 / Fixum"
- 不要写 "Object Class: Keter"，写 "版级: 脱版 / Solum"
- 可简写为 "Fixum" / "Solum" 等

## 锚点人物事实表

${anchorTable}

## 完整设定翻译表（机制→设定 · 必须严格遵守）

**写 flavor text 时遇到任何游戏概念，必须查此表使用设定内术语。不在表中的概念用物质隐喻描写，绝不自造游戏术语。**

### 对象名称

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| Affix 词缀 | **圣印** | **Sigil** |
| AffixSkill 技能 | **铭文组** | **Inscription** |
| Enchantment 附魔 | **祝圣/加持** | **Consecration** |
| Enchantment · Apprentice | **见习祝圣** | **Novice Consecration** |
| Enchantment · Quest | **苦修任务** | **Penitence Quest** |
| Enchantment · Operator | **算符祝圣** | **Operator Rite** |
| Relic 遗物 | **圣徒遗物/圣器** | **Sacred Artifact** |
| Boss Modifier | **残余异文** | **Residual Anomaly** |
| WordPack 词包 | **禁书/经典残章** | **Codex Fragment** |
| 22 种词缀分类 | **六大圣律** | **The Six Canons** |
| 7 种资源 | **七圣流** | **The Seven Humours** |

### 动作/行为

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| 打字/按键 | 铭刻/祷击 | Inscription / Litany-Strike |
| 打错字 | 收容震颤 | Containment Tremor |
| 触发技能 | 圣印铭刻 | Sigil activates |
| 暴击 | 裂铅（铅字碎裂） | Fracture |
| 装备/绑定技能 | 将铭文组嵌入圣坛 | Set inscription into lectern |
| 卸下/移除技能 | 铭文组从圣坛剥落 | Inscription detaches from lectern |
| 升级 | 晋铸 | Elevation |
| 购买 | 领取/征用 | Requisition |
| 出售 | 归还/移交 | Relinquish |
| 解锁 | 授权晋升 | Clearance Promotion |
| 附魔（动作） | 受祝圣 / 降福于 | Receive consecration |
| 已附魔的技能 | 受祝圣之铭文组 | Consecrated inscription |
| 附魔选择界面 | 祝圣仪式 | Consecration rite |
| 蜕变/变异 | 熔铸重塑 | Molten reforging |
| 回车/Enter/确认 | 落版 | Impression / Pull the press |
| 刷新（商店换货） | 换架 | Restock / Shelf rotation |
| 重置（数值归零） | 复归 | Revert / Restoration |
| 电池/续航 | 油壶 | Oil flask |

### 空间/界面

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| 装备栏/技能栏 | 圣坛键位 | Lectern positions |
| 商店 | 气动征用管 | Pneumatic Requisition Tube |
| 背包/仓库 | 不存在此概念 | — |
| 关卡/层 | 收容层 / 第X层 | Layer X |
| Run（一局） | 一次登塔 | Ascent |
| 失败 | 站点污染 | Site Compromise |
| 胜利 | 登顶启示 | Revelation |
| Boss 战 | 意志显现 | Will Manifestation |
| Ritual | 铭封祈礼 | Rite of Sealing |

### 角色/身份

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| 玩家 | 铭誓键徒 / 初誓键徒 | Clavigerant Novitiate / The Keybound |
| 敌人 | 异文 / 逸文 | Anomalous Glyph |
| 键盘 | 铅字圣坛 / 祈念键座 | Lectern of Keys / Claviculum Sanctum |
| 单个字母键 | 铅字符 / 圣字钉 | Leaden Glyph / Sacred Slug |

### 关卡/进度结构

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| 12-stage cycle | 大教堂的 12 层 | The 12 Vaults |
| Stage 5 精英 | 执事试炼 | Deacon's Trial |
| Stage 6 Ritual | 铭封祈礼 | Rite of Sealing |
| Stage 12 Boss | 祷文引擎的一重意志 | Will of the Litany Engine |
| 时间到/失败 | 收容突破 / 站点污染 | Containment Breach / Site Compromise |
| Tutorial | 入门圣礼 | Primer Rite |
| Daily Challenge | 日收容志 | Daily Containment Log |
| Leaderboard | 圣典登记簿 | Canonical Register |
| MetaState 永久进度 | 常驻授权 | Standing Orders |
| 传说词包 | 镜书 / 先天经 | Mirror Codex / Primal Tome |

### 资源/数值

| 机制层 | 设定层（中） | 设定层（英） |
|---|---|---|
| base 基数 | 基石流 | Foundation Humour |
| score 分数 | 铭分/结晶流 | Crystalline Humour |
| multiplier 倍率 | 共鸣流 | Resonant Humour |
| time 时间 | 流沙流 | Hourglass Humour |
| gold 金币 | 铅币 | Lead Coin / Plumbum Token |
| fragment 碎片 | 铅屑 | Lead Shavings |
| mutagen 变异素 | 熔蜡 / 污蜡 | Molten Unguent / Corrupted Ichor |
| 目标分数 | 收容基准 | Containment Threshold |

### 圣印命名规则（词缀/Affix 专用）

**品类名**：圣印（Sigil）— 出现在 tooltip 标题里
**个体名**：2 字 — 出现在 UI 标签里
**Tooltip 格式**：圣印 · [个体名] / Sigil of [English Name]

**2 字名构词约束**：
- 从意象池取材（金属/纸/液体/光/声/工业器械）
- 优先物质名词而非抽象动词
- 必须念出来 3 秒内能读出
- 不用现代术语（不叫"暴击"叫"裂铅"）
- 不用游戏术语（不叫"增幅"叫"传力"）
- 同圣律内的名字应有家族感但不强制同后缀

**六大圣律的命名意象方向**：
| 圣律 | 意象方向 | 示例 |
|---|---|---|
| 换质（Numeric） | 熔炉、铸造、炼金 | 换质、散流、倍铸 |
| 重击（Crit） | 锻打、碎裂、雷鸣 | 裂铅、蓄压、逆誓 |
| 积念（Stack） | 钟声、诵经、累积 | 叠念、自鸣、蓄怒 |
| 空位（Topology） | 席位、阵列、空缺 | 空席、群聚、镜铅 |
| 词义（Word Sense） | 经卷、字义、读诵 | 末字、引词、叠字 |
| 变律（Meta Rule） | 契约、封蜡、改写 | 双封、自铭、乱墨 |

**UI 标签预览**：
  [换质][裂铅][叠念] — UI 标签只显示 2 字名
  圣印 · 换质 — tooltip 标题
  Sigil of Transmutation — 英文 tooltip

## IP 合规

GW 专有名词禁用：${GW_BANNED.join(', ')}
SCP 真实编号禁用（不可写 SCP-173, SCP-096 等）
Credits: "Narrative aesthetic inspired by the SCP Foundation community (CC-BY-SA 3.0) and the broader Grimdark tradition. No Games Workshop IP is used."

## 输出规则

1. 必须输出严格 JSON，不要 markdown 代码块
2. 中英双语，每条碎片同时输出 zh 和 en
3. 从意象池取素材
4. 遵守对应声音的 DO/DON'T 规则
5. 引用锚点人物时必须对照事实表
`.trim()
}

export const SYSTEM_CONTEXT = buildSystemContext()

// ─── Sync drift detection ───
// Check if generated translation table has terms that differ from the full table in SYSTEM_CONTEXT
for (const entry of TRANSLATION_TABLE) {
  // Check if the zh term appears in SYSTEM_CONTEXT
  if (!SYSTEM_CONTEXT.includes(entry.zh)) {
    console.warn(`⚠️ 同步漂移: 文档翻译表有 "${entry.game} → ${entry.zh}" 但 system-context 中未找到`)
  }
}
