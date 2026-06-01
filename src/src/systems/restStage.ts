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
import { playSound, playDeskSound } from '../effects/sound';
import { t, localizeItemName, getLocale } from '../demo/demo-i18n';
import { grantIntermissionFreeRefreshes } from './relics/StageRelicBehaviors';
import { applyAffixLevelScaling } from '../data/affixes';
import { BALANCE } from '../core/constants';
import { listAllEquipped, setEnchant, getEnchant, listAllEnchants, takePendingV2EnchantSkillIds } from './affixV2Equipped';
import { isEnchantGuaranteed } from './relics/EnchantmentRelicBehaviors';
import { rollEnchantResource, getEnchantDisplay, applyEnchantToEffect, ENCHANT_RESOURCE_POOL, type EnchantSpec, type EnchantResource } from '../data/affixV2Enchant';
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

/** 附魔加权 roll · supplant 稀缺（权重远低于其余）· resource/rr 再 roll 具体资源（玩家预览随机结果）·
 *  rr 的 from = 宿主 skill 资源（自我消耗闭环），to = 其余资源随机 */
function rollEnchant(skillResource: string, hasToolTag: boolean): EnchantSpec {
  const pool: Array<{ w: number; make: () => EnchantSpec }> = [
    { w: 10, make: () => ({ id: 'haste' }) },
    { w: 10, make: () => ({ id: 'crit' }) },
    { w: 10, make: () => ({ id: 'resource', resource: rollEnchantResource(random) }) },
    { w: 10, make: () => ({ id: 'multi_fire' }) },
    { w: 10, make: () => ({ id: 'mark' }) },
    { w: 10, make: () => ({ id: 'ally' }) },
    { w: 10, make: () => rollRrEnchant(skillResource) },
    { w: 2,  make: () => ({ id: 'supplant' }) },   // 稀缺
  ];
  // 永恒：移除使用次数限制 · 仅在含 tool tag 词条的技能上出现（非 tool 技能无 maxUses，挂上无意义）
  if (hasToolTag) pool.push({ w: 6, make: () => ({ id: 'eternal' }) });
  const total = pool.reduce((s, x) => s + x.w, 0);
  let r = random() * total;
  for (const x of pool) { if ((r -= x.w) < 0) return x.make(); }
  return pool[0].make();
}

/** rr 附魔：from = 宿主 skill 资源，to = 其余资源随机（宿主资源不在附魔资源池时回退为随机 from） */
function rollRrEnchant(skillResource: string): EnchantSpec {
  const from: EnchantResource = (ENCHANT_RESOURCE_POOL as readonly string[]).includes(skillResource)
    ? (skillResource as EnchantResource)
    : rollEnchantResource(random);
  const others = ENCHANT_RESOURCE_POOL.filter(r => r !== from);
  const to = others[Math.floor(random() * others.length)] ?? from;
  return { id: 'rr', from, to };
}

/** 附魔显示 · 委托到 affixV2Enchant.getEnchantDisplay（注册表派发，扩展时只改 handler）*/
function enchantDisplayInfo(e: EnchantSpec): { name: string; desc: string } {
  return getEnchantDisplay(e, getLocale() === 'zh' ? 'zh' : 'en');
}

/** 显示 V2 附魔 picker · 文牍风格「封装工单」（复用遗物申请表 desk 视觉）·
 *  抽 1 个附魔 → 列出该 skill 的 V2 词条作封装目标（A/B/C），键入字母或点击行提交 ·
 *  无 V2 affix / 跳过 → onComplete() */
