// ============================================
// Shop Redesign Preview (Phase 1.4)
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器 + 双屏切换 + 工作台视觉。
// 数据：state.shop.items (auto-seed if empty) → ItemDescriptor → 渲染。
// ============================================

import { state } from '../core/state';
import { INBOX_MAX } from '../core/constants';
import { generateAffixShopItems, buildAffixTooltipFields } from '../systems/shop';
import { describeAllShopItems, type ItemDescriptor } from './itemDescriptors';

const PREVIEW_HASH = '#shop-preview';
const HIGH_PRICE_THRESHOLD = 100;
const PREVIEW_SEED_GOLD = 248;

const VERBS = ['LIS', 'BUY', 'INF', 'SEL', 'RES', 'PRO', 'HEL', 'UND', 'STA', 'WOR'] as const;
const VERB_FULL: Record<string, string> = {
  LIS: 'LIST', BUY: 'BUY', INF: 'INFO', SEL: 'SELL',
  RES: 'RESHUFFLE', PRO: 'PROCEED', HEL: 'HELP', UND: 'UNDO',
  STA: 'STATS', WOR: 'WORDS',
};

// ---- Module-level session state ----
let active = false;
let currentScreen: 'terminal' | 'workbench' = 'terminal';
let typedBuffer = '';
let cmdHistory: string[] = [];
let historyIdx = -1; // -1 = no nav
let undoStack: { sku: string; price: number; skillId: string; itemIdx: number }[] = [];
let pendingConfirm: { sku: string; price: number } | null = null;
let workbenchEntered = false;
// snapshot of descriptors for current shop session — re-derived each LIST or after mutation
let descriptorCache: ItemDescriptor[] = [];

function rebuildDescriptors(): void {
  descriptorCache = describeAllShopItems(state.shop.items, state).map(d => ({
    ...d,
    synergyCount: getSynergyCount(d),
  }));
}

function findDescriptorBySku(sku: string): ItemDescriptor | null {
  const up = sku.toUpperCase();
  return descriptorCache.find(d => d.sku === up) ?? null;
}

// === Synergy: matching skills (same-resource OR wanted-affix) ===
// Per-affix wanted set: most affixes contribute self.type; Echo is special and
// contributes its echoAffixA / echoAffixB targets (not echo itself).
// Counts each owned skill at most once. Excludes the candidate itself.
function getSynergyCount(d: ItemDescriptor): number {
  if (d.kind !== 'skill') return 0;
  const sk = d.originalItem.affixSkill;
  if (!sk) return 0;

  const wantedAffixTypes = new Set<string>();
  for (const af of sk.affixes) {
    if (af.type === 'echo') {
      // 感应：仅匹配它声明的 A/B 词条目标，不计 echo 自身
      if (af.echoAffixA) wantedAffixTypes.add(af.echoAffixA);
      if (af.echoAffixB) wantedAffixTypes.add(af.echoAffixB);
    } else {
      wantedAffixTypes.add(af.type);
    }
  }

  const targetRes = sk.resource;
  let count = 0;
  for (const [id, owned] of state.affixSkills) {
    if (id === sk.id) continue;
    const sameRes = !!targetRes && owned.resource === targetRes;
    const matchAffix = owned.affixes.some(a => wantedAffixTypes.has(a.type));
    if (sameRes || matchAffix) count++;
  }
  return count;
}

// === Auto-seed shop if empty (so #shop-preview works standalone) ===
function ensureSeed(): void {
  if (state.shop.items.length === 0) {
    try {
      state.shop.items = generateAffixShopItems(5);
    } catch {
      // Generator may throw if affix data not initialized; preview still functional via empty catalog
    }
  }
  if (state.gold < 1) state.gold = PREVIEW_SEED_GOLD;
}

