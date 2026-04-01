#!/usr/bin/env node
// ============================================
// AI 词条批量设计工作流 — 主入口
// Phase 1: 设计 → Phase 2: 评审(含子系统评估) → Phase 2b: 子系统遗物设计
// Phase 3: BMAD 工作流（写 epic → sprint-status → create-story → dev-story → code-review → commit）
// ============================================

import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readFileSync, appendFileSync, existsSync } from 'fs'
import { createInterface } from 'readline'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync, execFileSync } from 'child_process'
import { buildDesignPrompt, buildReviewPrompt, buildSubsystemRelicPrompt } from './prompts.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../..')
const OUTPUT_DIR = join(__dirname, 'output')
const DOCS_DIR = join(PROJECT_ROOT, 'docs')
const STORIES_DIR = join(DOCS_DIR, 'stories')
const EPICS_FILE = join(DOCS_DIR, 'epics.md')
const SPRINT_STATUS_FILE = join(STORIES_DIR, 'sprint-status.yaml')

// ===== CLI 参数解析 =====

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {
    count: 3,
    category: null,
    theme: null,
    designOnly: false,
    fromFile: null,
    model: 'claude-sonnet-4-20250514',
    skipReview: false,
    noSubsystem: false,
    noBmad: false,
    autoApprove: false,
    resumeFrom: 0,
    noTest: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count': case '-n':
        opts.count = parseInt(args[++i], 10); break
      case '--category': case '-c':
        opts.category = args[++i]; break
      case '--theme': case '-t':
        opts.theme = args[++i]; break
      case '--design-only':
        opts.designOnly = true; break
      case '--from-file':
        opts.fromFile = args[++i]; break
      case '--model': case '-m':
        opts.model = args[++i]; break
      case '--skip-review':
        opts.skipReview = true; break
      case '--no-subsystem':
        opts.noSubsystem = true; break
      case '--no-bmad':
        opts.noBmad = true; break
      case '--auto-approve': case '-y':
        opts.autoApprove = true; break
      case '--resume-from':
        opts.resumeFrom = parseInt(args[++i], 10); break
      case '--no-test':
        opts.noTest = true; break
      case '--help': case '-h':
        printHelp(); process.exit(0)
      default:
        console.error(`未知参数: ${args[i]}`); process.exit(1)
    }
  }
  return opts
}

function printHelp() {
  console.log(`
AI 词条批量设计工作流
用法: node run.mjs [选项]

选项:
  -n, --count <N>       生成词条数量 (默认: 3)
  -c, --category <CAT>  限定类别 (numeric/rhythm/topology/trigger_chain/word_sense/meta_rule)
  -t, --theme <THEME>   设计主题 (如 "防御/生存", "连锁/组合")
  --design-only         只执行设计阶段
  --from-file <PATH>    从已有设计文件继续 (跳过设计阶段)
  --skip-review         跳过评审阶段
  --no-subsystem        跳过子系统扩展评估和遗物设计
  --no-bmad             跳过 BMAD 工作流（不写 epic/story，只生成代码）
  -y, --auto-approve    跳过人工确认环节，全自动执行
  --resume-from <N>     从第 N 个 story 开始（跳过前面已完成的）
  --no-test             跳过关键 story 后的自动测试
  -m, --model <MODEL>   Claude 模型 (默认: claude-sonnet-4-20250514)
  -h, --help            显示帮助

流程:
  Phase 1: 设计
  Phase 2: 评审 (含子系统评估)
  Phase 2b: 子系统遗物设计 (条件分支)
  Phase 3: BMAD 工作流
    3a. 写 Epic → 3b. 更新 sprint-status → 3c. create-story
    3d. dev-story → 3e. code-review → 3f. commit
    → 等待人工评审后 push
  `)
}

// ===== API 调用 =====

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
  console.log(`   模型: ${model}`)
  console.log(`${'='.repeat(50)}`)

  const startTime = Date.now()

  // system prompt 支持两种格式：
  // 1. string — 旧格式，直接传
  // 2. { cached, extra } — 新格式，cached 部分启用 prompt caching
  let systemParam
  if (typeof system === 'string') {
    systemParam = system
  } else {
    systemParam = [
      { type: 'text', text: system.cached, cache_control: { type: 'ephemeral' } },
      ...(system.extra ? [{ type: 'text', text: system.extra }] : []),
    ]
  }

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

function parseJSON(text, label) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try { return JSON.parse(match[1].trim()) } catch { /* fall through */ }
    }
    const jsonStart = text.search(/[\[{]/)
    if (jsonStart >= 0) {
      const jsonEnd = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'))
      if (jsonEnd > jsonStart) {
        try { return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) } catch { /* fall through */ }
      }
    }
    console.error(`\n❌ ${label} 返回的 JSON 解析失败:`)
    console.error(text.slice(0, 500))
    process.exit(1)
  }
}

// ===== 输出 =====

function saveOutput(timestamp, suffix, data) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const filename = `${timestamp}-${suffix}`
  const filepath = join(OUTPUT_DIR, filename)
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  writeFileSync(filepath, content, 'utf-8')
  console.log(`   📄 已保存: output/${filename}`)
  return filepath
}

// ===== BMAD 工作流步骤 =====

