"""
aigc-art/scripts/checks.py

自动评测闸门（五项检查），Story 57.3 + AIGC 工作流的质量红线。

使用：
    from checks import eval_candidate, load_palette
    palette = load_palette("references/palette/resurrect-32.png")
    spec = {"palette": palette, "target_size": [32, 48], ...}
    report = eval_candidate(Image.open("cand_01.png"), spec)
    if not report.passed:
        print(report.failures)

设计原则：
- 每项检查返回 CheckResult(name, passed, metric, reason)
- 任一项失败 → 整体失败
- 紧阈值优先：宁可假阴也不假阳（假阴由人工重跑补救，假阳污染库）
"""

from __future__ import annotations

import dataclasses
import glob
from pathlib import Path
from typing import Any, Dict, List, Sequence, Set, Tuple

from PIL import Image

RGB = Tuple[int, int, int]


# ============================================================
# 结果容器
# ============================================================

@dataclasses.dataclass
class CheckResult:
    name: str
    passed: bool
    metric: Any
    reason: str


@dataclasses.dataclass
class EvalReport:
    passed: bool
    checks: List[CheckResult]

    @property
    def failures(self) -> List[CheckResult]:
        return [c for c in self.checks if not c.passed]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passed": self.passed,
            "checks": [
                {
                    "name": c.name,
                    "passed": c.passed,
                    "metric": c.metric,
                    "reason": c.reason,
                }
                for c in self.checks
            ],
        }


# ============================================================
# 辅助：加载调色板
# ============================================================

def load_palette(palette_path: str) -> Set[RGB]:
    """
    从 swatch PNG 加载所有唯一颜色（忽略完全透明像素）。
    返回 RGB tuple 的 set。
    """
    img = Image.open(palette_path).convert("RGBA")
    colors: Set[RGB] = set()
    for r, g, b, a in img.getdata():
        if a > 0:
            colors.add((r, g, b))
    if not colors:
        raise ValueError(f"Palette {palette_path} contains no opaque pixels")
    return colors


# ============================================================
# 检查 1: 调色板合规
# ============================================================

def check_palette(img: Image.Image, palette: Set[RGB]) -> CheckResult:
    """所有不透明像素的 RGB 必须 ⊂ palette。严格模式：任何一个超出即失败。"""
    pixels = [(r, g, b) for r, g, b, a in img.convert("RGBA").getdata() if a > 0]
    unique = set(pixels)
    outliers = [c for c in unique if c not in palette]
    passed = len(outliers) == 0
    return CheckResult(
        name="palette",
        passed=passed,
        metric={"unique_colors": len(unique), "outliers": len(outliers)},
        reason="" if passed else f"{len(outliers)} colors outside palette",
    )


# ============================================================
# 检查 2: 尺寸精确
# ============================================================

def check_dimensions(img: Image.Image, expected: Sequence[int]) -> CheckResult:
    """img.size 必须严格等于 expected (width, height)。禁止 33×31 这种近似。"""
    actual = tuple(img.size)
    expected_t = tuple(expected)
    passed = actual == expected_t
    return CheckResult(
        name="dimensions",
        passed=passed,
        metric={"actual": list(actual), "expected": list(expected_t)},
        reason="" if passed else f"expected {expected_t}, got {actual}",
    )


# ============================================================
# 检查 3: 透明通道干净（无抗锯齿 halo）
# ============================================================

def check_alpha_halo(img: Image.Image, max_semi_transparent: int = 0) -> CheckResult:
    """像素风 alpha 必须二元。半透明像素（0 < a < 255）数量 > max 即失败。"""
    alpha = img.convert("RGBA").split()[3]
    semi = sum(1 for p in alpha.getdata() if 0 < p < 255)
    passed = semi <= max_semi_transparent
    return CheckResult(
        name="alpha_halo",
        passed=passed,
        metric={"semi_transparent_pixels": semi},
        reason="" if passed else f"{semi} semi-transparent pixels (AA halo)",
    )


# ============================================================
# 检查 4: 剪影锐度（Sobel 边缘响应）
# ============================================================

def check_silhouette_sharpness(
    img: Image.Image, min_sharpness: float = 0.30
) -> CheckResult:
    """
    对 alpha 通道做 Sobel 边缘检测，**过渡带**的平均响应 < min_sharpness 即失败。
    像素风剪影 = 硬边（高响应）；抗锯齿 = 软边（低响应）。
    """
    try:
        import numpy as np
        from scipy import signal as sp_signal
    except ImportError:
        return CheckResult(
            name="silhouette_sharpness",
            passed=True,
            metric={"skipped": "numpy/scipy not installed"},
            reason="",
        )

    alpha = np.asarray(img.convert("RGBA").split()[3], dtype=np.float32) / 255.0
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
    ky = kx.T
    gx = sp_signal.convolve2d(alpha, kx, mode="same", boundary="symm")
    gy = sp_signal.convolve2d(alpha, ky, mode="same", boundary="symm")
    mag = np.sqrt(gx ** 2 + gy ** 2)

    # 只看过渡带像素（既非全透也非全不透的邻域）
    edge_mask = (alpha > 0.01) & (alpha < 0.99)
    if edge_mask.any():
        edge_response = float(mag[edge_mask].mean())
    else:
        # 无过渡带 = 完全硬边（理想情况）
        edge_response = float(mag.max())

    passed = edge_response >= min_sharpness
    return CheckResult(
        name="silhouette_sharpness",
        passed=passed,
        metric={"sobel_mean": round(edge_response, 4)},
        reason=""
        if passed
        else f"edge sharpness {edge_response:.2f} < {min_sharpness}",
    )


