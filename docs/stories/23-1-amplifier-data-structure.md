# Story 23.1: 增幅者数据结构与类型定义

Status: done

## Story

As a 开发者,
I want 定义增幅者（Amplifier）技能类型的数据结构、接口和基础常量,
so that 后续故事可以基于统一的类型定义实现触发、叠层、效果计算和 UI 展示.

## Acceptance Criteria

1. `AmplifierDefinition` 接口定义在 `core/types.ts`，包含 id, name, icon, resource, positionRelation, operator('add'|'multiply'), valuePerStack, desc 字段
2. `AmplifierState` 接口定义在 `core/types.ts`，包含 `stacks: number`，用于存储单个增幅者的叠层数
3. `GameState` 新增 `amplifierStacks: Map<string, number>` 字段（key=amplifierId，value=当前叠层数），在关卡结算时清零
4. `GameState` 新增 `amplifierPool: string[]` 字段，用于存储本局可用的增幅者池
5. 新文件 `data/amplifiers.ts` 创建，包含空的 `AMPLIFIERS: Record<string, AmplifierDefinition>` 记录和工具函数
6. `isAmplifier(id)` 函数正确判断技能是否为增幅者
7. `getAmplifierDesc(id, level?)` 函数返回增幅者描述（含等级缩放）
8. `drawAmplifierPool(count)` 函数实现 Fisher-Yates 洗牌抽池
9. `data/skills.ts` 聚合器注册增幅者：`getSkillDisplayInfo` 和 `getSkillSchool` 支持增幅者
10. 单元测试覆盖：isAmplifier 判定、getAmplifierDesc 输出、drawAmplifierPool 抽取、AmplifierState 初始化

## Tasks / Subtasks

- [x] Task 1: 定义 AmplifierDefinition 和 AmplifierState 接口 (AC: 1, 2)
  - [x] 1.1 `core/types.ts` — 新增 `AmplifierOperator = 'add' | 'multiply'` 类型别名
  - [x] 1.2 `core/types.ts` — 新增 `AmplifierDefinition` 接口，字段：`id: string`, `name: string`, `icon: string`, `resource: ResourceType`, `positionRelation: PositionRelation`, `operator: AmplifierOperator`, `valuePerStack: number`, `desc: string`
  - [x] 1.3 `core/types.ts` — 导出 `AmplifierDefinition` 和 `AmplifierOperator`
- [x] Task 2: GameState 新增增幅者相关字段 (AC: 3, 4)
  - [x] 2.1 `core/types.ts` — `GameState` 新增 `amplifierStacks: Map<string, number>`
  - [x] 2.2 `core/state.ts` — `GameState` 新增 `amplifierPool: string[]`
  - [x] 2.3 `core/state.ts` — `createInitialState()` 中初始化 `amplifierStacks: new Map()`, `amplifierPool: []`
  - [x] 2.4 `systems/battle.ts` — `startLevel()` 中清空 `state.amplifierStacks.clear()`
- [x] Task 3: 创建 data/amplifiers.ts 数据文件 (AC: 5, 6, 7, 8)
  - [x] 3.1 新建 `data/amplifiers.ts`，导入 `AmplifierDefinition` 和 `ResourceType` 相关常量
  - [x] 3.2 定义空记录 `export const AMPLIFIERS: Record<string, AmplifierDefinition> = {}`（Story 23.2 填充数据）
  - [x] 3.3 实现 `export function isAmplifier(id: string): boolean { return id in AMPLIFIERS; }`
  - [x] 3.4 实现 `getAmplifierDesc(id: string, level?: number): string`，含等级缩放描述
  - [x] 3.5 实现 `drawAmplifierPool(count: number): string[]`，Fisher-Yates 洗牌
  - [x] 3.6 实现 `getAmplifierValue(id: string, level: number): number`，growthFactors = [1.0, 1.5, 2.0]
- [x] Task 4: 注册到 skills.ts 聚合器 (AC: 9)
  - [x] 4.1 `data/skills.ts` — 导入 `AMPLIFIERS, getAmplifierDesc` from `./amplifiers`
  - [x] 4.2 `data/skills.ts` — `getSkillSchool()` 新增增幅者判定 `{ label: '增幅', cssClass: 'school-amplifier' }`
  - [x] 4.3 `data/skills.ts` — `getSkillDisplayInfo()` 新增 amplifier 分支（含附魔后缀支持）
  - [x] 4.4 `data/skills.ts` — `getSkillSchool()` 新增 amplifier fallback 判定
- [x] Task 5: 单元测试 (AC: 10)
  - [x] 5.1 测试 `isAmplifier`：空 AMPLIFIERS 时返回 false；旧 'amp' ID 返回 false
  - [x] 5.2 测试 `getAmplifierDesc`：无效 id 返回空字符串、不崩溃
  - [x] 5.3 测试 `drawAmplifierPool`：空数据返回空数组
  - [x] 5.4 测试 `getAmplifierValue`：无效 id 返回 0、不崩溃
  - [x] 5.5 测试 `amplifierStacks` 初始化为空 Map、可正确 set/get/clear

## Dev Notes

### 关键设计决策

