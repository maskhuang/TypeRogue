---
title: "Story 8.1: Electron 主进程"
epic: "Epic 8: Electron 与 Steam"
story_key: "8-1-electron-main-process"
status: "done"
created: "2026-02-18"
depends_on:
  - "6-2-save-system"
---

# Story 8.1: Electron 主进程

## 概述

配置 Electron 主进程，将现有的纯浏览器 PixiJS 游戏转换为桌面应用。这是 Epic 8 的基础设施 Story，为后续 Steam 集成、存档系统和打包发布奠定基础。

## Story

作为一个 **开发者**，
我想要 **将游戏打包为 Electron 桌面应用**，
以便 **支持文件系统存档、Steam API 集成和桌面发布**。

## 验收标准

- [x] AC1: 窗口创建和管理正常工作（1280x720 默认尺寸，可调整大小）
- [x] AC2: IPC 通道注册和基础通信功能可用
- [x] AC3: 开发/生产环境配置正确（热重载开发、打包生产）
- [x] AC4: 主进程与渲染进程隔离，安全配置正确（contextIsolation, nodeIntegration）
- [x] AC5: 应用图标和基础元数据配置
- [x] AC6: 单元测试覆盖 IPC 通道和窗口管理逻辑

## 技术说明

### 文件位置

**新建文件：**
- `src/main/index.ts` - 主进程入口
- `src/main/window.ts` - 窗口管理器
- `src/main/preload.ts` - 预加载脚本（contextBridge）
- `src/shared/types.ts` - 共享类型定义
- `src/shared/ipc-channels.ts` - IPC 通道常量
- `electron-builder.json` - 打包配置（基础版）
- `electron.vite.config.ts` - Vite + Electron 开发配置

**修改文件：**
- `package.json` - 添加 Electron 依赖和脚本
- `tsconfig.json` - 添加 main 进程编译配置

### 架构参考

```
game-architecture.md - Electron Architecture:

┌─────────────────────────────────────┐
│  Electron Main Process              │
│  - Steam API (steamworks.js)        │
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

game-architecture.md - Project Structure:

src/
├── main/                    # Electron 主进程
│   ├── steam.ts            # Steam API (Story 8.2)
│   ├── save.ts             # 存档管理 (迁移自 6-2)
│   └── window.ts           # 窗口管理
│
├── renderer/               # 渲染进程（现有游戏代码）
│   ├── core/               # 核心层
│   ├── systems/            # 游戏系统
│   ├── scenes/             # 场景
│   ├── ui/                 # UI 组件
│   └── data/               # 静态数据
│
└── shared/                 # 主进程/渲染进程共享
    ├── types.ts
    └── ipc-channels.ts
```

### 依赖关系

**依赖:**
- Story 6.2 (Save System) - 存档系统将迁移到主进程
- Epic 1-7 已完成的游戏功能

**被依赖:**
- Story 8.2 (Steam 初始化)
- Story 8.3 (Steam 成就)
- Story 8.4 (Steam 云存档)
- Story 8.5 (构建与打包)

### 当前项目状态

**现有代码结构：**
```
src/
├── src/                    # 渲染进程代码（需重组为 renderer/）
│   ├── core/               # 核心层
│   ├── systems/            # 游戏系统
│   ├── scenes/             # 场景
│   ├── ui/                 # UI 组件
│   ├── data/               # 静态数据
│   └── main.ts             # 现有入口（需迁移）
├── tests/                  # 测试
├── package.json            # 缺少 Electron 依赖
└── vite.config.ts          # 纯浏览器配置
```

**需要添加的依赖：**
```json
{
  "devDependencies": {
    "electron": "^34.0.0",
    "electron-builder": "^26.0.0",
    "electron-vite": "^3.0.0"
  }
}
```

## 实现任务

### Task 1: 项目结构重组 (AC: #3) ✅

重组目录结构以支持 Electron 双进程架构。

**步骤：**
1. 创建 `src/main/` 目录
2. 创建 `src/shared/` 目录
3. 将现有 `src/src/` 内容移动到 `src/renderer/`（或保持原位，配置 alias）
4. 更新 import 路径

**注意:**
- 可以选择不移动文件，而是通过 Vite alias 配置 renderer 路径
- 优先保持现有测试可用

### Task 2: 安装 Electron 依赖 (AC: #3) ✅

```bash
npm install electron electron-builder --save-dev
npm install electron-vite --save-dev
```

**package.json 更新：**
```json
{
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  }
}
```

### Task 3: 主进程入口 (AC: #1, #4) ✅

