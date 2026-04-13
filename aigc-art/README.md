# aigc-art — 像素美术 AIGC 辅助工作流

为打字肉鸽（Godot 迁移 Epic 57）的像素美术资产生成搭建的半自动化工作流。**AI 仅生成 draft，最终入库必须经 Aseprite 人工清理。**

> 🚫 **红线**：本目录的任何自动输出**不得**直接进入 `godot/assets/`。所有最终资产必须经 `art-source/57-3/**.aseprite` 人工清理、Aseprite CLI 导出后才能入库。违反此原则会污染风格库（Story 57.3 AC1）。

---

## 架构一览

```
Input: art-style-guide.md + resurrect-32.png + prompts/*.yaml
  │
  ▼
① Draft Gen (Replicate API + Flux-dev + retro-pixel-flux LoRA)
  │   每资产 batch_size=8-12
  ▼
② Postprocess (palette quantize → nearest downscale → alpha clean)
  │   scripts/palette_lock.py
  ▼
③ Auto-Eval (五项闸门：调色板/尺寸/透明度/剪影锐度/CLIP 相似度)
  │   scripts/checks.py  阈值见 eval/thresholds.yaml
  │   CLIP 阈值紧 = 0.8，自动重试 3 次直到 ≥1 张过闸
  ▼
④ Human Pick (CLI/TUI)
  │   scripts/pick.py
  ▼
⑤ Manual Polish (Aseprite，入 art-source/57-3/)
  │
  ▼
⑥ Export (Aseprite CLI → godot/assets/)
  │   scripts/export.py
  ▼
⑦ Regression (入库前 CLIP 风格漂移检测)
  │   scripts/regression.py
  ▼
[godot/assets/] ← 最终入库
```

---

## 目录分工

| 目录 | 角色 | 入库？ |
|---|---|---|
| `aigc-art/prompts/` | 版本化 prompt 模板（YAML） | ✅ |
| `aigc-art/pipelines/` | ComfyUI workflow / Replicate 调用配置 | ✅ |
| `aigc-art/scripts/` | Python 编排脚本 | ✅ |
| `aigc-art/eval/` | 阈值配置 + 金标 manifest（纯文本，不含图） | ✅ |
| `aigc-art/references/mood-board/` | 参考游戏截图 | 🚫 不入库（合规） |
| `aigc-art/references/golden/` | CLIP 评测金标（商业截图） | 🚫 不入库（合规） |
| `aigc-art/references/palette/resurrect-32.png` | 调色板 swatch | ✅ |
| `aigc-art/runs/**/raw/` | SD 原始输出（可再生） | 🚫 不入库 |
| `aigc-art/runs/**/postprocessed/` | 后处理后候选 | 🚫 不入库 |
| `aigc-art/runs/**/selected.png` | 人工选定 draft | 🚫 不入库 |
| `aigc-art/runs/**/metadata.json` | 本次 run 元数据 | ✅（保留以便复现） |
| `aigc-art/runs/**/eval-report.json` | 评测结果 | ✅ |
| `art-source/57-3/*.aseprite` | Aseprite 源（人工清理过） | ✅ |
| `godot/assets/**/*.png` | 最终导出（给 Godot 消费） | ✅ |

`.gitignore` 已按上表配置。

---

## 启动决策（2026-04-14 拍板）

| 决策点 | 选择 | 理由 |
|---|---|---|
| **模型托管** | Replicate API（起步） | 零运维、$0.025/img、P0 全量仅 ~$15 |
| **底模 + LoRA** | Flux-dev + retro-pixel-flux | Flux 像素风质量超 SDXL；LoRA 风格贴近 Loop Hero/StS |
| **金标来源** | 商业游戏截图（仅本地评测用，不入库） | 合规路径见下 |
| **CLIP 阈值** | 0.8（紧） | batch_size 相应提到 8-12，自动重试 3 次 |
| **HUD 策略** | AI 生纹理灵感，9-slice 结构人工拼 | HUD 几何精度 AI 搞不定 |

