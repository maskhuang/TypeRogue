"""
aigc-art/scripts/gen.py

主编排脚本：prompt YAML → Replicate API → 后处理 → 评测 → 产出候选。

使用：
    export REPLICATE_API_TOKEN=r8_xxx
    python scripts/gen.py --prompt prompts/enemy-dummy.v1.yaml

    # 指定特定 variation：
    python scripts/gen.py --prompt prompts/enemy-dummy.v1.yaml --only idle

    # 干跑（不调 API，用预先下载的图走后续步骤）：
    python scripts/gen.py --prompt prompts/enemy-dummy.v1.yaml --dry-run runs/test-input/
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from PIL import Image

# 同目录脚本
sys.path.insert(0, str(Path(__file__).parent))
import checks as checks_mod  # noqa: E402
import palette_lock  # noqa: E402


# ============================================================
# Prompt YAML 加载（含 extends）
# ============================================================

def load_prompt_yaml(path: Path) -> Dict[str, Any]:
    """加载 prompt YAML 并递归解析 extends: _base.yaml。"""
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    base_name = data.pop("extends", None)
    if base_name:
        base_path = path.parent / base_name
        base = load_prompt_yaml(base_path)
        # 合并：base 在前，子文件覆盖
        merged = deep_merge(base, data)
        return merged
    return data


def deep_merge(base: Dict, override: Dict) -> Dict:
    """递归合并 dict。override 的非 None 值覆盖 base。list 直接替换，不拼接。"""
    result = dict(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def prompt_hash(spec: Dict[str, Any]) -> str:
    """稳定的 prompt 内容哈希，用于 metadata 追溯。"""
    canonical = json.dumps(spec, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]


# ============================================================
# Replicate API 调用
# ============================================================

def call_replicate(
    spec: Dict[str, Any],
    positive: str,
    negative: str,
    seed: int,
) -> bytes:
    """
    调 Replicate 跑单次生成。返回 PNG bytes。

    实施注意：具体的 model id / input schema 因 Replicate 上的 Flux-dev 封装
    版本而异。这里写一个通用模板，首次跑之前需要核对当前 Replicate 页面的
    input schema 并补全 lora 加载方式。
    """
    try:
        import replicate
    except ImportError:
        raise RuntimeError(
            "replicate not installed. Run: pip install -r aigc-art/requirements.txt"
        )

    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        raise RuntimeError("REPLICATE_API_TOKEN not set")

    model_id = spec["model"]["id"]

    model_input: Dict[str, Any] = {
        "prompt": positive,
        "negative_prompt": negative,
        "width": spec["gen_size"][0],
        "height": spec["gen_size"][1],
        "num_inference_steps": spec.get("steps", 30),
        "guidance": spec.get("cfg", 6.5),
        "seed": seed,
        "num_outputs": 1,
    }

    # LoRA（如果支持）
    loras = spec.get("model", {}).get("lora", [])
    if loras:
        # 不同 Flux 封装的 LoRA 参数名不一（hf_lora / lora_weights / ...）
        # 这里写两个常见字段名，实际首次跑时按报错调整
        first = loras[0]
        model_input["hf_lora"] = first.get("source", first.get("name"))
        model_input["lora_scale"] = first.get("weight", 0.85)

    print(f"  [replicate] calling {model_id} (seed={seed})...")
    t0 = time.time()
    output = replicate.run(model_id, input=model_input)
    dt_s = time.time() - t0
    print(f"  [replicate] got response in {dt_s:.1f}s")

    # Replicate 的输出通常是 URL 列表或单 URL
    import requests

    if isinstance(output, list):
        url = output[0]
    elif isinstance(output, str):
        url = output
    else:
        # FileOutput object (newer replicate SDK)
        url = str(output) if hasattr(output, "__str__") else output[0]

    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    return resp.content


# ============================================================
# 单 variation 生成循环（含自动重试）
# ============================================================

def generate_variation(
    spec: Dict[str, Any],
    variation: Dict[str, Any],
    run_dir: Path,
    palette_path: Path,
    dry_run_input: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    生成一个 variation（例如 enemy-dummy idle）。
    流程：batch gen → postprocess → eval → 重试 retry_until_pass 次。
    返回本 variation 的统计信息。
    """
    asset_id = spec["asset_id"]
    suffix = variation["suffix"]
    var_dir = run_dir / suffix
    raw_dir = var_dir / "raw"
    pp_dir = var_dir / "postprocessed"
    raw_dir.mkdir(parents=True, exist_ok=True)
    pp_dir.mkdir(parents=True, exist_ok=True)

    batch_size = spec.get("batch_size", 8)
    retry_limit = spec.get("retry_until_pass", 3)
    target_size = tuple(spec["target_size"])

    # Prompt 组装
    positive_tpl = spec.get("positive_override", spec.get("shared_positive", ""))
    negative_tpl = spec.get("negative_override", spec.get("shared_negative", ""))
    positive = positive_tpl.format(
        shared_positive=spec.get("shared_positive", ""),
        pose_hint=variation.get("pose_hint", ""),
    )
    negative = negative_tpl.format(
        shared_negative=spec.get("shared_negative", ""),
    )

    stats = {
        "variation": suffix,
        "attempts": 0,
        "total_generated": 0,
        "eval_pass_count": 0,
        "cost_usd_estimate": 0.0,
        "passing_candidates": [],
        "seeds": [],
    }

    passing: List[Path] = []

    for attempt in range(retry_limit):
        stats["attempts"] += 1
        print(f"\n[{asset_id}/{suffix}] attempt {attempt + 1}/{retry_limit}")

        for i in range(batch_size):
            cand_name = f"attempt{attempt + 1:02d}_cand{i + 1:02d}"
            raw_path = raw_dir / f"{cand_name}.png"
            pp_path = pp_dir / f"{cand_name}.png"

            if dry_run_input:
                # 干跑：从本地目录取图
                src_imgs = sorted(dry_run_input.glob("*.png"))
                if not src_imgs:
                    raise RuntimeError(f"Dry-run input {dry_run_input} empty")
                img_bytes = src_imgs[i % len(src_imgs)].read_bytes()
                seed = -1
            else:
                seed = random.randint(1, 2**31 - 1)
                try:
                    img_bytes = call_replicate(spec, positive, negative, seed)
                except Exception as e:
                    print(f"  ✗ gen failed: {e}")
                    continue
                stats["cost_usd_estimate"] += 0.025  # Flux-dev 估算

            raw_path.write_bytes(img_bytes)
            stats["total_generated"] += 1
            stats["seeds"].append(seed)

            # 后处理
            try:
                palette_lock.postprocess(
                    input_path=raw_path,
                    output_path=pp_path,
                    palette_path=palette_path,
                    target_size=target_size,
                    outline=spec.get("postprocess", {}).get("outline_enforce", False),
                    bg_removal=spec.get("postprocess", {}).get(
                        "bg_removal", "corner-floodfill"
                    ),
                )
            except Exception as e:
                print(f"  ✗ postprocess failed on {cand_name}: {e}")
                continue

            # 评测
            try:
                img = Image.open(pp_path)
                eval_spec = build_eval_spec(spec, palette_path)
                report = checks_mod.eval_candidate(img, eval_spec)
            except Exception as e:
                print(f"  ✗ eval failed on {cand_name}: {e}")
                continue

            if report.passed:
                print(f"  ✓ {cand_name} PASSED")
                passing.append(pp_path)
                stats["passing_candidates"].append(str(pp_path.relative_to(run_dir)))
                stats["eval_pass_count"] += 1
            else:
                reasons = "; ".join(c.reason for c in report.failures if c.reason)
                print(f"  ✗ {cand_name} failed: {reasons}")

        if passing:
            print(f"[{suffix}] got {len(passing)} passing candidates, stopping retry loop")
            break

    if not passing:
        print(f"⚠️  [{suffix}] no candidates passed after {retry_limit} retries")

    return stats


