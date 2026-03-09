# Story 32.1: 职业定义框架 + 选择界面

Status: done

## Story

As a 玩家,
I want 在 Run 开始时选择一个职业（或不选），
so that 每次 Run 有不同的核心机制和构筑方向，增加 Replayability。

## Acceptance Criteria

1. ClassDefinition 接口定义完成：
   ```typescript
   interface ClassDefinition {
     id: ClassId                    // 'wordsmith' | 'metamorph' | 'none'
     name: string                   // 显示名
     description: string            // 职业描述
     uniqueResource: ResourceType | null  // 独有资源类型（none 职业为 null）
     loseFeature: FeatureId | null        // 失去的能力（none 职业为 null）
     starterRelic: RelicId | null         // 初始遗物（none 职业为 null）
   }
   ```
2. ClassManager 管理职业注册和当前选中职业
3. RunState / GameState 新增 `classId: ClassId` 字段（默认 `'none'`）
4. 职业选择界面（Run 开始前展示）：展示可选职业 + 说明 + 确认
5. 选择「无职业」可跳过（默认模式，无 UI 变化）
6. 选中职业后 starterRelic 自动加入背包（调用 `addRelicWithCapacity`）
7. MetaState 追踪已解锁职业（`unlockedClasses: Set<string>`）

## Tasks / Subtasks

