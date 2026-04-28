// ============================================
// Shop item descriptor schema (Phase 1.3)
// 把 ShopItem 翻译成两个 renderer（terminal text / workbench card）共用的中立描述符。
// ============================================

import type { ShopItem } from '../core/types';
import type { GameState } from '../core/types';
import { abbreviateSkillName } from './affixAbbrev';

export type ItemKind = 'skill' | 'pack' | 'relic' | 'enchantment';
export type ShapeColor = 'mono' | 'rare' | 'epic' | 'legendary' | 'special';

export interface ItemDescriptor {
  sku: string;             // player-typeable identifier, e.g. 'SKL-001'
  kind: ItemKind;
  name: string;            // full display name (used in INFO + workbench)
  nameAbbrev: string;      // 3-letter-per-token abbreviation (used in LIST)
  iconEmoji: string;       // workbench card front icon
  rarity: 0 | 1 | 2 | 3;
  rarityLabel: string;     // 'COMMON' / 'RARE' / 'EPIC' / 'LEGENDARY'
  shapeTag: string;        // 4-char wide tag, e.g. '[1·]' '[4O]' '[REL]' '[PCK]' '[ENC]'
  shapeColor: ShapeColor;
  triggerHint: string;     // 'CHIPS', 'VOWELS', '—' etc — the "what kind of thing"
  desc: string;            // single-line flavor / mechanic description
  effect: string;          // effect summary line
  affixLine: string;       // skill: affix names joined; pack: condition; relic: '—'
  price: number;
  stockNow: number | null; // null = unlimited
  stockMax: number | null;
  clearance: string;       // '4-B' / '4-A' / 'III'
  redacted: boolean;
  upgrade: boolean;        // true if this BUY upgrades an owned skill
  level?: number;          // current level (for skills)
  synergyCount: number;    // 0 in P1.3; P1.4 wires getSynergyCount(item, state)
  originalItem: ShopItem;
}

// === Polyomino shape catalog → 4-char [NX] tag ===
// Source of truth: src/data/skillShapes.ts SHAPE_TEMPLATES
const SHAPE_TAG_MAP: Record<string, { count: number; letter: string }> = {
  monomino:    { count: 1, letter: '·' },
  domino:      { count: 2, letter: '═' },
  triomino_I:  { count: 3, letter: 'I' },
  triomino_L:  { count: 3, letter: 'L' },
  tetromino_T: { count: 4, letter: 'T' },
  tetromino_L: { count: 4, letter: 'L' },
  tetromino_J: { count: 4, letter: 'J' },
  tetromino_S: { count: 4, letter: 'S' },
  tetromino_Z: { count: 4, letter: 'Z' },
  tetromino_I: { count: 4, letter: 'I' },
  tetromino_O: { count: 4, letter: 'O' },
};

const RARITY_LABELS = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;
const RARITY_TO_CLEARANCE = ['4-B', '4-B', '4-A', '4-A'] as const;

function shapeTagFromSkillShape(shapeId: string | undefined): { tag: string; color: ShapeColor } {
  const m = SHAPE_TAG_MAP[shapeId ?? 'monomino'] ?? SHAPE_TAG_MAP.monomino;
  let color: ShapeColor = 'mono';
  if (m.count === 2) color = 'rare';
  if (m.count === 3) color = 'epic';
  if (m.count === 4) color = 'legendary';
  return { tag: `[${m.count}${m.letter}]`, color };
}

function nonSkillTag(kind: Exclude<ItemKind, 'skill'>): { tag: string; color: ShapeColor } {
  const map = { pack: '[PCK]', relic: '[REL]', enchantment: '[ENC]' } as const;
  return { tag: map[kind], color: 'special' };
}

function makeSku(kind: ItemKind, idx: number): string {
  const prefix = ({ skill: 'SKL', pack: 'PCK', relic: 'REL', enchantment: 'ENC' } as const)[kind];
  return `${prefix}-${String(idx + 1).padStart(3, '0')}`;
}

function clamp01_3(r: number): 0 | 1 | 2 | 3 {
  return (Math.max(0, Math.min(3, r)) | 0) as 0 | 1 | 2 | 3;
}

function emojiForResource(resource: string | undefined): string {
  const m: Record<string, string> = {
    chips: '⚡', mult: '✖', time: '⏱', gold: '🍌', energy: '🔋',
    mutagen: '🧬', score: '🎯', base: '◇',
  };
  return m[resource ?? ''] ?? '◇';
}

// === Per-kind extractors ===

