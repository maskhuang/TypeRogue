# Story 60.19: STAT 命令接已有键位统计 · 艺术改造 + 功能迁移

Status: done

<!-- Epic 60-Followup · 优先级 P2（已有数据，纯迁移工作） -->
<!-- Source: Story 60.16 code-review 完成后用户 dogfood 反馈 -->
<!-- Scope clarified 2026-04-29: 不新增 collector，仅迁移 classic shop 已渲染的 per-key freq / score 数据到 terminal STAT ASCII 视图 -->

## Story

As a **打字商店玩家**,
I want **终端 `STA` (`STAT` / `STATS`) 命令显示当前 run 真实的 per-key freq / score / 锁定状态，而不是 hardcoded 假数据**,
so that **能在购买决策前看到与 classic shop keyboard slot 上一致的真实键位状态**.

## 背景

`shopTerminal.ts:cmdStats` 自 Phase 1 起就是 stub — 函数体注释挂 `STUB · P1.4 wires real data`，hardcoded：

```
KEY USAGE       FREQ    DPS     ACC
A  ████████      9     142     94%
E  ███████       8     128     91%
TOP CONTRIBUTOR: LOZ-204 (38% of total)
WEAKEST KEY:     J (FREQ-LOCKED)
```

而 **classic shop 路径** (`systems/shop.ts:3427-3548`) 已在每个 keyboard slot 上渲染了：
- **freq** = `calculateLetterFrequency(state.player.wordDeck).get(k)` — 该字母在词库中累计出现次数
- **score** = aggregated `state.wordEffects` (Story 14.x letter upgrade) — 字母升级带来的额外底分
- **freq-locked** = `freq < FREQ_UNLOCK_THRESHOLD` (Story 20.2 zero-freq lock 标点键豁免)

**60-19 仅做艺术改造 + 功能迁移** — 把这些 per-key 数字以 DPCA 终端 ASCII bar chart 风格渲染。**不需要新建 collector / 不需要 DPS / accuracy 计算**（这些 metric 不存在数据源，不在本 story 范围）。

## Acceptance Criteria

1. **AC1：FREQ 列接真实 letterFreqs** —— 显示 top-N 高频键，每行 `key | bar chart | freq number`，bar 长度按 max freq 缩放（≤ 20 字符）

2. **AC2：SCORE 列接真实 wordEffects 加成** —— 复用 `systems/shop.ts:3499-3515` 的 score 计算逻辑（base_score + base_multiplier 聚合），抽到共享 helper（避免双份实现漂移）

3. **AC3：LOCKED 状态高亮** —— 显示 `freq < FREQ_UNLOCK_THRESHOLD` 的键，用 `redacted` CSS class 渲染（已有的暗红终端字符）；punctuation 键豁免与 classic 一致

4. **AC4：TOP CONTRIBUTOR / WEAKEST KEY 计算** ——
   - TOP CONTRIBUTOR = top-1 by freq × (1 + max(0, score))（综合贡献，负 score 不拖低贡献），显示 `KEY · pct%`（占总和百分比）
   - WEAKEST KEY = "上榜" 非标点键中 freq 最低的（"上榜" = 进 letterFreqs 或 letterScores Map 的键）。从未被使用过的字母（freq=0 且无 wordEffect）不参与 weakest 评估——它们不是"弱键"而是"未参与键"。状态标 `(FREQ-LOCKED)` 当 freq < threshold

5. **AC5：UI 风格保留** —— ASCII bar chart + monospace + DPCA 官僚风文案；只换数字/字段；不重做布局；删除 hardcoded `DPS / ACC` 列（无数据源不渲染）

6. **AC6：单元测试** —— mock `state.player.wordDeck` + `state.wordEffects`，断言 cmdStats 输出 contains 真实数字 + LOCKED 状态正确

7. **AC7：i18n 覆盖** —— 复用 `shop.terminal.cmd.stats.*` namespace（与 60-15 i18n coverage 风格一致），新增 keys: `stats.title / stats.col_key / stats.col_freq / stats.col_score / stats.top_contributor / stats.weakest / stats.locked`

