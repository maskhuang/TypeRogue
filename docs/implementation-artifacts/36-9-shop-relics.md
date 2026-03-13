# Story 36.9: 商店系统遗物

Status: review

## Story

As a player,
I want 5 shop system relics that provide price discounts, improved sell values, expanded shop capacity, free item pickups, and time-pressured free refreshes,
so that shop interactions become more strategic with meaningful tradeoffs between economy optimization and risk-taking.

## Acceptance Criteria

1. **AC1 — 折扣卡 (discount_card)**: 所有商品（技能/牌包/遗物）价格 -15%，通过 `getAdjustedPrice()` 统一应用。刷新费用不受影响。

2. **AC2 — 回收专家 (recycle_expert)**: 出售技能时回收价从 50% 提升至 75%（即 `sellPrice = floor(purchasePrice * 0.75)`）。

3. **AC3 — 黑市门票 (black_market)**: 商店商品位从 5 增至 6，额外商品保底稀有（rarity ≥ 1）品质技能。

4. **AC4 — 走私通道 (smuggle_pass)**: 每关商店可免费拿走一件最便宜的商品（任意类型），使用后本关不可再用。需要视觉标记最便宜商品。

5. **AC5 — 限时拍卖 (timed_auction)**: 刷新免费（cost=0），但商店有 30 秒倒计时。倒计时结束自动进入下一关。倒计时 UI 需清晰可见。

