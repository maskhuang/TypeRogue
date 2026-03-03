// ============================================
// 打字肉鸽 - 休息关系统
// ============================================
// Story 18.3: 休息关随机事件场景

import { state } from '../core/state';
import { drawRestEvent } from '../data/restEvents';
import type { RestEvent, RestEventOption } from '../data/restEvents';
import { RELICS } from '../data/relics';
import { SKILLS } from '../data/skills';
import { showScreen, startLevel, renderRelicDisplay } from './battle';
import { getNextBattleNode, getActForNode, TOTAL_NODES } from './stage/stageFlow';
import { getBossModifierMeta } from '../data/bossModifiers';
import { playSound } from '../effects/sound';

let currentEvent: RestEvent | null = null;

// === 打开休息关 ===
export function openRestStage(): void {
  state.phase = 'rest';

  // 抽取事件
  currentEvent = drawRestEvent(state.usedRestEvents, state);

  // 渲染 UI
  const actNum = getActForNode(state.level);
  const actLabel = document.getElementById('rest-act-label');
  if (actLabel) actLabel.textContent = `Act ${actNum} 结束`;

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
    nameEl.textContent = '安静的休息';
    descEl.textContent = '没有什么特别的事发生。你安静地休息了一会儿。';
    optionsEl.innerHTML = '';
    resultEl.classList.remove('rest-result-hidden');
    const resultText = document.getElementById('rest-result-text');
    if (resultText) resultText.textContent = '休息完毕，继续前进。';
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
  startLevel();
}

