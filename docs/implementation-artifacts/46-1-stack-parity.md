# Story 46.1: 叠层型 — 奇偶 (Parity)

Status: done

## Story

As a 打字肉鸽玩家,
I want 叠层为奇数时获得产出加成、偶数时获得暴击率加成,
so that 叠层数的奇偶性质成为新的策略维度，而不只是「叠越高越好」.

## Acceptance Criteria

1. **AC1**: 叠层为奇数时 bonusPercent 增加 oddK，critChance 不变
2. **AC2**: 叠层为偶数时 critChance 增加 evenK，bonusPercent 不受 Parity 影响
3. **AC3**: 叠层为 0 时无效果
4. **AC4**: 与 Pulse 共存时，Pulse 清零叠层不导致异常
5. **AC5**: 与 Crit/Taboo 的暴击率叠加正确
6. **AC6**: 技能生成可产出 Parity 词条，参数在范围内
7. **AC7**: 单元测试覆盖奇/偶/零三种状态

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: 1,2,3,6)
  - [x] 1.1 `data/affixes.ts` — 新增 `AffixType.Parity = 'parity'` 到枚举（放在 `// ── 叠层型 stack ──` 区块末尾，WarDrum 后面）
  - [x] 1.2 `data/affixes.ts` — 新增 `AFFIX_CATEGORY_MAP[AffixType.Parity]: 'stack'`
  - [x] 1.3 `data/affixes.ts` — 新增 `AFFIX_NAMES[AffixType.Parity]: '奇偶'`
  - [x] 1.4 `data/affixes.ts` — 新增 `AFFIX_DESCRIPTIONS[AffixType.Parity]: '叠层为奇数时增加产出，偶数时增加暴击率'`
  - [x] 1.5 `data/affixes.ts` — 新增 `AFFIX_WEIGHT_TIERS[AffixType.Parity]: 'high'`（与其他 stack 词条一致）
  - [x] 1.6 `data/affixes.ts` — AffixInstance 接口新增可选字段 `oddK?: number`、`evenK?: number`
- [x] Task 2: Phase 2 触发逻辑 (AC: 1,2,3,4)
  - [x] 2.1 `data/affixTrigger.ts` — 在 Phase 2 switch 中新增 `case AffixType.Parity` 分支
  - [x] 2.2 实现逻辑：读 `runtimeState.stacks`，奇数时 `bonusPercent += affix.oddK ?? 0`，偶数时写入 `critChanceBonus += affix.evenK ?? 0`
  - [x] 2.3 叠层为 0 时 break（无效果）
- [x] Task 3: 技能生成 (AC: 6)
  - [x] 3.1 `data/skillGeneration.ts` — `rollAffixParams` switch 新增 `case AffixType.Parity`，返回 `{ type, oddK, evenK }`
  - [x] 3.2 参数范围：`oddK: 0.15~0.25`，`evenK: 0.08~0.15`（参考 randomRange 生成）
- [x] Task 4: 商店展示 (AC: 6)
  - [x] 4.1 `systems/shop.ts` — `buildAffixParamSummary` 新增 `case 'parity'`，格式：`奇数+{oddK}%产出 / 偶数+{evenK}%暴击`
  - [x] 4.2 `computeSmartEstimate` — Parity 不可预估（依赖运行时 stacks），无需额外 case
- [x] Task 5: UI (AC: 6)
  - [x] 5.1 `ui/keyboard/KeyTooltip.ts` — `AFFIX_COLORS` 新增 `parity: '#a29bfe'`（淡紫色）
  - [x] 5.2 `demo/demo-i18n.ts` — 中文：`'affix.parity': '奇偶'`，`'affix_desc.parity': '叠层为奇数时增加产出，偶数时增加暴击率'`
  - [x] 5.3 `demo/demo-i18n.ts` — 英文：`'affix.parity': 'Parity'`，`'affix_desc.parity': 'Odd stacks: +output bonus; Even stacks: +crit chance'`
- [x] Task 6: 测试 (AC: 7)
  - [x] 6.1 `tests/unit/data/affixes.test.ts` — 更新枚举数量 expect 从 36 到 37，stack 分类从 6 到 7
  - [x] 6.2 新建 `tests/unit/data/parity.test.ts`：13 个测试全部通过
    - 测试叠层为奇数(1,3,5)时 bonusPercent 增加 oddK
    - 测试叠层为偶数(2,4,6)时 critChanceBonus 增加 evenK
    - 测试叠层为 0 时无效果
    - 测试 oddK/evenK 为 null/undefined 时安全跳过

## Dev Notes

### 关键实现模式（从代码库分析）

**Phase 2 叠层读取模式：** 所有 stack 词条通过 `runtimeState.stacks` 读取叠层数，叠层在 Phase 2 末尾（affixTrigger.ts ~line 1606）统一 `runtimeState.stacks += 1` 递增。Parity 应在递增**之前**读取当前 stacks 值（与 Pulse 一致的时序）。

**critChanceBonus 写入模式：** WarDrum 通过 `sumNeighborWarDrumCrit()` 外部函数影响暴击率（affixTrigger.ts ~line 966-977），不是在 Phase 2 switch 内直接写。但 Fallacy 在 Phase 2 内通过 `flags` 影响 critChance。Parity 的 evenK 需要确认写入哪个变量——检查 Phase 2 是否有 `critChanceBonus` 累加器，或需通过 flags 传递。

**AffixInstance 参数命名：** 现有 stack 参数用驼峰命名（`critPerStack`、`splashCount`、`resonanceCount`）。Parity 使用 `oddK` / `evenK` 保持一致。

