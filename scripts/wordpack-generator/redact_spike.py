#!/usr/bin/env python3
"""
Spike 5: 黑条 redaction 骨架观察。

两个变体：
  hard - 把 LLM 标的'最具体/最敏感' token 替换为 ▮▮▮ 黑条
  soft - 把同样 token 替换为更泛的同类词 (Bartleby → "a clerk", Wall-Street → "a street")

观察剩下的语法骨架是否产生 D 表'高危文本'鬼影。
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


def identify_targets(client, text):
    """让 LLM 列出最具体/最敏感 token (proper nouns, numerals, specific 名词短语)。"""
    prompt = (
        "Identify the most specific / most identifying tokens in this text. "
        "These are: proper nouns (names, places), numerals, and unusually "
        "specific noun phrases. Output ONE per line, lowercase if not a proper "
        "noun. No preamble.\n\n"
        f"{text}"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    targets = [line.strip().lstrip("-•0123456789. ") for line in raw.splitlines() if line.strip()]
    return [t for t in targets if t]


def soft_replace(client, text, targets):
    """让 LLM 把每个 target 替换为更泛的同类词，保持语法。"""
    prompt = (
        "Rewrite the following text, replacing each of these specific tokens "
        "with a more generic synonym (e.g., 'Bartleby' → 'a clerk', 'Wall-Street' "
        "→ 'a street', 'thirty years' → 'many years', 'Herman Melville' → 'the "
        "author'). Keep all other words exactly. Output ONLY the rewritten text.\n\n"
        f"Tokens to genericize:\n" + "\n".join(f"  - {t}" for t in targets) +
        f"\n\nText:\n{text}"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def hard_redact(text, targets):
    """Python 端做硬黑条替换。"""
    result = text
    for t in sorted(targets, key=len, reverse=True):
        # 大小写不敏感的整词/短语替换
        import re
        pattern = re.compile(re.escape(t), re.IGNORECASE)
        block = "▮" * max(3, min(len(t), 10))
        result = pattern.sub(block, result)
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    args = ap.parse_args()

    src_path = SOURCES / args.source
    text = src_path.read_text(encoding="utf-8").strip()

    client = Anthropic()

    print("→ identifying targets ...", file=sys.stderr)
    targets = identify_targets(client, text)
    print(f"  found {len(targets)} targets:", file=sys.stderr)
    for t in targets:
        print(f"    - {t}", file=sys.stderr)

    print("\n→ hard redaction ...", file=sys.stderr)
    hard = hard_redact(text, targets)

    print("→ soft redaction ...", file=sys.stderr)
    soft = soft_replace(client, text, targets)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / f"{src_path.stem}_redact.json"
    out_path.write_text(json.dumps({
        "targets": targets,
        "hard": hard,
        "soft": soft,
    }, ensure_ascii=False, indent=2))

    print("\n=== TARGETS ===")
    for t in targets:
        print(f"  - {t}")

    print("\n=== HARD ===")
    print(hard)

    print("\n=== SOFT ===")
    print(soft)

    print(f"\nsaved: {out_path}")


if __name__ == "__main__":
    main()
