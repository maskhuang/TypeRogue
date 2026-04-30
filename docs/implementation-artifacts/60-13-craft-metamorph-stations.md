# Story 60.13: Craft + Metamorph 工序

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.3（浪漫化）· P2.3 第 5 项（最后一项） -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **造词师 (wordsmith) 或蜕变师 (metamorph) 职业玩家**,
I want **在 terminal 商店的工作台抽屉里完整完成造词 / 蜕变操作（拖碎片 / 看流水线 / 选词条蜕变），不用切回 classic UI**,
so that **terminal 商店真正是双职业玩家的一等公民，P2.3 浪漫化档案完工**.

## 背景

P2.3 已完成 60-9 hover tooltip / 60-10 INF owned / 60-11 转场动画 / 60-12 音效。但**工作台 craft / metamorph 抽屉还是 stub**：

- `shopPreview.ts:1373` craft 抽屉显示 `STATION OFFLINE · WIRING DEFERRED TO PHASE 2`
- `shopPreview.ts:1376` metamorph 抽屉显示同样 stub 文案

底部按钮（`wb-craft-btn` / `wb-meta-btn`）已经按 `state.classId === 'wordsmith' / 'metamorph'` 条件显示，但点开抽屉后看不到任何真功能。

P2.3 第 5 项（也是 P2.3 最后一项）：**把 stub 抽屉填实** —— 复用 classic 既有的 `renderCraftPanel` / `renderMetamorphPanel` 渲染到工作台抽屉容器，**保留全部老逻辑（碎片拖拽 / 流水线 / 蜕变选词条 / mutagen 消耗）**，仅做最小适配（容器 ID 切换 + paper-craft 风格 scope）。

完成后 P2.3 全部完成（5/5），Epic 60 进入 P2.4 清理（60-14 模块拆分 + i18n）。

## Acceptance Criteria

1. **AC1：Craft 抽屉接入真 UI** —— `openDrawer('craft')` 路径不再渲染 stub，而是：
   - 调 `renderCraftPanel(body, onGoldUpdate)` 注入到 `wb-drawer-body` 元素
   - `onGoldUpdate` 回调实现：调用 `updateTerminalChrome()` 让 BAL 数字同步刷新
   - 老逻辑（拖碎片 / 流水线进度 / 已造词列表 / 拆解）**完全保留**

2. **AC2：Metamorph 抽屉接入真 UI** —— `openDrawer('metamorph')` 路径调 `renderMetamorphPanel(body)` 注入。老逻辑（mutagen 消耗 / 选词条蜕变 / 蜕变 A/B 计数）保留。

3. **AC3：仅对应职业可见底部按钮（已有保留）** —— `wb-craft-btn` 仅 `state.classId === 'wordsmith'` 时显示；`wb-meta-btn` 仅 `state.classId === 'metamorph'` 时显示。**60-2 era 已有逻辑（line 1493-1494）不动**。

4. **AC4：抽屉关闭后状态保留** —— craft / metamorph 状态全部存在 `state.fragmentInventory` / `state.assemblyQueue` / `state.mutagenInventory` / `state.affixSkills` 中，关闭抽屉不破坏。重新打开时 `renderCraftPanel` 重渲读取最新 state，自然恢复显示。

5. **AC5：paper-craft 风格 scope** —— craft / metamorph panel 默认是 CRT 黑底霓虹（classic 风格），落到工作台 paper-craft 牛皮纸背景上对比度差。**最小适配**：用 `body.shop-preview-active .craft-section` / `.metamorph-section` 等 scope 选择器覆盖关键颜色（背景透明 / 主文本黑墨 / 强调红章 / quest 绿章），与 60-9 tooltip 改色同模式。
   - **不重写 panel HTML 结构** —— 仅 CSS scope 覆盖
   - **不影响 classic shop** craft/metamorph 面板（无 shop-preview-active class）

6. **AC6：拖拽碎片 + 流水线动画** —— 老 craft panel 用 native HTML5 drag 拖碎片到组装区。这是独立于 dragManager 的旧路径。**保持老逻辑不动**，本 story 不引入 dragManager 接管。

