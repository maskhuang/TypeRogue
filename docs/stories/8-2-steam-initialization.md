---
title: "Story 8.2: Steam 初始化"
epic: "Epic 8: Electron 与 Steam"
story_key: "8-2-steam-initialization"
status: "completed"
created: "2026-02-19"
completed: "2026-02-19"
depends_on:
  - "8-1-electron-main-process"
---

# Story 8.2: Steam 初始化

## 概述

集成 steamworks.js 初始化 Steam API，为后续成就和云存档功能奠定基础。这是 Steam 集成的第一步，需要实现 Steam 客户端检测、AppID 配置和离线模式降级。

## Story

作为一个 **开发者**，
我想要 **初始化 Steam API 并检测 Steam 客户端状态**，
以便 **后续故事可以使用 Steam 成就和云存档功能**。

## 验收标准

- [x] AC1: steamworks.js 依赖安装和配置正确
- [x] AC2: Steam 客户端检测功能正常（isAvailable 返回正确状态）
- [x] AC3: AppID 配置文件（steam_appid.txt）正确放置
- [x] AC4: 离线模式降级处理（Steam 不可用时游戏仍可运行）
- [x] AC5: Steam 用户名获取功能正常
- [x] AC6: IPC 通道实现 steam:* 系列接口
- [x] AC7: 单元测试覆盖 Steam 服务和降级逻辑

## 技术说明

### 文件位置

**新建文件：**
- `src/main/steam.ts` - Steam API 封装服务
- `steam_appid.txt` - Steam AppID 配置（开发用）
- `src/tests/unit/main/steam.test.ts` - Steam 服务测试

**修改文件：**
- `src/main/index.ts` - 调用 Steam 初始化
- `src/package.json` - 添加 steamworks.js 依赖
- `src/electron-builder.json` - 添加 native 模块打包配置

**注意:** `src/main/preload.ts` 已在 Story 8.1 中配置好 Steam API 暴露，本 Story 无需修改。

### 架构参考

```
game-architecture.md - Electron Architecture:

┌─────────────────────────────────────┐
│  Electron Main Process              │
│  - Steam API (steamworks.js)   ← 本 Story 实现
│  - 文件系统 (存档)                   │
│  - 窗口管理                          │
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────▼──────────────────────┐
│  Electron Renderer Process          │
│  - 游戏逻辑 (TypeScript)            │
│  - 渲染 (PixiJS v8 WebGL)           │
│  - UI + 输入处理                     │
└─────────────────────────────────────┘

project-context.md - Electron Architecture Rules:
- All Steam API calls in main process only
- NEVER call Steam API from renderer
- NEVER block main process with synchronous operations
```

### 依赖关系

**依赖:**
- Story 8.1 (Electron 主进程) - 已完成，提供 IPC 通道框架

**被依赖:**
- Story 8.3 (Steam 成就) - 需要本 Story 的 Steam 初始化
- Story 8.4 (Steam 云存档) - 需要本 Story 的 Steam 初始化

### Story 8.1 提供的基础

Story 8.1 已经创建了以下 Steam 相关 IPC 通道（预留实现）：

```typescript
// src/shared/ipc-channels.ts
IPC_CHANNELS.STEAM_IS_AVAILABLE    // 'steam:is-available'
IPC_CHANNELS.STEAM_GET_USER_NAME   // 'steam:get-user-name'
IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT  // 'steam:unlock-achievement' (8.3)
IPC_CHANNELS.STEAM_SYNC_CLOUD      // 'steam:sync-cloud' (8.4)

// src/main/preload.ts - 已有 steam API 暴露
window.electronAPI.steam.isAvailable()
window.electronAPI.steam.getUserName()
```

本 Story 需要：
1. 创建 `src/main/steam.ts` 实现真正的 Steam 逻辑
2. 更新 `src/main/index.ts` 中的 Steam IPC 处理器

## 实现任务

### Task 1: 安装 steamworks.js (AC: #1)

**命令:**
```bash
npm install steamworks.js --save
```

**注意:**
- steamworks.js 需要在 Electron 主进程中使用
- 需要 Steam 客户端运行才能正常工作
- 确保 electron-builder 配置包含 native 模块

### Task 2: 创建 steam_appid.txt (AC: #3)

**文件:** `src/steam_appid.txt`（src 目录下，与 electron-builder.json 同级）

```
480
```

**说明:**
- `480` 是 Steam 的测试 AppID (Spacewar)
- 开发时使用此测试 ID
- 发布时替换为实际 AppID
- electron-builder 的 extraResources 会将此文件复制到应用资源目录
- 此文件不应提交到生产构建

### Task 3: 创建 Steam 服务 (AC: #2, #4, #5)

**文件:** `src/main/steam.ts`

