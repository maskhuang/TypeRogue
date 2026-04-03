# Story 46.2: 叠层型 — 素数 (Prime)

Status: done

## Story

As a 打字肉鸽玩家,
I want 叠层恰好为素数时获得大额产出加成,
so that 叠层数的数值性质（素数/合数）成为新的策略维度，创造「不规则稀有窗口」的体验.

## Acceptance Criteria

1. **AC1**: 叠层为 2,3,5,7,11,13... 时 bonusPercent = primeK × stacks
2. **AC2**: 叠层为 4,6,8,9,10... 时 bonusPercent 无 Prime 贡献
3. **AC3**: 叠层为 0 或 1 时无效果
4. **AC4**: isPrime 函数对 stacks ≤ 100 范围内正确
5. **AC5**: 技能生成可产出 Prime 词条
6. **AC6**: 单元测试覆盖素数/非素数/边界值

## Tasks / Subtasks

- [x] Task 1: 数据定义 (AC: 1,2,3,5)
  - [x] 1.1 `data/affixes.ts` — 新增 `AffixType.Prime = 'prime'` 到枚举（Parity 后面）
  - [x] 1.2 `data/affixes.ts` — 新增 `AFFIX_CATEGORY_MAP[AffixType.Prime]: 'stack'`
  - [x] 1.3 `data/affixes.ts` — 新增 `AFFIX_NAMES[AffixType.Prime]: '素数'`
  - [x] 1.4 `data/affixes.ts` — 新增 `AFFIX_DESCRIPTIONS[AffixType.Prime]: '叠层为素数时，按叠层数给予大额产出加成'`
  - [x] 1.5 `data/affixes.ts` — 新增 `AFFIX_WEIGHT_TIERS[AffixType.Prime]: 'high'`
  - [x] 1.6 `data/affixes.ts` — AffixInstance 接口新增可选字段 `primeK?: number`
- [x] Task 2: Phase 2 触发逻辑 (AC: 1,2,3,4)
  - [x] 2.1 `data/affixTrigger.ts` — 新增 `isPrime(n: number): boolean` 纯工具函数（isConsonant 后面）
  - [x] 2.2 `data/affixTrigger.ts` — 在 `resolvePhase2` 的 for 循环 switch 中新增 `case AffixType.Prime`（Parity case 后面）
  - [x] 2.3 实现逻辑：`stacks < 2` 时不触发；`isPrime(stacks)` 为 true 时 `bonusPercent += (affix.primeK ?? 0) * stacks`
- [x] Task 3: 技能生成 (AC: 5)
  - [x] 3.1 `data/skillGeneration.ts` — `rollAffixParams` switch 新增 `case AffixType.Prime`，返回 `{ type, primeK }`
  - [x] 3.2 参数范围：`primeK: 0.04~0.08`
- [x] Task 4: 商店展示 (AC: 5)
  - [x] 4.1 `systems/shop.ts` — `buildAffixParamSummary` 新增 `case 'prime'`
- [x] Task 5: UI (AC: 5)
  - [x] 5.1 `ui/keyboard/KeyTooltip.ts` — `AFFIX_COLORS` 新增 `prime: '#6c5ce7'`（靛紫）
  - [x] 5.2 `demo/demo-i18n.ts` — 中文：`'affix.prime': '素数'`，`'affix_desc.prime': '叠层为素数时，按叠层数给予大额产出加成'`
  - [x] 5.3 `demo/demo-i18n.ts` — 英文：`'affix.prime': 'Prime'`，`'affix_desc.prime': 'When stacks are a prime number: +output scaled by stack count'`
- [x] Task 6: 测试 (AC: 4,6)
  - [x] 6.1 `tests/unit/data/affixes.test.ts` — 更新枚举数量 37→38，stack 分类 7→8
  - [x] 6.2 新建 `tests/unit/data/prime.test.ts`：15 个测试全部通过
    - isPrime 函数测试：素数/合数/负数/大素数/大合数
    - Phase 2 逻辑：素数叠层时 bonusPercent = primeK × stacks
    - 非素数叠层时 bonus=0，stacks=0/1 时无效果

## Dev Notes

### 关键实现模式（从 46-1 Parity 总结）

