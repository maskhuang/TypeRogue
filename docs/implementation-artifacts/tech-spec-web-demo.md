# Tech-Spec: Web Demo 浏览器试玩版

**Created:** 2026-03-10
**Status:** Ready for Development
**Engine:** TypeScript + PixiJS 8 + Vite 7 (纯浏览器构建)

---

## Overview

### 功能描述

构建一个浏览器可直接游玩的「打字肉鸽」精简 Demo 版本，作为获客渠道部署到 itch.io。玩家无需下载，3-5 分钟内体验核心循环：打字 → 触发技能 → 资源流转 → 结算得分。

### 游戏体验影响

- 新玩家首次接触游戏的入口，决定第一印象
- 必须在 60 秒内让玩家理解核心机制并感受到"爽点"
- Demo 结束后引导至 Steam 完整版，形成转化漏斗

### 范围

**包含 (In Scope):**

- Web 条件构建系统（同仓库，非 fork）
- 精简 3-4 关的 Demo 关卡流程
- 预设技能绑定的引导式第一关
- 精简技能池（15 个）+ 遗物池（8 个）
- 商店（仅技能+遗物标签）
- 程序化音效（打字音、技能音、资源和弦）
- PixiJS 键盘可视化
- 交互式新手引导（3 步提示）
- Demo 结束屏 + Steam 转化钩子
- itch.io 部署

**不包含 (Out of Scope):**

- BGM（去掉 mp3 文件减小体积）
- 职业系统（锁定「无职业」）
- 附魔系统
- 无尽模式 / 每日挑战
- Steam 成就 / 云存档
- 连接器 / 复制器 / 放大器技能
- Boss 关（但精英关保留 1 个视觉 Modifier 以制造区分度）
- 存档持久化（Demo 为一次性体验，不保存进度）

---

## Context for Development

### 引擎模式

当前项目使用 `electron-vite` 构建 Electron 桌面应用。Web Demo 需要一个平行的纯 Vite 构建配置，共享 renderer 层代码。

**关键事实：** renderer 进程代码（`src/src/`）几乎不依赖 Electron：
- 仅 `SaveManager.ts` 有 3 处 `window.electronAPI` 引用
- 已有 `isElectron()` 守卫 + `localStorage` 降级路径
- `index.html` 是纯 Web 标准

### 现有系统集成

| 系统 | 集成方式 | 备注 |
|------|----------|------|
| 战斗系统 `systems/battle.ts` | 直接复用 | 核心循环无需改动 |
| 商店系统 `systems/shop.ts` | 复用 + 隐藏标签 | 已有 `style.display` 隐藏模式 |
| 技能系统 `systems/skills.ts` | 复用 + 缩减池 | 通过 demo config 控制池 |
| 关卡流程 `systems/stage/stageFlow.ts` | 条件覆盖 | `TOTAL_NODES` + Node 映射表 |
| 音效系统 `effects/sound.ts` | 复用 + autoplay 修复 | 需用户交互激活 AudioContext |
| 遗物系统 `systems/relicPicker.ts` | 复用 + 缩减池 | 通过 demo config 控制池 |
| 状态管理 `core/state.ts` | 直接复用 | `createInitialState()` 无需改动 |
| 键盘可视化 `ui/keyboard/` | 直接复用 | PixiJS 原生支持浏览器 |
| 存档 `core/save/SaveManager.ts` | 自动降级 | `isElectron()=false` → localStorage |

### 需参考的文件

| 文件 | 原因 |
|------|------|
| `src/src/main.ts` | 启动流程，需创建 Demo 入口 |
| `src/src/systems/stage/stageFlow.ts` | 关卡地图定义，需 Demo 覆盖 |
| `src/src/data/producers.ts` | 生产者技能定义 |
| `src/src/data/converters.ts` | 转化器技能定义 |
| `src/src/data/relics.ts` | 遗物定义 |
| `src/src/systems/shop.ts` L1732-1793 | 标签页显示逻辑 |
| `src/src/systems/classes/ClassPicker.ts` | 职业选择，需跳过 |
| `src/src/effects/sound.ts` L208-211 | AudioContext 初始化 |
| `src/electron.vite.config.ts` | 当前构建配置参考 |
| `src/index.html` | 共享入口 HTML |

