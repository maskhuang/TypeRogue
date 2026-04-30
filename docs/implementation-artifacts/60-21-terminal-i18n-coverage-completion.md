# Story 60.21: Terminal 文本 i18n 覆盖补全

Status: backlog

<!-- Epic 60-Followup · 优先级 P3（cleanup · 体量大但低风险） -->
<!-- Source: Story 60.18 dogfood 后用户指出"Terminal 的文本需要 i18n 补齐" -->
<!-- 接 Story 60.15 的 i18n coverage（60.15 只覆盖了 cmdHelp / usage 相关 ~20 keys，留了 87 hardcoded appendLine 在 cmdInfo / executeBuy / cmdSell / cmdReshuffle / cmdUndo / OWNED 详情等路径） -->

## Story

As a **non-English-locale 玩家**,
I want **terminal 商店的所有 echo / err / 详情卡 / 状态指示文本走 i18n（zh + en 双语）**,
so that **我看到的不是混杂中英的 UX —— help 命令是中文但 BUY 成功是英文，是阻断式不一致**.

## 背景

Story 60.15 (i18n coverage) 仅覆盖了 `shop.terminal.cmd.help.*` + `shop.terminal.cmd.usage.*` 共约 20 个 keys。但 `shopTerminal.ts` 实际有 **87 个 hardcoded appendLine 调用**（不走 i18n），还有 `shopBootstrap.ts` 中 ~10 个。Total **97 个 hardcoded strings**。

终端目前显示语言混乱：
- HEL 命令：i18n 控制 → zh locale 看到中文，en 看到英文 ✓
- BUY 成功 / SELL 退款 / RESHUFFLE / UND 撤销 / cmdInfo 详情卡 / /OWNED 列表 / err 消息 → **全部 hardcode 英文**

中文 locale 玩家体验：HEL 中文，但其他全英文，分裂感强。

## Acceptance Criteria

1. **AC1：97 个 hardcoded appendLine 全部走 t()** — 覆盖：
   - cmdInfo / cmdInfoKey / cmdInfoOwnedSkill / cmdInfoOwnedRelic / cmdInfoMultiSkillHit / cmdInfoListOwned 详情卡（~30 strings）
   - executeBuy / executeBuySkill / executeBuyPack / executeBuyPackDirect / executeBuyPackPicker / finalizePackPick / cancelPackPick / executeBuyRelic 的 echo + err（~20 strings）
   - cmdBuy / cmdSell / cmdReshuffle / cmdProceed / cmdUndo / cmdStats / cmdWords 的 echo + err（~20 strings）
   - handleConfirmation 的 ABORTED / ERR EXPECTED [Y]ES（~5 strings）
   - shopBootstrap submit warnings + execute 错误 + renderWelcome（~10 strings）

2. **AC2：i18n key 命名 namespace 化** — 都在 `shop.terminal.*` 下分组：
   - `shop.terminal.cmd.{verb}.{outcome}` (e.g. `shop.terminal.cmd.buy.confirmed`)
   - `shop.terminal.err.{condition}` (e.g. `shop.terminal.err.insufficient_funds`)
   - `shop.terminal.info.{kind}.{field}` (e.g. `shop.terminal.info.relic.rarity_label`)
   - `shop.terminal.welcome.connected` 等

3. **AC3：模板变量正确替换** — `{sku}`, `{price}`, `{count}`, `{key}`, `{name}` 等通过 `t(key, params)` 注入；不再用 backtick 拼接

4. **AC4：英文文本 100% 与现 hardcode 一致** — en locale 显示与现状 0 差异，仅 zh locale 新增中文翻译

5. **AC5：DPCA 官僚化文风保持** —— 中文翻译仍保留"已批准 / 已驳回 / 上呈 / 备案"等官僚词，与 60.15 既有 zh 文风一致

6. **AC6：tsc + 全套测试持平** — 既有测试无需大改（断言文本可能要更新，但应使用 `t()` 同款 key 取值）

