# Story 40.1: 形状数据模型

Status: done

## Story

As a 玩家,
I want 多词条技能在键盘上占据多个相连格子（Polyomino 形状）,
so that 技能稀有度有直观的空间体感，键盘布局增加空间拼图策略层。

## Acceptance Criteria

1. **AC1: 形状模板完整** — 所有 polyomino 形状模板定义完整，包含所有旋转态：
   - Monomino: 1 种，旋转不变
   - Domino: 1 种基本形状，2 个旋转态（横/竖）
   - Triomino: I 形 + L 形，各含 4 个旋转态（去重后各 2 个）
   - Tetromino: T/L/J/S/Z/I/O 标准 7 种，各含 1~4 个旋转态
2. **AC2: rotateShape** — `rotateShape(cells, times)` 正确返回 90° 顺时针旋转后的相对偏移
3. **AC3: mapShapeToKeys** — `mapShapeToKeys(anchorKey, shapeId, rotation)` 在 QWERTY 错位行布局上正确映射形状到键位，返回 `string[] | null`（null = 放不下）
4. **AC4: 形状合法性** — 所有模板的所有旋转态中，格子两两之间通过 `ADJACENT_KEYS` 可达
5. **AC5: 向下兼容** — 0 词条技能 `shapeId` 为 `'monomino'`，行为完全不变
6. **AC6: 单元测试** — 覆盖所有形状模板 × 所有旋转态的旋转正确性、键盘映射、合法性验证

## Tasks / Subtasks

