// Auto-derived from docs/narrative-design.md v4.1-late §2.6 sticker visual design
// (LOCKED 2026-05-05)
//
// MOKO 贴纸 visual system · 完全原创（借鉴 Yerkish 设计概念但全自创）
//
// 双层信息架构：
//   - player_facing: glyph + color + GLOSS  (玩家可见)
//   - internal: section_ref + species_id + protocol_metadata  (codex L3-L4 才显化)
//
// 内部 §编号 / NCBI 元数据**待定**保留度——当前默认 fictional化（"非人类输入模型组 §M-XXX"
// 替代 specific NCBI Taxonomy IDs）。可在 production decision 阶段切换到 specific public-domain
// references（NCBI IDs / Linnean names）若 lore 深度需要。
//
// MOKO 协议 historical lineage（§5.4.1 LOCKED）：
//   [1] 1960s-70s · Manual ASL 训练（Washoe / Nim 等 · 无 attribution 颗粒度）
//   [2] 1971+ · Lexigram Keyboard（LANA 等 · 每键 = 1 fixed lexigram · per-keystroke attribution）
//   [3] 1990s+ · MOKO Modular Sticker Keyboard（标准 typewriter + 可重配置 stickers ·
//                                                per-keystroke + per-config attribution）
//
// MOKO Modular innovation 的 horror gain：
//   - LANA chimp = 被动 lexigram-emitter（不能改配置）
//   - MOKO worker = 主动配置自己 attribution profile 的 lexigram-emitter
//   - 演化方向是 attribution 颗粒度，不是玩家赋权
//   - 玩家"配 build" = 一次 administrative 重配置 record，M5 firewall 收益最大

// ─── 7 类目色码（archive-aged 旧气调 · 与 D13 美学契合）───

export const MOKO_COLORS = [
  { name: 'Bone',   hex: '#E8DDB9', semantic: '增量 / 肯定',  clade: 'Numeric',     affix_count: 4  },
  { name: 'Slate',  hex: '#4A5568', semantic: '动作 / 主张',  clade: 'Crit',        affix_count: 5  },
  { name: 'Mauve',  hex: '#735C77', semantic: '群体 / 社群',  clade: 'Stack',       affix_count: 7  },
  { name: 'Olive',  hex: '#6B7044', semantic: '操作 / 工具',  clade: 'Topology',    affix_count: 8  },
  { name: 'Sienna', hex: '#8B5A3C', semantic: '位置 / 位移',  clade: 'Word_sense',  affix_count: 15 },
  { name: 'Ochre',  hex: '#C68B41', semantic: '调节 / 否定',  clade: 'Meta_rule',   affix_count: 17 },
  { name: 'Amber',  hex: '#B8763E', semantic: '食用 / 资源',  clade: 'Production',  affix_count: 3  },
]

// ─── 6 自创基本几何元素 ───
//
// 与 Yerkish 9 元素区别：数量不同 / 形态不同 / 组合规则不同。
// 视觉气质 = 老打字机 + 老印章美学；可在打字机上敲出的复合字符 / 印章风格。

export const MOKO_GLYPH_ELEMENTS = [
  { id: 'slash',    char: '/', semantic: 'motion (动作 / 移位)' },
  { id: 'line',     char: '−', semantic: 'boundary (边界 / 限定)' },
  { id: 'ring',     char: '○', semantic: 'containment (容器 / 包含)' },
  { id: 'dot',      char: '•', semantic: 'target (目标 / 锁定)' },
  { id: 'pillar',   char: '⊥', semantic: 'anchor (锚定 / 垂)' },
  { id: 'arc',      char: '⌒', semantic: 'rhythm (节律 / 弧)' },
]

// ─── 叠加规则（自创）───
//
// 每个 glyph = 1-3 个基本元素叠加。
// 组合策略示例：
//   单元素：  ○      /      •
//   二元素：  ⊘ (○+/)   ⊙ (○+•)   ⌒/ (⌒+/)
//   三元素：  ⊗ (○+/+/)  ⊕ (○+−+⊥)  ⌒•⊥ (⌒+•+⊥)

