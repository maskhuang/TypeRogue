import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const PROJECT_ROOT = join(__dirname, '..', '..')
export const SRC_ROOT = join(PROJECT_ROOT, 'src')
export const DATA_JSON = join(SRC_ROOT, 'data-json')
export const NARRATIVE_OUT = join(SRC_ROOT, 'src', 'data', 'narrative')
export const OUTPUT_DIR = join(__dirname, 'output')

// ─── Object type → voice / template mapping (v3.0) ───
//
// 3 voices in v3:
//   doc   = long-form MIB document (4-段式 B-7 类合规器 / 月度新政策 / 工种文档 / HR 文件)
//   bell  = short tooltip / HUD phrase (1-2 行)
//   note  = private desk note (Beat 7 #485,901 + shop blurb)
//
// (v2.3 had a 4th voice `altar` for 圣坛嘟囔 — REMOVED in v3 since the altar concept doesn't exist.)
//
// Templates differentiate flavor sub-types within a voice.

export const VOICE_MAP = {
  relic: {
    per_tier_flavor: { template: 'per_tier_relic', desc: 'Relic 主显示 · 4 tier × 1 行 flavor（v3.1 主路径）' },
    doc:  { template: 'mib_equipment',  desc: 'Relic Codex · MIB 装备文书（v3.1 v1.1+ collection page 用）' },
    bell: { template: 'mib_short',      desc: 'Relic tooltip · 1-2 行短描述（兼容 v3.0 旧用法）' },
  },
  affix: {
    per_tier_flavor: { template: 'per_tier_affix', desc: 'Affix 主显示 · 4 tier × 1 行 flavor（v3.1 主路径）' },
    bell: { template: 'mib_short',      desc: 'Affix tooltip · 短描述（兼容旧用法）' },
  },
  enchantment: {
    bell: { template: 'mib_short',      desc: 'Enchantment tooltip · 短描述' },
  },
  bossModifier: {
    per_tier_flavor: { template: 'per_tier_bossmod', desc: 'Boss Modifier 主显示 · 4 tier × 1 行 flavor（v3.1 主路径）' },
    doc:  { template: 'mib_policy',     desc: 'Boss Modifier · 月度新政策 #XXX 政策文档（v1.1+）' },
    bell: { template: 'mib_short',      desc: 'Boss Modifier · HUD 短格言（兼容旧用法）' },
  },
  class: {
    doc:  { template: 'job_desc',       desc: '职业 Codex · 工种简介' },
    bell: { template: 'mib_short',      desc: '职业 tooltip · 短描述' },
  },
  ritual: {
    bell: { template: 'instructor_pitch', desc: '仪式关 · 内训讲师推销腔（Stage 6）' },
  },
  tutorial: {
    doc:  { template: 'hr_doc',         desc: 'Tutorial · HR 入职培训文件' },
  },
  achievement: {
    doc:  { template: 'hr_doc',         desc: '成就 · HR 评估通报' },
  },
  scriptorNotes: {
    note: { template: 'desk_note',      desc: '桌面便条 · #485,901 私人破碎腔（Beat 7）' },
  },
  shopnote: {
    note: { template: 'shop_blurb',     desc: '物资管理中心 · 配发短批注' },
  },
}

// ─── Anchor facts ───
// All facts come straight from generated/anchor-facts.mjs (synced from docs/narrative-design.md).
// v3 has no pipeline-only fields (v2.3 had name_bell/name_doc/name_altar/era_m/disappear_layer/faction —
// all removed since the underlying concepts don't exist in v3).

export { ANCHOR_FACTS } from './generated/anchor-facts.mjs'

// ─── IP & v2.3 residue · banned terms ───

// External IP (still applicable in v3)
export const GW_BANNED = [
  'Adeptus', 'Mechanicus', 'Omnissiah', 'Imperium', 'Emperor',
  'Astartes', 'Space Marine', 'Ecclesiarchy', 'Primarch',
  'Chaos Gods', 'Aquila', 'Cogitator', 'Techpriest',
  'Administratum', 'Inquisition', 'Commissar',
]

export const SCP_BANNED_PATTERN = /SCP-\d{3,4}/

// v3.1 NEW · 不命名条款 — 禁止任何直接命名 SCP Foundation 的术语
// 玩家凭 genre 直觉识别；这些精确短语出现 = AI 越界
export const V31_SCP_NAMING_BANNED_ZH = [
  '基金会', 'SCP 基金会',
  // 注意：单独"收容"作动词（"收容工作"）允许；"收容物"作专有名词独立出现禁止
]

