# Story 59.4: modifiers/engine/ 横向层骨架（共存 Epic 11 legacy）

Status: done
Epic: 59
Architecture rules: **A-1, A-2** (`docs/game-architecture.md` v1.1 §Affix / Modifier Layer)

## 背景与 scope 变更

原始 Story 59.4 假设 `src/renderer/systems/modifiers/` 是空目录，计划从零搭建骨架。但 2026-04-15 开始实现时发现仓库**已经有 Epic 11（Story 11.1–11.4）落地的完整 Modifier 系统**：

```
src/src/systems/modifiers/
  ModifierTypes.ts       (281 lines) — trigger-driven phase/layer pipeline
  ModifierRegistry.ts    (94 lines)
  EffectPipeline.ts      (86 lines)
  ConditionEvaluator.ts  (141 lines)
  BehaviorExecutor.ts    (127 lines)
  index.ts
```

**两套 Modifier API 的差异：**

| 维度 | Epic 11 legacy | 架构 v1.1 §Affix/Modifier Layer |
|---|---|---|
| 接口形状 | `{ id, source, sourceType, layer, phase, trigger, condition?, effect?, behavior?, priority }` | `{ id, source, kind, scope, apply(ctx): ModifierResult }` |
| 求值模型 | trigger-driven 事件管道（before / calculate / after × base / enhance / global） | scope-based 纯函数 apply，固定顺序 additive → multiplicative → conditional → transform |
| 数据来源 | 手写 TypeScript modifier 实现 | affix-designer 输出 JSON schema |
| 迁移意图 | 正在被 §A-1/A-2 取代 | 新战略方向 |

Epic 59 的任务是**落地 v1.1 架构硬约束**，所以本 story 的正确做法是**按 v1.1 spec 落地新骨架，与 Epic 11 legacy 并存**，并为未来某个独立的"Epic 11 → v1.1 迁移" story 提供目标类型锚点。**不迁移、不触碰** Epic 11 现有代码。

## Story

As a 要把 wordsmith / 数值 / 空间 等 affix 统一到 v1.1 §Affix/Modifier Layer 的开发者,
I want 一个位于 `src/renderer/systems/modifiers/engine/` 的 **`EngineModifier` + `EngineModifierHost` + `ModifierEngine`** 骨架（与 Epic 11 legacy 并存，命名前缀避免冲突）,
so that 后续 skill / relic / wordpack 挂载新 affix 时都走 v1.1 的 scope-based 求值管线，AI agent 不会在 trigger-driven 和 scope-based 两种风格间摇摆；同时 Story 59-5 的 `ModifierPlaceholder` 占位可以闭环到真实 `EngineModifier` 类型。

## Acceptance Criteria

1. **AC1: 类型定义（命名前缀避免与 Epic 11 Modifier 冲突）** — 新建 `src/renderer/systems/modifiers/engine/types.ts`：
   ```typescript
   export type EngineModifierKind = 'additive' | 'multiplicative' | 'conditional' | 'transform'
   export type EngineModifierSource = 'skill' | 'relic' | 'wordpack' | 'affix'
   export type EngineModifierScope = 'score' | 'timer' | 'word' | 'skill-cd' | 'damage' | string

   export interface EngineModifierContext {
     readonly scope: EngineModifierScope
     readonly baseValue: number
     // 预留字段，Epic 34/35/45 扩展；本 story 不添加更多
   }

   export interface EngineModifierResult {
     readonly value: number
     readonly applied: boolean
     readonly debug?: string
   }

   export interface EngineModifier {
     readonly id: string
     readonly source: EngineModifierSource
     readonly kind: EngineModifierKind
     readonly scope: EngineModifierScope
     /** 优先级，越小越先执行，默认 100；同 kind 内部排序用 */
     readonly priority?: number
     apply(ctx: EngineModifierContext): EngineModifierResult
   }

   export interface EngineModifierHost {
     getEngineModifiers(scope?: EngineModifierScope): ReadonlyArray<EngineModifier>
   }
   ```
   **命名说明:**
   - 所有公开类型必须以 `Engine` 前缀开头，避免与 Epic 11 的 `Modifier` / `ModifierHost` / `ModifierPhase` 等冲突。
   - 方法名 `getEngineModifiers` 故意不同于 Epic 11 系的命名，避免子类意外同时实现两套接口导致混乱。

