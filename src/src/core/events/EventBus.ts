// ============================================
// 打字肉鸽 - 类型化事件总线
// ============================================

/**
 * 游戏事件类型定义
 * 所有事件必须在此定义以获得类型安全
 */
export interface GameEvents {
  // 输入事件
  'input:keypress': { key: string; timestamp: number }
  'input:keyup': { key: string; timestamp: number }
  'input:enabled': { enabled: boolean }

  // 词语事件
  'word:correct': { key: string; index: number }
  'word:error': { key: string; expected: string }
  'word:complete': { word: string; score: number; perfect: boolean }
  'word:new': { word: string; length: number }

  // 技能事件
  'skill:triggered': { key: string; skillId: string; type: 'passive' | 'active'; amplifierStacks?: number; growthValue?: number; critTriggered?: boolean; pulseTriggered?: boolean; questCompleted?: boolean; tabooNegative?: boolean }
  'skill:upgraded': { skillId: string; newLevel: number }
  // V2 极速施加事件（grant_haste 结算后逐 target 发射；sourceInstanceId 用于 rate-limit）
  'haste:granted': { skillId: string; amount: number; sourceInstanceId: string }
  // V2 极速消耗事件（玩家按下绑定键消耗 1 层成功后发射）
  'haste:consumed': { skillId: string; sourceKey: string }
  // V2 MARK 焦点事件（setFocus 单焦点寄存器改指/清除时发射；on_mark_granted / on_mark_lost 反应链用）
  'mark:granted': { skillId: string; sourceInstanceId: string }
  'mark:lost': { skillId: string; sourceInstanceId: string }
  // V2 结盟事件（addAlly 新成员入盟时发射；on_ally_joined 反应链用 · 集合单向只进，无 left 事件）
  'ally:joined': { skillId: string; sourceInstanceId: string }
  // V2 取代/吞噬事件（consume_skill 本场移除目标 skill 时发射；字母徽章刷新用）
  'skill:consumed': { skillId: string }

  // 效果队列事件
  'effect:queued': { effect: unknown; queueSize: number }
  'effect:dequeued': { effect: unknown }

  // 战斗事件
  'battle:start': { stageId: number }
  'battle:end': { result: 'win' | 'lose'; score: number }
  'battle:pause': Record<string, never>
  'battle:resume': Record<string, never>

  // 分数事件
  'score:update': { score: number; multiplier: number; combo: number }

  // 场景事件
  'scene:change': {
    from: string | null
    to: string | null
    action: 'push' | 'pop' | 'replace'
  }

  // 商店事件
  'shop:opened': Record<string, never>
  'shop:purchase': { itemId: string; type: 'skill' | 'relic' | 'pack'; price: number }
  'shop:skip': Record<string, never>
  // Tab 切换至工作台（terminal → workbench）· 教程驱动用
  'shop:workbench_entered': Record<string, never>
  // 工作台拖卡至键完成绑定 · 教程驱动用
  'skill:bound': { skillId: string; key: string }

  // 遗物事件
  'relic:effect': {
    trigger: string
    modifiers: {
      timeBonus: number
      scoreMultiplier: number
      goldMultiplier: number
      comboProtectionChance: number
      skillEffectBonus: number
      priceDiscount: number
      wordScoreBonus: number
      multiplierPerCombo: number
      goldFlat: number
    }
  }
  'relic:combo_protected': Record<string, never>
  'relic:acquired': { relicId: string }
  'relic:removed': { relicId: string }

  // 连击事件
  'combo:update': { combo: number }

  // 系统事件
  'save:complete': { success: boolean }
  'achievement:unlock': { achievementId: string }

  // Run 结束事件 (Story 5.5)
  'run:victory': {
    totalScore: number
    totalTime: number       // 毫秒
    stagesCleared: number   // 通关关卡数
    maxCombo: number
    perfectWords: number    // 无错误完成的词语数
    skills: string[]        // 已获得技能ID列表
    relics: string[]        // 已获得遗物ID列表
  }

  'run:gameover': {
    finalScore: number
    currentStage: number
    targetScore: number     // 未达成的目标分数
    skills: string[]
    relics: string[]
  }

