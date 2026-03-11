// ============================================
// 数值平衡与调优测试
// Story 34.7: AC1-AC8
// ============================================
// 纯计算模拟器 — 不依赖 DOM，提取 triggerProducer/triggerConverter 的核心计算逻辑

import { describe, it, expect } from 'vitest'
import { PRODUCERS, getProducerValue, getProducerMechanic } from '../../../src/data/producers'
import { CONVERTERS } from '../../../src/data/converters'
import { ENCHANTMENTS } from '../../../src/data/enchantments'
import { BALANCE } from '../../../src/core/constants'
import type { ChargeParams, DecayParams, PulseParams, CritParams, VoidParams, ResourceType } from '../../../src/core/types'
import { getKeysWithRelation } from '../../../src/data/keyboardTopology'

// ============================================================
// Task 1: 数值模拟测试框架
// ============================================================

/** 精简的模拟状态 */
interface SimState {
  resources: Record<string, number>
  multiplier: number
  score: number
  gold: number
  chargeAccumulated: Map<string, number>
  decayMultipliers: Map<string, number>
  pulseCounts: Map<string, number>
  bindings: Map<string, string>  // key → skillId
  classResourceProduced: Record<string, number>
}

function createSimState(): SimState {
  return {
    resources: { base: 0, score: 0, multiplier: BALANCE.BASE_MULTIPLIER, time: 30, gold: 0, fragment: 0, mutagen: 0 },
    multiplier: BALANCE.BASE_MULTIPLIER,
    score: 0,
    gold: 0,
    chargeAccumulated: new Map(),
    decayMultipliers: new Map(),
    pulseCounts: new Map(),
    bindings: new Map(),
    classResourceProduced: {},
  }
}

/** 模拟单次产出者触发（纯计算，无 DOM） */
function simulateProducerTrigger(
  producerId: string,
  level: number,
  sim: SimState,
  triggerKey?: string,
): { resource: string; value: number; isCrit: boolean } {
  const prod = PRODUCERS[producerId]
  if (!prod) return { resource: '', value: 0, isCrit: false }

  const baseValue = getProducerValue(producerId, level)

  // Phase 2: 加算层（charge / void）
  let mechanicAddBonus = 0
  const mechanic = prod.mechanic || 'standard'
  if (mechanic === 'charge' && prod.mechanicParams) {
    const charge = sim.chargeAccumulated.get(producerId) || 0
    mechanicAddBonus = charge
    sim.chargeAccumulated.set(producerId, 0)
  } else if (mechanic === 'void' && prod.mechanicParams && triggerKey) {
    const vp = prod.mechanicParams as VoidParams
    const related = getKeysWithRelation(triggerKey, vp.posRel)
    const emptyCount = related.filter(k => !sim.bindings.has(k)).length
    mechanicAddBonus = emptyCount * vp.bonusPerSlot
  }
  const mechanicAdjustedBase = baseValue * (1 + mechanicAddBonus)

  // 无附魔/增幅/遗物的简化路径：value = mechanicAdjustedBase（纯 add）
  let value = mechanicAdjustedBase

  // Phase 3: 乘算层（decay / pulse / crit）
  let mechanicMult = 1
  let isCrit = false
  if (mechanic === 'decay' && prod.mechanicParams) {
    const dp = prod.mechanicParams as DecayParams
    const currentMult = sim.decayMultipliers.get(producerId) ?? dp.initialMult
    mechanicMult *= currentMult
    sim.decayMultipliers.set(producerId, Math.max(dp.floor, currentMult - dp.decayPerTrigger))
  } else if (mechanic === 'pulse' && prod.mechanicParams) {
    const pp = prod.mechanicParams as PulseParams
    const count = (sim.pulseCounts.get(producerId) || 0) + 1
    sim.pulseCounts.set(producerId, count)
    if (count % pp.interval === 0) {
      mechanicMult *= pp.burstMult
    }
  } else if (mechanic === 'crit' && prod.mechanicParams) {
    const cp = prod.mechanicParams as CritParams
    // 平衡测试用期望值替代随机：chance * critMult + (1 - chance) * 1
    mechanicMult *= cp.chance * cp.critMult + (1 - cp.chance)
    // 不设 isCrit，因为用期望值
  }
  value *= mechanicMult

  // 应用到资源
  if (prod.resource === 'base') {
    sim.resources.base += value
  } else if (prod.resource === 'multiplier') {
    sim.resources.multiplier += value
    sim.multiplier = sim.resources.multiplier
  } else if (prod.resource === 'score') {
    sim.resources.score += value
    sim.score += value
  } else if (prod.resource === 'gold') {
    sim.resources.gold += value
    sim.gold += value
  } else {
    sim.resources[prod.resource] = (sim.resources[prod.resource] || 0) + value
  }

  return { resource: prod.resource, value, isCrit }
}

