// ============================================
// Shop Preview · Workbench Module (Story 60.16)
// ============================================
// 工作台 DOM：键盘绑定 / IN-tray 卡片渲染 / 抽屉 / drag zones / hover tooltips。
// 拆自原 shopPreview.ts；terminal-side 反向回调走 shopBus（finalizePackPick/
// cancelPackPick/updateTerminalChrome）。
// ============================================

import { state } from '../../core/state';
import { INBOX_MAX } from '../../core/constants';
import {
  renderShapePreview,
  getFreqHints,
  formatWordEffectLabel,
  buildSkillKeyTooltipData,
  showRelicTooltip,
  hideRelicTooltip,
  moveRelicTooltip,
} from '../../systems/shop';
import { keyTooltip } from '../keyboard/KeyTooltip';
import { shouldAnimateShop, shouldShowDragPreviewTooltip } from '../../core/UserSettings';
import { renderCraftPanel } from '../../systems/classes/CraftingStation';
import { renderMetamorphPanel } from '../../systems/classes/MetamorphStation';
import { RELICS } from '../../data/relics';
import { dragManager, type DragPayload } from '../../systems/dragManager';
import { mapShapeToKeys } from '../../data/skillShapes';
import {
  highlightShapePlacementOnWorkbench,
  clearShapePlacementOnWorkbench,
  handleWorkbenchKeyRotation,
  applyBindFromInbox,
  applyUnbindKeyToInbox,
} from '../shapePreview';
import { t } from '../../demo/demo-i18n';
import type { WordPack } from '../../core/types';
import {
  previewState,
  shopBus,
  sfx,
  escapeHtml,
} from './shopState';
import type { DrawerKind, InboxCardData } from './shopState';

// === Story 60.11: IN-tray 槽 whoosh 滑入动画 ===

/**
 * 触发 IN-tray 槽 whoosh 滑入动画
 * @param slotIdx state.player.inbox 中刚 push 的下标（新卡所在 cutout）
 */
export function triggerInboxWhoosh(slotIdx: number): void {
  if (!shouldAnimateShop()) return;
  // 防御：测试环境 / SSR 可能无 requestAnimationFrame
  if (typeof requestAnimationFrame === 'undefined') return;
  // requestAnimationFrame 等 syncWorkbenchInbox 重渲完成 + DOM 落地
  requestAnimationFrame(() => {
    const root = document.querySelector('#workbench-screen-preview .wb-foam-case');
    if (!root) return;
    const cutouts = root.querySelectorAll<HTMLElement>('.foam-cutout');
    const target = cutouts[slotIdx];
    if (!target) return;
    const card = target.querySelector<HTMLElement>('.weapon-card');
    if (!card) return;
    card.classList.remove('wb-inbox-whoosh');
    void card.offsetWidth;
    card.classList.add('wb-inbox-whoosh');
    card.addEventListener('animationend', () => {
      card.classList.remove('wb-inbox-whoosh');
    }, { once: true });
  });
}

// === Drawer overlay ===

export function openDrawer(kind: DrawerKind): void {
  const el = document.getElementById('wb-drawer');
  const title = document.getElementById('wb-drawer-title');
  const body = document.getElementById('wb-drawer-body');
  if (!el || !title || !body) return;
  previewState.drawerOpen = kind;
  sfx('shop_drawer_open'); // Story 60.12: 抽拉哗啦
  if (kind === 'words') {
    title.textContent = t('shop.workbench.drawer.words_title', { n: state.player.wordDeck.length });
    body.innerHTML = renderWordsDrawerHtml();
  } else if (kind === 'craft') {
    title.textContent = t('shop.workbench.drawer.craft_title');
    body.innerHTML = ''; // 清旧内容；renderCraftPanel 内部也会再 innerHTML=''
    // Story 60.13: 接入真 craft panel — onGoldUpdate 回调让 terminal banner 同步
    renderCraftPanel(body as HTMLElement, () => shopBus.updateTerminalChrome());
  } else if (kind === 'metamorph') {
    title.textContent = t('shop.workbench.drawer.metamorph_title');
    body.innerHTML = '';
    // Story 60.13: 接入真 metamorph panel
    renderMetamorphPanel(body as HTMLElement);
  } else if (kind === 'pack-pick') {
    if (!previewState.pendingPackPick) return;
    const { d, pack } = previewState.pendingPackPick;
    title.textContent = `PACK ${d.sku} · CANDIDATE FILING`;
    body.innerHTML = renderPackPickDrawerHtml(pack);
    setupPackPickHandlers();
  }
  el.style.display = 'flex';
  // small enter animation hook
  requestAnimationFrame(() => {
    el.classList.add('drawer-open');
    // Story 60.2: pack-pick 抽屉打开后聚焦第一张卡片以便键盘选词
    if (kind === 'pack-pick') {
      const firstCard = body.querySelector<HTMLElement>('.pack-pick-card');
      firstCard?.focus();
    }
  });
}

