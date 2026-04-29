# Story 60.6: inbox + bindings 存档序列化

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.2（接主流程必备）· P2.2 第 2 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **跑团进行中保留终端商店购入物的玩家**,
I want **下一关进入 IN-tray 待装配清单不会"刷新就消失"，存档加载回来后 inbox + bindings + 已购技能都还在**,
so that **terminal 商店的购买体验真正有"持久化"语感（不像 Phase 1 hash-route 预览那样关页面就归零），且老存档（无 inbox 字段）加载到新代码不崩溃**.

## 背景

P2.2 第 1 项（60-5）让 `openShop()` 通过 feature flag 派发到 terminal 商店；玩家可以正式入口走 terminal 流程购入技能、把物品堆进 IN-tray。但 **`state.player.inbox` 目前不在 `RunState.serialize()` 输出中** —— 任何依赖 RunState 序列化的存档/恢复路径（包括未来 Phase 3 的断点续玩）都会丢 inbox。

P2.2 第 2 项：把 `inbox` 字段加到 `RunStateData` + serialize/deserialize 全套，**保留向后兼容**（老存档读出 inbox 默认空数组），并对 IN-tray 中已删除/已弃用 skillId 做过滤兜底（参考 `bindings` / `skills` 现有 `DELETED_SKILL_IDS` 过滤）。

完成后 `RunState` 的快照已经能完整代表"玩家持久态"，60-7（事件总线 + bindingManager 接口闭合）和 60-8（教程改写）可以基于稳定快照做断点测试。

## Acceptance Criteria

1. **AC1：RunStateData 加 inbox 字段** —— `core/state/RunState.ts` 的 `RunStateData` 接口新增 `inbox: string[]`；`createInitialState()` 初始化 `inbox: []`。

2. **AC2：serialize 输出 inbox** —— `RunState.serialize()` 返回值含 `inbox: [...this.data.inbox]`（防引用泄漏，参考 skills/relics 现有写法）。

3. **AC3：deserialize 兼容老存档** —— `RunState.deserialize()` 读取 `inbox: (parsed as any).inbox || []`；老存档（无 inbox 字段）→ 回落空数组，**绝不抛错**。沿用 `relicStates` / `wordDeck` 等字段的兼容写法。

4. **AC4：deserialize 过滤已删除技能** —— inbox 中的 skillId 如果命中 `DELETED_SKILL_IDS` 或 `DELETED_EVOLUTION_IDS`，反序列化时静默丢弃（与 skills/bindings 反序列化一致）。

5. **AC5：state.player.inbox 与 RunStateData.inbox 概念对齐** —— `state.player.inbox` 是运行时 source-of-truth（`core/state.ts:89` 已存在），`RunStateData.inbox` 作为持久化镜像；本 story **不引入主动 sync hook**（因为现有 RunState save/load 路径在游戏内未被激活；属未来 Phase 3 的 SaveManager 接入范围），但要保证：
   - `RunState.deserialize` 出的 `inbox` 字段格式（`string[]`）与 `state.player.inbox` 完全一致 —— 一旦 SaveManager 激活，可以无缝赋值
   - 不修改 `state.player.inbox` 的现有读写路径（shopPreview.ts / shapePreview.ts 中所有 `state.player.inbox.push/splice` 不动）

6. **AC6：RunState 单测全部通过** —— 现有 `tests/unit/core/state/RunState.test.ts` ~30+ 测试用例 0 退化；新增以下用例：
   - `serialize() 应包含 inbox 字段（默认空数组）`
   - `serialize() 应保留 inbox 中的 skillId 顺序`（push 顺序 = 数组顺序）
   - `deserialize() 老存档（无 inbox 字段）→ inbox 为空数组`
   - `deserialize() 完整存档 → inbox 内容正确还原`
   - `deserialize() inbox 中已删除技能 ID 被过滤`（`DELETED_SKILL_IDS` 命中）
   - `serialize → JSON.parse → deserialize 往返：inbox 内容一致`