## Tasks / Subtasks

- [x] **Task 1: 抽 per-key score 计算到共享 helper（AC: 2）**
  - [x] 1.1 `src/src/systems/letters/LetterScoreAggregator.ts` 新建（或加到现有 LetterFrequencySystem.ts） — 加到 LetterFrequencySystem.ts，避免新模块污染
  - [x] 1.2 export `calculateLetterScores(wordEffects: Map<string, WordEffect>): Map<string, number>` — 输入复用 classic shop 算法（base_score 聚合 → ×base_multiplier → -1）
  - [x] 1.3 classic shop `systems/shop.ts:3499-3515` 改用新 helper（避免漂移）
  - [x] 1.4 验证 classic 渲染 0 行为变化（24 LetterFrequencySystem 测试 100% pass，含 6 新增 helper 测试）

- [x] **Task 2: 重写 cmdStats 接真实数据（AC: 1-5）**
  - [x] 2.1 `src/src/ui/shop/shopTerminal.ts:cmdStats` 删除 hardcoded `appendLine('  A  ████████ ...')` 行
  - [x] 2.2 调 `calculateLetterFrequency(state.player.wordDeck)` + `calculateLetterScores(state.wordEffects)`
  - [x] 2.3 排序 + 渲染 top-10 键的 `key | bar | freq | score`
  - [x] 2.4 LOCKED 状态：`freq < FREQ_UNLOCK_THRESHOLD && !isPunctKey` → `redacted` class
  - [x] 2.5 计算 TOP CONTRIBUTOR + WEAKEST KEY，按 AC4 规则渲染

- [x] **Task 3: i18n keys（AC: 7）**
  - [x] 3.1 `src/src/demo/demo-i18n.ts` 加 zh + en 字符串（8 keys × 2 locale = 16 entries）
  - [x] 3.2 cmdStats 全部走 `t('shop.terminal.cmd.stats.*')`

- [x] **Task 4: 单元测试（AC: 6）**
  - [x] 4.1 `src/tests/unit/ui/shopPreviewStats.test.ts` 新建 ~155 行
  - [x] 4.2 mock state.player.wordDeck = ['cat', 'cat', 'cab'] → 断言 freq A=3, B=1, C=3, T=2
  - [x] 4.3 mock state.wordEffects with base_score 'a' +5 → 断言 SCORE A 列含 5
  - [x] 4.4 freq=0 字母（< FREQ_UNLOCK_THRESHOLD=1）→ 断言渲染含 `[FREQ-LOCKED]` 标记 + `redacted` class

- [ ] **Task 5: 浏览器手动验证（dev 完成提交后由 reviewer 执行）**
  - [ ] 5.1 跑 1-2 关让 wordDeck 累积，#shop-preview → STA → 验证数字与 classic shop slot 上一致
  - [ ] 5.2 freq lock 状态视觉对齐

## Dev Notes

### 数据源详细 (路径)

| 字段 | 来源 | 计算 |
|------|------|------|
| `freq` | `state.player.wordDeck` | `calculateLetterFrequency(wordDeck).get(k)` (`systems/letters/LetterFrequencySystem.ts:18`) |
| `score` | `state.wordEffects` | base_score sum × base_multiplier - 1 (`systems/shop.ts:3499-3515`) |
| `locked` | `freq < FREQ_UNLOCK_THRESHOLD` | `systems/shop.ts:3520` 已有逻辑，常量复用 |
| `punctuation` | `PUNCTUATION_KEYS.includes(k)` | `systems/shop.ts:3519` 标点键豁免锁定 |

### 共享 helper 抽取（关键）

**Why 抽**: classic shop 的 score 算法（line 3499-3515）是 inline。如果 60-19 在 cmdStats 复制粘贴 → 双份代码漂移风险。**抽到 letters/LetterScoreAggregator.ts**：
- classic shop 改用 helper（0 行为变化）
- terminal cmdStats 同时受益
- 未来 STAT 列扩展只改一处

### Risks