### 技术决策

| 决策 | 选项 | 决定 | 原因 |
|------|------|------|------|
| 构建方式 | fork 仓库 vs 条件构建 | **条件构建** | 避免代码分叉，共享主线修复 |
| Demo 标志 | 运行时检测 vs 编译时注入 | **编译时 `VITE_DEMO`** | Tree-shaking 移除完整版代码 |
| 存档策略 | localStorage vs 不存档 | **不存档** | Demo 为一次性体验，简化实现 |
| 启动屏 | 纯 CSS vs PixiJS | **纯 CSS/HTML** | 快速加载，不等 PixiJS 初始化 |
| 部署 | Vercel/Netlify vs itch.io | **itch.io 优先** | 自带游戏社区流量 |
| DOM 处理 | 共享 index.html vs 精简 | **共享 + 运行时清理** | 避免维护两套 HTML |
| 浏览器兼容 | 最新 vs 宽泛 | **Chrome 90+, Firefox 90+, Safari 15+** | PixiJS 8 需要 WebGL2 |

---

## Implementation Plan

### Task 1: Web 构建配置

**新建 `src/vite.config.web.ts`：**

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, '..'),
  build: {
    outDir: 'dist-web',
    rollupOptions: {
      input: { index: resolve(__dirname, '../index.html') }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared')
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify('demo'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify('demo'),
    __DEMO_MODE__: JSON.stringify(true)
  }
})
```

**`package.json` 新增脚本：**

```json
{
  "scripts": {
    "dev:web": "vite --config src/vite.config.web.ts",
    "build:web": "vite build --config src/vite.config.web.ts",
    "preview:web": "vite preview --config src/vite.config.web.ts --outDir dist-web"
  }
}
```

### Task 2: Demo 模式全局声明与配置

**新建 `src/src/demo/demo-config.ts`：**

```typescript
// 编译时注入，生产构建会 tree-shake 掉非 Demo 分支
declare const __DEMO_MODE__: boolean

export const IS_DEMO = typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__

// === Demo 关卡地图 ===
export const DEMO_STAGE_MAP = {
  totalNodes: 4,
  nodeStageType: {
    1: 'standard' as const,  // 引导关
    2: 'standard' as const,  // 正常关
    3: 'elite' as const,     // 精英关（展示压力感，带 1 个视觉 Modifier）
    4: 'standard' as const,  // 最终关（Demo 结束）
  },
  nodeAct: { 1: 1, 2: 1, 3: 1, 4: 1 },
  nodeBattleNumber: { 1: 1, 2: 2, 3: 3, 4: 4 },
}

// === 精英关 Demo Modifier ===
// 只保留 1 个视觉类 modifier，让精英关有区分度而不增加系统复杂度
export const DEMO_ELITE_MODIFIER = 'phantom' // 「幻影」— 视觉干扰，直觉易懂

// === Demo 开局赠送遗物 ===
export const DEMO_STARTER_RELIC = 'cornucopia' // 聚宝盆 — 开局 +15 金，让玩家立刻感受遗物存在

// === Demo 技能池 ===
export const DEMO_PRODUCER_IDS = [
  'prod_burst',    // 爆发 — base +5
  'prod_focus',    // 聚能 — base ×2
  'prod_loot',     // 掠夺 — score +15
  'prod_crit',     // 暴击 — score ×1.1
  'prod_boost',    // 强化 — multiplier +0.2
  'prod_frenzy',   // 狂热 — multiplier ×1.15
  'prod_freeze',   // 冻结 — time +2s
  'prod_eternal',  // 永恒 — time ×1.2
  'prod_mint',     // 铸币 — gold +3
  'prod_treasury', // 金库 — gold ×1.3
]

export const DEMO_CONVERTER_IDS = [
  'conv_base_score_add',  // 变现 — base → score，最直觉的流转
  'conv_mult_score_add',  // 溢光 — mult → score，视觉效果强
  'conv_time_base_add',   // 蚀刻 — time → base，教玩家时间压力
  'conv_gold_base_add',   // 收购 — gold → base，经济循环
  'conv_score_mult_add',  // 乘势 — score → mult，滚雪球演示
]

