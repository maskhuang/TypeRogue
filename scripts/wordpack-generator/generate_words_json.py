#!/usr/bin/env python3
"""
B-full 词池生成器：从 candidates_filtered.json 生成新 data-json/words.json。

策略：
  common  : 200 tokens, len 4-7, 随机抽 (跨机制)
  short   : 100 tokens, len 3-4
  long    : 150 tokens, len 7+
  15 _words 池 × 50 tokens : 含对应字母 (可与上面 overlap)
  special : 50 hand-curated S 级 anchor (narrative 最强)

写到 output/words_new.json (不直接覆盖 src/data-json/words.json)。
确认后另一步骤 cp 过去。

附产物：output/words_new.lineage.json — 每个 drift token 的 (orig, mech) lineage。
"""
import json
import random
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"

SEED = 42

# ~100 个手工策划的 S 级 anchor，覆盖最强 narrative themes
# 来源：REFERENCE.md §10-§12 + 8 机制经典对 + 翻译漂移 gained gems。
SPECIAL_TOKENS = [
    # 腐烂 / 神圣 (typo)
    "rot", "god", "thee", "lief",
    # signage leading-drop 经典
    "hell", "anger", "ark", "eat", "rain", "tar",
    # OCR cl→d
    "dock", "dose",
    # ASR 同音 (S 级 12 对中的 drift 一侧)
    "wave", "bare", "soul", "steel", "plain", "altar",
    "hare", "heel", "idol", "minor", "pole", "reign", "roll",
    # 长 s ſ→f (神级历史 OCR)
    "feal", "fame", "fail", "fend", "fort", "fouls", "fun", "four", "fit", "fin", "fob",
    # typo drop / 经典字符
    "modem", "compete", "eve", "cold", "bought", "fro", "butt",
    # 整词易混
    "trail", "untied", "scared", "stain", "fried", "wired",
    # OCR / signage 其他
    "tight", "tool", "tall",
    # 警告主题 signage middle
    "waning", "cation",
    # 文员核心 motif
    "pen", "form",
    # 翻译漂移产物 (Bartleby/Kafka/Lincoln 多源 roundtrip 后浮出的 gained tokens)
    # 这些词"来自不存在的原作者"，每个都是某句被译者重写后留下的痕迹
    "deeply", "salvation", "documents", "precious", "memories",
    "enormous", "departed", "servant", "faithful", "grateful",
    "express", "address", "deserved", "themselves", "respectful",
    "following", "sacrificed", "discovered", "realize", "utter",
    "nevertheless", "overwhelming", "histories", "refrain",
    # 长 s 古英语词复活 (历史维度 anomaly)
    "wast", "thee", "thy", "thine",
    # 卷宗 / 操作主题
    "stamp", "punch", "ledger", "intake", "redact",
    "blank", "marked", "voided",
]


def main():
    # Load filtered candidates with lineage
    filtered = json.loads((OUTPUT / "candidates_filtered.json").read_text())

    # Build drift_token → (orig, mech) map (first encountered wins)
    drift_info = {}
    for mech, pairs in filtered["by_mech"].items():
        for orig, drift in pairs:
            if drift not in drift_info:
                drift_info[drift] = {"orig": orig, "mech": mech}

    all_drifts = list(drift_info.keys())
    print(f"→ candidate drift tokens: {len(all_drifts)}", file=sys.stderr)

    # Bucket by length
    short_bucket = [d for d in all_drifts if 2 <= len(d) <= 4]
    medium_bucket = [d for d in all_drifts if 4 <= len(d) <= 7]
    long_bucket = [d for d in all_drifts if len(d) >= 7]

    # Bucket by contained letter (for _words pools)
    letter_buckets = {L: [d for d in all_drifts if L in d] for L in "abcdefghijklmnopqrstuvwxyz"}

    print(f"  short bucket (3-4):  {len(short_bucket)}", file=sys.stderr)
    print(f"  medium bucket (4-7): {len(medium_bucket)}", file=sys.stderr)
    print(f"  long bucket (7+):    {len(long_bucket)}", file=sys.stderr)

    rng = random.Random(SEED)

    def pick(bucket, n, label):
        n_real = min(n, len(bucket))
        if n_real < n:
            print(f"  ⚠ {label}: requested {n}, only {n_real} available", file=sys.stderr)
        return sorted(rng.sample(bucket, n_real))

    new_pool = {}
    new_pool["common"] = {
        "words": pick(medium_bucket, 200, "common"),
        "cost": 5,
        "tier": 1,
    }
    new_pool["short"] = {
        "words": pick(short_bucket, 100, "short"),
        "cost": 10,
        "tier": 2,
    }
    new_pool["long"] = {
        "words": pick(long_bucket, 150, "long"),
        "cost": 12,
        "tier": 3,
    }

    # Letter pools — match original keys (acdefghjklnrstw)
    LETTERS = list("acdefghjklnrstw")
    for L in LETTERS:
        bucket = letter_buckets[L]
        new_pool[f"{L}_words"] = {
            "words": pick(bucket, 50, f"{L}_words"),
            "cost": 8,
            "tier": 2,
            "highlight": L,
        }

    # Special: manual S-tier
    new_pool["special"] = {
        "words": sorted(set(SPECIAL_TOKENS)),  # dedup
        "cost": 15,
        "tier": 3,
    }

    # Verify special tokens are all valid English (use candidate pool as proxy)
    invalid_special = [t for t in SPECIAL_TOKENS if t not in drift_info]
    if invalid_special:
        print(f"  ⚠ special tokens not in candidate pool (still ok if valid English): {invalid_special}", file=sys.stderr)

    # Stats
    all_used = set()
    for cat_name, cat in new_pool.items():
        all_used.update(cat["words"])
    print(f"\n→ total unique tokens in new pool union: {len(all_used)}", file=sys.stderr)
    for cat_name, cat in new_pool.items():
        print(f"  {cat_name:<12} {len(cat['words']):>4} tokens", file=sys.stderr)

    # Write words_new.json
    out_data = {"wordPool": new_pool}
    out_path = OUTPUT / "words_new.json"
    out_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2))
    print(f"\nsaved: {out_path}", file=sys.stderr)

    # Write lineage file: per drift_token its (orig, mech)
    lineage = {}
    for token in all_used:
        if token in drift_info:
            lineage[token] = drift_info[token]
        else:
            # special tokens not in candidate pool (hand-curated outside)
            lineage[token] = {"orig": "(manual)", "mech": "manual_special"}
    lineage_path = OUTPUT / "words_new.lineage.json"
    lineage_path.write_text(json.dumps(lineage, ensure_ascii=False, indent=2))
    print(f"lineage: {lineage_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
