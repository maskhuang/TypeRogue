// ============================================
// 打字肉鸽 - 技能数据
// ============================================

import type { SkillDefinition, SkillType, PassiveSkillType } from '../core/types';
import type { Modifier, PipelineContext } from '../systems/modifiers/ModifierTypes';

// === 被动技能类型列表 ===
export const PASSIVE_SKILL_TYPES: PassiveSkillType[] = ['core', 'aura', 'mirror', 'anchor'];

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
    desc: '触发时+5分'
  },

  // === 倍率技能（主动） ===
  amp: {
    name: '增幅',
    icon: '📈',
    type: 'multiply',
    category: 'active',
    base: 20,
    grow: 5,
    desc: '触发时倍率+0.2'
  },

  // === 时间技能（主动） ===
  freeze: {
    name: '冻结',
    icon: '❄️',
    type: 'time',
    category: 'active',
    base: 2,
    grow: 0.5,
    desc: '触发时+2秒'
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
    desc: '触发后，下一个非echo技能触发两次'
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
    desc: '[被动] 相邻技能每3次触发→分数+10%'
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
    category: 'active',
    base: 8,
    grow: 3,
    desc: '若本词无其他技能触发，+8分'
  },
  void: {
    name: '虚空',
    icon: '🌑',
    type: 'void',
    category: 'active',
    base: 12,
    grow: 4,
    desc: '+12分，本词每有一个其他技能触发-1分'
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
    base: 1,
    grow: 1,
    desc: '每完成一词恢复1次盾'
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

  lone: (id, lvl) => [{
    ...baseModifier(id, 'score', 'score', skillVal(id, lvl)),
    condition: { type: 'skills_triggered_this_word' as const, value: 1 },
  }],

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

  void: (id, lvl, ctx) => {
    const val = skillVal(id, lvl)
    const otherSkills = Math.max(0, (ctx?.skillsTriggeredThisWord ?? 0) - 1)
    return [
      baseModifier(id, 'score', 'score', Math.max(0, val - otherSkills)),
    ]
  },

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

  // === 续航流：sentinel — 每完成一词恢复护盾 ===
  sentinel: (id, lvl) => [{
    id: `skill:${id}:restore`,
    source: `skill:${id}`,
    sourceType: 'skill',
    layer: 'base',
    trigger: 'on_word_complete',
    phase: 'after',
    behavior: { type: 'restore_shield', amount: skillVal(id, lvl) },
    priority: 100,
  }],

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

/**
 * 检查技能是否为被动技能
 */
export function isPassiveSkill(skillId: string): boolean {
  const skill = SKILLS[skillId];
  return skill?.category === 'passive';
}

/**
 * 检查技能是否为技能链技能
 */
export function isChainSkill(skillId: string): boolean {
  const skill = SKILLS[skillId];
  return skill?.type === 'echo' || skill?.type === 'ripple';
}