function showV2EnchantPicker(skillId: string, onComplete: () => void): void {
  const equipped = listAllEquipped().filter(e => e.skillId === skillId);
  if (equipped.length === 0) {
    // 该 skill 无 V2 词条 · 直接结束
    onComplete();
    return;
  }

  const zh = getLocale() === 'zh';
  const skill = state.affixSkills.get(skillId);
  const skillResource = skill?.resource ?? 'score';
  // 永恒附魔仅在该 skill 含 tool 段词条时出现（roll 门控）
  const hasToolTag = equipped.some(e => getAffixV2Definition(e.defId)?.section === 'tool');
  const enchant = rollEnchant(skillResource, hasToolTag);
  const info = enchantDisplayInfo(enchant);

  // 永恒只能封装到 tool 段（消耗型）词条——移除使用次数限制对非 tool 词条无意义，故仅列 tool 目标 ·
  // hasToolTag 门控保证 eternal 出现时至少有 1 个 tool 词条，targets 非空
  const targets = enchant.id === 'eternal'
    ? equipped.filter(e => getAffixV2Definition(e.defId)?.section === 'tool')
    : equipped;

  const RARITY_CLASS = ['common', 'rare', 'epic', 'legendary'];
  const rarityClass = RARITY_CLASS[Number(skill?.rarity) || 0] ?? 'common';
  const workerId = (() => {
    try { return localStorage.getItem('dpca-worker-id') || 'OP. PRIMATE-7842'; }
    catch { return 'OP. PRIMATE-7842'; }
  })();
  const skillName = (skill?.name ?? skillId).toString().toUpperCase();
  const skillLv = skill?.level ?? 1;
  const letters = ['A', 'B', 'C', 'D', 'E'];

  // === 文牍式封装工单（desk-paper.requisition 视觉，与遗物申请表同源）===
  const overlay = document.createElement('div');
  overlay.className = 'v2-enchant-desk-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;';

  const stage = document.createElement('div');
  stage.className = 'desk-stage';

  const vignette = document.createElement('div');
  vignette.className = 'desk-vignette';

  const paperStage = document.createElement('div');
  paperStage.className = 'desk-paper-stage';

  const paper = document.createElement('div');
  paper.className = 'desk-paper requisition';
  paper.innerHTML = `
    <div class="desk-paper-header">
      <div class="seal" aria-label="DPCA seal"><img src="/assets/ui/seal-mark.png" alt=""></div>
      <div class="h-text">
        <div class="org">${zh ? 'DPCA · 工事科 / ENGRAVING' : 'DPCA · ENGRAVING DIV.'}</div>
        <div class="title">${zh ? '封装工单 · ENCHANT ORDER' : 'ENCHANT ORDER · 封装工单'}</div>
      </div>
      <div class="form-id">FORM-EN3<br>SEC 4</div>
    </div>
    <div class="req-form-fields">
      <div class="desk-paper-field">
        <div class="label">${zh ? '申领人' : 'APPLICANT'}</div>
        <div class="value printed">${workerId}</div>
      </div>
      <div class="desk-paper-field">
        <div class="label">${zh ? '签发附魔' : 'ISSUED'}</div>
        <div class="value printed">${info.name}</div>
      </div>
    </div>
    <div class="req-instruction">${info.desc}</div>
    <div class="req-instruction">${zh
      ? `工件 [${skillName}] Lv.${skillLv} · 勾选封装词条 · CHECK ONE · 备注栏键入字母提交`
      : `ITEM [${skillName}] Lv.${skillLv} · CHECK ONE AFFIX · type letter in note to submit`}</div>
    <div class="req-list"></div>
    <div class="desk-input-line">
      <div class="label">${zh ? '▸ 备注栏' : '▸ NOTE'}</div>
      <input type="text" placeholder="A / B / C" maxlength="1" autocomplete="off" style="text-transform:uppercase">
      <div class="desk-enter-hint"><span class="key">↵</span><span>${zh ? '提交' : 'SUBMIT'}</span></div>
    </div>
    <div class="req-skip-row">
      <button class="req-skip">${zh ? '□ 跳过本次封装 · DECLINE' : '□ DECLINE · skip enchant'}</button>
    </div>
    <div class="desk-stamp-mark" data-tint="green">
      <div class="ring"></div>
      <div class="ring inner"></div>
      <div class="seal-img"><img src="/assets/ui/seal-mark.png" alt=""></div>
      <div class="label">${zh ? 'SEALED<br>已封装' : 'SEALED'}</div>
      <div class="date">${zh ? 'DPCA · 工事科' : 'DPCA · ENGRAVING'}</div>
    </div>
  `;

  const listEl = paper.querySelector('.req-list') as HTMLElement;
  const inputEl = paper.querySelector('input') as HTMLInputElement;
  const skipBtn = paper.querySelector('.req-skip') as HTMLButtonElement;
  const stampEl = paper.querySelector('.desk-stamp-mark') as HTMLElement;

  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    overlay.remove();
    onComplete();
  };

  // 词条行（= 封装目标）· 永恒时仅列 tool 段词条
  targets.forEach((entry, idx) => {
    const def = getAffixV2Definition(entry.defId);
    const affName = def ? (zh ? def.name_zh : def.name_en) : entry.defId;
    const existing = getEnchant(entry.instanceId);
    const previewText = def
      ? formatEffectDescription(applyEnchantToEffect(def.effect, enchant), skillResource)
      : '—';
    const letter = letters[idx] ?? String(idx + 1);
    const overwriteNote = existing
      ? (zh ? ` · 覆盖原附魔[${enchantDisplayInfo(existing).name}]` : ` · replaces [${enchantDisplayInfo(existing).name}]`)
      : '';

    const row = document.createElement('div');
    row.className = `req-row rarity-${rarityClass}`;
    row.dataset.key = letter;
    row.dataset.instanceId = entry.instanceId;
    row.innerHTML = `
      <div class="checkbox"></div>
      <div class="key-letter">${letter}</div>
      <div>
        <div class="name">[${entry.key.toUpperCase()}] ${affName}</div>
        <div class="code">AFX-${(def?.section ?? 'GEN').slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}</div>
        <div class="desc">${previewText}${overwriteNote}</div>
      </div>
      <div class="clr">${zh ? '词条' : 'AFFIX'}</div>
    `;
    row.addEventListener('click', () => {
      if (inputEl.disabled) return;
      playDeskSound('paper');
      inputEl.value = letter;
      highlightFromInput();
      setTimeout(() => { if (!inputEl.disabled) submit(); }, 200);
    });
    listEl.appendChild(row);
  });

  function highlightFromInput(): void {
    const v = inputEl.value.toUpperCase();
    listEl.querySelectorAll<HTMLElement>('.req-row').forEach(r => r.classList.remove('active'));
    const row = listEl.querySelector<HTMLElement>(`.req-row[data-key="${v}"]`);
    row?.classList.add('active');
  }

  function submit(): void {
    const v = inputEl.value.toUpperCase();
    const row = listEl.querySelector<HTMLElement>(`.req-row[data-key="${v}"]`);
    const instanceId = row?.dataset.instanceId;
    if (!instanceId) return;
    inputEl.disabled = true;
    row?.classList.add('active');

    setEnchant(instanceId, enchant);

    // 绿章「已封装」+ 桌面震动
    stampEl.classList.add('show');
    stage.classList.add('thunk');
    playDeskSound('stamp');
    setTimeout(() => {
      stampEl.classList.remove('show');
      playDeskSound('whoosh');
      finish();
    }, 1000);
  }

  inputEl.oninput = highlightFromInput;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!inputEl.disabled) submit(); }
  };
  skipBtn.onclick = () => { if (completed) return; playDeskSound('paper'); finish(); };

  paperStage.appendChild(paper);
  stage.appendChild(vignette);
  stage.appendChild(paperStage);
  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  // 入场：纸张滑入 + 聚焦备注栏
  requestAnimationFrame(() => {
    paper.classList.add('active');
    inputEl.focus();
  });
}

