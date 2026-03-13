// ============================================
// 打字肉鸽 - 技能系统（词条制）
// ============================================
// Epic 35 清理：仅保留词条制技能触发逻辑

import { state, synergy } from '../core/state';
import { RESOURCE_COLORS } from '../core/constants';
import type { ResourceType, PseudoInfiniteState } from '../core/types';
import { t } from '../demo/demo-i18n';
import { getElements } from '../ui/elements';
import { playSound, emitResourceSound } from '../effects/sound';
import { showFeedback, setPseudoInfiniteVisual } from './battle';
import { getFloatScale } from '../effects/juice';
import { eventBus } from '../core/events/EventBus';
import { routeFragmentsToInventory } from './classes/FragmentQueue';
import { random } from '../core/seededRandom';
import { orchestrateAffixTrigger } from './affixTriggerOrchestrator';
import { shouldBlockMultiplierResource, getMultiplierPrismBonus } from './relics/ComboRelicBehaviors';
import { getFirstStrikeBonus, getLessIsMoreBonus, trackWordAffixTypes, resetWordAffixTypes, hasUncrownedKing, UK_GROWTH_RATE } from './relics/SkillRelicBehaviors';


// === 战后统计：记录技能触发 ===
const EMPTY_RESOURCES = { base: 0, score: 0, multiplier: 0, time: 0, gold: 0, fragment: 0, mutagen: 0 };

function recordSkillTrigger(
  skillId: string,
  triggerKey: string | undefined,
  resource: ResourceType,
  delta: number,
  isChain: boolean,
): void {
  const bs = state.battleStats;
  if (!bs || !triggerKey) return;
  // key stats
  let ks = bs.keyStats.get(triggerKey);
  if (!ks) { ks = { triggerCount: 0, resources: { ...EMPTY_RESOURCES } }; bs.keyStats.set(triggerKey, ks); }
  ks.triggerCount++;
  ks.resources[resource] += Math.abs(delta);
  // skill stats
  let ss = bs.skillStats.get(skillId);
  if (!ss) { ss = { triggerCount: 0, resources: { ...EMPTY_RESOURCES }, chainTriggered: 0 }; bs.skillStats.set(skillId, ss); }
  ss.triggerCount++;
  ss.resources[resource] += Math.abs(delta);
  if (isChain) {
    ss.chainTriggered++;
    bs.totalChainTriggers++;
  }
  // T1 遗物：追踪本词产出的资源种类
  if (Math.abs(delta) > 0) {
    _wordResourceTypes.add(resource);
  }
}

// T1 遗物支持：追踪本词已产出的不同资源种类
const _wordResourceTypes = new Set<string>();
// T1 遗物支持：本词是否有产出者触发过（熔炉之心使用）
let _wordHasProducerTriggered = false;

/** 获取本词已产出的资源种类数 */
export function getWordResourceTypeCount(): number {
  return _wordResourceTypes.size;
}

/** 本词是否有产出者触发过 */
export function hasProducerTriggeredThisWord(): boolean {
  return _wordHasProducerTriggered;
}

/** 重置词级追踪（每词开始时调用） */
export function resetWordResourceTypes(): void {
  _wordResourceTypes.clear();
  _wordHasProducerTriggered = false;
  resetWordAffixTypes();
}

/** 蓄力产出者：每帧更新蓄力值（旧系统已移除，保留空实现供 battle.ts 调用） */
export function updateChargeProducers(_dt: number): void {
  // no-op: 旧产出者系统已移除
}

// === 技能键命中率计算 ===
export function computeSkillDensity(word: string): number {
  if (!word || word.length === 0) return 0
  const w = word.toLowerCase()
  let hits = 0
  for (const ch of w) {
    if (state.player.bindings.has(ch)) hits++
  }
  return hits / w.length
}


// === 资源标签 ===
function getResourceLabel(r: ResourceType): string {
  return t(`unit.${r}`);
}

// === 连接者：进入伪无限模式 ===
export function enterPseudoInfinite(participantKeys: string[]): void {
  // 已有伪无限运行中则合并参与者
  if (state.pseudoInfiniteState) {
    for (const k of participantKeys) {
      if (!state.pseudoInfiniteState.participantKeys.includes(k)) {
        state.pseudoInfiniteState.participantKeys.push(k);
      }
    }
    return;
  }

  const piState: PseudoInfiniteState = { intervalId: 0, participantKeys: [...participantKeys] };
  state.pseudoInfiniteState = piState;
  setPseudoInfiniteVisual(true);

  const intervalId = setInterval(() => {
    if (state.phase !== 'battle') {
      clearPseudoInfinite();
      return;
    }
    const keys = state.pseudoInfiniteState?.participantKeys ?? [];
    for (const key of keys) {
      const sid = state.player.bindings.get(key);
      if (!sid) continue;
      if (state.affixSkills.has(sid)) {
        triggerSkill(sid, key);
      }
    }
  }, 250);

  piState.intervalId = intervalId as unknown as number;
}

// === 连接者：清理伪无限模式 ===
export function clearPseudoInfinite(): void {
  if (state.pseudoInfiniteState) {
    clearInterval(state.pseudoInfiniteState.intervalId);
    state.pseudoInfiniteState = null;
    setPseudoInfiniteVisual(false);
  }
}

