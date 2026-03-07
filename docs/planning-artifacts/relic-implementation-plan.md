# 遗物系统重构 — 实现计划

> 基于 `relic-system-redesign.md` 设计文档
> 日期：2026-03-07

---

## 依赖关系总览

```
Epic 1 数据层重构
  ├── Story 1.1 移除旧遗物 ──────────────────────────┐
  ├── Story 1.2 T1 条件加成遗物 ─────────┐           │
  ├── Story 1.3 T5 空间策略遗物 ─────────┤           │
  ├── Story 1.4 T6 经济新遗物 ───────────┤           │
  └── Story 1.5 T7 风险新遗物 ───────────┤           │
                                         │           │
Epic 2 槽位系统                          │           │
  ├── Story 2.1 10 槽位限制 ◄────────────┼───────────┘
  └── Story 2.2 遗物替换/卖出 ◄──────────┤
                                         │
Epic 3 获取渠道                          │
  ├── Story 3.1 开局三选一重构 ◄─────────┤
  ├── Story 3.2 精英关掉落 ◄─────────────┤
  ├── Story 3.3 商店遗物位 ◄─────────────┤
  ├── Story 3.4 Boss 传说掉落 ◄──────────┤
  └── Story 3.5 休息事件调整 ◄───────────┘

Epic 4 T2 累积成长
  ├── Story 4.1 遗物状态持久化 ◄── Epic 1
  └── Story 4.2 4 个 T2 遗物 ◄─── Story 4.1

Epic 5 T3 重触发
  ├── Story 5.1 重触发管道 ◄───── Epic 1
  └── Story 5.2 3 个 T3 遗物 ◄── Story 5.1

Epic 6 T4 规则改造
  ├── Story 6.1 限制框架 ◄─────── Epic 1 + Epic 2
  └── Story 6.2 5 个 T4 遗物 ◄── Story 6.1
```

**建议执行顺序**：Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 → Epic 6

---

## Epic 1: 数据层重构

### Story 1.1: 移除旧遗物 + 更新存档兼容

**目标**：移除 6 个定位重叠的遗物，保持存档兼容

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 从 `RELICS` 删除 6 个遗物定义；从 `RELIC_MODIFIER_DEFS` 删除对应工厂；将 6 个 ID 加入 `DELETED_RELIC_IDS` |
| `src/tests/unit/systems/relics/relics.test.ts` | 更新遗物数量断言（15→9）、稀有度分布断言、移除被删遗物的具体测试 |

**删除的遗物**：
```
golden_keyboard, void_heart, rhyme_master, keyboard_storm, time_lord, time_crystal
```

**验证**：`npx vitest run src/tests/unit/systems/relics/` 全绿

---

### Story 1.2: 添加 T1 条件加成遗物（5 个新增）

**目标**：添加 forge_heart、chain_surge、stack_resonance、perfect_rhythm、resource_flood

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 在 `RELICS` 添加 5 个遗物数据；在 `RELIC_MODIFIER_DEFS` 添加对应工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | 可能需要扩展 `queryRelicFlag` 支持新条件（如 `resource_flood` 需要跟踪单词内资源种类） |
| `src/tests/unit/systems/relics/relics.test.ts` | 添加新遗物数据完整性测试 |
| `src/tests/unit/systems/relics/` | 新建 `relics.t1.test.ts`：条件触发逻辑测试 |

**实现要点**：
- `forge_heart`：需在 `resolveRelicEffects('on_skill_trigger', ctx)` 中检测当前技能是否为产出者，若是则为后续转化者注入 +15% modifier
- `chain_surge`：连接者传导时给被传导技能注入 +25% modifier，需在连接者触发逻辑中集成
- `stack_resonance`：在增幅者计算时检查叠层 ≥15 条件
- `perfect_rhythm`：在 `on_word_complete` 触发时检查 `state.wordPerfect`
- `resource_flood`：需在词完成时统计本词产出的资源种类数

**新增条件类型**（`PipelineContext` 扩展）：
```typescript
// 需要在 ModifierTypes.ts 的 PipelineContext 中添加
currentSkillCategory?: 'producer' | 'converter' | 'connector' | 'amplifier'
wordResourceTypes?: Set<ResourceType>  // 本词产出过的资源种类
isChainedTrigger?: boolean             // 是否被连接者传导触发
```

