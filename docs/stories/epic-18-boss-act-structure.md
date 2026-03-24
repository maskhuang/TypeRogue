---
title: "Epic 18: Boss 战与 Act 结构"
epic_key: "epic-18"
status: "done"
created: "2026-03-02"
stories:
  - "18-1-stage-type-act-structure"
  - "18-2-elite-stage-mini-boss"
  - "18-3-rest-stage-random-events"
  - "18-4-boss-modifier-framework"
  - "18-5-boss-visual-typing"
  - "18-6-boss-cognitive-typing"
  - "18-7-boss-rhythm-lock"
  - "18-8-boss-numerical-rules"
  - "18-9-act-transition-visual-polish"
---

# Epic 18: Boss 战与 Act 结构

## 概述

为游戏引入差异化的关卡类型（精英关、休息关、Boss 关），让 Run 的 8 关结构拥有节奏感和高潮。精英关作为 Boss 机制的预告和练习，休息关提供 Slay the Spire 式随机事件，Boss 关从打字难度和数值规则两个维度挑战玩家。

## 设计目标

- **节奏感：** Run 不再是 8 个同质化关卡，而是有起伏、有高潮的冒险
- **Boss 多样性：** 13 种 Boss 类型（7 打字难度 + 6 数值规则），每次 Run 体验不同
- **精英关 = Boss 预告：** 用减弱版 Boss 规则让玩家提前适应，降低 Boss 的突兀感
- **随机事件：** 休息关提供策略决策点，而非重复的商店功能

## Run 结构（更新后）

```
Act 1: Stage 1 → Stage 2 → Stage 3(精英) → 休息关(随机事件)
Act 2: Stage 4 → Stage 5(精英) → Stage 6 → 休息关(随机事件)
Act 3: Stage 7(精英) → Stage 8(Boss)
```

总流程：8 个战斗节点 + 2 个休息节点 = 10 个节点

## 精英关设计

精英关从 Boss 池随机抽取 1 个规则，但**效果减半**，作为 Boss 的预告和练习。

- 位置：Stage 3、5、7
- 目标分数 ×1.3
- 通关金币 ×2
- 随机 1 个减弱版 Boss 修饰器
- UI 区分：金色边框 + "精英挑战" 标签

效果减半示例：
- 渐隐之词：淡出速度减半（更多时间阅读）
- 乱序打字：仅打乱中间字母，首尾保留
- 时间加速：1.25x 而非 1.5x
- 分数衰减：每秒 2.5% 而非 5%

## 休息关设计 — 随机事件

每次休息关从事件池随机抽 1 个事件，两次休息关不重复。

### 事件池（10 个）

**事件 1：神秘商人**
- A：用当前金币 50% 换一个随机传说遗物
- B：免费获得一个普通遗物
- C：离开

**事件 2：打字之神的考验**
- A：下一 Act 倍率 +1.0x，但时间 -10 秒
- B：下一 Act 时间 +15 秒，但倍率 -0.5x
- C：离开

**事件 3：技能祭坛**（需至少 2 个技能）
- A：献祭一个技能，随机获得更高稀有度技能
- B：献祭一个技能，获得 200 金币
- C：不献祭，离开

**事件 4：赌徒的骰子**
- A：押 100 金币，50% 得 300 金币，50% 失去押金
- B：不赌，离开

**事件 5：遗物熔炉**
- A：销毁一个遗物，随机强化一个技能 +1 级
- B：销毁一个技能，随机获得一个遗物
- C：离开

**事件 6：时间裂缝**
- A：跳过下一关（少打一关但少拿一关奖励）
- B：重打上一关（再拿一次金币奖励）
- C：离开

**事件 7：键盘诅咒**
- A：接受诅咒（2 个键位封印至 Act 结束），获得 150 金币 + 随机遗物
- B：拒绝，离开

**事件 8：技能复制器**
- A：复制一个已有技能（等于升 1 级），下一关目标分 ×1.5
- B：离开

**事件 9：命运之轮**（无选择，直接随机）
- 25%：获得 200 金币
- 25%：随机技能 +1 级
- 25%：失去 100 金币
- 25%：下一关时间 -10 秒

**事件 10：宁静冥想**
- A：预览下一 Act 的 Boss 类型和精英关修饰器
- B：获得 80 金币

### 事件规则
- 两次休息关各抽 1 个，不重复
- 部分事件有前置条件（如事件 3 需至少 2 个技能，事件 4 需至少 100 金币）
- 未满足条件的事件不进入抽取池

