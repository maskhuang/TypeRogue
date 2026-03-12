// ============================================
// 打字肉鸽 - KeyVisual 单元测试
// ============================================

import { describe, it, expect, beforeEach } from 'vitest'
import { Container, Texture } from 'pixi.js'
import { KeyVisual } from '../../../../src/ui/keyboard/KeyVisual'

describe('KeyVisual', () => {
  let keyVisual: KeyVisual

  beforeEach(() => {
    keyVisual = new KeyVisual('Q')
  })

  describe('初始化', () => {
    it('应该有正确的 label', () => {
      expect(keyVisual.label).toBe('Key_Q')
    })

    it('应该继承自 Container', () => {
      expect(keyVisual).toBeInstanceOf(Container)
    })

    it('应该返回正确的键名', () => {
      expect(keyVisual.getKeyName()).toBe('Q')
    })

    it('应该创建背景、流派底色和标签', () => {
      // 背景 + 流派底色 + 标签 = 3 个子元素
      expect(keyVisual.children.length).toBe(3)
    })

    it('初始状态不应有技能图标', () => {
      expect(keyVisual.hasSkillIcon()).toBe(false)
    })

    it('初始状态不应被按下', () => {
      expect(keyVisual.getPressed()).toBe(false)
    })

    it('初始状态不应有相邻高亮', () => {
      expect(keyVisual.getAdjacentHighlight()).toBe(false)
    })

    it('初始状态不应在播放动画', () => {
      expect(keyVisual.getIsAnimating()).toBe(false)
    })
  })

  describe('尺寸常量', () => {
    it('KEY_SIZE 应该是 48', () => {
      expect(KeyVisual.KEY_SIZE).toBe(48)
    })

    it('KEY_GAP 应该是 4', () => {
      expect(KeyVisual.KEY_GAP).toBe(4)
    })

    it('BORDER_RADIUS 应该是 6', () => {
      expect(KeyVisual.BORDER_RADIUS).toBe(6)
    })
  })

  describe('setSkillIcon', () => {
    it('设置图标后 hasSkillIcon 应该返回 true', () => {
      const texture = Texture.WHITE
      keyVisual.setSkillIcon(texture)
      expect(keyVisual.hasSkillIcon()).toBe(true)
    })

    it('清除图标后 hasSkillIcon 应该返回 false', () => {
      const texture = Texture.WHITE
      keyVisual.setSkillIcon(texture)
      keyVisual.setSkillIcon(null)
      expect(keyVisual.hasSkillIcon()).toBe(false)
    })

    it('设置图标应该增加子元素', () => {
      const initialCount = keyVisual.children.length
      const texture = Texture.WHITE
      keyVisual.setSkillIcon(texture)
      expect(keyVisual.children.length).toBe(initialCount + 1)
    })

    it('清除图标应该减少子元素', () => {
      const texture = Texture.WHITE
      keyVisual.setSkillIcon(texture)
      const countWithIcon = keyVisual.children.length
      keyVisual.setSkillIcon(null)
      expect(keyVisual.children.length).toBe(countWithIcon - 1)
    })
  })

  describe('setPressed', () => {
    it('应该更新按下状态', () => {
      keyVisual.setPressed(true)
      expect(keyVisual.getPressed()).toBe(true)
    })

    it('应该能够切换回未按下状态', () => {
      keyVisual.setPressed(true)
      keyVisual.setPressed(false)
      expect(keyVisual.getPressed()).toBe(false)
    })

    it('重复设置相同状态不应有问题', () => {
      keyVisual.setPressed(true)
      keyVisual.setPressed(true)
      expect(keyVisual.getPressed()).toBe(true)
    })
  })

  describe('setAdjacentHighlight', () => {
    it('应该更新相邻高亮状态', () => {
      keyVisual.setAdjacentHighlight(true)
      expect(keyVisual.getAdjacentHighlight()).toBe(true)
    })

    it('应该能够切换回无高亮状态', () => {
      keyVisual.setAdjacentHighlight(true)
      keyVisual.setAdjacentHighlight(false)
      expect(keyVisual.getAdjacentHighlight()).toBe(false)
    })
  })

  describe('playTriggerAnimation', () => {
    it('应该启动动画状态', () => {
      keyVisual.playTriggerAnimation()
      expect(keyVisual.getIsAnimating()).toBe(true)
    })

    it('应该设置动画缩放值大于 1', () => {
      keyVisual.playTriggerAnimation()
      expect(keyVisual.getAnimationScale()).toBeGreaterThan(1.0)
    })
  })

  describe('update (动画)', () => {
    it('不在动画时 update 不应改变状态', () => {
      const initialScale = keyVisual.getAnimationScale()
      keyVisual.update(0.1)
      expect(keyVisual.getAnimationScale()).toBe(initialScale)
    })

    it('动画中 update 应该逐渐恢复缩放', () => {
      keyVisual.playTriggerAnimation()
      const initialScale = keyVisual.getAnimationScale()
      keyVisual.update(0.1)
      expect(keyVisual.getAnimationScale()).toBeLessThan(initialScale)
    })

    it('多次 update 后动画应该完成', () => {
      keyVisual.playTriggerAnimation()
      for (let i = 0; i < 20; i++) {
        keyVisual.update(0.1)
      }
      expect(keyVisual.getIsAnimating()).toBe(false)
      expect(keyVisual.getAnimationScale()).toBe(1.0)
    })

    it('缩放不应该小于 1', () => {
      keyVisual.playTriggerAnimation()
      for (let i = 0; i < 50; i++) {
        keyVisual.update(0.1)
      }
      expect(keyVisual.getAnimationScale()).toBeGreaterThanOrEqual(1.0)
    })
  })

  describe('不同键名', () => {
    it('应该支持不同的键名', () => {
      const keyW = new KeyVisual('W')
      expect(keyW.getKeyName()).toBe('W')
      expect(keyW.label).toBe('Key_W')
    })

    it('应该支持所有字母键', () => {
      const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      keys.forEach(key => {
        const kv = new KeyVisual(key)
        expect(kv.getKeyName()).toBe(key)
      })
    })
  })

  describe('setLetterScore', () => {
    it('初始底分应该为 0', () => {
      expect(keyVisual.getLetterScore()).toBe(0)
    })

    it('应该更新底分', () => {
      keyVisual.setLetterScore(3)
      expect(keyVisual.getLetterScore()).toBe(3)
    })

    it('设置底分 > 0 应该增加 scoreLabel 子元素', () => {
      const initialCount = keyVisual.children.length
      keyVisual.setLetterScore(2)
      expect(keyVisual.children.length).toBe(initialCount + 1)
    })

    it('底分从正数变回 0 应该移除 scoreLabel', () => {
      keyVisual.setLetterScore(2)
      const countWithScore = keyVisual.children.length
      keyVisual.setLetterScore(0)
      expect(keyVisual.children.length).toBe(countWithScore - 1)
    })

    it('重复设置相同底分不应重复操作', () => {
      keyVisual.setLetterScore(5)
      const count = keyVisual.children.length
      keyVisual.setLetterScore(5)
      expect(keyVisual.children.length).toBe(count)
    })
  })

  describe('setSkillSchoolColor', () => {
    it('初始流派底色应该为 null', () => {
      expect(keyVisual.getSkillSchoolColor()).toBeNull()
    })

    it('应该更新流派底色', () => {
      keyVisual.setSkillSchoolColor(0xff6b6b)
      expect(keyVisual.getSkillSchoolColor()).toBe(0xff6b6b)
    })

    it('应该能清除流派底色', () => {
      keyVisual.setSkillSchoolColor(0xff6b6b)
      keyVisual.setSkillSchoolColor(null)
      expect(keyVisual.getSkillSchoolColor()).toBeNull()
    })

    it('重复设置相同颜色不应重复操作', () => {
      keyVisual.setSkillSchoolColor(0xff6b6b)
      keyVisual.setSkillSchoolColor(0xff6b6b)
      expect(keyVisual.getSkillSchoolColor()).toBe(0xff6b6b)
    })
  })

  describe('setTooltipData', () => {
    it('初始 tooltip 数据应该为 null', () => {
      expect(keyVisual.getTooltipData()).toBeNull()
    })

    it('应该存储 tooltip 数据', () => {
      const data = { letter: 'q', score: 3, frequency: 15 }
      keyVisual.setTooltipData(data)
      expect(keyVisual.getTooltipData()).toBe(data)
    })

    it('应该能清除 tooltip 数据', () => {
      keyVisual.setTooltipData({ letter: 'q', score: 3, frequency: 15 })
      keyVisual.setTooltipData(null)
      expect(keyVisual.getTooltipData()).toBeNull()
    })

    it('应该存储包含技能信息的数据', () => {
      const data = {
        letter: 'q',
        score: 3,
        frequency: 15,
        skill: {
          name: '爆发',
          icon: '💥',
          description: '造成大量伤害',
          level: 2,
          school: '爆发',
          schoolCssClass: 'school-burst',
        },
      }
      keyVisual.setTooltipData(data)
      expect(keyVisual.getTooltipData()?.skill?.name).toBe('爆发')
    })
  })

  describe('setRarityBorder', () => {
    it('初始稀有度应该为 null', () => {
      expect(keyVisual.getRarity()).toBeNull()
    })

    it('应该设置稀有度为 0 (普通/白)', () => {
      keyVisual.setRarityBorder(0)
      expect(keyVisual.getRarity()).toBe(0)
    })

    it('应该设置稀有度为 1 (魔法/蓝)', () => {
      keyVisual.setRarityBorder(1)
      expect(keyVisual.getRarity()).toBe(1)
    })

    it('应该设置稀有度为 2 (稀有/黄)', () => {
      keyVisual.setRarityBorder(2)
      expect(keyVisual.getRarity()).toBe(2)
    })

    it('应该设置稀有度为 3 (传说/橙)', () => {
      keyVisual.setRarityBorder(3)
      expect(keyVisual.getRarity()).toBe(3)
    })

    it('应该能清除稀有度', () => {
      keyVisual.setRarityBorder(2)
      keyVisual.setRarityBorder(null)
      expect(keyVisual.getRarity()).toBeNull()
    })

    it('重复设置相同稀有度不应重复操作', () => {
      keyVisual.setRarityBorder(1)
      keyVisual.setRarityBorder(1)
      expect(keyVisual.getRarity()).toBe(1)
    })
  })

  describe('setAffixDots', () => {
    it('初始词条数应该为 0', () => {
      expect(keyVisual.getAffixDotCount()).toBe(0)
    })

    it('应该设置 1 个词条点', () => {
      keyVisual.setAffixDots(1)
      expect(keyVisual.getAffixDotCount()).toBe(1)
    })

    it('应该设置 3 个词条点', () => {
      keyVisual.setAffixDots(3)
      expect(keyVisual.getAffixDotCount()).toBe(3)
    })

    it('应该限制最大为 3', () => {
      keyVisual.setAffixDots(5)
      expect(keyVisual.getAffixDotCount()).toBe(3)
    })

    it('应该限制最小为 0', () => {
      keyVisual.setAffixDots(-1)
      expect(keyVisual.getAffixDotCount()).toBe(0)
    })

    it('设置词条数 > 0 应该增加 Graphics 子元素', () => {
      const initialCount = keyVisual.children.length
      keyVisual.setAffixDots(2)
      expect(keyVisual.children.length).toBe(initialCount + 1)
    })

    it('词条数从正数变回 0 应该移除 Graphics', () => {
      keyVisual.setAffixDots(2)
      const countWithDots = keyVisual.children.length
      keyVisual.setAffixDots(0)
      expect(keyVisual.children.length).toBe(countWithDots - 1)
    })
  })

  describe('setQuestProgress', () => {
    it('初始进度应该为 0', () => {
      expect(keyVisual.getQuestProgressRatio()).toBe(0)
    })

    it('应该设置进度为 0.5', () => {
      keyVisual.setQuestProgress(0.5)
      expect(keyVisual.getQuestProgressRatio()).toBe(0.5)
    })

    it('应该限制最大为 1', () => {
      keyVisual.setQuestProgress(1.5)
      expect(keyVisual.getQuestProgressRatio()).toBe(1)
    })

    it('应该限制最小为 0', () => {
      keyVisual.setQuestProgress(-0.5)
      expect(keyVisual.getQuestProgressRatio()).toBe(0)
    })

    it('设置进度 > 0 应该增加 Graphics 子元素', () => {
      const initialCount = keyVisual.children.length
      keyVisual.setQuestProgress(0.5)
      expect(keyVisual.children.length).toBe(initialCount + 1)
    })

    it('进度从正数变回 0 应该移除 Graphics', () => {
      keyVisual.setQuestProgress(0.5)
      const countWithProgress = keyVisual.children.length
      keyVisual.setQuestProgress(0)
      expect(keyVisual.children.length).toBe(countWithProgress - 1)
    })
  })

  describe('playFlashEffect', () => {
    it('应该启动闪光动画', () => {
      keyVisual.playFlashEffect(0xffffff, 0.8)
      expect(keyVisual.getFlashAlpha()).toBe(0.8)
      expect(keyVisual.getIsAnimating()).toBe(true)
    })

    it('闪光应该随时间衰减', () => {
      keyVisual.playFlashEffect(0xffffff, 1.0)
      keyVisual.update(0.1)
      expect(keyVisual.getFlashAlpha()).toBeLessThan(1.0)
    })

    it('多次 update 后闪光应该完全消失', () => {
      keyVisual.playFlashEffect(0xffffff, 1.0)
      for (let i = 0; i < 20; i++) {
        keyVisual.update(0.1)
      }
      expect(keyVisual.getFlashAlpha()).toBe(0)
    })
  })

  describe('destroy', () => {
    it('应该正确销毁组件', () => {
      keyVisual.destroy()
      expect(keyVisual.destroyed).toBe(true)
    })

    it('应该清理子元素', () => {
      keyVisual.destroy()
      expect(keyVisual.children.length).toBe(0)
    })

    it('应该正确销毁带图标的组件', () => {
      keyVisual.setSkillIcon(Texture.WHITE)
      keyVisual.destroy()
      expect(keyVisual.destroyed).toBe(true)
    })

    it('应该正确销毁带词条信息的组件', () => {
      keyVisual.setRarityBorder(2)
      keyVisual.setAffixDots(3)
      keyVisual.setQuestProgress(0.5)
      keyVisual.destroy()
      expect(keyVisual.destroyed).toBe(true)
    })
  })
})
