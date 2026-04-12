import { FONT_PIXEL } from '../theme'
// ============================================
// 打字肉鸽 - KeyVisual 单键可视化组件
// ============================================
// Story 4.4 Task 1: 单键组件

import { Container, Graphics, Text, TextStyle, Texture, Sprite, FederatedPointerEvent } from 'pixi.js'
import { keyTooltip } from './KeyTooltip'
import type { KeyTooltipData } from './KeyTooltip'
import type { SkillRarity } from '../../data/affixes'
import { RARITY_COLORS } from '../../data/affixes'

// Story 40.7: 多格技能边缘掩码
export interface EdgeMask {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export interface ShapeInfo {
  edgeMask: EdgeMask
  isAnchor: boolean
  affixDotsOverride?: number
}

/**
 * 单个按键可视化组件
 *
 * 功能:
 * - 显示键名 (Q, W, E...)
 * - 显示绑定的技能图标
 * - 支持多种高亮状态 (默认、按下、相邻)
 * - 支持触发动画
 * - 支持多格技能边缘合并 (Story 40.7)
 */
export class KeyVisual extends Container {
  private background: Graphics
  private schoolOverlay: Graphics
  private keyLabel: Text
  private scoreLabel: Text | null = null
  private stackLabel: Text | null = null
  private growthLabel: Text | null = null
  private skillIcon: Sprite | null = null
  private keyName: string

  // 词条制状态
  private currentRarity: SkillRarity | null = null
  private affixDotCount: number = 0
  private questProgressRatio: number = 0
  private affixDotsGraphics: Graphics | null = null
  private questProgressGraphics: Graphics | null = null

  // Story 41-5: Charge 蓄力进度条
  private chargeProgressRatio: number = 0
  private chargeProgressGraphics: Graphics | null = null
  private chargeFullPulsePhase: number = 0

  // Story 40.7: 多格技能形状信息
  private edgeMask: EdgeMask = { top: true, right: true, bottom: true, left: true }
  private isAnchorCell: boolean = true

  // 动画状态
  private animationScale: number = 1.0
  private animationAlpha: number = 1.0
  private isAnimating: boolean = false

  // 特效动画状态
  private flashColor: number | null = null
  private flashAlpha: number = 0
  private flashGraphics: Graphics | null = null

  // 动画速度常量
  private static readonly SCALE_RECOVERY_SPEED = 2.0
  private static readonly ALPHA_RECOVERY_SPEED = 3.0
  private static readonly FLASH_DECAY_SPEED = 4.0

  // 当前状态
  private isPressed: boolean = false
  private isAdjacentHighlighted: boolean = false
  private letterScore: number = 0
  private schoolColor: number | null = null
  private tooltipData: KeyTooltipData | null = null

  // 尺寸常量
  static readonly KEY_SIZE = 48
  static readonly KEY_GAP = 4
  static readonly BORDER_RADIUS = 0
  static readonly BORDER_WIDTH = 2

  // 颜色常量
  private static readonly COLOR_DEFAULT = 0x2a2a2a
  private static readonly COLOR_PRESSED = 0x4a4a4a
  private static readonly COLOR_ADJACENT = 0x3a3a5a
  private static readonly COLOR_BORDER_DEFAULT = 0x444444
  private static readonly COLOR_BORDER_PRESSED = 0xffffff
  private static readonly COLOR_BORDER_ADJACENT = 0x6666aa
  private static readonly COLOR_BORDER_SCORE_LOW = 0x88bbdd   // 淡青 (1-2)
  private static readonly COLOR_BORDER_SCORE_MID = 0x4488cc   // 蓝色 (3-5)
  private static readonly COLOR_BORDER_SCORE_HIGH = 0xffd700  // 金色 (6+)

  private static readonly LABEL_STYLE = new TextStyle({
    fontFamily: FONT_PIXEL,
    fontSize: 12,
    fontWeight: 'bold',
    fill: 0xffffff
  })

