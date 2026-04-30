# Story 60.9: 工作台 hover tooltip

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.3（浪漫化）· P2.3 第 1 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **terminal 商店玩家想在工作台快速查询 hover 上的技能/遗物详情**,
I want **鼠标悬停在 tier-1 键位（已绑技能）/ IN-tray 卡片（待装配技能）/ 数字键（已挂遗物）上时弹出与 classic shop 一致的 keyTooltip / relic tooltip**,
so that **我能边拖边查机制、边看附魔/quest 进度，不用每次都 INF SKL-XXX 在终端打命令查看**.

## 背景

P2.2 全部完成，terminal 商店已是主流程一等公民。但**工作台缺信息查询入口** —— 玩家把卡片拖到键盘上后，看不到技能详情（base value / 附魔 / smart estimate / quest progress），需要切回终端打 `INF SKL-XXX` 才行。Classic shop 的 `renderUnifiedShop` (line ~1900) 早就给商品卡 + 已装配键位都装了 keyTooltip hover。

P2.3 第 1 项：**给工作台 3 类元素装 hover tooltip**（已绑键 / IN-tray 卡 / 数字键遗物），复用 classic 的 `keyTooltip` + `buildAffixTooltipFields` + `showRelicTooltip`，零新基建。完成后玩家在工作台 hover 即可看完整信息，与 classic 一致。

## Acceptance Criteria

1. **AC1：tier-1 键位（`.has-skill`）hover 弹完整 keyTooltip** —— 鼠标进入 `.kb-key.kb-tier-1.has-skill` 元素时：
   - 通过 `keyEl.dataset.key` 找到绑定的 skillId（从 `state.player.bindings`）
   - 通过 `state.affixSkills.get(skillId)` + `state.affixSkillStates.get(skillId)` 取技能 + runtime state
   - 调 `buildAffixTooltipFields(skill, rt)` 构建 affixInfo / enchantments / questProgress / apprenticeGrowth
   - 构建 `KeyTooltipData`：含 name / icon / level / school / description（resource icon + base value）/ smartEstimate（call `computeSmartEstimate`）/ critChance / mechanicInfo（shapeDesc）
   - `keyTooltip.show(e.clientX, e.clientY, tooltipData)` 弹出
   - mouseleave → `keyTooltip.hide()`

2. **AC2：IN-tray 卡片 hover 弹完整 keyTooltip** —— `.weapon-card[data-drag-type="skill-inventory"]` 元素 hover 时同 AC1，通过 `card.dataset.skillId` 取 skill。**注意：IN-tray 技能未 bound，所以 `bindings` 不含该 skillId**，但 `state.affixSkills` 持有。

3. **AC3：数字键（`.has-relic`）hover 弹 relic tooltip** —— `.kb-key.kb-tier-2.has-relic` 元素（数字 1-0）hover 时：
   - 通过 `keyEl.dataset.relicId` 取 relic 数据（已由 60-1 era 的 `syncWorkbenchRelics` 写入）
   - 调 classic shop.ts 的 `showRelicTooltip(e, relic)` —— 该函数当前是 **module-private**，需先 export
   - mouseleave → `hideRelicTooltip()`（同样需 export）
   - mousemove → `moveRelicTooltip(e)`（同样需 export，让 tooltip 跟随鼠标）

4. **AC4：拖拽中自动隐藏 tooltip 不挡视线** —— 通过 `dragManager.onDragStart` 全局回调注册一个 hide 函数：拖拽开始 → `keyTooltip.hide()` + `hideRelicTooltip()`。
   - 注册位置：`enterTerminalShop` 内（与 `dragManager.init()` 同处）
   - 不要重复挂载 —— 用 module-scoped flag 防多次 register

5. **AC5：DOM 重渲后 hover handler 不丢失** —— `syncWorkbenchKeys()` / `syncWorkbenchInbox()` / `syncWorkbenchRelics()` 每次重建 keyEl/cardEl 时**重新挂 hover handler**。复用现有 `dataset.tooltipBound = '1'` 模式（参考 line 1490 `dataset.rotHandlerBound`）防重复 addEventListener。

