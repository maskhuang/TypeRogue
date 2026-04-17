import { GW_BANNED, SCP_BANNED_PATTERN, WORD_LIMITS, ANCHOR_FACTS } from '../config.mjs'

// Validate a single fragment against all rules
// Returns { passed: boolean, errors: string[] }
export function validateFragment(fragment, voice) {
  const errors = []

  // 1. Word limit check
  const limitErr = checkWordLimit(fragment, voice)
  if (limitErr) errors.push(limitErr)

  // 2. DON'T rules check
  const dontErrs = checkDontRules(fragment, voice)
  errors.push(...dontErrs)

  // 3. IP compliance
  const ipErrs = checkIPCompliance(fragment)
  errors.push(...ipErrs)

  // 4. Classification system (版级, not SCP Object Class)
  const classErrs = checkClassificationSystem(fragment)
  errors.push(...classErrs)

  // 5. Anchor consistency
  const anchorErrs = checkAnchorConsistency(fragment)
  errors.push(...anchorErrs)

  return { passed: errors.length === 0, errors }
}

function getTextContent(fragment) {
  const parts = []
  if (fragment.text_zh) parts.push(fragment.text_zh)
  if (fragment.text_en) parts.push(fragment.text_en)
  if (fragment.name_zh) parts.push(fragment.name_zh)
  if (fragment.name_en) parts.push(fragment.name_en)
  return parts.join(' ')
}