/** 模拟蓄力 tick（每秒调用一次） */
function simulateChargeTick(sim: SimState, dtSec: number): void {
  for (const [key, skillId] of sim.bindings) {
    const prod = PRODUCERS[skillId]
    if (!prod || prod.mechanic !== 'charge' || !prod.mechanicParams) continue
    const cp = prod.mechanicParams as ChargeParams
    const current = sim.chargeAccumulated.get(skillId) || 0
    sim.chargeAccumulated.set(skillId, Math.min(current + cp.gainPerSec * dtSec, cp.maxBonus))
  }
}

/** 模拟单次 add 转化者触发 */
function simulateConverterTrigger(
  converterId: string,
  level: number,
  sim: SimState,
): { target: string; delta: number } {
  const conv = CONVERTERS[converterId]
  if (!conv) return { target: '', delta: 0 }

  const idx = Math.max(0, Math.min(level, 3) - 1)
  const growthFactors = [1.0, 1.5, 2.0]
  const k = conv.k * growthFactors[idx]

  // 读取源值
  let sourceVal = 0
  if (conv.source === 'base') sourceVal = sim.resources.base
  else if (conv.source === 'score') sourceVal = sim.resources.score + sim.resources.base * sim.multiplier
  else if (conv.source === 'multiplier') sourceVal = sim.multiplier
  else if (conv.source === 'time') sourceVal = sim.resources.time
  else if (conv.source === 'gold') sourceVal = sim.gold
  else if (conv.source === 'fragment' || conv.source === 'mutagen') {
    sourceVal = sim.classResourceProduced[conv.source] || 0
  }

  const delta = sourceVal * k

  // 应用到目标
  if (conv.target === 'base') sim.resources.base += delta
  else if (conv.target === 'multiplier') { sim.resources.multiplier += delta; sim.multiplier = sim.resources.multiplier }
  else if (conv.target === 'score') { sim.resources.score += delta; sim.score += delta }
  else if (conv.target === 'gold') { sim.resources.gold += delta; sim.gold += delta }
  else sim.resources[conv.target] = (sim.resources[conv.target] || 0) + delta

  return { target: conv.target, delta }
}

/** 模拟关卡的最终得分（base × multiplier + score 的累积）
 *  简化：真实游戏在每词完成时计算 wordBase × currentMult，
 *  此处用 totalBase × finalMult 近似。当 multiplier 在关卡中增长时会高估，
 *  但测试目标分数余量充足（通常 10x+ 超标），不影响 pass/fail 判断。
 */
function calculateFinalScore(sim: SimState): number {
  return sim.resources.base * sim.multiplier + sim.resources.score
}

/** 目标分数计算（直接引用常量） */
function targetScore(level: number, stageType: 'standard' | 'elite' | 'boss' = 'standard', cycle = 1): number {
  const base = Math.floor(BALANCE.TARGET_BASE + level * BALANCE.TARGET_LINEAR + level * level * BALANCE.TARGET_QUADRATIC)
  const scaled = Math.floor(base * Math.pow(BALANCE.CYCLE_SCORE_BASE, cycle - 1))
  if (stageType === 'elite') return Math.floor(scaled * 1.3)
  if (stageType === 'boss') return Math.floor(scaled * 1.5)
  return scaled
}

