# Story 36.3: 连击/倍率系统遗物

Status: done

## Story

As a player,
I want 5 combo/multiplier-related relics that modify combo retention, multiplier scaling, and combo-triggered effects,
so that I have meaningful strategic choices around my combo management and multiplier growth.

## Acceptance Criteria

1. **AC1 — 连击缓冲 (combo_buffer)**: combo 中断事件中保留 `floor(combo * 0.3)` 而非归零。combo 重置逻辑在 `playerWrong()` 中，需在 `state.combo = 0` 之前插入保留计算。

2. **AC2 — 倍率棱镜 (multiplier_prism)**: 当 `state.multiplier >= 2.5` 时，所有技能产出加算 +20%（通过 `RELIC_MODIFIER_DEFS` pipeline 修改器，trigger=`on_skill_trigger`, type=`multiply`, layer=`base`, condition=`multiplier_threshold`）。

3. **AC3 — 节奏医生 (rhythm_doctor)**: 追踪 combo 跨越 10 的倍数点（10/20/30…），每次跨越 +1s。利用 `state.lastMilestone` 或独立追踪机制，在 `playerCorrect()` 中 combo++ 后检查。

4. **AC4 — 连击引爆 (combo_detonator)**: combo 首次达到 15/30/45 时各触发一次，随机选 3 个已装备技能执行 `triggerSkill()`。用 `relicStates` 记录已触发的阈值，每关重置。

5. **AC5 — 不灭连击 (immortal_combo)**: 禁止 combo 重置（playerWrong 中跳过 `state.combo = 0` 和 `synergy.skillMultBonus = 0`）；同时阻止所有技能产出 `multiplier` 类型资源（在 `applyResource` 回调中拦截）。combo 跨关不重置（`startLevel()` 中跳过 `state.combo = 0`）。

6. **AC6 — 单元测试**: 每个遗物有独立行为测试，覆盖正常触发和边界情况。

## Tasks / Subtasks

