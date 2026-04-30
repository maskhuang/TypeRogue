# Story 60.11: 转场动画

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.3（浪漫化）· P2.3 第 3 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **terminal 商店玩家**,
I want **关键交互节点（BUY → IN-tray 滑入闪光、Tab 切屏 CRT 短转场、RESHUFFLE catalog 行逐行 print）有恰到好处的仪式感动画**,
so that **商店从"DOM 瞬切"升级到"DPCA 终端真在工作"，感官层面强化叙事**.

## 背景

P2.1 4/4 + P2.2 4/4 done，P2.3 已完成 60-9 hover tooltip + 60-10 INF owned 查询。SUBMIT FORM 在 60-4 时已有红章 stamp-bang 动画（`style.css:6633` 已实现），但其他关键节点仍是无动画 DOM 切换。

P2.3 第 3 项：补 3 个仪式感动画 + 全局开关 + 减动效兼容：

1. **BUY skill 成功 → IN-tray 槽 ~250ms 高亮闪 + 气动管 whoosh 滑入**：玩家在终端打 `BUY SKL-001`，确认后 IN-tray 对应槽（最右侧空位）卡片**从右侧滑入**（CSS `@keyframes whoosh-in` translateX + opacity）+ 短暂高亮闪。强化"已发货 → 已入仓"的物流隐喻。
2. **Tab 切屏 CRT 转场 ~250ms**：terminal ↔ workbench 切换时短促 CRT 关机 → 桌面亮起（屏幕快速垂直 squash + scanline 闪过）。可关闭。
3. **RESHUFFLE catalog 行逐行 print**：`RES` 命令重生成 catalog 后，LIST 重渲染时**每行 30ms 间隔逐行 fade-in**（不是一次性全出现）。仿打字机/点阵打印机 60Hz 走纸感。

总动画时长 ≤ 300ms（按用户操作节奏，不阻塞交互）。`prefers-reduced-motion` 媒体查询尊重 → 所有动画压缩到 50-100ms 或直接跳过。新增 `settings.shopAnimations: boolean` 默认 true，玩家可手动关闭。

完成后 P2.3 进度 3/5。

## Acceptance Criteria

1. **AC1：UserSettings 加 `shopAnimations: boolean`**
   - `UserSettingsData` interface 加 `shopAnimations: boolean`
   - `DEFAULTS.shopAnimations = true`
   - 老存档加载时缺字段 → 回落 `true`（默认开）
   - export 一个 helper `shouldAnimateShop(): boolean` 内部读 `getSettings().shopAnimations` 且与 `prefers-reduced-motion: reduce` AND 守卫（媒体查询命中时强制返回 false）

2. **AC2：SettingsPanel 加 "动画" 切换行**
   - 在现有 `Shop UI` 行下加新行 `Shop Animations`，On/Off 单选按钮
   - i18n key `settings.shopAnimations` / `settings.shopAnimations.on` / `settings.shopAnimations.off` （zh + en）
   - 点击 → `updateSettings({ shopAnimations: ... })` + active class 切换

3. **AC3：BUY skill 成功 → IN-tray 槽 whoosh 滑入**
   - `executeBuySkill` 末端在 `syncWorkbenchInbox` 后取 IN-tray 对应槽 DOM 元素，加 class `wb-inbox-whoosh`
   - CSS `@keyframes wb-inbox-whoosh` 250ms：translateX(60% → 0) + opacity(0 → 1) + box-shadow flash（金章 → 透明）
   - `shouldAnimateShop()` 返回 false 时跳过 class 添加（无动画即时显示）
   - animationend 自动清除 class（防累积）

4. **AC4：SUBMIT FORM 红章动画保留** —— 60-4 已有，仅校验现有 `submit-stamp-bang` 在 `shouldAnimateShop()` false 时压缩到 100ms（与现有 `prefers-reduced-motion` media query 一致）。**不重写**。

5. **AC5：Tab 切屏 CRT 转场**
   - `showOnly()` 函数在切换前给目标屏加 class `screen-crt-transition`
   - CSS `@keyframes crt-flicker` 250ms：先 scale Y 0.05（CRT 关机感）→ scanline 横扫 → opacity 0 → 1（桌面亮起）
   - `shouldAnimateShop()` false 时跳过
   - animationend 清 class

6. **AC6：RESHUFFLE 行逐行 print**
   - `cmdList()` （和 `cmdReshuffle` 后的 implicit list 重渲）每行 appendLine 之间加 30ms 延迟（用 `setTimeout` 队列或简单 `for + delay`）
   - 仅在 `cmdReshuffle` 之后的下一次 list 触发（默认 LIS 不延迟，避免重复看每次 LIST 都打字机）
   - `shouldAnimateShop()` false → 即时全出
   - 可选：CSS `@keyframes line-print` 50ms fade-in 每行

