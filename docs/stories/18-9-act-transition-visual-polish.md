---
title: "Story 18.9: Act 过渡演出与视觉打磨"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-9-act-transition-visual-polish"
status: "done"
created: "2026-03-02"
depends_on: ["18-1-stage-type-act-structure", "18-2-elite-stage-mini-boss", "18-3-rest-stage-random-events", "18-4-boss-modifier-framework"]
---

# Story 18.9: Act 过渡演出与视觉打磨

## Story

作为一个 **玩家**，
我想要 **Act 切换、精英关、Boss 关有明确的视觉/音效演出**，
以便 **游戏节奏有起伏，每个阶段转换都有仪式感，Boss 入场有紧张感**。

## Acceptance Criteria

- [x] AC1: Act 切换过渡动画 — 每次进入新 Act 时显示全屏标题卡（"Act 1: 热身", "Act 2: 征途", "Act 3: 决战"），淡入淡出，持续约 1.5 秒后自动消失
- [x] AC2: 精英关开场提示动画 — 精英关开始时显示精英修饰器名称和图标（如 "⚡ 精英强化: 渐隐之词 👻"），带入场动画，持续约 1 秒
- [x] AC3: Boss 入场特效 — Boss 关开始时屏幕震动 + 显示 Boss 名称 + 3 个修饰器规则说明（如 "📉 分数衰减 / 🔀 乱序打字 / ⏩ 时间加速"），持续约 2 秒
- [x] AC4: HUD 显示当前 Act 和 StageType — 战斗 HUD 左上角显示 "Act 1" 标签 + 关卡类型图标（标准⚔️ / 精英⚡ / Boss💀）
- [x] AC5: 休息关视觉风格 — 休息关场景使用柔和色调（暗蓝渐变）、安静氛围，与战斗场景形成对比

## Tasks / Subtasks

- [x] Task 1: 实现 Act 标题卡过渡动画 (AC: 1)
  - [x] 1.1 在 `systems/` 下创建 `actTransition.ts` — 导出 `showActTransition(actNum: number): Promise<void>`
  - [x] 1.2 创建全屏覆盖层 DOM 元素（#act-transition-overlay）— 纯黑背景 + 居中 Act 标题
  - [x] 1.3 Act 标题文案：Act 1 "热身"、Act 2 "征途"、Act 3 "决战"
  - [x] 1.4 动画序列：fadeIn 300ms → 停留 900ms → fadeOut 300ms = 总 1.5s
  - [x] 1.5 在 `battle.ts` 的 `startLevel()` 中检测 Act 切换（当前 node 的 Act ≠ 上一 node 的 Act，或 node=1），调用 `showActTransition()` 后再开始战斗
  - [x] 1.6 添加 CSS 动画（actTitleEnter、actTitleExit）到 `style.css`

- [x] Task 2: 实现精英关开场提示 (AC: 2)
  - [x] 2.1 在 `battle.ts` 的 `startLevel()` 中，当 `stageType === 'elite'` 时显示精英提示
  - [x] 2.2 创建提示 DOM 元素 — 显示精英修饰器图标 + 名称（从 `BOSS_MODIFIER_META` 查询）
  - [x] 2.3 入场动画：slideDown + fadeIn 300ms → 停留 700ms → fadeOut 200ms = 总 1.2s
  - [x] 2.4 提示格式："⚡ 精英强化: [图标] [名称]"

- [x] Task 3: 实现 Boss 入场特效 (AC: 3)
  - [x] 3.1 在 `battle.ts` 的 `startLevel()` 中，当 `stageType === 'boss'` 时触发 Boss 入场
  - [x] 3.2 特效序列：screenShake(3) → 显示 Boss 标题 "💀 BOSS" + 3 个修饰器图标+名称列表
  - [x] 3.3 修饰器列表从 `state.bossModifierPool` 读取，用 `getBossModifierMeta()` 获取图标+名称
  - [x] 3.4 动画序列：震动 200ms → Boss 标题入场 400ms → 修饰器列表逐个显示（每个 300ms）→ 停留 500ms → fadeOut 300ms = 总约 2s
  - [x] 3.5 播放 Boss 入场音效 — 使用 screenShake(3) 替代（无独立音效资源）