---

### Story 1.3: 添加 T5 空间策略遗物（4 个新增）

**目标**：添加 home_advantage、ambidextrous、constellation、lone_wolf

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 4 个遗物数据 + 工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | 扩展 `injectRelicModifiers` 支持空间条件查询 |
| `src/src/data/keyboardTopology.ts` | 可能需要新增辅助函数（如 `isHomeRow(key)`、`getClusterSize(key)`） |
| `src/tests/unit/systems/relics/` | 新建 `relics.t5.test.ts` |

**实现要点**：
- `home_advantage`：需要 `ROW_MAP` 判断主行（row 1: ASDFGHJKL）
- `ambidextrous`：需要 `HAND_MAP` 判断左右手，在词完成时检查
- `constellation`：需要计算相邻簇大小，BFS/DFS 遍历已绑定键位
- `lone_wolf`：需要 `ADJACENT_KEYS` 检查是否有相邻技能

---

### Story 1.4: 添加 T6 经济新遗物（2 个新增）

**目标**：添加 cornucopia、interest_gem

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 2 个遗物数据 + 工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | 扩展 `queryRelicFlag` 支持 `cornucopia`（关卡开始加金）和 `interest_gem`（关卡结束利息） |
| `src/src/systems/battle.ts` | 在 battle start/end 调用对应 flag |
| `src/tests/unit/systems/relics/` | 新建 `relics.t6.test.ts` |

---

### Story 1.5: 添加 T7 风险回报新遗物（2 个新增）

**目标**：添加 ramen、overcharge

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 2 个遗物数据 + 工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | `ramen`：需要可变状态（当前倍率），`queryRelicFlag('ramen')` 返回当前值；`overcharge`：产出者触发时扣时间 |
| `src/src/systems/battle.ts` | 集成 ramen 衰减逻辑（on_error 时 -0.1×）、overcharge 扣时（on_skill_trigger） |
| `src/tests/unit/systems/relics/` | 新建 `relics.t7.test.ts` |

**实现要点**：
- `ramen` 需要 Run 级别的可变状态：`relicStates: Map<string, number>`
  - 初始值 1.5，每次 on_error 时 -= 0.1
  - 降至 1.0 时自动移除遗物
- `overcharge` 每次产出者触发 -0.1s，通过 behavior 执行

---

## Epic 2: 槽位系统

### Story 2.1: 10 槽位限制

**目标**：遗物上限 10 个，绑定数字键 1-0

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/core/types.ts` | `PlayerState.relics` 类型不变（Set），但添加常量 `MAX_RELIC_SLOTS = 10` |
| `src/src/core/state.ts` | `addRelic` 方法添加上限检查，满时返回 false |
| `src/src/core/state/RunState.ts` | `addRelic` 方法添加同样的上限检查 |
| `src/src/systems/relicPicker.ts` | 满 10 个时显示替换 UI 而非直接添加 |
| `src/src/systems/restStage.ts` | `grantRandomRelic` 检查槽位 |
| `src/src/systems/battle.ts` | `renderRelicDisplay` 改为 10 槽位 UI（数字键标签） |
| `src/tests/unit/core/state/RunState.test.ts` | 添加上限测试 |
| `src/tests/unit/systems/relics/` | 新建 `relics.slots.test.ts` |

**UI 设计**：
```
[1:🍀] [2:💣] [3:⏰] [4:🤑] [5:  ] [6:  ] [7:  ] [8:  ] [9:  ] [0:  ]
```
空槽位显示为空框，已占槽位显示遗物图标 + 数字键标签。

---

### Story 2.2: 遗物替换/卖出机制

**目标**：槽位满时可以选择替换旧遗物

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/relicPicker.ts` | 满槽时进入替换模式：先选新遗物，再选要替换的旧遗物 |
| `src/src/core/state.ts` | 添加 `removeRelic(relicId)` + `replaceRelic(oldId, newId)` |
| `src/src/core/state/RunState.ts` | 同步添加移除/替换方法 |
| `src/src/systems/battle.ts` | 更新 UI 渲染 |
| `src/tests/unit/systems/relics/` | 扩展 `relics.slots.test.ts` |