- [x] Task 1: 定义类型与数据结构 (AC: #1, #3)
  - [x]1.1 在 `src/src/core/types.ts` 新增 `ClassId` 类型和 `FeatureId` 类型
  - [x]1.2 创建 `src/src/data/classes.ts` 定义 `ClassDefinition` 接口和三个职业数据（none / wordsmith / metamorph）
  - [x]1.3 在 `GameState` 接口新增 `classId: ClassId` 字段（默认 `'none'`）
  - [x]1.4 在 `createInitialState()` 初始化 `classId: 'none'`

- [x] Task 2: 实现 ClassManager (AC: #2)
  - [x]2.1 创建 `src/src/systems/classes/ClassManager.ts`
  - [x]2.2 实现职业注册（`register(def: ClassDefinition)`）
  - [x]2.3 实现当前职业查询（`getCurrentClass(): ClassDefinition`）
  - [x]2.4 实现职业选择（`selectClass(classId: ClassId)`）— 写入 `state.classId` + 添加 starterRelic
  - [x]2.5 实现职业重置（`resetClass()`）— Run 结束时清理

- [x] Task 3: MetaState 职业解锁追踪 (AC: #7)
  - [x]3.1 在 `MetaState` 新增 `unlockedClasses: Set<string>`（默认含 `'none'`）
  - [x]3.2 添加 `unlockClass(classId)` / `isClassUnlocked(classId)` / `getUnlockedClasses()` 方法
  - [x]3.3 更新 `serialize()` / `deserialize()` 支持 `unlockedClasses`（版本号升至 4）
  - [x]3.4 更新 `reset()` 重置 `unlockedClasses`

- [x] Task 4: 职业选择界面 (AC: #4, #5, #6)
  - [x]4.1 创建 `src/src/systems/classes/ClassPicker.ts`（DOM 模态框模式，遵循 relicPicker 模式）
  - [x]4.2 实现职业卡片展示（图标 + 名称 + 描述 + 独有资源 + 失去能力 + 初始遗物）
  - [x]4.3 实现「无职业」选项（跳过按钮或卡片）
  - [x]4.4 实现确认选择流程（点击卡片 → 确认 → 调用 ClassManager.selectClass）
  - [x]4.5 集成到游戏启动流程：`main.ts` 中 Run 开始前先显示 ClassSelectScene

- [x] Task 5: 集成与状态连接 (AC: #3, #6)
  - [x]5.1 修改 `main.ts` 启动流程：resetState → ClassSelectScene → 选完后 startLevel
  - [x]5.2 确保 `resetState()` 将 `classId` 重置为 `'none'`
  - [x]5.3 选择职业后自动添加 starterRelic（调用现有 `addRelicWithCapacity`）
  - [x]5.4 职业信息持久化到 RunState（存档/读档支持）

- [x] Task 6: 单元测试 (AC: 全部)
  - [x]6.1 ClassManager 测试：注册、选择、查询、重置
  - [x]6.2 MetaState 职业解锁测试：解锁、查询、序列化/反序列化
  - [x]6.3 GameState classId 初始化和重置测试
  - [x]6.4 starterRelic 自动添加测试
  - [x]6.5 「无职业」模式测试（classId='none' 时无 starterRelic、无 loseFeature）

## Dev Notes

### 关键架构约束

- **零侵入原则**：`classId === 'none'` 时，所有现有系统行为不变。ClassManager 的查询结果为 `{ uniqueResource: null, loseFeature: null, starterRelic: null }`
- **状态层次**：classId 属于 Run 层（每局选一次，Run 结束重置）。已解锁职业属于 Meta 层（跨 Run 持久化）
- **依赖方向**：`data/classes.ts`（纯数据） ← `systems/classes/ClassManager.ts`（逻辑） ← `scenes/classSelect/`（UI），严格单向

### 现有代码模式（必须遵循）

- **ResourceType** 当前为联合类型 `'base' | 'score' | 'multiplier' | 'time' | 'gold'`，后续 Story 32.2 会扩展为 `| 'fragment' | 'mutagen'`。本 Story 中 ClassDefinition.uniqueResource 可先引用字符串，待 32.2 扩展
- **GameState** 是一个扁平接口（非 class），通过 `createInitialState()` 工厂函数创建。新增 `classId` 字段遵循同样模式
- **MetaState** 是 class 实例，有 `serialize/deserialize` 方法。新增 `unlockedClasses` 需同步更新版本号和双向序列化
- **Scene 系统**：使用 `BaseScene`（`src/src/scenes/BaseScene.ts`）基类，`SceneManager` 提供 `push/pop/replace/clear` 栈操作
- **遗物添加**：使用 `addRelicWithCapacity(relicId)` 函数（`src/src/core/state.ts:164`），自动处理容量检查和 `initRelicState`
- **事件总线**：使用 `eventBus.emit('event:name', data)` + `eventBus.on('event:name', handler)` 模式（`src/src/core/events/EventBus.ts`）

### 当前游戏启动流程

现有 `main.ts` 的 Run 启动路径：
1. `resetState()` → 重置 GameState
2. 池抽取（`drawConverterPool(20)` / `drawConnectorPool(18)` / `drawAmplifierPool(15)`）
3. 直接 `startLevel()` 进入战斗

**改造后**：
1. `resetState()` → 重置 GameState（classId = 'none'）
2. 显示 ClassSelectScene（用户选择职业）
3. ClassManager.selectClass(classId) → 设置 state.classId + 添加 starterRelic
4. 池抽取（此处后续 Story 32.8 蜕变师会改造为可见/隐藏池分割）
5. `startLevel()` 进入战斗

### StarterRelic 定义

造词师和蜕变师的初始遗物（学徒笔记 / 原初变异体）的具体效果在 Story 32.7 / 32.10 中实现。本 Story 只需：
- 在 `data/classes.ts` 中引用 relicId 字符串
- 在 `data/relics.ts` 中注册基础定义（id + name + 空效果占位）
- 选择职业时调用 `addRelicWithCapacity(starterRelicId)`

### UI 设计要点

职业选择界面风格应与现有商店界面一致（深色背景 + 霓虹强调色）：
- 3 张卡片横排：造词师 / 蜕变师 / 无职业
- 未解锁职业灰色 + 锁定图标 + 解锁条件文字
- 点击已解锁卡片 → 高亮选中 → 底部确认按钮
- 确认后淡出进入战斗

### Project Structure Notes

新增文件：
```
src/src/
├── data/
│   └── classes.ts              # 职业数据定义（ClassDefinition + CLASS_DEFINITIONS）
└── systems/
    └── classes/
        ├── ClassManager.ts     # 职业管理器
        └── ClassPicker.ts      # 职业选择 DOM 模态框（遵循 relicPicker 模式）
```

修改文件：
```
src/src/core/types.ts        # +ClassId, +FeatureId
src/src/core/state.ts        # createInitialState() +classId
src/src/core/state/MetaState.ts  # +unlockedClasses, serialize v4
src/src/main.ts              # 启动流程插入 ClassSelectScene
src/src/data/relics.ts       # +学徒笔记/原初变异体占位定义
```

测试文件：
```
tests/unit/systems/classes/ClassManager.test.ts
tests/unit/systems/classes/ClassPicker.test.ts
tests/unit/core/state/MetaState.test.ts  # 新增职业解锁测试节
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.1] — 验收标准原文
- [Source: docs/class-design-wordsmith.md] — 造词师完整设计
- [Source: docs/class-design-metamorph.md] — 蜕变师完整设计
- [Source: src/src/core/types.ts] — ResourceType, GameState, PlayerState 定义
- [Source: src/src/core/state.ts] — createInitialState(), resetState(), addRelicWithCapacity()
- [Source: src/src/core/state/MetaState.ts] — MetaState class, serialize/deserialize (v3)
- [Source: src/src/scenes/SceneManager.ts] — SceneManager 栈操作
- [Source: src/src/scenes/BaseScene.ts] — BaseScene 基类
- [Source: src/src/data/relics.ts] — 遗物数据定义模式
- [Source: src/src/main.ts] — 游戏启动流程和池抽取逻辑

### Git Intelligence

最近 5 次提交围绕 Epic 31（数字 Juice 体系），模式：
- 提交格式：`feat: Story XX-X 功能名（关键实现细节）+ code review修复`
- 每个 Story 实现后跟 code review 修复
- 新增文件遵循模块化组织（`effects/juice.ts` → Juice 效果集中管理）
- 测试放在 `tests/unit/` 对应路径下

### Previous Story Intelligence

Story 31-6（关卡评级系统）关键教训：
- **循环依赖解决**：`juice.ts → sound.ts → state.ts → battle.ts → juice.ts` 通过回调参数注入解决（传 `playRatingSound` 作为回调而非直接 import）
- **函数迁移模式**：`calculateRating()` 从 `battle.ts` 移到 `juice.ts` 后，需要更新所有 import 路径（`shop.ts` 等消费方）
- **测试覆盖**：64 个单元测试，重点覆盖边界条件

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- 使用 DOM 模态框模式（非 PixiJS Scene）实现职业选择 UI，遵循 relicPicker.ts 现有模式
- ClassDefinition.uniqueResource 使用 `string | null`（而非 ResourceType），因 'fragment'/'mutagen' 尚未加入 ResourceType（待 Story 32.2）
- MetaState serialize 版本号 3 → 4，deserialize 兼容 v1-v4
- 两个初始遗物（apprentice_notes / primal_mutant）为占位定义（effects: []），具体效果待 Story 32.7/32.10
- 修复了遗物定义位置错误（误入 RELIC_MODIFIER_DEFS），移至 RELICS 对象内
- 更新了相关计数测试（RELICS 35→37, common 4→6, 图标注册表 193→195, 序列化版本 3→4）
- 10 个预存在失败测试（battle-stats + actTransition）非本 Story 引入，来自未提交的 sound/juice/shop/skills 修改

### File List
**新增文件：**
- `src/src/data/classes.ts` — 职业数据定义（ClassDefinition 接口 + 3 职业数据）
- `src/src/systems/classes/ClassManager.ts` — 职业管理器单例
- `src/src/systems/classes/ClassPicker.ts` — 职业选择 DOM 模态框
- `src/tests/unit/systems/classes/ClassManager.test.ts` — ClassManager + GameState + ClassDefinition 测试
- `src/tests/unit/systems/classes/ClassPicker.test.ts` — ClassPicker no-DOM fallback 测试

**修改文件：**
- `src/src/core/types.ts` — +ClassId, +FeatureId 类型
- `src/src/core/state.ts` — createInitialState() +classId: 'none'
- `src/src/core/state/MetaState.ts` — +unlockedClasses, serialize v4, unlockClass/isClassUnlocked/getUnlockedClasses
- `src/src/main.ts` — 启动流程集成 ClassPicker
- `src/src/data/relics.ts` — +apprentice_notes, +primal_mutant 占位定义
- `src/index.html` — +class-select-modal HTML
- `src/src/style.css` — +职业选择 CSS 样式
- `src/tests/unit/core/state/MetaState.test.ts` — +职业解锁/序列化/重置测试, 版本号 3→4
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物计数 35→37
- `src/tests/unit/systems/relics/relics.slots.test.ts` — 允许 basePrice=0
- `src/tests/unit/data/iconRegistry.test.ts` — 图标数 193→195
- `src/tests/unit/core/leaderboard.test.ts` — 序列化版本 3→4

## Senior Developer Review (AI)

**Reviewer:** Yuchenghuang | **Date:** 2026-03-08 | **Model:** Claude Opus 4.6

**Result:** Approved (with fixes applied)

### Issues Found & Fixed
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| H1 | HIGH | ClassPicker.innerHTML XSS 风险 | 重构为 DOM API (textContent + appendChild) |
| H2 | HIGH | resetClass() 未集成到游戏流程 | 添加文档注释说明 resetState() 已覆盖，resetClass() 保留供未来使用 |
| M2 | MEDIUM | uniqueResource 类型偏离 AC 规范 | 添加 TODO(Story 32.2) 注释标记技术债 |
| M3 | MEDIUM | ClassPicker 缺少单元测试 | 新增 ClassPicker.test.ts（2 个 no-DOM fallback 测试） |
| L2 | LOW | Story 文件引用过期路径 | 更新 Project Structure Notes + File List |

### Not Fixed (Out of Scope)
| # | Severity | Issue | Reason |
|---|----------|-------|--------|
| M1 | MEDIUM | Git 中有非本 Story 的脏文件 | 提交时手动 stage 相关文件即可 |
| M4 | MEDIUM | classManager 模块级单例初始化 | 当前无循环依赖，风险可控 |
| L1 | LOW | getSelectableClassIds() 硬编码 | 当前仅 2 个职业，过早优化 |

### Test Results
- Story 相关测试: **170/170 通过**
- 全局测试: 2959/2969 通过（10 个失败为预存在问题，非本 Story 引入）