7. **AC7：现有 RunState.test.ts 兼容（0 破坏）** —— 现有"空状态序列化/反序列化"等用例继续通过；只追加 inbox 检查，不改原断言。

8. **AC8：DELETED_SKILL_IDS 过滤路径单测覆盖** —— 模拟存档中 inbox = `['skill_a', 'deleted_legacy_skill_xyz', 'skill_b']`，`DELETED_SKILL_IDS` 含 `'deleted_legacy_skill_xyz'` → 反序列化后 inbox = `['skill_a', 'skill_b']`，长度 2，顺序保留。

9. **AC9：新存档可被老代码读（前向兼容）** —— `serialize()` 加 inbox 字段不破坏 ReturnType 推断或 JSON 结构；老代码（不识别 inbox 字段）忽略额外字段（JSON 天然支持，仅需验证不抛错）。本 AC 通过单测：构造序列化输出、`JSON.stringify → JSON.parse` 后剥掉 inbox 字段重新走 deserialize 应等价于老存档路径。

10. **AC10：tsc 0 新错误** —— shop.ts baseline 41 个 TS6133 unused-import 错误是历史包袱，本 story 不引入新错误；`npm run typecheck` 在改动后保持。

## Tasks / Subtasks

- [x] **Task 1：RunStateData 接口扩展（AC: 1）**
  - [x] 1.1 `core/state/RunState.ts` 的 `RunStateData` interface 加 `inbox: string[]` 字段（建议放在 `wordDeck` 后、`affixSkills` 前，逻辑相关）
  - [x] 1.2 在字段上加 JSDoc：`/** IN-tray: 终端商店购入待装配的 skillId 列表（与 state.player.inbox 镜像；上限 INBOX_MAX = 9） */`
  - [x] 1.3 `createInitialState()` 初始化 `inbox: []`

- [x] **Task 2：serialize 输出（AC: 2）**
  - [x] 2.1 在 `RunState.serialize()` 返回对象里加 `inbox: [...this.data.inbox]`（位置与 wordDeck 相邻，便于 review）

- [x] **Task 3：deserialize 兼容（AC: 3, 4）**
  - [x] 3.1 在 `RunState.deserialize()` 末尾加：
    ```ts
    const rawInbox: string[] = (parsed as any).inbox || []
    runState.data.inbox = rawInbox.filter(id =>
      !DELETED_SKILL_IDS.includes(id) && !DELETED_EVOLUTION_IDS.includes(id)
    )
    ```
  - [x] 3.2 验证 import 路径正确：`DELETED_SKILL_IDS` / `DELETED_EVOLUTION_IDS` 已经在文件顶部 import（`from '../../data/skills'`），无需新增

- [x] **Task 4：单元测试（AC: 6, 7, 8, 9）**
  - [x] 4.1 在 `tests/unit/core/state/RunState.test.ts` 现有 `describe('序列化', ...)` 内追加新用例（不动现有用例）：
    - `it('serialize() 应包含 inbox 字段（默认空）', ...)` — 新建 RunState、serialize、断言 `parsed.inbox` 为 `[]`
    - `it('serialize() 应保留 inbox 顺序', ...)` — 手动 `runState['data'].inbox = ['s1', 's2', 's3']`、serialize → 断言数组顺序
    - `it('deserialize() 无 inbox 字段（老存档）→ 空数组', ...)` — 构造无 inbox 的 fakeData → restored.getState().inbox = []
    - `it('deserialize() 完整存档 inbox 正确还原', ...)` — serialize → JSON 往返 → deserialize → 断言 inbox 数组相同
    - `it('deserialize() inbox 中已删除技能被过滤', ...)` — 用 `vi.mock('../../data/skills', ...)` mock `DELETED_SKILL_IDS = ['legacy_x']`；构造 inbox = `['s1', 'legacy_x', 's2']` → restored.inbox = `['s1', 's2']`
    - `it('inbox 序列化/反序列化往返一致', ...)` — 全程 serialize → JSON.stringify → JSON.parse → deserialize → 断言 inbox 内容相同
  - [x] 4.2 现有"空状态序列化/反序列化"用例：补一行 `expect(restored.getState().inbox).toEqual([])`（不破坏现有断言）
  - [x] 4.3 不需要新建独立 test 文件 —— 全部追加到现有 `RunState.test.ts`，与 collectedWords / wordDeck 等同模式

