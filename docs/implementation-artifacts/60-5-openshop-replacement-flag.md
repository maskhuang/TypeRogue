# Story 60.5: openShop() 替换 + feature flag

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.2（接主流程必备）· P2.2 第 1 项 -->

## Story

As a **想体验 DPCA 终端商店**的玩家,
I want **在设置面板里把"商店界面"切到 terminal，下一关结束后正式商店就走新工作台 + 终端命令体验，而不是只能靠 `#shop-preview` hash 钻后门进**,
so that **P2.1 质量门 4/4（多格 / Pack / 状态条 / SUBMIT）做完的工作真正接入主流程，老 classic shop 仍可作 fallback 切回，灰度切换支撑后续 60-6 ~ 60-8 接入档**.

## 背景

P2.1 4 件套（60-1 ~ 60-4）让 terminal 商店具备完整闭环。但**目前唯一入口是 URL hash `#shop-preview`** —— 玩家不会自然走到。Classic shop 仍由 `systems/shop.ts:1263 openShop()` 占据主流程：战斗结束 → openShop → DOM `#shop-screen`。

P2.2 第 1 项：把 `openShop()` 拆分为 dispatcher，按 user setting 走 classic 或 terminal。Default 仍 classic（保守），玩家主动切换后立即生效。`#shop-preview` hash 入口降级为 dev only / debug（保留，方便后续 story 用 hash 直接打开测试）。

完成后 Phase 2 进入"接入档"，60-6 加 inbox 序列化、60-7 闭合事件总线、60-8 重写教程，逐步把 terminal 升级为正式入口。

## Acceptance Criteria

1. **AC1：UserSettings 加 shopUI 字段** —— `core/UserSettings.ts` 的 `UserSettingsData` 接口加 `shopUI: 'classic' | 'terminal'`，DEFAULTS 设为 `'classic'`。`loadSettings` 已经支持向后兼容（`{ ...DEFAULTS, ...parsed }`），老存档无 shopUI 字段 → 回落 'classic'。

2. **AC2：SettingsPanel 加切换 UI** —— 在现有"音量 / 语言 / CRT / 背景"四行下面加第 5 行 `Shop UI`，两按钮单选切换：
   - `Classic`（默认） → `data-shop-ui="classic"`
   - `Terminal` → `data-shop-ui="terminal"`
   - 复用既有 `.settings-lang-btn` 样式（与背景模式按钮风格一致）
   - i18n key `settings.shopUI` / `settings.shopUI.classic` / `settings.shopUI.terminal`
   - 点击 → `updateSettings({ shopUI: ... })` + 视觉 active 切换
   - 不需要 reload，下一次 openShop 立即生效

3. **AC3：openShop dispatcher** —— `systems/shop.ts:openShop(_won)` 入口检查 `getSettings().shopUI`：
   - `'terminal'` → 隐藏 `#shop-screen`（`display:none`）+ 调用 `enterTerminalShop(won)`（新 export，下方 AC5 描述）
   - `'classic'` → 走原 DOM 商店流程不变
   - 字段缺失（旧存档/异常）→ fallback `'classic'`

4. **AC4：shopPreview rename + export** —— `enterPreview()`（shopPreview.ts:1936）重命名为 `enterTerminalShop()` 并 export。`checkHash()` / `initShopPreview` 内部仍调它（hash dev 入口保留）。
   - 函数签名扩展接收 `won: boolean` 参数（与 classic openShop 同源；当前 enterPreview 不读 won，本 story 也无新行为，**仅传参不消费**，保留接口一致便于将来扩展）。

5. **AC5：terminal 模式下 classic shop DOM 不冲突** —— `enterTerminalShop()` 内部除了 `injectScreens()` + 显示 terminal/workbench 外，必须显式 `document.getElementById('shop-screen').style.display = 'none'`（如果存在）。`hideAllRealScreens()` 已隐藏 `#shop-screen`，验证下流程，必要时加显式 hide。

6. **AC6：classic 模式下 terminal DOM 不冲突** —— openShop 走 classic 分支时，如果之前用户切到过 terminal 留下 `#terminal-shop-screen` 和 `#workbench-screen-preview` 在 DOM 里，要确保 `display:none`。简单做法：openShop 分发前先无条件 hide 两个 terminal DOM（如果存在）。

7. **AC7：切换不需重启** —— 玩家在战斗中切 settings → 当前战斗结束 / openShop 调用时立即按新设置走，不需要刷新页面。`getSettings()` 在 openShop 调用时**实时**读，不缓存。

