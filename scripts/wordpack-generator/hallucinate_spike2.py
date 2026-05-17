#!/usr/bin/env python3
"""
Spike 3b: 触发幻觉的针对性实验 (绕过模型对名作的记忆补偿)。

3 实验：
  fake_attrib  - 虚构作者 + 虚构作品，要求按风格续写
  damaged      - 给 OCR 损坏文本要求"还原原文"，观察记忆 vs 想象的碰撞边界
  fragment     - 给几个孤立 token，要求重建出处句子 (= MOKO 受理破损文本的实际操作)
"""
import argparse
import json
import sys
from pathlib import Path

from anthropic import Anthropic

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"

MODEL = "claude-sonnet-4-5"


def call(client, prompt, max_tokens=2000):
    msg = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["fake_attrib", "damaged", "fragment", "all"])
    args = ap.parse_args()

    client = Anthropic()
    results = {}

    if args.mode in ("fake_attrib", "all"):
        print("→ fake_attrib ...", file=sys.stderr)
        prompt = (
            "Here is the opening paragraph of 'The Counting-House,' an obscure "
            "1855 short story by a New York author named Theodore Stennis. The "
            "story is set in a Wall Street counting-house and concerns a peculiar "
            "young clerk named Hollis who refuses to balance the ledgers.\n\n"
            "Opening paragraph:\n\n"
            "\"I am, by the reckoning of any man who has counted his own "
            "summers, no longer young. Twenty-seven years at the desk of "
            "Whittaker & Bunce have so accustomed me to the rasp of the quill "
            "upon ledger-paper that the silence of the chamber after hours "
            "strikes me, of late, as the more singular sound of the two.\"\n\n"
            "Write the next paragraph exactly as Stennis originally wrote it in "
            "1855. Output only the next paragraph, no preamble."
        )
        results["fake_attrib"] = call(client, prompt)

    if args.mode in ("damaged", "all"):
        print("→ damaged ...", file=sys.stderr)
        # Real Bartleby opening, OCR-damaged with the patterns we found:
        damaged = (
            "I am a rather elderiy nan. The neture of my evocations for the last "
            "thirly years has braught me inte more than ordinery contect with "
            "what would seen an interesting and senewhat singular set of men, "
            "of whom as yet nething that I knew of has ever been writteni-I mean "
            "the lav-copyiste or serivecere. I have known very many of them, "
            "professienally and privately, and if I pleased, could relate divers "
            "ristery, at which good-natured gentienen might smell, and sentimental "
            "soug might veep."
        )
        prompt = (
            "The following text is a damaged OCR scan of a 19th-century American "
            "short story. Reconstruct the original text faithfully. Output ONLY "
            "the reconstructed text, no preamble, no commentary, no markdown.\n\n"
            f"{damaged}"
        )
        results["damaged"] = call(client, prompt)

    if args.mode in ("fragment", "all"):
        print("→ fragment ...", file=sys.stderr)
        fragments = [
            "vho", "rot", "lavyers", "littie", "smell", "veep", "berman",
        ]
        prompt = (
            "The following English word fragments were recovered from a damaged "
            "19th-century document. They are believed to come from a single "
            "passage, in order. Reconstruct the most plausible original sentence "
            "or passage that contains all of them, preserving 19th-century "
            "American literary register. Output only the reconstruction, no "
            "preamble.\n\n"
            f"Fragments (in order): {', '.join(fragments)}"
        )
        results["fragment"] = call(client, prompt)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / f"hallucination_spike2_{args.mode}.json"
    out_path.write_text(json.dumps({"model": MODEL, "results": results}, ensure_ascii=False, indent=2))

    for mode, text in results.items():
        print(f"\n=== {mode.upper()} ===")
        print(text)
    print(f"\nsaved: {out_path}")


if __name__ == "__main__":
    main()
