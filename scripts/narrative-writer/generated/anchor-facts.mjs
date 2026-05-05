// Auto-derived from docs/narrative-design.md v4.1 (LOCKED 2026-05-04)
// Re-derive when narrative-design 版本号变化。
//
// v4.1 双层结构：
//   - SETTING_ANCHORS · D1-D32 设定锚点（与 narrative-design §2.13 / §2.15 表对齐）
//   - CHARACTER_ANCHORS · C1-C6 character 锚点（§4.2 + §4.7）
//
// v3.1 anchor (player / superior / hr / instructor / memory_fragment / peers_collective / peer_485901)
// 已全部作废：superior / instructor / memory_fragment 概念在 v4.1 不存在；其余被 C1-C6 替代。

// ─── SETTING ANCHORS · D1-D32 ───

export const SETTING_ANCHORS = {
  D1: {
    label: '收容物本体',
    content: '文本通过准确录入获得有效性；污染 = 身份阶梯下滑（5 段）。anomaly = 未受理文本（Unfiled Textual Event / Stray Sentence）。',
    lock_status: 'LOCKED',
    crossref: ['D2', 'D24', 'D27', 'D28'],
  },
  D2: {
    label: '安全态',
    content: '放弃理解（非表演），自带猴子悖论。理解 = 危险；扮演猴子 = 防护 + 处理双义。',
    lock_status: 'LOCKED',
    crossref: ['D6', 'D29'],
  },
  D3: {
    label: '主叙事方法',
    content: '规则怪谈（多声部矛盾公文）。同一议题不同便条互相矛盾；同一守则不同污染层不同 reading。',
    lock_status: 'LOCKED',
    crossref: ['D20', 'D31'],
  },
  D4: {
    label: '5 段阶梯 = 5 职业',
    content: '阶梯即职业；progression 不是 power growth 是污染 / 异化深度。',
    lock_status: 'LOCKED',
    crossref: ['D9', 'D10', 'D16'],
  },
  D5: {
    label: '游戏拒绝给答案',
    content: '结局 = 玩家成为 / 留下的文档，加入下一周目语料。永远不揭晓"你是不是真的猴子"等问题。',
    lock_status: 'LOCKED',
    crossref: ['D7', 'D17'],
  },
  D6: {
    label: 'Meta-progression 反用',
    content: '进步即堕落，解锁 = 诱降。每次"晋升"是把玩家拉得离 anomaly 更近。',
    lock_status: 'LOCKED',
    crossref: ['D2', 'D10', 'D16'],
  },
  D7: {
    label: '污染状态不可见',
    content: '玩家被记账，但污染状态对玩家自己不可见。给 D29 状态确认流程提供仪式容器。',
    lock_status: 'LOCKED',
    crossref: ['D5', 'D29'],
  },
  D8: {
    label: '多声部反身闭合',
    content: '玩家职业 = 文档矩阵中的一个 voice。下周目玩家成为前周目某文档的署名/语料/attribution。',
    lock_status: 'LOCKED',
    crossref: ['D19', 'C6'],
  },
  D9: {
    label: '职业代码映射',
    content: 'none = 录入员（重命名）, metamorph = 修改者, wordsmith = 作者。code id 保留 v2.3 兼容存档；narrative tier id 见 POSITION_TIERS_V41。',
    lock_status: 'LOCKED',
    crossref: ['D4', 'D10'],
  },
  D10: {
    label: '解锁顺序反转',
    content: '录入员（默认）→ 校对者 → 修改者 → 作者 → 文本的一部分。"晋升"= 诱降 = 离 anomaly 越来越近。',
    lock_status: 'LOCKED',
    crossref: ['D6', 'D16'],
  },
  D11: {
    label: 'Ascension 与阶梯 orthogonal',
    content: 'A0-Amax 保持，与 5 阶梯 orthogonal——同一职业内的难度梯度。',
    lock_status: 'LOCKED',
    crossref: ['D4'],
  },
  D12: {
    label: 'DPCA 设定',
    content: 'DPCA = Department of Primate Clerical Affairs / X 集团子部门。中文 UI 全用 "DPCA" 缩写。',
    lock_status: 'LOCKED',
    crossref: ['D14', 'D15', 'D30'],
  },
  D13: {
    label: '美学 = 时间错乱',
    content: '文牍科旧气（民国/1940-50s 官署）+ 90s 体制内办公室共存。两层不该共存的 era 同时存在——时间错乱本身是 horror 元素。',
    lock_status: 'LOCKED',
    crossref: ['D27'],
  },
  D14: {
    label: 'endless = containment failure',
    content: '异常直接吃员工；完全猴子化 = containment success；公司动机 = 自我保全 / 系统延续，不是 service to anomaly。',
    lock_status: 'revised after D26 retraction',
    crossref: ['D15', 'D26', 'D30', 'D32'],
  },
  D15: {
    label: '公司是 knowing containment',
    content: '知道异常存在，bureaucratic 程序管理；NOT actively serving anomaly。',
    lock_status: 'revised',
    crossref: ['D14', 'D30'],
  },
  D16: {
    label: '阶梯双向化',
    content: '两端都失人性，中间是"人"的窄道。Tier 1 录入员 / Tier 5 文本一部分都不是"人"——一个未成形，一个已被吞。',
    lock_status: 'LOCKED',
    crossref: ['D4', 'D10'],
  },
  D17: {
    label: '隐藏结局',
    content: '不打字 → 不入局（orthogonal escape）；不应被攻略告知。',
    lock_status: 'LOCKED',
    crossref: ['D5'],
  },
  D18: {
    label: '遗物 = 历史档案',
    content: 'DPCA 前身灵长类研究项目的历史档案 + 前一代实验对象的遗存（含真 chimp 个体 + 被处置员工）。',
    lock_status: 'LOCKED',
    crossref: ['D19', 'D22', 'C4'],
  },
  D19: {
    label: '反身闭合在遗物上',
    content: '玩家完成 run 后 relics 多一行 "Subject [玩家工号] 经手 / 重新评估意见 [玩家行为字符串]"。',
    lock_status: 'LOCKED',
    crossref: ['D8', 'C6'],
  },
  D20: {
    label: 'L1-L5 同一份文档',
    content: '不同 reading；文档一直完整，公司不投放 / 不修改；玩家根据自身污染等级看到不同 layers。文本是诚实的镜子。',
    lock_status: 'LOCKED v3',
    crossref: ['D22', 'D31'],
  },
  D21: {
    label: 'Banal evil',
    content: 'Kafka × Arendt banal systemic evil；没有具体决策者，但系统结构必然害人。任何"为什么"的回答都是表层。',
    lock_status: 'LOCKED',
    crossref: ['D14', 'D30'],
  },
  D22: {
    label: 'Brutal positive feedback loop',
    content: '历史档案 = 员工自我检查的认知锚点；最毒的不是公司知道你的污染，是你只能用公司的尺度知道自己的污染。',
    lock_status: 'LOCKED',
    crossref: ['D20', 'D31'],
  },
  D23: {
    label: '"晋升"= 重读发现',
    content: '玩家某次重读时发现 "这行字之前没有"；但那行字一直在；变的是玩家。双员工同读同一文档会读到不同内容——你和同事永远无法验证彼此看到了什么。',
    lock_status: 'LOCKED v2',
    crossref: ['D20', 'D31', 'C2'],
  },
  D24: {
    label: '5 职业 = emergent 5 道污染容纳防线',
    content: 'administrative tier 体系，用于在异常感染发生后稳定地 keep employees working；防线不分发新能力——只是 administrative response。',
    lock_status: 'revised after D26 retraction',
    crossref: ['D26', 'D30'],
  },
  D25: {
    label: '技能 = anomaly expression channels',
    content: '异常借灵长类 species protocol 表达自己，不是公司的 disposal toolkit；修改技能 = 直接 tamper anomaly\'s expression。',
    lock_status: 'revised',
    crossref: ['D26'],
  },
  D26: {
    label: 'Anomaly vector',
    content: '异常通过两条 vectors 主动传播：(1) peer-to-peer contamination；(2) 异常本身的直接引导。公司不是 vector — 公司是 bureaucratic firewall（观察 / 记录 / administratively reclassify / 调度），但不分发新机制。',
    lock_status: 'LOCKED v2 (REPLACEMENT for retracted v1)',
    crossref: ['D14', 'D15', 'D30'],
  },
  D27: {
    label: '受理窗口',
    content: 'textual acceptance interval：候选文本只在特定时间段获得受理机会（17:06-17:13 / 午休结束前 30 秒 / 计时钟无秒针时）。给 D13 时间错乱配机制锚点。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D1', 'D13', 'D28'],
  },
  D28: {
    label: '机械见证效应',
    content: '机械打字机 = 录入唯一稳定通道；介于"无意图机器"与"有意图人类"之间，提供 anomaly 受理所需的"见证者"状态。电脑 / 手写 / 打印机均无效。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D1', 'D27'],
  },
  D29: {
    label: 'Keep-as-human Check',
    content: '5 项检测序列：摘面具 / 报姓名 / 报日期 / 解释普通句 / 区分"打字"和"写作"。表面 boilerplate 下班程序，实质 keep-as-human 检测。员工本人不应知此为污染检测。退化曲线 Ch.1 见证 → Ch.2 routine → Ch.3 偶尔 partial → Ch.4 频繁 partial fail → Ch.5 自动 fail。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D2', 'D7', 'C3'],
  },
  D30: {
    label: '公司 = defensive curator',
    content: '捕获 / 去语境化 / 词包化 / 编号化 / 筛选 = 防御性观测的副产品。公司不创造 / 不引导 / 不分发 / 不 weaponize anomaly。任何叙事 / UI 文本不得让公司看起来像 anomaly 的加工厂或代理人。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D14', 'D15', 'D26'],
  },
  D31: {
    label: '6 layers 同一份文档',
    content: '6 类规则（官方守则 / 安全部门便签 / 前员工批注 / 红领结文本 / 猴子规则 / 灵长接口）不是不同文档，是同一份《作业手册》在不同污染等级读者眼里呈现的 6 个 layers。你看到哪一层 = 你已污染到哪一层。D22 brutal positive feedback loop 的实现细节。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D20', 'D22'],
  },
  D32: {
    label: 'Ch.5 双 voice 同事件',
    content: '玩家进入 endless：在 anomaly voice 里 = "升格为新文本源"；在公司 voice 里 = "深度作者化案例进入猴子规则 / 转入特殊勤务"。两边目的不同，但行为方向重合——D14 v2 最暴力兑现。',
    lock_status: 'LOCKED v4.1',
    crossref: ['D14', 'D26'],
  },
}

