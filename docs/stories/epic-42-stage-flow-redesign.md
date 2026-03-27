---
title: "Epic 42: 关卡心流重设计 — 溢出分 + 关内加速 + 简化 Run 结构"
epic_key: "epic-42"
status: "draft"
created: "2026-03-27"
stories:
  - "42-1-run-structure-simplify"
  - "42-2-battle-continuation"
  - "42-3-overflow-score"
  - "42-4-time-acceleration"
  - "42-5-exponential-target"
  - "42-6-boss-fixed-interval"
  - "42-7-enchantment-ritual-event"
  - "42-8-retry-with-overflow"
  - "42-9-acceleration-sensory-feedback"
  - "42-10-balance-integration"
---

# Epic 42: 关卡心流重设计 — 溢出分 + 关内加速 + 简化 Run 结构

## 背景

当前 Run 结构（8 战斗 + 2 休息，含精英/Boss/随机事件）存在核心问题：

1. **休息关打断心流**：打字游戏的核心体验是击键节奏感，休息关和随机事件强制中断这一状态
2. **达标即停**：当前 `score >= targetScore` 立即触发胜利，玩家正处于心流高峰时被打断
3. **关卡同质化**：除 Boss 外，标准关之间缺乏内部张力变化

## 设计目标

- **心流不中断**：砍掉所有非打字的关卡类型，仅保留战斗与商店
- **奖励持续输出**：达标后继续打到时间耗尽，溢出分带入下关
- **关内张力递增**：时间流速加快制造天然压力曲线
- **死亡曲线清晰**：目标分数指数增长，每个人终会撞墙

## 新 Run 结构

```
战斗 → 商店 → 战斗 → 商店 → 战斗(Boss) → 【附魔仪式】
→ 战斗 → 商店 → 战斗 → 商店 → 战斗(Boss) → 【附魔仪式】
→ ...（无限循环，直到失败）
```

**节奏规律**：每 3 关战斗为一个 Cycle，第 3 关为 Boss 回合。Boss 后进入附魔仪式（替代商店），其余战斗后进入商店。

**与 Epic 18 的关系**：
- **废弃**：休息关（Story 18.3）、Act 结构（Story 18.1 的 3-Act 分段）
- **保留**：Boss 修饰器框架（Story 18.4~18.8）、精英关机制（作为 Boss 规则的弱化版用于普通关，可选）
- **调整**：精英关不再是独立 StageType，改为普通战斗关的随机修饰器（后续 Epic 可选扩展）

## 核心机制

### 战斗流程变更

```
当前：打字 → 达到目标分 → 立即胜利 → 商店
新版：打字 → 达到目标分 → 继续打字 → 时间耗尽 → 结算（溢出分保留） → 商店
     打字 → 时间耗尽 → 未达标 → 可续命（消耗溢出分） / 失败
```

### 时间加速

关卡内时间流速**持续递增，无上限**：

```
timeAcceleration(t) = 1.0 + ACCEL_RATE × t
```

| 参数 | 标准关 | Boss 关 |
|------|--------|---------|
| ACCEL_RATE | 0.03/秒 | 0.045/秒 |
| 10秒时 | ×1.3 | ×1.45 |
| 20秒时 | ×1.6 | ×1.9 |
| 30秒时 | ×1.9 | ×2.35 |
| 40秒时 | ×2.2 | ×2.8 |

无上限意味着：如果玩家通过时间技能续命拖得越久，倍速会持续攀升，形成天然的"越打越疯"体验。时间越长 → 倍速越快 → 剩余时间消耗越猛 → 自然收敛。

### 溢出分

- 战斗结束时 `overflowScore = max(0, finalScore - targetScore)`
- 下一关开始时 `initialScore = overflowScore`（从溢出分起算）
- 溢出分同时可在商店兑换资源（待定）

### 目标分数指数增长

