// ============================================
// 打字肉鸽 - electron-vite 配置
// ============================================
// Story 8.1: Electron 主进程 (AC: #3)
// Story 8.5: 版本注入 (AC: #7)

import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'
import { execSync } from 'child_process'
import pkg from './package.json'

// 获取 Git 提交哈希
function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

// 版本信息定义 - 构建时注入
const versionDefines = {
  __APP_VERSION__: JSON.stringify(pkg.version),
  __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  __GIT_COMMIT__: JSON.stringify(getGitCommit())
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: versionDefines,
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'main/index.ts')
        }
      },
      outDir: 'dist-electron/main'
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: versionDefines,
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'main/preload.ts')
        }
      },
      outDir: 'dist-electron/preload'
    }
  },
  renderer: {
    root: resolve(__dirname, '..'),  // Issue #3 Fix: 设置 root 为项目根目录
    define: versionDefines,
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, '../index.html')  // Issue #3 Fix: 正确的 index.html 路径
        }
      },
      outDir: 'dist-electron/renderer'
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'shared')
      }
    }
  }
})
