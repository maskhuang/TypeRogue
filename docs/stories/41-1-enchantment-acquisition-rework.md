# Story 41.1: 附魔获取改造 — 解耦技能等级，三渠道体系

Status: done

## Story

As a 玩家,
I want 附魔与技能等级解耦，通过仪式、商店、试炼三条渠道获取附魔,
so that 附魔成为 Act 2 中期转型的主动战略决策，而非技能升级的被动赠品.

## 设计概要

### 核心变更：附魔与技能等级完全解耦

- 移除 `checkAutoEnchantment()` 中的等级判断（原 Lv.3 门槛）
- 任何已拥有且有空附魔槽的技能均可接受附魔，无等级要求
- 附魔获取由关卡节奏和经济系统控制，不再由技能升级触发

### 三渠道定位

| 渠道 | 定位 | 时机 | 门槛 |
|------|------|------|------|
| **仪式附魔** | 主渠道 | Act 2 固定阶段（具体插入点待定，依赖流程调整） | 免费，附魔二选一 → 拖技能上去 |
| **附魔台（商店）** | 后期补漏 | Act 3 起商店小概率刷出 | 金币购买，显示具体附魔 |
| **休息关试炼** | 高风险 bonus | Node 4、Node 8 休息事件池 | 高难打字挑战，成功免费获得 |

## Acceptance Criteria

1. **AC1: 移除等级绑定** — 删除 `checkAutoEnchantment()` 中对 `getMinEnchantmentLevel()` 的等级判断。附魔资格改为：技能已拥有 + 有空附魔槽，无等级要求
2. **AC2: 移除 Lv.3 自动触发** — 技能升级（购买/升级）不再自动弹出附魔选择弹窗。`checkAutoEnchantment()` 整体废弃或改为空操作
3. **AC3: 仪式附魔（主渠道）** — Act 2 固定阶段触发仪式界面。展示 2 个附魔候选（二选一），玩家选定附魔后点选任意有空槽的已拥有技能完成附魔。仪式可进行多轮（具体轮数待定，依赖流程调整）。仪式界面需新建
4. **AC4: 附魔台商店商品** — Act 3 起商店小概率刷出附魔商品（概率值待定）。商品显示具体附魔类型和效果描述，绑定购买价格。玩家购买后选择目标技能（任意有空槽的已拥有技能）完成附魔。`ShopItem.type` 新增 `'enchantment'`
5. **AC5: 休息关附魔试炼事件** — 在 `restEvents` 事件池新增"附魔试炼"事件。前提：玩家拥有至少 1 个有空槽的技能。选择试炼 → 附魔二选一 → 进入高难度打字挑战（限时 15s 内连续输入 8 个单词零错误）。成功：选目标技能完成附魔。失败：无奖励（机会成本 = 放弃其他休息事件）
6. **AC6: 命运分叉遗物适配** — 持有 `fate_fork` 时：仪式附魔候选从 2 个变为 3 个（三选一）；商店附魔商品刷出数量上限 +1
7. **AC7: 早期觉醒遗物重设计** — 原效果（Lv.3→Lv.2 可附魔）已无意义，需重新设计效果。暂定方向：仪式附魔轮数 +1 或附魔台商店出现概率提升。具体效果待流程调整后确定
8. **AC8: ShopItem 类型扩展** — `ShopItem.type` 联合类型新增 `'enchantment'`，新增可选字段 `enchantmentType?: string`。`executePurchase()` 处理附魔商品购买 → 弹出技能选择 → 完成附魔
9. **AC9: 无回归 bug** — 现有附魔效果（触发、成长、叠层等运行时行为）不受获取方式变更影响，测试套件零新回归

## Tasks / Subtasks

