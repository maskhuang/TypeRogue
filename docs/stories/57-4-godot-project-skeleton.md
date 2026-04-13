# Story 57.4: Godot 项目骨架与数据接入

## Status: draft

## Story

作为 Godot 端开发的起点，我需要一个配置完整的 Godot 4 + C# 项目骨架，包含 autoload、目录结构、数据加载，并能在启动时把 57.1 的 JSON 数据加载进强类型 C# 类。

## 验收标准 (AC)

### AC1: Godot 项目创建
- Godot 4.x（最新稳定版）
- C# 启用，.NET 8 SDK
- 项目根目录：`godot/`
- `project.godot` 配置：
  - 显示名称、版本、图标
  - 渲染器：Forward+（桌面优先）
  - 窗口 1280×720
  - viewport 缩放：integer，逻辑分辨率 640×360
  - 全屏快捷键 F11

### AC2: 目录结构
```
godot/
├── data/                  # 从 src/data-json 复制（CI 同步）
├── scripts/
│   ├── core/
│   │   ├── GameState.cs
│   │   ├── EventBus.cs
│   │   ├── SaveSystem.cs
│   │   └── AudioBus.cs
│   ├── systems/
│   ├── ui/
│   └── data/              # JSON 对应的 C# DTO 类
├── scenes/
│   ├── main.tscn
│   └── splash.tscn
├── assets/                # 来自 57.3
├── themes/
└── tests/
```

### AC3: Autoload 单例
4 个 autoload 节点：
- `GameState`：运行时游戏状态（不持久化部分），signals 暴露状态变化
- `EventBus`：纯事件中转，所有 signal 在此声明
- `SaveSystem`：存档读写，user:// 路径
- `AudioBus`：音量管理，bgm/sfx/ui 三个 bus

### AC4: EventBus 事件声明
- 按 57.2 图 2 的事件清单，在 `EventBus.cs` 中声明对应 signals
- 命名规范：`WordCompleted`、`SkillTriggered` 等 PascalCase
- 注释中保留原 TS 事件名以便追溯
- 至少先声明 10 个核心事件（battle:* 命名空间）

### AC5: DataLoader 实现
- `scripts/core/DataLoader.cs` static class
- 启动时调用 `Load()`，从 `res://data/*.json` 读取
- 使用 `System.Text.Json` 反序列化到强类型 DTO
- DTO 类位于 `scripts/data/`，字段命名遵循 C# 习惯但用 `[JsonPropertyName]` 映射 JSON 字段
- 加载失败抛 `DataLoadException`，错误信息含文件名和字段路径

### AC6: 数据 DTO 类
对应 57.1 的 10 个 JSON 文件，至少创建以下 DTO：
- `AffixDef`、`AffixDefList`
- `RelicDef`、`RelicDefList`
- `SkillDef`、`SkillDefList`
- `WordPackDef`、`WordPackDefList`
- `BossModifierDef`、`BossModifierDefList`
- `KeyboardTopologyDef`
- 其余 4 个用 `JsonElement` 占位，57.7 子 Story 中再细化

### AC7: 数据加载测试
- 单元测试 `tests/DataLoaderTests.cs`
- 启动时加载所有 JSON 零错误
- 每类条目数与 TS 端常量一致（硬编码期望值，TS 那边数变了测试会红）
- 用 GUT 或 .NET test runner 跑

### AC8: Theme 与字体
- 接入 57.3 产出的 `godot/themes/default.tres`
- Fusion Pixel 12px 设为默认字体
- 启动场景 `splash.tscn` 显示一行文字验证字体渲染正确

### AC9: 数据同步机制
- npm script `npm run godot:sync-data`：拷贝 `src/data-json/*.json` → `godot/data/`
- 文档：`docs/godot-migration/data-sync.md` 说明同步时机和 CI 集成

## 技术说明

### 涉及文件
- 新增：
  - `godot/project.godot`
  - `godot/scripts/core/*.cs`（4 个 autoload + DataLoader）
  - `godot/scripts/data/*.cs`（DTO 类）
  - `godot/scenes/main.tscn`、`splash.tscn`
  - `godot/tests/DataLoaderTests.cs`
  - `tools/sync-godot-data.ts`
  - `docs/godot-migration/data-sync.md`

### 依赖
- **必须** 57.1 完成（data JSON 已就位）
- **应** 57.3 部分完成（至少有字体文件，否则 AC8 跳过）

### 技术决策
- **JSON 库选 System.Text.Json 而非 Newtonsoft**：性能更好，.NET 内置，无额外依赖
- **DTO 用 record class**：immutability + 简洁语法
- **EventBus 用 Godot signals 而非 C# event**：跨脚本（包括 GDScript）兼容性更好

### 风险
- **R1**：Godot C# 在 macOS ARM64 上的 .NET SDK 兼容性问题 → 缓解：本 Story 第一天就在 macOS 跑 hello world 验证
- **R2**：JSON 字段命名不一致（TS camelCase vs C# PascalCase）→ 缓解：DTO 全部用 `[JsonPropertyName("camelCaseName")]` 显式映射
- **R3**：数据同步漂移（TS 改了 JSON 但 Godot 没拉）→ 缓解：CI 跑 `sync-godot-data` 后比对 git diff，有变化就警告

## Dev Notes

无（draft 阶段）。
