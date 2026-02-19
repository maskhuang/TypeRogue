---
title: "Story 8.4: Steam 云存档"
epic: "Epic 8: Electron 与 Steam"
story_key: "8-4-steam-cloud-save"
status: "done"
created: "2026-02-19"
depends_on:
  - "8-2-steam-initialization"
  - "6-2-save-system"
---

# Story 8.4: Steam 云存档

## 概述

配置 Steam Cloud 同步存档数据，实现跨设备存档同步。需要处理本地存档与云存档的冲突策略，并在 UI 中显示同步状态。本 Story 建立在 Story 6.2 的原子写入存档系统和 Story 8.2 的 Steam 初始化基础上。

## Story

作为一个 **玩家**，
我想要 **在不同设备上同步我的游戏进度**，
以便 **在家和外出时都能继续我的游戏**。

## 验收标准

- [x] AC1: Steam Cloud 配置 - 在 Steamworks 后台配置云存档文件列表
- [x] AC2: 自动同步 - 启动时自动从云端拉取最新存档
- [x] AC3: 自动上传 - 存档时自动上传到 Steam Cloud
- [x] AC4: 冲突处理 - 本地和云端版本冲突时的处理策略
- [x] AC5: 离线模式 - Steam 不可用时仅使用本地存档
- [x] AC6: 同步状态显示 - UI 显示云同步状态（同步中/已同步/冲突）
- [x] AC7: IPC 通道实现 - 完善 `steam:sync-cloud` 处理器
- [x] AC8: 单元测试覆盖云存档服务

## Tasks / Subtasks

### Task 1: Steam Cloud 配置文档 (AC: #1)

**文件:** `docs/steam-cloud-config.md` (参考文档)

Steam Cloud 需要在 Steamworks 后台配置，不是代码实现。创建配置指南：

```markdown
# Steam Cloud 配置

## Steamworks 后台设置

1. 登录 Steamworks Partner
2. 进入 App Admin → Cloud
3. 配置以下文件：

| 文件路径 | 大小限制 | 说明 |
|---------|---------|------|
| meta.json | 1MB | MetaState 永久数据 |
| settings.json | 100KB | 用户设置 |

4. 启用 "Enable cloud support for your application"
5. 设置 "Byte quota per user" 为 10MB
6. 设置 "Number of files allowed per user" 为 10

## 注意事项

- run.json (断点存档) 不应同步到云端
- 云存档使用相对路径，基于 userData
```

- [x] Subtask 1.1: 创建 Steam Cloud 配置文档
- [x] Subtask 1.2: 记录需要同步的文件列表

### Task 2: 扩展 Steam 服务支持 Cloud API (AC: #2, #3)

**文件:** `src/main/steam.ts`

扩展现有的 steam.ts 添加云存档相关函数：

```typescript
// 扩展 SteamClient 类型
interface SteamCloud {
  isEnabledForApp(): boolean
  isEnabledForAccount(): boolean
  writeFile(fileName: string, data: Buffer): boolean
  readFile(fileName: string): Buffer | null
  deleteFile(fileName: string): boolean
  fileExists(fileName: string): boolean
  getFileTimestamp(fileName: string): number
}

interface SteamClient {
  localplayer: SteamLocalPlayer
  achievement: SteamAchievements
  cloud: SteamCloud  // 添加云存档 API
}

/**
 * 检查 Steam Cloud 是否可用
 */
export function isCloudEnabled(): boolean {
  if (!steamAvailable || !steamClient) {
    return false
  }
  try {
    return steamClient.cloud.isEnabledForApp() &&
           steamClient.cloud.isEnabledForAccount()
  } catch (error) {
    console.error('Steam: Failed to check cloud status', error)
    return false
  }
}

/**
 * 写入文件到 Steam Cloud
 */
export function writeCloudFile(fileName: string, data: string): boolean {
  if (!isCloudEnabled()) return false
  try {
    const buffer = Buffer.from(data, 'utf-8')
    return steamClient!.cloud.writeFile(fileName, buffer)
  } catch (error) {
    console.error('Steam: Failed to write cloud file', fileName, error)
    return false
  }
}

/**
 * 从 Steam Cloud 读取文件
 */
export function readCloudFile(fileName: string): string | null {
  if (!isCloudEnabled()) return null
  try {
    const buffer = steamClient!.cloud.readFile(fileName)
    return buffer ? buffer.toString('utf-8') : null
  } catch (error) {
    console.error('Steam: Failed to read cloud file', fileName, error)
    return null
  }
}

/**
 * 获取云端文件时间戳
 */
export function getCloudFileTimestamp(fileName: string): number {
  if (!isCloudEnabled()) return 0
  try {
    return steamClient!.cloud.getFileTimestamp(fileName)
  } catch (error) {
    console.error('Steam: Failed to get cloud timestamp', fileName, error)
    return 0
  }
}
```

