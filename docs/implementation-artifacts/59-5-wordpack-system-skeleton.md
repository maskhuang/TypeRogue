# Story 59.5: wordpack/ 系统骨架

Status: planned
Epic: 59
Architecture rules: **W-1, W-2** (`docs/game-architecture.md` v1.1 §Wordpack System)
Memory 约束: **传说词包是词包系统，不是遗物**（`feedback_wordpack_not_relic.md`）

## Story

As a 要把"词包"正式落地为独立系统（而非借 relic 槽位）的开发者,
I want 一个位于 `src/renderer/systems/typing/wordpack/` 的 `WordpackRegistry` + `WordpackBinding` 骨架,
so that 后续任何词包相关 story（解锁、选择、叙事绑定）都有明确的运行时位置，且类型系统强制 wordpack ≠ relic。

## Acceptance Criteria

1. **AC1: 类型定义** — 新建 `src/renderer/systems/typing/wordpack/types.ts`：
   ```typescript
   import type { Modifier } from '../../modifiers/types'

   export interface Wordpack {
     id: string
     themeKey: string        // narrative.get(themeKey)
     descKey: string         // narrative.get(descKey)
     language: 'en' | 'zh-py' | 'zh-romaji' | string
     difficulty: 1 | 2 | 3 | 4 | 5
     words: string[]
     modifiers?: Modifier[]  // 可作为 ModifierHost
     unlockCondition?: UnlockRule
     narrativeTag?: string
   }

   export interface UnlockRule {
     kind: 'default' | 'achievement' | 'meta-progress' | 'challenge'
     key?: string
   }
   ```
   - **类型强制** `Wordpack` 与 `Relic`（项目既有类型）**无共同父类**，避免被误塞到 relic 槽位（W-2）
2. **AC2: WordpackRegistry** — 新建 `src/renderer/systems/typing/wordpack/WordpackRegistry.ts`：
   ```typescript
   export class WordpackRegistry {
     private loaded = new Map<string, Wordpack>()
     async load(id: string): Promise<Wordpack>  // lazy load from assets/data/words/<id>.json
     get(id: string): Wordpack | null
     listUnlocked(meta: MetaState): Wordpack[]
     // 所有加载走此类，禁止直接 fetch (W-1)
   }
   ```
3. **AC3: WordpackBinding** — 新建 `src/renderer/systems/typing/wordpack/WordpackBinding.ts`：
   ```typescript
   export class WordpackBinding {
     private active: Wordpack | null = null
     bind(pack: Wordpack): void   // Run 开始时调用
     current(): Wordpack | null
     unbind(): void               // Run 结束时调用
   }
   ```
   - 生命周期明确：Meta 持有解锁列表，Run 期间单一绑定，Battle 内只读
4. **AC4: ModifierHost 实现** — Wordpack 实现 `ModifierHost` 接口（来自 59.4），通过 `getModifiers()` 暴露自身 modifiers。（软依赖 59.4；若 59.4 未完成，用 `// TODO: 59.4 完成后实现` 占位 interface）
5. **AC5: 单元测试** — `tests/unit/wordpack-registry.test.ts` 覆盖：
   - lazy load 只在首次调用时读取文件
   - `get()` 未加载时返回 null
   - `WordpackBinding` 的 bind/unbind 生命周期
   - 类型测试（TS 编译期）：`const r: Relic = wordpack` 必须 TS 报错
6. **AC6: 遵守 M-1** — `src/renderer/systems/typing/wordpack/**` 零 PixiJS import
7. **AC7: 无实际词包内容** — 本 Story **只** 建骨架。真实词包数据文件（`assets/data/words/<id>.json`）不创建，留给后续词包 story。
8. **AC8: 架构文档回指** — `docs/game-architecture.md` §Wordpack System 补一行"骨架已于 Story 59.5 落地"。

## Tasks / Subtasks

- [ ] **Task 1: 类型定义 + W-2 隔离** (AC1)
- [ ] **Task 2: WordpackRegistry** (AC2)
- [ ] **Task 3: WordpackBinding** (AC3)
- [ ] **Task 4: ModifierHost 集成** (AC4)
- [ ] **Task 5: 单元测试（含类型测试）** (AC5)
- [ ] **Task 6: 架构文档回指** (AC8)

## Dependencies

- **前置:** Story 59.1（M-1 lint）
- **软依赖:** Story 59.4（ModifierHost 接口 — 若未完成则占位）
- **前置关注:** Story 59.7 必须先审计是否已有 wordpack-as-relic 的历史代码（若有则先修）

## Non-Goals

- ❌ 不创建任何实际词包数据（`assets/data/words/*.json`）
- ❌ 不改动现有 WordMatcher 实现
- ❌ 不做词包选择 UI（走后续 story）
- ❌ 不实现 unlockCondition 的判定逻辑（只定义类型）