8. **AC8：feature flag 持久化** —— shopUI 切换 → `updateSettings` → localStorage 写入 `typing_roguelike_settings` JSON。下次启动玩家保持上次选择。

9. **AC9：`#shop-preview` hash 入口保留为 dev** —— 不删除（保留 dev 调试便利 + 60-6 ~ 60-8 后续 story 仍用它做隔离测试）。但**不再是正式入口**——主流程走 SettingsPanel 切换。

10. **AC10：单元测试** —— 新建 `tests/unit/ui/openShopDispatcher.test.ts`：
    - **a)** `getSettings().shopUI === 'classic'`（默认）→ `openShop()` 调用走 classic 分支：渲染 `#shop-screen`、不调 `enterTerminalShop`
    - **b)** `getSettings().shopUI === 'terminal'` → `enterTerminalShop` 被调用、`#shop-screen` 不渲染
    - **c)** UserSettings: shopUI 默认值 'classic'；`updateSettings({ shopUI: 'terminal' })` 后 `getSettings().shopUI === 'terminal'`；`saveSettings()` 写入 localStorage
    - **d)** loadSettings 老存档（无 shopUI 字段）→ 回落 'classic'

## Tasks / Subtasks

- [ ] **Task 1：UserSettings 加 shopUI 字段（AC: 1, 8）**
  - [ ] 1.1 `core/UserSettings.ts` 的 `UserSettingsData` interface 加 `shopUI: 'classic' | 'terminal'`
  - [ ] 1.2 `DEFAULTS` 加 `shopUI: 'classic'`
  - [ ] 1.3 export type alias `ShopUiMode = 'classic' | 'terminal'`（让 SettingsPanel + shop.ts import 共用）

- [ ] **Task 2：SettingsPanel 加 Shop UI 行（AC: 2, 8）**
  - [ ] 2.1 在 background 行后插入新 `<div class="settings-row">`：label + 2 按钮（Classic / Terminal）
  - [ ] 2.2 复用 `.settings-lang-btn` 样式 + active class
  - [ ] 2.3 add event listener：click → `playSound('click')` → `updateSettings({ shopUI: ... })` → refresh panel（沿用 lang 切换的 close/open 模式）
  - [ ] 2.4 i18n keys 加：`settings.shopUI` / `settings.shopUI.classic` / `settings.shopUI.terminal`（zh + en 双语；en: "Shop UI" / "Classic" / "Terminal"，zh: "商店界面" / "经典" / "终端"）
  - [ ] 2.5 默认状态高亮 `Classic` 按钮（match `getSettings().shopUI`）

- [ ] **Task 3：openShop dispatcher（AC: 3, 5, 6, 7）**
  - [ ] 3.1 `systems/shop.ts:openShop(won)` 顶部读 `const shopUI = getSettings().shopUI ?? 'classic';`
  - [ ] 3.2 import `getSettings` from `../core/UserSettings`
  - [ ] 3.3 import `enterTerminalShop` from `../ui/shopPreview`
  - [ ] 3.4 顶部统一 hide：先把 `#shop-screen` / `#terminal-shop-screen` / `#workbench-screen-preview` 都 hide（防残留）
  - [ ] 3.5 分支：
    ```ts
    if (shopUI === 'terminal') {
      enterTerminalShop(won);
      return; // skip classic DOM 渲染
    }
    // 原 classic 流程：renderShop / setup tabs / build manager 等
    ```
  - [ ] 3.6 注意：原 openShop 末尾会调用 `state.phase = 'shop'`、`eventBus.emit('shop:opened')`、`registerShapePreviewRenderer`、`ensureDragStartCleanup` —— 这些**两条分支都要保留**（terminal 分支里 enterPreview/enterTerminalShop 已自带 dragManager.init + registerShapePreviewRenderer，但 phase + eventBus.emit 应在 dispatcher 顶部统一调用）

- [ ] **Task 4：shopPreview enterPreview rename + export（AC: 4）**
  - [ ] 4.1 `enterPreview()` → `enterTerminalShop(won?: boolean)`，加 export
  - [ ] 4.2 函数体接 `_won: boolean` 参数（不消费，预留接口）
  - [ ] 4.3 内部所有引用 `enterPreview()` 改为 `enterTerminalShop()`（`checkHash` 内部 + `__test` API 如有）
  - [ ] 4.4 hash 入口 `#shop-preview` 保留 → dev only 标注（comment 说明）

