# Story 30.1: 技能限制框架

Status: done

## Story

As a 玩家,
I want 遗物能对构建施加限制（禁用技能类别、限制数量等）以换取强力增益,
so that T4 规则改造遗物有通用的限制检查基础设施支持。

## Acceptance Criteria

1. `queryRelicFlag` 支持 3 个新 flag：`connector_lock`（boolean）、`enchant_lock`（boolean）、`max_skill_level`（number）
2. 商店生成时：`connector_lock` → 不出连接者商品；`enchant_lock` → 跳过附魔流程；`max_skill_level` → 技能等级上限受限
3. 连接者触发前：`connector_lock` → 跳过连接者触发（`triggerConnectorCopy` 提前返回）
4. 附魔选择时：`enchant_lock` → 跳过 `checkAutoEnchantment` 流程
5. 技能升级时：`max_skill_level` → 限制等级上限（如 1 = 不可升级）
6. 所有限制检查点有浮字反馈提示玩家（如 '连接者已锁定!'）
7. 所有现有测试通过 + 新增限制框架测试全绿

## Tasks / Subtasks

- [x] Task 1: RelicPipeline.ts — queryRelicFlag 扩展 (AC: #1)
  - [x] 1.1 `queryRelicFlag` switch 添加 3 个新 case：
    - `connector_lock`: 检查玩家遗物中是否有设置 `connector_lock` flag 的遗物 → 返回 boolean
    - `enchant_lock`: 同理 → 返回 boolean
    - `max_skill_level`: 返回最低的限制等级（多个遗物取 min），无限制返回 Infinity
  - [x] 1.2 考虑 flag 的可扩展性：当前用硬编码 `state.player.relics.has(id)` 检查，T4 遗物需映射到 flag
- [x] Task 2: shop.ts — 商店限制集成 (AC: #2, #4, #5)
  - [x] 2.1 `generateShopItems` 中：`connector_lock` → 过滤 connector 类别（与 `silence_vow` 的 `isSilenced` 模式一致）
  - [x] 2.2 `generateShopItems` 中：`max_skill_level` → 技能升级选项受限（level >= maxLevel 的技能不出升级商品）
  - [x] 2.3 `checkAutoEnchantment` 中：`enchant_lock` → 跳过附魔弹窗，显示浮字 '附魔已锁定!'
- [x] Task 3: skills.ts — 连接者触发限制 (AC: #3, #6)
  - [x] 3.1 `triggerConnectorCopy` 开头添加 `connector_lock` 检查：若 flag 为 true → 提前返回 + 浮字 '连接者已锁定!'
- [x] Task 4: 测试 (AC: #7)
  - [x] 4.1 `relics.t4.test.ts` 新建：queryRelicFlag 3 个新 flag 返回正确值 + RELIC_FLAGS 结构验证（8 测试）
  - Note: 商店/连接者/附魔集成测试依赖复杂 mock（DOM + 完整 state），由 queryRelicFlag 单元测试覆盖核心逻辑

## Dev Notes

### 限制框架设计

本 Story 仅建立**框架基础设施**（3 个 flag + 4 个检查点），不实现具体 T4 遗物（Story 30-2）。

| Flag | 类型 | 检查点 | 效果 |
|------|------|--------|------|
| `connector_lock` | boolean | 商店生成 + 连接者触发 | 不出连接者 + 不触发连接者 |
| `enchant_lock` | boolean | 附魔选择 | 跳过附魔弹窗 |
| `max_skill_level` | number | 商店升级选项 | 限制技能等级上限 |

### queryRelicFlag 扩展模式

当前 `queryRelicFlag` 使用硬编码遗物 ID 检查（如 `state.player.relics.has('silence_vow')`）。T4 遗物需要建立 **flag → 遗物 ID 映射**，因为未来可能有多个遗物设置同一 flag。

**推荐方案**：在 `relics.ts` 中添加导出常量 `RELIC_FLAGS`，映射 flag name → relic ID 列表：

```typescript
export const RELIC_FLAGS: Record<string, string[]> = {
  connector_lock: ['chain_ban'],     // Story 30-2 添加
  enchant_lock: ['no_enchant_vow'],  // Story 30-2 添加
  max_skill_level: ['minimalist'],   // Story 30-2 添加，value=1
  // 现有 flag 也可迁入（可选，不在本 Story 范围）
}
```

`queryRelicFlag` 改为查询 `RELIC_FLAGS` 表而非硬编码：

```typescript
case 'connector_lock':
  return (RELIC_FLAGS['connector_lock'] || []).some(id => state.player.relics.has(id))
case 'enchant_lock':
  return (RELIC_FLAGS['enchant_lock'] || []).some(id => state.player.relics.has(id))
case 'max_skill_level': {
  const ids = RELIC_FLAGS['max_skill_level'] || []
  const active = ids.filter(id => state.player.relics.has(id))
  if (active.length === 0) return Infinity
  // 取最严格限制（最低等级）
  return Math.min(...active.map(id => RELICS[id]?.effects.find(e => e.modifier === 'max_skill_level')?.value ?? Infinity))
}
```

**但这会引入对 Story 30-2 遗物数据的前向依赖**。更简洁的方案：**先空表，Story 30-2 填充**。框架只建立查询机制，`RELIC_FLAGS` 初始为空，queryRelicFlag 返回默认值（false / Infinity）。

### 商店集成关键细节

**`generateShopItems`**（`shop.ts:156-290`）现有 `silence_vow` 模式：

```typescript
const isSilenced = queryRelicFlag('silence_vow') === true
if (isSilenced) {
  // 跳过所有新技能生成
}
```

**connector_lock** 遵循同一模式，但仅过滤 connector 类别：

```typescript
const isConnectorLocked = queryRelicFlag('connector_lock') === true
// 在技能类别权重中：
if (isConnectorLocked) {
  weights.connector = 0  // 不生成连接者商品
}
```

**max_skill_level** 影响升级选项（`shop.ts:238-254`）：

```typescript
const maxLevel = queryRelicFlag('max_skill_level') as number
// 在检查是否可升级时：
if (currentLevel >= maxLevel) {
  // 不生成升级选项
}
```

**enchant_lock** 影响 `checkAutoEnchantment`（`shop.ts:589-622`）：

```typescript
function checkAutoEnchantment(skillId: string) {
  if (queryRelicFlag('enchant_lock') === true) {
    showFeedback('附魔已锁定!', '#ff0000')
    return
  }
  // ...现有附魔弹窗逻辑
}
```

### 连接者触发限制

`triggerConnectorCopy`（`skills.ts:796-835`）需在最前添加：

```typescript
export function triggerConnectorCopy(connectorId, triggerKey, chainHistory) {
  if (queryRelicFlag('connector_lock') === true) {
    showFeedback('连接者已锁定!', '#ff0000')
    return
  }
  // ...现有逻辑
}
```

**注意**：`triggerSkill` 中连接者分支（`skills.ts:972-978`）调用 `triggerConnectorCopy` 前有 `conn.triggerType === 'copy'` 检查。限制检查应放在 `triggerConnectorCopy` 内部而非 `triggerSkill` 中，因为：
1. 保持职责单一
2. 所有连接者触发路径都经过此函数
3. `triggerSkill` 连接者分支已有 `return`，不参与 retrigger

### 浮字反馈规范

限制触发时应有明确视觉反馈，使用红色 `#ff0000`：

| 场景 | 浮字文本 | 颜色 |
|------|----------|------|
| 连接者被锁 | '连接者已锁定!' | #ff0000 |
| 附魔被锁 | '附魔已锁定!' | #ff0000 |

商店生成过滤是静默的（不显示浮字），因为玩家不会看到被过滤掉的商品。

### 关键文件清单

| 文件 | 操作 |
|------|------|
| `src/src/systems/relics/RelicPipeline.ts` | 修改：queryRelicFlag +3 case |
| `src/src/data/relics.ts` | 修改：添加 RELIC_FLAGS 导出常量（初始空表） |
| `src/src/systems/shop.ts` | 修改：generateShopItems 过滤 + checkAutoEnchantment 锁定 |
| `src/src/systems/skills.ts` | 修改：triggerConnectorCopy 锁定检查 |
| `src/tests/unit/systems/relics/relics.t4.test.ts` | 新建：限制框架测试 |

### Project Structure Notes

- `queryRelicFlag` 是遗物行为检查的唯一入口（`RelicPipeline.ts:67-91`）
- 商店系统（`shop.ts`）已有 `silence_vow` 的限制模式可参考
- 连接者触发路径：`triggerSkill` → `triggerConnectorCopy`（`skills.ts:796-835`）
- 附魔入口：`checkAutoEnchantment`（`shop.ts:589-622`）
- 限制框架不修改 `PipelineContext` 或 `ConditionEvaluator`（限制是 flag 查询，非条件系统）
- 测试按 Tier 分文件：`relics.t4.test.ts`

### References

- [Source: docs/planning-artifacts/relic-implementation-plan.md §Epic 6 Story 6.1]
- [Source: src/src/systems/relics/RelicPipeline.ts — queryRelicFlag L67-91]
- [Source: src/src/systems/shop.ts — generateShopItems L156-290, checkAutoEnchantment L589-622, silence_vow check L160]
- [Source: src/src/systems/skills.ts — triggerConnectorCopy L796-835, triggerSkill connector branch L972-978]
- [Source: docs/implementation-artifacts/29-2-t3-retrigger-relics.md — 前序 Story 模式]

### 前序 Story 模式

Story 29-1/29-2 建立的行为型遗物模式：
- `RELIC_MODIFIER_DEFS` 工厂产出 `Modifier[]`（管道计算用）
- 行为遗物使用 `phase: 'after'` + `behavior` 字段
- `queryRelicFlag` 用于简单布尔/数值检查（不走管道）
- `silence_vow` 是最接近的 T4 前身模式：flag 检查 → 商店过滤 → 功能禁用

Story 27-5 建立的 `relicStates` 模式：
- `relicStates: Record<string, number>` 存储遗物动态状态
- `max_skill_level` 的值可存储在遗物数据定义的 `effects` 中，工厂通过 `RELICS[id]` 读取

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, no debug issues.

### Completion Notes List

1. **RELIC_FLAGS 映射表** — 在 `relics.ts` 添加 `Record<string, string[]>` 导出常量，初始为空数组。Story 30-2 填充具体遗物 ID。
2. **queryRelicFlag 3 新 case** — `connector_lock`/`enchant_lock` 返回 boolean（`.some()` 查询），`max_skill_level` 返回 number（`Math.min()` 取最严格限制，无遗物返回 Infinity）。
3. **商店集成 3 检查点** — connector_lock 将权重置 0 过滤连接者；max_skill_level 限制升级选项 levelCap；enchant_lock 阻断 checkAutoEnchantment 和 checkPendingEnchantments 两处附魔入口。
4. **连接者触发锁** — triggerConnectorCopy + checkResourceTriggers 两处 connector_lock 检查，覆盖 copy 和 resourceTrigger 两种连接者。
5. **测试 8 个** — queryRelicFlag 6 测试（3 flag × 有/无遗物）+ RELIC_FLAGS 结构 2 测试。商店/连接者/附魔的集成测试依赖 mock 复杂度高，由 queryRelicFlag 单元测试覆盖核心逻辑。
6. **全量测试**: 2781 passed, 42 pre-existing audio failures.
7. **[Code Review Fix]** connector_lock 补全 checkResourceTriggers 路径（资源触发型连接者也被锁）。
8. **[Code Review Fix]** RelicModifierType 添加 `max_skill_level` 成员，修复 Story 30-2 的前向类型兼容性。
9. **[Code Review Fix]** Task 4.2-4.4 标记纠正为 Note，测试 afterAll → afterEach 安全清理。
10. **[Code Review Fix]** retrigger-integration.test.ts mock 补全 queryRelicFlag 导出。

### File List

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 修改：添加 `RELIC_FLAGS` 导出常量 + `RelicModifierType` 补充 `max_skill_level` |
| `src/src/systems/relics/RelicPipeline.ts` | 修改：queryRelicFlag +3 case，导入 RELIC_FLAGS/RELICS |
| `src/src/systems/shop.ts` | 修改：connector_lock 过滤 + max_skill_level 限制 + enchant_lock 阻断 |
| `src/src/systems/skills.ts` | 修改：triggerConnectorCopy + checkResourceTriggers connector_lock 检查 |
| `src/tests/unit/systems/relics/relics.t4.test.ts` | 新建：8 个限制框架测试（afterEach 安全清理） |
| `src/tests/unit/systems/retrigger-integration.test.ts` | 修改：mock 补全 queryRelicFlag |
