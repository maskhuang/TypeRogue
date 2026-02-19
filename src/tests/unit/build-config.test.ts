// ============================================
// 打字肉鸽 - 构建配置单元测试
// ============================================
// Story 8.5: 构建与打包 (AC: #1, #2, #3, #6)

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 加载配置文件
const configPath = resolve(__dirname, '../../electron-builder.json')
const config = JSON.parse(readFileSync(configPath, 'utf-8'))

const packagePath = resolve(__dirname, '../../package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))

describe('electron-builder.json (Story 8.5)', () => {
  describe('基础配置', () => {
    it('应该有正确的 appId', () => {
      expect(config.appId).toBe('com.typingroguelike.app')
    })

    it('应该有正确的 productName', () => {
      expect(config.productName).toBe('打字肉鸽')
    })

    it('应该有版权声明', () => {
      expect(config.copyright).toContain('Copyright')
      expect(config.copyright).toContain('2026')
    })
  })

  describe('目录配置 (AC: #1)', () => {
    it('输出目录应该包含版本号变量', () => {
      expect(config.directories.output).toContain('${version}')
    })

    it('应该有 buildResources 目录配置', () => {
      expect(config.directories.buildResources).toBe('build-resources')
    })
  })

  describe('文件配置', () => {
    it('应该包含 dist-electron', () => {
      expect(config.files).toContain('dist-electron/**/*')
    })

    it('应该包含 steamworks.js', () => {
      expect(config.files).toContain('node_modules/steamworks.js/**/*')
    })

    it('应该解包 steamworks.js', () => {
      expect(config.asarUnpack).toContain('node_modules/steamworks.js/**/*')
    })

    it('应该包含 steam_appid.txt 作为额外资源', () => {
      const steamResource = config.extraResources.find(
        (r: any) => r.from === 'steam_appid.txt'
      )
      expect(steamResource).toBeDefined()
    })
  })

  describe('Windows 配置 (AC: #1, #2)', () => {
    it('应该有 nsis target', () => {
      const targets = config.win.target.map((t: any) =>
        typeof t === 'string' ? t : t.target
      )
      expect(targets).toContain('nsis')
    })

    it('应该有 portable target', () => {
      const targets = config.win.target.map((t: any) =>
        typeof t === 'string' ? t : t.target
      )
      expect(targets).toContain('portable')
    })

    it('应该指定 x64 架构', () => {
      const nsisTarget = config.win.target.find((t: any) =>
        (typeof t === 'object' && t.target === 'nsis')
      )
      expect(nsisTarget?.arch).toContain('x64')
    })

    it('应该有图标配置', () => {
      expect(config.win.icon).toContain('icon.ico')
    })

    it('应该有 artifactName 配置', () => {
      expect(config.win.artifactName).toContain('${productName}')
      expect(config.win.artifactName).toContain('${version}')
    })
  })

  describe('NSIS 配置 (AC: #2)', () => {
    it('应该允许更改安装目录', () => {
      expect(config.nsis.allowToChangeInstallationDirectory).toBe(true)
    })

    it('应该不是一键安装', () => {
      expect(config.nsis.oneClick).toBe(false)
    })

    it('应该有安装程序图标', () => {
      expect(config.nsis.installerIcon).toContain('icon.ico')
    })
  })

  describe('macOS 配置 (AC: #3)', () => {
    it('应该有 dmg target', () => {
      const targets = config.mac.target.map((t: any) =>
        typeof t === 'string' ? t : t.target
      )
      expect(targets).toContain('dmg')
    })

    it('应该有 zip target', () => {
      const targets = config.mac.target.map((t: any) =>
        typeof t === 'string' ? t : t.target
      )
      expect(targets).toContain('zip')
    })

    it('应该支持 x64 和 arm64 架构', () => {
      const dmgTarget = config.mac.target.find((t: any) =>
        (typeof t === 'object' && t.target === 'dmg')
      )
      expect(dmgTarget?.arch).toContain('x64')
      expect(dmgTarget?.arch).toContain('arm64')
    })

    it('应该有正确的分类', () => {
      expect(config.mac.category).toBe('public.app-category.games')
    })

    it('应该启用 hardenedRuntime', () => {
      expect(config.mac.hardenedRuntime).toBe(true)
    })

    it('应该有图标配置', () => {
      expect(config.mac.icon).toContain('icon.icns')
    })
  })

  describe('DMG 配置 (AC: #3)', () => {
    it('应该有内容布局配置', () => {
      expect(config.dmg.contents).toBeDefined()
      expect(Array.isArray(config.dmg.contents)).toBe(true)
    })

    it('应该有 Applications 链接', () => {
      const appLink = config.dmg.contents.find((c: any) => c.path === '/Applications')
      expect(appLink).toBeDefined()
      expect(appLink?.type).toBe('link')
    })
  })

  describe('Linux 配置', () => {
    it('应该有 AppImage target', () => {
      expect(config.linux.target).toContain('AppImage')
    })

    it('应该有 deb target', () => {
      expect(config.linux.target).toContain('deb')
    })

    it('应该有正确的分类', () => {
      expect(config.linux.category).toBe('Game')
    })
  })
})

describe('package.json scripts (AC: #6)', () => {
  describe('构建脚本', () => {
    it('应该有 build:electron 脚本', () => {
      expect(packageJson.scripts['build:electron']).toBeDefined()
    })

    it('应该有 dist 脚本', () => {
      expect(packageJson.scripts.dist).toBeDefined()
    })
  })

  describe('平台特定脚本 (AC: #6)', () => {
    it('应该有 dist:win 脚本', () => {
      expect(packageJson.scripts['dist:win']).toContain('--win')
    })

    it('应该有 dist:mac 脚本', () => {
      expect(packageJson.scripts['dist:mac']).toContain('--mac')
    })

    it('应该有 dist:linux 脚本', () => {
      expect(packageJson.scripts['dist:linux']).toContain('--linux')
    })

    it('应该有 dist:all 脚本', () => {
      expect(packageJson.scripts['dist:all']).toContain('-mwl')
    })
  })

  describe('发布脚本 (AC: #6)', () => {
    it('应该有 release 脚本', () => {
      expect(packageJson.scripts.release).toContain('build:electron')
      expect(packageJson.scripts.release).toContain('dist')
    })

    it('应该有 release:win 脚本', () => {
      expect(packageJson.scripts['release:win']).toContain('build:electron')
      expect(packageJson.scripts['release:win']).toContain('dist:win')
    })

    it('应该有 release:mac 脚本', () => {
      expect(packageJson.scripts['release:mac']).toContain('build:electron')
      expect(packageJson.scripts['release:mac']).toContain('dist:mac')
    })
  })

  describe('清理脚本', () => {
    it('应该有 clean 脚本', () => {
      expect(packageJson.scripts.clean).toBeDefined()
    })

    it('应该有 clean:release 脚本', () => {
      expect(packageJson.scripts['clean:release']).toBeDefined()
    })
  })

  describe('验证脚本 (AC: #8)', () => {
    it('应该有 verify 脚本', () => {
      expect(packageJson.scripts.verify).toContain('verify-build')
    })
  })
})
