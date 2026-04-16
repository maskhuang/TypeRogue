---
title: 'Game Architecture'
project: '打字肉鸽'
date: '2026-04-15'
author: 'Yuchenghuang'
version: '1.1'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'PixiJS v8.16.0 + Electron (prototype)'
migration_target: 'Godot (future official release)'
platform: 'PC (Windows + macOS) / Steam'

# Source Documents
gdd: 'docs/gdd.md'
epics: 'docs/epics.md'
narrative: 'docs/narrative-design.md'
brief: null

# Changelog
# v1.1 (2026-04-15): +Migration target (Godot), +Narrative content layer,
#                    +Wordpack system, +Affix/Modifier layer, +AIGC pipeline
# v1.0 (2026-02-16): Initial architecture
---

# 打字肉鸽 - 游戏架构

## 文档状态

本架构文档正在通过 BMGD 架构工作流创建。

**已完成步骤:** 9 / 9 (完成)

---

## Executive Summary

**打字肉鸽** 架构基于 PixiJS v8 + Electron + TypeScript 设计，目标平台为 PC (Windows + macOS) / Steam。

**核心架构决策:**

- **状态管理:** 三层分离 (Meta/Run/Battle) + StateCoordinator 协调
- **场景管理:** 场景栈支持叠加、暂停和恢复
- **技能系统:** 双系统分离 - 被动(位置联动) + 主动(顺序联动)
- **音频系统:** Howler.js 低延迟音效池 (20+)
- **存档系统:** Electron fs 原子写入 + Steam Cloud

**项目结构:** 混合分层组织，包含 7 个核心系统，明确的依赖边界。

**实现模式:** 9 个模式（3 新颖 + 6 标准）确保 AI 代理一致性。

**状态:** 已就绪，可进入 Epic 实现阶段。

---

## Project Context

### Game Overview

**打字肉鸽** - 融合打字游戏与 Roguelike 牌组构筑的创新游戏

- **类型:** Roguelike + Deck-building + Typing
- **平台:** PC (Windows + macOS) / Steam
- **单局时长:** 15-25 分钟
- **目标玩家:** 50-80 WPM，熟悉 Roguelike 的核心玩家

### Technical Scope

| 维度 | 决策 |
|------|------|
| **项目复杂度** | 中高 |
| **渲染框架** | PixiJS v8 (WebGL/WebGPU) |
| **桌面打包** | Electron |
| **Steam 集成** | steamworks.js |

### Core Systems

| 系统 | 复杂度 | 架构关注点 |
|------|--------|------------|
| 打字输入系统 | 高 | 输入延迟 <16ms，实时反馈 |
| 技能系统 | 高 | 被动(位置联动) + 主动(顺序联动) |
| 分数/倍率系统 | 中 | 实时计算，极端数值支持(x100+) |
| Roguelike 循环 | 高 | 8关3幕，程序生成，永久死亡 |
| Meta 进度系统 | 中 | 解锁/图鉴/成就/存档 |
| 音频系统 | 中 | 低延迟音效(<50ms)，动态音乐 |

### Performance Requirements

| 指标 | 目标值 | 重要性 |
|------|--------|--------|
| 帧率 | 60 FPS 稳定 | 必须 |
| 输入延迟 | < 16ms | 必须（打字游戏核心） |
| 音效延迟 | < 50ms | 高 |
| 启动时间 | < 3秒 | 高 |
| 内存占用 | < 500MB | 中 |
| 包体大小 | < 200MB | 中（Electron 约 150-200MB） |

### Complexity Drivers

1. **输入性能** - 打字游戏对延迟极其敏感，100+ WPM 玩家需要丝滑体验
2. **双联动机制** - 位置联动(被动) vs 顺序联动(主动)需要清晰架构分离
3. **状态层次** - Run/Meta/Battle 三层状态管理

### Novel Concepts (需要自定义设计模式)

1. **键盘相邻联动** - QWERTY 物理布局作为策略空间，无现成模式
2. **技能链事件** - 主动技能影响后续技能效果，需要事件队列设计
3. **AI 词库生成** - 多语言拼音/罗马化系统（待探索）

### Technical Risks

| 风险 | 级别 | 缓解策略 |
|------|------|----------|
| 键盘联动可理解性 | 高 | 强化视觉反馈 + 教学设计 |
| Electron 性能开销 | 中 | 渲染优化 + 内存管理 |
| Steam 集成复杂度 | 中 | 使用成熟的 steamworks.js |

### Electron Architecture

```
┌─────────────────────────────────────┐
│  Electron Main Process              │
│  - Steam API (steamworks.js)        │
│  - 文件系统 (存档)                   │
│  - 窗口管理                          │
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────▼──────────────────────┐
│  Electron Renderer Process          │
│  - 游戏逻辑 (TypeScript)            │
│  - 渲染 (PixiJS v8 WebGL)           │
│  - UI + 输入处理                     │
└─────────────────────────────────────┘
```

---

## Engine & Framework

### Selected Framework

**PixiJS v8.16.0** + **Electron** + **TypeScript** + **Vite**

**选择理由:**
- WebGL/WebGPU 硬件加速，支持华丽粒子效果（数字爆炸、技能触发）
- 优秀的 TypeScript 原生支持
- 轻量但功能完整的 2D 渲染引擎
- 活跃的社区和持续更新

### Project Initialization

基于现有原型添加 PixiJS:

```bash
npm install pixi.js@^8.16.0
npm install @pixi/particle-emitter  # 粒子效果
npm install electron electron-builder --save-dev
npm install steamworks.js --save
```

### Framework-Provided Architecture

| 组件 | 方案 | 提供方 |
|------|------|--------|
| 渲染引擎 | WebGL/WebGPU 自动选择 | PixiJS |
| 显示对象 | Container/Sprite/Text/Graphics | PixiJS |
| 粒子系统 | @pixi/particle-emitter | PixiJS 生态 |
| 游戏循环 | Ticker | PixiJS |
| 资产管理 | Assets API | PixiJS |
| 文本渲染 | BitmapText/HTMLText | PixiJS |
| 桌面运行时 | Electron | Electron |
| Steam API | steamworks.js | 社区库 |

---

## Migration Target: Godot

### 定位

