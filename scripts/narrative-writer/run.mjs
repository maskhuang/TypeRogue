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
import { VOICE_MAP, OUTPUT_DIR, NARRATIVE_OUT, VOICE_TYPE_MAP_V41, VOICES_V41 } from './config.mjs'
import { SYSTEM_CONTEXT } from './prompts/system-context.mjs'
import { buildUserPrompt, buildBatchPrompt, buildPromptForVoice } from './prompts/voices.mjs'
import { VOICE_SCHEMAS_V41, REFLEXIVE_PLACEHOLDER_DICT } from './prompts/voice-schemas.mjs'
import { getObject, getAllObjects, summarizeObject } from './loaders/index.mjs'
import { validateFragment, buildReviewPrompt } from './validators/index.mjs'
import { reviewBatch, closeUI } from './reviewer/terminal-ui.mjs'

// v4.1 voice 识别（spec §3）
const V41_VOICE_PATTERN = /^V[1-7](_pair)?$/
function isV41Voice(voice) {
  return typeof voice === 'string' && V41_VOICE_PATTERN.test(voice)
}

// v4.1 standalone types — 不需 --id（pipeline 自行决定生成内容）
const V41_STANDALONE_TYPES = new Set([
  'handbook', 'charDrift', 'environmental', 'positionDenialAffirmation',
  'freeTypeNote', 'bossTooltip', 'tutorial',
])

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
    model: 'claude-sonnet-4-6',
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

  // v4.1 voice + v4.1 standalone type 不需 --id
  const isV41 = isV41Voice(opts.voice)
  const isV41Standalone = opts.type && V41_STANDALONE_TYPES.has(opts.type)

  if (opts.type && !opts.all && !opts.id
      && !['shopnote', 'ritual', 'scriptorNotes'].includes(opts.type)
      && !(isV41 && isV41Standalone)) {
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
  ritual, tutorial, achievement, scriptorNotes, shopnote

选项:
  --voice <bell|doc|note>         指定单个声音（v3：altar 已废弃）
  --model <model-id>              Claude 模型（默认 claude-sonnet-4-6）
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

// Structured output schemas per voice
const VOICE_SCHEMAS = {
  // Single item schemas
  bell: {
    type: 'object',
    properties: {
      name_zh: { type: 'string' },
      name_en: { type: 'string' },
      text_zh: { type: 'string' },
      text_en: { type: 'string' },
      // Optional affix fields
      sigil_name_zh: { type: 'string' },
      sigil_name_en: { type: 'string' },
    },
    required: ['text_zh', 'text_en'],
    additionalProperties: false,
  },
  doc: {
    type: 'object',
    properties: {
      text_zh: { type: 'string' },
      text_en: { type: 'string' },
    },
    required: ['text_zh', 'text_en'],
    additionalProperties: false,
  },
  // EN-only schema for doc voice first pass (avoids zh truncation)
  doc_en: {
    type: 'object',
    properties: {
      text_en: { type: 'string' },
    },
    required: ['text_en'],
    additionalProperties: false,
  },
  // ZH-only schema for doc voice translation pass
  doc_zh: {
    type: 'object',
    properties: {
      text_zh: { type: 'string' },
    },
    required: ['text_zh'],
    additionalProperties: false,
  },
  altar: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        source: { type: 'string' },
        text_zh: { type: 'string' },
        text_en: { type: 'string' },
      },
      required: ['source', 'text_zh', 'text_en'],
      additionalProperties: false,
    },
  },
  note: {
    type: 'object',
    properties: {
      text_zh: { type: 'string' },
      text_en: { type: 'string' },
    },
    required: ['text_zh', 'text_en'],
    additionalProperties: false,
  },
  // v3.1 NEW · per_tier_flavor: name + 4 tier × zh/en（10 字段）
  per_tier_flavor: {
    type: 'object',
    properties: {
      name_zh: { type: 'string' },
      name_en: { type: 'string' },
      tier_0_zh: { type: 'string' },
      tier_0_en: { type: 'string' },
      tier_1_zh: { type: 'string' },
      tier_1_en: { type: 'string' },
      tier_2_zh: { type: 'string' },
      tier_2_en: { type: 'string' },
      tier_3_zh: { type: 'string' },
      tier_3_en: { type: 'string' },
    },
    required: [
      'name_zh', 'name_en',
      'tier_0_zh', 'tier_0_en',
      'tier_1_zh', 'tier_1_en',
      'tier_2_zh', 'tier_2_en',
      'tier_3_zh', 'tier_3_en',
    ],
    additionalProperties: false,
  },
}

