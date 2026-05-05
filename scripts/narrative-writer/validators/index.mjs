import {
  GW_BANNED, SCP_BANNED_PATTERN,
  V2_BANNED_ZH, V2_BANNED_EN,
  V31_SCP_NAMING_BANNED_ZH, V31_SCP_NAMING_BANNED_EN,
  V3_RESIDUE_BANNED_ZH, V3_RESIDUE_BANNED_EN,
  AUDIT_TIER1_BANNED_ZH, AUDIT_TIER1_BANNED_EN, AUDIT_TIER2_BANNED,
  POSITION_TIERS_V41, DPCA_NAMING,
  WORD_LIMITS, ANCHOR_FACTS,
} from '../config.mjs'
import { FORBIDDEN_ZH, FORBIDDEN_EN, B1A_VOCAB } from '../generated/b1a-vocab.mjs'
import { BOILERPLATE_LEXICON as MIB_LEXICON } from '../generated/boilerplate-lexicon.mjs'
import { VALID_PLACEHOLDER_PATTERNS } from '../prompts/voice-schemas.mjs'

// Validate a single fragment against v3 rules.
// Returns { passed: boolean, errors: string[], warnings: string[] }

export function validateFragment(fragment, voice, template = null) {
  // v3.1 per_tier_flavor: 内部展开为 4 个 tier 子 fragment，每个用 bell voice 标准检查
  if (voice === 'per_tier_flavor') {
    return validatePerTierFlavor(fragment, template)
  }

  const errors = []
  const warnings = []

  errors.push(...checkWordLimit(fragment, voice))
  errors.push(...checkV2Residue(fragment))
  errors.push(...checkB1aForbidden(fragment))
  errors.push(...checkNumerics(fragment, voice))
  errors.push(...checkVoiceRules(fragment, voice, template))
  errors.push(...checkIPCompliance(fragment))
  errors.push(...checkAnchorConsistency(fragment))
  warnings.push(...softCheckMibSignals(fragment, voice, template))

  return { passed: errors.length === 0, errors, warnings }
}

// v3.1 per_tier_flavor 验证：展开为 4 个 tier 子 fragment 各自走 bell 标准
function validatePerTierFlavor(fragment, template) {
  const errors = []
  const warnings = []

  // 1. 必须有 name + 4 tier × zh/en = 10 字段
  const requiredFields = ['name_zh', 'name_en',
    'tier_0_zh', 'tier_0_en', 'tier_1_zh', 'tier_1_en',
    'tier_2_zh', 'tier_2_en', 'tier_3_zh', 'tier_3_en']
  for (const f of requiredFields) {
    if (!fragment[f] || fragment[f].trim() === '') {
      errors.push(`per_tier_flavor 缺字段: ${f}`)
    }
  }

  // 2. 每个 tier 用 per_tier voice 标准（≤ 40 字 zh / ≤ 20 words en，比 bell 略宽）
  for (let t = 0; t <= 3; t++) {
    const tierFragment = {
      text_zh: fragment[`tier_${t}_zh`] || '',
      text_en: fragment[`tier_${t}_en`] || '',
      name_zh: fragment.name_zh || '',
      name_en: fragment.name_en || '',
    }
    const tierResult = {
      errs: [],
      warnings: [],
    }
    tierResult.errs.push(...checkWordLimit(tierFragment, 'per_tier'))
    tierResult.errs.push(...checkV2Residue(tierFragment))
    tierResult.errs.push(...checkB1aForbidden(tierFragment))
    tierResult.errs.push(...checkNumerics(tierFragment, 'per_tier'))
    tierResult.errs.push(...checkIPCompliance(tierFragment))
    tierResult.errs.push(...checkAnchorConsistency(tierFragment))

    for (const e of tierResult.errs) errors.push(`[tier ${t}] ${e}`)
  }

  // 3. 4 个 tier 不能完全相同（至少需要 3 个 distinct zh 文本）
  const zhTexts = [0, 1, 2, 3].map(t => fragment[`tier_${t}_zh`] || '')
  const distinctZh = new Set(zhTexts.filter(Boolean))
  if (distinctZh.size < 3) {
    errors.push(`4 个 tier 视角不够区分（仅 ${distinctZh.size} 个不同 zh 文本）—— 必须每个 tier 视角不同`)
  }

  // 4. Tier 3 必须有 POV 反转标记之一（"样本 #" / "持有人" / "subject" / "research" 等）
  const tier3Combined = `${fragment.tier_3_zh || ''} ${fragment.tier_3_en || ''}`.toLowerCase()
  const povMarkers = /样本\s*#|持有人|holder|subject\s*#|research|behavioral|conformance/i
  if (!povMarkers.test(tier3Combined)) {
    warnings.push(`Tier 3 缺 POV 反转标记（建议: "样本 #485,902 / 持有人 / subject / research / behavioral"）`)
  }

  return { passed: errors.length === 0, errors, warnings }
}

// ─── Helpers ───

function getTextContent(fragment) {
  return [fragment.text_zh, fragment.text_en, fragment.name_zh, fragment.name_en]
    .filter(Boolean).join(' ')
}

function countZhChars(s) {
  // Count CJK code points; treat run of latin/digit as a "word".
  if (!s) return 0
  return s.length
}

function countEnWords(s) {
  if (!s) return 0
  return s.trim().split(/\s+/).filter(Boolean).length
}

