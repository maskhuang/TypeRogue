// ============================================
// Story 60.15: terminal / 工作台 i18n 全覆盖测试
// ============================================
// 验证所有 shop.terminal.* / shop.workbench.* 新 key 在 zh + en 都解析；
// 切 locale 后 cmdHelp / drawer title / stamp 等关键 UI 字符串内容确实变化

import { describe, it, expect, beforeEach } from 'vitest'

// 60-15 新增的 i18n keys
const SHOP_I18N_KEYS = [
  // 终端命令 help
  'shop.terminal.cmd.help.header',
  'shop.terminal.cmd.help.row1',
  'shop.terminal.cmd.help.row2',
  'shop.terminal.cmd.help.row3',
  'shop.terminal.cmd.help.inf_header',
  'shop.terminal.cmd.help.inf_sku',
  'shop.terminal.cmd.help.inf_key',
  'shop.terminal.cmd.help.inf_name',
  'shop.terminal.cmd.help.inf_owned',
  'shop.terminal.cmd.help.price_note',
  // USAGE
  'shop.terminal.cmd.usage.buy',
  'shop.terminal.cmd.usage.sell',
  'shop.terminal.cmd.usage.inf',
  // LIST
  'shop.terminal.cmd.list.empty',
  'shop.terminal.cmd.list.header',
  'shop.terminal.cmd.list.footer',
  // INFO owned
  'shop.terminal.cmd.info.empty_owned',
  'shop.terminal.cmd.info.owned_assets',
  'shop.terminal.cmd.info.skills_header',
  'shop.terminal.cmd.info.relics_header',
  'shop.terminal.cmd.info.try_owned',
  // SUBMIT 警告
  'shop.terminal.submit.warn_no_bindings',
  'shop.terminal.submit.warn_no_bindings_confirm',
  'shop.terminal.submit.warn_inbox_left',
  'shop.terminal.submit.aborted',
  'shop.terminal.submit.stamped',
  // 错误
  'shop.terminal.err.pending_confirm',
  'shop.terminal.err.undo_locked',
  'shop.terminal.err.appeal_form',
  // 工作台 stamp / drawer
  'shop.workbench.stamp.regulation',
  'shop.workbench.stamp.clearance_a',
  'shop.workbench.stamp.opened',
  'shop.workbench.drawer.words_title',
  'shop.workbench.drawer.craft_title',
  'shop.workbench.drawer.metamorph_title',
  // M1+L2 review fix
  'shop.terminal.info.section.affixes',
  'shop.terminal.info.section.enchantments',
  'shop.terminal.info.section.skills',
  'shop.terminal.info.section.relics',
  'shop.terminal.cmd.opening_words',
  // Story 60.19: STAT 真实数据
  'shop.terminal.cmd.stats.title',
  'shop.terminal.cmd.stats.col_header',
  'shop.terminal.cmd.stats.no_activity',
  'shop.terminal.cmd.stats.locked',
  'shop.terminal.cmd.stats.top_contributor',
  'shop.terminal.cmd.stats.weakest_key',
  'shop.terminal.cmd.stats.footer',
] as const

beforeEach(() => {
  // 不需要 reset state — i18n 模块是无状态的
})

describe('Story 60.15 · zh locale 全部 key 解析（不返回 key 自身）', () => {
  it.each(SHOP_I18N_KEYS)('zh: t("%s") 不返回 key 本身', async (key) => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')
    const result = t(key)
    expect(result).not.toBe(key)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('Story 60.15 · en locale 全部 key 解析（不返回 key 自身）', () => {
  it.each(SHOP_I18N_KEYS)('en: t("%s") 不返回 key 本身', async (key) => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')
    const result = t(key)
    expect(result).not.toBe(key)
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('Story 60.15 · 切 locale 关键字符串内容变化', () => {
  it('drawer.words_title zh ≠ en', async () => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')
    const zhTitle = t('shop.workbench.drawer.words_title', { n: 5 })
    setLocale('en')
    const enTitle = t('shop.workbench.drawer.words_title', { n: 5 })
    expect(zhTitle).not.toBe(enTitle)
    expect(zhTitle).toContain('5')
    expect(enTitle).toContain('5')
  })

  it('cmd.usage.buy zh ≠ en (USAGE 共字段但本体可能一致 — verify both render)', async () => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')
    const zh = t('shop.terminal.cmd.usage.buy')
    setLocale('en')
    const en = t('shop.terminal.cmd.usage.buy')
    expect(zh).toBeTruthy()
    expect(en).toBeTruthy()
    expect(en).toContain('USAGE')
  })

  it('stamp.opened 中英都解析（zh 可能与 en 同 — 章戳常单语）', async () => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('zh')
    expect(t('shop.workbench.stamp.opened')).toBeTruthy()
    setLocale('en')
    expect(t('shop.workbench.stamp.opened')).toBeTruthy()
  })

  it('cmd.list.footer 模板参数 {n} 替换正常', async () => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')
    const footer = t('shop.terminal.cmd.list.footer', { n: 7 })
    expect(footer).toContain('7')
    expect(footer).not.toContain('{n}') // 占位符已替换
  })

  it('cmd.help.price_note 模板参数 {threshold} 替换正常', async () => {
    const { setLocale, t, initLocale } = await import('../../../src/demo/demo-i18n')
    initLocale()
    setLocale('en')
    const note = t('shop.terminal.cmd.help.price_note', { threshold: 100 })
    expect(note).toContain('100')
    expect(note).not.toContain('{threshold}')
  })
})

describe('Story 60.15 · affixAbbrev locale-aware', () => {
  it('zh locale → 用 t("affix.X") 全名（"暴击" 而非 "CRT"）', async () => {
    const { setLocale, initLocale } = await import('../../../src/demo/demo-i18n')
    const { abbreviateAffix } = await import('../../../src/ui/affixAbbrev')
    initLocale()
    setLocale('zh')
    const result = abbreviateAffix('crit')
    expect(result).toBe('暴击') // i18n 命中
  })

  it('en locale → 沿用 3 字母缩写（"CRT"）', async () => {
    const { setLocale, initLocale } = await import('../../../src/demo/demo-i18n')
    const { abbreviateAffix } = await import('../../../src/ui/affixAbbrev')
    initLocale()
    setLocale('en')
    const result = abbreviateAffix('crit')
    expect(result).toBe('CRT')
  })

  it('zh locale + 未知 type → fallback 到 en abbrev', async () => {
    const { setLocale, initLocale } = await import('../../../src/demo/demo-i18n')
    const { abbreviateAffix } = await import('../../../src/ui/affixAbbrev')
    initLocale()
    setLocale('zh')
    const result = abbreviateAffix('not_a_real_affix_type_xxxxxxx')
    // 不在 i18n + 不在 AFFIX_ABBR → fallback 取前 3 字母
    expect(result.length).toBe(3)
  })

  it('abbreviateResource 同样 locale-aware', async () => {
    const { setLocale, initLocale } = await import('../../../src/demo/demo-i18n')
    const { abbreviateResource } = await import('../../../src/ui/affixAbbrev')
    initLocale()
    setLocale('zh')
    const zhResult = abbreviateResource('base')
    setLocale('en')
    const enResult = abbreviateResource('base')
    expect(zhResult).not.toBe(enResult) // zh 用 i18n 全名 / en 用 'BSE'
    expect(enResult).toBe('BSE')
  })
})
