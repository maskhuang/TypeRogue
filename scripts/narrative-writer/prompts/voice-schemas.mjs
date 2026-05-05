// V1-V7 Structured Output Schemas + 反身闭合 Placeholder 词典 (Phase B / v4.1-spec §3)
//
// 与 narrative-design.md §6.3 + §7 + spec §3.3-3.5 对齐。
// 每个 voice 的 schema 控制 LLM 的结构化输出 (Anthropic structured output)。
//
// 注：Phase A 的 WORD_LIMITS_V41 在 config.mjs 已定义；本文件只管 JSON schema shape。

// ============================================
// V5 Layered Footnote 子 schema
// ============================================
//
// 每个 layer entry 含 text_zh/text_en + anomaly_signal_density (0-1)。
// denial 阶段 L3/L4 必须 null（污染层不可见，§4.1 invariant）。

// Anthropic structured output 不支持 oneOf / minimum/maximum / enum+null 联用。
// "null 化" 的字段一律靠 prompt 教 LLM "为 null 时填空 string / empty object"，
// 然后 validators (Phase D) catch 违反。
const layeredEntrySchema = {
  type: 'object',
  properties: {
    text_zh: { type: 'string', description: 'null 时填空字符串 ""' },
    text_en: { type: 'string', description: 'null 时填空字符串 ""' },
    anomaly_signal_density: {
      type: 'number',
      description: 'L1=0 / L2=0-0.2 / L3=0.2-0.5 / L4=0.5-0.8 · null 时填 -1',
    },
  },
  required: ['text_zh', 'text_en', 'anomaly_signal_density'],
  additionalProperties: false,
}

// ============================================
// V1-V7 Schemas
// ============================================