// === Demo 遗物池 ===
export const DEMO_RELIC_IDS = [
  'lucky_coin',      // 幸运硬币 — 商店折扣，直觉型
  'phoenix_feather', // 凤凰羽毛 — 容错，降低挫败感
  'perfect_rhythm',  // 完美韵律 — 奖励完美打字
  'forge_heart',     // 熔炉之心 — 生产→转化 combo
  'cornucopia',      // 聚宝盆 — 开局送金，安全感
  'spark_core',      // 点火核心 — 多生产者奖励
  'campfire_ember',  // 篝火余烬 — 购买技能的累积奖励
  'ramen',           // 拉面 — 打字快则强，核心手感强化
]

// === 第一关预设绑定 ===
export const DEMO_STARTER_SKILLS: Array<{ skillId: string; key: string }> = [
  { skillId: 'prod_burst', key: 'e' },  // E — 高频字母
  { skillId: 'prod_loot',  key: 't' },  // T — 高频字母
  { skillId: 'prod_mint',  key: 'a' },  // A — 高频字母
]

// === 第一关固定词序（保证前 3 个词包含 E/T/A 触发技能） ===
export const DEMO_FIRST_STAGE_WORDS = [
  'the',     // t + e 触发两个技能
  'gate',    // a + t + e 三个全触发
  'take',    // t + a + e 继续强化
  'beat',    // e + a + t
  'late',    // a + t + e
  // 之后可回归随机词库
]

// === Demo 关卡目标分数（降低难度） ===
export const DEMO_TARGET_SCORES: Record<number, number> = {
  1: 60,   // 第一关：极低目标，保证通过
  2: 120,  // 第二关：稍有挑战
  3: 200,  // 精英关：需要技能组合
  4: 250,  // 最终关：展示爽感
}
```

**新建 `src/src/demo/demo-globals.d.ts`：**

```typescript
declare const __DEMO_MODE__: boolean
```

### Task 3: Demo DOM 清理 + 全局错误边界

**新建 `src/src/demo/demo-dom-cleanup.ts`：**

Demo 共享 `index.html`，但其中有大量完整版 DOM 节点（职业选择模态框、造词站、蜕变站、Boss 修饰器选择器、每日挑战按钮等）。启动时批量移除：

```typescript
import { IS_DEMO } from './demo-config'

export function cleanDemoDom(): void {
  if (!IS_DEMO) return

  const removeIds = [
    'class-select-modal',     // 职业选择
    'craft-panel',            // 造词站
    'metamorph-panel',        // 蜕变站
    'boss-modifier-picker',   // Boss 修饰器
    'daily-btn',              // 每日挑战按钮
    'endless-btn',            // 无尽模式按钮
    'collection-btn',         // 图鉴按钮（Demo 无图鉴）
  ]
  for (const id of removeIds) {
    document.getElementById(id)?.remove()
  }
}
```

在 `init()` 开头调用 `cleanDemoDom()`。

**全局错误边界（Demo 面向冷流量，白屏 = 永久流失）：**

在 `main.ts` 的 Demo 入口最外层包裹：

```typescript
if (IS_DEMO) {
  window.onerror = (msg, src, line, col, err) => {
    showDemoErrorOverlay()
    return true  // 阻止默认错误输出
  }
  window.addEventListener('unhandledrejection', (e) => {
    showDemoErrorOverlay()
    e.preventDefault()
  })
}

function showDemoErrorOverlay(): void {
  // 仅首次触发
  if (document.getElementById('demo-error-overlay')) return
  const overlay = document.createElement('div')
  overlay.id = 'demo-error-overlay'
  overlay.className = 'demo-overlay'
  overlay.innerHTML = `
    <div class="demo-start-content">
      <h2>抱歉，出了点问题</h2>
      <p>请刷新页面重试</p>
      <button class="demo-start-btn" onclick="location.reload()">刷新页面</button>
    </div>
  `
  document.body.appendChild(overlay)
}
```

**WebGL 兼容性检测（启动屏阶段）：**

```typescript
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch { return false }
}

