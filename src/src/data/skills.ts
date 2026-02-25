// ============================================
// 打字肉鸽 - 技能数据
// ============================================

import type { SkillDefinition, SkillType, PassiveSkillType, EvolutionBranch } from '../core/types';
import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes';

// === 被动技能类型列表 ===
export const PASSIVE_SKILL_TYPES: PassiveSkillType[] = ['core', 'aura', 'mirror', 'anchor', 'lone', 'void'];

// === 连锁流技能类型（echo: 标记双触发 / ripple: 标记效果传递）===
// 注意: 'chain' 技能（连锁）不在此列表中，它是条件倍率技能，非链式行为
export const CHAIN_SKILL_TYPES: SkillType[] = ['echo', 'ripple'];

// === 联动技能类型（兼容旧代码，包含被动和技能链类型） ===
export const SYNERGY_TYPES: SkillType[] = [...PASSIVE_SKILL_TYPES, ...CHAIN_SKILL_TYPES];

export const SKILLS: Record<string, SkillDefinition> = {
  // === 分数技能（主动） ===
  burst: {
    name: '爆发',
    icon: '💥',
    type: 'score',
    category: 'active',
    base: 5,
    grow: 2,
    desc: '触发时+5分',
    evolutions: ['burst_inferno', 'burst_precision'],
  },

  // === 倍率技能（主动） ===
  amp: {
    name: '增幅',
    icon: '📈',
    type: 'multiply',
    category: 'active',
    base: 20,
    grow: 5,
    desc: '触发时倍率+0.2',
    evolutions: ['amp_crescendo', 'amp_overdrive'],
  },

  // === 时间技能（主动） ===
  freeze: {
    name: '冻结',
    icon: '❄️',
    type: 'time',
    category: 'active',
    base: 2,
    grow: 0.5,
    desc: '触发时+2秒',
    evolutions: ['freeze_permafrost', 'freeze_chrono'],
  },

  // === 护盾技能（主动） ===
  shield: {
    name: '护盾',
    icon: '🛡️',
    type: 'protect',
    category: 'active',
    base: 1,
    grow: 1,
    desc: '打错时保护连击(1次)'
  },

  // === 连锁流技能（主动，标记互动） ===
  echo: {
    name: '回响',
    icon: '🔔',
    type: 'echo',
    category: 'active',
    base: 2,
    grow: 1,
    desc: '触发后，下一个非echo技能触发两次',
    evolutions: ['echo_resonance', 'echo_phantom'],
  },
  ripple: {
    name: '涟漪',
    icon: '🌊',
    type: 'ripple',
    category: 'active',
    base: 3,
    grow: 1,
    desc: '触发时+3分，下一个非ripple技能效果传递给再下一个'
  },

  // === 被动技能（持续生效，基于键盘布局） ===
  core: {
    name: '能量核心',
    icon: '💎',
    type: 'core',
    category: 'passive',
    base: 10,
    grow: 5,
    desc: '[被动] 相邻技能每3次触发→分数+10%',
    evolutions: ['core_nexus', 'core_fusion'],
  },
  aura: {
    name: '光环',
    icon: '🔆',
    type: 'aura',
    category: 'passive',
    base: 3,
    grow: 1,
    desc: '[被动] 相邻分数技能效果+50%'
  },
  lone: {
    name: '孤狼',
    icon: '🐺',
    type: 'lone',
    category: 'passive',
    base: 20,
    grow: 10,
    desc: '[被动] 若相邻均无技能，基础倍率+0.2',
    evolutions: ['lone_hermit', 'lone_shadow'],
  },
  void: {
    name: '虚空',
    icon: '🌑',
    type: 'void',
    category: 'passive',
    base: 2,
    grow: 1,
    desc: '[被动] 每个相邻空位，字母底分+2',
  },

  // === 爆发流新增 ===
  gamble: {
    name: '豪赌',
    icon: '🎲',
    type: 'gamble',
    category: 'active',
    base: 15,
    grow: 5,
    desc: '50%概率+15分'
  },

  // === 倍率流新增 ===
  chain: {
    name: '连锁',
    icon: '🔗',
    type: 'chain',
    category: 'active',
    base: 10,
    grow: 5,
    desc: '连续不同技能触发时+0.1倍率'
  },
  overclock: {
    name: '超频',
    icon: '⚡',
    type: 'overclock',
    category: 'active',
    base: 50,
    grow: 10,
    desc: '本词第3+技能时效果×1.5'
  },

  // === 续航流新增 ===
  pulse: {
    name: '脉冲',
    icon: '💓',
    type: 'pulse',
    category: 'active',
    base: 1,
    grow: 0.5,
    desc: '每3次触发+1秒'
  },
  sentinel: {
    name: '哨兵',
    icon: '🏰',
    type: 'sentinel',
    category: 'active',
    base: 2,
    grow: 1,
    desc: '每层护盾+2分'
  },

  // === 连锁流新增 ===
  mirror: {
    name: '镜像',
    icon: '🪞',
    type: 'mirror',
    category: 'passive',
    base: 1,
    grow: 0,
    desc: '[被动] 同行最左触发→触发最右'
  },
  leech: {
    name: '汲取',
    icon: '🧛',
    type: 'leech',
    category: 'active',
    base: 2,
    grow: 1,
    desc: '本词每个已触发技能+2分'
  },

  // === 被动流新增 ===
  anchor: {
    name: '锚定',
    icon: '⚓',
    type: 'anchor',
    category: 'passive',
    base: 15,
    grow: 0,
    desc: '[被动] 同行所有技能效果×1.15'
  },
};

