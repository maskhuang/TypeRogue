---
title: "Story 19.3: 键盘拓扑与位置关系"
epic: "Epic 19: 技能体系重构"
story_key: "19-3-keyboard-topology"
status: "backlog"
created: "2026-03-03"
depends_on: []
---

# Story 19.3: 键盘拓扑与位置关系

## Story

作为一个 **开发者**，
我想要 **一个 KeyboardTopology 工具模块，能查询任意两个键位之间的 6 种位置关系**，
以便 **连接者和附魔系统可以基于位置关系触发效果，实现"键盘即棋盘"的核心设计**。

## Acceptance Criteria

- [ ] AC1: 定义 `PositionRelation` 枚举：`adjacent`(相邻), `sameRow`(同行), `sameColumn`(同列), `sameHand`(同手), `sameFinger`(同指), `symmetric`(对称位)
- [ ] AC2: `getRelation(keyA, keyB): PositionRelation[]` 返回两键之间所有成立的位置关系
- [ ] AC3: `getKeysWithRelation(key, relation): string[]` 返回与指定键有某种关系的所有键
- [ ] AC4: 相邻关系：基于 QWERTY 物理布局，上下左右 + 对角共 8 方向
- [ ] AC5: 同行/同列：QWERTY 三行（Q行/A行/Z行），列按物理位置对齐
- [ ] AC6: 同手：左手 = QWERTASDFGZXCVB，右手 = YUIOPHJKLNM
- [ ] AC7: 同指：基于标准指法分配（如左手食指 = R/T/F/G/V/B）
- [ ] AC8: 对称位：Q↔P, W↔O, E↔I, R↔U, T↔Y, A↔;, S↔L, D↔K, F↔J, G↔H, Z↔/, X↔., C↔,, V↔M, B↔N
- [ ] AC9: 单元测试覆盖所有 6 种关系的正向/反向查询
- [ ] AC10: 可复用现有 `keyboardAdjacency.ts` 的邻接数据

## Tasks / Subtasks

- [ ] Task 1: 数据定义 (AC: 1, 4-8)
  - [ ] 1.1 定义 `PositionRelation` 枚举
  - [ ] 1.2 定义 QWERTY 物理布局坐标 `KEY_POSITIONS: Record<string, {row, col}>`
  - [ ] 1.3 定义手指分配表 `FINGER_MAP: Record<string, number>`（0-9 对应 10 根手指）
  - [ ] 1.4 定义对称位映射表 `SYMMETRIC_MAP: Record<string, string>`

- [ ] Task 2: 核心查询 API (AC: 2, 3)
  - [ ] 2.1 实现 `getRelation(keyA, keyB)` — 返回所有成立的关系
  - [ ] 2.2 实现 `getKeysWithRelation(key, relation)` — 批量查询
  - [ ] 2.3 实现 `hasRelation(keyA, keyB, relation)` — 单关系检查

- [ ] Task 3: 关系计算逻辑 (AC: 4-8)
  - [ ] 3.1 `isAdjacent`: 坐标差 ≤1 且 ≠ 自身（考虑行偏移）
  - [ ] 3.2 `isSameRow`: row 相同
  - [ ] 3.3 `isSameColumn`: col 相同（考虑 QWERTY 行偏移）
  - [ ] 3.4 `isSameHand`: 查手指分配，同侧
  - [ ] 3.5 `isSameFinger`: finger 编号相同
  - [ ] 3.6 `isSymmetric`: 查对称映射表

- [ ] Task 4: 测试 (AC: 9, 10)
  - [ ] 4.1 每种关系的正向和反向测试
  - [ ] 4.2 边界情况：同一个键与自身、非字母键
  - [ ] 4.3 `getKeysWithRelation` 返回集合完整性
  - [ ] 4.4 与现有 `keyboardAdjacency.ts` 邻接数据一致性校验

## Dev Notes

### QWERTY 布局坐标

```
Row 0: Q(0,0) W(0,1) E(0,2) R(0,3) T(0,4) Y(0,5) U(0,6) I(0,7) O(0,8) P(0,9)
Row 1: A(1,0) S(1,1) D(1,2) F(1,3) G(1,4) H(1,5) J(1,6) K(1,7) L(1,8)
Row 2: Z(2,0) X(2,1) C(2,2) V(2,3) B(2,4) N(2,5) M(2,6)
```

注意：QWERTY 各行有物理偏移，列对齐需考虑 offset（A行偏移约 +0.25，Z行偏移约 +0.5）。

### 标准十指指法

| 手指 | 按键 |
|------|------|
| 左小指 | Q, A, Z |
| 左无名指 | W, S, X |
| 左中指 | E, D, C |
| 左食指 | R, T, F, G, V, B |
| 右食指 | Y, U, H, J, N, M |
| 右中指 | I, K, , |
| 右无名指 | O, L, . |
| 右小指 | P, ;, / |

### 设计文档参考

`docs/brainstorming-session-2026-03-03.md` — 连接者 6 种位置关系定义
