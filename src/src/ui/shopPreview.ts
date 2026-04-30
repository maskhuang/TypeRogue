// ============================================
// Shop Redesign Preview (Phase 1.4)
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器 + 双屏切换 + 工作台视觉。
// 数据：state.shop.items (auto-seed if empty) → ItemDescriptor → 渲染。
// ============================================

import { state } from '../core/state';
import { INBOX_MAX } from '../core/constants';
import {
  renderShapePreview,
  getFreqHints,
  formatWordEffectLabel,
  // Story 60.9: 工作台 hover tooltip 复用 classic 路径
  buildSkillKeyTooltipData,
  showRelicTooltip,
  hideRelicTooltip,
  moveRelicTooltip,
} from '../systems/shop';
// Story 60.9: keyTooltip 单例（与 classic 商品卡共用）
import { keyTooltip } from './keyboard/KeyTooltip';
// Story 60.11: 转场动画守卫
import { shouldAnimateShop } from '../core/UserSettings';
// Story 60.13: 双职业工序面板（复用 classic 渲染器）
import { renderCraftPanel } from '../systems/classes/CraftingStation';
import { renderMetamorphPanel } from '../systems/classes/MetamorphStation';
import { getNextBattleNode } from '../systems/stage/stageFlow';
import { t } from '../demo/demo-i18n';
import { startLevel } from '../systems/battle';
import type { WordPack } from '../core/types';
import type { ItemDescriptor } from './itemDescriptors';
import { RELICS } from '../data/relics';
import { dragManager, registerShapePreviewRenderer, type DragPayload } from '../systems/dragManager';
import {
  highlightShapePlacementOnWorkbench,
  clearShapePlacementOnWorkbench,
  handleWorkbenchKeyRotation,
  applyBindFromInbox,
  applyUnbindKeyToInbox,
} from './shapePreview';
// Story 60.16: 共享 module state / 常量 / 类型 — 拆分自原 shopPreview.ts module-level
import {
  previewState,
  resetPreviewSession,
  shopBus,
  sfx,
  PREVIEW_HASH,
  VERBS,
  VERB_FULL,
  SUBMIT_STAMP_FALLBACK_MS,
} from './shop/shopState';
import type { SubmitStage, DrawerKind, InboxCardData } from './shop/shopState';
// Story 60.16 Task 2: terminal 模块（cmd / render / descriptors / banner / chrome）
import * as terminal from './shop/shopTerminal';
// Re-export for backward compat（tests + main.ts/shop.ts 外部依赖）
export {
  buildBannerLine,
  buildBannerText,
  getFormLabel,
  getClrLabel,
  getStageIcon,
  updateTerminalChrome,
  finalizePackPick,
  cancelPackPick,
} from './shop/shopTerminal';

// sfx / terminal.rebuildDescriptors / terminal.findDescriptorBySku / getSynergyCount / terminal.ensureSeed /
// generateShopPackItems 已迁至 ./shop/shopTerminal（Story 60.16 Task 2）

// banner / labels (terminal.buildBannerLine / terminal.buildBannerText / terminal.getFormLabel /
// terminal.getClrLabel / terminal.getStageIcon) 已迁至 ./shop/shopTerminal（Story 60.16 Task 2）

// levenshtein / terminal.expandVerb / terminal.suggestSku 已迁至 ./shop/shopTerminal（Story 60.16 Task 2）

// 全部 render helpers (COL / visualWidth / pad / priceColForLine /
// renderListRow / renderListHeaderRow / wrapAt / renderInfoBlock /
// terminal.appendLine / terminal.escapeHtml / terminal.appendBlank / classForRow) 已迁至 ./shop/shopTerminal
// （Story 60.16 Task 2）


/**
 * Story 60.11: 触发 IN-tray 槽 whoosh 滑入动画
 * @param slotIdx state.player.inbox 中刚 push 的下标（新卡所在 cutout）
 */
