#!/usr/bin/env node

/**
 * AI Narrative Content Pipeline for 打字肉鸽
 *
 * Usage:
 *   node run.mjs --type relic --id combo_buffer       # Single object
 *   node run.mjs --type relic --id combo_buffer --voice bell  # Single voice
 *   node run.mjs --type relic --all                   # All relics
 *   node run.mjs --all                                # Everything
 *   node run.mjs --type altar                         # Generate altar murmurs
 *   node run.mjs --type shopnote                      # Generate shop notes
 *   node run.mjs --no-review                          # Skip interactive review
 */

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { VOICE_MAP, OUTPUT_DIR, NARRATIVE_OUT } from './config.mjs'
import { SYSTEM_CONTEXT } from './prompts/system-context.mjs'
import { buildUserPrompt, buildBatchPrompt } from './prompts/voices.mjs'
import { getObject, getAllObjects, summarizeObject } from './loaders/index.mjs'
import { validateFragment, buildReviewPrompt } from './validators/index.mjs'
import { reviewBatch, closeUI } from './reviewer/terminal-ui.mjs'

// ─── CLI Parsing ───

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    type: null,
    id: null,
    voice: null,
    all: false,
    noReview: false,
    noAiReview: false,
    model: 'claude-sonnet-4-20250514',
    batchSize: 5,
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type': case '-t':
        opts.type = args[++i]; break
      case '--id':
        opts.id = args[++i]; break
      case '--voice': case '-v':
        opts.voice = args[++i]; break
      case '--all': case '-a':
        opts.all = true; break
      case '--no-review':
        opts.noReview = true; break
      case '--no-ai-review':
        opts.noAiReview = true; break
      case '--model': case '-m':
        opts.model = args[++i]; break
      case '--batch-size':
        opts.batchSize = parseInt(args[++i], 10); break
      case '--dry-run':
        opts.dryRun = true; break
      case '--help': case '-h':
        printHelp(); process.exit(0)
      default:
        console.error(`未知参数: ${args[i]}`); process.exit(1)
    }
  }

  // Validate
  if (!opts.all && !opts.type) {
    console.error('请指定 --type <type> 或 --all')
    printHelp()
    process.exit(1)
  }

  if (opts.type && !opts.all && !opts.id && !['altar', 'shopnote', 'ritual', 'scriptorNotes'].includes(opts.type)) {
    console.error(`类型 ${opts.type} 需要 --id <id> 或 --all`)
    process.exit(1)
  }

  return opts
}

function printHelp() {
  console.log(`
打字肉鸽 · AI Narrative Content Pipeline

用法:
  node run.mjs --type <type> --id <id>    单对象生成
  node run.mjs --type <type> --all        批量生成（某类型全部）
  node run.mjs --all                      全量生成

类型:
  relic, affix, enchantment, bossModifier, class,
  ritual, tutorial, achievement, altar, shopnote

选项:
  --voice <bell|doc|altar|note>   指定单个声音（否则生成全部适用声音）
  --model <model-id>              Claude 模型（默认 claude-sonnet-4-20250514）
  --batch-size <n>                批量生成每批数量（默认 5）
  --no-review                     跳过人工审核
  --no-ai-review                  跳过 AI 自审
  --dry-run                       只构建 prompt 不调用 API
  --help                          显示帮助
`)
}

// ─── Claude API ───

function createClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('错误: 请设置 ANTHROPIC_API_KEY 环境变量')
    process.exit(1)
  }
  return new Anthropic({ apiKey })
}

async function callClaude(client, { system, user }, label, model) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`🔄 ${label}...`)
  console.log(`${'='.repeat(50)}`)

  const startTime = Date.now()

  const systemParam = [
    { type: 'text', text: system.cached, cache_control: { type: 'ephemeral' } },
    ...(system.extra ? [{ type: 'text', text: system.extra }] : []),
  ]

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    system: systemParam,
    messages: [{ role: 'user', content: user }],
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const text = response.content[0].text
  const usage = response.usage

  const cacheInfo = usage.cache_read_input_tokens
    ? ` 缓存命中 ${usage.cache_read_input_tokens}`
    : usage.cache_creation_input_tokens
      ? ` 缓存创建 ${usage.cache_creation_input_tokens}`
      : ''
  console.log(`✅ 完成 (${elapsed}s, 输入 ${usage.input_tokens} / 输出 ${usage.output_tokens} tokens${cacheInfo})`)

  return text
}

