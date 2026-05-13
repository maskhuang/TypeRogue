// ============================================
// Shop Preview · Terminal Module (Story 60.16)
// ============================================
// 终端命令解析 + 渲染 + 描述符 + banner / 状态栏 + 商品种子。
// 拆自原 shopPreview.ts；workbench / bootstrap 通过 shopBus 协调。
// ============================================

import { state, addRelicWithCapacity, removeRelic, isRelicSlotsFull } from '../../core/state';
import { INBOX_MAX, BALANCE, RESOURCE_ICONS } from '../../core/constants';
import { calculateRating } from '../../effects/juice';
import type { ResourceType } from '../../core/types';
import { getActiveResources } from '../../systems/classes/ClassResourceFilter';
import {
  generateAffixShopItems,
  generateShopRelicItem,
  buildAffixTooltipFields,
  applyMaxSkillLevelOnPurchase,
  calculateAffixSkillPrice,
} from '../../systems/shop';
import { getRecycleSellMultiplier } from '../../systems/relics/ShopRelicBehaviors';
import { shouldAnimateShop } from '../../core/UserSettings';
// Story 60.7: 副作用 hook（事件总线 + quest 重算 + 遗物购入瞬时效果）
import { eventBus } from '../../core/events/EventBus';
import { evaluateEquipQuests } from '../../data/affixTrigger';
import { getSectionName, type SectionTag } from '../../data/affixTags';
import { getQuestEquipReduction } from '../../systems/relics/EnchantmentRelicBehaviors';
import { rerollAllAffixes } from '../../systems/relics/SkillRelicBehaviors';
import { initFurnace } from '../../systems/relics/ResourceRelicBehaviors';
import { random } from '../../core/seededRandom';
import { generateWordPacks } from '../../data/wordPacks';
import { calculateLetterFrequency } from '../../systems/letters/LetterFrequencySystem';
import { getBattleNumber, getPositionInCycle, getStageType, getNextBattleNode } from '../../systems/stage/stageFlow';
import { STAGE_ICONS } from '../../systems/actTransition';
import { t, localizeItemName, localizeItemDesc, localizeItemFlavor } from '../../demo/demo-i18n';
import type { ShopItem, WordPack } from '../../core/types';
import type { StageType } from '../../systems/stage/StageConfig';
import { describeAllShopItems, type ItemDescriptor } from '../itemDescriptors';
import { RELICS } from '../../data/relics';
import {
  previewState,
  shopBus,
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
  const content = `  CLERK ID: 7842    ${cyclePrefix}FILE ${fileNum}    BATCH ${String(batchPos).padStart(2, '0')}/${cycleLength}    A${ascension}`;
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

/** STAGE 字段：从 actTransition.STAGE_ICONS 单一真相源读 emoji
 * 注意 shop 处于"刚结束 N、即将进 N+1"的间隙，state.level 此时仍是 N。
 * 显示"下一关 type"对玩家决策才有意义（要为 boss/elite 备货 vs 普通），
 * 所以传入的 level 在 chrome 调用处会先 getNextBattleNode 一次。 */
export function getStageIcon(level: number): string {
  const safeLevel = level > 0 ? level : 1;
  // STAGE_ICONS 4 键覆盖 4 种 stageType；getStageType 返回 StageType 保证 lookup 命中
  return STAGE_ICONS[getStageType(safeLevel)];
}

function updateBalDisplay(): void {
  const el = document.querySelector('#terminal-shop-screen .ts-cell .bal');
  if (el) el.innerHTML = `<span class="bna">💰</span> ${state.gold}`;
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

  // BAL（沿用 innerHTML 因为含 <span class="bna">💰</span>）
  updateBalDisplay();

  // FORM
  const formEm = root.querySelector('[data-field="form"] em');
  if (formEm) formEm.textContent = getFormLabel(state.level);

  // CLR
  const clrEm = root.querySelector('[data-field="clr"] em');
  if (clrEm) clrEm.textContent = getClrLabel(state.level);

  // STAGE — 显示下一关 type（决策语义；shop 在 N 与 N+1 之间，state.level=N）
  const stageEm = root.querySelector('[data-field="stage"] em');
  if (stageEm) stageEm.textContent = getStageIcon(getNextBattleNode(state.level));

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
    `<span class="lst-cell lst-price"><span class="bna">💰</span> ${escapeHtml(priceStr)}</span>`,
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

/** INF 块宽度 — header / footer 横线长度，affix wrap 上限 */
const INF_BLOCK_WIDTH = 80;

/**
 * INF 信息分四层 / 像不同密级看到不同信息：
 *   Tier 1  无职业（baseline，所有玩家可见）
 *   Tier 2  造词师（state.classId === 'wordsmith'）
 *   Tier 3  蜕变师（state.classId === 'metamorph'）
 *   Tier 4  无尽模式（state.cycle ≥ 2）
 * 当前状态可叠加（造词师 + 无尽 → 看 1 + 2 + 4），与"附加权限"语义一致。
 *
 * 内容当前只填了 Tier 1，2~4 是空 stub —— 等具体叙事 / 数据规则定下来再灌。
 * 顶端 ═══ header 在 Tier 1 内部，底端 ═══ footer 由外层 renderInfoBlock 收尾。
 */
function buildInfTier1Base(d: ItemDescriptor): string[] {
  const W = INF_BLOCK_WIDTH;
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
        // Section tag 前置括号（详 affix-rewrite-tag-system.md §9）
        const sectionPrefix = af.section ? `[${getSectionName(af.section as SectionTag).toUpperCase()}] ` : '';
        const hdr = `${sectionPrefix}‹${(af.typeName || '?').toUpperCase()}›${af.paramSummary ? ' ' + af.paramSummary : ''}`;
        for (const w of wrapAt(hdr, W - 4)) lines.push('  ' + w);
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
    // .t-line 是 white-space: pre — 这里不 wrapAt 长 flavor / desc 会一行铺到底
    lines.push('');
    for (const w of wrapAt(d.desc, W - 4)) lines.push('  ' + w);
    if (d.effect && d.effect !== '—') {
      for (const w of wrapAt(d.effect, W - 4)) lines.push('  ' + w);
    }
    if (d.affixLine !== '—') lines.push(t('shop.terminal.info.catalog.affix_line', { affix: d.affixLine }));
  }

  lines.push('');
  lines.push(d.kind === 'skill'
    ? t('shop.terminal.info.catalog.syn_skill', { n: d.synergyCount })
    : t('shop.terminal.info.catalog.syn_other', { n: d.synergyCount }));
  return lines;
}

/** Tier 2 · 造词师附加段 — 内容待填（叙事 / 字母频率 / 词库相关数据） */
function buildInfTier2Wordsmith(_d: ItemDescriptor): string[] {
  return [];
}

/** Tier 3 · 蜕变师附加段 — 内容待填（叙事 / 质变 / mutagen 相关数据） */
function buildInfTier3Metamorph(_d: ItemDescriptor): string[] {
  return [];
}

/** Tier 4 · 无尽模式附加段 — 内容待填（叙事 / cycle scaling / 污染症候相关数据） */
function buildInfTier4Endless(_d: ItemDescriptor): string[] {
  return [];
}

/**
 * INF 输出 = Tier 1 baseline + 当前权限可见的附加段 + footer。
 * 多个状态可同时激活（如造词师 + 无尽 → Tier 1 + 2 + 4 都呈现）。
 */
function renderInfoBlock(d: ItemDescriptor): string[] {
  const lines: string[] = [];
  lines.push(...buildInfTier1Base(d));
  if (state.classId === 'wordsmith') lines.push(...buildInfTier2Wordsmith(d));
  if (state.classId === 'metamorph') lines.push(...buildInfTier3Metamorph(d));
  if ((state.cycle ?? 1) >= 2) lines.push(...buildInfTier4Endless(d));
  lines.push('═'.repeat(INF_BLOCK_WIDTH));
  return lines;
}

// === Output to viewport ===

/** 把 plain text 里的 emoji / shape / syn sentinel 转成 dossier 内可用 HTML 片段。 */
function escapeAndDecorateLine(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/💰/g, '<span class="bna">💰</span>');
  html = html.replace(/§T([A-Z]+)\|(\[[^\]]+\])§/g, (_m, color, tag) => {
    return `<span class="t-shape t-shape-${(color as string).toLowerCase()}">${tag}</span>`;
  });
  html = html.replace(/§Y(\d+)§/g, (_m, n) => {
    const v = Number(n);
    const cls2 = v > 0 ? 't-syn t-syn-hit' : 't-syn t-syn-zero';
    return `<span class="${cls2}">[SYN:${v}]</span>`;
  });
  return html;
}