  constructor(keyName: string) {
    super()
    this.keyName = keyName
    this.label = `Key_${keyName}`

    this.background = new Graphics()
    this.addChild(this.background)

    this.schoolOverlay = new Graphics()
    this.addChild(this.schoolOverlay)

    this.keyLabel = new Text({
      text: keyName,
      style: KeyVisual.LABEL_STYLE
    })
    this.addChild(this.keyLabel)

    this.drawBackground()
    this.positionLabel()

    // 启用交互（tooltip 悬停）
    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.on('pointerover', this.onPointerOver, this)
    this.on('pointerout', this.onPointerOut, this)
  }

  /**
   * Story 40.7: 设置多格形状信息
   */
  setShapeInfo(info: ShapeInfo): void {
    const maskChanged = this.edgeMask.top !== info.edgeMask.top ||
      this.edgeMask.right !== info.edgeMask.right ||
      this.edgeMask.bottom !== info.edgeMask.bottom ||
      this.edgeMask.left !== info.edgeMask.left
    const anchorChanged = this.isAnchorCell !== info.isAnchor

    this.edgeMask = { ...info.edgeMask }
    this.isAnchorCell = info.isAnchor

    if (info.affixDotsOverride != null) {
      this.setAffixDots(info.affixDotsOverride)
    }

    // 非锚点键隐藏键名标签
    this.keyLabel.visible = this.isAnchorCell

    if (maskChanged || anchorChanged) {
      this.drawBackground()
    }
  }

  /**
   * Story 40.7: 获取边缘掩码（测试用）
   */
  getEdgeMask(): EdgeMask {
    return { ...this.edgeMask }
  }

  /**
   * Story 40.7: 获取是否锚点键（测试用）
   */
  getIsAnchor(): boolean {
    return this.isAnchorCell
  }

  /**
   * 绘制背景
   */
  private drawBackground(): void {
    this.background.clear()

    // 确定背景颜色
    let bgColor = KeyVisual.COLOR_DEFAULT
    let borderColor = KeyVisual.COLOR_BORDER_DEFAULT

    if (this.isPressed) {
      bgColor = KeyVisual.COLOR_PRESSED
      borderColor = KeyVisual.COLOR_BORDER_PRESSED
    } else if (this.isAdjacentHighlighted) {
      bgColor = KeyVisual.COLOR_ADJACENT
      borderColor = KeyVisual.COLOR_BORDER_ADJACENT
    } else if (this.currentRarity !== null) {
      borderColor = parseInt(RARITY_COLORS[this.currentRarity].replace('#', ''), 16)
    } else if (this.letterScore >= 6) {
      borderColor = KeyVisual.COLOR_BORDER_SCORE_HIGH
    } else if (this.letterScore >= 3) {
      borderColor = KeyVisual.COLOR_BORDER_SCORE_MID
    } else if (this.letterScore >= 1) {
      borderColor = KeyVisual.COLOR_BORDER_SCORE_LOW
    }

    const borderWidth = this.letterScore >= 6
      ? KeyVisual.BORDER_WIDTH + 1
      : KeyVisual.BORDER_WIDTH

    const S = KeyVisual.KEY_SIZE
    const isAllExternal = this.edgeMask.top && this.edgeMask.right &&
      this.edgeMask.bottom && this.edgeMask.left

    if (isAllExternal) {
      // 原始渲染：roundRect + stroke（monomino / 单格技能 完全不变）
      this.background.roundRect(0, 0, S, S, KeyVisual.BORDER_RADIUS)
      this.background.fill({ color: bgColor })
      this.background.stroke({ color: borderColor, width: borderWidth })
    } else {
      // 多格渲染：平面填充 + 选择性边框
      this.background.rect(0, 0, S, S)
      this.background.fill({ color: bgColor })

      // 非锚点键叠加稀有度色调
      if (!this.isAnchorCell && this.currentRarity !== null) {
        const rarityHex = parseInt(RARITY_COLORS[this.currentRarity].replace('#', ''), 16)
        this.background.rect(borderWidth, borderWidth, S - borderWidth * 2, S - borderWidth * 2)
        this.background.fill({ color: rarityHex, alpha: 0.12 })
      }

      // 绘制外部边框
      if (this.edgeMask.top) {
        this.background.rect(0, 0, S, borderWidth)
        this.background.fill({ color: borderColor })
      }
      if (this.edgeMask.bottom) {
        this.background.rect(0, S - borderWidth, S, borderWidth)
        this.background.fill({ color: borderColor })
      }
      if (this.edgeMask.left) {
        this.background.rect(0, 0, borderWidth, S)
        this.background.fill({ color: borderColor })
      }
      if (this.edgeMask.right) {
        this.background.rect(S - borderWidth, 0, borderWidth, S)
        this.background.fill({ color: borderColor })
      }
    }
  }

