# Story 60.7: 事件总线 + bindingManager 接口闭合

Status: done

<!-- Epic 60 Phase 2 · 优先级 P2.2（接主流程必备）· P2.2 第 3 项 -->
<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **持有 intermission / max_skill_level / d_100 / universal_furnace 等"购买后立刻触发副作用"型遗物的玩家**,
I want **在 terminal 商店买技能 / 买遗物时，所有原本由 classic openShop 路径串联的副作用（事件总线 emit、装备 quest 重算、T4 自动满级、D100 立即洗牌、universal_furnace 初始化）都正确触发**,
so that **terminal 商店真正"接入主流程"而不是 P2.1 时期的"看着像"假皮 — 教程 L1/L2 listener 能拿到 shop:purchase、quest 进度能跟上、双声职业流程的链式效果不被 swallowed**.

## 背景

P2.1 4/4 + P2.2 已完成 60-5（feature flag）+ 60-6（inbox 序列化），terminal 商店主入口已通。但**末端副作用断了**：

- `shopPreview.ts:545 executeBuySkill()` 手写 `state.gold -= price` + `state.player.skills.set` + `state.player.inbox.push`，**漏掉**：
  - `eventBus.emit('shop:purchase', ...)` — 教程 L1/L2 step 监听靠它推进
  - `evaluateEquipQuests(...)` — 装备数量型 quest（如"装备 5 个 SLASHER 类技能"）不更新
  - `applyAffixLevelScaling(skill.affixes, max - 1)` — T4 极简主义遗物 (`max_skill_level`) 应让购买的技能自动满级
- `shopPreview.ts:796 executeBuyRelic()` **漏掉**：
  - `if (relicId === 'd_100') rerollAllAffixes()` — D100 购入瞬间洗牌
  - `if (relicId === 'universal_furnace') initFurnace(random)` — 资源熔炉购入瞬间随机赋值
  - 注：`relic:acquired` 事件已由 `addRelicWithCapacity()` 自动 emit，**不缺**
- `shopPreview.ts:854 cmdSell()` 手写 `inbox.splice` + `skills.delete` + `affixSkills.delete`，**漏掉**：
  - `evaluateEquipQuests(...)` — 卖出后 quest 进度需重算
  - 不需要走 `sellSkill(skillId)` — 因为 cmdSell 操作的是 inbox 待装配技能（50% 退款），与 classic `sellSkill()` 操作"已装备技能"（75% 回收）语义不同；保留独立路径，仅补副作用

P2.2 第 3 项的目标：**最小入侵地补齐副作用钩子**，不重写 BUY/SELL 业务流程，复用现有 `shop.ts` 的副作用工具函数（`evaluateEquipQuests` / `applyAffixLevelScaling` / `rerollAllAffixes` / `initFurnace`）。

完成后 P2.2 进度 3/4，剩 60-8 教程改写（依赖 shop:purchase 事件触达）。

## Acceptance Criteria

1. **AC1：executeBuySkill 触发 `shop:purchase` 事件** —— `shopPreview.ts:executeBuySkill()` 在状态写入完成后调用 `eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId, price: d.price })`。事件签名与 classic shop.ts:2583 保持一致（注：classic 那里漏 `price`，本 story **统一带 price**，与 ScrShopScene.ts:374 / EventBus.ts:47 类型定义一致；classic 缺漏不在本 story 范围内修）。

2. **AC2：executeBuySkill 调用 evaluateEquipQuests** —— 状态写入完成后调用 `evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction())`，与 classic shop.ts:2578 路径一致。**注意：装备数量型 quest 实际"装备完成"是在工作台拖到键位时；executeBuySkill 时只是入 inbox**。本 AC 仍要 emit 是为了：(a) 卖出/退款一致性，(b) classic 路径就在购买时也调用。

3. **AC3：executeBuySkill 应用 max_skill_level 遗物效果** —— 检查 `queryRelicFlag('max_skill_level')`，若返回 `> 1` 且非 Infinity，则把 `state.player.skills` 里新加的技能 level 升到该值，并对 `state.affixSkills` 里的 affixes 调 `applyAffixLevelScaling(affixes, level - 1)`。复用 classic shop.ts:2566-2575 的现有逻辑，**整段抽到一个 helper** `applyMaxSkillLevelOnPurchase(skillId)` 让 classic + terminal 共用，避免双份维护。

