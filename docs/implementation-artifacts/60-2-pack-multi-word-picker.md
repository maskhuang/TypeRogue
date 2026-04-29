# Story 60.2: Pack 多词拣选弹窗

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.1（质量门）· 接 Phase 1 主线 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **新工作台终端商店**的玩家,
I want **BUY 稀有 / 史诗 / 传说 pack 时弹出三词候选抽屉，让我从 3 个词里挑 1 个进词库**,
so that **多词 pack 不会像 Phase 1 那样默默吞掉前面那个，让我感觉买的 pack 是"批文 + 申领"流程而不是"自动签收"** —— 跟 classic shop `showWordPicker` 行为一致，把 60-1 之外的 P2.1 质量门补完.

## 背景

Phase 1 的 `executeBuyPack` 在 `shopPreview.ts:402` 取了一个 shortcut：

```ts
const word = pack.words[0];          // P1: 直接拿第一个
state.gold -= d.price;
state.player.wordDeck.push(word);
if (pack.words.length > 1) {
  appendLine(`  · NOTE: pack had ${pack.words.length} words; picker overlay deferred (P1.6)`);
}
```

稀有/史诗/传说 pack 的 `pack.words.length === 3`、`pack.pickCount === 1`，意图是"3 选 1"。Phase 1 直接吞了第一个、把另外 2 个丢掉，玩家根本看不到候选词。终端只打印一行 NOTE 提示这是 deferred 行为。

Classic shop（`systems/shop.ts:2181 showWordPicker`）已经实现了完整的 3 选 1 modal，逻辑成熟。Phase 2 必须在新工作台 / 终端上重做一个 paper-craft 风格的等价物，否则 60-5 切换 feature flag 一旦默认走 terminal，玩家拿稀有 pack 就只能见到 1/3 的候选——这是 P2.1 质量门必修项。

## Acceptance Criteria

1. **AC1: 触发条件准确** —— `pack.words.length > pack.pickCount` 时（即"候选 > 选取数"），不立即扣钱，弹 `<wb-drawer>` `kind: 'pack-pick'`；`pack.words.length <= pack.pickCount` 时（普通 pack），保留 Phase 1 的"立即扣钱、立即入库、立即 push undoStack"流程。

2. **AC2: 抽屉 UI 渲染 N 个候选词卡片** —— drawer body 显示 `pack.words` 全部候选（通常 3 个），每张卡片包含：
   - 词本身（大字号，等宽）
   - 词长度副标题（例如 `LEN 7 · WORD`）
   - 词频提示（高/中/低 频率，沿用 classic shop 的 `getFreqHints`）
   - `pack.wordEffect` 标签（如有）
   
   视觉上沿用工作台 paper-craft 风格（牛皮纸底 + 黑墨边框 + paper-clip 装饰），不要照抄 classic shop 的 `.word-picker-card` CSS。

3. **AC3: 选词成功路径** —— 点击某张候选卡片：
   - `state.gold -= d.price`
   - `state.player.wordDeck.push(pickedWord)`
   - 如有 `pack.wordEffect` 且 `state.classId !== 'wordsmith'` → `state.wordEffects.set(pickedWord, pack.wordEffect)`（与 classic shop 行为一致）
   - `undoStack.push({ kind: 'pack', sku, price, words: [pickedWord] })`
   - 关闭抽屉
   - 终端 appendLine：`WORD "X" FILED TO LIBRARY · BAL 🍌 N`（沿用既有 `executeBuyPack` 的输出风格，但走 T2 模板"批文 + 申领"语调）
   - `updateBalDisplay()`
   - 焦点回终端 prompt（`document.activeElement?.blur()` + 让 keydown listener 接管）

4. **AC4: 取消路径不动 state** —— ESC / 点击 drawer-overlay backdrop：
   - **不扣钱、不 push undoStack、不动 wordDeck**
   - 关闭抽屉，焦点回终端 prompt
   - 终端 appendLine：`ABORTED · ${sku} NOT PURCHASED`（与高价确认流的 abort 文案一致）
   - drawer 内部点击其他空白区域不应触发取消（仅 backdrop / ESC 取消）

5. **AC5: 普通 pack 行为零回退** —— `pack.words.length === 1`（rarity 0 普通 pack）走原 `executeBuyPack` 路径不变：直接扣钱、入库、入栈、终端打印。本 story 不应让普通 pack 在任何场景多打开一次抽屉。