function getNextEpicNumber() {
  const content = readFileSync(EPICS_FILE, 'utf-8')
  const matches = content.match(/## Epic (\d+)/g)
  if (!matches) return 1
  const numbers = matches.map(m => parseInt(m.match(/\d+/)[0]))
  return Math.max(...numbers) + 1
}

/** 3a. 写 Epic — 追加到 docs/epics.md */
function writeEpic(epicNum, designs, subsystemDesigns) {
  console.log(`\n📝 3a. 写 Epic ${epicNum}...`)

  const hasSubsystem = subsystemDesigns?.length > 0
  const subsystemNames = subsystemDesigns?.map(s => s.subsystemId).join('、') || ''

  // 构建 stories 列表
  const stories = []
  let storyNum = 1

  // Story: 词条数据定义（枚举/映射表/参数）
  stories.push({
    num: storyNum++,
    title: '词条数据定义',
    desc: `在 affixes.ts 中添加 ${designs.length} 个新词条的 AffixType 枚举、类别映射、参数接口、权重、名称、描述、升级缩放。`,
    ac: [
      `AffixType 枚举新增: ${designs.map(d => `${d.englishName} = '${d.id}'`).join(', ')}`,
      'AFFIX_CATEGORY_MAP、AFFIX_WEIGHT_TIERS、AFFIX_NAMES、AFFIX_DESCRIPTIONS 同步更新',
      'AffixInstance 接口新增各词条参数字段',
      'AFFIX_LEVEL_SCALING 添加升级缩放规则',
      'affixes.test.ts 枚举计数断言更新',
    ],
    files: ['src/src/data/affixes.ts', 'src/tests/unit/data/affixes.test.ts'],
  })

  // Story: 词条生成（skillGeneration.ts）
  stories.push({
    num: storyNum++,
    title: '词条生成逻辑',
    desc: `在 skillGeneration.ts 中添加 ${designs.length} 个新词条的参数随机生成逻辑。`,
    ac: [
      ...designs.map(d => `${d.name}(${d.englishName}): 生成参数 ${Object.keys(d.params || {}).join(', ')} 在指定范围内`),
      '生成的技能可正确序列化/反序列化',
    ],
    files: ['src/src/data/skillGeneration.ts'],
  })

  // Story: 每个词条的触发逻辑
  for (const d of designs) {
    stories.push({
      num: storyNum++,
      title: `${d.englishName} 词条触发逻辑`,
      desc: `在 affixTrigger.ts Phase ${d.triggerPhase} 中实现${d.name}(${d.englishName})词条的计算逻辑。${d.description}`,
      ac: [
        `Phase ${d.triggerPhase} 中添加 AffixType.${d.englishName} 的 case 分支`,
        '参数 null/undefined 安全处理',
        `单元测试: 正常触发、边界条件、与其他词条协同(${(d.synergyWith || []).join('/')})`,
        ...(d.questEnchantment ? [
          `附魔: EnchantmentType 新增 ${d.questEnchantment.englishName}`,
          `QUEST_AFFIX_MAP / QUEST_ENCHANTMENT_DEFS 添加映射`,
          `质变效果: ${d.questEnchantment.transformDesc}`,
        ] : []),
      ],
      files: [
        'src/src/data/affixTrigger.ts',
        'src/src/data/affixes.ts',
        'src/tests/unit/data/affixTrigger.test.ts',
      ],
    })
  }

  // Story: 子系统（拆为 3 个小 story）
  if (hasSubsystem) {
    for (const ss of subsystemDesigns) {
      const affixDesign = designs.find(d => d.id === ss.affixId || d.subsystemExpansion)
      const ssName = affixDesign?.name || ss.subsystemId
      const dedicatedCount = ss.dedicatedRelics?.length || 5
      const crossCount = ss.crossSystemRelics?.length || 0

      // Story A: 行为文件 + 全局 stat 注入
      stories.push({
        num: storyNum++,
        title: `${ss.subsystemId} 子系统基础`,
        desc: `新建 ${ss.subsystemId}RelicBehaviors.ts 行为文件（常量、getter、状态管理、生命周期），并在 skills.ts 注入全局 stat ${ss.globalStat}，适配 affixTrigger.ts 触发逻辑。`,
        ac: [
          `新建 src/src/systems/relics/${capitalize(ss.subsystemId)}RelicBehaviors.ts，参考 CritRelicBehaviors.ts 结构`,
          `导出常量（UPPER_SNAKE_CASE）、getter 函数、reset 函数`,
          `词条适配: ${ss.affixAdaptation?.after || '词条参数受全局 stat 影响'}`,
          `skills.ts TriggerContext 注入 ${ss.globalStat} 聚合`,
          `affixTrigger.ts 触发逻辑使用 ctx.${ss.globalStat}`,
          '生命周期: resetXxxWordState() + resetXxxBattleState() + initXxxBehaviors()',
        ],
        files: [
          `src/src/systems/relics/${capitalize(ss.subsystemId)}RelicBehaviors.ts (new)`,
          'src/src/systems/skills.ts',
          'src/src/data/affixTrigger.ts',
        ],
      })

      // Story B: 专属遗物数据
      stories.push({
        num: storyNum++,
        title: `${ss.subsystemId} 专属遗物`,
        desc: `在 relics.ts 中添加 ${dedicatedCount} 个 ${ssName}子系统专属遗物（2 Common + 1 Rare + 1 Epic + 1 Legendary）。`,
        ac: [
          ...( ss.dedicatedRelics || []).map(r => `${r.icon} ${r.name} [${r.rarity}]: ${r.description}`),
          `所有遗物 subsystem 字段设为 '${ss.subsystemId}'`,
          '需要 behaviorType 的遗物在行为文件中有对应实现',
        ],
        files: [
          'src/src/data/relics.ts',
          `src/src/systems/relics/${capitalize(ss.subsystemId)}RelicBehaviors.ts`,
        ],
      })

      // Story C: 跨系统遗物
      if (crossCount > 0) {
        stories.push({
          num: storyNum++,
          title: `${ss.subsystemId} 跨系统遗物`,
          desc: `在 relics.ts 中添加 ${crossCount} 个跨系统遗物，从不同维度影响 ${ss.globalStat}。在对应子系统的行为文件中添加 getter。`,
          ac: [
            ...(ss.crossSystemRelics || []).map(r => `${r.icon} ${r.name} [${r.belongsToSubsystem}]: ${r.description} (条件: ${r.condition})`),
            `每个遗物在对应子系统的 RelicBehaviors.ts 中有 getter 函数`,
            `getter 结果汇入 skills.ts 的 ${ss.globalStat} 聚合`,
          ],
          files: [
            'src/src/data/relics.ts',
            'src/src/systems/skills.ts',
          ],
        })
      }
    }
  }

  // Story: 集成测试 + 平衡验证
  stories.push({
    num: storyNum++,
    title: '集成测试与平衡验证',
    desc: '端到端测试新词条在完整触发流水线中的表现，验证数值平衡。',
    ac: [
      '新词条通过完整 Phase 1~6 触发流水线',
      '词条间协同/冲突关系符合预期',
      '商店生成含新词条的技能',
      '存档/读档正确序列化新词条参数',
      '现有测试零回归',
    ],
    files: [
      'src/tests/unit/data/affixTrigger.test.ts',
      'src/tests/unit/systems/affixTriggerOrchestrator.test.ts',
    ],
  })

  // 组装 Epic 文本
  const epicTitle = `新增词条: ${designs.map(d => d.name).join('、')}${hasSubsystem ? ` + ${subsystemNames}子系统` : ''}`
  const lines = [
    '',
    '---',
    '',
    `## Epic ${epicNum}: ${epicTitle}`,
    '',
    `**目标:** 新增 ${designs.length} 个词条（${designs.map(d => `${d.name}/${d.englishName}`).join('、')}）到词条池${hasSubsystem ? `，并将${subsystemNames}扩展为独立子系统（含遗物）` : ''}。`,
    '',
    `**依赖:** Epic 35（词条制技能系统）, Epic 41（附魔系统改造）`,
    '',
    `**架构参考:** \`data/affixes.ts\`, \`data/affixTrigger.ts\`, \`systems/modifiers/ModifierTypes.ts\`${hasSubsystem ? `, \`systems/relics/CritRelicBehaviors.ts\`（子系统遗物参考）` : ''}`,
    '',
    `**设计来源:** AI 词条设计工作流（scripts/affix-designer）`,
    '',
  ]

  for (const s of stories) {
    lines.push(`### Story ${epicNum}.${s.num}: ${s.title}`)
    lines.push('')
    lines.push(`**描述:** ${s.desc}`)
    lines.push('')
    lines.push('**验收标准:**')
    for (const ac of s.ac) {
      lines.push(`- [ ] ${ac}`)
    }
    lines.push('')
    lines.push('**技术说明:**')
    lines.push(`- 修改: ${s.files.join(', ')}`)
    lines.push('')
  }

  // 追加到 epics.md（插入到文件末尾的 "---" 和依赖图之前，或直接追加）
  const epicContent = lines.join('\n')
  appendFileSync(EPICS_FILE, epicContent, 'utf-8')

  console.log(`   ✅ Epic ${epicNum} 已追加到 docs/epics.md (${stories.length} 个 stories)`)

  return { epicNum, stories, epicTitle }
}