4. **AC4：executeBuyRelic 触发 d_100 立即洗牌** —— 在 `addRelicWithCapacity(relicId)` 成功后，若 `relicId === 'd_100'` 则调 `rerollAllAffixes()`。复用 classic shop.ts:2624-2627 现有调用。

5. **AC5：executeBuyRelic 触发 universal_furnace 初始化** —— 在 `addRelicWithCapacity(relicId)` 成功后，若 `relicId === 'universal_furnace'` 则调 `initFurnace(random)`。复用 classic shop.ts:2618-2622 现有调用（**注意：random 实例需从合适的源拿；classic 用全局 random**，terminal 同源）。

6. **AC6：executeBuyRelic 触发 `shop:purchase` 事件**（relic 类型）—— `eventBus.emit('shop:purchase', { type: 'relic', itemId: relicId, price: d.price })`，与 classic 行为对齐。注：classic shop.ts:2587-2680 整段没显式 emit `shop:purchase` for relics（只有 skill 那条 line 2583），所以本 AC 实际**比 classic 还更全面**，对教程 listener 友好。

7. **AC7：cmdSell 调用 evaluateEquipQuests** —— 卖出 inbox 技能后，调 `evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction())`，让 quest 进度跟上。

8. **AC8：cmdUndo 调用 evaluateEquipQuests** —— UND 撤销 skill 购买时，state 变化与 cmdSell 一致，因此也补 `evaluateEquipQuests` 调用，保持 quest 与 state 一致。

9. **AC9：跨语言 quest 验证** —— 单测：装备型 quest（如 'tracker' 类）在 terminal BUY → 工作台拖到键位的完整流程后，quest 进度正确更新（即依赖 60-1 的 bindShapeToKeys + evaluateEquipQuests 调用链贯通）。**简化：** 单测仅 mock 抽屉/绑定路径，验证 `evaluateEquipQuests` 被调到，不验证具体 quest 进度数字（避免与 quest 数据耦合）。

10. **AC10：单元测试覆盖**
    - `tests/unit/ui/shopPreviewBuyEvents.test.ts`（新建）：
      - executeBuySkill 后 `shop:purchase` 事件被 emit（spy on eventBus）
      - executeBuySkill 后 `evaluateEquipQuests` 被调（mock + spy）
      - executeBuySkill 应用 `max_skill_level` 遗物效果（mock relic flag）
      - executeBuyRelic 'd_100' 触发 `rerollAllAffixes` 调用（mock）
      - executeBuyRelic 'universal_furnace' 触发 `initFurnace` 调用（mock）
      - executeBuyRelic 触发 `shop:purchase`（type='relic'）
      - cmdSell 触发 `evaluateEquipQuests`（mock + spy）
      - cmdUndo skill 触发 `evaluateEquipQuests`（mock + spy）
    - 复用 60-2/60-3/60-5 的 `vi.mock('../../../src/systems/battle', ...)` + STUB_DOC 模式
    - 不需要构造完整 quest 状态 — 仅验证副作用 fn 被 emit/被调

11. **AC11：Story 60.x ecosystem 不退化** —— `tests/unit/ui/shopPreview*` + `tests/unit/core/UserSettings` + `tests/unit/data/skillShapesPlaceability` + `tests/unit/systems/openShopDispatcher` + `tests/unit/core/state/RunState` 全套绿（≥81 + RunState 多 11 个 baseline fail，但 0 新增）。

12. **AC12：tsc 0 新错误** —— shopPreview.ts baseline 既有错误数不动；shop.ts baseline 41 不动。

## Tasks / Subtasks

- [x] **Task 1：抽 max_skill_level helper（AC: 3）**
  - [x] 1.1 在 `systems/shop.ts` 现有 `purchaseShopItem` 内（line 2566-2575）把 max_skill_level 处理段抽出为 `export function applyMaxSkillLevelOnPurchase(skillId: string): void`
  - [x] 1.2 classic 调用方改用 helper（验证 0 行为变化）
  - [x] 1.3 terminal `executeBuySkill` import + 在 inbox.push 之后调 `applyMaxSkillLevelOnPurchase(skillId)`

