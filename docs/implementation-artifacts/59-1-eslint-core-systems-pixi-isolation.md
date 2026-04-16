# Story 59.1: ESLint core/systems PixiJS 隔离

Status: done
Epic: 59
Architecture rule: **M-1** (`docs/game-architecture.md` v1.1 §Migration Target)
Prerequisite: **Story 59.7 审计必须先完成**（否则 lint 上线即 CI 红）

## Story

As a 准备在未来迁移到 Godot 的开发者,
I want `src/renderer/core/**` 和 `src/renderer/systems/**` 下的代码被 ESLint 硬性禁止 import `pixi.js` / `@pixi/*`,
so that 每次 AI agent（或人）在这两层无意引入 PixiJS 依赖时，CI 会立即失败，保住 Godot 迁移屏障。

## Acceptance Criteria

1. **AC1: ESLint 规则配置** — 在 `.eslintrc`（或 `eslint.config.js`）中新增 `overrides` 段，对 `src/renderer/core/**/*.ts` 和 `src/renderer/systems/**/*.ts` 启用 `no-restricted-imports`：
   ```js
   "no-restricted-imports": ["error", {
     "patterns": [{
       "group": ["pixi.js", "@pixi/*"],
       "message": "架构规则 M-1: core/ 和 systems/ 不得依赖 PixiJS — 为 Godot 移植保留隔离（见 docs/game-architecture.md §Migration Target）"
     }]
   }]
   ```
2. **AC2: 负例测试** — 创建临时测试文件 `src/renderer/core/_test_m1.ts` 写 `import { Container } from 'pixi.js'`，运行 `npm run lint` 必须 **失败** 并报上面的错误消息。验证后**删除**测试文件。
3. **AC3: 正例通过** — `npm run lint` 在当前仓库（审计修复后）整体通过，零 M-1 违反。
4. **AC4: 错误消息清晰** — 违反时的错误消息必须包含架构文档路径与规则编号（"M-1"），让触发者能直接定位。
5. **AC5: CI 集成** — 若项目已有 GitHub Actions / pre-commit 运行 lint，确认新规则已纳入（无需新增 CI job）。
6. **AC6: 文档登记** — 在 `docs/game-architecture.md` §Migration Target 的 ESLint 示例块上补一行"已于 Story 59.1 落地"。

## Tasks / Subtasks

- [x] **Task 1: 确认 ESLint 配置格式** — 项目无任何 ESLint 基础设施；改为从零引入 flat config（`src/eslint.config.js`）+ devDependencies（eslint 9 / typescript-eslint 8 / globals 15）。经用户 2026-04-15 授权扩大范围。
- [x] **Task 2: 编写 overrides 规则** — 在 `src/eslint.config.js` 中以 flat config 形式实现 M-1：对 `src/core/**/*.ts` 和 `src/systems/**/*.ts` 启用 `no-restricted-imports`，禁 `pixi.js` / `@pixi/*`。
- [x] **Task 3: 负例测试** (AC2) — 创建 `src/src/core/_test_m1.ts` 引入 `pixi.js`，`npm run lint` exit=1 且错误消息含 "M-1"；测试后已删除文件。
- [x] **Task 4: 全仓 lint 验证** (AC3) — `npm run lint` exit=0，零违反。另外提供 `npm run lint:arch` 作为 core/systems 快速冒烟脚本。
- [x] **Task 5: 文档登记** (AC6) — `docs/game-architecture.md` §Migration Target 中 ESLint 示例块已更新为实际落地版本并标注"✅ 已于 Story 59.1 落地"。

### Review Follow-ups (AI)

