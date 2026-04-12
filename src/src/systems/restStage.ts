// ============================================
// 打字肉鸽 - 休息关系统（多选项制）
// ============================================
// 休息关展示一组选项（基础→职业→遗物），玩家选其一。

import { state } from '../core/state';
import { buildRestOptions } from '../data/restEvents';
import type { RestOption } from '../data/restEvents';
import { RELICS } from '../data/relics';
import { showScreen, startLevel, renderRelicDisplay } from './battle';
import { openShop } from './shop';
import { getNextBattleNode } from './stage/stageFlow';
import { queryRelicFlag } from './relics/RelicPipeline';
import { playSound } from '../effects/sound';
import { t, localizeItemName } from '../demo/demo-i18n';
import { grantIntermissionFreeRefreshes } from './relics/StageRelicBehaviors';
import { applyAffixLevelScaling } from '../data/affixes';
import { BALANCE } from '../core/constants';

// 休息关升级后需要补偿附魔的技能ID
const _pendingEnchantSkillIds: string[] = [];

/** 消费并返回待附魔的技能ID列表 */
export function consumePendingEnchantSkillIds(): string[] {
  return _pendingEnchantSkillIds.splice(0);
}

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

  // 升级事件：弹出三选一 UI
  if (option.effectId === 'rest_upgrade_skill') {
    showUpgradeChoice((chosen) => {
      const resultText = document.getElementById('rest-result-text');
      if (resultText) resultText.textContent = chosen
        ? t('rest.upgrade.r', { name: localizeItemName(chosen.id, chosen.name), level: chosen.newLevel })
        : t('rest.upgrade.no_skill');
      resultEl.classList.remove('rest-result-hidden');
      continueBtn.onclick = () => completeRestStage();
      playSound('skill');
    });
    return;
  }

  const resultMessage = executeEffect(option.effectId);

  const resultText = document.getElementById('rest-result-text');
  if (resultText) resultText.textContent = resultMessage;
  resultEl.classList.remove('rest-result-hidden');
  continueBtn.onclick = () => completeRestStage();

  playSound('skill');
}

/** 显示升级三选一面板 */
function showUpgradeChoice(onPick: (chosen: { id: string; name: string; newLevel: number } | null) => void): void {
  const TARGET_LEVEL = 3;
  const candidates = [...state.player.skills.entries()]
    .filter(([, data]) => data.level < TARGET_LEVEL)
    .map(([skillId, data]) => ({ skillId, data, affix: state.affixSkills.get(skillId)! }))
    .filter(c => c.affix);

  if (candidates.length === 0) { onPick(null); return; }

  // 随机选 3 个候选（不足 3 时全部显示）
  const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 3);

  const overlay = document.createElement('div');
  overlay.className = 'ritual-enchantment-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';

  const panel = document.createElement('div');
  panel.className = 'ritual-enchantment-panel';
  panel.style.cssText = 'background:#1a1a2e;border:2px solid #ffd700;padding:24px;max-width:500px;text-align:center;';
  panel.innerHTML = `<h3 style="color:#ffd700;margin:0 0 16px;">${t('rest.upgrade_pick_title')}</h3>`;

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  for (const c of shuffled) {
    const btn = document.createElement('button');
    btn.className = 'ritual-skill-btn';
    btn.innerHTML = `<span class="ritual-skill-icon">${c.affix.icon}</span><span class="ritual-skill-name">${c.affix.name} Lv.${c.data.level} → Lv.${TARGET_LEVEL}</span>`;
    btn.onclick = () => {
      const levelsToGain = TARGET_LEVEL - c.data.level;
      c.data.level = TARGET_LEVEL;
      applyAffixLevelScaling(c.affix.affixes, levelsToGain);
      _pendingEnchantSkillIds.push(c.skillId);
      overlay.remove();
      onPick({ id: c.skillId, name: c.affix.name, newLevel: TARGET_LEVEL });
    };
    list.appendChild(btn);
  }
  panel.appendChild(list);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// === 完成休息关 ===
function completeRestStage(): void {
  const nextBattle = getNextBattleNode(state.level);
  state.level = nextBattle;
  openShop();
}

// === 执行事件效果 ===
export function executeEffect(effectId: string): string {
  // 当前周目剩余关卡数作为 buff 过期节点
  const cycleEnd = state.level + (BALANCE.CYCLE_LENGTH - ((state.level - 1) % BALANCE.CYCLE_LENGTH));

  switch (effectId) {
    case 'rest_upgrade_skill': {
      const upgraded = upgradeRandomSkill();
      if (!upgraded) return t('rest.upgrade.no_skill');
      // 标记需要在下次商店时补偿附魔
      _pendingEnchantSkillIds.push(upgraded.id);
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
  const TARGET_LEVEL = 3;
  const upgradable = [...state.player.skills.entries()]
    .filter(([, data]) => data.level < TARGET_LEVEL);
  if (upgradable.length === 0) return null;
  const [skillId, data] = upgradable[Math.floor(Math.random() * upgradable.length)];
  const levelsToGain = TARGET_LEVEL - data.level;
  data.level = TARGET_LEVEL;
  const affixSkill = state.affixSkills.get(skillId);
  if (affixSkill) applyAffixLevelScaling(affixSkill.affixes, levelsToGain);
  return affixSkill ? { id: skillId, name: affixSkill.name, newLevel: TARGET_LEVEL } : null;
}
