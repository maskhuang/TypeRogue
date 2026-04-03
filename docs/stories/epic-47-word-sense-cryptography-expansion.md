---
title: "Epic 47: 词感型扩展 — 密码学领域 3 个新词条"
epic_key: "epic-47"
status: "draft"
created: "2026-04-03"
design_source: "design-affix skill session 2026-04-03"
domain: "密码学"
category: "word_sense"
stories:
  - "47-1-word-sense-entropy"
  - "47-2-word-sense-cipher"
  - "47-3-pattern-freq-table"
  - "47-4-word-sense-pattern"
  - "47-5-generation-integration"
  - "47-6-balance-playtest"
---

# Epic 47: 词感型扩展 — 密码学领域 3 个新词条

## 背景

Epic 45 将词感类别补齐至 6 个词条（Outcast/Gravity/Ligature/Cluster/Coverage/Bigram），全部基于单词的「字母级局部统计」。本 Epic 从密码学领域引入「字符串整体信息属性」视角，增加 3 个新词条。

### 设计动机

现有词感词条的 f(word) 都是对字母的局部统计（位置、频次、分类、去重、字母对）。密码学天然操作字符串，提供了全新的度量维度：信息熵、字母表距离、结构模式。这些度量关注的是单词作为整体的「信息学属性」，与现有词条完全正交。

### 核心映射

```
currentWord (字符串) → 密码学明文 → 信息度量 f(word) → bonusPercent
```

同一变量（currentWord），不同 f() 函数：

| 词条 | f() | 体感 |
|------|-----|------|
| Entropy | Shannon 熵 H(word) | 字母越均匀越强 |
| Cipher | 相邻字母表距离均值 | 字母跳跃越大越强 |
| Pattern | 模式签名稀有度 -log₂(freq) | 重复结构越独特越强 |

### 设计原则

- **接入共享机制，不造孤岛**：三个词条全部读 `currentWord`（共享）+ 写 `bonusPercent`（共享），零私有 runtime 状态
- **整体属性 > 局部统计**：与现有词感词条的「字母级」视角形成层次区分
- Pattern 需要 PATTERN_FREQ_TABLE 静态数据表（类比 Bigram 的 BIGRAM_FREQ_TABLE）

### 新词条总览

| 词条 | 中文名 | 机制 | 读共享 | 写共享 | f() 形状 |
|------|--------|------|--------|--------|---------|
| Entropy | 熵 | 字母分布 Shannon 熵 → bonus | currentWord | bonusPercent | 连续平滑 |
| Cipher | 密文 | 相邻字母表距离均值 → bonus | currentWord | bonusPercent | 连续平滑 |
| Pattern | 模式 | 模式签名稀有度(-log₂freq) → bonus | currentWord | bonusPercent | 对数曲线 |

### 与现有词感词条的区分矩阵

| 维度 | 现有词条 | 新词条 |
|------|---------|--------|
| 字母位置 | Outcast（首/尾） | — |
| 字母频次 | Ligature（重复数） | Entropy（分布均匀度） |
| 辅音/元音 | Cluster（连续辅音段） | — |
| 字母多样性 | Coverage（去重数） | Entropy（更精细的均匀度量） |
| 字母对频率 | Bigram（罕见度） | — |
| 字母表距离 | — | Cipher（相邻跳跃距离） |
| 结构模式 | — | Pattern（重复结构形状） |
| 词库权重 | Gravity（概率调整） | — |

## Stories

---

### Story 47.1: 词感型 — 熵 (Entropy)

**复杂度: Small**
**依赖: 无**

实现熵（Entropy）词条：计算当前单词字母分布的 Shannon 熵，熵越高（字母越均匀分布）bonus 越大。

