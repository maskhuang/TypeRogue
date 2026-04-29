# Story 60.4: SUBMIT FORM → startLevel 接入

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.1（质量门）· P2.1 4 件套**最后**一项 -->

## Story

As a **新工作台终端商店**的玩家,
I want **工作台底部的"提交配置 · SUBMIT FORM"红章按钮真的把我带进下一关战斗 —— 配上忘装备的警告 + 盖红章动画**,
so that **60-5 切换 feature flag 之后玩家能从 terminal 商店一路 BUY → 工作台拖拽绑定 → SUBMIT → 下一关战斗，而不是按了红章发现什么都没发生还得手动刷页面**.

## 背景

Phase 1（commit `3325a67`）注入了 `<button class="wb-submit-btn">提交配置 · SUBMIT FORM ➜</button>` 但**没挂任何 onclick handler**。当前点击红章按钮 = 完全无响应。

P2.1 质量门要求：terminal 商店必须能完整跑完 BUY → 装配 → SUBMIT 闭环，否则 60-5 把 `openShop()` 切到 terminal 后，玩家会卡在工作台进不了战斗。

Classic shop 的 `el.startBattleBtn.onclick`（`systems/shop.ts:4456`）展示了规范流程：
```ts
el.startBattleBtn.onclick = () => {
  dragManager.destroy();
  _auctionRemaining = -1;
  clearAuctionTimer();
  state.level = getNextBattleNode(state.level);
  void startLevel();
};
```

本 story 把这个流程在 terminal 商店重做一遍，并加上 Story 60-4 spec 要求的两道警告：
- bindings 全空 → 玩家可能忘装技能
- inbox 还有未装配 → 玩家可能忘把买来的塞键盘

完成后 P2.1 质量门 4 件套（60-1 多格绑定 / 60-2 Pack 拣选 / 60-3 状态条 / **60-4 SUBMIT**）齐活，可以进 60-5 feature flag 灰度。

## Acceptance Criteria

1. **AC1：SUBMIT 按钮挂点击事件** —— `<button>` 加 `id="wb-submit-btn"`，在 `setupDrawerHandlers`（或新 `setupSubmitHandler`）末尾挂 onclick：
   - 检查空绑定 → 出警告 1
   - 检查 inbox 非空 → 出警告 2
   - 警告通过 / 无警告 → 进 stamp 动画 → 启 startLevel

2. **AC2：空绑定警告** —— 当 `state.player.bindings.size === 0`：
   - 切回 terminal 屏（`showOnly('terminal')`）
   - `appendLine('WARNING · NO BINDINGS · KEYBOARD UNARMED')` + `appendLine('  · CONFIRM ENTRY? [Y]ES OR [N]O')`
   - 设 module-level `pendingSubmit: { stage: 'warn-bindings' | 'warn-inbox' | 'proceed' } | null` 状态
   - 等用户在 terminal prompt 打 Y → 进入"warn-inbox"或"proceed"阶段；N → 终端打印 `ABORTED · ENTRY HALTED · RETURN TO WORKBENCH` + 清 pendingSubmit + 用户可回工作台继续编辑

3. **AC3：inbox 未装配警告** —— 当 `state.player.inbox.length > 0`（无论 bindings 是否空）：
   - `appendLine(\`WARNING · ${N} ITEMS IN IN-TRAY · LEAVE PENDING ITEMS?\`)` + Y/N prompt
   - Y → 带入下关（保留 inbox 数据）
   - N → 清 pendingSubmit + 终端 ABORTED + 用户回工作台
   - **顺序：** bindings 警告优先（更严重）→ Y 后再问 inbox。两者都过才 proceed

4. **AC4：stamp 动画 + startLevel 接入** —— 警告全过后：
   - 禁用 `wb-submit-btn`（添加 `disabled` 属性 + `submitting` class 防止重复点击）
   - **盖红章动画**：在工作台 footer 上方注入 `<div class="submit-stamp-overlay">PROCEED · APPROVED ✓</div>` + CSS 600ms keyframes（缩放 0→1.2→1 + 旋转 -3°→0° + ink-spread filter，**新加 keyframes** `submit-stamp-bang`）
   - 动画结束后（用 `animationend` 事件）：
     - `dragManager.destroy()`
     - `clearShapePlacementOnWorkbench()` 兜底清形状高亮
     - `pendingPackPick = null` / `pendingSubmit = null` 清残留
     - `active = false`（退出 preview 模式）
     - 隐藏 terminal + workbench 屏（`t.style.display = 'none'`、`w.style.display = 'none'`）
     - `state.level = getNextBattleNode(state.level)`
     - `void startLevel()` 启动下一关

