---
title: "Story 18.2: 精英关 — 减弱版 Boss 修饰器"
epic: "Epic 18: Boss 战与 Act 结构"
story_key: "18-2-elite-stage-mini-boss"
status: "done"
created: "2026-03-02"
depends_on: ["18-1-stage-type-act-structure", "18-4-boss-modifier-framework"]
---

# Story 18.2: 精英关 — 减弱版 Boss 修饰器

## Story

作为一个 **玩家**，
我想要 **精英关有独特的视觉标识和减弱版 Boss 修饰器挑战**，
以便 **精英关成为 Boss 战的预告和练习，让每局 Run 的精英关体验不同且有节奏感**。

## 验收标准

- [x] AC1: 精英关目标分数 ×1.3（已在 18.1 实现 — 验证通过）
- [x] AC2: 精英关通关金币 ×2（review fix: 在 battle.ts + shop.ts 实现 baseGold 40 for elite）
- [x] AC3: Run 开始时从 Boss 池抽 3 个修饰器分配给精英关（main.ts 调用 drawBossModifiers(3) 填充 state.bossModifierPool）
- [x] AC4: `bossModifiers.ts` 包含 13 个修饰器的元数据（name, icon, description, eliteHint）
- [x] AC5: 精英关 UI 有金色边框样式和"精英挑战"标签（battle-screen.elite-stage CSS + announceLevel 精英挑战文字）
- [x] AC6: 精英关战斗 HUD 显示当前修饰器名称、图标和规则提示（#modifier-info HUD）
- [x] AC7: 精英关应用对应修饰器的减弱版参数（依赖 18.4 BossModifier 框架 — 已留 TODO hook）

## Tasks / Subtasks

- [x] Task 1: 修饰器元数据 (AC: 4)
  - [x] 1.1 扩展 `bossModifiers.ts`：为 13 个修饰器添加 `BOSS_MODIFIER_META` 常量（name, icon, description, eliteHint）
  - [x] 1.2 导出 `getBossModifierMeta(id): BossModifierMeta | undefined` 查询函数
- [x] Task 2: 精英关 UI 样式 (AC: 5)
  - [x] 2.1 在 `style.css` 新增 `.elite-stage` 样式（金色边框、渐变背景色）
  - [x] 2.2 在 `style.css` 新增 `.elite-hint` 和 `.boss-hint` 文字样式
  - [x] 2.3 在 `battle.ts` `startLevel()` 中：精英关时给 `#battle-screen` 添加 `elite-stage` CSS class，非精英关移除
- [x] Task 3: 修饰器信息 HUD (AC: 6)
  - [x] 3.1 在 `index.html` `#top-bar` 内新增 `#modifier-info` 元素（图标 + 名称 + 提示）
  - [x] 3.2 在 `ui/elements.ts` 注册新 DOM 元素引用
  - [x] 3.3 在 `battle.ts` `startLevel()` 中：精英关时通过 `state.bossModifierPool` + `getEliteModifierIndex()` 获取修饰器 ID，用 `getBossModifierMeta()` 填充 HUD
  - [x] 3.4 非精英关时隐藏 `#modifier-info`
- [x] Task 4: 修饰器 Hook 占位 (AC: 7)
  - [x] 4.1 在 `battle.ts` `startLevel()` 添加注释占位：`// TODO [Story 18.4]: Apply weakened modifier effect via BossModifier framework`
  - [x] 4.2 在 `announceLevel()` 中精英关公告增加修饰器名称和图标显示
- [x] Task 5: 测试 (AC: 1-6)
  - [x] 5.1 新增 `bossModifiers.test.ts` 用例：验证 `BOSS_MODIFIER_META` 覆盖全部 13 个 ID — 18 tests pass
  - [x] 5.2 新增 `bossModifiers.test.ts` 用例：`getBossModifierMeta()` 返回正确元数据
  - [x] 5.3 验证 `calculateTargetScore(level, 'elite')` 返回 ×1.3 分数（已有测试 — 确认通过）
  - [x] 5.4 验证 `getEliteModifierIndex()` 正确映射精英节点到修饰器索引（已有测试 — 确认通过）

## Dev Notes

### 依赖说明（CRITICAL）

**本 Story 依赖 18.4（BossModifier 框架），但大部分工作可独立完成：**

| AC | 依赖 | 说明 |
|----|------|------|
| AC1-3 | 18.1 ✅ | 已实现，仅需验证 |
| AC4 | 无 | 修饰器元数据是纯数据定义 |
| AC5 | 无 | CSS 样式独立 |
| AC6 | 无 | HUD 显示元数据，不需要修饰器行为 |
| AC7 | 18.4 ❌ | 需要 BossModifier 接口的 `getParams(isElite)` 方法 |

**推荐实现顺序：** 先完成 AC4-6（可独立），AC7 留 hook 注释。当 18.4 完成后补充实际修饰器应用逻辑。

