// ============================================
// 打字肉鸽 - 版本模块单元测试
// ============================================
// Story 8.5: 构建与打包 (AC: #7)

import { describe, it, expect } from 'vitest'

// 导入模块 - 测试环境中使用默认值
import {
  VERSION,
  BUILD_DATE,
  GIT_COMMIT,
  getVersionInfo,
  getVersionString,
  getShortVersion,
  type VersionInfo
} from '../../../shared/version'

describe('Version Module (Story 8.5)', () => {
  describe('VERSION constant', () => {
    it('应该有版本号值', () => {
      expect(VERSION).toBeDefined()
      expect(typeof VERSION).toBe('string')
      expect(VERSION.length).toBeGreaterThan(0)
    })

    it('版本号应该符合 SemVer 格式或开发版本格式', () => {
      // SemVer: MAJOR.MINOR.PATCH 或 MAJOR.MINOR.PATCH-prerelease
      const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/
      expect(VERSION).toMatch(semverRegex)
    })
  })

  describe('BUILD_DATE constant', () => {
    it('应该有构建日期值', () => {
      expect(BUILD_DATE).toBeDefined()
      expect(typeof BUILD_DATE).toBe('string')
    })

    it('日期应该是有效的 ISO 8601 格式', () => {
      const date = new Date(BUILD_DATE)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })

  describe('GIT_COMMIT constant', () => {
    it('应该有 Git 提交哈希值', () => {
      expect(GIT_COMMIT).toBeDefined()
      expect(typeof GIT_COMMIT).toBe('string')
      expect(GIT_COMMIT.length).toBeGreaterThan(0)
    })

    it('提交哈希应该是 7 位短哈希格式或 unknown', () => {
      // Git 短哈希通常是 7 位十六进制，或者未初始化时为 'unknown'
      const validFormat = /^([a-f0-9]{7}|unknown)$/
      expect(GIT_COMMIT).toMatch(validFormat)
    })
  })

  describe('getVersionInfo()', () => {
    it('应该返回包含所有版本信息的对象', () => {
      const info = getVersionInfo()

      expect(info).toHaveProperty('version')
      expect(info).toHaveProperty('buildDate')
      expect(info).toHaveProperty('commit')
    })

    it('返回的对象应该符合 VersionInfo 接口', () => {
      const info: VersionInfo = getVersionInfo()

      expect(typeof info.version).toBe('string')
      expect(typeof info.buildDate).toBe('string')
      expect(typeof info.commit).toBe('string')
    })

    it('应该返回与常量一致的值', () => {
      const info = getVersionInfo()

      expect(info.version).toBe(VERSION)
      expect(info.buildDate).toBe(BUILD_DATE)
      expect(info.commit).toBe(GIT_COMMIT)
    })
  })

  describe('getVersionString()', () => {
    it('应该返回格式化的版本字符串', () => {
      const versionString = getVersionString()

      expect(versionString).toBe(`v${VERSION} (${GIT_COMMIT})`)
    })

    it('应该以 "v" 开头', () => {
      const versionString = getVersionString()

      expect(versionString).toMatch(/^v/)
    })

    it('应该包含提交哈希在括号中', () => {
      const versionString = getVersionString()

      expect(versionString).toContain('(')
      expect(versionString).toContain(')')
      expect(versionString).toContain(GIT_COMMIT)
    })

    it('格式应该是 vX.X.X (commit)', () => {
      const versionString = getVersionString()
      const formatRegex = /^v\d+\.\d+\.\d+(-[\w.]+)? \(\w+\)$/
      expect(versionString).toMatch(formatRegex)
    })
  })

  describe('getShortVersion()', () => {
    it('应该返回版本号', () => {
      const shortVersion = getShortVersion()

      expect(shortVersion).toBe(VERSION)
    })

    it('不应该包含 "v" 前缀', () => {
      const shortVersion = getShortVersion()

      expect(shortVersion).not.toMatch(/^v/)
    })

    it('应该是纯版本号格式', () => {
      const shortVersion = getShortVersion()
      const versionRegex = /^\d+\.\d+\.\d+(-[\w.]+)?$/
      expect(shortVersion).toMatch(versionRegex)
    })
  })
})

describe('Version Module - Fallback Behavior', () => {
  it('VERSION 常量不应该是 undefined 或空', () => {
    expect(VERSION).not.toBeUndefined()
    expect(VERSION).not.toBe('')
  })

  it('BUILD_DATE 常量不应该是 undefined 或空', () => {
    expect(BUILD_DATE).not.toBeUndefined()
    expect(BUILD_DATE).not.toBe('')
  })

  it('GIT_COMMIT 常量不应该是 undefined 或空', () => {
    expect(GIT_COMMIT).not.toBeUndefined()
    expect(GIT_COMMIT).not.toBe('')
  })

  it('开发环境版本应该是 0.0.0-dev', () => {
    // 当构建变量未定义时，应该使用默认值
    // 这在测试环境中是预期行为
    expect(VERSION).toBe('0.0.0-dev')
  })
})
