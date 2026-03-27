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
import { showFeedback, setPseudoInfiniteVisual, resolveChainAnchor, performAutocomplete } from './battle';
import { getFloatScale } from '../effects/juice';
import { eventBus } from '../core/events/EventBus';
import { routeFragmentsToInventory } from './classes/FragmentQueue';
import { random } from '../core/seededRandom';
import { orchestrateAffixTrigger } from './affixTriggerOrchestrator';
import { shouldBlockMultiplierResource, getMultiplierPrismBonus } from './relics/ComboRelicBehaviors';
import { getFirstStrikeBonus, getLessIsMoreBonus, trackWordAffixTypes, resetWordAffixTypes, hasUncrownedKing, UK_GROWTH_RATE } from './relics/SkillRelicBehaviors';
import { getApprenticeGrowthMultiplier, getQuestStackIncrement } from './relics/EnchantmentRelicBehaviors';
import { getAdjacentPowerBonus, getSymmetryPactBonus, getRowMedalBonus } from './relics/TopologyRelicBehaviors';
import { getSkillKeys, getBindingState } from './bindingManager';
import { getShortSprintBonus } from './relics/WordRelicBehaviors';
import { recordResourceProduction, getResourceTideBonus, resetWordResourceAmounts } from './relics/ResourceRelicBehaviors';
import { getWarmUpBonus } from './relics/StageRelicBehaviors';
import { AffixType } from '../data/affixes';
import { inputHandler } from './typing/InputHandler';


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

// === boss_resource_tax: 追踪本词各资源产出量 ===
const _currentWordOutput: Record<string, number> = {};

/** 重置本词资源产出追踪（每词开始时调用） */
export function resetWordResourceOutput(): void {
  for (const key of Object.keys(_currentWordOutput)) {
    delete _currentWordOutput[key];
  }
}

/** 记录本词资源产出（applyResource 中调用） */
export function recordWordResourceOutput(resource: ResourceType, amount: number): void {
  _currentWordOutput[resource] = (_currentWordOutput[resource] ?? 0) + amount;
}

/** 查询本词某资源产出量（completeWord 中查询被征税资源） */
export function getWordResourceOutput(resource: string): number {
  return _currentWordOutput[resource] ?? 0;
}

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
  // Story 36.8: 同步清空资源感应追踪
  resetWordResourceAmounts();
  // boss_resource_tax: 重置本词资源产出追踪
  resetWordResourceOutput();
}

/**
 * Story 41-5: Charge 长按蓄力 — 每帧更新充能值。
 * 遍历当前 held keys → 查 bindings → 找 Charge affix → 累加 chargeAccumulated。
 */
