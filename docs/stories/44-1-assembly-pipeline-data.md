# Story 44.1: 词语组装流水线 — 数据层

## Status: done

## Story

作为造词师玩家，我需要一个词语组装流水线数据结构，使能量资源能够推进流水线进度、完成词语组装并加入词库。

## 验收标准 (AC)

### AC1: AssemblyPipeline 接口
- `AssemblySlot { letter: string, progress: number, completed: boolean }` 定义在 types.ts
- `AssemblyPipeline { slots: AssemblySlot[], targetWord: string }` 定义在 types.ts
- GameState 新增 `assemblyPipeline: AssemblyPipeline | null`

### AC2: 能量路由
- 替换 `routeFragmentsToInventory` 为 `routeEnergyToPipeline`
- 能量产出时自动注入流水线（仅造词师）
- 非造词师职业能量路由保持原逻辑（或忽略）

### AC3: 流水线推进纯函数
- `advancePipeline(pipeline, energy, energyPerSlot): { pipeline, completed, remainingEnergy }`
- 从左到右逐个槽位填满，溢出自动流入下一个
- 常量 `ENERGY_PER_SLOT = 5`、`MAX_PIPELINE_LENGTH = 12`

### AC4: 流水线完成检测
- 所有槽位 completed 时返回 `completed: true`
- 完成后词语加入 `wordDeck` 和 `craftedWords`
- 流水线清空（`assemblyPipeline = null`）

### AC5: 流水线创建
- `createPipeline(word: string, fragmentInventory): pipeline | null`
- 检查碎片库存是否足够
- 消耗碎片、创建槽位（每字母一个，progress=0）
- 词长超过 MAX_PIPELINE_LENGTH 时拒绝

### AC6: 跨关持久化
- 未完成的流水线进度跨关保留
- 存档序列化/反序列化 assemblyPipeline

## 技术说明

### 涉及文件
- `src/src/core/types.ts` — 新增 AssemblySlot、AssemblyPipeline 接口
- `src/src/core/state.ts` — GameState 初始化
- `src/src/systems/classes/AssemblyPipeline.ts` — 新文件，纯函数（advancePipeline、createPipeline）
- `src/src/systems/classes/FragmentQueue.ts` — 重构 routeFragmentsToInventory → routeEnergyToPipeline
- `src/src/systems/skills.ts` — 能量路由调用点
- `src/src/data/affixTrigger.ts` — 存档序列化

### 依赖
- Epic 43 完成的 fragment → energy 改名
- 现有 fragmentInventory 保留（碎片库存仍按 A-Z）