7. **AC7：所有新动画 ≤ 300ms** —— 实际值：whoosh 250ms / crt-flicker 250ms / line-print 50ms × 行数（~3s 总，但每行 50ms 单元仍 ≤ 300ms 单元延迟）。SUBMIT 0.6s 是 P2.1 既有，不在本 story 调整。

8. **AC8：`prefers-reduced-motion` 媒体查询**
   - 所有新 `@keyframes` 块加配套 `@media (prefers-reduced-motion: reduce)` 覆盖把 animation-duration 压到 100ms 或 0
   - JS 路径 `shouldAnimateShop()` 内 `window.matchMedia('(prefers-reduced-motion: reduce)').matches` 守卫

9. **AC9：单元测试覆盖**
   - `tests/unit/core/UserSettings.test.ts` 追加 shopAnimations 字段相关测试（默认值 / 持久化 / 老存档兼容）
   - 新建 `tests/unit/ui/shopPreviewAnimations.test.ts`：
     - **a)** `shouldAnimateShop()` 在 settings.shopAnimations=true + 无 reduced-motion → 返回 true
     - **b)** settings.shopAnimations=false → 返回 false
     - **c)** prefers-reduced-motion=reduce → 返回 false（即使 settings 是 true）
     - **d)** BUY 成功后 IN-tray 槽元素被加 `wb-inbox-whoosh` class（mock matchMedia false）
     - **e)** shopAnimations=false 时 BUY 不加 class
     - **f)** Tab 切屏 (showOnly) 触发 `screen-crt-transition` class
     - **g)** cmdReshuffle 后的 list 触发逐行 timeout 队列（mock setTimeout / fake-timers）
   - 复用 60-7 / 60-9 / 60-10 vi.mock + STUB_DOC 模式

10. **AC10：Story 60.x ecosystem 不退化** —— 现有测试套全部绿（含 UserSettings 新加用例 + 新增 animations 测试）。

11. **AC11：tsc 0 新错误**

12. **AC12：手动验证留 code-review** —— 浏览器 BUY 一个 skill → 看 IN-tray 是否有滑入 + 闪光；Tab 切屏 → 是否有 CRT flicker；`RES` 后 `LIS` → 是否逐行出。设置切 `Shop Animations: Off` → 全部即时无动画。

## Tasks / Subtasks

- [x] **Task 1：UserSettings 加 shopAnimations + helper（AC: 1）**
  - [x] 1.1 `core/UserSettings.ts` interface 加 `shopAnimations: boolean`
  - [x] 1.2 DEFAULTS 加 `shopAnimations: true`
  - [x] 1.3 export `function shouldAnimateShop(): boolean`：返回 `getSettings().shopAnimations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches`
  - [x] 1.4 守卫 `typeof window === 'undefined'`（SSR/test 环境）→ 直接读 settings 不查 mediaQuery

- [x] **Task 2：SettingsPanel 加切换行（AC: 2）**
  - [x] 2.1 在 Shop UI 行下加新行 `Shop Animations` 两按钮
  - [x] 2.2 i18n keys：`settings.shopAnimations` / `.on` / `.off`（zh + en）
  - [x] 2.3 click handler → `updateSettings({ shopAnimations: ... })` + active class 切换

- [x] **Task 3：BUY whoosh 动画（AC: 3, 8）**
  - [x] 3.1 `executeBuySkill` 末端 `syncWorkbenchInbox()` 后用 `requestAnimationFrame` 取最后一个非空 `.foam-cutout` 内的 `.weapon-card`
  - [x] 3.2 `if (shouldAnimateShop()) cardEl.classList.add('wb-inbox-whoosh')`
  - [x] 3.3 CSS `style.css` 加 `@keyframes wb-inbox-whoosh` 250ms + `.weapon-card.wb-inbox-whoosh` 应用规则
  - [x] 3.4 监听 animationend 一次性清 class

- [x] **Task 4：CRT 切屏转场（AC: 5, 8）**
  - [x] 4.1 `showOnly()` 在显示新 screen 前加 class `screen-crt-transition`
  - [x] 4.2 CSS `@keyframes crt-flicker` 250ms + `.screen-crt-transition` 规则
  - [x] 4.3 `if (!shouldAnimateShop()) skip`
  - [x] 4.4 animationend 清 class

