# Story 57.8: 元系统与桌面发行

## Status: draft

## Story

作为 Epic 57 的收尾，我需要把商店、休息、教程、i18n、存档、设置补全到 Godot 端，集成 Steam，完成 Windows / macOS / Linux 三平台打包，让 Godot 版可对外发布。

## 验收标准 (AC)

### AC1: Shop 场景
- 完整移植 `systems/shop.ts` 逻辑到 C#
- `scenes/shop.tscn` 使用 P0 美术
- 词条 / 技能 / 遗物 三类商品的购买、刷新、解锁交互
- 与 ShopRelicBehaviors（57-7d）联动

### AC2: RestStage 与 RitualEnchantment
- 完整移植 `restStage.ts`、`ritualEnchantment.ts`
- `scenes/rest_stage.tscn`、`scenes/ritual.tscn`
- 休息事件随机表 / 升级 / 治疗 / 移除词条等选项
- 仪式附魔的拖拽交互在 Godot 端用 `Control._GetDragData` / `_DropData` 实现

### AC3: 教程系统
- 完整移植 `systems/tutorial/`
- 对齐 Epic 56 已落地的教程改造（不要回退）
- 高亮 + 文字气泡组件
- 教程关数据从 JSON 加载

### AC4: i18n
- 从 `src/src/demo/demo-i18n.ts` 导出 `.csv` 语言文件
- Godot Translation 资源 `godot/i18n/zh.csv`、`en.csv`
- C# 代码用 `Tr("KEY")` 调用
- 启动时根据系统语言或玩家设置切换
- 缺失 key 在 dev 模式输出警告

### AC5: 存档系统
- 自定义 `Resource` 类 `SaveData.cs`，字段对齐 57.2 图 4
- `ResourceSaver.Save("user://save.tres", saveData)`
- 支持多存档槽（至少 3 个）
- 跨关 / 跨局字段正确分离
- 旧版本存档迁移：dev 模式有迁移钩子，正式版按需启用

### AC6: Settings 面板
- `scenes/settings.tscn`
- 选项：
  - 主音量 / BGM / SFX 音量
  - 全屏 / 窗口
  - 分辨率（仅整数缩放可选）
  - 语言切换
  - 键位绑定（如有）
- 修改即时生效，写入 user:// 配置文件

### AC7: Steam 集成
- 引入 GodotSteam 第三方模块（C# 版）
- App ID 占位（发布前替换）
- 实现成就系统（至少接入 5 个核心成就）
- 实现云存档（与本地 user:// 双写）
- 参考 `docs/steam-cloud-config.md` 的字段约定

### AC8: 桌面打包
- 三平台 export preset 配置：
  - Windows：x64 .exe + 安装包（NSIS 或 Inno Setup）
  - macOS：universal .app（x64 + arm64）+ codesign + notarize
  - Linux：x64 .AppImage 或 tar.gz
- 构建脚本 `tools/build-godot.sh`
- 输出到 `dist-godot/` 目录

### AC9: macOS 签名链路
- **AC9 必须在 AC8 之前单独验证**
- 准备 Apple Developer 证书（如未有则本 Story 阻塞）
- 一次完整 sign + notarize + staple 流程跑通
- 文档：`docs/godot-migration/macos-signing.md`

### AC10: 三平台冒烟测试
- 每平台至少完整跑一局战斗（含商店、休息、boss）
- 存档读写验证
- 设置修改持久化验证
- Steam 成就解锁验证（在 Steam 测试 build 中）

### AC11: 切换发布
- 旧 TS 版从 demo 渠道下线（保留源码）
- Godot 版作为新的发布版本（v1.0）
- 更新 `README.md` 和构建文档

## 技术说明

### 涉及文件
- 新增：
  - `godot/scripts/systems/Shop.cs`
  - `godot/scripts/systems/RestStage.cs`
  - `godot/scripts/systems/Tutorial.cs`
  - `godot/scripts/core/SaveData.cs`
  - `godot/scripts/core/SettingsManager.cs`
  - `godot/scripts/integration/SteamIntegration.cs`
  - `godot/scenes/shop.tscn`、`rest_stage.tscn`、`ritual.tscn`、`tutorial.tscn`、`settings.tscn`
  - `godot/i18n/*.csv`
  - `tools/build-godot.sh`
  - `tools/i18n-export.ts`
  - `docs/godot-migration/macos-signing.md`
- 修改：
  - `README.md`
  - `docs/build-guide.md`

### 依赖
- 57.7（全部子 Story 完成）

### 风险
- **R1**：macOS 签名链路卡住 → 缓解：AC9 单独前置验证，证书没准备好就阻塞整个 Story
- **R2**：GodotSteam C# 绑定不完整 → 缓解：先做 AC7 第一天验证 hello world，不行降级用 GDScript bridge
- **R3**：存档迁移导致老玩家数据丢失 → 缓解：旧版 TS demo 不含正式存档，理论上无迁移负担；正式版第一次发布后再说
- **R4**：i18n 漏 key 导致正式版显示英文/key 名 → 缓解：CI 跑 i18n 完整性测试，所有 `Tr()` 调用必须有对应 key

### 发布检查清单（在 AC11 前过一遍）
- [ ] 三平台冒烟测试通过
- [ ] Steam 成就在测试 build 中可解锁
- [ ] 存档跨平台一致（同一 Steam 账号）
- [ ] 设置面板所有选项工作正常
- [ ] 中英文切换无乱码
- [ ] 全屏 / 窗口切换无崩溃
- [ ] 完整通关一次 Act 1（实际玩，不是脚本）
- [ ] 内存使用稳定（连续玩 30 分钟无泄漏）
- [ ] 启动时间 < 5 秒

## Dev Notes

无（draft 阶段）。本 Story 完成后 Epic 57 整体可关闭。
