# Story 45.2: 词感型 — 辅音丛 + 覆盖度

Status: done

## Story

As a 玩家,
I want 装备「辅音丛」和「覆盖度」词条的技能在打不同单词时有明显差异化的产出,
so that 我在构建时有更多词感维度的选择，且打字体验和机制奖励紧密对齐。

## Acceptance Criteria

1. 辅音丛在含 "strength"(4连辅音) 的单词中产出明显高于 "area"(无连续辅音)
2. 覆盖度在含 "typewriting"(11种字母) 的单词中产出明显高于 "banana"(3种)
3. 两词条和 Outcast/Gravity/Ligature 可共存于同一技能，效果正确叠加
4. 辅音丛和覆盖度与 Ligature 的互动符合预期（Coverage 对立，Cluster 正交）
5. 技能生成可产出新词条，权重合理
6. 单元测试覆盖核心逻辑

## Tasks / Subtasks

- [x] Task 1: 数据定义 — AffixType 枚举 + 元数据 (AC: #5)
  - [x] 1.1 `affixes.ts`: AffixType 枚举新增 `Cluster = 'cluster'` 和 `Coverage = 'coverage'`
  - [x] 1.2 `affixes.ts`: AFFIX_CATEGORY_MAP 新增两项归入 `word_sense`
  - [x] 1.3 `affixes.ts`: AFFIX_NAMES 新增 `辅音丛` / `覆盖度`
  - [x] 1.4 `affixes.ts`: AFFIX_DESCRIPTIONS 新增玩家可读描述
  - [x] 1.5 `affixes.ts`: AFFIX_WEIGHT_TIERS 新增 Cluster='high', Coverage='high'
  - [x] 1.6 `affixes.ts`: AffixInstance 新增 `clusterK?: number` 和 `coverageK?: number`
- [x] Task 2: 触发逻辑 — Phase 2 加算层 (AC: #1, #2, #3)
  - [x] 2.1 `affixTrigger.ts`: 新增 `isConsonant()` + VOWELS 集合
  - [x] 2.2 `affixTrigger.ts`: resolvePhase2() 新增 `case AffixType.Cluster` — 最长连续辅音段计算
  - [x] 2.3 `affixTrigger.ts`: resolvePhase2() 新增 `case AffixType.Coverage` — unique letter set 计算
- [x] Task 3: 技能生成 — 参数表 (AC: #5)
  - [x] 3.1 `skillGeneration.ts`: Cluster 分支 — clusterK: 8~15
  - [x] 3.2 `skillGeneration.ts`: Coverage 分支 — coverageK: 3~6
- [x] Task 4: Tooltip 渲染 (AC: #3)
  - [x] 4.1 `shop.ts` buildAffixParamSummary(): Cluster — `+X%/辅音段`
  - [x] 4.2 `shop.ts` buildAffixParamSummary(): Coverage — `+X%/字母种类`
- [x] Task 5: 单元测试 (AC: #1, #2, #4, #6)
  - [x] 5.1 isConsonant: 5 个测试（元音/大写元音/辅音/大写辅音/非字母）
  - [x] 5.2 Cluster: 8 个测试（strength/area/rhythm/aeiou/单字母/单辅音/blast/空串）
  - [x] 5.3 Coverage: 6 个测试（typewriting/banana/aaa/空串/大小写/对立验证）
  - [x] 5.4-5.5 边界和共存测试覆盖在上述用例中
  - [x] 5.6 affixes.test.ts: 24 values, 5 word_sense

## Dev Notes

### 架构模式

两个词条完全遵循现有 Phase 2 加算层模式：
```
case AffixType.Xxx:
  // 计算 bonusPercent 增量
  bonusPercent += 计算值
  break
```

参考 `AffixType.Outcast`（最相似的词感型 Phase 2 实现）：检查单词属性 → 条件满足 → 加 bonusPercent。

### 关键实现细节

**isConsonant 判定：**
- 元音 = A, E, I, O, U（大小写不敏感）
- 其余 21 个字母为辅音
- 非字母字符（如连字符）视为非辅音（断开辅音丛计数）

**Cluster 计算逻辑：**
```typescript
let maxCluster = 0, cur = 0
for (const ch of word.toLowerCase()) {
  if (isConsonant(ch)) { cur++; maxCluster = Math.max(maxCluster, cur) }
  else cur = 0
}
bonusPercent += (affix.clusterK ?? 0) * Math.max(0, maxCluster - 1)
// -1 是因为单个辅音不算「丛」，至少 2 个连续才有加成
```

**Coverage 计算逻辑：**
```typescript
const unique = new Set(word.toLowerCase()).size
bonusPercent += (affix.coverageK ?? 0) * unique
```

### 参数建议（待 playtest 调优）

| 参数 | 建议范围 | 说明 |
|------|---------|------|
| clusterK | 8~15 | 每单位辅音丛长度的 bonus%。"str"(2单位) 给 16~30%，"ngth"(3单位) 给 24~45% |
| coverageK | 3~6 | 每个不同字母的 bonus%。"typewriting"(11) 给 33~66%，"banana"(3) 给 9~18% |

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/src/data/affixes.ts` | 修改 | 枚举、分类、名称、描述、权重、AffixInstance 参数 |
| `src/src/data/affixTrigger.ts` | 修改 | isConsonant() + Phase 2 switch 两个 case |
| `src/src/data/skillGeneration.ts` | 修改 | generateAffix() 两个 case |
| `src/src/ui/keyboard/KeyTooltip.ts` | 修改 | tooltip 渲染两个 case |
| `src/tests/unit/data/affixes.test.ts` | 修改 | 枚举数量 + 分布数量 |
| `src/tests/unit/data/affixTrigger.test.ts` (新建或追加) | 新增 | Cluster/Coverage Phase 2 测试 |

### 依赖方向

```
affixes.ts (数据定义) ← affixTrigger.ts (触发逻辑) ← skillGeneration.ts (生成)
                                                      ← KeyTooltip.ts (显示)
```

先改 affixes.ts → 再改 affixTrigger.ts → 最后改 skillGeneration.ts + KeyTooltip.ts

### Project Structure Notes

- 新词条不涉及 `systems/` 或 `scenes/` 层——纯 `data/` 层变更 + UI tooltip
- 遵循 `data → core → systems → scenes` 依赖方向
- `isConsonant()` 工具函数放在 `affixTrigger.ts` 内（和 `isFirstOrLastLetter()` 同级）

### References

- [Source: docs/stories/epic-45-new-affix-expansion.md#Story 45.2]
- [Source: docs/brainstorming-session-2026-04-01.md#词感型词条创意（最终版）]
- [Source: src/data/affixTrigger.ts#resolvePhase2 — Phase 2 switch 结构]
- [Source: src/data/affixes.ts#AFFIX_WEIGHT_TIERS — 权重分档]
- [Source: docs/implementation-artifacts/45-1-category-restructure.md — 前置 Story 完成记录]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

无

### Completion Notes List

- ✅ AffixType 枚举: 22→24 (+ Cluster, Coverage)
- ✅ AFFIX_CATEGORY_MAP: word_sense 3→5
- ✅ isConsonant() 工具函数: VOWELS Set + 范围检查，export 供测试
- ✅ Phase 2 两个 case 实现：Cluster 遍历最长辅音段, Coverage 用 Set.size
- ✅ skillGeneration: clusterK 8~15, coverageK 3~6
- ✅ shop.ts paramSummary: 中文格式化显示
- ✅ 19 个新测试全部通过
- ⚠️ AC2 修正：typewriting 实际 9 种字母（非 11），测试已对齐

### File List

- `src/src/data/affixes.ts` — AffixType 枚举 + 分类 + 名称 + 描述 + 权重 + AffixInstance 参数
- `src/src/data/affixTrigger.ts` — isConsonant() + Phase 2 Cluster/Coverage case
- `src/src/data/skillGeneration.ts` — generateAffix() Cluster/Coverage 分支
- `src/src/systems/shop.ts` — buildAffixParamSummary() Cluster/Coverage case
- `src/tests/unit/data/affixes.test.ts` — 枚举数量 + 分类分布更新
- `src/tests/unit/data/affixClusterCoverage.test.ts` — 新建，19 个测试
