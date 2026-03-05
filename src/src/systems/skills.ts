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
import { ENCHANTMENTS } from '../data/enchantments';
import { hasRelation, getKeysWithRelation } from '../data/keyboardTopology';
import type { ResourceType, PseudoInfiniteState } from '../core/types';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { showFeedback, updateHUD, setPseudoInfiniteVisual } from './battle';


// === 战后统计：记录技能触发 ===
const EMPTY_RESOURCES = { base: 0, score: 0, multiplier: 0, time: 0, shield: 0 };

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
}

// 模块级：当前触发是否来自链式（由 triggerSkill 设置，triggerProducer/Converter 读取）
let _isChainTrigger = false;

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
  }
}

// === 附魔：独立型倍率计算 ===
function getIndependentMultiplier(ench: typeof ENCHANTMENTS[string], skillId: string): number {
  switch (ench.id) {
    case 'ench_pioneer':
      return synergy.wordSkillCount === 0 ? ench.effectValue : 1;
    case 'ench_finale': {
      // 当前字母是本词最后一个绑定键位时 ×3
      const word = state.player.word.toLowerCase();
      if (!word) return 1;
      // 找到最后一个绑定了技能的字母索引
      let lastBoundIdx = -1;
      for (let i = word.length - 1; i >= 0; i--) {
        if (state.player.bindings.has(word[i])) {
          lastBoundIdx = i;
          break;
        }
      }
      return state.player.index === lastBoundIdx ? ench.effectValue : 1;
    }
    case 'ench_decay': {
      const count = synergy.decayCounters.get(skillId) || 0;
      // NOTE: counter increment moved to triggerProducer/triggerConverter (after calling getEnchantmentMultiplier)
      return ench.effectValue * Math.pow(0.7, count); // 2.5 × 0.7^count
    }
    case 'ench_thirst': {
      // 对应资源越低越强：×(1 + 2 × (1 - ratio))，0% 时 ×3
      const prod = PRODUCERS[skillId];
      const conv = CONVERTERS[skillId];
      const resType = prod?.resource || conv?.target;
      if (!resType) return 1;
      // 计算资源比例
      let ratio = 1;
      if (resType === 'time') {
        ratio = state.timeMax > 0 ? state.time / state.timeMax : 1;
      } else if (resType === 'multiplier') {
        ratio = Math.min(state.multiplier / 5, 1); // 5 倍率为 100%
      } else if (resType === 'shield') {
        ratio = Math.min(state.resources.shield / 10, 1); // 10 盾为 100%
      } else {
        // base/score: 以目标分为基准
        ratio = state.targetScore > 0 ? Math.min(state.score / state.targetScore, 1) : 1;
      }
      return 1 + 2 * (1 - Math.max(0, Math.min(1, ratio)));
    }
    default:
      return 1;
  }
}

// === 附魔：ench_decay 计数器推进（从 getter 分离的副作用） ===
function advanceDecayCounter(skillId: string): void {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return;
  const ench = ENCHANTMENTS[enchId];
  if (!ench || ench.id !== 'ench_decay') return;
  const count = synergy.decayCounters.get(skillId) || 0;
  synergy.decayCounters.set(skillId, count + 1);
}

// === 附魔：计算增幅/排斥/独立倍率 ===
export function getEnchantmentMultiplier(skillId: string, triggerKey?: string): number {
  const enchId = state.player.enchantedSkills?.get(skillId);
  if (!enchId) return 1;
  const ench = ENCHANTMENTS[enchId];
  if (!ench) return 1;

  if (ench.spatialType === 'amplify' && triggerKey && ench.positionRelation) {
    const related = getKeysWithRelation(triggerKey, ench.positionRelation);
    const skillCount = related.filter(k => state.player.bindings.has(k)).length;
    return 1 + skillCount * ench.effectValue;
  }
  if (ench.spatialType === 'repulsion' && triggerKey && ench.positionRelation) {
    const related = getKeysWithRelation(triggerKey, ench.positionRelation);
    const emptyCount = related.filter(k => !state.player.bindings.has(k)).length;
    return 1 + emptyCount * ench.effectValue;
  }
  if (ench.category === 'independent') {
    return getIndependentMultiplier(ench, skillId);
  }
  return 1;
}

// === 触发产出者（绕过 Modifier 管道） ===
export function triggerProducer(producerId: string, triggerKey?: string): void {
  const prod = PRODUCERS[producerId];
  if (!prod) return;
  const level = state.player.skills.get(producerId)?.level || 1;
  const baseValue = getProducerValue(producerId, level);
  const enchMult = getEnchantmentMultiplier(producerId, triggerKey);
  const value = prod.operator === 'add' ? baseValue * enchMult : baseValue;

  // ench_decay: increment counter AFTER reading multiplier (side-effect-free getter)
  advanceDecayCounter(producerId);

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
    // ×N 乘法（附魔不影响乘法型 value，但记录增量）
    if (prod.resource === 'base') {
      const before = synergy.skillBaseScore;
      synergy.skillBaseScore *= value;
      delta = synergy.skillBaseScore - before;
    } else if (prod.resource === 'multiplier') {
      const before = synergy.skillMultBonus;
      synergy.skillMultBonus *= value;
      delta = synergy.skillMultBonus - before;
    } else if (prod.resource === 'score') {
      const before = state.resources.score;
      state.resources.score *= value;
      delta = state.resources.score - before;
      state.score += delta;
    } else {
      const before = state.resources[prod.resource];
      state.resources[prod.resource] *= value;
      delta = state.resources[prod.resource] - before;
    }
  }

  // 时间 clamp
  if (prod.resource === 'time') {
    // 时间无上限
  }
  // shield floor（×N 后可能出小数）
  if (prod.resource === 'shield') {
    state.resources.shield = Math.floor(state.resources.shield);
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

  updateHUD();
}

