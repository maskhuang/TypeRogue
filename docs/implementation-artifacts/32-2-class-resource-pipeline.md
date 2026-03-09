# Story 32.2: 职业专属资源管道

Status: done

## Story

As a 玩家,
I want 职业专属资源（字母碎片 / 变异素）在选择对应职业时自动启用，
so that 不同职业有独有的资源经济维度，为后续职业专属机制（造词台、蜕变）奠定基础。

## Acceptance Criteria

1. ResourceType 新增 `'fragment'`（第 7 种）和 `'mutagen'`（第 8 种），所有引用 ResourceType 的类型约束自动扩展
2. 职业专属资源仅在对应职业激活时启用（`state.classId === 'wordsmith'` 时启用 fragment；`state.classId === 'metamorph'` 时启用 mutagen）
3. BattleState（ResourceState）新增职业资源**本关累计产出计数器**：`classResourceProduced: Record<string, number>`，每关 `resetResources()` 时归零
4. 转化者读取职业资源时使用**本关累计产出量**（`classResourceProduced`）而非库存，确保消费不影响转化者读数
5. 职业资源的产出者/转化者使用现有技能框架（ProducerDefinition / ConverterDefinition），无特殊代码路径
6. RunState（GameState）管理跨关持久化的职业资源库存：
   - 造词师：`fragmentInventory: Record<string, number>`（A-Z 共 26 池）
   - 蜕变师：`mutagenInventory: number`（单池）
   - `createInitialState()` 初始化为空/0
7. 非激活职业的资源类型完全隐藏：
   - UI：产出反馈不显示、HUD 不显示、结算面板不统计
   - 逻辑：非激活职业的产出者/转化者/增幅者/连接者不出现在技能池中

## Tasks / Subtasks