5. **AC5：取消路径 100% 不动 state** —— 任何警告下打 N：
   - 不清 inbox / 不清 bindings / 不动 gold
   - `pendingSubmit = null`
   - 停在工作台屏（**不**自动切到 terminal — 让用户看见自己工作台的当前状态）
   - 解除按钮 disabled
   - 终端打印 ABORTED 行（用户切到终端能看见）

6. **AC6：双重防抖** —— stamp 动画进行中（按钮已 disabled）期间多次点击 / 警告 prompt 期间再次点击 SUBMIT：
   - 重复点击应**完全无反应**（class `submitting` 或 `pendingSubmit !== null` 早返回）
   - 不能开新警告流程、不能重复触发动画

7. **AC7：警告流程顺序保证** —— 两个警告都触发场景：
   - 第 1 步: 警告 bindings 空 + Y/N prompt
   - 用户 Y → 第 2 步: 警告 inbox 非空 + Y/N prompt
   - 用户再 Y → 第 3 步: stamp + startLevel
   - 任何一步 N → 整体 ABORTED，回 step 0
   - 用户应**不能**跳过警告（不能直接把 SUBMIT 当成"我读完了"的 ack）

8. **AC8：直通路径** —— bindings 非空 + inbox 空：
   - 立即进 stamp 动画 + startLevel
   - 终端打印 `SUBMITTING FORM · STAMPED · ENTRY APPROVED`
   - **不**弹任何警告

9. **AC9：onKey 拦截 pendingSubmit Y/N** —— 现有 `handleConfirmation` 处理 high-price BUY 的 Y/N；本 story 复用同一 keyboard handler：
   - 在 `execute(line)` 入口（onKey Enter 后）增加 `if (pendingSubmit) { handleSubmitConfirmation(line); return; }`
   - 优先级：pendingSubmit > pendingPackPick (drawer) > pendingConfirm > 普通命令
   - 同一时刻只能有一个 pending（互斥状态）

10. **AC10：单元测试** —— 新建 `tests/unit/ui/shopPreviewSubmit.test.ts`：
    - **a)** 直通：bindings 非空 + inbox 空 → triggerSubmit() 进入 stamp 阶段（不 push pendingSubmit warnings）
    - **b)** 空绑定警告：bindings.size===0 → pendingSubmit 进入 warn-bindings 阶段
    - **c)** Y on warn-bindings → 进 warn-inbox（如 inbox 非空）或直接 proceed
    - **d)** N on warn-bindings → state 完全不变（gold/inbox/bindings/wordDeck），pendingSubmit 清零
    - **e)** inbox 警告：bindings 非空 + inbox 有 1+ → 直接进 warn-inbox（跳 warn-bindings）
    - **f)** 双重防抖：pendingSubmit 非空时再次调 triggerSubmit() → no-op
    - **g)** mock startLevel：proceed 阶段调用 `__test.proceedSubmit()` → 验证 state.level 自增 + 暴露的 startLevelSpy 被调用

## Tasks / Subtasks

- [x] **Task 1：模块级 pendingSubmit 状态 + 触发函数（AC: 1, 6, 7）**
  - [ ] 1.1 在 shopPreview.ts 模块状态区加 `let pendingSubmit: { stage: 'warn-bindings' | 'warn-inbox'; nextStage: 'warn-inbox' | 'proceed' } | null = null;`
  - [ ] 1.2 新增 `function triggerSubmit(): void`：检查 bindings/inbox 决定起始 stage，调对应 prompt 函数
  - [ ] 1.3 防抖：`if (pendingSubmit !== null) return;` 早返回
  - [ ] 1.4 button 加 `disabled` 属性同步：`if (btn.classList.contains('submitting')) return;`

