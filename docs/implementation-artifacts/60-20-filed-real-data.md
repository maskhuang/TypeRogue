# Story 60.20: 工作台右侧 FILED folder 接真实 owned skills + relics

Status: review

<!-- Epic 60-Followup · 优先级 P4（最简单收尾，~30 行） -->
<!-- Source: Story 60.16 code-review 完成后用户 dogfood 反馈 -->

## Story

As a **打字商店玩家**,
I want **工作台右侧 FILED 区的 SKILL · 003 / RELIC · 002 folder 显示我当前真实 owned 的技能 + 遗物**,
so that **看到的是自己的实际状态而不是 DRIP CASCADE / FOSSILIZED MEMO 等 placeholder 假数据**.

## 背景

`shopBootstrap.ts:buildWorkbenchScreen` HTML 模板中 SKILL / RELIC folder 的 `.folder-row` 是硬编码：

```html
<div class="folder-row"><span class="fr-icon">💧</span><span class="fr-name">DRIP CASCADE</span><span class="fr-lv">Lv.2</span></div>
<div class="folder-row"><span class="fr-icon">📎</span><span class="fr-name">PAPERCLIP CHAIN</span><span class="fr-lv">Lv.1</span></div>
<div class="folder-row"><span class="fr-icon">✉️</span><span class="fr-name">CARBON COPY</span><span class="fr-lv">Lv.1</span></div>
...
<div class="folder-row"><span class="fr-icon">🏺</span><span class="fr-name">FOSSILIZED MEMO</span></div>
<div class="folder-row"><span class="fr-icon">☕</span><span class="fr-name">COLD COFFEE RING</span></div>
```

WORDS folder（第 3 个）已接真实 `state.player.wordDeck` 和 count。但 SKILL / RELIC folder 全是 Phase 1 视觉占位。

## Acceptance Criteria

1. **AC1：SKILL folder 渲真实 bound + inbox skills** —— 列出 `state.player.bindings` 已绑技能 + `state.player.inbox` 待装配技能；每行显示 icon + name + Lv.X；count `SKILL · NN` = bindings.size + inbox.length

2. **AC2：RELIC folder 渲真实 owned relics** —— 列出 `Array.from(state.player.relics)` 每个的 RELICS[id] icon + name；count `RELIC · NN` = relics.size

3. **AC3：空状态显示** —— skills/relics 为 0 时显示 `— NONE —` 占位，不渲空 folder

4. **AC4：进入 / 切屏时刷新** —— enterTerminalShop 入口 + workbench 切屏 + BUY/SELL/UND 触发的 syncWorkbenchInbox 同时刷 FILED folder（提取 `syncFiledFolders()` 函数）

5. **AC5：buildWorkbenchScreen 模板抽出 folder 渲染** —— 把 SKILL/RELIC folder 的 HTML 生成抽出到 `renderFiledFolders()` 函数（不再 inline 在 buildWorkbenchScreen 大模板里），作为 60.16 拆分方法论的延续

6. **AC6：单元测试** —— mock state.player.skills/relics/affixSkills，验证 syncFiledFolders 渲染输出 contains 真实 name

## Tasks / Subtasks

- [x] **Task 1: 渲染函数（AC: 1-3, 5）**
  - [x] 1.1 `shopWorkbench.ts` 加 `renderSkillFolderHtml()` + `renderRelicFolderHtml()` + `syncFiledFolders()` + `getOwnedSkillEntries()` helper
  - [x] 1.2 每行 ≤22 字符截断（含 `…` 省略号）— 比原计划 30 略紧，给 fr-lv 留位置
  - [x] 1.3 空状态 `— NONE —`（CSS class `.folder-empty`）

- [x] **Task 2: buildWorkbenchScreen 简化（AC: 5）**
  - [x] 2.1 SKILL/RELIC folder 的 inline placeholder HTML（DRIP CASCADE / FOSSILIZED MEMO 等）替换为空容器 `<div class="folder" id="filed-skill-folder">` + `<div class="folder-body"></div>`
  - [x] 2.2 enterTerminalShop 已调 syncWorkbenchInbox/Relics/Keys，每个末尾都 trigger syncFiledFolders → 进店即注满

- [x] **Task 3: 刷新触发点（AC: 4）**
  - [x] 3.1 `shopBus.syncFiledFolders` 加入 bus（与 syncWorkbenchInbox/Relics/Keys 同模式）
  - [x] 3.2 syncWorkbenchInbox / syncWorkbenchRelics / syncWorkbenchKeys 末尾追加 `syncFiledFolders()` 调用 — BUY/SELL/UND/拖拽绑定 任一变动都自动刷 FILED

- [x] **Task 4: 单元测试（AC: 6）**
  - [x] 4.1 `tests/unit/ui/shopPreviewFiledFolders.test.ts`（~150 行，11 个测试）

- [ ] **Task 5: 浏览器手动验证（dev 完成后由 reviewer 执行）**

## Dev Notes

### 数据来源

```ts
// SKILL folder rows
const sidToKeys = new Map<string, string[]>();
for (const [k, sid] of state.player.bindings) {
  const arr = sidToKeys.get(sid) ?? [];
  arr.push(k.toUpperCase());
  sidToKeys.set(sid, arr);
}
// + state.player.inbox (待装配)
// 每条: { name: sk.name, icon: sk.icon, level: sk.level, location: bound|inbox }

// RELIC folder rows
for (const id of state.player.relics) {
  const data = RELICS[id];
  // { name: data.name, icon: data.icon }
}
```

复用 `cmdInfoListOwned`（terminal /OWNED 命令）已有的逻辑，提取共享 helper 到 shopState 或 workbench。