- [x] Task 4: HUD 添加 Act/StageType 标识 (AC: 4)
  - [x] 4.1 在 `index.html` 的 `#level-info` 区域添加 `<div id="hud-stage-info">` 容器
  - [x] 4.2 包含 Act 标签（"Act 1"）和 StageType 图标（⚔️ 标准 / ⚡ 精英 / 💀 Boss）
  - [x] 4.3 在 `battle.ts` 的 `startLevel()` 中更新 `#hud-stage-info` 内容
  - [x] 4.4 CSS 样式：左上角固定，半透明背景，小字体，不影响打字区域
  - [x] 4.5 Act 切换时添加微小脉冲动画（actChange pulse）

- [x] Task 5: 休息关视觉风格增强 (AC: 5)
  - [x] 5.1 更新 `style.css` 中 `#rest-screen` 样式 — 使用更柔和的渐变色（#0f1729 → #1a2744）
  - [x] 5.2 添加微光粒子背景效果（CSS animation: restParticleFloat，慢速漂浮光点）
  - [x] 5.3 休息关标题和文字使用柔和蓝色（#87ceeb），选项使用暖白（#eaeaea）
  - [x] 5.4 入场动画：整体 fadeIn 400ms，事件卡片从下方滑入（restFadeSlideIn）

- [x] Task 6: 测试 (AC: 1-5)
  - [x] 6.1 测试 `showActTransition()` 函数：验证 DOM 创建、CSS class 添加、Promise 在 1.5s 后 resolve
  - [x] 6.2 测试 Act 检测逻辑：node 1 → Act 1（显示）、node 4→5 跨 Act（显示）、node 2→3 同 Act（不显示）
  - [x] 6.3 测试精英提示：stageType='elite' 时显示正确修饰器名称
  - [x] 6.4 测试 Boss 入场：stageType='boss' 时显示 3 个修饰器列表
  - [x] 6.5 测试 HUD 更新：startLevel() 后 #hud-stage-info 显示正确 Act + StageType

## Dev Notes

### 核心设计：5 个独立视觉演出模块

本 Story 是 Epic 18 的收尾打磨，不涉及核心逻辑变更。所有 AC 都是**叠加式视觉增强**，不修改现有战斗/修饰器逻辑。

### 实现策略：Promise 链式异步动画

所有过渡动画使用 `Promise<void>` 返回值，battle.ts 中用 `await` 等待动画完成后再开始计时/战斗：

```typescript
// battle.ts startLevel() 中的调用模式
async function startLevel(): Promise<void> {
  // ... 初始化 ...

  // AC1: Act 过渡（仅在 Act 切换时）
  const currentAct = getActForNode(state.level)
  if (currentAct !== lastAct) {
    await showActTransition(currentAct)
    lastAct = currentAct
  }

  // AC4: 更新 HUD
  updateStageInfo(currentAct, currentType)

  // AC2: 精英提示
  if (currentType === 'elite') {
    await showEliteAnnouncement(eliteModId)
  }

  // AC3: Boss 入场
  if (currentType === 'boss') {
    await showBossIntro(state.bossModifierPool)
  }

  // 开始战斗计时...
}
```

### Act 标题卡实现要点

```typescript
// actTransition.ts
export function showActTransition(actNum: number): Promise<void> {
  const titles = { 1: '热身', 2: '征途', 3: '决战' }
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.id = 'act-transition-overlay'
    overlay.innerHTML = `
      <div class="act-title">Act ${actNum}</div>
      <div class="act-subtitle">${titles[actNum]}</div>
    `
    document.body.appendChild(overlay)

    // fadeIn → hold → fadeOut → remove
    overlay.classList.add('act-enter')
    setTimeout(() => overlay.classList.add('act-visible'), 300)
    setTimeout(() => overlay.classList.add('act-exit'), 1200)
    setTimeout(() => { overlay.remove(); resolve() }, 1500)
  })
}
```

### Boss 入场实现要点

```typescript
// 从 state.bossModifierPool 读取 3 个修饰器，逐个显示
import { getBossModifierMeta } from '../data/bossModifiers'

export function showBossIntro(pool: string[]): Promise<void> {
  return new Promise(resolve => {
    screenShake(3) // 震动

    const overlay = document.createElement('div')
    overlay.id = 'boss-intro-overlay'

    const title = document.createElement('div')
    title.className = 'boss-intro-title'
    title.textContent = '💀 BOSS'
    overlay.appendChild(title)

    const modList = document.createElement('div')
    modList.className = 'boss-intro-mods'
    pool.forEach((modId, i) => {
      const meta = getBossModifierMeta(modId)
      if (!meta) return
      const item = document.createElement('div')
      item.className = 'boss-intro-mod-item'
      item.textContent = `${meta.icon} ${meta.name}`
      item.style.animationDelay = `${0.6 + i * 0.3}s`
      modList.appendChild(item)
    })
    overlay.appendChild(modList)

    document.body.appendChild(overlay)
    setTimeout(() => { overlay.remove(); resolve() }, 2000)
  })
}
```

