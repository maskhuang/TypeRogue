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

// v3 scriptorNotes: repurposed from v2.3 守卷人 7-人 28-note system to:
// - 6 notes from #485,901 子锚 across the disappearance arc (Cycle 1-2 / 3-4 / 5+)
// - 4 notes from 同事们 集体（不署名 / 不展开 / 留白）
//
// All use the desk_note voice template (Beat 7 私人破碎腔). Each entry is a writing
// scaffold — actual flavor text comes from the AI pipeline via voices.mjs.

export function loadScriptorNotes() {
  if (!_cache.scriptorNotes) {
    _cache.scriptorNotes = [
      // ─── #485,901 弧线（中期消失型，Q7 选 b） ───

      // Cycle 1-2: 在工位 / 听得见键盘
      {
        id: 'peer_485901_c1_1',
        source: 'peer_485901',
        cycle_phase: 'cycle_1_2',
        name: '#485,901 桌面便条 · 第一周',
        unlock: 'codex_threshold_3',
        direction: '试用期，平淡日常。提到自己工位旁的小物件、对今日词单的一句模糊感受。第一人称隐含。可有一处提到 #485,902（"今天他比我早走"等）。',
        ending_hook: null,
        handwriting: '清楚但有点赶，结尾收得不完整',
      },
      {
        id: 'peer_485901_c1_2',
        source: 'peer_485901',
        cycle_phase: 'cycle_1_2',
        name: '#485,901 桌面便条 · 第二周',
        unlock: 'cycle_1_complete',
        direction: '试用期末。提到"上岗培训第二阶段"或"轮岗 / 复审"等被分发框架词。一处轻微"咦了一下"的细节（HR 邮件抬头变了 / 食堂菜单上多了一行）。',
        ending_hook: null,
        handwriting: '清楚但有点赶',
      },

      // Cycle 3-4: 开始请假 / 桌面贴"今日休息"
      {
        id: 'peer_485901_c3_1',
        source: 'peer_485901',
        cycle_phase: 'cycle_3_4',
        name: '#485,901 桌面便条 · 转正过渡 (一)',
        unlock: 'cycle_3_complete',
        direction: '请假频率开始上升。提到"新政策 #082" 或类似政策编号一次（这是 Beat 7 sample 已立的）。后两段是对未来安排的小希望（食堂 N 楼 / 楼梯间空位）。',
        ending_hook: '如果有人问我去哪，就说不知道。',
        handwriting: '潦草增多',
      },
      {
        id: 'peer_485901_c3_2',
        source: 'peer_485901',
        cycle_phase: 'cycle_3_4',
        name: '#485,901 桌面便条 · 转正过渡 (二)',
        unlock: 'cycle_4_complete',
        direction: '"今日休息"贴纸 era。提到自己的椅子被推开 / 抽屉锁过 / 工号牌忘在哪了。≤4 段，破碎程度更高。',
        ending_hook: null,
        handwriting: '潦草，有涂改',
      },

      // Cycle 5+: 永久空缺，工位被清理过又恢复尘封
      {
        id: 'peer_485901_c5_1',
        source: 'peer_485901',
        cycle_phase: 'cycle_5_plus',
        name: '#485,901 抽屉里的纸 (一)',
        unlock: 'cycle_5_unlock',
        direction: '工位已空。这是事后被发现的纸。语气更短更碎，时间感模糊（"昨天" / "上周" / "之前那次"）。永远不署名。',
        ending_hook: null,
        handwriting: '断断续续，有空白处',
      },
      {
        id: 'peer_485901_c5_2',
        source: 'peer_485901',
        cycle_phase: 'cycle_5_plus',
        name: '#485,901 抽屉里的纸 (二)',
        unlock: 'cycle_5_complete',
        direction: '最后一张纸。半句话。可能只有 2-3 段。最后一行是一个**对将来的安排**——但这个将来不会到来。读者不知道这是写给谁的。',
        ending_hook: null,
        handwriting: '只剩半页，剩下的撕掉了或没写完',
      },

      // ─── 同事们 集体（不署名 / 不展开 / 留白） ───

      {
        id: 'peers_001',
        source: 'peers_collective',
        cycle_phase: 'cycle_1_5',
        name: '工位空缺旁的"请假"贴纸',
        unlock: 'beat_6_first_trigger',
        direction: '一张 HR 标准格式的贴纸残片，但下面被同事手写补了一行。补的那行不解释，只暗示 — 一个具体的小细节（杯子还热的 / 椅子推到一半 / 饭卡还在桌上）。',
        ending_hook: null,
        handwriting: '上半官方贴纸 + 下半手写',
      },
      {
        id: 'peers_002',
        source: 'peers_collective',
        cycle_phase: 'cycle_1_5',
        name: '茶水间储物柜上的便条',
        unlock: 'cycle_2_complete',
        direction: '一张被反复贴又被撕去又被贴的便条。残留多层笔迹。提示某个工号（不是 #485,901）的小事——但永远不展开。可有一句被划掉的话，可猜出原文。',
        ending_hook: null,
        handwriting: '层叠多笔迹，部分被划掉',
      },
      {
        id: 'peers_003',
        source: 'peers_collective',
        cycle_phase: 'cycle_3_5',
        name: '走廊地上捡到的纸',
        unlock: 'cycle_3_complete',
        direction: '一张没头没尾的纸。可能是某次月度小报的一角。一句话引用上游 / 客户端 / 维修组（**只能用一个**，配额自我审计）。结尾被风吹皱了看不清。',
        ending_hook: null,
        handwriting: '机打 + 折痕 + 局部模糊',
      },
      {
        id: 'peers_004',
        source: 'peers_collective',
        cycle_phase: 'cycle_4_plus',
        name: '抽屉夹层里的便条',
        unlock: 'cycle_4_complete',
        direction: '从一个空工位的抽屉夹层翻出来的便条。多人轮流写过，笔迹完全不同。前两段相似的事务性短句（"今天又..."），最后一段是不同笔迹的一句话——读者看完会停一秒想"等等，这是同一个人写的吗"。',
        ending_hook: null,
        handwriting: '多人笔迹混杂',
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

// v3 sanitization: strip numeric values + implementation markers only.
// Game terms (词条 / 技能 / 遗物 / 商店 / ...) are NOT pre-translated — the AI sees the
// raw mechanic, then writes v3 institutional language per the system prompt's
// translation table + B1.a vocab + MIB lexicon. v2.3 had a hard-coded TERM_TRANSLATION
// (圣印 / 铅币 / 收容铭刻 / ...) which is removed.

function sanitizeDescription(desc) {
  if (!desc) return ''
  let result = desc
    .replace(/\d+(\.\d+)?%/g, '一定比例')             // 50% → 一定比例
    .replace(/[×xX]\s*\d+(\.\d+)?/g, '')              // ×2 / x3 → 删
    .replace(/\d+(\.\d+)?\s*(秒|点|次|个|层|格)/g, '若干$2')
    .replace(/\(\d+\)/g, '')                          // (5) → 删
    .replace(/[（(]向[下上]取整[）)]/g, '')           // 实现细节
    .replace(/\{[^}]+\}/g, '')                        // {var} 模板
    .replace(/[≤≥<>]=?\s*[\dN]+/g, '')                // ≤5 / >=N
    .replace(/\bN\b/g, '若干')

  result = result
    .replace(/\s+/g, ' ')
    .replace(/[,，]\s*[,，]/g, '，')
    .replace(/^\s*[,，。.]\s*/, '')
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
