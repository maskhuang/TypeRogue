// ============================================
// Affix / Resource 3-letter abbreviation lookup
// 用于 LIST 等紧凑显示场景；INFO 等详情场景仍用全名。
// 若添加新词条/资源，请在此处补充缩写以避免 fallback 撞码。
// ============================================

import type { ResourceType } from '../core/types';
// Story 60.15: locale-aware abbreviation
import { getLocale, t } from '../demo/demo-i18n';

/** 词条 type → 3 字母缩写 */
const AFFIX_ABBR: Record<string, string> = {
  // 数值型
  convert: 'CVT', rainbow: 'RBW', multiply: 'MLY',
  // 暴击型
  crit: 'CRT', charge: 'CHG', decay: 'DCY', recurse: 'REC', taboo: 'TAB', fallacy: 'FAL',
  // 叠层型
  amplify: 'AMP', splash: 'SPS', resonance: 'RSN', echo: 'ECO', fury: 'FRY', tide: 'TID', war_drum: 'WDR',
  // 拓扑型
  void: 'VOI', swarm: 'SWM', mercenary: 'MRC', mirror: 'MIR', cascade: 'CAS',
  flow: 'FLW', confluence: 'CFL', union: 'UNI',
  // 词感型
  outcast: 'OUT', gravity: 'GRV', ligature: 'LIG',
  // 元规则型
  relay: 'RLY', conduit: 'CDT', twin: 'TWN', innate: 'INN', exhaust: 'EXH',
  reflect: 'RFL', monkey_patch: 'MPT', excavate: 'EXC', treasure: 'TRE', refine: 'RFN',
  evolve: 'EVL', harvest: 'HVT', chain: 'CHN', volatile: 'VOL', mutacrit: 'MCT',
  ascend: 'ASC', reecho: 'REE', myopia: 'MYP', aura_fury: 'AFR', aura_morale: 'AMR',
  fiber: 'FBR', silkworm: 'SLK', repulsion: 'RPL',
  // 造词师专属：词内时序型
  handoff: 'HOF', rewind: 'RWD', endow: 'END', proofread: 'PRF', spelling: 'SPL',
  first_edition: 'FED', reprint: 'RPT', matrix: 'MTX', typeset: 'TYS',
  // i18n-only / 历史 / 通用
  pulse: 'PLS', apprentice: 'APR', base: 'BSE',
  // i18n 列表里出现但未在 enum 的（防止 unknown fallback）
  bigram: 'BGM', cluster: 'CLU', coverage: 'COV',
  counter: 'CTR', cipher: 'CPR', pattern: 'PTN', leverage: 'LVG', option: 'OPT', hedge: 'HDG',
  burst: 'BST', zero_in: 'ZRO', sharpshooter: 'SHR', overflow: 'OVF',
  bridge: 'BRG', clique: 'CLQ', component: 'CPN',
  decorator: 'DCR', ethereal: 'ETH',
  parity: 'PAR', prime: 'PRM', match: 'MCH', entropy: 'ENT',
  phase_shift: 'PSH', endo_exo: 'EEX', fusion: 'FSN', turbulence: 'TRB',
};

/** 资源 type → 3 字母缩写 */
const RESOURCE_ABBR: Record<ResourceType, string> = {
  base: 'BSE',
  score: 'SCR',
  multiplier: 'MUL',
  time: 'TIM',
  gold: 'GLD',
  energy: 'NRG',
  mutagen: 'MTG',
};

/** Fallback：未登记的 type 取前 3 字母大写（去掉 _） */
function fallbackAbbr(type: string): string {
  const cleaned = type.replace(/_/g, '');
  return cleaned.slice(0, 3).toUpperCase().padEnd(3, '·');
}

/**
 * 紧凑场景的 affix 显示名：
 *   zh → t('affix.X') = 中文 2 字 arcade 名（变换 / 暴击 / ...）
 *   en → 3 字母 AFFIX_ABBR arcade code（CVT / CRT / SWM ...）
 */
export function abbreviateAffix(type: string): string {
  if (getLocale() === 'zh') {
    const i18nKey = 'affix.' + type;
    const fullName = t(i18nKey);
    if (fullName !== i18nKey) return fullName;
    return AFFIX_ABBR[type] ?? fallbackAbbr(type);
  }
  return AFFIX_ABBR[type] ?? fallbackAbbr(type);
}

/**
 * 描述/参数中引用其他 affix 类型时的格式化器。
 *   zh → t('affix.X') 2 字 arcade 名（"佣金"）
 *   en → t('affix.X') arcade English 全名（"Mercenary"）
 */
export function formatAffixRef(type: string): string {
  const i18nKey = 'affix.' + type;
  const fullName = t(i18nKey);
  if (fullName === i18nKey) return type;
  return fullName;
}

export function abbreviateResource(type: ResourceType | string | undefined): string {
  if (!type) return '???';
  if (getLocale() === 'zh') {
    const i18nKey = 'resource.' + type;
    const fullName = t(i18nKey);
    if (fullName !== i18nKey) return fullName;
  }
  return RESOURCE_ABBR[type as ResourceType] ?? fallbackAbbr(type);
}

/** 组装一个技能的简写显示名：affix1·affix2·...·resource */
export function abbreviateSkillName(affixTypes: string[], resource?: ResourceType | string): string {
  const parts = affixTypes.map(abbreviateAffix);
  if (resource) parts.push(abbreviateResource(resource));
  return parts.join('·');
}