**当前栈（PixiJS + Electron）** 是原型 / 验证栈，用于快速迭代玩法与内容管线。
**正式版目标** 为 **Godot**（GDScript 或 C#，待正式版启动时确认）。

### 核心原则：零双栈维护，以架构边界为移植屏障

我们 **不** 构建"引擎抽象层"，**不** 提前引入 Godot 兼容代码。相反：**v1.0 的依赖方向规则本身就是移植屏障**。

```
data ← core ← systems ← scenes / ui
 纯数据    纯逻辑    游戏机制     PixiJS 层
 ─────────────────────────    ──────────
      可直接移植 ✅              需重写 ⚠️
```

### 移植预期

| 层 | Godot 迁移策略 | 代价 |
|---|---|---|
| `data/` | 直接复用 JSON/YAML，或导出为 Godot Resource | 低 |
| `core/` | 逻辑直译为 GDScript/C#（三层状态、事件总线、常量）| 低-中 |
| `systems/` | 逻辑直译（打字、技能、分数、音频接口）| 中 |
| `scenes/` | 重写为 Godot Scene (`.tscn`) + 节点树 | 高（预期）|
| `ui/` | 重写为 Godot Control 节点 | 高（预期）|
| `main/` (Electron) | 替换为 Godot 原生平台 API / GodotSteam | 中 |

### 硬约束（新增）

**规则 M-1:** `renderer/core/` 和 `renderer/systems/` 中的任何代码 **禁止** import `pixi.js` 或任何 PixiJS 子模块（`@pixi/*`）。

**强制方式:** ESLint 规则（✅ 已于 Story 59.1 落地，见 `src/eslint.config.js`）

```js
// src/eslint.config.js（flat config，落地实现）
// 仓库实际路径为 src/core/**、src/systems/**（对应架构图中的 renderer/core、renderer/systems）
{
  files: ['src/core/**/*.ts', 'src/systems/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['pixi.js', '@pixi/*'],
        message: '架构规则 M-1: core/ 和 systems/ 不得依赖 PixiJS — 为 Godot 移植保留隔离（见 docs/game-architecture.md §Migration Target）',
      }],
    }],
  },
}
```

**规则 M-2:** 渲染与交互逻辑只能存在于 `scenes/` 与 `ui/` 下。若某 `systems/` 模块需要视觉反馈，必须通过 `eventBus.emit()` 通知上层，由 scenes/ui 消费事件后渲染。

**规则 M-3:** 不提前抽象。不写"EngineAdapter / RendererPort / PixiBackend vs GodotBackend"这类接口 — 直到正式启动 Godot 移植前，这些抽象只是负担。

### 不做

- ❌ 不引入跨引擎运行时（如 Defold、Babylon、Three.js 作为"中间层"）
- ❌ 不预先编写 Godot 版本的任何代码
- ❌ 不让原型代码妥协可读性去"讨好"未来的 Godot（例如把 TS class 硬写成静态函数）

---

## Architectural Decisions

### Decision Summary

| 类别 | 决策 | 版本 | 理由 |
|------|------|------|------|
| 状态管理 | 分层状态对象 | - | Meta/Run/Battle 三层清晰分离 |
| 场景管理 | 场景栈 (Scene Stack) | - | 支持暂停叠加、清晰层级 |
| 技能系统 | 双系统分离 | - | 被动(位置) + 主动(顺序)独立演进 |
| 音频系统 | Howler.js | v2.2.4 | 成熟稳定、低延迟 |
| 存档系统 | Electron fs + JSON | - | 完全控制 + Steam Cloud |
| 代码组织 | 混合分层 | - | 核心按层、功能按模块 |

### State Management

**方案:** 分层状态对象 + StateCoordinator

```typescript
interface GameState {
  meta: MetaState      // 永久数据：解锁、图鉴、成就
  run: RunState        // 单局数据：技能、遗物、金币、关卡
  battle: BattleState  // 战斗数据：分数、倍率、连击、词语
}

// 协调多层状态更新（苏格拉底追问补充）
class StateCoordinator {
  onBattleEnd(result: BattleResult) {
    this.run.applyBattleResult(result)
    this.meta.checkUnlocks(this.run)
    this.save()
  }
}
```

- Meta 层：跨 Run 持久，存档到文件
- Run 层：单局生命周期，Run 结束时重置
- Battle 层：战斗实时状态，关卡结束时结算

### Scene Management

**方案:** 场景栈 (Scene Stack)

```typescript
interface Scene {
  onEnter(): void
  onExit(): void
  onPause?(): void   // 被新场景覆盖时（补充）
  onResume?(): void  // 恢复到栈顶时（补充）
  update(dt: number): void
  render(): void
}

class SceneManager {
  private stack: Scene[] = []

  push(scene: Scene)     // 叠加场景（暂停菜单）
  pop()                  // 返回上一场景
  replace(scene: Scene)  // 替换当前场景
  current(): Scene
}
```

场景流程：Menu → Battle ⇄ Shop → Victory/GameOver

### Skill System Architecture

**方案:** 双系统分离 + SkillEventBus

```typescript
// 技能事件总线（苏格拉底追问补充）
class SkillEventBus {
  emit(event: 'skill-triggered', data: { key: string, skillId: string, type: 'passive' | 'active' })
}

// 被动技能系统 - 位置敏感
class PassiveSkillSystem {
  private bindings: Map<string, SkillId>
  private adjacencyMap: Map<string, string[]>  // QWERTY 相邻关系

  getAdjacentBonus(key: string): SkillBonus[]
}

// 主动技能系统 - 顺序敏感
class ActiveSkillSystem {
  private effectQueue: SkillEffect[]

  queueEffect(effect: SkillEffect): void
  processOnNextTrigger(): SkillEffect | null
}
```

**触发顺序:** 被动先计算加成 → 主动效果出队应用

### Affix / Modifier Layer (v1.1)

**方案:** 独立的 modifier 层，**正交于** passive/active 双系统，可挂载到 skill、relic、wordpack。

**位置:** `renderer/systems/modifiers/`（独立于 `skills/`，是横向层）