// === Helpers ===

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function expandVerb(input: string): string | null {
  if (!input) return null;
  const up = input.toUpperCase();
  // exact match against full verbs
  for (const short of VERBS) {
    if (VERB_FULL[short] === up) return short;
  }
  // exact 3-letter abbrev
  if (up.length === 3 && (VERBS as readonly string[]).includes(up)) return up;
  // prefix match (≥3 chars unique)
  if (up.length >= 3) {
    const matches = VERBS.filter(v => VERB_FULL[v].startsWith(up));
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function suggestSku(input: string): string | null {
  const up = input.toUpperCase();
  let best: { sku: string; dist: number } | null = null;
  for (const d of descriptorCache) {
    if (d.redacted) continue;
    const dist = levenshtein(up, d.sku);
    if (!best || dist < best.dist) best = { sku: d.sku, dist };
  }
  return best && best.dist <= 2 ? best.sku : null;
}

// === Render: line padding & alignment ===

const COL = { sku: 9, name: 32, price: 7, stock: 8, clr: 6 };

function pad(s: string, n: number, right = true): string {
  if (s.length >= n) return s.slice(0, n);
  return right ? s + ' '.repeat(n - s.length) : ' '.repeat(n - s.length) + s;
}

function priceColForLine(p: number): string {
  if (p >= 9999) return ' ███';
  return pad(String(p), 4, false);
}

function renderListRow(d: ItemDescriptor): string {
  const stars = d.rarity === 0 ? '' : '*'.repeat(d.rarity);
  const upgPrefix = d.upgrade ? '↑' : '';
  const nameWithMarkers = upgPrefix + stars + d.nameAbbrev;
  const skuCol = pad(d.sku, COL.sku);
  const nameCol = pad(nameWithMarkers, COL.name);
  const priceCol = priceColForLine(d.price);
  const stockStr = d.stockNow === null
    ? '∞'
    : `${String(d.stockNow).padStart(2, '0')}/${String(d.stockMax ?? d.stockNow).padStart(2, '0')}`;
  const stockCol = pad(stockStr, 7);
  const clrCol = pad(d.clearance, COL.clr);
  const shapeTok = `§T${d.shapeColor.toUpperCase()}|${d.shapeTag}§`;
  const synTok = `§Y${d.synergyCount}§`;
  const trailing = d.redacted ? '[REDACTED]' : '';
  return `${skuCol}${nameCol} 🍌 ${priceCol}  ${stockCol}  ${clrCol}  ${shapeTok} ${synTok} ${trailing}`.trimEnd();
}

function wrapAt(text: string, w: number): string[] {
  if (text.length <= w) return [text];
  const out: string[] = [];
  const words = text.split(/(\s+)/);
  let cur = '';
  for (const tok of words) {
    if ((cur + tok).length <= w) cur += tok;
    else {
      if (cur.trim()) out.push(cur.trimEnd());
      cur = tok.trimStart();
    }
  }
  if (cur.trim()) out.push(cur.trimEnd());
  return out;
}

function renderInfoBlock(d: ItemDescriptor): string[] {
  const W = 80;
  const lines: string[] = [];
  const headLine = `═══ ${d.name} · ${d.sku} ` + '═'.repeat(Math.max(3, W - d.name.length - d.sku.length - 7));
  lines.push(headLine);
  lines.push(`KIND ${d.kind.toUpperCase()} · CLR ${d.clearance} · ${d.rarityLabel} · §T${d.shapeColor.toUpperCase()}|${d.shapeTag}§`);
  lines.push(`PRICE 🍌 ${d.price} · TRIGGER ${d.triggerHint}${d.level ? ` · Lv.${d.level}` : ''}`);

  // Skill items: rich affix + enchant breakdown via buildAffixTooltipFields
  const sk = d.originalItem.affixSkill;
  if (d.kind === 'skill' && sk) {
    if (sk.baseValues && sk.baseValues.length > 0) {
      lines.push('');
      lines.push('BASE VALUES');
      const bvStr = sk.baseValues.map((v, i) => `Lv${i + 1}:${v}`).join(' · ');
      for (const w of wrapAt(bvStr, W - 4)) lines.push('  ' + w);
    }
    let fields: ReturnType<typeof buildAffixTooltipFields> | null = null;
    try { fields = buildAffixTooltipFields(sk); } catch { fields = null; }
    if (fields && fields.affixInfo.length > 0) {
      lines.push('');
      lines.push('AFFIXES');
      for (const af of fields.affixInfo) {
        const hdr = `‹${(af.typeName || '?').toUpperCase()}›${af.paramSummary ? ' ' + af.paramSummary : ''}`;
        for (const w of wrapAt(hdr, W - 4)) lines.push('  ' + w);
        if (af.description) {
          for (const w of wrapAt(af.description, W - 6)) lines.push('    ' + w);
        }
      }
    }
    if (fields && fields.enchantments.length > 0) {
      lines.push('');
      lines.push('ENCHANTMENTS');
      for (const e of fields.enchantments) {
        const hdr = `‹${(e.name || '?').toUpperCase()}›`;
        for (const w of wrapAt(hdr, W - 4)) lines.push('  ' + w);
        if (e.desc) {
          for (const w of wrapAt(e.desc, W - 6)) lines.push('    ' + w);
        }
      }
    }
    if (fields && fields.questProgress) {
      lines.push('  QUEST: ' + fields.questProgress);
    }
    if (fields && fields.apprenticeGrowth) {
      lines.push('  APPRENTICE: ' + fields.apprenticeGrowth);
    }
  } else {
    // Pack / relic / enchantment fallback
    lines.push('');
    lines.push(d.desc);
    lines.push(d.effect);
    if (d.affixLine !== '—') lines.push(`AFFIX: ${d.affixLine}`);
  }

  lines.push('');
  lines.push(d.kind === 'skill'
    ? `SYN ${d.synergyCount} MATCHING SKILLS (same-resource & same-affix)`
    : `SYN ${d.synergyCount}`);
  lines.push('═'.repeat(W));
  return lines;
}

// === Output to viewport ===

function appendLine(text: string, cls = ''): void {
  const vp = document.getElementById('terminal-viewport');
  if (!vp) return;
  const div = document.createElement('div');
  div.className = `t-line ${cls}`.trim();
  let html = escapeHtml(text);
  // 价格 emoji 自动 wrap：把"🍌"包成 .bna
  html = html.replace(/🍌/g, '<span class="bna">🍌</span>');
  // shape sentinel: §T<COLOR>|<TAG>§  →  <span class="t-shape t-shape-COLOR">TAG</span>
  html = html.replace(/§T([A-Z]+)\|(\[[^\]]+\])§/g, (_m, color, tag) => {
    return `<span class="t-shape t-shape-${(color as string).toLowerCase()}">${tag}</span>`;
  });
  // syn sentinel: §Y4§ → [SYN:4]
  html = html.replace(/§Y(\d+)§/g, (_m, n) => {
    const v = Number(n);
    const cls2 = v > 0 ? 't-syn t-syn-hit' : 't-syn t-syn-zero';
    return `<span class="${cls2}">[SYN:${v}]</span>`;
  });
  div.innerHTML = html;
  vp.appendChild(div);
  vp.scrollTop = vp.scrollHeight;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function appendBlank(n = 1): void {
  for (let i = 0; i < n; i++) appendLine('');
}

function classForRow(d: ItemDescriptor): string {
  if (d.redacted) return 'redacted';
  if (d.rarity === 3) return 'legendary';
  if (d.rarity >= 1) return 'rare';
  return '';
}

// === Commands ===

function cmdHelp(): void {
  appendLine('AVAILABLE COMMANDS:', 'head');
  appendLine('  LIS · BUY <SKU> · INF <SKU> · SEL <SKU> · RES');
  appendLine('  PRO (proceed to workbench) · STA · WOR · UND · HEL');
  appendLine('USE 3-LETTER ABBREVIATIONS. ↑↓ FOR HISTORY. TAB COMPLETES VERB ONLY.', 'dim');
  appendLine(`PRICES IN BANANA STANDARD 🍌  · PURCHASES ≥ 🍌 ${HIGH_PRICE_THRESHOLD} REQUIRE [Y/N].`, 'dim');
  appendBlank();
}

function cmdList(): void {
  rebuildDescriptors();
  if (descriptorCache.length === 0) {
    appendLine('CATALOG EMPTY · NO ITEMS POSTED', 'dim');
    appendBlank();
    return;
  }
  appendLine('CATALOG · 2026-Q2 · ALL PRICES IN BANANA STANDARD 🍌', 'head');
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  appendLine(`${pad('SKU', COL.sku)}${pad('ITEM', COL.name)} ${pad('PRICE', 6)}  ${pad('STOCK', 7)}  ${pad('CLR', COL.clr)}  TAG`, 'head');
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  for (const d of descriptorCache) appendLine(renderListRow(d), classForRow(d));
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  appendLine(`${descriptorCache.length} ITEMS LISTED · TYPE  INFO <SKU>  FOR DETAILS`, 'dim');
  appendBlank();
}

function cmdInfo(arg?: string): void {
  if (!arg) { appendLine('USAGE: INFO <SKU>', 'dim'); return; }
  const d = findDescriptorBySku(arg);
  if (!d) {
    const guess = suggestSku(arg);
    appendLine(`ERR · SKU NOT IN CATALOG: ${arg.toUpperCase()}`, 'redacted');
    if (guess) appendLine(`  · DID YOU MEAN ${guess}?`, 'dim');
    appendBlank();
    return;
  }
  for (const line of renderInfoBlock(d)) appendLine(line, classForRow(d));
  appendBlank();
}

function executeBuy(d: ItemDescriptor): void {
  if (d.kind !== 'skill') {
    appendLine(`ERR · ${d.kind.toUpperCase()} PURCHASE NOT YET WIRED IN P1.4`, 'redacted');
    appendLine('  · SKILL ITEMS ONLY THIS PHASE', 'dim');
    appendBlank();
    return;
  }
  if (state.player.inbox.length >= INBOX_MAX) {
    appendLine(`ERR · IN-TRAY FULL (${INBOX_MAX}/${INBOX_MAX}) · DISPATCH TO WORKBENCH BEFORE NEW PURCHASE`, 'redacted');
    appendBlank();
    return;
  }
  if (state.gold < d.price) {
    appendLine(`ERR · INSUFFICIENT FUNDS · BAL 🍌 ${state.gold} · NEED 🍌 ${d.price}`, 'redacted');
    appendLine('  · SEE FORM 22-B FOR APPEAL PROCEDURES', 'dim');
    appendBlank();
    return;
  }
  const skill = d.originalItem.affixSkill;
  if (!skill) {
    appendLine(`ERR · ITEM HAS NO SKILL DATA · CANNOT PURCHASE`, 'redacted');
    appendBlank();
    return;
  }
  const skillId = d.originalItem.skillId ?? skill.id;
  const itemIdx = state.shop.items.indexOf(d.originalItem);
  state.gold -= d.price;
  // Register skill metadata + ownership so workbench can render it
  state.affixSkills.set(skillId, skill);
  state.player.skills.set(skillId, { level: skill.level });
  state.player.inbox.push(skillId);
  undoStack.push({ sku: d.sku, price: d.price, skillId, itemIdx });
  appendLine(`CONFIRMED · ${d.name} · 🍌 ${d.price} DEDUCTED`, 'echo');
  appendLine(`  · DISPATCHED TO IN-TRAY SLOT ${state.player.inbox.length}/${INBOX_MAX} · BAL 🍌 ${state.gold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length} (FINALIZES ON WORKBENCH ENTRY)`, 'dim');
  appendBlank();
  updateBalDisplay();
  syncWorkbenchInbox();
}

function cmdBuy(arg?: string): void {
  if (!arg) { appendLine('USAGE: BUY <SKU>', 'dim'); return; }
  const d = findDescriptorBySku(arg);
  if (!d) {
    const guess = suggestSku(arg);
    appendLine(`ERR · SKU NOT IN CATALOG: ${arg.toUpperCase()}`, 'redacted');
    if (guess) appendLine(`  · DID YOU MEAN ${guess}?`, 'dim');
    appendBlank();
    return;
  }
  if (d.redacted) {
    appendLine(`ERR · CLEARANCE ${d.clearance} REQUIRED · CONTACT SUPERVISOR`, 'redacted');
    appendBlank();
    return;
  }
  if (d.price >= HIGH_PRICE_THRESHOLD) {
    pendingConfirm = { sku: d.sku, price: d.price };
    appendLine(`CONFIRM PURCHASE · ${d.name} · 🍌 ${d.price}`, 'head');
    appendLine(`BAL AFTER: 🍌 ${state.gold - d.price} · TYPE [Y]ES OR [N]O`, 'dim');
    return;
  }
  executeBuy(d);
}

function cmdSell(arg?: string): void {
  if (!arg) { appendLine('USAGE: SELL <SKU>', 'dim'); return; }
  const target = arg.toUpperCase();
  // SEL operates on inbox items by SKU
  const undoIdx = undoStack.findIndex(u => u.sku === target);
  if (undoIdx < 0) {
    appendLine(`ERR · ${target} NOT IN IN-TRAY`, 'redacted');
    appendLine('  · SELL ONLY APPLIES TO IN-TRAY ITEMS · USE WORKBENCH FOR EQUIPPED', 'dim');
    appendBlank();
    return;
  }
  const entry = undoStack[undoIdx];
  const refund = Math.floor(entry.price * 0.5);
  // Remove from inbox (last matching skillId) + ownership
  const inboxIdx = state.player.inbox.lastIndexOf(entry.skillId);
  if (inboxIdx >= 0) state.player.inbox.splice(inboxIdx, 1);
  state.player.skills.delete(entry.skillId);
  state.affixSkills.delete(entry.skillId);
  undoStack.splice(undoIdx, 1);
  state.gold += refund;
  appendLine(`SOLD · ${target} · 🍌 ${refund} REFUNDED (50%)`, 'echo');
  appendBlank();
  updateBalDisplay();
  syncWorkbenchInbox();
}

function cmdReshuffle(): void {
  const cost = 18;
  if (state.gold < cost) {
    appendLine(`ERR · INSUFFICIENT FUNDS · NEED 🍌 ${cost}`, 'redacted');
    appendBlank();
    return;
  }
  state.gold -= cost;
  try {
    state.shop.items = generateAffixShopItems(5);
    rebuildDescriptors();
    appendLine(`CATALOG RESHUFFLED · 🍌 ${cost} DEDUCTED · NEW INVENTORY POSTED`, 'echo');
  } catch {
    appendLine(`CATALOG RESHUFFLED · 🍌 ${cost} DEDUCTED · GENERATOR UNAVAILABLE`, 'echo');
  }
  appendBlank();
  updateBalDisplay();
}

function cmdProceed(): void {
  appendLine(`PROCEEDING TO WORKBENCH · ${undoStack.length} PURCHASES FINALIZED`, 'echo');
  appendBlank();
  switchToWorkbench();
}

function cmdUndo(): void {
  if (workbenchEntered) {
    appendLine('ERR · UNDO LOCKED · WORKBENCH ALREADY ENTERED THIS SESSION', 'redacted');
    appendBlank();
    return;
  }
  const last = undoStack.pop();
  if (!last) {
    appendLine('UNDO STACK EMPTY · NOTHING TO REVERSE', 'dim');
    appendBlank();
    return;
  }
  // remove last matching skillId from inbox + ownership
  const idx = state.player.inbox.lastIndexOf(last.skillId);
  if (idx >= 0) state.player.inbox.splice(idx, 1);
  state.player.skills.delete(last.skillId);
  state.affixSkills.delete(last.skillId);
  state.gold += last.price;
  appendLine(`UNDO · ${last.sku} REVERSED · 🍌 ${last.price} REFUNDED · BAL 🍌 ${state.gold}`, 'echo');
  appendBlank();
  updateBalDisplay();
  syncWorkbenchInbox();
}

function cmdStats(): void {
  appendLine('═══ PERFORMANCE AUDIT · CLERK-7842 · BATCH 03/12 ═══', 'head');
  appendLine('  KEY USAGE       FREQ    DPS     ACC');
  appendLine('  A  ████████      9     142     94%');
  appendLine('  E  ███████       8     128     91%');
  appendLine('  L  ██████        7     121     88%');
  appendLine('  ...');
  appendLine('  TOP CONTRIBUTOR: LOZ-204 (38% of total)', 'echo');
  appendLine('  WEAKEST KEY:     J (FREQ-LOCKED)', 'redacted');
  appendLine('═══ END OF AUDIT ═══ (STUB · P1.4 wires real data)', 'dim');
  appendBlank();
}

function cmdWords(): void {
  appendLine('OPENING WORD LIBRARY DRAWER...', 'echo');
  appendLine('  · STUB · P1.6 builds the overlay drawer', 'dim');
  appendBlank();
}

// === Confirmation handler ===

function handleConfirmation(input: string): boolean {
  if (!pendingConfirm) return false;
  const up = input.trim().toUpperCase();
  if (up === 'Y' || up === 'YES') {
    const d = findDescriptorBySku(pendingConfirm.sku);
    pendingConfirm = null;
    if (d) executeBuy(d);
    return true;
  }
  if (up === 'N' || up === 'NO') {
    appendLine(`ABORTED · ${pendingConfirm.sku} NOT PURCHASED`, 'dim');
    appendBlank();
    pendingConfirm = null;
    return true;
  }
  appendLine(`ERR · EXPECTED [Y]ES OR [N]O · GOT "${input}" · TRY AGAIN`, 'redacted');
  return true; // still in confirm mode
}

// === Main parser ===

function execute(line: string): void {
  appendLine(`§> ${line}`, 'dim');
  if (handleConfirmation(line)) return;
  const trimmed = line.trim();
  if (!trimmed) return;
  const parts = trimmed.split(/\s+/);
  const verbInput = parts[0].toUpperCase();
  const arg = parts[1];
  // implicit BUY: if first token matches a SKU and no verb, treat as BUY
  if (findDescriptorBySku(verbInput)) {
    cmdBuy(verbInput);
    return;
  }
  const verb = expandVerb(verbInput);
  if (!verb) {
    appendLine(`ERR · UNKNOWN VERB: ${verbInput}`, 'redacted');
    appendLine('  · TYPE  HEL  FOR COMMAND LIST', 'dim');
    appendBlank();
    return;
  }
  switch (verb) {
    case 'LIS': cmdList(); break;
    case 'BUY': cmdBuy(arg); break;
    case 'INF': cmdInfo(arg); break;
    case 'SEL': cmdSell(arg); break;
    case 'RES': cmdReshuffle(); break;
    case 'PRO': cmdProceed(); break;
    case 'HEL': cmdHelp(); break;
    case 'UND': cmdUndo(); break;
    case 'STA': cmdStats(); break;
    case 'WOR': cmdWords(); break;
  }
}

// === Input handling ===

function setPrompt(text: string): void {
  const el = document.getElementById('terminal-prompt-text');
  if (el) el.textContent = text;
  typedBuffer = text;
}

function tabComplete(): void {
  const up = typedBuffer.trim().toUpperCase();
  if (!up) return;
  // complete only the verb (first word)
  const parts = up.split(/\s+/);
  if (parts.length > 1) return; // don't complete SKU
  const matches = VERBS.filter(v => VERB_FULL[v].startsWith(parts[0]));
  if (matches.length === 1) setPrompt(VERB_FULL[matches[0]] + ' ');
  else if (matches.length > 1) {
    appendLine(`§> ${typedBuffer}`, 'dim');
    appendLine('  · ' + matches.map(m => VERB_FULL[m]).join(' · '), 'dim');
  }
}

function navHistory(dir: 1 | -1): void {
  if (cmdHistory.length === 0) return;
  if (historyIdx === -1) historyIdx = cmdHistory.length;
  historyIdx = Math.max(0, Math.min(cmdHistory.length, historyIdx + dir));
  setPrompt(cmdHistory[historyIdx] ?? '');
}

function injectFKey(verb: keyof typeof VERB_FULL): void {
  setPrompt(VERB_FULL[verb] + ' ');
}

function onKey(e: KeyboardEvent): void {
  if (!active) return;
  // Preview owns the keyboard while active — block battle's typing handler
  // (which would otherwise treat terminal input as miss-keys and shake the screen).
  e.stopImmediatePropagation();
  // Tab: complete verb if buffer non-empty (terminal only); else switch screens
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    if (currentScreen === 'terminal' && typedBuffer.trim().length > 0) {
      tabComplete();
    } else {
      if (currentScreen === 'terminal') switchToWorkbench();
      else showOnly('terminal');
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    restoreFromPreview();
    return;
  }
  if (currentScreen !== 'terminal') return;

  // F-keys: inject command (do NOT execute)
  const fmap: Record<string, keyof typeof VERB_FULL> = {
    F1: 'LIS', F2: 'BUY', F3: 'INF', F4: 'SEL', F5: 'RES', F10: 'PRO',
  };
  if (fmap[e.key]) {
    e.preventDefault();
    injectFKey(fmap[e.key]);
    return;
  }

  if (e.key === 'ArrowUp')   { e.preventDefault(); navHistory(-1); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); navHistory(+1); return; }

  if (e.key === 'Backspace') {
    e.preventDefault();
    typedBuffer = typedBuffer.slice(0, -1);
    setPrompt(typedBuffer);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const line = typedBuffer;
    if (line.trim()) {
      cmdHistory.push(line);
      historyIdx = -1;
    }
    setPrompt('');
    execute(line);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    typedBuffer += e.key.toUpperCase();
    setPrompt(typedBuffer);
  }
}

// === Status bar / inbox sync ===

function updateBalDisplay(): void {
  const el = document.querySelector('#terminal-shop-screen .ts-cell .bal');
  if (el) el.innerHTML = `<span class="bna">🍌</span> ${state.gold}`;
}

function syncWorkbenchInbox(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-foam-case');
  if (!root) return;
  // Find descriptor for each inbox skillId by scanning historical undoStack and current cache
  const slots: string[] = [];
  for (const skillId of state.player.inbox) {
    const sk = state.affixSkills.get(skillId);
    if (!sk) continue;
    slots.push(renderInboxCardHtml({
      iconEmoji: sk.icon || '◇',
      name: sk.name.toUpperCase(),
      sku: undoStack.find(u => u.skillId === skillId)?.sku ?? '???-???',
      clearance: sk.rarity >= 2 ? '4-A' : '4-B',
    }));
  }
  while (slots.length < INBOX_MAX) slots.push('<div class="foam-cutout empty"><span class="cutout-empty-label">— 空槽 —</span></div>');
  root.innerHTML = slots.join('');
  const sub = document.querySelector('#workbench-screen-preview .wb-intray .wb-tab-sub');
  if (sub) sub.textContent = `待装配 · ${String(state.player.inbox.length).padStart(2, '0')}`;
}

interface InboxCardData {
  iconEmoji: string;
  name: string;
  sku: string;
  clearance: string;
}

function renderInboxCardHtml(c: InboxCardData): string {
  const stamp = c.clearance === '4-A'
    ? '<div class="wc-stamp wc-stamp-gold">CLEARANCE 4-A</div>'
    : '<div class="wc-stamp">REGULATION</div>';
  return `
    <div class="foam-cutout">
      <div class="weapon-card">
        <div class="wc-row">
          <span class="wc-icon">${c.iconEmoji}</span>
          <span class="wc-name">${c.name}</span>
        </div>
        <div class="wc-meta">
          <span class="wc-sn">SN · ${c.sku}-7842</span>
          <span class="wc-barcode">▌▎▌▌▎▍▌▎▌▌▎▍</span>
        </div>
        ${stamp}
      </div>
    </div>
  `;
}

function switchToWorkbench(): void {
  workbenchEntered = true;
  if (undoStack.length > 0) {
    appendLine(`  · ${undoStack.length} PURCHASES FINALIZED.`, 'dim');
    undoStack = [];
  }
  showOnly('workbench');
}

// === Screen lifecycle ===

let menuPrevDisplay: string | null = null;

function showOnly(which: 'terminal' | 'workbench'): void {
  const t = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const w = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (t) t.style.display = which === 'terminal' ? 'flex' : 'none';
  if (w) w.style.display = which === 'workbench' ? 'flex' : 'none';
  currentScreen = which;
}

function hideAllRealScreens(): void {
  const ids = ['main-menu-screen', 'battle-screen', 'shop-screen', 'ritual-screen', 'rest-screen', 'gameover-screen'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === 'main-menu-screen' && menuPrevDisplay === null) menuPrevDisplay = el.style.display || '';
    el.style.display = 'none';
  }
}

