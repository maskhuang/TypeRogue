# Story 39.4: L0-L1 基础引导内容（打字基础 + 经济系统）

Status: review

## Story

As a 新玩家,
I want 在第一场战斗和第一次商店中看到简明的引导提示,
so that 我能快速理解"输入触发技能→资源→分数"的核心循环和商店购买/装备流程。

## Acceptance Criteria

1. **AC1**: 新 Run 首场战斗中，L0 四步按顺序触发（welcome → skill_triggered → word_complete → combo），内容准确锚定对应 UI 元素
2. **AC2**: 首次进商店时，L1_shop_intro 触发并锚定商品区
3. **AC3**: 首次购买/升级/获得遗物时对应步骤各自独立触发
4. **AC4**: 所有步骤在已完成后不再重复（MetaState 持久化验证）
5. **AC5**: Demo 模式下原有 3 步教程由新系统正确替代，行为不变（39.3 已实现，本 Story 不回归破坏）
6. **AC6**: 中英双语文本完整，切换语言后引导文本正确更新
7. **AC7**: 引导浮窗不遮挡关键操作区（如单词输入区、计时器）

## Tasks / Subtasks

- [x] Task 1: 补齐缺失事件发射 (AC: 1, 3)
  - [x] 1.1 在 `systems/battle.ts` combo 递增处（`state.combo++`）添加 `eventBus.emit('combo:update', { combo: state.combo })`（两处：L431、L505）
  - [x] 1.2 在 `core/state.ts` 的 `addRelicWithCapacity()` 成功添加后 emit `eventBus.emit('relic:acquired', { relicId })`
  - [x] 1.3 确认 `scoring/ScoreCalculator.ts` 不需要 emit——它有独立内部 ScoreState，不是全局 combo
  - [x] 1.4 验证现有 `combo:update` 监听者（ParticleController、KeystrokeSoundController）接收 `{ combo: number }` 格式，行为正常
  - [x] 1.5 额外发现：`skill:upgraded` 也从未 emit——在 `systems/shop.ts` 升级处添加 emit

- [x] Task 2: 定义 L0-L1 引导步骤数据 (AC: 1, 2, 3, 6)
  - [x] 2.1 在 `data/tutorialSteps.ts` 新增 `L0_STEPS: TutorialStep[]`（4 步）
  - [x] 2.2 在 `data/tutorialSteps.ts` 新增 `L1_STEPS: TutorialStep[]`（4 步）
  - [x] 2.3 导出 `FULL_TUTORIAL_STEPS = [...L0_STEPS, ...L1_STEPS]`
  - [x] 2.4 L0 步骤 prerequisite 链：welcome → skill_triggered → word_complete → combo
  - [x] 2.5 L1 步骤互相独立（各自由不同事件触发，无 prerequisite 链）
  - [x] 2.6 L1_upgrade 改用 `skill:upgraded` 事件（比 shop:purchase + condition 更准确）

- [x] Task 3: 处理 condition 函数的层级问题 (AC: 1, 3)
  - [x] 3.1 condition 签名保持 `() => boolean`，通过闭包捕获状态
  - [x] 3.2 L0_welcome 的 condition 简化为始终 true（prerequisite 机制已防重复）
  - [x] 3.3 L0_combo 的 condition：`() => state.combo >= 5`
  - [x] 3.4 L1_skill_bind 的 condition：标记变量方案——监听 `shop:purchase` 设置标记，condition 检查标记
  - [x] 3.5 步骤骨架在 data/，condition 注入在 systems/
  - [x] 3.6 新建 `systems/tutorial/tutorialInit.ts`

- [x] Task 4: i18n 文本 (AC: 6)
  - [x] 4.1 在 `demo-i18n.ts` 新增 16 个 i18n key（8 对 title+body）
  - [x] 4.2 中文文本参考 Epic 39 表格
  - [x] 4.3 英文文本简短直接

- [x] Task 5: 集成到游戏主流程 (AC: 1, 2, 4, 5)
  - [x] 5.1 在 `main.ts` 中 import `initFullTutorial` 并在 `setPersistence` 后调用
  - [x] 5.2 `if (!IS_DEMO)` 守卫确保仅完整版注册 L0-L1
  - [x] 5.3 MetaState 持久化验证（通过 39.3 现有测试覆盖）
  - [x] 5.4 `setEnabled(false)` 验证（通过 39.3 现有测试覆盖）

- [x] Task 6: 单元测试 (AC: 1-7)
  - [x] 6.1 L0 步骤数据测试：4 步 ID 唯一、level=0、prerequisite 链
  - [x] 6.2 L1 步骤数据测试：4 步 ID 唯一、level=1、无互相 prerequisite
  - [x] 6.3 combo:update 发射——代码审查确认（无独立单元测试，emit 位置与 battle 流程紧耦合）
  - [x] 6.4 relic:acquired 发射——代码审查确认（无独立单元测试，emit 位置与 state 管理紧耦合）
  - [x] 6.5 FULL_TUTORIAL_STEPS 8 步验证
  - [x] 6.6 condition 函数测试：combo<5 不触发、combo>=5 触发
  - [x] 6.7 i18n 完整性测试：16 个 key 在 zh/en 两个 locale 中都存在

