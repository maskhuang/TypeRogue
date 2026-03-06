# Story 21.6: 金币连接者适配

Status: done

## Story

As a 玩家,
I want 连接者系统支持金币资源触发，
so that 我可以构建金币产出链路——金币产出者触发相邻/同行等非金币技能，形成完整的金币联动构筑.

## Acceptance Criteria

1. `CONNECTORS` 新增 6 个 `conn_gold_*` 连接者（6 种 PositionRelation × gold 资源），与现有 5 资源 × 6 位置的模式一致
2. `checkResourceTriggers('gold', ...)` 路径可正常触发金币连接者链（无需改 skills.ts — 已泛型化）
3. `drawConnectorPool` 默认抽取数量从 18 调整为 21（= 42 × 50%，保持约一半的抽取比例）
4. 现有连接者数据测试更新：总数 36→42，资源触发型 30→36，资源列表含 `'gold'`
5. 新增金币连接者触发链路测试

## Tasks / Subtasks

- [x] Task 1: 新增 6 个金币连接者定义 (AC: 1)
  - [x] 1.1 `data/connectors.ts` — 在 shield 组之后新增 `conn_gold_adjacent` ~ `conn_gold_symmetric`（6 个）
  - [x] 1.2 每个连接者命名遵循现有模式：中文双字名 + 💰+位置图标 + resourceTrigger + gold
- [x] Task 2: 调整 drawConnectorPool 默认数量 (AC: 3)
  - [x] 2.1 `data/connectors.ts` drawConnectorPool() — 默认 `count = 21`（42 总 × 50%）
  - [x] 2.2 注释更新：`/** 每局 run 从 42 个连接者中随机抽 21 个 ID */`
- [x] Task 3: 验证 checkResourceTriggers 金币路径 (AC: 2)
  - [x] 3.1 审查 `skills.ts` checkResourceTriggers() — 确认 resource 参数为 ResourceType，金币已包含
  - [x] 3.2 审查 `skills.ts` canProduceResource() — 确认金币产出者/转化者被正确识别
  - [x] 3.3 审查 `skills.ts` triggerSkill() — 确认产出者触发后调用 `checkResourceTriggers(PRODUCERS[id].resource, ...)`
- [x] Task 4: 更新连接者数据测试 (AC: 4)
  - [x] 4.1 `connectors.test.ts` — 总数断言 36→42
  - [x] 4.2 `connectors.test.ts` — 资源触发型断言 30→36
  - [x] 4.3 `connectors.test.ts` — id 唯一断言 36→42
  - [x] 4.4 `connectors.test.ts` — 资源触发型覆盖测试 resources 列表加 `'gold'`
  - [x] 4.5 `connectors.test.ts` — drawConnectorPool 默认数量断言 18→21
  - [x] 4.6 `connectors.test.ts` — 超过总数断言 36→42、概率性测试 18→21
- [x] Task 5: 新增金币连接者触发测试 (AC: 5)
  - [x] 5.1 新增测试：`conn_gold_adjacent` 在 isConnector 中返回 true
  - [x] 5.2 新增测试：getConnectorDesc 金币连接者包含"金币"标签

## Dev Notes

### 关键设计决策

**连接者系统天然泛型化：**
- `checkResourceTriggers(resource: ResourceType, ...)` 已接受任何 ResourceType（含 gold）
- `canProduceResource()` 已正确处理金币产出者和转化者
- `triggerSkill()` 中产出者触发后已调用 `checkResourceTriggers(PRODUCERS[id].resource, ...)`
- 因此 **无需修改 skills.ts** — 只需在 connectors.ts 中添加数据即可

**金币连接者命名方案：**

| ID | 名称 | 图标 | 位置关系 | 描述 |
|----|------|------|----------|------|
| `conn_gold_adjacent` | 交易 | 💰🔗 | Adjacent | 相邻金币↑→随机触发1个相邻非金币技能 |
| `conn_gold_sameRow` | 汇款 | 💰📡 | SameRow | 同行金币↑→随机触发1个同行非金币技能 |
| `conn_gold_sameColumn` | 金脉 | 💰📌 | SameColumn | 同列金币↑→随机触发1个同列非金币技能 |
| `conn_gold_sameHand` | 铸币 | 💰🤝 | SameHand | 同手金币↑→随机触发1个同手非金币技能 |
| `conn_gold_sameFinger` | 点金 | 💰👆 | SameFinger | 同指金币↑→随机触发1个同指非金币技能 |
| `conn_gold_symmetric` | 镜财 | 💰🪞 | Symmetric | 对称位金币↑→随机触发1个对称位非金币技能 |

