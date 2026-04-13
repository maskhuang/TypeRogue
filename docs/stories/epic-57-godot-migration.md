---
title: "Epic 57: Godot 迁移与美术重做"
epic_key: "epic-57"
status: "draft"
created: "2026-04-12"
stories:
  - "57-1-data-json-extraction"
  - "57-2-battle-flow-documentation"
  - "57-3-art-style-guide-p0-assets"
  - "57-4-godot-project-skeleton"
  - "57-5-keyboard-typing-loop"
  - "57-6-battle-minimum-loop"
  - "57-7-systems-migration"
  - "57-8-meta-systems-and-shipping"
---

# Epic 57: Godot 迁移与美术重做

## 背景

当前打字肉鸽的技术栈是 TypeScript + DOM/CSS（`style.css` 4839 行、`battle.ts` 2997 行），没有使用游戏引擎。这套栈在原型阶段帮我们快速验证了玩法，但已经触及天花板：

- **特效与动画上限**：浮字、粒子、屏幕震动都靠 CSS transition + RAF 拼，复杂场景下掉帧
- **桌面发行困难**：要上 Steam 必须套 Electron + Steam SDK 桥接，反而比直接 Godot 麻烦
- **美术风格不一致**：CSS 配色 + 多套字体 + emoji 图标，无法形成统一像素风
- **`battle.ts` 已成胶水**：50+ import，是子系统编排器而非独立逻辑（这一点决定了迁移策略）

借这次迁移同步完成**美术重做**：第一次像素美术尝试（Epic 55）是局部贴皮，这次从锚点定起。

## 设计目标

- **目标平台**：桌面（Windows / macOS / Linux），最终发布到 Steam，**不出 Web**
- **引擎语言**：Godot 4 + **C#**（强类型 IDE 重构能力，匹配现有 TS 心智）
- **美术方向**：全新像素风，不沿用现有 CSS 配色
- **逻辑分辨率**：640×360，整数缩放至 720p / 1080p / 1440p
- **字体策略**：Fusion Pixel 12px 单字体打天下（开源含 CJK）
- **零停机迁移**：TS 版本在迁移期间继续可发布，27.1 之后两端共享 data 层

## 迁移核心策略

**先周边，后中心。`battle.ts` 最后重写。** 它的 50+ import 表明它本身没多少独立逻辑，等周边模块迁完，它会自然瘦下来。

执行顺序按依赖：
```
57.1 data JSON 化（独立可发布）
   ↓
57.2 战斗事件流文档（纯文档）
   ↓
57.3 美术锚点 + P0 资产 ─┐
   ↓                     │ 并行
57.4 Godot 项目骨架 ─────┘
   ↓
57.5 键盘 + 输入闭环
   ↓
57.6 战斗最小闭环 ◆ 里程碑：Godot 端可玩
   ↓
57.7 系统逐项迁移（主要工作量）
   ↓
57.8 元系统 + 桌面发行
```

---

## Story 拆分

### Story 57-1: data/ JSON 化与 schema

**范围：** 将 `src/src/data/` 下所有声明式常量抽出为引擎无关的 JSON + zod schema，TS 端改为 import JSON，行为零差异。这是 Godot 端可以直接复用的事实来源。

**功能清单：**
- [ ] `tools/data-extract.ts` 脚本：import 每个 data 模块后 `JSON.stringify` 输出到 `src/data-json/`
- [ ] 覆盖文件：affixes / relics / skills / wordPacks / words / restEvents / bossModifiers / classes / tutorialSteps / keyboardTopology
- [ ] 每个 JSON 配套 zod schema，TS 类型从 schema 推导
- [ ] 混合文件拆分：`xxx.data.json` + `xxx.ts`（后者只留类型 / helper / 运行时函数）
- [ ] 运行时函数（affixMutation / affixTrigger / skillGeneration / bigramFrequency / patternFrequency）**不**进 data，留在 systems
- [ ] Snapshot 测试：固定种子跑 3 关，state 哈希与迁移前一致
- [ ] TS 版本继续可发布，零行为差异

**前置：** 无。这一步完全独立，可立即开始。

**新增/修改文件：**
- 新增：`tools/data-extract.ts`, `src/data-json/*.json`, `src/src/data/schemas/*.ts`
- 修改：`src/src/data/*.ts`（瘦身）

---

### Story 57-2: 战斗事件流与状态机文档化

**范围：** 在动 Godot 之前先为 `battle.ts` 画 4 张图，作为 Godot 端重写的需求文档，避免边写边发现 case 导致返工。

**功能清单：**
- [ ] **图 1** — 战斗生命周期状态机：`startBattle → spawnWord → typing → wordComplete/wordError → checkVictory → endBattle` 各状态、转移条件、副作用
- [ ] **图 2** — EventBus 事件清单：grep 全量 `eventBus.emit/on`，列出 event name + payload schema + 发送方 + 订阅方（直接对应 Godot signals 设计稿）
- [ ] **图 3** — 每词结算管线顺序图：relics → affixes → modifiers → skills → scoring 的实际调用顺序与可插入点（参考 `EffectPipeline`）
- [ ] **图 4** — 存档字段表：`state.ts` 持久化字段清单 + 类型 + 默认值，作为 Godot Resource 类的字段表
- [ ] 文档放 `docs/godot-migration/`，markdown + mermaid

