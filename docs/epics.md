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
- [ ] 技能类型枚举: score, multiply, time, protect, core, aura, lone, echo, void, ripple

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

## Epic 9: 数值平衡与技能迭代

**目标:** 统一倍率驱动的反馈体系，调整技能数值与遗物/商店经济，使构筑选择更有意义。

**依赖:** Epic 1-7 (需要完整系统)

**架构参考:** `data/skills.ts`, `data/relics.ts`, `systems/skills.ts`, `systems/battle.ts`, `systems/shop.ts`

### Story 9.1: 移除 combo 技能类型，统一为 multiply

**描述:** combo 技能（通过加连击间接提升倍率）与 multiply 技能（直接加倍率）本质相同，去掉 combo 技能类型。倍率提升统一由 multiply 技能直接完成。连击计数器保留为纯打字指标（连续正确击键），不再有技能直接修改连击数。

**设计原则:**
- 倍率来源仅两条：打字连击（自然积累）+ multiply 技能（主动触发）
- 连击是玩家打字能力的体现，不应被技能"注水"
- `chain`（连锁）需重新设计为其他类型或移除

**验收标准:**
- [ ] 从 SkillType / ActiveSkillType 中移除 `combo`
- [ ] 删除 `systems/skills.ts` 中 `case 'combo'` 分支
- [ ] `chain`（连锁）重新设计：改为 multiply 类型或替换为全新技能
- [ ] 审查 `amp`（增幅）倍率增量（当前 +0.2/次）
- [ ] 审查 `surge`（激涌）倍率增量（当前 +0.3/次）
- [ ] 确保 multiply 技能之间形成合理的价格-效果梯度（amp < surge）
- [ ] 所有相关测试通过

**技术说明:**
- 涉及: `core/types.ts`, `data/skills.ts`, `systems/skills.ts`

### Story 9.2: 反馈体系改为倍率驱动

**描述:** 将音效、粒子、火焰等反馈效果从基于连击数改为基于倍率，使反馈与实际分数产出一致。

**验收标准:**
- [ ] 打字音高基于 `state.multiplier` 而非 `state.combo`（1.0x→500Hz, 3.0x→800Hz）
- [ ] 粒子火焰阈值从 `combo >= 10` 改为 `multiplier >= 2.0`
- [ ] `ParticleManager.playComboFlame` / `getFlameIntensity` 参数改为 multiplier
- [ ] `ComboCounter.setCombo` 接收 multiplier 参数
- [ ] `BattleHUD` 传递 multiplier 到 ComboCounter
- [ ] `ParticleController.onComboUpdate` 事件数据包含 multiplier
- [ ] 所有相关测试通过

**技术说明:**
- 涉及: `effects/sound.ts`, `ui/effects/ParticleController.ts`, `ui/effects/ParticleManager.ts`, `ui/effects/ParticlePresets.ts`, `ui/hud/ComboCounter.ts`, `ui/hud/BattleHUD.ts`

### Story 9.3: 遗物条件与经济重平衡

**描述:** 调整遗物触发条件使其与倍率驱动体系一致；重做商店金币奖励计算，引入 overkill 和剩余时间奖励。

**验收标准:**
- [ ] 狂战士面具：条件从 `combo > 20` 改为 `multiplier > 3.0`，效果从 +30% 改为 +50%
- [ ] `RelicConditionType` 新增 `multiplier_threshold`
- [ ] `RelicEffects.BattleContext` 新增 `multiplier` 字段
- [ ] 商店金币奖励改为：基础 20 + overkill 分数 + 剩余时间秒数
- [ ] 藏宝图遗物：overkill 奖励翻倍（而非总超额 /10 翻倍）
- [ ] 所有相关测试通过

**技术说明:**
- 涉及: `data/relics.ts`, `systems/relics/RelicTypes.ts`, `systems/relics/RelicEffects.ts`, `systems/shop.ts`

### Story 9.4: 关卡难度曲线调优

**描述:** 审查并调整 8 关的目标分数、时间限制和难度递增，确保玩家在合理构筑下能稳定通关前 6 关，后 2 关需要优秀构筑。

**验收标准:**
- [ ] 审查 `calculateTargetScore` 公式，确保各关目标分数合理
- [ ] 审查时间限制递减曲线
- [ ] 确保 Act 1 (关 1-3) 对新手友好
- [ ] 确保 Act 3 (关 7-8) 需要策略性构筑
- [ ] 记录调优后的数值表到设计文档

**技术说明:**
- 涉及: `core/state.ts`（`calculateTargetScore`）, `systems/stage/StageManager.ts`

### Story 9.5: 技能数值审查与平衡

**描述:** 全面审查所有技能的 base/grow 数值，确保各技能在不同阶段（早期/中期/后期）都有合理的价值定位，避免出现绝对优势/劣势技能。

**验收标准:**
- [ ] 制作技能 DPS/价值对比表（考虑触发频率、倍率影响）
- [ ] 确保 score 类（spark/burst/star）形成合理的价格-收益梯度
- [ ] 确保 multiply 类（amp/surge/chain 或替代品）形成合理的倍率梯度
- [ ] 确保 time 类（clock/freeze）延时收益与分数产出匹配
- [ ] 确保联动类（core/aura/echo/ripple）在正确的键位密度下有价值
- [ ] 确保反协同类（lone/void）在低技能构筑时有竞争力
- [ ] 记录最终数值到设计文档

**技术说明:**
- 涉及: `data/skills.ts`, 可能需要调整 `systems/skills.ts` 中的计算公式

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