export const V31_SCP_NAMING_BANNED_EN = [
  'Object Class', 'object-class',
  'Safe-class', 'Euclid-class', 'Keter-class', 'Thaumiel-class',
  'Anomalous Object', 'Anomalous Entity', 'anomalous object', 'anomalous entity',
  'SCP Foundation', 'the Foundation',
  'Secure, Contain, Protect',
  'Containment Breach', // 已在 V2_BANNED_EN，重复防护
]

// v2.3 Ironpress Cathedral residue — these MUST NOT appear in v3 output.
// Generated text containing any of these signals a regression to the old setting.
export const V2_BANNED_ZH = [
  // 派系 / 体制
  '大教堂', '活字大教堂', '守卷人', '誓门', '铭刻誓门', '熔变誓门', '键徒', '初誓键徒', '铭誓键徒',
  // 引擎 / 异文
  '祷文引擎', '异文', '逸文', '残余异文', '空椅时代', '崇拜时代', '转型时代', '惯性时代',
  // 圣 系列
  '圣印', '圣徒遗物', '圣器', '圣坛', '圣坛键位', '圣键', '圣典', '圣经', '圣字钉', '圣律', '圣流',
  // 仪式 / 动作
  '收容铭刻', '收容震颤', '收容突破', '站点污染', '祷击', '裂铅', '落版', '换架',
  // 移除「复归」: 在"重复归档" / "反复归还" 等正常词组中 substring 命中假阳性高
  // 资源 / 物
  '铅币', '铅屑', '铅水', '铅字符', '铭文组', '祝圣', '受祝圣', '残余异文', '禁书', '经典残章',
  // 地点 / 结构
  '一次登塔', '意志显现', '气动征用管', '收容廊', '机械外壳', '引擎核心', '抄写室', '铸字坊', '铭封祈礼',
  // 编号体系
  'D-XXXX',
  // 版级
  '定版', '活版', '脱版', '逆版', '熔版', '原版', '逸版',
]

export const V2_BANNED_EN = [
  'Cathedral', 'Ironpress', 'Litany Engine', 'Litany-Strike', 'Scriptor', 'Clavigerant', 'Keybound',
  'Sigil', 'Sacred Artifact', 'Residual Anomaly', 'Codex Fragment', 'Lead Coin', 'Plumbum',
  'Containment Tremor', 'Containment Breach', 'Site Compromise', 'Pneumatic Requisition',
  'Lectern of Keys', 'Claviculum', 'Anomalous Glyph', 'Order of the Graven', 'Order of the Molten',
  'Gradus Formae', 'Fixum', 'Mobilum', 'Solum', 'Inversum', 'Fusum', 'Primum', 'Liberum',
  'Will Manifestation', 'Rite of Sealing', 'The Six Canons', 'The Seven Humours',
]

// ─── Word / line limits per voice (v3) ───

export const WORD_LIMITS = {
  bell: { zh_max_chars: 30, en_max_words: 15, label: 'bell · 短 tooltip / HUD' },
  per_tier: { zh_max_chars: 40, en_max_words: 20, label: 'per_tier · 单 tier flavor 行' },
  doc:  { zh_max_lines: 12, en_max_lines: 12, label: 'doc · MIB 长文书' },
  note: { zh_max_chars: 80, en_max_words: 40, label: 'note · 桌面便条 / 商店批注' },
}

// ============================================
// v4.1 NEW · 与 v3.1 并存（Phase A 不破坏 run.mjs）
// ============================================
// Phase B 将把 run.mjs 切到 v4.1 names；届时旧 VOICE_MAP / WORD_LIMITS 删除。

// ─── v4.1 · 7 voices（V1-V7 · narrative-design §6.2）───

export const VOICES_V41 = {
  V1: { id: 'V1', label: 'DPCA boilerplate',     desc: '通知 / 处置 / 外部文本回收 notification（与 Ch.2/3/5 升职 deny→affirm 转换共用 template）' },
  V2: { id: 'V2', label: '同事便条',              desc: 'peer ghost (C2) · 字迹 + 工号 / 矛盾 / 留白' },
  V3: { id: 'V3', label: 'Anomaly dictation',    desc: 'fragment / typing buffer pre-populate / 字符级缓变（Cycle 6+）' },
  V4: { id: 'V4', label: 'D29 检测员 prompt',     desc: '5 项检测序列 × 5 退化阶段（C3 voice-only character）' },
  V5: { id: 'V5', label: '规则手册 / 守则 layered', desc: 'D31 6 layers 同一份文档不同 reading；含 deny→affirm 配对（§4.1）' },
  V6: { id: 'V6', label: 'Boss tooltip / 反身闭合', desc: '玩家以前打过的字 + attribution placeholder（C6 反身闭合 character）' },
  V7: { id: 'V7', label: '环境（第七 voice）',     desc: 'spatial / temporal / motion / sonic 4 channel · 输出 structured spec (§7)' },
}