// === 触发转化者（绕过 Modifier 管道） ===
export function triggerConverter(converterId: string, triggerKey?: string): void {
  const conv = CONVERTERS[converterId];
  if (!conv) return;
  const level = state.player.skills.get(converterId)?.level || 1;
  const k = getConverterK(converterId, level);
  const sourceVal = getSourceValue(conv.source, state.resources);
  const enchMult = getEnchantmentMultiplier(converterId, triggerKey);

  // ench_decay: increment counter AFTER reading multiplier (side-effect-free getter)
  advanceDecayCounter(converterId);

  // 视觉/音效反馈
  showTriggerPopup(converterId);

  playSound('skill');
  synergy.wordSkillCount++;

  // 记录资源变化量（用于变性附魔）
  let delta = 0;

  // 计算转化
  if (conv.formula === 'add') {
    delta = sourceVal * k * enchMult;
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
    // multiply: target *= (1 + sourceVal × k)
    const factor = 1 + sourceVal * k;
    if (conv.target === 'base') {
      // multiply 等价于 base 总量 × sourceVal × k 的加值
      delta = state.resources.base * sourceVal * k;
      synergy.skillBaseScore += delta;
    } else if (conv.target === 'multiplier') {
      // multiply 等价于 multiplier 总量 × sourceVal × k 的加值
      delta = state.multiplier * sourceVal * k;
      synergy.skillMultBonus += delta;
    } else if (conv.target === 'score') {
      const before = state.resources.score;
      state.resources.score *= factor;
      delta = state.resources.score - before;
      state.score += delta;
    } else {
      const before = state.resources[conv.target];
      state.resources[conv.target] *= factor;
      delta = state.resources[conv.target] - before;
    }
  }

  // 时间 clamp
  if (conv.target === 'time') {
    // 时间无上限
  }
  // 护盾 floor
  if (conv.target === 'shield') {
    state.resources.shield = Math.floor(state.resources.shield);
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
  _splashActive = true;
  for (const key of related) {
    const sid = state.player.bindings.get(key);
    if (!sid || isConnector(sid)) continue;
    // 以减效触发目标技能
    if (isProducer(sid)) {
      triggerProducerWithReduction(sid, key, ench.effectValue);
    } else if (isConverter(sid)) {
      triggerConverterWithReduction(sid, key, ench.effectValue);
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


  if (prod.operator === 'add') {
    const value = baseValue * reduction;
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
      const before = state.resources.score;
      state.resources.score *= factor;
      state.score += (state.resources.score - before);
    } else {
      state.resources[prod.resource] *= factor;
    }
  }

  // 时间无上限
  if (prod.resource === 'shield') state.resources.shield = Math.floor(state.resources.shield);

  const color = RESOURCE_COLORS[prod.resource];
  const feedbackText = prod.operator === 'add'
    ? `+${(baseValue * reduction).toFixed(1)}${getResourceLabel(prod.resource)} (溅射)`
    : `×${(1 + (baseValue - 1) * reduction).toFixed(2)}${getResourceLabel(prod.resource)} (溅射)`;
  showFeedback(feedbackText, color);
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


  if (conv.formula === 'add') {
    const delta = sourceVal * k * reduction;
    if (conv.target === 'score') {
      state.resources.score += delta;
      state.score += delta;
    } else {
      state.resources[conv.target] += delta;
    }
  } else {
    const factor = 1 + sourceVal * k * reduction;
    if (conv.target === 'score') {
      const before = state.resources.score;
      state.resources.score *= factor;
      state.score += (state.resources.score - before);
    } else {
      state.resources[conv.target] *= factor;
    }
  }

  // 时间无上限
  if (conv.target === 'shield') state.resources.shield = Math.floor(state.resources.shield);

  const color = RESOURCE_COLORS[conv.target];
  showFeedback(`${getConverterDesc(converterId, level)} (溅射)`, color);
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

  // 时间无上限
  if (ench.extraResource === 'shield') state.resources.shield = Math.floor(state.resources.shield);

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
    }
  }

  _resonanceActive = false;
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
  triggerSkill(targetSkillId, targetKey, false, [...chainHistory, targetKey]);
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
    triggerSkill(targetSkillId, targetKey, false, [...chainHistory, targetKey]);
  }
}

// === 触发技能（管道驱动） ===
export function triggerSkill(skillId: string, triggerKey: string, chainHistory?: string[]): void {
  const chain = chainHistory || [triggerKey];
  _isChainTrigger = chain.length > 1;

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
}

// === 显示技能触发弹窗 ===
function showTriggerPopup(skillId: string): void {
  const el = getElements();
  const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId];
  if (!sk) return;

  const display = getSkillDisplayInfo(skillId, undefined, state.player.enchantedSkills);
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup';
  p.innerHTML = `<span class="trigger-icon">${display.icon}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);
}