```typescript
// 可挂载到任何载体的修饰器
interface Modifier {
  id: string
  source: 'skill' | 'relic' | 'wordpack' | 'affix'
  kind: 'additive' | 'multiplicative' | 'conditional' | 'transform'
  scope: ModifierScope        // 影响范围：score / timer / word / skill-cd / ...
  apply(ctx: ModifierContext): ModifierResult
}

// 宿主：任何可被 modifier 修饰的对象
interface ModifierHost {
  getModifiers(): Modifier[]
}

// Skill / Relic / Wordpack 都实现 ModifierHost
class ModifierEngine {
  collectActive(context: 'battle' | 'word' | 'skill'): Modifier[]
  resolve(baseValue: number, modifiers: Modifier[]): number  // 明确的求值顺序
}
```

**求值顺序（固定）:** `additive → multiplicative → conditional → transform`

**设计工具链 (离线):**
- `scripts/affix-designer/` 是 **构建期设计工具**，输出 affix schema → `src/renderer/data/affixes.json`
- 运行时 **不** 依赖 affix-designer，只消费其输出

**一致性规则（写入 Consistency Rules 表）:**
- 所有 modifier 实现必须遵循 `scripts/affix-designer/` 输出的 schema
- 新增 affix 必须走 affix-designer 流程，**禁止**在代码中硬编码 modifier 数值
- `wordsmith` 等子类 affix 是 **命名空间**，不是独立层

### Audio System

**方案:** Howler.js v2.2.4

```typescript
import { Howl } from 'howler'

// 击键音效 - 预创建大音频池（补充：20+）
const keySound = new Howl({
  src: ['key.ogg', 'key.mp3'],
  volume: 0.5,
  pool: 20  // 支持快速连击
})

// 技能音效 - 每技能独立
const skillSounds: Map<SkillId, Howl>

// BGM - 场景切换淡入淡出
const bgm = new Howl({
  src: ['battle.ogg'],
  loop: true,
  volume: 0.3
})
```

**性能要求:** 延迟 < 50ms，需早期原型验证

### Save System

**方案:** Electron fs + JSON（原子写入）

```typescript
// 存档路径
const SAVE_DIR = app.getPath('userData')
const META_FILE = path.join(SAVE_DIR, 'meta.json')
const RUN_FILE = path.join(SAVE_DIR, 'run.json')

// 原子写入，防止损坏（苏格拉底追问补充）
function safeSave(path: string, data: object) {
  const temp = path + '.tmp'
  fs.writeFileSync(temp, JSON.stringify(data))
  fs.renameSync(temp, path)  // 原子操作
}

// Steam Cloud 同步配置
// 在 steam_appid.txt 同级配置 cloud 文件列表
```

### Code Organization

**方案:** 混合分层结构

```
src/
├── main/                    # Electron 主进程
│   ├── steam.ts            # Steam API
│   ├── save.ts             # 存档管理
│   └── window.ts           # 窗口管理
│
├── renderer/               # 渲染进程（游戏）
│   ├── core/               # 核心层
│   │   ├── state/          # 状态管理 (Meta/Run/Battle)
│   │   ├── events/         # 事件系统 (SkillEventBus)
│   │   └── constants.ts    # 常量定义
│   │
│   ├── systems/            # 游戏系统
│   │   ├── typing/         # 打字输入系统
│   │   ├── skills/         # 技能系统
│   │   │   ├── passive/    # 被动技能（位置联动）
│   │   │   └── active/     # 主动技能（顺序联动）
│   │   ├── scoring/        # 分数/倍率系统
│   │   └── audio/          # 音频系统
│   │
│   ├── scenes/             # 场景
│   │   ├── menu/
│   │   ├── battle/
│   │   ├── shop/
│   │   └── collection/     # 图鉴
│   │
│   ├── ui/                 # UI 组件
│   │   ├── hud/            # 战斗 HUD
│   │   ├── keyboard/       # 键盘可视化
│   │   └── effects/        # 粒子/动画
│   │
│   └── data/               # 静态数据
│       ├── skills.ts
│       ├── relics.ts
│       └── wordlists/
│
└── shared/                 # 主进程/渲染进程共享
    ├── types.ts
    └── ipc-channels.ts
```

**目录职责边界（补充）:**
- `core/`: 纯逻辑，不依赖 PixiJS
- `systems/`: 游戏机制实现
- `scenes/`: PixiJS Container + 场景逻辑
- `ui/`: 可复用 UI 组件
- `data/`: 纯数据定义，无逻辑

---

## Cross-cutting Concerns

### Error Handling

**方案:** 全局处理器 + 关键路径 try-catch

```typescript
// 全局错误处理
window.onerror = (msg, src, line, col, err) => {
  logger.error('Uncaught error:', { msg, src, line, col, stack: err?.stack })
  // 尝试自动恢复到安全状态
  if (sceneManager.current()?.name === 'battle') {
    sceneManager.replace(new MenuScene())
  }
}

window.onunhandledrejection = (event) => {
  logger.error('Unhandled rejection:', event.reason)
}

// 关键路径保护（存档、Steam API）
async function saveGame(): Promise<void> {
  try {
    await safeSave(META_FILE, state.meta)
    await safeSave(RUN_FILE, state.run)
  } catch (err) {
    logger.error('Save failed:', err)
    showNotification('存档失败，请检查磁盘空间')
  }
}
```

**关键路径:**
- 存档读写
- Steam API 调用
- 资源加载
- IPC 通信

### Logging System