// ─── v4.1 · type → voice 映射 ───

export const VOICE_TYPE_MAP_V41 = {
  relic:        { primary: ['V5', 'V1'],  secondary: ['V6'] },  // layered footnote 主路径
  affix:        { primary: ['V5', 'V1'],  secondary: ['V3'] },
  enchantment:  { primary: ['V5'],        secondary: ['V1'] },
  bossModifier: { primary: ['V1', 'V6'],  secondary: ['V3'] },
  class:        { primary: ['V1'],        secondary: ['V5'] },
  ritual:       { primary: ['V1', 'V5'],  secondary: ['V3'] },
  tutorial:     { primary: ['V1'],        secondary: [] },
  achievement:  { primary: ['V1'],        secondary: [] },        // 仅 V1 boilerplate · 评估通报；零 V5 layered / 零 fanfare
  bossTooltip:  { primary: ['V6'],        secondary: ['V1'] },
  scriptorNotes:{ primary: ['V2'],        secondary: [] },
  shopnote:     { primary: ['V1'],        secondary: ['V2'] },
  handbook:     { primary: ['V5'],        secondary: [] },         // V5 守则 layered library 主路径
  charDrift:    { primary: ['V3'],        secondary: [] },         // Cycle 6+ 字符级缓变 patterns
  freeTypeNote: { primary: ['V2'],        secondary: [] },         // DC2 致后来者便签
  positionDenialAffirmation: { primary: ['V5'], secondary: [] },   // §4.1 deny→affirm 配对
  environmental: { primary: ['V7'],       secondary: [] },         // V7 structured spec（PL-11 input）
}

// ─── v4.1 · word limits ───

export const WORD_LIMITS_V41 = {
  V1_short: { zh_max_chars: 60,  en_max_words: 30, label: 'V1 · 短 boilerplate（通知 / tooltip 句）' },
  V1_long:  { zh_max_chars: 200, en_max_words: 80, label: 'V1 · 长 boilerplate（处置 / handbook 节录）' },
  V2: { zh_max_chars: 40, en_max_words: 20, label: 'V2 · 同事便条（碎句）' },
  V3: { zh_max_chars: 20, en_max_words: 10, label: 'V3 · anomaly fragment（极短）' },
  V4: { zh_max_chars: 30, en_max_words: 15, label: 'V4 · D29 命令式 prompt' },
  V5_per_layer: { zh_max_chars: 50, en_max_words: 25, label: 'V5 · 单 layer（× 4 layer = 200/100 总）' },
  V6: { zh_max_chars: 80, en_max_words: 40, label: 'V6 · boss tooltip + attribution' },
  V7: { json_only: true, label: 'V7 · structured spec (no text)' },
}

// ─── v4.1 · 5 工种阶梯命名 ───
//
// 双层命名策略（spec §2.3）：
//   - code id（存档兼容，不动）：none / proofreader / metamorph / wordsmith / endless
//   - narrative tier id（叙事用）：recorder / proofreader / reviser / author / assimilated
//
// pipeline 写 flavor 时**只用 narrative tier id**；ingest 时通过映射表把 narrative 接到 code id。

export const POSITION_TIERS_V41 = [
  { tier: 1, narrative: 'recorder',     code_id: 'none',       zh: '录入员',     unlock: 'default',                   chapter: 1 },
  { tier: 2, narrative: 'proofreader',  code_id: 'proofreader',zh: '校对者',     unlock: 'recorder_clear_ch1',         chapter: 2 },  // 注：现 game 代码无此职业，pending PL-2/3 后续工单
  { tier: 3, narrative: 'reviser',      code_id: 'metamorph',  zh: '修改者',     unlock: 'proofreader_clear_ch2',      chapter: 3 },
  { tier: 4, narrative: 'author',       code_id: 'wordsmith',  zh: '作者',       unlock: 'reviser_clear_ch3',          chapter: 4 },
  { tier: 5, narrative: 'assimilated',  code_id: 'endless',    zh: '文本一部分', unlock: 'all_classes_clear',          chapter: 5 },
]

// ─── v4.1 · DPCA 命名约束（spec §7.2 决策）───

export const DPCA_NAMING = {
  primary: 'DPCA',                      // UI / V1 / V5 一律使用 "DPCA" 缩写
  expanded_en: 'Department of Primate Clerical Affairs',  // 在 lore-deep / Ch.4 L4 footnote 偶用
  expanded_zh: '文牍科',                 // ❗ v4.1 决策：文牍科**不在 UI 出现**，仅出现在 §5.4 lore origin 等深层
  forbidden_in_ui: ['文牍科', 'Department of Primate Clerical Affairs', '灵长类辅助文书部'],
  forbidden_reason: 'spec §7.2 决策：DPCA 中文 UI 全用缩写；展开形式留作 lore-only',
}

