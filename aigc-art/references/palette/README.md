# Resurrect-32 调色板

Story 57.3 AC1 + AC7 的 32 色子集，从 [Resurrect-64](https://lospec.com/palette-list/resurrect-64) (by Kerrie Lake) 派生。

## 文件清单

| 文件 | 用途 | 何时加载 |
|---|---|---|
| `resurrect-32.png` | 64×32 的 swatch（8 列 × 4 行，每色 8×8 块） | **权威源** — Aseprite `Palette > Presets > Load from File`，`checks.py` / `palette_lock.py` 也从此读 |
| `resurrect-32-preview.png` | 384×192 的 6× 放大预览（肉眼看配色协调） | 视觉审阅 |
| `resurrect-32.hex` | 纯 hex 列表，每行一个 | 其他工具链接入 |
| `resurrect-32.gpl` | GIMP Palette 格式（带命名） | Aseprite / GIMP / Krita 替代导入路径 |
| `resurrect-64-raw.png` | 源 64 色 1× swatch | 保留以便未来选不同 32 色子集 |
| `resurrect-64-8x.png` | 源 64 色 8× 放大预览 | 审阅 |
| `resurrect-64.hex` / `.gpl` | 源 64 色其他格式 | 参考 |

## 32 色选择（2026-04-14 拍板）

```
Row 0 (稀有度冷色):  common  common  uncommon uncommon rare     rare     epic     epic
Row 1 (稀有度暖色):  legend  legend  mythic   mythic   white    beige    mid-grey black
Row 2 (accent):      warm-hi warm-lo cool-hi  cool-lo  warn-hi  warn-lo  perfect  success
Row 3 (env + fx):    sky     blood   panel    dirt     leaf     skill    crit     void
```

### 稀有度规范（游戏内 UI 的权威映射）

| 稀有度 | Main | Shade/Outline | 语义 |
|---|---|---|---|
| common | `#9babb2` 浅灰青 | `#313638` 深灰 | 白装 |
| uncommon | `#1ebc73` 亮绿 | `#239063` 深绿 | 绿装 |
| rare | `#4d9be6` 亮蓝 | `#4d65b4` 深蓝 | 蓝装 |
| epic | `#905ea9` 紫 | `#6b3e75` 深紫 | 紫装 |
| legendary | `#f9c22b` 金 | `#f79617` 橙金 | 金装 |
| mythic | `#e83b3b` 红 | `#b33831` 深红 | 红装 |
| cursed | `#3e3546` 深紫 (fx-void) | `#2e222f` 近黑 | 诅咒装 / boss 背板 |

> ⚠️ **cursed 复用** `fx-void` + `grey-black` 两色（不单独给 slot），省下来的色位给 fx / 环境。

### 中性灰阶（5 色，含 cursed 复用）

`#ffffff` → `#ab947a` → `#625565` → `#3e3546` → `#2e222f`

### Accent 三对

| 用途 | Main | Shade |
|---|---|---|
| 暖（金/火/爆发） | `#fb6b1d` | `#e6904e` |
| 冷（冰/水/治疗） | `#30e1b9` | `#0eaf9b` |
| 警示（debuff/扣血） | `#f04f78` | `#831c5d` |

### 环境色

| 用途 | Hex |
|---|---|
| 天空/水 | `#8fd3ff` |
| 伤害/血 | `#ae2334` |
| HUD 背板 | `#c7dcd0` |
| 泥土/深木 | `#4c3e24` |
| 干草/淡叶 | `#b2ba90` |

### 特效预留

| 用途 | Hex |
|---|---|
| 完美击键 | `#fbff86` |
| 成功反馈 | `#cddf6c` |
| 技能光环 | `#a884f3` |
| 暴击爆点 | `#fdcbb0` |
| 虚空/boss | `#3e3546` |

## Aseprite 导入步骤

1. 打开 Aseprite，`File > New`，任意尺寸
2. `Palette` 面板右上齿轮 → `Presets` → `Load Palette...`
3. 选 `aigc-art/references/palette/resurrect-32.png`（或 `.gpl`）
4. 右键调色板 → `Save Palette As Preset`，命名 `resurrect-32`
5. 以后新建文件时直接 `Presets > resurrect-32`

## License 合规

- 原调色板 Resurrect-64 作者 Kerrie Lake，Lospec 允许个人 + 商用免费使用
- 本 32 色子集的选择是派生决策，不涉及原调色板版权

## 重选子集流程（未来）

若 32 色在实际美术产出中不够用：
1. **不要** 改这个文件（会让已入库资产失效）
2. 新增 `resurrect-32.v2.png` + `.v2.gpl`
3. 本 README 记录 why/what changed
4. 所有 prompt YAML 的 `palette_file` bump 到新路径
5. 跑 `regression.py` 把旧资产按新调色板重映射，看漂移
