# Story 25.4: 稀有货架商店

Status: ready-for-dev

## Story

As a 玩家,
I want 高周目解锁更稀有的商店商品货架，物价不变,
so that 我在无尽模式中有「再推一个周目说不定能刷到那个」的期待感，成长速度能追赶三维难度攀升.

## Acceptance Criteria

1. **AC1: Tier 分层商品池** — 商店商品池根据周目数扩展：
   - Tier 1（周目 1-∞）：当前商品池（稀有度概率 [0.40, 0.30, 0.20, 0.10]）
   - Tier 2（周目 2+）：稀有度概率偏移 [0.20, 0.25, 0.30, 0.25]，更多高稀有度技能
   - Tier 3（周目 4+）：稀有度概率偏移 [0.05, 0.15, 0.30, 0.50]，大量传说级技能
2. **AC2: Tier 货架分配** — 5 个商品位中，Tier 2/3 货架各占 1 位（若已解锁），其余为 Tier 1
3. **AC3: 物价不变** — 价格体系不随周目/Tier 变化（`calculateAffixSkillPrice` 不改）
4. **AC4: 视觉标识** — Tier 2 商品有银色边框，Tier 3 商品有金色边框
5. **AC5: 数据可配置** — Tier 阈值、概率表、货架分配均为常量，方便后续调优
6. **AC6: 种子兼容** — 所有随机（Tier 内稀有度 roll、商品生成）使用 `random()`（非 `Math.random`），确保每日种子一致性

## Tasks / Subtasks