// ─── Checks ───

function checkWordLimit(fragment, voice) {
  const limits = WORD_LIMITS[voice]
  if (!limits) return []
  const errors = []

  if (limits.zh_max_chars && fragment.text_zh) {
    const len = countZhChars(fragment.text_zh)
    if (len > limits.zh_max_chars * 1.2) {
      errors.push(`${limits.label} 中文超长: ${len} 字（上限 ${limits.zh_max_chars}）`)
    }
  }
  if (limits.en_max_words && fragment.text_en) {
    const w = countEnWords(fragment.text_en)
    if (w > limits.en_max_words * 1.2) {
      errors.push(`${limits.label} 英文超长: ${w} 词（上限 ${limits.en_max_words}）`)
    }
  }
  if (limits.zh_max_lines && fragment.text_zh) {
    const lines = fragment.text_zh.split('\n').filter(l => l.trim()).length
    if (lines > limits.zh_max_lines) {
      errors.push(`${limits.label} 中文行数超限: ${lines} 行（上限 ${limits.zh_max_lines}）`)
    }
  }
  if (limits.en_max_lines && fragment.text_en) {
    const lines = fragment.text_en.split('\n').filter(l => l.trim()).length
    if (lines > limits.en_max_lines) {
      errors.push(`${limits.label} 英文行数超限: ${lines} 行（上限 ${limits.en_max_lines}）`)
    }
  }

  return errors
}

function checkV2Residue(fragment) {
  const errors = []
  const zh = fragment.text_zh || ''
  const en = fragment.text_en || ''
  const allText = `${zh} ${fragment.name_zh || ''}`
  const allEn = `${en} ${fragment.name_en || ''}`

  for (const term of V2_BANNED_ZH) {
    if (allText.includes(term)) {
      errors.push(`v2.3 残留词: "${term}"（属于活字大教堂方向，已废弃）`)
    }
  }
  for (const term of V2_BANNED_EN) {
    if (new RegExp(`\\b${escapeRe(term)}\\b`, 'i').test(allEn)) {
      errors.push(`v2.3 residue: "${term}" (Ironpress Cathedral direction, deprecated)`)
    }
  }
  // v3.1 NEW · 不命名 SCP 条款（决议 3）
  for (const term of V31_SCP_NAMING_BANNED_ZH) {
    if (allText.includes(term)) {
      errors.push(`v3.1 不命名条款违反: "${term}"（玩家凭 genre 直觉识别，永远不直接命名 SCP）`)
    }
  }
  for (const term of V31_SCP_NAMING_BANNED_EN) {
    if (new RegExp(`\\b${escapeRe(term)}\\b`, 'i').test(allEn)) {
      errors.push(`v3.1 SCP-naming violation: "${term}" (cannot directly name SCP Foundation per "do not name" decision)`)
    }
  }

  return errors
}

function checkB1aForbidden(fragment) {
  const errors = []
  const zh = `${fragment.text_zh || ''} ${fragment.name_zh || ''}`
  const en = `${fragment.text_en || ''} ${fragment.name_en || ''}`

  for (const { word, category, reason } of FORBIDDEN_ZH) {
    if (!word) continue
    if (zh.includes(word)) {
      errors.push(`B1.a 违规 · ${category}: "${word}"（${reason}）`)
    }
  }

  for (const { word, category, reason } of FORBIDDEN_EN) {
    if (!word) continue
    // Whole-word match for English (avoid "explore" matching "explored" — actually we DO want to catch tense variants)
    // Use a slightly looser match: word boundary at start, allow ed/ing/s suffix
    const re = new RegExp(`\\b${escapeRe(word)}(?:s|ed|ing|er|d)?\\b`, 'i')
    if (re.test(en)) {
      errors.push(`B1.a violation · ${category}: "${word}" (${reason})`)
    }
  }

  // Context-sensitive heuristic: warn (not error) on dangerous-pattern usage
  // For "学习/improve/research/master" — check if subject seems to be employee
  // Simple heuristic skipped here — too noisy. Left to AI review.

  return errors
}

