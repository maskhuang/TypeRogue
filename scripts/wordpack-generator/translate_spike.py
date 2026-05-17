#!/usr/bin/env python3
"""
Spike 2: 实证观察 AI 翻译往返 (en → 中间语 → en) 产生的错误形态。

目的不是 wordpack 自动生成，而是：
  - 看翻译模型实际会引入什么样的偏移
  - 哪些偏移仍保留叙事性 (语义合法 + 仍有"作者声音")
  - 哪些偏移塌成平淡 / 噪声

输出 side-by-side diff 供人 review。

用法：
  python translate_spike.py bartleby_short.txt
  python translate_spike.py bartleby_short.txt --via zh ja  # 多跳
"""
import argparse
import json
import sys
from pathlib import Path

from anthropic import Anthropic

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"

MODEL = "claude-sonnet-4-5"


LANG_NAMES = {
    "zh": "Simplified Chinese",
    "ja": "Japanese",
    "es": "Spanish",
    "fr": "French",
    "ru": "Russian",
    "de": "German",
    "ar": "Arabic",
    "ko": "Korean",
    "en": "English",
}


def translate(client, text, *, src_lang, tgt_lang):
    """直译，不指示保留语气 — 让模型自然漂移，便于观察。"""
    prompt = (
        f"Translate the following text from {src_lang} into {tgt_lang}. "
        f"Output ONLY the translation. No preamble, no notes, no explanations."
        f"\n\n---\n\n{text}"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument(
        "--via",
        nargs="+",
        default=["zh"],
        help="中间语 code 序列。e.g. --via zh / --via zh ja",
    )
    args = ap.parse_args()

    src_path = SOURCES / args.source
    text = src_path.read_text(encoding="utf-8").strip()

    client = Anthropic()
    hops = ["en"] + args.via + ["en"]
    chain = [{"lang": "en", "text": text}]

    for i in range(len(hops) - 1):
        src = hops[i]
        tgt = hops[i + 1]
        print(f"→ hop {i+1}: {src} → {tgt}", file=sys.stderr)
        translated = translate(
            client,
            chain[-1]["text"],
            src_lang=LANG_NAMES[src],
            tgt_lang=LANG_NAMES[tgt],
        )
        chain.append({"lang": tgt, "text": translated})

    OUTPUT.mkdir(exist_ok=True)
    via_str = "-".join(args.via)
    out_path = OUTPUT / f"{src_path.stem}_roundtrip_via_{via_str}.json"
    out_path.write_text(
        json.dumps({"chain": chain, "model": MODEL}, ensure_ascii=False, indent=2)
    )
    print(f"\nsaved: {out_path}\n")

    # Display chain
    for i, step in enumerate(chain):
        marker = "ORIGINAL" if i == 0 else f"HOP {i} ({step['lang']})"
        print(f"=== {marker} ===")
        print(step["text"])
        print()


if __name__ == "__main__":
    main()
