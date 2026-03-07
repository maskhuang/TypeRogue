// ============================================
// 打字肉鸽 - 技能系统
// ============================================
// Story 11.5: Modifier 管道集成

import { state, synergy } from '../core/state';
import { RESOURCE_COLORS } from '../core/constants';
import { getSkillDisplayInfo } from '../data/skills';
import { PRODUCERS, isProducer, getProducerValue } from '../data/producers';
import { CONVERTERS, isConverter, getConverterK, getSourceValue, getConverterDesc } from '../data/converters';
import { CONNECTORS, isConnector, getConnectorDesc } from '../data/connectors';
import { AMPLIFIERS, isAmplifier, getAmplifierValue } from '../data/amplifiers';
import { ENCHANTMENTS } from '../data/enchantments';
import { hasRelation, getKeysWithRelation } from '../data/keyboardTopology';
import type { ResourceType, PseudoInfiniteState } from '../core/types';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { showFeedback, updateHUD, setPseudoInfiniteVisual } from './battle';
import { resolveRelicSkillTrigger } from './relics/RelicPipeline';
import { eventBus } from '../core/events/EventBus';


// === 战后统计：记录技能触发 ===
const EMPTY_RESOURCES = { base: 0, score: 0, multiplier: 0, time: 0, gold: 0 };

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

// 模块级：当前触发是否来自链式（由 triggerSkill 设置，triggerProducer/Converter 读取）
let _isChainTrigger = false;

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
}

/** 计算当前所有增幅者中的最大叠层数 */
function getMaxAmplifierStacks(): number {
  let max = 0;
  for (const stacks of state.amplifierStacks.values()) {
    if (stacks > max) max = stacks;
  }
  return max;
}

/** 计算已装备的产出者数量 */
function getEquippedProducerCount(): number {
  let count = 0;
  for (const skillId of state.player.bindings.values()) {
    if (isProducer(skillId)) count++;
  }
  return count;
}

// T5 遗物支持：当前触发技能的键位
let _currentTriggerKey: string | undefined;

/** 获取技能触发时的遗物倍率（on_skill_trigger 遗物：glass_cannon, forge_heart 等） */
function getRelicSkillMultiplier(category: string): number {
  return resolveRelicSkillTrigger({
    currentSkillCategory: category,
    isChainedTrigger: _isChainTrigger,
    amplifierMaxStacks: getMaxAmplifierStacks(),
    equippedProducerCount: getEquippedProducerCount(),
    wordHasProducerTriggered: _wordHasProducerTriggered,
    currentSkillKey: _currentTriggerKey,
  }, {
    onTimeSteal: (bonus) => {
      state.time += bonus;
    },
  });
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
  switch (r) {
    case 'base': return '基数';
    case 'score': return '分';
    case 'multiplier': return '倍率';
    case 'time': return '秒';
    case 'shield': return '盾';
    case 'gold': return '币';
  }
}

// === 附魔：计算成长/排斥倍率 ===
export function getEnchantmentMultiplier(skillId: string, triggerKey?: string): number {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return 1;
  const ench = ENCHANTMENTS[enchId];
  if (!ench) return 1;

  // 成长型 / 精通型：返回累积的成长值作为倍率（共享 growthValues 存储）
  if (ench.spatialType === 'growth' || ench.id === 'ench_mastery') {
    const accumulated = state.growthValues.get(skillId) || 0;
    return 1 + accumulated;
  }

  // 吞噬型：每个图标 +20%
  if (ench.spatialType === 'devour') {
    return 1 + getIconCount(skillId) * ench.effectValue;
  }

  if (ench.spatialType === 'repulsion' && triggerKey && ench.positionRelation) {
    const related = getKeysWithRelation(triggerKey, ench.positionRelation);
    const emptyCount = related.filter(k => !state.player.bindings.has(k)).length;
    return 1 + emptyCount * ench.effectValue;
  }
  return 1;
}

// === 附魔：成长型 — 邻居触发时累积成长值 ===
let _growthActive = false;

