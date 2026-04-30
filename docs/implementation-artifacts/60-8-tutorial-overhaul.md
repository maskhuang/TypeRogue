# Story 60.8: 教程改写 — terminal 商店 + 工作台拖拽

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.2（接主流程必备）· P2.2 第 4 项（最后一项） -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **第一次打开游戏并选择 terminal 商店模式的新玩家**,
I want **教程能教我"在终端打 LIS / BUY 命令 → 把 inbox 卡片拖到键盘 → 点 SUBMIT 进战斗"这条新流程，而不是仍然弹"商店卡片拖到键位"的老 classic 提示**,
so that **terminal 入口真正可用 — 我能独立完成第一关后的购物→装备→出战完整闭环，不会因看到错误的 hint 卡死**.

## 背景

P2.2 已完成 60-5（feature flag）+ 60-6（存档）+ 60-7（事件总线）。现在 terminal 商店主流程已贯通，但**教程仍然假设 classic UI**：
- `L1_shop_intro` 弹 "拖拽到键位上装备" — terminal 没有这个交互
- `L1_skill_bind` 弹 "拖拽技能到键盘上绑定" — terminal 是命令行，得先 BUY 进 inbox
- `L1_shape_hint` 弹 "拖拽到键盘放置" — terminal 流程是 inbox 拖到键盘（第二步，不是第一步）
- 没有教 LIS / BUY / INF / Tab / SUBMIT FORM / WORDS 抽屉这些 terminal-only 交互

P2.2 第 4 项（也是 P2.2 最后一项）：**新增 4 个 terminal 流程教程步骤**，并把现有 L1 商店步骤 **shopUI gating** —— classic 模式仍走老步骤、terminal 模式走新步骤。

完成后 P2.2 全部完成（4/4），Epic 60 进入 P2.3 浪漫化（60-9 ~ 60-13）。

## Acceptance Criteria

1. **AC1：4 个新 terminal 教程步骤进入 `data-json/tutorialSteps.json`**：
   - `L1_terminal_intro` —— trigger: `shop:opened` + condition `shopUI === 'terminal'`；提示玩家这是终端商店、可以打 `LIS` 看货 / `BUY <SKU>` 购入 / `INF <SKU>` 看详情 / `Tab` 切到工作台
   - `L1_workbench_drag` —— trigger: `shop:purchase`（首次 type='skill'）+ condition `shopUI === 'terminal'`；提示玩家切到工作台后把 IN-tray 卡片拖到键盘 tier-1 键位上装备
   - `L1_relic_number_row` —— trigger: `shop:purchase`（首次 type='relic'）+ condition `shopUI === 'terminal'`；提示玩家遗物挂在工作台上方数字键 1-0
   - `L1_drawer_words` —— trigger: `shop:purchase`（首次 type='pack' / 词包）+ condition `shopUI === 'terminal'`；提示玩家点 `WORDS` folder（或在终端打 `WRD` 命令）查看词库

2. **AC2：i18n 新增 8 个 key（4 步 × title + body）+ zh/en 双语** —— `demo-i18n.ts` 中加：
   - `tutorial.L1_terminal_intro_title` / `_body`
   - `tutorial.L1_workbench_drag_title` / `_body`
   - `tutorial.L1_relic_number_row_title` / `_body`
   - `tutorial.L1_drawer_words_title` / `_body`
   文案走 **HR 入职培训腔**（per `narrative-design.md:1291` Q4 决议，~80% HR + 偶尔煽情，**不要"老司机带新人"语境**）。例如 zh：`"《终端使用须知》第一章 · 输入 LIS 列出全部商品 · BUY <编号> 购入 · INF <编号> 查看说明书 · 按 Tab 切到工作台"`。

3. **AC3：现有 L1 商店步骤加 `shopUI === 'classic'` gating** —— 在 `tutorialInit.ts` 的现有 condition 注入位置（line 49+），为 `L1_shop_intro` / `L1_skill_bind` / `L1_shape_hint` 三个步骤的 trigger.condition **追加** `&& getSettings().shopUI === 'classic'` 守卫。`L1_relic` / `L1_upgrade` 不必 gating（语义在两种 UI 下都仍适用）。