// === 触发技能（词条制） ===
export function triggerSkill(skillId: string, triggerKey: string, _chainHistory?: string[]): void {
  if (state.affixSkills.has(skillId)) {
    triggerAffixSkillWithFeedback(skillId, triggerKey);
  }
  // 未知技能：静默忽略
}

// === 词条制技能触发 + 浮字反馈 ===
function triggerAffixSkillWithFeedback(skillId: string, triggerKey: string): void {
  const skill = state.affixSkills.get(skillId)!;

  synergy.wordSkillCount++;
  _wordHasProducerTriggered = true;

  // 构建触发上下文
  const ctx = {
    triggerKey,
    currentWord: state.player.word,
    resources: { ...state.resources },
    classResourceProduced: { ...state.classResourceProduced },
    bindings: state.player.bindings,
    skillStates: state.affixSkillStates,
    allSkills: state.affixSkills,
    randomFn: random,
    comboCount: state.combo,
    playerClass: state.classId,
  };

  // Story 36.3 + 36.4: 遗物加算合并（倍率棱镜 + 首发强化 + 少而精）
  let relicBonus = 0;
  const prismBonus = getMultiplierPrismBonus();
  if (prismBonus > 0) relicBonus += prismBonus;
  const firstStrikeBonus = getFirstStrikeBonus();
  if (firstStrikeBonus > 0) relicBonus += firstStrikeBonus;
  const lessIsMoreBonus = getLessIsMoreBonus();
  if (lessIsMoreBonus > 0) relicBonus += lessIsMoreBonus;

  // Story 36.4: 无冕之王 — Lv4+ 按 Lv3 值 × 1.6^(level-3) 缩放
  const ukScale = (hasUncrownedKing() && skill.level > 3 && skill.enchantmentIds.length === 0)
    ? Math.pow(UK_GROWTH_RATE, skill.level - 3)
    : 1;

  const result = orchestrateAffixTrigger(skillId, triggerKey, ctx, {
    applyResource: (resource: ResourceType, amount: number) => {
      // 不灭连击：阻止 multiplier 资源产出
      if (resource === 'multiplier' && shouldBlockMultiplierResource()) return;
      // 无冕之王：Lv4+ 基础值缩放
      if (ukScale > 1) amount = amount * ukScale;
      // 遗物加算：正产出 + relicBonus%（不放大 taboo 惩罚）
      if (relicBonus > 0 && amount > 0) amount = amount * (1 + relicBonus);

      if (resource === 'base') {
        synergy.skillBaseScore += amount;
      } else if (resource === 'multiplier') {
        synergy.skillMultBonus += amount;
      } else if (resource === 'score') {
        state.resources.score += amount;
        state.score += amount;
      } else {
        state.resources[resource] += amount;
      }
      if (resource === 'fragment') {
        routeFragmentsToInventory(Math.abs(amount));
      } else if (resource === 'mutagen') {
        state.classResourceProduced.mutagen = (state.classResourceProduced.mutagen ?? 0) + Math.abs(amount);
        state.mutagenInventory += Math.abs(amount);
      }
    },
    showFeedback: (text: string, color: string) => showFeedback(text, color),
    playSound: (type: string) => playSound(type),
    enterPseudoInfinite: (_keys: string[]) => setPseudoInfiniteVisual(true),
  });

  // Story 36.4: 爵士乐 — 追踪本词触发的词条类型
  trackWordAffixTypes(skill.affixes);

  // 浮字反馈：基于每次触发的结果
  for (const tr of result.triggerResults) {
    if (!tr.phase4) continue;
    const resource = tr.phase4.targetResource;
    // 不灭连击：multiplier 资源已被阻止，跳过反馈
    if (resource === 'multiplier' && shouldBlockMultiplierResource()) continue;
    // 遗物缩放：同步缩放反馈值（无冕之王 + 加算遗物，仅正产出）
    let amount = tr.output;
    if (ukScale > 1) amount = amount * ukScale;
    if (relicBonus > 0 && amount > 0) amount = amount * (1 + relicBonus);
    if (amount === 0) continue;

    const color = RESOURCE_COLORS[resource] || '#ffffff';
    const label = getResourceLabel(resource);
    const displayValue = parseFloat(Math.abs(amount).toPrecision(4));
    const scale = getFloatScale(resource, amount);

    let prefix = '';
    if (tr.isCrit) prefix = '💥';
    if (tr.isTabooPenalty) {
      showFeedback(`-${displayValue}${label}`, '#ff4444', scale);
    } else {
      showFeedback(`${prefix}+${displayValue}${label}`, color, Math.max(scale, tr.isCrit ? 2.0 : 1));
    }
    emitResourceSound(resource, scale, 0);

    // 战后统计
    recordSkillTrigger(skillId, triggerKey, resource, amount, false);
  }

  // 技能触发弹窗
  const el = getElements();
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup';
  if (result.triggerResults.some(r => r.isCrit)) p.classList.add('crit-trigger');
  p.innerHTML = `<span class="trigger-icon">${skill.icon}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);

  // 事件总线通知
  eventBus.emit('skill:triggered', {
    key: triggerKey,
    skillId,
    type: 'active',
  });
}
