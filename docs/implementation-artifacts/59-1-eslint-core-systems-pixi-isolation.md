# Story 59.1: ESLint core/systems PixiJS 隔离

Status: planned
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

- [ ] **Task 1: 确认 ESLint 配置格式** — 检查项目是 `.eslintrc.js` / `.eslintrc.json` / `eslint.config.js`（flat config），决定修改位置
- [ ] **Task 2: 编写 overrides 规则** — 按 AC1 代码片段添加；若已有 overrides，合并而非覆盖
- [ ] **Task 3: 负例测试** (AC2) — 创建测试文件，确认报错消息正确，删除
- [ ] **Task 4: 全仓 lint 验证** (AC3) — `npm run lint`，修复任何非 M-1 的意外副作用
- [ ] **Task 5: 文档登记** (AC6)

## Dependencies

- **阻塞前置:** Story 59.7 必须先完成（审计并修复所有已有 M-1 违反）
- **下游:** Epic 57 (Godot Migration) 依赖本规则保证

## Non-Goals

- ❌ 不禁止 `scenes/` 和 `ui/` 使用 PixiJS（那是预期的）
- ❌ 不重构已有代码（修复走 59.7）
- ❌ 不引入运行时检查
