# Story 9.3: 商店经济重平衡 — overkill 遗物化

Status: done

## Story

As a 玩家,
I want overkill 奖励作为遗物效果而非基础机制，商店金币公式更简洁,
so that 基础金币奖励可预测，overkill 打法成为可选构筑方向。

## Acceptance Criteria

1. 基础金币奖励改为：`20 + 剩余时间秒数`（移除 overkill）
2. 新增遗物：超杀之刃——拥有时 overkill 分数转化为额外金币
3. 藏宝图遗物：改为"战斗结束时额外 +15 金币"（通用金币加成）
4. `battle.ts showGoldReward()` 与 `shop.ts openShop()` 金币计算统一（修复已有 bug）
5. 狂战士面具保持不变
6. 所有相关测试通过

## Tasks / Subtasks

- [x] Task 1: 统一金币计算，移除基础 overkill (AC: #1, #4)
  - [x] 1.1 `src/src/systems/shop.ts` L17-31: `openShop()` 删除旧 bonus 公式 `(score-target)/10`
  - [x] 1.2 新公式: `baseGold = 20 + Math.floor(state.time)`（基础 + 剩余时间）
  - [x] 1.3 如果拥有超杀之刃遗物，追加 `state.overkill` 金币
  - [x] 1.4 藏宝图改为通用 +15 金币，不再参与 overkill 计算
  - [x] 1.5 `src/src/systems/battle.ts` L329-380: `showGoldReward()` 同步修改公式，使展示与实际一致
  - [x] 1.6 藏宝图相关的旧逻辑（`shop.ts` 中 `hasRelic('treasure_map')` bonus×2）删除

- [x] Task 2: 新增超杀之刃遗物 (AC: #2)
  - [x] 2.1 `src/src/data/relics.ts`: 新增 `overkill_blade` 遗物
    - name: '超杀之刃'
    - icon: '⚔️'
    - rarity: 'rare'
    - basePrice: 50
    - description: '超杀分数转化为额外金币'
    - effects: `[{ type: 'battle_end', modifier: 'gold_flat', value: 0 }]`（实际逻辑在 battle/shop 中硬编码，类似 treasure_map）

- [x] Task 3: 修改藏宝图遗物 (AC: #3)
  - [x] 3.1 `src/src/data/relics.ts` L107-117: treasure_map 修改
    - description: '战斗结束时额外 +15 金币'
    - effects: `[{ type: 'battle_end', modifier: 'gold_flat', value: 15 }]`
  - [x] 3.2 `shop.ts` 和 `battle.ts` 中删除 treasure_map 的硬编码逻辑（`hasRelic('treasure_map')` bonus 翻倍）

- [x] Task 4: 更新测试 (AC: #6)
  - [x] 4.1 新增 overkill_blade 遗物数据测试
  - [x] 4.2 更新 treasure_map 相关测试（relics.test.ts, RelicSystem.test.ts）
  - [x] 4.3 运行全部测试确认无回归（1402 tests passed）

## Dev Notes

### 设计决策

- **overkill 遗物化：** 基础金币 = `20 + 剩余时间`，简单可预测。overkill 是高级玩法，通过遗物解锁更有构筑感。
- **狂战士面具不变：** 保持 `combo > 20` 条件和 `+30%` 效果。
- **藏宝图独立化：** 改为通用金币遗物（+15 金币/关），不再与 overkill 绑定，任何构筑都有价值。

### 金币公式变更

| 场景 | 当前(shop.ts) | 当前(battle.ts 展示) | 目标 |
|------|-------------|-------------------|------|
| 基础 | 20 | 20 | 20 |
| 超额 | (score-target)/10 | state.overkill | 无（除非有遗物） |
| 时间 | 无 | Math.floor(state.time) | Math.floor(state.time) |
| 超杀之刃 | — | — | +state.overkill |
| 藏宝图 | 超额×2 | overkill×2 | +15 金币（通用） |

### 已有 bug 修复

`showGoldReward()`（battle.ts）仅展示不加金币，`openShop()`（shop.ts）实际加金币，两者公式不一致。统一后两处使用相同逻辑。

### 关键代码位置

- `shop.ts` L17-31: `openShop()` — 实际加金币（需重写）
- `battle.ts` L329-380: `showGoldReward()` — 金币动画展示（需同步）
- `battle.ts` L253-255: overkill 计算（保留，遗物需要）
- `data/relics.ts`: 遗物数据定义
- `state.ts` L24: overkill 字段（保留）
- `state.ts`/`types.ts`: timeReward 已移除（死代码清理）

### Project Structure Notes

- 商店系统: `src/src/systems/shop.ts`
- 战斗系统: `src/src/systems/battle.ts`
- 遗物数据: `src/src/data/relics.ts`
- 游戏状态: `src/src/core/state.ts`

### References

- [Source: docs/epics.md#Epic 9, Story 9.3]
- [Source: src/src/systems/shop.ts#openShop]
- [Source: src/src/systems/battle.ts#showGoldReward]
- [Source: src/src/data/relics.ts]
- [Source: docs/stories/9-1-remove-combo-skill-type.md - 前置 Story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- 统一 shop.ts 和 battle.ts 金币公式为 `20 + timeBonus + overkillGold + treasureGold`
- 修复已有 bug：两处公式不一致导致展示与实际金币不同
- overkill_blade 遗物逻辑硬编码在 shop.ts/battle.ts 中（通过 hasRelic 检查），data 定义仅作标记
- treasure_map 从 gold_multiplier 改为 gold_flat，测试同步更新
- 狂战士面具未做任何修改（AC #5）

### Code Review Fixes

- [H1] 金币展示添加藏宝图行，分项加总与总数一致（index.html + battle.ts + style.css）
- [M1] Overkill/藏宝图展示行在无遗物时隐藏（battle.ts）
- [M2] piggy_bank 金币修正：5 → 10，与 relics.ts 数据一致（shop.ts）
- [M3] 移除 state.timeReward 死代码（battle.ts + types.ts + state.ts）
- [M4] overkill_blade value=0 添加说明注释（relics.ts）

### File List

- `src/src/systems/shop.ts` — 重写金币计算公式，修复 piggy_bank 金额
- `src/src/systems/battle.ts` — showGoldReward() 同步新公式，添加条件行显隐，移除 timeReward
- `src/src/data/relics.ts` — 新增 overkill_blade，修改 treasure_map，添加注释
- `src/src/core/types.ts` — 移除 timeReward 字段
- `src/src/core/state.ts` — 移除 timeReward 初始值
- `src/index.html` — 添加藏宝图金币展示行
- `src/src/style.css` — 添加 treasure 样式和动画
- `src/tests/unit/systems/relics/relics.test.ts` — 更新遗物数据测试
- `src/tests/unit/systems/relics/RelicSystem.test.ts` — 更新 treasure_map 相关测试
