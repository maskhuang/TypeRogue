# Story 19.3: 键盘拓扑与位置关系

Status: done

## Story

作为一个 **开发者**，
我想要 **一个 KeyboardTopology 工具模块，能查询任意两个键位之间的 6 种位置关系**，
以便 **连接者（19.5）和附魔系统（19.6）可以基于位置关系触发效果，实现"键盘即棋盘"的核心设计**。

## Acceptance Criteria

1. 定义 `PositionRelation` 枚举：`adjacent`(相邻), `sameRow`(同行), `sameColumn`(同列), `sameHand`(同手), `sameFinger`(同指), `symmetric`(对称位)
2. `getRelations(keyA, keyB): PositionRelation[]` 返回两键之间所有成立的位置关系
3. `getKeysWithRelation(key, relation): string[]` 返回与指定键有某种关系的所有键
4. 相邻关系：复用 `ADJACENT_KEYS`（`core/constants.ts`），基于 QWERTY 物理布局 8 方向
5. 同行/同列：QWERTY 三行（Q行/A行/Z行），列按逻辑索引对齐（Q-A-Z 同列 0，W-S-X 同列 1…）
6. 同手：左手 = QWERTASDFGZXCVB（15键），右手 = YUIOPHJKLNM（11键）
7. 同指：基于标准十指指法分配（左食指 = R/T/F/G/V/B，右食指 = Y/U/H/J/N/M，等）
8. 对称位：键盘水平镜像轴。26 字母键中 11 对：Q↔P, W↔O, E↔I, R↔U, T↔Y, S↔L, D↔K, F↔J, G↔H, V↔M, B↔N。A/Z/X/C 无对称位（对应非字母键）
9. 单元测试覆盖所有 6 种关系的正向/反向查询
10. 复用现有 `ADJACENT_KEYS`（`core/constants.ts`）的邻接数据，不重新定义

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: 1, 4-8)
  - [x] 1.1 定义 `PositionRelation` 枚举（6 个值）
  - [x] 1.2 定义 `COLUMN_MAP: Record<string, number>` — 每个键的逻辑列号
  - [x] 1.3 定义 `FINGER_MAP: Record<string, number>` — 每个键的手指编号（0-7，8 根手指）
  - [x] 1.4 定义 `HAND_MAP: Record<string, 'left' | 'right'>` — 每个键的手分配
  - [x] 1.5 定义 `SYMMETRIC_PAIRS: Record<string, string>` — 11 对对称映射（双向）

- [x] Task 2: 核心查询 API (AC: 2, 3)
  - [x] 2.1 实现 `getRelations(keyA, keyB): PositionRelation[]` — 返回所有成立的关系
  - [x] 2.2 实现 `getKeysWithRelation(key, relation): string[]` — 批量查询
  - [x] 2.3 实现 `hasRelation(keyA, keyB, relation): boolean` — 单关系检查

- [x] Task 3: 关系计算逻辑 (AC: 4-8, 10)
  - [x] 3.1 `isAdjacent`: 查 `ADJACENT_KEYS[keyA].includes(keyB)`
  - [x] 3.2 `isSameRow`: 查 `KEYBOARD_ROWS` 找到同行（通过 ROW_MAP）
  - [x] 3.3 `isSameColumn`: 查 `COLUMN_MAP[keyA] === COLUMN_MAP[keyB]`
  - [x] 3.4 `isSameHand`: 查 `HAND_MAP[keyA] === HAND_MAP[keyB]`
  - [x] 3.5 `isSameFinger`: 查 `FINGER_MAP[keyA] === FINGER_MAP[keyB]`
  - [x] 3.6 `isSymmetric`: 查 `SYMMETRIC_PAIRS[keyA] === keyB`

- [x] Task 4: 测试 (AC: 9)
  - [x] 4.1 每种关系正向和反向测试（对称性：A相邻B → B相邻A）
  - [x] 4.2 边界情况：同一个键与自身、无效键
  - [x] 4.3 `getKeysWithRelation` 返回集合完整性
  - [x] 4.4 与现有 `ADJACENT_KEYS` 一致性校验
  - [x] 4.5 对称位：有对称位的键（11对）和无对称位的键（A/Z/X/C）

## Dev Notes

### 新文件位置

`src/data/keyboardTopology.ts` — 纯数据 + 查询函数，零游戏逻辑依赖，可被任何层导入。

