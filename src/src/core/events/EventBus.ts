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
  'skill:triggered': { key: string; skillId: string; type: 'passive' | 'active' }
  'skill:upgraded': { skillId: string; newLevel: number }

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
  'shop:purchase': { itemId: string; type: 'skill' | 'relic'; price: number }
  'shop:skip': Record<string, never>

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

  // 字母升级事件
  'letter:upgraded': { key: string; level: number }

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
