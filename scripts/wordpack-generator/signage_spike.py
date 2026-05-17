#!/usr/bin/env python3
"""
Spike 8: 英文霓虹熄灯字符删除 → 合法词扫描。

对常见公共标识词跑：
  - single-char drop (任意位置丢一个字母)
  - leading-char drop (第一个字母熄灭 ← SHELL→HELL 经典模式)
  - trailing-char drop (最后字母熄灭)
  - double-char drop (重复字母塌缩 OO→O / EE→E / LL→L)
  - middle-burnout (中间字符熄灭，剩下首尾)

过滤：转换后必须是 valid English word 且 != 原词。

输出按"经典度"排序：leading-drop + 短词 + 强语义偏移 = 最经典 signage drift。
"""
import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"
DICT_PATH = Path("/usr/share/dict/words")


def load_dict():
    return {w.strip().lower() for w in DICT_PATH.read_text().splitlines() if w.strip()}


def drop_single(word):
    """从每个位置各丢一个字符，产出所有候选。"""
    return [(i, word[:i] + word[i+1:]) for i in range(len(word))]


def collapse_doubles(word):
    """重复字母塌缩：HELLO → HELO / OOPS → OPS。"""
    out = set()
    i = 0
    while i < len(word) - 1:
        if word[i].lower() == word[i+1].lower():
            out.add((i, word[:i] + word[i+1:]))
        i += 1
    return list(out)


def middle_burnout(word):
    """中间字符全熄，留首尾。SHELLS → SS / WELCOME → WE."""
    if len(word) <= 2:
        return []
    return [(None, word[0] + word[-1])]


def scan_word(word, valid_words):
    """对单个词跑所有损伤模式，回收所有双合法词对，标 mechanism。"""
    found = []
    word_lc = word.lower()

    # 1. single drop
    for i, cand in drop_single(word_lc):
        if cand and cand != word_lc and cand in valid_words:
            if i == 0:
                mech = "leading_drop"
            elif i == len(word_lc) - 1:
                mech = "trailing_drop"
            else:
                mech = "middle_drop"
            found.append({"orig": word_lc, "drift": cand, "mech": mech, "pos": i})

    # 2. double collapse
    for i, cand in collapse_doubles(word_lc):
        if cand and cand != word_lc and cand in valid_words:
            found.append({"orig": word_lc, "drift": cand, "mech": "double_collapse", "pos": i})

    # 3. middle burnout
    for i, cand in middle_burnout(word_lc):
        if cand and cand != word_lc and cand in valid_words:
            found.append({"orig": word_lc, "drift": cand, "mech": "middle_burnout", "pos": -1})

    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?", default="public_signs.txt")
    args = ap.parse_args()

    src_path = SOURCES / args.source
    signs = [w.strip() for w in src_path.read_text().splitlines() if w.strip() and w.strip().isalpha()]

    print(f"→ loaded {len(signs)} signs from {src_path}", file=sys.stderr)
    valid_words = load_dict()
    print(f"→ dict: {len(valid_words)} words", file=sys.stderr)

    by_mech = defaultdict(list)
    classics = []  # leading_drop + len(orig)<=6, prioritized for narrative

    for sign in signs:
        hits = scan_word(sign, valid_words)
        for h in hits:
            by_mech[h["mech"]].append(h)
            if h["mech"] == "leading_drop" and len(h["orig"]) <= 6:
                classics.append(h)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / "signage_neon_candidates.json"
    out_path.write_text(json.dumps({
        "stats": {mech: len(hits) for mech, hits in by_mech.items()},
        "classics_leading_drop_short": classics,
        "by_mech": dict(by_mech),
    }, ensure_ascii=False, indent=2))

    print(f"\nsaved: {out_path}\n")
    print("=== 经典级：leading drop · 短词 (≤6) ===")
    for h in classics[:40]:
        print(f"  {h['orig'].upper():>10}  →  {h['drift'].upper()}")
    if len(classics) > 40:
        print(f"  ... +{len(classics) - 40} more")
    print()

    for mech in ("trailing_drop", "middle_drop", "double_collapse", "middle_burnout"):
        hits = by_mech.get(mech, [])
        print(f"=== {mech} ({len(hits)} pairs) ===")
        for h in hits[:15]:
            print(f"  {h['orig'].upper():>14}  →  {h['drift'].upper():<14}  (pos={h['pos']})")
        if len(hits) > 15:
            print(f"  ... +{len(hits) - 15} more")
        print()


if __name__ == "__main__":
    main()