Epic 9: 数值平衡与技能迭代 ←── Epic 1-7
```

---

## Epic 10: 内容扩展与词库系统

**目标:** 扩展游戏内容池，提升每局游戏的新鲜感和重玩价值。

**依赖:** Epic 5 (商店系统), Epic 9 (技能精简后的数据结构)

**架构参考:** `data/words.ts`, `systems/shop.ts`, `systems/battle.ts`

### Story 10.1: 策展大词典

**描述:** 用 ~3000 词策展词典替换原先 ~130 词小词库，并将初始词库改为每局随机抽取，提升重玩新鲜感。

**验收标准:**
- [ ] 内置词典规模从 ~130 词扩展到 ~3000+ 词
- [ ] 按字母建立技能亲和词池（highlight 属性），覆盖常用键位
- [ ] 初始词库改为从 Tier 1-2 词池随机抽取 20 词，每局不同
- [ ] 词池数据接口（WordPool）不变，系统代码零修改
- [ ] 无跨池重复词
- [ ] 所有测试通过

**技术说明:**
- 涉及: `data/words.ts`（词典数据 + getStarterWords 随机化）
- 不涉及: `systems/battle.ts`, `systems/shop.ts`, `core/types.ts`（接口不变）

---

---

## Epic 11: 效果管道统一

**目标:** 用统一的 Modifier 管道替换技能和遗物的硬编码 switch/case，实现三层修饰叠加模型（base 加法 → enhance 乘法 → global 乘法），为技能扩充和遗物重做奠定技术基础。

**依赖:** Epic 9 (需要稳定的技能/遗物基线)

**架构参考:** `systems/skills.ts`, `systems/relics/`, `core/types.ts`

**设计参考:** `docs/brainstorming-skills-relics-refactor-2026-02-20.md` 方向 A

### Story 11.1: Modifier 接口与注册中心

**描述:** 定义统一的 Modifier 接口和 ModifierRegistry，作为效果管道的数据层。

**验收标准:**
- [ ] Modifier 接口: id, source, layer(base/enhance/global), trigger(EventType), phase(before/calculate/after), condition?, effect?, behavior?, priority
- [ ] Condition 接口: type + 对应参数（combo_gte, adjacent_skills_gte, word_length_gte 等）
- [ ] ModifierRegistry: register(modifier), unregister(id), getByTrigger(event), getBySource(sourceId)
- [ ] 修饰器生命周期：技能绑定时注册、解绑时移除；遗物获取时注册
- [ ] 单元测试覆盖注册/查询/移除

**技术说明:**
- 新增: `systems/modifiers/Modifier.ts`, `systems/modifiers/ModifierRegistry.ts`
- 修改: `core/types.ts`（新增 Modifier 相关类型）

### Story 11.2: 三层计算管道

**描述:** 实现 EffectPipeline，按 before → calculate → after 三阶段处理修饰器，calculate 阶段内按 base(加法) → enhance(乘法) → global(乘法) 三层计算。

**验收标准:**
- [ ] EffectPipeline.resolve(event, context) → FinalEffect
- [ ] Phase 1 (before): 收集拦截型修饰器，任一拦截则终止事件
- [ ] Phase 2 (calculate): 三层计算 — Σ(base) × Π(enhance) × Π(global)
- [ ] Phase 3 (after): 收集触发型修饰器，返回待执行的链式效果列表
- [ ] 同层内按 priority 排序
- [ ] 单元测试：纯 base、base+enhance、三层叠加、拦截终止、链式触发

**技术说明:**
- 新增: `systems/modifiers/EffectPipeline.ts`

### Story 11.3: 条件系统

**描述:** 实现 ConditionEvaluator，支持中等复杂度的条件原语，每个修饰器最多一个条件。

**验收标准:**
- [ ] 战斗状态条件: combo_gte, combo_lte, no_errors, random(probability)
- [ ] 位置条件: adjacent_skills_gte(n), adjacent_empty_gte(n), adjacent_has_type(skillType)
- [ ] 词语条件: word_length_gte(n), word_length_lte(n), word_has_letter(key)
- [ ] 上下文条件: skills_triggered_this_word(n), nth_word(n)
- [ ] ConditionEvaluator.evaluate(condition, context) → boolean
- [ ] 无条件的修饰器始终生效
- [ ] 单元测试覆盖所有条件类型

**技术说明:**
- 新增: `systems/modifiers/ConditionEvaluator.ts`

### Story 11.4: 行为修饰器框架

**描述:** 实现拦截型（Interceptor）和触发型（Reactor）行为修饰器，支持 shield 保护连击、echo 双触发等非数值效果。

**验收标准:**
- [ ] 拦截型: phase=before，可阻止事件默认效果（如 shield 阻止连击中断）
- [ ] 触发型: phase=after，事件后触发额外行为（如 echo 触发下一个技能两次）
- [ ] 链式触发深度上限（防死循环），建议 max_depth=3
- [ ] BehaviorExecutor 执行行为队列
- [ ] 单元测试：拦截成功/失败、链式触发、深度限制

**技术说明:**
- 新增: `systems/modifiers/BehaviorExecutor.ts`

### Story 11.5: 现有技能迁移

**描述:** 将当前所有技能从 skills.ts 的 switch/case 硬编码迁移到 Modifier 注册式。每个技能绑定时注册对应的 Modifier，解绑时移除。

**验收标准:**
- [ ] 所有现有技能（score/multiply/time/protect/core/aura/lone/echo/void/ripple）改为 Modifier 表达
- [ ] 技能 triggerSkill() 改为调用 EffectPipeline.resolve()
- [ ] bindSkill() 注册 Modifier，unbindSkill() 移除
- [ ] 现有全部技能相关测试通过，行为不变
- [ ] 删除 skills.ts 中的 switch/case 分支

**技术说明:**
- 修改: `systems/skills.ts`, `data/skills.ts`
- 每个技能的 Modifier 定义放在 `data/skills.ts` 中

### Story 11.6: 现有遗物迁移

**描述:** 将当前所有遗物从 RelicEffects.ts 的硬编码检查迁移到 Modifier 注册式。遗物获取时注册 global 层 Modifier。

**验收标准:**
- [ ] 所有现有遗物改为 Modifier 表达（global 层）
- [ ] 遗物效果通过 EffectPipeline 统一计算，不再硬编码检查 hasRelic()
- [ ] acquireRelic() 注册 Modifier
- [ ] 现有全部遗物相关测试通过，行为不变
- [ ] 删除 RelicEffects.ts 中的硬编码条件分支

**技术说明:**
- 修改: `systems/relics/RelicEffects.ts`, `data/relics.ts`
- 每个遗物的 Modifier 定义放在 `data/relics.ts` 中

---

## Epic 12: 技能池扩充

**目标:** 将技能从 10 个扩充到 18 个，建立 5 大流派身份感（爆发/倍率/续航/连锁/被动），重设计现有联动技能以匹配"被动=键盘互动，主动=技能互动"的设计原则。

**依赖:** Epic 11 (需要 Modifier 管道)

**架构参考:** `data/skills.ts`, `systems/modifiers/`

**设计参考:** `docs/brainstorming-skills-relics-refactor-2026-02-20.md` 方向 B

### Story 12.1: 爆发流与倍率流技能

**描述:** 实现爆发流 4 技能（burst/lone/void/gamble）和倍率流 3 技能（amp/chain/overclock），通过 Modifier 注册。

**验收标准:**
- [ ] burst: base 层 +5 分（替代原 spark/burst/star 三级，统一为一个可升级技能）
- [ ] lone: base 层 +8 分，条件 skills_triggered_this_word = 0
- [ ] void: base 层 +12 分，减去本词其他触发数
- [ ] gamble: base 层 random(0.5) 条件下 +15 分
- [ ] amp: base 层 +0.2 倍率
- [ ] chain: base 层 +0.1 倍率，条件：连续不同技能触发
- [ ] overclock: enhance 层 ×1.5，条件：本词第 3+ 个技能触发
- [ ] 所有技能有 Modifier 定义、数据条目、单元测试

**技术说明:**
- 修改: `data/skills.ts`, `core/types.ts`（新技能 ID）

### Story 12.2: 续航流与连锁流技能

**描述:** 实现续航流 4 技能（freeze/shield/pulse/sentinel）和连锁流 4 技能（echo/ripple/mirror/leech），重设计 echo/ripple/mirror 匹配新设计原则。

**验收标准:**
- [ ] freeze: base 层 +2 秒
- [ ] shield: before 层拦截器，打错时消耗 1 次盾保护连击
- [ ] pulse: 行为型，触发计数器每满 3 次 +1 秒
- [ ] sentinel: after 层触发器，每完成一个词恢复 1 次盾
- [ ] echo: after 层触发器，设置"下一个非 echo 技能触发两次"标记
- [ ] ripple: after 层触发器，设置"下一个非 ripple 技能效果传递给再下一个"标记
- [ ] mirror: **被动**技能，after 层，同行最左技能触发时→触发最右技能
- [ ] leech: base 层 +N 分（N = 本词已触发技能数）
- [ ] echo/ripple 标记系统有反循环保护
- [ ] 所有技能有 Modifier 定义、数据条目、单元测试

**技术说明:**
- 修改: `data/skills.ts`, `systems/modifiers/BehaviorExecutor.ts`

### Story 12.3: 被动流技能

**描述:** 实现/重设计被动流 3 技能（core/aura/anchor），遵循"被动=键盘空间互动"原则。

**验收标准:**
- [ ] core: enhance 层，相邻技能每触发 3 次 → 本词倍率 +0.1
- [ ] aura: enhance 层，相邻分数技能效果 ×1.5
- [ ] anchor: enhance 层，同行所有技能 ×1.15
- [ ] 被动技能不占触发次数（不算"本词触发数"）
- [ ] 所有技能有 Modifier 定义、数据条目、单元测试

**技术说明:**
- 修改: `data/skills.ts`

### Story 12.4: 技能 UI 与商店更新

**描述:** 更新技能相关 UI：商店技能池扩大为 18 个、技能描述更新、流派标签显示。

**验收标准:**
- [ ] 商店技能选择从 10 扩展到 18 个
- [ ] 技能描述文案更新（反映新效果）
- [ ] 技能卡片显示流派标签（爆发/倍率/续航/连锁/被动）
- [ ] 移除旧技能 ID（spark/star/surge/clock 等被替换的）
- [ ] 所有 UI 测试通过

**技术说明:**
- 修改: `systems/shop.ts`, UI 组件

---

## Epic 13: 遗物系统重做

**目标:** 用构筑催化剂和风险回报交易替换现有平淡的数值遗物，让遗物真正改变玩家打法而非只放大数字。

**依赖:** Epic 11 (Modifier 管道), Epic 12 (新技能池)

**架构参考:** `data/relics.ts`, `systems/relics/`

**设计参考:** `docs/brainstorming-skills-relics-refactor-2026-02-20.md` 方向 C

### Story 13.1: 构筑催化剂遗物

**描述:** 实现 6 个构筑催化剂遗物，每个强化特定流派并推动 all-in 构筑决策。

**验收标准:**
- [ ] 虚空之心: global 层，每个空键位 +3 底分（极简/lone/void 流）
- [ ] 连锁放大器: global 层，echo/ripple 互动效果额外触发一次（连锁流）
- [ ] 铁壁: global 层，shield 容量 +2，sentinel 每词回盾 +1（续航流）
- [ ] 被动大师: global 层，被动技能 enhance 层效果翻倍（被动流）
- [ ] 键盘风暴: global 层，技能数 ≥12 时所有技能底分 +2（填满键盘流）
- [ ] 赌徒信条: global 层，gamble 100% 成功（爆发/赌博流）
- [ ] 所有遗物通过 Modifier 注册，有单元测试
- [ ] 替换现有弱设计遗物

**技术说明:**
- 修改: `data/relics.ts`, `systems/relics/RelicTypes.ts`

### Story 13.2: 风险回报遗物

**描述:** 实现 5 个风险回报遗物，每个提供强大能力但附带代价。

**验收标准:**
- [ ] 玻璃大炮: global 层 ×2 分数 + before 层打错即失败
- [ ] 时间窃贼: after 层每次技能触发 +0.3 秒 + 基础时间减半
- [ ] 贪婪之手: global 层金币 ×1.5 + 商店价格 +50%
- [ ] 沉默誓约: global 层无技能时裸打 ×5 + 无法装备技能
- [ ] 末日倒计时: 每关 +30 秒 + 每过一关基础时间 -5 秒
- [ ] 每个遗物注册增益+代价两个 Modifier
- [ ] 所有遗物有单元测试
- [ ] 商店中风险回报遗物有醒目的视觉区分

**技术说明:**
- 修改: `data/relics.ts`, `systems/relics/RelicTypes.ts`

---

## Epic 14: 字母升级与词语联动

**目标:** 增加字母升级系统和词语条件扩展，让选词决策从"含不含技能字母"扩展到"这个词的特征适不适合我的构筑"。

**依赖:** Epic 11 (Modifier 管道 + 条件系统)

**架构参考:** `systems/modifiers/`, `data/words.ts`

**设计参考:** `docs/brainstorming-skills-relics-refactor-2026-02-20.md` 方向 D + E

### Story 14.1: 字母升级系统

**描述:** 实现字母升级机制：每个字母可从 Lv0 升到 Lv3，升级后该字母出现在词中时提供额外底分。

**验收标准:**
- [ ] 玩家状态新增 letterLevels: Map<string, number>（默认 Lv0）
- [ ] 字母升级 = base 层 Modifier，trigger=on_correct_keystroke，condition=key_is(letter)
- [ ] Lv1=+1, Lv2=+2, Lv3=+3 底分（每次该字母出现在词中时）
- [ ] upgradeLetter(key) 方法，最高 Lv3
- [ ] 键盘可视化显示字母等级
- [ ] 单元测试

**技术说明:**
- 修改: `core/types.ts`（PlayerState 新增 letterLevels）
- 新增: 字母升级 Modifier 注册逻辑

### Story 14.2: 字母升级商店与来源

**描述:** 在商店中增加字母升级购买入口，并实现其他升级来源。

**验收标准:**
- [ ] 商店新增"字母升级"区域，显示当前等级和升级价格
- [ ] 升级价格递增（Lv1=10, Lv2=20, Lv3=35 金币，待平衡）
- [ ] 过关奖励：随机升级一个字母的选项
- [ ] 字母升级遗物接口预留（如"所有元音+1 级"）
- [ ] UI 测试

**技术说明:**
- 修改: `systems/shop.ts`, 商店 UI 组件

### Story 14.3: 词语条件扩展

**描述:** 扩展条件系统，加入运行时自动计算的词语特征条件，为技能和遗物提供更丰富的触发维度。

**验收标准:**
- [ ] word_has_double_letter: 词含重复字母（jazz, book, see）
- [ ] word_all_unique_letters: 词无重复字母（words, flame）
- [ ] word_vowel_ratio_gte(n): 元音占比 ≥ n%
- [ ] skill_density_gte(n): 技能键命中率 ≥ n%
- [ ] 所有条件为运行时计算，零数据维护
- [ ] 单元测试覆盖所有新条件
- [ ] 至少 1 个遗物/技能使用新条件作为示例

**技术说明:**
- 修改: `systems/modifiers/ConditionEvaluator.ts`

---

## Epic 15: 技能进化系统

**目标:** 为核心技能加进化分支（每技能 2 条路线），增加构筑深度和重玩价值。

**依赖:** Epic 12 (需要 18 技能基线)

**架构参考:** `data/skills.ts`, `systems/modifiers/`

**设计参考:** `docs/brainstorming-skills-relics-refactor-2026-02-20.md` 方向 B 二期

### Story 15.1: 进化分支数据设计

**描述:** 为核心技能设计进化分支，每个技能 2 条进化路线，进化后效果质变。

**验收标准:**
- [ ] 选取 6-8 个核心技能设计进化分支
- [ ] 每个进化分支有独立名称、效果描述、Modifier 定义
- [ ] 进化条件定义（技能等级达到阈值 + 消耗金币/资源）
- [ ] 设计文档记录所有进化分支

**技术说明:**
- 修改: `data/skills.ts`（新增进化数据结构）
- 修改: `core/types.ts`（SkillData 新增进化字段）

### Story 15.2: 进化 UI 与选择机制

**描述:** 实现技能进化的 UI 流程：达到条件后弹出进化选择，玩家二选一。

**验收标准:**
- [ ] 技能达到进化条件时提示
- [ ] 进化选择 UI：展示两条路线的效果对比
- [ ] 选择后技能外观和效果变化
- [ ] 进化不可逆（单局内）
- [ ] UI 和功能测试

**技术说明:**
- 新增: 进化选择 UI 组件
- 修改: `systems/shop.ts`（进化入口）

---

## Epic 依赖图

```
Epic 1-8: 基础系统 (done)
    ↓
