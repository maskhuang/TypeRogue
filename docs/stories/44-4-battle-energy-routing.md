# Story 44.4: 战斗能量路由 → 流水线推进

## Status: ready-for-dev

## Story

作为造词师玩家，我在战斗中产出的能量应自动推进词语组装流水线，并在组装完成时看到反馈。

## 验收标准 (AC)

### AC1: 能量产出路由
- 造词师技能产出 energy 资源时，调用 `routeEnergyToPipeline`
- 能量注入 `advancePipeline`，推进当前流水线
- 无流水线时能量不消耗（或累积到 classResourceProduced 供统计）

### AC2: 战斗 HUD 流水线进度
- 键盘上方或资源栏旁显示紧凑流水线：`[a✓][p✓][p▶░][l░][e░]`
- 当前推进槽位用动画指示
- 每次能量推进时进度条平滑增长

### AC3: 组装完成反馈
- 所有槽位完成时：
  - 播放组装完成音效
  - 词语从流水线飞入词库的动画
  - 浮字提示 "✨ 词语组装完成: apple"
- 流水线清空，HUD 更新为空状态

### AC4: 跨关进度保留
- 战斗结束时未完成的流水线进度原样保留
- 下一关战斗继续推进
- 商店阶段可在造词台查看当前进度

### AC5: 每帧/每次触发更新
- 能量路由在 skills.ts 触发回调中执行（与 mutagen 路由同级）
- 流水线状态更新后刷新 HUD

## 技术说明

### 涉及文件
- `src/src/systems/skills.ts` — 能量路由入口（替换 routeFragmentsToInventory 调用）
- `src/src/systems/classes/AssemblyPipeline.ts` — routeEnergyToPipeline 实现
- `src/src/systems/battle.ts` — HUD 渲染（流水线进度条）
- `src/src/effects/sound.ts` — 组装完成音效
- `src/src/ui/keyboard/KeyboardVisualizer.ts` — 可选：流水线 HUD 组件

### 依赖
- Story 44.1（advancePipeline 纯函数）
- Story 44.3（流水线可视化组件复用）
