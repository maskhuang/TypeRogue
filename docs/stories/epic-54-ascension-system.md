---
title: "Epic 54: Ascension（进阶）难度递进系统"
epic_key: "epic-54"
status: "draft"
created: "2026-04-04"
design_doc: "docs/planning-artifacts/ascension-system-design.md"
stories:
  - "54-1-ascension-state-persistence"
  - "54-2-practice-stage-gold-mapping"
  - "54-3-ascension-level-selector-ui"
  - "54-4-a1-a2-economy-modifiers"
  - "54-5-a3-a4-combat-pressure"
  - "54-6-a5-a6-rule-changes"
  - "54-7-a7-a8-resource-scarcity"
  - "54-8-a9-a10-ultimate-trial"
  - "54-9-hud-unlock-feedback"
  - "54-10-balance-integration-test"
---

# Epic 54: Ascension（进阶）难度递进系统

## 背景

当前游戏通关后缺乏持续挑战动力。核心循环（打字→技能→资源→构筑）一旦被玩家掌握，难度天花板就被摸到了。需要一套类似杀戮尖塔 Ascension 的系统：10 级累积 debuff，每个职业独立追踪，通关当前级别解锁下一级。

## 设计目标

- **重玩驱动**：给已通关玩家 10 级挑战台阶
- **渐进压力**：低级偏数值压缩（钱少、物贵），高级改变游戏规则（modifier 提前、词库缩减）
- **职业差异化**：同一级别对不同职业产生不同痛点，独立追踪增加 3 倍重玩空间
- **向后兼容**：A0 = 当前难度，不影响现有玩家体验

## 10 级 Ascension 效果

| 级别 | 名称 | 效果 |
|------|------|------|
| A1 | 贫穷起步 | 练习关金币转换效率 ×0.75 |
| A2 | 物价上涨 | 商店所有价格 +15% |
| A3 | 精英压力 | 精英关 modifier 不再弱化 |
| A4 | 时间紧缩 | cycle 时间衰减 0.9 → 0.85 |
| A5 | 构筑限缩 | 商店刷新上限 3 次/关 |
| A6 | 暴露弱点 | 第 2 关起携带 1 个随机弱化 modifier |
| A7 | 稀缺资源 | 遗物槽位 10 → 8 |
| A8 | 词库压缩 | 初始词库 -30% |
| A9 | 强制对抗 | Boss 每次叠 2 个 modifier |
| A10 | 终极试炼 | 目标分增长率 1.45 → 1.55；错误扣 2 秒 |

**附加：** 练习关最低分地板 = ascensionLevel × 50

## 练习关金币映射

练习关（第 1 关，30 秒，无目标分）结算后映射初始金币：

```
effectiveScore = max(practiceScore, ascensionLevel × 50)
rawGold = 100 + bonusFromScore(effectiveScore)

bonusFromScore 分段：
  0-200:    0.1g/分
  200-500:  0.06g/分
  500+:     0.02g/分

gold = floor(rawGold × (ascensionLevel >= 1 ? 0.75 : 1.0))
hardCap = 160
```

---

## Stories

### 54-1: Ascension 状态持久化

**作为**玩家，**我想要**我的 Ascension 进度在游戏关闭后保存，**以便**下次可以继续挑战更高级别。

**AC:**
1. MetaState 新增 `ascension: { none: number, wordsmith: number, metamorph: number }` 字段（默认均为 0）
2. 序列化/反序列化正确处理该字段（旧存档默认 0，向后兼容）
3. RunState 新增 `ascensionLevel: number` 记录本局选择的级别
4. 通关时若 ascensionLevel === 当前职业已解锁最高级 → 该职业 ascension + 1（上限 10）
5. MetaState 序列化版本号递增

**关键文件:**
- `src/core/state/MetaState.ts` — 新增 ascension 字段
- `src/core/state/RunState.ts` — 新增 ascensionLevel
- `src/core/types.ts` — MetaSaveData 扩展
- `src/shared/types.ts` — SaveData 兼容

---

### 54-2: 练习关金币映射

**作为**玩家，**我想要**练习关的表现决定我的初始金币，**以便**打得好有经济优势。