Epic 9: 数值平衡 (done)
    ↓
Epic 10: 内容扩展 (in-progress)
    ↓
Epic 11: 效果管道统一 ←── 所有后续 Epic 的技术基础
    ↓
Epic 12: 技能池扩充 ──┐
    ↓                  ↓
Epic 13: 遗物系统重做 ─┤
                       ↓
Epic 14: 字母升级与词语联动
    ↓
Epic 15: 技能进化系统
```

**实施阶段:**
- 一期: Epic 11（效果管道）
- 二期: Epic 12 + 13（技能扩充 + 遗物重做，可并行）
- 三期: Epic 14（字母升级 + 词语联动）
- 四期: Epic 15（技能进化）

---

## Epic 21: 金币资源化

**目标:** 移除「剩余时间→金币」的默认转换，将金币纳入 ResourceType 资源体系，使其像 base/score/multiplier/time/shield 一样需要通过技能（产出者/转化者）生产。金币不再自动产生，玩家必须主动构筑金币产出链。

**依赖:** 当前系统（不阻塞 Epic 11-15，可独立实施）

**架构参考:** `core/types.ts`, `data/producers.ts`, `data/converters.ts`, `systems/skills.ts`, `systems/shop.ts`, `systems/battle.ts`

**设计动机:**
- 当前金币主要来源是「基础金币 + 剩余时间」，玩家无需做任何构筑决策即可稳定获得金币
- 将金币变为需要技能生产的资源后，玩家面临「投资金币产出 vs 投资分数产出」的核心 trade-off
- 与现有 5 资源体系完全一致的结构（产出者 add/multiply + 转化者 add/multiply），零特殊逻辑

### Story 21.1: 金币加入资源类型

**描述:** 将 gold 纳入 ResourceType 和 ResourceState，战斗中作为第 6 种资源参与技能系统。战斗结束时 resources.gold 累加到 state.gold。

**验收标准:**
- [ ] `ResourceType` 新增 `'gold'`：`'base' | 'score' | 'multiplier' | 'time' | 'shield' | 'gold'`
- [ ] `ResourceState` 新增 `gold: number`（每关初始 0，不跨词重置）
- [ ] `RESOURCE_LABELS` / `RESOURCE_ICONS` / `RESOURCE_COLORS` 新增 gold 条目（标签 `金币`，图标 `🪙`，颜色 `#ffd700`）
- [ ] `resetResources()` 中 gold **不重置**（金币跨词累加，仅在战斗开始时清零）
- [ ] `setWord()` 不重置 `resources.gold`
- [ ] 战斗结束时（`openShop()`），`state.gold += Math.floor(state.resources.gold)` 替换原有的 `baseGold + timeBonus` 公式
- [ ] `state.resources.gold` 在战斗开始时清零
- [ ] 构建通过，现有测试通过