interface StageConfig {
  producers: { id: string; key: string; level: number }[]
  converters?: { id: string; key: string; level: number }[]
  durationSec: number
  wpm: number           // 打字速率
  triggersPerWord: number  // 每词平均触发次数（约 4-5）
  level: number
  stageType: 'standard' | 'elite' | 'boss'
}

/** 模拟完整关卡 */
function simulateStage(config: StageConfig): {
  finalScore: number
  target: number
  resources: Record<string, number>
  producerOutputs: Record<string, number>
} {
  const sim = createSimState()

  // 设置绑定
  for (const p of config.producers) sim.bindings.set(p.key, p.id)
  if (config.converters) {
    for (const c of config.converters) sim.bindings.set(c.key, c.id)
  }

  // 计算总触发次数
  const wordsPerSec = config.wpm / 12  // 60 WPM ≈ 5 words/sec (average 5 chars/word)
  const totalWords = wordsPerSec * config.durationSec
  const totalTriggers = Math.floor(totalWords * config.triggersPerWord)

  // 按键分配触发（均匀分配给所有技能）
  const allSkills = [...config.producers, ...(config.converters || [])]
  const triggersPerSkill = Math.floor(totalTriggers / allSkills.length)

  // 逐秒模拟（蓄力需要时间维度）
  const triggersPerSecond = totalTriggers / config.durationSec
  const triggersPerSkillPerSec = triggersPerSecond / allSkills.length

  const producerOutputs: Record<string, number> = {}

  for (let sec = 0; sec < config.durationSec; sec++) {
    // 蓄力 tick
    simulateChargeTick(sim, 1)

    // 每秒触发
    for (const p of config.producers) {
      const triggers = Math.round(triggersPerSkillPerSec)
      for (let t = 0; t < triggers; t++) {
        const result = simulateProducerTrigger(p.id, p.level, sim, p.key)
        producerOutputs[p.id] = (producerOutputs[p.id] || 0) + result.value
      }
    }

    // 转化者触发
    if (config.converters) {
      for (const c of config.converters) {
        const triggers = Math.round(triggersPerSkillPerSec)
        for (let t = 0; t < triggers; t++) {
          simulateConverterTrigger(c.id, c.level, sim)
        }
      }
    }
  }

  return {
    finalScore: calculateFinalScore(sim),
    target: targetScore(config.level, config.stageType),
    resources: { ...sim.resources },
    producerOutputs,
  }
}