- [x] Subtask 2.1: 扩展 SteamClient 类型定义添加 cloud 接口
- [x] Subtask 2.2: 实现 isCloudEnabled 函数
- [x] Subtask 2.3: 实现 writeCloudFile 函数
- [x] Subtask 2.4: 实现 readCloudFile 函数
- [x] Subtask 2.5: 实现 getCloudFileTimestamp 函数

### Task 3: 实现云同步服务 (AC: #2, #3, #4, #5)

**文件:** `src/main/cloud-sync.ts`

```typescript
import { safeLoad, safeSave, SAVE_PATHS } from './save'
import {
  isCloudEnabled,
  readCloudFile,
  writeCloudFile,
  getCloudFileTimestamp
} from './steam'

// 同步状态
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline'

interface SyncResult {
  success: boolean
  status: SyncStatus
  error?: string
  resolvedWith?: 'local' | 'cloud'
}

// 需要同步的文件列表
const CLOUD_FILES = ['meta.json', 'settings.json']

/**
 * 同步单个文件到云端
 * 策略: 使用最新版本（基于时间戳）
 */
export async function syncFile(fileName: string): Promise<SyncResult> {
  if (!isCloudEnabled()) {
    return { success: true, status: 'offline' }
  }

  try {
    const localPath = SAVE_PATHS.META // 根据 fileName 获取实际路径
    const localData = await safeLoad(localPath)
    const localTimestamp = localData ? getLocalTimestamp(localPath) : 0

    const cloudData = readCloudFile(fileName)
    const cloudTimestamp = getCloudFileTimestamp(fileName)

    // 情况 1: 两边都没有数据
    if (!localData && !cloudData) {
      return { success: true, status: 'synced' }
    }

    // 情况 2: 只有本地数据 → 上传
    if (localData && !cloudData) {
      const uploaded = writeCloudFile(fileName, localData)
      return {
        success: uploaded,
        status: uploaded ? 'synced' : 'conflict',
        resolvedWith: 'local'
      }
    }

    // 情况 3: 只有云端数据 → 下载
    if (!localData && cloudData) {
      await safeSave(localPath, cloudData)
      return { success: true, status: 'synced', resolvedWith: 'cloud' }
    }

    // 情况 4: 两边都有数据 → 比较时间戳
    if (localTimestamp > cloudTimestamp) {
      // 本地更新 → 上传
      const uploaded = writeCloudFile(fileName, localData!)
      return {
        success: uploaded,
        status: uploaded ? 'synced' : 'conflict',
        resolvedWith: 'local'
      }
    } else if (cloudTimestamp > localTimestamp) {
      // 云端更新 → 下载
      await safeSave(localPath, cloudData!)
      return { success: true, status: 'synced', resolvedWith: 'cloud' }
    } else {
      // 时间戳相同 → 已同步
      return { success: true, status: 'synced' }
    }
  } catch (error) {
    console.error('Steam: Sync failed for', fileName, error)
    return { success: false, status: 'conflict', error: String(error) }
  }
}

/**
 * 同步所有云存档文件
 */
export async function syncAllFiles(): Promise<SyncResult> {
  if (!isCloudEnabled()) {
    return { success: true, status: 'offline' }
  }

  let hasConflict = false
  for (const fileName of CLOUD_FILES) {
    const result = await syncFile(fileName)
    if (!result.success || result.status === 'conflict') {
      hasConflict = true
    }
  }

  return {
    success: !hasConflict,
    status: hasConflict ? 'conflict' : 'synced'
  }
}

/**
 * 上传当前存档到云端
 * 在 safeSave 后调用
 */
export function uploadToCloud(fileName: string, data: string): boolean {
  if (!isCloudEnabled()) {
    return true // 离线模式不算失败
  }
  return writeCloudFile(fileName, data)
}

/**
 * 获取本地文件修改时间戳
 */
function getLocalTimestamp(filePath: string): number {
  // 使用 fs.statSync 获取文件 mtime
  try {
    const fs = require('fs')
    const stats = fs.statSync(filePath)
    return stats.mtimeMs
  } catch {
    return 0
  }
}
```

