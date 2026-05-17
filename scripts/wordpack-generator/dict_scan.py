#!/usr/bin/env python3
"""
B-full 候选挖掘：dict-wide unified scanner。

对 /usr/share/dict/words 22 万词跑所有字符级 confusion class，
找出"原词 → 漂移词"双词都在 dict 的候选对。

覆盖机制：
  - 机制 1 OCR confusion: rn↔m, cl↔d, h↔b, f↔t, m↔n (末尾), o↔a, o↔c, e↔c, i↔l, u↔v
  - 机制 4 typo: char drop / transpose / adjacent (qwerty) / doubling
  - 机制 7 长 s ſ→f: 按古英语规则替换后 OCR 读成 f
  - 机制 8 signage drop: leading / trailing / middle 单字符脱落

不覆盖（需其它脚本）：
  - 机制 2 翻译漂移 (translate_spike.py 跑多源批量)
  - 机制 3 弱模型治愈 (语法层，非词级)
  - 机制 5 redaction (短语级)
  - 机制 6 ASR 同音字 (用手工词典补)

输出：output/candidates_dictwide.json
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
OUTPUT = ROOT / "output"
DICT_PATH = Path("/usr/share/dict/words")

MIN_LEN = 3
MAX_LEN = 10

# qwerty 邻键 (typo 机制 4)
QWERTY_ADJ = {
    'q': 'wa', 'w': 'qeas', 'e': 'wrds', 'r': 'etdf', 't': 'ryfg',
    'y': 'tugh', 'u': 'yihj', 'i': 'uojk', 'o': 'ipkl', 'p': 'ol',
    'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv',
    'h': 'gyujnb', 'j': 'huikmn', 'k': 'jiolm', 'l': 'kop',
    'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn',
    'n': 'bhjm', 'm': 'njk',
}

# OCR 字符替换 confusion class (双向)
# 每个 tuple: (from_pattern, to_replacement, label)
OCR_CONFUSIONS = [
    # 字符粘连
    ("rn", "m", "ocr_rn→m"),
    ("m", "rn", "ocr_m→rn"),
    ("cl", "d", "ocr_cl→d"),
    ("d", "cl", "ocr_d→cl"),
    # 圆弧笔画
    ("h", "b", "ocr_h→b"),
    ("b", "h", "ocr_b→h"),
    # 短横笔画
    ("f", "t", "ocr_f→t"),
    ("t", "f", "ocr_t→f"),
    # 末尾对称错读 (整词处理时会扫所有位置)
    ("m", "n", "ocr_m→n"),
    ("n", "m", "ocr_n→m"),
    # 开口度
    ("o", "a", "ocr_o→a"),
    ("a", "o", "ocr_a→o"),
    # 视觉相似
    ("o", "c", "ocr_o→c"),
    ("c", "o", "ocr_c→o"),
    ("e", "c", "ocr_e→c"),
    ("c", "e", "ocr_c→e"),
    ("i", "l", "ocr_i→l"),
    ("l", "i", "ocr_l→i"),
    ("u", "v", "ocr_u→v"),
    ("v", "u", "ocr_v→u"),
    # 元音替换 (typo + OCR 共有)
    ("a", "e", "vowel_a→e"),
    ("e", "a", "vowel_e→a"),
    ("i", "e", "vowel_i→e"),
    ("e", "i", "vowel_e→i"),
]


def load_dict():
    s = set()
    for line in DICT_PATH.read_text().splitlines():
        w = line.strip().lower()
        if w and w.isalpha() and MIN_LEN <= len(w) <= MAX_LEN:
            s.add(w)
    return s


def variants_replace_each_pos(word, src, dst):
    """对每个 src 出现位置做单点替换，产出所有可能变体。"""
    out = set()
    if src == dst:
        return out
    if len(src) == 1 and len(dst) == 1:
        # 单字符替换：每个位置各替换一次
        for i, c in enumerate(word):
            if c == src:
                out.add(word[:i] + dst + word[i + 1:])
    elif len(src) > 1:
        # 多字符 pattern：每个 occurrence 各替换一次
        for m in re.finditer(re.escape(src), word):
            i = m.start()
            out.add(word[:i] + dst + word[i + len(src):])
    else:
        # src 单字符、dst 多字符：每个位置插入
        for i, c in enumerate(word):
            if c == src:
                out.add(word[:i] + dst + word[i + 1:])
    return out


def variants_drop_each(word):
    """从每个位置丢一个字符。"""
    return {word[:i] + word[i + 1:] for i in range(len(word))}


def variants_transpose_adjacent(word):
    """相邻两个字符互换。"""
    out = set()
    for i in range(len(word) - 1):
        if word[i] != word[i + 1]:
            out.add(word[:i] + word[i + 1] + word[i] + word[i + 2:])
    return out


def variants_qwerty_adjacent(word):
    """每个字符各替换为 qwerty 邻键。"""
    out = set()
    for i, c in enumerate(word):
        for adj in QWERTY_ADJ.get(c, ''):
            out.add(word[:i] + adj + word[i + 1:])
    return out


def variants_double_each(word):
    """每个字符各重复一次 (字符被错敲两次)。"""
    return {word[:i] + word[i] + word[i:] for i in range(len(word))}


def variants_collapse_doubles(word):
    """连续相同字符塌缩 (oo→o, ll→l)。"""
    out = set()
    for i in range(len(word) - 1):
        if word[i] == word[i + 1]:
            out.add(word[:i] + word[i + 1:])
    return out


def apply_long_s_then_f(word):
    """模拟长 s 印刷后 OCR 错读为 f：
       规则：词尾 s 保留，词中 s 在 b/f 前保留，其它 s → ſ → f。
       这里只输出 OCR 后果（字符级 s → f 替换在合规位置）。
    """
    out = []
    chars = list(word)
    for i, c in enumerate(chars):
        if c == 's':
            # 词尾
            if i == len(chars) - 1:
                out.append('s')
            # b/f 前
            elif i + 1 < len(chars) and chars[i + 1] in ('b', 'f'):
                out.append('s')
            # 前一是 s 且当前是 s (ss 第二个)
            elif i > 0 and chars[i - 1] == 's':
                out.append('s')
            else:
                out.append('f')
        else:
            out.append(c)
    result = ''.join(out)
    return {result} if result != word else set()


def scan_all(dict_set):
    """对每个 dict 词跑所有 transformation，收集双合法对。"""
    found = defaultdict(set)  # mech_label → {(orig, drift)}

    print(f"→ scanning {len(dict_set)} dict words ...", file=sys.stderr)

    n_done = 0
    for orig in dict_set:
        n_done += 1
        if n_done % 25000 == 0:
            print(f"  {n_done}/{len(dict_set)}", file=sys.stderr)

        # OCR confusion class
        for src, dst, label in OCR_CONFUSIONS:
            for cand in variants_replace_each_pos(orig, src, dst):
                if cand != orig and cand in dict_set:
                    found[label].add((orig, cand))

        # typo drop
        for cand in variants_drop_each(orig):
            if cand and cand != orig and cand in dict_set:
                found["typo_drop"].add((orig, cand))

        # typo transpose
        for cand in variants_transpose_adjacent(orig):
            if cand != orig and cand in dict_set:
                found["typo_transpose"].add((orig, cand))

        # typo qwerty adjacent
        for cand in variants_qwerty_adjacent(orig):
            if cand != orig and cand in dict_set:
                found["typo_qwerty"].add((orig, cand))

        # typo doubling
        for cand in variants_double_each(orig):
            if cand and len(cand) <= MAX_LEN and cand != orig and cand in dict_set:
                found["typo_doubling"].add((orig, cand))

        # typo collapse doubles
        for cand in variants_collapse_doubles(orig):
            if cand and cand != orig and cand in dict_set:
                found["typo_collapse"].add((orig, cand))

        # 长 s OCR (s → f 在合规位置)
        for cand in apply_long_s_then_f(orig):
            if cand and cand != orig and cand in dict_set:
                found["longs_s→f"].add((orig, cand))

    return found


def signage_categorize(orig, drift):
    """按删除位置标 signage 子类。仅用于 typo_drop 子分类。"""
    if len(orig) == len(drift) + 1:
        for i in range(len(orig)):
            if orig[:i] + orig[i+1:] == drift:
                if i == 0:
                    return "signage_leading_drop"
                if i == len(orig) - 1:
                    return "signage_trailing_drop"
                return "signage_middle_drop"
    return None


def main():
    print("→ loading dict ...", file=sys.stderr)
    dict_set = load_dict()
    print(f"  dict size: {len(dict_set)}", file=sys.stderr)

    found = scan_all(dict_set)

    # 把 typo_drop 进一步标 signage 子类
    drop_pairs = found.pop("typo_drop", set())
    for orig, drift in drop_pairs:
        sub = signage_categorize(orig, drift)
        if sub:
            found[sub].add((orig, drift))

    OUTPUT.mkdir(exist_ok=True)

    # 统计 + 去重
    all_drifts = set()
    all_origs = set()
    for pairs in found.values():
        for orig, drift in pairs:
            all_drifts.add(drift)
            all_origs.add(orig)

    stats = {
        "total_unique_pairs": sum(len(p) for p in found.values()),
        "unique_drift_tokens": len(all_drifts),
        "unique_orig_tokens": len(all_origs),
        "by_mech": {mech: len(pairs) for mech, pairs in sorted(found.items())},
    }

    out_data = {
        "stats": stats,
        "by_mech": {mech: sorted(list(pairs)) for mech, pairs in sorted(found.items())},
    }

    out_path = OUTPUT / "candidates_dictwide.json"
    out_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2))

    print(f"\nsaved: {out_path}\n")
    print(f"=== STATS ===")
    print(f"total pairs:       {stats['total_unique_pairs']}")
    print(f"unique drift tok:  {stats['unique_drift_tokens']}")
    print(f"unique orig tok:   {stats['unique_orig_tokens']}")
    print()
    print(f"=== BY MECHANISM ===")
    for mech, n in sorted(stats["by_mech"].items(), key=lambda x: -x[1]):
        print(f"  {mech:<28}  {n:>6}")


if __name__ == "__main__":
    main()