**范围：**
- 新增 `AffixType.Entropy = 'entropy'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `word_sense`
- `AffixInstance` 新增参数：`entropyK: number`
- Phase 2 逻辑：
  ```
  word = ctx.currentWord
  if !word || word.length === 0: break
  // 计算字母频率
  freq = countLetterFrequencies(word)  // Map<char, count/length>
  // Shannon 熵
  H = -Σ p × log₂(p) for p in freq.values() where p > 0
  bonusPercent += entropyK × H
  ```
- 新增工具函数 `shannonEntropy(word: string): number`（纯函数）
- 更新 `AFFIX_NAMES` / `AFFIX_DESCRIPTIONS`
- 更新 `AFFIX_WEIGHT_TIERS`
- 更新 `KeyTooltip.ts`：AFFIX_COLORS
- 更新 `demo-i18n.ts`：中英文 name + desc
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| entropyK | 0.06~0.12 | 典型 H=2.0~2.6 → bonus +16~26% 对标 Void |

**数值验证：**

| 单词 | H(word) | bonus (K=0.10) |
|------|---------|----------------|
| "banana" | 1.46 | +14.6% |
| "typing" | 2.58 | +25.8% |
| "atmosphere" | 2.92 | +29.2% |

**涌现交互：**
- Coverage 高 → Entropy 通常也高，但不等价（"aabbc" Coverage=3 但熵 < "abcde" Coverage=5）
- Gravity 改变词库分布 → 间接影响遇到高熵词的概率

**验收标准：**
- AC1: "typing"(全不同字母) 的 bonus 明显高于 "banana"(重复多)
- AC2: 单字母单词 H=0 → bonus=0
- AC3: 与 Coverage 效果方向一致但数值不同（验证区分度）
- AC4: 技能生成可产出 Entropy 词条
- AC5: 单元测试覆盖纯重复/部分重复/全不同/单字母

**估点：** 3

---

### Story 47.2: 词感型 — 密文 (Cipher)

**复杂度: Small**
**依赖: 无**

实现密文（Cipher）词条：计算单词相邻字母在字母表上的距离均值，距离越大（字母跳跃越大）bonus 越大。

**范围：**
- 新增 `AffixType.Cipher = 'cipher'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `word_sense`
- `AffixInstance` 新增参数：`cipherK: number`
- Phase 2 逻辑：
  ```
  word = ctx.currentWord
  if !word || word.length < 2: break
  totalDist = 0
  for i in 0..word.length-2:
    totalDist += abs(charCode(word[i+1]) - charCode(word[i]))
  avgDist = totalDist / (word.length - 1)
  bonusPercent += cipherK × avgDist
  ```
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| cipherK | 0.01~0.03 | 典型 avgDist=8~12 → bonus +12~24% 对标 Void |

**数值验证：**

| 单词 | avgDist | bonus (K=0.02) |
|------|---------|----------------|
| "abc" | 1.0 | +2% |
| "type" | 9.0 | +18% |
| "quiz" | 11.0 | +22% |

**涌现交互：**
- 与 Cluster（辅音连续性）正交——"str" 辅音丛但字母距离不大
- 与 Outcast（首尾字母）互补——不同维度的字母位置属性

**验收标准：**
- AC1: "quiz"(高跳跃) 的 bonus 明显高于 "abc"(低跳跃)
- AC2: 单字母单词 → bonus=0（无相邻对）
- AC3: 大小写不影响计算（统一转大/小写）
- AC4: 技能生成可产出 Cipher 词条
- AC5: 单元测试覆盖顺序/跳跃/单字母/双字母

**估点：** 3

---

### Story 47.3: 模式频率表基础设施

**复杂度: Small**
**依赖: 无**

创建 PATTERN_FREQ_TABLE 静态数据表，类比 Bigram 的 BIGRAM_FREQ_TABLE。

**范围：**
- 新增 `data/patternFrequency.ts`
- 定义 `toPattern(word: string): string` 函数：
  ```
  "banana" → "ABCBDB"
  "apple"  → "ABBCD"
  "level"  → "ABCBA"
  "the"    → "ABC"
  ```
  规则：按首次出现顺序分配 A/B/C/...
- 定义 `PATTERN_FREQ_TABLE: Record<string, number>`：
  - 从词库中统计每种模式签名的出现频率
  - 归一化到 0~1（最常见模式 = 1.0，最稀有模式 → 接近 0）
  - 可在构建时预计算或首次加载词库时惰性生成
- 导出 `getPatternRarity(word: string): number`：
  ```
  pattern = toPattern(word)
  freq = PATTERN_FREQ_TABLE[pattern] ?? 0
  return freq > 0 ? -Math.log2(freq) : MAX_RARITY  // 未见模式给最大稀有度
  ```
- 新增单元测试

**验收标准：**
- AC1: toPattern 正确映射各类单词（全不同、有重复、回文、单字母）
- AC2: PATTERN_FREQ_TABLE 覆盖词库中所有出现的模式
- AC3: 频率归一化正确（最高频率 = 1.0 或总数占比）
- AC4: 未知模式（不在表中）有合理的 fallback
- AC5: 单元测试覆盖 toPattern + 频率查询 + 未知模式

**估点：** 3

---

### Story 47.4: 词感型 — 模式 (Pattern)

**复杂度: Small**
**依赖: 47.3**

实现模式（Pattern）词条：查模式签名稀有度，越稀有 bonus 越大。

**范围：**
- 新增 `AffixType.Pattern = 'pattern'` 到枚举
- 更新 `AFFIX_CATEGORY_MAP`：归入 `word_sense`
- `AffixInstance` 新增参数：`patternK: number`
- Phase 2 逻辑：
  ```
  word = ctx.currentWord
  if !word || word.length === 0: break
  rarity = getPatternRarity(word)  // from patternFrequency.ts
  bonusPercent += patternK × rarity
  ```
- 更新名称、描述、权重、tooltip、i18n
- 新增单元测试

**参数范围：**

| 参数 | 范围 | 基准 |
|------|------|------|
| patternK | 0.03~0.06 | — |

**数值验证（对数版）：**

| 单词 | freq | -log₂(freq) | bonus (K=0.04) |
|------|------|-------------|----------------|
| "the" | ~0.40 | 1.32 | +5.3% |
| "apple" | ~0.08 | 3.64 | +14.6% |
| "banana" | ~0.01 | 6.64 | +26.6% |
| "Mississippi" | ~0.001 | 9.97 | +39.9% |