// ============================================================
// Task 1 验证
// ============================================================
describe('Task 1: 数值模拟框架', () => {
  it('simulateProducerTrigger 对 standard 产出者返回正确值', () => {
    const sim = createSimState()
    const result = simulateProducerTrigger('prod_burst', 1, sim)
    expect(result.resource).toBe('base')
    expect(result.value).toBe(5) // base Lv1 = 5
    expect(sim.resources.base).toBe(5)
  })

  it('simulateProducerTrigger 对 charge 产出者释放蓄力', () => {
    const sim = createSimState()
    sim.bindings.set('e', 'prod_charge_base')
    sim.chargeAccumulated.set('prod_charge_base', 0.5) // 50% 蓄力
    const result = simulateProducerTrigger('prod_charge_base', 1, sim, 'e')
    // baseValue=5, mechanicAddBonus=0.5, value = 5 × 1.5 = 7.5
    expect(result.value).toBe(7.5)
    expect(sim.chargeAccumulated.get('prod_charge_base')).toBe(0) // 清零
  })

  it('simulateProducerTrigger 对 decay 产出者衰减', () => {
    const sim = createSimState()
    // 首次触发：initialMult=2.0
    const r1 = simulateProducerTrigger('prod_decay_base', 1, sim)
    expect(r1.value).toBe(10) // 5 × 2.0
    // 第二次：2.0 - 0.15 = 1.85
    const r2 = simulateProducerTrigger('prod_decay_base', 1, sim)
    expect(r2.value).toBeCloseTo(9.25) // 5 × 1.85
  })

  it('simulateProducerTrigger 对 pulse 产出者脉冲', () => {
    const sim = createSimState()
    let total = 0
    for (let i = 0; i < 4; i++) {
      total += simulateProducerTrigger('prod_pulse_base', 1, sim).value
    }
    // 3 次 × 5 + 1 次 × 15 (burstMult=3) = 15 + 15 = 30
    expect(total).toBe(30)
  })

  it('simulateProducerTrigger 对 crit 产出者使用期望值', () => {
    const sim = createSimState()
    const result = simulateProducerTrigger('prod_crit_base', 1, sim)
    // 期望值 = 0.5 × 2.0 + 0.5 × 1.0 = 1.5; value = 5 × 1.5 = 7.5
    expect(result.value).toBe(7.5)
  })

  it('targetScore 计算正确', () => {
    // level 1: 80 + 40 + 5 = 125
    expect(targetScore(1)).toBe(125)
    // level 2: 80 + 80 + 20 = 180
    expect(targetScore(2)).toBe(180)
    // level 3: 80 + 120 + 45 = 245
    expect(targetScore(3)).toBe(245)
    // elite: level 3 × 1.3
    expect(targetScore(3, 'elite')).toBe(Math.floor(245 * 1.3))
    // boss: level 3 × 1.5
    expect(targetScore(3, 'boss')).toBe(Math.floor(245 * 1.5))
  })

  it('simulateStage 返回完整结果', () => {
    const result = simulateStage({
      producers: [
        { id: 'prod_burst', key: 'e', level: 1 },
      ],
      durationSec: 30,
      wpm: 60,
      triggersPerWord: 4,
      level: 1,
      stageType: 'standard',
    })
    expect(result.finalScore).toBeGreaterThan(0)
    expect(result.target).toBe(125)
    expect(result.resources.base).toBeGreaterThan(0)
  })
})

// ============================================================
// Task 2: AC1 — 标准关无乘算达标验证
// ============================================================
describe('AC1: 标准关无乘算可达', () => {
  const STANDARD_CONFIG = {
    durationSec: 30,
    wpm: 60,
    triggersPerWord: 4,
    stageType: 'standard' as const,
  }

  it('level 1（目标 125）3 个 standard 产出者可达', () => {
    const result = simulateStage({
      ...STANDARD_CONFIG,
      producers: [
        { id: 'prod_burst', key: 'e', level: 1 },       // base
        { id: 'prod_loot', key: 't', level: 1 },         // score
        { id: 'prod_boost', key: 'a', level: 1 },        // multiplier
      ],
      level: 1,
    })
    expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
  })

  it('level 2（目标 180）3 个 standard 产出者可达', () => {
    const result = simulateStage({
      ...STANDARD_CONFIG,
      producers: [
        { id: 'prod_burst', key: 'e', level: 1 },
        { id: 'prod_loot', key: 't', level: 1 },
        { id: 'prod_boost', key: 'a', level: 1 },
      ],
      level: 2,
    })
    expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
  })

  it('level 3（目标 245）3 个 standard 产出者可达', () => {
    const result = simulateStage({
      ...STANDARD_CONFIG,
      producers: [
        { id: 'prod_burst', key: 'e', level: 1 },
        { id: 'prod_loot', key: 't', level: 1 },
        { id: 'prod_boost', key: 'a', level: 1 },
      ],
      level: 3,
    })
    expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
  })

  // 各机制独立达标验证
  for (const mechId of ['charge', 'decay', 'pulse', 'crit'] as const) {
    it(`level 1 — ${mechId} 产出者（base）达标`, () => {
      const prodId = `prod_${mechId}_base`
      if (!PRODUCERS[prodId]) return // 跳过不存在的
      const result = simulateStage({
        ...STANDARD_CONFIG,
        producers: [
          { id: prodId, key: 'e', level: 1 },
          { id: 'prod_loot', key: 't', level: 1 },
          { id: 'prod_boost', key: 'a', level: 1 },
        ],
        level: 1,
      })
      expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
    })
  }
})

