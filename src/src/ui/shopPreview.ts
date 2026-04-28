// ============================================
// Shop Redesign Preview (Phase 1)
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器（stub 数据） + 双屏切换 + 工作台静态视觉。
// ============================================

const PREVIEW_HASH = '#shop-preview';
const HIGH_PRICE_THRESHOLD = 100;

type Shape = 'mono' | 'row' | 'cross' | 'block';
type Rarity = 0 | 1 | 2 | 3;

interface CatalogItem {
  sku: string;        // e.g. 'LOZ-204'
  name: string;       // 'HALCYON LOZENGE'
  price: number;
  stock: number | null; // null = ∞
  clr: string;        // '4-B'
  rarity: Rarity;
  shape: Shape;
  triggers: string;   // letters this skill triggers on (display only)
  desc: string;
  effect: string;
  approvedBy: string;
  redacted?: boolean;
  syn?: number;       // stub synergy count (P1.4 will compute from state)
}

const STUB_CATALOG: CatalogItem[] = [
  { sku: 'LOZ-204', name: 'HALCYON LOZENGE',     price:  45, stock:  7, clr: '4-B', rarity: 0, shape: 'mono',  triggers: 'L O Z', desc: 'A small calming agent. Issued to clerks during quarterly audits.', effect: '+5% accuracy buff for 30s after consumption.', approvedBy: 'ACCOUNTING DEPT. (STAMP 4471)', syn: 0 },
  { sku: 'STM-019', name: 'STAMP, RED OXIDE',    price:  12, stock: null, clr: '4-B', rarity: 0, shape: 'mono',  triggers: 'S T M', desc: 'Standard-issue rubber stamp. Mandatory for all outgoing forms.', effect: 'Marks one form per typing as APPROVED.', approvedBy: 'SUPPLIES DEPT.', syn: 1 },
  { sku: 'FRM-883', name: 'FORM 22-B (TRIPLICATE)', price:  8, stock: null, clr: '4-B', rarity: 0, shape: 'row', triggers: 'F R M', desc: 'Three-copy carbon form. White, yellow, pink. Required for restitution claims.', effect: 'Triggers adjacent row of bound keys.', approvedBy: 'PROCESSING DEPT.', syn: 0 },
  { sku: 'PEN-771', name: 'PEN, REGULATION (BLACK)', price: 120, stock: 3, clr: '4-A', rarity: 1, shape: 'mono', triggers: 'P E N', desc: 'Black ink only. Blue or red constitutes a procedural violation under §47.', effect: '+30% damage to all CHIPS-school skills.', approvedBy: 'BLACK-INK COMMISSION', syn: 4 },
  { sku: 'CLP-009', name: 'PAPERCLIP, AUTHORIZED', price: 240, stock: 1, clr: '4-A', rarity: 3, shape: 'cross', triggers: 'C L P', desc: 'Tempered steel. Retains shape under interrogation. Not for personal use.', effect: 'Cross-shaped trigger zone (5 keys: self + N/E/S/W).', approvedBy: 'INTERNAL AFFAIRS', syn: 2 },
  { sku: 'TYP-099', name: 'TYPEWRITER OIL',      price:  75, stock: 4, clr: '4-B', rarity: 1, shape: 'mono', triggers: 'T Y P', desc: 'Reduces friction in carriage return. One bottle per quarter, no exceptions.', effect: '+10% combo retention per bottle filed.', approvedBy: 'MAINTENANCE DEPT.', syn: 1 },
  { sku: 'XXX-???', name: '████████████████████████', price: 9999, stock: null, clr: 'III', rarity: 3, shape: 'block', triggers: '? ? ?', desc: '████████████████████████████████████████████████████.', effect: '████████████████████████.', approvedBy: '████████', redacted: true, syn: 0 },
];

const SHAPE_TAG: Record<Shape, string> = { mono: '[·]', row: '[━]', cross: '[+]', block: '[█]' };
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
let stubGold = 248;
let stubInbox: string[] = []; // SKUs purchased this session
let undoStack: { sku: string; price: number }[] = [];
let pendingConfirm: { sku: string; price: number } | null = null;
let workbenchEntered = false;

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

