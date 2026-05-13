# Tag 系统接口规格

> Created: 2026-05-11
> Status: 接口设计（spec），未落 .ts 代码
> 关联: `affix-rewrite-research.md` §5（trigger 系统）

---

## 0. 范围与目标

`tag` 是新 affix 系统里**唯一全新的代码**——其他 4 个 fire-filter 维度（posRel / resource / is_crit / stack_state）全部沿用现有实现。

**2026-05-12 范围收敛**：初版只实施 `section` namespace 一组（8 tag）。其他 3 个 namespace（origin / class / mechanic）推迟到后续 phase——理由见 §1.2-1.4。

tag 的核心职责：
1. 给每个词条挂一组**可查询的标签**（初版每词条 1 个 section tag）
2. 让 `on_fire(filter: tag:X)` 能匹配 fire 事件源的标签
3. 让 `effect` 里能用 `count(tag:X) × k` 做 Bazaar 风涌现缩放
4. 让 build identity 通过"凑同 tag"自然涌现

旧系统的 `AFFIX_CATEGORY_MAP: Record<AffixType, AffixCategory[]>` 是这套机制的**前身**，但只有一个 namespace（numeric/crit/stack/topology/word_sense/meta_rule/production），且不参与 trigger filter，只用作商店权重 / 遗物条件。新系统是**多 namespace + filter 一等公民**。

---

## 1. Tag 词表（初版 · 仅 section）

> **2026-05-12 决议**：初版只实施 §1.1 `section` namespace 一组（8 项）。其他 3 个 namespace 推迟到后续 phase。

### 1.1 section · ethogram 段（8）✅ 实施
词条来源的 ethogram 段落。**P1 实装词条全部标注**。每个词条**恰好 1 个** section tag（来自定义段落）。
```
maintenance · locomotion · posture · agonistic · vocal · gesture · tool · abnormal
```

### 1.2 origin · chimp 田野文化（8）⏸️ 推迟
主要用于**遗物**层（chimp 文化考古标志物）。
```
gombe · mahale · bossou · tai · sonso · fongoli · kibale · cross_site
```
**推迟原因**：遗物层的 origin tag 是否做 build 主轴尚未决（详 research §4.6 开放问题）；遗物本身的命名包装层也未决。等遗物层决议后再加。

### 1.3 class · 职业限制（3）⏸️ 推迟
```
wordsmith · metamorph · generic
```
**推迟原因**：已有 `ClassResourceFilter.ts` 系统在处理职业过滤；除非有词条层的"职业 tag"查询需求出现，不引入冗余 tag。

### 1.4 mechanic · 角色定位（6）⏸️ 推迟
```
aura · broadcast · stack · scale · conditional · cooldown
```
**推迟原因**：mechanic tag 是 build identity 用的"软分类"——但 P1 阶段词条数量少，build identity 是否需要靠 mechanic tag 来 scaffold 还不清楚。等 P1 词条实装后看实际涌现情况，决定是否需要 mechanic tag。

### 1.5 命名约束
- 所有 tag 在全 namespace 内必须**唯一**（避免 "wordsmith" 既是 class 又是别的）
- 命名 snake_case（小写，下划线连接）
- 词表是 closed set（编译期校验），增 tag = 改 TAGS 常量

---

## 2. 数据接口

### 2.1 Tag 类型

```ts
// src/src/data/affixTags.ts

/** 所有合法 tag 的扁平词表（编译期校验）·初版仅 section namespace */
export const TAGS = [
  // section · ethogram 段
  'maintenance', 'locomotion', 'posture', 'agonistic',
  'vocal', 'gesture', 'tool', 'abnormal',
] as const

export type Tag = typeof TAGS[number]

/** 按 namespace 分组的命名引用（仅供查阅） */
export const TAG_NS = {
  section: ['maintenance', 'locomotion', 'posture', 'agonistic',
            'vocal', 'gesture', 'tool', 'abnormal'] as const,
  // 推迟（详 §1.2-1.4）：
  // origin: [...] · class: [...] · mechanic: [...]
} as const
```

### 2.2 词条挂标签

新 `Affix` schema 包含 `tags`：

```ts
interface Affix {
  id: string                    // 'pant_hoot' / 'termite_fish' / ...
  name: string                  // '喘啸' / '钓白蚁' / ...
  trigger: TriggerSpec
  tags: readonly Tag[]          // 1-N 个 tag
  effect: EffectSpec
}
```