export function checkGrowthAccumulation(triggerKey: string): void {
  if (!triggerKey || _growthActive) return;
  _growthActive = true;

  try {
    for (const [skillId, enchId] of state.player.enchantedSkills) {
      const ench = ENCHANTMENTS[enchId];
      if (!ench || ench.spatialType !== 'growth' || !ench.positionRelation) continue;

      // 反查该技能绑定的键位
      for (const [boundKey, boundSkillId] of state.player.bindings) {
        if (boundSkillId !== skillId) continue;
        if (triggerKey === boundKey) continue; // 排除自身触发
        if (!hasRelation(triggerKey, boundKey, ench.positionRelation)) continue;

        const current = state.growthValues.get(skillId) || 0;
        const newVal = current + ench.effectValue;
        state.growthValues.set(skillId, newVal);
        eventBus.emit('skill:triggered', { key: boundKey, skillId, type: 'passive', growthValue: newVal });
      }
    }
  } finally {
    _growthActive = false;
  }
}

// === 附魔：精通型 — 自身触发时累积计数，每 10 次永久成长 ===
export function checkMasteryAccumulation(skillId: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (enchId !== 'ench_mastery') return;

  const ench = ENCHANTMENTS[enchId];
  if (!ench) return;

  const current = state.masteryCounters.get(skillId) || 0;
  const newCount = current + 1;
  state.masteryCounters.set(skillId, newCount);

  // 每 10 次触发 → 永久成长 +8%
  if (newCount % 10 === 0) {
    const currentGrowth = state.growthValues.get(skillId) || 0;
    const newVal = currentGrowth + ench.effectValue;
    state.growthValues.set(skillId, newVal);
    // 通知键盘可视化更新成长显示
    const boundKey = [...state.player.bindings.entries()].find(([, id]) => id === skillId)?.[0];
    if (boundKey) {
      eventBus.emit('skill:triggered', { key: boundKey, skillId, type: 'passive', growthValue: newVal });
    }
  }
}

// === 附魔：吞噬型 — 图标计数 + 战斗内累积触发 + 吞噬弱邻居 ===
const DEVOUR_TRIGGER_THRESHOLD = 5;

export function getIconCount(skillId: string): number {
  let count = 1; // 技能本身 = 1 图标
  if (state.player.enchantedSkills.has(skillId)) count += 1; // 附魔 = +1
  const devoured = state.devourIcons.get(skillId);
  if (devoured) count += devoured.length; // 每吞噬 = +1
  return count;
}

export function checkDevourAccumulation(skillId: string, triggerKey?: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return;
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.spatialType !== 'devour') return;

  // 自增 per-battle 计数
  const current = state.devourCounters.get(skillId) || 0;
  const newCount = current + 1;
  state.devourCounters.set(skillId, newCount);

  // 每 DEVOUR_TRIGGER_THRESHOLD 次触发 → 检查吞噬
  if (newCount % DEVOUR_TRIGGER_THRESHOLD !== 0) return;

  // 反查吞噬者的绑定键位
  let devourerKey: string | undefined;
  for (const [bk, bId] of state.player.bindings) {
    if (bId === skillId) { devourerKey = bk; break; }
  }
  if (!devourerKey) return;

  // 通过 positionRelation 获取范围内所有键位
  const candidateKeys = getKeysWithRelation(devourerKey, ench.positionRelation!);
  if (candidateKeys.length === 0) return;

  const myIconCount = getIconCount(skillId);

  // 找到范围内图标数最少的弱技能
  let weakestKey: string | undefined;
  let weakestSkillId: string | undefined;
  let weakestCount = Infinity;

  for (const ck of candidateKeys) {
    const cSkillId = state.player.bindings.get(ck);
    if (!cSkillId || cSkillId === skillId) continue;
    const cCount = getIconCount(cSkillId);
    if (cCount < myIconCount && cCount < weakestCount) {
      weakestCount = cCount;
      weakestKey = ck;
      weakestSkillId = cSkillId;
    }
  }

  if (weakestKey && weakestSkillId) {
    executeDevour(skillId, weakestSkillId, weakestKey);
  }
}

function executeDevour(devourSkillId: string, targetSkillId: string, targetKey: string): void {
  // 获取目标技能的原始图标（不传 enchantedSkills → 返回原始技能图标）
  const targetInfo = getSkillDisplayInfo(targetSkillId);
  const targetIcon = targetInfo.icon;

  // 添加图标到吞噬者
  const icons = state.devourIcons.get(devourSkillId) || [];
  icons.push(targetIcon);
  state.devourIcons.set(devourSkillId, icons);

  // 永久移除目标（本局内）
  state.player.bindings.delete(targetKey);
  state.player.skills.delete(targetSkillId);
  state.player.enchantedSkills.delete(targetSkillId);

  // 反馈
  showFeedback(`🦷 吞噬! ${targetIcon}`, '#e74c3c');
  playSound('skill');
}