export const MOKO_GLYPH_COMBINATION_RULES = {
  max_elements: 3,
  min_elements: 1,
  // 不允许同元素 4+ 次叠加（视觉过度密集）
  same_element_max: 2,
  // 视觉气质要求
  rendering_style: '老打字机 ASCII art / 1940s 民国官署印章 / 90s 办公室文档边缘标记',
  forbidden_styles: [
    'Yerkish 9 元素 1:1 复制',
    '现代 emoji',
    '工程图符号',
    '鲜亮 RGB 配色',
  ],
}

// ─── 59 affix GLOSS 词集（CAPS 自创 · 避开 Nim/Washoe specific signs）───

export const MOKO_GLOSS_LIST = {
  // Numeric (4) · Bone
  'Numeric': [
    { gloss: 'MORE',   semantic: '增量' },
    { gloss: 'AGAIN',  semantic: '重复' },
    { gloss: 'FAST',   semantic: '快速' },
    { gloss: 'LITTLE', semantic: '少量' },
  ],
  // Crit (5) · Slate
  'Crit': [
    { gloss: 'BITE',   semantic: '咬' },
    { gloss: 'STRIKE', semantic: '击' },
    { gloss: 'CRACK',  semantic: '裂' },
    { gloss: 'EDGE',   semantic: '锋' },
    { gloss: 'SNAP',   semantic: '断' },
  ],
  // Stack (7) · Mauve
  'Stack': [
    { gloss: 'GROUP',  semantic: '聚' },
    { gloss: 'LINE',   semantic: '列' },
    { gloss: 'GATHER', semantic: '集' },
    { gloss: 'GUARD',  semantic: '守' },
    { gloss: 'CRY',    semantic: '鸣' },
    { gloss: 'BOW',    semantic: '伏' },
    { gloss: 'JOIN',   semantic: '盟' },
  ],
  // Topology (8) · Olive
  'Topology': [
    { gloss: 'STICK',  semantic: '棍' },
    { gloss: 'STONE',  semantic: '石' },
    { gloss: 'PROBE',  semantic: '探' },
    { gloss: 'GRIP',   semantic: '握' },
    { gloss: 'TURN',   semantic: '转' },
    { gloss: 'WEAVE',  semantic: '编' },
    { gloss: 'FOLD',   semantic: '折' },
    { gloss: 'LINK',   semantic: '连' },
  ],
  // Word_sense (15) · Sienna
  'Word_sense': [
    { gloss: 'SWING',  semantic: '摆' },
    { gloss: 'CLING',  semantic: '附' },
    { gloss: 'PIVOT',  semantic: '旋' },
    { gloss: 'CROUCH', semantic: '伏' },
    { gloss: 'SNIFF',  semantic: '嗅' },
    { gloss: 'CHEW',   semantic: '咀' },
    { gloss: 'HIDE',   semantic: '匿' },
    { gloss: 'WATCH',  semantic: '望' },
    { gloss: 'TOUCH',  semantic: '触' },
    { gloss: 'PULL',   semantic: '拉' },
    { gloss: 'SHAKE',  semantic: '抖' },
    { gloss: 'PAT',    semantic: '拍' },
    { gloss: 'DROP',   semantic: '落' },
    { gloss: 'WRAP',   semantic: '裹' },
    { gloss: 'HOLD',   semantic: '持' },
  ],
  // Meta_rule (17) · Ochre
  'Meta_rule': [
    { gloss: 'CALL',   semantic: '呼' },
    { gloss: 'LOUD',   semantic: '响' },
    { gloss: 'BRACH',  semantic: '荡' },
    { gloss: 'SONG',   semantic: '歌' },
    { gloss: 'REPLY',  semantic: '应' },
    { gloss: 'HUSH',   semantic: '静' },
    { gloss: 'MARK',   semantic: '记' },
    { gloss: 'MATCH',  semantic: '同' },
    { gloss: 'TRAIL',  semantic: '随' },
    { gloss: 'ECHO',   semantic: '回' },
    { gloss: 'CHORUS', semantic: '群' },
    { gloss: 'NEXT',   semantic: '续' },
    { gloss: 'YIELD',  semantic: '让' },
    { gloss: 'SWAP',   semantic: '换' },
    { gloss: 'PAUSE',  semantic: '停' },
    { gloss: 'STILL',  semantic: '稳' },
    { gloss: 'RING',   semantic: '环' },
  ],
  // Production (3) · Amber
  'Production': [
    { gloss: 'GNAW',   semantic: '啮' },
    { gloss: 'SAP',    semantic: '液' },
    { gloss: 'NEST',   semantic: '巢' },
  ],
}