7. **AC7：onGoldUpdate 回调** —— craft 内部花香蕉（购买字母碎片 / 拆词获得碎片 + 香蕉）后，`onGoldUpdate()` 应让 terminal banner 的 BAL 数字立即刷新。直接调 `updateTerminalChrome()` 即可。

8. **AC8：UND 兼容（不破坏）** —— craft / metamorph 操作**不进 undoStack**（老 classic 也不进）。用户在工作台 craft 后又退出商店，操作不可撤销，与老行为一致。

9. **AC9：单元测试覆盖**
   - 新建 `tests/unit/ui/shopPreviewCraftMetamorph.test.ts`：
     - **a)** wordsmith 职业 + `openDrawer('craft')` → `renderCraftPanel` 被调（spy via vi.mock）
     - **b)** metamorph 职业 + `openDrawer('metamorph')` → `renderMetamorphPanel` 被调
     - **c)** 非对应职业（none）调 `openDrawer('craft')` → drawer 仍打开但 panel 内容是 stub or panel 渲染 anyway（见开放问题 1）
     - **d)** craft panel `onGoldUpdate` 回调 → `updateTerminalChrome` 触发
   - 复用 60-7 / 60-9 / 60-10 vi.mock + STUB_DOC 模式

10. **AC10：Story 60.x ecosystem 不退化** —— 全套测试绿。

11. **AC11：tsc 0 新错** —— shopPreview.ts + 新加 import 的 ts 错误数 baseline 持平。

12. **AC12：手动验证留 code-review** —— Demo 模式下选 wordsmith 职业 → 进 terminal 商店 → 工作台底部点 🔤 CRAFT → 抽屉里能看到流水线/碎片/造词 UI 完整工作。同样 metamorph 职业 → 🧬 METAMORPH 抽屉能蜕变。

## Tasks / Subtasks

- [x] **Task 1：openDrawer craft/metamorph 替换 stub（AC: 1, 2, 7）**
  - [x] 1.1 import `renderCraftPanel from '../systems/classes/CraftingStation'`
  - [x] 1.2 import `renderMetamorphPanel from '../systems/classes/MetamorphStation'`
  - [x] 1.3 替换 `kind === 'craft'` 分支：
    ```ts
    if (kind === 'craft') {
      title.textContent = 'WORDSMITH STATION · ASSEMBLY LINE';
      body.innerHTML = ''; // 清掉旧内容（renderCraftPanel 内部会 innerHTML='' 再添加）
      renderCraftPanel(body as HTMLElement, () => updateTerminalChrome());
    }
    ```
  - [x] 1.4 替换 `kind === 'metamorph'` 分支：
    ```ts
    if (kind === 'metamorph') {
      title.textContent = 'METAMORPH STATION · MUTATION CHAMBER';
      body.innerHTML = '';
      renderMetamorphPanel(body as HTMLElement);
    }
    ```

- [x] **Task 2：删 renderStubDrawerHtml（AC: 1, 2）**
  - [x] 2.1 函数 `renderStubDrawerHtml(name, desc, status)` 仅 craft/metamorph stub 路径用，本 story 替换后无消费者
  - [x] 2.2 删除函数定义（`shopPreview.ts:1424` 附近）
  - [x] 2.3 验证全文无残留引用

- [x] **Task 3：paper-craft 风格 scope 覆盖（AC: 5）**
  - [x] 3.1 找出 craft / metamorph panel CSS 主要 class（`.craft-section` / `.metamorph-section` / 流水线 cell / 碎片 token / 词条选项）
  - [x] 3.2 在 `style.css` 加 `body.shop-preview-active` scope 覆盖：
    - 容器背景：透明（让 `wb-drawer-body` 牛皮纸透出）
    - 主文本 `color: #2a1f10`（黑墨）
    - 副文本 / 提示 `color: #5a4828`（文书褐）
    - 强调（数值 / quest）`color: #8a1a1a` / `#7a5a10`
    - 流水线 cell border / 碎片 chip 用油墨调色板
  - [x] 3.3 不动 classic shop 走的同 panel 渲染

