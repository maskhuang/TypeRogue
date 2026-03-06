# Story 21.3: 金币转化者技能

Status: done

## Story

As a 玩家,
I want 通过转化者技能在金币与其他资源之间互相转化,
so that 金币不再是孤立资源，而是融入整个资源转化网络，为 build 构筑提供更多组合路径.

## Acceptance Criteria

1. **金币为源（8 个）**：gold → base/score/multiplier/time × add/multiply
   - `conv_gold_base_add`（收购）、`conv_gold_base_mul`（镀金）
   - `conv_gold_score_add`（贿赂）、`conv_gold_score_mul`（悬赏）
   - `conv_gold_mult_add`（雇佣）、`conv_gold_mult_mul`（投机）
   - `conv_gold_time_add`（赎买）、`conv_gold_time_mul`（朝贡）
   - k 值基于 gold mid ~15 调参，产出量与同目标现有转化者一致
2. **其他资源 → 金币（2 个）**：
   - `conv_score_gold_add`（征税）：分数→金币 add，k=0.002，基于 score mid ~1000
   - `conv_time_gold_add`（典当）：时间→金币 add，k=0.05，基于 time mid ~40
3. 在 `CONVERTERS` 中注册，`isConverter()` / `getConverterK()` / `getConverterDesc()` 自动适配
4. `triggerConverter` / `triggerConverterWithReduction` 的 gold target 分支通过 generic else 正确执行（直接操作 `state.resources.gold`，无需特殊分支）
5. `getSourceValue('gold', resources)` 通过 generic 返回路径直接返回 `resources.gold`
6. `drawConverterPool` 池中自动包含金币转化者（总池 40→50，默认抽取数保持 20）
7. 战后统计中金币转化正确记录（`recordSkillTrigger` 通过 `EMPTY_RESOURCES` 含 gold 自动支持）
8. `getSkillSchool` 通过 `if (skillId in CONVERTERS)` 自动识别为'转化'流派，无需额外映射
9. 构建通过，现有测试通过，新增测试覆盖

## Tasks / Subtasks

- [x] Task 1: 新增金币转化者数据 (AC: 1, 2, 3)
  - [x] 1.1 `data/converters.ts` — 新增 8 个 gold-source 转化者（gold → base/score/multiplier/time × add/multiply）
  - [x] 1.2 `data/converters.ts` — 新增 2 个 other→gold 转化者（score→gold add, time→gold add）
- [x] Task 2: 验证触发逻辑 (AC: 4, 5)
  - [x] 2.1 确认 `triggerConverter` generic else 分支处理 gold target add（`state.resources.gold += delta`）
  - [x] 2.2 确认 `triggerConverter` generic else 分支处理 gold target multiply（`state.resources.gold *= factor`）
  - [x] 2.3 确认 `triggerConverterWithReduction` generic 分支支持 gold target
  - [x] 2.4 确认 `getSourceValue('gold', resources)` 通过 generic 返回 `resources.gold`
- [x] Task 3: 验证商店与流派 (AC: 6, 8)
  - [x] 3.1 确认 `drawConverterPool` 通过 `Object.keys(CONVERTERS)` 自动包含新转化者
  - [x] 3.2 确认 `getSkillSchool` 自动识别新转化者为'转化'流派
- [x] Task 4: 更新测试 (AC: 9)
  - [x] 4.1 总数 40→50
  - [x] 4.2 更新源计数：score 8→9, time 8→9, 新增 gold 8
  - [x] 4.3 组合数 40→50，更新覆盖测试描述
  - [x] 4.4 `getSourceValue` 测试 resources 对象新增 `gold: 15`，新增 gold 源测试用例
  - [x] 4.5 `drawConverterPool` "超过总数" 测试 40→50
  - [x] 4.6 新增 10 个转化者 k 值验证

## Dev Notes

### 关键设计决策

**金币为源 — 不含 gold→shield 路径：**
- Epic 明确指定 `gold → base/score/multiplier/time`，不含 shield
- 既有模式：每个源转化到 4 个非自身目标；gold 排除 shield（设计选择：金币→护盾路径不直观）
- 因此 gold source 只有 8 个（不是 10 个）

**其他→金币 — 仅 2 个 add 路径：**
- Epic 指定 `conv_score_gold_add` 和 `conv_time_gold_add`
- 分数和时间是最自然的"兑换金币"资源路径
- 不含 base→gold / multiplier→gold / shield→gold（设计选择：限制金币获取路径）
- 不含 multiply 公式（设计选择：金币获取保持线性可预期）

**k 值校准原则（gold mid ~15，与 base mid ~15 同量级）：**

| 目标资源 | 现有→X add 产出 | gold→X add k | 验证 (15×k) |
|---------|----------------|-------------|-------------|
| base | ~6 | 0.4 | 6.0 ✓ |
| score | ~15 | 1.0 | 15.0 ✓ |
| multiplier | ~0.2 | 0.015 | 0.225 ≈ 0.2 ✓ |
| time | ~2s | 0.13 | 1.95 ≈ 2 ✓ |