function findItemBySKU(sku: string): CatalogItem | null {
  const up = sku.toUpperCase();
  return STUB_CATALOG.find(it => it.sku === up) ?? null;
}

function suggestSKU(input: string): string | null {
  const up = input.toUpperCase();
  let best: { sku: string; dist: number } | null = null;
  for (const it of STUB_CATALOG) {
    if (it.redacted) continue;
    const d = levenshtein(up, it.sku);
    if (!best || d < best.dist) best = { sku: it.sku, dist: d };
  }
  return best && best.dist <= 2 ? best.sku : null;
}

// === Render: line padding & alignment ===

const COL = { sku: 9, name: 35, price: 7, stock: 8, clr: 6, tag: 5 };

function pad(s: string, n: number, right = true): string {
  if (s.length >= n) return s.slice(0, n);
  return right ? s + ' '.repeat(n - s.length) : ' '.repeat(n - s.length) + s;
}

function priceColForLine(p: number): string {
  // emoji wraps in span at render-time, here just return raw "🍌 ##" placeholder
  if (p >= 9999) return ' ███';
  return pad(String(p), 4, false);
}

function renderListRow(it: CatalogItem): string {
  const nameWithStars = (it.rarity === 0 ? '' : it.rarity === 1 ? '*' : it.rarity === 2 ? '**' : '***') + it.name;
  const skuCol = pad(it.sku, COL.sku);
  const nameCol = pad(nameWithStars, COL.name);
  const priceCol = priceColForLine(it.price);
  const stockCol = pad(it.stock === null ? '∞' : String(it.stock).padStart(2, '0') + (it.stock < 10 ? '/10' : '/' + it.stock), 7);
  const clrCol = pad(it.clr, COL.clr);
  // shape & syn use sentinel tokens replaced after html-escape
  const shapeTag = `§S${it.shape.toUpperCase()}§`;
  const syn = it.syn ?? 0;
  const synTag = `§Y${syn}§`;
  const trailing = it.redacted ? '[REDACTED]' : '';
  return `${skuCol}${nameCol} 🍌${priceCol}  ${stockCol}  ${clrCol}  ${shapeTag} ${synTag} ${trailing}`.trimEnd();
}