**技术说明:**
- 修改: `core/types.ts`, `core/constants.ts`, `core/state.ts`, `systems/battle.ts`, `systems/shop.ts`

### Story 21.2: 金币产出者技能

**描述:** 新增 2 个金币产出者（add + multiply），结构与现有 10 个产出者完全一致。

**验收标准:**
- [ ] `prod_mint`（铸币）：gold add，values `[3, 5, 8]`，每次触发直接 +N 金币
- [ ] `prod_treasury`（金库）：gold multiply，values `[1.3, 1.5, 1.8]`，累积金币 ×N
- [ ] 在 `PRODUCERS` 中注册，`isProducer()` / `getProducerValue()` / `getProducerDesc()` 自动适配
- [ ] `triggerProducer` / `triggerProducerWithReduction` 的 gold 分支：直接操作 `state.resources.gold`（与 time/shield 处理方式相同，不走 synergy 累加器）
- [ ] 战后统计中金币产出正确记录（`recordSkillTrigger` 支持 gold 资源）
- [ ] 商店中可出现金币产出者，Act 权重同其他产出者

**技术说明:**
- 修改: `data/producers.ts`, `systems/skills.ts`（triggerProducer 的 add/multiply 分支需处理 gold）

### Story 21.3: 金币转化者技能

**描述:** 新增 10 个金币相关转化者（gold 作为源 → 4 目标 × 2 公式 = 8 个，+ 2 个其他资源 → gold），结构与现有 40 个转化者完全一致。

**验收标准:**
- [ ] **金币为源（8 个）**：gold → base/score/multiplier/time × add/multiply
  - 命名参考：`conv_gold_base_add`（收购）、`conv_gold_score_add`（贿赂）、`conv_gold_mult_add`（雇佣）、`conv_gold_time_add`（赎买）等
  - k 值基于 gold mid ~15 调参
- [ ] **其他资源 → 金币（2 个，优先级最高的转换路径）**：
  - `conv_score_gold_add`：分数→金币 add，k 值基于 score mid ~1000
  - `conv_time_gold_add`：时间→金币 add，k 值基于 time mid ~40
- [ ] 在 `CONVERTERS` 中注册，所有工具函数自动适配
- [ ] `triggerConverter` / `triggerConverterWithReduction` 的 gold target 分支：直接操作 `state.resources.gold`
- [ ] `getSourceValue` 支持 gold 源：直接返回 `resources.gold`
- [ ] `drawConverterPool` 池中包含金币转化者
- [ ] 战后统计中金币转化正确记录

**技术说明:**
- 修改: `data/converters.ts`, `systems/skills.ts`

### Story 21.4: 移除默认金币产出

**描述:** 移除战斗结束时的「基础金币 + 剩余时间→金币」自动转换，金币完全由技能产出。调整初始金币和商店价格以平衡经济。

**验收标准:**
- [ ] `openShop()` 中移除 `baseGold`（20/40）和 `timeBonus`（Math.floor(state.time)）
- [ ] 战后金币 = `Math.floor(state.resources.gold)` + 遗物金币加成
- [ ] 战后结算 UI 简化：移除「基础金币」「时间奖励」行，改为显示「战斗产出」
- [ ] 初始金币从 30 调整为 50（补偿早期无金币技能时的冷启动）
- [ ] 第一关商店保底出现至少 1 个金币类技能（产出者或转化者）
- [ ] 休息事件中的固定金币奖励不变（altar_gold +200 等保留作为保底收入）
- [ ] 遗物金币加成（贪婪之手 ×1.5、超杀之刃 overkill→gold）改为作用于 `resources.gold` 或保持战后倍率

**技术说明:**
- 修改: `systems/shop.ts`（openShop 金币计算）, `systems/battle.ts`（结算 UI）, `main.ts`（初始金币）
- 修改: `data/relics.ts`（金币相关遗物适配）

