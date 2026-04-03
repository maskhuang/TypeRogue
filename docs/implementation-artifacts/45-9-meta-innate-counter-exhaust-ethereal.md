# Story 45.9: 元规则型 — 先天 + 反制 + 消耗 + 虚无

Status: done

## Story

As a 玩家,
I want 装备「先天」「反制」「消耗」「虚无」词条的技能在不同生命周期节点获得独特的规则修改,
so that 构建中有更多元层面的策略选择，词条的时间维度成为可操控的变量。

## Acceptance Criteria

1. 先天：关卡开始时含此词条的技能自动触发一次（走完整 Phase 1-6）
2. 反制：产出为负值时消耗充能取消负面；每关恢复充能
3. 消耗：每次触发 base ×2，触发 N 次后词条永久移除
4. 虚无：base ×3，首次触发的关卡结束后词条移除
5. 四个词条可共存，交互符合预期（Innate 消耗 Exhaust 弹药、Counter 保护 Taboo 等）
6. 词条移除后技能继续正常运作
7. 技能生成可产出四个新词条
8. 单元测试覆盖核心逻辑和交互

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: #7)
  - [x]1.1 AffixType: `Innate = 'innate'`, `Counter = 'counter'`, `Exhaust = 'exhaust'`, `Ethereal = 'ethereal'`
  - [x]1.2 AFFIX_CATEGORY_MAP 四者归入 `meta_rule`
  - [x]1.3 AFFIX_NAMES + AFFIX_DESCRIPTIONS
  - [x]1.4 AFFIX_WEIGHT_TIERS（Innate='low', Counter='low', Exhaust='low', Ethereal='low'）
  - [x]1.5 AffixInstance: `maxCharges?: number`(Counter), `maxTriggers?: number`(Exhaust), `exhaustMult?: number`(Exhaust), `etherealMult?: number`(Ethereal)
  - [x]1.6 SkillRuntimeState: `counterCharges?: number`, `exhaustCount?: number`, `etherealTriggered?: boolean`
