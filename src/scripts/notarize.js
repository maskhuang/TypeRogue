// ============================================
// 打字肉鸽 - macOS 公证脚本
// ============================================
// Story 8.5: 构建与打包 (AC: #5)
//
// 此脚本在 macOS 代码签名后自动执行公证
// 需要设置以下环境变量:
// - APPLE_ID: Apple Developer 账户邮箱
// - APPLE_TEAM_ID: 团队 ID
// - APPLE_ID_PASSWORD: App-specific password

import { notarize } from '@electron/notarize'

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  // 只在 macOS 上执行
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not macOS')
    return
  }

  // 检查必需的环境变量
  const { APPLE_ID, APPLE_TEAM_ID, APPLE_ID_PASSWORD } = process.env

  if (!APPLE_ID || !APPLE_TEAM_ID || !APPLE_ID_PASSWORD) {
    console.log('Skipping notarization - missing credentials')
    console.log('Set APPLE_ID, APPLE_TEAM_ID, and APPLE_ID_PASSWORD to enable')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = `${appOutDir}/${appName}.app`

  console.log(`Notarizing ${appPath}...`)

  try {
    await notarize({
      appPath,
      appleId: APPLE_ID,
      appleIdPassword: APPLE_ID_PASSWORD,
      teamId: APPLE_TEAM_ID
    })
    console.log('Notarization complete!')
  } catch (error) {
    console.error('Notarization failed:', error)
    // 不抛出错误，允许构建继续（开发环境可能没有证书）
    if (process.env.CI) {
      throw error
    }
  }
}