### Story 21.5: 结算与统计适配

**描述:** 战斗中不显示金币 HUD（金币在每关结算界面统一展示）。键盘 tooltip 和热力图支持金币资源维度。

**验收标准:**
- [ ] 战斗 HUD **不**新增金币显示，金币仅在结算界面可见
- [ ] 结算界面显示本关金币产出明细（技能产出 + 遗物加成）
- [ ] 键盘 tooltip 中金币产出/转化信息正确显示
- [ ] 战后热力图统计支持 gold 资源维度

**技术说明:**
- 修改: `systems/battle.ts`（结算 UI）, `systems/shop.ts`（热力图/tooltip）

### Story 21.6: 金币连接者适配

**描述:** 确保连接者系统兼容 gold 资源类型，资源触发器（on_resource_threshold）支持 gold。

**验收标准:**
- [ ] `ResourceTriggerDefinition` 的 resource 字段接受 `'gold'`
- [ ] 金币达到阈值时可触发连接者链
- [ ] 现有连接者池中可出现以 gold 为触发资源的连接者
- [ ] 测试覆盖金币触发路径

**技术说明:**
- 修改: `data/connectors.ts`, `systems/skills.ts`（checkResourceTriggers）

## Files Modified Summary (Epic 21)

| File | Stories |
|------|---------|
| `core/types.ts` | 21.1 |
| `core/constants.ts` | 21.1 |
| `core/state.ts` | 21.1 |
| `data/producers.ts` | 21.2 |
| `data/converters.ts` | 21.3 |
| `data/connectors.ts` | 21.6 |
| `systems/skills.ts` | 21.2, 21.3, 21.6 |
| `systems/battle.ts` | 21.1, 21.4, 21.5 |
| `systems/shop.ts` | 21.1, 21.4, 21.5 |
| `main.ts` | 21.4 |
| `data/relics.ts` | 21.4 |

---

## Epic 22: 词语牌包系统

**目标:** 用「牌包」替换商店中单独出售的词语。每个牌包由一个筛选条件定义，包含 3 个满足条件的词，玩家可从中选任意个加入词库。条件尽可能复用已有词池分类（tier/highlight/长度），使选词成为有意义的构筑决策。

**依赖:** 当前系统（独立，可随时实施）

**架构参考:** `data/words.ts`（WORD_POOL、generateShopWords）, `systems/shop.ts`（商品生成/购买流程）, `core/types.ts`（ShopItem）

**设计动机:**
- 当前商店单词逐个售卖，选择缺乏策略感——玩家随意买最便宜的词填充词库
- 牌包将选词变为构筑决策：「买这包首字母 E 的词来提升 E 键频率？还是买短词包提高打字速度？」
- 一包 3 词自选的机制让玩家在同一条件下仍有细粒度控制

### Story 22.1: 牌包条件定义与数据结构

**描述:** 定义牌包条件类型（PackCondition）和牌包数据结构（WordPack），实现从条件到候选词的筛选逻辑。

**验收标准:**
- [ ] `PackCondition` 类型定义，支持以下条件：
  - `starts_with(letter)` — 首字母为指定字母
  - `ends_with(letter)` — 尾字母为指定字母
  - `contains(letter)` — 包含指定字母
  - `contains_owned` — 包含玩家已有高频字母（频率≥5 的字母）
  - `contains_unowned` — 包含玩家低频字母（频率<5），帮助解锁新键位
  - `short` — 短词（2-4 字母），复用 WORD_POOL.short
  - `long` — 长词（7+ 字母），复用 WORD_POOL.long
  - `special` — 特殊主题词，复用 WORD_POOL.special
  - `high_freq(letter)` — 复用 WORD_POOL 中 highlight 为该字母的词池
- [ ] `WordPack` 接口：`{ condition: PackCondition, name: string, desc: string, words: string[], cost: number }`
- [ ] `filterWordsByCondition(condition, allPools, ownedWords, playerFreqs)` 返回满足条件且未拥有的候选词列表
- [ ] 单元测试覆盖每种条件类型

**技术说明:**
- 新增: `data/wordPacks.ts`（条件定义 + 筛选逻辑）
- 复用: `data/words.ts` 的 WORD_POOL 数据

### Story 22.2: 牌包生成策略

**描述:** 实现商店中牌包的随机生成逻辑，每个牌包从候选条件中随机选取，抽 3 个满足条件的词。

**验收标准:**
- [ ] `generateWordPacks(ownedWords, playerFreqs, count)` 生成指定数量的牌包
- [ ] 每包从候选条件池中随机选取一个条件
- [ ] 条件池权重：与玩家当前绑定技能的键位相关条件更容易出现（如玩家绑了 E 键技能，`high_freq('e')` / `starts_with('e')` 权重更高）
- [ ] 每包从满足条件的候选词中随机抽 3 个（不含已拥有词）
- [ ] 若某条件候选词不足 3 个，跳过该条件选其他
- [ ] 同一商店中不重复相同条件的牌包
- [ ] 牌包定价：基于条件类型和词的平均长度（short 包便宜，long/special 包贵）

**技术说明:**
- 修改: `data/wordPacks.ts`

### Story 22.3: 商店牌包 UI

**描述:** 替换商店中单词商品的展示为牌包卡片，支持展开查看 3 个词并勾选要加入词库的词。

**验收标准:**
- [ ] 商店商品卡片新增 `type: 'pack'` 类型，替换原有 `type: 'word'`
- [ ] 牌包卡片展示：条件名称（如「首字母 E」「短词」）、条件图标、价格、3 个词预览
- [ ] 点击牌包展开详情：显示 3 个词，每个词旁有勾选框，默认全选
- [ ] 词语高亮已绑定技能的字母（复用现有 `bound-letter` 样式）
- [ ] 每个词旁显示词长和涉及的键位频率变化预览
- [ ] 确认购买按钮：将勾选的词加入 `wordDeck`，至少选 1 个才能购买
- [ ] 购买后牌包从商店移除
- [ ] 牌包支持锁定/解锁（刷新时保留）

**技术说明:**
- 修改: `core/types.ts`（ShopItem 新增 pack 相关字段）
- 修改: `systems/shop.ts`（生成/渲染/购买流程）
- 修改: `style.css`（牌包卡片样式）

### Story 22.4: 移除单词直售 & 商品保底

**描述:** 移除商店中单独售卖词语的逻辑，统一改为牌包。调整商店商品保底规则。

**验收标准:**
- [ ] `generateShopItems` 不再生成 `type: 'word'` 商品
- [ ] 商店 5 个商品槽位：保底 ≥1 技能 + ≥1 牌包，其余随机
- [ ] 删除 `generateShopWords()` 函数或标记废弃
- [ ] 原有词语删除功能保留（在词库标签页中删词仍然可用）
- [ ] 原有词语购买相关的 UI 代码清理

**技术说明:**
- 修改: `systems/shop.ts`, `data/words.ts`

### Story 22.5: 牌包条件与构筑联动

**描述:** 让牌包条件感知玩家构筑状态，提供更有针对性的选择。