### 已由 18.1 完成的内容（不要重复实现）

以下功能已在 Story 18.1 中实现，**不要修改**：

- `calculateTargetScore(level, 'elite')` — 返回 `Math.floor(base * 1.3)` [Source: `core/state.ts:18-22`]
- `levels.json` 精英关 `baseGoldReward` 已翻倍 [Source: `assets/data/levels.json`]
- `RunState.startRun()` 抽 3 个修饰器，分配 Stage 3→A, 6→B, 9→C [Source: `core/state/RunState.ts:346-359`]
- `getEliteModifierIndex(nodeId)` 返回 0/1/2 [Source: `systems/stage/stageFlow.ts:60-64`]
- `isEliteNode(nodeId)` 判断精英关 [Source: `systems/stage/stageFlow.ts:84-86`]
- `announceLevel()` 已有 `精英挑战` 文字（但无样式）[Source: `systems/battle.ts:625`]
- `startLevel()` 已有 `[ELITE]` 标签 [Source: `systems/battle.ts:590`]

### 关键架构约束

1. **Legacy DOM 系统**：本 Story 修改 Legacy 系统（battle.ts + state.ts），不涉及 Pixi 系统
2. **依赖方向**：`data → core → systems → scenes`，修饰器元数据放 `data/bossModifiers.ts`
3. **RunState 读取**：battle.ts 中通过 `state.player` 或 legacy state 访问修饰器分配信息，需要从 `state` 对象获取当前 `level`，然后查询 `bossModifierAssignment`

### 修饰器元数据设计

```typescript
// src/src/data/bossModifiers.ts — 扩展现有文件
export interface BossModifierMeta {
  id: BossModifierId
  name: string        // 中文名
  icon: string        // emoji 图标
  description: string // 满功率规则描述
  eliteHint: string   // 精英关减弱版提示
}

export const BOSS_MODIFIER_META: Record<BossModifierId, BossModifierMeta> = {
  boss_fade: {
    id: 'boss_fade',
    name: '渐隐之词',
    icon: '👻',
    description: '字母逐个淡出消失',
    eliteHint: '字母缓慢淡出（速度减半）',
  },
  // ... 13 个修饰器的完整元数据
}
```

### Legacy State 中获取修饰器分配

```typescript
// battle.ts 中访问修饰器分配的方式
// 注意：Legacy 系统不直接使用 RunState 类，而是通过 state 对象
// 需要在 state 对象中暴露 bossModifierAssignment
// 或者通过 stageFlow 工具函数间接获取

// 方案 A（推荐）：在 state.ts 添加工具函数
export function getEliteModifierForStage(nodeId: number): string | null {
  const idx = getEliteModifierIndex(nodeId)
  if (idx < 0) return null
  return state.player.bossModifierAssignment?.[idx]?.modifierId || null
}
```

### Legacy state 对象结构

当前 `state.player` 没有 `bossModifierAssignment` 字段。需要检查 `state.ts` 中 `startRun()` 是否已同步 RunState 的修饰器数据到 legacy state。如果没有，需要添加字段。

**检查清单（实现前必查）：**
- [ ] `state.ts` 的 `state.player` 是否有 `bossModifierAssignment` 字段
- [ ] `startRun()`（在 main.ts 或 state.ts 中）是否从 RunState 同步修饰器数据
- [ ] 如果没有，需要在 `state.player` 添加字段并在 Run 开始时填充

### UI 元素位置

```
#battle-screen
  └── #top-bar
        ├── #level-info
        │     ├── #level-label    ← 已有 "LEVEL X [ELITE]" 显示
        │     └── #player-relics
        └── #modifier-info (NEW)  ← 新增：图标 + 修饰器名 + 规则提示
              ├── .modifier-icon
              ├── .modifier-name
              └── .modifier-hint
```

### CSS 样式参考