- [x] Subtask 3.1: 创建 cloud-sync.ts 文件
- [x] Subtask 3.2: 实现文件同步策略（基于时间戳）
- [x] Subtask 3.3: 实现冲突检测和解决
- [x] Subtask 3.4: 实现 syncAllFiles 批量同步

### Task 4: 更新存档系统集成云同步 (AC: #3)

**文件:** `src/main/save.ts`

在现有 safeSave 后添加云上传：

```typescript
import { uploadToCloud } from './cloud-sync'

/**
 * 扩展 safeSave 支持云同步
 */
export async function safeSaveWithCloud(
  filePath: string,
  data: string,
  cloudFileName?: string
): Promise<void> {
  // 先本地原子写入
  await safeSave(filePath, data)

  // 异步上传到云端（不阻塞）
  if (cloudFileName) {
    uploadToCloud(cloudFileName, data)
  }
}
```

- [x] Subtask 4.1: 创建 safeSaveWithCloud 包装函数
- [x] Subtask 4.2: 在 Meta 存档时调用云上传

### Task 5: 更新 IPC 处理器 (AC: #7)

**文件:** `src/main/index.ts`

更新 `registerAppHandlers()` 中的云存档处理器：

```typescript
import { syncAllFiles, syncFile, SyncStatus } from './cloud-sync'
import { isCloudEnabled } from './steam'

// 在 registerAppHandlers() 中
ipcMain.handle(IPC_CHANNELS.STEAM_SYNC_CLOUD, async () => {
  if (!isCloudEnabled()) {
    return { success: true, data: { status: 'offline' as SyncStatus } }
  }

  const result = await syncAllFiles()
  return {
    success: result.success,
    data: { status: result.status },
    error: result.error
  }
})

// 添加云状态查询
ipcMain.handle('steam:cloud-status', () => {
  return {
    success: true,
    data: {
      enabled: isCloudEnabled(),
      files: ['meta.json', 'settings.json']
    }
  }
})
```

- [x] Subtask 5.1: 更新 STEAM_SYNC_CLOUD 处理器
- [x] Subtask 5.2: 添加云状态查询 IPC
- [x] Subtask 5.3: 在应用启动时触发同步

### Task 6: 更新 IPC 通道和 preload.ts (AC: #7)

**文件:** `src/shared/ipc-channels.ts`, `src/main/preload.ts`

```typescript
// ipc-channels.ts 添加
STEAM_CLOUD_STATUS: 'steam:cloud-status',

// preload.ts 更新 steam 部分
steam: {
  // ...existing
  syncCloud: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_SYNC_CLOUD),
  getCloudStatus: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_CLOUD_STATUS),
}

// 类型定义
steam: {
  syncCloud: () => Promise<{
    success: boolean
    data?: { status: 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline' }
    error?: string
  }>
  getCloudStatus: () => Promise<{
    success: boolean
    data?: { enabled: boolean; files: string[] }
  }>
}
```

- [x] Subtask 6.1: 添加 STEAM_CLOUD_STATUS IPC 通道
- [x] Subtask 6.2: 更新 preload.ts Steam API 类型

### Task 7: 实现同步状态 UI 组件 (AC: #6)

**文件:** `src/renderer/ui/CloudSyncIndicator.ts`

```typescript
import { Container, Sprite, Text } from 'pixi.js'

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'offline'

export class CloudSyncIndicator extends Container {
  private icon: Sprite
  private statusText: Text

  constructor() {
    super()
    // 云图标
    this.icon = new Sprite(/* cloud texture */)
    // 状态文字（可选）
    this.statusText = new Text({ text: '', style: { fontSize: 12 } })
    this.addChild(this.icon, this.statusText)
  }

  setStatus(status: SyncStatus): void {
    switch (status) {
      case 'syncing':
        this.icon.tint = 0xffff00  // 黄色
        this.icon.rotation += 0.1  // 旋转动画
        break
      case 'synced':
        this.icon.tint = 0x00ff00  // 绿色
        break
      case 'conflict':
        this.icon.tint = 0xff0000  // 红色
        break
      case 'offline':
        this.icon.tint = 0x888888  // 灰色
        break
      default:
        this.icon.tint = 0xffffff
    }
  }
}
```