  // Meta 预留事件 (Story 5.5 - 为 Epic 6 预留)
  'meta:check_unlocks': {
    runResult: 'victory' | 'gameover'
    runStats: {
      totalScore: number
      totalTime?: number
      stagesCleared: number
      maxCombo: number
      perfectWords?: number
      skills: string[]
      relics: string[]
    }
    cycle?: number                                                // Story 25.5
    skillLevels?: { id: string; level: number }[]                 // Story 25.5
    enchantments?: { skillId: string; enchantmentId: string }[]   // Story 25.5
    activeModifiers?: string[]                                    // Story 25.5
    classId?: string                                              // 职业 ID
    ascensionLevel?: number                                       // Story 54.1: Ascension 级别
  }

  // 场景导航事件 (Story 5.5)
  'scene:goto_menu': Record<string, never>
  'run:start': Record<string, never>

  // 音频事件 (Story 5.5 - 为 Epic 7 预留)
  'audio:play': { sound: string }

  // Meta 解锁通知事件 (Story 6.1)
  'meta:skill_unlocked': {
    skillId: string
  }

  'meta:relic_unlocked': {
    relicId: string
  }

  'meta:class_unlocked': {
    classId: string
  }

  'meta:achievement_unlocked': {
    achievement: {
      id: string
      name: string
      progress: number
      target: number
      unlocked: boolean
      unlockedAt?: number
    }
  }

  'meta:stats_updated': {
    stats: {
      totalRuns: number
      victories: number
      highestScore: number
      totalPlayTime: number
      totalKeystrokes: number
      totalWordsCompleted: number
      longestCombo: number
      perfectRunCount: number
    }
  }

  // 解锁通知事件 (Story 6.3)
  'unlock:new': {
    definition: unknown  // UnlockDefinition
    type: 'skill' | 'relic'
    targetId: string
    name: string
    description: string
  }

  // 解锁检查完成事件 (Story 6.3)
  'meta:unlocks_checked': {
    newUnlocks: unknown[]  // UnlockDefinition[]
    totalNewUnlocks: number
  }

  // Story 54.9: Ascension 升级事件
  'ascension:advanced': { classId: string; newLevel: number }

  // 请求保存事件 (Story 6.3)
  'meta:request_save': Record<string, never>

  // UI 通知事件 (Story 6.3)
  'ui:show_notification': {
    category: string
    title: string
    message: string
    icon: string
    duration: number
  }

  // 音频事件 (Story 7.1)
  'audio:sfx_play': {
    type: string
  }

  'audio:bgm_change': {
    trackId: string
  }

  'audio:volume_change': {
    volumes: {
      master: number
      sfx: number
      bgm: number
    }
  }

  'audio:mute_change': {
    muted: boolean
  }

  // 引导事件 (Story 39.3)
  'tutorial:step_shown': { stepId: string }
  'tutorial:step_completed': { stepId: string }
  'tutorial:time_up': Record<string, never>

  // 仪式附魔事件 (Story 41.1)
  'ritual:enchantment_applied': { skillId: string; enchantmentType: string; icon: string; name: string }
}

type EventHandler<T> = (data: T) => void

/**
 * 类型化事件总线
 * 确保所有事件发送和接收都有类型检查
 */
class TypedEventBus {
  private listeners = new Map<string, Set<EventHandler<unknown>>>()

  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  on<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>)

    // 返回取消订阅函数
    return () => this.off(event, handler)
  }

  /**
   * 取消订阅事件
   */
  off<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>
  ): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>)
  }

  /**
   * 发送事件
   */
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (err) {
          console.error(`EventBus: Error in handler for ${event}:`, err)
        }
      })
    }
  }

  /**
   * 一次性订阅（触发后自动取消）
   */
  once<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>
  ): () => void {
    const wrappedHandler: EventHandler<GameEvents[K]> = (data) => {
      this.off(event, wrappedHandler)
      handler(data)
    }
    return this.on(event, wrappedHandler)
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * 清除特定事件的所有监听器
   */
  clearEvent<K extends keyof GameEvents>(event: K): void {
    this.listeners.delete(event)
  }
}

// 导出单例实例
export const eventBus = new TypedEventBus()