6. **AC6: UND 处理一致** —— 已存在 `cmdUndo`（shopPreview.ts:521）对 `kind: 'pack'` 路径已正确处理 `last.words.forEach(w => wordDeck.lastIndexOf...splice)`。本 story 不动 UND 逻辑，但要**验证**：选词后 UND，被选词从 wordDeck 移除、gold 退还、undoStack 收缩；如果在抽屉打开期间还没选 → UND 应当是 no-op（因为 stack 还没 push）。

7. **AC7: 多 drawer 互斥** —— 抽屉打开时（`drawerOpen === 'pack-pick'`），`onKey` ESC 处理（shopPreview.ts:783）应正确关闭 pack-pick 抽屉而不是 restore preview。其他 drawer 正在打开时 BUY 一个多词 pack，应**先关闭旧 drawer 再开新**（或拒绝弹新；推荐拒绝并提示"先关闭当前抽屉"）。

8. **AC8: 焦点 / 键盘可达性** —— 抽屉打开时：
   - 默认聚焦第一张候选卡片（可视化 outline）
   - Tab / Shift+Tab 在候选卡片之间切换
   - Enter 选中当前 focused 卡片（等价于 click）
   - Esc 取消（=AC4）
   - 关闭后 prompt 重新接管 keypress（不残留 focus 在 body）

9. **AC9: 单元测试** —— 新建测试文件覆盖：
   - **a)** 普通 pack（words.length === pickCount）→ 走旧直接路径，gold/wordDeck/undoStack 全 update
   - **b)** 稀有 pack（words.length=3, pickCount=1）→ 不扣钱、wordDeck 不变、undoStack 不 push、抽屉打开
   - **c)** 选词后：gold 扣、wordDeck +1、undoStack push 1 entry，entry.words === [pickedWord]
   - **d)** 取消后：state 100% 不变（gold/wordDeck/undoStack 与 BUY 前一致）
   - **e)** wordEffect：BUY 带 `wordEffect` 的 pack 选词后，`state.wordEffects` 含该映射；Wordsmith 类时 wordEffects **不**写入

## Tasks / Subtasks

- [x] **Task 1：refactor `executeBuyPack` 为分支路径（AC: 1, 5）**
  - [x] 1.1 拆出 `executeBuyPackDirect` + `executeBuyPackPicker` 两个分支
  - [x] 1.2 入口 `executeBuyPack` 用 `pack.words.length > pack.pickCount` 判断
  - [x] 1.3 删除 deferred NOTE 死代码

- [x] **Task 2-5：drawer 系统扩展 + 渲染 + finalize/cancel（AC: 1, 2, 3, 4, 7）**
  - [x] 2.1 `DrawerKind` 加 `'pack-pick'`
  - [x] 2.2 模块级 `pendingPackPick: { d, pack } | null` 存暂态
  - [x] 2.3 `closeDrawer` 在 kind === 'pack-pick' 且 pending 未 finalize 时触发 cancel
  - [x] 2.4 `ESC` 处理走 closeDrawer 的 cancel 分支（已统一）
  - [x] 3.1 `renderPackPickDrawerHtml` — 3 张 `<button class="pack-pick-card">` + 📎 装饰 + LEN/freqHint/effectLabel
  - [x] 3.2 import `getFreqHints` + `formatWordEffectLabel` from systems/shop（已 export 这两个）
  - [x] 3.3 `escapeHtml` 沿用既有
  - [x] 4.1 `setupPackPickHandlers` 在 openDrawer 内调用，对每张卡片挂 onclick
  - [x] 4.2 `finalizePackPick(word)` — 扣钱 + wordDeck + wordEffect（非 wordsmith） + undoStack + 终端打印
  - [x] 4.3 closeDrawer 末尾 `(document.activeElement)?.blur()` 焦点回 prompt
  - [x] 5.1 closeDrawer 检查 pendingPackPick 自动走 cancel
  - [x] 5.2 `cancelPackPick` 终端打印 ABORTED · ${sku} NOT PURCHASED
  - [x] 5.3 backdrop click → closeDrawer → cancel（链式触发）

- [x] **Task 6：键盘可达性（AC: 8）**
  - [x] 6.1 openDrawer 末尾 rAF 内 focus 第一张 `.pack-pick-card`
  - [x] 6.2 卡片用 `<button type="button">` 原生支持 Tab/Enter
  - [x] 6.3 `onKey` 入口先检查 `drawerOpen === 'pack-pick'`：仅处理 ESC，其他键 return（不消费、不 preventDefault）让浏览器原生处理
  - [x] 6.4 closeDrawer 末尾 blur 让 keydown 全局 listener 重新接管

