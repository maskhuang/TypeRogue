// ============================================
// 打字肉鸽 - 分数结算展示 (Balatro 风格)
// ============================================

import { Container, Text, Graphics } from 'pixi.js'

/**
 * 结算数据
 */
export interface SettlementData {
  /** 基础分数 (chips) */
  baseScore: number
  /** 倍率 (mult) */
  multiplier: number
  /** 最终分数 */
  finalScore: number
  /** 分数来源描述 */
  sources?: SettlementSource[]
}

/**
 * 分数来源
 */
export interface SettlementSource {
  name: string
  icon: string
  value: number
  type: 'base' | 'mult'
}

/**
 * 分数结算展示组件
 *
 * 类似 Balatro 的 "Chips × Mult" 展示方式
 * 展示：基数 × 倍率 = 最终分数
 */
export class ScoreSettlement extends Container {
  // 容器
  private panel: Graphics
  private chipsContainer: Container
  private multContainer: Container
  private resultContainer: Container

  // 文本
  private chipsLabel: Text
  private chipsValue: Text
  private multSymbol: Text
  private multLabel: Text
  private multValue: Text
  private equalsSymbol: Text
  private resultValue: Text

  // 动画状态
  private animationPhase: 'idle' | 'chips' | 'mult' | 'result' | 'done' = 'idle'
  private phaseTime = 0
  private currentData: SettlementData | null = null
  private onComplete?: () => void

  // 配置
  private readonly PHASE_DURATION = {
    chips: 0.3,    // 显示基数
    mult: 0.3,     // 显示倍率
    result: 0.5,   // 显示结果
    hold: 0.8      // 停留时间
  }

  constructor() {
    super()
    this.visible = false
    this.alpha = 0

    this.createPanel()
    this.createChipsDisplay()
    this.createMultDisplay()
    this.createResultDisplay()
  }

  private createPanel(): void {
    this.panel = new Graphics()
    this.panel.roundRect(-200, -60, 400, 120, 12)
    this.panel.fill({ color: 0x1a1a2e, alpha: 0.95 })
    this.panel.stroke({ color: 0x4a4a6a, width: 2 })
    this.addChild(this.panel)
  }

  private createChipsDisplay(): void {
    this.chipsContainer = new Container()
    this.chipsContainer.x = -130
    this.chipsContainer.alpha = 0
    this.chipsContainer.scale.set(0.5)

    // 标签 "基数"
    this.chipsLabel = new Text({
      text: '基数',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x6699cc,
        fontWeight: 'bold'
      }
    })
    this.chipsLabel.anchor.set(0.5)
    this.chipsLabel.y = -25
    this.chipsContainer.addChild(this.chipsLabel)