**Phase 分拆模式：** 加算型效果（bonusPercent）放在 `resolvePhase2`，暴击型效果（critChance）放在 `resolvePhase3`。Prime 只写 bonusPercent，因此**只需在 resolvePhase2 中添加 case**，不需要 Phase 3。

**resolvePhase2 中的 bonusPercent：** 在 line ~556 声明 `let bonusPercent = 0`，Prime case 应直接写 `bonusPercent += ...`。

**hasSelfZero 检查：** Prime **不应**加入 hasSelfZero 列表（Prime 有自身产出）。

**isPrime 函数设计：**
```typescript
export function isPrime(n: number): boolean {
  if (n < 2) return false
  if (n < 4) return true
  if (n % 2 === 0 || n % 3 === 0) return false
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false
  }
  return true
}
```
- 纯函数，无副作用
- 放在 affixTrigger.ts 的工具函数区域（与 `isConsonant`、`isFirstOrLastLetter` 等并列）
- 导出以便测试直接 import

### 参数校准

| 参数 | 范围 | 说明 |
|------|------|------|
| primeK | 0.04~0.08 | 低 K × 高 stacks 补偿素数稀疏窗口 |

数值验证：
- stacks=2: 0.06 × 2 = +12%
- stacks=7: 0.06 × 7 = +42%
- stacks=13: 0.06 × 13 = +78%
- stacks=17: 0.06 × 17 = +102%（高但需要长时间累积）

### 8 文件变更清单

| # | 文件路径 | 改动类型 |
|---|---------|---------|
| 1 | `src/src/data/affixes.ts` | 枚举+分类+名称+描述+权重+接口(primeK) |
| 2 | `src/src/data/affixTrigger.ts` | isPrime 工具函数 + resolvePhase2 新 case |
| 3 | `src/src/data/skillGeneration.ts` | rollAffixParams 新 case |
| 4 | `src/src/systems/shop.ts` | buildAffixParamSummary 新 case |
| 5 | `src/src/ui/keyboard/KeyTooltip.ts` | AFFIX_COLORS 新条目 |
| 6 | `src/src/demo/demo-i18n.ts` | 中英文 affix.prime + affix_desc.prime |
| 7 | `src/tests/unit/data/affixes.test.ts` | 枚举数量 38，stack=8 |
| 8 | `src/tests/unit/data/prime.test.ts` | 新测试文件：isPrime + Phase 2 逻辑 |

### References

- [Source: docs/stories/epic-46-stack-combinatorics-expansion.md#Story 46.2]
- [Source: docs/affix-design-process.md#步骤 7：实现]
- [Source: 7f16072 feat: Parity 词条实现 — 同模式参考]
- [Source: src/src/data/affixTrigger.ts — resolvePhase2 line 536-808, Parity case ~line 775]
- [Source: src/src/data/affixTrigger.ts — isPrime 应放在 isConsonant(line 382) 附近]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- 所有 6 个任务完成，15/15 Prime 测试通过
- 新增导出函数 isPrime()（6行，O(√n) 复杂度）
- Phase 2 only（无 Phase 3 分支，Prime 不涉及暴击）
- 无新增 TS 编译错误
- 参数范围：primeK 0.04~0.08

### File List

- `src/src/data/affixes.ts` — AffixType.Prime + AFFIX_CATEGORY_MAP + AFFIX_NAMES + AFFIX_DESCRIPTIONS + AFFIX_WEIGHT_TIERS + AffixInstance.primeK
- `src/src/data/affixTrigger.ts` — isPrime() 工具函数 + resolvePhase2 case AffixType.Prime
- `src/src/data/skillGeneration.ts` — rollAffixParams case AffixType.Prime
- `src/src/systems/shop.ts` — buildAffixParamSummary case 'prime'
- `src/src/ui/keyboard/KeyTooltip.ts` — AFFIX_COLORS prime
- `src/src/demo/demo-i18n.ts` — 中英文 affix.prime + affix_desc.prime
- `src/tests/unit/data/affixes.test.ts` — 枚举数量 38，stack 分类 8
- `src/tests/unit/data/prime.test.ts` — 新建 15 个测试
