// ============================================
// 混沌种子遗物测试
// ============================================
// chaos_seed: 每关开始时给所有未附魔技能一个随机临时附魔，关结束移除

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AffixSkillInstance } from '../../../../src/data/affixes'
import type { ResourceType } from '../../../../src/core/types'

// === Mock state (inline to avoid hoisting issues) ===
vi.mock('../../../../src/core/state', () => {
  return {
    state: {
      player: {
        relics: new Set<string>(),
        relicStates: {} as Record<string, number>,
        bindings: new Map<string, string>(),
        skills: new Map(),
        baseMultiplier: 1,
      },
      classId: 'none',
      affixSkills: new Map(),
      combo: 0,
      multiplier: 1,
      overkill: 0,
      gold: 0,
      time: 0,
    },
    synergy: {
      wordSkillCount: 0,
      skillBaseScore: 0,
      skillMultBonus: 0,
    },
    resetState: vi.fn(),
    resetResources: vi.fn(),
    calculateTargetScore: vi.fn(),
    createBattleStats: vi.fn(),
  }
})

vi.mock('../../../../src/core/seededRandom', () => ({
  random: vi.fn(() => 0.5),
  seed: vi.fn(),
  getSeedState: vi.fn(),
  setSeedState: vi.fn(),
  setNormalMode: vi.fn(),
}))

vi.mock('../../../../src/effects/sound', () => ({
  playSound: vi.fn(),
  initAudio: vi.fn(),
  playScoreSound: vi.fn(),
  playRatingSound: vi.fn(),
  startBGM: vi.fn(),
  stopBGM: vi.fn(),
  updateBGMTension: vi.fn(),
  releaseBGMTension: vi.fn(),
  emitResourceSound: vi.fn(),
}))

vi.mock('../../../../src/effects/juice', () => ({
  juiceUp: vi.fn(),
  bumpCombo: vi.fn(),
  bumpScore: vi.fn(),
  bumpMultiplier: vi.fn(),
  bumpTimer: vi.fn(),
  getFloatScale: vi.fn(),
  screenShake: vi.fn(),
  getShakeIntensity: vi.fn(),
  getScoreTier: vi.fn(),
  SCORE_TIER_CLASSES: {},
  ScoreRoller: vi.fn().mockImplementation(() => ({ reset: vi.fn(), update: vi.fn() })),
  triggerSlowMotion: vi.fn(),
  getTimeScale: vi.fn(() => 1),
  checkMilestone: vi.fn(),
  showMilestoneCelebration: vi.fn(),
  showRatingReveal: vi.fn(),
  calculateRating: vi.fn(),
}))

vi.mock('../../../../src/effects/particles', () => ({
  spawnParticles: vi.fn(),
}))

vi.mock('../../../../src/ui/elements', () => ({
  getElements: vi.fn(() => ({})),
}))

vi.mock('../../../../src/systems/shop', () => ({
  openShop: vi.fn(),
  renderBuildManager: vi.fn(),
}))

vi.mock('../../../../src/systems/skills', () => ({
  triggerSkill: vi.fn(),
  clearPseudoInfinite: vi.fn(),
  resetWordResourceTypes: vi.fn(),
  getWordResourceTypeCount: vi.fn(),
  updateChargeProducers: vi.fn(),
}))

vi.mock('../../../../src/systems/relics/RelicPipeline', () => ({
  resolveRelicEffects: vi.fn(() => ({ effects: { multiply: 0, gold: 0 } })),
  resolveRelicEffectsWithBehaviors: vi.fn(),
  queryRelicFlag: vi.fn(() => false),
  getMonoAffixCategory: vi.fn(),
}))

vi.mock('../../../../src/systems/relicPicker', () => ({
  hasUnownedRelics: vi.fn(),
  showRelicPicker: vi.fn(),
  RELIC_WEIGHT_PRESETS: {},
}))

vi.mock('../../../../src/systems/typing/InputHandler', () => ({
  inputHandler: { init: vi.fn(), destroy: vi.fn() },
}))

vi.mock('../../../../src/ui/keyboard/KeyTooltip', () => ({
  keyTooltip: { init: vi.fn(), destroy: vi.fn() },
}))

vi.mock('../../../../src/systems/stage/stageFlow', () => ({
  getStageType: vi.fn(() => 'normal'),
  getCycleTimeLimit: vi.fn(() => 60),
  getBattleNumber: vi.fn(() => 1),
  getActForNode: vi.fn(() => 1),
  TOTAL_NODES: 15,
}))

vi.mock('../../../../src/data/bossModifiers', () => ({
  getBossModifierMeta: vi.fn(),
  getActiveParams: vi.fn(),
  incrementDiminishCount: vi.fn(),
  getDiminishMultiplier: vi.fn(),
  transformWordForModifier: vi.fn(),
  drawBossModifiers: vi.fn(),
  isScrollActive: vi.fn(),
  initScrollWord: vi.fn(),
  checkScrollLetterState: vi.fn(),
  markScrollMiss: vi.fn(),
}))

vi.mock('../../../../src/systems/bossModifierEngine', () => ({
  applyModifier: vi.fn(),
  cleanupModifier: vi.fn(),
  tickModifier: vi.fn(),
  isModifierActive: vi.fn(),
}))

vi.mock('../../../../src/systems/bossModifierPicker', () => ({
  showBossModifierPicker: vi.fn(),
}))

vi.mock('../../../../src/systems/actTransition', () => ({
  showActTransition: vi.fn(),
  showEliteAnnouncement: vi.fn(),
  showBossIntro: vi.fn(),
  updateStageInfo: vi.fn(),
}))

