/**
 * data/ → JSON 抽取脚本
 *
 * 用法：npm run data:extract
 *
 * 目的：把 src/src/data/ 下的纯数据常量抽出为引擎无关的 JSON，
 * 让 TS 与未来 Godot 端共享同一份事实来源。
 *
 * 原则：
 *   - 仅抽 *静态数据*；运行时函数/类型/枚举留在 ts 文件
 *   - 拒绝写入函数引用（JSON.stringify 会丢失）
 *   - JSON 输出 UTF-8、2 空格缩进、末尾换行
 *
 * 添加新数据源：在 SOURCES 数组添加一项即可
 *
 * 见 docs/godot-migration/data-sync.md 了解拆分原则。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..'); // src/ (npm 项目根)
const OUT_DIR = resolve(REPO_ROOT, 'data-json');

// === 数据源声明 ===
// 每个 source 提供一个 loader 返回纯数据 record，最终序列化到 JSON
interface DataSource {
  /** 输出文件名（不含 .json） */
  name: string;
  /** 异步加载并返回纯数据对象 */
  load: () => Promise<Record<string, unknown>>;
}

const SOURCES: DataSource[] = [
  {
    name: 'keyboardTopology',
    load: async () => {
      const mod = await import('../../src/data/keyboardTopology.ts');
      return {
        // 派生表（来自 KEYBOARD_ROWS，预先计算后冻结）
        columnMap: mod.COLUMN_MAP,
        rowMap: mod.ROW_MAP,
        // 静态查表
        handMap: mod.HAND_MAP,
        fingerMap: mod.FINGER_MAP,
        symmetricPairs: mod.SYMMETRIC_PAIRS,
      };
    },
  },
  {
    name: 'classes',
    load: async () => {
      const mod = await import('../../src/data/classes.ts');
      return { definitions: mod.CLASS_DEFINITIONS };
    },
  },
  {
    name: 'tutorialSteps',
    load: async () => {
      const mod = await import('../../src/data/tutorialSteps.ts');
      return {
        L0: mod.L0_STEPS,
        L1: mod.L1_STEPS,
        L2: mod.L2_STEPS,
        L3: mod.L3_STEPS,
        L4: mod.L4_STEPS,
        L5: mod.L5_STEPS,
        demo: mod.DEMO_TUTORIAL_STEPS,
      };
    },
  },
  // restEvents.ts SKIPPED — pure runtime: buildRestOptions() 是函数，
  // RELIC_OPTIONS 数组的 getOption 全是函数引用，无静态数据可抽
  {
    name: 'wordPacks',
    load: async () => {
      const mod = await import('../../src/data/wordPacks.ts');
      // 5 张稀有度配置表（私有 const，由 extract.ts 通过二次 import 暴露在附属 *.data.ts）
      // Set → Array 转换以便 JSON 序列化
      const allowed = mod.PACK_RARITY_ALLOWED_CONDITIONS;
      const excluded = mod.PACK_RARITY_EXCLUDED_CONDITIONS;
      const setToArray = (s: Set<string> | null): string[] | null =>
        s === null ? null : [...s];
      return {
        candidateCount: mod.PACK_RARITY_CANDIDATE_COUNT,
        pickCount: mod.PACK_RARITY_PICK_COUNT,
        basePrice: mod.PACK_RARITY_BASE_PRICE,
        allowedConditions: {
          0: setToArray(allowed[0]),
          1: setToArray(allowed[1]),
          2: setToArray(allowed[2]),
          3: setToArray(allowed[3]),
        },
        excludedConditions: {
          0: setToArray(excluded[0]),
          1: setToArray(excluded[1]),
          2: setToArray(excluded[2]),
          3: setToArray(excluded[3]),
        },
      };
    },
  },
  {
    name: 'words',
    load: async () => {
      const mod = await import('../../src/data/words.ts');
      return { wordPool: mod.WORD_POOL };
    },
  },
  {
    name: 'bossModifiers',
    load: async () => {
      const mod = await import('../../src/data/bossModifiers.ts');
      return {
        modifierIds: mod.BOSS_MODIFIER_IDS,
        meta: mod.BOSS_MODIFIER_META,
        // 注意：BOSS_MODIFIER_REGISTRY 含函数引用（apply/cleanup/onTick），不能抽
        //       GARBLE_CHARS / DECOY_MIN_LENGTH 单值常量，不值得单独抽
      };
    },
  },
  {
    name: 'skills',
    load: async () => {
      const mod = await import('../../src/data/skills.ts');
      return {
        deletedSkillIds: mod.DELETED_SKILL_IDS,
        deletedEvolutionIds: mod.DELETED_EVOLUTION_IDS,
      };
    },
  },
  {
    name: 'relics',
    load: async () => {
      const mod = await import('../../src/data/relics.ts');
      return {
        maxRelicSlots: mod.MAX_RELIC_SLOTS,
        relics: mod.RELICS,
        deletedRelicIds: mod.DELETED_RELIC_IDS,
      };
    },
  },
  {
    name: 'affixes',
    load: async () => {
      const mod = await import('../../src/data/affixes.ts');
      return {
        // Category & weight
        affixCategoryMap: mod.AFFIX_CATEGORY_MAP,
        affixWeightTiers: mod.AFFIX_WEIGHT_TIERS,
        affixClassRestriction: mod.AFFIX_CLASS_RESTRICTION,
        // Display / localization (这些将来 Godot 端会重做 i18n，也先抽着)
        affixNames: mod.AFFIX_NAMES,
        affixDescriptions: mod.AFFIX_DESCRIPTIONS,
        resourceNames: mod.RESOURCE_NAMES,
        rarityNames: mod.RARITY_NAMES,
        rarityColors: mod.RARITY_COLORS,
        transmuteNames: mod.TRANSMUTE_NAMES,
        // Numeric / probability tables
        baseValues: mod.BASE_VALUES,
        rarityProbabilities: mod.RARITY_PROBABILITIES,
        critMultiplier: mod.CRIT_MULTIPLIER,
        fateCoinCritCap: mod.FATE_COIN_CRIT_CAP,
        fateCoinConversion: mod.FATE_COIN_CONVERSION,
        voidBonusTable: mod.VOID_BONUS_TABLE,
        swarmBonusTable: mod.SWARM_BONUS_TABLE,
        flowBonusTable: mod.FLOW_BONUS_TABLE,
        confluenceBonusTable: mod.CONFLUENCE_BONUS_TABLE,
        unionBonusTable: mod.UNION_BONUS_TABLE,
        convertKTable: mod.CONVERT_K_TABLE,
        transmuteRatioTable: mod.TRANSMUTE_RATIO_TABLE,
        multiplyOperatorCalibration: mod.MULTIPLY_OPERATOR_CALIBRATION,
        multiplyOperatorBaseValues: mod.MULTIPLY_OPERATOR_BASE_VALUES,
        apprenticeNeighborGrowth: mod.APPRENTICE_NEIGHBOR_GROWTH,
        // Enchantment
        enchantmentMeta: mod.ENCHANTMENT_META,
        classRestrictedEnchantments: mod.CLASS_RESTRICTED_ENCHANTMENTS,
        // Legacy / migration
        oldSkillPrefixes: mod.OLD_SKILL_PREFIXES,
        //
        // SKIP 以下运行时结构（含函数或 mutable state）：
        //   AFFIX_WEIGHTS — 由 rollAffixWeights(rng) 在运行时 mutate
        //   QUEST_AFFIX_MAP — 使用 AffixType enum keys，JSON 化后 loader 需重建；保留 ts
        //   QUEST_ENCHANTMENT_DEFS — 数据但含 complex shape，后续 story 细化
        //   AFFIX_LEVEL_SCALING — 数据但用 Partial<Record<AffixType>>，后续 story 细化
      };
    },
  },
];

// === 主流程 ===

function checkSerializable(obj: unknown, path = ''): void {
  if (typeof obj === 'function') {
    throw new Error(`Non-serializable function found at ${path || '<root>'}`);
  }
  if (obj instanceof Map || obj instanceof Set) {
    throw new Error(`Non-serializable ${obj.constructor.name} at ${path || '<root>'} — convert to plain object/array first`);
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      checkSerializable(v, path ? `${path}.${k}` : k);
    }
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  let extracted = 0;
  for (const source of SOURCES) {
    const data = await source.load();
    checkSerializable(data, source.name);
    const json = JSON.stringify(data, null, 2) + '\n';
    const outPath = resolve(OUT_DIR, `${source.name}.json`);
    writeFileSync(outPath, json, 'utf8');
    console.log(`✓ ${source.name}.json (${(json.length / 1024).toFixed(1)} KB)`);
    extracted++;
  }

  console.log(`\nExtracted ${extracted}/${SOURCES.length} data sources to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error('✗ Extraction failed:');
  console.error(err);
  process.exit(1);
});
