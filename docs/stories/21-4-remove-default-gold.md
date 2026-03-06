# Story 21.4: 移除默认金币产出

Status: done

## Story

As a 玩家,
I want 金币完全由技能产出而非固定公式自动给予,
so that 我面临「投资金币产出 vs 投资分数产出」的核心 trade-off，金币构筑成为有意义的策略选择.

## Acceptance Criteria

1. `openShop()` 中移除 `baseGold`（20/40）和 `timeBonus`（`Math.floor(state.time)`），金币不再自动产出
2. 战后金币 = `Math.floor(state.resources.gold)` + 遗物金币加成（`relicGold`）
3. 战后结算 UI 简化：移除「基础奖励」「剩余时间」行，改为显示「战斗产出」（= `resources.gold`）
4. 初始金币从 30 调整为 50（补偿早期无金币技能时的冷启动）
5. 第一关商店保底出现至少 1 个金币类技能（产出者或转化者）
6. 休息事件中的固定金币奖励不变（altar_gold +200、meditate_gold +80 等保留作为保底收入）
7. 遗物金币加成（贪婪之手 ×1.5、超杀之刃 overkill→gold）保持战后倍率机制不变

## Tasks / Subtasks

- [x] Task 1: 移除默认金币公式 (AC: 1, 2)
  - [x] 1.1 `systems/shop.ts` openShop() — 移除 `baseGold` 和 `timeBonus` 变量
  - [x] 1.2 `systems/shop.ts` openShop() — 金币计算改为 `state.gold += Math.floor(state.resources.gold) + relicGold`
  - [x] 1.3 `systems/shop.ts` openShop() — bonus 显示改为 `relicGold`（遗物加成）
- [x] Task 2: 简化战后结算 UI (AC: 3)
  - [x] 2.1 `systems/battle.ts` showGoldReward() — 移除 baseGold/timeBonus 计算
  - [x] 2.2 `systems/battle.ts` showGoldReward() — 新增显示 `resources.gold`（战斗产出行）
  - [x] 2.3 `systems/battle.ts` showGoldReward() — totalGold = skillGold + relicGold
  - [x] 2.4 `index.html` — 金币奖励面板：「基础奖励」行改为「战斗产出」，移除「剩余时间」行
- [x] Task 3: 调整初始金币 (AC: 4)
  - [x] 3.1 `core/state.ts` — createInitialState 中 `gold: 30` → `gold: 50`
  - [x] 3.2 `main.ts` — `state.gold = 30` → `state.gold = 50`
- [x] Task 4: 第一关商店金币保底 (AC: 5)
  - [x] 4.1 `systems/shop.ts` generateShopItems() — Act 1 第一关保底出现 ≥1 金币类技能
- [x] Task 5: 验证不变项 (AC: 6, 7)
  - [x] 5.1 确认 `restStage.ts` 中 altar_gold/meditate_gold 等固定金币奖励未受影响
  - [x] 5.2 确认 `resolveRelicEffects('on_battle_end')` 管道正常工作（贪婪之手、超杀之刃）
- [x] Task 6: 更新测试 (AC: 1-7)
  - [x] 6.1 更新 producer-shop 初始 gold 断言 30→50
  - [x] 6.2 确认 battle/shop 相关测试无回归

## Dev Notes

### 关键设计决策

**移除公式 vs 保留管道：**
- 移除：`baseGold = currentType === 'elite' ? 40 : 20`（固定基础金币）
- 移除：`timeBonus = Math.floor(state.time)`（剩余时间奖励）
- 保留：`relicGold = Math.floor(goldRelicResult.effects.gold)`（遗物金币管道）
- 保留：`state.gold += Math.floor(state.resources.gold)`（技能产出金币管道）
- 结果：金币来源仅剩 技能产出 + 遗物加成 + 休息事件奖励

**初始金币 30→50 的理由：**
- 第一关没有金币技能可用（必须先通过第一关才能买到金币技能）
- 50 金币可以保证第一关商店能买到 1 个基础技能（基础技能价格 ~30-50）
- 如果太低，玩家可能第一关就陷入"有钱买不到金币技能→后续没金币→死循环"

**第一关金币保底出现逻辑：**
- 在 `generateShopItems()` 中，如果 `state.level === 1`，确保 skillPool 中至少有 1 个金币产出者（prod_mint/prod_treasury）或金币转化者（conv_*_gold_add / conv_gold_*_add）
- 实现方式：在 Act 1 的 skillPool 生成后，检查是否包含 gold 相关技能；如果没有，从 converterPool 或 producerPool 中随机挑选一个金币相关技能替换

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|---------|
| `src/src/systems/shop.ts` | line 55-92 (openShop) | 移除 baseGold/timeBonus，简化金币计算 |
| `src/src/systems/battle.ts` | line 456-511 (showGoldReward) | 移除 baseGold/timeBonus 显示，新增战斗产出行 |
| `src/index.html` | line 200-226 (gold-reward panel) | 简化 UI：移除基础奖励/剩余时间行 |
| `src/src/systems/shop.ts` | line 117-220 (generateShopItems) | 新增 Act 1 金币保底逻辑 |
| `src/src/core/state.ts` | line 22 | gold: 30 → 50 |
| `src/src/main.ts` | line 31 | state.gold = 30 → 50 |

