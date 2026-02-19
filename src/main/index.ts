// ============================================
// 打字肉鸽 - Electron 主进程入口
// ============================================
// Story 6.2: 存档系统 - IPC 处理器注册
// Story 8.1: Electron 主进程 - 完整配置
// Story 8.2: Steam 初始化

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import * as path from 'path'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { safeSave, safeSaveWithCloud, safeLoad, safeDelete, SAVE_PATHS } from './save'
import {
  initSteam,
  isSteamAvailable,
  getSteamUserName,
  shutdownSteam,
  unlockAchievement,
  isAchievementUnlocked,
  setAchievementProgress,
  isCloudEnabled,
} from './steam'
import { syncAllFiles, uploadToCloud, getSyncStatus, CLOUD_FILES } from './cloud-sync'
import { setCloudUploader } from './save'
import {
  loadPendingAchievements,
  syncPendingAchievements,
  cachePendingAchievement,
} from './achievement-cache'
import { ACHIEVEMENT_MAP, AchievementId } from '../shared/achievements'

let mainWindow: BrowserWindow | null = null

// Story 8.1 AC#1: 阻止多实例运行
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

/**
 * 注册存档 IPC 处理器 (Story 6.2 AC: #6)
 * Issue #1 Fix: 所有存档操作现在使用 async/await
 */
function registerSaveHandlers(): void {
  // 保存 Meta (AC: #3) - Story 8.4: 使用云同步
  ipcMain.handle(IPC_CHANNELS.SAVE_META, async (_, data: string) => {
    try {
      await safeSaveWithCloud(SAVE_PATHS.META, data, 'meta.json')
      return { success: true }
    } catch (error) {
      console.error('IPC: Failed to save meta', error)
      return { success: false, error: String(error) }
    }
  })

  // 加载 Meta
  ipcMain.handle(IPC_CHANNELS.LOAD_META, async () => {
    const data = await safeLoad(SAVE_PATHS.META)
    return { success: data !== null, data }
  })

  // 保存 Run (AC: #4)
  ipcMain.handle(IPC_CHANNELS.SAVE_RUN, async (_, data: string) => {
    try {
      await safeSave(SAVE_PATHS.RUN, data)
      return { success: true }
    } catch (error) {
      console.error('IPC: Failed to save run', error)
      return { success: false, error: String(error) }
    }
  })

  // 加载 Run
  ipcMain.handle(IPC_CHANNELS.LOAD_RUN, async () => {
    const data = await safeLoad(SAVE_PATHS.RUN)
    return { success: data !== null, data }
  })

  // 删除 Run（清除断点存档）
  ipcMain.handle(IPC_CHANNELS.DELETE_RUN, async () => {
    const success = await safeDelete(SAVE_PATHS.RUN)
    return { success }
  })
}

/**
 * 注册应用和 Steam IPC 处理器 (Story 8.1 AC: #2)
 * Issue #2 Fix: 使用一致的 IpcResponse 返回类型模式
 */
