// ============================================
// 打字肉鸽 - 新 Affix 系统 · Tag 查询接口
// ============================================
// 设计文档: docs/design/affix-rewrite-tag-system.md §3-4
//
// 本期实装：
//   - 反向索引 Map<Tag, AffixV2Definition[]>（基于静态 AFFIX_V2_DEFINITIONS）
//   - 静态查询：hasTag / listByTag / countByTag (在静态注册表层级)
//   - 实例 scope 查询：基于传入的 instance 集合（loadout）
//   - matchTagFilter: 给定 FireEvent + filter，判断 tag 维度是否命中
//
// 暂未实装：
//   - 与战斗 runtime state 的集成（等新词条挂到 skill 后再接）
//   - posRel / resource / is_crit / stack_state 维度（沿用现有代码，本模块只负责 tag 维度）

import type { Tag } from '../data/affixTags'
import {
  AFFIX_V2_DEFINITIONS,
  getAffixV2Definition,
  type AffixV2Definition,
  type AffixV2Instance,
} from '../data/affixV2'

// ============================================
// FireEvent · fire 事件载荷
// ============================================
// 详 affix-rewrite-tag-system.md §4.1

export interface FireEvent {
  /** 触发源 affix 的 id（必须能在 AFFIX_V2_DEFINITIONS 里找到）*/
  readonly sourceAffixId: string
  readonly sourceSkillId: string
  readonly sourceKey: string
  readonly sourceResource: string   // ResourceType 字面（避免循环 import）
  readonly isCrit: boolean
  readonly stackState: 'full' | 'partial' | 'none'
  readonly amount: number
  readonly timestamp: number
}

// ============================================
// FireFilter · 触发过滤
// ============================================
// 完整 filter 5 维（详 §5.1.1）：tag / posRel / resource / is_crit / stack_state
// 本模块只实现 tag 维度；其他维度由各自模块（keyboardTopology / ClassResourceFilter / etc.）

export interface FireFilter {
  /** tag 匹配（any-of 语义）*/
  readonly tag?: Tag | readonly Tag[]
  // 其他维度（不在本模块声明）：
  // posRel?, resource?, is_crit?, stack_state?
}

// ============================================
// 查询 scope
// ============================================
// 详 affix-rewrite-tag-system.md §3.1

export type TagScope =
  /** 仅 self affix（按 id 查） */
  | { kind: 'self'; affixId: string }
  /** 全局静态注册表（不依赖运行时 loadout）*/
  | { kind: 'registry' }
  /** 自定义实例集合（caller 提供 loadout 快照）*/
  | { kind: 'instances'; instances: readonly AffixV2Instance[] }
  /** 战斗 runtime（尚未接入）*/
  | { kind: 'all_skills' }
  /** 来源事件指向的 affix */
  | { kind: 'fire_source'; event: FireEvent }

// ============================================
// 反向索引（Map<Tag, AffixV2Definition[]>）
// ============================================
// 静态注册表的反向索引在模块加载时一次性构建；
// 运行时 instance scope 查询每次现算（数量有限，开销可忽略）。

function buildRegistryIndex(): ReadonlyMap<Tag, readonly AffixV2Definition[]> {
  const m = new Map<Tag, AffixV2Definition[]>()
  for (const def of AFFIX_V2_DEFINITIONS) {
    for (const t of def.tags) {
      let bucket = m.get(t)
      if (!bucket) {
        bucket = []
        m.set(t, bucket)
      }
      bucket.push(def)
    }
  }
  // freeze each bucket
  const out = new Map<Tag, readonly AffixV2Definition[]>()
  for (const [t, arr] of m) out.set(t, Object.freeze(arr.slice()))
  return out
}

const _registryIndex: ReadonlyMap<Tag, readonly AffixV2Definition[]> = buildRegistryIndex()

// ============================================
// 静态查询 API（基于 AFFIX_V2_DEFINITIONS 注册表）
// ============================================

/** 判断特定 affix（按 id）是否携带 tag */
export function hasTag(affixId: string, tag: Tag): boolean {
  const def = getAffixV2Definition(affixId)
  if (!def) return false
  return def.tags.includes(tag)
}

/** 注册表中带 tag 的 definitions（不可变快照）*/
export function listByTagInRegistry(tag: Tag): readonly AffixV2Definition[] {
  return _registryIndex.get(tag) ?? []
}

/** 注册表中带 tag 的数量 */
export function countByTagInRegistry(tag: Tag): number {
  return _registryIndex.get(tag)?.length ?? 0
}

// ============================================
// 实例 scope 查询（基于 caller 提供的 loadout）
// ============================================

