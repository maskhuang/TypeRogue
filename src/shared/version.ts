// ============================================
// 打字肉鸽 - 版本信息模块
// ============================================
// Story 8.5: 构建与打包 (AC: #7)
// 版本信息由 Vite 在构建时注入

// 声明全局变量（由 Vite define 注入）
declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string
declare const __GIT_COMMIT__: string

/**
 * 版本信息接口
 */
export interface VersionInfo {
  /** 语义化版本号 (SemVer) */
  version: string
  /** 构建日期 (ISO 8601) */
  buildDate: string
  /** Git 提交哈希 (短) */
  commit: string
}

/**
 * 当前应用版本
 * 从 package.json 注入
 */
export const VERSION: string = typeof __APP_VERSION__ !== 'undefined'
  ? __APP_VERSION__
  : '0.0.0-dev'

/**
 * 构建日期
 * 构建时自动生成
 */
export const BUILD_DATE: string = typeof __BUILD_DATE__ !== 'undefined'
  ? __BUILD_DATE__
  : new Date().toISOString()

/**
 * Git 提交哈希
 * 构建时从 git 获取
 */
export const GIT_COMMIT: string = typeof __GIT_COMMIT__ !== 'undefined'
  ? __GIT_COMMIT__
  : 'unknown'

/**
 * 获取完整版本信息
 * @returns 包含版本号、构建日期和提交哈希的对象
 */
export function getVersionInfo(): VersionInfo {
  return {
    version: VERSION,
    buildDate: BUILD_DATE,
    commit: GIT_COMMIT
  }
}

/**
 * 获取格式化的版本字符串
 * @returns 格式: "v0.1.0 (abc1234)"
 */
export function getVersionString(): string {
  return `v${VERSION} (${GIT_COMMIT})`
}

/**
 * 获取用于显示的简短版本
 * @returns 格式: "0.1.0"
 */
export function getShortVersion(): string {
  return VERSION
}