- [x] Task 1: 添加 5 个遗物数据定义 (AC: #1-#5)
  - [x] 1.1 在 `data/relics.ts` 的 `RELICS` 中添加 5 个 RelicData 条目，含 `subsystem: 'combo'`
  - [x] 1.2 为行为型遗物设置 `behaviorType`：combo_detonator 和 immortal_combo
  - [x] 1.3 为 multiplier_prism 在 `RELIC_MODIFIER_DEFS` 中注册 pipeline modifier factory
  - [x] 1.4 更新 `relics.test.ts` 中遗物总数（15→20）和各稀有度计数断言

- [x] Task 2: 实现连击缓冲 (AC: #1)
  - [x] 2.1 创建 `systems/relics/ComboRelicBehaviors.ts`，导出 `calculateComboBuffer()` 函数
  - [x] 2.2 在 `playerWrong()` 中 combo 重置前插入缓冲计算
  - [x] 2.3 缓冲后若 combo > 0，按缓冲后 combo 重算 `state.multiplier`

- [x] Task 3: 实现倍率棱镜 (AC: #2)
  - [x] 3.1 在 `RELIC_MODIFIER_DEFS` 中注册 `multiplier_prism` factory（数据完整性）
  - [x] 3.2 在 `ComboRelicBehaviors.ts` 中导出 `getMultiplierPrismBonus()` 纯函数
  - [x] 3.3 在 `skills.ts` 的 `applyResource` 回调中应用 +20% 缩放
  - [x] 3.4 在反馈浮字中同步缩放显示值

- [x] Task 4: 实现节奏医生 (AC: #3)
  - [x] 4.1 在 `ComboRelicBehaviors.ts` 中导出 `checkRhythmDoctor()` 和 `syncRhythmDoctorMilestone()`
  - [x] 4.2 用 `relicStates['rhythm_doctor']` 记录上次触发的 10 倍数点
  - [x] 4.3 在 `playerCorrect()` 中 combo++ 后调用
  - [x] 4.4 combo 中断时同步 milestone

- [x] Task 5: 实现连击引爆 (AC: #4)
  - [x] 5.1 注册 `combo_detonator` 行为
  - [x] 5.2 在 `ComboRelicBehaviors.ts` 中导出 `checkComboDetonator()` 和 `resetComboDetonator()`
  - [x] 5.3 用 `relicStates['combo_detonator']` 作为 bitmask 记录已触发阈值
  - [x] 5.4 在 `playerCorrect()` 中 combo++ 后调用
  - [x] 5.5 触发逻辑：随机选 3 个 skillId 调用 `triggerSkill()`
  - [x] 5.6 在 `startLevel()` 中通过 `resetComboRelicState()` 重置

- [x] Task 6: 实现不灭连击 (AC: #5)
  - [x] 6.1 注册 `immortal_combo` 行为
  - [x] 6.2 在 `ComboRelicBehaviors.ts` 中导出 `hasImmortalCombo()` 和 `shouldBlockMultiplierResource()`
  - [x] 6.3 在 `playerWrong()` 中：若 `hasImmortalCombo()`，跳过整个 combo 重置块
  - [x] 6.4 在 `startLevel()` 中：若 `hasImmortalCombo()`，跳过 combo/maxCombo/multiplier/skillMultBonus 重置
  - [x] 6.5 在 `skills.ts` 的 `applyResource` 回调中：`shouldBlockMultiplierResource()` 拦截 multiplier 资源产出
  - [x] 6.6 设 immortal_combo 的 category 为 `risk-reward`，basePrice=0

- [x] Task 7: 注册模块初始化 (AC: #1-#5)
  - [x] 7.1 在 `ComboRelicBehaviors.ts` 导出 `initComboRelicBehaviors()` 注册 combo_detonator + immortal_combo 行为
  - [x] 7.2 在 `initInput()` 中调用 `initComboRelicBehaviors()`
  - [x] 7.3 在 `startLevel()` 中调用 `resetComboRelicState()` 重置关级别状态

- [x] Task 8: 单元测试 (AC: #6)
  - [x] 8.1 创建 `tests/unit/systems/relics/relics.combo.test.ts`（34 个测试）
  - [x] 8.2 连击缓冲：combo=10→3, combo=15→4, combo=0→0, combo=1→0, combo=100→30, 未持有→0
  - [x] 8.3 倍率棱镜：multiplier≥2.5→0.2, multiplier<2.5→0, 未持有→0
  - [x] 8.4 节奏医生：combo=10→+1s, combo=9→不触发, 跨越20再次触发, milestone同步
  - [x] 8.5 连击引爆：combo=15→3技能, combo=30→再次, combo=45→第三次, 45后不触发, 同阈值不重复, 重置后可重触发
  - [x] 8.6 不灭连击：hasImmortalCombo, shouldBlockMultiplierResource, 未持有→false
  - [x] 8.7 关级别重置：combo_detonator重置, rhythm_doctor重置, immortal_combo时rhythm_doctor不重置

## Dev Notes

### 当前系统状态（CRITICAL）

**已完成的基础设施（Story 36.1 + 36.2）：**
- `RelicBehaviorType` 已包含 `'combo_detonator'` 和 `'immortal_combo'`
- `RelicSubsystem` 已包含 `'combo'`
- `RelicConditionType` 已包含 `'multiplier_threshold'` 和 `'combo_threshold'`
- `RelicModifierType` 已包含 `'combo_retain_percent'` 和 `'skill_output_percent'`
- `RELIC_MODIFIER_DEFS` 当前为空 `{}`（打字遗物最终不使用 pipeline）
- `evaluateRelicCondition()` 条件评估器就绪
- `registerRelicBehavior()` / `dispatchRelicBehavior()` 行为分发框架就绪
- `relicStates: Record<string, number>` 可追踪每个遗物的运行时状态

**当前 combo/multiplier 流程（关键代码位置）：**
```
playerCorrect() (line 287)
  ├── state.combo++ (line 301)
  ├── state.maxCombo = max(maxCombo, combo) (line 302)
  ├── mult = baseMultiplier + combo * comboBonus + skillMultBonus (line 306-308)
  ├── state.multiplier = mult (line 308)
  ├── triggerSkill(skillId, k) (line 339)
  └── echoThimble check → combo++ again (line 345-356)

playerWrong() (line 382)
  ├── waxSeal check → return (line 387-393)
  ├── glassCannon check → gameOver (line 404-408)
  ├── on_error pipeline (line 411-428)
  ├── state.wordPerfect = false (line 431)
  ├── on_combo_break pipeline (line 436-441)
  ├── state.combo = 0 (line 443)        ← combo_buffer 和 immortal_combo 修改点
  ├── state.lastMilestone = 0 (line 444) ← rhythm_doctor 需同步
  ├── synergy.skillMultBonus = 0 (line 445) ← immortal_combo 跳过
  └── state.multiplier = baseMultiplier (line 446) ← immortal_combo 跳过

startLevel() (line 925+)
  ├── state.combo = 0 (line 931)         ← immortal_combo 跳过
  ├── state.maxCombo = 0 (line 932)      ← immortal_combo 跳过
  ├── state.multiplier = baseMultiplier (line 933) ← immortal_combo 跳过
  └── synergy.skillMultBonus = 0 (line 993)        ← immortal_combo 跳过
```

**技能触发（用于 combo_detonator）：**
```
// 获取已装备技能 ID 列表
Array.from(state.affixSkills.keys())  // 所有技能 ID
// 或
Array.from(state.player.bindings.entries())  // [key, skillId] 映射

// 触发技能
triggerSkill(skillId: string, triggerKey: string)
// 从 skills.ts 导入，skillId 从 affixSkills 取
```

**multiplier 资源产出拦截点（用于 immortal_combo）：**
```typescript
// skills.ts line 168-189, triggerAffixSkillWithFeedback()
const result = orchestrateAffixTrigger(skillId, triggerKey, ctx, {
  applyResource: (resource: ResourceType, amount: number) => {
    if (resource === 'multiplier') {
      synergy.skillMultBonus += amount;  // ← immortal_combo 在此拦截
    }
    // ...
  },
});
```

### 关键设计决策

**1. combo_buffer 缓冲与 multiplier 联动：**
缓冲后 combo > 0 时，multiplier 不应回退到 baseMultiplier。需按缓冲后的 combo 重算：`state.multiplier = baseMultiplier + newCombo * comboBonus`。skillMultBonus 保持不变（因为技能已产出的 multiplier 资源不应因打错而丢失——不灭连击除外）。

**注意**：当前 `playerWrong()` 总是 `synergy.skillMultBonus = 0`。combo_buffer 的设计意图是保留部分 combo，这里需要决定：skillMultBonus 是否也保留？建议：combo_buffer 仅保留 combo 数值和基于 combo 的倍率，不保留 skillMultBonus（与不灭连击区分）。即缓冲后：`state.combo = floor(oldCombo * 0.3); synergy.skillMultBonus = 0; state.multiplier = baseMultiplier + state.combo * comboBonus;`

**2. multiplier_prism 使用 pipeline 的原因：**
效果是"技能产出+20%"——这正是 `on_skill_trigger` pipeline 的设计用途。通过 `RELIC_MODIFIER_DEFS` 注册 factory，条件 `multiplier_threshold` 在 `evaluateRelicCondition()` 中已有实现。`effect.type = 'multiply'` 会被加到 `effects.multiply` 上，在 `triggerAffixSkillWithFeedback` 中应用。

**3. rhythm_doctor milestone 追踪：**
使用 `relicStates['rhythm_doctor']` 记录上次触发的 10 倍数点（如 0, 10, 20）。combo 从 9→10 时：lastMilestone < 10 且 combo >= 10 → 触发 +1s，设 milestone=10。combo 中断（被 buffer 缓冲到 7）时：设 milestone=0。这样下次从 7 涨到 10 又会触发。

**4. combo_detonator bitmask 设计：**
用 `relicStates['combo_detonator']` 作为位掩码：bit0=15已触发, bit1=30已触发, bit2=45已触发。每关重置为 0。这避免了 combo 持续增长时重复触发同一阈值。

**5. immortal_combo 的 multiplier 拦截位置：**
拦截点在 `skills.ts` 的 `applyResource` 回调中（方案 B）。`skills.ts` 直接导入 `shouldBlockMultiplierResource()` 和 `getMultiplierPrismBonus()`。选择方案 B 的原因：skills.ts 是资源应用的唯一入口，在此统一处理遗物效果比在 battle.ts 包装回调更内聚。

**6. immortal_combo 跨关不重置：**
需在 `startLevel()` 中添加 `hasImmortalCombo()` 检查。combo、maxCombo、multiplier、skillMultBonus 四项都需跳过重置。但注意：`state.multiplier` 在 `playerCorrect()` 的每次击键中都会重算，所以跳过 startLevel 中的重置就够了。

**7. 行为文件组织：**
参照 Story 36.2 的 `TypingRelicBehaviors.ts` 模式，新建 `ComboRelicBehaviors.ts`。

### 遗物数据规格

| ID | 名称 | 图标 | 稀有度 | basePrice | subsystem | behaviorType | effects |
|---|---|---|---|---|---|---|---|
| `combo_buffer` | 连击缓冲 | 🛡️ | common | 50 | combo | — | [] |
| `multiplier_prism` | 倍率棱镜 | 🔷 | common | 50 | combo | — | [{type:'on_skill_trigger', modifier:'skill_output_percent', value:0.2, condition:{type:'multiplier_threshold', threshold:2.5}}] |
| `rhythm_doctor` | 节奏医生 | ⏱️ | rare | 80 | combo | — | [] |
| `combo_detonator` | 连击引爆 | 💣 | epic | 120 | combo | combo_detonator | [] |
| `immortal_combo` | 不灭连击 | 🔗 | legendary | 0 | combo | immortal_combo | [] |

注：
- combo_buffer 和 rhythm_doctor 不需 behaviorType（逻辑简单，直接由 battle.ts 调用纯函数）
- multiplier_prism 效果通过 `RELIC_MODIFIER_DEFS` factory（数据完整性）+ `getMultiplierPrismBonus()` 纯函数（实际逻辑）双路实现
- immortal_combo 设 category: 'risk-reward'（有负面效果：禁止 multiplier 资源）
- 图标唯一性：♾️ 已被 perpetual_queue 使用 → immortal_combo 改用 🔗

### 依赖方向（CRITICAL）

```
data/relics.ts (遗物数据定义 + RELIC_MODIFIER_DEFS factory)
  ↓ 被引用
systems/relics/RelicPipeline.ts (管道 + 行为分发)
  ↑ 注册行为
systems/relics/ComboRelicBehaviors.ts (NEW — 连击子系统行为)
  ↓ 被调用
systems/battle.ts (playerCorrect/playerWrong/startLevel — 调用行为函数)
```

- `ComboRelicBehaviors.ts` 只能引用 `data/` 和 `systems/relics/` 中的模块
- 不能直接引用 `battle.ts`
- 行为函数通过 `state.player.relicStates` 获取/设置运行时数据

### 从 Story 36.2 继承的关键经验

1. **纯函数模式**: 行为函数导出为纯函数，由 battle.ts 在合适位置调用。行为注册仅用于框架完整性（no-op body）。
2. **relicStates 类型**: 只能存 number 值。bitmask 是存多个 boolean 的好方法（combo_detonator）。
3. **import type**: 纯类型导入必须用 `import type`。
4. **clearBehaviorHandlers()**: 测试 beforeEach 中调用。
5. **Icon 唯一性**: 5 个遗物需要 5 个不同 emoji（已在数据规格中分配）。
6. **测试 mock state**: 参照 `relics.typing.test.ts` 的 mock 模式（vi.mock state 模块）。
7. **pipeline modifier 测试**: 若使用 `RELIC_MODIFIER_DEFS`，需在 `relic.pipeline.test.ts` 中更新 RELIC_MODIFIER_DEFS 条目数断言（0→1）。
8. **遗物总数断言**: `relics.test.ts` 中总数（15→20）、各稀有度计数、subsystem 分布需更新。
9. **zeroPriceRelics**: 若有 basePrice=0 的遗物（immortal_combo），需在 `relics.slots.test.ts` 中添加到 zeroPriceRelics set。

### 性能约束

- combo_buffer 计算 <0.1ms（floor + 乘法）
- multiplier_prism 通过 pipeline 缓存
- rhythm_doctor milestone 检查 <0.1ms（简单除法比较）
- combo_detonator 触发 3 个技能 <2ms（单词完成流程内可接受）
- immortal_combo 检查 <0.1ms（简单 Set.has）

### Project Structure Notes

**需修改的文件：**
- `src/src/data/relics.ts` — 添加 5 个 RelicData + 1 个 RELIC_MODIFIER_DEFS factory (multiplier_prism)
- `src/src/systems/battle.ts` — playerWrong() 中 combo 缓冲/不灭连击，playerCorrect() 中节奏医生/连击引爆，startLevel() 中不灭连击跳过重置
- `src/tests/unit/systems/relics/relics.test.ts` — 遗物总数和稀有度断言更新
- `src/tests/unit/systems/relics/relic.pipeline.test.ts` — RELIC_MODIFIER_DEFS 条目数更新

**需新建的文件：**
- `src/src/systems/relics/ComboRelicBehaviors.ts` — 连击子系统行为模块
- `src/tests/unit/systems/relics/relics.combo.test.ts` — 连击遗物测试

**可能需修改的文件：**
- `src/src/systems/skills.ts` — 若选方案 B 拦截 multiplier 资源（推荐方案 A 在 battle.ts 中拦截，则不改 skills.ts）
- `src/tests/unit/systems/relics/relics.slots.test.ts` — immortal_combo basePrice=0

### References

- [Source: docs/design/relic-system.md#连击/倍率系统] — 5 个遗物完整设计规格
- [Source: docs/stories/epic-36-relic-system-expansion.md#Story 36.3] — 验收标准
- [Source: docs/implementation-artifacts/36-2-typing-input-relics.md] — 前序 Story 开发记录与经验
- [Source: src/src/systems/battle.ts#L287-L458] — combo/multiplier 流程
- [Source: src/src/systems/skills.ts#L139-L189] — 技能触发与资源产出
- [Source: src/src/data/relics.ts] — 当前遗物数据定义和类型
- [Source: src/src/systems/relics/RelicPipeline.ts] — pipeline + 行为分发框架
- [Source: src/src/systems/relics/TypingRelicBehaviors.ts] — 参考行为模块模式

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Icon conflict: ♾️ already used by perpetual_queue → immortal_combo changed to 🔗
- multiplier_prism: RELIC_MODIFIER_DEFS factory registered for data completeness, but actual runtime logic uses `getMultiplierPrismBonus()` pure function in `skills.ts` applyResource callback (consistent with typing relic pattern)
- immortal_combo multiplier blocking: Implemented in `skills.ts` directly (方案 B) rather than wrapping in battle.ts, as skills.ts is the single source of resource application

### Completion Notes List

- All 8 tasks completed, all 6 ACs satisfied
- 37 new unit tests (34 original + 3 interaction tests from review), all passing
- 177 total relic tests passing (no regressions)
- Pre-existing test failures in sound-bgm, restEvents, KeyTooltip are unrelated

### Code Review Fixes Applied

- [Review M1] multiplier_prism 不再放大 taboo 惩罚（仅缩放正产出）
- [Review M2] combo_detonator 使用每个技能自身绑定的 key 触发，而非当前击键 key
- [Review M3] 移除 RELIC_MODIFIER_DEFS 中 multiplier_prism 的死代码 factory
- [Review M4] Dev Notes 更新为实际采用的方案 B
- [Review L1] combo_detonator 随机选技能改用 Fisher-Yates 洗牌
- [Review L2] 添加 3 个遗物交互测试
- [Review H1] combo_detonator + immortal_combo 交互保留为设计决策（每关重新触发阈值）

### File List

**Modified:**
- `src/src/data/relics.ts` — 5 new RelicData entries + multiplier_prism RELIC_MODIFIER_DEFS factory
- `src/src/systems/battle.ts` — playerCorrect (rhythm_doctor, combo_detonator), playerWrong (immortal_combo, combo_buffer), startLevel (immortal_combo skip reset, resetComboRelicState call), initInput (initComboRelicBehaviors)
- `src/src/systems/skills.ts` — applyResource: shouldBlockMultiplierResource + getMultiplierPrismBonus scaling; feedback: prism scaling + multiplier skip
- `src/tests/unit/systems/relics/relics.test.ts` — updated counts: 20 total, 6/4/4/6 rarity
- `src/tests/unit/systems/relics/relic.pipeline.test.ts` — RELIC_MODIFIER_DEFS count 0→1
- `src/tests/unit/systems/relics/relics.slots.test.ts` — immortal_combo in zeroPriceRelics

**Created:**
- `src/src/systems/relics/ComboRelicBehaviors.ts` — 10 exported functions for combo relic behaviors
- `src/tests/unit/systems/relics/relics.combo.test.ts` — 34 tests across 7 describe blocks