// 启动屏点击时，先检测
if (!checkWebGLSupport()) {
  // 显示："您的浏览器不支持 WebGL，请使用 Chrome 90+ / Firefox 90+ / Safari 15+"
}
```

### Task 4: 关卡系统 Demo 覆盖（含 TOTAL_NODES 下游验证）

**修改 `src/src/systems/stage/stageFlow.ts`：**

在 `TOTAL_NODES` 和 Node 映射表处加入 Demo 条件分支：

```typescript
import { IS_DEMO, DEMO_STAGE_MAP } from '../../demo/demo-config'

export const TOTAL_NODES = IS_DEMO ? DEMO_STAGE_MAP.totalNodes : 10

const NODE_STAGE_TYPE: Record<number, StageType> = IS_DEMO
  ? DEMO_STAGE_MAP.nodeStageType
  : { 1: 'standard', 2: 'standard', /* ...原始 10 节点... */ }

const NODE_ACT: Record<number, number> = IS_DEMO
  ? DEMO_STAGE_MAP.nodeAct
  : { 1: 1, 2: 1, /* ...原始映射... */ }
```

**⚠️ TOTAL_NODES 下游兼容性验证清单：**

`TOTAL_NODES` 被多处引用，改为 4 后需逐一确认：

| 引用位置 | 用途 | TOTAL_NODES=4 时的影响 | 需要改动？ |
|----------|------|----------------------|-----------|
| `shop.ts` L1807 | "最后一关不显示商店" | 第 4 关后不显示，正确 | 否 |
| `shop.ts` L24 | import | 纯引用 | 否 |
| `battle.ts` nextStage | 判断是否通关 | 第 4 关完成 → victory，正确 | 否 |
| `actTransition.ts` | 幕间动画 | Demo 全在 Act 1，只显示一次 Act 1 标题，正确 | 否 |
| `stageFlow.ts` getNextBattleNode | 跳过休息节点 | Demo 无休息节点，无影响 | 否 |
| `stageFlow.ts` isRestNode | 判断是否休息 | NODE_STAGE_TYPE 无 rest，正确 | 否 |
| `bossModifierPicker.ts` | 精英关 modifier 分配 | Demo 需单独处理，见 Task 5 的 modifier 逻辑 | 是 |

### Task 5: 启动流程 Demo 分支

**修改 `src/src/main.ts`：**

```typescript
import {
  IS_DEMO, DEMO_STARTER_SKILLS, DEMO_PRODUCER_IDS, DEMO_CONVERTER_IDS,
  DEMO_STARTER_RELIC, DEMO_ELITE_MODIFIER
} from './demo/demo-config'
import { cleanDemoDom } from './demo/demo-dom-cleanup'

async function init(): Promise<void> {
  initElements()
  cleanDemoDom()  // 移除完整版多余 DOM 节点

  if (IS_DEMO) {
    // 预设技能绑定
    for (const { skillId, key } of DEMO_STARTER_SKILLS) {
      state.player.skills.set(skillId, { level: 1 })
      state.player.bindings.set(key, skillId)
    }
    state.gold = 75

    // 赠送开局遗物（让玩家立刻感受遗物存在）
    state.player.relics.add(DEMO_STARTER_RELIC)

    // 固定技能池
    state.converterPool = [...DEMO_CONVERTER_IDS]
    state.connectorPool = []
    state.replicatorPool = []
    state.amplifierPool = []
    // 生产者池通过商店生成时过滤

    // 精英关使用单个视觉 modifier
    state.bossModifierPool = [DEMO_ELITE_MODIFIER]

    // 跳过职业选择 + 跳过遗物选择，直接开始
    state.classId = 'none'
    void startLevel()
  } else {
    // === 原始完整版流程 ===
    state.player.skills.set('prod_burst', { level: 1 })
    state.player.bindings.set('f', 'prod_burst')
    state.gold = 50
    // ... 原有逻辑不变
  }

  initInput()
  initShopEvents()
  // ...
}
```

### Task 6: 商店裁剪

**修改 `src/src/systems/shop.ts`：**

```typescript
import { IS_DEMO } from '../demo/demo-config'