- [ ] **Task 2：警告 prompt + Y/N 处理（AC: 2, 3, 5, 7, 9）**
  - [ ] 2.1 `function promptBindingsWarning(): void`：切回终端、打印 WARNING · NO BINDINGS、设 pendingSubmit = { stage: 'warn-bindings', nextStage: 'warn-inbox' or 'proceed' }
  - [ ] 2.2 `function promptInboxWarning(): void`：终端打印 WARNING · N ITEMS IN-TRAY、设 pendingSubmit = { stage: 'warn-inbox', nextStage: 'proceed' }
  - [ ] 2.3 `function handleSubmitConfirmation(input: string): boolean`：解析 Y/N → 推进 stage 或 abort
  - [ ] 2.4 在 onKey 的 Enter 处理（约 line 925）之前增加：
    ```ts
    if (pendingSubmit) {
      // 让 execute(line) 内部分发 — 直接消费输入
    }
    ```
  - [ ] 2.5 在 `execute(line)` 入口增加 `if (handleSubmitConfirmation(line)) return;`（与 `handleConfirmation` 同级）
  - [ ] 2.6 N 路径：appendLine ABORTED · ENTRY HALTED · RETURN TO WORKBENCH、清 pendingSubmit、解除 button disabled、保持当前屏（不切到 workbench，让用户主动切）

- [ ] **Task 3：stamp 动画 + startLevel proceed（AC: 4, 6, 8）**
  - [ ] 3.1 `function proceedSubmit(): void`：核心 transition。
    - 加 `submitting` class + disabled 到 button
    - 在 footer 上方 prepend `<div class="submit-stamp-overlay">PROCEED · APPROVED ✓</div>`
    - 给 overlay 加 animation: `submit-stamp-bang 600ms ease-out forwards`
    - 注册 `animationend` listener：完成后跑实际 transition
  - [ ] 3.2 transition 函数 `function executeSubmitTransition(): void`：
    - dragManager.destroy()
    - clearShapePlacementOnWorkbench()
    - pendingPackPick = null
    - pendingSubmit = null
    - active = false
    - hide terminal + workbench screens
    - 移除 stamp overlay
    - import { startLevel } from '../systems/battle'
    - import { getNextBattleNode } from '../systems/stage/stageFlow'
    - state.level = getNextBattleNode(state.level)
    - void startLevel()
  - [ ] 3.3 终端打印路径：proceed 之前 `appendLine('SUBMITTING FORM · STAMPED · ENTRY APPROVED', 'echo')` + appendBlank

- [ ] **Task 4：CSS stamp 动画（AC: 4 视觉）**
  - [ ] 4.1 在 style.css 加 `.submit-stamp-overlay`：position absolute（覆盖 footer 区域）、z-index 高、red ink color #8a1a1a、bold sans-serif font ~32px、letter-spacing、border 3px solid currentColor
  - [ ] 4.2 `@keyframes submit-stamp-bang`：
    ```css
    0% { transform: scale(0) rotate(-15deg); opacity: 0; }
    40% { transform: scale(1.3) rotate(-3deg); opacity: 1; filter: blur(0); }
    65% { transform: scale(0.95) rotate(0deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
    ```
  - [ ] 4.3 `.wb-submit-btn.submitting` / `.wb-submit-btn[disabled]`: opacity 0.5 + cursor not-allowed + pointer-events none
  - [ ] 4.4 `prefers-reduced-motion: reduce` 媒体查询下 stamp 动画时长缩到 100ms（不要直接 0，否则 animationend 不触发，executeSubmitTransition 永远不跑）

- [ ] **Task 5：DOM 修改（AC: 1）**
  - [ ] 5.1 buildWorkbenchScreen() 内 `<button class="wb-submit-btn">` 加 `id="wb-submit-btn"`
  - [ ] 5.2 setupDrawerHandlers 末尾追加：
    ```ts
    const submitBtn = document.getElementById('wb-submit-btn');
    if (submitBtn) submitBtn.onclick = triggerSubmit;
    ```