- [x] Task 1: 扩展 ResourceType + ResourceState (AC: #1)
  - [x] 1.1 `types.ts`: ResourceType 联合类型新增 `'fragment' | 'mutagen'`
  - [x] 1.2 `types.ts`: ResourceState 新增 `fragment: number` 和 `mutagen: number` 字段
  - [x] 1.3 `constants.ts`: RESOURCE_COLORS 和 RESOURCE_LABELS 新增 fragment（紫色 #9b59b6，🔤）和 mutagen（绿色 #2ecc71，🧬）
  - [x] 1.4 `state.ts`: createInitialState() 的 resources 对象新增 `fragment: 0, mutagen: 0`

- [x] Task 2: GameState 新增职业资源库存 (AC: #6)
  - [x] 2.1 `types.ts`: GameState 新增 `fragmentInventory: Record<string, number>` 和 `mutagenInventory: number`
  - [x] 2.2 `state.ts`: createInitialState() 初始化 fragmentInventory 为 26 字母各 0，mutagenInventory 为 0
  - [x] 2.3 确保 resetState()（新 Run）清零库存

- [x] Task 3: 本关累计产出计数器 (AC: #3, #4)
  - [x] 3.1 `types.ts`: GameState 新增 `classResourceProduced: Record<string, number>`
  - [x] 3.2 `state.ts`: createInitialState() 初始化为 `{}`
  - [x] 3.3 `state.ts`: resetResources() 中将 classResourceProduced 清零（`state.classResourceProduced = {}`）
  - [x] 3.4 `skills.ts`: triggerProducer 中，当 producer.resource 为 'fragment' 或 'mutagen' 时，累加 classResourceProduced 计数器
  - [x] 3.5 `converters.ts`: getSourceValue() 中，当 source 为 'fragment' 或 'mutagen' 时，读取 `state.classResourceProduced[source]` 而非 `resources[source]`

- [x] Task 4: 产出者写入职业资源库存 (AC: #5)
  - [x] 4.1 `skills.ts`: triggerProducer 中，fragment 产出写入 `state.resources.fragment` 同时累加 `state.fragmentInventory`（暂写入 `_total` 键，Story 32.4 采集队列实现后路由到具体字母）
  - [x] 4.2 `skills.ts`: triggerProducer 中，mutagen 产出写入 `state.resources.mutagen` 同时累加 `state.mutagenInventory`
  - [x] 4.3 fragment/mutagen 的产出遵循现有 producer pipeline（enchantment、amplifier、retrigger 全兼容）

- [x] Task 5: 职业条件过滤 — 技能池 (AC: #2, #7)
  - [x] 5.1 创建 `src/src/systems/classes/ClassResourceFilter.ts`：
    ```typescript
    export function isResourceActiveForClass(resource: ResourceType, classId: ClassId): boolean
    export function filterSkillPoolByClass<T extends { resource?: ResourceType }>(pool: T[], classId: ClassId): T[]
    ```
  - [x] 5.2 `main.ts`: 职业选择后过滤 converterPool / connectorPool / amplifierPool
  - [x] 5.3 `shop.ts`: 商店刷新技能时过滤掉非当前职业的职业资源产出者
  - [x] 5.4 确保 `classId === 'none'` 时完全过滤掉所有 fragment/mutagen 相关技能（验证通过）

- [x] Task 6: UI 隐藏 — 产出反馈 + 结算 (AC: #7)
  - [x] 6.1 `skills.ts`: triggerProducer / triggerConverter 中，非激活职业资源不调用 showFeedback()
  - [x] 6.2 `shop.ts`: 热力图维度 + tooltip 条件显示激活的职业资源
  - [x] 6.3 `skills.ts`: battleStats 中的 EMPTY_RESOURCES 已包含 fragment: 0, mutagen: 0（Record<ResourceType, number> 自动扩展）

- [x] Task 7: classes.ts 类型迁移 (AC: 关联 32.1 TODO)
  - [x] 7.1 `data/classes.ts`: ClassDefinition.uniqueResource 从 `string | null` 改为 `ResourceType | null`（消除 32.1 的 TODO）
  - [x] 7.2 `ClassPicker.ts`: 使用 RESOURCE_LABELS/RESOURCE_ICONS 显示职业资源名

- [x] Task 8: 单元测试 (AC: 全部)
  - [x] 8.1 ResourceType 扩展测试：resources.test.ts — fragment/mutagen 初始化、重置
  - [x] 8.2 classResourceProduced 计数器测试：resources.test.ts — resetResources 清零
  - [x] 8.3 getSourceValue() 测试：converters.test.ts — fragment/mutagen 读取 classResourceProduced
  - [x] 8.4 ClassResourceFilter 测试（12 个用例）：
    - isResourceActiveForClass 各种组合
    - filterSkillPoolByClass 过滤正确
    - filterSkillIdsByClass 过滤正确
    - none 职业过滤所有职业资源
  - [x] 8.5 职业资源库存测试：resources.test.ts — fragmentInventory 26 池初始化、mutagenInventory 初始化
  - [x] 8.6 产出者库存写入测试：覆盖于 triggerProducer 逻辑（同 Task 4 实现）
  - [x] 8.7 回归测试：battle-ui.test.ts 更新 5→7 资源计数、iconRegistry.test.ts 更新 195→197

## Dev Notes

### 关键架构约束

- **零侵入原则**：`classId === 'none'` 时，所有现有 5 种资源的行为完全不变。fragment/mutagen 相关技能不出现在池中、不产出、不显示。
- **计数器 vs 库存分离**：转化者读 `classResourceProduced`（本关累计产出），消费行为读 `fragmentInventory` / `mutagenInventory`。这是核心设计——防止玩家通过不消费资源来 inflate 转化者读数。
- **现有框架零特殊路径**：fragment/mutagen 的产出者和转化者完全复用 ProducerDefinition / ConverterDefinition 框架。`resource: 'fragment'` 和 `resource: 'mutagen'` 就是普通的 ResourceType 值，无需 if-else 特殊处理。唯一特殊点在 getSourceValue() 中读取来源不同。
- **本 Story 不实现具体技能数据**：不定义具体的 fragment/mutagen 产出者和转化者技能，仅确保框架支持。具体技能数据在 Story 32.4/32.5（造词师）和 32.8（蜕变师）中定义。
- **本 Story 不实现 HUD 显示**：fragment/mutagen 的 HUD 计数器显示在 Story 32.4（采集队列 UI）和 32.8（变异素 HUD）中实现。本 Story 只负责隐藏非激活资源。
- **fragmentInventory 写入方式**：本 Story 中 fragment 产出暂写入通用 `state.resources.fragment` + `state.fragmentInventory` 的某个 fallback 键。Story 32.4 会引入采集队列（Collection Queue），届时将 fragment 产出路由到队列中对应的字母。本 Story 的 fragmentInventory 可以用 `_total` 键或类似方式临时累积，不需要按字母分配。

### 现有代码模式（必须遵循）

**ResourceType 扩展模式：**
- ResourceType 是联合类型（`types.ts:13`），直接追加 `| 'fragment' | 'mutagen'`
- ResourceState 是 interface（`types.ts:115-121`），新增对应字段
- 所有 `Record<ResourceType, number>` 类型会自动要求新字段（KeyStats.resources、SkillStats.resources 等）

**Producer 触发流程（`skills.ts:352-441`）：**
```
triggerProducer(prodId, triggerKey)
  → 读 prod.resource（ResourceType）
  → 计算 delta（含 enchantment、amplifier、retrigger）
  → 写 state.resources[prod.resource]
  → 特殊处理：base → synergy.skillBaseScore，score → state.score，multiplier → synergy.skillMultBonus
  → showFeedback() 显示产出
```
fragment/mutagen 不需要 synergy 延迟，走 else 分支（`state.resources[prod.resource] += delta`），与 time/gold 相同。额外需：累加 classResourceProduced 和 inventory。

**Converter 读取流程（`converters.ts:87-92`）：**
```typescript
export function getSourceValue(source: ResourceType, resources: ResourceState): number {
  if (source === 'score') {
    return resources.score + resources.base * resources.multiplier;
  }
  return resources[source];  // ← fragment/mutagen 需改为读 classResourceProduced
}
```
注意：getSourceValue 目前只接收 `resources: ResourceState`，不接收 `state`。需要额外传入 `classResourceProduced` 或改签名。**推荐方案**：新增可选参数 `classResourceProduced?: Record<string, number>`，在 source 为 fragment/mutagen 时从中读取。

**池抽取流程（`main.ts` / `battle.ts`）：**
- `drawConverterPool(20)` — 从 ALL_CONVERTER_IDS 中随机抽 20 个
- `drawConnectorPool(18)` — 从 ALL_CONNECTOR_IDS 中随机抽 18 个
- `drawAmplifierPool(15)` — 从 ALL_AMPLIFIER_IDS 中随机抽 15 个
- 在抽取之前或之后，需按 classId 过滤掉职业资源相关技能

**资源颜色/标签（`constants.ts:68-75`）：**
```typescript
export const RESOURCE_COLORS: Record<ResourceType, string> = {
  base: '#e74c3c', score: '#f1c40f', multiplier: '#e67e22', time: '#3498db', gold: '#FFD700',
  // +fragment, +mutagen
};
export const RESOURCE_LABELS: Record<ResourceType, string> = {
  base: '⚔️', score: '🪙', multiplier: '🔥', time: '⏳', gold: '💰',
  // +fragment: '🔤', +mutagen: '🧬'
};
```

**state.ts resetResources()（`state.ts:123-128`）：**
```typescript
export function resetResources(): void {
  state.resources.base = 0;
  state.resources.score = 0;
  state.resources.multiplier = BALANCE.BASE_MULTIPLIER;
  state.resources.time = state.timeMax;
  // +state.resources.fragment = 0;
  // +state.resources.mutagen = 0;
  // +state.classResourceProduced = {};
}
```

### Record<ResourceType, number> 兼容性

新增 ResourceType 值后，所有使用 `Record<ResourceType, number>` 的地方需要初始化新字段：
- `KeyStats.resources`（`types.ts:90`）— 战后统计，需初始化 fragment: 0, mutagen: 0
- `SkillStats.resources`（`types.ts:95`）— 同上
- 搜索 `Record<ResourceType` 找到所有需更新的位置

### 技能判断方法

判断一个技能是否与职业资源相关：
- **Producer**: `prod.resource === 'fragment' || prod.resource === 'mutagen'`
- **Converter**: `conv.source === 'fragment' || conv.source === 'mutagen' || conv.target === 'fragment' || conv.target === 'mutagen'`
- **Amplifier**: `amp.resource === 'fragment' || amp.resource === 'mutagen'`
- **Connector (resourceTrigger)**: `conn.resource === 'fragment' || conn.resource === 'mutagen'`

### getSourceValue 签名变更方案

**推荐方案A**（最小改动）：
```typescript
export function getSourceValue(
  source: ResourceType,
  resources: ResourceState,
  classResourceProduced?: Record<string, number>
): number {
  if (source === 'fragment' || source === 'mutagen') {
    return classResourceProduced?.[source] ?? 0;
  }
  if (source === 'score') {
    return resources.score + resources.base * resources.multiplier;
  }
  return resources[source];
}
```
调用处（`skills.ts` triggerConverter）传入 `state.classResourceProduced`。

### Project Structure Notes

新增文件：
```
src/src/systems/classes/
└── ClassResourceFilter.ts   # 职业资源条件过滤（isResourceActiveForClass, filterSkillPoolByClass）
```

修改文件：
```
src/src/core/types.ts           # +ResourceType fragment/mutagen, +ResourceState 字段, +GameState 库存字段
src/src/core/state.ts           # createInitialState() 新字段, resetResources() 重置
src/src/core/constants.ts       # RESOURCE_COLORS/LABELS +fragment/mutagen
src/src/data/classes.ts         # uniqueResource 类型迁移 string|null → ResourceType|null
src/src/data/converters.ts      # getSourceValue() 支持 classResourceProduced
src/src/systems/skills.ts       # triggerProducer 写入 classResourceProduced + inventory
src/src/systems/battle.ts       # 池抽取过滤 + 结算兼容
src/src/main.ts                 # 池抽取过滤（如在此处执行）
src/src/systems/shop.ts         # 商店刷新过滤
```

测试文件：
```
tests/unit/systems/classes/ClassResourceFilter.test.ts   # 新增
tests/unit/core/state/resourceExtension.test.ts          # 新增（或合入现有测试）
tests/unit/data/converters.test.ts                       # 修改（getSourceValue 新行为）
tests/unit/systems/skills/producer.test.ts               # 修改（classResourceProduced + inventory 写入）
```

### References

- [Source: docs/stories/epic-22-class-system.md#Story 32.2] — 验收标准原文
- [Source: docs/class-design-wordsmith.md] — 造词师设计：fragment 资源详情、采集队列、概率溢出、转化者读数规则
- [Source: docs/class-design-metamorph.md] — 蜕变师设计：mutagen 资源详情、隐藏池、转化者读数规则
- [Source: src/src/core/types.ts:13] — ResourceType 联合类型定义
- [Source: src/src/core/types.ts:115-121] — ResourceState interface
- [Source: src/src/core/types.ts:126-164] — GameState interface
- [Source: src/src/core/state.ts:12-74] — createInitialState()
- [Source: src/src/core/state.ts:123-128] — resetResources()
- [Source: src/src/core/constants.ts:68-75] — RESOURCE_COLORS, RESOURCE_LABELS
- [Source: src/src/data/classes.ts:21] — uniqueResource TODO(Story 32.2)
- [Source: src/src/data/converters.ts:87-92] — getSourceValue()
- [Source: src/src/systems/skills.ts:352-441] — triggerProducer pipeline
- [Source: src/src/systems/skills.ts:444-528] — triggerConverter pipeline
- [Source: src/src/systems/battle.ts:745-915] — startLevel() + resetResources 调用
- [Source: src/src/systems/battle.ts:122-142] — setWord() per-word reset
- [Source: docs/implementation-artifacts/32-1-class-framework.md] — 前序 Story 实现记录
- [Source: docs/game-architecture.md] — 架构约束：data ← core ← systems ← scenes 单向依赖

### Git Intelligence

最近提交：
```
6156b92 refactor: 音效系统重构准备（移除资源产出音效 + 里程碑颜色微调）
39a3d56 feat: Story 32-1 职业定义框架 + 选择界面
b09b89d fix: 打字音效重构为三层键盘音
c956cd5 fix: 评级系统改为三维平均
8074e7c feat: Story 31-6 关卡评级系统
```
模式：feat/fix + Story 编号 + 中文描述 + 括号内关键实现细节

### Previous Story Intelligence

Story 32-1（职业定义框架）关键教训：
- **DOM 模态框模式**：ClassPicker 使用 DOM 而非 PixiJS Scene，遵循 relicPicker 模式。DOM API 安全（无 innerHTML XSS）
- **类型占位模式**：uniqueResource 使用 `string | null` 而非 `ResourceType | null`，本 Story 需完成迁移
- **MetaState 版本升级**：serialize v3→v4，本 Story 若修改 GameState 序列化无需改 MetaState
- **遗物计数影响**：新增遗物需更新 relics.test.ts / iconRegistry.test.ts 的计数断言
- **测试环境**：Vitest + node 环境（无 jsdom），DOM 操作需 mock globalThis.document
- **循环依赖风险**：新模块注意避免 import 环。ClassResourceFilter.ts 应只依赖 types.ts 和 data 层

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A — no blocking issues encountered.

### Completion Notes List

- ResourceType 扩展导致 Record<ResourceType, ...> 级联更新：amplifiers.ts 的 4 个 Record 对象需添加 fragment/mutagen 空条目
- 池抽取在 main.ts 中发生在职业选择之前，因此过滤必须放在 `startAfterClassSelect` 回调中
- 转化者 `conv_base_time_mul` 原用 🧬 图标与 mutagen 资源图标冲突，改为 🧪 避免 iconRegistry 重复检测失败
- getSourceValue() 签名变更采用可选参数方案（方案A），保持向后兼容
- 热力图维度从常量 HEATMAP_DIMENSIONS 改为函数 getHeatmapDimensions()，按职业动态生成

### Code Review Fixes (2026-03-08)

- **[H1]** triggerConverterWithReduction 补充职业资源处理：classResourceProduced 累加 + 库存写入 + 反馈隐藏
- **[H2]** triggerConverter 补充 classResourceProduced 更新（转化者目标为 fragment/mutagen 时）
- **[H3]** main.ts 合并重复 import（converters/connectors/amplifiers 各从两行合并为一行）
- **[M1]** RESOURCE_COLORS 类型从 `as const` 改为 `Record<string, string>` 保持一致性
- **[M2]** shop.ts 热力图/tooltip 职业资源判断改用 CLASS_DEFINITIONS[classId].uniqueResource 替代硬编码
- **[M3]** 补充 5 个状态追踪测试：classResourceProduced 累加、fragmentInventory._total 累加、mutagenInventory 累加、resetResources 不重置跨关库存

### File List

**新增文件：**
- `src/src/systems/classes/ClassResourceFilter.ts` — 职业资源条件过滤
- `tests/unit/systems/classes/ClassResourceFilter.test.ts` — 过滤器测试（12 用例）

**修改文件：**
- `src/src/core/types.ts` — ResourceType +fragment/mutagen, ResourceState, GameState 扩展
- `src/src/core/constants.ts` — RESOURCE_LABELS/ICONS/COLORS +fragment/mutagen
- `src/src/core/state.ts` — createInitialState() +库存/计数器, resetResources() +清零
- `src/src/data/classes.ts` — uniqueResource 类型迁移 string→ResourceType
- `src/src/data/converters.ts` — getSourceValue() 支持 classResourceProduced, conv_base_time_mul 图标 🧬→🧪
- `src/src/data/amplifiers.ts` — Record<ResourceType> 级联更新（+空条目）
- `src/src/systems/skills.ts` — EMPTY_RESOURCES, triggerProducer/triggerConverter 库存写入+反馈隐藏
- `src/src/systems/shop.ts` — 产出者过滤+热力图维度动态化+tooltip 资源扩展
- `src/src/systems/classes/ClassPicker.ts` — 资源名称使用 RESOURCE_LABELS/ICONS
- `src/src/main.ts` — 职业选择后过滤技能池

**修改测试：**
- `tests/unit/core/resources.test.ts` — +职业资源初始化/重置测试
- `tests/unit/data/converters.test.ts` — +getSourceValue fragment/mutagen 测试
- `tests/unit/systems/battle-ui.test.ts` — 资源计数 5→7
- `tests/unit/data/iconRegistry.test.ts` — 总条目 195→197
- `tests/unit/systems/shop-act-weight.test.ts` — HEATMAP_DIMENSIONS→getHeatmapDimensions