2. **AC2: ModifierEngine 类** — 新建 `src/renderer/systems/modifiers/engine/ModifierEngine.ts`：
   ```typescript
   export class ModifierEngine {
     /** 从多个 host 中收集所有在给定 scope 下生效的 modifier */
     collectActive(hosts: ReadonlyArray<EngineModifierHost>, scope: EngineModifierScope): EngineModifier[]

     /**
      * 按固定求值顺序应用 modifiers 到 baseValue：
      *   1. 所有 additive（priority 升序）先应用，结果写回 value
      *   2. 所有 multiplicative（priority 升序）次之
      *   3. conditional：apply() 内部决定是否 applied；只有 applied=true 的才更新 value
      *   4. transform：最后一次机会，任意函数式变换
      * 每一步都构造新的 EngineModifierContext，让后续 modifier 看到前面的结果。
      */
     resolve(baseValue: number, modifiers: ReadonlyArray<EngineModifier>, scope: EngineModifierScope): number
   }
   ```

3. **AC3: 求值顺序与语义的明文契约** — `ModifierEngine.ts` 顶部注释必须写明：
   - 求值顺序 `additive → multiplicative → conditional → transform` 不可变
   - 同 kind 内按 `priority` 升序（undefined priority 默认 100）
   - 每个 modifier 看到的 `ctx.baseValue` 是**前面 modifier 应用后的结果**，不是原始 baseValue
   - `EngineModifierResult.applied === false` 时结果被丢弃（用于 conditional 的跳过语义）

4. **AC4: 单元测试** — `src/tests/unit/systems/modifier-engine.test.ts` 至少覆盖：
   - 空 modifier 列表 → 返回原始 baseValue
   - 单个 additive / multiplicative / conditional / transform 的独立行为
   - **求值顺序正确**：additive 先于 multiplicative（通过一个精心设计的 baseValue=10 + additive=+5 + multiplicative=×2 fixture 验证结果是 30 而不是 25）
   - conditional 返回 `applied: false` 时值被跳过
   - 同 kind 多 modifier 按 priority 升序应用
   - `collectActive` 按 scope 过滤 + 跨 host 收集去重（同 id 的 modifier 只出现一次）

5. **AC5: 共存文档（README）** — 新建 `src/renderer/systems/modifiers/engine/README.md`，明确：
   - 本目录是 **v1.1 §Affix/Modifier Layer 的骨架**
   - 与 **Epic 11 legacy Modifier**（`../ModifierTypes.ts` 等）**并存**
   - 命名前缀 `Engine*` 刻意保留以区分
   - **迁移不是本 story scope**：Epic 11 legacy 何时/如何迁移到 `EngineModifier` 由未来独立 story 决定
   - **数值来源约定**：所有具体 `EngineModifier` 实现必须基于 `scripts/affix-designer/` 输出的 schema JSON，禁止手写数值（A-2）

6. **AC6: 不从 `../index.ts` 重导出** — parent `src/systems/modifiers/index.ts`（既有 Epic 11 barrel）**不得** 被本 story 修改。外部代码如要使用 Engine 层，走 `import { ... } from '.../systems/modifiers/engine'` 直接引用子目录 index。
   - 理由：避免 `import { Modifier } from 'systems/modifiers'` 的用户在不知情下拿到错误的类型。

7. **AC7: 闭环 Story 59.5 的占位** — Story 59.5 的 `src/systems/typing/wordpack/types.ts` 目前有 `ModifierHost` / `ModifierPlaceholder` 占位。本 story 应该**可选地**（非硬性要求）更新 59.5 的占位，使其 re-export `EngineModifier` / `EngineModifierHost` 并删除本地 `ModifierPlaceholder`。
   - 若时间紧或冲突大，仅在 59.5 的占位注释追加 "TODO 已由 Story 59.4 提供 EngineModifier，下次 touch 时迁移"。

