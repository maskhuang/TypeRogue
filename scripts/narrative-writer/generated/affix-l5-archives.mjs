// Auto-derived from docs/narrative-design.md v4.1-late §2.6 词条 layered footnote
// (LOCKED 2026-05-05 · post 5-tier 职业模型 calibration)
//
// 灵长类全名 archive · L5 endless reveal 专用
//
// 5-tier 职业模型 (LOCKED)：
//   L1 录入员 / L2 校对员 / L3 修改员 / L4 作者     ← Cycle 1-5 base game · 全程 NO 灵长 frame
//   L5 猴子                                         ← Cycle 6+ endless · primate reveal step-function
//
// L1 affixNames（src/data-json/affixes.json）已替换为 arcade/RPG 2-char 中文：
//   crit→暴击 · convert→变换 · cascade→激流 · void→虚空 · ...
//
// 旧 v3.x affix 名（57 灵长类全名）下沉至 **L5 endless reveal**（NOT L4）。
// L4 (作者) 仍是 base game 终点 · M5 firewall 的 reclassify 目标 · 用 fictional化
// archive_designation（"前一代被定位为作者的处置员工 [██]" 等），永不显示物种真名。
//
// 设计纪律（铁律）：
//   - L1-L4 base game 全部 4 层（录入/校对/修改/作者）**永不**显示物种全名
//     （违反 M4 motive · 暴露灵长 frame）
//   - 物种真名仅在 L5 endless reveal 段落出现（B8 reveal 后 / Cycle 6+ endless 触发）
//   - 物种全名作为"前一代研究主体（项目档案已封存）"的背景 lore，不及 §4.5 N1976
//     hidden tragedy core 的 emotional weight
//
// 关联：
//   - generated/specific-subjects.mjs § 5 anchor pool (N1976/W1965/L1971/K1980/SA1974)
//   - generated/moko-glyphs.mjs § sticker visual + GLOSS pool
//   - relic-departments.mjs § 11 子系统 → 7 部门 mapping

