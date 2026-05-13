// ============================================
// Shop Preview · Bootstrap Module (Story 60.16 Task 4)
// ============================================
// Lifecycle / 生命周期 + 全局事件 + 屏幕布局 / DOM 注入 + 命令派发 + submit 流程。
// 调用 terminal / workbench；通过 wireShopBus 注册跨模块回调。
// ============================================

import { state } from '../../core/state';
import { renderShapePreview, hideRelicTooltip } from '../../systems/shop';
import { keyTooltip } from '../keyboard/KeyTooltip';
import { shouldAnimateShop } from '../../core/UserSettings';
import { getNextBattleNode } from '../../systems/stage/stageFlow';
import { t, applyHtmlI18n } from '../../demo/demo-i18n';
import { startLevel } from '../../systems/battle';
import { dragManager, registerShapePreviewRenderer } from '../../systems/dragManager';
import { clearShapePlacementOnWorkbench } from '../shapePreview';
import {
  previewState,
  resetPreviewSession,
  shopBus,
  deskSfx,
  PREVIEW_HASH,
  VERBS,
  VERB_FULL,
  SUBMIT_STAMP_FALLBACK_MS,
} from './shopState';
import type { DrawerKind, SubmitStage } from './shopState';
import type { WordPack } from '../../core/types';
import type { ItemDescriptor } from '../itemDescriptors';
import * as terminal from './shopTerminal';
import * as workbench from './shopWorkbench';

// === Story 60.4: SUBMIT FORM → startLevel transition ===

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
  setSubmitButtonAwaiting(true);
  // 同步往 terminal 追写（保留键盘 Y/N 输入路径）
  terminal.appendLine(t('shop.terminal.submit.warn_no_bindings'), 'redacted');
  terminal.appendLine(t('shop.terminal.submit.warn_no_bindings_confirm'), 'dim');
  // workbench inline 对话框（不切走 terminal）
  showWorkbenchConfirm(
    t('shop.terminal.submit.warn_no_bindings'),
    t('shop.terminal.submit.warn_no_bindings_confirm'),
  );
}

function promptInboxWarning(): void {
  const n = state.player.inbox.length;
  previewState.pendingSubmit = { stage: 'warn-inbox', nextStage: 'proceed' };
  setSubmitButtonAwaiting(true);
  terminal.appendLine(t('shop.terminal.submit.warn_intray_pending', { n, s: n > 1 ? 'S' : '' }), 'redacted');
  terminal.appendLine(t('shop.terminal.submit.warn_inbox_left'), 'dim');
  showWorkbenchConfirm(
    t('shop.terminal.submit.warn_intray_pending', { n, s: n > 1 ? 'S' : '' }),
    t('shop.terminal.submit.warn_inbox_left'),
  );
}

/** workbench 内嵌确认对话框 · 不切走 terminal */
function showWorkbenchConfirm(title: string, hint: string): void {
  const dialog = document.getElementById('wb-confirm-dialog');
  const msg = document.getElementById('wb-confirm-msg');
  if (!dialog || !msg) return;
  msg.innerHTML = `<div class="wb-confirm-title">${title}</div><div class="wb-confirm-hint">${hint}</div>`;
  dialog.style.display = '';
  // 焦点放 Yes，便于 Enter 直接确认
  setTimeout(() => document.getElementById('wb-confirm-yes')?.focus(), 0);
  document.addEventListener('keydown', confirmKeyHandler, true);
}

function hideWorkbenchConfirm(): void {
  const dialog = document.getElementById('wb-confirm-dialog');
  if (dialog) dialog.style.display = 'none';
  document.removeEventListener('keydown', confirmKeyHandler, true);
}