// ─── v4.1 · v3.1 残留禁词（spec §2.5）───
//
// v3.1 引入 + v4.1 否决的概念。任何输出命中即 reject。
// 注：与 V2_BANNED（v2.3 残留）不同，本表针对 v3.1 概念。

export const V3_RESIDUE_BANNED_ZH = [
  // v3.1 三轨映射作废
  '三轨映射',
  'V-1 基础合规手册', 'V-2 残稿处理补充须知', 'V-3 异常处理修订',
  '基础合规手册', '残稿处理补充须知', '异常处理修订',
  'Tier 0 标准层', 'Tier 1 微扰层', 'Tier 2 双视层', 'Tier 3 反转层',
  // v3.1 协议代号作废（v4.1 没有协议代号）
  'SCP（Standard Containment Protocol）',
  'FRP（Fragment Recovery Protocol）',
  'ARP（Anomaly Reception Protocol）',
  'PEP（Permanent Embed Protocol）',
  'Standard Containment Protocol',
  'Fragment Recovery Protocol',
  'Anomaly Reception Protocol',
  'Permanent Embed Protocol',
  // v3.1 上级权威概念作废（v4.1 公司无 face / 无 specific decision-maker · D14 v2 + D21）
  '主任', '月度考核官', '上级权威',
  // v3.1 内训讲师概念作废（v4.1 D29 检测员 = C3 替代）
  '内训讲师', '猴行协议教练',
  // 注："内训部"作为 §5.5 11 部门之一仍合法 — 此项不在 ban，靠 context 区分
  // v3.1 anchor 6 概念作废
  'Anchor 6', '人类记忆残片',
  // v3.1 设定全称作废 → DPCA
  '灵长类辅助文书部',
  // v3.1 KPI 月度概念部分作废（v4.1 用 BATCH/CYCLE/DAY/A 词典）
  '月度小报',
  // 系统反馈违规（audit Tier 1A · context-sensitive：data flag 内可保留，UI / 守则 / system message 上下文禁止）
  '解锁了', '已解锁',
]

export const V3_RESIDUE_BANNED_EN = [
  'Standard Containment Protocol',
  'Fragment Recovery Protocol',
  'Anomaly Reception Protocol',
  'Permanent Embed Protocol',
  'FRP', 'ARP', 'PEP',  // SCP 缩写本身已在 V31_SCP_NAMING_BANNED_EN 防护
  'Tier 0 standard layer', 'Tier 1 perturbation', 'Tier 2 dual-vision', 'Tier 3 inversion',
  'Anchor 6', 'human memory fragment',
  'Department of Primate Clerical Assistance',  // v3.1 推测翻译；v4.1 = Department of Primate Clerical Affairs
]

// ─── v4.1 · audit Tier 1A/1B context-sensitive 禁词（system_message 上下文）───
//
// 这些词在 narrative flavor / in-character stamp 中允许，但在面向玩家的 system message
// （class picker label / tutorial popup / battle UI 提示）中一票否决。
// validators/index.mjs Phase D 会按 context 区分检查。

export const AUDIT_TIER1_BANNED_ZH = {
  system_message: ['授权', '许可', '解锁', '解锁了', '已解锁', '配发', '批准'],
  reason: 'audit Tier 1A/1B + §9.8.3 + D26 v2 + D30：公司不分发 anomaly / 新机制；这些词在 system message 上下文一票否决',
}

export const AUDIT_TIER1_BANNED_EN = {
  system_message: ['unlocked', 'Unlocked', 'authorize', 'authorized', 'permit', 'permitted', 'allocated', 'issued', 'approved'],
  reason: 'same as zh',
}

// ─── v4.1 · audit Tier 2 power fantasy / fanfare 禁式 ───

export const AUDIT_TIER2_BANNED = {
  power_fantasy_phrases_zh: ['获得 X 能力', '获得 X！', '已掌握', '新功能！', '恭喜', '欢迎来到'],
  power_fantasy_phrases_en: ['Welcome to', 'You unlocked', 'Congratulations', 'Achievement Unlocked'],
  fanfare_emoji: ['🎉', '🎊', '🎁', '✨', '🏆', '🎲'],
  reason: 'audit Tier 2A/2B + §8.10.1：0 popup / 0 fanfare / 0 power fantasy 句式',
  context: 'system_message',  // narrative flavor / boss modifier deadly_gift 等 in-character 表达另议
}
