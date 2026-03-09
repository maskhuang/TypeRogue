// ============================================
// 打字肉鸽 - actTransition 单元测试
// ============================================
// Story 18.9: Act 标题卡 + 精英提示 + Boss 入场 + HUD

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock dependencies
vi.mock('../../../src/data/bossModifiers', () => ({
  getBossModifierMeta: vi.fn((id: string) => {
    const metas: Record<string, { icon: string; name: string }> = {
      boss_decay: { icon: '📉', name: '分数衰减' },
      boss_scramble: { icon: '🔀', name: '乱序打字' },
      boss_fast_time: { icon: '⏩', name: '时间加速' },
      boss_fade: { icon: '👻', name: '渐隐之词' },
    }
    return metas[id] || null
  }),
}))

vi.mock('../../../src/effects/juice', () => ({
  screenShake: vi.fn(),
}))

// ---- Minimal DOM mock for node environment ----
function createMockElement(tag: string): any {
  const classes = new Set<string>()
  const children: any[] = []
  const style: Record<string, string> = {}
  let _id = ''
  let _className = ''
  let _textContent = ''
  let _innerHTML = ''

  const el: any = {
    tagName: tag.toUpperCase(),
    get id() { return _id },
    set id(v: string) { _id = v },
    get className() { return _className },
    set className(v: string) {
      _className = v
      classes.clear()
      v.split(' ').filter(Boolean).forEach(c => classes.add(c))
    },
    get textContent() { return _textContent },
    set textContent(v: string) { _textContent = v },
    get innerHTML() { return _innerHTML },
    set innerHTML(v: string) { _innerHTML = v },
    get offsetWidth() { return 100 },
    style,
    classList: {
      add: (c: string) => { classes.add(c); _className = [...classes].join(' ') },
      remove: (c: string) => { classes.delete(c); _className = [...classes].join(' ') },
      contains: (c: string) => classes.has(c),
    },
    appendChild: (child: any) => {
      children.push(child)
      child._parentNode = el
      return child
    },
    remove: () => {
      const idx = mockBody._children.indexOf(el)
      if (idx >= 0) mockBody._children.splice(idx, 1)
    },
    _children: children,
    _parentNode: null as any,
  }
  return el
}

const mockBody: any = {
  _children: [] as any[],
  appendChild: (child: any) => {
    mockBody._children.push(child)
    child._parentNode = mockBody
    return child
  },
}

const mockDocument: any = {
  createElement: (tag: string) => createMockElement(tag),
  body: mockBody,
  getElementById: (id: string) => {
    return mockBody._children.find((c: any) => c.id === id) || null
  },
}

// Install document mock
;(globalThis as any).document = mockDocument