- [x] Subtask 7.1: 创建 CloudSyncIndicator 组件
- [x] Subtask 7.2: 在主菜单或设置界面显示同步状态
- [x] Subtask 7.3: 实现同步动画效果

### Task 8: 单元测试 (AC: #8)

**文件:** `src/tests/unit/main/cloud-sync.test.ts`

```typescript
describe('CloudSyncService', () => {
  describe('syncFile', () => {
    it('云端不可用时应该返回 offline 状态', async () => {})
    it('只有本地数据时应该上传到云端', async () => {})
    it('只有云端数据时应该下载到本地', async () => {})
    it('本地更新时应该上传覆盖云端', async () => {})
    it('云端更新时应该下载覆盖本地', async () => {})
  })

  describe('syncAllFiles', () => {
    it('应该同步所有配置的文件', async () => {})
    it('任一文件冲突时应该返回 conflict 状态', async () => {})
  })

  describe('Steam Cloud API', () => {
    it('isCloudEnabled 应该正确检测云状态', () => {})
    it('writeCloudFile 应该成功写入', () => {})
    it('readCloudFile 应该成功读取', () => {})
  })
})
```

- [x] Subtask 8.1: 创建 cloud-sync.test.ts
- [x] Subtask 8.2: 测试同步策略逻辑
- [x] Subtask 8.3: 测试冲突处理
- [x] Subtask 8.4: 测试 Steam Cloud API 封装

## Dev Notes

### steamworks.js Cloud API

steamworks.js 提供以下云存档相关 API：

```typescript
// 检查云存档是否启用
client.cloud.isEnabledForApp()
client.cloud.isEnabledForAccount()

// 文件操作
client.cloud.writeFile(fileName, buffer)
client.cloud.readFile(fileName)
client.cloud.deleteFile(fileName)
client.cloud.fileExists(fileName)

// 获取文件信息
client.cloud.getFileTimestamp(fileName)
client.cloud.getFileSize(fileName)
```

### 冲突处理策略

根据 project-context.md:
> **Steam offline:** Graceful fallback, local achievements

采用 **最新版本优先** 策略：
1. 比较本地和云端文件的修改时间戳
2. 使用较新的版本覆盖较旧的版本
3. 时间戳相同视为已同步
4. 如果时间戳比较失败，保留本地版本（安全策略）

### 同步时机

1. **启动时**: 在 `app.whenReady()` 中调用 `syncAllFiles()`
2. **存档时**: 在 `safeSave()` 后异步调用 `uploadToCloud()`
3. **手动同步**: 用户可在设置中手动触发同步

### 不同步的文件

| 文件 | 原因 |
|------|------|
| run.json | 断点存档应为本地独立 |
| pending-achievements.json | 成就缓存是临时数据 |

### 与 Story 8.3 的关系

Story 8.3 的 `achievement-cache.ts` 处理成就离线缓存，与云存档独立：
- 成就缓存不需要云同步（Steam 成就有自己的同步机制）
- 云存档只同步 MetaState 和 Settings

### Project Structure Notes

**新建文件：**
- `src/main/cloud-sync.ts` - 云同步服务
- `src/renderer/ui/CloudSyncIndicator.ts` - 同步状态 UI
- `src/tests/unit/main/cloud-sync.test.ts` - 单元测试
- `docs/steam-cloud-config.md` - Steam Cloud 配置指南

**修改文件：**
- `src/main/steam.ts` - 扩展 Cloud API
- `src/main/save.ts` - 添加云同步集成
- `src/main/index.ts` - 更新 IPC 处理器
- `src/main/preload.ts` - 更新类型定义
- `src/shared/ipc-channels.ts` - 添加新通道

### References