### 精英提示实现要点

精英关使用 `getEliteModifierIndex()` 获取当前精英修饰器索引，然后从 `state.bossModifierPool` 中查找：

```typescript
// battle.ts 已有：
const eliteModIdx = getEliteModifierIndex(state.level)
const eliteModId = state.bossModifierPool[eliteModIdx]
const eliteMeta = getBossModifierMeta(eliteModId)
```

### 现有可复用基础设施

| 功能 | 位置 | 用途 |
|------|------|------|
| `screenShake(intensity)` | `effects/juice.ts` | Boss 入场震动 |
| `screenFlash(color, opacity)` | `effects/juice.ts` | 可选：Act 切换闪光 |
| `spawnParticles(origin, count, color)` | `effects/particles.ts` | 可选：Boss 入场粒子 |
| `getActForNode(nodeId)` | `systems/stage/stageFlow.ts` | Act 检测 |
| `getStageType(nodeId)` | `systems/stage/stageFlow.ts` | StageType 检测 |
| `getBossModifierMeta(id)` | `data/bossModifiers.ts` | 修饰器图标/名称 |
| `getEliteModifierIndex(level)` | `systems/stage/stageFlow.ts` | 精英修饰器索引 |
| `levelAnnounce` CSS animation | `style.css` | 可参考的公告动画 |
| `#rest-screen` | `index.html` + `style.css` | 休息关现有 UI |

### 性能预算

| 演出 | 预算 | 注意事项 |
|------|------|----------|
| Act 标题卡 | 1.5s 阻塞 | 使用 CSS animation，不阻塞 JS 主线程 |
| 精英提示 | 1.2s 阻塞 | 使用 setTimeout，无 DOM 重排 |
| Boss 入场 | 2.0s 阻塞 | screenShake 已优化（transform only） |
| HUD 更新 | <1ms | 仅 textContent 赋值 |
| 休息关样式 | 0ms | 纯 CSS 无运行时开销 |

所有动画使用 CSS transform/opacity（GPU 合成），不触发 layout/paint。

### 依赖方向合规

```
data/bossModifiers.ts → systems/actTransition.ts → battle.ts (调用方)
                                                  ↓
                                    effects/juice.ts (可选)
```

- `actTransition.ts` 属于 `systems/` 层，可导入 `data/` 和 `effects/`
- `battle.ts` 属于 `systems/` 层，可调用同层 `actTransition.ts`
- 不违反 `data → core → systems → scenes` 依赖方向

### startLevel() 改造要点（CRITICAL）

当前 `startLevel()` 是**同步函数**。为支持 `await showActTransition()`，需要将其改为 **`async function`**。影响分析：

- `startLevel()` 的调用方（shop 返回、restStage 继续、game start）需要处理 Promise
- 调用方只需加 `await` 或 `.then()` — 不影响返回值（当前返回 void）
- **注意**：不要在 `startLevel()` 的 async 化过程中遗漏现有的 `showScreen('battle')` 调用时序

### 测试策略

由于本 Story 主要是 DOM 操作 + CSS 动画，测试聚焦于：

1. **函数返回值**: `showActTransition()` 返回 Promise，在预期时间后 resolve
2. **DOM 创建**: 验证 overlay 元素被创建和移除
3. **参数正确性**: Act 标题文案、修饰器名称/图标
4. **条件触发**: Act 切换检测逻辑（跨 Act 显示、同 Act 不显示）

使用 `vi.useFakeTimers()` 控制 setTimeout 行为。DOM mock 使用现有的 `document` stub。

### 边界情况

| 场景 | 预期行为 |
|------|----------|
| 游戏开始 node=1 | 显示 Act 1 标题卡 |
| node 4→5 跨 Act | 显示 Act 2 标题卡 |
| node 2→3 同 Act | 不显示标题卡 |
| node 8→9 跨 Act | 显示 Act 3 标题卡 |
| Boss 关 node=10 | 显示 Boss 入场（不显示 Act 标题卡，因为 9→10 同 Act） |
| 精英关无修饰器池 | 不显示精英提示（fallback） |
| Boss pool 不足 3 个 | 显示可用的修饰器（≤3 个） |

