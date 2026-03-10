#!/bin/bash
# ============================================
# Suno AI BGM 生成脚本
# 用法: SUNO_API_KEY=your_key ./scripts/generate-bgm.sh
# ============================================

set -e

API_KEY="${SUNO_API_KEY:?请设置 SUNO_API_KEY 环境变量}"
API_BASE="https://api.sunoapi.org/api/v1"
OUTPUT_DIR="src/public/audio"

# Lo-fi chill BGM prompt — 为打字肉鸽游戏设计
# 关键词: 温暖/模糊/磁带质感/慢节奏/循环友好
STYLE="lo-fi chill ambient, warm tape hiss, mellow jazzy chords, vinyl crackle, dreamy pads"
TITLE="Typing Rogue BGM"

echo "=== 生成 Lo-fi Chill BGM ==="
echo "Style: $STYLE"
echo ""

# 1. 提交生成请求
echo "[1/3] 提交生成请求..."
RESPONSE=$(curl -s -X POST "$API_BASE/generate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"customMode\": true,
    \"instrumental\": true,
    \"model\": \"V4_5ALL\",
    \"style\": \"$STYLE\",
    \"title\": \"$TITLE\",
    \"callBackUrl\": \"https://localhost/noop\"
  }")

echo "Response: $RESPONSE"

TASK_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['taskId'])" 2>/dev/null)

if [ -z "$TASK_ID" ]; then
  echo "❌ 无法获取 taskId，请检查 API key 和响应"
  exit 1
fi

echo "✅ taskId: $TASK_ID"
echo ""

# 2. 轮询等待完成
echo "[2/3] 等待生成完成 (通常 2-3 分钟)..."
MAX_POLLS=60  # 最多等 5 分钟
POLL_INTERVAL=5

for i in $(seq 1 $MAX_POLLS); do
  sleep $POLL_INTERVAL

  STATUS_RESPONSE=$(curl -s -X GET "$API_BASE/generate/record-info?taskId=$TASK_ID" \
    -H "Authorization: Bearer $API_KEY")

  STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])" 2>/dev/null)

  echo "  [$i] status: $STATUS"

  case "$STATUS" in
    SUCCESS)
      echo "✅ 生成完成!"
      break
      ;;
    CREATE_TASK_FAILED|GENERATE_AUDIO_FAILED|CALLBACK_EXCEPTION|SENSITIVE_WORD_ERROR)
      echo "❌ 生成失败: $STATUS"
      ERROR_MSG=$(echo "$STATUS_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('errorMessage',''))" 2>/dev/null)
      echo "  错误信息: $ERROR_MSG"
      exit 1
      ;;
  esac
done

if [ "$STATUS" != "SUCCESS" ]; then
  echo "❌ 超时"
  exit 1
fi

# 3. 下载音频文件
echo ""
echo "[3/3] 下载音频..."
mkdir -p "$OUTPUT_DIR"

# 提取音频 URL 列表
AUDIO_URLS=$(echo "$STATUS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']['response']['sunoData']
for i, track in enumerate(data):
    url = track.get('audioUrl') or track.get('streamAudioUrl', '')
    title = track.get('title', f'track_{i}')
    duration = track.get('duration', '?')
    tags = track.get('tags', '')
    print(f'{i}|{url}|{title}|{duration}|{tags}')
" 2>/dev/null)

echo "$AUDIO_URLS" | while IFS='|' read -r idx url title duration tags; do
  if [ -n "$url" ]; then
    FILENAME="bgm-lofi-${idx}.mp3"
    echo "  下载 #$idx: $title ($duration 秒) → $OUTPUT_DIR/$FILENAME"
    echo "  Tags: $tags"
    curl -s -L -o "$OUTPUT_DIR/$FILENAME" "$url"
    echo "  ✅ 已保存: $OUTPUT_DIR/$FILENAME"
  fi
done

echo ""
echo "=== 完成! ==="
echo "音频文件保存在 $OUTPUT_DIR/"
echo "在浏览器中试听后，决定是否集成到游戏中"