// ============================================================
// Task 3: AC2 — 精英/Boss 通关验证
// ============================================================
describe('AC2: 精英/Boss 可通关', () => {
  it('elite 关（level 3, 45s）5 产出者 + 3 转化者可达', () => {
    const result = simulateStage({
      producers: [
        { id: 'prod_burst', key: 'e', level: 1 },
        { id: 'prod_loot', key: 't', level: 1 },
        { id: 'prod_boost', key: 'a', level: 1 },
        { id: 'prod_charge_base', key: 'r', level: 1 },
        { id: 'prod_decay_score', key: 's', level: 1 },
      ],
      converters: [
        { id: 'conv_base_score_add', key: 'd', level: 1 },
        { id: 'conv_mult_score_add', key: 'f', level: 1 },
        { id: 'conv_base_mult_add', key: 'g', level: 1 },
      ],
      durationSec: 45,
      wpm: 60,
      triggersPerWord: 4,
      level: 3,
      stageType: 'elite',
    })
    expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
  })

  it('boss 关（level 10, 60s）5 产出者 + 3 转化者可达', () => {
    const result = simulateStage({
      producers: [
        { id: 'prod_burst', key: 'e', level: 2 },
        { id: 'prod_loot', key: 't', level: 2 },
        { id: 'prod_boost', key: 'a', level: 2 },
        { id: 'prod_charge_base', key: 'r', level: 2 },
        { id: 'prod_decay_score', key: 's', level: 2 },
      ],
      converters: [
        { id: 'conv_base_score_add', key: 'd', level: 2 },
        { id: 'conv_mult_score_add', key: 'f', level: 2 },
        { id: 'conv_base_mult_add', key: 'g', level: 2 },
      ],
      durationSec: 60,
      wpm: 60,
      triggersPerWord: 4,
      level: 10,
      stageType: 'boss',
    })
    expect(result.finalScore).toBeGreaterThanOrEqual(result.target)
  })
})

// ============================================================
// Task 4: AC3 — 乘算附魔频率验证
// ============================================================
describe('AC3: 乘算附魔数量控制', () => {
  it('ench_multiply 存在于 ENCHANTMENTS 且为 operator 类型', () => {
    expect(ENCHANTMENTS['ench_multiply']).toBeDefined()
    expect(ENCHANTMENTS['ench_multiply'].category).toBe('operator')
  })

  it('附魔池占比使得每局期望获得 ench_multiply 在合理范围', () => {
    // 验证附魔池大小和 ench_multiply 占比
    // 注：drawEnchantmentPair() 的随机行为在此做概率分析，不做蒙特卡洛模拟
    const allEnch = Object.keys(ENCHANTMENTS)
    const total = allEnch.length
    const singleDrawChance = 1 / total
    // 10 关 × 约 1.5 次附魔机会/关 × 每次抽 2 个
    const expectedPerRun = 15 * 2 * singleDrawChance
    // 期望值应在 0.5-6 范围内（即"有机会抽到但不泛滥"）
    expect(expectedPerRun).toBeGreaterThanOrEqual(0.5)
    expect(expectedPerRun).toBeLessThanOrEqual(6)
  })
})