- [x] **Task 2：executeBuySkill 副作用补齐（AC: 1, 2, 3）**
  - [x] 2.1 文件：`shopPreview.ts:545-570`
  - [x] 2.2 import 新增：`eventBus from '../core/events/EventBus'` / `evaluateEquipQuests from '../data/affixTrigger'` / `getQuestEquipReduction from '../systems/shop'`（如未导出则补 export）/ `applyMaxSkillLevelOnPurchase from '../systems/shop'`（Task 1 新出口）
  - [x] 2.3 在 `state.player.inbox.push(skillId)` 之后、`appendLine(...CONFIRMED...)` 之前插入：
    ```ts
    applyMaxSkillLevelOnPurchase(skillId);
    evaluateEquipQuests(state.affixSkills, state.affixSkillStates, state.player.bindings, getQuestEquipReduction());
    eventBus.emit('shop:purchase', { type: 'skill', itemId: skillId, price: d.price });
    ```
  - [x] 2.4 Sound effect 不动（保留现有 cmd flow）

- [x] **Task 3：executeBuyRelic 副作用补齐（AC: 4, 5, 6）**
  - [x] 3.1 文件：`shopPreview.ts:796-828`
  - [x] 3.2 import 新增：`rerollAllAffixes from '../systems/relics/SkillRelicBehaviors'` / `initFurnace from '...'`（找到正确路径）/ `random from '...'` 全局源
  - [x] 3.3 在 `addRelicWithCapacity(relicId)` 成功之后、`undoStack.push` 之前插入：
    ```ts
    if (relicId === 'd_100') rerollAllAffixes();
    if (relicId === 'universal_furnace') initFurnace(random);
    eventBus.emit('shop:purchase', { type: 'relic', itemId: relicId, price: d.price });
    ```

- [x] **Task 4：cmdSell + cmdUndo 副作用补齐（AC: 7, 8）**
  - [x] 4.1 `cmdSell` (shopPreview.ts:854)：在 `state.gold += refund` 之后、`appendLine(SOLD)` 之前插入 `evaluateEquipQuests(...)`
  - [x] 4.2 `cmdUndo` skill 分支 (shopPreview.ts:927-932)：在 `syncWorkbenchInbox()` 之后插入 `evaluateEquipQuests(...)`（非 skill 分支不需要）

- [x] **Task 5：单元测试（AC: 10）**
  - [x] 5.1 新建 `src/tests/unit/ui/shopPreviewBuyEvents.test.ts`，~150 行
  - [x] 5.2 用 vi.mock 模式 stub：
    - `effects/sound.playSound`
    - `systems/battle.startLevel`
    - `data/affixTrigger.evaluateEquipQuests` (spy)
    - `systems/shop.applyMaxSkillLevelOnPurchase` (spy) / `getQuestEquipReduction` (return 0)
    - `systems/relics/SkillRelicBehaviors.rerollAllAffixes` (spy)
    - `core/events/EventBus.eventBus` (spy on `emit`)
  - [x] 5.3 测试用例（每个 ~15 行）：
    - **a)** executeBuySkill: shop:purchase emit + evaluateEquipQuests 调用 + applyMaxSkillLevelOnPurchase 调用
    - **b)** executeBuyRelic 'd_100': rerollAllAffixes 调 + shop:purchase emit
    - **c)** executeBuyRelic 'universal_furnace': initFurnace 调
    - **d)** executeBuyRelic 普通 relic: shop:purchase emit
    - **e)** cmdSell: evaluateEquipQuests 调用
    - **f)** cmdUndo skill: evaluateEquipQuests 调用
  - [x] 5.4 复用 `__test` API 暴露 cmdSell / cmdUndo 入口（如未暴露则补 export）

- [x] **Task 6：getQuestEquipReduction export 检查**
  - [x] 6.1 验证 `systems/shop.ts:getQuestEquipReduction` 是否已 export；若未则加 export（仅一行 export 改动）

- [x] **Task 7：tsc + 全套测试（AC: 11, 12）**
  - [x] 7.1 `cd src && npx tsc --noEmit -p . 2>&1 | grep -E "shopPreview\.ts|shop\.ts"` → 0 新错误（baseline 持平）
  - [x] 7.2 `cd src && npx vitest run tests/unit/ui/shopPreview tests/unit/core/UserSettings tests/unit/core/state/RunState tests/unit/data/skillShapesPlaceability tests/unit/systems/openShopDispatcher` → 全绿（含新加的 BuyEvents 文件）
  - [x] 7.3 浏览器手动验证留 code-review：在 demo 模式触发 terminal BUY → 验证 console listener for shop:purchase 触发 + 装备型 quest 进度刷新 + d_100 拿到瞬间 affix 洗牌