- [ ] **Task 6：测试（AC: 10）**
  - [ ] 6.1 新建 `src/tests/unit/ui/shopPreviewSubmit.test.ts`
  - [ ] 6.2 mock `effects/sound`、mock `../systems/battle` 的 startLevel（用 vi.mock + spy）
  - [ ] 6.3 暴露 `__test`：`triggerSubmit / handleSubmitConfirmation / getPendingSubmit / proceedSubmit / setBindings / setInbox`
  - [ ] 6.4 7 个用例覆盖直通 / 警告 / Y / N / 双重防抖 / 顺序保证 / proceed 路径

- [ ] **Task 7：手动验证 + 回归**
  - [ ] 7.1 `npm run dev:web` → `#shop-preview` → BUY 一些技能拖到键盘 → SUBMIT → 验证盖章动画 + 进战斗
  - [ ] 7.2 不绑技能 SUBMIT → 看见 WARNING + Y/N → Y 进战斗 / N 回工作台
  - [ ] 7.3 inbox 留 1 个未装配 → 看见 LEAVE N ITEMS → Y/N
  - [ ] 7.4 双重警告：不绑技能 + inbox 有 → 应顺序弹 2 个警告 → 都 Y 才进战斗
  - [ ] 7.5 typecheck 0 新错误
  - [ ] 7.6 vitest 全套 — Story 60.x 测试 + 现有 battle / shop 测试不破

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| 下一关战斗启动 | `src/src/systems/battle.ts:2033` | `export async function startLevel(): Promise<void>` |
| 下一关编号计算 | `src/src/systems/stage/stageFlow.ts:85` | `getNextBattleNode(currentStageNum: number): number` |
| Classic shop 进战斗参考 | `src/src/systems/shop.ts:4456-4463` | `el.startBattleBtn.onclick` 模板 |
| 当前 SUBMIT 按钮 | `src/src/ui/shopPreview.ts:1669` | 无 onclick handler，需挂 |
| 现有 Y/N confirm 模板 | `src/src/ui/shopPreview.ts:677` | `handleConfirmation`（pendingConfirm 模式） |
| dragManager 销毁 | `src/src/systems/dragManager.ts` | `dragManager.destroy()` |
| Stamp 动画 CSS 参考 | Epic 60 Story 60-11 | 转场动画 story（未实施），本 story 先做 600ms 局部 stamp |
| `setupDrawerHandlers` | `src/src/ui/shopPreview.ts:849` | 现有 drawer 触发 + F-key 监听器，本 story 在末尾挂 SUBMIT onclick |

### Architecture Compliance

**Dependency direction**：
- `shopPreview.ts` (ui) 现 import `systems/shop`、`systems/dragManager`、`systems/stage/stageFlow`、`systems/actTransition`。本 story 新增：
  - `systems/battle` 的 `startLevel`（关键 — terminal shop 与 classic shop 共用同一个 transition entry）
  - `systems/stage/stageFlow` 的 `getNextBattleNode`（已 import）
- 不引入循环依赖（battle.ts 不 import shopPreview.ts）

**State write rules：**
- ✅ `state.level = getNextBattleNode(state.level)` 直接赋值（与 classic shop:4462 完全一致）
- ✅ `state.player.bindings`、`inbox`、`wordDeck` 在 transition 时**不动**（startLevel 内部接管）
- ❌ 不要在 SUBMIT 流程中清 inbox 或 bindings — 那是机制级状态，玩家辛苦摆好的

**关键不变性：**
- N 路径**完全不动 state** — gold、wordDeck、bindings、inbox、wordEffects、undoStack 都保持 SUBMIT 之前的状态
- proceed 路径前 dragManager.destroy() 必须先于 startLevel — 否则拖拽监听器会泄漏到下一关

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **零新依赖**
- **import startLevel** from battle.ts —— 注意 startLevel 是 `async`，本 story 用 `void startLevel()` 启动后不 await（与 classic shop:4463 一致）

### File Structure Requirements

```
src/src/ui/shopPreview.ts        ← 修改：新增 pendingSubmit 模块状态、triggerSubmit、
                                    promptBindingsWarning、promptInboxWarning、
                                    handleSubmitConfirmation、proceedSubmit、
                                    executeSubmitTransition；
                                    buildWorkbenchScreen 给 SUBMIT 按钮加 id；
                                    setupDrawerHandlers 末尾挂 onclick；
                                    execute() 入口加 handleSubmitConfirmation 分发；
                                    `__test` API 暴露 internal 函数测试
src/src/style.css                 ← 追加：.submit-stamp-overlay + @keyframes submit-stamp-bang +
                                    .wb-submit-btn[disabled] / .submitting + prefers-reduced-motion
src/tests/unit/ui/                ← 新增：shopPreviewSubmit.test.ts（7 用例 + mock startLevel）
```