function restoreFromPreview(): void {
  active = false;
  const t = document.getElementById('terminal-shop-screen') as HTMLElement | null;
  const w = document.getElementById('workbench-screen-preview') as HTMLElement | null;
  if (t) t.style.display = 'none';
  if (w) w.style.display = 'none';
  const menu = document.getElementById('main-menu-screen');
  if (menu) menu.style.display = 'flex';
  if (location.hash === PREVIEW_HASH) history.replaceState(null, '', location.pathname + location.search);
}

function resetSession(): void {
  typedBuffer = '';
  cmdHistory = [];
  historyIdx = -1;
  undoStack = [];
  pendingConfirm = null;
  workbenchEntered = false;
  state.player.inbox = [];
  ensureSeed();
  rebuildDescriptors();
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
            <pre class="terminal-banner">┌─────────────────────────────────────────────────────────────────────────┐
│  DEPT. OF PRIMATE CLERICAL AFFAIRS · §117 PNEUMATIC REQUISITION TUBE   │
│  CLERK ID: 7842    FILE 5    BATCH 03/12    A2                         │
└─────────────────────────────────────────────────────────────────────────┘</pre>

            <div class="terminal-status">
              <span class="ts-cell">BAL <em class="bal"><span class="bna">🍌</span> 248</em></span>
              <span class="ts-cell">FORM <em>F-3942-A</em></span>
              <span class="ts-cell">CLR <em class="clr">4-B</em></span>
              <span class="ts-cell">CONN <em class="conn">56k6 OK</em></span>
              <span class="ts-cell">STAGE <em>📋</em></span>
            </div>

            <div class="terminal-viewport" id="terminal-viewport"></div>

            <div class="terminal-prompt">
              <span class="pp-prefix">CLERK-7842 §&gt;</span>
              <span class="pp-text" id="terminal-prompt-text"></span><span class="pp-cursor">█</span>
            </div>

            <div class="terminal-hint">
              <span><kbd>F1</kbd>LIST</span>
              <span><kbd>F2</kbd>BUY</span>
              <span><kbd>F3</kbd>INFO</span>
              <span><kbd>F4</kbd>SELL</span>
              <span><kbd>F5</kbd>RESHUFFLE</span>
              <span><kbd>F10</kbd>PROCEED →</span>
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
              <div class="kb-row">
                ${'1234567890'.split('').map(k => `<div class="kb-key empty"><span class="kb-letter">${k}</span></div>`).join('')}
              </div>
              <div class="kb-row kb-row-q">
                ${'QWERTYUIOP'.split('').map(k => `<div class="kb-key empty"><span class="kb-letter">${k}</span></div>`).join('')}
              </div>
              <div class="kb-row kb-row-a">
                ${'ASDFGHJKL'.split('').map(k => `<div class="kb-key empty"><span class="kb-letter">${k}</span></div>`).join('')}
              </div>
              <div class="kb-row kb-row-z">
                ${'ZXCVBNM'.split('').map(k => `<div class="kb-key empty"><span class="kb-letter">${k}</span></div>`).join('')}
              </div>
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
            </div>
          </div>
        </div>

        <div class="workbench-footer">
          <div class="wb-note">
            <span class="note-pin" aria-hidden="true">📌</span>
            <span class="note-text">"它在叫我名字。如果你听见——立即更换键盘。" — 前任使用者 #4471（已失踪）</span>
          </div>
          <div class="wb-actions">
            <button class="wb-submit-btn">提交配置 · SUBMIT FORM ➜</button>
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
  appendLine('CONNECTED · DPCA-VT220 · §117 PNEUMATIC REQUISITION TUBE', 'head');
  appendLine('  · TYPE  HEL  FOR COMMAND LIST', 'dim');
  appendBlank();
  cmdList();
  cmdHelp();
}

function enterPreview(): void {
  if (active) return;
  injectScreens();
  hideAllRealScreens();
  resetSession();
  active = true;
  showOnly('terminal');
  // Clear viewport then render welcome
  const vp = document.getElementById('terminal-viewport');
  if (vp) vp.innerHTML = '';
  renderWelcome();
  setPrompt('');
  syncWorkbenchInbox();
  setTimeout(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, 0);
}

function checkHash(): void {
  if (location.hash === PREVIEW_HASH) enterPreview();
}

export function initShopPreview(): void {
  window.addEventListener('hashchange', checkHash);
  window.addEventListener('keydown', onKey, true);
  if (document.readyState === 'complete') checkHash();
  else window.addEventListener('load', checkHash, { once: true });
}