function registerAppHandlers(): void {
  // 应用版本
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return { success: true, data: app.getVersion() }
  })

  // 退出应用
  ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
    app.quit()
    return { success: true }
  })

  // 通用存档操作 (Story 8.1)
  ipcMain.handle(IPC_CHANNELS.SAVE_EXISTS, async () => {
    // 检查 meta 存档是否存在
    const data = await safeLoad(SAVE_PATHS.META)
    return { success: true, data: data !== null }
  })

  ipcMain.handle(IPC_CHANNELS.SAVE_READ, async () => {
    const data = await safeLoad(SAVE_PATHS.META)
    return { success: data !== null, data }
  })

  // Story 8.4: 使用云同步
  ipcMain.handle(IPC_CHANNELS.SAVE_WRITE, async (_, data: string) => {
    try {
      await safeSaveWithCloud(SAVE_PATHS.META, data, 'meta.json')
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Steam API (Story 8.2 实现)
  ipcMain.handle(IPC_CHANNELS.STEAM_IS_AVAILABLE, () => {
    return { success: true, data: isSteamAvailable() }
  })

  ipcMain.handle(IPC_CHANNELS.STEAM_GET_USER_NAME, () => {
    const name = getSteamUserName()
    return { success: name !== null, data: name }
  })

  // Steam 成就 API (Story 8.3 实现)
  ipcMain.handle(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT, (_, achievementId: AchievementId) => {
    const steamName = ACHIEVEMENT_MAP[achievementId]
    if (!steamName) {
      return { success: false, error: `Unknown achievement: ${achievementId}` }
    }

    if (isSteamAvailable()) {
      // 先检查是否已解锁
      if (isAchievementUnlocked(steamName)) {
        return { success: true, data: { synced: true, alreadyUnlocked: true } }
      }
      const success = unlockAchievement(steamName)
      return { success, data: { synced: success } }
    } else {
      // 离线模式：缓存待同步
      cachePendingAchievement(steamName)
      return { success: true, data: { synced: false, cached: true } }
    }
  })

  // Steam 成就进度 API (Story 8.3 AC: #3)
  ipcMain.handle(
    IPC_CHANNELS.STEAM_SET_ACHIEVEMENT_PROGRESS,
    (_, achievementId: AchievementId, current: number, max: number) => {
      const steamName = ACHIEVEMENT_MAP[achievementId]
      if (!steamName) {
        return { success: false, error: `Unknown achievement: ${achievementId}` }
      }

      if (!isSteamAvailable()) {
        // 离线模式：进度不缓存，仅在线时更新
        return { success: false, error: 'Steam not available' }
      }

      const success = setAchievementProgress(steamName, current, max)
      return { success, data: { current, max } }
    }
  )

  // Steam 云同步 API (Story 8.4 实现)
  ipcMain.handle(IPC_CHANNELS.STEAM_SYNC_CLOUD, async () => {
    if (!isCloudEnabled()) {
      return { success: true, data: { status: 'offline' } }
    }

    const result = await syncAllFiles()
    return {
      success: result.success,
      data: { status: result.status },
      error: result.error
    }
  })

  // 云状态查询 (Story 8.4)
  ipcMain.handle(IPC_CHANNELS.STEAM_CLOUD_STATUS, () => {
    return {
      success: true,
      data: {
        enabled: isCloudEnabled(),
        status: getSyncStatus(),
        files: [...CLOUD_FILES]
      }
    }
  })
}

/**
 * 获取应用图标路径 (Issue #7 Fix: 添加回退处理)
 */
function getIconPath(): string | undefined {
  const iconPath = path.join(__dirname, '../../assets/icon.png')
  try {
    // 使用同步检查，因为这在启动时只调用一次
    require('fs').accessSync(iconPath)
    return iconPath
  } catch {
    console.warn('App icon not found at:', iconPath)
    return undefined
  }
}

/**
 * 创建主窗口 (Story 8.1 AC: #1, #4, #5)
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: '打字肉鸽',
    icon: getIconPath(),  // Issue #7 Fix: 使用带回退的图标加载
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // AC#4: 安全隔离
      nodeIntegration: false,   // AC#4: 禁止 Node 直接访问
      sandbox: true             // AC#4: 启用沙箱
    },
    show: false,                // 优雅显示，避免白屏
    backgroundColor: '#1a1a2e'  // 游戏主题背景色
  })

  // 优雅显示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 外部链接在浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 开发/生产环境配置 (AC: #3)
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用初始化
app.whenReady().then(async () => {
  // Story 8.2: 初始化 Steam（在其他初始化之前）
  const steamOk = initSteam()
  console.log(`Steam initialization: ${steamOk ? 'success' : 'offline mode'}`)

  // Story 8.4: 注入云上传函数到存档系统
  setCloudUploader(uploadToCloud)

  // Story 8.3: 加载缓存的待同步成就
  await loadPendingAchievements()

  // Story 8.3: 如果 Steam 可用，同步缓存的成就
  if (steamOk) {
    const synced = syncPendingAchievements()
    if (synced > 0) {
      console.log(`Steam: Synced ${synced} cached achievement(s) on startup`)
    }
  }

  // Story 8.4: 启动时同步云存档
  if (steamOk && isCloudEnabled()) {
    const cloudResult = await syncAllFiles()
    console.log(`Steam Cloud: Sync on startup - ${cloudResult.status}`)
  }

  registerSaveHandlers()
  registerAppHandlers()
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

// Story 8.2: 清理 Steam 资源
app.on('quit', () => {
  shutdownSteam()
})

// Story 8.1: 第二实例尝试启动时，聚焦现有窗口
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