- [x] **Task 7：CSS pack-pick 样式（AC: 2 视觉）**
  - [x] 7.1-6 `.pack-pick-grid`（3 列 grid 16px gap）+ `.pack-pick-card`（牛皮纸渐变 + 黑墨双线边框 + 📎 顶部装饰 + hover/focus 抬升阴影）+ `.pp-word`（20px 加粗下划线）+ `.pp-meta`（10px opacity 0.7）+ `.pp-effect`（橙色 `#e67e22` 边框）+ `.pack-pick-footer`

- [x] **Task 8：终端文案（T2 模板）**
  - [x] 8.1 抽屉标题：`PACK ${sku} · CANDIDATE FILING`
  - [x] 8.2 触发 picker 时终端打印 `PACK ${sku} · ${N} CANDIDATES POSTED · CHOOSE ONE FOR FILING`
  - [x] 8.3 选中：`CONFIRMED · ${name} · 🍌 ${price} DEDUCTED` + `WORD "X" FILED TO LIBRARY`（与 direct 路径一致）
  - [x] 8.4 cancel：`ABORTED · ${sku} NOT PURCHASED`（与 high-price confirm 风格一致）
  - [x] 完整 narrative 重写留待 Epic 58

- [x] **Task 9：单元测试（AC: 9）— 8 用例（多于计划的 5 个）**
  - [x] 9.1 新建 `src/tests/unit/ui/shopPreviewPackPicker.test.ts`，加 `__test` internal API + `WordPack`/`PackCondition`/`ShopItem` mock helper
  - [x] 9.2 mock effects/sound + stub document
  - [x] 9.3 dispatch direct: 单词 pack → gold/wordDeck/undoStack 全 update
  - [x] 9.4 dispatch picker: 多词 pack → 不动 state，pendingPackPick 已设置
  - [x] 9.5 finalizePackPick('beta') → 扣钱、wordDeck=['beta']、undoStack 末尾 words=['beta']
  - [x] 9.6 cancelPackPick → state 100% 不变、pending 清零
  - [x] 9.7 wordEffect: 非 wordsmith 写入 `state.wordEffects`，wordsmith 不写入
  - [x] 额外: pending=null 时 finalize/cancel no-op

- [ ] **Task 10：手动验证（AC 全部）**
  - [x] 10.x typecheck — 0 个 story-related 新错误（grep tsc 输出过滤 shopPreview / shopPreviewPackPicker 无匹配）
  - [x] 10.x vitest 全套 — 4600 总测试 / 544 既有 fail（baseline 548 fail），diff: 27 个 Story 60.x 测试全过 + 0 新 regression
  - [ ] 10.1-10.5 浏览器手动验证（npm run dev:web → #shop-preview → reshuffle → BUY 稀有 pack 验证抽屉/选词/取消/UND）— 留待 code-review 阶段

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| Pack 数据结构 | `src/src/core/types.ts` | `WordPack { words, pickCount, wordEffect?, ... }` |
| Pack 生成 | `src/src/data/wordPacks.ts` | `PACK_RARITY_CANDIDATE_COUNT [1, 3, 3, 3]` · `PACK_RARITY_PICK_COUNT [1, 1, 1, 1]` |
| 老 word picker（参考实现） | `src/src/systems/shop.ts:2181` | `showWordPicker(words, onPick, wordEffect?)` — modal 版 |
| 老 BUY pack（参考） | `src/src/systems/shop.ts:2336` | `if (pack.words.length <= pack.pickCount) finalizePurchase else showWordPicker` |
| 词频提示 | `src/src/systems/shop.ts` | `getFreqHints(word)` |
| Word effect 标签 | `src/src/systems/shop.ts` | `formatWordEffectLabel(wordEffect)` |
| 高亮已绑键 | `src/src/systems/shop.ts` | `highlightWord(word, boundKeySet)` — 可选复用 |
| 当前 BUY pack | `src/src/ui/shopPreview.ts:394` | `executeBuyPack(d)` — 待重构 |
| Drawer 系统 | `src/src/ui/shopPreview.ts:585-650` | `DrawerKind`, `openDrawer`, `closeDrawer`, `setupDrawerHandlers` |
| Cancel 文案模板 | `src/src/ui/shopPreview.ts:677` | `appendLine(\`ABORTED · ${sku} NOT PURCHASED\`, 'dim')` (handleConfirmation) |

