# Story 57.6: 战斗最小闭环 ◆ 里程碑

## Status: draft

## Story

作为 Godot 迁移的关键里程碑，我需要在 Godot 端实现"一个敌人 + 一种技能 + 一个词条"的最小可玩战斗，验证 57.2 文档化的事件管线设计正确，宣布"Godot 端可玩"。

完成此 Story 即标志着 Epic 57 进入主体迁移阶段。

## 验收标准 (AC)

### AC1: BattleScene 场景
- `scenes/battle.tscn`
- 布局：
  - 上方：敌人 sprite + 血条 HUD
  - 中央：目标词显示
  - 下方：键盘可视化（复用 57.5）
  - 右侧：技能槽 + 计分 HUD
- 使用 57.3 的 P0 美术资产

### AC2: 战斗状态机
- `scripts/systems/Battle.cs` 实现 57.2 图 1 的状态机
- 状态：`Init / WaitingStart / SpawnWord / Typing / WordComplete / WordError / CheckVictory / Settlement / EndBattle`
- 转移由 EventBus signals 驱动
- 每个状态切换 emit `EventBus.BattleStateChanged`

### AC3: 计分管线
- `scripts/systems/Scoring.cs`
- 计算公式：`base × multiplier`（最简形式，57.7a 再补完整）
- 词完成时调用，发出 `EventBus.ScoreUpdated`
- 计分写入 `GameState.CurrentScore`

### AC4: 一种技能（占位）
- `scripts/systems/Skills.cs`（stub 形式）
- 实现一个最简单的技能：暴击（每 5 词触发一次，下一词得分 ×2）
- 触发时播放命中特效（57.3 的暴击 spritesheet）
- 发出 `EventBus.SkillTriggered`

### AC5: 一个词条（占位）
- `scripts/systems/Affixes.cs`（stub 形式）
- 给暴击技能挂一个最简词条："长度加成"（每个字母 +5 base 分）
- 按 57.2 图 3 的顺序在结算管线中应用

### AC6: 一个敌人
- 复用 57.3 的原型敌人（idle / hit / death 动画）
- 100 HP，每词扣血量 = 当前词得分 ÷ 10
- 受击时播放 hit 动画 + 屏幕震动（轻微）
- 死亡时播放 death 动画

### AC7: 胜利结算
- 敌人血量 ≤ 0 → 切到 Settlement 状态
- 显示总分 + "胜利" 文字
- 3 秒后或按任意键 → 返回主菜单（占位场景）

### AC8: 调试日志
- dev-only：所有 EventBus signal 在控制台输出（带时间戳）
- 用于验证事件流与 57.2 文档一致

### AC9: 端到端可玩
- 从主菜单 → 战斗 → 击杀敌人 → 胜利结算 → 返回主菜单 完整跑通
- 无崩溃，无明显卡顿
- 在 macOS / Windows / Linux 至少 macOS 上完整测一遍

## 技术说明

### 涉及文件
- 新增：
  - `godot/scripts/systems/Battle.cs`
  - `godot/scripts/systems/Scoring.cs`
  - `godot/scripts/systems/Skills.cs`（stub）
  - `godot/scripts/systems/Affixes.cs`（stub）
  - `godot/scripts/ui/EnemyView.cs`
  - `godot/scripts/ui/BattleHud.cs`
  - `godot/scenes/battle.tscn`
  - `godot/scenes/main_menu.tscn`（占位）

### 依赖
- 57.5（键盘 + 输入闭环）
- 57.4（数据加载）
- 57.2（事件流文档作为实施依据）

### 实施顺序建议
1. 先把 `Battle.cs` 状态机搭起来，所有状态用 print 占位
2. 接入 `Scoring.cs`，验证词完成 → 扣血路径
3. 接入敌人 sprite + 血条
4. 加 Skills stub（暴击）
5. 加 Affixes stub（长度加成）
6. 验收 AC9 端到端

### 里程碑意义
**完成此 Story 即可宣布"Godot 端可玩"**。后续 Story（57.7）都是在这个最小闭环上扩展，不再有"能不能跑通"的不确定性。

### 风险
- **R1**：Godot signals 同步 vs 异步语义与 TS EventBus 不一致 → 缓解：本 Story 实施时立刻发现差异，回写 57.2 文档作为后续指南
- **R2**：状态机过于简化导致无法扩展 → 缓解：本 Story 接受"占位"，但状态名和事件名必须与 57.2 完全一致，57.7 扩展时不改名

### 验证清单（人工）
- [ ] 完整打通一局战斗
- [ ] 控制台事件日志与 57.2 图 2 一致
- [ ] 暴击触发时视觉反馈正确
- [ ] 词条加成数值正确

## Dev Notes

无（draft 阶段）。
