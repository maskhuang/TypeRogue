---
title: '头脑风暴：技能与遗物系统重构'
date: '2026-02-20'
author: 'Yuchenghuang'
facilitator: 'Game Designer Agent (Samus Shepard)'
status: 'complete'
---

# 头脑风暴：技能与遗物系统重构

## 设计目标

1. 技术重构：统一效果管道，数据驱动，消除硬编码
2. 设计重构：扩充技能池，增加构筑深度和流派身份感
3. 让键盘即棋盘的核心机制得到充分发挥

---

## 方向 A：效果管道统一 ✅

### 三层修饰叠加模型

```
Layer 1: BASE（基础层）— 技能本体效果，加法叠加
Layer 2: ENHANCE（增强层）— 被动技能+相邻效果，乘法叠加
Layer 3: GLOBAL（全局层）— 遗物+状态条件，乘法叠加

最终值 = Σ(base效果) × Π(enhance修饰) × Π(global修饰)
```

- Base 层加法 → 多放技能就是多加分，线性收益
- Enhance 层乘法 → 被动技能是"乘法杠杆"，回报构筑思考
- Global 层乘法 → 遗物是"全局杠杆"，放大整个构筑

### 事件-修饰器架构

```
游戏事件发生 → 收集所有修饰器 → 按优先级排序 → 输出最终效果
```

### 统一 Modifier 接口

```typescript
interface Modifier {
  id: string;
  source: 'skill' | 'relic' | 'passive' | 'terrain';
  layer: 'base' | 'enhance' | 'global';

  trigger: EventType;
  phase: 'before' | 'calculate' | 'after';
  condition?: Condition;

  // 数值修饰
  effect?: {
    type: 'score' | 'multiply' | 'time' | 'gold';
    value: number;
    stacking: 'additive' | 'multiplicative';
  };

  // 行为修饰
  behavior?: BehaviorType;

  priority: number;
}
```

### 处理流程

```
Phase 1: BEFORE — 行为拦截（shield阻止掉连击等）
Phase 2: CALCULATE — 三层数值计算（base加法 → enhance乘法 → global乘法）
Phase 3: AFTER — 触发链式效果（echo、ripple等）
```

### 条件系统（中等复杂度）

支持的条件原语：
- 战斗状态: combo_gte, combo_lte, no_errors, random
- 相邻/位置: adjacent_skills_gte, adjacent_empty_gte, adjacent_has_type
- 词语: word_length_gte, word_length_lte, word_has_letter
- 本词上下文: skills_triggered_this_word, nth_word

每个修饰器只有一个条件（或无条件），不做 AND/OR 组合。

### 行为修饰器

- **拦截型（Interceptor）**: phase=before, 阻止事件默认效果（shield, phoenix_feather）
- **触发型（Reactor）**: phase=after, 事件后触发额外行为（echo, ripple, sentinel）

---

## 方向 B：技能扩充与进化 ✅

### 核心设计原则

```
被动技能 = 键盘空间互动（行、列、相邻等位置关系）
主动技能 = 技能触发互动（影响下一次/下一个技能的触发方式）
```

### 实施顺序

- 一期：扩充到 18 个基础技能 + 效果管道
- 二期：给核心技能加进化分支（每技能 2 条路线）
- 三期：补全其余进化 + 共鸣系统

### 技能流派

```
爆发流（高底数，吃被动加成）: burst, lone, void, gamble
倍率流（低底数，叠乘法杠杆）: amp, chain, overclock
续航流（加时间/防护）: freeze, shield, pulse, sentinel
连锁流（技能互触发）: echo, ripple, mirror, leech
被动流（强化布局）: core, aura, anchor
```

### 18 个技能完整定义

#### 爆发流

| ID | 名称 | 类别 | 层 | 效果 |
|----|------|------|----|------|
| burst | 爆发 | active | base | +5分 |
| lone | 孤狼 | active | base | +8分（本词无其他技能触发时） |
| void | 虚空 | active | base | +12分（-1/本词其他触发数） |
| gamble | 豪赌 | active | base | 50%概率+15分，50%概率+0 |