6. **AC6：FILED · SKILL folder row hover 暂不支持** —— Out of scope。当前 (`shopPreview.ts:1883-1909`) folder 内容是**硬编码的 mock 文本**（`DRIP CASCADE` / `PAPERCLIP CHAIN` / `CARBON COPY`），不接真实 owned 技能；本 story 不解锁数据驱动的 FILED 面板（属 60-14 模块拆分 / 数据接入范围）。**Story 文档明确标注此限制**，不写空 mouseenter 监听。

7. **AC7：rendering 与 classic 完全一致** —— skill tooltip 内容与 classic `renderUnifiedShop` 内构建的 `KeyTooltipData` 字段对齐（除 upgradeInfo / upgradeEstimate —— 那是 classic 升级路径的特例，工作台无升级语义所以省）。Relic tooltip 内容与 classic `showRelicTooltip` 一致。

8. **AC8：不破坏 60-1 范围预览 / 60-7 副作用 / 拖拽手感** —— hover handler 不阻断 / 不 stopPropagation；工作台拖拽起势时 dragManager 自然接管 mouseDown，hover handler 自动让位。

9. **AC9：单元测试覆盖**
   - `tests/unit/ui/shopPreviewTooltip.test.ts`（新建）：
     - **a)** tier-1 key hover：keyTooltip.show 被调，参数含 skill name + affixInfo
     - **b)** IN-tray card hover：keyTooltip.show 被调
     - **c)** 数字键 hover：showRelicTooltip 被调
     - **d)** mouseleave：keyTooltip.hide 被调
     - **e)** dragManager.onDragStart 触发 → keyTooltip.hide 被调
     - **f)** 同元素重新挂载（sync 重建）不重复添加 listener（验证 dataset flag）
   - 复用 60-7 / 60-8 vi.mock 模式

10. **AC10：Story 60.x ecosystem 不退化** —— 全套测试绿（含新加 tooltip test 用例）

11. **AC11：tsc 0 新错误**

12. **AC12：手动验证留 code-review** —— 浏览器 hover 工作台 3 类元素，tooltip 内容与 classic 一致；拖拽中 tooltip 自动消失。

## Tasks / Subtasks

- [x] **Task 1：export classic relic tooltip helpers（AC: 3）**
  - [x] 1.1 `systems/shop.ts` 把 `showRelicTooltip` / `hideRelicTooltip` / `moveRelicTooltip` 三个函数从 `function` 改为 `export function`（仅加 export 关键字，不动函数体，0 行为变化）
  - [x] 1.2 验证 classic 内部调用方仍能找到（同文件内 module-local + export 共存，不冲突）

- [x] **Task 2：新建 `attachWorkbenchTooltips` helper（AC: 1, 2, 3, 5）**
  - [x] 2.1 在 `shopPreview.ts` 内或新建 `src/src/ui/workbenchTooltips.ts` 加一个函数：
    ```ts
    export function attachWorkbenchTooltips(): void {
      // 调用时（每次 sync 后）扫描 .has-skill / IN-tray card / .has-relic
      // 给未挂 handler 的元素挂 hover 监听
    }
    ```
  - [x] 2.2 内部分三块：
    - tier-1 keys: `wbRoot.querySelectorAll('.kb-key.kb-tier-1.has-skill[data-key]')`
    - IN-tray cards: `wbRoot.querySelectorAll('.weapon-card[data-drag-type="skill-inventory"]')`
    - relic keys: `wbRoot.querySelectorAll('.kb-key.kb-tier-2.has-relic[data-key][data-relic-id]')`
  - [x] 2.3 每个元素挂 mouseenter / mouseleave / mousemove（仅 relic 需 mousemove），用 `dataset.tooltipBound === '1'` 防重复
  - [x] 2.4 mouseenter handler 内：
    - 跳过若 `dragManager.dragging === true`（避免拖拽中误触发）
    - skill 路径：从 dataset 取 skillId/key → 取 skill + rt → 构建 KeyTooltipData → `keyTooltip.show(e.clientX, e.clientY, data)`
    - relic 路径：取 relicId → `RELICS[relicId]` → `showRelicTooltip(e, relic)`
  - [x] 2.5 mouseleave handler 内：`keyTooltip.hide()` 或 `hideRelicTooltip()`

