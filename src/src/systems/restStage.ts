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
import { rollEnchantResource, ENCHANT_RESOURCE_POOL, type EnchantSpec } from '../data/affixV2Enchant';
import { getAffixV2Definition } from '../data/affixV2';
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

/** 附魔的显示信息（i18n 暂内联，后续可挪 demo-i18n）*/
function enchantDisplayInfo(e: EnchantSpec): { name: string; desc: string } {
  const zh = getLocale() === 'zh';
  switch (e.id) {
    case 'haste':
      return zh
        ? { name: '疾', desc: '触发时给目标技能 +1 极速；若词条已含 grant_haste，数值 ×2' }
        : { name: 'Hasted', desc: 'On fire: +1 haste to target skill; if affix has grant_haste, amount ×2' };
    case 'crit':
      return zh
        ? { name: '暴', desc: '触发时挂 +20% 暴击率 aura；若词条已含 crit_chance_add aura，数值 ×2' }
        : { name: 'Critical', desc: 'On fire: +20% crit rate aura; if affix has crit_chance_add, amount ×2' };
    case 'resource': {
      const resName = zh
        ? ({ base:'基础', score:'分数', multiplier:'倍率', time:'时间', shield:'护盾', gold:'金币' } as Record<string,string>)[e.resource] ?? e.resource
        : e.resource;
      return zh
        ? { name: `资·${resName}`, desc: `触发时额外产出 ${resName} (ratio 0.1)；若词条已含 gain_resource(${resName})，ratio ×2` }
        : { name: `Resource·${resName}`, desc: `On fire: extra ${resName} (ratio 0.1); if affix has gain_resource(${resName}), ratio ×2` };
    }
    case 'multi_fire':
      return zh
        ? { name: '多', desc: '触发时挂 +1 多重释放 aura；若词条已含 multi_fire_add aura，数值 ×2' }
        : { name: 'Multi-fire', desc: 'On fire: +1 multi-fire aura; if affix has multi_fire_add, amount ×2' };
  }
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

  const overlay = document.createElement('div');
  overlay.className = 'ritual-enchantment-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;';

  const panel = document.createElement('div');
  panel.className = 'ritual-enchantment-panel';
  panel.style.cssText = 'background:#1a1a2e;border:2px solid #9b59b6;padding:24px;max-width:560px;min-width:380px;';

  const titleZh = `获得附魔：${info.name}`;
  const titleEn = `Enchant offered: ${info.name}`;
  panel.innerHTML = `
    <h3 style="color:#9b59b6;margin:0 0 8px;text-align:center;">${zh ? titleZh : titleEn}</h3>
    <p style="color:#bbb;font-size:13px;margin:0 0 16px;text-align:center;">${info.desc}</p>
    <div style="color:#fff;margin:0 0 8px;">${zh ? '选择挂载到本技能的哪个词条：' : 'Pick an affix on this skill:'}</div>
  `;

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
  for (const entry of equipped) {
    const def = getAffixV2Definition(entry.defId);
    const affName = def ? (zh ? def.name_zh : def.name_en) : entry.defId;
    const existing = getEnchant(entry.instanceId);
    const existingLabel = existing ? ` <span style="color:#e67e22;">(${zh ? '当前' : 'now'}: ${enchantDisplayInfo(existing).name})</span>` : '';
    const btn = document.createElement('button');
    btn.className = 'ritual-skill-btn';
    btn.style.cssText = 'background:#16213e;border:1px solid #444;color:#fff;padding:10px 14px;cursor:pointer;text-align:left;';
    btn.innerHTML = `<span style="font-weight:bold;">[${entry.key.toUpperCase()}]</span> ${affName}${existingLabel}`;
    btn.onclick = () => {
      setEnchant(entry.instanceId, enchant);
      overlay.remove();
      playSound('skill');
      onComplete();
    };
    list.appendChild(btn);
  }
  panel.appendChild(list);

  const skip = document.createElement('button');
  skip.style.cssText = 'margin-top:12px;background:transparent;border:1px solid #666;color:#aaa;padding:6px 12px;cursor:pointer;width:100%;';
  skip.textContent = zh ? '跳过（不挂载）' : 'Skip (do not enchant)';
  skip.onclick = () => { overlay.remove(); onComplete(); };
  panel.appendChild(skip);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

// 触发外部可见的 ENCHANT_RESOURCE_POOL（避免 unused import）
void ENCHANT_RESOURCE_POOL;

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
      overlay.remove();
      // V2 附魔 picker：从 upgrade 直接链入；老的 _pendingEnchantSkillIds 路径走 shop 的 V2-dead-code，
      // V2 skill 不再依赖那条路径，故不再 push
      showV2EnchantPicker(c.skillId, () => {
        onPick({ id: c.skillId, name: c.affix.name, newLevel: TARGET_LEVEL });
      });
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
