# Affix 系统 · 完整命名池 v1

> Created: 2026-05-11
> Status: 命名草表完整，mechanic 字段大多为占位（待逐个实现）
> 关联文档: `docs/design/affix-rewrite-research.md`
> 决议来源: 2026-05-11 会话

---

## 0. 总览与落位规则

ethogram §2.1.2-§2.1.11 共 144 条候选词（已剔除 Affiliative/Sexual 全段、抽象 category 词、与现有附魔冲突词），按"动作具体度"分配到三层：

| 层 | 落位规则 | 数量 |
|---|---|---:|
| **词条** | 具体可见的动作 / 工具操作 / 异常表现 | 123 |
| **附魔（新增）** | "过于基础"的状态/移动方式词，作为被训练的 baseline behavioral mode | 21 |
| **附魔（既有）** | 已 locked 的 9 项抽象行为类目 | 9 |
| **遗物（追加）** | chimp 田野文化具体工具名（非 §2.1.10 字面词） | ~24 |
| **遗物（既有）** | 受试体真名 / 历史案例档案 | ~22 |

资源池（6 项）+ 触发器池（10 项）见 `affix-rewrite-research.md`，不在本文件重复。

---

## 1. 词条池 · 123 项

> 每条按 `ID · 中文名 · 英文原词 · 备注` 排列。  
> Status: 大多 `placeholder`；mechanic 在逐个实现时补 trigger / effect。  
> 末列 `Phase`：`P1` = 原型期实现 · `P2` = 二期扩展。
>
> **Section tag**（2026-05-12 决议）：每个 §1.X 段下所有词条共享同一个 section tag = 段名（详 `affix-rewrite-tag-system.md` §1.1）。  
> 初版每词条 `tags: ['<section>']` 长度恰好 1。origin / class / mechanic 三个 namespace 推迟，词条暂不挂这三族 tag。

### 1.1 §2.1.2 Maintenance · 维持性行为（12） · `tags: ['maintenance']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `still` | 静止 | rest | 状态/aura 候选 | P1 |
| `stretch` | 伸展 | stretch | 准备型 | P2 |
| `yawn` | 哈欠 | yawn | 周期触发 | P2 |
| `scratch` | 搔抓 | scratch | 高频小动作 | P1 |
| `self_groom` | 自身理毛 | self-groom | self-care passive | P1 |
| `auto_groom` | 自理 | auto-groom | 同上变体 | P2 |
| `drink` | 饮水 | drink | 资源转化 | P1 |
| `feed` | 进食 | feed | 基础产出 | P1 |
| `chew` | 咀嚼 | chew | 持续小额 | P1 |
| `masticate` | 细嚼 | masticate | 慢速大额 | P2 |
| `swallow` | 吞咽 | swallow | 单次完成 | P2 |
| `regurgitate` | 反刍 | regurgitate | 缓存重触发 | P2 |
| `nest_build` | 筑巢 | nest-build | 防御/aura | P2 |
| `wadge` | 残渣团 | wadge | 累积型 | P2 |

注：~~觅食~~ 已是附魔。  
日巢 / 夜巢两个变体已移至遗物。

### 1.2 §2.1.3 Locomotion · 运动姿态（15） · `tags: ['locomotion']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `brachiate` | 臂荡 | brachiate | 邻位跨越 | P1 |
| `semi_brachiate` | 半臂荡 | semi-brachiate | 短跨变体 | P2 |
| `climb` | 攀爬 | climb | 升位 | P1 |
| `descend` | 下行 | descend | 降位 | P1 |
| `cling` | 紧贴 | cling | 锁定型 passive | P1 |
| `vert_clinging_leaping` | 直立跃式 | vertical clinging and leaping | 跳位+落位组合 | P2 |
| `leap` | 跳跃 | leap | 跨格 | P1 |
| `drop` | 坠落 | drop | 紧急降位 | P2 |
| `bridge` | 搭桥 | bridge | 连接邻位 | P1 |
| `hang` | 悬挂 | suspensory hang | 暂停型 passive | P2 |
| `arboreal_travel` | 树栖移动 | arboreal travel | 上层移动 | P2 |
| `terrestrial_travel` | 地栖移动 | terrestrial travel | 下层移动 | P2 |
| `sway` | 摇晃 | sway | 节奏 trigger | P1 |
| `run` | 奔跑 | run | 加速 | P1 |
| `charge` | 冲撞 | charge | 单次爆发 | P1 |