#### 倍率流

| ID | 名称 | 类别 | 层 | 效果 |
|----|------|------|----|------|
| amp | 增幅 | active | base | +0.2倍率 |
| chain | 连锁 | active | base | 连续不同技能触发时+0.1倍率 |
| overclock | 超频 | active | enhance | 本词第3个+技能触发，效果×1.5 |

#### 续航流

| ID | 名称 | 类别 | 层 | 效果 |
|----|------|------|----|------|
| freeze | 冻结 | active | base | +2秒 |
| shield | 护盾 | active | before | 打错时保护连击（1次） |
| pulse | 脉冲 | active | behavior | 每触发3次+1秒 |
| sentinel | 哨兵 | active | after | 每完成一个词，恢复1次护盾 |

#### 连锁流

| ID | 名称 | 类别 | 层 | 效果 |
|----|------|------|----|------|
| echo | 回响 | active | after | 下一个非echo技能触发两次 |
| ripple | 涟漪 | active | after | 下一个非ripple技能触发后，其效果传递给再下一个技能 |
| mirror | 镜像 | **passive** | after | 同行最左技能触发时→触发最右技能 |
| leech | 汲取 | active | base | +N分（N=本词已触发技能数） |

#### 被动流

| ID | 名称 | 类别 | 层 | 效果 |
|----|------|------|----|------|
| core | 能量核心 | passive | enhance | 相邻技能每触发3次→本词倍率+0.1 |
| aura | 光环 | passive | enhance | 相邻分数技能效果×1.5 |
| anchor | 锚定 | passive | enhance | 同行所有技能×1.15 |

### 互动示例

```
词: "bridge" — b(echo) r(ripple) i(burst) d(amp)

b → echo触发: "下一个非echo技能触发两次"
r → ripple触发×2(被echo双触发): 设置两层接力
i → burst触发: +5分, 接力1把burst效果传给下一个
d → amp触发: +0.2倍率, 同时获得burst的+5分(接力1), 接力2把amp效果继续传

结果: 15分底数 + 0.4倍率（vs 无互动的 5分 + 0.2倍率）
```

---

## 方向 C：遗物 = 规则改变器 ✅

### 设计目标

遗物应该让玩家说出"哦！我的打法要变了！"而不是"嗯，数字变大了"。

### 遗物分类框架

**规则改写器暂缓**（实现复杂度高，后期再看）。优先做以下两类：

### 构筑催化剂 — 强化特定流派，推动 all-in 决策

| 名称 | 效果 | 适配流派 |
|------|------|---------|
| 虚空之心 | 每个空键位+3底分 | 极简/lone/void流 |
| 连锁放大器 | echo/ripple 的互动效果额外触发一次 | 连锁流 |
| 铁壁 | shield 容量+2，sentinel 每词回盾+1 | 续航流 |
| 被动大师 | 被动技能的 enhance 层效果翻倍 | 被动流 |
| 键盘风暴 | 技能数 ≥12 时，所有技能底分+2 | 填满键盘流 |
| 赌徒信条 | gamble 永远成功(100%+15分) | 爆发/赌博流 |

### 风险-回报交易 — 强大能力 + 代价

| 名称 | 效果 | 权衡 |
|------|------|------|
| 玻璃大炮 | 所有分数×2 | 打错一次直接本关失败 |
| 时间窃贼 | 每次技能触发+0.3秒 | 基础时间减半 |
| 贪婪之手 | 每关结束金币×1.5 | 商店价格+50% |
| 沉默誓约 | 不装备任何技能时，裸打分数×5 | 无技能可用 |
| 末日倒计时 | 每关+30秒 | 每过一关基础时间-5秒（越来越紧） |

### 与方向 A 框架的契合

所有遗物都能用 Modifier 表达：
- 催化剂 = global 层乘法修饰器 + condition 检查构筑状态
- 风险回报 = 一个 global 层增益 + 一个 before 层惩罚行为
- 遗物可以同时注册多个 Modifier（增益+代价各一个）

