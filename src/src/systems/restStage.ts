// ============================================
// 打字肉鸽 - 休息关系统
// ============================================
// Story 18.3: 休息关随机事件场景

import { state, isRelicSlotsFull, addRelicWithCapacity } from '../core/state';
import { drawRestEvent } from '../data/restEvents';
import type { RestEvent, RestEventOption } from '../data/restEvents';
import { RELICS } from '../data/relics';
import { showScreen, startLevel, renderRelicDisplay } from './battle';
import { getNextBattleNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { getBossModifierMeta } from '../data/bossModifiers';
import { queryRelicFlag } from './relics/RelicPipeline';
import { checkIntermission, grantIntermissionFreeRefreshes } from './relics/StageRelicBehaviors';
import { playSound } from '../effects/sound';
import { t, localizeItemName } from '../demo/demo-i18n';
import { sealSkillKeys, unbindSkill, getBindingState } from './bindingManager';
import { shouldShowRitual, openRitualEnchantment, getEligibleSkills, generateRitualCandidates, pickRitualChoices, applyRitualEnchantment } from './ritualEnchantment';
import { random } from '../core/seededRandom';
import type { RitualCandidate } from './ritualEnchantment';
import { getEnchantmentDisplayInfo } from './shop';
import type { EnchantmentType } from '../data/affixes';

let currentEvent: RestEvent | null = null;

// === 打开休息关 ===
export function openRestStage(): void {
  state.phase = 'rest';

  // Story 36.10: 幕间准备 — 休息关额外金币 + 免费刷新
  const intermission = checkIntermission();
  if (intermission) {
    state.gold += intermission.gold;
    grantIntermissionFreeRefreshes(intermission.freeRefreshes);
  }

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

  // Story 41.1: Act 1→2 转折时触发仪式附魔
  if (shouldShowRitual(state.level)) {
    const nextBattle = getNextBattleNode(state.level);
    if (nextBattle === -1 || nextBattle > TOTAL_NODES) return;
    openRitualEnchantment(() => {
      state.level = nextBattle;
      void startLevel();
    });
    return;
  }

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
      // 封印 2 个绑定技能（方案 A：封印整个形状）
      // 收集不重复的 skillId
      const boundSkillIds = [...new Set(state.player.bindings.values())];
      const shuffled = [...boundSkillIds].sort(() => Math.random() - 0.5);
      const expireNode = getNextActEndNode(state.level);
      const sealed: string[] = [];
      const bs = getBindingState(state);
      for (let i = 0; i < Math.min(2, shuffled.length); i++) {
        const result = sealSkillKeys(bs, [...state.player.bindings.entries()]
          .find(([, id]) => id === shuffled[i])?.[0] ?? '');
        if (result) {
          for (const key of result.keys) {
            state.sealedKeys.push({ key, skillId: result.skillId, expiresAtNode: expireNode });
            sealed.push(key.toUpperCase());
          }
        }
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
        return meta ? t('rest.meditate.modifier', { idx: ['A', 'B', 'C'][i], icon: meta.icon, name: t(`modifier.${meta.id}`) !== `modifier.${meta.id}` ? t(`modifier.${meta.id}`) : meta.name, hint: t(`modifier.${meta.id}.elite`) !== `modifier.${meta.id}.elite` ? t(`modifier.${meta.id}.elite`) : meta.eliteHint }) : '';
      }).filter(Boolean);
      return t('rest.meditate.result', { previews: previews.join('\n') });
    }
    case 'meditate_gold': {
      state.gold += 80;
      return t('rest.meditate.gold_r');
    }

    case 'enchantment_trial_start': {
      // Story 41.1: 附魔试炼 — 二选一附魔 → 打字挑战
      const eligible = getEligibleSkills();
      if (eligible.length === 0) return t('rest.ench_trial.no_target');

      // 合并候选池
      const allCandidates: RitualCandidate[] = [];
      const seenKeys = new Set<string>();
      for (const { affixSkill } of eligible) {
        for (const c of generateRitualCandidates(affixSkill)) {
          const key = `${c.enchType}:${c.transmuteRes ?? ''}:${c.neighborRel ?? ''}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allCandidates.push(c);
          }
        }
      }
      if (allCandidates.length === 0) return t('rest.ench_trial.no_target');

      const choices = pickRitualChoices(allCandidates);
      // 延迟显示试炼 UI（executeEffect 返回提示文本后再弹出）
      setTimeout(() => showEnchantmentTrialUI(choices), 300);
      return t('rest.ench_trial.starting');
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

/** 移除随机技能（含绑定清理），返回技能名 */
function removeRandomSkill(): { id: string; name: string } | null {
  const skillIds = [...state.player.skills.keys()];
  if (skillIds.length === 0) return null;
  const skillId = skillIds[Math.floor(Math.random() * skillIds.length)];
  const affixSkill = state.affixSkills.get(skillId);

  // 移除绑定（多格形状全解）
  unbindSkill(getBindingState(state), skillId);
  // 移除词条制技能数据
  state.affixSkills.delete(skillId);
  state.affixSkillStates.delete(skillId);
  // 移除技能
  state.player.skills.delete(skillId);

  return affixSkill ? { id: skillId, name: affixSkill.name } : null;
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
  const affixSkill = state.affixSkills.get(skillId);
  return affixSkill ? { id: skillId, name: affixSkill.name, newLevel: data.level } : null;
}

// === Story 41.1: 附魔试炼 UI ===

const TRIAL_WORD_COUNT = 8;
const TRIAL_TIME_LIMIT = 15000; // 15 秒

function showEnchantmentTrialUI(choices: RitualCandidate[]): void {
  let modal = document.getElementById('enchantment-trial-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'enchantment-trial-modal';
    modal.className = 'ritual-enchantment-overlay';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="ritual-enchantment-panel">
      <h2 class="ritual-title">${t('rest.ench_trial.choose_title')}</h2>
      <p class="ritual-subtitle">${t('rest.ench_trial.choose_desc')}</p>
      <div id="trial-choices" class="ritual-choices"></div>
    </div>
  `;

  const choicesEl = document.getElementById('trial-choices')!;
  for (const candidate of choices) {
    const info = getEnchantmentDisplayInfo(
      candidate.enchType as EnchantmentType,
      candidate.transmuteRes,
      candidate.neighborRel,
    );
    if (!info) continue;

    const btn = document.createElement('button');
    btn.className = 'ritual-choice-btn';
    btn.innerHTML = `<span class="ritual-choice-icon">${info.icon}</span><span class="ritual-choice-name">${info.name}</span>`;
    btn.onclick = () => {
      startTrialChallenge(candidate, modal!);
    };
    choicesEl.appendChild(btn);
  }
}

function startTrialChallenge(candidate: RitualCandidate, modal: HTMLElement): void {
  // 从词库抽取 8 个词
  const deck = [...state.player.wordDeck];
  const words: string[] = [];
  for (let i = 0; i < TRIAL_WORD_COUNT && deck.length > 0; i++) {
    const idx = Math.floor(random() * deck.length);
    words.push(deck.splice(idx, 1)[0]);
  }
  if (words.length < TRIAL_WORD_COUNT) {
    // 词不够，补齐
    while (words.length < TRIAL_WORD_COUNT) words.push('trial');
  }

  let currentWordIdx = 0;
  let currentInput = '';
  let errors = 0;
  let timerExpired = false;

  const renderWord = () => {
    const panel = modal.querySelector('.ritual-enchantment-panel');
    if (!panel) return;

    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    panel.innerHTML = `
      <h2 class="ritual-title">${t('rest.ench_trial.challenge_title')}</h2>
      <p class="ritual-subtitle">${t('rest.ench_trial.timer', { sec: remaining })} · ${currentWordIdx}/${TRIAL_WORD_COUNT}</p>
      <div class="trial-word-display">${words[currentWordIdx]}</div>
      <div class="trial-input-display">${currentInput}<span class="trial-cursor">|</span></div>
      <p class="trial-hint">${t('rest.ench_trial.hint')}</p>
    `;
  };

  const deadline = Date.now() + TRIAL_TIME_LIMIT;

  const timerInterval = setInterval(() => {
    if (Date.now() >= deadline) {
      timerExpired = true;
      clearInterval(timerInterval);
      document.removeEventListener('keydown', keyHandler);
      showTrialResult(false, candidate, modal);
    } else {
      renderWord();
    }
  }, 500);

  const keyHandler = (e: KeyboardEvent) => {
    if (timerExpired) return;
    if (e.key === 'Escape') {
      clearInterval(timerInterval);
      document.removeEventListener('keydown', keyHandler);
      showTrialResult(false, candidate, modal);
      return;
    }
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const expected = words[currentWordIdx][currentInput.length];
      if (e.key.toLowerCase() === expected?.toLowerCase()) {
        currentInput += e.key.toLowerCase();
        if (currentInput === words[currentWordIdx].toLowerCase()) {
          // 词完成
          currentWordIdx++;
          currentInput = '';
          if (currentWordIdx >= TRIAL_WORD_COUNT) {
            // 全部完成，成功！
            clearInterval(timerInterval);
            document.removeEventListener('keydown', keyHandler);
            showTrialResult(errors === 0, candidate, modal);
            return;
          }
        }
      } else {
        errors++;
        // 任何错误立即失败
        clearInterval(timerInterval);
        document.removeEventListener('keydown', keyHandler);
        showTrialResult(false, candidate, modal);
        return;
      }
      renderWord();
    }
  };

  document.addEventListener('keydown', keyHandler);
  renderWord();
}

function showTrialResult(success: boolean, candidate: RitualCandidate, modal: HTMLElement): void {
  if (success) {
    // 成功：选择目标技能
    const eligible = getEligibleSkills();
    if (eligible.length === 0) {
      closeTrialModal(modal);
      return;
    }

    const panel = modal.querySelector('.ritual-enchantment-panel');
    if (!panel) return;

    const info = getEnchantmentDisplayInfo(
      candidate.enchType as EnchantmentType,
      candidate.transmuteRes,
      candidate.neighborRel,
    );

    panel.innerHTML = `
      <h2 class="ritual-title">${t('rest.ench_trial.success')}</h2>
      <p class="ritual-subtitle">${t('ritual.select_skill')}</p>
      <div id="trial-skill-list" class="ritual-skill-list"></div>
    `;

    const listEl = document.getElementById('trial-skill-list')!;
    for (const { skillId, affixSkill } of eligible) {
      const btn = document.createElement('button');
      btn.className = 'ritual-skill-btn';
      btn.innerHTML = `<span class="ritual-skill-icon">${affixSkill.icon}</span><span class="ritual-skill-name">${affixSkill.name}</span>`;
      btn.onclick = () => {
        // 写入附魔（复用统一逻辑）
        applyRitualEnchantment(skillId, affixSkill, candidate);

        const feedbackText = info
          ? t('ritual.applied', { icon: info.icon, name: info.name, skill: affixSkill.name })
          : t('ritual.applied_generic');

        panel.innerHTML = `
          <h2 class="ritual-title">${t('rest.ench_trial.success')}</h2>
          <p class="ritual-feedback">${feedbackText}</p>
          <button id="trial-done-btn" class="ritual-continue-btn">${t('ritual.continue')}</button>
        `;
        document.getElementById('trial-done-btn')!.onclick = () => closeTrialModal(modal);
      };
      listEl.appendChild(btn);
    }
  } else {
    // 失败
    const panel = modal.querySelector('.ritual-enchantment-panel');
    if (!panel) { closeTrialModal(modal); return; }

    panel.innerHTML = `
      <h2 class="ritual-title">${t('rest.ench_trial.fail')}</h2>
      <p class="ritual-feedback">${t('rest.ench_trial.fail_desc')}</p>
      <button id="trial-fail-btn" class="ritual-continue-btn">${t('ritual.continue')}</button>
    `;
    document.getElementById('trial-fail-btn')!.onclick = () => closeTrialModal(modal);
  }
}

function closeTrialModal(modal: HTMLElement): void {
  modal.style.display = 'none';
  modal.innerHTML = '';
}