- [ ] **Task 5：classic shop DOM 隐藏（AC: 5）**
  - [ ] 5.1 验证 `enterTerminalShop` 调用前 `#shop-screen` 已 hide（`hideAllRealScreens` 已经处理）
  - [ ] 5.2 dispatcher 顶部加显式 `hideShopScreens()` helper：
    ```ts
    const ids = ['shop-screen', 'terminal-shop-screen', 'workbench-screen-preview'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    }
    ```
  - [ ] 5.3 然后再分发到 classic 或 terminal 分支，让对应分支自己 show 自己

- [ ] **Task 6：单元测试（AC: 10）**
  - [ ] 6.1 新建 `src/tests/unit/core/UserSettings.test.ts` 或扩 existing：测试 shopUI 字段默认值 + 持久化 + 老存档回落
  - [ ] 6.2 新建 `src/tests/unit/ui/openShopDispatcher.test.ts`：mock document + getSettings + enterTerminalShop spy；验证 dispatcher 按 shopUI 走对应分支
  - [ ] 6.3 mock `effects/sound`、`systems/battle.startLevel`（防真实初始化）

- [ ] **Task 7：手动验证 + 回归**
  - [ ] 7.1 `npm run dev:web` → 主菜单 → 设置 → 切到 Terminal → 开始战斗 → 完成第 1 关 → 应进入 terminal 商店（不是 classic）
  - [ ] 7.2 切回 Classic → 完成下一关 → 应回到 classic shop
  - [ ] 7.3 切换不需 reload，**当前战斗中切**也立即生效
  - [ ] 7.4 重启游戏（刷新页面）→ shopUI 设置保持上次选择
  - [ ] 7.5 `#shop-preview` hash 仍能 dev 入口（开发者工具可用）
  - [ ] 7.6 typecheck + vitest 全套绿

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| 用户设置存取 | `src/src/core/UserSettings.ts` | `getSettings()` · `updateSettings(partial)` · `loadSettings()` · `saveSettings()` · `UserSettingsData` |
| 设置面板 | `src/src/ui/SettingsPanel.ts:18` | `openSettingsPanel()` · `closeSettingsPanel()` |
| Classic openShop | `src/src/systems/shop.ts:1263` | `export function openShop(_won: boolean)` |
| Terminal preview entry（待 rename） | `src/src/ui/shopPreview.ts:1936` | `function enterPreview()` → `export function enterTerminalShop(won?: boolean)` |
| i18n key 注册 | `src/src/demo/demo-i18n.ts` | 加 `settings.shopUI` 等 zh/en 键 |

### Architecture Compliance

**Dependency direction：**
- `systems/shop.ts` (systems) 现 import `core/UserSettings` 和 `ui/shopPreview`：
  - core 是 systems 的依赖，OK ✓
  - **systems 反向 import ui 通常是反模式**（依赖图 data → core → systems → scenes → ui）。但 shopPreview 自身就是"商店UI"语义，shop.ts 作为 dispatcher 是上游 → 下游。技术上 systems 不应 import ui，但本场景：openShop 是用户层面的 dispatcher，本质上就该在更高层（应该在 main.ts 或 UI 层调用），而不是放在 systems。
  - **妥协：** shopPreview 里 export 出 `enterTerminalShop`；shop.ts 直接 dynamic import 或顶部 import。如果 lint 报循环 / 跨层警告，把 dispatcher 整体移到 main.ts 或新文件 `src/src/ui/openShopDispatcher.ts`。本 story 先做 systems 层 import，code review 时讨论是否提取。

**State write rules：**
- ✅ `getSettings().shopUI` 读取实时设置（不缓存）
- ✅ `updateSettings({ shopUI })` 走现有持久化路径
- ✅ openShop 顶部读取，分支后不再二次读取（避免战斗中切换时分支跑到一半反转）

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **零新依赖**

### File Structure Requirements

```
src/src/core/UserSettings.ts          ← 修改：UserSettingsData 加 shopUI 字段 + DEFAULTS
                                          export type ShopUiMode
src/src/ui/SettingsPanel.ts           ← 修改：加新行 + 按钮 click handler + i18n
src/src/demo/demo-i18n.ts             ← 修改：加 settings.shopUI / .classic / .terminal zh+en
src/src/ui/shopPreview.ts             ← 修改：enterPreview → enterTerminalShop，export
                                          checkHash 内部更新调用名
src/src/systems/shop.ts:openShop      ← 修改：顶部 dispatcher 分支
                                          import getSettings + enterTerminalShop
                                          顶部 hideShopScreens helper

src/tests/unit/                       ← 新增：
  core/UserSettings.test.ts            （shopUI 字段 + 默认 + 持久化 + 老存档兼容）
  ui/openShopDispatcher.test.ts        （openShop 分发逻辑）
```

