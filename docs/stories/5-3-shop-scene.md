---
title: "Story 5.3: 商店场景"
epic: "Epic 5: Roguelike 循环"
story_key: "5-3-shop-scene"
status: "done"
created: "2026-02-17"
completed: "2026-02-17"
depends_on:
  - "5-1-run-state-management"
  - "5-2-stage-progression"
---

# Story 5.3: 商店场景

## 概述

实现关卡间的商店界面，玩家可以在战斗胜利后购买技能、升级技能和购买遗物。商店是 Roguelike 循环的核心构筑环节，连接战斗场景与下一关卡。

## Story

作为一个 **玩家**，
我想要 **在关卡间的商店中购买和升级技能、获取遗物**，
以便 **构建我的 Build，提升后续关卡的战斗能力**。

## 验收标准

- [x] AC1: 商店显示 3-4 个可购买的技能选项
- [x] AC2: 商店显示 1-2 个可购买的遗物选项
- [x] AC3: 显示技能详情（名称、效果、价格、等级）
- [x] AC4: 支持技能购买，扣除金币并添加到库存
- [x] AC5: 已拥有技能再次购买时升级（最高 3 级）
- [x] AC6: 支持遗物购买，扣除金币并添加到库存
- [x] AC7: 金币不足时禁止购买（视觉提示）
- [x] AC8: 提供"跳过商店"选项进入下一关
- [x] AC9: 商店价格随关卡递增（基础价格 × 关卡系数）
- [x] AC10: 购买后物品从商店列表中移除或标记已购买

## 技术说明

### 文件位置

- `src/src/scenes/shop/ShopScene.ts` - 商店场景（新建）
- `src/src/scenes/shop/ShopItemDisplay.ts` - 商品显示组件（新建）
- `src/src/scenes/shop/ShopConfig.ts` - 商店配置类型（新建）
- `src/src/scenes/shop/index.ts` - 模块导出（新建）
- `src/assets/data/shop.json` - 商店配置数据（新建）
- `src/tests/unit/scenes/shop/ShopScene.test.ts` - 单元测试（新建）

### 架构参考

```
game-architecture.md - Scene Stack:

SceneManager: push, pop, replace, current
场景流程：Menu → Battle ⇄ Shop → Victory/GameOver

game-architecture.md - Roguelike 循环:

单关流程:
1. 战斗阶段（60秒，可被技能延长）
2. 结算判定
3. 奖励选择（商店/技能/遗物）

game-architecture.md - Project Structure:

src/
├── renderer/
│   ├── scenes/
│   │   ├── shop/
│   │   │   └── ShopScene.ts    ← 本 Story 实现
```

### 依赖关系

**依赖:**
- `core/state/RunState.ts` - 金币、技能、遗物管理 (Story 5.1)
- `systems/stage/StageManager.ts` - 关卡信息查询 (Story 5.2)
- `scenes/SceneManager.ts` - 场景切换 (Story 4.1)
- `scenes/BaseScene.ts` - 场景基类 (Story 4.1)

**被依赖:**
- Story 5.5 (游戏结束流程) - 商店是战斗与下一关的桥梁
- 后续关卡战斗 - 商店购买的技能影响战斗

## 实现任务

### Task 1: 商店配置类型定义 (AC: #1, #2, #9)

创建 `src/src/scenes/shop/ShopConfig.ts`:

```typescript
// ============================================
// 打字肉鸽 - ShopConfig 商店配置类型
// ============================================
// Story 5.3 Task 1: 商店配置类型定义

/**
 * 商品类型
 */
export type ShopItemType = 'skill' | 'relic'

/**
 * 商品配置
 */
export interface ShopItem {
  /** 商品ID (技能ID 或 遗物ID) */
  id: string

  /** 商品类型 */
  type: ShopItemType

  /** 基础价格 */
  basePrice: number

  /** 是否已购买 */
  purchased: boolean
}

/**
 * 商店配置数据
 */
export interface ShopData {
  /** 技能商品数量 (3-4) */
  skillSlots: number

  /** 遗物商品数量 (1-2) */
  relicSlots: number

  /** 价格系数 (每关递增) */
  priceMultiplierPerStage: number

  /** 稀有度权重 */
  rarityWeights: {
    common: number
    rare: number
    legendary: number
  }
}

/**
 * 商店状态
 */
export interface ShopState {
  /** 当前商品列表 */
  items: ShopItem[]

  /** 是否已跳过 */
  skipped: boolean
}
```

