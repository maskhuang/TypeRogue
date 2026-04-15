# Story 59.6: AIGC 原始产物 pre-commit hook

Status: planned
Epic: 59
Architecture rule: **C-1** (`docs/game-architecture.md` v1.1 §AIGC Content Pipeline)

## Story

As a 担心 AIGC 原始输出被不小心 commit 进仓库的维护者,
I want 一个 git pre-commit hook 拦截 `aigc-art/runs/` 下的任何文件,
so that 即使 `git add .` 或 AI agent 手滑，也不会把未经人工筛选的原始产物推入仓库，保证 `assets/` 始终是经过 curation 的产物。

## Acceptance Criteria

1. **AC1: Hook 脚本** — 新建 `.githooks/pre-commit`（或项目既有 hook 管理工具如 husky / simple-git-hooks 的路径），脚本内容：
   ```sh
   #!/usr/bin/env sh
   # 架构规则 C-1: aigc-art/runs/ 原始产物禁止 commit
   # 见 docs/game-architecture.md §AIGC Content Pipeline
   BLOCKED=$(git diff --cached --name-only --diff-filter=AM | grep -E '^aigc-art/runs/' || true)
   if [ -n "$BLOCKED" ]; then
     echo "❌ 阻止 commit: 以下文件位于 aigc-art/runs/ 原始产物目录（架构规则 C-1）："
     echo "$BLOCKED"
     echo ""
     echo "处理方式："
     echo "  1. 若是 AIGC 原始输出 → 不要入库，它们应该经过人工筛选后放到 assets/"
     echo "  2. 若确实需要归档 → 见 docs/game-architecture.md §AIGC Content Pipeline 的 curation 流程"
     echo "  3. 紧急绕过 → git commit --no-verify（不推荐，必须在 PR 中说明）"
     exit 1
   fi
   ```
2. **AC2: Hook 安装机制** — 二选一：
   - (a) 若项目已有 husky / simple-git-hooks：按其规范配置
   - (b) 若无：配置 `core.hooksPath = .githooks` 并在 `package.json` 的 `postinstall` 脚本自动执行 `git config core.hooksPath .githooks`
3. **AC3: 正例测试** — 正常 commit `src/` 下文件不受影响
4. **AC4: 负例测试** — `touch aigc-art/runs/test.png && git add aigc-art/runs/test.png && git commit -m "test"` 必须失败并显示 C-1 错误消息。测试后清理。
5. **AC5: .gitignore 补强** — 在 `.gitignore` 追加 `aigc-art/runs/*` 作为第二道防线（hook 是主动拦截，gitignore 是被动屏蔽）。保留 `aigc-art/runs/.gitkeep` 让目录本身入库。
6. **AC6: 文档登记** — `docs/game-architecture.md` §AIGC Content Pipeline 的 C-1 规则后补一行"已于 Story 59.6 落地"。

## Tasks / Subtasks

- [ ] **Task 1: 确认项目已有 hook 管理工具** — `ls .husky/ package.json` 检查
- [ ] **Task 2: 编写 hook 脚本** (AC1)
- [ ] **Task 3: 配置安装机制** (AC2)
- [ ] **Task 4: .gitignore 补强** (AC5)
- [ ] **Task 5: 正例 + 负例测试** (AC3, AC4)
- [ ] **Task 6: 文档登记** (AC6)

## Dependencies

- 独立，可在 Epic 59 任何时点完成

## Non-Goals

- ❌ 不做 server-side hook（client-side 足够）
- ❌ 不禁止 `aigc-art/prompts/` 或 `aigc-art/*.py` 等入库（这些是管线本身）
- ❌ 不检查 `assets/` 下内容是否真的经过 curation（那是 review 职责）
