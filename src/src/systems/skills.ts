// ============================================
// 打字肉鸽 - 技能系统
// ============================================
// Story 11.5: Modifier 管道集成

import { state, synergy } from '../core/state';
import { ADJACENT_KEYS, KEYBOARD_ROWS } from '../core/constants';
import { SKILLS, isPassiveSkill, getSkillModifierFactory, getSkillDisplayInfo } from '../data/skills';
import type { AdjacentSkill } from '../core/types';
import type { PipelineContext, EffectAccumulator, BehaviorCallbacks, PipelineResult, ModifierTrigger, Modifier } from './modifiers/ModifierTypes';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { BehaviorExecutor } from './modifiers/BehaviorExecutor';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { showFeedback, highlightBoundSkill, updateHUD } from './battle';
import { injectRelicModifiers, queryRelicFlag } from './relics/RelicPipeline';

// === 获取相邻技能 ===
export function getAdjacentSkills(key: string): AdjacentSkill[] {
  const adjacent = ADJACENT_KEYS[key] || [];
  const skills: AdjacentSkill[] = [];

  for (const adjKey of adjacent) {
    const skillId = state.player.bindings.get(adjKey);
    if (skillId && SKILLS[skillId]) {
      skills.push({
        key: adjKey,
        skillId,
        skill: SKILLS[skillId],
      });
    }
  }
  return skills;
}

// === 获取同行被动技能（排除自身和已在相邻列表中的） ===
export function getSameRowPassiveSkills(triggerKey: string, selfSkillId: string): AdjacentSkill[] {
  const row = KEYBOARD_ROWS.find(r => r.includes(triggerKey));
  if (!row) return [];
  const skills: AdjacentSkill[] = [];
  for (const key of row) {
    if (key === triggerKey) continue;
    const skillId = state.player.bindings.get(key);
    if (skillId && skillId !== selfSkillId && SKILLS[skillId] && isPassiveSkill(skillId)) {
      skills.push({ key, skillId, skill: SKILLS[skillId] });
    }
  }
  return skills;
}

