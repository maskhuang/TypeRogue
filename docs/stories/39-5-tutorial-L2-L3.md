# Story 39.5: L2-L3 进阶引导内容（词条系统 + 附魔系统）

Status: done

## Story

As a 已完成首次 Run 的玩家,
I want 在首次接触词条机制和附魔系统时看到针对性的引导提示,
so that 我能理解稀有度→词条→附魔的进阶构筑体系，做出更有意义的购买决策。

## Acceptance Criteria

1. **AC1**: 首次获得带词条（蓝色+）技能时 L2_affix_intro 触发，高亮技能卡片
2. **AC2**: 首次获得拓扑型词条技能时 L2_affix_positional 触发，提示注意键盘位置
3. **AC3**: 首次技能达到附魔资格时 L3_enchant_unlock 触发
4. **AC4**: 首次附魔成长效果生效时 L3_enchant_growth 触发，指向 Tooltip 中的进度显示
5. **AC5**: 所有步骤有 i18n 中英双语文本
6. **AC6**: 各步骤独立触发互不干扰，不会因同一事件同时弹出多个引导（TutorialManager 防重入机制）
7. **AC7**: 引导出现时不影响商店操作（购买、拖拽等交互仍可响应）

## Tasks / Subtasks

- [x] Task 1: 定义 L2-L3 引导步骤数据 (AC: 1-4)
  - [x] 1.1 在 `data/tutorialSteps.ts` 新增 `L2_STEPS: TutorialStep[]`（4 步）
  - [x] 1.2 在 `data/tutorialSteps.ts` 新增 `L3_STEPS: TutorialStep[]`（2 步）
  - [x] 1.3 更新 `FULL_TUTORIAL_STEPS` 为 `[...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS]`
  - [x] 1.4 L2 各步骤无互相 prerequisite（独立触发，TutorialManager 防重入处理冲突）
  - [x] 1.5 L3_enchant_growth prerequisite = L3_enchant_unlock
  - [x] 1.6 condition 留空，由 `tutorialInit.ts` 注入

- [x] Task 2: 注入 condition 函数 (AC: 1-4, 6)
  - [x] 2.1 在 `tutorialInit.ts` 扩展 `shop:purchase` 监听器：提取购买技能的 rarity 和 affix 信息
  - [x] 2.2 新增 flag 变量：`lastPurchaseSkillRarity`、`lastPurchaseHasTopologyAffix`
  - [x] 2.3 L2_affix_intro condition: `() => lastPurchaseSkillRarity >= 1`
  - [x] 2.4 L2_affix_positional condition: `() => lastPurchaseHasTopologyAffix`
  - [x] 2.5 L2_affix_variety condition: `() => lastPurchaseSkillRarity >= 2`
  - [x] 2.6 L2_rarity_explain condition: `() => lastPurchaseSkillRarity >= 3`
  - [x] 2.7 新增 `skill:upgraded` 监听器中的 flag：`lastUpgradeReachedEnchantLevel`
  - [x] 2.8 L3_enchant_unlock condition: `() => lastUpgradeReachedEnchantLevel`
  - [x] 2.9 新增 `skill:triggered` 监听器中的 flag：`lastTriggerHadGrowth`（检查 `growthValue > 0 || questCompleted`）
  - [x] 2.10 L3_enchant_growth condition: `() => lastTriggerHadGrowth`
  - [x] 2.11 更新 `tutorialManager.register()` 调用：包含 L2_STEPS + L3_STEPS
  - [x] 2.12 从 `data/affixes` 导入 `AFFIX_CATEGORY_MAP`，从 `systems/relics/EnchantmentRelicBehaviors` 导入 `getMinEnchantmentLevel`

- [x] Task 3: i18n 文本 (AC: 5)
  - [x] 3.1 在 `demo-i18n.ts` 新增 12 个 i18n key（6 对 title+body）
  - [x] 3.2 中文文本参考 Epic 39 表格
  - [x] 3.3 英文文本简短直接