**卖出金币**：卖出遗物返还 `basePrice × 0.5` 金币（和技能卖出一致）。

---

## Epic 3: 获取渠道

### Story 3.1: 重构开局三选一（稀有度权重）

**目标**：保留三选一弹窗，但加入稀有度权重

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/relicPicker.ts` | `generateRelicCandidates` 改为加权随机：普通 70% / 稀有 25% / 传说 5% |
| `src/tests/unit/systems/relics/` | 新建 `relicPicker.test.ts`：权重分布测试 |

**实现**：移除 `level % 5` 触发逻辑，开局三选一仅在 `level === 1` 时触发。

---

### Story 3.2: 精英关掉落

**目标**：精英关（Node 3/6/9）胜利后三选一遗物掉落

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/battle.ts` | 精英关胜利后触发 `showRelicPicker`，权重：稀有 60% / 传说 40% |
| `src/src/systems/relicPicker.ts` | `generateRelicCandidates` 接受可选的权重参数 |
| `src/src/systems/stage/stageFlow.ts` | 确认精英关节点判断逻辑 |
| `src/tests/unit/systems/relics/` | 扩展 `relicPicker.test.ts` |

---

### Story 3.3: 商店遗物位

**目标**：商店固定 1 个遗物购买位

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/core/types.ts` | `ShopItem.type` 扩展 `'relic'`，添加 `relicId?: string` |
| `src/src/systems/shop.ts` | 生成商品时添加 1 个遗物位；按 Act 加权稀有度；定价：普通 50 / 稀有 100 / 传说 200 |
| `src/src/systems/battle.ts` | 商店渲染支持遗物商品卡片 |
| `src/tests/unit/systems/shop.test.ts` | 添加遗物商品测试 |

---

### Story 3.4: Boss 传说掉落

**目标**：Boss 关（Node 10）胜利后三选一传说遗物

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/battle.ts` | Boss 胜利后触发传说级 `showRelicPicker`，权重：传说 100% |
| `src/src/systems/relicPicker.ts` | 支持仅传说过滤；传说不足 3 个时用稀有补充 |

---

### Story 3.5: 休息事件调整

**目标**：对齐已有休息事件的遗物逻辑

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/restStage.ts` | `grantRandomRelic` 检查 10 槽位上限；满时提供替换选择 |

**说明**：休息事件已有 `grantRandomRelic`/`removeRandomRelic`，仅需适配槽位限制。

---

## Epic 4: T2 累积成长系统

### Story 4.1: 遗物状态持久化

**目标**：为 T2 遗物提供 Run 级别的可变状态存储

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/core/state/RunState.ts` | `RunStateData` 添加 `relicStates: Map<string, number>`；序列化/反序列化支持 |
| `src/src/core/types.ts` | `GameState` 添加 `relicStates: Map<string, number>` |
| `src/src/core/state.ts` | 初始化和重置 `relicStates` |
| `src/src/systems/relics/RelicPipeline.ts` | 添加 `getRelicState(relicId)` / `setRelicState(relicId, value)` |
| `src/tests/unit/core/state/RunState.test.ts` | relicStates 序列化往返测试 |

**状态用途**：
- `campfire_ember`：购买技能计数（幕重置）
- `star_chart`：获得附魔计数（永久）
- `entropy`：当前加成百分比（每关衰减）
- `schrodinger_dice`：存在标记（自毁判定）
- `ramen`（T7）：当前倍率值（打错衰减）

---

### Story 4.2: 4 个 T2 遗物实现

**目标**：实现 campfire_ember、star_chart、entropy、schrodinger_dice

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 4 个遗物数据 + 工厂（工厂读取 `relicStates`） |
| `src/src/systems/relics/RelicPipeline.ts` | 工厂函数中通过 `getRelicState` 读取动态值 |
| `src/src/systems/battle.ts` | 关卡开始/结束时更新状态（entropy -5%、schrodinger_dice 判定） |
| `src/src/systems/shop.ts` | 购买技能时更新 campfire_ember 计数 |
| `src/tests/unit/systems/relics/` | 新建 `relics.t2.test.ts` |

**关键事件钩子**：
- `on_battle_start`：entropy 检查当前值
- `on_battle_end`：entropy 衰减、schrodinger_dice 自毁判定
- `on_skill_purchase`（新事件）：campfire_ember 递增
- `on_enchant_acquire`（新事件）：star_chart 递增
- `on_act_end`：campfire_ember 重置

