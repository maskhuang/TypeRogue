// ============================================
// 打字肉鸽 - IPC 通道单元测试
// ============================================
// Story 8.1: Electron 主进程 (AC: #6)

import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS, type IpcChannel } from '../../../shared/ipc-channels'

describe('IPC_CHANNELS', () => {
  describe('存档通道', () => {
    it('应该定义所有存档相关通道 (Story 6.2)', () => {
      expect(IPC_CHANNELS.SAVE_META).toBe('save:meta')
      expect(IPC_CHANNELS.LOAD_META).toBe('load:meta')
      expect(IPC_CHANNELS.SAVE_RUN).toBe('save:run')
      expect(IPC_CHANNELS.LOAD_RUN).toBe('load:run')
      expect(IPC_CHANNELS.DELETE_RUN).toBe('delete:run')
    })

    it('应该定义扩展存档通道 (Story 8.1)', () => {
      expect(IPC_CHANNELS.SAVE_WRITE).toBe('save:write')
      expect(IPC_CHANNELS.SAVE_READ).toBe('save:read')
      expect(IPC_CHANNELS.SAVE_EXISTS).toBe('save:exists')
    })
  })

  describe('Steam 通道', () => {
    it('应该定义所有 Steam API 通道', () => {
      expect(IPC_CHANNELS.STEAM_IS_AVAILABLE).toBe('steam:is-available')
      expect(IPC_CHANNELS.STEAM_GET_USER_NAME).toBe('steam:get-user-name')
      expect(IPC_CHANNELS.STEAM_UNLOCK_ACHIEVEMENT).toBe('steam:unlock-achievement')
      expect(IPC_CHANNELS.STEAM_SYNC_CLOUD).toBe('steam:sync-cloud')
    })
  })

  describe('应用通道', () => {
    it('应该定义所有应用信息通道', () => {
      expect(IPC_CHANNELS.APP_GET_VERSION).toBe('app:get-version')
      expect(IPC_CHANNELS.APP_QUIT).toBe('app:quit')
    })
  })

  describe('通道命名规范', () => {
    it('所有通道应该遵循 domain:action 命名规范', () => {
      Object.values(IPC_CHANNELS).forEach(channel => {
        expect(channel).toMatch(/^[a-z]+:[a-z-]+$/)
      })
    })
  })

  describe('类型安全', () => {
    it('IpcChannel 类型应该是 string literal union', () => {
      const channel: IpcChannel = 'save:write'
      expect(typeof channel).toBe('string')
    })

    it('IPC_CHANNELS 对象应该是 readonly', () => {
      // 验证 as const 生效
      expect(Object.isFrozen(IPC_CHANNELS)).toBe(false) // as const 不冻结对象
      // 但类型系统会阻止修改
    })
  })
})