```
targetScore(n) = BASE_TARGET × GROWTH_FACTOR ^ (n - 1)
```

| 参数 | 值 | 说明 |
|------|------|------|
| BASE_TARGET | 300 | 第 1 关目标 |
| GROWTH_FACTOR | ~1.45 | 每关增长系数 |
| Boss 加成 | ×1.5 | Boss 关目标额外乘数 |

示例曲线：

| 关卡 | 目标分数 | Boss? |
|------|----------|-------|
| 1 | 300 | |
| 2 | 435 | |
| 3 | 945 | Boss (630×1.5) |
| 4 | 913 | |
| 5 | 1324 | |
| 6 | 2878 | Boss (1919×1.5) |
| 7 | 2783 | |
| 8 | 4035 | |
| 9 | 8776 | Boss (5851×1.5) |

GROWTH_FACTOR 需要 playtest 调参，此处为初始估算。

### 续命机制

时间耗尽未达标时，如果有溢出分累积：
- 弹出选择：**消耗全部累积溢出分，当关重来**
- 消耗后 `overflowScore = 0`，重新开始当前关卡
- 每关最多续命 1 次
- 溢出分越多 → 保险越充足，形成"激进 vs 保守"的策略博弈

## 核心数字

| 指标 | 当前 | 改造后 |
|------|------|--------|
| Run 节点数 | 10（8 战斗 + 2 休息） | 无上限（战斗-商店循环直到死亡） |
| 胜利条件 | 达到目标分数 | 时间耗尽时分数 ≥ 目标 |
| 溢出分机制 | overkill 字段存在但未使用 | 跨关携带 + 续命货币 |
| 时间流速 | 固定（Boss 除外） | 关内线性递增，无上限（标准 +0.03/s，Boss +0.045/s） |
| 目标分数增长 | 二次函数 | 指数函数 |
| 关卡类型 | standard/elite/boss/rest | standard/boss |
| 附魔获取 | 技能升 Lv3 时抽取 | 保留原有 + Boss 后附魔仪式 |

## Stories

---

### Story 42.1: Run 结构简化 — 去休息关 + 无限循环

**复杂度: Medium**
**依赖: 无**

重构 Run 结构为战斗-商店无限循环，去除休息关和固定 Act 分段。

**范围：**
- 移除 `StageType.rest`，仅保留 `standard` 和 `boss`
- 删除 `TOTAL_NODES = 10` 固定长度，Run 改为无限推进直到失败
- 移除 `restStage.ts` 相关逻辑（`openRestStage()`、`completeRestStage()`、随机事件系统）
- 移除 `currentAct` 概念，改为 `currentCycle`（每 3 关为一个 Cycle）
- `RunState.advanceStage()` 改为：
  - 普通关后 → 进入商店
  - Boss 关后 → 进入附魔仪式（Story 42.7）
- 更新 `StageManager`：`isBossStage(stageNum)` = `stageNum % 3 === 0`
- 更新 `getNextBattleNode()` 逻辑：不再跳过休息节点
- 清理 RestScene 相关代码和引用

**验收标准：**
- AC1: StageType 仅有 `standard` 和 `boss`
- AC2: Run 无固定长度上限，可无限推进
- AC3: 每 3 关一个 Boss（第 3、6、9、12…关）
- AC4: 休息关相关代码完全移除，无残留引用
- AC5: `currentCycle` 正确递增（每 3 关 +1）
- AC6: 存档兼容：旧存档加载时 Act 数据映射到 Cycle

**估点：** 5

---

### Story 42.2: 战斗继续机制 — 达标不停，打到时间耗尽

**复杂度: Medium**
**依赖: 无**

修改战斗胜利判定：达到目标分数后不再立即结束，继续战斗直到时间耗尽。

