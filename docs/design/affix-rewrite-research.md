# Affix 系统重做 · Bazaar-Style 调研记录

> Created: 2026-05-11
> Status: 调研阶段 · 待综合决策
> Context: 旧系统 → `docs/design/affix-skill-system.md`；旧数据备份 → 各 data 目录下 `.bak/2026-05-11/`

---

## 0. 背景与问题陈述

**当前问题**（用户提出）：
1. 单一词条太复杂，认知负荷过高
2. 词条间联动不够有趣，难以产生涌现式体验

**参考方向**：The Bazaar（Reynad / Tempo Storm）的设计哲学——单条物品一句话，深度全部来自 tag 集合的相互查询与邻接 cooldown 的错相。

**叙事 register 约束**（来自 `narrative-design.md` §2.15.1 v4.1 LOCKED 词表）：
- 不能让 "MOKO / 灵长接口 / species protocol" 在 surface 文本显化
- 不能让 "L1/L2/layer / 污染等级" 名漏到 UI
- 5 阶梯作者化（录入→校对→修改→作者→文本）是阶梯不是平行 tag
- 三轨（公司 / 员工 / 异常）是 source 不是 function
- tag 必须 L1 兼容——读起来像录入员视角下的"观察表抬头"

---

## 1. The Bazaar 设计原则（已确认采纳全 4 条）

| 原则 | 描述 |
|---|---|
| **单条一句话** | 所有词条压缩为 1 句模板：「[trigger]: [effect]」或「每 N [unit] 时, [effect]」 |
| **Tag 词汇表为联动基底** | 词条携带 tag 集合，可被互相 `count(tag:X)` 查询作 scale 系数 |
| **Cooldown / 独立节拍** | 每个词条有自己的触发节拍单位（按键/词末/自触发次数），错相产生涌现 |
| **邻接当事件源** | 沿用现有键盘拓扑做"邻居"语义，事件包括 fire / crit / sold / full-stack 等 |

---

## 2. 真实灵长研究术语调研

> 4 个 Agent 并行调研。所有报告原文存档，按类目分组、英中对照。

### 2.1 标准化灵长类 ethogram 词表

来源：Goodall (Gombe, 1986/1989)、Nishida (Mahale)、Altmann (1974) 取样方法学、Wisconsin NPRC 公开 ethogram、PLOS ONE *M. fascicularis* 系统化 ethogram (Rosati et al.)、Great Ape Dictionary、Pika 等手势研究。

#### 2.1.1 方法学 / 取样词（Methodology Lexicon）

**取样方法 Sampling methods**
- ad libitum sampling — 自由观察 / 随机记录
- focal animal sampling — 个体焦点取样
- focal subgroup sampling — 子群焦点取样
- scan sampling — 扫描取样
- instantaneous sampling — 瞬时取样 / 定点取样
- one-zero sampling — 零一取样 / 区间存在性取样
- continuous (all-occurrences) sampling — 连续记录
- predominant activity sampling — 主导活动取样
- behavior sampling — 行为取样（仅记某行为发生时）
- point sampling — 点取样
- sequence sampling — 序列取样

**计量学概念 Measurement concepts**
- state behavior — 状态行为
- event behavior — 事件行为
- bout — 行为单元 / 一阵
- bout criterion (BCI) — 行为单元间隔阈
- duration — 持续时长
- frequency — 频次
- latency — 潜伏期
- rate — 速率
- inter-event interval — 事件间隔
- activity budget — 行为时间预算
- proximity index — 邻近指数
- co-occurrence — 共现
- inter-observer reliability — 观察者间一致性
- Cohen's kappa — κ 系数
- operationalization — 操作化定义
- mutually exclusive / exhaustive — 互斥 / 完备（编码集要求）

#### 2.1.2 Maintenance 维持性行为

rest 静止 · sit 坐 · lie 卧 · sleep 睡眠 · doze 假寐 · stretch 伸展 · yawn 哈欠 · scratch 搔抓 · self-groom 自身理毛 · auto-groom 自理 · drink 饮水 · forage 觅食 · feed 进食 · chew 咀嚼 · masticate 细嚼 · swallow 吞咽 · regurgitate 反刍/反吐 · cough 咳 · sneeze 喷嚏 · defecate 排便 · urinate 排尿 · sunbathe 日浴 · thermoregulate 体温调节 · nest-build 筑巢（白巢/夜巢 day-nest / night-nest）· wadge 残渣团

#### 2.1.3 Locomotion 运动姿态

quadrupedal walk 四足行走 · knuckle-walk 指节行走 · palmigrade 掌行 · digitigrade 趾行 · bipedal walk 两足行走 · bipedal stand 直立站 · brachiate 臂荡 · semi-brachiate 半臂荡 · climb 攀爬 · descend 下行 · cling 紧贴 · vertical clinging and leaping 直立跃式 · leap 跳跃 · drop 坠落 · bridge 搭桥 · suspensory hang 悬挂 · arboreal travel 树栖移动 · terrestrial travel 地栖移动 · sway 摇晃 · run 奔跑 · charge 冲撞 · approach 接近 · withdraw 退离 · follow 跟随 · lead 领走 · travel 行进

#### 2.1.4 Posture 姿势

sit-rest 静坐 · crouch 蹲伏 · prone 俯卧 · supine 仰卧 · huddle 蜷缩 · cling-cradle 抱伏 · perch 栖立 · piloerection 毛竖 · bipedal swagger 双足摇摆步 · arm-raise 举臂 · arm-akimbo 叉臂

#### 2.1.5 Affiliative 亲和行为

allogroom 互理毛 · social grooming 社交理毛 · grooming hand-clasp 理毛手扣（Mahale 文化标记）· embrace 拥抱 · ventro-ventral embrace 腹对腹拥抱 · pat 轻拍 · touch 触碰 · kiss 亲吻 · mouth-to-mouth contact 口接触 · finger-in-mouth 指入口 · hand-hold 握手 · reassurance 安抚 · reconciliation 和解 · consolation 慰藉 · proximity-maintenance 邻近维持 · co-feed 共食 · food-share 食物分享 · co-rest 共息 · play-face 玩耍脸 · relaxed open-mouth display 张口松弛表情 · social play 社交玩耍 · rough-and-tumble 嬉戏扭打 · chase-play 追逐玩耍 · tickle 挠痒 · greet 问候

#### 2.1.6 Agonistic 对抗行为

display 炫耀展示 · charging display 冲撞展示 · branch-drag 拖枝 · branch-shake 摇枝 · stamping 跺脚 · drumming 击鼓（buttress drumming 板根击鼓）· throw 投掷 · piloerect bluff 蓬毛虚张 · threat 威胁 · stare-threat 凝视威胁 · head-bob 点头威胁 · open-mouth threat 张口威胁 · bite 啃咬 · grapple 扭抱 · hit 击打 · slap 拍击 · pull 拉拽 · stamp 踩踏 · displace 驱替（高位个体迫使低位让位）· supplant 取代 · chase 追击 · flee 逃离 · avoid 回避 · submit 屈从 · pant-grunt 喘嗯（屈从信号）· bared-teeth display 露齿（恐惧表情）· grimace 鬼脸 · scream 尖叫 · cower 畏缩 · crouch-present 蹲伏致敬 · appease 安抚（弱势方）· coalitionary attack 联盟攻击 · redirected aggression 转向攻击 · severe aggression 严重攻击 · mild aggression 轻度攻击

