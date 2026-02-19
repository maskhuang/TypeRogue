---
title: 'Epics - 打字肉鸽'
project: '打字肉鸽'
date: '2026-02-16'
version: '1.0'
source_documents:
  - docs/gdd.md
  - docs/game-architecture.md
---

# 打字肉鸽 - Implementation Epics

本文档将 GDD 拆分为可实现的 Epics 和 Stories，按依赖顺序排列。

---

## Epic 1: 核心打字系统

**目标:** 实现基础打字输入和词语匹配，达到 <16ms 输入延迟目标。

**依赖:** 无（基础设施）

**架构参考:** `systems/typing/`, `core/state/BattleState.ts`

### Story 1.1: 键盘输入处理器

**描述:** 创建 InputHandler 类，监听键盘事件并分发到游戏系统。

**验收标准:**
- [ ] 监听 keydown 事件，过滤非字母键
- [ ] 输入延迟 <16ms（使用 performance.now() 验证）
- [ ] 支持大小写不敏感匹配
- [ ] 发出 `input:keypress` 事件

**技术说明:**
- 位置: `renderer/systems/typing/InputHandler.ts`
- 依赖: `core/events/EventBus.ts`

### Story 1.2: 词语匹配器

**描述:** 实现 WordMatcher 类，检测玩家输入是否匹配当前词语。

**验收标准:**
- [ ] 逐字符匹配当前词语
- [ ] 支持错误检测（输入错误字符）
- [ ] 词语完成时发出 `word:complete` 事件
- [ ] 错误时发出 `word:error` 事件

**技术说明:**
- 位置: `renderer/systems/typing/WordMatcher.ts`
- 状态: 使用 BattleState.currentWord

### Story 1.3: 词库加载器

**描述:** 实现 DataManager 的词库加载功能，支持按语言懒加载。

**验收标准:**
- [ ] 从 `assets/data/words/` 加载 JSON 词库
- [ ] 支持中文拼音词库
- [ ] 缓存已加载词库
- [ ] 词库格式: `{ words: string[], difficulty: number[] }`

**技术说明:**
- 位置: `renderer/systems/typing/WordLoader.ts` 或扩展 DataManager
- 资产: `assets/data/words/zh-pinyin.json`

### Story 1.4: 基础计分逻辑

**描述:** 实现词语完成时的基础分数计算。

**验收标准:**
- [ ] 基础分 = 词语长度 × baseScore
- [ ] 应用当前倍率 (state.multiplier)
- [ ] 更新 BattleState.wordScore
- [ ] 发出 `score:update` 事件

**技术说明:**
- 位置: `renderer/systems/scoring/ScoreCalculator.ts`

---

## Epic 2: 被动技能系统

**目标:** 实现基于键盘位置的被动技能联动机制。

**依赖:** Epic 1 (需要输入系统)

**架构参考:** `systems/skills/passive/`, Novel Pattern: 键盘相邻联动

### Story 2.1: 键盘相邻映射

**描述:** 创建 QWERTY 键盘的相邻关系映射表。

**验收标准:**
- [ ] 完整 26 键相邻关系定义
- [ ] AdjacencyMap.getAdjacent(key) 返回相邻键列表
- [ ] 单元测试覆盖所有键位

**技术说明:**
- 位置: `renderer/systems/skills/passive/AdjacencyMap.ts`
- 常量: `core/constants.ts` 中的 ADJACENT_KEYS

### Story 2.2: 技能数据定义

**描述:** 定义所有技能的基础数据结构。

**验收标准:**
- [ ] SkillData 接口定义 (id, name, type, icon, base, grow)
- [ ] 初始 10 个技能数据
- [ ] 技能类型枚举: score, multiply, time, combo, protect, core, aura, lone, echo, void, ripple

**技术说明:**
- 位置: `renderer/data/skills.ts`
- 类型: `shared/types.ts`

### Story 2.3: 技能绑定系统

**描述:** 实现技能与键位的绑定管理。

