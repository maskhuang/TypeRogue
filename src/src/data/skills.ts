// ============================================
// 打字肉鸽 - 技能数据
// ============================================

import type { SkillDefinition, SkillType, PassiveSkillType } from '../core/types';

// === 被动技能类型列表 ===
export const PASSIVE_SKILL_TYPES: PassiveSkillType[] = ['core', 'aura', 'lone', 'void'];

// === 主动技能中的技能链类型 ===
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

  // === 技能链技能（主动，影响下一个技能） ===
  echo: {
    name: '回响',
    icon: '🔔',
    type: 'echo',
    category: 'active',
    base: 30,
    grow: 10,
    desc: '主动：触发所有相邻技能；被动：30%概率被相邻触发，升级提高'
  },
  ripple: {
    name: '涟漪',
    icon: '🌊',
    type: 'ripple',
    category: 'active',
    base: 3,
    grow: 1,
    desc: '触发时+3分，相邻技能效果×1.5'
  },

  // === 被动技能（持续生效，基于键盘布局） ===
  core: {
    name: '能量核心',
    icon: '💎',
    type: 'core',
    category: 'passive',
    base: 5,
    grow: 2,
    desc: '[被动] 每个相邻技能使全局分数+5%'
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
};

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