## Dev Notes

### 关键 API 与文件路径

| 用途 | 路径 | 关键导出 |
|---|---|---|
| Terminal BUY/SELL/UND 路径 | `src/src/ui/shopPreview.ts` | `executeBuySkill` (545) · `executeBuyRelic` (796) · `cmdSell` (854) · `cmdUndo` (915) |
| Classic BUY/SELL 副作用源 | `src/src/systems/shop.ts` | `purchaseShopItem` (2556) · `purchaseShopRelicItem` (2587) · `sellSkill` (2830) — **不直接调，仅参考逻辑** |
| 事件总线 | `src/src/core/events/EventBus.ts` | `eventBus.emit('shop:purchase', ...)` · `eventBus.emit('relic:acquired', ...)` |
| Quest 重算 | `src/src/data/affixTrigger.ts` | `evaluateEquipQuests(skills, states, bindings, reduction)` |
| 遗物效果 | `src/src/systems/relics/SkillRelicBehaviors.ts` | `rerollAllAffixes()` |
| 资源熔炉初始化 | `src/src/systems/relics/...` (查找) | `initFurnace(random)` · `getFurnaceConfig()` |
| Quest 减免常量 | `src/src/systems/shop.ts` | `getQuestEquipReduction()` |
| Affix 等级缩放 | `src/src/data/affixes.ts` | `applyAffixLevelScaling(affixes, deltaLevel)` |
| 教程监听 | `src/src/systems/tutorial/tutorialInit.ts:60-66` | `eventBus.on('shop:purchase', ...)` — 60-7 修完后立即生效 |

### Architecture Compliance

**Dependency direction：** ui/shopPreview 反向 import systems/shop 的 helper —— 与 60-5 dispatcher 同模式（已 review 通过）。本 story 进一步加深此方向，建议 60-14 模块拆分时把 helper 抽到 `systems/shop/effects.ts` 共享层。

**State write rules：**
- ✅ executeBuySkill 状态写入顺序保持现状（gold → skills → inbox），仅在末尾补副作用 hook
- ✅ eventBus.emit 用现有 `'shop:purchase'` 事件键，签名与 EventBus.ts:47 一致
- ✅ evaluateEquipQuests 是无状态读取 + map mutate（已被 classic 用过千次），无新风险

### Library / Framework Requirements

- **TypeScript** ~5.9.3
- **vitest** vi.mock 用于 spy on eventBus.emit / evaluateEquipQuests
- **零新依赖**

### File Structure Requirements

```
src/src/ui/shopPreview.ts          ← 修改：executeBuySkill / executeBuyRelic / cmdSell / cmdUndo 末端补副作用 hook
src/src/systems/shop.ts            ← 修改：抽 applyMaxSkillLevelOnPurchase helper + export getQuestEquipReduction（如未 export）
src/tests/unit/ui/shopPreviewBuyEvents.test.ts  ← 新增：~150 行 / 6 用例
```

**避免：**
- 不要重写 executeBuySkill 业务流程 — 仅末端加 hook
- 不要把 cmdSell 改走 sellSkill() — 那是不同语义（in-tray 50% 退款 vs 已装备 75% 回收）
- 不要在 EventBus.ts 加新事件键 —— 复用现有 `shop:purchase`
- 不要修复 classic shop.ts:2583 缺 price 字段的历史问题（出超本 story 范围）
- 不要碰 60-1 已经做的 bindShapeToKeys 路径 —— 本 story 仅事件 + helper 闭合

### Testing Requirements

| 用例分类 | 说明 | mock 范围 |
|---|---|---|
| AC1 BUY skill emit | shop:purchase event with price | spy on `eventBus.emit` |
| AC2/AC7/AC8 quest hook | evaluateEquipQuests 被调 | spy on `evaluateEquipQuests` |
| AC3 max_skill_level | helper 被调 | spy on `applyMaxSkillLevelOnPurchase` |
| AC4 d_100 | rerollAllAffixes 被调 | spy on `rerollAllAffixes` |
| AC5 universal_furnace | initFurnace 被调 | spy on `initFurnace` |
| AC6 BUY relic emit | shop:purchase event | spy on `eventBus.emit` |