function describeSkill(item: ShopItem, idx: number): ItemDescriptor {
  const skill = item.affixSkill!;
  const sku = makeSku('skill', idx);
  const rarity = clamp01_3(skill.rarity);
  const { tag, color } = shapeTagFromSkillShape(skill.shapeId);
  const affixNames = skill.affixes.map(a => a.type.toUpperCase()).join(' · ') || '—';
  const enchTag = skill.enchantmentIds.length > 0 ? ' [ENCH]' : '';
  const nameAbbrev = abbreviateSkillName(skill.affixes.map(a => a.type), skill.resource);
  return {
    sku,
    kind: 'skill',
    name: skill.name.toUpperCase(),
    nameAbbrev,
    iconEmoji: skill.icon || emojiForResource(skill.resource),
    rarity,
    rarityLabel: RARITY_LABELS[rarity],
    shapeTag: tag,
    shapeColor: color,
    triggerHint: (skill.resource ?? 'CHIPS').toUpperCase(),
    desc: `${RARITY_LABELS[rarity]} · ${(skill.resource ?? 'chips').toUpperCase()}-SCHOOL` + enchTag,
    effect: affixNames === '—' ? 'NO AFFIXES' : `AFFIXES: ${affixNames}`,
    affixLine: affixNames,
    price: item.cost,
    stockNow: 1,        // shop catalog is per-roll; treat as 1-of-each
    stockMax: 1,
    clearance: RARITY_TO_CLEARANCE[rarity],
    redacted: false,
    upgrade: item.isUpgrade,
    level: skill.level,
    synergyCount: 0,    // P1.4 wires
    originalItem: item,
  };
}

function describePack(item: ShopItem, idx: number): ItemDescriptor {
  const pack = item.pack!;
  const rarity = clamp01_3(pack.rarity);
  const { tag, color } = nonSkillTag('pack');
  const wordCount = pack.words.length;
  const condName = (pack.condition?.type ?? 'WORDS').toUpperCase();
  return {
    sku: makeSku('pack', idx),
    kind: 'pack',
    name: pack.name.toUpperCase(),
    nameAbbrev: pack.name.toUpperCase().slice(0, 12),  // packs aren't affix-stacked; truncate
    iconEmoji: '📜',
    rarity,
    rarityLabel: RARITY_LABELS[rarity],
    shapeTag: tag,
    shapeColor: color,
    triggerHint: condName,
    desc: pack.desc,
    effect: wordCount === 1 ? `WORD: ${pack.words[0].toUpperCase()}` : `${wordCount} WORDS · PICK ${pack.pickCount}`,
    affixLine: pack.words.map(w => w.toUpperCase()).join(' · '),
    price: item.cost,
    stockNow: 1,
    stockMax: 1,
    clearance: RARITY_TO_CLEARANCE[rarity],
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  };
}

function describeRelic(item: ShopItem, idx: number): ItemDescriptor {
  // relicId-only ShopItem; full data lookup deferred until P1.4 (needs RELICS map import)
  const relicId = item.relicId ?? '';
  const { tag, color } = nonSkillTag('relic');
  return {
    sku: makeSku('relic', idx),
    kind: 'relic',
    name: relicId.toUpperCase().replace(/_/g, ' '),
    nameAbbrev: relicId.toUpperCase().slice(0, 12),
    iconEmoji: '🏺',
    rarity: 1,           // P1.4 will read from RELICS[relicId].rarity
    rarityLabel: 'RARE',
    shapeTag: tag,
    shapeColor: color,
    triggerHint: 'PASSIVE',
    desc: 'PERMANENT EFFECT · OCCUPIES NUMBER-ROW SLOT',
    effect: '— (P1.4 wires real description)',
    affixLine: '—',
    price: item.cost,
    stockNow: 1,
    stockMax: 1,
    clearance: '4-A',
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  };
}

function describeEnchantment(item: ShopItem, idx: number): ItemDescriptor {
  const { tag, color } = nonSkillTag('enchantment');
  return {
    sku: makeSku('enchantment', idx),
    kind: 'enchantment',
    name: (item.enchantmentType ?? 'ENCHANTMENT').toUpperCase(),
    nameAbbrev: (item.enchantmentType ?? 'ENC').toUpperCase().slice(0, 12),
    iconEmoji: '✦',
    rarity: 2,
    rarityLabel: 'EPIC',
    shapeTag: tag,
    shapeColor: color,
    triggerHint: 'MODIFIER',
    desc: 'STAMPS AN EFFECT ONTO ONE OWNED SKILL',
    effect: `TYPE: ${(item.enchantmentType ?? '?').toUpperCase()}`,
    affixLine: '—',
    price: item.cost,
    stockNow: 1,
    stockMax: 1,
    clearance: '4-A',
    redacted: false,
    upgrade: false,
    synergyCount: 0,
    originalItem: item,
  };
}

// === Public API ===

export function describeShopItem(item: ShopItem, idx: number, _state?: GameState): ItemDescriptor {
  switch (item.type) {
    case 'skill':       return describeSkill(item, idx);
    case 'pack':        return describePack(item, idx);
    case 'relic':       return describeRelic(item, idx);
    case 'enchantment': return describeEnchantment(item, idx);
    default: {
      // Defensive fallback for unknown types
      return {
        sku: makeSku('skill', idx),
        kind: 'skill',
        name: 'UNKNOWN ITEM',
        nameAbbrev: 'UNK',
        iconEmoji: '◇',
        rarity: 0,
        rarityLabel: 'COMMON',
        shapeTag: '[?]',
        shapeColor: 'mono',
        triggerHint: '?',
        desc: '?',
        effect: '?',
        affixLine: '?',
        price: item.cost,
        stockNow: null,
        stockMax: null,
        clearance: '4-B',
        redacted: false,
        upgrade: false,
        synergyCount: 0,
        originalItem: item,
      };
    }
  }
}

export function describeAllShopItems(items: ShopItem[], state?: GameState): ItemDescriptor[] {
  return items.map((it, i) => describeShopItem(it, i, state));
}