例：
```ts
{
  id: 'pant_hoot',
  name: '喘啸',
  trigger: { type: 'on_fire', filter: { resource: 'multiplier' } },
  tags: ['vocal'],   // 初版只有 section tag
  effect: { kind: 'add', base: 0, scale: { tag: 'vocal', factor: 1 } },
}
```

**初版每个词条 tags 长度 = 1**（仅 section）。其他 namespace 加入后会扩到 2-3。

---

## 3. 查询接口

### 3.1 TagScope

```ts
type TagScope =
  | { kind: 'self'; affixId: string }
  | { kind: 'skill'; skillId: string }
  | { kind: 'all_skills' }                      // 全 loadout
  | { kind: 'fire_source'; event: FireEvent }   // 当前 fire 事件源
```

### 3.2 TagQuery 函数

```ts
// src/src/systems/tagQuery.ts

/** 计数 scope 中带 tag 的词条 */
export function countByTag(tag: Tag, scope: TagScope): number

/** 判断特定词条是否有 tag */
export function hasTag(affixId: string, tag: Tag): boolean

/** 列出 scope 中带 tag 的词条 */
export function listByTag(tag: Tag, scope: TagScope): AffixInstance[]

/** 多 tag · any-of（OR） */
export function countAny(tags: readonly Tag[], scope: TagScope): number

/** 多 tag · all-of（AND） */
export function countAll(tags: readonly Tag[], scope: TagScope): number
```

### 3.3 性能契约

- `countByTag` / `hasTag` / `countAny` / `countAll`：**O(1) 摊销**（用反向索引 Map<Tag, AffixInstance[]>），每次 loadout 变动重建
- `listByTag`：返回不可变快照引用，调用方不得修改
- scope 为 `all_skills` 时使用全局索引；scope 为 `skill` 时使用 per-skill 子索引
- `fire_source` scope：根据 event 现场计算（不缓存）

### 3.4 用例

```ts
// 例 1: 在 effect 里读 tag 数缩放
const vocalCount = countByTag('vocal', { kind: 'all_skills' })
output += baseValue * vocalCount

// 例 2: 在 on_fire 触发时判断 fire 源
if (hasTag(event.sourceAffixId, 'burn')) { /* ... */ }

// 例 3: 凑 build 检测
const isVocalBuild = countByTag('vocal', { kind: 'all_skills' }) >= 4
```

---

## 4. Fire Filter 接口

### 4.1 FireEvent

```ts
interface FireEvent {
  sourceAffixId: string
  sourceSkillId: string
  sourceKey: string                 // e.g., 'K'
  sourceResource: ResourceType      // 产出的资源类型
  isCrit: boolean                   // 是否暴击
  stackState: 'full' | 'partial' | 'none'
  amount: number                    // 产出数值
  timestamp: number                 // ms
}
```

### 4.2 FireFilter

```ts
interface FireFilter {
  tag?: Tag | readonly Tag[]        // any-of 语义
  posRel?: PositionRelation         // 沿用 keyboardTopology
  resource?: ResourceType           // 沿用 Resonance/Connector 机制
  is_crit?: boolean                 // 沿用 TriggerResult.isCrit
  stack_state?: 'full' | 'partial'  // 沿用 onStackEffectTriggered
}
```

### 4.3 匹配函数

```ts
/**
 * 判断 FireEvent 是否匹配 FireFilter。
 * 多个 filter 字段并存时取 AND 语义（全部满足）。
 * filter 字段缺失 = 不限制该维度。
 */
export function matchFireFilter(
  event: FireEvent,
  filter: FireFilter,
  listenerKey: string  // posRel 解析需要监听方位置
): boolean
```

### 4.4 用例

```ts
// 任意倍率资源技能暴击时触发
filter: { resource: 'multiplier', is_crit: true }

// 邻居满层释放时触发
filter: { posRel: PositionRelation.Adjacent, stack_state: 'full' }

// burn 类技能未暴击时触发（反向触发流派）
filter: { tag: 'burn', is_crit: false }

// 多 tag any-of: 任何 vocal 或 gesture 类
filter: { tag: ['vocal', 'gesture'] }
```

---

## 5. Effect 缩放接口

把 tag 计数接入 effect 数值计算。

### 5.1 ScaleByTag

```ts
interface ScaleByTag {
  type: 'tag_count'
  tag: Tag | readonly Tag[]    // 多 tag → countAny
  factor: number               // 每个匹配 tag +factor
  scope?: TagScope             // default: { kind: 'all_skills' }
}
```

### 5.2 EffectSpec（10 kind · 2026-05-12 锁定）

