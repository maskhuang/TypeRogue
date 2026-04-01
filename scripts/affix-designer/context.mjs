// ============================================
// 词条系统上下文构建器
// 从源码动态读取现有词条，确保 AI 永远看到最新状态
// ============================================

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const AFFIXES_FILE = join(PROJECT_ROOT, 'src/src/data/affixes.ts')

// ===== 从源码解析现有词条 =====

function parseAffixesFromSource() {
  const src = readFileSync(AFFIXES_FILE, 'utf-8')

  // 解析 AffixType 枚举值: Foo = 'foo',
  const enumMatches = [...src.matchAll(/(\w+)\s*=\s*'(\w+)'/g)]
  const affixTypes = []
  let inEnum = false
  for (const line of src.split('\n')) {
    if (line.includes('export enum AffixType')) inEnum = true
    if (inEnum && line.includes('}')) { inEnum = false; break }
    if (inEnum) {
      const m = line.match(/^\s+(\w+)\s*=\s*'(\w+)'/)
      if (m) affixTypes.push({ enumName: m[1], id: m[2] })
    }
  }

  // 解析 AFFIX_CATEGORY_MAP: [AffixType.Foo]: 'category',
  const categories = {}
  for (const m of src.matchAll(/\[AffixType\.(\w+)\]:\s*'(\w+)'/g)) {
    if (['numeric', 'rhythm', 'topology', 'trigger_chain', 'word_sense', 'meta_rule'].includes(m[2])) {
      categories[m[1]] = m[2]
    }
  }

  // 解析 AFFIX_NAMES: [AffixType.Foo]: '中文名',
  const names = {}
  let inNames = false
  for (const line of src.split('\n')) {
    if (line.includes('AFFIX_NAMES')) inNames = true
    if (inNames && /^\}/.test(line.trim())) { inNames = false; break }
    if (inNames) {
      const m = line.match(/\[AffixType\.(\w+)\]:\s*'([^']+)'/)
      if (m) names[m[1]] = m[2]
    }
  }

  // 解析 AFFIX_DESCRIPTIONS
  const descs = {}
  let inDescs = false
  for (const line of src.split('\n')) {
    if (line.includes('AFFIX_DESCRIPTIONS')) inDescs = true
    if (inDescs && /^\}/.test(line.trim())) { inDescs = false; break }
    if (inDescs) {
      const m = line.match(/\[AffixType\.(\w+)\]:\s*'([^']+)'/)
      if (m) descs[m[1]] = m[2]
    }
  }

  // 解析 AFFIX_WEIGHT_TIERS
  const weights = {}
  let inWeights = false
  for (const line of src.split('\n')) {
    if (line.includes('AFFIX_WEIGHT_TIERS')) inWeights = true
    if (inWeights && /^\}/.test(line.trim())) { inWeights = false; break }
    if (inWeights) {
      const m = line.match(/\[AffixType\.(\w+)\]:\s*'(\w+)'/)
      if (m) weights[m[1]] = m[2]
    }
  }

  return affixTypes.map(({ enumName, id }) => ({
    id,
    enumName,
    name: names[enumName] || id,
    category: categories[enumName] || '?',
    description: descs[enumName] || '',
    weight: weights[enumName] || 'high',
  }))
}

// ===== 构建词条表格 =====

function buildAffixTable(affixes) {
  const lines = ['| # | ID | 名 | 类别 | 效果 | 权重 |', '|---|----|----|------|------|------|']
  affixes.forEach((a, i) => {
    const desc = a.description.length > 30 ? a.description.slice(0, 28) + '…' : a.description
    lines.push(`| ${i + 1} | ${a.enumName} | ${a.name} | ${a.category} | ${desc} | ${a.weight} |`)
  })
  return lines.join('\n')
}

// ===== 导出 =====

let _cachedAffixes = null

export function getExistingAffixes() {
  if (!_cachedAffixes) _cachedAffixes = parseAffixesFromSource()
  return _cachedAffixes
}

export function buildSystemContext() {
  const affixes = getExistingAffixes()
  const affixTable = buildAffixTable(affixes)
  const affixCount = affixes.length

  return `
# 打字肉鸽 — 词条制技能系统

## 游戏概述
打字 Roguelike。玩家打字触发键位技能获取资源。核心循环：打字→触发技能→产出资源→通关→商店升级→下一关。

## 技能结构
技能 = 加算基底(资源类型+基础值) + 0~3 词条(按稀有度)
白0词条4级 / 蓝1词条3级 / 紫2词条3级 / 橙3词条3级

## 7 种资源
base(基数,每词重置) / score(分数,达标过关) / multiplier(倍率,全局乘数) / time(时间,耗尽失败) / gold(金币,商店货币) / fragment(碎片) / mutagen(变异素)

## 现有 ${affixCount} 种词条

${affixTable}

## 键盘拓扑 (PositionRelation)
Adjacent(相邻) / SameRow(同行) / SameColumn(同列) / SameHand(同手) / SameFinger(同指) / Symmetric(对称)

## 附魔系统
每词条可关联一个"任务附魔"：装备足够多含该词条的技能后触发"质变"，获得强化效果。如：暴击→过载→质变后必暴。

## 计算管道
三层：base(Σ加法) × enhance(Π乘法) × global(Π全局)
六阶段：1基础值→2加算层→3乘算层→4资源写入→5后触发→6邻居通知

## 词条权重
每局随机：high(6~10) / low(1~4) / none(0禁用)

## 升级缩放
add(+=delta×levels) / mult(*=delta^levels) / add-dir(方向性增长)

## 设计约束
1. 加算为主、乘算稀有 2. 清晰策略取舍 3. 词条间协同/冲突 4. 可升级缩放 5. 利用打字独有机制 6. 可关联质变附魔
`.trim()
}

// 兼容旧接口：直接导出构建好的 context
export const SYSTEM_CONTEXT = buildSystemContext()

export const EXISTING_AFFIXES = getExistingAffixes().map(a => `${a.enumName}(${a.name})`)

export const CATEGORIES = ['numeric', 'rhythm', 'topology', 'trigger_chain', 'word_sense', 'meta_rule']

// 从源码动态提取 AffixInstance 接口
function parseAffixInstanceInterface() {
  const src = readFileSync(AFFIXES_FILE, 'utf-8')
  const match = src.match(/export interface AffixInstance \{[\s\S]*?\n\}/)
  if (match) return match[0]
  // fallback
  return 'export interface AffixInstance { type: AffixType }'
}

export const AFFIX_INSTANCE_INTERFACE = parseAffixInstanceInterface()

/** story 类型到需要修改的文件列表的映射 */
export const STORY_FILE_MAP = {
  '词条数据定义': [
    'src/src/data/affixes.ts',
  ],
  '词条生成逻辑': [
    'src/src/data/skillGeneration.ts',
  ],
  '词条触发逻辑': [
    'src/src/data/affixes.ts',
    'src/src/data/affixTrigger.ts',
  ],
  '子系统遗物': [
    'src/src/data/relics.ts',
    'src/src/data/affixTrigger.ts',
    'src/src/systems/skills.ts',
  ],
  '集成测试与平衡验证': [
    // 测试 story 不自动实现
  ],
}
