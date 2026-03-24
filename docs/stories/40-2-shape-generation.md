# Story 40.2: 技能生成时分配形状

Status: done

## Story

As a 玩家,
I want 生成技能时根据稀有度自动分配对应的 Polyomino 形状,
so that 技能的空间体积与词条数量直观对应，为后续键盘拼图布局奠定基础.

## Acceptance Criteria

1. **AC1: shapeId 与 rarity 正确对应** — `generateSkill()` 返回的技能 `shapeId` 满足：
   - rarity 0 → `'monomino'`
   - rarity 1 → `'domino'`
   - rarity 2 → `'triomino_I'` 或 `'triomino_L'`（随机）
   - rarity 3 → 7 种 tetromino 之一（随机）
2. **AC2: 形状随机分布均匀** — rarity 2 的两种 triomino 和 rarity 3 的 7 种 tetromino 在大量采样中分布近似均匀
3. **AC3: 初始旋转随机** — `rotation` 为 0~3 随机整数，分布均匀
4. **AC4: 存档兼容** — 已有技能无 `shapeId`/`rotation` 时，反序列化默认 `shapeId='monomino'`、`rotation=0`
5. **AC5: 序列化往返** — `serializeSkill` → `deserializeSkill` 往返后 `shapeId` / `rotation` 不丢失

## Tasks / Subtasks