**composite 使用约束（2026-05-12 决议）**：composite **仅用于 stack 模式**——把 stack_inc + stack_release 在同 trigger 下 atomic 组合。其他"同 trigger 多 effect"场景应**拆为多 affix**（同 skill 多槽位）；不要把 composite 作为通用复合容器。

合法：`composite([stack_inc(1), stack_release(8, gain, reset:true)])`
不合法：`composite([add, gain_resource])` — 拆 2 affix。



```ts
export type EffectSpec =
  | { kind: 'noop' }                                                            // 占位
  | { kind: 'add'; amount: number; scale? }                                     // 关内成长 base
  | { kind: 'multiply'; amount: number; scale? }                                // 关内成长 factor
  | { kind: 'gain_resource'; resource: string; amount: number; scale? }         // 一次性产出
  | { kind: 'multiply_output'; factor: number; scale? }                         // 一次性 ×factor
  | { kind: 'composite'; effects: readonly EffectSpec[] }                       // 顺序结算
```

**关内成长 vs 一次性**——两轴正交，是 build 设计的核心决策：

| Kind | 类型 | 累积？ | 重置 | 数值演算（fire N 次后） |
|---|---|---|---|---|
| `add` | 关内成长 base | ✅ | battle end | `base = init_base + N × amount` |
| `multiply` | 关内成长 factor | ✅ | battle end | `factor = 1 + N × amount`（线性，非指数）|
| `gain_resource` | 一次性产出 | ❌ | N/A | 每次 fire 产出固定 amount |
| `multiply_output` | 一次性 ×factor | ❌ | N/A | 每次 fire 总产出 × factor，仅本次 |

**关内成长**模仿 Bazaar "for the fight" pattern：早期慢、后期爆——build 曲线右倾。  
**一次性**线性贡献——前后期稳定。

### 5.3 数值层结算顺序

`composite` 内部 effect 按 affixV2 schema 出现顺序结算。`add` 与 `multiply` 都对**下次 fire** 生效，本次 fire 不享受刚刚累加的增益。

数值层映射（与旧 6-phase 管线对齐）：

| Kind | 数值层 |
|---|---|
| `add` | 加算层 base 累加（Phase 2） |
| `multiply` | 乘算层 factor 累加（Phase 3） |
| `gain_resource` | 直接资源 ledger += ratio × Lv1_base |

### 5.5 TargetSelector · 统一范围类型（2026-05-12 锁定）

`fire_target / apply_aura / apply_status / ScaleByTag.scope / count_tag_*.scope` **共用一个 TargetSelector 类型**：

```ts
type TargetSelector =
  | { type: 'self' }
  | { type: 'neighbors'; posRel: PositionRelation; pick?: 'all' | 'random' }
  | { type: 'matched_tag'; tag: Tag; pick?: 'all' | 'random' }
  | { type: 'matched_resource'; resource: string; pick?: 'all' | 'random' }
  | { type: 'all_skills'; pick?: 'all' | 'random' }
```

`pick` 量词：
- `'all'`（默认）→ 范围内全部目标
- `'random'` → 范围内随机 1 个

计数 context（ScaleByTag / count_tag_*）下 `pick` 被忽略。

**例**：
- `fire_target` + `{ type: 'neighbors', posRel: SameRow, pick: 'all' }` —— 触发同行所有 skill
- `apply_aura` + `{ type: 'neighbors', posRel: Adjacent, pick: 'all' }` —— buff 所有 8 方向邻接 skill
- `apply_status` + `{ type: 'matched_tag', tag: 'vocal', pick: 'random' }` —— 给随机 1 个 vocal skill 加 status
- `apply_aura` + `{ type: 'matched_resource', resource: 'multiplier', pick: 'all' }` —— buff 所有产倍率的 skill
- `ScaleByTag.scope: { type: 'neighbors', posRel: Adjacent }` —— 只计 8 方向邻接 skill 上的 tag
- `ScaleByTag.scope: { type: 'matched_resource', resource: 'score' }` —— 只计 score 产出 skill 上的 tag

### 5.4 资源-anchored ratio 约定（2026-05-12 锁定）

涉及"资源数值"的字段一律用 **`ratio: number`**——`0.5` 意为 50% 的资源 Lv1 base。

#### Effect 侧（产出/buff）
| 字段 | 解析公式 |
|---|---|
| `add.ratio` | skill base += ratio × skill_resource_Lv1_base |
| `gain_resource.ratio` | 产出 = ratio × resource_Lv1_base |
| `AuraModifier.base_add.ratio` | 邻居 base += ratio × neighbor_resource_Lv1_base |

