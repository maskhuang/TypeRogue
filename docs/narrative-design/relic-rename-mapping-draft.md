# Relic 重命名对照表（草稿 v3 · 终稿）

> **v3 修订**（v2 → v3）：基于「12 处意译 vs 中文官方译名」研究结果调整
> - **DIGIT** "指头" → 回退「**迪吉特**」（百度百科+果壳+央视多源通用译名）
> - **FLINT** "燧石" → 回退「**佛林特**」（澎湃通用译名，与 F 家系译法一致）
> - **FERDINAND** "费迪南" → 改「**菲迪南**」（与澎湃 F 家系译法一致）
> - **GOBLIN** "哥布林" → 改「**戈布林**」（与澎湃 G 家系译法一致）
> - **PAL flavor 事实订正**：原"Ai 之女"改为「Pan 之女。与同年出生的 Ai 之子 Ayumu 共同参与 Ai-project 第二代实验」（Kyoto PRI 官方资料：Pan 由人手抚养；Pal 2000 年生为 Pan 之女）
> - 其余 10 处意译保留：公主 / 伙伴 / 不可能 / 和平 / 闪烁 / 罂粟 / 麻雀 / 受难 / 短剑 / 告密
> - **新增 schema**：`archiveCode` 字段单独存放编号；`name` 简化为「中文 / English」（方案 A）
>
> **v2 修订**（v1 → v2）：
> - 站点缩写统一到 3 字母（KAS/MAH/BOS/CLK/KAR/LRC/LYB/AMB/BTR/MGS/LBM/KPR/CWU/PMK/RNO/CUN/HAY/IPS/OKL/MDZ/BAZ/CPZ/GFD/UTC/KSM）
> - 补全 94 个个体的中文译名
> - emoji 保留原 icon（数字键 1-0 工作台辨识度优先）
>
> **对齐原则**：affix 体系按物种分 category（Macaca→crit；Papio/Hylobates→stack；Pan/Gorilla/Pongo→topology；Cercopithecus/叶猴/疣猴→word_sense；Saimiri/Callithrix→numeric/production；语言实验个体→meta_rule/enchantment 语义）。relic 优先选择**与该 relic subsystem 在 affix 体系中对齐物种的命名个体**，但当对齐物种缺命名个体时，**事实匹配优先于强对齐**。
>
> **编号规则**：`{物种 4-letter NCBI 码}-{站点/lab 3-letter 缩写}-{序号 3 位}`。
>
> **flavor 字段写作规则**：
> - 卡夫卡式档案登记口吻；先陈述被引用的实际事实，再可选一句档案员旁白
> - 长度 30–60 字；保留原 flavor 的"短句感"
> - 严禁演绎；事实必须可在 `relic-rename-corpus.md` 的信源中查到

---

## 站点缩写对照（3 字母统一）

