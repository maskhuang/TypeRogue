# Epic: 遗物反馈与飞行动画

## 背景

当前遗物在战斗中触发效果时，仅使用通用浮字 `showFeedback` 显示文本（如 `+1.5s`、`Echo!`），没有与遗物 HUD 图标产生视觉关联。技能系统已实现「从字母出发 → 沿贝塞尔曲线飞向目标 UI」的飞行动画，遗物系统应复用此机制，建立「遗物图标 → 效果目标」的视觉链路。

## 目标

1. 资源遗物：浮字从遗物图标飞向资源 UI + 到达弹跳（与技能飞行一致）
2. 连锁触发遗物：闪光连线表达因果关系，被触发技能产出飞向资源目标
3. 非资源遗物：有明确触发时刻的遗物用闪光连线指向出错字母或结算面板
4. 复用现有飞行动画系统（贝塞尔曲线、到达弹跳、pending 滚轮同步）

## 现状分析

### 遗物触发反馈（当前）

**资源产出遗物（本 Epic 范围）：**

| 遗物 | 触发点 | 当前反馈 | 产出资源 |
|------|--------|---------|---------|
| 节奏医生 | 每 10 combo | `+1s` 浮字 + `bumpTimer()` | time |
| 时间露珠 | 每 3 词 | `+1s` 浮字 + `bumpTimer()` | time |
| 长词达人 | 6+ 字母词 | `+1s` 浮字 + `bumpTimer()` | time |
| 分数磁铁 | 每次击键 | `🧲 +1` 浮字 | score |
| 词汇收藏 | 首次完成词 | `📚 +3💰` 浮字 | gold |
| 资源感应 | ≥3 种资源 | `🔮 +N` 浮字 | 动态 |
| 双手协奏 | 左右手交替 | 文本浮字 | time |
| 玻璃大炮（加倍） | 完成词时 | `+N` 浮字 + `bumpScore()` | score |
| 凤凰之羽 | 关卡失败复活 | 复活提示 + 恢复时间 | time |
| on_word_complete 遗物 | 完成词 | `+Ns` 浮字 + `bumpTimer()` | time |
| on_word_complete 时间退款 | 完成词 | `+Ns` 浮字 + `bumpTimer()` | time |

**连锁触发遗物（本 Epic 范围）：**

| 遗物 | 触发点 | 效果 |
|------|--------|------|
| 回声指套 | 8% 概率 | 重新触发技能（间接资源产出） |
| 连击引爆 | 15/30/45 combo | 随机触发 3 个技能（间接资源产出） |
| 全键风暴 | 前 3 词完成 | 随机触发 3 个未命中技能（间接资源产出） |

**非资源遗物闪光反馈（本 Epic 范围）：**

| 遗物 | 触发点 | 闪光目标 |
|------|--------|---------|
| 打字蜡封 | 首次错误免罚 | 出错字母 |
| 余韵护盾 | combo 中断保留 30% | 出错字母 |
| 爵士乐 | ≥3 种词条类型 | 结算面板 |
| 节奏适应 | 用时 <3s 得分 +30% | 结算面板 |
| 雪球效应 | 每词结算 +5% 递增 | 结算面板 |

### 飞行动画系统（已有）

- `showFeedback(text, color, scale, skillAnchor)` → 从 `skillAnchor.letterIndex` 字母位置出发
- 沿贝塞尔曲线飞向 `RESOURCE_TARGET_IDS[resource]` 对应 HUD 元素
- 固定速度 0.35 px/ms，时长 250~800ms
- 到达时触发 `RESOURCE_BUMP_FNS[resource]()` 弹跳
- 支持 `_pendingTimeBonus` / `_pendingGoldBonus` 滚轮延迟同步

## Story 清单

### Story 1: 闪光连线系统（RelicFlash）

**遗物图标到目标 UI 的瞬间闪光连线。**

修改文件：`battle.ts`, `style.css`

实现方式：用绝对定位的 `<div class="relic-flash-line">` 模拟连线
- 计算遗物图标和目标元素的中心坐标
- 通过 `width`（= 两点距离）+ `transform: rotate(角度)` 画一条线
- CSS 动画：从遗物端向目标端扫过（`scaleX(0→1→0)` + `transform-origin: left`），约 300ms
- 颜色跟随遗物稀有度颜色或资源颜色