#### Condition 侧（阈值/判定）
| 字段 | 解析公式 |
|---|---|
| `ConditionSpec.resource_below.ratio` | 阈值 = ratio × resource_Lv1_base；条件 = `current < 阈值` |
| `ConditionSpec.resource_above.ratio` | 同上反向 |

**非资源-anchored 字段保持原 `amount`**（factor delta / 百分比 / 整数 count）：

| 字段 | 单位 |
|---|---|
| `multiply.amount` | factor delta（0.5 = +0.5 倍率每 fire）|
| `AuraModifier.factor_add.amount` | 同上 |
| `AuraModifier.crit_chance_add.amount` | 绝对百分比（0.1 = +10%）|
| `AuraModifier.output_bonus_pct.amount` | 绝对百分比 |
| `apply_status.amount` | status 层数（整数）|
| `stack_inc.amount` / `stack_release.threshold` | stack 计数（整数）|

**意义**：跨资源等效——ratio=0.5 在 score / time / gold 上自动产出对应 Lv1 base 的一半，不需要设计师手动调每个资源的数字。S1.b 的 throughput target 也按 ratio 计算，与具体资源解耦。

### 5.3 解析函数

```ts
/**
 * 把 EffectSpec 解析为最终数值（在触发时调用）。
 * 不修改 spec；只读 scope 状态。
 */
export function resolveEffect(spec: EffectSpec, ctx: ResolveContext): number
```

---

## 6. 兼容性 · 与现有 AFFIX_CATEGORY_MAP 的关系

旧 `AFFIX_CATEGORY_MAP` 不直接复用——新 tag 系统替代它。但**迁移期**两套并存的方案：

| 旧概念 | 新替代 |
|---|---|
| `AffixCategory: 'numeric'` | 不直接对应；P1 不重建 numeric tag，看 mechanic 演化后再决定是否补 |
| `AffixCategory: 'crit'` | 同上；可作 mechanic tag `crit` 后期补 |
| `AffixCategory: 'stack'` | `mechanic:stack` |
| `AffixCategory: 'topology'` | 不需要 tag——topology 已通过 posRel filter 表达 |
| `AffixCategory: 'word_sense'` | 不需要 tag——已被 P1 排除（决议 C） |
| `AffixCategory: 'meta_rule'` | 不需要 tag——大部分进档 4 不迁 |
| `AffixCategory: 'production'` | 不直接对应——所有词条都产出，不需要专 tag |

**关键**：旧 7 个 category 大多无法 1:1 转新 tag——这正符合决议 4 选 C "完全重做" 的本意。新 tag 不需要 backwards-compat。

---

## 7. 实施步骤（按依赖排序）

1. **建词表常量** · `src/src/data/affixTags.ts` · ✅ **2026-05-12 完成**：TAGS + Tag type + SECTION_TAGS + TAG_NS + isTag/isSectionTag + SECTION_TAG_NAMES_ZH
2. **建 query 接口** · `src/src/systems/tagQuery.ts` · ✅ **2026-05-12 完成**：FireEvent + FireFilter + TagScope + 查询函数（registry / instances / self / fire_source 实装；all_skills 待战斗 runtime 接入）
3. **建 affixV2 数据层** · ✅ **2026-05-12 完成**：
   - `src/data-json/affixV2.json` — 132 条命名（来源 naming-pool §1.1-1.8 字面）
   - `src/src/data/schemas/affixV2.schema.ts` — zod schema + loader
   - `src/src/data/affixV2.ts` — AffixV2Definition / AffixV2Instance 类型 + 注册表（getById / isAffixV2Id / listBySection / listByPhase）+ id 反向索引
4. **建反向索引** · ✅ tagQuery.ts 内 `Map<Tag, AffixV2Definition[]>` 构建于模块加载（O(1) lookup）
5. **接 fire filter** · ✅ matchTagFilter 实装；fire orchestrator 聚合点待后续接入
6. **接 effect scaling** · ⏳ 待 effect spec 类型定义后实装
7. **建 tooltip 适配器** · ✅ **2026-05-12 完成**：`src/src/ui/affixV2TooltipAdapter.ts`——AffixV2Definition → AffixTooltipInfo 转换，让现有 KeyTooltip / shopTerminal 无改动即可渲染新词条
8. **单测** · ✅ **2026-05-12 完成**：`src/tests/unit/data/affixV2.test.ts` 23 tests pass（数据完整性 / 注册表 / 静态查询 / instances scope / matchTagFilter）

实际代码量（不含 JSON）：~600 行。

---

## 8. 开放问题