注：4 个 walking 类型（quadrupedal/knuckle/palmigrade/digitigrade）+ 2 个 stand-walk + 5 个抽象走 → 全部移至**附魔**。

### 1.3 §2.1.4 Posture · 姿势（11） · `tags: ['posture']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `sit_rest` | 静坐 | sit-rest | passive | P1 |
| `crouch` | 蹲伏 | crouch | 防御 passive | P1 |
| `prone` | 俯卧 | prone | 屈服 | P2 |
| `supine` | 仰卧 | supine | 完全暴露 | P2 |
| `huddle` | 蜷缩 | huddle | 防御 | P1 |
| `cling_cradle` | 抱伏 | cling-cradle | 邻接保护 | P2 |
| `perch` | 栖立 | perch | 居高位 | P2 |
| `piloerection` | 毛竖 | piloerection | 威吓 buff | P1 |
| `bipedal_swagger` | 双足摇摆步 | bipedal swagger | 展示型 | P1 |
| `arm_raise` | 举臂 | arm-raise | 召集 | P1 |
| `arm_akimbo` | 叉臂 | arm-akimbo | 姿态 buff | P2 |

### 1.4 §2.1.6 Agonistic · 对抗行为（28） · `tags: ['agonistic']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `charging_display` | 冲撞展示 | charging display | 单次爆发 | P1 |
| `branch_drag` | 拖枝 | branch-drag | 范围扰动 | P1 |
| `branch_shake` | 摇枝 | branch-shake | 警报型 | P1 |
| `stamping` | 跺脚 | stamping | 节奏触发 | P1 |
| `drumming` | 击鼓 | drumming | 远程广播 | P1 |
| `buttress_drum` | 板根击鼓 | buttress drumming | 强广播 | P2 |
| `throw_obj` | 投掷 | throw | 远程攻击 | P1 |
| `piloerect_bluff` | 蓬毛虚张 | piloerect bluff | 假威吓 | P2 |
| `stare_threat` | 凝视威胁 | stare-threat | debuff | P1 |
| `head_bob` | 点头威胁 | head-bob | 警告 | P2 |
| `open_mouth_threat` | 张口威胁 | open-mouth threat | 大威吓 | P2 |
| `bite` | 啃咬 | bite | 单次伤害 | P1 |
| `grapple` | 扭抱 | grapple | 锁定攻击 | P2 |
| `hit` | 击打 | hit | 基础攻击 | P1 |
| `slap` | 拍击 | slap | 快速攻击 | P1 |
| `pull` | 拉拽 | pull | 位移敌方 | P2 |
| `stamp` | 踩踏 | stamp | 范围攻击 | P1 |
| `displace` | 驱替 | displace | 位移 | P1 |
| `supplant` | 取代 | supplant | 替位 | P2 |
| `chase` | 追击 | chase | 跟随攻击 | P2 |
| `flee` | 逃离 | flee | 撤退 | P2 |
| `avoid` | 回避 | avoid | dodge | P2 |
| `submit` | 屈从 | submit | 自我 debuff | P2 |
| `pant_grunt` | 喘嗯 | pant-grunt | 屈服信号 | P1 |
| `bared_teeth` | 露齿 | bared-teeth display | 恐惧 buff/debuff | P1 |
| `grimace` | 鬼脸 | grimace | 同 | P2 |
| `agon_scream` | 尖叫 | scream | 警报 | P1 |
| `cower` | 畏缩 | cower | 状态 | P2 |
| `crouch_present` | 蹲伏致敬 | crouch-present | 屈服姿态 | P2 |
| `appease` | 安抚 | appease | 减弱攻击 | P2 |
| `coalition_attack` | 联盟攻击 | coalitionary attack | 多键协同 | P2 |
| `redirected_aggr` | 转向攻击 | redirected aggression | 重定向 | P2 |

注：~~display~~ ~~threat~~ ~~severe aggression~~ ~~mild aggression~~ 抽象 category 词不入池。

