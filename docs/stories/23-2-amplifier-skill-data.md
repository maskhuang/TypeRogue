# Story 23.2: 首批增幅者技能数据

Status: done

## Story

As a 玩家,
I want 商店中有多种增幅者技能可选（覆盖不同资源、位置关系和运算符）,
so that 我可以根据构筑策略选择加法型（稳定兜底）或乘法型（滚雪球爆发）增幅路线.

## Acceptance Criteria

1. `AMPLIFIERS` 常量中注册 8 个增幅者，覆盖 base/score/multiplier/time/shield 五种资源
2. 包含加法增幅者（至少 4 个）：每层为范围内技能 +N 的平坦增幅
3. 包含乘法增幅者（至少 3 个）：每层为范围内技能 ×N% 的百分比增幅
4. 覆盖至少 4 种不同的 PositionRelation（adjacent/sameRow/sameColumn/sameHand/symmetric 中选）
5. 每个增幅者有唯一的中文名称、唯一 emoji 图标、玩家可见描述
6. 所有 id 遵循 `amp_[resource]_[operator]_[relation]` 命名规范，与 key 一致
7. 数据定义为纯数据（无运行时逻辑依赖），`valuePerStack` 为 Lv1 基准值
8. 单元测试验证：8 个增幅者数据完整性（id 唯一、字段非空、id==key）+ isAmplifier 正向判定 + drawAmplifierPool 抽取

## Tasks / Subtasks