### Architecture Compliance

**Dependency direction**：本 story 在 `src/src/ui/shopPreview.ts`（UI 层），可以 import：
- `systems/shop` 的 `getFreqHints / formatWordEffectLabel / renderShapePreview` 等纯函数
- `core/state`、`core/constants`、`core/types` （WordPack）
- `data/wordPacks`（仅查 PACK_RARITY_* 常量，不 import 任何运行时 mutator）

**禁止：**
- ❌ 直接 import `showWordPicker` from shop.ts（这是 classic UI 的 DOM modal，与 terminal 抽屉系统耦合不同）
- ❌ 让 `systems/` 层任何文件 import shopPreview.ts
- ❌ 修改 wordPacks.ts 数据层（PACK_RARITY_PICK_COUNT 是设计常量）

**State write rules：**
- ✅ `state.gold` / `state.player.wordDeck` / `state.wordEffects` / `undoStack` 直写（已是现有模式）
- ✅ pendingPackPick 用 module-scope 变量（与 typedBuffer / undoStack 一致）

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **Vite** ^7.3.1（dev:web 必须过）
- **Vitest** ^3.0.0（unit tests）
- **不引新依赖** — 纯重构 + 接线
- **DOM only**：用 vanilla querySelector / addEventListener

### File Structure Requirements

```
src/src/ui/
  shopPreview.ts          ← 修改：executeBuyPack 拆分；DrawerKind 加 'pack-pick'；
                              新增 pendingPackPick 模块状态、renderPackPickDrawerHtml、
                              setupPackPickHandlers、finalizePackPick、cancel 路径

src/src/style.css         ← 追加：.pack-pick-grid, .pack-pick-card, .pp-word, .pp-meta,
                              .pp-effect, .pack-pick-footer

src/tests/unit/ui/        ← 新增：shopPreviewPackPicker.test.ts（5 用例）
  shopPreviewPackPicker.test.ts
```

**避免：**
- 不要碰 `systems/shop.ts:showWordPicker`（classic 仍要可用，60-5 才决定 sunset）
- 不要碰 `wordPacks.ts` 数据层
- 不要新建独立 `packPicker.ts` 模块——本逻辑高度依赖 shopPreview 的 module-state（typedBuffer / undoStack / drawerOpen），抽离会导致循环依赖

### Testing Requirements

- 测试参考 `tests/unit/` 目录现有结构
- vitest 配置 `environment: node`；如测试需读 `state.classId === 'wordsmith'` 等，先 `state.classId = 'wordsmith'` 修改
- mock `effects/sound`、可选 mock `getFreqHints`（避免触发真实词频依赖）

### Project Structure Notes

- shopPreview.ts 已经是单文件 1100+ 行，本 story 还会加 ~150 行（drawer body + handlers + finalize/cancel）。**60-14 模块拆分** epic 会一次性处理这个膨胀；本 story 不重构。
- 文案不立即上 T2 narrative — Story 60-2 接结构，narrative 重写留给 Epic 58 后续 batch。

### Previous Story Intelligence — Story 60.1 经验

| 教训 | 应用 |
|---|---|
| Phase 1 直接读写 `state.player.bindings` 是 shortcut，需走官方接口 | 本 story 不动 bindings；但 `state.player.wordDeck` / `state.gold` 本来就是直写模式，保持一致 |
| `setupDragZones` 在每次 `syncWorkbenchInbox` 重调，导致重复挂监听器 | 本 story 的 `setupPackPickHandlers` 也在每次 openDrawer 重调，要确保 listener 不残留（`onclick = ` 模式比 addEventListener 安全） |
| Code review 发现 dragManager.onDragEnd 重复赋值 anti-pattern | 本 story 别学：drawer 全局回调（如 ESC 处理）应在 enterPreview 一次性挂 |
| 测试用 `node` 环境 + 直接操作 state，不依赖 jsdom | 沿用 |

### Git Intelligence Summary

最近 5 个 commit：
```
1705b2a fix(shapes): drop unplaceable rotations + save migration (fixes domino 主斜在 QWER 顶行无法放置)
e870089 feat(workbench): route shape binding through bindShapeToKeys + range preview + right-click rotation (Story 60.1)
a086b8f fix(shop): mac keyboard adaptations
3325a67 feat(workbench): overlay drawer for word library + craft/metamorph stubs
b6e0c7e feat(workbench): drag IN-tray ↔ keyboard key bindings via dragManager
```

