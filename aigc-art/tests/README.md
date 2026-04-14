# aigc-art tests

## smoke_pipeline.py

**端到端冒烟测试**：在**无 Replicate API**的情况下验证整个 pipeline 能跑通。

### 原理

1. 从 `references/golden-cc0/enemy_reemax_zombie_skeleton.png` 切出 4 个 sprite
2. Nearest-upscale 到 256×384，模拟 SD 原始输出分辨率
3. 用 `gen.py --dry-run` 读取这些"假 SD 输出"跑完整 pipeline
4. 因为 fake input 本身派生自 CC0 golden，CLIP 自相似性极高 (>0.9)
5. 期望：palette + dimensions + alpha + Sobel + CLIP 五闸门**全部通过**
6. 清理产出

### 使用

```bash
# 从仓库根目录
aigc-art/.venv/bin/python aigc-art/tests/smoke_pipeline.py

# 或从 aigc-art 内
cd aigc-art
.venv/bin/python tests/smoke_pipeline.py

# Exit 0 = pass; Exit 1 = fail
```

### 何时跑

- ✅ **装完依赖后** — 一键验证所有 I/O 正常（PIL / numpy / scipy / open_clip 全部 import 通过）
- ✅ **换 Replicate 模型/LoRA 后** — 回归测试，确保 gen.py 新参数解析不坏
- ✅ **修 palette_lock.py 后** — 验证量化/描边/背景清理不破坏既有行为
- ✅ **修 checks.py 后** — 验证五项闸门仍 self-consistent
- ✅ **CI target** —（未来）跑在每个 aigc-art/ 改动的 PR 上

### 不覆盖什么

- ❌ Replicate API 调用（需真实 API token + 网络）
- ❌ 真实 Flux-dev 输出质量（需烧 $0.20/run 才能知道）
- ❌ Aseprite CLI 导出链（Task 5 polish 后才需要 `export.py`，届时补测试）

### 失败排查

| 现象 | 可能原因 | 修复 |
|---|---|---|
| `source sheet not found` | `references/golden-cc0/` 未 commit 或文件丢失 | 重新下载 CC0 goldens |
| `gen.py crashed with exit code N` | gen.py 内部 traceback | 看 stderr 定位 |
| `no candidates generated at all` | dry-run 输入目录空 / prompt YAML 解析失败 | 看 stdout 前半段 |
| `0 candidates passed all 5 gates` | CLIP / Sobel / palette 任一条件过严 | 查对应 reason field |
| `postprocess output does not satisfy structural gates` | palette_lock.py bug（如 outline color 不在调色板） | 单跑 `.venv/bin/python scripts/checks.py <file> --palette ...` |

### 扩展计划

未来可能加的 tests：
- `test_checks_unit.py` — 五项闸门各自单测（边界条件）
- `test_palette_lock_unit.py` — flood-fill / quantize / outline 单测
- `test_replicate_mock.py` — 用 `unittest.mock` 替换 Replicate API 走完整 gen.py 流程（比 dry-run 更真实）