### Task 2: 商店配置数据 (AC: #1, #2, #9)

创建 `src/assets/data/shop.json`:

```json
{
  "skillSlots": 3,
  "relicSlots": 1,
  "priceMultiplierPerStage": 0.1,
  "rarityWeights": {
    "common": 0.6,
    "rare": 0.3,
    "legendary": 0.1
  },
  "basePrices": {
    "skill": {
      "common": 30,
      "rare": 50,
      "legendary": 80
    },
    "relic": {
      "common": 40,
      "rare": 70,
      "legendary": 120
    }
  }
}
```

### Task 3: 商品显示组件 (AC: #3, #7, #10)

创建 `src/src/scenes/shop/ShopItemDisplay.ts`:

```typescript
// ============================================
// 打字肉鸽 - ShopItemDisplay 商品显示组件
// ============================================
// Story 5.3 Task 3: 商品显示组件

import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { ShopItem } from './ShopConfig'

/**
 * 商品显示组件
 *
 * 职责:
 * - 显示商品信息（名称、价格、描述）
 * - 显示购买状态（可购买/金币不足/已购买）
 * - 处理选中状态
 */
export class ShopItemDisplay extends Container {
  private background: Graphics
  private nameText: Text
  private priceText: Text
  private descText: Text

  private _item: ShopItem | null = null
  private _selected = false
  private _affordable = true

  readonly width = 200
  readonly height = 120

  constructor() {
    super()
    this.background = new Graphics()
    this.addChild(this.background)

    // 名称文本
    const nameStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 16,
      fill: '#ffffff',
      fontWeight: 'bold'
    })
    this.nameText = new Text({ text: '', style: nameStyle })
    this.nameText.x = 10
    this.nameText.y = 10
    this.addChild(this.nameText)

    // 价格文本
    const priceStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#ffe66d'
    })
    this.priceText = new Text({ text: '', style: priceStyle })
    this.priceText.x = 10
    this.priceText.y = 35
    this.addChild(this.priceText)

    // 描述文本
    const descStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 12,
      fill: '#aaaaaa',
      wordWrap: true,
      wordWrapWidth: 180
    })
    this.descText = new Text({ text: '', style: descStyle })
    this.descText.x = 10
    this.descText.y = 55
    this.addChild(this.descText)

    this.draw()
  }

  /**
   * 设置商品数据
   */
  setItem(item: ShopItem | null, name: string, description: string, actualPrice: number): void {
    this._item = item
    if (item) {
      this.nameText.text = name
      this.priceText.text = `${actualPrice} 金币`
      this.descText.text = description
    } else {
      this.nameText.text = ''
      this.priceText.text = ''
      this.descText.text = ''
    }
    this.draw()
  }

  /**
   * 设置选中状态
   */
  setSelected(selected: boolean): void {
    this._selected = selected
    this.draw()
  }

  /**
   * 设置是否买得起
   */
  setAffordable(affordable: boolean): void {
    this._affordable = affordable
    this.draw()
  }

  /**
   * 获取商品
   */
  get item(): ShopItem | null {
    return this._item
  }

  /**
   * 是否已购买
   */
  get isPurchased(): boolean {
    return this._item?.purchased ?? false
  }

  private draw(): void {
    this.background.clear()

    // 背景色
    let bgColor = 0x2a2a3e
    let borderColor = 0x4a4a5e

    if (this._item?.purchased) {
      bgColor = 0x1a1a2e
      borderColor = 0x3a3a4e
    } else if (this._selected) {
      borderColor = 0x4ecdc4
    }

    if (!this._affordable && !this._item?.purchased) {
      this.priceText.style.fill = '#ff6b6b'
    } else {
      this.priceText.style.fill = '#ffe66d'
    }

    this.background.rect(0, 0, this.width, this.height)
    this.background.fill(bgColor)
    this.background.stroke({ width: 2, color: borderColor })

    // 已购买标记
    if (this._item?.purchased) {
      this.alpha = 0.5
    } else {
      this.alpha = 1
    }
  }
}
```

