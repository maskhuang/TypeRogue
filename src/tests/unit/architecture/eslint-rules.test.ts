/**
 * Architecture rule regression test — Stories 59.1 (M-1) + 59.2 (C-4)
 *
 * 用 ESLint programmatic API 对 `src/eslint.config.js` 里的硬架构规则做 fixture 回归。
 *
 * 为什么需要这个测试:
 * ESLint flat config 的"多 config object 同名 rule 整体替换"陷阱会导致规则合并错误
 * 时 M-1 或 C-4 悄悄失效（lint 不报错，只是漏拦）。任何对 eslint.config.js 的重构
 * 都可能踩坑。本测试文件用具体 fixture 字符串 × 具体 filePath × 预期 rule id 做断言，
 * 任何回归都会被捕获。
 *
 * 新增规则时的维护约定:
 * 1. 把 fixture 加到下方表格
 * 2. "filePath" 必须是一个会被 eslint.config.js 里对应 files glob 匹配的相对路径
 * 3. 同时覆盖 "违反应被拒绝" 和 "合法代码应通过" 两类 case
 */

import { describe, expect, it, beforeAll } from 'vitest'
import { ESLint } from 'eslint'

let eslint: ESLint

beforeAll(() => {
  // 从 src/ cwd 自动加载 eslint.config.js（flat config 默认行为）
  eslint = new ESLint({})
})

/**
 * 断言给定代码在给定文件路径下 lint 时，恰好命中目标 rule id 且错误消息包含指定片段。
 */
async function assertViolation(
  code: string,
  filePath: string,
  expectedRuleId: string,
  expectedMessageFragment: string,
): Promise<void> {
  const results = await eslint.lintText(code, { filePath })
  expect(results).toHaveLength(1)
  const messages = results[0].messages
  const matching = messages.find((m) => m.ruleId === expectedRuleId)
  expect(
    matching,
    `Expected rule ${expectedRuleId} to fire on ${filePath} but saw: ` +
      JSON.stringify(messages.map((m) => ({ ruleId: m.ruleId, message: m.message }))),
  ).toBeDefined()
  expect(matching!.message).toContain(expectedMessageFragment)
}

/** 断言给定代码在给定文件路径下 lint 无任何错误。 */
async function assertClean(code: string, filePath: string): Promise<void> {
  const results = await eslint.lintText(code, { filePath })
  const errors = results[0].messages.filter((m) => m.severity === 2)
  expect(
    errors,
    `Expected no errors but got: ` +
      JSON.stringify(errors.map((m) => ({ ruleId: m.ruleId, message: m.message }))),
  ).toHaveLength(0)
}

describe('M-1: core/systems PixiJS isolation', () => {
  it('rejects static import of pixi.js in src/core/', async () => {
    await assertViolation(
      `import { Container } from 'pixi.js'\nexport const x = Container`,
      'src/core/_fixture.ts',
      'no-restricted-imports',
      'M-1',
    )
  })

  it('rejects static import of @pixi/* in src/systems/', async () => {
    await assertViolation(
      `import { Container } from '@pixi/display'\nexport const x = Container`,
      'src/systems/_fixture.ts',
      'no-restricted-imports',
      'M-1',
    )
  })

  it('rejects dynamic import of pixi.js in src/core/', async () => {
    await assertViolation(
      `export async function f() { return await import('pixi.js') }`,
      'src/core/_fixture.ts',
      'no-restricted-syntax',
      'M-1',
    )
  })

  it('rejects require() of pixi.js in src/systems/', async () => {
    await assertViolation(
      `declare const require: (id: string) => unknown\nexport const m = require('pixi.js')`,
      'src/systems/_fixture.ts',
      'no-restricted-syntax',
      'M-1',
    )
  })

  it('also applies to core/systems unit tests (防止测试假设耦合 pixi)', async () => {
    await assertViolation(
      `import { Container } from 'pixi.js'\nexport const x = Container`,
      'tests/unit/core/_fixture.test.ts',
      'no-restricted-imports',
      'M-1',
    )
  })

  it('does NOT apply M-1 to scenes/ or ui/ (他们预期依赖 PixiJS)', async () => {
    await assertClean(
      `import { Container } from 'pixi.js'\nexport const x = Container`,
      'src/scenes/_fixture.ts',
    )
    await assertClean(
      `import { Container } from 'pixi.js'\nexport const x = Container`,
      'src/ui/_fixture.ts',
    )
  })
})