**范围：**
- 移除 `BattleFlowController` 中 `score >= targetScore` 时调用 `setVictory()` 的逻辑
- 新增 `BattleState` 状态：`targetReached: boolean`，达标时设为 true
- 达标时触发视觉/音效庆祝反馈（绿色脉冲 + "TARGET!" 浮字），但**不中断战斗**
- 时间归零时判定：
  - `score >= targetScore` → Victory（含溢出分结算）
  - `score < targetScore` → 进入续命判定（Story 42.8），或 Defeat
- 达标后 HUD 变化：目标分数显示为 ✓ 已达成，分数继续累积显示为"溢出"颜色
- `BattleResult` 新增 `overflowScore: number` 字段

**验收标准：**
- AC1: 达到目标分数后战斗继续，不触发 Victory
- AC2: 达标瞬间有明确视觉+音效反馈
- AC3: 时间归零后正确判定胜败
- AC4: 达标后 HUD 显示溢出分样式
- AC5: `BattleResult.overflowScore` 正确计算
- AC6: 全程 60fps 无性能影响

**估点：** 5

---

### Story 42.3: 溢出分系统 — 跨关携带

**复杂度: Medium**
**依赖: 42.2**

实现溢出分的跨关携带和初始分数注入。

**范围：**
- `RunState` 新增 `overflowScore: number`（跨关累积溢出分）
- 战斗胜利结算时：`overflowScore += max(0, finalScore - targetScore)`
- 下一关战斗初始化时：`BattleState.score = runState.overflowScore`
- 溢出分**不**在注入后清零（保留累积值作为续命资源，见 Story 42.8）
- 注入的溢出分作为初始分显示在 HUD 上，与后续获得的分数颜色区分
- 商店中可查看当前溢出分累积量
- `RunState` 序列化/反序列化支持 `overflowScore`

**验收标准：**
- AC1: 战斗胜利后溢出分正确累加到 `RunState.overflowScore`
- AC2: 下一关初始分数 = 当前溢出分累积量
- AC3: HUD 正确区分初始分（溢出注入）和战斗获得分
- AC4: 存档正确保存/加载溢出分
- AC5: 溢出分为 0 时下一关初始分为 0，行为与当前一致

**估点：** 5

---

### Story 42.4: 关内时间加速

**复杂度: Medium**
**依赖: 无**

实现关卡内时间流速递增和倍速 UI 显示。

**范围：**
- 新增 `getTimeAcceleration(elapsedSeconds: number, isBoss: boolean): number`
  - 公式：`1.0 + ACCEL_RATE * elapsedSeconds`
  - `ACCEL_RATE`：标准关 0.03/秒，Boss 关 0.045/秒
  - **无上限** — 时间技能续命越久，倍速越疯狂，形成天然收敛
- 修改 `battle.ts` 时间扣减：`state.time -= dt * timeAcceleration * existingTimeSpeed`
  - 与现有 Boss `timeSpeed` 和 `getTimeScale()` 叠加
- 新增 HUD 组件：**倍速指示器**
  - 位于时间 UI 旁边
  - 显示当前倍速值（如 "×1.3"）
  - 倍速变化时数字有缩放脉冲动画
  - 颜色渐变：白(×1.0) → 黄(×1.3) → 橙(×1.6) → 红(×2.0)
- `BattleState` 新增 `currentTimeAcceleration: number` 供 UI 读取

**验收标准：**
- AC1: 关卡内时间流速按 `1.0 + ACCEL_RATE × t` 线性递增，无上限
- AC2: Boss 关 ACCEL_RATE 高于标准关
- AC3: 倍速 UI 实时显示当前加速值
- AC4: 倍速变化有颜色渐变和脉冲动画
- AC5: 与现有 Boss timeSpeed / slowMotion 正确叠加不冲突
- AC6: 时间精度无累积误差（基于已过秒数计算）

**估点：** 5

---

### Story 42.5: 目标分数指数增长

**复杂度: Low**
**依赖: 42.1**

将目标分数计算从二次函数改为指数函数。