export function closeDrawer(): void {
  const el = document.getElementById('wb-drawer');
  if (!el) return;
  // Story 60.2: pack-pick drawer 关闭时如果还在 pending → 触发 cancel 路径（不扣钱）
  if (previewState.drawerOpen === 'pack-pick' && previewState.pendingPackPick !== null) {
    shopBus.cancelPackPick();
  }
  previewState.drawerOpen = null;
  el.classList.remove('drawer-open');
  el.style.display = 'none';
  // 焦点回 prompt：让 onKey 全局监听器接管
  (document.activeElement as HTMLElement | null)?.blur?.();
}

function renderWordsDrawerHtml(): string {
  const words = state.player.wordDeck;
  if (words.length === 0) {
    return '<div class="wb-drawer-empty">— NO WORDS FILED —</div>';
  }
  const rows = words.map((w, i) => {
    const eff = state.wordEffects.get(w);
    const effLabel = eff ? `[${eff.type.toUpperCase()}${eff.value ? ' ' + eff.value : ''}]` : '';
    return `<li class="wb-word-row"><span class="ww-idx">${String(i + 1).padStart(3, '0')}</span><span class="ww-name">${w.toUpperCase()}</span><span class="ww-meta">LEN ${w.length}</span><span class="ww-eff">${effLabel}</span></li>`;
  });
  return `<ul class="wb-word-list">${rows.join('')}</ul>`;
}

// Story 60.2: pack-pick drawer 渲染
function renderPackPickDrawerHtml(pack: WordPack): string {
  const cards = pack.words.map((w, i) => {
    const freqHint = getFreqHints(w);
    const effLabel = pack.wordEffect ? formatWordEffectLabel(pack.wordEffect) : '';
    const upper = escapeHtml(w.toUpperCase());
    return `
      <button class="pack-pick-card" type="button" data-pick-idx="${i}">
        <span class="pp-clip" aria-hidden="true">📎</span>
        <div class="pp-word">${upper}</div>
        <div class="pp-meta">LEN ${w.length}${freqHint ? ' · ' + escapeHtml(freqHint) : ''}</div>
        ${effLabel ? `<div class="pp-effect">${escapeHtml(effLabel)}</div>` : ''}
      </button>
    `;
  }).join('');
  return `
    <div class="pack-pick-grid">${cards}</div>
    <div class="pack-pick-footer">CHOOSE ONE FOR FILING · [TAB] NAVIGATE · [ENTER] FILE · [ESC] CANCEL</div>
  `;
}

function setupPackPickHandlers(): void {
  const body = document.getElementById('wb-drawer-body');
  if (!body) return;
  body.querySelectorAll<HTMLElement>('.pack-pick-card[data-pick-idx]').forEach(card => {
    card.onclick = () => {
      if (!previewState.pendingPackPick) return;
      const idx = parseInt(card.dataset.pickIdx ?? '-1', 10);
      const word = previewState.pendingPackPick.pack.words[idx];
      if (typeof word === 'string') shopBus.finalizePackPick(word);
    };
  });
}

// === Skill key bindings ===

// Story 60.1: 拖拽 IN-tray / 跨键 → key 落子
// 状态变更全部走 applyBindFromInbox（在 shapePreview.ts），本函数只负责调用 + DOM 同步
export function bindSkillToKey(skillId: string, key: string): void {
  applyBindFromInbox(skillId, key);
  // Story 60.9 follow-up #9: 标记此 skill 已被装配过 — 后续卸回 IN-tray
  // 时按"已开封"态渲染（去掉运单包装）
  previewState.unsealedSkillIds.add(skillId);
  syncWorkbenchInbox();
  syncWorkbenchKeys();
  sfx('shop_drag_drop'); // Story 60.12: 木质 click — 落到键
}