export const VOICE_SCHEMAS_V41 = {
  // ─── V1 · DPCA boilerplate ───
  V1: {
    type: 'object',
    properties: {
      text_zh: { type: 'string', description: 'V1 boilerplate · 短(60 字内) 或 长(200 字内)' },
      text_en: { type: 'string' },
      length_class: { type: 'string', enum: ['short', 'long'] },
    },
    required: ['text_zh', 'text_en', 'length_class'],
    additionalProperties: false,
  },

  // ─── V2 · 同事便条 (peer ghost · C2) ───
  V2: {
    type: 'object',
    properties: {
      text_zh: { type: 'string', description: 'V2 同事便条 · ≤40 字 / 碎句' },
      text_en: { type: 'string' },
      worker_id_signature: {
        type: 'string',
        description: '便条落款工号差，e.g. "047" / "Subject XX-1138" / "" (omit)',
      },
      sentiment: {
        type: 'string',
        enum: ['warning', 'contradictory', 'redacted', 'plea', 'farewell'],
      },
    },
    required: ['text_zh', 'text_en', 'sentiment'],
    additionalProperties: false,
  },

  // ─── V3 · Anomaly dictation (fragment · C5) ───
  V3: {
    type: 'object',
    properties: {
      fragment_zh: { type: 'string', description: 'V3 anomaly fragment · ≤20 字 / 不规则' },
      fragment_en: { type: 'string' },
      drift_pattern: {
        type: 'array',
        items: { type: 'string' },
        description: '可选：字符级缓变序列（Cycle 6+），e.g. ["员工编号 0048", "0049", "0048", "0050"]',
      },
      readability: {
        type: 'string',
        enum: ['fully_readable', 'partial', 'self_consistent_but_alien'],
      },
    },
    required: ['fragment_zh', 'fragment_en', 'readability'],
    additionalProperties: false,
  },

  // ─── V4 · D29 检测员 prompt (C3 voice-only) ───
  V4: {
    type: 'object',
    properties: {
      item_id: {
        type: 'string',
        enum: ['mask', 'name', 'date', 'sentence', 'distinction'],
        description: '5 项标准检测序列',
      },
      degradation_state: {
        type: 'string',
        enum: ['witness', 'routine', 'partial_fail', 'auto_fail'],
        description: 'Ch.1 见证 / Ch.2 routine / Ch.3-4 partial / Ch.5 auto_fail',
      },
      prompt_zh: { type: 'string', description: '"请..." 开头 · ≤30 字' },
      prompt_en: { type: 'string' },
      response_zh: {
        type: ['string', 'null'],
        description: 'partial/fail 阶段的屏幕反馈，e.g. "本项检测对当前职位不适用。" / null = no response',
      },
      response_en: { type: ['string', 'null'] },
    },
    required: ['item_id', 'degradation_state', 'prompt_zh', 'prompt_en'],
    additionalProperties: false,
  },

  // ─── V5 · 规则手册 / 守则 layered (D31) ───
  // 通用 V5 schema（plain 单条规则，无 deny→affirm 配对）
  V5: {
    type: 'object',
    properties: {
      section_ref: { type: 'string', description: 'e.g. "§044", "§087"' },
      references_position: {
        type: 'string',
        enum: ['recorder', 'proofreader', 'reviser', 'author', 'assimilated', 'none'],
        description: '该规则引用的职位；plain 守则填 "none"',
      },
      L1_recorder: layeredEntrySchema,
      L2_proofreader: layeredEntrySchema,
      L3_reviser: layeredEntrySchema,
      L4_author: layeredEntrySchema,
      state: {
        type: 'string',
        enum: ['plain', 'denial', 'affirmation'],
        description: 'plain = 普通规则；denial / affirmation = §4.1 配对的一半',
      },
    },
    required: ['section_ref', 'L1_recorder', 'state'],
    additionalProperties: false,
  },

  // V5_pair · §4.1 deny→affirm 配对（同一 § 号下的 denial + affirmation 双 state）
  V5_pair: {
    type: 'object',
    properties: {
      section_ref: { type: 'string' },
      references_position: {
        type: 'string',
        enum: ['proofreader', 'reviser', 'author', 'assimilated'],
        description: '4 处转换之一；recorder 默认无配对',
      },
      // denial 阶段：L3/L4 用 "_null_" 占位 string + density=-1 标记，validator/ingest 转回 null
      denial: {
        type: 'object',
        properties: {
          L1_recorder: layeredEntrySchema,
          L2_proofreader: layeredEntrySchema,
          L3_reviser: layeredEntrySchema,
          L4_author: layeredEntrySchema,
        },
        required: ['L1_recorder', 'L2_proofreader', 'L3_reviser', 'L4_author'],
        additionalProperties: false,
      },
      // affirmation：assimilated (§144) 时所有 layer 填 "_null_" + density=-1（V5 退场标记）
      affirmation: {
        type: 'object',
        properties: {
          L1_recorder: layeredEntrySchema,
          L2_proofreader: layeredEntrySchema,
          L3_reviser: layeredEntrySchema,
          L4_author: layeredEntrySchema,
          is_null: {
            type: 'boolean',
            description: 'assimilated (§144) 填 true（V5 退场）；其他填 false',
          },
        },
        required: ['L1_recorder', 'L2_proofreader', 'L3_reviser', 'L4_author', 'is_null'],
        additionalProperties: false,
      },
      valid_from_chapter: { type: 'integer' },
      transition_marker: {
        type: 'string',
        enum: ['silent_affirmation', 'silent_disappearance'],
      },
    },
    required: ['section_ref', 'references_position', 'denial', 'affirmation', 'valid_from_chapter'],
    additionalProperties: false,
  },

  // ─── V6 · Boss tooltip / 反身闭合 (C6) ───
  V6: {
    type: 'object',
    properties: {
      text_zh: { type: 'string', description: '含反身闭合 placeholder · ≤80 字' },
      text_en: { type: 'string' },
      placeholders_used: {
        type: 'array',
        items: { type: 'string' },
        description: 'e.g. ["{{ATTRIBUTION:type=approximate_player_worker_id,drift=1}}"]',
      },
      chapter_target: {
        type: 'integer',
        
        
        description: '3 = 近似工号 / 4 = 自己工号 / 5 = 自己以前 endless 工号',
      },
    },
    required: ['text_zh', 'text_en', 'placeholders_used', 'chapter_target'],
    additionalProperties: false,
  },

  // ─── V7 · Environmental structured spec (不输出 text，只输出 spec) ───
  V7: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'e.g. "ch4_workstation_minimalism"' },
      channel: {
        type: 'string',
        enum: ['spatial', 'temporal', 'motion', 'sonic'],
        description: '§7 4 大 environmental channel',
      },
      chapter_scope: {
        type: 'array',
        items: { type: 'integer' },
        description: '此 spec 适用的 chapter（可跨章）',
      },
      spec: {
        type: 'object',
        properties: {
          // spatial
          props_present: { type: 'array', items: { type: 'string' } },
          props_absent: { type: 'array', items: { type: 'string' } },
          // temporal
          clock_state: { type: 'string', description: 'e.g. "no_second_hand", "stopped_at_17:06"' },
          time_window_active: { type: 'string', description: '受理窗口 active interval' },
          // motion (M1-M3 向心矢量)
          motion_vector: { type: 'string', enum: ['centripetal', 'pulsing', 'static', 'none'] },
          motion_intensity: { type: 'number' },
          // sonic
          ambient_sounds: { type: 'array', items: { type: 'string' } },
          sound_density_pct: { type: 'integer' },
          // 通用
          lighting: { type: 'string', description: 'e.g. "fluorescent_dim", "yellow_warm"' },
          ambient_density_pct: { type: 'integer' },
          design_intent: { type: 'string', description: '锚定 §7.x ref / B# 兑现' },
        },
        additionalProperties: true,
      },
    },
    required: ['id', 'channel', 'chapter_scope', 'spec'],
    additionalProperties: false,
  },
}