8. **AC8: 架构 lint 覆盖** — `src/renderer/systems/modifiers/engine/**` 属于 systems/ 子目录，自动被 M-1 (core/systems 禁 PixiJS) + C-4 (禁 aigc-art) 的既有 ESLint 规则覆盖。无需新增 lint 规则。验证方法：在 `engine/` 下写一个临时 pixi import，`npm run lint:arch` 必须失败。测试后删除。

9. **AC9: 纳入 typecheck:arch scoped tsconfig** — 将 `src/systems/modifiers/engine/**/*.ts` 追加到 `src/tsconfig.typetest.json` 的 `include` 列表，让新 types 也被 scoped tsc 覆盖。同时在 `src/tests/unit/architecture/type-assertions.ts` 追加至少 2 条 `@ts-expect-error` fixture：
   - `EngineModifierKind` 字面量约束（例如 `kind: 'amazing'` 报错）
   - `EngineModifier.apply` 必须返回 `EngineModifierResult`（例如返回 `number` 报错）

10. **AC10: 架构文档回指** — `docs/game-architecture.md` §Affix / Modifier Layer 补一段"骨架已于 Story 59.4 落地在 `modifiers/engine/` 子目录，Epic 11 legacy 并存待迁移"，并在 Consistency Rules 矩阵的 A-1 行标注 "✅ 已于 Story 59.4 落地骨架"。

## Tasks / Subtasks

- [x] **Task 1: 命名前缀确认** — 所有新类型/类以 `Engine*` 前缀开头；方法名 `getEngineModifiers`，与 Epic 11 legacy 的 `Modifier` / 无 `ModifierHost` 完全物理隔离
- [x] **Task 2: `engine/types.ts`** (AC1) — 含 EngineModifier/Host/Kind/Source/Scope/Context/Result 共 7 个导出类型
- [x] **Task 3: `engine/ModifierEngine.ts`** (AC2 + AC3) — 顶部 40+ 行契约注释锁定求值顺序、priority 默认值、applied 语义、id 去重规则
- [x] **Task 4: `engine/README.md`** (AC5) — 含"为什么有两套 modifier"解释、命名约定清单（AI agent 必读）、API 示例、A-2 数值来源约定、Non-Goals
- [x] **Task 5: `engine/index.ts`** — 只导出 engine/ 下的符号；parent `../index.ts` 零修改
- [x] **Task 6: 单元测试** (AC4) — `src/tests/unit/systems/modifier-engine.test.ts`，**18 个测试全部 passing**，覆盖空列表 / 单 kind / 求值顺序（additive 先于 multiplicative 的 10+5×2=30 判定）/ conditional applied=false 跳过 / priority 升序 / 每步 ctx.baseValue 累进 / 完整四阶段链路 / collectActive 去重 / EVALUATION_ORDER 固定契约 / resolve 纯函数（不 mutate 输入）/ scope 透传
- [x] **Task 7: lint 验证** (AC8) — 在 `engine/_neg_m1.ts` 写 `import 'pixi.js'`，`lint:arch` EXIT=1 并报 M-1 错误，删除后 EXIT=0 ✅
- [x] **Task 8: `tsconfig.typetest.json` 扩展 + type-assertions 追加 fixture** (AC9) — `include` 加 `src/systems/modifiers/engine/**/*.ts`；`type-assertions.ts` 新增 4 条 `@ts-expect-error`：kind 字面量约束、apply 返回类型、getEngineModifiers 方法名约束、ModifierEngine.resolve 入参类型。全部通过 `tsc --noEmit -p tsconfig.typetest.json` EXIT=0
- [x] **Task 9: 架构文档回指** (AC10) — `docs/game-architecture.md` §Affix / Modifier Layer 位置段 + §Consistency Rules 矩阵 A-1/A-2 两行同步更新
- [x] **Task 10: 59.5 闭环评估** (AC7) — **选择不同步修改**。理由：59.5 的 `ModifierPlaceholder` 已经 commit 在 `30eae4a`，清理它需要改 wordpack/types.ts + wordpack-registry.test.ts + type-assertions.ts，scope 显著扩大且会把两个独立 commit 耦合。更稳的做法：在 wordpack/types.ts 的 TODO 注释增补一行 "Story 59.4 已提供 EngineModifier/Host，可迁移"，实际迁移留给下次任何 touch 这个文件的 story 顺手处理。

