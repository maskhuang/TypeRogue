// ============================================
// 打字肉鸽 - 主进程存档服务单元测试
// ============================================
// Story 6.2: 存档系统 - 原子写入测试
// Story 8.1: Issue #1 Fix - 异步操作测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock Electron's app module before importing save.ts
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return path.join(os.tmpdir(), 'typing-roguelike-test-userdata')
      }
      return os.tmpdir()
    }),
  },
}))

// 现在可以导入实际模块（使用 mocked electron）
import { safeSave, safeLoad, safeDelete, SAVE_PATHS } from '../../../main/save'

describe('主进程存档服务', () => {
  const testDir = path.join(os.tmpdir(), 'typing-roguelike-save-test')
  const testFile = path.join(testDir, 'test.json')

  beforeEach(() => {
    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    // 清理测试文件
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
    if (fs.existsSync(testFile + '.tmp')) {
      fs.unlinkSync(testFile + '.tmp')
    }
  })

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile)
    }
    if (fs.existsSync(testFile + '.tmp')) {
      fs.unlinkSync(testFile + '.tmp')
    }
  })

  // ===========================================
  // safeSave 原子写入测试 (AC: #1)
  // Issue #1 Fix: 现在使用 async/await
  // ===========================================

  describe('safeSave 原子写入 (异步)', () => {
    it('应创建文件', async () => {
      await safeSave(testFile, '{"test":"data"}')
      expect(fs.existsSync(testFile)).toBe(true)
    })

    it('应写入正确内容', async () => {
      const data = '{"version":1,"score":100}'
      await safeSave(testFile, data)
      const content = fs.readFileSync(testFile, 'utf-8')
      expect(content).toBe(data)
    })

    it('不应残留临时文件', async () => {
      await safeSave(testFile, '{"test":"data"}')
      expect(fs.existsSync(testFile + '.tmp')).toBe(false)
    })

    it('应能覆盖已存在的文件', async () => {
      await safeSave(testFile, '{"old":"data"}')
      await safeSave(testFile, '{"new":"data"}')
      const content = fs.readFileSync(testFile, 'utf-8')
      expect(content).toBe('{"new":"data"}')
    })

    it('应正确处理大文件', async () => {
      // 创建约 100KB 的数据
      const largeData = JSON.stringify({
        version: 1,
        data: 'x'.repeat(100000),
      })
      await safeSave(testFile, largeData)
      const content = fs.readFileSync(testFile, 'utf-8')
      expect(content).toBe(largeData)
    })

    it('应正确处理中文内容', async () => {
      const chineseData = JSON.stringify({
        playerName: '打字高手',
        achievement: '完美通关',
        skills: ['连击加速', '分数翻倍'],
      })
      await safeSave(testFile, chineseData)
      const content = fs.readFileSync(testFile, 'utf-8')
      expect(content).toBe(chineseData)
    })

    it('应正确处理特殊字符', async () => {
      const specialData = JSON.stringify({
        data: 'Line1\nLine2\tTabbed\r\nCRLF',
        unicode: '💎🎮',
      })
      await safeSave(testFile, specialData)
      const content = fs.readFileSync(testFile, 'utf-8')
      expect(content).toBe(specialData)
    })
  })

  // ===========================================
  // safeLoad 安全读取测试 (AC: #2)
  // Issue #1 Fix: 现在使用 async/await
  // ===========================================

  describe('safeLoad 安全读取 (异步)', () => {
    it('文件存在时应返回内容', async () => {
      const data = '{"test":"data"}'
      fs.writeFileSync(testFile, data, 'utf-8')
      expect(await safeLoad(testFile)).toBe(data)
    })

    it('文件不存在时应返回 null', async () => {
      expect(await safeLoad(testFile)).toBeNull()
    })

    it('应能读取中文内容', async () => {
      const chineseData = '{"name":"测试玩家"}'
      fs.writeFileSync(testFile, chineseData, 'utf-8')
      expect(await safeLoad(testFile)).toBe(chineseData)
    })

    it('应能读取大文件', async () => {
      const largeData = 'x'.repeat(100000)
      fs.writeFileSync(testFile, largeData, 'utf-8')
      expect(await safeLoad(testFile)).toBe(largeData)
    })

    it('应能读取空文件', async () => {
      fs.writeFileSync(testFile, '', 'utf-8')
      expect(await safeLoad(testFile)).toBe('')
    })
  })

  // ===========================================
  // safeDelete 删除测试
  // Issue #1 Fix: 现在使用 async/await
  // ===========================================

  describe('safeDelete 删除 (异步)', () => {
    it('应删除存在的文件', async () => {
      fs.writeFileSync(testFile, 'data', 'utf-8')
      expect(fs.existsSync(testFile)).toBe(true)
      expect(await safeDelete(testFile)).toBe(true)
      expect(fs.existsSync(testFile)).toBe(false)
    })

    it('文件不存在时应返回 true', async () => {
      expect(fs.existsSync(testFile)).toBe(false)
      expect(await safeDelete(testFile)).toBe(true)
    })

    it('删除后应能重新创建', async () => {
      fs.writeFileSync(testFile, 'old', 'utf-8')
      await safeDelete(testFile)
      await safeSave(testFile, 'new')
      expect(await safeLoad(testFile)).toBe('new')
    })
  })

  // ===========================================
  // 完整流程测试
  // ===========================================

  describe('完整存档流程', () => {
    it('保存 -> 加载 -> 验证', async () => {
      const metaData = JSON.stringify({
        version: 1,
        unlockedSkills: ['skill_1', 'skill_2'],
        stats: {
          totalRuns: 10,
          victories: 3,
        },
      })

      // 保存
      await safeSave(testFile, metaData)

      // 加载
      const loaded = await safeLoad(testFile)

      // 验证
      expect(loaded).toBe(metaData)
      expect(JSON.parse(loaded!)).toEqual(JSON.parse(metaData))
    })

    it('保存 -> 修改 -> 重新保存 -> 验证', async () => {
      // 初始保存
      await safeSave(testFile, '{"version":1,"runs":0}')

      // 修改并重新保存
      await safeSave(testFile, '{"version":1,"runs":5}')

      // 验证
      const loaded = await safeLoad(testFile)
      expect(JSON.parse(loaded!).runs).toBe(5)
    })

    it('保存 -> 删除 -> 加载应返回 null', async () => {
      await safeSave(testFile, '{"test":"data"}')
      await safeDelete(testFile)
      expect(await safeLoad(testFile)).toBeNull()
    })
  })

  // ===========================================
  // 边界情况测试
  // ===========================================

  describe('边界情况', () => {
    it('应处理空字符串保存', async () => {
      await safeSave(testFile, '')
      expect(await safeLoad(testFile)).toBe('')
    })

    it('应处理仅空格的内容', async () => {
      await safeSave(testFile, '   ')
      expect(await safeLoad(testFile)).toBe('   ')
    })

    it('应处理无效 JSON（作为字符串保存）', async () => {
      const invalidJson = 'not a json'
      await safeSave(testFile, invalidJson)
      expect(await safeLoad(testFile)).toBe(invalidJson)
    })
  })

  // ===========================================
  // SAVE_PATHS 测试 (验证模块导出)
  // ===========================================

  describe('SAVE_PATHS 常量', () => {
    it('META 路径应指向 userData/meta.json', () => {
      expect(SAVE_PATHS.META).toContain('meta.json')
      expect(SAVE_PATHS.META).toContain('typing-roguelike-test-userdata')
    })

    it('RUN 路径应指向 userData/run.json', () => {
      expect(SAVE_PATHS.RUN).toContain('run.json')
      expect(SAVE_PATHS.RUN).toContain('typing-roguelike-test-userdata')
    })
  })

  // ===========================================
  // 目录自动创建测试 (M4 fix)
  // ===========================================

  describe('目录自动创建', () => {
    const nestedDir = path.join(testDir, 'nested', 'deep')
    const nestedFile = path.join(nestedDir, 'test.json')

    afterEach(() => {
      // 清理嵌套目录
      if (fs.existsSync(nestedFile)) {
        fs.unlinkSync(nestedFile)
      }
      if (fs.existsSync(nestedDir)) {
        fs.rmdirSync(nestedDir)
      }
      if (fs.existsSync(path.join(testDir, 'nested'))) {
        fs.rmdirSync(path.join(testDir, 'nested'))
      }
    })

    it('应自动创建不存在的目录', async () => {
      // 确保目录不存在
      expect(fs.existsSync(nestedDir)).toBe(false)

      await safeSave(nestedFile, '{"test":"nested"}')

      expect(fs.existsSync(nestedFile)).toBe(true)
      expect(await safeLoad(nestedFile)).toBe('{"test":"nested"}')
    })
  })

  // ===========================================
  // Issue #1 验证: 非阻塞特性测试
  // ===========================================

  describe('异步非阻塞特性 (Issue #1 Fix)', () => {
    it('safeSave 应返回 Promise', () => {
      const result = safeSave(testFile, '{}')
      expect(result).toBeInstanceOf(Promise)
    })

    it('safeLoad 应返回 Promise', () => {
      const result = safeLoad(testFile)
      expect(result).toBeInstanceOf(Promise)
    })

    it('safeDelete 应返回 Promise', () => {
      const result = safeDelete(testFile)
      expect(result).toBeInstanceOf(Promise)
    })

    it('多个并发保存应该都能成功', async () => {
      const file1 = path.join(testDir, 'concurrent1.json')
      const file2 = path.join(testDir, 'concurrent2.json')
      const file3 = path.join(testDir, 'concurrent3.json')

      // 并发保存
      await Promise.all([
        safeSave(file1, '{"id":1}'),
        safeSave(file2, '{"id":2}'),
        safeSave(file3, '{"id":3}')
      ])

      // 验证所有文件都存在且内容正确
      expect(await safeLoad(file1)).toBe('{"id":1}')
      expect(await safeLoad(file2)).toBe('{"id":2}')
      expect(await safeLoad(file3)).toBe('{"id":3}')

      // 清理
      await safeDelete(file1)
      await safeDelete(file2)
      await safeDelete(file3)
    })
  })
})
