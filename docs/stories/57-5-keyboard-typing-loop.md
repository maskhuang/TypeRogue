# Story 57.5: 键盘可视化与打字输入闭环

## Status: draft

## Story

作为 Godot 端的第一个交互验证，我需要在 Godot 中复刻键盘可视化和打字输入，使用 P0 美术资产，验证手感和输入延迟，确认 Godot 端能达到打字游戏要求。

## 验收标准 (AC)

### AC1: KeyButton 节点
- `scripts/ui/KeyButton.cs` 继承 Node2D
- 子节点：Sprite2D（键帽）+ Label（字符）
- 4 个状态：`Idle / Pressed / Matched / Highlighted`，对应 57.3 的键帽 atlas 4 行
- API：`SetState(KeyState state)`、`SetChar(string c)`、`Flash(Color color, float duration)`
- 状态切换无 tween，瞬切（保持像素感）

### AC2: KeyboardVisualizer 节点
- `scripts/ui/KeyboardVisualizer.cs` 继承 Node2D
- **手动定位** 26 个 KeyButton（**不**用 GridContainer）
- 三行偏移按真实键盘布局：Q 行 0px，A 行 +16px，Z 行 +32px
- 总宽度 ≤ 512px（在 640×360 viewport 中留 64px 两侧边距）
- 暴露 `GetKey(char c)` 方法供战斗系统调用

### AC3: 输入处理
- 在主场景脚本 `_UnhandledInput(InputEvent ev)` 中接 `InputEventKey`
- 使用 `ev.Unicode` 而非 `ev.PhysicalKeycode`（不走 InputMap）
- 过滤：仅处理可见 ASCII 字母字符（`a-z`、`A-Z`），统一转小写
- 每次按键发出 `EventBus.KeyPressed` signal，payload `{ char, timestamp }`

### AC4: 输入延迟测量
- dev-only 调试 HUD 显示最近 60 帧的输入延迟（按键事件 → 视觉反馈）
- 目标：p99 < 16ms
- 全屏 / 窗口模式都测
- 不达标则 Story 阻塞，先排查（vsync / 渲染管线 / 信号开销）

### AC5: 单词显示与匹配
- 屏幕中央显示一个目标词（占位用，从 `data/words.json` 随机取）
- 玩家逐字键入：
  - 正确字符 → 对应 KeyButton 切到 Matched 高亮 200ms
  - 错误字符 → 对应 KeyButton flash 红色 100ms，发出 `EventBus.WordError`
  - 词完成 → 发出 `EventBus.WordCompleted`，spawn FloatText
- 词显示使用 Fusion Pixel 字体，已键入字符高亮颜色

### AC6: FloatTextPool
- `scripts/ui/FloatTextPool.cs`
- 对象池预分配 32 个 Label 节点
- API：`Spawn(string text, Vector2 pos, Color color)`
- 动画：向上飘 + 渐隐，使用 `Tween`（`await tween.Finished` 后回收）
- 词完成时弹出分数（占位 100）

### AC7: IME / 中文输入兼容
- 中文 IME 激活时不应触发 KeyPressed（IME 候选窗口期间）
- macOS / Windows / Linux 三平台都测
- 退出 IME 后正常工作

### AC8: 完整闭环
- 启动游戏 → 显示键盘 + 一个目标词
- 玩家键入 → 视觉反馈 → 词完成 → 弹分 → 自动出下一个词
- 可连续打 10 个词无崩溃 / 内存泄漏

## 技术说明

### 涉及文件
- 新增：
  - `godot/scripts/ui/KeyButton.cs`
  - `godot/scripts/ui/KeyboardVisualizer.cs`
  - `godot/scripts/ui/FloatTextPool.cs`
  - `godot/scripts/ui/DebugHud.cs`（dev-only 延迟显示）
  - `godot/scenes/keyboard.tscn`
  - `godot/scenes/typing_test.tscn`（本 Story 的临时测试场景）

### 依赖
- 57.3（资产）
- 57.4（项目骨架 + 数据加载）

### 技术决策
- **不用 GridContainer**：键盘三行有偏移，手动定位更简单
- **不用 InputMap**：打字游戏要的是字符不是 action，绕开 Godot 的 InputMap 抽象
- **FloatText 用 Label 而非 RichTextLabel**：简单 + 性能好
- **状态切换不用 tween**：保持像素游戏的"硬切感"

### 风险
- **R1**：Godot 4 的 `Tween` API 跟 TS 那边的 RAF 模型差异大 → 缓解：先写一个简单 tween demo 跑通再写 FloatText
- **R2**：中文 IME 在 Godot 4 的处理不完善 → 缓解：实测三平台，不行降级为"按键被 IME 吃掉就忽略"
- **R3**：输入延迟超 16ms → 缓解：检查 vsync、关闭 vsync 测、改用 `Process` 而非 `Input` 轮询

### 验证清单（人工）
- [ ] 在 macOS 全屏模式打字流畅，无掉帧
- [ ] 切换中文 IME 不会误触发
- [ ] 连续打 100 词，FloatText 池无泄漏（task manager 观察）

## Dev Notes

无（draft 阶段）。