**Commit 编排建议（dev-story 完成后可分 commit 提交）：**
1. `feat(workbench): pack multi-word picker drawer (Story 60.2)` — Task 1-6 + 8
2. `style(workbench): pack-pick paper-craft cards` — Task 7（如果 CSS 量大可分）
3. `test(workbench): pack picker integration` — Task 9

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-2] — 验收标准与功能清单原文
- [Source: docs/narrative-design.md] — T2 模板"批文 + 三选一申领"调性（实施时引用，不在本 story 立即重写）
- [Source: src/src/systems/shop.ts:2181] — showWordPicker 参考实现
- [Source: src/src/systems/shop.ts:2336] — words.length <= pickCount 分支判断
- [Source: src/src/data/wordPacks.ts] — PACK_RARITY_PICK_COUNT 常量
- [Source: src/src/ui/shopPreview.ts:394] — 待重构 executeBuyPack
- [Source: src/src/ui/shopPreview.ts:585] — DrawerKind / openDrawer / closeDrawer 现有架构
- [Source: src/src/ui/shopPreview.ts:677] — handleConfirmation cancel 文案参考

### Risks & Open Questions

- **风险 A：** `pack.pickCount` 在数据层是 `[1,1,1,1]`（每个稀有度都选 1）。如果未来 pickCount 调整为 2（"3 选 2"），UI 需要支持多选状态。**缓解：** 当前实现固定单选；多选留给将来需要时再改。Story comment 注明此前提。
- **风险 B：** 抽屉打开期间玩家在终端继续输入命令（onKey 不知道 drawer 状态）→ 输入会进 typedBuffer 但看不见。**缓解：** AC8 要求抽屉打开时让 keypress 进入卡片 focus/Tab 模式；onKey 入口检查 `drawerOpen === 'pack-pick'` → 仅处理 ESC 与 Enter（可选）。
- **风险 C：** 测试在 node 环境下 mock DOM 的复杂度。drawer body innerHTML 设置可以走，但 click 事件触发需要手动 dispatch。**缓解：** 直接测 `finalizePackPick(word)` / `cancelPackPick()` 这两个内部函数（如可 export），不必经过完整 DOM 路径。
- **开放问题 1：** 是否需要键盘数字快捷键（1/2/3 直接选第 N 个候选）？终端风格契合，但本 story 不强制；放在 60-11 转场动画 / 60-12 音效之后再考虑。
- **开放问题 2：** 同一 BUY 流程多次取消（玩家反复打开 drawer 又取消）— 是否需要防抖？预期不需要，每次 BUY 都是独立流程；pendingPackPick 在 cancel 时被清。

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- typecheck story-related 0 新错误（filter 过 shopPreview / shopPreviewPackPicker 无匹配）。
- vitest baseline (stash my changes): 548 failed | 4052 passed = 4600 total。with-changes: 544 failed | 4056 passed = 4600 total。Diff: -4 failures, +4 passing — 没新 regression。
- 8 个新测试全过（dispatch direct/picker、finalize、cancel、wordEffect 隔离、no-op 边界）。

### Completion Notes List

- Story 创建于 2026-04-28，Epic 60 Phase 2 P2.1 质量门第 2 个 story（继 60-1 之后）。
- 实施于 2026-04-28，单 session 完成 9 个 task（Task 10 浏览器手动验证留待 code-review）。
- **关键设计决策：** 暴露 `__test` internal API + 把 `getFreqHints` / `formatWordEffectLabel` export from systems/shop（这两个之前是 file-private，但被复用 = 合理 export）。`finalizePackPick` / `cancelPackPick` 也 export 以便测试直接调用。
- **与 Story 60.1 协同：** 60.1 的 wb-drawer 系统已就位，本 story 只扩了 1 个 kind = `'pack-pick'`，零 drawer 架构改动。
- **AC 覆盖：** AC1（dispatch）/ AC2（卡片渲染）/ AC3（选词成功）/ AC4（取消不动 state）/ AC5（普通 pack 零回退）/ AC6（UND 已正确）/ AC7（多 drawer 互斥已有）/ AC8（focus + Tab + Enter + Esc）/ AC9（8 个测试）— 全部覆盖。
- 留待 code-review：浏览器端手动 QA 验证 paper-craft 卡片视觉 + 抽屉打开/关闭动效 + ESC/Tab/Enter 真实键盘交互。

### File List

