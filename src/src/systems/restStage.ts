// ============================================
// 打字肉鸽 - 休息关系统
// ============================================
// Story 18.3: 休息关随机事件场景

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { drawRestEvent } from '../data/restEvents';
import type { RestEvent, RestEventOption } from '../data/restEvents';
import { RELICS } from '../data/relics';
import { PRODUCERS } from '../data/producers';
import { CONVERTERS } from '../data/converters';
import { CONNECTORS, REPLICATORS } from '../data/connectors';
import { showScreen, startLevel, renderRelicDisplay } from './battle';
import { getNextBattleNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { getBossModifierMeta } from '../data/bossModifiers';
import { queryRelicFlag } from './relics/RelicPipeline';
import { playSound } from '../effects/sound';
import { t, localizeItemName } from '../demo/demo-i18n';

let currentEvent: RestEvent | null = null;

// === 打开休息关 ===
export function openRestStage(): void {
  state.phase = 'rest';

  // 抽取事件
  currentEvent = drawRestEvent(state.usedRestEvents, state);

  // 渲染 UI
  const actNum = getActForNode(state.level);
  const actLabel = document.getElementById('rest-act-label');
  if (actLabel) actLabel.textContent = t('rest.act_end', { act: actNum });

  const iconEl = document.getElementById('rest-event-icon');
  const nameEl = document.getElementById('rest-event-name');
  const descEl = document.getElementById('rest-event-desc');
  const optionsEl = document.getElementById('rest-options');
  const resultEl = document.getElementById('rest-result');
  const continueBtn = document.getElementById('rest-continue-btn');

  if (!iconEl || !nameEl || !descEl || !optionsEl || !resultEl || !continueBtn) return;

  // 隐藏结果区域
  resultEl.classList.add('rest-result-hidden');

  if (!currentEvent) {
    // 无可用事件 — 显示安静休息
    iconEl.textContent = '🌙';
    nameEl.textContent = t('rest.quiet_name');
    descEl.textContent = t('rest.quiet_desc');
    optionsEl.innerHTML = '';
    resultEl.classList.remove('rest-result-hidden');
    const resultText = document.getElementById('rest-result-text');
    if (resultText) resultText.textContent = t('rest.quiet_done');
    continueBtn.onclick = () => completeRestStage();
  } else {
    // 记录已使用
    state.usedRestEvents.push(currentEvent.id);

    iconEl.textContent = currentEvent.icon;
    nameEl.textContent = currentEvent.name;
    descEl.textContent = currentEvent.description;
    optionsEl.innerHTML = '';

    currentEvent.options.forEach((option) => {
      const btn = document.createElement('button');
      btn.className = 'rest-option-btn';
      btn.innerHTML = `
        <span class="option-label">${option.label}</span>
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
  option: RestEventOption,
  optionsEl: HTMLElement,
  resultEl: HTMLElement,
  continueBtn: HTMLElement,
): void {
  // 禁用所有选项按钮
  const buttons = optionsEl.querySelectorAll('.rest-option-btn');
  buttons.forEach(btn => {
    (btn as HTMLButtonElement).disabled = true;
    (btn as HTMLElement).style.opacity = '0.4';
    (btn as HTMLElement).style.pointerEvents = 'none';
  });

  // 执行效果
  const resultMessage = executeEffect(option.effectId);

  // 显示结果
  const resultText = document.getElementById('rest-result-text');
  if (resultText) resultText.textContent = resultMessage;
  resultEl.classList.remove('rest-result-hidden');
  continueBtn.onclick = () => completeRestStage();

  playSound('skill');
}

// === 完成休息关 ===
function completeRestStage(): void {
  currentEvent = null;

  // 推进到下一个战斗节点
  const nextBattle = getNextBattleNode(state.level);
  if (nextBattle === -1 || nextBattle > TOTAL_NODES) {
    // 不应到达这里，Boss 关不经过休息关
    return;
  }
  state.level = nextBattle;
  void startLevel();
}

// === 执行事件效果 ===
export function executeEffect(effectId: string): string {
  switch (effectId) {
    case 'noop':
      return t('rest.noop');

    case 'merchant_rare_relic': {
      const cost = Math.floor(state.gold * 0.5);
      state.gold -= cost;
      const relicId = grantRandomRelic('rare');
      if (relicId) {
        const relic = RELICS[relicId];
        return t('rest.merchant.rare', { cost, icon: relic.icon, name: localizeItemName(relicId, relic.name) });
      }
      return t('rest.merchant.rare_fail', { cost });
    }
    case 'merchant_common_relic': {
      const relicId = grantRandomRelic('common');
      if (relicId) {
        const relic = RELICS[relicId];
        return t('rest.merchant.common', { icon: relic.icon, name: localizeItemName(relicId, relic.name) });
      }
      return t('rest.merchant.common_fail');
    }

    case 'trial_power': {
      const actEnd = getNextActEndNode(state.level);
      state.tempBuffs.push({ type: 'multiplier', value: 1.0, expiresAtNode: actEnd });
      state.tempBuffs.push({ type: 'time', value: -10, expiresAtNode: actEnd });
      return t('rest.trial.power_r');
    }
    case 'trial_endurance': {
      const actEnd = getNextActEndNode(state.level);
      state.tempBuffs.push({ type: 'time', value: 15, expiresAtNode: actEnd });
      state.tempBuffs.push({ type: 'multiplier', value: -0.5, expiresAtNode: actEnd });
      return t('rest.trial.endurance_r');
    }

    case 'altar_upgrade': {
      const removed = removeRandomSkill();
      if (!removed) return t('rest.altar.no_skill');
      const newSkillId = grantRandomNewSkill();
      if (newSkillId) {
        const newSk = PRODUCERS[newSkillId] || CONVERTERS[newSkillId] || CONNECTORS[newSkillId] || REPLICATORS[newSkillId];
        return t('rest.altar.upgrade_r', { removed: localizeItemName(removed.id, removed.name), icon: newSk.icon, name: localizeItemName(newSkillId, newSk.name) });
      }
      return t('rest.altar.upgrade_fail', { removed: localizeItemName(removed.id, removed.name) });
    }
    case 'altar_gold': {
      const removed = removeRandomSkill();
      if (!removed) return t('rest.altar.no_skill');
      state.gold += 200;
      return t('rest.altar.gold_r', { removed: localizeItemName(removed.id, removed.name) });
    }

    case 'gamble_bet': {
      if (state.gold < 100) return t('rest.gamble.no_gold');
      state.gold -= 100;
      if (Math.random() < 0.5) {
        state.gold += 300;
        return t('rest.gamble.win');
      } else {
        return t('rest.gamble.lose');
      }
    }

    case 'forge_relic_to_skill': {
      const removed = removeRandomRelic();
      if (!removed) return t('rest.forge.no_relic');
      const upgraded = upgradeRandomSkill();
      if (upgraded) {
        return t('rest.forge.relic_r', { icon: removed.icon, name: localizeItemName(removed.id, removed.name), skill: localizeItemName(upgraded.id, upgraded.name), level: upgraded.newLevel });
      }
      return t('rest.forge.relic_fail', { icon: removed.icon, name: localizeItemName(removed.id, removed.name) });
    }
    case 'forge_skill_to_relic': {
      const removed = removeRandomSkill();
      if (!removed) return t('rest.forge.no_skill');
      const relicId = grantRandomRelic();
      if (relicId) {
        const relic = RELICS[relicId];
        return t('rest.forge.skill_r', { removed: localizeItemName(removed.id, removed.name), icon: relic.icon, name: localizeItemName(relicId, relic.name) });
      }
      return t('rest.forge.skill_fail', { removed: localizeItemName(removed.id, removed.name) });
    }

    case 'rift_skip': {
      const next1 = getNextBattleNode(state.level);
      if (next1 > 0) {
        const next2 = getNextBattleNode(next1);
        if (next2 > 0 && next2 <= TOTAL_NODES) {
          state.level = next1;
          return t('rest.rift.skip_r', { level: next2 });
        }
      }
      return t('rest.rift.skip_fail');
    }
    case 'rift_replay': {
      state.gold += 50;
      return t('rest.rift.replay_r');
    }

    case 'curse_accept': {
      const boundKeys = [...state.player.bindings.keys()];
      const sealed: string[] = [];
      const shuffled = [...boundKeys].sort(() => Math.random() - 0.5);
      const expireNode = getNextActEndNode(state.level);
      for (let i = 0; i < Math.min(2, shuffled.length); i++) {
        const key = shuffled[i];
        const skillId = state.player.bindings.get(key)!;
        state.player.bindings.delete(key);
        state.sealedKeys.push({ key, skillId, expiresAtNode: expireNode });
        sealed.push(key.toUpperCase());
      }
      state.gold += 150;
      const relicId = grantRandomRelic();
      const relicMsg = relicId ? t('rest.curse.relic_bonus', { icon: RELICS[relicId].icon, name: localizeItemName(relicId, RELICS[relicId].name) }) : '';
      return t('rest.curse.r', { keys: sealed.join(', '), relic: relicMsg });
    }

    case 'copy_skill': {
      const upgraded = upgradeRandomSkill();
      if (!upgraded) return t('rest.copier.no_skill');
      const actEnd = getNextActEndNode(state.level);
      state.tempBuffs.push({ type: 'targetScore', value: 1.5, expiresAtNode: actEnd });
      return t('rest.copier.r', { name: localizeItemName(upgraded.id, upgraded.name), level: upgraded.newLevel });
    }

    case 'wheel_spin': {
      const outcomes = [
        () => { state.gold += 150; return t('rest.wheel.gold', { gold: 150 }); },
        () => {
          const relicId = grantRandomRelic();
          if (relicId) return t('rest.wheel.relic', { icon: RELICS[relicId].icon, name: localizeItemName(relicId, RELICS[relicId].name) });
          state.gold += 100; return t('rest.wheel.gold', { gold: 100 });
        },
        () => {
          const cost = Math.floor(state.gold * 0.3);
          state.gold -= cost;
          return t('rest.wheel.lose_gold', { cost });
        },
        () => {
          const actEnd = getNextActEndNode(state.level);
          state.tempBuffs.push({ type: 'multiplier', value: -0.5, expiresAtNode: actEnd });
          return t('rest.wheel.lose_mult');
        },
      ];
      const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
      return t('rest.wheel.prefix') + pick();
    }

    case 'meditate_preview': {
      const mods = state.bossModifierPool;
      if (mods.length === 0) return t('rest.meditate.empty');
      const previews = mods.map((id, i) => {
        const meta = getBossModifierMeta(id);
        return meta ? t('rest.meditate.modifier', { idx: ['A', 'B', 'C'][i], icon: meta.icon, name: meta.name, hint: meta.eliteHint }) : '';
      }).filter(Boolean);
      return t('rest.meditate.result', { previews: previews.join('\n') });
    }
    case 'meditate_gold': {
      state.gold += 80;
      return t('rest.meditate.gold_r');
    }

    default:
      return t('rest.default');
  }
}

// === 辅助函数 ===

/** 获取指定节点所在 Act 的结束节点 */
function getActEndNode(nodeId: number): number {
  const act = getActForNode(nodeId);
  // Act 1 结束 = Node 4, Act 2 结束 = Node 8, Act 3 = Node 10
  if (act === 1) return 4;
  if (act === 2) return 8;
  return 10;
}

/** 获取下一个 Act 的结束节点（用于休息关"下一 Act"效果） */
function getNextActEndNode(currentNode: number): number {
  const nextBattle = getNextBattleNode(currentNode);
  return nextBattle > 0 ? getActEndNode(nextBattle) : getActEndNode(currentNode);
}

/** 授予随机遗物，返回遗物 ID 或 null */
function grantRandomRelic(targetRarity?: string): string | null {
  const owned = state.player.relics;
  let available = Object.keys(RELICS).filter(id => !owned.has(id));
  if (targetRarity) {
    const filtered = available.filter(id => RELICS[id].rarity === targetRarity);
    if (filtered.length > 0) available = filtered;
  }
  if (available.length === 0) return null;
  if (isRelicSlotsFull()) return null;
  const relicId = available[Math.floor(Math.random() * available.length)];
  addRelicWithCapacity(relicId);
  renderRelicDisplay();
  return relicId;
}

/** 移除随机遗物，返回移除的遗物信息 */
function removeRandomRelic(): { id: string; name: string; icon: string } | null {
  const relicIds = [...state.player.relics];
  if (relicIds.length === 0) return null;
  const relicId = relicIds[Math.floor(Math.random() * relicIds.length)];
  const relic = RELICS[relicId];
  state.player.relics.delete(relicId);
  renderRelicDisplay();
  return relic ? { id: relicId, name: relic.name, icon: relic.icon } : null;
}

/** 移除随机技能（含绑定和进化清理），返回技能名 */
function removeRandomSkill(): { id: string; name: string } | null {
  const skillIds = [...state.player.skills.keys()];
  if (skillIds.length === 0) return null;
  const skillId = skillIds[Math.floor(Math.random() * skillIds.length)];
  const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId];

  // 移除绑定
  for (const [key, id] of state.player.bindings) {
    if (id === skillId) {
      state.player.bindings.delete(key);
      break;
    }
  }
  // 移除进化
  state.player.evolvedSkills.delete(skillId);
  // 移除技能
  state.player.skills.delete(skillId);

  return sk ? { id: skillId, name: sk.name } : null;
}

/** 授予随机新技能（未拥有的），返回技能 ID 或 null */
function grantRandomNewSkill(): string | null {
  // T4 极简主义：技能数量已达上限时不授予
  const maxSkillCount = queryRelicFlag('max_skill_count') as number;
  if (maxSkillCount !== Infinity && state.player.skills.size >= maxSkillCount) return null;

  const owned = [...state.player.skills.keys()];
  const available = [...Object.keys(PRODUCERS), ...Object.keys(CONVERTERS), ...Object.keys(CONNECTORS), ...Object.keys(REPLICATORS)].filter(id => !owned.includes(id));
  if (available.length === 0) return null;
  const skillId = available[Math.floor(Math.random() * available.length)];
  state.player.skills.set(skillId, { level: 1 });
  return skillId;
}

/** 升级随机已有技能（未满级的），返回信息 */
function upgradeRandomSkill(): { id: string; name: string; newLevel: number } | null {
  const maxSkillLevel = queryRelicFlag('max_skill_level') as number;
  const levelCap = maxSkillLevel === Infinity ? 3 : maxSkillLevel;
  const upgradable = [...state.player.skills.entries()]
    .filter(([, data]) => data.level < levelCap);
  if (upgradable.length === 0) return null;
  const [skillId, data] = upgradable[Math.floor(Math.random() * upgradable.length)];
  data.level++;
  const sk = PRODUCERS[skillId] || CONVERTERS[skillId] || CONNECTORS[skillId] || REPLICATORS[skillId];
  return sk ? { id: skillId, name: sk.name, newLevel: data.level } : null;
}