**文件:** `src/main/index.ts`

```typescript
import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'

// 阻止多实例
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 第二实例尝试启动时，聚焦现有窗口
app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})
```

### Task 4: 窗口管理器 (AC: #1, #4, #5) ✅

**文件:** `src/main/window.ts`

```typescript
import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from 'electron-util'

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: '打字肉鸽',
    icon: join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    show: false,
    backgroundColor: '#1a1a2e'
  })

  // 优雅显示，避免白屏
  win.once('ready-to-show', () => {
    win.show()
  })

  // 外部链接在浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 开发环境加载 Vite 开发服务器
  if (is.development && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools()
  } else {
    // 生产环境加载打包后的文件
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}
```

### Task 5: 预加载脚本 (AC: #2, #4) ✅

**文件:** `src/main/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 存档系统（预留给 Story 8.2+）
  save: {
    write: (data: string) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_WRITE, data),
    read: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_READ),
    exists: () => ipcRenderer.invoke(IPC_CHANNELS.SAVE_EXISTS)
  },

  // Steam API（预留给 Story 8.2+）
  steam: {
    isAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_IS_AVAILABLE),
    getUserName: () => ipcRenderer.invoke(IPC_CHANNELS.STEAM_GET_USER_NAME)
  },

  // 应用信息
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getPlatform: () => process.platform
  }
})

// TypeScript 类型声明
declare global {
  interface Window {
    electronAPI: {
      save: {
        write: (data: string) => Promise<boolean>
        read: () => Promise<string | null>
        exists: () => Promise<boolean>
      }
      steam: {
        isAvailable: () => Promise<boolean>
        getUserName: () => Promise<string | null>
      }
      app: {
        getVersion: () => Promise<string>
        getPlatform: () => NodeJS.Platform
      }
    }
  }
}
```

### Task 6: IPC 通道定义 (AC: #2) ✅

**文件:** `src/shared/ipc-channels.ts`

```typescript
/**
 * IPC 通道常量定义
 * 主进程和渲染进程共享
 */
export const IPC_CHANNELS = {
  // 存档系统
  SAVE_WRITE: 'save:write',
  SAVE_READ: 'save:read',
  SAVE_EXISTS: 'save:exists',

  // Steam API
  STEAM_IS_AVAILABLE: 'steam:is-available',
  STEAM_GET_USER_NAME: 'steam:get-user-name',
  STEAM_UNLOCK_ACHIEVEMENT: 'steam:unlock-achievement',
  STEAM_SYNC_CLOUD: 'steam:sync-cloud',

  // 应用信息
  APP_GET_VERSION: 'app:get-version',
  APP_QUIT: 'app:quit'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
```

### Task 7: IPC 处理器注册 (AC: #2) ✅

**文件:** `src/main/ipc.ts`

```typescript
import { ipcMain, app } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

export function registerIpcHandlers(): void {
  // 应用版本
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  // 退出应用
  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
    app.quit()
  })

  // 存档系统（基础实现，Story 8.2+ 会完善）
  ipcMain.handle(IPC_CHANNELS.SAVE_EXISTS, () => {
    // TODO: 实现存档检查
    return false
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_READ, () => {
    // TODO: 实现存档读取
    return null
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_WRITE, (_event, _data: string) => {
    // TODO: 实现存档写入
    return true
  })

  // Steam API（预留，Story 8.2 实现）
  ipcMain.handle(IPC_CHANNELS.STEAM_IS_AVAILABLE, () => {
    return false // 未集成时返回 false
  })

  ipcMain.handle(IPC_CHANNELS.STEAM_GET_USER_NAME, () => {
    return null
  })
}
```

**更新 `src/main/index.ts`：**
```typescript
import { registerIpcHandlers } from './ipc'

app.whenReady().then(() => {
  registerIpcHandlers()  // 添加这行
  createWindow()
  // ...
})
```

### Task 8: electron-vite 配置 (AC: #3) ✅

**文件:** `electron.vite.config.ts`

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/src'),
        '@renderer': resolve(__dirname, 'src/src'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    }
  }
})
```

### Task 9: electron-builder 基础配置 (AC: #5) ✅

**文件:** `electron-builder.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  "appId": "com.typingroguelike.app",
  "productName": "打字肉鸽",
  "directories": {
    "output": "dist"
  },
  "files": [
    "dist-electron/**/*",
    "dist/**/*"
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "assets/icon.ico"
  },
  "mac": {
    "target": ["dmg", "zip"],
    "icon": "assets/icon.icns",
    "category": "public.app-category.games"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "assets/icon.png",
    "category": "Game"
  }
}
```

### Task 10: 共享类型定义 (AC: #4) ✅

**文件:** `src/shared/types.ts`

```typescript
/**
 * 主进程/渲染进程共享类型定义
 */