```typescript
// ============================================
// 打字肉鸽 - Steam API 服务
// ============================================
// Story 8.2: Steam 初始化

// steamworks.js 类型定义（本地定义以支持动态 require）
interface SteamLocalPlayer {
  getName(): string
  getSteamId(): { steamId64: bigint }
}

interface SteamClient {
  localplayer: SteamLocalPlayer
}

let steamClient: SteamClient | null = null
let steamAvailable = false

// 用于测试注入的初始化函数（仅在测试环境下使用）
let _testInitFn: (() => SteamClient) | null = null

/**
 * 注入测试用的初始化函数（仅用于测试）
 * @internal
 */
export function _setTestInitFn(fn: (() => SteamClient) | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('_setTestInitFn is only available in test environment')
  }
  _testInitFn = fn
}

/**
 * 初始化 Steam API
 * 必须在 app.whenReady() 之后调用
 *
 * @returns true 如果 Steam 初始化成功
 */
export function initSteam(): boolean {
  try {
    // 如果有测试注入的初始化函数，使用它
    if (_testInitFn) {
      steamClient = _testInitFn()
    } else {
      // 动态导入 steamworks.js 避免在测试环境下崩溃
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { init } = require('steamworks.js')
      steamClient = init()
    }
    steamAvailable = true
    console.log('Steam: Initialized successfully')
    return true
  } catch (error) {
    // Steam 不可用时降级处理
    console.warn('Steam: Not available, running in offline mode', error)
    steamAvailable = false
    steamClient = null
    return false
  }
}

// ... 其他函数保持不变 (isSteamAvailable, getSteamUserName, etc.)

/**
 * 重置 Steam 状态（仅用于测试）
 * @internal
 */
export function _resetForTesting(): void {
  steamClient = null
  steamAvailable = false
  _testInitFn = null
}
```

**注意:** 使用依赖注入模式 (`_setTestInitFn`) 解决 Vitest 无法 mock 动态 `require()` 的问题。

### Task 4: 更新主进程 Steam IPC 处理器 (AC: #6)

**文件:** `src/main/index.ts`

更新 `registerAppHandlers()` 函数中的 Steam 处理器：

```typescript
import { initSteam, isSteamAvailable, getSteamUserName, shutdownSteam } from './steam'

// 在 app.whenReady() 中初始化 Steam
app.whenReady().then(() => {
  // 初始化 Steam（在其他初始化之前）
  const steamOk = initSteam()
  console.log(`Steam initialization: ${steamOk ? 'success' : 'offline mode'}`)

  registerSaveHandlers()
  registerAppHandlers()
  createWindow()
  // ...
})

// 在 app.on('quit') 中清理 Steam
app.on('quit', () => {
  shutdownSteam()
})

// 更新 registerAppHandlers() 中的 Steam 处理器
function registerAppHandlers(): void {
  // ... 其他处理器 ...

  // Steam API (Story 8.2 实现)
  ipcMain.handle(IPC_CHANNELS.STEAM_IS_AVAILABLE, () => {
    return { success: true, data: isSteamAvailable() }
  })

  ipcMain.handle(IPC_CHANNELS.STEAM_GET_USER_NAME, () => {
    const name = getSteamUserName()
    return { success: name !== null, data: name }
  })

  // 成就和云存档处理器保留给 Story 8.3 和 8.4
  ipcMain.handle(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT, () => {
    return { success: false, error: 'Not implemented yet (Story 8.3)' }
  })

  ipcMain.handle(IPC_CHANNELS.STEAM_SYNC_CLOUD, () => {
    return { success: false, error: 'Not implemented yet (Story 8.4)' }
  })
}
```

### Task 5: 配置 electron-builder 包含 native 模块 (AC: #1)

**文件:** `src/electron-builder.json`

添加 steamworks.js native 模块配置：

```json
{
  "files": [
    "dist-electron/**/*",
    "node_modules/steamworks.js/**/*"
  ],
  "asarUnpack": [
    "node_modules/steamworks.js/**/*"
  ],
  "extraResources": [
    {
      "from": "steam_appid.txt",
      "to": "."
    }
  ]
}
```

### Task 6: 单元测试 (AC: #7)

**文件:** `src/tests/unit/main/steam.test.ts`