# ============================================================
# Eval spec 组装（从 prompt spec 抽出 checks 所需字段）
# ============================================================

def build_eval_spec(spec: Dict[str, Any], palette_path: Path) -> Dict[str, Any]:
    eval_cfg = spec.get("eval", {})
    palette = checks_mod.load_palette(str(palette_path))
    # 合并多 glob：新式 style_golden_globs (list) + 旧式 style_golden_glob (str) + 旧 fallback
    globs: list = []
    if eval_cfg.get("style_golden_globs"):
        globs.extend(eval_cfg["style_golden_globs"])
    if eval_cfg.get("style_golden_glob"):
        globs.append(eval_cfg["style_golden_glob"])
    if eval_cfg.get("fallback_golden_glob"):
        globs.append(eval_cfg["fallback_golden_glob"])
    return {
        "palette": palette,
        "target_size": spec["target_size"],
        "alpha_halo_max": eval_cfg.get("alpha_halo_max", 0),
        "silhouette_sharpness_min": eval_cfg.get("silhouette_sharpness_min", 0.30),
        "clip_similarity_min": eval_cfg.get("clip_similarity_min", 0.80),
        "golden_globs": globs,
    }


# ============================================================
# 主入口
# ============================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="AIGC asset draft generator")
    parser.add_argument("--prompt", required=True, type=Path, help="prompt YAML 路径")
    parser.add_argument("--only", default=None, help="仅跑某个 variation suffix")
    parser.add_argument(
        "--dry-run",
        type=Path,
        default=None,
        help="不调 API，从目录取 PNG 走后续 pipeline（用于 smoke test）",
    )
    args = parser.parse_args()

    spec = load_prompt_yaml(args.prompt)
    asset_id = spec["asset_id"]
    date_str = dt.date.today().isoformat()

    # Draft-only 模式：HUD 纹理类，不跑评测闸门
    pipeline_mode = spec.get("pipeline_mode", "full")

    repo_root = Path(__file__).parent.parent  # aigc-art/
    run_dir = repo_root / "runs" / f"{date_str}_{asset_id}"
    run_dir.mkdir(parents=True, exist_ok=True)

    palette_path = repo_root / spec.get(
        "postprocess", {}
    ).get("palette_file", "references/palette/resurrect-32.png")

    variations = spec.get("variations", [])
    if args.only:
        variations = [v for v in variations if v.get("suffix") == args.only]
        if not variations:
            print(f"❌ No variation with suffix '{args.only}'")
            return 1

    print(f"=" * 60)
    print(f"Asset: {asset_id}")
    print(f"Prompt version: {spec.get('version', '?')}")
    print(f"Prompt hash: {prompt_hash(spec)}")
    print(f"Run dir: {run_dir}")
    print(f"Variations: {[v['suffix'] for v in variations]}")
    print(f"Pipeline mode: {pipeline_mode}")
    print(f"=" * 60)

    all_stats: List[Dict[str, Any]] = []
    t_start = time.time()

    for var in variations:
        var_stats = generate_variation(
            spec=spec,
            variation=var,
            run_dir=run_dir,
            palette_path=palette_path,
            dry_run_input=args.dry_run,
        )
        all_stats.append(var_stats)

    # 写 metadata.json
    try:
        prompt_rel = str(args.prompt.resolve().relative_to(repo_root.resolve()))
    except ValueError:
        prompt_rel = str(args.prompt)
    metadata = {
        "run_id": run_dir.name,
        "asset_id": asset_id,
        "prompt_version": spec.get("version"),
        "prompt_hash": prompt_hash(spec),
        "prompt_file": prompt_rel,
        "model": spec["model"]["id"],
        "lora": spec["model"].get("lora", []),
        "variations": all_stats,
        "wall_time_sec": round(time.time() - t_start, 1),
        "total_cost_usd_estimate": round(
            sum(s["cost_usd_estimate"] for s in all_stats), 3
        ),
        "dry_run": args.dry_run is not None,
    }
    (run_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    total_pass = sum(s["eval_pass_count"] for s in all_stats)
    print(f"\n{'=' * 60}")
    print(f"Done. Total passing: {total_pass}")
    print(f"Metadata: {run_dir / 'metadata.json'}")
    print(f"Next: python scripts/pick.py {run_dir}")
    print(f"{'=' * 60}")

    return 0 if total_pass > 0 else 2


if __name__ == "__main__":
    sys.exit(main())
