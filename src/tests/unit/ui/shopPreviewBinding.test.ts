// ============================================
// Story 60.1: 工作台多格绑定 + IN-tray 集成测试
// ============================================
// 验证 shopPreview 的拖拽 onDrop 路径走 bindShapeToKeys，
// 不直接读写 state.player.bindings；displaced 技能正确回 inbox；
// 卸下整体释放所有占位键；inbox 满时不溢出。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, resetState } from '../../../src/core/state'
import {
  applyBindFromInbox,
  applyUnbindKeyToInbox,
  handleWorkbenchKeyRotation,
} from '../../../src/ui/shapePreview'
import { getShapeRotationCount, mapShapeToKeys } from '../../../src/data/skillShapes'
import type { AffixSkillInstance } from '../../../src/data/affixes'

// 避免在 node 测试环境意外加载音频
vi.mock('../../../src/effects/sound', () => ({
  playSound: vi.fn(),
}))

// handleWorkbenchKeyRotation 内部 querySelector .kb-key — node 环境无 document
// stub 一个返回 null 的 querySelector，让函数走"找不到 DOM 就跳过 classList"分支
const stubDocument = {
  querySelector: () => null,
  getElementById: () => null,
  querySelectorAll: () => [] as unknown[],
}

// ===== Helpers =====

function makeAffixSkill(
  id: string,
  shapeId: string,
  rotation: number = 0,
  rarity: 0 | 1 | 2 | 3 = 0,
): AffixSkillInstance {
  // 仅填本测试用到的字段，其余字段在 binding 路径上不会读
  return {
    id,
    name: id,
    icon: '◇',
    rarity,
    resource: 'base',
    baseValues: [1, 2, 3],
    level: 1,
    affixes: [],
    enchantmentIds: [],
    shapeId,
    rotation,
  } as unknown as AffixSkillInstance
}

function seedSkillInInbox(skill: AffixSkillInstance): void {
  state.affixSkills.set(skill.id, skill)
  state.player.skills.set(skill.id, { level: skill.level })
  state.player.inbox.push(skill.id)
}

// ===== Tests =====

