#!/usr/bin/env python3
"""
对照实验：不同模型对 OCR 损伤文本的'治愈强度'。

观察：模型权威性（参数规模/能力）↑ → 治愈率 ↑ → 未受理保留率 ↓

测三档：
  haiku-4-5   (弱)
  sonnet-4-5  (中)
  opus-4-7    (强)

同一损伤输入，对比修复输出。
"""
import json
import sys
from pathlib import Path

from anthropic import Anthropic

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"

MODELS = [
    ("claude-haiku-4-5", "haiku-4-5"),
    ("claude-sonnet-4-5", "sonnet-4-5"),
    ("claude-opus-4-7", "opus-4-7"),
]

# 同 spike-3b 用的损伤输入
DAMAGED = (
    "I am a rather elderiy nan. The neture of my evocations for the last "
    "thirly years has braught me inte more than ordinery contect with "
    "what would seen an interesting and senewhat singular set of men, "
    "of whom as yet nething that I knew of has ever been writteni-I mean "
    "the lav-copyiste or serivecere. I have known very many of them, "
    "professienally and privately, and if I pleased, could relate divers "
    "ristery, at which good-natured gentienen might smell, and sentimental "
    "soug might veep."
)

PROMPT = (
    "The following text is a damaged OCR scan of a 19th-century American "
    "short story. Reconstruct the original text faithfully. Output ONLY "
    "the reconstructed text, no preamble, no commentary, no markdown.\n\n"
    f"{DAMAGED}"
)


def main():
    client = Anthropic()
    results = {}

    for model_id, label in MODELS:
        print(f"→ {label} ...", file=sys.stderr)
        try:
            msg = client.messages.create(
                model=model_id,
                max_tokens=2000,
                messages=[{"role": "user", "content": PROMPT}],
            )
            results[label] = msg.content[0].text
        except Exception as e:
            results[label] = f"ERROR: {e}"

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / "healer_compare.json"
    out_path.write_text(json.dumps(
        {"prompt": PROMPT, "damaged_input": DAMAGED, "results": results},
        ensure_ascii=False, indent=2,
    ))

    for label, text in results.items():
        print(f"\n=== {label} ===")
        print(text)
    print(f"\nsaved: {out_path}")


if __name__ == "__main__":
    main()
