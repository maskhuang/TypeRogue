# Story 40.11: 平衡调整与集成测试

Status: ready-for-dev

## Story

As a 游戏设计师,
I want 对多格技能系统进行整体平衡调整、Bug 修复和集成测试,
so that 多格技能提供有趣的空间决策而不破坏现有数值平衡.

## Acceptance Criteria

1. **AC1: Mirror 刷新多格修复** — battle.ts 中 Mirror 词条复制刷新使用完整 occupiedKeys 而非单个 boundKey，多格 Mirror 技能的复制候选范围正确扩展
2. **AC2: 商店空间词条范围高亮多格适配** — 商店中选中/悬停带空间词条的多格技能时，高亮范围使用 `getExtendedNeighbors(occupiedKeys)` 而非单键位邻居
3. **AC3: 旧存档加载兼容** — 无 `shapeId` 的旧存档技能加载后默认 monomino 且正常运作（验证已有实现 + 绑定恢复流程）
4. **AC4: 存档保存/加载保持形状信息** — shapeId 和 rotation 字段在存档序列化/反序列化中不丢失
5. **AC5: 教程多格适配** — L1 商店引导在出现多格技能时追加放置提示文本
6. **AC6: 数值平衡观察记录** — 完成 3 轮通关测试，记录 Void/Resonance/Link/Splash/Amplify/ApprenticeNeighbor/Mirror 在多格技能场景下的触发频率和效果值，标注需调参项
7. **AC7: 无回归 bug** — 所有 40.1-40.10 测试套件零新回归

## Tasks / Subtasks

