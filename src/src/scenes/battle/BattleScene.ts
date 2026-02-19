// ============================================
// 打字肉鸽 - BattleScene 战斗场景
// ============================================
// Story 4.2 Task 2: BattleScene 基础框架
// Story 4.3 Task 6: 集成 BattleHUD
// Story 4.4 Task 6: 集成 KeyboardVisualizer
// Story 4.5 Task 4: 集成 BattleFlowController

import { Container, Graphics, Application } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { BattleState } from '../../core/state/BattleState'
import { eventBus, GameEvents } from '../../core/events/EventBus'
import { BattleHUD } from '../../ui/hud'
import { KeyboardVisualizer } from '../../ui/keyboard'
import { BattleFlowController, StageConfig } from './BattleFlowController'

/**
 * 战斗场景
 *
 * 职责:
 * - 管理战斗 UI 层级（背景、游戏、UI、效果）
 * - 驱动 BattleState 更新
 * - 处理暂停/恢复
 * - 协调子系统（HUD、键盘、效果）
 *
 * Container 层级结构:
 * BattleScene.container (root)
 * ├── backgroundLayer   // 背景、装饰
 * ├── gameLayer         // 游戏对象（词语、效果）
 * ├── uiLayer           // HUD（分数、计时器、连击）
 * └── effectLayer       // 粒子、特效（最上层）
 */
export class BattleScene extends BaseScene {
  readonly name = 'BattleScene'

  // Container 层级
  private backgroundLayer!: Container
  private gameLayer!: Container
  private uiLayer!: Container
  private effectLayer!: Container

  // 战斗状态
  private battleState: BattleState

  // 应用引用（用于获取屏幕尺寸）
  private app: Application

  // 关卡 ID
  private stageId: number

  // 战斗结束标志（防止重复触发 battle:end）
  private battleEndEmitted = false

  // HUD 组件
  private hud!: BattleHUD

  // 键盘可视化组件
  private keyboardVisualizer!: KeyboardVisualizer

  // 战斗流程控制器
  private flowController!: BattleFlowController

  // 关卡配置
  private stageConfig: StageConfig

  // 事件取消订阅
  private unsubWordNew: (() => void) | null = null
  private unsubKeypress: (() => void) | null = null
  private unsubWordError: (() => void) | null = null

  // 初始化完成标志
  private initialized = false

  constructor(app: Application, stageId: number = 1, config?: Partial<StageConfig>) {
    super()
    this.app = app
    this.stageId = stageId
    this.battleState = new BattleState()
    this.stageConfig = {
      difficulty: config?.difficulty ?? 1,
      targetScore: config?.targetScore ?? 1000,
      timeLimit: config?.timeLimit ?? 60,
      wordCategory: config?.wordCategory ?? 'zh-pinyin'
    }
  }

  /**
   * 场景进入
   * 创建层级、重置状态、开始战斗
   */
  onEnter(): void {
    super.onEnter()

    // 重置结束标志
    this.battleEndEmitted = false
    this.initialized = false

    // 创建层级结构
    this.createLayers()

    // 创建 HUD
    this.hud = new BattleHUD(this.app.screen.width, this.app.screen.height)
    this.uiLayer.addChild(this.hud)

    // 创建键盘可视化
    this.keyboardVisualizer = new KeyboardVisualizer()
    // 定位到屏幕下方中央（TimerBar 上方）
    this.keyboardVisualizer.x = (this.app.screen.width - this.keyboardVisualizer.getKeyboardWidth()) / 2
    this.keyboardVisualizer.y = this.app.screen.height - this.keyboardVisualizer.getKeyboardHeight() - 80
    this.uiLayer.addChild(this.keyboardVisualizer)
    this.keyboardVisualizer.bindEvents()

    // 创建流程控制器
    this.flowController = new BattleFlowController(this.battleState)

    // 绑定事件
    this.bindEvents()

    // 初始化流程控制器（异步）
    this.initializeBattle()
  }