- [x] **[AI-Review][HIGH] H1** — `tests/**` 被 ignore 导致 M-1 对 core/systems 单元测试不生效。已修复：移除 `tests/**` ignore，新增独立 config block 覆盖 `tests/unit/core/**` 和 `tests/unit/systems/**`，用同一套 `m1Rules` 规则对象拦截。负例验证通过（`@pixi/display` 在 test 文件里被拦）。[src/eslint.config.js:83-87]
- [x] **[AI-Review][HIGH] H3** — `no-restricted-imports` 不拦 `require()` 和 dynamic `import()`。已修复：追加 `no-restricted-syntax` 规则，两条 selector 分别拦 `ImportExpression[source.value=/^pixi/]` 和 `CallExpression[callee.name='require']`。负例验证通过（3 lanes 全 fire）。[src/eslint.config.js:31-48]
- [x] **[AI-Review][MEDIUM] M1** — M-1 规则只覆盖 `.ts` 文件。已修复：glob 扩展为 `*.{ts,tsx,mts,cts}`。[src/eslint.config.js:12-19]
- [x] **[AI-Review][MEDIUM] M2** — `**/*.config.js` / `**/*.config.ts` 粗放 ignore。已修复：ignores 收窄为只排除 `eslint.config.js` 自身，其他 config 参与 parser 识别（rules 不启用，噪音为零）。[src/eslint.config.js:52-61]
- [x] **[AI-Review][MEDIUM] M4** — "注册 plugin 但不启用规则" 注释缺少未来清理路径指引。已修复：注释改写为明确说明"未来某个 story 引入 typescript-eslint/recommended 时，应在那里同时重新打开 `reportUnusedDisableDirectives`"。[src/eslint.config.js:73-77]
- [x] **[AI-Review][MEDIUM] M5** — `docs/game-architecture.md` §Enforcement 矩阵未同步"已落地"状态。已修复：第 1349 行矩阵行同步更新为含 "✅ 已于 Story 59.1 落地" 标记，并补充 "static / dynamic / require 三路" 描述。[docs/game-architecture.md:1349]
- [x] **[AI-Review][LOW] L1** — 配置文件顶部注释误用 "overrides 段" 术语。已修复：改为 "config object"（flat config 的正确术语）。[src/eslint.config.js:4]
- [ ] **[AI-Review][HIGH] H2** — AC5 "CI 集成" 以"无 CI 即满足"结案，导致 M-1 规则没有任何自动化执行屏障。**不在本 story 范围内自动修复**（需要决定是建 GitHub Actions 还是等 59-6 pre-commit hook）。**Deferred to Story 59-6**：59-6 (AIGC 原始产物 pre-commit hook) 的 scope 应扩展为同时运行 `npm run lint:arch`，以保证 M-1 和 C-1 规则都在 commit 前被拦截。若 59-6 明确拒绝扩展，需要独立开一个 59-8 story 建立 CI/pre-commit lint pipeline。
- [ ] **[AI-Review][MEDIUM] M3** — `src/package-lock.json` 新增 77 transitive deps 无 SCA 扫描。风险低（全部由 `typescript-eslint` 官方元包带入），**建议不修复**，仅在 Epic 59 回顾时统一评估是否需要接 `npm audit` / Dependabot。
- [ ] **[AI-Review][LOW] L2** — `npm run lint` 未加 `--max-warnings=0`。本 story 无 warning 级规则所以无需修复，**留给首个引入 warning 规则的 story 配套处理**。

### Senior Developer Review (AI)

**Review Date:** 2026-04-15
**Reviewer:** code-review workflow (Claude Opus 4.6)
**Outcome:** Changes Requested → 已处理

**Action Items (10 total):**
- HIGH: 3（H1 / H2 / H3）— H1/H3 已修复，H2 deferred 到 59-6
- MEDIUM: 5（M1-M5）— M1/M2/M4/M5 已修复，M3 建议不修复
- LOW: 2（L1 / L2）— L1 已修复，L2 留给未来 story

**Resolved in this review session:** 7 items（4 HIGH/MEDIUM 代码修复 + 3 文档修复）
**Deferred as tracked follow-ups:** 3 items（H2 到 59-6，M3 到 Epic 59 回顾，L2 到未来 warning-级 story）

**Added negative tests during review:**
- `src/src/core/_neg_static.ts`（静态 import，已删除）
- `src/src/systems/_neg_dynamic.ts`（动态 import，已删除）
- `src/src/core/_neg_require.ts`（require 调用，已删除）
- `src/tests/unit/core/_neg_test.ts`（测试文件中的 @pixi/display，已删除）

全部 4 条负例均触发相应的 M-1 错误消息；删除后 `npm run lint` 回到 EXIT=0。

## Dev Agent Record

### 实现计划与决策

