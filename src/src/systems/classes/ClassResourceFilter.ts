// ============================================
// 打字肉鸽 - 职业资源条件过滤
// ============================================
// Story 32.2 Task 5: 过滤非当前职业的职业资源相关技能

import type { ResourceType, ClassId } from '../../core/types';

/** 职业资源 → 所需职业 ID 映射 */
const CLASS_RESOURCE_MAP: Partial<Record<ResourceType, ClassId>> = {
  energy: 'wordsmith',
  mutagen: 'metamorph',
};

/** 所有职业资源类型 */
const CLASS_RESOURCES: ResourceType[] = ['energy', 'mutagen'];

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