function renderInfoBlock(it: CatalogItem): string[] {
  const W = 70;
  const top = '┌─ ' + it.name + ' · ' + it.sku + ' ' + '─'.repeat(Math.max(0, W - it.name.length - it.sku.length - 6)) + '┐';
  const mid = (s: string) => '│ ' + pad(s, W - 4) + ' │';
  const bot = '└' + '─'.repeat(W - 2) + '┘';
  return [
    top,
    mid('CLR ' + it.clr + ' · ' + ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'][it.rarity] + ' · SHAPE ' + SHAPE_TAG[it.shape]),
    mid('TRIGGERS: ' + it.triggers),
    mid(''),
    mid(it.desc),
    mid('EFFECT: ' + it.effect),
    mid('APPROVED BY: ' + it.approvedBy),
    bot,
  ];
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
  // shape sentinel: §SMONO§ → [·] 等
  html = html.replace(/§S(MONO|ROW|CROSS|BLOCK)§/g, (_m, k) => {
    const sym = ({ MONO: '[·]', ROW: '[━]', CROSS: '[+]', BLOCK: '[█]' } as Record<string, string>)[k] ?? '[?]';
    return `<span class="t-shape t-shape-${k.toLowerCase()}">${sym}</span>`;
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

function classForRow(it: CatalogItem): string {
  if (it.redacted) return 'redacted';
  if (it.rarity === 3) return 'legendary';
  if (it.rarity === 2) return 'rare';
  if (it.rarity === 1) return 'rare'; // share style for now; epic is also bright
  return '';
}

// === Commands ===

function cmdHelp(): void {
  appendLine('AVAILABLE COMMANDS:', 'head');
  appendLine('  LIS · BUY <SKU> · INF <SKU> · SEL <SKU> · RES');
  appendLine('  PRO (proceed to workbench) · STA · WOR · UND · HEL');
  appendLine('USE 3-LETTER ABBREVIATIONS. ↑↓ FOR HISTORY. TAB COMPLETES VERB ONLY.', 'dim');
  appendLine(`PRICES IN BANANA STANDARD 🍌. PURCHASES ≥🍌${HIGH_PRICE_THRESHOLD} REQUIRE [Y/N].`, 'dim');
  appendBlank();
}

function cmdList(): void {
  appendLine('CATALOG · 2026-Q2 · ALL PRICES IN BANANA STANDARD 🍌', 'head');
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  appendLine(`${pad('SKU', COL.sku)}${pad('ITEM', COL.name)} ${pad('PRICE', 6)}  ${pad('STOCK', 7)}  ${pad('CLR', COL.clr)}  TAG`, 'head');
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  for (const it of STUB_CATALOG) appendLine(renderListRow(it), classForRow(it));
  appendLine('─────────────────────────────────────────────────────────────────────────────────────');
  appendLine(`${STUB_CATALOG.length} ITEMS LISTED · TYPE  INFO <SKU>  FOR DETAILS`, 'dim');
  appendBlank();
}

function cmdInfo(arg?: string): void {
  if (!arg) { appendLine('USAGE: INFO <SKU>', 'dim'); return; }
  const it = findItemBySKU(arg);
  if (!it) {
    const guess = suggestSKU(arg);
    appendLine(`ERR · SKU NOT IN CATALOG: ${arg.toUpperCase()}`, 'redacted');
    if (guess) appendLine(`  · DID YOU MEAN ${guess}?`, 'dim');
    appendBlank();
    return;
  }
  for (const line of renderInfoBlock(it)) appendLine(line, classForRow(it));
  appendBlank();
}

function executeBuy(it: CatalogItem): void {
  if (stubInbox.length >= 5) {
    appendLine('ERR · IN-TRAY FULL · DISPATCH TO WORKBENCH BEFORE NEW PURCHASE', 'redacted');
    appendBlank();
    return;
  }
  if (stubGold < it.price) {
    appendLine(`ERR · INSUFFICIENT FUNDS · BAL 🍌${stubGold} · NEED 🍌${it.price}`, 'redacted');
    appendLine('  · SEE FORM 22-B FOR APPEAL PROCEDURES', 'dim');
    appendBlank();
    return;
  }
  stubGold -= it.price;
  stubInbox.push(it.sku);
  undoStack.push({ sku: it.sku, price: it.price });
  appendLine(`CONFIRMED · ${it.name} · 🍌${it.price} DEDUCTED`, 'echo');
  appendLine(`  · DISPATCHED TO IN-TRAY SLOT ${stubInbox.length}/5 · BAL 🍌${stubGold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length} (FINALIZES ON WORKBENCH ENTRY)`, 'dim');
  appendBlank();
  updateBalDisplay();
  syncWorkbenchInbox();
}

function cmdBuy(arg?: string): void {
  if (!arg) { appendLine('USAGE: BUY <SKU>', 'dim'); return; }
  const it = findItemBySKU(arg);
  if (!it) {
    const guess = suggestSKU(arg);
    appendLine(`ERR · SKU NOT IN CATALOG: ${arg.toUpperCase()}`, 'redacted');
    if (guess) appendLine(`  · DID YOU MEAN ${guess}?`, 'dim');
    appendBlank();
    return;
  }
  if (it.redacted) {
    appendLine(`ERR · CLEARANCE ${it.clr} REQUIRED · CONTACT SUPERVISOR`, 'redacted');
    appendBlank();
    return;
  }
  if (it.price >= HIGH_PRICE_THRESHOLD) {
    pendingConfirm = { sku: it.sku, price: it.price };
    appendLine(`CONFIRM PURCHASE · ${it.name} · 🍌${it.price}`, 'head');
    appendLine(`BAL AFTER: 🍌${stubGold - it.price} · TYPE [Y]ES OR [N]O`, 'dim');
    return;
  }
  executeBuy(it);
}

function cmdSell(arg?: string): void {
  if (!arg) { appendLine('USAGE: SELL <SKU>', 'dim'); return; }
  const idx = stubInbox.findIndex(s => s === arg.toUpperCase());
  if (idx < 0) {
    appendLine(`ERR · ${arg.toUpperCase()} NOT IN IN-TRAY`, 'redacted');
    appendLine('  · SELL ONLY APPLIES TO IN-TRAY ITEMS · USE WORKBENCH FOR EQUIPPED', 'dim');
    appendBlank();
    return;
  }
  const it = findItemBySKU(arg);
  const refund = it ? Math.floor(it.price * 0.5) : 0;
  stubInbox.splice(idx, 1);
  stubGold += refund;
  appendLine(`SOLD · ${arg.toUpperCase()} · 🍌${refund} REFUNDED (50%)`, 'echo');
  appendBlank();
  updateBalDisplay();
  syncWorkbenchInbox();
}

function cmdReshuffle(): void {
  const cost = 18;
  if (stubGold < cost) {
    appendLine(`ERR · INSUFFICIENT FUNDS · NEED 🍌${cost}`, 'redacted');
    appendBlank();
    return;
  }
  stubGold -= cost;
  appendLine(`CATALOG RESHUFFLED · 🍌${cost} DEDUCTED`, 'echo');
  appendLine('  · NEW INVENTORY POSTED. (STUB: catalog unchanged in P1)', 'dim');
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
  // remove last matching SKU from inbox
  const idx = stubInbox.lastIndexOf(last.sku);
  if (idx >= 0) stubInbox.splice(idx, 1);
  stubGold += last.price;
  appendLine(`UNDO · ${last.sku} REVERSED · 🍌${last.price} REFUNDED · BAL 🍌${stubGold}`, 'echo');
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
    const it = findItemBySKU(pendingConfirm.sku);
    pendingConfirm = null;
    if (it) executeBuy(it);
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
  if (findItemBySKU(verbInput)) {
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
  if (el) el.innerHTML = `<span class="bna">🍌</span> ${stubGold}`;
}

function syncWorkbenchInbox(): void {
  // Refresh the IN-tray foam slots based on stubInbox
  const root = document.querySelector('#workbench-screen-preview .wb-foam-case');
  if (!root) return;
  const slots: string[] = [];
  for (const sku of stubInbox) {
    const it = findItemBySKU(sku);
    if (!it) continue;
    slots.push(renderInboxCardHtml(it));
  }
  // pad empty
  while (slots.length < 5) slots.push('<div class="foam-cutout empty"><span class="cutout-empty-label">— 空槽 —</span></div>');
  root.innerHTML = slots.join('');
  // update IN-TRAY count label
  const sub = document.querySelector('#workbench-screen-preview .wb-intray .wb-tab-sub');
  if (sub) sub.textContent = `待装配 · ${String(stubInbox.length).padStart(2, '0')}`;
}

function renderInboxCardHtml(it: CatalogItem): string {
  const stamp = it.clr === '4-A'
    ? '<div class="wc-stamp wc-stamp-gold">CLEARANCE 4-A</div>'
    : '<div class="wc-stamp">REGULATION</div>';
  return `
    <div class="foam-cutout">
      <div class="weapon-card">
        <div class="wc-row">
          <span class="wc-icon">${getEmojiForSku(it.sku)}</span>
          <span class="wc-name">${it.name}</span>
        </div>
        <div class="wc-meta">
          <span class="wc-sn">SN · ${it.sku}-7842</span>
          <span class="wc-barcode">▌▎▌▌▎▍▌▎▌▌▎▍</span>
        </div>
        ${stamp}
      </div>
    </div>
  `;
}

function getEmojiForSku(sku: string): string {
  const m: Record<string, string> = {
    'LOZ-204': '⚡', 'STM-019': '🔥', 'FRM-883': '📋',
    'PEN-771': '🖊', 'CLP-009': '📎', 'TYP-099': '🛢',
  };
  return m[sku] || '◇';
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
  stubGold = 248;
  stubInbox = [];
  undoStack = [];
  pendingConfirm = null;
  workbenchEntered = false;
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
