# Story 40.3: 键盘多格绑定系统

Status: review

## Story

As a 玩家,
I want 多格技能在键盘上占据多个相连键位，所有占用键位都触发同一技能,
so that 技能的空间拼图策略真正生效，键盘布局成为构筑核心决策维度.

## Acceptance Criteria

1. **AC1: 多格绑定正确** — 多格技能绑定后，所有占用键位查询 `bindings.get(key)` 返回同一 skillId
2. **AC2: 原子性绑定** — 绑定失败（超出键盘边界 / 形状不适配拓扑）时不产生部分绑定
3. **AC3: 解绑正确** — 解绑技能时释放所有占用键位
4. **AC4: 冲突检测** — 放置形状时，被覆盖的其他技能自动解绑回库存（所有键位释放）
5. **AC5: 向下兼容 1 格** — monomino (0 词条) 技能行为与当前完全一致
6. **AC6: 存档兼容** — 旧存档加载时，无 shapeId 的技能自动作为 monomino 处理，bindings 不丢失

## Tasks / Subtasks

- [x] Task 1: 创建 `BindingManager` 模块 (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 创建 `src/src/systems/bindingManager.ts`
  - [x] 1.2 实现 `bindShapeToKeys(skillId, anchorKey): { success: boolean, displacedSkillIds: string[] }`
    - 从 `state.affixSkills` 获取技能的 `shapeId` 和 `rotation`
    - 调用 `mapShapeToKeys(anchorKey, shapeId, rotation)` 获取目标键位列表
    - 若返回 null（放不下）→ 返回 `{ success: false, displacedSkillIds: [] }`
    - 收集目标键位上已绑定的**其他**技能 → `displacedSkillIds`
    - 先解绑所有 displaced 技能的所有键位（整个形状全解）
    - 原子性设置所有目标键位 → `state.player.bindings.set(key, skillId)`
  - [x] 1.3 实现 `unbindSkill(skillId): string[]`（返回释放的键位列表）
    - 遍历 `bindings`，删除所有 value === skillId 的条目
  - [x] 1.4 实现 `getSkillKeys(skillId): string[]`（查询技能占据的所有键位）
  - [x] 1.5 实现 `getSkillAnchorKey(skillId): string | undefined`（返回技能占据的第一个键位）
  - [x] 1.6 实现 `isKeyAvailableForSkill(key, skillId): boolean`（检查键位对于指定技能是否可用——空闲或已被自己占用）
  - [x] 1.7 monomino 兼容：当 skill 无 shapeId 或 shapeId === 'monomino' 时，退化为单键绑定
- [x] Task 2: 改造 `RunState` 绑定方法 (AC: #1, #5, #6)
  - [x] 2.1 更新 `RunState.bindSkill(key, skillId)` 委托给 `BindingManager.bindShapeToKeys`
  - [x] 2.2 更新 `RunState.unbindSkill(key)` → 按键解绑时解绑该键所属技能的**所有键位**
  - [x] 2.3 更新 `RunState.removeSkill(skillId)` 使用 `BindingManager.unbindSkill`
  - [x] 2.4 更新 `RunState.getKeyForSkill(skillId)` 返回锚点键（第一个绑定键）
  - [x] 2.5 存档加载兼容：`deserialize` 中旧 bindings 数据保持单键映射不变（monomino 语义）
- [x] Task 3: 改造商店绑定逻辑 (AC: #1, #4)
  - [x] 3.1 更新 `shop.ts` 中 `handleDropOnKey` 使用 `BindingManager.bindShapeToKeys`
  - [x] 3.2 处理 displaced skills：被覆盖的技能从键盘移回库存（显示反馈）
  - [x] 3.3 更新交换逻辑：两个多格技能交换时，需先暂存 → 解绑双方 → 重新绑定（避免冲突检测误判）
  - [x] 3.4 更新自动绑定逻辑（购买新技能时），用 `bindShapeToKeys` 替代单键 `bindings.set`
  - [x] 3.5 更新解绑逻辑（拖入库存）：用 `BindingManager.unbindSkill` 替代 `bindings.delete`
- [x] Task 4: 改造其他 binding 调用点 (AC: #1, #5)
  - [x] 4.1 更新 `battle.ts` 中 starter skill 自动绑定（L1 第一个技能）
  - [x] 4.2 更新 `restStage.ts` 中封印/解封键位逻辑
  - [x] 4.3 更新 `skills.ts` 中 `computeSkillDensity` — 多格技能的多个键位都算 hit
  - [x] 4.4 更新商店中低频率键解绑逻辑（解绑多格技能时需解绑全部键位）
  - [x] 4.5 审查所有 `state.player.bindings.set/delete` 直接调用，确保改为使用 BindingManager
- [x] Task 5: 单元测试 (AC: #1~#6)
  - [x] 5.1 测试 `bindShapeToKeys` — monomino 单键绑定
  - [x] 5.2 测试 `bindShapeToKeys` — domino/triomino/tetromino 多键绑定
  - [x] 5.3 测试原子性：超出边界时不产生部分绑定
  - [x] 5.4 测试冲突检测：覆盖其他技能时，displaced 技能全部键位释放
  - [x] 5.5 测试 `unbindSkill` — 多格技能所有键位释放
  - [x] 5.6 测试 `getSkillKeys` / `getSkillAnchorKey`
  - [x] 5.7 测试存档兼容：无 shapeId 技能作为 monomino 处理

## Dev Notes

### 关键设计决策

**bindings Map 语义不变**：`Map<string, string>` — key→skillId 的 1:1 映射不变。多格技能的每个占用键位都映射到同一 skillId。无需改变数据结构。

**BindingManager 模块**：所有 binding 操作统一通过 `BindingManager` 进行，避免散落在各文件的直接 `bindings.set/delete` 操作。这是本 Story 最大的改造工作——需要审查并替换约 30+ 处直接 bindings 操作。

**冲突解决策略**：当新形状覆盖已有技能时：
1. 收集所有被覆盖的 skillId（去重）
2. 对每个被覆盖技能，解绑其**所有**键位（不仅是被覆盖的键位，整个形状全解）
3. 然后设置新技能的所有键位
4. 返回 `displacedSkillIds` 供调用方处理（如显示反馈、返回库存等）

**交换特殊处理**：两个多格技能互换位置时：
1. 暂存双方 skillId + anchorKey
2. 先 `unbindSkill` 双方
3. 再 `bindShapeToKeys` 双方到新位置
4. 若新位置绑定失败，回滚（重新绑定到原位置）

**monomino 退化**：当 `shapeId` 为 `'monomino'` 或 undefined 时，`mapShapeToKeys` 返回单键数组，所有逻辑自然退化为单键行为。

**自动绑定策略**：购买新技能时寻找空闲键位的逻辑需要改造：
- monomino：与当前逻辑一致，找第一个空闲频率 ≥ 5 的键
- 多格技能：遍历候选锚点键，对每个尝试 `mapShapeToKeys`，找到第一个能放下且不覆盖已有技能的位置
- 若找不到空闲位置，技能进入库存不自动绑定

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/core/state/RunState.ts:264-312` | `bindSkill/unbindSkill/getSkillAtKey/getKeyForSkill` | RunState 绑定 API | 是 |
| `src/src/core/state/RunState.ts:237-249` | `removeSkill()` | 移除技能时解绑所有键位 | 是 |
| `src/src/core/state/RunState.ts:515,576` | `serialize/deserialize` | bindings 序列化：`Object.fromEntries` / `Object.entries` | 验证兼容 |
| `src/src/systems/shop.ts:2497-2547` | `handleDropOnKey()` | 拖拽放置技能到键位 + 交换逻辑 | 是 |
| `src/src/systems/shop.ts:2460-2466` | 拖入库存 drop zone | `bindings.delete(sourceKey)` 解绑 | 是 |
| `src/src/systems/shop.ts:1430-1434` | 自动绑定 | 购买后自动绑定到空闲键 | 是 |
| `src/src/systems/shop.ts:2084-2093` | 低频率键解绑 | 进入商店时解绑低频键技能 | 是 |
| `src/src/systems/battle.ts:227-231` | starter skill 绑定 | L1 自动绑定第一个技能 | 是 |
| `src/src/systems/battle.ts:439` | `playerCorrect()` | 击键触发技能 `bindings.get(k)` | 只读，不改 |
| `src/src/systems/restStage.ts:227-235` | 封印键位 | `bindings.delete(key)` | 是 |
| `src/src/systems/restStage.ts:344-346` | 解封键位 | 遍历 bindings 解绑特定技能 | 是 |
| `src/src/systems/battle.ts:1587-1593` | sealed key 恢复 | `bindings.set(seal.key, seal.skillId)` | 是 |
| `src/src/systems/skills.ts:111-119` | `computeSkillDensity` | 遍历 word 统计 binding 命中 | 只读，不改 |
| `src/src/systems/skills.ts:148-150` | `enterPseudoInfinite` | 读取 binding | 只读，不改 |
| `src/src/data/skillShapes.ts:218-260` | `mapShapeToKeys()` | 形状→键位映射函数 | 不改 |
| `src/src/data/skillShapes.ts:189-208` | `areKeysConnected()` | BFS 连通性验证 | 不改 |

### 约束

- **不修改** `skillShapes.ts`（Story 40.1 已完成）
- **不修改** `skillGeneration.ts`（Story 40.2 已完成）
- **不修改** `affixes.ts` 接口（shapeId/rotation 已定义）
- `bindings: Map<string, string>` 数据结构**不变**
- `state.player.bindings.get(key)` 只读调用**不需要改造**（语义不变）
- 只有**写入**操作（set/delete）需要改为通过 BindingManager
- 封印键位 (`sealedKeys`) 记录的是单键，多格技能被封印时需封印**整个形状**的所有键位（或只封印被选中的键，其余键保留？—— 需决策）
- 新文件 `bindingManager.ts` 放在 `src/src/systems/` 目录下

### 封印键位策略决策

当 rest stage 封印一个多格技能的键位时，有两种选择：
- **方案 A: 封印整个形状** — 选中一个键时，该技能的所有占用键位全部封印。简单，但对玩家惩罚可能过重。
- **方案 B: 仅封印被选中键** — 只封印选中的那一个键，技能的其他键位保留。但这破坏了形状的完整性。

**推荐方案 A**：封印整个形状。理由：
1. 保持形状语义一致性
2. 简化实现（不需要处理"部分形状"的触发逻辑）
3. 多格技能本身就更强，封印惩罚更大是合理的风险/收益权衡

### Previous Story Intelligence

Story 40.2 实现笔记：
- `generateSkill` 已正确分配 `shapeId` 和 `rotation`，含 SHAPE_TEMPLATES 验证
- `serializeSkill/deserializeSkill` 已支持形状字段持久化，旧存档默认 monomino
- code review 修复了 `neighborPosRel` 序列化遗漏

Story 40.1 实现笔记：
- `mapShapeToKeys(anchorKey, shapeId, rotation)` 返回 `string[] | null`
- `areKeysConnected(keys)` BFS 连通性验证
- `SHAPE_TEMPLATES` 含 11 种形状的所有旋转态
- `KEY_COORDS` 含 30 键坐标（26 字母 + 4 标点）
- 锚点对应 cells[0]（排序后最左上 cell），非固定 [0,0]

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 新文件 `bindingManager.ts` 使用纯函数 + 模块导出模式
- 测试文件：`src/tests/unit/systems/bindingManager.test.ts`
- 种子随机：如需随机（封印键选择等），使用 `random()` from `seededRandom`
- 使用 `state.player.bindings` 直接操作底层 Map（BindingManager 内部），外部调用者通过 BindingManager API

### Project Structure Notes

- 新增文件：`src/src/systems/bindingManager.ts`（绑定管理器）
- 新增文件：`src/tests/unit/systems/bindingManager.test.ts`（单元测试）
- 修改文件：`src/src/core/state/RunState.ts`（委托绑定操作）
- 修改文件：`src/src/systems/shop.ts`（改用 BindingManager）
- 修改文件：`src/src/systems/battle.ts`（starter skill 绑定）
- 修改文件：`src/src/systems/restStage.ts`（封印/解封逻辑）
- 修改文件：`src/src/systems/skills.ts`（如需）
- 不修改：`skillShapes.ts`、`skillGeneration.ts`、`affixes.ts`、`affixTrigger.ts`

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.3]
- [Source: src/src/core/state/RunState.ts#bindSkill, unbindSkill, removeSkill, getKeyForSkill]
- [Source: src/src/systems/shop.ts#handleDropOnKey, auto-bind, low-freq unbind]
- [Source: src/src/systems/battle.ts#playerCorrect, starter skill bind, sealed key restore]
- [Source: src/src/systems/restStage.ts#seal keys, unseal keys]
- [Source: src/src/systems/skills.ts#computeSkillDensity, enterPseudoInfinite]
- [Source: src/src/data/skillShapes.ts#mapShapeToKeys, areKeysConnected]
- [Source: docs/stories/40-1-shape-data-model.md#Dev Agent Record]
- [Source: docs/stories/40-2-shape-generation.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- RunState 绑定键大小写不一致：RunState.bindSkill 原 toUpperCase，但 KEY_COORDS/KEYS/battle 全用 lowercase。统一为 lowercase。

### Completion Notes List

- 创建 `bindingManager.ts`：核心函数 `bindShapeToKeys`, `unbindSkill`, `unbindKey`, `getSkillKeys`, `getSkillAnchorKey`, `isKeyAvailableForSkill`
- 辅助函数：`autoBindSkill`（多格自动放置）、`sealSkillKeys`/`restoreSealedSkill`（封印恢复）
- 两种状态适配器：`getBindingState`（全局 GameState）和 `getRunStateBindingState`（RunStateData）
- RunState.ts：`bindSkill`/`unbindSkill`/`removeSkill`/`getKeyForSkill` 全部委托 BindingManager
- RunState 键大小写统一为 lowercase（与游戏实际使用一致）
- shop.ts：`handleDropOnKey`（交换逻辑重写）、auto-bind、sell、low-freq unbind、inventory drop 全部改用 BindingManager
- battle.ts：starter skill 绑定 + 封印恢复（按 skillId 分组恢复多格形状）
- restStage.ts：curse_accept 封印整个形状（方案 A）+ removeRandomSkill 解绑
- main.ts：demo 初始绑定改用 BindingManager
- RelicPipeline.ts：纯血词条解绑改用 BindingManager
- 所有 `bindings.set/delete` 直接调用仅保留在 BindingManager 内部和 RunState.deserialize
- 38 个新单元测试：monomino/domino/triomino 绑定、原子性、displaced 释放、unbind、seal/restore、auto-bind、backward compat
- 无回归：RunState (74), skillGeneration (75), bindingManager (38) 全通过

### File List

- `src/src/systems/bindingManager.ts` (新增) — 多格绑定管理器核心模块
- `src/tests/unit/systems/bindingManager.test.ts` (新增) — 38 个单元测试
- `src/src/core/state/RunState.ts` (修改) — 导入 BindingManager，委托绑定操作，键大小写统一 lowercase
- `src/src/systems/shop.ts` (修改) — 导入 BindingManager，改造 handleDropOnKey/auto-bind/sell/low-freq/inventory
- `src/src/systems/battle.ts` (修改) — 导入 BindingManager，starter bind + 封印恢复
- `src/src/systems/restStage.ts` (修改) — 导入 BindingManager，curse seal + removeRandomSkill
- `src/src/main.ts` (修改) — 导入 BindingManager，demo 初始绑定
- `src/src/systems/relics/RelicPipeline.ts` (修改) — 导入 BindingManager，纯血词条解绑
- `src/tests/unit/core/state/RunState.test.ts` (修改) — 3 个测试更新大小写期望值