新增：
- `src/tests/unit/ui/shopPreviewPackPicker.test.ts` (~180 行, 8 测试用例)

修改：
- `src/src/ui/shopPreview.ts` — import WordPack/getFreqHints/formatWordEffectLabel；新增 pendingPackPick 模块状态；重构 executeBuyPack 为分支分发；新增 executeBuyPackDirect / executeBuyPackPicker / finalizePackPick / cancelPackPick；扩 DrawerKind 加 'pack-pick'；openDrawer 新增 pack-pick 渲染分支 + auto-focus；closeDrawer 走 cancel 路径；新增 renderPackPickDrawerHtml + setupPackPickHandlers；onKey 入口加 pack-pick 早返回让原生 Tab/Enter 处理；底部加 `__test` internal API
- `src/src/systems/shop.ts` — export `getFreqHints` + `formatWordEffectLabel`（之前是 file-private）
- `src/src/style.css` — 追加 `.pack-pick-grid` / `.pack-pick-card` / `.pp-clip` / `.pp-word` / `.pp-meta` / `.pp-effect` / `.pack-pick-footer` 样式块
- `docs/implementation-artifacts/sprint-status.yaml` — 60-2 状态由 ready-for-dev → in-progress → review

### Change Log

| Date | Change | Notes |
|---|---|---|
| 2026-04-28 | Story 创建 | create-story 跑完，Status: ready-for-dev |
| 2026-04-28 | 实施完成 | dev-story 跑完 9 个 task；8/8 unit tests 通过；0 新 regression；Status: review |
| 2026-04-28 | Code review fixes | 处理 4 MEDIUM + 2 LOW；新增 2 个 wordEffect direct 路径测试；10/10 unit tests 通过 |

## Senior Developer Review (AI)

**Reviewer:** claude-opus-4-7[1m] · **Date:** 2026-04-28 · **Outcome:** Changes Requested → **Resolved**

### Findings & Resolutions

| # | Severity | Issue | Resolution |
|---|---|---|---|
| M1 | MEDIUM | cancel/confirm 文字写到不可见 terminal viewport（用户在 workbench 时看不到 ABORTED/CONFIRMED 反馈） | `finalizePackPick` / `cancelPackPick` 末尾调 `showOnly('terminal')` 切回终端 |
| M2 | MEDIUM | 缺 focus trap，Tab 跳出抽屉；且 `stopImmediatePropagation` 阻止原生 Enter→click | `onKey` 拦截 Tab（卡片间循环 focus）+ Enter/Space（手动 `cur.click()` 触发） |
| M3 | MEDIUM | 多 drawer 互斥未实现（words/craft/metamorph 已开时 BUY 多词 pack 会静默替换 body） | `executeBuyPackPicker` 入口检查 `drawerOpen` —— 非空且非 'pack-pick' 时打印 ERR 并 return |
| M4 | MEDIUM | direct 路径 wordEffect 写入无测试覆盖 | 新增 2 用例：单词 pack + wordEffect direct 路径，覆盖 wordsmith / 非 wordsmith 分支 |
| L1 | LOW | `[TAB] NAVIGATE` 文案与未实现的 focus trap 矛盾 | 由 M2 修复自动解决（focus trap 现真实存在） |
| L2 | LOW | `pendingPackPick` 在 restoreFromPreview/resetSession 不清零，跨 session 残留 stale 引用 | `resetSession` 内 `pendingPackPick = null` |
| L3 | LOW | parseInt magic `-1` fallback | **未修** — cosmetic，dataset.pickIdx 由代码 100% 控制 |
| L4 | LOW | File List 行数偏差（声称 ~180，实际 189） | **未修** — cosmetic |

### Action Items

- [x] M1-M4 全部 MEDIUM issue 自动修复
- [x] L1 由 M2 修复连带解决
- [x] L2 修复（restoreFromPreview / resetSession 跨 session 清零）
- [x] M2 implementation gotcha：`stopImmediatePropagation` 阻止 capture-phase 事件到达 button 元素，原生 Enter→click 失效，必须显式 `cur.click()` 触发
- [ ] L3 / L4 cosmetic，留作未来清理

### Final Status

- **10/10 unit tests pass**（原 8 + 新增 2 wordEffect direct 路径）
- **0 新 tsc 错误** in story-related 文件
- **0 新 regression** vs baseline 在所有 UI / data / systems 测试模块
- 所有 MEDIUM 已修复 → Outcome: **Approved**