**验收标准:**
- [ ] RunState.bindings: Map<string, SkillId>
- [ ] bindSkill(key, skillId) 方法
- [ ] unbindSkill(key) 方法
- [ ] getSkillAtKey(key) 查询

**技术说明:**
- 位置: `renderer/core/state/RunState.ts`

### Story 2.4: 被动技能计算

**描述:** 实现 PassiveSkillSystem，计算位置相关加成。

**验收标准:**
- [ ] 触发技能时获取相邻技能列表
- [ ] 「光环」类型为相邻技能提供 1.5x 加成
- [ ] 「核心」类型获得相邻数量加成
- [ ] 「孤狼」类型无相邻时双倍
- [ ] 「虚空」类型获得空位加成

**技术说明:**
- 位置: `renderer/systems/skills/passive/PassiveSkillSystem.ts`

---

## Epic 3: 主动技能与效果队列

**目标:** 实现基于触发顺序的主动技能效果系统。

**依赖:** Epic 2 (需要技能数据和绑定)

**架构参考:** `systems/skills/active/`, Novel Pattern: 效果队列

### Story 3.1: 效果队列实现

**描述:** 创建 EffectQueue 类管理技能效果队列。

**验收标准:**
- [ ] enqueue(effect) 添加效果
- [ ] dequeue() 取出并移除效果
- [ ] peek() 查看队首效果
- [ ] 最大队列长度 10，超出时移除最旧
- [ ] 发出 `effect:queued` 和 `effect:dequeued` 事件

**技术说明:**
- 位置: `renderer/systems/skills/active/EffectQueue.ts`

### Story 3.2: 主动技能系统

**描述:** 实现 ActiveSkillSystem 处理顺序效果。

**验收标准:**
- [ ] applyNextEffect(baseValue) 应用队首效果
- [ ] 「涟漪」效果：为相邻键入队 1.5x 加成
- [ ] 「共鸣」效果：30% 概率触发相邻技能

**技术说明:**
- 位置: `renderer/systems/skills/active/ActiveSkillSystem.ts`

### Story 3.3: 技能协调器

**描述:** 创建 SkillCoordinator 协调被动和主动系统。

**验收标准:**
- [ ] onKeyPress 协调两系统
- [ ] 处理顺序: 被动加成 → 主动效果 → 执行 → 广播
- [ ] 发出统一的 `skill:triggered` 事件

**技术说明:**
- 位置: `renderer/systems/skills/SkillCoordinator.ts`

### Story 3.4: 技能触发集成

**描述:** 将技能系统集成到打字流程。

**验收标准:**
- [ ] 词语字符触发对应键位技能
- [ ] 技能效果实时显示
- [ ] 分数正确累加

---

## Epic 4: 战斗场景

**目标:** 实现完整的战斗界面和游戏循环。

**依赖:** Epic 1, 2, 3 (核心系统)

**架构参考:** `scenes/battle/`, `ui/hud/`, Scene Stack

### Story 4.1: 场景管理器

**描述:** 实现 SceneManager 和 Scene 基类。

**验收标准:**
- [ ] Scene 接口: onEnter, onExit, onPause, onResume, update, render
- [ ] SceneManager: push, pop, replace, current
- [ ] 场景栈正确管理生命周期

**技术说明:**
- 位置: `renderer/scenes/SceneManager.ts`

### Story 4.2: 战斗场景框架

**描述:** 创建 BattleScene 基础框架。

**验收标准:**
- [ ] PixiJS Container 结构
- [ ] 初始化 BattleState
- [ ] 游戏循环 (Ticker)
- [ ] 暂停/恢复支持

**技术说明:**
- 位置: `renderer/scenes/battle/BattleScene.ts`

### Story 4.3: 战斗 HUD

**描述:** 实现战斗界面 HUD 组件。

**验收标准:**
- [ ] ScoreDisplay: 分数和倍率显示
- [ ] TimerBar: 倒计时进度条
- [ ] ComboCounter: 连击计数器
- [ ] 当前词语显示

**技术说明:**
- 位置: `renderer/ui/hud/`

### Story 4.4: 键盘可视化

