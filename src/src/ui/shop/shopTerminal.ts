// ============================================
// Shop Preview · Terminal Module (Story 60.16)
// ============================================
// 终端命令解析 + 渲染 + 描述符 + banner / 状态栏 + 商品种子。
// 拆自原 shopPreview.ts；workbench / bootstrap 通过 shopBus 协调。
// ============================================

import { state, addRelicWithCapacity, removeRelic, isRelicSlotsFull } from '../../core/state';
import { INBOX_MAX, BALANCE, PUNCTUATION_KEYS } from '../../core/constants';
import {
  generateAffixShopItems,
  generateShopRelicItem,
  buildAffixTooltipFields,
  applyMaxSkillLevelOnPurchase,
} from '../../systems/shop';
import { shouldAnimateShop } from '../../core/UserSettings';
// Story 60.7: 副作用 hook（事件总线 + quest 重算 + 遗物购入瞬时效果）
import { eventBus } from '../../core/events/EventBus';
import { evaluateEquipQuests } from '../../data/affixTrigger';
import { getQuestEquipReduction } from '../../systems/relics/EnchantmentRelicBehaviors';
import { rerollAllAffixes } from '../../systems/relics/SkillRelicBehaviors';
import { initFurnace } from '../../systems/relics/ResourceRelicBehaviors';
import { random } from '../../core/seededRandom';
import { generateWordPacks } from '../../data/wordPacks';
import { calculateLetterFrequency, calculateLetterScores, FREQ_UNLOCK_THRESHOLD } from '../../systems/letters/LetterFrequencySystem';
import { getBattleNumber, getPositionInCycle, getStageType } from '../../systems/stage/stageFlow';
import { STAGE_ICONS } from '../../systems/actTransition';
import { t } from '../../demo/demo-i18n';
import { AFFIX_TAXA } from '../../data/affixTaxa';
import type { ShopItem, WordPack } from '../../core/types';
import type { StageType } from '../../systems/stage/StageConfig';
import { describeAllShopItems, type ItemDescriptor } from '../itemDescriptors';
import { RELICS } from '../../data/relics';
import {
  previewState,
  shopBus,
  sfx,
  escapeHtml,
  getOwnedSkillEntries,
  HIGH_PRICE_THRESHOLD,
  PREVIEW_SEED_GOLD,
  VERBS,
  VERB_FULL,
} from './shopState';

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
  const content = `  CLERK ID: 7842    ${cyclePrefix}DAY ${fileNum}    BATCH ${String(batchPos).padStart(2, '0')}/${cycleLength}    A${ascension}`;
  // 截断或填充到固定宽度（防止超长 cycle prefix + 双位数 ascension 撑破框）
  if (content.length >= BANNER_INNER_WIDTH) return content.slice(0, BANNER_INNER_WIDTH);
  return content.padEnd(BANNER_INNER_WIDTH, ' ');
}

/**
 * §117 ACQUISITIONS 申领类表单池（per-run 轮换）
 * narrative 已在 relic / boss / scriptor 文本散落引用过 F-001/F-017/F-039/F-044——
 * 这里把它们 + 同类申领/拨发/补领号纳入池，每个 run 通过 runSeed % 池长 锁定一份。
 * 玩家进商店看到 banner § ACQUISITIONS · F-039 = "今天生效拨发协议"。
 */
const ACQ_FORM_POOL: ReadonlyArray<string> = [
  'F-001', // 申领总章
  'F-017', // 复核 / 跟进
  'F-039', // 拨发申请
  'F-044', // 存档归档
  'F-061', // 调拨
  'F-088', // 增补
  'F-117', // 补领
  'F-156', // 外协
  'F-211', // 特批
  'F-273', // 追加
];

export function getAcquisitionFormCode(runSeed: number): string {
  const idx = ((runSeed % ACQ_FORM_POOL.length) + ACQ_FORM_POOL.length) % ACQ_FORM_POOL.length;
  return ACQ_FORM_POOL[idx];
}

/**
 * 构造完整 banner（4 行 ASCII 框纯文本，不含 HTML 标签）。
 * 调用方应当通过 textContent 写入 `<pre>` 元素，monospace 字体保留 \n 分行。
 */