- [x] Task 4: 更新现有测试 (AC: 1-5)
  - [x] 4.1 更新 `tutorialL0L1.test.ts` 中 `FULL_TUTORIAL_STEPS` 长度断言：8 → 14
  - [x] 4.2 新建 `tests/unit/systems/tutorial/tutorialL2L3.test.ts`
  - [x] 4.3 L2 步骤数据测试：4 步 ID 唯一、level=2、无互相 prerequisite
  - [x] 4.4 L3 步骤数据测试：2 步 ID 唯一、level=3、prerequisite 链正确
  - [x] 4.5 L2 触发事件测试：4 步均为 `shop:purchase`
  - [x] 4.6 L3 触发事件测试：enchant_unlock=`skill:upgraded`、enchant_growth=`skill:triggered`
  - [x] 4.7 i18n 完整性测试：12 个 key 在 zh/en 两个 locale 中都存在

- [ ] Task 5: 手动验证 (AC: 1-4, 7) — 未执行，需运行游戏实际操作验证
  - [ ] 5.1 购买蓝色技能：验证 L2_affix_intro 触发
  - [ ] 5.2 购买拓扑型词条技能：验证 L2_affix_positional 触发
  - [ ] 5.3 技能升至 Lv.3：验证 L3_enchant_unlock 触发
  - [ ] 5.4 附魔成长效果生效：验证 L3_enchant_growth 触发
  - [ ] 5.5 验证引导不遮挡商店购买/拖拽操作

## Dev Notes

### 步骤设计（6 步）

Epic 定义了 7 步（L2×4 + L3×3），本实现合并为 **6 步**（L2×4 + L3×2）：

| 步骤 ID | 触发事件 | condition | 锚定 | 说明 |
|---------|---------|-----------|------|------|
| `L2_affix_intro` | `shop:purchase` | rarity ≥ 1 | `reward-cards` | 首次获得蓝色技能 |
| `L2_affix_positional` | `shop:purchase` | 有 topology 词条 | `skill-trigger-zone` | 首次获得拓扑型词条 |
| `L2_affix_variety` | `shop:purchase` | rarity ≥ 2 | `reward-cards` | 首次获得紫色（2 词条）技能 |
| `L2_rarity_explain` | `shop:purchase` | rarity ≥ 3 | `reward-cards` | 首次获得橙色（3 词条）技能 |
| `L3_enchant_unlock` | `skill:upgraded` | newLevel ≥ enchantLevel | `enchantment-modal` | 首次达到附魔资格 |
| `L3_enchant_growth` | `skill:triggered` | growthValue > 0 | `skill-trigger-zone` | 首次附魔成长 |

### L3 步骤合并说明

Epic 原定 L3_enchant_choose（首次进入附魔选择界面）与 L3_enchant_unlock 存在时序冲突：

1. `skill:upgraded` 触发 → L3_enchant_unlock 显示浮窗
2. `checkAutoEnchantment()` 立即运行 → 附魔模态框打开（在浮窗下方）
3. 用户关闭 L3_enchant_unlock → 附魔模态框已可见
4. L3_enchant_choose 的事件已错过（模态框在步骤完成前就已打开）

**解决方案**：将 L3_enchant_choose 的引导内容合并到 L3_enchant_unlock 的 body 文本中（"技能满级了！选择附魔：学徒型随使用成长，任务型完成目标获得永久加成"）。AC 中也未单独列出 L3_enchant_choose。

### L2_rarity_explain 偏差说明

Epic 定义为"首次在商店看到橙色技能"（`shop:opened` + 检查商品稀有度），但实现改为"首次购买橙色技能"（`shop:purchase` + rarity ≥ 3）。原因：

- 商店物品数据在 `ShopScene.ts`（scenes 层）中生成，从 `tutorialInit.ts`（systems 层）无法直接访问
- 依赖方向规则：`systems/ → scenes/` 方向禁止
- 改为购买触发是最小侵入方案

### condition 注入模式（延续 39.4）

所有 condition 函数在 `systems/tutorial/tutorialInit.ts` 中通过闭包注入，步骤骨架保留在 `data/tutorialSteps.ts`（纯数据层，无 import）。

