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

---

_Updated: 2026-02-20_
