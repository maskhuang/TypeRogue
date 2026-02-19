// ============================================
// 打字肉鸽 - WordDisplay 词语显示组件
// ============================================
// Story 4.3 Task 4: 当前词语显示

import { Container, Text, TextStyle } from 'pixi.js'

/**
 * 词语显示组件
 *
 * 功能:
 * - 显示当前需要输入的词语
 * - 高亮已正确输入的字符（绿色）
 * - 剩余字符显示为白色
 *
 * 位置: 屏幕居中
 */
export class WordDisplay extends Container {
  private typedText: Text // 已输入部分
  private remainingText: Text // 剩余部分
  private currentWord: string = ''
  private typedChars: string = ''

  // 错误反馈状态
  private isShowingError: boolean = false
  private errorTimeout: ReturnType<typeof setTimeout> | null = null

  // 使用等宽字体确保字符宽度一致
  private static readonly FONT_FAMILY = 'Courier New, monospace'

  private static readonly ERROR_STYLE = new TextStyle({
    fontFamily: WordDisplay.FONT_FAMILY,
    fontSize: 56,
    fontWeight: 'bold',
    fill: 0xff5252 // 红色
  })

  private static readonly TYPED_STYLE = new TextStyle({
    fontFamily: WordDisplay.FONT_FAMILY,
    fontSize: 56,
    fontWeight: 'bold',
    fill: 0x4caf50 // 绿色
  })

  private static readonly REMAINING_STYLE = new TextStyle({
    fontFamily: WordDisplay.FONT_FAMILY,
    fontSize: 56,
    fontWeight: 'bold',
    fill: 0xffffff // 白色
  })

  constructor() {
    super()
    this.label = 'WordDisplay'

    // 创建已输入文本
    this.typedText = new Text({
      text: '',
      style: WordDisplay.TYPED_STYLE
    })
    this.typedText.x = 0
    this.typedText.y = 0
    this.addChild(this.typedText)

    // 创建剩余文本
    this.remainingText = new Text({
      text: '',
      style: WordDisplay.REMAINING_STYLE
    })
    this.remainingText.x = 0
    this.remainingText.y = 0
    this.addChild(this.remainingText)
  }

  /**
   * 设置当前词语
   * @param word 词语
   */
  setWord(word: string): void {
    this.currentWord = word
    this.typedChars = ''
    this.updateDisplay()
  }

  /**
   * 设置已输入字符
   * @param chars 已输入的字符
   */
  setTypedChars(chars: string): void {
    this.typedChars = chars
    this.updateDisplay()
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    const typed = this.typedChars
    const remaining = this.currentWord.slice(typed.length)

    this.typedText.text = typed
    this.remainingText.text = remaining

    // 调整剩余文本位置，使用字符数估算宽度
    // 避免直接访问 .width（需要 canvas 环境）
    // 实际渲染时 PixiJS 会自动处理位置
    // 这里使用简单估算：每个字符约 33px（基于字体大小 56px * 0.6）
    const charWidth = 33
    this.remainingText.x = typed.length * charWidth
  }

  /**
   * 检查是否已完成输入
   */
  isComplete(): boolean {
    return this.typedChars.length >= this.currentWord.length
  }

  /**
   * 设置输入进度（基于进度值 0-1）
   * @param progress 0-1 的进度值
   */
  setProgress(progress: number): void {
    const charIndex = Math.floor(progress * this.currentWord.length)
    const chars = this.currentWord.slice(0, charIndex)
    this.setTypedChars(chars)
  }

  /**
   * 显示错误反馈（短暂红色闪烁）
   */
  showError(): void {
    if (this.isShowingError) return

    this.isShowingError = true

    // 保存原始颜色
    const originalColor = this.remainingText.style.fill

    // 设置红色
    this.remainingText.style.fill = 0xff5252

    // 清除之前的定时器
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout)
    }

    // 100ms 后恢复
    this.errorTimeout = setTimeout(() => {
      this.remainingText.style.fill = originalColor
      this.isShowingError = false
    }, 100)
  }

  /**
   * 检查是否正在显示错误
   */
  isErrorShowing(): boolean {
    return this.isShowingError
  }

  /**
   * 获取当前词语（供测试使用）
   */
  getCurrentWord(): string {
    return this.currentWord
  }

  /**
   * 获取已输入字符（供测试使用）
   */
  getTypedChars(): string {
    return this.typedChars
  }

  /**
   * 获取已输入文本对象（供测试使用）
   */
  getTypedText(): Text {
    return this.typedText
  }

  /**
   * 获取剩余文本对象（供测试使用）
   */
  getRemainingText(): Text {
    return this.remainingText
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout)
      this.errorTimeout = null
    }
    super.destroy({ children: true })
  }
}