// === 增幅者加成计算 ===
export function getAmplifierBonus(
  skillId: string,
  triggerKey: string | undefined,
  targetResource: ResourceType,
): { addBonus: number; mulBonus: number } {
  if (!triggerKey) return { addBonus: 0, mulBonus: 1 };

  let percentBonus = 0;

  for (const [ampKey, boundId] of state.player.bindings) {
    if (!isAmplifier(boundId)) continue;
    const amp = AMPLIFIERS[boundId];
    if (!amp) continue;
    if (!hasRelation(triggerKey, ampKey, amp.positionRelation)) continue;
    const stacks = state.amplifierStacks.get(boundId) || 0;
    if (stacks === 0) continue;
    const level = state.player.skills.get(boundId)?.level || 1;
    const valuePerStack = getAmplifierValue(boundId, level);

    // 资源匹配：主资源 OR 变性附魔的 extraResource
    let efficiency = 0;
    if (amp.resource === targetResource) {
      efficiency = 1; // 主资源：100% 效率
    } else {
      const enchId = state.player.enchantedSkills?.get(boundId);
      if (enchId) {
        const ench = ENCHANTMENTS[enchId];
        if (ench?.category === 'transmutation' && ench.extraResource === targetResource) {
          efficiency = ench.effectValue; // 如 0.3 = 30% 效率
        }
      }
    }
    if (efficiency === 0) continue;

    // 统一百分比加算（类似成长附魔的加性叠加）
    percentBonus += stacks * valuePerStack * efficiency;
  }
  return { addBonus: 0, mulBonus: 1 + percentBonus };
}

// === 触发产出者（绕过 Modifier 管道） ===
export function triggerProducer(producerId: string, triggerKey?: string): void {
  const prod = PRODUCERS[producerId];
  if (!prod) return;
  _currentTriggerKey = triggerKey;
  _wordHasProducerTriggered = true;
  const level = state.player.skills.get(producerId)?.level || 1;
  const baseValue = getProducerValue(producerId, level);
  const enchMult = getEnchantmentMultiplier(producerId, triggerKey);
  const ampBonus = getAmplifierBonus(producerId, triggerKey, prod.resource);
  const amplifiedBase = (baseValue + ampBonus.addBonus) * ampBonus.mulBonus;
  const relicMult = getRelicSkillMultiplier('producer');
  const totalMult = enchMult * relicMult;
  const value = prod.operator === 'add' ? amplifiedBase * totalMult : amplifiedBase;

  // 视觉/音效反馈
  showTriggerPopup(producerId);

  playSound('skill');
  synergy.wordSkillCount++;

  // 记录资源变化量（用于变性附魔）
  let delta = 0;

  // 直接修改资源
  if (prod.operator === 'add') {
    delta = value;
    if (prod.resource === 'base') {
      synergy.skillBaseScore += value;
    } else if (prod.resource === 'multiplier') {
      synergy.skillMultBonus += value;
    } else if (prod.resource === 'score') {
      state.resources.score += value;
      state.score += value;
    } else {
      state.resources[prod.resource] += value;
    }
  } else {
    // ×N 乘法：基于总资源值计算增量，totalMult 缩放增量部分
    if (prod.resource === 'base') {
      delta = state.resources.base * (value - 1) * totalMult;
      synergy.skillBaseScore += delta;
    } else if (prod.resource === 'multiplier') {
      delta = state.multiplier * (value - 1) * totalMult;
      synergy.skillMultBonus += delta;
    } else if (prod.resource === 'score') {
      const pendingScore = state.resources.base * state.resources.multiplier + state.resources.score;
      delta = pendingScore * (value - 1) * totalMult;
      state.resources.score += delta;
      state.score += delta;
    } else if (prod.resource === 'gold') {
      // 金币乘算基于玩家持有金币（state.gold）
      delta = state.gold * (value - 1) * totalMult;
      state.resources.gold += delta;
    } else {
      delta = state.resources[prod.resource] * (value - 1) * totalMult;
      state.resources[prod.resource] += delta;
    }
  }

  // 战后统计
  recordSkillTrigger(producerId, triggerKey, prod.resource, delta, _isChainTrigger);

  // 浮字反馈
  const color = RESOURCE_COLORS[prod.resource];
  const displayValue = prod.operator === 'add' ? value : baseValue;
  const text = prod.operator === 'add'
    ? `+${displayValue}${getResourceLabel(prod.resource)}`
    : `×${displayValue}${getResourceLabel(prod.resource)}`;
  showFeedback(text, color);
  if (enchMult > 1) {
    showFeedback(`${ENCHANTMENTS[state.player.enchantedSkills?.get(producerId) || '']?.icon || ''} ×${enchMult.toFixed(1)}`, '#f9ca24');
  }

  // 附魔后处理：溅射 + 变性（Task 3, 5 实现）
  applyPostTriggerEnchantments(producerId, triggerKey, delta);

  // 成长附魔累积
  if (triggerKey) checkGrowthAccumulation(triggerKey);
  // 精通附魔累积
  checkMasteryAccumulation(producerId);
  // 吞噬附魔累积
  checkDevourAccumulation(producerId, triggerKey);

  updateHUD();
}