// ============================================
// 反身闭合 Placeholder 词典 (V6 + spec §3.4)
// ============================================
//
// V6 输出含 placeholder 字符串，runtime 由 PL-5 NarrativeArchive
// （commit f36a331）查询替换。任何未在此词典登记的 placeholder type/source
// 都应被 validators (Phase D) reject。

export const REFLEXIVE_PLACEHOLDER_DICT = {
  // ─── ATTRIBUTION ───
  ATTRIBUTION: {
    types: [
      {
        signature: 'type=current_player_worker_id',
        meaning: 'Ch.4 自己工号；runtime 替换为 localStorage dpca-worker-id',
        source: 'localStorage.getItem("dpca-worker-id")',
      },
      {
        signature: 'type=approximate_player_worker_id, drift=1',
        meaning: 'Ch.3 近似工号（差 1 位）；runtime 取自己工号 ±1',
        source: 'localStorage worker_id ± drift',
      },
      {
        signature: 'type=previous_endless_worker_id',
        meaning: 'Ch.5 自己以前 endless 工号；runtime 查 NarrativeArchive.endlessModifierSignatures',
        source: 'NarrativeArchive.getBossModifierAttribution(modifier).playerWorkerId',
      },
      {
        signature: 'type=previous_endless_worker_id, fallback=...',
        meaning: '同上，附带 fallback 文本（无 PL-5 数据时显示）',
        source: 'PL-5 fallback path',
      },
    ],
  },

  // ─── MODIFIER_TEXT ───
  MODIFIER_TEXT: {
    types: [
      {
        signature: 'source=player_history, chapter=N',
        meaning: '从玩家以前 chapter N 的 typing 历史里取一段（标注 / 修改 / 写过的文字）',
        source: 'NarrativeArchive playerWorkerIdHistory + 关联 entry',
      },
      {
        signature: 'source=player_endless, fallback=...',
        meaning: '从玩家 endless 自由打字内容里取一段',
        source: 'NarrativeArchive endlessFreeTypeNotes',
      },
    ],
  },

  // ─── TIMESTAMP ───
  TIMESTAMP: {
    types: [
      {
        signature: 'format=cycle_relative, drift=-N',
        meaning: '相对当前 cycle 的时间戳，drift 负值 = 过去；runtime 计算',
        source: 'state.cycle - drift',
      },
    ],
  },

  // ─── WORKER_ID_HISTORY ───
  WORKER_ID_HISTORY: {
    types: [
      {
        signature: 'source=player_chapter_clear, chapter=N',
        meaning: '玩家通过 chapter N 时的工号；NarrativeArchive playerWorkerIdHistory 里取',
        source: 'NarrativeArchive playerWorkerIdHistory.find(e => e.chapterCleared === N)',
      },
    ],
  },
}

// 扁平 placeholder pattern set，便于 validators 快速匹配
export const VALID_PLACEHOLDER_PATTERNS = Object.entries(REFLEXIVE_PLACEHOLDER_DICT).flatMap(([family, info]) =>
  info.types.map(t => ({
    family,
    signature: `{{${family}:${t.signature}}}`,
    regex: new RegExp(`\\{\\{${family}:${escapeRegex(t.signature.split(',')[0].trim())}.*?\\}\\}`),
    meaning: t.meaning,
  }))
)

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================
// 助手：根据 type 取主 voice + secondary voices
// ============================================

import { VOICE_TYPE_MAP_V41, VOICES_V41 } from '../config.mjs'

export function getPrimaryVoiceForType(type) {
  const cfg = VOICE_TYPE_MAP_V41[type]
  if (!cfg) return null
  return cfg.primary[0] || null
}

export function getVoicesForType(type) {
  const cfg = VOICE_TYPE_MAP_V41[type]
  if (!cfg) return []
  return [...cfg.primary, ...cfg.secondary]
}

export function getVoiceLabel(voice) {
  return VOICES_V41[voice]?.label || voice
}
