# `modifiers/engine/` — v1.1 Affix/Modifier Layer 骨架

**Story:** 59.4
**Architecture:** `docs/game-architecture.md` §Affix / Modifier Layer (v1.1), §Consistency Rules A-1 / A-2

## TL;DR

本目录是 v1.1 架构的横向 modifier 引擎骨架，与 **`../` 下 Epic 11 legacy modifier 系统并存**。两套系统的类型和 API 通过命名前缀 (`Engine*`) 物理隔离，任何工具或代码都不会把它们混淆。

## 为什么有两套 modifier 系统？

- **Epic 11 legacy**（`../ModifierTypes.ts` / `../ModifierRegistry.ts` / `../EffectPipeline.ts` / `../ConditionEvaluator.ts` / `../BehaviorExecutor.ts`）：2025 年底落地的 **trigger-driven phase/layer pipeline**。产品规模已经很大，支撑 skill / relic / affix 的所有触发式效果。本 story **不触碰**它们。
- **`engine/` (本目录)**：2026 年 v1.1 架构确定的新方向——**scope-based `apply()` 纯函数模型**。代表未来形态。

未来某个专门的"Epic 11 → engine 迁移" story 会把 legacy 的使用点逐步映射到 `EngineModifier`。那不是本 story 的 scope。

## 命名约定（AI agent 必读）

1. **`Modifier`（裸类型）= Epic 11 legacy。** 来自 `../ModifierTypes.ts`。
2. **`EngineModifier` 前缀类型 = v1.1 新骨架。** 来自本目录 `./types.ts`。
3. **新功能 / 新 affix** 原则上基于 `EngineModifier`，除非明确需要 Epic 11 的 trigger phase 语义。
4. **旧功能维护** 继续用 `Modifier`（Epic 11），不强制迁移。
5. **Story 59.5 wordpack 的 `ModifierPlaceholder`** 是一个过渡占位。下次 touch 时换成 `EngineModifier`。

## API 一览

```typescript
import {
  ModifierEngine,
  type EngineModifier,
  type EngineModifierHost,
  type EngineModifierScope,
} from './engine' // (from src/systems/modifiers)

const engine = new ModifierEngine()
const mods = engine.collectActive([skillHost, relicHost, wordpackHost], 'score')
const finalValue = engine.resolve(baseScore, mods, 'score')
```

## 求值契约

固定顺序（由 `ModifierEngine.ts` 顶部注释锁定）：

```
additive → multiplicative → conditional → transform
```

- 每步内部按 `priority` 升序（undefined 默认 100）
- 每个 modifier 看到的 `ctx.baseValue` 是 **前面所有已应用 modifier 累加后的结果**
- `result.applied === false` 时该结果被丢弃（conditional 跳过语义）

求值顺序 **不可改**。若确实需要不同顺序的新策略，应新建一种 engine（例如 `ReversedModifierEngine`）而不是修改本类。

## 数值来源约定（规则 A-2）

本目录是骨架，**不包含任何具体 `EngineModifier` 实现**。
未来所有 `EngineModifier` 具体值的来源**应该**是 `scripts/affix-designer/` 工具的输出：

```
scripts/affix-designer/output/<timestamp>-design.json
  → schema-validated → src/data/affixes.json
    → runtime 加载为 EngineModifier 列表
```

**当前兜底:** 纯 code review + 本 README 的约定。**暂时没有** ESLint 或 CI 规则机器强制这件事——识别"EngineModifier 字面量里的 hardcoded number"需要类型感知，超出当前 lint 基建的能力范围。

**未来增强（follow-up）:** 写一个 AST-based 规则扫描 `EngineModifier` 对象字面量内的 `number` literal，禁止非引用常量。留给 Epic 34/35 的 affix 实现 story 顺手补上。

新增 affix 在当前阶段仍然必须走 affix-designer 流程——这是软约定，review 时必查。

## Non-Goals（显式）

- ❌ 本目录不包含 Epic 11 ↔ EngineModifier 的 bridge / adapter
- ❌ 本目录不从 parent `../index.ts` re-export——如要使用 engine 层必须直接 import `modifiers/engine`
- ❌ 本目录不实现 affix-designer 的 runtime 加载器（未来 epic）
- ❌ 本目录不迁移既有 skill/relic/affix 到 engine 层（未来 epic）

## 参考

- 架构文档：`docs/game-architecture.md` §Affix / Modifier Layer
- 一致性规则：§Consistency Rules A-1（schema）/ A-2（禁止硬编码）
- 设计工具链：`scripts/affix-designer/README.md`
- 本 story：`docs/implementation-artifacts/59-4-modifiers-layer-skeleton.md`
