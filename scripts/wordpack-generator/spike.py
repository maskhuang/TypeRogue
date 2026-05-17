#!/usr/bin/env python3
"""
Spike: 验证 OCR 折损能否让 token 层保留"未受理文本"的叙事性。

pipeline：源文本 → 渲染成低 DPI 图 + 高斯噪声 + 模糊 → Tesseract OCR
         → 分词 → 对比原文 token 集合，输出 preserved / lost / gained_via_corruption

用法：
    cd scripts/wordpack-generator
    source .venv/bin/activate
    python spike.py bartleby_excerpt.txt
    python spike.py bartleby_excerpt.txt --noise 20 --blur 1.2 --font-size 11
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import pytesseract

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"


def render_text(text, *, font_size=12, line_width=80, noise_sigma=12, blur_radius=0.8):
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        words = paragraph.split()
        current = []
        for w in words:
            current.append(w)
            if sum(len(x) + 1 for x in current) > line_width:
                lines.append(" ".join(current[:-1]))
                current = [w]
        if current:
            lines.append(" ".join(current))

    font_paths = [
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/System/Library/Fonts/Courier.dfont",
        "/Library/Fonts/Courier New.ttf",
    ]
    font = None
    for p in font_paths:
        try:
            font = ImageFont.truetype(p, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    line_h = int(font_size * 1.4)
    char_w = max(font_size // 2 + 1, 7)
    img_w = line_width * char_w + 40
    img_h = max(1, len(lines)) * line_h + 40
    img = Image.new("L", (img_w, img_h), color=242)
    draw = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        draw.text((20, 20 + i * line_h), line, font=font, fill=32)

    pixels = img.load()
    for x in range(img_w):
        for y in range(img_h):
            n = int(random.gauss(0, noise_sigma))
            pixels[x, y] = max(0, min(255, pixels[x, y] + n))

    img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    return img


_TOKEN_RE = re.compile(r"[A-Za-z]+")


def tokenize(text, *, min_len=3, max_len=10):
    return [w.lower() for w in _TOKEN_RE.findall(text) if min_len <= len(w) <= max_len]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="文件名，相对 sources/ 目录")
    ap.add_argument("--noise", type=float, default=12.0, help="高斯噪声 sigma")
    ap.add_argument("--blur", type=float, default=0.8, help="高斯模糊 radius")
    ap.add_argument("--font-size", type=int, default=12)
    ap.add_argument("--line-width", type=int, default=80)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    random.seed(args.seed)
    src_path = SOURCES / args.source
    if not src_path.exists():
        print(f"× source not found: {src_path}", file=sys.stderr)
        sys.exit(1)

    text = src_path.read_text(encoding="utf-8")
    img = render_text(
        text,
        font_size=args.font_size,
        line_width=args.line_width,
        noise_sigma=args.noise,
        blur_radius=args.blur,
    )
    OUTPUT.mkdir(exist_ok=True)
    img_path = OUTPUT / f"{src_path.stem}_degraded.png"
    img.save(img_path)

    ocr_text = pytesseract.image_to_string(img)

    original_tokens = tokenize(text)
    ocr_tokens = tokenize(ocr_text)
    orig_set = set(original_tokens)
    ocr_set = set(ocr_tokens)

    result = {
        "source": str(src_path.relative_to(ROOT)),
        "image": str(img_path.relative_to(ROOT)),
        "params": {
            "noise_sigma": args.noise,
            "blur_radius": args.blur,
            "font_size": args.font_size,
            "line_width": args.line_width,
            "seed": args.seed,
        },
        "stats": {
            "original_token_count": len(original_tokens),
            "original_unique": len(orig_set),
            "ocr_token_count": len(ocr_tokens),
            "ocr_unique": len(ocr_set),
            "preserved_count": len(orig_set & ocr_set),
            "gained_count": len(ocr_set - orig_set),
            "lost_count": len(orig_set - ocr_set),
        },
        "preserved_sample": sorted(orig_set & ocr_set)[:30],
        "gained_via_corruption": sorted(ocr_set - orig_set),
        "lost": sorted(orig_set - ocr_set),
        "ocr_raw_text": ocr_text,
    }

    out_path = OUTPUT / f"{src_path.stem}_spike.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    s = result["stats"]
    print(f"degraded image : {img_path}")
    print(f"spike result   : {out_path}")
    print()
    print(f"original unique : {s['original_unique']}")
    print(f"OCR unique      : {s['ocr_unique']}")
    print(f"preserved       : {s['preserved_count']}  ({100*s['preserved_count']/s['original_unique']:.1f}% of original)")
    print(f"gained          : {s['gained_count']}  ← 这些是'未受理'后冒出来的无主词")
    print(f"lost            : {s['lost_count']}")
    print()
    print("--- gained_via_corruption (前 40) ---")
    print(", ".join(sorted(ocr_set - orig_set)[:40]))
    print()
    print("--- OCR raw text (前 600 字符) ---")
    print(ocr_text[:600])


if __name__ == "__main__":
    main()