- **Helper 抽取破坏 classic shop 的 score 显示** — Mitigation: classic shop ecosystem 测试覆盖 score 渲染，抽取后跑全套确认 0 退化
- **Bar chart 缩放 max freq 为 0 时除零** — Mitigation: `if (maxFreq === 0) return appendLine('NO ACTIVITY YET', 'dim')` 兜底
- **wordDeck 为空（首关入店）** — Mitigation: 显示 "NO TYPING ACTIVITY · BUY WORDS TO SEED FREQUENCY" 替代 stub

### References

- [Source: src/src/ui/shop/shopTerminal.ts:cmdStats] — 当前 stub 实现
- [Source: src/src/systems/shop.ts:3427-3548] — classic shop 已渲染的 per-key freq/score 算法
- [Source: src/src/systems/letters/LetterFrequencySystem.ts:18 calculateLetterFrequency] — freq 计算
- [Source: src/src/core/constants.ts: FREQ_UNLOCK_THRESHOLD] — 锁定阈值（Story 20.2）

## Previous Story Intelligence (60.16)

**Architecture lessons from 60.16 module split**:
- shopTerminal/shopWorkbench/shopBootstrap 互不直接 import，cross-module 调用走 `shopBus`（state 模块的 callback registry）
- ✅ **本 story 不破坏此约束** — cmdStats 在 shopTerminal 内部，调用 `state.X` + 复用 letters 系统 helper（systems/letters/）即可，无需 cross-module
- shopBus 在 module-load IIFE 自动 wire（review fix），测试场景中所有 callback live

**Patterns to reuse**:
- 使用 `appendLine(text, cls)` + `appendBlank()` 走终端输出（`shopTerminal.ts:appendLine`）
- 使用 `t('shop.terminal.cmd.stats.*')` i18n 走 `demo-i18n.ts`
- 60.16 已经 export `escapeHtml` 到 shopState 复用 — 本 story 字符串不含 HTML 特殊字符可不用

**File List (60.16 final 4 模块)**:
- shopState 145 行 / shopTerminal 1133 / shopWorkbench 498 / shopBootstrap 836 / facade 36
- AC1 行数上限已放宽到 1200/500/900/200，本 story 加 ~60-100 行进 shopTerminal 仍在限内

## Architecture Compliance

