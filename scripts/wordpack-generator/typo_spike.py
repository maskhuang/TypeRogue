#!/usr/bin/env python3
"""
Spike 4: 手抄录入 typo 机制观察。

扰动类型：
  adjacent   - QWERTY 邻键错按 (s→a/d/w/x/z)
  transpose  - 相邻字符位置互换 (the→teh)
  doubling   - 字符被错敲两次 (now→noow)
  drop       - 字符脱落 (united→untied 类的位移可视为复合)
  swap_word  - 整词被错敲为视觉/含义易混词 (form/from, trial/trail, sacred/scared, united/untied, public/pubic, then/than, lose/loose)

过滤：只保留扰动后仍是合法英文词 (检 /usr/share/dict/words) 且不等于原词的 (orig, typo) 对。

用法：
    python typo_spike.py bartleby_short.txt
"""
import argparse
import random
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"
DICT_PATH = Path("/usr/share/dict/words")


# QWERTY 键盘邻键
QWERTY_ADJ = {
    'q': 'wa', 'w': 'qeas', 'e': 'wrds', 'r': 'etdf', 't': 'ryfg',
    'y': 'tugh', 'u': 'yihj', 'i': 'uojk', 'o': 'ipkl', 'p': 'ol',
    'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv',
    'h': 'gyujnb', 'j': 'huikmn', 'k': 'jiolm', 'l': 'kop',
    'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn',
    'n': 'bhjm', 'm': 'njk',
}

# 视觉/含义易混的整词对 (双向：可能 A→B 也可能 B→A)
COMMON_CONFUSIONS = {
    "form": "from", "from": "form",
    "trial": "trail", "trail": "trial",
    "sacred": "scared", "scared": "sacred",
    "angel": "angle", "angle": "angel",
    "casual": "causal", "causal": "casual",
    "united": "untied", "untied": "united",
    "public": "pubic", "pubic": "public",
    "dairy": "diary", "diary": "dairy",
    "their": "thier", "thier": "their",
    "quiet": "quite", "quite": "quiet",
    "marital": "martial", "martial": "marital",
    "saint": "stain", "stain": "saint",
    "fired": "fried", "fried": "fired",
    "manger": "manager", "manager": "manger",
    "filed": "field", "field": "filed",
    "tried": "tired", "tired": "tried",
    "lose": "loose", "loose": "lose",
    "than": "then", "then": "than",
    "weird": "wired", "wired": "weird",
}


def load_dict():
    words = set()
    for line in DICT_PATH.read_text().splitlines():
        w = line.strip().lower()
        if w and 2 <= len(w) <= 14:
            words.add(w)
    return words


def perturb_adjacent(word, rng):
    """一个字符被替换成邻键。"""
    if len(word) < 2:
        return word
    i = rng.randint(0, len(word) - 1)
    c = word[i].lower()
    if c not in QWERTY_ADJ:
        return word
    new_c = rng.choice(QWERTY_ADJ[c])
    return word[:i] + new_c + word[i + 1:]


def perturb_transpose(word, rng):
    """相邻两个字符互换。"""
    if len(word) < 3:
        return word
    i = rng.randint(0, len(word) - 2)
    return word[:i] + word[i + 1] + word[i] + word[i + 2:]


def perturb_doubling(word, rng):
    """某字符被错敲两次。"""
    if len(word) < 2:
        return word
    i = rng.randint(0, len(word) - 1)
    return word[:i] + word[i] + word[i:]


def perturb_drop(word, rng):
    """某字符被漏掉。"""
    if len(word) < 3:
        return word
    i = rng.randint(0, len(word) - 1)
    return word[:i] + word[i + 1:]


PERTURBATIONS = {
    "adjacent": perturb_adjacent,
    "transpose": perturb_transpose,
    "doubling": perturb_doubling,
    "drop": perturb_drop,
}


def find_typo_candidates(text, valid_words, *, attempts_per_word=20, seed=42):
    """对每个词跑多次扰动 + dictionary check，收集双合法词对。"""
    rng = random.Random(seed)
    found_by_mech = defaultdict(set)  # mechanism → {(orig, typo)}

    tokens = re.findall(r"[A-Za-z]+", text)
    unique_tokens = sorted(set(t.lower() for t in tokens if 3 <= len(t) <= 12))

    for word in unique_tokens:
        if word not in valid_words:
            continue

        # 整词易混替换
        if word in COMMON_CONFUSIONS:
            tgt = COMMON_CONFUSIONS[word]
            if tgt in valid_words and tgt != word:
                found_by_mech["swap_word"].add((word, tgt))

        # 字符级扰动
        for mech, fn in PERTURBATIONS.items():
            for _ in range(attempts_per_word):
                cand = fn(word, rng)
                if cand and cand != word and cand in valid_words:
                    found_by_mech[mech].add((word, cand))

    return found_by_mech


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--attempts", type=int, default=30)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    src_path = SOURCES / args.source
    text = src_path.read_text(encoding="utf-8")

    print("→ loading /usr/share/dict/words ...", file=sys.stderr)
    valid_words = load_dict()
    print(f"  dict size: {len(valid_words)}", file=sys.stderr)

    print("→ scanning typo candidates ...", file=sys.stderr)
    found = find_typo_candidates(text, valid_words, attempts_per_word=args.attempts, seed=args.seed)

    OUTPUT.mkdir(exist_ok=True)
    out_path = OUTPUT / f"{src_path.stem}_typo_candidates.json"
    import json
    out_path.write_text(json.dumps(
        {mech: sorted(list(pairs)) for mech, pairs in found.items()},
        ensure_ascii=False, indent=2,
    ))

    print(f"\nsaved: {out_path}\n")
    for mech, pairs in found.items():
        pairs_list = sorted(pairs)
        print(f"=== {mech} ({len(pairs_list)} pairs) ===")
        for orig, typo in pairs_list[:25]:
            print(f"  {orig:>14}  →  {typo}")
        if len(pairs_list) > 25:
            print(f"  ... +{len(pairs_list) - 25} more")
        print()


if __name__ == "__main__":
    main()