**前置：** 57.1 完成后做，避免文档基于即将变化的代码。

**新增文件：**
- `docs/godot-migration/01-battle-state-machine.md`
- `docs/godot-migration/02-event-bus.md`
- `docs/godot-migration/03-resolution-pipeline.md`
- `docs/godot-migration/04-save-schema.md`

---

### Story 57-3: 美术风格指南与 P0 资产

**范围：** 一次性确定全部美术锚点并出 P0 最小资产包。第一周不画最终资产，先做 mood board + 锚点决策。

**功能清单：**
- [ ] `docs/art-style-guide.md`：6 项锚点定死
  - 分辨率 640×360
  - 键帽 32×32
  - 32 色调色板（从 Resurrect-64 选子集，覆盖 6 种稀有度）
  - Fusion Pixel 12px 字体
  - 全黑 1px 描边规则
  - 12fps 动画帧率
- [ ] Mood board：3 款风格参考（如 Loop Hero / Cobalt Core / StS 像素 mod），明确"我们更像哪个"
- [ ] **P0 资产清单**（Aseprite 源 + 导出 png + json）：
  - [ ] 26 键键帽 4 态（idle / pressed / matched / highlighted）
  - [ ] 玩家 HUD 框（血 / 计分 / 计时 / 技能槽）
  - [ ] 1 个敌人（idle 4 帧 / hit 2 帧 / death 6 帧）
  - [ ] 命中特效 3 种 spritesheet（普通 / 暴击 / 技能）
  - [ ] 1 张战斗背景
  - [ ] Fusion Pixel 12px 字体文件
- [ ] 所有资产遵循统一像素网格，整数缩放无糊边
- [ ] 字体在 1080p / 1440p 显示器实测中文可读（不行降级为方正像素 12 / Zfull-GB）

**前置：** 无。可与 57.4 并行。

**新增文件：**
- `docs/art-style-guide.md`
- `godot/assets/sprites/**`
- `godot/assets/fonts/**`
- Aseprite 源文件归档到 `art-source/`

---

### Story 57-4: Godot 项目骨架与数据接入

**范围：** 创建 Godot 4 项目（C#），搭建 autoload、目录结构、资源加载，把 57.1 的 JSON 接进来并能在 Godot 端访问。

**功能清单：**
- [ ] Godot 4.x 项目，C# 启用，目录结构：
  ```
  godot/
  ├── data/              # 从 src/data-json 复制
  ├── scripts/
  │   ├── core/          # GameState, EventBus, SaveSystem, AudioBus
  │   ├── systems/
  │   └── ui/
  ├── scenes/
  ├── assets/
  └── themes/
  ```
- [ ] Autoload：`GameState`、`EventBus`、`SaveSystem`、`AudioBus`
- [ ] `EventBus` 用 signals，事件名与 57.2 图 2 一一对应
- [ ] `DataLoader`：启动时加载 `data/*.json` 进强类型 C# 类（System.Text.Json）
- [ ] 单元测试：每个数据 JSON 加载零错误，条目数与 TS 端一致
- [ ] Theme 资源接入 Fusion Pixel 字体
- [ ] 窗口配置：1280×720，逻辑 viewport 640×360，整数缩放

**前置：** 57.1（data JSON 已就位）

**新增文件：**
- `godot/project.godot`
- `godot/scripts/core/*.cs`
- `godot/data/*.json`

---

### Story 57-5: 键盘可视化与打字输入闭环

**范围：** 在 Godot 端复刻键盘可视化和打字输入，验证手感和延迟，使用 P0 美术资产。

**功能清单：**
- [ ] `KeyButton` 节点：Sprite2D + Label + 4 状态切换
- [ ] `KeyboardVisualizer`：手动定位 26 键（Q/A/Z 行有偏移，**不**用 GridContainer）
- [ ] 输入接 `_unhandled_input` + `InputEventKey.unicode`（**不**走 InputMap）
- [ ] 输入延迟 <16ms（Godot 端测量）
- [ ] 屏幕显示一个目标词，键入正确字符高亮，错误字符 flash，词完成发出 `word:complete` signal
- [ ] FloatText 对象池：`Label` + `Tween`，词完成时弹分数
- [ ] IME / 中文输入下行为正确（桌面三平台都测）

**前置：** 57.3（资产）+ 57.4（骨架）

**新增文件：**
- `godot/scripts/ui/KeyButton.cs`
- `godot/scripts/ui/KeyboardVisualizer.cs`
- `godot/scripts/ui/FloatTextPool.cs`
- `godot/scenes/keyboard.tscn`

---

### Story 57-6: 战斗最小闭环 ◆ 里程碑

**范围：** 实现"一个敌人 + 一种技能 + 一个词条"的最小可玩战斗，验证 57.2 的事件管线设计。**不**追求功能完整。