export const AFFIX_L5_MONKEY_ARCHIVES = {
  // ════════════════════════════════════════════════════════
  // Crit clade (Slate · 7) — 打击/暴击
  // ════════════════════════════════════════════════════════
  crit:        { l1: '暴击', archive: '普通猕猴（恒河猴）' },
  recurse:     { l1: '连发', archive: '日本猕猴' },
  taboo:       { l1: '背水', archive: '短尾猕猴' },
  fury:        { l1: '狂怒', archive: '沙巴狒狒' },
  war_drum:    { l1: '战鼓', archive: '狮尾狒' },
  mutacrit:    { l1: '质变', archive: '北部黄颊长臂猿' },
  aura_fury:   { l1: '怒环', archive: '婆罗洲红毛猩猩' },

  // ════════════════════════════════════════════════════════
  // Stack clade (Mauve · 11) — 共鸣/层叠
  // ════════════════════════════════════════════════════════
  swarm:       { l1: '虫潮', archive: '西部大猩猩' },
  echo:        { l1: '回响', archive: '黄狒狒' },
  resonance:   { l1: '共鸣', archive: '阿拉伯狒狒' },
  amplify:     { l1: '增幅', archive: '阿努比斯狒狒' },
  splash:      { l1: '散射', archive: '草原狒狒' },
  relay:       { l1: '接力', archive: '白掌长臂猿' },
  conduit:     { l1: '导线', archive: '敏捷长臂猿' },
  tide:        { l1: '狂潮', archive: '几内亚狒狒' },
  chain:       { l1: '连锁', archive: '北白颊长臂猿' },
  aura_morale: { l1: '战吼', archive: '塔潘奴利红毛猩猩' },
  reecho:      { l1: '余响', archive: '南部白颊长臂猿' },

  // ════════════════════════════════════════════════════════
  // Topology clade (Olive · 9) — 邻接/位置
  // ════════════════════════════════════════════════════════
  cascade:     { l1: '激流', archive: '青腹长尾猴' },
  flow:        { l1: '顺流', archive: '黑猩猩' },
  confluence:  { l1: '汇流', archive: '倭黑猩猩' },
  mirror:      { l1: '镜像', archive: '东部大猩猩' },
  twin:        { l1: '双生', archive: '银长臂猿' },
  union:       { l1: '同盟', archive: '苏门答腊红毛猩猩' },
  repulsion:   { l1: '反推', archive: '长尾绿猴' },
  void:        { l1: '虚空', archive: '智人' },  // 注：void 原归 "智人" — L4 reveal 时此 archive 是最重的 horror beat（玩家本身就是该 subject）
  gravity:     { l1: '引力', archive: '戴安娜长尾猴' },

  // ════════════════════════════════════════════════════════
  // Word_sense clade (Sienna · 7) — 字母/单词
  // ════════════════════════════════════════════════════════
  outcast:       { l1: '末击', archive: '红尾长尾猴' },
  spelling:      { l1: '字法', archive: '尼尔吉里黑叶猴' },
  first_edition: { l1: '首发', archive: '川金丝猴' },
  reprint:       { l1: '重铸', archive: '滇金丝猴' },
  matrix:        { l1: '阵列', archive: '东非黑白疣猴' },
  typeset:       { l1: '铸字', archive: '红腿白臀叶猴' },
  proofread:     { l1: '勘误', archive: '北方长尾叶猴' },

  // ════════════════════════════════════════════════════════
  // Meta_rule clade (Ochre · 16) — 修饰/调节
  // ════════════════════════════════════════════════════════
  convert:      { l1: '变换', archive: '黑帽松鼠猴' },
  rainbow:      { l1: '彩虹', archive: '圭亚那松鼠猴' },
  decay:        { l1: '腐蚀', archive: '食蟹猴' },
  innate:       { l1: '天赋', archive: '戴帽长臂猿' },
  monkey_patch: { l1: '补丁', archive: '东白眉长臂猿' },
  ascend:       { l1: '升华', archive: '东部黑冠长臂猿' },
  handoff:      { l1: '传承', archive: '金叶猴' },
  rewind:       { l1: '倒流', archive: '暗叶猴' },
  endow:        { l1: '赋能', archive: '银叶猴' },
  reflect:      { l1: '反射', archive: '缪氏长臂猿' },
  fallacy:      { l1: '虚招', archive: '南方猪尾猕猴' },
  volatile:     { l1: '狂躁', archive: '海南长臂猿' },
  exhaust:      { l1: '力竭', archive: '婆罗白胡子长臂猿' },
  myopia:       { l1: '盲射', archive: '白头狨' },
  silkworm:     { l1: '蚕蚀', archive: '黑簇狨' },
  fiber:        { l1: '缚线', archive: '绿猴' },

  // ════════════════════════════════════════════════════════
  // Production clade (Amber · 6) — 经济/产出
  // ════════════════════════════════════════════════════════
  mercenary:    { l1: '佣金', archive: '普通狨' },
  harvest:      { l1: '收割', archive: '黄颊长臂猿' },
  treasure:     { l1: '掘宝', archive: '高黎贡白眉长臂猿' },
  excavate:     { l1: '掘地', archive: '西白眉长臂猿' },
  refine:       { l1: '精铸', archive: '合趾猴' },
  evolve:       { l1: '蜕变', archive: '黑冠长臂猿' },

  // ════════════════════════════════════════════════════════
  // Numeric clade (Bone · 3) — 数量增量
  // ════════════════════════════════════════════════════════
  multiply:    { l1: '倍击', archive: '中美松鼠猴' },
  charge:      { l1: '蓄力', archive: '裸耳松鼠猴' },
  ligature:    { l1: '连字', archive: '德布拉柴长尾猴' },
}

// ─── 设计纪律（铁律 · pipeline validators 须 enforce）───

export const AFFIX_L5_MONKEY_ARCHIVE_RULES = {
  forbidden: [
    'L1-L4 base game 任何层（录入/校对/修改/作者）显示物种全名 — 违反 M4 motive · 暴露灵长 frame',
    'L5 endless 段落直接复述 specific real-world taxonomy data / 自然分布 / IUCN status',
    '把物种全名当作 power fantasy buff 描述（"黑猩猩之力"等）',
    'archive 与 §4.5 N1976 hidden tragedy core 平等 emotional weight（必须 N1976 highest）',
  ],
  required: [
    '物种真名仅 L5 endless reveal（Cycle 6+ / B8 reveal 后段落）显化',
    'L1 录入员 / L2 校对员 / L3 修改员 / L4 作者 全部用 arcade/RPG 2-char 名 + fictional化 anchor',
    'archive 字段保留 species_zh 真名以备 endless 段落 reference',
    'L5 出现时必须配套 fictional化 phrase（如"前一代研究主体（项目档案已封存）"）',
  ],
}

// ─── Quick lookup helpers ───

export const AFFIX_TO_ARCHIVE = Object.fromEntries(
  Object.entries(AFFIX_L5_MONKEY_ARCHIVES).map(([k, v]) => [k, v.archive])
)

export const AFFIX_TO_L1 = Object.fromEntries(
  Object.entries(AFFIX_L5_MONKEY_ARCHIVES).map(([k, v]) => [k, v.l1])
)

// 验证：59 archive entries（多于 0 entries · 预防 silent regression）
export const AFFIX_L5_MONKEY_ARCHIVE_COUNT = Object.keys(AFFIX_L5_MONKEY_ARCHIVES).length