  /**
   * 定位键名标签到底部中央
   */
  private positionLabel(): void {
    // 使用估算宽度避免 Node 测试环境 Text.width 不可用问题
    // 单个大写字母约为字体大小的 0.6 倍宽度 (12px * 0.6 ≈ 7px)
    const charWidth = 7
    const labelWidth = this.keyName.length * charWidth
    this.keyLabel.x = (KeyVisual.KEY_SIZE - labelWidth) / 2
    this.keyLabel.y = KeyVisual.KEY_SIZE - 16
  }

  /**
   * 获取键名
   */
  getKeyName(): string {
    return this.keyName
  }

  /**
   * 设置绑定的技能图标
   * @param iconTexture 图标纹理，null 表示清除图标
   */
  setSkillIcon(iconTexture: Texture | null): void {
    // 清除现有图标
    if (this.skillIcon) {
      this.removeChild(this.skillIcon)
      this.skillIcon.destroy()
      this.skillIcon = null
    }

    // Story 40.7: 非锚点键不显示图标
    if (!this.isAnchorCell) return

    // 设置新图标
    if (iconTexture) {
      this.skillIcon = new Sprite(iconTexture)
      // 图标大小为按键的 60%，居中显示
      const iconSize = KeyVisual.KEY_SIZE * 0.6
      this.skillIcon.width = iconSize
      this.skillIcon.height = iconSize
      this.skillIcon.x = (KeyVisual.KEY_SIZE - iconSize) / 2
      this.skillIcon.y = 4 // 顶部留一点边距
      this.addChild(this.skillIcon)
    }
  }

  /**
   * 检查是否有技能图标
   */
  hasSkillIcon(): boolean {
    return this.skillIcon !== null
  }

  /**
   * 设置按下状态
   */
  setPressed(pressed: boolean): void {
    if (this.isPressed !== pressed) {
      this.isPressed = pressed
      this.drawBackground()
    }
  }

  /**
   * 获取按下状态
   */
  getPressed(): boolean {
    return this.isPressed
  }

  /**
   * 设置相邻高亮状态
   */
  setAdjacentHighlight(highlight: boolean): void {
    if (this.isAdjacentHighlighted !== highlight) {
      this.isAdjacentHighlighted = highlight
      this.drawBackground()
    }
  }

  /**
   * 获取相邻高亮状态
   */
  getAdjacentHighlight(): boolean {
    return this.isAdjacentHighlighted
  }

  /**
   * 设置字母底分
   */
  setLetterScore(score: number): void {
    if (this.letterScore !== score) {
      this.letterScore = score
      this.drawBackground()
      this.updateScoreLabel()
    }
  }

  /**
   * 获取字母底分
   */
  getLetterScore(): number {
    return this.letterScore
  }

  /**
   * 设置技能流派底色
   * @param color 流派颜色（PixiJS hex），null 清除
   */
  setSkillSchoolColor(color: number | null): void {
    if (this.schoolColor !== color) {
      this.schoolColor = color
      this.drawSchoolOverlay()
    }
  }

  /**
   * 获取技能流派底色
   */
  getSkillSchoolColor(): number | null {
    return this.schoolColor
  }

  /**
   * 设置增幅者叠层数显示
   * @param count 叠层数，0 或负数时隐藏
   */
  setStackCount(count: number): void {
    if (count > 0) {
      if (!this.stackLabel) {
        this.stackLabel = new Text({
          text: '',
          style: new TextStyle({
            fontFamily: FONT_PIXEL,
            fontSize: 9,
            fontWeight: 'bold',
            fill: 0xa29bfe,
          })
        })
        this.stackLabel.x = 2
        this.stackLabel.y = 2
        this.addChild(this.stackLabel)
      }
      this.stackLabel.text = `×${count}`
      this.stackLabel.visible = true
    } else if (this.stackLabel) {
      this.stackLabel.visible = false
    }
  }