### 1.5 §2.1.7 Vocal · 发声目录（22） · `tags: ['vocal']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `pant_hoot` | 喘啸 | pant-hoot | 多阶段广播 | P1 |
| `phase_buildup` | 起句段 | build-up phase | boss-phase marker | P2 |
| `phase_climax` | 高潮段 | climax phase | boss-phase marker | P2 |
| `phase_letdown` | 收尾段 | let-down phase | boss-phase marker | P2 |
| `pant_bark` | 喘吠 | pant-bark | 中度警示 | P2 |
| `pant_scream` | 喘啸尖叫 | pant-scream | 强警示 | P2 |
| `rough_grunt` | 粗砺嗯 | rough-grunt | 采食叫 | P1 |
| `food_grunt` | 食物叫 | food-grunt | 采食 trigger | P1 |
| `soft_bark` | 软吠 | soft-bark | 低警示 | P2 |
| `waa_bark` | 哇吠 | waa-bark | 中警示 | P2 |
| `wraah` | 警示嚎 | wraah | 高警示 | P2 |
| `hoo` | 呼 | hoo | 基础联络 | P1 |
| `alarm_call` | 警报叫 | alarm-call | 标准警报 | P1 |
| `contact_call` | 联络叫 | contact call | aura 维持 | P1 |
| `whimper` | 呜咽 | whimper | 弱信号 | P2 |
| `vocal_scream` | 尖叫·发声 | scream (vocal) | 同 agon_scream（变体 ID） | P2 |
| `staccato_hoot` | 断顿啸 | staccato hoot | 节奏型 | P2 |
| `lip_smack` | 唇拍 | lip-smack | 高频小动作 | P1 |
| `raspberry` | 颤唇 | raspberry | 杂音 | P2 |
| `tongue_click` | 舌弹 | tongue-click | 节奏 trigger | P2 |
| `teeth_chatter` | 牙颤 | teeth-chatter | 状态 | P2 |
| `coo` | 咕鸣 | coo (macaque) | 猕猴用 | P2 |
| `girney` | 唧鸣 | girney (macaque) | 猕猴用 | P2 |

注：~~copulation call~~ 已剔除。

### 1.6 §2.1.8 Gesture · 手势（14） · `tags: ['gesture']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `reach` | 伸手 | reach | 取得 | P1 |
| `beg` | 开掌乞 | beg (open-hand) | 索取 | P1 |
| `object_shake` | 摇物 | object-shake | 信号 | P2 |
| `leaf_clip` | 撕叶 | leaf-clip | 信号 trigger | P1 |
| `directed_scratch` | 指向性搔抓 | directed scratch | 标记 | P2 |
| `big_loud_scratch` | 高声搔抓 | big-loud-scratch | 强标记 | P2 |
| `hand_clap` | 拍手 | hand-clap | 节奏触发 | P1 |
| `stomp` | 踏脚 | stomp | 节奏触发 | P1 |
| `gallop` | 飞奔 | gallop | 加速变体 | P2 |
| `gesture_jump` | 跳 | jump (gesture) | 短跳 | P2 |
| `push` | 推 | push | 位移 | P1 |
| `bipedal_strut` | 双足踱 | bipedal-strut | 展示 | P2 |
| `ground_slap` | 拍地 | ground-slap | 广播 | P1 |
| `object_throw` | 投物 | object-throw | 远程 | P2 |

注：~~present(sexual)~~ ~~present(grooming)~~ ~~leaf-groom~~ ~~embrace-gesture~~ ~~touch-other~~ ~~pull-hand~~ 已剔除。  
`举臂 arm-raise` 已在 §2.1.4 Posture 入池，此处不重复。

### 1.7 §2.1.10 Cognitive / Tool（11） · `tags: ['tool']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `termite_fish` | 钓白蚁 | termite-fish | Goodall 经典 | P1 |
| `ant_dip` | 蘸蚁 | ant-dip | 蓄势-爆发 | P1 |
| `nut_crack` | 砸坚果 | nut-crack | 大单次产出 | P1 |
| `hammer_anvil` | 锤砧 | hammer & anvil | 双件套联动 | P1 |
| `leaf_sponge` | 叶海绵 | leaf-sponge | 吸收/储存 | P1 |
| `stone_throw` | 投石 | stone-throw | 远程攻击 | P2 |
| `spear_make` | 削矛 | spear-make | 制造型 | P1 |
| `cache` | 储藏 | cache | 永久成长 | P1 |
| `gaze_follow` | 视线跟随 | gaze-follow | 邻居读取 | P2 |
| `gaze_alternation` | 视线交替 | gaze-alternation | 双向读取 | P2 |
| `pointing` | 指点 | pointing | 标记目标 | P2 |
| `imitate` | 模仿 | imitate | 复制邻位 | P2 |
| `teach` | 示教 | teach | 给予邻位 | P2 |

