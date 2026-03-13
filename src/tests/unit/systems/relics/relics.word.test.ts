// ============================================
// 打字肉鸽 - 单词/词库系统遗物行为测试 (Story 36.7)
// ============================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { state } from '../../../../src/core/state'
import {
  WORD_COLLECTION_GOLD,
  SHORT_SPRINT_RATE,
  LONG_WORD_TIME_BONUS,
  checkWordCollection,
  getCollectedWords,
  getShortSprintBonus,
  checkLongWordMaster,
  setWordDealerFlag,
  consumeWordDealerFreeRefresh,
  resetWordRelicRunState,
  initWordRelicBehaviors,
  isPunctuationRelicActive,
} from '../../../../src/systems/relics/WordRelicBehaviors'
import { clearBehaviorHandlers, getRegisteredBehaviors } from '../../../../src/systems/relics/RelicPipeline'
import { garbleWord, setRelicGarbleActive, isRelicGarbleActive, isGarbleActive, getActiveGarbleChars, transformWordForModifier } from '../../../../src/data/bossModifiers'
import { RELIC_GARBLE_CHARS, PUNCTUATION_KEYS } from '../../../../src/core/constants'
import { isSymmetric, isAdjacent, ROW_MAP, COLUMN_MAP, FINGER_MAP, HAND_MAP } from '../../../../src/data/keyboardTopology'

// === 辅助 ===
function clearRelics(): void {
  state.player.relics.clear()
  state.player.relicStates = {}
}

