# Epic 59: Architecture v1.1 Enforcement

Status: planned
Date: 2026-04-15
Source: `docs/game-architecture.md` v1.1 (2026-04-15)

## Overview

在 `docs/game-architecture.md` v1.1 升级后（新增 Migration Target / Narrative / Wordpack / Affix-Modifier / AIGC Pipeline），本 Epic 把 **架构层面的硬约束** 落地为可执行的自动化规则与最小可用骨架，让后续 AI agent 实现时**默认就对齐架构**，而不是靠人工 review 兜底。

**设计原则:**
- 只做"骨架 + 强制规则"，不做功能实现
- 所有规则必须能自动化（lint / hook / CI），不依赖人工
- 优先修复已有违反，再落规则，避免 CI 一上就红

## Stories

| # | Story | 对应架构规则 | 优先级 |
|---|---|---|---|
| 59-1 | ESLint core/systems PixiJS 隔离 | M-1 | P0 |
| 59-2 | ESLint aigc-art 运行时隔离 | C-4 | P1 |
| 59-3 | NarrativeRegistry 骨架 + 7 bundle 文件 | N-1/N-2 | P1 |
| 59-4 | modifiers/ 横向层骨架 | A-1/A-2 | P1 |
| 59-5 | wordpack/ 系统骨架 | W-1/W-2 | P1 |
| 59-6 | AIGC 原始产物 pre-commit hook | C-1 | P2 |
| 59-7 | v1.1 架构审计（已有代码合规扫描）| 全部 | P0 (前置) |

**执行顺序:** 59-7 必须先做（否则 59-1 上 lint 就红）→ 59-1 / 59-2 并行 → 59-3 / 59-4 / 59-5 并行 → 59-6 收尾。

## Dependencies

- **前置:** `docs/game-architecture.md` v1.1（✅ 已完成 2026-04-15）
- **下游解锁:**
  - Epic 58（Narrative Layer Landing）依赖 59-3 的 NarrativeRegistry
  - Epic 57（Godot Migration）依赖 59-1 的隔离保证
  - 后续 affix 相关 story（epic 34/35/45）依赖 59-4 的 modifier 骨架

## Non-Goals

- ❌ 不实现具体叙事内容（走 Epic 58）
- ❌ 不实现具体 affix 功能（走 affix 相关 epic）
- ❌ 不迁移 Godot（走 Epic 57）
- ❌ 不改变现有运行时行为（本 epic 是纯结构 + 约束）

## Success Criteria

1. `npm run lint` 通过，且违反 M-1 / C-4 的任何新代码会被 lint 拒绝
2. `NarrativeRegistry` / `ModifierEngine` / `WordpackRegistry` 三个骨架可被 import 并有单元测试
3. `aigc-art/runs/` 下的任何文件无法通过 `git commit` 进入仓库（pre-commit hook 拦截）
4. 审计报告 `docs/implementation-artifacts/59-7-audit-report.md` 列出所有历史违反并标记 fix 状态