// ─── Doc Voice: EN-first + ZH translation ───

const TRANSLATE_ZH_PROMPT = `你是 X 集团 · 灵长类辅助文书部的政策协调员。将以下英文档案 / 政策 / 工种文书创作为同等质量的中文版本。

## 要求
- 这不是翻译——是用中文重新创作同一份文书，质量和信息密度对等
- 保持相同的文书格式（4 段式 MIB 装备文书 / 政策颁布文 / 工种简介 / HR 入职文件）
- 编号 / 分类码（B-7 类、C-2 类、Section 9、Section 11、政策 #082、F-XXX、RX-617）保持原样
- ██ 遮蔽保持原样
- 工号 (#485,902 / #485,901) 保持原样
- 体制用词用中文对应：HR → HR / 人力资源处；Section → Section（保留英文）；Floor 7 → 7 楼；the upstream → 上游；Maintenance Group → 维修组
- 保留 v3 员工腔：公文 / 被动语态 / 无情绪 / 行政口吻
- B1.a 严守：力量是"被分发"，禁用 钻研 / 突破 / 领悟 / 觉醒 / 发明 / 共鸣 / 心法 / 灵感 / 激活（自身）
- 严禁 v2.3 残留：圣印 / 守卷人 / 大教堂 / 圣坛 / 铅币 / 异文 / 誓门 / D-XXXX 编号 / Litany / Scriptor / Sigil
- 严禁游戏术语和机制透明词
- 中文版应完整，不要截断

## 英文原文
`

// Build batch schema (array of items with id)
function getBatchSchema(voice, count) {
  const itemSchema = VOICE_SCHEMAS[voice]
  if (!itemSchema) return null
  // For array types (altar), return as-is
  if (itemSchema.type === 'array') return itemSchema
  // For single-item schemas, wrap in array with id
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        ...itemSchema.properties,
      },
      required: ['id', ...(itemSchema.required || [])],
      additionalProperties: false,
    },
  }
}

function _logCompletion(elapsed, usage, stopReason) {
  const cacheInfo = usage.cache_read_input_tokens
    ? ` 缓存命中 ${usage.cache_read_input_tokens}`
    : usage.cache_creation_input_tokens
      ? ` 缓存创建 ${usage.cache_creation_input_tokens}`
      : ''
  const truncated = stopReason === 'max_tokens'
  console.log(`✅ 完成 (${elapsed}s, 输入 ${usage.input_tokens} / 输出 ${usage.output_tokens} tokens${cacheInfo})${truncated ? ' ⚠️ 输出被截断' : ''}`)
  return truncated
}

// Structured output call — guaranteed valid JSON, no parsing needed
async function callClaudeStructured(client, { system, user }, label, model, schema) {
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
    output_config: {
      format: {
        type: 'json_schema',
        schema,
      },
    },
  })

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const truncated = _logCompletion(elapsed, response.usage, response.stop_reason)

  // With structured outputs, content[0].text is guaranteed valid JSON
  try {
    const parsed = JSON.parse(response.content[0].text)
    return { data: parsed, truncated }
  } catch (e) {
    // Should never happen with structured outputs, but handle gracefully
    console.error(`   ⚠️ Structured output parse error (unexpected): ${e.message}`)
    return { data: null, truncated: true }
  }
}

// Legacy text call — for AI review, self-edit, and other freeform outputs
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
  const truncated = _logCompletion(elapsed, response.usage, response.stop_reason)

  return { text: response.content[0].text, truncated }
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