// ─── CHARACTER ANCHORS · C1-C6 (§4.2 + §4.7) ───

export const CHARACTER_ANCHORS = {
  player: {
    label: '玩家 · Subject [工号]',
    appearance: '始终在场（玩家视角）',
    function: 'D1 anomaly 的 host / D8 反身闭合的载体；逐章 progression 朝向"成为文本"',
    voice: '玩家无 voice（§6.6）—— 没有 inner monologue，没有 reply channel；唯一显化是 typing 行为（间接 utterance，最终被 anomaly 借走）',
    redaction: '性别 / 年龄 / 真名 / 入职日期 / 入职前的语言能力 / 物种 / 是否记得入职—— 永远不答',
  },
  C1: {
    label: 'C1 · DPCA（公司本身）',
    appearance: '通过 V1 boilerplate / V5 守则 / 处置预告 / 通知显化',
    function: 'bureaucratic firewall + defensive curator（D14 v2 + D26 v2 + D30）。**不创造 / 不引导 / 不分发 / 不 weaponize** anomaly。',
    voice: 'V1 / V5 主载体；冷 / 行政 / passive voice / 称谓 = "员工 [工号]" / 永远不"你"',
    redaction: 'CEO / specific decision-maker / face / personality —— 永远不出现（D21 banal evil 没有 villain）',
  },
  C2: {
    label: 'C2 · Peer ghost（同事 ghost）',
    appearance: 'Beat 6 同事消失留白 / Beat 7 桌面便条 / 走廊背景空缺',
    function: '"留白的重量"载体；T3 玩家共情对象；同事消失不解释（不是 villain 的受害者，是 banal evil 的 statistical shadow）',
    voice: 'V2 同事便条主载体；落款 = 工号差 1 位（or "047" 类极短）；字迹 + typing rhythm 后台特征',
    redaction: '真名 / 长相 / 调岗去哪 / 是否真"调岗"—— 永远不答',
  },
  C3: {
    label: 'C3 · D29 检测员（voice-only）',
    appearance: 'Cycle 末 D29 状态确认序列触发；屏幕中央显示 prompt',
    function: 'Keep-as-human Check 的执行者；玩家事后才意识到这是污染检测（不是下班程序）',
    voice: 'V4 主载体；命令式 / 极简 / "请..." 开头（唯一用敬语的 voice，但敬语本身是 boilerplate）',
    redaction: 'face / portrait / personality —— 永远不出现',
  },
  C4: {
    label: 'C4 · 历史 Subject（Project Nim）',
    appearance: 'Ch.4 遗物 L4 footnote / B8 reveal 的唯一窗口',
    function: '玩家的反身镜像（人 / 灵长类 / 实验对象身份混合）；反身闭合 character 与 Nim 的对仗',
    voice: 'V5 守则 L4 / 遗物 footnote；Subject ID 编号 / 项目档案 boilerplate',
    redaction: 'Nim 的内心 / 死亡过程 / 玩家是否"成为另一个 Nim" —— 永远不答',
  },
  C5: {
    label: 'C5 · Anomaly 本体',
    appearance: 'V3 fragment / typing buffer pre-populate / 字符级缓变 / 文档边缘 micro-changes',
    function: 'D1 收容物本体；通过 peer-to-peer + direct guidance 传播（D26 v2）；不是单一 entity，是文本本身的属性',
    voice: 'V3 主载体；不是 sentence 是 fragment；不规则节奏；部分可读 / 部分不可 / 部分逻辑自洽但语义异常',
    redaction: 'anomaly 的 personality / motive / origin / "是不是某个 entity" —— 永远不答',
  },
  C6: {
    label: 'C6 · 反身闭合 character（玩家以前的自己）',
    appearance: 'V6 boss tooltip / 反身闭合 placeholder（attribution = 自己以前 endless 工号）',
    function: 'D8 + D19 兑现；玩家以前的自己 = 现在的 anomaly source；C5 + C6 在 Ch.5 合并',
    voice: 'V6 主载体；attribution 格式 = "上一任作者: Subject XX-####"；Ch.3 近似工号 / Ch.4 自己工号 / Ch.5 自己以前 endless 工号',
    redaction: '永远不显化为 "你创造了这个 boss"；玩家事后 cross-ref 才寒',
  },
}