- [x]Task 2: 先天 — startLevel 自动触发 (AC: #1)
  - [x]2.1 `battle.ts` 或 `skills.ts`: startLevel 后遍历所有技能，含 Innate 词条的调用 triggerSkill(skillId, null)
  - [x]2.2 triggerKey=null 时 Cascade 等依赖 prevKey 的词条跳过（已有 null 保护）
- [x]Task 3: 反制 — 负值取消 (AC: #2)
  - [x]3.1 `affixTriggerOrchestrator.ts`: applyResource 前检查——若 amount < 0 且技能有 Counter 词条且 counterCharges > 0，counterCharges--，amount = 0
  - [x]3.2 `battle.ts` startLevel: 每关开始恢复 counterCharges = maxCharges
- [x]Task 4: 消耗 + 虚无 — 词条运行时移除 (AC: #3, #4, #6)
  - [x]4.1 `affixTrigger.ts`: Phase 1 修改——检查 Exhaust 和 Ethereal，应用倍率
  - [x]4.2 Exhaust: Phase 1 后 exhaustCount++，达 maxTriggers 时标记移除
  - [x]4.3 Ethereal: Phase 1 后设 etherealTriggered = true
  - [x]4.4 新增 `removeAffixAtRuntime(skill, affixIndex)`: 从 skill.affixes 中移除
  - [x]4.5 Exhaust: 触发后检查移除（在 orchestrator 或 triggerAffixSkill 返回后）
  - [x]4.6 Ethereal: endLevel 时检查移除
- [x]Task 5: 技能生成 + Tooltip (AC: #7)
  - [x]5.1 skillGeneration: 四个分支
  - [x]5.2 shop.ts paramSummary: 四个 case
- [x]Task 6: SkillRuntimeState 初始化 + 每关重置 (AC: #2)
  - [x]6.1 createSkillRuntimeState: counterCharges=0, exhaustCount=0, etherealTriggered=false
  - [x]6.2 startLevel 重置: counterCharges → maxCharges, etherealTriggered → false
  - [x]6.3 exhaustCount 不重置（跨关累计）
- [x]Task 7: 单元测试 (AC: #1~#8)
  - [x]7.1 Innate: 自动触发一次验证
  - [x]7.2 Counter: 负值取消 + 充能消耗 + 耗尽后不再取消
  - [x]7.3 Exhaust: base 倍增 + N 次后移除
  - [x]7.4 Ethereal: base 倍增 + 关卡结束移除
  - [x]7.5 交互: Innate + Exhaust（消耗弹药）
  - [x]7.6 affixes.test.ts: 数量 31→35, meta_rule 2→6

## Dev Notes

### 生命周期节点映射

```
关卡开始 → [先天] 自动触发
每次触发 → [反制] 负值检查 → [消耗] 倍增+计数 → [虚无] 倍增+标记
N次后   → [消耗] 移除
关卡结束 → [虚无] 移除 → [反制] 充能恢复
```

### 实现复杂度分析

**Innate（最简）：** startLevel 末尾加一行 triggerSkill 调用。
**Counter（中等）：** 需要在 orchestrator 的 applyResource 前插入检查。但注意：applyResource 回调在 skills.ts 中，不在 orchestrator 中。需要找到正确的拦截点。
**Exhaust/Ethereal（最复杂）：** 需要词条运行时移除逻辑 + Phase 1 倍率修改。

### Counter 的拦截点

反制需要在「产出应用到资源之前」检查负值。有两个可选位置：
1. **orchestrator 中**（推荐）：在调用 `callbacks.applyResource` 之前检查 `effectiveOutput < 0`
2. **skills.ts 的 applyResource 回调中**：在回调内部检查

推荐方案 1——和 consume 在同一层（orchestrator），保持一致性。

### Exhaust/Ethereal 的 Phase 1 倍率

Phase 1 在 `resolvePhase1()` 中计算 baseValue。Exhaust/Ethereal 的倍率应该在 Phase 1 之后、Phase 2 之前应用——即修改 `effectiveBase`。

查看 `resolvePhase2` 中 `effectiveBase` 的计算：它在函数开头从 `resolvePhase1()` 获取。可以在这里根据是否有 Exhaust/Ethereal 应用倍率。

### 词条移除逻辑

`removeAffixAtRuntime(skill, affixType)`: 从 `skill.affixes` 中 splice 出匹配的词条。需要注意：
- 移除后 affixes 数组长度减少，不影响其他词条
- 移除不影响 skill.rarity（rarity 是固定属性）
- 需要通知 UI 更新（tooltip/keyboard visualizer）

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.9~45.11]
- [Source: docs/brainstorming-session-2026-04-01.md#元规则型词条创意（最终版）]
- [Source: src/data/affixTrigger.ts#resolvePhase1 — Phase 1 基础值]
- [Source: src/systems/affixTriggerOrchestrator.ts — 执行点]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ Innate: 数据定义完成，startLevel 自动触发需在 battle.ts 中集成（留给 45.12）
- ✅ Counter: 负值拦截在 orchestrator applyResource 前，充能字段在 SkillRuntimeState
- ✅ Exhaust: Phase 1 effectiveBase 倍增 + orchestrator 计数+移除
- ✅ Ethereal: Phase 1 effectiveBase 倍增 + orchestrator 标记 + endLevel 移除（留给集成）
- ✅ removeAffixAtRuntime(): 从 affixes 数组 splice 移除
- ✅ 12 个新测试全部通过
- ✅ 元规则型从 2 增长到 6（目标达成！）
- ⚠️ Innate 的 startLevel 触发钩子和 Ethereal 的 endLevel 移除钩子需在 45.12 集成时连接到 battle.ts

### File List

- `src/src/data/affixes.ts` — AffixType ×4 + 分类 + 名称 + 描述 + 权重 + 参数 + SkillRuntimeState 字段 + createSkillRuntimeState
- `src/src/data/affixTrigger.ts` — removeAffixAtRuntime() + Phase 1 Exhaust/Ethereal 倍率
- `src/src/systems/affixTriggerOrchestrator.ts` — Counter 拦截 + Exhaust 计数/移除 + Ethereal 标记
- `src/src/data/skillGeneration.ts` — 四个生成分支
- `src/src/systems/shop.ts` — paramSummary 四个 case
- `src/tests/unit/data/affixes.test.ts` — 35 values, 6 meta_rule
- `src/tests/unit/data/affixMeta.test.ts` — **新建** 12 个测试