---

## 方向 D：字母升级系统 ✅

### 核心概念

不做复杂的键盘地形系统。改为：**字母可升级**，升级后该字母出现在词中时提供额外收益。

```
字母 E: Lv0 → Lv1 → Lv2 → Lv3
         +0     +1     +2     +3 底分（每次出现在词中时）

打 "sleep" → s(Lv0) l(Lv0) e(Lv2) e(Lv2) p(Lv0) → 额外 +4 底分
```

### 设计妙处

- **和词库联动** — 升级了 E，就想买含 E 多的词
- **和技能联动** — E 键上有 burst + E 被升级 = 双重收益
- **和字母亲和池联动** — 买了 e_words 词包 + 升级 E = 构筑闭环
- **决策有趣** — 升高频字母(E/T/A)稳定？还是升技能所在字母最大化？

### 在方向 A 框架中的表达

```typescript
// 字母升级 = base 层修饰器，每次正确击键时触发
{
  id: 'letter_upgrade_e',
  source: 'letter',
  trigger: 'on_correct_keystroke',
  layer: 'base',
  phase: 'calculate',
  effect: { type: 'score', value: 2, stacking: 'additive' },
  condition: { type: 'key_is', key: 'e' }
}
```

### 升级来源

- 商店购买（花金币升级特定字母）
- 遗物效果（如"所有元音字母+1级"）
- 过关奖励（随机升级一个字母）

---

## 方向 E：词语-技能联动深化 ✅

### 现状

当前词语与技能的联动是间接的——字母亲和池(highlight)、pickWord 偏向选词(60%/80%)、商店推荐高亮。词只是"载体"，本身没有属性和个性，选词决策维度单一（"含不含我的技能字母"）。

### 决策：E3 — 运行时条件扩展（零数据维护）

不给 3000 个词手工加标签，而是扩展方向 A 条件系统，加入可运行时计算的词语特征：

```typescript
// 新增条件原语（运行时自动计算）
word_length_gte / word_length_lte  // 已有
word_has_double_letter             // 词含重复字母 (jazz, book, see)
word_all_unique_letters            // 词无重复字母 (words, flame)
word_vowel_ratio_gte               // 元音占比 ≥ X%
skill_density_gte                  // 技能键命中率 ≥ X% (技能字母数/词长)
```

### 设计示例

```
遗物「长词大师」: word_length_gte(7) → 所有技能底分 +3
遗物「速打之心」: word_length_lte(3) → +1秒 且 倍率 +0.3
技能「韵律」: word_has_double_letter → 每个重复字母 +2 分
```

### 排除的方案

- **E1 手工标签**: 大部分有趣标签可运行时计算，不需要标注 3000 词
- **E2 词语固有加成**: 和方向 D 字母升级系统重叠
- **E4 连词奖励**: 依赖 pickWord 随机性，玩家控制力不足

---

## 总结：五大方向一览

| 方向 | 核心 | 状态 |
|------|------|------|
| A: 效果管道统一 | 三层修饰叠加模型 + Modifier 接口 + 条件系统 | ✅ |
| B: 技能扩充与进化 | 18 技能 × 5 流派 + 被动=键盘互动/主动=技能互动 | ✅ |
| C: 遗物=规则改变器 | 构筑催化剂 + 风险回报交易（规则改写暂缓） | ✅ |
| D: 字母升级系统 | 字母可升级，出现在词中时+底分 | ✅ |
| E: 词语-技能联动 | 运行时条件扩展，零数据维护 | ✅ |

### 实施优先级建议

1. **一期**: 方向 A（效果管道）— 所有其他方向的技术基础
2. **二期**: 方向 B 一期（扩充到 18 技能）+ 方向 C（遗物重做）
3. **三期**: 方向 D（字母升级）+ 方向 E（条件扩展）
4. **四期**: 方向 B 二期（技能进化分支）

---

_Session complete — 2026-02-20_