/** 对话框打开时的键盘 Y/N/Esc 捷径（capture 阶段拦截，防止冒泡到游戏） */
function confirmKeyHandler(e: KeyboardEvent): void {
  if (!previewState.pendingSubmit) return;
  const k = e.key.toLowerCase();
  if (k === 'y') { e.preventDefault(); e.stopPropagation(); handleSubmitConfirmation('Y'); return; }
  if (k === 'n' || k === 'escape') { e.preventDefault(); e.stopPropagation(); handleSubmitConfirmation('N'); return; }
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
    hideWorkbenchConfirm();
    if (nextStage === 'warn-inbox') {
      promptInboxWarning();
    } else {
      proceedSubmit();
    }
    return true;
  }
  if (up === 'N' || up === 'NO') {
    previewState.pendingSubmit = null;
    hideWorkbenchConfirm();
    terminal.appendLine(t('shop.terminal.submit.aborted'), 'dim');
    terminal.appendBlank();
    setSubmitButtonAwaiting(false);
    return true;
  }
  terminal.appendLine(t('shop.terminal.err.confirm_yn', { input }), 'redacted');
  return true; // still in confirm mode
}

/** 警告全过 → 启 stamp 动画 + transition */
export function proceedSubmit(): void {
  if (previewState.submitting) return;
  previewState.submitting = true;
  // terminal stamp sound removed (was sfx('submit_stamp'))
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
    // 自我消费：第一次触发（animationend 或 fallback 任一）就 cancel pending timer，
    // 让 restoreFromPreview / resetPreviewSession 看到 null 时不重复 cancel
    if (previewState.submitFallbackTimerId !== null) {
      clearTimeout(previewState.submitFallbackTimerId);
      previewState.submitFallbackTimerId = null;
    }
    executeSubmitTransition(overlay);
  };
  if (overlay) {
    overlay.addEventListener('animationend', transition, { once: true });
    // animationend fallback（tab 离开 / reduced-motion / 浏览器 throttle）
    previewState.submitFallbackTimerId = setTimeout(transition, SUBMIT_STAMP_FALLBACK_MS);
  } else {
    // overlay 创建失败（DOM 不在）— 直接 transition
    previewState.submitFallbackTimerId = setTimeout(transition, 0);
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
  // 清按钮 DOM 残留 — proceedSubmit 设了 disabled+submitting class，DOM 跨 session
  // 持久（injectScreens 早返回），不清的话下次进店 click 被 disabled 守卫吞掉
  setSubmitButtonAwaiting(false);
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

// === Drawer trigger handlers (workbench 内部 drawer 由 workbench 自己管，bootstrap 只 wire 按钮) ===

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
    el.onclick = () => workbench.openDrawer(el.dataset.drawer as DrawerKind);
  });
  const closeBtn = document.getElementById('wb-drawer-close');
  if (closeBtn) closeBtn.onclick = workbench.closeDrawer;
  const overlay = document.querySelector('#wb-drawer .wb-drawer-overlay') as HTMLElement | null;
  if (overlay) overlay.onclick = workbench.closeDrawer;
  // Show class-specific buttons
  const craftBtn = document.getElementById('wb-craft-btn');
  const metaBtn = document.getElementById('wb-meta-btn');
  if (craftBtn) craftBtn.style.display = state.classId === 'wordsmith' ? '' : 'none';
  if (metaBtn) metaBtn.style.display = state.classId === 'metamorph' ? '' : 'none';
  // Story 60.4: SUBMIT FORM → startLevel
  const submitBtn = document.getElementById('wb-submit-btn');
  if (submitBtn) submitBtn.onclick = triggerSubmit;
  // Submit 警告对话框 · workbench inline Y/N
  const yesBtn = document.getElementById('wb-confirm-yes');
  const noBtn = document.getElementById('wb-confirm-no');
  if (yesBtn) yesBtn.onclick = () => handleSubmitConfirmation('Y');
  if (noBtn) noBtn.onclick = () => handleSubmitConfirmation('N');
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
  terminal.appendLine(t('shop.terminal.execute.prompt', { line }), 'dim');
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
  // /OWNED · /STATS 等以 / 开头的 token 视为 INF 子命令的顶层短形
  if (verbInput.startsWith('/')) {
    terminal.cmdInfo(verbInput);
    return;
  }
  const verb = terminal.expandVerb(verbInput);
  if (!verb) {
    terminal.appendLine(t('shop.terminal.err.unknown_verb', { verb: verbInput }), 'redacted');
    terminal.appendLine(t('shop.terminal.execute.try_help'), 'dim');
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
    case 'HEL': terminal.cmdHelp(arg); break;
    case 'UND': terminal.cmdUndo(); break;
    // STA 已下沉为 INF /STATS；WOR 已删除（dispatcher 仅留主动词）
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
    terminal.appendLine(t('shop.terminal.execute.prompt', { line: previewState.typedBuffer }), 'dim');
    terminal.appendLine(t('shop.terminal.execute.completion_row', { list: matches.map(m => VERB_FULL[m]).join(' · ') }), 'dim');
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
  if (previewState.drawerOpen === 'pack-pick') {
    if (e.key === 'Escape') {
      e.preventDefault();
      workbench.closeDrawer();
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
    if (previewState.drawerOpen) { workbench.closeDrawer(); return; }
    // Browse mode 活动时 ESC 优先退 browse；再次 ESC 才退出 shop
    if (previewState.browsePanelEl && previewState.currentScreen === 'terminal') {
      terminal.freezeBrowsePanel();
      return;
    }
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

  // ↑↓ 优先在活动 LIS 列表中导航选中商品（buffer 空 + 当前有 list 行）；
  // 否则退回命令历史。Ctrl+P / Ctrl+N 永远走历史，给重度键盘用户一条保底路径。
  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
    e.preventDefault();
    const wantSelection = !e.ctrlKey
      && previewState.typedBuffer.length === 0
      && previewState.lastListRowsBySku.size > 0;
    if (wantSelection) terminal.navSelection(-1);
    else navHistory(-1);
    return;
  }
  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key.toLowerCase() === 'n')) {
    e.preventDefault();
    const wantSelection = !e.ctrlKey
      && previewState.typedBuffer.length === 0
      && previewState.lastListRowsBySku.size > 0;
    if (wantSelection) terminal.navSelection(+1);
    else navHistory(+1);
    return;
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    previewState.typedBuffer = previewState.typedBuffer.slice(0, -1);
    setPrompt(previewState.typedBuffer);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const line = previewState.typedBuffer;
    // 空 buffer + browse 活动 + 有选中 SKU → ENTER 直接 BUY 选中（rogue-lite 通用快捷键习惯）
    if (!line.trim() && previewState.browsePanelEl && previewState.selectedSku) {
      terminal.cmdBuy();
      return;
    }
    if (line.trim()) {
      previewState.cmdHistory.push(line);
      previewState.historyIdx = -1;
    }
    setPrompt('');
    execute(line);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // terminal keyboard sound removed (was sfx('shop_kbd_click'))
    previewState.typedBuffer += e.key.toUpperCase();
    setPrompt(previewState.typedBuffer);
  }
}