#### 2.1.7 Vocal 发声目录

pant-hoot 喘啸 · build-up / climax / let-down phase 起句 / 高潮 / 收尾段 · pant-grunt 喘嗯 · pant-bark 喘吠 · pant-scream 喘啸尖叫 · rough-grunt 粗砺嗯（采食叫）· food-grunt 食物叫 · soft-bark 软吠 · waa-bark 哇吠 · wraah 警示嚎 · hoo 呼 · alarm-call 警报叫 · contact call 联络叫 · whimper 呜咽 · scream 尖叫 · copulation call 交配叫 · staccato hoot 断顿啸 · lip-smack 唇拍 · raspberry 颤唇 · tongue-click 舌弹 · teeth-chatter 牙颤 · coo（猕猴）· girney（猕猴 girney call）

#### 2.1.8 Gesture 手势（Great Ape Dictionary 核心条目）

reach 伸手 · arm-raise 举臂 · beg (open-hand) 开掌乞 · present (sexual) 呈姿 · present (grooming) 呈毛 · object-shake 摇物 · leaf-clip 撕叶（性注意吸引）· leaf-groom 叶理 · directed scratch 指向性搔抓 · big-loud-scratch 高声搔抓 · hand-clap 拍手 · stomp 踏脚 · gallop 飞奔 · jump 跳 · embrace-gesture 拥抱手势 · touch-other 触它 · push 推 · pull-hand 拉手 · bipedal-strut 双足踱 · ground-slap 拍地 · object-throw 投物

#### 2.1.9 Sexual / Reproductive 繁殖

solicit 求偶 · present 呈姿 · mount 骑跨 · intromit 插入 · thrust 抽插 · dismount 下骑 · copulation 交配 · post-copulatory groom 交配后理毛 · GG-rubbing 阴阴摩擦（bonobo 标志）· penile-display 阳具展示 · sexual swelling / tumescence 性肿胀 · estrus 发情 · parturition 分娩 · cradle 怀抱 · nurse 哺乳 · ventral-carry 腹载 · dorsal-carry 背载 · infant transport 婴幼运输 · alloparenting 代亲养护 · kidnap 拐带 · infanticide 杀婴

#### 2.1.10 Cognitive / Tool / Cultural 工具与文化

tool-use 工具使用 · termite-fish 钓白蚁 · ant-dip 蘸蚁 · nut-crack 砸坚果（hammer & anvil 锤砧）· leaf-sponge 叶海绵 · stone-throw 投石 · spear-make 削矛 · cache 储藏 · gaze-follow 视线跟随 · gaze-alternation 视线交替 · pointing 指点 · imitate 模仿 · teach 示教 · cultural variant 文化变体 · population-specific behavior 种群特异行为

#### 2.1.11 Abnormal / Captive 异常 / 圈养特异

stereotypy 刻板行为 · pacing 踱步 · rocking 摇晃 · regurgitation-reingestion (R/R) 反吐再食 · coprophagy 食粪 · hair-pluck 拔毛 · over-groom 过度理毛 · self-injurious behavior (SIB) 自伤 · floating-limb 浮肢 · eye-poke 戳眼 · saluting 敬礼式刻板 · whole-body stereotypy 全身刻板

#### 2.1.12 主要 ethogram 项目与分歧

- **Gombe (Goodall 1986/1989)**：316 简单解剖术语 + 81 复合 + 37 简单功能术语 + 81 复合功能术语 + 116 同义词，是事实标准。
- **Mahale (Nishida 等)**：发展出"行为普遍性 8 级体系"；标记 *grooming hand-clasp* 等文化变体。
- **Tai Forest (Boesch)**：偏 *nut-cracking* 文化、合作狩猎术语。
- **Yerkes / Kyoto PRI**：圈养语境，**异常行为**类目更细（R/R、SIB、stereotypy）；Kyoto 偏认知实验语境（matching-to-sample 等）。
- **Wisconsin NPRC**：标准化教学 ethogram，类目最规整（locomote / forage / social / vocal / other）。
- **PLOS ONE *M. fascicularis* (2012)**：107 → 83 → 53 条目，12 一级类目，方法学最严格的近代系统化范例。
- **分歧点**：①类目数（5–12 不等）；② subordination signal 是否独立成类；③ play 是否归 affiliative；④ vocal 是否拆出 gesture / facial expression；⑤ R/R 等异常行为是否进通用 ethogram。

#### 2.1.13 Agent 总评

最适合做游戏 tag 的类目：**Maintenance、Locomotion、Agonistic、Vocal、Gesture**——术语短（多为 1–2 词破折式 *pant-hoot* / *knuckle-walk*）、画面感强、互相正交、玩家无需背景即可理解。Affiliative 与 Sexual 易触发歧义需谨慎。Abnormal 类气质最适配反乌托邦底色，建议作为高阶/隐藏 tag。

---

### 2.2 语言/认知项目术语

#### 2.2.1 Cross-Project Methodology Core Terms 跨项目方法学核心

- cross-fostering — 异种交叉抚养 / 跨物种育成
- rearing condition — 抚养条件
- enculturation — 文化习染 / 文化化抚养
- home-reared subject — 家养受试体
- ASL (American Sign Language) — 美式手语
- GSL (Gorilla Sign Language) — 戈拉手语（Koko 项目）
- lexigram — 词符 / 词形符号
- lexigram keyboard / lexigram board — 词符键盘 / 词符板
- arbitrary symbol — 任意符号
- iconic sign — 象似性手势
- referent — 指涉物 / 指称对象
- symbol-referent mapping — 符号-指涉物映射
- token (Premack plastic token) — 塑料词符
- magnetic-board symbols — 磁板符号（Premack 范式）
- yerkish (Yerkes lexigram language) — 耶基斯词符语
- caregiver / handler / trainer — 抚养者 / 操作员 / 训练员
- companion — 伴习者（Ai 项目用语）

#### 2.2.2 Training Techniques 训练技术

- molding (physical molding of hands) — 塑形 / 手势塑形
- modeling — 示范
- imitation training — 模仿训练
- shaping — 渐进塑造 / 渐进强化
- successive approximation — 逐步逼近
- prompting — 提示
- prompt fading — 提示淡化
- contingent reinforcement — 条件性强化
- differential reinforcement — 区别强化
- operant conditioning — 操作性条件作用
- match-to-sample (MTS) training — 样本匹配训练
- naming / labeling — 命名训练
- request / requesting (mand) — 请求性使用
- comprehension trial vs production trial — 理解试次 / 产出试次
- naturalistic exposure — 自然暴露习得
- daily routine immersion — 日常浸润法
- shuttle / rotation among caregivers — 抚养者轮替

#### 2.2.3 Linguistic Analysis Terms 语言学分析