- **核心架构**: `docs/game-architecture.md` (本项目主架构文档)
- **数据流**: state.player.wordDeck → calculateLetterFrequency() → cmdStats 渲染（无新 state field）
- **共享 helper 边界**: 复用 systems/letters/* 内的现有 / 新增 helper；不在 ui/shop/* 内重新实现 freq 算法

## Dev Agent Record

### Implementation Plan / Decisions

- **Helper 落点**：放进 `LetterFrequencySystem.ts`，与 `calculateLetterFrequency` / `getWordEffectModifiers` 同模块（按 letter 维度聚合的算法都在一处）；不新建 LetterScoreAggregator.ts 文件以减少模块膨胀。
- **算法 1:1 同源**：从 `systems/shop.ts:3499-3515` inline 抄来，公式 `round((1 + sum) * mult - 1)`；分歧点：helper 拒收无 `targetLetter` 的 `base_multiplier`（与 classic 一致——它隐式 `effect.targetLetter?.toLowerCase()` 短路）。
- **TOP CONTRIBUTOR 综合贡献定义**：`freq × (1 + max(0, score))`，避免负 score 把贡献拉成负。WEAKEST KEY 取非标点最低 freq。
- **bar chart 缩放**：`barLen = round(freq / maxFreq * STATS_BAR_WIDTH)`，maxFreq 兜底 0 已通过空 wordDeck 早返回处理（不会到 bar 渲染）。
- **i18n key namespace**：`shop.terminal.cmd.stats.{title,col_header,no_activity,locked,top_contributor,weakest_key,footer}`，与 60.15 的 `shop.terminal.cmd.help.*` 同 namespace 风格。

### Completion Notes

- ✅ 所有 7 个 AC 满足
- ✅ Task 1-4 全部完成并测试通过；Task 5 手动验证留给 reviewer
- ✅ 24 个 LetterFrequencySystem 测试 + 11 个 cmdStats 测试 100% pass
- ✅ tsc baseline 持平 249（pre-existing errors，非本 story 引入）
- ✅ 未引入 cross-module bus 依赖，符合 60.16 模块约束
- ⚠ 既有 baseline 测试失败（shopI18nCoverage / shopPreviewInfoOwned 等）经 stash diff 验证为 pre-existing，与本 story 改动无关

### File List

- `src/src/systems/letters/LetterFrequencySystem.ts`（+39 行，新增 `calculateLetterScores`）
- `src/src/systems/shop.ts`（-17 +2 行，inline score 算法替换为 helper 调用）
- `src/src/ui/shop/shopTerminal.ts`（cmdStats 重写，+~75 行 -12 行 hardcoded ASCII bar；review L3 fix sort tiebreak）
- `src/src/demo/demo-i18n.ts`（+16 行：zh+en 各 8 个新 key）
- `src/tests/unit/systems/letters/LetterFrequencySystem.test.ts`（+58 行，6 个新 calculateLetterScores 测试）
- `src/tests/unit/ui/shopPreviewStats.test.ts`（新建，~165 行，11 个测试；review M1+M2+M5+L1 fix）
- `src/tests/unit/ui/shopI18nCoverage.test.ts`（review M4 fix：SHOP_I18N_KEYS 新增 7 个 stats keys）
- `docs/implementation-artifacts/sprint-status.yaml`（status: ready-for-dev → review → done）
- `docs/implementation-artifacts/60-19-stats-real-data.md`（status + Dev Agent Record + review M3+L2 spec fix）

### Senior Developer Review (AI)

**Reviewer:** code-review workflow
**Date:** 2026-04-30
**Outcome:** Approved (post-fix)

**Findings:** 0 High, 5 Medium, 3 Low — all addressed in the same session.

**Action Items:**

- [x] [AI-Review][Med] M1 — Vacuous assertion in AC3 punctuation test (`shopPreviewStats.test.ts:120`)
- [x] [AI-Review][Med] M2 — `as any` test mocks superseded by typed `WordEffect` import
- [x] [AI-Review][Med] M3 — Story spec clarified: WEAKEST scope is "上榜" keys only
- [x] [AI-Review][Med] M4 — `shopI18nCoverage` SHOP_I18N_KEYS list updated with 7 stats keys
- [x] [AI-Review][Med] M5 — TOP CONTRIBUTOR test asserts specific `33%` percentage
- [x] [AI-Review][Low] L1 — `findBarRow` anchored regex replaces brittle `findLine(' A ')`
- [x] [AI-Review][Low] L2 — AC6 stale "threshold 5" → "FREQ_UNLOCK_THRESHOLD=1"
- [x] [AI-Review][Low] L3 — Sort tiebreak alphabet-only (drop score secondary)

### Change Log

- 2026-04-30: Implementation completed. Helper extracted, classic shop refactored to use helper (0 behavior change verified by ecosystem tests), cmdStats rewritten with real data + ASCII bar chart + LOCKED highlight + TOP/WEAKEST computation, i18n full coverage (zh+en), 11 new unit tests + 6 helper tests pass.
- 2026-04-30: Code review (8 findings: 5 M + 3 L) — all fixed:
  - M1 fix: AC3 punctuation test 加 `expect(semiLine).toBeDefined()`，消除 vacuous assertion
  - M2 fix: 测试 mock 改用 `WordEffect` 类型，去掉 `as any`
  - M3 fix: AC4 spec 文字澄清 — WEAKEST 仅在"上榜键"集合内评估（freq=0 且无 wordEffect 的字母不参与）
  - M4 fix: shopI18nCoverage `SHOP_I18N_KEYS` 列表新增 7 个 stats keys
  - M5 fix: TOP CONTRIBUTOR 测试改为断言具体 `33%` 数值
  - L1 fix: 引入 `findBarRow()` helper（anchored regex），替代脆弱的 `findLine(' A ')` 模糊匹配
  - L2 fix: AC6 文档 `threshold 5` → `FREQ_UNLOCK_THRESHOLD=1`
  - L3 fix: bar chart 排序去掉 score 二级 key，平手时直接按字母 a→z