| 目标资源 | 现有→X mul 系数 | gold→X mul k | 验证 (1+15×k) |
|---------|----------------|-------------|---------------|
| base | ~1.6 | 0.04 | 1.6 ✓ |
| score | ~1.075 | 0.005 | 1.075 ✓ |
| multiplier | ~1.12 | 0.008 | 1.12 ✓ |
| time | ~1.075 | 0.005 | 1.075 ✓ |

| 源→gold | 源 mid | k | 验证 (mid×k) |
|---------|--------|---|-------------|
| score→gold add | ~1000 | 0.002 | 2 金币 |
| time→gold add | ~40 | 0.05 | 2 金币 |

**triggerConverter 已自动支持 gold：**
- gold target add: generic else `state.resources[conv.target] += delta` → `state.resources.gold += delta`
- gold target multiply: generic else `state.resources[conv.target] *= factor` → `state.resources.gold *= factor`
- gold source: `getSourceValue('gold', resources)` generic 返回 `resources.gold`
- 无需像 shield 那样 floor（金币在 openShop 结算时 `Math.floor`）
- `triggerConverterWithReduction` 同样通过 generic 分支自动支持

### 10 个新转化者完整数据

```
conv_gold_base_add:   收购 🏪  gold→base       add      k=0.4
conv_gold_base_mul:   镀金 ✨  gold→base       multiply k=0.04
conv_gold_score_add:  贿赂 💸  gold→score      add      k=1.0
conv_gold_score_mul:  悬赏 🎖️  gold→score      multiply k=0.005
conv_gold_mult_add:   雇佣 🤝  gold→multiplier add      k=0.015
conv_gold_mult_mul:   投机 📊  gold→multiplier multiply k=0.008
conv_gold_time_add:   赎买 🔑  gold→time       add      k=0.13
conv_gold_time_mul:   朝贡 🏺  gold→time       multiply k=0.005
conv_score_gold_add:  征税 📜  score→gold      add      k=0.002
conv_time_gold_add:   典当 ⚖️  time→gold       add      k=0.05
```

### 现有代码定位

| 文件 | 位置 | 修改内容 |
|------|------|---------|
| `src/src/data/converters.ts` | line 108 末尾 | 新增 10 个金币转化者 |
| `tests/unit/data/converters.test.ts` | 多处 | 计数、源分组、组合数、新增 k 值测试 |

### 无需修改的文件（自动适配）

| 文件 | 函数 | 原因 |
|------|------|------|
| `systems/skills.ts` | `triggerConverter` | generic else 分支自动处理 gold target |
| `systems/skills.ts` | `triggerConverterWithReduction` | generic 分支自动处理 gold target |
| `systems/skills.ts` | `recordSkillTrigger` | EMPTY_RESOURCES 已含 gold: 0 |
| `data/converters.ts` | `isConverter` / `getConverterK` / `getConverterDesc` | 使用 CONVERTERS[id] 查表 |
| `data/converters.ts` | `drawConverterPool` | 使用 Object.keys(CONVERTERS) |
| `data/converters.ts` | `getSourceValue` | generic 返回 resources[source] |
| `data/skills.ts` | `getSkillSchool` | `skillId in CONVERTERS` 自动匹配 |

### Project Structure Notes

- 遵循 `data → core → systems → scenes` 依赖方向
- converters.ts 是纯数据文件，无副作用
- 新增转化者自动被所有工具函数识别
- 测试需更新计数和覆盖断言

### References

- [Source: docs/epics.md#Epic 21 Story 21.3]
- [Source: docs/stories/21-2-gold-producer-skills.md — 前置 Story]
- [Source: src/src/data/converters.ts — 转化者数据定义]
- [Source: src/src/systems/skills.ts#triggerConverter — 触发逻辑]
- [Source: src/src/data/converters.ts#getSourceValue — 源值读取]

## Dev Agent Record

### Agent Model Used
claude-opus-4-6

### Debug Log References
None

### Completion Notes List
- 新增 10 个金币转化者：8 个 gold-source + 2 个 other→gold
- gold-source k 值基于 gold mid ~15 校准，产出量与同目标现有转化者一致
- other→gold (score→gold k=0.002, time→gold k=0.05) 每次触发产出 ~2 金币
- triggerConverter / triggerConverterWithReduction / getSourceValue 无需修改（generic 分支自动支持）
- 测试 50/50 全通过，全套 2322/2327 通过（5 个失败为 pre-existing）
- Code review 修复：金币转化者 desc 测试、isConverter 金币样本、测试头注释更新

### File List
- `src/src/data/converters.ts` — 新增 10 个金币转化者，注释更新 40→50
- `src/tests/unit/data/converters.test.ts` — 计数 40→50，源分组更新，新增 gold 源/k 值测试