**AC:**
1. 练习关结算时计算 effectiveScore = max(practiceScore, ascensionLevel × 50)
2. effectiveScore 作为目标分增长基准（取代固定 TARGET_BASE）
3. 初始金币按分段映射公式计算（100g 起步 + 递减奖励，上限 160g）
4. A1+ 时金币转换效率 ×0.75
5. 金币在练习关结算界面显示

**关键文件:**
- `src/systems/battle.ts` — 练习关结算逻辑
- `src/core/constants.ts` — 金币映射参数常量
- `src/systems/stage/stageFlow.ts` — TARGET_BASE 动态化

---

### 54-3: Ascension 级别选择器 UI

**作为**玩家，**我想要**在开局时选择 Ascension 级别，**以便**自主控制挑战难度。

**AC:**
1. 职业选择后弹出 Ascension 级别选择器（0 ~ 已解锁最高级）
2. 每级显示：名称 + 效果简述 + 所有累积效果摘要
3. 默认选中最高已解锁级别
4. 可向下选择更低级别（用于练习或休闲）
5. 确认后写入 RunState.ascensionLevel
6. A0 不显示选择器（直接跳过）— 仅当已解锁 A1+ 时才显示
7. i18n 支持（中英文名称+描述）

**关键文件:**
- `src/systems/shop.ts` 或新文件 — 选择器 UI
- `src/demo/demo-i18n.ts` — ascension.* 国际化键
- `src/core/state/RunState.ts` — 读写 ascensionLevel

---

### 54-4: A1-A2 经济修正器

**作为** A1/A2 玩家，**我想要**体验到经济压力，**以便**学会精打细算。

**AC:**
1. **A1 (ascensionLevel >= 1):** 练习关金币映射结果 ×0.75（在 54-2 实现，本 story 仅验证）
2. **A2 (ascensionLevel >= 2):** 商店所有商品价格 ×1.15（技能、遗物、附魔、词包、刷新费用）
3. 价格上涨后仍取整（floor）
4. 涨价在 tooltip/UI 上有可见体现（原价划线 + 新价，或直接显示涨后价）

**关键文件:**
- `src/systems/shop.ts` — 价格计算 `getAscensionPriceMultiplier()`
- `src/core/constants.ts` — A2_PRICE_MULT = 1.15

---

### 54-5: A3-A4 战斗压力

**作为** A3/A4 玩家，**我想要**感受到更强的战斗压力，**以便**被迫优化输出效率。

**AC:**
1. **A3 (ascensionLevel >= 3):** 精英关调用 `getParams()` 时不再传 `isElite=true`，改为 `isElite=false`（全力 modifier）
2. **A4 (ascensionLevel >= 4):** CYCLE_TIME_DECAY 从 0.9 降为 0.85
3. A4 下 cycle 3 的时间 = 30 × 0.85² ≈ 21.7s（对比 A0 的 30 × 0.9² = 24.3s）

**关键文件:**
- `src/systems/bossModifierEngine.ts` 或 `bossModifierPicker.ts` — isElite 条件
- `src/systems/stage/stageFlow.ts` — 时间衰减参数
- `src/core/constants.ts` — A4_CYCLE_TIME_DECAY = 0.85

---

### 54-6: A5-A6 规则变更

**作为** A5/A6 玩家，**我想要**面对游戏规则层面的改变，**以便**构筑策略需要根本性调整。

**AC:**
1. **A5 (ascensionLevel >= 5):** 商店刷新次数上限 3 次/关（含付费和免费刷新）。达到上限后刷新按钮禁用，显示 "已达上限"
2. **A6 (ascensionLevel >= 6):** run 开始时从 offense + defense 类 modifier 中随机选 1 个（排除 disruption），以 isElite=true（弱化参数）添加到 state.activeModifiers，从第 2 关起生效
3. A6 的初始 modifier 在 HUD 中可见（与 boss modifier 共享显示）

**关键文件:**
- `src/systems/shop.ts` — 刷新计数 + 上限检查
- `src/systems/bossModifierPicker.ts` — 初始 modifier 选择
- `src/systems/bossModifierEngine.ts` — 应用初始 modifier
- `src/core/state/RunState.ts` — 可能需要 refreshCount per stage

---

### 54-7: A7-A8 资源稀缺

**作为** A7/A8 玩家，**我想要**面对更少的资源，**以便**每个选择都更有份量。

