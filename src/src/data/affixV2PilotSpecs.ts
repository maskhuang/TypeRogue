// ============================================
// 打字肉鸽 - 新 Affix 系统 · S2 试点 8 个 affix 的 trigger + effect spec
// ============================================
// 跨 8 个 section 各 1 个，覆盖全部 6 archetype，验证设计系统能 cover 多样形状。
//
// 这是 S2 的产出物：把 archetype 模板 + balance 数据 + EffectSpec 10 kind 串起来落到具体词条。
// 数值由 computeAutoMagnitude 反推（详 affixV2Balance.ts）。
//
// 详 docs/design/affix-rewrite-tag-system.md §6（archetype 应用）

import type { TriggerSpec, EffectSpec } from './affixV2Trigger'
import { PositionRelation } from './keyboardTopology'

export interface AffixV2PilotSpec {
  readonly trigger: TriggerSpec
  readonly effect: EffectSpec
  /** archetype id（设计标注）*/
  readonly archetype: string
}

/**
 * 8 个试点 affix 的 trigger + effect spec。
 * key = AffixV2Definition.id（必须与 affixV2.json 中已有词条匹配）。
 */
export const PILOT_AFFIX_SPECS: Record<string, AffixV2PilotSpec> = {

  // ── 1 · maintenance · drip · feed ──
  // 每词末小额产出 score（auto-computed: T_maintenance/f_word_end = 3/30 = 0.1）
  feed: {
    archetype: 'drip',
    trigger: { type: 'on_word_end' },
    effect: { kind: 'gain_resource', resource: 'score', ratio: 0.1 },
  },

  // ── 2 · locomotion · burst-add · charge ──
  // 自触发关内成长 base（T_locomotion/f_self_fire = 2.5/30 ≈ 0.083）
  charge: {
    archetype: 'burst',
    trigger: { type: 'on_self_fire' },
    effect: { kind: 'add', ratio: 0.083 },
  },

  // ── 3 · posture · aura · piloerection ──
  // 持续给邻居（8 方向邻接）+5% 暴击率（passive · K3 fight duration）
  piloerection: {
    archetype: 'aura',
    trigger: { type: 'passive' },
    effect: {
      kind: 'apply_aura',
      selector: { type: 'neighbors', posRel: PositionRelation.Adjacent, pick: 'all' },
      modifier: { type: 'crit_chance_add', amount: 0.05 },
    },
  },

  // ── 4 · agonistic · burst-multiply · bite ──
  // 自触发关内成长 factor（T_agonistic/f_self_fire = 3.5/30 ≈ 0.117）
  bite: {
    archetype: 'burst',
    trigger: { type: 'on_self_fire' },
    effect: { kind: 'multiply', amount: 0.117 },
  },

  // ── 5 · vocal · broadcast · pant_hoot ──
  // 词末触发同行所有 skill 一次（喘啸 = 远距通讯 · SameRow 范围）
  pant_hoot: {
    archetype: 'broadcast',
    trigger: { type: 'on_word_end' },
    effect: { kind: 'fire_target', selector: { type: 'neighbors', posRel: PositionRelation.SameRow, pick: 'all' } },
  },

  // ── 6 · gesture · stack_release · hand_clap ──
  // 每键累积 stack，满 8 层释放
  // 释放 ratio = T_gesture / (f / threshold) = 3 / (300/8) ≈ 0.08；取 0.3 给"爆发感"
  hand_clap: {
    archetype: 'stack_release',
    trigger: { type: 'on_key' },
    effect: {
      kind: 'composite',
      effects: [
        { kind: 'stack_inc', amount: 1 },
        {
          kind: 'stack_release',
          threshold: 8,
          release: { kind: 'gain_resource', resource: 'score', ratio: 0.3 },
          reset: true,
        },
      ],
    },
  },

  // ── 7 · tool · burst-add + count-scale · hammer_anvil ──
  // 关内成长 base，且按 tool tag 数量缩放——凑 tool 越多 base 成长越快（涌现 anchor）
  hammer_anvil: {
    archetype: 'burst',
    trigger: { type: 'on_self_fire' },
    effect: {
      kind: 'add',
      ratio: 0.08,
      scale: { type: 'tag_count', tag: 'tool', factor: 0.2 },
    },
  },

  // ── 8a · maintenance · drip + every_n_keys · chew ──
  // 每 10 键产出 score（演示 every_n_keys trigger）
  chew: {
    archetype: 'drip',
    trigger: { type: 'every_n_keys', n: 10 },
    effect: { kind: 'gain_resource', resource: 'score', ratio: 1 },  // 高 magnitude · 因为 fires 少
  },

  // ── 8b · locomotion · on_fire 监听 · cling ──
  // 监听任何 score 资源 skill 的 fire（演示 on_fire(filter:resource) trigger）
  cling: {
    archetype: 'conditional',
    trigger: { type: 'on_fire', filter: { resource: 'score' } },
    effect: { kind: 'gain_resource', resource: 'score', ratio: 0.05 },
  },

  // ── 11 · tool · gain_skill · teach ──
  // 战斗胜利后 → 获得 1 个任意 recipe 池技能、与本技能同 Lv 的新技能
  // 师承叙事：宿主修为多深 → 徒弟出师就多深；不限段（"任意教学"）
  teach: {
    archetype: 'gain_skill',
    trigger: { type: 'on_battle_end', result: 'win' },
    effect: {
      kind: 'gain_skill',
      filter: { notOwned: false },          // 全开 · 7 个 recipe 全池随机抽
      source: 'recipe_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'widen',                    // 不会触发（filter 已全开）· 保留作 safety net
    },
  },

  // ── 12 · tool · gain_skill · imitate ──
  // 战斗胜利后 → 深 clone 1 个玩家自有 skill · Lv 等同宿主 · 仅同 section 兄弟（hasTagFromHost）
  // 模仿叙事：复制邻位 · 与 teach 的 recipe 创生互补 · pool 空走 skip 不 widen
  // hasTagFromHost: tool 段 imitate 只复制 tool 兄弟；若改投到 maintenance 段则自动改复制 maintenance
  imitate: {
    archetype: 'gain_skill',
    trigger: { type: 'on_battle_end', result: 'win' },
    effect: {
      kind: 'gain_skill',
      filter: { hasTagFromHost: true, notOwned: false },
      source: 'player_skill_pool',
      count: 1,
      levelMode: 'inherit_host',
      fallback: 'skip',           // imitate 是 nice-to-have · 无可复制对象不强 widen
    },
  },

  // ── 9 · abnormal · conditional · pacing ──
  // 危险情境下产出放大（shield < 50% Lv1 base 时 ratio ×6）
  pacing: {
    archetype: 'conditional',
    trigger: { type: 'on_word_end' },
    effect: {
      kind: 'conditional',
      when: { type: 'resource_below', resource: 'shield', ratio: 0.5 },
      then: { kind: 'gain_resource', resource: 'score', ratio: 0.3 },   // 高方差 + 危险加成
      else: { kind: 'gain_resource', resource: 'score', ratio: 0.05 },  // 平时小额
    },
  },
}

/** 全部试点 id（顺序与 8 个 section 对应）*/
export const PILOT_AFFIX_IDS = [
  'feed', 'charge', 'piloerection', 'bite',
  'pant_hoot', 'hand_clap', 'hammer_anvil', 'pacing',
  // 扩展 · 覆盖剩余 trigger 类型
  'chew',       // every_n_keys
  'cling',      // on_fire(filter:resource)
  // meta-progression
  'teach',      // on_battle_end + gain_skill(recipe_pool)
  'imitate',    // on_battle_end + gain_skill(player_skill_pool)
] as const

/** 查询接口 · 给 affixV2.ts buildDefinition 用 */
export function getPilotSpec(id: string): AffixV2PilotSpec | undefined {
  return PILOT_AFFIX_SPECS[id]
}
