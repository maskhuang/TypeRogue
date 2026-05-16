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
import { t, localizeItemName, getLocale } from '../demo/demo-i18n';
import { grantIntermissionFreeRefreshes } from './relics/StageRelicBehaviors';
import { applyAffixLevelScaling } from '../data/affixes';
import { BALANCE } from '../core/constants';
import { listAllEquipped, setEnchant, getEnchant } from './affixV2Equipped';
import { rollEnchantResource, getEnchantDisplay, applyEnchantToEffect, type EnchantSpec } from '../data/affixV2Enchant';
import { getAffixV2Definition } from '../data/affixV2';
import { formatEffectDescription } from '../ui/affixV2TooltipAdapter';
import { random } from '../core/seededRandom';

// 休息关升级后需要补偿附魔的技能ID（旧路径，保留供 shop 兜底；V2 enchant 走 showV2EnchantPicker）
const _pendingEnchantSkillIds: string[] = [];

/** 消费并返回待附魔的技能ID列表 */
export function consumePendingEnchantSkillIds(): string[] {
  return _pendingEnchantSkillIds.splice(0);
}

// === V2 附魔获取 · roll + picker ===

/** 4 附魔等权 roll · resource 类型再 roll 一个具体资源（玩家预览随机结果） */
function rollEnchant(): EnchantSpec {
  const types = ['haste', 'crit', 'resource', 'multi_fire'] as const;
  const t = types[Math.floor(random() * types.length)];
  if (t === 'resource') return { id: 'resource', resource: rollEnchantResource(random) };
  return { id: t };
}

/** 附魔显示 · 委托到 affixV2Enchant.getEnchantDisplay（注册表派发，扩展时只改 handler）*/
function enchantDisplayInfo(e: EnchantSpec): { name: string; desc: string } {
  return getEnchantDisplay(e, getLocale() === 'zh' ? 'zh' : 'en');
}

/** 显示 V2 附魔 picker · skillId 范围内列 V2 affix 让玩家选挂载 ·
 *  无 V2 affix / 跳过 → onComplete(null) */
