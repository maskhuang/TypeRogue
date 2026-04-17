import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const PROJECT_ROOT = join(__dirname, '..', '..')
export const SRC_ROOT = join(PROJECT_ROOT, 'src')
export const DATA_JSON = join(SRC_ROOT, 'data-json')
export const NARRATIVE_OUT = join(SRC_ROOT, 'src', 'data', 'narrative')
export const OUTPUT_DIR = join(__dirname, 'output')

// Object type → voice mapping: which voices each object type needs
export const VOICE_MAP = {
  relic: {
    bell: { template: 'T1', desc: 'Relic tooltip (🔔 教会)' },
    doc: { template: 'T5', desc: 'Codex 详情页 (🔔+📄 双声)' },
    note: { template: 'note_specific', desc: '特定商店批注 (✏️ 可选)', optional: true },
  },
  affix: {
    bell: { template: 'T2', desc: 'Affix tooltip (🔔 教会)' },
  },
  enchantment: {
    bell: { template: 'T2', desc: 'Enchantment tooltip (🔔 教会)' },
  },
  bossModifier: {
    bell: { template: 'T3a', desc: 'HUD 角标短格言 (🔔 教会)' },
    doc: { template: 'T3b', desc: 'Codex 详情页 (📄 档案)' },
  },
  class: {
    bell: { template: 'T5_bell', desc: '职业 tooltip (🔔 教会)' },
    doc: { template: 'T5_doc', desc: '职业 Codex (📄 档案)' },
  },
  ritual: {
    bell: { template: 'T4', desc: '仪式短句 (🔔 教会)' },
  },
  tutorial: {
    doc: { template: 'T6', desc: 'Tutorial 片段 (📄 档案)' },
  },
  achievement: {
    doc: { template: 'T7', desc: '成就描述 (📄 档案)' },
  },
  scriptorNotes: {
    doc: { template: 'T_scriptor', desc: '守卷人笔记 (📄 档案)' },
  },
  altar: {
    altar: { template: 'altar', desc: '圣坛嘟囔 (🔧)' },
  },
  shopnote: {
    note: { template: 'note_generic', desc: '商店通用批注 (✏️)' },
  },
}

// Anchor person fact table
// Base facts auto-generated from docs/narrative-design.md (run: node scripts/sync-narrative.mjs)
// Pipeline-specific fields (name_bell, name_doc, era_m, traits) maintained here
import { ANCHOR_FACTS as _BASE_FACTS } from './generated/anchor-facts.mjs'

const PIPELINE_FIELDS = {
  scriptor_a: {
    name_bell: '初铭者 Valis',
    name_doc: 'Scriptor V-████',
    name_altar: '那个人',
    era_m: 'M.1██',
    disappear_layer: 6,
    traits: '工整、恭敬、从不质疑',
  },
  scriptor_b: {
    name_bell: '问道者 Kernn',
    name_doc: 'Scriptor K-████',
    name_altar: '按 R 犹豫的那个',
    era_m: 'M.1██',
    disappear_layer: 9,
    traits: '犹豫、紧张、追查 §7.1 全文和引擎档案',
  },
  scriptor_c: {
    name_bell: '悦铭者 Thane',
    name_doc: 'Scriptor T-████',
    name_altar: '喜欢画画的',
    era_m: 'M.2██',
    disappear_layer: 12,
    traits: '轻快、好奇、画小插图、对异文充满喜爱',
  },
  last_signatory: {
    name_bell: '末席守卷人',
    name_doc: '条例签名栏最后有签名的那几份',
    era_m: 'M.2██',
  },
  d_0001: {
    name_doc: 'D-0001',
    era_m: 'M.0██',
    record_trait: '三页冗长征募档案，最后一份被当成"人"写的记录',
  },
}

// Merge: base facts from doc + pipeline-specific fields
export const ANCHOR_FACTS = Object.fromEntries(
  Object.keys({ ..._BASE_FACTS, ...PIPELINE_FIELDS }).map(id => [
    id,
    { ...(_BASE_FACTS[id] || {}), ...(PIPELINE_FIELDS[id] || {}) }
  ])
)

// GW banned terms
export const GW_BANNED = [
  'Adeptus', 'Mechanicus', 'Omnissiah', 'Imperium', 'Emperor',
  'Astartes', 'Space Marine', 'Ecclesiarchy', 'Primarch',
  'Chaos Gods', 'Aquila', 'Cogitator', 'Techpriest',
  'Administratum', 'Inquisition', 'Commissar',
]

// SCP banned real numbers
export const SCP_BANNED_PATTERN = /SCP-\d{3,4}/

// Word limits per voice
export const WORD_LIMITS = {
  bell: { zh_max: 60, en_max: 25, label: '🔔 教会' },
  doc: { lines_max: 8, label: '📄 档案' },
  altar: { zh_max: 20, label: '🔧 圣坛' },
  note: { zh_max: 25, label: '✏️ 批注' },
}

// M-era ranges for validation
export const ERA_RANGES = {
  worship: { min: 1, max: 99, label: '崇拜时代' },
  transition: { min: 100, max: 199, label: '转型时代' },
  empty_chair: { min: 200, max: 299, label: '空椅时代' },
  inertia: { min: 300, max: 999, label: '惯性时代' },
}
