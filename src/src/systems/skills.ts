// ============================================
// 打字肉鸽 - 技能系统
// ============================================
// Story 11.5: Modifier 管道集成

import { state, synergy } from '../core/state';
import { ADJACENT_KEYS, KEYBOARD_ROWS } from '../core/constants';
import { SKILLS, SKILL_MODIFIER_DEFS, isPassiveSkill } from '../data/skills';
import type { AdjacentSkill } from '../core/types';
import type { PipelineContext, EffectAccumulator, BehaviorCallbacks, PipelineResult, ModifierTrigger } from './modifiers/ModifierTypes';
import { ModifierRegistry } from './modifiers/ModifierRegistry';
import { EffectPipeline } from './modifiers/EffectPipeline';
import { BehaviorExecutor } from './modifiers/BehaviorExecutor';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { showFeedback, highlightBoundSkill, updateHUD } from './battle';
import { injectRelicModifiers } from './relics/RelicPipeline';

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

// === 构建管道上下文 ===
export function buildTriggerContext(triggerKey: string, adjacent: AdjacentSkill[]): PipelineContext {
  return {
    combo: state.combo,
    hasError: !state.wordPerfect,
    adjacentSkillCount: adjacent.length,
    adjacentEmptyCount: getAdjacentEmptyCount(triggerKey),
    adjacentSkillTypes: adjacent.map(a => a.skill.type),
    skillsTriggeredThisWord: synergy.wordSkillCount,
    shieldCount: synergy.shieldCount,
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
  const factory = SKILL_MODIFIER_DEFS[skillId];
  if (!factory) return registry;

  // 注册触发技能自身的 base 层 Modifier（enhance/global 来自相邻技能）
  let mods = factory(skillId, level, context);

  // isEcho 时过滤掉链式行为（防止 echo 双触发中重复设置标记）
  if (isEcho) {
    mods = mods.filter(m =>
      m.behavior?.type !== 'trigger_adjacent' &&
      m.behavior?.type !== 'set_echo_flag' &&
      m.behavior?.type !== 'set_ripple_flag'
    );
  }
  registry.registerMany(mods.filter(m => m.layer === 'base'));

  // 注册相邻技能的 enhance/global 层 Modifier
  const adjacent = adjacentOverride ?? getAdjacentSkills(triggerKey);
  for (const adj of adjacent) {
    const adjFactory = SKILL_MODIFIER_DEFS[adj.skillId];
    if (!adjFactory) continue;
    const adjLvl = state.player.skills.get(adj.skillId)?.level || 1;
    const adjMods = adjFactory(adj.skillId, adjLvl, context);
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
    const rowFactory = SKILL_MODIFIER_DEFS[rowSkill.skillId];
    if (!rowFactory) continue;
    const rowLvl = state.player.skills.get(rowSkill.skillId)?.level || 1;
    const rowMods = rowFactory(rowSkill.skillId, rowLvl, context);
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
    case 'lone': {
      if (effects.score > 0) {
        return { text: `孤狼! +${Math.floor(effects.score * state.multiplier)}`, color: '#e74c3c' };
      }
      return { text: '孤狼失效...', color: '#666' };
    }
    case 'echo':
      return { text: '回响→双触发', color: '#e056fd' };
    case 'void': {
      const otherSkills = Math.max(0, (context.skillsTriggeredThisWord ?? 0) - 1);
      const displayScore = Math.floor(effects.score * state.multiplier);
      if (otherSkills > 0) {
        return { text: `虚空+${displayScore} (-${otherSkills})`, color: '#2c3e50' };
      }
      return { text: `虚空+${displayScore}`, color: '#2c3e50' };
    }
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

// === 技能事件解析（非触发事件：on_error, on_word_complete） ===
export function resolveSkillEventModifiers(
  trigger: ModifierTrigger,
  context: PipelineContext,
  behaviorCallbacks?: BehaviorCallbacks,
): PipelineResult {
  const registry = new ModifierRegistry();
  state.player.skills.forEach((data, skillId) => {
    const factory = SKILL_MODIFIER_DEFS[skillId];
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

  // 应用数值效果
  applyEffects(result.effects);

  // === Ripple 传递：应用上一个技能存储的效果 ===
  if (synergy.ripplePassthrough !== null) {
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
  }

  updateHUD();
}

// === 显示技能触发弹窗 ===
function showTriggerPopup(skillId: string): void {
  const el = getElements();
  const sk = SKILLS[skillId];
  if (!sk) return;

  const p = document.createElement('div');
  p.className = 'skill-trigger-popup';
  p.innerHTML = `<span class="trigger-icon">${sk.icon}</span>`;
  p.style.left = (Math.random() * 60 - 30) + 'px';
  el.triggerZone.appendChild(p);
  setTimeout(() => p.remove(), 350);
}