// 在 initStatsTabs() 中：
function initStatsTabs(): void {
  // ... 原有逻辑

  if (IS_DEMO) {
    // 隐藏词包、造词、蜕变标签
    const wordsTab = document.getElementById('words-tab')
    if (wordsTab) wordsTab.style.display = 'none'
    // craft-tab 和 metamorph-tab 已被原有逻辑隐藏（非对应职业）
  }
}
```

**商店技能生成中**过滤 Demo 池：

```typescript
// 在生成商店物品时
if (IS_DEMO) {
  // 强制 Act 1 权重（80% 生产者 / 20% 转化器）
  // 且只从 DEMO_PRODUCER_IDS / DEMO_CONVERTER_IDS 中抽取
}
```

### Task 7: AudioContext 自动播放修复

**新建启动屏逻辑：**

在 `index.html` 或 `main.ts` 中，Demo 模式下先显示一个"点击开始"的全屏遮罩：

```typescript
if (IS_DEMO) {
  const overlay = document.getElementById('demo-start-overlay')
  overlay?.addEventListener('click', () => {
    overlay.remove()
    initAudio()  // 在用户手势中调用，AudioContext 正常激活
    void init()
  }, { once: true })
} else {
  void init()  // Electron 无 autoplay 限制
}
```

**在 `index.html` 中添加启动屏 DOM：**

```html
<div id="demo-start-overlay" class="demo-overlay">
  <div class="demo-start-content">
    <h1>打字肉鸽</h1>
    <p>用你的键盘构建得分引擎</p>
    <button class="demo-start-btn">开始试玩</button>
  </div>
</div>
```

### Task 8: 新手引导提示 + 第一关固定词序

**新建 `src/src/demo/demo-tutorial.ts`：**

在第一关战斗开始后，按顺序弹出 3 个浮层提示：

| 步骤 | 时机 | 提示内容 |
|------|------|----------|
| 1 | 战斗开始 1 秒后 | "打出屏幕上的单词！" → 指向词语显示区 |
| 2 | 玩家首次触发技能后 | "你的按键触发了技能！查看键盘上的高亮" → 指向键盘可视化 |
| 3 | 第一个词完成结算后 | "基础分 × 倍率 = 最终得分。用技能提升两者！" → 指向结算面板 |

实现方式：纯 DOM 浮层 + CSS 动画，通过 `EventBus` 监听 `skill:triggered` 和 `word:complete` 事件触发。

**第一关固定词序（保证引导生效）：**

预设技能绑定在 E/T/A 键，但如果随机词库抽到没有这些字母的词，玩家可能打完几个词都没触发技能，引导就失败了。

修改词库加载逻辑（`systems/typing/WordLoader.ts` 或 `battle.ts` 中的词加载）：

```typescript
import { IS_DEMO, DEMO_FIRST_STAGE_WORDS } from '../../demo/demo-config'

function loadWordsForStage(stageNum: number): string[] {
  if (IS_DEMO && stageNum === 1) {
    // 第一关：固定前 5 个词保证触发 E/T/A 技能，之后回归随机
    const randomWords = getRandomWords(20)
    return [...DEMO_FIRST_STAGE_WORDS, ...randomWords]
  }
  return getRandomWords(25)  // 非第一关或非 Demo
}
```

固定词序设计原则：
- 前 3 个词每个都包含 E、T、A（`the`, `gate`, `take`）
- 保证玩家在 15 秒内必定触发技能、看到键盘高亮、触发引导提示
- 第 5 个词后回归随机词库，避免体验过于"脚本化"

### Task 9: Demo 结束屏

**新建 `src/src/demo/demo-end-screen.ts`：**

在 Demo 第 4 关结束后（无论胜败），替代正常的 victory/gameover 流程，展示：

```
┌────────────────────────────────────────┐
│                                        │
│       🎮 试玩结束！                     │
│                                        │
│   你的得分：{totalScore}               │
│   触发技能：{skillCount} 次            │
│   最高连击：{maxCombo}                 │
│                                        │
│   ─────────────────────────            │
│                                        │
│   完整版包含：                          │
│   ✦ 10 关完整冒险 + Boss 战            │
│   ✦ 176 个技能 × 21 种附魔            │
│   ✦ 3 个职业（造词师/蜕变师/…）        │
│   ✦ 49 个遗物                          │
│   ✦ 无尽模式 + 每日挑战               │
│   ✦ Steam 成就 + 云存档               │
│                                        │
│   [在 Steam 上获取完整版]  [再玩一次]   │
│                                        │
└────────────────────────────────────────┘
```

**"在 Steam 上获取完整版"** 使用 `<a href="https://store.steampowered.com/app/XXXXX" target="_blank" rel="noopener">` 标签（非 `window.open()`，避免 itch.io iframe 中被浏览器拦截为弹窗）。
**"再玩一次"** 按钮调用 `window.location.reload()` 重置。

### Task 10: Demo 结束流程接入

**修改 `src/src/systems/battle.ts`：**

在 `victory()` 和 `gameOver()` 函数中：

```typescript
import { IS_DEMO } from '../demo/demo-config'
import { showDemoEndScreen } from '../demo/demo-end-screen'