  /**
   * 设置成长值百分比显示
   * @param value 成长值（0.45 = 45%），0 时隐藏
   */
  setGrowthLabel(value: number): void {
    if (value > 0) {
      if (!this.growthLabel) {
        this.growthLabel = new Text({
          text: '',
          style: new TextStyle({
            fontFamily: FONT_PIXEL,
            fontSize: 8,
            fontWeight: 'bold',
            fill: 0xffe66d,
          })
        })
        this.growthLabel.anchor.set(1, 1)
        this.growthLabel.x = KeyVisual.KEY_SIZE - 3
        this.growthLabel.y = KeyVisual.KEY_SIZE - 3
        this.addChild(this.growthLabel)
      }
      this.growthLabel.text = `+${Math.round(value * 100)}%`
      this.growthLabel.visible = true
    } else if (this.growthLabel) {
      this.growthLabel.visible = false
    }
  }

  /**
   * 更新分数文本显示
   */
  private updateScoreLabel(): void {
    if (this.letterScore <= 0) {
      if (this.scoreLabel) {
        this.removeChild(this.scoreLabel)
        this.scoreLabel.destroy()
        this.scoreLabel = null
      }
      return
    }

    // 确定分数颜色
    let fill: number
    if (this.letterScore >= 6) {
      fill = 0xffd700
    } else if (this.letterScore >= 3) {
      fill = 0x4488cc
    } else {
      fill = 0x88bbdd
    }

    if (!this.scoreLabel) {
      this.scoreLabel = new Text({
        text: String(this.letterScore),
        style: new TextStyle({
          fontFamily: FONT_PIXEL,
          fontSize: 9,
          fontWeight: 'bold',
          fill,
        })
      })
      this.addChild(this.scoreLabel)
    } else {
      this.scoreLabel.text = String(this.letterScore)
      this.scoreLabel.style.fill = fill
    }

    // 定位到右上角
    this.scoreLabel.x = KeyVisual.KEY_SIZE - 12
    this.scoreLabel.y = 2
  }

  /**
   * 绘制技能流派半透明底色
   */
  private drawSchoolOverlay(): void {
    this.schoolOverlay.clear()
    if (this.schoolColor === null) return

    this.schoolOverlay.roundRect(
      2, 2,
      KeyVisual.KEY_SIZE - 4, KeyVisual.KEY_SIZE - 4,
      0
    )
    this.schoolOverlay.fill({ color: this.schoolColor, alpha: 0.15 })
  }

  /**
   * 设置 tooltip 数据
   */
  setTooltipData(data: KeyTooltipData | null): void {
    this.tooltipData = data
  }

  /**
   * 获取 tooltip 数据
   */
  getTooltipData(): KeyTooltipData | null {
    return this.tooltipData
  }

  /**
   * 设置稀有度边框颜色
   */
  setRarityBorder(rarity: SkillRarity | null): void {
    if (this.currentRarity !== rarity) {
      this.currentRarity = rarity
      this.drawBackground()
    }
  }

  /**
   * 获取当前稀有度
   */
  getRarity(): SkillRarity | null {
    return this.currentRarity
  }

  /**
   * 设置词条数量指示点（0~3）
   */
  setAffixDots(count: number): void {
    const clamped = Math.max(0, Math.min(3, Math.floor(count)))
    if (this.affixDotCount === clamped) return
    this.affixDotCount = clamped
    this.drawAffixDots()
  }

  /**
   * 获取词条数量指示点
   */
  getAffixDotCount(): number {
    return this.affixDotCount
  }

