// ============================================
// 打字肉鸽 - 职业数据定义
// ============================================
// Story 32.1 Task 1: 职业定义框架

import type { ClassId, FeatureId, ResourceType } from '../core/types';

/**
 * 职业定义接口
 */
export interface ClassDefinition {
  id: ClassId;
  name: string;
  description: string;
  icon: string;
  /** 独有资源类型 */
  uniqueResource: ResourceType | null;
  /** 失去的能力 */
  loseFeature: FeatureId | null;
  /** 失去能力的描述 */
  loseDescription: string | null;
  /** 初始遗物 ID */
  starterRelic: string | null;
}

/**
 * 所有职业定义
 */
export const CLASS_DEFINITIONS: Record<ClassId, ClassDefinition> = {
  none: {
    id: 'none',
    name: '无职业',
    description: '标准模式，无特殊机制。',
    icon: '⚔️',
    uniqueResource: null,
    loseFeature: null,
    loseDescription: null,
    starterRelic: null,
  },
  wordsmith: {
    id: 'wordsmith',
    name: '造词师',
    description: '操控输入层，通过字母碎片和采集队列手动构建词库。高确定性，精密工程师风格。',
    icon: '✍️',
    uniqueResource: 'fragment',
    loseFeature: 'pack-system',
    loseDescription: '失去牌包系统（商店无牌包 tab）',
    starterRelic: 'apprentice_notes',
  },
  metamorph: {
    id: 'metamorph',
    name: '蜕变师',
    description: '操控处理层，通过变异素和蜕变盲盒改造技能组合。低确定性，进化赌徒风格。',
    icon: '🧬',
    uniqueResource: 'mutagen',
    loseFeature: 'enchant-choice',
    loseDescription: '失去附魔选择权（Lv3 随机附魔）',
    starterRelic: 'primal_mutant',
  },
};

/**
 * 获取职业定义
 */
export function getClassDefinition(classId: ClassId): ClassDefinition {
  return CLASS_DEFINITIONS[classId];
}

/**
 * 获取所有职业 ID 列表（不含 none）
 */
export function getSelectableClassIds(): ClassId[] {
  return (['wordsmith', 'metamorph'] as ClassId[]);
}
