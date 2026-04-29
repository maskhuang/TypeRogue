// ============================================
// Shop Redesign Preview (Phase 1.4)
// 通过 URL hash `#shop-preview` 触发；不影响任何现有流程。
// 终端命令解析器 + 双屏切换 + 工作台视觉。
// 数据：state.shop.items (auto-seed if empty) → ItemDescriptor → 渲染。
// ============================================

import { state, addRelicWithCapacity, removeRelic, isRelicSlotsFull } from '../core/state';
import { INBOX_MAX } from '../core/constants';
import { BALANCE } from '../core/constants';
import {
  generateAffixShopItems,
  generateShopRelicItem,
  buildAffixTooltipFields,
  renderShapePreview,
  getFreqHints,
  formatWordEffectLabel,
} from '../systems/shop';
import { generateWordPacks } from '../data/wordPacks';
import { calculateLetterFrequency } from '../systems/letters/LetterFrequencySystem';
import { getBattleNumber, getPositionInCycle, getStageType, getNextBattleNode } from '../systems/stage/stageFlow';
import { STAGE_ICONS } from '../systems/actTransition';
import { t } from '../demo/demo-i18n';
import { startLevel } from '../systems/battle';
import type { ShopItem, WordPack } from '../core/types';
import type { StageType } from '../systems/stage/StageConfig';
import { describeAllShopItems, type ItemDescriptor } from './itemDescriptors';
import { RELICS } from '../data/relics';
import { dragManager, registerShapePreviewRenderer, type DragPayload } from '../systems/dragManager';
import {
  highlightShapePlacementOnWorkbench,
  clearShapePlacementOnWorkbench,
  handleWorkbenchKeyRotation,
  applyBindFromInbox,
  applyUnbindKeyToInbox,
} from './shapePreview';

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
type UndoEntry =
  | { kind: 'skill'; sku: string; price: number; skillId: string; itemIdx: number }
  | { kind: 'pack'; sku: string; price: number; words: string[] }
  | { kind: 'relic'; sku: string; price: number; relicId: string };
let undoStack: UndoEntry[] = [];
let pendingConfirm: { sku: string; price: number } | null = null;
// Story 60.2: 多词 pack 选词流程未完成时的暂存状态（drawer 打开期间存活）
let pendingPackPick: { d: ItemDescriptor; pack: WordPack } | null = null;
// Story 60.4: SUBMIT 警告流程暂存状态
type SubmitStage = 'warn-bindings' | 'warn-inbox';
let pendingSubmit: { stage: SubmitStage; nextStage: SubmitStage | 'proceed' } | null = null;
// Story 60.4: stamp 动画进行中防重复点击
let submitting = false;
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
      const items = generateAffixShopItems(3);
      const packs = generateShopPackItems(2);
      items.push(...packs);
      const relic = generateShopRelicItem(1);
      if (relic) items.push(relic);
      state.shop.items = items;
    } catch {
      // Generator may throw if affix data not initialized; preview still functional via empty catalog
    }
  }
  if (state.gold < 1) state.gold = PREVIEW_SEED_GOLD;
}

// Story 60.2 fix: 把 generateWordPacks 输出包成 ShopItem，让 catalog 出现 pack 商品
function generateShopPackItems(count: number): ShopItem[] {
  try {
    const ownedWords = state.player.wordDeck;
    const playerFreqs = calculateLetterFrequency(ownedWords);
    const boundKeys = [...state.player.bindings.keys()];
    const packs = generateWordPacks(ownedWords, playerFreqs, boundKeys, count);
    return packs.map((pack, i): ShopItem => ({
      id: `si-pack-${i}-${Date.now()}`,
      type: 'pack',
      pack,
      cost: pack.cost,
      isUpgrade: false,
      locked: false,
    }));
  } catch {
    return [];
  }
}

// === Story 60.3: 终端 banner / 状态栏 label 生成（纯函数，独立可测） ===