- vocabulary count — 词汇量
- sign repertoire — 手势库
- spontaneous utterance — 自发产出
- elicited utterance — 诱发产出
- imitative utterance / mimicked sign — 模仿产出
- two-sign combination — 双词组合
- multi-sign string — 多符号串
- combinatorial productivity — 组合生产力
- pivot grammar — 轴心语法
- word order / sign order — 词序 / 手势序
- mean length of utterance (MLU) — 平均话语长度
- novel combination — 新颖组合
- displacement (Hockett's design feature) — 移位性
- semanticity — 语义性
- duality of patterning — 双重分节
- recursion — 递归
- syntax / syntactic structure — 句法
- propositional content — 命题内容
- functional reference — 功能性指涉
- intentional communication — 意图性交流
- pragmatic function — 语用功能
- protodeclarative / protoimperative pointing — 原陈述/原祈使指点

#### 2.2.4 Critique & Skeptic Lexicon 批评史关键词

- Clever Hans effect — 聪明汉斯效应
- ideomotor cueing — 意念运动暗示
- unconscious / inadvertent cueing — 无意识暗示
- experimenter bias — 实验者偏倚
- prompted sign — 被提示手势
- trained mimicry — 训练型模仿
- rote response — 机械反应
- sign reduction (Petitto re-analysis) — 手势缩减（重新核计）
- interruption rate — 打断率
- no syntax / lack of grammatical structure — 无句法
- elaborate act / performance — 精致表演
- conditioned begging — 条件化乞讨
- language-trained ape — 语言训练猿
- ape language controversy / debate — 猿类语言论争
- linguistic discontinuity claim — 语言断层主张
- continuity vs discontinuity — 连续/断层之争
- anecdotal evidence — 轶事证据
- overinterpretation — 过度解读
- attribution error — 归因谬误

#### 2.2.5 Cognitive Paradigms 认知范式

- delayed match-to-sample (DMTS) — 延迟样本匹配
- delayed non-match-to-sample (DNMS) — 延迟非匹配
- delayed response task — 延迟反应任务
- masking task / Matsuzawa numerical masking — 掩蔽任务
- numerical span / numerical recall — 数序回忆 / 数字记忆广度
- working memory span — 工作记忆广度
- eidetic imagery — 遗觉象 / 影像式记忆
- object permanence — 客体永久性
- A-not-B error — A非B错误
- transitive inference (TI) — 传递性推理
- list learning — 列表学习
- categorization task — 范畴化任务
- oddity task — 异常项任务
- conditional discrimination — 条件性辨别
- reversal learning — 反转学习
- inhibitory control (A-not-B, detour task) — 抑制控制
- detour task — 绕道任务
- tube task / cylinder task — 透明管任务
- gaze following — 视线追随
- joint attention — 共同注意
- shared gaze / mutual gaze — 共视 / 互视
- referential pointing — 指涉性指点
- object-choice task — 物体选择任务
- gaze alternation — 视线交替
- theory of mind (ToM) — 心理理论
- false belief task — 错误信念任务
- perspective-taking — 视角采择
- knower-guesser paradigm — 知者-猜者范式
- competitive paradigm (Hare-Tomasello) — 竞争性范式
- mirror self-recognition (MSR) — 镜中自我识别
- mark test / rouge test — 标记测试 / 胭脂测试
- self-directed behavior — 自指行为
- tool use / tool manufacture — 工具使用 / 工具制造
- nut-cracking / hammer-and-anvil — 砸坚果 / 锤砧
- termite-fishing — 钓白蚁
- means-end reasoning — 手段-目的推理

#### 2.2.6 Apparatus & Environment 设备/环境

- operant chamber / Skinner box — 操作箱 / 斯金纳箱
- testing booth — 测试间
- experimental cubicle — 实验小室
- response panel — 反应面板
- key / lever / button — 按键 / 拉杆
- touchscreen panel — 触屏面板
- juice / pellet dispenser — 饮液 / 食粒分发器
- food reward / primary reinforcer — 食物奖赏 / 一级强化物
- token economy — 代币系统
- transfer cage — 转运笼
- home cage vs test cage — 居住笼 / 测试笼
- restraint chair (rhesus paradigm) — 约束椅
- visor / face screen — 面罩
- one-way mirror / observation window — 单向镜
- session log / trial log — 试次记录
- inter-trial interval (ITI) — 试次间隔
- habituation phase — 习惯化阶段
- baseline / probe trial — 基线/探针试次
- blind / double-blind protocol — 单/双盲方案

#### 2.2.7 Subject Identifiers 受试体编码

- subject code (e.g., Ai, Ayumu, Nim, Sarah, Lana) — 受试代号
- cohort / cross-fostered cohort — 队列 / 交叉抚养队列
- naive subject — 朴素受试体
- language-trained subject — 语言训练个体
- proband — 先证个体

#### 2.2.8 Agent 总评

最有 build identity 暗示力的：**lexigram / referent / sign reduction / Clever Hans / prompted sign / cross-fostered / masking task / eidetic imagery / mark test / no syntax / language-trained subject / proband**。它们既贴"被研究的灵长类"（玩家自己就是面板前的受试体），又暗示流派：**Lexigram 系**=符号/编码 build，**Eidetic/Masking 系**=瞬时记忆/速读 build，**Sign-Reduction 系**=被否定/重计 debuff，**Clever-Hans 系**=反提示/欺骗 build。把 *proband* / *cross-fostered* 当玩家头衔，比 "subject" 更冷更专业。

---

### 2.3 Husbandry / Welfare 分级

#### 2.3.1 法定福利与疼痛/胁迫分级

**USDA Animal Welfare Act 疼痛分类（AWA Pain/Distress Category）**
- **Category B** — B 类：未受用群（在册待用、繁育、调理）
- **Category C** — C 类：瞬时性疼痛/无苦痛
- **Category D** — D 类：有疼痛·已镇痛
- **Category E** — E 类：有疼痛·未镇痛（需科学论证）
- Annual Report of Research Facility — 研究设施年度申报
- Pain-relieving drug exception — 镇痛例外条款
- Scientific justification statement — 科学正当性声明

**EU Directive 2010/63 严重度分级（Severity Classification）**
- **Non-recovery** — 非复苏级（全程麻醉不苏醒）
- **Mild** — 轻度
- **Moderate** — 中度
- **Severe** — 重度
- Cumulative severity — 累积严重度
- Prospective severity assessment — 前瞻性严重度评估
- Actual severity reporting — 实际严重度回报
- Upper severity classification — 严重度上限

**IACUC / OLAW / AAALAC 流程术语**
- Institutional Animal Care and Use Committee (IACUC) — 机构动物饲养与使用委员会
- Office of Laboratory Animal Welfare (OLAW) — 实验动物福利办公室
- AAALAC International accreditation — AAALAC 国际认证
- Triennial site visit — 三年一次现场评审
- Designated Member Review (DMR) — 指定委员审查
- Full Committee Review (FCR) — 全体委员审查
- Protocol — 实验方案
- Protocol amendment — 方案修订
- Significant change — 重大变更
- Administrative change — 行政性变更
- Semi-annual program review — 半年度计划审查
- Semi-annual facility inspection — 半年度设施巡检
- Post-approval monitoring (PAM) — 批准后监督
- Annual continuing review — 年度续审
- De novo review — 三年期重审
- Departure / deficiency — 偏离 / 缺陷项
- Minor / significant deficiency — 轻微 / 重大缺陷
- Letter of Assurance — 承诺函
- Institutional Official (IO) — 机构责任官
- Attending Veterinarian (AV) — 在岗主治兽医
- Animal Welfare Assurance (AWA #) — 动物福利保证编号

**3Rs 与人道终点**
- **Replacement** — 替代
- **Reduction** — 减量
- **Refinement** — 优化（精炼）
- Russell & Burch principles — 拉素-柏奇原则
- Humane endpoint — 人道终点
- Score sheet — 评分单
- Welfare assessment grid — 福利评估栅格
- Severity limit — 严重度上限
- Cost-benefit assessment — 损益衡量
- Harm-benefit analysis — 伤害-收益分析

#### 2.3.2 Husbandry SOP 词汇

**笼舍分级（Housing Category）**
- Single housing / individually housed — 单笼饲育
- Pair housing — 配对饲育
- Group housing — 群养
- Harem group — 妻群 / 主雄群
- Breeding troop — 繁殖群
- Bachelor group — 单身雄群
- Mother-infant dyad — 母婴对
- Compatible cohort — 兼容族群
- Social rank / dominance hierarchy — 社会位序 / 等级序列

**笼具种类**
- Home cage — 常驻笼
- Squeeze-back cage / squeeze cage — 挤压笼 / 拘束笼
- Transport box / transfer crate — 转运箱
- Quarantine pen — 检疫栏
- Playpen / run / exercise pen — 活动栏
- Indoor-outdoor run — 内外联通栏
- Gang cage — 联通笼
- Corncrib / corral — 大型户外圈舍
- Tunnel / chute — 通道 / 滑道
- Nest box / perch / swing — 巢箱 / 栖架 / 秋千
- Visual barrier — 视线屏挡
- Floor / cage furniture — 笼内陈设

**日常 SOP**
- Feeding schedule — 投喂时刻表
- Food restriction protocol — 限饲方案
- Water deprivation protocol — 限水方案
- Enrichment delivery / rotation — 富集投放 / 轮换
- Daily health check / daily observation — 日常健康检视
- Body weight monitoring — 体重监测
- Body condition scoring (BCS 1-5) — 体态评分（1-5 级）
- Blood draw / venipuncture — 采血 / 静脉穿刺
- Sedation / chemical restraint — 镇静 / 化学拘束
- Anesthesia induction — 麻醉诱导
- Pole-and-collar training — 杆-项圈拘束训练
- Positive reinforcement training (PRT) — 正向强化训练
- Cage-side examination — 笼旁检查
- Transfer — 转笼 / 转栏
- Introduction (intro) — 引入（合笼）
- Pairing — 配对
- Separation — 分笼
- Reunion — 复合
- Census / daily count — 笼内点数 / 日清点
- Sanitation cycle — 消毒周期
- Bedding change — 垫料更换
- Cage wash — 笼洗

**富集五大类（Enrichment Categories）**
- **Social enrichment** — 社群富集（contact / non-contact / grooming contact）
- **Occupational / cognitive enrichment** — 工作 / 认知富集（puzzle feeder, foraging board, touchscreen task）
- **Physical enrichment** — 物理富集（perch, climbing structure, substrate, manipulanda）
- **Sensory enrichment** — 感官富集（visual, auditory, olfactory, tactile, gustatory）
- **Nutritional / foraging enrichment** — 食物 / 觅食富集（scatter feed, frozen treat, browse, forage substrate）

**异常行为 / 刻板行为分类**
- Motor stereotypy — 运动型刻板
- Pacing — 踱步
- Rocking — 摇摆
- Swinging — 摆荡
- Bouncing — 弹跳
- Flipping / somersaulting — 翻滚
- Self-directed behavior — 自向行为
- Hair-pulling / plucking — 拔毛
- Self-clasping — 自抱
- Saluting / eye-poking / periorbital contact — 戳眼 / 眶周触
- Self-oral behavior — 自咬 / 吮指
- Self-injurious behavior (SIB) — 自伤行为
- Regurgitation and reingestion (R/R) — 反流-再食
- Coprophagy — 食粪
- Appetitive abnormal behavior — 摄食型异常
- Withdrawn behavior — 退缩行为
- Floating limb — 漂浮肢
- Alopecia score (BMC scale) — 脱毛评分（BMC 量表）
- SIB scoring system — 自伤评分系统
- Standardized ethogram — 标准化行为谱

#### 2.3.3 个体 record-keeping

**笼卡（Cage Card）字段**
- Subject ID / Animal ID — 个体编号
- Species (e.g., *Macaca mulatta*) — 物种
- Sex — 性别
- DOB (date of birth) — 出生日
- Source / origin — 来源
- Tattoo / microchip / ear notch — 刺青 / 芯片 / 耳缺
- Body weight — 体重
- Diet code — 饲料代码
- Protocol # / PI — 方案号 / 课题负责人
- Pain category — 疼痛分类
- Hazard label — 危害标签
- Restricted handling — 限制操作标识

**群落数据库（Colony Database）字段**
- Pedigree — 谱系
- Sire / dam — 父本 / 母本
- Founder — 始祖
- Generation (F0/F1/F2…) — 世代
- Hybrid status — 杂交状态
- MHC haplotype — MHC 单倍型
- Genotype / phenotype — 基因型 / 表型
- Reproductive status — 繁殖状态
- Studbook number — 谱牒号
- Acquisition record — 入册记录
- Disposition record — 处置记录

**临床记录**
- Clinical record / medical chart — 临床档案
- Incident report — 事件报告
- Adverse event (AE) — 不良事件
- Serious adverse event (SAE) — 严重不良事件
- Behavioral observation log — 行为观察日志
- Wound chart — 创伤图
- Necropsy report — 尸检报告
- Treatment order — 处置医嘱
- Concomitant medication log — 并用药物记录
- Deviation report — 偏离报告
- Departure from protocol — 方案偏离

#### 2.3.4 风险与隔离分级

- Quarantine period (typ. 90-day) — 检疫期（典型 90 天）
- Acclimation period — 适应期
- Conditioning — 调驯
- Sentinel animal — 哨兵动物
- Soiled-bedding sentinel — 污垫料哨兵
- Specific pathogen free (SPF) — 特定病原体清净
- Expanded SPF (eSPF) — 扩展 SPF
- Conventional colony — 常规群
- Biocontainment — 生物围控
- Biosafety Level 2 / 3 / 4 (BSL-2 / 3 / 4) — 生物安全二/三/四级
- ABSL-2 / 3 / 4 (Animal BSL) — 动物生物安全 X 级
- BSL-2+ / enhanced — 二级强化
- Tuberculin skin test (TST) — 结核菌素皮试
- Intrapalpebral injection — 眼睑内注射
- Mammalian Old Tuberculin (MOT) — 哺乳类陈结核菌素
- TB status / TB-negative / TB-suspect / TB-reactor — 结核状态 / 阴 / 疑 / 阳
- Herpes B (Macacine herpesvirus 1) status — B 疱疹病毒状态
- SRV / STLV / SIV screening — 猴反转录/T 淋/免疫缺陷病毒筛查
- Exclusion list — 排除清单
- Vendor approval — 供方资格
- Shipment cohort — 同船批次
- Isolation room — 隔离间
- PPE tier — 个人防护等级

#### 2.3.5 Agent 总评

最适合做"文牍化 mechanism tag"的是 **USDA B/C/D/E 类**、**EU mild/moderate/severe/non-recovery**、**SPF / TB-reactor / sentinel 状态码**、**BCS 1-5** 与 **alopecia / SIB 评分**——单字母或数级编码，自带印章感，又把"风险等级"和"未受理→已处置"的状态机直接挂进 mechanic。次推 **protocol amendment / significant change / deviation report** 一组，天然契合"修订-偏离"叙事节拍。

---

### 2.4 社会行为 / Vocalization 分类

#### 2.4.1 社会结构与等级

**Hierarchy / 等级**
- alpha / beta / gamma — 头领 / 次领 / 三号
- peripheral male — 边缘雄 / 外围雄
- subadult — 亚成体
- low-ranking / high-ranking — 低位序 / 高位序
- dominance hierarchy — 优势序列
- linear hierarchy — 线性等级
- despotic vs egalitarian — 专制型 / 平权型
- nepotistic rank — 裙带位序
- inherited rank — 继承位序（母系传袭）
- rank reversal — 位序翻转
- pant-grunt receiver — 喘鸣接受者（位序标志）

**Coalition / 联盟**
- coalition — 联盟
- alliance — 同盟
- triadic interaction — 三方互动
- triadic awareness — 三方意识（de Waal）
- bridging coalition — 桥接联盟
- revolutionary coalition — 革命联盟
- conservative coalition — 守成联盟
- kingmaker — 造王者
- coalitionary support — 联盟支援

**Group structure / 群体结构**
- fission-fusion — 分合社会 / 离合社群
- multi-male multi-female — 多雄多雌群
- harem — 后宫群 / 一雄多雌
- bachelor group — 单身群
- matriline — 母系
- patriline — 父系
- philopatry — 出生地恋（雌恋 / 雄恋）
- natal group — 出生群
- dispersal — 扩散 / 迁出

#### 2.4.2 个体角色

- dominant / subordinate — 优势者 / 从属者
- consort / consortship — 配偶伴随
- mate-guarding — 配偶守护
- allomother / aunt behavior — 代母 / 阿姨行为
- nursemaid — 保姆
- kin / non-kin — 亲属 / 非亲属
- bystander — 旁观者
- aggressor / victim — 加害者 / 受害者
- third-party — 第三方
- policing individual — 调停者 / 警察个体
- impartial intervention — 中立干预

#### 2.4.3 发声 Vocalization

**Chimp / 黑猩猩**
- pant-hoot — 喘喊 / 喘吼（含 intro / build-up / climax / let-down 四段）
- food call / rough grunt — 食物叫 / 粗哑咕哝
- pant-grunt — 喘鸣（屈服信号）
- copulation call — 交配叫
- alarm call — 警报叫
- scream — 尖叫
- victim scream / aggressor scream — 受害尖叫 / 攻击尖叫
- whimper — 呜咽
- distress call — 困扰叫
- waa-bark — 哇吠
- soft hoo — 轻喔

**Bonobo / 倭黑猩猩**
- peep — 嘀声
- high-hoot — 高喔
- contest hoot — 竞争喔
- copulation peep — 交配嘀

**Macaque / 猕猴**（Gouzoules 体系）
- coo — 咕鸣（联络）
- grunt — 咕哝
- girney — 唧鸣（母 → 婴）
- noisy scream / arched scream / tonal scream / pulsed scream / undulated scream — 五类尖叫

**Vervet / 长尾猴**（Seyfarth & Cheney）
- leopard alarm — 豹警报
- eagle alarm — 鹰警报
- snake alarm — 蛇警报
- referential signal — 指称信号
- functional reference — 功能指称

**通用类目**
- graded call — 渐变叫声
- categorical call — 离散叫声
- audience effect — 受众效应
- deceptive call — 欺骗性叫
- vocal learning — 鸣声学习
- duet — 二重唱（长臂猿）
- contact call — 联络声
- lost call — 失散叫
- recruitment call — 召集叫

#### 2.4.4 手势与姿态

**Gesture taxonomy / 手势分类**（Hobaiter & Byrne）
- tactile gesture — 触觉手势
- visual gesture — 视觉手势
- audible gesture — 听觉手势
- intentional gesture — 意向性手势
- ASOR (apparently satisfactory outcome) — 满意结果（手势目标达成）
- means-end dissociation — 手段-目的分离

**Display / 展示**
- charging display — 冲撞展示
- bipedal display — 二足直立展示
- branch dragging — 拖枝
- buttress drumming — 板根击鼓 / 树根鼓
- piloerection / hair erection — 毛发竖立
- swagger — 大摇大摆
- arm-wave — 挥臂
- chest-beat — 击胸（gorilla）

**Facial / 面部**
- play face / relaxed open-mouth — 玩耍脸 / 松弛张口
- bared-teeth display — 露齿展示（来源：恐惧 / 屈服 / 类笑）
- silent bared-teeth — 静默露齿
- lip-smack — 咂唇
- teeth-chatter — 牙颤
- fear grimace — 恐惧呲牙
- pout face — 噘嘴脸
- yawn threat — 呵欠威胁（露犬齿）
- duck face / funnel lips — 漏斗唇

**Posture / 姿态**
- presenting — 呈现（性 / 屈服）
- crouch — 蹲伏
- ventro-ventral embrace — 腹腹拥抱
- mounting — 骑跨
- GG-rubbing — 生殖器摩擦（bonobo）
- huddle — 蜷靠
- begging hand — 乞食手势

#### 2.4.5 agonistic / affiliative

**Aggression / 攻击**
- chase — 追逐
- attack — 攻击
- displace / supplant — 替位 / 驱位
- threat — 威胁
- redirected aggression — 转向攻击
- coalitionary aggression — 联盟攻击
- lethal raid — 致命突袭（chimp 边界巡逻）
- border patrol — 边界巡逻
- infanticide — 杀婴

**Affiliation / 亲和**
- grooming / allogrooming — 理毛 / 互理毛
- grooming hand-clasp — 理毛搭手（Mahale 文化标志）
- food sharing / tolerated theft — 食物分享 / 容忍盗取
- meat sharing — 肉分享
- embracing / hugging — 拥抱
- kissing — 亲吻
- peering — 凝视乞讨（bonobo 母婴）
- reassurance — 安抚
- reunion — 重聚

**Reconciliation / 和解**（de Waal）
- reconciliation — 和解
- consolation — 安慰
- valuable relationship hypothesis — 重要关系假说
- post-conflict affiliation — 冲突后亲和
- explicit reconciliation — 显性和解（kiss & embrace）
- third-party affiliation — 第三方亲和

**Submission / 屈服**
- pant-grunt — 喘鸣
- bobbing — 点头屈服
- retreat — 退避
- avoidance — 回避
- screaming submission — 尖叫屈服

**Political / 政治**（de Waal *Chimpanzee Politics*）
- political behavior — 政治行为
- strategic deception — 策略性欺骗
- machiavellian intelligence — 马基雅维利智力
- divide and rule — 分而治之
- reciprocity — 互惠
- contingent cooperation — 条件合作
- grudge — 记仇
- food-for-sex / grooming-for-support — 食换性 / 理毛换支援

#### 2.4.6 学习与文化

**Mechanisms / 机制**
- social learning — 社会学习
- imitation — 模仿
- emulation — 仿效（结果模仿，非动作模仿）
- stimulus enhancement — 刺激强化
- local enhancement — 局部强化
- response facilitation — 反应促进
- teaching — 教导（罕见，Boesch）
- scaffolding — 支架式教学
- conformist learning — 从众学习
- ratchet effect — 棘轮效应（Tomasello）
- cumulative culture — 累积文化

**Tradition / 传统**
- local tradition — 地方传统
- cultural variant — 文化变体
- material culture — 物质文化
- tool kit — 工具组

**Site-specific / 各地特色**
- **Taï** (科特迪瓦): nut-cracking with hammer-and-anvil — 锤砧砸果
- **Mahale** (坦桑): grooming hand-clasp — 理毛搭手；leaf-clipping — 撕叶
- **Bossou** (几内亚): stone tool nut-cracking — 石器砸果；algae scooping — 捞藻
- **Sonso / Budongo** (乌干达): leaf-sponge — 叶海绵（取水）；moss-sponge — 苔海绵
- **Gombe** (坦桑): termite-fishing — 钓白蚁（Goodall）
- **Fongoli** (塞内加尔): spear-hunting bushbabies — 矛刺婴猴
- **Kibale** (乌干达): honey-dipping — 蘸蜜

#### 2.4.7 Agent 总评

最具旗号张力的是 **kingmaker**（造王者）、**peripheral male**（边缘雄）、**coalitionary** / **triadic awareness**（三方意识）、**consoler**（安慰者）、**policing individual**（调停者）、**ratchet** / **conformist**（棘轮 / 从众）、**lethal raid**（致命突袭）、**bared-teeth**（露齿）、**pant-grunt receiver**（喘鸣接受者）、**grooming hand-clasp**（搭手者）、**referential**（指称者）、**deceptive call**（欺骗鸣）。它们各自携带"权力 / 调停 / 边缘 / 文化传承 / 暴力 / 屈服 / 欺骗"的清晰角色色彩，正好对应 build 身份的"旗号"——比 alpha/beta 这种烂大街词更稀有更有研究气味。

---

## 3. 综合：三层结构候选（Claude 主笔）

### 3.1 调研意外：取样方法学 ≈ Bazaar 触发词汇

四组报告里**取样方法**词族（Altmann 1974 体系）天然落到我之前自己造的 `every(N keys) / on_key / on_word_end` 之上，且更严谨：

| 真实术语 | 中文 | 落到游戏 |
|---|---|---|
| **state behavior** | 状态行为 | passive / aura |
| **event behavior** | 事件行为 | 一次性触发 |
| **focal sampling** | 焦点取样 | 锁定单一技能/自己 fire |
| **scan sampling** | 扫描取样 | 每词末 tick 全部 |
| **ad libitum** | 自由观察 | 任意事件都监听 |
| **instantaneous** | 瞬时取样 | 每键 |
| **one-zero** | 零一取样 | 每 N 键判一次有/无 |
| **bout** | 行为单元 | 连发 / 连击链 |
| **inter-event interval** | 事件间隔 | cooldown 节拍 |

**意义**：触发机制 in-world 化——不是神秘游戏机制，是机构按 Altmann 1974 监测玩家。MOKO 存在感凭空多一层"我在被以学术规范监测"的恐怖。

### 3.2 Archetype 旗号族（决定 build 身份 · 来自 ethogram 一级类目）

| 候选 tag | 来源 | build 暗示 |
|---|---|---|
| **forage 觅食** | 维持类 | 资源累积流 |
| **groom 理毛 / allogroom 互理毛** | 亲和类 | 邻居互益 / aura 流 |
| **vocal 鸣叫 / pant-hoot 喘啸** | 发声类 | 远程触发 / 广播流 |
| **display 展示 / charge 冲撞** | 对抗类 | 单次爆发流 |
| **submit 屈服 / pant-grunt 喘嗯** | 屈服类 | 反向计数 / 低值蓄势流 |
| **coalition 联盟 / triadic 三方** | 政治类 | 多键协同流 |
| **tool 工具** | 文化类 | 自定义/制造流 |
| **stereotypy 刻板** | 异常类 | 自循环 / endless tag |

### 3.3 Mechanism 角色族（决定卡位/槽位 · 来自 enrichment 五分类）

| Enrichment 类 | mechanism 暗示 | Bazaar 类比 |
|---|---|---|
| **social 社群** | 邻居/群体互动 | aura |
| **occupational 工作** | 改变规则/任务 | meta-rule item |
| **physical 物理** | 直接增减数值 | weapon |
| **sensory 感官** | 触发/感知扩展 | trigger item |
| **nutritional 食物** | 资源转换 | consumable |

### 3.4 Cross-cutting "传说"级特殊词（极少数词条专属）

每个自带叙事钩子，留给后期 boss / 传说词条 / 遗物的唯一标签：

`kingmaker 造王者` · `sentinel 哨兵` · `R/R 反流再食` · `mark-test 镜子测试` · `eidetic 遗觉` · `Clever-Hans 聪明汉斯` · `lexigram 词符` · `sign-reduction 手势缩减` · `cross-fostered 异种交叉抚养` · `proband 先证者` · `grooming hand-clasp 理毛搭手` · `displaced 被驱替的` · `bared-teeth 露齿者`

---

## 4. 决议与待决问题

1. **三层结构 vs 单层** · ✅ **2026-05-11 决议：形态 C 混合**。`trigger` 是结构化必填字段（引擎调度用）；`archetype + mechanism` 合并为扁平 `tags` 多选池（运行时无差别，仅设计文档标注 ★ 旗号 / ◆ 角色 做参考）。`effect` 是函数表达式。词条 schema 形态：
   ```ts
   { id, trigger, tags: [...], effect }
   ```
   Why：Bazaar 实际也是混合（cooldown 结构化 / tag 扁平）；trigger 与 metadata 维度不同，混在一起会让"tags.includes('vocal')"和"tags.includes('scan')"语义冲突；新 tag 族（proband / Clever-Hans 等）以后直接进池，不用改 schema。
2. **8 个 archetype 用 ethogram 原词 vs 偏文牍同义词** · ⏳ 待决：`groom`/`display` 直接用，还是改成"互理"/"展示"这类去英文味的本地词？
3. **stereotypy 的位置** · ✅ **2026-05-11 决议：否**——异常行为（踱步/反流/拔毛/自伤/浮肢/戳眼/敬礼式刻板/全身刻板/食粪 等 10 项）全部并入主词条池，不做 endless-only gating。理由：用户论述的"猴子动作伪装层"假设下，玩家看到"踱步"和"冲撞"在 surface 上没本质区别——都是"flashy 技能名"，灵长研究 frame 已经在 Ch.1 通过猴子动作 register 整体上桌（详 §2.16.1 设计纪律的反直觉执行）。endless 与早期的区别由**苔海绵这类 cultural-transmission 元素**承载，不靠 stereotypy gating。
4. **覆盖率验证** · ✅ **2026-05-11 决议：迁移哲学 = C "完全重做"**
   - 老系统仅作灵感参考，新 123 词条池**全部从零设计 mechanic**。不做 1:1 复刻 (A)，不强求"保概念" (B)。
   - 理由：新系统的 in-world frame 已发生根本转向（MOKO 奖励低语义输入），与旧 6-phase 管线的设计假设不兼容；强迁老招会引入半古半新的怪招。
   - **4.2-4.5 子问题自动消解**：
     - 不需迁移目标分级（无迁移）
     - 不需 mechanic gap 处置（gap 只在迁移视角下存在；新设计时只问"想不想要这个 mechanic"）
     - 不需 55 行映射表（无对位关系）
   - **新的真正问题**：Phase 1 优先实装 ~50 / 123 的**挑选准则**——按 archetype 覆盖？按 mechanic 多样性？按叙事 anchor？此为 4.6 新待决。
   - **旧系统处置**：保留 `.bak/2026-05-11/` 备份不动；新系统稳定后旧 affix 表正式标 deprecated；旧 affix 名留作 narrative / flavor 引用素材（如某遗物可注释"前用代号: Fusion"）。
5. **触发词汇精简** · ✅ **2026-05-11 决议**：详见 §5 Trigger 系统规格。原型期 6 个核心 trigger（passive / on_key / on_word_end / on_self_fire / on_fire(filter) / every_N_keys），Phase 2 加 3 个扩展（on_window_mode / on_sequence / one_per_window）。`on_fire(filter)` 的 filter 维度支持 **tag / posRel / resource**，分别承载 behavior sampling / focal subgroup / 资源 sampling 三种采样语义（全部沿用现有代码：posRel 用 keyboardTopology；resource 用 Resonance/Connector/Amplifier 已实现的过滤机制；tag 是新增维度）。on_window_mode 用命名模式枚举（Option A）参数化，初版 3 个 pattern（rhythm_stable / hand_alternation / bpm_lock）。

---

## 5. Trigger 系统规格（决议汇总）

> 来源：2026-05-11 讨论 Altmann 1974 采样方法学如何对位到游戏 trigger。前置 §3.1 是观察，本节是规范。

### 5.1 原型期最小集（6 个 · 必装）

| Trigger | 采样方法对位 | 语义 |
|---|---|---|
| `passive` | ad libitum | state / aura，永远生效 |
| `on_key` | instantaneous / point | 每次击键 |
| `on_word_end` | scan | 每词末 |
| `on_self_fire` | focal animal | 自己触发时 |
| `on_fire(filter)` | behavior / focal subgroup / resource / event-type sampling | 监听 fire 事件，filter 多维正交组合（详 §5.1.1） |
| `every_N_keys` | (自时钟，非采样源) | 自定节拍 |

**评估**：可承载旧 55 词条池约 70-80% 的触发模式。原型阶段不必加更多。

**实装状态（2026-05-12）**：
- TriggerSpec / EffectSpec 类型 → `src/src/data/affixV2Trigger.ts` ✅
- matchFireFilter（5 维 AND 聚合）→ `src/src/systems/fireFilter.ts` ✅
- evaluateTrigger（6 个 Phase 1 trigger）→ `src/src/systems/affixV2Trigger.ts` ✅
- AffixV2Definition.trigger/effect 字段 → 已挂；默认 passive/noop
- 单测 → 32 tests pass (fireFilter 13 + affixV2Trigger 19)

#### 5.1.1 `on_fire(filter)` 的 filter 维度

filter 是正交组合的字段集，每个维度独立、可叠加：

| filter 维度 | 语义 | 现有代码 | 备注 |
|---|---|---|---|
| `tag:X` | behavior sampling — 来源 skill 持有 tag X | **新增**（tag 系统是新的） | 词条标签系统 |
| `posRel:Y` | focal subgroup — 来源 skill 在键盘上的位置关系 | `keyboardTopology.ts` ✅ | hasRelation 函数 |
| `resource:Z` | resource sampling — 来源 skill 产出资源 Z | `affixTriggerOrchestrator.ts:435` (Resonance) · `ClassResourceFilter.ts` ✅ | |
| `is_crit:bool` | event-type — 来源 fire 是否暴击 | `TriggerResult.isCrit` (Fury 已用) ✅ | |
| `stack_state:full \| partial` | event-type — 来源 fire 是否触发满层释放 | `onStackEffectTriggered` callback ✅ | StackingRelicBehaviors |

正交组合示例：
- `on_fire(resource:multiplier, is_crit:true)` — 任意倍率资源技能暴击时触发
- `on_fire(posRel:adjacent, stack_state:full)` — 邻居技能满层释放时触发
- `on_fire(tag:burn, is_crit:false)` — burn 类技能未暴击时触发（"反向触发"流派）

**关键观察**：5 个 filter 维度里 **4 个用现有代码**，新代码只在 `tag` 维度——意味着新 trigger 系统的实施复杂度比想象中低得多。

**Tag 系统接口规格**：详见 `affix-rewrite-tag-system.md`——定义 25 个 tag 词表、TagQuery API、FireFilter 匹配函数、Effect 缩放接口。

### 5.2 Phase 2 扩展（3 个 · 后期加）

| Trigger | 采样方法对位 | 语义 |
|---|---|---|
| `on_window_mode(pattern, ...)` | predominant activity | 最近窗口主导模式命中 |
| `on_sequence(pattern)` | sequence | 最近事件序列匹配模式 |
| `one_per_window(N)` | one-zero | N 键窗口内最多触发一次（限流） |

注：Focal subgroup 取消独立 trigger——通过 §5.1 `on_fire(filter)` 的 `posRel` 维度承载（沿用现有键盘拓扑 PositionRelation 系统），不引入新 schema。

`on_window_mode` 是 Phase 2 最高优先级——承载用户 12 个 input-pattern detector 中的 8 个；没它整个"MOKO 奖励低语义输入"frame 落不进 engine。

### 5.3 on_window_mode 参数化（命名模式枚举 · Option A）

#### 5.3.1 决策依据

候选方案：
- **A 命名模式枚举**：固定 ~15 个 pattern，每个有专属分析器
- B 表达式：`stddev(intervals) < 50ms` 自由组合，需 expression evaluator
- C 统计 + 阈值：`stat='rhythm_std', op='<', value=50`

选 A 的理由：(1) pattern 集合在打字游戏里小且枚举得完；(2) 每个 pattern 一个专门分析器，性能可优化、行为可预测、balance 易调；(3) 不引入 expression evaluator 的工程负担。

#### 5.3.2 模式注册表（初版）

| Pattern ID | 测量 | 默认窗口 | 默认阈值 | 主要承载词条 |
|---|---|---|---|---|
| `rhythm_stable` | std(inter-key intervals) | 20 keys | std < 50ms | 枝间跃迁 |
| `hand_alternation` | L-R 交替比 | 20 keys | rate > 0.7 | 双臂摆动 |
| `bpm_lock` | mean ≈ target BPM 且抖动小 | 30 keys | jitter < 30ms | 拍击 · 鼓点 |
| `accel` | inter-key interval 单调下降 | 20 keys | 线性趋势 < 0 | (Phase 3 扩展) |
| `decel` | inter-key interval 单调上升 | 20 keys | 线性趋势 > 0 | (Phase 3 扩展) |
| `same_hand_streak` | 单手连击占比 | 15 keys | hand_ratio > 0.85 | (Phase 3 扩展) |

Phase 2 启用前 3 个 (rhythm_stable / hand_alternation / bpm_lock)，足以承载前述 8 个 input-pattern 词条。后 3 个 Phase 3 视需要加。

#### 5.3.3 schema 形态

```ts
type WindowModeTrigger = {
  type: 'on_window_mode'
  pattern: PatternId             // 必填
  window?: { size: number, unit: 'keys' | 'seconds' | 'words' }  // 可选，覆盖默认
  threshold?: number             // 可选，覆盖 pattern 默认
}
```

#### 5.3.4 词条示例

```ts
// 枝间跃迁（使用 pattern 默认参数）
{
  id: 'branch_jump',
  name: '枝间跃迁',
  trigger: { type: 'on_window_mode', pattern: 'rhythm_stable' },
  tags: ['locomotion', 'rhythm'],
  effect: 'multiplier_growth += 0.5'
}

// 拍击（自定义更严的 BPM 锁定）
{
  id: 'clap',
  name: '拍击',
  trigger: {
    type: 'on_window_mode',
    pattern: 'bpm_lock',
    window: { size: 40, unit: 'keys' },
    threshold: 20  // 比默认 30 更严
  },
  tags: ['display', 'rhythm'],
  effect: 'multiplier.no_decay = true'
}
```

#### 5.3.5 实现要求

- 每个 pattern 一个 pure function 分析器：`(window: Event[]) => { matched: boolean, intensity?: number }`
- 分析器无副作用、可缓存
- 检测频率：默认每 5 键检查一次（不必每键），可在 pattern 定义里覆盖
- 添加新 pattern = 加新分析器 + 注册表条目（不改 trigger schema）

### 5.4 12 个 input-pattern detector 的 trigger 分解

| 词条 | trigger | 备注 |
|---|---|---|
| 枝间跃迁 | `on_window_mode(rhythm_stable)` | Phase 2 |
| 双臂摆动 | `on_window_mode(hand_alternation)` | Phase 2 |
| 捡果 | `on_word_end` + filter(length≤3) | 原型期可做 |
| 不停枝 | `on_sequence(error → recover within 1s)` | Phase 2 |
| 跨藤 | `on_word_end` + passive state check | 原型期可做 |
| 短视聚焦 | UI 行为（gaze 追踪） | **特殊·暂缓** |
| 快速摘取 | `on_word_end` + filter(settle<T) | 原型期可做 |
| 拍击 | `on_window_mode(bpm_lock)` | Phase 2 |
| 香蕉雨 | `on_sequence(no_error × N)` | Phase 2 |
| 贪食 | tag-based scaling | **不是 trigger** |
| 鼓点 | `on_window_mode(bpm_lock)` | Phase 2 |
| 采集路线 | tag-based scaling | **不是 trigger** |

8/12 由 Phase 2 trigger 承载；2/12 是 tag scaling（不需要 trigger 字段）；1/12 原型期可做；1/12 暂缓。

---

## 6. 调研来源

### 5.1 Ethogram & 取样方法学
- [Altmann 1974 Observational Study of Behavior: Sampling Methods](https://www.originalwisdom.com/wp-content/uploads/bsk-pdf-manager/2019/03/Altmann_1974_Observational-Study-of-Behavior.pdf)
- [Animal Behavior Society Sampling Workshop](https://www.animalbehaviorsociety.org/web/downloads/Sampling%20Animal%20Behavior-SM.pdf)
- [Wisconsin NPRC C. jacchus sample ethogram](https://primate.wisc.edu/primate-info-net/callicam/c-jacchus-sample-ethogram/)
- [Macaca fascicularis Systematic Ethogram (PLOS ONE)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0037486)
- [Ethogram and Ethnography of Mahale Chimpanzees (Nishida)](https://www.jstage.jst.go.jp/article/ase1993/107/2/107_2_141/_article)
- [ChimpVLM Ethogram (Goodall 1989 basis)](https://arxiv.org/html/2404.08937v1)
- [The Meanings of Chimpanzee Gestures (Hobaiter & Byrne)](https://www.cell.com/current-biology/fulltext/S0960-9822(14)00667-8)
- [Great Ape Dictionary](https://greatapedictionary.ac.uk/gesture-videos2/)

### 5.2 语言/认知项目
- [Nim Chimpsky - Wikipedia](https://en.wikipedia.org/wiki/Nim_Chimpsky)
- [Can an Ape Create a Sentence? (Terrace 1979, Science)](http://www.columbia.edu/cu/psychology/primatecognitionlab/References/cananapecreateasentence.pdf)
- [Project Nim Revisited | Columbia News](https://news.columbia.edu/news/chimpanzee-language-project-nim-herbert-terrace)
- [Kanzi - Wikipedia](https://en.wikipedia.org/wiki/Kanzi)
- [Washoe (chimpanzee) - Wikipedia](https://en.wikipedia.org/wiki/Washoe_(chimpanzee))
- [Working memory of numerals in chimpanzees (Inoue & Matsuzawa)](https://langint.pri.kyoto-u.ac.jp/ai/en/publication/SanaInoue/Inoue2007.html)
- [Primate Memory | Tetsuro Matsuzawa - Inference Review](https://inference-review.com/article/primate-memory)
- [Koko (gorilla) - Wikipedia](https://en.wikipedia.org/wiki/Koko_(gorilla))
- [Clever Hans - Wikipedia](https://en.wikipedia.org/wiki/Clever_Hans)
- [Gallup on Mirror Test (PDF)](https://courses.washington.edu/ccab/Gallup%20on%20mirror%20test.pdf)
- [Operant conditioning chamber - Wikipedia](https://en.wikipedia.org/wiki/Operant_conditioning_chamber)
- [Chimpsky, not Chomsky - Salon](https://www.salon.com/2023/06/25/chimpsky-not-chomsky-did-nim-the-chimpanzee-actually-learn-american-sign-language/)

### 5.3 Husbandry & Welfare
- [USDA Pain & Distress Categories — University of Kentucky](https://research.uky.edu/division-laboratory-animal-resources/usda-pain-distress-categories)
- [Categorizing Animal Pain or Distress (APHIS Tech Note)](https://www.aphis.usda.gov/sites/default/files/ac-tech-note-categorizing-animal-pain-or-distress.pdf)
- [EU Directive 2010/63 — EUR-Lex](https://eur-lex.europa.eu/eli/dir/2010/63/oj/eng)
- [The IACUC — NIH OLAW](https://olaw.nih.gov/resources/tutorial/iacuc.htm)
- [AAALAC Guidance Statements](https://www.aaalac.org/accreditation-standards/guidance-statements/)
- [ASP — Introduction to environmental enrichment for primates](https://asp.org/welfare/environmental-enrichment/)
- [NIH OACU — Behavioral Management of Nonhuman Primates](https://oacu.oir.nih.gov/system/files/media/file/2024-02/d4b_behavioral_management_of_nonhuman_primates.pdf)
- [Nonhuman Primate Abnormal Behavior — Etiology, Assessment, Treatment (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9586202/)
- [Stereotypic Behavior in NHPs — ILAR Journal](https://academic.oup.com/ilarjournal/article/55/2/284/644271)
- [IPS International Guidelines for NHPs](http://internationalprimatologicalsociety.org/wp-content/uploads/2021/10/IPS-International-Guidelines-for-the-Acquisition-Care-and-Breeding-of-Nonhuman-Primates-Second-Edition.pdf)
- [Three Rs (animal research) — Wikipedia](https://en.wikipedia.org/wiki/Three_Rs_(animal_research))
- [NC3Rs — The 3Rs](https://nc3rs.org.uk/who-we-are/3rs)
