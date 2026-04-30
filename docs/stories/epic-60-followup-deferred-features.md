---
title: "Epic 60-Followup: 商店改造收尾 · Phase 1 遗留 stub 实功能化"
epic_key: "epic-60-followup"
status: "backlog"
created: "2026-04-29"
parent_epic: "epic-60"
source_documents:
  - docs/implementation-artifacts/60-16-module-split.md
  - src/src/ui/shop/shopBootstrap.ts
  - src/src/ui/shop/shopTerminal.ts
  - src/src/ui/shop/shopWorkbench.ts
stories:
  - "60-17-drag-hover-preview"
  - "60-18-effect-range-highlight"
  - "60-19-stats-real-data"
  - "60-20-filed-real-data"
  - "60-21-terminal-i18n-coverage-completion"
---

# Epic 60-Followup: 商店改造收尾 · Phase 1 遗留 stub 实功能化

## 背景

Epic 60 (Phase 2 主流程接入) 16/16 done — 但 Story 60.16 收官后 (`code-review approved 2026-04-29`) **dogfooding 暴露 4 个 Phase 1 遗留 stub**：

1. **拖拽中产出 tooltip 屏蔽** — Story 60.9 主动写了 `if (dragManager.dragging) return;` 不显示，理由"拖拽时挡视线"。但 dogfood 显示**寻找最佳键位时反而需要**比对各键的预估产出。
2. **范围技能（splash / echo / aura / relay）影响范围键盘高亮 — 从未实现** — 多格 tetromino 的 *shape placement* 已迁，但单格技能的 *effect radius* 高亮在 Phase 1/2 都未做。
3. **`STAT` (`STA`) 终端命令仍是 hardcoded ASCII bar chart** — 函数体注释自挂 `STUB · P1.4 wires real data`，从 Phase 1 拖到现在。
4. **工作台右侧 FILED 区 SKILL/RELIC folder 是 hardcoded HTML 假数据** — `buildWorkbenchScreen` 模板硬编 `DRIP CASCADE / PAPERCLIP CHAIN / FOSSILIZED MEMO / COLD COFFEE RING` 等占位。WORDS folder 已接真实 `state.player.wordDeck`，但 SKILL/RELIC 没接。

这 4 项**都不是 Story 60.16 拆分引入的回归** — git 验证 Phase 1 commit (`3325a67`) 时已是同样状态；60.16 仅按职能搬运，未改逻辑。本 epic 把它们打包收尾。

## 设计目标

- **Dogfood-driven**：4 项都来自 60.16 done 后实际试玩的 review 反馈，优先级按"日常使用频率"排（drag preview 最高，filed real data 最低）
- **不破坏 60.x 现有路径**：所有改动在 4 模块（state/terminal/workbench/bootstrap）内增量，不改 facade、不改 `__test`、不改 11 个既有 `shopPreview*.test.ts`
- **AC10 manually validated**：每个 story 完成后必须浏览器手动验证（60.16 AC10 deferred 教训）

## 非目标（Out of Scope）

- **拖拽预览 tooltip 的位置 / 样式重设计** — 60-17 复用 `keyTooltip.show` 现有定位逻辑，不引入新 tooltip 组件
- **范围高亮的视觉风格创新** — 60-18 复用 `highlightShapePlacementOnWorkbench` 的 CSS class 体系（`.kb-key.shape-preview-ghost` 等），仅扩到 effect radius 类型
- **STAT 命令的 UI 革新** — 60-19 仅替换数据源，保留终端 ASCII 渲染风格
- **FILED folder 的交互升级** — 60-20 仅渲真实数据，保留只读 readout 形态（不加 hover、点击、详情查看 — 这些是 future epic 的料）

## 依赖

| 依赖 | 来源 | 说明 |
|---|---|---|
| `keyTooltip.show / hide` | Story 35.11 | 60-17 复用 |
| `buildSkillKeyTooltipData` | Story 35.11 + 60.9 | 60-17 复用：拖拽 ghost 上下文需变体 (target-key 视角) |
| `dragManager.dragging` / `dragManager.payload` | Phase 1 dragManager | 60-17 解除拖拽中 tooltip 屏蔽 |
| `highlightShapePlacementOnWorkbench` / `clearShapePlacementOnWorkbench` | Phase 1 shapePreview.ts | 60-18 参考 + 扩展到 effect radius |
| `keyboardAdjacencyMap` | Epic 2 (Story 2.1) | 60-18 splash/aura 半径计算依赖 |
| `state.battleStats` (per-key freq / DPS / accuracy) | Epic 31 (Story 31.6 stage rating) 或 battle session metrics | 60-19 数据源待勘察 (有可能需新 stat 收集器) |
| `state.player.skills / state.affixSkills / state.player.relics + RELICS` | core/state | 60-20 数据源 |

## 风险

| 风险 | 缓解 |
|---|---|
| 60-17 拖拽中显示 tooltip 反而**真的挡视线**（Story 60.9 原始顾虑成立） | 加 user setting toggle `shopDragPreviewTooltip` (默认 on)，让玩家关 |
| 60-18 范围高亮和 60-1 的 shape placement 高亮**视觉重叠**（多格技能拖拽时既高亮形状又高亮影响范围 → 一片乱） | 优先级：shape placement > effect radius；多格技能拖拽时**只显示 shape**，单格技能拖拽时才显示 effect radius |
| 60-19 真实 stat 收集器在 battle 模块**不存在或零碎**（key freq 可能要新增 collector） | 60-19 第 1 个 task 是 prospecting：grep `state.battleStats` / `keyTracker` 等，先确认数据源；不存在则 60-19 拆 sub-story 60-19a (collector) + 60-19b (display) |
| 60-20 改 FILED folder HTML 模板 → buildWorkbenchScreen 行数继续增长 | 把 SKILL/RELIC folder 渲染抽出到 `renderFiledFolders()` 函数（参考 60.16 拆分方法论），保持 buildWorkbenchScreen 作为骨架 |

## 总工作量估算

| Story | 复杂度 | LOC | 测试 |
|---|---|---|---|
| 60-17 拖拽 hover preview | M | ~80 | unit + manual |
| 60-18 范围高亮 | L | ~120 | unit + manual |
| 60-19 STAT 真实数据 | M (待 prospect) | ~60-200 | unit |
| 60-20 FILED 真实数据 | S | ~30 | unit |

**总计约 2-4 个 dev session**。建议按 60-20 → 60-17 → 60-19 → 60-18 顺序做（先做 risk 最低收益最高的）。

## 收官标准

- 4 个 story 全部 done + code-review approved
- 浏览器手动验证主流程：拖拽寻位 / 单格范围技能高亮 / STAT 显示真实数据 / FILED 显示真实 owned skills + relics
- Epic 60 + epic-60-followup 一起 mark done，触发 epic-60-retrospective