**验收标准:**
- [ ] `contains_owned` 条件：筛选包含玩家频率≥5 字母的词，强化已有键位
- [ ] `contains_unowned` 条件：筛选包含玩家频率<5 字母的词，帮助解锁新键位
- [ ] 商店中若玩家有绑定技能但对应键位频率偏低（5-8），更可能出现该键位的 `high_freq` 牌包
- [ ] 牌包描述中提示频率变化（如「+3 E频率」）
- [ ] Act 1 优先出现 `short` 和 `contains_owned` 包（新手友好），Act 3 出现更多 `long` 和 `special` 包

**技术说明:**
- 修改: `data/wordPacks.ts`（权重策略）, `systems/shop.ts`（Act 感知）

## Files Modified Summary (Epic 22)

| File | Stories |
|------|---------|
| `data/wordPacks.ts` (new) | 22.1, 22.2, 22.5 |
| `data/words.ts` | 22.4 |
| `core/types.ts` | 22.3 |
| `systems/shop.ts` | 22.3, 22.4, 22.5 |
| `style.css` | 22.3 |

---

## Epic 23: 增幅者技能类型

**目标:** 新增第四种技能类型「增幅者」，按键叠层 buff 范围内产出者/转化者的面板值。层数关内跨词累积，过关归零。实现关内「冷启动→引擎轰鸣」的滚雪球节奏。

**依赖:** Epic 19（技能体系重构）

**架构参考:** `core/types.ts`, `data/producers.ts`（结构参考）, `systems/skills.ts`, `systems/battle.ts`

**设计参考:** `docs/brainstorming-session-2026-03-05.md` Section E+

**设计动机:**
- 连接者管触发频率，增幅者管数值倍率 — 两种辅助维度正交互补
- 增幅者占键位但不产出资源，纯辅助定位，创造「投资 buff vs 直接产出」的决策张力
- 关内叠层实现滚雪球手感：前期冷机 → 中期升温 → 后期过热爆发

### Story 23.1: 增幅者数据结构与类型定义

**描述:** 定义增幅者技能类型、数据接口和基础常量。

**验收标准:**
- [ ] `SkillCategory` 新增 `'amplifier'` 类别（与 producer/converter/connector 并列）
- [ ] `AmplifierDefinition` 接口：`{ id, name, icon, resource: ResourceType, positionRelation: PositionRelation, operator: 'add' | 'multiply', valuePerStack: number, desc }`
- [ ] `AmplifierState` 接口：`{ stacks: number }`（存储在 BattleState，过关清零）
- [ ] `isAmplifier()` / `getAmplifierDef()` 工具函数
- [ ] 类型定义和工具函数测试通过

**技术说明:**
- 修改: `core/types.ts`
- 新增: `data/amplifiers.ts`

### Story 23.2: 首批增幅者技能数据

**描述:** 设计并实现首批增幅者技能，覆盖关键的资源×位置×运算符组合。

**验收标准:**
- [ ] 首批 6-8 个增幅者，覆盖不同资源和位置关系组合
- [ ] 加法增幅者示例：base 加法·相邻（每层让相邻产出者 base +1）
- [ ] 乘法增幅者示例：base 乘法·相邻（每层让相邻产出者 base ×5%）
- [ ] 每个增幅者有名称、图标、描述
- [ ] 在 `AMPLIFIERS` 常量中注册
- [ ] 数据定义无逻辑依赖，纯数据

**技术说明:**
- 修改: `data/amplifiers.ts`

### Story 23.3: 增幅者触发与叠层机制

**描述:** 实现增幅者的按键触发和叠层累积逻辑。

**验收标准:**
- [ ] 增幅者绑定在键位上，按到该键时 stacks +1
- [ ] 叠层存储在 BattleState，跨词保持
- [ ] `triggerAmplifier(ampId, triggerKey)` 函数：增加 stacks，播放叠层反馈
- [ ] 叠层变化时更新 HUD 显示（键盘上显示当前层数）
- [ ] 过关时（`resetBattleState`）清零所有增幅者 stacks
- [ ] 增幅者触发不产出任何资源（纯辅助）

**技术说明:**
- 修改: `systems/skills.ts`, `systems/battle.ts`（BattleState 扩展）

### Story 23.4: 增幅效果应用

**描述:** 实现增幅者对范围内产出者/转化者的面板增幅计算。

**验收标准:**
- [ ] `getAmplifierBonus(skillId, triggerKey)` 返回该技能从所有增幅者获得的总加成
- [ ] 加法增幅：范围内增幅者 stacks × valuePerStack 加到技能产出
- [ ] 乘法增幅：范围内增幅者 stacks × valuePerStack 乘到技能产出
- [ ] 仅增幅产出者和转化者，不增幅连接者和其他增幅者
- [ ] 多个增幅者可同时作用于同一技能（效果叠加）
- [ ] 在 `triggerProducer` / `triggerConverter` 中集成增幅计算
- [ ] 单元测试：无增幅、单增幅、多增幅叠加

**技术说明:**
- 修改: `systems/skills.ts`

### Story 23.5: 增幅者商店与 UI

**描述:** 增幅者加入商店技能池，实现购买/绑定/键盘显示。

**验收标准:**
- [ ] 商店技能池包含增幅者，和产出者/转化者/连接者同池出现
- [ ] 增幅者技能卡片有独特视觉区分（如边框颜色、类型标签「增幅」）
- [ ] 绑定增幅者到键位后，键盘可视化显示增幅者图标 + 当前层数
- [ ] 增幅者 tooltip 显示：效果描述、当前层数、影响范围内的技能列表
- [ ] 战后统计中增幅者贡献正确记录

**技术说明:**
- 修改: `systems/shop.ts`, `systems/battle.ts`（键盘可视化）

### Story 23.6: 增幅者附魔适配

**描述:** 确保增幅者可被附魔系统附魔，所有附魔类型对增幅者生效。

**验收标准:**
- [ ] 增幅者 Lv3 时触发附魔选择（复用现有 `checkAutoEnchantment` 流程）
- [ ] 空间·成长附魔对增幅者：范围内技能触发时，增幅者每层效果永久 +X%
- [ ] 空间·共鸣附魔对增幅者：范围内技能触发时自动叠层（不用按键）
- [ ] 空间·溅射附魔对增幅者：按增幅者键时以减效触发范围内技能
- [ ] 变性附魔对增幅者：额外增幅对应资源（不产出，增幅第二种资源）
- [ ] 独立·吞噬附魔对增幅者：可吞噬相邻图标数少于自己的技能
- [ ] 附魔效果测试覆盖

**技术说明:**
- 修改: `systems/skills.ts`（附魔计算适配增幅者）

## Files Modified Summary (Epic 23)

| File | Stories |
|------|---------|
| `core/types.ts` | 23.1 |
| `data/amplifiers.ts` (new) | 23.1, 23.2 |
| `systems/skills.ts` | 23.3, 23.4, 23.6 |
| `systems/battle.ts` | 23.3, 23.5 |
| `systems/shop.ts` | 23.5 |

---

## Epic 24: 成长附魔与附魔重构

**目标:** 移除空间·增幅附魔（6 个），替换为空间·成长附魔（6 个），新增独立·精通和独立·吞噬。成长附魔提供跨关（RunState）永久数值成长，线性无上限，是无尽模式中 build 对抗难度攀升的核心解答。

**依赖:** Epic 19（技能体系重构，附魔系统已存在）