/**
 * Browse mode 退出：把活动 panel 解包进 scrollback。
 *   - 模式条直接丢弃（它是交互 UI，scrollback 里没意义）
 *   - list-pane 内每行 + dossier-pane 内每行 → 保持原 .t-line 样式直接挪到 viewport
 *   - 选中高亮去掉，DOM ref / size 清零（让 ↑↓ 检测失败 → fallback 到 history）
 *   - selectedSku 字符串保留，给下次 cmdList 的"延续选中"用
 * 任何走 appendLine 的输出在写入前都会先 freeze，对外语义=teletype 持续走纸。
 */
export function freezeBrowsePanel(): void {
  const panel = previewState.browsePanelEl;
  if (!panel) return;
  const vp = document.getElementById('terminal-viewport');
  if (!vp || !panel.parentNode) {
    previewState.browsePanelEl = null;
    previewState.lastListRowsBySku = new Map();
    return;
  }
  panel.querySelector('.browse-mode-bar')?.remove();
  const listPane = panel.querySelector('.browse-list');
  const dossierPane = panel.querySelector('.browse-dossier');
  if (listPane) {
    while (listPane.firstChild) {
      const child = listPane.firstChild;
      if (child instanceof HTMLElement) child.classList.remove('list-row-selected');
      vp.insertBefore(child, panel);
    }
  }
  if (dossierPane) {
    while (dossierPane.firstChild) vp.insertBefore(dossierPane.firstChild, panel);
  }
  panel.remove();
  previewState.browsePanelEl = null;
  previewState.lastListRowsBySku = new Map();
}

export function appendLine(text: string, cls = '', raw = false): void {
  // 任何 scrollback 输出 → 退出 browse mode（teletype 走纸语义）
  freezeBrowsePanel();
  const vp = document.getElementById('terminal-viewport');
  if (!vp) return;
  const div = document.createElement('div');
  div.className = `t-line ${cls}`.trim();
  if (raw) {
    div.innerHTML = text;
  } else {
    div.innerHTML = escapeAndDecorateLine(text);
  }
  vp.appendChild(div);
  vp.scrollTop = vp.scrollHeight;
}

