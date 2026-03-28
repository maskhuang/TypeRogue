// ============================================
// 打字肉鸽 - 仪式附魔系统 (Story 41.1)
// ============================================
// 附魔获取三渠道之一：Act 2 固定仪式

import { state } from '../core/state';
import { random } from '../core/seededRandom';
import type { AffixSkillInstance } from '../data/affixes';
import { EnchantmentType as EnchantmentTypeEnum, RARITY_COLORS } from '../data/affixes';
import { PositionRelation } from '../data/keyboardTopology';
import {
  categorizeEnchantmentCandidates,
  getEnchantmentSlotCount,
  getTransmuteEligibleResources,
} from '../data/affixTrigger';
import {
  filterCategorizedByClass,
} from '../data/affixes';
import {
  getEnchantmentChoiceCount,
  getEnchantAnchorSlotBonus,
} from './relics/EnchantmentRelicBehaviors';
import { resolveRelicEffectsWithBehaviors } from './relics/RelicPipeline';
import { getEnchantmentDisplayInfo, buildAffixTooltipFields } from './shop';
import { playSound } from '../effects/sound';
import { t } from '../demo/demo-i18n';
import { eventBus } from '../core/events/EventBus';
import { RESOURCE_ICONS } from '../core/constants';

// === 配置常量（待流程调整后可由外部覆盖） ===

// Story 42.7 将重新设计仪式触发条件（Boss 后触发）
/** 仪式可进行的附魔轮数（暂定 1） */
const RITUAL_ROUNDS = 1;

// === 核心接口 ===

export interface RitualCandidate {
  enchType: EnchantmentTypeEnum;
  transmuteRes?: import('../core/types').ResourceType;
  neighborRel?: PositionRelation;
}

export interface EligibleSkill {
  skillId: string;
  affixSkill: AffixSkillInstance;
  emptySlots: number;
}

// === 查询函数（导出供测试） ===

/** 获取所有可接受附魔的技能 */
export function getEligibleSkills(): EligibleSkill[] {
  const result: EligibleSkill[] = [];
  const anchorBonus = getEnchantAnchorSlotBonus();
  for (const [skillId, affixSkill] of state.affixSkills) {
    const slotCount = getEnchantmentSlotCount(affixSkill, anchorBonus);
    const emptySlots = slotCount - affixSkill.enchantmentIds.length;
    if (emptySlots > 0) {
      result.push({ skillId, affixSkill, emptySlots });
    }
  }
  return result;
}

/** 生成附魔候选列表（复用现有 categorize 逻辑） */
export function generateRitualCandidates(affixSkill: AffixSkillInstance): RitualCandidate[] {
  const playerClass = state.classId !== 'none' ? state.classId : undefined;
  const categorized = filterCategorizedByClass(
    categorizeEnchantmentCandidates(affixSkill),
    playerClass,
  );

  const ALL_POS_RELS = Object.values(PositionRelation);
  const expanded: RitualCandidate[] = [];

  const allTypes = [...categorized.apprentice, ...categorized.quest, ...categorized.transmute, ...categorized.operator];
  for (const enchType of allTypes) {
    if ((enchType as string) === 'transmute') {
      const eligible = getTransmuteEligibleResources(affixSkill.resource, playerClass);
      if (eligible.length > 0) {
        const res = eligible[Math.floor(random() * eligible.length)];
        expanded.push({ enchType, transmuteRes: res });
      }
    } else if (enchType === EnchantmentTypeEnum.ApprenticeNeighbor) {
      const rel = affixSkill.neighborPosRel ?? ALL_POS_RELS[Math.floor(random() * ALL_POS_RELS.length)];
      expanded.push({ enchType, neighborRel: rel });
    } else {
      expanded.push({ enchType });
    }
  }

  return expanded;
}