**范围：**
- 修改 `calculateTargetScore()` 公式：
  ```typescript
  function calculateTargetScore(stageNum: number, isBoss: boolean): number {
    const base = BALANCE.TARGET_BASE_EXP  // 300
    const growth = BALANCE.TARGET_GROWTH   // ~1.45
    const target = Math.round(base * Math.pow(growth, stageNum - 1))
    return isBoss ? Math.round(target * BALANCE.BOSS_TARGET_MULT) : target  // 1.5
  }
  ```
- 移除 `TARGET_LINEAR`、`TARGET_QUADRATIC` 常量
- 新增 `TARGET_BASE_EXP`、`TARGET_GROWTH`、`BOSS_TARGET_MULT` 到 `BALANCE`
- 移除 `CYCLE_SCORE_BASE`（不再需要 Cycle 倍率叠加，指数增长本身就是泄压阀）
- 更新所有调用 `calculateTargetScore` 的地方适配新签名

**验收标准：**
- AC1: 目标分数按指数函数增长
- AC2: Boss 关目标 = 基础目标 × 1.5
- AC3: 旧常量清理干净，无残留引用
- AC4: 增长曲线前 3 关体感宽松，6 关后明显陡峭
- AC5: `BALANCE` 常量可在 constants.ts 中统一调参

**估点：** 2

---

### Story 42.6: Boss 固定间隔系统重构

**复杂度: Medium**
**依赖: 42.1**

重构 Boss 系统为每 3 关固定出现，适配无限循环结构。

**范围：**
- Boss 判定：`stageNum % 3 === 0`
- 移除 Run 开始时 "抽 3 个修饰器分配给 Stage 3/5/7" 的逻辑
- 新逻辑：每个 Cycle（3 关）开始时从 Boss 池抽 1 个修饰器
  - Cycle 1 Boss（Stage 3）：抽修饰器 A
  - Cycle 2 Boss（Stage 6）：抽修饰器 B（≠A）
  - Cycle 3+ Boss：继续抽取，不重复直到池用完后重置
- Boss 关规则沿用 Epic 18 的 BossModifier 框架：
  - 满功率 Boss 修饰器生效
  - Boss 关时间基数可与标准关不同（如 45s vs 30s）
- Boss 关 HUD 显示当前修饰器名称和规则提示
- `RunState.bossModifierPool` 改为 `usedBossModifiers: string[]` 追踪已用修饰器

**验收标准：**
- AC1: 每 3 关固定为 Boss 关
- AC2: Boss 修饰器逐 Cycle 抽取，不重复
- AC3: Boss 池耗尽后重置
- AC4: Boss 关正确应用 BossModifier 效果
- AC5: Boss 关时间基数可配置（与标准关独立）
- AC6: 存档兼容：旧存档的 bossModifierPool 映射到新结构

**估点：** 5

---

### Story 42.7: 附魔仪式 — Boss 后事件

**复杂度: Medium**
**依赖: 42.1, 42.6**

Boss 关胜利后进入附魔仪式（替代商店），作为 Cycle 阶段奖励。

**范围：**
- 新建 `EnchantmentRitualScene`（或复用现有附魔 UI 组件）
- Boss 关胜利后路由到附魔仪式而非商店
- 附魔仪式内容：
  - 从玩家已装备的可附魔技能中选择 1 个
  - 为选定技能随机生成 3 个附魔选项，选 1 个附上
  - 如果没有可附魔技能（全已附魔或无 Lv3），提供替代奖励（如金币/全技能临时增幅）
- 附魔仪式完成后进入下一 Cycle 的第一关
- 不影响现有的 Lv3 升级附魔逻辑（两个获取途径共存）
- UI 风格：仪式感，深色背景 + 光效 + 缓慢动画，与商店的实用风格区分