function triggerInboxWhoosh(slotIdx: number): void {
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


// === Story 60.4: SUBMIT FORM → startLevel transition ===
// SUBMIT_STAMP_FALLBACK_MS 已迁至 ./shop/shopState

/** SUBMIT 入口 — 检查警告 → 弹提示或直通 proceed */
export function triggerSubmit(): void {
  if (previewState.pendingSubmit !== null || previewState.submitting) return; // 防抖
  // M1 fix: 不允许在 BUY high-price confirm 未结时启动 SUBMIT 流程（防双 pending 共存）
  if (previewState.pendingConfirm) {
    showOnly('terminal');
    terminal.appendLine(t('shop.terminal.err.pending_confirm'), 'redacted');
    terminal.appendBlank();
    return;
  }
  const noBindings = state.player.bindings.size === 0;
  const inboxLeft = state.player.inbox.length;
  if (noBindings) {
    promptBindingsWarning(inboxLeft > 0 ? 'warn-inbox' : 'proceed');
    return;
  }
  if (inboxLeft > 0) {
    promptInboxWarning();
    return;
  }
  proceedSubmit();
}

/** L5 fix: 警告 prompt 期间 button visually disabled，提示玩家"等待 Y/N 中" */
function setSubmitButtonAwaiting(awaiting: boolean): void {
  const btn = document.getElementById('wb-submit-btn');
  if (!btn) return;
  if (awaiting) {
    btn.classList.add('submitting');
  } else {
    btn.classList.remove('submitting');
    btn.removeAttribute('disabled');
  }
}

function promptBindingsWarning(nextStage: 'warn-inbox' | 'proceed'): void {
  previewState.pendingSubmit = { stage: 'warn-bindings', nextStage };
  showOnly('terminal');
  setSubmitButtonAwaiting(true);
  terminal.appendLine(t('shop.terminal.submit.warn_no_bindings'), 'redacted');
  terminal.appendLine(t('shop.terminal.submit.warn_no_bindings_confirm'), 'dim');
}

function promptInboxWarning(): void {
  const n = state.player.inbox.length;
  previewState.pendingSubmit = { stage: 'warn-inbox', nextStage: 'proceed' };
  showOnly('terminal');
  setSubmitButtonAwaiting(true);
  terminal.appendLine(`WARNING · ${n} ITEM${n > 1 ? 'S' : ''} IN IN-TRAY · LEAVE PENDING ITEMS?`, 'redacted');
  terminal.appendLine(t('shop.terminal.submit.warn_inbox_left'), 'dim');
}

/**
 * 处理 SUBMIT 警告流程的 Y/N 输入。返回 true 表示已消费输入（在 confirm 模式下）。
 * 由 execute() 在 terminal.handleConfirmation 之前优先调用。
 */
export function handleSubmitConfirmation(input: string): boolean {
  if (!previewState.pendingSubmit) return false;
  const up = input.trim().toUpperCase();
  if (up === 'Y' || up === 'YES') {
    const nextStage = previewState.pendingSubmit.nextStage;
    previewState.pendingSubmit = null;
    if (nextStage === 'warn-inbox') {
      promptInboxWarning();
    } else {
      proceedSubmit();
    }
    return true;
  }
  if (up === 'N' || up === 'NO') {
    previewState.pendingSubmit = null;
    terminal.appendLine(t('shop.terminal.submit.aborted'), 'dim');
    terminal.appendBlank();
    setSubmitButtonAwaiting(false);
    return true;
  }
  terminal.appendLine(`ERR · EXPECTED [Y]ES OR [N]O · GOT "${input}" · TRY AGAIN`, 'redacted');
  return true; // still in confirm mode
}

/** 警告全过 → 启 stamp 动画 + transition */
function proceedSubmit(): void {
  if (previewState.submitting) return;
  previewState.submitting = true;
  sfx('submit_stamp'); // Story 60.12: 重击下行 — 红章盖章音
  terminal.appendLine(t('shop.terminal.submit.stamped'), 'echo');
  terminal.appendBlank();
  const btn = document.getElementById('wb-submit-btn');
  if (btn) {
    btn.setAttribute('disabled', 'true');
    btn.classList.add('submitting');
  }
  showOnly('workbench');
  const overlay = createSubmitStampOverlay();
  let transitioned = false;
  const transition = (): void => {
    if (transitioned) return;
    transitioned = true;
    executeSubmitTransition(overlay);
  };
  if (overlay) {
    overlay.addEventListener('animationend', transition, { once: true });
    // animationend fallback（tab 离开 / reduced-motion / 浏览器 throttle）
    setTimeout(transition, SUBMIT_STAMP_FALLBACK_MS);
  } else {
    // overlay 创建失败（DOM 不在）— 直接 transition
    setTimeout(transition, 0);
  }
}

function createSubmitStampOverlay(): HTMLElement | null {
  const footer = document.querySelector<HTMLElement>('#workbench-screen-preview .workbench-footer');
  if (!footer) return null;
  const overlay = document.createElement('div');
  overlay.className = 'submit-stamp-overlay';
  overlay.textContent = 'PROCEED · APPROVED ✓';
  footer.parentElement?.insertBefore(overlay, footer);
  return overlay;
}

function executeSubmitTransition(overlay: HTMLElement | null): void {
  // 清理 preview 状态
  // Story 60.9: 关 tooltip + 清 dragStart 回调
  keyTooltip.hide();
  hideRelicTooltip();
  dragManager.onDragStart = null;
  dragManager.destroy();
  clearShapePlacementOnWorkbench();
  previewState.pendingPackPick = null;
  previewState.pendingSubmit = null;
  previewState.pendingConfirm = null; // L2 fix: 防 stale BUY confirm 残留
  previewState.submitting = false;
  previewState.active = false;
  document.body.classList.remove('shop-preview-active');
  // 隐藏 preview 屏
  const tEl = document.getElementById('terminal-shop-screen');
  const wEl = document.getElementById('workbench-screen-preview');
  if (tEl) tEl.style.display = 'none';
  if (wEl) wEl.style.display = 'none';
  // 移除 stamp overlay
  if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
  // 解除 hash（与 restoreFromPreview 一致，保证下次 #shop-preview 能再触发）
  if (location.hash === PREVIEW_HASH) history.replaceState(null, '', location.pathname + location.search);
  // 启动下一关 — 沿用 classic shop:4456 模板
  state.level = getNextBattleNode(state.level);
  void startLevel();
}


// === Drawer overlay ===
// DrawerKind / drawerOpen 已迁至 ./shop/shopState

function openDrawer(kind: DrawerKind): void {
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
    renderCraftPanel(body as HTMLElement, () => terminal.updateTerminalChrome());
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

function closeDrawer(): void {
  const el = document.getElementById('wb-drawer');
  if (!el) return;
  // Story 60.2: pack-pick drawer 关闭时如果还在 pending → 触发 cancel 路径（不扣钱）
  if (previewState.drawerOpen === 'pack-pick' && previewState.pendingPackPick !== null) {
    terminal.cancelPackPick();
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
  // Group into 3 columns for compact view
  const rows = words.map((w, i) => {
    const eff = state.wordEffects.get(w);
    const effLabel = eff ? `[${eff.type.toUpperCase()}${eff.value ? ' ' + eff.value : ''}]` : '';
    return `<li class="wb-word-row"><span class="ww-idx">${String(i + 1).padStart(3, '0')}</span><span class="ww-name">${w.toUpperCase()}</span><span class="ww-meta">LEN ${w.length}</span><span class="ww-eff">${effLabel}</span></li>`;
  });
  return `<ul class="wb-word-list">${rows.join('')}</ul>`;
}

// Story 60.13: renderStubDrawerHtml 已移除 — craft / metamorph 抽屉走真 panel

// Story 60.2: pack-pick drawer 渲染
function renderPackPickDrawerHtml(pack: WordPack): string {
  const cards = pack.words.map((w, i) => {
    const freqHint = getFreqHints(w);
    const effLabel = pack.wordEffect ? formatWordEffectLabel(pack.wordEffect) : '';
    const upper = terminal.escapeHtml(w.toUpperCase());
    return `
      <button class="pack-pick-card" type="button" data-pick-idx="${i}">
        <span class="pp-clip" aria-hidden="true">📎</span>
        <div class="pp-word">${upper}</div>
        <div class="pp-meta">LEN ${w.length}${freqHint ? ' · ' + terminal.escapeHtml(freqHint) : ''}</div>
        ${effLabel ? `<div class="pp-effect">${terminal.escapeHtml(effLabel)}</div>` : ''}
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
      if (typeof word === 'string') terminal.finalizePackPick(word);
    };
  });
}

// Hook click handlers on drawer triggers + terminal hint-bar F-key buttons
function setupDrawerHandlers(): void {
  // Terminal hint-bar F-key buttons (Mac F1-F12 are usually intercepted by OS,
  // so the on-screen labels need to be clickable)
  const term = document.getElementById('terminal-shop-screen');
  if (term) {
    term.querySelectorAll<HTMLElement>('.hint-clickable[data-fkey]').forEach(el => {
      el.onclick = () => {
        const verb = el.dataset.fkey as keyof typeof VERB_FULL;
        if (verb) injectFKey(verb);
      };
    });
  }
  const wb = document.getElementById('workbench-screen-preview');
  if (!wb) return;
  wb.querySelectorAll<HTMLElement>('[data-drawer]').forEach(el => {
    el.onclick = () => openDrawer(el.dataset.drawer as DrawerKind);
  });
  const closeBtn = document.getElementById('wb-drawer-close');
  if (closeBtn) closeBtn.onclick = closeDrawer;
  const overlay = document.querySelector('#wb-drawer .wb-drawer-overlay') as HTMLElement | null;
  if (overlay) overlay.onclick = closeDrawer;
  // Show class-specific buttons
  const craftBtn = document.getElementById('wb-craft-btn');
  const metaBtn = document.getElementById('wb-meta-btn');
  if (craftBtn) craftBtn.style.display = state.classId === 'wordsmith' ? '' : 'none';
  if (metaBtn) metaBtn.style.display = state.classId === 'metamorph' ? '' : 'none';
  // Story 60.4: SUBMIT FORM → startLevel
  const submitBtn = document.getElementById('wb-submit-btn');
  if (submitBtn) submitBtn.onclick = triggerSubmit;
  // Update WORDS folder count
  const countEl = document.getElementById('words-folder-count');
  if (countEl) countEl.textContent = String(state.player.wordDeck.length).padStart(3, '0');
  const previewEl = document.getElementById('words-folder-preview');
  if (previewEl) {
    const top3 = state.player.wordDeck.slice(0, 3).map(w => w.toUpperCase()).join(' · ');
    previewEl.textContent = top3 || '—';
  }
}

// === Main parser ===

function execute(line: string): void {
  terminal.appendLine(`§> ${line}`, 'dim');
  // Story 60.4: SUBMIT 警告 prompt 优先级 > BUY high-price confirm
  if (handleSubmitConfirmation(line)) return;
  if (terminal.handleConfirmation(line)) return;
  const trimmed = line.trim();
  if (!trimmed) return;
  const parts = trimmed.split(/\s+/);
  const verbInput = parts[0].toUpperCase();
  const arg = parts[1];
  // implicit BUY: if first token matches a SKU and no verb, treat as BUY
  if (terminal.findDescriptorBySku(verbInput)) {
    terminal.cmdBuy(verbInput);
    return;
  }
  const verb = terminal.expandVerb(verbInput);
  if (!verb) {
    terminal.appendLine(`ERR · UNKNOWN VERB: ${verbInput}`, 'redacted');
    terminal.appendLine('  · TYPE  HEL  FOR COMMAND LIST', 'dim');
    terminal.appendBlank();
    return;
  }
  switch (verb) {
    case 'LIS': terminal.cmdList(); break;
    case 'BUY': terminal.cmdBuy(arg); break;
    case 'INF': terminal.cmdInfo(arg); break;
    case 'SEL': terminal.cmdSell(arg); break;
    case 'RES': terminal.cmdReshuffle(); break;
    case 'PRO': terminal.cmdProceed(); break;
    case 'HEL': terminal.cmdHelp(); break;
    case 'UND': terminal.cmdUndo(); break;
    case 'STA': terminal.cmdStats(); break;
    case 'WOR': terminal.cmdWords(); break;
  }
}

// === Input handling ===

function setPrompt(text: string): void {
  const el = document.getElementById('terminal-prompt-text');
  if (el) el.textContent = text;
  previewState.typedBuffer = text;
}

function tabComplete(): void {
  const up = previewState.typedBuffer.trim().toUpperCase();
  if (!up) return;
  // complete only the verb (first word)
  const parts = up.split(/\s+/);
  if (parts.length > 1) return; // don't complete SKU
  const matches = VERBS.filter(v => VERB_FULL[v].startsWith(parts[0]));
  if (matches.length === 1) setPrompt(VERB_FULL[matches[0]] + ' ');
  else if (matches.length > 1) {
    terminal.appendLine(`§> ${previewState.typedBuffer}`, 'dim');
    terminal.appendLine('  · ' + matches.map(m => VERB_FULL[m]).join(' · '), 'dim');
  }
}

function navHistory(dir: 1 | -1): void {
  if (previewState.cmdHistory.length === 0) {
    // Visible cue so the keystroke isn't silently ignored on first try
    flashPrompt();
    return;
  }
  if (previewState.historyIdx === -1) previewState.historyIdx = previewState.cmdHistory.length;
  previewState.historyIdx = Math.max(0, Math.min(previewState.cmdHistory.length, previewState.historyIdx + dir));
  setPrompt(previewState.cmdHistory[previewState.historyIdx] ?? '');
}

function flashPrompt(): void {
  const cursor = document.querySelector('#terminal-shop-screen .pp-cursor') as HTMLElement | null;
  if (!cursor) return;
  cursor.style.color = '#ff6b6b';
  setTimeout(() => { cursor.style.color = ''; }, 120);
}

function injectFKey(verb: keyof typeof VERB_FULL): void {
  setPrompt(VERB_FULL[verb] + ' ');
}

function onKey(e: KeyboardEvent): void {
  if (!previewState.active) return;
  // Preview owns the keyboard while previewState.active — block battle's typing handler
  // (which would otherwise treat terminal input as miss-keys and shake the screen).
  e.stopImmediatePropagation();
  // Story 60.2: pack-pick drawer 打开时拦截 ESC/Tab/Enter；其他键不消费
  // - ESC 关闭 = cancel
  // - Tab 走 focus trap（在卡片之间循环，不跳出抽屉）
  // - Enter 触发 focused 卡片 click（capture-phase stopImmediatePropagation
  //   会阻止事件到达 button 元素，浏览器原生 Enter→click 失效，必须手动触发）
  if (previewState.drawerOpen === 'pack-pick') {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer();
      return;
    }
    if (e.key === 'Tab') {
      // M2 fix: focus trap — Tab 在卡片之间循环
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>('#wb-drawer-body .pack-pick-card'),
      );
      if (cards.length === 0) return;
      const cur = document.activeElement as HTMLElement | null;
      const idx = cur ? cards.indexOf(cur) : -1;
      const dir = e.shiftKey ? -1 : 1;
      const next = idx === -1 ? 0 : (idx + dir + cards.length) % cards.length;
      e.preventDefault();
      cards[next]?.focus();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const cur = document.activeElement as HTMLElement | null;
      if (cur?.classList.contains('pack-pick-card')) {
        e.preventDefault();
        cur.click();
      }
      return;
    }
    return;
  }
  // Tab: complete verb if buffer non-empty (terminal only); else switch screens
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (previewState.currentScreen === 'terminal' && previewState.typedBuffer.trim().length > 0) {
      tabComplete();
    } else {
      if (previewState.currentScreen === 'terminal') switchToWorkbench();
      else showOnly('terminal');
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (previewState.drawerOpen) { closeDrawer(); return; }
    restoreFromPreview();
    return;
  }
  if (previewState.currentScreen !== 'terminal') return;

  // F-keys: inject command (do NOT execute)
  const fmap: Record<string, keyof typeof VERB_FULL> = {
    F1: 'LIS', F2: 'BUY', F3: 'INF', F4: 'SEL', F5: 'RES', F10: 'PRO',
  };
  if (fmap[e.key]) {
    e.preventDefault();
    injectFKey(fmap[e.key]);
    return;
  }

  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
    e.preventDefault(); navHistory(-1); return;
  }
  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key.toLowerCase() === 'n')) {
    e.preventDefault(); navHistory(+1); return;
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    previewState.typedBuffer = previewState.typedBuffer.slice(0, -1);
    setPrompt(previewState.typedBuffer);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    sfx('shop_kbd_enter'); // Story 60.12: 继电器 thunk
    const line = previewState.typedBuffer;
    if (line.trim()) {
      previewState.cmdHistory.push(line);
      previewState.historyIdx = -1;
    }
    setPrompt('');
    execute(line);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    sfx('shop_kbd_click'); // Story 60.12: 机械轴 thock
    previewState.typedBuffer += e.key.toUpperCase();
    setPrompt(previewState.typedBuffer);
  }
}

// Story 60.1: 拖拽 IN-tray / 跨键 → key 落子
// 状态变更全部走 applyBindFromInbox（在 shapePreview.ts），本函数只负责调用 + DOM 同步
function bindSkillToKey(skillId: string, key: string): void {
  applyBindFromInbox(skillId, key);
  // Story 60.9 follow-up #9: 标记此 skill 已被装配过 — 后续卸回 IN-tray
  // 时按"已开封"态渲染（去掉运单包装）
  previewState.unsealedSkillIds.add(skillId);
  syncWorkbenchInbox();
  syncWorkbenchKeys();
  sfx('shop_drag_drop'); // Story 60.12: 木质 click — 落到键
}

// Story 60.1: 从键拖回 IN-tray = 整体卸下多格技能
function unbindSkillFromKey(key: string): void {
  if (applyUnbindKeyToInbox(key) !== undefined) {
    syncWorkbenchInbox();
    syncWorkbenchKeys();
    sfx('shop_drag_unbind'); // Story 60.12: 闷响 — 卸回 IN-tray
  }
}

// Render skill icons on tier-1 keys based on bindings
function syncWorkbenchKeys(): void {
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

  // 1) tier-1 已绑键
  root.querySelectorAll<HTMLElement>('.kb-key.kb-tier-1.has-skill[data-key]').forEach(keyEl => {
    if (keyEl.dataset.tooltipBound === '1') return;
    keyEl.dataset.tooltipBound = '1';
    keyEl.addEventListener('mouseenter', (e: MouseEvent) => {
      if (dragManager.dragging) return;
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
function setupDragZones(): void {
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
function syncWorkbenchRelics(): void {
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

function syncWorkbenchInbox(): void {
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

// InboxCardData 已迁至 ./shop/shopState

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
        <div class="wc-stamp wc-stamp-opened">${terminal.escapeHtml(t('shop.workbench.stamp.opened'))}</div>
      </div>
    </div>
  `;
  }
  // Fresh 购入 — 完整运单包装
  const stamp = c.clearance === '4-A'
    ? `<div class="wc-stamp wc-stamp-gold">${terminal.escapeHtml(t('shop.workbench.stamp.clearance_a'))}</div>`
    : `<div class="wc-stamp">${terminal.escapeHtml(t('shop.workbench.stamp.regulation'))}</div>`;
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

function switchToWorkbench(): void {
  previewState.workbenchEntered = true;
  if (previewState.undoStack.length > 0) {
    terminal.appendLine(`  · ${previewState.undoStack.length} PURCHASES FINALIZED.`, 'dim');
    previewState.undoStack = [];
  }
  showOnly('workbench');
}

// === Screen lifecycle ===
// menuPrevDisplay 已迁至 ./shop/shopState

function showOnly(which: 'terminal' | 'workbench'): void {
  const t = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const w = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (t) t.style.display = which === 'terminal' ? 'flex' : 'none';
  if (w) w.style.display = which === 'workbench' ? 'flex' : 'none';
  // Story 60.11: 切屏 CRT flicker 转场（仅当用户开启动画且不在切回相同屏幕时）
  if (which !== previewState.currentScreen && shouldAnimateShop()) {
    const target = which === 'terminal' ? t : w;
    triggerCrtFlicker(target);
  }
  previewState.currentScreen = which;
}

/**
 * Story 60.11: 触发 CRT flicker 切屏动画
 * 加 class .screen-crt-transition，animationend 后自动清除（once 监听防泄漏）
 */
function triggerCrtFlicker(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove('screen-crt-transition');
  // 强制 reflow 让重新加 class 触发动画（一帧内重复加同 class 不会重启）
  void el.offsetWidth;
  el.classList.add('screen-crt-transition');
  el.addEventListener('animationend', () => {
    el.classList.remove('screen-crt-transition');
  }, { once: true });
}

function hideAllRealScreens(): void {
  const ids = ['main-menu-screen', 'battle-screen', 'shop-screen', 'ritual-screen', 'rest-screen', 'gameover-screen'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'main-menu-screen' && previewState.menuPrevDisplay === null) previewState.menuPrevDisplay = el.style.display || '';
    el.style.display = 'none';
  }
}

function restoreFromPreview(): void {
  previewState.active = false;
  document.body.classList.remove('shop-preview-active');
  clearShapePlacementOnWorkbench();
  // Story 60.9: 退出 terminal 商店时关掉残留 tooltip + 清掉 dragStart 回调防泄漏
  keyTooltip.hide();
  hideRelicTooltip();
  dragManager.onDragStart = null;
  dragManager.destroy();
  const t = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const w = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (t) t.style.display = 'none';
  if (w) w.style.display = 'none';
  const menu = document.getElementById('main-menu-screen');
  if (menu) menu.style.display = 'flex';
  if (location.hash === PREVIEW_HASH) history.replaceState(null, '', location.pathname + location.search);
}

function resetSession(): void {
  resetPreviewSession();
  state.player.inbox = [];
  terminal.ensureSeed();
  terminal.rebuildDescriptors();
}

// === Keyboard prop builder ===
// 4-tier visual:
//   tier-1: action keys (A-Z + standard punctuation) — full color, skill-bindable
//   tier-2: relic keys (1-0 number row) — full color with relic icon
//   tier-3: terminal command keys (Esc/Tab/Backspace/Enter/F1-F5/F10/Arrows) — paper, with caption
//   tier-4: decorative (Shift/Caps/Ctrl/Alt/Win/Space/Menu/F6-F9/F11/F12/`-=\) — muted

interface KeyDef {
  label: string;
  tier: 1 | 2 | 3 | 4;
  width?: number;     // u-units; 1 = standard
  data?: string;      // for binding lookup later
  caption?: string;   // tier-3 small caption like "LIS"
}

function k(label: string, tier: 1 | 2 | 3 | 4, opts?: { width?: number; data?: string; caption?: string }): KeyDef {
  return { label, tier, width: opts?.width, data: opts?.data, caption: opts?.caption };
}

function buildFullKeyboardHtml(): string {
  const fRow: KeyDef[] = [
    k('Esc', 3, { caption: 'EXIT' }),
    k('', 4, { width: 1.0 }),  // gap spacer (invisible)
    k('F1', 3, { caption: 'LIS' }),
    k('F2', 3, { caption: 'BUY' }),
    k('F3', 3, { caption: 'INF' }),
    k('F4', 3, { caption: 'SEL' }),
    k('F5', 3, { caption: 'RES' }),
    k('F6', 4), k('F7', 4), k('F8', 4), k('F9', 4),
    k('F10', 3, { caption: 'PRO' }),
    k('F11', 4), k('F12', 4),
  ];
  const numRow: KeyDef[] = [
    k('`', 4),
    k('1', 2, { data: '1' }), k('2', 2, { data: '2' }), k('3', 2, { data: '3' }),
    k('4', 2, { data: '4' }), k('5', 2, { data: '5' }), k('6', 2, { data: '6' }),
    k('7', 2, { data: '7' }), k('8', 2, { data: '8' }), k('9', 2, { data: '9' }),
    k('0', 2, { data: '0' }),
    k('-', 4), k('=', 4),
    k('⌫', 3, { width: 2, caption: 'BACK' }),
  ];
  const qRow: KeyDef[] = [
    k('Tab', 3, { width: 1.5, caption: 'SCRN' }),
    ...'QWERTYUIOP'.split('').map(c => k(c, 1, { data: c.toLowerCase() })),
    k('[', 1, { data: '[' }), k(']', 1, { data: ']' }), k('\\', 4, { width: 1.5 }),
  ];
  const aRow: KeyDef[] = [
    k('Caps', 4, { width: 1.75 }),
    ...'ASDFGHJKL'.split('').map(c => k(c, 1, { data: c.toLowerCase() })),
    k(';', 1, { data: ';' }), k("'", 4),
    k('↵', 3, { width: 2.25, caption: 'EXEC' }),
  ];
  const zRow: KeyDef[] = [
    k('⇧', 4, { width: 2.25 }),
    ...'ZXCVBNM'.split('').map(c => k(c, 1, { data: c.toLowerCase() })),
    k(',', 1, { data: ',' }), k('.', 1, { data: '.' }), k('/', 1, { data: '/' }),
    k('⇧', 4, { width: 2.75 }),
  ];
  const modRow: KeyDef[] = [
    k('Ctrl', 4, { width: 1.25 }), k('Win', 4, { width: 1.25 }), k('Alt', 4, { width: 1.25 }),
    k('', 4, { width: 6.25 }),  // spacebar (no label)
    k('Alt', 4, { width: 1.25 }), k('Win', 4, { width: 1.25 }), k('Menu', 4, { width: 1.25 }),
    k('Ctrl', 4, { width: 1.25 }),
  ];

  const renderKey = (def: KeyDef): string => {
    const widthStyle = def.width && def.width !== 1 ? ` style="--kw:${def.width}"` : '';
    const dataAttr = def.data ? ` data-key="${def.data}"` : '';
    const captionHtml = def.caption ? `<span class="kb-cap">${def.caption}</span>` : '';
    // tier-4 spacer (no label) keeps width but no border
    const isSpacer = def.tier === 4 && !def.label;
    if (isSpacer) {
      return `<div class="kb-key kb-tier-4 kb-spacer"${widthStyle}></div>`;
    }
    return `<div class="kb-key kb-tier-${def.tier}"${widthStyle}${dataAttr}>
      <span class="kb-letter">${def.label}</span>${captionHtml}
    </div>`;
  };

  const renderRow = (defs: KeyDef[]): string =>
    `<div class="kb-row">${defs.map(renderKey).join('')}</div>`;

  // Arrow cluster (separate; positioned bottom-right)
  const arrowCluster = `
    <div class="kb-arrows">
      <div class="kb-key kb-tier-3 kb-arrow-up" data-key="ArrowUp"><span class="kb-letter">↑</span><span class="kb-cap">PREV</span></div>
      <div class="kb-key kb-tier-3 kb-arrow-left" data-key="ArrowLeft"><span class="kb-letter">←</span></div>
      <div class="kb-key kb-tier-3 kb-arrow-down" data-key="ArrowDown"><span class="kb-letter">↓</span><span class="kb-cap">NEXT</span></div>
      <div class="kb-key kb-tier-3 kb-arrow-right" data-key="ArrowRight"><span class="kb-letter">→</span></div>
    </div>`;

  return `
    <div class="kb-deck">
      ${renderRow(fRow)}
      ${renderRow(numRow)}
      ${renderRow(qRow)}
      ${renderRow(aRow)}
      ${renderRow(zRow)}
      ${renderRow(modRow)}
      ${arrowCluster}
    </div>
  `;
}

// === HTML builders ===

function buildTerminalScreen(): string {
  return `
    <div id="terminal-shop-screen" class="screen preview-screen" style="display:none">
      <div class="terminal-bezel">
        <div class="terminal-bezel-top">
          <span class="bezel-led"></span>
          <span class="bezel-brand">DPCA-VT220</span>
          <span class="bezel-spec">REQUISITION TERMINAL · TUBE-A4 · CLERK-7842</span>
          <span class="bezel-vent" aria-hidden="true">▦▦▦▦▦▦</span>
        </div>
        <div class="terminal-bezel-screen">
          <div class="crt-vignette"></div>
          <div class="crt-scanlines"></div>
          <div class="terminal-content">
            <pre class="terminal-banner" id="terminal-banner-pre"></pre>

            <div class="terminal-status">
              <span class="ts-cell" data-field="bal">BAL <em class="bal"><span class="bna">🍌</span> 0</em></span>
              <span class="ts-cell" data-field="form">FORM <em>F-1</em></span>
              <span class="ts-cell" data-field="clr">CLR <em class="clr">4-B</em></span>
              <span class="ts-cell" data-field="conn">CONN <em class="conn">56k6 OK</em></span>
              <span class="ts-cell" data-field="stage">STAGE <em>📋</em></span>
            </div>

            <div class="terminal-viewport" id="terminal-viewport"></div>

            <div class="terminal-prompt">
              <span class="pp-prefix">CLERK-7842 §&gt;</span>
              <span class="pp-text" id="terminal-prompt-text"></span><span class="pp-cursor">█</span>
            </div>

            <div class="terminal-hint">
              <span class="hint-clickable" data-fkey="LIS"><kbd>F1</kbd>LIST</span>
              <span class="hint-clickable" data-fkey="BUY"><kbd>F2</kbd>BUY</span>
              <span class="hint-clickable" data-fkey="INF"><kbd>F3</kbd>INFO</span>
              <span class="hint-clickable" data-fkey="SEL"><kbd>F4</kbd>SELL</span>
              <span class="hint-clickable" data-fkey="RES"><kbd>F5</kbd>RESHUFFLE</span>
              <span class="hint-clickable" data-fkey="PRO"><kbd>F10</kbd>PROCEED →</span>
              <span class="hint-spacer"></span>
              <span class="hint-strong"><kbd>TAB</kbd>工作台 ⇄</span>
              <span><kbd>ESC</kbd>EXIT</span>
            </div>
          </div>
        </div>
        <div class="terminal-bezel-bottom">
          <span class="bezel-sticker">PROPERTY OF DPCA · UNAUTHORIZED USE PROHIBITED</span>
          <span class="bezel-serial">SN-A4-1138</span>
        </div>
      </div>
    </div>
  `;
}

function buildWorkbenchScreen(): string {
  return `
    <div id="workbench-screen-preview" class="screen preview-screen" style="display:none">
      <div class="workbench-desk">
        <div class="workbench-grain"></div>
        <div class="workbench-spotlight"></div>

        <div class="workbench-header">
          <div class="wb-form-meta">
            <span>FORM-3942-B</span>
            <span class="sep">·</span>
            <span>WORKSTATION 7</span>
            <span class="sep">·</span>
            <span>OP. CLERK-7842</span>
            <span class="sep">·</span>
            <span>${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}</span>
          </div>
          <div class="wb-stamp wb-stamp-red">PENDING REVIEW</div>
        </div>

        <div class="workbench-grid">
          <div class="wb-panel wb-intray">
            <div class="wb-section-title">
              <span class="wb-tab-label">IN-TRAY</span>
              <span class="wb-tab-sub">待装配 · 00</span>
            </div>
            <div class="wb-foam-case">
              ${Array.from({ length: 5 }).map(() => '<div class="foam-cutout empty"><span class="cutout-empty-label">— 空槽 —</span></div>').join('')}
            </div>
          </div>

          <div class="wb-panel wb-keyboard">
            <div class="wb-section-title">
              <span class="wb-tab-label">KEYBOARD</span>
              <span class="wb-tab-sub">物理键位 · DPCA-KB-7842</span>
            </div>
            <div class="wb-keyboard-base">
              ${buildFullKeyboardHtml()}
            </div>
            <div class="wb-keyboard-caption">
              <span>DPCA-KB-7842 · PROPERTY OF DEPT 2-B</span>
              <span class="kb-screws">⊗ &nbsp; ⊗ &nbsp; ⊗ &nbsp; ⊗</span>
            </div>
          </div>

          <div class="wb-panel wb-cabinet">
            <div class="wb-section-title">
              <span class="wb-tab-label">FILED</span>
              <span class="wb-tab-sub">在编档案 · 05</span>
            </div>
            <div class="wb-folders">
              <div class="folder">
                <div class="folder-tab">SKILL · 003</div>
                <div class="folder-body">
                  <div class="folder-row"><span class="fr-icon">💧</span><span class="fr-name">DRIP CASCADE</span><span class="fr-lv">Lv.2</span></div>
                  <div class="folder-row"><span class="fr-icon">📎</span><span class="fr-name">PAPERCLIP CHAIN</span><span class="fr-lv">Lv.1</span></div>
                  <div class="folder-row"><span class="fr-icon">✉️</span><span class="fr-name">CARBON COPY</span><span class="fr-lv">Lv.1</span></div>
                </div>
              </div>
              <div class="folder">
                <div class="folder-tab">RELIC · 002</div>
                <div class="folder-body">
                  <div class="folder-row"><span class="fr-icon">🏺</span><span class="fr-name">FOSSILIZED MEMO</span></div>
                  <div class="folder-row"><span class="fr-icon">☕</span><span class="fr-name">COLD COFFEE RING</span></div>
                </div>
              </div>
              <div class="folder folder-clickable" data-drawer="words">
                <div class="folder-tab">WORDS · <span class="folder-count" id="words-folder-count">0</span></div>
                <div class="folder-body">
                  <div class="folder-row folder-cta">
                    <span class="fr-icon">📚</span>
                    <span class="fr-name">OPEN LIBRARY DRAWER</span>
                    <span class="fr-lv">→</span>
                  </div>
                  <div class="folder-row" id="words-folder-preview">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Drawer overlay (hidden by default) -->
        <div id="wb-drawer" class="wb-drawer" style="display:none">
          <div class="wb-drawer-overlay"></div>
          <div class="wb-drawer-panel">
            <div class="wb-drawer-header">
              <span class="wb-drawer-title" id="wb-drawer-title">DRAWER</span>
              <button class="wb-drawer-close" id="wb-drawer-close">✕ CLOSE [ESC]</button>
            </div>
            <div class="wb-drawer-body" id="wb-drawer-body"></div>
          </div>
        </div>

        <div class="workbench-footer">
          <div class="wb-note">
            <span class="note-pin" aria-hidden="true">📌</span>
            <span class="note-text">"它在叫我名字。如果你听见——立即更换键盘。" — 前任使用者 #4471（已失踪）</span>
          </div>
          <div class="wb-actions">
            <button class="wb-station-btn" id="wb-craft-btn" data-drawer="craft" style="display:none">🔤 CRAFT</button>
            <button class="wb-station-btn" id="wb-meta-btn" data-drawer="metamorph" style="display:none">🧬 METAMORPH</button>
            <button class="wb-submit-btn" id="wb-submit-btn" type="button">提交配置 · SUBMIT FORM ➜</button>
          </div>
          <div class="wb-hint">
            <span class="hint-strong"><kbd>TAB</kbd>终端 ⇄</span>
            <span><kbd>ESC</kbd>EXIT</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function injectScreens(): void {
  const container = document.getElementById('game-container');
  if (!container) return;
  if (document.getElementById('terminal-shop-screen')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildTerminalScreen() + buildWorkbenchScreen();
  while (wrap.firstChild) container.appendChild(wrap.firstChild);
}

function renderWelcome(): void {
  terminal.appendLine('CONNECTED · DPCA-VT220 · §117 PNEUMATIC REQUISITION TUBE', 'head');
  terminal.appendLine('  · TYPE  HEL  FOR COMMAND LIST', 'dim');
  terminal.appendBlank();
  terminal.cmdList();
  terminal.cmdHelp();
}

/**
 * Story 60.5: 进入终端商店（取代 Phase 1 的 enterPreview hash 入口）。
 * `won` 参数预留接口与 classic openShop 同源，当前函数体不消费。
 * `#shop-preview` hash 仍走本函数（dev 调试入口）；正式入口由 systems/shop.ts:openShop
 * 按 UserSettings.shopUI 调度。
 */
/**
 * Story 60.16 Task 2: 注册 cross-module callbacks 到 shopBus。
 * 在 enterTerminalShop 第一次进入前 idempotent 调用一次即可，但放 enter 内
 * 防止 module-init 顺序导致 noop 残留。
 */
function wireShopBus(): void {
  // bootstrap-provided（lifecycle / 切屏 / 转场）
  shopBus.showOnly = showOnly;
  shopBus.switchToWorkbench = switchToWorkbench;
  // workbench-provided（DOM sync / drawer / drag / inbox 动画）
  shopBus.syncWorkbenchInbox = syncWorkbenchInbox;
  shopBus.syncWorkbenchRelics = syncWorkbenchRelics;
  shopBus.syncWorkbenchKeys = syncWorkbenchKeys;
  shopBus.attachWorkbenchTooltips = attachWorkbenchTooltips;
  shopBus.setupDragZones = setupDragZones;
  shopBus.openDrawer = openDrawer;
  shopBus.closeDrawer = closeDrawer;
  shopBus.triggerInboxWhoosh = triggerInboxWhoosh;
  // bootstrap-provided（terminal chrome 更新走 terminal 自己的实现）
  shopBus.updateTerminalChrome = terminal.updateTerminalChrome;
  // terminal-provided（drawer / pack-pick 反向调 terminal 输出）
  terminal.registerTerminalBindings();
}

export function enterTerminalShop(_won?: boolean): void {
  if (previewState.active) return;
  wireShopBus();
  injectScreens();
  hideAllRealScreens();
  resetSession();
  previewState.active = true;
  showOnly('terminal');
  // Clear viewport then render welcome
  const vp = document.getElementById('terminal-viewport');
  if (vp) vp.innerHTML = '';
  renderWelcome();
  setPrompt('');
  syncWorkbenchInbox();
  syncWorkbenchRelics();
  syncWorkbenchKeys();
  // Story 60.3: 首次进入时把 banner / 状态条接 state 实数（替代 Phase 1 静态 placeholder）
  terminal.updateTerminalChrome();
  // body class 标记：让 paper-craft 缩略图样式能 scope 到拖拽幽灵（dragGhost
  // 创建在 <body> 上，不在 #workbench-screen-preview 内，所以靠 body class 区分）
  document.body.classList.add('shop-preview-active');
  dragManager.init();
  // Story 60.1 follow-up: 注册形状预览渲染器，让 dragManager pickup 模式右键旋转
  // 时能更新幽灵的 shape thumbnail（与 classic shop 共用同一渲染器）
  registerShapePreviewRenderer(renderShapePreview);
  // 全局 dragend 兜底清理形状高亮（一次性设置，避免每次 setupDragZones 重复赋值）
  dragManager.onDragEnd = () => clearShapePlacementOnWorkbench();
  // Story 60.9: 拖拽起势时全局隐藏所有 tooltip（不挡视线）
  // Story 60.12: 同时播放 pickup 音效（抓握刺啦）
  dragManager.onDragStart = () => {
    keyTooltip.hide();
    hideRelicTooltip();
    sfx('shop_drag_pickup');
  };
  setupDragZones();
  setupDrawerHandlers();
  setTimeout(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, 0);
}

function checkHash(): void {
  if (location.hash === PREVIEW_HASH) enterTerminalShop();
}

export function initShopPreview(): void {
  window.addEventListener('hashchange', checkHash);
  window.addEventListener('keydown', onKey, true);
  if (document.readyState === 'complete') checkHash();
  else window.addEventListener('load', checkHash, { once: true });
}

// === Story 60.2 / 60.4: 测试专用内部 API（不要在生产代码里使用）===
export const __test = {
  executeBuyPack: (d: ItemDescriptor) => terminal.executeBuyPack(d),
  getPendingPackPick: () => previewState.pendingPackPick,
  setPendingPackPick: (v: { d: ItemDescriptor; pack: WordPack } | null): void => {
    previewState.pendingPackPick = v;
  },
  getUndoStack: () => previewState.undoStack,
  resetUndoStack: (): void => { previewState.undoStack = []; },
  // Story 60.4
  getPendingSubmit: () => previewState.pendingSubmit,
  setPendingSubmit: (v: { stage: SubmitStage; nextStage: SubmitStage | 'proceed' } | null): void => {
    previewState.pendingSubmit = v;
  },
  isSubmitting: (): boolean => previewState.submitting,
  resetSubmitting: (): void => { previewState.submitting = false; },
  // Story 60.4 review M1: previewState.pendingConfirm 互斥测试
  setPendingConfirm: (v: { sku: string; price: number } | null): void => {
    previewState.pendingConfirm = v;
  },
  getPendingConfirm: () => previewState.pendingConfirm,
  // Story 60.7: BUY/SELL/UND 副作用测试入口
  executeBuySkill: (d: ItemDescriptor) => terminal.executeBuySkill(d),
  executeBuyRelic: (d: ItemDescriptor) => terminal.executeBuyRelic(d),
  cmdSell: (arg: string): void => terminal.cmdSell(arg),
  cmdUndo: (): void => terminal.cmdUndo(),
  // Story 60.10: INF 命令测试入口
  cmdInfo: (arg: string): void => terminal.cmdInfo(arg),
  /** Story 60.10 review M2: 注入 previewState.descriptorCache 方便测 catalog 命中路径 */
  setDescriptorCache: (items: ItemDescriptor[]): void => { previewState.descriptorCache = items; },
  // Story 60.11: 动画测试入口
  cmdList: (): void => terminal.cmdList(),
  cmdReshuffle: (): void => terminal.cmdReshuffle(),
  triggerInboxWhoosh: (slotIdx: number): void => triggerInboxWhoosh(slotIdx),
  showOnly: (which: 'terminal' | 'workbench'): void => showOnly(which),
  setNextListAnimated: (v: boolean): void => { previewState.nextListIsAnimated = v; },
  // Story 60.12: 音效测试入口
  bindSkillToKey: (skillId: string, key: string): void => bindSkillToKey(skillId, key),
  unbindSkillFromKey: (key: string): void => unbindSkillFromKey(key),
  cmdBuy: (arg: string): void => terminal.cmdBuy(arg),
  openDrawer: (kind: 'words' | 'craft' | 'metamorph' | 'pack-pick'): void => openDrawer(kind),
  proceedSubmit: (): void => proceedSubmit(),
};