```typescript
function flashRelicLine(relicIndex: number, targetId: string, color: string): void {
  const iconEl = document.querySelectorAll('#player-relics .relic-icon')[relicIndex];
  const targetEl = document.getElementById(targetId);
  // ... 计算角度和距离，创建 line div，动画后移除
}
```

### Story 2: 辅助函数

**提供遗物飞行反馈所需的工具函数。**

修改文件：`battle.ts`

```typescript
function getRelicIndex(relicId: string): number {
  return [...state.player.relics].indexOf(relicId);
}
```

### Story 3: 资源遗物接入飞行

**产出 time/gold/score 的遗物：浮字从图标飞向资源 UI（与技能飞行一致，无闪光连线）。**

修改文件：`battle.ts`

扩展 `showFeedback` 支持 `relicAnchor`：
- 新增参数 `relicAnchor: { relicId: string; resource: string; amount?: number }`
- `createFloatText` 中：通过 `getRelicIndex(relicId)` 获取图标元素作为起点
- 终点、曲线、到达弹跳、pending 同步全部复用现有逻辑

需要接入的遗物：

**每词完成时（completeWord）：**
- 节奏医生（time）
- 时间露珠（time）
- 长词达人（time）
- 词汇收藏（gold）
- 资源感应（动态资源）
- 玻璃大炮加倍（score）
- on_word_complete 遗物时间加成（time）
- on_word_complete 时间退款（time）

**每次击键时（playerCorrect）：**
- 分数磁铁（score）
- 双手协奏（time）

**特殊时机：**
- 凤凰之羽（time — 关卡失败复活时恢复时间）

对每个遗物：
1. 将 `showFeedback(text, color)` 改为 `showFeedback(text, color, scale, undefined, { relicId, resource, amount })`
2. 移除对应的即时 `bumpTimer()` / `bumpScore()` 调用（由飞行到达触发）

### Story 4: 连锁触发技能的飞行定位

**连锁触发其他技能的效果（遗物或技能触发的 `triggerSkill`），用闪光连线表达因果关系，浮字从被触发位置生成。**

修改文件：`battle.ts`, `skills.ts`

#### 规则

连锁触发 `triggerSkill(skillId, boundKey)` 时：
1. 检查 `boundKey` 是否在当前单词 `state.player.word` 中出现
2. **在本词中**：随机选一个匹配字母的索引，从触发源（遗物图标 / combo UI）发射闪光连线到该字母，该技能产出的浮字以该字母位置为 `skillAnchor.letterIndex`
3. **不在本词中**：从触发源发射闪光连线到右下角词库 UI `#active-library`，浮字从词库 UI 位置生成

#### 涉及的连锁触发点

| 触发源 | 代码位置 | 闪光起点 |
|--------|---------|---------|
| 连击引爆 | `completeWord` 中 `checkComboDetonator` | 遗物图标 |
| 全键风暴 | `completeWord` 中 `checkKeyStorm` | 遗物图标 |
| 回声指套 | `playerCorrect` 中 `checkEchoThimble` | 遗物图标 |

#### 实现

在 `triggerSkill` 调用前，计算目标字母索引并发射闪光：

```typescript
// 连击引爆示例
for (let i = 0; i < count; i++) {
  const sid = shuffled[i];
  const boundKey = [...state.player.bindings.entries()]
    .find(([, v]) => v === sid)?.[0] ?? k;

  // 查找本词中 boundKey 对应的字母位置
  const word = state.player.word.toLowerCase();
  const matchIndices: number[] = [];
  for (let j = 0; j < word.length; j++) {
    if (word[j] === boundKey) matchIndices.push(j);
  }

  if (matchIndices.length > 0) {
    // 本词有该字母 → 闪光到随机一个匹配字母
    const targetIdx = matchIndices[Math.floor(random() * matchIndices.length)];
    flashRelicLine(getRelicIndex('combo_detonator'), /* 字母元素 */, '#ff6b00');
    // triggerSkill 内部的 showFeedback 使用 targetIdx 作为 letterIndex
  } else {
    // 本词没有 → 闪光到词库 UI
    flashRelicLine(getRelicIndex('combo_detonator'), 'active-library', '#ff6b00');
    // triggerSkill 内部的 showFeedback 使用词库 UI 位置
  }

  triggerSkill(sid, boundKey);
}
```

#### triggerSkill 的锚点覆盖

