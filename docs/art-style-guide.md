# 打字肉鸽 · 美术风格指南

> **锁定版本**：v1.0（2026-04-15）
> **作用范围**：Godot 4 + C# 端（Epic 57 之后的所有像素资产）
> **不作用范围**：TS/DOM 端（Epic 55 CSS theming 继续沿用 Press Start 2P）
> **授权依据**：Story 57.3 通过即冻结，后续所有美术资产必须向本指南对齐；如需调整锚点须另开 story。

---

## 1. 六项锚点（锁死量，不可单方面修改）

| # | 锚点 | 决策值 | 决策理由 |
|---|---|---|---|
| 1 | **逻辑分辨率** | `640 × 360` | 16:9；整数缩放到 720p ×2、1080p ×3、1440p ×4、2160p ×6；避免亚像素糊边；单人像素美术可控工作量 |
| 2 | **键帽规格** | `32 × 32 px` | 10 列 × 3 行 QWERTY 键盘在 640 宽内留边距（320 + padding），单键可读；4 态 spritesheet 横向拼接为 128×32 |
| 3 | **调色板** | `Resurrect-32`（Resurrect-64 子集） | 32 色够覆盖 6 稀有度 + 中性灰阶 + 3 accent + 环境色；32 色强制全库调性统一；见 §3 |
| 4 | **字体** | `Fusion Pixel 12px`（含 CJK） | 开源 SIL OFL；同时覆盖简中/繁中/日韩/英文/数字；Epic 55 的 Press Start 2P 无 CJK 无法复用 |
| 5 | **描边规则** | 角色/物件一律 `1px 全黑` 外描边；HUD / 键帽可 `2px` 或无描边 | 1px 描边在 640×360 逻辑尺寸下视觉清晰；角色必描提升剪影识别；HUD 允许无描边让框体更融入背景层 |
| 6 | **动画帧率** | `12 fps`（每帧 ≈ 83 ms） | 像素风默认节奏；与 Loop Hero / Cobalt Core 一致；单帧 83 ms 便于在 Aseprite 内对齐计时 |

**禁用的潜在漂移**（明确列出以免后续踩坑）：
- ❌ 不使用 24 fps 或 30 fps（会让像素插帧感过强）
- ❌ 不引入第二种字体（大小感靠色块对比而非字号变体）
- ❌ 不使用超过 Resurrect-32 的任何色值（Aseprite 里用 `Edit > Replace Color` 可批量校正）
- ❌ 不使用 PNG-24 抗锯齿导出（见 §6 Aseprite 纪律）

---

## 2. Mood Board（参考风格）

列出 3 款商业像素作品作为锚定参照。"主方向"明确标注，另外两款仅作补充参考。

### 2.1 Cobalt Core（主方向 ⭐）

- **学**：高对比色块 / 浓郁阴影 / 关键元素描边 / 菜单与战场使用同一套调色板（不会出现"菜单鲜艳战场沉闷"的割裂感）
- **学**：字体与像素资产尺寸绑定（字号与像素网格对齐，不会出现抗锯齿漂浮字）
- **不学**：Cobalt Core 的整体卡牌 UI 排版（我们是打字 + 键盘可视化，信息架构完全不同）
- **不学**：过于复杂的角色动画（我们 P0 只有 1 个训练假人）

> **为什么选它为主方向**：Cobalt Core 在"信息密度高 + 视觉不吵"之间的平衡最接近打字肉鸽的诉求——屏幕上同时有键盘、HUD、敌人、特效、大量浮字，必须靠色块纪律保证不糊成一团。

### 2.2 Loop Hero（辅助参考）

- **学**：极简剪影 + 单色块主导 + 描边克制（背景几乎不画装饰物）
- **学**：战斗背景的层次做法——天空 / 远景 / 中景 / 地面四层，视觉深度靠色块饱和度而非细节量
- **不学**：Loop Hero 的单色灰暗基调（打字肉鸽需要比它更亮更多彩的反馈感）
- **不学**：圆形循环 UI（与我们键盘布局冲突）