**验收标准：**
- AC1: Boss 关后正确路由到附魔仪式
- AC2: 附魔仪式提供 3 选 1 附魔
- AC3: 仅可附魔技能参与选择
- AC4: 无可附魔技能时提供替代奖励
- AC5: 附魔结果正确写入 `enchantedSkills`
- AC6: 附魔仪式完成后正确进入下一关
- AC7: 与 Lv3 升级附魔不冲突

**估点：** 5

---

### Story 42.8: 续命机制 — 消耗溢出分重来

**复杂度: Low-Medium**
**依赖: 42.3**

时间耗尽未达标时，允许消耗全部累积溢出分重来当关。

**范围：**
- 时间耗尽且 `score < targetScore` 时：
  - 检查 `runState.overflowScore > 0`
  - 如果有溢出分：弹出选择面板
    - 选项 A：**"消耗全部溢出分（X 分），重新挑战本关"**
    - 选项 B：**"放弃，结束 Run"**
  - 选择 A：`overflowScore = 0`，重新初始化当前关卡（清除战斗状态，保留技能/遗物）
  - 选择 B：正常 Game Over 流程
- 每关最多续命 1 次（`retryUsed: boolean` 标记）
- 续命后关卡参数不变（同一目标分、同一 Boss 修饰器）
- 续命后初始分数为 0（溢出分已消耗）

**验收标准：**
- AC1: 有溢出分时正确弹出续命选择
- AC2: 无溢出分时直接 Game Over
- AC3: 续命后溢出分归零
- AC4: 续命后关卡正确重新初始化
- AC5: 每关最多续命 1 次
- AC6: 续命选择面板显示当前溢出分数值

**估点：** 3

---

### Story 42.9: 时间加速感官反馈

**复杂度: Medium**
**依赖: 42.4**

为时间加速叠加感官层反馈，让玩家"身体感受到"而不仅仅"看到数字"。

**范围：**
- **屏幕边缘压迫感**：
  - 倍速 ≥1.3 时：屏幕边缘出现渐变暗角（vignette），强度随倍速**持续递增**
  - 倍速 ≥1.6 时：暗角微微脉动
  - 倍速 ≥2.0 时：边缘泛红
  - 无上限：极端倍速下暗角和红色持续加深（clamp 视觉参数不超过遮挡核心区域）
- **BGM 加速**：
  - BGM playbackRate 跟随倍速值：`playbackRate = 1.0 + (acceleration - 1.0) * 0.5`
  - playbackRate 上限 clamp 2.0（超过后音质无法接受）
  - 平滑过渡，避免突变
- **击键音效 pitch 微升**：
  - 击键音效 rate 跟随倍速：`rate = 1.0 + (acceleration - 1.0) * 0.3`
  - rate 上限 clamp 1.8
  - 微妙但可感知，强化"加速感"
- **HUD 时间数字**：
  - 倍速 ≥1.6 时时间数字轻微抖动
  - 倍速 ≥2.0 时数字闪烁
  - 抖动/闪烁强度随倍速持续增加
- 所有效果在关卡结束后立即重置

**验收标准：**
- AC1: 暗角效果随倍速渐变，不遮挡核心打字区域
- AC2: BGM 加速平滑，不产生音质劣化
- AC3: 击键音效 pitch 变化微妙可感知
- AC4: HUD 抖动/闪烁不影响时间数字的可读性
- AC5: 关卡结束后所有效果正确重置
- AC6: 所有效果可在设置中独立关闭（无障碍考虑）

**估点：** 5

---

### Story 42.10: 平衡调整与集成测试

**复杂度: Medium**
**依赖: 42.1 ~ 42.9**

全流程集成测试与数值平衡调参。

**范围：**
- **指数增长调参**：
  - 播测 10+ 关，验证 `GROWTH_FACTOR` 是否让前 3 关轻松、6 关后有压力、9 关后极限
  - 调整 `BASE_TARGET` 和 `GROWTH_FACTOR` 直到曲线合理