- [ ] Task 7: 手动验证 (AC: 1, 2, 7)
  - [ ] 7.1 启动完整版新 Run：验证 L0 四步按序触发
  - [ ] 7.2 进商店：验证 L1_shop_intro 触发
  - [ ] 7.3 购买技能/获得遗物：验证对应步骤触发
  - [ ] 7.4 再次运行：验证已完成步骤不重复
  - [ ] 7.5 验证浮窗不遮挡输入区和计时器

## Dev Notes

### 核心发现：事件发射缺口

Story 39.4 需要监听的 2 个事件在 GameEvents 中已定义但**从未在生产代码中 emit**：

| 事件 | 定义位置 | emit 现状 | 修复方案 |
|------|---------|----------|---------|
| `combo:update` | EventBus.ts:70 | **未 emit** | 在 `battle.ts` 的 `state.combo++` 处添加 emit |
| `relic:acquired` | EventBus.ts:66 | **未 emit** | 在 `core/state.ts` 的 `addRelicWithCapacity()` 成功后添加 emit |

已有 `combo:update` 监听者（需验证兼容性）：
- `ParticleController.ts` — combo 里程碑粒子效果
- `KeystrokeSoundController.ts` — combo 里程碑音效

这些监听者已经存在但因事件从未 emit 而从未被触发。添加 emit 后它们将开始工作——需验证行为合理（粒子和音效应该是正面效果）。

### condition 函数与架构层级

`TutorialStep` 接口定义在 `data/` 层（纯数据，不可 import state 模块），但 condition 函数需要访问运行时状态（`state.combo`、`state.meta.stats.totalRuns` 等）。

**解决方案**：分层定义
- `data/tutorialSteps.ts`：定义步骤骨架（id/level/trigger.event/content/prerequisite），condition 留空
- `systems/tutorial/tutorialInit.ts`：import 骨架 → 注入 condition 闭包 → register

```typescript
// systems/tutorial/tutorialInit.ts
import { L0_STEPS, L1_STEPS } from '../../data/tutorialSteps'
import { state } from '../../core/state'
import { tutorialManager } from './TutorialManager'

export function initFullTutorial(): void {
  // 注入 condition（需要 state 访问的在这里设置）
  const L0_welcome = L0_STEPS.find(s => s.id === 'L0_welcome')!
  L0_welcome.trigger.condition = () => state.meta.stats.totalRuns <= 1

  const L0_combo = L0_STEPS.find(s => s.id === 'L0_combo')!
  L0_combo.trigger.condition = () => state.combo >= 5

  tutorialManager.register([...L0_STEPS, ...L1_STEPS])
  tutorialManager.start()
}
```

### shop:purchase condition 问题

`shop:purchase` 事件 payload 为 `{ itemId, type, price }`，但 `TutorialStep.trigger.condition` 签名为 `() => boolean`，**无法接收事件 payload**。

两种方案：
1. **标记变量方案**（推荐）：在 `tutorialInit.ts` 中单独监听 `shop:purchase`，当 `type === 'skill'` 时设置标记 `lastPurchaseWasSkill = true`；L1_skill_bind 的 condition 检查该标记
2. **扩展 condition 签名**：改为 `condition?: (payload?: unknown) => boolean`——需修改 TutorialManager.bindStep，影响较大

推荐方案 1（最小改动），标记变量在 `tutorialInit.ts` 模块内闭包，不污染全局。

### L1_upgrade 触发逻辑

"首次看到可升级技能"不是一个事件——需要转化为可监听的时机：
- 方案：监听 `shop:purchase` + condition 检查 `type === 'skill'` 且该技能已绑定（即为升级而非新购）
- 或监听 `skill:upgraded`（如果存在）——已确认 GameEvents 中有 `skill:upgraded`

### 已确认的 DOM 锚点 ID

| 步骤 | 锚点 ID | 锚定方向 | 说明 |
|------|---------|---------|------|
| L0_welcome | `word-display` | bottom | 单词显示区下方 |
| L0_skill_triggered | `skill-trigger-zone` | top | 键盘可视化区上方 |
| L0_word_complete | `score-count` | bottom | 分数数字下方 |
| L0_combo | `combo-display` | bottom | Combo 显示区下方 |
| L1_shop_intro | `reward-cards` | top | 商品卡片区上方 |
| L1_skill_bind | `skill-trigger-zone` | bottom | 键盘绑定区下方 |
| L1_upgrade | `reward-cards` | top | 可升级商品上方 |
| L1_relic | `player-relics` | top | 遗物栏上方 |

