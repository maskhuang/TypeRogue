// ============================================
// 打字肉鸽 - KeyboardVisualizer 键盘可视化组件
// ============================================
// Story 4.4 Task 2-5: 键盘布局、绑定、高亮、动画

import { Container, Texture } from 'pixi.js'
import { KeyVisual } from './KeyVisual'
import type { EdgeMask } from './KeyVisual'
import { adjacencyMap } from '../../systems/skills/passive/AdjacencyMap'
import { eventBus } from '../../core/events/EventBus'
import type { GameEvents } from '../../core/events/EventBus'
import type { KeyTooltipData } from './KeyTooltip'
import { state } from '../../core/state'
import { PUNCTUATION_KEYBOARD_EXTENSION } from '../../core/constants'
import { AffixType, QUEST_ENCHANTMENT_DEFS } from '../../data/affixes'
import type { QuestEnchantmentDef } from '../../data/affixes'

/**
 * 键盘可视化组件
 *
 * 功能:
 * - 显示 QWERTY 26 键布局
 * - 管理所有 KeyVisual 子组件
 * - 处理输入高亮和相邻联动
 * - 响应技能触发事件
 */
// Story 40.7: 边缘掩码计算（纯函数，可测试）
export function computeEdgeMasks(
  skillKeyMap: Map<string, string[]>,
  keyRowCol: Map<string, { row: number; col: number }>
): Map<string, EdgeMask> {
  const result = new Map<string, EdgeMask>()

  // 初始化所有键为全部外部边
  for (const keyName of keyRowCol.keys()) {
    result.set(keyName, { top: true, right: true, bottom: true, left: true })
  }

  // 对每个多格技能，检查同行相邻关系
  for (const [, keys] of skillKeyMap) {
    if (keys.length <= 1) continue

    for (const keyName of keys) {
      const pos = keyRowCol.get(keyName)
      if (!pos) continue
      const mask = result.get(keyName)!

      for (const otherKey of keys) {
        if (otherKey === keyName) continue
        const otherPos = keyRowCol.get(otherKey)
        if (!otherPos) continue

        // 同行相邻：移除共享边
        if (otherPos.row === pos.row) {
          if (otherPos.col === pos.col + 1) mask.right = false
          if (otherPos.col === pos.col - 1) mask.left = false
        }
      }
    }
  }

  return result
}

// Story 40.7: 词条圆点分布（纯函数，可测试）
export function distributeAffixDots(totalAffixes: number, cellCount: number): number[] {
  if (cellCount <= 0 || totalAffixes <= 0) return Array(Math.max(0, cellCount)).fill(0)
  const base = Math.floor(totalAffixes / cellCount)
  const remainder = totalAffixes % cellCount
  return Array.from({ length: cellCount }, (_, i) => base + (i < remainder ? 1 : 0))
}

export class KeyboardVisualizer extends Container {
  private keys: Map<string, KeyVisual> = new Map()
  private currentPressed: string | null = null

  // Story 40.7: 技能键位分组 + 键位坐标
  private skillKeyGroups: Map<string, string[]> = new Map()
  private keyRowCol: Map<string, { row: number; col: number }> = new Map()
  private currentBindings: Map<string, string> = new Map()

  // 事件取消订阅函数
  private unsubKeypress: (() => void) | null = null
  private unsubKeyup: (() => void) | null = null
  private unsubSkillTriggered: (() => void) | null = null