**drawConnectorPool 数量调整：**
- 当前：36 总 → 抽 18（50%）
- 新增后：42 总 → 抽 21（50%），保持相同抽取比例
- 这确保金币连接者有合理的出现概率

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|----------|
| `src/src/data/connectors.ts` | line 71-77 (shield 组之后) | 新增 6 个 conn_gold_* 定义 |
| `src/src/data/connectors.ts` | line 87-88 (drawConnectorPool) | 默认数量 18→21 + 注释更新 |
| `src/tests/unit/data/connectors.test.ts` | line 14-26 | 总数/资源触发型/id唯一断言更新 |
| `src/tests/unit/data/connectors.test.ts` | line 55-64 | 资源列表加 'gold' |
| `src/tests/unit/data/connectors.test.ts` | line 95, 114, 118 | drawConnectorPool 数量断言更新 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `systems/skills.ts` | checkResourceTriggers/canProduceResource/triggerSkill 已泛型化，gold 自动支持 |
| `core/types.ts` | ConnectorDefinition.resource 类型为 ResourceType，已含 gold |
| `systems/shop.ts` | 商店连接者查找通过 CONNECTORS 字典，新增条目自动可用 |
| `core/constants.ts` | RESOURCE_LABELS/ICONS/COLORS 已含 gold |

### 现有连接者数据结构（参考）

```typescript
// connectors.ts 结构：5 资源 × 6 位置 + 6 copy = 36 个
// 每个资源触发型：
{
  id: 'conn_{resource}_{relation}',
  name: '双字中文名',
  icon: '{资源emoji}{位置emoji}',
  triggerType: 'resourceTrigger',
  positionRelation: PositionRelation.{Relation},
  resource: '{resource}',
  desc: '{关系}{资源}↑→随机触发1个{关系}非{资源}技能'
}
```

### 触发链路验证

```
prod_mint (金币产出者) 绑定到 'a' 键
conn_gold_adjacent (金币连接者) 绑定到 's' 键
prod_burst (基数产出者) 绑定到 'd' 键

流程：
1. 玩家按 'a' → triggerProducer('prod_mint') → state.resources.gold += N
2. → checkResourceTriggers('gold', 'a', [])
3. → 遍历 bindings，找到 conn_gold_adjacent 在 's'
4. → 's' 和 'a' 是 adjacent ✓
5. → 找 adjacent 候选，排除 gold 产出者
6. → 'd' 上的 prod_burst 不产出 gold → 候选 ✓
7. → triggerSkill('prod_burst', 'd', ['a', 's', 'd'])
```

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- 连接者数据纯数据定义，无逻辑依赖
- `getConnectorDesc()` 已使用 `RESOURCE_LABELS/ICONS` 动态生成描述，gold 自动正确
- 商店 `isGoldSkill()` 仅检查 producers/converters（不含 connectors），这是合理的：连接者是辅助链路，不直接产出金币

### References

- [Source: docs/epics.md#Epic 21 Story 21.6]
- [Source: docs/stories/21-5-settlement-stats-adapt.md — 前序 story]
- [Source: src/src/data/connectors.ts — 连接者数据定义]
- [Source: src/src/systems/skills.ts#checkResourceTriggers — 资源触发逻辑]
- [Source: src/tests/unit/data/connectors.test.ts — 连接者数据测试]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 新增 6 个金币连接者：交易/汇款/金脉/铸币/点金/镜财（conn_gold_adjacent ~ conn_gold_symmetric）
- drawConnectorPool 默认抽取数量 18→21（42 总 × 50%）
- 验证 skills.ts checkResourceTriggers/canProduceResource/triggerSkill 已泛型化支持 gold
- 更新 connectors.test.ts：总数 36→42、资源触发型 30→36、id 唯一 36→42、资源列表加 'gold'
- 更新 drawConnectorPool 测试：默认 18→21、自定义最大 36→42、超过总数 36→42、概率性 18→21
- 新增 2 个金币连接者测试：isConnector 返回 true + getConnectorDesc 包含"金币"
- 全套 2333/2338 通过（5 个失败为 pre-existing）
- Code review 修复：更新 3 处陈旧注释（connectors.ts ×2 + types.ts ×1）"36"→"42"

### File List
- `src/src/data/connectors.ts` — 新增 6 个 conn_gold_* 连接者 + drawConnectorPool 默认 21 + 注释更新
- `src/tests/unit/data/connectors.test.ts` — 更新计数断言 + 新增金币连接者测试
- `src/src/core/types.ts` — connectorPool 注释 36 抽 18 → 42 抽 21