```typescript
// ============================================
// 打字肉鸽 - Steam 服务单元测试
// ============================================
// Story 8.2: Steam 初始化 (AC: #7)

import { describe, it, expect, beforeEach } from 'vitest'
import {
  initSteam,
  isSteamAvailable,
  getSteamUserName,
  getSteamUserId,
  getSteamClient,
  shutdownSteam,
  _resetForTesting,
  _setTestInitFn
} from '../../../main/steam'

describe('SteamService', () => {
  // Mock Steam client 工厂函数
  function createMockClient(options: {
    userName?: string
    steamId?: bigint
    throwOnGetName?: boolean
    throwOnGetId?: boolean
  } = {}) {
    return {
      localplayer: {
        getName: () => {
          if (options.throwOnGetName) throw new Error('Failed to get name')
          return options.userName ?? 'TestPlayer'
        },
        getSteamId: () => {
          if (options.throwOnGetId) throw new Error('Failed to get ID')
          return {
            steamId64: options.steamId ?? BigInt('76561198000000000')
          }
        }
      }
    }
  }

  beforeEach(() => {
    // 重置 Steam 状态（包括清除 _testInitFn）
    _resetForTesting()
  })

  describe('initSteam (AC: #2)', () => {
    it('Steam 可用时应该返回 true', () => {
      _setTestInitFn(() => createMockClient())

      const result = initSteam()

      expect(result).toBe(true)
      expect(isSteamAvailable()).toBe(true)
    })

    it('Steam 不可用时应该返回 false 并降级 (AC: #4)', () => {
      _setTestInitFn(() => {
        throw new Error('Steam not running')
      })

      const result = initSteam()

      expect(result).toBe(false)
      expect(isSteamAvailable()).toBe(false)
    })
  })

  // ... 其他测试用例 ...
})
```

**注意:** 使用 `_setTestInitFn()` 依赖注入模式替代 `vi.mock()`，因为 Vitest 无法拦截动态 `require()` 调用。

## Dev Notes

### steamworks.js 注意事项

1. **Native 模块** - steamworks.js 是 Rust (napi-rs) 编写的 native 模块，需要：
   - 确保 electron-builder 正确打包 native 模块
   - 使用 `asarUnpack` 提取到 asar 外
   - steamworks.js 自包含预编译的 Steamworks SDK 绑定，无需额外配置 Steam SDK

2. **Steam 客户端要求** - 开发时需要：
   - Steam 客户端正在运行
   - `steam_appid.txt` 存在于正确位置（src/ 目录下，构建时会复制到 resources）
   - 使用 Steam 测试 AppID (480) 进行开发

3. **初始化时机** - 必须在 `app.whenReady()` 之后初始化

4. **测试策略** - 使用依赖注入模式 (`_setTestInitFn`) 替代模块 mock，因为：
   - Vitest 的 `vi.mock()` 无法拦截运行时 `require()` 调用
   - 注入函数在生产环境下会抛出错误，防止误用

### 离线模式策略 (AC: #4)

游戏在 Steam 不可用时应该完全可玩：
- 成就本地记录，Steam 恢复后同步
- 存档使用本地文件系统
- 用户名显示为 "离线玩家" 或本地设置的名称

### 测试开发

由于需要 Steam 客户端运行，建议：
1. 使用 mock 进行单元测试
2. 实际集成测试需要 Steam 运行
3. CI/CD 中跳过需要 Steam 的测试

### References

- [game-architecture.md - Electron Architecture](../game-architecture.md#electron-architecture)
- [game-architecture.md - Save System](../game-architecture.md#save-system)
- [project-context.md - Electron Architecture Rules](../project-context.md#electron-architecture-rules)
- [steamworks.js 文档](https://github.com/nickleefly/steamworks.js)
- [Steam API 文档](https://partner.steamgames.com/doc/api)

---

## Dev Agent Record

### Agent Model Used

Claude claude-opus-4-5-20251101

### Debug Log References

- Initial mock approach using vi.mock('steamworks.js') failed because dynamic require() inside function wasn't intercepted
- Fixed by implementing dependency injection pattern with `_setTestInitFn()` for testability

### Code Review Fixes (2026-02-19)

**HIGH severity fixes:**
1. Added production environment guard to `_setTestInitFn()` - throws error if called in production
2. Updated Story documentation to match actual implementation (dependency injection pattern)
3. Clarified steam_appid.txt location (src/ directory, not project root)
4. Updated Task 3 and Task 6 code templates to reflect actual implementation

**MEDIUM severity fixes:**
1. `_resetForTesting()` now also resets `_testInitFn` to prevent test state leakage
2. Updated technical notes about preload.ts (already configured in Story 8.1)
3. Added documentation about steamworks.js native library self-containment

### Completion Notes List

1. All 6 tasks completed successfully
2. steamworks.js dependency added to package.json
3. steam_appid.txt created with test AppID 480
4. Steam service (steam.ts) implements all required functions with graceful degradation
5. Main process (index.ts) updated with Steam initialization and IPC handlers
6. electron-builder.json configured for native module packaging
7. 16 unit tests passing for Steam service
8. Total test suite: 1262 tests passing

### File List

**New Files Created:**
- src/main/steam.ts - Steam API service with testable injection pattern
- src/steam_appid.txt - Steam AppID 480 (test ID)
- src/tests/unit/main/steam.test.ts - 16 unit tests

**Files Modified:**
- src/main/index.ts - Added Steam initialization and IPC handlers
- src/electron-builder.json - Added native module config (asarUnpack, extraResources)
- src/package.json - Added steamworks.js dependency