/** banner ASCII 框内每行内容宽度（不含两边 │） */
const BANNER_INNER_WIDTH = 73;

const CLR_BY_STAGE_TYPE: Record<StageType, string> = {
  standard: '4-B',
  elite: '4-A',
  boss: 'III',     // 罗马数字 = 高密级，与 ritual 同档（boss = 年度审计仪式级）
  ritual: 'III',
};

/**
 * 构造 banner 第二行（不含 │ 边框），宽度恰好 BANNER_INNER_WIDTH 字符。
 * 复用 battle.ts:2275 的 cycle_prefix i18n 词典避免分裂。
 *
 * 注意：cycle_prefix 当前 i18n 值 = `BATCH {cycle} · `（en）/ `批次{cycle} · `（zh），
 * 与 banner 内的 `BATCH NN/12` 同名但不同义；视觉冗余但词典统一，60-14 统一处理时再 rename i18n key。
 */
export function buildBannerLine(level: number, cycle: number, ascensionLevel: number): string {
  const safeLevel = level > 0 ? level : 1;
  const cyclePrefix = cycle >= 2 ? t('battle.cycle_prefix', { cycle }) : '';
  // safeLevel ≥ 1 时 getBattleNumber 总返回 ≥ 1（fallback 死代码已移除）
  const fileNum = getBattleNumber(safeLevel);
  const batchPos = getPositionInCycle(safeLevel);
  const cycleLength = BALANCE.CYCLE_LENGTH;
  const ascension = ascensionLevel ?? 0;
  const content = `  CLERK ID: 7842    ${cyclePrefix}FILE ${fileNum}    BATCH ${String(batchPos).padStart(2, '0')}/${cycleLength}    A${ascension}`;
  // 截断或填充到固定宽度（防止超长 cycle prefix + 双位数 ascension 撑破框）
  if (content.length >= BANNER_INNER_WIDTH) return content.slice(0, BANNER_INNER_WIDTH);
  return content.padEnd(BANNER_INNER_WIDTH, ' ');
}

/**
 * 构造完整 banner（4 行 ASCII 框纯文本，不含 HTML 标签）。
 * 调用方应当通过 textContent 写入 `<pre>` 元素，monospace 字体保留 \n 分行。
 */
export function buildBannerText(level: number, cycle: number, ascensionLevel: number): string {
  const top = `┌${'─'.repeat(BANNER_INNER_WIDTH)}┐`;
  const line1Body = '  DEPT. OF PRIMATE CLERICAL AFFAIRS · §117 PNEUMATIC REQUISITION TUBE  '.padEnd(BANNER_INNER_WIDTH, ' ');
  const line1 = `│${line1Body.slice(0, BANNER_INNER_WIDTH)}│`;
  const line2 = `│${buildBannerLine(level, cycle, ascensionLevel)}│`;
  const bottom = `└${'─'.repeat(BANNER_INNER_WIDTH)}┘`;
  return `${top}\n${line1}\n${line2}\n${bottom}`;
}

/** FORM 字段：`F-${level}` 动态跟着 state.level 变 */
export function getFormLabel(level: number): string {
  const safeLevel = level > 0 ? level : 1;
  return `F-${safeLevel}`;
}

/** CLR 字段：按 stageType 显示密级（standard 4-B / elite 4-A / boss/ritual III） */
export function getClrLabel(level: number): string {
  const safeLevel = level > 0 ? level : 1;
  // CLR_BY_STAGE_TYPE 是 Record<StageType, string> total map，TS 保证全覆盖；无需 fallback
  return CLR_BY_STAGE_TYPE[getStageType(safeLevel)];
}