- [x] **Task 5：边界测试（AC: 5）**
  - [x] 5.1 单元测试：`getState().inbox` 字段类型 `string[]`，与 `state.player.inbox` 类型一致 —— 一行 typeof 断言确认形状
  - [x] 5.2 不写 sync hook（明确 out-of-scope；放进 `Dev Notes > Risks` 段说明）

- [x] **Task 6：tsc + 全套测试**
  - [x] 6.1 `cd src && npx tsc --noEmit` → 0 新错误（baseline 41 不动）
  - [x] 6.2 `cd src && npx vitest run tests/unit/core/state/RunState.test.ts` → 全绿（含新用例）
  - [x] 6.3 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher` → Story 60.x ecosystem 81/81 不退

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| RunState 持久化 | `src/src/core/state/RunState.ts` | `class RunState` · `RunStateData` interface · `serialize()` · `static deserialize()` · `createInitialState()` |
| 已删除技能名单 | `src/src/data/skills.ts` | `DELETED_SKILL_IDS` · `DELETED_EVOLUTION_IDS` |
| 运行时 inbox state | `src/src/core/state.ts:89` | `state.player.inbox: string[]` |
| 现有 RunState 测试 | `src/tests/unit/core/state/RunState.test.ts` | `describe('序列化', ...)` 30+ 用例 |
| inbox 上限常量 | `src/src/ui/shopPreview.ts` | `INBOX_MAX = 9` （已在 shopPreview 内 const，**不需要**为本 story 提取到 constants.ts） |

### Architecture Compliance

**Dependency direction：**
- `core/state/RunState.ts` 是 core 层，本 story 仅在 core 内部加字段 + 测试，不引入新的跨层依赖 ✓
- `DELETED_SKILL_IDS` 已 import 自 `data/skills`（core 可读 data 是允许的） ✓

**State write rules：**
- ✅ inbox 数组用 `[...this.data.inbox]` spread 写入序列化输出（防引用泄漏 — 与 `bossModifierPool` / `wordDeck` 等同模式）
- ✅ 反序列化用 `(parsed as any).inbox || []` 兜底缺字段
- ✅ 反序列化时过滤 DELETED_*_IDS（与 skills/bindings 反序列化一致）
- ✅ 不在本 story 引入 state ↔ runState 双向 sync —— 等 Phase 3 SaveManager 激活路径再做

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** (`vi.mock` for DELETED_SKILL_IDS mock)
- **零新依赖**

### File Structure Requirements

```
src/src/core/state/RunState.ts           ← 修改：RunStateData + createInitialState + serialize + deserialize
src/tests/unit/core/state/RunState.test.ts ← 修改：序列化 describe 块内追加 6 用例（不动现有用例）

