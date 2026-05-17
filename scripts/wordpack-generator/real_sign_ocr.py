#!/usr/bin/env python3
"""
Spike 9: 真实损伤招牌图片 OCR 实测。

对 sources/signs/ 下的真实 ghost sign 照片跑 Tesseract，
看现实世界 signage drift 在 OCR 看来是什么样的 token 集。
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image
import pytesseract

ROOT = Path(__file__).parent
SIGNS = ROOT / "sources" / "signs"
OUTPUT = ROOT / "output"


_TOKEN = re.compile(r"[A-Za-z]+")


def main():
    OUTPUT.mkdir(exist_ok=True)
    results = []

    images = sorted(SIGNS.glob("*.jpg")) + sorted(SIGNS.glob("*.png"))
    if not images:
        print("× no images found in", SIGNS, file=sys.stderr)
        sys.exit(1)

    for img_path in images:
        print(f"→ {img_path.name}", file=sys.stderr)
        try:
            img = Image.open(img_path)
            # Tesseract on full image
            text_default = pytesseract.image_to_string(img)
            # Also try with PSM 6 (uniform block) and PSM 11 (sparse text)
            text_psm6 = pytesseract.image_to_string(img, config="--psm 6")
            text_psm11 = pytesseract.image_to_string(img, config="--psm 11")
        except Exception as e:
            print(f"  × error: {e}", file=sys.stderr)
            continue

        all_tokens = set()
        for txt in (text_default, text_psm6, text_psm11):
            for t in _TOKEN.findall(txt):
                if 2 <= len(t) <= 14:
                    all_tokens.add(t.lower())

        results.append({
            "image": img_path.name,
            "text_default": text_default.strip(),
            "text_psm6": text_psm6.strip(),
            "text_psm11": text_psm11.strip(),
            "tokens_union": sorted(all_tokens),
        })

    out_path = OUTPUT / "real_signs_ocr.json"
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\nsaved: {out_path}\n")

    for r in results:
        print(f"\n=== {r['image']} ===")
        print(f"-- default PSM --")
        print(r["text_default"][:300] or "(empty)")
        print(f"-- PSM 6 (uniform block) --")
        print(r["text_psm6"][:300] or "(empty)")
        print(f"-- PSM 11 (sparse text) --")
        print(r["text_psm11"][:300] or "(empty)")
        print(f"-- union tokens ({len(r['tokens_union'])}) --")
        print(", ".join(r["tokens_union"][:50]))


if __name__ == "__main__":
    main()