// Story 60.1: 从键拖回 IN-tray = 整体卸下多格技能
export function unbindSkillFromKey(key: string): void {
  if (applyUnbindKeyToInbox(key) !== undefined) {
    syncWorkbenchInbox();
    syncWorkbenchKeys();
    sfx('shop_drag_unbind'); // Story 60.12: 闷响 — 卸回 IN-tray
  }
}

// Render skill icons on tier-1 keys based on bindings
export function syncWorkbenchKeys(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-keyboard-base');
  if (!root) return;
  const tier1Keys = root.querySelectorAll<HTMLElement>('.kb-key.kb-tier-1[data-key]');
  tier1Keys.forEach(keyEl => {
    const key = keyEl.dataset.key!;
    const skillId = state.player.bindings.get(key);
    // Clear stale state
    keyEl.classList.remove('has-skill');
    keyEl.removeAttribute('data-bound-skill');
    keyEl.removeAttribute('data-drag-type');
    keyEl.removeAttribute('data-shape-id');
    keyEl.removeAttribute('data-rotation');
    keyEl.removeAttribute('data-rarity');
    keyEl.removeAttribute('data-shape-preview');
    const oldIcon = keyEl.querySelector('.kb-icon');
    if (oldIcon) oldIcon.remove();
    const oldTag = keyEl.querySelector('.kb-tag');
    if (oldTag) oldTag.remove();
    if (!skillId) return;
    const sk = state.affixSkills.get(skillId);
    if (!sk) return;
    keyEl.classList.add('has-skill');
    keyEl.dataset.boundSkill = skillId;
    keyEl.dataset.dragType = 'skill-key';
    // Story 60.1: 已绑定键也带形状属性，拖回 IN-tray / 跨键时 dragManager 能读到
    const shapeId = sk.shapeId ?? 'monomino';
    const rotation = sk.rotation ?? 0;
    const rarity = sk.rarity ?? 0;
    if (shapeId !== 'monomino') {
      keyEl.dataset.shapeId = shapeId;
      keyEl.dataset.rotation = String(rotation);
      keyEl.dataset.rarity = String(rarity);
      const preview = renderShapePreview(shapeId, rotation, rarity);
      if (preview) keyEl.dataset.shapePreview = preview;
    }
    const iconSpan = document.createElement('span');
    iconSpan.className = 'kb-icon';
    iconSpan.textContent = sk.icon || '⚡';
    keyEl.appendChild(iconSpan);
    const tagSpan = document.createElement('span');
    tagSpan.className = 'kb-tag';
    tagSpan.textContent = sk.name.split('·')[0].slice(0, 8).toUpperCase();
    keyEl.appendChild(tagSpan);
  });
  attachWorkbenchTooltips();
}

/**
 * Story 60.9: 给工作台 3 类元素挂 hover tooltip
 *   - tier-1 已绑键（.has-skill）→ keyTooltip with skill data
 *   - IN-tray 卡片（.weapon-card[data-drag-type="skill-inventory"]）→ keyTooltip
 *   - 数字键已挂遗物（.has-relic）→ relic tooltip
 * 用 dataset.tooltipBound 防重复挂 listener（参考 60-1 的 rotHandlerBound）
 * 拖拽中跳过：dragManager.dragging 守卫
 */
