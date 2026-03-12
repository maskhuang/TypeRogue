// ============================================
// 打字肉鸽 - KeyTooltip 词条制信息测试
// ============================================
// Story 35.11 Task 5.3: 悬停面板包含词条名和参数

import { describe, it, expect } from 'vitest'
import type { AffixTooltipInfo, KeyTooltipData } from '../../../../src/ui/keyboard/KeyTooltip'

describe('KeyTooltip affix 数据结构', () => {
  it('AffixTooltipInfo 包含 typeName 和 paramSummary', () => {
    const info: AffixTooltipInfo = {
      typeName: '暴击',
      paramSummary: '30% ×2.0',
    }
    expect(info.typeName).toBe('暴击')
    expect(info.paramSummary).toBe('30% ×2.0')
  })

  it('KeyTooltipData.skill 支持 affixInfo 字段', () => {
    const data: KeyTooltipData = {
      letter: 'q',
      skill: {
        name: '烈焰',
        icon: '🔥',
        description: '产出基数',
        level: 2,
        school: '稀有',
        schoolCssClass: 'rarity-2',
        affixInfo: [
          { typeName: '暴击', paramSummary: '30% ×2.0' },
          { typeName: '脉冲', paramSummary: '每5次 ×1.5' },
        ],
      },
    }
    expect(data.skill!.affixInfo).toHaveLength(2)
    expect(data.skill!.affixInfo![0].typeName).toBe('暴击')
    expect(data.skill!.affixInfo![1].typeName).toBe('脉冲')
  })

  it('KeyTooltipData.skill 支持 questProgress 字段', () => {
    const data: KeyTooltipData = {
      skill: {
        name: '烈焰',
        icon: '🔥',
        description: '产出基数',
        level: 1,
        school: '普通',
        schoolCssClass: 'rarity-0',
        questProgress: '任务: 5/8 层 (完成 2 次)',
      },
    }
    expect(data.skill!.questProgress).toBe('任务: 5/8 层 (完成 2 次)')
  })

  it('KeyTooltipData.skill 支持 apprenticeGrowth 字段', () => {
    const data: KeyTooltipData = {
      skill: {
        name: '烈焰',
        icon: '🔥',
        description: '产出基数',
        level: 1,
        school: '普通',
        schoolCssClass: 'rarity-0',
        apprenticeGrowth: '学徒: +12.5%',
      },
    }
    expect(data.skill!.apprenticeGrowth).toBe('学徒: +12.5%')
  })
})