- [x] Task 1: 修改 `generateSkill()` 分配形状 (AC: #1, #2, #3)
  - [x] 1.1 在 `skillGeneration.ts` 中导入 `RARITY_TO_SHAPE_POOL` from `./skillShapes`
  - [x] 1.2 在 `generateSkill()` return 对象中添加 `shapeId: pickRandom(RARITY_TO_SHAPE_POOL[rarity])`
  - [x] 1.3 在 `generateSkill()` return 对象中添加 `rotation: Math.floor(random() * 4)`
- [x] Task 2: 更新序列化/反序列化 (AC: #4, #5)
  - [x] 2.1 在 `affixTrigger.ts` 的 `serializeSkill()` 中添加 `shapeId` 和 `rotation` 字段复制
  - [x] 2.2 在 `affixTrigger.ts` 的 `deserializeSkill()` 中添加 `shapeId: data.shapeId ?? 'monomino'` 和 `rotation: data.rotation ?? 0`
  - [x] 2.3 确认 `migrateLoadedSkills()` 不需要额外补丁（optional 字段缺失时由 `deserializeSkill` 的 `??` 兜底）
- [x] Task 3: 扩展 `GenerateSkillOptions` (AC: #1)
  - [x] 3.1 在 `GenerateSkillOptions` 接口添加 `shapeId?: string` 和 `rotation?: number`（用于测试和特殊场景强制指定）
  - [x] 3.2 在 `generateSkill()` 中优先使用 `options?.shapeId` / `options?.rotation`（如已提供则跳过随机）
- [x] Task 4: 单元测试 (AC: #1~#5)
  - [x] 4.1 扩展 `skillGeneration.test.ts` 中 `generateSkill` 测试：验证返回对象包含 `shapeId` 和 `rotation`
  - [x] 4.2 测试 rarity→shapeId 映射正确性（每个 rarity 强制生成 N 个技能，验证 shapeId 在对应池内）
  - [x] 4.3 测试 rarity 2/3 形状分布均匀性（1000+ 样本，χ² 或比例近似）
  - [x] 4.4 测试 rotation 分布均匀性（0~3 各约 25%）
  - [x] 4.5 测试 `GenerateSkillOptions.shapeId` / `rotation` 强制覆盖
  - [x] 4.6 测试序列化往返：`serializeSkill` → `deserializeSkill` 保留 shapeId/rotation
  - [x] 4.7 测试存档兼容：构造无 shapeId/rotation 的 `AffixSkillSaveData`，`deserializeSkill` 默认 monomino/0

## Dev Notes

### 关键设计决策

**形状选择策略**：使用 `RARITY_TO_SHAPE_POOL[rarity]` + `pickRandom()` 即可完成形状分配。`RARITY_TO_SHAPE_POOL` 已在 Story 40.1 中定义：
- `0: ['monomino']`
- `1: ['domino']`
- `2: ['triomino_I', 'triomino_L']`
- `3: ['tetromino_T', 'tetromino_L', 'tetromino_J', 'tetromino_S', 'tetromino_Z', 'tetromino_I', 'tetromino_O']`

**旋转随机**：`Math.floor(random() * 4)` 生成 0~3 整数。使用项目的 `random()`（`seededRandom.ts`）确保种子可控。

**序列化注意**：当前 `serializeSkill()` 和 `deserializeSkill()` 未处理 `shapeId`/`rotation`。虽然字段在接口上已定义为 optional，但序列化函数是**显式逐字段复制**（非 spread），所以必须手动添加。

**存档兼容策略**：`deserializeSkill` 中用 `?? 'monomino'` / `?? 0` 兜底，`migrateLoadedSkills` 无需改动（它只处理更早期的旧系统技能迁移，不需要感知形状字段）。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 |
|------|------|----------|
| `src/src/data/skillGeneration.ts:254-288` | `generateSkill()` | 技能生成主函数，return 对象需增加 shapeId/rotation |
| `src/src/data/skillGeneration.ts:41-43` | `pickRandom()` | 随机选取工具函数 |
| `src/src/data/skillGeneration.ts:242-251` | `GenerateSkillOptions` | 生成选项接口，需扩展 |
| `src/src/data/skillShapes.ts:120-125` | `RARITY_TO_SHAPE_POOL` | 稀有度→形状池映射 |
| `src/src/data/affixTrigger.ts:1282-1296` | `serializeSkill()` | 序列化函数，逐字段复制，需添加 shapeId/rotation |
| `src/src/data/affixTrigger.ts:1301-1329` | `deserializeSkill()` | 反序列化函数，需添加 shapeId/rotation（含 `??` 默认值） |
| `src/src/data/affixTrigger.ts:1334-1360` | `migrateLoadedSkills()` | 旧存档迁移，**不需要修改** |
| `src/src/data/affixes.ts:215-230` | `AffixSkillInstance` | 已有 optional `shapeId`/`rotation` 字段 |
| `src/src/data/affixes.ts:248-261` | `AffixSkillSaveData` | 已有 optional `shapeId`/`rotation` 字段 |
| `src/src/core/seededRandom.ts` | `random()` | 种子随机数，测试中用 `setSeededMode(seed)` 控制 |

### 约束

- **不修改** `skillShapes.ts`（Story 40.1 已完成）
- **不修改** `affixes.ts` 接口定义（Story 40.1 已添加 shapeId/rotation 字段）
- **不修改** `bindings` 绑定逻辑（留给 Story 40.3）
- 随机数**必须**使用 `random()`（不是 `Math.random()`），确保种子可控
- 序列化函数的修改应保持**显式逐字段复制**风格，不引入 spread

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 测试文件：`src/tests/unit/data/skillGeneration.test.ts`（已有，追加测试）
- 种子随机：测试用 `setSeededMode(seed)` + `afterAll(() => setNormalMode())`
- 分布均匀性测试：采用 `toBeCloseTo` 或比例范围断言，N ≥ 1000

### Previous Story Intelligence

Story 40.1 实现笔记：
- `findClosestKeyInRow` 阈值从 `< 0.5` 改为 `> 0.75` 以适应 QWERTY stagger
- `getShapeCells` 返回浅拷贝避免模板污染
- 61 个测试全部通过，无回归
- Code review 发现并修复了 5 个问题（H1 可变引用、M1 JSDoc、M2 死代码、M3 弱断言、L1 冗余标准化）

### Project Structure Notes

- 修改文件：`src/src/data/skillGeneration.ts`、`src/src/data/affixTrigger.ts`
- 测试文件：`src/tests/unit/data/skillGeneration.test.ts`（追加）
- 不新增文件

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.2]
- [Source: src/src/data/skillGeneration.ts#generateSkill, GenerateSkillOptions]
- [Source: src/src/data/skillShapes.ts#RARITY_TO_SHAPE_POOL]
- [Source: src/src/data/affixTrigger.ts#serializeSkill, deserializeSkill]
- [Source: src/src/data/affixes.ts#AffixSkillInstance, AffixSkillSaveData]
- [Source: docs/stories/40-1-shape-data-model.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 无 debug 问题，一次通过

### Completion Notes List

- `generateSkill()` 新增 `shapeId` 和 `rotation` 字段，使用 `RARITY_TO_SHAPE_POOL[rarity]` + `pickRandom()` 分配形状，`Math.floor(random() * 4)` 分配旋转
- `GenerateSkillOptions` 新增 `shapeId?` 和 `rotation?` 可选覆盖字段
- `serializeSkill()` 新增 `shapeId` / `rotation` 字段复制
- `deserializeSkill()` 新增 `shapeId: data.shapeId ?? 'monomino'` / `rotation: data.rotation ?? 0` 存档兼容
- 新增 16 个测试（75 总计）：rarity→shape 映射、分布均匀性（rarity 2/3 + rotation）、强制覆盖、序列化往返、存档兼容
- 无回归：skillShapes (61), skillGeneration (75), serializeSkill/deserializeSkill (4) 全部通过
- 注：affixes.test.ts 和 affixTrigger.test.ts 有 20 个预存失败（EnchantmentType 计数、passive enchantment 回归），与本次修改无关

### Code Review Fixes (2026-03-24)

- **[M1]** `generateSkill` 增加 `options.shapeId` 合法性验证：无效 shapeId 回退到 rarity 池随机
- **[M2]** `generateSkill` 增加 `options.rotation` 范围归一化：`((rotation % 4) + 4) % 4`
- **[M3]** 更新现有 end-to-end 烟雾测试，增加 shapeId/rotation 字段校验
- **[L1]** 修复 pre-existing bug：`serializeSkill` 缺失 `neighborPosRel` 字段复制
- **[L2]** 测试用 `createSkillRuntimeState()` 替代手写 `makeRuntime` 工厂

### File List

- `src/src/data/skillGeneration.ts` (修改) — 导入 RARITY_TO_SHAPE_POOL + SHAPE_TEMPLATES，generateSkill 分配 shapeId/rotation（含验证），GenerateSkillOptions 扩展
- `src/src/data/affixTrigger.ts` (修改) — serializeSkill/deserializeSkill 增加 shapeId/rotation/neighborPosRel 字段
- `src/tests/unit/data/skillGeneration.test.ts` (修改) — 新增 16 个形状分配 + 序列化测试，更新 e2e 烟雾测试