describe('actTransition', () => {
  beforeEach(() => {
    // Use fake timers but exclude requestAnimationFrame so our synchronous mock stays
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    })
    // Synchronous rAF mock (must be set after fake timers)
    ;(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0 }
    mockBody._children = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function getModule() {
    return import('../../../src/systems/actTransition')
  }

  // ==========================================
  // Task 6.1: showActTransition()
  // ==========================================
  describe('showActTransition', () => {
    it('should create overlay with correct Act 1 title and subtitle', async () => {
      const { showActTransition } = await getModule()
      const promise = showActTransition(1)

      const overlay = mockDocument.getElementById('act-transition-overlay')
      expect(overlay).not.toBeNull()
      expect(overlay.innerHTML).toContain('Act 1')
      expect(overlay.innerHTML).toContain('热身')
      expect(overlay.classList.contains('act-enter')).toBe(true)

      vi.advanceTimersByTime(1500)
      await promise
      expect(mockDocument.getElementById('act-transition-overlay')).toBeNull()
    })

    it('should show correct subtitle for Act 2 and Act 3', async () => {
      const { showActTransition } = await getModule()

      // Act 2
      let promise = showActTransition(2)
      let overlay = mockDocument.getElementById('act-transition-overlay')
      expect(overlay.innerHTML).toContain('Act 2')
      expect(overlay.innerHTML).toContain('征途')
      vi.advanceTimersByTime(1500)
      await promise

      // Act 3
      promise = showActTransition(3)
      overlay = mockDocument.getElementById('act-transition-overlay')
      expect(overlay.innerHTML).toContain('Act 3')
      expect(overlay.innerHTML).toContain('决战')
      vi.advanceTimersByTime(1500)
      await promise
    })

    it('should add CSS classes in correct sequence', async () => {
      const { showActTransition } = await getModule()
      const promise = showActTransition(1)

      const overlay = mockDocument.getElementById('act-transition-overlay')!

      // After synchronous rAF: act-enter added
      expect(overlay.classList.contains('act-enter')).toBe(true)
      expect(overlay.classList.contains('act-visible')).toBe(false)

      // After 300ms: act-visible added
      vi.advanceTimersByTime(300)
      expect(overlay.classList.contains('act-visible')).toBe(true)

      // After 1200ms total: act-visible removed, act-exit added
      vi.advanceTimersByTime(900)
      expect(overlay.classList.contains('act-visible')).toBe(false)
      expect(overlay.classList.contains('act-exit')).toBe(true)

      // After 1500ms total: overlay removed
      vi.advanceTimersByTime(300)
      await promise
      expect(mockDocument.getElementById('act-transition-overlay')).toBeNull()
    })

    it('should resolve promise after 1.5s', async () => {
      const { showActTransition } = await getModule()
      let resolved = false
      const promise = showActTransition(1).then(() => { resolved = true })

      vi.advanceTimersByTime(1499)
      await Promise.resolve()
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })
  })

  // ==========================================
  // Task 6.3: showEliteAnnouncement()
  // ==========================================
  describe('showEliteAnnouncement', () => {
    it('should create banner with correct modifier info', async () => {
      const { showEliteAnnouncement } = await getModule()
      const promise = showEliteAnnouncement('boss_decay')

      const banner = mockDocument.getElementById('elite-announcement')
      expect(banner).not.toBeNull()
      expect(banner.innerHTML).toContain('⚡ 精英强化:')
      expect(banner.innerHTML).toContain('📉')
      expect(banner.innerHTML).toContain('分数衰减')

      vi.advanceTimersByTime(1200)
      await promise
      expect(mockDocument.getElementById('elite-announcement')).toBeNull()
    })

    it('should resolve immediately for unknown modifier', async () => {
      const { showEliteAnnouncement } = await getModule()
      let resolved = false
      const promise = showEliteAnnouncement('nonexistent').then(() => { resolved = true })
      await Promise.resolve()
      await Promise.resolve()
      expect(resolved).toBe(true)
      await promise
      expect(mockDocument.getElementById('elite-announcement')).toBeNull()
    })

    it('should add enter and exit classes in sequence', async () => {
      const { showEliteAnnouncement } = await getModule()
      const promise = showEliteAnnouncement('boss_scramble')

      const banner = mockDocument.getElementById('elite-announcement')!
      expect(banner.classList.contains('elite-announce-enter')).toBe(true)

      vi.advanceTimersByTime(900)
      expect(banner.classList.contains('elite-announce-exit')).toBe(true)

      vi.advanceTimersByTime(300)
      await promise
      expect(mockDocument.getElementById('elite-announcement')).toBeNull()
    })
  })

  // ==========================================
  // Task 6.4: showBossIntro()
  // ==========================================
  describe('showBossIntro', () => {
    it('should call screenShake and create overlay with boss title and modifiers', async () => {
      const { screenShake } = await import('../../../src/effects/juice')
      const { showBossIntro } = await getModule()
      const pool = ['boss_decay', 'boss_scramble', 'boss_fast_time']

      const promise = showBossIntro(pool)

      expect(screenShake).toHaveBeenCalledWith(4)

      const overlay = mockDocument.getElementById('boss-intro-overlay')
      expect(overlay).not.toBeNull()

      // Check title
      const titleChild = overlay._children.find((c: any) => c.className.includes('boss-intro-title'))
      expect(titleChild.textContent).toBe('💀 BOSS')

      // Check mod items
      const modListChild = overlay._children.find((c: any) => c.className.includes('boss-intro-mods'))
      expect(modListChild._children.length).toBe(3)
      expect(modListChild._children[0].textContent).toBe('📉 分数衰减')
      expect(modListChild._children[1].textContent).toBe('🔀 乱序打字')
      expect(modListChild._children[2].textContent).toBe('⏩ 时间加速')

      vi.advanceTimersByTime(2000)
      await promise
      expect(mockDocument.getElementById('boss-intro-overlay')).toBeNull()
    })

    it('should skip unknown modifiers in pool', async () => {
      const { showBossIntro } = await getModule()
      const pool = ['boss_decay', 'unknown_mod', 'boss_fast_time']

      const promise = showBossIntro(pool)

      const overlay = mockDocument.getElementById('boss-intro-overlay')!
      const modListChild = overlay._children.find((c: any) => c.className.includes('boss-intro-mods'))
      expect(modListChild._children.length).toBe(2)

      vi.advanceTimersByTime(2000)
      await promise
    })

    it('should set staggered animation delays', async () => {
      const { showBossIntro } = await getModule()
      const pool = ['boss_decay', 'boss_scramble', 'boss_fast_time']

      const promise = showBossIntro(pool)

      const overlay = mockDocument.getElementById('boss-intro-overlay')!
      const modListChild = overlay._children.find((c: any) => c.className.includes('boss-intro-mods'))
      expect(modListChild._children[0].style.animationDelay).toBe('0.6s')
      expect(modListChild._children[1].style.animationDelay).toBe('0.9s')
      expect(modListChild._children[2].style.animationDelay).toBe('1.2s')

      vi.advanceTimersByTime(2000)
      await promise
    })

    it('should resolve after 2s', async () => {
      const { showBossIntro } = await getModule()
      let resolved = false
      const promise = showBossIntro(['boss_decay']).then(() => { resolved = true })

      vi.advanceTimersByTime(1999)
      await Promise.resolve()
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(1)
      await promise
      expect(resolved).toBe(true)
    })
  })

  // ==========================================
  // Task 6.5: updateStageInfo()
  // ==========================================
  describe('updateStageInfo', () => {
    beforeEach(() => {
      const el = createMockElement('div')
      el.id = 'hud-stage-info'
      el.className = 'hud-stage-info'
      mockBody._children.push(el)
    })

    it('should display Act number and standard icon', async () => {
      const { updateStageInfo } = await getModule()
      updateStageInfo(1, 'standard')
      const el = mockDocument.getElementById('hud-stage-info')!
      expect(el.textContent).toBe('Act 1 ⚔️')
      expect(el.classList.contains('stage-standard')).toBe(true)
    })

    it('should display elite icon for elite stage', async () => {
      const { updateStageInfo } = await getModule()
      updateStageInfo(2, 'elite')
      const el = mockDocument.getElementById('hud-stage-info')!
      expect(el.textContent).toBe('Act 2 ⚡')
      expect(el.classList.contains('stage-elite')).toBe(true)
    })

    it('should display boss icon for boss stage', async () => {
      const { updateStageInfo } = await getModule()
      updateStageInfo(3, 'boss')
      const el = mockDocument.getElementById('hud-stage-info')!
      expect(el.textContent).toBe('Act 3 💀')
      expect(el.classList.contains('stage-boss')).toBe(true)
    })

    it('should add pulse animation class', async () => {
      const { updateStageInfo } = await getModule()
      updateStageInfo(1, 'standard')
      const el = mockDocument.getElementById('hud-stage-info')!
      expect(el.classList.contains('stage-info-pulse')).toBe(true)
    })

    it('should not throw if element does not exist', async () => {
      mockBody._children = []
      const { updateStageInfo } = await getModule()
      expect(() => updateStageInfo(1, 'standard')).not.toThrow()
    })

    it('should default to standard icon for unknown stage type', async () => {
      const { updateStageInfo } = await getModule()
      updateStageInfo(1, 'unknown')
      const el = mockDocument.getElementById('hud-stage-info')!
      expect(el.textContent).toBe('Act 1 ⚔️')
    })
  })

  // ==========================================
  // Task 6.2: Act detection logic
  // ==========================================
  describe('Act detection (getActForNode)', () => {
    it('node 1 = Act 1', async () => {
      const { getActForNode } = await import('../../../src/systems/stage/stageFlow')
      expect(getActForNode(1)).toBe(1)
    })

    it('node 4→5 crosses Act boundary (Act 1 → Act 2)', async () => {
      const { getActForNode } = await import('../../../src/systems/stage/stageFlow')
      expect(getActForNode(4)).toBe(1)
      expect(getActForNode(5)).toBe(2)
    })

    it('node 2→3 same Act (no transition)', async () => {
      const { getActForNode } = await import('../../../src/systems/stage/stageFlow')
      expect(getActForNode(2)).toBe(getActForNode(3))
    })

    it('node 8→9 crosses Act boundary (Act 2 → Act 3)', async () => {
      const { getActForNode } = await import('../../../src/systems/stage/stageFlow')
      expect(getActForNode(8)).toBe(2)
      expect(getActForNode(9)).toBe(3)
    })

    it('node 9→10 same Act (Boss stays in Act 3)', async () => {
      const { getActForNode } = await import('../../../src/systems/stage/stageFlow')
      expect(getActForNode(9)).toBe(getActForNode(10))
    })
  })

  // ==========================================
  // Code Review M2/M5: resetLastAct + tracking
  // ==========================================
  describe('resetLastAct', () => {
    it('should export resetLastAct function', async () => {
      const { resetLastAct } = await import('../../../src/systems/battle')
      expect(typeof resetLastAct).toBe('function')
    })

    it('should not throw when called', async () => {
      const { resetLastAct } = await import('../../../src/systems/battle')
      expect(() => resetLastAct()).not.toThrow()
    })
  })
})