- [x] **Task 3：抽 KeyTooltipData 构建逻辑为 helper（AC: 1, 2, 7）**
  - [x] 3.1 新建 helper（在 systems/shop.ts 或 ui/workbenchTooltips.ts）：
    ```ts
    export function buildSkillKeyTooltipData(skillId: string, boundKeys?: string[]): KeyTooltipData
    ```
  - [x] 3.2 内部复用 classic shop.ts:1908-1990 的 KeyTooltipData 构建逻辑（去掉 upgradeInfo / upgradeEstimate 分支 — workbench 无升级路径），返回精简的 KeyTooltipData
  - [x] 3.3 为 classic 路径不破坏：classic 自己内联的逻辑保持不动（仅本 story 新建 helper 给 workbench 用）；将来 60-14 模块拆分可考虑 classic 也用 helper

- [x] **Task 4：dragManager.onDragStart 全局 hide hook（AC: 4）**
  - [x] 4.1 在 `enterTerminalShop` 函数内 `dragManager.init()` 之后注册：
    ```ts
    dragManager.onDragStart = () => {
      keyTooltip.hide()
      hideRelicTooltip()
    }
    ```
  - [x] 4.2 `restoreFromPreview` / `executeSubmitTransition` 退出时清掉回调（设为 null），防 main 流程的 dragManager 实例残留

- [x] **Task 5：Sync 函数挂 tooltip handler（AC: 5）**
  - [x] 5.1 `syncWorkbenchKeys` 末尾调 `attachWorkbenchTooltips()`
  - [x] 5.2 `syncWorkbenchInbox` 末尾调 `attachWorkbenchTooltips()`
  - [x] 5.3 `syncWorkbenchRelics` 末尾调 `attachWorkbenchTooltips()`
  - [x] 5.4 重复调用幂等（`dataset.tooltipBound` 防重）

- [x] **Task 6：单元测试（AC: 9）**
  - [x] 6.1 新建 `src/tests/unit/ui/shopPreviewTooltip.test.ts`，~200 行
  - [x] 6.2 vi.mock：
    - `ui/keyboard/KeyTooltip` → 覆盖 `keyTooltip.show / hide` 为 spy
    - `systems/shop` → 覆盖 `showRelicTooltip / hideRelicTooltip / moveRelicTooltip / buildSkillKeyTooltipData / buildAffixTooltipFields` 为 spy
    - `effects/sound`、`systems/battle` 防真实初始化
  - [x] 6.3 测试用例：
    - tier-1 key hover：`keyTooltip.show` 调用 + 参数含 skillId-derived data
    - IN-tray hover：同上
    - relic hover：`showRelicTooltip` 调用
    - mouseleave：相应 hide 调用
    - dragManager.dragging=true 时 mouseenter 跳过（不调 show）
    - 重复挂 sync：dataset flag 防重
    - dragManager.onDragStart 触发 → 两个 hide 都调

