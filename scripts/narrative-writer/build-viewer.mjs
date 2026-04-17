#!/usr/bin/env node

/**
 * Build an HTML viewer for all generated narrative content.
 * Usage: node build-viewer.mjs
 * Output: output/narrative-viewer.html
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const OUTPUT_DIR = join(import.meta.dirname, 'output')
const NARRATIVE_DIR = join(import.meta.dirname, '..', '..', 'src', 'src', 'data', 'narrative')

// Load hand-written .ts modules (strip TS syntax, eval as JS)
function loadHandwrittenModule(name) {
  const filepath = join(NARRATIVE_DIR, `${name}.ts`)
  try {
    let content = readFileSync(filepath, 'utf-8')
    // Extract all exported const values
    const exports = {}
    const re = /export\s+const\s+(\w+)\s*(?::\s*\w+(?:\[\])?)?\s*=\s*([\s\S]*?)\s+as\s+const/g
    let match
    while ((match = re.exec(content)) !== null) {
      try {
        exports[match[1]] = new Function(`return ${match[2]}`)()
      } catch { /* skip unparseable */ }
    }
    return exports
  } catch { return {} }
}

// Collect all raw JSON files, take the latest per type
function collectLatestData() {
  const files = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('-raw.json')).sort().reverse()
  const latest = {}
  for (const f of files) {
    const match = f.match(/\d{4}-\d{2}-\d{2}T[\d-]+-(\w+)-raw\.json/)
    if (!match) continue
    const type = match[1]
    if (!latest[type]) latest[type] = f
  }

  const data = {}
  for (const [type, file] of Object.entries(latest)) {
    try {
      data[type] = JSON.parse(readFileSync(join(OUTPUT_DIR, file), 'utf-8'))
      console.log(`  ${type}: ${data[type].length} 条 (${file})`)
    } catch { /* skip */ }
  }
  return data
}