**架构参考:** `data/enchantments.ts`, `systems/skills.ts`（getEnchantmentMultiplier）, `core/types.ts`

**设计参考:** `docs/brainstorming-session-2026-03-05.md` Section F+

**设计动机:**
- 增幅附魔是静态布局加成（放了就有），成长附魔是动态使用加成（用得多才涨）— 后者更有趣
- 成长值跨关保持（RunState），和增幅者的关内叠层（BattleState）形成双层成长体系
- 吞噬附魔创造极简大师流：吃光相邻技能，最终一个超强技能 + 排斥加成空位

### Story 24.1: 成长值状态存储

**描述:** 在 RunState 中新增成长值存储结构，支持跨关保持、新 Run 重置。

**验收标准:**
- [ ] `RunState` 新增 `growthValues: Map<string, number>`（skillId → 累积成长百分比）
- [ ] `RunState` 新增 `devourIcons: Map<string, string[]>`（skillId → 吞噬获得的图标列表）
- [ ] 新 Run 开始时清零
- [ ] 存档/读档支持（Map 序列化）
- [ ] 类型定义和序列化测试通过

**技术说明:**
- 修改: `core/types.ts`, `core/state.ts`

### Story 24.2: 移除增幅附魔，新增成长附魔数据

**描述:** 从附魔池中移除 6 个空间·增幅附魔，替换为 6 个空间·成长附魔，新增独立·精通和独立·吞噬。

**验收标准:**
- [ ] `EnchantmentCategory` 新增 `'growth'`
- [ ] 移除 6 个 `ench_amplify_*` 附魔定义
- [ ] 新增 6 个空间·成长附魔：

| ID | 名称 | 位置关系 | 条件 | 每次成长 |
|---|---|---|---|---|
| `ench_growth_adjacent` | 汲取 | 相邻 | 相邻技能触发 | +3% |
| `ench_growth_sameRow` | 感染 | 同行 | 同行技能触发 | +2% |
| `ench_growth_sameColumn` | 脉冲 | 同列 | 同列技能触发 | +4% |
| `ench_growth_sameHand` | 渗透 | 同手 | 同手技能触发 | +1% |
| `ench_growth_sameFinger` | 贯通 | 同指 | 同指技能触发 | +5% |
| `ench_growth_symmetric` | 共振 | 对称 | 对称位技能触发 | +6% |

- [ ] 新增独立·精通：`ench_mastery`，每触发 10 次 +5%，线性无上限
- [ ] 新增独立·吞噬：`ench_devour`，战斗中触发 N 次后自动吞噬相邻图标数少于自己的技能，每图标 +20%
- [ ] 总附魔数从 33 变为 35
- [ ] 所有附魔有名称、图标、描述

**技术说明:**
- 修改: `data/enchantments.ts`

### Story 24.3: 空间·成长附魔触发逻辑

**描述:** 实现成长附魔的触发和累积计算。

**验收标准:**
- [ ] 当范围内技能触发时，检查该范围内是否有带成长附魔的技能
- [ ] 满足位置关系时，`growthValues[skillId] += enchantment.effectValue`
- [ ] 成长值作为额外乘算应用到技能产出：`finalValue = baseValue * (1 + growthValues[skillId])`
- [ ] 成长值跨关保持（RunState），过关不清零
- [ ] 线性无上限
- [ ] 战后统计中显示各技能成长值
- [ ] 单元测试：成长累积、跨关保持、产出计算

**技术说明:**
- 修改: `systems/skills.ts`（触发逻辑 + 产出计算）

### Story 24.4: 独立·精通附魔逻辑

**描述:** 实现精通附魔的触发计数和成长。

**验收标准:**
- [ ] 跟踪每个精通附魔技能的触发次数（RunState 内）
- [ ] 每触发 10 次，`growthValues[skillId] += 0.05`（+5%）
- [ ] 触发计数跨关保持
- [ ] 成长值应用到技能产出（复用 Story 24.3 的计算路径）
- [ ] 单元测试

**技术说明:**
- 修改: `systems/skills.ts`

### Story 24.5: 独立·吞噬附魔逻辑

**描述:** 实现吞噬附魔的图标计数、吞噬条件判断和执行。

**验收标准:**
- [ ] 图标计数规则：技能本身 = 1 图标，附魔 = +1 图标，每吞一个 = +1 图标
- [ ] 吞噬条件：战斗中触发 N 次后，自动检查相邻技能图标数是否少于自己
- [ ] 吞噬执行：被吞技能从键位解绑，其图标加入吞噬者的 `devourIcons` 列表
- [ ] 增幅计算：每个图标 +20%（固定值），`finalValue = baseValue * (1 + iconCount * 0.2)`
- [ ] 吞噬后的图标在键盘可视化中显示（技能图标前显示吞噬来的图标）
- [ ] 不可反悔，被吞技能永久消失（本局内）
- [ ] 吞噬动画反馈
- [ ] 单元测试：图标计数、条件判断、吞噬执行、增幅计算

**技术说明:**
- 修改: `systems/skills.ts`, `systems/battle.ts`（键盘可视化）

### Story 24.6: 附魔 UI 适配

**描述:** 更新附魔选择 UI 和 tooltip 以支持成长/精通/吞噬的信息展示。

**验收标准:**
- [ ] 附魔选择弹窗中成长附魔有独特视觉标识（如成长图标、动态数值预览）
- [ ] 技能 tooltip 显示当前成长百分比（如「成长: +45%」）
- [ ] 吞噬附魔 tooltip 显示图标数和已吞噬技能列表
- [ ] 精通附魔 tooltip 显示触发计数和下一里程碑进度
- [ ] 战后统计中各技能成长值和吞噬记录

**技术说明:**
- 修改: `systems/shop.ts`（附魔 UI）, `systems/battle.ts`（tooltip）

## Files Modified Summary (Epic 24)

| File | Stories |
|------|---------|
| `core/types.ts` | 24.1 |
| `core/state.ts` | 24.1 |
| `data/enchantments.ts` | 24.2 |
| `systems/skills.ts` | 24.3, 24.4, 24.5 |
| `systems/battle.ts` | 24.5, 24.6 |
| `systems/shop.ts` | 24.6 |

---

## Epic 25: 无尽模式

**目标:** 通关后进入无尽模式，循环递增周目。每周目分数目标 ×2、时间衰减、Boss 修饰器 3 选 1 叠加。配合排行榜和每日种子系统，让构筑有终极测试场。

**依赖:** Epic 18（Boss 战系统）, Epic 23（增幅者）, Epic 24（成长附魔）

**架构参考:** `systems/battle.ts`, `systems/shop.ts`, `core/types.ts`（RunState）

**设计参考:** `docs/brainstorming-session-2026-03-05.md` Section A+

**设计动机:**
- 解决核心体验问题：「爽不了多久就通关了」
- 循环递增（非线性无限）提供进度压缩感：「曾经觉得难的关现在碾过」
- 三维难度 vs 双层成长（成长附魔 + 增幅者）= 构筑极限探索
- 排行榜 + 每日种子 = 社交竞争和重玩动力

### Story 25.1: 周目状态与循环结构

**描述:** 实现周目（Cycle）状态管理和循环递增的关卡结构。