- [x] Task 1: 定义形状数据结构与模板库 (AC: #1, #4)
  - [x] 1.1 创建 `src/src/data/skillShapes.ts`
  - [x] 1.2 定义 `ShapeTemplate` 接口：`{ id: string, cells: [number, number][], rotations: [number, number][][] }`
  - [x] 1.3 实现标准 polyomino 形状模板（含所有旋转态预计算）
  - [x] 1.4 导出 `SHAPE_TEMPLATES: Record<string, ShapeTemplate>` 和 `RARITY_TO_SHAPE_POOL: Record<SkillRarity, string[]>`
- [x] Task 2: 实现旋转函数 (AC: #2)
  - [x] 2.1 `rotateShape90(cells): [number, number][]` — 单次 90° 顺时针旋转
  - [x] 2.2 `rotateShape(cells, times): [number, number][]` — 旋转 N 次
  - [x] 2.3 旋转后偏移标准化（最小化到原点附近）
- [x] Task 3: 实现键盘映射函数 (AC: #3)
  - [x] 3.1 构建 QWERTY 键位坐标映射 `KEY_COORDS: Record<string, [number, number]>` 和 `COORD_TO_KEY: Record<string, string>`
  - [x] 3.2 处理 QWERTY 错位行偏移（top row 0 偏移, home row 0.25 偏移, bottom row 0.75 偏移）
  - [x] 3.3 `mapShapeToKeys(anchorKey, shapeId, rotation): string[] | null`
  - [x] 3.4 验证映射结果所有键位间 `ADJACENT_KEYS` 可达
- [x] Task 4: 扩展 AffixSkillInstance (AC: #5)
  - [x] 4.1 在 `AffixSkillInstance` 接口添加 `shapeId?: string` 和 `rotation?: number`
  - [x] 4.2 在 `AffixSkillSaveData` 接口同步添加
  - [x] 4.3 确保未设置时默认语义为 monomino（无需迁移逻辑，后续 Story 40.11 处理）
- [x] Task 5: 单元测试 (AC: #6)
  - [x] 5.1 测试所有旋转态计算
  - [x] 5.2 测试键盘映射（含边界情况：角落键、底行短行）
  - [x] 5.3 测试形状合法性（所有模板 × 所有旋转态的 ADJACENT_KEYS 连通性）
  - [x] 5.4 测试 mapShapeToKeys 返回 null 的边界情况

## Dev Notes

### 关键设计决策

**坐标系统**：使用离散 `[row, col]` 相对偏移表示形状，`[0,0]` 为锚点。

**QWERTY 错位行映射**：键盘三行有物理错位（stagger），不能简单用整数网格。推荐方案：
- 为每个键预计算实际 `[row, col]` 坐标（col 含行偏移）
- 形状偏移 `[dr, dc]` 从锚点出发查找目标坐标
- **关键**：由于错位，相邻关系以 `ADJACENT_KEYS` 为准，**不能**仅靠坐标差判断

**行偏移量参考**（QWERTY 标准）：
- Top row (q-p): col 偏移 0（基准）
- Home row (a-l): col 偏移 +0.25（右移约 1/4 键宽）
- Bottom row (z-m): col 偏移 +0.75（右移约 3/4 键宽）

**形状到键位映射策略**：
1. 获取锚点键的 `[row, col]` 坐标
2. 对形状每个 cell `[dr, dc]`，计算目标坐标 `[row+dr, col+dc]`
3. 在目标行中查找最近的键（考虑行偏移后的实际 col）
4. 验证所有结果键位间 `ADJACENT_KEYS` 连通
5. 任何一步失败 → 返回 null

**旋转标准化**：90° 顺时针旋转公式 `[r, c] → [c, -r]`，旋转后平移到正坐标。

### 形状模板参考

```
Monomino (rarity 0):  ■

Domino (rarity 1):    ■■  (横)  or  ■  (竖)
                                     ■

Triomino (rarity 2):
  I-shape: ■■■  (横)  or  ■  (竖)
                          ■
                          ■
  L-shape: ■■   ■    ■   ■■
           ■   ■■   ■■    ■

Tetromino (rarity 3):  标准7种 T/L/J/S/Z/I/O
  T: ■■■  ■   ■   ■■    (4 旋转态)
      ■   ■■  ■    ■
           ■
  L: ■■■  ■■  ■     ■   (4 旋转态)
    ■        ■   ■■■
             ■■
  ... 依此类推
```

### 现有代码关键引用

| 文件 | 用途 | 关键导出 |
|------|------|----------|
| `src/src/core/constants.ts:6-9` | 键盘行定义 | `KEYBOARD_ROWS`, `KEYS` |
| `src/src/core/constants.ts:24-56` | 相邻关系 | `ADJACENT_KEYS` |
| `src/src/data/keyboardTopology.ts:19-30` | 行列号映射 | `ROW_MAP`, `COLUMN_MAP` |
| `src/src/data/affixes.ts:215-228` | 技能实例接口 | `AffixSkillInstance` |
| `src/src/data/affixes.ts:248-258` | 存档数据接口 | `AffixSkillSaveData` |
| `src/src/data/affixes.ts:197` | 稀有度类型 | `SkillRarity` (0\|1\|2\|3) |
| `src/src/data/skillGeneration.ts:254-288` | 技能生成函数 | `generateSkill()` |

### 约束

- **不修改** `generateSkill()`（留给 Story 40.2）
- **不修改** `bindings` 逻辑（留给 Story 40.3）
- `shapeId` / `rotation` 在 `AffixSkillInstance` 上为 optional（向下兼容）
- 形状模板为**纯数据 + 纯函数**，无副作用，无状态
- 使用 `ADJACENT_KEYS` 做连通性验证，而非自己计算邻接关系
- 标点键（`;` `,` `.` `/`）纳入键位坐标但不改变形状定义
- 新文件 `skillShapes.ts` 放在 `src/src/data/` 目录下，与 `affixes.ts`、`keyboardTopology.ts` 同级

### 编码规范（参考现有代码）

- TypeScript strict，使用 `export` 显式导出
- 纯函数 + 常量导出模式（参考 `keyboardTopology.ts`）
- 命名：`UPPER_SNAKE` 常量、`camelCase` 函数、`PascalCase` 类型/接口
- 随机数使用 `random()`（从 `../core/seededRandom` 导入）— 本 Story 仅模板定义，不涉及随机
- 测试文件放在 `src/src/__tests__/` 或与源文件同目录下 `*.test.ts`

### Project Structure Notes

- 新增文件：`src/src/data/skillShapes.ts`（形状模板 + 旋转 + 映射函数）
- 修改文件：`src/src/data/affixes.ts`（AffixSkillInstance / AffixSkillSaveData 接口扩展）
- 测试文件：`src/src/data/skillShapes.test.ts` 或 `src/src/__tests__/skillShapes.test.ts`
- 不新增其他文件，不修改其他模块

### References

- [Source: docs/stories/epic-40-polyomino-skill-shape.md#Story 40.1]
- [Source: src/src/core/constants.ts#KEYBOARD_ROWS, ADJACENT_KEYS]
- [Source: src/src/data/keyboardTopology.ts#ROW_MAP, COLUMN_MAP, PositionRelation]
- [Source: src/src/data/affixes.ts#AffixSkillInstance, AffixSkillSaveData, SkillRarity]
- [Source: src/src/data/skillGeneration.ts#generateSkill]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 初始 `findClosestKeyInRow` 阈值 `< 0.5` 导致 home→bottom 行跨行映射失败（距离恰好 0.5），改为 `> 0.75` 并依赖 `ADJACENT_KEYS` 连通性检查兜底

### Completion Notes List

- 创建 `skillShapes.ts`：11 个形状模板（1 monomino + 1 domino + 2 triomino + 7 tetromino），旋转态自动计算去重
- `rotateShape90` / `rotateShape` / `normalizeCells`：纯函数旋转 + 标准化
- `mapShapeToKeys`：基于 QWERTY stagger 坐标系映射形状到键位，含 BFS 连通性验证
- `KEY_COORDS`：30 键（26 字母 + 4 标点）含行偏移的坐标表
- `AffixSkillInstance` / `AffixSkillSaveData` 新增 optional `shapeId` / `rotation` 字段
- 61 个测试全部通过，覆盖模板完整性、旋转态数量、旋转正确性、键盘映射、边界情况、连通性、向下兼容
- 无回归：现有 affixes.test.ts / skillGeneration.test.ts / keyboardTopology.test.ts 全部通过

### Code Review Fixes (2026-03-24)

- **[H1]** `getShapeCells` 返回浅拷贝而非内部引用，防止调用方污染模板数据
- **[M1]** 修正 `mapShapeToKeys` JSDoc：锚点对应 cells[0]（排序后最左上 cell），非固定 [0,0]
- **[M2]** 移除未使用的 `ROW_COL_TO_KEY` 死代码
- **[M3]** 强化 3 个弱边界测试：将 `if (result)` 静默通过改为明确断言
- **[L1]** `cellsEqual` 移除对已标准化数据的冗余 `normalizeCells` 调用

### File List

- `src/src/data/skillShapes.ts` (新增) — 形状模板、旋转函数、键盘映射
- `src/src/data/affixes.ts` (修改) — AffixSkillInstance / AffixSkillSaveData 增加 shapeId / rotation
- `src/tests/unit/data/skillShapes.test.ts` (新增) — 61 个单元测试