  /**
   * 异步初始化战斗
   */
  private async initializeBattle(): Promise<void> {
    try {
      await this.flowController.initialize(this.stageConfig)

      // 初始化完成后更新 UI
      this.initialized = true

      // 发送战斗开始事件
      eventBus.emit('battle:start', { stageId: this.stageId })

      // 开始战斗
      this.battleState.start()
    } catch (error) {
      console.error('BattleScene: Failed to initialize battle:', error)
      // 使用默认词语继续
      this.initialized = true
      eventBus.emit('battle:start', { stageId: this.stageId })
      this.battleState.start()
    }
  }

  /**
   * 场景退出
   * 解绑事件并清理资源
   */
  onExit(): void {
    // 解绑事件
    this.unbindEvents()

    // 销毁流程控制器
    if (this.flowController) {
      this.flowController.destroy()
    }

    // 销毁 HUD
    if (this.hud) {
      this.hud.destroy()
    }

    // 销毁键盘可视化
    if (this.keyboardVisualizer) {
      this.keyboardVisualizer.unbindEvents()
      this.keyboardVisualizer.destroy()
    }

    super.onExit()
  }

  /**
   * 场景暂停（被其他场景覆盖）
   */
  onPause(): void {
    super.onPause()
    this.pauseBattle()
  }

  /**
   * 场景恢复
   */
  onResume(): void {
    super.onResume()
    this.resumeBattle()
  }

  /**
   * 每帧更新
   * @param dt delta time（毫秒）
   */
  update(dt: number): void {
    if (!this.battleState.isPlaying()) {
      return
    }

    // 更新时间（dt 是毫秒，需要转换为秒）
    const dtSeconds = dt / 1000
    this.battleState.updateTime(dtSeconds)

    // 更新流程控制器
    if (this.flowController && !this.flowController.isDestroyed()) {
      this.flowController.update(dtSeconds)
    }

    // 更新 HUD
    if (this.hud && !this.hud.destroyed) {
      this.hud.syncWithState(this.battleState)
      this.hud.update(dtSeconds)
    }

    // 更新键盘可视化
    if (this.keyboardVisualizer && !this.keyboardVisualizer.destroyed) {
      this.keyboardVisualizer.update(dtSeconds)
    }

    // 检查游戏结束（仅触发一次）
    if (this.battleState.isEnded() && !this.battleEndEmitted) {
      this.onBattleEnd()
    }
  }

  /**
   * 创建层级结构
   * 按顺序添加：背景 → 游戏 → UI → 效果
   */
  private createLayers(): void {
    // 背景层
    this.backgroundLayer = new Container()
    this.backgroundLayer.label = 'backgroundLayer'
    this.container.addChild(this.backgroundLayer)

    // 添加临时背景（后续替换为实际背景）
    const bg = new Graphics()
    bg.rect(0, 0, this.app.screen.width, this.app.screen.height)
    bg.fill({ color: 0x1a1a2e })
    this.backgroundLayer.addChild(bg)

    // 游戏层
    this.gameLayer = new Container()
    this.gameLayer.label = 'gameLayer'
    this.container.addChild(this.gameLayer)

    // UI 层
    this.uiLayer = new Container()
    this.uiLayer.label = 'uiLayer'
    this.container.addChild(this.uiLayer)

    // 效果层
    this.effectLayer = new Container()
    this.effectLayer.label = 'effectLayer'
    this.container.addChild(this.effectLayer)
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    // 监听词语更新
    this.unsubWordNew = eventBus.on('word:new', this.onWordNew.bind(this))

    // 监听输入进度
    this.unsubKeypress = eventBus.on('input:keypress', this.onInputKeypress.bind(this))

    // 监听输入错误
    this.unsubWordError = eventBus.on('word:error', this.onWordError.bind(this))
  }