// ─── 兼容层：v3.1 旧 anchor key 映射 ───
//
// 给 system-context.mjs 提供向后兼容的 ANCHOR_FACTS 导出（v3.1 prompt 还可能 reference）。
// Phase B 切完后此 export 删除。

export const ANCHOR_FACTS = {
  player: {
    _label: CHARACTER_ANCHORS.player.label,
    appearance: CHARACTER_ANCHORS.player.appearance,
    function: CHARACTER_ANCHORS.player.function,
    redaction: CHARACTER_ANCHORS.player.redaction,
  },
  C1_dpca: { ...CHARACTER_ANCHORS.C1, _label: CHARACTER_ANCHORS.C1.label },
  C2_peer: { ...CHARACTER_ANCHORS.C2, _label: CHARACTER_ANCHORS.C2.label },
  C3_d29:  { ...CHARACTER_ANCHORS.C3, _label: CHARACTER_ANCHORS.C3.label },
  C4_nim:  { ...CHARACTER_ANCHORS.C4, _label: CHARACTER_ANCHORS.C4.label },
  C5_anomaly: { ...CHARACTER_ANCHORS.C5, _label: CHARACTER_ANCHORS.C5.label },
  C6_reflexive: { ...CHARACTER_ANCHORS.C6, _label: CHARACTER_ANCHORS.C6.label },
}