**增幅者定位——第四种技能类型（纯辅助）：**

| 技能类型 | 作用 | 资源产出 | 键位占用 |
|---------|------|---------|---------|
| 产出者(Producer) | 按键产出资源 | 直接 | 是 |
| 转化者(Converter) | 读取资源→产出另一种 | 间接 | 是 |
| 连接者(Connector) | 自动触发周围技能 | 无（频率辅助） | 是 |
| **增幅者(Amplifier)** | **叠层增幅周围技能面板值** | **无（数值辅助）** | **是** |

**设计哲学：**
- 连接者管理触发频率；增幅者管理数值倍率——两个互补的辅助维度
- 增幅者占据键位但不产出资源（纯辅助角色），创造"投资增幅 vs 直接产出"的张力
- 关卡内叠层创造滚雪球感：前期冷启动 → 中期升温 → 后期爆发

**叠层机制：**
- 每次按键 +1 层（存储在 `state.amplifierStacks`）
- 叠层在**关卡内**持续累积，跨词保留
- 关卡结算时清零（不跨关卡）
- 这与 `SynergyState`（每词重置）不同，故存储在 `GameState` 级别

**AmplifierDefinition 接口设计：**

```typescript
// 参考现有模式
export type AmplifierOperator = 'add' | 'multiply';

export interface AmplifierDefinition {
  id: string;                       // amp_base_add_adjacent, amp_mult_mul_sameRow, ...
  name: string;                     // 强化核心, 倍增光环, ...
  icon: string;                     // emoji
  resource: ResourceType;           // 增幅的目标资源
  positionRelation: PositionRelation; // 影响范围（相邻/同行/同列/...）
  operator: AmplifierOperator;      // 加法增幅 | 乘法增幅
  valuePerStack: number;            // 每层增幅值（Lv1 基准）
  desc: string;                     // 玩家可见描述
}
```

**ID 命名规范：**
- 前缀 `amp_`
- 格式：`amp_[resource]_[operator]_[relation]`
- 示例：`amp_base_add_adjacent`（每层给相邻产出者 base +N）
- 注意：`data/skills.ts` 的 `DELETED_SKILL_IDS` 中有旧 `'amp'`，新 ID 使用更具体的命名避免冲突

### 现有代码定位

| 文件 | 位置 | 说明 |
|------|------|------|
| `src/src/core/types.ts` | L1-50 | `ResourceType`, `ProducerOperator`, `ProducerDefinition`, `ConverterDefinition`, `ConnectorDefinition` 定义处 |
| `src/src/core/types.ts` | L6 | `import type { PositionRelation }` — 已有导入，供增幅者复用 |
| `src/src/core/state.ts` | `createInitialState()` | `converterPool: []`, `connectorPool: []` — 增幅者池同位置添加 |
| `src/src/core/state.ts` | `GameState` 接口 | 新增 `amplifierStacks` 和 `amplifierPool` |
| `src/src/data/producers.ts` | 全文 | `PRODUCERS` 记录 + `isProducer` + `getProducerValue` — 参考模式 |
| `src/src/data/converters.ts` | `drawConverterPool` | Fisher-Yates 洗牌实现 — 复制模式 |
| `src/src/data/connectors.ts` | `drawConnectorPool` | Fisher-Yates 洗牌实现 — 复制模式 |
| `src/src/data/skills.ts` | `getSkillDisplayInfo()` | 聚合器函数 — 需新增 amplifier 分支 |
| `src/src/data/skills.ts` | `getSkillSchool()` | 技能分类 — 需新增 amplifier 判定 |
| `src/src/data/skills.ts` | `DELETED_SKILL_IDS` | 含旧 `'amp'` — 确保新 ID 不冲突 |
| `src/src/data/keyboardTopology.ts` | `PositionRelation` enum | Adjacent/SameRow/SameColumn/SameHand/SameFinger/Symmetric |
| `src/src/data/keyboardTopology.ts` | `getKeysWithRelation()` | 获取指定位置关系的键位列表 — Story 23.3/23.4 将使用 |
| `src/src/systems/battle.ts` | 关卡结束逻辑 | 需在此处清空 `amplifierStacks` |

### 等级缩放模式

参考转化者的等级缩放：
```typescript
// converters.ts 中的模式
const growthFactors = [1.0, 1.5, 2.0]; // Lv1, Lv2, Lv3
const idx = Math.max(0, Math.min(level, 3) - 1);
return baseK * growthFactors[idx];
```

增幅者 `getAmplifierValue` 应遵循相同模式：
```typescript
export function getAmplifierValue(id: string, level: number): number {
  const amp = AMPLIFIERS[id];
  if (!amp) return 0;
  const growthFactors = [1.0, 1.5, 2.0];
  const idx = Math.max(0, Math.min(level, 3) - 1);
  return amp.valuePerStack * growthFactors[idx];
}
```

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `systems/skills.ts` | 触发逻辑在 Story 23.3 |
| `systems/shop.ts` | 商店集成在 Story 23.5（ACT_SKILL_WEIGHTS, SKILL_TYPE_TOOLTIPS 等） |
| `style.css` | 无 UI 变更 |
| `data/enchantments.ts` | 附魔适配在 Story 23.6 |