function checkNumerics(fragment, voice) {
  const errors = []
  const zh = fragment.text_zh || ''
  const en = fragment.text_en || ''

  // No percentages / multipliers / + values / numeric+unit
  const numericPatterns = [
    { re: /\d+(\.\d+)?%/, label: '百分比' },
    { re: /[×xX]\s*\d+(\.\d+)?(?!\s*[A-Za-z])/, label: '倍率' },
    { re: /\+\d+/, label: '加值' },
    { re: /\b\d{2,}\s*(秒|点|次|层|格|倍|级)\b/, label: '数值+单位 (zh)' },
    { re: /\b\d+(\.\d+)?\s*(seconds?|points?|times?|layers?|stacks?)\b/i, label: '数值+单位 (en)' },
  ]
  for (const { re, label } of numericPatterns) {
    if (re.test(zh) || re.test(en)) {
      errors.push(`含机制数值（${label}）—— 用物质隐喻或 ██ 遮蔽替代`)
      break // one error is enough
    }
  }

  // Bare numbers (catches "下降17"、"15铅币")
  // Exempt: ██ redaction / 工号 #485,902 / 政策编号 #082 / Section 9 / B-7 / C-2
  if (voice !== 'doc' || !/^[\s\S]*$/.test('')) {  // for now apply to all voices, but check exemptions carefully
    const stripped = zh
      .replace(/██+/g, '')
      .replace(/#\d{1,3}(?:,\d{3})?/g, '') // #485,902 #082
      .replace(/[A-Z]+-?\d+/g, '')         // B-7, RX-617
      .replace(/Section\s*\d+/gi, '')
      .replace(/Cycle\s*\d+/gi, '')
      .replace(/§[\d.]+/g, '')
    const m = stripped.match(/(?<![A-Za-z\-#])(\d{2,})(?!\d)/)
    if (m && voice !== 'doc') {  // doc may use timestamps / archive refs more liberally
      errors.push(`含裸数值: "${m[1]}"（应用 ██ 遮蔽 / 模糊量化 / 政策编号包装）`)
    }
  }

  // Chinese counter words — 仅检查 mechanic 量词（倍 / 层 / 次）；lore 计数（份/枚/件/条/字/页/封/张/起/名）免检
  const mechanicCnNumMatch = zh.match(/([二三四五六七八九十百千万]{1,4}[倍层次])/)
  if (mechanicCnNumMatch) {
    const allowed = ['一次']
    if (!allowed.includes(mechanicCnNumMatch[1])) {
      errors.push(`含机制汉字数值: "${mechanicCnNumMatch[1]}" — 用模糊量化或 ██ 替代`)
    }
  }

  return errors
}

function checkVoiceRules(fragment, voice, template) {
  const errors = []
  const text = getTextContent(fragment)
  const zh = fragment.text_zh || ''
  const en = fragment.text_en || ''

  // Universal: no game-mechanic terms
  const mechanicTermsZh = [
    '装备栏', '技能栏', '背包', '物品栏', '血条', '进度条',
    '触发条件', '层数', '叠加', '倍率', '概率', '成功率', '失败率',
    '加成', '提升', '降低', '增加', '减少', '产出', '上限', '下限',
    '取消', '抵消', '免疫', '刷新', '冷却',
  ]
  for (const t of mechanicTermsZh) {
    if (zh.includes(t)) {
      errors.push(`含游戏机制术语: "${t}" — 用 v3 体制语言或物质隐喻替代`)
    }
  }
  const mechanicTermsEn = [
    'combo', 'buff', 'debuff', 'DPS', 'cooldown', 'proc',
    'equipment slot', 'loadout', 'skill slot',
    'trigger condition', 'stack', 'multiplier', 'tier',
    'increase', 'decrease', 'boost', 'cap',
  ]
  for (const t of mechanicTermsEn) {
    const re = new RegExp(`\\b${escapeRe(t)}\\b`, 'i')
    if (re.test(en)) {
      errors.push(`Game-mechanic term: "${t}" — use v3 institutional language`)
    }
  }
  // "inventory" 在游戏 UI 上下文禁，但库存 / 物资清单等官僚用法 OK — 仅游戏组合词触发
  const inventoryGameContext = /\binventory\s+(slot|cap|space|management\s+system|UI)\b/i
  if (inventoryGameContext.test(en)) {
    errors.push(`Game-mechanic term: "inventory" in game UI context — use v3 institutional language (e.g., "stock list", "requisition records")`)
  }

  // Universal: ban "不是…而是…" pattern (writer explanation)
  if (/不是.{1,20}而是/.test(zh)) {
    errors.push('含"不是…而是…"句式 — 体制只陈述事实，不做对比论述')
  }

  // Universal: no SCP-style Object Class (v2.3 residue)
  for (const term of ['Object Class', 'Class: Safe', 'Class: Euclid', 'Keter', 'Thaumiel']) {
    if (text.includes(term)) {
      errors.push(`含 SCP 风分级术语 "${term}" — v3 用 MIB 风分类编号（B-7 类合规器 / Section 9 等）`)
    }
  }

  switch (voice) {
    case 'bell':
      errors.push(...checkBellRules(zh, en, text))
      break
    case 'doc':
      errors.push(...checkDocRules(zh, en, text))
      break
    case 'note':
      errors.push(...checkNoteRules(zh, en, text, template))
      break
  }

  return errors
}

function checkBellRules(zh, en, text) {
  const errors = []

  // Mechanic-transparent terms (1-2 line short tooltip should not describe mechanics)
  const transparent = [
    '额外', '触发', '翻倍', '跳过', '基准', '下限', '上限',
    'trigger', 'bonus', 'skip', 'chance', 'threshold',
  ]
  for (const t of transparent) {
    const re = new RegExp(`\\b${escapeRe(t)}\\b`, 'i')
    if ((zh && zh.includes(t)) || re.test(en)) {
      errors.push(`bell 含机制透明词: "${t}"`)
    }
  }

  // Modern jargon
  const modernJargon = ['流程', '数据', '效率', '系统', '参数', '功能', '机制']
  for (const t of modernJargon) {
    if (zh.includes(t)) errors.push(`bell 含现代抽象词: "${t}"`)
  }

  // 1-2 line max for bell
  const zhLines = zh.split('\n').filter(l => l.trim()).length
  if (zhLines > 2) errors.push(`bell 中文行数超限: ${zhLines} 行（上限 2）`)

  return errors
}

function checkDocRules(zh, en, text) {
  const errors = []

  // No emoji
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) errors.push('doc 含 emoji')

  // No uncertain language (institutional voice is authoritative)
  if (/(我觉得|似乎|大概)/.test(zh) || /\b(I think|maybe|perhaps|seems? to)\b/i.test(en)) {
    errors.push('doc 含不确定语气 — 体制文件是权威的')
  }

  // No mechanic explanation phrases
  const mechExplain = [
    '使.{1,8}效率提升', '使.{1,8}效率下降',
    '机制分析', '功能描述', '效果描述',
    'mechanism analysis', 'effect description',
  ]
  for (const pattern of mechExplain) {
    const re = new RegExp(pattern, 'i')
    if (re.test(text)) errors.push(`doc 含机制解释短语 — 档案记录现象，不解释机制（命中: "${pattern}"）`)
  }

  return errors
}

function checkNoteRules(zh, en, text, template) {
  const errors = []

  if (template === 'desk_note') {
    // #485,901 desk note: must NOT contain MIB signal words
    // (private space, not 公文)
    const mibSignals = MIB_LEXICON.signal.flatMap(s => s.examples)
    for (const sig of mibSignals) {
      if (text.includes(sig)) {
        errors.push(`desk_note 含 MIB 信号词 "${sig}" — 桌面便条是私人空间，不是公文`)
      }
    }

    // Must not be too formal
    if (/^(主题|颁布单位|分发对象|分类[:：])/m.test(zh)) {
      errors.push('desk_note 含公文格式头 — 桌面便条是破碎的私人短句')
    }

    // ≤4 段
    const paragraphs = zh.split(/\n\n+/).filter(p => p.trim()).length
    if (paragraphs > 4) errors.push(`desk_note 段落超限: ${paragraphs} 段（上限 4）`)
  }

  // shop_blurb: no piety / no formal headers
  if (template === 'shop_blurb') {
    const piety = ['圣', '虔诚', 'Sacred', 'Holy', 'Thou', 'Thy']
    for (const t of piety) {
      const re = new RegExp(`\\b${escapeRe(t)}\\b`, 'i')
      if (zh.includes(t) || re.test(en)) errors.push(`shop_blurb 含虔诚语汇: "${t}"`)
    }
  }

  return errors
}

function checkIPCompliance(fragment) {
  const errors = []
  const text = getTextContent(fragment)

  for (const term of GW_BANNED) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`IP 违规: GW 专有名词 "${term}"`)
    }
  }
  if (SCP_BANNED_PATTERN.test(text)) {
    errors.push('IP 违规: 含 SCP 真实编号')
  }

  return errors
}