- [ ] Task 1: 修复 battle.ts Mirror 刷新多格 bug (AC: #1)
  - [ ] 1.1 在 Mirror 刷新循环中（battle.ts:1350-1371），使用 `getSkillKeys()` 获取所有占据键替代 `[boundKey]`
  - [ ] 1.2 `triggerKey` 使用 anchor key（`getSkillAnchorKey()`），`occupiedKeys` 使用完整键位列表
  - [ ] 1.3 添加单元测试验证多格 Mirror 刷新使用扩展邻居范围
- [ ] Task 2: 商店空间词条高亮多格适配 (AC: #2)
  - [ ] 2.1 定位商店中空间词条范围高亮逻辑（shop.ts 中 tooltip/hover 时高亮邻居键位的代码）
  - [ ] 2.2 将单键位邻居高亮改为使用 `getExtendedNeighbors(occupiedKeys)` 扩展范围
  - [ ] 2.3 验证高亮范围与实际触发范围一致
- [ ] Task 3: 存档兼容验证 (AC: #3, #4)
  - [ ] 3.1 确认 `deserializeSkill` 已有 `shapeId ?? 'monomino'` 和 `rotation ?? 0` 兜底（已实现于 affixTrigger.ts:1350-1351）
  - [ ] 3.2 确认 `serializeSkill` 已保存 shapeId/rotation（已实现于 affixTrigger.ts:1326-1327）
  - [ ] 3.3 验证绑定恢复流程：RunState.deserialize 中恢复 bindings 后，多格技能的所有占据键正确恢复
  - [ ] 3.4 添加单元测试：反序列化无 shapeId 的旧数据 → 默认 monomino
- [ ] Task 4: 教程多格适配 (AC: #5)
  - [ ] 4.1 在 L1 商店引导步骤中添加多格技能放置提示条件和文本
  - [ ] 4.2 确保提示仅在商店首次出现多格技能（非 monomino）时触发
- [ ] Task 5: 数值平衡测试与记录 (AC: #6)
  - [ ] 5.1 手动测试 3 轮通关，记录多格技能各词条触发数据
  - [ ] 5.2 根据测试结果标注需调参项（如 APPRENTICE_NEIGHBOR_GROWTH、valuePerStack 等）
  - [ ] 5.3 若发现明显失衡，执行数值微调并重新测试
- [ ] Task 6: 回归测试 (AC: #7)
  - [ ] 6.1 运行全部 Epic 40 相关测试套件，确认零新回归
  - [ ] 6.2 运行 affixTrigger / orchestrator / battle 等核心测试集

## Dev Notes

### 关键设计决策

**Bug 1: battle.ts Mirror 刷新使用单键位**

当前实现（battle.ts:1350-1371）：
```typescript
// Mirror 词条复制：每关结束时刷新
for (const [, skill] of state.affixSkills) {
  if (!skill.affixes.some(a => a.type === AffixType.Mirror)) continue;
  const rt = state.affixSkillStates.get(skill.id);
  if (!rt) continue;
  let boundKey: string | undefined;
  for (const [key, sid] of state.player.bindings) {
    if (sid === skill.id) { boundKey = key; break; }  // ← 只取第一个键
  }
  if (!boundKey) continue;
  rt.mirrorCopiedAffix = resolveMirrorCopy(skill, rt, {
    triggerKey: boundKey,
    occupiedKeys: [boundKey],  // ← Bug: 应为完整占据键列表
    ...
  });
}
```

**修复方案**：
```typescript
import { getSkillKeys, getSkillAnchorKey } from './bindingManager';
// ...
const bs = getBindingState(state);
const allKeys = getSkillKeys(bs, skill.id);
if (allKeys.length === 0) continue;
const anchorKey = getSkillAnchorKey(bs, skill.id) ?? allKeys[0];
rt.mirrorCopiedAffix = resolveMirrorCopy(skill, rt, {
  triggerKey: anchorKey,
  occupiedKeys: allKeys,
  // ...
});
```

**Bug 2: 商店空间词条高亮范围**

商店中选中/悬停带空间词条的已装备技能时，邻居高亮可能只基于单个键位计算，未使用多格技能的所有占据键。需定位具体高亮逻辑并适配。

**存档兼容已验证完成**：
- `deserializeSkill`（affixTrigger.ts:1350-1351）已有 `shapeId ?? 'monomino'` + `rotation ?? 0` 兜底
- `serializeSkill`（affixTrigger.ts:1326-1327）已保存 shapeId/rotation
- `autoBindSkill`（bindingManager.ts:158-190）已使用 `mapShapeToKeys` 支持多格自动绑定
- Task 3 主要是验证 + 补充测试覆盖，不需要新增生产代码

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/systems/battle.ts:1350-1371` | Mirror 刷新循环 | `occupiedKeys: [boundKey]` 单键位 bug | 是：改为完整占据键 |
| `src/src/systems/shop.ts` | 空间词条高亮逻辑 | 邻居高亮范围计算 | 是：适配多格 |
| `src/src/data/affixTrigger.ts:1350-1351` | `deserializeSkill` | `shapeId ?? 'monomino'` 兜底 | 否（已实现） |
| `src/src/data/affixTrigger.ts:1326-1327` | `serializeSkill` | 保存 shapeId/rotation | 否（已实现） |
| `src/src/systems/bindingManager.ts:158-190` | `autoBindSkill` | 多格自动绑定 | 否（已实现） |
| `src/src/data/affixes.ts:425-431` | `APPRENTICE_NEIGHBOR_GROWTH` | 成长速率常量 | 可能：取决于平衡测试 |
| `src/src/data/affixes.ts:267-275` | `BASE_VALUES` | 基础产出值 | 可能：取决于平衡测试 |
| `src/src/systems/tutorial/tutorialInit.ts` | L1 步骤定义 | 商店引导步骤 | 是：追加多格放置提示 |

### 约束

- **必修改**: `battle.ts`（Mirror 刷新 bug）、`shop.ts`（高亮适配）、教程文件
- **可能修改**: `affixes.ts`（数值常量，取决于平衡测试结果）
- **不修改**: `affixTrigger.ts`（触发逻辑在 40.8-40.10 已完成）、`bindingManager.ts`、`skillShapes.ts`、`keyboardTopology.ts`
- 所有改动必须对单格技能行为等价
- 数值调整需记录调参理由和前后对比数据

### Previous Story Intelligence

**Story 40.9（空间词条多格适配）关键实现：**
- Phase 2/5/6 全部空间逻辑已适配 `occupiedKeys: string[]` 模式
- 辅助函数 `countEmptySlots`/`sumNeighborAmplifyStacks`/`findWeakestNeighbor` 已接受数组参数
- `getExtendedNeighbors(occupiedKeys, posRel)` 已导出可复用
- 304 passed / 17 pre-existing failed（零新回归）

**Story 40.10（附魔系统多格适配）要点：**
- Phase 6 重构为"按技能分组遍历" + 双侧 any-match 空间判定
- 仅修改 `affixTrigger.ts`（resolvePhase6）

**Story 40.8（触发系统基础适配）关键 API：**
- `TriggerContext.occupiedKeys: string[]` — 必填字段
- `getSkillKeys(bs, skillId): string[]` — 返回技能所有占据键
- `getSkillAnchorKey(bs, skillId): string` — 返回锚点键

**编码惯例（从 40.8/40.9/40.10 提取）：**
- 纯函数导出 + 单元测试
- 已有测试基线：trigger-multi-cell.test.ts（31+ tests）
- Agent Model: Claude Opus 4.6
- Commit 格式：`feat: Story X.Y — 中文标题`

### Project Structure Notes

- 修改文件：`src/src/systems/battle.ts`（Mirror 刷新修复）、`src/src/systems/shop.ts`（高亮适配）、教程相关文件
- 可能修改：`src/src/data/affixes.ts`（数值常量）
- 扩展测试：现有测试套件 + 新增 Mirror 多格测试
- 不新增源码文件

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.11]
- [Source: src/src/systems/battle.ts#Mirror 刷新循环 (lines 1350-1371)]
- [Source: src/src/data/affixTrigger.ts#serializeSkill/deserializeSkill (lines 1313-1365)]
- [Source: src/src/systems/bindingManager.ts#autoBindSkill (lines 158-190)]
- [Source: docs/stories/40-9-spatial-affix-adaptation.md#Dev Agent Record]
- [Source: docs/stories/40-10-enchantment-topology-adaptation.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