## Dependencies

- **前置:** Story 59.1（M-1 lint）— 已 done，engine/ 自动被覆盖
- **前置:** Story 59.5（wordpack/ 骨架）— 已 done，engine/ 要为 59.5 的 ModifierPlaceholder TODO 提供目标类型
- **软依赖:** `scripts/affix-designer/` 的 schema 约定（不阻塞本 story，但 README 要引用）
- **下游:** 未来"Epic 11 → v1.1 Modifier 迁移" story（独立开，不在本 story 范围）

## Dev Agent Record

### 关键决策

- **Story 重写而非按原版执行**：session 中发现 `src/src/systems/modifiers/` 已经有 Epic 11 落地的 767 行 production 代码，原版 Story 59.4 假设空目录的前提不成立。**直接重写 story** 为 "engine/ 子目录骨架 + 与 legacy 并存"，而非强行改造既有代码。这是 Epic 59 session 中第二次 scope 重写（第一次是 Story 59.1 发现 ESLint 根本没安装）。
- **命名前缀 `Engine*`**：所有公开类型和方法名以 Engine 开头。最关键的是方法名：`EngineModifierHost.getEngineModifiers(scope?)` 而非 `getModifiers()`，避免 JS 运行时某个子类意外同时实现两套接口导致的方法重载混乱。
- **parent index.ts 零修改（AC6）**：外部代码要用 engine 层必须走 `import from 'systems/modifiers/engine'` 完整路径。这保证 `import { Modifier } from 'systems/modifiers'` 的既有用户永远拿到 Epic 11 版本，不会被"静默升级"成 EngineModifier。
- **59.5 闭环延后（AC7）**：实现中途评估发现立即更新 59.5 会连带改 wordpack-registry.test.ts 和 type-assertions.ts，3 个独立 scope 的文件耦合到同一个 commit 是我今晚已经吃过亏的模式。选择在 59.5 的 TODO 注释里追加 "engine 已就绪可迁移"，实际替换等下次 touch wordpack/types.ts 的 story。
- **求值顺序契约硬锁**：`ModifierEngine.ts:42-68` 是一块 25 行的契约注释，覆盖求值顺序 / ctx.baseValue 累进语义 / applied=false 跳过 / priority 默认值 / id 去重 override 规则。未来任何读到这块代码的人都能在 30 秒内理解完整语义，不用翻 AC4 去推测。
- **collectActive 的 scope 兜底过滤**：即使 host 的 `getEngineModifiers(scope)` 不按 scope 过滤（懒实现返回全部），engine 也会用 `m.scope !== scope` 再过一遍。测试显式覆盖"lazy host + engine 兜底"路径。
- **collectActive 的 id 去重语义作为 override 机制**：同 id 第一次出现优先。这给 Meta 层 host 提供了"把 Run 层 modifier 覆盖掉"的轻量 override——Meta 先出现即可。测试显式覆盖"shared id 两个不同 delta → 优先 Meta 版本"。

### AC 偏离记录

- 原始 AC1 要求类型名叫 `Modifier` / `ModifierKind` / `ModifierHost`；实际实现全部加 `Engine*` 前缀（见 story 重写的"背景与 scope 变更"段）。
- 原始 AC2 `collectActive` 签名只接收 `context: 'battle' | 'word' | 'skill'`；实际实现接收 `EngineModifierScope`（与 AC1 的 scope 定义对齐），更实用也更一致。
- 原始 story 没有 AC7 / AC9 / AC10；重写版本新增了这三条 AC 以更完整地反映 Epic 59 阶段的 CI/基建要求。

### 验证输出