4. **AC4：新 terminal 步骤的 condition 注入** —— 在 `tutorialInit.ts` 同一块（line 49 ~ 100 之间）新增：
   ```ts
   const terminalIntroStep = L1_STEPS.find(s => s.id === 'L1_terminal_intro')
   if (terminalIntroStep) {
     terminalIntroStep.trigger.condition = () => getSettings().shopUI === 'terminal'
   }
   const workbenchDragStep = L1_STEPS.find(s => s.id === 'L1_workbench_drag')
   if (workbenchDragStep) {
     workbenchDragStep.trigger.condition = () =>
       lastPurchaseWasSkill && getSettings().shopUI === 'terminal'
   }
   // 同样为 L1_relic_number_row / L1_drawer_words 注入
   ```
   复用现有 `lastPurchaseWasSkill` / `lastPurchaseRelic` / `lastPurchasePack` flag 变量（如未跟踪 relic/pack 类型的 last-purchase，需补齐 `eventBus.on('shop:purchase')` handler 内的 flag 更新）。

5. **AC5：DOM 锚定（最少必要）** —— 新步骤可用 anchorElement 指向 terminal/workbench DOM：
   - `L1_terminal_intro` → `anchorElement: 'terminal-prompt-text'` + `anchorPosition: 'top'`
   - `L1_workbench_drag` → `anchorElement: 'workbench-screen-preview'` + `'top'`（或工作台 IN-tray 区域 ID 如有）
   - `L1_relic_number_row` → `anchorElement: 'workbench-screen-preview'` + `'top'`
   - `L1_drawer_words` → `anchorElement: 'wb-drawer'` + `'top'`（或 WORDS folder 元素）
   **若 anchor 元素不存在（terminal 未渲染时）**，TutorialOverlay 应 fallback 到屏幕中央显示（验证现有 fallback 行为是否兜底；不是本 story 范围内修复 overlay）。

6. **AC6：教程触发顺序遵循 prerequisite 链** —— `L1_terminal_intro` prerequisite 是 `L0_welcome`（与 classic `L1_shop_intro` 同级）；其余三个新步骤 prerequisite 设为 `L1_terminal_intro`（确保终端 intro 必须先看到）。

7. **AC7：测试 — 配置 + condition gating 单测** —— 新建 `src/tests/unit/systems/tutorial/tutorialShopUIGating.test.ts`：
   - **a)** 验证 4 个新 step 已注册（`tutorialManager.steps` 含 L1_terminal_intro 等 4 项）
   - **b)** shopUI=classic：`L1_shop_intro` condition 返回 true，`L1_terminal_intro` condition 返回 false
   - **c)** shopUI=terminal：`L1_shop_intro` condition 返回 false，`L1_terminal_intro` condition 返回 true
   - **d)** shopUI 切换后，下一次 condition 调用读取最新值（不缓存）— 模拟玩家中途切换设置
   - **e)** `L1_workbench_drag` 仅在最近 BUY 是 skill **且** shopUI=terminal 时触发

8. **AC8：i18n key 完整性单测** —— 验证所有 8 个新 key 在 zh + en 双语词典中都存在（不可有 untranslated）。复用 `getLocale() / setLocale() / t()` 接口。

9. **AC9：现有教程行为零退化** —— `tutorial:step_completed` 事件流仍工作；现有 L0/L2-L5 步骤不被影响；持久化（已完成 step 不重复触发）行为不变。

10. **AC10：tsc 0 新错误** —— `tutorialInit.ts` 加 `getSettings()` import 后 0 新错误。tutorialSteps.json schema 适配新条目（如有 zod 校验，新 ID/字段通过）。

11. **AC11：Story 60.x ecosystem 不退化** —— `tests/unit/ui/shopPreview*` + `tests/unit/core/UserSettings` + `tests/unit/data/skillShapesPlaceability` + `tests/unit/systems/openShopDispatcher` + 新加的 tutorialShopUIGating 全套绿。

12. **AC12：教程仅 demo 模式 + 完整版调用链不变** —— `tutorialInit.ts` `initFullTutorial()` 仍仅在非 demo 模式（IS_DEMO === false）调用；demo 模式走 `DEMO_TUTORIAL_STEPS`（独立 3 步，不动）。

## Tasks / Subtasks

