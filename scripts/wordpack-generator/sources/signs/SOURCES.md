# Real signage image sources

These images are NOT committed (see ../../.gitignore). To reproduce spike-9 (real_sign_ocr.py), re-download via the URLs below. All from Wikimedia Commons, CC-licensed.

## Used in spike-9

| File | Wikimedia title | License |
|---|---|---|
| `Ghost_sign__17_Ranelagh_Street.jpg` | File:Ghost sign, 17 Ranelagh Street.jpg | CC BY-SA |
| `Faded_ghost_sign_-_geograph.org.uk_-_5598088.jpg` | File:Faded ghost sign - geograph.org.uk - 5598088.jpg | CC BY-SA |
| `Ghost_sign_Greensburg_PA.jpg` | File:Ghost sign Greensburg PA.jpg | CC BY-SA |
| `Faded_wall_sign_-_geograph.org.uk_-_2090550.jpg` | File:Faded wall sign - geograph.org.uk - 2090550.jpg | CC BY-SA |
| `Faded_Sign_in_Gowthorpe_-_geograph.org.uk_-_1319656.jpg` | File:Faded Sign in Gowthorpe - geograph.org.uk - 1319656.jpg | CC BY-SA |

## Redownload command

```bash
cd scripts/wordpack-generator
for title in \
  "Ghost sign, 17 Ranelagh Street.jpg" \
  "Faded ghost sign - geograph.org.uk - 5598088.jpg" \
  "Ghost sign Greensburg PA.jpg" \
  "Faded wall sign - geograph.org.uk - 2090550.jpg" \
  "Faded Sign in Gowthorpe - geograph.org.uk - 1319656.jpg" \
; do
  enc=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$title'))")
  json=$(curl -sS "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=File:$enc")
  url=$(echo "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); pages=list(d['query']['pages'].values()); print(pages[0].get('imageinfo',[{}])[0].get('url',''))")
  fn=$(echo "$title" | tr ' ,' '__')
  curl -sSL -A "Mozilla/5.0" -o "sources/signs/$fn" "$url"
done
```