  /**
   * 绘制词条数量指示点
   */
  private drawAffixDots(): void {
    if (this.affixDotCount <= 0) {
      if (this.affixDotsGraphics) {
        this.removeChild(this.affixDotsGraphics)
        this.affixDotsGraphics.destroy()
        this.affixDotsGraphics = null
      }
      return
    }

    if (!this.affixDotsGraphics) {
      this.affixDotsGraphics = new Graphics()
      this.addChild(this.affixDotsGraphics)
    }
    this.affixDotsGraphics.clear()

    const dotRadius = 2
    const dotGap = 6
    const totalWidth = this.affixDotCount * dotRadius * 2 + (this.affixDotCount - 1) * (dotGap - dotRadius * 2)
    const startX = (KeyVisual.KEY_SIZE - totalWidth) / 2 + dotRadius

    for (let i = 0; i < this.affixDotCount; i++) {
      const cx = startX + i * dotGap
      const cy = KeyVisual.KEY_SIZE - 6
      this.affixDotsGraphics.circle(cx, cy, dotRadius)
    }
    this.affixDotsGraphics.fill({ color: 0xffffff, alpha: 0.8 })
  }

  /**
   * 设置任务进度环比例（0~1）
   */
  setQuestProgress(ratio: number): void {
    const clamped = Math.max(0, Math.min(1, ratio))
    if (this.questProgressRatio === clamped) return
    this.questProgressRatio = clamped
    this.drawQuestProgress()
  }

  /**
   * 获取任务进度环比例
   */
  getQuestProgressRatio(): number {
    return this.questProgressRatio
  }

  /**
   * 绘制任务进度环
   */
  private drawQuestProgress(): void {
    if (this.questProgressRatio <= 0) {
      if (this.questProgressGraphics) {
        this.removeChild(this.questProgressGraphics)
        this.questProgressGraphics.destroy()
        this.questProgressGraphics = null
      }
      return
    }

    if (!this.questProgressGraphics) {
      this.questProgressGraphics = new Graphics()
      this.addChild(this.questProgressGraphics)
    }
    this.questProgressGraphics.clear()

    const cx = KeyVisual.KEY_SIZE / 2
    const cy = KeyVisual.KEY_SIZE / 2
    const radius = KeyVisual.KEY_SIZE / 2 - 1
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + this.questProgressRatio * Math.PI * 2

    this.questProgressGraphics.arc(cx, cy, radius, startAngle, endAngle)
    this.questProgressGraphics.stroke({ color: 0xffd700, width: 2, alpha: 0.7 })
  }

  /**
   * Story 41-5: 设置 Charge 蓄力进度（0~1）
   */
  setChargeProgress(ratio: number): void {
    const clamped = Math.max(0, Math.min(1, ratio))
    if (this.chargeProgressRatio === clamped) return
    this.chargeProgressRatio = clamped
    if (clamped <= 0) this.chargeFullPulsePhase = 0
    this.drawChargeProgress()
  }

  /**
   * Story 41-5: 获取 Charge 蓄力进度
   */
  getChargeProgressRatio(): number {
    return this.chargeProgressRatio
  }

  /**
   * Story 41-5: 绘制 Charge 蓄力进度条（底部水平条）
   */
  private drawChargeProgress(): void {
    if (this.chargeProgressRatio <= 0) {
      if (this.chargeProgressGraphics) {
        this.removeChild(this.chargeProgressGraphics)
        this.chargeProgressGraphics.destroy()
        this.chargeProgressGraphics = null
      }
      return
    }

    if (!this.chargeProgressGraphics) {
      this.chargeProgressGraphics = new Graphics()
      this.addChild(this.chargeProgressGraphics)
    }
    this.chargeProgressGraphics.clear()

    const barWidth = (KeyVisual.KEY_SIZE - 4) * this.chargeProgressRatio
    const barHeight = 3
    const barX = 2
    const barY = KeyVisual.KEY_SIZE - 10  // 避免与词条圆点 (cy=KEY_SIZE-6) 重叠

    // 蓄满时用金色脉冲，否则用蓝色
    const color = this.chargeProgressRatio >= 1 ? 0xffd700 : 0x3498db
    const alpha = this.chargeProgressRatio >= 1
      ? 0.6 + 0.4 * Math.abs(Math.sin(this.chargeFullPulsePhase))
      : 0.8

    this.chargeProgressGraphics.rect(barX, barY, barWidth, barHeight)
    this.chargeProgressGraphics.fill({ color, alpha })
  }