// === 执行事件效果 ===
export function executeEffect(effectId: string): string {
  switch (effectId) {
    case 'noop':
      return '你选择了离开。';

    // === 事件 1: 神秘商人 ===
    case 'merchant_rare_relic': {
      const cost = Math.floor(state.gold * 0.5);
      state.gold -= cost;
      const relicId = grantRandomRelic('rare');
      if (relicId) {
        const relic = RELICS[relicId];
        return `花费 ${cost} 金币，获得稀有遗物 ${relic.icon} ${relic.name}！`;
      }
      return `花费 ${cost} 金币，但没有更多遗物可获得。`;
    }
    case 'merchant_common_relic': {
      const relicId = grantRandomRelic('common');
      if (relicId) {
        const relic = RELICS[relicId];
        return `免费获得普通遗物 ${relic.icon} ${relic.name}！`;
      }
      return '没有更多普通遗物可获得。';
    }

    // === 事件 2: 打字之神的考验 ===
    case 'trial_power': {
      const actEnd = getActEndNode(state.level);
      state.tempBuffs.push({ type: 'multiplier', value: 1.0, expiresAtNode: actEnd });
      state.tempBuffs.push({ type: 'time', value: -10, expiresAtNode: actEnd });
      return '下一 Act 倍率 +1.0x，但时间 -10 秒！';
    }
    case 'trial_endurance': {
      const actEnd = getActEndNode(state.level);
      state.tempBuffs.push({ type: 'time', value: 15, expiresAtNode: actEnd });
      state.tempBuffs.push({ type: 'multiplier', value: -0.5, expiresAtNode: actEnd });
      return '下一 Act 时间 +15 秒，但倍率 -0.5x！';
    }

    // === 事件 3: 技能祭坛 ===
    case 'altar_upgrade': {
      const removed = removeRandomSkill();
      if (!removed) return '没有可献祭的技能。';
      const newSkillId = grantRandomNewSkill();
      if (newSkillId) {
        const newSk = SKILLS[newSkillId];
        return `献祭了 ${removed.name}，获得新技能 ${newSk.icon} ${newSk.name}！`;
      }
      return `献祭了 ${removed.name}，但没有更多新技能可获得。`;
    }
    case 'altar_gold': {
      const removed = removeRandomSkill();
      if (!removed) return '没有可献祭的技能。';
      state.gold += 200;
      return `献祭了 ${removed.name}，获得 200 金币！`;
    }

    // === 事件 4: 赌徒的骰子 ===
    case 'gamble_bet': {
      if (state.gold < 100) return '金币不足！';
      state.gold -= 100;
      if (Math.random() < 0.5) {
        state.gold += 300;
        return '赢了！获得 300 金币！(净赚 200)';
      } else {
        return '输了！失去 100 金币！';
      }
    }

    // === 事件 5: 遗物熔炉 ===
    case 'forge_relic_to_skill': {
      const removed = removeRandomRelic();
      if (!removed) return '没有可销毁的遗物。';
      const upgraded = upgradeRandomSkill();
      if (upgraded) {
        return `销毁了 ${removed.icon} ${removed.name}，${upgraded.name} 升级至 Lv.${upgraded.newLevel}！`;
      }
      return `销毁了 ${removed.icon} ${removed.name}，但没有可升级的技能。`;
    }
    case 'forge_skill_to_relic': {
      const removed = removeRandomSkill();
      if (!removed) return '没有可销毁的技能。';
      const relicId = grantRandomRelic();
      if (relicId) {
        const relic = RELICS[relicId];
        return `销毁了 ${removed.name}，获得遗物 ${relic.icon} ${relic.name}！`;
      }
      return `销毁了 ${removed.name}，但没有更多遗物可获得。`;
    }

    // === 事件 6: 时间裂缝 ===
    case 'rift_skip': {
      // 跳过下一关：从当前休息关跳两步
      const next1 = getNextBattleNode(state.level);
      if (next1 > 0) {
        const next2 = getNextBattleNode(next1);
        if (next2 > 0 && next2 <= TOTAL_NODES) {
          // completeRestStage 会设置 state.level = getNextBattleNode(state.level)
          // 我们需要跳过一个额外的战斗节点
          // 通过提前推进 state.level 实现
          state.level = next1; // 跳到第一个战斗节点的位置
          return `时空裂缝打开，跳过了一关！将直接前往 Level ${next2}。`;
        }
      }
      return '时空裂缝不稳定，无法跳跃。';
    }
    case 'rift_replay': {
      // 重打上一关：给额外金币奖励（模拟多打一关的收益）
      state.gold += 50;
      return '时间回溯！额外获得 50 金币作为重打奖励。';
    }

    // === 事件 7: 键盘诅咒 ===
    case 'curse_accept': {
      // 封印 2 个随机已绑定键位（移除绑定）
      const boundKeys = [...state.player.bindings.keys()];
      const sealed: string[] = [];
      const shuffled = [...boundKeys].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(2, shuffled.length); i++) {
        const key = shuffled[i];
        state.player.bindings.delete(key);
        sealed.push(key.toUpperCase());
      }
      state.gold += 150;
      const relicId = grantRandomRelic();
      const relicMsg = relicId ? ` + 遗物 ${RELICS[relicId].icon} ${RELICS[relicId].name}` : '';
      return `键位 [${sealed.join(', ')}] 被封印！获得 150 金币${relicMsg}。（可在商店重新绑定）`;
    }

    // === 事件 8: 技能复制器 ===
    case 'copy_skill': {
      const upgraded = upgradeRandomSkill();
      if (!upgraded) return '没有可升级的技能。';
      // 目标分 ×1.5（临时 buff 到下一个 Act 结束）
      const actEnd = getActEndNode(state.level);
      state.tempBuffs.push({ type: 'targetScore', value: 1.5, expiresAtNode: actEnd });
      return `${upgraded.name} 升级至 Lv.${upgraded.newLevel}！但下一 Act 目标分 ×1.5。`;
    }

    // === 事件 9: 命运之轮 ===
    case 'wheel_spin': {
      const outcomes = [
        () => { state.gold += 150; return '好运！获得 150 金币！'; },
        () => {
          const relicId = grantRandomRelic();
          if (relicId) return `好运！获得遗物 ${RELICS[relicId].icon} ${RELICS[relicId].name}！`;
          state.gold += 100; return '好运！获得 100 金币！';
        },
        () => {
          const cost = Math.floor(state.gold * 0.3);
          state.gold -= cost;
          return `厄运！失去 ${cost} 金币（30%）！`;
        },
        () => {
          const actEnd = getActEndNode(state.level);
          state.tempBuffs.push({ type: 'multiplier', value: 0.5, expiresAtNode: actEnd });
          return '好运！下一 Act 倍率 +0.5x！';
        },
      ];
      const pick = outcomes[Math.floor(Math.random() * outcomes.length)];
      return `命运之轮转动……${pick()}`;
    }

    // === 事件 10: 宁静冥想 ===
    case 'meditate_preview': {
      // 预览下一 Act 的 Boss 修饰器
      const mods = state.bossModifierPool;
      if (mods.length === 0) return '冥想中看到一片宁静……没有更多信息。';
      const previews = mods.map((id, i) => {
        const meta = getBossModifierMeta(id);
        return meta ? `修饰器${['A', 'B', 'C'][i]}: ${meta.icon} ${meta.name} — ${meta.eliteHint}` : '';
      }).filter(Boolean);
      return `冥想预见：\n${previews.join('\n')}`;
    }
    case 'meditate_gold': {
      state.gold += 80;
      return '积蓄力量，获得 80 金币！';
    }

    default:
      return '无事发生。';
  }
}

// === 辅助函数 ===

/** 获取当前 Act 结束节点（下一个休息关或最终节点） */
function getActEndNode(currentNode: number): number {
  const act = getActForNode(currentNode);
  // Act 1 结束 = Node 4, Act 2 结束 = Node 8, Act 3 = Node 10
  if (act === 1) return 4;
  if (act === 2) return 8;
  return 10;
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
  const relicId = available[Math.floor(Math.random() * available.length)];
  state.player.relics.add(relicId);
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
  const sk = SKILLS[skillId];

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
  const owned = [...state.player.skills.keys()];
  const available = Object.keys(SKILLS).filter(id => !owned.includes(id));
  if (available.length === 0) return null;
  const skillId = available[Math.floor(Math.random() * available.length)];
  state.player.skills.set(skillId, { level: 1 });
  return skillId;
}

/** 升级随机已有技能（未满级的），返回信息 */
function upgradeRandomSkill(): { name: string; newLevel: number } | null {
  const upgradable = [...state.player.skills.entries()]
    .filter(([, data]) => data.level < 3);
  if (upgradable.length === 0) return null;
  const [skillId, data] = upgradable[Math.floor(Math.random() * upgradable.length)];
  data.level++;
  const sk = SKILLS[skillId];
  return sk ? { name: sk.name, newLevel: data.level } : null;
}