async function translateDocToZh(client, enText, obj, type, template, opts) {
  const label = `translate-zh ${type}/${obj.id || obj.name}`
  const { data: parsed } = await callClaudeStructured(
    client,
    {
      system: { cached: SYSTEM_CONTEXT, extra: TRANSLATE_ZH_PROMPT + enText },
      user: `请为以上英文档案创作中文版本。输出完整中文档案条目。`,
    },
    label,
    opts.model,
    VOICE_SCHEMAS.doc_zh,
  )
  return parsed?.text_zh || null
}

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

    // Doc voice: EN-first, then translate to ZH
    if (voice === 'doc') {
      const enPrompt = userPrompt + '\n\n⚠️ Output English only. Write the complete English document.'
      const { data: enParsed } = await callClaudeStructured(
        client,
        {
          system: { cached: SYSTEM_CONTEXT, extra: 'You are a policy coordinator at X Group · Primate Auxiliary Documentation Department (v3). Generate the English document in the v3 voice.' },
          user: enPrompt,
        },
        `${type}/${obj.id || obj.name}/doc-en`,
        opts.model,
        VOICE_SCHEMAS.doc_en,
      )
      if (!enParsed) continue

      const zhText = await translateDocToZh(client, enParsed.text_en, obj, type, cfg.template, opts)
      const frag = { text_en: enParsed.text_en, text_zh: zhText || '', _objectId: obj.id || obj.name, _voice: 'doc' }
      results.push(frag)
      continue
    }

    const schema = VOICE_SCHEMAS[voice]
    const { data: parsed } = await callClaudeStructured(
      client,
      {
        system: { cached: SYSTEM_CONTEXT, extra: `你是 X 集团 · 灵长类辅助文书部 · 政策协调员（v3）。为游戏对象生成 v3 体制语言 flavor text。` },
        user: userPrompt,
      },
      `${type}/${obj.id || obj.name}/${voice}`,
      opts.model,
      schema,
    )

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

  // Doc voice: EN-first pipeline, one at a time
  if (voice === 'doc') {
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i]
      const objId = obj.id || obj.name
      console.log(`\n  [${i + 1}/${objects.length}] ${objId}`)

      if (opts.dryRun) {
        console.log('  [DRY RUN] Prompt built, skipping API call')
        continue
      }

      // Step 1: Generate EN
      const userPrompt = buildUserPrompt(obj, type, voice, template)
        + '\n\n⚠️ Output English only. Write the complete English document.'
      const { data: enParsed, truncated } = await callClaudeStructured(
        client,
        {
          system: { cached: SYSTEM_CONTEXT, extra: 'You are a policy coordinator at X Group · Primate Auxiliary Documentation Department (v3). Generate the English document in the v3 voice.' },
          user: userPrompt,
        },
        `${type}/${objId}/doc-en`,
        opts.model,
        VOICE_SCHEMAS.doc_en,
      )

      if (!enParsed) {
        if (truncated) console.error(`   ⚠️ EN 截断，跳过`)
        continue
      }

      // Step 2: Translate EN → ZH
      const zhText = await translateDocToZh(client, enParsed.text_en, obj, type, template, opts)

      const frag = {
        text_en: enParsed.text_en,
        text_zh: zhText || '',
        _voice: 'doc',
        _objectId: objId,
      }
      results.push(frag)
    }
    return results
  }

  // Non-doc voices: batch as before
  const effectiveBatchSize = opts.batchSize
  for (let i = 0; i < objects.length; i += effectiveBatchSize) {
    const batch = objects.slice(i, i + effectiveBatchSize)
    console.log(`\n  批次 ${Math.floor(i / effectiveBatchSize) + 1}/${Math.ceil(objects.length / effectiveBatchSize)} (${batch.length} 对象)`)

    if (opts.dryRun) {
      console.log('  [DRY RUN] Prompt built, skipping API call')
      continue
    }

    let batchItems = batch

    const schema = batchItems.length === 1
      ? VOICE_SCHEMAS[voice]
      : getBatchSchema(voice, batchItems.length)

    if (!schema) {
      console.error(`   ⚠️ No schema for voice: ${voice}, falling back to text mode`)
      break
    }

    const userPrompt = batchItems.length === 1
      ? buildUserPrompt(batchItems[0], type, voice, template)
      : buildBatchPrompt(batchItems, type, voice, template)

    const { data: parsed, truncated } = await callClaudeStructured(
      client,
      {
        system: { cached: SYSTEM_CONTEXT, extra: `你是 X 集团 · 灵长类辅助文书部 · 政策协调员（v3）。${batchItems.length === 1 ? '为游戏对象生成 v3 体制语言 flavor text。' : '为游戏对象批量生成 v3 体制语言 flavor text。'}` },
        user: userPrompt,
      },
      batchItems.length === 1
        ? `${type}/${batchItems[0].id || batchItems[0].name}/${voice}`
        : `batch ${type}/${voice} [${i + 1}-${i + batchItems.length}]`,
      opts.model,
      schema,
    )

    if (parsed) {
      const fragments = Array.isArray(parsed) ? parsed : [parsed]
      for (const frag of fragments) {
        frag._voice = voice
        if (!frag._objectId) frag._objectId = frag.id || (batchItems.length === 1 ? (batchItems[0].id || batchItems[0].name) : undefined)
        results.push(frag)
      }
    } else if (truncated) {
      console.error(`   ⚠️ 结构化输出截断，跳过`)
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

  const schema = VOICE_SCHEMAS[voice] || getBatchSchema(voice, 10)
  const { data: parsed } = await callClaudeStructured(
    client,
    {
      system: { cached: SYSTEM_CONTEXT, extra: `你是 X 集团 · 灵长类辅助文书部 · 政策协调员（v3）。` },
      user: userPrompt,
    },
    `standalone ${type}`,
    opts.model,
    schema,
  )

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

  const editSchema = VOICE_SCHEMAS[voice]
  const { data: parsed } = await callClaudeStructured(
    client,
    {
      system: { cached: SYSTEM_CONTEXT, extra: '你是叙事编辑员。仅修复指定的校验问题，不改动其他内容。' },
      user: prompt,
    },
    `self-edit ${voice}/${fragment._objectId || '?'}`,
    opts.model,
    editSchema,
  )
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

async function validateAndReview(client, fragments, voice, opts, { objects, type, template } = {}) {
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

  // Phase 2c: Regenerate stubborn failures (1 attempt, no self-edit)
  if (!opts.dryRun && client && objects && type && template) {
    const stubbornFails = validations
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !v.passed)
    if (stubbornFails.length > 0) {
      console.log(`\n🔁 重新生成 ${stubbornFails.length} 条顽固失败...`)
      for (const { v, i } of stubbornFails) {
        const frag = currentFragments[i]
        const objId = frag._objectId || frag.id
        const obj = objects.find(o => (o.id || o.name) === objId)
        if (!obj) continue

        const failReasons = v.errors.join('; ')
        const userPrompt = buildUserPrompt(obj, type, voice, template)
          + `\n\n⚠��� 上次生成因以下原因被拒，请避免：${failReasons}`

        const regenSchema = VOICE_SCHEMAS[voice]
        const { data: regenParsed } = await callClaudeStructured(
          client,
          {
            system: { cached: SYSTEM_CONTEXT, extra: `你是 X 集团 · 灵长类辅助文书部 · 政策协调员（v3）。重新生成一条被拒绝的 v3 flavor text。` },
            user: userPrompt,
          },
          `regen ${voice}/${objId}`,
          opts.model,
          regenSchema,
        )

        if (!regenParsed) continue

        const newFrag = Array.isArray(regenParsed) ? regenParsed[0] : regenParsed
        newFrag._voice = voice
        newFrag._objectId = objId
        newFrag._regenerated = true

        const reVal = validateFragment(newFrag, voice)
        if (reVal.passed) {
          currentFragments[i] = newFrag
          validations[i] = reVal
          console.log(`   ✓ ${objId} 重新生成成功`)
        } else {
          console.log(`   ✗ ${objId} 重新生成仍失败: ${reVal.errors.join('; ')}`)
        }
      }
      passCount = validations.filter(v => v.passed).length
      console.log(`   ✓ ${passCount}/${currentFragments.length} 通过`)
    }
  }

  // Phase 3: AI self-review
  let aiReviews = null
  if (!opts.noAiReview && !opts.dryRun) {
    console.log('🤖 AI 自审...')
    const reviewPrompt = buildReviewPrompt(currentFragments, voice)
    const { text: reviewRaw } = await callClaude(
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

  // No review: return all that passed validation, attach AI review scores for reference
  return currentFragments.filter((_, i) => validations[i].passed).map(frag => {
    if (aiReviews) {
      const review = aiReviews.find(r => r.id === (frag._objectId || frag.id))
      if (review) {
        frag._aiScore = review.score
        if (review.issues?.length) frag._aiIssues = review.issues
        if (review.suggestion) frag._aiSuggestion = review.suggestion
      }
    }
    return frag
  })
}

// ─── Main ───

// ─── v4.1 main path (Phase B / spec §3) ───
//
// 当 --voice V[1-7] 时绕过 v3.1 generation pipeline，走 buildPromptForVoice。
// 目前 dry-run 模式只 print prompt + schema；实际 LLM 调用 / batch / ingest 在 Phase E。

async function mainV41(opts) {
  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   打字肉鸽 · Narrative Pipeline · v4.1 path (Phase B)   ║')
  console.log('╚' + '═'.repeat(58) + '╝')

  const voice = opts.voice
  const type = opts.type
  console.log(`\n  voice: ${voice} (${VOICES_V41[voice.replace('_pair', '')]?.label || voice})`)
  console.log(`  type:  ${type}`)

  // 验证 type 在 VOICE_TYPE_MAP_V41 内
  const typeCfg = VOICE_TYPE_MAP_V41[type]
  if (!typeCfg) {
    console.error(`\n  ❌ type "${type}" 不在 VOICE_TYPE_MAP_V41 中`)
    console.error(`  支持的 v4.1 types: ${Object.keys(VOICE_TYPE_MAP_V41).join(', ')}`)
    process.exit(1)
  }
  const allowedVoices = [...typeCfg.primary, ...typeCfg.secondary]
  if (!allowedVoices.includes(voice.replace('_pair', '')) && !(voice === 'V5_pair' && allowedVoices.includes('V5'))) {
    console.warn(`  ⚠️  voice ${voice} 不在 type ${type} 的 primary/secondary（允许: ${allowedVoices.join(', ')}）—— 仍生成`)
  }

  // 取目标对象（如 --id 提供）；v4.1 中 obj 找不到一律 fallback 到 synthetic
  let target = null
  if (opts.id) {
    target = getObject(type, opts.id)
  }
  if (!target) {
    target = {
      id: opts.id || `${type}_dryrun`,
      type,
      _synthetic: true,
      hint: `v4.1 ${type} · pipeline 自行决定 ${type} 内容范围`,
    }
  }

  // context（B Phase 简化版；Phase C/E 会扩展）
  const context = {
    chapter: opts.chapter || null,
    cycle: opts.cycle || null,
    section_ref: opts.sectionRef || null,
    references_position: opts.refPos || null,
    valid_from_chapter: opts.fromChapter || null,
    chapter_target: opts.chapterTarget || null,
    item_id: opts.itemId || null,
    degradation_state: opts.degState || null,
    channel: opts.channel || null,
    length_class: opts.lengthClass || null,
    sentiment: opts.sentiment || null,
  }

  // 构造 prompt
  const userPrompt = buildPromptForVoice(voice, type, target, context)
  const schema = VOICE_SCHEMAS_V41[voice]

  if (!schema) {
    console.error(`  ❌ no schema for voice ${voice}`)
    process.exit(1)
  }

  if (opts.dryRun) {
    console.log('\n' + '━'.repeat(60))
    console.log('  [DRY RUN] System prompt: SYSTEM_CONTEXT (cached, ' + SYSTEM_CONTEXT.length + ' chars)')
    console.log('━'.repeat(60))
    console.log('\n  [DRY RUN] User prompt:')
    console.log('━'.repeat(60))
    console.log(userPrompt)
    console.log('━'.repeat(60))
    console.log('\n  [DRY RUN] Output schema:')
    console.log(JSON.stringify(schema, null, 2))
    console.log('\n  [DRY RUN] (Phase B 不调 API；Phase E 启用 batch generation)')
    return
  }

  // 实际 LLM 调用 — 留待 Phase E
  console.error('\n  ❌ Phase B 仅支持 --dry-run；实际 LLM 调用 / batch / ingest 在 Phase E')
  process.exit(1)
}

async function main() {
  const opts = parseArgs()

  // v4.1 path 分流（spec §3）
  if (isV41Voice(opts.voice)) {
    return mainV41(opts)
  }

  const client = opts.dryRun ? null : createClient()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   打字肉鸽 · AI Narrative Content Pipeline                ║')
  console.log('╚' + '═'.repeat(58) + '╝')

  const allResults = {} // type → approved fragments

  // Determine what to generate
  // --all without --type = all types; --type X --all = all objects of type X
  const typesToProcess = (opts.all && !opts.type)
    ? ['relic', 'affix', 'enchantment', 'bossModifier', 'class', 'scriptorNotes', 'shopnote']
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
    if (['shopnote', 'ritual'].includes(type) && type !== 'scriptorNotes') {
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
    // Resolve objects list for regeneration support
    const regenObjects = (!['altar', 'shopnote', 'ritual'].includes(type))
      ? (opts.id ? [getObject(type, opts.id)] : getAllObjects(type))
      : null
    const approved = []
    for (const [voice, voiceFragments] of Object.entries(byVoice)) {
      const cfg = voiceConfig[voice]
      const result = await validateAndReview(client, voiceFragments, voice, opts,
        regenObjects ? { objects: regenObjects, type, template: cfg?.template } : {})
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
