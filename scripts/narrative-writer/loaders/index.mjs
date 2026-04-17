import { readFileSync } from 'fs'
import { join } from 'path'
import { DATA_JSON } from '../config.mjs'

function loadJSON(filename) {
  const path = join(DATA_JSON, filename)
  return JSON.parse(readFileSync(path, 'utf-8'))
}

let _cache = {}

export function loadRelics() {
  if (!_cache.relics) {
    const data = loadJSON('relics.json')
    // relics.json: { relics: { [id]: { id, name, icon, description, rarity, basePrice, effects, flavor } } }
    _cache.relics = Object.values(data.relics)
  }
  return _cache.relics
}

export function loadAffixes() {
  if (!_cache.affixes) {
    const data = loadJSON('affixes.json')
    // affixes.json: { affixNames: {id: name}, affixDescriptions: {id: desc}, affixCategoryMap: {id: cat}, ... }
    const ids = Object.keys(data.affixNames)
    _cache.affixes = ids.map(id => ({
      id,
      name: data.affixNames[id],
      description: data.affixDescriptions[id] || '',
      category: data.affixCategoryMap[id] || '',
      weightTier: data.affixWeightTiers?.[id] || '',
    }))
  }
  return _cache.affixes
}

export function loadEnchantments() {
  if (!_cache.enchantments) {
    const data = loadJSON('affixes.json')
    // Enchantment data may be in a separate structure
    if (data.enchantmentNames) {
      const ids = Object.keys(data.enchantmentNames)
      _cache.enchantments = ids.map(id => ({
        id,
        name: data.enchantmentNames[id],
        description: data.enchantmentDescriptions?.[id] || '',
      }))
    } else {
      _cache.enchantments = []
    }
  }
  return _cache.enchantments
}

export function loadBossModifiers() {
  if (!_cache.boss) {
    const data = loadJSON('bossModifiers.json')
    // bossModifiers.json: { modifierIds: [...], meta: { [id]: { id, name, icon, description, eliteHint, category } } }
    _cache.boss = Object.values(data.meta)
  }
  return _cache.boss
}

import { ANCHOR_FACTS } from '../config.mjs'

