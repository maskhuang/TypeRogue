#!/usr/bin/env python3
"""
合并额外候选来源到 candidates_filtered.json：
  - ASR homophone pairs (sources/asr_homophones.json)
  - 翻译漂移 (output/*_roundtrip_via_*.json) 多源批量

输出更新后的 candidates_filtered.json，包含新增机制：
  - asr_homophone
  - translation_roundtrip

generate_words_json.py 直接读 candidates_filtered.json 即可消费。
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"
SOURCES = ROOT / "sources"

# 复用 filter_candidates.py 的常用词参考集 + 专名黑名单
sys.path.insert(0, str(ROOT))
from filter_candidates import load_common_words, load_proper_nouns


_TOKEN = re.compile(r"[A-Za-z]+")


def tokenize(text, *, min_len=3, max_len=14):
    return [w.lower() for w in _TOKEN.findall(text) if min_len <= len(w) <= max_len]


def load_asr_pairs(common: set, proper: set) -> list:
    """ASR homophone 对 — 双词都在 common 池且非专名才保留。双向都加入（A→B 和 B→A）。"""
    src = SOURCES / "asr_homophones.json"
    if not src.exists():
        return []
    data = json.loads(src.read_text())
    out = []
    for a, b in data.get("pairs", []):
        a, b = a.lower(), b.lower()
        if a == b or not a.isalpha() or not b.isalpha():
            continue
        if a not in common or b not in common:
            continue
        if a in proper or b in proper:
            continue
        out.append([a, b])
        out.append([b, a])
    # 去重
    seen = set()
    unique = []
    for p in out:
        k = tuple(p)
        if k not in seen:
            seen.add(k)
            unique.append(p)
    return unique


def load_translation_drift_pairs(common: set, proper: set) -> list:
    """从所有 *_roundtrip_via_*.json 提取漂移 token 对。

    每个 roundtrip 文件有 chain: [{lang: en, text: ...}, ..., {lang: en, text: ...}]
    比较第一个和最后一个 en 文本的 token 集合：
      - 原文 unique token = orig set
      - 最终 en unique token = final set
      - gained = final - orig (= 翻译漂移产生的新词)
      - 配对：把 gained 与原 sentence 的某个 lost token 配 (启发式：长度近 + 词性近)
    简化：直接把每个 gained 作为 drift，标 orig=(translation_source)，省去精确 lineage。
    """
    out = []
    for path in OUTPUT.glob("*_roundtrip_via_*.json"):
        try:
            data = json.loads(path.read_text())
        except Exception:
            continue
        chain = data.get("chain", [])
        if len(chain) < 2:
            continue
        # 第一个和最后一个 en
        if chain[0]["lang"] != "en" or chain[-1]["lang"] != "en":
            continue
        orig_tokens = set(tokenize(chain[0]["text"]))
        final_tokens = set(tokenize(chain[-1]["text"]))
        gained = final_tokens - orig_tokens
        lost = orig_tokens - final_tokens

        # 启发式配对：对每个 gained，找最接近长度的 lost 作为 proposed origin
        lost_by_len = defaultdict(list)
        for w in lost:
            if w in common and w not in proper:
                lost_by_len[len(w)].append(w)

        for drift in gained:
            if drift not in common or drift in proper:
                continue
            # 找长度差 ≤2 的 lost token
            best = None
            for offset in range(0, 3):
                for cand_len in (len(drift) - offset, len(drift) + offset):
                    if cand_len in lost_by_len and lost_by_len[cand_len]:
                        best = lost_by_len[cand_len][0]
                        break
                if best:
                    break
            if best and best != drift:
                out.append([best, drift])
    return out


def main():
    print("→ loading common + proper noun ...", file=sys.stderr)
    common = load_common_words()
    proper = load_proper_nouns()

    print("→ loading existing candidates_filtered.json ...", file=sys.stderr)
    filt = json.loads((OUTPUT / "candidates_filtered.json").read_text())

    print("→ extracting ASR homophone pairs ...", file=sys.stderr)
    asr = load_asr_pairs(common, proper)
    print(f"  ASR pairs (both directions, dedup, filtered): {len(asr)}", file=sys.stderr)

    print("→ extracting translation roundtrip drift pairs ...", file=sys.stderr)
    trans = load_translation_drift_pairs(common, proper)
    print(f"  translation drift pairs: {len(trans)}", file=sys.stderr)

    by_mech = filt["by_mech"]
    by_mech["asr_homophone"] = asr
    by_mech["translation_roundtrip"] = trans

    # 重算 stats
    all_drift = set()
    all_orig = set()
    for mech, pairs in by_mech.items():
        for orig, drift in pairs:
            all_drift.add(drift)
            all_orig.add(orig)

    new_stats = {
        "total_filtered_pairs": sum(len(p) for p in by_mech.values()),
        "unique_drift_tokens": len(all_drift),
        "unique_orig_tokens": len(all_orig),
        "common_pool_size": len(common),
        "proper_noun_pool_size": len(proper),
        "by_mech": {mech: len(pairs) for mech, pairs in sorted(by_mech.items())},
    }
    filt["stats"] = new_stats

    out_path = OUTPUT / "candidates_filtered.json"
    out_path.write_text(json.dumps(filt, ensure_ascii=False, indent=2))
    print(f"\nsaved (merged): {out_path}", file=sys.stderr)
    print(f"\nTOTAL unique drift after merge: {len(all_drift)} (was 2877)", file=sys.stderr)
    print(f"\n=== BY MECH ===", file=sys.stderr)
    for mech, n in sorted(new_stats["by_mech"].items(), key=lambda x: -x[1]):
        print(f"  {mech:<28}  {n:>5}", file=sys.stderr)


if __name__ == "__main__":
    main()