1. **Tag 词表是否够 / 是否冗余**：4 个 namespace × ~6 项 = 25 项。是否需要再拆？比如 mechanic 是否要拆"主动 / 被动"两族？
2. **是否需要 tag 别名 / 显示名 i18n**：tag 是机器标识符；UI 显示给 player 时是否需要"vocal → 鸣叫"映射？还是 player 不看 tag，只看词条名？
3. **mechanic tag 的设计纪律**：随着新词条设计，mechanic tag 会被频繁取用。需不需要一个 "tag-as-build-archetype" 设计规范，避免 mechanic tag 数量爆炸？
4. **跨词条 tag 引用的循环**：词条 A 的 effect 读 count(tag:X)，A 自己挂 tag:X——是否计入自身？需要 self/non-self 选项？

---

## 9. Tooltip 展示规格（2026-05-12 决议）

### 9.1 chip 形态 · 聚合到 header（与稀有度 chip 同行）

**结构决议**：section chip **不挂在每行词条名上**，而是**聚合到 header 区**，与稀有度 chip（`[普通]/[稀有]/[史诗]/[传说]`）并列。一个技能下所有词条的 unique section 去重后整组展示。

```
🐒 工位 K · 金币 LV.1
[普通] [维持] [移动] [对抗] [发声] [工具]
🪙 金币 +3
<反刍> +1
  缓存→重触发
<冲撞> +1
  单次大额爆发
...
```

- chip 反映"本技能覆盖的 section 集合"，是 deck identity 信号
- 词条区下方保持纯净：`<词条名> +参数` + desc，无 chip 干扰
- 多 chip 自然换行（tooltip 宽度限制时）

### 9.2 chip 文本

来自 `affixTags.ts` 的 `SECTION_TAG_NAMES_ZH`：

| Section tag | chip 文本 |
|---|---|
| maintenance | 维持 |
| locomotion | 移动 |
| posture | 姿势 |
| agonistic | 对抗 |
| vocal | 发声 |
| gesture | 手势 |
| tool | 工具 |
| abnormal | 异常 |

### 9.3 实现要求

- **CSS class**: `tooltip-section-tag`，**完全照搬 `tooltip-skill-school` 样式**——在 dark 默认上下文用深灰底 + 边框；在 shop-preview cream 上下文用牛皮纸底 + 褐字 + 褐框 + Courier
- **DOM 位置**: `KeyTooltip.ts buildHeaderSection` 中，紧跟 `tooltip-skill-school` 后渲染（同行）
- **数据源**: 遍历 `skill.affixInfo[*].section`，Set 去重保序
- **AFFIX_COLORS 不扩**: 不为 section 设独立色——监色与"普通/稀有"chip 同 monotone register

### 9.4 Terminal CRT dossier（shopTerminal.ts）

终端 ASCII 风格采用**逐行前置 `[SECTION_EN]`**（与 header 聚合方式不同 · 终端无 chip DOM，沿用 `[PCK] [REL] [SYN:0]` 同屏 pattern）：

```
AFFIXES
  [MAINTENANCE] ‹BARE-EARED SQUIRREL MONKEY› ×2.7
    Hold to charge, releases output multiplier...
  ‹CHACMA BABOON› 4
    Stacks when any skill crits...
```

实现：`shopTerminal.ts:436` 与 `:944` 两处的 `‹AFFIX› +params` 行拼接处。

### 9.5 未决·动态 count 显示

`count(tag:X)` 在 effect 描述里出现时是否动态展示当前计数？例：`<喘啸> +1 × count(vocal)  当前 vocal=4 → +4`。  
推荐但未锁定——P1 实装时再视体验决定。

### 9.6 未决·"deck overview"独立 UI

跨技能的全局 section 计数由独立 UI 元素常驻显示？  
属 build-axis 标准答案，但**不属 tooltip**，P1 不必有。

---

## 10. 与 trigger / scaling 系统的总图

```
Affix {
  id, name
  ┌─────────────────────────────────────────┐
  │ trigger: { type, filter? }              │ ← §5 trigger 系统
  │   ↓ filter 5 维（tag 是其一）             │
  │   tag, posRel, resource, is_crit, stack │
  └─────────────────────────────────────────┘
  ┌─────────────────────────────────────────┐
  │ tags: [Tag, Tag, ...]                   │ ← §1-2 本文档
  └─────────────────────────────────────────┘
  ┌─────────────────────────────────────────┐
  │ effect: { kind, base, scale?: ScaleBy   │ ← §5 本文档
  │            { tag, factor, scope } }     │
  └─────────────────────────────────────────┘
}
```

tag 系统同时被 trigger filter 和 effect scaling 引用——所以它是新系统的真正"中枢"。