---

## Epic 5: T3 重触发系统

### Story 5.1: 重触发管道支持

**目标**：在 Modifier 管道中支持"技能重触发"语义

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/modifiers/ModifierTypes.ts` | `Behavior` 类型添加 `'retrigger'` |
| `src/src/systems/modifiers/BehaviorExecutor.ts` | 处理 retrigger 行为：标记技能本次需要重触发 |
| `src/src/systems/relics/RelicPipeline.ts` | `resolveRelicEffects` 返回值添加 `retriggerSkills: string[]` |
| `src/src/systems/battle.ts` | 技能触发后检查 retrigger 列表，若命中则再次执行该技能 |
| `src/tests/unit/systems/modifiers/` | BehaviorExecutor retrigger 测试 |

**防循环**：重触发的技能标记 `isRetriggered = true`，不可被再次重触发。

---

### Story 5.2: 3 个 T3 遗物实现

**目标**：实现 echo_bell、storm_drum、finale

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 3 个遗物数据 + 工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | 工厂产出 retrigger 类型 behavior |
| `src/tests/unit/systems/relics/` | 新建 `relics.t3.test.ts` |

**条件判断**：
- `echo_bell`：`ctx.isFirstSkillInWord === true`
- `storm_drum`：`ctx.currentSkillCategory === 'producer'`
- `finale`：`ctx.isLastWordInBattle === true`（需要在 battle.ts 中标记）

---

## Epic 6: T4 规则改造系统

### Story 6.1: 技能限制框架

**目标**：为 T4 遗物提供"禁用子系统"的通用框架

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/systems/relics/RelicPipeline.ts` | `queryRelicFlag` 扩展支持新 flag：`skill_category_lock`、`max_skill_count`、`max_skill_level`、`enchant_lock`、`connector_lock` |
| `src/src/systems/shop.ts` | 商品生成时检查 flag 过滤技能类别/等级 |
| `src/src/systems/battle.ts` | 连接者触发前检查 `connector_lock` |
| `src/src/core/state.ts` | `addSkill` 前检查数量和类别限制 |
| `src/tests/unit/systems/relics/` | 新建 `relics.t4.test.ts`：限制生效测试 |

**通用检查点**：
```
商店生成商品 → 检查 skill_category_lock / max_skill_level
购买技能    → 检查 max_skill_count
绑定技能    → 检查 skill_category_lock
附魔选择    → 检查 enchant_lock
连接者触发  → 检查 connector_lock
```

---

### Story 6.2: 5 个 T4 遗物实现

**目标**：实现 pure_heart、minimalist、keyboard_flood、no_enchant_vow、chain_ban

> silence_vow 已存在，仅需重新分类到 T4。

**修改文件**：

| 文件 | 操作 |
|------|------|
| `src/src/data/relics.ts` | 添加 5 个遗物数据 + 工厂 |
| `src/src/systems/relics/RelicPipeline.ts` | 工厂返回限制性 flag + 增益 modifier |
| `src/src/systems/shop.ts` | 集成限制检查 |
| `src/src/systems/battle.ts` | 集成限制检查 |
| `src/tests/unit/systems/relics/` | 扩展 `relics.t4.test.ts` |

**分批建议**：
- 批次 A（简单 flag）：chain_ban、no_enchant_vow
- 批次 B（商店过滤）：pure_heart、keyboard_flood
- 批次 C（等级覆写）：minimalist

---

## 实现节奏建议

| 阶段 | Epic | 预计产出 | 新增遗物 | 累计遗物 |
|------|------|----------|----------|----------|
| Phase 1 | Epic 1 | 数据层就绪 | +13 新 / -6 旧 | 22 |
| Phase 2 | Epic 2 + 3 | 槽位+获取系统 | — | 22 |
| Phase 3 | Epic 4 | T2 累积成长 | +4 | 26 |
| Phase 4 | Epic 5 | T3 重触发 | +3 | 29 |
| Phase 5 | Epic 6 | T4 规则改造 | +5 | 34 |

> 每个 Phase 完成后都应有可玩的完整系统。Phase 1-2 是最小可用版本。