// === Modifier 工厂类型 ===
export type SkillModifierFactory = (
  skillId: string,
  level: number,
  context?: PipelineContext,
) => Modifier[]

// === 工具函数 ===
function skillVal(skillId: string, level: number): number {
  const sk = SKILLS[skillId]
  return sk.base + sk.grow * (level - 1)
}

function baseModifier(skillId: string, id: string, effectType: 'score' | 'multiply' | 'time' | 'shield', value: number): Modifier {
  return {
    id: `skill:${skillId}:${id}`,
    source: `skill:${skillId}`,
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    effect: { type: effectType, value, stacking: 'additive' },
    priority: 100,
  }
}

// === SKILL_MODIFIER_DEFS — 每个技能的 Modifier 工厂 ===
export const SKILL_MODIFIER_DEFS: Record<string, SkillModifierFactory> = {
  burst: (id, lvl) => [
    baseModifier(id, 'score', 'score', skillVal(id, lvl)),
  ],

  amp: (id, lvl) => [
    baseModifier(id, 'multiply', 'multiply', skillVal(id, lvl) / 100),
  ],

  freeze: (id, lvl) => [
    baseModifier(id, 'time', 'time', skillVal(id, lvl)),
  ],

  shield: (id, lvl) => [
    baseModifier(id, 'shield', 'shield', skillVal(id, lvl)),
    {
      id: `skill:${id}:protect`,
      source: `skill:${id}`,
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_error',
      phase: 'before',
      behavior: { type: 'intercept' },
      priority: 50,
    },
  ],

  core: (id, lvl, ctx) => {
    const triggers = ctx?.skillsTriggeredThisWord ?? 0;
    const stacks = Math.floor(triggers / 3);
    const bonusPerStack = skillVal(id, lvl) / 100; // base=10 → 0.1
    const multBonus = stacks * bonusPerStack;
    if (multBonus <= 0) return [];
    return [{
      id: `skill:${id}:enhance`,
      source: `skill:${id}`,
      sourceType: 'skill' as const,
      layer: 'enhance' as const,
      trigger: 'on_skill_trigger' as const,
      phase: 'calculate' as const,
      effect: { type: 'score' as const, value: 1 + multBonus, stacking: 'multiplicative' as const },
      priority: 100,
    }];
  },

  aura: (id, lvl) => [
    // 自身触发时小分数
    baseModifier(id, 'score', 'score', skillVal(id, lvl) / 3),
    // 相邻 score 技能 enhance ×1.5
    {
      id: `skill:${id}:enhance`,
      source: `skill:${id}`,
      sourceType: 'skill',
      layer: 'enhance',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      priority: 100,
    },
  ],

  lone: () => [],  // layout-only passive: bonus calculated at battle start

  echo: (id, lvl) => [
    baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    {
      id: `skill:${id}:flag`,
      source: `skill:${id}`,
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_skill_trigger',
      phase: 'after',
      behavior: { type: 'set_echo_flag' },
      priority: 100,
    },
  ],

  void: () => [],  // layout-only passive: bonus calculated at battle start

  ripple: (id, lvl) => [
    baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    {
      id: `skill:${id}:flag`,
      source: `skill:${id}`,
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_skill_trigger',
      phase: 'after',
      behavior: { type: 'set_ripple_flag' },
      priority: 100,
    },
  ],

  // === 爆发流：gamble — 50% 概率 +score ===
  gamble: (id, lvl) => [{
    ...baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    condition: { type: 'random' as const, probability: 0.5 },
  }],

  // === 倍率流：chain — 连续不同技能时 +multiply ===
  chain: (id, lvl) => [{
    ...baseModifier(id, 'multiply', 'multiply', skillVal(id, lvl) / 100),
    condition: { type: 'different_skill_from_last' as const },
  }],

  // === 倍率流：overclock — 本词 3+ 技能时 enhance score ×N ===
  overclock: (id, lvl) => [{
    id: `skill:${id}:enhance`,
    source: `skill:${id}`,
    sourceType: 'skill',
    layer: 'enhance',
    trigger: 'on_skill_trigger',
    phase: 'calculate',
    effect: { type: 'score', value: 1 + skillVal(id, lvl) / 100, stacking: 'multiplicative' },
    condition: { type: 'skills_triggered_gte' as const, value: 3 },
    priority: 100,
  }],

  // === 续航流：pulse — 每 3 次技能触发 +time ===
  pulse: (id, lvl) => [{
    id: `skill:${id}:counter`,
    source: `skill:${id}`,
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_skill_trigger',
    phase: 'after',
    behavior: { type: 'pulse_counter', timeBonus: skillVal(id, lvl) },
    priority: 100,
  }],

  // === 续航流：sentinel — 根据护盾层数加分 ===
  sentinel: (id, lvl, ctx) => [
    baseModifier(id, 'score', 'score', (ctx?.shieldCount ?? 0) * skillVal(id, lvl)),
  ],

  // === 连锁流：mirror — 被动，同行镜像触发 ===
  mirror: (id, _lvl) => [{
    id: `skill:${id}:trigger`,
    source: `skill:${id}`,
    sourceType: 'skill',
    layer: 'enhance',
    trigger: 'on_skill_trigger',
    phase: 'after',
    behavior: { type: 'trigger_row_mirror' },
    priority: 100,
  }],

  // === 连锁流：leech — 本词已触发技能数 × skillVal ===
  leech: (id, lvl, ctx) => [
    baseModifier(id, 'score', 'score', (ctx?.skillsTriggeredThisWord ?? 0) * skillVal(id, lvl)),
  ],

  // === 被动流：anchor — 同行技能效果 ×1.15 ===
  anchor: (id, lvl) => [{
    id: `skill:${id}:enhance`,
    source: `skill:${id}`,
    sourceType: 'skill' as const,
    layer: 'enhance' as const,
    trigger: 'on_skill_trigger' as const,
    phase: 'calculate' as const,
    effect: { type: 'score' as const, value: 1 + skillVal(id, lvl) / 100, stacking: 'multiplicative' as const },
    priority: 100,
  }],
}

