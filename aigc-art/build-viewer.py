#!/usr/bin/env python3
"""
Build an HTML gallery viewer for all AIGC art pipeline outputs.
Scans runs/ for postprocessed PNGs and organizes by pipeline + variant.
Usage: python build-viewer.py
Output: runs/art-viewer.html
"""

import base64
import os
from pathlib import Path

RUNS_DIR = Path(__file__).parent / "runs"
OUTPUT = RUNS_DIR / "art-viewer.html"

def collect_images():
    """Collect all postprocessed images grouped by pipeline > variant."""
    pipelines = {}
    for run_dir in sorted(RUNS_DIR.iterdir()):
        if not run_dir.is_dir() or run_dir.name.startswith('.'):
            continue
        # Extract pipeline name: 2026-04-16_battle-bg -> battle-bg
        parts = run_dir.name.split('_', 1)
        if len(parts) < 2:
            continue
        date, pipeline = parts[0], parts[1]

        variants = {}
        for variant_dir in sorted(run_dir.iterdir()):
            if not variant_dir.is_dir():
                continue
            pp_dir = variant_dir / "postprocessed"
            if not pp_dir.exists():
                continue
            images = sorted(pp_dir.glob("*.png"))
            if images:
                variants[variant_dir.name] = images

        if variants:
            key = f"{pipeline} ({date})"
            if key not in pipelines:
                pipelines[key] = {}
            pipelines[key].update(variants)

    return pipelines


def img_to_data_uri(path, max_width=640):
    """Convert image to base64 data URI."""
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return f"data:image/png;base64,{data}"


def build_html(pipelines):
    # Count totals
    total_images = sum(
        len(imgs) for variants in pipelines.values() for imgs in variants.values()
    )
    total_variants = sum(len(v) for v in pipelines.values())

    tabs_html = []
    content_html = []

    for i, (pipeline_name, variants) in enumerate(pipelines.items()):
        tab_id = f"tab_{i}"
        active = "active" if i == 0 else ""
        img_count = sum(len(imgs) for imgs in variants.values())
        tabs_html.append(
            f'<div class="tab {active}" onclick="switchTab(\'{tab_id}\')">'
            f'{pipeline_name} ({img_count})</div>'
        )

        cards = []
        for variant_name, images in variants.items():
            img_tags = []
            for img_path in images[:6]:  # Max 6 per variant
                uri = img_to_data_uri(img_path)
                img_tags.append(
                    f'<img src="{uri}" alt="{variant_name}" '
                    f'title="{img_path.name}" loading="lazy">'
                )

            cards.append(f"""
<div class="card">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="card-title">{variant_name}</span>
    <span class="card-count">{len(images)} candidates</span>
  </div>
  <div class="card-body">
    <div class="img-grid">
      {''.join(img_tags)}
    </div>
  </div>
</div>""")

        content_html.append(
            f'<div id="{tab_id}" class="tab-content {active}">'
            f'{"".join(cards)}</div>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>活字大教堂 · Art Pipeline Viewer</title>
<style>
  :root {{
    --bg: #1a1a1e; --bg2: #232328; --bg3: #2c2c32;
    --text: #d4d0c8; --dim: #8a8680; --gold: #c8a84e;
    --border: #3a3a40;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Courier New', monospace;
    background: var(--bg); color: var(--text);
    padding: 2rem; max-width: 1200px; margin: 0 auto;
  }}
  h1 {{ font-size: 1.6rem; color: var(--gold); text-align: center; margin-bottom: 0.3rem; }}
  .subtitle {{ text-align: center; color: var(--dim); font-size: 0.85rem; margin-bottom: 1.5rem; }}
  .stats {{
    display: flex; justify-content: center; gap: 2rem;
    margin-bottom: 1.5rem; flex-wrap: wrap;
  }}
  .stat {{
    text-align: center; padding: 0.6rem 1.2rem;
    background: var(--bg2); border-radius: 6px; border: 1px solid var(--border);
  }}
  .stat-num {{ font-size: 1.5rem; color: var(--gold); font-weight: bold; }}
  .stat-label {{ font-size: 0.7rem; color: var(--dim); text-transform: uppercase; }}
  .tabs {{
    display: flex; gap: 0; border-bottom: 2px solid var(--border);
    margin-bottom: 1rem; flex-wrap: wrap;
  }}
  .tab {{
    padding: 0.5rem 1rem; cursor: pointer; color: var(--dim);
    border-bottom: 2px solid transparent; margin-bottom: -2px;
    font-size: 0.8rem; transition: all 0.2s;
  }}
  .tab:hover {{ color: var(--text); }}
  .tab.active {{ color: var(--gold); border-bottom-color: var(--gold); }}
  .tab-content {{ display: none; }}
  .tab-content.active {{ display: block; }}
  .card {{
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 6px; margin-bottom: 0.8rem; overflow: hidden;
  }}
  .card-header {{
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.6rem 1rem; background: var(--bg3);
    border-bottom: 1px solid var(--border); cursor: pointer;
  }}
  .card-header:hover {{ background: #333338; }}
  .card-title {{ color: var(--gold); font-size: 0.9rem; }}
  .card-count {{ color: var(--dim); font-size: 0.75rem; }}
  .card-body {{ display: none; padding: 0.8rem; }}
  .card.open .card-body {{ display: block; }}
  .img-grid {{
    display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }}
  .img-grid img {{
    width: 100%; image-rendering: pixelated;
    border: 1px solid var(--border); border-radius: 4px;
    cursor: pointer; transition: transform 0.2s;
  }}
  .img-grid img:hover {{ transform: scale(1.05); }}
  /* Lightbox */
  .lightbox {{
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.9); z-index: 1000;
    justify-content: center; align-items: center; cursor: pointer;
  }}
  .lightbox.show {{ display: flex; }}
  .lightbox img {{
    max-width: 95%; max-height: 95%; image-rendering: pixelated;
  }}
</style>
</head>
<body>

<h1>活字大教堂 · Art Pipeline Viewer</h1>
<p class="subtitle">The Ironpress Cathedral — AIGC Art Candidates</p>

<div class="stats">
  <div class="stat"><div class="stat-num">{len(pipelines)}</div><div class="stat-label">Pipelines</div></div>
  <div class="stat"><div class="stat-num">{total_variants}</div><div class="stat-label">Variants</div></div>
  <div class="stat"><div class="stat-num">{total_images}</div><div class="stat-label">Candidates</div></div>
</div>

<div class="tabs">
  {''.join(tabs_html)}
</div>

{''.join(content_html)}

<div class="lightbox" id="lightbox" onclick="this.classList.remove('show')">
  <img id="lightbox-img" src="">
</div>

<script>
function switchTab(id) {{
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById(id).classList.add('active')
}}
document.querySelectorAll('.img-grid img').forEach(img => {{
  img.addEventListener('click', e => {{
    e.stopPropagation()
    document.getElementById('lightbox-img').src = img.src
    document.getElementById('lightbox').classList.add('show')
  }})
}})
</script>

<div style="text-align:center;margin-top:2rem;color:var(--dim);font-size:0.7rem">
  Generated by Art Pipeline Viewer · {__import__('datetime').date.today()}
</div>

</body>
</html>"""


if __name__ == "__main__":
    print("收集图片...")
    pipelines = collect_images()
    for name, variants in pipelines.items():
        total = sum(len(v) for v in variants.values())
        print(f"  {name}: {len(variants)} variants, {total} images")

    print("\n构建 HTML...")
    html = build_html(pipelines)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\n✅ 已生成: {OUTPUT} ({len(html) // 1024}KB)")
    print("   用浏览器打开即可浏览")