// === 触发转化者（绕过 Modifier 管道） ===
export function triggerConverter(converterId: string, triggerKey?: string): void {
  const conv = CONVERTERS[converterId];
  if (!conv) return;
  _currentTriggerKey = triggerKey;
  const level = state.player.skills.get(converterId)?.level || 1;
  const k = getConverterK(converterId, level);
  const sourceVal = getSourceValue(conv.source, state.resources);
  const enchMult = getEnchantmentMultiplier(converterId, triggerKey);
  const ampBonus = getAmplifierBonus(converterId, triggerKey, conv.target);
  const amplifiedK = (k + ampBonus.addBonus) * ampBonus.mulBonus;
  const relicMult = getRelicSkillMultiplier('converter');
  const totalMult = enchMult * relicMult;

  // 视觉/音效反馈
  showTriggerPopup(converterId);

  playSound('skill');
  synergy.wordSkillCount++;

  // 记录资源变化量（用于变性附魔）
  let delta = 0;

  // 计算转化
  if (conv.formula === 'add') {
    delta = sourceVal * amplifiedK * totalMult;
    if (conv.target === 'base') {
      synergy.skillBaseScore += delta;
    } else if (conv.target === 'multiplier') {
      synergy.skillMultBonus += delta;
    } else if (conv.target === 'score') {
      state.resources.score += delta;
      state.score += delta;
    } else {
      state.resources[conv.target] += delta;
    }
  } else {
    // multiply: target *= (1 + sourceVal × amplifiedK)，totalMult 缩放增量部分
    const factor = 1 + sourceVal * amplifiedK;
    if (conv.target === 'base') {
      delta = state.resources.base * sourceVal * amplifiedK * totalMult;
      synergy.skillBaseScore += delta;
    } else if (conv.target === 'multiplier') {
      delta = state.multiplier * sourceVal * amplifiedK * totalMult;
      synergy.skillMultBonus += delta;
    } else if (conv.target === 'score') {
      const pendingScore = state.resources.base * state.resources.multiplier + state.resources.score;
      delta = pendingScore * (factor - 1) * totalMult;
      state.resources.score += delta;
      state.score += delta;
    } else {
      delta = state.resources[conv.target] * (factor - 1) * totalMult;
      state.resources[conv.target] += delta;
    }
  }

  // 战后统计
  recordSkillTrigger(converterId, triggerKey, conv.target, delta, _isChainTrigger);

  // 浮字反馈
  const color = RESOURCE_COLORS[conv.target];
  const desc = getConverterDesc(converterId, level);
  showFeedback(desc, color);
  if (enchMult > 1) {
    showFeedback(`${ENCHANTMENTS[state.player.enchantedSkills?.get(converterId) || '']?.icon || ''} ×${enchMult.toFixed(1)}`, '#f9ca24');
  }

  // 附魔后处理：溅射 + 变性（Task 3, 5 实现）
  applyPostTriggerEnchantments(converterId, triggerKey, delta);

  // 成长附魔累积
  if (triggerKey) checkGrowthAccumulation(triggerKey);
  // 精通附魔累积
  checkMasteryAccumulation(converterId);
  // 吞噬附魔累积
  checkDevourAccumulation(converterId, triggerKey);

  updateHUD();
}