6. **AC6 — 走私通道边界测试**: 刷新后最便宜商品变化时免费标记正确更新；已使用后不再标记。限时拍卖倒计时在手动离开时正确清理。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'shop'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`（black_market, smuggle_pass, timed_auction）+ 新增 RelicBehaviorType
  - [x] 1.3 确认图标唯一性（与现有 45 个遗物不冲突）
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（45→50）和各稀有度计数断言
  - [x] 1.5 更新 `relics.slots.test.ts` 中 zeroPriceRelics（timed_auction basePrice=0）

- [x] Task 2: 创建 ShopRelicBehaviors.ts 行为模块 (AC: #1-#5)
  - [x] 2.1 创建 `systems/relics/ShopRelicBehaviors.ts`
  - [x] 2.2 导出常量：`DISCOUNT_RATE = 0.15`、`RECYCLE_BONUS = 0.50`、`BLACK_MARKET_EXTRA = 1`、`AUCTION_TIMER = 30`
  - [x] 2.3 导出 `getDiscountMultiplier(): number` — 有遗物 → 0.85，否则 1
  - [x] 2.4 导出 `getRecycleSellMultiplier(): number` — 有遗物 → 0.75，否则 0.50
  - [x] 2.5 导出 `getBlackMarketExtraSlots(): number` — 有遗物 → 1，否则 0
  - [x] 2.6 模块级 `_smuggleFreeUsed: boolean`（每关商店重置）
  - [x] 2.7 导出 `canSmuggleFree(): boolean` — 有遗物 + 未使用
  - [x] 2.8 导出 `consumeSmuggleFree(): void` — 标记已使用
  - [x] 2.9 导出 `resetSmuggleFree(): void` — 每关重置
  - [x] 2.10 导出 `isTimedAuction(): boolean` — 有遗物
  - [x] 2.11 导出 `resetShopRelicState(): void` — 每关重置（smuggle flag）
  - [x] 2.12 导出 `initShopRelicBehaviors(): void` — 注册行为

- [x] Task 3: 实现折扣卡 (AC: #1)
  - [x] 3.1 在 `shop.ts` 的 `getAdjustedPrice()` 中乘以 `getDiscountMultiplier()`
  - [x] 3.2 折扣在附魔锚点倍率之后应用（先涨后折）
  - [x] 3.3 刷新费用不受折扣影响（`refreshShop()` 不经过 getAdjustedPrice）

- [x] Task 4: 实现回收专家 (AC: #2)
  - [x] 4.1 在 `shop.ts` 的 `sellSkill()` 中用 `getRecycleSellMultiplier()` 替代硬编码 0.5
  - [x] 4.2 `sellPrice = Math.floor(purchasePrice * getRecycleSellMultiplier())`

- [x] Task 5: 实现黑市门票 (AC: #3)
  - [x] 5.1 在 `shop.ts` 的 `openShop()` 中：基础商品数 = `5 + getBlackMarketExtraSlots()`
  - [x] 5.2 在 `refreshShop()` 中同步使用相同基础数
  - [x] 5.3 额外商品位保底稀有品质：`generateShopItems()` 增加 `guaranteeRare` 参数
  - [x] 5.4 `generateShopItems(count, guaranteeRare)` — 当 guaranteeRare 为 true 时，最后商品强制替换为 rarity ≥ 1 技能

- [x] Task 6: 实现走私通道 (AC: #4)
  - [x] 6.1 在 `openShop()` 中调用 `resetShopRelicState()` 重置每关状态
  - [x] 6.2 在 `renderUnifiedShop()` 中：遍历商品找最便宜的，标记 🆓 badge
  - [x] 6.3 在购买逻辑中（`executePurchase` / `purchasePackItem` / `purchaseShopRelicItem`）：如果 `canSmuggleFree()` 且该商品是最便宜的，cost=0 + `consumeSmuggleFree()`
  - [x] 6.4 刷新后重新渲染时更新免费标记（最便宜商品可能变化）
  - [x] 6.5 已使用后不再显示免费标记

- [x] Task 7: 实现限时拍卖 (AC: #5)
  - [x] 7.1 在 `openShop()` 中：`isTimedAuction()` → 启动 30s 倒计时
  - [x] 7.2 倒计时 UI：模块级 `_auctionRemaining` + `renderUnifiedShop()` 每次重建 div
  - [x] 7.3 在 `refreshShop()` 中：`isTimedAuction()` → cost = 0
  - [x] 7.4 倒计时到 0 时：自动触发 "下一关" 按钮逻辑
  - [x] 7.5 手动点击 "下一关" 时清理倒计时 timer（`clearInterval`）
  - [x] 7.6 在 `initShopEvents()` 的 startBattleBtn.onclick 中添加 timer 清理
  - [x] 7.7 模块级 `_auctionTimerId`（ShopRelicBehaviors）+ `_auctionRemaining`（shop.ts）

- [x] Task 8: 注册模块初始化 (AC: #1-#5)
  - [x] 8.1 `initShopRelicBehaviors()` 注册 black_market + smuggle_pass + timed_auction 行为
  - [x] 8.2 `battle.ts` 的 `initInput()` 中调用 `initShopRelicBehaviors()`
  - [x] 8.3 `shop.ts` 的 `openShop()` 中调用 `resetShopRelicState()`
  - [x] 8.4 timer 在 startBattleBtn.onclick 和 onExpire 中清理，不会泄漏

- [x] Task 9: 单元测试 (AC: #1-#6)
  - [x] 9.1 创建 `relics.shop.test.ts`（23 个测试）
  - [x] 9.2 折扣卡：无遗物→1、有遗物→0.85
  - [x] 9.3 回收专家：无遗物→0.50、有遗物→0.75
  - [x] 9.4 黑市门票：无遗物→0、有遗物→1
  - [x] 9.5 走私通道：无遗物→false、有遗物未使用→true、使用后→false、重置后→true
  - [x] 9.6 限时拍卖：无遗物→false、有遗物→true、倒计时递减、到期触发、清理停止
  - [x] 9.7 resetShopRelicState 重置 smuggle flag + timer
  - [x] 9.8 initShopRelicBehaviors 注册行为（≥3）
  - [x] 9.9 折扣+附魔锚点叠加：先涨后折（1.2×0.85≈1.02）

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 — 36.8）：**
- `RelicSubsystem` 已包含 `'shop'`（relics.ts:91）
- `RelicBehaviorType` 需要新增 `'black_market'`、`'smuggle_pass'`、`'timed_auction'`
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（所有遗物走纯函数路线）
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- 45 个遗物已实现（10 职业 + 5×7 通用）

**商店核心流程（shop.ts）：**
```
openShop(_won)
  ├── 金币结算（baseGold=100 + skillGold + relicGold + furnace override）
  ├── state.gold += totalGold
  ├── locked items 保留 + generateShopItems(5 - locked.length)
  ├── state.shop.refreshCount = 0
  ├── renderUnifiedShop() + renderBuildManager() + renderRelicDisplay()
  └── showScreen('shop')

refreshShop()
  ├── cost = (refreshCount + 1) * 5
  ├── word_dealer free refresh check
  ├── locked items 保留 + generateShopItems(5 - locked.length)
  └── renderUnifiedShop()

generateShopItems(count)
  ├── 技能池（affix 生成 + 升级 + 去重）
  ├── 牌包池（word packs）
  ├── 保底 ≥1 技能 + ≥1 牌包
  ├── 遗物（40% 概率，最多 1 个）
  └── 填满到 count 个

sellSkill(skillId)
  ├── sellPrice = floor(purchasePrice / 2)
  ├── state.gold += sellPrice
  ├── 移除绑定 + 技能数据
  └── UI 更新