- **意外前置**：审计报告（59-7）关注的是"是否有 M-1 违反"，未检查基础设施。实际仓库**完全没有 ESLint**（无 `.eslintrc*`、无 `eslint.config.*`、无 `lint` script、无 eslint 依赖）。故本 story 范围由"加一条 overrides"扩展为"引入 ESLint 基础设施 + M-1 规则"。已与用户对齐（选项 3 → 按推荐方案落地）。
- **配置位置**：`src/eslint.config.js`（flat config，ESM，与 `"type": "module"` 一致，紧邻 tsconfig / vitest 配置）。
- **范围最小化**：只落 M-1 一条硬规则，**不引入** `typescript-eslint/recommended`、不引入 Prettier、不做类型感知检查（`parserOptions.project`）。理由：recommended 会一次性暴露上千条历史 warning，污染 AC3 "零 M-1 违反" 的信号。
- **路径校正**：story 原文写的是 `src/renderer/core/**`（架构文档抽象路径），实际仓库布局为 `src/src/core/**`；从 `src/` 目录跑 eslint 时相对路径就是 `src/core/**`。配置按实际路径写，并在架构文档的示例块中同步修正。
- **意外副作用 1 — 历史 disable 指令报 "rule not found"**：数据层 schema 文件（`src/src/data/schemas/*.ts`）散落 9 处 `eslint-disable-next-line @typescript-eslint/no-explicit-any`。这些指令指向本 story 未启用的规则。解决方案：注册 `@typescript-eslint` plugin 但不启用任何规则，使指令成为 no-op。
- **意外副作用 2 — "Unused eslint-disable directive" 警告**：ESLint 9 flat config 默认 `reportUnusedDisableDirectives: 'warn'`，会把上述 no-op 指令标成 unused。策略：在 `src/**` 块上显式 `reportUnusedDisableDirectives: 'off'`。历史 disable 清理不在本 story 范围；未来真正启用 recommended 规则集时再重开此项。
- **AC5 CI 集成**：仓库根无 `.github/workflows/`、无 `.husky/`，即当前无 CI pipeline。AC5 以"现状即满足（无需新增 CI job）"结案。pre-commit hook 属于 Story 59-6 范围。

### 验证输出（AC2）

负例测试（`src/src/core/_test_m1.ts` 含 `import { Container } from 'pixi.js'`）：
```
/Volumes/work/project/game/src/src/core/_test_m1.ts
  2:1  error  'pixi.js' import is restricted from being used by a pattern.
        架构规则 M-1: core/ 和 systems/ 不得依赖 PixiJS — 为 Godot 移植保留隔离
        （见 docs/game-architecture.md §Migration Target）  no-restricted-imports

✖ 1 problem (1 error, 0 warnings)
EXIT=1
```

### 验证输出（AC3）

删除负例文件后：
```
> typing-roguelike@0.1.0 lint
> eslint .

EXIT=0
```

`npm run lint:arch`（仅扫 core/systems）同样 EXIT=0。

### File List

**新增:**
- `src/eslint.config.js`

**修改:**
- `src/package.json` — 新增 devDependencies（`eslint@^9`, `typescript-eslint@^8`, `globals@^15`），新增 scripts（`lint`, `lint:arch`）
- `src/package-lock.json` — 依赖锁定（npm 自动更新）
- `docs/game-architecture.md` — §Migration Target ESLint 示例块更新为实际落地版本
- `docs/implementation-artifacts/59-1-eslint-core-systems-pixi-isolation.md` — 本文件
- `docs/implementation-artifacts/sprint-status.yaml` — 59-1 状态 `ready-for-dev` → `review`

**删除（临时文件，AC2 生命周期内）:**
- `src/src/core/_test_m1.ts` — 创建→验证→删除

### Completion Notes

- 全部 6 条 AC 满足：AC1 规则配置、AC2 负例失败、AC3 正例通过、AC4 错误消息含 "M-1" + 文档路径、AC5 无 CI 现状确认、AC6 文档登记。
- **范围扩大已记录**：本 story 现在涵盖"ESLint 基础设施引入"，为 59-2（C-4 运行时隔离）和未来任何 ESLint-based 规则奠基，无需它们再重复安装。
- **未处理的历史债务**（不在本 story 范围，登记供未来 story 参考）：9 处 schema 文件中的 unused `@typescript-eslint/no-explicit-any` disable 指令。建议在未来启用 `typescript-eslint/recommended` 的 story 中一并清理。

### Change Log

- 2026-04-15 — Story 59.1 实现完成：引入 ESLint 9 flat config 基础设施 + M-1 架构规则硬隔离，落地 `src/eslint.config.js`，架构文档 §Migration Target 同步更新。负例验证 exit=1 且错误消息含 "M-1"，正例全仓 lint exit=0。

## Dependencies

- **阻塞前置:** Story 59.7 必须先完成（审计并修复所有已有 M-1 违反）
- **下游:** Epic 57 (Godot Migration) 依赖本规则保证

## Non-Goals

- ❌ 不禁止 `scenes/` 和 `ui/` 使用 PixiJS（那是预期的）
- ❌ 不重构已有代码（修复走 59.7）
- ❌ 不引入运行时检查