function victory(): void {
  if (IS_DEMO) {
    showDemoEndScreen(state)
    return
  }
  // ... 原有完整版逻辑
}

function gameOver(): void {
  if (IS_DEMO) {
    showDemoEndScreen(state)
    return
  }
  // ... 原有完整版逻辑
}
```

同时在关卡通过判定处，Demo 第 4 关视为最终关：

```typescript
// 在 stageComplete 或 nextStage 逻辑中
import { TOTAL_NODES } from './stage/stageFlow'

if (state.level >= TOTAL_NODES) {
  victory()  // Demo 下 TOTAL_NODES=4，第 4 关完成即触发
}
```

### Task 11: 轻量 Analytics 埋点

Demo 的核心目的是获客转化，必须有数据支撑优化决策。

**接入方案：** [Umami](https://umami.is/) 自托管或云版（隐私友好、无 cookie、GDPR 合规、<2KB 脚本）

**埋点事件：**

| 事件名 | 触发时机 | 数据 |
|--------|----------|------|
| `demo_start` | 点击"开始试玩" | — |
| `demo_stage_complete` | 通过一关 | `{ stage: number, score: number }` |
| `demo_stage_fail` | 某关失败 | `{ stage: number, score: number }` |
| `demo_end` | 到达结束屏 | `{ totalScore, maxCombo, stagesCleared }` |
| `demo_cta_steam` | 点击"获取完整版" | — |
| `demo_cta_replay` | 点击"再玩一次" | — |

**实现：** 新建 `src/src/demo/demo-analytics.ts`

```typescript
import { IS_DEMO } from './demo-config'