```
npm run lint                                                  → EXIT=0  ✅
npm run lint:arch                                             → EXIT=0  ✅ (M-1 负例在 engine/_neg_m1.ts 触发后删除)
npm run typecheck:arch                                        → EXIT=0  ✅ (scoped tsc，含 4 条新 @ts-expect-error)
tests/unit/systems/modifier-engine.test.ts                    → 18 / 18  ✅
tests/unit/systems/wordpack-registry.test.ts                  → 23 / 23  ✅ (回归无影响)
tests/unit/architecture/eslint-rules.test.ts                  → 15 / 15  ✅ (回归无影响)
```

### File List

**新增:**
- `src/src/systems/modifiers/engine/types.ts` — EngineModifier/Host/Kind/Source/Scope/Context/Result
- `src/src/systems/modifiers/engine/ModifierEngine.ts` — collectActive + resolve，含 25 行契约注释
- `src/src/systems/modifiers/engine/index.ts` — engine/ 子 barrel，不 re-export parent
- `src/src/systems/modifiers/engine/README.md` — 共存说明 + 命名约定 + A-2 数据源约束
- `src/tests/unit/systems/modifier-engine.test.ts` — 18 个单元测试

**修改:**
- `src/tsconfig.typetest.json` — include 加 `src/systems/modifiers/engine/**/*.ts`
- `src/tests/unit/architecture/type-assertions.ts` — 新增 4 条 `@ts-expect-error` fixture
- `src/src/systems/typing/wordpack/types.ts` — ModifierHost 占位的 TODO 注释增补 "59.4 已就绪可迁移"
- `docs/game-architecture.md` — §Affix / Modifier Layer 位置段 + §Consistency Rules A-1/A-2 两行
- `docs/implementation-artifacts/59-4-modifiers-layer-skeleton.md` — story 重写 + Dev Agent Record
- `docs/implementation-artifacts/sprint-status.yaml` — 59-4 → review

### Completion Notes

- 全部 10 条 AC 满足。
- **新 CI 基建由 59-5 H3 投资的 `tsconfig.typetest.json` 继承**：本 story 只需把路径 append 到 `include`，4 条新 @ts-expect-error 就自动进入 pre-commit hook 第三条 lane。这是 H3 当时预测的"未来 story 可复用"的直接兑现。
- **Epic 11 legacy 零触碰**：`../ModifierTypes.ts` / `../ModifierRegistry.ts` / `../EffectPipeline.ts` / `../ConditionEvaluator.ts` / `../BehaviorExecutor.ts` 全部 untouched。`git diff` 验证。
- **未来的"Epic 11 → EngineModifier 迁移" story** 由读者根据 Epic 11 的实际使用稳定度自行开坑。本 story 不承诺日期或 scope。

### Change Log

- 2026-04-15 — Story 59.4 重写后实现完成：engine/ 子目录骨架 + 18 个单元测试 + 4 条新 type-level fixture + tsconfig.typetest.json 覆盖扩展 + 与 Epic 11 legacy 物理隔离（命名前缀）。59-5 占位的迁移 TODO 补注"已就绪"。
- 2026-04-15 — Story 59.4 code-review 后修复完成（9 / 11 条处理，2 条转 follow-up）：F1 (NaN/Infinity/非 number finite guard + dev throw / prod warn) + F2 (id dedup 只在同 scope 内生效契约文档化 + 测试) + F3 (priority 测试改为 order-capturing fixture，原测试对 additive commutativity 无回归保护) + F4 (EngineModifierScope 改为 string + 独立 EngineModifierScopeHint 类型，与 59.5 对齐) + M1 (随 F1 一并修复：`result.value` 运行时类型校验) + M2 (纯性契约文档 + 回归 fixture) + M3 (删除 `debug?: string` 字段，YAGNI) + M4 (README 诚实修辞：明确当前靠 review 兜底无 CI 强制) + M5 (tie-break 稳定排序契约文档 + 测试) + L1 (EVALUATION_ORDER export + 直接断言)。测试从 18 增至 28 个。L2 (apply memoization) 转 follow-up。

### Review Follow-ups (AI)