// === 附魔：溅射型 — 触发后对位置关系内技能减效触发 ===
let _splashActive = false; // 防止溅射递归

function applySplashEnchantment(skillId: string, triggerKey?: string): void {
  if (_splashActive || !triggerKey) return;
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return;
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.spatialType !== 'splash' || !ench.positionRelation) return;

  const related = getKeysWithRelation(triggerKey, ench.positionRelation);
  // 统计范围内有效技能数，效率 = 100% / 技能数
  const targets: { sid: string; key: string }[] = [];
  for (const key of related) {
    const sid = state.player.bindings.get(key);
    if (!sid || isConnector(sid) || isAmplifier(sid)) continue;
    targets.push({ sid, key });
  }
  if (targets.length === 0) return;
  const reduction = 1 / targets.length;

  _splashActive = true;
  for (const { sid, key } of targets) {
    if (isProducer(sid)) {
      triggerProducerWithReduction(sid, key, reduction);
    } else if (isConverter(sid)) {
      triggerConverterWithReduction(sid, key, reduction);
    }
  }
  _splashActive = false;

  showFeedback(`${ench.icon} 溅射!`, '#a29bfe');
}

// === 附魔：减效触发产出者（溅射/共鸣用，无 enchMult/sound/wordSkillCount/postTrigger） ===
function triggerProducerWithReduction(producerId: string, triggerKey: string, reduction: number): void {
  const prod = PRODUCERS[producerId];
  if (!prod) return;
  const level = state.player.skills.get(producerId)?.level || 1;
  const baseValue = getProducerValue(producerId, level);

  showTriggerPopup(producerId);


  let delta = 0;

  if (prod.operator === 'add') {
    const value = baseValue * reduction;
    delta = value;
    if (prod.resource === 'score') {
      state.resources.score += value;
      state.score += value;
    } else {
      state.resources[prod.resource] += value;
    }
  } else {
    // multiply: reduce the boost above 1 — e.g., ×1.5 at 30% → ×1.15
    const factor = 1 + (baseValue - 1) * reduction;
    if (prod.resource === 'score') {
      const pendingScore = state.resources.base * state.resources.multiplier + state.resources.score;
      delta = pendingScore * (factor - 1);
      state.resources.score += delta;
      state.score += delta;
    } else {
      const before = state.resources[prod.resource];
      state.resources[prod.resource] *= factor;
      delta = state.resources[prod.resource] - before;
    }
  }

  // 战后统计
  recordSkillTrigger(producerId, triggerKey, prod.resource, delta, false);

  const color = RESOURCE_COLORS[prod.resource];
  const feedbackText = prod.operator === 'add'
    ? `+${(baseValue * reduction).toFixed(1)}${getResourceLabel(prod.resource)} (溅射)`
    : `×${(1 + (baseValue - 1) * reduction).toFixed(2)}${getResourceLabel(prod.resource)} (溅射)`;
  showFeedback(feedbackText, color);

  // 成长附魔累积（溅射/共鸣子触发也贡献）
  checkGrowthAccumulation(triggerKey);
  // 精通附魔累积（溅射/共鸣子触发也计数）
  checkMasteryAccumulation(producerId);
  // 吞噬附魔累积（溅射/共鸣子触发也计数）
  checkDevourAccumulation(producerId, triggerKey);

  updateHUD();
}

