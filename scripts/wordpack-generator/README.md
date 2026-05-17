# wordpack-generator

未受理文本生成机制 spike 套件。**不是 wordpack 自动生成器** —— 是候选词对挖掘 + 机制实证工具，产物供人工策划 wordpack 时参考。

详细背景：claude memory `feedback_unfiled_text_mechanism_taxonomy` / `feedback_wordpack_handcrafted_with_tool_ref`。

## 安装

```bash
cd scripts/wordpack-generator
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 系统依赖
brew install tesseract whisper-cpp ffmpeg

# Whisper 小模型 (~77MB)
mkdir -p models
curl -sSL -o models/ggml-tiny.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin
```

环境变量：
- `ANTHROPIC_API_KEY` (机制 2/3/5 需要)

## Spike 套件 (8 机制对应 9+ 脚本)

| 脚本 | 机制 | 输出 |
|---|---|---|
| `spike.py` | 1 · OCR 字符错读 | output/{src}_spike.json + degraded.png |
| `translate_spike.py` | 2 · AI 翻译往返 (en→zh→ja→ru→en) | output/{src}_roundtrip_via_{langs}.json |
| `hallucinate_spike.py` / `hallucinate_spike2.py` | (证伪) AI 幻觉 | output/hallucination_spike_*.json |
| `healer_compare.py` | 3 · AI 弱模型治愈 (Haiku/Sonnet/Opus 对照) | output/healer_compare.json |
| `typo_spike.py` | 4 · 手抄 typo (qwerty 邻键+ dict) | output/{src}_typo_candidates.json |
| `redact_spike.py` | 5 · 黑条 redaction (hard + soft) | output/{src}_redact.json |
| `asr_spike.py` | 6 · ASR 语音转写 (say→whisper) | output/{src}_asr_via_{voice}.json |
| `longs_spike.py` | 7 · 长 s (ſ) 历史 OCR | output/{src}_longs_ocr.json + longs.png |
| `signage_spike.py` | 8 · 霓虹熄灯字符删除扫描 | output/signage_neon_candidates.json |
| `real_sign_ocr.py` | 8 · 真实损伤招牌 OCR | output/real_signs_ocr.json |

## 用法

```bash
# 机制 1
python spike.py bartleby_excerpt.txt --noise 20 --blur 1.2

# 机制 2 (多跳)
python translate_spike.py bartleby_short.txt --via zh ja ru

# 机制 3 (需要 ANTHROPIC_API_KEY)
python healer_compare.py

# 机制 4
python typo_spike.py bartleby_short.txt

# 机制 5 (需要 ANTHROPIC_API_KEY)
python redact_spike.py bartleby_short.txt

# 机制 6 (需要 whisper-cpp + tiny.en 模型)
python asr_spike.py bartleby_short.txt --voice Daniel

# 机制 7
python longs_spike.py bartleby_short.txt --font-size 14

# 机制 8
python signage_spike.py
python real_sign_ocr.py  # 需先按 sources/signs/SOURCES.md 重下载图片
```

## 重要纪律

1. **本工具产候选，不产 wordpack JSON**。所有 `src/public/assets/data/words/*.json` 是 hand-authored；脚本输出到 `output/` 供人 review。
2. **未受理文本 = 双词都合法 + 语义偏移 + 仍像有作者**。物理破损（不是合法词）不是未受理。
3. **损伤强度有 sweet spot 曲线**（倒 U）。盲目调高损伤参数会跌出曲线变全噪声。peak 配置见各 spike 的注释。

## 待办

- [ ] REFERENCE.md — 8 机制 × S 级词对汇编 (供策划查阅)
- [ ] candidate-miner 改造 (统一接口、按 mechanism 标注、统一 dictionary filter)
- [ ] 5 个手工 wordpack 设计 (starter / common / long / f-words / s-words)
