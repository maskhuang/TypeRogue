"""
aigc-art/scripts/pick.py

交互式挑选通过评测闸门的候选图，复制到 selected.png + 打印 Aseprite 手动步骤。

使用：
    python scripts/pick.py runs/2026-04-14_enemy-dummy/
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path


def pick_for_variation(var_dir: Path) -> Path | None:
    """
    var_dir 形如 runs/2026-04-14_enemy-dummy/idle/
    展示 postprocessed/ 下所有候选，让用户选一张。
    """
    pp_dir = var_dir / "postprocessed"
    if not pp_dir.exists():
        print(f"  ⚠️  no postprocessed dir in {var_dir}")
        return None

    candidates = sorted(pp_dir.glob("*.png"))
    if not candidates:
        print(f"  ⚠️  no candidates in {pp_dir}")
        return None

    print(f"\n[{var_dir.name}] {len(candidates)} candidates:")
    for i, c in enumerate(candidates, 1):
        print(f"  [{i}] {c.name}")

    while True:
        try:
            choice = input(f"  pick (1-{len(candidates)}, or 's' to skip): ").strip()
        except EOFError:
            return None
        if choice.lower() == "s":
            return None
        if choice.isdigit() and 1 <= int(choice) <= len(candidates):
            picked = candidates[int(choice) - 1]
            target = var_dir / "selected.png"
            shutil.copy(picked, target)
            print(f"  ✓ copied → {target}")
            return target
        print(f"  invalid input, try again")


def main() -> int:
    parser = argparse.ArgumentParser(description="交互式挑选候选图")
    parser.add_argument("run_dir", type=Path, help="runs/YYYY-MM-DD_asset-id/ 目录")
    args = parser.parse_args()

    if not args.run_dir.exists():
        print(f"❌ {args.run_dir} does not exist")
        return 1

    # 读 metadata
    meta_file = args.run_dir / "metadata.json"
    if meta_file.exists():
        metadata = json.loads(meta_file.read_text(encoding="utf-8"))
        print(f"Run: {metadata.get('run_id')}")
        print(f"Prompt: {metadata.get('prompt_version')} ({metadata.get('prompt_hash')})")
        print(f"Total cost: ${metadata.get('total_cost_usd_estimate', 0):.3f}")

    # 扫描 variation 目录
    var_dirs = sorted([d for d in args.run_dir.iterdir() if d.is_dir()])
    if not var_dirs:
        print("❌ no variation subdirs found")
        return 1

    picked: list[Path] = []
    for vd in var_dirs:
        p = pick_for_variation(vd)
        if p:
            picked.append(p)

    if not picked:
        print("\n⚠️  nothing picked")
        return 2

    # 打印下一步 Aseprite 指引
    print("\n" + "=" * 60)
    print("Picked candidates:")
    for p in picked:
        print(f"  {p}")
    print("\n📝 Next step — Aseprite polish:")
    print("  1. 打开 Aseprite，新建目标尺寸的 .aseprite 文件")
    print("  2. 设置调色板：Palette > Presets > Load from .png")
    print(f"     用 aigc-art/references/palette/resurrect-32.png")
    print("  3. Import selected.png 作为参考层（锁定 + 降透明度）")
    print("  4. 新建绘制层，对照参考手工清线 / 修剪影")
    print("  5. 保存到 art-source/57-3/<asset>/<variation>.aseprite")
    print("  6. 导出：python scripts/export.py <aseprite-file>")
    print("  7. 参考 prompt YAML 的 polish_checklist 段做最终自检")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