**验收标准:**
- [ ] `RunState` 新增 `cycle: number`（默认 1，通关后 +1）
- [ ] `RunState` 新增 `activeModifiers: string[]`（当前叠加的 Boss 修饰器列表）
- [ ] 通关（完成最后一关）后不结束 Run，而是进入下一周目
- [ ] 下一周目回到第 1 关，保留所有技能/附魔/成长值/金币
- [ ] 周目数显示在战斗 HUD 中
- [ ] 类型定义和状态管理测试通过

**技术说明:**
- 修改: `core/types.ts`, `core/state.ts`, `systems/battle.ts`

### Story 25.2: 三维难度缩放

**描述:** 实现每周目的分数目标翻倍和时间衰减。

**验收标准:**
- [ ] 分数目标：`baseTarget × (2 ^ (cycle - 1))`，每周目翻倍
- [ ] 时间衰减：`baseTime × (decayFactor ^ (cycle - 1))`，衰减系数可配置，无下限
- [ ] 衰减系数暂定 0.9，后续调参
- [ ] 战斗 HUD 中显示当前周目的目标分数和时间
- [ ] 难度曲线在 `calculateTargetScore` / `calculateTimeLimit` 中实现
- [ ] 单元测试：各周目数值正确

**技术说明:**
- 修改: `systems/battle.ts`（目标分数/时间计算）

### Story 25.3: Boss 修饰器 3 选 1 叠加

**描述:** 每进入新周目时，展示 3 个 Boss 修饰器让玩家选 1 个叠加，已有修饰器保留。

**验收标准:**
- [ ] 进入新周目前弹出修饰器选择 UI
- [ ] 从修饰器池中随机抽 3 个（排除已激活的）
- [ ] 玩家选择 1 个，加入 `activeModifiers`
- [ ] 所有已激活修饰器在整个周目内持续生效
- [ ] 修饰器效果叠加（多个修饰器同时作用）
- [ ] 选择 UI 展示每个修饰器的效果描述和当前已激活列表
- [ ] 战斗 HUD 中显示当前所有激活修饰器图标

**技术说明:**
- 修改: `systems/battle.ts`（修饰器选择流程）, `core/types.ts`
- 复用: 现有 Boss 修饰器数据和效果系统

### Story 25.4: 稀有货架商店

**描述:** 高周目解锁更稀有的商店商品，物价不变。

**验收标准:**
- [ ] 商店商品池根据周目数扩展：周目 2+ 解锁 Tier 2 商品，周目 4+ 解锁 Tier 3
- [ ] 稀有商品包括：高级技能、稀有附魔、特殊词包等（具体内容后续迭代）
- [ ] 物价体系不随周目变化
- [ ] 商店 UI 中稀有商品有视觉标识（如金色边框）
- [ ] 商品池扩展数据可配置

**技术说明:**
- 修改: `systems/shop.ts`（商品生成逻辑）

### Story 25.5: 排行榜系统

**描述:** 实现本地排行榜，记录最高周目数和分数。

**验收标准:**
- [ ] 排行榜数据结构：`{ cycle, lastStageScore, seed?, date, buildSummary }`
- [ ] 按最高周目数排序，同周目比末关分数
- [ ] 本地存储前 20 名记录（MetaState）
- [ ] Run 结束时（失败或主动退出）记录成绩
- [ ] 排行榜查看 UI（主菜单入口）
- [ ] 显示 build 摘要（核心技能/附魔）

**技术说明:**
- 修改: `core/types.ts`（MetaState 新增 leaderboard）, `core/state.ts`

### Story 25.6: 每日种子系统

**描述:** 实现每日种子模式，固定初始条件让所有玩家同一起跑线。

**验收标准:**
- [ ] 种子值由日期生成：`seed = dateString hashCode`
- [ ] 种子控制：初始词库选择、商店刷新序列、Boss 修饰器选项
- [ ] 每日种子模式入口（主菜单）
- [ ] 每日种子独立排行榜（与普通排行榜分开）
- [ ] 同一天同一种子，多次游玩初始条件一致
- [ ] 种子化随机数生成器（替换 Math.random）

**技术说明:**
- 新增: `core/seededRandom.ts`
- 修改: `systems/battle.ts`, `systems/shop.ts`（使用种子随机）

## Files Modified Summary (Epic 25)

| File | Stories |
|------|---------|
| `core/types.ts` | 25.1, 25.3, 25.5 |
| `core/state.ts` | 25.1, 25.5 |
| `core/seededRandom.ts` (new) | 25.6 |
| `systems/battle.ts` | 25.1, 25.2, 25.3, 25.6 |
| `systems/shop.ts` | 25.4, 25.6 |

---

## Epic 依赖图

```
Epic 1-8: 基础系统 (done)
    ↓
Epic 9: 数值平衡 (done)
    ↓
Epic 10: 内容扩展 (in-progress)
    ↓
Epic 11: 效果管道统一 ←── 所有后续 Epic 的技术基础
    ↓
Epic 12: 技能池扩充 ──┐
    ↓                  ↓
Epic 13: 遗物系统重做 ─┤
                       ↓
Epic 14: 字母升级与词语联动
    ↓
Epic 15: 技能进化系统

Epic 21: 金币资源化 ←── 独立，可随时实施
Epic 22: 词语牌包系统 ←── 独立，可随时实施

Epic 19 (done)
    ↓
Epic 23: 增幅者技能类型 ──┐
    ↓                      ↓
Epic 24: 成长附魔 ─────────┤
                            ↓
Epic 25: 无尽模式 ←── Epic 18 (done) + Epic 23 + Epic 24
```

**实施阶段:**
- 一期: Epic 11（效果管道）
- 二期: Epic 12 + 13（技能扩充 + 遗物重做，可并行）
- 三期: Epic 14（字母升级 + 词语联动）
- 四期: Epic 15（技能进化）
- 独立: Epic 21（金币资源化）、Epic 22（词语牌包）— 可随时实施
- 成长线: Epic 23（增幅者）→ Epic 24（成长附魔）→ Epic 25（无尽模式）

---

## 实现优先级

| 优先级 | Epic | 理由 |
|--------|------|------|
| P0 | Epic 1-3 | 核心系统基础 |
| P1 | Epic 4-5 | 可玩原型 |
| P2 | Epic 6-7 | 重玩价值 + 游戏感 |
| P3 | Epic 8 | 发布必需 |
| P1 | Epic 9 | 核心体验打磨 |
| P1 | Epic 10 | 内容丰富度 |
| P0 | Epic 11 | 技术基础（阻塞 12-15） |
| P1 | Epic 12-13 | 核心构筑深度 |
| P2 | Epic 14 | 系统深化 |
| P3 | Epic 15 | 重玩价值扩展 |
| P1 | Epic 17 | 商店系统重构 (done) |
| P1 | Epic 18 | Boss 战与 Act 结构 (done) |
| P0 | Epic 19 | 技能体系重构 (done) |
| P1 | Epic 20 | 词库管理 + 字频锁定 (done) |
| P1 | Epic 21 | 经济系统深化（独立可并行） |
| P1 | Epic 22 | 选词策略深化（独立可并行） |
| P1 | Epic 23 | 增幅者技能类型（成长线基础） |
| P1 | Epic 24 | 成长附魔（无尽模式基础） |
| P1 | Epic 25 | 无尽模式（终极内容） |

---

_Updated: 2026-03-05_