**功能清单：**
- [ ] BattleScene：敌人 sprite + HUD + 键盘 + 词语显示
- [ ] 战斗状态机按 57.2 图 1 实现
- [ ] 词完成 → 计分管线：base × multiplier → 敌人扣血
- [ ] 1 种技能（如最简单的"暴击"）触发并播放命中特效
- [ ] 1 种词条挂载到技能上，按 57.2 图 3 顺序结算
- [ ] 敌人血量归零 → 胜利结算 → 返回主菜单
- [ ] 战斗中 EventBus signal 发送日志可见

**前置：** 57.5

**里程碑意义：** 完成此 Story 即可宣布"Godot 端可玩"，后续都是规模扩展。

**新增文件：**
- `godot/scripts/systems/Battle.cs`
- `godot/scripts/systems/Scoring.cs`
- `godot/scripts/systems/Skills.cs`（stub）
- `godot/scripts/systems/Affixes.cs`（stub）
- `godot/scenes/battle.tscn`

---

### Story 57-7: 系统逐项迁移

**范围：** 把 TS 端 systems/ 各模块按依赖顺序迁到 Godot，每迁完一个就跑等价性测试。本 Story 是 Epic 主要工作量，建议拆为子 Story 实施。

**功能清单：**
- [ ] **57-7a** Scoring（多种倍率、tier、连击）
- [ ] **57-7b** Skills 完整池（参照 Epic 11/12/19 的 ModifierRegistry / EffectPipeline 模型，C# 重写）
- [ ] **57-7c** Affixes 完整池 + AffixTrigger
- [ ] **57-7d** Relics 完整池（注意 `relics/*` 子目录有 10+ 个 Behavior 文件，按行为分类迁移）
- [ ] **57-7e** BossModifiers + BossModifierEngine
- [ ] **57-7f** Stage flow（普通 / 精英 / boss / rest / shop 节点）
- [ ] 每个子 Story 完成后跑 snapshot：固定种子打 3 关，C# 端 state 哈希/字段与 TS 端一致
- [ ] 全部完成后删除 TS 端对应模块（或保留双跑直到全部迁完）

**前置：** 57.6

**注意：** Snapshot 等价性测试在浮点 / Map 迭代顺序上可能跨语言不一致，改为关键状态字段比较而非全 hash。

---

### Story 57-8: 元系统与桌面发行

**范围：** 商店、休息、教程、i18n、存档、设置、桌面打包、Steam 集成。

**功能清单：**
- [ ] Shop / RestStage / RitualEnchantment 场景与流程
- [ ] 教程系统（参考 `tutorial/`，注意 Epic 56 的教程改造已落地，需对齐）
- [ ] i18n：Godot Translation + `tr()`，从 `demo-i18n.ts` 导出 .csv，覆盖 zh / en
- [ ] 存档：自定义 `Resource` 类 + `ResourceSaver.save("user://save.tres")`，字段对齐 57.2 图 4
- [ ] Settings 面板（音量 / 全屏 / 语言 / 键位）
- [ ] Steam 集成：GodotSteam 第三方模块，成就 + 云存档（参考 `docs/steam-cloud-config.md`）
- [ ] 桌面打包：Windows .exe / macOS .app（签名 + notarize）/ Linux AppImage
- [ ] 三平台冒烟测试通过

**前置：** 57.7 全部完成

**注意：** macOS 签名需开发者证书，**在本 Story 之前先单独验证签名链路**，避免发布前才发现卡住。

---

## 风险登记

| ID | 风险 | 缓解 |
|----|------|------|
| R1 | `battle.ts` 实际复杂度可能超估 | 57.2 文档化阶段如发现状态机过深，拆出 57.2.x 子 Story 先做局部重构（TS 端） |
| R2 | C# vs GDScript 反复 | 已决策 C#，本 Epic 不再讨论 |
| R3 | Fusion Pixel 字体在小字号下中文可读性差 | 57.3 落地前先在 1080p / 1440p 显示器实测，不行降级为方正像素 12 / Zfull-GB |
| R4 | Snapshot 等价性测试跨语言浮点 / Map 顺序不一致 | 57.7 测试改为关键状态字段比较而非全 hash |
| R5 | macOS 签名与 notarize 卡发布 | 57.8 前先单独验证签名链路 |
| R6 | 迁移期间 TS 版本继续迭代会持续欠债 | 57.1 完成后所有新内容 Epic 必须先动 JSON，TS / C# 两端共享 |

---

## 实施节奏建议

- **不抢工**：本 Epic 优先级 P2，与内容 Epic 并行推进，不阻塞玩法迭代
- **里程碑驱动**：57.6 是最重要的里程碑（Godot 端可玩），到此之前都属"投入期"
- **可暂停**：57.1、57.2、57.3 三个 Story 都是独立可暂停的，做完不动 Godot 也有价值
- **不设期限**：迁移类 Epic 不要给 deadline，按 Story 节奏推

---

_Created: 2026-04-12_