### Project Structure Notes

**新增文件：**
- `src/src/systems/actTransition.ts` — Act 标题卡 + 精英提示 + Boss 入场演出函数

**修改文件：**
- `src/src/systems/battle.ts` — startLevel() 改为 async，添加过渡调用
- `src/src/style.css` — 添加 5 组过渡动画 CSS
- `src/index.html` — 添加 HUD stage-info 容器
- `src/tests/unit/systems/actTransition.test.ts` — 新建测试文件

**不修改文件：**
- `src/src/data/bossModifiers.ts` — 仅读取 meta，不修改
- `src/src/systems/stage/stageFlow.ts` — 仅调用现有函数
- `src/src/effects/juice.ts` — 仅调用 screenShake
- `src/src/systems/bossModifierEngine.ts` — 不涉及

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.9 验收标准]
- [Source: src/src/systems/stage/stageFlow.ts — getActForNode(), getStageType(), isBossNode(), getEliteModifierIndex()]
- [Source: src/src/systems/stage/StageConfig.ts — StageType, ActInfo 类型定义]
- [Source: src/src/systems/battle.ts:549-667 — startLevel() Boss/Elite 检测逻辑]
- [Source: src/src/systems/battle.ts:721-736 — victory() 流程]
- [Source: src/src/data/bossModifiers.ts:48-140 — BOSS_MODIFIER_META 图标/名称]
- [Source: src/src/effects/juice.ts — screenShake(), screenFlash()]
- [Source: src/src/effects/particles.ts — spawnParticles()]
- [Source: src/src/scenes/SceneManager.ts — Scene 生命周期]
- [Source: src/src/scenes/BaseScene.ts:93-130 — fadeIn/fadeOut 实现]
- [Source: src/src/systems/restStage.ts:26-28 — 现有 Act 标签]
- [Source: src/src/style.css:1097-1230 — 休息关现有样式]
- [Source: src/index.html:109-125 — 休息关 HTML 结构]
- [Source: docs/project-context.md — 性能预算、依赖方向、命名规范]
- [Source: docs/stories/18-8-boss-numerical-rules.md — 前序 Story 测试模式参考]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

无调试问题

### Completion Notes List

- 创建 `actTransition.ts` — 4 个导出函数：showActTransition、showEliteAnnouncement、showBossIntro、updateStageInfo
- 修改 `battle.ts` — startLevel() 改为 async，添加 Act 过渡检测（lastAct 跟踪变量）、精英/Boss 入场演出
- 添加 5 组 CSS 动画：act-transition-overlay、elite-announcement、boss-intro-overlay、hud-stage-info、rest-screen 增强
- 更新 index.html — 在 #level-info 内添加 #hud-stage-info 容器
- 休息关视觉打磨：渐变色更柔和（#0f1729 → #1a2744）、CSS 微光粒子浮动、入场 slideIn 动画
- Task 3.5 使用 screenShake(3) 替代独立音效（无 boss_intro 音效资源）
- 测试 22 个全部通过（DOM mock + fake timers，rAF 同步执行模式）
- 全量测试 2214 passed, 21 pre-existing failures（lone/void 重设计遗留，非本 Story）
- Code Review 修复 5 个 MEDIUM + 1 个 LOW：移除 rest-screen position:relative（M1）、导出 resetLastAct（M2）、调用方 void 标注（M3）、Dev Notes 修正（M4）、resetLastAct 测试（M5）、animationDelay toFixed(1)（L1）
- 测试总数 22 → 24，全部通过

### File List

- `src/src/systems/actTransition.ts` — 新建：Act 过渡演出系统
- `src/src/systems/battle.ts` — 修改：startLevel() async 化 + 过渡调用 + resetLastAct 导出
- `src/src/style.css` — 修改：5 组过渡动画 CSS + 休息关增强
- `src/index.html` — 修改：添加 #hud-stage-info 容器
- `src/src/main.ts` — 修改：导入 resetLastAct + void startLevel()
- `src/src/systems/restStage.ts` — 修改：void startLevel()
- `src/src/systems/shop.ts` — 修改：void startLevel()
- `src/tests/unit/systems/actTransition.test.ts` — 新建：24 个测试
- `docs/stories/18-9-act-transition-visual-polish.md` — 更新状态
- `docs/stories/sprint-status.yaml` — 更新 18-9 状态
