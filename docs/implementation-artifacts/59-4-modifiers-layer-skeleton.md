# Story 59.4: modifiers/ 横向层骨架

Status: planned
Epic: 59
Architecture rules: **A-1, A-2** (`docs/game-architecture.md` v1.1 §Affix / Modifier Layer)

## Story

As a 要把 wordsmith / 数值 / 空间 等 affix 统一到同一套 Modifier 系统的开发者,
I want 一个位于 `src/renderer/systems/modifiers/` 的 `ModifierEngine` + `Modifier` / `ModifierHost` 接口骨架,
so that 后续任何 skill / relic / wordpack 挂载 affix 时都走同一套求值管线，AI agent 不会出现"这个 affix 写在技能里还是遗物里"的决策摇摆。

## Acceptance Criteria

1. **AC1: 类型定义** — 新建 `src/renderer/systems/modifiers/types.ts`：
   ```typescript
   export type ModifierKind = 'additive' | 'multiplicative' | 'conditional' | 'transform'
   export type ModifierSource = 'skill' | 'relic' | 'wordpack' | 'affix'
   export type ModifierScope = 'score' | 'timer' | 'word' | 'skill-cd' | 'damage' | string

   export interface ModifierContext {
     scope: ModifierScope
     baseValue: number
     // ... 预留字段，Epic 34/35/45 会扩展
   }

   export interface ModifierResult {
     value: number
     applied: boolean
     debug?: string
   }

   export interface Modifier {
     id: string
     source: ModifierSource
     kind: ModifierKind
     scope: ModifierScope
     apply(ctx: ModifierContext): ModifierResult
   }

   export interface ModifierHost {
     getModifiers(context?: ModifierScope): Modifier[]
   }
   ```
2. **AC2: ModifierEngine 类** — 新建 `src/renderer/systems/modifiers/ModifierEngine.ts`，实现固定求值顺序：
   ```typescript
   export class ModifierEngine {
     collectActive(hosts: ModifierHost[], scope: ModifierScope): Modifier[]
     resolve(baseValue: number, modifiers: Modifier[], scope: ModifierScope): number
     // resolve 按 additive → multiplicative → conditional → transform 顺序
   }
   ```
3. **AC3: 单元测试** — `tests/unit/modifier-engine.test.ts` 覆盖：
   - 求值顺序正确（additive 先于 multiplicative 等）
   - 多个同类型 modifier 的叠加行为（additive 相加、multiplicative 相乘 — 文档明确）
   - 空 modifier 列表返回 baseValue
   - conditional 不满足条件时跳过
4. **AC4: 遵守 M-1** — `src/renderer/systems/modifiers/**` 零 PixiJS import（被 59.1 的 lint 规则检查）。
5. **AC5: Schema 引用约定** — 在 `src/renderer/systems/modifiers/README.md` 写明：所有具体 modifier 实现（Epic 34/35/45）**必须** 基于 `scripts/affix-designer/` 输出的 schema，禁止手写数值。
6. **AC6: 无实际 affix 实现** — 本 Story **只** 建骨架，不迁移任何已有 affix。迁移走 Epic 34/35 的后续 story。
7. **AC7: 架构文档回指** — `docs/game-architecture.md` §Affix / Modifier Layer 补一行"骨架已于 Story 59.4 落地"。

## Tasks / Subtasks

- [ ] **Task 1: 类型定义** (AC1)
- [ ] **Task 2: ModifierEngine 实现** (AC2)
- [ ] **Task 3: 求值顺序明文文档** — 写在 ModifierEngine.ts 顶部注释
- [ ] **Task 4: 单元测试** (AC3)
- [ ] **Task 5: README 约定** (AC5)
- [ ] **Task 6: 架构文档回指** (AC7)

## Dependencies

- **前置:** Story 59.1（M-1 lint 规则，确保骨架不意外引入 PixiJS）
- **下游:** Epic 34/35/45 等 affix story 的 modifier 迁移

## Non-Goals

- ❌ 不迁移现有 affix 实现（那是 Epic 34/35 的多个独立 story）
- ❌ 不实现 affix-designer 工具本身（已存在于 `scripts/affix-designer/`）
- ❌ 不定义完整 ModifierScope 枚举（留作 extensible string 类型，后续 epic 补充）
