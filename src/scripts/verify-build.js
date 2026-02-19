// ============================================
// 打字肉鸽 - 构建产物验证脚本
// ============================================
// Story 8.5: 构建与打包 (AC: #8)
//
// 用法: npm run verify
// 或者: node scripts/verify-build.js

import { existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 配置
const PROJECT_DIR = resolve(__dirname, '..')
const RELEASE_DIR = join(PROJECT_DIR, 'release')
const MIN_SIZE_MB = 80  // Electron 应用最小约 100-150MB

// 预期的构建产物
const EXPECTED_ARTIFACTS = {
  win: ['.exe'],
  mac: ['.dmg', '.zip'],
  linux: ['.AppImage', '.deb']
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

/**
 * 递归获取目录中的所有文件
 */
function getAllFiles(dir, files = []) {
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * 验证构建产物
 */
function verifyBuild() {
  console.log('============================================')
  console.log('打字肉鸽 - Build Verification')
  console.log('============================================\n')

  // 检查 release 目录
  if (!existsSync(RELEASE_DIR)) {
    console.error('✗ Release directory not found:', RELEASE_DIR)
    console.log('\nRun "npm run release" first to create build artifacts.')
    process.exit(1)
  }

  // 获取所有文件
  const allFiles = getAllFiles(RELEASE_DIR)
  const artifactFiles = allFiles.filter(f => {
    const ext = Object.values(EXPECTED_ARTIFACTS).flat()
    return ext.some(e => f.endsWith(e))
  })

  if (artifactFiles.length === 0) {
    console.error('✗ No build artifacts found in release directory')
    console.log('\nExpected files:', Object.values(EXPECTED_ARTIFACTS).flat().join(', '))
    process.exit(1)
  }

  console.log('Found artifacts:\n')

  const results = {
    win: false,
    mac: false,
    linux: false
  }

  const warnings = []

  for (const filePath of artifactFiles) {
    // Use path.relative for cross-platform compatibility
    const fileName = filePath.substring(RELEASE_DIR.length + 1).replace(/\\/g, '/')
    const stats = statSync(filePath)
    const sizeMB = stats.size / (1024 * 1024)

    // 确定平台
    let platform = 'unknown'
    if (fileName.includes('win') || fileName.endsWith('.exe') || fileName.endsWith('.msi')) {
      platform = 'win'
      results.win = true
    } else if (fileName.includes('mac') || fileName.endsWith('.dmg')) {
      platform = 'mac'
      results.mac = true
    } else if (fileName.includes('linux') || fileName.endsWith('.AppImage') || fileName.endsWith('.deb')) {
      platform = 'linux'
      results.linux = true
    }

    // 检查文件大小
    const sizeStatus = sizeMB >= MIN_SIZE_MB ? '✓' : '⚠'
    console.log(`  ${sizeStatus} ${fileName}`)
    console.log(`      Size: ${formatSize(stats.size)} | Platform: ${platform}`)

    if (sizeMB < MIN_SIZE_MB) {
      warnings.push(`${fileName} is smaller than expected (${formatSize(stats.size)} < ${MIN_SIZE_MB} MB)`)
    }
  }

  // 检查 steamworks.js 打包
  console.log('\nChecking steamworks.js packaging...')
  const unpackedDirs = allFiles.filter(f => f.includes('app.asar.unpacked') && f.includes('steamworks'))
  if (unpackedDirs.length > 0) {
    console.log('  ✓ steamworks.js found in asar.unpacked')
  } else {
    // 检查 win-unpacked 或 mac 目录
    const nativeFiles = allFiles.filter(f =>
      (f.includes('win-unpacked') || f.includes('mac')) &&
      f.includes('steamworks')
    )
    if (nativeFiles.length > 0) {
      console.log('  ✓ steamworks.js found in unpacked directory')
    } else {
      warnings.push('steamworks.js may not be correctly unpacked')
    }
  }

  // 验证结果
  console.log('\n============================================')
  console.log('Verification Results:')
  console.log('============================================\n')

  console.log(`  Windows build: ${results.win ? '✓' : '✗'}`)
  console.log(`  macOS build:   ${results.mac ? '✓' : '✗'}`)
  console.log(`  Linux build:   ${results.linux ? '✓' : '✗'}`)

  if (warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of warnings) {
      console.log(`  ⚠ ${warning}`)
    }
  }

  // 至少需要一个平台的构建
  const hasAnyBuild = results.win || results.mac || results.linux
  if (!hasAnyBuild) {
    console.error('\n✗ Build verification FAILED: No valid artifacts found')
    process.exit(1)
  }

  console.log('\n✓ Build verification passed')
  return results
}

// 运行验证
try {
  verifyBuild()
} catch (error) {
  console.error('\n✗ Build verification failed:', error.message)
  process.exit(1)
}