// === 技能流派映射 ===
export interface SkillSchool {
  label: string;
  cssClass: string;
}

export const SKILL_SCHOOL: Record<string, SkillSchool> = {
  burst: { label: '爆发', cssClass: 'school-burst' },
  lone: { label: '被动', cssClass: 'school-passive' },
  void: { label: '被动', cssClass: 'school-passive' },
  gamble: { label: '爆发', cssClass: 'school-burst' },
  amp: { label: '倍率', cssClass: 'school-multiply' },
  chain: { label: '倍率', cssClass: 'school-multiply' },
  overclock: { label: '倍率', cssClass: 'school-multiply' },
  freeze: { label: '续航', cssClass: 'school-sustain' },
  shield: { label: '续航', cssClass: 'school-sustain' },
  pulse: { label: '续航', cssClass: 'school-sustain' },
  sentinel: { label: '续航', cssClass: 'school-sustain' },
  echo: { label: '连锁', cssClass: 'school-chain' },
  ripple: { label: '连锁', cssClass: 'school-chain' },
  mirror: { label: '连锁', cssClass: 'school-chain' },
  leech: { label: '连锁', cssClass: 'school-chain' },
  core: { label: '被动', cssClass: 'school-passive' },
  aura: { label: '被动', cssClass: 'school-passive' },
  anchor: { label: '被动', cssClass: 'school-passive' },
};

