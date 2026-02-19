# Steam Cloud 配置指南

本文档描述如何在 Steamworks 后台配置云存档功能。

## Steamworks 后台设置

1. 登录 [Steamworks Partner](https://partner.steamgames.com/)
2. 选择应用 → 进入 App Admin
3. 点击 **Edit Steamworks Settings** → **Cloud**

### 云存档文件配置

在 Cloud Files 部分添加以下文件：

| 文件路径 | 大小限制 | 说明 |
|---------|---------|------|
| `meta.json` | 1MB | MetaState 永久数据（解锁、成就进度等） |
| `settings.json` | 100KB | 用户偏好设置 |

### 配额设置

| 设置项 | 推荐值 | 说明 |
|--------|--------|------|
| Enable cloud support | ✅ 启用 | 启用云存档功能 |
| Byte quota per user | 10MB | 每用户云存储配额 |
| Number of files allowed per user | 10 | 允许的最大文件数 |

### 根路径设置

- **Root path:** `{64BitSteamID}/`
- 这确保每个用户的存档相互隔离

## 不同步的文件

以下文件不应配置到 Steam Cloud：

| 文件 | 原因 |
|------|------|
| `run.json` | 断点存档应为本地独立，避免跨设备冲突 |
| `pending-achievements.json` | 成就缓存是临时数据，会在 Steam 在线时自动同步 |

## 技术说明

### 云存档路径

Steam Cloud 使用相对路径，基于 `userData` 目录。游戏代码中使用的路径：

```typescript
// 这些路径会被 Steam Cloud 同步
const CLOUD_FILES = ['meta.json', 'settings.json']

// 这些路径不会被同步
const LOCAL_ONLY_FILES = ['run.json', 'pending-achievements.json']
```

### 同步时机

1. **游戏启动时**: Steam 客户端自动下载最新的云存档
2. **游戏退出时**: Steam 客户端自动上传更改的文件
3. **游戏运行中**: 通过 `steamClient.cloud.writeFile()` 手动触发上传

### 冲突处理

当本地和云端版本冲突时，游戏采用 **最新版本优先** 策略：

1. 比较本地和云端文件的修改时间戳
2. 使用较新的版本覆盖较旧的版本
3. 时间戳相同视为已同步
4. 如果时间戳比较失败，保留本地版本（安全策略）

## 验证配置

配置完成后，可通过以下方式验证：

1. 在本地保存游戏进度
2. 关闭游戏，检查 Steam 客户端是否显示 "Syncing..."
3. 在另一台设备登录相同 Steam 账号
4. 启动游戏，确认进度已同步

## 参考文档

- [Steamworks Documentation - Cloud](https://partner.steamgames.com/doc/features/cloud)
- [steamworks.js Cloud API](https://github.com/nickleefly/steamworks.js#cloud)

---

_Last updated: 2026-02-19_