注：~~tool-use~~ ~~cultural variant~~ ~~population-specific behavior~~ 抽象 category 词不入池。

### 1.8 §2.1.11 Abnormal / Captive（10 · 决议 3 否，并入主池） · `tags: ['abnormal']`

| ID | 中文 | 英文 | 备注 | Phase |
|---|---|---|---|---|
| `pacing` | 踱步 | pacing | 自循环 | P2 |
| `rocking` | 摇晃·刻板 | rocking | 与 sway 区分（异常侧） | P2 |
| `rr` | 反吐再食 | regurgitation-reingestion (R/R) | 缓存重食 | P2 |
| `coprophagy` | 食粪 | coprophagy | 极端 recycle | P2 |
| `hair_pluck` | 拔毛 | hair-pluck | 自损 trigger | P2 |
| `sib` | 自伤 | self-injurious behavior | 自损强 | P2 |
| `floating_limb` | 浮肢 | floating-limb | 脱节状态 | P2 |
| `eye_poke` | 戳眼 | eye-poke | 自损极端 | P2 |
| `saluting` | 敬礼式刻板 | saluting | 节奏自循环 | P2 |
| `whole_body_stereotypy` | 全身刻板 | whole-body stereotypy | 决议 3 待决 | P2 |

注：~~stereotypy~~ ~~over-groom~~ ~~whole-body stereotypy（抽象 cat 词）~~ 已剔除主池；~~stereotypy~~ 留作 endless 状态名而非词条。

---

## 2. 附魔池 · 30 项

### 2.1 既有 9 项 · ✅ Locked

| ID | 中文 | 英文 / 出处 | category | desc | 
|---|---|---|---|---|
| `apprentice_neighbor` | 异己理毛 | allogrooming (de Waal) | apprentice | 自身或指定关系的技能触发时永久成长 |
| `apprentice_res_base` | 觅食 | forage (Maintenance §2.1.2) | apprentice | 产出基数资源时永久成长 +2% |
| `apprentice_res_score` | 受饲 | being fed (passive) | apprentice | 产出分数资源时永久成长 +2% |
| `apprentice_res_multiplier` | 互惠 | reciprocity (de Waal) | apprentice | 产出倍率资源时永久成长 +2% |
| `apprentice_res_time` | 警戒守望 | sentry / vigilance | apprentice | 产出时间资源时永久成长 +2% |
| `apprentice_res_gold` | 囤积 | hoarding | apprentice | 产出金币资源时永久成长 +2% |
| `apprentice_crit` | 仪态展示 | postural/charging display | apprentice | 暴击时永久成长 |
| `multiply_operator` | 支配等级 | dominance rank | operator | 加算→乘算 |
| `bonus_output` | 配给溢余 | ration surplus (husbandry) | bonus | 触发时额外产出指定资源 |

### 2.2 新增 · "基础状态"型 21 项（来自 §2.1.2-§2.1.3 too-basic words）

> register: 与既有附魔同（行为类目级抽象词）；都是 baseline behavioral mode—— 玩家被训练进入的"默认存在态"。

#### 2.2.1 维持基础态（10） · 来自 §2.1.2

| ID | 中文 | 英文 | 占位 desc |
|---|---|---|---|
| `appr_sit` | 久坐 | sit | 长时间静坐型 passive |
| `appr_lie` | 卧位 | lie | 完全休眠 passive |
| `appr_sleep` | 睡眠 | sleep | 深度待机 |
| `appr_doze` | 假寐 | doze | 半休眠 |
| `appr_cough` | 咳 | cough | 触发型小事件 |
| `appr_sneeze` | 喷嚏 | sneeze | 同上变体 |
| `appr_defecate` | 排便 | defecate | 周期清理 |
| `appr_urinate` | 排尿 | urinate | 同上变体 |
| `appr_sunbathe` | 日浴 | sunbathe | 缓回复 |
| `appr_thermoreg` | 体温调节 | thermoregulate | 状态稳定 |

#### 2.2.2 移动基础态（11） · 来自 §2.1.3