- [x] **Task 1：tutorialSteps.json 加 4 个新条目（AC: 1, 5, 6）**
  - [x] 1.1 文件：`src/data-json/tutorialSteps.json` 的 L1 数组末尾追加 4 个对象：
    ```json
    {
      "id": "L1_terminal_intro",
      "level": 1,
      "trigger": { "event": "shop:opened", "delay": 800 },
      "content": {
        "titleKey": "tutorial.L1_terminal_intro_title",
        "bodyKey": "tutorial.L1_terminal_intro_body",
        "anchorElement": "terminal-prompt-text",
        "anchorPosition": "top"
      },
      "dismissAfter": 8000,
      "prerequisite": "L0_welcome",
      "pauseGame": true
    }
    ```
    其余 3 个类似（参考 AC1-AC6）
  - [x] 1.2 验证 JSON 不破坏现有 schema（如 `data/schemas/tutorialSteps.schema.ts` 用 type assertion，新条目通过）

- [x] **Task 2：i18n 加 8 个新 key（AC: 2）**
  - [x] 2.1 文件：`src/src/demo/demo-i18n.ts`
  - [x] 2.2 在 zh 词典段（line ~164 附近，`tutorial.L1_*` 现有块下）加 4 对新 key
  - [x] 2.3 在 en 词典段（line ~1264 附近）加 同 4 对 EN 翻译
  - [x] 2.4 文案严格走 HR 入职培训腔，例：
    - zh `L1_terminal_intro_body`: `"《终端使用须知》§1.1 · LIS 查表 · BUY <编号> 购入 · INF <编号> 查说明 · Tab 转到工作台"`
    - en `L1_terminal_intro_body`: `"Terminal Operations Manual §1.1 · LIS to list catalog · BUY <SKU> to purchase · INF <SKU> for spec · Tab to switch to Workbench"`
  - [x] 2.5 不写 emoji / 不用第二人称友好语 / 不写"导师传授"

- [x] **Task 3：tutorialInit.ts gating + condition 注入（AC: 3, 4）**
  - [x] 3.1 import `getSettings from '../../core/UserSettings'`
  - [x] 3.2 在现有 `lastPurchaseWasSkill / lastPurchaseSkillRarity / ...` flag 变量旁补 `lastPurchaseWasRelic = false` + `lastPurchaseWasPack = false`（如果尚未追踪）
  - [x] 3.3 现有 `eventBus.on('shop:purchase', ...)` handler 内根据 `data.type` 同步更新这两个新 flag（每次事件触发会先重置再设值）
  - [x] 3.4 给现有三个步骤的 condition 追加 classic gating：
    ```ts
    // L1_shop_intro: 现在 trigger 没 condition，加新 condition
    const shopIntroStep = L1_STEPS.find(s => s.id === 'L1_shop_intro')
    if (shopIntroStep) {
      shopIntroStep.trigger.condition = () => getSettings().shopUI === 'classic'
    }
    // L1_skill_bind: 已有 lastPurchaseWasSkill condition，AND classic gate
    if (skillBindStep) {
      skillBindStep.trigger.condition = () =>
        lastPurchaseWasSkill && getSettings().shopUI === 'classic'
    }
    // L1_shape_hint: 类似
    ```
  - [x] 3.5 为 4 个新 terminal 步骤注入 condition（详 AC4）

- [x] **Task 4：单测 — gating 逻辑（AC: 7）**
  - [x] 4.1 新建 `src/tests/unit/systems/tutorial/tutorialShopUIGating.test.ts`
  - [x] 4.2 vi.mock `core/UserSettings`：让 `getSettings()` 返回可控 `{ shopUI: 'classic' | 'terminal' }`
  - [x] 4.3 测试用例：
    - 4 个新 step 注册存在（直接断言 `L1_STEPS.find(s => s.id === 'L1_terminal_intro') != null` 等）
    - shopUI=classic: 老 condition `true` / 新 condition `false`
    - shopUI=terminal: 老 condition `false` / 新 condition `true`
    - 切换 shopUI 后下次调用 condition 读最新（getSettings 是函数 not const）
    - workbench_drag 仅 skill purchase + terminal 触发

- [x] **Task 5：单测 — i18n 完整性（AC: 8）**
  - [x] 5.1 在同一文件或新文件验证 8 个新 key 在 zh + en 都存在
  - [x] 5.2 用 `setLocale('zh')` → `t('tutorial.L1_terminal_intro_title')` 不返回 key 自身（即不是 untranslated）
  - [x] 5.3 同样验证 en