- [x] Task 1: 设计 8 个增幅者技能数据 (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 1.1 `data/amplifiers.ts` — 导入 `PositionRelation` 枚举值（数据条目需要引用）
  - [x] 1.2 `data/amplifiers.ts` — 填充 4-5 个加法增幅者（add operator）覆盖 base/mult/score/time/shield
  - [x] 1.3 `data/amplifiers.ts` — 填充 3 个乘法增幅者（multiply operator）覆盖 base/mult/score
  - [x] 1.4 验证 8 个增幅者覆盖至少 4 种 PositionRelation
- [x] Task 2: 更新单元测试 (AC: 8)
  - [x] 2.1 `tests/unit/data/amplifiers.test.ts` — 更新数据完整性测试：共 8 个增幅者
  - [x] 2.2 测试所有 id 唯一、id == key、字段非空
  - [x] 2.3 测试 isAmplifier 对真实 id 返回 true
  - [x] 2.4 测试 drawAmplifierPool 从 8 个中抽取正确数量
  - [x] 2.5 测试 getAmplifierValue 对真实数据等级缩放正确
  - [x] 2.6 测试 getAmplifierDesc 对 add/multiply 类型生成正确格式
  - [x] 2.7 移除 Story 23.1 中的临时 mock 注入测试（已有真实数据替代）

## Dev Notes

### 增幅者技能设计矩阵

**设计轴：**
- **资源** (5): base / score / multiplier / time / shield（gold 暂不设计）
- **运算符** (2): add（每层+N，前期稳定兜底）/ multiply（每层×N%，后期滚雪球爆发）
- **位置关系** (6): adjacent / sameRow / sameColumn / sameHand / sameFinger / symmetric

**运算符哲学：**
- `add` 增幅者：平坦 +N/层，30 层 = +30N，**前期发力型**（引擎预热）
- `multiply` 增幅者：百分比 ×N%/层，30 层 = ×(1+30N)，**后期爆发型**（飞轮效应）

**数值平衡参考（30 层叠层为设计中点）：**

| ID | 资源 | 运算符 | 位置 | valuePerStack | 30层效果 | 定位 |
|----|------|--------|------|--------------|---------|------|
| amp_base_add_adjacent | base | add | 相邻 | 1 | +30 base | 稳定基数提升 |
| amp_base_mul_adjacent | base | mul | 相邻 | 0.05 | ×250% base | 基数滚雪球 |
| amp_mult_add_adjacent | mult | add | 相邻 | 0.02 | +0.6 mult | 稳定倍率提升 |
| amp_mult_mul_sameRow | mult | mul | 同行 | 0.03 | ×190% mult | 同行倍率爆发 |
| amp_score_add_sameColumn | score | add | 同列 | 2 | +60 score | 同列分数堆叠 |
| amp_score_mul_sameHand | score | mul | 同手 | 0.04 | ×220% score | 同手分数爆发 |
| amp_time_add_adjacent | time | add | 相邻 | 0.05 | +1.5s time | 续命辅助 |
| amp_shield_add_symmetric | shield | add | 对称 | 0.02 | +0.6 shield | 对称防御 |

**图标选择（避开已用 emoji）：**

| ID | 名称 | 图标 | 已确认无冲突 |
|----|------|------|------------|
| amp_base_add_adjacent | 铸基 | 🔱 | ✓ |
| amp_base_mul_adjacent | 淬炼 | ⚗️ | ✓ |
| amp_mult_add_adjacent | 激励 | ✴️ | ✓ |
| amp_mult_mul_sameRow | 共振 | 🔊 | ✓ |
| amp_score_add_sameColumn | 聚财 | 🏹 | ✓ |
| amp_score_mul_sameHand | 点金 | 🪄 | ✓ |
| amp_time_add_adjacent | 滋润 | 🌊 | ✓ |
| amp_shield_add_symmetric | 映盾 | 🧿 | ✓ |

### 现有代码定位

| 文件 | 说明 |
|------|------|
| `src/src/data/amplifiers.ts` | 已有空 `AMPLIFIERS` 记录 + 工具函数（Story 23.1 创建），需填充数据 |
| `src/src/data/keyboardTopology.ts` | `PositionRelation` 枚举 — 需要值导入（非 type 导入）|
| `src/src/core/types.ts` | `AmplifierDefinition` 接口 — 已有，无需修改 |
| `src/tests/unit/data/amplifiers.test.ts` | 已有 24 个测试（含 mock 注入），需更新为真实数据测试 |
| `src/src/data/connectors.ts` | 参考数据条目格式（使用 `PositionRelation.Adjacent` 枚举值语法）|

### 描述格式

`getAmplifierDesc` 已在 23.1 中实现，生成格式为：
- add: `每层为范围内技能⚔️基数+1`
- multiply: `每层为范围内技能🔥倍率×5%`

`desc` 字段应为 Lv1 的静态描述（getAmplifierDesc 无 level 时返回）。

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `core/types.ts` | 接口已在 23.1 定义 |
| `core/state.ts` | 状态已在 23.1 初始化 |
| `data/skills.ts` | 聚合器已在 23.1 注册 |
| `systems/skills.ts` | 触发逻辑在 Story 23.3 |
| `systems/shop.ts` | 商店 UI 在 Story 23.5 |

### Project Structure Notes

- 修改 1 个文件：`src/src/data/amplifiers.ts`（填充 8 个数据条目 + 导入 PositionRelation）
- 更新 1 个测试文件：`src/tests/unit/data/amplifiers.test.ts`
- 纯数据变更，零运行时逻辑变更
- 依赖方向不变：`data → core`

### Previous Story Intelligence

Story 23.1 的 Code Review 修复：
- `getAmplifierDesc` 的 `!level` 已改为 `level == null`（level=0 不会短路）
- `drawAmplifierPool` 默认参数为 10
- 已有正向路径 mock 测试（注入临时数据）→ 本 story 应替换为真实数据测试

### References

- [Source: docs/epics.md#Story 23.2 — 首批增幅者技能数据]
- [Source: docs/brainstorming-session-2026-03-05.md#Section E+ — 增幅者设计矩阵]
- [Source: src/src/data/amplifiers.ts — Story 23.1 创建的空数据文件]
- [Source: src/src/data/connectors.ts — PositionRelation 枚举值引用模式]
- [Source: src/src/data/producers.ts — 数据条目格式参考]
- [Source: docs/stories/23-1-amplifier-data-structure.md — 前置 story 完成记录]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References

### Completion Notes List
- Task 1: 填充 8 个增幅者数据到 AMPLIFIERS 常量，添加 PositionRelation 枚举值导入
  - 5 个加法增幅者: 铸基🔱(base)、激励✴️(mult)、聚财🏹(score)、滋润🌊(time)、映盾🧿(shield)
  - 3 个乘法增幅者: 淬炼⚗️(base)、共振🔊(mult)、点金🪄(score)
  - 覆盖 5 种 PositionRelation: Adjacent, SameColumn, Symmetric, SameRow, SameHand
  - emoji 冲突修复: 🎯→🔱(与prod_crit冲突)、💫→✴️(与ench_splash冲突)、🧲→🔊(与ench_amplify冲突)
- Task 2: 重写测试文件，移除 mock 注入测试，替换为 34 个真实数据测试
  - 数据完整性: 8 个增幅者数量、id 唯一、id==key、字段非空、PositionRelation 覆盖、资源覆盖、名称/图标唯一
  - isAmplifier: 8 个真实 ID 正向判定 + 非增幅者负向判定
  - drawAmplifierPool: 抽取数量、不重复、默认参数、合法 ID
  - getAmplifierValue: 真实数据 Lv1/Lv2/Lv3 缩放 + 乘法增幅者验证
  - getAmplifierDesc: 真实数据 add/multiply 格式验证
- 回归测试: 2442/2447 通过，5 个失败均为预存 producer/converter 测试问题（与本 story 无关）

### File List
- `src/src/data/amplifiers.ts` — 填充 8 个增幅者数据 + 添加 PositionRelation 导入
- `src/tests/unit/data/amplifiers.test.ts` — 重写为 34 个真实数据测试（替代 24 个 mock 测试）