describe('Story 60.1 · shopPreview binding integration', () => {
  beforeEach(() => {
    resetState()
  })

  it('AC8 · drop tetromino-T 到 s 时，4 个键全部映射到同一 skillId', () => {
    const skill = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    seedSkillInInbox(skill)

    const result = applyBindFromInbox(skill.id, 's')
    expect(result.success).toBe(true)
    // tetromino_T cells = [[0,0],[0,1],[0,2],[1,1]]
    // anchor 's'（home row, col index 1）→ s, d, f + 一个 home+1 行下方键
    const occupiedKeys = [...state.player.bindings.entries()]
      .filter(([, id]) => id === skill.id)
      .map(([k]) => k)
    expect(occupiedKeys).toHaveLength(4)
    // 锚点 s 必在
    expect(occupiedKeys).toContain('s')
    // 不应该有其它 skillId 占据这 4 键
    for (const k of occupiedKeys) {
      expect(state.player.bindings.get(k)).toBe(skill.id)
    }
    // inbox 中已移除该技能
    expect(state.player.inbox).not.toContain(skill.id)
  })

  it('AC7 · drop 落在已绑定 monomino 上 → displaced 技能回 inbox', () => {
    const tetro = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    const mono = makeAffixSkill('skill_mono', 'monomino', 0, 0)
    seedSkillInInbox(mono)
    // 先把 mono 绑到 d（属于 tetromino-T anchor=s 的覆盖范围）
    applyBindFromInbox(mono.id, 'd')
    expect(state.player.bindings.get('d')).toBe(mono.id)
    expect(state.player.inbox).not.toContain(mono.id)

    // 再把 tetromino-T 拖到 s，会覆盖 d
    seedSkillInInbox(tetro)
    const result = applyBindFromInbox(tetro.id, 's')
    expect(result.success).toBe(true)
    expect(result.displacedSkillIds).toContain(mono.id)

    // displaced 的 mono 应该回到 inbox
    expect(state.player.inbox).toContain(mono.id)
    expect(state.player.bindings.get('d')).toBe(tetro.id)
  })

  it('AC6 · 拖回 IN-tray = 整体卸下所有占位键，inbox 仅 +1', () => {
    const tetro = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    seedSkillInInbox(tetro)
    applyBindFromInbox(tetro.id, 's')
    expect(state.player.inbox).not.toContain(tetro.id)
    const occupiedBefore = [...state.player.bindings.entries()]
      .filter(([, id]) => id === tetro.id)
      .map(([k]) => k)
    expect(occupiedBefore.length).toBe(4)

    // 从任意一个占位键拖回 IN-tray
    const removed = applyUnbindKeyToInbox(occupiedBefore[2])
    expect(removed).toBe(tetro.id)

    // 4 键全空
    for (const k of occupiedBefore) {
      expect(state.player.bindings.has(k)).toBe(false)
    }
    // inbox 仅 +1（不重复）
    const inboxCount = state.player.inbox.filter(id => id === tetro.id).length
    expect(inboxCount).toBe(1)
  })

  it('AC7 边界 · INBOX 满时 displaced 技能仍能进 inbox（容量恰好释放）', () => {
    // 5 个 filler 占满 inbox（容量 5）
    for (let i = 0; i < 5; i++) {
      const filler = makeAffixSkill(`filler_${i}`, 'monomino', 0, 0)
      seedSkillInInbox(filler)
    }
    expect(state.player.inbox).toHaveLength(5)

    // victim 直接绑 'd'（不经 inbox），inbox 仍 5/5
    const victim = makeAffixSkill('victim', 'monomino', 0, 0)
    state.affixSkills.set(victim.id, victim)
    state.player.skills.set(victim.id, { level: 1 })
    applyBindFromInbox(victim.id, 'd')
    expect(state.player.bindings.get('d')).toBe(victim.id)
    expect(state.player.inbox).toHaveLength(5)

    // tetro 进 inbox 之前，必须先腾一个槽（这是 UI 阻止 BUY 时的前置条件）
    const tetro = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    state.affixSkills.set(tetro.id, tetro)
    state.player.skills.set(tetro.id, { level: 1 })
    state.player.inbox.shift()              // 腾 1 个空槽
    state.player.inbox.push(tetro.id)        // 现在 inbox = [filler_1..filler_4, tetro]
    expect(state.player.inbox).toHaveLength(5)

    // applyBindFromInbox 移除 tetro（idx=4）→ inbox 长度 4 → 绑定后 displaced victim 进 inbox → 长度 5
    const result = applyBindFromInbox(tetro.id, 's')
    expect(result.success).toBe(true)
    expect(result.displacedSkillIds).toContain(victim.id)
    expect(state.player.inbox).toHaveLength(5)              // 严格 5（不溢出，不少装）
    expect(state.player.inbox).toContain(victim.id)
    expect(state.player.inbox).not.toContain(tetro.id)      // tetro 已落键
  })

  it('AC1 · 不存在直接 bindings.set 旁路：bind 失败时 skillId 退回 inbox', () => {
    // tetromino-I 4 横连，anchor 'p' 在第一行最右，所有旋转态都越界
    // 用循环验证全部 rotation 都 fail，避免依赖某个具体 rotation 索引
    const rotCount = getShapeRotationCount('tetromino_I')
    let allRotationsFail = true
    for (let r = 0; r < rotCount; r++) {
      if (mapShapeToKeys('p', 'tetromino_I', r, false)) {
        allRotationsFail = false
        break
      }
    }
    expect(allRotationsFail).toBe(true) // 前置条件：anchor 'p' 任何旋转都越界

    const wide = makeAffixSkill('skill_tI', 'tetromino_I', 0, 3)
    seedSkillInInbox(wide)

    const result = applyBindFromInbox(wide.id, 'p')
    expect(result.success).toBe(false)
    for (const id of state.player.bindings.values()) {
      expect(id).not.toBe(wide.id)
    }
    expect(state.player.inbox).toContain(wide.id)
  })
})