vi.mock('../../../../src/systems/classes/FragmentQueue', () => ({
  routeFragmentsToInventory: vi.fn(),
  getMaxQueueLength: vi.fn(() => 6),
}))

vi.mock('../../../../src/systems/letters/LetterFrequencySystem', () => ({
  getLetterScoreModifiers: vi.fn(() => []),
}))

vi.mock('../../../../src/demo/demo-config', () => ({
  IS_DEMO: false,
  DEMO_FIRST_STAGE_WORDS: [],
  DEMO_TARGET_SCORES: {},
}))

vi.mock('../../../../src/demo/demo-tutorial', () => ({
  initDemoTutorial: vi.fn(),
}))

vi.mock('../../../../src/demo/demo-end-screen', () => ({
  showDemoEndScreen: vi.fn(),
}))

vi.mock('../../../../src/demo/demo-analytics', () => ({
  trackEvent: vi.fn(),
}))

vi.mock('../../../../src/demo/demo-i18n', () => ({
  t: vi.fn((k: string) => k),
  localizeItemName: vi.fn(),
  localizeItemDesc: vi.fn(),
}))

vi.mock('../../../../src/core/events/EventBus', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

import { state } from '../../../../src/core/state'
import { applyChaosSeedEnchantments, removeChaosSeedEnchantments } from '../../../../src/systems/battle'

function makeSkill(overrides: Partial<AffixSkillInstance> = {}): AffixSkillInstance {
  return {
    id: 'skill_test',
    name: '测试技能',
    icon: '🔢',
    resource: 'base' as ResourceType,
    baseValues: [5, 8, 12] as [number, number, number],
    level: 1,
    rarity: 0 as 0 | 1 | 2 | 3,
    affixes: [],
    enchantmentIds: [],
    ...overrides,
  }
}

describe('chaos_seed 混沌种子', () => {
  beforeEach(() => {
    state.player.relics.clear()
    state.affixSkills.clear()
    // 清除前一轮追踪
    removeChaosSeedEnchantments()
  })

  it('无 chaos_seed 遗物时不添加附魔', () => {
    const skill = makeSkill({ id: 'sk1' })
    state.affixSkills.set('sk1', skill)

    applyChaosSeedEnchantments()
    expect(skill.enchantmentIds).toHaveLength(0)
  })

  it('有 chaos_seed 时给未附魔技能添加临时附魔', () => {
    state.player.relics.add('chaos_seed')
    const skill = makeSkill({ id: 'sk1' })
    state.affixSkills.set('sk1', skill)

    applyChaosSeedEnchantments()
    expect(skill.enchantmentIds).toHaveLength(1)
  })

  it('已附魔技能不受影响', () => {
    state.player.relics.add('chaos_seed')
    const skill = makeSkill({ id: 'sk1', enchantmentIds: ['apprentice_self'] })
    state.affixSkills.set('sk1', skill)

    applyChaosSeedEnchantments()
    expect(skill.enchantmentIds).toHaveLength(1)
    expect(skill.enchantmentIds[0]).toBe('apprentice_self')
  })

  it('多个未附魔技能全部获得附魔', () => {
    state.player.relics.add('chaos_seed')
    const sk1 = makeSkill({ id: 'sk1' })
    const sk2 = makeSkill({ id: 'sk2' })
    const sk3 = makeSkill({ id: 'sk3', enchantmentIds: ['apprentice_self'] })
    state.affixSkills.set('sk1', sk1)
    state.affixSkills.set('sk2', sk2)
    state.affixSkills.set('sk3', sk3)

    applyChaosSeedEnchantments()
    expect(sk1.enchantmentIds).toHaveLength(1)
    expect(sk2.enchantmentIds).toHaveLength(1)
    expect(sk3.enchantmentIds).toHaveLength(1) // 原有的不变
    expect(sk3.enchantmentIds[0]).toBe('apprentice_self')
  })

  it('removeChaosSeedEnchantments 移除临时附魔', () => {
    state.player.relics.add('chaos_seed')
    const sk1 = makeSkill({ id: 'sk1' })
    const sk2 = makeSkill({ id: 'sk2', enchantmentIds: ['apprentice_self'] })
    state.affixSkills.set('sk1', sk1)
    state.affixSkills.set('sk2', sk2)

    applyChaosSeedEnchantments()
    expect(sk1.enchantmentIds).toHaveLength(1)

    removeChaosSeedEnchantments()
    // 临时附魔被移除
    expect(sk1.enchantmentIds).toHaveLength(0)
    // 原有附魔不受影响
    expect(sk2.enchantmentIds).toHaveLength(1)
    expect(sk2.enchantmentIds[0]).toBe('apprentice_self')
  })

  it('连续两关：清除后重新分配', () => {
    state.player.relics.add('chaos_seed')
    const sk1 = makeSkill({ id: 'sk1' })
    state.affixSkills.set('sk1', sk1)

    // 第一关
    applyChaosSeedEnchantments()
    expect(sk1.enchantmentIds).toHaveLength(1)

    // 第二关开始
    removeChaosSeedEnchantments()
    expect(sk1.enchantmentIds).toHaveLength(0)

    applyChaosSeedEnchantments()
    expect(sk1.enchantmentIds).toHaveLength(1)
  })

  it('技能被移除后 remove 不报错', () => {
    state.player.relics.add('chaos_seed')
    const sk1 = makeSkill({ id: 'sk1' })
    state.affixSkills.set('sk1', sk1)

    applyChaosSeedEnchantments()
    state.affixSkills.delete('sk1')

    expect(() => removeChaosSeedEnchantments()).not.toThrow()
  })
})
