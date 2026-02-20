// ============================================
// 打字肉鸽 - 技能系统
// ============================================
// Story 11.5: Modifier 管道集成

import { state, synergy } from '../core/state';
import { ADJACENT_KEYS } from '../core/constants';
import { SKILLS, SKILL_MODIFIER_DEFS } from '../data/skills';
import type { AdjacentSkill } from '../core/types';
import type { PipelineContext, EffectAccumulator, BehaviorCallbacks, PipelineResult } from './modifiers/ModifierTypes';
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

  // isEcho 时过滤掉 trigger_adjacent 行为
  if (isEcho) {
    mods = mods.filter(m => m.behavior?.type !== 'trigger_adjacent');
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

  // 遗物 global 层注入（如 golden_keyboard 技能效果 +25%）
  injectRelicModifiers(registry, context);

  // 涟漪加成：global 层临时 Modifier
  if (synergy.rippleBonus.has(triggerKey)) {
    registry.register({
      id: 'bonus:ripple',
      source: 'bonus:ripple',
      sourceType: 'passive',
      layer: 'global',
      trigger: 'on_skill_trigger',
      phase: 'calculate',
      effect: { type: 'score', value: 1.5, stacking: 'multiplicative' },
      priority: 200,
    });
    synergy.rippleBonus.delete(triggerKey);
  }

  return registry;
}

// === 应用效果到游戏状态 ===
export function applyEffects(effects: EffectAccumulator): void {
  if (effects.score > 0) {
    state.wordScore += effects.score * state.multiplier;
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
      return { text: `核心+${Math.floor(effects.score * state.multiplier)}`, color: '#9b59b6' };
    case 'aura':
      return null; // 静默
    case 'lone': {
      if (effects.score > 0) {
        return { text: `孤狼! +${Math.floor(effects.score * state.multiplier)}`, color: '#e74c3c' };
      }
      return { text: '孤狼失效...', color: '#666' };
    }
    case 'echo':
      return { text: '共鸣!', color: '#e056fd' };
    case 'void': {
      const otherSkills = Math.max(0, (context.skillsTriggeredThisWord ?? 0) - 1);
      const displayScore = Math.floor(effects.score * state.multiplier);
      if (otherSkills > 0) {
        return { text: `虚空+${displayScore} (-${otherSkills})`, color: '#2c3e50' };
      }
      return { text: `虚空+${displayScore}`, color: '#2c3e50' };
    }
    case 'ripple':
      return { text: `涟漪→${context.adjacentSkillCount ?? 0}`, color: '#3498db' };
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
    default:
      return null;
  }
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

  // 显示反馈
  const fb = generateFeedback(skillId, result.effects, context);
  if (fb) {
    showFeedback(fb.text, fb.color);
  }

  // 执行行为（echo trigger_adjacent, ripple buff_next_skill）
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
    onBuffNextSkill: (_multiplier: number) => {
      for (const adj of adjacent) {
        synergy.rippleBonus.set(adj.key, 1.5);
      }
    },
  };
  BehaviorExecutor.execute(result.pendingBehaviors, 0, callbacks);

  // echo 被动：相邻 echo 技能概率触发
  if (!isEcho) {
    const adjacentEchoes = adjacent.filter(a => a.skill.type === 'echo');
    for (const echoAdj of adjacentEchoes) {
      const echoLvl = state.player.skills.get(echoAdj.skillId)?.level || 1;
      const echoProb = (echoAdj.skill.base + echoAdj.skill.grow * (echoLvl - 1)) / 100;
      if (!synergy.echoTrigger.has(echoAdj.key) && Math.random() < echoProb) {
        synergy.echoTrigger.add(echoAdj.key);
        setTimeout(() => {
          if (state.phase === 'battle') {
            triggerSkill(echoAdj.skillId, echoAdj.key, true);
          }
        }, 150);
      }
    }
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