  /**
   * 播放闪光特效
   * @param color 闪光颜色（PixiJS hex）
   * @param alpha 初始透明度
   */
  playFlashEffect(color: number, alpha: number = 1.0): void {
    this.flashColor = color
    this.flashAlpha = alpha
    if (!this.flashGraphics) {
      this.flashGraphics = new Graphics()
      this.addChild(this.flashGraphics)
    }
    this.drawFlash()
    this.isAnimating = true
  }

  /**
   * 获取闪光透明度
   */
  getFlashAlpha(): number {
    return this.flashAlpha
  }

  /**
   * 绘制闪光覆盖
   */
  private drawFlash(): void {
    if (!this.flashGraphics) return
    this.flashGraphics.clear()
    if (this.flashColor === null || this.flashAlpha <= 0) return

    this.flashGraphics.roundRect(
      1, 1,
      KeyVisual.KEY_SIZE - 2, KeyVisual.KEY_SIZE - 2,
      0
    )
    this.flashGraphics.fill({ color: this.flashColor, alpha: this.flashAlpha })
  }

  /**
   * 鼠标悬停显示 tooltip
   */
  private onPointerOver(e: FederatedPointerEvent): void {
    if (this.tooltipData) {
      keyTooltip.show(e.clientX, e.clientY, this.tooltipData, undefined, false)
    }
  }

  /**
   * 鼠标移出隐藏 tooltip
   */
  private onPointerOut(): void {
    keyTooltip.hide()
  }

  /**
   * 播放触发动画
   * 效果: 放大 + 闪烁 + 恢复
   */
  playTriggerAnimation(): void {
    this.isAnimating = true
    this.animationScale = 1.2
    this.animationAlpha = 1.5 // 过曝效果
  }

  /**
   * 检查是否正在播放动画
   */
  getIsAnimating(): boolean {
    return this.isAnimating
  }

  /**
   * 获取当前动画缩放值
   */
  getAnimationScale(): number {
    return this.animationScale
  }

  /**
   * 每帧更新动画
   * @param dt delta time（秒）
   */
  update(dt: number): void {
    // Story 41-5: 蓄满脉冲动画（独立于 isAnimating）
    if (this.chargeProgressRatio >= 1) {
      this.chargeFullPulsePhase += dt * 4  // 4 rad/s pulse speed
      this.drawChargeProgress()
    }

    if (!this.isAnimating) return

    let stillAnimating = false

    // 缩放恢复
    if (this.animationScale > 1.0) {
      this.animationScale -= dt * KeyVisual.SCALE_RECOVERY_SPEED
      if (this.animationScale < 1.0) {
        this.animationScale = 1.0
      } else {
        stillAnimating = true
      }
      this.scale.set(this.animationScale)
    }

    // Alpha 恢复
    if (this.animationAlpha > 1.0) {
      this.animationAlpha -= dt * KeyVisual.ALPHA_RECOVERY_SPEED
      if (this.animationAlpha < 1.0) {
        this.animationAlpha = 1.0
        this.scale.set(1.0)
      } else {
        stillAnimating = true
      }
      this.background.alpha = this.animationAlpha
    }

    // 闪光衰减
    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * KeyVisual.FLASH_DECAY_SPEED
      if (this.flashAlpha <= 0) {
        this.flashAlpha = 0
        this.flashColor = null
      } else {
        stillAnimating = true
      }
      this.drawFlash()
    }

    if (!stillAnimating) {
      this.isAnimating = false
    }
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.skillIcon) {
      this.skillIcon.destroy()
      this.skillIcon = null
    }
    if (this.affixDotsGraphics) {
      this.affixDotsGraphics.destroy()
      this.affixDotsGraphics = null
    }
    if (this.questProgressGraphics) {
      this.questProgressGraphics.destroy()
      this.questProgressGraphics = null
    }
    if (this.chargeProgressGraphics) {
      this.chargeProgressGraphics.destroy()
      this.chargeProgressGraphics = null
    }
    if (this.flashGraphics) {
      this.flashGraphics.destroy()
      this.flashGraphics = null
    }
    super.destroy({ children: true })
  }
}