- [x] **Task 4：__test API 暴露 openDrawer + 关 helper（AC: 9）**
  - [x] 4.1 `openDrawer` 已在 60-12 的 __test 暴露 ✓
  - [x] 4.2 测试通过 spy 验证 renderCraftPanel / renderMetamorphPanel 被调

- [x] **Task 5：单元测试（AC: 9）**
  - [x] 5.1 新建 `tests/unit/ui/shopPreviewCraftMetamorph.test.ts`，~150 行
  - [x] 5.2 vi.mock CraftingStation + MetamorphStation 让 renderXxx 是 spy
  - [x] 5.3 vi.mock effects/sound（playSound）+ systems/battle（startLevel）防真实初始化
  - [x] 5.4 4 用例覆盖（详 AC9 a-d）+ 2 用例验证 stub 已移除（kind=craft / metamorph 不再渲染 STATION OFFLINE 字样）

- [x] **Task 6：tsc + 全套测试（AC: 10, 11）**
  - [x] 6.1 `cd src && npx tsc --noEmit -p .` → 0 新错
  - [x] 6.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| Craft 面板 | `src/src/systems/classes/CraftingStation.ts:21` | `renderCraftPanel(container, onGoldUpdate)` |
| Metamorph 面板 | `src/src/systems/classes/MetamorphStation.ts:142` | `renderMetamorphPanel(container)` |
| 工作台 drawer 入口 | `src/src/ui/shopPreview.ts:openDrawer` | 当前 stub 实现 |
| 状态：碎片 / 流水线 | `src/src/core/state.ts` | `state.fragmentInventory` · `state.assemblyQueue` · `state.fragmentQueue` |
| 状态：mutagen / affixSkills | `src/src/core/state.ts` | `state.mutagenInventory` · `state.affixSkills` |
| terminal banner 刷新 | `src/src/ui/shopPreview.ts:updateTerminalChrome` | onGoldUpdate 回调用 |
| 抽屉容器 ID | `wb-drawer-body` HTML element | renderXxx 注入目标 |
| 职业按钮（已有） | `wb-craft-btn` / `wb-meta-btn` | 60-2 era 已 wire `data-drawer="craft|metamorph"` |
| Classic 用法 | `src/src/systems/shop.ts:4465 / 4499 / 4502` | 参考 onGoldUpdate 实现 |

### Architecture Compliance

**Dependency direction：**
- ui/shopPreview → systems/classes/CraftingStation + MetamorphStation —— 与 60-7 副作用 hook 同模式（已 review 通过）
- 不引入新跨层依赖 ✓

**State write rules：**
- ✅ craft / metamorph state 写入由 panel 内部老逻辑负责（不变）
- ✅ onGoldUpdate 回调是只读触发 UI 刷新
- ✅ 不动 dragManager（craft 用 HTML5 native drag 老路径）

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock CraftingStation + MetamorphStation
- **零新依赖**

### File Structure Requirements

```
src/src/ui/shopPreview.ts                ← 修改：openDrawer craft/metamorph 替换 stub；删 renderStubDrawerHtml；新加 imports
src/src/style.css                        ← 修改：加 body.shop-preview-active scope 覆盖 craft/metamorph panel CSS（背景 / 字色 / 边框）
src/tests/unit/ui/shopPreviewCraftMetamorph.test.ts  ← 新增：~150 行 / 4-6 用例
```

**避免：**
- 不要重写 CraftingStation / MetamorphStation 的逻辑 — 仅适配容器
- 不要把 craft 老 HTML5 drag 改走 dragManager（scope 之外）
- 不要在 onGoldUpdate 内做 state 写入 — 仅 UI 刷新
- 不要给 craft / metamorph 加 undo（老 classic 也无）
- 不要把 craft / metamorph 里的 inline color 全 paper-craft —— 优先 CSS class 覆盖；inline 不可避免时才用 attribute selector（参考 60-9 tooltip 处理 KW_STYLE）

### Testing Requirements