| ID | 中文 | 英文 | 占位 desc |
|---|---|---|---|
| `appr_quad_walk` | 四足行走 | quadrupedal walk | 基础前进姿态 |
| `appr_knuckle_walk` | 指节行走 | knuckle-walk | chimp 标志姿态 |
| `appr_palmigrade` | 掌行 | palmigrade | 平掌姿态 |
| `appr_digitigrade` | 趾行 | digitigrade | 指尖姿态 |
| `appr_biped_walk` | 两足行走 | bipedal walk | 直立行进 |
| `appr_biped_stand` | 直立站 | bipedal stand | 直立静态 |
| `appr_follow` | 跟随 | follow | 跟从型 |
| `appr_lead` | 领走 | lead | 引导型 |
| `appr_travel` | 行进 | travel | 长程移动 |
| `appr_approach` | 接近 | approach | 进入接触 |
| `appr_withdraw` | 退离 | withdraw | 撤出接触 |

---

## 3. 遗物池 · ~46 项

### 3.1 受试体真名（语言/认知项目）· 22 项

> 命名格式待决：保留原名（Nim/Washoe/Kanzi）vs 包装为档案号（X-1973-117）。当前先用原名 + 项目年份注，包装层后议。

#### 3.1.1 黑猩猩 Chimp（14）

| ID | 名 | 项目 / 年份 | 出处 |
|---|---|---|---|
| `relic_nim` | Nim Chimpsky | Project Nim · 1973-1977 (Terrace) | ASL |
| `relic_washoe` | Washoe | Project Washoe · 1966-2007 (Gardner) | ASL |
| `relic_loulis` | Loulis | Washoe 收养 · 1978- | ASL（无人教） |
| `relic_sarah` | Sarah | Premack 1970s | 塑料 token |
| `relic_lana` | Lana | LANA Project · 1971-78 (Rumbaugh) | Yerkish lexigram |
| `relic_sherman` | Sherman | LRC · 1975- (Savage-Rumbaugh) | lexigram |
| `relic_austin` | Austin | LRC · 1975- (Savage-Rumbaugh) | lexigram |
| `relic_ai` | Ai | Kyoto Ai Project · 1977- (Matsuzawa) | 数字记忆 |
| `relic_ayumu` | Ayumu | Ai 之子 · 2000- | masking task / eidetic |
| `relic_lucy` | Lucy | Temerlin · 1964-87 | 跨物种抚养 |
| `relic_booee` | Booee | ASL · Fouts | ASL |
| `relic_tatu` | Tatu | ASL · 1975- | ASL |
| `relic_moja` | Moja | ASL · 1972-2002 | ASL |
| `relic_dar` | Dar | ASL · 1976-2012 | ASL |

#### 3.1.2 倭黑猩猩 Bonobo（3）

| ID | 名 | 项目 / 年份 | 出处 |
|---|---|---|---|
| `relic_kanzi` | Kanzi | Savage-Rumbaugh · 1980- | lexigram, spontaneous |
| `relic_panbanisha` | Panbanisha | Kanzi 之妹 · 1985- | lexigram |
| `relic_matata` | Matata | Kanzi 之母 · — | 母代受试 |

#### 3.1.3 大猩猩 Gorilla（3）

| ID | 名 | 项目 / 年份 | 出处 |
|---|---|---|---|
| `relic_koko` | Koko | Patterson · 1971-2018 | GSL（戈拉手语）|
| `relic_michael` | Michael | Koko 伴侣 · 1973-2000 | GSL |
| `relic_ndume` | Ndume | Koko 后伴 · 1981- | — |

#### 3.1.4 红毛猩猩 Orangutan（2）

| ID | 名 | 项目 / 年份 | 出处 |
|---|---|---|---|
| `relic_chantek` | Chantek | Miles · 1978-2017 | ASL |
| `relic_princess` | Princess | — | 跨物种语言 |

### 3.2 田野文化工具具体名 · 24 项

> 来自 chimp 文化考古（Mahale/Gombe/Bossou/Taï/Sonso/Fongoli/Kibale），**非 ethogram §2.1.10 字面词**，作为遗物。每个 origin tag 暗示 build identity。

#### 3.2.1 Gombe（坦桑 · Goodall）· 3

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_honey_dip` | 蘸蜜 | honey-dipping | `gombe` |
| `relic_leaf_swallow` | 卷叶吞 | Aspilia leaf-swallowing (自疗) | `gombe` |
| `relic_long_ant_dip` | 长棒蘸蚁 | long-probe ant-dipping | `gombe` |

#### 3.2.2 Mahale（坦桑 · Nishida）· 2

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_long_ant_fish` | 长棒钓蚁 | long-probe ant-fishing | `mahale` |
| `relic_leaf_cushion` | 叶垫 | leaf cushion | `mahale` |

