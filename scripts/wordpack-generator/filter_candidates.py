#!/usr/bin/env python3
"""
对 candidates_dictwide.json (~50K 对) 做 frequency 过滤，保留双方都在'常用词'集的对。

常用词 = 项目 src/data-json/words.json 中所有 categories 的 union (~3K 已策划词)。
未来可扩为 popular-english-words top-10K。
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"
PROJECT_WORDS = ROOT.parent.parent / "src" / "data-json" / "words.json"


def load_common_words():
    data = json.loads(PROJECT_WORDS.read_text())
    common = set()
    for cat_name, cat_data in data.get("wordPool", {}).items():
        for w in cat_data.get("words", []):
            common.add(w.lower())
    return common


def main():
    print(f"→ loading common words from {PROJECT_WORDS.relative_to(ROOT.parent.parent)} ...", file=sys.stderr)
    common = load_common_words()
    print(f"  common words: {len(common)}", file=sys.stderr)

    print("→ loading candidates_dictwide.json ...", file=sys.stderr)
    raw = json.loads((OUTPUT / "candidates_dictwide.json").read_text())

    filtered = defaultdict(list)
    all_drift = set()
    all_orig = set()

    for mech, pairs in raw["by_mech"].items():
        for orig, drift in pairs:
            if orig in common and drift in common:
                filtered[mech].append([orig, drift])
                all_drift.add(drift)
                all_orig.add(orig)

    out = {
        "stats": {
            "total_filtered_pairs": sum(len(v) for v in filtered.values()),
            "unique_drift_tokens": len(all_drift),
            "unique_orig_tokens": len(all_orig),
            "common_pool_size": len(common),
            "by_mech": {mech: len(pairs) for mech, pairs in sorted(filtered.items())},
        },
        "by_mech": dict(sorted(filtered.items())),
    }

    out_path = OUTPUT / "candidates_filtered.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(f"\nsaved: {out_path}\n")

    print("=== STATS (filtered) ===")
    s = out["stats"]
    print(f"total pairs:       {s['total_filtered_pairs']}")
    print(f"unique drift tok:  {s['unique_drift_tokens']}")
    print(f"unique orig tok:   {s['unique_orig_tokens']}")
    print(f"(common pool:      {s['common_pool_size']})")
    print()
    print("=== BY MECHANISM ===")
    for mech, n in sorted(s["by_mech"].items(), key=lambda x: -x[1]):
        print(f"  {mech:<28}  {n:>5}")

    # 展示每机制的 sample 5 对，方便人 eyeball
    print("\n=== SAMPLE 5 per mechanism ===")
    for mech, pairs in sorted(filtered.items(), key=lambda x: -len(x[1])):
        if not pairs:
            continue
        print(f"\n{mech} ({len(pairs)}):")
        for orig, drift in pairs[:10]:
            print(f"  {orig:>10}  →  {drift}")


if __name__ == "__main__":
    main()