// ─── 全 59 GLOSS flat list ───
export const ALL_GLOSSES = Object.values(MOKO_GLOSS_LIST).flat()

// ─── 复合 GLOSS 规则 ───
//
// 借鉴 ape language research compound signs 现象（Washoe 1972 复合手势等）
// 但用我们自己 GLOSS 词集。

export const MOKO_COMPOUND_RULES = {
  // hyphen 串联
  separator: '-',
  // 复合显示包裹
  display_wrap: '[]',
  // 单 affix:    "BITE"     → "[BITE]"
  // 2-affix:     ["BITE","MORE"]    → "[BITE-MORE]"
  // 3-affix:     ["BITE","MORE","FAST"] → "[BITE-MORE-FAST]"
  // 4-affix:     ["STICK","PROBE","WEAVE","LINK"] → "[STICK-PROBE-WEAVE-LINK]"
  primary_glyph_wins: true,
  // 复合 skill 的 player-facing display = 主 affix glyph + GLOSS 复合
  primary_color_wins: true,
  // 主 affix 类目色作为复合 sticker 的 background
}

// ─── Internal admin metadata（待定保留度）───
//
// 当前默认 fictional化：用 §M-XXX (MOKO 协议守则编号) 替代 specific NCBI Taxonomy IDs。
// 若 production decision 阶段决定启用 specific public-domain references（NCBI IDs / Linnean
// species names），切换 use_specific_ncbi 为 true。

export const MOKO_INTERNAL_METADATA_POLICY = {
  use_specific_ncbi: false,  // 默认 fictional化
  use_specific_section_refs: true,  // §M-XXX 通用 admin tone OK
  fictional_pattern: 'MOKO 协议 §M-{seq:03d}',  // e.g. §M-024
  fictional_species_pattern: '非人类输入模型组对照样本 §M-{seq}',
}

// ─── 设计纪律（铁律 · pipeline validators 须 enforce）───

export const MOKO_DESIGN_RULES = {
  forbidden: [
    'Battle scene 显示 §编号 / NCBI / 物种代号 / 协议元数据',
    '贴纸 flavor 写成 power fantasy（"威力强化"/"伤害提升"）',
    '复用 Yerkish 7 色 1:1 配色 / Glasersfeld 9 元素 1:1 几何',
    '直接复述 Project Nim / Washoe specific catalog data（"Nim signed BITE 84 times" 等 specific facts）',
    '使用 Nim/Washoe documented signs（BANANA / TICKLE / HUG / GROOM / NIM）',
  ],
  required: [
    '贴纸 UI 仅 3 元素（glyph + color + GLOSS）',
    'Internal metadata 仅 codex L3-L4 渐次显化',
    'GLOSS 用自创 verb 池（59 词列表 fixed）',
    'L4 lore reference 用 fictional化（"1970s 灵长类语言研究协议（档案已封存）"）',
    '色码 7 类 archive-aged tone（避免鲜亮 RGB）',
    'Glyph 6 元素叠加，max 3 个元素 per glyph',
  ],
}

// ─── Quick lookup helpers ───

export const GLOSS_TO_CLADE = Object.fromEntries(
  Object.entries(MOKO_GLOSS_LIST).flatMap(([clade, glosses]) =>
    glosses.map(g => [g.gloss, clade])
  )
)

export const CLADE_TO_COLOR = Object.fromEntries(
  MOKO_COLORS.map(c => [c.clade, c])
)

export function getColorForGloss(gloss) {
  const clade = GLOSS_TO_CLADE[gloss]
  if (!clade) return null
  return CLADE_TO_COLOR[clade]
}

// 验证 affix count 总和
export const TOTAL_AFFIX_COUNT = MOKO_COLORS.reduce((sum, c) => sum + c.affix_count, 0)
// 应该 = 59
