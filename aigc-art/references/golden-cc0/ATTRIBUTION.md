# CC0 Golden References — Attribution

本目录下的参考图全部采自 **OpenGameArt.org**，License 均为 **CC0 (Creative Commons Zero / Public Domain)**，可**无限制**用于任何商业/非商业项目，无需署名。

尽管 CC0 不强制署名，**本项目仍保留原作者归属**作为美术社区礼仪：

| 文件 | 来源 | 作者 | License | 原尺寸 | 用途 |
|---|---|---|---|---|---|
| `enemy_andhegames_creatures.png` | [OpenGameArt — Assorted 32x32 creatures](https://opengameart.org/content/assorted-32x32-creatures) | [AndHeGames](https://opengameart.org/users/andhegames) | CC0 | 288×288 (64 个 32×32 精灵) | `enemy-*` CLIP 风格 golden |
| `enemy_andhegames_more_creatures.png` | [OpenGameArt — More assorted 32x32 creatures](https://opengameart.org/content/more-assorted-32x32-creatures) | [AndHeGames](https://opengameart.org/users/andhegames) | CC0 | 320×192 | `enemy-*` CLIP 风格 golden |
| `enemy_reemax_zombie_skeleton.png` | [OpenGameArt — Zombie and Skeleton 32x48](https://opengameart.org/content/zombie-and-skeleton-32x48) | Reemax (scale/animate) + artisticdude (原图) | CC0 | 288×256 | `enemy-dummy` 权威 golden — **尺寸 32×48 完全匹配** |

## 使用范围（严格）

这些图**仅用于**：
1. `scripts/checks.py` 的 `check_style_similarity()` — 喂 CLIP embedding，算 cosine similarity 闸门
2. 人眼参考（在 Aseprite 里作 reference layer 看构图/剪影节奏）

**禁止**：
- 喂给 LoRA / 其他模型训练数据集（即便是 CC0 的资产，也避免风格污染，我们要训练的是**自家风格**）
- 直接复制片段进 `godot/assets/` 作为最终资产（我们要的是"参考"而非"借用"）
- 把它们当作 prompt 的 image-reference 输入给 SD/Flux（会污染 CLIP loss）

## 为什么用 CC0 而不是商业截图？

初始版本的工作流设计允许本地存放商业游戏截图（Loop Hero / Cobalt Core / StS）作 CLIP golden，但：
1. **合规边界模糊**：即便本地不入库，喂 CLIP 本质仍是派生使用
2. **团队共享困难**：其他成员克隆仓库后需要各自手动准备
3. **CC0 替代品足够好**：AndHeGames 和 Reemax 的作品风格极具代表性，完全覆盖我们的 "16-bit 限色 + 1px 描边 + 复古 RPG" 目标

因此 **CC0 现为首选**，`references/golden/` 仅作"可选补充"保留（例如你有自家 Aseprite 作品想喂 CLIP 做自检时）。

## 新增 CC0 golden 的流程

1. 在 OpenGameArt / itch.io 过滤 CC0，找合适的像素风 sprite 作参考
2. 下载原 PNG，重命名为 `{category}_{author}_{description}.png` 格式
3. 在本 README 的表格追加一行（来源/作者/License/尺寸/用途）
4. 更新对应 prompt YAML 的 `eval.style_golden_globs` 若新文件需要被新 glob 匹配
5. 跑一次 smoke test 验证 CLIP 能读 + commit

## 源 URL 备份

原始下载链接（留作索引，便于未来核验）：
- https://opengameart.org/sites/default/files/creatures_3.png
- https://opengameart.org/sites/default/files/More%20creatures.png
- https://opengameart.org/sites/default/files/zombie_n_skeleton2.png