符合架构规范：`data/` = 纯数据定义，零依赖，可被任何层导入。[Source: docs/game-architecture.md#Architectural Boundaries]

### 必须复用的现有代码

| 现有代码 | 位置 | 用途 |
|---|---|---|
| `ADJACENT_KEYS` | `src/core/constants.ts:14-42` | 26 键邻接表（8 方向），直接 import 用于 `isAdjacent` |
| `KEYBOARD_ROWS` | `src/core/constants.ts:6-10` | 3 行字母数组，用于 `isSameRow` |
| `KEYS` | `src/core/constants.ts:12` | 26 键扁平数组，用于遍历 |

**不要重新定义邻接数据！** `ADJACENT_KEYS` 已经定义了完整的 8 方向邻接关系，直接导入使用。

**不要修改 `AdjacencyMap.ts`。** 现有 `AdjacencyMap` 类在 `systems/skills/passive/` 中供被动技能使用，本 Story 不需要修改它。后续 Story 可以让 `AdjacencyMap` 委托给新的 topology 模块，但不在本 Story 范围内。

### 6 种位置关系数据定义

#### 1. 同行 (sameRow)
直接用 `KEYBOARD_ROWS`：
```
Row 0 (Q行): q, w, e, r, t, y, u, i, o, p (10键)
Row 1 (A行): a, s, d, f, g, h, j, k, l (9键)
Row 2 (Z行): z, x, c, v, b, n, m (7键)
```

#### 2. 同列 (sameColumn) — 逻辑列，非物理位置
```
Col 0: q, a, z    Col 5: y, h, n
Col 1: w, s, x    Col 6: u, j, m
Col 2: e, d, c    Col 7: i, k
Col 3: r, f, v    Col 8: o, l
Col 4: t, g, b    Col 9: p
```
列号 = 键在其所在行内的索引。Row 1 只有 9 键（col 0-8），Row 2 只有 7 键（col 0-6），所以 col 7+ 的列不含 Row 2 的键，col 9 只有 P 一个键。

这里**不考虑物理偏移**（ROW_OFFSETS），按逻辑索引对齐。这与 brainstorming 文档的 "Q-A-Z, W-S-X 等垂直关系" 定义一致。[Source: docs/brainstorming-session-2026-03-03.md#位置关系]

#### 3. 同手 (sameHand)
```
左手 (left): q, w, e, r, t, a, s, d, f, g, z, x, c, v, b  (15键)
右手 (right): y, u, i, o, p, h, j, k, l, n, m  (11键)
```
[Source: AC6, docs/brainstorming-session-2026-03-03.md]

#### 4. 同指 (sameFinger) — 标准十指指法
```
Finger 0 (左小指): q, a, z
Finger 1 (左无名指): w, s, x
Finger 2 (左中指): e, d, c
Finger 3 (左食指): r, t, f, g, v, b  ← 6键（跨2列）
Finger 4 (右食指): y, u, h, j, n, m  ← 6键（跨2列）
Finger 5 (右中指): i, k
Finger 6 (右无名指): o, l
Finger 7 (右小指): p
```
[Source: Story 19.3 backlog, docs/brainstorming-session-2026-03-03.md]

注意：食指管 6 键（2 列 × 3 行），其他手指管 2-3 键。P 键是 finger 7 唯一的键，所以 `sameFinger` 对 P 不会返回任何其他键。

#### 5. 对称位 (symmetric) — 键盘水平镜像
11 对（双向映射）：
```
q ↔ p    s ↔ l    v ↔ m
w ↔ o    d ↔ k    b ↔ n
e ↔ i    f ↔ j
r ↔ u    g ↔ h
t ↔ y
```
无对称位的 4 个键：`a`, `z`, `x`, `c`（它们的对称位对应非字母键 `;`, `/`, `.`, `,`）

### 实现参考

```typescript
// src/data/keyboardTopology.ts

import { ADJACENT_KEYS, KEYBOARD_ROWS, KEYS } from '../core/constants';

export enum PositionRelation {
  Adjacent = 'adjacent',
  SameRow = 'sameRow',
  SameColumn = 'sameColumn',
  SameHand = 'sameHand',
  SameFinger = 'sameFinger',
  Symmetric = 'symmetric',
}

// 逻辑列号：键在其行内的索引
export const COLUMN_MAP: Record<string, number> = {};
// 由 KEYBOARD_ROWS 动态生成：
// KEYBOARD_ROWS.forEach(row => row.forEach((key, col) => COLUMN_MAP[key] = col));

export const HAND_MAP: Record<string, 'left' | 'right'> = {
  q: 'left', w: 'left', e: 'left', r: 'left', t: 'left',
  a: 'left', s: 'left', d: 'left', f: 'left', g: 'left',
  z: 'left', x: 'left', c: 'left', v: 'left', b: 'left',
  y: 'right', u: 'right', i: 'right', o: 'right', p: 'right',
  h: 'right', j: 'right', k: 'right', l: 'right',
  n: 'right', m: 'right',
};

export const FINGER_MAP: Record<string, number> = {
  q: 0, a: 0, z: 0,           // 左小指
  w: 1, s: 1, x: 1,           // 左无名指
  e: 2, d: 2, c: 2,           // 左中指
  r: 3, t: 3, f: 3, g: 3, v: 3, b: 3, // 左食指
  y: 4, u: 4, h: 4, j: 4, n: 4, m: 4, // 右食指
  i: 5, k: 5,                 // 右中指
  o: 6, l: 6,                 // 右无名指
  p: 7,                       // 右小指
};

export const SYMMETRIC_PAIRS: Record<string, string> = {
  q: 'p', p: 'q', w: 'o', o: 'w', e: 'i', i: 'e',
  r: 'u', u: 'r', t: 'y', y: 't',
  s: 'l', l: 's', d: 'k', k: 'd', f: 'j', j: 'f', g: 'h', h: 'g',
  v: 'm', m: 'v', b: 'n', n: 'b',
  // a, z, x, c: 无对称位（不在此 map 中）
};

// 核心查询 API
export function hasRelation(keyA: string, keyB: string, relation: PositionRelation): boolean { ... }
export function getRelations(keyA: string, keyB: string): PositionRelation[] { ... }
export function getKeysWithRelation(key: string, relation: PositionRelation): string[] { ... }
```

### 性能考虑

- `getKeysWithRelation` 对 `sameHand` 可能返回 14 个键（同手 15 键 - 自身），对 `sameFinger` 可能返回 5 个键（食指组）。这些数量极小，无需缓存。
- 所有查询都是 O(26) 或更优（map lookup），无性能风险。
- 如果后续需要优化，可以预计算 `relation → key → keys[]` 查找表，但当前不需要。

### 键大小写约定

所有键使用**小写字母**（`'a'`-`'z'`），与现有 `ADJACENT_KEYS`、`KEYBOARD_ROWS`、`KEYS` 一致。输入应在函数内 `.toLowerCase()` 规范化。

### 此模块的消费者（后续 Story）

| Story | 用途 |
|---|---|
| 19.5 连接者 | `getKeysWithRelation(triggerKey, relation)` 找到要自动触发的技能位置 |
| 19.6 附魔 | 增幅型：计数位置关系内的技能数量。共鸣型：检查触发者与自身的关系。排斥型：计数空位 |
| 19.7 战斗 UI | 可选：高亮位置关系范围 |

### 不在本 Story 范围

- 不修改 `AdjacencyMap.ts`（被动技能系统）
- 不修改 `KeyboardVisualizer.ts`（UI 层）
- 不实现连接者/附魔逻辑（19.5/19.6）
- 不修改任何现有技能的触发逻辑

### 前序 Story 经验

**Story 19.2 关键经验：**
1. **PRODUCERS fallback 模式**：在多处需要 `SKILLS[id] || PRODUCERS[id]` 兼容。本 Story 是纯工具模块，不涉及此问题。
2. **测试 `document` mock**：涉及 DOM 的测试需要 `vi.stubGlobal('document', ...)`。本 Story 是纯数据查询，不涉及 DOM。
3. **pre-existing 测试失败**：当前有 21 个不相关的预存失败（lone/void/evolution）。确保新测试全部通过即可，不需要修复这些。
4. **Git commit 模式**：Story 完成后 commit + push，然后 code-review。

### 文件修改清单

| 文件 | 修改内容 |
|---|---|
| `src/data/keyboardTopology.ts` | **新建** — PositionRelation 枚举 + 6 种关系数据表 + 3 个查询 API |
| `tests/unit/data/keyboardTopology.test.ts` | **新建** — 6 种关系正向/反向测试 + 边界情况 + ADJACENT_KEYS 一致性 |

### Project Structure Notes

- 新文件 `src/data/keyboardTopology.ts` 放在 data 层（纯数据 + 查询，零逻辑依赖）
- 测试放在 `tests/unit/data/`
- 依赖方向：仅导入 `core/constants.ts`（data ← core 方向合规）
- 不创建新的目录结构

### References

- [Source: docs/brainstorming-session-2026-03-03.md#位置关系] — 6 种位置关系定义（权威）
- [Source: docs/brainstorming-session-2026-03-03.md#连接者] — 36 个连接者按位置关系分类
- [Source: docs/brainstorming-session-2026-03-03.md#附魔系统] — 24 个空间附魔按位置关系分类
- [Source: docs/stories/epic-19-skill-system-redesign.md] — Epic 概览，19.3 无依赖
- [Source: docs/stories/19-2-producer-skills.md] — 前序 Story 经验
- [Source: docs/game-architecture.md#Code Organization] — data 层 = 纯数据定义，零依赖
- [Source: src/core/constants.ts:6-42] — KEYBOARD_ROWS, KEYS, ADJACENT_KEYS

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- PositionRelation 枚举定义 6 种位置关系
- 5 个数据映射表：COLUMN_MAP（从 KEYBOARD_ROWS 动态生成，Object.freeze）、ROW_MAP（辅助常量，同样 freeze）、HAND_MAP（15左/11右）、FINGER_MAP（8 根手指 0-7）、SYMMETRIC_PAIRS（11 对双向）
- 6 个关系判定函数：isAdjacent（复用 ADJACENT_KEYS）、isSameRow、isSameColumn、isSameHand、isSameFinger、isSymmetric
- 3 个核心查询 API：hasRelation、getRelations、getKeysWithRelation
- RELATION_CHECKERS 映射表统一分发，避免 switch/if-else
- 所有函数支持大小写不敏感输入（normalize）
- 所有关系排除自身（a ≠ b）
- 65 个测试全部通过，覆盖全部 6 种关系 + 边界情况 + ADJACENT_KEYS 一致性 + 全键对称性验证
- 21 个预存失败不相关（lone/void/evolution）

### File List

- `src/src/data/keyboardTopology.ts` (new)
- `src/tests/unit/data/keyboardTopology.test.ts` (new)