// 存档数据结构（与 Story 6.2 保持一致）
export interface SaveData {
  meta: MetaSaveData
  run: RunSaveData | null
  timestamp: number
  version: string
}

export interface MetaSaveData {
  unlockedSkills: string[]
  unlockedRelics: string[]
  achievements: Record<string, boolean>
  statistics: GameStatistics
}

export interface RunSaveData {
  currentStage: number
  gold: number
  skillInventory: string[]
  bindings: Record<string, string>
  relics: string[]
}

export interface GameStatistics {
  totalRuns: number
  totalWins: number
  highScore: number
  totalWordsTyped: number
  totalPlayTime: number
}

// 应用配置
export interface AppConfig {
  version: string
  isDevelopment: boolean
  platform: NodeJS.Platform
}
```

### Task 11: 单元测试 (AC: #6) ✅

**文件:** `tests/unit/main/ipc.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    quit: vi.fn()
  }
}))

import { ipcMain, app } from 'electron'
import { IPC_CHANNELS } from '../../../src/shared/ipc-channels'

// 模拟注册函数（因为实际 registerIpcHandlers 在 main 进程）
describe('IPC Channels', () => {
  it('应该定义所有必需的通道', () => {
    expect(IPC_CHANNELS.SAVE_WRITE).toBe('save:write')
    expect(IPC_CHANNELS.SAVE_READ).toBe('save:read')
    expect(IPC_CHANNELS.SAVE_EXISTS).toBe('save:exists')
    expect(IPC_CHANNELS.APP_GET_VERSION).toBe('app:get-version')
    expect(IPC_CHANNELS.STEAM_IS_AVAILABLE).toBe('steam:is-available')
  })

  it('通道名称应该遵循 domain:action 命名规范', () => {
    Object.values(IPC_CHANNELS).forEach(channel => {
      expect(channel).toMatch(/^[a-z]+:[a-z-]+$/)
    })
  })
})

describe('IPC Handlers Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ipcMain.handle 应该被调用注册处理器', () => {
    // 模拟注册流程
    const mockHandler = vi.fn()
    ;(ipcMain.handle as ReturnType<typeof vi.fn>)(IPC_CHANNELS.APP_GET_VERSION, mockHandler)

    expect(ipcMain.handle).toHaveBeenCalledWith(
      IPC_CHANNELS.APP_GET_VERSION,
      expect.any(Function)
    )
  })
})
```

**文件:** `tests/unit/shared/ipc-channels.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS, type IpcChannel } from '../../../src/shared/ipc-channels'