export function trackEvent(name: string, data?: Record<string, unknown>): void {
  if (!IS_DEMO) return
  // Umami 全局追踪函数（由 <script> 注入）
  if (typeof window !== 'undefined' && (window as any).umami) {
    (window as any).umami.track(name, data)
  }
}
```

在 `index.html` Demo 模式下加入 Umami 脚本标签（通过 Vite HTML 插件或手动条件注入）。

**关键转化漏斗：**
```
demo_start → stage_1_complete → stage_2_complete → stage_3_complete → demo_end → cta_steam
```

每个节点的流失率 = 优化方向。

### Task 12: 部署配置

**itch.io 部署：**

1. `npm run build:web` → 产出 `dist-web/` 静态文件
2. 打包 `dist-web/` 为 zip
3. 上传至 itch.io 项目页，类型选"HTML"
4. 勾选"This file will be played in the browser"
5. 设置 viewport: 1280×720

**可选：添加 `scripts/deploy-web.sh`：**

```bash
#!/bin/bash
cd src && npm run build:web
cd ../dist-web && zip -r ../typing-roguelike-demo.zip .
echo "Upload typing-roguelike-demo.zip to itch.io"
```

---

### 性能考量

| 方面 | 预算 | 措施 |
|------|------|------|
| 首屏加载 | <3 秒 | 无 BGM mp3（省 ~2MB），启动屏先渲染 |
| 帧率 | 60fps | 与完整版相同，Demo 内容更少压力更小 |
| 打包体积 | <1MB (gzip) | Tree-shake 完整版专用代码，无音频文件 |
| 输入延迟 | <16ms | 复用完整版 `keydown` 直接监听 |
| 音频延迟 | <50ms | 复用完整版 Web Audio 合成器 + 音池 |
| 内存 | <50MB | 精简池 + 无存档 + 无 Steam |

### 验收标准

- [ ] AC1: `npm run dev:web` 可在 Chrome 90+/Firefox 90+/Safari 15+ 中启动游戏
- [ ] AC2: 启动屏显示"点击开始"，点击后音频正常播放；不支持 WebGL 时显示友好提示
- [ ] AC3: 跳过职业选择，直接进入第一关，预设 3 个技能已绑定到 E/T/A，开局携带聚宝盆遗物
- [ ] AC4: 第一关前 3 个词为固定词序（the/gate/take），保证触发 E/T/A 技能
- [ ] AC5: 打字触发技能时有视觉反馈（键盘高亮）+ 音效反馈
- [ ] AC6: 新手引导 3 步提示按时机正确出现
- [ ] AC7: 商店只显示技能和遗物标签，物品从 Demo 池抽取
- [ ] AC8: 第 3 关（精英）有视觉 Modifier 生效，与普通关有明显区分
- [ ] AC9: 4 关流程完整可玩（标准→标准→精英→标准），有分数目标判定
- [ ] AC10: Demo 结束屏展示得分统计 + 完整版卖点 + Steam 链接（使用 `<a>` 标签）
- [ ] AC11: "再玩一次"按钮重新加载页面，流程可重复
- [ ] AC12: 任意 JS 错误不导致白屏，显示"刷新页面"提示
- [ ] AC13: 完整版多余 DOM 节点（职业模态框、造词站等）已在启动时移除
- [ ] AC14: Analytics 事件正常上报（demo_start / stage_complete / cta_steam）
- [ ] AC15: `npm run build:web` 产出 <1.5MB gzip 的静态文件
- [ ] AC16: 上传 itch.io 后可正常游玩，1280×720 视口
- [ ] AC17: 完整版构建（`npm run build`）不受 Demo 代码影响，tree-shaking 正常

---

## Additional Context

### 依赖

| 依赖 | 版本 | Web 构建是否需要 |
|------|------|-----------------|
| `pixi.js` | ^8.16.0 | 是（键盘可视化、HUD） |
| `vite` | ^7.3.1 | 是（构建工具） |
| `typescript` | ~5.9.3 | 是（编译） |
| `electron` | latest | **否** |
| `electron-vite` | latest | **否** |
| `steamworks.js` | latest | **否** |
| `howler` | ^2.2.4 | **否**（未实际使用，音频走 Web Audio API） |

### 测试策略

| 层级 | 内容 | 工具 |
|------|------|------|
| 单元测试 | `demo-config.ts` 导出值正确 | Vitest |
| 单元测试 | `IS_DEMO` 条件分支覆盖 | Vitest + mock `__DEMO_MODE__` |
| 集成测试 | Demo 启动流程（跳过职业、预设技能、开局遗物） | Vitest |
| E2E 测试 | Demo 全流程：启动→打字→过关→商店→结束屏 | Playwright |
| 构建断言 | `dist-web/` 总体积 <1.5MB gzip | CI 脚本 |
| 手动测试 | 浏览器全流程（Chrome 90+/Firefox 90+/Safari 15+） | 手动 |
| 手动测试 | itch.io 嵌入页面可玩性 | 手动 |
| 手动测试 | WebGL 不支持时的降级提示 | 手动（模拟 WebGL 禁用） |

### 备注

- **编译时 vs 运行时**：`__DEMO_MODE__` 是 Vite `define` 注入的编译时常量。当 `IS_DEMO = false`（完整版构建），所有 Demo 分支会被 tree-shaking 移除，不影响完整版体积。
- **同仓库维护**：Demo 的 `src/src/demo/` 目录是唯一新增目录，其余均为现有文件的小幅条件分支。完整版 bug 修复自动惠及 Demo。
- **未来扩展**：如需 Vercel/自有域名部署，只需调整 `vite.config.web.ts` 的 `base` 路径。
- **BGM 可后续添加**：如果后续想加 BGM，只需在 `public/audio/` 放文件 + 在 `sound.ts` 中 Demo 模式下启用 BGM 加载。
- **Analytics 隐私**：Umami 无 cookie、不追踪个人身份信息，符合 GDPR/CCPA。itch.io 自带的页面浏览统计可作为补充。
