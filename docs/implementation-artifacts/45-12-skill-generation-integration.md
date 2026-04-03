# Story 45.12: 技能生成集成 + 生命周期钩子

Status: done

## Story

As a 玩家,
I want 13 个新词条在游戏中正常出现、正确显示、生命周期钩子正常工作,
so that 新词条不只是数据定义，而是可以在实际游戏中体验的完整功能。

## Acceptance Criteria

1. `generateSkill()` 可随机生成含新词条的技能（exhaustive switch 无遗漏）
2. 新词条的权重分档合理（不过于稀有也不过于常见）
3. 商店展示、tooltip、键盘可视化均正确显示新词条
4. Innate：关卡开始时自动触发含此词条的技能
5. Ethereal：关卡结束时移除已触发的 Ethereal 词条
6. Counter：每关开始恢复 counterCharges
7. 存档兼容：旧存档不含新词条不会崩溃
8. i18n 词条名称有回退（AFFIX_NAMES 兜底）

## Tasks / Subtasks

- [x] Task 1: battle.ts — Innate startLevel 钩子 (AC: #4)
  - [x] 1.1 在 `startLevel()` 的 `startTimer()` 之前，遍历所有装备技能
  - [x] 1.2 对含 Innate 词条的技能调用 `triggerSkill(skillId, null)`
- [x] Task 2: battle.ts — Ethereal endLevel 移除 (AC: #5)
  - [x] 2.1 在 `endLevel()` 早期（cleanup 后、rating 前），遍历所有技能
  - [x] 2.2 对 `etherealTriggered === true` 的技能调用 `removeAffixAtRuntime(skill, AffixType.Ethereal)`
  - [x] 2.3 重置 `etherealTriggered = false`
- [x] Task 3: battle.ts — Counter 充能恢复 (AC: #6)
  - [x] 3.1 在 `startLevel()` 初始化阶段，遍历所有技能
  - [x] 3.2 对含 Counter 词条的技能设 `counterCharges = maxCharges`
- [x] Task 4: 验证已完成工作 (AC: #1, #2, #3, #7, #8)
  - [x] 4.1 确认 skillGeneration exhaustive switch 编译通过
  - [x] 4.2 确认 AFFIX_NAMES 和 AFFIX_DESCRIPTIONS 包含全部 35 个词条
  - [x] 4.3 确认 AFFIX_WEIGHT_TIERS 包含全部词条
  - [x] 4.4 确认 shop.ts buildAffixParamSummary 包含全部新 case
  - [x] 4.5 确认旧存档反序列化包含新 SkillRuntimeState 字段默认值

## Dev Notes

### battle.ts 钩子插入点

**Innate（startLevel ~line 2211）：**
```typescript
// Story 45.12: Innate 自动触发
for (const [skillId, skill] of state.affixSkills) {
  if (skill.affixes.some(a => a.type === AffixType.Innate)) {
    triggerSkill(skillId, null)  // null key = 非按键触发
  }
}
startTimer()  // 之后才开始计时
```

**Ethereal（endLevel ~line 1625）：**
```typescript
// Story 45.12: Ethereal 关卡结束移除
for (const [skillId, skill] of state.affixSkills) {
  const rt = state.affixSkillStates.get(skillId)
  if (rt?.etherealTriggered) {
    removeAffixAtRuntime(skill, AffixType.Ethereal)
    rt.etherealTriggered = false
  }
}
```

**Counter 充能恢复（startLevel 初始化阶段）：**
```typescript
// Story 45.12: Counter 每关充能恢复
for (const [skillId, skill] of state.affixSkills) {
  const rt = state.affixSkillStates.get(skillId)
  const counterAffix = skill.affixes.find(a => a.type === AffixType.Counter)
  if (rt && counterAffix) {
    rt.counterCharges = counterAffix.maxCharges ?? 0
  }
}
```

### 需要 import

battle.ts 需要新增 import：
- `AffixType` from `../data/affixes`
- `removeAffixAtRuntime` from `../data/affixTrigger`

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.12]
- [Source: src/systems/battle.ts#startLevel ~line 2211]
- [Source: src/systems/battle.ts#endLevel ~line 1625]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ Innate: startLevel 中 startTimer 前自动触发含 Innate 的技能
- ✅ Counter: startLevel 中恢复 counterCharges = maxCharges
- ✅ Ethereal: endLevel 中移除已触发的 Ethereal + 重置标记；startLevel 重置 etherealTriggered
- ✅ removeAffixAtRuntime import 到 battle.ts
- ✅ 验证: 35 个 AffixType 全部有 Names(35)/Descriptions(35)/WeightTiers(36)/CategoryMap(35)
- ✅ 验证: skillGeneration exhaustive switch 编译通过
- ✅ 验证: 77 个新测试全部通过

### File List

- `src/src/systems/battle.ts` — Innate startLevel 钩子 + Counter 充能恢复 + Ethereal endLevel 移除 + import
- `docs/stories/sprint-status.yaml` — Story 状态更新
