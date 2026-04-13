# Story 57.2: 战斗事件流与状态机文档化

## Status: draft

## Story

作为 Godot 端重写战斗系统的开发者，我需要 4 张图描述当前 `battle.ts` 的事件流和状态机，作为重写的需求文档，避免边写边发现 case 导致返工。

## 验收标准 (AC)

### AC1: 战斗生命周期状态机（图 1）
- 文件：`docs/godot-migration/01-battle-state-machine.md`
- 用 mermaid stateDiagram 画出
- 必须覆盖状态：`init / waitingStart / spawnWord / typing / wordComplete / wordError / checkVictory / settlement / endBattle`
- 每个转移标注**触发条件**与**副作用**（如 `eventBus.emit('word:complete', payload)`）
- 标注异常路径：玩家暂停、超时、boss 修饰打断

### AC2: EventBus 事件清单（图 2）
- 文件：`docs/godot-migration/02-event-bus.md`
- grep 全量 `eventBus.emit` 和 `eventBus.on`
- 表格列：`event name | payload schema | 发送方文件 | 订阅方文件列表 | 触发频率`
- 按命名空间分组（`battle:* / word:* / skill:* / relic:* / shop:* / ui:*`）
- 标记"高频"事件（每词触发或更高），便于 Godot signals 性能预估

### AC3: 每词结算管线顺序图（图 3）
- 文件：`docs/godot-migration/03-resolution-pipeline.md`
- 用 mermaid sequenceDiagram 画出"一个词打完到分数落定"的完整调用链
- 必须覆盖顺序：
  1. `inputHandler.onWordComplete`
  2. `relics/*` 的 word-complete 钩子（按子目录列全 10+ 个）
  3. `affixTrigger` 的词条触发
  4. `bossModifierEngine` 修饰应用
  5. `skills.triggerSkill`
  6. `EffectPipeline` 三层管线
  7. `ScoringRelicBehaviors` 计分修正
  8. `juice` 视觉/音效
- 标注**可插入点**（哪里可以塞新效果）和**幂等性要求**（哪些必须只跑一次）

### AC4: 存档字段表（图 4）
- 文件：`docs/godot-migration/04-save-schema.md`
- 表格列：`字段路径 | TS 类型 | 默认值 | 持久化方式 | 跨关 / 跨局 / 设置`
- 来源：`state.ts` + `UserSettings.ts` + 各 Behavior 文件的持久化字段
- 标注**版本迁移历史**（如有 schema 变更注释）
- 输出可直接作为 Godot Resource 类的字段表

### AC5: 文档质量
- 所有 mermaid 图在 GitHub 渲染正常
- 每张图前面有 2~3 句**意图说明**（为什么这样设计）
- 文档间相互链接

## 技术说明

### 涉及文件
- 新增：
  - `docs/godot-migration/README.md`（索引）
  - `docs/godot-migration/01-battle-state-machine.md`
  - `docs/godot-migration/02-event-bus.md`
  - `docs/godot-migration/03-resolution-pipeline.md`
  - `docs/godot-migration/04-save-schema.md`
- 不修改任何 `src/` 代码

### 依赖
- 建议 57.1 完成后做（避免基于即将被改的代码画图）
- 但也可以在 57.1 之前做，因为 TS 接口不会因为 JSON 化而变

### 实施方法
- **不要逐函数读 battle.ts**。按事件追：grep `eventBus.emit` → 找到所有发射点 → 沿调用链回溯 → 画状态机
- **不要追求 100% 准确**。覆盖主路径 + 已知 boss / relic 特殊路径即可，边角 case 在 57.7 实施时补
- **mermaid 图保持单图 30 节点以内**，超出就拆子图

### 风险
- **R1**：state 状态太多导致状态机膨胀 → 缓解：先画"happy path"主图，异常分支拆子图
- **R2**：事件订阅是动态注册的，grep 不到全部 → 缓解：在 EventBus 里加 dev-only 日志，运行一局收集真实事件流
- **R3**：文档写完后 battle.ts 又改了 → 缓解：本 Story 完成即冻结 battle.ts 大改，新需求走 JSON 化路径

## Dev Notes

无（draft 阶段）。