/** 3b. 更新 sprint-status.yaml */
function updateSprintStatus(epicNum, stories) {
  console.log(`\n📝 3b. 更新 sprint-status.yaml...`)

  const lines = [
    '',
    `  # ===== Epic ${epicNum}: 新增词条 =====`,
    `  epic-${epicNum}: in-progress`,
  ]

  for (const s of stories) {
    const storyKey = `${epicNum}-${s.num}-${toKebabCase(s.title)}`
    lines.push(`  ${storyKey}: backlog`)
  }

  lines.push(`  epic-${epicNum}-retrospective: optional`)

  // 在 Summary 行之前插入
  let content = readFileSync(SPRINT_STATUS_FILE, 'utf-8')
  const summaryIndex = content.indexOf('# Summary:')

  if (summaryIndex >= 0) {
    content = content.slice(0, summaryIndex) + lines.join('\n') + '\n\n' + content.slice(summaryIndex)
  } else {
    content += lines.join('\n') + '\n'
  }

  // 更新 Summary 计数
  content = content.replace(
    /# - Total Epics: \d+/,
    `# - Total Epics: ${epicNum}`
  )
  content = content.replace(
    /# - Total Stories: \d+/,
    (match) => {
      const oldCount = parseInt(match.match(/\d+/)[0])
      return `# - Total Stories: ${oldCount + stories.length}`
    }
  )
  content = content.replace(
    /# - Epics In-Progress: \d+/,
    (match) => {
      const oldCount = parseInt(match.match(/\d+/)[0])
      return `# - Epics In-Progress: ${oldCount + 1}`
    }
  )

  writeFileSync(SPRINT_STATUS_FILE, content, 'utf-8')
  console.log(`   ✅ sprint-status.yaml 已更新 (epic-${epicNum}, ${stories.length} stories)`)

  return stories.map(s => ({
    ...s,
    key: `${epicNum}-${s.num}-${toKebabCase(s.title)}`,
  }))
}