| 用例 | 验证 | mock |
|---|---|---|
| Craft panel 注入 | renderCraftPanel 被调（含 onGoldUpdate 回调） | spy on renderCraftPanel |
| Metamorph panel 注入 | renderMetamorphPanel 被调 | spy on renderMetamorphPanel |
| onGoldUpdate 回调 | 触发 updateTerminalChrome 副作用 | 间接 spy（DOM banner 元素更新） |
| stub 字符串移除 | drawer body 不再含 'STATION OFFLINE · WIRING DEFERRED' | 直接读 body.innerHTML |
| 非对应职业（state.classId='none'） | drawer 仍打开（按钮不显示就不会触发，但若手动调 openDrawer，panel 仍渲染） | 验证不抛错 |

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.7 / 60.9 vi.mock with importActual | 本 story 同样 |
| 60.10 fake viewport 捕获 appendLine | 本 story 不需要（panel 内部不调 appendLine） |
| 60.9 paper-craft scope 覆盖 KW_STYLE | 本 story 同模式覆盖 craft/metamorph CSS |
| 60.12 sfx 守卫模式 | craft / metamorph 内部老 playSound 调用沿用 — 不改 |
| 60.x ecosystem cd src 跑 vitest | 本 story 同样 |

### Git Intelligence Summary

```
c9eccef feat(shop): terminal/workbench sound effects layer (Story 60.12)
601e1c6 feat(shop): transition animations (BUY whoosh + CRT flicker + RESHUFFLE print) (Story 60.11)
9cc5732 feat(shop): INF supports owned skills/relics by key/name/relic-id (Story 60.10)
```

**本 story 推荐 commit message：** `feat(workbench): wire craft + metamorph drawers (Story 60.13)`

### Risks & Open Questions