export function getSkillSchool(skillId: string): SkillSchool {
  return SKILL_SCHOOL[skillId] ?? { label: '未知', cssClass: 'school-unknown' };
}

/**
 * 检查技能是否为被动技能
 */
export function isPassiveSkill(skillId: string): boolean {
  const skill = SKILLS[skillId];
  return skill?.category === 'passive';
}

/**
 * 检查技能是否为纯布局被动技能（不触发，效果在战斗开始时计算）
 */
export function isLayoutOnlyPassive(skillId: string): boolean {
  const skill = SKILLS[skillId];
  return skill?.type === 'lone' || skill?.type === 'void';
}

/**
 * 检查技能是否为技能链技能
 */
export function isChainSkill(skillId: string): boolean {
  const skill = SKILLS[skillId];
  return skill?.type === 'echo' || skill?.type === 'ripple';
}

// ============================================
// 技能进化系统 (Story 15.1)
// ============================================

// === 进化分支数据 ===
export const EVOLUTIONS: Record<string, EvolutionBranch> = {
  // --- burst 爆发流 ---
  burst_inferno: {
    id: 'burst_inferno',
    name: '烈焰爆发',
    icon: '🔥',
    description: '底分翻倍但仅在 combo≥10 时触发',
    skillId: 'burst',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 40 },
    flavorText: '积蓄的怒火在连击中爆发。',
  },
  burst_precision: {
    id: 'burst_precision',
    name: '精准爆发',
    icon: '🎯',
    description: '底分降低但额外加倍率 +0.3',
    skillId: 'burst',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 40 },
    flavorText: '精准的一击胜过千次挥舞。',
  },

  // --- amp 倍率流 ---
  amp_crescendo: {
    id: 'amp_crescendo',
    name: '渐强',
    icon: '🎵',
    description: '倍率加成随本词触发技能数递增（每个 +0.1 额外）',
    skillId: 'amp',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 50 },
    flavorText: '旋律逐渐高昂，终成交响。',
  },
  amp_overdrive: {
    id: 'amp_overdrive',
    name: '超载',
    icon: '💢',
    description: '倍率加成翻倍但触发后下一个词无效',
    skillId: 'amp',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 50 },
    flavorText: '超负荷运转，代价是短暂的停顿。',
  },

  // --- echo 连锁流 ---
  echo_resonance: {
    id: 'echo_resonance',
    name: '共鸣',
    icon: '🔊',
    description: '双触发变三触发（第三次 50% 效果）',
    skillId: 'echo',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 50 },
    flavorText: '回响不止一次，共鸣穿透虚空。',
  },
  echo_phantom: {
    id: 'echo_phantom',
    name: '幻影',
    icon: '👻',
    description: '第二次触发改为触发一个随机相邻技能',
    skillId: 'echo',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 50 },
    flavorText: '回声中藏着另一个灵魂的低语。',
  },

  // --- freeze 续航流 ---
  freeze_permafrost: {
    id: 'freeze_permafrost',
    name: '永冻',
    icon: '🧊',
    description: '加时提升至 +1.5 秒但每词只能触发一次',
    skillId: 'freeze',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 40 },
    flavorText: '凝固的时间不再流逝。',
  },
  freeze_chrono: {
    id: 'freeze_chrono',
    name: '时光倒流',
    icon: '⏪',
    description: '不加时，改为每触发 3 次回溯一个错误（恢复 combo）',
    skillId: 'freeze',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 40 },
    flavorText: '时间倒转，错误从未发生。',
  },

  // --- lone 爆发流 ---
  lone_hermit: {
    id: 'lone_hermit',
    name: '隐士',
    icon: '🏔️',
    description: '被动倍率加成×3，但最多装备4个技能',
    skillId: 'lone',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 60 },
    flavorText: '极致的孤独蕴含极致的力量。',
  },
  lone_shadow: {
    id: 'lone_shadow',
    name: '暗影',
    icon: '🌘',
    description: '允许1个相邻技能仍视为孤立，加成×1.5',
    skillId: 'lone',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 60 },
    flavorText: '暗影从不真正独行，但也不需要同伴。',
  },

  // --- core 被动流 ---
  core_nexus: {
    id: 'core_nexus',
    name: '枢纽',
    icon: '🌐',
    description: '每3次触发 +15% 增强但自身无底分',
    skillId: 'core',
    branch: 'A',
    condition: { minLevel: 3, goldCost: 60 },
    flavorText: '枢纽不发光，但让一切发光。',
  },
  core_fusion: {
    id: 'core_fusion',
    name: '融合',
    icon: '⚛️',
    description: '相邻增强降至 +5%，但自身获得相邻技能数 × 2 底分',
    skillId: 'core',
    branch: 'B',
    condition: { minLevel: 3, goldCost: 60 },
    flavorText: '融合众力，化为己用。',
  },
}