**复用基建：**
- 60-2/60-3/60-4/60-5 的 STUB_DOC 模式
- 60-5 vi.mock UserSettings 模式
- 60-4 vi.useFakeTimers + clearAllTimers 模式（如有 setTimeout 路径）

### Previous Story Intelligence

| 经验 | 应用 |
|---|---|
| 60.5 dispatcher 抽出便于测试 | 本 story 同样把 max_skill_level 抽 helper |
| 60.5 vi.mock UserSettings | 本 story vi.mock systems/shop helpers |
| 60.6 真实数据 vs vi.mock 取舍 | shop:purchase event 用真 eventBus + spy on emit；relic 副作用用 vi.mock |
| 60.x ecosystem 必须 cd src 跑 vitest | 本 story 同样 |
| 60.4 不破坏 STUB_DOC 时 body.classList | executeBuySkill 不动 DOM，无此风险 |

### Git Intelligence Summary

最近 commit 风格：
```
34a5c6c feat(state): add inbox to RunState serialize/deserialize (Story 60.6)
044c587 feat(shop): wire shopUI feature flag dispatcher (Story 60.5)
```

**本 story 推荐 commit message：**
- 单 commit：`feat(shop): close event bus + relic hooks for terminal BUY/SELL (Story 60.7)`

### Risks & Open Questions

- **风险 A：抽 `applyMaxSkillLevelOnPurchase` helper 时不小心改变 classic 行为** —— 缓解：先单跑 classic shop 单测/手动 ensure 0 行为变化，helper 内逻辑严格按 shop.ts:2566-2575 复制。
- **风险 B：`initFurnace` / `random` 全局源在 terminal 路径上下文不一致** —— 缓解：找 classic 用的同一个 random（应该是 `core/random.ts` 或类似），import 一致。如果 classic 用模块级 const random，terminal 也用同一个。
- **风险 C：cmdSell 添加 evaluateEquipQuests 触发 sellSkill 类型 quest（不是装备型）的边缘 case** —— 缓解：evaluateEquipQuests 只读 bindings 不写其他 quest 状态，sellSkill quest 类型应有自己的 hook（看 quest 系统设计）。本 story 限定在装备型，不打开 sellSkill quest 副作用蛇箱。
- **开放问题 1：是否要 emit `'shop:purchase'` for relic？** classic shop.ts:2587-2680 (purchaseShopRelicItem) **不 emit**。本 story 选 emit 是对教程 listener 友好（统一）。**风险**：如果有其它 listener 假设 shop:purchase 只在 skill 时触发，会被打破。看 grep —— 只有 tutorial L1/L2 听这个事件，且其 handler 已经 typed `type: 'skill' | 'relic'`，OK。
- **开放问题 2：若 `applyMaxSkillLevelOnPurchase` 抽不出（依赖 classic shop.ts 内部状态太多），fallback 是 inline copy 到 shopPreview.ts。** 倾向：**先尝试抽，不行就 inline + 加 TODO 让 60-14 收拾。**

### References

