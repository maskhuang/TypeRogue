// Auto-derived from docs/narrative-design.md v4.1-late §2.6 词条 layered footnote
// (LOCKED 2026-05-05 · post 5-tier 职业模型 calibration · 2026-05-08 修订)
//
// 灵长类全名 archive · L1 affix surface 直接显化 + L5 lookup 资产
//
// 5-tier 职业模型 (LOCKED · 2026-05-08 部分修订)：
//   L1 录入员 / L2 校对员 / L3 修改员 / L4 作者     ← Cycle 1-5 base game
//   L5 猴子                                         ← Cycle 6+ endless
//
// 修订说明（详 docs/narrative-design.md §2.15.1 修订条款）：
//   - 物种全名一列从 L5 前移到 L1（affix surface 直接显化）
//   - L1 affixNames（src/data-json/affixes.json · demo-i18n.ts）= species_zh 全名
//     （convert→黑帽松鼠猴 · crit→普通猕猴 · void→智人 · swarm→西部大猩猩 · ...）
//   - L5 step-function 在剩余 6 类继续生效：lab vocab / Nim·Washoe·Lana 真名 /
//     N-1976=Nim 关联 / 香蕉食物经济 / 始祖 Subject XX-0001 / 玩家=智人 reveal
//   - 本文件角色降级为：affix↔物种 lookup 表 + endless 段落 reference 资产
//
// 设计纪律（修订后铁律）：
//   - 物种全名 L1 affix surface 直接显化（NOT gate）
//   - 但物种全名**不**配 lab vocab / 真名关联 / 香蕉经济 / 玩家身份回指
//     （这些仍 L5 gate）
//   - L4 archive_designation = 工号 / "前一代研究主体（项目档案已封存）"等 fictional化
//     仍用于责任档案 / 作者 lore（与 L1 affix surface 物种名平行存在）
//   - L5 endless 段落直接 reference 物种学名即可（不再"reveal"——L1 已显化）
//   - 物种全名 emotional weight 始终 < §4.5 N1976 hidden tragedy core
//
// 关联：
//   - generated/specific-subjects.mjs § 5 anchor pool (N1976/W1965/L1971/K1980/SA1974)
//   - generated/moko-glyphs.mjs § sticker visual + GLOSS pool
//   - relic-departments.mjs § 11 子系统 → 7 部门 mapping

// 数据结构（2026-05-08 修订语义）：
//   l1      — LEGACY arcade 2-char 名（37995f9 时代 L1 surface · 现已废弃 surface
//             但保留作历史记录 / 备用 fallback / 未来 i18n alt-label）
//   archive — species_zh 全名 = **当前 L1 affix surface 实际显化值**
//             （src/data-json/affixes.json affixNames + src/src/demo/demo-i18n.ts
//              ZH affix.X / EN affix.X common name 同源此列）

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
  // 2026-05-08 修订：物种全名前移到 L1 · 其余 6 类 L5 reveal 继续 gate
  forbidden: [
    'L1-L4 base game 显化 specific subject 真名（"N-1976 即 Nim Chimpsky"）— 仍 L5 gate',
    'L1-L4 base game 显化 primate research lab vocab（chimpomat / WGTA / Skinner-box / lexigram-keyboard / 食丸 / 代币）— 仍 L5 gate',
    'L1-L4 base game 显化 banana / 食物奖励经济（base game 用金币 · 1b507b1 保留）— 仍 L5 gate',
    'L1-L4 base game 玩家身份回指（"你 = 智人"）— 仍 L5 gate',
    'L1-L4 base game 显化 Subject XX-0001 始祖录入员 — 仍 L5 gate',
    'L5 endless 段落直接复述 specific real-world taxonomy data / 自然分布 / IUCN status',
    '把物种全名当作 power fantasy buff 描述（"黑猩猩之力"等）— L1 affix surface 只是命名，不上 buff 文案',
    'archive 与 §4.5 N1976 hidden tragedy core 平等 emotional weight（必须 N1976 highest）',
  ],
  required: [
    '物种全名作为 L1 affix surface 直接显化（src/data-json/affixes.json affixNames + demo-i18n.ts affix.X）',
    'L4 archive_designation = 工号 / "前一代研究主体（项目档案已封存）"等 fictional化 · 用于责任档案与 affix surface 物种名平行存在',
    'L5 endless 段落 reference 物种学名时只是 lookup（不再"reveal"——L1 已显化）· 真正 reveal 的是 lab vocab + 真名关联 + 食物经济 retcon',
    'archive 字段保留 species_zh 全名 · 作为 affix↔species lookup（pipeline validators / endless writer 消费）',
  ],
}

// ─── Quick lookup helpers ───
// (2026-05-08 修订：L1 surface 现 = species，所以 AFFIX_TO_L1 与 AFFIX_TO_ARCHIVE
//  返回值在 L1 = species 这个事实下相等 · 保留两个别名让 pipeline 语义更清晰)

export const AFFIX_TO_ARCHIVE = Object.fromEntries(
  Object.entries(AFFIX_L5_MONKEY_ARCHIVES).map(([k, v]) => [k, v.archive])
)

// L1 affix surface 实际显化值（= species_zh · 与 src/data-json/affixes.json 同源）
export const AFFIX_TO_L1 = Object.fromEntries(
  Object.entries(AFFIX_L5_MONKEY_ARCHIVES).map(([k, v]) => [k, v.archive])
)

// LEGACY 查表 · arcade 2-char 名（37995f9 时代 L1 surface · 现已废弃 surface）
// pipeline / i18n / fallback 仍可消费（如 alt-label / 紧凑 UI）
export const AFFIX_TO_ARCADE_LEGACY = Object.fromEntries(
  Object.entries(AFFIX_L5_MONKEY_ARCHIVES).map(([k, v]) => [k, v.l1])
)

// 验证：59 archive entries（多于 0 entries · 预防 silent regression）
export const AFFIX_L5_MONKEY_ARCHIVE_COUNT = Object.keys(AFFIX_L5_MONKEY_ARCHIVES).length