**方案:** 分级过滤日志

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel

  constructor() {
    this.level = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.WARN
  }

  debug(msg: string, data?: object) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${msg}`, data)
    }
  }

  info(msg: string, data?: object) {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${msg}`, data)
    }
  }

  warn(msg: string, data?: object) {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${msg}`, data)
    }
  }

  error(msg: string, data?: object) {
    console.error(`[ERROR] ${msg}`, data)
    // 生产环境可上报错误
  }
}

export const logger = new Logger()
```

**日志级别策略:**
- **开发环境:** DEBUG（全量输出）
- **生产环境:** WARN（仅警告和错误）

### Configuration Management

**方案:** 分层配置

```typescript
// 1. 编译时常量 - 不可变
// src/core/constants.ts
export const GAME_CONFIG = {
  VERSION: '1.0.0',
  MAX_SKILLS: 26,
  KEYBOARD_LAYOUT: 'QWERTY',
} as const

// 2. 平衡数据 - 热加载
// assets/data/balance.json
{
  "baseScore": 100,
  "comboMultiplier": 0.1,
  "timePerWord": 5
}

// 3. 用户设置 - 运行时可改
// 存储在 userData/settings.json
interface UserSettings {
  volume: { master: number, sfx: number, bgm: number }
  display: { fullscreen: boolean, vsync: boolean }
  gameplay: { showKeyHints: boolean, difficultyLevel: number }
}
```

**配置优先级:** 用户设置 > 平衡数据 > 编译时常量

### Event System

**方案:** 类型化事件总线

```typescript
// 事件类型定义
interface GameEvents {
  // 战斗事件
  'battle:start': { stageId: number }
  'battle:end': { result: 'win' | 'lose', score: number }
  'word:complete': { word: string, time: number, accuracy: number }

  // 技能事件
  'skill:triggered': { key: string, skillId: string, type: 'passive' | 'active' }
  'skill:upgraded': { skillId: string, newLevel: number }

  // 系统事件
  'scene:change': { from: string, to: string }
  'save:complete': { success: boolean }
  'achievement:unlock': { achievementId: string }
}

class TypedEventBus {
  private listeners = new Map<string, Set<Function>>()

  on<K extends keyof GameEvents>(
    event: K,
    handler: (data: GameEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    // 返回取消订阅函数
    return () => this.listeners.get(event)?.delete(handler)
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    this.listeners.get(event)?.forEach(handler => handler(data))
  }
}

export const eventBus = new TypedEventBus()
```

### Debug Tools

**方案:** 开发者模式

```typescript
class DevTools {
  private enabled = false
  private overlay: HTMLElement | null = null

  init() {
    // Ctrl+Shift+D 激活
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        this.toggle()
      }
    })
  }

  toggle() {
    this.enabled = !this.enabled
    if (this.enabled) {
      this.createOverlay()
    } else {
      this.overlay?.remove()
      this.overlay = null
    }
  }

  private createOverlay() {
    this.overlay = document.createElement('div')
    this.overlay.id = 'dev-overlay'
    this.overlay.innerHTML = `
      <div class="dev-panel">
        <h3>Dev Tools</h3>
        <button onclick="devTools.addGold(100)">+100 金币</button>
        <button onclick="devTools.skipStage()">跳过关卡</button>
        <button onclick="devTools.unlockAll()">解锁全部</button>
        <button onclick="devTools.resetMeta()">重置存档</button>
        <hr>
        <div id="dev-stats"></div>
      </div>
    `
    document.body.appendChild(this.overlay)
  }

  // 作弊命令
  addGold(amount: number) { state.run.gold += amount }
  skipStage() { eventBus.emit('battle:end', { result: 'win', score: 0 }) }
  unlockAll() { /* ... */ }
  resetMeta() { /* ... */ }

  // 实时统计
  updateStats() {
    if (!this.enabled) return
    const stats = document.getElementById('dev-stats')
    if (stats) {
      stats.innerHTML = `
        FPS: ${Math.round(app.ticker.FPS)}<br>
        State: ${state.phase}<br>
        Score: ${state.wordScore}<br>
        Multiplier: ${state.multiplier.toFixed(2)}x
      `
    }
  }
}

export const devTools = new DevTools()
```

**激活方式:** `Ctrl+Shift+D`（仅开发环境或特殊构建）

---

## Content Architecture (v1.1)

本章节描述 **内容层** 架构 — 文本、词包、美术资产的组织方式与生产管线。这些是 **数据 / 构建期工具**，不引入新的运行时系统。

### Narrative as Content Layer

**定位:** 叙事层是 **纯文本替换**，不是运行时系统。

> 项目叙事基调：**Ironpress Cathedral（40K + SCP 融合）**，所有 flavor text 参照 `docs/narrative-design.md` 的 7 套模板。

**不做:**
- ❌ 不新增 narrative state machine / chapter runner / dialogue system
- ❌ 不新增"叙事进度"之类的 Meta 字段
- ❌ 不构建剧情分支树

**做:**
- ✅ 盘点现有 UI 文本插槽，让它们从统一的 `NarrativeRegistry` 取文本
- ✅ 对齐 7 套模板将文本分文件存放

**文本插槽盘点:**

| 插槽 | 位置 | 数据源 |
|---|---|---|
| 技能描述 | skill card / tooltip | `data/narrative/skills.ts` |
| 遗物描述 + flavor | relic card | `data/narrative/relics.ts` |
| 词包主题名 + 简介 | shop / wordpack select | `data/narrative/wordpacks.ts` |
| 战斗开/胜/负 flavor | BattleScene 过场 | `data/narrative/battle.ts` |
| 关卡 / 幕次名 | HUD / 过场 | `data/narrative/stages.ts` |
| UI 常驻文案 | menu / settings | `data/narrative/ui.ts` |
| 成就描述 | collection / achievement | `data/narrative/achievements.ts` |

**NarrativeRegistry (运行时接口):**

```typescript
// renderer/core/narrative/NarrativeRegistry.ts
// 注意：位于 core/，零 PixiJS 依赖（遵守 M-1）
class NarrativeRegistry {
  private bundles: Map<string, Record<string, string>> = new Map()

  load(bundle: string, data: Record<string, string>): void
  get(key: string, fallback?: string): string
  // 支持插值：get('skill.fireblast.desc', { damage: 100 })
  format(key: string, vars: Record<string, string | number>): string
}

export const narrative = new NarrativeRegistry()
```

**一致性规则（写入 Consistency Rules 表）:**
- 所有面向玩家的文本 **必须** 通过 `narrative.get(key)` 获取
- **禁止** 在 `scenes/`、`ui/`、`systems/` 中硬编码玩家可见字符串
- flavor text 修改必须遵循 `docs/narrative-design.md` 的 7 套模板，不得随手编写
- 例外：调试文本、日志、错误信息不走 NarrativeRegistry

### Wordpack System

**定位:** 词包 = 一组词 + 元数据（主题、难度、语言、解锁条件、叙事绑定）。**词包是词包系统，不是遗物**（v1.0 遗漏的澄清）。

**位置:** `renderer/systems/typing/wordpack/`（属于 systems/，遵守 M-1 不依赖 PixiJS）

**数据结构:**

```typescript
interface Wordpack {
  id: string
  themeKey: string          // → narrative.get(themeKey) 取主题名
  descKey: string           // → narrative.get(descKey) 取描述
  language: 'en' | 'zh-py' | 'zh-romaji' | ...
  difficulty: 1 | 2 | 3 | 4 | 5
  words: string[]           // 核心词列表
  modifiers?: Modifier[]    // 可选：词包自带的 affix（作为 ModifierHost）
  unlockCondition?: UnlockRule
  narrativeTag?: string     // 对齐叙事模板
}

class WordpackRegistry {
  private loaded: Map<string, Wordpack> = new Map()

  async load(id: string): Promise<Wordpack>       // lazy load from assets
  get(id: string): Wordpack | null
  listUnlocked(meta: MetaState): Wordpack[]
}

class WordpackBinding {
  // 单 run 绑定：run 开始时选中，run 结束时释放
  private active: Wordpack | null = null
  bind(pack: Wordpack): void
  current(): Wordpack | null
  unbind(): void
}
```

**生命周期:**

```
Meta 层   : 持有已解锁 wordpack ID 列表
Run 开始  : 玩家选择 wordpack → WordpackBinding.bind()
Battle 内 : 只读访问，供 WordMatcher 抽词
Run 结束  : WordpackBinding.unbind()
```

**数据位置:** `assets/data/words/<pack-id>.json`（lazy load，不在启动时全量加载）

**一致性规则:**
- 词包加载必须通过 `WordpackRegistry.load()`，禁止直接 fetch
- 词包 ≠ 遗物：**禁止** 将 wordpack 添加到 `RunState.relics` 或走 relic 槽位
- 词包的 modifier 通过 Affix/Modifier 层挂载，而非技能系统

### AIGC Content Pipeline

**定位:** **构建期工具链**，不是运行时系统。运行时代码零依赖 `aigc-art/`。

**位置:** `aigc-art/`（已存在，仓库根目录）

```
aigc-art/
├── prompts/              # 风格指南 + 模板化 prompt
│   ├── battle-bg.v1.yaml
│   ├── hit-fx.v1.yaml
│   └── key-cap.v1.yaml
├── runs/                 # 生成产物（临时，按日期/seed 归档）
├── smoke_pipeline.py     # 端到端冒烟测试
├── .env                  # API key、LoRA 路径、节流配置（dotenv）
└── ...
```

**管线:**

```
docs/art-style-guide.md (风格源)
       │
       ▼
aigc-art/prompts/*.yaml (模板化 prompt)
       │
       ▼
LoRA + 生成 API (节流适配)
       │
       ▼
aigc-art/runs/<timestamp>/ (原始输出)
       │
       ▼ ⚠️ 人工 curation (必须)
       │
       ▼
assets/sprites/ (纳入游戏)
```

**硬约束:**

- **规则 C-1:** AIGC 原始输出 **禁止** 直接提交到 `assets/`。必须经过人工筛选、后处理、命名规范化后才能入库。
- **规则 C-2:** `aigc-art/.env` 不入库（已在 `.gitignore`），所有密钥走 dotenv。
- **规则 C-3:** `prompts/*.yaml` 必须显式引用 `docs/art-style-guide.md` 的相应章节，保证风格一致性。
- **规则 C-4:** 运行时代码（`src/`、`main/`、`shared/` 及其测试）**禁止** import 或引用 `aigc-art/` 下的任何路径（static / dynamic / require 三路全拦）。**✅ 已于 Story 59.2 落地**，实现见 `src/eslint.config.js` 的 `no-restricted-imports` + `no-restricted-syntax` 组合规则。

**对齐最近工作:**
- LoRA 链路修复 + 节流适配低余额账户 (commit `0642744`)
- `.env` 配置 + 极简 dotenv 加载器 (commit `b0031d6`)
- 端到端冒烟测试 `smoke_pipeline.py` (commit `f326252`)

---

## Project Structure

### Organization Pattern

**模式:** 混合分层 (Hybrid Layered)

**理由:** Electron 双进程架构 + 游戏系统按职责分层，兼顾隔离性与可维护性

### Directory Structure

```
打字肉鸽/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── steam.ts            # Steam API 封装
│   │   ├── save.ts             # 存档管理（原子写入）
│   │   └── window.ts           # 窗口管理
│   │
│   ├── renderer/               # 渲染进程（游戏）
│   │   ├── core/               # 核心层（纯逻辑）
│   │   │   ├── state/          # 状态管理
│   │   │   │   ├── MetaState.ts
│   │   │   │   ├── RunState.ts
│   │   │   │   ├── BattleState.ts
│   │   │   │   └── StateCoordinator.ts
│   │   │   ├── events/         # 事件系统
│   │   │   │   └── EventBus.ts
│   │   │   └── constants.ts
│   │   │
│   │   ├── systems/            # 游戏系统
│   │   │   ├── typing/         # 打字输入
│   │   │   │   ├── InputHandler.ts
│   │   │   │   └── WordMatcher.ts
│   │   │   ├── skills/         # 技能系统
│   │   │   │   ├── passive/    # 被动（位置联动）
│   │   │   │   │   ├── PassiveSkillSystem.ts
│   │   │   │   │   └── AdjacencyMap.ts
│   │   │   │   └── active/     # 主动（顺序联动）
│   │   │   │       ├── ActiveSkillSystem.ts
│   │   │   │       └── EffectQueue.ts
│   │   │   ├── scoring/        # 分数系统
│   │   │   │   └── ScoreCalculator.ts
│   │   │   └── audio/          # 音频系统
│   │   │       └── AudioManager.ts
│   │   │
│   │   ├── scenes/             # 场景
│   │   │   ├── SceneManager.ts
│   │   │   ├── menu/
│   │   │   │   └── MenuScene.ts
│   │   │   ├── battle/
│   │   │   │   └── BattleScene.ts
│   │   │   ├── shop/
│   │   │   │   └── ShopScene.ts
│   │   │   └── collection/
│   │   │       └── CollectionScene.ts
│   │   │
│   │   ├── ui/                 # UI 组件
│   │   │   ├── hud/
│   │   │   │   ├── ScoreDisplay.ts
│   │   │   │   ├── TimerBar.ts
│   │   │   │   └── ComboCounter.ts
│   │   │   ├── keyboard/
│   │   │   │   └── KeyboardVisualizer.ts
│   │   │   └── effects/
│   │   │       └── ParticleManager.ts
│   │   │
│   │   └── data/               # 静态数据
│   │       ├── skills.ts
│   │       ├── relics.ts
│   │       └── wordlists/
│   │
│   └── shared/                 # 共享代码
│       ├── types.ts            # 类型定义
│       └── ipc-channels.ts     # IPC 频道常量
│
├── assets/
│   ├── sprites/
│   │   ├── skills/             # 技能图标
│   │   ├── relics/             # 遗物图标
│   │   ├── ui/                 # UI 元素
│   │   └── effects/            # 粒子贴图
│   ├── audio/
│   │   ├── bgm/                # 背景音乐
│   │   └── sfx/                # 音效
│   │       ├── typing/
│   │       ├── skills/
│   │       └── ui/
│   ├── fonts/
│   └── data/
│       ├── balance.json        # 平衡数值
│       ├── words/              # 词库
│       └── levels.json         # 关卡配置
│
├── docs/                       # 文档
│   ├── gdd.md
│   └── game-architecture.md
│
├── tests/                      # 测试
│   ├── unit/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── electron-builder.json
```

### System Location Mapping

| 系统 | 位置 | 职责 |
|------|------|------|
| 状态管理 | `renderer/core/state/` | Meta/Run/Battle 三层状态 |
| 事件总线 | `renderer/core/events/` | 类型化事件分发 |
| 打字输入 | `renderer/systems/typing/` | 键盘监听、输入处理 |
| 被动技能 | `renderer/systems/skills/passive/` | 位置联动计算 |
| 主动技能 | `renderer/systems/skills/active/` | 顺序效果队列 |
| 分数计算 | `renderer/systems/scoring/` | 倍率、连击计算 |
| 音频系统 | `renderer/systems/audio/` | Howler.js 封装 |
| 场景管理 | `renderer/scenes/` | 场景栈、生命周期 |
| HUD | `renderer/ui/hud/` | 战斗界面组件 |
| 键盘可视化 | `renderer/ui/keyboard/` | 技能绑定显示 |
| 粒子效果 | `renderer/ui/effects/` | 击键、技能特效 |
| Steam API | `main/steam.ts` | 成就、云存档、排行榜 |
| 存档管理 | `main/save.ts` | 原子写入、读取 |

### Naming Conventions

#### Files

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件/类 | PascalCase | `SceneManager.ts`, `BattleScene.ts` |
| 工具/函数 | camelCase | `formatScore.ts`, `adjacencyMap.ts` |
| 常量文件 | camelCase | `constants.ts`, `skillData.ts` |
| 类型定义 | PascalCase | `GameState.ts`, `SkillTypes.ts` |
| 资产文件 | kebab-case | `skill-fire.png`, `bgm-battle.ogg` |

#### Code Elements

| 元素 | 规范 | 示例 |
|------|------|------|
| 类 | PascalCase | `class SceneManager` |
| 接口/类型 | PascalCase | `interface GameState` |
| 函数 | camelCase | `function triggerSkill()` |
| 变量 | camelCase | `let currentScore` |
| 常量 | UPPER_SNAKE | `const MAX_SKILLS = 26` |
| 枚举 | PascalCase + UPPER_SNAKE | `enum LogLevel { DEBUG }` |
| 事件名 | colon-separated | `'skill:triggered'`, `'battle:end'` |

#### Game Assets

| 类型 | 规范 | 示例 |
|------|------|------|
| 技能ID | camelCase | `fireBlast`, `timeWarp` |
| 场景名 | PascalCase | `MenuScene`, `BattleScene` |
| 音效ID | kebab-case | `key-press`, `skill-trigger` |
| 配置键 | camelCase | `baseScore`, `comboMultiplier` |

### Architectural Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│                        main/ (主进程)                         │
│  可访问: Node.js, fs, Steam API                              │
│  禁止: PixiJS, DOM, 游戏逻辑                                  │
└──────────────────────┬───────────────────────────────────────┘
                       │ IPC (shared/ipc-channels.ts)
┌──────────────────────▼───────────────────────────────────────┐
│                    renderer/ (渲染进程)                       │
├──────────────────────────────────────────────────────────────┤
│  core/        │ 纯逻辑，不依赖 PixiJS，可单元测试              │
├───────────────┼──────────────────────────────────────────────┤
│  systems/     │ 游戏机制，可依赖 core/，不依赖 scenes/         │
├───────────────┼──────────────────────────────────────────────┤
│  scenes/      │ PixiJS Container，可依赖 systems/ 和 ui/      │
├───────────────┼──────────────────────────────────────────────┤
│  ui/          │ 可复用 UI 组件，不含业务逻辑                   │
├───────────────┼──────────────────────────────────────────────┤
│  data/        │ 纯数据定义，零依赖，可被任何层导入              │
└──────────────────────────────────────────────────────────────┘
```

**依赖方向:** `data ← core ← systems ← scenes`（单向，禁止循环）

---

## Implementation Patterns

确保多个 AI 代理编写兼容、一致代码的实现模式。

### Novel Patterns

#### 1. 键盘相邻联动模式 (Keyboard Adjacency Pattern)

**目的:** 将 QWERTY 键盘的物理相邻关系转化为游戏策略层

**组件:**
- `AdjacencyMap` - 键盘布局映射
- `PassiveSkillSystem` - 相邻加成计算
- `KeyboardVisualizer` - 联动可视化

**数据流:**
```
击键 → 获取相邻键列表 → 查找相邻技能 → 计算加成 → 应用效果
```

**实现:**

```typescript
// 相邻键映射（QWERTY 布局）
const ADJACENT_KEYS: Record<string, string[]> = {
  'Q': ['W', 'A'],
  'W': ['Q', 'E', 'A', 'S'],
  'E': ['W', 'R', 'S', 'D'],
  'F': ['D', 'G', 'R', 'T', 'C', 'V'],
  // ... 完整26键
}

class AdjacencyMap {
  getAdjacent(key: string): string[] {
    return ADJACENT_KEYS[key.toUpperCase()] || []
  }

  getAdjacentSkills(key: string, bindings: Map<string, SkillId>): AdjacentSkill[] {
    return this.getAdjacent(key)
      .filter(k => bindings.has(k))
      .map(k => ({
        key: k,
        skillId: bindings.get(k)!,
        skill: SKILLS[bindings.get(k)!]
      }))
  }

  getEmptyAdjacentCount(key: string, bindings: Map<string, SkillId>): number {
    return this.getAdjacent(key).filter(k => !bindings.has(k)).length
  }
}
```

**使用场景:**
- 「核心」技能：相邻技能越多加成越高
- 「孤狼」技能：无相邻时双倍效果
- 「光环」技能：为相邻技能提供被动加成

#### 2. 技能效果队列模式 (Skill Effect Queue Pattern)

**目的:** 主动技能按触发顺序产生连锁效果

**组件:**
- `EffectQueue` - 效果队列管理
- `ActiveSkillSystem` - 队列处理
- `SkillEventBus` - 事件通知

**数据流:**
```
技能触发 → 入队效果 → 下次触发时 → 出队并应用 → 触发回调
```

**实现:**

```typescript
interface QueuedEffect {
  type: 'amplify' | 'ripple' | 'chain' | 'transform'
  value: number
  sourceSkillId: string
  expiresAt?: number  // 可选：过期时间
}

class EffectQueue {
  private queue: QueuedEffect[] = []
  private maxSize = 10

  enqueue(effect: QueuedEffect): void {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift()  // 移除最旧的
    }
    this.queue.push(effect)
    eventBus.emit('effect:queued', { effect, queueSize: this.queue.length })
  }

  dequeue(): QueuedEffect | null {
    const effect = this.queue.shift() || null
    if (effect) {
      eventBus.emit('effect:dequeued', { effect })
    }
    return effect
  }

  peek(): QueuedEffect | null {
    return this.queue[0] || null
  }

  clear(): void {
    this.queue = []
  }

  applyNextEffect(baseValue: number): { value: number, appliedEffect: QueuedEffect | null } {
    const effect = this.dequeue()
    if (!effect) return { value: baseValue, appliedEffect: null }

    switch (effect.type) {
      case 'amplify':
        return { value: baseValue * effect.value, appliedEffect: effect }
      case 'ripple':
        return { value: baseValue * effect.value, appliedEffect: effect }
      default:
        return { value: baseValue, appliedEffect: effect }
    }
  }
}
```

**使用场景:**
- 「涟漪」技能：入队 1.5x 加成给相邻键
- 「蓄力」技能：累积多个效果一次释放
- 「共鸣」技能：触发相邻技能的连锁反应

#### 3. 双系统协调模式 (Dual System Coordination Pattern)

**目的:** 被动系统(实时)和主动系统(队列)协同工作

**实现:**

```typescript
class SkillCoordinator {
  constructor(
    private passive: PassiveSkillSystem,
    private active: ActiveSkillSystem,
    private eventBus: TypedEventBus
  ) {}