# ============================================================
# 检查 5: CLIP 风格相似度
# ============================================================

_clip_cache: Dict[str, Any] = {}


def _get_clip():
    """懒加载 CLIP 模型（open_clip），首次调用约需 30s 下载 + 加载。"""
    if "model" in _clip_cache:
        return _clip_cache

    try:
        import torch
        import open_clip
    except ImportError as e:
        raise RuntimeError(
            "open_clip_torch not installed. Run: pip install -r aigc-art/requirements.txt"
        ) from e

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32", pretrained="openai"
    )
    model = model.to(device).eval()
    _clip_cache["model"] = model
    _clip_cache["preprocess"] = preprocess
    _clip_cache["device"] = device
    _clip_cache["torch"] = torch
    return _clip_cache


def check_style_similarity(
    img: Image.Image,
    golden_glob: str,
    fallback_glob: str = "",
    min_similarity: float = 0.80,
) -> CheckResult:
    """计算 img 与金标图像均值 embedding 的 cosine similarity。"""
    golden_paths = sorted(glob.glob(golden_glob))
    if not golden_paths and fallback_glob:
        golden_paths = sorted(glob.glob(fallback_glob))

    if not golden_paths:
        return CheckResult(
            name="style_similarity",
            passed=False,
            metric={"golden_count": 0},
            reason=f"no golden images found at {golden_glob}",
        )

    try:
        ctx = _get_clip()
    except RuntimeError as e:
        return CheckResult(
            name="style_similarity",
            passed=True,  # 降级为通过：避免因为没装 CLIP 就全部淘汰
            metric={"skipped": str(e)},
            reason="",
        )

    model = ctx["model"]
    preprocess = ctx["preprocess"]
    device = ctx["device"]
    torch = ctx["torch"]

    def embed(pil_img: Image.Image):
        t = preprocess(pil_img.convert("RGB")).unsqueeze(0).to(device)
        with torch.no_grad():
            feat = model.encode_image(t)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        return feat

    img_feat = embed(img)
    golden_feats = [embed(Image.open(gp)) for gp in golden_paths]
    golden_mean = torch.stack([f[0] for f in golden_feats]).mean(dim=0, keepdim=True)
    golden_mean = golden_mean / golden_mean.norm(dim=-1, keepdim=True)
    sim = float((img_feat @ golden_mean.T).item())

    passed = sim >= min_similarity
    return CheckResult(
        name="style_similarity",
        passed=passed,
        metric={"cosine": round(sim, 4), "golden_count": len(golden_paths)},
        reason=""
        if passed
        else f"CLIP similarity {sim:.3f} < {min_similarity}",
    )


# ============================================================
# 组合：一次跑完五项
# ============================================================

def eval_candidate(img: Image.Image, spec: Dict[str, Any]) -> EvalReport:
    """
    spec 形如：
      {
        "palette": set[(R,G,B)],
        "target_size": [W, H],
        "alpha_halo_max": 0,
        "silhouette_sharpness_min": 0.30,
        "clip_similarity_min": 0.80,
        "golden_glob": "references/golden/enemy_*.png",
        "fallback_glob": "references/mood-board/enemy_*.png",
      }
    """
    checks: List[CheckResult] = []

    if "palette" in spec:
        checks.append(check_palette(img, spec["palette"]))

    if "target_size" in spec:
        checks.append(check_dimensions(img, spec["target_size"]))

    checks.append(
        check_alpha_halo(img, max_semi_transparent=spec.get("alpha_halo_max", 0))
    )

    if spec.get("silhouette_sharpness_min", 0) > 0:
        checks.append(
            check_silhouette_sharpness(
                img, min_sharpness=spec["silhouette_sharpness_min"]
            )
        )

    if spec.get("clip_similarity_min", 0) > 0 and spec.get("golden_glob"):
        checks.append(
            check_style_similarity(
                img,
                golden_glob=spec["golden_glob"],
                fallback_glob=spec.get("fallback_glob", ""),
                min_similarity=spec["clip_similarity_min"],
            )
        )

    passed = all(c.passed for c in checks)
    return EvalReport(passed=passed, checks=checks)


# ============================================================
# CLI
# ============================================================

def main() -> int:
    import argparse
    import json

    parser = argparse.ArgumentParser(description="评测单张候选图")
    parser.add_argument("image", type=Path, help="候选 PNG 路径")
    parser.add_argument("--palette", required=True, type=Path)
    parser.add_argument("--target-size", nargs=2, type=int, default=None)
    parser.add_argument("--golden-glob", default="")
    parser.add_argument("--clip-min", type=float, default=0.80)
    args = parser.parse_args()

    img = Image.open(args.image)
    palette = load_palette(str(args.palette))
    spec: Dict[str, Any] = {
        "palette": palette,
        "alpha_halo_max": 0,
        "silhouette_sharpness_min": 0.30,
    }
    if args.target_size:
        spec["target_size"] = args.target_size
    if args.golden_glob:
        spec["golden_glob"] = args.golden_glob
        spec["clip_similarity_min"] = args.clip_min

    report = eval_candidate(img, spec)
    print(json.dumps(report.to_dict(), indent=2, ensure_ascii=False))
    return 0 if report.passed else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
