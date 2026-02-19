#!/bin/bash
# ============================================
# 打字肉鸽 - Steam Depot 上传脚本
# ============================================
# Story 8.5: 构建与打包 (AC: #4)
#
# 使用说明:
# 1. 设置 STEAMCMD_PATH 环境变量指向 steamcmd
# 2. 设置 STEAM_USERNAME 环境变量
# 3. 更新 steam/*.vdf 文件中的 App ID 和 Depot ID
# 4. 运行此脚本
#
# Steam Guard 2FA 说明:
# - 首次运行时会提示输入 Steam Guard 代码
# - 可以使用 steamcmd +login user pass +quit 预先登录并缓存凭据
# - CI/CD 环境建议使用 sentry 文件或 Steam Build Account

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
STEAM_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_SCRIPT="$STEAM_DIR/app_build.vdf"

# 检查 steamcmd 路径
if [ -z "$STEAMCMD_PATH" ]; then
    echo "Error: STEAMCMD_PATH environment variable not set"
    echo "Example: export STEAMCMD_PATH=/path/to/steamcmd"
    exit 1
fi

if [ ! -f "$STEAMCMD_PATH" ] && [ ! -d "$STEAMCMD_PATH" ]; then
    echo "Error: steamcmd not found at $STEAMCMD_PATH"
    exit 1
fi

# 检查用户名
if [ -z "$STEAM_USERNAME" ]; then
    echo "Error: STEAM_USERNAME environment variable not set"
    exit 1
fi

# 检查构建配置
if [ ! -f "$BUILD_SCRIPT" ]; then
    echo "Error: Build script not found: $BUILD_SCRIPT"
    exit 1
fi

echo "============================================"
echo "打字肉鸽 - Steam Depot Upload"
echo "============================================"
echo ""

# 构建
echo "[1/3] Building release..."
cd "$PROJECT_DIR"
npm run release
echo ""

# 验证构建
echo "[2/3] Verifying build..."
npm run verify
echo ""

# 上传到 Steam
# 注意: 如果启用了 Steam Guard，首次运行需要输入验证码
# steamcmd 会缓存登录凭据，后续运行不需要重新验证
echo "[3/3] Uploading to Steam..."
echo "If prompted for Steam Guard code, enter it manually."
"$STEAMCMD_PATH" +login "$STEAM_USERNAME" +run_app_build "$BUILD_SCRIPT" +quit

echo ""
echo "============================================"
echo "Upload complete!"
echo "============================================"
