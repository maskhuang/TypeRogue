# Story 57.3: 美术风格指南与 P0 资产

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 准备在 Godot 4 + C# 端重写打字肉鸽的开发者/美术,
I want 一份固化 6 项美术锚点的风格指南 + 一套可直接接入 Godot 的 P0 最小资产包（键帽 / HUD / 1 个敌人 / 命中特效 / 战斗背景 / 字体）,
so that Story 57.5（键盘输入闭环）和 57.6（战斗最小闭环 ◆ 里程碑）可以直接拿资产搭场景，不需要反复在"美术决策未定"和"代码先行"之间回环。

## Acceptance Criteria

1. **AC1: 风格指南文档** — 新增 `docs/art-style-guide.md`，固化 6 项锚点（**一旦通过即不可改**，后续资产必须对齐）：
   - **逻辑分辨率**：640×360（整数缩放到 720p ×2 / 1080p ×3 / 1440p ×4）
   - **键帽规格**：32×32 px
   - **调色板**：从 [Resurrect-64](https://lospec.com/palette-list/resurrect-64) 选 32 色子集，覆盖 6 种稀有度（common / rare / epic / legendary / mythic / cursed）+ 中性灰阶 + 3 种 accent（暖 / 冷 / 警示）
   - **字体**：[Fusion Pixel 12px](https://github.com/TakWolf/fusion-pixel-font)（开源含 CJK），降级候选：方正像素 12 / Zfull-GB
   - **描边规则**：所有角色 / 物件 1px 全黑外描边，HUD / 键帽可选 2px 或无
   - **动画帧率**：12 fps（≈ 每帧 83ms）
2. **AC2: Mood board** — `docs/art-style-guide.md` 内含"参考风格"段落，列 3 款商业作品（建议：Loop Hero / Cobalt Core / Slay the Spire 像素 mod 或等价参考），每款标注"我们学什么 / 不学什么"，最终选一款作为"主方向"。
3. **AC3: P0 资产清单交付** — 新目录 `godot/assets/`（此 Story 首次建立）包含：
   - `godot/assets/sprites/keyboard/` — 26 键键帽 `key_{letter}.png`，每个 4 态 spritesheet（idle / pressed / matched / highlighted），横向 4 帧拼接（128×32）
   - `godot/assets/sprites/hud/` — HUD 框 9-slice：生命条 / 计分面板 / 计时器 / 技能槽（4 个 `.png` + 同名 `.json` 描述 9-slice 边距）
   - `godot/assets/sprites/enemies/dummy/` — 1 个训练假人敌人：`idle.png`（4 帧 spritesheet 横排）/ `hit.png`（2 帧）/ `death.png`（6 帧）
   - `godot/assets/sprites/fx/` — 3 种命中特效 spritesheet：`hit_normal.png`（6 帧）/ `hit_crit.png`（8 帧）/ `hit_skill.png`（10 帧）
   - `godot/assets/sprites/backgrounds/battle_01.png` — 1 张 640×360 战斗背景
   - `godot/assets/fonts/fusion-pixel-12px.ttf`（或 `.otf`）
4. **AC4: Aseprite 源文件归档** — 新目录 `art-source/57-3/` 存放所有资产的 `.aseprite` 源文件，命名与 `godot/assets/` 镜像（`art-source/57-3/keyboard/key_a.aseprite` ↔ `godot/assets/sprites/keyboard/key_a.png`）。Aseprite 导出设置统一：Nearest neighbor / PNG-8 / 透明背景。
5. **AC5: 整数网格无糊边** — 所有资产在 Godot viewport 640×360 + `stretch_mode = viewport` + `stretch_aspect = keep` + `texture_filter = nearest` 配置下，×2/×3/×4 缩放后**零亚像素模糊**。验收方式：打开 Godot，建一个最小 TestScene.tscn 显示任一资产，截图比对。
6. **AC6: 字体可读性实测** — Fusion Pixel 12px 字体在 1080p 和 1440p 两种分辨率下，中文常用 2000 字 + 英文 a-z / A-Z / 0-9 实测"能辨别"。不行则按 AC1 降级候选切换并在 art-style-guide.md 记录为什么。
7. **AC7: 调色板文件** — `godot/assets/palettes/resurrect-32.png` 导出一张 32 色调色板 swatch 图（每色 8×8 块，单行或 8×4 网格），方便后续资产作者在 Aseprite 中 Load Palette 复用。
8. **AC8: 资产清单表** — `docs/art-style-guide.md` 末尾含 "P0 资产清单" 表格：文件路径 / 尺寸 / 帧数 / 用途 / 对应 Story，与 AC3/AC4 完全一致。
9. **AC9: 零 src/ 改动** — 本 Story 不改 `src/` 下任何文件（TS 端继续用 Epic 55 的 CSS/Press Start 2P 风格）。如发现需要改动，拆独立 follow-up Story。
10. **AC10: Godot 项目骨架就绪标志** — 本 Story **不**创建 `project.godot`（那是 57.4 的职责），只创建 `godot/assets/` 与 `godot/assets/palettes/` 与 `godot/assets/fonts/` 目录及其内部资产文件。57.4 启动时把 `godot/assets/` import 到 Godot 项目即可。

## Tasks / Subtasks

- [x] **Task 1: 风格指南文档骨架 (AC: #1, #2, #8)**
  - [x] 新建 `docs/art-style-guide.md`，顶部固化 6 项锚点（表格形式，每项一行决策理由）
  - [x] 写 Mood board 段落：收集 3 款参考游戏截图或 Lospec 链接，每款 2~3 句"学什么 / 不学什么"
  - [x] 指定"主方向"（Cobalt Core 高对比色块 + 信息密度平衡为主方向；Loop Hero / StS 为辅助参考）
  - [x] 末尾预留 "P0 资产清单" 表格（14 行骨架已就位，Task 2-7 完成后逐行回填状态）

- [ ] **Task 2: 调色板与字体落地 (AC: #1, #6, #7)**
  - [ ] 从 Resurrect-64 (Kerrie Lake) 选 32 色子集：写明每色的 hex + 用途（"common 底 / rare 蓝 / ..."）
  - [ ] 用 Aseprite 或 GIMP 手工拼一张 `godot/assets/palettes/resurrect-32.png`（8×4 网格，每色 8×8 块，总 64×32）
  - [ ] 下载 Fusion Pixel 12px TTF/OTF，放到 `godot/assets/fonts/fusion-pixel-12px.ttf`
  - [ ] **字体实测**（AC6）：在 1080p / 1440p 显示器下用临时 HTML 或 Godot Label 渲染中文常用字（从 `src/data-json/words.json` 抽 200 个 zh 词） + 英文 a-z A-Z 0-9
  - [ ] 实测结论写入 `art-style-guide.md`；若不可读则换方正像素 12 / Zfull-GB，更新 AC1 决策记录

- [ ] **Task 3: 键帽资产 (AC: #3, #4, #5)**
  - [ ] 先画 1 个键帽（例如 Q 键）作为样板：32×32 底板 + 4 态（idle / pressed / matched / highlighted），2px 暗色描边 + 高光角
  - [ ] Aseprite 源 `art-source/57-3/keyboard/key_q.aseprite`
  - [ ] 导出 `godot/assets/sprites/keyboard/key_q.png`（128×32 横向 4 帧）
  - [ ] **在 Godot 临时 TestScene 里验证整数缩放无糊边**（AC5）
  - [ ] 验证通过后批量生产 26 键（A-Z），同样结构
  - [ ] 命名规则：`key_{letter}.png` + `key_{letter}.aseprite`（letter 小写）

- [ ] **Task 4: HUD 框资产 (AC: #3, #4)**
  - [ ] 设计 4 个 HUD 组件 9-slice 图（宽高自定，建议 32×16 到 64×32 之间）：
    - `hud_hp_bar.png` — 生命条框（左端帽 / 中段 repeat / 右端帽）
    - `hud_score_panel.png` — 计分面板背板
    - `hud_timer.png` — 计时器框
    - `hud_skill_slot.png` — 技能槽（单槽，后续 57.5 复用 4 次）
  - [ ] 每个 PNG 同名 `.json` 描述 9-slice 边距：`{ "top": N, "right": N, "bottom": N, "left": N }`
  - [ ] Aseprite 源归档 `art-source/57-3/hud/`

- [ ] **Task 5: 训练假人敌人 (AC: #3, #4)**
  - [ ] 设计 1 个"训练假人"敌人（dummy），设计语言：木桩 / 稻草人 / 沙袋三选一
  - [ ] 3 个 spritesheet（帧尺寸统一 32×48，角色居中）：
    - `idle.png` — 4 帧（呼吸 / 轻晃）
    - `hit.png` — 2 帧（受击 flash）
    - `death.png` — 6 帧（倒下 / 碎裂）
  - [ ] `art-source/57-3/enemies/dummy/*.aseprite`
  - [ ] 12 fps 测试：在 Aseprite 内预览确认节奏正确

- [ ] **Task 6: 命中特效 (AC: #3, #4)**
  - [ ] 3 种命中 spritesheet（统一 48×48 帧，中心对齐）：
    - `hit_normal.png` — 6 帧（小型白 / 黄色闪光 + 溅射）
    - `hit_crit.png` — 8 帧（红 / 橙 大型爆炸 + 放射线）
    - `hit_skill.png` — 10 帧（青 / 蓝技能光环 + 粒子）
  - [ ] `art-source/57-3/fx/*.aseprite`
  - [ ] 所有特效底色透明（非黑）

- [ ] **Task 7: 战斗背景 (AC: #3, #4)**
  - [ ] `battle_01.png` — 640×360 整屏背景，建议简单分层：天空 / 远景山 / 中景树 / 地面（不画任何装饰物，留空给敌人 + HUD 叠加）
  - [ ] 饱和度适中（不可抢敌人视觉焦点）
  - [ ] `art-source/57-3/backgrounds/battle_01.aseprite`

- [ ] **Task 8: Godot 缩放验证 + 资产清单回填 (AC: #5, #8, #10)**
  - [ ] 临时 Godot 测试（**本 Story 不建 project.godot**，可用独立 sandbox Godot 工程）：
    - 窗口 1280×720，viewport 640×360，`stretch_mode = viewport`，`texture_filter = nearest`
    - 放一个 Sprite2D 依次显示 key_q / dummy idle / hit_crit / battle_01
    - 截图 ×2/×3/×4 三档，确认**零亚像素糊边**
  - [ ] 回填 `docs/art-style-guide.md` 的 "P0 资产清单" 表格
  - [ ] 若 sandbox 里发现任何资产不合规则（例如 1px 奇偶线错位），打回对应 Task 修
  - [ ] 本 Story**不**创建 `godot/project.godot`（AC10）

## Dev Notes

### AIGC 辅助流程（已搭建，2026-04-14）

本 Story 的美术生产**可选**走 `aigc-art/` 目录下的半自动化工作流：

- **定位**：AI 仅生成 draft 候选，**最终入库仍必须经 Aseprite 人工清理**。严格遵守 Story AC1 的风格锚点。
- **决策已拍板**：Replicate API + Flux-dev + retro-pixel-flux LoRA；CLIP 阈值 0.8 紧模式；金标用商业截图（仅本地评测，不入库）。
- **Task 级建议**：
  - Task 3（26 键帽）/ Task 5（dummy 敌人）/ Task 6（命中特效）/ Task 7（战斗背景）→ **适合**走 AIGC draft
  - Task 4（HUD 9-slice）→ **半介入**：AI 只生纹理灵感，几何结构人工拼（见 `aigc-art/prompts/hud-texture.v1.yaml`）
  - Task 1（风格指南）/ Task 2（调色板+字体）/ Task 8（Godot 缩放验证）→ **纯人工**
- **入口**：`aigc-art/README.md` 含架构图 + quickstart + 合规纪律
- **红线**：AI 原始输出**不得**直接进 `godot/assets/`，必经 `art-source/57-3/**.aseprite` 中转
- **Aseprite polish checklist**：每个 prompt YAML 末尾有手工验收清单（例如 `enemy-dummy.v1.yaml` 的 `polish_checklist` 段）

若选择**不走** AIGC 辅助（纯手绘），本 Story 任何 AC 都不需要调整。

### 与 Epic 55 的关系（必读，避免混淆）

**Epic 55（像素风视觉统一改造）是 TS/DOM 端 CSS theming，与本 Story 的 Godot 像素资产完全独立**：

| 维度 | Epic 55 | 本 Story（57.3） |
|---|---|---|
| 目标平台 | TS + DOM/CSS（Web / Electron） | Godot 4 + C#（Desktop） |
| 字体 | Press Start 2P（仅英文） | Fusion Pixel 12px（含 CJK） |
| 风格来源 | Balatro 参考 + CSS tokens | Loop Hero / Cobalt Core / StS 参考 + Aseprite 手绘 |
| 资产形式 | CSS variables + steps() 动画 | PNG spritesheet + 9-slice JSON |
| 输出目录 | `src/src/style.css` | `godot/assets/**` + `art-source/57-3/**` |

**不得复用 Epic 55 的任何 CSS token 或 Press Start 2P 字体**。这是故意的：Godot 端像素美术从零做起，Epic 55 的 CSS theming 仅用于 TS 版本继续发布期间维持视觉统一。

### 为什么 32 色子集而不是全 64 色？

Resurrect-64 原版 64 色用于大型像素艺术。打字肉鸽视觉层级简单（键帽 / HUD / 1 个敌人 / 简单特效），32 色足够覆盖：
- 6 种稀有度 × 2 色（主 + 描边）= 12 色
- 中性灰阶 5 色
- 3 种 accent 色 × 2 色（主 + 高光）= 6 色
- 环境色（天 / 地 / 水 / 血）4 色
- 预留 5 色

限定 32 色的好处：强迫整个美术库调性统一，避免"这关红得不一样"的拼贴感。

### 为什么选 Fusion Pixel 12px？

| 候选 | 大小 | CJK | 英文 | 开源 | 备选理由 |
|---|---|---|---|---|---|
| **Fusion Pixel 12px** | 12px | ✓ 含简中 繁中 日韩 | ✓ 工整 | SIL OFL | 主选 |
| 方正像素 12 | 12px | ✓ 简中 | ✓ | 免费商用 | Fusion 不行时用 |
| Zfull-GB | 12/14px | ✓ 简中 | ✓ | 免费个人 | 最后备选 |
| Press Start 2P | 6-8px 视觉 | ✗ 无 CJK | ✓ | Apache 2.0 | **不适用**（本 Story 需要中文） |
| Monogram | 12px | ✗ 仅拉丁 | ✓ | CC0 | **不适用** |

Epic 55 用 Press Start 2P 因为 TS 版本显示的是英文词库；Godot 端将要显示中文词库（见 `src/data-json/words.json` 的 `zh` 段），**必须用含 CJK 的像素字体**。

### 关于 "先 P0 再 P1"

明确本 Story **只做 P0**：能跑通 57.5 键盘 + 57.6 最小战斗的最小集。P1 资产（多个敌人 / 多张背景 / 遗物图标 / 技能图标 / boss）留给未来 Story（可能是 57-7 的子 Story 或独立美术 Story）。**不要在本 Story 里多画**，这是反复踩过的坑（美术工作无底洞）。

### Aseprite 导出纪律

所有 PNG 必须：
- 透明背景（非黑 / 非白）
- 导出设置：`PNG-8` (indexed) 或 `PNG-32`，**禁止 PNG-24 抗锯齿**
- Filter: **Nearest**，Sampling: **Nearest**
- Frame metadata 存同名 `.json`（Aseprite 的 `--sheet-data` 选项），后续 Godot 端用 `AnimatedSprite2D.SpriteFrames` 读取

Aseprite 命令行批量导出示例（记到 `art-source/57-3/README.md`）：
```bash
aseprite -b idle.aseprite \
  --sheet ../../godot/assets/sprites/enemies/dummy/idle.png \
  --sheet-type horizontal \
  --data ../../godot/assets/sprites/enemies/dummy/idle.json
```

### Godot 整数缩放配置（AC5 验证要点）

在 57.4 正式建 Godot 项目时的配置预告（本 Story 只是临时 sandbox 验证）：

```
# project.godot 片段
[display]
window/size/viewport_width = 640
window/size/viewport_height = 360
window/size/window_width_override = 1280
window/size/window_height_override = 720
window/stretch/mode = "viewport"
window/stretch/aspect = "keep"

[rendering]
textures/canvas_textures/default_texture_filter = 0  # nearest
```

`default_texture_filter = 0` 是 nearest，**必须**；否则整数缩放会糊成抗锯齿效果。

### 关键决策（一次定死，不可改）

- **字体 1 种打天下**：全游戏仅 Fusion Pixel 12px 一种字体，不用大字号 / 斜体变体。大小感靠色块对比。
- **颜色 32 色打天下**：所有资产只从 `resurrect-32.png` 调色板取色，Aseprite 的 `Edit > Replace Color` 可批量校正。
- **敌人大小规格 32×48**：Story 57.6 里只有 1 个敌人，未来 57.7 添加更多敌人时仍以此为基础规格（Boss 可放大到 64×96 或 96×128）。
- **键帽 32×32 是锁死量**：后续 57.5 键盘可视化按此定位（10 列 × 3 行，行间偏移遵循 QWERTY 物理布局，间距按像素网格定）。

### Project Structure Notes

- 本 Story 首次引入 `godot/` 顶层目录和 `art-source/` 顶层目录
- `godot/` 内**只有 assets/**，**不含 project.godot**（57.4 职责）
- `art-source/57-3/` 作为 Aseprite 源归档，未来每个美术 Story 按编号开子目录（57-3 / 57-7-enemies / 57-8-menu 等）
- `.gitignore` 需新增：忽略 `godot/.godot/`、`art-source/**/*.aseprite-lock` 等临时文件（可在本 Story 一并加）
- PNG 是否入库？**是**。aseprite 源 + 导出 PNG 都入库。`.aseprite` 文件相对较小（几 KB 到几十 KB），值得版本化；PNG 作为 "derived artifacts" 在 Godot 端直接消费。不走 LFS。

### References

- [Source: docs/stories/epic-57-godot-migration.md#Story-57-3] — Epic 规划段落
- [Source: docs/implementation-artifacts/57-2-battle-flow-documentation.md] — 前一 Story（事件流文档），虽不直接相关但 AC 模板可参考
- [Source: docs/stories/epic-55-pixel-visual-overhaul.md] — Epic 55 CSS theming，用于理解"为什么两套像素风并存"
- [Source: https://lospec.com/palette-list/resurrect-64] — 调色板原始来源
- [Source: https://github.com/TakWolf/fusion-pixel-font] — 字体官方仓库

## Dev Agent Record

### Agent Model Used

claude-opus-4-6[1m] (dev-story workflow, 2026-04-15)

### Debug Log References

- AIGC 工作流现状盘点（`aigc-art/runs/2026-04-13_enemy-dummy/`）：仅 enemy-dummy idle 跑过 1 次真实 Replicate 调用（3 attempts → 1 image → 0 通过评测闸门），hit / death 未跑，key-cap / fx / bg prompts 未写。Task 3-7 需先补 prompts + 诊断失败原因再启动。

### Completion Notes List

**Task 1 完成（2026-04-15）**：
- 产出 `docs/art-style-guide.md` v1.0（10 大节 + P0 资产清单表）
- 锚点全部锁死：640×360 逻辑分辨率、32×32 键帽、Resurrect-32 调色板、Fusion Pixel 12px 字体、1px 角色描边、12 fps 动画
- Mood board 三款参考全就位；**主方向定为 Cobalt Core**（理由：信息密度高 + 视觉不吵的平衡最接近打字肉鸽 HUD + 浮字的诉求）
- P0 资产清单表 14 行骨架已建，每行含路径/尺寸/帧数/用途/对应 Task/对应 Story/状态列，Task 2-7 落地后回填状态与实际产出
- 字体实测结论段（AC6）已预留占位，待 Task 2 字体下载 + 1080p/1440p 实测后回填
- 与 Epic 55 的隔离关系单列一节，明确不得复用 CSS token / Press Start 2P 字体

**后续 Task 的已知阻塞**：
- Task 2：字体下载可在线进行，但 1080p/1440p 字体实测需用户本机操作
- Task 3-7：需补齐 `aigc-art/prompts/` 下 key-cap / hit-fx / battle-bg 三个缺失 prompt；diagnose enemy-dummy idle 首跑失败原因后再决定是否 bump 到 v2
- Task 8：Godot sandbox 缩放验证需用户本机 Godot 编辑器操作
- AC4（Aseprite 源归档）/ AC5（Godot 实测）/ AC6（字体实测）本质上都需要人工环节，dev-story agent 无法一次性闭环

### File List

- `docs/art-style-guide.md`（新增，Task 1 产出）
- `docs/implementation-artifacts/sprint-status.yaml`（修改：57-3 ready-for-dev → in-progress）
- `docs/implementation-artifacts/57-3-art-style-guide-p0-assets.md`（修改：Task 1 勾选 + Dev Agent Record 回填）
