// ============================================
// 打字肉鸽 - 休息关系统（多选项制）
// ============================================
// 休息关展示一组选项（基础→职业→遗物），玩家选其一。

import { state } from '../core/state';
import { buildRestOptions } from '../data/restEvents';
import type { RestOption } from '../data/restEvents';
import { RELICS } from '../data/relics';
import { showScreen, startLevel, renderRelicDisplay } from './battle';
import { getNextBattleNode } from './stage/stageFlow';
import { queryRelicFlag } from './relics/RelicPipeline';
import { playSound } from '../effects/sound';
import { t, localizeItemName } from '../demo/demo-i18n';
import { grantIntermissionFreeRefreshes } from './relics/StageRelicBehaviors';
import { applyAffixLevelScaling } from '../data/affixes';
import { BALANCE } from '../core/constants';

// === 打开休息关 ===
export function openRestStage(): void {
  state.phase = 'rest';

  const options = buildRestOptions(state);

  // 渲染 UI
  const actLabel = document.getElementById('rest-act-label');
  if (actLabel) actLabel.textContent = t('rest.cycle_label', { cycle: state.cycle });

  const iconEl = document.getElementById('rest-event-icon');
  const nameEl = document.getElementById('rest-event-name');
  const descEl = document.getElementById('rest-event-desc');
  const optionsEl = document.getElementById('rest-options');
  const resultEl = document.getElementById('rest-result');
  const continueBtn = document.getElementById('rest-continue-btn');

  if (!iconEl || !nameEl || !descEl || !optionsEl || !resultEl || !continueBtn) return;

  // 隐藏结果区域
  resultEl.classList.add('rest-result-hidden');

  // 固定标题
  iconEl.textContent = '🌙';
  nameEl.textContent = t('rest.menu_title');
  descEl.textContent = t('rest.menu_desc');
  optionsEl.innerHTML = '';

  if (options.length === 0) {
    // 没有可选选项（极端情况）
    resultEl.classList.remove('rest-result-hidden');
    const resultText = document.getElementById('rest-result-text');
    if (resultText) resultText.textContent = t('rest.quiet_done');
    continueBtn.onclick = () => completeRestStage();
  } else {
    options.forEach((option) => {
      const btn = document.createElement('button');
      btn.className = 'rest-option-btn';
      btn.innerHTML = `
        <span class="option-label">${option.icon} ${option.label}</span>
        <span class="option-desc">${option.description}</span>
      `;
      btn.onclick = () => handleOptionSelect(option, optionsEl, resultEl, continueBtn);
      optionsEl.appendChild(btn);
    });
  }

  showScreen('rest');
  playSound('levelup');
}

// === 处理选项选择 ===
function handleOptionSelect(
  option: RestOption,
  optionsEl: HTMLElement,
  resultEl: HTMLElement,
  continueBtn: HTMLElement,
): void {
  const buttons = optionsEl.querySelectorAll('.rest-option-btn');
  buttons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = true;
    (btn as HTMLElement).style.opacity = '0.4';
    (btn as HTMLElement).style.pointerEvents = 'none';
  });

  const resultMessage = executeEffect(option.effectId);

  const resultText = document.getElementById('rest-result-text');
  if (resultText) resultText.textContent = resultMessage;
  resultEl.classList.remove('rest-result-hidden');
  continueBtn.onclick = () => completeRestStage();

  playSound('skill');
}

// === 完成休息关 ===
function completeRestStage(): void {
  const nextBattle = getNextBattleNode(state.level);
  state.level = nextBattle;
  void startLevel();
}

// === 执行事件效果 ===
export function executeEffect(effectId: string): string {
  // 当前周目剩余关卡数作为 buff 过期节点
  const cycleEnd = state.level + (BALANCE.CYCLE_LENGTH - ((state.level - 1) % BALANCE.CYCLE_LENGTH));

  switch (effectId) {
    case 'rest_upgrade_skill': {
      const upgraded = upgradeRandomSkill();
      if (!upgraded) return t('rest.upgrade.no_skill');
      return t('rest.upgrade.r', { name: localizeItemName(upgraded.id, upgraded.name), level: upgraded.newLevel });
    }

    case 'rest_temp_buff': {
      state.tempBuffs.push({ type: 'time', value: 8, expiresAtNode: cycleEnd });
      state.tempBuffs.push({ type: 'multiplier', value: 0.5, expiresAtNode: cycleEnd });
      return t('rest.buff.r');
    }

    case 'relic_intermission': {
      state.gold += 25;
      grantIntermissionFreeRefreshes(2);
      return t('rest.intermission.r');
    }

    case 'relic_gamble': {
      if (state.gold < 100) return t('rest.gamble.no_gold');
      state.gold -= 100;
      if (Math.random() < 0.6) {
        state.gold += 300;
        return t('rest.gamble.win');
      } else {
        return t('rest.gamble.lose');
      }
    }

    default:
      return t('rest.default');
  }
}

// === 辅助函数 ===

function upgradeRandomSkill(): { id: string; name: string; newLevel: number } | null {
  const maxSkillLevel = queryRelicFlag('max_skill_level') as number;
  const levelCap = maxSkillLevel === Infinity ? 3 : maxSkillLevel;
  const upgradable = [...state.player.skills.entries()]
    .filter(([, data]) => data.level < levelCap);
  if (upgradable.length === 0) return null;
  const [skillId, data] = upgradable[Math.floor(Math.random() * upgradable.length)];
  data.level++;
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) applyAffixLevelScaling(affixSkill.affixes, 1);
  return affixSkill ? { id: skillId, name: affixSkill.name, newLevel: data.level } : null;
}
