# 打字肉鸽 - 构建与发布指南

本文档说明如何构建、打包和发布游戏。

## 快速开始

### 开发模式

```bash
cd src
npm run dev:electron
```

### 生产构建

```bash
# 构建当前平台
npm run release

# Windows
npm run release:win

# macOS
npm run release:mac

# Linux
npm run release:linux

# 所有平台 (需要相应平台环境)
npm run dist:all
```

## 构建命令

| 命令 | 说明 |
|------|------|
| `npm run build:electron` | 编译 TypeScript 和打包资源 |
| `npm run pack` | 创建未打包的目录版本 |
| `npm run dist` | 创建当前平台安装程序 |
| `npm run dist:win` | 仅 Windows |
| `npm run dist:mac` | 仅 macOS |
| `npm run dist:linux` | 仅 Linux |
| `npm run release` | 完整构建 + 打包 |
| `npm run verify` | 验证构建产物 |
| `npm run clean` | 清理所有构建目录 |

## 构建产物

构建完成后，产物位于 `release/{version}/` 目录：

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `打字肉鸽-x.x.x-win-x64.exe` | NSIS 安装程序 |
| Windows | `打字肉鸽-x.x.x-win-x64-portable.exe` | 便携版 |
| macOS | `打字肉鸽-x.x.x-mac-arm64.dmg` | Apple Silicon |
| macOS | `打字肉鸽-x.x.x-mac-x64.dmg` | Intel Mac |
| macOS | `打字肉鸽-x.x.x-mac-*.zip` | ZIP 压缩包 |
| Linux | `打字肉鸽-x.x.x-linux-x64.AppImage` | AppImage |
| Linux | `打字肉鸽-x.x.x-linux-x64.deb` | Debian 包 |

## 跨平台构建限制

| 构建目标 | 可用平台 | 原因 |
|----------|----------|------|
| Windows | Windows, macOS, Linux | Wine 支持 |
| macOS | macOS 仅限 | 需要 Xcode/签名 |
| Linux | 全部 | 通用 |

## Steam 发布

### 配置

1. 编辑 `steam/app_build.vdf`:
   - 替换 `YOUR_APP_ID` 为你的 Steam App ID
   - 替换 `YOUR_DEPOT_ID_*` 为对应的 Depot ID

2. 编辑 `steam/depot_build_*.vdf`:
   - 更新 Depot ID

### 上传

```bash
# 设置环境变量
export STEAMCMD_PATH=/path/to/steamcmd
export STEAM_USERNAME=your_username

# 运行上传脚本
./steam/scripts/upload.sh
```

## 代码签名

### Windows

设置环境变量:
```bash
export WIN_CERT_FILE=/path/to/certificate.pfx
export WIN_CERT_PASSWORD=your_password
```

### macOS

设置环境变量:
```bash
export APPLE_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=XXXXXXXXXX
```

## 版本管理

版本号在 `package.json` 中定义，构建时自动注入到应用中：

```json
{
  "version": "0.1.0"
}
```

查看版本信息:
```typescript
import { getVersionInfo } from '@shared/version'

const info = getVersionInfo()
console.log(info.version)     // "0.1.0"
console.log(info.buildDate)   // ISO 8601 日期
console.log(info.commit)      // Git 提交哈希
```

## 故障排除

### steamworks.js 加载失败

确保 `electron-builder.json` 中的配置正确:
```json
{
  "files": ["node_modules/steamworks.js/**/*"],
  "asarUnpack": ["node_modules/steamworks.js/**/*"]
}
```

### macOS 公证失败

1. 确认 `entitlements.mac.plist` 包含必要权限
2. 检查 `hardenedRuntime: true`
3. 验证 Apple Developer 账户权限

### 构建产物过小

如果 `.exe` 或 `.dmg` 小于 100MB:
1. 检查 `dist-electron` 目录是否完整
2. 确认 `files` 配置包含所有必要文件
3. 运行 `npm run verify` 检查

### 构建验证失败

```bash
# 检查构建产物
npm run verify

# 查看详细信息
ls -la release/
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
        working-directory: src

      - run: npm run release
        working-directory: src
        env:
          WIN_CERT_FILE: ${{ secrets.WIN_CERT_FILE }}
          WIN_CERT_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

      - uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: src/release/
```

## 相关文档

- [electron-builder 配置](https://www.electron.build/configuration/configuration)
- [Steamworks SDK](https://partner.steamgames.com/doc/sdk)
- [macOS 公证](https://www.electron.build/guides/notarize.html)
- [Steam Cloud 配置](./steam-cloud-config.md)