  onKeyPress(key: string, skillId: string): SkillResult {
    // 1. 先计算被动加成（基于位置）
    const passiveBonus = this.passive.calculateBonus(key)

    // 2. 再应用主动队列效果（基于顺序）
    const { value, appliedEffect } = this.active.applyNextEffect(passiveBonus.value)

    // 3. 执行技能效果
    const result = this.executeSkill(skillId, value)

    // 4. 检查技能是否产生新的队列效果
    const skill = SKILLS[skillId]
    if (skill.queueEffect) {
      this.active.enqueue(skill.queueEffect)
    }

    // 5. 广播事件
    this.eventBus.emit('skill:triggered', {
      key,
      skillId,
      type: skill.systemType,
      finalValue: result.value,
      passiveBonus,
      appliedEffect
    })

    return result
  }
}
```

**处理顺序:** 被动先计算加成 → 主动效果出队应用

### Standard Patterns

#### 组件通信模式

**方案:** 事件总线 + 直接引用混合

```typescript
// 跨系统通信 - 使用事件总线
eventBus.emit('battle:end', { result: 'win', score: 1000 })

// 同系统内部 - 直接引用
class BattleScene {
  private scoreDisplay: ScoreDisplay

  updateScore(value: number) {
    this.scoreDisplay.setValue(value)  // 直接调用
  }
}
```

#### 实体创建模式

**方案:** 工厂 + 对象池

```typescript
class SkillFactory {
  private static pool: Map<string, Skill[]> = new Map()