### Task 4: ShopScene 实现 (AC: #1-10)

创建 `src/src/scenes/shop/ShopScene.ts`:

```typescript
// ============================================
// 打字肉鸽 - ShopScene 商店场景
// ============================================
// Story 5.3 Task 4: 商店场景实现

import { Graphics, Text, TextStyle, Container } from 'pixi.js'
import { BaseScene } from '../BaseScene'
import { ShopItemDisplay } from './ShopItemDisplay'
import type { ShopItem, ShopState } from './ShopConfig'
import { eventBus } from '../../core/events/EventBus'

// 临时技能数据（后续从 data/skills.ts 导入）
const TEMP_SKILLS: Record<string, { name: string; description: string; rarity: string }> = {
  'score_boost': { name: '分数提升', description: '每次击键额外获得 10 分', rarity: 'common' },
  'combo_shield': { name: '连击护盾', description: '每 10 连击获得一次错误保护', rarity: 'common' },
  'time_extend': { name: '时间延长', description: '每完成一个词延长 0.5 秒', rarity: 'rare' },
  'multiplier_aura': { name: '倍率光环', description: '相邻技能获得 1.2x 加成', rarity: 'rare' },
  'gold_magnet': { name: '金币磁铁', description: '战斗奖励金币 +20%', rarity: 'common' }
}

// 临时遗物数据
const TEMP_RELICS: Record<string, { name: string; description: string; rarity: string }> = {
  'lucky_coin': { name: '幸运硬币', description: '商店价格降低 10%', rarity: 'common' },
  'combo_crown': { name: '连击皇冠', description: '初始倍率 +0.2', rarity: 'rare' }
}

/**
 * 商店场景
 *
 * 职责:
 * - 生成商品列表
 * - 处理购买逻辑
 * - 显示金币和商品
 * - 处理键盘输入
 */
export class ShopScene extends BaseScene {
  readonly name = 'shop'

  private shopState: ShopState
  private itemDisplays: ShopItemDisplay[] = []
  private selectedIndex = 0
  private goldText!: Text
  private instructionText!: Text

  // 依赖注入
  private runState: { getGold(): number; spendGold(amount: number): boolean; addSkill(id: string): void; addRelic(id: string): void; getSkillLevel(id: string): number; hasRelic(id: string): boolean }
  private stageManager: { getStage(id: number): { baseGoldReward: number } | undefined }
  private currentStage: number

  constructor(
    runState: { getGold(): number; spendGold(amount: number): boolean; addSkill(id: string): void; addRelic(id: string): void; getSkillLevel(id: string): number; hasRelic(id: string): boolean },
    stageManager: { getStage(id: number): { baseGoldReward: number } | undefined },
    currentStage: number
  ) {
    super()
    this.runState = runState
    this.stageManager = stageManager
    this.currentStage = currentStage
    this.shopState = { items: [], skipped: false }
  }

  onEnter(): void {
    super.onEnter()
    this.generateShopItems()
    this.createUI()
    this.updateSelection()
    this.addKeyboardListener()
  }

  onExit(): void {
    this.removeKeyboardListener()
    super.onExit()
  }

  /**
   * 生成商品列表
   */
  private generateShopItems(): void {
    const items: ShopItem[] = []

    // 生成 3 个技能商品
    const skillIds = Object.keys(TEMP_SKILLS)
    const selectedSkills = this.shuffle(skillIds).slice(0, 3)
    for (const id of selectedSkills) {
      const skill = TEMP_SKILLS[id]
      items.push({
        id,
        type: 'skill',
        basePrice: this.getBasePrice('skill', skill.rarity),
        purchased: false
      })
    }

    // 生成 1 个遗物商品
    const relicIds = Object.keys(TEMP_RELICS)
    const selectedRelic = this.shuffle(relicIds)[0]
    const relic = TEMP_RELICS[selectedRelic]
    items.push({
      id: selectedRelic,
      type: 'relic',
      basePrice: this.getBasePrice('relic', relic.rarity),
      purchased: false
    })

    this.shopState.items = items
  }

  private getBasePrice(type: 'skill' | 'relic', rarity: string): number {
    const prices: Record<string, Record<string, number>> = {
      skill: { common: 30, rare: 50, legendary: 80 },
      relic: { common: 40, rare: 70, legendary: 120 }
    }
    return prices[type][rarity] || 30
  }

  /**
   * 计算实际价格（考虑关卡系数）
   */
  private getActualPrice(item: ShopItem): number {
    const multiplier = 1 + (this.currentStage - 1) * 0.1
    return Math.floor(item.basePrice * multiplier)
  }

  /**
   * 创建 UI
   */
  private createUI(): void {
    // 背景
    const bg = new Graphics()
    bg.rect(0, 0, 800, 600)
    bg.fill(0x1a1a2e)
    this.container.addChild(bg)

    // 标题
    const titleStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 32,
      fill: '#ffffff',
      fontWeight: 'bold'
    })
    const title = new Text({ text: '商店', style: titleStyle })
    title.x = 350
    title.y = 30
    this.container.addChild(title)

    // 金币显示
    const goldStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 20,
      fill: '#ffe66d'
    })
    this.goldText = new Text({ text: `金币: ${this.runState.getGold()}`, style: goldStyle })
    this.goldText.x = 600
    this.goldText.y = 35
    this.container.addChild(this.goldText)

    // 商品显示
    const itemsContainer = new Container()
    itemsContainer.x = 100
    itemsContainer.y = 100
    this.container.addChild(itemsContainer)

    for (let i = 0; i < this.shopState.items.length; i++) {
      const item = this.shopState.items[i]
      const display = new ShopItemDisplay()

      // 获取商品信息
      const info = item.type === 'skill' ? TEMP_SKILLS[item.id] : TEMP_RELICS[item.id]
      const actualPrice = this.getActualPrice(item)

      // 如果是已拥有技能，显示等级
      let name = info?.name || item.id
      if (item.type === 'skill') {
        const level = this.runState.getSkillLevel(item.id)
        if (level > 0) {
          name += ` (Lv${level} → Lv${Math.min(3, level + 1)})`
        }
      }

      display.setItem(item, name, info?.description || '', actualPrice)
      display.setAffordable(this.runState.getGold() >= actualPrice)

      // 布局：2行2列
      display.x = (i % 2) * 220
      display.y = Math.floor(i / 2) * 140
      itemsContainer.addChild(display)
      this.itemDisplays.push(display)
    }

    // 操作说明
    const instructionStyle = new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fill: '#888888'
    })
    this.instructionText = new Text({
      text: '↑↓←→ 选择 | Enter 购买 | Space 跳过商店',
      style: instructionStyle
    })
    this.instructionText.x = 200
    this.instructionText.y = 550
    this.container.addChild(this.instructionText)
  }

  /**
   * 更新选中状态
   */
  private updateSelection(): void {
    for (let i = 0; i < this.itemDisplays.length; i++) {
      this.itemDisplays[i].setSelected(i === this.selectedIndex)
    }
  }

  /**
   * 购买当前选中商品
   */
  private purchaseSelected(): boolean {
    const item = this.shopState.items[this.selectedIndex]
    if (!item || item.purchased) return false

    const price = this.getActualPrice(item)
    if (!this.runState.spendGold(price)) return false

    // 添加到库存
    if (item.type === 'skill') {
      this.runState.addSkill(item.id)
    } else {
      this.runState.addRelic(item.id)
    }

    // 标记已购买
    item.purchased = true
    this.itemDisplays[this.selectedIndex].setItem(
      item,
      this.itemDisplays[this.selectedIndex]['nameText'].text,
      this.itemDisplays[this.selectedIndex]['descText'].text,
      price
    )

    // 更新金币显示
    this.goldText.text = `金币: ${this.runState.getGold()}`

    // 更新所有商品的可购买状态
    for (let i = 0; i < this.itemDisplays.length; i++) {
      const otherItem = this.shopState.items[i]
      const otherPrice = this.getActualPrice(otherItem)
      this.itemDisplays[i].setAffordable(this.runState.getGold() >= otherPrice)
    }

    eventBus.emit('shop:purchase', { itemId: item.id, type: item.type, price })
    return true
  }

  /**
   * 跳过商店
   */
  private skipShop(): void {
    this.shopState.skipped = true
    eventBus.emit('shop:skip', {})
    // 场景切换由外部控制器处理
  }

  // ==================== 键盘输入 ====================

  private keyHandler = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - 2)
        this.updateSelection()
        break
      case 'ArrowDown':
        this.selectedIndex = Math.min(this.shopState.items.length - 1, this.selectedIndex + 2)
        this.updateSelection()
        break
      case 'ArrowLeft':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1)
        this.updateSelection()
        break
      case 'ArrowRight':
        this.selectedIndex = Math.min(this.shopState.items.length - 1, this.selectedIndex + 1)
        this.updateSelection()
        break
      case 'Enter':
        this.purchaseSelected()
        break
      case ' ':
        this.skipShop()
        break
    }
  }

  private addKeyboardListener(): void {
    window.addEventListener('keydown', this.keyHandler)
  }

  private removeKeyboardListener(): void {
    window.removeEventListener('keydown', this.keyHandler)
  }

  // ==================== 工具方法 ====================

  private shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  update(_dt: number): void {
    // 商店场景无需每帧更新
  }
}
```