describe('单词/词库系统遗物行为 (Story 36.7)', () => {
  beforeEach(() => {
    clearRelics()
    clearBehaviorHandlers()
    resetWordRelicRunState()
  })

  afterEach(() => {
    setRelicGarbleActive(false)
  })

  // === 常量校验 ===
  describe('常量', () => {
    it('WORD_COLLECTION_GOLD = 3', () => {
      expect(WORD_COLLECTION_GOLD).toBe(3)
    })
    it('SHORT_SPRINT_RATE = 0.20', () => {
      expect(SHORT_SPRINT_RATE).toBe(0.20)
    })
    it('LONG_WORD_TIME_BONUS = 1', () => {
      expect(LONG_WORD_TIME_BONUS).toBe(1)
    })
  })

  // === 词汇收藏 (word_collection) ===
  describe('词汇收藏 (word_collection)', () => {
    it('无遗物 → 0', () => {
      expect(checkWordCollection('HELLO')).toBe(0)
    })

    it('有遗物 + 首次单词 → 3', () => {
      state.player.relics.add('word_collection')
      expect(checkWordCollection('HELLO')).toBe(WORD_COLLECTION_GOLD)
    })

    it('有遗物 + 重复单词 → 0', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('HELLO')
      expect(checkWordCollection('HELLO')).toBe(0)
    })

    it('大小写不敏感', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('Hello')
      expect(checkWordCollection('HELLO')).toBe(0)
      expect(checkWordCollection('hello')).toBe(0)
    })

    it('不同单词各自触发', () => {
      state.player.relics.add('word_collection')
      expect(checkWordCollection('HELLO')).toBe(WORD_COLLECTION_GOLD)
      expect(checkWordCollection('WORLD')).toBe(WORD_COLLECTION_GOLD)
      expect(checkWordCollection('HELLO')).toBe(0) // 重复
    })

    it('跨关保持：不 resetWordRelicRunState 则 Set 不清空', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('HELLO')
      // 模拟跨关（不调用 resetWordRelicRunState）
      expect(checkWordCollection('HELLO')).toBe(0) // 仍然记得
      expect(checkWordCollection('WORLD')).toBe(WORD_COLLECTION_GOLD) // 新词有效
    })

    it('resetWordRelicRunState 清空收藏 Set', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('HELLO')
      expect(getCollectedWords().size).toBe(1)
      resetWordRelicRunState()
      expect(getCollectedWords().size).toBe(0)
      expect(checkWordCollection('HELLO')).toBe(WORD_COLLECTION_GOLD) // 可重新收藏
    })

    it('getCollectedWords 返回正确内容', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('CAT')
      checkWordCollection('DOG')
      const words = getCollectedWords()
      expect(words.has('CAT')).toBe(true)
      expect(words.has('DOG')).toBe(true)
      expect(words.size).toBe(2)
    })
  })

  // === 短词冲刺 (short_sprint) ===
  describe('短词冲刺 (short_sprint)', () => {
    it('无遗物 → 0', () => {
      expect(getShortSprintBonus(3)).toBe(0)
    })

    it('有遗物 + 长度≤4 → 0.20', () => {
      state.player.relics.add('short_sprint')
      expect(getShortSprintBonus(1)).toBe(SHORT_SPRINT_RATE)
      expect(getShortSprintBonus(3)).toBe(SHORT_SPRINT_RATE)
      expect(getShortSprintBonus(4)).toBe(SHORT_SPRINT_RATE)
    })

    it('有遗物 + 长度>4 → 0', () => {
      state.player.relics.add('short_sprint')
      expect(getShortSprintBonus(5)).toBe(0)
      expect(getShortSprintBonus(8)).toBe(0)
    })

    it('边界：长度=4 → 有，长度=5 → 无', () => {
      state.player.relics.add('short_sprint')
      expect(getShortSprintBonus(4)).toBe(SHORT_SPRINT_RATE)
      expect(getShortSprintBonus(5)).toBe(0)
    })
  })

  // === 长词达人 (long_word_master) ===
  describe('长词达人 (long_word_master)', () => {
    it('无遗物 → 0', () => {
      expect(checkLongWordMaster(8)).toBe(0)
    })

    it('有遗物 + 长度≥6 → 1', () => {
      state.player.relics.add('long_word_master')
      expect(checkLongWordMaster(6)).toBe(LONG_WORD_TIME_BONUS)
      expect(checkLongWordMaster(10)).toBe(LONG_WORD_TIME_BONUS)
    })

    it('有遗物 + 长度<6 → 0', () => {
      state.player.relics.add('long_word_master')
      expect(checkLongWordMaster(5)).toBe(0)
      expect(checkLongWordMaster(3)).toBe(0)
    })

    it('边界：长度=5 → 无，长度=6 → 有', () => {
      state.player.relics.add('long_word_master')
      expect(checkLongWordMaster(5)).toBe(0)
      expect(checkLongWordMaster(6)).toBe(LONG_WORD_TIME_BONUS)
    })
  })

  // === 词语经销商 (word_dealer) ===
  describe('词语经销商 (word_dealer)', () => {
    it('无遗物 → setWordDealerFlag 返回 false 且不写 state', () => {
      expect(setWordDealerFlag()).toBe(false)
      expect(state.player.relicStates['word_dealer']).toBeUndefined()
    })

    it('无遗物 → consumeWordDealerFreeRefresh 返回 false', () => {
      expect(consumeWordDealerFreeRefresh()).toBe(false)
    })

    it('有遗物 + 无 flag → false', () => {
      state.player.relics.add('word_dealer')
      expect(consumeWordDealerFreeRefresh()).toBe(false)
    })

    it('有遗物 + setWordDealerFlag 返回 true', () => {
      state.player.relics.add('word_dealer')
      expect(setWordDealerFlag()).toBe(true)
      expect(state.player.relicStates['word_dealer']).toBe(1)
    })

    it('有遗物 + 有 flag → true，消费后 flag 清除', () => {
      state.player.relics.add('word_dealer')
      setWordDealerFlag()
      expect(state.player.relicStates['word_dealer']).toBe(1)
      expect(consumeWordDealerFreeRefresh()).toBe(true)
      expect(state.player.relicStates['word_dealer']).toBe(0)
    })

    it('消费后二次调用 → false', () => {
      state.player.relics.add('word_dealer')
      setWordDealerFlag()
      consumeWordDealerFreeRefresh()
      expect(consumeWordDealerFreeRefresh()).toBe(false)
    })

    it('多次卖词只设一次 flag（覆盖写入）', () => {
      state.player.relics.add('word_dealer')
      setWordDealerFlag()
      setWordDealerFlag()
      expect(state.player.relicStates['word_dealer']).toBe(1)
      expect(consumeWordDealerFreeRefresh()).toBe(true)
      expect(consumeWordDealerFreeRefresh()).toBe(false) // 只能免费一次
    })
  })

  // === 行为注册 ===
  describe('initWordRelicBehaviors', () => {
    it('注册 word_dealer 和 punctuation_liberation 行为', () => {
      initWordRelicBehaviors()
      const handlers = getRegisteredBehaviors()
      expect(handlers).toContain('word_dealer')
      expect(handlers).toContain('punctuation_liberation')
    })
  })

  // === 标点解放 (punctuation_liberation) ===
  describe('标点解放 (punctuation_liberation)', () => {
    it('isPunctuationRelicActive — 无遗物返回 false', () => {
      expect(isPunctuationRelicActive()).toBe(false)
    })

    it('isPunctuationRelicActive — 有遗物返回 true', () => {
      state.player.relics.add('punctuation_liberation')
      expect(isPunctuationRelicActive()).toBe(true)
    })

    // garbleWord 自定义 chars
    it('garbleWord 使用自定义字符集', () => {
      const result = garbleWord('HELLO', 1.0, ',.;/')
      // rate=1.0 保证每个字母后都插入
      const punctChars = result.split('').filter(c => ',.;/'.includes(c))
      expect(punctChars.length).toBeGreaterThanOrEqual(1)
      // 所有插入的标点都来自指定字符集
      for (const ch of punctChars) {
        expect(',.;/').toContain(ch)
      }
    })

    it('garbleWord 默认字符集使用 GARBLE_CHARS', () => {
      const result = garbleWord('HELLO', 1.0)
      // 插入的标点来自默认字符集
      const punctChars = result.split('').filter(c => !/[A-Z]/.test(c))
      expect(punctChars.length).toBeGreaterThanOrEqual(1)
    })

    // setRelicGarbleActive / isRelicGarbleActive
    it('setRelicGarbleActive 状态管理', () => {
      expect(isRelicGarbleActive()).toBe(false)
      setRelicGarbleActive(true)
      expect(isRelicGarbleActive()).toBe(true)
      expect(isGarbleActive()).toBe(true)
      setRelicGarbleActive(false)
      expect(isRelicGarbleActive()).toBe(false)
    })

    it('getActiveGarbleChars 遗物激活时返回遗物字符集', () => {
      setRelicGarbleActive(true)
      expect(getActiveGarbleChars()).toBe(RELIC_GARBLE_CHARS)
      setRelicGarbleActive(false)
      expect(getActiveGarbleChars()).toBe('.,;:!?')
    })

    // 标点键拓扑
    it('标点键行列映射正确', () => {
      expect(ROW_MAP[';']).toBe(1)
      expect(ROW_MAP[',']).toBe(2)
      expect(ROW_MAP['.']).toBe(2)
      expect(ROW_MAP['/']).toBe(2)
      expect(COLUMN_MAP[';']).toBe(9)
      expect(COLUMN_MAP[',']).toBe(7)
      expect(COLUMN_MAP['.']).toBe(8)
      expect(COLUMN_MAP['/']).toBe(9)
    })

    it('标点键手指映射正确', () => {
      expect(HAND_MAP[';']).toBe('right')
      expect(HAND_MAP[',']).toBe('right')
      expect(HAND_MAP['.']).toBe('right')
      expect(HAND_MAP['/']).toBe('right')
      expect(FINGER_MAP[';']).toBe(7) // 小指
      expect(FINGER_MAP[',']).toBe(5) // 中指
      expect(FINGER_MAP['.']).toBe(6) // 无名指
      expect(FINGER_MAP['/']).toBe(7) // 小指
    })

    it('标点键对称位正确', () => {
      expect(isSymmetric('a', ';')).toBe(true)
      expect(isSymmetric('z', '/')).toBe(true)
      expect(isSymmetric('x', '.')).toBe(true)
      expect(isSymmetric('c', ',')).toBe(true)
    })

    it('标点键邻接关系正确', () => {
      expect(isAdjacent(';', 'l')).toBe(true)
      expect(isAdjacent(';', 'p')).toBe(true)
      expect(isAdjacent(',', 'm')).toBe(true)
      expect(isAdjacent(',', 'k')).toBe(true)
      expect(isAdjacent('.', ',')).toBe(true)
      expect(isAdjacent('.', '/')).toBe(true)
      expect(isAdjacent('/', '.')).toBe(true)
      expect(isAdjacent('/', ';')).toBe(true)
    })
  })

  // === 遗物组合交互 ===
  describe('遗物组合交互', () => {
    it('短词冲刺 + 邻键之力可叠加（各自返回独立加成）', () => {
      state.player.relics.add('short_sprint')
      const sprint = getShortSprintBonus(3)
      expect(sprint).toBe(SHORT_SPRINT_RATE) // 0.20
      // 叠加计算由 skills.ts 完成，此处仅验证独立返回
    })

    it('词汇收藏 + 长词达人同词触发', () => {
      state.player.relics.add('word_collection')
      state.player.relics.add('long_word_master')
      // 6字母新词：两个都触发
      const goldReward = checkWordCollection('BATTLE')
      const timeReward = checkLongWordMaster(6)
      expect(goldReward).toBe(WORD_COLLECTION_GOLD)
      expect(timeReward).toBe(LONG_WORD_TIME_BONUS)
    })
  })

  // === 遗物乱码优先级 ===
  describe('遗物乱码 vs Boss 乱码优先级', () => {
    it('遗物乱码激活时 transformWordForModifier 仅使用遗物字符集', () => {
      setRelicGarbleActive(true)
      // 多次运行以提高覆盖率（随机插入）
      for (let i = 0; i < 20; i++) {
        const result = transformWordForModifier('HELLO')
        const nonLetters = result.split('').filter(c => !/[A-Z]/.test(c))
        for (const ch of nonLetters) {
          expect(RELIC_GARBLE_CHARS).toContain(ch)
        }
      }
      setRelicGarbleActive(false)
    })
  })

  // === 词汇收藏序列化 (AC6) ===
  describe('词汇收藏序列化 (AC6)', () => {
    it('collectedWords 存储在 state.player 中', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('HELLO')
      checkWordCollection('WORLD')
      expect(state.player.collectedWords.has('HELLO')).toBe(true)
      expect(state.player.collectedWords.has('WORLD')).toBe(true)
      expect(state.player.collectedWords.size).toBe(2)
    })

    it('resetWordRelicRunState 清空 state.player.collectedWords', () => {
      state.player.relics.add('word_collection')
      checkWordCollection('TEST')
      expect(state.player.collectedWords.size).toBe(1)
      resetWordRelicRunState()
      expect(state.player.collectedWords.size).toBe(0)
    })
  })
})
