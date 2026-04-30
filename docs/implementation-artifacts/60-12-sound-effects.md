# Story 60.12: 商店 / 工作台音效层

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.3（浪漫化）· P2.3 第 4 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **terminal 商店玩家**,
I want **键击 / 回车 / BUY 确认 / BUY 拒绝 / 工作台拖拽 / SUBMIT 红章 / 抽屉打开等关键交互有恰到好处的复古音效**,
so that **DPCA 终端 + paper-craft 工作台不再"哑剧"，从视觉浪漫化升级到声觉浪漫化**.

## 背景

P2.3 已完成 60-9 hover tooltip / 60-10 INF owned / 60-11 转场动画。但**当前 terminal 屏 + 工作台 0 音效** —— 玩家所有交互都"无声"。Classic shop 部分按钮调用 `playSound`（`buy` / `click` / `warning` 等），但 terminal 流程一次都没用过。

P2.3 第 4 项：**为 terminal + 工作台关键节点织入音效层**。复用既有 `playSound(type)` API（程序化合成 oscillator，零文件资源），加 8 个新声音 profile 覆盖：

1. **终端键击** —— 机械轴 thock（每次 a-z 输入）
2. **终端回车** —— 继电器 thunk（命令执行）
3. **BUY 确认** —— 点阵打印机 zip（成功购入）
4. **BUY 拒绝** —— 拨号忙音三声（余额不足 / inbox 满 / 未知 SKU）
5. **工作台拖起** —— 抓握刺啦（pickup）
6. **工作台落下/装配** —— 木质 click（drop on key）
7. **拖回 IN-tray** —— 闷响（unbind）
8. **抽屉打开** —— 抽拉哗啦（drawer open）

SUBMIT 红章音 60-4 已用 `playSound('confirm')`，本 story 复审是否换 `submit_stamp` 重击；如保持 confirm 不动。

新增 `settings.shopSound: boolean` 默认 true，玩家可关。复用 60-11 的 `shouldAnimateShop` 模式建 `shouldPlayShopSound()` helper（同时守卫 settings 和 master volume = 0）。

完成后 P2.3 进度 4/5。

## Acceptance Criteria

1. **AC1：UserSettings 加 `shopSound: boolean`**
   - `UserSettingsData` interface 加 `shopSound: boolean`
   - `DEFAULTS.shopSound = true`
   - 老存档加载时缺字段 → 回落 `true`（默认开）
   - 持久化走现有 `updateSettings` 路径

2. **AC2：导出 `shouldPlayShopSound(): boolean` helper**
   - 落点 `core/UserSettings.ts`（与 `shouldAnimateShop` 同模块）
   - 内部读 `getSettings().shopSound`
   - 返回 false 时 shopPreview 内所有新加 playSound 调用跳过
   - 不需要 prefers-reduced-motion 守卫（音频与动画无关）

3. **AC3：SettingsPanel 加 "Shop Sound" 切换行**
   - 在现有 `Shop Animations` 行下加新行 `Shop Sound`，On/Off
   - i18n key `settings.shopSound` / `.on` / `.off`（zh + en）
   - 复用 `data-shop-sound="on|off"` attribute + 现有切换 handler 模板

4. **AC4：8 个新 SOUND_PROFILES 加到 `core/constants.ts`**
   - 每个 profile 是 `[startFreq, endFreq, volume]` triplet
   - 命名规范：`shop_kbd_click` / `shop_kbd_enter` / `shop_buy_ok` / `shop_buy_err` / `shop_drag_pickup` / `shop_drag_drop` / `shop_drag_unbind` / `shop_drawer_open`
   - 频率/音量经验值（参考 epic 60 narrative）：
     - kbd_click: ~600→580Hz / 0.04 vol（低音 thock）
     - kbd_enter: ~300→200Hz / 0.10 vol（继电器 thunk，下行）
     - buy_ok: ~800→1500Hz / 0.10 vol（zip 上行）
     - buy_err: ~250→150Hz / 0.10 vol（warning 风，可考虑直接复用 `warning`）
     - drag_pickup: ~1200→900Hz / 0.05 vol（短促刺啦）
     - drag_drop: ~400→200Hz / 0.08 vol（木质 click）
     - drag_unbind: ~250→150Hz / 0.06 vol（闷响）
     - drawer_open: ~400→700Hz / 0.07 vol（哗啦上行）