```typescript
// tutorialInit.ts 伪代码
let lastPurchaseSkillRarity = -1
let lastPurchaseHasTopologyAffix = false
let lastUpgradeReachedEnchantLevel = false
let lastTriggerHadGrowth = false

// 扩展已有 shop:purchase 监听器
eventBus.on('shop:purchase', (data) => {
  lastPurchaseWasSkill = data.type === 'skill'  // 已有(L1)
  if (data.type === 'skill') {
    const skill = state.affixSkills.get(data.itemId)
    if (skill) {
      lastPurchaseSkillRarity = skill.rarity
      lastPurchaseHasTopologyAffix = skill.affixes.some(
        a => AFFIX_CATEGORY_MAP[a.type] === 'topology'
      )
    }
  }
})

eventBus.on('skill:upgraded', (data) => {
  lastUpgradeReachedEnchantLevel = data.newLevel >= getMinEnchantmentLevel()
})

eventBus.on('skill:triggered', (data) => {
  if ((data.growthValue && data.growthValue > 0) || data.questCompleted) {
    lastTriggerHadGrowth = true
  }
})
```

### 防重入行为

TutorialManager 同一时刻只显示一个浮窗（39.3 AC9）。当同一 `shop:purchase` 事件同时满足多个 L2 步骤条件时：

1. 第一个通过检查的步骤显示浮窗
2. 后续步骤的监听器仍触发，但因浮窗已显示而被丢弃
3. 下次满足条件的事件到来时，已完成步骤跳过，下一个待完成步骤触发

**示例**：玩家首次购买紫色拓扑词条技能（rarity=2, has topology affix）

- L2_affix_intro（rarity≥1）→ 触发，显示浮窗
- L2_affix_positional（topology affix）→ 丢弃（浮窗已显示）
- L2_affix_variety（rarity≥2）→ 丢弃
- 下次购买技能时，L2_affix_intro 已完成 → L2_affix_positional 或 L2_affix_variety 触发

### 技能稀有度映射

```
rarity 0 → 白色（0 词条） — 起始技能
rarity 1 → 蓝色（1 词条） — 首次出现约第 2 关后
rarity 2 → 紫色（2 词条） — 中期出现
rarity 3 → 橙色（3 词条） — 后期稀有
```

稀有度由 `skillGeneration.ts:rollRarity()` 随机掷骰，概率分布在 `RARITY_PROBABILITIES` 中。

### 词条类别（来源：`data/affixes.ts`）

| 类别 | AffixCategory | 词条类型 |
|------|--------------|---------|
| 数值型 | `numeric` | Multiply, Convert, Rainbow |
| 节奏型 | `rhythm` | Charge, Decay, Pulse, Crit, Cascade |
| **拓扑型** | `topology` | **Void, Resonance, Mirror** |
| 触发链型 | `trigger_chain` | Link, Splash, Amplify |
| 单词感知型 | `word_sense` | Outcast, Gravity, Ligature |
| 元规则型 | `meta_rule` | Twin, Recurse, Taboo |

L2_affix_positional 检测 `topology` 类别。使用 `AFFIX_CATEGORY_MAP[affix.type] === 'topology'`。

### 附魔资格检查

- 默认：技能等级 ≥ 3（Lv.3 满级）
- 持有遗物 `early_awakening`（早期觉醒）：等级 ≥ 2
- 检查函数：`getMinEnchantmentLevel()`（位于 `systems/relics/EnchantmentRelicBehaviors.ts`）
- L3_enchant_unlock condition 应使用此函数而非硬编码 3

### L3_enchant_growth 触发时机

附魔成长发生在战斗中，通过以下路径：

1. **学徒型附魔**：每次技能触发时 `applyApprenticeEvent()` 累加 `growthValue`
2. **任务型附魔**：满足条件时 `applyQuestEvent()` 增加 `questStacks`
3. `skill:triggered` 事件已携带 `growthValue` 和 `questCompleted` 字段
4. 条件：`growthValue > 0 || questCompleted === true`

### DOM 锚点

| 步骤 | 锚点 ID | 锚定方向 | 说明 |
|------|---------|---------|------|
| L2_affix_intro | `reward-cards` | top | 商品区上方（技能卡片） |
| L2_affix_positional | `skill-trigger-zone` | bottom | 键盘区下方（位置关系） |
| L2_affix_variety | `reward-cards` | top | 商品区上方 |
| L2_rarity_explain | `reward-cards` | top | 商品区上方 |
| L3_enchant_unlock | `enchantment-modal` | bottom | 附魔模态框下方 |
| L3_enchant_growth | `skill-trigger-zone` | top | 键盘区上方（Tooltip 显示进度） |

### 关键架构约束