/** 3c. 为每个 story 创建 story 文件 */
function createStoryFiles(epicNum, stories, designs, subsystemDesigns) {
  console.log(`\n📝 3c. 创建 story 文件...`)

  const createdFiles = []

  for (const s of stories) {
    const filename = `${epicNum}-${s.num}-${toKebabCase(s.title)}.md`
    const filepath = join(STORIES_DIR, filename)

    const content = [
      `# Story ${epicNum}.${s.num}: ${s.title}`,
      '',
      'Status: ready-for-dev',
      '',
      '## Story',
      '',
      `As a 游戏开发者,`,
      `I want ${s.desc.split('。')[0]},`,
      `so that 词条池得到扩展，游戏构筑多样性增加.`,
      '',
      '## Acceptance Criteria',
      '',
      ...s.ac.map((ac, i) => `${i + 1}. ${ac}`),
      '',
      '## Tasks / Subtasks',
      '',
      ...s.ac.map((ac, i) => `- [ ] Task ${i + 1}: ${ac} (AC: #${i + 1})`),
      '',
      '## Dev Notes',
      '',
      '- 代码风格与现有词条保持一致（中文注释、camelCase 参数）',
      '- 参考现有词条实现: Crit(暴击) Phase 3, Outcast(流放) Phase 2, Splash(溅射) Phase 5',
      `- 设计数据来源: scripts/affix-designer/output/`,
      '',
      '### 词条设计数据',
      '',
      '```json',
      JSON.stringify(
        s.title.includes('子系统')
          ? subsystemDesigns?.find(ss => s.title.includes(ss.subsystemId)) || {}
          : designs.find(d => s.title.includes(d.name)) || {},
        null, 2
      ),
      '```',
      '',
      '### References',
      '',
      '- [Source: docs/design/affix-skill-system.md]',
      '- [Source: docs/epics.md#Epic ' + epicNum + ']',
      '',
      '## Dev Agent Record',
      '',
      '### Agent Model Used',
      '',
      '### Completion Notes List',
      '',
      '### File List',
      '',
    ].join('\n')

    writeFileSync(filepath, content, 'utf-8')
    createdFiles.push({ filename, filepath, story: s })
  }

  console.log(`   ✅ 已创建 ${createdFiles.length} 个 story 文件`)
  for (const f of createdFiles) {
    console.log(`      📄 ${f.filename}`)
  }

  return createdFiles
}

// ===== 代码片段提取器 =====

// ===== 代码片段提取器（按标记搜索，不依赖行号） =====

/** 读取文件全文 */
function readFile(relPath) {
  return readFileSync(join(PROJECT_ROOT, relPath), 'utf-8')
}

/**
 * 从文件内容中按标记提取片段。
 * @param src 文件全文
 * @param startMarker 起始标记（包含该行）
 * @param endMarker 结束标记（包含该行）
 * @param contextBefore 起始标记前多取几行
 */
function extractBetween(src, startMarker, endMarker, contextBefore = 0) {
  const lines = src.split('\n')
  let start = -1, end = -1
  for (let i = 0; i < lines.length; i++) {
    if (start < 0 && lines[i].includes(startMarker)) start = i
    if (start >= 0 && i > start && lines[i].includes(endMarker)) { end = i; break }
  }
  if (start < 0) return `// [标记未找到: ${startMarker}]`
  if (end < 0) end = Math.min(start + 30, lines.length - 1) // fallback: 取 30 行
  start = Math.max(0, start - contextBefore)
  return lines.slice(start, end + 1).join('\n')
}

/** 提取某标记所在行及其后 N 行 */
function extractAfter(src, marker, count = 10) {
  const lines = src.split('\n')
  const idx = lines.findIndex(l => l.includes(marker))
  if (idx < 0) return `// [标记未找到: ${marker}]`
  return lines.slice(idx, idx + count).join('\n')
}

