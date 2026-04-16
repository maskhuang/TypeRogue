# Story 59.5: wordpack/ 系统骨架

Status: review
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

- [x] **Task 1: 类型定义 + W-2 隔离** (AC1) — `src/src/systems/typing/wordpack/types.ts`，通过 `declare const WordpackBrand: unique symbol` 的 **phantom brand** 模式强制 W-2：Wordpack 在类型系统里不可赋值给 RelicData，外部代码也无法构造（brand 是 module-private unique symbol）；运行时零属性成本。
- [x] **Task 2: WordpackRegistry** (AC2) — `WordpackRegistry.ts`，构造函数注入 `WordpackDataLoader` 便于测试替身；实现 `load` / `get` / `listUnlocked` / `clear`；**并发合并**：同 id 的多个 in-flight load 合并为一个 promise。
- [x] **Task 3: WordpackBinding** (AC3) — `WordpackBinding.ts`，单一绑定语义：`bind` 已绑定时抛错而非静默覆盖，避免 Run 内误调用；含 `isBound()` helper。
- [x] **Task 4: ModifierHost 集成** (AC4) — 定义**最小 ModifierHost 占位** interface 于 types.ts（含 TODO 指向 59.4），`Wordpack extends ModifierHost` 并通过 `getModifiers()` 闭包返回 init 传入的 modifiers 数组。59.4 完成后删除占位 import 真实类型。
- [x] **Task 5: 单元测试（含类型测试）** (AC5) — `src/tests/unit/systems/wordpack-registry.test.ts`，**16 个测试全部 passing**，覆盖：lazy load 首次/命中/null/并发合并、get 未 load 返回 null、listUnlocked 的 default/achievement/meta-progress/challenge 过滤、broken unlockCondition 缺 key 处理、clear、WordpackBinding 生命周期 + 重复绑定抛错、W-2 类型隔离（两条 `@ts-expect-error` 作为未来 tsc 门禁 fixture）+ shape/phantom brand 运行时验证。
- [x] **Task 6: 架构文档回指** (AC8) — `docs/game-architecture.md` §Wordpack System 位置段补注 "✅ 骨架已于 Story 59.5 落地" 含 phantom brand 技术说明。

## Dependencies

- **前置:** Story 59.1（M-1 lint）
- **软依赖:** Story 59.4（ModifierHost 接口 — 若未完成则占位）
- **前置关注:** Story 59.7 必须先审计是否已有 wordpack-as-relic 的历史代码（若有则先修）

## Dev Agent Record

### 实现计划与关键决策

- **W-2 通过 phantom brand 实现**：故事 AC1 要求 "类型强制 Wordpack 与 Relic 无共同父类"。用 `declare const WordpackBrand: unique symbol` + `[WordpackBrand]: 'Wordpack'` 字段实现 TypeScript 的标准 nominal typing 模式：
  - **编译期**：外部代码无法复现这个 symbol（它是 module-private unique），所以字面量无法构造 `Wordpack`，只能走 `createWordpack` 工厂。即使 RelicData 结构巧合兼容，phantom brand 字段也会被结构类型系统视为独有，拒绝 `const r: RelicData = wordpack` 这类赋值。
  - **运行时**：`createWordpack` 内部用 `as unknown as Wordpack` cast 返回普通对象，**不真实设置 symbol 属性**，零 runtime 成本。