function escapeHtml(s) {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatText(text) {
  if (!text) return ''
  return escapeHtml(text).replace(/\\n/g, '<br>').replace(/\n/g, '<br>')
}

function buildHtml(data) {
  // Group relics by objectId with both voices
  const relicMap = {}
  for (const r of (data.relic || [])) {
    const id = r._objectId
    if (!relicMap[id]) relicMap[id] = {}
    relicMap[id][r._voice] = r
  }

  // Affixes
  const affixes = data.affix || []

  // Boss modifiers grouped
  const bossMap = {}
  for (const b of (data.bossModifier || [])) {
    const id = b._objectId
    if (!bossMap[id]) bossMap[id] = {}
    bossMap[id][b._voice] = b
  }

  // Classes grouped
  const classMap = {}
  for (const c of (data.class || [])) {
    const id = c._objectId
    if (!classMap[id]) classMap[id] = {}
    classMap[id][c._voice] = c
  }

  // Scriptor notes
  const scriptorNotes = data.scriptorNotes || []

  // Altar & shopnote
  const altars = data.altar || []
  const shopnotes = data.shopnote || []

  // Hand-written modules (imported from .ts data files)
  const runLines = loadHandwrittenModule('run-lines')
  const ritual = loadHandwrittenModule('ritual')
  const tutorial = loadHandwrittenModule('tutorial')

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>活字大教堂 · Narrative Content Viewer</title>
<style>
  :root {
    --bg: #1a1a1e;
    --bg2: #232328;
    --bg3: #2c2c32;
    --text: #d4d0c8;
    --text-dim: #8a8680;
    --gold: #c8a84e;
    --blue: #4d9be6;
    --green: #1ebc73;
    --purple: #905ea9;
    --red: #c84e4e;
    --orange: #d49545;
    --bell: #c8a84e;
    --doc: #6a8fa8;
    --altar: #7a9a6a;
    --note: #a89070;
    --border: #3a3a40;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Noto Serif SC', serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    padding: 2rem;
    max-width: 1100px;
    margin: 0 auto;
  }
  h1 {
    font-size: 1.8rem;
    color: var(--gold);
    text-align: center;
    margin-bottom: 0.3rem;
    letter-spacing: 0.15em;
  }
  .subtitle {
    text-align: center;
    color: var(--text-dim);
    font-size: 0.9rem;
    margin-bottom: 2rem;
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  .stat {
    text-align: center;
    padding: 0.8rem 1.5rem;
    background: var(--bg2);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .stat-num { font-size: 1.8rem; color: var(--gold); font-weight: bold; }
  .stat-label { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 2px solid var(--border);
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .tab {
    padding: 0.6rem 1.2rem;
    cursor: pointer;
    color: var(--text-dim);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--gold); border-bottom-color: var(--gold); }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Cards */
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1rem;
    overflow: hidden;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1.2rem;
    background: var(--bg3);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }
  .card-header:hover { background: #333338; }
  .card-title { font-size: 1rem; color: var(--gold); }
  .card-subtitle { font-size: 0.8rem; color: var(--text-dim); }
  .card-id { font-size: 0.7rem; color: var(--text-dim); font-family: monospace; }
  .card-body { padding: 1rem 1.2rem; display: none; }
  .card.open .card-body { display: block; }

  /* Voice sections */
  .voice {
    margin-bottom: 1rem;
    padding: 0.8rem 1rem;
    border-left: 3px solid var(--border);
    background: rgba(0,0,0,0.15);
    border-radius: 0 4px 4px 0;
  }
  .voice-bell { border-left-color: var(--bell); }
  .voice-doc { border-left-color: var(--doc); }
  .voice-altar { border-left-color: var(--altar); }
  .voice-note { border-left-color: var(--note); }
  .voice-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.4rem;
  }
  .voice-bell .voice-label { color: var(--bell); }
  .voice-doc .voice-label { color: var(--doc); }
  .voice-altar .voice-label { color: var(--altar); }
  .voice-note .voice-label { color: var(--note); }

  .zh { font-size: 0.95rem; margin-bottom: 0.5rem; }
  .en { font-size: 0.85rem; color: var(--text-dim); font-style: italic; }
  .sigil-name {
    display: inline-block;
    background: rgba(200,168,78,0.15);
    color: var(--gold);
    padding: 0.1rem 0.5rem;
    border-radius: 3px;
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
  }

  /* Doc voice special formatting */
  .doc-text {
    font-family: 'Courier New', 'Source Code Pro', monospace;
    font-size: 0.82rem;
    line-height: 1.6;
    white-space: pre-wrap;
    color: var(--doc);
  }
  .doc-text-en {
    font-family: 'Courier New', 'Source Code Pro', monospace;
    font-size: 0.78rem;
    line-height: 1.5;
    white-space: pre-wrap;
    color: #5a7f98;
  }

  /* Search */
  .search-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .search-bar input {
    flex: 1;
    padding: 0.6rem 1rem;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 0.9rem;
    outline: none;
  }
  .search-bar input:focus { border-color: var(--gold); }
  .search-bar input::placeholder { color: var(--text-dim); }

  .hidden { display: none !important; }

  /* Altar special */
  .altar-source {
    font-size: 0.7rem;
    color: var(--text-dim);
    background: rgba(122,154,106,0.15);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    margin-right: 0.5rem;
  }
</style>
</head>
<body>

<h1>活字大教堂 · 叙事内容总览</h1>
<p class="subtitle">The Ironpress Cathedral — Narrative Content Viewer</p>

<div class="stats">
  <div class="stat"><div class="stat-num">${Object.keys(relicMap).length}</div><div class="stat-label">圣器 Relics</div></div>
  <div class="stat"><div class="stat-num">${affixes.length}</div><div class="stat-label">圣印 Sigils</div></div>
  <div class="stat"><div class="stat-num">${Object.keys(bossMap).length}</div><div class="stat-label">残余异文 Boss</div></div>
  <div class="stat"><div class="stat-num">${Object.keys(classMap).length}</div><div class="stat-label">誓门 Classes</div></div>
  <div class="stat"><div class="stat-num">${altars.length + shopnotes.length}</div><div class="stat-label">嘟囔+批注</div></div>
  <div class="stat"><div class="stat-num">${scriptorNotes.length}</div><div class="stat-label">守卷人笔记</div></div>
  <div class="stat"><div class="stat-num">${Object.values(runLines).flat().length + Object.values(ritual).flat().length}</div><div class="stat-label">格言+仪式</div></div>
</div>

<div class="search-bar">
  <input type="text" id="search" placeholder="搜索 ID、名称、内容..." oninput="filterCards(this.value)">
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('relics')">圣器 (${Object.keys(relicMap).length})</div>
  <div class="tab" onclick="switchTab('sigils')">圣印 (${affixes.length})</div>
  <div class="tab" onclick="switchTab('boss')">残余异文 (${Object.keys(bossMap).length})</div>
  <div class="tab" onclick="switchTab('classes')">誓门 (${Object.keys(classMap).length})</div>
  <div class="tab" onclick="switchTab('misc')">嘟囔+批注 (${altars.length + shopnotes.length})</div>
  <div class="tab" onclick="switchTab('scriptor')">守卷人笔记 (${scriptorNotes.length})</div>
  <div class="tab" onclick="switchTab('runlines')">格言</div>
  <div class="tab" onclick="switchTab('ritual')">铭封祈礼</div>
  <div class="tab" onclick="switchTab('tutorial')">初誓须知</div>
</div>

<!-- RELICS -->
<div id="tab-relics" class="tab-content active">
${Object.entries(relicMap).map(([id, voices]) => {
  const bell = voices.bell || {}
  const doc = voices.doc || {}
  return `<div class="card" data-search="${escapeHtml((bell.name_zh||'') + ' ' + (bell.name_en||'') + ' ' + id + ' ' + (bell.text_zh||'') + ' ' + (doc.text_zh||''))}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <div>
      <span class="card-title">${escapeHtml(bell.name_zh || id)}</span>
      <span class="card-subtitle">${escapeHtml(bell.name_en || '')}</span>
    </div>
    <span class="card-id">${escapeHtml(id)}</span>
  </div>
  <div class="card-body">
    ${bell.text_zh ? `<div class="voice voice-bell">
      <div class="voice-label">🔔 圣键启示录</div>
      <div class="zh">${formatText(bell.text_zh)}</div>
      <div class="en">${formatText(bell.text_en)}</div>
    </div>` : ''}
    ${doc.text_zh ? `<div class="voice voice-doc">
      <div class="voice-label">📄 祷文引擎档案</div>
      <div class="doc-text">${formatText(doc.text_zh)}</div>
      <div class="doc-text-en">${formatText(doc.text_en)}</div>
    </div>` : ''}
  </div>
</div>`
}).join('\n')}
</div>

<!-- SIGILS -->
<div id="tab-sigils" class="tab-content">
${affixes.map(a => {
  const sigilZh = a.sigil_name_zh || a.name_zh?.replace('圣印 · ', '') || ''
  const sigilEn = a.sigil_name_en || a.name_en?.replace(/Sigil of (the )?/, '') || ''
  return `<div class="card" data-search="${escapeHtml(sigilZh + ' ' + sigilEn + ' ' + a._objectId + ' ' + (a.text_zh||'') + ' ' + (a.canon||''))}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <div>
      <span class="sigil-name">${escapeHtml(sigilZh)}</span>
      <span class="card-subtitle">${escapeHtml(sigilEn)}</span>
      ${a.canon ? `<span class="card-subtitle" style="margin-left:0.5rem;color:var(--purple)">— ${escapeHtml(a.canon)}</span>` : ''}
    </div>
    <span class="card-id">${escapeHtml(a._objectId)}</span>
  </div>
  <div class="card-body">
    <div class="voice voice-bell">
      <div class="voice-label">🔔 圣印 · ${escapeHtml(sigilZh)} / Sigil of ${escapeHtml(sigilEn)}</div>
      <div class="zh">${formatText(a.text_zh)}</div>
      <div class="en">${formatText(a.text_en)}</div>
    </div>
  </div>
</div>`
}).join('\n')}
</div>

<!-- BOSS -->
<div id="tab-boss" class="tab-content">
${Object.entries(bossMap).map(([id, voices]) => {
  const bell = voices.bell || {}
  const doc = voices.doc || {}
  return `<div class="card" data-search="${escapeHtml((bell.name_zh||'') + ' ' + id + ' ' + (bell.text_zh||'') + ' ' + (doc.text_zh||''))}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <div>
      <span class="card-title">${escapeHtml(bell.name_zh || id)}</span>
      <span class="card-subtitle">${escapeHtml(bell.name_en || '')}</span>
    </div>
    <span class="card-id">${escapeHtml(id)}</span>
  </div>
  <div class="card-body">
    ${bell.text_zh ? `<div class="voice voice-bell">
      <div class="voice-label">🔔 HUD 角标</div>
      <div class="zh">${formatText(bell.text_zh)}</div>
      <div class="en">${formatText(bell.text_en)}</div>
    </div>` : ''}
    ${doc.text_zh ? `<div class="voice voice-doc">
      <div class="voice-label">📄 Codex 详情</div>
      <div class="doc-text">${formatText(doc.text_zh)}</div>
      <div class="doc-text-en">${formatText(doc.text_en)}</div>
    </div>` : ''}
  </div>
</div>`
}).join('\n')}
</div>

<!-- CLASSES -->
<div id="tab-classes" class="tab-content">
${Object.entries(classMap).map(([id, voices]) => {
  const bell = voices.bell || {}
  const doc = voices.doc || {}
  return `<div class="card" data-search="${escapeHtml((bell.name_zh||'') + ' ' + id + ' ' + (bell.text_zh||''))}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <div>
      <span class="card-title">${escapeHtml(bell.name_zh || id)}</span>
      <span class="card-subtitle">${escapeHtml(bell.name_en || '')}</span>
    </div>
    <span class="card-id">${escapeHtml(id)}</span>
  </div>
  <div class="card-body">
    ${bell.text_zh ? `<div class="voice voice-bell">
      <div class="voice-label">🔔 誓门宣言</div>
      <div class="zh">${formatText(bell.text_zh)}</div>
      <div class="en">${formatText(bell.text_en)}</div>
    </div>` : ''}
    ${doc.text_zh ? `<div class="voice voice-doc">
      <div class="voice-label">📄 誓门档案</div>
      <div class="doc-text">${formatText(doc.text_zh)}</div>
      <div class="doc-text-en">${formatText(doc.text_en)}</div>
    </div>` : ''}
  </div>
</div>`
}).join('\n')}
</div>

<!-- MISC -->
<div id="tab-misc" class="tab-content">
${altars.length > 0 ? `<h3 style="color:var(--altar);margin-bottom:1rem">🔧 铅字圣坛的嘟囔</h3>
${altars.map(a => `<div class="card open" data-search="${escapeHtml((a.text_zh||'') + ' ' + (a.source||''))}">
  <div class="card-body" style="display:block">
    <div class="voice voice-altar">
      <span class="altar-source">${escapeHtml(a.source || '')}</span>
      <span class="zh">${formatText(a.text_zh)}</span>
      <div class="en">${formatText(a.text_en)}</div>
    </div>
  </div>
</div>`).join('\n')}` : ''}

${shopnotes.length > 0 ? `<h3 style="color:var(--note);margin:1.5rem 0 1rem">✏️ 商店批注</h3>
${shopnotes.map(n => `<div class="card open" data-search="${escapeHtml(n.text_zh||'')}">
  <div class="card-body" style="display:block">
    <div class="voice voice-note">
      <span class="zh">${formatText(n.text_zh)}</span>
      <div class="en">${formatText(n.text_en)}</div>
    </div>
  </div>
</div>`).join('\n')}` : ''}
</div>

<!-- SCRIPTOR NOTES -->
<div id="tab-scriptor" class="tab-content">
${scriptorNotes.map(n => {
  const scriptor = n._objectId || n.id || ''
  const label = scriptor.startsWith('scriptor_a') ? '守卷人 A · 模范生'
    : scriptor.startsWith('scriptor_b') ? '守卷人 B · 怀疑者'
    : scriptor.startsWith('scriptor_c') ? '守卷人 C · 快乐的'
    : scriptor
  return `<div class="card" data-search="${escapeHtml(scriptor + ' ' + (n.text_zh||''))}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="card-title">${escapeHtml(label)}</span>
    <span class="card-id">${escapeHtml(scriptor)}</span>
  </div>
  <div class="card-body">
    <div class="voice voice-doc">
      <div class="doc-text">${formatText(n.text_zh)}</div>
      <div class="doc-text-en">${formatText(n.text_en)}</div>
    </div>
  </div>
</div>`
}).join('\n')}
</div>

<!-- RUN LINES -->
<div id="tab-runlines" class="tab-content">
${(() => {
  const sections = []
  // Run opening by pool
  const opening = runLines.RUN_OPENING || {}
  for (const [pool, lines] of Object.entries(opening)) {
    const poolLabel = pool === 'none' ? '消耗品（无誓门）' : pool === 'wordsmith' ? '铭刻派' : pool === 'metamorph' ? '熔变派' : pool
    sections.push(`<h3 style="color:var(--bell);margin:1rem 0 0.5rem">🔔 Run 开场 · ${escapeHtml(poolLabel)}</h3>`)
    for (const l of (Array.isArray(lines) ? lines : [])) {
      sections.push(`<div class="card open" data-search="${escapeHtml(l.text_zh||'')}"><div class="card-body" style="display:block"><div class="voice voice-bell"><span class="zh">${escapeHtml(l.text_zh||'')}</span><div class="en">${escapeHtml(l.text_en||'')}</div></div></div></div>`)
    }
  }
  // Boss entrance
  const boss = runLines.BOSS_ENTRANCE || []
  if (boss.length) {
    sections.push(`<h3 style="color:var(--bell);margin:1.5rem 0 0.5rem">🔔 Boss 登场</h3>`)
    for (const l of boss) sections.push(`<div class="card open" data-search="${escapeHtml(l.text_zh||'')}"><div class="card-body" style="display:block"><div class="voice voice-bell"><span class="zh">${escapeHtml(l.text_zh||'')}</span><div class="en">${escapeHtml(l.text_en||'')}</div></div></div></div>`)
  }
  // Failure
  const fail = runLines.RUN_FAILURE || []
  if (fail.length) {
    sections.push(`<h3 style="color:var(--red);margin:1.5rem 0 0.5rem">🔔 Run 失败</h3>`)
    for (const l of fail) sections.push(`<div class="card open" data-search="${escapeHtml(l.text_zh||'')}"><div class="card-body" style="display:block"><div class="voice voice-bell"><span class="zh">${escapeHtml(l.text_zh||'')}</span><div class="en">${escapeHtml(l.text_en||'')}</div></div></div></div>`)
  }
  // Victory
  const win = runLines.RUN_VICTORY || []
  if (win.length) {
    sections.push(`<h3 style="color:var(--gold);margin:1.5rem 0 0.5rem">🔔 Run 胜利（静音 3 秒后）</h3>`)
    for (const l of win) sections.push(`<div class="card open" data-search="${escapeHtml(l.text_zh||'')}"><div class="card-body" style="display:block"><div class="voice voice-bell"><span class="zh">${escapeHtml(l.text_zh||'')}</span><div class="en">${escapeHtml(l.text_en||'')}</div></div></div></div>`)
  }
  return sections.join('\n')
})()}
</div>

<!-- RITUAL -->
<div id="tab-ritual" class="tab-content">
${(() => {
  const sections = []
  // Entrance lines
  const entrance = ritual.RITUAL_ENTRANCE || []
  if (entrance.length) {
    sections.push(`<h3 style="color:var(--bell);margin:1rem 0 0.5rem">🔔 入场格言</h3>`)
    for (const l of entrance) sections.push(`<div class="card open" data-search="${escapeHtml(l.text_zh||'')}"><div class="card-body" style="display:block"><div class="voice voice-bell"><span class="zh">${escapeHtml(l.text_zh||'')}</span><div class="en">${escapeHtml(l.text_en||'')}</div></div></div></div>`)
  }
  // Options
  const options = ritual.RITUAL_OPTIONS || {}
  for (const [key, opt] of Object.entries(options)) {
    const label = key === 'elevate' ? '晋铸（升级技能）' : key === 'consecrate' ? '临时祝圣（临时增益）' : key === 'wordsmith' ? '铭刻派专属' : key === 'metamorph' ? '熔变派专属' : key === 'none' ? '无誓门专属' : key
    sections.push(`<h3 style="color:var(--purple);margin:1.5rem 0 0.5rem">⚗️ ${escapeHtml(label)}</h3>`)
    for (const l of (opt.lines || [])) {
      sections.push(`<div class="card open" data-search="${escapeHtml((l.desc_zh||'') + ' ' + (l.response_zh||''))}"><div class="card-body" style="display:block"><div class="voice voice-bell"><div class="zh">${escapeHtml(l.desc_zh||'')}</div><div class="en" style="margin-bottom:0.5rem">${escapeHtml(l.desc_en||'')}</div><div style="color:var(--gold);font-size:0.85rem">→ ${escapeHtml(l.response_zh||'')} / ${escapeHtml(l.response_en||'')}</div></div></div></div>`)
    }
  }
  return sections.join('\n')
})()}
</div>

<!-- TUTORIAL -->
<div id="tab-tutorial" class="tab-content">
${(() => {
  const modules = tutorial.TUTORIAL_MODULES || []
  return modules.map(m => `
<div class="card" data-search="${escapeHtml(m.title_zh + ' ' + m.id)}">
  <div class="card-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="card-title">${escapeHtml(m.title_zh)}</span>
    <span class="card-subtitle">${escapeHtml(m.title_en)}</span>
  </div>
  <div class="card-body">
    ${m.lines.map(l => `
    <div style="display:flex;gap:1rem;margin-bottom:1rem;padding:0.5rem;background:rgba(0,0,0,0.2);border-radius:4px">
      <div style="flex:1">
        <div class="voice voice-doc" style="margin-bottom:0">
          <div class="voice-label">📄 正文</div>
          <div class="zh">${escapeHtml(l.body_zh)}</div>
          <div class="en">${escapeHtml(l.body_en)}</div>
        </div>
      </div>
      ${l.margin_zh ? `<div style="flex:0 0 120px">
        <div class="voice voice-note" style="margin-bottom:0">
          <div class="voice-label">✏️ 页边注</div>
          <div class="zh" style="font-style:italic">${escapeHtml(l.margin_zh)}</div>
          <div class="en" style="font-style:italic">${escapeHtml(l.margin_en||'')}</div>
        </div>
      </div>` : ''}
    </div>`).join('')}
    <div style="margin-top:0.5rem;padding:0.5rem;border-top:1px solid var(--border);color:var(--text-dim);font-size:0.8rem">
      ${escapeHtml(m.footer_zh)}<br>
      <span style="color:#5a7f98">${escapeHtml(m.footer_en)}</span>
    </div>
  </div>
</div>`).join('\n')
})()}
</div>

<script>
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
  event.target.classList.add('active')
  document.getElementById('tab-' + name).classList.add('active')
}

function filterCards(query) {
  const q = query.toLowerCase()
  document.querySelectorAll('.card[data-search]').forEach(card => {
    const match = !q || card.dataset.search.toLowerCase().includes(q)
    card.classList.toggle('hidden', !match)
  })
}
</script>

<div style="text-align:center;margin-top:3rem;color:var(--text-dim);font-size:0.75rem">
  Generated by 活字大教堂 Narrative Pipeline · ${new Date().toISOString().split('T')[0]}
</div>

</body>
</html>`
}

// Main
console.log('收集生成数据...')
const data = collectLatestData()
console.log('\n构建 HTML...')
const html = buildHtml(data)
const outPath = join(OUTPUT_DIR, 'narrative-viewer.html')
writeFileSync(outPath, html, 'utf-8')
console.log(`\n✅ 已生成: output/narrative-viewer.html (${(html.length / 1024).toFixed(0)}KB)`)
console.log('   用浏览器打开即可浏览')