/** 计数 instances 中带 tag 的 affix */
export function countByTagInInstances(
  tag: Tag,
  instances: readonly AffixV2Instance[],
): number {
  let n = 0
  for (const inst of instances) {
    if (hasTag(inst.defId, tag)) n++
  }
  return n
}

/** 列出 instances 中带 tag 的 affix（按 instances 顺序）*/
export function listByTagInInstances(
  tag: Tag,
  instances: readonly AffixV2Instance[],
): readonly AffixV2Instance[] {
  return instances.filter(inst => hasTag(inst.defId, tag))
}

/** 多 tag any-of 计数（instances scope） */
export function countAnyInInstances(
  tags: readonly Tag[],
  instances: readonly AffixV2Instance[],
): number {
  if (tags.length === 0) return 0
  let n = 0
  for (const inst of instances) {
    for (const t of tags) {
      if (hasTag(inst.defId, t)) { n++; break }   // any-of：命中即计数一次
    }
  }
  return n
}

/** 多 tag all-of 计数（instances scope）*/
export function countAllInInstances(
  tags: readonly Tag[],
  instances: readonly AffixV2Instance[],
): number {
  if (tags.length === 0) return 0
  let n = 0
  for (const inst of instances) {
    let allHit = true
    for (const t of tags) {
      if (!hasTag(inst.defId, t)) { allHit = false; break }
    }
    if (allHit) n++
  }
  return n
}

// ============================================
// 通用 scope 派发器
// ============================================
// scope.kind 自动派发到合适的实现。
// 'all_skills' / 'fire_source' 等暂返 0（待战斗 runtime 接入）。

/** 计数 scope 中带 tag 的 affix */
export function countByTag(tag: Tag, scope: TagScope): number {
  switch (scope.kind) {
    case 'self':
      return hasTag(scope.affixId, tag) ? 1 : 0
    case 'registry':
      return countByTagInRegistry(tag)
    case 'instances':
      return countByTagInInstances(tag, scope.instances)
    case 'fire_source':
      return hasTag(scope.event.sourceAffixId, tag) ? 1 : 0
    case 'all_skills':
      // TODO: 战斗 runtime 接入后实现
      return 0
  }
}

/** 列出 scope 中带 tag 的 definitions */
export function listByTag(tag: Tag, scope: TagScope): readonly AffixV2Definition[] {
  switch (scope.kind) {
    case 'self': {
      const def = getAffixV2Definition(scope.affixId)
      return def && def.tags.includes(tag) ? [def] : []
    }
    case 'registry':
      return listByTagInRegistry(tag)
    case 'instances': {
      const out: AffixV2Definition[] = []
      for (const inst of scope.instances) {
        const def = getAffixV2Definition(inst.defId)
        if (def && def.tags.includes(tag)) out.push(def)
      }
      return out
    }
    case 'fire_source': {
      const def = getAffixV2Definition(scope.event.sourceAffixId)
      return def && def.tags.includes(tag) ? [def] : []
    }
    case 'all_skills':
      // TODO
      return []
  }
}

/** 多 tag any-of 计数（通用 scope）*/
export function countAny(tags: readonly Tag[], scope: TagScope): number {
  if (scope.kind === 'instances') return countAnyInInstances(tags, scope.instances)
  let n = 0
  for (const t of tags) n += countByTag(t, scope)
  return n  // 注：static scope 下不去重，与 instances 行为略异
}

/** 多 tag all-of 计数（通用 scope）*/
export function countAll(tags: readonly Tag[], scope: TagScope): number {
  if (scope.kind === 'instances') return countAllInInstances(tags, scope.instances)
  // static scope 退化：每个 tag 都必须有至少 1 个
  for (const t of tags) {
    if (countByTag(t, scope) === 0) return 0
  }
  return 1
}

// ============================================
// FireFilter · tag 维度匹配
// ============================================

/**
 * 判断 fire event 是否匹配 filter 的 tag 维度。
 *
 * 语义：
 *   - filter.tag 未提供 → 视为不限制 tag 维度，返 true
 *   - filter.tag 单值 → 事件源 affix 携带该 tag 即命中
 *   - filter.tag 数组 → any-of 语义，事件源 affix 至少携带其中一个 tag 即命中
 *
 * 注意：完整 fire filter 还需匹配 posRel / resource / is_crit / stack_state；
 *       那些由 affixTriggerOrchestrator 调用对应模块处理后与本函数 AND 组合。
 */
export function matchTagFilter(event: FireEvent, filter: FireFilter): boolean {
  if (filter.tag === undefined) return true
  const def = getAffixV2Definition(event.sourceAffixId)
  if (!def) return false
  const tags = Array.isArray(filter.tag) ? filter.tag : [filter.tag]
  for (const t of tags) {
    if (def.tags.includes(t as Tag)) return true
  }
  return false
}