// === 附魔：减效触发转化者（溅射/共鸣用，无 enchMult/sound/wordSkillCount/postTrigger） ===
function triggerConverterWithReduction(converterId: string, triggerKey: string, reduction: number): void {
  const conv = CONVERTERS[converterId];
  if (!conv) return;
  const level = state.player.skills.get(converterId)?.level || 1;
  const k = getConverterK(converterId, level);
  const sourceVal = getSourceValue(conv.source, state.resources);

  showTriggerPopup(converterId);

  let delta = 0;

  if (conv.formula === 'add') {
    delta = sourceVal * k * reduction;
    if (conv.target === 'score') {
      state.resources.score += delta;
      state.score += delta;
    } else {
      state.resources[conv.target] += delta;
    }
  } else {
    const factor = 1 + sourceVal * k * reduction;
    if (conv.target === 'score') {
      const pendingScore = state.resources.base * state.resources.multiplier + state.resources.score;
      delta = pendingScore * (factor - 1);
      state.resources.score += delta;
      state.score += delta;
    } else {
      const before = state.resources[conv.target];
      state.resources[conv.target] *= factor;
      delta = state.resources[conv.target] - before;
    }
  }

  // 战后统计
  recordSkillTrigger(converterId, triggerKey, conv.target, delta, false);

  const color = RESOURCE_COLORS[conv.target];
  showFeedback(`${getConverterDesc(converterId, level)} (溅射)`, color);

  // 成长附魔累积（溅射/共鸣子触发也贡献）
  checkGrowthAccumulation(triggerKey);
  // 精通附魔累积（溅射/共鸣子触发也计数）
  checkMasteryAccumulation(converterId);
  // 吞噬附魔累积（溅射/共鸣子触发也计数）
  checkDevourAccumulation(converterId, triggerKey);

  updateHUD();
}

// === 附魔：变性型 — 额外资源产出 ===
function applyTransmutationEnchantment(skillId: string, triggerKey?: string, delta?: number): void {
  if (!delta || delta <= 0) return;
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return;
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.category !== 'transmutation' || !ench.extraResource) return;

  const extraValue = delta * ench.effectValue;
  if (ench.extraResource === 'score') {
    state.resources.score += extraValue;
    state.score += extraValue;
  } else {
    state.resources[ench.extraResource] += extraValue;
  }


  const color = RESOURCE_COLORS[ench.extraResource];
  showFeedback(`${ench.icon} +${extraValue.toFixed(1)}${getResourceLabel(ench.extraResource)}`, color);

  // 额外产出可触发连接者（AC6 设计意图）
  if (triggerKey) {
    checkResourceTriggers(ench.extraResource, triggerKey, [triggerKey]);
  }

  updateHUD();
}

// === 附魔：共鸣型 — 邻居触发时自身也触发 ===
let _resonanceActive = false; // 防止共鸣递归

export function checkResonanceTriggers(sourceKey: string): void {
  if (_resonanceActive || !sourceKey) return;
  _resonanceActive = true;

  for (const [enchKey, sid] of state.player.bindings) {
    if (enchKey === sourceKey) continue;
    const enchId = state.player.enchantedSkills?.get(sid);
    if (!enchId) continue;
    const ench = ENCHANTMENTS[enchId];
    if (!ench || ench.spatialType !== 'resonance' || !ench.positionRelation) continue;
    if (!hasRelation(sourceKey, enchKey, ench.positionRelation)) continue;

    // 以减效触发附魔技能
    if (isProducer(sid)) {
      triggerProducerWithReduction(sid, enchKey, ench.effectValue);
    } else if (isConverter(sid)) {
      triggerConverterWithReduction(sid, enchKey, ench.effectValue);
    } else if (isAmplifier(sid)) {
      triggerAmplifierResonance(sid, enchKey);
    }
  }

  _resonanceActive = false;
}

// === 附魔：共鸣触发增幅者叠层（静默版，无弹窗/音效） ===
function triggerAmplifierResonance(ampId: string, key: string): void {
  const amp = AMPLIFIERS[ampId];
  if (!amp) return;
  const current = state.amplifierStacks.get(ampId) || 0;
  const newStacks = current + 1; // 共鸣固定 +1，不受 enchMult 影响
  state.amplifierStacks.set(ampId, newStacks);
  recordSkillTrigger(ampId, key, 'base', 0, false);
  showFeedback(`${amp.icon || ''} ×${newStacks} (共鸣)`, '#a29bfe');

  // 成长附魔累积（共鸣子触发也贡献）
  checkGrowthAccumulation(key);
  // 精通附魔累积（共鸣子触发也计数）
  checkMasteryAccumulation(ampId);
  // 吞噬附魔累积（共鸣子触发也计数）
  checkDevourAccumulation(ampId, key);

  updateHUD();
  eventBus.emit('skill:triggered', { key, skillId: ampId, type: 'active', amplifierStacks: newStacks, growthValue: state.growthValues.get(ampId) || 0 });
}