/** STAGE 字段：从 actTransition.STAGE_ICONS 单一真相源读 emoji */
export function getStageIcon(level: number): string {
  const safeLevel = level > 0 ? level : 1;
  // STAGE_ICONS 4 键覆盖 4 种 stageType；getStageType 返回 StageType 保证 lookup 命中
  return STAGE_ICONS[getStageType(safeLevel)];
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
  if (state.gold < d.price) {
    appendLine(`ERR · INSUFFICIENT FUNDS · BAL 🍌 ${state.gold} · NEED 🍌 ${d.price}`, 'redacted');
    appendLine('  · SEE FORM 22-B FOR APPEAL PROCEDURES', 'dim');
    appendBlank();
    return;
  }
  if (d.kind === 'skill') return executeBuySkill(d);
  if (d.kind === 'pack') return executeBuyPack(d);
  if (d.kind === 'relic') return executeBuyRelic(d);
  appendLine(`ERR · ${d.kind.toUpperCase()} PURCHASE NOT YET WIRED`, 'redacted');
  appendBlank();
}

function executeBuySkill(d: ItemDescriptor): void {
  if (state.player.inbox.length >= INBOX_MAX) {
    appendLine(`ERR · IN-TRAY FULL (${INBOX_MAX}/${INBOX_MAX}) · DISPATCH TO WORKBENCH BEFORE NEW PURCHASE`, 'redacted');
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
  state.affixSkills.set(skillId, skill);
  state.player.skills.set(skillId, { level: skill.level });
  state.player.inbox.push(skillId);
  undoStack.push({ kind: 'skill', sku: d.sku, price: d.price, skillId, itemIdx });
  appendLine(`CONFIRMED · ${d.name} · 🍌 ${d.price} DEDUCTED`, 'echo');
  appendLine(`  · DISPATCHED TO IN-TRAY SLOT ${state.player.inbox.length}/${INBOX_MAX} · BAL 🍌 ${state.gold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length} (FINALIZES ON WORKBENCH ENTRY)`, 'dim');
  appendBlank();
  updateTerminalChrome();
  syncWorkbenchInbox();
}

function executeBuyPack(d: ItemDescriptor): void {
  const pack = d.originalItem.pack;
  if (!pack || pack.words.length === 0) {
    appendLine(`ERR · PACK HAS NO WORDS · CANNOT PURCHASE`, 'redacted');
    appendBlank();
    return;
  }
  // Story 60.2: words.length > pickCount → 弹三选一抽屉；否则直接入库
  if (pack.words.length > pack.pickCount) {
    executeBuyPackPicker(d, pack);
  } else {
    executeBuyPackDirect(d, pack);
  }
}

function executeBuyPackDirect(d: ItemDescriptor, pack: WordPack): void {
  const word = pack.words[0];
  state.gold -= d.price;
  state.player.wordDeck.push(word);
  if (pack.wordEffect && state.classId !== 'wordsmith') {
    state.wordEffects.set(word, pack.wordEffect);
  }
  undoStack.push({ kind: 'pack', sku: d.sku, price: d.price, words: [word] });
  appendLine(`CONFIRMED · ${d.name} · 🍌 ${d.price} DEDUCTED`, 'echo');
  appendLine(`  · WORD "${word.toUpperCase()}" FILED TO LIBRARY · BAL 🍌 ${state.gold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length}`, 'dim');
  appendBlank();
  updateTerminalChrome();
}

function executeBuyPackPicker(d: ItemDescriptor, pack: WordPack): void {
  // M3 fix: 多 drawer 互斥 — 拒绝在其他 drawer 打开时弹 pack-pick
  if (drawerOpen && drawerOpen !== 'pack-pick') {
    appendLine(`ERR · DRAWER ${drawerOpen.toUpperCase()} OPEN · CLOSE FIRST [ESC]`, 'redacted');
    appendBlank();
    return;
  }
  pendingPackPick = { d, pack };
  appendLine(`PACK ${d.sku} · ${pack.words.length} CANDIDATES POSTED · CHOOSE ONE FOR FILING`, 'echo');
  appendBlank();
  if (currentScreen !== 'workbench') showOnly('workbench');
  openDrawer('pack-pick');
}

// Story 60.2: pack 选词成功 → 扣钱、入库、入栈、打印、关 drawer
export function finalizePackPick(pickedWord: string): void {
  if (!pendingPackPick) return;
  const { d, pack } = pendingPackPick;
  state.gold -= d.price;
  state.player.wordDeck.push(pickedWord);
  if (pack.wordEffect && state.classId !== 'wordsmith') {
    state.wordEffects.set(pickedWord, pack.wordEffect);
  }
  undoStack.push({ kind: 'pack', sku: d.sku, price: d.price, words: [pickedWord] });
  pendingPackPick = null;
  closeDrawer();
  appendLine(`CONFIRMED · ${d.name} · 🍌 ${d.price} DEDUCTED`, 'echo');
  appendLine(`  · WORD "${pickedWord.toUpperCase()}" FILED TO LIBRARY · BAL 🍌 ${state.gold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length}`, 'dim');
  appendBlank();
  updateTerminalChrome();
  // M1 fix: 切回终端，让 CONFIRMED / WORD FILED 消息可见
  showOnly('terminal');
}

// Story 60.2: 取消（ESC / overlay 点击 / drawer 关闭）— 不动 state
export function cancelPackPick(): void {
  if (!pendingPackPick) return;
  const sku = pendingPackPick.d.sku;
  pendingPackPick = null;
  appendLine(`ABORTED · ${sku} NOT PURCHASED`, 'dim');
  appendBlank();
  // M1 fix: 切回终端，让 ABORTED 消息可见
  showOnly('terminal');
}

// === Story 60.4: SUBMIT FORM → startLevel transition ===

// stamp 动画 600ms（CSS 控制） + 200ms safety = 800ms fallback timer
const SUBMIT_STAMP_FALLBACK_MS = 800;

/** SUBMIT 入口 — 检查警告 → 弹提示或直通 proceed */
export function triggerSubmit(): void {
  if (pendingSubmit !== null || submitting) return; // 防抖
  // M1 fix: 不允许在 BUY high-price confirm 未结时启动 SUBMIT 流程（防双 pending 共存）
  if (pendingConfirm) {
    showOnly('terminal');
    appendLine('ERR · PENDING PURCHASE CONFIRMATION · RESPOND [Y]/[N] FIRST', 'redacted');
    appendBlank();
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
  pendingSubmit = { stage: 'warn-bindings', nextStage };
  showOnly('terminal');
  setSubmitButtonAwaiting(true);
  appendLine('WARNING · NO BINDINGS · KEYBOARD UNARMED', 'redacted');
  appendLine('  · CONFIRM ENTRY? [Y]ES OR [N]O', 'dim');
}

function promptInboxWarning(): void {
  const n = state.player.inbox.length;
  pendingSubmit = { stage: 'warn-inbox', nextStage: 'proceed' };
  showOnly('terminal');
  setSubmitButtonAwaiting(true);
  appendLine(`WARNING · ${n} ITEM${n > 1 ? 'S' : ''} IN IN-TRAY · LEAVE PENDING ITEMS?`, 'redacted');
  appendLine('  · [Y]ES TO CARRY INTO NEXT BATCH · [N]O TO STAY AND EDIT', 'dim');
}

/**
 * 处理 SUBMIT 警告流程的 Y/N 输入。返回 true 表示已消费输入（在 confirm 模式下）。
 * 由 execute() 在 handleConfirmation 之前优先调用。
 */
export function handleSubmitConfirmation(input: string): boolean {
  if (!pendingSubmit) return false;
  const up = input.trim().toUpperCase();
  if (up === 'Y' || up === 'YES') {
    const nextStage = pendingSubmit.nextStage;
    pendingSubmit = null;
    if (nextStage === 'warn-inbox') {
      promptInboxWarning();
    } else {
      proceedSubmit();
    }
    return true;
  }
  if (up === 'N' || up === 'NO') {
    pendingSubmit = null;
    appendLine('ABORTED · ENTRY HALTED · RETURN TO WORKBENCH', 'dim');
    appendBlank();
    setSubmitButtonAwaiting(false);
    return true;
  }
  appendLine(`ERR · EXPECTED [Y]ES OR [N]O · GOT "${input}" · TRY AGAIN`, 'redacted');
  return true; // still in confirm mode
}

/** 警告全过 → 启 stamp 动画 + transition */
function proceedSubmit(): void {
  if (submitting) return;
  submitting = true;
  appendLine('SUBMITTING FORM · STAMPED · ENTRY APPROVED', 'echo');
  appendBlank();
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
  dragManager.destroy();
  clearShapePlacementOnWorkbench();
  pendingPackPick = null;
  pendingSubmit = null;
  pendingConfirm = null; // L2 fix: 防 stale BUY confirm 残留
  submitting = false;
  active = false;
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

function executeBuyRelic(d: ItemDescriptor): void {
  const relicId = d.originalItem.relicId;
  if (!relicId) {
    appendLine(`ERR · RELIC HAS NO ID · CANNOT PURCHASE`, 'redacted');
    appendBlank();
    return;
  }
  if (state.player.relics.has(relicId)) {
    appendLine(`ERR · RELIC ALREADY OWNED · ${relicId.toUpperCase()}`, 'redacted');
    appendBlank();
    return;
  }
  if (isRelicSlotsFull()) {
    appendLine(`ERR · NUMBER-ROW SLOTS FULL · DISCARD A RELIC FIRST`, 'redacted');
    appendBlank();
    return;
  }
  state.gold -= d.price;
  const ok = addRelicWithCapacity(relicId);
  if (!ok) {
    state.gold += d.price;
    appendLine(`ERR · RELIC ADD FAILED · CONTACT ARCHIVES`, 'redacted');
    appendBlank();
    return;
  }
  undoStack.push({ kind: 'relic', sku: d.sku, price: d.price, relicId });
  appendLine(`CONFIRMED · ${d.name} · 🍌 ${d.price} DEDUCTED`, 'echo');
  appendLine(`  · RELIC SHELVED · BAL 🍌 ${state.gold}`, 'dim');
  appendLine(`  · UNDO STACK: ${undoStack.length}`, 'dim');
  appendBlank();
  updateTerminalChrome();
  syncWorkbenchRelics();
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
  if (entry.kind !== 'skill') {
    appendLine(`ERR · ONLY IN-TRAY (SKILL) ITEMS CAN BE SOLD VIA TERMINAL`, 'redacted');
    appendBlank();
    return;
  }
  const refund = Math.floor(entry.price * 0.5);
  const inboxIdx = state.player.inbox.lastIndexOf(entry.skillId);
  if (inboxIdx >= 0) state.player.inbox.splice(inboxIdx, 1);
  state.player.skills.delete(entry.skillId);
  state.affixSkills.delete(entry.skillId);
  undoStack.splice(undoIdx, 1);
  state.gold += refund;
  appendLine(`SOLD · ${target} · 🍌 ${refund} REFUNDED (50%)`, 'echo');
  appendBlank();
  updateTerminalChrome();
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
    const items: ShopItem[] = [
      ...generateAffixShopItems(3),
      ...generateShopPackItems(2),
    ];
    const relic = generateShopRelicItem(1);
    if (relic) items.push(relic);
    state.shop.items = items;
    rebuildDescriptors();
    appendLine(`CATALOG RESHUFFLED · 🍌 ${cost} DEDUCTED · NEW INVENTORY POSTED`, 'echo');
  } catch {
    appendLine(`CATALOG RESHUFFLED · 🍌 ${cost} DEDUCTED · GENERATOR UNAVAILABLE`, 'echo');
  }
  appendBlank();
  updateTerminalChrome();
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
  if (last.kind === 'skill') {
    const idx = state.player.inbox.lastIndexOf(last.skillId);
    if (idx >= 0) state.player.inbox.splice(idx, 1);
    state.player.skills.delete(last.skillId);
    state.affixSkills.delete(last.skillId);
    syncWorkbenchInbox();
  } else if (last.kind === 'pack') {
    // Remove from end (matching insertion order)
    for (const w of last.words) {
      const i = state.player.wordDeck.lastIndexOf(w);
      if (i >= 0) state.player.wordDeck.splice(i, 1);
    }
  } else if (last.kind === 'relic') {
    removeRelic(last.relicId);
    syncWorkbenchRelics();
  }
  state.gold += last.price;
  appendLine(`UNDO · ${last.sku} REVERSED · 🍌 ${last.price} REFUNDED · BAL 🍌 ${state.gold}`, 'echo');
  appendBlank();
  updateTerminalChrome();
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
  appendBlank();
  // ensure on workbench so drawer is visible
  if (currentScreen !== 'workbench') showOnly('workbench');
  openDrawer('words');
}

// === Drawer overlay ===
type DrawerKind = 'words' | 'craft' | 'metamorph' | 'pack-pick';
let drawerOpen: DrawerKind | null = null;

function openDrawer(kind: DrawerKind): void {
  const el = document.getElementById('wb-drawer');
  const title = document.getElementById('wb-drawer-title');
  const body = document.getElementById('wb-drawer-body');
  if (!el || !title || !body) return;
  drawerOpen = kind;
  if (kind === 'words') {
    title.textContent = `WORD LIBRARY · ${state.player.wordDeck.length} WORDS`;
    body.innerHTML = renderWordsDrawerHtml();
  } else if (kind === 'craft') {
    title.textContent = 'WORDSMITH STATION · ASSEMBLY LINE';
    body.innerHTML = renderStubDrawerHtml('CRAFT', 'Letter-fragment assembly. Combine carbons to forge new words.', 'STATION OFFLINE · WIRING DEFERRED TO PHASE 2');
  } else if (kind === 'metamorph') {
    title.textContent = 'METAMORPH STATION · MUTATION CHAMBER';
    body.innerHTML = renderStubDrawerHtml('METAMORPH', 'Mutate skill affixes by spending mutagen.', 'STATION OFFLINE · WIRING DEFERRED TO PHASE 2');
  } else if (kind === 'pack-pick') {
    if (!pendingPackPick) return;
    const { d, pack } = pendingPackPick;
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
  if (drawerOpen === 'pack-pick' && pendingPackPick !== null) {
    cancelPackPick();
  }
  drawerOpen = null;
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

function renderStubDrawerHtml(name: string, desc: string, status: string): string {
  return `
    <div class="wb-drawer-stub">
      <div class="ws-name">${name}</div>
      <div class="ws-desc">${desc}</div>
      <div class="ws-status">${status}</div>
    </div>
  `;
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
      if (!pendingPackPick) return;
      const idx = parseInt(card.dataset.pickIdx ?? '-1', 10);
      const word = pendingPackPick.pack.words[idx];
      if (typeof word === 'string') finalizePackPick(word);
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
  // Story 60.4: SUBMIT 警告 prompt 优先级 > BUY high-price confirm
  if (handleSubmitConfirmation(line)) return;
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
  if (cmdHistory.length === 0) {
    // Visible cue so the keystroke isn't silently ignored on first try
    flashPrompt();
    return;
  }
  if (historyIdx === -1) historyIdx = cmdHistory.length;
  historyIdx = Math.max(0, Math.min(cmdHistory.length, historyIdx + dir));
  setPrompt(cmdHistory[historyIdx] ?? '');
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
  if (!active) return;
  // Preview owns the keyboard while active — block battle's typing handler
  // (which would otherwise treat terminal input as miss-keys and shake the screen).
  e.stopImmediatePropagation();
  // Story 60.2: pack-pick drawer 打开时拦截 ESC/Tab/Enter；其他键不消费
  // - ESC 关闭 = cancel
  // - Tab 走 focus trap（在卡片之间循环，不跳出抽屉）
  // - Enter 触发 focused 卡片 click（capture-phase stopImmediatePropagation
  //   会阻止事件到达 button 元素，浏览器原生 Enter→click 失效，必须手动触发）
  if (drawerOpen === 'pack-pick') {
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
    if (drawerOpen) { closeDrawer(); return; }
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

  if (e.key === 'ArrowUp' || (e.ctrlKey && e.key.toLowerCase() === 'p')) {
    e.preventDefault(); navHistory(-1); return;
  }
  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key.toLowerCase() === 'n')) {
    e.preventDefault(); navHistory(+1); return;
  }

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

/**
 * Story 60.3: 集中渲染终端 banner + 5 个 ts-cell（BAL/FORM/CLR/CONN/STAGE）。
 * 所有 BUY/SELL/UND/RES 路径调用本函数，确保 banner 与 BAL 同步刷新。
 * idempotent: 反复调用安全，root 不存在时整体 no-op。
 */
export function updateTerminalChrome(): void {
  const root = document.getElementById('terminal-shop-screen');
  if (!root) return;

  // Banner
  const bannerEl = root.querySelector<HTMLElement>('#terminal-banner-pre');
  if (bannerEl) {
    bannerEl.textContent = buildBannerText(state.level, state.cycle, state.ascensionLevel ?? 0);
  }

  // BAL（沿用 innerHTML 因为含 <span class="bna">🍌</span>）
  updateBalDisplay();

  // FORM
  const formEm = root.querySelector('[data-field="form"] em');
  if (formEm) formEm.textContent = getFormLabel(state.level);

  // CLR
  const clrEm = root.querySelector('[data-field="clr"] em');
  if (clrEm) clrEm.textContent = getClrLabel(state.level);

  // STAGE
  const stageEm = root.querySelector('[data-field="stage"] em');
  if (stageEm) stageEm.textContent = getStageIcon(state.level);

  // CONN 是固定文本（DPCA 复古调制解调器梗），不动
}

// Story 60.1: 拖拽 IN-tray / 跨键 → key 落子
// 状态变更全部走 applyBindFromInbox（在 shapePreview.ts），本函数只负责调用 + DOM 同步
function bindSkillToKey(skillId: string, key: string): void {
  applyBindFromInbox(skillId, key);
  syncWorkbenchInbox();
  syncWorkbenchKeys();
}

// Story 60.1: 从键拖回 IN-tray = 整体卸下多格技能
function unbindSkillFromKey(key: string): void {
  if (applyUnbindKeyToInbox(key) !== undefined) {
    syncWorkbenchInbox();
    syncWorkbenchKeys();
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
}

function syncWorkbenchInbox(): void {
  const root = document.querySelector('#workbench-screen-preview .wb-foam-case');
  if (!root) return;
  // Find descriptor for each inbox skillId by scanning historical undoStack and current cache
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
      sku: undoStack.find(u => u.kind === 'skill' && u.skillId === skillId)?.sku ?? '???-???',
      clearance: sk.rarity >= 2 ? '4-A' : '4-B',
      skillId,
      shapeId,
      rotation,
      rarity,
      shapePreviewHtml: renderShapePreview(shapeId, rotation, rarity),
    }));
  }
  while (slots.length < INBOX_MAX) slots.push('<div class="foam-cutout empty"><span class="cutout-empty-label">— 空槽 —</span></div>');
  root.innerHTML = slots.join('');
  // Re-register drop zones since IN-tray DOM was rebuilt
  if (active) setupDragZones();
  const sub = document.querySelector('#workbench-screen-preview .wb-intray .wb-tab-sub');
  if (sub) sub.textContent = `待装配 · ${String(state.player.inbox.length).padStart(2, '0')}`;
}

interface InboxCardData {
  iconEmoji: string;
  name: string;
  sku: string;
  clearance: string;
  skillId: string;
  shapeId: string;
  rotation: number;
  rarity: number;
  shapePreviewHtml: string;
}

function escapeAttr(s: string): string {
  // & 必须先转义，否则后续转义产生的实体字符（如 &quot;）会被二次解释
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function renderInboxCardHtml(c: InboxCardData): string {
  const stamp = c.clearance === '4-A'
    ? '<div class="wc-stamp wc-stamp-gold">CLEARANCE 4-A</div>'
    : '<div class="wc-stamp">REGULATION</div>';
  // Story 60.1: 多格形状属性（dragManager.buildPayload 会读 data-shape-* 进 payload）
  const shapeAttrs = c.shapePreviewHtml
    ? ` data-shape-id="${c.shapeId}" data-rotation="${c.rotation}" data-rarity="${c.rarity}" data-shape-preview="${escapeAttr(c.shapePreviewHtml)}"`
    : '';
  const shapeBlock = c.shapePreviewHtml
    ? `<div class="wc-shape">${c.shapePreviewHtml}</div>`
    : '';
  return `
    <div class="foam-cutout">
      <div class="weapon-card" data-drag-type="skill-inventory" data-skill-id="${c.skillId}"${shapeAttrs}>
        <div class="wc-row">
          <span class="wc-icon inv-icon">${c.iconEmoji}</span>
          <span class="wc-name inv-name">${c.name}</span>
        </div>
        <div class="wc-meta">
          <span class="wc-sn">SN · ${c.sku}-7842</span>
          <span class="wc-barcode">▌▎▌▌▎▍▌▎▌▌▎▍</span>
        </div>
        ${shapeBlock}
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
  document.body.classList.remove('shop-preview-active');
  clearShapePlacementOnWorkbench();
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
  typedBuffer = '';
  cmdHistory = [];
  historyIdx = -1;
  undoStack = [];
  pendingConfirm = null;
  pendingPackPick = null; // L2 fix: 防止跨 session 残留 stale pack reference
  workbenchEntered = false;
  state.player.inbox = [];
  ensureSeed();
  rebuildDescriptors();
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
  syncWorkbenchRelics();
  syncWorkbenchKeys();
  // Story 60.3: 首次进入时把 banner / 状态条接 state 实数（替代 Phase 1 静态 placeholder）
  updateTerminalChrome();
  // body class 标记：让 paper-craft 缩略图样式能 scope 到拖拽幽灵（dragGhost
  // 创建在 <body> 上，不在 #workbench-screen-preview 内，所以靠 body class 区分）
  document.body.classList.add('shop-preview-active');
  dragManager.init();
  // Story 60.1 follow-up: 注册形状预览渲染器，让 dragManager pickup 模式右键旋转
  // 时能更新幽灵的 shape thumbnail（与 classic shop 共用同一渲染器）
  registerShapePreviewRenderer(renderShapePreview);
  // 全局 dragend 兜底清理形状高亮（一次性设置，避免每次 setupDragZones 重复赋值）
  dragManager.onDragEnd = () => clearShapePlacementOnWorkbench();
  setupDragZones();
  setupDrawerHandlers();
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

// === Story 60.2 / 60.4: 测试专用内部 API（不要在生产代码里使用）===
export const __test = {
  executeBuyPack: (d: ItemDescriptor) => executeBuyPack(d),
  getPendingPackPick: () => pendingPackPick,
  setPendingPackPick: (v: { d: ItemDescriptor; pack: WordPack } | null): void => {
    pendingPackPick = v;
  },
  getUndoStack: () => undoStack,
  resetUndoStack: (): void => { undoStack = []; },
  // Story 60.4
  getPendingSubmit: () => pendingSubmit,
  setPendingSubmit: (v: { stage: SubmitStage; nextStage: SubmitStage | 'proceed' } | null): void => {
    pendingSubmit = v;
  },
  isSubmitting: (): boolean => submitting,
  resetSubmitting: (): void => { submitting = false; },
  // Story 60.4 review M1: pendingConfirm 互斥测试
  setPendingConfirm: (v: { sku: string; price: number } | null): void => {
    pendingConfirm = v;
  },
  getPendingConfirm: () => pendingConfirm,
};