注：grooming hand-clasp（搭手理毛）虽是 Mahale 标志，因 Affiliative 不入。

#### 3.2.3 Bossou（几内亚 · Matsuzawa）· 3

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_algae_scoop` | 捞藻 | algae-scooping | `bossou` |
| `relic_pestle_pound` | 杵舂 | pestle-pounding | `bossou` |
| `relic_leaf_fold_drink` | 折叶饮 | leaf-folding drinking | `bossou` |

#### 3.2.4 Taï（科特迪瓦 · Boesch）· 4

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_wood_hammer` | 木锤 | wooden hammer | `tai` |
| `relic_stone_hammer` | 石锤 | stone hammer | `tai` |
| `relic_coop_hunt` | 围猎 | cooperative red-colobus hunt | `tai` |
| `relic_hammer_curation` | 留锤 | hammer curation | `tai` |

#### 3.2.5 Sonso / Budongo（乌干达）· 4

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_moss_sponge` | 苔海绵 | moss-sponge（晚近文化传承 · Hobaiter 2014） | `sonso` |
| `relic_stick_sponge` | 棒绵 | stick-sponge | `sonso` |
| `relic_chewed_sponge` | 嚼叶绵 | chewed-leaf-sponge prep | `sonso` |
| `relic_honey_stick` | 蜜蘸棒 | long honey-extraction stick | `sonso` |

#### 3.2.6 Fongoli（塞内加尔 · Pruetz）· 3

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_spear_hunt` | 矛猎 | spear-hunt (bushbabies) | `fongoli` |
| `relic_cave_use` | 居穴 | cave-use（避热） | `fongoli` |
| `relic_wading` | 涉水 | wading | `fongoli` |

#### 3.2.7 Kibale（乌干达）· 3

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_bark_strip` | 撬皮 | bark-stripping | `kibale` |
| `relic_honey_probe` | 探蜜 | honey-probing | `kibale` |
| `relic_bark_drink` | 剥皮饮 | bark-water collection | `kibale` |

#### 3.2.8 跨田野通用 · 2

| ID | 名 | 英文出处 | origin tag |
|---|---|---|---|
| `relic_day_nest` | 日巢 | day-nest（nest-build 变体） | — |
| `relic_night_nest` | 夜巢 | night-nest（nest-build 变体） | — |

---

## 4. 资源池（不变 · 引用）

详见 `src/data-json/affixes.json`。6 项：base / score / multiplier / time / gold / energy / mutagen。in-world 重解释见 `affix-rewrite-research.md` 用户论述节。

---

## 5. 触发器池（引用）

详见 `affix-rewrite-research.md` §5。原型期 6 个 + Phase 2 扩展 4 个。

---

## 6. 命名规模总览

| 池 | 计 | 备注 |
|---|---:|---|
| 词条主池 | 123 | P1 实装目标 ~50；剩余 P2（含原异常行为 10 项 · 决议 3 否） |
| **词条合计** | **123** | |
| 附魔既有 | 9 | locked |
| 附魔新增 · 维持基础态 | 10 | |
| 附魔新增 · 移动基础态 | 11 | |
| **附魔合计** | **30** | |
| 遗物 · 受试体真名 | 22 | 命名包装层后议 |
| 遗物 · 田野文化工具 | 24 | origin tag 8 个田野 |
| **遗物合计** | **46** | 目标 80-100，需后续扩展 |

---

## 7. 未决（指向其他文档）

- ~~**决议 3** stereotypy 是否仅 endless~~ · ✅ 2026-05-11 否（详 affix-rewrite-research.md §4.3）
- ~~**决议 4** 旧词条迁移映射~~ · ✅ 2026-05-11 选 C 完全重做（无迁移；旧系统标 deprecated；旧 affix 名仅留作 flavor 素材）
- **遗物命名包装层**（保留 Nim 真名 vs 改包档案号 X-1973-117）· 本轮未决
- **田野 `origin` tag 是否做主轴 build identity** · 本轮未决（"凑 4 件 Bossou 起 Bossou 流"）
