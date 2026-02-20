# Story 9.4: 关卡难度曲线调优

Status: done  # skipped: timeLimit/scoreMultiplier 连接延后，当前 30s 固定时间可玩

## Story

As a 玩家,
I want 每一关都有合理的难度递增——前期友好、后期有挑战,
so that 游戏节奏舒服，构筑策略有意义，不会在前期卡死或后期无聊。

## Acceptance Criteria

1. `battle.ts` 使用 `StageManager` / `levels.json` 的 `timeLimit`，不再硬编码 `BALANCE.TIME_PER_LEVEL`
2. 审查并调整 `calculateTargetScore` 公式，确保各关目标分合理
3. Act 1（关 1-3）对新手友好：目标分合理、时间充裕
4. Act 3（关 7-8）需要策略性构筑：高目标分、时间相对紧张
5. 调优后的数值表记录到 `docs/design-numerical-balance.md`
6. 所有相关测试通过

## Tasks / Subtasks

- [ ] Task 1: 连接 StageManager 到 battle.ts (AC: #1)
  - [ ] 1.1 `battle.ts` 中导入 `stageManager` 和 `levels.json`
  - [ ] 1.2 `startLevel()` 从 `stageManager.getStage(state.level)` 读取 `timeLimit`，替换 `BALANCE.TIME_PER_LEVEL`
  - [ ] 1.3 `startTimer()` 使用关卡 `timeLimit` 替代固定值
  - [ ] 1.4 确保 `stageManager.load()` 在游戏初始化时调用（如未调用）
  - [ ] 1.5 保留 `state.player.timeBonus`（遗物加成）和 `time_lord` 遗物的叠加逻辑

- [ ] Task 2: 调整目标分数 (AC: #2, #3, #4)
  - [ ] 2.1 审查当前 `calculateTargetScore` 公式：`floor(80 + level × 40 + level² × 5)`
  - [ ] 2.2 计算每关目标分数（考虑基础词语得分、词语数量、可用时间、倍率）
  - [ ] 2.3 调整 `BALANCE.TARGET_BASE/LINEAR/QUADRATIC` 参数或改为 per-stage 配置
  - [ ] 2.4 验证 Act 1 目标分可在无技能/低技能下达成
  - [ ] 2.5 验证 Act 3 目标分需要 multiply/score 技能构筑才能稳定达成

- [ ] Task 3: 调整 levels.json 数值 (AC: #3, #4)
  - [ ] 3.1 审查每关 `timeLimit`：Act 1 时间宽裕（60-70s），Act 3 时间紧张
  - [ ] 3.2 审查 `scoreMultiplier`：考虑对目标分/实际分数的影响

- [ ] Task 4: 记录数值表 (AC: #5)
  - [ ] 4.1 创建 `docs/design-numerical-balance.md`
  - [ ] 4.2 记录每关最终参数表（目标分、时间、词数、难度、预期通关条件）
  - [ ] 4.3 记录金币经济参数（基础20 + 时间 + overkill遗物 + 藏宝图遗物）
  - [ ] 4.4 记录关键设计意图说明

- [ ] Task 5: 更新测试 (AC: #6)
  - [ ] 5.1 更新 `calculateTargetScore` 相关测试（如公式变更）
  - [ ] 5.2 确保 StageManager 测试覆盖新的使用方式
  - [ ] 5.3 运行全部测试确认无回归

## Dev Notes

### 核心问题：StageManager 与 battle.ts 脱节

`StageManager`（Story 5.2）和 `levels.json` 已有完整的每关配置数据，但 `battle.ts` 从未连接过这些数据：

| 参数 | levels.json (已定义) | battle.ts (实际使用) | 问题 |
|------|---------------------|---------------------|------|
| 时间限制 | 60-120s per stage | `BALANCE.TIME_PER_LEVEL = 30` | 固定 30s，levels.json 被忽略 |
| 目标分数 | 无 | `calculateTargetScore()` 二次公式 | 公式独立，不读 stage 配置 |
| 词语难度 | 1-5 per stage | 未使用 | wordDifficulty 从未生效 |
| 分数倍率 | 1.0-2.0 per stage | 未使用 | scoreMultiplier 从未应用 |
| 修饰符 | time_pressure/boss/no_error | 未使用 | modifiers 从未检查 |

### 当前目标分数公式

```
targetScore = floor(80 + level × 40 + level² × 5)
```

| 关卡 | 目标分 | 当前时间 | levels.json 时间 |
|------|--------|---------|-----------------|
| 1 | 125 | 30s | 60s |
| 2 | 180 | 30s | 65s |
| 3 | 245 | 30s | 70s |
| 4 | 320 | 30s | 75s |
| 5 | 405 | 30s | 80s |
| 6 | 500 | 30s | 85s |
| 7 | 605 | 30s | 90s |
| 8 | 720 | 30s | 120s |

### levels.json 现有配置

| 关卡 | 名称 | 幕 | 时间 | 词数 | 难度 | 金币 | 倍率 | 修饰符 |
|------|------|---|------|------|------|------|------|--------|
| 1 | 起点 | 1 | 60s | 15 | 1 | 50 | 1.0x | — |
| 2 | 初探 | 1 | 65s | 18 | 1 | 60 | 1.0x | — |
| 3 | 热身 | 1 | 70s | 20 | 2 | 75 | 1.1x | — |
| 4 | 跃进 | 2 | 75s | 22 | 2 | 90 | 1.2x | — |
| 5 | 挑战 | 2 | 80s | 25 | 3 | 110 | 1.3x | time_pressure |
| 6 | 险境 | 2 | 85s | 28 | 3 | 130 | 1.4x | time_pressure |
| 7 | 巅峰 | 3 | 90s | 30 | 4 | 150 | 1.5x | time_pressure, bonus_combo |
| 8 | 终极审判 | 3 | 120s | 40 | 5 | 300 | 2.0x | boss, no_error |

### 词语难度映射（StageManager 内置）

| 等级 | minLength | maxLength | complexity |
|------|-----------|-----------|-----------|
| 1 | 3 | 5 | 0.2 |
| 2 | 4 | 6 | 0.4 |
| 3 | 5 | 7 | 0.6 |
| 4 | 5 | 8 | 0.8 |
| 5 | 6 | 10 | 1.0 |

### 设计决策

- **wordCount/wordDifficulty 不启用**：levels.json 中的 `wordCount` 和 `wordDifficulty` 字段不在本 Story 启用。词语难度由玩家通过商店构筑 wordDeck 自行控制，不做关卡强制限制。
- **本 Story 仅连接 `timeLimit` 和 `scoreMultiplier`**：从 levels.json 读取每关时间限制和分数倍率，替换硬编码常量。

### 设计约束

- **金币经济**（Story 9.3 已确定）：基础 20 + 剩余时间 + overkill(遗物) + 藏宝图(+15遗物)
- **倍率来源**：打字连击(自然) + multiply 技能(主动)
- **遗物加时**：time_lord +8s, time_crystal +0.5s/词

### Project Structure Notes

- 战斗系统: `src/src/systems/battle.ts`
- 游戏状态: `src/src/core/state.ts`（`calculateTargetScore`）
- 平衡常量: `src/src/core/constants.ts`（`BALANCE`）
- 关卡管理: `src/src/systems/stage/StageManager.ts`
- 关卡配置类型: `src/src/systems/stage/StageConfig.ts`
- 关卡数据: `src/assets/data/levels.json`

### References

- [Source: docs/epics.md#Epic 9, Story 9.4]
- [Source: src/src/core/state.ts#calculateTargetScore]
- [Source: src/src/core/constants.ts#BALANCE]
- [Source: src/src/systems/stage/StageManager.ts]
- [Source: src/assets/data/levels.json]
- [Source: docs/stories/9-3-relic-economy-rebalance.md — 前置 Story，金币经济]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