```

**价格系统（shop.ts）：**
```
getAdjustedPrice(baseCost)
  └── Math.round(baseCost * getEnchantAnchorPriceMultiplier())
      // 附魔锚点：每个已激活附魔 +10% 价格

calculateAffixSkillPrice(rarity, level, fluctuation)
  └── base[rarity] * levelMult * fluctuation
      // W:25 B:50 Y:75 O:100 × (1 + (lv-1)*0.2) × [0.8~1.2]
      // CAP = 100

rollPriceFluctuation() → 0.8 + random() * 0.4
```

⚠️ **折扣卡需要在 getAdjustedPrice 中应用**，这样所有走 getAdjustedPrice 的商品都自动打折。但注意：技能价格在 generateShopItems 中经过 `calculateAffixSkillPrice` 计算后通过 `getAdjustedPrice` 包装，遗物价格也经过 `getAdjustedPrice(relic.basePrice)`。牌包价格同样经过 `getAdjustedPrice(pack.cost)`。确认三类商品价格统一走 getAdjustedPrice。

⚠️ **刷新费用不走 getAdjustedPrice** — `refreshShop()` 直接用 `(refreshCount + 1) * 5`，不受折扣卡影响（符合 AC1 要求）。

⚠️ **走私通道的"最便宜"判定时机** — 应该在 renderUnifiedShop 时动态计算，每次刷新后都更新。免费拿走后要立即消除其他商品的免费标记。

⚠️ **限时拍卖的 timer 泄漏风险** — 必须在以下场景清理 timer：
1. 手动点击"下一关"
2. 倒计时自然到期
3. 异常场景（state.phase 变化）

### 关键设计决策

**1. 折扣卡实现方式：**
- 在 `getAdjustedPrice()` 末尾乘以 `getDiscountMultiplier()`
- 附魔锚点先涨价 → 折扣卡再打折：`Math.round(baseCost * enchantMult * discountMult)`
- 折扣卡 multiplier = 0.85（即 -15%）

**2. 回收专家实现方式：**
- `sellSkill()` 中 `sellPrice = Math.floor(purchasePrice * getRecycleSellMultiplier())`
- 无遗物时 `getRecycleSellMultiplier()` 返回 0.50（当前行为）
- 有遗物时返回 0.75（50% + 50%×0.5 = 75%）

**3. 黑市门票实现方式：**
- 基础商品数 = `5 + getBlackMarketExtraSlots()`
- `openShop()` 和 `refreshShop()` 都用这个值
- 额外 slot 保底稀有：在 `generateShopItems()` 中，如果有黑市门票，最后生成的 1 个技能强制 rarity ≥ 1
- **不改 ShopItem 接口** — 只是 count 从 5 变 6

**4. 走私通道实现方式：**
- 模块级 `_smuggleFreeUsed: boolean`（每关 openShop 时重置）
- `renderUnifiedShop()` 中：计算所有商品的 cost，找最小值，给最便宜的商品加 "🆓 免费" badge
- 购买路径统一检查：如果 `canSmuggleFree()` 且 item.cost 等于最低价 → cost = 0 + `consumeSmuggleFree()`
- 需要在 3 个购买函数（executePurchase / purchasePackItem / purchaseShopRelicItem）中统一处理
- **最简实现**：在外层包装函数中处理免费逻辑，不修改核心购买函数

**5. 限时拍卖实现方式：**
- `openShop()` 中：`isTimedAuction()` → 创建倒计时 UI + 启动 setInterval
- 模块级 `_auctionTimerId: number | null` + `_auctionRemainingSeconds: number`
- 每秒更新倒计时 UI
- 到 0 时调用 startBattleBtn.click()（复用现有"下一关"逻辑）
- `refreshShop()` 中：`isTimedAuction()` → cost = 0（覆盖计算，与 word_dealer 类似）
- **不重置倒计时**：刷新不重置 30 秒（刷新是免费的但不加时间）

**6. 行为文件组织：**
参照 `WordRelicBehaviors.ts`、`ResourceRelicBehaviors.ts` 模式：
- 纯函数导出，调用方在合适位置调用
- 模块级状态用 `_` 前缀
- `initShopRelicBehaviors()` 注册行为
- `resetShopRelicState()` 每关重置

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType |
|---|---|---|---|---|---|---|
| `discount_card` | 折扣卡 | 🏷️ | common | 50 | shop | — |
| `recycle_expert` | 回收专家 | ♻️ | common | 50 | shop | — |
| `black_market` | 黑市门票 | 🎫 | rare | 80 | shop | black_market |
| `smuggle_pass` | 走私通道 | 🕳️ | epic | 120 | shop | smuggle_pass |
| `timed_auction` | 限时拍卖 | ⏳ | legendary | 0 | shop | timed_auction |

注：
- discount_card、recycle_expert 不需 behaviorType（逻辑简单，纯函数直接调用）
- black_market、smuggle_pass、timed_auction 需要 behaviorType（涉及 UI 或状态交互）
- timed_auction basePrice=0（传说级，与 punctuation_liberation、universal_furnace 同）
- 图标唯一性：🏷️♻️🎫🕳️⏳ 均未被现有 45 个遗物使用

### 从 Story 36.2 — 36.8 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由调用方在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **加算合并**: 多个百分比修饰器加算叠加。
3. **relicStates 类型**: 只能存 number 值。
4. **import type**: 纯类型导入必须用 `import type`。
5. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
6. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji。
7. **遗物总数断言**: `relics.test.ts` 中总数（45→50）、各稀有度计数需更新。
8. **zeroPriceRelics**: timed_auction basePrice=0 → `relics.slots.test.ts` 中添加。
9. **RELIC_MODIFIER_DEFS**: 保持为空 `{}`（不使用 pipeline）。
10. **feedback 文本用"秒"不用"s"**: 中文 feedback 约定。
11. **shop.ts 中的全局变量**: shop.ts 使用模块级状态管理（如 refreshCount），新增 timer 变量需同样模块级管理。

### 性能约束

- discount_card: 简单乘法，<0.1ms
- recycle_expert: 简单乘法，<0.1ms
- black_market: 额外生成 1 个商品，影响可忽略
- smuggle_pass: 遍历 5-6 个商品找最便宜，<0.1ms
- timed_auction: setInterval 每秒一次，开销可忽略

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData + 新增 RelicBehaviorType
- `src/src/systems/shop.ts` — getAdjustedPrice: 折扣卡; sellSkill: 回收专家; generateShopItems+openShop+refreshShop: 黑市门票+走私通道; 倒计时 timer: 限时拍卖
- `src/src/systems/battle.ts` — initInput: initShopRelicBehaviors
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 45→50 和各稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 timed_auction

**需新建的文件：**
- `src/src/systems/relics/ShopRelicBehaviors.ts` — 商店子系统行为模块
- `src/tests/unit/systems/relics/relics.shop.test.ts` — 商店遗物测试

### References

- [Source: docs/design/relic-system.md#商店系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.9] — 验收标准和遗物清单
- [Source: docs/implementation-artifacts/36-8-resource-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/shop.ts#getAdjustedPrice] — 价格计算入口（~L498-501）
- [Source: src/src/systems/shop.ts#sellSkill] — 技能出售逻辑（~L1328-1355）
- [Source: src/src/systems/shop.ts#generateShopItems] — 商品生成逻辑（~L515-677）
- [Source: src/src/systems/shop.ts#openShop] — 商店打开流程（~L434-489）
- [Source: src/src/systems/shop.ts#refreshShop] — 刷新逻辑（~L1303-1325）
- [Source: src/src/systems/shop.ts#initShopEvents] — 下一关按钮事件（~L2417-2435）
- [Source: src/src/systems/relics/ResourceRelicBehaviors.ts] — 行为模块参考模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 5 个商店系统遗物全部实现：折扣卡、回收专家、黑市门票、走私通道、限时拍卖
- ShopRelicBehaviors.ts 纯函数行为模块：4 常量 + 12 导出函数
- shop.ts 集成：价格折扣、卖出加成、额外商品位、免费标记、倒计时 UI
- Code Review 修复：倒计时 div 持久化（H1）、guaranteeRare 可靠性（H2）、命名一致性（M2）、中文"秒"（M1）
- 23 个单元测试全部通过

### File List

- `src/src/data/relics.ts` — 新增 5 个 RelicData + black_market/smuggle_pass/timed_auction 到 RelicBehaviorType
- `src/src/systems/relics/ShopRelicBehaviors.ts` — **新建** 商店遗物行为模块
- `src/src/systems/shop.ts` — getAdjustedPrice 折扣、sellSkill 回收、openShop/refreshShop 黑市+走私+拍卖、renderUnifiedShop 免费标记+倒计时
- `src/src/systems/battle.ts` — initInput 添加 initShopRelicBehaviors()
- `src/tests/unit/systems/relics/relics.shop.test.ts` — **新建** 23 个测试
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数 45→50、稀有度计数更新
- `src/tests/unit/systems/relics/relics.slots.test.ts` — zeroPriceRelics 添加 timed_auction
- `docs/implementation-artifacts/sprint-status.yaml` — 36-9 状态更新
