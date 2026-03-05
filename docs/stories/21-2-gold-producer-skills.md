# Story 21.2: 金币产出者技能

Status: done

## Story

As a 玩家,
I want 通过绑定金币产出者技能在战斗中产出金币资源,
so that 金币获取从固定公式转变为技能驱动，与 build 构筑产生联动.

## Acceptance Criteria

1. `prod_mint`（铸币）：gold add，values `[3, 5, 8]`，每次触发 +N 金币
2. `prod_treasury`（金库）：gold multiply，values `[1.3, 1.5, 1.7]`，每次触发 ×N 累积金币
3. 注册在 `PRODUCERS`，`isProducer()` / `getProducerValue()` / `getProducerDesc()` 自动适配
4. `triggerProducer` / `triggerProducerWithReduction` 的 gold 分支正确执行（直接操作 `state.resources.gold`，不经过 synergy 累加器）
5. `recordSkillTrigger` 正确记录 gold 资源的 delta
6. 商店中金币产出者与其他产出者使用相同 Act 权重出现
7. `getResourceLabel('gold')` 返回正确标签（修复现有遗漏）
8. `SKILL_SCHOOL` 映射新增两个金币产出者条目
9. 构建通过，现有测试通过，新增测试覆盖

## Tasks / Subtasks

- [x] Task 1: 新增金币产出者数据 (AC: 1, 2, 3)
  - [x] 1.1 `data/producers.ts` — 新增 `prod_mint`：gold add [3, 5, 8]
  - [x] 1.2 `data/producers.ts` — 新增 `prod_treasury`：gold multiply [1.3, 1.5, 1.7]（从 1.8 调整为 1.7，满足递减增量约定）
- [x] Task 2: 技能流派映射 (AC: 8)
  - [x] 2.1 `data/skills.ts` — `SKILL_SCHOOL` 新增 prod_mint、prod_treasury
- [x] Task 3: 修复 getResourceLabel 遗漏 (AC: 7)
  - [x] 3.1 `systems/skills.ts` — `getResourceLabel()` switch 新增 `case 'gold': return '币';`
- [x] Task 4: 验证触发逻辑 (AC: 4, 5)
  - [x] 4.1 确认 `triggerProducer` generic else 分支处理 gold add
  - [x] 4.2 确认 `triggerProducer` generic else 分支处理 gold multiply
  - [x] 4.3 确认 `triggerProducerWithReduction` 通过 generic 分支支持 gold
  - [x] 4.4 确认 `recordSkillTrigger` 通过 `EMPTY_RESOURCES`（含 gold: 0）正确记录
- [x] Task 5: 验证商店出现 (AC: 6)
  - [x] 5.1 确认 `generateShopItems()` 中 `isProducer()` 自动识别新产出者
  - [x] 5.2 确认 `ACT_SKILL_WEIGHTS` 无需修改
- [x] Task 6: 更新测试 (AC: 9)
  - [x] 6.1 产出者总数 10→12
  - [x] 6.2 资源种类 5→6，新增 gold
  - [x] 6.3 新增 A11 铸币、A12 金库 values 验证
  - [x] 6.4 排除 gold 的 +N 类非整数缩放比验证（gold 和 shield 同为整数资源）

## Dev Notes

### 关键设计决策

**Gold 产出者的触发行为：**
- gold 和 time/shield 一样走 `triggerProducer` 的 generic else 分支
- add: `state.resources.gold += value`
- multiply: `state.resources.gold *= value`
- 不经过 synergy 累加器（只有 base 和 multiplier 走 synergy）
- 不像 score 那样同步写入 `state.score`（gold 在战斗结束时统一转入）

**getResourceLabel BUG 修复：**
- 当前 `getResourceLabel()` (`skills.ts:64-72`) 的 switch 没有 `'gold'` case
- TypeScript 不会报错（return type 是 string，switch 没有 default 会返回 undefined）
- 如果金币产出者触发，反馈文本会显示 `undefined` 而非 `币`
- 本 Story 必须修复此问题

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|---------|
| `src/src/data/producers.ts` | line 108-109 (末尾) | 新增 prod_mint, prod_treasury |
| `src/src/data/skills.ts` | line 41-42 | SKILL_SCHOOL 新增两条 |
| `src/src/systems/skills.ts` | line 64-72 | getResourceLabel 新增 gold case |
| `tests/unit/data/producers.test.ts` | line 11, 26-36 | 更新计数和资源列表 |

### triggerProducer 分支覆盖

```
triggerProducer (skills.ts:157-236):
  add operator:
    base       → synergy.skillBaseScore += value     (特殊)
    multiplier → synergy.skillMultBonus += value      (特殊)
    score      → resources.score += value, state.score += value (特殊)
    其他       → state.resources[resource] += value   (generic) ← gold 走这里
  multiply operator:
    base       → synergy.skillBaseScore += delta      (特殊)
    multiplier → synergy.skillMultBonus += delta      (特殊)
    score      → resources.score += delta, state.score += delta (特殊)
    其他       → state.resources[resource] *= value   (generic) ← gold 走这里
```

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- producers.ts 是纯数据文件，无副作用
- 新增产出者自动被 `isProducer()` / `getProducerValue()` / `getProducerDesc()` 识别
- 商店系统通过 `Object.keys(PRODUCERS)` 获取所有产出者 ID，自动包含新增项

### References

- [Source: docs/epics.md#Epic 21 Story 21.2]
- [Source: docs/stories/21-1-gold-resource-type.md — 前置 Story]
- [Source: src/src/data/producers.ts — 产出者数据定义]
- [Source: src/src/systems/skills.ts#triggerProducer — 触发逻辑]
- [Source: src/src/systems/skills.ts#getResourceLabel — BUG 位置]
- [Source: src/src/data/skills.ts#SKILL_SCHOOL — 流派映射]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 新增 2 个金币产出者：prod_mint (add) 和 prod_treasury (multiply)
- prod_treasury Lv3 值从 1.8 调整为 1.7，满足既有 ×N 类递减增量约定
- 修复 getResourceLabel 缺少 gold case 的 BUG
- SKILL_SCHOOL 映射新增 2 条
- 测试 264/264 全通过，构建正常

### File List
- `src/src/data/producers.ts` — 新增 prod_mint、prod_treasury
- `src/src/data/skills.ts` — SKILL_SCHOOL 新增 2 条
- `src/src/systems/skills.ts` — getResourceLabel 新增 gold case
- `tests/unit/data/producers.test.ts` — 计数 10→12，资源 5→6，新增 A11/A12 测试