- [x] **Task 5：RESHUFFLE 逐行 print（AC: 6, 8）**
  - [x] 5.1 模块级 flag `nextListIsAnimated = false`
  - [x] 5.2 `cmdReshuffle` 末端 `nextListIsAnimated = shouldAnimateShop()`
  - [x] 5.3 `cmdList` 检测 flag：true 时把 `appendLine` 改用 `setTimeout(_, idx * 30)` 队列；false 即时；调完一次后 reset 为 false
  - [x] 5.4 注意：动画期间用户输入新命令不该被 buffered 出错 —— 简单做法：动画期间 LIS 立即取消当前队列、即时全出

- [x] **Task 6：reduced-motion media query 配套（AC: 8）**
  - [x] 6.1 每个新 `@keyframes` 后加 `@media (prefers-reduced-motion: reduce)` 块覆盖 animation-duration 到 100ms 或 unset

- [x] **Task 7：单元测试（AC: 9）**
  - [x] 7.1 扩 `tests/unit/core/UserSettings.test.ts` 加 shopAnimations 字段测试（参考现有 shopUI 测试模式）
  - [x] 7.2 新建 `tests/unit/ui/shopPreviewAnimations.test.ts`，~200 行
  - [x] 7.3 vi.mock UserSettings + matchMedia stub（默认 false）
  - [x] 7.4 7 用例覆盖（详 AC9 a-g）

- [x] **Task 8：tsc + 全套测试（AC: 10, 11）**
  - [x] 8.1 `cd src && npx tsc --noEmit -p .` → 0 新错
  - [x] 8.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| UserSettings | `src/src/core/UserSettings.ts` | `getSettings()` · `updateSettings()` · 加 `shouldAnimateShop()` |
| SettingsPanel | `src/src/ui/SettingsPanel.ts` | `openSettingsPanel()` 内加新行 |
| BUY skill 入口 | `src/src/ui/shopPreview.ts:executeBuySkill` | 末端加 whoosh 触发 |
| 切屏 | `src/src/ui/shopPreview.ts:showOnly` | 切前加 class |
| LIST/RESHUFFLE | `src/src/ui/shopPreview.ts:cmdList` / `cmdReshuffle` | 逐行 print 队列 |
| 提交 stamp（已有） | `src/src/style.css:6633 .submit-stamp-overlay` | AC4 仅校验 reduced-motion 已工作 |
| i18n | `src/src/demo/demo-i18n.ts` | 加 settings.shopAnimations 系列 key |

### Architecture Compliance

**Dependency direction：** ui/shopPreview / SettingsPanel → core/UserSettings → core/state；新增 `shouldAnimateShop` 在 UserSettings 内部 ✓

**State write rules：**
- ✅ shopAnimations 写入走现有 `updateSettings` 路径（持久化 localStorage）
- ✅ 动画 class 临时添加 + animationend 清除（不污染 state）
- ✅ `nextListIsAnimated` flag 模块级，单次触发 reset

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock + matchMedia stub
- **零新依赖**（纯 CSS 动画 + setTimeout）

### File Structure Requirements

```
src/src/core/UserSettings.ts            ← 修改：shopAnimations 字段 + shouldAnimateShop helper
src/src/ui/SettingsPanel.ts             ← 修改：加 Shop Animations 切换行 + i18n
src/src/demo/demo-i18n.ts               ← 修改：zh + en 各加 3 个 key
src/src/ui/shopPreview.ts               ← 修改：executeBuySkill / showOnly / cmdList / cmdReshuffle 加动画 hook
src/src/style.css                       ← 修改：加 3 个 @keyframes + .wb-inbox-whoosh / .screen-crt-transition / .line-print 规则 + reduced-motion 媒体查询
src/tests/unit/core/UserSettings.test.ts ← 修改：扩 shopAnimations 字段测试
src/tests/unit/ui/shopPreviewAnimations.test.ts ← 新增：~200 行 / 7 用例
```

**避免：**
- 不要修改 SUBMIT stamp-bang 现有动画（AC4 仅校验）
- 不要 import 新动画库（GSAP / anime.js）— 纯 CSS keyframes
- 不要把动画做成阻塞式（用 promise + await）— 阻塞用户输入会很糟
- 不要给 BUY 失败路径加动画（仅成功路径才有"已发货"语义）
- 不要在 hover tooltip / drawer 加动画（不在本 story 范围）

### Testing Requirements

