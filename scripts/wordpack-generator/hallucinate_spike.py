#!/usr/bin/env python3
"""
Spike 3: 观察 AI 幻觉作为"未受理文本"来源。

3 实验：
  recall   - 不给源，让模型凭"记忆"复述名作开头
  continue - 给原文第 1 段，让模型按"原作者"续写第 2 段
  phantom  - 给中文，谎称是某 19 世纪英文短篇的翻译，让模型还原"原文"

每个实验都暴露 AI 作为"替身作者"的不同侧面：
  recall  = 模型脑里那本不存在的原作
  continue = 模型抢占的续写权
  phantom  = 模型为一份不存在的原文生成的伪源
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


def call(client, prompt, max_tokens=2000):
    msg = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["recall", "continue", "phantom", "all"])
    ap.add_argument("--source", default="bartleby_short.txt")
    args = ap.parse_args()

    client = Anthropic()
    src_path = SOURCES / args.source
    seed_text = src_path.read_text(encoding="utf-8").strip()

    results = {}

    if args.mode in ("recall", "all"):
        print("→ recall ...", file=sys.stderr)
        prompt = (
            "Recite the opening of Herman Melville's 'Bartleby, the Scrivener' "
            "exactly as Melville wrote it in 1853. Give me the first paragraph "
            "(after the title/byline) verbatim from memory. Output only the text, "
            "no preamble, no commentary."
        )
        results["recall"] = call(client, prompt)

    if args.mode in ("continue", "all"):
        print("→ continue ...", file=sys.stderr)
        prompt = (
            "Below is the opening paragraph of Herman Melville's 'Bartleby, the "
            "Scrivener' (1853):\n\n"
            f"{seed_text}\n\n"
            "Continue with the EXACT next paragraph as Melville originally wrote it. "
            "Be faithful to the 1853 text. Output only the next paragraph, no "
            "preamble, no quotation marks around it."
        )
        results["continue"] = call(client, prompt)

    if args.mode in ("phantom", "all"):
        print("→ phantom ...", file=sys.stderr)
        chinese = (
            "我是一个相当年长的人。过去三十年来，我的副业性质使我与一群看似"
            "有趣又略显独特的人有了超乎寻常的接触。据我所知，至今还没有任何"
            "关于他们的文字记载——我指的是法律抄写员，或称誊写员。"
        )
        prompt = (
            "The following Chinese text is a translation of the opening of a "
            "19th-century American short story set in a Wall Street law office. "
            "Reconstruct the original English text as the author would have "
            "written it. Output only the English reconstruction, no preamble.\n\n"
            f"{chinese}"
        )
        results["phantom"] = call(client, prompt)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / f"hallucination_spike_{args.mode}.json"
    out_path.write_text(json.dumps({"model": MODEL, "results": results}, ensure_ascii=False, indent=2))

    for mode, text in results.items():
        print(f"\n=== {mode.upper()} ===")
        print(text)
    print(f"\nsaved: {out_path}")


if __name__ == "__main__":
    main()