不需要新建独立测试文件
```

**避免：**
- 不要在 shopPreview.ts / shapePreview.ts 改 inbox push/splice 路径 — 那是运行时 state，本 story 只动持久化层
- 不要新建 `state.player.inbox ↔ runState.inbox` 同步 hook — 本 story 不接 SaveManager
- 不要把 INBOX_MAX 常量从 shopPreview.ts 提到 constants.ts —— 当前没有第二个消费者
- 不要碰 `parsed as any` 这个老存档兼容模式 —— 与现有 wordDeck/relicStates 同模式，不要"重构"

### Testing Requirements

| 用例分类 | 说明 |
|---|---|
| serialize 默认 | inbox 字段存在且为空数组 |
| serialize 保序 | push 顺序 = serialize 输出顺序 |
| deserialize 老存档 | 无 inbox 字段 → 回落 [] |
| deserialize 完整 | 内容/顺序还原 |
| deserialize 过滤 | DELETED_*_IDS 命中静默丢弃 |
| 往返一致 | serialize → JSON.stringify → JSON.parse → deserialize 内容相同 |
| 类型形状 | `getState().inbox` 是 `string[]`，与 state.player.inbox 一致 |

**复用既有测试基建：**
- `vi.mock` 模式：参考 `60-5 openShopDispatcher.test.ts` 中 `vi.mock('../../../src/core/UserSettings', ...)` 的写法
- `runState.startRun()` + `addSkill()` 等链式 setup：参考现有 `it('deserialize() 应正确恢复状态', ...)` 用例

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.1-60.5 都用 `(parsed as any).field || default` 兜底老存档 | 本 story 严格沿用，不发明新模式 |
| 60.5 dispatchShopMode 提取为 export function 便于测试 | 本 story serialize/deserialize 已是 public API，无需提取 |
| 60.4 mock startLevel 防真实初始化 | 本 story 不需要 — 单测 RunState 不触发任何战斗/DOM 初始化 |
| 60.5 vi.mock 必须在 import 被测模块前（hoisted） | 本 story DELETED_SKILL_IDS mock 同样要 hoisted |
| 60.x 全套测试一直在 src/ 目录下用 `cd src && npx vitest run ...` 跑 | 本 story 验证脚本同方式 |

### Git Intelligence Summary

最近 commit 风格（来自 `git log --oneline -5`）：
```
044c587 feat(shop): wire shopUI feature flag dispatcher (Story 60.5)
449b49c tweak(balance): 去掉 ACCEL_LEVEL_SCALE 上限 — 无限循环后期任由失控
00820dd tweak(balance): 时间加速倍率随关卡递增（rate × stage scaling）
fdeb9b4 tweak(juice): 字母凸起深度达标后也回基准 7px
3bcbcfe tweak(bg): 分数达标后背景速度立即回基准 1.0
```

**本 story 推荐 commit message：**
- 单 commit：`feat(state): add inbox to RunState serialize/deserialize (Story 60.6)`

### Risks & Open Questions

- **风险 A：state ↔ runState 双向 sync 缺失 → 即便加了字段，inbox 在实际游戏中仍不会被持久化。** 缓解：本 story 明确不接 SaveManager（Phase 3 任务）；store 仍在 `state.player.inbox`；本 story 是"提前为 SaveManager 铺好接口"。code-review 时若提出"为什么没有真实存档生效"，回答：本 story scope 仅持久化层接口，激活由 Phase 3 完成。
- **风险 B：DELETED_SKILL_IDS 列表后续动态变化（新增技能弃用） → 老存档加载时过滤行为变化。** 缓解：与 skills/bindings 反序列化逻辑一致 —— 已是项目约定。
- **风险 C：inbox 中 skillId 与 affixSkills Map 的 id 不匹配（孤儿引用） → 玩家加载存档后 IN-tray 显示空槽。** 缓解：超出本 story 范围；orphan 检测应当与 skills 列表过滤同步实现。本 story 不做主动校验。
- **开放问题 1：是否要把 INBOX_MAX = 9 从 shopPreview.ts 提到 constants.ts？** 倾向：**不提**。当前只有 shopPreview 一个消费者；提取属于 60-14 模块拆分范围。
- **开放问题 2：是否要在 deserialize 时截断 inbox 到 INBOX_MAX？** 倾向：**不截断**。老存档若有超长 inbox 是不应该出现的（运行时早就 push 时校验过），如果出现说明存档损坏，但持久化层不应主动截断（防数据丢失）。runtime 一侧再次校验更安全。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-6] — 验收标准原文
- [Source: src/src/core/state/RunState.ts] — 现有持久化模式（serialize/deserialize 50+ 字段）
- [Source: src/src/core/state/RunState.ts:567-673] — deserialize 兼容老存档的标准写法
- [Source: src/src/core/state.ts:89] — `state.player.inbox` 运行时定义
- [Source: src/src/core/types.ts:263] — `inbox: string[]` 类型注释
- [Source: src/src/data/skills.ts] — DELETED_SKILL_IDS / DELETED_EVOLUTION_IDS 已弃用名单
- [Source: src/tests/unit/core/state/RunState.test.ts:533-700] — 现有序列化测试 30+ 用例
- [Source: docs/implementation-artifacts/60-5-openshop-replacement-flag.md] — 上一 story 实施模式（vi.mock + 81/81 ecosystem）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成 6 个 task。
- 选择不用 `vi.mock` 模拟 `DELETED_SKILL_IDS` —— 直接复用真实数据中的弃用条目（'burst' / 'burst_inferno' 来自 `data-json/skills.json`）做过滤测试，零 mock 依赖更稳。
- RunState.test.ts baseline 既有 11 个失败用例（`currentAct` / `getCurrentAct` 已废 API + `MAX_RELIC_SLOTS` 12→10），与本 story 0 关联；git stash 对比确认 baseline 11 fail / 71 pass 不变。
- tsc baseline 既有 1 个错误（TS1484 BattleResult 应 type-only import），与本 story 0 关联；git stash 对比确认 0 新错误。
- Story 60.x ecosystem: 81 → 89 测试（+8），全绿。

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.2 接入档第 2 项
- 实施于 2026-04-29，所有 6 个 task 完成；Status: review
- **AC 全覆盖：** AC1（接口 + createInitialState）/ AC2（serialize 写出）/ AC3（deserialize 老存档兼容）/ AC4（DELETED_*_IDS 过滤）/ AC5（类型对齐 string[]，不引入 sync hook）/ AC6（8 新用例）/ AC7（现有 31 个序列化测试 0 退化）/ AC8（过滤路径单测覆盖）/ AC9（前向兼容 — 剥字段后仍能 deserialize）/ AC10（tsc 0 新错误）
- **关键设计决策：**
  1. **不引入 state ↔ runState sync hook** —— 现有 RunState save/load 路径未激活（Phase 3 SaveManager 任务）；本 story 只铺接口，等 Phase 3 接入
  2. **过滤已删除技能用真实数据**（'burst'）而不是 `vi.mock` —— 测试更稳健，零 mock 依赖
  3. **inbox 顺序保留**（push 顺序 = 数组顺序）—— 与 wordDeck/relics 同模式
  4. **不截断到 INBOX_MAX**（开放问题 2）—— 持久化层尊重存档原样，runtime 一侧再校验更安全
- 上一 story 60-5 同日完成（044c587 feat(shop): wire shopUI feature flag dispatcher）
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 2/4 done（剩 60-7 事件总线 / 60-8 教程改写）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：deserialize 改用 `Array.isArray + typeof string` 守卫，损坏存档（`inbox: "string"` / `42` / `null` / 数组样对象 / 混入非字符串元素）不再抛错，回落空数组（AC3 "绝不抛错"严格落实）
  - **M2**：追加 5 个损坏存档单测（字符串 / 数字 / 数组样对象 / 混入非字符串 / null），全绿
  - L1-L4 暂不修（架构性 / cosmetic — orphan 校验留 60-14 cleanup，'burst' 数据耦合属有意取舍）

### File List

修改：
- `src/src/core/state/RunState.ts` — `RunStateData` 加 `inbox: string[]` 字段；`createInitialState()` 加 `inbox: []`；`serialize()` 加 `inbox: [...this.data.inbox]`；`deserialize()` 加 inbox 还原 + `Array.isArray + typeof string` 守卫（M1 review fix）+ DELETED_*_IDS 过滤
- `src/tests/unit/core/state/RunState.test.ts` — 序列化 describe 块追加 13 用例（8 主路径 + 5 损坏存档防御 M2 review fix）；"空状态序列化/反序列化"用例追加一行 inbox 断言
- `docs/implementation-artifacts/sprint-status.yaml` — 60-6 ready-for-dev → in-progress → review → done

新增：无（全部追加到现有文件）
