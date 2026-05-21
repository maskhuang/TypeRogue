// ============================================
// Shop Preview · Workbench Module (Story 60.16)
// ============================================
// 工作台 DOM：键盘绑定 / IN-tray 卡片渲染 / 抽屉 / drag zones / hover tooltips。
// 拆自原 shopPreview.ts；terminal-side 反向回调走 shopBus（finalizePackPick/
// cancelPackPick/updateTerminalChrome）。
// ============================================

import { state } from '../../core/state';
import { INBOX_MAX, PUNCTUATION_KEYS, RESOURCE_ICONS } from '../../core/constants';
import { eventBus } from '../../core/events/EventBus';
import { calculateLetterFrequency, FREQ_UNLOCK_THRESHOLD } from '../../systems/letters/LetterFrequencySystem';
import {
  renderShapePreview,
  getFreqHints,
  formatWordEffectLabel,
  buildSkillKeyTooltipData,
  showRelicTooltip,
  hideRelicTooltip,
  moveRelicTooltip,
} from '../../systems/shop';
import { keyTooltip, AFFIX_COLORS, type KeyTooltipData } from '../keyboard/KeyTooltip';
import { getV2Color, getAffixV2Definition } from '../../data/affixV2';
import { extractSelectorFromEffect, resolveSelectorToHighlightKeys } from '../../systems/affixV2ScopeKeys';
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
// Story 60.18: 范围词条（splash/echo/aura/relay/war_drum/conduit/amplify 等）键盘高亮
import { getKeysWithRelation } from '../../data/keyboardTopology';
import { t, getLocale } from '../../demo/demo-i18n';
import { pickWorkbenchNote, recordShopVisit, getNoteText } from '../../data/narrative/workbenchNotes';
import type { WordPack } from '../../core/types';
import {
  previewState,
  shopBus,
  deskSfx,
  escapeHtml,
} from './shopState';
import type { DrawerKind, InboxCardData } from './shopState';
// 直接引用卖出函数（shopTerminal 不 import 本模块 → 无循环）。
// 不走 shopBus.getInboxRefund/sellInboxSkill：那是可变单例、依赖 wire 初始化顺序，
// HMR / 时序下会停留在默认 ()=>0，导致回收槽退款显示恒为 0。
import { computeInboxRefund, sellSkillById } from './shopTerminal';

// === Story 60.17 follow-up: 拖拽 hover 节流（防扫键 jank）===
// 用户 dogfood 反馈拖拽中扫键卡几秒 — buildSkillKeyTooltipData 含 buildAffixTooltipFields
// + computeSmartEstimate + getShapeDescription 同步重算，~10ms+/次。快速扫 30 键
// 同步累计 jank。RAF 节流 + same-key dedup 把成本压到一帧一次 build。
let dragHoverRafId: number | null = null
let dragHoverLastKey: string | null = null

// === Story 60.18: 范围词条 effect radius 高亮 ===
//
// 拖拽 skill 含范围词条（splash / aura / relay / war_drum / conduit / amplify
// 等带 posRel 的词条）时，hover 候选键 K → K 的 posRel 关系键加 outline。
// 多格 tetromino 走 mapShapeToKeys 解析 occupied cells，对每个 cell 的 posRel
// 关系键 union（与 affixTrigger.getExtendedNeighbors 同语义）。
// 用 getKeysWithRelation（与 affixTrigger 触发逻辑共用同算法 → 0 漂移误导）。
const RADIUS_PREVIEW_CLASS = 'effect-radius-preview'
const TRIGGER_SOURCE_PREVIEW_CLASS = 'trigger-source-preview'

/**
 * 算 skill 在 hoverKey anchor 处的真实 effect radius keys —
 * 多格技能：用 mapShapeToKeys 解析所有 occupied cells，对每个 cell 取 posRel 关系键 union（与 affixTrigger.getExtendedNeighbors 同语义），排除 occupied 自身。
 * 单格：直接用 hoverKey。
 * 多个范围词条 posRel union 显示（如同时有 splash + aura → 多 posRel 并集）。
 */
