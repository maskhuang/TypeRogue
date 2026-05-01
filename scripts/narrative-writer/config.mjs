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
    doc:  { template: 'mib_equipment',  desc: 'Relic Codex · MIB 装备文书 (B-7 类合规器格式)' },
    bell: { template: 'mib_short',      desc: 'Relic tooltip · 1-2 行短描述' },
  },
  affix: {
    bell: { template: 'mib_short',      desc: 'Affix tooltip · 短描述' },
  },
  enchantment: {
    bell: { template: 'mib_short',      desc: 'Enchantment tooltip · 短描述' },
  },
  bossModifier: {
    doc:  { template: 'mib_policy',     desc: 'Boss Modifier · 月度新政策 #XXX 政策文档' },
    bell: { template: 'mib_short',      desc: 'Boss Modifier · HUD 短格言' },
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
  '收容铭刻', '收容震颤', '收容突破', '站点污染', '祷击', '裂铅', '落版', '复归', '换架',
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
  doc:  { zh_max_lines: 12, en_max_lines: 12, label: 'doc · MIB 长文书' },
  note: { zh_max_chars: 80, en_max_words: 40, label: 'note · 桌面便条 / 商店批注' },
}