// === 进化 Modifier 工厂 ===
export const EVOLUTION_MODIFIER_DEFS: Record<string, SkillModifierFactory> = {
  // --- burst_inferno: 底分翻倍 + combo≥10 条件 ---
  burst_inferno: (id, lvl) => [{
    ...baseModifier(id, 'score', 'score', skillVal(id, lvl) * 2),
    condition: { type: 'combo_gte' as const, value: 10 },
  }],

  // --- burst_precision: 底分减半 + 额外倍率 +0.3 ---
  burst_precision: (id, lvl) => [
    baseModifier(id, 'score', 'score', Math.floor(skillVal(id, lvl) * 0.5)),
    baseModifier(id, 'mult', 'multiply', 0.3),
  ],

  // --- amp_crescendo: 倍率随本词触发技能数递增 ---
  amp_crescendo: (id, lvl, ctx) => {
    const baseVal = skillVal(id, lvl) / 100
    const extraPerSkill = 0.1
    const skillsTriggered = ctx?.skillsTriggeredThisWord ?? 0
    return [
      baseModifier(id, 'multiply', 'multiply', baseVal + skillsTriggered * extraPerSkill),
    ]
  },

  // --- amp_overdrive: 倍率翻倍 + 下一词冷却 ---
  amp_overdrive: (id, lvl) => [
    baseModifier(id, 'multiply', 'multiply', (skillVal(id, lvl) / 100) * 2),
    {
      id: `skill:${id}:cooldown`,
      source: `skill:${id}`,
      sourceType: 'skill' as const,
      layer: 'base' as const,
      trigger: 'on_skill_trigger' as const,
      phase: 'after' as const,
      behavior: { type: 'set_word_cooldown' as const },
      priority: 100,
    },
  ],

  // --- echo_resonance: 与 echo 相同结构，runtime 处理三触发 ---
  echo_resonance: (id, lvl) => [
    baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    {
      id: `skill:${id}:flag`,
      source: `skill:${id}`,
      sourceType: 'skill' as const,
      layer: 'base' as const,
      trigger: 'on_skill_trigger' as const,
      phase: 'after' as const,
      behavior: { type: 'set_echo_flag' as const },
      priority: 100,
    },
  ],

  // --- echo_phantom: 触发随机相邻技能替代双触发 ---
  echo_phantom: (id, lvl) => [
    baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    {
      id: `skill:${id}:flag`,
      source: `skill:${id}`,
      sourceType: 'skill' as const,
      layer: 'base' as const,
      trigger: 'on_skill_trigger' as const,
      phase: 'after' as const,
      behavior: { type: 'trigger_random_adjacent' as const },
      priority: 100,
    },
  ],

  // --- freeze_permafrost: 固定 +1.5 秒（每词一次由 runtime 控制）---
  freeze_permafrost: (id, _lvl) => [
    baseModifier(id, 'time', 'time', 1.5),
  ],

  // --- freeze_chrono: 无加时，每 3 次触发恢复 combo ---
  freeze_chrono: (id, _lvl) => [{
    id: `skill:${id}:restore`,
    source: `skill:${id}`,
    sourceType: 'skill' as const,
    layer: 'base' as const,
    trigger: 'on_skill_trigger' as const,
    phase: 'after' as const,
    behavior: { type: 'restore_combo' as const, triggerEvery: 3 },
    priority: 100,
  }],

  // --- lone_hermit: layout-only passive, handled at battle start ---
  lone_hermit: () => [],

  // --- lone_shadow: layout-only passive, handled at battle start ---
  lone_shadow: () => [],

  // --- core_nexus: +15% 每 3 次触发叠加，无底分 ---
  core_nexus: (id, _lvl, ctx) => {
    const triggers = ctx?.skillsTriggeredThisWord ?? 0
    const stacks = Math.floor(triggers / 3)
    const bonusPerStack = 0.15
    const multBonus = stacks * bonusPerStack
    if (multBonus <= 0) return []
    return [{
      id: `skill:${id}:enhance`,
      source: `skill:${id}`,
      sourceType: 'skill' as const,
      layer: 'enhance' as const,
      trigger: 'on_skill_trigger' as const,
      phase: 'calculate' as const,
      effect: { type: 'score' as const, value: 1 + multBonus, stacking: 'multiplicative' as const },
      priority: 100,
    }]
  },

  // --- core_fusion: +5% 叠加 + 相邻技能数 × 2 底分 ---
  core_fusion: (id, _lvl, ctx) => {
    const triggers = ctx?.skillsTriggeredThisWord ?? 0
    const stacks = Math.floor(triggers / 3)
    const adjacentCount = ctx?.adjacentSkillCount ?? 0
    const mods: Modifier[] = []
    if (adjacentCount > 0) {
      mods.push(baseModifier(id, 'score', 'score', adjacentCount * 2))
    }
    const bonusPerStack = 0.05
    const multBonus = stacks * bonusPerStack
    if (multBonus > 0) {
      mods.push({
        id: `skill:${id}:enhance`,
        source: `skill:${id}`,
        sourceType: 'skill' as const,
        layer: 'enhance' as const,
        trigger: 'on_skill_trigger' as const,
        phase: 'calculate' as const,
        effect: { type: 'score' as const, value: 1 + multBonus, stacking: 'multiplicative' as const },
        priority: 100,
      })
    }
    return mods
  },
}