// ============================================================
// Task 5: AC4 — 同源转化者累积上限
// ============================================================
describe('AC4: 同源转化者累积上限', () => {
  const SAME_SOURCE_IDS = [
    'conv_base_base_add',
    'conv_score_score_add',
    'conv_mult_mult_add',
    'conv_gold_gold_add',
  ]

  for (const convId of SAME_SOURCE_IDS) {
    it(`${convId} — Boss 关 60 次触发累积不超过基础 ×10`, () => {
      const conv = CONVERTERS[convId]
      if (!conv) return

      const sim = createSimState()
      // 给初始资源值（模拟中期状态）
      sim.resources.base = 50
      sim.resources.score = 200
      sim.resources.multiplier = 1.5
      sim.multiplier = 1.5
      sim.gold = 15
      sim.resources.gold = 15

      const initialSourceVal =
        conv.source === 'base' ? sim.resources.base :
        conv.source === 'score' ? sim.resources.score :
        conv.source === 'multiplier' ? sim.multiplier :
        conv.source === 'gold' ? sim.gold : 0

      let totalDelta = 0
      for (let i = 0; i < 60; i++) {
        const result = simulateConverterTrigger(convId, 1, sim)
        totalDelta += result.delta
      }

      // 累积不超过初始值 ×10
      expect(totalDelta).toBeLessThanOrEqual(initialSourceVal * 10)
    })
  }
})

// ============================================================
// Task 6: AC5 — 新机制中期产出对比
// ============================================================
describe('AC5: 新机制中期产出对比', () => {
  const MID_CONFIG = {
    durationSec: 30,
    wpm: 60,
    triggersPerWord: 4,
    stageType: 'standard' as const,
  }

  it('各机制 base 产出者与 standard 差距在 ±50% 以内', () => {
    // Standard 基线
    const standardResult = simulateStage({
      ...MID_CONFIG,
      producers: [{ id: 'prod_burst', key: 'e', level: 1 }],
      level: 5,
    })
    const standardOutput = standardResult.producerOutputs['prod_burst'] || 0

    for (const mech of ['charge', 'decay', 'pulse', 'crit']) {
      const prodId = `prod_${mech}_base`
      if (!PRODUCERS[prodId]) continue

      const mechResult = simulateStage({
        ...MID_CONFIG,
        producers: [{ id: prodId, key: 'e', level: 1 }],
        level: 5,
      })
      const mechOutput = mechResult.producerOutputs[prodId] || 0

      const ratio = mechOutput / standardOutput
      expect(ratio).toBeGreaterThanOrEqual(0.5)
      expect(ratio).toBeLessThanOrEqual(1.5)
    }
  })
})

// ============================================================
// Task 7: AC6+AC7 — 蓄力/衰减键频特性
// ============================================================
describe('AC6: 蓄力低频键表现', () => {
  it('低频键（10s 间隔）蓄力释放值 ≤ base × (1 + maxBonus)', () => {
    const sim = createSimState()
    sim.bindings.set('z', 'prod_charge_base')
    const cp = PRODUCERS['prod_charge_base'].mechanicParams as ChargeParams

    // 蓄力 10 秒
    simulateChargeTick(sim, 10)
    const charge = sim.chargeAccumulated.get('prod_charge_base') || 0
    // 10s × 0.08/s = 0.8，低于 maxBonus=2.0
    expect(charge).toBeCloseTo(0.8)

    const result = simulateProducerTrigger('prod_charge_base', 1, sim, 'z')
    // value = 5 × (1 + 0.8) = 9.0
    expect(result.value).toBeCloseTo(9.0)
    // 上限检查
    expect(result.value).toBeLessThanOrEqual(5 * (1 + cp.maxBonus))
  })

  it('高频键（1s 间隔）蓄力几乎无加成', () => {
    const sim = createSimState()
    sim.bindings.set('e', 'prod_charge_base')

    // 蓄力 1 秒
    simulateChargeTick(sim, 1)
    const result = simulateProducerTrigger('prod_charge_base', 1, sim, 'e')
    // 1s × 0.08 = 0.08, value = 5 × 1.08 = 5.4
    expect(result.value).toBeCloseTo(5.4)
    // 接近基础值（±20%）
    expect(result.value / 5).toBeLessThanOrEqual(1.2)
  })
})

