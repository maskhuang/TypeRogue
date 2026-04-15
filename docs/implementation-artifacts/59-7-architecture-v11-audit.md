# Story 59.7: v1.1 架构审计（已有代码合规扫描）

Status: planned (P0, blocks 59.1/59.2/59.5)
Epic: 59
Architecture version: v1.1 (`docs/game-architecture.md` 2026-04-15)

## Story

As a 即将在 Epic 59 上线一系列硬约束规则（ESLint / pre-commit hook）的维护者,
I want 一份清晰的审计报告，列出当前代码库中所有违反 v1.1 架构规则的位置 + 修复状态,
so that 在 59.1 / 59.2 / 59.6 上线约束规则时，CI 不会因为历史债务直接变红，也让团队对"架构和现实的 gap 有多大"有明确认知。

## Acceptance Criteria

1. **AC1: 审计报告文档** — 新建 `docs/implementation-artifacts/59-7-audit-report.md`，按规则分章节列出所有违反：
   - **§M-1 违反**: `core/` 和 `systems/` 下 import PixiJS 的文件列表
   - **§C-4 违反**: `src/` 下引用 `aigc-art/` 的位置（预期：0）
   - **§W-2 违反**: 历史上把 wordpack 塞进 relic 槽位或类型的代码（grep `wordpack.*relic` / `relic.*wordpack` / 任何将词包当作遗物处理的位置）
   - **§N-1 违反**: `scenes/` 和 `ui/` 下硬编码玩家可见中文字符串的统计（不必全部修复，但需要 **计数 + 典型案例 10 个**，作为 Epic 58 填充的 backlog 输入）
   - **§C-1 违反**: `aigc-art/runs/` 下当前已入库的文件列表（预期：0 或极少）
2. **AC2: M-1 违反必修** — 所有 `core/` 和 `systems/` 的 PixiJS import 违反必须在本 story 内修复：
   - 选项 A: 将相关代码搬到 `scenes/` 或 `ui/`
   - 选项 B: 通过 eventBus emit 抽离视觉反馈（M-2 的落地方式）
   - 选项 C: 若为合理例外，写入 `docs/implementation-artifacts/59-7-audit-report.md` 的"已豁免"章节并加上 `// eslint-disable-next-line no-restricted-imports` 注释 + 豁免理由
3. **AC3: W-2 违反必修** — 若审计发现历史代码把 wordpack 当 relic 处理，必须拆分或添加类型防护（此修复可能触发下游 story，需要在报告中列出）
4. **AC4: C-4 违反必修** — 任何 `src/` 引用 `aigc-art/` 的位置必须修复或删除
5. **AC5: N-1 违反为信息性** — 不在本 story 修复硬编码文本（那是 Epic 58 的范畴），只记录 count + 10 个典型文件 + 每个文件的行号/字符串样本
6. **AC6: C-1 违反必修** — `aigc-art/runs/` 下任何已入库文件必须从索引移除（`git rm --cached`，保留本地文件）
7. **AC7: 审计命令可重复** — 报告末尾附 "审计命令" 章节，写明每条规则的 grep / lint 命令，方便后续复跑
8. **AC8: 下游 story 创建** — 若审计发现的问题超出 59.7 单 story 可承载的工作量（特别是 N-1 count 过大或 W-2 牵涉重大重构），在报告末尾创建 **follow-up story 列表**（不立即实现，仅登记）
9. **AC9: 完成后解锁** — 本 story 完成后，更新 Epic 59 索引文件标记 59.1 / 59.2 / 59.5 为"可开工"

## Tasks / Subtasks

- [ ] **Task 1: M-1 扫描** — `grep -r "from 'pixi" src/renderer/core src/renderer/systems` + `@pixi/` 变体，收集结果
- [ ] **Task 2: M-1 修复** — 按 AC2 的 A/B/C 三选一逐个处理
- [ ] **Task 3: C-4 扫描** — `grep -r "aigc-art" src/` 收集结果
- [ ] **Task 4: C-4 修复** — 按 AC4
- [ ] **Task 5: W-2 扫描** — 多路 grep（`wordpack`, `WordPack`, `word_pack`, `relic.*word`, `word.*relic`）+ 人工判断
- [ ] **Task 6: W-2 修复或登记** — 按 AC3
- [ ] **Task 7: N-1 扫描（信息性）** — 在 `src/renderer/scenes/`、`src/renderer/ui/` 下 grep 中文字符串正则（如 `/['"`][^'"\x00-\x7f]+['"`]/`），计数 + 取 10 个样本
- [ ] **Task 8: C-1 扫描** — `git ls-files aigc-art/runs/`，若非空执行 `git rm --cached`
- [ ] **Task 9: 写审计报告** (AC1, AC7)
- [ ] **Task 10: 创建 follow-up story（如需）** (AC8)
- [ ] **Task 11: 更新 Epic 59 索引** (AC9)

## Dependencies

- **前置:** `docs/game-architecture.md` v1.1 ✅
- **阻塞下游:** Story 59.1 / 59.2 / 59.5 / 59.6 都需要本 story 完成后才能干净上线

## Non-Goals

- ❌ 不修复 N-1（硬编码文本）— 那是 Epic 58 的范畴
- ❌ 不建立任何新骨架（那是 59.3/59.4/59.5）
- ❌ 不做性能或架构质量的全面 review（只针对 v1.1 硬规则）
- ❌ 不评估现有代码的"代码质量"，只查"是否违反 v1.1 硬规则"