5. **AC5：terminal 键击音效**
   - 在 `shopPreview.ts:onKey` 处理函数中：
     - `e.key.length === 1` (a-z 字符) 路径加 `playSound('shop_kbd_click')`
     - `e.key === 'Enter'` 路径加 `playSound('shop_kbd_enter')`
     - 跳过条件：`!shouldPlayShopSound()`
   - Backspace 不发声（与传统终端一致）

6. **AC6：BUY 确认 / 拒绝音效**
   - `executeBuySkill` / `executeBuyRelic` / `executeBuyPackDirect` / `finalizePackPick` 成功路径调 `playSound('shop_buy_ok')`
   - `executeBuySkill` inbox 满分支 + `executeBuyRelic` 已拥有 / 槽满分支 + `cmdBuy` 余额不足分支 + 未知 SKU 分支调 `playSound('shop_buy_err')`
   - 跳过条件：`!shouldPlayShopSound()`

7. **AC7：工作台拖拽 3 类音效**
   - `dragManager.onDragStart` 全局回调（已在 60-9 用过，加一行 `if (shouldPlayShopSound()) playSound('shop_drag_pickup')`）
   - `bindSkillToKey`（落到键）调 `playSound('shop_drag_drop')`
   - `unbindSkillFromKey`（卸回 IN-tray）调 `playSound('shop_drag_unbind')`

8. **AC8：抽屉打开音效**
   - `openDrawer(kind)` 内 / 调用方调 `playSound('shop_drawer_open')`
   - 跳过条件：`!shouldPlayShopSound()`

9. **AC9：SUBMIT 红章音效复审**
   - 60-4 当前用 `playSound('confirm')`，听感不够"重击"。本 story 加 `submit_stamp` profile（如 `[400, 100, 0.18]` 重击下行）并替换。
   - 跳过条件：`!shouldPlayShopSound()`

10. **AC10：单元测试覆盖**
    - 扩 `tests/unit/core/UserSettings.test.ts`：shopSound 字段默认 / 持久化 / 老存档兼容（4-5 用例）
    - 扩 `tests/unit/core/UserSettings.test.ts`：`shouldPlayShopSound` helper（settings true/false 直接对应返回值，3 用例）
    - 新建 `tests/unit/ui/shopPreviewSounds.test.ts`：
      - **a)** BUY skill 成功 → `playSound('shop_buy_ok')` 被调
      - **b)** BUY skill inbox 满 → `playSound('shop_buy_err')` 被调
      - **c)** BUY relic 余额不足（cmdBuy err 路径）→ `shop_buy_err`
      - **d)** terminal 键击 → `shop_kbd_click`
      - **e)** terminal Enter → `shop_kbd_enter`
      - **f)** shopSound=false → 任意路径 0 调用 playSound（spy 验证）
      - **g)** dragManager.onDragStart → `shop_drag_pickup`
      - **h)** bindSkillToKey → `shop_drag_drop`
      - **i)** unbindSkillFromKey → `shop_drag_unbind`
      - **j)** openDrawer → `shop_drawer_open`

11. **AC11：Story 60.x ecosystem 不退化** —— 全套绿（含新 sound 测试）

12. **AC12：tsc 0 新错误 + 现有 cmdSell / cmdReshuffle 等已有 playSound 调用不动** —— sound.ts / SOUND_PROFILES 是 superset 扩展，向后兼容；Classic shop 的 `playSound('buy')` / `'click'` / `'warning'` 继续工作。

## Tasks / Subtasks