## Boss 池（13 种）

### 打字难度类（7 种）

| ID | 名称 | 规则 | 效果 |
|----|------|------|------|
| boss_fade | 👻 渐隐之词 | 字母逐个淡出消失 | 淡出速度：前期 1.5s/字母，后期 0.8s/字母 |
| boss_scramble | 🔀 乱序打字 | 字母打乱显示，照乱序打 | 初期保留首尾，后期全乱 |
| boss_reverse | ⏪ 倒序输入 | 从最后一个字母往前打 | 光标从右侧开始 |
| boss_drift | 🌊 移动文字 | 词语在屏幕上漂移晃动 | 振幅随时间增大 |
| boss_masked | 🕳️ 残缺词语 | 部分字母被遮挡 | 初期遮 30%，后期遮 50% |
| boss_spotlight | 🔦 聚光灯 | 只能看到当前 2-3 个字母 | 光圈随输入推进 |
| boss_rhythm | 🎵 节奏锁定 | 字母按节拍解锁 | BPM 90→140 递增 |

### 数值规则类（6 种）

| ID | 名称 | 规则 | 参数 |
|----|------|------|------|
| boss_decay | 📉 分数衰减 | 每秒扣当前总分 | 5%/秒 |
| boss_combo_punish | ☠️ 断连即扣 | 连击中断扣总分 | 20% |
| boss_cap | 📦 单词限额 | 单词得分上限 | 50 分/词 |
| boss_fast_time | ⏩ 时间加速 | 计时器加速 | 1.5 倍速 |
| boss_double_target | 🎯 双倍目标 | 目标分数翻倍 | ×2 |
| boss_diminish | 📉 递减收益 | 每完成一词下个词分数减少 | -10%/词 |

### 时间规则

| 关卡类型 | 固定时间 |
|----------|----------|
| 标准关 | 30 秒 |
| 精英关 | 45 秒 |
| Boss 关 | 60 秒 |

### Boss 选择与切换规则
- Run 开始时从 13 种 Boss 中随机抽 3 个作为本局修饰器池（A、B、C）
- 精英 Stage 3 → 修饰器 A（减弱版：参数减半，45 秒）
- 精英 Stage 5 → 修饰器 B（减弱版，≠A，45 秒）
- 精英 Stage 7 → 修饰器 C（减弱版，≠A、≠B，45 秒）
- Boss Stage 8 → **满功率 A/B/C 交替切换**，每 20 秒轮换一次（60 秒 = 3 × 20 秒）：
  - 0-20 秒：修饰器 A 满功率
  - 20-40 秒：修饰器 B 满功率
  - 40-60 秒：修饰器 C 满功率
- 切换时有短暂视觉/音效提示（如屏幕闪烁 + Boss 名称切换）
- 精英关 = 单项练习，Boss 关 = 综合考试

## Story 拆分

### Story 18.1: Stage Type 系统与 Act 结构重构
**复杂度：中**

新增 StageType 枚举（standard / elite / boss / rest），重构 StageConfig 支持关卡类型，明确 Act 边界，调整关卡流程为 10 个节点。

验收标准：
- StageType 枚举定义完成
- StageConfig 包含 stageType 字段
- 固定时间规则：标准关 30s、精英关 45s、Boss 关 60s
- levels.json 更新为 10 节点结构（8 战斗 + 2 休息）
- StageManager 支持查询关卡类型
- RunState.advanceStage() 正确处理休息关跳转
- Act 边界逻辑正确

### Story 18.2: 精英关 — 减弱版 Boss 修饰器
**复杂度：低**
**依赖：18.1, 18.4**

Stage 3、5、7 为精英关，从 Boss 池抽取减弱版规则。

验收标准：
- 精英关目标分数 ×1.3
- 精英关通关金币 ×2
- Run 开始时从 Boss 池抽 3 个修饰器（A/B/C），分配给 Stage 3/5/7
- 精英关应用对应修饰器的减弱版（参数减半）
- 精英关 UI 有金色边框和"精英挑战"标签
- 精英关显示当前修饰器名称和规则提示

### Story 18.3: 休息关 — 随机事件场景
**复杂度：中**

新建 RestScene，实现随机事件系统。