// === 获取相邻空位数 ===
export function getAdjacentEmptyCount(key: string): number {
  const adjacent = ADJACENT_KEYS[key] || [];
  return adjacent.filter(k => !state.player.bindings.has(k)).length;
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

// === 构建管道上下文 ===
export function buildTriggerContext(triggerKey: string, adjacent: AdjacentSkill[]): PipelineContext {
  return {
    combo: state.combo,
    hasError: !state.wordPerfect,
    adjacentSkillCount: adjacent.length,
    adjacentEmptyCount: getAdjacentEmptyCount(triggerKey),
    adjacentSkillTypes: adjacent.map(a => a.skill.type),
    currentWord: state.player.word,
    skillsTriggeredThisWord: synergy.wordSkillCount,
    shieldCount: synergy.shieldCount,
    totalSkillCount: state.player.skills.size,
    hasGamblersCreed: state.player.relics.has('gamblers_creed'),
    skillDensity: computeSkillDensity(state.player.word),
  };
}

// === 构建作用域注册表 ===
export function createScopedRegistry(
  skillId: string,
  level: number,
  triggerKey: string,
  context: PipelineContext,
  isEcho: boolean,
  adjacentOverride?: AdjacentSkill[],
): ModifierRegistry {
  const registry = new ModifierRegistry();
  const factory = getSkillModifierFactory(skillId, state.player.evolvedSkills);
  if (!factory) return registry;

  // 注册触发技能自身的 base 层 Modifier（enhance/global 来自相邻技能）
  let mods = factory(skillId, level, context);

  // isEcho 时过滤掉链式行为（防止 echo 双触发中重复设置标记）
  if (isEcho) {
    mods = mods.filter(m =>
      m.behavior?.type !== 'trigger_adjacent' &&
      m.behavior?.type !== 'trigger_random_adjacent' &&
      m.behavior?.type !== 'set_echo_flag' &&
      m.behavior?.type !== 'set_ripple_flag'
    );
  }
  registry.registerMany(mods.filter(m => m.layer === 'base'));

  // 注册相邻技能的 enhance/global 层 Modifier
  const adjacent = adjacentOverride ?? getAdjacentSkills(triggerKey);
  const hasPassiveMastery = queryRelicFlag('passive_mastery') === true;
  for (const adj of adjacent) {
    const adjFactory = getSkillModifierFactory(adj.skillId, state.player.evolvedSkills);
    if (!adjFactory) continue;
    const adjLvl = state.player.skills.get(adj.skillId)?.level || 1;
    let adjMods = adjFactory(adj.skillId, adjLvl, context);
    // 被动大师：被动技能 enhance 层效果翻倍
    if (hasPassiveMastery && isPassiveSkill(adj.skillId)) {
      adjMods = adjMods.map(m => {
        if (m.layer === 'enhance' && m.effect && m.effect.stacking === 'multiplicative' && m.effect.value > 1) {
          // 翻倍：(value - 1) * 2 + 1，如 1.5 → 2.0, 1.15 → 1.30
          const boosted = 1 + (m.effect.value - 1) * 2;
          return { ...m, effect: { ...m.effect, value: boosted } };
        }
        return m;
      });
    }
    // 只注册 enhance/global 层（不注册 base 层，base 只属于触发技能本身）
    registry.registerMany(adjMods.filter(m => m.layer !== 'base'));
  }

  // 同行被动技能 enhance/global 层注入（仅限同行范围被动类型：anchor）
  // 注意：core/aura 只影响相邻技能，不应从同行注入
  const ROW_WIDE_PASSIVE_TYPES = new Set(['anchor']);
  const sameRowPassives = getSameRowPassiveSkills(triggerKey, skillId);
  const injectedSources = new Set(adjacent.map(a => a.skillId));
  for (const rowSkill of sameRowPassives) {
    if (!ROW_WIDE_PASSIVE_TYPES.has(rowSkill.skill.type)) continue; // 只注入同行范围被动
    if (injectedSources.has(rowSkill.skillId)) continue; // 已通过相邻注入，跳过
    const rowFactory = getSkillModifierFactory(rowSkill.skillId, state.player.evolvedSkills);
    if (!rowFactory) continue;
    const rowLvl = state.player.skills.get(rowSkill.skillId)?.level || 1;
    let rowMods = rowFactory(rowSkill.skillId, rowLvl, context);
    // 被动大师：同行被动技能 enhance 层效果翻倍
    if (hasPassiveMastery) {
      rowMods = rowMods.map(m => {
        if (m.layer === 'enhance' && m.effect && m.effect.stacking === 'multiplicative' && m.effect.value > 1) {
          const boosted = 1 + (m.effect.value - 1) * 2;
          return { ...m, effect: { ...m.effect, value: boosted } };
        }
        return m;
      });
    }
    registry.registerMany(rowMods.filter(m => m.layer !== 'base'));
  }

  // 遗物 global 层注入（如 golden_keyboard 技能效果 +25%）
  injectRelicModifiers(registry, context);

  return registry;
}

// === 应用效果到游戏状态 ===
export function applyEffects(effects: EffectAccumulator): void {
  if (effects.score > 0) {
    synergy.skillBaseScore += effects.score;
  }
  if (effects.multiply > 0) {
    synergy.skillMultBonus += effects.multiply;
    state.multiplier += effects.multiply;
  }
  if (effects.time > 0) {
    state.time = Math.min(state.time + effects.time, state.timeMax + 10);
  }
  if (effects.shield > 0) {
    synergy.shieldCount += effects.shield;
  }
}

// === 生成技能反馈 ===
export function generateFeedback(
  skillId: string,
  effects: EffectAccumulator,
  context: PipelineContext,
): { text: string; color: string } | null {
  // 进化技能优先使用进化反馈
  const evoId = state.player.evolvedSkills.get(skillId);
  if (evoId) {
    return generateEvolvedFeedback(skillId, evoId, effects, context);
  }

  switch (skillId) {
    case 'burst':
      return { text: `+${Math.floor(effects.score * state.multiplier)}分`, color: '#4ecdc4' };
    case 'amp':
      return { text: `倍率+${effects.multiply.toFixed(1)}`, color: '#ffe66d' };
    case 'freeze':
      return { text: `+${effects.time}秒`, color: '#87ceeb' };
    case 'shield':
      return { text: `护盾+${effects.shield}`, color: '#87ceeb' };
    case 'core':
      return null; // 被动技能，通过 enhance 层静默增强
    case 'aura':
      return null; // 静默
    case 'lone':
      return null; // 纯布局被动，不触发
    case 'echo':
      return { text: '回响→双触发', color: '#e056fd' };
    case 'void':
      return null; // 纯布局被动，不触发
    case 'ripple': {
      const rippleText = effects.score > 0 ? `涟漪→传递 +${Math.floor(effects.score * state.multiplier)}` : '涟漪→传递';
      return { text: rippleText, color: '#3498db' };
    }
    case 'gamble':
      if (effects.score > 0) {
        return { text: `豪赌! +${Math.floor(effects.score * state.multiplier)}`, color: '#f1c40f' };
      }
      return { text: '豪赌...空手', color: '#666' };
    case 'chain':
      if (effects.multiply > 0) {
        return { text: `连锁! +${effects.multiply.toFixed(1)}`, color: '#e67e22' };
      }
      return { text: '连锁断裂...', color: '#666' };
    case 'overclock': {
      const triggered = (context.skillsTriggeredThisWord ?? 0) >= 3;
      if (triggered) {
        return { text: '超频!', color: '#e74c3c' };
      }
      return { text: '超频待机...', color: '#666' };
    }
    case 'pulse':
      return null; // 反馈在 pulseCounter 回调中直接显示
    case 'sentinel': {
      if (effects.score > 0) {
        return { text: `哨兵+${Math.floor(effects.score * state.multiplier)}`, color: '#27ae60' };
      }
      return { text: '哨兵(无盾)', color: '#666' };
    }
    case 'mirror':
      return { text: '镜像!', color: '#9b59b6' };
    case 'leech':
      return { text: `汲取+${Math.floor(effects.score * state.multiplier)}`, color: '#27ae60' };
    case 'anchor':
      return null; // 被动技能，通过 enhance 层静默增强
    default:
      return null;
  }
}

// === 进化技能反馈 ===
function generateEvolvedFeedback(
  skillId: string,
  evoId: string,
  effects: EffectAccumulator,
  _context: PipelineContext,
): { text: string; color: string } | null {
  switch (evoId) {
    case 'burst_inferno':
      if (effects.score > 0) return { text: `烈焰! +${Math.floor(effects.score * state.multiplier)}`, color: '#ff4500' };
      return { text: '烈焰(combo不足)', color: '#666' };
    case 'burst_precision':
      return { text: `精准+${Math.floor(effects.score * state.multiplier)} 倍率+${effects.multiply.toFixed(1)}`, color: '#4ecdc4' };
    case 'amp_crescendo':
      return { text: `渐强+${effects.multiply.toFixed(1)}`, color: '#ffe66d' };
    case 'amp_overdrive':
      return { text: `超载! +${effects.multiply.toFixed(1)}`, color: '#ff6b6b' };
    case 'echo_resonance':
      return { text: '共鸣→三触发', color: '#e056fd' };
    case 'echo_phantom':
      return { text: '幻影→随机触发', color: '#9b59b6' };
    case 'freeze_permafrost':
      if (effects.time > 0) return { text: `永冻+${effects.time}秒`, color: '#87ceeb' };
      return { text: '永冻(本词已触发)', color: '#666' };
    case 'freeze_chrono':
      return { text: '时光倒流...', color: '#87ceeb' };
    case 'lone_hermit':
    case 'lone_shadow':
      return null; // 纯布局被动进化，不触发
    case 'core_nexus':
      return null; // 被动增强
    case 'core_fusion':
      if (effects.score > 0) return { text: `融合+${Math.floor(effects.score * state.multiplier)}`, color: '#87ceeb' };
      return null;
    default:
      // 回退到基础反馈
      return generateFeedback(skillId, effects, _context);
  }
}

// === 技能事件解析（非触发事件：on_error, on_word_complete） ===
export function resolveSkillEventModifiers(
  trigger: ModifierTrigger,
  context: PipelineContext,
  behaviorCallbacks?: BehaviorCallbacks,
): PipelineResult {
  const registry = new ModifierRegistry();
  state.player.skills.forEach((data, skillId) => {
    const factory = getSkillModifierFactory(skillId, state.player.evolvedSkills);
    if (!factory) return;
    const mods = factory(skillId, data.level, context);
    registry.registerMany(mods.filter(m => m.trigger === trigger));
  });
  injectRelicModifiers(registry, context);
  const result = EffectPipeline.resolve(registry, trigger, context);
  if (behaviorCallbacks && result.pendingBehaviors.length > 0) {
    BehaviorExecutor.execute(result.pendingBehaviors, 0, behaviorCallbacks);
  }
  return result;
}

// === 空 PipelineResult 工具 ===
function emptyPipelineResult(): PipelineResult {
  return {
    intercepted: false,
    effects: { score: 0, multiply: 0, time: 0, gold: 0, shield: 0 },
    pendingBehaviors: [],
  };
}

// === 触发技能（管道驱动） ===
export function triggerSkill(skillId: string, triggerKey: string, isEcho = false): void {
  const base = SKILLS[skillId];
  if (!base) return;

  // amp_overdrive 词冷却：已冷却的技能本词不再触发
  if (synergy.wordCooldowns.has(skillId)) return;

  const lvl = state.player.skills.get(skillId)?.level || 1;
  const adjacent = getAdjacentSkills(triggerKey);

  // 视觉/音效反馈
  showTriggerPopup(skillId);
  highlightBoundSkill(skillId);
  playSound('skill');

  // 记录技能触发
  synergy.wordSkillCount++;

  // === Echo 标记检查（消费在前，二次触发在后） ===
  const shouldEchoRepeat = synergy.echoPending && !isEcho && skillId !== 'echo';
  if (shouldEchoRepeat) {
    synergy.echoPending = false;
  }

  // 构建上下文 + 作用域注册表
  const context = buildTriggerContext(triggerKey, adjacent);
  context.currentSkillId = skillId;
  context.lastTriggeredSkillId = synergy.lastTriggeredSkillId ?? undefined;
  synergy.lastTriggeredSkillId = skillId;
  const registry = createScopedRegistry(skillId, lvl, triggerKey, context, isEcho, adjacent);

  // 管道解析
  const result = EffectPipeline.resolve(registry, 'on_skill_trigger', context);

  // 铁壁遗物：shield 效果 +2（在 applyEffects 之前，确保只应用一次）
  if (result.effects.shield > 0) {
    const fortressBonus = queryRelicFlag('fortress_shield_bonus') as number;
    result.effects.shield += fortressBonus;
  }

  // 铁壁遗物：sentinel 每层护盾额外 +1 分
  if (skillId === 'sentinel') {
    const sentinelBonus = queryRelicFlag('fortress_sentinel_bonus') as number;
    if (sentinelBonus > 0 && (context.shieldCount ?? 0) > 0) {
      result.effects.score += (context.shieldCount ?? 0) * sentinelBonus;
    }
  }

  // freeze_permafrost 每词一次：已触发过则清零 time 效果
  if (state.player.evolvedSkills.get(skillId) === 'freeze_permafrost') {
    if (synergy.freezeTriggeredThisWord.has(skillId)) {
      result.effects.time = 0;
    } else {
      synergy.freezeTriggeredThisWord.add(skillId);
    }
  }

  // 应用数值效果
  applyEffects(result.effects);

  // === Ripple 传递：应用上一个技能存储的效果 ===
  if (synergy.ripplePassthrough !== null) {
    // 连锁放大器：ripple 传递效果 ×2（缩放数值而非重复调用）
    if (queryRelicFlag('chain_amplifier') === true) {
      synergy.ripplePassthrough = {
        score: synergy.ripplePassthrough.score * 2,
        multiply: synergy.ripplePassthrough.multiply * 2,
        time: synergy.ripplePassthrough.time * 2,
        gold: synergy.ripplePassthrough.gold * 2,
        shield: synergy.ripplePassthrough.shield * 2,
      };
    }
    applyEffects(synergy.ripplePassthrough);
    synergy.ripplePassthrough = null;
  }

  // === Ripple 标记检查：存储当前效果供下一个技能使用 ===
  if (synergy.ripplePending && skillId !== 'ripple') {
    synergy.ripplePending = false;
    synergy.ripplePassthrough = { ...result.effects };
  }

  // 显示反馈
  const fb = generateFeedback(skillId, result.effects, context);
  if (fb) {
    showFeedback(fb.text, fb.color);
  }

  // 执行行为
  const callbacks: BehaviorCallbacks = {
    onTriggerAdjacent: (_depth: number) => {
      const results: PipelineResult[] = [];
      for (const adj of adjacent) {
        setTimeout(() => {
          if (state.phase === 'battle') {
            triggerSkill(adj.skillId, adj.key, true);
          }
        }, 100);
        results.push(emptyPipelineResult());
      }
      return results;
    },
    onSetEchoFlag: () => {
      synergy.echoPending = true;
    },
    onSetRippleFlag: () => {
      synergy.ripplePending = true;
    },
    onPulseCounter: (timeBonus: number) => {
      synergy.pulseCount++;
      if (synergy.pulseCount % 3 === 0) {
        applyEffects({ score: 0, multiply: 0, time: timeBonus, gold: 0, shield: 0 });
        showFeedback(`脉冲! +${timeBonus}秒`, '#2ecc71');
      }
    },
    onTimeSteal: (timeBonus: number) => {
      applyEffects({ score: 0, multiply: 0, time: timeBonus, gold: 0, shield: 0 });
    },
    // 进化系统回调 (Story 15.2)
    onRestoreCombo: (triggerEvery: number) => {
      const counter = (synergy.restoreComboCounters.get(skillId) ?? 0) + 1;
      synergy.restoreComboCounters.set(skillId, counter);
      if (counter >= triggerEvery) {
        synergy.restoreComboCounters.set(skillId, 0);
        if (state.combo === 0 && state.maxCombo > 0) {
          state.combo = Math.floor(state.maxCombo / 2);
          showFeedback(`连击恢复! ${state.combo}`, '#87ceeb');
        }
      }
    },
    onSetWordCooldown: () => {
      synergy.wordCooldowns.add(skillId);
    },
    onTriggerRandomAdjacent: (_depth: number) => {
      if (adjacent.length === 0) return null;
      const pick = adjacent[Math.floor(Math.random() * adjacent.length)];
      setTimeout(() => {
        if (state.phase === 'battle') {
          triggerSkill(pick.skillId, pick.key, true);
        }
      }, 100);
      return emptyPipelineResult();
    },
    onTriggerRowMirror: (_depth: number) => {
      const row = KEYBOARD_ROWS.find(r => r.includes(triggerKey));
      if (!row) return null;
      // 找该行所有有绑定技能的键（按位置排序）
      const boundInRow = row
        .map((k, i) => ({ key: k, index: i, skillId: state.player.bindings.get(k) }))
        .filter(e => e.skillId != null) as { key: string; index: number; skillId: string }[];
      if (boundInRow.length < 2) return null;
      const triggerIndex = row.indexOf(triggerKey);
      const leftmost = boundInRow[0];
      const rightmost = boundInRow[boundInRow.length - 1];
      if (triggerIndex === leftmost.index && rightmost.key !== triggerKey) {
        setTimeout(() => {
          if (state.phase === 'battle') {
            triggerSkill(rightmost.skillId, rightmost.key, true);
          }
        }, 100);
        return emptyPipelineResult();
      }
      if (triggerIndex === rightmost.index && leftmost.key !== triggerKey) {
        setTimeout(() => {
          if (state.phase === 'battle') {
            triggerSkill(leftmost.skillId, leftmost.key, true);
          }
        }, 100);
        return emptyPipelineResult();
      }
      return null;
    },
  };
  BehaviorExecutor.execute(result.pendingBehaviors, 0, callbacks);

  // === Echo 二次触发 ===
  if (shouldEchoRepeat) {
    setTimeout(() => {
      if (state.phase === 'battle') {
        triggerSkill(skillId, triggerKey, true);
      }
    }, 100);
    // echo_resonance 三触发：追加第三次触发
    if (state.player.evolvedSkills.get('echo') === 'echo_resonance') {
      setTimeout(() => {
        if (state.phase === 'battle') {
          triggerSkill(skillId, triggerKey, true);
        }
      }, 200);
    }
    // 连锁放大器：echo 额外触发一次
    if (queryRelicFlag('chain_amplifier') === true) {
      setTimeout(() => {
        if (state.phase === 'battle') {
          triggerSkill(skillId, triggerKey, true);
        }
      }, 300);
    }
  }

  updateHUD();
}

// === 孤狼被动：计算基础倍率加成 ===
export function calculateLonePassiveBonus(): number {
  let bonus = 0;
  for (const [key, skillId] of state.player.bindings) {
    if (SKILLS[skillId]?.type !== 'lone') continue;
    const level = state.player.skills.get(skillId)?.level || 1;
    const baseBonus = (SKILLS[skillId].base + SKILLS[skillId].grow * (level - 1)) / 100;

    const adjacent = ADJACENT_KEYS[key] || [];
    const adjacentSkillCount = adjacent.filter(k => state.player.bindings.has(k)).length;

    const evoId = state.player.evolvedSkills.get(skillId);
    if (evoId === 'lone_hermit') {
      // 隐士：加成×3，但最多装备4个技能
      if (adjacentSkillCount === 0 && state.player.skills.size <= 4) {
        bonus += baseBonus * 3;
      }
    } else if (evoId === 'lone_shadow') {
      // 暗影：允许1个相邻技能，加成×1.5
      if (adjacentSkillCount <= 1) {
        bonus += baseBonus * 1.5;
      }
    } else {
      // 基础：相邻无技能时生效
      if (adjacentSkillCount === 0) {
        bonus += baseBonus;
      }
    }
  }
  return bonus;
}

// === 虚空被动：生成字母底分修饰器 ===
export function getVoidLetterModifiers(): Modifier[] {
  const bonusMap = new Map<string, number>();

  for (const [key, skillId] of state.player.bindings) {
    if (SKILLS[skillId]?.type !== 'void') continue;
    const level = state.player.skills.get(skillId)?.level || 1;
    const bonusPerEmpty = SKILLS[skillId].base + SKILLS[skillId].grow * (level - 1);

    const adjacent = ADJACENT_KEYS[key] || [];
    for (const adjKey of adjacent) {
      if (!state.player.bindings.has(adjKey)) {
        bonusMap.set(adjKey, (bonusMap.get(adjKey) || 0) + bonusPerEmpty);
      }
    }
  }

  const modifiers: Modifier[] = [];
  for (const [key, bonus] of bonusMap) {
    modifiers.push({
      id: `void:${key}:score`,
      source: 'skill:void',
      sourceType: 'skill',
      layer: 'base',
      trigger: 'on_correct_keystroke',
      phase: 'calculate',
      condition: { type: 'key_is', key },
      effect: { type: 'score', value: bonus, stacking: 'additive' },
      priority: 40,
    });
  }
  return modifiers;
}

// === 显示技能触发弹窗 ===
function showTriggerPopup(skillId: string): void {
  const el = getElements();
  const sk = SKILLS[skillId];
  if (!sk) return;

  const display = getSkillDisplayInfo(skillId, state.player.evolvedSkills);
  const p = document.createElement('div');
  p.className = 'skill-trigger-popup';
  p.innerHTML = `<span class="trigger-icon">${display.icon}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);
}