/** 从候选中随机抽取 N 个（命运分叉遗物影响数量） */
export function pickRitualChoices(candidates: RitualCandidate[]): RitualCandidate[] {
  const maxChoices = getEnchantmentChoiceCount(); // 2, or 3 with fate_fork
  if (candidates.length <= maxChoices) return [...candidates];

  const picked: RitualCandidate[] = [];
  const pool = [...candidates];
  while (picked.length < maxChoices && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** 将附魔写入技能 */
export function applyRitualEnchantment(
  skillId: string,
  affixSkill: AffixSkillInstance,
  candidate: RitualCandidate,
): void {
  affixSkill.enchantmentIds.push(candidate.enchType);

  // Transmute：分配目标资源
  if ((candidate.enchType as string) === 'transmute' && candidate.transmuteRes) {
    affixSkill.transmuteResource = candidate.transmuteRes;
  }

  // ApprenticeNeighbor：分配位置关系
  if (candidate.enchType === EnchantmentTypeEnum.ApprenticeNeighbor && candidate.neighborRel) {
    affixSkill.neighborPosRel = candidate.neighborRel;
  }

  // 触发遗物行为
  resolveRelicEffectsWithBehaviors('on_enchantment_acquire', {
    enchantedSkillId: skillId,
    enchantmentId: candidate.enchType,
  });

  playSound('buy');

  const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
  if (info) {
    eventBus.emit('ritual:enchantment_applied', {
      skillId,
      enchantmentType: candidate.enchType,
      icon: info.icon,
      name: info.name,
    });
  }
}

/** Boss 胜利后是否应触发仪式附魔（有可附魔技能即触发） */
export function shouldShowRitual(): boolean {
  return getEligibleSkills().length > 0;
}

/** 仪式可进行的轮数 */
export function getRitualRounds(): number {
  return RITUAL_ROUNDS;
}

// === UI 渲染（独立 ritual-screen）===
// 新流程：先选技能 → 再从 2 个附魔候选中选 1 个

import { showScreen } from './battle';

let _ritualOnComplete: (() => void) | null = null;
let _remainingRounds = 0;

/**
 * 打开仪式附魔界面（独立阶段）
 * @param onComplete 仪式结束后的回调（推进到下一关）
 */
export function openRitualEnchantment(onComplete: () => void): void {
  state.phase = 'ritual';
  _ritualOnComplete = onComplete;
  _remainingRounds = getRitualRounds();
  showScreen('ritual');
  renderRitualRound();
}

/** 渲染仪式轮次：展示可附魔技能卡片供玩家选择 */
function renderRitualRound(): void {
  const eligible = getEligibleSkills();
  if (eligible.length === 0 || _remainingRounds <= 0) {
    completeRitual();
    return;
  }

  const titleEl = document.getElementById('ritual-title')!;
  const subtitleEl = document.getElementById('ritual-subtitle')!;
  const choicesEl = document.getElementById('ritual-choices')!;
  const skillSelectEl = document.getElementById('ritual-skill-select')!;
  const feedbackEl = document.getElementById('ritual-feedback-area')!;

  titleEl.textContent = t('ritual.title');
  subtitleEl.textContent = t('ritual.select_skill');
  subtitleEl.style.display = 'block';
  choicesEl.style.display = 'none';
  skillSelectEl.style.display = 'none';
  feedbackEl.style.display = 'none';

  // 使用 skill-list 区域展示技能卡片
  const promptEl = document.getElementById('ritual-skill-prompt')!;
  const listEl = document.getElementById('ritual-skill-list')!;
  promptEl.textContent = '';
  skillSelectEl.style.display = 'block';
  listEl.innerHTML = '';

  for (const { skillId, affixSkill, emptySlots } of eligible) {
    const btn = document.createElement('button');
    btn.className = 'ritual-skill-btn';

    const fields = buildAffixTooltipFields(affixSkill);
    const rarityColor = RARITY_COLORS[affixSkill.rarity] || '#fff';
    const resIcon = RESOURCE_ICONS[affixSkill.resource] || '';

    const affixHtml = fields.affixInfo
      .map(a => `<span class="ritual-skill-affix">[${a.typeName}] ${a.paramSummary}</span>`)
      .join('');

    const enchHtml = fields.enchantments
      .map(e => `<span class="ritual-skill-ench" style="color:${e.color}">${e.icon} ${e.name}</span>`)
      .join('');

    btn.innerHTML = `
      <div class="ritual-skill-header" style="color:${rarityColor}">
        <span class="ritual-skill-icon">${affixSkill.icon}</span>
        <span class="ritual-skill-name">${affixSkill.name}</span>
        <span class="ritual-skill-res">${resIcon}</span>
      </div>
      <div class="ritual-skill-affixes">${affixHtml}</div>
      ${enchHtml ? `<div class="ritual-skill-enchants">${enchHtml}</div>` : ''}
      <div class="ritual-skill-slots">${t('ritual.empty_slots', { count: emptySlots })}</div>
    `;
    btn.onclick = () => {
      showEnchantmentChoices(skillId, affixSkill);
    };
    listEl.appendChild(btn);
  }
}

/** 玩家选定技能后，展示该技能可用的 2 个附魔候选 */
function showEnchantmentChoices(skillId: string, affixSkill: AffixSkillInstance): void {
  const candidates = generateRitualCandidates(affixSkill);
  if (candidates.length === 0) {
    completeRitual();
    return;
  }

  const choices = pickRitualChoices(candidates);

  const subtitleEl = document.getElementById('ritual-subtitle')!;
  const skillSelectEl = document.getElementById('ritual-skill-select')!;
  const choicesEl = document.getElementById('ritual-choices')!;

  subtitleEl.textContent = t('ritual.subtitle');
  skillSelectEl.style.display = 'none';
  choicesEl.style.display = 'flex';
  choicesEl.innerHTML = '';

  for (const candidate of choices) {
    const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
    if (!info) continue;

    const btn = document.createElement('button');
    btn.className = 'ritual-choice-btn';
    btn.innerHTML = `
      <div class="ritual-choice-category" style="color:${info.categoryColor}">${info.category}</div>
      <span class="ritual-choice-icon">${info.icon}</span>
      <span class="ritual-choice-name">${info.name}</span>
      <div class="ritual-choice-desc">${info.desc}</div>
    `;
    btn.onclick = () => {
      applyRitualEnchantment(skillId, affixSkill, candidate);
      _remainingRounds--;

      const appliedInfo = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
      const feedbackText = appliedInfo
        ? t('ritual.applied', { icon: appliedInfo.icon, name: appliedInfo.name, skill: affixSkill.name })
        : t('ritual.applied_generic');
      showRitualFeedback(feedbackText);
    };
    choicesEl.appendChild(btn);
  }
}

function showRitualFeedback(message: string): void {
  document.getElementById('ritual-choices')!.style.display = 'none';
  document.getElementById('ritual-skill-select')!.style.display = 'none';
  document.getElementById('ritual-subtitle')!.style.display = 'none';

  const feedbackEl = document.getElementById('ritual-feedback-area')!;
  const feedbackText = document.getElementById('ritual-feedback-text')!;
  const continueBtn = document.getElementById('ritual-continue-btn')!;

  feedbackText.textContent = message;
  continueBtn.textContent = t('ritual.continue');
  feedbackEl.style.display = 'block';

  continueBtn.onclick = () => {
    if (_remainingRounds > 0 && getEligibleSkills().length > 0) {
      document.getElementById('ritual-choices')!.style.display = 'flex';
      document.getElementById('ritual-subtitle')!.style.display = 'block';
      feedbackEl.style.display = 'none';
      renderRitualRound();
    } else {
      completeRitual();
    }
  };
}

function completeRitual(): void {
  const cb = _ritualOnComplete;
  _ritualOnComplete = null;
  _remainingRounds = 0;
  if (cb) cb();
}