  // 键盘布局定义（26 字母键）
  private static readonly ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ]

  // 扩展布局（含标点键，标点解放遗物激活时使用）
  private static readonly EXTENDED_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
  ]

  // 行偏移量 (模拟实际键盘错位)
  private static readonly ROW_OFFSETS = [0, 0.5, 1.0]

  constructor() {
    super()
    this.label = 'KeyboardVisualizer'

    this.createKeyboard()
  }

  /**
   * 创建键盘布局
   */
  private createKeyboard(): void {
    const hasPunctuationRelic = state?.player?.relics?.has('punctuation_liberation') ?? false;
    const rows = hasPunctuationRelic ? KeyboardVisualizer.EXTENDED_ROWS : KeyboardVisualizer.ROWS;
    rows.forEach((row, rowIndex) => {
      const offsetX = KeyboardVisualizer.ROW_OFFSETS[rowIndex] *
                      (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

      row.forEach((keyName, colIndex) => {
        const key = new KeyVisual(keyName)
        key.x = offsetX + colIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)
        key.y = rowIndex * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)

        this.keys.set(keyName, key)
        this.addChild(key)
        // Story 40.7: 记录键位行列坐标（大写）
        this.keyRowCol.set(keyName, { row: rowIndex, col: colIndex })
      })
    })
  }

  /**
   * 获取键盘可视化宽度（含行偏移和扩展键位）
   */
  getKeyboardWidth(): number {
    const hasPunctuationRelic = state?.player?.relics?.has('punctuation_liberation') ?? false
    const rows = hasPunctuationRelic ? KeyboardVisualizer.EXTENDED_ROWS : KeyboardVisualizer.ROWS
    let maxRight = 0
    rows.forEach((row, rowIndex) => {
      const offsetX = KeyboardVisualizer.ROW_OFFSETS[rowIndex] * (KeyVisual.KEY_SIZE + KeyVisual.KEY_GAP)
      const rowRight = offsetX + row.length * KeyVisual.KEY_SIZE + (row.length - 1) * KeyVisual.KEY_GAP
      if (rowRight > maxRight) maxRight = rowRight
    })
    return maxRight
  }

  /**
   * 获取键盘可视化高度
   */
  getKeyboardHeight(): number {
    const rowCount = KeyboardVisualizer.ROWS.length
    return rowCount * KeyVisual.KEY_SIZE + (rowCount - 1) * KeyVisual.KEY_GAP
  }

  /**
   * 获取按键数量
   */
  getKeyCount(): number {
    return this.keys.size
  }

  /**
   * 获取指定键的 KeyVisual
   */
  getKey(keyName: string): KeyVisual | undefined {
    return this.keys.get(keyName.toUpperCase())
  }

  /**
   * 同步技能绑定显示
   * @param bindings 技能绑定映射 Map<keyName, skillId>
   * @param skillTextures 技能图标映射 Map<skillId, Texture>
   * @param schoolColors 技能流派颜色映射 Map<skillId, color>
   */
  syncBindings(
    bindings: Map<string, string>,
    skillTextures?: Map<string, Texture>,
    schoolColors?: Map<string, number>
  ): void {
    // Story 40.7: 保存绑定引用 + 构建技能键位分组
    this.currentBindings = bindings
    this.skillKeyGroups.clear()
    for (const [key, skillId] of bindings) {
      const upper = key.toUpperCase()
      if (!this.skillKeyGroups.has(skillId)) {
        this.skillKeyGroups.set(skillId, [])
      }
      this.skillKeyGroups.get(skillId)!.push(upper)
    }

    // Story 40.7: 计算边缘掩码
    const edgeMasks = computeEdgeMasks(this.skillKeyGroups, this.keyRowCol)

    this.keys.forEach((keyVisual, keyName) => {
      const skillId = bindings.get(keyName.toLowerCase()) || bindings.get(keyName)

      // Story 40.7: 设置形状信息
      const skillKeys = skillId ? (this.skillKeyGroups.get(skillId) ?? []) : []
      const isMultiCell = skillKeys.length > 1
      const isAnchor = !isMultiCell || skillKeys[0] === keyName

      if (isMultiCell && skillId) {
        const affixSkill = state.affixSkills.get(skillId)
        const totalAffixes = affixSkill?.affixes.length ?? 0
        const dots = distributeAffixDots(totalAffixes, skillKeys.length)
        const cellIndex = skillKeys.indexOf(keyName)

        keyVisual.setShapeInfo({
          edgeMask: edgeMasks.get(keyName) ?? { top: true, right: true, bottom: true, left: true },
          isAnchor,
          affixDotsOverride: dots[cellIndex] ?? 0,
        })
      } else {
        // monomino / 未绑定：重置为默认
        keyVisual.setShapeInfo({
          edgeMask: { top: true, right: true, bottom: true, left: true },
          isAnchor: true,
        })
      }

      if (skillId && skillTextures) {
        const texture = skillTextures.get(skillId)
        keyVisual.setSkillIcon(texture || null)
      } else {
        keyVisual.setSkillIcon(null)
      }
      // 同步流派底色
      if (skillId && schoolColors) {
        keyVisual.setSkillSchoolColor(schoolColors.get(skillId) ?? null)
      } else {
        keyVisual.setSkillSchoolColor(null)
      }
      // 词条制技能：稀有度边框（圆点已由 setShapeInfo 处理多格分配）
      if (skillId && state.affixSkills.has(skillId)) {
        const affixSkill = state.affixSkills.get(skillId)!
        keyVisual.setRarityBorder(affixSkill.rarity)
        if (!isMultiCell) {
          keyVisual.setAffixDots(affixSkill.affixes.length)
        }
      } else {
        keyVisual.setRarityBorder(null)
        if (!isMultiCell) {
          keyVisual.setAffixDots(0)
        }
      }
    })
  }

  /**
   * 清除所有技能图标
   */
  clearBindings(): void {
    this.keys.forEach(keyVisual => {
      keyVisual.setSkillIcon(null)
    })
  }

  /**
   * 绑定事件监听
   */
  bindEvents(): void {
    this.unsubKeypress = eventBus.on('input:keypress', this.onKeyPress.bind(this))
    this.unsubKeyup = eventBus.on('input:keyup', this.onKeyUp.bind(this))
    this.unsubSkillTriggered = eventBus.on('skill:triggered', this.onSkillTriggered.bind(this))
  }

  /**
   * 解绑事件监听
   */
  unbindEvents(): void {
    if (this.unsubKeypress) {
      this.unsubKeypress()
      this.unsubKeypress = null
    }
    if (this.unsubKeyup) {
      this.unsubKeyup()
      this.unsubKeyup = null
    }
    if (this.unsubSkillTriggered) {
      this.unsubSkillTriggered()
      this.unsubSkillTriggered = null
    }
  }

  /**
   * 处理按键按下
   */
  private onKeyPress(data: GameEvents['input:keypress']): void {
    if (this.destroyed) return

    const keyUpper = data.key.toUpperCase()

    // 清除之前的高亮
    this.clearHighlights()

    const currentKey = this.keys.get(keyUpper)
    if (!currentKey) return

    this.currentPressed = keyUpper

    // Story 40.7: 多格技能 → 高亮整个形状
    const skillId = this.currentBindings.get(keyUpper.toLowerCase()) || this.currentBindings.get(keyUpper)
    const shapeKeys = skillId ? (this.skillKeyGroups.get(skillId) ?? []) : []
    const keysToPress = shapeKeys.length > 1 ? shapeKeys : [keyUpper]

    // 高亮形状内所有键
    const shapeKeySet = new Set(keysToPress)
    for (const k of keysToPress) {
      const kv = this.keys.get(k)
      if (kv) kv.setPressed(true)
    }

    // 相邻高亮：形状所有键的邻居并集，排除形状自身
    const adjacentSet = new Set<string>()
    for (const k of keysToPress) {
      const adj = adjacencyMap.getAdjacent(k)
      adj.forEach(a => {
        const au = a.toUpperCase()
        if (!shapeKeySet.has(au)) adjacentSet.add(au)
      })
    }
    for (const adjKey of adjacentSet) {
      const adjKv = this.keys.get(adjKey)
      if (adjKv) adjKv.setAdjacentHighlight(true)
    }
  }

  /**
   * 处理按键抬起
   */
  private onKeyUp(_data: GameEvents['input:keyup']): void {
    if (this.destroyed) return
    this.clearHighlights()
  }

  /**
   * 处理技能触发
   * Story 40.7: 多格技能 → 所有格子同步播放触发动画，叠层/成长/任务仅锚点键
   */
  private onSkillTriggered(data: GameEvents['skill:triggered']): void {
    if (this.destroyed) return

    const keyUpper = data.key.toUpperCase()

    // Story 40.7: 获取技能的所有键位
    const skillId = data.skillId || this.currentBindings.get(keyUpper.toLowerCase()) || this.currentBindings.get(keyUpper)
    const shapeKeys = skillId ? (this.skillKeyGroups.get(skillId) ?? []) : []
    const keysToAnimate = shapeKeys.length > 1 ? shapeKeys : [keyUpper]
    const anchorKey = shapeKeys.length > 1 ? shapeKeys[0] : keyUpper

    // 所有键位播放触发动画
    for (const k of keysToAnimate) {
      const kv = this.keys.get(k)
      if (kv) kv.playTriggerAnimation()
    }

    // 叠层/成长标签仅显示在锚点键
    const anchorKv = this.keys.get(anchorKey)
    if (anchorKv) {
      if (data.amplifierStacks != null) {
        anchorKv.setStackCount(data.amplifierStacks)
      }
      if (data.growthValue != null) {
        anchorKv.setGrowthLabel(data.growthValue)
      }
      // 词条制：同步任务进度环（仅锚点键）
      if (data.skillId && state.affixSkillStates.has(data.skillId)) {
        const rt = state.affixSkillStates.get(data.skillId)!
        const skill = state.affixSkills.get(data.skillId)
        if (skill && rt.questStacks > 0 && !rt.questTransformed) {
          const questEnch = skill.enchantmentIds
            .map((id: string) => QUEST_ENCHANTMENT_DEFS.find((d: QuestEnchantmentDef) => d.type === id))
            .find((d): d is QuestEnchantmentDef => d != null)
          if (questEnch) {
            anchorKv.setQuestProgress(rt.questStacks / questEnch.targetStacks)
          }
        } else if (rt.questTransformed) {
          anchorKv.setQuestProgress(0) // 质变完成，隐藏进度环
        }
      }
    }
  }

  /**
   * 同步所有字母底分显示
   */
  syncLetterScores(letterScores: Map<string, number>): void {
    this.keys.forEach((keyVisual, keyName) => {
      const score = letterScores.get(keyName.toLowerCase()) ?? 0
      keyVisual.setLetterScore(score)
    })
  }

  /**
   * 同步 tooltip 数据
   * @param tooltipMap Map<键名(小写), tooltip数据>
   */
  syncTooltips(tooltipMap: Map<string, KeyTooltipData>): void {
    this.keys.forEach((keyVisual, keyName) => {
      const data = tooltipMap.get(keyName.toLowerCase()) ?? null
      keyVisual.setTooltipData(data)
    })
  }

  /**
   * 同步增幅者叠层显示
   * @param stacks 增幅者叠层 Map<ampId, stackCount>
   * @param bindings 技能绑定 Map<keyName, skillId>
   */
  syncAmplifierStacks(stacks: Map<string, number>, bindings: Map<string, string>): void {
    this.keys.forEach((keyVisual, keyName) => {
      const skillId = bindings.get(keyName.toLowerCase()) || bindings.get(keyName)
      if (skillId) {
        const count = stacks.get(skillId) || 0
        keyVisual.setStackCount(count)
      } else {
        keyVisual.setStackCount(0)
      }
    })
  }

  /**
   * 清除所有高亮状态
   */
  clearHighlights(): void {
    this.keys.forEach(keyVisual => {
      keyVisual.setPressed(false)
      keyVisual.setAdjacentHighlight(false)
    })
    this.currentPressed = null
  }

  /**
   * 获取当前按下的键
   */
  getCurrentPressed(): string | null {
    return this.currentPressed
  }

  /**
   * 手动设置按键高亮（用于测试）
   * Story 40.7: 多格技能 → 高亮整个形状
   */
  highlightKey(keyName: string): void {
    const keyUpper = keyName.toUpperCase()
    this.clearHighlights()

    const key = this.keys.get(keyUpper)
    if (!key) return

    this.currentPressed = keyUpper

    // Story 40.7: 多格技能 → 高亮整个形状
    const skillId = this.currentBindings.get(keyUpper.toLowerCase()) || this.currentBindings.get(keyUpper)
    const shapeKeys = skillId ? (this.skillKeyGroups.get(skillId) ?? []) : []
    const keysToPress = shapeKeys.length > 1 ? shapeKeys : [keyUpper]

    const shapeKeySet = new Set(keysToPress)
    for (const k of keysToPress) {
      const kv = this.keys.get(k)
      if (kv) kv.setPressed(true)
    }

    const adjacentSet = new Set<string>()
    for (const k of keysToPress) {
      const adj = adjacencyMap.getAdjacent(k)
      adj.forEach(a => {
        const au = a.toUpperCase()
        if (!shapeKeySet.has(au)) adjacentSet.add(au)
      })
    }
    for (const adjKey of adjacentSet) {
      const adjKv = this.keys.get(adjKey)
      if (adjKv) adjKv.setAdjacentHighlight(true)
    }
  }

  /**
   * 每帧更新（更新所有键的动画）
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    // Story 41-5: 同步 Charge 蓄力进度条（每帧更新）
    this.syncChargeProgress()

    this.keys.forEach(keyVisual => {
      keyVisual.update(dt)
    })
  }

  /**
   * Story 41-5: 同步所有 Charge 技能键的蓄力进度条
   */
  private syncChargeProgress(): void {
    for (const [keyName, keyVisual] of this.keys) {
      const skillId = this.currentBindings.get(keyName.toLowerCase()) || this.currentBindings.get(keyName)
      if (!skillId) {
        if (keyVisual.getChargeProgressRatio() > 0) keyVisual.setChargeProgress(0)
        continue
      }
      const skill = state.affixSkills.get(skillId)
      const rt = state.affixSkillStates.get(skillId)
      if (!skill || !rt) {
        if (keyVisual.getChargeProgressRatio() > 0) keyVisual.setChargeProgress(0)
        continue
      }
      const chargeAffix = skill.affixes.find(a => a.type === AffixType.Charge)
      if (!chargeAffix) {
        if (keyVisual.getChargeProgressRatio() > 0) keyVisual.setChargeProgress(0)
        continue
      }
      const maxBonus = chargeAffix.maxBonus ?? 1
      keyVisual.setChargeProgress(Math.min(rt.chargeAccumulated / maxBonus, 1))
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.unbindEvents()
    // 清除引用（super.destroy 会处理子组件销毁）
    this.keys.clear()
    super.destroy({ children: true })
  }
}