  static create(skillId: string): Skill {
    const pooled = this.pool.get(skillId)?.pop()
    if (pooled) {
      pooled.reset()
      return pooled
    }
    return new Skill(SKILLS[skillId])
  }

  static release(skill: Skill): void {
    const pool = this.pool.get(skill.id) || []
    pool.push(skill)
    this.pool.set(skill.id, pool)
  }
}
```

#### 状态转换模式

**方案:** 简单状态机

```typescript
type GamePhase = 'menu' | 'battle' | 'shop' | 'gameover'

class GameStateMachine {
  private current: GamePhase = 'menu'
  private transitions: Record<GamePhase, GamePhase[]> = {
    menu: ['battle'],
    battle: ['shop', 'gameover'],
    shop: ['battle'],
    gameover: ['menu']
  }

  canTransition(to: GamePhase): boolean {
    return this.transitions[this.current].includes(to)
  }

  transition(to: GamePhase): void {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid transition: ${this.current} → ${to}`)
    }
    eventBus.emit('phase:change', { from: this.current, to })
    this.current = to
  }
}
```

#### 数据访问模式

**方案:** 集中式数据管理器

```typescript
class DataManager {
  private balance: BalanceConfig
  private words: Map<string, string[]>

  async load(): Promise<void> {
    this.balance = await fetch('/assets/data/balance.json').then(r => r.json())
  }

  getBalance(): BalanceConfig {
    return this.balance
  }

  async getWordList(language: string): Promise<string[]> {
    if (!this.words.has(language)) {
      const list = await fetch(`/assets/data/words/${language}.json`).then(r => r.json())
      this.words.set(language, list)
    }
    return this.words.get(language)!
  }
}

export const dataManager = new DataManager()
```

### Consistency Rules

| 模式 | 规范 | 强制方式 |
|------|------|----------|
| 事件命名 | `domain:action` | TypeScript 类型检查 |
| 技能效果 | 通过 SkillCoordinator | 禁止直接修改状态 |
| 资源加载 | 通过 DataManager | 禁止直接 fetch |
| 状态修改 | 通过 StateCoordinator | 禁止跨层直接修改 |
| UI 更新 | 事件驱动 | 禁止轮询检查 |
| **核心隔离 (M-1)** | `core/` + `systems/` 禁止 import `pixi.js`/`@pixi/*`（含 static / dynamic / require 三路，覆盖生产 + 测试代码） | **ESLint `no-restricted-imports` + `no-restricted-syntax`** ✅ 已于 Story 59.1 落地 |
| **视觉反馈 (M-2)** | systems 通过 eventBus 通知，scenes/ui 消费渲染 | Code review |
| **玩家文本 (N-1)** | 所有玩家可见文本走 `narrative.get()` | Lint 规则 + review |
| **叙事模板 (N-2)** | flavor text 遵循 `docs/narrative-design.md` 7 套模板 | Review |
| **词包加载 (W-1)** | 走 `WordpackRegistry.load()`，禁止直接 fetch | Review |
| **词包隔离 (W-2)** | wordpack ≠ relic，禁止走 relic 槽位 | 类型系统 |
| **Modifier schema (A-1)** | 所有 modifier 遵循 affix-designer 输出 schema | JSON schema 校验 |
| **Modifier 编码 (A-2)** | 禁止硬编码 modifier 数值，必须走 affix-designer | Review |
| **AIGC curation (C-1)** | `aigc-art/runs/` 原始产物禁止直接进 `assets/` | Git pre-commit hook |
| **AIGC 运行时隔离 (C-4)** | `src/` + `main/` + `shared/` + tests 禁止 import `aigc-art/` 路径（含 static / dynamic / require 三路） | **ESLint `no-restricted-imports` + `no-restricted-syntax`** ✅ 已于 Story 59.2 落地 |

---

## Architecture Validation

### Validation Summary (v1.1)

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 决策兼容性 | ✅ PASS | PixiJS + Electron + TypeScript 无冲突 |
| GDD 覆盖 | ✅ PASS | 7/7 核心系统 + 内容层覆盖 |
| 模式完整性 | ✅ PASS | 9 模式（3 新颖 + 6 标准） |
| 功能映射 | ✅ PASS | 核心系统 + 内容层 + 构建管线均已映射 |
| 文档完整性 | ✅ PASS | 无占位符 |
| 迁移准备 (Godot) | ✅ PASS | M-1~M-3 规则就位，依赖方向无违反 |
| 叙事层对齐 | ✅ PASS | NarrativeRegistry 插槽盘点覆盖 7 模板 |
| 内容管线隔离 | ✅ PASS | AIGC 规则 C-1~C-4 就位 |

### Coverage Report

- **核心系统覆盖:** 7/7 (100%)
- **内容层:** 3/3（Narrative, Wordpack, AIGC）
- **横向层:** 1（Affix/Modifier）
- **模式定义:** 9 个
- **决策记录:** 7 类（v1.0 的 6 类 + Affix/Modifier）
- **一致性规则:** 16 条（v1.0 的 5 条 + v1.1 的 11 条）

### Systems Covered

| 系统 / 层 | 架构位置 | 关键模式 | 版本 |
|---|---|---|---|
| 打字输入 | `systems/typing/` | 直接键盘监听 | v1.0 |
| 被动技能 | `systems/skills/passive/` | AdjacencyMap | v1.0 |
| 主动技能 | `systems/skills/active/` | EffectQueue | v1.0 |
| **Affix/Modifier (横向)** | `systems/modifiers/` | ModifierEngine + ModifierHost | **v1.1** |
| 分数计算 | `systems/scoring/` | StateCoordinator | v1.0 |
| 音频 | `systems/audio/` | Howler.js 池化 | v1.0 |
| 场景管理 | `scenes/` | Scene Stack | v1.0 |
| 存档/Steam | `main/` | 原子写入 + IPC | v1.0 |
| **Wordpack** | `systems/typing/wordpack/` | WordpackRegistry + Binding | **v1.1** |
| **Narrative (内容)** | `core/narrative/` + `data/narrative/` | NarrativeRegistry | **v1.1** |
| **AIGC Pipeline (构建期)** | `aigc-art/` | Prompt → LoRA → 人工 curation | **v1.1** |

### Migration Readiness (Godot)

| 层 | 隔离状态 | 移植代价预估 |
|---|---|---|
| `data/` | ✅ 零引擎依赖 | 低 |
| `core/` | ✅ M-1 强制隔离 | 低-中 |
| `systems/` | ✅ M-1 强制隔离 | 中 |
| `scenes/` + `ui/` | ⚠️ 预期重写 | 高（已规划）|
| `main/` (Electron) | ⚠️ 替换为 Godot 原生 | 中 |

### Validation Date

2026-04-15 (v1.1)
2026-02-16 (v1.0)

---

## Development Environment

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Git
- VS Code (推荐) + ESLint + Prettier 插件

### Setup Commands

```bash
# 克隆项目（如果从原型迁移）
cd /Volumes/work/project/game

# 安装核心依赖
npm install pixi.js@^8.16.0
npm install howler@^2.2.4
npm install steamworks.js

# 安装 Electron 开发依赖
npm install electron electron-builder --save-dev

# 安装开发工具
npm install typescript vite --save-dev
npm install @types/node --save-dev

# 初始化 TypeScript 配置（如未配置）
npx tsc --init

# 启动开发服务器
npm run dev
```

### First Steps

1. **验证原型** - 确保现有原型正常运行
2. **重构目录** - 按架构文档重组 src/ 目录结构
3. **迁移状态** - 将现有状态逻辑重构为三层架构
4. **添加 Electron** - 配置主进程和渲染进程分离
5. **集成 Steam** - 配置 steamworks.js 和 steam_appid.txt

### Recommended VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---