function checkAnchorConsistency(fragment) {
  const errors = []
  const text = getTextContent(fragment)

  // Rule: HR is 无形 — never given a personal name
  // If text contains "HR" but appends a name, flag it.
  // (Heuristic — skip if false positive prone.)

  // Rule: 主任 and 月度考核官 are two 显形 of the same anchor.
  // If both appear in the same fragment AND the text frames them as separate people, warn.
  // (Soft check — skip detection is hard. Trust prompt.)

  // Rule: never use v2.3 anchor IDs (scriptor_a/b/c/d/e/last_signatory/d_0001) as anchor names
  const v2AnchorPhrases = [
    '守卷人 A', '守卷人 B', '守卷人 C', '守卷人 D', '守卷人 E',
    'Scriptor A', 'Scriptor B', 'Scriptor C',
    '议会末席', '末席守卷人', '初铭者', '问道者', '悦铭者', '验铭者',
    'Valis', 'Kernn', 'Thane', 'Selen',
  ]
  for (const p of v2AnchorPhrases) {
    if (text.includes(p)) {
      errors.push(`v2.3 锚点残留: "${p}" — v3 锚点是 #485,902 / 上级权威 / HR / 内训讲师 / 同事们 / #485,901`)
    }
  }

  // Rule: 玩家工号永远是 #485,902（不是其他）
  const wrongPlayerId = text.match(/#(\d{3},\d{3})\s*号雇员/)
  if (wrongPlayerId && wrongPlayerId[1] !== '485,902') {
    errors.push(`玩家工号不一致: 文中出现 #${wrongPlayerId[1]}，应为 #485,902`)
  }

  return errors
}

function softCheckMibSignals(fragment, voice, template) {
  const warnings = []
  // For mib_equipment / mib_policy doc — should contain at least one MIB signal word
  if (voice === 'doc' && (template === 'mib_equipment' || template === 'mib_policy')) {
    const text = getTextContent(fragment)
    const allSignals = MIB_LEXICON.signal.flatMap(s => s.examples)
    const hasAny = allSignals.some(sig => text.includes(sig))
      || /[A-Z]-\d{1,3}\s*类/.test(text)        // B-7 类 / C-2 类 catch
      || /Section\s*\d+/i.test(text)             // Section X
      || /#\d{2,4}/.test(text)                   // 政策编号 #082
      || /[A-Z]X-\d{3}/.test(text)               // RX-617 etc
    if (!hasAny) {
      warnings.push(`${template} 未检测到 MIB 信号词（分类编号 / Section X / 政策 #XXX 等）— 可能不够 MIB`)
    }
  }
  return warnings
}

// ─── Utils ───

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ============================================
// v4.1 Validators (Phase D / spec §5)
// ============================================
//
// 8 个 v4.1 validator + validateFragmentV41 dispatcher。
// universal validators（V3 残留 / audit Tier 1 / fanfare / PI / class id）接入
// validateFragment 给 v3.1 路径用；V5/V6 专属（layered stratification / deny→affirm vocab /
// placeholder syntax）由 validateFragmentV41 调用。
//
// 设计纪律（§5.3 Phase D Done）：
//   - validators 输出**仅 reject reason**，不"修复"
//   - context-sensitive：system_message 上下文严格 / narrative flavor 上下文宽松
//   - false positive 0：Phase C 数据 (4 对 entries + 5 sample rules + 10 patterns) 必须全部 pass

// ─── 1 · checkV3Residue · 通用 ───

export function checkV3Residue(text, lang = 'zh') {
  const errors = []
  const banList = lang === 'zh' ? V3_RESIDUE_BANNED_ZH : V3_RESIDUE_BANNED_EN
  for (const term of banList) {
    if (!term) continue
    if (lang === 'zh') {
      if (text.includes(term)) {
        errors.push(`v3.1 残留禁词: "${term}"（v4.1 已作废，参考 config.V3_RESIDUE_BANNED_ZH）`)
      }
    } else {
      // EN: word-boundary match
      const re = new RegExp(`\\b${escapeRe(term)}\\b`, 'i')
      if (re.test(text)) {
        errors.push(`v3.1 EN residue: "${term}" (v4.1 deprecated)`)
      }
    }
  }
  return errors
}

// ─── 2 · checkAuditTier1Banned · context-sensitive ───
//
// audit Tier 1A/1B 禁词：授权 / 许可 / 解锁 / 配发 等。
// 仅 system_message 上下文 reject；in-character stamp / boilerplate 文本中允许。
// @param context "system_message" | "narrative_flavor" | "in_character_stamp" | undefined
export function checkAuditTier1Banned(text, lang = 'zh', context) {
  const errors = []
  if (context !== 'system_message') return errors  // 其他 context 跳过

  const banList = lang === 'zh' ? AUDIT_TIER1_BANNED_ZH : AUDIT_TIER1_BANNED_EN
  for (const term of banList.system_message) {
    if (!term) continue
    if (lang === 'zh') {
      if (text.includes(term)) {
        errors.push(`audit Tier 1A/1B [${context}]: "${term}"（${banList.reason}）`)
      }
    } else {
      const re = new RegExp(`\\b${escapeRe(term)}\\b`, 'i')
      if (re.test(text)) {
        errors.push(`audit Tier 1A/1B [${context}]: "${term}" (${banList.reason})`)
      }
    }
  }
  return errors
}

// ─── 3 · checkFanfarePattern · voice-context-sensitive ───
//
// V1 / V5 / V6 不应含 fanfare（§8.10.1 0 fanfare 铁律）。
// V2 同事便条 / V7 environmental 不在此约束。
export function checkFanfarePattern(text, voice) {
  const errors = []
  const fanfareEnforcedVoices = new Set(['V1', 'V5', 'V5_pair', 'V6'])
  if (!fanfareEnforcedVoices.has(voice)) return errors

  // Fanfare emoji
  for (const emoji of AUDIT_TIER2_BANNED.fanfare_emoji) {
    if (text.includes(emoji)) {
      errors.push(`fanfare emoji [${voice}]: "${emoji}"（§8.10.1 + audit Tier 2A）`)
    }
  }

  // Power fantasy 句式
  for (const phrase of AUDIT_TIER2_BANNED.power_fantasy_phrases_zh) {
    if (text.includes(phrase)) {
      errors.push(`power fantasy 句式 [${voice}]: "${phrase}"（audit Tier 2B）`)
    }
  }
  for (const phrase of AUDIT_TIER2_BANNED.power_fantasy_phrases_en) {
    if (new RegExp(escapeRe(phrase), 'i').test(text)) {
      errors.push(`power fantasy phrase [${voice}]: "${phrase}" (audit Tier 2B)`)
    }
  }

  // V1 不允许感叹号 / 问号（§6.3.1）
  if (voice === 'V1') {
    if (/[!！?？]/.test(text)) {
      errors.push(`V1 boilerplate 含感叹号 / 问号 — V1 标点仅句号 / 冒号 / 顿号（§6.3.1）`)
    }
  }

  return errors
}

// ─── 4 · checkLayeredStratification · V5 / V5_pair only ───
//
// 两种 fragment 形态分别检查：
//
//   形态 A · 完整 4-layer V5 fragment（V5 plain / V5_pair denial / V5_pair affirmation）
//     L1 anomaly_signal_density = 0（严格——L1 是 boilerplate "诚实的镜子"基线）
//     L2 0 - 0.2
//     L3 0.2 - 0.5
//     L4 0.5 - 0.8
//
//   形态 B · 单层 snapshot（redaction-versioning entry · 仅 L1）
//     L1 [0, 0.5]（放宽——silent_amendment / addition / replacement 本身是 L1 污染信号）
//     L2/L3/L4 absent
//
// 跨层 density 反向递减 = reject。
export function checkLayeredStratification(layered) {
  const errors = []

  // 检测形态：full 4-layer 还是 single-layer snapshot
  const populatedLayers = ['L2_proofreader', 'L3_reviser', 'L4_author'].filter(k => layered[k] != null)
  const isSingleLayerSnapshot = populatedLayers.length === 0

  const checkLayer = (layer, name, expectedRange) => {
    if (!layer) return
    const d = layer.anomaly_signal_density
    if (typeof d !== 'number' || isNaN(d)) {
      errors.push(`${name}: anomaly_signal_density 必须是 0-1 数字`)
      return
    }
    if (d < expectedRange[0] || d > expectedRange[1]) {
      errors.push(`${name}: anomaly_signal_density ${d} 超出范围 [${expectedRange[0]}, ${expectedRange[1]}]`)
    }
  }

  if (isSingleLayerSnapshot) {
    // 单层 snapshot — silent修订版本的 L1 可含污染信号
    checkLayer(layered.L1_recorder, 'L1_recorder (single-layer snapshot)', [0, 0.5])
    return errors
  }

  // 完整 4-layer fragment
  checkLayer(layered.L1_recorder,    'L1_recorder',    [0,    0])
  checkLayer(layered.L2_proofreader, 'L2_proofreader', [0,    0.2])
  checkLayer(layered.L3_reviser,     'L3_reviser',    [0.2,  0.5])
  checkLayer(layered.L4_author,      'L4_author',      [0.5,  0.8])

  // 单调性
  const layers = ['L1_recorder', 'L2_proofreader', 'L3_reviser', 'L4_author']
  for (let i = 1; i < layers.length; i++) {
    const prev = layered[layers[i - 1]]
    const cur  = layered[layers[i]]
    if (prev && cur && cur.anomaly_signal_density < prev.anomaly_signal_density) {
      errors.push(`${layers[i]} density (${cur.anomaly_signal_density}) < ${layers[i - 1]} (${prev.anomaly_signal_density}) — 反向递减是 horror gradient 违反`)
    }
  }
  return errors
}

// ─── 5 · checkDenialAffirmationVocabulary · V5_pair only ───
//
// denial L1 禁词：目前 / 暂时 / 待定 / 候补（必须斩钉截铁否认）
// affirmation L1 禁词：新增 / new / 解锁 / 自即日起 / Welcome（必须当作"一直存在"写）
// denial 阶段 L3/L4 必须 null
// §144 affirmation 必须整体 null
export function checkDenialAffirmationVocabulary(pair) {
  const errors = []

  // denial 阶段 L3/L4 = null（污染层不可见）
  if (pair.denial) {
    if (pair.denial.L3_reviser !== null) {
      errors.push(`denial 阶段 L3_reviser 必须 null（污染层不可见，公司在保护）`)
    }
    if (pair.denial.L4_author !== null) {
      errors.push(`denial 阶段 L4_author 必须 null`)
    }
    // denial L1 禁词
    const denialBanZh = ['目前', '暂时', '待定', '候补']
    const denialBanEn = ['currently', 'for now', 'pending', 'tentative', 'candidate']
    const l1zh = pair.denial.L1_recorder?.text_zh || ''
    const l1en = pair.denial.L1_recorder?.text_en || ''
    for (const w of denialBanZh) {
      if (l1zh.includes(w)) errors.push(`denial L1 禁词 "${w}"（必须斩钉截铁否认）`)
    }
    for (const w of denialBanEn) {
      if (new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(l1en)) {
        errors.push(`denial L1 EN forbidden "${w}" (must absolutely deny)`)
      }
    }
  }

  // §144 (assimilated) affirmation 必须整体 null
  if (pair.references_position === 'assimilated' && pair.affirmation !== null) {
    errors.push(`§144 (assimilated) affirmation 必须整体 null（V5 完全退场）`)
  }

  // 其他 § 号 affirmation L1 禁词
  if (pair.affirmation) {
    const affirmBanZh = ['新增', '解锁', '自即日起', '自本月起']
    const affirmBanEn = ['newly added', 'unlocked', 'as of today', 'Welcome']
    const l1zh = pair.affirmation.L1_recorder?.text_zh || ''
    const l1en = pair.affirmation.L1_recorder?.text_en || ''
    for (const w of affirmBanZh) {
      if (l1zh.includes(w)) errors.push(`affirmation L1 禁词 "${w}"（必须当作"一直存在"写）`)
    }
    for (const w of affirmBanEn) {
      if (new RegExp(`\\b${escapeRe(w)}\\b`, 'i').test(l1en)) {
        errors.push(`affirmation L1 EN forbidden "${w}" (must read 'always existed')`)
      }
    }
    // affirmation 4 layers 必须全 populated
    for (const k of ['L1_recorder', 'L2_proofreader', 'L3_reviser', 'L4_author']) {
      if (!pair.affirmation[k]) {
        errors.push(`affirmation ${k} 不可为 null（污染层对你可见了——这才是 horror）`)
      }
    }
  }

  return errors
}

// ─── 6 · checkPlaceholderSyntax · V6 only ───
//
// V6 反身闭合 placeholder 必须在 voice-schemas.mjs VALID_PLACEHOLDER_PATTERNS 中登记。
// 任何未登记的 {{...}} = reject。
const PLACEHOLDER_RE = /\{\{[A-Z_]+:[^}]*\}\}/g
export function checkPlaceholderSyntax(text) {
  const errors = []
  const matches = text.match(PLACEHOLDER_RE) || []
  for (const m of matches) {
    // 检查 family
    const familyMatch = m.match(/\{\{([A-Z_]+):/)
    if (!familyMatch) {
      errors.push(`placeholder syntax 错误: "${m}"`)
      continue
    }
    const family = familyMatch[1]
    const familyKnown = VALID_PLACEHOLDER_PATTERNS.some(p => p.family === family)
    if (!familyKnown) {
      errors.push(`placeholder family 未登记: "${family}"（合法 family: ${[...new Set(VALID_PLACEHOLDER_PATTERNS.map(p => p.family))].join(' / ')}）`)
      continue
    }
    // 检查 signature 是否匹配某个 known pattern
    const matchedPattern = VALID_PLACEHOLDER_PATTERNS.some(p => p.regex.test(m))
    if (!matchedPattern) {
      errors.push(`placeholder signature 未登记: "${m}"（参考 voice-schemas.mjs REFLEXIVE_PLACEHOLDER_DICT）`)
    }
  }
  return errors
}

// ─── 7 · checkMOKONameLeakage · 通用 ───
//
// "MOKO / 灵长接口 / Primate Interface / PI" 在玩家可见 UI 上下文一律 reject。
// 注：
//   - v4.1 LOCKED 单名 = MOKO（§5.4 LOCKED）；v4.0/v4.1-early 命名 灵长接口 / Primate Interface / PI 已 retract
//   - "MOKO" / "PI" 单独缩写在英文里可能误命中（非常罕见），用组合检测降低 false positive
//   - 中文标题 "灵长类辅助文书部" 已被 DPCA_NAMING.forbidden_in_ui 锁定（DPCA 替换）
export function checkMOKONameLeakage(text, voice) {
  const errors = []
  // v4.1 单名 MOKO + v4.0/v4.1-early retract 命名
  const mokoLeakTerms = [
    'MOKO 接口', 'MOKO screen', 'MOKO 屏幕', 'MOKO 系统', 'MOKO 已激活',
    '灵长接口', 'Primate Interface',
    'PI 接口', 'PI screen', 'PI 屏幕', 'PI 系统', 'PI 已激活',
    'Interface activated',
  ]
  for (const term of mokoLeakTerms) {
    if (text.includes(term)) {
      errors.push(`MOKO 内部名泄漏: "${term}" — §5.4.3 铁律 "MOKO 名字永不在 UI 显化"（voice ${voice}）`)
    }
  }
  // DPCA_NAMING 禁词：UI 全用 "DPCA" 缩写
  for (const term of DPCA_NAMING.forbidden_in_ui) {
    if (text.includes(term)) {
      errors.push(`DPCA 命名违规: "${term}" — UI 全用 "DPCA" 缩写（${DPCA_NAMING.forbidden_reason}）`)
    }
  }
  return errors
}

// ─── 8 · checkClassRenamingConsistency · 通用 ───
//
// 5 工种 narrative tier id (recorder/proofreader/reviser/author/assimilated) 是 flavor 唯一合法名。
// code id (none/wordsmith/metamorph/endless) 是存档兼容字段，不应出现在 flavor 输出中。
//
// 注：英文 "author" / "recorder" / "reviser" 是普通词，可能在自然语境里出现。validator
// 只检查中文 code id 短语和 v3.1 残留命名。
export function checkClassRenamingConsistency(text) {
  const errors = []
  // v3.1 残留命名（已 deprecated）— 在 V3_RESIDUE_BANNED 列表里也有，重复检查无害
  const v31Class = ['文字工匠', '异体抄录员', '终身雇员', '普通灵长抄录员']
  for (const term of v31Class) {
    if (text.includes(term)) {
      errors.push(`v3.1 工种命名残留: "${term}" — 用 v4.1 narrative tier id (录入员 / 校对者 / 修改者 / 作者 / 文本一部分)`)
    }
  }
  // code id 形式（"classId: none" / "类别: wordsmith"）— 仅在 flavor 输出 reject；schema 字段不在 flavor 内
  const codeIdInFlavor = /(类别|class[A-Z_]?[Ii]d|职业 id)\s*[:：=]?\s*(none|wordsmith|metamorph|endless|proofreader)\b/
  if (codeIdInFlavor.test(text)) {
    const m = text.match(codeIdInFlavor)
    errors.push(`code id 出现在 flavor: "${m[0]}" — 用 narrative tier id（录入员 / 校对者 / 修改者 / 作者 / 文本一部分）`)
  }
  return errors
}

// ============================================
// validateFragmentV41 · v4.1 fragment 主验证入口
// ============================================
//
// @param fragment v4.1 voice 输出（V1-V7 / V5_pair）
// @param voice    "V1" | "V2" | ... | "V7" | "V5_pair"
// @param ctx      { context: "system_message" | "narrative_flavor" | "in_character_stamp" }
export function validateFragmentV41(fragment, voice, ctx = {}) {
  const errors = []
  const warnings = []
  const messageContext = ctx.context || 'narrative_flavor'

  // 提取所有 text 字段
  const allTextZh = collectV41TextZh(fragment, voice)
  const allTextEn = collectV41TextEn(fragment, voice)
  const allText = `${allTextZh} ${allTextEn}`

  // Universal checks
  errors.push(...checkV3Residue(allTextZh, 'zh'))
  errors.push(...checkV3Residue(allTextEn, 'en'))
  errors.push(...checkAuditTier1Banned(allTextZh, 'zh', messageContext))
  errors.push(...checkAuditTier1Banned(allTextEn, 'en', messageContext))
  errors.push(...checkFanfarePattern(allText, voice))
  errors.push(...checkMOKONameLeakage(allText, voice))
  errors.push(...checkClassRenamingConsistency(allText))

  // V2 / V3 / V4 / V7 路径检查（继承 v3.1 的 IP / B1.a / GW 等）
  errors.push(...checkIPCompliance({ text_zh: allTextZh, text_en: allTextEn }))
  // V2.3 残留（继承 v3.1）
  for (const term of V2_BANNED_ZH) {
    if (allTextZh.includes(term)) errors.push(`v2.3 残留: "${term}"`)
  }

  // Voice-specific checks
  if (voice === 'V5') {
    errors.push(...checkLayeredStratification(fragment))
  } else if (voice === 'V5_pair') {
    errors.push(...checkDenialAffirmationVocabulary(fragment))
    if (fragment.denial) errors.push(...checkLayeredStratification(fragment.denial))
    if (fragment.affirmation) errors.push(...checkLayeredStratification(fragment.affirmation))
  } else if (voice === 'V6') {
    errors.push(...checkPlaceholderSyntax(fragment.text_zh || ''))
    errors.push(...checkPlaceholderSyntax(fragment.text_en || ''))
  }

  return { passed: errors.length === 0, errors, warnings }
}

// ─── v4.1 字段提取助手 ───

function collectV41TextZh(fragment, voice) {
  const parts = []
  switch (voice) {
    case 'V1': parts.push(fragment.text_zh); break
    case 'V2': parts.push(fragment.text_zh); break
    case 'V3': parts.push(fragment.fragment_zh); if (fragment.drift_pattern) parts.push(...fragment.drift_pattern); break
    case 'V4': parts.push(fragment.prompt_zh, fragment.response_zh); break
    case 'V5': pushLayered(parts, fragment, 'zh'); break
    case 'V5_pair':
      if (fragment.denial) pushLayered(parts, fragment.denial, 'zh')
      if (fragment.affirmation) pushLayered(parts, fragment.affirmation, 'zh')
      break
    case 'V6': parts.push(fragment.text_zh); break
    case 'V7': parts.push(fragment.spec?.design_intent); break
  }
  return parts.filter(Boolean).join(' ')
}

function collectV41TextEn(fragment, voice) {
  const parts = []
  switch (voice) {
    case 'V1': parts.push(fragment.text_en); break
    case 'V2': parts.push(fragment.text_en); break
    case 'V3': parts.push(fragment.fragment_en); break
    case 'V4': parts.push(fragment.prompt_en, fragment.response_en); break
    case 'V5': pushLayered(parts, fragment, 'en'); break
    case 'V5_pair':
      if (fragment.denial) pushLayered(parts, fragment.denial, 'en')
      if (fragment.affirmation) pushLayered(parts, fragment.affirmation, 'en')
      break
    case 'V6': parts.push(fragment.text_en); break
    case 'V7': parts.push(fragment.spec?.design_intent); break
  }
  return parts.filter(Boolean).join(' ')
}

function pushLayered(parts, layered, lang) {
  for (const k of ['L1_recorder', 'L2_proofreader', 'L3_reviser', 'L4_author']) {
    const layer = layered[k]
    if (layer && layer[`text_${lang}`]) parts.push(layer[`text_${lang}`])
  }
}

// ─── AI review prompt (used by reviewer step) ───

export function buildReviewPrompt(fragments, voice) {
  const fragmentsJson = JSON.stringify(fragments, null, 2)

  return `作为 v3 灵长类辅助文书部叙事质量审核员，评审以下 **${voice}** voice 的碎片文本。

## 碎片内容
${fragmentsJson}

## v3 评审标准

1. **B1.a 框架**——力量是"被分发"而不是"被探索"？无禁止词（钻研/突破/觉醒/发明/共鸣 等）？
2. **MIB 风格校准**（仅 doc voice）——分类编号 / Section X / 政策 #XXX / 不在场机构 / 楼层暗示 是否覆盖？密度是否"暗示水底但不下水"？
3. **腔调一致性**——HR 公文 / 主任督察腔 / 考核官判决腔 / 内训讲师推销腔 / #485,901 私人破碎腔 是否各自到位？
4. **不复述机制**——Rule 12：档案是 SCP 收容报告，不是 patch notes。是否描述"人遇到这个东西后经历了什么"，而不是"功能流程"？
5. **配额自我审计**：
   - "Section X" 引用 ≤ 30%
   - "上游"母题 ≤ 40%
   - 公告/政策类载体 ≤ 40%
   - 猴子方向 ≤ 30%
6. **v2.3 残留检测**：圣印 / 守卷人 / 大教堂 / 圣坛 / 铅币 / D-XXXX / Litany / Cathedral 等出现即扣分。
7. **锚点准确性**：HR 不能有名字；主任和月度考核官是同一锚点的两种显形；玩家工号永远 #485,902。
8. **黑色幽默调子**——70/70/60/95/55 五轴坐标内？"咦了一下又笑了"，不是"被吓到"。

## 输出格式
{
  "overall_score": 1-10,
  "fragments": [
    {
      "id": "对象 ID 或序号",
      "score": 1-10,
      "issues": ["问题 1", "问题 2"],
      "suggestion": "改进建议（如果 score < 7）"
    }
  ]
}

请直接输出 JSON。`
}