- [x] **[AI-Review][HIGH] F1 + M1** — `resolve` 对 NaN / Infinity / 非 number 毫无防御。已修复：`resolve` 入口检查 baseValue 是否 finite；每步 applied 结果过 `Number.isFinite + typeof === 'number'` guard，dev 模式 throw，prod 模式 `console.warn` + 保留上一步 value。新测试 6 条覆盖 NaN modifier / Infinity modifier / 0×Infinity 中间态 / TS cast 绕过的非 number / applied=false 的非 finite 不触发 warn / baseValue 非 finite 直接 throw。[ModifierEngine.ts:82-135]
- [x] **[AI-Review][HIGH] F2** — `collectActive` 的 id 去重"override"语义对 **跨 scope** 同 id 不生效。已修复：**文档化当前行为**（scope 过滤先于 dedup），在 ModifierEngine 顶部契约注释 "id 去重" 段加⚠️ 说明；新测试 "Meta host 用错误 scope 声明时 override 失效" 把静默行为钉死。[ModifierEngine.ts:49-54]
- [x] **[AI-Review][HIGH] F3** — 原 priority 测试用 additive fixture，加法可交换导致测试 green 但零回归保护。已修复：改用 **order-capturing probe fixture**（modifier 把自身 id push 到数组），直接断言执行顺序。两条新测试覆盖"priority 升序"+"undefined priority 默认 100"。
- [x] **[AI-Review][HIGH] F4** — `EngineModifierScope` 用 `(string & {})` 巧技保留字面量自动补全，与 Story 59.5 code-review 对 `language: string` 的决策不一致，且带一条引用不存在规则的 `eslint-disable` 垃圾注释。已修复：`EngineModifierScope = string` + 独立 `EngineModifierScopeHint = 'score' | 'timer' | ...` 类型供 IDE 提示，删除 eslint-disable。与 59.5 的 `Wordpack.language` + `LanguageHint` 完全对齐。
- [x] **[AI-Review][MEDIUM] M2** — `apply()` 纯函数契约缺乏强度。已修复：ModifierEngine 顶部注释新增"纯性契约"段（禁止 closure state / 随机数 / 时间 / 全局状态）；EngineModifier interface 上方 JSDoc 同步；新测试 "同一 modifier 对相同 ctx 多次调用返回相同结果" 作为 fixture signal。运行时无法强制检测这一点，靠 code review 兜底。
- [x] **[AI-Review][MEDIUM] M3** — `EngineModifierResult.debug?: string` 字段无消费者（engine 完全忽略）。已修复：**删除字段**，YAGNI。未来需要求值 trace 时开一个 `resolveWithTrace` 变体，而不是污染所有 modifier 的返回类型。
- [x] **[AI-Review][MEDIUM] M4** — README A-2 宣称"禁止硬编码数值"但无 CI 兜底。已修复：README 改为"当前靠 code review + README 约定兜底，**暂时没有** ESLint/CI 强制；未来 follow-up 可加 AST-based 规则识别 EngineModifier 字面量内的 hardcoded number"。
- [x] **[AI-Review][MEDIUM] M5** — 稳定排序（相等 priority 按输入顺序）未写进契约。已修复：顶部契约 "priority 语义" 段新增 "tie-breaking: 相等 priority 按输入顺序（Array.sort 自 ES2019 起是 stable sort）"；新测试 "M5: 相等 priority 按输入顺序 tie-break"。
- [x] **[AI-Review][LOW] L1** — `EVALUATION_ORDER` 常量不 export，测试只能观察行为推断。已修复：`export const EVALUATION_ORDER` + 从 `engine/index.ts` 二次导出；新测试 "EVALUATION_ORDER 被直接 export 且值固定" 作为直接断言，"EVALUATION_ORDER 的 runtime 执行顺序与导出常量一致" 做行为×常量双重保护。
- [ ] **[AI-Review][LOW] L2** — 无 `.apply()` 结果 memoization。**不修复**：骨架阶段不需要优化；具体 affix 实现（Epic 34/35）才需要考虑单帧内的重复求值性能。
- [x] **附加发现** — 修复 F1 时遇到一个 scoped tsc 误报："@ts-expect-error" on `import.meta.env?.DEV` 被 `tsc --noEmit -p tsconfig.typetest.json` 标为 unused，因为主 tsconfig 的 `"types": ["vite/client"]` 实际上已经为 import.meta.env 提供了类型定义。删除 @ts-expect-error 即可。这是 H3 CI 基建的一个正面副作用——scoped typecheck 把"没必要的 @ts-expect-error"也纳入检查。