  /**
   * 解绑事件
   */
  private unbindEvents(): void {
    this.unsubWordNew?.()
    this.unsubKeypress?.()
    this.unsubWordError?.()
    this.unsubWordNew = null
    this.unsubKeypress = null
    this.unsubWordError = null
  }

  /**
   * 处理新词语事件
   */
  private onWordNew(data: GameEvents['word:new']): void {
    if (this.hud && !this.hud.destroyed) {
      this.hud.getWordDisplay().setWord(data.word)
    }
  }

  /**
   * 处理按键输入（更新进度显示）
   */
  private onInputKeypress(_data: GameEvents['input:keypress']): void {
    if (!this.flowController || !this.hud || this.hud.destroyed) return

    const wordController = this.flowController.getWordController()
    const currentWord = wordController.getCurrentWord()
    if (currentWord.length === 0) return

    const currentIndex = wordController.getCurrentIndex()
    const progress = currentIndex / currentWord.length

    // 当词语完成后 loadNextWord 会重置 index 为 0
    // 此时 progress 为 0，但我们应该显示前一个词的 100% 完成状态
    // word:new 事件会在之后重置进度，所以这里跳过 0 进度更新
    if (currentIndex === 0 && progress === 0) {
      return
    }

    this.hud.getWordDisplay().setProgress(progress)
  }

  /**
   * 处理输入错误
   */
  private onWordError(_data: GameEvents['word:error']): void {
    if (this.hud && !this.hud.destroyed) {
      this.hud.getWordDisplay().showError()
    }
  }

  /**
   * 暂停战斗
   * 仅在 playing 状态时有效
   */
  pauseBattle(): void {
    if (this.battleState.isPlaying()) {
      this.battleState.pause()
      eventBus.emit('battle:pause', {})
    }
  }

  /**
   * 恢复战斗
   * 仅在 paused 状态时有效
   */
  resumeBattle(): void {
    if (this.battleState.isPaused()) {
      this.battleState.resume()
      eventBus.emit('battle:resume', {})
    }
  }

  /**
   * 战斗结束处理
   * 仅触发一次 battle:end 事件
   */
  private onBattleEnd(): void {
    if (this.battleEndEmitted) {
      return
    }
    this.battleEndEmitted = true

    const state = this.battleState.getState()
    eventBus.emit('battle:end', {
      result: state.phase === 'victory' ? 'win' : 'lose',
      score: state.score
    })
  }

  /**
   * 获取战斗状态（供子组件使用）
   */
  getBattleState(): BattleState {
    return this.battleState
  }

  /**
   * 获取游戏层（供子组件添加元素）
   */
  getGameLayer(): Container {
    return this.gameLayer
  }

  /**
   * 获取 UI 层（供 HUD 使用）
   */
  getUILayer(): Container {
    return this.uiLayer
  }

  /**
   * 获取效果层（供粒子系统使用）
   */
  getEffectLayer(): Container {
    return this.effectLayer
  }

  /**
   * 获取 HUD（供测试使用）
   */
  getHUD(): BattleHUD {
    return this.hud
  }

  /**
   * 获取键盘可视化（供测试使用）
   */
  getKeyboardVisualizer(): KeyboardVisualizer {
    return this.keyboardVisualizer
  }

  /**
   * 获取流程控制器（供测试使用）
   */
  getFlowController(): BattleFlowController {
    return this.flowController
  }

  /**
   * 销毁场景
   * 清理所有资源和事件监听
   */
  destroy(): void {
    this.unbindEvents()
    this.battleEndEmitted = true // 防止销毁后触发事件

    // 销毁流程控制器
    if (this.flowController) {
      this.flowController.destroy()
    }

    // 销毁 HUD
    if (this.hud) {
      this.hud.destroy()
    }

    // 销毁键盘可视化
    if (this.keyboardVisualizer) {
      this.keyboardVisualizer.unbindEvents()
      this.keyboardVisualizer.destroy()
    }
  }
}
