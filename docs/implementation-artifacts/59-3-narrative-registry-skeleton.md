# Story 59.3: NarrativeRegistry 骨架 + 7 bundle 文件

Status: planned
Epic: 59 (blocks Epic 58)
Architecture rules: **N-1, N-2** (`docs/game-architecture.md` v1.1 §Narrative as Content Layer)

## Story

As a 要把 Ironpress Cathedral 40K+SCP 融合叙事落地到游戏文本的开发者,
I want 一个位于 `src/renderer/core/narrative/` 的 `NarrativeRegistry` 骨架 + 7 个按叙事模板分类的空 bundle 文件,
so that Epic 58 (Narrative Layer Landing) 开始填充内容时，有明确的落位而不需要再讨论"文本放哪"。

## Acceptance Criteria

1. **AC1: NarrativeRegistry 类** — 新建 `src/renderer/core/narrative/NarrativeRegistry.ts`，实现：
   ```typescript
   export class NarrativeRegistry {
     private bundles = new Map<string, Record<string, string>>()
     load(bundleName: string, data: Record<string, string>): void
     get(key: string, fallback?: string): string
     format(key: string, vars: Record<string, string | number>): string
     // 支持 "bundle.sub.key" 点号路径
   }
   export const narrative = new NarrativeRegistry()
   ```
   - 零 PixiJS 依赖（遵守 M-1，放在 core/）
   - `get()` 未命中时：开发环境 console.warn，生产环境返回 fallback 或 key 本身
   - `format()` 支持 `{{var}}` 占位符替换
2. **AC2: 7 个 bundle 文件** — 按 `docs/narrative-design.md` 7 套模板创建空 bundle 数据文件：
   - `src/renderer/data/narrative/skills.ts` — 技能描述
   - `src/renderer/data/narrative/relics.ts` — 遗物描述 + flavor
   - `src/renderer/data/narrative/wordpacks.ts` — 词包主题 + 简介
   - `src/renderer/data/narrative/battle.ts` — 战斗开/胜/负 flavor
   - `src/renderer/data/narrative/stages.ts` — 关卡/幕次名
   - `src/renderer/data/narrative/ui.ts` — UI 常驻文案
   - `src/renderer/data/narrative/achievements.ts` — 成就描述
   - 每个文件导出 `export const {name}Bundle: Record<string, string> = { /* TODO: Epic 58 填充 */ }`
3. **AC3: 启动时注册** — 新建 `src/renderer/core/narrative/index.ts` 在其中统一 import 7 bundle 并调用 `narrative.load()`，作为 app 启动初始化的一部分（若项目有 `main.ts` / `bootstrap.ts`，在其中调用一次）。
4. **AC4: 单元测试** — 新建 `tests/unit/narrative-registry.test.ts`（或项目既有测试位置），覆盖：
   - 正常 load + get 取回
   - 未命中 key 的 fallback 行为
   - `format()` 的变量替换
   - 重复 load 同名 bundle 时的行为（后来覆盖 / 合并 — 二选一，文档说明）
5. **AC5: 无实际内容填充** — 本 Story **只** 建骨架。7 个 bundle 文件保持空 + TODO 注释。实际文本由 Epic 58 填充。
6. **AC6: 架构文档回指** — 在 `docs/game-architecture.md` §Narrative as Content Layer 的代码示例下补一行"骨架已于 Story 59.3 落地"。

## Tasks / Subtasks

- [ ] **Task 1: 创建 NarrativeRegistry 类** (AC1)
- [ ] **Task 2: 创建 7 空 bundle 文件** (AC2)
- [ ] **Task 3: 注册入口** (AC3)
- [ ] **Task 4: 单元测试** (AC4)
- [ ] **Task 5: 架构文档回指** (AC6)

## Dependencies

- **前置:** `docs/narrative-design.md`（已存在 ✅）
- **下游:** Epic 58 (Narrative Layer Landing) 填充所有 bundle

## Non-Goals

- ❌ 不引入 i18n / 多语言支持（独立讨论）
- ❌ 不重构现有 scenes/ui 中的硬编码文本（那是后续 story）
- ❌ 不填充任何实际叙事内容