// === Lv.3 概率附魔 · V2 路径（替代 legacy checkAutoEnchantment）===

/** 升到 Lv.3 时按概率授予一个 V2 附魔（概率随已有 V2 附魔数递减，与旧公式一致）·
 *  概率门控数的是**V2 附魔数**（listAllEnchants），非 legacy enchantmentIds ·
 *  命中 → 弹 showV2EnchantPicker；未命中 / 技能不存在 / **无 V2 词条** → 直接 onComplete（静默）。
 *  无词条技能没有挂载对象，连概率都不掷，附魔机会不显化（不弹界面、无反馈）。*/
export function maybeGrantV2Enchant(skillId: string, onComplete: () => void): void {
  const targetSkill = state.affixSkills.get(skillId);
  if (!targetSkill) { onComplete(); return; }
  // 无 V2 词条的技能没有可挂载的对象 → 静默跳过（不掷概率、不弹界面，附魔机会不显化）
  if (!listAllEquipped().some(e => e.skillId === skillId)) { onComplete(); return; }
  const targetRarity = targetSkill.rarity;

  // V2 附魔计数：全局总数 + 同稀有度技能上的附魔数
  const ench = listAllEnchants();
  const totalEnch = ench.size;
  let sameRarityEnch = 0;
  for (const entry of listAllEquipped()) {
    if (!ench.has(entry.instanceId)) continue;
    const sk = state.affixSkills.get(entry.skillId);
    if (sk && sk.rarity === targetRarity) sameRarityEnch++;
  }

  // 贪婪铭刻 → 必定；同稀有度无附魔 / 全局无附魔 → 必定；否则概率递减（公式不变）
  const prob = isEnchantGuaranteed() ? 1.0
    : sameRarityEnch === 0 ? 1.0
    : totalEnch === 0 ? 1.0
    : Math.max(0.1, 0.8 - 0.15 * (totalEnch - 1));
  if (random() >= prob) { onComplete(); return; }

  showV2EnchantPicker(skillId, onComplete);
}

/** 处理局内升级到 Lv.3 留下的待附魔队列（shop 打开时调用）· 逐个弹 picker（一次一个）。*/
export function processPendingV2Enchants(onDone: () => void): void {
  const queue = takePendingV2EnchantSkillIds();
  const step = (i: number): void => {
    if (i >= queue.length) { onDone(); return; }
    maybeGrantV2Enchant(queue[i], () => step(i + 1));
  };
  step(0);
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
        ? t('rest.enchant.r', { name: localizeItemName(chosen.id, chosen.name) })
        : t('rest.enchant.no_skill');
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

/** 显示附魔三选一面板（只给附魔，不再升级技能等级）·
 *  候选 = 拥有 V2 词条（可被封装）的技能，与等级无关。*/
function showUpgradeChoice(onPick: (chosen: { id: string; name: string } | null) => void): void {
  const enchantableSkillIds = new Set(listAllEquipped().map(e => e.skillId));
  const candidates = [...state.player.skills.entries()]
    .filter(([skillId]) => enchantableSkillIds.has(skillId))
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
    <span>DPCA · VT220 · SKILL-ENCHANT</span>
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
      <div class="crt-modal-item-desc">Lv.${c.data.level} · + ENCHANT</div>
    `;
    btn.onclick = () => {
      overlay.remove();
      showV2EnchantPicker(c.skillId, () => {
        onPick({ id: c.skillId, name: c.affix.name });
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