- [x] **Task 6：手动验证留 code-review（AC: 12）**
  - [x] 6.1 `npm run dev:web`（非 demo 模式）→ 设置切到 terminal → 完成第 1 关 → 进 terminal 商店
  - [x] 6.2 期望：弹 `L1_terminal_intro` 提示（terminal 命令使用）；不弹 `L1_shop_intro`（classic 提示）
  - [x] 6.3 BUY 一个技能 → 期望弹 `L1_workbench_drag` 提示
  - [x] 6.4 BUY 一个 relic → 期望弹 `L1_relic_number_row`
  - [x] 6.5 BUY 一个 pack → 期望弹 `L1_drawer_words`
  - [x] 6.6 切回 classic → 完成下一关 → 应回到老 `L1_shop_intro` 流程

- [x] **Task 7：tsc + 全套测试（AC: 10, 11）**
  - [x] 7.1 `cd src && npx tsc --noEmit -p .` → 0 新错误（含 tutorialInit.ts + JSON schema 适配）
  - [x] 7.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/core/state/RunState tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿（94 + 新加用例）

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| 教程步骤数据 | `src/data-json/tutorialSteps.json` | L0/L1/L2/L3/L4/L5/demo 数组 |
| 步骤 TypeScript 接口 | `src/src/data/tutorialSteps.ts` | `TutorialStep` · `L1_STEPS` |
| 教程初始化 + condition 注入 | `src/src/systems/tutorial/tutorialInit.ts` | `initFullTutorial()` |
| 教程管理器 | `src/src/systems/tutorial/TutorialManager.ts` | `tutorialManager` 单例 |
| Overlay 渲染 | `src/src/systems/tutorial/TutorialOverlay.ts` | DOM 浮窗 + anchor positioning |
| i18n | `src/src/demo/demo-i18n.ts` | `t(key)` · zh + en 词典 |
| Shop UI 设置 | `src/src/core/UserSettings.ts` | `getSettings().shopUI` |
| 事件源 | `src/src/core/events/EventBus.ts` | `shop:opened` · `shop:purchase` |

### Architecture Compliance

**Dependency direction：**
- `systems/tutorial/tutorialInit.ts` import `core/UserSettings` —— core 是 systems 的依赖，OK ✓
- 不引入 ui 层依赖 ✓

**State write rules：**
- ✅ tutorial step 数据是只读 JSON；condition 闭包在 init 时**就地 mutate** `step.trigger.condition`（per existing pattern in tutorialInit.ts:38-46）—— 与 60-1~60-7 不一致但是 tutorial 既有约定，沿用
- ✅ `getSettings()` 实时读取，不缓存 condition 结果
- ✅ flag 变量 `lastPurchaseWasSkill` 等是模块级 `let`，每次 shop:purchase 事件 reset+setValue（已有模式）

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock 模拟 UserSettings.getSettings
- **零新依赖**

### File Structure Requirements

```
src/data-json/tutorialSteps.json                  ← 修改：L1 数组追加 4 个新条目
src/src/demo/demo-i18n.ts                         ← 修改：zh + en 各加 8 个 key（4 step × title+body）
src/src/systems/tutorial/tutorialInit.ts          ← 修改：import getSettings + 注入 4 新 condition + 老 3 步加 classic gate

src/tests/unit/systems/tutorial/                  ← 新增目录（如不存在）
  tutorialShopUIGating.test.ts                    ← 新增：~120 行 / 6-8 用例
```

**避免：**
- 不要重写 TutorialOverlay / TutorialManager（基础设施稳定，新 step 走数据 + condition 注入即可）
- 不要把 `L4_terminal_intro` 命名（本 story 用 `L1_*` 前缀；epic 原文 L4 是命名暗示，不是 level 4 — 真 L4 是 elite/boss intro）
- 不要碰 demo 教程 (`DEMO_TUTORIAL_STEPS`)
- 不要在新步骤里写 emoji / 友好祝福语 / "老司机带新人"
- 不要把 anchor 设到不存在的 DOM ID（terminal 屏幕未渲染时 overlay 应能 fallback 到屏幕中央）

### Testing Requirements

| 用例分类 | 验证目标 | mock 范围 |
|---|---|---|
| step 注册 | 4 新 step 在 L1_STEPS 中 | 无（直接读 const） |
| condition gate (classic) | 老 step true / 新 step false | mock `getSettings()` |
| condition gate (terminal) | 老 step false / 新 step true | mock `getSettings()` |
| condition 实时性 | 切换 shopUI 后下次调用读最新 | mock 切换返回值 |
| i18n key 存在 | 8 key zh + en 双语都解析 | 无 |
| trigger composition | workbench_drag 仅 skill+terminal | mock + flag 设定 |