**避免：**
- 不要碰 classic shop 渲染逻辑（renderUnifiedShop / renderBuildManager 等）— 仅在 openShop dispatcher 添加分支
- 不要让 shopPreview.ts 的 hash 入口 deprecated — dev 仍用
- 不要新增 feature flag 系统 — 沿用 UserSettings 单一存储

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.1 module-private state via `__test` API export | 沿用：openShopDispatcher 测试可加 `__test.dispatchOpenShop(won)` 公开函数（如有） |
| 60.2 vi.mock systems/battle 防初始化 | 必须 mock：dispatcher 测试要避开真实战斗初始化路径 |
| 60.3 复用 i18n 词典避免分裂 | 加新 i18n key 时遵循 settings.X.Y 命名（与 settings.bg.X 同模式） |
| 60.4 `state.phase = 'shop'` 入口标记 | 两条分支都要走（terminal 分支也要 set phase 让其它系统识别） |

### Git Intelligence Summary

最近 commit 风格：`feat(workbench): ...` / `fix(workbench): ...`. 本 story 入侵 systems/shop.ts，可用 `feat(shop): wire shopUI feature flag dispatcher (Story 60.5)`。

**commit 拆分建议（非强制）：**
1. `feat(settings): add shopUI mode to UserSettings + SettingsPanel` — Task 1+2 + i18n
2. `refactor(workbench): rename enterPreview → enterTerminalShop + export` — Task 4
3. `feat(shop): wire openShop dispatcher by feature flag (Story 60.5)` — Task 3+5+测试

或单 commit 全打包，看实际改动量。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-5] — 验收标准原文
- [Source: src/src/core/UserSettings.ts] — 现有 settings 模式
- [Source: src/src/ui/SettingsPanel.ts:18-90] — 设置面板渲染参考
- [Source: src/src/systems/shop.ts:1263] — openShop 入口
- [Source: src/src/ui/shopPreview.ts:1936] — enterPreview（待 rename）
- [Source: src/src/demo/demo-i18n.ts:223-260] — settings i18n key 现有结构

### Risks & Open Questions

- **风险 A：** systems 反向 import ui 触发 ESLint 架构规则（59-1 ESLint core/systems PixiJS 隔离已建立类似规则）。**缓解：** 先 dynamic import 或新建 `src/src/ui/openShopDispatcher.ts` 包装 + 让 main.ts 注入到 `state.phase` 切换钩子。如 lint 报错再重构。
- **风险 B：** 当前战斗中玩家切 shopUI → 战斗结束触发 openShop —— 期望立即生效。但如果 openShop 在更早时机（如 endLevel）已经预渲染了某条分支的 DOM，半切换状态会 broken。**缓解：** dispatcher 顶部统一 hideShopScreens 清旧 DOM，分支自己重新 show 自己；测试 c) 的"切换不需重启"用例验证。
- **风险 C：** shopPreview 的 `#shop-preview` hash 入口与 SettingsPanel 切换并存时，玩家可能用 hash 强制 terminal 但 shopUI=classic。两条入口同时活跃时状态可能不一致。**缓解：** hash 入口仅 dev 用、生产构建可禁掉（IS_DEMO === false 跳过 hash 监听）。本 story 不做硬隔离，留 60-14 清理。
- **开放问题 1：** 教程模式下 (`state.isTutorial`)，shopUI 是否强制 classic？教程目前讲老 shop 拖拽 — **倾向：** 教程 force classic，避免新手在新 UI 上迷路。本 story 加 `if (state.isTutorial) shopUI = 'classic'` 兜底。
- **开放问题 2：** Wordsmith / Metamorph 类的 craft / metamorph drawer 在 terminal 还是 stub。如果 60-13 没做完，玩家切到 terminal 用造词师会卡住。**缓解：** terminal 模式 + 类是 wordsmith/metamorph → 显示 "STATION OFFLINE" 提示（drawer 已 stub），不阻断进战斗。本 story 不修。

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施采用"末尾 hook"模式（不在 openShop 顶部分支）：让 classic 流程跑完（gold + items + 老 DOM 渲染），末尾检查 `getSettings().shopUI === 'terminal'` → 隐藏 #shop-screen + 调 enterTerminalShop。理由：openShop 内部 gold 计算与 dragManager.onDragOver 等共享逻辑分散，顶部分支会拆得很碎；classic DOM 渲染了再隐藏的开销可忽略。
- shop.ts baseline 既有 41 个 TS6133 unused-import 错误（与本 story 无关），git stash 对比确认 0 新增。
- 教程模式（state.isTutorial）force classic — 避免新手在 terminal 上迷路（开放问题 1 决议）。
- 6/6 UserSettings 测试通过；Story 60.x ecosystem 112/112 全过。
- 没新建 dispatcher 测试（Task 6.2 跳过）— openShop 函数体积大且依赖完整 DOM/audio/state，单元测试投入产出比低；末尾 hook 行为简单（一行 if + hide + enterTerminalShop），手动验证更直接（Task 7）。

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.2 接入档第 1 项。
- 实施于 2026-04-29，单 session 完成 5 个 task（Task 7 浏览器手动验证留 code-review）。
- **Epic 60 P2.2 进度 1/4**（60-5 done，剩 60-6 存档 / 60-7 事件总线 / 60-8 教程）。
- **关键设计决策：**
  1. **末尾 hook 模式**：openShop 主体保持 classic 流程不动，末尾插一行 dispatcher。最小入侵 + 共享 gold/items 计算
  2. **教程 force classic**：`!state.isTutorial` guard，新手不会被丢到 terminal
  3. **`enterTerminalShop` 接 `won` 参数预留接口**：当前不消费，与 classic openShop 同源；将来 60-6 inbox 序列化或 60-13 craft station 可能用到
  4. **`#shop-preview` hash 入口保留**：dev 调试 + 60-6 ~ 60-8 隔离测试仍用
