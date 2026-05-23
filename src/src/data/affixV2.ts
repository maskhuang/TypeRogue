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
  /** 使用次数上限（生成时赋值）· 触发若干次后从宿主移除（用完消失）· undefined = 无限制 */
  readonly maxUses?: number
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
  drink:        '#16a085',  // 深绿 · 转化（持有产出）
  regurgitate:  '#1e8c6f',  // 墨绿 · 转化（消耗产出）
  // locomotion · 蓝系
  climb:        '#2980b9',  // 深蓝 · 稳重累加
  run:          '#00cec9',  // 青蓝 · 倍率加速
  leap:         '#74b9ff',  // 亮蓝 · 极速跳跃
  // posture · 紫系
  piloerection: '#9b59b6',
  // agonistic · 红系
  drumming:     '#e74c3c',
  supplant:     '#c0392b',  // 深红 · 取代/吞噬（本场移除 + 吸收产出）
  // tool/cognition · 棕金系（meta-progression 操纵家族 · 共 tool 段棕基底，各取一调以可辨识）
  teach:        '#d4a017',  // 暖金 · 教学/启蒙
  imitate:      '#b5651d',  // 铜/赤陶 · 镜像复制
  spear_make:   '#6e4b2a',  // 深锻棕 · 制造/锻造
  gaze_follow:  '#a98f5c',  // 砂驼 · 注视跟随
  nut_crack:    '#9c6b30',  // 坚果壳棕 · 大额单次产出（消耗型）
}

/** 从 defId 提取 recipe id：gen_<recipeId>_<nonce> · recipeId 可含下划线（如 spear_make）·
 *  nonce 为 toString(36) 产物（[a-z0-9]，无下划线），故剥末尾 _<nonce> 即得完整 recipeId。
 *  非 gen_ 前缀（静态 JSON id）原样返回。 */
function extractRecipeId(defId: string): string {
  if (!defId.startsWith('gen_')) return defId
  return defId.slice(4).replace(/_[a-z0-9]+$/, '')
}

export function getV2Color(defId: string): string {
  // recipe 精细色（动态 gen_ id 与静态 id 统一走 extractRecipeId）
  const recipeId = extractRecipeId(defId)
  if (RECIPE_COLORS[recipeId]) return RECIPE_COLORS[recipeId]
  // 回 section 主色
  const def = getAffixV2Definition(defId)
  if (!def) return '#cccccc'
  return SECTION_COLORS[def.section] ?? '#cccccc'
}

/** 校验 id 是否合法 */
export function isAffixV2Id(id: string): boolean {
  return _byId.has(id)
}

// ===== 使用次数限制 · tool/认知词条「用完消失」=====
// 认知/工具段（§2.1.10）的词条是"消耗型工具"——触发若干次后即报废移除。
// 上限在**生成时随机 roll** 写入 def.maxUses（见 affixV2Generator.generateAffixV2：tool 段
// recipe 在 [MIN, MAX] 内取整数），运行时只读这个值；当前 live 的 tool 词条
// （teach/imitate/spear_make/gaze_follow）均为 on_battle_end，故每关结束消耗 1 次，
// 用尽后从宿主 skill 移除（计数与移除见 affixV2Equipped.chargeToolAffixUses）。
// roll 用 generator 的 seeded random，与该 def 的 trigger/effect 同生命周期（_dynamicById），
// 故同一实例内稳定。

/** tool/认知段词条生成时 roll 使用次数的闭区间（balance 旋钮）*/
export const TOOL_AFFIX_USES_MIN = 2
export const TOOL_AFFIX_USES_MAX = 4

/** 返回该词条的使用次数上限（生成时写入的 def.maxUses）；未赋值 = 无限制 */
export function getAffixV2UseLimit(def: AffixV2Definition): number | null {
  return def.maxUses ?? null
}

/** 按 section 列出所有词条 */
export function listAffixV2BySection(section: SectionTag): readonly AffixV2Definition[] {
  return AFFIX_V2_DEFINITIONS.filter(d => d.section === section)
}

/** 按 phase 列出所有词条 */
export function listAffixV2ByPhase(phase: AffixV2Phase): readonly AffixV2Definition[] {
  return AFFIX_V2_DEFINITIONS.filter(d => d.phase === phase)
}
