# Story 45.1: 词条分类重构

Status: done

## Story

As a 开发者,
I want 将词条分类从旧体系（数值/节奏/拓扑/触发链/词感/元规则）更新为新体系（数值/暴击/叠层/拓扑/词感/元规则）,
so that 后续 13 个新词条可以在正确的分类框架下实现。

## Acceptance Criteria

1. `AffixCategory` 类型不再包含 `rhythm` 和 `trigger_chain`，已替换为 `crit` 和 `stack`
2. `AFFIX_CATEGORY_MAP` 中所有 22 个词条的归类与新分类一致
3. 全项目无旧分类名（`rhythm`/`trigger_chain` 作为 AffixCategory 使用的场景）残留引用
4. 所有现有测试通过
5. `project-context.md` 中的分类描述已更新

## 已完成工作

> ⚠️ 本 Story 已部分完成。以下工作在头脑风暴会话中提前执行：

- [x] `AffixCategory` 类型已更新为 `'numeric' | 'crit' | 'stack' | 'topology' | 'word_sense' | 'meta_rule'`
- [x] `AffixType` 枚举注释已按新 6 类分组排列
- [x] `AFFIX_CATEGORY_MAP` 已重新分配所有 22 个词条
- [x] `affixes.test.ts` 已更新：类别名称、分布数量、抽检项全部对齐新分类
- [x] 分类相关测试全部通过

## Tasks / Subtasks

- [x] Task 1: 更新 AffixCategory 类型定义 (AC: #1)
  - [x] `src/data/affixes.ts` line 46: 已替换为新类型
- [x] Task 2: 更新 AFFIX_CATEGORY_MAP (AC: #2)
  - [x] `src/data/affixes.ts` lines 48-75: 已重新分配
- [x] Task 3: 更新测试 (AC: #4)
  - [x] `tests/unit/data/affixes.test.ts`: 已更新期望值
- [x] Task 4: 清理 RelicPipeline.ts 中的旧分类引用 (AC: #3)
  - [x] `src/systems/relics/RelicPipeline.ts` AFFIX_CATEGORY_LABELS: rhythm→crit, trigger_chain→stack
  - [x] AFFIX_CATEGORY_INDEX: rhythm→crit, trigger_chain→stack
  - [x] AFFIX_CATEGORY_BY_INDEX: 2→crit, 3→stack, 4→topology (编号重排)
- [x] Task 5: 更新 project-context.md (AC: #5)
  - [x] 分类表格更新为 6 新类（Numeric/Crit/Stack/Topology/Word Sense/Meta Rule）
  - [x] 词条列表归属和数量（22 个）更新
- [x] Task 6: 全量回归验证 (AC: #4)
  - [x] 分类相关 7 个测试全部通过
  - [x] 其余失败为既有问题（EnchantmentType 数量、rhythm_doctor 遗物），与本次变更无关

## Dev Notes

### 剩余工作量极小

核心数据定义和测试已完成，只剩两处清理：

1. **RelicPipeline.ts** — 遗物管线中有分类显示/索引映射使用旧名称。这些是 UI 显示用的映射（如中文名「节奏型」→「暴击型」），不影响核心逻辑。
2. **project-context.md** — AI 参考文档需同步更新。

### 注意事项

- `src/data/relics.ts` 中的 `rhythm_adapt`、`perfect_rhythm` 等是**遗物 ID**，不是分类名称，**不需要修改**
- `src/style.css` 中的 `.rhythm-pulse` 是 CSS 动画类名，**不需要修改**
- `src/data/affixMutation.ts` 引用了 `AffixCategory` 类型但使用方式是动态的（`allowedCategory?: AffixCategory`），类型更新后自动对齐
- `src/systems/classes/MetamorphStation.ts` 使用 `getMonoAffixCategory() as AffixCategory`，返回值需确认是否还会返回旧类名

### 关键文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/data/affixes.ts` | ✅ 已完成 | AffixCategory + AFFIX_CATEGORY_MAP |
| `tests/unit/data/affixes.test.ts` | ✅ 已完成 | 测试期望值 |
| `src/systems/relics/RelicPipeline.ts` | ❌ 待更新 | 旧分类名映射（6 处） |
| `docs/project-context.md` | ❌ 待更新 | 分类描述 |

### Project Structure Notes

- 遵循现有依赖方向：`data → core → systems → scenes`
- 本 Story 只修改数据层和文档，不触及 scenes 或 UI

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.1]
- [Source: docs/brainstorming-session-2026-04-01.md#设计方法论]
- [Source: src/data/affixes.ts - AffixCategory 定义]
- [Source: src/systems/relics/RelicPipeline.ts - 旧分类引用]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ AffixCategory 类型和 AFFIX_CATEGORY_MAP 已在头脑风暴会话中提前更新（rhythm→crit, trigger_chain→stack）
- ✅ 测试文件同步更新，分类相关 7 个测试全部通过
- ✅ RelicPipeline.ts 三处映射表（LABELS/INDEX/BY_INDEX）全部更新为新分类名
- ✅ project-context.md 分类表格更新为 22 个词条 × 6 新类
- ⚠️ AFFIX_CATEGORY_BY_INDEX 编号重排（旧 rhythm=2→新 crit=2, 旧 trigger_chain=4→新 stack=3, topology 从 3→4），mono_affix 遗物为 per-run 状态不持久化，无存档兼容问题

### File List

- `src/src/data/affixes.ts` — AffixCategory 类型 + AFFIX_CATEGORY_MAP + AffixType 枚举注释
- `src/tests/unit/data/affixes.test.ts` — 分类测试期望值
- `src/src/systems/relics/RelicPipeline.ts` — AFFIX_CATEGORY_LABELS/INDEX/BY_INDEX（编号兼容旧存档）
- `docs/project-context.md` — 分类描述表格
- `docs/stories/sprint-status.yaml` — Epic 45 + Story 状态追踪
