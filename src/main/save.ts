// ============================================
// 打字肉鸽 - 主进程存档服务
// ============================================
// Story 6.2: 存档系统 - 原子写入实现
// Story 8.4: 云同步集成

import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

// 存档目录和文件路径
const getSaveDir = (): string => app.getPath('userData')
const getMetaFile = (): string => path.join(getSaveDir(), 'meta.json')
const getRunFile = (): string => path.join(getSaveDir(), 'run.json')

/**
 * 原子写入 - 写入临时文件后重命名 (AC: #1)
 * 防止写入过程中崩溃导致存档损坏
 *
 * Issue #1 Fix: 使用异步操作避免阻塞主进程
 *
 * 原理：
 * 1. 确保目标目录存在
 * 2. 先写入到 .tmp 临时文件
 * 3. 使用 rename 原子操作替换目标文件
 * 4. 即使进程崩溃，也只会丢失 .tmp 文件，不会损坏原存档
 */
export async function safeSave(filePath: string, data: string): Promise<void> {
  // 确保目录存在（首次运行或手动删除目录后）
  const dir = path.dirname(filePath)
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }

  const temp = filePath + '.tmp'
  await fs.writeFile(temp, data, 'utf-8')
  await fs.rename(temp, filePath) // 原子操作
}

/**
 * 安全读取 - 处理文件不存在和损坏情况 (AC: #2)
 * Issue #1 Fix: 使用异步操作避免阻塞主进程
 * @returns 文件内容或 null
 */
export async function safeLoad(filePath: string): Promise<string | null> {
  try {
    await fs.access(filePath)
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * 删除文件（用于清除断点存档）
 * Issue #1 Fix: 使用异步操作避免阻塞主进程
 * @returns true 如果删除成功或文件不存在
 */
export async function safeDelete(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    await fs.unlink(filePath)
    return true
  } catch {
    // 文件不存在也视为成功
    return true
  }
}

/**
 * 导出文件路径常量 (AC: #3, #4)
 * META: userData/meta.json - MetaState 永久数据
 * RUN: userData/run.json - RunState 断点续玩
 */
export const SAVE_PATHS = {
  get META() {
    return getMetaFile()
  },
  get RUN() {
    return getRunFile()
  },
}

// ============================================
// Story 8.4: 云同步集成
// ============================================

// 延迟导入避免循环依赖
let uploadToCloudFn: ((fileName: string, data: string) => boolean) | null = null

/**
 * 注入云上传函数（避免循环依赖）
 * 在 index.ts 初始化时调用
 */
export function setCloudUploader(fn: (fileName: string, data: string) => boolean): void {
  uploadToCloudFn = fn
}

/**
 * 扩展 safeSave 支持云同步 (Story 8.4 AC: #3)
 * 先本地原子写入，再异步上传到云端
 */
export async function safeSaveWithCloud(
  filePath: string,
  data: string,
  cloudFileName?: string
): Promise<void> {
  // 先本地原子写入
  await safeSave(filePath, data)

  // 异步上传到云端（不阻塞）
  if (cloudFileName && uploadToCloudFn) {
    // 使用 setImmediate 确保不阻塞
    setImmediate(() => {
      uploadToCloudFn!(cloudFileName, data)
    })
  }
}