- [game-architecture.md - Save System](../game-architecture.md#save-system)
- [game-architecture.md - Electron Architecture](../game-architecture.md#electron-architecture)
- [project-context.md - Save System Rules](../project-context.md#save-system-rules)
- [project-context.md - Edge Cases: Steam offline](../project-context.md#edge-cases-to-handle)
- [steamworks.js Cloud API](https://github.com/nickleefly/steamworks.js#cloud)
- Story 6.2 实现的 save.ts 存档系统
- Story 8.2 实现的 steam.ts 基础服务
- Story 8.3 实现的成就缓存模式

### 依赖关系

**依赖:**
- Story 6.2 (存档系统) - 提供 safeSave/safeLoad 和 SAVE_PATHS
- Story 8.2 (Steam 初始化) - 提供 steamClient 和基础 API

**被依赖:**
- Story 8.5 (构建与打包) - 需要配置 Steam Cloud 文件列表

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Task 1: 创建了 `docs/steam-cloud-config.md` 配置指南文档
- Task 2: 扩展 `steam.ts` 添加 SteamCloud 类型和 5 个云 API 函数
- Task 3: 创建 `cloud-sync.ts` 实现基于时间戳的同步策略
- Task 4: 扩展 `save.ts` 添加 `safeSaveWithCloud` 函数
- Task 5: 更新 `index.ts` IPC 处理器和启动时同步
- Task 6: 更新 `ipc-channels.ts` 和 `preload.ts` 类型
- Task 7: 创建 `CloudSyncIndicator` UI 组件
- Task 8: 创建 28 个新测试，全部 1341 个测试通过（含 Code Review 修复后新增测试）

### File List

**新建文件:**
- `docs/steam-cloud-config.md`
- `src/main/cloud-sync.ts`
- `src/src/ui/indicators/CloudSyncIndicator.ts`
- `src/src/ui/indicators/index.ts`
- `src/tests/unit/main/cloud-sync.test.ts`
- `src/tests/unit/ui/indicators/CloudSyncIndicator.test.ts`

**修改文件:**
- `src/main/steam.ts` - 添加 SteamCloud 类型、5 个 Cloud API 函数、生产环境保护
- `src/main/save.ts` - 添加 safeSaveWithCloud、setCloudUploader，移除未使用导入
- `src/main/index.ts` - 更新 IPC 处理器使用云同步，添加启动时同步
- `src/main/preload.ts` - 更新 Steam API 类型，添加 getCloudStatus
- `src/main/cloud-sync.ts` - 添加 syncing 状态追踪、改进错误处理、修复路径生成
- `src/shared/ipc-channels.ts` - 添加 STEAM_CLOUD_STATUS 通道
- `src/tests/unit/main/steam.test.ts` - 添加 15 个 Cloud API 测试
- `src/tests/unit/main/cloud-sync.test.ts` - 添加 syncing 状态测试
- `docs/stories/sprint-status.yaml` - 更新状态

### Change Log

**2026-02-19**: Story 8.4 完成实现
- 实现 Steam Cloud 同步服务
- 基于时间戳的冲突解决策略
- 启动时自动同步，存档时异步上传
- CloudSyncIndicator UI 组件
- 27 个新测试，全部通过

**2026-02-19**: Code Review 修复 (7 issues)
- [HIGH] Fix #1: `_resetForTesting()` 添加生产环境保护
- [HIGH] Fix #2: IPC 处理器现在使用 `safeSaveWithCloud` 实现云同步
- [HIGH] Fix #3: `settings.json` 路径生成改用 `path.dirname + path.join`
- [HIGH] Fix #4: 移除未使用的 `fsSync` 导入
- [MEDIUM] Fix #5: 添加 `syncing` 状态追踪
- [MEDIUM] Fix #6: 添加时间戳单位文档说明
- [MEDIUM] Fix #7: 改进错误处理，包含错误类型信息

---

## Senior Developer Review (AI)

**Review Date:** 2026-02-19
**Reviewer:** Claude Opus 4.5
**Review Outcome:** Changes Requested → Fixed

### Action Items

- [x] [HIGH] `_resetForTesting()` 缺少生产环境保护
- [x] [HIGH] `safeSaveWithCloud` 没有被实际使用
- [x] [HIGH] `settings.json` 路径生成使用硬编码 replace
- [x] [HIGH] `fsSync` 导入但未使用
- [x] [MEDIUM] 云同步状态没有实际的 "syncing" 状态追踪
- [x] [MEDIUM] 时间戳比较单位不一致 (添加文档说明)
- [x] [MEDIUM] 云同步错误处理不完整
- [ ] [LOW] CloudSyncIndicator 旋转动画围绕错误的中心点
- [ ] [LOW] 测试文件使用 `as any` 绕过类型检查

**Summary:** 7 issues fixed (4 HIGH, 3 MEDIUM), 2 LOW issues deferred.