export function loadScriptorNotes() {
  if (!_cache.scriptorNotes) {
    // Scriptor notes are defined by narrative design, not data-json.
    // Each scriptor has 4 notes with specific content directions and unlock conditions.
    _cache.scriptorNotes = [
      // --- Scriptor A: The Exemplar ---
      {
        id: 'scriptor_a_1', scriptor: 'scriptor_a', noteIndex: 1,
        name: `${ANCHOR_FACTS.scriptor_a.name_doc} · 笔记一`,
        unlock: 'codex_threshold_3',
        direction: '标准收容日志，极度工整，第 IV 层异文活动记录。末尾提到即将轮调第 VI 层。',
        ending_hook: '明日轮调第 VI 层。已按 §3.7 提交申请。',
        handwriting: '工整、恭敬、零涂改',
      },
      {
        id: 'scriptor_a_2', scriptor: 'scriptor_a', noteIndex: 2,
        name: `${ANCHOR_FACTS.scriptor_a.name_doc} · 笔记二`,
        unlock: 'clear_layer_6',
        direction: '收容廊工作记录，注意到某些异文"比档案描述的安静"。发现字盘上的旧划痕。',
        ending_hook: '字盘上有旧划痕。不是我的。归档前需确认来源。',
        handwriting: '工整、恭敬、零涂改',
      },
      {
        id: 'scriptor_a_3', scriptor: 'scriptor_a', noteIndex: 3,
        name: `${ANCHOR_FACTS.scriptor_a.name_doc} · 笔记三`,
        unlock: 'use_relic_in_layer_6',
        direction: '发现前任留下的字盘刻痕但档案中无此人记录。提交了查询表单。',
        ending_hook: '我向管理处提交了查询表单 F-031。等待回复。',
        handwriting: '工整、恭敬、零涂改',
      },
      {
        id: 'scriptor_a_4', scriptor: 'scriptor_a', noteIndex: 4,
        name: `${ANCHOR_FACTS.scriptor_a.name_doc} · 笔记四`,
        unlock: 'collect_a_1_to_3',
        direction: 'F-031 回执：查询结果"不适用"。字迹与前三条完全一致——没有动摇，没有恐惧。然后空白。戛然而止。',
        ending_hook: null,
        handwriting: '工整、恭敬、零涂改——到最后一字依然如此',
      },
      // --- Scriptor B: The Doubter ---
      {
        id: 'scriptor_b_1', scriptor: 'scriptor_b', noteIndex: 1,
        name: `${ANCHOR_FACTS.scriptor_b.name_doc} · 笔记一`,
        unlock: 'codex_threshold_3',
        direction: '早期收容记录，工整但已有旁注。质疑表单为什么没有"原因"栏。第 IX 层有焊接声但无工单。',
        ending_hook: '第 IX 层又传来焊接声。工单上没有维护记录。',
        handwriting: '初期工整，已有零星旁注和问号',
      },
      {
        id: 'scriptor_b_2', scriptor: 'scriptor_b', noteIndex: 2,
        name: `${ANCHOR_FACTS.scriptor_b.name_doc} · 笔记二`,
        unlock: 'reach_layer_9',
        direction: '调查第 IX 层焊死的门。旁注越来越多，涂改增加。申请查阅 §7.1 全文被拒。',
        ending_hook: '申请查阅 §7.1 全文。回复："§7.1 不适用于查阅申请。"',
        handwriting: '涂改增多，旁注密集，问号频繁',
      },
      {
        id: 'scriptor_b_3', scriptor: 'scriptor_b', noteIndex: 3,
        name: `${ANCHOR_FACTS.scriptor_b.name_doc} · 笔记三`,
        unlock: 'typo_5_times_layer_9',
        direction: '§7.1 的部分内容——B 设法看到了片段但无法确认真伪。质疑升级。留下线索指向引擎建造档案。',
        ending_hook: '如果你读到这里，去查引擎建造档案。不是现在的——是之前的。',
        handwriting: '近乎潦草，多处涂改，墨迹浓淡不一',
      },
      {
        id: 'scriptor_b_4', scriptor: 'scriptor_b', noteIndex: 4,
        name: `${ANCHOR_FACTS.scriptor_b.name_doc} · 笔记四`,
        unlock: 'collect_b_1_to_3',
        direction: '笔迹变了。不是 B 的字。一行体制语言："此守卷人已依据 §7.1 重新分配。无需后续行动。"',
        ending_hook: null,
        handwriting: '标准体制字体——不是 B 的笔迹',
      },
      // --- Scriptor C: The Joyful ---
      {
        id: 'scriptor_c_1', scriptor: 'scriptor_c', noteIndex: 1,
        name: `${ANCHOR_FACTS.scriptor_c.name_doc} · 笔记一`,
        unlock: 'codex_threshold_3',
        direction: '欢快的工作笔记，记录异文"唱歌"。提到圣坛嘟囔了。带小插图描述。',
        ending_hook: '今天圣坛嘟囔了！它说它记得上一个人的手很冷。好可爱。',
        handwriting: '流畅轻快，夹带小插图（文字描述）',
      },
      {
        id: 'scriptor_c_2', scriptor: 'scriptor_c', noteIndex: 2,
        name: `${ANCHOR_FACTS.scriptor_c.name_doc} · 笔记二`,
        unlock: 'altar_trigger_3_times',
        direction: '更深入的异文观察。C 开始"和异文对话"。同事回避他。',
        ending_hook: '同事们不理解。异文不是要逃跑——它们在呼吸。',
        handwriting: '流畅轻快，插图增多',
      },
      {
        id: 'scriptor_c_3', scriptor: 'scriptor_c', noteIndex: 3,
        name: `${ANCHOR_FACTS.scriptor_c.name_doc} · 笔记三`,
        unlock: 'reach_layer_12',
        direction: '接近引擎核心的感受。没有恐惧，只有好奇和期待。最后一行是叙事文档中已确定的那句。',
        ending_hook: '明天我要去第 XII 层。引擎在等我。我好期待。',
        handwriting: '依然轻快——这本身就是恐怖',
      },
      {
        id: 'scriptor_c_4', scriptor: 'scriptor_c', noteIndex: 4,
        name: `${ANCHOR_FACTS.scriptor_c.name_doc} · 笔记四`,
        unlock: 'true_ending',
        direction: '空白页出现一幅小插图——C 的画风，画的是引擎核心。旁边一行字。',
        ending_hook: '从里面看，其实很温暖。',
        handwriting: '只有一幅画和一行字',
      },
    ]
  }
  return _cache.scriptorNotes
}

export function loadClasses() {
  if (!_cache.classes) {
    const data = loadJSON('classes.json')
    // classes.json: { definitions: { [id]: { id, name, description, icon, uniqueResource, ... } } }
    _cache.classes = Object.values(data.definitions)
  }
  return _cache.classes
}

// Get a single object by type + id
export function getObject(type, id) {
  const loaderMap = {
    relic: loadRelics,
    affix: loadAffixes,
    enchantment: loadEnchantments,
    bossModifier: loadBossModifiers,
    class: loadClasses,
    scriptorNotes: loadScriptorNotes,
  }

  const loader = loaderMap[type]
  if (!loader) return null

  const data = loader()
  return data.find(item => item.id === id) || null
}

// Get all objects of a type
export function getAllObjects(type) {
  const loaderMap = {
    relic: loadRelics,
    affix: loadAffixes,
    enchantment: loadEnchantments,
    bossModifier: loadBossModifiers,
    class: loadClasses,
    scriptorNotes: loadScriptorNotes,
  }

  const loader = loaderMap[type]
  if (!loader) return []

  try {
    return loader()
  } catch {
    return []
  }
}