- [x] **Task 7：tsc + 全套测试（AC: 10, 11）**
  - [x] 7.1 `cd src && npx tsc --noEmit -p .` → 0 新错误
  - [x] 7.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿（含新 tooltip 测试）

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| Workbench DOM | `src/src/ui/shopPreview.ts:1407-1538` | `syncWorkbenchKeys` · `syncWorkbenchInbox` · `syncWorkbenchRelics` |
| Tooltip 单例 + 类型 | `src/src/ui/keyboard/KeyTooltip.ts` | `keyTooltip` · `KeyTooltipData` · `AffixTooltipInfo` |
| Tooltip 字段构建 | `src/src/systems/shop.ts:543` | `buildAffixTooltipFields(skill, rt)` |
| Smart estimate | `src/src/systems/shop.ts:794` | `computeSmartEstimate(skill, rt, boundKeys)` |
| 形状描述 | `src/src/systems/shop.ts:137` | `getShapeDescription(shapeId, cellCount)` |
| Crit chance | `src/src/systems/shop.ts:1149` | `computeSkillCritChance(skill)` |
| Classic relic tooltip | `src/src/systems/shop.ts:4376` | `showRelicTooltip` / `hideRelicTooltip` / `moveRelicTooltip`（**待 export**） |
| 遗物数据源 | `src/src/data/relics.ts` | `RELICS[relicId]` · `RelicData` |
| Drag state | `src/src/systems/dragManager.ts:151` | `dragManager.dragging` getter · `onDragStart` setter |
| Resource 图标 | `src/src/core/constants.ts` | `RESOURCE_ICONS[resource]` |

### Architecture Compliance

**Dependency direction：** ui/shopPreview → ui/keyboard/KeyTooltip / systems/shop —— 与 60-7 同模式（已 review 通过）。

**State write rules：** ✅ tooltip 是纯读取 / 渲染；hover handler 不写 state。

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **零新依赖**

### File Structure Requirements

```
src/src/systems/shop.ts                ← 修改：3 个 relic tooltip 函数加 export 关键字（仅 export 改动）
                                          可选：抽 buildSkillKeyTooltipData helper（如选 systems/shop 落点）
src/src/ui/shopPreview.ts              ← 修改：import + 新加 attachWorkbenchTooltips()，
                                          syncWorkbenchKeys/Inbox/Relics 末尾调用，
                                          enterTerminalShop 注册 dragManager.onDragStart
src/src/ui/workbenchTooltips.ts        ← 可选新建：抽 attachWorkbenchTooltips + buildSkillKeyTooltipData
                                          （或直接放 shopPreview.ts 末尾，看代码量）
src/tests/unit/ui/shopPreviewTooltip.test.ts  ← 新增：~200 行 / 7-9 用例
```

**避免：**
- 不要 hover FILED · SKILL folder row（数据未接通，AC6 明示 out of scope）
- 不要在 hover handler 内修改 state（纯渲染）
- 不要重新实现 buildAffixTooltipFields / showRelicTooltip — 复用 classic
- 不要破坏 60-1 形状预览（hover 与 drag 是两条交互，互不重叠）
- 不要 stopPropagation —— hover 不能阻断 mouseDown 进入拖拽

### Testing Requirements

| 用例 | 验证目标 | mock 范围 |
|---|---|---|
| tier-1 hover | keyTooltip.show 调用 + skillId-derived data | mock keyTooltip / buildAffixTooltipFields |
| IN-tray hover | keyTooltip.show 调用 | 同上 |
| relic hover | showRelicTooltip 调用 | mock showRelicTooltip |
| mouseleave | hide 调用 | mock keyTooltip.hide / hideRelicTooltip |
| 拖拽中跳过 | dragManager.dragging=true → 不 show | mock dragManager.dragging getter |
| 防重 listener | dataset flag 第二次 sync 不重复 | spy on addEventListener call count |
| onDragStart 隐藏 | 全局 hook 触发 hide | mock dragManager 触发 _onDragStart |

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.7 vi.mock with importActual 保留 export | 本 story tooltip mock 同样模式 |
| 60.8 测试需 stub document | 本 story 测试同样需要（hover 操作虽然不需要真 DOM，但 shopPreview 顶层 import 链 touches document） |
| 60.5 把功能抽 export helper 便于测试 | 本 story attachWorkbenchTooltips + buildSkillKeyTooltipData 同模式 |
| 60.x ecosystem cd src 跑 vitest | 本 story 同样 |

### Git Intelligence Summary