- [x] **Task 1：SOUND_PROFILES 扩展（AC: 4）**
  - [x] 1.1 `core/constants.ts:SOUND_PROFILES` 加 8 个新 entry（详 AC4 数值）
  - [x] 1.2 同时加 `submit_stamp` profile 给 60-4 SUBMIT 用（AC9）

- [x] **Task 2：UserSettings shopSound + shouldPlayShopSound（AC: 1, 2）**
  - [x] 2.1 `core/UserSettings.ts` interface 加 `shopSound: boolean`
  - [x] 2.2 DEFAULTS 加 `shopSound: true`
  - [x] 2.3 export `function shouldPlayShopSound(): boolean { return getSettings().shopSound }`

- [x] **Task 3：SettingsPanel Shop Sound 行（AC: 3）**
  - [x] 3.1 在 Shop Animations 行下加新行
  - [x] 3.2 i18n keys：`settings.shopSound` / `.on` / `.off`（zh + en）
  - [x] 3.3 click handler `data-shop-sound`（参考 60-11 模板）

- [x] **Task 4：terminal 键击 + Enter 音效（AC: 5）**
  - [x] 4.1 `shopPreview.ts:onKey`（行 1680 附近）`e.key.length === 1` 路径加 `if (shouldPlayShopSound()) playSound('shop_kbd_click')`
  - [x] 4.2 `e.key === 'Enter'` 路径加 `playSound('shop_kbd_enter')`

- [x] **Task 5：BUY 确认 / 拒绝音效（AC: 6）**
  - [x] 5.1 `executeBuySkill` 成功末端（与 whoosh 同处）+ `executeBuyRelic` 成功 + `executeBuyPackDirect` + `finalizePackPick` 加 `shop_buy_ok`
  - [x] 5.2 `executeBuySkill` inbox 满 + `executeBuyRelic` 槽满/已拥有 + `cmdBuy` 各 ERR 分支加 `shop_buy_err`

- [x] **Task 6：工作台拖拽 3 类音效（AC: 7）**
  - [x] 6.1 `enterTerminalShop` 内 `dragManager.onDragStart` 既有 hook（60-9）加一行 `playSound('shop_drag_pickup')`
  - [x] 6.2 `bindSkillToKey` 末端加 `shop_drag_drop`
  - [x] 6.3 `unbindSkillFromKey` 末端加 `shop_drag_unbind`

- [x] **Task 7：抽屉 + SUBMIT 音效（AC: 8, 9）**
  - [x] 7.1 `openDrawer(kind)` 内加 `shop_drawer_open`
  - [x] 7.2 `executeSubmitTransition` / `triggerSubmit` 红章动画启动处把 `playSound('confirm')` 替换为 `playSound('submit_stamp')`

- [x] **Task 8：单元测试（AC: 10）**
  - [x] 8.1 扩 `tests/unit/core/UserSettings.test.ts` 加 shopSound 字段 + shouldPlayShopSound 测试（参考 60-11 模式）
  - [x] 8.2 新建 `tests/unit/ui/shopPreviewSounds.test.ts`，~250 行
  - [x] 8.3 vi.mock effects/sound 让 playSound 是 spy；通过 spy.mock.calls 验证调用类型
  - [x] 8.4 10 用例覆盖（详 AC10 a-j）

