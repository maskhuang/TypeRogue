// ============================================
// 打字肉鸽 - 技能系统
// ============================================

import { state, synergy } from '../core/state';
import { ADJACENT_KEYS } from '../core/constants';
import { SKILLS } from '../data/skills';
import type { AdjacentSkill } from '../core/types';
import { getElements } from '../ui/elements';
import { playSound } from '../effects/sound';
import { showFeedback, highlightBoundSkill, updateHUD } from './battle';

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

// === 触发技能 ===
export function triggerSkill(skillId: string, triggerKey: string, isEcho = false): void {
  const base = SKILLS[skillId];
  if (!base) return;

  const lvl = state.player.skills.get(skillId)?.level || 1;
  let val = base.base + base.grow * (lvl - 1);

  const adjacent = getAdjacentSkills(triggerKey);
  const emptyCount = getAdjacentEmptyCount(triggerKey);

  // 光环加成
  if (base.type === 'score') {
    const auraBonus = adjacent.filter(a => a.skill.type === 'aura').length;
    if (auraBonus > 0) val = Math.floor(val * 1.5);
  }

  // 涟漪加成
  if (synergy.rippleBonus.has(triggerKey)) {
    val = Math.floor(val * 1.5);
    synergy.rippleBonus.delete(triggerKey);
  }

  showTriggerPopup(skillId);
  highlightBoundSkill(skillId);
  playSound('skill');

  // 记录技能触发（用于孤狼和虚空计算）
  synergy.wordSkillCount++;

  switch (base.type) {
    case 'score':
      state.wordScore += val * state.multiplier;
      showFeedback(`+${Math.floor(val * state.multiplier)}分`, '#4ecdc4');
      break;

    case 'multiply':
      state.multiplier += val / 100;
      showFeedback(`倍率+${(val / 100).toFixed(1)}`, '#ffe66d');
      break;

    case 'time':
      state.time = Math.min(state.time + val, state.timeMax + 10);
      showFeedback(`+${val}秒`, '#87ceeb');
      break;

    case 'combo':
      state.combo += val;
      state.multiplier = state.player.baseMultiplier + state.combo * state.player.comboBonus;
      showFeedback(`连击+${val}`, '#ff6b6b');
      break;

    case 'protect':
      synergy.shieldCount += val;
      showFeedback(`护盾+${val}`, '#87ceeb');
      break;

    // 联动技能
    case 'core': {
      const coreScore = val + adjacent.length * 2;
      state.wordScore += coreScore * state.multiplier;
      showFeedback(`核心+${Math.floor(coreScore * state.multiplier)}`, '#9b59b6');
      break;
    }

    case 'aura':
      // 被动效果，自身触发小分数
      state.wordScore += (val / 3) * state.multiplier;
      break;

    case 'lone': {
      // 孤狼：如果本词无其他技能触发，+分数
      // wordSkillCount已经包含了自己，所以检查是否为1
      const otherSkills = synergy.wordSkillCount - 1;
      if (otherSkills === 0) {
        const loneScore = val * state.multiplier;
        state.wordScore += loneScore;
        showFeedback(`孤狼! +${Math.floor(loneScore)}`, '#e74c3c');
      } else {
        showFeedback(`孤狼失效...`, '#666');
      }
      break;
    }

    case 'echo':
      if (!isEcho) {
        for (const adj of adjacent) {
          setTimeout(() => {
            if (state.phase === 'battle') {
              triggerSkill(adj.skillId, adj.key, true);
            }
          }, 100);
        }
        showFeedback('共鸣!', '#e056fd');
      }
      break;

    case 'void': {
      // 虚空：+分数，本词每有一个其他技能触发-1分
      const otherSkills = synergy.wordSkillCount - 1;
      const voidScore = Math.max(0, val - otherSkills);
      state.wordScore += voidScore * state.multiplier;
      if (otherSkills > 0) {
        showFeedback(`虚空+${Math.floor(voidScore * state.multiplier)} (-${otherSkills})`, '#2c3e50');
      } else {
        showFeedback(`虚空+${Math.floor(voidScore * state.multiplier)}`, '#2c3e50');
      }
      break;
    }

    case 'ripple':
      state.wordScore += val * state.multiplier;
      for (const adj of adjacent) {
        synergy.rippleBonus.set(adj.key, 1.5);
      }
      showFeedback(`涟漪→${adjacent.length}`, '#3498db');
      break;
  }

  // 共鸣被动
  if (!isEcho) {
    const adjacentEchoes = adjacent.filter(a => a.skill.type === 'echo');
    for (const echoAdj of adjacentEchoes) {
      if (!synergy.echoTrigger.has(echoAdj.key) && Math.random() < 0.3) {
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