    // 数值
    this.chipsValue = new Text({
      text: '0',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0x66ccff,
        fontWeight: 'bold'
      }
    })
    this.chipsValue.anchor.set(0.5)
    this.chipsValue.y = 10
    this.chipsContainer.addChild(this.chipsValue)

    this.addChild(this.chipsContainer)
  }

  private createMultDisplay(): void {
    this.multContainer = new Container()
    this.multContainer.x = 0
    this.multContainer.alpha = 0
    this.multContainer.scale.set(0.5)

    // × 符号
    this.multSymbol = new Text({
      text: '×',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0xffffff
      }
    })
    this.multSymbol.anchor.set(0.5)
    this.multSymbol.x = -50
    this.multSymbol.y = 5
    this.multContainer.addChild(this.multSymbol)

    // 标签 "倍率"
    this.multLabel = new Text({
      text: '倍率',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xff6666,
        fontWeight: 'bold'
      }
    })
    this.multLabel.anchor.set(0.5)
    this.multLabel.x = 20
    this.multLabel.y = -25
    this.multContainer.addChild(this.multLabel)

    // 数值
    this.multValue = new Text({
      text: '×1.0',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xff6666,
        fontWeight: 'bold'
      }
    })
    this.multValue.anchor.set(0.5)
    this.multValue.x = 20
    this.multValue.y = 10
    this.multContainer.addChild(this.multValue)

    this.addChild(this.multContainer)
  }

  private createResultDisplay(): void {
    this.resultContainer = new Container()
    this.resultContainer.x = 130
    this.resultContainer.alpha = 0
    this.resultContainer.scale.set(0.5)

    // = 符号
    this.equalsSymbol = new Text({
      text: '=',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0xffffff
      }
    })
    this.equalsSymbol.anchor.set(0.5)
    this.equalsSymbol.x = -50
    this.equalsSymbol.y = 5
    this.resultContainer.addChild(this.equalsSymbol)

    // 结果数值
    this.resultValue = new Text({
      text: '0',
      style: {
        fontFamily: 'Arial',
        fontSize: 42,
        fill: 0xffe66d,
        fontWeight: 'bold'
      }
    })
    this.resultValue.anchor.set(0.5)
    this.resultValue.x = 20
    this.resultValue.y = 5
    this.resultContainer.addChild(this.resultValue)

    this.addChild(this.resultContainer)
  }

  /**
   * 播放分数结算动画
   */
  show(data: SettlementData, onComplete?: () => void): void {
    this.currentData = data
    this.onComplete = onComplete

    // 设置数值
    this.chipsValue.text = this.formatNumber(data.baseScore)
    this.multValue.text = `×${data.multiplier.toFixed(1)}`
    this.resultValue.text = this.formatNumber(data.finalScore)

    // 重置状态
    this.chipsContainer.alpha = 0
    this.chipsContainer.scale.set(0.5)
    this.multContainer.alpha = 0
    this.multContainer.scale.set(0.5)
    this.resultContainer.alpha = 0
    this.resultContainer.scale.set(0.5)

    // 开始动画
    this.visible = true
    this.alpha = 0
    this.animationPhase = 'chips'
    this.phaseTime = 0
  }

  /**
   * 更新动画
   */
  update(dt: number): void {
    if (this.animationPhase === 'idle' || this.animationPhase === 'done') return

    this.phaseTime += dt

    // 面板淡入
    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + dt * 5)
    }

    switch (this.animationPhase) {
      case 'chips':
        this.animateChips(dt)
        break
      case 'mult':
        this.animateMult(dt)
        break
      case 'result':
        this.animateResult(dt)
        break
    }
  }

  private animateChips(dt: number): void {
    const progress = Math.min(this.phaseTime / this.PHASE_DURATION.chips, 1)
    const eased = this.easeOutBack(progress)

    this.chipsContainer.alpha = progress
    this.chipsContainer.scale.set(0.5 + 0.5 * eased)

    if (progress >= 1) {
      this.animationPhase = 'mult'
      this.phaseTime = 0
    }
  }

  private animateMult(dt: number): void {
    const progress = Math.min(this.phaseTime / this.PHASE_DURATION.mult, 1)
    const eased = this.easeOutBack(progress)

    this.multContainer.alpha = progress
    this.multContainer.scale.set(0.5 + 0.5 * eased)

    if (progress >= 1) {
      this.animationPhase = 'result'
      this.phaseTime = 0
    }
  }

  private animateResult(dt: number): void {
    const progress = Math.min(this.phaseTime / this.PHASE_DURATION.result, 1)

    if (progress < 0.5) {
      // 前半段：等号和结果数字弹入
      const subProgress = progress / 0.5
      const eased = this.easeOutBack(subProgress)
      this.resultContainer.alpha = subProgress
      this.resultContainer.scale.set(0.5 + 0.7 * eased) // 稍微放大一些
    } else {
      // 后半段：结果数字脉冲效果
      const subProgress = (progress - 0.5) / 0.5
      const pulse = 1 + 0.1 * Math.sin(subProgress * Math.PI * 2)
      this.resultContainer.scale.set(1.2 * pulse)
      this.resultContainer.alpha = 1
    }

    if (progress >= 1) {
      // 停留一段时间后结束
      if (this.phaseTime > this.PHASE_DURATION.result + this.PHASE_DURATION.hold) {
        this.hide()
      }
    }
  }

  /**
   * 隐藏结算面板
   */
  hide(): void {
    this.animationPhase = 'done'

    // 淡出动画（简化处理，直接隐藏）
    this.visible = false
    this.alpha = 0

    if (this.onComplete) {
      this.onComplete()
      this.onComplete = undefined
    }
  }

  /**
   * 立即隐藏（无动画）
   */
  hideImmediately(): void {
    this.visible = false
    this.alpha = 0
    this.animationPhase = 'idle'
    this.onComplete = undefined
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    return Math.floor(num).toLocaleString('en-US')
  }

  /**
   * 缓动函数：回弹效果
   */
  private easeOutBack(x: number): number {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
  }

  /**
   * 缓动函数：弹性效果
   */
  private easeOutElastic(x: number): number {
    const c4 = (2 * Math.PI) / 3
    return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
  }
}

// 导出单例
export const scoreSettlement = new ScoreSettlement()