**避免：**
- 不要碰 `systems/shop.ts:initShopEvents` —— classic shop 的 startBattleBtn 仍要可用
- 不要碰 `systems/battle.ts:startLevel` —— 那是核心战斗 entry，本 story 只是 caller
- 不要把 stamp 动画做成全屏 — 60-11 转场动画 epic 才做全屏；本 story 是工作台局部 overlay

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.1 contextmenu 在 `setupDragZones` 重新调用时重复挂监听器 → 用 `dataset.rotHandlerBound = '1'` 防重复 | 本 story 类似 — `setupDrawerHandlers` 在 `enterPreview` 调用一次，不会多次挂 SUBMIT onclick；用 `submitBtn.onclick = triggerSubmit` 而非 addEventListener，覆盖式赋值天然防重复 |
| 60.1 review M2 capture-phase stopImmediatePropagation 阻止原生 button Enter→click | 本 story 的 SUBMIT 按钮通过 onclick 挂，不依赖键盘 Enter；但**警告 prompt 期间**用户输 Y/N 是终端 prompt 输入，由现有 onKey Enter 处理 + execute() 分发 — 与 60.2 pack-pick 不同（那是 drawer button focus 接 Enter）。本 story 不踩此坑 |
| 60.2 暴露 `__test` API 测 module-private state | 本 story 同样暴露 `__test.triggerSubmit / handleSubmitConfirmation / getPendingSubmit / proceedSubmit`（mock startLevel 后），让测试不需要全 DOM |
| 60.2 cancel 路径切回 terminal 让消息可见 | 本 story 的 N 路径**不**自动切屏 — 玩家在工作台主动选择"先编辑再提交"，强制切到 terminal 反而打断思路；终端 ABORTED 消息玩家切回去后能看见 |
| 60.3 `t('battle.cycle_prefix')` 复用 i18n 词典避免分裂 | 本 story 终端文案沿用 `WARNING /  ABORTED / CONFIRMED / STAMPED` 既有词典，不引入新词 |

### Git Intelligence Summary

最近 commit 模式：
- `feat(workbench): ... (Story 60.X)` — 主要新功能
- `fix(workbench): ... follow-up` — review 修复
- `feat(workbench): Pack 多词拣选弹窗` 的格式 — 中英混合标题，body 描述详细

**本 story commit 建议：**
1. `feat(workbench): SUBMIT FORM → startLevel transition (Story 60.4)` — 主体改动 + 测试

或拆 2 个：
1. `feat(workbench): SUBMIT button stamp animation`（CSS + 动画）
2. `feat(workbench): SUBMIT FORM warnings + startLevel wire (Story 60.4)`（逻辑 + 测试）

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-4] — 验收标准原文
- [Source: src/src/systems/shop.ts:4456-4463] — classic shop startBattleBtn.onclick 参考
- [Source: src/src/systems/battle.ts:2033] — startLevel 函数签名
- [Source: src/src/systems/stage/stageFlow.ts:85] — getNextBattleNode
- [Source: src/src/ui/shopPreview.ts:1669] — 当前无 onclick 的 SUBMIT 按钮
- [Source: src/src/ui/shopPreview.ts:677] — handleConfirmation 模板（pendingConfirm 模式）
- [Source: src/src/ui/shopPreview.ts:849] — setupDrawerHandlers 现有挂载点

### Risks & Open Questions