7. **AC7：grep 自检** — `grep -E "appendLine\(\s*['\`]"` shopTerminal.ts + shopBootstrap.ts 应只剩 `appendLine('')` 空行 + `appendLine('═'.repeat(W))` / `appendLine('─'.repeat(N))` 等纯装饰性 ASCII 边框

## Tasks / Subtasks

- [ ] **Task 1: cmdInfo 详情卡块（~30 strings · AC: 1, 2, 3）**
  - [ ] 1.1 INF KEY a-z bound key (KEY X · UNBOUND · BAL / KEY X · NO RELIC) (~5 strings)
  - [ ] 1.2 cmdInfoOwnedSkill (KIND SKILL · LV · SHAPE / IN-TRAY SLOT N/M / UNASSIGNED / KEY headline / QUEST / APPRENTICE) (~10 strings)
  - [ ] 1.3 cmdInfoOwnedRelic (RARITY ... · ID · KEY ...) (~5 strings)
  - [ ] 1.4 cmdInfoMultiSkillHit (MULTIPLE MATCHES / REFINE QUERY) (~5 strings)
  - [ ] 1.5 cmdInfoListOwned (OWNED ASSETS / SKILLS / RELICS / EMPTY) (~5 strings)
  - [ ] 1.6 cmdInfo NOT FOUND / DID YOU MEAN / TRY INF /OWNED (~3 strings)

- [ ] **Task 2: executeBuy* 路径（~20 strings · AC: 1, 2, 3）**
  - [ ] 2.1 INSUFFICIENT FUNDS / appeal_form (~2)
  - [ ] 2.2 IN-TRAY FULL / NO SKILL DATA / RELIC OWNED / NUMBER-ROW SLOTS FULL / RELIC ADD FAILED (~5)
  - [ ] 2.3 CONFIRMED · ${name} / DISPATCHED TO IN-TRAY / WORD FILED / RELIC SHELVED / UNDO STACK (~6)
  - [ ] 2.4 PACK CANDIDATES POSTED / DRAWER OPEN CLOSE FIRST / ABORTED ${sku} (~4)

- [ ] **Task 3: cmdBuy / Sell / Reshuffle / Proceed / Undo / Stats / Words（~20 strings · AC: 1, 2, 3）**
  - [ ] 3.1 cmdBuy: SKU NOT IN CATALOG / DID YOU MEAN / CLEARANCE REQUIRED / CONFIRM PURCHASE / BAL AFTER (~5)
  - [ ] 3.2 cmdSell: NOT IN IN-TRAY / SELL ONLY APPLIES / ONLY IN-TRAY SKILL / SOLD ${sku} REFUNDED 50% (~4)
  - [ ] 3.3 cmdReshuffle: INSUFFICIENT FUNDS / GENERATOR UNAVAILABLE / CATALOG RESHUFFLED (~3)
  - [ ] 3.4 cmdProceed: PROCEEDING TO WORKBENCH (~1)
  - [ ] 3.5 cmdUndo: UNDO STACK EMPTY / UNDO ${sku} REVERSED (~2)
  - [ ] 3.6 cmdStats: PERFORMANCE AUDIT / KEY USAGE / TOP CONTRIBUTOR / WEAKEST KEY / END OF AUDIT — **注：60-19 会重做整个 cmdStats**，本 story 不动 cmdStats，留给 60-19 自带 i18n
  - [ ] 3.7 cmdWords: opening_words

- [ ] **Task 4: handleConfirmation + bootstrap submit/execute（~10 strings · AC: 1, 2, 3）**
  - [ ] 4.1 handleConfirmation: ABORTED ${sku} / ERR EXPECTED Y/N (~2)
  - [ ] 4.2 bootstrap.handleSubmitConfirmation: WARNING N ITEMS IN IN-TRAY / ERR EXPECTED Y/N (~2)
  - [ ] 4.3 bootstrap.execute: §> prompt / UNKNOWN VERB / TYPE HEL FOR COMMAND LIST / 命令补全候选列表 (~4)
  - [ ] 4.4 bootstrap.switchToWorkbench: PURCHASES FINALIZED (~1)
  - [ ] 4.5 bootstrap.renderWelcome: CONNECTED · DPCA-VT220 · §117 / TYPE HEL (~2)