**演进计划**：
- **阶段 1（当前）**：Flux-dev + retro-pixel-flux 跑通 P0
- **阶段 2**：Story 57.3 完成后积累 ≥30 张 Aseprite 清理过的金标
- **阶段 3**：用自家金标 fine-tune `typerogue-pixel.v1` LoRA，replace 通用 LoRA
- **阶段 4**：P1 资产（boss / 遗物图标 / 技能图标）用自家 LoRA 产出

---

## 合规纪律（严格执行）

### 关于商业截图金标

- **仅**用于 `scripts/checks.py` 的 CLIP cosine similarity 计算
- **禁止**喂给 LoRA 训练数据集（侵权）
- **禁止**入 git（`.gitignore` 已配）
- **禁止**作为 prompt 的 image reference 输入 SD / Flux
- `aigc-art/references/golden/` 目录内的文件由使用者本地维护
- `eval/golden-manifest.yaml` 只记录文件名 + 来源游戏 + 用途描述（不含图本身），他人克隆仓库后按清单自行准备

### 关于模型 License

- Flux-dev：非商用 License — **但 Replicate 已购买商用授权**，通过 Replicate 调用合规
- retro-pixel-flux LoRA：见 HuggingFace 页面 License（大多为 CreativeML Open RAIL-M，商用可）
- 未来 fine-tune 自家 LoRA 时，dataset 必须 100% 自产/Aseprite 人工绘制

### 关于 Prompt 版本化

- 每个 asset 一个 `{asset_id}.v{N}.yaml` 文件
- 首次成功跑通 → `.v1`
- 调整后明显变好 → `.v2`，**保留 v1**，commit message 写清差异
- 禁止热改 line 内容又不 bump 版本号

---

## Quickstart

```bash
# 0. 装依赖
pip install pillow pyyaml replicate clip-retrieval numpy scipy

# 1. 配 Replicate token
export REPLICATE_API_TOKEN=r8_xxx

# 2. 准备金标（本地，不入库）
mkdir -p references/golden
# 手动放 3-5 张 Loop Hero / Cobalt Core / StS 截图到上面

# 3. 首次 run：dummy enemy（验证 pipeline）
python scripts/gen.py --prompt prompts/enemy-dummy.v1.yaml

# 4. 看结果
ls runs/$(date +%F)_enemy-dummy/postprocessed/
cat runs/$(date +%F)_enemy-dummy/eval-report.json

# 5. 人工挑选
python scripts/pick.py runs/$(date +%F)_enemy-dummy/

# 6. 打开 Aseprite 清理（手动步骤）
#    把 selected.png 拖进新建 .aseprite，重绘/修线

# 7. 导出到 godot/assets/
python scripts/export.py art-source/57-3/enemies/dummy/idle.aseprite

# 8. 入库前 regression
python scripts/regression.py godot/assets/sprites/enemies/dummy/idle.png
```

---

## 反模式警告

| 反模式 | 代价 |
|---|---|
| AI 直接导出到 `godot/assets/` | 风格崩，Story 57.3 AC1 违反 |
| 单个巨型 prompt 生成所有资产 | 风格漂移无法定位 |
| 跳过评测闸门直接 human pick | 调色板超限 / 亚像素糊边看不出 |
| 改 prompt 不 bump 版本 | 无法复现 / 无法回滚 |
| AI 生成最终 spritesheet | 帧间连续性差（抖） |
| 商业金标入库 or 喂 LoRA | 版权风险 |
| 阈值不过就降阈值 | 永久降标，迟早崩 |

---

## 相关文档

- [Story 57.3: 美术风格指南与 P0 资产](../docs/implementation-artifacts/57-3-art-style-guide-p0-assets.md) — 本工作流服务的 Story
- [Epic 57: Godot 迁移与美术重做](../docs/stories/epic-57-godot-migration.md)
- `docs/art-style-guide.md`（Story 57.3 Task 1 产出，届时在此交叉引用）
- `prompts/_base.yaml` — 所有 asset prompt 的共享基线
- `eval/thresholds.yaml` — 五项评测闸门阈值
