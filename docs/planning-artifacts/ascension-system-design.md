# Ascension（进阶）系统设计

Status: approved
Date: 2026-04-04
Designer: Samus Shepard × Yuchenghuang

---

## 概述

Ascension 是跨 run 的全局难度递进系统，灵感来自杀戮尖塔。每个 Ascension 级别叠加一个永久 debuff，通关当前级别解锁下一级。三个职业（无/造词师/蜕变师）**独立追踪** Ascension 进度。

共 **10 级**，效果**累积**。

---

## 练习关 + 金币映射

### 机制

第 1 关为练习关（已有实现），30 秒时限，无目标分压力。结算后：

```
practiceScore   = 练习关实际得分
floorScore      = ascensionLevel × 50
effectiveScore  = max(practiceScore, floorScore)
```

- **effectiveScore** 作为后续关卡的目标分增长基准（取代固定 TARGET_BASE=300）
- **初始金币** 由 effectiveScore 映射得出

### 金币映射公式

```
rawGold = 100 + bonusFromScore(effectiveScore)

bonusFromScore 分段：
  0-200 分:    0.1g/分
  200-500 分:  0.06g/分
  500+ 分:     0.02g/分

gold = floor(rawGold × a1Multiplier)
hardCap = 160g

a1Multiplier:
  A0:  1.0
  A1+: 0.75
```

### 预期金币表

| 练习关得分 | A0 金币 | A1+ 金币 |
|-----------|--------|---------|
| 0 | 100g | 75g |
| 200 | 120g | 90g |
| 300 | 126g | 94g |
| 400 | 132g | 99g |
| 500 | 138g | 103g |
| 800 | 144g | 108g |

### 最低分地板表

| Ascension | 地板分 | 含义 |
|-----------|--------|------|
| A0 | 0 | 无限制 |
| A1 | 50 | |
| A5 | 250 | |
| A8 | 400 | |
| A10 | 500 | 高手基准 |

---

## 10 级 Ascension 效果

### 总表

| 级别 | 名称 | 效果 | 卡住环节 |
|------|------|------|----------|
| **A1** | 贫穷起步 | 练习关金币转换效率 ×0.75 | 经济 |
| **A2** | 物价上涨 | 商店所有价格 +15% | 经济 |
| **A3** | 精英压力 | 精英关 modifier 不再弱化（取消 isElite 参数减弱） | 战斗难度 |
| **A4** | 时间紧缩 | 每 cycle 时间衰减 0.9 → 0.85 | 操作压力 |
| **A5** | 构筑限缩 | 商店刷新次数上限 3 次/关（含免费刷新） | 构筑选择 |
| **A6** | 暴露弱点 | 第 2 关起携带 1 个随机弱化 boss modifier（offense/defense 类） | 战斗规则 |
| **A7** | 稀缺资源 | 遗物槽位上限 10 → 8 | 构筑深度 |
| **A8** | 词库压缩 | 初始词库 -30%（run 开始时随机移除 30% 单词） | 打字+构筑 |
| **A9** | 强制对抗 | Boss 每次叠加 2 个 modifier（而非 1 个） | 后期难度 |
| **A10** | 终极试炼 | 目标分增长率 1.45 → 1.55；错误输入扣 2 秒时间 | 全面压力 |

### 节奏分析

```
A1-A2  "钱变少了"      纯经济压缩，玩法不变，学会精打细算
A3-A4  "战斗变难了"    精英全力出击，时间更紧，学会高效输出
A5-A6  "规则变了"      刷新受限 + 开局modifier，接受不完美构筑
A7-A8  "资源变少了"    遗物和词库双重缩减，构筑要做取舍
A9-A10 "一切都在跟你作对"  Boss疯狂叠modifier，打字容错归零
```

### A10 增长率影响分析

增长率从 1.45 提升到 1.55 的复利效应（以 effectiveScore=300 为基准）：

```
               A0 (×1.45)    A10 (×1.55)    差距
Stage 5:       1,322         1,724          +30%
Stage 10:      8,497         14,464         +70%
Stage 15:      54,605        121,370        +122%
Stage 20:      350,960       1,018,742      +190%
```

前几关体感差异小，越到后期差距越恐怖。

---

## 职业差异化影响

同一 Ascension 级别对不同职业的影响不同，这是独立追踪的核心价值：

| 级别 | 无职业 | 造词师 | 蜕变师 |
|------|--------|--------|--------|
| A1 金币少 | 少买 1 件技能 | 少买词包 → 碎片获取慢 | 少买蜕变材料 |
| A2 涨价 | 技能更贵 | 词包也涨价 | 蜕变也涨价 |
| A5 限刷新 | 难找好词条组合 | 难找碎片来源 | 难找蜕变目标 |
| A7 遗物少 | 少 2 个通用遗物 | 可能挤掉专属遗物位 | 同上 |
| A8 词库压缩 | 打字单调 | **核心打击：能造的词变少** | 影响相对小 |

---

## 数据存储

### MetaState 扩展

```typescript
// 每职业独立追踪
ascension: {
  none: number        // 0-10, 当前已解锁的最高 Ascension 级别
  wordsmith: number   // 0-10
  metamorph: number   // 0-10
}
```

### RunState 扩展

```typescript
// 本局选择的 Ascension 级别（可以选低于已解锁的级别）
ascensionLevel: number  // 0-10
```

---

## UI/UX 设计要点

### 开局选择

- 职业选择后，显示 Ascension 级别选择器（0 ~ 已解锁最高级）
- 每级显示：名称 + 效果描述 + 累积效果摘要
- 默认选中最高已解锁级别（鼓励挑战）

### 局内显示

- HUD 角落显示当前 Ascension 级别标识（如 "A7"）
- 结算界面显示 Ascension 级别（区分成就含金量）

### 解锁反馈

- 通关后若当前级别 = 已解锁最高级 → 弹出 "Ascension X+1 已解锁！"
- 显示下一级的效果预览

---

## 实现注意事项

### A3 精英不弱化

`bossModifiers.ts` 中 `getParams(isElite)` — 当 ascensionLevel >= 3 时，精英关也传 `isElite=false`。

### A5 刷新上限

`shop.ts` 中新增 `MAX_REFRESH_PER_STAGE` 常量，受 ascensionLevel >= 5 时生效。免费刷新也计入上限。

### A6 开局 modifier

run 开始时（第 2 关起），从 offense + defense 类 modifier 中随机选 1 个，以弱化参数 (`isElite=true`) 添加到 `state.activeModifiers`。排除 disruption 类以保证可玩性。

### A8 词库压缩

run 开始时，从当前词库中随机移除 30% 的单词。移除使用 seededRandom 确保同 seed 下一致。造词师的可造词列表也相应缩减。

### A9 双 modifier

`bossModifierPicker.ts` 中 Boss 选 modifier 的数量从 1 改为 `ascensionLevel >= 9 ? 2 : 1`。

### A10 增长率 + 错误惩罚

- `TARGET_GROWTH` 在 ascensionLevel >= 10 时从 1.45 改为 1.55
- `battle.ts` 的 `handleError()` 在 ascensionLevel >= 10 时额外扣 2 秒时间

---

## 参考

- 杀戮尖塔 Ascension 系统（20 级，每角色独立，累积 debuff）
- 当前游戏难度参数见 `src/core/constants.ts` BALANCE 对象
- Boss modifier 定义见 `src/data/bossModifiers.ts`