// === 附魔后处理：溅射 + 变性 ===
function applyPostTriggerEnchantments(skillId: string, triggerKey?: string, delta?: number): void {
  applySplashEnchantment(skillId, triggerKey);
  applyTransmutationEnchantment(skillId, triggerKey, delta);
}

// === 连接者：判断技能是否能产出指定资源（Layer 1 过滤用） ===
function canProduceResource(skillId: string, resource: ResourceType): boolean {
  if (isProducer(skillId)) return PRODUCERS[skillId].resource === resource;
  if (isConverter(skillId)) return CONVERTERS[skillId].target === resource;
  return false;
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

  // 先设置 state，让 interval 回调读取 state 中的参与者列表（支持后续合并）
  const piState: PseudoInfiniteState = { intervalId: 0, participantKeys: [...participantKeys] };
  state.pseudoInfiniteState = piState;
  setPseudoInfiniteVisual(true);

  const intervalId = setInterval(() => {
    if (state.phase !== 'battle') {
      clearPseudoInfinite();
      return;
    }
    // 从 state 读取参与者，确保合并后的新参与者也被触发
    const keys = state.pseudoInfiniteState?.participantKeys ?? [];
    for (const key of keys) {
      const sid = state.player.bindings.get(key);
      if (!sid) continue;
      // 直接调底层触发，不进入链检测
      if (isProducer(sid)) {
        triggerProducer(sid, key);
      } else if (isConverter(sid)) {
        triggerConverter(sid, key);
      }
      // 连接者本身不产出资源，伪无限中跳过
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

// === 连接者：复制型触发 ===
export function triggerConnectorCopy(connectorId: string, triggerKey: string, chainHistory: string[]): void {
  const conn = CONNECTORS[connectorId];
  if (!conn || conn.triggerType !== 'copy') return;

  // 视觉/音效反馈
  showTriggerPopup(connectorId);

  playSound('skill');
  synergy.wordSkillCount++;

  const desc = getConnectorDesc(connectorId);
  showFeedback(desc, '#a29bfe');

  // 查找位置关系内有绑定技能的键
  const relatedKeys = getKeysWithRelation(triggerKey, conn.positionRelation);
  const candidates = relatedKeys.filter(k => {
    const sid = state.player.bindings.get(k);
    return sid && !isConnector(sid); // 跳过其他连接者，避免无限递归
  });
  if (candidates.length === 0) return;

  const targetKey = candidates[Math.floor(Math.random() * candidates.length)];
  const targetSkillId = state.player.bindings.get(targetKey)!;

  // 循环检测
  if (chainHistory.includes(targetKey)) {
    if (chainHistory.length >= 2) {
      enterPseudoInfinite([...chainHistory, targetKey]);
    }
    return;
  }

  // 战后统计：连锁深度
  const bs = state.battleStats;
  if (bs) bs.maxChainDepth = Math.max(bs.maxChainDepth, chainHistory.length + 1);

  // 链式触发目标技能
  triggerSkill(targetSkillId, targetKey, [...chainHistory, targetKey]);
  updateHUD();
}

// === 连接者：资源触发检查 ===
export function checkResourceTriggers(resource: ResourceType, sourceKey: string, chainHistory: string[]): void {
  // 遍历所有已绑定的资源触发型连接者
  for (const [connKey, connId] of state.player.bindings) {
    const conn = CONNECTORS[connId];
    if (!conn || conn.triggerType !== 'resourceTrigger' || conn.resource !== resource) continue;

    // 检查产出技能的键是否与连接者有位置关系
    if (!hasRelation(sourceKey, connKey, conn.positionRelation)) continue;

    // 查找关系内有绑定技能的键
    const relatedKeys = getKeysWithRelation(connKey, conn.positionRelation);
    const candidates = relatedKeys.filter(k => {
      const sid = state.player.bindings.get(k);
      if (!sid) return false;
      // Layer 1: 跳过能产出同资源的技能
      if (canProduceResource(sid, resource)) return false;
      return true;
    });
    if (candidates.length === 0) continue;

    // 视觉/音效反馈
    showTriggerPopup(connId);

    playSound('skill');
    const desc = getConnectorDesc(connId);
    showFeedback(desc, '#a29bfe');

    const targetKey = candidates[Math.floor(Math.random() * candidates.length)];
    const targetSkillId = state.player.bindings.get(targetKey)!;

    // 循环检测
    if (chainHistory.includes(targetKey)) {
      if (chainHistory.length >= 2) {
        enterPseudoInfinite([...chainHistory, targetKey]);
      }
      continue;
    }

    // 链式触发
    triggerSkill(targetSkillId, targetKey, [...chainHistory, targetKey]);
  }
}

// === 触发增幅者（纯叠层，无资源产出） ===
export function triggerAmplifier(ampId: string, triggerKey: string): void {
  const amp = AMPLIFIERS[ampId];
  if (!amp) return;

  // 附魔倍率 → 叠层增量
  const enchMult = getEnchantmentMultiplier(ampId, triggerKey);
  const stackGain = Math.max(1, Math.ceil(1 * enchMult)); // 至少+1层

  const current = state.amplifierStacks.get(ampId) || 0;
  const newStacks = current + stackGain;
  state.amplifierStacks.set(ampId, newStacks);

  // 统计
  synergy.wordSkillCount++;

  // 反馈弹窗（显示图标 + 层数）
  const display = getSkillDisplayInfo(ampId, undefined, state.player.enchantedSkills);
  const el = getElements();
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup amplifier-stack';
  p.innerHTML = `<span class="trigger-icon">${display.icon}</span><span class="stack-count">×${newStacks}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);

  // 战后统计：记录触发次数（delta=0，增幅者不产出资源）
  recordSkillTrigger(ampId, triggerKey, 'base', 0, false);

  playSound('skill');
  showFeedback(`${display.icon} ×${newStacks}${stackGain > 1 ? ` (+${stackGain})` : ''}`, '#a29bfe');
  if (enchMult > 1) {
    const enchId = state.player.enchantedSkills?.get(ampId) || '';
    showFeedback(`${ENCHANTMENTS[enchId]?.icon || ''} ×${enchMult.toFixed(1)}`, '#f9ca24');
  }
  // 溅射：触发范围内技能
  applySplashEnchantment(ampId, triggerKey);

  // 成长附魔累积
  checkGrowthAccumulation(triggerKey);
  // 精通附魔累积
  checkMasteryAccumulation(ampId);
  // 吞噬附魔累积
  checkDevourAccumulation(ampId, triggerKey);

  updateHUD();

  // 通知键盘可视化更新叠层显示
  eventBus.emit('skill:triggered', { key: triggerKey, skillId: ampId, type: 'active', amplifierStacks: newStacks, growthValue: state.growthValues.get(ampId) || 0 });
}

// === 触发技能（管道驱动） ===
export function triggerSkill(skillId: string, triggerKey: string, chainHistory?: string[]): void {
  const chain = chainHistory || [triggerKey];
  _isChainTrigger = chain.length > 1;
  _currentTriggerKey = triggerKey;

  // 产出者分流：绕过 Modifier 管道
  if (isProducer(skillId)) {
    triggerProducer(skillId, triggerKey);
    checkResourceTriggers(PRODUCERS[skillId].resource, triggerKey, chain);
    checkResonanceTriggers(triggerKey);
    return;
  }

  // 转化者分流：绕过 Modifier 管道
  if (isConverter(skillId)) {
    triggerConverter(skillId, triggerKey);
    checkResourceTriggers(CONVERTERS[skillId].target, triggerKey, chain);
    checkResonanceTriggers(triggerKey);
    return;
  }

  // 连接者分流：复制型手动触发
  if (isConnector(skillId)) {
    const conn = CONNECTORS[skillId];
    if (conn.triggerType === 'copy') {
      triggerConnectorCopy(skillId, triggerKey, chain);
    }
    // resourceTrigger 型由 checkResourceTriggers 驱动，不在此处触发
    return;
  }

  // 增幅者分流：纯叠层，无资源产出，无链式反应
  if (isAmplifier(skillId)) {
    triggerAmplifier(skillId, triggerKey);
    return;
  }
}

// === 显示技能触发弹窗 ===
function showTriggerPopup(skillId: string): void {
  const el = getElements();
  const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || AMPLIFIERS[skillId];
  if (!sk) return;

  const display = getSkillDisplayInfo(skillId, undefined, state.player.enchantedSkills);
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup';
  p.innerHTML = `<span class="trigger-icon">${display.icon}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);
}