- [x] Task 1: 废弃 Lv.3 自动附魔触发 (AC: #1, #2)
  - [x] 1.1 将 `checkAutoEnchantment()` 改为空操作或移除所有调用点（shop.ts L1527、L1577、L1614、L2766）
  - [x] 1.2 `getMinEnchantmentLevel()` 标记废弃或移除，下游引用清理
  - [x] 1.3 添加测试：技能升级到 Lv.3 后不弹出附魔选择

- [x] Task 2: 实现仪式附魔界面 (AC: #3, #6)
  - [x] 2.1 新建仪式附魔场景/界面，展示附魔候选（2 选 1，fate_fork 时 3 选 1）
  - [x] 2.2 选定附魔后，列出所有有空槽的已拥有技能，支持拖拽技能到附魔位完成附魔
  - [x] 2.3 处理附魔写入：`affixSkill.enchantmentIds.push(chosen)`，含嬗变资源选择、学徒·观摩位置关系等特殊情况
  - [x] 2.4 仪式阶段插入 Act 2 流程（具体节点待流程调整后确定，预留接口）
  - [x] 2.5 添加 i18n 条目：仪式标题、附魔候选描述、操作提示
  - [x] 2.6 添加单元测试：仪式附魔写入正确、fate_fork 候选数正确

- [x] Task 3: 实现附魔台商店商品 (AC: #4, #6, #8)
  - [x] 3.1 在 `core/types.ts` 的 `ShopItem.type` 中添加 `'enchantment'`，新增 `enchantmentType?: string` 字段
  - [x] 3.2 在 `generateShopItems()` 中添加：Act 3 起小概率生成附魔商品，显示具体附魔类型和效果
  - [x] 3.3 持有 `fate_fork` 时附魔商品刷出上限 +1
  - [x] 3.4 在 `executePurchase()` 中添加 `'enchantment'` 分支：购买后弹出技能选择界面，玩家选目标技能完成附魔
  - [x] 3.5 商店 UI 渲染附魔商品：附魔名、效果描述、价格
  - [x] 3.6 添加单元测试：Act 门控、生成条件、购买流程

- [x] Task 4: 实现休息关附魔试炼事件 (AC: #5)
  - [x] 4.1 在 `restEvents.ts` 新增 `enchantment_trial` 事件，前提：有空槽技能
  - [x] 4.2 在 `restStage.ts` 的 `executeEffect()` 中添加试炼流程：附魔二选一 → 打字挑战
  - [x] 4.3 实现试炼挑战：限时 15s，连续 8 个单词零错误，复用现有输入系统
  - [x] 4.4 成功：选目标技能完成附魔。失败：无奖励
  - [x] 4.5 添加 i18n 条目和单元测试

- [x] Task 5: 遗物适配 (AC: #6, #7)
  - [x] 5.1 `fate_fork`：仪式候选 +1、商店附魔上限 +1
  - [x] 5.2 `early_awakening`：标记待重设计，暂保留原数据，运行时效果置空
  - [x] 5.3 `apprentice_robe`、`trial_badge`、`enchant_anchor`：确认不受影响

- [x] Task 6: 回归测试 (AC: #9)
  - [x] 6.1 运行附魔运行时测试（触发、成长、叠层、嬗变等）确认零回归
  - [x] 6.2 运行商店测试确认原有商品类型不受影响
  - [x] 6.3 运行遗物测试确认未改动遗物行为正常

## Dev Notes

### 关键设计决策

**附魔与技能等级完全解耦：** 附魔不再是"技能到 Lv.3 的奖励"，而是独立的战略资源。任何技能都能被附魔，决策从"哪个技能先升到 Lv.3"变为"哪个技能值得附魔"。

**三渠道分工：**
- 仪式（Act 2 固定）= 主要来源，保证每局都有附魔机会
- 附魔台（Act 3 商店）= 后期补漏，金币换附魔，小概率
- 试炼（休息关）= 高风险 bonus，操作门槛高

**待定事项（依赖流程调整）：**
- 仪式在 Act 2 的具体插入节点
- 仪式每次可进行的附魔轮数
- 附魔台商店具体概率值
- 附魔台定价公式
- `early_awakening` 遗物新效果
- 附魔重设计（独立话题）

### 现有代码关键引用

| 文件 | 位置 | 内容 | 改动 |
|------|------|------|------|
| `systems/shop.ts` | L1636-1673 | `checkAutoEnchantment()` | 废弃/移除 |
| `systems/shop.ts` | L1527, L1577, L1614, L2766 | `checkAutoEnchantment` 调用点 | 移除调用 |
| `systems/relics/EnchantmentRelicBehaviors.ts` | L47-49 | `getMinEnchantmentLevel()` | 废弃/移除 |
| `systems/shop.ts` | L756-920 | `generateShopItems()` | 新增附魔商品 |
| `systems/shop.ts` | L1954-1973 | `renderAffixEnchantmentModal()` | 可复用于仪式界面的附魔选择 |
| `core/types.ts` | L241-251 | `ShopItem` 接口 | 扩展 type |
| `data/relics.ts` | L516-527 | `early_awakening` | 效果待重设计 |
| `data/restEvents.ts` | L18-130 | 休息事件 | 新增试炼事件 |
| `systems/restStage.ts` | L129-297 | `executeEffect()` | 新增试炼处理 |
| `systems/stage/stageFlow.ts` | 全文件 | 关卡流程定义 | 需为仪式预留节点 |

### 约束

- 附魔运行时行为（触发、成长、叠层等）完全不改，本 story 只改获取方式
- 仪式界面的附魔候选生成复用现有 `categorizeEnchantmentCandidates` + `filterCategorizedByClass`
- 休息关试炼复用现有输入系统，不引入独立输入处理
- 附魔重设计为独立话题，不在本 story 范围内

### References

- [Source: src/src/systems/shop.ts#checkAutoEnchantment (L1636-1673)]
- [Source: src/src/systems/shop.ts#generateShopItems (L756-920)]
- [Source: src/src/systems/shop.ts#renderAffixEnchantmentModal (L1954-1973)]
- [Source: src/src/systems/relics/EnchantmentRelicBehaviors.ts#getMinEnchantmentLevel (L47-49)]
- [Source: src/src/core/types.ts#ShopItem (L241-251)]
- [Source: src/src/data/relics.ts#early_awakening (L516-527)]
- [Source: src/src/data/restEvents.ts#RestEvent interface (L18-26)]
- [Source: src/src/systems/restStage.ts#executeEffect (L129-297)]
- [Source: src/src/systems/stage/stageFlow.ts#node layout]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: 废弃 checkAutoEnchantment 4 个调用点, 函数体改 no-op, getMinEnchantmentLevel 标记 @deprecated
- Task 2: 新建 ritualEnchantment.ts, Act 1→2 转折时触发仪式界面, 修复 7 个 TS 编译错误
- Task 3: ShopItem.type 新增 'enchantment', Act 3 起 25% 概率生成附魔商品, fate_fork 上限 +1
- Task 4: restEvents 新增 enchantment_trial, 打字挑战 15s/8词/零错误
- Task 5: early_awakening 描述更新为待重设计, fate_fork 适配已在 Task 2/3 中完成
- Task 6: 全量回归测试 24 个预存失败文件, 零新增回归
- Code Review 修复: (HIGH-1) 商店 ApprenticeNeighbor 附魔补充 neighborRel 生成, (HIGH-2) restEvents 前置条件改用 getEnchantmentSlotCount+getEnchantAnchorSlotBonus, (HIGH-3) 附魔购买扣金移至技能选择确认后+添加取消按钮, (MEDIUM-1) 试炼选词改用 seeded random(), (MEDIUM-2) 商店/试炼附魔写入逻辑统一复用 applyRitualEnchantment

### File List

- `src/src/systems/ritualEnchantment.ts` — 新建：仪式附魔系统
- `src/src/systems/shop.ts` — 修改：废弃 checkAutoEnchantment, 导出 getEnchantmentDisplayInfo, 新增附魔商品生成/购买
- `src/src/systems/restStage.ts` — 修改：集成仪式附魔, 新增附魔试炼 UI
- `src/src/core/types.ts` — 修改：ShopItem.type 新增 'enchantment' + 附魔字段
- `src/src/core/events/EventBus.ts` — 修改：新增 ritual:enchantment_applied 事件
- `src/src/data/restEvents.ts` — 修改：新增 enchantment_trial 事件
- `src/src/data/relics.ts` — 修改：early_awakening 描述更新
- `src/src/systems/relics/EnchantmentRelicBehaviors.ts` — 修改：getMinEnchantmentLevel 标记 @deprecated
- `src/src/demo/demo-i18n.ts` — 修改：新增仪式/附魔台/试炼 i18n 条目（中英文）
- `src/tests/unit/systems/enchantment-acquisition.test.ts` — 新建：AC1/2/4/5/8 测试
- `src/tests/unit/systems/ritual-enchantment.test.ts` — 新建：仪式附魔系统测试