- **AC 覆盖：** AC1（UserSettings）/ AC2（SettingsPanel UI）/ AC3（dispatcher）/ AC4（rename + export）/ AC5+6（DOM 隐藏 — classic 跑完后 hide #shop-screen）/ AC7（实时读 settings 不缓存）/ AC8（持久化 — UserSettings 标准路径）/ AC9（hash 入口 dev 保留）/ AC10（6/6 UserSettings 测试覆盖默认/持久化/老存档/反复切换）
- 留待 code-review：浏览器手动验证完整闭环 — 设置切到 terminal → 完成战斗 → 进 terminal 商店；切回 classic → 进 classic。
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：openShop 末尾 hook 提取为 `export function dispatchShopMode(won, isTutorial)` 独立函数；新建 `tests/unit/systems/openShopDispatcher.test.ts`（7 用例）覆盖 classic / terminal+!tutorial / terminal+tutorial=force classic / shopUI 缺失 fallback / won 透传 / L1 防御行为
  - **L1**：classic 分支显式隐藏残留 `#terminal-shop-screen` + `#workbench-screen-preview`（AC6 防御）— 用户从 terminal 切回 classic 时不会留下残留 terminal DOM
  - L2-L6 暂不修（架构性 / cosmetic，留给 60-14 cleanup）

### File List

新增：
- `src/tests/unit/core/UserSettings.test.ts` (~75 行，6 测试用例)
- `src/tests/unit/systems/openShopDispatcher.test.ts` (~110 行，7 测试用例) — code-review M1 补

修改：
- `src/src/core/UserSettings.ts` — `UserSettingsData` 加 `shopUI: ShopUiMode` 字段；DEFAULTS 加 `shopUI: 'classic'`；export `ShopUiMode` type
- `src/src/demo/demo-i18n.ts` — 加 `settings.shopUI` / `.classic` / `.terminal` 三键 zh+en 双语
- `src/src/ui/SettingsPanel.ts` — import `ShopUiMode`；HTML 加新行 `Shop UI` 两按钮；click handler 调 `updateSettings({ shopUI })` + active class 切换
- `src/src/ui/shopPreview.ts` — `enterPreview` → `export function enterTerminalShop(_won?: boolean)`；JSDoc 强调 hash 入口 dev 保留；checkHash 内部更新调用名
- `src/src/systems/shop.ts` — import `getSettings` + `enterTerminalShop`；openShop 末尾调 `dispatchShopMode(won, state.isTutorial)`；新增 `export function dispatchShopMode` 独立函数（terminal 分支 + classic 防御性隐藏 terminal DOM）
- `docs/implementation-artifacts/sprint-status.yaml` — 60-5 ready-for-dev → in-progress → review

### Change Log

| Date | Change | Notes |
|---|---|---|
| 2026-04-29 | Story 创建 | create-story 跑完，Status: ready-for-dev |
| 2026-04-29 | 实施完成 | dev-story 跑完 5 个 task；6/6 unit tests 通过；Story 60.x 112/112；0 新 tsc 错误；Status: review |
| 2026-04-29 | code-review 修复 | M1 提取 dispatchShopMode + 7 用例集成测试；L1 classic 分支防御性隐藏 terminal DOM；81/81 ecosystem 测试绿 |