export function updateChargeProducers(dt: number): void {
  const heldKeys = inputHandler.getHeldKeys()
  if (heldKeys.size === 0) return

  for (const [key] of heldKeys) {
    const skillId = state.player.bindings.get(key)
    if (!skillId) continue
    const skill = state.affixSkills.get(skillId)
    if (!skill) continue
    const rt = state.affixSkillStates.get(skillId)
    if (!rt) continue

    // 找 Charge affix
    const chargeAffix = skill.affixes.find(a => a.type === AffixType.Charge)
    if (!chargeAffix) continue

    const maxBonus = chargeAffix.maxBonus ?? 0
    if (rt.chargeAccumulated >= maxBonus) continue // 已满

    rt.chargeAccumulated = Math.min(
      rt.chargeAccumulated + (chargeAffix.gainPerSec ?? 0) * dt,
      maxBonus,
    )
  }
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
export function triggerSkill(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
): void {
  if (state.affixSkills.has(skillId)) {
    triggerAffixSkillWithFeedback(skillId, triggerKey, overrideAnchor);
  }
  // 未知技能：静默忽略
}

// === 词条制技能触发 + 浮字反馈 ===
function triggerAffixSkillWithFeedback(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
): void {
  const skill = state.affixSkills.get(skillId)!;

  synergy.wordSkillCount++;
  _wordHasProducerTriggered = true;

  // Story 40.8: 获取多格技能占据的所有键位
  const occupiedKeys = getSkillKeys(getBindingState(state), skillId);
  if (occupiedKeys.length === 0) occupiedKeys.push(triggerKey); // 防御性回退

  // 构建触发上下文
  const ctx = {
    triggerKey,
    occupiedKeys,
    currentWord: state.player.word,
    resources: { ...state.resources },
    classResourceProduced: { ...state.classResourceProduced },
    bindings: state.player.bindings,
    skillStates: state.affixSkillStates,
    allSkills: state.affixSkills,
    randomFn: random,
    comboCount: state.combo,
    playerClass: state.classId,
    // Story 36.5: 附魔遗物注入（避免 data→systems 依赖）
    apprenticeGrowthMultiplier: getApprenticeGrowthMultiplier(),
    questStackIncrement: getQuestStackIncrement(),
    // Story 41-3: 质变 Ligature 关卡累计按键计数
    ligatureStageCounts: state.ligatureStageCounts,
  };

  // Story 41-3: 递增当前键的关卡累计计数
  state.ligatureStageCounts.set(triggerKey, (state.ligatureStageCounts.get(triggerKey) ?? 0) + 1);

  // Story 36.3 + 36.4 + 36.6 + 36.7: 遗物加算合并（倍率棱镜 + 首发强化 + 少而精 + 拓扑系遗物 + 短词冲刺）
  let relicBonus = 0;
  const prismBonus = getMultiplierPrismBonus();
  if (prismBonus > 0) relicBonus += prismBonus;
  const firstStrikeBonus = getFirstStrikeBonus();
  if (firstStrikeBonus > 0) relicBonus += firstStrikeBonus;
  const lessIsMoreBonus = getLessIsMoreBonus();
  if (lessIsMoreBonus > 0) relicBonus += lessIsMoreBonus;
  // Story 36.6: 键盘拓扑遗物加算
  const adjacentBonus = getAdjacentPowerBonus(triggerKey);
  if (adjacentBonus > 0) relicBonus += adjacentBonus;
  const symmetryBonus = getSymmetryPactBonus(triggerKey);
  if (symmetryBonus > 0) relicBonus += symmetryBonus;
  const rowBonus = getRowMedalBonus(triggerKey);
  if (rowBonus > 0) relicBonus += rowBonus;
  // Story 36.7: 短词冲刺加算
  const shortSprintBonus = getShortSprintBonus(state.player.word.length);
  if (shortSprintBonus > 0) relicBonus += shortSprintBonus;
  // Story 36.10: 暖身操加算（前 10 秒 +40%）
  const warmUpBonus = getWarmUpBonus();
  if (warmUpBonus > 0) relicBonus += warmUpBonus;

  // Story 36.4: 无冕之王 — Lv4+ 按 Lv3 值 × 1.6^(level-3) 缩放
  const ukScale = (hasUncrownedKing() && skill.level > 3 && skill.enchantmentIds.length === 0)
    ? Math.pow(UK_GROWTH_RATE, skill.level - 3)
    : 1;

  // 记录触发前的学徒成长值，用于计算 growthDelta
  const runtimeState = state.affixSkillStates.get(skillId);
  const growthBefore = runtimeState?.apprenticeAccumulated ?? 0;

  const result = orchestrateAffixTrigger(skillId, triggerKey, ctx, {
    applyResource: (resource: ResourceType, amount: number, isMultiplyOp?: boolean) => {
      // 不灭连击：阻止 multiplier 资源产出
      if (resource === 'multiplier' && shouldBlockMultiplierResource()) return;
      // 无冕之王：Lv4+ 基础值缩放
      if (ukScale > 1) amount = amount * ukScale;
      // 遗物加算：正产出 + relicBonus%（不放大 taboo 惩罚）
      let totalBonus = relicBonus;
      // Story 36.8: 资源潮汐 — 按资源类型条件加算
      const tideBonus = getResourceTideBonus(resource);
      if (tideBonus > 0) totalBonus += tideBonus;
      if (totalBonus > 0 && amount > 0) amount = amount * (1 + totalBonus);
      // Story 36.8: 资源感应 — 追踪正产出
      if (amount > 0) recordResourceProduction(resource, amount);
      // boss_resource_tax: 追踪本词资源产出
      if (amount > 0) recordWordResourceOutput(resource, amount);

      if (isMultiplyOp) {
        // 乘算化：resource *= amount（amount 即乘数）
        if (resource === 'base') {
          synergy.skillBaseScore *= amount;
        } else if (resource === 'multiplier') {
          synergy.skillMultBonus *= amount;
        } else if (resource === 'score') {
          state.resources.score *= amount;
          state.score *= amount;
        } else {
          state.resources[resource] *= amount;
        }
      } else {
        // 普通加算
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
    // Story 41-5: Charge 质变 — 满蓄力自动完成当前单词
    chargeAutoComplete: () => performAutocomplete('charge'),
  });

  // Story 36.4: 爵士乐 — 追踪本词触发的词条类型
  trackWordAffixTypes(skill.affixes);

  // Story 37.6: 缓存链式锚点（同一 triggerKey 只调一次 resolveChainAnchor，避免 random() 不一致）
  const chainAnchorCache = new Map<string, { letterIndex?: number; fromElementId?: string }>();
  function buildAnchor(trKey: string, resource: string, amount: number): { letterIndex?: number; fromElementId?: string; resource: string; amount: number } {
    if (trKey !== triggerKey) {
      let pos = chainAnchorCache.get(trKey);
      if (!pos) { pos = resolveChainAnchor(trKey); chainAnchorCache.set(trKey, pos); }
      return pos.fromElementId
        ? { fromElementId: pos.fromElementId, resource, amount }
        : { letterIndex: pos.letterIndex, resource, amount };
    }
    const letterIdx = overrideAnchor?.letterIndex ?? state.player.index;
    return overrideAnchor?.fromElementId
      ? { fromElementId: overrideAnchor.fromElementId, resource, amount }
      : { letterIndex: letterIdx, resource, amount };
  }

  // 浮字反馈：基于每次触发的结果
  for (const tr of result.triggerResults) {
    if (!tr.phase4) continue;
    const resource = tr.phase4.targetResource;
    // 不灭连击：multiplier 资源已被阻止，跳过反馈
    if (resource === 'multiplier' && shouldBlockMultiplierResource()) continue;
    // 遗物缩放：同步缩放反馈值（无冕之王 + 加算遗物 + 资源潮汐，仅正产出）
    let amount = tr.output;
    if (ukScale > 1) amount = amount * ukScale;
    let feedbackBonus = relicBonus;
    const feedbackTide = getResourceTideBonus(resource);
    if (feedbackTide > 0) feedbackBonus += feedbackTide;
    if (feedbackBonus > 0 && amount > 0) amount = amount * (1 + feedbackBonus);
    if (amount === 0) continue;

    const color = RESOURCE_COLORS[resource] || '#ffffff';
    const label = getResourceLabel(resource);
    const displayValue = parseFloat(Math.abs(amount).toPrecision(4));
    const scale = getFloatScale(resource, amount);

    let prefix = '';
    if (tr.isCrit) prefix = '💥';
    const anchor = buildAnchor(tr.triggerKey, resource, amount);
    if (tr.isMultiplyOp) {
      showFeedback(`${prefix}×${displayValue}${label}`, color, Math.max(scale, tr.isCrit ? 2.0 : 1), anchor);
    } else if (tr.isTabooPenalty) {
      showFeedback(`-${displayValue}${label}`, '#ff4444', scale, anchor);
    } else {
      showFeedback(`${prefix}+${displayValue}${label}`, color, Math.max(scale, tr.isCrit ? 2.0 : 1), anchor);
    }
    emitResourceSound(resource, scale, 0);

    // 战后统计
    recordSkillTrigger(skillId, triggerKey, resource, amount, false);
  }

  // 衍生附魔额外资源反馈
  for (const tr of result.triggerResults) {
    if (!tr.phase5?.transmuteOutput) continue;
    const { resource: tmRes, amount: tmAmt } = tr.phase5.transmuteOutput;
    if (tmAmt === 0) continue;
    const tmColor = RESOURCE_COLORS[tmRes] || '#e67e22';
    const tmLabel = getResourceLabel(tmRes);
    const tmDisplay = parseFloat(Math.abs(tmAmt).toPrecision(3));
    const tmAnchor = buildAnchor(tr.triggerKey, tmRes, tmAmt);
    showFeedback(`🔀+${tmDisplay}${tmLabel}`, tmColor, undefined, tmAnchor);
  }

  // 事件总线通知（含附魔成长数据）
  const growthAfter = runtimeState?.apprenticeAccumulated ?? 0;
  const growthDelta = growthAfter - growthBefore;
  const questCompleted = result.triggerResults.some(tr => tr.phase5?.questCompleted);
  eventBus.emit('skill:triggered', {
    key: triggerKey,
    skillId,
    type: 'active',
    ...(growthDelta > 0 ? { growthValue: growthDelta } : {}),
    ...(questCompleted ? { questCompleted: true } : {}),
  });
}