function showV2EnchantPicker(skillId: string, onComplete: () => void): void {
  const equipped = listAllEquipped().filter(e => e.skillId === skillId);
  if (equipped.length === 0) {
    // 该 skill 无 V2 词条 · 直接结束
    onComplete();
    return;
  }

  const enchant = rollEnchant();
  const info = enchantDisplayInfo(enchant);
  const zh = getLocale() === 'zh';
  const skill = state.affixSkills.get(skillId);
  const skillResource = skill?.resource ?? 'score';

  // === DPCA-VT220 CRT modal · ENCHANT_PROTOCOL ===
  const overlay = document.createElement('div');
  overlay.className = 'crt-modal-overlay';

  const bezel = document.createElement('div');
  bezel.className = 'crt-modal-bezel';

  const top = document.createElement('div');
  top.className = 'crt-modal-bezel-top';
  top.innerHTML = `
    <span class="crt-modal-led"></span>
    <span>DPCA · VT220 · ENCHANT-PROTOCOL</span>
    <span style="margin-left:auto;font-size:9px;color:#888;letter-spacing:2px;">SESSION 0x${(Date.now() & 0xffff).toString(16).toUpperCase()}</span>
  `;

  const screen = document.createElement('div');
  screen.className = 'crt-modal-screen';
  const headerHtml = `
    <div><span class="crt-modal-prompt">&gt;</span> CONNECT DPCA-CORE-04 ... <span class="crt-modal-dim">OK</span></div>
    <div><span class="crt-modal-prompt">&gt;</span> ROLL ENCHANT ... ${zh ? '抽配' : 'rolled'} <span class="crt-modal-alert">${info.name}</span></div>
    <div class="crt-modal-divider">────────────────────────────────────────────────────</div>
    <div class="crt-modal-field"><span>UPGRADED_SKILL</span><span class="v">[${(skill?.name ?? skillId).toString().toUpperCase()}] Lv.${skill?.level ?? 1}</span></div>
    <div class="crt-modal-section">▸ ${zh ? 'ASSIGN TO AFFIX 选择词条' : 'ASSIGN TO AFFIX'}</div>
  `;
  screen.innerHTML = headerHtml;

  equipped.forEach((entry, i) => {
    const def = getAffixV2Definition(entry.defId);
    const affName = def ? (zh ? def.name_zh : def.name_en) : entry.defId;
    const existing = getEnchant(entry.instanceId);
    const note = existing ? `<span class="crt-modal-item-note">(now: ${enchantDisplayInfo(existing).name})</span>` : '';
    const previewText = def
      ? formatEffectDescription(applyEnchantToEffect(def.effect, enchant), skillResource)
      : '—';
    const btn = document.createElement('button');
    btn.className = 'crt-modal-item';
    btn.dataset.marker = String(i + 1);
    btn.innerHTML = `
      <div class="crt-modal-item-name">[${entry.key.toUpperCase()}] ${affName}${note}</div>
      <div class="crt-modal-item-desc">${previewText}</div>
    `;
    btn.onclick = () => {
      setEnchant(entry.instanceId, enchant);
      overlay.remove();
      playSound('skill');
      onComplete();
    };
    screen.appendChild(btn);
  });

  const skipBtn = document.createElement('button');
  skipBtn.className = 'crt-modal-item';
  skipBtn.dataset.marker = '0';
  skipBtn.innerHTML = `
    <div class="crt-modal-item-name">${zh ? 'ABORT · 跳过本次挂载' : 'ABORT · skip enchant'}</div>
    <div class="crt-modal-item-desc">SKIP · 不挂载附魔</div>
  `;
  skipBtn.onclick = () => { overlay.remove(); onComplete(); };
  screen.appendChild(skipBtn);

  const cursor = document.createElement('div');
  cursor.innerHTML = `<span class="crt-modal-prompt">&gt;</span> INPUT TARGET [1${equipped.length > 1 ? `–${equipped.length}` : ''}/0]:_<span class="crt-modal-cursor"></span>`;
  cursor.style.marginTop = '8px';
  screen.appendChild(cursor);

  const bottom = document.createElement('div');
  bottom.className = 'crt-modal-bezel-bottom';
  bottom.innerHTML = `
    <span style="border:1px solid #555;padding:1px 6px;color:#aaa;font-size:8px;letter-spacing:2px;">EVENT-LOG OK</span>
    <span>${zh ? 'CLICK ROW / ENTER TO CONFIRM' : 'CLICK ROW · ENTER TO CONFIRM'}</span>
    <span style="border:1px solid #555;padding:1px 6px;color:#aaa;font-size:8px;letter-spacing:2px;">OUT-BUF 0%</span>
  `;

  bezel.appendChild(top);
  bezel.appendChild(screen);
  bezel.appendChild(bottom);
  overlay.appendChild(bezel);
  document.body.appendChild(overlay);
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
    options.forEach((option, i) => {
      const btn = document.createElement('button');
      btn.className = 'rest-option-btn';
      btn.dataset.marker = String.fromCharCode(65 + i);   // A / B / C ...
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

  // === DPCA-VT220 CRT modal · SKILL-UPGRADE ===
  const zh = getLocale() === 'zh';
  const overlay = document.createElement('div');
  overlay.className = 'crt-modal-overlay';

  const bezel = document.createElement('div');
  bezel.className = 'crt-modal-bezel';

  const top = document.createElement('div');
  top.className = 'crt-modal-bezel-top';
  top.innerHTML = `
    <span class="crt-modal-led"></span>
    <span>DPCA · VT220 · SKILL-UPGRADE</span>
    <span style="margin-left:auto;font-size:9px;color:#888;letter-spacing:2px;">SESSION 0x${(Date.now() & 0xffff).toString(16).toUpperCase()}</span>
  `;

  const screen = document.createElement('div');
  screen.className = 'crt-modal-screen';
  screen.innerHTML = `
    <div><span class="crt-modal-prompt">&gt;</span> PROBE PLAYER_SKILLS ... <span class="crt-modal-dim">${shuffled.length} TARGET${shuffled.length > 1 ? 'S' : ''} FOUND</span></div>
    <div class="crt-modal-divider">────────────────────────────────────────────────────</div>
    <div class="crt-modal-section">▸ ${zh ? 'SELECT TARGET SKILL · 选择升级目标' : 'SELECT TARGET SKILL'}</div>
  `;

  shuffled.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'crt-modal-item';
    btn.dataset.marker = String(i + 1);
    btn.innerHTML = `
      <div class="crt-modal-item-name">${c.affix.icon} ${c.affix.name}</div>
      <div class="crt-modal-item-desc">CURRENT Lv.${c.data.level} → Lv.${TARGET_LEVEL} · + ENCHANT</div>
    `;
    btn.onclick = () => {
      const levelsToGain = TARGET_LEVEL - c.data.level;
      c.data.level = TARGET_LEVEL;
      applyAffixLevelScaling(c.affix.affixes, levelsToGain);
      overlay.remove();
      showV2EnchantPicker(c.skillId, () => {
        onPick({ id: c.skillId, name: c.affix.name, newLevel: TARGET_LEVEL });
      });
    };
    screen.appendChild(btn);
  });

  const cursor = document.createElement('div');
  cursor.innerHTML = `<span class="crt-modal-prompt">&gt;</span> INPUT TARGET [1${shuffled.length > 1 ? `–${shuffled.length}` : ''}]:_<span class="crt-modal-cursor"></span>`;
  cursor.style.marginTop = '8px';
  screen.appendChild(cursor);

  const bottom = document.createElement('div');
  bottom.className = 'crt-modal-bezel-bottom';
  bottom.innerHTML = `
    <span style="border:1px solid #555;padding:1px 6px;color:#aaa;font-size:8px;letter-spacing:2px;">EVENT-LOG OK</span>
    <span>${t('rest.upgrade_pick_title')}</span>
    <span style="border:1px solid #555;padding:1px 6px;color:#aaa;font-size:8px;letter-spacing:2px;">OUT-BUF 0%</span>
  `;

  bezel.appendChild(top);
  bezel.appendChild(screen);
  bezel.appendChild(bottom);
  overlay.appendChild(bezel);
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