### 2.3 Slay the Spire（像素 mod / 参考非原版）

- **学**：敌人描边的厚度表达（用 1-2 px 黑描边 + 单侧高光把角色从背景里"抠"出来）
- **学**：命中特效的"大而短"原则——6-10 帧爆发式动画，不留尾巴
- **不学**：StS 原版非像素风（我们不抄其原始美术，只参考其战斗反馈节奏）
- **不学**：卡牌叠加 UI（不适用）

---

## 3. 调色板（Resurrect-32）

**选色原则**：从 [Resurrect-64 (by Kerrie Lake)](https://lospec.com/palette-list/resurrect-64) 中挑选 32 色子集，覆盖以下用途：

| 分组 | 色位数 | 用途 |
|---|---|---|
| 稀有度主/描边配对 | 12（6 × 2） | common / rare / epic / legendary / mythic / cursed，每档 1 主色 + 1 深色描边 |
| 中性灰阶 | 5 | 纯黑 / 深灰 / 中灰 / 浅灰 / 纯白（用于描边、HUD 框、文字） |
| Accent 配对 | 6（3 × 2） | 暖（命中反馈橙/红）、冷（技能光青/蓝）、警示（boss 预警紫/品红），每种 1 主 + 1 高光 |
| 环境色 | 4 | 天空 / 地面 / 水/血 / 阴影底（战斗背景专用） |
| 预留 | 5 | 未来扩展（字母升级高亮、稀有词包浮字色等） |
| **合计** | **32** | |

**具体色值**（hex）在 `aigc-art/references/palette/resurrect-32.hex` 以及 GIMP 格式 `resurrect-32.gpl`。Aseprite Load Palette 直接指向 `godot/assets/palettes/resurrect-32.png`（Task 2 产出的 swatch 图）。

**约束**：
- 所有资产只能从 Resurrect-32 取色；禁止临时兑色
- `aigc-art/` Pipeline 的 palette_lock 步骤会把 SD 输出强制量化到 Resurrect-32，有超限直接闸门失败
- Aseprite 工作流中应 `Sprite > Color Mode > Indexed`，不允许 RGB 模式保存

**为什么 32 而不是全 64**：视觉层级简单（键帽 / HUD / 1 敌人 / 简单特效），32 色足以覆盖；强制 32 色也能防止后续"这关红得不一样"的拼贴感。

---

## 4. 字体（Fusion Pixel 12px）

**主选**：[Fusion Pixel 12px](https://github.com/TakWolf/fusion-pixel-font)
- 字号：12 px（一行整数倍对齐像素网格）
- 授权：SIL Open Font License 1.1（商用免费）
- 覆盖：简中 / 繁中 / 日韩 / 拉丁 / 数字
- 文件位置：`godot/assets/fonts/fusion-pixel-12px.ttf`（或 .otf）

**降级候选**（仅当字体实测失败时启用）：

| 候选 | 何时启用 | 降级原因记录位置 |
|---|---|---|
| 方正像素 12 | Fusion 在 CJK 2000 字实测中某字形糊 / 错 | 本文档 §4 末尾"实测记录" |
| Zfull-GB | 方正像素 12 授权或供给不可用 | 同上 |

**字体唯一原则**：全游戏仅一种字体，不用斜体 / 粗体 / 大字号变体。大小感靠色块对比表达（例如伤害数字用反差色 + 描边而非大字号）。

### 实测记录（AC6）

> 本段在 Task 2 完成字体实测后回填。至少包含：
> - 测试分辨率：1080p / 1440p
> - 测试样本：从 `src/data-json/words.json` 抽 200 个 zh 词 + 英文 a-z/A-Z/0-9
> - 结论：能辨别 ✅ / 不能辨别 ❌
> - 若不能辨别 → 降级候选 + 理由

**状态**：⏳ 待实测

---

## 5. 描边与动画规则细节

### 描边

- **角色类**（敌人、玩家、NPC）：必须 1px 全黑外描边；内部可加 1px 深色内线强化体积
- **物件类**（键帽、道具、遗物图标）：必须 1px 黑描边；键帽允许 2px 强化厚度感
- **HUD 类**（生命条、计分面板、技能槽）：可选 2px 或无描边；无描边时背景需自带足够对比
- **特效类**（命中闪光、技能光环）：不描边（透明混合，描边会产生脏边）
- **背景类**：不描边（深度靠饱和度 / 明度差实现，描边会破坏层次）

### 动画

- **帧率**：12 fps（83 ms/帧）；Aseprite 里一律 `Tag > Frame Duration = 83`
- **动画长度**（P0 约束）：
  - idle 循环：4 帧（呼吸 / 轻晃）
  - hit（受击）：2 帧（短促闪烁）
  - death（倒下）：6 帧
  - 命中特效：normal 6 帧 / crit 8 帧 / skill 10 帧
- **禁止**：过 12 帧的动画（P0 内一律拆），避免陷入"一个敌人画半天"的无底洞

---

## 6. Aseprite 导出纪律

### 通用设置

| 项 | 值 |
|---|---|
| Color Mode | Indexed（需挂载 Resurrect-32 palette） |
| 导出格式 | PNG-8（indexed）或 PNG-32（带透明） |
| **禁用** | PNG-24 抗锯齿 |
| Filter | Nearest |
| Sampling | Nearest |
| Background | 透明（不是纯黑也不是纯白） |

### Spritesheet 导出

- 类型：`horizontal`（横向拼接）
- 同名 `.json` sidecar（`--sheet-data` 选项），Godot 端由 `AnimatedSprite2D.SpriteFrames` 读取

### 命令行示例

```bash
# 敌人 idle 导出（已在 art-source/57-3/README.md 落地）
aseprite -b idle.aseprite \
  --sheet ../../godot/assets/sprites/enemies/dummy/idle.png \
  --sheet-type horizontal \
  --data ../../godot/assets/sprites/enemies/dummy/idle.json
```

---

## 7. Godot 整数缩放配置（AC5 验证依据）

Story 57.4 正式建 `project.godot` 时必须按以下配置：

```
[display]
window/size/viewport_width = 640
window/size/viewport_height = 360
window/size/window_width_override = 1280
window/size/window_height_override = 720
window/stretch/mode = "viewport"
window/stretch/aspect = "keep"

[rendering]
textures/canvas_textures/default_texture_filter = 0  # nearest — 必须
```

**AC5 验证约定**：任意资产在 ×2/×3/×4 三档缩放下，像素边缘须完全对齐整数网格，不允许出现抗锯齿 / 插值模糊。Task 8 在 sandbox Godot 工程中截图比对通过为准。

---

## 8. P0 资产清单

> 本表与 Story 57.3 的 AC3/AC4/AC8 完全对齐；每个 Task 完成后回填实际产出行。

| 类别 | 目标路径 | 尺寸 | 帧数 | 用途 | 对应 Task | 对应 Story | 状态 |
|---|---|---|---|---|---|---|---|
| 调色板 | `godot/assets/palettes/resurrect-32.png` | 64×32（8×4 网格，每色 8×8） | 1 | 全库取色锚 | Task 2 | 57.3 | ⏳ |
| 字体 | `godot/assets/fonts/fusion-pixel-12px.ttf` | — | — | 全游戏唯一字体 | Task 2 | 57.3 / 57.6 | ⏳ |
| 键帽 | `godot/assets/sprites/keyboard/key_{a-z}.png` × 26 | 128×32（4 帧 spritesheet） | 4 态 | 键盘可视化 | Task 3 | 57.5 | ⏳ |
| HUD 生命条 | `godot/assets/sprites/hud/hud_hp_bar.png` + `.json` | 建议 32×16~64×32 | 1（9-slice） | 战斗 HUD | Task 4 | 57.6 | ⏳ |
| HUD 计分 | `godot/assets/sprites/hud/hud_score_panel.png` + `.json` | 建议 32×16~64×32 | 1（9-slice） | 战斗 HUD | Task 4 | 57.6 | ⏳ |
| HUD 计时器 | `godot/assets/sprites/hud/hud_timer.png` + `.json` | 建议 32×16~64×32 | 1（9-slice） | 战斗 HUD | Task 4 | 57.6 | ⏳ |
| HUD 技能槽 | `godot/assets/sprites/hud/hud_skill_slot.png` + `.json` | 建议 32×16~64×32 | 1（9-slice） | 战斗 HUD（复用 4 次） | Task 4 | 57.6 | ⏳ |
| 假人 idle | `godot/assets/sprites/enemies/dummy/idle.png` | 128×48（4 帧 × 32×48） | 4 | 训练假人呼吸循环 | Task 5 | 57.6 | ⏳ |
| 假人 hit | `godot/assets/sprites/enemies/dummy/hit.png` | 64×48（2 帧 × 32×48） | 2 | 受击 flash | Task 5 | 57.6 | ⏳ |
| 假人 death | `godot/assets/sprites/enemies/dummy/death.png` | 192×48（6 帧 × 32×48） | 6 | 倒下/碎裂 | Task 5 | 57.6 | ⏳ |
| 命中特效（普通） | `godot/assets/sprites/fx/hit_normal.png` | 288×48（6 帧 × 48×48） | 6 | 普通命中反馈 | Task 6 | 57.6 | ⏳ |
| 命中特效（暴击） | `godot/assets/sprites/fx/hit_crit.png` | 384×48（8 帧 × 48×48） | 8 | 暴击反馈 | Task 6 | 57.6 | ⏳ |
| 命中特效（技能） | `godot/assets/sprites/fx/hit_skill.png` | 480×48（10 帧 × 48×48） | 10 | 技能命中反馈 | Task 6 | 57.6 | ⏳ |
| 战斗背景 | `godot/assets/sprites/backgrounds/battle_01.png` | 640×360 | 1 | 战斗场景背板 | Task 7 | 57.6 | ⏳ |

**Aseprite 源镜像**：上表每一行对应的 `.aseprite` 源文件路径规则：
`art-source/57-3/<类别子目录>/<同名>.aseprite`

示例对应关系：
- `godot/assets/sprites/keyboard/key_q.png` ↔ `art-source/57-3/keyboard/key_q.aseprite`
- `godot/assets/sprites/enemies/dummy/idle.png` ↔ `art-source/57-3/enemies/dummy/idle.aseprite`

**状态图例**：⏳ 待产 / 🎨 草稿中 / 🔧 Aseprite polish / ✅ 入库 / ⚠️ 需返工

---

## 9. 与 Epic 55 的关系（重要：避免混淆）

| 维度 | Epic 55 | 本 Story（57.3） |
|---|---|---|
| 目标平台 | TS + DOM/CSS（Web / Electron） | Godot 4 + C#（Desktop） |
| 字体 | Press Start 2P（仅英文） | Fusion Pixel 12px（含 CJK） |
| 风格来源 | Balatro 参考 + CSS tokens | Cobalt Core（主）/ Loop Hero / StS + Aseprite 手绘 |
| 资产形式 | CSS variables + steps() 动画 | PNG spritesheet + 9-slice JSON |
| 输出目录 | `src/src/style.css` | `godot/assets/**` + `art-source/57-3/**` |

**不得复用 Epic 55 的任何 CSS token 或 Press Start 2P 字体**。TS 版本在 Godot 端完成发布迁移前继续沿用 CSS theming；两套像素风**故意并存**，直到 Godot 端完全替换 TS 版本。

---

## 10. 变更记录

| 版本 | 日期 | 变更 | 作者 |
|---|---|---|---|
| v1.0 | 2026-04-15 | 首版；Story 57.3 Task 1 落地；锁定 6 项锚点 + 主方向（Cobalt Core）+ P0 清单骨架 | dev-story agent |