/**
 * 切换选中 SKU：
 *   - 老选中行去 .list-row-selected
 *   - 新选中行加 .list-row-selected
 *   - 把 INF 块渲染进 panel 的 .browse-dossier
 *   - 仅在 browsePanelEl 活动时生效；冻结后调用是 no-op（lastListRowsBySku 已清）
 */
export function setSelectedSku(sku: string | null): void {
  const prev = previewState.selectedSku;
  if (prev && prev !== sku) {
    const prevEl = previewState.lastListRowsBySku.get(prev);
    if (prevEl) prevEl.classList.remove('list-row-selected');
  }
  previewState.selectedSku = sku;
  if (sku) {
    const el = previewState.lastListRowsBySku.get(sku);
    if (el) el.classList.add('list-row-selected');
  }
  const panel = previewState.browsePanelEl;
  if (!panel) return;
  const dossier = panel.querySelector<HTMLElement>('.browse-dossier');
  if (!dossier) return;
  const d = sku ? previewState.descriptorCache.find(x => x.sku === sku) : null;
  if (!d) { dossier.innerHTML = ''; return; }
  const cls = `t-line ${classForRow(d)}`.trim();
  const lines = renderInfoBlock(d);
  dossier.innerHTML = lines
    .map(line => `<div class="${cls}">${escapeAndDecorateLine(line)}</div>`)
    .join('');
}

/** ↑↓ 在当前 descriptorCache 中循环移动选中。返回是否消费该按键。 */
export function navSelection(delta: number): boolean {
  const cache = previewState.descriptorCache;
  if (cache.length === 0 || previewState.lastListRowsBySku.size === 0) return false;
  let idx = previewState.selectedSku
    ? cache.findIndex(d => d.sku === previewState.selectedSku)
    : -1;
  if (idx < 0) idx = delta > 0 ? -1 : 0;
  let next = idx + delta;
  if (next < 0) next = cache.length - 1;
  if (next >= cache.length) next = 0;
  const nextSku = cache[next].sku;
  setSelectedSku(nextSku);
  const el = previewState.lastListRowsBySku.get(nextSku);
  if (el) el.scrollIntoView({ block: 'nearest' });
  return true;
}

/**
 * cmdList 完成后选中策略：
 *   1. 若上次选中的 SKU 仍在 cache（最常见：BUY 后自动 LIS、刚买的 SKU 还在表里）→ 保持，
 *      用户按 ↓ 主动推进，不会被光标"跳回去"打断
 *   2. 否则选第一个非 sold/redacted 的商品
 *   3. 全表售空/屏蔽 → 退回选第一项
 */