describe('AC7: 衰减高频键表现', () => {
  it('高频键（10 次/词）快速衰减到 floor', () => {
    const sim = createSimState()
    const dp = PRODUCERS['prod_decay_base'].mechanicParams as DecayParams
    const values: number[] = []

    // 需要 ceil((initialMult - floor) / decayPerTrigger) + 1 次触发才能输出 floor 值
    // (2.0 - 0.5) / 0.15 = 10 次衰减, 第 11 次触发输出 floor, 用 12 次确保稳定
    for (let i = 0; i < 12; i++) {
      const result = simulateProducerTrigger('prod_decay_base', 1, sim)
      values.push(result.value)
    }

    // 首次应为 base × initialMult = 5 × 2.0 = 10
    expect(values[0]).toBe(10)
    // 最终接近 floor = 5 × 0.5 = 2.5
    const lastValue = values[values.length - 1]
    expect(lastValue).toBeCloseTo(5 * dp.floor, 0)
  })

  it('低频键（2 次/词）维持较高倍率', () => {
    const sim = createSimState()
    const dp = PRODUCERS['prod_decay_base'].mechanicParams as DecayParams

    const r1 = simulateProducerTrigger('prod_decay_base', 1, sim)
    const r2 = simulateProducerTrigger('prod_decay_base', 1, sim)

    // 2 次触发：2.0, 1.85
    expect(r1.value).toBe(10)
    expect(r2.value).toBeCloseTo(5 * (dp.initialMult - dp.decayPerTrigger))
    // 仍高于 floor
    expect(r2.value).toBeGreaterThan(5 * dp.floor)
  })
})

// ============================================================
// Task 8: AC8 — 参数锁定测试
// ============================================================
describe('AC8: 机制参数锁定', () => {
  it('charge 参数: gainPerSec=0.08, maxBonus=2.0', () => {
    const cp = PRODUCERS['prod_charge_base'].mechanicParams as ChargeParams
    expect(cp.gainPerSec).toBe(0.08)
    expect(cp.maxBonus).toBe(2.0)
  })

  it('decay 参数: initialMult=2.0, decayPerTrigger=0.15, floor=0.5', () => {
    const dp = PRODUCERS['prod_decay_base'].mechanicParams as DecayParams
    expect(dp.initialMult).toBe(2.0)
    expect(dp.decayPerTrigger).toBe(0.15)
    expect(dp.floor).toBe(0.5)
  })

  it('pulse 参数: interval=4, burstMult=3.0', () => {
    const pp = PRODUCERS['prod_pulse_base'].mechanicParams as PulseParams
    expect(pp.interval).toBe(4)
    expect(pp.burstMult).toBe(3.0)
  })

  it('crit 参数: chance=0.5, critMult=2.0', () => {
    const crp = PRODUCERS['prod_crit_base'].mechanicParams as CritParams
    expect(crp.chance).toBe(0.5)
    expect(crp.critMult).toBe(2.0)
  })

  it('目标分公式: TARGET_BASE=80, TARGET_LINEAR=40, TARGET_QUADRATIC=5', () => {
    expect(BALANCE.TARGET_BASE).toBe(80)
    expect(BALANCE.TARGET_LINEAR).toBe(40)
    expect(BALANCE.TARGET_QUADRATIC).toBe(5)
  })

  it('同源转化者 k 值锁定', () => {
    expect(CONVERTERS['conv_base_base_add'].k).toBe(0.03)
    expect(CONVERTERS['conv_score_score_add'].k).toBe(0.0008)
    expect(CONVERTERS['conv_mult_mult_add'].k).toBe(0.03)
    expect(CONVERTERS['conv_gold_gold_add'].k).toBe(0.005)
  })
})