**描述:** 实现键盘技能绑定的可视化显示。

**验收标准:**
- [ ] 26 键布局显示
- [ ] 技能图标显示在对应键位
- [ ] 相邻高亮效果
- [ ] 触发动画反馈

**技术说明:**
- 位置: `renderer/ui/keyboard/KeyboardVisualizer.ts`

### Story 4.5: 战斗流程完整循环

**描述:** 实现完整的战斗流程。

**验收标准:**
- [ ] 开始 → 打字 → 计分 → 时间结束 → 结算
- [ ] 胜利/失败条件判断
- [ ] 转场到商店或结算

---

## Epic 5: Roguelike 循环

**目标:** 实现完整的单局游戏循环和进度系统。

**依赖:** Epic 4 (战斗场景)

**架构参考:** `core/state/RunState.ts`, Scene Stack

### Story 5.1: Run 状态管理

**描述:** 完善 RunState 管理单局数据。

**验收标准:**
- [ ] 技能库存、金币、当前关卡
- [ ] 遗物列表
- [ ] 重置方法 (新 Run)

**技术说明:**
- 位置: `renderer/core/state/RunState.ts`

### Story 5.2: 关卡进度系统

**描述:** 实现 8 关 3 幕的进度结构。

**验收标准:**
- [ ] Act 1: 关卡 1-3
- [ ] Act 2: 关卡 4-6
- [ ] Act 3: 关卡 7-8 (Boss)
- [ ] 难度递增参数

**技术说明:**
- 配置: `assets/data/levels.json`

### Story 5.3: 商店场景

**描述:** 实现关卡间的商店界面。

**验收标准:**
- [ ] 技能购买 (3 选 1)
- [ ] 技能升级
- [ ] 遗物购买
- [ ] 金币消耗

**技术说明:**
- 位置: `renderer/scenes/shop/ShopScene.ts`

### Story 5.4: 遗物系统

**描述:** 实现遗物数据和效果。

**验收标准:**
- [ ] 遗物数据定义
- [ ] 被动效果应用
- [ ] 遗物获取/丢弃

**技术说明:**
- 位置: `renderer/data/relics.ts`, `renderer/systems/relics/`

### Story 5.5: 游戏结束流程

**描述:** 实现胜利和失败流程。

**验收标准:**
- [ ] 胜利: 显示统计、解锁检查
- [ ] 失败: 显示进度、重试选项
- [ ] 返回主菜单

---

## Epic 6: Meta 系统

**目标:** 实现跨 Run 的永久进度和收藏系统。

**依赖:** Epic 5 (需要 Run 完成触发)

**架构参考:** `core/state/MetaState.ts`, `main/save.ts`

### Story 6.1: Meta 状态管理

**描述:** 实现 MetaState 管理永久数据。

**验收标准:**
- [ ] 解锁技能列表
- [ ] 成就进度
- [ ] 统计数据 (总局数、最高分等)

**技术说明:**
- 位置: `renderer/core/state/MetaState.ts`

### Story 6.2: 存档系统

**描述:** 实现原子写入的存档系统。

**验收标准:**
- [ ] safeSave 原子写入
- [ ] Meta 和 Run 分离存储
- [ ] 启动时自动加载
- [ ] IPC 通信 (renderer → main)

**技术说明:**
- 位置: `main/save.ts`
- IPC: `shared/ipc-channels.ts`

### Story 6.3: 解锁系统

**描述:** 实现技能和遗物解锁机制。

**验收标准:**
- [ ] 解锁条件定义
- [ ] StateCoordinator 检查解锁
- [ ] 解锁通知显示

### Story 6.4: 图鉴场景

**描述:** 实现收藏图鉴界面。

**验收标准:**
- [ ] 技能图鉴 (已解锁/未解锁)
- [ ] 遗物图鉴
- [ ] 统计页面

**技术说明:**
- 位置: `renderer/scenes/collection/CollectionScene.ts`

---

## Epic 7: 音效与视觉

**目标:** 实现低延迟音效和粒子特效。