**Self-Zero 检查：** affixTrigger.ts ~line 1599 检查 `hasSelfZero` 列表（Conduit/Amplify/Splash/Relay/WarDrum 的 base=0）。Parity **不应**加入此列表——Parity 有自身产出。

**AFFIX_WEIGHT_TIERS 分档：** stack 类词条除 Relay(low) 外全部为 'high'。Parity 作为通用型词条应设为 'high'。

### 参数校准

| 参数 | 范围 | 说明 |
|------|------|------|
| oddK | 0.15~0.25 | 对标 Void（3空位 × 0.08 = 0.24），固定加成 |
| evenK | 0.08~0.15 | 对标 Crit 基础暴击率，固定加成 |

数值验证：
- 叠层 5（奇）：bonusPercent +0.20 = +20% ✅
- 叠层 6（偶）：critChance +0.12 = +12% ✅
- 每次触发只享受一种效果

### 涌现交互（实现时注意）

- **Pulse + Parity**：Pulse 清零叠层后重新从 1 开始交替。stacks=0 时 Parity break，不影响 Pulse 的自触发逻辑。
- **WarDrum + Parity**：WarDrum 每层加邻居 critChance，Parity 偶数层也加 critChance → 双暴击源叠加。需确保 critChance 累加路径兼容。
- **Amplify + Parity**：Amplify 给邻居叠层+1 → 可能翻转邻居 Parity 状态。Parity 只读自身 stacks，不受邻居影响。

### 8 文件变更清单

| # | 文件路径 | 改动类型 | 说明 |
|---|---------|---------|------|
| 1 | `src/src/data/affixes.ts` | 枚举+分类+名称+描述+权重+接口 | AffixType.Parity + AFFIX_CATEGORY_MAP + AFFIX_NAMES + AFFIX_DESCRIPTIONS + AFFIX_WEIGHT_TIERS + AffixInstance.oddK/evenK |
| 2 | `src/src/data/affixTrigger.ts` | Phase 2 新 case | `case AffixType.Parity` 奇偶判定逻辑 |
| 3 | `src/src/data/skillGeneration.ts` | rollAffixParams 新 case | 参数生成：oddK/evenK 范围 |
| 4 | `src/src/systems/shop.ts` | buildAffixParamSummary 新 case | 参数摘要文案 |
| 5 | `src/src/ui/keyboard/KeyTooltip.ts` | AFFIX_COLORS 新条目 | Parity 颜色 |
| 6 | `src/src/demo/demo-i18n.ts` | 中英文 i18n | affix.parity + affix_desc.parity + param.parity |
| 7 | `src/tests/unit/data/affixes.test.ts` | 枚举数量+分类 | 37 枚举，stack=7 |
| 8 | `src/tests/unit/data/parity.test.ts` | 新测试文件 | 奇/偶/零/null 四种状态 |

### Project Structure Notes

- 所有改动在 `src/src/` 下的 renderer 进程代码，不涉及 main 进程或 shared 目录
- 遵循依赖方向：`data → core → systems → scenes`，Parity 的数据定义在 data/，触发逻辑在 data/affixTrigger.ts，商店展示在 systems/shop.ts
- 测试文件在 `src/tests/unit/data/` 下，镜像 src 结构

### References

- [Source: docs/stories/epic-46-stack-combinatorics-expansion.md#Story 46.1]
- [Source: docs/affix-design-process.md#步骤 7：实现]
- [Source: docs/project-context.md#Affix-Based Skill System]
- [Source: src/src/data/affixes.ts — AffixType 枚举 line 13-56, AffixInstance 接口 line 202-264]
- [Source: src/src/data/affixTrigger.ts — Phase 2 Pulse case line 910-917, stacks 递增 line 1606]
- [Source: src/src/data/skillGeneration.ts — rollAffixParams stack cases line 175-216]
- [Source: src/src/systems/shop.ts — buildAffixParamSummary line 526-566]
- [Source: src/src/ui/keyboard/KeyTooltip.ts — AFFIX_COLORS line 31-72]
- [Source: src/src/demo/demo-i18n.ts — stack affix i18n line 558-563, 672-687]
- [Source: src/tests/unit/data/affixes.test.ts — category distribution test line 88-99]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- 所有 6 个任务完成，13/13 Parity 测试通过
- affixes.test.ts 的枚举数量/分类计数测试通过（37 枚举，stack=7）
- 无新增 TS 编译错误
- Phase 2 逻辑：读 runtimeState.stacks，奇数写 bonusPercent，偶数写 totalCritChance
- 参数范围：oddK 0.15~0.25，evenK 0.08~0.15

### File List

- `src/src/data/affixes.ts` — AffixType.Parity + AFFIX_CATEGORY_MAP + AFFIX_NAMES + AFFIX_DESCRIPTIONS + AFFIX_WEIGHT_TIERS + AffixInstance.oddK/evenK
- `src/src/data/affixTrigger.ts` — Phase 2 case AffixType.Parity
- `src/src/data/skillGeneration.ts` — rollAffixParams case AffixType.Parity
- `src/src/systems/shop.ts` — buildAffixParamSummary case 'parity'
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS parity
- `src/src/demo/demo-i18n.ts` — 中英文 affix.parity + affix_desc.parity
- `src/tests/unit/data/affixes.test.ts` — 枚举数量 37，stack 分类 7
- `src/tests/unit/data/parity.test.ts` — 新建 13 个测试
