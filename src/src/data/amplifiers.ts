// ============================================
// 打字肉鸽 - 增幅者技能数据
// ============================================
// 36 个增幅者（6 资源 × 6 范围），统一 +N%/层 机制

import type { AmplifierDefinition, ResourceType } from '../core/types';
import { PositionRelation } from './keyboardTopology';
import { RESOURCE_LABELS, RESOURCE_ICONS } from '../core/constants';
import { random } from '../core/seededRandom';

// === 位置关系标签 ===
const RELATION_LABELS: Record<string, string> = {
  [PositionRelation.Adjacent]: '相邻',
  [PositionRelation.SameRow]: '同行',
  [PositionRelation.SameColumn]: '同列',
  [PositionRelation.SameHand]: '同手',
  [PositionRelation.SameFinger]: '同指',
  [PositionRelation.Symmetric]: '对称位',
};

const RELATION_ICONS: Record<string, string> = {
  [PositionRelation.Adjacent]: '🔗',
  [PositionRelation.SameRow]: '📡',
  [PositionRelation.SameColumn]: '📌',
  [PositionRelation.SameHand]: '🤝',
  [PositionRelation.SameFinger]: '👆',
  [PositionRelation.Symmetric]: '🪞',
};

// === 资源基础图标（用于复合图标） ===
const RESOURCE_BASE_ICONS: Record<ResourceType, string> = {
  base: '🔱', score: '🏹', multiplier: '✴️', time: '💧', gold: '💠',
  fragment: '🔤', mutagen: '🧬',
};

// === 资源 ID 缩写（用于生成 amp ID） ===
const RES_ID: Record<ResourceType, string> = {
  base: 'base', score: 'score', multiplier: 'mult', time: 'time', gold: 'gold',
  fragment: 'fragment', mutagen: 'mutagen',
};

// === 增幅者名称表（36 个唯一名称） ===
const AMP_NAMES: Record<ResourceType, Record<string, string>> = {
  base:       { [PositionRelation.Adjacent]: '铸基', [PositionRelation.SameRow]: '横基', [PositionRelation.SameColumn]: '纵基', [PositionRelation.SameHand]: '稳基', [PositionRelation.SameFinger]: '精铸', [PositionRelation.Symmetric]: '映基' },
  score:      { [PositionRelation.Adjacent]: '聚财', [PositionRelation.SameRow]: '横财', [PositionRelation.SameColumn]: '纵财', [PositionRelation.SameHand]: '稳财', [PositionRelation.SameFinger]: '精聚', [PositionRelation.Symmetric]: '映财' },
  multiplier: { [PositionRelation.Adjacent]: '激励', [PositionRelation.SameRow]: '共振', [PositionRelation.SameColumn]: '纵振', [PositionRelation.SameHand]: '合力', [PositionRelation.SameFinger]: '精振', [PositionRelation.Symmetric]: '映振' },
  time:       { [PositionRelation.Adjacent]: '滋润', [PositionRelation.SameRow]: '延续', [PositionRelation.SameColumn]: '纵延', [PositionRelation.SameHand]: '缓息', [PositionRelation.SameFinger]: '精续', [PositionRelation.Symmetric]: '映时' },
  gold:       { [PositionRelation.Adjacent]: '铸币', [PositionRelation.SameRow]: '淘金', [PositionRelation.SameColumn]: '掘金', [PositionRelation.SameHand]: '聚金', [PositionRelation.SameFinger]: '精金', [PositionRelation.Symmetric]: '映金' },
  fragment:   {},  // 造词师专属（待 Story 扩展）
  mutagen:    { [PositionRelation.Adjacent]: '诱变', [PositionRelation.SameRow]: '横变', [PositionRelation.SameColumn]: '纵变', [PositionRelation.SameHand]: '同源', [PositionRelation.SameFinger]: '精变', [PositionRelation.Symmetric]: '映变' },
};