1. **依赖方向**: `data/ → core/ → systems/`
   - `data/tutorialSteps.ts` 不 import 任何模块（纯数据）
   - `systems/tutorial/tutorialInit.ts` 可 import `data/affixes`（AFFIX_CATEGORY_MAP） + `systems/relics/EnchantmentRelicBehaviors`（getMinEnchantmentLevel）
2. **三层状态**: 教程进度 = MetaState（永久），combo/growthValue = BattleState（每关重置）
3. **不修改 TutorialStep 接口**: condition 签名保持 `() => boolean`
4. **初始化守卫**: `tutorialInit.ts` 已有 `if (initialized) return` 防止双重注册
5. **`skill:triggered` 高频事件**: 监听器仅做 flag 赋值（O(1)），不影响帧预算

### 39.4 Code Review 经验教训

1. 不写 dead code condition（39.4 L0_welcome 的 condition 两分支均 return true → 已修正为移除）
2. 不遗漏 `replaceRelic()` 路径（39.4 code review 发现 replaceRelic 绕过 addRelicWithCapacity → 已修正）
3. 初始化函数需防双重调用（`initialized` 守卫）
4. 测试任务如无独立测试应诚实标注（不写"代码审查确认"伪装已测试）

### Project Structure Notes

- 修改 `data/tutorialSteps.ts`：新增 L2_STEPS + L3_STEPS 数据
- 修改 `systems/tutorial/tutorialInit.ts`：新增 L2-L3 condition 注入 + flag 变量 + 事件监听器
- 修改 `demo/demo-i18n.ts`：12 个新 i18n key（6 对 title+body）
- 修改 `tests/unit/systems/tutorial/tutorialL0L1.test.ts`：更新 FULL_TUTORIAL_STEPS 长度
- 新建 `tests/unit/systems/tutorial/tutorialL2L3.test.ts`：L2-L3 数据 + i18n 测试

### References

- [Source: docs/stories/epic-39-tutorial-readability.md#Story 39.5 — L2-L3 步骤规格表]
- [Source: docs/stories/39-4-tutorial-L0-L1.md — L0-L1 实现模式 + code review 经验]
- [Source: docs/stories/39-3-tutorial-manager-infra.md — TutorialManager API、防重入机制]
- [Source: src/src/data/affixes.ts:13-40 — AffixType 枚举]
- [Source: src/src/data/affixes.ts:44-67 — AFFIX_CATEGORY_MAP（topology 类别）]
- [Source: src/src/data/affixes.ts:215-225 — AffixSkillInstance 接口（rarity 字段）]
- [Source: src/src/data/skillGeneration.ts:48-56 — rollRarity() 稀有度掷骰]
- [Source: src/src/systems/relics/EnchantmentRelicBehaviors.ts:47-49 — getMinEnchantmentLevel()]
- [Source: src/src/systems/shop.ts:1523-1560 — checkAutoEnchantment 流程]
- [Source: src/src/systems/shop.ts:1794-1800 — renderAffixEnchantmentModal（附魔模态框）]
- [Source: src/src/core/events/EventBus.ts:22 — skill:triggered 事件 payload（growthValue、questCompleted）]
- [Source: src/src/systems/tutorial/tutorialInit.ts — 现有 L0-L1 condition 注入模式]
- [Source: docs/project-context.md — 依赖方向/事件命名/状态管理规则]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 78/78 tests passed (5 test files in tutorial suite)

### Completion Notes List

- Task 1-4 完成，Task 5 (手动验证) 待代码审查后确认
- L3_enchant_choose 合并入 L3_enchant_unlock（时序冲突，详见 Dev Notes）
- L2_rarity_explain 改为购买触发（依赖方向约束，详见 Dev Notes）

### File List

- `src/src/data/tutorialSteps.ts` — 新增 L2_STEPS (4步) + L3_STEPS (2步)，更新 FULL_TUTORIAL_STEPS
- `src/src/systems/tutorial/tutorialInit.ts` — L2-L3 condition 注入 + flag 变量 + 事件监听器
- `src/src/systems/skills.ts` — skill:triggered emit 补充 growthValue + questCompleted 字段（code review fix）
- `src/src/demo/demo-i18n.ts` — 12 个新 i18n key（中英双语）
- `src/tests/unit/systems/tutorial/tutorialL0L1.test.ts` — FULL_TUTORIAL_STEPS 长度 8→14
- `src/tests/unit/systems/tutorial/tutorialL2L3.test.ts` — 新建 28 个测试用例