// Mechanic → Setting translation table
// Applied before data enters the prompt to prevent AI from seeing game language
// Order matters: longer/more-specific terms first to avoid partial matches
const TERM_TRANSLATION = [
  // Multi-char compounds FIRST (prevent "词条技能" → "圣印铭文组")
  ['词条技能', '铭文组'], ['装备技能', '装配铭文组'], ['能装备', '能装配'],
  // Core systems
  ['已附魔的技能', '受祝圣之铭文组'], ['已附魔', '受祝圣'],
  ['附魔选择', '祝圣仪式'], ['附魔', '祝圣'],
  ['技能', '铭文组'], ['词条', '圣印'], ['遗物', '圣器'],
  ['词包', '经卷'], ['词库', '收容经卷'], ['商店', '圣物市集'],
  // Actions
  ['触发', '铭刻'], ['产出', '铸出'], ['暴击率', '裂铅之率'],
  ['暴击', '裂铅'], ['打字', '铭刻'], ['打错', '震颤'],
  ['连击', '连祷'], ['装备', '嵌入圣坛'], ['卸下', '自圣坛剥落'],
  ['得分', '铭分'], ['蜕变', '熔铸重塑'],
  ['回车', '落版'], ['确认', '落版'],
  ['刷新', '换架'], ['重置', '复归'], ['电池', '油壶'], ['续航', '续油'],
  // Resources
  ['基础值', '基石流'], ['倍率', '共鸣倍'], ['金币', '铅币'],
  ['碎片', '铅屑'], ['变异素', '熔蜡'],
  // Progression
  ['关卡', '收容层'], ['每关', '每层'], ['升级', '晋铸'],
  ['稀有度', '收容分级'], ['解锁', '授权'],
  ['精英', '执事试炼'], ['教学', '入门圣礼'],
  ['排行榜', '圣典登记簿'], ['永久进度', '常驻授权'],
  ['每日挑战', '日收容志'], ['敌人', '异文'],
  // Mechanics
  ['叠层', '积诵'], ['满层', '积满'], ['加成', '增益'],
  ['概率', '天意'], ['上限', '极'], ['下限', '底'],
  ['资源', '圣流'], ['消耗', '献纳'],
  // English terms
  ['combo', '连祷'], ['trigger', 'inscribe'], ['stack', 'accumulate'],
  ['skill', 'inscription'], ['affix', 'sigil'], ['buff', 'blessing'],
  ['output', 'yield'], ['bonus', 'boon'], ['crit rate', 'fracture chance'],
]

// Strip numeric values + translate game terms
function sanitizeDescription(desc) {
  if (!desc) return ''
  let result = desc
    // Remove percentages: "50%" → "一定比例"
    .replace(/\d+(\.\d+)?%/g, '一定比例')
    // Remove multipliers: "×2" "x3" → ""
    .replace(/[×xX]\s*\d+(\.\d+)?/g, '')
    // Remove plain numbers with units: "30秒" "100点" → remove number
    .replace(/\d+(\.\d+)?\s*(秒|点|次|个|层|格)/g, '若干$2')
    // Remove standalone numbers in parens
    .replace(/\(\d+\)/g, '')
    // Remove implementation details
    .replace(/[（(]向[下上]取整[）)]/g, '')
    // Remove {variable} template markers
    .replace(/\{[^}]+\}/g, '')
    // Remove ≤≥ comparisons with numbers or variables
    .replace(/[≤≥<>]=?\s*[\dN]+/g, '')
    // Remove standalone N (template variable)
    .replace(/\bN\b/g, '若干')

  // Apply term translation
  for (const [from, to] of TERM_TRANSLATION) {
    result = result.replaceAll(from, to)
  }

  // Clean up leftover artifacts
  result = result
    .replace(/\s+/g, ' ')  // collapse whitespace
    .replace(/[,，]\s*[,，]/g, '，')  // collapse double commas
    .replace(/^\s*[,，。.]\s*/, '')  // remove leading punctuation
    .trim()

  return result
}

// Prepare object data for narrative prompt (sanitized)
export function prepareForPrompt(obj, type) {
  const hint = sanitizeDescription(obj.description)
  return {
    id: obj.id,
    name: obj.name,
    icon: obj.icon,
    rarity: obj.rarity,
    category: obj.category || obj.subsystem,
    // For bossModifiers, reframe as containment leakage direction, not the anomaly itself
    mechanic_hint: type === 'bossModifier'
      ? `[收容残余方向] ${hint}`
      : hint,
    // Exclude: basePrice, effects (pure mechanic), flavor (don't bias AI with existing text)
  }
}

// Summarize an object for prompt context (compact, sanitized)
export function summarizeObject(obj, type) {
  const clean = prepareForPrompt(obj, type)
  const parts = [`id: ${clean.id}`]
  if (clean.name) parts.push(`name: ${clean.name}`)
  if (clean.mechanic_hint) parts.push(`机制概述: ${clean.mechanic_hint}`)
  if (clean.rarity !== undefined) parts.push(`rarity: ${clean.rarity}`)
  if (clean.category) parts.push(`category: ${clean.category}`)
  if (clean.icon) parts.push(`icon: ${clean.icon}`)
  return parts.join(' | ')
}