**涌现交互：**
- Ligature（重复数）高 → Pattern 通常更稀有，但结构不同（"aabb" vs "abab" 同 Ligature 不同 Pattern）
- Coverage 低（字母少）→ Pattern 可能更稀有也可能更常见（取决于结构）

**验收标准：**
- AC1: "banana"(复杂交替模式) bonus 明显高于 "the"(全不同常见模式)
- AC2: 两个不同单词但相同模式（如 "dog"/"cat" 都是 ABC）→ 相同 bonus
- AC3: Ligature 相同但 Pattern 不同的单词（如 "aabb"/"abab"）bonus 不同
- AC4: 技能生成可产出 Pattern 词条
- AC5: 单元测试覆盖常见/稀有/未知模式

**估点：** 3

---

### Story 47.5: 技能生成集成

**复杂度: Small**
**依赖: 47.1, 47.2, 47.4**

将 3 个新词条整合进技能生成系统。

**范围：**
- 更新 `skillGeneration.ts`：为 Entropy/Cipher/Pattern 添加 `rollAffixParams` switch case 和参数表
- 更新 `rollAffixWeights()`：新词条权重分档
- 更新 `shop.ts`：
  - `buildAffixParamSummary`：新词条参数摘要
  - `computeSmartEstimate`：词库过滤预估（按技能绑定字母过滤词库，计算平均 H / avgDist / rarity）
- 更新 `affixes.test.ts`：枚举数量 42（39+3），word_sense 分类数量 9
- 验证商店展示正确

**预估策略：**

三个词条都依赖 currentWord，可以用词库过滤预估（同 Cluster/Coverage/Bigram）：
```
filtered = deck.filter(w => w.includes(boundKey))
avgEntropy = mean(filtered.map(shannonEntropy))
avgCipherDist = mean(filtered.map(caesarDistance))
avgPatternRarity = mean(filtered.map(getPatternRarity))
```

**验收标准：**
- AC1: `generateSkill()` 可随机生成含新词条的技能
- AC2: 商店 tooltip 正确展示参数和描述
- AC3: smartEstimate 的词库过滤预估值合理
- AC4: 存档兼容
- AC5: exhaustive switch 编译通过

**估点：** 3

---

### Story 47.6: 数值平衡与 Playtest

**复杂度: Medium**
**依赖: 47.5**

对 3 个新词条进行数值平衡和交互验证。

**范围：**
- K 值调优：实际游戏中验证 bonus 量级
- 交互矩阵验证：

| 交互对 | 预期行为 | 验证 |
|--------|---------|------|
| Entropy + Coverage | 方向一致但不等价（Coverage 粗糙计数 vs Entropy 精细均匀度） | |
| Entropy + Ligature | 方向相反（重复多 → 熵低但 Ligature 高），有趣的 tension | |
| Cipher + Cluster | 正交（辅音连续性 vs 字母表距离） | |
| Cipher + Outcast | 互补（字母位置 vs 字母距离） | |
| Pattern + Ligature | 重复多 → Pattern 通常更稀有，正相关但不等价 | |
| Pattern + Bigram | 两个独立的频率查表，可叠加 | |
| Gravity + 三个新词条 | Gravity 改变词库分布 → 间接影响所有词感词条 | |

- 极端场景：
  - Entropy: 最高 H≈3.0 → bonus≈30%，合理
  - Cipher: 最高 avgDist≈15 → bonus≈30%，合理
  - Pattern: 最稀有 -log₂(0.001)≈10 → bonus≈40%，偏高但需极罕见模式
- PATTERN_FREQ_TABLE 质量验证：抽查 20 个单词的模式和频率是否合理

**验收标准：**
- AC1: 三个新词条在不同构建中均有使用场景
- AC2: 无单一词条过于强势
- AC3: 交互矩阵中所有组合行为符合预期
- AC4: PATTERN_FREQ_TABLE 数据质量通过抽查
- AC5: 帧预算合规（Shannon 熵 O(n)、Caesar 距离 O(n)、Pattern 查表 O(n) + O(1) lookup）
- AC6: 至少 2 局完整 playtest 记录

**估点：** 5

---

## 依赖图

```
47.1 Entropy ──────┐
47.2 Cipher  ──────┤
47.3 PatternFreq ──┼── 47.5 技能生成集成 ── 47.6 平衡 Playtest
      │            │
      └── 47.4 Pattern
```

47.1/47.2/47.3 互不依赖可并行。47.4 依赖 47.3 的频率表。

## 总估点

| Story | 估点 |
|-------|------|
| 47.1 熵 (Entropy) | 3 |
| 47.2 密文 (Cipher) | 3 |
| 47.3 模式频率表 | 3 |
| 47.4 模式 (Pattern) | 3 |
| 47.5 技能生成集成 | 3 |
| 47.6 数值平衡 | 5 |
| **合计** | **20** |