/** 按 story 类型提取需要的精简代码片段 */
function extractSnippets(storyTitle) {
  const snippets = []

  if (storyTitle.includes('数据定义')) {
    const src = readFile('src/src/data/affixes.ts')
    const f = 'src/src/data/affixes.ts'
    snippets.push({ label: 'AffixType 枚举尾部', file: f, content: extractBetween(src, '// ── 元规则型', '}') })
    snippets.push({ label: 'AFFIX_CATEGORY_MAP 尾部', file: f, content: extractAfter(src, "[AffixType.Taboo]: 'meta_rule'", 2) })
    snippets.push({ label: 'AffixInstance 接口尾部', file: f, content: extractAfter(src, 'multiplyValue?:', 2) })
    snippets.push({ label: 'AFFIX_WEIGHT_TIERS 尾部', file: f, content: extractAfter(src, "[AffixType.Taboo]: 'high'", 2) })
    snippets.push({ label: 'AFFIX_NAMES 尾部', file: f, content: extractAfter(src, "[AffixType.Taboo]: '禁忌'", 2) })
    snippets.push({ label: 'AFFIX_DESCRIPTIONS 尾部', file: f, content: extractAfter(src, "[AffixType.Taboo]:", 3).split('\n').filter(l => l.includes('Taboo') || l.includes('}')).join('\n') || extractAfter(src, '大幅提升产出', 2) })
    snippets.push({ label: 'AFFIX_LEVEL_SCALING 尾部', file: f, content: extractAfter(src, "[AffixType.Resonance]:", 3) })
    snippets.push({ label: 'EnchantmentType 尾部', file: f, content: extractBetween(src, 'QuestMultiplyOp', 'MultiplyOperator') + '\n' + extractAfter(src, "MultiplyOperator", 2) })
    snippets.push({ label: 'QUEST_AFFIX_MAP 尾部', file: f, content: extractAfter(src, 'QuestMultiplyOp]: AffixType', 2) })
    snippets.push({ label: 'QUEST_ENCHANTMENT_DEFS 尾部', file: f, content: extractAfter(src, "QuestMultiplyOp, name: '乘算化'", 2) })
    snippets.push({ label: 'createSkillRuntimeState', file: f, content: extractBetween(src, 'export function createSkillRuntimeState', '}') })
  }

  if (storyTitle.includes('生成逻辑')) {
    const src = readFile('src/src/data/skillGeneration.ts')
    snippets.push({ label: 'rollAffixParams 完整函数', file: 'src/src/data/skillGeneration.ts', content: extractBetween(src, 'export function rollAffixParams', '}\n}') + '\n}' })
  }

  if (storyTitle.includes('触发逻辑')) {
    const src = readFile('src/src/data/affixTrigger.ts')
    const f = 'src/src/data/affixTrigger.ts'
    snippets.push({ label: 'TriggerContext 接口尾部', file: f, content: extractAfter(src, 'baseCritRate?:', 10) })
    snippets.push({ label: 'Phase 2 Outcast case（加算模板）', file: f, content: extractBetween(src, 'case AffixType.Outcast', 'break') })
    snippets.push({ label: 'Phase 2 switch 尾部 (Taboo→default)', file: f, content: extractBetween(src, 'case AffixType.Taboo', '// ── 附魔加算') })
    snippets.push({ label: 'Phase 3 Crit case（乘算模板）', file: f, content: extractBetween(src, 'case AffixType.Crit:', 'break') })
    snippets.push({ label: 'Phase 3 switch 尾部 (Multiply→default)', file: f, content: extractBetween(src, 'case AffixType.Multiply', '// ── 暴击子系统') })
    snippets.push({ label: 'Phase 3 暴击判定 + return', file: f, content: extractBetween(src, '// ── 暴击子系统', 'return { output') })
    // 附魔相关
    const afSrc = readFile('src/src/data/affixes.ts')
    const af = 'src/src/data/affixes.ts'
    snippets.push({ label: 'EnchantmentType 尾部', file: af, content: extractAfter(afSrc, "QuestMultiplyOp = 'quest_multiply_op'", 4) })
    snippets.push({ label: 'QUEST_AFFIX_MAP 尾部', file: af, content: extractAfter(afSrc, 'QuestMultiplyOp]: AffixType', 2) })
    snippets.push({ label: 'QUEST_ENCHANTMENT_DEFS 尾部', file: af, content: extractAfter(afSrc, "QuestMultiplyOp, name: '乘算化'", 2) })
  }

  if (storyTitle.includes('子系统基础')) {
    const crit = 'src/src/systems/relics/CritRelicBehaviors.ts'
    snippets.push({ label: 'CritRelicBehaviors.ts 全文（子系统模板）', file: crit, content: readFile(crit) })
    const skSrc = readFile('src/src/systems/skills.ts')
    snippets.push({ label: 'skills.ts TriggerContext + baseCritRate 注入', file: 'src/src/systems/skills.ts', content: extractBetween(skSrc, 'const ctx = {', 'consumeCritCharge') })
    const atSrc = readFile('src/src/data/affixTrigger.ts')
    snippets.push({ label: 'TriggerContext 接口', file: 'src/src/data/affixTrigger.ts', content: extractBetween(atSrc, 'export interface TriggerContext', '}') })
  }

  if (storyTitle.includes('专属遗物')) {
    const rSrc = readFile('src/src/data/relics.ts')
    snippets.push({ label: 'relics.ts 暴击遗物块（格式模板）+ 闭合', file: 'src/src/data/relics.ts', content: extractBetween(rSrc, '// ===== 暴击系统遗物', '\n}') })
  }

  if (storyTitle.includes('跨系统遗物')) {
    const rSrc = readFile('src/src/data/relics.ts')
    snippets.push({ label: 'relics.ts 暴击遗物块（格式模板）+ 闭合', file: 'src/src/data/relics.ts', content: extractBetween(rSrc, '// ===== 暴击系统遗物', '\n}') })
    const skSrc = readFile('src/src/systems/skills.ts')
    snippets.push({ label: 'skills.ts baseCritRate 注入点', file: 'src/src/systems/skills.ts', content: extractBetween(skSrc, '// §12 暴击遗物注入', 'fateCoinActive') })
  }

  return snippets
}

/** 将片段格式化为 prompt 文本 */
function formatSnippets(snippets) {
  if (!snippets.length) return ''
  const parts = snippets.map(s =>
    `### ${s.label}\n文件: \`${s.file}\`\n\`\`\`typescript\n${s.content}\n\`\`\``
  )
  return `\n## 相关源码片段（无需自行读取整个文件，基于以下代码在对应位置修改）\n\n${parts.join('\n\n')}\n`
}

/** 关键 story 后跑测试，快速验证不回归 */
function runTestCheckpoint(label) {
  console.log(`   🧪 测试检查点 (${label})...`)
  try {
    execSync(
      'npx vitest run tests/unit/data/affixes.test.ts tests/unit/data/affixTrigger.test.ts tests/unit/data/skillGeneration.test.ts --reporter=dot 2>&1',
      { cwd: join(PROJECT_ROOT, 'src'), encoding: 'utf-8', timeout: 60_000 },
    )
    console.log(`   🧪 ✅ 测试通过`)
    return true
  } catch (err) {
    const output = err.stdout || err.message || ''
    const failMatch = output.match(/(\d+) failed/)
    console.error(`   🧪 ❌ 测试失败${failMatch ? ` (${failMatch[1]} 个)` : ''}`)
    return false
  }
}

/** 判断 story 是否需要在完成后跑测试 */
function needsTestCheckpoint(title) {
  return title.includes('数据定义') || title.includes('触发逻辑') || title.includes('生成逻辑')
}