```css
/* 精英关 — 金色边框 */
#battle-screen.elite-stage {
  border: 2px solid #ffd700;
  box-shadow: inset 0 0 30px rgba(255, 215, 0, 0.1);
}

.elite-hint {
  color: #ffd700;
  font-weight: bold;
}

.boss-hint {
  color: #ff4444;
  font-weight: bold;
}

/* 修饰器信息 HUD */
#modifier-info {
  display: none;  /* 默认隐藏，精英关时显示 */
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
}

#modifier-info.visible {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

### 13 个修饰器元数据参考

| ID | 图标 | 名称 | 精英提示 |
|----|------|------|----------|
| boss_fade | 👻 | 渐隐之词 | 字母缓慢淡出（速度减半） |
| boss_scramble | 🔀 | 乱序打字 | 仅打乱中间字母，首尾保留 |
| boss_reverse | ⏪ | 倒序输入 | 从最后一个字母往前打 |
| boss_drift | 🌊 | 移动文字 | 词语轻微漂移（振幅减半） |
| boss_masked | 🕳️ | 残缺词语 | 遮挡 15% 字母（满功率 30%） |
| boss_spotlight | 🔦 | 聚光灯 | 可见 3-4 个字母（满功率 2-3） |
| boss_rhythm | 🎵 | 节奏锁定 | BPM 70-110（满功率 90-140） |
| boss_decay | 📉 | 分数衰减 | 每秒扣 2.5% 总分（满功率 5%） |
| boss_combo_punish | ☠️ | 断连即扣 | 断连扣 10% 总分（满功率 20%） |
| boss_cap | 📦 | 单词限额 | 单词得分上限 75 分（满功率 50） |
| boss_fast_time | ⏩ | 时间加速 | 1.25x 计时（满功率 1.5x） |
| boss_double_target | 🎯 | 双倍目标 | 目标分数 ×1.5（满功率 ×2） |
| boss_diminish | 📉 | 递减收益 | 每词 -5%（满功率 -10%） |

### Project Structure Notes

- 修改 `src/src/data/bossModifiers.ts` — 添加元数据（不创建新文件）
- 修改 `src/src/systems/battle.ts` — 精英 UI class 切换 + 修饰器 HUD 填充
- 修改 `src/index.html` — 新增 `#modifier-info` 元素
- 修改 `src/src/style.css` — 精英/Boss 样式
- 修改 `src/src/ui/elements.ts` — 注册新 DOM 引用
- 可能修改 `src/src/core/state.ts` — 如果 legacy state 缺少修饰器字段
- 更新 `src/tests/unit/data/bossModifiers.test.ts` — 元数据测试

### References

- [Source: docs/stories/epic-18-boss-act-structure.md — Story 18.2 验收标准和精英关设计]
- [Source: docs/stories/18-1-stage-type-act-structure.md — 已实现的 StageType 系统和修饰器池]
- [Source: docs/project-context.md — 依赖方向、state 规则、性能要求]
- [Source: docs/game-architecture.md — 三层状态、修饰器管道]
- [Source: src/src/data/bossModifiers.ts — 现有修饰器 ID 定义]
- [Source: src/src/systems/battle.ts — startLevel/announceLevel 精英标签]
- [Source: src/src/systems/stage/stageFlow.ts — getEliteModifierIndex/isEliteNode]
- [Source: src/src/core/state/RunState.ts — bossModifierPool/bossModifierAssignment]
- [Source: src/src/core/state.ts — calculateTargetScore with stageType]
- [Source: src/index.html — battle-screen DOM 结构]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Boss modifier tests: 18/18 passing
- Pre-existing test failures (lone/void modifier tests, skills.school) unrelated to this story

### Completion Notes List

- Bridged legacy `state` with boss modifier data by adding `bossModifierPool: BossModifierId[]` to `GameState` (instead of using RunState)
- `main.ts` calls `drawBossModifiers(3)` on init to populate `state.bossModifierPool`
- Elite stages lookup modifier via `getCurrentEliteModifierMeta()` helper in battle.ts
- AC7 (apply weakened modifier) left as TODO hook for Story 18.4
- Removed unused imports (`isBossNode`, `TOTAL_NODES`) from battle.ts
- [Review Fix] AC2: Implemented elite gold ×2 (baseGold=40) in battle.ts showGoldReward() + shop.ts openShop()
- [Review Fix] Typed bossModifierPool as BossModifierId[] instead of string[], eliminated as-any casts
- [Review Fix] Extracted getCurrentEliteModifierMeta() helper to eliminate DRY violation

### File List

- `src/src/data/bossModifiers.ts` — Added BossModifierMeta interface, BOSS_MODIFIER_META (13 entries), getBossModifierMeta()
- `src/src/main.ts` — Import drawBossModifiers, populate state.bossModifierPool on init
- `src/src/systems/battle.ts` — Elite CSS class toggle, modifier HUD populate/hide, TODO hook, announceLevel modifier name, getCurrentEliteModifierMeta() helper, elite gold ×2
- `src/src/systems/shop.ts` — Elite gold ×2 (baseGold=40 for elite stages)
- `src/src/style.css` — .elite-stage, .elite-hint, .boss-hint, #modifier-info styles
- `src/index.html` — Added #modifier-info element in #top-bar
- `src/src/core/types.ts` — Added bossModifierPool (BossModifierId[]) to GameState, modifierInfo to UIElements
- `src/src/core/state.ts` — Added bossModifierPool: [] to createInitialState()
- `src/src/ui/elements.ts` — Registered modifierInfo element
- `src/tests/unit/data/bossModifiers.test.ts` — Added 6 new tests for metadata (18 total)
- `docs/stories/18-2-elite-stage-mini-boss.md` — Story file created and updated
- `docs/stories/sprint-status.yaml` — Status tracking