function fixJsonNewlines(text) {
  // AI often outputs literal newlines inside JSON string values.
  // JSON spec requires them to be escaped as \\n.
  // Strategy: walk through the text tracking whether we're inside a JSON string,
  // and replace literal newlines/tabs only within strings.
  let result = ''
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      result += ch
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
    }

    result += ch
  }

  return result
}

function parseJSON(text, label) {
  // Try multiple strategies in order
  const attempts = [
    () => JSON.parse(text),
    () => JSON.parse(fixJsonNewlines(text)),
    () => {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      return match ? JSON.parse(fixJsonNewlines(match[1].trim())) : null
    },
    () => {
      const jsonStart = text.search(/[\[{]/)
      if (jsonStart < 0) return null
      const jsonEnd = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
      if (jsonEnd <= jsonStart) return null
      return JSON.parse(fixJsonNewlines(text.slice(jsonStart, jsonEnd + 1)))
    },
  ]

  for (const attempt of attempts) {
    try {
      const result = attempt()
      if (result) return result
    } catch { /* try next */ }
  }

  console.error(`\n❌ ${label} JSON 解析失败:`)
  console.error(text.slice(0, 1500))
  console.error(`\n[总长度: ${text.length}]`)
  return null
}

// ─── Output ───

function saveOutput(timestamp, suffix, data) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const filename = `${timestamp}-${suffix}`
  const filepath = join(OUTPUT_DIR, filename)
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  writeFileSync(filepath, content, 'utf-8')
  console.log(`   📄 已保存: output/${filename}`)
  return filepath
}

function writeNarrativeBundle(type, fragments) {
  mkdirSync(NARRATIVE_OUT, { recursive: true })

  const bundleFile = join(NARRATIVE_OUT, `${type}.ts`)
  const constName = type.toUpperCase() + '_NARRATIVE'

  // Group by object id
  const grouped = {}
  for (const frag of fragments) {
    const id = frag._objectId || frag.id || 'unknown'
    if (!grouped[id]) grouped[id] = {}
    const voice = frag._voice
    grouped[id][voice] = { ...frag }
    // Clean internal fields
    delete grouped[id][voice]._objectId
    delete grouped[id][voice]._voice
    delete grouped[id][voice].id
  }

  // Check if bundle already exists and merge
  let existing = {}
  if (existsSync(bundleFile)) {
    // Read existing and try to parse the object
    const content = readFileSync(bundleFile, 'utf-8')
    const match = content.match(/=\s*({[\s\S]*})\s*(?:as\s+const)?;?\s*$/)
    if (match) {
      try {
        // Use Function to parse the object literal (handles trailing commas)
        existing = new Function(`return ${match[1]}`)()
      } catch { /* start fresh */ }
    }
  }

  // Merge: new fragments overwrite existing for same id+voice
  const merged = { ...existing }
  for (const [id, voices] of Object.entries(grouped)) {
    if (!merged[id]) merged[id] = {}
    for (const [voice, data] of Object.entries(voices)) {
      merged[id][voice] = data
    }
  }

  const tsContent = `// Auto-generated by narrative-writer pipeline
// Last updated: ${new Date().toISOString().split('T')[0]}

export const ${constName} = ${JSON.stringify(merged, null, 2)} as const
`

  writeFileSync(bundleFile, tsContent, 'utf-8')
  console.log(`\n📦 Bundle 已写入: src/src/data/narrative/${type}.ts (${Object.keys(merged).length} 对象)`)
}

// ─── Generation Pipeline ───

async function generateForObject(client, obj, type, voices, opts) {
  const results = []
  const voiceConfig = VOICE_MAP[type] || {}

  const targetVoices = voices
    ? Object.entries(voiceConfig).filter(([v]) => voices.includes(v))
    : Object.entries(voiceConfig).filter(([, cfg]) => !cfg.optional)

  for (const [voice, cfg] of targetVoices) {
    console.log(`\n  → ${cfg.desc}`)

    const userPrompt = buildUserPrompt(obj, type, voice, cfg.template)

    if (opts.dryRun) {
      console.log('  [DRY RUN] Prompt built, skipping API call')
      continue
    }

    const raw = await callClaude(
      client,
      {
        system: { cached: SYSTEM_CONTEXT, extra: `你是活字大教堂的首席抄写员。为游戏对象生成 flavor text。` },
        user: userPrompt,
      },
      `${type}/${obj.id || obj.name}/${voice}`,
      opts.model,
    )

    const parsed = parseJSON(raw, `${type}/${voice}`)
    if (!parsed) continue

    // Normalize: single object or array
    const fragments = Array.isArray(parsed) ? parsed : [parsed]

    for (const frag of fragments) {
      frag._objectId = obj.id || obj.name
      frag._voice = voice
      results.push(frag)
    }
  }

  return results
}

async function generateBatch(client, objects, type, voice, template, opts) {
  const results = []

  // Split into batches
  for (let i = 0; i < objects.length; i += opts.batchSize) {
    const batch = objects.slice(i, i + opts.batchSize)
    console.log(`\n  批次 ${Math.floor(i / opts.batchSize) + 1}/${Math.ceil(objects.length / opts.batchSize)} (${batch.length} 对象)`)

    const userPrompt = buildBatchPrompt(batch, type, voice, template)

    if (opts.dryRun) {
      console.log('  [DRY RUN] Prompt built, skipping API call')
      continue
    }

    const raw = await callClaude(
      client,
      {
        system: { cached: SYSTEM_CONTEXT, extra: `你是活字大教堂的首席抄写员。为游戏对象批量生成 flavor text。` },
        user: userPrompt,
      },
      `batch ${type}/${voice} [${i + 1}-${i + batch.length}]`,
      opts.model,
    )

    const parsed = parseJSON(raw, `batch ${type}/${voice}`)
    if (!parsed) continue

    const fragments = Array.isArray(parsed) ? parsed : [parsed]
    for (const frag of fragments) {
      frag._voice = voice
      if (!frag._objectId) frag._objectId = frag.id
      results.push(frag)
    }
  }

  return results
}

async function generateStandalone(client, type, opts) {
  const voiceConfig = VOICE_MAP[type]
  const voice = Object.keys(voiceConfig)[0]
  const template = voiceConfig[voice].template

  const userPrompt = buildUserPrompt('', type, voice, template)

  if (opts.dryRun) {
    console.log('  [DRY RUN] Prompt built, skipping API call')
    return []
  }

  const raw = await callClaude(
    client,
    {
      system: { cached: SYSTEM_CONTEXT, extra: `你是活字大教堂的首席抄写员。` },
      user: userPrompt,
    },
    `standalone ${type}`,
    opts.model,
  )

  const parsed = parseJSON(raw, type)
  if (!parsed) return []

  const fragments = Array.isArray(parsed) ? parsed : [parsed]
  for (const frag of fragments) {
    frag._voice = voice
    frag._objectId = frag.id || frag.source || type
  }
  return fragments
}

// ─── Self-Edit ───

const SELF_EDIT_MAX_ROUNDS = 2

function buildSelfEditPrompt(fragment, voice, errors) {
  const errorList = errors.map((e, i) => `${i + 1}. ${e}`).join('\n')
  return `以下 ${voice} 声部的 flavor text 有 ${errors.length} 处校验问题。请做最小修改修复，不要改动其他内容。

## 校验问题
${errorList}

## 原文（JSON）
${JSON.stringify(fragment, null, 2)}

## 要求
- 仅修改被指出的问题部分，保留其他所有内容
- 输出完整的修正后 JSON（与原文相同结构）
- 如果问题是裸数值，用 ██ 遮蔽或改为模糊表述
- 如果问题是机制透明词，用物质/仪式隐喻替代
- 如果问题是汉字数值，用模糊表述替代
- 不要添加新内容，不要改变语气和风格`
}

async function selfEditFragment(client, fragment, voice, errors, opts) {
  const prompt = buildSelfEditPrompt(fragment, voice, errors)

  const raw = await callClaude(
    client,
    {
      system: { cached: SYSTEM_CONTEXT, extra: '你是叙事编辑员。仅修复指定的校验问题，不改动其他内容。' },
      user: prompt,
    },
    `self-edit ${voice}/${fragment._objectId || '?'}`,
    opts.model,
  )

  const parsed = parseJSON(raw, `self-edit ${voice}`)
  if (!parsed) return null

  // Preserve internal fields
  const edited = Array.isArray(parsed) ? parsed[0] : parsed
  edited._objectId = fragment._objectId
  edited._voice = fragment._voice
  return edited
}

async function selfEditBatch(client, fragments, validations, voice, opts) {
  // Collect failures
  const failures = []
  for (let i = 0; i < fragments.length; i++) {
    if (!validations[i].passed) {
      failures.push({ index: i, fragment: fragments[i], errors: validations[i].errors })
    }
  }

  if (failures.length === 0) return { fragments, validations }

  console.log(`\n✏️  自编辑 ${failures.length} 条未通过碎片...`)

  const editedFragments = [...fragments]
  const editedValidations = [...validations]

  for (const { index, fragment, errors } of failures) {
    const edited = await selfEditFragment(client, fragment, voice, errors, opts)
    if (!edited) continue

    // Re-validate the edited fragment
    const reValidation = validateFragment(edited, voice)
    editedFragments[index] = edited
    editedValidations[index] = reValidation

    if (reValidation.passed) {
      console.log(`   ✓ ${fragment._objectId} 修复成功`)
    } else {
      console.log(`   ✗ ${fragment._objectId} 仍有问题: ${reValidation.errors.join('; ')}`)
    }
  }

  return { fragments: editedFragments, validations: editedValidations }
}

// ─── Validation + Review ───

async function validateAndReview(client, fragments, voice, opts) {
  // Phase 2: Validate
  console.log(`\n🔍 校验 ${fragments.length} 条 ${voice} 碎片...`)
  let validations = fragments.map(frag => validateFragment(frag, voice))
  let currentFragments = [...fragments]

  let passCount = validations.filter(v => v.passed).length
  console.log(`   ✓ ${passCount}/${fragments.length} 通过`)

  // Phase 2b: Self-Edit loop (up to SELF_EDIT_MAX_ROUNDS)
  if (!opts.dryRun && client) {
    for (let round = 1; round <= SELF_EDIT_MAX_ROUNDS; round++) {
      const failCount = validations.filter(v => !v.passed).length
      if (failCount === 0) break

      console.log(`\n🔄 自编辑轮次 ${round}/${SELF_EDIT_MAX_ROUNDS}`)
      const result = await selfEditBatch(client, currentFragments, validations, voice, opts)
      currentFragments = result.fragments
      validations = result.validations

      passCount = validations.filter(v => v.passed).length
      const newFails = validations.filter(v => !v.passed).length
      console.log(`   ✓ ${passCount}/${currentFragments.length} 通过 (${failCount - newFails} 条修复)`)

      if (newFails === 0) break
    }
  }

  // Phase 3: AI self-review
  let aiReviews = null
  if (!opts.noAiReview && !opts.dryRun) {
    console.log('🤖 AI 自审...')
    const reviewPrompt = buildReviewPrompt(currentFragments, voice)
    const reviewRaw = await callClaude(
      client,
      {
        system: { cached: SYSTEM_CONTEXT, extra: '你是叙事质量审核员。评审 flavor text 碎片。' },
        user: reviewPrompt,
      },
      `AI review ${voice}`,
      opts.model,
    )
    const reviewResult = parseJSON(reviewRaw, 'AI review')
    if (reviewResult?.fragments) {
      aiReviews = reviewResult.fragments
    }
  }

  // Phase 3b: Interactive review
  if (!opts.noReview) {
    const result = await reviewBatch(currentFragments, voice, validations, aiReviews)
    return result.approved
  }

  // No review: return all that passed validation
  return currentFragments.filter((_, i) => validations[i].passed)
}

// ─── Main ───

async function main() {
  const opts = parseArgs()
  const client = opts.dryRun ? null : createClient()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   打字肉鸽 · AI Narrative Content Pipeline                ║')
  console.log('╚' + '═'.repeat(58) + '╝')

  const allResults = {} // type → approved fragments

  // Determine what to generate
  // --all without --type = all types; --type X --all = all objects of type X
  const typesToProcess = (opts.all && !opts.type)
    ? ['relic', 'affix', 'enchantment', 'bossModifier', 'class', 'scriptorNotes', 'altar', 'shopnote']
    : [opts.type]

  for (const type of typesToProcess) {
    console.log(`\n${'━'.repeat(60)}`)
    console.log(`  类型: ${type}`)
    console.log(`${'━'.repeat(60)}`)

    const voiceConfig = VOICE_MAP[type]
    if (!voiceConfig) {
      console.error(`  未知类型: ${type}`)
      continue
    }

    let fragments = []

    // Standalone types (altar, shopnote, ritual)
    if (['altar', 'shopnote', 'ritual'].includes(type) && type !== 'scriptorNotes') {
      fragments = await generateStandalone(client, type, opts)
    }
    // Single object
    else if (opts.id) {
      const obj = getObject(type, opts.id)
      if (!obj) {
        console.error(`  找不到: ${type}/${opts.id}`)
        continue
      }
      console.log(`  对象: ${summarizeObject(obj, type)}`)
      const voices = opts.voice ? [opts.voice] : null
      fragments = await generateForObject(client, obj, type, voices, opts)
    }
    // All objects of this type
    else {
      const objects = getAllObjects(type)
      if (objects.length === 0) {
        console.error(`  ${type} 无数据`)
        continue
      }
      console.log(`  共 ${objects.length} 个对象`)

      // For each voice, batch generate
      const targetVoices = opts.voice
        ? [[opts.voice, voiceConfig[opts.voice]]]
        : Object.entries(voiceConfig).filter(([, cfg]) => !cfg.optional)

      for (const [voice, cfg] of targetVoices) {
        console.log(`\n  声音: ${cfg.desc}`)
        const batchFragments = await generateBatch(client, objects, type, voice, cfg.template, opts)
        fragments.push(...batchFragments)
      }
    }

    if (fragments.length === 0) {
      console.log('  无生成结果')
      continue
    }

    // Save raw output
    saveOutput(timestamp, `${type}-raw.json`, fragments)

    // Group by voice for validation
    const byVoice = {}
    for (const frag of fragments) {
      const v = frag._voice || 'unknown'
      if (!byVoice[v]) byVoice[v] = []
      byVoice[v].push(frag)
    }

    // Validate + review each voice group
    const approved = []
    for (const [voice, voiceFragments] of Object.entries(byVoice)) {
      const result = await validateAndReview(client, voiceFragments, voice, opts)
      approved.push(...result)
    }

    allResults[type] = approved

    // Phase 4: Export to narrative bundle
    if (approved.length > 0 && !opts.dryRun) {
      // Map type to bundle name
      const bundleName = {
        relic: 'relics',
        affix: 'skills',
        enchantment: 'skills',
        bossModifier: 'battle',
        class: 'relics',
        ritual: 'battle',
        altar: 'ui',
        shopnote: 'ui',
        tutorial: 'ui',
        achievement: 'achievements',
      }[type] || type

      writeNarrativeBundle(bundleName, approved)
      saveOutput(timestamp, `${type}-approved.json`, approved)
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  生成完成')
  console.log(`${'═'.repeat(60)}`)

  let totalApproved = 0
  for (const [type, fragments] of Object.entries(allResults)) {
    console.log(`  ${type}: ${fragments.length} 条已通过`)
    totalApproved += fragments.length
  }
  console.log(`  总计: ${totalApproved} 条`)

  closeUI()
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message)
  if (err.status === 401) console.error('   API Key 无效，请检查 ANTHROPIC_API_KEY')
  if (err.status === 429) console.error('   请求过多，请稍后重试')
  process.exit(1)
})