- [ ] Task 1: 定义 Tier 配置常量 (AC: #1, #5)
  - [ ] 1.1 在 `shop.ts` 顶部新增 `SHOP_TIER_CONFIG` 常量：Tier 阈值 + 稀有度概率表
  - [ ] 1.2 新增 `getTierForCycle(cycle): number` 函数（返回最高已解锁 Tier: 1/2/3）
  - [ ] 1.3 新增 `getTierRarityProbabilities(tier): [number, number, number, number]` 函数
- [ ] Task 2: 实现 Tier 感知的商品生成 (AC: #1, #2, #6)
  - [ ] 2.1 新增 `rollRarityForTier(tier, maxRarity)` 函数（按 Tier 概率表 roll 稀有度，受 actMaxRarity 上限约束）
  - [ ] 2.2 修改 `generateAffixShopItem()` 接受可选 `tier` 参数，使用 `rollRarityForTier` 替代 `rollRarity`
  - [ ] 2.3 修改 `generateShopItems()` 分配 Tier 货架：
    - 周目 4+: 1 个 Tier 3 + 1 个 Tier 2 + 3 个 Tier 1
    - 周目 2-3: 1 个 Tier 2 + 4 个 Tier 1
    - 周目 1: 5 个 Tier 1
  - [ ] 2.4 保证 Tier 2/3 的技能商品至少为 rarity ≥ 1（蓝以上）
- [ ] Task 3: 商品 UI 视觉标识 (AC: #4)
  - [ ] 3.1 在 `ShopItem` 接口中新增 `tier?: number` 字段
  - [ ] 3.2 商品生成时写入 tier 值
  - [ ] 3.3 商品卡片渲染时，根据 tier 添加 CSS class: `shop-item-tier2`（银边）/ `shop-item-tier3`（金边）
  - [ ] 3.4 在 `style.css` 新增 Tier 边框样式
- [ ] Task 4: 单元测试 (AC: #1~#6)
  - [ ] 4.1 测试 `getTierForCycle` 正确映射周目到 Tier
  - [ ] 4.2 测试 `rollRarityForTier` 各 Tier 概率分布（1000+ 样本，比例近似）
  - [ ] 4.3 测试 `generateShopItems` 在周目 1/2/4 时 Tier 货架分配正确
  - [ ] 4.4 测试 Tier 2/3 商品 rarity ≥ 1 保底
  - [ ] 4.5 测试价格不随 Tier 变化
  - [ ] 4.6 测试 ShopItem.tier 字段正确传播

## Dev Notes

### 关键设计决策

**Tier 概率表设计**：三级概率表为无尽模式提供渐进式奖励感：
- Tier 1: `[0.40, 0.30, 0.20, 0.10]` — 与当前完全一致
- Tier 2: `[0.20, 0.25, 0.30, 0.25]` — 传说级概率从 10% → 25%
- Tier 3: `[0.05, 0.15, 0.30, 0.50]` — 传说级概率 50%，白装几乎消失

**货架分配策略**：5 个商品中高 Tier 最多 2 个（Tier 3 + Tier 2 各 1），避免高周目商店全是传说导致策略性降低。剩余 3 个始终从 Tier 1 生成，保持构筑平衡。

**不改 `rollRarity()`**：全局 `RARITY_PROBABILITIES` 和 `rollRarity()` 保持不变（其他系统依赖），新增 `rollRarityForTier()` 仅用于商店 Tier 货架。

**物价不变**：`calculateAffixSkillPrice(rarity, level, fluctuation)` 完全不改。高 Tier 商品只是更容易出现高稀有度，价格仍由稀有度决定。传说级技能 100 金，无论 Tier。

### 现有代码关键引用

| 文件 | 位置 | 关键内容 | 需修改 |
|------|------|----------|--------|
| `src/src/systems/shop.ts:104-111` | `getActMaxRarity()` | 周目≥2 解锁 rarity 3 | 不改 |
| `src/src/systems/shop.ts:144-224` | `generateAffixShopItem()` | 单个技能商品生成 | 是：添加 tier 参数 |
| `src/src/systems/shop.ts:227-275` | `generateAffixShopItems()` | 批量技能生成+保底 | 是：Tier 感知 |
| `src/src/systems/shop.ts:710-871` | `generateShopItems()` | 5 商品 slot 分配 | 是：Tier 货架分配 |
| `src/src/systems/shop.ts:65-80` | `calculateAffixSkillPrice()` | 价格计算 | 不改 |
| `src/src/systems/shop.ts:763-797` | 升级保底逻辑 | cycle 缩放 | 不改 |
| `src/src/systems/shop.ts:628-632` | 商店标题显示 cycle | UI | 不改 |
| `src/src/data/skillGeneration.ts:48-57` | `rollRarity()` | 全局稀有度 roll | 不改 |
| `src/src/data/affixes.ts:386` | `RARITY_PROBABILITIES` | 全局概率表 | 不改 |
| `src/src/core/types.ts:241-251` | `ShopItem` 接口 | 商品数据结构 | 是：新增 tier |

### 约束

- **不修改** `rollRarity()`（全局概率表其他系统依赖）
- **不修改** `calculateAffixSkillPrice()`（价格不随 Tier 变化）
- **不修改** `getActMaxRarity()`（已有的 cycle→rarity 上限逻辑保持不变）
- 所有随机使用 `random()`（`seededRandom.ts`），不用 `Math.random()`
- Tier 配置为纯常量对象，不引入运行时配置系统
- 商品卡片渲染函数中已有 `rarity` 级别的颜色/边框逻辑，Tier 边框叠加不冲突

### Previous Story Intelligence

Story 25.3 实现笔记：
- Boss 修饰器选择器 UI 使用模态框 + 卡片布局，可参考视觉风格
- `state.activeModifiers` 是 `BossModifierId[]`，Story 25.4 不影响
- 5 个 code review fix（switchToPhase guard、dedup、shop cycle display、getActiveModifierEffect 简化、unreachable branch）
- Fisher-Yates 随机使用 `random()`（Story 25.6 种子兼容已就绪）

Story 25.6 实现笔记：
- 所有商店随机已从 `Math.random()` 替换为 `random()`（`seededRandom.ts`）
- 每日种子控制商店序列，Story 25.4 的 Tier roll 也必须使用 `random()`
- `state.gameMode` 字段可区分 `'normal'` / `'daily'`

### 编码规范

- TypeScript strict，使用 `export` 显式导出
- 测试文件：`src/tests/unit/systems/shop/` 目录下新增 `shop-tier.test.ts`
- 种子随机：测试中用 `setSeededMode(seed)` + `afterAll(() => setNormalMode())`
- 分布均匀性测试：采用比例范围断言，N ≥ 1000
- CSS class 命名遵循 kebab-case：`shop-item-tier2`, `shop-item-tier3`

### Project Structure Notes

- 修改文件：`src/src/systems/shop.ts`（Tier 配置 + 商品生成改造）
- 修改文件：`src/src/core/types.ts`（ShopItem.tier 字段）
- 修改文件：`src/src/style.css`（Tier 边框样式）
- 新增测试：`src/tests/unit/systems/shop/shop-tier.test.ts`
- 不修改：`skillGeneration.ts`、`affixes.ts`、`battle.ts`、`constants.ts`

### References

- [Source: docs/epics.md#Story 25.4]
- [Source: docs/brainstorming-session-2026-03-05.md#无尽模式设计]
- [Source: src/src/systems/shop.ts#generateShopItems, generateAffixShopItem, getActMaxRarity]
- [Source: src/src/data/skillGeneration.ts#rollRarity]
- [Source: src/src/data/affixes.ts#RARITY_PROBABILITIES]
- [Source: docs/stories/25-3-boss-modifier-pick-stack.md#Dev Agent Record]
- [Source: docs/stories/25-6-daily-seed-system.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

### File List