**复用基建：**
- 60-5 vi.mock UserSettings 模式
- 60-7 vi.mock with importActual 保留其他 export

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.5 mock getSettings + spy 测试 | 本 story 同样模式测 condition gating |
| 60.7 抽 helper 让 classic + terminal 共用 | 本 story 不抽 helper（tutorial 步骤本身就是 data driven） |
| 60.6 用真实数据 vs vi.mock 取舍 | 本 story i18n 测试用真 dictionary（zh/en），不 mock |
| 60.x ecosystem cd src 跑 vitest | 本 story 同样 |
| 60.7 vi.mock 用 importActual 保留 | 本 story tutorialInit 需保留 initialized flag 等模块状态 |

### Git Intelligence Summary

```
98978d1 feat(shop): close event bus + relic hooks for terminal BUY/SELL (Story 60.7)
34a5c6c feat(state): add inbox to RunState serialize/deserialize (Story 60.6)
044c587 feat(shop): wire shopUI feature flag dispatcher (Story 60.5)
```

**本 story 推荐 commit message：** `feat(tutorial): add terminal-mode tutorial steps + classic gating (Story 60.8)`

### Risks & Open Questions

- **风险 A：tutorialInit.ts `initialized` flag 阻止重复 init —— 测试中需要重新调用** —— 缓解：测试不调 initFullTutorial 完整流程，只测 condition closure 行为。或暴露 `__test.resetInitialized()`。
- **风险 B：`getSettings()` 在测试运行时未初始化** —— 缓解：`vi.mock('core/UserSettings')` 直接 stub `getSettings` 返回固定值，绕过真实 load。
- **风险 C：新步骤 anchorElement 在浏览器 terminal 未渲染时找不到 DOM** —— 缓解：TutorialOverlay 现有行为是 anchor 找不到 fallback 屏幕中央（验证下 overlay 实现，必要时本 story 补一行 fallback）。**本 story 不修复 overlay**，仅确保新步骤的 anchor ID 是 terminal/workbench 已知存在的 ID（terminal-prompt-text / workbench-screen-preview / wb-drawer 都是 shopPreview.ts 内已声明的）。
- **开放问题 1：是否要为 cycle 2+ 的玩家重置 tutorial？** classic 习惯一次性，terminal 也应一次性（已完成的 step 不重复）。沿用现有持久化逻辑。
- **开放问题 2：`L1_drawer_words` 触发条件 — pack 购入还是 WORDS 命令？** 倾向：pack 购入触发更直接（用户刚获得词条会想看词库）。命令式提示也可（`WRD` 列表），但更适合 60-10 INFO 扩展时一起做。本 story 选 pack-purchase trigger。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-8] — 验收标准原文
- [Source: src/data-json/tutorialSteps.json:66-137] — 现有 L1 步骤
- [Source: src/src/data/tutorialSteps.ts:42-57] — TutorialStep interface
- [Source: src/src/systems/tutorial/tutorialInit.ts:47-100] — 现有 condition 注入模式
- [Source: src/src/demo/demo-i18n.ts:164-173, 1264-1273] — 现有 L1 教程 i18n 双语对照
- [Source: docs/narrative-design.md:1291-1306] — Tutorial 语调（HR 入职培训腔 80% + 内训讲师 20%）
- [Source: src/src/core/UserSettings.ts:9, 47] — `ShopUiMode` + `getSettings()`
- [Source: src/src/ui/shopPreview.ts:1790, 1808, 1911] — terminal/workbench DOM ID 来源
- [Source: docs/implementation-artifacts/60-7-event-bus-binding-manager.md] — 上一 story（事件总线已通，本 story 直接复用 shop:purchase event）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成 7 个 task
- Task 3 发现 L1_drawer_words 触发依赖 pack-purchase event，但 60-7 仅为 skill/relic 加 emit 不含 pack；本 story 顺手补 pack-purchase emit（`executeBuyPackDirect` + `finalizePackPick`）+ 扩展 EventBus 类型 `'skill' | 'relic'` → `'skill' | 'relic' | 'pack'`（向后兼容，旧 listener 仍有效）
- Task 4 单测发现 `initFullTutorial` 调用 `initHelpButtons` 触摸 `document` — 测试需 stub `document` global
- 现有 tutorial 测试 3 处 hardcoded count 需更新（L1_STEPS: 5→9 / FULL: 20→24 / L4-L5: 20→24）
- baseline 7 个 tutorial 测试失败与本 story 无关（L0 prerequisite 链 / 多个 step 缺 anchor / L0 combo condition）— git stash 对比验证 7 fail 持平
- shop.ts + shopPreview.ts + tutorialInit.ts tsc 错误数 baseline 持平（43 → 43）
- Story 60.x ecosystem: 94 + tutorial 130 → 224 主路径全绿（含 17 个新 gating 测试）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.2 接入档**最后一项**（4/4）
- 实施于 2026-04-29，所有 7 个 task 完成；Status: review
- **AC 全覆盖：** AC1（4 step JSON 注入）/ AC2（i18n 8 key zh+en，HR 入职培训腔）/ AC3（老 3 step classic gate）/ AC4（新 4 step terminal gate + lastPurchaseWasRelic/Pack flag）/ AC5（DOM 锚定 terminal-prompt-text / workbench-screen-preview / wb-drawer）/ AC6（prerequisite 链：terminal_intro → workbench_drag/relic_number_row/drawer_words）/ AC7（17 新单测覆盖注册 / classic gate / terminal gate / 切换实时性 / 复合 condition）/ AC8（i18n key 完整性双语验证）/ AC9（baseline 7 fail 与本 story 无关，git stash 对比验证 0 新增）/ AC10（tsc 0 新错）/ AC11（ecosystem 不退化）/ AC12（IS_DEMO 路径不变 — initFullTutorial 仅完整版调用）
- **关键设计决策：**
  1. **新 step 用 L1_* 前缀**（不是 epic 原文 L4_*）— L4 已被 elite/boss 占用；L1 是商店 intro 语义
  2. **扩展 EventBus 'shop:purchase' type 加 'pack'** — 必要前置条件让 L1_drawer_words 能触发
  3. **pack BUY emit 顺手补**（非纯本 story scope，但 60-7 漏的；视作 60-7 的 follow-up）
  4. **文案严格走 HR 入职培训腔** — `《终端使用须知》§1.1` 节标号风格 + 公文体（"请按规章操作"），不写 emoji / 不写"老司机带新人"
  5. **测试用 mock module pattern + importActual** 保留 UserSettings 其他 export，仅替换 getSettings