function checkWordLimit(fragment, voice) {
  const limits = WORD_LIMITS[voice]
  if (!limits) return null

  if (limits.zh_max && fragment.text_zh) {
    const zhLen = fragment.text_zh.replace(/[^\u4e00-\u9fff]/g, '').length +
      fragment.text_zh.replace(/[\u4e00-\u9fff]/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
    // Approximate: count Chinese chars + non-Chinese words
    const approxLen = fragment.text_zh.length
    if (approxLen > limits.zh_max * 1.5) {
      return `${limits.label} 中文超长: ${approxLen} 字 (上限 ${limits.zh_max})`
    }
  }

  if (limits.en_max && fragment.text_en) {
    const enWords = fragment.text_en.trim().split(/\s+/).length
    if (enWords > limits.en_max * 1.5) {
      return `${limits.label} 英文超长: ${enWords} 词 (上限 ${limits.en_max})`
    }
  }

  if (limits.lines_max && fragment.text_zh) {
    const lines = fragment.text_zh.split('\n').filter(l => l.trim()).length
    if (lines > limits.lines_max) {
      return `${limits.label} 行数超限: ${lines} 行 (上限 ${limits.lines_max})`
    }
  }

  return null
}

function checkDontRules(fragment, voice) {
  const errors = []
  const text = getTextContent(fragment)
  const zh = fragment.text_zh || ''
  const en = fragment.text_en || ''

  // Universal: no numeric values in any narrative voice
  const numericPatterns = [
    { pattern: /\d+(\.\d+)?%/, label: '百分比' },
    { pattern: /[×xX]\s*\d+(\.\d+)?/, label: '倍率' },
    { pattern: /\+\d+/, label: '加值' },
    { pattern: /\b\d{2,}(秒|点|次|层|格|倍|级)\b/, label: '数值+单位' },
    { pattern: /\b\d+(\.\d+)?\s*(seconds?|points?|times?|layers?)\b/i, label: '数值+英文单位' },
    { pattern: /\d+个百分点/, label: '百分点' },
  ]
  for (const { pattern, label } of numericPatterns) {
    if (pattern.test(zh) || pattern.test(en)) {
      errors.push(`含机制数值（${label}）——用物质隐喻替代`)
    }
  }

  // Bare numbers in zh (not part of ██ redaction, SA-/RA-/D-/F-/M. codes, or 72小时-style setting flavor)
  // Catches: "下降17个", "三字以内", "15铅币"
  const bareNumberZH = zh
    .replace(/██+/g, '')                    // remove redactions
    .replace(/[SRDAFM]-[\d█]+/g, '')        // remove codes (SA-0117, D-0432, F-027, M.1██)
    .replace(/M\.\d+/g, '')                 // remove era codes
    .replace(/#[\d█]+-\w/g, '')             // remove #████-A style codes
    .replace(/RA-\d+/g, '')                 // remove RA codes
    .replace(/§[\d.]+/g, '')                // remove regulation refs
    .replace(/72小时/g, '')                  // allowed setting detail
  // Check for bare Arabic numerals (2+ digits, not part of codes)
  if (/(?<![A-Za-z-#])(\d{2,})(?![█\d])/.test(bareNumberZH)) {
    const match = bareNumberZH.match(/(?<![A-Za-z-#])(\d{2,})(?![█\d])/)
    errors.push(`含裸数值: "${match[1]}"——应使用 ██ 遮蔽或物质描述替代`)
  }
  // Chinese number + mechanic unit (三次, 十七个, 两倍)
  if (/[一二三四五六七八九十百千万]+[次个倍层字词条件份额]/.test(zh)) {
    // Allow certain common phrases: 一次, 一个 (in certain contexts)
    const cnNumMatch = zh.match(/([一二三四五六七八九十百千万]{1,4}[次个倍层字词条件份额])/)
    if (cnNumMatch) {
      const phrase = cnNumMatch[1]
      // Allow: 一次, 一句, single-count phrases that are natural language
      const allowedPhrases = ['一次', '一句', '一声', '一枚', '一座', '一页', '一层', '一词']
      if (!allowedPhrases.includes(phrase)) {
        errors.push(`含汉字数值: "${phrase}"——应使用模糊表述或 ██ 替代`)
      }
    }
  }

  // Universal: no game mechanic terms
  // Keep this list small — prevention is in the prompt layer (translation table),
  // this is just a safety net for the most egregious leaks
  // Terms checked as whole words (\\b boundary) for English, exact match for Chinese
  const mechanicTermsEN = [
    'combo', 'buff', 'debuff', 'DPS', 'cooldown', 'proc', 'nerf',
    '\\bUI\\b', '\\bHUD\\b', '\\bCD\\b',
    'inventory', 'equipment slot', 'loadout', 'skill slot',
  ]
  const mechanicTermsZH = [
    '装备栏', '技能栏', '背包', '物品栏', '血条', '进度条',
  ]
  for (const term of mechanicTermsEN) {
    const regex = term.startsWith('\\b')
      ? new RegExp(term, 'i')
      : new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(en)) {
      errors.push(`含游戏术语: "${term.replace(/\\\\b/g, '')}"——用设定内翻译替代`)
    }
  }
  for (const term of mechanicTermsZH) {
    if (zh.includes(term)) {
      errors.push(`含游戏术语: "${term}"——用设定内翻译替代`)
    }
  }

  switch (voice) {
    case 'bell': {
      // 🔔 DON'T: no mechanic-transparent terms (describes game rules, not world)
      const mechanicTransparent = [
        '额外', '触发', '翻倍', '跳过', '概率', '基准', '产出', '上限', '下限',
        '提升', '降低', '增加', '减少', '加成', '效果',
        'trigger', 'bonus', 'skip', 'chance', 'threshold', 'output', 'cap',
        'increase', 'decrease', 'boost', 'buff', 'effect',
      ]
      for (const term of mechanicTransparent) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`🔔 含机制透明词: "${term}"——用物质/仪式隐喻替代`)
        }
      }
      // 🔔 DON'T: no modern terms
      const modernTerms = ['流程', '数据', '效率', '系统', '参数', 'process', 'data', 'efficiency', 'parameter']
      for (const term of modernTerms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`🔔 含现代词汇: "${term}"`)
        }
      }
      // No § references
      if (text.includes('§')) errors.push('🔔 含条例编号 §（应为📄专属）')
      // No first person
      if (/[^不]我[^们]/.test(zh) || /\bI\b/.test(en)) {
        errors.push('🔔 含第一人称"我"/"I"')
      }
      // No F- form references
      if (/F-\d{3}/.test(text)) errors.push('🔔 含表单编号 F-XXX（应为📄专属）')
      // No institutional terms (these belong to 📄 only)
      const docOnlyTerms = ['站点污染', '收容突破', '收容基准', '失联率', '征用',
        'Site Compromise', 'Containment Breach', 'Containment Threshold',
        'casualty rate', 'requisition']
      for (const term of docOnlyTerms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`🔔 含体制术语"${term}"（应为📄专属，🔔用物质隐喻替代）`)
        }
      }
      break
    }
    case 'doc': {
      // 📄 DON'T: no emoji
      if (/[\u{1F600}-\u{1F9FF}]/u.test(text)) errors.push('📄 含 emoji')
      // No uncertain language
      if (/(我觉得|似乎|大概|maybe|perhaps|I think)/i.test(text)) {
        errors.push('📄 含不确定语气（档案是权威的）')
      }
      // 📄 DON'T: no game-mechanic verbs and no mechanic-explanation language
      const docMechanicTerms = ['跳过', '选择', '装备', '卸下', '刷新', '购买',
        '效率', '效能', '加成', '提升', '功能', '机制',
        'skip', 'equip', 'unequip', 'refresh', 'purchase', 'select',
        'efficiency', 'function', 'mechanism', 'boost', 'buff']
      for (const term of docMechanicTerms) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`📄 含玩家操作词: "${term}"——用收容/观测动词替代`)
        }
      }
      break
    }
    case 'altar': {
      // 🔧 DON'T: no § or F- references
      if (text.includes('§')) errors.push('🔧 含条例编号（圣坛不懂体制）')
      if (/F-\d{3}/.test(text)) errors.push('🔧 含表单编号（圣坛不懂体制）')
      // No pseudo-Latin
      if (/(Litany|Codex|Clavi|Scriptor|Glyph)/i.test(text)) {
        errors.push('🔧 含伪拉丁（圣坛不是教会）')
      }
      // No redaction
      if (/████/.test(text)) errors.push('🔧 含 redaction 黑块（圣坛没有权限概念）')
      // Should start with ellipsis (Chinese)
      if (zh && !zh.startsWith('……') && !zh.startsWith('...')) {
        errors.push('🔧 中文未以省略号开头')
      }
      // No deepest lore
      const deepLore = ['铸印现实', '铸印', 'printing reality', 'forging reality']
      for (const term of deepLore) {
        if (text.toLowerCase().includes(term.toLowerCase())) {
          errors.push(`🔧 暴露纯圣经层信息: "${term}"`)
        }
      }
      break
    }
    case 'note': {
      // ✏️ DON'T: no piety
      const pietyTerms = ['其', '之', '者', '汝', 'Thou', 'Thy', 'Hath', '圣', 'Sacred', 'Holy']
      for (const term of pietyTerms) {
        if (text.includes(term)) {
          // Allow 圣坛 as common reference
          if (term === '圣' && text.includes('圣坛')) continue
          errors.push(`✏️ 含虔诚语汇: "${term}"（批注不念经）`)
        }
      }
      // No formal document style
      if (/Object Class|发现地点|分级/.test(text)) {
        errors.push('✏️ 含公文体（批注是日常便条）')
      }
      break
    }
  }

  return errors
}