**依赖:** Epic 4 (战斗场景)

**架构参考:** `systems/audio/`, Howler.js

### Story 7.1: 音频管理器

**描述:** 实现 Howler.js 封装的音频系统。

**验收标准:**
- [ ] 击键音效池 (20+)
- [ ] 技能音效预加载
- [ ] BGM 淡入淡出
- [ ] 音量控制 (master, sfx, bgm)

**技术说明:**
- 位置: `renderer/systems/audio/AudioManager.ts`

### Story 7.2: 击键音效

**描述:** 实现打字时的即时音效反馈。

**验收标准:**
- [ ] 延迟 <50ms
- [ ] 正确/错误不同音效
- [ ] 连击时音高变化（可选）

### Story 7.3: 粒子效果系统

**描述:** 实现 PixiJS 粒子效果。

**验收标准:**
- [ ] 技能触发粒子
- [ ] 分数飘字
- [ ] 连击火焰效果

**技术说明:**
- 位置: `renderer/ui/effects/ParticleManager.ts`
- 库: @pixi/particle-emitter

### Story 7.4: 技能触发反馈

**描述:** 实现技能触发的视觉反馈。

**验收标准:**
- [ ] 技能图标弹出
- [ ] 键盘键位高亮
- [ ] 效果文字描述

---

## Epic 8: Electron 与 Steam

**目标:** 打包为桌面应用并集成 Steam。

**依赖:** Epic 6 (存档系统)

**架构参考:** `main/`, Electron + steamworks.js

### Story 8.1: Electron 主进程

**描述:** 配置 Electron 主进程。

**验收标准:**
- [ ] 窗口创建和管理
- [ ] IPC 通道注册
- [ ] 开发/生产环境配置

**技术说明:**
- 位置: `main/window.ts`, `main/index.ts`

### Story 8.2: Steam 初始化

**描述:** 集成 steamworks.js 初始化。

**验收标准:**
- [ ] Steam 客户端检测
- [ ] AppID 配置
- [ ] 离线模式降级

**技术说明:**
- 位置: `main/steam.ts`
- 配置: `steam_appid.txt`

### Story 8.3: Steam 成就

**描述:** 实现 Steam 成就系统。

**验收标准:**
- [ ] 成就定义映射
- [ ] 解锁成就 API 调用
- [ ] 成就进度追踪

### Story 8.4: Steam 云存档

**描述:** 配置 Steam Cloud 同步。

**验收标准:**
- [ ] 云存档配置
- [ ] 冲突处理策略
- [ ] 同步状态显示

### Story 8.5: 构建与打包

**描述:** 配置 electron-builder 打包。

**验收标准:**
- [ ] Windows 构建 (exe/msi)
- [ ] macOS 构建 (dmg)
- [ ] Steam Depot 配置

**技术说明:**
- 配置: `electron-builder.json`

---

## Epic 依赖图

```
Epic 1: 核心打字系统
    ↓
Epic 2: 被动技能系统
    ↓
Epic 3: 主动技能与效果队列
    ↓
Epic 4: 战斗场景 ←──────┐
    ↓                   │
Epic 5: Roguelike 循环  │
    ↓                   │
Epic 6: Meta 系统       │
    ↓                   │
Epic 7: 音效与视觉 ─────┘
    ↓
Epic 8: Electron 与 Steam
```

**并行可能:**
- Epic 7 可与 Epic 4-6 并行开发
- Epic 8 可在 Epic 6 完成后立即开始

---

## 实现优先级

| 优先级 | Epic | 理由 |
|--------|------|------|
| P0 | Epic 1 | 核心玩法基础 |
| P0 | Epic 2 | 核心差异化机制 |
| P0 | Epic 3 | 核心差异化机制 |
| P1 | Epic 4 | 可玩原型必需 |
| P1 | Epic 5 | 完整游戏循环 |
| P2 | Epic 6 | 重玩价值 |
| P2 | Epic 7 | 游戏感 |
| P3 | Epic 8 | 发布必需 |

---

_Generated: 2026-02-16_
