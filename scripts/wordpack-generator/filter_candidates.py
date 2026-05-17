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
SOURCES = ROOT / "sources"
PROJECT_WORDS = ROOT.parent.parent / "src" / "data-json" / "words.json"
POPULAR_TOP20K = SOURCES / "popular_top20k.json"


PROPERNAMES = Path("/usr/share/dict/propernames")

# 已知地名/品牌/方位词补充黑名单（propernames 主要是英语男性名，覆盖不全）
EXTRA_PROPER_NOUNS = {
    # 国家/地区
    "america", "americas", "american", "americans", "africa", "african", "asia", "asian",
    "europe", "european", "australia", "alberta", "austria", "canada", "china", "chinese",
    "germany", "german", "england", "english", "france", "french", "japan", "japanese",
    "korea", "korean", "russia", "russian", "spain", "spanish", "italy", "italian",
    "india", "indian", "mexico", "mexican", "brazil", "egypt", "iran", "iraq", "israel",
    "jamaica", "jamaican", "fiji", "fuji", "ireland", "irish", "scotland", "scottish",
    "wales", "welsh", "albania", "algeria", "angola", "antarctic", "antarctica",
    "argentina", "armenia", "belarus", "belgium", "bolivia", "bulgaria", "cambodia",
    "chile", "colombia", "congo", "croatia", "cuba", "cyprus", "denmark", "ecuador",
    "ethiopia", "finland", "ghana", "greece", "hungary", "iceland", "indonesia",
    "jordan", "kenya", "kuwait", "latvia", "lebanon", "libya", "malaysia", "mongolia",
    "morocco", "nepal", "nigeria", "norway", "oman", "pakistan", "panama", "paraguay",
    "peru", "philippines", "poland", "portugal", "qatar", "romania", "rwanda", "saudi",
    "senegal", "serbia", "slovakia", "slovenia", "somalia", "sudan", "sweden",
    "switzerland", "syria", "taiwan", "tanzania", "thailand", "tunisia", "turkey",
    "uganda", "ukraine", "uruguay", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
    "bali", "java", "europe", "asia",
    # 美国州 + 大城市
    "boston", "chicago", "dallas", "denver", "detroit", "houston", "miami", "newark",
    "phoenix", "seattle", "atlanta", "buffalo", "cleveland", "columbus", "memphis",
    "nashville", "orlando", "portland", "tampa", "tucson", "vegas", "york",
    "california", "florida", "georgia", "michigan", "nevada", "ohio", "oregon",
    "texas", "utah", "vermont", "virginia", "washington", "wisconsin", "wyoming",
    "alabama", "alaska", "arizona", "arkansas", "colorado", "connecticut", "delaware",
    "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "minnesota", "mississippi", "missouri",
    "montana", "nebraska", "oklahoma", "pennsylvania",
    "baltimore", "sacramento", "philadelphia", "jacksonville", "charlotte",
    "indianapolis", "raleigh", "milwaukee", "mesa",
    # 城市/地区 (国际)
    "london", "paris", "tokyo", "berlin", "moscow", "madrid", "rome", "vienna",
    "dublin", "athens", "geneva", "zurich", "havana", "sydney", "melbourne",
    "stockholm", "oslo", "copenhagen", "amsterdam", "brussels", "lisbon", "warsaw",
    "prague", "budapest", "bucharest", "istanbul", "cairo", "lagos", "nairobi",
    "beijing", "shanghai", "delhi", "mumbai", "karachi", "manila", "jakarta",
    # 短人名 (补 propernames 没覆盖的)
    "abe", "abel", "ada", "andy", "ann", "art", "asa", "ben", "bert", "bess",
    "beth", "bill", "bob", "brad", "brett", "bud", "burt", "cab", "cal", "carl",
    "carr", "chad", "chris", "cody", "dan", "dave", "dean", "dick", "dom", "don",
    "doug", "drew", "ed", "eddy", "eric", "frank", "fred", "gary", "gene", "glen",
    "greg", "hal", "hank", "harry", "henry", "ian", "jack", "jake", "jed", "jen",
    "jenny", "jerry", "jess", "jim", "joe", "john", "josh", "jude", "june", "kate",
    "ken", "kim", "lee", "len", "leo", "leon", "les", "lew", "liam", "lou",
    "mac", "marc", "mark", "mat", "matt", "max", "mel", "mick", "mike", "milt",
    "mort", "ned", "neil", "nick", "nina", "noel", "norm", "otto", "pat", "perry",
    "pete", "phil", "ralph", "ray", "reg", "rex", "rick", "rob", "roger", "ron",
    "roy", "russ", "sam", "sean", "seth", "shaun", "stan", "steve", "sue", "tad",
    "ted", "tim", "tina", "todd", "tom", "tony", "troy", "ty", "val", "vic",
    "vince", "vlad", "walt", "ward", "will", "zach",
    "alice", "amy", "anna", "anne", "betty", "carol", "chloe", "claire", "dawn",
    "diana", "eliza", "ellen", "emma", "fiona", "grace", "hannah", "helen", "ivy",
    "jane", "janet", "julie", "karen", "laura", "linda", "lisa", "lucy", "mary",
    "may", "nora", "olivia", "patricia", "rachel", "ruth", "sara", "sarah", "susan",
    "vera", "belle", "abby", "andrea",
    # 姓氏 (常被 OCR 误)
    "blanc", "costa", "carr", "jain", "ali", "cohen", "lee", "wong", "kim", "li",
    "yang", "zhang", "wang", "chen", "liu", "chang", "chiang",
    # 月份/星期
    "january", "february", "march", "april", "june", "july", "august",
    "september", "october", "november", "december",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    # 品牌/公司
    "google", "apple", "microsoft", "facebook", "twitter", "amazon", "netflix",
    "samsung", "sony", "nintendo", "yamaha", "toyota", "honda", "ford", "tesla",
    "ibm", "intel", "nvidia", "boeing", "starbucks", "mcdonald", "coca", "pepsi",
    # 宗教/神话
    "christ", "jesus", "allah", "buddha", "krishna", "shiva", "vishnu", "zeus",
    "apollo", "athena", "hera", "hades", "odin", "thor", "loki", "ares",
    # 地理特征 / 著名地名
    "amazon", "nile", "danube", "alps", "andes", "himalaya", "everest", "everest",
    "atlantic", "pacific", "arctic", "sahara", "gobi",
    # 一轮 review 后追加的名/地/族裔
    "alonso", "bach", "beck", "chico", "cheng", "ching", "chiang", "chong",
    "ali", "alf", "alfred", "alva", "aron", "aurelio", "bret", "chick",
    "ana", "ange", "ansel", "arch", "ari", "arnie", "arnold", "ashley",
    "betty", "bing", "bjorn", "blake", "buddy", "caleb", "candy", "carly",
    "carmen", "carmine", "carrie", "casey", "cathy", "cesar", "chad", "chan",
    "chase", "chen", "cher", "chi", "chip", "chuck", "claude", "cliff",
    "clive", "colin", "conrad", "craig", "curt", "cyrus", "daley", "damian",
    "daria", "diane", "dolly", "dora", "doris", "dorothy", "duncan", "dustin",
    "earl", "ed", "edith", "edmond", "edna", "eliot", "elise", "elliot",
    "elsa", "elsie", "elvis", "enrico", "ernie", "esther", "eugene", "fanny",
    "felix", "fiona", "floyd", "frances", "fritz", "gabe", "gabriel", "garry",
    "gerald", "gilbert", "gina", "ginger", "ginny", "glenn", "godfrey",
    "gordon", "grant", "grover", "gwen", "hank", "heather", "hector",
    "heidi", "heinz", "herbert", "herman", "hilda", "hilton", "holly",
    "homer", "honor", "horace", "howard", "hubert", "hugo", "ida", "iris",
    "irma", "ivan", "ivy", "jacques", "jamal", "janice", "jasper", "jay",
    "jeff", "jenna", "joanna", "jordan", "judith", "julian", "kelvin", "kenny",
    "kira", "lance", "leah", "lee", "leila", "leo", "leslie", "levi",
    "lewis", "linda", "lloyd", "lola", "lorraine", "louis", "lucas", "lydia",
    "mabel", "maggie", "mandy", "manuel", "marcus", "margaret", "maria",
    "marie", "marina", "marsha", "martha", "martin", "marvin", "maxim",
    "melissa", "mercy", "milan", "milo", "miriam", "mitch", "molly",
    "morgan", "morris", "moses", "muriel", "nadia", "nat", "nathan", "nelson",
    "nigel", "noah", "norma", "olga", "owen", "page", "pam", "patrick",
    "paula", "peggy", "pete", "philip", "polly", "raymond", "rhonda",
    "richard", "rita", "robin", "rod", "ron", "rose", "ruby", "russell",
    "ryan", "sally", "samuel", "sandra", "scott", "selena", "sergio",
    "sheila", "sherry", "sidney", "simon", "stuart", "tamara", "terry",
    "thelma", "theo", "thomas", "tina", "toby", "trent", "trevor", "tucker",
    "vance", "vance", "vernon", "victor", "vincent", "viola", "violet",
    "virgil", "wade", "walt", "wendy", "wes", "wilbur", "wilfred", "winnie",
    "yolanda", "yvonne", "zelda",
    # 地区 / 族裔
    "finnish", "swiss", "dutch", "danish", "polish", "czech", "thai",
    "bengal", "kurd", "celt", "saxon", "gaul", "viking", "inca", "maya",
    "crete", "rhodes", "corfu", "ibiza", "malta", "cyprus", "java", "borneo",
    "sumatra", "ceylon", "siam", "tibet", "nepal", "punjab", "kashmir",
    # 一些更短的杂项
    "ade", "ara", "asa", "uri", "uno", "aja", "asa", "ava", "eli", "elo",
    "esp", "eve", "fay", "ham", "hue", "ina", "isa", "isi", "lou", "moo",
    "nan", "obi", "ono", "ora", "ott", "pia", "pio", "raj", "ria", "una",
    "uta", "wai", "yan", "yi", "zoe",
    # 单独词性问题
    "jew", "jews", "jewry",
}