当前 `skills.ts` 中 `triggerAffixSkillWithFeedback` 的浮字锚点固定为 `state.player.index`（当前打字位置）。需要支持外部传入覆盖锚点：

```typescript
// skills.ts
export function triggerSkill(
  skillId: string, triggerKey: string,
  overrideAnchor?: { letterIndex?: number; fromElementId?: string },
): void
```

- `overrideAnchor.letterIndex`：浮字从指定字母位置生成（本词有该字母时）
- `overrideAnchor.fromElementId`：浮字从指定 UI 元素位置生成（本词无该字母时，用 `active-library`）

### Story 5: 非资源遗物触发反馈

**有明确触发时刻的非资源遗物，用就地视觉反馈表达效果。**

修改文件：`battle.ts`, `style.css`

统一反馈模式：弹出标签 + 遗物图标脉冲。

**遗物图标脉冲：** 触发时图标 `scale(1.3)` + 主题色 `box-shadow`，300ms 回弹。

**弹出标签（在效果位置）：**

| 遗物 | 标签位置 | 标签内容 |
|------|---------|---------|
| 打字蜡封 | 出错字母 | `🕯️` |
| 余韵护盾 | 出错字母 | `🛡️` |
| 爵士乐 | 结算分数 | `+N% 🎷`（含遗物图标） |
| 节奏适应 | 结算分数 | `+30% 🎵`（含遗物图标） |
| 雪球效应 | 结算分数 | `+N% ⛄`（含遗物图标） |

**结算加成同步：** 爵士乐/节奏适应/雪球效应的标签弹出时机必须与结算分数数字更新同步——标签弹出的瞬间，结算分数同步反映加成后的值。

## 技术要点

### 闪光连线 CSS

```css
.relic-flash-line {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, transparent, currentColor 30%, currentColor 70%, transparent);
  transform-origin: left center;
  pointer-events: none;
  z-index: 150;
  animation: relicFlash 0.3s ease-out forwards;
  opacity: 0.8;
}

@keyframes relicFlash {
  0%   { clip-path: inset(0 100% 0 0); opacity: 0.9; }
  40%  { clip-path: inset(0 0 0 0); opacity: 0.8; }
  100% { clip-path: inset(0 0 0 100%); opacity: 0; }
}
```

效果：光线从遗物端「射出」到目标端，然后从遗物端「收回」消散。

### showFeedback 签名扩展

```typescript
export function showFeedback(
  txt: string, color: string, scale?: number,
  skillAnchor?: { letterIndex: number; resource: string; amount?: number },
  relicAnchor?: { relicId: string; resource: string; amount?: number },
): void
```

### createFloatText 中 relicAnchor 路径

与 skillAnchor 路径基本相同，区别在起点获取：

```typescript
if (relicAnchor) {
  const idx = getRelicIndex(relicAnchor.relicId);
  const relicIcons = document.querySelectorAll('#player-relics .relic-icon');
  const iconEl = relicIcons[idx] as HTMLElement | undefined;
  if (iconEl) {
    flashRelicLine(idx, RESOURCE_TARGET_IDS[relicAnchor.resource], color);
    // ... 起点 = iconEl.getBoundingClientRect()，后续曲线逻辑复用
  }
}
```

### pending 滚轮同步

relicAnchor 的 time/gold 资源复用现有 `_pendingTimeBonus` / `_pendingGoldBonus` 机制，无需新增。

## 不做的事

- 不改遗物的实际效果逻辑，仅改视觉反馈
- 不为每个遗物定制独特的飞行轨迹（统一贝塞尔曲线）
- 不添加遗物触发音效（沿用现有 playSound 调用）
- 被动常驻遗物（少而精、不断之链、邻键之力等）不加闪光反馈
- 分数磁铁每次击键触发，频率高 — 需在调用侧做节流

## 验证

- `npm run build` 编译通过
- 资源遗物触发：浮字从遗物图标飞向资源 UI + 到达弹跳（与技能飞行体验一致）
- 连锁触发（引爆/风暴/回声）：闪光从遗物图标射向本词字母或词库 UI，被触发技能的浮字从该位置飞出
- 非资源遗物：效果位置弹标签 + 遗物图标脉冲（打字蜡封/余韵护盾/爵士乐/节奏适应/雪球效应）
- 多遗物同时触发时闪光不冲突（每条线独立 div，动画结束后自动移除）
- 高频遗物（分数磁铁）不产生视觉垃圾