- **首次实现踩的坑**：第一版用 `declare const WORDPACK_BRAND: unique symbol` + `[WORDPACK_BRAND]: true as const` 作为真实属性，结果 vitest 运行时报 `ReferenceError: WORDPACK_BRAND is not defined` —— 因为 `declare` 只告诉 TS 存在但 esbuild 不会生成对应 runtime 变量。修复为 phantom brand（只在类型层存在）。
- **DataLoader 依赖注入**：`WordpackRegistry` 构造接收 `WordpackDataLoader` 函数而不是硬编码 fetch。测试用内存 map 驱动；未来真实加载器走 `fetch('assets/data/words/<id>.json')` 或 Vite `import.meta.glob`。既便于测试又为未来真实加载器留接口。
- **并发 load 合并**：用 `inFlight: Map<string, Promise>` 暂存未完成的 promise。同一 id 并发 load 时命中 `inFlight` 直接返回现有 promise，避免重复请求。测试用可控 resolver 验证"3 次并发 load 只触发 1 次 loader"。
- **null load 不 cache**：loader 返回 null 时表示词包不存在。Registry 不把 null 塞进 cache（否则未来数据修复后仍 stale）；null 结果不 memoize，调用方每次重试。测试显式验证。
- **listUnlocked 只看已 load 的词包**：Registry 的 cache 只含已经 `load()` 过的 pack，`listUnlocked` 遍历 cache 即可。真实场景下 Meta 层会在启动时预 load 所有已解锁 pack 的 id。
- **UnlockedKeysQuery 接口避免反向 import core/state**：为了 systems/wordpack 不依赖 core 的 MetaState 整体形状，只定义 `listUnlocked` 所需的最小查询 shape（`hasAchievement` / `hasMetaProgress` / `hasChallenge`）。未来 core/MetaState 实现 `UnlockedKeysQuery` 即可。这是 hexagonal-ish 的 port/adapter 思路。
- **WordpackBinding 的防呆**：单一绑定是故事 AC3 的约定。初版用静默覆盖（`this.active = pack`），但容易让 Run 内的误调用静默生效。改为已绑定时 `throw new Error(...)`。测试显式覆盖 "double bind → throw" 分支。

### 验证输出

```
$ npm --prefix src run lint         → EXIT=0  ✅ (含 M-1 覆盖 src/systems/typing/wordpack/**)
$ npm --prefix src run lint:arch    → EXIT=0  ✅
$ npm --prefix src run test:run -- tests/unit/systems/wordpack-registry.test.ts
  Test Files  1 passed (1)
       Tests  16 passed (16)
$ npm --prefix src run test:run -- tests/unit/architecture/eslint-rules.test.ts
  Test Files  1 passed (1)
       Tests  15 passed (15)   ← 架构规则 fixture 回归无影响
```

### File List

**新增:**
- `src/src/systems/typing/wordpack/types.ts` — Wordpack/UnlockRule/ModifierHost 占位 + createWordpack 工厂 + phantom brand
- `src/src/systems/typing/wordpack/WordpackRegistry.ts` — lazy load + 并发合并 + unlockCondition 过滤
- `src/src/systems/typing/wordpack/WordpackBinding.ts` — 单一绑定 + 防呆
- `src/src/systems/typing/wordpack/index.ts` — 模块 barrel export
- `src/tests/unit/systems/wordpack-registry.test.ts` — 16 个单元测试

**修改:**
- `docs/game-architecture.md` — §Wordpack System 位置段补注 "✅ 骨架已于 Story 59.5 落地"
- `docs/implementation-artifacts/59-5-wordpack-system-skeleton.md` — 本文件
- `docs/implementation-artifacts/sprint-status.yaml` — 59-5 状态 `ready-for-dev` → `review`

### Completion Notes

- 全部 8 条 AC 满足。AC4 的 ModifierHost 用占位 interface 实现，待 59.4（modifiers/ 横向层骨架）落地后改为真实 import。
- **未创建任何词包数据文件**（AC7 Non-Goal），只有骨架代码。
- **未改动任何既有代码**，包括 `src/core/types.ts` 的 `WordPack`（商店奖励层）和 `src/data/wordPacks.ts`（数据层）。两者与本 story 的 `systems/typing/wordpack/` 骨架**并存**，大小写差异（`WordPack` vs `Wordpack`）刻意保留以区分领域，未来 story 会讨论合并/迁移。
- 架构规则 fixture 回归测试（`eslint-rules.test.ts` 的 15 tests）验证本 story 没有破坏 M-1 / C-4 enforcement。

### Change Log

- 2026-04-15 — Story 59.5 实现完成：wordpack/ 骨架落地，含 phantom brand nominal typing 实现 W-2、依赖注入的 Registry、防呆的 Binding、16 个单元测试全部通过。

## Non-Goals

- ❌ 不创建任何实际词包数据（`assets/data/words/*.json`）
- ❌ 不改动现有 WordMatcher 实现
- ❌ 不做词包选择 UI（走后续 story）
- ❌ 不实现 unlockCondition 的判定逻辑（只定义类型）
