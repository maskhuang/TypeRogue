# Story 59.2: ESLint aigc-art 运行时隔离

Status: planned
Epic: 59
Architecture rule: **C-4** (`docs/game-architecture.md` v1.1 §Content Architecture / AIGC Content Pipeline)

## Story

As a 维护 AIGC 美术管线与游戏运行时边界的开发者,
I want `src/**` 下的任何代码被 ESLint 禁止 import 或引用 `aigc-art/` 路径下的任何模块,
so that AIGC 管线始终是构建期工具链，不会因为一时方便被游戏运行时依赖，保证生产管线可以独立演进/迁移。

## Acceptance Criteria

1. **AC1: ESLint 规则配置** — 在 `.eslintrc` overrides 段针对 `src/**/*.ts` 新增：
   ```js
   "no-restricted-imports": ["error", {
     "patterns": [{
       "group": ["**/aigc-art/**", "../aigc-art/*", "../../aigc-art/*"],
       "message": "架构规则 C-4: src/ 不得引用 aigc-art/ — AIGC 是构建期工具链，不是运行时依赖（见 docs/game-architecture.md §AIGC Content Pipeline）"
     }]
   }]
   ```
2. **AC2: 与 59.1 合并** — 若 59.1 已经建立 overrides 段，将本规则合并到同一配置中，避免多个 overrides 块重复。
3. **AC3: 负例测试** — 临时在 `src/renderer/core/_test_c4.ts` 写 `import { foo } from '../../../aigc-art/smoke_pipeline'`，lint 必须失败。验证后删除。
4. **AC4: 正例通过** — `npm run lint` 全仓通过（审计已无 C-4 违反）。
5. **AC5: 文档登记** — `docs/game-architecture.md` §AIGC Content Pipeline 的 C-4 规则后补一行"已于 Story 59.2 落地"。

## Tasks / Subtasks

- [ ] **Task 1: 确认 aigc-art/ 的相对路径深度** — 推算 `src/renderer/core/` 到 `aigc-art/` 的最深相对路径
- [ ] **Task 2: 合并到 59.1 的 overrides** (AC2)
- [ ] **Task 3: 负例测试** (AC3)
- [ ] **Task 4: 全仓验证** (AC4)
- [ ] **Task 5: 文档登记** (AC5)

## Dependencies

- **软依赖:** Story 59.1 推荐先行（复用其 overrides 配置）
- **前置:** Story 59.7 审计确认无违反

## Non-Goals

- ❌ 不禁止 `aigc-art/` 内部互相引用
- ❌ 不禁止从 `aigc-art/` 读取 `docs/` 或 `assets/`（那是正向依赖）
