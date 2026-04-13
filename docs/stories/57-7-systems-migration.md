# Story 57.7: 系统逐项迁移

## Status: draft

## Story

作为 Epic 57 的主体工作，我需要把 TS 端 `systems/` 各模块按依赖顺序迁到 Godot C#，每迁完一个就跑等价性测试。本 Story 将拆为 6 个子 Story 实施，每个子 Story 独立 PR。

## 验收标准 (AC)

### AC1: 子 Story 拆分
本 Story 实际由 6 个子 Story 组成，每个独立交付：
- **57-7a Scoring 迁移**
- **57-7b Skills 迁移**
- **57-7c Affixes + AffixTrigger 迁移**
- **57-7d Relics 迁移**
- **57-7e BossModifiers 迁移**
- **57-7f Stage Flow 迁移**

每个子 Story 完成后**TS 端对应模块标记为 deprecated**，但暂不删除（直到 57.8 完成）。

### AC2: Scoring 迁移（57-7a）
- 完整移植 `scoring/` 目录全部逻辑
- 覆盖：基础分、倍率、tier 系统、连击、score popup
- C# 端 `scripts/systems/scoring/*.cs`
- 单元测试：与 TS 端 baseline 比对 100 个采样输入，结果一致

### AC3: Skills 迁移（57-7b）
- 完整移植 `skills.ts` + `systems/skills/` 全部技能池
- 包含 Epic 11/12/19 的 ModifierRegistry / EffectPipeline 模型，C# 重写
- 所有技能从 `data/skills.json` 加载
- 单元测试：每种技能至少 1 个 case 验证触发与效果

### AC4: Affixes 迁移（57-7c）
- 完整移植 `affixes.ts` + `affixTrigger.ts` + `affixMutation.ts`
- 词条挂载、变异、触发管线
- 与 Skills 集成（按 57.2 图 3 顺序）
- 单元测试：覆盖所有词条类型 × 触发条件矩阵

### AC5: Relics 迁移（57-7d）
- 完整移植 `relics/*` 子目录全部 Behavior 文件（10+ 个）：
  - TypingRelicBehaviors
  - ComboRelicBehaviors
  - SkillRelicBehaviors
  - EnchantmentRelicBehaviors
  - TopologyRelicBehaviors
  - WordRelicBehaviors
  - ResourceRelicBehaviors
  - ShopRelicBehaviors
  - StageRelicBehaviors
  - BossModifierRelicBehaviors
  - ScoringRelicBehaviors
  - CritRelicBehaviors
  - StackingRelicBehaviors
- 每个 Behavior 一个 C# 类，统一接口
- 单元测试：每个遗物至少 1 个触发 case

### AC6: BossModifiers 迁移（57-7e）
- 完整移植 `bossModifiers.ts` + `bossModifierEngine.ts` + `bossModifierPicker.ts`
- 所有修饰从 JSON 加载
- 与 BossModifierRelicBehaviors 联动
- 单元测试：每种修饰的 apply / tick / cleanup

### AC7: Stage Flow 迁移（57-7f）
- 完整移植 `stage/` 目录、`actTransition.ts`、`stageFlow.ts`
- 普通 / 精英 / boss / rest / shop 节点流转
- Act 1/2/3 切换
- 集成测试：固定种子打通一个完整 Act

### AC8: 集成等价性测试
所有子 Story 完成后：
- 固定种子 `42` 在 TS 端跑 3 关，dump 关键 state 字段到 baseline JSON
- 在 C# 端用相同种子跑同样 3 关，dump 字段
- 比对：除浮点容差（1e-6）和 Map 顺序外完全一致
- baseline 提交到 git

### AC9: TS 端 deprecation
- 每个子 Story 完成后，TS 端对应文件顶部加注释 `// @deprecated migrated to godot/scripts/systems/<name>`
- 不删除文件（57.8 完成后统一清理）
- TS 版本继续可发布

## 技术说明

### 涉及文件
- 新增（按子 Story 分布）：
  - `godot/scripts/systems/scoring/*.cs`
  - `godot/scripts/systems/skills/*.cs`
  - `godot/scripts/systems/affixes/*.cs`
  - `godot/scripts/systems/relics/*.cs`
  - `godot/scripts/systems/bossModifiers/*.cs`
  - `godot/scripts/systems/stage/*.cs`
- 修改：
  - `src/src/systems/**/*.ts`（加 deprecation 注释）

### 依赖
- 57.6（最小闭环作为接入点）
- 57.1（数据来源）
- 57.2（事件流文档作为参考）

### 实施顺序
按 AC1 列出的子 Story 顺序，**严格不要并行**（除非两个子 Story 完全无交集）。每个子 Story 独立 PR，独立 review，独立合入。

### 实施原则
- **不逐行翻译**：理解 TS 模块的"职责" + "对外接口"，在 C# 端按 Godot 习惯重写
- **接口对齐 57.2**：所有 EventBus signal 名 / payload 与 57.2 文档一致
- **测试先行**：每个子 Story 第一步是从 TS 端 dump baseline，然后写 C# 测试，最后实现到测试通过
- **不优化**：先求一致，57.8 之后再考虑性能

### 风险
- **R1**：跨语言浮点 / Map 顺序差异导致 baseline 测试假阳性 → 缓解：测试改为关键状态字段比较，浮点用容差比对，集合用 sorted 序列化
- **R2**：某子 Story 实施时发现 TS 端有未文档化的 case → 缓解：补回 57.2 文档，不要绕过
- **R3**：Behaviors 文件之间隐式耦合（如全局可变 state）→ 缓解：57-7d 第一步先画 Behavior 之间的依赖图
- **R4**：实施周期长，TS 端持续迭代会引入 drift → 缓解：57.1 后所有新内容必须先动 JSON，本 Story 期间冻结 systems 大改

### 子 Story 工时预估
不给绝对时间，相对工作量：
- 57-7a Scoring：1x
- 57-7b Skills：3x
- 57-7c Affixes：3x
- 57-7d Relics：4x（最大）
- 57-7e BossModifiers：2x
- 57-7f Stage Flow：2x

## Dev Notes

无（draft 阶段）。子 Story 实施前再创建独立的 57-7a~f story 文件。