// === 增幅值表（valuePerStack 小数）===
// 窄范围 → 高 per-stack，宽范围 → 低 per-stack。30 层参考点目标 +60%~120%
const AMP_VALUES: Record<ResourceType, Record<string, number>> = {
  base:       { [PositionRelation.Adjacent]: 0.03, [PositionRelation.SameRow]: 0.025, [PositionRelation.SameColumn]: 0.06, [PositionRelation.SameHand]: 0.02, [PositionRelation.SameFinger]: 0.06, [PositionRelation.Symmetric]: 0.12 },
  score:      { [PositionRelation.Adjacent]: 0.03, [PositionRelation.SameRow]: 0.025, [PositionRelation.SameColumn]: 0.06, [PositionRelation.SameHand]: 0.02, [PositionRelation.SameFinger]: 0.06, [PositionRelation.Symmetric]: 0.12 },
  multiplier: { [PositionRelation.Adjacent]: 0.02, [PositionRelation.SameRow]: 0.015, [PositionRelation.SameColumn]: 0.04, [PositionRelation.SameHand]: 0.01, [PositionRelation.SameFinger]: 0.04, [PositionRelation.Symmetric]: 0.08 },
  time:       { [PositionRelation.Adjacent]: 0.02, [PositionRelation.SameRow]: 0.015, [PositionRelation.SameColumn]: 0.04, [PositionRelation.SameHand]: 0.01, [PositionRelation.SameFinger]: 0.04, [PositionRelation.Symmetric]: 0.08 },
  gold:       { [PositionRelation.Adjacent]: 0.03, [PositionRelation.SameRow]: 0.025, [PositionRelation.SameColumn]: 0.06, [PositionRelation.SameHand]: 0.02, [PositionRelation.SameFinger]: 0.06, [PositionRelation.Symmetric]: 0.12 },
  fragment:   {},  // 造词师专属（待 Story 扩展）
  mutagen:    { [PositionRelation.Adjacent]: 0.03, [PositionRelation.SameRow]: 0.025, [PositionRelation.SameColumn]: 0.06, [PositionRelation.SameHand]: 0.02, [PositionRelation.SameFinger]: 0.06, [PositionRelation.Symmetric]: 0.12 },
};

// === 生成描述字符串 ===
function buildDesc(resource: ResourceType, relation: PositionRelation, pct: number): string {
  const relIcon = RELATION_ICONS[relation] || '';
  const relLabel = RELATION_LABELS[relation] || relation;
  const resIcon = RESOURCE_ICONS[resource] || '';
  const resLabel = RESOURCE_LABELS[resource] || resource;
  return `触发时+1层：每个${relIcon}${relLabel}技能${resIcon}${resLabel}+${pct}%/层`;
}

// === 程序化生成 36 个增幅者 ===
const ALL_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold', 'mutagen'];
const ALL_RELATIONS: PositionRelation[] = [
  PositionRelation.Adjacent, PositionRelation.SameRow, PositionRelation.SameColumn,
  PositionRelation.SameHand, PositionRelation.SameFinger, PositionRelation.Symmetric,
];

function generateAmplifiers(): Record<string, AmplifierDefinition> {
  const result: Record<string, AmplifierDefinition> = {};
  for (const res of ALL_RESOURCES) {
    for (const rel of ALL_RELATIONS) {
      const id = `amp_${RES_ID[res]}_${rel}`;
      const valuePerStack = AMP_VALUES[res][rel];
      const pct = parseFloat((valuePerStack * 100).toPrecision(4));
      result[id] = {
        id,
        name: AMP_NAMES[res][rel],
        icon: `${RESOURCE_BASE_ICONS[res]}${RELATION_ICONS[rel]}`,
        resource: res,
        positionRelation: rel,
        valuePerStack,
        desc: buildDesc(res, rel, pct),
      };
    }
  }
  return result;
}

export const AMPLIFIERS: Record<string, AmplifierDefinition> = generateAmplifiers();

// === 工具函数 ===

/** 检查 ID 是否为增幅者 */
export function isAmplifier(id: string): boolean {
  return id in AMPLIFIERS;
}

/** 每局 run 从增幅者池中随机抽取指定数量 */
export function drawAmplifierPool(count = 15): string[] {
  const all = Object.keys(AMPLIFIERS);
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 获取增幅者在指定等级的每层增幅值：Lv1=×1.0, Lv2=×1.5, Lv3=×2.0 */
export function getAmplifierValue(id: string, level: number): number {
  const amp = AMPLIFIERS[id];
  if (!amp) return 0;
  const growthFactors = [1.0, 1.5, 2.0];
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return amp.valuePerStack * growthFactors[idx];
}

/** 生成等级相关的增幅者描述 */
export function getAmplifierDesc(id: string, level?: number): string {
  const amp = AMPLIFIERS[id];
  if (!amp) return '';
  if (level == null) return amp.desc;
  const value = getAmplifierValue(id, level);
  const relIcon = RELATION_ICONS[amp.positionRelation] || '';
  const relLabel = RELATION_LABELS[amp.positionRelation] || amp.positionRelation;
  const resIcon = RESOURCE_ICONS[amp.resource] || '';
  const resLabel = RESOURCE_LABELS[amp.resource] || amp.resource;
  const pct = parseFloat((value * 100).toPrecision(4));
  return `触发时+1层：每个${relIcon}${relLabel}技能${resIcon}${resLabel}+${pct}%/层`;
}