export function switchToWorkbench(): void {
  previewState.workbenchEntered = true;
  if (previewState.undoStack.length > 0) {
    terminal.appendLine(t('shop.terminal.switch_workbench.purchases_finalized', { n: previewState.undoStack.length }), 'dim');
    previewState.undoStack = [];
  }
  showOnly('workbench');
}

// === Screen lifecycle ===

export function showOnly(which: 'terminal' | 'workbench'): void {
  const tEl = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const wEl = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (tEl) tEl.style.display = which === 'terminal' ? 'flex' : 'none';
  if (wEl) wEl.style.display = which === 'workbench' ? 'flex' : 'none';
  // 工作台是物理工位（非 CRT 屏幕） → 抬出 CRT 扫描线层（CSS: #shop-screen.shop-mode-workbench）
  const shopScreen = document.getElementById('shop-screen');
  if (shopScreen) shopScreen.classList.toggle('shop-mode-workbench', which === 'workbench');
  // CFG 图标可见性跟随
  import('../SettingsPanel').then(m => m.updateSettingsToggleIcon());
  // Story 60.11: 切屏 CRT flicker 转场（仅当用户开启动画且不在切回相同屏幕时）
  if (which !== previewState.currentScreen && shouldAnimateShop()) {
    const target = which === 'terminal' ? tEl : wEl;
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
  // SUBMIT 流程残留清理：用户在 warn-bindings/warn-inbox prompt 未答 Y/N 就 ESC 退出，
  // 或 stamp 动画途中退出；不清的话下次进店 triggerSubmit 被自身守卫 short-circuit，
  // pending fallback timer 也会在新 session 期间 stale fire 把关卡推前
  previewState.pendingSubmit = null;
  previewState.submitting = false;
  if (previewState.submitFallbackTimerId !== null) {
    clearTimeout(previewState.submitFallbackTimerId);
    previewState.submitFallbackTimerId = null;
  }
  // 同 executeSubmitTransition：clear DOM 残留以防按钮 stuck disabled
  setSubmitButtonAwaiting(false);
  document.querySelector('.submit-stamp-overlay')?.remove();
  document.body.classList.remove('shop-preview-active');
  clearShapePlacementOnWorkbench();
  // Story 60.9: 退出 terminal 商店时关掉残留 tooltip + 清掉 dragStart 回调防泄漏
  keyTooltip.hide();
  hideRelicTooltip();
  dragManager.onDragStart = null;
  dragManager.destroy();
  const tEl = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const wEl = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (tEl) tEl.style.display = 'none';
  if (wEl) wEl.style.display = 'none';
  const menu = document.getElementById('main-menu-screen');
  if (menu) menu.style.display = 'flex';
  if (location.hash === PREVIEW_HASH) history.replaceState(null, '', location.pathname + location.search);
  import('../SettingsPanel').then(m => m.updateSettingsToggleIcon());
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
          <span class="bezel-spec">REQUISITION TERMINAL · TTY-A4 · CLERK-7842</span>
          <span class="bezel-vent" aria-hidden="true">▦▦▦▦▦▦</span>
        </div>
        <div class="terminal-bezel-screen">
          <div class="crt-vignette"></div>
          <div class="crt-scanlines"></div>
          <div class="terminal-content">
            <pre class="terminal-banner" id="terminal-banner-pre"></pre>

            <div class="terminal-status">
              <span class="ts-cell" data-field="bal">BAL <em class="bal"><span class="bna">💰</span> 0</em></span>
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
              <span class="hint-clickable" data-fkey="SEL"><kbd>F4</kbd>SELL</span>
              <span class="hint-clickable" data-fkey="RES"><kbd>F5</kbd>RESHUFFLE</span>
              <span class="hint-clickable" data-fkey="PRO"><kbd>F10</kbd>PROCEED →</span>
              <span class="hint-spacer"></span>
              <span class="hint-strong"><kbd>TAB</kbd><span data-i18n="wb.terminal_hint_tab">工作台 ⇄</span></span>
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
          <div class="wb-stamp wb-stamp-red" data-i18n="wb.stamp_pending">PENDING REVIEW</div>
        </div>

        <div class="workbench-grid">
          <div class="wb-panel wb-intray">
            <div class="wb-section-title">
              <span class="wb-tab-label" data-i18n="wb.intray_label">IN-TRAY</span>
              <span class="wb-tab-sub">${t('wb.intray_sub', { count: '00' })}</span>
            </div>
            <div class="wb-foam-case">
              ${Array.from({ length: 5 }).map(() => `<div class="foam-cutout empty"><span class="cutout-empty-label" data-i18n="wb.intray_empty_slot">${t('wb.intray_empty_slot')}</span></div>`).join('')}
            </div>
          </div>

          <div class="wb-panel wb-keyboard">
            <div class="wb-section-title">
              <span class="wb-tab-label" data-i18n="wb.keyboard_label">KEYBOARD</span>
              <span class="wb-tab-sub" data-i18n="wb.keyboard_sub">物理键位 · DPCA-KB-7842</span>
            </div>
            <div class="wb-keyboard-base">
              ${buildFullKeyboardHtml()}
            </div>
            <div class="wb-keyboard-caption">
              <span data-i18n="wb.keyboard_caption">DPCA-KB-7842 · PROPERTY OF DEPT 2-B</span>
              <span class="kb-screws">⊗ &nbsp; ⊗ &nbsp; ⊗ &nbsp; ⊗</span>
            </div>
          </div>

          <div class="wb-panel wb-cabinet">
            <div class="wb-section-title">
              <span class="wb-tab-label" data-i18n="wb.filed_label">FILED</span>
              <span class="wb-tab-sub">${t('wb.filed_sub', { count: '00' })}</span>
            </div>
            <div class="wb-folders">
              <div class="folder" id="filed-freq-folder">
                <div class="folder-tab">${t('wb.folder_freq_tab', { count: '00' })}</div>
                <div class="folder-body"></div>
              </div>
              <div class="folder folder-clickable" data-drawer="words">
                <div class="folder-tab"><span data-i18n="wb.folder_words_tab">WORDS · </span><span class="folder-count" id="words-folder-count">0</span></div>
                <div class="folder-body">
                  <div class="folder-row folder-cta">
                    <span class="fr-icon">📚</span>
                    <span class="fr-name" data-i18n="wb.folder_open_words">OPEN LIBRARY DRAWER</span>
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
              <button class="wb-drawer-close" id="wb-drawer-close" data-i18n="wb.drawer_close">✕ CLOSE [ESC]</button>
            </div>
            <div class="wb-drawer-body" id="wb-drawer-body"></div>
          </div>
        </div>

        <div class="workbench-footer">
          <div class="wb-note">
            <span class="note-pin" aria-hidden="true">📌</span>
            <span class="note-text"></span>
          </div>
          <div class="wb-actions">
            <button class="wb-station-btn" id="wb-craft-btn" data-drawer="craft" style="display:none" data-i18n="wb.btn_craft">🔤 CRAFT</button>
            <button class="wb-station-btn" id="wb-meta-btn" data-drawer="metamorph" style="display:none" data-i18n="wb.btn_metamorph">🧬 METAMORPH</button>
            <button class="wb-submit-btn" id="wb-submit-btn" type="button" data-i18n="wb.btn_submit">提交配置 · SUBMIT FORM ➜</button>
          </div>
          <div class="wb-hint">
            <span class="hint-strong"><kbd>TAB</kbd><span data-i18n="wb.hint_tab_terminal">终端 ⇄</span></span>
            <span><kbd>ESC</kbd><span data-i18n="wb.hint_esc">EXIT</span></span>
          </div>
        </div>

        <div id="wb-confirm-dialog" class="wb-confirm-dialog" style="display:none" role="dialog" aria-modal="true">
          <div class="wb-confirm-card">
            <div class="wb-confirm-stamp">⚠ WARNING</div>
            <div class="wb-confirm-msg" id="wb-confirm-msg"></div>
            <div class="wb-confirm-actions">
              <button id="wb-confirm-yes" class="wb-confirm-btn wb-confirm-btn-yes" type="button">[Y] 确认 · YES</button>
              <button id="wb-confirm-no" class="wb-confirm-btn wb-confirm-btn-no" type="button">[N] 取消 · NO</button>
            </div>
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
  // 让新注入的 [data-i18n] 元素按当前 locale 翻译
  applyHtmlI18n();
}

function renderWelcome(): void {
  // 进店只丢一句 hint；不再自动 LIS 进 browse、也不再 dump HEL —— 显式才打
  terminal.appendLine(t('shop.terminal.welcome.try_help'), 'dim');
  terminal.appendBlank();
}

/**
 * Story 60.16 Task 4 + Review H2 fix: 注册 cross-module callbacks 到 shopBus。
 *
 * Story 60.18 hotfix: 改用 queueMicrotask 延迟到下一 tick — 避免循环依赖
 * (systems/shop → shopPreview facade → shopBootstrap → IIFE → workbench 仍未
 * 初始化完) 的 ReferenceError。下一 tick 时所有模块已 fully resolved。
 * 测试需同步 wire 的可显式 import + 调 wireShopBus()。
 */
export function wireShopBus(): void {
  // bootstrap-provided（lifecycle / 切屏 / 转场）
  shopBus.showOnly = showOnly;
  shopBus.switchToWorkbench = switchToWorkbench;
  shopBus.updateTerminalChrome = terminal.updateTerminalChrome;
  // workbench-provided（DOM sync / drawer / drag / inbox 动画）
  workbench.registerWorkbenchBindings();
  // terminal-provided（drawer / pack-pick 反向调 terminal 输出）
  terminal.registerTerminalBindings();
}
// 延迟到 microtask 队列 — 模块 init 完成后立即 wire，测试 import 后无需手动调
if (typeof queueMicrotask === 'function') {
  queueMicrotask(wireShopBus);
} else {
  Promise.resolve().then(wireShopBus);
}

/**
 * Story 60.5: 进入终端商店（取代 Phase 1 的 enterPreview hash 入口）。
 * `won` 参数预留接口与 classic openShop 同源，当前函数体不消费。
 * `#shop-preview` hash 仍走本函数（dev 调试入口）；正式入口由 systems/shop.ts:openShop
 * 按 UserSettings.shopUI 调度。
 */
export function enterTerminalShop(_won?: boolean): void {
  if (previewState.active) return;
  injectScreens();
  hideAllRealScreens();
  resetSession();
  previewState.active = true;
  showOnly('terminal');
  // Clear viewport then render welcome
  const vp = document.getElementById('terminal-viewport');
  if (vp) vp.innerHTML = '';
  // browse panel 随 viewport 一起被 wipe；entry 自动触发 LIS（与 BUY/RES 后
  // auto-LIS 同模式 · shopTerminal.ts:1114/1152/1194/1252/1392），让玩家进店即见货品
  previewState.browsePanelEl = null;
  previewState.lastListRowsBySku = new Map();
  renderWelcome();
  setPrompt('');
  terminal.cmdList();
  workbench.syncWorkbenchInbox();
  workbench.syncWorkbenchRelics();
  workbench.syncWorkbenchKeys();
  workbench.refreshWorkbenchNote();
  // Story 60.3: 首次进入时把 banner / 状态条接 state 实数（替代 Phase 1 静态 placeholder）
  terminal.updateTerminalChrome();
  // body class 标记：让 paper-craft 缩略图样式能 scope 到拖拽幽灵（dragGhost
  // 创建在 <body> 上，不在 #workbench-screen-preview 内，所以靠 body class 区分）
  document.body.classList.add('shop-preview-active');
  dragManager.init();
  // Story 60.1 follow-up: 注册形状预览渲染器，让 dragManager pickup 模式右键旋转
  // 时能更新幽灵的 shape thumbnail（与 classic shop 共用同一渲染器）
  registerShapePreviewRenderer(renderShapePreview);
  // 全局 dragend 兜底清理形状高亮 + effect radius 高亮 + cancel drag-hover RAF
  dragManager.onDragEnd = () => {
    clearShapePlacementOnWorkbench();
    workbench.clearEffectRadiusHighlight();
    workbench.cancelDragHoverPending();
  };
  // Story 60.9: 拖拽起势时全局隐藏所有 tooltip（不挡视线）
  // Story 60.12: 同时播放 pickup 音效（抓握刺啦）
  dragManager.onDragStart = () => {
    keyTooltip.hide();
    hideRelicTooltip();
    deskSfx('paper'); // workbench drag pickup → paper rustle
  };
  workbench.setupDragZones();
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
// Story 60.16 Review M2: 从 facade 内联移到此处，让 facade 缩到 ~30 行 re-export-only。
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
  // Story 60.4 review M1: pendingConfirm 互斥测试
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
  /** Story 60.10 review M2: 注入 descriptorCache 方便测 catalog 命中路径 */
  setDescriptorCache: (items: ItemDescriptor[]): void => { previewState.descriptorCache = items; },
  // Story 60.11: 动画测试入口
  cmdList: (): void => terminal.cmdList(),
  cmdReshuffle: (): void => terminal.cmdReshuffle(),
  triggerInboxWhoosh: (slotIdx: number): void => workbench.triggerInboxWhoosh(slotIdx),
  showOnly,
  setNextListAnimated: (v: boolean): void => { previewState.nextListIsAnimated = v; },
  // Story 60.12: 音效测试入口
  bindSkillToKey: (skillId: string, key: string): void => workbench.bindSkillToKey(skillId, key),
  unbindSkillFromKey: (key: string): void => workbench.unbindSkillFromKey(key),
  cmdBuy: (arg: string): void => terminal.cmdBuy(arg),
  openDrawer: (kind: 'words' | 'craft' | 'metamorph' | 'pack-pick'): void => workbench.openDrawer(kind),
  proceedSubmit,
};