describe('Story 60.1 · handleWorkbenchKeyRotation (review fix H1 + L5)', () => {
  beforeEach(() => {
    resetState()
    vi.stubGlobal('document', stubDocument)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rotation 成功 · 调用 syncKeys，不调用 syncInbox（无 displaced）', () => {
    // T 形 + anchor 's' + rotation 0：占 s/d/f + 一个下排键
    const tetro = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    seedSkillInInbox(tetro)
    applyBindFromInbox(tetro.id, 's')
    const initialOccupied = [...state.player.bindings.entries()]
      .filter(([, id]) => id === tetro.id)
      .map(([k]) => k)
    expect(initialOccupied).toHaveLength(4)

    const syncKeys = vi.fn()
    const syncInbox = vi.fn()

    handleWorkbenchKeyRotation('s', false, syncKeys, syncInbox)

    expect(syncKeys).toHaveBeenCalledTimes(1)
    expect(syncInbox).not.toHaveBeenCalled() // 无 displaced，inbox 不变
    expect(tetro.rotation).not.toBe(0)        // rotation 已变更
    // 仍是 4 个键全占
    const newOccupied = [...state.player.bindings.entries()]
      .filter(([, id]) => id === tetro.id)
      .map(([k]) => k)
    expect(newOccupied).toHaveLength(4)
  })

  it('H1 修复 · rotation displace 相邻技能 → displaced 技能进 inbox', () => {
    // 准备：tetromino-T at 's' 占 s/d/f/x；victim mono 在 's' rotation 转后会落到的某键
    // 用 s/d/f/x 的相邻键 'g'（home 行右邻）作为 victim — 不在 rotation=0 范围
    // 旋转后某态会扫到 'g'？为了避免依赖具体 rotation 的几何，构造场景：
    //   - tetro at anchor 's' rotation=0 占 4 键中包含 's','d','f','x'
    //   - victim 占 'g' (rotation 0 不覆盖)
    //   - 强制旋转 → 新形状可能仍不覆盖 'g'，那旋转就不 displace
    // 更可靠：直接测试 rotation 后会覆盖的某键。skill_tT cells = [[0,0],[0,1],[0,2],[1,1]]
    //   rotation 0 → s,d,f,x（cell[1,1] 在 home+1 行 col=1 = x）
    //   rotation 1 (90°) → cells = [[0,0],[1,0],[2,0],[1,1]] 等纵向 + 一突出
    //   anchor 's' (row 1 col 1) → 列上展开会落到 w/s/x（垂直）+ d
    // 我们 displace 的目标键 = rotation 1 覆盖范围里、rotation 0 不覆盖的键
    // 简化：旋转后 mapShapeToKeys 一定包含 anchor 's'，但其他键不同。
    // 实测策略：先 bind tetro，记录初始占据；尝试旋转；旋转后看新占据；
    // 把 victim 占据"新占据 - 旧占据"的某一个键，再旋转一次（回到原始或下一态）即可触发 displace
    const tetro = makeAffixSkill('skill_tT', 'tetromino_T', 0, 3)
    seedSkillInInbox(tetro)
    applyBindFromInbox(tetro.id, 's')
    const occ0 = new Set([...state.player.bindings.entries()]
      .filter(([, id]) => id === tetro.id).map(([k]) => k))
    const initialRotation = tetro.rotation ?? 0

    // 探一次旋转看新占据
    const noopSync = () => {}
    handleWorkbenchKeyRotation('s', false, noopSync, noopSync)
    const occ1 = new Set([...state.player.bindings.entries()]
      .filter(([, id]) => id === tetro.id).map(([k]) => k))

    // 找一个 occ0 - occ1（旋回时新占据的、当前空的键）作为 victim 落点
    const victimKey = [...occ0].find(k => !occ1.has(k))
    expect(victimKey).toBeDefined() // 必须存在差集，否则旋转没改变形态

    const victim = makeAffixSkill('victim', 'monomino', 0, 0)
    state.affixSkills.set(victim.id, victim)
    state.player.skills.set(victim.id, { level: 1 })
    state.player.bindings.set(victimKey!, victim.id)

    // 现在反向旋转回 initialRotation — 新形态会回到 occ0，覆盖 victim
    const syncKeys = vi.fn()
    const syncInbox = vi.fn()
    handleWorkbenchKeyRotation('s', true, syncKeys, syncInbox)

    expect(syncKeys).toHaveBeenCalledTimes(1)
    expect(syncInbox).toHaveBeenCalledTimes(1)         // displaced 触发 inbox 刷新
    expect(state.player.inbox).toContain(victim.id)    // victim 必须在 inbox（H1 修复）
    expect(state.player.bindings.get(victimKey!)).toBe(tetro.id) // victim 的位置已被 tetro 占
  })

  it('monomino 不旋转 · 早返回，syncKeys/syncInbox 不调用', () => {
    const mono = makeAffixSkill('skill_mono', 'monomino', 0, 0)
    seedSkillInInbox(mono)
    applyBindFromInbox(mono.id, 's')

    const syncKeys = vi.fn()
    const syncInbox = vi.fn()
    handleWorkbenchKeyRotation('s', false, syncKeys, syncInbox)

    expect(syncKeys).not.toHaveBeenCalled()
    expect(syncInbox).not.toHaveBeenCalled()
    expect(state.player.bindings.get('s')).toBe(mono.id)
  })

  it('未绑定的键右键 · 早返回 noop', () => {
    const syncKeys = vi.fn()
    const syncInbox = vi.fn()
    handleWorkbenchKeyRotation('s', false, syncKeys, syncInbox)

    expect(syncKeys).not.toHaveBeenCalled()
    expect(syncInbox).not.toHaveBeenCalled()
  })
})