### Task 5: 模块导出

创建 `src/src/scenes/shop/index.ts`:

```typescript
// ============================================
// 打字肉鸽 - Shop 模块导出
// ============================================
// Story 5.3 Task 5: 模块导出

export { ShopScene } from './ShopScene'
export { ShopItemDisplay } from './ShopItemDisplay'
export type {
  ShopItem,
  ShopItemType,
  ShopData,
  ShopState
} from './ShopConfig'
```

### Task 6: 单元测试

创建 `src/tests/unit/scenes/shop/ShopScene.test.ts`:

**测试用例:**

- **初始化测试**
  - 构造函数正确初始化
  - onEnter() 创建 UI 组件
  - onExit() 清理资源

- **商品生成测试**
  - 生成 3 个技能商品
  - 生成 1 个遗物商品
  - 商品不重复

- **购买测试**
  - 金币足够时购买成功
  - 购买后金币扣除
  - 购买后技能添加到库存
  - 购买后遗物添加到库存
  - 金币不足时购买失败
  - 已购买商品不能重复购买
  - 已拥有技能再次购买升级

- **价格计算测试**
  - 基础价格正确
  - 关卡系数正确应用 (stage 1: ×1.0, stage 5: ×1.4)

- **键盘输入测试**
  - 方向键切换选中
  - Enter 键购买
  - Space 键跳过

