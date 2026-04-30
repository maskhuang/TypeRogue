# Story 60.20: 工作台右侧 FILED folder 接真实 owned skills + relics

Status: backlog

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

- [ ] **Task 1: 渲染函数（AC: 1-3, 5）**
  - [ ] 1.1 `shopWorkbench.ts` 加 `renderSkillFolderHtml()` + `renderRelicFolderHtml()` + `syncFiledFolders()`
  - [ ] 1.2 每行 ≤30 字符截断（folder 列宽限制）
  - [ ] 1.3 空状态 `— NONE —`

- [ ] **Task 2: buildWorkbenchScreen 简化（AC: 5）**
  - [ ] 2.1 把 SKILL · 003 + RELIC · 002 folder 的 inline HTML 替换为 `<div class="folder" id="filed-skill-folder"></div>` + relic 同
  - [ ] 2.2 enterTerminalShop 调一次 syncFiledFolders 注满

- [ ] **Task 3: 刷新触发点（AC: 4）**
  - [ ] 3.1 `shopBus.syncFiledFolders` 加入 bus
  - [ ] 3.2 syncWorkbenchInbox / syncWorkbenchRelics 调用末追加 `shopBus.syncFiledFolders()`

- [ ] **Task 4: 单元测试（AC: 6）**
  - [ ] 4.1 `tests/unit/ui/shopPreviewFiledFolders.test.ts` ~50 行

- [ ] **Task 5: 浏览器手动验证 + commit**

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

## Dev Agent Record

(to be filled by implementing dev)