### 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `systems/restStage.ts` | altar_gold/meditate_gold 等固定奖励保留不变 |
| `data/relics.ts` | 遗物管道通过 resolveRelicEffects 自动工作，无需改动 |
| `data/producers.ts` | 金币产出者数据不变 |
| `data/converters.ts` | 金币转化者数据不变 |

### 现有 openShop() 金币计算（修改前）

```typescript
// 当前代码 (shop.ts:55-92)
const goldRelicResult = resolveRelicEffects('on_battle_end', { overkill: state.overkill });
const relicGold = Math.floor(goldRelicResult.effects.gold);
const currentType = getStageType(state.level);
const baseGold = currentType === 'elite' ? 40 : 20;     // ← 移除
const timeBonus = Math.floor(state.time);                 // ← 移除
const bonus = timeBonus + relicGold;                      // ← 改为 relicGold
state.gold += baseGold + bonus;                           // ← 改为 relicGold
state.gold += Math.floor(state.resources.gold);           // ← 保留
```

### 现有 showGoldReward() UI（修改前）

```html
<!-- index.html 金币奖励面板 -->
<div class="gold-reward-row">
    <span class="gold-reward-label">基础奖励</span>         <!-- 改为"战斗产出" -->
    <span class="gold-reward-value" id="gold-base">+20</span>
</div>
<div class="gold-reward-row gold-time-row">
    <span class="gold-reward-label">剩余时间</span>          <!-- 移除 -->
    <span class="gold-reward-value gold-time" id="gold-time">+0</span>
</div>
```

### 现有 showGoldReward() 逻辑（修改前）

```typescript
// battle.ts:456-511
const baseGold = currentType === 'elite' ? 40 : 20;     // ← 移除
const timeBonus = Math.floor(state.time);                 // ← 移除
const totalGold = baseGold + timeBonus + relicGold;       // ← 改为 skillGold + relicGold
if (goldBaseEl) goldBaseEl.textContent = `+${baseGold}`;  // ← 改为 skillGold
if (goldTimeEl) goldTimeEl.textContent = `+${timeBonus}`; // ← 移除
```

### 遗物金币管道（不变）

```typescript
// resolveRelicEffects('on_battle_end', { overkill: state.overkill })
// 返回 effects.gold = overkill_blade 的 overkill + greedy_hand 的 ×1.5
// 这个管道在 openShop 和 showGoldReward 中都调用，保持一致
```

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- openShop() 和 showGoldReward() 的金币计算逻辑必须保持一致（双份代码同步修改）
- index.html 的 gold-reward 面板与 battle.ts 的 showGoldReward() 配合使用

### References

- [Source: docs/epics.md#Epic 21 Story 21.4]
- [Source: docs/stories/21-1-gold-resource-type.md — gold 双层存储设计]
- [Source: docs/stories/21-2-gold-producer-skills.md — 金币产出者]
- [Source: docs/stories/21-3-gold-converter-skills.md — 金币转化者]
- [Source: src/src/systems/shop.ts#openShop — 现有金币计算]
- [Source: src/src/systems/battle.ts#showGoldReward — 现有金币 UI]
- [Source: src/index.html#gold-reward — 金币奖励面板 HTML]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 移除 openShop() 中 baseGold（20/40）和 timeBonus（Math.floor(state.time)），金币计算简化为 `state.gold += Math.floor(state.resources.gold) + relicGold`
- 移除 showGoldReward() 中 baseGold/timeBonus，改为显示 skillGold（= Math.floor(state.resources.gold)），totalGold = skillGold + relicGold
- index.html 金币奖励面板：「基础奖励」→「战斗产出」，移除「剩余时间」和「Overkill」行
- 初始金币 30→50（state.ts + main.ts）
- 第一关商店金币保底：generateShopItems() 中 state.level === 1 时检查 skillPool 是否含金币技能，不含则从 unowned 中随机替换
- 移除 shop.ts 中未使用的 getStageType 导入
- 更新 producer-shop.test.ts 金币断言 30→50
- 休息事件金币奖励、遗物金币管道未受影响
- 全套 2280/2327 通过（47 个失败为 pre-existing：audio mock + trigger 测试）
- Code review 修复：shopBonus 改为显示 skillGold+relicGold（总战斗收益）
- Code review 修复：删除孤立 CSS 规则 .gold-overkill / .gold-time
- Code review 修复：新增 3 个金币保底测试（isGoldSkill、source/target 检查、替换逻辑）

### File List
- `src/src/systems/shop.ts` — 移除 baseGold/timeBonus，简化金币计算，新增第一关金币保底，shopBonus 显示总战斗收益
- `src/src/systems/battle.ts` — showGoldReward() 移除 baseGold/timeBonus，改为 skillGold + relicGold
- `src/index.html` — 金币奖励面板简化：「战斗产出」替代「基础奖励」，移除剩余时间/Overkill 行
- `src/src/core/state.ts` — 初始金币 30 → 50
- `src/src/main.ts` — 初始金币 30 → 50
- `src/src/style.css` — 删除孤立 CSS 规则 .gold-overkill / .gold-time
- `src/tests/unit/systems/producer-shop.test.ts` — 金币断言 30+10 → 50+10
- `src/tests/unit/systems/shop-act-weight.test.ts` — 新增 3 个金币保底测试