- **UI 状态测试**
  - 选中状态高亮
  - 金币不足时价格变红
  - 已购买商品显示禁用状态

预计新增测试: ~30 个

## 测试计划

### 单元测试 (vitest)

- `ShopScene.test.ts`: 商店场景逻辑 (~30 tests)
- `ShopItemDisplay.test.ts`: 商品显示组件 (~10 tests)

### 集成测试

手动验证:
1. 战斗胜利后正确进入商店
2. 购买技能后在下一场战斗中生效
3. 金币显示与实际一致
4. 跳过商店后正确进入下一关

## Dev Notes

### 从前置 Story 学到的经验

**从 Story 5.1 (Run 状态管理):**
- RunState 提供 addSkill()、addRelic()、spendGold()、getGold() 方法
- 技能升级通过重复 addSkill() 实现，最高 3 级
- getSkillLevel() 可检查技能当前等级

**从 Story 5.2 (关卡进度):**
- StageManager 提供 getStage() 获取关卡配置
- 关卡配置包含 baseGoldReward 可用于奖励计算
- 实际文件路径为 `src/src/systems/stage/`

**从 Story 4.1 (场景管理):**
- 继承 BaseScene 实现 name 和 update 方法
- onEnter()/onExit() 处理生命周期
- 使用 eventBus.emit() 发送场景事件

### 技术要点

1. **依赖注入**: ShopScene 通过构造函数注入 runState 和 stageManager，便于测试
2. **数据驱动**: 商品数据从配置文件加载，技能/遗物详情从 data 层获取
3. **价格公式**: actualPrice = basePrice × (1 + (stage - 1) × 0.1)
4. **键盘操作**: 全程支持纯键盘操作，保持打字游戏风味
5. **事件通知**: 购买/跳过通过 eventBus 通知外部控制器

### 与其他系统的集成

