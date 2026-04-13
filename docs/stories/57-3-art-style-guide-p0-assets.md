# Story 57.3: 美术风格指南与 P0 资产

## Status: draft

## Story

作为美术方向的奠基工作，我需要一次性确定全部美术锚点并产出 P0 最小资产包，避免后续每个资产重复决策导致风格漂移。

## 验收标准 (AC)

### AC1: 风格指南文档
- 文件：`docs/art-style-guide.md`
- 6 项锚点定死：
  1. **逻辑分辨率**：640×360（整数缩放至 1280×720 / 1920×1080 / 2560×1440）
  2. **键帽尺寸**：32×32 像素
  3. **调色板**：32 色，从 Resurrect-64 选子集，覆盖 6 种稀有度配色
  4. **字体**：Fusion Pixel 12px（开源含 CJK，单字体打天下）
  5. **描边规则**：UI 和敌人全黑 1px 描边，特效不描边（保留发光感）
  6. **动效帧率**：12fps，idle 4 帧，攻击 / 受击 / 死亡 6~8 帧
- 每项锚点附**为什么这么定**的理由 + **不能违反的边界**

### AC2: Mood board
- 至少 3 款风格参考（如 Loop Hero / Cobalt Core / StS 像素 mod）
- 每个参考标注"我们要学什么 / 不学什么"
- 明确"我们的总体调性更接近哪一个"
- 截图归档到 `docs/art-references/`

### AC3: 调色板文件
- `godot/assets/palette.gpl`（GIMP/Aseprite 兼容格式）
- 32 色，分组标注：基础色 / 6 稀有度色 / 中性灰阶 / UI 强调色
- 在 Aseprite 中可直接载入

### AC4: 字体接入
- `godot/assets/fonts/FusionPixel12.ttf`
- 在 1080p / 1440p 显示器实测中文可读性
- 实测不通过则降级为方正像素 12 / Zfull-GB，更新指南
- 创建 Godot Theme 资源 `godot/themes/default.tres`，全局字体设为 Fusion Pixel

### AC5: P0 资产清单交付
全部为 Aseprite 源文件 + 导出 png + json sprite atlas：

- [ ] **键帽** 26 个 × 4 状态（idle / pressed / matched / highlighted）
  - 单张 atlas，每键 32×32，4 行 × 26 列
  - 文件：`art-source/keyboard.ase` + `godot/assets/sprites/keyboard.png`
- [ ] **玩家 HUD 框**：血条 / 计分 / 计时 / 技能槽
  - 9-slice 适用，源文件标注切片位置
  - 文件：`art-source/hud.ase` + `godot/assets/sprites/hud.png`
- [ ] **敌人**：1 个原型敌人
  - idle 4 帧 + hit 2 帧 + death 6 帧
  - 文件：`art-source/enemy_proto.ase` + `godot/assets/sprites/enemy_proto.png`
- [ ] **命中特效** 3 种 spritesheet
  - 普通命中（4 帧）/ 暴击（6 帧）/ 技能命中（8 帧）
  - 文件：`art-source/hit_fx.ase` + `godot/assets/sprites/hit_fx.png`
- [ ] **战斗背景**：1 张 640×360
  - 文件：`art-source/bg_battle_01.ase` + `godot/assets/sprites/bg_battle_01.png`

### AC6: 像素纯净度
- 所有资产严格遵循 1px 网格，无半像素
- 整数缩放至 2x / 3x / 4x 后无糊边（人工抽查 3 张）

## 技术说明

### 涉及文件
- 新增：
  - `docs/art-style-guide.md`
  - `docs/art-references/*.png`（截图）
  - `art-source/*.ase`（Aseprite 源，归档）
  - `godot/assets/palette.gpl`
  - `godot/assets/fonts/FusionPixel12.ttf`
  - `godot/assets/sprites/*.png`
  - `godot/themes/default.tres`

### 依赖
- 无。可与 57.4 并行。
- 不依赖 57.1 / 57.2。

### 工作流
1. **第一周**：mood board + 6 锚点决策（**不画任何最终资产**）
2. **第二周**：调色板 + 字体实测 + 1 个键帽 + 1 个敌人作为风格 prototype
3. **第三周**：扩展到完整 P0 清单
4. 每个资产入库前必须用调色板限定模式画（Aseprite 可锁定）

### 风险
- **R1**：Fusion Pixel 中文小字号不可读 → 缓解：AC4 早期实测，不行立刻降级方正像素 / Zfull-GB
- **R2**：32 色不够用 → 缓解：先做 prototype 验证，不够再扩到 48 色（但要重审，宁可不扩）
- **R3**：风格漂移（不同资产看起来不像一个游戏）→ 缓解：每个资产做完贴到 mood board 旁边自检

### 美术决策原则
- **拒绝渐变和半透明**：只用纯色 + dithering
- **拒绝外发光特效**：靠像素抖动和颜色对比表达高光
- **拒绝系统字体**：所有文字走 Fusion Pixel，不允许混排

## Dev Notes

无（draft 阶段）。