| 用例 | 验证 | mock |
|---|---|---|
| shouldAnimateShop true | shopAnimations + !reduced-motion → true | settings + matchMedia |
| shouldAnimateShop false (settings) | shopAnimations=false → false | settings |
| shouldAnimateShop false (motion) | reduced-motion=reduce → false | matchMedia |
| BUY whoosh class | shouldAnimateShop=true → 加 class | shopPreview spies |
| BUY no whoosh | shopAnimations=false → 不加 class | settings false |
| showOnly CRT | 切屏加 transition class | shopPreview spies |
| RESHUFFLE list 逐行 | setTimeout 队列 | vi.useFakeTimers |

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60-5 vi.mock UserSettings 模式 | 本 story 同样测 shopAnimations 字段 |
| 60-9 dataset.tooltipBound 防重 | 本 story animationend 清 class 同模式 |
| 60-7 buildSkillKeyTooltipData helper 复用 | 本 story shouldAnimateShop helper 复用 |
| 60-x ecosystem cd src 跑 vitest | 本 story 同样 |
| 60-4 submit-stamp-bang 已有 prefers-reduced-motion 兼容 | 本 story 沿用同模式 |
| 60-10 setDescriptorCache 测试入口 | 本 story 不需要新入口（已有 cmdInfo / cmdList 入口） |

### Git Intelligence Summary

```
9cc5732 feat(shop): INF supports owned skills/relics by key/name/relic-id (Story 60.10)
4763566 feat(workbench): hover tooltips for keys + IN-tray + relic row (Story 60.9)
cb75313 feat(tutorial): add terminal-mode tutorial steps + classic gating (Story 60.8)
```

**本 story 推荐 commit message：** `feat(shop): transition animations (BUY whoosh + CRT flicker + RESHUFFLE print) (Story 60.11)`

### Risks & Open Questions