// === 进化工厂查询 ===

/**
 * 获取技能的 Modifier 工厂（优先返回进化后工厂）
 */
export function getSkillModifierFactory(
  skillId: string,
  evolvedSkills?: Map<string, string>,
): SkillModifierFactory {
  if (evolvedSkills) {
    const branchId = evolvedSkills.get(skillId)
    if (branchId && EVOLUTION_MODIFIER_DEFS[branchId]) {
      return EVOLUTION_MODIFIER_DEFS[branchId]
    }
  }
  return SKILL_MODIFIER_DEFS[skillId]
}

/**
 * 获取技能的进化分支列表
 */
export function getEvolutionBranches(skillId: string): EvolutionBranch[] {
  const skill = SKILLS[skillId]
  if (!skill?.evolutions) return []
  return skill.evolutions
    .map(branchId => EVOLUTIONS[branchId])
    .filter((b): b is EvolutionBranch => b !== undefined)
}

/**
 * 获取技能显示信息（进化后使用进化数据）
 */
export function getSkillDisplayInfo(
  skillId: string,
  evolvedSkills?: Map<string, string>,
): { name: string; icon: string; desc: string } {
  if (evolvedSkills) {
    const branchId = evolvedSkills.get(skillId)
    if (branchId && EVOLUTIONS[branchId]) {
      const evo = EVOLUTIONS[branchId]
      return { name: evo.name, icon: evo.icon, desc: evo.description }
    }
  }
  const sk = SKILLS[skillId]
  if (sk) return { name: sk.name, icon: sk.icon, desc: sk.desc }
  return { name: '???', icon: '?', desc: '' }
}