function getEffectRadiusKeys(skillId: string, hoverKey: string, payloadShapeId?: string, payloadRotation?: number): string[] {
  const skill = state.affixSkills.get(skillId)
  if (!skill) return []
  // 算 skill 实际 occupied keys（多格用 payload 的 shape，单格直接 [hoverKey]）
  let occupiedKeys: string[] = [hoverKey]
  if (payloadShapeId && payloadShapeId !== 'monomino') {
    const fit = mapShapeToKeys(hoverKey, payloadShapeId, payloadRotation ?? 0)
    if (fit) occupiedKeys = fit
    // mapShapeToKeys 返 null 表示放不下 — fallback 仅 hoverKey
  }
  const occupiedSet = new Set(occupiedKeys)
  const radiusKeys = new Set<string>()
  // 1) Legacy affixes posRel
  for (const affix of skill.affixes) {
    if (!affix.posRel) continue
    for (const ok of occupiedKeys) {
      for (const k of getKeysWithRelation(ok, affix.posRel)) {
        if (!occupiedSet.has(k)) radiusKeys.add(k)
      }
    }
  }
  // 2) V2 affixes selector → 解析为 highlight 键
  for (const defId of skill.v2Ids ?? []) {
    const def = getAffixV2Definition(defId)
    if (!def) continue
    const sel = extractSelectorFromEffect(def.effect)
    if (!sel) continue
    for (const k of resolveSelectorToHighlightKeys(sel, occupiedKeys, occupiedSet)) {
      if (!occupiedSet.has(k)) radiusKeys.add(k)
    }
  }
  return Array.from(radiusKeys)
}

/** 给候选范围键加 outline 高亮 class — exported for unit testing (60.18 review M1 fix)
 *  同时为 V2 trigger.filter 监听源加 dashed inner ring（trigger-source-preview）
 */
export function highlightEffectRadius(hoverKey: string, skillId: string, shapeId?: string, rotation?: number): void {
  const root = document.getElementById('workbench-screen-preview')
  if (!root) return
  // effect 目标键：solid outline
  const effectKeys = getEffectRadiusKeys(skillId, hoverKey, shapeId, rotation)
  for (const k of effectKeys) {
    const keyEl = root.querySelector<HTMLElement>(`.kb-key.kb-tier-1[data-key="${CSS.escape(k)}"]`)
    if (keyEl) keyEl.classList.add(RADIUS_PREVIEW_CLASS)
  }
  // V2 trigger.filter 监听源键：dashed inner ring
  const triggerKeys = getTriggerSourceKeys(skillId, hoverKey, shapeId, rotation)
  for (const k of triggerKeys) {
    const keyEl = root.querySelector<HTMLElement>(`.kb-key.kb-tier-1[data-key="${CSS.escape(k)}"]`)
    if (keyEl) keyEl.classList.add(TRIGGER_SOURCE_PREVIEW_CLASS)
  }
}

/** 拖起 IN-tray 卡时点亮回收槽（脉冲邀请投放）；拖拽结束时熄灭 */
export function armDisposalZone(active: boolean): void {
  const d = document.querySelector('#workbench-screen-preview #wb-disposal-zone');
  if (d) d.classList.toggle('armed', active);
}

/** 清除所有 effect-radius-preview / trigger-source-preview 高亮 — bootstrap onDragEnd cleanup */
export function clearEffectRadiusHighlight(): void {
  const root = document.getElementById('workbench-screen-preview')
  if (!root) return
  root.querySelectorAll<HTMLElement>(`.kb-key.${RADIUS_PREVIEW_CLASS}`).forEach(el => {
    el.classList.remove(RADIUS_PREVIEW_CLASS)
  })
  root.querySelectorAll<HTMLElement>(`.kb-key.${TRIGGER_SOURCE_PREVIEW_CLASS}`).forEach(el => {
    el.classList.remove(TRIGGER_SOURCE_PREVIEW_CLASS)
  })
}

/** V2 trigger.filter 解析为监听源键列表（"我会听这里的 fire"）
 *  filter.posRel → 该 posRel 的邻位键
 *  filter.tag → 场上挂该 tag 的 V2 affix 所在 skill 键
 *  filter.resource → 场上该资源 skill 键
 *  is_crit / stack_state 不是位置维度，无 highlight 输出
 */
