"""
aigc-art/scripts/palette_lock.py

后处理 pipeline：把 SD/Flux 原始输出强制对齐到 Story 57.3 的美术锚点。

处理顺序：
  1. 背景清理（corner flood-fill 检测透明区域）
  2. Nearest-neighbor downscale 到目标尺寸
  3. 调色板量化（每像素最近邻映射到 resurrect-32）
  4. 可选：1px 黑描边补强（morphological dilation）

使用：
    python scripts/palette_lock.py \
        --input runs/.../raw/cand_01.png \
        --output runs/.../postprocessed/cand_01.png \
        --palette references/palette/resurrect-32.png \
        --target-size 32 48 \
        --outline
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import List, Set, Tuple

from PIL import Image


RGB = Tuple[int, int, int]


# ============================================================
# 调色板加载
# ============================================================

def load_palette(palette_path: str) -> List[RGB]:
    """从 swatch PNG 提取唯一颜色列表（忽略全透明像素）。"""
    img = Image.open(palette_path).convert("RGBA")
    seen: Set[RGB] = set()
    ordered: List[RGB] = []
    for r, g, b, a in img.getdata():
        if a == 0:
            continue
        key = (r, g, b)
        if key not in seen:
            seen.add(key)
            ordered.append(key)
    if not ordered:
        raise ValueError(f"Palette {palette_path} contains no opaque pixels")
    return ordered


# ============================================================
# 1. 背景清理（corner floodfill）
# ============================================================

def remove_background_by_corners(
    img: Image.Image, tolerance: int = 30
) -> Image.Image:
    """
    从 4 个角开始 flood-fill，把与角色相似的区域标记为透明。
    对 SD 生成的"单一背景色"图片有效。
    """
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()

    # 取 4 角颜色均值作为 "background seed"
    corners = [
        pixels[0, 0],
        pixels[w - 1, 0],
        pixels[0, h - 1],
        pixels[w - 1, h - 1],
    ]
    seed_r = sum(c[0] for c in corners) // 4
    seed_g = sum(c[1] for c in corners) // 4
    seed_b = sum(c[2] for c in corners) // 4

    def is_bg(px):
        r, g, b, _ = px
        return (
            abs(r - seed_r) <= tolerance
            and abs(g - seed_g) <= tolerance
            and abs(b - seed_b) <= tolerance
        )

    # 简化版 flood-fill：从 4 角各自起一条栈
    visited = [[False] * h for _ in range(w)]
    stack: List[Tuple[int, int]] = [
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
    ]
    while stack:
        x, y = stack.pop()
        if not (0 <= x < w and 0 <= y < h) or visited[x][y]:
            continue
        visited[x][y] = True
        if not is_bg(pixels[x, y]):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    return img


# ============================================================
# 2. Nearest-neighbor downscale
# ============================================================

def downscale_nearest(img: Image.Image, target_size: Tuple[int, int]) -> Image.Image:
    """禁止任何平滑算法。Image.NEAREST 必须严格执行。"""
    return img.resize(target_size, resample=Image.NEAREST)


# ============================================================
# 3. 调色板量化（每像素最近邻）
# ============================================================

def _closest_color(pixel: RGB, palette: List[RGB]) -> RGB:
    """欧氏距离最近邻。对 32 色调色板够用（O(32) per pixel）。"""
    pr, pg, pb = pixel
    best = palette[0]
    best_d = (pr - best[0]) ** 2 + (pg - best[1]) ** 2 + (pb - best[2]) ** 2
    for c in palette[1:]:
        d = (pr - c[0]) ** 2 + (pg - c[1]) ** 2 + (pb - c[2]) ** 2
        if d < best_d:
            best = c
            best_d = d
    return best


def quantize_to_palette(img: Image.Image, palette: List[RGB]) -> Image.Image:
    """
    对每个不透明像素映射到调色板最近色；透明像素保持透明。
    同时硬化 alpha（0 或 255，无半透明）。
    """
    img = img.convert("RGBA")
    out = Image.new("RGBA", img.size)
    src = img.load()
    dst = out.load()
    w, h = img.size
    cache: dict[RGB, RGB] = {}
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            # 硬化 alpha
            if a < 128:
                dst[x, y] = (0, 0, 0, 0)
                continue
            key = (r, g, b)
            mapped = cache.get(key)
            if mapped is None:
                mapped = _closest_color(key, palette)
                cache[key] = mapped
            dst[x, y] = (*mapped, 255)
    return out


# ============================================================
# 4. 1px 黑描边补强（可选）
# ============================================================

def enforce_outline(
    img: Image.Image, outline_color: RGB = (46, 34, 47)
) -> Image.Image:
    """
    对每个不透明像素检查 4 邻居，若邻居是透明则把邻居涂成描边色。
    实现为简单 morphological dilation。

    默认 outline_color = (46, 34, 47) = `#2e222f` = Resurrect-32 的 grey-black。
    **不用 (0,0,0) 纯黑**，因为纯黑不在 Resurrect-32 调色板内，会被 palette
    check 识别为 outlier。需要自定义时通过参数传入。
    """
    img = img.convert("RGBA")
    w, h = img.size
    out = img.copy()
    src = img.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a == 0:
                continue
            # 检查 4 邻居
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h:
                    _, _, _, na = src[nx, ny]
                    if na == 0:
                        dst[nx, ny] = (*outline_color, 255)
    return out


# ============================================================
# 主 pipeline
# ============================================================

def postprocess(
    input_path: Path,
    output_path: Path,
    palette_path: Path,
    target_size: Tuple[int, int],
    outline: bool = False,
    outline_color: RGB = (46, 34, 47),
    bg_removal: str = "corner-floodfill",
) -> None:
    img = Image.open(input_path).convert("RGBA")

    if bg_removal == "corner-floodfill":
        img = remove_background_by_corners(img)
    elif bg_removal == "none":
        pass
    else:
        raise ValueError(f"Unknown bg_removal mode: {bg_removal}")

    img = downscale_nearest(img, target_size)

    palette = load_palette(str(palette_path))
    img = quantize_to_palette(img, palette)

    if outline:
        img = enforce_outline(img, outline_color=outline_color)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"✓ {input_path.name} → {output_path} ({target_size[0]}×{target_size[1]})")


# ============================================================
# CLI
# ============================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="Palette lock + downscale postprocess")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--palette", required=True, type=Path)
    parser.add_argument("--target-size", required=True, nargs=2, type=int, metavar=("W", "H"))
    parser.add_argument("--outline", action="store_true")
    parser.add_argument(
        "--bg-removal",
        default="corner-floodfill",
        choices=["corner-floodfill", "none"],
    )
    args = parser.parse_args()

    postprocess(
        input_path=args.input,
        output_path=args.output,
        palette_path=args.palette,
        target_size=tuple(args.target_size),
        outline=args.outline,
        bg_removal=args.bg_removal,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