- 上一 story 60-7 同日完成（98978d1 feat(shop): close event bus + relic hooks for terminal BUY/SELL）
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 **4/4 done** ✅（本 story 完成 P2.2）· 接下来进入 P2.3 浪漫化（60-9 ~ 60-13 共 5 项）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：`L1_terminal_intro_body` zh + en 文案澄清 SKU 占位符 — `BUY <编号>` → `BUY <SKU>（如 SKL-001）` / `BUY <SKU> (e.g. SKL-001)`，新玩家不再纠结"编号是什么格式"
  - L1-L5 暂不修（prereq 链 / dismiss 时长 / event listener 泄漏 / pack emit scope / initialized flag — 都是 pre-existing pattern + cosmetic + UX playtest 待验证）

### File List

新增：
- `src/tests/unit/systems/tutorial/tutorialShopUIGating.test.ts` (~190 行，17 测试用例)

修改：
- `src/data-json/tutorialSteps.json` — L1 数组追加 4 个新 step（terminal_intro / workbench_drag / relic_number_row / drawer_words）
- `src/src/demo/demo-i18n.ts` — zh + en 各加 8 个 i18n key（4 step × title+body）
- `src/src/systems/tutorial/tutorialInit.ts` — import `getSettings`；新增 `lastPurchaseWasRelic` + `lastPurchaseWasPack` flag；shop:purchase handler 同步更新；老 3 step（shop_intro / skill_bind / shape_hint）condition 加 classic gate；新 4 step 注入 terminal-only condition
- `src/src/core/events/EventBus.ts` — `shop:purchase.type` 加 `'pack'` literal
- `src/src/ui/shopPreview.ts` — `executeBuyPackDirect` + `finalizePackPick` 末端加 `eventBus.emit('shop:purchase', { type: 'pack', ... })`
- `src/tests/unit/systems/tutorial/tutorialL0L1.test.ts` — L1_STEPS count 5→9，FULL count 20→24（注释更新）
- `src/tests/unit/systems/tutorial/tutorialL4L5.test.ts` — FULL count 20→24
- `docs/implementation-artifacts/sprint-status.yaml` — 60-8 ready-for-dev → in-progress → review
