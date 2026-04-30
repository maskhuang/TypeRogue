# Story 60.15: terminal / 工作台 i18n 全覆盖

Status: backlog

<!-- Epic 60 Phase 2 · 优先级 P2.4（清理）· P2.4 第 2 项 -->
<!-- Note: 拆自原 60-14 三主题中"i18n 全覆盖"部分 -->

## Story

As a **zh / en 双语用户**,
I want **terminal 商店和工作台所有可见字符串切到当前 locale（USAGE / ERR / CONFIRMED / stamp 文案 / drawer 标题 / tier 标签都跟 locale 切换）**,
so that **Epic 60 不在双语完整性上留尾巴；非英语玩家不再看到一半英文一半中文混排**.

## 背景

60-14（死代码清理）完成后开本 story。原 60-14 spec 三主题之一。

实测 `shopPreview.ts` ~50 个 hardcoded UI 字符串：
- `appendLine('USAGE: BUY <SKU>')` — 命令 USAGE
- `appendLine('ERR · INSUFFICIENT FUNDS · BAL ...')` — 错误腔
- `appendLine('CONFIRMED · ...')` — 成功反馈
- `'WORDSMITH STATION'` / `'METAMORPH STATION'` — drawer title
- `'REGULATION'` / `'CLEARANCE 4-A'` / `'OPENED'` — stamp 文案

`affixAbbrev.ts` 是另一个独立点：当前 zh/en 共用同一缩写表（`IGN` / `BLT`），中文玩家看英文缩写体验断裂。

## Acceptance Criteria

1. **AC1：终端命令文案走 i18n** —— 所有 `cmdHelp` / `cmdList` / `cmdInfo` / `cmdBuy` / `cmdSell` / `cmdReshuffle` / `cmdProceed` / `cmdUndo` 等内部 hardcoded 字符串改 `t('shop.terminal.cmd.*')`。
   - 命名规范：`shop.terminal.cmd.<verb>.usage` / `.confirmed` / `.err.<reason>`
   - 例：`'USAGE: BUY <SKU>'` → `t('shop.terminal.cmd.buy.usage')`

2. **AC2：终端状态条 / banner / clearance 标签走 i18n** —— `shop.terminal.statusbar.*` / `.banner.*` / `.fkey.*`

3. **AC3：工作台 stamp / drawer / tier 标签走 i18n** —— `'REGULATION'` / `'CLEARANCE 4-A'` / `'OPENED'` / `'WORDSMITH STATION'` / `'METAMORPH STATION'` / `'WORD LIBRARY'` 等改 `t('shop.workbench.stamp.*')` / `.drawer.*` / `.tier.*`

4. **AC4：affixAbbrev locale-aware** —— `affixAbbrev.ts` 加 `getAffixAbbrev(type, locale?)` helper：
   - en locale → 沿用 abbrev (`IGN` / `BLT`)
   - zh locale → 走 `t('affix.<type>')` 全名
   - 留 maxLen 参数兜底（中文全名超长时截断）
   - 替换 `itemDescriptors.ts` 中的调用

5. **AC5：i18n zh + en 双语完整** —— 所有新 key 在 demo-i18n.ts 两套词典都 hit。

6. **AC6：i18n 完整性单测** —— 新建 `tests/unit/ui/shopI18nCoverage.test.ts`：
   - 把 70+ 新 key 全部 enumerate
   - 切 locale='zh' / 'en' 各 `t(key)` 不返回 key 本身
   - 关键 UI 字符串切语言后内容确实变化

7. **AC7：Story 60.x ecosystem 不退化**

8. **AC8：tsc 0 新错**

9. **AC9：手动验证留 code-review** —— 浏览器切 locale='zh' / 'en' / 'zh' 来回，所有 terminal + 工作台文本切到对应语言（除 SKU / 形状代码）。

## Tasks / Subtasks

- [ ] **Task 1：grep + 列表所有 hardcoded UI 字符串**
  - [ ] 1.1 `grep -nE "appendLine\('|setPrompt\('"` 等
  - [ ] 1.2 拷到 spreadsheet / story doc 表，标 key 名 + zh + en 翻译

- [ ] **Task 2：补 demo-i18n.ts zh + en 词典**
  - [ ] 2.1 加 ~50 个 `shop.terminal.*` key
  - [ ] 2.2 加 ~20 个 `shop.workbench.*` key

- [ ] **Task 3：替换 shopPreview.ts 调用**
  - [ ] 3.1 终端命令路径
  - [ ] 3.2 工作台路径

- [ ] **Task 4：affixAbbrev locale-aware（AC: 4）**
  - [ ] 4.1 加 `getAffixAbbrev(type, locale?, maxLen?)` helper
  - [ ] 4.2 替换 itemDescriptors.ts 调用
  - [ ] 4.3 实测 zh locale 下 LIST 列宽不破

- [ ] **Task 5：i18n 完整性单测（AC: 6）**
  - [ ] 5.1 新建 shopI18nCoverage.test.ts，~150 行
  - [ ] 5.2 enumerate 所有新 key 双语验证

- [ ] **Task 6：tsc + 全套测试**

## Dev Notes

### 命名 namespace 设计

```
shop.terminal.
  cmd.buy.usage
  cmd.buy.err.no_funds
  cmd.buy.err.no_sku
  cmd.buy.confirmed
  cmd.list.empty
  cmd.list.header
  cmd.info.not_found
  cmd.info.try_owned
  ...
  banner.cycle
  banner.file
  banner.batch
  statusbar.bal
  statusbar.form
  statusbar.clr
  statusbar.stage
  statusbar.conn
  fkey.lis
  fkey.buy
  ...

shop.workbench.
  stamp.regulation
  stamp.clearance_a
  stamp.opened
  drawer.words
  drawer.craft
  drawer.metamorph
  drawer.pack_pick
  tier.1
  tier.2
  tier.3
  tier.4
  hint.drag
  hint.submit
```

### Risks

- **风险 A：affixAbbrev 中文全名超长破 LIST 列宽** —— Task 4.3 实测；必要时加 截断 / 缩写规则
- **风险 B：i18n key 改动一次性触达 50+ 处调用，bug 散点广** —— 缓解：分两个 commit（terminal / workbench）便于 bisect
- **风险 C：60-16 模块拆分时 i18n key 在哪个模块定义会冲突** —— 60-15 把 i18n 调用就地替换；60-16 拆分时 i18n key 命名不动

### References

- [Source: docs/implementation-artifacts/60-14-module-split-i18n.md（原合并 spec）] — 已拆为 60-14 / 60-15 / 60-16
- [Source: src/src/demo/demo-i18n.ts] — i18n 词典扩展点
- [Source: src/src/ui/affixAbbrev.ts] — locale-aware 改造目标
- [Source: src/tests/unit/systems/tutorial/tutorialL0L1.test.ts:217 i18n 完整性] — 测试模板

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 P2.4 第 2 项
- 等 60-14（死代码）完成后开始

### File List
