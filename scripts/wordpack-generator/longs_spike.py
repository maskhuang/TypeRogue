#!/usr/bin/env python3
"""
Spike 7: 古字体长 s (ſ) OCR 错读观察。

18-19 世纪英文用 long s (ſ)，看起来像 f。pipeline：
  现代文本 → 按古英语规则将 s 替换为 ſ → 渲染成图 → Tesseract OCR → 比较

古英语 long s 规则 (简化):
  - 词尾用 s, 词中/词首用 ſ
  - ſ 在 'b' 和 'f' 前用 s (避免 ſf/ſb 视觉混乱)
  - 双 s = ſs (词中) 或 ss (词尾)

观察：哪些 ſ 被 OCR 读成 f → 产生 historical 假错读
"""
import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import pytesseract

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"


def apply_long_s(text):
    """按古英语规则替换 s 为 ſ (long s)。"""
    out = []
    i = 0
    # 按词处理，保留非字母字符
    parts = re.split(r"(\b[a-zA-Z]+\b)", text)
    result = []
    for part in parts:
        if not part or not part[0].isalpha():
            result.append(part)
            continue
        word = part
        new_word = []
        for j, ch in enumerate(word):
            if ch.lower() == 's':
                # 词尾用 s
                if j == len(word) - 1:
                    new_word.append(ch)
                # ss 在词中：ſs (第一个 long, 第二个 normal)
                elif j + 1 < len(word) and word[j + 1].lower() == 's':
                    new_word.append('ſ')
                # 前一个是 s 且现在是 s (即 ss 的第二个 s)
                elif j > 0 and word[j - 1].lower() == 's':
                    new_word.append('s')
                # s 前是 f 或 b → 用 s
                elif j + 1 < len(word) and word[j + 1].lower() in ('b', 'f'):
                    new_word.append('s')
                else:
                    new_word.append('ſ')
            else:
                new_word.append(ch)
        result.append(''.join(new_word))
    return ''.join(result)


def render_text(text, *, font_size=14, line_width=70):
    """渲染成图。需要 ſ 字符支持的字体。"""
    lines = []
    for paragraph in text.split("\n"):
        if not paragraph.strip():
            lines.append("")
            continue
        words = paragraph.split(" ")
        current = []
        for w in words:
            current.append(w)
            if sum(len(x) + 1 for x in current) > line_width:
                lines.append(" ".join(current[:-1]))
                current = [w]
        if current:
            lines.append(" ".join(current))

    # 优先 serif 字体，含 ſ 字符支持
    font_paths = [
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/Library/Fonts/Times New Roman.ttf",
        "/System/Library/Fonts/Times.ttc",
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

    line_h = int(font_size * 1.6)
    char_w = font_size
    img_w = line_width * char_w + 40
    img_h = max(1, len(lines)) * line_h + 40
    img = Image.new("L", (img_w, img_h), color=245)
    draw = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        draw.text((20, 20 + i * line_h), line, font=font, fill=20)
    return img


_TOKEN_RE = re.compile(r"[A-Za-zſ]+")


def tokenize(text, *, min_len=2, max_len=14):
    return [w.lower().replace('ſ', 's') for w in _TOKEN_RE.findall(text) if min_len <= len(w) <= max_len]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--font-size", type=int, default=14)
    args = ap.parse_args()

    src_path = SOURCES / args.source
    text = src_path.read_text(encoding="utf-8")

    print("→ applying long-s rules ...", file=sys.stderr)
    longs_text = apply_long_s(text)

    OUTPUT.mkdir(exist_ok=True)
    longs_path = OUTPUT / f"{src_path.stem}_longs.txt"
    longs_path.write_text(longs_text, encoding="utf-8")

    print("→ rendering ...", file=sys.stderr)
    img = render_text(longs_text, font_size=args.font_size)
    img_path = OUTPUT / f"{src_path.stem}_longs.png"
    img.save(img_path)

    print("→ OCR ...", file=sys.stderr)
    ocr_text = pytesseract.image_to_string(img)

    # 比较：原现代英文 token vs OCR 出来的 token
    orig_tokens = tokenize(text)
    ocr_tokens = tokenize(ocr_text)
    orig_set = set(orig_tokens)
    ocr_set = set(ocr_tokens)

    result = {
        "source_text": text,
        "longs_text": longs_text,
        "image": str(img_path.relative_to(ROOT)),
        "ocr_text": ocr_text,
        "stats": {
            "orig_unique": len(orig_set),
            "ocr_unique": len(ocr_set),
            "preserved": len(orig_set & ocr_set),
            "lost": len(orig_set - ocr_set),
            "gained": len(ocr_set - orig_set),
        },
        "lost": sorted(orig_set - ocr_set),
        "gained": sorted(ocr_set - orig_set),
    }
    out_path = OUTPUT / f"{src_path.stem}_longs_ocr.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nsaved: {out_path}")
    print(f"image: {img_path}\n")
    print("=== LONG-S RENDERED TEXT (first 15 lines) ===")
    print("\n".join(longs_text.split("\n")[:15]))
    print("\n=== OCR OUTPUT ===")
    print(ocr_text[:1500])
    print()
    print(f"orig unique : {len(orig_set)}")
    print(f"ocr unique  : {len(ocr_set)}")
    print(f"preserved   : {len(orig_set & ocr_set)}")
    print(f"lost        : {len(orig_set - ocr_set)}")
    print(f"gained      : {len(ocr_set - orig_set)}")
    print()
    print("--- lost (originals that didn't survive) ---")
    print(", ".join(sorted(orig_set - ocr_set)))
    print("\n--- gained (OCR mistakes) ---")
    print(", ".join(sorted(ocr_set - orig_set)))


if __name__ == "__main__":
    main()