- **溢出分经济平衡**：
  - 验证溢出分不会导致前期雪球滚到后期无压力
  - 如果需要：引入溢出分衰减（保留 X%），在此 Story 调参
- **时间加速体感**：
  - 验证分段倍速曲线的节奏感
  - Boss 关加速系数是否过于激进
- **续命频率**：
  - 统计平均续命使用率，期望值 20-30%（太高=太难，太低=没意义）
- **附魔仪式价值感**：
  - 附魔仪式给予的附魔强度是否足以支撑下一 Cycle
- **集成测试清单**：
  - 完整 Run：从第 1 关打到死亡，验证全流程
  - 溢出分累积 → 续命 → 继续 → 最终死亡
  - Boss 修饰器 + 时间加速叠加的极端情况
  - 存档：中途退出 → 重新加载 → 正确恢复所有状态
  - 边界：第 1 关死亡（无溢出分，直接 Game Over）
  - 边界：Boss 关续命后重打 Boss

**验收标准：**
- AC1: 完整 Run 流程无崩溃/卡死
- AC2: 数值曲线经 5+ 轮完整播测确认合理
- AC3: 溢出分不导致失控雪球
- AC4: 存档序列化/反序列化所有新字段正确
- AC5: 所有 Epic 18 残留的休息关引用清理干净
- AC6: 无回归 bug

**估点：** 5

---

## 依赖关系图

```
42.1 Run 结构简化
 ├─→ 42.5 指数目标分数
 ├─→ 42.6 Boss 固定间隔
 │    └─→ 42.7 附魔仪式
 │
42.2 战斗继续机制
 └─→ 42.3 溢出分系统
      └─→ 42.8 续命机制

42.4 关内时间加速
 └─→ 42.9 感官反馈

42.10 平衡与集成 ←── 42.1 ~ 42.9 全部完成后
```

**无依赖，可并行启动**：42.1、42.2、42.4

## 实施建议

**阶段 1（基础）：** 42.1 + 42.2 + 42.4 并行
**阶段 2（核心）：** 42.3 + 42.5 + 42.6 并行
**阶段 3（扩展）：** 42.7 + 42.8 + 42.9 并行
**阶段 4（打磨）：** 42.10

预计总点数：45 点

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 指数增长系数难调 | 太陡则第 4 关就死，太缓则永远不死 | 42.10 专项调参，预设 3 套系数 A/B/C 测试 |
| 溢出分雪球效应 | 高手前期碾压导致后面无挑战 | 可选引入衰减系数；指数增长本身是泄压阀 |
| 时间加速体感不适 | 感官反馈过强导致晕眩/不适 | 42.9 所有效果可独立关闭；强度参数可调 |
| 附魔仪式价值不足 | 玩家觉得不如商店有用 | 3 选 1 保证选择质量；可叠加少量金币奖励 |
| 无限 Run 导致疲劳 | 没有明确终点，玩家不知何时停 | 每 3 Cycle 有里程碑标记；可选"胜利条件"（通过 N 关视为通关） |
| 休息关删除后策略决策点减少 | 少了随机事件的博弈感 | 商店本身是决策点；附魔仪式新增决策点；后续可在商店内加事件 |

## 参考文件

- 当前关卡系统：`src/src/systems/stage/StageConfig.ts`、`StageManager.ts`、`stageFlow.ts`
- 战斗控制：`src/src/scenes/battle/BattleFlowController.ts`
- 战斗状态：`src/src/core/state/BattleState.ts`
- Run 状态：`src/src/core/state/RunState.ts`
- 目标分数计算：`src/src/core/state.ts` → `calculateTargetScore()`
- 时间系统：`src/src/systems/battle.ts`（时间扣减逻辑）
- Boss 修饰器框架：Epic 18（`src/src/systems/relics/BossModifierRelicBehaviors.ts`）
- 休息关（待删除）：`src/src/systems/restStage.ts`
- 音效系统：`src/src/effects/juice.ts`