### CSS 类名预留

`school-amplifier` 的 CSS 样式将在 Story 23.5 中定义。本 story 仅在 `SKILL_SCHOOL` 中注册类名。

### Project Structure Notes

- 新建 1 个文件：`src/src/data/amplifiers.ts`
- 修改 3 个文件：`core/types.ts`（接口）、`core/state.ts`（状态字段）、`data/skills.ts`（聚合器）
- 修改 1 个文件：`systems/battle.ts`（叠层清零，仅需在 reset 逻辑中加一行）
- 新建 1 个测试文件：`tests/unit/data/amplifiers.test.ts`
- 依赖方向：`data → core`（不变，amplifiers.ts 导入 types.ts 的接口）

### Git Intelligence

最近 5 次提交均为 Epic 22（词语牌包系统），模式参考：
- `1aafd7b` — 商店 UX 改进（拖拽/预览等整合 commit）
- `2ec21eb` — Story 22.5（条件联动、权重策略）
- `7678200` — Story 22.1（牌包条件数据结构）

**关键模式洞察：**
- 新数据类型遵循 `data/` 目录下独立文件 + `skills.ts` 聚合的模式
- `core/types.ts` 集中所有技能类型定义
- 测试文件对应 `tests/unit/data/` 目录结构

### References

- [Source: docs/epics.md#Epic 23 — 增幅者技能类型]
- [Source: docs/epics.md#Story 23.1 — 增幅者数据结构与类型定义]
- [Source: docs/gdd.md — 技能系统设计]
- [Source: docs/game-architecture.md — 代码组织规则、依赖方向]
- [Source: docs/project-context.md — 命名规范、测试规则]
- [Source: docs/brainstorming-session-2026-03-05.md — 增幅者设计讨论]
- [Source: src/src/core/types.ts — ProducerDefinition/ConverterDefinition/ConnectorDefinition 模式参考]
- [Source: src/src/data/converters.ts — drawConverterPool/getConverterK 等级缩放参考]
- [Source: src/src/data/skills.ts — getSkillDisplayInfo/getSkillSchool 聚合器参考]
- [Source: src/src/data/keyboardTopology.ts — PositionRelation 枚举]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- Task 1: `AmplifierOperator` 类型别名 + `AmplifierDefinition` 接口添加到 `core/types.ts`（紧跟 ConnectorDefinition 之后、EnchantmentDefinition 之前）
- Task 2: `GameState` 新增 `amplifierPool: string[]` 和 `amplifierStacks: Map<string, number>`；`createInitialState()` 初始化；`startLevel()` 中 `state.amplifierStacks.clear()` 每关清零
- Task 3: 新建 `data/amplifiers.ts`，含空 `AMPLIFIERS` 记录 + `isAmplifier` / `drawAmplifierPool` / `getAmplifierValue` / `getAmplifierDesc` 四个工具函数，参照 converters.ts 的等级缩放和 Fisher-Yates 模式
- Task 4: `data/skills.ts` 聚合器注册增幅者 — 导入 AMPLIFIERS + getAmplifierDesc，`getSkillSchool()` 新增 '增幅' 流派，`getSkillDisplayInfo()` 新增 amplifier 查询分支（含附魔后缀）
- Task 5: 24 个单元测试全部通过（含正向路径 mock 测试）；全量回归 2390/2437 通过（47 个 pre-existing AudioManager/SoundPool）

### Code Review Fixes Applied
- [M1] 修复：新增 13 个正向路径测试（注入临时数据验证 isAmplifier/getAmplifierValue/getAmplifierDesc/drawAmplifierPool 正确性）
- [M2] 修复：`getAmplifierDesc` 的 `!level` 改为 `level == null`，避免 level=0 短路
- [M3] 修复：新增 `AmplifierState` 接口到 `core/types.ts`，满足 AC2 字面要求
- [L1] 修复：`skills.ts` 文件头注释更新为包含增幅者
- [L2] 修复：`drawAmplifierPool` 新增默认参数 `count = 10`
- [L3] 修复：`seenSkillTypes` 注释更新为包含增幅者

### File List
- `src/src/core/types.ts` — 新增 AmplifierOperator 类型 + AmplifierDefinition 接口 + GameState 增加 amplifierPool/amplifierStacks 字段
- `src/src/core/state.ts` — createInitialState() 初始化 amplifierPool: [] 和 amplifierStacks: new Map()
- `src/src/data/amplifiers.ts` — 新建：AMPLIFIERS 空记录 + isAmplifier/drawAmplifierPool/getAmplifierValue/getAmplifierDesc 工具函数
- `src/src/data/skills.ts` — 导入 amplifiers，getSkillSchool() 和 getSkillDisplayInfo() 新增增幅者分支
- `src/src/systems/battle.ts` — startLevel() 中新增 state.amplifierStacks.clear()
- `src/tests/unit/data/amplifiers.test.ts` — 新建：11 个单元测试覆盖工具函数 + 状态集成
- `docs/stories/sprint-status.yaml` — story 状态更新