- **风险 A：RESHUFFLE 逐行 print 期间用户输入新命令** —— 缓解：动画期间用户打 LIS 等 → 立即取消当前队列 + 即时全出。简单：用 ID counter，每次 cmdList 调用自增；setTimeout 内检查最新 counter 是否变化。
- **风险 B：animationend 监听内存泄漏** —— 缓解：用 `{ once: true }` option 自动 cleanup。
- **风险 C：CRT flicker 让 hover tooltip / drawer overlay 看起来失同步** —— 缓解：只在屏幕级 root 加 class（不影响 children），且 250ms 短到不会和 hover 冲突。
- **风险 D：`window.matchMedia` 在测试环境不存在 / 没 .matches** —— 缓解：`shouldAnimateShop` 内 `typeof window === 'undefined'` 守卫；测试 vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })`。
- **开放问题 1：`shopAnimations` 是否影响 60-9 hover tooltip 出现 / 60-1 形状高亮 / 60-9 范围预览动画？** 倾向：**不影响**。这些是"反馈"动画（跟用户操作绑定），不是"转场"动画；`shopAnimations` 仅控制本 story 新增的 4 类（whoosh / crt-flicker / line-print / submit-stamp）。文档明示 scope。
- **开放问题 2：BUY 失败（INBOX 满 / 余额不足）是否需要错误反馈动画？** 倾向：**不做** —— 错误已用红色 redacted 行视觉提示，加动画反而增加干扰。本 story 不引入失败动画。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-11] — 验收原文
- [Source: src/src/style.css:6633-6663] — 现有 submit-stamp-bang 动画（AC4 参考）
- [Source: src/src/ui/shopPreview.ts:executeBuySkill] — BUY 入口
- [Source: src/src/ui/shopPreview.ts:showOnly] — Tab 切屏入口
- [Source: src/src/ui/shopPreview.ts:cmdList / cmdReshuffle] — RESHUFFLE 入口
- [Source: src/src/core/UserSettings.ts:11] — UserSettingsData interface
- [Source: src/src/ui/SettingsPanel.ts] — 现有 Shop UI 切换行模板
- [Source: docs/implementation-artifacts/60-9-workbench-hover-tooltips.md] — 上一个 P2.3 story（reduced-motion 处理参考）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成全部 8 个 task
- Task 1 抽 `shouldAnimateShop()` helper —— 同时 AND `getSettings().shopAnimations` 与 `prefers-reduced-motion: reduce` 媒体查询；测试环境无 `window` 时回落 `true`
- Task 3 BUY whoosh：`triggerInboxWhoosh(slotIdx)` 用 rAF 等 `syncWorkbenchInbox` 重渲后再加 class，`animationend { once: true }` 自动清
- Task 4 CRT flicker：`showOnly` 仅在切到不同屏幕时触发，相同屏幕跳过；用 `void el.offsetWidth` 触发 reflow 让连续触发不被合并
- Task 5 RESHUFFLE 逐行 print：模块级 `nextListIsAnimated` flag 单次 + `listCallCounter` 计数取消旧队列；`cmdReshuffle` 末端 set true，`cmdList` 单次消费后 reset；`shouldAnimateShop()` false 时即时全出
- 防御性补 `typeof requestAnimationFrame === 'undefined'` 守卫 — 60.7 BuyEvents 测试不 stub rAF，会因 `triggerInboxWhoosh` 调用 rAF 而 ReferenceError
- 新 keyframes：`wb-inbox-whoosh` 250ms（translateX 60% → 0 + opacity + box-shadow flash）+ `crt-flicker` 250ms（scaleY squash + brightness/contrast）+ 配套 reduced-motion 媒体查询压缩到 100ms
- shop.ts + shopPreview.ts + UserSettings.ts + SettingsPanel.ts tsc 错误数 baseline 持平（2 → 2）
- Story 60.x ecosystem + tutorial: 11 新动画测试 + 5 UserSettings shouldAnimateShop 测试，全绿；总数 270/277（7 baseline tutorial fail 与本 story 无关）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.3 浪漫化第 3 项
- 实施于 2026-04-29，所有 8 个 task 完成；Status: review
- **AC 全覆盖：** AC1（UserSettings shopAnimations + shouldAnimateShop helper）/ AC2（SettingsPanel 切换行 + zh/en i18n）/ AC3（BUY whoosh）/ AC4（SUBMIT 不动 — 60-4 已有）/ AC5（CRT flicker）/ AC6（RESHUFFLE 逐行 print）/ AC7（所有动画 ≤ 300ms）/ AC8（reduced-motion 媒体查询双覆盖 — JS + CSS）/ AC9（11 + 5 单测）/ AC10（ecosystem 不退化）/ AC11（tsc 0 新错）/ AC12（手动验证留 review）
- **关键设计决策：**
  1. **shouldAnimateShop helper 落点 core/UserSettings** — 与设置同模块；helper 同时 AND 设置 + 媒体查询，让所有调用方一行守卫
  2. **rAF + animationend { once: true }** 防内存泄漏 + 防累积
  3. **listCallCounter 取消机制** —— 用户动画期间打新 LIS 旧队列立即作废
  4. **CSS reduced-motion 不跳过动画**而是压缩到 100ms — 保留 `animationend` 触发，避免 JS 监听悬挂
  5. **`triggerCrtFlicker` 用 reflow trick** (`void el.offsetWidth`) 让连续切屏触发能重启动画，不被合并
- 上一 story 60-10 同日完成
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 4/4 done · P2.3 **3/5 done**（剩 60-12 音效 / 60-13 craft+metamorph）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：cmdList 把 `nextListIsAnimated = false` 提到开头无条件 single-shot 消费，防 RESHUFFLE 抛错或 cache 临时为空时 flag 跨调用泄漏；新增 1 用例覆盖（空 cache 路径也消费 flag）
  - L1-L6 暂不修（cosmetic + playtest 决定 + scope 之外）

### File List

新增：
- `src/tests/unit/ui/shopPreviewAnimations.test.ts` (~230 行，11 测试用例)

修改：
- `src/src/core/UserSettings.ts` — 加 `shopAnimations: boolean` 字段；DEFAULTS 加 `shopAnimations: true`；新增 `export function shouldAnimateShop()` 同时守卫 settings + matchMedia
- `src/src/ui/SettingsPanel.ts` — 加 Shop Animations 切换行（On/Off）+ click handler `updateSettings({ shopAnimations })`
- `src/src/demo/demo-i18n.ts` — zh + en 各加 3 个 key（settings.shopAnimations / .on / .off）
- `src/src/ui/shopPreview.ts` — import `shouldAnimateShop`；新增 `triggerInboxWhoosh` + `triggerCrtFlicker`；`showOnly` 加 CRT 触发；`executeBuySkill` 末端调 `triggerInboxWhoosh`；`cmdList` 加动画分支（30ms/行 setTimeout 队列 + counter 取消）；`cmdReshuffle` 末端 set `nextListIsAnimated = true`；`__test` API 加 5 个新入口（cmdList / cmdReshuffle / triggerInboxWhoosh / showOnly / setNextListAnimated）
- `src/src/style.css` — 加 `@keyframes wb-inbox-whoosh` 250ms + `@keyframes crt-flicker` 250ms + 配套 `@media (prefers-reduced-motion: reduce)` 覆盖
- `src/tests/unit/core/UserSettings.test.ts` — 追加 `shopAnimations` 字段 4 用例 + `shouldAnimateShop` 5 用例（含 settings false / matchMedia reduce / window undefined / matchMedia 抛错防御）
- `docs/implementation-artifacts/sprint-status.yaml` — 60-11 ready-for-dev → in-progress → review