```typescript
// 战斗结束后进入商店
battleFlowController.onBattleEnd((result) => {
  if (result.result === 'win') {
    const shopScene = new ShopScene(runState, stageManager, runState.getCurrentStage())
    sceneManager.replace(shopScene)
  }
})

// 商店结束后进入下一关
eventBus.on('shop:skip', () => {
  runState.advanceStage()
  const battleScene = new BattleScene(...)
  sceneManager.replace(battleScene)
})
```

### 项目结构对齐

```
src/
├── src/
│   ├── scenes/
│   │   ├── shop/                    # 新建目录
│   │   │   ├── ShopScene.ts         # 新建
│   │   │   ├── ShopItemDisplay.ts   # 新建
│   │   │   ├── ShopConfig.ts        # 新建
│   │   │   └── index.ts             # 新建
├── assets/
│   └── data/
│       └── shop.json                # 新建

tests/
├── unit/
│   └── scenes/
│       └── shop/
│           └── ShopScene.test.ts    # 新建
```

### 商店价格设计

| 关卡 | 价格系数 | 普通技能 | 稀有技能 | 普通遗物 |
|------|----------|----------|----------|----------|
| 1 | ×1.0 | 30 | 50 | 40 |
| 2 | ×1.1 | 33 | 55 | 44 |
| 3 | ×1.2 | 36 | 60 | 48 |
| 4 | ×1.3 | 39 | 65 | 52 |
| 5 | ×1.4 | 42 | 70 | 56 |
| 6 | ×1.5 | 45 | 75 | 60 |
| 7 | ×1.6 | 48 | 80 | 64 |
| 8 | ×1.7 | 51 | 85 | 68 |

### References

- [game-architecture.md - Scene Management](../game-architecture.md#scene-management)
- [game-architecture.md - Roguelike 循环](../game-architecture.md#roguelike-循环)
- [gdd.md - 商店/构筑系统](../gdd.md#商店构筑系统)
- [epics.md - Story 5.3](../epics.md#story-53-商店场景)
- [Story 5.1 - Run 状态管理](./5-1-run-state-management.md)
- [Story 5.2 - 关卡进度系统](./5-2-stage-progression.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. All 6 tasks completed successfully
2. 67 new tests added (48 for ShopScene, 19 for ShopItemDisplay)
3. Total test count: 560 tests passing
4. Shop events added to EventBus: 'shop:purchase', 'shop:skip'
5. handleKeyInput() method added for testability in non-browser environments

### Code Review Fixes (2026-02-17)

1. **[HIGH] shop.json 配置现在被使用** - ShopScene 构造函数接受可选 ShopData 配置
2. **[HIGH] 技能数量支持 3-4 个** - 基于 skillSlots 配置随机生成
3. **[HIGH] 遗物数量支持 1-2 个** - 基于 relicSlots 配置随机生成
4. **[HIGH] 稀有度权重实现** - selectItemsByRarity() 使用加权随机选择
5. **[MEDIUM] 移除未使用的 stageManager** - 构造函数简化为 (runState, stage, config?)
6. **[MEDIUM] instructionText 改为局部变量** - 不再作为成员变量
7. **[LOW] 添加布局常量** - CANVAS_WIDTH, ITEM_SPACING_X 等
8. **[LOW] 修复 displayWidth/displayHeight 命名** - 避免与 Container 冲突

### File List

- `src/src/scenes/shop/ShopConfig.ts` - Type definitions (NEW)
- `src/src/scenes/shop/ShopItemDisplay.ts` - Display component (NEW)
- `src/src/scenes/shop/ShopScene.ts` - Main scene with config support (NEW)
- `src/src/scenes/shop/index.ts` - Module exports (NEW)
- `src/assets/data/shop.json` - Configuration data (NEW)
- `src/src/core/events/EventBus.ts` - Added shop events (MODIFIED)
- `tests/unit/scenes/shop/ShopScene.test.ts` - Scene tests with config tests (NEW)
- `tests/unit/scenes/shop/ShopItemDisplay.test.ts` - Display tests (NEW)

## Change Log

| 日期 | 变更 |
|------|------|
| 2026-02-17 | 创建 Story 5.3 商店场景文档 |
| 2026-02-17 | 完成所有 6 个 Task，通过所有测试 |
| 2026-02-17 | 代码审查：修复 7 个问题（4 HIGH, 3 MEDIUM），新增 5 个测试 |
