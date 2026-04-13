# Story 57.1: data/ JSON 化与 schema

## Status: draft

## Story

作为 Godot 迁移的准备工作，我需要把 `src/src/data/` 下的所有声明式常量抽出为引擎无关的 JSON + zod schema，TS 端改为 import JSON 行为零差异，让两端可以共享同一份事实来源。

## 验收标准 (AC)

### AC1: 数据导出脚本
- 新增 `tools/data-extract.ts`
- 对每个 data 模块 import 后 `JSON.stringify(value, null, 2)` 输出到 `src/data-json/`
- 支持 `npm run data:extract` 重新生成
- 输出文件 UTF-8、LF 换行、末尾换行符

### AC2: 覆盖范围
以下文件的纯数据部分必须导出为 JSON：
- `affixes.ts` → `affixes.json`
- `relics.ts` → `relics.json`
- `skills.ts` → `skills.json`
- `wordPacks.ts` → `wordPacks.json`
- `words.ts` → `words.json`
- `restEvents.ts` → `restEvents.json`
- `bossModifiers.ts` → `bossModifiers.json`（仅常量部分，引擎留 ts）
- `classes.ts` → `classes.json`
- `tutorialSteps.ts` → `tutorialSteps.json`
- `keyboardTopology.ts` → `keyboardTopology.json`

### AC3: schema 与类型推导
- 每个 JSON 配套 `src/src/data/schemas/<name>.ts`，使用 zod
- TS 端类型从 `z.infer<typeof schema>` 推导，**替换**原 `interface`
- 启动时 `parse()` 一次校验全部数据，schema 不通过即抛错

### AC4: 混合文件拆分原则
- `xxx.ts` 中**纯数据常量** → `xxx.data.json`
- `xxx.ts` 中**类型 / helper / 运行时函数** → 留在 `xxx.ts`
- 运行时函数明确**不进** data：
  - `affixMutation.ts`
  - `affixTrigger.ts`
  - `skillGeneration.ts`
  - `bigramFrequency.ts`
  - `patternFrequency.ts`
  这些保留在 `data/` 目录或迁去 `systems/`，不导出 JSON

### AC5: TS 端改造
- 所有原本 `import { FOO } from './foo'` 的调用点改为从 schema 模块 re-export
- 编译通过，类型检查通过
- 全量单元测试通过

### AC6: 行为等价性 snapshot 测试
- 新增测试 `tests/integration/data-snapshot.test.ts`
- 固定种子 `42`，跑 3 关（普通 / 精英 / boss）
- 比较 `state` 关键字段哈希与迁移前的 baseline
- baseline 通过 git 提交（首次运行时生成）

### AC7: TS 版本零行为差异
- demo 可正常发布
- Epic 55 的像素 UI 不受影响
- 现有所有 epic（21~56）的功能行为不变

## 技术说明

### 涉及文件
- 新增：
  - `tools/data-extract.ts`
  - `src/data-json/*.json`（10 个 JSON）
  - `src/src/data/schemas/*.ts`（10 个 schema）
  - `tests/integration/data-snapshot.test.ts`
- 修改：
  - `src/src/data/*.ts`（瘦身，移除常量定义）
  - 所有引用 data 常量的文件（自动通过 re-export 兼容）
  - `package.json`（新增 `data:extract` script）

### 依赖
- 无前置 Story
- 不依赖 Godot 任何决策
- 可立即开始

### 实施顺序建议
1. 先做 `keyboardTopology` 一个文件作为样板，跑通脚本 + schema + snapshot 测试链路
2. 然后批量处理剩余 9 个文件
3. 最后做 snapshot 等价性验证

### 风险
- **R1**：`bossModifiers.ts` 等文件含有运行时函数，拆分时可能漏抽 → 缓解：先列清单再动手，每个文件 PR 单独 review
- **R2**：zod 启动时全量 parse 增加冷启动开销 → 缓解：可选 lazy parse，或仅在 dev 模式 parse
- **R3**：JSON 失去 TS 的 `as const` 字面量类型 → 缓解：schema 用 `z.literal` / `z.enum` 还原

### 后续 Story 影响
完成后，**所有新内容 epic 必须先动 JSON**，再让 TS / 未来 Godot 两端读取。这是迁移期间防止持续欠债的关键纪律。

## Dev Notes

无（draft 阶段）。