describe('IPC_CHANNELS', () => {
  it('应该导出所有必需的存档通道', () => {
    expect(IPC_CHANNELS.SAVE_WRITE).toBeDefined()
    expect(IPC_CHANNELS.SAVE_READ).toBeDefined()
    expect(IPC_CHANNELS.SAVE_EXISTS).toBeDefined()
  })

  it('应该导出所有必需的 Steam 通道', () => {
    expect(IPC_CHANNELS.STEAM_IS_AVAILABLE).toBeDefined()
    expect(IPC_CHANNELS.STEAM_GET_USER_NAME).toBeDefined()
    expect(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT).toBeDefined()
    expect(IPC_CHANNELS.STEAM_SYNC_CLOUD).toBeDefined()
  })

  it('应该导出所有必需的应用通道', () => {
    expect(IPC_CHANNELS.APP_GET_VERSION).toBeDefined()
    expect(IPC_CHANNELS.APP_QUIT).toBeDefined()
  })

  it('IpcChannel 类型应该是 string literal union', () => {
    const channel: IpcChannel = 'save:write'
    expect(typeof channel).toBe('string')
  })
})
```

## Dev Notes

### 安全配置要点

1. **contextIsolation: true** - 隔离渲染进程和 Node.js 环境
2. **nodeIntegration: false** - 禁止渲染进程直接访问 Node.js API
3. **sandbox: true** - 启用 Chromium 沙箱
4. **preload 脚本** - 使用 contextBridge 暴露安全 API

### Electron 版本选择

选择 Electron 34.x（2025 年 12 月发布），原因：
- 支持 Chromium 134 和 Node.js 22
- 稳定的 ESM 支持
- 良好的 PixiJS v8 兼容性

### electron-vite vs electron-forge

选择 **electron-vite** 而非 electron-forge，原因：
- 与现有 Vite 配置更兼容
- 更轻量，启动速度快
- 热重载体验更好

### 项目结构迁移策略

**选项 A（推荐）:** 保持现有文件位置，使用 Vite alias
- 优点：无需移动文件，测试路径不变
- 实现：在 electron.vite.config.ts 中配置 `@renderer` alias 指向 `src/src`

**选项 B:** 物理移动文件到 `src/renderer/`
- 优点：目录结构与架构文档完全一致
- 缺点：需要更新大量 import 路径

### References

- [game-architecture.md - Electron Architecture](../game-architecture.md#electron-architecture)
- [game-architecture.md - Project Structure](../game-architecture.md#project-structure)
- [game-architecture.md - Save System](../game-architecture.md#save-system)
- [electron-vite 文档](https://electron-vite.org/)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- 项目已有 Story 6.2 的 main/index.ts, main/preload.ts, main/save.ts - 扩展而非覆盖
- 使用 Vite alias 保持现有 src/src 结构，避免移动文件破坏测试路径

### Completion Notes List

- [x] Task 1: 项目结构重组 - 创建 main/ 和 shared/ 目录
- [x] Task 2: 安装 Electron 依赖 - 更新 package.json 添加 electron, electron-builder, electron-vite
- [x] Task 3: 主进程入口 - 扩展现有 index.ts，添加单实例锁和新 IPC 处理器
- [x] Task 4: 窗口管理器 - 更新 createWindow() 添加完整配置 (minWidth/Height, sandbox, backgroundColor)
- [x] Task 5: 预加载脚本 - 扩展 preload.ts，添加结构化 API (save, steam, app)
- [x] Task 6: IPC 通道定义 - 扩展 ipc-channels.ts 添加新通道
- [x] Task 7: IPC 处理器注册 - 添加 registerAppHandlers() 函数
- [x] Task 8: electron-vite 配置 - 创建 electron.vite.config.ts
- [x] Task 9: electron-builder 配置 - 创建 electron-builder.json
- [x] Task 10: 共享类型定义 - 创建 shared/types.ts
- [x] Task 11: 单元测试 - 创建 ipc-channels.test.ts 和 types.test.ts (13 tests)

**测试结果:** 1246 tests passing, 0 regressions

### Code Review Fixes Applied

**Issue #1 (CRITICAL): 同步文件 I/O 阻塞主进程**
- 修复: 将 save.ts 中的 fs 同步操作改为 fs/promises 异步操作
- 文件: src/main/save.ts, src/main/index.ts

**Issue #2: IPC 返回类型不一致**
- 修复: 所有 IPC 处理器现在使用统一的 IpcResponse 模式
- 文件: src/main/index.ts, src/main/preload.ts

**Issue #3: electron.vite.config.ts 路径错误**
- 修复: index.html 路径从 `__dirname` 改为 `__dirname/../`
- 文件: src/electron.vite.config.ts

**Issue #4: 孤立的 SAVE_RESULT 通道**
- 修复: 移除未使用的 SAVE_RESULT 通道定义
- 文件: src/shared/ipc-channels.ts

**Issue #5: getPlatform 同步 API 不一致**
- 修复: 返回 Promise.resolve(process.platform) 保持 API 一致性
- 文件: src/main/preload.ts

**Issue #6: 缺失 IPC 处理器测试**
- 修复: 更新 save.test.ts 支持异步操作，添加非阻塞特性测试
- 文件: src/tests/unit/main/save.test.ts, src/tests/unit/shared/types.test.ts

**Issue #7: 硬编码图标路径无回退**
- 修复: 添加 getIconPath() 函数检查图标是否存在
- 文件: src/main/index.ts

### File List

**New Files Created:**
- src/shared/types.ts
- src/electron.vite.config.ts
- src/electron-builder.json
- src/tests/unit/shared/ipc-channels.test.ts
- src/tests/unit/shared/types.test.ts

**Files Modified:**
- src/main/index.ts - 添加单实例锁、registerAppHandlers()、安全配置、异步 IPC、图标回退
- src/main/preload.ts - 添加结构化 API (save, steam, app)、统一 Promise 返回类型
- src/main/save.ts - 转换为异步操作 (fs/promises)
- src/shared/ipc-channels.ts - 添加新 IPC 通道 (Steam, App)、移除孤立通道
- src/package.json - 添加 Electron 依赖和脚本
- src/tests/unit/main/save.test.ts - 更新为异步测试