function getTriggerSourceKeys(skillId: string, hoverKey: string, payloadShapeId?: string, payloadRotation?: number): string[] {
  const skill = state.affixSkills.get(skillId)
  if (!skill?.v2Ids?.length) return []
  // occupied keys（与 effect radius 同算法）
  let occupiedKeys: string[] = [hoverKey]
  if (payloadShapeId && payloadShapeId !== 'monomino') {
    const fit = mapShapeToKeys(hoverKey, payloadShapeId, payloadRotation ?? 0)
    if (fit) occupiedKeys = fit
  }
  const occupiedSet = new Set(occupiedKeys)
  const out = new Set<string>()
  for (const defId of skill.v2Ids) {
    const def = getAffixV2Definition(defId)
    if (!def) continue
    if (def.trigger.type !== 'on_fire' || !def.trigger.filter) continue
    const f = def.trigger.filter
    if (f.posRel !== undefined) {
      for (const ok of occupiedKeys) {
        for (const k of getKeysWithRelation(ok, f.posRel)) {
          if (!occupiedSet.has(k)) out.add(k)
        }
      }
    }
    if (f.tag) {
      const tags = Array.isArray(f.tag) ? f.tag : [f.tag]
      for (const [k, sid] of state.player.bindings) {
        if (occupiedSet.has(k)) continue
        const sk = state.affixSkills.get(sid)
        const hit = sk?.v2Ids?.some(id => {
          const d = getAffixV2Definition(id)
          return d && tags.some(t => d.tags.includes(t))
        })
        if (hit) out.add(k)
      }
    }
    if (f.resource) {
      for (const [k, sid] of state.player.bindings) {
        if (occupiedSet.has(k)) continue
        const sk = state.affixSkills.get(sid)
        if (sk?.resource === f.resource) out.add(k)
      }
    }
  }
  return Array.from(out)
}

/**
 * Story 60.17 review M2: 拖拽结束 / 出店时由 bootstrap 调，cancel pending RAF
 * 并清 lastKey，防止跨 session 状态污染或 drop 后 tooltip stale flash。
 */