function defaultSelectAfterList(): void {
  const cache = previewState.descriptorCache;
  if (cache.length === 0) {
    setSelectedSku(null);
    return;
  }
  const prev = previewState.selectedSku;
  if (prev && cache.some(d => d.sku === prev)) {
    setSelectedSku(prev);
    return;
  }
  const firstAvailable = cache.find(d => !d.purchased && !d.redacted);
  setSelectedSku((firstAvailable ?? cache[0]).sku);
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

/**
 * 双层 help：
 *   HEL          → 8 条命令一行 brief + 导航键提示
 *   HEL INF      → INF 6 子形态详情
 *   HEL BUY      → BUY 三种形态 + 高价确认阈值
 *   HEL <other>  → 没有独立详情页 → 回退 brief（"该命令在 brief 已说清"）
 */
export function cmdHelp(arg?: string): void {
  if (arg) {
    // 解析输入到完整动词名（支持 IN / INFO 等同义形态）
    const verbShort = expandVerb(arg) ?? arg.toUpperCase().slice(0, 3);
    if (verbShort === 'INF') {
      appendLine(t('shop.terminal.cmd.help.inf_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.inf_sku'));
      appendLine(t('shop.terminal.cmd.help.inf_key'));
      appendLine(t('shop.terminal.cmd.help.inf_owned'));
      appendLine(t('shop.terminal.cmd.help.inf_stats'));
      appendBlank();
      return;
    }
    if (verbShort === 'BUY') {
      appendLine(t('shop.terminal.cmd.help.buy_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.buy_no_arg'));
      appendLine(t('shop.terminal.cmd.help.buy_sku'));
      appendLine(t('shop.terminal.cmd.help.buy_enter'));
      appendLine(t('shop.terminal.cmd.help.price_note', { threshold: HIGH_PRICE_THRESHOLD }), 'dim');
      appendBlank();
      return;
    }
    if (verbShort === 'SEL') {
      appendLine(t('shop.terminal.cmd.help.sel_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.sel_arg'));
      appendLine(t('shop.terminal.cmd.help.sel_refund'));
      appendLine(t('shop.terminal.cmd.help.sel_window'));
      appendBlank();
      return;
    }
    if (verbShort === 'RES') {
      appendLine(t('shop.terminal.cmd.help.res_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.res_arg'));
      appendLine(t('shop.terminal.cmd.help.res_cost'));
      appendLine(t('shop.terminal.cmd.help.res_anim'));
      appendLine(t('shop.terminal.cmd.help.res_fallback'));
      appendBlank();
      return;
    }
    if (verbShort === 'PRO') {
      appendLine(t('shop.terminal.cmd.help.pro_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.pro_arg'));
      appendLine(t('shop.terminal.cmd.help.pro_finalize'));
      appendLine(t('shop.terminal.cmd.help.pro_gold'));
      appendBlank();
      return;
    }
    if (verbShort === 'UND') {
      appendLine(t('shop.terminal.cmd.help.und_header'), 'head');
      appendLine(t('shop.terminal.cmd.help.und_arg'));
      appendLine(t('shop.terminal.cmd.help.und_refund'));
      appendLine(t('shop.terminal.cmd.help.und_lock'));
      appendBlank();
      return;
    }
    // LIS / HEL 无独立详情页 → fall through 到 brief（brief 已包含一行说明）
  }
  // 一级 brief —— 命令清单
  appendLine(t('shop.terminal.cmd.help.header'), 'head');
  appendLine(t('shop.terminal.cmd.help.brief.lis'));
  appendLine(t('shop.terminal.cmd.help.brief.buy'));
  appendLine(t('shop.terminal.cmd.help.brief.inf'));
  appendLine(t('shop.terminal.cmd.help.brief.sel'));
  appendLine(t('shop.terminal.cmd.help.brief.res'));
  appendLine(t('shop.terminal.cmd.help.brief.pro'));
  appendLine(t('shop.terminal.cmd.help.brief.und'));
  appendLine(t('shop.terminal.cmd.help.brief.hel'));
  appendLine(t('shop.terminal.cmd.help.brief.nav'), 'dim');
  appendBlank();
}

/**
 * 单行行 div 工厂 — list-pane 内单元（与冻结后掉进 scrollback 的 t-line 保持一致样式）
 * data-sku 让 ↑↓ 之外的代码（INF lookup 等）也能以 SKU 反查 DOM
 */
function buildRowDiv(d: ItemDescriptor): HTMLElement {
  const row = document.createElement('div');
  row.className = `t-line ${classForRow(d)} list-row`.trim();
  row.dataset.sku = d.sku;
  row.innerHTML = renderListRow(d);
  return row;
}

/**
 * cmdList 进入 browse mode：先 freeze 上一轮 panel（解包进 scrollback），
 * 再造新 panel = mode-bar + list-pane（header + rows）+ dossier-pane（由 setSelectedSku 填充）。
 * 动画模式下 rows 30ms stagger 进 list-pane（mode-bar 与 dossier 立即在位）。
 */
export function cmdList(): void {
  freezeBrowsePanel();
  rebuildDescriptors();
  const animated = previewState.nextListIsAnimated && shouldAnimateShop();
  previewState.nextListIsAnimated = false;

  const vp = document.getElementById('terminal-viewport');
  if (!vp) return;

  if (previewState.descriptorCache.length === 0) {
    appendLine(t('shop.terminal.cmd.list.empty'), 'dim');
    appendBlank();
    setSelectedSku(null);
    return;
  }

  // ── 构建 panel 骨架 ──
  const panel = document.createElement('div');
  panel.className = 'browse-panel';

  const bar = document.createElement('div');
  bar.className = 'browse-mode-bar';
  // Mode bar 文案是终端命令 token / 交互提示，不走 i18n（与 SKU 前缀同性质）
  bar.innerHTML
    = `<span class="bm-label">▾ BROWSE · ${previewState.descriptorCache.length} ITEMS</span>`
    + `<span class="bm-help">↑↓ SELECT · BUY · ESC EXIT</span>`;
  panel.appendChild(bar);

  const listPane = document.createElement('div');
  listPane.className = 'browse-list';
  const headRow = document.createElement('div');
  headRow.className = 't-line head list-row';
  headRow.innerHTML = renderListHeaderRow();
  listPane.appendChild(headRow);
  panel.appendChild(listPane);

  const dossier = document.createElement('div');
  dossier.className = 'browse-dossier';
  panel.appendChild(dossier);

  vp.appendChild(panel);
  previewState.browsePanelEl = panel;

  // ── 灌入 rows ──
  if (!animated) {
    for (const d of previewState.descriptorCache) {
      const row = buildRowDiv(d);
      listPane.appendChild(row);
      previewState.lastListRowsBySku.set(d.sku, row);
    }
    defaultSelectAfterList();
    vp.scrollTop = vp.scrollHeight;
    return;
  }
  // 动画模式：每行 30ms stagger（点阵打印机走纸感）
  const myCallId = ++previewState.listCallCounter;
  previewState.descriptorCache.forEach((d, idx) => {
    setTimeout(() => {
      // 用户在动画期间触发新 LIS 或 freeze（计数器 / panel ref 变了）→ 取消
      if (previewState.listCallCounter !== myCallId) return;
      if (previewState.browsePanelEl !== panel) return;
      const row = buildRowDiv(d);
      listPane.appendChild(row);
      previewState.lastListRowsBySku.set(d.sku, row);
      if (idx === previewState.descriptorCache.length - 1) defaultSelectAfterList();
      vp.scrollTop = vp.scrollHeight;
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

  // 1) 子命令路由 — owned 资产列表 / session 统计 / 已收 wordDeck
  if (upper === '/OWNED' || upper === '/LIST-OWNED') {
    cmdInfoListOwned();
    return;
  }
  if (upper === '/STATS') { cmdStats(); return; }

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

  // 4) owned relic id/name 匹配
  const relicHit = findOwnedRelicByQuery(arg);
  if (relicHit) {
    cmdInfoOwnedRelic(relicHit);
    return;
  }

  // 5) 全部 miss → 原 suggestSku fallback
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

/** Story 60.10: owned relic id/name 模糊匹配 */
function findOwnedRelicByQuery(query: string): string | null {
  const q = query.toUpperCase();
  for (const id of state.player.relics) {
    if (id.toUpperCase().includes(q)) return id;
    const data = RELICS[id];
    if (!data) continue;
    if ((data.name || '').toUpperCase().includes(q)) return id;
    if (localizeItemName(id, data.name).toUpperCase().includes(q)) return id;
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
      // Section tag 前置括号（详 affix-rewrite-tag-system.md §9）
      const sectionPrefix = af.section ? `[${af.section.toUpperCase()}] ` : '';
      const hdr = `${sectionPrefix}‹${(af.typeName || '?').toUpperCase()}›${af.paramSummary ? ' ' + af.paramSummary : ''}`;
      for (const w of wrapAt(hdr, W - 4)) appendLine('  ' + w);
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
  const localName = localizeItemName(relicId, data.name);
  const headPrefix = t('shop.terminal.info.relic.owned_headline', { icon: data.icon, name: localName, key: numKey });
  const headLine = headPrefix + '═'.repeat(Math.max(3, W - localName.length - 28));
  appendLine(headLine, 'echo');
  appendLine(t('shop.terminal.info.relic.rarity_label', { rarity: data.rarity.toUpperCase(), rid: relicId }), 'dim');
  appendLine('');
  for (const w of wrapAt(localizeItemDesc(relicId, data.description), W - 4)) appendLine('  ' + w);
  const localFlavor = localizeItemFlavor(relicId, data.flavor);
  if (localFlavor) {
    appendLine('');
    for (const w of wrapAt(localFlavor, W - 4)) appendLine('  ' + w, 'dim');
  }
  appendLine('═'.repeat(W));
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
      appendLine(t('shop.terminal.cmd.info.relic_row', { key: numKey, icon: data.icon, name: localizeItemName(id, data.name) }));
    }
  }
  appendLine('═'.repeat(W));
  appendBlank();
}

function executeBuy(d: ItemDescriptor): void {
  if (state.gold < d.price) {
    // terminal sound removed (was sfx('shop_buy_err')) // Story 60.12: 拨号忙音 — 余额不足
    appendLine(t('shop.terminal.err.insufficient_funds', { gold: state.gold, price: d.price }), 'redacted');
    appendLine(t('shop.terminal.err.appeal_form'), 'dim');
    appendBlank();
    return;
  }
  if (d.kind === 'skill') return executeBuySkill(d);
  if (d.kind === 'pack') return executeBuyPack(d);
  if (d.kind === 'relic') return executeBuyRelic(d);
  // terminal sound removed (was sfx('shop_buy_err'))
  appendLine(t('shop.terminal.err.purchase_not_wired', { kind: d.kind.toUpperCase() }), 'redacted');
  appendBlank();
}

export function executeBuySkill(d: ItemDescriptor): void {
  // 升级路径：shop generator 把同名已拥有技能的新商品转成 isUpgrade=true，
  // skillId 指向已绑定的 ownedSkillId。原代码对 upgrade / new 一视同仁地推进 inbox，
  // 导致玩家看到键盘上原绑定 + inbox 多出一张同名卡 → 像 "买了但没拿到"。
  // 此路径只 in-place 升级 affixSkill / level，不进 inbox。
  const isUpgrade = d.originalItem.isUpgrade === true;
  // 升级不进 inbox → INBOX 满判断只对新购技能生效
  if (!isUpgrade && state.player.inbox.length >= INBOX_MAX) {
    appendLine(t('shop.terminal.err.intray_full', { n: INBOX_MAX, max: INBOX_MAX }), 'redacted');
    appendBlank();
    return;
  }
  const skill = d.originalItem.affixSkill;
  if (!skill) {
    appendLine(t('shop.terminal.err.no_skill_data'), 'redacted');
    appendBlank();
    return;
  }
  const skillId = d.originalItem.skillId ?? skill.id;
  const itemIdx = state.shop.items.indexOf(d.originalItem);
  // 升级前快照：UND 撤销时还原。结构克隆隔离引用，防 affix 后续 in-place mutate 串扰。
  const oldLevel = isUpgrade ? state.player.skills.get(skillId)?.level : undefined;
  const oldAffixRef = isUpgrade ? state.affixSkills.get(skillId) : undefined;
  const oldAffixSnapshot = oldAffixRef ? structuredClone(oldAffixRef) : undefined;
  state.gold -= d.price;
  // Story 60.7 review M1: deep-clone affixSkill 隔离 catalog 引用，
  // 防 BUY → UND → BUY 双重 affix 缩放（applyMaxSkillLevelOnPurchase 在 affixes 上 in-place mutate）
  const skillCopy = structuredClone(skill);
  // 实付价存到 affixSkill — 跨 session 后还能用来算转卖价（与 classic shop 同源）
  skillCopy.purchasePrice = d.price;
  state.affixSkills.set(skillId, skillCopy);
  state.player.skills.set(skillId, { level: skillCopy.level, purchasePrice: d.price });
  if (!isUpgrade) state.player.inbox.push(skillId);
  d.purchased = true;
  previewState.purchasedSkus.add(d.sku);
  previewState.undoStack.push({
    kind: 'skill', sku: d.sku, price: d.price, skillId, itemIdx,
    ...(isUpgrade ? { isUpgrade: true, oldLevel, oldAffix: oldAffixSnapshot } : {}),
  });
  // Story 60.7: 副作用闭合 — T4 max_skill_level 自动满级 + 装备 quest 重算 + 教程监听事件
  applyMaxSkillLevelOnPurchase(skillId);
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId, price: d.price });
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  if (isUpgrade) {
    // 升级路径：原绑定键保留 → 改用 upgraded_in_place 文案，避免 "派往收件槽" 误导
    const newLevel = state.player.skills.get(skillId)?.level ?? skillCopy.level;
    appendLine(t('shop.terminal.cmd.buy.upgraded_in_place', { level: newLevel, gold: state.gold }), 'dim');
  } else {
    appendLine(t('shop.terminal.cmd.buy.dispatched_intray', { n: state.player.inbox.length, max: INBOX_MAX, gold: state.gold }), 'dim');
  }
  appendLine(t('shop.terminal.cmd.buy.undo_stack_pending', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchInbox();
  // 升级时 affixSkill 已替换为新等级 → 刷键盘以更新 tooltip / 形状属性
  if (isUpgrade) shopBus.syncWorkbenchKeys();
  // 非升级路径才有新 inbox 槽 whoosh
  if (!isUpgrade) shopBus.triggerInboxWhoosh(state.player.inbox.length - 1);
  // Bug fix: 已打印的 LIST 是 BUY 前快照，不会回头标 SOLD —
  // 与 cmdReshuffle 一样自动重打 LIS，让"购买后划红"立即可见
  cmdList();
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
  // terminal sound removed (was sfx('shop_buy_ok')) // Story 60.12
  appendLine(t('shop.terminal.cmd.buy.confirmed', { name: d.name, price: d.price }), 'echo');
  appendLine(t('shop.terminal.cmd.buy.pack_word_filed', { word: word.toUpperCase(), gold: state.gold }), 'dim');
  appendLine(t('shop.terminal.cmd.buy.undo_stack', { n: previewState.undoStack.length }), 'dim');
  appendBlank();
  updateTerminalChrome();
  shopBus.syncWorkbenchKeys(); // wordDeck 变化 → 字母键 freq-lock 重算
  cmdList(); // Bug fix: 购买后立即重打 LIS，划红当前 SKU
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
  // terminal sound removed (was sfx('shop_buy_ok')) // Story 60.12
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
  cmdList(); // Bug fix: 购买后立即重打 LIS，划红当前 SKU
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
    // terminal sound removed (was sfx('shop_buy_err'))
    appendLine(t('shop.terminal.err.relic_no_id'), 'redacted');
    appendBlank();
    return;
  }
  if (state.player.relics.has(relicId)) {
    // terminal sound removed (was sfx('shop_buy_err'))
    appendLine(t('shop.terminal.err.relic_owned', { rid: relicId.toUpperCase() }), 'redacted');
    appendBlank();
    return;
  }
  if (isRelicSlotsFull()) {
    // terminal sound removed (was sfx('shop_buy_err'))
    appendLine(t('shop.terminal.err.relic_slots_full'), 'redacted');
    appendBlank();
    return;
  }
  state.gold -= d.price;
  const ok = addRelicWithCapacity(relicId);
  if (!ok) {
    state.gold += d.price;
    // terminal sound removed (was sfx('shop_buy_err'))
    appendLine(t('shop.terminal.err.relic_add_failed'), 'redacted');
    appendBlank();
    return;
  }
  // Story 60.7: 遗物购入瞬时副作用（与 classic shop.ts:2618-2627 对齐）
  if (relicId === 'd_100') rerollAllAffixes();
  if (relicId === 'universal_furnace') initFurnace(random);
  eventBus.emit('shop:purchase', { type: 'relic', itemId: relicId, price: d.price });
  // terminal sound removed (was sfx('shop_buy_ok')) // Story 60.12
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
  cmdList(); // Bug fix: 购买后立即重打 LIS，划红当前 SKU
}

export function cmdBuy(arg?: string): void {
  // 无 SKU 时退回当前 ↑↓ 选中商品；什么都没选则提示 usage
  const target = arg ?? previewState.selectedSku ?? null;
  if (!target) { appendLine(t('shop.terminal.cmd.usage.buy'), 'dim'); return; }
  const d = findDescriptorBySku(target);
  if (!d) {
    // terminal sound removed (was sfx('shop_buy_err')) // Story 60.12: SKU 不存在
    const guess = suggestSku(target);
    appendLine(t('shop.terminal.err.sku_not_in_catalog', { sku: target.toUpperCase() }), 'redacted');
    if (guess) appendLine(t('shop.terminal.cmd.info.did_you_mean', { guess }), 'dim');
    appendBlank();
    return;
  }
  if (d.purchased) {
    // terminal sound removed (was sfx('shop_buy_err'))
    appendLine(t('shop.terminal.err.already_sold', { sku: d.sku }), 'redacted');
    appendBlank();
    return;
  }
  if (d.redacted) {
    // terminal sound removed (was sfx('shop_buy_err')) // Story 60.12: clearance 不足
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

/**
 * SEL — 仅 IN<n> 槽位语法：卖收件托盘第 n 张卡（含上次留下、奖励赠送的）。
 * 按 SKU 卖本次新购的语义与 UND 重复（且 UND 全额退款更优），故只保留槽位入口。
 *
 * 退款基价优先级：本次 undoStack price > affixSkill.purchasePrice > 反算标牌价（rarity/level）。
 * 退款比例 = getRecycleSellMultiplier()（默认 0.5，回收专家 0.75）。
 */
export function cmdSell(arg?: string): void {
  if (!arg) { appendLine(t('shop.terminal.cmd.usage.sell'), 'dim'); return; }
  const target = arg.toUpperCase();

  const slotMatch = target.match(/^IN(\d+)$/);
  if (!slotMatch) {
    // 非槽位语法 → 引导到正确语法（顺带提示按 SKU 撤销请用 UND）
    appendLine(t('shop.terminal.cmd.usage.sell'), 'redacted');
    appendBlank();
    return;
  }
  const inboxIdx = parseInt(slotMatch[1], 10) - 1;
  if (inboxIdx < 0 || inboxIdx >= state.player.inbox.length) {
    appendLine(t('shop.terminal.err.intray_slot_empty', { target, n: state.player.inbox.length }), 'redacted');
    appendBlank();
    return;
  }
  sellFromInboxSlot(target, inboxIdx);
}

/** 从 IN-tray 指定槽位卖卡 — 退款源逐级回退（session 实付 > affixSkill.purchasePrice > 反算标牌价） */
function sellFromInboxSlot(target: string, inboxIdx: number): void {
  const skillId = state.player.inbox[inboxIdx];
  const sk = state.affixSkills.get(skillId);
  // 本次 session 购买记录优先（退款基于实付价，含本关折扣）；非升级条目才匹配
  const sessionUndoIdx = previewState.undoStack.findIndex(
    u => u.kind === 'skill' && !u.isUpgrade && u.skillId === skillId,
  );
  let basis: number;
  if (sessionUndoIdx >= 0) {
    basis = (previewState.undoStack[sessionUndoIdx] as { price: number }).price;
  } else if (sk?.purchasePrice) {
    basis = sk.purchasePrice;
  } else if (sk) {
    basis = calculateAffixSkillPrice(sk.rarity, sk.level);
  } else {
    basis = 15;
  }
  const sellMult = getRecycleSellMultiplier();
  const refund = Math.floor(basis * sellMult);

  state.player.inbox.splice(inboxIdx, 1);
  state.player.skills.delete(skillId);
  state.affixSkills.delete(skillId);
  state.affixSkillStates.delete(skillId);
  if (sessionUndoIdx >= 0) previewState.undoStack.splice(sessionUndoIdx, 1);
  state.gold += refund;
  evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
  appendLine(t('shop.terminal.cmd.sell.refunded', { target, refund, pct: Math.round(sellMult * 100) }), 'echo');
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
    // Bug fix: SKU 位置编码，新一轮 SKL-002 ≠ 上一轮 SKL-002；
    // 不清会让购买标记按位置粘到新商品上（"刷新后还是 SOLD"）
    previewState.purchasedSkus.clear();
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
    if (last.isUpgrade && last.oldLevel !== undefined && last.oldAffix) {
      // 升级回退：还原旧 level + 旧 affix；inbox 没动过、bindings 已存在指向 skillId 的条目
      state.player.skills.set(last.skillId, { level: last.oldLevel });
      state.affixSkills.set(last.skillId, last.oldAffix);
      shopBus.syncWorkbenchKeys(); // 键盘 tooltip / 形状随 affixSkill 一起回退
    } else {
      const idx = state.player.inbox.lastIndexOf(last.skillId);
      if (idx >= 0) state.player.inbox.splice(idx, 1);
      state.player.skills.delete(last.skillId);
      state.affixSkills.delete(last.skillId);
      shopBus.syncWorkbenchInbox();
    }
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
/**
 * /STATS — 上一战每个技能的贡献：让玩家看清"哪个技能产了多少哪种资源"。
 *   1. 头部：rating + WORDS / PERFECT / CHAIN / MAX-CHAIN / 💰
 *   2. SKILL CONTRIBUTION：按触发数降序的双行条目，第一行 名 + 触发 + chain，
 *      第二行 各资源细分（仅显示非零）—— 这是核心信息
 *   3. TOTAL OUTPUT：所有技能资源汇总，方便快速看"主资源是什么"
 * 数据源：state.battleStats.skillStats（Map<skillId, { triggerCount, resources, chainTriggered }>）。
 * 技能名走 state.affixSkills.get(skillId).name；卖出 / 撤回的技能查不到时 fallback 到 skillId 末段。
 */
export function cmdStats(): void {
  const W = INF_BLOCK_WIDTH;
  const bs = state.battleStats;
  if (!bs || bs.skillStats.size === 0) {
    appendLine(t('shop.no_stats'), 'dim');
    appendBlank();
    return;
  }

  // ── 1. Rating + 头部 ──
  const rating = bs.rating || calculateRating({
    score: state.score,
    targetScore: state.targetScore,
    perfectWords: bs.perfectWords,
    wordsCompleted: bs.wordsCompleted,
    timeRemaining: state.time,
    timeMax: state.timeMax,
  });
  const headTitle = `SESSION STATS · ${rating}`;
  appendLine(`═══ ${headTitle} ` + '═'.repeat(Math.max(3, W - headTitle.length - 5)), 'head');

  // ── 2. Summary 行 ──
  let totalGold = 0;
  bs.skillStats.forEach(ss => { totalGold += ss.resources.gold ?? 0; });
  const summaryParts: string[] = [];
  summaryParts.push(t('shop.words_done', { count: bs.wordsCompleted }));
  summaryParts.push(t('shop.words_perfect', { count: bs.perfectWords }));
  summaryParts.push(t('shop.chain_count', { count: bs.totalChainTriggers }));
  if (bs.maxChainDepth > 1) summaryParts.push(t('shop.max_chain', { count: bs.maxChainDepth }));
  if (totalGold > 0) summaryParts.push(`💰 +${Math.floor(totalGold)}`);
  appendLine(summaryParts.join(' · '));

  // ── 3. 资源排序（用于细分行 + 总览）──
  const resourceOrder = getActiveResources(state.classId);

  // ── 4. SKILL CONTRIBUTION（按触发降序的双行条目）──
  type SkillRow = { id: string; name: string; triggers: number; chain: number; resources: Record<ResourceType, number> };
  const skillRows: SkillRow[] = [];
  bs.skillStats.forEach((ss, sid) => {
    if (ss.triggerCount <= 0) return;
    const sk = state.affixSkills.get(sid);
    const name = sk?.name ?? sid.split('_').pop() ?? sid;
    skillRows.push({ id: sid, name, triggers: ss.triggerCount, chain: ss.chainTriggered, resources: ss.resources });
  });
  skillRows.sort((a, b) => b.triggers - a.triggers || a.name.localeCompare(b.name));

  appendLine('');
  appendLine('─── SKILL CONTRIBUTION ' + '─'.repeat(Math.max(3, W - 25)), 'head');
  if (skillRows.length === 0) {
    appendLine('  · —', 'dim');
  } else {
    for (const row of skillRows) {
      // 第 1 行：名（截到 32ch） + 触发数 + chain（仅 >0）
      const nameTrunc = row.name.length > 32 ? row.name.slice(0, 31) + '…' : row.name;
      const namePad = nameTrunc.padEnd(32, ' ');
      const trgStr = `${row.triggers}×`.padEnd(5, ' ');
      const chainStr = row.chain > 0 ? `(chain ${row.chain})` : '';
      appendLine(`  ${namePad} ${trgStr} ${chainStr}`.trimEnd());
      // 第 2 行：资源细分（仅非零）
      const resParts: string[] = [];
      for (const r of resourceOrder) {
        const v = row.resources[r] ?? 0;
        if (v <= 0) continue;
        const icon = RESOURCE_ICONS[r] ?? '◇';
        const formatted = r === 'multiplier' ? v.toFixed(2) : v.toFixed(1);
        resParts.push(`${icon}+${formatted}`);
      }
      appendLine(resParts.length > 0 ? '      ' + resParts.join('  ') : '      · —', 'dim');
    }
  }

  // ── 5. TOTAL OUTPUT（全量资源汇总）──
  const totals: Record<string, number> = {};
  bs.skillStats.forEach(ss => {
    for (const r of resourceOrder) {
      totals[r] = (totals[r] ?? 0) + (ss.resources[r] ?? 0);
    }
  });
  appendLine('');
  appendLine('─── TOTAL OUTPUT ' + '─'.repeat(Math.max(3, W - 19)), 'head');
  let printedAny = false;
  for (const r of resourceOrder) {
    const v = totals[r] ?? 0;
    if (v <= 0) continue;
    printedAny = true;
    const icon = RESOURCE_ICONS[r] ?? '◇';
    const label = t(`resource.${r}`);
    const formatted = r === 'multiplier' ? v.toFixed(2) : v.toFixed(1);
    appendLine(`  ${icon} ${label.padEnd(8, ' ')} +${formatted}`);
  }
  if (!printedAny) appendLine('  · —', 'dim');

  appendLine('═'.repeat(W));
  appendBlank();
}

// === Confirmation handler ===

export function handleConfirmation(input: string): boolean {
  if (!previewState.pendingConfirm) return false;
  const up = input.trim().toUpperCase();
  if (up === 'Y' || up === 'YES') {
    const sku = previewState.pendingConfirm.sku;
    previewState.pendingConfirm = null;
    const d = findDescriptorBySku(sku);
    // 之前 `if (d) executeBuy(d)` 在 d 为 null 时静默 no-op：用户按 Y 确认却看不到任何
    // 反馈也没真扣钱进货，正好对应 "BUY 后并没有真的买到"。RES 在 pendingConfirm 期间
    // 被本函数吃掉输入，主流程里 d 不应为 null；但 silent skip 是 bug 黑洞，改 loud。
    if (!d) {
      appendLine(t('shop.terminal.err.sku_not_in_catalog', { sku }), 'redacted');
      appendBlank();
      return true;
    }
    executeBuy(d);
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
