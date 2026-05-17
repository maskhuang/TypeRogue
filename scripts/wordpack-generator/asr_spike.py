#!/usr/bin/env python3
"""
Spike 6: ASR 语音转写错误观察。

pipeline: source text → macOS `say` (TTS) → 16kHz mono wav → whisper-cli (STT) → text
然后 token diff 比较原文 vs STT。

观察音位层错误：
  - 同音字替换 (their/there)
  - 专名替换为常见词 (Bartleby → 'bartle bee')
  - 断句错位 / 复合词解构
  - 古英语词汇被现代化听
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SOURCES = ROOT / "sources"
OUTPUT = ROOT / "output"
MODELS = ROOT / "models"


def run(cmd, *, check=True):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if check and proc.returncode != 0:
        print(f"× cmd failed: {cmd}", file=sys.stderr)
        print(proc.stderr, file=sys.stderr)
        sys.exit(1)
    return proc


def tokenize(text):
    return [w.lower() for w in re.findall(r"[A-Za-z']+", text) if 2 <= len(w) <= 14]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("--voice", default="Daniel", help="macOS say voice (Daniel/Alex/Samantha/Victoria/...)")
    ap.add_argument("--rate", type=int, default=180, help="words per minute")
    ap.add_argument("--model", default="ggml-tiny.en.bin")
    args = ap.parse_args()

    src_path = SOURCES / args.source
    text = src_path.read_text(encoding="utf-8").strip()
    OUTPUT.mkdir(exist_ok=True)
    stem = src_path.stem

    aiff_path = OUTPUT / f"{stem}_tts.aiff"
    wav_path = OUTPUT / f"{stem}_tts.wav"
    model_path = MODELS / args.model

    print(f"→ TTS (say -v {args.voice} -r {args.rate}) ...", file=sys.stderr)
    run(["say", "-v", args.voice, "-r", str(args.rate), "-o", str(aiff_path), text])

    print("→ converting to 16kHz mono wav ...", file=sys.stderr)
    run(["ffmpeg", "-y", "-i", str(aiff_path), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav_path)])

    print(f"→ Whisper STT ({args.model}) ...", file=sys.stderr)
    proc = run(["whisper-cli", "-m", str(model_path), "-f", str(wav_path), "-otxt", "--no-prints"])
    txt_path = wav_path.with_suffix(".wav.txt")
    if not txt_path.exists():
        # whisper-cli sometimes outputs to a different path; check stdout
        stt = proc.stdout.strip()
    else:
        stt = txt_path.read_text().strip()

    # token diff
    orig_tokens = tokenize(text)
    stt_tokens = tokenize(stt)
    orig_set = set(orig_tokens)
    stt_set = set(stt_tokens)

    result = {
        "source_text": text,
        "stt_text": stt,
        "voice": args.voice,
        "rate": args.rate,
        "model": args.model,
        "orig_unique": sorted(orig_set),
        "stt_unique": sorted(stt_set),
        "preserved": sorted(orig_set & stt_set),
        "lost": sorted(orig_set - stt_set),
        "gained": sorted(stt_set - orig_set),
    }
    out_path = OUTPUT / f"{stem}_asr_via_{args.voice}_{args.model.replace('.bin','')}.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nsaved: {out_path}\n")
    print("=== ORIGINAL ===")
    print(text)
    print("\n=== STT ===")
    print(stt)
    print()
    print(f"orig unique : {len(orig_set)}")
    print(f"stt unique  : {len(stt_set)}")
    print(f"preserved   : {len(orig_set & stt_set)}")
    print(f"lost        : {len(orig_set - stt_set)}")
    print(f"gained      : {len(stt_set - orig_set)}")
    print()
    print("--- lost ---")
    print(", ".join(sorted(orig_set - stt_set)))
    print("\n--- gained (via STT mishearing) ---")
    print(", ".join(sorted(stt_set - orig_set)))


if __name__ == "__main__":
    main()