def load_proper_nouns():
    """专有名词 (人名/地名/品牌) 黑名单 — 用于过滤 wordpack 候选。"""
    names = set()
    # macOS /usr/share/dict/propernames (人名为主)
    if PROPERNAMES.exists():
        for line in PROPERNAMES.read_text().splitlines():
            w = line.strip().lower()
            if w:
                names.add(w)
    # 加补充地名/品牌
    names.update(EXTRA_PROPER_NOUNS)
    return names


def load_common_words():
    """常用词参考集 = 项目 words.json (3025) ∪ popular-english-words top-20K。

    单独项目池太窄会过滤掉长词；popular-top20K 覆盖度足以容纳大量长词候选。
    """
    common = set()

    # 项目 words.json
    data = json.loads(PROJECT_WORDS.read_text())
    for cat_name, cat_data in data.get("wordPool", {}).items():
        for w in cat_data.get("words", []):
            common.add(w.lower())
    proj_count = len(common)

    # popular-english-words top 20K
    pop_data = json.loads(POPULAR_TOP20K.read_text())
    for w in pop_data.get("top20k", []):
        common.add(w.lower())
    pop_count = len(common) - proj_count

    print(f"  project words.json:    {proj_count}", file=sys.stderr)
    print(f"  + popular top20K:      {pop_count} new (total {len(common)})", file=sys.stderr)
    return common


def main():
    print(f"→ loading common words from {PROJECT_WORDS.relative_to(ROOT.parent.parent)} ...", file=sys.stderr)
    common = load_common_words()
    print(f"  common words: {len(common)}", file=sys.stderr)

    print("→ loading proper noun blacklist ...", file=sys.stderr)
    proper = load_proper_nouns()
    print(f"  proper nouns: {len(proper)}", file=sys.stderr)

    print("→ loading candidates_dictwide.json ...", file=sys.stderr)
    raw = json.loads((OUTPUT / "candidates_dictwide.json").read_text())

    filtered = defaultdict(list)
    all_drift = set()
    all_orig = set()
    blocked_by_proper = 0

    for mech, pairs in raw["by_mech"].items():
        for orig, drift in pairs:
            if orig in common and drift in common:
                if orig in proper or drift in proper:
                    blocked_by_proper += 1
                    continue
                filtered[mech].append([orig, drift])
                all_drift.add(drift)
                all_orig.add(orig)

    print(f"  blocked by proper noun filter: {blocked_by_proper} pairs", file=sys.stderr)

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