| 缩写 | 站点/Lab | 物种 |
|---|---|---|
| `KAS` | Kasekela community, Gombe (Tanzania) | Pan troglodytes |
| `MAH` | Mahale M-group (Tanzania) | Pan troglodytes |
| `TAI` | Taï National Park (Côte d'Ivoire) | Pan troglodytes verus |
| `BOS` | Bossou (Guinea) | Pan troglodytes verus |
| `KAR` | Karisoke Research Center (Rwanda) | Gorilla beringei |
| `CLK` | Camp Leakey, Tanjung Puting (Borneo) | Pongo pygmaeus |
| `BTR` | Camp Mayang, Batang Toru (Sumatra) | Pongo tapanuliensis |
| `MGS` | Mt Gaoligong "Skywalker" group (Yunnan) | Hoolock tianxing |
| `KSM` | Koshima Islet (Japan) | Macaca fuscata |
| `AMB` | Amboseli Baboon Research Project (Kenya) | Papio cynocephalus |
| `LBM` | Lomas Barbudal Monkey Project (Costa Rica) | Cebus capucinus |
| `LYB` | Lola ya Bonobo Sanctuary (DRC) | Pan paniscus |
| `LRC` | Language Research Center, Georgia State Univ | Pan / Pongo / Pan paniscus |
| `KPR` | Kyoto Primate Research Institute, Inuyama | Pan troglodytes verus |
| `CWU` | Central Washington Univ CHCI | Pan troglodytes |
| `PMK` | Premack lab (UCSB) | Pan troglodytes |
| `RNO` | U Nevada Reno (Gardner cross-foster) | Pan troglodytes |
| `CUN` | Columbia U / Project Nim | Pan troglodytes |
| `HAY` | Hayes home (Florida) | Pan troglodytes |
| `IPS` | IPS Norman, Oklahoma (Lemmon) | Pan troglodytes |
| `OKL` | U Oklahoma / Temerlin | Pan troglodytes |
| `MDZ` | Mendoza Zoo (Argentina) | Pan troglodytes |
| `BAZ` | Buenos Aires Zoo (Argentina) | Pongo hybrid |
| `CPZ` | Central Park Zoo (NYC) | Gorilla gorilla |
| `GFD` | The Gorilla Foundation (Woodside CA) | Gorilla gorilla |
| `UTC` | UT Chattanooga / Lyn Miles | Pongo hybrid |

---

## 物种 → affix category 速查（用于 alignment 检查）

| affix code 段 | 物种 | affix category | 命名个体丰度 |
|---|---|---|---|
| `Sbol/Ssci/Soer/Sust` | Saimiri 松鼠猴 | numeric / production | ✗ 无公开命名 |
| `Mmul/Mfas/Mfus/Marc/Mnem` | Macaca 猕猴 | crit | ★ 仅 Imo（Mfus） |
| `Panu/Pcyn/Pham/Pkin/Purs/Ppap` | Papio 狒狒 | stack / topology | ★★ Amboseli（Alto, Hook） |
| `Tgel` | Theropithecus 狮尾狒 | stack | ✗ |
| `Hsap` | Homo sapiens | topology | — |
| `Ggor/Gber` | Gorilla 大猩猩 | topology | ★★★ Karisoke + 语言实验 |
| `Ptro/Ppan` | Pan 黑/倭黑猩猩 | topology | ★★★★★ Gombe/Mahale/Tai/Bossou + 语言实验 |
| `Pabe/Ppyg/Ptap` | Pongo 红毛猩猩 | topology | ★★★ Camp Leakey + 语言实验 |
| `Cmit/Casc/Cdia/Cneg/Caet/Cpyg/Tgee/Tobs/Tcri/Sent/Sjoh/Rrox/Rbie/Cgue/Pnem` | 长尾猴/绿猴/叶猴/金丝猴/疣猴系 | word_sense | ✗ |
| `Hlar..Ssyn/Hleu..Htia/Ncon..Nsik` | Hylobates/Hoolock/Symphalangus/Nomascus 长臂猿 | meta_rule | ★ 仅 Skywalker 群级 |
| `Cjac/Cgeo/Cpen` | Callithrix 狨 | production / crit | ✗ |

---

## 完整对照表（按 relics.json 顺序）

| # | relic_id | 旧中文名 | 编号 | 中文名 / English | 物种 | 新 flavor |
|---|---|---|---|---|---|---|
| 1 | apprentice_notes | 学徒笔记 | `Ptro-CWU-002` | 卢利斯 / LOULIS | *Pan troglodytes* | 1979 年由 Washoe 收养。研究员未介入教学，仍习得 55 个 ASL 手势——唯一从同类习得手语的个案。 |
| 2 | primal_mutant | 原初变异体 | `Htia-MGS-G01` | 天行群 / SKYWALKER | *Hoolock tianxing* | 2017 年命名为新种，原归 *Hoolock leuconedys*。文书部档案据声纹指纹重新归档。 |
| 3 | ultimate_mutant_strain | 终极突变株 | `Ptap-BTR-001` | 切玛拉 / CEMARA | *Pongo tapanuliensis* | 1929 年以来首个被命名的灵长类大型新种。Camp Mayang 监测的成年个案之一。 |
| 4 | gene_stabilizer | 基因稳定器 | `Gber-KAR-021` | 艾菲 / EFFIE | *Gorilla beringei* | Karisoke Group 5 主导雌性。基因学回溯证实本群多数后代携带其线粒体序列。 |
| 5 | fittest_survivors | 适者生存 | `Ptro-KAS-007` | 法本 / FABEN | *Pan troglodytes* | 1966 年脊髓灰质炎流行后左臂瘫痪。仍以单臂为弟弟 Figan 助阵 alpha 之争。 |
| 6 | enchant_dividend | 附魔红利 | `Ptro-LRC-001` | 拉娜 / LANA | *Pan troglodytes* | 首只使用 Yerkish lexigram 键盘的黑猩猩。每按对一个符号，便有食物从槽口滑出。 |
| 7 | enchant_boost | 附魔增幅 | `Ptro-PMK-001` | 莎拉 / SARAH | *Pan troglodytes* | Premack 实验中以塑料色片表征语义。被认为掌握 if-then 条件结构。 |
| 8 | rune_spike | 符文尖刺 | `Ptro-KAS-002` | 歌利亚 / GOLIATH | *Pan troglodytes* | 1960 年代 Kasekela alpha。1975 年 Four-Year War 中被 Kasekela 联盟击杀。 |
| 9 | apprentice_robe | 学徒之袍 | `Ptro-RNO-002` | 莫加 / MOJA | *Pan troglodytes* | Gardner 第二批 cross-foster 个体。养家成长期间习得 168 个 ASL 手势。后期作画。 |
| 10 | trial_badge | 试炼徽章 | `Ptro-KAS-005` | 麦格雷戈 / McGREGOR | *Pan troglodytes* | 1966 年脊髓灰质炎流行幸存。下身瘫痪，仍以双臂支撑日常活动。 |
| 11 | fate_fork | 命运三岔 | `Ptro-KAS-021` | 格莱姆林 / GREMLIN | *Pan troglodytes* | 1998 年产下双胞胎雌性 Glitter 与 Golden。Gombe 史上罕见双胞胎成活案例。 |
| 12 | greedy_inscription | 贪婪铭刻 | `Ggor-GFD-001` | 可可 / KOKO | *Gorilla gorilla* | 据 Patterson 报告掌握 1100+ 美国手语手势。文书部档案另注：手势收录持续修订。 |
| 13 | masters_lexicon | 大师词典 | `Ptro-CWU-001` | 瓦肖 / WASHOE | *Pan troglodytes* | 1966 年起在 Reno 接受 ASL 训练。掌握 350+ 手势。后将之传给养子 Loulis。 |
| 14 | perpetual_queue | 永动队列 | `Ppyg-CLK-001` | 西丝维 / SISWI | *Pongo pygmaeus* | Camp Leakey 首只 ex-captive 后代。43 年间稳定出现于站点附近。 |
| 15 | word_scissors | 拆词剪刀 | `Ptro-LRC-003` | 谢尔曼 / SHERMAN | *Pan troglodytes* | 与 Austin 合作。隔笼通过 lexigram 请求工具，再分享所得食物。 |
| 16 | resonance_mold | 共鸣字模 | `Ptro-LRC-004` | 奥斯丁 / AUSTIN | *Pan troglodytes* | 与 Sherman 协同。两猿之间 lexigram 请求/分享行为成为合作传播研究典例。 |
| 17 | word_collection | 词汇收藏 | `Ggor-GFD-002` | 迈克尔 / MICHAEL | *Gorilla gorilla* | 与 Koko 同地训练。掌握 600+ 美国手语手势。1973 年自喀麦隆运送至加州。 |
| 18 | thick_deck | 词库丰收 | `Ptro-KAS-011` | 菲菲 / FIFI | *Pan troglodytes* | Flo 唯一存活的女儿。共产下 9 个后代，确立 F-家系在 Kasekela 的核心地位。 |
| 19 | long_word_crit | 长词蓄力 | `Ptro-KAS-003` | 麦克 / MIKE | *Pan troglodytes* | 1964 年起以撞击空汽油桶炫示，借此从 alpha 序列后位崛起。 |
| 20 | short_sprint | 短词冲刺 | `Ptro-KAS-031` | 威尔基 / WILKIE | *Pan troglodytes* | 体型偏小。1989-93 年靠梳理结盟而非武力获得 alpha 位。 |
| 21 | long_word_master | 长词达人 | `Ptro-BOS-002` | 吉雷 / JIRE | *Pan troglodytes* | Bossou 长期跟踪母性。42 岁仍能独立完成核桃敲击工序。 |
| 22 | word_dealer | 词语经销商 | `Ppyg-CLK-006` | **公主** / PRINCESS | *Pongo pygmaeus* | Camp Leakey ex-captive 雌性。Gary Shapiro 1978-80 ASL 实验对象，掌握 30-40 手势。 |
| 23 | punctuation_liberation | 标点解放 | `Phyb-BAZ-001` | 桑德拉 / SANDRA | *Pongo pygmaeus × abelii* | 2015 年布宜诺斯艾利斯法院判决其为"非人法律人格"。后转送佛州 Center for Great Apes。 |
| 24 | decelerate_reward | 减速津贴 | `Ptro-BOS-003` | 维卢 / VELU | *Pan troglodytes* | Bossou 老年雄性。核桃敲击次数增加但成功率下降，群体仍允许其使用工具。 |
| 25 | accelerate_reward | 加速奖金 | `Ptro-BOS-001` | 约 / YO | *Pan troglodytes* | 1993 年实验引入 coula 坚果。Bossou 群中唯一首次接触即敲开者。 |
| 26 | little_helper | 小助手 | `Ptro-KPR-004` | **伙伴** / PAL | *Pan troglodytes* | Pan 之女。与同年出生的 Ai 之子 Ayumu 共同参与 Ai-project 第二代符号匹配实验。 |
| 27 | rhythm_adapt | 节奏适应 | `Ptro-CUN-001` | 尼姆·乔姆斯基 / NIM CHIMPSKY | *Pan troglodytes* | Project Nim 训练中习得 128 ASL 手势。Terrace 后续分析认为多为节奏性模仿而非语法。 |
| 28 | glass_cannon_v2 | 回归基本功 | `Ptro-HAY-001` | 薇姬 / VIKI | *Pan troglodytes* | 1947-54 年由 Hayes 夫妇在家中抚养，试图教其口语。最终发出 mama / papa / cup / up 四词。 |
| 29 | combo_buffer | 余韵护盾 | `Ptro-KAS-033` | 吉吉 / GIGI | *Pan troglodytes* | 不育雌性。长期承担 Kasekela 群幼崽的辅助看护角色。 |
| 30 | multiplier_prism | 倍率棱镜 | `Gber-KAR-001` | 贝多芬 / BEETHOVEN | *Gorilla beringei* | Karisoke Group 5 dominant silverback。与 Effie 一起开创该站史上最大谱系。 |
| 31 | combo_detonator | 蓄势引爆 | `Ptro-MAH-002` | 皮姆 / PIMU | *Pan troglodytes* | Mahale M-group 暴政 alpha。2011 年被联盟以石头与棒打死。 |
| 32 | cancel | 取消连锁 | `Ptro-MAH-001` | 恩托罗吉 / NTOLOGI | *Pan troglodytes* | Mahale M-group 长期 alpha。1996 年被本群联盟攻击致死。 |
| 33 | immortal_combo | 不断之链 | `Gber-KAR-002` | **不可能** / CANTSBEE | *Gorilla beringei* | Fossey 见证其出生时误判其母性别故名 "Can't be"。38 岁离世，Fossey 知道的最后一只 silverback。 |
| 34 | fury_beat | 暴走节拍 | `Ptro-KAS-013` | 弗罗多 / FRODO | *Pan troglodytes* | alpha 1997-2002。体型 51.2 kg。曾袭击观察员与人类幼儿。 |
| 35 | first_strike | 首发强化 | `Ptro-KAS-001` | 大卫·灰胡子 / DAVID GREYBEARD | *Pan troglodytes* | 1960 年首位被 Goodall 观察使用工具（钓白蚁）。亦是首位接近研究员的雄性。 |
| 36 | less_is_more | 少而精 | `Ptro-MAH-003` | 阿洛富 / ALOFU | *Pan troglodytes* | Mahale M-group alpha 雄性。文献记其作风温和受尊敬，与继任者 Pimu 形成对比。 |
| 37 | training_manual | 集训手册 | `Ppan-LRC-002` | 玛塔塔 / MATATA | *Pan paniscus* | Kanzi 的养母。LRC 正式 lexigram 训练对象。Kanzi 在旁观察中自行习得。 |
| 38 | jazz | 爵士乐 | `Phyb-UTC-001` | 钱泰克 / CHANTEK | *Pongo abelii × pygmaeus* | Lyn Miles 实验对象。掌握 ~150 ASL 手势。自创复合词 "eye-drink" 指代隐形眼镜液。 |
| 39 | uncrowned_king | 无冕之王 | `Ptro-MAH-004` | 卡伦德 / KALUNDE | *Pan troglodytes* | Mahale M-group 雄性。被研究员称为"造王者"——咬倒前任暴政 alpha Pimu 的关键发起者。 |
| 40 | d_100 | D100 | `Ptro-KPR-002` | 步武 / AYUMU | *Pan troglodytes* | Ai 之子。瞬时数字记忆任务（0.21 秒呈现 1-9）成功率超越成年人类基线。 |
| 41 | adjacent_power | 邻键之力 | `Ppan-LYB-001` | 塞蒙德瓦 / SEMENDWA | *Pan paniscus* | Lola ya Bonobo Group 1 matriarch。其女 Elikya 为保护区出生首位个体。 |
| 42 | corner_power | 角隅之力 | `Ptro-KAS-027` | **和平** / PAX | *Pan troglodytes* | 因群体冲突失去睾丸。被排除在繁殖序列外，仍长期定居于 Kasekela 边缘区域。 |
| 43 | row_switch | 换行奖励 | `Ptro-KAS-028` | 帕蒂 / PATTI | *Pan troglodytes* | 1973 年自其他群移入 Kasekela。后被 Mitumba 群雄性杀害。 |
| 44 | line_clear | 消行满贯 | `Ptro-KAS-008` | 菲根 / FIGAN | *Pan troglodytes* | Flo 之子。Goodall 认为其为最具策略性的雄性。多次称 alpha。 |
| 45 | dual_concerto | 双手协奏 | `Ptro-KAS-022` | **闪烁** / GLITTER | *Pan troglodytes* | Gremlin 双胞胎之一（与 Golden）。Gombe 罕见双胞胎成活案例。 |
| 46 | precision_strike | 精准打击 | `Ptro-KPR-001` | 爱 / AI | *Pan troglodytes* | 首只学会用阿拉伯数字代表数字的黑猩猩。Matsuzawa Ai-project 自 1977 年起。 |
| 47 | key_storm | 全键风暴 | `Ptro-KAS-029` | 泰坦 / TITAN | *Pan troglodytes* | Frodo 之子。继承父辈的体型与攻击性。 |
| 48 | production_dividend | 产出分红 | `Ptro-BOS-004` | 法娜 / FANA | *Pan troglodytes* | Bossou 长期记录的核桃敲打母性。其工具使用习惯传给子 Foaf。 |
| 49 | time_trickle | 续命涓流 | `Gber-KAR-006` | **罂粟** / POPPY | *Gorilla beringei* | Karisoke 现存最后一只仍由 Fossey 本人识别命名的山地大猩猩。 |
| 50 | resource_focus | 资源专精 | `Ppyg-CLK-005` | 苏皮娜 / SUPINAH | *Pongo pygmaeus* | Camp Leakey ex-captive 雌性。长期被记录使用工具撬树皮取昆虫。 |
| 51 | resource_diversity | 多元投资 | `Ptro-KAS-015` | 弗洛西 / FLOSSI | *Pan troglodytes* | Fifi 之女。移居 Mitumba 群后创新出 ant-fishing 工具用法。 |
| 52 | resource_tide | 资源潮汐 | `Ppan-LRC-003` | 穆利卡 / MULIKA | *Pan paniscus* | Yerkes 与 LRC 倭黑猩猩家系成员。与 Kanzi、Panbanisha 同代。 |
| 53 | universal_furnace | 贤者之石 | `Ptro-CWU-005` | 达尔 / DAR | *Pan troglodytes* | Gardner cross-foster 个体。后期偏爱戴帽子与拆装机械玩具。 |
| 54 | discount_card | 折扣卡 | `Ptro-IPS-001` | 布伊 / BOOEE | *Pan troglodytes* | IPS Norman 学手语者。研究所倒闭后被转卖至 LEMSIP 实验室。 |
| 55 | recycle_expert | 回收专家 | `Ptro-OKL-001` | 露西 / LUCY | *Pan troglodytes* | Temerlin 一家"人化"抚养。1977 年由 Janis Carter 接手，运送至冈比亚试图野化。 |
| 56 | black_market | 黑市门票 | `Gber-KAR-007` | 柯柯 / COCO | *Gorilla beringei* | 1969 年自偷猎者手中救回的两只孤儿之一。原计划出口至 Cologne 动物园。 |
| 57 | gold_interest | 金库利息 | `Ptro-KAS-030` | **麻雀** / SPARROW | *Pan troglodytes* | S-家系 matriarch。目前 Kasekela 群中存活最久的雌性。 |
| 58 | smuggle_pass | 走私通道 | `Ptro-KAS-025` | **受难** / PASSION | *Pan troglodytes* | 1972-77 年间与女儿 Pom 合谋杀害约 10 只新生婴儿。原因至今未明。 |
| 59 | timed_auction | 限时拍卖 | `Gber-KAR-013` | 迪吉特 / DIGIT | *Gorilla beringei* | Fossey 最钟爱的雄性。1977 年圣诞被偷猎者割头。Digit Fund 由此设立。 |
| 60 | warm_up | 暖身操 | `Ptro-BOS-005` | 乔雅 / JOYA | *Pan troglodytes* | Bossou 幼年雌性。Jire 之女。 |
| 61 | intermission | 幕间准备 | `Ppan-LRC-005` | 尼奥塔 / NYOTA | *Pan paniscus* | Panbanisha 之子。被列为 ape welfare 研究论文共同作者。 |
| 62 | gamblers_creed | 赌徒信条 | `Ptro-KAS-019` | 戈布林 / GOBLIN | *Pan troglodytes* | Melissa 之子。alpha 1979 与 1982-89。后被竞争联盟攻击致绝育。 |
| 63 | endurance_battery | 续航电池 | `Ptro-BOS-006` | 图阿 / TUA | *Pan troglodytes* | Bossou 长期跟踪的老年雄性。 |
| 64 | elite_hunter | 猎物悬赏 | `Ptro-TAI-001` | 布鲁图斯 / BRUTUS | *Pan troglodytes* | Taï 早期合作狩猎研究的代表 alpha。Boesch 团队记录其多次主导集体狩猎红疣猴。 |
| 65 | phoenix | 不死鸟 | `Ppan-LYB-005` | 伊西罗 / ISIRO | *Pan paniscus* | 自刚果丛林肉市救援的孤儿。Vanessa Woods *Bonobo Handshake* 中长篇记述。 |
| 66 | desperate_crit | 绝境暴击 | `Ptro-KAS-032` | **短剑** / KRIS | *Pan troglodytes* | alpha 2005-08。被 Ferdinand 击败后伤重死亡。 |
| 67 | modifier_shield | 修饰器护盾 | `Ppyg-CLK-002` | 西丝沃约 / SISWOYO | *Pongo pygmaeus* | Camp Leakey ex-captive 雌性。Siswi 之母。 |
| 68 | bounty_hunter | 困境红利 | `Ptro-KAS-020` | 梅丽莎 / MELISSA | *Pan troglodytes* | G-家系 matriarch。产下黑猩猩研究中罕见的双胞胎子（Goblin 与 Gimble）。 |
| 69 | modifier_pardon | 赦免状 | `Ptro-MDZ-001` | 塞西莉亚 / CECILIA | *Pan troglodytes* | 2016 年阿根廷 Mendoza 法院判决其为"非人法律人格"。后转送巴西庇护所。 |
| 70 | modifier_barrier | 修饰器屏障 | `Gber-KAR-019` | 兹兹 / ZIZ | *Gorilla beringei* | Fossey 时期出生的 1970s silverback。 |
| 71 | chaos_roulette | 混沌轮盘 | `Ptro-KAS-024` | 吉姆布尔 / GIMBLE | *Pan troglodytes* | Melissa 双胞胎之子。体型偏小，仍短暂跻身 alpha 序列高位。 |
| 72 | modifier_reversal | 修饰器反转 | `Ggor-CPZ-001` | 帕蒂凯克 / PATTYCAKE | *Gorilla gorilla* | 纽约市首只圈养出生大猩猩。其名字由市民投票比赛产生。 |
| 73 | base_shield | 基数护盾 | `Gber-KAR-018` | 辛达 / SHINDA | *Gorilla beringei* | Fossey 时期出生的 1970s 雄性 silverback 之一。 |
| 74 | lenient_judge | 宽容评审 | `Gber-KAR-022` | 玛吉 / MAGGIE | *Gorilla beringei* | Karisoke 长期被监测的雌性。 |
| 75 | s_rank_trophy | S 级奖杯 | `Ppan-LRC-001` | 坎兹 / KANZI | *Pan paniscus* | 首只「自然习得」lexigram 语言的猿。理解英语口语词汇约 3000。 |
| 76 | underdog_bonus | 及格万岁 | `Ptro-CWU-003` | 塔图 / TATU | *Pan troglodytes* | Gardner 第二批 cross-foster。与 Loulis 同为现存最后两位 ASL 黑猩猩。 |
| 77 | snowball | 雪球效应 | `Mfus-KSM-001` | 伊莫 / IMO | *Macaca fuscata* | 1953 年秋，幸岛 18 个月大雌性独立将红薯带至溪边洗净。三年后，全岛个体均效仿。 |
| 78 | score_black_hole | 致命礼物 | `Ptro-KAS-009` | 佛林特 / FLINT | *Pan troglodytes* | 首只在 Gombe 研究期出生的婴儿。母亲 Flo 死后陷入抑郁并绝食而亡。 |
| 79 | lucky_strike | 幸运一击 | `Ptro-KAS-016` | 福斯蒂诺 / FAUSTINO | *Pan troglodytes* | Fifi 之子。一度跻身 Kasekela beta 位。 |
| 80 | crit_bonus | 暴击奖金 | `Ptro-KAS-017` | 菲迪南 / FERDINAND | *Pan troglodytes* | Fifi 之子。alpha 2008-2016。 |
| 81 | crit_charge | 暴击蓄力 | `Ptro-KAS-018` | 福吉 / FUDGE | *Pan troglodytes* | Fanni 之子。2016 年推翻舅父 Ferdinand 接任 alpha。 |
| 82 | crit_storm | 暴击风暴 | `Ptro-KAS-026` | 波姆 / POM | *Pan troglodytes* | Passion 之女。1972-77 年与母合谋杀婴事件中的同谋。 |
| 83 | fate_coin | 命运硬币 | `Pcyn-AMB-002` | **钩子** / HOOK | *Papio cynocephalus* | Amboseli "Hook's group" 名祖。1995 年群体分裂事件由其触发。 |
| 84 | stack_momentum | 层层递进 | `Pcyn-AMB-001` | 阿尔托 / ALTO | *Papio cynocephalus* | Amboseli "Alto's group" 名祖母。1990-91 年群体分裂事件的起始点。 |
| 85 | stack_dividend | 积少成多 | `Ptro-BOS-007` | 弗夫 / FOAF | *Pan troglodytes* | Fana 之子。32 岁仍能高效敲击油棕坚果。 |
| 86 | overload_circuit | 过载电路 | `Ccap-LBM-001` | 艾比 / ABBY | *Cebus capucinus* | Lomas Barbudal 跟踪雌性。Susan Perry *Manipulative Monkeys* 主章节记述其政治生涯。 |
| 87 | surge | 浪涌 | `Gber-KAR-003` | 巴勃罗 / PABLO | *Gorilla beringei* | "Pablo's group" 名祖。曾短暂主导其一群，后被 Cantsbee 接替。 |
| 88 | perpetual_engine | 永动引擎 | `Gber-KAR-024` | 基库拉西 / GICURASI | *Gorilla beringei* | Cantsbee 之子。2017 年其父失踪后接任 Karisoke 群头。 |
| 89 | drum_pass | 击鼓传花 | `Ccap-LBM-002` | **告密** / TATTLE | *Cebus capucinus* | Lomas Barbudal 跟踪雌性。Susan Perry "Abby and Tattle" 章节双主角之一。 |
| 90 | word_resonance | 词根共振 | `Ppan-LRC-004` | 潘班尼莎 / PANBANISHA | *Pan paniscus* | Matata 亲女。与 Kanzi 同期。同时使用 lexigram 与理解口语英语。 |
| 91 | crit_overflow | 暴击溢层 | `Ptro-KAS-004` | 汉弗莱 / HUMPHREY | *Pan troglodytes* | Kasekela alpha 1969-1971。 |
| 92 | inscription_flow | 铭文涌流 | `Ptro-IPS-002` | 艾莉 / ALLY | *Pan troglodytes* | IPS Norman 学手语者。与 Nim、Washoe 并列熟练 ASL 签字者。 |
| 93 | neighbor_watch | 邻里守望 | `Ppan-LYB-002` | 米米 / MIMI | *Pan paniscus* | Lola ya Bonobo alpha 雌性。群体管理者。Vanessa Woods *Bonobo Handshake* 文献化。 |
| 94 | stack_crit | 叠层暴击 | `Ptro-IPS-003` | 布鲁诺 / BRUNO | *Pan troglodytes* | IPS Norman 学手语者。70 年代实验记录。 |

---

## 意译/音译最终决议（v3）

10 处意译保留 + 2 处回退中文官方音译（DIGIT/FLINT）。

| # | relic_id | English | **v3 选定** | 理由 |
|---|---|---|---|---|
| 22 | word_dealer | PRINCESS | **公主**（意译） | 无中文官方译名；卡名好 |
| 26 | little_helper | PAL | **伙伴**（意译） | 无中文官方译名；与「小助手」直接同义 |
| 33 | immortal_combo | CANTSBEE | **不可能**（意译） | 无中文官方译名；名字本意（Fossey 误判后命名） |
| 42 | corner_power | PAX | **和平**（意译） | 无中文官方译名；拉丁 PAX=和平，反讽 |
| 45 | dual_concerto | GLITTER | **闪烁**（意译） | 中文圈仅一篇科普译"格莱特"，弱信号；意译卡名更佳 |
| 49 | time_trickle | POPPY | **罂粟**（意译） | 无中文官方译名；与「续命涓流」止痛暗喻匹配 |
| 57 | gold_interest | SPARROW | **麻雀**（意译） | 无中文官方译名；卡名好 |
| 58 | smuggle_pass | PASSION | **受难**（意译） | 澎湃译"帕辛"为弱信号；"受难"双关更深 |
| **59** | **timed_auction** | **DIGIT** | **迪吉特**（音译·回退） | **百度百科+果壳+央视等多源通用译名** |
| 66 | desperate_crit | KRIS | **短剑**（意译） | 无中文官方译名；Kris=马来短剑（keris） |
| **78** | **score_black_hole** | **FLINT** | **佛林特**（音译·回退） | **澎湃通用译名，与 F 家系（菲菲/弗罗多/菲迪南）译法一致** |
| 89 | drum_pass | TATTLE | **告密**（意译） | 无中文官方译名；卡名好 |

**比例**：10/94 ≈ 11% 意译。其余 84 名全部音译，保持文献中性。

**澎湃 F/G 家系译名一致化**（v3 强制对齐，避免读者认知断裂）：
| English | v3 译名 | 涉及 relic |
|---|---|---|
| Flint | 佛林特 | #78 score_black_hole |
| Ferdinand | 菲迪南 | #80 crit_bonus |
| Goblin | 戈布林 | #62 gamblers_creed |
| Fifi/Frodo/Mike | 菲菲/弗罗多/麦克 | 已对齐 |

---

## 命名重复 / 字符冲突说明

| 个体 | 物种 | 中文 | 区分手段 |
|---|---|---|---|
| KOKO | *Gorilla gorilla* (Gorilla Foundation) | 可可 | 物种 + Lab 缩写 |
| COCO | *Gorilla beringei* (Karisoke) | **柯柯** | 中文用「柯柯」与「可可」字面区分 |
| PILI 1 | *Pan troglodytes* (Reno, Gardner) | 皮利 | 未在表中（备选） |
| PILI 2 | *Pan troglodytes* (Bossou) | 皮利 | 未在表中（备选） |
| PABLO 1 | *Gorilla beringei* (Karisoke) — 表 #87 | 巴勃罗 | 仅 Karisoke 入表 |
| PABLO 2 | *Cebus capucinus* (Lomas Barbudal) | — | 未入表 |
| MICHAEL/MICHAEL — 仅 1 个入表 | | | — |
| AI (chimp Ptro-KPR-001) vs *人工智能* | — | 爱 | 中文「爱」消解歧义 |

---

## Affix 对齐统计

**强对齐**（relic subsystem 与个体物种在 affix 中的 category 一致）：
- topology relics（adjacent/corner/row/line/dual/precision/key_storm 7 件）→ Pan/Gorilla/Pongo（topology 物种）✓
- stack relics 中 stack_momentum / fate_coin → Papio cynocephalus（stack 物种）✓
- crit relic 中 snowball → Macaca fuscata（crit 物种）✓

**软对齐 / 语义对齐**（物种 affix category 不直接对应 relic subsystem，但语义匹配）：
- enchantment / typing / skill / shop 多数 → 语言实验个体（"被刻入语言/技能"语义）
- boss_modifier 中 modifier_pardon / punctuation_liberation → 法律案件个体（"审判=规则改写"）

**不强对齐但事实必须保真**：
- 暴击 / combo / scoring 多数 relic 用 Pan troglodytes 个体——Macaca/Theropithecus 缺命名个体，无法强对齐 affix；选用 Gombe alpha 史中"暴力/危机"事实匹配的个体（Goliath/Frodo/Pimu/Pom/Kris/Ntologi）

---

## v3 终稿 schema（写 json 实现规范）

**方案 A · `archiveCode` 独立字段**：

```json
{
  "id": "score_black_hole",
  "name": "佛林特 / FLINT",
  "archiveCode": "Ptro-KAS-009",
  "icon": "🌀",
  "description": "分数不自动结算，累计到隐藏池。按回车键一次性结算——达标通关并获得香蕉奖励...",
  "rarity": "legendary",
  "basePrice": 0,
  "effects": [],
  "flavor": "首只在 Gombe 研究期出生的婴儿。母亲 Flo 死后陷入抑郁并绝食而亡。",
  "category": "risk-reward",
  "subsystem": "scoring",
  "behaviorType": "score_black_hole"
}
```

**字段语义**：
- `name`：UI 主显示名（中文 / English），`nameAbbrev` 直接 slice 前 12 字符即可（中文短名通常 ≤4 字 + " / " + 英文 ≤8 字 = 安全）
- `archiveCode`：档案编号，UI 自由组合（tooltip 标题、列表副标、deck 折叠态等）
- `flavor`：纯叙事正文，不再嵌编号

**类型定义改动**（`src/shared/types.ts`）：
```ts
export interface RelicData {
  id: string;
  name: string;
  archiveCode?: string;  // ← 新增
  icon: string;
  // ... 其余不变
}
```

**UI 适配检查清单**（用 archiveCode 取代旧 name 中编号的位置）：
| 文件 | 行号 | 当前用法 | v3 适配建议 |
|---|---|---|---|
| `itemDescriptors.ts` | 170 | `nameAbbrev = name.toUpperCase().slice(0, 12)` | ✓ 直接生效，新 name 在 12 字符内 |
| `leaderboardDisplay.ts` | 75 | `${relic.icon}${name}` | ✓ 直接生效 |
| `RelicTab.ts` | 40 | `icon: relic.icon` | 加 `code: relic.archiveCode` 列以增强档案感 |
| `shop.ts` | 4414 | tooltip 标题 `${icon} ${name}` | 改 `${icon} ${name}<br>${archiveCode}` |
| `relicPicker.ts` | 218 | `relic-picker-icon` | 同上，标题副标加 archiveCode |
| `shopWorkbench.ts` | 603 | 数字键 `.kb-relic` 仅 icon | ✓ 不变 |

## 下一步

1. 改 `src/shared/types.ts`：`RelicData.archiveCode?: string`
2. 批量改 `src/data-json/relics.json`：94 行（name 简化 + archiveCode 新增 + flavor 替换）
3. 改 5 个 UI 引用点（按上表）
4. 跑类型检查 + 启动 dev 服务器肉眼验收数字键位与 tooltip 显示