describe('C-4: runtime isolation from aigc-art/', () => {
  it('rejects static import with relative path in src/core/', async () => {
    await assertViolation(
      `import { foo } from '../../../aigc-art/pipeline'\nexport const x = foo`,
      'src/core/_fixture.ts',
      'no-restricted-imports',
      'C-4',
    )
  })

  it('rejects static import in Electron main/', async () => {
    await assertViolation(
      `import { bar } from '../../aigc-art/runs/latest'\nexport const x = bar`,
      'main/_fixture.ts',
      'no-restricted-imports',
      'C-4',
    )
  })

  it('rejects static import in shared/', async () => {
    await assertViolation(
      `import { baz } from '../aigc-art/prompts'\nexport const x = baz`,
      'shared/_fixture.ts',
      'no-restricted-imports',
      'C-4',
    )
  })

  it('rejects dynamic import of aigc-art in src/scenes/', async () => {
    await assertViolation(
      `export async function f() { return await import('../aigc-art/stuff') }`,
      'src/scenes/_fixture.ts',
      'no-restricted-syntax',
      'C-4',
    )
  })

  it('rejects require() of aigc-art in src/systems/', async () => {
    await assertViolation(
      `declare const require: (id: string) => unknown\nexport const m = require('../../../aigc-art/pipeline')`,
      'src/systems/_fixture.ts',
      'no-restricted-syntax',
      'C-4',
    )
  })

  it('rejects alias-style @aigc-art/* (前瞻性覆盖 tsconfig path alias)', async () => {
    await assertViolation(
      `import { foo } from '@aigc-art/pipeline'\nexport const x = foo`,
      'src/scenes/_fixture.ts',
      'no-restricted-imports',
      'C-4',
    )
  })

  it('does NOT误伤 "aigc-art" 子串的合法包名（H3 anchored regex 回归）', async () => {
    // 这些导入名称包含 "aigc-art" 子串但不指向真正的 aigc-art 目录，应该通过
    await assertClean(
      `import { x } from './aigc-art-helper'\nexport const a = x`,
      'src/scenes/_fixture.ts',
    )
    await assertClean(
      `import { y } from 'my-aigc-art-renderer'\nexport const b = y`,
      'src/scenes/_fixture.ts',
    )
  })
})

describe('M-1 + C-4 合并规则（flat-config rule-replacement 陷阱回归）', () => {
  // 这是最关键的测试组：确保 core/systems 文件同时承载 M-1 和 C-4 两套规则。
  // 如果未来有人拆分 eslint.config.js 的规则 block 导致合并失效，这些断言会立即捕获。

  it('在同一个 core/ 文件里，M-1 pixi 违反与 C-4 aigc-art 违反都必须 fire', async () => {
    const code =
      `import { Container } from 'pixi.js'\n` +
      `import { foo } from '../../../aigc-art/pipeline'\n` +
      `export const x = Container; export const y = foo`
    const results = await eslint.lintText(code, {
      filePath: 'src/core/_fixture.ts',
    })
    const messages = results[0].messages
    const m1Hit = messages.find(
      (m) => m.ruleId === 'no-restricted-imports' && m.message.includes('M-1'),
    )
    const c4Hit = messages.find(
      (m) => m.ruleId === 'no-restricted-imports' && m.message.includes('C-4'),
    )
    expect(m1Hit, 'M-1 应 fire').toBeDefined()
    expect(c4Hit, 'C-4 应 fire').toBeDefined()
  })

  it('在同一个 core/ 文件里，M-1 dynamic import 与 C-4 dynamic import 都必须 fire', async () => {
    const code =
      `export async function f() {\n` +
      `  const a = await import('pixi.js')\n` +
      `  const b = await import('../../../aigc-art/pipeline')\n` +
      `  return [a, b]\n` +
      `}`
    const results = await eslint.lintText(code, {
      filePath: 'src/core/_fixture.ts',
    })
    const messages = results[0].messages.filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    )
    const m1Hit = messages.find((m) => m.message.includes('M-1'))
    const c4Hit = messages.find((m) => m.message.includes('C-4'))
    expect(m1Hit, 'M-1 dynamic 应 fire').toBeDefined()
    expect(c4Hit, 'C-4 dynamic 应 fire').toBeDefined()
  })
})