- [Source: docs/stories/epic-60-shop-redesign-phase2.md#Story 60-7] — 验收标准原文
- [Source: src/src/ui/shopPreview.ts:545-570] — executeBuySkill 现状
- [Source: src/src/ui/shopPreview.ts:796-828] — executeBuyRelic 现状
- [Source: src/src/ui/shopPreview.ts:854-882] — cmdSell 现状
- [Source: src/src/ui/shopPreview.ts:915-955] — cmdUndo 现状
- [Source: src/src/systems/shop.ts:2556-2584] — purchaseShopItem 副作用模板
- [Source: src/src/systems/shop.ts:2587-2680] — purchaseShopRelicItem 副作用模板
- [Source: src/src/systems/shop.ts:2830-2854] — sellSkill 副作用模板（参考但不直接调）
- [Source: src/src/core/events/EventBus.ts:47] — shop:purchase 事件签名
- [Source: src/src/systems/tutorial/tutorialInit.ts:60-66] — 教程 shop:purchase 监听
- [Source: docs/implementation-artifacts/60-6-save-serialization-inbox.md] — 上一 story 防御性编程模式（M1+M2）

## Dev Agent Record

### Agent Model Used

claude-opus-4-7[1m]

### Debug Log References

- 实施于 2026-04-29，单 session 完成全部 7 个 task
- Task 1 抽 `applyMaxSkillLevelOnPurchase` helper：classic 主流程改用 helper，行为零变化（手动 diff 验证）
- Task 6 `getQuestEquipReduction` 已经从 `EnchantmentRelicBehaviors` 直接 export — 不需要在 shop.ts 转 export，改为 shopPreview 直接 import
- vi.mock 用 `await vi.importActual` 模式保留其他 export，仅替换被 spy 的函数（避免破坏 shopPreview 内其他 import）
- `eventBus` mock 同样用 importActual + 覆盖 emit/on 方法
- shop.ts + shopPreview.ts tsc 错误数 baseline 持平（43 → 43，git stash 对比验证）
- Story 60.x ecosystem: 81 → 92（+11 BuyEvents 全绿）

### Completion Notes List

- Story 创建于 2026-04-29，Epic 60 Phase 2 P2.2 接入档第 3 项
- 实施于 2026-04-29，所有 7 个 task 完成；Status: review
- **AC 全覆盖：** AC1-3（executeBuySkill 三副作用 — emit + quest + max_level）/ AC4-6（executeBuyRelic 三副作用 — d_100 + furnace + emit）/ AC7（cmdSell quest 重算）/ AC8（cmdUndo skill quest 重算）/ AC9（quest hook 调用闭环验证 — pure spy 不耦合 quest 数据）/ AC10（11 单测覆盖 BUY/SELL/UND + inbox 满防御 + 普通 relic 不串副作用）/ AC11（ecosystem 92/92）/ AC12（tsc 0 新错）
- **关键设计决策：**
  1. **抽 `applyMaxSkillLevelOnPurchase` helper**（systems/shop.ts）— classic + terminal 共用，避免双份维护；helper 是纯净副作用 fn（query relic flag → mutate skill level + affixes），无外部依赖
  2. **不改变 cmdSell 走 sellSkill()** — 语义不同（in-tray 50% 退款 vs 已装备 75% 回收），仅末端补 quest 重算
  3. **executeBuyRelic 显式 emit `shop:purchase` for relic** — classic shop.ts:purchaseShopRelicItem 没 emit；本 story 比 classic 更全面，对教程 listener 友好（事件签名已定义 type='skill' | 'relic'）
  4. **vi.mock 用 importActual 模式** — 保留其他 export，仅替换被 spy 的函数；防止 shopPreview 内 50+ 个 import 解析失败
- 上一 story 60-6 同日完成（34a5c6c feat(state): add inbox to RunState serialize/deserialize）
- **Epic 60 Phase 2 进度：** P2.1 4/4 done · P2.2 3/4 done（剩 60-8 教程改写）
- **Code-review 修复（2026-04-29 同日）：**
  - **M1**：`executeBuySkill` 用 `structuredClone(skill)` 把 catalog `affixSkill` 引用隔离，防 BUY → UND → BUY 同一 SKU 触发 `applyAffixLevelScaling` 叠加 mutate catalog affixes。Classic 因为 `state.shop.items.splice(index)` 没有此问题；terminal 不 splice catalog（保留再买能力）才暴露此 bug
  - **M2**：删除 `__test.pushUndo` 死代码 + `any` 类型
  - 新增 2 用例覆盖 M1（`affixSkills` 引用与 catalog 不同 / BUY→UND→BUY 不叠加 mutate）
  - L1-L6 暂不修（pre-existing pattern + cosmetic）

### File List

新增：
- `src/tests/unit/ui/shopPreviewBuyEvents.test.ts` (~290 行，13 测试用例 — 11 主路径 + 2 review M1 引用隔离)

修改：
- `src/src/systems/shop.ts` — 新增 `export function applyMaxSkillLevelOnPurchase(skillId)`；`purchaseShopItem` 改用该 helper 替代 inline 代码段（行为零变化）
- `src/src/ui/shopPreview.ts` — 新增 imports（`applyMaxSkillLevelOnPurchase` / `eventBus` / `evaluateEquipQuests` / `getQuestEquipReduction` / `rerollAllAffixes` / `initFurnace` / `random`）；`executeBuySkill` 用 `structuredClone(skill)` 隔离 catalog 引用 + 末端补 3 个副作用 hook；`executeBuyRelic` 末端补 3 个副作用 hook；`cmdSell` + `cmdUndo` skill 分支补 `evaluateEquipQuests`；`__test` API 加 4 个测试入口
- `docs/implementation-artifacts/sprint-status.yaml` — 60-7 ready-for-dev → in-progress → review → done