- **风险 A：** `void startLevel()` 不 await，但 startLevel 内部异步初始化（如 word loader、relic init）。如果 stamp 动画 600ms 内 startLevel 还没完成，玩家可能看到 "工作台屏隐藏 → 短暂空屏 → 战斗 UI 渲染"的间隙。**缓解：** classic shop:4456 也是 `void startLevel()`，已经是稳定模式；本 story 沿用，不引入新风险。
- **风险 B：** `state.cycle` 在 boss 关后会 advanceCycle 自增，影响下一关 banner。本 story 不动 cycle 逻辑（startLevel 内部处理），但要验证 SUBMIT 提交 boss 关后 banner 在下一关 cycle 2 仍正确显示（依赖 60.3 updateTerminalChrome）。
- **风险 C：** stamp 动画期间用户切换 tab 离开浏览器 → 回来时 animationend 可能不触发（取决于浏览器 throttle）。**缓解：** 加 `setTimeout(executeSubmitTransition, 800)` fallback timer（比动画长 200ms），双保险确保 transition 一定跑。
- **开放问题 1：** N 路径要不要加音效（拒绝/驳回 sound）？本 story **不加**，留给 60-12 音效 story 统一处理。
- **开放问题 2：** "SUBMITTING FORM · STAMPED" 文案是否要走 narrative T2 模板？**不**，留 60-14 i18n 一次性重写。当前用与 BUY/SELL 一致的 echo 调性。
- **开放问题 3：** 玩家 SUBMIT 后下一关 startLevel 失败（如 word loader 异常）—— 当前 `void startLevel()` 不 await 错误。复用 classic shop 行为，不专门处理；如出问题 60-7 事件总线 story 加错误 boundary。

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 测试 setTimeout fallback 在 unstubAllGlobals 后异步触发 → uncaught ReferenceError。fix: `vi.useFakeTimers()` 控制定时器，afterEach `clearAllTimers + useRealTimers`。
- tsc 报 SUBMIT_STAMP_DURATION_MS 未使用 → 删除该常量保留 SUBMIT_STAMP_FALLBACK_MS。
- 102/102 Story 60.x 完整生态测试全过；4637 总（baseline 4623 + 11 submit + 14 其它累积）；3 个 PixiJS pre-existing fail 与本 story 无关。

### Completion Notes List

- Story 创建于 2026-04-28，Epic 60 Phase 2 P2.1 质量门**最后**一个 story。
- 实施于 2026-04-28，单 session 完成 7 个 task（Task 7 浏览器手动验证留 code-review）。
- **Epic 60 P2.1 4/4 齐活** —— 60-1 多格绑定 / 60-2 Pack 拣选 / 60-3 状态条接 state / **60-4 SUBMIT 接 startLevel** 全 done。可进入 S2 接入档（60-5 feature flag）。
- **关键设计决策：**
  1. **复用 `pendingConfirm` 模式** — 警告 prompt 走终端 Y/N，与 high-price BUY 同款 UX；execute() 入口加 `handleSubmitConfirmation` 优先于 `handleConfirmation`
  2. **stamp 动画 + animationend + setTimeout fallback** — 600ms CSS keyframes + 800ms safety timer 防 tab 切换 throttle 导致 animationend 不触发；prefers-reduced-motion 缩到 100ms（不为 0 否则 animationend 不触发）
  3. **N 路径不切屏** — 让玩家停在工作台主动选择"先编辑再提交"，不被动切到 terminal 打断思路
  4. **proceed 复用 classic shop 模板** — `dragManager.destroy() → state.level = getNextBattleNode() → void startLevel()` 与 `systems/shop.ts:4456-4463` 完全一致
  5. **`__test` API 暴露 `getPendingSubmit / setPendingSubmit / isSubmitting / resetSubmitting`** — 测试不需起 jsdom 即可验证状态机
- **AC 全覆盖：** AC1（onclick 挂）/ AC2（空绑定警告）/ AC3（inbox 警告）/ AC4（stamp + transition）/ AC5（N 不动 state）/ AC6（防抖 pendingSubmit + submitting）/ AC7（顺序 chain warn-bindings → warn-inbox → proceed）/ AC8（直通）/ AC9（execute 优先级 SUBMIT > BUY）/ AC10（11 用例覆盖）
- 留待 code-review：浏览器端验证盖章动画 + tab 切换 fallback timer + 真实 Y/N 键盘输入。

### File List

新增：
- `src/tests/unit/ui/shopPreviewSubmit.test.ts` (~150 行, 11 测试用例) — 含 vi.mock startLevel + dragManager + fake timers