- [x] **Task 9：tsc + 全套测试（AC: 11, 12）**
  - [x] 9.1 `cd src && npx tsc --noEmit -p .` → 0 新错误
  - [x] 9.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher tests/unit/systems/tutorial` → 全绿

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| 音效播放 | `src/src/effects/sound.ts:226` | `playSound(type)` |
| 声音 profiles | `src/src/core/constants.ts:181 SOUND_PROFILES` | `[startFreq, endFreq, volume]` |
| 主音量 | `src/src/effects/sound.ts:221 setMasterVolume` | 现有 |
| 设置存取 | `src/src/core/UserSettings.ts` | `getSettings()` · `updateSettings()` · 加 `shouldPlayShopSound()` |
| Settings UI | `src/src/ui/SettingsPanel.ts` | 加新切换行 |
| terminal 键盘 | `src/src/ui/shopPreview.ts:onKey` (~1612) | 加 kbd 音效 hook |
| BUY 路径 | `src/src/ui/shopPreview.ts:executeBuySkill / Pack / Relic / cmdBuy` | 加 buy_ok / buy_err |
| 拖拽 | `src/src/ui/shopPreview.ts:bindSkillToKey / unbindSkillFromKey` + `dragManager.onDragStart` | 加 drag 三音 |
| 抽屉 | `src/src/ui/shopPreview.ts:openDrawer` | 加 drawer_open |
| SUBMIT | `src/src/ui/shopPreview.ts:executeSubmitTransition` / `triggerSubmit` | 替换 confirm → submit_stamp |
| i18n | `src/src/demo/demo-i18n.ts` | 加 settings.shopSound 系列 key |

### Architecture Compliance

**Dependency direction：** ui/shopPreview → effects/sound → core/constants（已有依赖链）+ ui/shopPreview → core/UserSettings（已有）✓

**State write rules：**
- ✅ shopSound 写走 `updateSettings`（持久化 localStorage）
- ✅ playSound 是无副作用调用 / 0 状态写入
- ✅ shouldPlayShopSound 实时读取 settings（不缓存）

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock effects/sound
- **零新依赖**（既有 Web Audio oscillator，无 audio file 资源）

### File Structure Requirements

```
src/src/core/constants.ts                ← 修改：SOUND_PROFILES 加 9 entry（8 shop + 1 submit_stamp）
src/src/core/UserSettings.ts             ← 修改：shopSound 字段 + shouldPlayShopSound helper
src/src/ui/SettingsPanel.ts              ← 修改：加 Shop Sound 切换行 + click handler
src/src/demo/demo-i18n.ts                ← 修改：zh + en 各加 3 key
src/src/ui/shopPreview.ts                ← 修改：terminal/drag/buy/drawer/submit 7 处加 playSound 调用
src/tests/unit/core/UserSettings.test.ts ← 修改：扩 shopSound + shouldPlayShopSound 测试
src/tests/unit/ui/shopPreviewSounds.test.ts ← 新增：~250 行 / 10 用例
```

**避免：**
- 不要新增 audio file 资源 — 复用既有 oscillator 合成
- 不要在 hover tooltip / 单字符滚动加 playSound（噪音浪潮）
- 不要把 sound 拆 module —— 全 profile 留 SOUND_PROFILES 单表
- 不要在测试里真的初始化 Web Audio context — vi.mock effects/sound 把 playSound 替换为 spy

### Testing Requirements

| 用例 | 验证 | mock |
|---|---|---|
| BUY skill 成功 | playSound('shop_buy_ok') | spy on playSound |
| BUY skill inbox 满 | playSound('shop_buy_err') | 同上 |
| cmdBuy 余额不足 | playSound('shop_buy_err') | 同上 |
| terminal 键击 | playSound('shop_kbd_click') | 同上 + 触发 keydown |
| terminal Enter | playSound('shop_kbd_enter') | 同上 |
| shopSound=false | playSound 全部 0 调用 | settings update + spy |
| drag pickup/drop/unbind | 3 类调用 | dragManager 触发 |
| drawer open | playSound('shop_drawer_open') | openDrawer |

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.11 shouldAnimateShop helper 模式 | 本 story shouldPlayShopSound 同模式 |
| 60.11 SettingsPanel 切换行模板 | 本 story 复用 |
| 60.11 SOUND_PROFILES 已有 buy/click/warning | 本 story 加新前缀 shop_* 避免冲突 classic |
| 60.x ecosystem cd src 跑 vitest | 本 story 同样 |
| 60.5 vi.mock UserSettings | 本 story 同样测 shopSound |
| 60.7 vi.mock effects/sound | 本 story 复用 mock 模式 + spy 验证 calls |

### Git Intelligence Summary

```
601e1c6 feat(shop): transition animations (BUY whoosh + CRT flicker + RESHUFFLE print) (Story 60.11)
9cc5732 feat(shop): INF supports owned skills/relics by key/name/relic-id (Story 60.10)
4763566 feat(workbench): hover tooltips for keys + IN-tray + relic row (Story 60.9)
```

**本 story 推荐 commit message：** `feat(shop): terminal/workbench sound effects layer (Story 60.12)`

### Risks & Open Questions

- **风险 A：terminal 键击每个字母都 playSound 让用户连续打字时音频堆叠 / 爆音** —— 缓解：`SOUND_PROFILES.shop_kbd_click` 用低 volume（0.04）+ Web Audio oscillator 自带 envelope 不会爆音 + 短 duration（~ms 级，不像 type 三层叠音）。
- **风险 B：BUY 成功路径 + whoosh 动画同时触发，音 + 视觉协同？** —— 时序对齐：whoosh 是 250ms，shop_buy_ok 几十 ms 内完成。同步触发观感是"buy → 音 → 卡片飞入"，正好。
- **风险 C：dragManager.onDragStart 在 60-9 已有覆盖（设 keyTooltip.hide / hideRelicTooltip）—— 本 story 必须 chain 不能 overwrite** —— 缓解：把 onDragStart 替换为 lambda 包含 hideKeyTooltip + hideRelicTooltip + playSound 三件事。
- **风险 D：测试环境无 audio context** —— 缓解：`vi.mock('effects/sound', () => ({ playSound: vi.fn() }))` 已是 60.x 标准模式。
- **开放问题 1：shopSound=false 是否影响 Classic shop？** Classic shop 调用 `playSound('buy')` 等老 profile —— 本 story 不包它。`shouldPlayShopSound` 仅守卫 terminal/workbench 路径的新 playSound 调用。Classic 仍走 `masterVolume` 主开关。
- **开放问题 2：`submit_stamp` 替换 60-4 的 `confirm` 是否破坏 60-4 测试？** 60-4 现有测试用 `vi.mock('effects/sound')` 把 playSound 弱 mock 不验证具体类型 —— 应该兼容。**应当确认运行测试套不破。**

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-12] — 验收原文
- [Source: src/src/effects/sound.ts:181-204 SOUND_PROFILES] — 现有 profile 表
- [Source: src/src/effects/sound.ts:226 playSound] — 播放接口
- [Source: src/src/ui/shopPreview.ts:onKey ~1610] — terminal 键盘处理入口
- [Source: src/src/ui/shopPreview.ts:executeBuySkill / executeBuyRelic / cmdBuy] — BUY 路径
- [Source: src/src/ui/shopPreview.ts:bindSkillToKey / unbindSkillFromKey / dragManager.onDragStart] — 拖拽入口
- [Source: src/src/ui/shopPreview.ts:openDrawer] — 抽屉
- [Source: src/src/core/UserSettings.ts shouldAnimateShop] — 60-11 helper 模板
- [Source: docs/implementation-artifacts/60-11-transition-animations.md] — 上一 P2.3 story（settings + helper + i18n 模板）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成全部 9 个 task
- 抽 `sfx(type)` 内部 helper 包装 `if (shouldPlayShopSound()) playSound(type)` — shopPreview 内 14 处调用复用
- BUY 各 err 路径统一加 sfx 守门：cmdBuy 未知 SKU / clearance / 余额不足 / inbox 满 / relic 已拥有 / 槽满
- BUY 各成功路径加 sfx：executeBuySkill / executeBuyRelic / executeBuyPackDirect / finalizePackPick
- 拖拽：dragManager.onDragStart 全局 hook chain（与 60-9 hide tooltip + 60-12 pickup 音效合并）；bindSkillToKey/unbindSkillFromKey 末端加音
- SUBMIT：proceedSubmit 入口加 submit_stamp（重击下行），不替换 60-4 已有 confirm 在其它地方的调用
- 测试 fake DOM 需补 `wb-drawer` 的 classList + style（drawer 入场动画 rAF）+ stub requestAnimationFrame；proceedSubmit setTimeout fallback 用 vi.useFakeTimers 防 unstub 后异步 fire
- shopPreview.ts + UserSettings.ts + SettingsPanel.ts + constants.ts tsc 错误数 baseline 持平（2 → 2）
- Story 60.x ecosystem + tutorial: 14 新音效测试 + 7 UserSettings shopSound/shouldPlayShopSound 测试，全绿；总数 292/299（7 baseline tutorial fail 与本 story 无关）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.3 浪漫化第 4 项
- 实施于 2026-04-29，所有 9 个 task 完成；Status: review
- **AC 全覆盖：** AC1（shopSound 字段）/ AC2（shouldPlayShopSound helper）/ AC3（SettingsPanel 切换行 zh+en）/ AC4（9 个新 SOUND_PROFILES）/ AC5（terminal kbd_click + kbd_enter）/ AC6（BUY skill/relic/pack 成功 ok + 各 err 路径 err）/ AC7（drag pickup/drop/unbind 三音）/ AC8（drawer_open）/ AC9（submit_stamp 替换 confirm 在 proceedSubmit）/ AC10（14 + 7 单测）/ AC11（ecosystem 不退化）/ AC12（tsc 0 新错）
- **关键设计决策：**
  1. **`sfx(type)` 内部 helper 减重复代码** — 14 处调用统一 `if (shouldPlayShopSound()) playSound(...)` 模板
  2. **新音效命名 `shop_*` 前缀** — 与 classic shop 老 profile（buy / click / warning）严格隔离
  3. **零文件资源** — 全部走既有 Web Audio oscillator 合成，profile 是 `[startFreq, endFreq, volume]` triplet
  4. **shopSound 与 masterVolume 独立** — masterVolume=0 全静音（含 classic + 战斗），shopSound=false 仅静默 terminal/workbench 新音
  5. **BUY err 各路径单独加 sfx** — 不在 dispatcher 入口集中，因为不同 err（余额不足 / inbox 满 / clearance）应该都触发同一 err 音
- 上一 story 60-11 同日完成
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 4/4 done · P2.3 **4/5 done**（剩 60-13 craft+metamorph stations）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：`shopSound=false → proceedSubmit` 测试组在 beforeEach 加 `__test.resetSubmitting()`，防 `submitting` 模块级 flag 跨 it 泄漏导致测试误报通过；同步在 `SUBMIT 音效` 组也加 reset 让两组都真实测试 shouldPlayShopSound 守卫行为
  - L1-L5 暂不修（cosmetic + 类型重构幅度大 + AC scope 之外 + 已是预期行为）

### File List

新增：
- `src/tests/unit/ui/shopPreviewSounds.test.ts` (~230 行，14 测试用例)

修改：
- `src/src/core/constants.ts` — `SOUND_PROFILES` 加 9 entry（8 shop_* + 1 submit_stamp）
- `src/src/core/UserSettings.ts` — 加 `shopSound: boolean`（默认 true）+ `shouldPlayShopSound()` helper
- `src/src/ui/SettingsPanel.ts` — 加 Shop Sound On/Off 切换行 + click handler
- `src/src/demo/demo-i18n.ts` — zh + en 各加 3 个 key（settings.shopSound / .on / .off）
- `src/src/ui/shopPreview.ts` — import `shouldPlayShopSound` + `playSound`；新增 `sfx(type)` 内部 helper；14 处调用埋点（kbd 2 / BUY ok 3 / BUY err 6 / drag 3 / drawer 1 / submit 1）；`__test` API 加 5 个新入口（bindSkillToKey / unbindSkillFromKey / cmdBuy / openDrawer / proceedSubmit）
- `src/tests/unit/core/UserSettings.test.ts` — 追加 7 用例（shopSound 字段 4 + shouldPlayShopSound helper 3）
- `docs/implementation-artifacts/sprint-status.yaml` — 60-12 ready-for-dev → in-progress → review
