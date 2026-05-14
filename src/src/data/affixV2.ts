// ============================================
// 打字肉鸽 - 新 Affix 系统 · 词条定义与注册表
// ============================================
// 设计文档:
//   - docs/design/affix-rewrite-research.md (§3-6)
//   - docs/design/affix-rewrite-naming-pool.md (§1)
//   - docs/design/affix-rewrite-tag-system.md (§2)
//
// 本文件仅负责**命名 + tag + 静态数据**层。
// trigger / effect 的具体实现待 P1 实装时填入。

import type { Tag, SectionTag } from './affixTags'
import { SECTION_COLORS } from './affixTags'
import { AFFIX_V2_DATA, type AffixV2DefinitionData } from './schemas/affixV2.schema'
import type { TriggerSpec, EffectSpec } from './affixV2Trigger'
import { DEFAULT_TRIGGER, DEFAULT_EFFECT } from './affixV2Trigger'
import { getPilotSpec } from './affixV2PilotSpecs'

// ===== 类型 =====

/** Phase 标签：P1=原型期实现 · P2=二期扩展 */
export type AffixV2Phase = 'P1' | 'P2'

/**
 * 词条静态定义（runtime 不可变）。
 *
 * tags 由 schema 中的 section 字段单元素生成；后续 namespace 加入时
 * 此字段会扩展（详 affix-rewrite-tag-system.md §1.2-1.4）。
 *
 * trigger / effect 当前默认 `passive` / `noop`（本期未实装具体值）；
 * JSON schema 已开放可选字段，待后续逐条填入。
 */
export interface AffixV2Definition {
  readonly id: string
  readonly name_zh: string
  readonly name_en: string
  readonly section: SectionTag
  readonly tags: readonly Tag[]
  readonly phase: AffixV2Phase
  readonly notes?: string
  readonly trigger: TriggerSpec
  readonly effect: EffectSpec
}

/**
 * 词条运行时实例（挂在 skill 上的具体一份）。
 *
 * 本期仅承载身份信息——trigger 触发与 effect 数值待后续填。
 */
export interface AffixV2Instance {
  readonly defId: string             // 指向 AffixV2Definition.id
  // 后续将加：
  //   instanceId: string
  //   triggerOverride?: TriggerSpec
  //   effectOverride?: EffectSpec
  //   runtime stats（charge/stack/...）
}

// ===== 注册表 =====

function buildDefinition(d: AffixV2DefinitionData): AffixV2Definition {
  // 优先级：pilot spec (S2 试点 · 8 个) > JSON 显式字段 > 默认值
  const pilot = getPilotSpec(d.id)
  return {
    id: d.id,
    name_zh: d.name_zh,
    name_en: d.name_en,
    section: d.section as SectionTag,
    tags: [d.section as SectionTag],     // 初版只有 section 一个 tag
    phase: d.phase,
    notes: d.notes,
    trigger: pilot?.trigger ?? (d.trigger as TriggerSpec | undefined) ?? DEFAULT_TRIGGER,
    effect: pilot?.effect ?? (d.effect as EffectSpec | undefined) ?? DEFAULT_EFFECT,
  }
}

/** 全部词条定义（按 JSON 顺序保序）*/
export const AFFIX_V2_DEFINITIONS: readonly AffixV2Definition[] =
  AFFIX_V2_DATA.affixes.map(buildDefinition)

/** id → 定义 静态反向索引（来自 JSON）*/
const _byId: ReadonlyMap<string, AffixV2Definition> = new Map(
  AFFIX_V2_DEFINITIONS.map(d => [d.id, d]),
)

/** id → 定义 动态注册表（生成器产出，运行时注册）*/
const _dynamicById: Map<string, AffixV2Definition> = new Map()

/** 动态注册一个生成的词条定义（生成器用）*/
export function registerDynamicAffixV2(def: AffixV2Definition): void {
  _dynamicById.set(def.id, def)
}

/** 注销动态词条（卖出 / 替换时）*/
export function unregisterDynamicAffixV2(id: string): void {
  _dynamicById.delete(id)
}

/** 清空动态注册表（reset / 新 run 用）*/
export function clearDynamicAffixV2(): void {
  _dynamicById.clear()
}

/** 通过 id 查定义；动态优先 → 静态回退；不存在返 undefined */
export function getAffixV2Definition(id: string): AffixV2Definition | undefined {
  return _dynamicById.get(id) ?? _byId.get(id)
}

/** V2 词条颜色 · 优先 per-recipe 精细色，回 section 主色，再回灰
 *  defId 形如 'gen_<recipe>_<nonce>' 或静态 JSON id
 */
const RECIPE_COLORS: Record<string, string> = {
  // maintenance · 绿系
  feed:         '#27ae60',  // 标准绿
  drink:        '#16a085',  // 深绿 · 转化
  // locomotion · 蓝系
  climb:        '#2980b9',  // 深蓝 · 稳重累加
  run:          '#00cec9',  // 青蓝 · 倍率加速
  leap:         '#74b9ff',  // 亮蓝 · 极速跳跃
  // posture · 紫系
  piloerection: '#9b59b6',
  // agonistic · 红系
  drumming:     '#e74c3c',
}

export function getV2Color(defId: string): string {
  // 先尝试动态生成 id（gen_<recipe>_<nonce>）的 recipe 精细色
  const m = defId.match(/^gen_([^_]+)_/)
  if (m && RECIPE_COLORS[m[1]]) return RECIPE_COLORS[m[1]]
  // 静态 JSON id 直接查表
  if (RECIPE_COLORS[defId]) return RECIPE_COLORS[defId]
  // 回 section 主色
  const def = getAffixV2Definition(defId)
  if (!def) return '#cccccc'
  return SECTION_COLORS[def.section] ?? '#cccccc'
}

/** 校验 id 是否合法 */
export function isAffixV2Id(id: string): boolean {
  return _byId.has(id)
}

/** 按 section 列出所有词条 */
export function listAffixV2BySection(section: SectionTag): readonly AffixV2Definition[] {
  return AFFIX_V2_DEFINITIONS.filter(d => d.section === section)
}

/** 按 phase 列出所有词条 */
export function listAffixV2ByPhase(phase: AffixV2Phase): readonly AffixV2Definition[] {
  return AFFIX_V2_DEFINITIONS.filter(d => d.phase === phase)
}