export function cancelDragHoverPending(): void {
  if (dragHoverRafId != null) {
    const caf = (globalThis as unknown as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame
    if (typeof caf === 'function') caf(dragHoverRafId)
    dragHoverRafId = null
  }
  dragHoverLastKey = null
}

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
  deskSfx('whoosh'); // 抽屉滑出（替代 shop_drawer_open）
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
    return `<div class="wb-drawer-empty">${escapeHtml(t('wb.no_words_filed'))}</div>`;
  }
  const rows = words.map((w, i) => {
    const eff = state.wordEffects.get(w);
    const effLabel = eff ? `[${eff.type.toUpperCase()}${eff.value ? ' ' + eff.value : ''}]` : '';
    return `<li class="wb-word-row"><span class="ww-idx">${String(i + 1).padStart(3, '0')}</span><span class="ww-name">${w.toUpperCase()}</span><span class="ww-meta">${escapeHtml(t('wb.len_label'))} ${w.length}</span><span class="ww-eff">${effLabel}</span></li>`;
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
        <div class="pp-meta">${escapeHtml(t('wb.len_label'))} ${w.length}${freqHint ? ' · ' + escapeHtml(freqHint) : ''}</div>
        ${effLabel ? `<div class="pp-effect">${escapeHtml(effLabel)}</div>` : ''}
      </button>
    `;
  }).join('');
  return `
    <div class="pack-pick-grid">${cards}</div>
    <div class="pack-pick-footer">${escapeHtml(t('wb.pack_pick_footer'))}</div>
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
  deskSfx('punch'); // 落键 mechanical thud（替代 shop_drag_drop）
  eventBus.emit('skill:bound', { skillId, key });
}

// Story 60.1: 从键拖回 IN-tray = 整体卸下多格技能
export function unbindSkillFromKey(key: string): void {
  if (applyUnbindKeyToInbox(key) !== undefined) {
    syncWorkbenchInbox();
    syncWorkbenchKeys();
    deskSfx('paper'); // 卸回 IN-tray 软返（替代 shop_drag_unbind）
  }
}

// Render skill icons on tier-1 keys based on bindings
export function syncWorkbenchKeys(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-keyboard-base');
  if (!root) return;
  // freq-lock 检测：
  //   字母键：freq < FREQ_UNLOCK_THRESHOLD → locked
  //   标点键：未持有 punctuation_liberation 遗物 → locked（持有后解锁全部标点）
  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  const hasPunctuationRelic = state.player.relics.has('punctuation_liberation');
  const tier1Keys = root.querySelectorAll<HTMLElement>('.kb-key.kb-tier-1[data-key]');
  tier1Keys.forEach(keyEl => {
    const key = keyEl.dataset.key!;
    const skillId = state.player.bindings.get(key);
    const isPunctKey = PUNCTUATION_KEYS.includes(key);
    const isFreqLocked = isPunctKey
      ? !hasPunctuationRelic
      : (letterFreqs.get(key) ?? 0) < FREQ_UNLOCK_THRESHOLD;
    keyEl.classList.toggle('freq-locked', isFreqLocked);
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
    // Story 60.20 dogfood: kb-tag 用词条颜色色带 — 多词条则按词条数等分。
    // V2 优先按 v2Ids 染色（section 主色），legacy fallback 用 AFFIX_COLORS[affix.type]。
    // 0 词条 → 单段 base 灰；N 词条 → N 段。
    const tagSpan = document.createElement('span');
    tagSpan.className = 'kb-tag';
    const v2Ids = sk.v2Ids ?? [];
    const affixes = sk.affixes ?? [];
    if (v2Ids.length > 0) {
      for (const defId of v2Ids) {
        const seg = document.createElement('span');
        seg.className = 'kb-tag-seg';
        seg.style.background = getV2Color(defId);
        tagSpan.appendChild(seg);
      }
    } else if (affixes.length === 0) {
      const seg = document.createElement('span');
      seg.className = 'kb-tag-seg';
      seg.style.background = AFFIX_COLORS.base || '#cccccc';
      tagSpan.appendChild(seg);
    } else {
      for (const affix of affixes) {
        const seg = document.createElement('span');
        seg.className = 'kb-tag-seg';
        seg.style.background = AFFIX_COLORS[affix.type] || '#cccccc';
        tagSpan.appendChild(seg);
      }
    }
    keyEl.appendChild(tagSpan);
  });
  attachWorkbenchTooltips();
  // M2 review fix: syncWorkbenchKeys 不再 chain syncFiledFolders —
  // 键面绑定移动确实可能改 FILED sort 顺序（取首键字母），但属于二阶视觉细节；
  // 通过 cmd 路径上别处的 syncWorkbenchInbox 已覆盖；这里不再隐式触发，避免
  // "更新键 visual 的函数还偷偷动 FILED" 的反向耦合。
}

/**
 * Story 60.9: 给工作台 3 类元素挂 hover tooltip
 *   - tier-1 已绑键（.has-skill）→ keyTooltip with skill data
 *   - IN-tray 卡片（.weapon-card[data-drag-type="skill-inventory"]）→ keyTooltip
 *   - 数字键已挂遗物（.has-relic）→ relic tooltip
 * 用 dataset.tooltipBound 防重复挂 listener（参考 60-1 的 rotHandlerBound）
 * 拖拽中跳过：dragManager.dragging 守卫
 */
/** 工作台键盘 bounding rect — 给 keyTooltip 智能避让用（IN-tray + drag preview 路径仍用） */
function getWorkbenchKeyboardAvoidRect(): { top: number; left: number; right: number; bottom: number } | undefined {
  const wbRoot = document.getElementById('workbench-screen-preview');
  if (!wbRoot) return undefined;
  const kbEl = wbRoot.querySelector<HTMLElement>('.wb-keyboard-base');
  if (!kbEl || typeof kbEl.getBoundingClientRect !== 'function') return undefined;
  const r = kbEl.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
}

/** 工作台底部固定 tooltip 面板 · 已绑键 hover 时显示，横排各 section · .show 切显隐过渡 */
function ensureWorkbenchBottomTooltip(): HTMLElement | null {
  const wbRoot = document.getElementById('workbench-screen-preview');
  if (!wbRoot) return null;
  let panel = wbRoot.querySelector<HTMLElement>('.wb-bound-tooltip-panel');
  if (!panel) {
    panel = document.createElement('div');
    // 同时挂 key-tooltip class 复用其内部 section 样式 · wb-bound-tooltip-panel 覆盖定位
    panel.className = 'key-tooltip wb-bound-tooltip-panel';
    wbRoot.appendChild(panel);
  }
  return panel;
}
function showWorkbenchBottomTooltip(data: KeyTooltipData): void {
  const panel = ensureWorkbenchBottomTooltip();
  if (!panel) return;
  keyTooltip.renderInElement(panel, data, true);
  // 紧贴 workbench-footer 顶部（避免被 footer 的 dashed border / note / submit 盖住）
  const wbRoot = document.getElementById('workbench-screen-preview');
  const footer = wbRoot?.querySelector<HTMLElement>('.workbench-footer');
  const footerH = footer?.offsetHeight ?? 0;
  panel.style.bottom = `${footerH}px`;
  // 下一帧加 .show 触发 opacity/transform 过渡
  requestAnimationFrame(() => panel.classList.add('show'));
}
function hideWorkbenchBottomTooltip(): void {
  const wbRoot = document.getElementById('workbench-screen-preview');
  const panel = wbRoot?.querySelector<HTMLElement>('.wb-bound-tooltip-panel');
  if (panel) panel.classList.remove('show');
}

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
      // === 拖拽预估路径（Story 60.17 + follow-up RAF 节流）===
      if (dragManager.dragging) {
        if (!shouldShowDragPreviewTooltip()) return;
        const payload = dragManager.currentPayload;
        if (!payload?.skillId) return;
        if (payload.type !== 'skill-inventory' && payload.type !== 'skill-key') return;
        const hoverKey = keyEl.dataset.key;
        if (!hoverKey) return;
        // Same-key dedup: 同一 key 在一帧内重复触发不重算（防御重复 mouseenter）
        if (dragHoverLastKey === hoverKey && dragHoverRafId != null) return;
        // RAF 节流：取消上一帧未跑完的 build（鼠标快速跨多个键时只算最后一个）
        cancelDragHoverPending();
        dragHoverLastKey = hoverKey;
        const cx = e.clientX;
        const cy = e.clientY;
        const skillId = payload.skillId;
        const shapeId = payload.shapeId;
        const rotation = payload.rotation ?? 0;
        const rafFn = (globalThis as unknown as {
          requestAnimationFrame?: (cb: () => void) => number
        }).requestAnimationFrame;
        const raf = typeof rafFn === 'function'
          ? rafFn
          : ((cb: () => void) => setTimeout(cb, 0) as unknown as number);
        dragHoverRafId = raf(() => {
          dragHoverRafId = null;
          // Story 60.17 review M3: drop / cancel 后 RAF 仍可能跑 — guard 不在拖拽就 bail，
          // 防止 stale tooltip 在用户已落键的键上闪现误导
          if (!dragManager.dragging) return;
          // Story 60.18 一致性修订：boundKeys 应为 skill 真实 occupied keys（多格用
          // mapShapeToKeys 解析所有 cells）而非单点 hoverKey — 与 60.18 effect radius
          // 高亮、affixTrigger 实际触发逻辑共用同一 occupied 集合，computeSmartEstimate
          // 算的产出才与玩家落键后真实表现一致。
          let boundKeys: string[] = [hoverKey];
          if (shapeId && shapeId !== 'monomino') {
            const fit = mapShapeToKeys(hoverKey, shapeId, rotation);
            if (!fit) return;  // 放不下 → 不显示
            boundKeys = fit;
          }
          // Story 60.18 dogfood: 虚拟卸下被拖技能的旧绑定，让 computeSmartEstimate 看到
          // "如果绑这里、其他位置没我"的状态 — 否则 skill 残留在键盘上的 cells 会被
          // void / aura / amplify / war_drum 等 affix 误算入邻居（产出预估虚高/虚低）。
          // sync mutate state.player.bindings → buildSkillKeyTooltipData → restore，原子操作。
          const oldBindings: Array<[string, string]> = [];
          for (const [k, sid] of state.player.bindings) {
            if (sid === skillId) oldBindings.push([k, sid]);
          }
          for (const [k] of oldBindings) state.player.bindings.delete(k);
          let data;
          try {
            data = buildSkillKeyTooltipData(skillId, boundKeys);
          } finally {
            for (const [k, sid] of oldBindings) state.player.bindings.set(k, sid);
          }
          if (!data) return;
          if (!data.skill?.smartEstimate) return;
          // Story 60.17 dogfood: tooltip 智能避让键盘 — 取 .wb-keyboard-base 包围盒做
          // avoidRect，KeyTooltip.show 优先放在键盘上方/下方/左右（不挡视线、不需玩家
          // 移开鼠标才能看到键盘）。
          let avoidRect: { top: number; left: number; right: number; bottom: number } | undefined;
          const wbRoot = document.getElementById('workbench-screen-preview');
          if (wbRoot && typeof wbRoot.querySelector === 'function') {
            const kbEl = wbRoot.querySelector<HTMLElement>('.wb-keyboard-base');
            if (kbEl && typeof kbEl.getBoundingClientRect === 'function') {
              const r = kbEl.getBoundingClientRect();
              avoidRect = { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
            }
          }
          keyTooltip.show(cx, cy, data, avoidRect, false, true);
        });
        return;
      }
      // === 静态已绑键路径 · 改底部全宽横排面板（原 Story 60.9 floating 撤回）===
      if (!keyEl.classList.contains('has-skill')) return;
      const skillId = keyEl.dataset.boundSkill;
      if (!skillId) return;
      const boundKeys: string[] = [];
      for (const [bk, sid] of state.player.bindings) {
        if (sid === skillId) boundKeys.push(bk);
      }
      const data = buildSkillKeyTooltipData(skillId, boundKeys);
      if (!data) return;
      showWorkbenchBottomTooltip(data);
    });
    keyEl.addEventListener('mouseleave', () => {
      // 取消可能 pending 的 drag-preview build；hide floating tooltip（拖拽预估用）+ 底部面板
      cancelDragHoverPending();
      dragHoverLastKey = null;
      keyTooltip.hide();
      hideWorkbenchBottomTooltip();
    });
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
      // IN-tray hover 也避开键盘
      keyTooltip.show(e.clientX, e.clientY, data, getWorkbenchKeyboardAvoidRect());
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
        clearEffectRadiusHighlight();
        bindSkillToKey(skillId, key);
      },
      // Story 60.1: hover 多格形状预览
      // Story 60.18 (修订): 所有 skill（含多格）都显示 effect radius 高亮 —
      // 多格 + 范围词条是常见组合（如 war_drum/union: symmetric on domino），
      // shape preview (绿/金章 outline solid) 与 effect radius (橙 outline + bg + pulse)
      // 视觉风格区分明显，组合显示不冲突。
      // 多格情况：用 mapShapeToKeys 解析所有 occupied cells，对每个取 posRel union
      // （与 affixTrigger.getExtendedNeighbors 同语义，杜绝高亮误导玩家）。
      onDragEnter: (p: DragPayload) => {
        highlightShapePlacementOnWorkbench(key, p);
        if (p.skillId) {
          highlightEffectRadius(key, p.skillId, p.shapeId, p.rotation);
        }
      },
      onDragLeave: () => {
        clearShapePlacementOnWorkbench();
        clearEffectRadiusHighlight();
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
  // 回收槽：拖入 IN-tray 卡片 = 卖出（拖入显示退款额，落手即卖、无二次确认）
  const disposal = wbRoot.querySelector('#wb-disposal-zone') as HTMLElement | null;
  if (disposal) {
    const hintEl = wbRoot.querySelector('#wb-disposal-hint') as HTMLElement | null;
    const resetHint = () => { if (hintEl) hintEl.textContent = t('wb.disposal_hint'); };
    dragManager.registerDropZone({
      element: disposal,
      type: 'disposal',  // 非 'sell-zone' → dragManager 不覆写本槽 DOM（icon/label/hint 由本模块自管）
      // IN-tray 卡（skill-inventory）+ 键位上已装备技能（skill-key）都可直接拖来卖
      accepts: (p: DragPayload) => (p.type === 'skill-inventory' || p.type === 'skill-key') && !!p.skillId,
      onDragEnter: (p: DragPayload) => {
        disposal.classList.add('drag-over');
        if (p.skillId && hintEl) hintEl.textContent = t('wb.disposal_refund', { gold: computeInboxRefund(p.skillId) });
      },
      onDragLeave: () => {
        disposal.classList.remove('drag-over');
        resetHint();
      },
      onDrop: (p: DragPayload) => {
        disposal.classList.remove('drag-over');
        if (p.skillId) {
          deskSfx('punch');                 // 投入回收槽 = 打孔/落槽音
          sellSkillById(p.skillId);         // 统一处理 IN-tray 卡 + 已绑定键位
        }
        resetHint();
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
  // FILED.RELIC 行随 owned relics 变化；BUY/UND relic 路径调本函数后必须刷 FILED 行。
  syncFiledFolders();
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
    // 优先按 resource 取最新 RESOURCE_ICONS（修复旧 save 残留的过期 icon，如 shield 加入前生成的 '?'）
    const iconFromResource = RESOURCE_ICONS[sk.resource ?? ''];
    slots.push(renderInboxCardHtml({
      iconEmoji: iconFromResource || sk.icon || '◇',
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
  while (slots.length < INBOX_MAX) slots.push(`<div class="foam-cutout empty"><span class="cutout-empty-label">${escapeHtml(t('wb.intray_empty_slot'))}</span></div>`);
  root.innerHTML = slots.join('');
  // Re-register drop zones since IN-tray DOM was rebuilt
  if (previewState.active) setupDragZones();
  const sub = document.querySelector('#workbench-screen-preview .wb-intray .wb-tab-sub');
  if (sub) sub.textContent = t('wb.intray_sub', { count: String(state.player.inbox.length).padStart(2, '0') });
  attachWorkbenchTooltips();
  // FILED.SKILL 行随 inbox + bindings 变化；BUY/SELL/UND/拖装填 路径都调本函数后刷 FILED。
  // 进店 enterTerminalShop 调一次本函数，已附带 syncFiledFolders 调用 → 不再需要进店点显式触发。
  syncFiledFolders();
}

// === FILED cabinet content：字频统计（取代旧的 SKILL+RELIC 冗余清单） ===
// 旧设计：在编档案展示已购技能 + 遗物 —— 但键盘上每个键已经显示这些信息，重复
// 新设计：单一 FREQ folder，从 wordDeck 算各字母出现次数 + 占比横条，按降序

export function renderFreqFolderHtml(): { count: number; rowsHtml: string } {
  const freq = calculateLetterFrequency(state.player.wordDeck);
  if (freq.size === 0) {
    return { count: 0, rowsHtml: `<div class="folder-row folder-empty">${escapeHtml(t('wb.no_words_filed'))}</div>` };
  }
  const entries = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const maxCount = entries[0][1];
  const rows: string[] = [];
  for (const [letter, count] of entries) {
    const ratio = maxCount > 0 ? count / maxCount : 0;
    const widthPct = Math.max(4, Math.round(ratio * 100));   // 最低 4% 保留可见占位
    const letterCell = escapeHtml(letter.toUpperCase());
    // CSS 进度条 · .fr-bar 为印章凹槽，.fr-bar-fill 为油墨印 · 详 style.css §FILED
    rows.push(`<div class="folder-row"><span class="fr-icon">${letterCell}</span><span class="fr-bar"><span class="fr-bar-fill" style="width:${widthPct}%"></span></span><span class="fr-lv">${count}</span></div>`);
  }
  return { count: freq.size, rowsHtml: rows.join('') };
}

/** 进店时刷一张工作台便签 · recordShopVisit 推进 visit count，触发 first_shop/after_n_shops oneShot */
export function refreshWorkbenchNote(): void {
  const el = document.querySelector<HTMLElement>('#workbench-screen-preview .note-text');
  if (!el) return;
  recordShopVisit();
  const note = pickWorkbenchNote(state.cycle ?? 1);
  // 用 innerHTML 渲染轻量 markdown（~~strikethrough~~ / **bold** / *italic*）
  // escape 优先做（XSS 防御），再做语法转换
  el.innerHTML = renderNoteInline(getNoteText(note, getLocale()));
  el.dataset.noteId = note.id; // 便于 console / QA 定位
}

/** 工作台便条内联 markdown 渲染 · escape 后转 strikethrough / bold / italic */
function renderNoteInline(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function syncFiledFolders(): void {
  const root = document.getElementById('workbench-screen-preview');
  if (!root) return;
  const freq = renderFreqFolderHtml();
  const freqBody = root.querySelector('#filed-freq-folder .folder-body');
  const freqTab = root.querySelector('#filed-freq-folder .folder-tab');
  if (freqBody) freqBody.innerHTML = freq.rowsHtml;
  if (freqTab) freqTab.textContent = t('wb.folder_freq_tab', { count: String(freq.count).padStart(2, '0') });
  // FILED 区段 sub-label：现在统计 wordDeck 录入的字母数（最大 26）
  const sub = root.querySelector('.wb-cabinet .wb-tab-sub');
  if (sub) sub.textContent = t('wb.filed_sub', { count: String(freq.count).padStart(2, '0') });
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
  shopBus.syncFiledFolders = syncFiledFolders;
  shopBus.attachWorkbenchTooltips = attachWorkbenchTooltips;
  shopBus.setupDragZones = setupDragZones;
  shopBus.openDrawer = openDrawer;
  shopBus.closeDrawer = closeDrawer;
  shopBus.triggerInboxWhoosh = triggerInboxWhoosh;
}