export function attachWorkbenchTooltips(): void {
  const root = document.getElementById('workbench-screen-preview');
  if (!root) return;

  // 1) tier-1 已绑键 + Story 60.17: 拖拽中的预估 tooltip
  // Story 60.17 修订：之前 60.9 显式屏蔽 dragging 时 tooltip（"挡视线"），
  // 改为：拖拽中 hover 候选键 → 显示"假设绑这里"的预估产出，方便比对落键位。
  // user setting `shopDragPreviewTooltip` 关时回退 60.9 行为。
  root.querySelectorAll<HTMLElement>('.kb-key.kb-tier-1[data-key]').forEach(keyEl => {
    if (keyEl.dataset.tooltipBound === '1') return;
    keyEl.dataset.tooltipBound = '1';
    keyEl.addEventListener('mouseenter', (e: MouseEvent) => {
      // === 拖拽预估路径（Story 60.17）===
      if (dragManager.dragging) {
        if (!shouldShowDragPreviewTooltip()) return;
        const payload = dragManager.currentPayload;
        // 仅 skill 类型 payload 有产出可预估
        if (!payload?.skillId) return;
        if (payload.type !== 'skill-inventory' && payload.type !== 'skill-key') return;
        const hoverKey = keyEl.dataset.key;
        if (!hoverKey) return;
        // 多格技能：只在 hover key 能作为合法 anchor 时显示（mapShapeToKeys 返回 null 表示放不下）
        if (payload.shapeId && payload.shapeId !== 'monomino') {
          const fit = mapShapeToKeys(hoverKey, payload.shapeId, payload.rotation ?? 0);
          if (!fit) return;
        }
        const data = buildSkillKeyTooltipData(payload.skillId, [hoverKey]);
        if (!data) return;
        // Story 60.17 修订：仅显示期望产出（smartEstimate）一行；
        // 无产出（passive / buff 类无 smartEstimate）→ 直接 return 不打扰
        if (!data.skill?.smartEstimate) return;
        keyTooltip.show(e.clientX, e.clientY, data, undefined, false, true);
        return;
      }
      // === 静态已绑键路径（Story 60.9 原路径）===
      if (!keyEl.classList.contains('has-skill')) return;
      const skillId = keyEl.dataset.boundSkill;
      if (!skillId) return;
      const boundKeys: string[] = [];
      for (const [bk, sid] of state.player.bindings) {
        if (sid === skillId) boundKeys.push(bk);
      }
      const data = buildSkillKeyTooltipData(skillId, boundKeys);
      if (!data) return;
      keyTooltip.show(e.clientX, e.clientY, data);
    });
    keyEl.addEventListener('mouseleave', () => keyTooltip.hide());
  });

  // 2) IN-tray 卡片
  root.querySelectorAll<HTMLElement>('.weapon-card[data-drag-type="skill-inventory"]').forEach(cardEl => {
    if (cardEl.dataset.tooltipBound === '1') return;
    cardEl.dataset.tooltipBound = '1';
    cardEl.addEventListener('mouseenter', (e: MouseEvent) => {
      if (dragManager.dragging) return;
      const skillId = cardEl.dataset.skillId;
      if (!skillId) return;
      const data = buildSkillKeyTooltipData(skillId);
      if (!data) return;
      keyTooltip.show(e.clientX, e.clientY, data);
    });
    cardEl.addEventListener('mouseleave', () => keyTooltip.hide());
  });

  // 3) 数字键已挂遗物
  root.querySelectorAll<HTMLElement>('.kb-key.kb-tier-2.has-relic[data-key]').forEach(keyEl => {
    if (keyEl.dataset.tooltipBound === '1') return;
    keyEl.dataset.tooltipBound = '1';
    keyEl.addEventListener('mouseenter', (e: MouseEvent) => {
      if (dragManager.dragging) return;
      const relicId = keyEl.dataset.relicId;
      if (!relicId) return;
      const relic = RELICS[relicId];
      if (!relic) return;
      showRelicTooltip(e, relic);
    });
    keyEl.addEventListener('mousemove', (e: MouseEvent) => {
      if (dragManager.dragging) return;
      moveRelicTooltip(e);
    });
    keyEl.addEventListener('mouseleave', () => hideRelicTooltip());
  });
}