### combo 递增位置

| 文件 | 行 | 上下文 |
|------|-----|-------|
| `systems/battle.ts` | ~430 | 主战斗循环 combo++ |
| `systems/battle.ts` | ~502 | 另一处 combo++ |
| `scoring/ScoreCalculator.ts` | ~161 | 分数计算时 combo++ |

需在每处 combo++ 后添加 `eventBus.emit('combo:update', { combo: state.combo })`，或统一到一个 helper 函数。

### relic 获取位置

主函数：`core/state.ts:176-182` — `addRelicWithCapacity(relicId)`

调用者：
- `systems/shop.ts:1448` — 商店购买遗物
- `systems/restStage.ts` — 休息关遗物选择
- `systems/relicPicker.ts` — 遗物选择 UI
- `systems/classes/ClassManager.ts` — 职业初始遗物

在 `addRelicWithCapacity` 内部 emit 可覆盖所有获取路径。

### 关键架构约束

1. **依赖方向**: `data/ → core/ → systems/ → scenes/`
   - `data/tutorialSteps.ts` 不 import state 或 systems 模块
   - `systems/tutorial/tutorialInit.ts` 可 import data/ + core/ + 同级 systems/
2. **三层状态**: 教程进度 = MetaState（永久），combo = BattleState（每关重置）
3. **事件命名**: `{domain}:{action}` 模式
4. **不修改 TutorialStep 接口**: condition 签名保持 `() => boolean`，通过闭包注入

### Project Structure Notes

- 新建 `systems/tutorial/tutorialInit.ts`：符合 systems/ 层级，负责运行时初始化
- 修改 `data/tutorialSteps.ts`：新增步骤数据，保持纯数据（无 import）
- 修改 `core/state.ts`：添加 relic:acquired emit（最小改动）
- 修改 `systems/battle.ts`：添加 combo:update emit
- 修改 `demo-i18n.ts`：16 个新 i18n key

### References

- [Source: docs/stories/epic-39-tutorial-readability.md#Story 39.4 — L0-L1 步骤规格表]
- [Source: docs/stories/39-3-tutorial-manager-infra.md — TutorialManager API、Dev Notes]
- [Source: src/src/core/events/EventBus.ts:66-70 — combo:update/relic:acquired 定义]
- [Source: src/src/systems/battle.ts:430,502 — combo++ 位置]
- [Source: src/src/core/state.ts:176-182 — addRelicWithCapacity]
- [Source: src/src/scenes/shop/ShopScene.ts:373 — shop:purchase emit]
- [Source: src/src/ui/effects/ParticleController.ts — combo:update 监听者]
- [Source: src/src/systems/audio/KeystrokeSoundController.ts — combo:update 监听者]
- [Source: docs/project-context.md — 依赖方向/事件命名/状态管理规则]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing test failures (22 files, 150 tests) — none from our changes
- 274 related tests pass: 17 L0-L1 + 17 TutorialManager + 8 TutorialOverlay + 8 demoTutorial + 89 MetaState + 24 leaderboard + 37 BattleState + 74 RunState

### Completion Notes List

- Tasks 1-6 implemented and tested. Task 7 is manual visual verification.
- Discovered and fixed 3 event emission gaps: `combo:update`, `relic:acquired`, `skill:upgraded` — all defined in GameEvents but never emitted in production
- ScoreCalculator has its own internal combo state, separate from global `state.combo` — no emit needed there
- L0_welcome condition simplified to always-true (prerequisite chain + persistence already prevents re-triggering)
- L1_upgrade switched from `shop:purchase` + condition to `skill:upgraded` event (cleaner)
- L1_skill_bind uses flag-variable pattern: eventBus listener sets `lastPurchaseWasSkill`, condition reads it
- 17 new tests in tutorialL0L1.test.ts, all passing

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/src/data/tutorialSteps.ts` | Modified | Added L0_STEPS (4), L1_STEPS (4), FULL_TUTORIAL_STEPS |
| `src/src/systems/tutorial/tutorialInit.ts` | Created | condition injection + register + start |
| `src/src/systems/battle.ts` | Modified | Added combo:update emit at 2 locations |
| `src/src/core/state.ts` | Modified | Added relic:acquired emit in addRelicWithCapacity + eventBus import |
| `src/src/systems/shop.ts` | Modified | Added skill:upgraded emit in upgrade path |
| `src/src/demo/demo-i18n.ts` | Modified | Added 16 i18n keys (8 zh + 8 en) |
| `src/src/main.ts` | Modified | Added initFullTutorial import + call with IS_DEMO guard |
| `tests/unit/systems/tutorial/tutorialL0L1.test.ts` | Created | 17 tests for L0-L1 data + conditions + i18n |