/** 3d. 用 claude CLI 逐个实现 story */
async function runDevStories(storyFiles, resumeFrom = 0, skipTest = false) {
  console.log(`\n${'='.repeat(50)}`)
  console.log('🔧 3d. 自动实现 stories (claude -p + dev-story)...')
  if (resumeFrom > 0) console.log(`   ⏩ 从第 ${resumeFrom + 1} 个 story 开始（跳过前 ${resumeFrom} 个）`)
  console.log(`${'='.repeat(50)}`)

  for (let i = 0; i < storyFiles.length; i++) {
    const f = storyFiles[i]
    const storyNum = i + 1

    // 断点续跑：跳过已完成的 story
    if (i < resumeFrom) {
      console.log(`\n   [${storyNum}/${storyFiles.length}] ⏩ 跳过 ${f.filename}`)
      continue
    }

    console.log(`\n   [${storyNum}/${storyFiles.length}] 实现 ${f.filename}...`)

    // 跳过集成测试 story（需人工）
    if (f.story.title === '集成测试与平衡验证') {
      console.log(`   ⏭️  跳过（集成测试需人工执行）`)
      continue
    }

    // 提取精简代码片段
    const snippets = extractSnippets(f.story.title)
    const snippetText = formatSnippets(snippets)
    const snippetLines = snippetText.split('\n').length
    console.log(`   📎 注入 ${snippets.length} 个代码片段 (~${snippetLines} 行)`)

    const prompt = `请实现这个 story: docs/stories/${f.filename}

请先阅读 story 文件了解验收标准和词条设计数据 JSON。
以下已提供需要修改的源码关键片段，请直接基于这些片段在对应位置修改，无需重新读取整个文件。
${snippetText}
实现要求：
- 代码风格与现有词条保持一致（中文注释、2空格缩进、camelCase）
- 在现有代码的最后一条同类条目之后、闭合符号之前插入新条目
- story 文件中的"词条设计数据" JSON 包含了完整的设计参数
- 完成后将 story 文件的 Status 改为 done，并在 Tasks 中勾选已完成项`

    try {
      execFileSync('claude', ['-p', '--dangerously-skip-permissions', '--model', 'sonnet', prompt], {
        cwd: PROJECT_ROOT,
        stdio: ['pipe', 'pipe', 'inherit'],
        timeout: 900_000, // 15 分钟
        maxBuffer: 10 * 1024 * 1024,
      })
      console.log(`   ✅ ${f.filename} 完成`)

      // 关键 story 后跑测试检查点
      if (!skipTest && needsTestCheckpoint(f.story.title)) {
        const passed = runTestCheckpoint(f.story.title)
        if (!passed) {
          console.error(`\n   ⚠️  测试失败，后续 story 可能基于错误代码。`)
          console.error(`   💡 修复后用 --resume-from ${storyNum} 继续`)
        }
      }
    } catch (err) {
      console.error(`   ❌ ${f.filename} 失败: ${err.message?.slice(0, 200)}`)
      console.error(`   💡 用 --resume-from ${storyNum} 重试此 story`)
      console.error(`   继续下一个 story...`)
    }
  }
}

/** 3e. 用 claude CLI 执行 code-review */
async function runCodeReview() {
  console.log(`\n${'='.repeat(50)}`)
  console.log('🔍 3e. 自动代码评审 (claude -p + code-review)...')
  console.log(`${'='.repeat(50)}`)

  const prompt = `请对最近的未提交变更执行对抗性代码评审。重点检查：
1. 新词条的枚举/映射表/描述是否全部同步
2. affixTrigger.ts 中的计算逻辑是否正确
3. 参数 null/undefined 是否有默认值
4. 代码风格是否与现有词条一致
5. 如有问题请直接修复

重要：只修复代码，不要执行 git commit。`

  try {
    execFileSync('claude', ['-p', '--dangerously-skip-permissions', '--model', 'sonnet', prompt], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'inherit'],
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
    })
    console.log('   ✅ 代码评审完成')
  } catch (err) {
    console.error(`   ⚠️  代码评审异常: ${err.message?.slice(0, 200)}`)
  }
}