// Register all tier-1 letter keys + IN-tray as drop zones
export function setupDragZones(): void {
  dragManager.clearDropZones();
  const wbRoot = document.getElementById('workbench-screen-preview');
  if (!wbRoot) return;
  // Each tier-1 key is a drop zone for skill-inventory + skill-key
  wbRoot.querySelectorAll<HTMLElement>('.kb-key.kb-tier-1[data-key]').forEach(keyEl => {
    const key = keyEl.dataset.key!;
    dragManager.registerDropZone({
      element: keyEl,
      type: 'key-slot',
      key,
      accepts: (p: DragPayload) => p.type === 'skill-inventory' || p.type === 'skill-key',
      onDrop: (p: DragPayload) => {
        const skillId = p.skillId;
        if (!skillId) return;
        // Story 60.1 follow-up: 拾取右键旋转后的 payload.rotation 写回 affixSkill，
        // 让 bindShapeToKeys 用最新旋转态（与 classic shop:4074 同模式）
        if (p.rotation != null) {
          const sk = state.affixSkills.get(skillId);
          if (sk) sk.rotation = p.rotation;
        }
        // 跨键拖拽 / IN-tray 拖入 — applyBindFromInbox 内部 bindShapeToKeys
        // 已自带 unbindSkill(self) 步骤，无需在此手动卸源键
        clearShapePlacementOnWorkbench();
        bindSkillToKey(skillId, key);
      },
      // Story 60.1: hover 多格形状预览
      onDragEnter: (p: DragPayload) => {
        highlightShapePlacementOnWorkbench(key, p);
      },
      onDragLeave: () => {
        clearShapePlacementOnWorkbench();
      },
    });

    // Story 60.1: 右键旋转已绑定多格技能（避免 syncWorkbenchInbox 重新调用时重复挂）
    if (keyEl.dataset.rotHandlerBound !== '1') {
      keyEl.dataset.rotHandlerBound = '1';
      keyEl.addEventListener('contextmenu', (e: MouseEvent) => {
        if (!keyEl.classList.contains('has-skill')) return;
        e.preventDefault();
        e.stopPropagation();
        handleWorkbenchKeyRotation(key, e.shiftKey, syncWorkbenchKeys, syncWorkbenchInbox);
      });
    }
  });
  // IN-tray foam case: drop zone for skill-key (drag bound key back to inbox = unbind)
  const intray = wbRoot.querySelector('.wb-foam-case') as HTMLElement | null;
  if (intray) {
    dragManager.registerDropZone({
      element: intray,
      type: 'skill-inventory',
      accepts: (p: DragPayload) => p.type === 'skill-key',
      onDrop: (p: DragPayload) => {
        if (p.sourceKey) unbindSkillFromKey(p.sourceKey);
      },
    });
  }
}

// Number-row: render relic icons on keys 1..0 in insertion order
export function syncWorkbenchRelics(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-keyboard-base');
  if (!root) return;
  const RELIC_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const relicIds = Array.from(state.player.relics);
  for (let i = 0; i < RELIC_KEYS.length; i++) {
    const keyEl = root.querySelector(`.kb-key.kb-tier-2[data-key="${RELIC_KEYS[i]}"]`) as HTMLElement | null;
    if (!keyEl) continue;
    // remove old relic overlay
    const old = keyEl.querySelector('.kb-relic');
    if (old) old.remove();
    keyEl.classList.remove('has-relic');
    const relicId = relicIds[i];
    if (!relicId) continue;
    const icon = RELICS[relicId]?.icon || '🏺';
    const span = document.createElement('span');
    span.className = 'kb-relic';
    span.textContent = icon;
    keyEl.appendChild(span);
    keyEl.classList.add('has-relic');
    keyEl.dataset.relicId = relicId;
  }
  attachWorkbenchTooltips();
}

export function syncWorkbenchInbox(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-foam-case');
  if (!root) return;
  // Find descriptor for each inbox skillId by scanning historical previewState.undoStack and current cache
  const slots: string[] = [];
  for (const skillId of state.player.inbox) {
    const sk = state.affixSkills.get(skillId);
    if (!sk) continue;
    const shapeId = sk.shapeId ?? 'monomino';
    const rotation = sk.rotation ?? 0;
    const rarity = sk.rarity ?? 0;
    slots.push(renderInboxCardHtml({
      iconEmoji: sk.icon || '◇',
      name: sk.name.toUpperCase(),
      sku: previewState.undoStack.find(u => u.kind === 'skill' && u.skillId === skillId)?.sku ?? '???-???',
      clearance: sk.rarity >= 2 ? '4-A' : '4-B',
      skillId,
      shapeId,
      rotation,
      rarity,
      shapePreviewHtml: renderShapePreview(shapeId, rotation, rarity),
      opened: previewState.unsealedSkillIds.has(skillId),
    }));
  }
  while (slots.length < INBOX_MAX) slots.push('<div class="foam-cutout empty"><span class="cutout-empty-label">— 空槽 —</span></div>');
  root.innerHTML = slots.join('');
  // Re-register drop zones since IN-tray DOM was rebuilt
  if (previewState.active) setupDragZones();
  const sub = document.querySelector('#workbench-screen-preview .wb-intray .wb-tab-sub');
  if (sub) sub.textContent = `待装配 · ${String(state.player.inbox.length).padStart(2, '0')}`;
  attachWorkbenchTooltips();
}