export function buildBannerText(level: number, cycle: number, ascensionLevel: number, runSeed: number): string {
  const top = `┌${'─'.repeat(BANNER_INNER_WIDTH)}┐`;
  const formCode = getAcquisitionFormCode(runSeed);
  const line1Body = `  DEPT. OF PRIMATE CLERICAL AFFAIRS · §117 ACQUISITIONS · ${formCode}  `.padEnd(BANNER_INNER_WIDTH, ' ');
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
    bannerEl.textContent = buildBannerText(state.level, state.cycle, state.ascensionLevel ?? 0, state.runSeed);
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

// === Auto-seed shop if empty (so #shop-preview works standalone) ===

export function ensureSeed(): void {
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

// === Descriptor cache ===

export function rebuildDescriptors(): void {
  previewState.descriptorCache = describeAllShopItems(state.shop.items, state).map(d => ({
    ...d,
    synergyCount: getSynergyCount(d),
    purchased: previewState.purchasedSkus.has(d.sku),
  }));
}

export function findDescriptorBySku(sku: string): ItemDescriptor | null {
  const up = sku.toUpperCase();
  return previewState.descriptorCache.find(d => d.sku === up) ?? null;
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

  // Bug fix #2: 仅算"真正在场"的技能 — 已绑键 ∪ 待装配 inbox。
  // 排除孤儿（在 state.player.skills 但既未绑键又不在 inbox，例如 main.ts:126
  // 给非 demo 玩家加的 starter，未绑键时仍残留在 player.skills），避免 SYN
  // 算上看不见的技能。
  const activeIds = new Set<string>();
  for (const sid of state.player.bindings.values()) activeIds.add(sid);
  for (const sid of state.player.inbox) activeIds.add(sid);

  const targetRes = sk.resource;
  let count = 0;
  for (const id of activeIds) {
    if (id === sk.id) continue;
    const owned = state.affixSkills.get(id);
    if (!owned) continue;
    const sameRes = !!targetRes && owned.resource === targetRes;
    const matchAffix = owned.affixes.some(a => wantedAffixTypes.has(a.type));
    if (sameRes || matchAffix) count++;
  }
  return count;
}

// === Parsing helpers ===

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

export function expandVerb(input: string): string | null {
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

export function suggestSku(input: string): string | null {
  const up = input.toUpperCase();
  let best: { sku: string; dist: number } | null = null;
  for (const d of previewState.descriptorCache) {
    if (d.redacted) continue;
    const dist = levenshtein(up, d.sku);
    if (!best || dist < best.dist) best = { sku: d.sku, dist };
  }
  return best && best.dist <= 2 ? best.sku : null;
}

// === Render: list rows ===
// visualWidth / pad / priceColForLine / COL — 原 char-padding 实现的死代码，
// list 列改走 HTML inline-block 后 char-padding 永远 0 调用，Story 60.16 Task 6 一并删除。

/**
 * 渲染 LIST 行的 HTML 列结构。每列是固定 width 的 inline-block，让浏览器布局而不是
 * 字符宽度做对齐 —— 中文 / emoji 在等宽字体 fallback 下宽度不严格 1ch，靠 spaces
 * padding 永远对不齐。
 */
function renderListRow(d: ItemDescriptor): string {
  const stars = d.rarity === 0 ? '' : '*'.repeat(d.rarity);
  const upgPrefix = d.upgrade ? '↑' : '';
  const nameWithMarkers = upgPrefix + stars + d.nameAbbrev;
  const stockStr = d.stockNow === null
    ? '∞'
    : `${String(d.stockNow).padStart(2, '0')}/${String(d.stockMax ?? d.stockNow).padStart(2, '0')}`;
  const priceStr = d.price >= 9999 ? '███' : String(d.price);
  const shapeTokHtml = `<span class="t-shape t-shape-${d.shapeColor.toLowerCase()}">${escapeHtml(d.shapeTag)}</span>`;
  const synV = d.synergyCount;
  const synCls = synV > 0 ? 't-syn t-syn-hit' : 't-syn t-syn-zero';
  const synTokHtml = `<span class="${synCls}">[SYN:${synV}]</span>`;
  const trailing = d.purchased
    ? `<span class="lst-cell lst-redacted">${t('shop.terminal.list.sold')}</span>`
    : d.redacted
    ? `<span class="lst-cell lst-redacted">${t('shop.terminal.list.redacted')}</span>`
    : '';
  return [
    `<span class="lst-cell lst-sku">${escapeHtml(d.sku)}</span>`,
    `<span class="lst-cell lst-name">${escapeHtml(nameWithMarkers)}</span>`,
    `<span class="lst-cell lst-price"><span class="bna">🍌</span> ${escapeHtml(priceStr)}</span>`,
    `<span class="lst-cell lst-stock">${escapeHtml(stockStr)}</span>`,
    `<span class="lst-cell lst-clr">${escapeHtml(d.clearance)}</span>`,
    `<span class="lst-cell lst-tag">${shapeTokHtml}</span>`,
    `<span class="lst-cell lst-syn">${synTokHtml}</span>`,
    trailing,
  ].join('');
}

/** Header 行同结构，让 SKU/ITEM/PRICE/STOCK/CLR/TAG 标题与数据列严格对齐 */
function renderListHeaderRow(): string {
  return [
    `<span class="lst-cell lst-sku">${t('shop.terminal.list.col.sku')}</span>`,
    `<span class="lst-cell lst-name">${t('shop.terminal.list.col.item')}</span>`,
    `<span class="lst-cell lst-price">${t('shop.terminal.list.col.price')}</span>`,
    `<span class="lst-cell lst-stock">${t('shop.terminal.list.col.stock')}</span>`,
    `<span class="lst-cell lst-clr">${t('shop.terminal.list.col.clr')}</span>`,
    `<span class="lst-cell lst-tag">${t('shop.terminal.list.col.tag')}</span>`,
  ].join('');
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
  lines.push(t('shop.terminal.info.catalog.kind_line', {
    kind: d.kind.toUpperCase(),
    clearance: d.clearance,
    rarity: d.rarityLabel,
    shape: `§T${d.shapeColor.toUpperCase()}|${d.shapeTag}§`,
  }));
  const levelSuffix = d.level ? t('shop.terminal.info.catalog.level_suffix', { level: d.level }) : '';
  lines.push(t('shop.terminal.info.catalog.price_line', {
    price: d.price,
    trigger: d.triggerHint,
    level_suffix: levelSuffix,
  }));

  // Skill items: rich affix + enchant breakdown via buildAffixTooltipFields
  const sk = d.originalItem.affixSkill;
  if (d.kind === 'skill' && sk) {
    if (sk.baseValues && sk.baseValues.length > 0) {
      lines.push('');
      lines.push(t('shop.terminal.info.catalog.base_values_header'));
      const bvStr = sk.baseValues.map((v, i) => `Lv${i + 1}:${v}`).join(' · ');
      for (const w of wrapAt(bvStr, W - 4)) lines.push('  ' + w);
    }
    let fields: ReturnType<typeof buildAffixTooltipFields> | null = null;
    try { fields = buildAffixTooltipFields(sk); } catch { fields = null; }
    if (fields && fields.affixInfo.length > 0) {
      lines.push('');
      lines.push(t('shop.terminal.info.catalog.affixes_header'));
      for (const af of fields.affixInfo) {
        const hdr = `‹${(af.typeName || '?').toUpperCase()}›${af.paramSummary ? ' ' + af.paramSummary : ''}`;
        for (const w of wrapAt(hdr, W - 4)) lines.push('  ' + w);
        const taxon = af.typeKey ? AFFIX_TAXA[af.typeKey] : null;
        if (taxon) lines.push(`    ${taxon.latin} · ${taxon.code}`);
        if (af.description) {
          for (const w of wrapAt(af.description, W - 6)) lines.push('    ' + w);
        }
      }
    }
    if (fields && fields.enchantments.length > 0) {
      lines.push('');
      lines.push(t('shop.terminal.info.catalog.enchantments_header'));
      for (const e of fields.enchantments) {
        const hdr = `‹${(e.name || '?').toUpperCase()}›`;
        for (const w of wrapAt(hdr, W - 4)) lines.push('  ' + w);
        if (e.desc) {
          for (const w of wrapAt(e.desc, W - 6)) lines.push('    ' + w);
        }
      }
    }
    if (fields && fields.questProgress) {
      lines.push(t('shop.terminal.info.skill.quest_label', { progress: fields.questProgress }));
    }
    if (fields && fields.apprenticeGrowth) {
      lines.push(t('shop.terminal.info.skill.apprentice_label', { growth: fields.apprenticeGrowth }));
    }
  } else {
    // Pack / relic / enchantment fallback
    lines.push('');
    lines.push(d.desc);
    lines.push(d.effect);
    if (d.affixLine !== '—') lines.push(t('shop.terminal.info.catalog.affix_line', { affix: d.affixLine }));
  }

  lines.push('');
  lines.push(d.kind === 'skill'
    ? t('shop.terminal.info.catalog.syn_skill', { n: d.synergyCount })
    : t('shop.terminal.info.catalog.syn_other', { n: d.synergyCount }));
  lines.push('═'.repeat(W));
  return lines;
}

// === Output to viewport ===

export function appendLine(text: string, cls = '', raw = false): void {
  const vp = document.getElementById('terminal-viewport');
  if (!vp) return;
  const div = document.createElement('div');
  div.className = `t-line ${cls}`.trim();
  if (raw) {
    // List row HTML 已 escape + 已 sentinel 替换，直接 innerHTML 注入
    div.innerHTML = text;
  } else {
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
  }
  vp.appendChild(div);
  vp.scrollTop = vp.scrollHeight;
}

// escapeHtml 已移至 ./shopState（workbench inbox card 也要用）— 通过 shopState 重新 export
export { escapeHtml } from './shopState';

export function appendBlank(n = 1): void {
  for (let i = 0; i < n; i++) appendLine('');
}

function classForRow(d: ItemDescriptor): string {
  if (d.purchased || d.redacted) return 'redacted';
  if (d.rarity === 3) return 'legendary';
  if (d.rarity >= 1) return 'rare';
  return '';
}

// === Commands ===

export function cmdHelp(): void {
  appendLine(t('shop.terminal.cmd.help.header'), 'head');
  appendLine(t('shop.terminal.cmd.help.row1'));
  appendLine(t('shop.terminal.cmd.help.row2'));
  appendLine(t('shop.terminal.cmd.help.row3'), 'dim');
  // Story 60.10: INF 扩展用法说明
  appendLine(t('shop.terminal.cmd.help.inf_header'), 'head');
  appendLine(t('shop.terminal.cmd.help.inf_sku'));
  appendLine(t('shop.terminal.cmd.help.inf_key'));
  appendLine(t('shop.terminal.cmd.help.inf_name'));
  appendLine(t('shop.terminal.cmd.help.inf_owned'));
  appendLine(t('shop.terminal.cmd.help.price_note', { threshold: HIGH_PRICE_THRESHOLD }), 'dim');
  appendBlank();
}

export function cmdList(): void {
  rebuildDescriptors();
  // Story 60.11 review M1: 无条件 single-shot 消费 nextListIsAnimated，
  // 防 RESHUFFLE 抛错或 cache 临时为空时 flag 跨调用泄漏（之前在空 cache 早 return
  // 后旁路了 flag reset，下一次非空 LIS 会意外走动画）
  const animated = previewState.nextListIsAnimated && shouldAnimateShop();
  previewState.nextListIsAnimated = false;
  if (previewState.descriptorCache.length === 0) {
    appendLine(t('shop.terminal.cmd.list.empty'), 'dim');
    appendBlank();
    return;
  }
  const HEADER = t('shop.terminal.cmd.list.header');
  const FOOTER = t('shop.terminal.cmd.list.footer', { n: previewState.descriptorCache.length });
  if (!animated) {
    appendLine(HEADER, 'head');
    appendLine('─────────────────────────────────────────────────────────────────────────────────────────────────────────');
    appendLine(renderListHeaderRow(), 'head list-row', true);
    appendLine('─────────────────────────────────────────────────────────────────────────────────────────────────────────');
    for (const d of previewState.descriptorCache) appendLine(renderListRow(d), `${classForRow(d)} list-row`.trim(), true);
    appendLine('─────────────────────────────────────────────────────────────────────────────────────────────────────────');
    appendLine(FOOTER, 'dim');
    appendBlank();
    return;
  }
  // 动画模式：每行 30ms 间隔逐行打出（仿点阵打印机走纸）
  const myCallId = ++previewState.listCallCounter;
  const lines: Array<{ text: string; cls: string; raw: boolean }> = [];
  lines.push({ text: HEADER, cls: 'head', raw: false });
  lines.push({ text: '─────────────────────────────────────────────────────────────────────────────────────────────────────────', cls: '', raw: false });
  lines.push({ text: renderListHeaderRow(), cls: 'head list-row', raw: true });
  lines.push({ text: '─────────────────────────────────────────────────────────────────────────────────────────────────────────', cls: '', raw: false });
  for (const d of previewState.descriptorCache) {
    lines.push({ text: renderListRow(d), cls: `${classForRow(d)} list-row`.trim(), raw: true });
  }
  lines.push({ text: '─────────────────────────────────────────────────────────────────────────────────────────────────────────', cls: '', raw: false });
  lines.push({ text: FOOTER, cls: 'dim', raw: false });
  lines.forEach((line, idx) => {
    setTimeout(() => {
      // 取消条件：用户已在动画期间触发新 cmdList（counter 变了）
      if (previewState.listCallCounter !== myCallId) return;
      appendLine(line.text, line.cls, line.raw);
      if (idx === lines.length - 1) appendBlank();
    }, idx * 30);
  });
}

/**
 * Story 60.10: INF 命令 dispatcher
 * 匹配优先级：catalog SKU → /OWNED 列表 → 单键位 → owned skill 模糊名 → owned relic id/name → suggestSku fallback
 */
export function cmdInfo(arg?: string): void {
  if (!arg) { appendLine(t('shop.terminal.cmd.usage.inf'), 'dim'); return; }
  const upper = arg.toUpperCase();

  // 1) /OWNED 子命令 — owned 资产列表
  if (upper === '/OWNED' || upper === '/LIST-OWNED') {
    cmdInfoListOwned();
    return;
  }

  // 2) catalog SKU 优先（保留现有路径，0 行为变化）
  const d = findDescriptorBySku(arg);
  if (d) {
    for (const line of renderInfoBlock(d)) appendLine(line, classForRow(d));
    appendBlank();
    return;
  }

  // 3) 单键位（a-z 或 1-0）
  if (/^[a-z0-9]$/i.test(arg)) {
    cmdInfoKey(arg);
    return;
  }

  // 4) owned skill 模糊名匹配
  const skillHits = findOwnedSkillsByFragment(arg);
  if (skillHits.length === 1) {
    cmdInfoOwnedSkill(skillHits[0]);
    return;
  }
  if (skillHits.length > 1) {
    cmdInfoMultiSkillHit(skillHits, arg);
    return;
  }

  // 5) owned relic id/name 匹配
  const relicHit = findOwnedRelicByQuery(arg);
  if (relicHit) {
    cmdInfoOwnedRelic(relicHit);
    return;
  }

  // 6) 全部 miss → 原 suggestSku fallback
  const guess = suggestSku(arg);
  appendLine(t('shop.terminal.err.not_found', { target: upper }), 'redacted');
  if (guess) appendLine(t('shop.terminal.cmd.info.did_you_mean', { guess }), 'dim');
  appendLine(t('shop.terminal.cmd.info.try_owned'), 'dim');
  appendBlank();
}

/** Story 60.10: 单键位查询 — a-z 查 binding，1-0 查 relic shelf */
function cmdInfoKey(rawKey: string): void {
  const key = rawKey.toLowerCase();
  if (/^[a-z]$/.test(key)) {
    const skillId = state.player.bindings.get(key);
    if (!skillId) {
      appendLine(t('shop.terminal.info.key.unbound', { key: key.toUpperCase(), gold: state.gold }), 'dim');
      appendBlank();
      return;
    }
    cmdInfoOwnedSkill(skillId);
    return;
  }
  // 数字键 1-0：1=index 0, 0=index 9（与 syncWorkbenchRelics 对齐）
  const num = Number(key);
  const idx = num === 0 ? 9 : num - 1;
  const relicIds = Array.from(state.player.relics);
  const relicId = relicIds[idx];
  if (!relicId) {
    appendLine(t('shop.terminal.info.key.no_relic', { key, gold: state.gold }), 'dim');
    appendBlank();
    return;
  }
  cmdInfoOwnedRelic(relicId);
}

/** Story 60.10: owned skill 模糊名匹配（在 bindings + inbox 集合内） */
function findOwnedSkillsByFragment(query: string): string[] {
  const q = query.toUpperCase();
  const ids = new Set<string>();
  for (const sid of state.player.bindings.values()) ids.add(sid);
  for (const sid of state.player.inbox) ids.add(sid);
  const hits: string[] = [];
  for (const id of ids) {
    const sk = state.affixSkills.get(id);
    if (!sk) continue;
    const name = (sk.name || '').toUpperCase();
    if (name.includes(q)) hits.push(id);
  }
  return hits;
}

/** Story 60.10: owned relic id/name 模糊匹配 */
function findOwnedRelicByQuery(query: string): string | null {
  const q = query.toUpperCase();
  for (const id of state.player.relics) {
    if (id.toUpperCase().includes(q)) return id;
    const data = RELICS[id];
    if (data && (data.name || '').toUpperCase().includes(q)) return id;
  }
  return null;
}

/** Story 60.10: owned skill 详情渲染 */
function cmdInfoOwnedSkill(skillId: string): void {
  const sk = state.affixSkills.get(skillId);
  if (!sk) {
    appendLine(t('shop.terminal.err.skill_missing', { sid: skillId }), 'redacted');
    appendBlank();
    return;
  }
  const W = 80;
  const rt = state.affixSkillStates.get(skillId);
  // 定位：哪个键 / 在 inbox slot N
  const boundKeys: string[] = [];
  for (const [k, sid] of state.player.bindings) if (sid === skillId) boundKeys.push(k.toUpperCase());
  const inboxIdx = state.player.inbox.indexOf(skillId);
  const location = boundKeys.length > 0
    ? t('shop.terminal.info.skill.location_key', { keys: boundKeys.join('+') })
    : (inboxIdx >= 0
        ? t('shop.terminal.info.skill.location_inbox', { idx: inboxIdx + 1, max: INBOX_MAX })
        : t('shop.terminal.info.skill.location_unassigned'));

  const headPrefix = t('shop.terminal.info.skill.owned_headline', { name: sk.name, location });
  const headLine = headPrefix + '═'.repeat(Math.max(3, W - sk.name.length - location.length - 16));
  appendLine(headLine, 'echo');
  const shapeId = sk.shapeId ?? 'monomino';
  appendLine(t('shop.terminal.info.skill.headline', { level: sk.level, shape: shapeId.toUpperCase() }), 'dim');

  let fields: ReturnType<typeof buildAffixTooltipFields> | null = null;
  try { fields = buildAffixTooltipFields(sk, rt); } catch { fields = null; }
  if (fields && fields.affixInfo.length > 0) {
    appendLine('');
    appendLine(t('shop.terminal.info.section.affixes'), 'head');
    for (const af of fields.affixInfo) {
      const hdr = `‹${(af.typeName || '?').toUpperCase()}›${af.paramSummary ? ' ' + af.paramSummary : ''}`;
      for (const w of wrapAt(hdr, W - 4)) appendLine('  ' + w);
      const taxon = af.typeKey ? AFFIX_TAXA[af.typeKey] : null;
      if (taxon) appendLine(`    ${taxon.latin} · ${taxon.code}`, 'dim');
      if (af.description) {
        for (const w of wrapAt(af.description, W - 6)) appendLine('    ' + w, 'dim');
      }
    }
  }
  if (fields && fields.enchantments.length > 0) {
    appendLine('');
    appendLine(t('shop.terminal.info.section.enchantments'), 'head');
    for (const e of fields.enchantments) {
      const hdr = `‹${(e.name || '?').toUpperCase()}›`;
      for (const w of wrapAt(hdr, W - 4)) appendLine('  ' + w);
      if (e.desc) {
        for (const w of wrapAt(e.desc, W - 6)) appendLine('    ' + w, 'dim');
      }
    }
  }
  if (fields && fields.questProgress) appendLine(t('shop.terminal.info.skill.quest_label', { progress: fields.questProgress }), 'dim');
  if (fields && fields.apprenticeGrowth) appendLine(t('shop.terminal.info.skill.apprentice_label', { growth: fields.apprenticeGrowth }), 'dim');
  appendLine('═'.repeat(W));
  appendBlank();
}

/** Story 60.10: owned relic 详情渲染 */
function cmdInfoOwnedRelic(relicId: string): void {
  const data = RELICS[relicId];
  if (!data) {
    appendLine(t('shop.terminal.err.relic_missing', { rid: relicId }), 'redacted');
    appendBlank();
    return;
  }
  const W = 80;
  // 数字键位定位
  const idx = Array.from(state.player.relics).indexOf(relicId);
  const numKey = idx < 0 ? '?' : (idx === 9 ? '0' : String(idx + 1));
  const headPrefix = t('shop.terminal.info.relic.owned_headline', { icon: data.icon, name: data.name, key: numKey });
  const headLine = headPrefix + '═'.repeat(Math.max(3, W - data.name.length - 28));
  appendLine(headLine, 'echo');
  appendLine(t('shop.terminal.info.relic.rarity_label', { rarity: data.rarity.toUpperCase(), rid: relicId }), 'dim');
  appendLine('');
  for (const w of wrapAt(data.description, W - 4)) appendLine('  ' + w);
  if (data.flavor) {
    appendLine('');
    for (const w of wrapAt(data.flavor, W - 4)) appendLine('  ' + w, 'dim');
  }
  appendLine('═'.repeat(W));
  appendBlank();
}

/** Story 60.10: 模糊名多命中候选列表 */
function cmdInfoMultiSkillHit(skillIds: string[], query: string): void {
  appendLine(t('shop.terminal.cmd.info.multi_match_header', { query: query.toUpperCase(), n: skillIds.length }), 'head');
  for (const sid of skillIds) {
    const sk = state.affixSkills.get(sid);
    if (!sk) continue;
    let loc = '—';
    for (const [k, s] of state.player.bindings) {
      if (s === sid) { loc = t('shop.terminal.cmd.info.multi_match_loc_key', { key: k.toUpperCase() }); break; }
    }
    if (loc === '—' && state.player.inbox.includes(sid)) loc = t('shop.terminal.cmd.info.multi_match_loc_inbox');
    appendLine(t('shop.terminal.cmd.info.multi_match_row', { name: sk.name, loc, level: sk.level }));
  }
  appendLine(t('shop.terminal.cmd.info.refine_query'), 'dim');
  appendBlank();
}

/** Story 60.10: /OWNED 列表 — 全部 owned skills + relics */
function cmdInfoListOwned(): void {
  const W = 80;
  appendLine('═'.repeat(W) + t('shop.terminal.cmd.info.owned_assets'), 'head');

  // Story 60.20 review M1 fix: 与 syncFiledFolders 共用 shopState.getOwnedSkillEntries
  // 算法（多格 sid 去重 + bound 排序 + inbox 顺序追加）—— 双份实现已合并。
  const skillEntries = getOwnedSkillEntries();
  appendLine(t('shop.terminal.info.section.skills'), 'head');
  if (skillEntries.length === 0) {
    appendLine(t('shop.terminal.cmd.info.empty'), 'dim');
  } else {
    for (const { key, sid } of skillEntries) {
      const sk = state.affixSkills.get(sid);
      if (!sk) continue;
      const shape = (sk.shapeId ?? 'monomino').toUpperCase();
      appendLine(t('shop.terminal.cmd.info.skill_row', {
        key: key.padEnd(8),
        name: sk.name.padEnd(28),
        level: sk.level,
        shape,
      }));
    }
  }

  // RELICS
  appendLine('');
  appendLine(t('shop.terminal.info.section.relics'), 'head');
  const relicIds = Array.from(state.player.relics);
  if (relicIds.length === 0) {
    appendLine(t('shop.terminal.cmd.info.empty'), 'dim');
  } else {
    for (let i = 0; i < relicIds.length; i++) {
      const id = relicIds[i];
      const data = RELICS[id];
      if (!data) continue;
      const numKey = i === 9 ? '0' : String(i + 1);
      appendLine(t('shop.terminal.cmd.info.relic_row', { key: numKey, icon: data.icon, name: data.name }));
    }
  }
  appendLine('═'.repeat(W));
  appendBlank();
}

function executeBuy(d: ItemDescriptor): void {
  if (state.gold < d.price) {
    sfx('shop_buy_err'); // Story 60.12: 拨号忙音 — 余额不足
    appendLine(t('shop.terminal.err.insufficient_funds', { gold: state.gold, price: d.price }), 'redacted');
    appendLine(t('shop.terminal.err.appeal_form'), 'dim');
    appendBlank();
    return;
  }
  if (d.kind === 'skill') return executeBuySkill(d);
  if (d.kind === 'pack') return executeBuyPack(d);
  if (d.kind === 'relic') return executeBuyRelic(d);
  sfx('shop_buy_err');
  appendLine(t('shop.terminal.err.purchase_not_wired', { kind: d.kind.toUpperCase() }), 'redacted');
  appendBlank();
}

export function executeBuySkill(d: ItemDescriptor): void {
  if (state.player.inbox.length >= INBOX_MAX) {
    sfx('shop_buy_err'); // Story 60.12: inbox 满
    appendLine(t('shop.terminal.err.intray_full', { n: INBOX_MAX, max: INBOX_MAX }), 'redacted');
    appendBlank();
    return;
  }
  const skill = d.originalItem.affixSkill;
  if (!skill) {
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.no_skill_data'), 'redacted');
    appendBlank();
    return;
  }
  const skillId = d.originalItem.skillId ?? skill.id;
  const itemIdx = state.shop.items.indexOf(d.originalItem);
  state.gold -= d.price;
  // Story 60.7 review M1: deep-clone affixSkill 隔离 catalog 引用，
  // 防 BUY → UND → BUY 双重 affix 缩放（applyMaxSkillLevelOnPurchase 在 affixes 上 in-place mutate）
  const skillCopy = structuredClone(skill);
  state.affixSkills.set(skillId, skillCopy);
  state.player.skills.set(skillId, { level: skillCopy.level });
  state.player.inbox.push(skillId);
  d.purchased = true;
  previewState.purchasedSkus.add(d.sku);
  previewState.undoStack.push({ kind: 'skill', sku: d.sku, price: d.price, skillId, itemIdx });
  // Story 60.7: 副作用闭合 — T4 max_skill_level 自动满级 + 装备 quest 重算 + 教程监听事件
  applyMaxSkillLevelOnPurchase(skillId);
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId, price: d.price });
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  appendLine(t('shop.terminal.cmd.buy.dispatched_intray', { n: state.player.inbox.length, max: INBOX_MAX, gold: state.gold }), 'dim');
  appendLine(t('shop.terminal.cmd.buy.undo_stack_pending', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchInbox();
  sfx('shop_buy_ok'); // Story 60.12: 点阵打印机 zip — BUY skill 成功
  // Story 60.11: BUY 成功 → IN-tray 对应槽 whoosh 滑入 + 闪光（仅成功路径）
  shopBus.triggerInboxWhoosh(state.player.inbox.length - 1);
}

export function executeBuyPack(d: ItemDescriptor): void {
  const pack = d.originalItem.pack;
  if (!pack || pack.words.length === 0) {
    appendLine(t('shop.terminal.err.pack_no_words'), 'redacted');
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
  d.purchased = true;
  previewState.purchasedSkus.add(d.sku);
  previewState.undoStack.push({ kind: 'pack', sku: d.sku, price: d.price, words: [word] });
  // Story 60.8: pack 购入事件（教程 L1_drawer_words 触发依赖）
  eventBus.emit('shop:purchase', { type: 'pack', itemId: d.sku, price: d.price });
  sfx('shop_buy_ok'); // Story 60.12
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  appendLine(t('shop.terminal.cmd.buy.pack_word_filed', { word: word.toUpperCase(), gold: state.gold }), 'dim');
  appendLine(t('shop.terminal.cmd.buy.undo_stack', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchKeys(); // wordDeck 变化 → 字母键 freq-lock 重算
}

function executeBuyPackPicker(d: ItemDescriptor, pack: WordPack): void {
  // M3 fix: 多 drawer 互斥 — 拒绝在其他 drawer 打开时弹 pack-pick
  if (previewState.drawerOpen && previewState.drawerOpen !== 'pack-pick') {
    appendLine(t('shop.terminal.err.drawer_open', { kind: previewState.drawerOpen.toUpperCase() }), 'redacted');
    appendBlank();
    return;
  }
  previewState.pendingPackPick = { d, pack };
  appendLine(t('shop.terminal.cmd.buy.pack_candidates_posted', { sku: d.sku, n: pack.words.length }), 'echo');
  appendBlank();
  if (previewState.currentScreen !== 'workbench') shopBus.showOnly('workbench');
  shopBus.openDrawer('pack-pick');
}

// Story 60.2: pack 选词成功 → 扣钱、入库、入栈、打印、关 drawer
export function finalizePackPick(pickedWord: string): void {
  if (!previewState.pendingPackPick) return;
  const { d, pack } = previewState.pendingPackPick;
  state.gold -= d.price;
  state.player.wordDeck.push(pickedWord);
  if (pack.wordEffect && state.classId !== 'wordsmith') {
    state.wordEffects.set(pickedWord, pack.wordEffect);
  }
  d.purchased = true;
  previewState.purchasedSkus.add(d.sku);
  previewState.undoStack.push({ kind: 'pack', sku: d.sku, price: d.price, words: [pickedWord] });
  // Story 60.8: pack 购入事件（教程 L1_drawer_words 触发依赖）
  eventBus.emit('shop:purchase', { type: 'pack', itemId: d.sku, price: d.price });
  sfx('shop_buy_ok'); // Story 60.12
  previewState.pendingPackPick = null;
  shopBus.closeDrawer();
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  appendLine(t('shop.terminal.cmd.buy.pack_word_filed', { word: pickedWord.toUpperCase(), gold: state.gold }), 'dim');
  appendLine(t('shop.terminal.cmd.buy.undo_stack', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchKeys(); // wordDeck 变化 → 字母键 freq-lock 重算
  // M1 fix: 切回终端，让 CONFIRMED / WORD FILED 消息可见
  shopBus.showOnly('terminal');
}

// Story 60.2: 取消（ESC / overlay 点击 / drawer 关闭）— 不动 state
export function cancelPackPick(): void {
  if (!previewState.pendingPackPick) return;
  const sku = previewState.pendingPackPick.d.sku;
  previewState.pendingPackPick = null;
  appendLine(t('shop.terminal.cmd.buy.aborted', { sku }), 'dim');
  appendBlank();
  // M1 fix: 切回终端，让 ABORTED 消息可见
  shopBus.showOnly('terminal');
}

export function executeBuyRelic(d: ItemDescriptor): void {
  const relicId = d.originalItem.relicId;
  if (!relicId) {
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.relic_no_id'), 'redacted');
    appendBlank();
    return;
  }
  if (state.player.relics.has(relicId)) {
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.relic_owned', { rid: relicId.toUpperCase() }), 'redacted');
    appendBlank();
    return;
  }
  if (isRelicSlotsFull()) {
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.relic_slots_full'), 'redacted');
    appendBlank();
    return;
  }
  state.gold -= d.price;
  const ok = addRelicWithCapacity(relicId);
  if (!ok) {
    state.gold += d.price;
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.relic_add_failed'), 'redacted');
    appendBlank();
    return;
  }
  // Story 60.7: 遗物购入瞬时副作用（与 classic shop.ts:2618-2627 对齐）
  if (relicId === 'd_100') rerollAllAffixes();
  if (relicId === 'universal_furnace') initFurnace(random);
  eventBus.emit('shop:purchase', { type: 'relic', itemId: relicId, price: d.price });
  sfx('shop_buy_ok'); // Story 60.12
  d.purchased = true;
  previewState.purchasedSkus.add(d.sku);
  previewState.undoStack.push({ kind: 'relic', sku: d.sku, price: d.price, relicId });
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  appendLine(t('shop.terminal.cmd.buy.relic_shelved', { gold: state.gold }), 'dim');
  appendLine(t('shop.terminal.cmd.buy.undo_stack', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchRelics();
  shopBus.syncWorkbenchKeys(); // punctuation_liberation 等遗物影响 freq-lock
}

export function cmdBuy(arg?: string): void {
  if (!arg) { appendLine(t('shop.terminal.cmd.usage.buy'), 'dim'); return; }
  const d = findDescriptorBySku(arg);
  if (!d) {
    sfx('shop_buy_err'); // Story 60.12: SKU 不存在
    const guess = suggestSku(arg);
    appendLine(t('shop.terminal.err.sku_not_in_catalog', { sku: arg.toUpperCase() }), 'redacted');
    if (guess) appendLine(t('shop.terminal.cmd.info.did_you_mean', { guess }), 'dim');
    appendBlank();
    return;
  }
  if (d.purchased) {
    sfx('shop_buy_err');
    appendLine(t('shop.terminal.err.already_sold', { sku: d.sku }), 'redacted');
    appendBlank();
    return;
  }
  if (d.redacted) {
    sfx('shop_buy_err'); // Story 60.12: clearance 不足
    appendLine(t('shop.terminal.err.clearance_required', { clearance: d.clearance }), 'redacted');
    appendBlank();
    return;
  }
  if (d.price >= HIGH_PRICE_THRESHOLD) {
    previewState.pendingConfirm = { sku: d.sku, price: d.price };
    appendLine(t('shop.terminal.cmd.buy.confirm_purchase', { name: d.name, price: d.price }), 'head');
    appendLine(t('shop.terminal.cmd.buy.bal_after', { gold: state.gold - d.price }), 'dim');
    return;
  }
  executeBuy(d);
}

export function cmdSell(arg?: string): void {
  if (!arg) { appendLine(t('shop.terminal.cmd.usage.sell'), 'dim'); return; }
  const target = arg.toUpperCase();
  // SEL operates on inbox items by SKU
  const undoIdx = previewState.undoStack.findIndex(u => u.sku === target);
  if (undoIdx < 0) {
    appendLine(t('shop.terminal.err.not_in_intray', { target }), 'redacted');
    appendLine(t('shop.terminal.cmd.sell.intray_only'), 'dim');
    appendBlank();
    return;
  }
  const entry = previewState.undoStack[undoIdx];
  if (entry.kind !== 'skill') {
    appendLine(t('shop.terminal.err.sell_not_skill'), 'redacted');
    appendBlank();
    return;
  }
  const refund = Math.floor(entry.price * 0.5);
  const inboxIdx = state.player.inbox.lastIndexOf(entry.skillId);
  if (inboxIdx >= 0) state.player.inbox.splice(inboxIdx, 1);
  state.player.skills.delete(entry.skillId);
  state.affixSkills.delete(entry.skillId);
  previewState.undoStack.splice(undoIdx, 1);
  state.gold += refund;
  // Story 60.7: 卖出后 quest 重算（装备型 quest 跟上 inbox 变化）
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  appendLine(t('shop.terminal.cmd.sell.refunded', { target, refund }), 'echo');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchInbox();
}

export function cmdReshuffle(): void {
  const cost = 18;
  if (state.gold < cost) {
    appendLine(t('shop.terminal.err.reshuffle_funds', { cost }), 'redacted');
    appendBlank();
    return;
  }
  state.gold -= cost;
  let success = false;
  try {
    const items: ShopItem[] = [
      ...generateAffixShopItems(3),
      ...generateShopPackItems(2),
    ];
    const relic = generateShopRelicItem(1);
    if (relic) items.push(relic);
    if (items.length === 0) {
      throw new Error('generator returned empty list');
    }
    state.shop.items = items;
    rebuildDescriptors();
    success = true;
    appendLine(t('shop.terminal.cmd.reshuffle.success', { cost }), 'echo');
  } catch (err) {
    // Story 60.18 dogfood: generator 抛错 → 退还 gold（避免"扣钱不刷新"）+ console 留诊断
    state.gold += cost;
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[cmdReshuffle] generator failed, refunded:', err);
    }
    appendLine(t('shop.terminal.err.reshuffle_unavailable', { cost }), 'redacted');
  }
  appendBlank();
  updateTerminalChrome();
  // Story 60.11: 标记下次 LIS 走逐行 print 动画
  previewState.nextListIsAnimated = true;
  // Story 60.18 dogfood: RES 成功后立即 cmdList 让玩家看到新 inventory（不再依赖
  // 玩家手动 LIS 才知道是否真刷新；之前"扣钱不刷新"的 root cause 部分是玩家
  // 没意识到要再 LIS）
  if (success) cmdList();
}

export function cmdProceed(): void {
  appendLine(t('shop.terminal.cmd.proceed.success', { n: previewState.undoStack.length }), 'echo');
  appendBlank();
  shopBus.switchToWorkbench();
}

export function cmdUndo(): void {
  if (previewState.workbenchEntered) {
    appendLine(t('shop.terminal.err.undo_locked'), 'redacted');
    appendBlank();
    return;
  }
  const last = previewState.undoStack.pop();
  if (!last) {
    appendLine(t('shop.terminal.cmd.undo.empty'), 'dim');
    appendBlank();
    return;
  }
  if (last.kind === 'skill') {
    const idx = state.player.inbox.lastIndexOf(last.skillId);
    if (idx >= 0) state.player.inbox.splice(idx, 1);
    state.player.skills.delete(last.skillId);
    state.affixSkills.delete(last.skillId);
    shopBus.syncWorkbenchInbox();
    // Story 60.7: UND 撤销技能购买后 quest 重算
    evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  } else if (last.kind === 'pack') {
    // Remove from end (matching insertion order)
    for (const w of last.words) {
      const i = state.player.wordDeck.lastIndexOf(w);
      if (i >= 0) state.player.wordDeck.splice(i, 1);
    }
    shopBus.syncWorkbenchKeys(); // wordDeck 缩了 → freq-lock 重算
  } else if (last.kind === 'relic') {
    removeRelic(last.relicId);
    shopBus.syncWorkbenchRelics();
    shopBus.syncWorkbenchKeys(); // 撤销 punctuation_liberation 等会改 freq-lock
  }
  state.gold += last.price;
  previewState.purchasedSkus.delete(last.sku);
  const restored = findDescriptorBySku(last.sku);
  if (restored) restored.purchased = false;
  appendLine(t('shop.terminal.cmd.undo.success', { sku: last.sku, price: last.price, gold: state.gold }), 'echo');
  appendBlank();
  updateTerminalChrome();
}

// === Story 60.19: STAT 命令真实数据接入（letterFreqs / wordEffects） ===
const STATS_TOP_N = 10;
const STATS_BAR_WIDTH = 20;

export function cmdStats(): void {
  const batchPos = getPositionInCycle(state.level || 1);
  const batchLabel = `${String(batchPos).padStart(2, '0')}/${BALANCE.CYCLE_LENGTH}`;
  appendLine(t('shop.terminal.cmd.stats.title', { batch: batchLabel }), 'head');

  const letterFreqs = calculateLetterFrequency(state.player.wordDeck);
  const letterScores = calculateLetterScores(state.wordEffects);

  // 兜底：词库为空（首关入店）
  if (letterFreqs.size === 0) {
    appendLine(t('shop.terminal.cmd.stats.no_activity'), 'dim');
    appendLine(t('shop.terminal.cmd.stats.footer'), 'dim');
    appendBlank();
    return;
  }

  // 收集所有"上榜键"：进 freq 表的键 ∪ 有 score 的键
  const allKeys = new Set<string>();
  for (const k of letterFreqs.keys()) allKeys.add(k);
  for (const k of letterScores.keys()) allKeys.add(k);

  type Row = { key: string; freq: number; score: number; locked: boolean };
  const rows: Row[] = [];
  let maxFreq = 0;
  for (const k of allKeys) {
    const freq = letterFreqs.get(k) ?? 0;
    const score = letterScores.get(k) ?? 0;
    const isPunctKey = PUNCTUATION_KEYS.includes(k);
    const locked = freq < FREQ_UNLOCK_THRESHOLD && !isPunctKey;
    if (freq > maxFreq) maxFreq = freq;
    rows.push({ key: k, freq, score, locked });
  }

  // freq 降序，相同 freq 按字母 a→z（避免 score 顺序导致视觉抖动）
  rows.sort((a, b) => b.freq - a.freq || a.key.localeCompare(b.key));

  // 列头：KEY | BAR | FREQ | SCORE
  appendLine(t('shop.terminal.cmd.stats.col_header'));
  const top = rows.slice(0, STATS_TOP_N);
  for (const row of top) {
    const barLen = maxFreq > 0 ? Math.round((row.freq / maxFreq) * STATS_BAR_WIDTH) : 0;
    const bar = '█'.repeat(barLen).padEnd(STATS_BAR_WIDTH, ' ');
    const keyDisplay = row.key.toUpperCase().padEnd(2, ' ');
    const freqStr = String(row.freq).padStart(4, ' ');
    const scoreStr = (row.score > 0 ? `+${row.score}` : String(row.score)).padStart(5, ' ');
    const lockTag = row.locked ? `  ${t('shop.terminal.cmd.stats.locked')}` : '';
    const line = `  ${keyDisplay} ${bar} ${freqStr} ${scoreStr}${lockTag}`;
    appendLine(line, row.locked ? 'redacted' : '');
  }

  appendBlank();

  // TOP CONTRIBUTOR：综合贡献 freq × (1 + max(0, score))，占总和 pct
  const contribOf = (r: Row) => r.freq * (1 + Math.max(0, r.score));
  const totalContrib = rows.reduce((s, r) => s + contribOf(r), 0);
  if (totalContrib > 0) {
    const top1 = rows.slice().sort((a, b) => contribOf(b) - contribOf(a))[0];
    const pct = Math.round((contribOf(top1) / totalContrib) * 100);
    appendLine(
      t('shop.terminal.cmd.stats.top_contributor', { key: top1.key.toUpperCase(), pct }),
      'echo',
    );
  }

  // WEAKEST KEY：freq 最低的非标点键（且 freq>0），若全部锁定则取最低 freq
  const nonPunct = rows.filter(r => !PUNCTUATION_KEYS.includes(r.key));
  if (nonPunct.length > 0) {
    const weakest = nonPunct.slice().sort((a, b) => a.freq - b.freq || a.key.localeCompare(b.key))[0];
    const lockTag = weakest.locked ? ` ${t('shop.terminal.cmd.stats.locked')}` : '';
    appendLine(
      t('shop.terminal.cmd.stats.weakest_key', { key: weakest.key.toUpperCase() }) + lockTag,
      weakest.locked ? 'redacted' : '',
    );
  }

  appendLine(t('shop.terminal.cmd.stats.footer'), 'dim');
  appendBlank();
}

export function cmdWords(): void {
  appendLine(t('shop.terminal.cmd.opening_words'), 'echo');
  appendBlank();
  // ensure on workbench so drawer is visible
  if (previewState.currentScreen !== 'workbench') shopBus.showOnly('workbench');
  shopBus.openDrawer('words');
}

// === Confirmation handler ===

export function handleConfirmation(input: string): boolean {
  if (!previewState.pendingConfirm) return false;
  const up = input.trim().toUpperCase();
  if (up === 'Y' || up === 'YES') {
    const d = findDescriptorBySku(previewState.pendingConfirm.sku);
    previewState.pendingConfirm = null;
    if (d) executeBuy(d);
    return true;
  }
  if (up === 'N' || up === 'NO') {
    appendLine(t('shop.terminal.cmd.buy.aborted', { sku: previewState.pendingConfirm.sku }), 'dim');
    appendBlank();
    previewState.pendingConfirm = null;
    return true;
  }
  appendLine(t('shop.terminal.err.confirm_yn', { input }), 'redacted');
  return true; // still in confirm mode
}

/**
 * Bootstrap 调用：注册 terminal-provided 函数到 shopBus，让 workbench drawer 能拨号。
 */
export function registerTerminalBindings(): void {
  shopBus.appendLine = appendLine;
  shopBus.finalizePackPick = finalizePackPick;
  shopBus.cancelPackPick = cancelPackPick;
}