```
cb75313 feat(tutorial): add terminal-mode tutorial steps + classic gating (Story 60.8)
98978d1 feat(shop): close event bus + relic hooks for terminal BUY/SELL (Story 60.7)
34a5c6c feat(state): add inbox to RunState serialize/deserialize (Story 60.6)
044c587 feat(shop): wire shopUI feature flag dispatcher (Story 60.5)
```

**本 story 推荐 commit message：** `feat(workbench): hover tooltips for keys + IN-tray + relic row (Story 60.9)`

### Risks & Open Questions

- **风险 A：keyTooltip 实例是 module-level 单例 —— classic shop 也在用，两边可能冲突** —— 缓解：classic 在 `#shop-screen` 上挂 hover，terminal 在 `#workbench-screen-preview` 挂 hover；两个屏幕互斥（dispatcher 已隐藏对方），同一时刻只有一个屏幕的 hover 触发 keyTooltip.show。无并发风险。
- **风险 B：dragManager.onDragStart 是单 setter（非 array）—— 设新回调会覆盖现有回调** —— 缓解：grep 确认 60-x 没人设过 onDragStart；本 story 是首个使用者。如将来其他系统也想用，需重构成 listener array（不在本 story 范围）。
- **风险 C：mouseenter 在快速 mouse 移动时可能 fire 多次** —— 缓解：keyTooltip.show 自带 hide-old + show-new；不会双重叠。
- **开放问题 1：tooltip 跟随鼠标（mousemove）还是固定位置？** classic skill 卡是固定（show 后不动）；classic relic 是跟鼠标（moveRelicTooltip）。本 story 沿用 classic 行为：skill tooltip 固定，relic tooltip 跟鼠标。
- **开放问题 2：是否在拖起时 hide tooltip，还是仅在 dragStart 后？** dragManager.dragging 在 isDragging || pickedUp 时 true。pickedUp 模式是点击拾取 —— 这种场景 tooltip 应当也隐藏（picked 状态视觉与 tooltip 互相干扰）。dragManager.onDragStart 是首次 isDragging=true 时触发，足够。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-9] — 验收标准原文
- [Source: src/src/systems/shop.ts:1900-2000] — classic shop renderUnifiedShop 的 keyTooltip hover 模式（参考实现）
- [Source: src/src/systems/shop.ts:3500-3580] — classic 已装备技能 hover keyTooltip 模式（更全面的字段构建）
- [Source: src/src/systems/shop.ts:4376-4413] — classic showRelicTooltip / hideRelicTooltip / moveRelicTooltip
- [Source: src/src/ui/keyboard/KeyTooltip.ts:118] — `KeyTooltipData` 接口 + skill 字段定义
- [Source: src/src/ui/shopPreview.ts:1407-1538] — 现有 syncWorkbenchKeys/Inbox/Relics 三个重渲入口
- [Source: src/src/systems/dragManager.ts:151,156] — dragging getter + onDragStart setter
- [Source: docs/implementation-artifacts/60-7-event-bus-binding-manager.md] — 上一 P2.2 story（vi.mock + helper 抽取参考）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成 7 个 task
- Task 1 把 classic 3 个 relic tooltip 函数加 export 关键字（`showRelicTooltip` / `hideRelicTooltip` / `moveRelicTooltip`），0 行为变化
- Task 3 抽 `buildSkillKeyTooltipData(skillId, boundKeys?)` helper 放 systems/shop.ts，复用 classic 现有 `buildAffixTooltipFields` + `computeSmartEstimate` + `getShapeDescription`
- Task 5 sync 函数末端加 `attachWorkbenchTooltips()` — `syncWorkbenchKeys` / `syncWorkbenchInbox` / `syncWorkbenchRelics` 三处都需调用（重渲后 listener 重挂）
- Task 4 在 `enterTerminalShop` 注册 `dragManager.onDragStart = () => { keyTooltip.hide(); hideRelicTooltip() }`；`restoreFromPreview` + `executeSubmitTransition` 末端清回调（设为 null）+ 主动 hide tooltip 防泄漏
- 测试无 jsdom/happy-dom 依赖，用 fake-element + fake-root 模式（`makeFakeEl` 提供 dataset / classList.contains / addEventListener / fire 接口）
- shop.ts + shopPreview.ts tsc baseline 持平（43 → 43，git stash 对比验证）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.3 浪漫化第 1 项
- 实施于 2026-04-29，所有 7 个 task 完成；Status: review
- **AC 全覆盖：** AC1（tier-1 hover keyTooltip）/ AC2（IN-tray hover keyTooltip）/ AC3（数字键 hover relicTooltip + mousemove + mouseleave）/ AC4（dragManager.onDragStart 全局 hide）/ AC5（sync 重挂 + dataset 防重）/ AC6（FILED folder 显式 out-of-scope，未挂 hover）/ AC7（与 classic 字段对齐 — 复用 `buildAffixTooltipFields` + `computeSmartEstimate`）/ AC8（不阻断拖拽 — handler 不 stopPropagation）/ AC9（12 单测覆盖 3 类元素 + dragging 守卫 + 防重 + 屏缺失）/ AC10（ecosystem 234/241，7 baseline fail 与本 story 无关）/ AC11（tsc 0 新错）/ AC12（手动验证留 review）
- **关键设计决策：**
  1. **抽 `buildSkillKeyTooltipData` helper 放 systems/shop.ts** — 让 workbench 与 classic 主流程同源；helper 删了 `upgradeInfo` / `upgradeEstimate` 分支（workbench 无升级语义）
  2. **classic 3 个 relic tooltip 函数加 export** — 不动函数体，仅 export 关键字，0 行为变化
  3. **`attachWorkbenchTooltips` 用 dataset.tooltipBound 防重** — 复用 60-1 的 rotHandlerBound 模式，每次 sync 重渲后调用幂等
  4. **`dragManager.onDragStart` 是首个使用者** — grep 确认 60-x 没人设过；如将来其他系统也想用，需重构成 listener array（不在本 story 范围）
  5. **测试用 fake-element 模式而非 jsdom** — 项目无 DOM 测试环境，fake-element 提供最小必要接口（dataset / classList.contains / addEventListener / fire），更轻量