/** 3f. git commit（不 push） */
function runCommit(epicNum, epicTitle) {
  console.log(`\n${'='.repeat(50)}`)
  console.log('📦 3f. Git commit...')
  console.log(`${'='.repeat(50)}`)

  try {
    // 查看变更（含已暂存和未暂存）
    const status = execSync('git status --short', { cwd: PROJECT_ROOT, encoding: 'utf-8' })
    const diff = execSync('git diff --name-only', { cwd: PROJECT_ROOT, encoding: 'utf-8' })
    const staged = execSync('git diff --cached --name-only', { cwd: PROJECT_ROOT, encoding: 'utf-8' })

    if (!status.trim()) {
      // 检查是否 code-review 已经 commit 了
      const lastMsg = execSync('git log -1 --format=%s', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim()
      if (lastMsg.includes('词条') || lastMsg.includes('affix') || lastMsg.includes('Epic')) {
        console.log(`   ✅ 已有 commit: "${lastMsg}"`)
        console.log('   👉 人工评审后执行: git push origin main')
        return
      }
      console.log('   ⚠️  没有变更需要提交')
      return
    }

    console.log(`   变更文件:\n${status.split('\n').filter(Boolean).map(l => `     ${l}`).join('\n')}`)

    // 添加源文件和文档
    const addPaths = ['src/src/data/', 'src/src/systems/', 'src/tests/', 'docs/stories/', 'docs/epics.md']
    for (const p of addPaths) {
      try {
        execSync(`git add ${p}`, { cwd: PROJECT_ROOT, stdio: 'pipe' })
      } catch { /* 路径可能不存在，忽略 */ }
    }

    // 提交
    const msg = `feat: Epic ${epicNum} ${epicTitle}\n\nCo-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
    execFileSync('git', ['commit', '-m', msg], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
    })

    console.log('   ✅ 已提交（未 push）')
    console.log('   👉 人工评审后执行: git push origin main')
  } catch (err) {
    console.error(`   ❌ 提交失败: ${err.message?.slice(0, 200)}`)
  }
}

// ===== 人工确认 =====

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase())
    })
  })
}

/**
 * 人工确认环节 — 展示设计结果，等待 y/n/e
 * @returns 'continue' | 'abort' | 'edit'
 */
async function waitForApproval(designs, subsystemDesigns, outputDir, autoApprove) {
  if (autoApprove) {
    console.log('\n   ⏩ --auto-approve 模式，跳过人工确认')
    return 'continue'
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log('⏸️  人工确认环节')
  console.log(`${'='.repeat(50)}`)
  console.log('\n以下词条设计将进入实现阶段:\n')

  for (const d of designs) {
    const subsystem = d.subsystemExpansion ? ' 🔄子系统' : ''
    console.log(`  ${d.icon} ${d.name}(${d.englishName}) [${d.category}]${subsystem}`)
    console.log(`     ${d.description}`)
    if (d.questEnchantment) {
      console.log(`     质变: ${d.questEnchantment.name} — ${d.questEnchantment.transformDesc}`)
    }
    console.log()
  }

  if (subsystemDesigns?.length > 0) {
    console.log('子系统遗物:')
    for (const ss of subsystemDesigns) {
      console.log(`  📦 ${ss.subsystemId} (${ss.dedicatedRelics?.length || 0} 专属 + ${ss.crossSystemRelics?.length || 0} 跨系统)`)
      for (const r of (ss.dedicatedRelics || [])) {
        console.log(`     ${r.icon} ${r.name} [${r.rarity}] — ${r.description}`)
      }
    }
    console.log()
  }

  console.log(`完整设计数据: ${outputDir}`)
  console.log()

  const answer = await ask('继续实现? (y)确认 / (n)中止 / (e)导出设计后中止: ')

  if (answer === 'y' || answer === 'yes') return 'continue'
  if (answer === 'e' || answer === 'export') return 'edit'
  return 'abort'
}

// ===== 工具函数 =====

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function toKebabCase(str) {
  // 先做完整匹配，再做部分匹配
  const map = {
    '词条数据定义': 'affix-data-definition',
    '词条生成逻辑': 'affix-generation',
    '子系统基础': 'subsystem-base',
    '专属遗物': 'dedicated-relics',
    '跨系统遗物': 'cross-system-relics',
    '集成测试与平衡验证': 'integration-test',
    '词条触发逻辑': 'affix-trigger',
  }
  // 先替换已知的中文短语
  let result = str
  for (const [cn, en] of Object.entries(map)) {
    result = result.replace(cn, en)
  }
  // 剩余中文字符直接删除（词条名如"疾速"不需要出现在文件名中，因为前面已有英文 ID）
  return result
    .replace(/[\u4e00-\u9fff]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

// ===== 主流程 =====

async function main() {
  const opts = parseArgs()
  const client = createClient()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  console.log('\n🎮 AI 词条批量设计工作流')
  console.log(`   数量: ${opts.count}, 类别: ${opts.category || '不限'}, 主题: ${opts.theme || '不限'}`)
  console.log(`   模型: ${opts.model}`)
  console.log(`   子系统评估: ${opts.noSubsystem ? '跳过' : '启用'}`)
  console.log(`   BMAD 工作流: ${opts.noBmad ? '跳过' : '启用'}`)

  let designs = null
  let reviews = null
  let subsystemDesigns = []

  // ══════════════════════════════════════════
  // Phase 1: 设计
  // ══════════════════════════════════════════
  if (opts.fromFile) {
    console.log(`\n📂 从文件加载设计: ${opts.fromFile}`)
    const raw = readFileSync(opts.fromFile, 'utf-8')
    designs = parseJSON(raw, '设计文件')
    if (!Array.isArray(designs)) {
      if (designs.revisedDesigns) designs = designs.revisedDesigns
      else { console.error('文件格式不正确'); process.exit(1) }
    }
  } else {
    const designPrompt = buildDesignPrompt({
      count: opts.count,
      category: opts.category,
      theme: opts.theme,
    })
    const designRaw = await callClaude(client, designPrompt, 'Phase 1: 设计新词条', opts.model)
    designs = parseJSON(designRaw, 'Phase 1')
    saveOutput(timestamp, 'design.json', designs)

    console.log('\n📋 设计结果预览:')
    for (const d of designs) {
      console.log(`   ${d.icon} ${d.name}(${d.englishName}) [${d.category}] — ${d.description}`)
    }
  }

  if (opts.designOnly) {
    saveOutput(timestamp, 'summary.md', '# 设计阶段完成\n\n' + JSON.stringify(designs, null, 2))
    console.log('\n✅ 设计阶段完成（--design-only 模式）')
    return
  }

  // ══════════════════════════════════════════
  // Phase 2: 评审（含子系统评估）
  // ══════════════════════════════════════════
  if (!opts.skipReview) {
    const reviewPrompt = buildReviewPrompt(designs)
    const reviewRaw = await callClaude(client, reviewPrompt, 'Phase 2: 对抗性评审 + 子系统评估', opts.model)
    reviews = parseJSON(reviewRaw, 'Phase 2')
    saveOutput(timestamp, 'review.json', reviews)

    console.log('\n📋 评审结果:')
    for (const r of (reviews.reviews || [])) {
      const verdictIcon = r.verdict === 'approve' ? '✅' : r.verdict === 'revise' ? '🔧' : '❌'
      console.log(`   ${verdictIcon} ${r.id}: ${r.verdict} (${r.score}/10)`)
      for (const issue of (r.issues || [])) {
        console.log(`      [${issue.severity}] ${issue.description}`)
      }
      if (r.subsystemEval?.canExpand) {
        console.log(`      🔄 可扩展为子系统 [${r.subsystemEval.confidence}]: ${r.subsystemEval.globalStat}`)
      }
    }
    console.log(`   💬 ${reviews.overallFeedback}`)

    if (reviews.revisedDesigns?.length) {
      designs = reviews.revisedDesigns
      console.log(`\n   📝 修正后保留 ${designs.length} 个词条`)
    }
  }

  if (!designs || designs.length === 0) {
    console.log('\n❌ 所有词条被拒绝，工作流结束')
    return
  }

  // ══════════════════════════════════════════
  // Phase 2b: 子系统遗物设计
  // ══════════════════════════════════════════
  const subsystemCandidates = designs.filter(d => d.subsystemExpansion)

  if (!opts.noSubsystem && subsystemCandidates.length > 0) {
    console.log(`\n🔄 发现 ${subsystemCandidates.length} 个词条适合扩展为子系统`)

    const relicPromises = subsystemCandidates.map(async (affixDesign) => {
      const prompt = buildSubsystemRelicPrompt(affixDesign)
      const raw = await callClaude(
        client, prompt,
        `Phase 2b: 为「${affixDesign.name}」设计子系统遗物`,
        opts.model,
      )
      return parseJSON(raw, `Phase 2b (${affixDesign.id})`)
    })

    subsystemDesigns = await Promise.all(relicPromises)
    saveOutput(timestamp, 'subsystem-relics.json', subsystemDesigns)

    console.log('\n📋 子系统遗物:')
    for (const ss of subsystemDesigns) {
      console.log(`   📦 ${ss.subsystemId}: ${ss.dedicatedRelics?.length || 0} 专属 + ${ss.crossSystemRelics?.length || 0} 跨系统`)
    }
  }

  // ══════════════════════════════════════════
  // 人工确认
  // ══════════════════════════════════════════
  const approval = await waitForApproval(designs, subsystemDesigns, OUTPUT_DIR, opts.autoApprove)

  if (approval === 'abort') {
    console.log('\n🛑 已中止')
    process.exit(0)
  }
  if (approval === 'edit') {
    saveOutput(timestamp, 'designs-for-edit.json', designs)
    if (subsystemDesigns.length > 0) saveOutput(timestamp, 'subsystems-for-edit.json', subsystemDesigns)
    console.log('\n📤 设计已导出，修改后用 --from-file 继续:')
    console.log(`   node run.mjs --from-file output/${timestamp}-designs-for-edit.json`)
    process.exit(0)
  }

  // ══════════════════════════════════════════
  // Phase 3: BMAD 工作流
  // ══════════════════════════════════════════
  if (opts.noBmad) {
    // 不走 BMAD，直接生成实现代码（旧模式）
    const { buildImplementPrompt } = await import('./prompts.mjs')
    const implPrompt = buildImplementPrompt(designs, subsystemDesigns.length > 0 ? subsystemDesigns : null)
    const implRaw = await callClaude(client, implPrompt, 'Phase 3: 生成实现代码', opts.model)
    const implementations = parseJSON(implRaw, 'Phase 3')
    saveOutput(timestamp, 'implement.json', implementations)
    console.log('\n✅ 工作流完成（--no-bmad 模式，代码已生成到 output/）')
    return
  }

  // ── 3a. 写 Epic ──
  const epicNum = getNextEpicNumber()
  const { stories, epicTitle } = writeEpic(epicNum, designs, subsystemDesigns)

  // ── 3b. 更新 sprint-status ──
  const storiesWithKeys = updateSprintStatus(epicNum, stories)

  // ── 3c. 创建 story 文件 ──
  const storyFiles = createStoryFiles(epicNum, stories, designs, subsystemDesigns)

  // ── 保存完整设计数据到 output（供 dev-story 参考） ──
  saveOutput(timestamp, 'full-context.json', {
    designs,
    reviews,
    subsystemDesigns,
    epicNum,
    epicTitle,
    stories: storiesWithKeys,
  })

  // ── 3d. 自动实现 stories ──
  await runDevStories(storyFiles, opts.resumeFrom, opts.noTest)

  // ── 3e. 自动代码评审 ──
  await runCodeReview()

  // ── 3f. 自动提交 ──
  runCommit(epicNum, epicTitle)

  // ── 统计 ──
  const totalRelics = subsystemDesigns.reduce((sum, ss) =>
    sum + (ss.dedicatedRelics?.length || 0) + (ss.crossSystemRelics?.length || 0), 0)

  console.log(`\n${'='.repeat(50)}`)
  console.log('🎉 工作流全部完成！')
  console.log(`   Epic ${epicNum}: ${epicTitle}`)
  console.log(`   词条: ${designs.length} 个`)
  console.log(`   子系统: ${subsystemDesigns.length} 个`)
  if (totalRelics > 0) console.log(`   遗物: ${totalRelics} 个`)
  console.log(`   Stories: ${stories.length} 个`)
  console.log(``)
  console.log(`   📦 已 commit，等待人工评审后 push:`)
  console.log(`   git push origin main`)
  console.log(`${'='.repeat(50)}`)
}

main().catch(err => {
  console.error('\n❌ 错误:', err.message)
  if (err.status === 401) console.error('   API Key 无效，请检查 ANTHROPIC_API_KEY')
  process.exit(1)
})