function escapeAttr(s: string): string {
  // & 必须先转义，否则后续转义产生的实体字符（如 &quot;）会被二次解释
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderInboxCardHtml(c: InboxCardData): string {
  // Story 60.1: 多格形状属性（dragManager.buildPayload 会读 data-shape-* 进 payload）
  const shapeAttrs = c.shapePreviewHtml
    ? ` data-shape-id="${c.shapeId}" data-rotation="${c.rotation}" data-rarity="${c.rarity}" data-shape-preview="${escapeAttr(c.shapePreviewHtml)}"`
    : '';
  const shapeBlock = c.shapePreviewHtml
    ? `<div class="wc-shape">${c.shapePreviewHtml}</div>`
    : '';
  // Story 60.9 follow-up #9: 双视觉态
  //   - 未拆封（fresh 购入）：完整运单（章戳 + SN + 满宽条形码 + 解码数字）
  //   - 已开封（曾装配过又卸回）：去掉运单包装，加 OPENED 红章
  if (c.opened) {
    return `
    <div class="foam-cutout">
      <div class="weapon-card opened" data-drag-type="skill-inventory" data-skill-id="${c.skillId}"${shapeAttrs}>
        <div class="wc-row">
          <span class="wc-icon inv-icon">${c.iconEmoji}</span>
          <span class="wc-name inv-name">${c.name}</span>
        </div>
        ${shapeBlock}
        <div class="wc-stamp wc-stamp-opened">${escapeHtml(t('shop.workbench.stamp.opened'))}</div>
      </div>
    </div>
  `;
  }
  // Fresh 购入 — 完整运单包装
  const stamp = c.clearance === '4-A'
    ? `<div class="wc-stamp wc-stamp-gold">${escapeHtml(t('shop.workbench.stamp.clearance_a'))}</div>`
    : `<div class="wc-stamp">${escapeHtml(t('shop.workbench.stamp.regulation'))}</div>`;
  const barcodePattern = '▌▎▍▎▌▌▏▎▌▍▎▌▎▌▍▎▌▌▎▍▌▎▏▌▍▎▌▌▎▍▌▎▌▎▍▌';
  const barcodeNum = `${c.sku}-7842`;
  return `
    <div class="foam-cutout">
      <div class="weapon-card" data-drag-type="skill-inventory" data-skill-id="${c.skillId}"${shapeAttrs}>
        <div class="wc-row">
          <span class="wc-icon inv-icon">${c.iconEmoji}</span>
          <span class="wc-name inv-name">${c.name}</span>
        </div>
        <div class="wc-sn-line">SN · ${c.sku}-7842</div>
        ${shapeBlock}
        ${stamp}
        <div class="wc-barcode-strip">
          <div class="wc-barcode">${barcodePattern}</div>
          <div class="wc-barcode-num">${barcodeNum}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bootstrap 调用：注册 workbench-provided 函数到 shopBus，让 terminal cmd / bootstrap onKey 能拨号。
 */
export function registerWorkbenchBindings(): void {
  shopBus.syncWorkbenchInbox = syncWorkbenchInbox;
  shopBus.syncWorkbenchRelics = syncWorkbenchRelics;
  shopBus.syncWorkbenchKeys = syncWorkbenchKeys;
  shopBus.attachWorkbenchTooltips = attachWorkbenchTooltips;
  shopBus.setupDragZones = setupDragZones;
  shopBus.openDrawer = openDrawer;
  shopBus.closeDrawer = closeDrawer;
  shopBus.triggerInboxWhoosh = triggerInboxWhoosh;
}