function checkClassificationSystem(fragment) {
  const errors = []
  const text = getTextContent(fragment)

  // SCP Object Class terms should not appear — use 版级 system instead
  const scpClasses = ['Object Class', 'Safe', 'Euclid', 'Keter', 'Thaumiel', 'Apollyon']
  for (const term of scpClasses) {
    if (text.includes(term)) {
      errors.push(`含 SCP 分级术语"${term}"——应使用版级体系（定版/活版/脱版/逆版/熔版/原版/逸版）`)
    }
  }

  return errors
}

function checkIPCompliance(fragment) {
  const errors = []
  const text = getTextContent(fragment)

  // GW banned terms
  for (const term of GW_BANNED) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`IP 违规: 含 GW 专有名词 "${term}"`)
    }
  }

  // SCP real numbers
  if (SCP_BANNED_PATTERN.test(text)) {
    errors.push('IP 违规: 含 SCP 真实编号')
  }

  return errors
}

function checkAnchorConsistency(fragment) {
  const errors = []
  const text = getTextContent(fragment)

  for (const [key, facts] of Object.entries(ANCHOR_FACTS)) {
    // Check if fragment references this anchor
    const names = [facts.name_bell, facts.name_doc, facts.name_altar].filter(Boolean)
    const referenced = names.some(name => text.includes(name))

    if (!referenced) continue

    // If referenced, check layer consistency
    if (facts.disappear_layer && text.match(/第\s*([IVX\d]+)\s*层/)) {
      const layerMatch = text.match(/第\s*(\d+)\s*层/)
      if (layerMatch) {
        const mentioned = parseInt(layerMatch[1])
        if (mentioned !== facts.disappear_layer) {
          errors.push(`锚点不一致: ${key} 消失层应为 ${facts.disappear_layer}，文中提到第 ${mentioned} 层`)
        }
      }
    }

    // Check era consistency
    if (facts.era_m && text.match(/M\.\d+/)) {
      // Basic range check could be added here
    }
  }

  return errors
}

// AI self-review prompt
export function buildReviewPrompt(fragments, voice) {
  const fragmentsJson = JSON.stringify(fragments, null, 2)

  return `作为叙事质量审核员，评审以下 ${voice} 声音的碎片文本。

## 碎片内容
${fragmentsJson}

## 评审标准
1. 荒诞度是否在标尺范围内？（不过低也不过高）
2. 是否"串味"？（声音特征是否匹配该声音的规则）
3. 是否有足够的物质意象？（从意象池取材）
4. 中英文质量是否对等？（不是直译，而是同等水平的创作）
5. 是否有重复/雷同？（不同碎片之间是否太像）

## 输出格式
{
  "overall_score": 1-10,
  "fragments": [
    {
      "id": "对象ID或序号",
      "score": 1-10,
      "issues": ["问题1", "问题2"],
      "suggestion": "改进建议（如果 score < 7）"
    }
  ]
}

请直接输出 JSON。`
}
