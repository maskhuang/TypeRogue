// ============================================
// 打字肉鸽 - 仪式附魔系统 (Story 41.1)
// ============================================
// 附魔获取三渠道之一：Act 2 固定仪式

import { state } from '../core/state';
import { random } from '../core/seededRandom';
import type { AffixSkillInstance } from '../data/affixes';
import { EnchantmentType as EnchantmentTypeEnum } from '../data/affixes';
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
import { getEnchantmentDisplayInfo } from './shop';
import { playSound } from '../effects/sound';
import { t } from '../demo/demo-i18n';
import { eventBus } from '../core/events/EventBus';
import { getActForNode } from './stage/stageFlow';

// === 配置常量（待流程调整后可由外部覆盖） ===

/** 仪式触发的 Act（默认 Act 2） */
const RITUAL_ACT = 2;
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

/** 是否应在当前节点后触发仪式附魔 */
export function shouldShowRitual(currentNodeId: number): boolean {
  // 仪式在 Act 1 最后的休息关（node 4）完成后触发
  const nextNode = currentNodeId + 1;
  const nextAct = getActForNode(nextNode);
  const currentAct = getActForNode(currentNodeId);
  // 从 Act 1 → Act 2 的转折点
  if (currentAct < RITUAL_ACT && nextAct >= RITUAL_ACT) {
    return getEligibleSkills().length > 0;
  }
  return false;
}

/** 仪式可进行的轮数 */
export function getRitualRounds(): number {
  return RITUAL_ROUNDS;
}

// === UI 渲染 ===

let _ritualOnComplete: (() => void) | null = null;
let _remainingRounds = 0;

/**
 * 打开仪式附魔界面
 * @param onComplete 仪式结束后的回调（推进到下一关）
 */
export function openRitualEnchantment(onComplete: () => void): void {
  _ritualOnComplete = onComplete;
  _remainingRounds = getRitualRounds();
  renderRitualRound();
}

function renderRitualRound(): void {
  const eligible = getEligibleSkills();
  if (eligible.length === 0 || _remainingRounds <= 0) {
    completeRitual();
    return;
  }

  // 为第一个有候选的技能生成候选（仪式：玩家先选附魔，再选技能）
  // 合并所有可附魔技能的候选池
  const allCandidates: RitualCandidate[] = [];
  const seenTypes = new Set<string>();
  for (const { affixSkill } of eligible) {
    for (const c of generateRitualCandidates(affixSkill)) {
      const key = `${c.enchType}:${c.transmuteRes ?? ''}:${c.neighborRel ?? ''}`;
      if (!seenTypes.has(key)) {
        seenTypes.add(key);
        allCandidates.push(c);
      }
    }
  }

  if (allCandidates.length === 0) {
    completeRitual();
    return;
  }

  const choices = pickRitualChoices(allCandidates);
  showRitualChoiceUI(choices, eligible);
}

function showRitualChoiceUI(choices: RitualCandidate[], eligible: EligibleSkill[]): void {
  // 创建或获取仪式 modal
  let modal = document.getElementById('ritual-enchantment-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ritual-enchantment-modal';
    modal.className = 'ritual-enchantment-overlay';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="ritual-enchantment-panel">
      <h2 class="ritual-title">${t('ritual.title')}</h2>
      <p class="ritual-subtitle">${t('ritual.subtitle')}</p>
      <div id="ritual-choices" class="ritual-choices"></div>
      <div id="ritual-skill-select" class="ritual-skill-select" style="display:none">
        <p class="ritual-skill-prompt">${t('ritual.select_skill')}</p>
        <div id="ritual-skill-list" class="ritual-skill-list"></div>
      </div>
    </div>
  `;

  const choicesEl = document.getElementById('ritual-choices')!;

  // 渲染附魔候选
  for (const candidate of choices) {
    const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
    if (!info) continue;

    const btn = document.createElement('button');
    btn.className = 'ritual-choice-btn';
    btn.innerHTML = `<span class="ritual-choice-icon">${info.icon}</span><span class="ritual-choice-name">${info.name}</span>`;
    btn.onclick = () => {
      // 高亮选中
      choicesEl.querySelectorAll('.ritual-choice-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      // 显示技能选择
      showRitualSkillSelect(candidate, eligible);
    };
    choicesEl.appendChild(btn);
  }
}

function showRitualSkillSelect(candidate: RitualCandidate, eligible: EligibleSkill[]): void {
  const selectEl = document.getElementById('ritual-skill-select')!;
  const listEl = document.getElementById('ritual-skill-list')!;
  selectEl.style.display = 'block';
  listEl.innerHTML = '';

  // 过滤：只显示对该附魔类型有效的技能（能接受该附魔的技能）
  for (const { skillId, affixSkill } of eligible) {
    const btn = document.createElement('button');
    btn.className = 'ritual-skill-btn';
    btn.innerHTML = `<span class="ritual-skill-icon">${affixSkill.icon}</span><span class="ritual-skill-name">${affixSkill.name}</span>`;
    btn.onclick = () => {
      applyRitualEnchantment(skillId, affixSkill, candidate);
      _remainingRounds--;

      const info = getEnchantmentDisplayInfo(candidate.enchType, candidate.transmuteRes, candidate.neighborRel);
      const feedbackText = info
        ? t('ritual.applied', { icon: info.icon, name: info.name, skill: affixSkill.name })
        : t('ritual.applied_generic');
      showRitualFeedback(feedbackText);
    };
    listEl.appendChild(btn);
  }
}

function showRitualFeedback(message: string): void {
  const modal = document.getElementById('ritual-enchantment-modal');
  if (!modal) return;

  const panel = modal.querySelector('.ritual-enchantment-panel');
  if (!panel) return;

  panel.innerHTML = `
    <h2 class="ritual-title">${t('ritual.title')}</h2>
    <p class="ritual-feedback">${message}</p>
    <button id="ritual-continue-btn" class="ritual-continue-btn">${t('ritual.continue')}</button>
  `;

  document.getElementById('ritual-continue-btn')!.onclick = () => {
    if (_remainingRounds > 0 && getEligibleSkills().length > 0) {
      renderRitualRound();
    } else {
      completeRitual();
    }
  };
}

function completeRitual(): void {
  const modal = document.getElementById('ritual-enchantment-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.innerHTML = '';
  }

  const cb = _ritualOnComplete;
  _ritualOnComplete = null;
  _remainingRounds = 0;
  if (cb) cb();
}
