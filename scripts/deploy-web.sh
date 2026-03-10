#!/bin/bash
# ============================================
# 打字肉鸽 - Web Demo 构建 & 打包
# ============================================
# 输出 typing-roguelike-demo.zip 供上传 itch.io

set -e

echo "🔨 Building Web Demo..."
cd "$(dirname "$0")/../src"
npm run build:web

echo "📦 Packaging..."
cd ../dist-web
zip -r ../typing-roguelike-demo.zip .

echo "✅ Done! Upload typing-roguelike-demo.zip to itch.io"
echo "   Settings: HTML project, viewport 1280x720"