验收标准：
- RestScene 场景正常显示
- 事件池 10 个事件全部实现
- 每次休息关随机抽 1 个事件
- 两次休息关事件不重复
- 事件前置条件检查正确
- 选择后效果正确应用到 RunState
- 临时 buff/debuff（如"下一 Act 倍率 +1.0x"）在 Act 结束后正确移除

### Story 18.4: Boss 战框架 — BossModifier 系统
**复杂度：高**

设计并实现 BossModifier 接口，作为所有 Boss 类型的统一框架。

验收标准：
- BossModifier 接口定义完成：
  - `id: string`
  - `name: string`
  - `description: string`
  - `icon: string`
  - `onWordDisplay(word: string): DisplayWord` — 控制词语显示
  - `onInput(key: string, context: InputContext): InputResult` — 控制输入处理
  - `onTick(dt: number, context: TickContext): void` — 每帧更新
  - `getMatchRule(word: string): string` — 返回匹配目标字符串
  - `getParams(isElite: boolean): ModifierParams` — 返回参数（精英版减半）
- BossModifierRegistry 注册所有 13 种 Boss
- Boss 选择器：Run 开始时抽 3 个修饰器（A/B/C）分配给精英关
- Boss 关切换引擎：每 20 秒轮换 A→B→C 满功率修饰器
- 切换时触发视觉/音效提示（屏幕闪烁 + 新修饰器名称）
- BattleFlowController 集成 BossModifier 钩子
- Boss 入场演出：显示 3 个修饰器名称 + 规则提示

### Story 18.5: Boss 实现 — 视觉类（渐隐 / 移动 / 聚光灯）
**复杂度：中**
**依赖：18.4**

实现 3 种视觉类打字 Boss。

验收标准：
- boss_fade：字母逐个淡出，速度随时间加快
- boss_drift：词语容器漂移+振荡，振幅递增
- boss_spotlight：仅渲染光圈内字母，光圈随输入推进
- 三种 Boss 均支持 isElite 减弱参数
- 视觉效果流畅不卡顿（60fps）

### Story 18.6: Boss 实现 — 认知类（乱序 / 倒序 / 残缺）
**复杂度：中**
**依赖：18.4**

实现 3 种认知类打字 Boss。

验收标准：
- boss_scramble：字母打乱显示，getMatchRule 返回乱序版本
- boss_reverse：光标从右开始，getMatchRule 返回反转字符串
- boss_masked：随机遮挡字母，getMatchRule 返回完整原词
- 三种 Boss 均支持 isElite 减弱参数

### Story 18.7: Boss 实现 — 节奏锁定
**复杂度：中**
**依赖：18.4**

实现节奏锁定 Boss。

验收标准：
- boss_rhythm：字母按 BPM 节拍逐个高亮解锁
- 仅接受当前高亮字母的输入
- BPM 随时间递增（90 → 140）
- 高亮字母脉冲动画
- 支持 isElite 减弱参数（BPM 起始更低、递增更慢）

### Story 18.8: Boss 实现 — 数值规则类（6 种）
**复杂度：中**
**依赖：18.4**

实现 6 种数值规则 Boss。

验收标准：
- boss_decay：每秒扣 5% 当前总分
- boss_combo_punish：连击中断扣 20% 总分
- boss_cap：单词得分上限 50 分
- boss_fast_time：计时器 1.5 倍速
- boss_double_target：目标分数 ×2
- boss_diminish：每完成一词，下个词分数 -10%
- 六种 Boss 均支持 isElite 减弱参数
- 数值效果与现有分数/倍率管道正确集成

### Story 18.9: Act 过渡演出与视觉打磨
**复杂度：低-中**
**依赖：18.1 ~ 18.8**

Act 切换、精英关、Boss 的视觉演出。

验收标准：
- Act 切换过渡动画（淡入淡出 + Act 标题卡）
- 精英关开场提示动画
- Boss 入场特效（屏幕震动 + Boss 名称 + 规则说明）
- HUD 显示当前 Act / StageType 图标
- 休息关场景视觉风格（安静、柔和色调）

## 依赖关系

```
18.1 (Stage Type 基础)
 ├── 18.3 (休息关随机事件)
 └── 18.4 (Boss 框架)
      ├── 18.2 (精英关，依赖 18.1 + 18.4)
      ├── 18.5 (视觉类 Boss ×3)
      ├── 18.6 (认知类 Boss ×3)
      ├── 18.7 (节奏 Boss ×1)
      └── 18.8 (数值 Boss ×6)

18.9 (视觉打磨) ← 依赖全部完成
```