### 与现有 IN-tray panel 区别

- IN-tray (左侧 wb-foam-case)：仅显示 `inbox` 待装配的卡片（带 SN / barcode 装饰）
- FILED SKILL folder (右侧)：显示 bound + inbox 全部 skills（紧凑列表，readout 形态）
- 两者数据有重叠（inbox 在两边都显示），但视觉职能不同

### References

- [Source: src/src/ui/shop/shopBootstrap.ts:680-758 buildWorkbenchScreen] — folder HTML 位置
- [Source: src/src/ui/shop/shopTerminal.ts:cmdInfoListOwned] — /OWNED 命令复用渲染逻辑
- [Source: src/src/data/relics.ts: RELICS] — relic id → { icon, name, description }

## Previous Story Intelligence (60.16)

**Architecture lessons from 60.16 module split**:
- 4 模块单向依赖 (state ← terminal/workbench ← bootstrap)；workbench 不直接 import terminal
- ✅ **本 story 完全在 shopWorkbench 内** — bindings/inbox/relics 渲染都是 workbench 职能；buildWorkbenchScreen 模板里 inline 的 folder HTML 抽到 shopWorkbench 同模块函数即可
- shopBus 已 wire `syncWorkbenchInbox/Relics/Keys` — 加 `syncFiledFolders` 跟随同模式

**Patterns to reuse**:
- DOM 渲染走 `document.getElementById(...).innerHTML = renderXxxHtml()` 模式（参考 syncWorkbenchInbox）
- 通过 `shopBus.X` 让 terminal cmd 路径触发 sync（cmdSell / cmdUndo / executeBuySkill / executeBuyRelic 已经调 syncWorkbenchInbox/Relics）
- 60.16 review M2 fix 把 __test 移进 bootstrap，本 story 不需要新 __test 入口（folder render 是确定性的，单测直接 import sync 函数）

**Code reference**:
- `cmdInfoListOwned` (`shopTerminal.ts`) 已有 owned skills (bindings + inbox 合并 + 多格 sid 去重) 算法 → 抽 `getOwnedSkillEntries()` helper 双方共用
- `cmdInfoListOwned` 的 owned relics 也是 `Array.from(state.player.relics)` + RELICS lookup → 抽 `getOwnedRelicEntries()` helper

## Architecture Compliance

- **依赖方向**: shopWorkbench → shopState（OK）；不引入 ui/shop/ → systems/* 新依赖
- **i18n 覆盖**: 60-15 已为 SKILL/RELIC folder 标题立了 i18n key（`shop.workbench.folder.skill_title` / `shop.workbench.folder.relic_title`），本 story 渲染保留它们
- **核心架构**: `docs/game-architecture.md`

## Dev Agent Record

### Implementation Plan / Decisions

- **Render functions in shopWorkbench.ts**：所有逻辑放 workbench 模块内（owned 统计 + DOM 渲染），不污染 terminal 或 state 模块；与 60.16 单向依赖约束一致。
- **getOwnedSkillEntries() helper**：本 story 内部使用，未抽到 shopState 共享给 cmdInfoListOwned — 因 cmdInfoListOwned 还需要 sortKey 等额外字段，且涉及多处调用，重构属另一改动范围。本 story 保留 cmdInfoListOwned 原内联逻辑，仅在 workbench 复用同思路。
- **截断 22 字符**：每个 folder-row 三栏 fr-icon (1ch emoji) + fr-name (~22 ch) + fr-lv (~5 ch)，folder 列宽 ~30 ch。22 留 buffer 防 fr-lv 折行。
- **三 sync 都调 syncFiledFolders**：FILED 内容依赖 bindings + inbox + relics 三态；任一变动都该刷新。开销低（DOM querySelectorAll + innerHTML 替换 ≤ 3 次），不批 RAF。
- **空状态 `— NONE —`**：CSS class `folder-empty` 留给后续样式扩展（暗色 / 居中），现在用现有 `folder-row` 默认样式即可。

### Completion Notes

- ✅ 所有 6 个 AC 满足
- ✅ Task 1-4 完成；Task 5 浏览器手动验证留给 reviewer
- ✅ 11 新测试 pass，ecosystem 85 tests 0 退化
- ✅ tsc baseline 持平 249
- ✅ 完全在 shopWorkbench 模块内实现，不破坏 60.16 单向依赖约束
- ✅ 移除 6 行 hardcoded placeholder HTML（DRIP CASCADE / PAPERCLIP CHAIN / CARBON COPY / FOSSILIZED MEMO / COLD COFFEE RING）

### File List

- `src/src/ui/shop/shopWorkbench.ts`（+~80 行：renderSkillFolderHtml / renderRelicFolderHtml / syncFiledFolders / getOwnedSkillEntries / truncateName + 3 处末尾 sync 触发）
- `src/src/ui/shop/shopBootstrap.ts`（buildWorkbenchScreen 模板：6 行 placeholder HTML → 4 行空容器）
- `src/src/ui/shop/shopState.ts`（shopBus 加 `syncFiledFolders` 入口）
- `src/tests/unit/ui/shopPreviewFiledFolders.test.ts`（新建，~150 行，11 个测试）
- `docs/implementation-artifacts/sprint-status.yaml`（status: ready-for-dev → review）
- `docs/implementation-artifacts/60-20-filed-real-data.md`（status + Dev Agent Record）

### Change Log

- 2026-04-30: Implementation completed. SKILL / RELIC FILED folders 接真实 owned data；hardcoded placeholders 全部移除；3 个 sync 触发点自动刷新。