- [ ] **Task 5: i18n keys 完整加 zh + en（AC: 2, 4, 5）**
  - [ ] 5.1 demo-i18n.ts 加约 80 个新 zh keys（AC5 保留 DPCA 官僚化文风）
  - [ ] 5.2 demo-i18n.ts 加约 80 个新 en keys（AC4 与现 hardcode 100% 一致）
  - [ ] 5.3 grep 检查 zh/en key 一致性（缺漏报错）

- [ ] **Task 6: 测试更新（AC: 6）**
  - [ ] 6.1 既有 11 个 shopPreview*.test.ts 中 hardcoded 文本断言 → 改用 `t()` 取值断言
  - [ ] 6.2 全套 vitest run；ecosystem 154+ tests 0 退化
  - [ ] 6.3 tsc baseline 持平

- [ ] **Task 7: AC7 grep 自检 + commit（AC: 7）**
  - [ ] 7.1 grep `appendLine(['"\`]` 应仅剩装饰性 ASCII（`═`/`─`/`空行`/`§> ${line}` prompt）
  - [ ] 7.2 commit + 浏览器手动验证 zh + en 双语完整切换

## Dev Notes

### 与 60-19 关系

cmdStats 内部 hardcoded ~10 strings，但 **Story 60-19 (STAT 真实数据) 会全面重写 cmdStats**。本 story 不碰 cmdStats — 留 60-19 顺带 i18n 化。

### 文风参考

60.15 已建立 zh DPCA 官僚化文风样本（`shop.terminal.submit.stamped`: "已批准盖章" / `shop.workbench.stamp.regulation`: "符合规定"）。新增 zh keys 沿用此风。

### 工作量

- 97 strings × 2 locales = 194 i18n keys
- 97 个 t() 调用替换（含模板变量提取）
- 测试断言更新（约 30 处）
- 估 1-2 个 dev session

### Risks

- **测试断言耦合 hardcode 文本**: 既有 11 个 shopPreview*.test.ts 多处 `expect(...).toContain('CONFIRMED · ...')` 等。改 i18n 后断言应改用 `t()` 取值，否则测试断言文本与运行时不同步。Mitigation: Task 6 系统更新，跑全套确认。
- **DPCA 文风一致性丢失**: 大批 zh 翻译易出现"机翻味"。Mitigation: 沿用 60.15 已建立的官僚词典（已批准/已驳回/上呈/备案/请填写申诉表 §117 等），AC5 检查。
- **Story 60.16 模块拆分后路径分散**: appendLine 调用在 shopTerminal + shopBootstrap 两个文件，i18n key 共享同 namespace `shop.terminal.*`。Mitigation: 不分两 namespace，sub-story 拆 task 1-4 按职能切。

### References

- [Source: src/src/ui/shop/shopTerminal.ts] — 87 hardcoded appendLine
- [Source: src/src/ui/shop/shopBootstrap.ts] — ~10 hardcoded appendLine（submit / execute / welcome）
- [Source: src/src/demo/demo-i18n.ts] — i18n 字典文件（已含 60.15 的 ~20 keys）
- [Source: docs/implementation-artifacts/60-15-i18n-coverage.md] — 60.15 已做的范围 + DPCA 文风参考

## Architecture Compliance

- 依赖方向：shopTerminal/shopBootstrap → demo-i18n（已存在依赖，不引入新）
- 60.16 模块约束：i18n keys 跨 shopTerminal + shopBootstrap，但都在 ui/shop/ 内部，无 cross-module bus 依赖

## Dev Agent Record

(to be filled by implementing dev)

### File List

(待实施时填)