**AC:**
1. **A7 (ascensionLevel >= 7):** MAX_RELIC_SLOTS 从 10 降为 8。遗物 UI 正确显示 8 槽。已有 10 个遗物的存档在 A7 加载时不丢失（超出部分保留但不触发效果？或禁止超额？需确认）
2. **A8 (ascensionLevel >= 8):** run 开始时随机移除 30% 词库（使用 seededRandom 确保同 seed 一致）。造词师的可造词列表相应缩减。词库压缩在 "练习关之前" 执行（练习关也用压缩后词库）

**关键文件:**
- `src/data/relics.ts` — MAX_RELIC_SLOTS 动态化 `getMaxRelicSlots()`
- `src/data/wordPacks.ts` 或 `words.ts` — 词库压缩逻辑
- `src/systems/classes/CraftingStation.ts` — 可造词跟随压缩

---

### 54-8: A9-A10 终极试炼

**作为** A9/A10 玩家，**我想要**面对极限挑战，**以便**证明自己的实力。

**AC:**
1. **A9 (ascensionLevel >= 9):** Boss 关每次叠加 2 个 modifier（而非 1 个）。两个 modifier 不重复
2. **A10 (ascensionLevel >= 10):** TARGET_GROWTH 从 1.45 调为 1.55。错误输入额外扣除 2 秒时间（在现有打断/重置之上叠加）
3. 错误扣时间有明显视觉反馈（闪红 + 时间条抖动）

**关键文件:**
- `src/systems/bossModifierPicker.ts` — modifier 选取数量
- `src/core/constants.ts` — TARGET_GROWTH 动态化
- `src/systems/battle.ts` — 错误处理新增扣时间

---

### 54-9: HUD 显示 + 解锁反馈

**作为**玩家，**我想要**清楚看到当前 Ascension 级别和解锁进度，**以便**获得成就感。

**AC:**
1. 战斗 HUD 角落显示当前 Ascension 级别标识（如 "A7"），A0 不显示
2. 商店界面也显示 Ascension 标识
3. 通关结算界面显示 Ascension 级别（区分成就含金量）
4. 通关解锁新级别时弹出 "Ascension X 已解锁！" + 下一级效果预览
5. 收藏界面（CollectionScene）展示各职业 Ascension 进度
6. i18n: 所有 Ascension 名称/描述中英文

**关键文件:**
- `src/effects/juice.ts` 或新文件 — 解锁动画
- `src/ui/hud/BattleHUD.ts` — Ascension 标识
- `src/scenes/collection/CollectionScene.ts` — 进度展示
- `src/demo/demo-i18n.ts` — ascension.a1_name / ascension.a1_desc 等

---

### 54-10: 平衡调整与集成测试

**作为**开发者，**我想要**验证 10 级 Ascension 的数值平衡和系统集成，**以便**确保体验符合设计意图。

**AC:**
1. 各级 Ascension 效果正确累积（A5 = A1+A2+A3+A4+A5 全部生效）
2. 练习关金币映射数值验证（边界值：0分/极高分/各 Ascension 级别）
3. A6 初始 modifier 与后续 boss modifier 正确共存（不冲突、不重复）
4. A8 词库压缩不会导致关键系统崩溃（空词库保护、造词台空列表保护）
5. A9 双 modifier 在所有 15 种 modifier 组合下无冲突
6. A10 增长率 + 错误扣时间在长局（20+ 关）下不导致数值溢出
7. 存档兼容性：旧存档加载后 ascension 默认 0，不影响游戏
8. 写平衡测试用例（各级通关可行性 spot check）

**关键文件:**
- `tests/unit/` — Ascension 相关测试
- 全部已修改文件的回归测试

---

## 依赖关系

```
54-1 (状态持久化)
  ├── 54-2 (金币映射) — 需要 RunState.ascensionLevel
  ├── 54-3 (选择器 UI) — 需要 MetaState.ascension
  │
  ├── 54-4 (A1-A2) ─┐
  ├── 54-5 (A3-A4) ─┤
  ├── 54-6 (A5-A6) ─┼── 均需要 ascensionLevel 可读
  ├── 54-7 (A7-A8) ─┤
  └── 54-8 (A9-A10) ┘
        │
        54-9 (HUD/反馈) — 需要各级效果已实现
        │
        54-10 (平衡测试) — 需要全部功能完成
```

54-1 是唯一硬性前置。54-2 到 54-8 可并行开发。54-9 和 54-10 收尾。
