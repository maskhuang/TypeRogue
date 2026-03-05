# Tech-Spec: 战后统计面板

**Created:** 2026-03-04
**Status:** Completed
**Engine:** Vite + TypeScript (Custom DOM)
**Source:** brainstorming-session-2026-03-04.md (#50, #106-130)

## Overview

### Feature Description

在商店界面新增"📊 统计"按钮，点击后在构筑区（`#build-manager`）位置显示上一关的详细战斗统计：键位触发热力图、技能贡献排行、资源总览。帮助玩家理解 build 效果，指导优化决策。

### Gameplay Impact

- **Build 可理解性大幅提升** — 玩家终于能看到"我的 build 在做什么"
- **策略深度增强** — 数据驱动的 build 优化取代盲目试错
- **爽感放大** — 看到 MVP 技能、连锁次数等数据本身就是奖励
- **零打断心流** — 按需查看，不强制

### Scope

**In:**
- 战斗中逐技能数据收集（触发次数、资源产出）
- 商店中统计面板（热力图 tab + 技能/资源 tab）
- 键位悬停详情
- MVP 技能高亮
- 关卡评级（C-SSS）

**Out:**
- 跨局历史统计趋势
- Build 快照/分享
- 实时战斗中 DPS 条
- 资源桑基图（过于复杂）

## Context for Development

### Existing Systems Integration

| 系统 | 文件 | 集成点 |
|------|------|--------|
| 技能触发 | `src/systems/skills.ts` | `triggerProducer()` L126-205, `triggerConverter()` L208-285, `triggerConnectorCopy()` L512-591 |
| 战斗流程 | `src/systems/battle.ts` | `playerCorrect()` L140-211, `completeWord()` L282-372 |
| 商店构筑 | `src/systems/shop.ts` | `renderBuildManager()` L654+, `openShop()` L52-87 |
| 游戏状态 | `src/core/types.ts` | `GameState` L84-110, `SynergyState` L189-199 |
| 字频系统 | `src/systems/letters/LetterFrequencySystem.ts` | `calculateLetterFrequency()` |

### Engine Patterns

- DOM 直接操作（无框架），`document.createElement` 风格
- 状态管理：全局 `state` 对象 + `synergy` 对象
- UI 元素：通过 `getElements()` 获取缓存的 DOM 引用
- 渲染模式：整块 `innerHTML = ''` 后重建 DOM

### Key Technical Decision

**数据收集方式：直接在触发函数中累加**（而非 EventBus 监听）

理由：
- `triggerProducer` / `triggerConverter` / `triggerConnectorCopy` 已经有准确的 delta 值
- EventBus 方案需要额外事件定义+监听注册，复杂度更高
- 直接累加零性能开销（每次触发 +1 Map lookup + addition）

## Implementation Plan

### Task 1: 定义统计数据结构 (AC: 1) [x]

在 `src/core/types.ts` 新增：

```typescript
interface KeyStats {
  triggerCount: number;
  resources: Record<ResourceType, number>; // 各资源产出累计
}

interface SkillStats {
  triggerCount: number;
  resources: Record<ResourceType, number>;
  chainTriggered: number; // 被连接者触发的次数
}

interface BattleStats {
  keyStats: Map<string, KeyStats>;         // key → 统计
  skillStats: Map<string, SkillStats>;     // skillId → 统计
  wordsCompleted: number;
  totalChainTriggers: number;
  maxChainDepth: number;
  perfectWords: number;
}
```

在 `GameState` 中新增 `battleStats: BattleStats | null`。

### Task 2: 数据收集 — 技能触发埋点 (AC: 2, 3) [x]

**`src/systems/skills.ts`：**

新增模块级辅助函数：
```typescript
function recordSkillTrigger(skillId: string, triggerKey: string, resource: ResourceType, delta: number, isChain: boolean): void {
  const bs = state.battleStats;
  if (!bs) return;
  // key stats
  const ks = bs.keyStats.get(triggerKey) || { triggerCount: 0, resources: {base:0,score:0,multiplier:0,time:0,shield:0} };
  ks.triggerCount++;
  ks.resources[resource] += Math.abs(delta);
  bs.keyStats.set(triggerKey, ks);
  // skill stats
  const ss = bs.skillStats.get(skillId) || { triggerCount: 0, resources: {base:0,score:0,multiplier:0,time:0,shield:0}, chainTriggered: 0 };
  ss.triggerCount++;
  ss.resources[resource] += Math.abs(delta);
  if (isChain) ss.chainTriggered++;
  bs.skillStats.set(skillId, ss);
}
```

调用点：
- `triggerProducer()` 计算 delta 后调用 `recordSkillTrigger(producerId, triggerKey, resource, delta, chainHistory.length > 1)`
- `triggerConverter()` 同理
- `triggerConnectorCopy()` 中记录 `totalChainTriggers++`

### Task 3: 数据收集 — 战斗生命周期 (AC: 2) [x]

**`src/systems/battle.ts`：**

- `startLevel()`：初始化 `state.battleStats = { keyStats: new Map(), skillStats: new Map(), wordsCompleted: 0, totalChainTriggers: 0, maxChainDepth: 0, perfectWords: 0 }`
- `completeWord()`：`state.battleStats.wordsCompleted++`，若 `state.wordPerfect` 则 `perfectWords++`
- 连锁深度：在 `triggerConnectorCopy` 中 `maxChainDepth = Math.max(maxChainDepth, chainHistory.length)`

### Task 4: 统计面板 UI — 切换按钮 (AC: 4) [x]

**`src/index.html`：**

在 `#shop-build` 的 `.shop-section-title` 中添加 tab 切换：
```html
<div class="shop-section-title">
  <span id="build-tab" class="build-tab active">构筑</span>
  <span id="stats-tab" class="build-tab">📊 统计</span>
</div>
```

**`src/systems/shop.ts`：**

`openShop()` 中注册 tab 点击事件：
- 点击"构筑"：显示 `#build-manager`，隐藏 `#stats-panel`
- 点击"统计"：隐藏 `#build-manager`，显示 `#stats-panel`
- 默认显示构筑 tab

### Task 5: 统计面板 UI — 热力图 Tab (AC: 5, 6) [x]

**`src/systems/shop.ts` 新增 `renderStatsPanel()`：**

默认 Tab：键位热力图
- 复用 `KEYBOARD_ROWS` 渲染键盘布局
- 每个键背景色 = 冷暖渐变（灰→蓝→绿→黄→红），基于 `triggerCount` 归一化
- 键上显示触发次数数字
- 悬停显示详情浮窗：触发 N 次、base +X、mult +Y、score +Z...
- 无技能/零触发键灰显

### Task 6: 统计面板 UI — 技能贡献 Tab (AC: 7, 8) [x]

次 Tab：技能贡献 + 资源总览
- 技能列表按分数贡献排序
- 每个技能：icon + 名称 + 触发次数 + 各资源产出 + 占比条
- MVP 技能（贡献最高）加 👑 标记
- 底部资源总览：5 种资源各自总产出量
- 三类技能占比条（产出者 / 转化者 / 连接者）

### Task 7: 关卡评级 (AC: 9) [x]

`completeWord()` 或 `endLevel()` 中计算评级：
```
overkillRatio = overkill / targetScore
SSS: overkillRatio >= 2.0
SS:  overkillRatio >= 1.0
S:   overkillRatio >= 0.5
A:   overkillRatio >= 0.2
B:   overkillRatio >= 0.0 (刚好过关)
C:   未过关（不太可能进商店）
```
评级显示在统计面板顶部 + 金币奖励动画中。

### Task 8: CSS 样式 (AC: 4, 5, 6, 7) [x]

- `.build-tab` 切换按钮样式（active 下划线）
- `#stats-panel` 容器
- `.heatmap-key` 热力图键位（渐变背景 + 数字）
- `.skill-stat-row` 技能统计行
- `.stat-resource-bar` 资源占比条
- `.rating-badge` 评级徽章（SSS 金色发光、S 银色等）

### Task 9: 测试 (AC: 10) [x]

- `recordSkillTrigger` 正确累加 keyStats 和 skillStats
- 评级计算正确性（各档位阈值）
- battleStats 初始化和重置
- 热力图归一化（max=0 时不崩溃）

### Performance Considerations

- **Frame budget:** 数据收集在 `triggerProducer/Converter` 中，每次 1 个 Map.get + Map.set ≈ **<0.01ms**，对 16.67ms 帧预算无影响
- **Memory:** `BattleStats` 仅 26 个 keyStats + ≤20 个 skillStats，可忽略
- **渲染:** 统计面板仅在商店中切换 tab 时渲染，不影响战斗性能

### Acceptance Criteria

1. `BattleStats` 数据结构定义在 `types.ts`，含 keyStats / skillStats / wordsCompleted / chainTriggers / maxChainDepth / perfectWords
2. 战斗中每次技能触发正确记录到对应 key 和 skill 的统计
3. 连接者触发记录 chainTriggered 和 maxChainDepth
4. 商店构筑区顶部有"构筑 / 📊 统计"tab 切换
5. 热力图 tab 正确显示键位触发次数热力图，冷暖色渐变
6. 悬停键位显示详细资源产出浮窗
7. 技能 tab 显示按贡献排序的技能列表
8. MVP 技能显示 👑 标记
9. 关卡评级（C-SSS）基于 overkill 比例计算并显示
10. 新增单元测试覆盖数据收集和评级计算

## Additional Context

### Dependencies

- 无外部依赖
- 内部依赖：`skills.ts`（埋点）、`shop.ts`（渲染）、`battle.ts`（生命周期）

### Testing Strategy

- 单元测试：`recordSkillTrigger` 累加逻辑、评级阈值计算
- 集成测试：模拟战斗流程验证 battleStats 最终数据正确性

### Notes

- `battleStats` 在 `startLevel()` 初始化，在 `openShop()` 时读取渲染
- 统计面板首次打开时才渲染（懒加载），切换 tab 不重新计算
- 热力图颜色使用 HSL 插值：`hsl(${hue}, 80%, 50%)`，hue 从 240(蓝) 到 0(红)
