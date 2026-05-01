// AUTO-GENERATED — mirror of scripts/narrative-writer/generated/quest-codes.mjs
// Re-run: see Phase 1 script in chat history (deterministic seeded shuffle)

export interface QuestCodeEntry {
  code: string;       // FOC-X-NNN, e.g. FOC-S-024
  foc: string;        // FOC subdiscipline letter group
  num: number;        // numeric portion
  foc_zh: string;     // subdiscipline zh label
  foc_en: string;     // subdiscipline en label
  pascal: string;     // PascalCase enum name
}

export const QUEST_CODES: Record<string, QuestCodeEntry> = {
  quest_convert_accum: { code: 'FOC-B-015', foc: 'FOC-B', num: 15, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestConvertAccum' },
  quest_energize: { code: 'FOC-B-018', foc: 'FOC-B', num: 18, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestEnergize' },
  quest_harvest: { code: 'FOC-B-024', foc: 'FOC-B', num: 24, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestHarvest' },
  quest_refine: { code: 'FOC-B-034', foc: 'FOC-B', num: 34, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestRefine' },
  quest_stack: { code: 'FOC-B-043', foc: 'FOC-B', num: 43, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestStack' },
  quest_purify: { code: 'FOC-B-045', foc: 'FOC-B', num: 45, foc_zh: '行为生态学', foc_en: 'Behavioral Ecology', pascal: 'QuestPurify' },
  quest_excavate: { code: 'FOC-F-013', foc: 'FOC-F', num: 13, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestExcavate' },
  quest_spectrum: { code: 'FOC-F-015', foc: 'FOC-F', num: 15, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestSpectrum' },
  quest_treasure: { code: 'FOC-F-021', foc: 'FOC-F', num: 21, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestTreasure' },
  quest_fiber_pierce: { code: 'FOC-F-031', foc: 'FOC-F', num: 31, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestFiberPierce' },
  quest_polarize: { code: 'FOC-F-034', foc: 'FOC-F', num: 34, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestPolarize' },
  quest_silkworm_cocoon: { code: 'FOC-F-043', foc: 'FOC-F', num: 43, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestSilkwormCocoon' },
  quest_devour: { code: 'FOC-F-046', foc: 'FOC-F', num: 46, foc_zh: '觅食学', foc_en: 'Foraging', pascal: 'QuestDevour' },
  quest_muta_chain: { code: 'FOC-G-001', foc: 'FOC-G', num: 1, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestMutaChain' },
  quest_chain: { code: 'FOC-G-004', foc: 'FOC-G', num: 4, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestChain' },
  quest_echo: { code: 'FOC-G-014', foc: 'FOC-G', num: 14, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestEcho' },
  quest_union: { code: 'FOC-G-017', foc: 'FOC-G', num: 17, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestUnion' },
  quest_relay: { code: 'FOC-G-030', foc: 'FOC-G', num: 30, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestRelay' },
  quest_resonance: { code: 'FOC-G-042', foc: 'FOC-G', num: 42, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestResonance' },
  quest_swarm_propagate: { code: 'FOC-G-043', foc: 'FOC-G', num: 43, foc_zh: '群体动力学', foc_en: 'Group Dynamics', pascal: 'QuestSwarmPropagate' },
  quest_reecho_rumble: { code: 'FOC-M-006', foc: 'FOC-M', num: 6, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestReechoRumble' },
  quest_ascend: { code: 'FOC-M-012', foc: 'FOC-M', num: 12, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestAscend' },
  quest_myopia_foresight: { code: 'FOC-M-018', foc: 'FOC-M', num: 18, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestMyopiaForesight' },
  quest_evolve: { code: 'FOC-M-021', foc: 'FOC-M', num: 21, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestEvolve' },
  quest_muta_refine: { code: 'FOC-M-044', foc: 'FOC-M', num: 44, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestMutaRefine' },
  quest_repulsion_vacuum: { code: 'FOC-M-045', foc: 'FOC-M', num: 45, foc_zh: '形态发生学', foc_en: 'Morphogenesis', pascal: 'QuestRepulsionVacuum' },
  quest_war_drum: { code: 'FOC-S-002', foc: 'FOC-S', num: 2, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestWarDrum' },
  quest_overload: { code: 'FOC-S-005', foc: 'FOC-S', num: 5, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestOverload' },
  quest_volatile: { code: 'FOC-S-008', foc: 'FOC-S', num: 8, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestVolatile' },
  quest_charge: { code: 'FOC-S-009', foc: 'FOC-S', num: 9, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestCharge' },
  quest_tide: { code: 'FOC-S-017', foc: 'FOC-S', num: 17, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestTide' },
  quest_fury: { code: 'FOC-S-025', foc: 'FOC-S', num: 25, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestFury' },
  quest_aura_universal: { code: 'FOC-S-028', foc: 'FOC-S', num: 28, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestAuraUniversal' },
  quest_mutacrit: { code: 'FOC-S-031', foc: 'FOC-S', num: 31, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestMutacrit' },
  quest_aura_global: { code: 'FOC-S-036', foc: 'FOC-S', num: 36, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestAuraGlobal' },
  quest_amplify_pulse: { code: 'FOC-S-037', foc: 'FOC-S', num: 37, foc_zh: '应激反应学', foc_en: 'Stress Response', pascal: 'QuestAmplifyPulse' },
  quest_mercenary_warlord: { code: 'FOC-T-009', foc: 'FOC-T', num: 9, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestMercenaryWarlord' },
  quest_reflect: { code: 'FOC-T-012', foc: 'FOC-T', num: 12, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestReflect' },
  quest_innate: { code: 'FOC-T-014', foc: 'FOC-T', num: 14, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestInnate' },
  quest_multiply_op: { code: 'FOC-T-016', foc: 'FOC-T', num: 16, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestMultiplyOp' },
  quest_exhaust: { code: 'FOC-T-024', foc: 'FOC-T', num: 24, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestExhaust' },
  quest_monkey_patch: { code: 'FOC-T-025', foc: 'FOC-T', num: 25, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestMonkeyPatch' },
  quest_overlap: { code: 'FOC-T-027', foc: 'FOC-T', num: 27, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestOverlap' },
  quest_fallacy: { code: 'FOC-T-028', foc: 'FOC-T', num: 28, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestFallacy' },
  quest_conduit: { code: 'FOC-T-031', foc: 'FOC-T', num: 31, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestConduit' },
  quest_iterate: { code: 'FOC-T-032', foc: 'FOC-T', num: 32, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestIterate' },
  quest_twin: { code: 'FOC-T-033', foc: 'FOC-T', num: 33, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestTwin' },
  quest_confluence: { code: 'FOC-T-035', foc: 'FOC-T', num: 35, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestConfluence' },
  quest_mirror: { code: 'FOC-T-038', foc: 'FOC-T', num: 38, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestMirror' },
  quest_splash: { code: 'FOC-T-040', foc: 'FOC-T', num: 40, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestSplash' },
  quest_flow: { code: 'FOC-T-041', foc: 'FOC-T', num: 41, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestFlow' },
  quest_sacrifice: { code: 'FOC-T-043', foc: 'FOC-T', num: 43, foc_zh: '元认知学', foc_en: 'Meta Cognition', pascal: 'QuestSacrifice' },
};