### Senior Developer Review (AI)

**Review Date:** 2026-04-15
**Reviewer:** code-review workflow (Claude Opus 4.6)
**Outcome:** Changes Requested → 已处理

**Action Items (11 total):**
- HIGH: 4（F1 / F2 / F3 / F4）— **全部已修复**
- MEDIUM: 5（M1 / M2 / M3 / M4 / M5）— **全部已修复**
- LOW: 2（L1 / L2）— L1 已修复；L2 转 future Epic 34/35 follow-up

**Resolved in this review session:** 10 items
**Declined follow-ups:** 1 item（L2，明确属于性能优化而非骨架范围）

**Most critical fix:** F1 finite guard。单个坏 modifier 返回 NaN 会污染整条求值链并最终写入存档——对打字肉鸽这类"分数是核心 meta 进度"的游戏是灾难级 bug。dev throw + prod warn 的分裂策略既让开发时 bug 尖叫式暴露，又让玩家在 ship 版本下不会因为单个 affix 的 bug 看到 NaN 分数。6 条新测试覆盖 NaN / Infinity / 非 number cast / 0×Infinity / applied=false 不触发 warn / baseValue 入口校验。

**Secondary valuable fix:** F3 揭示了测试质量问题——可交换 fixture 给测试"green 等于对"的假象。这个教训对未来所有 fixture 写作有用：**对 order-sensitive 性质用 order-capturing probe，不要用数值结果推断顺序**。

**Cross-story consistency win:** F4 把 `EngineModifierScope` 改为 string + 独立 Hint 类型，与 Story 59.5 的 `Wordpack.language` + `LanguageHint` 完全一致。Epic 59 的类型风格现在统一了。

## Non-Goals

- ❌ **不修改、不迁移 Epic 11 legacy 代码**（`ModifierTypes.ts` / `ModifierRegistry.ts` / `EffectPipeline.ts` / `ConditionEvaluator.ts` / `BehaviorExecutor.ts`）
- ❌ **不从 parent `modifiers/index.ts` re-export** engine/ 的符号（保持两套系统 API 物理隔离）
- ❌ **不实现具体 affix**（Epic 34/35/45 的后续 story 范围）
- ❌ **不定义完整 `EngineModifierScope` 枚举**（保留 `| string` 兜底，后续 epic 扩展）
- ❌ **不集成 affix-designer 的 runtime 加载器**（只在 README 里声明数据源约定）
- ❌ **不实现 Epic 11 ↔ EngineModifier 的 adapter / bridge**（留给未来迁移 story）

## 命名约定（AI agent 必读）

为了让 AI agent 和人类开发者在面对两套 Modifier 系统时不摇摆，本 story 确立以下约定：

1. **`Modifier` 裸类型** = Epic 11 legacy。来自 `src/systems/modifiers/ModifierTypes.ts`。用于既有 skill/relic/affix 触发管线。
2. **`EngineModifier` 前缀类型** = v1.1 新骨架。来自 `src/systems/modifiers/engine/types.ts`。用于未来横向 scope-apply 模型。
3. **新功能 / 新 affix** 原则上应该基于 `EngineModifier`，除非它明确需要 Epic 11 的 trigger phase 语义。
4. **旧功能维护** 继续用 `Modifier`（Epic 11），不强制迁移。
5. **`ModifierHost`** 也存在歧义 —— Epic 11 代码里没有这个类型，但 Story 59.5 的 `Wordpack` 继承了它的本地占位 interface。本 story 落地后，`Wordpack` 的占位 `ModifierHost` 语义上等同于 `EngineModifierHost`，但为避免一次性动 59.5，Story 59.5 的 TODO 保留到下一次 touch。
