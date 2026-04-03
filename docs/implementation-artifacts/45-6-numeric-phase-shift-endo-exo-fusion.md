# Story 45.6: 数值型 — 相变 + 吸热/放热 + 聚变

Status: done

## Story

As a 玩家,
I want 装备「相变」「吸热/放热」「聚变」词条的技能根据资源状态产生差异化的产出模式,
so that 资源管理成为构建策略的核心维度，不同的 f(resource) 曲线带来截然不同的游戏体验。

## Acceptance Criteria

1. 相变：源资源跨阈值时 bonusPercent 有明显跳升；气态时每次触发消耗资源
2. 吸热/放热：源资源高于阈值时高产出+消耗（Exo），低于阈值时低/负产出（Endo）
3. 聚变：双资源同时达阈值时高倍产出+双消耗；任一不达阈值时有惩罚
4. 三个词条和 Convert 共存时效果叠加正确（线性+阶梯/方波/与门）
5. consume 请求正确写入 Phase2Result.consumeRequests
6. 技能生成可产出三个新词条
7. 单元测试覆盖各状态切换和边界

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: #6)
  - [x] 1.1-1.5 AffixType ×3 + 分类 + 名称 + 描述 + 权重 + 21 个新参数字段
- [x] Task 2: Phase 2 触发逻辑 (AC: #1, #2, #3, #5)
  - [x] 2.1 PhaseShift: 阶梯 kSolid/kLiquid/kGas × val × norm + 气态 consumeRequests
  - [x] 2.2 EndoExo: 方波 kExo/kEndo × val × norm + Exo consumeRequests
  - [x] 2.3 Fusion: 双 getAffixSourceValue + 与门 + 双 consumeRequests / penalty
- [x] Task 3: 技能生成 + Tooltip (AC: #6)
  - [x] 3.1 source 排除 skill.resource；Fusion sourceA ≠ sourceB
  - [x] 3.2 paramSummary: RESOURCE_ICONS + 阈值/点火显示
- [x] Task 4: 单元测试 (AC: #1~#7)
  - [x] 4.1 PhaseShift 4 测试（固/液/气/跨阈值跳升）
  - [x] 4.2 EndoExo 3 测试（Exo高+消耗/Endo负/差异）
  - [x] 4.3 Fusion 5 测试（双达/A不达/B不达/双不达/成功>惩罚）
  - [x] 4.4 affixes.test.ts: 31 values, 6 numeric

## Dev Notes

### 三个词条的统一范式

```
read(resource) → f(value) → bonusPercent [+ consumeRequests]
```

| 词条 | f() | consume 条件 |
|------|-----|-------------|
| 相变 | step(val, [T1,T2]) × k | val ≥ T2 时 |
| Endo/Exo | (val ≥ T ? k_exo : k_endo) × val | val ≥ T 时 |
| 聚变 | (A≥T₁ && B≥T₂) ? k×(A+B) : -penalty | 成功时双消耗 |

### Phase 2 实现参考

参考现有 Convert case 的模式（getAffixSourceValue + BASE_VALUES 归一化）：

```typescript
case AffixType.PhaseShift: {
  if (affix.phaseSource == null) break
  const lvlIdx = Math.max(0, Math.min(skill.level - 1, 2))
  const val = getAffixSourceValue(affix.phaseSource, ctx)
  const skillBase = BASE_VALUES[skill.resource]?.[lvlIdx] ?? 1
  const srcBase = BASE_VALUES[affix.phaseSource]?.[lvlIdx] ?? 1
  const norm = skillBase / srcBase

  if (val < (affix.phaseT1 ?? Infinity))
    bonusPercent += (affix.kSolid ?? 0) * val * norm
  else if (val < (affix.phaseT2 ?? Infinity))
    bonusPercent += (affix.kLiquid ?? 0) * val * norm
  else {
    bonusPercent += (affix.kGas ?? 0) * val * norm
    consumeRequests.push({ resource: affix.phaseSource, amount: affix.sustainCost ?? 0 })
  }
  break
}
```

### 参数建议

| 词条 | 参数 | 范围 | 说明 |
|------|------|------|------|
| PhaseShift | kSolid | 0.01~0.02 | 固态：低 bonusPercent |
| | kLiquid | 0.04~0.08 | 液态：中 bonusPercent（2~4× solid） |
| | kGas | 0.10~0.20 | 气态：高 bonusPercent（2~3× liquid） |
| | phaseT1/T2 | 按资源归一化 | 约 30%/70% 的典型资源值 |
| | sustainCost | 按资源归一化 | 约资源 5~10%/触发 |
| EndoExo | kExo | 0.06~0.12 | 放热：高回报 |
| | kEndo | -0.02~0.01 | 吸热：低或负回报 |
| | endoConsumeRate | 按资源归一化 | 约资源 8~15%/触发 |
| Fusion | fusionK | 0.08~0.15 | 聚变成功倍率 |
| | fusionPenalty | 5~15 | 失败时 bonusPercent 扣减 |
| | fusionConsumeA/B | 按资源归一化 | 约资源 10~20%/次 |

### source 资源选择

生成时 source 不应等于 skill.resource（避免自指循环）。Fusion 的 sourceA ≠ sourceB ≠ skill.resource。

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.6~45.8]
- [Source: docs/brainstorming-session-2026-04-01.md#数值型词条创意（最终版）]
- [Source: src/data/affixTrigger.ts#Convert case — getAffixSourceValue 模式]
- [Source: docs/implementation-artifacts/45-5-consume-infrastructure.md — consume 基础设施]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ PhaseShift: 阶梯函数（固/液/气），气态 consume，BASE_VALUES 归一化
- ✅ EndoExo: 方波（Exo 高+消耗 / Endo 低或负），自然振荡靠 consume 驱动
- ✅ Fusion: 与门（双源达阈值→高倍+双消耗，否则 penalty），sourceA≠sourceB≠resource
- ✅ 所有三个词条通过 consumeRequests 写入消耗请求，复用 45.5 基础设施
- ✅ 12 个新测试 + 7 个分类测试全部通过
- ✅ 数值型从 3 增长到 6（目标达成！）

### File List

- `src/src/data/affixes.ts` — AffixType ×3 + 分类 + 名称 + 描述 + 权重 + 21 参数
- `src/src/data/affixTrigger.ts` — Phase 2 PhaseShift/EndoExo/Fusion 三个 case
- `src/src/data/skillGeneration.ts` — 三个生成分支（source 排除自身资源）
- `src/src/systems/shop.ts` — paramSummary 三个 case
- `src/tests/unit/data/affixes.test.ts` — 31 values, 6 numeric
- `src/tests/unit/data/affixNumeric.test.ts` — **新建** 12 个测试