- 上一 story 60-8 同日完成（cb75313 feat(tutorial): add terminal-mode tutorial steps + classic gating）
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 4/4 done · P2.3 **1/5 done**（剩 60-10 ~ 60-13）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：`buildSkillKeyTooltipData` 加 `isAffixGloballyTransformed(AffixTypeEnum.Multiply, ...)` 守卫，与 classic shop.ts:1956-1958 路径同步 — 仅当全局乘法变换激活时才显示 `×N` 而非 `+N`
  - L1-L6 暂不修（cosmetic / pre-existing pattern）

### File List

新增：
- `src/tests/unit/ui/shopPreviewTooltip.test.ts` (~310 行，12 测试用例)

修改：
- `src/src/systems/shop.ts` — 3 个 relic tooltip 函数加 `export` 关键字（`showRelicTooltip` / `hideRelicTooltip` / `moveRelicTooltip`）；新增 `export function buildSkillKeyTooltipData(skillId, boundKeys?): KeyTooltipData | null`
- `src/src/ui/shopPreview.ts` — imports 新增 `buildSkillKeyTooltipData` / `showRelicTooltip` / `hideRelicTooltip` / `moveRelicTooltip` from systems/shop + `keyTooltip` from KeyTooltip；新增 `export function attachWorkbenchTooltips()`；3 个 sync 函数末端调 `attachWorkbenchTooltips()`；`enterTerminalShop` 注册 `dragManager.onDragStart`；`restoreFromPreview` + `executeSubmitTransition` 清 onDragStart + hide tooltips
- `docs/implementation-artifacts/sprint-status.yaml` — 60-9 ready-for-dev → in-progress → review