- **风险 A：Craft / Metamorph panel 内部依赖 classic shop DOM ID（如 `craft-panel` / `metamorph-panel`）** —— 缓解：检查 CraftingStation.ts / MetamorphStation.ts 内部 querySelector 调用是否硬编码 ID。如果有，需在 wb-drawer-body 内提供同 ID 容器或重构 panel 用相对查询。**实施时检查 Section 1.1**。
- **风险 B：Panel 内部 playSound 调用使用 classic profile（如 'click' / 'buy'）** —— Acceptable：classic profile 仍工作（masterVolume 控制）。本 story 不替换为 shop_* 前缀（scope 之外）。
- **风险 C：CSS class 名冲突 —— `.craft-section` / `.metamorph-section` 未在 paper-craft scope 下定义，仅 classic 风格** —— 缓解：先 grep 确认现有 class 名，再加 scope 覆盖。
- **风险 D：`onGoldUpdate` 回调在 terminal 中调用 `updateTerminalChrome` 但用户当前在 workbench 屏（drawer 打开覆盖在 workbench 上）** —— terminal banner 是 `#terminal-shop-screen` 内的 DOM，drawer 打开时它 hidden。`updateTerminalChrome` 仍能更新 DOM，下次切回 terminal 时正确显示。OK。
- **开放问题 1：非对应职业玩家手动用 INF / debug 调 `openDrawer('craft')` 怎么办？** 倾向：**panel 仍渲染**（无需阻拦），玩家会看到 craft UI 但 fragmentInventory / 流水线全空，自然劝退。Story 不加额外 guard。
- **开放问题 2：抽屉打开 → 切屏 → 再打开抽屉，state 是否保留？** Panel 通过读 `state.*` 实时渲染 → 自然保留。closeDrawer 也只是 `el.style.display = 'none'`，不清 state。**AC4 已说明保留**。

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-13] — 验收原文
- [Source: src/src/ui/shopPreview.ts:1369-1378] — 当前 craft/metamorph stub 实现
- [Source: src/src/ui/shopPreview.ts:1424 renderStubDrawerHtml] — 待删 helper
- [Source: src/src/systems/classes/CraftingStation.ts:21 renderCraftPanel] — 接入入口
- [Source: src/src/systems/classes/MetamorphStation.ts:142 renderMetamorphPanel] — 接入入口
- [Source: src/src/systems/shop.ts:4465 / 4499 / 4502] — Classic 调用模板（onGoldUpdate 实现参考）
- [Source: src/src/ui/shopPreview.ts:1493-1494] — wb-craft-btn / wb-meta-btn classId 守卫（60-2 era 已 wire）
- [Source: src/src/ui/shopPreview.ts:updateTerminalChrome] — onGoldUpdate 回调目标
- [Source: docs/implementation-artifacts/60-12-sound-effects.md] — 上一 P2.3 story（sfx + helper 模板）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成 6 个 task
- **Risk A 实测清除**：grep `getElementById|querySelector('#` on CraftingStation.ts + MetamorphStation.ts → 0 命中，panel 不依赖外部 DOM ID，可直接接入 `wb-drawer-body` 容器
- 删 `renderStubDrawerHtml` 函数 + 注释占位
- CSS scope 覆盖采用 `body.shop-preview-active .craft-section` / `.morph-skill-card` 等 class 选择器 + 兜底 `[style*="color:"]` attribute selector（参考 60-9 tooltip 模式）
- shopPreview.ts + style.css tsc 错误数 baseline 持平（2 → 2）
- Story 60.x ecosystem + tutorial: 9 新 craft/metamorph 测试，全绿；总数 301/308（7 baseline tutorial fail 与本 story 无关）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.3 浪漫化**最后一项**（5/5）
- 实施于 2026-04-29，所有 6 个 task 完成；Status: review
- **AC 全覆盖：** AC1（craft 接入 + onGoldUpdate）/ AC2（metamorph 接入）/ AC3（职业按钮守卫不动）/ AC4（state 保留 — 由 panel 内部读 state.* 实现）/ AC5（paper-craft scope 覆盖 12 个 class + 兜底 inline color）/ AC6（HTML5 native drag 不动）/ AC7（onGoldUpdate → updateTerminalChrome）/ AC8（不接 undo）/ AC9（9 单测）/ AC10（ecosystem 不退化）/ AC11（tsc 0 新错）/ AC12（手动验证留 review）
- **关键设计决策：**
  1. **黑盒复用 `renderCraftPanel` / `renderMetamorphPanel`** —— 0 业务重写，仅切换容器
  2. **删 `renderStubDrawerHtml` 死代码**，不留尸位
  3. **CSS scope 覆盖优先 class，inline color 兜底** —— 与 60-9 tooltip 改色策略一致；classic shop 同 panel 0 影响
  4. **onGoldUpdate 实现为 `() => updateTerminalChrome()`** —— craft 内部花/获得香蕉时让 terminal banner BAL 即时刷新
- 上一 story 60-12 同日完成
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 4/4 done · P2.3 **5/5 done** ✅（本 story 完成 P2.3）· 仅剩 P2.4 60-14 模块拆分 + i18n 全覆盖
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：流水线进度条 paper-craft scope 覆盖 — `.craft-pipeline-bar` 浅褐底 + `.craft-pipeline-fill` 绿章填充（之前是紫霓虹 + 白透明，落牛皮纸看不清也违和）
  - **L1**：补 2 个测试用例覆盖 classId='none' 路径 panel 仍正常渲染（开放问题 1 决议落实）
  - L2-L5 暂不修（pre-existing pattern + cosmetic + 60-14 范围）

### File List

新增：
- `src/tests/unit/ui/shopPreviewCraftMetamorph.test.ts` (~140 行，9 测试用例)

修改：
- `src/src/ui/shopPreview.ts` — import `renderCraftPanel` / `renderMetamorphPanel`；`openDrawer('craft' | 'metamorph')` 替换 stub 为真 panel 渲染（onGoldUpdate → updateTerminalChrome）；删 `renderStubDrawerHtml` 死函数
- `src/src/style.css` — 加 `body.shop-preview-active` scope 12 条规则覆盖 craft/metamorph panel CSS（标题红章 / 容器透明 / 流水线/碎片 cell 油墨 / 按钮金章 / metamorph 卡片 + 兜底 inline color）
- `docs/implementation-artifacts/sprint-status.yaml` — 60-13 ready-for-dev → in-progress → review