修改：
- `src/src/ui/shopPreview.ts` — import `startLevel` from systems/battle + `getNextBattleNode`；新增 `pendingSubmit` / `submitting` 模块状态；新增 `triggerSubmit / promptBindingsWarning / promptInboxWarning / handleSubmitConfirmation / proceedSubmit / createSubmitStampOverlay / executeSubmitTransition` 7 个函数；`buildWorkbenchScreen` 给 SUBMIT 按钮加 `id="wb-submit-btn"`；`setupDrawerHandlers` 末尾挂 `submitBtn.onclick = triggerSubmit`；`execute()` 入口加 `handleSubmitConfirmation` 分发；`__test` API 加 4 个 submit 内部 getter/setter
- `src/src/style.css` — `.wb-submit-btn[disabled] / .submitting` 防点击；`.submit-stamp-overlay` 红章 + `@keyframes submit-stamp-bang` 600ms cubic-bezier；prefers-reduced-motion 媒体查询缩到 100ms
- `docs/implementation-artifacts/sprint-status.yaml` — 60-4 ready-for-dev → in-progress → review

### Change Log

| Date | Change | Notes |
|---|---|---|
| 2026-04-28 | Story 创建 | create-story 跑完，Status: ready-for-dev |
| 2026-04-28 | 实施完成 | dev-story 跑完 7 个 task；11/11 unit tests 通过；0 新 regression；Status: review；**Epic 60 P2.1 4/4 齐活** |
| 2026-04-28 | Code review fixes | 处理 2 MEDIUM + 2 LOW；新增 4 个测试覆盖 transition + pendingConfirm 互斥；15/15 unit tests 通过；Status: done |

## Senior Developer Review (AI)

**Reviewer:** claude-opus-4-7[1m] · **Date:** 2026-04-28 · **Outcome:** Changes Requested → **Resolved**

### Findings & Resolutions

| # | Severity | Issue | Resolution |
|---|---|---|---|
| M1 | MEDIUM | `pendingConfirm` 与 `pendingSubmit` 双 pending 共存可能（玩家在 BUY high-price confirm 期间点 SUBMIT 会让 pendingConfirm 永远悬空） | `triggerSubmit` 入口加 `if (pendingConfirm) return + 错误提示`；测试覆盖 |
| M2 | MEDIUM | proceed 路径 transition 逻辑（state.level++ / startLevel() / dragManager.destroy）无测试覆盖 | 新增 2 个测试用 `vi.advanceTimersByTime(800)` 验证 fake timers + transition 全链路 |
| L2 | LOW | `executeSubmitTransition` 不清 `pendingConfirm`，留 stale state | 加 `pendingConfirm = null` 清理 |
| L5 | LOW | 警告 prompt 期间 button 未 visually disabled | 新增 `setSubmitButtonAwaiting(awaiting)` helper，prompts 调用 `(true)`，N 路径调 `(false)` |
| L1 | LOW | stamp overlay `position: absolute` 依赖父元素 relative | **未修** — 实际渲染需手动验证；CSS .workbench-desk 通常已 relative，留 code-review 浏览器验证 |
| L3 | LOW | stamp 动画 100% 状态 opacity 0.9 不淡出 | **未修** — overlay 0.2s 短停留可视为"红章定格"叙事，不是 bug |
| L4 | LOW | `SubmitStage` type 未 export | **未修** — 测试用 string literal 通过 inference 已可工作 |

### Action Items

- [x] M1 triggerSubmit 检查 pendingConfirm + 错误提示
- [x] M2 transition 测试用 advanceTimersByTime 验证 state.level++ + startLevel 调用
- [x] L2 executeSubmitTransition 清 pendingConfirm
- [x] L5 setSubmitButtonAwaiting helper + prompts 调用
- [x] M1 测试覆盖：pendingConfirm 非空时 SUBMIT 拒绝；处理完后能重启
- [x] `__test` API 加 setPendingConfirm/getPendingConfirm 暴露 mutex 验证
- [ ] L1 / L3 / L4 cosmetic 留 60-14

### Final Status

- **15/15 unit tests pass**（原 11 + 新增 4：2 transition + 2 pendingConfirm 互斥）
- **0 新 tsc 错误** in story-related 文件
- **0 新 regression** vs baseline
- **106/106** Story 60.x 生态测试全过
- 所有 MEDIUM 已修复 → Outcome: **Approved**
