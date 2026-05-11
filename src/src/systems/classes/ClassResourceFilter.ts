// ============================================
// 打字肉鸽 - 职业资源条件过滤 + 资源池单一来源
// ============================================
// Story 32.2 Task 5: 过滤非当前职业的职业资源相关技能
// 资源池：所有需要"哪些资源可用/可枚举"的代码必须从此文件取数，禁止再硬编码资源列表

import type { ResourceType, ClassId } from '../../core/types';

/** 职业资源 → 所需职业 ID 映射 */
const CLASS_RESOURCE_MAP: Partial<Record<ResourceType, ClassId>> = {
  energy: 'wordsmith',
  mutagen: 'metamorph',
};

/** 职业 → 该职业的专属资源 */
const CLASS_TO_RESOURCE: Partial<Record<ClassId, ResourceType>> = {
  wordsmith: 'energy',
  metamorph: 'mutagen',
};

/** 通用资源（非职业专属，所有职业可用）— 新增通用资源在此添加 */
export const GENERIC_RESOURCES: readonly ResourceType[] = [
  'base', 'score', 'multiplier', 'time', 'shield', 'gold',
];

/** 职业资源（职业专属，仅在对应职业激活）*/
export const CLASS_RESOURCES: readonly ResourceType[] = ['energy', 'mutagen'];

/** 所有资源（通用 + 职业专属）— 用于枚举全资源场景 */
export const ALL_RESOURCES: readonly ResourceType[] = [...GENERIC_RESOURCES, ...CLASS_RESOURCES];

/** 当前职业可用的资源列表（通用资源 + 该职业的专属资源，如果有）*/
export function getActiveResources(classId?: string): ResourceType[] {
  const cls = CLASS_TO_RESOURCE[classId as ClassId];
  return cls ? [...GENERIC_RESOURCES, cls] : [...GENERIC_RESOURCES];
}

/**
 * 判断资源类型是否对当前职业激活
 * - 通用资源（base/score/multiplier/time/gold）始终激活
 * - 职业资源仅在对应职业时激活
 */
export function isResourceActiveForClass(resource: ResourceType, classId: ClassId): boolean {
  const requiredClass = CLASS_RESOURCE_MAP[resource];
  if (!requiredClass) return true; // 通用资源，始终可用
  return classId === requiredClass;
}

/**
 * 判断资源是否为职业专属资源
 */
export function isClassResource(resource: ResourceType): boolean {
  return CLASS_RESOURCES.includes(resource);
}

/**
 * 过滤技能池，移除非当前职业的职业资源相关技能
 * 适用于 Producer、Converter（source/target）、Amplifier、Connector（resource trigger）
 */
export function filterSkillPoolByClass<T extends { resource?: ResourceType; source?: ResourceType; target?: ResourceType }>(
  pool: T[],
  classId: ClassId,
): T[] {
  return pool.filter(item => {
    // 检查 resource 字段（Producer、Amplifier、Connector）
    if (item.resource && !isResourceActiveForClass(item.resource, classId)) return false;
    // 检查 source/target 字段（Converter）
    if (item.source && !isResourceActiveForClass(item.source, classId)) return false;
    if (item.target && !isResourceActiveForClass(item.target, classId)) return false;
    return true;
  });
}

/**
 * 按 ID 过滤技能池（使用数据定义查找资源字段）
 */
export function filterSkillIdsByClass(
  ids: string[],
  classId: ClassId,
  getDefinition: (id: string) => { resource?: ResourceType; source?: ResourceType; target?: ResourceType } | undefined,
): string[] {
  return ids.filter(id => {
    const def = getDefinition(id);
    if (!def) return true;
    if (def.resource && !isResourceActiveForClass(def.resource, classId)) return false;
    if (def.source && !isResourceActiveForClass(def.source, classId)) return false;
    if (def.target && !isResourceActiveForClass(def.target, classId)) return false;
    return true;
  });
}
