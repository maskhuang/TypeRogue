# Godot 迁移文档索引

> 📍 **源码行号基线**：本目录所有 `file.ts:N` 行号引用基于 git commit `1b07c96`（Story 57.1，2026-04-13 快照）。后续 src/ 演进后以 `git blame <file> -L N,N` 复核。

Epic 57 的需求文档集。为 Godot 4 + C# 端重写战斗系统提供行为等价性依据。

## 角色定位

当前打字肉鸽是 TS + DOM/CSS 栈，`systems/battle.ts` 2968 行 + 50+ imports 是全系统的**胶水编排器**。直接翻译这 3000 行容易陷入细节；本目录是先做**需求抽取**（不动代码），把现有系统的行为特征落到一组可读、可追溯、可对齐的文档上。

目标读者：Story 57.4~57.7 的实施者（含未来的你自己和任何接手 Godot 端的协作者）。

## 文档清单

| 文件 | 回答什么问题 | 给谁看 | 何时用 |
|------|-------------|-------|-------|
| [01-battle-state-machine.md](01-battle-state-machine.md) | 战斗/商店/休息/仪式 这些顶层 phase 如何转移？战斗内部又有什么子状态？ | 57.6 战斗最小闭环实施者 | 在 Godot 端画 `Battle.cs` 状态机前 |
| [02-event-bus.md](02-event-bus.md) | 有哪些事件？谁发谁收？payload 是什么？哪些是高频必须优化的？ | 57.4 项目骨架 / 57.6 | 定义 Godot `EventBus` autoload 的 signals 清单 |
| [03-resolution-pipeline.md](03-resolution-pipeline.md) | 一个词打完到分数落定，调用链是什么顺序？哪里可以插新行为？ | 57.7 全部子 Story | 每迁一个遗物/词条/修饰器前查 |
| [04-save-schema.md](04-save-schema.md) | 存档里都有什么字段？哪些跨关/跨局？哪些是纯内存状态？ | 57.8 存档系统 | 设计 Godot `SaveData` Resource 类 |

## 与 Story 57.1 的关系

Story 57.1 处理**静态数据**（`data/*.ts` → `data-json/*.json`），规则见 [data-sync.md](data-sync.md)。本目录处理**动态行为**（state machine / events / pipeline）。两者互补：

- Godot 端的 `DataLoader.cs` 从 57.1 的 JSON 读取 → 填充 `Battle.cs` / `Skills.cs` 等
- `Battle.cs` 的结构（状态机、事件名、管线顺序）从本目录的文档推导

## 实施原则

1. **不追求 100% 准确** — 覆盖主路径 + 已知 boss/relic 特殊路径即可，边角 case 在 57.7 实施时补
2. **不写代码** — 发现代码中有 bug 或不一致，记录到对应文档末尾的"Notes"段，不在本 Story 修
3. **单图 ≤ 30 节点** — 超出就拆子图
4. **每个文档前面 2~3 句意图说明**，避免纯 dump

## 如何消费

- 57.4 Godot 项目骨架：读图 2 建立 EventBus signals；读图 1 建立 Battle 状态机骨架
- 57.5 键盘输入闭环：读图 2 的 `input:*` 命名空间；读图 1 的 `waitingStart → typing` 路径
- 57.6 战斗最小闭环 ◆ 里程碑：严格按图 1 实现状态机，按图 3 实现最简结算管线
- 57.7 系统迁移（6 子 Story）：每迁一个子系统前查图 3 对应段落
- 57.8 元系统 + 发行：读图 4 实现 `SaveData.cs` Resource + `Resource{Saver,Loader}`

## 关键决策

- **signals 命名与 TS EventBus 完全对齐**（除 C# PascalCase 化）。同名事件 = 同语义。TS 端的订阅/发送双向对照可直接映射到 Godot。
- **两套 phase 并存**：`state.phase: GamePhase`（顶层场景切换 6 值）vs `BattleState.phase: BattlePhase`（战斗子状态 5 值）。Godot 端应把前者升级为 `SceneManager` 切换，后者作为 Battle 场景内部 FSM。
- **完整运行时 snapshot 测试**延后到 57.7 作为 TS/Godot 等价性验证手段（Story 57.1 已正式接过此债务）。

---

_Created: 2026-04-13（Story 57.2）_
